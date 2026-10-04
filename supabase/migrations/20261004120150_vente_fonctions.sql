-- JuriQuizz, phase 1 : fonctions (offres, paiement, appareils, PDF, textes légaux, administration).

-- Offres et dates de fin ------------------------------------------------------

-- Fin de l'accès donné par un pass acheté à l'instant p_from (null : pas en vente faute de dates).
create function public.pass_end(p_plan public.plan, p_from timestamptz)
returns timestamptz
language sql stable security definer
set search_path = ''
as $$
  select case p.duration
    when 'jours' then p_from + make_interval(days => p.duration_days)
    when 'session' then (select min(s.ends_at) from public.exam_sessions s where s.ends_at > p_from)
    when 'annee' then (
      select max(s2.ends_at)
      from public.exam_sessions s2
      where s2.academic_year = (
        select s.academic_year from public.exam_sessions s
        where s.ends_at > p_from
        order by s.ends_at
        limit 1
      )
    )
  end
  from public.plans p
  where p.id = p_plan;
$$;

-- Offres affichées sur la page des tarifs, avec le prix du moment et la date de fin annoncée.
create function public.pass_offers()
returns table (
  plan public.plan,
  label text,
  description text,
  price_cents integer,
  regular_price_cents integer,
  promo_until timestamptz,
  ends_at timestamptz,
  duration text,
  duration_days integer,
  available boolean
)
language sql stable security definer
set search_path = ''
as $$
  select
    p.id,
    p.label,
    p.description,
    case when p.promo_price_cents is not null and p.promo_until > now() then p.promo_price_cents else p.price_cents end,
    p.price_cents,
    case when p.promo_price_cents is not null and p.promo_until > now() then p.promo_until end,
    public.pass_end(p.id, now()),
    p.duration,
    p.duration_days,
    p.on_sale and public.pass_end(p.id, now()) is not null
  from public.plans p
  order by p.position;
$$;

-- Les textes légaux sont prêts quand les quatre existent et qu'aucun ne contient de passage à compléter.
create function public.legal_ready() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select count(*) = 4 and bool_and(position('[À COMPLÉTER' in body) = 0)
  from public.legal_pages;
$$;

-- Paiement --------------------------------------------------------------------

-- Première étape d'un achat : vérifie l'offre et les consentements, fige le prix et la date de fin.
create function public.start_checkout(p_plan public.plan, p_accept_cgv boolean, p_waive_withdrawal boolean)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_offer record;
  v_cgv integer;
  v_payment uuid;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if not coalesce(p_accept_cgv, false) or not coalesce(p_waive_withdrawal, false) then
    raise exception 'Acceptation des CGV et renonciation au délai de rétractation requises' using errcode = '22023';
  end if;
  if not public.legal_ready() then
    raise exception 'Vente fermée : textes légaux incomplets' using errcode = '55000';
  end if;
  -- Garde-fou contre les tentatives en rafale (chaque tentative ouvre une page de paiement).
  if (
    select count(*) from public.payments p
    where p.user_id = v_uid and p.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Trop de tentatives de paiement' using errcode = '54000';
  end if;
  select * into v_offer from public.pass_offers() o where o.plan = p_plan;
  if not found or not v_offer.available then
    raise exception 'Offre indisponible' using errcode = 'P0002';
  end if;
  -- Un pass qui n'ajouterait aucun jour d'accès n'est pas vendu.
  if exists (
    select 1 from public.entitlements e
    where e.user_id = v_uid
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at >= v_offer.ends_at)
  ) then
    raise exception 'Accès déjà ouvert au-delà de la fin de ce pass' using errcode = 'JQ409';
  end if;
  select l.version into v_cgv from public.legal_pages l where l.slug = 'cgv';

  insert into public.payments (user_id, plan, amount_cents, quoted_ends_at, cgv_version, withdrawal_waiver_at)
  values (v_uid, p_plan, v_offer.price_cents, v_offer.ends_at, v_cgv, now())
  returning id into v_payment;

  return jsonb_build_object(
    'payment_id', v_payment,
    'amount_cents', v_offer.price_cents,
    'label', v_offer.label,
    'ends_at', v_offer.ends_at
  );
end;
$$;

