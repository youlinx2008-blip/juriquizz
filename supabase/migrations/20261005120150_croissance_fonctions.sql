-- JuriQuizz, phase 2 : fonctions (accès Premium, déblocage des niveaux, examens blancs, parrainage,
-- devis personnalisé, import des chapitres Premium).

-- Accès -------------------------------------------------------------------------

-- Pass Année Premium en cours, testeur bêta (« tout ») ou administration.
create function public.has_premium() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_admin() or public.has_beta_access() or exists (
    select 1 from public.entitlements e
    where e.user_id = (select auth.uid())
      and e.plan = 'pass_annee_premium'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  );
$$;

-- Fin effective de l'accès d'un compte : les accès qui se suivent (jours offerts par le parrainage
-- après un pass) s'enchaînent. « infinity » : accès sans fin ; null : aucun accès en cours.
create function public.access_chain_end(p_user uuid) returns timestamptz
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_end timestamptz;
  v_next timestamptz;
begin
  if exists (
    select 1 from public.entitlements e
    where e.user_id = p_user and e.starts_at <= now() and e.ends_at is null
  ) then
    return 'infinity'::timestamptz;
  end if;
  select max(e.ends_at) into v_end
  from public.entitlements e
  where e.user_id = p_user and e.starts_at <= now() and e.ends_at > now();
  if v_end is null then
    return null;
  end if;
  loop
    select max(e.ends_at) into v_next
    from public.entitlements e
    where e.user_id = p_user and e.starts_at <= v_end and e.ends_at > v_end;
    exit when v_next is null;
    v_end := v_next;
  end loop;
  return v_end;
end;
$$;

-- Règle de visibilité d'une question : celle de la phase 0, plus les chapitres Premium.
create or replace function public.can_see_question(
  p_chapter_id uuid,
  p_status public.review_status,
  p_retired_at timestamptz
) returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_admin() or (
    p_retired_at is null
    and (p_status = 'relue' or (p_status = 'a_relire' and public.has_beta_access()))
    and public.has_access()
    and exists (
      select 1
      from public.chapters c
      join public.subjects s on s.id = c.subject_id
      where c.id = p_chapter_id and s.visible and (not c.premium or public.has_premium())
    )
  );
$$;

-- Démonstration : jamais de question d'un chapitre Premium.
create or replace function public.can_see_demo_question(p_chapter_id uuid, p_status public.review_status, p_retired_at timestamptz)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and p_status = 'relue'
    and p_retired_at is null
    and exists (
      select 1 from public.chapters c join public.subjects s on s.id = c.subject_id
      where c.id = p_chapter_id and s.visible and not c.premium
    );