-- Lie la session de paiement Stripe à l'achat (par son auteur seulement).
create function public.attach_checkout_session(p_payment_id uuid, p_session_id text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.payments
  set stripe_session_id = p_session_id
  where id = p_payment_id
    and user_id = (select auth.uid())
    and status = 'cree'
    and stripe_session_id is null;
  if not found then
    raise exception 'Achat introuvable' using errcode = 'P0002';
  end if;
end;
$$;

-- Paiement confirmé par Stripe : ouvre l'accès. Appelée par le serveur (clé secrète) depuis le
-- webhook ou la page de confirmation ; sans effet si l'achat est déjà traité.
create function public.fulfill_payment(
  p_payment_id uuid,
  p_session_id text,
  p_payment_intent text,
  p_amount integer,
  p_currency text
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_plan public.plans%rowtype;
  v_ends timestamptz;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Réservé au serveur' using errcode = '42501';
  end if;
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Achat inconnu' using errcode = 'P0002';
  end if;
  if v_payment.stripe_session_id is distinct from p_session_id then
    raise exception 'Session de paiement incohérente' using errcode = '22023';
  end if;
  if v_payment.status = 'paye' then
    return jsonb_build_object(
      'status', 'deja_traite',
      'plan', v_payment.plan,
      'ends_at', (select e.ends_at from public.entitlements e where e.payment_id = v_payment.id)
    );
  end if;
  if v_payment.status <> 'cree' then
    raise exception 'Achat dans l''état « % »', v_payment.status using errcode = '55000';
  end if;
  if p_amount is distinct from v_payment.amount_cents or lower(coalesce(p_currency, '')) <> v_payment.currency then
    raise exception 'Montant payé incohérent' using errcode = '22023';
  end if;

  update public.payments
  set status = 'paye', paid_at = now(), stripe_payment_intent = p_payment_intent
  where id = v_payment.id;

  -- Compte supprimé entre-temps : le paiement est enregistré, sans accès à ouvrir.
  if v_payment.user_id is null then
    return jsonb_build_object('status', 'compte_supprime', 'plan', v_payment.plan);
  end if;

  select * into v_plan from public.plans where id = v_payment.plan;
  v_ends := case
    when v_plan.duration = 'jours' then now() + make_interval(days => v_plan.duration_days)
    -- Date annoncée avant le paiement ; au moins un jour si le paiement arrive après coup.
    else greatest(v_payment.quoted_ends_at, now() + interval '1 day')
  end;

  insert into public.entitlements (user_id, plan, starts_at, ends_at, source, payment_id)
  values (v_payment.user_id, v_payment.plan, now(), v_ends, 'stripe', v_payment.id);

  return jsonb_build_object('status', 'ok', 'plan', v_payment.plan, 'ends_at', v_ends, 'user_id', v_payment.user_id);
end;
$$;

-- Remboursement : l'accès se ferme aussitôt.
create function public.refund_payment(p_payment_intent text) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Réservé au serveur' using errcode = '42501';
  end if;
  select * into v_payment from public.payments where stripe_payment_intent = p_payment_intent for update;
  if not found then
    return jsonb_build_object('status', 'inconnu');
  end if;
  if v_payment.status = 'rembourse' then
    return jsonb_build_object('status', 'deja_traite');
  end if;
  update public.payments set status = 'rembourse', refunded_at = now() where id = v_payment.id;
  update public.entitlements
  set ends_at = greatest(starts_at, now())
  where payment_id = v_payment.id and (ends_at is null or ends_at > now());
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Session de paiement abandonnée (expirée chez Stripe).
create function public.expire_checkout(p_session_id text) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Réservé au serveur' using errcode = '42501';
  end if;
  update public.payments set status = 'expire' where stripe_session_id = p_session_id and status = 'cree';
end;
$$;

-- Appareils : deux connexions simultanées au plus -------------------------------

-- Connexion d'un navigateur au compte. Au-delà de deux appareils, les plus anciens sont déconnectés
-- (sauf pour l'administration). Un appareil déconnecté qui se reconnecte redevient le plus récent.
create function public.register_device(p_key uuid, p_label text) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if p_key is null then
    raise exception 'Appareil non identifié' using errcode = '22023';
  end if;
  -- Une inscription à la fois par compte.
  perform pg_advisory_xact_lock(hashtext('appareil:' || v_uid::text));
  insert into public.device_sessions as d (user_id, browser_key, label)
  values (v_uid, p_key, left(coalesce(p_label, ''), 200))
  on conflict (user_id, browser_key) do update
  set label = excluded.label,
      last_seen_at = now(),
      created_at = case when d.revoked_at is not null then now() else d.created_at end,
      revoked_at = null;
  if not public.is_admin() then
    update public.device_sessions
    set revoked_at = now()
    where user_id = v_uid
      and revoked_at is null
      and id not in (
        select x.id from public.device_sessions x
        where x.user_id = v_uid and x.revoked_at is null
        order by x.created_at desc
        limit 2
      );
  end if;
  return 'actif';
end;
$$;

-- actif, revoque ou inconnu (navigateur jamais connecté à ce compte).
create function public.check_device(p_key uuid) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_device public.device_sessions%rowtype;
begin
  select * into v_device
  from public.device_sessions
  where user_id = (select auth.uid()) and browser_key = p_key;
  if not found then
    return 'inconnu';
  end if;
  if v_device.revoked_at is not null then
    return 'revoque';
  end if;
  if v_device.last_seen_at < now() - interval '5 minutes' then
    update public.device_sessions set last_seen_at = now() where id = v_device.id;
  end if;
  return 'actif';
end;
$$;

create function public.revoke_device(p_device uuid) returns void
language sql security definer
set search_path = ''
as $$
  update public.device_sessions
  set revoked_at = now()
  where id = p_device and user_id = (select auth.uid()) and revoked_at is null;
$$;

-- Cours en PDF ----------------------------------------------------------------

-- Autorise une lecture du cours et la note (limite : 40 par jour et par compte).
-- Renvoie le chemin du fichier à filigraner, ou une erreur.
create function public.authorize_pdf_view(p_document_id uuid) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_document public.course_documents%rowtype;
  v_visible boolean;
  v_recent integer;
  v_name text;
  v_email text;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if not public.has_access() then
    raise exception 'Accès non autorisé' using errcode = '42501';
  end if;
  select p.full_name, u.email into v_name, v_email
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = v_uid;
  if v_name is null or v_email is null then
    raise exception 'Nom à renseigner avant la lecture' using errcode = 'JQ428';
  end if;
  select * into v_document from public.course_documents where id = p_document_id;
  if not found then
    raise exception 'Cours introuvable' using errcode = 'P0002';
  end if;
  select s.visible or public.is_admin() into v_visible
  from public.chapters c join public.subjects s on s.id = c.subject_id
  where c.id = v_document.chapter_id;
  if not coalesce(v_visible, false) then
    raise exception 'Cours introuvable' using errcode = 'P0002';
  end if;
  select count(*) into v_recent
  from public.pdf_views
  where user_id = v_uid and viewed_at > now() - interval '1 day';
  if v_recent >= 40 and not public.is_admin() then
    raise exception 'Limite de consultations atteinte' using errcode = '54000';
  end if;
  insert into public.pdf_views (user_id, document_id) values (v_uid, p_document_id);
  return jsonb_build_object(
    'storage_path', v_document.storage_path,
    'title', v_document.title,
    'full_name', v_name,
    'email', v_email
  );
end;
$$;

-- Bêta -------------------------------------------------------------------------

-- Fin d'accès donnée par un code : la sienne, bornée par la fin de la bêta.
create function public.beta_access_end(p_code_end timestamptz) returns timestamptz
language sql stable security definer
set search_path = ''
as $$
  select case
    when p_code_end is null then s.beta_ends_at
    when s.beta_ends_at is null then p_code_end
    else least(p_code_end, s.beta_ends_at)
  end
  from public.settings s;
$$;

create or replace function public.grant_beta_from_code(p_user uuid, p_code text) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code public.beta_codes%rowtype;
  v_end timestamptz;
begin
  if exists (
    select 1 from public.entitlements e
    where e.user_id = p_user
      and e.plan = 'beta'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  ) then
    return 'deja_actif';
  end if;

  select * into v_code
  from public.beta_codes
  where code = public.normalize_code(p_code)
  for update;

  if not found or v_code.disabled then
    return 'invalide';
  end if;
  v_end := public.beta_access_end(v_code.access_ends_at);
  if (v_code.expires_at is not null and v_code.expires_at <= now()) or (v_end is not null and v_end <= now()) then
    return 'expire';
  end if;
  if v_code.uses >= v_code.uses_max then
    return 'epuise';
  end if;

  update public.beta_codes set uses = uses + 1 where code = v_code.code;
  insert into public.entitlements (user_id, plan, ends_at, source, beta_code)
  values (p_user, 'beta', v_end, 'beta_code', v_code.code);
  return 'ok';
end;
$$;

create or replace function public.check_beta_code(p_code text) returns text
language sql stable security definer
set search_path = ''
as $$
  select case
    when c.code is null or c.disabled then 'invalide'
    when (c.expires_at is not null and c.expires_at <= now())
      or (public.beta_access_end(c.access_ends_at) is not null and public.beta_access_end(c.access_ends_at) <= now())
      then 'expire'
    when c.uses >= c.uses_max then 'epuise'
    else 'ok'
  end
  from (select public.normalize_code(p_code) as code) as input
  left join public.beta_codes c on c.code = input.code;
$$;

-- Comptes ---------------------------------------------------------------------

create function public.accept_terms(p_version integer) returns void
language sql security definer
set search_path = ''
as $$
  update public.profiles
  set terms_version = p_version, terms_accepted_at = now()
  where id = (select auth.uid())
    and p_version = (select l.version from public.legal_pages l where l.slug = 'cgu');
$$;

-- Le profil retient aussi la version des CGU acceptée à l'inscription.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60);
  v_code text := trim(coalesce(new.raw_user_meta_data ->> 'beta_code', ''));
  v_terms integer := case
    when (new.raw_user_meta_data ->> 'terms_version') ~ '^\d{1,6}$'
      then (new.raw_user_meta_data ->> 'terms_version')::integer
  end;
begin
  insert into public.profiles (id, display_name, terms_version, terms_accepted_at)
  values (
    new.id,
    coalesce(nullif(v_name, ''), left(split_part(coalesce(new.email, ''), '@', 1), 60)),
    v_terms,
    case when v_terms is not null then now() end
  )
  on conflict (id) do nothing;

  if v_code <> '' then
    begin
      perform public.grant_beta_from_code(new.id, v_code);
    exception when others then
      raise warning 'Code bêta non appliqué pour % : %', new.id, sqlerrm;
    end;
  end if;
  return new;
end;
$$;

-- Contexte de l'utilisateur connecté : droits, accès en cours et terminés, profil.
create or replace function public.viewer_context() returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    else jsonb_build_object(
      'is_admin', public.is_admin(),
      'has_access', public.has_access(),
      'has_beta', public.has_beta_access(),
      'access_ends_at', (
        select case when bool_or(e.ends_at is null) then null else max(e.ends_at) end
        from public.entitlements e
        where e.user_id = (select auth.uid()) and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
      ),
      'last_ended_at', (
        select max(e.ends_at) from public.entitlements e
        where e.user_id = (select auth.uid()) and e.ends_at <= now()
      ),
      -- Version des CGU à faire accepter : seulement une fois le texte finalisé.
      'cgu_version', (
        select l.version from public.legal_pages l
        where l.slug = 'cgu' and position('[À COMPLÉTER' in l.body) = 0
      ),
      'profile', (
        select jsonb_build_object(
          'display_name', p.display_name,
          'sound_pref', p.sound_pref,
          'decor_pref', p.decor_pref,
          'theme_pref', p.theme_pref,
          'volume', p.volume,
          'terms_version', p.terms_version,
          'full_name', p.full_name
        )
        from public.profiles p
        where p.id = (select auth.uid())
      )
    )
  end;
$$;

-- Démonstration : question visible de tout compte si elle est relue et la matière publiée.
create function public.can_see_demo_question(p_chapter_id uuid, p_status public.review_status, p_retired_at timestamptz)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and p_status = 'relue'
    and p_retired_at is null
    and exists (
      select 1 from public.chapters c join public.subjects s on s.id = c.subject_id
      where c.id = p_chapter_id and s.visible
    );
$$;

-- Administration ---------------------------------------------------------------

create function public.admin_set_question_demo(p_question_id text, p_demo boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.questions set demo = p_demo where id = p_question_id;
  if not found then
    raise exception 'Question introuvable' using errcode = 'P0002';
  end if;
end;
$$;

-- Fin de la bêta : tous les accès bêta en cours (et ceux des codes encore inutilisés) s'arrêtent à cette date.
create function public.admin_set_beta_end(p_ends_at timestamptz) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform public.assert_admin();
  if p_ends_at is null or p_ends_at <= now() then
    raise exception 'La fin de la bêta doit être dans le futur' using errcode = '22023';
  end if;
  update public.entitlements
  set ends_at = p_ends_at
  where plan = 'beta' and (ends_at is null or ends_at > p_ends_at) and starts_at < p_ends_at;
  get diagnostics v_count = row_count;
  update public.beta_codes
  set access_ends_at = p_ends_at,
      expires_at = least(coalesce(expires_at, p_ends_at), p_ends_at)
  where access_ends_at is null or access_ends_at > p_ends_at;
  update public.settings set beta_ends_at = p_ends_at, updated_at = now();
  return v_count;
end;
$$;

create function public.admin_update_legal_page(p_slug text, p_title text, p_body text) returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_version integer;
begin
  perform public.assert_admin();
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_body), '') = '' then
    raise exception 'Titre et texte requis' using errcode = '22023';
  end if;
  update public.legal_pages
  set title = trim(p_title), body = p_body, updated_by = (select auth.uid())
  where slug = p_slug
  returning version into v_version;
  if not found then
    raise exception 'Page inconnue' using errcode = 'P0002';
  end if;
  return v_version;
end;
$$;

-- Achats, du plus récent au plus ancien (avec l'adresse du compte, s'il existe encore).
create function public.admin_payments(p_limit integer default 200)
returns table (
  payment_id uuid,
  created_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  plan public.plan,
  amount_cents integer,
  status text,
  email text,
  ends_at timestamptz,
  stripe_payment_intent text
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
    select p.id, p.created_at, p.paid_at, p.refunded_at, p.plan, p.amount_cents, p.status,
      u.email::text, e.ends_at, p.stripe_payment_intent
    from public.payments p
    left join auth.users u on u.id = p.user_id
    left join public.entitlements e on e.payment_id = p.id
    -- Les paiements commencés mais jamais terminés ne restent visibles qu'un jour.
    where p.status <> 'cree' or p.created_at > now() - interval '1 day'
    order by p.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform public.assert_admin();
  select jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'active_testers', (
      select count(distinct e.user_id) from public.entitlements e
      where e.plan = 'beta' and e.starts_at <= now() and (e.ends_at is null or e.ends_at > now())
    ),
    'active_passes', (
      select count(distinct e.user_id) from public.entitlements e
      where e.source = 'stripe' and e.starts_at <= now() and e.ends_at > now()
    ),
    'sales_count', (select count(*) from public.payments where status = 'paye'),
    'sales_cents', (select coalesce(sum(amount_cents), 0) from public.payments where status = 'paye'),
    'attempts', (select count(*) from public.attempts),
    'attempts_7d', (select count(*) from public.attempts where created_at > now() - interval '7 days'),
    'feedback_open', (
      select count(*) from public.feedback where resolved_at is null and rating <> 'claire'
    ),
    'questions', (
      select coalesce(jsonb_object_agg(s.review_status, s.n), '{}'::jsonb)
      from (
        select review_status, count(*) as n
        from public.questions
        where retired_at is null
        group by review_status
      ) as s
    ),
    'demo_questions', (
      select count(*) from public.questions where demo and review_status = 'relue' and retired_at is null
    ),
    'legal_ready', public.legal_ready()
  ) into v_result;
  return v_result;
end;
$$;

-- Les statistiques par question indiquent aussi si la question fait partie de la démonstration.
drop function public.admin_question_stats(uuid);
create function public.admin_question_stats(p_subject_id uuid default null)
returns table (
  question_id text,
  subject_id uuid,
  chapter_id uuid,
  chapter_position integer,
  chapter_label text,
  level public.level,
  question_position integer,
  type public.question_type,
  prompt text,
  review_status public.review_status,
  retired boolean,
  demo boolean,
  answers_count integer,
  correct_count integer,
  users_count integer,
  feedback_claire integer,
  feedback_pas_claire integer,
  feedback_erreur integer,
  feedback_open integer
)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select
    q.id,
    c.subject_id,
    c.id,
    c.position,
    c.label,
    q.level,
    q.position,
    q.type,
    q.prompt,
    q.review_status,
    q.retired_at is not null,
    q.demo,
    coalesce(st.answers_count, 0),
    coalesce(st.correct_count, 0),
    coalesce(st.users_count, 0),
    coalesce(fb.claire, 0),
    coalesce(fb.pas_claire, 0),
    coalesce(fb.erreur, 0),
    coalesce(fb.open, 0)
  from public.questions q
  join public.chapters c on c.id = q.chapter_id
  left join lateral (
    select
      count(*)::integer as answers_count,
      count(*) filter (where an.is_correct)::integer as correct_count,
      count(distinct at.user_id)::integer as users_count
    from public.answers an
    join public.attempts at on at.id = an.attempt_id
    where an.question_id = q.id and not at.retry
  ) st on true
  left join lateral (
    select
      count(*) filter (where f.rating = 'claire')::integer as claire,
      count(*) filter (where f.rating = 'pas_claire')::integer as pas_claire,
      count(*) filter (where f.rating = 'erreur')::integer as erreur,
      count(*) filter (where f.rating <> 'claire' and f.resolved_at is null)::integer as open
    from public.feedback f
    where f.question_id = q.id
  ) fb on true
  where p_subject_id is null or c.subject_id = p_subject_id
  order by c.subject_id, c.position, q.level, q.position;
end;
$$;