$$;

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
      'has_premium', public.has_premium(),
      -- Au moins un examen blanc proposé : le lien « Examens » n'apparaît qu'à ce moment-là.
      'has_exams', exists (
        select 1 from public.mock_exams e
        join public.subjects s on s.id = e.subject_id
        where e.visible and s.visible
      ),
      'access_ends_at', (
        select case when t.chain_end = 'infinity' then null else t.chain_end end
        from (select public.access_chain_end((select auth.uid())) as chain_end) t
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

-- Déblocage des niveaux ---------------------------------------------------------

-- Un niveau s'ouvre quand le précédent est réussi à 70 % au moins, sur une partie complète
-- (« Refaire mes erreurs » ne compte pas). Un niveau précédent sans question visible ne bloque pas.
create function public.level_unlocked(p_chapter_id uuid, p_level public.level) returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_previous public.level;
begin
  if p_level = 'facile'
     or public.is_admin()
     or not coalesce((select s.levels_unlock from public.settings s), true) then
    return true;
  end if;
  v_previous := case p_level when 'intermediaire' then 'facile'::public.level else 'intermediaire'::public.level end;
  if not public.level_unlocked(p_chapter_id, v_previous) then
    return false;
  end if;
  return not exists (
      select 1 from public.questions q
      where q.chapter_id = p_chapter_id
        and q.level = v_previous
        and public.can_see_question(q.chapter_id, q.review_status, q.retired_at)
    )
    or exists (
      select 1 from public.attempts a
      where a.user_id = (select auth.uid())
        and a.chapter_id = p_chapter_id
        and a.level = v_previous
        and not a.retry
        and a.complete
        and a.total > 0
        and a.score * 10 >= a.total * 7
    );
end;
$$;

create function public.my_level_access(p_chapter_id uuid)
returns table (level public.level, unlocked boolean)
language sql stable security definer
set search_path = ''
as $$
  select l.level, public.level_unlocked(p_chapter_id, l.level)
  from unnest(array['facile', 'intermediaire', 'confirme']::public.level[]) with ordinality as l (level, ord)
  order by l.ord;
$$;

-- Enregistrement d'une partie : comme en phase 0, avec le déblocage des niveaux. Une partie qui ne
-- couvre pas toutes les questions visibles du niveau est enregistrée, mais ne débloque rien.
create or replace function public.submit_attempt(
  p_chapter_id uuid,
  p_level public.level,
  p_retry boolean,
  p_answers jsonb
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_count integer;
  v_valid integer;
  v_score integer;
  v_attempt uuid;
  v_complete boolean;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if not public.has_access() then
    raise exception 'Accès non autorisé' using errcode = '42501';
  end if;
  if not public.level_unlocked(p_chapter_id, p_level) then
    raise exception 'Niveau pas encore débloqué' using errcode = 'JQ423';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Réponses invalides' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_answers);
  if v_count = 0 or v_count > 200 then
    raise exception 'Réponses invalides' using errcode = '22023';
  end if;

  select count(*), count(*) filter (where a.chosen = q.correct_option)
  into v_valid, v_score
  from (
    select distinct on (x ->> 'question_id') x ->> 'question_id' as question_id, x ->> 'chosen' as chosen
    from jsonb_array_elements(p_answers) as x
  ) as a
  join public.questions q on q.id = a.question_id
  where q.chapter_id = p_chapter_id
    and q.level = p_level
    and q.options @> jsonb_build_array(jsonb_build_object('id', a.chosen))
    and public.can_see_question(q.chapter_id, q.review_status, q.retired_at);

  -- Doublons, questions d'un autre niveau, invisibles ou options inconnues : refus.
  if v_valid <> v_count then
    raise exception 'Réponses invalides' using errcode = '22023';
  end if;
  v_complete := not coalesce(p_retry, false) and v_count = (
    select count(*) from public.questions q
    where q.chapter_id = p_chapter_id
      and q.level = p_level
      and public.can_see_question(q.chapter_id, q.review_status, q.retired_at)
  );

  insert into public.attempts (user_id, chapter_id, level, score, total, retry, complete)
  values (v_uid, p_chapter_id, p_level, v_score, v_count, coalesce(p_retry, false), v_complete)
  returning id into v_attempt;

  insert into public.answers (attempt_id, question_id, position, chosen_option, is_correct)
  select v_attempt, q.id, (e.ord - 1)::integer, e.x ->> 'chosen', (e.x ->> 'chosen') = q.correct_option
  from jsonb_array_elements(p_answers) with ordinality as e (x, ord)
  join public.questions q on q.id = e.x ->> 'question_id';

  return jsonb_build_object('attempt_id', v_attempt, 'score', v_score, 'total', v_count);
end;
$$;

-- Nouveaux chapitres : date de la première question, pour signaler les chapitres récents.
create function public.chapter_news()
returns table (chapter_id uuid, available_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  -- Mise à disposition : publication du chapitre (matière rendue visible) ou première question,
  -- la plus tardive des deux.
  select c.id, greatest(c.published_at, min(q.created_at))
  from public.chapters c
  join public.subjects s on s.id = c.subject_id
  join public.questions q on q.chapter_id = c.id and q.retired_at is null
  where s.visible and c.published_at is not null
  group by c.id;
$$;

-- Examens blancs ----------------------------------------------------------------

-- Questions que l'utilisateur peut recevoir dans cet examen (chapitres et niveaux de l'examen).
create function public.exam_question_pool(p_exam_id uuid)
returns table (question_id text)
language sql stable security definer
set search_path = ''
as $$
  select q.id
  from public.mock_exams e
  join public.chapters c
    on c.subject_id = e.subject_id and (cardinality(e.chapter_ids) = 0 or c.id = any (e.chapter_ids))
  join public.questions q on q.chapter_id = c.id and q.level = any (e.levels)
  where e.id = p_exam_id
    and public.can_see_question(q.chapter_id, q.review_status, q.retired_at);
$$;

-- Questions relues disponibles pour un examen, quel que soit l'utilisateur (administration, Premium).
create function public.exam_relue_pool_size(p_exam_id uuid) returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.mock_exams e
  join public.chapters c
    on c.subject_id = e.subject_id and (cardinality(e.chapter_ids) = 0 or c.id = any (e.chapter_ids))
  join public.questions q on q.chapter_id = c.id and q.level = any (e.levels)
  where e.id = p_exam_id and q.review_status = 'relue' and q.retired_at is null;
$$;

-- Début (ou reprise) d'une épreuve : questions tirées au hasard, échéance fixée par la base.
create function public.start_mock_exam(p_exam_id uuid) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_exam public.mock_exams%rowtype;
  v_attempt public.exam_attempts%rowtype;
  v_ids text[];
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if not public.has_access() then
    raise exception 'Accès non autorisé' using errcode = '42501';
  end if;
  select * into v_exam from public.mock_exams where id = p_exam_id;
  if not found or not (
    public.is_admin()
    or (v_exam.visible and exists (select 1 from public.subjects s where s.id = v_exam.subject_id and s.visible))
  ) then
    raise exception 'Examen introuvable' using errcode = 'P0002';
  end if;
  if v_exam.premium and not public.has_premium() then
    raise exception 'Réservé au Pass Année Premium' using errcode = 'JQ402';
  end if;

  -- Épreuve commencée et pas encore terminée : on la reprend telle quelle.
  select * into v_attempt
  from public.exam_attempts a
  where a.user_id = v_uid and a.exam_id = p_exam_id and a.submitted_at is null and a.deadline > now()
  order by a.started_at desc
  limit 1;
  if found then
    return jsonb_build_object('attempt_id', v_attempt.id, 'deadline', v_attempt.deadline, 'resumed', true);
  end if;

  if (
    select count(*) from public.exam_attempts a
    where a.user_id = v_uid and a.started_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'Trop d''épreuves commencées aujourd''hui' using errcode = '54000';
  end if;

  select array_agg(p.question_id order by random()) into v_ids
  from (
    select pool.question_id from public.exam_question_pool(p_exam_id) as pool
    order by random()
    limit v_exam.question_count
  ) as p;
  if coalesce(cardinality(v_ids), 0) < 5 then
    raise exception 'Pas assez de questions disponibles pour cet examen' using errcode = 'JQ422';
  end if;

  insert into public.exam_attempts (user_id, exam_id, question_ids, deadline)
  values (v_uid, p_exam_id, v_ids, now() + make_interval(mins => v_exam.duration_minutes))
  returning * into v_attempt;
  return jsonb_build_object('attempt_id', v_attempt.id, 'deadline', v_attempt.deadline, 'resumed', false);
end;
$$;

-- Copie rendue : note calculée par la base ; une copie rendue après l'échéance (deux minutes de
-- marge) est notée mais signalée « hors délai ».
create function public.submit_mock_exam(p_attempt_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_attempt public.exam_attempts%rowtype;
  v_answers jsonb;
  v_score integer;
  v_late boolean;
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  select * into v_attempt from public.exam_attempts where id = p_attempt_id and user_id = v_uid for update;
  if not found then
    raise exception 'Épreuve introuvable' using errcode = 'P0002';
  end if;
  if v_attempt.submitted_at is not null then
    return jsonb_build_object(
      'status', 'deja_rendu', 'score', v_attempt.score, 'total', v_attempt.total, 'late', v_attempt.late
    );
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Réponses invalides' using errcode = '22023';
  end if;

  -- Seules comptent les réponses aux questions de l'épreuve, avec une option existante.
  select coalesce(jsonb_object_agg(a.key, a.value), '{}'::jsonb), count(*) filter (where a.value = q.correct_option)
  into v_answers, v_score
  from jsonb_each_text(p_answers) as a
  join public.questions q on q.id = a.key
  where a.key = any (v_attempt.question_ids)
    and q.options @> jsonb_build_array(jsonb_build_object('id', a.value));

  v_late := now() > v_attempt.deadline + interval '2 minutes';
  update public.exam_attempts
  set submitted_at = now(),
      answers = v_answers,
      score = v_score,
      total = cardinality(v_attempt.question_ids),
      late = v_late
  where id = p_attempt_id;
  return jsonb_build_object(
    'status', 'ok', 'score', v_score, 'total', cardinality(v_attempt.question_ids), 'late', v_late
  );
end;
$$;

-- Premium -----------------------------------------------------------------------

-- Exclusivités réellement disponibles : chapitres Premium publiés avec du contenu relu (ou un
-- cours en PDF), examens Premium publiés avec assez de questions relues.
create function public.premium_exclusives()
returns table (kind text, item_id uuid, title text, subject_title text)
language sql stable security definer
set search_path = ''
as $$
  select 'chapitre', c.id, c.title, s.title
  from public.chapters c
  join public.subjects s on s.id = c.subject_id
  where c.premium and s.visible
    and (
      exists (
        select 1 from public.questions q
        where q.chapter_id = c.id and q.review_status = 'relue' and q.retired_at is null
      )
      or exists (select 1 from public.course_documents d where d.chapter_id = c.id)
    )
  union all
  select 'examen', e.id, e.title, s.title
  from public.mock_exams e
  join public.subjects s on s.id = e.subject_id
  where e.premium and e.visible and s.visible and public.exam_relue_pool_size(e.id) >= 5;
$$;

-- Offres : comme en phase 1 ; le Premium n'est en vente qu'avec deux exclusivités au moins.
create or replace function public.pass_offers()
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
    p.on_sale
      and public.pass_end(p.id, now()) is not null
      and (p.id <> 'pass_annee_premium' or (select count(*) from public.premium_exclusives()) >= 2)
  from public.plans p
  order by p.position;
$$;

-- Devis pour l'utilisateur connecté : prix de l'offre, réduction (passage au Premium depuis un
-- Pass Année, ou parrainage sur un premier achat), et si son accès couvre déjà cette période.
create function public.quote_pass(p_plan public.plan) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_offer record;
  v_settings public.settings%rowtype;
  v_price integer;
  v_discount integer := 0;
  v_reason text;
  v_paid integer;
  v_covered boolean := false;
begin
  select * into v_offer from public.pass_offers() o where o.plan = p_plan;
  if not found then
    return null;
  end if;
  v_price := v_offer.price_cents;

  if v_uid is not null and v_offer.ends_at is not null then
    -- Un pass qui n'ajouterait rien (ni jours, ni exclusivités) n'est pas vendu.
    if p_plan = 'pass_annee_premium' then
      v_covered := exists (
        select 1 from public.entitlements e
        where e.user_id = v_uid
          and e.plan in ('pass_annee_premium', 'beta')
          and e.starts_at <= now()
          and (e.ends_at is null or e.ends_at >= v_offer.ends_at)
      );
    else
      v_covered := coalesce(public.access_chain_end(v_uid) >= v_offer.ends_at, false);
    end if;

    if p_plan = 'pass_annee_premium' then
      -- Passage au Premium : le Pass Année en cours, déjà payé, est déduit, s'il court jusqu'à la
      -- même date de fin (un Pass Année de l'année précédente, sur le point de finir, ne compte pas).
      select max(pay.amount_cents) into v_paid
      from public.entitlements e
      join public.payments pay on pay.id = e.payment_id
      where e.user_id = v_uid
        and e.plan = 'pass_annee'
        and pay.status = 'paye'
        and e.starts_at <= now()
        and e.ends_at >= v_offer.ends_at;
      if coalesce(v_paid, 0) > 0 then
        v_discount := least(v_paid, v_price - 50);
        v_reason := 'passage_premium';
      end if;
    end if;

    if v_reason is null then
      -- Parrainage : réduction sur le premier achat d'un filleul.
      select * into v_settings from public.settings;
      if v_settings.referral_enabled
         and v_settings.referral_discount_cents > 0
         and exists (select 1 from public.profiles p where p.id = v_uid and p.referred_by is not null)
         and not exists (
           select 1 from public.payments pay where pay.user_id = v_uid and pay.status in ('paye', 'rembourse')
         ) then
        v_discount := least(v_settings.referral_discount_cents, v_price - 50);
        v_reason := 'parrainage';
      end if;
    end if;
  end if;

  v_discount := greatest(v_discount, 0);
  return jsonb_build_object(
    'plan', p_plan,
    'label', v_offer.label,
    'ends_at', v_offer.ends_at,
    'available', v_offer.available,
    'regular_price_cents', v_offer.regular_price_cents,
    'offer_price_cents', v_price,
    'discount_cents', v_discount,
    'discount_reason', case when v_discount > 0 then v_reason end,
    'price_cents', v_price - v_discount,
    'covered', v_covered
  );
end;
$$;

-- Première étape d'un achat (phase 1), avec le devis personnalisé.
create or replace function public.start_checkout(p_plan public.plan, p_accept_cgv boolean, p_waive_withdrawal boolean)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_quote jsonb;
  v_cgv integer;
  v_payment uuid;
  v_reason text;
  v_referrer uuid;
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
  v_quote := public.quote_pass(p_plan);
  if v_quote is null or not (v_quote ->> 'available')::boolean then
    raise exception 'Offre indisponible' using errcode = 'P0002';
  end if;
  if (v_quote ->> 'covered')::boolean then
    raise exception 'Accès déjà ouvert au-delà de la fin de ce pass' using errcode = 'JQ409';
  end if;
  select l.version into v_cgv from public.legal_pages l where l.slug = 'cgv';
  v_reason := v_quote ->> 'discount_reason';
  if v_reason = 'parrainage' then
    select p.referred_by into v_referrer from public.profiles p where p.id = v_uid;
  end if;

  insert into public.payments (
    user_id, plan, amount_cents, quoted_ends_at, cgv_version, withdrawal_waiver_at,
    discount_cents, discount_reason, referrer_id
  )
  values (
    v_uid,
    p_plan,
    (v_quote ->> 'price_cents')::integer,
    (v_quote ->> 'ends_at')::timestamptz,
    v_cgv,
    now(),
    (v_quote ->> 'discount_cents')::integer,
    v_reason,
    v_referrer
  )
  returning id into v_payment;

  return jsonb_build_object(
    'payment_id', v_payment,
    'amount_cents', (v_quote ->> 'price_cents')::integer,
    'label', v_quote ->> 'label',
    'ends_at', v_quote ->> 'ends_at',
    'discount_cents', (v_quote ->> 'discount_cents')::integer,
    'discount_reason', v_reason
  );
end;
$$;

-- Parrainage ---------------------------------------------------------------------

-- Jours offerts au parrain quand le premier achat de son filleul est confirmé : un accès qui prend
-- la suite de son accès en cours. Plafond annuel ; rien si les deux comptes partagent un appareil.
create function public.grant_referral_reward(p_payment_id uuid) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_settings public.settings%rowtype;
  v_start timestamptz;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  select * into v_settings from public.settings;
  if v_payment.referrer_id is null
     or v_payment.user_id is null
     or v_payment.referrer_id = v_payment.user_id
     or v_settings.referral_bonus_days = 0 then
    return 'aucune';
  end if;
  if (
    select count(*) from public.entitlements e
    where e.user_id = v_payment.referrer_id and e.source = 'parrainage' and e.created_at > now() - interval '1 year'
  ) >= v_settings.referral_max_per_year then
    return 'plafond';
  end if;
  if exists (
    select 1
    from public.device_sessions a
    join public.device_sessions b on b.browser_key = a.browser_key
    where a.user_id = v_payment.referrer_id and b.user_id = v_payment.user_id
  ) then
    return 'meme_appareil';
  end if;
  v_start := greatest(
    now(),
    coalesce(nullif(public.access_chain_end(v_payment.referrer_id), 'infinity'::timestamptz), now())
  );
  insert into public.entitlements (user_id, plan, starts_at, ends_at, source, referral_payment_id)
  values (
    v_payment.referrer_id,
    'parrainage',
    v_start,
    v_start + make_interval(days => v_settings.referral_bonus_days),
    'parrainage',
    v_payment.id
  )
  on conflict (referral_payment_id) where referral_payment_id is not null do nothing;
  return 'ok';
end;
$$;

-- Paiement confirmé (phase 1), plus la récompense du parrain.
create or replace function public.fulfill_payment(
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
  v_reward text;
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

  if v_payment.referrer_id is not null then
    v_reward := public.grant_referral_reward(v_payment.id);
  end if;

  return jsonb_build_object(
    'status', 'ok', 'plan', v_payment.plan, 'ends_at', v_ends, 'user_id', v_payment.user_id, 'referral', v_reward
  );
end;
$$;

-- Remboursement : l'accès se ferme aussitôt, et les jours offerts au parrain avec lui.
create or replace function public.refund_payment(p_payment_intent text) returns jsonb
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
  where (payment_id = v_payment.id or referral_payment_id = v_payment.id)
    and (ends_at is null or ends_at > now());
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Code de parrainage de l'utilisateur connecté (créé à la première demande).
create function public.my_referral_code() returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  select r.code into v_code from public.referral_codes r where r.user_id = v_uid;
  while v_code is null loop
    v_code := (
      select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1), '')
      from generate_series(1, 8)
    );
    begin
      insert into public.referral_codes (user_id, code) values (v_uid, v_code);
    exception when unique_violation then
      v_code := null;
    end;
  end loop;
  return v_code;
end;
$$;

-- Invitation de parrainage (page d'inscription) : valable si le parrainage est ouvert.
create function public.referral_invitation(p_code text) returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'valid', s.referral_enabled and exists (
      select 1 from public.referral_codes r where r.code = upper(trim(coalesce(p_code, '')))
    ),
    'discount_cents', s.referral_discount_cents
  )
  from public.settings s;
$$;

-- Bilan du parrainage pour l'utilisateur connecté.
create function public.my_referrals() returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'invited', (select count(*) from public.profiles p where p.referred_by = (select auth.uid())),
    'rewarded', (
      select count(*) from public.entitlements e
      where e.user_id = (select auth.uid()) and e.source = 'parrainage' and e.ends_at > e.starts_at
    ),
    'bonus_days', (
      select coalesce(sum(extract(day from e.ends_at - e.starts_at)), 0)::integer
      from public.entitlements e
      where e.user_id = (select auth.uid()) and e.source = 'parrainage'
    )
  );
$$;

-- Comptes : CGU acceptées (phase 1) et parrain, si l'invitation est valable.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60);
  v_code text := trim(coalesce(new.raw_user_meta_data ->> 'beta_code', ''));
  v_referral text := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));
  v_referrer uuid;
  v_terms integer := case
    when (new.raw_user_meta_data ->> 'terms_version') ~ '^\d{1,6}$'
      then (new.raw_user_meta_data ->> 'terms_version')::integer
  end;
begin
  if v_referral <> '' and (select s.referral_enabled from public.settings s) then
    select r.user_id into v_referrer
    from public.referral_codes r
    where r.code = v_referral and r.user_id <> new.id;
  end if;

  insert into public.profiles (id, display_name, terms_version, terms_accepted_at, referred_by, referred_at)
  values (
    new.id,
    coalesce(nullif(v_name, ''), left(split_part(coalesce(new.email, ''), '@', 1), 60)),
    v_terms,
    case when v_terms is not null then now() end,
    v_referrer,
    case when v_referrer is not null then now() end
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

-- Cours en PDF (phase 1), plus les chapitres Premium.
create or replace function public.authorize_pdf_view(p_document_id uuid) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_document public.course_documents%rowtype;
  v_visible boolean;
  v_premium boolean;
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
  select s.visible or public.is_admin(), c.premium into v_visible, v_premium
  from public.chapters c join public.subjects s on s.id = c.subject_id
  where c.id = v_document.chapter_id;
  if not coalesce(v_visible, false) then
    raise exception 'Cours introuvable' using errcode = 'P0002';
  end if;
  if v_premium and not public.has_premium() then
    raise exception 'Réservé au Pass Année Premium' using errcode = 'JQ402';
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

-- Administration -----------------------------------------------------------------

-- Chapitre Premium : seulement s'il n'a jamais été publié (un contenu vendu reste dans les pass).
create function public.admin_set_chapter_premium(p_chapter_id uuid, p_premium boolean) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.chapters set premium = coalesce(p_premium, false) where id = p_chapter_id;
  if not found then
    raise exception 'Chapitre introuvable' using errcode = 'P0002';
  end if;
end;
$$;

drop function public.admin_payments(integer);
create function public.admin_payments(p_limit integer default 200)
returns table (
  payment_id uuid,
  created_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  plan public.plan,
  amount_cents integer,
  discount_cents integer,
  discount_reason text,
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
    select p.id, p.created_at, p.paid_at, p.refunded_at, p.plan, p.amount_cents, p.discount_cents,
      p.discount_reason, p.status, u.email::text, e.ends_at, p.stripe_payment_intent
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
    'active_premium', (
      select count(distinct e.user_id) from public.entitlements e
      where e.plan = 'pass_annee_premium' and e.starts_at <= now() and e.ends_at > now()
    ),
    'sales_count', (select count(*) from public.payments where status = 'paye'),
    'sales_cents', (select coalesce(sum(amount_cents), 0) from public.payments where status = 'paye'),
    'referral_rewards', (select count(*) from public.entitlements where source = 'parrainage' and ends_at > starts_at),
    'attempts', (select count(*) from public.attempts),
    'attempts_7d', (select count(*) from public.attempts where created_at > now() - interval '7 days'),
    'exam_attempts_7d', (
      select count(*) from public.exam_attempts where started_at > now() - interval '7 days'
    ),
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
    'premium_exclusives', (select count(*) from public.premium_exclusives()),
    'legal_ready', public.legal_ready()
  ) into v_result;
  return v_result;
end;
$$;

-- Import (phase 0) : un chapitre peut être déclaré Premium dans le fichier (« premium »: true).
-- Un chapitre déjà publié ne peut pas le devenir (déclencheur chapters_publication).
create or replace function public.import_subject(p_payload jsonb, p_publish boolean default false)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_subject_id uuid;
  v_subject_created boolean;
  v_visible boolean;
  v_chapter jsonb;
  v_chapter_id uuid;
  v_chapter_ids uuid[] := '{}'::uuid[];
  v_chapter_slugs text[] := '{}'::text[];
  v_q jsonb;
  v_hash text;
  v_existing record;
  v_ids text[] := '{}'::text[];
  v_inserted integer := 0;
  v_updated integer := 0;
  v_moved integer := 0;
  v_unchanged integer := 0;
  v_retired integer := 0;
  v_stale text[];
begin
  if not (coalesce(auth.jwt() ->> 'role', '') = 'service_role' or public.is_admin()) then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;

  insert into public.subjects (slug, title, visible, position)
  values (
    p_payload #>> '{subject,slug}',
    p_payload #>> '{subject,title}',
    coalesce(p_publish, false),
    coalesce((select max(position) + 1 from public.subjects), 0)
  )
  on conflict (slug) do update
    set title = excluded.title,
        visible = case when coalesce(p_publish, false) then true else public.subjects.visible end
  returning id, (xmax = 0), visible into v_subject_id, v_subject_created, v_visible;

  for v_chapter in select value from jsonb_array_elements(p_payload -> 'chapters') loop
    insert into public.chapters (subject_id, slug, number, label, title, summary, default_decor, position, premium)
    values (
      v_subject_id,
      v_chapter ->> 'slug',
      v_chapter ->> 'number',
      v_chapter ->> 'label',
      v_chapter ->> 'title',
      coalesce(v_chapter ->> 'summary', ''),
      (v_chapter ->> 'default_decor')::public.decor,
      (v_chapter ->> 'position')::integer,
      coalesce((v_chapter ->> 'premium')::boolean, false)
    )
    on conflict (subject_id, slug) do update
      set number = excluded.number,
          label = excluded.label,
          title = excluded.title,
          summary = excluded.summary,
          default_decor = excluded.default_decor,
          position = excluded.position,
          premium = case when v_chapter ? 'premium' then excluded.premium else public.chapters.premium end
    returning id into v_chapter_id;

    v_chapter_ids := v_chapter_ids || v_chapter_id;
    v_chapter_slugs := v_chapter_slugs || (v_chapter ->> 'slug');

    for v_q in select value from jsonb_array_elements(v_chapter -> 'questions') loop
      if (v_q ->> 'id') = any (v_ids) then
        raise exception 'Identifiant de question en double : %', v_q ->> 'id' using errcode = '23505';
      end if;
      v_ids := v_ids || (v_q ->> 'id');

      v_hash := md5(jsonb_build_object(
        'type', v_q -> 'type',
        'decor', v_q -> 'decor',
        'prompt', v_q -> 'prompt',
        'options', v_q -> 'options',
        'correct_option', v_q -> 'correct_option',
        'hint', v_q -> 'hint',
        'explanation', v_q -> 'explanation'
      )::text);

      select q.content_hash, q.chapter_id, q.level, q.position, q.course_order, q.retired_at,
             c.subject_id
      into v_existing
      from public.questions q
      join public.chapters c on c.id = q.chapter_id
      where q.id = v_q ->> 'id'
      for update of q;

      if not found then
        insert into public.questions (
          id, chapter_id, level, position, course_order, type, decor, prompt, options,
          correct_option, hint, explanation, review_status, content_hash
        ) values (
          v_q ->> 'id',
          v_chapter_id,
          (v_q ->> 'level')::public.level,
          (v_q ->> 'position')::integer,
          (v_q ->> 'course_order')::integer,
          (v_q ->> 'type')::public.question_type,
          (v_q ->> 'decor')::public.decor,
          v_q ->> 'prompt',
          v_q -> 'options',
          v_q ->> 'correct_option',
          v_q ->> 'hint',
          v_q -> 'explanation',
          coalesce((v_q ->> 'review_status')::public.review_status, 'a_relire'),
          v_hash
        );
        v_inserted := v_inserted + 1;
      elsif v_existing.subject_id <> v_subject_id then
        raise exception 'La question % appartient déjà à une autre matière', v_q ->> 'id'
          using errcode = '23505';
      elsif v_existing.content_hash <> v_hash then
        update public.questions set
          chapter_id = v_chapter_id,
          level = (v_q ->> 'level')::public.level,
          position = (v_q ->> 'position')::integer,
          course_order = (v_q ->> 'course_order')::integer,
          type = (v_q ->> 'type')::public.question_type,
          decor = (v_q ->> 'decor')::public.decor,
          prompt = v_q ->> 'prompt',
          options = v_q -> 'options',
          correct_option = v_q ->> 'correct_option',
          hint = v_q ->> 'hint',
          explanation = v_q -> 'explanation',
          review_status = coalesce((v_q ->> 'review_status')::public.review_status, 'a_relire'),
          reviewed_at = null,
          reviewed_by = null,
          content_hash = v_hash,
          retired_at = null
        where id = v_q ->> 'id';
        v_updated := v_updated + 1;
      elsif v_existing.chapter_id <> v_chapter_id
         or v_existing.level <> (v_q ->> 'level')::public.level
         or v_existing.position <> (v_q ->> 'position')::integer
         or v_existing.course_order <> (v_q ->> 'course_order')::integer
         or v_existing.retired_at is not null then
        update public.questions set
          chapter_id = v_chapter_id,
          level = (v_q ->> 'level')::public.level,
          position = (v_q ->> 'position')::integer,
          course_order = (v_q ->> 'course_order')::integer,
          retired_at = null
        where id = v_q ->> 'id';
        v_moved := v_moved + 1;
      else
        v_unchanged := v_unchanged + 1;
      end if;
    end loop;
  end loop;

  update public.questions q
  set retired_at = now()
  where q.chapter_id = any (v_chapter_ids)
    and q.retired_at is null
    and not (q.id = any (v_ids));
  get diagnostics v_retired = row_count;

  select coalesce(array_agg(c.slug order by c.position), '{}'::text[])
  into v_stale
  from public.chapters c
  where c.subject_id = v_subject_id and not (c.slug = any (v_chapter_slugs));

  return jsonb_build_object(
    'subject_id', v_subject_id,
    'subject_created', v_subject_created,
    'visible', v_visible,
    'chapters', coalesce(array_length(v_chapter_ids, 1), 0),
    'inserted', v_inserted,
    'updated', v_updated,
    'moved', v_moved,
    'unchanged', v_unchanged,
    'retired', v_retired,
    'chapters_absent_from_file', to_jsonb(v_stale)
  );
end;
$$;
