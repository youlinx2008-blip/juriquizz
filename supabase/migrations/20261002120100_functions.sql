-- JuriQuizz, phase 0 : fonctions (accès, codes bêta, quiz, administration, import).
-- Toutes les fonctions « security definer » vérifient elles-mêmes qui les appelle.

-- Accès --------------------------------------------------------------------

create function public.is_admin() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

create function public.has_beta_access() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements e
    where e.user_id = (select auth.uid())
      and e.plan = 'beta'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  );
$$;

create function public.has_access() returns boolean
language sql stable security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.entitlements e
    where e.user_id = (select auth.uid())
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  );
$$;

-- Règle unique de visibilité d'une question, utilisée par la RLS et par submit_attempt.
-- Hors administration : accès valide, matière visible, question non retirée, et
-- statut « relue » (ou « a_relire » pour les testeurs bêta, avec un bandeau).
create function public.can_see_question(
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
      where c.id = p_chapter_id and s.visible
    )
  );
$$;

-- Contexte de l'utilisateur connecté, en un seul appel (droits et profil).
create function public.viewer_context() returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then null
    else jsonb_build_object(
      'is_admin', public.is_admin(),
      'has_access', public.has_access(),
      'has_beta', public.has_beta_access(),
      'profile', (
        select jsonb_build_object(
          'display_name', p.display_name,
          'sound_pref', p.sound_pref,
          'decor_pref', p.decor_pref,
          'theme_pref', p.theme_pref,
          'volume', p.volume
        )
        from public.profiles p
        where p.id = (select auth.uid())
      )
    )
  end;
$$;

-- Codes bêta -----------------------------------------------------------------

create function public.normalize_code(p_code text) returns text
language sql immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
$$;

-- Usage interne : accorde l'accès bêta à un utilisateur à partir d'un code.
-- Résultat : ok, deja_actif, invalide, expire, epuise.
create function public.grant_beta_from_code(p_user uuid, p_code text) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code public.beta_codes%rowtype;
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
  if (v_code.expires_at is not null and v_code.expires_at <= now())
     or (v_code.access_ends_at is not null and v_code.access_ends_at <= now()) then
    return 'expire';
  end if;
  if v_code.uses >= v_code.uses_max then
    return 'epuise';
  end if;

  update public.beta_codes set uses = uses + 1 where code = v_code.code;
  insert into public.entitlements (user_id, plan, ends_at, source, beta_code)
  values (p_user, 'beta', v_code.access_ends_at, 'beta_code', v_code.code);
  return 'ok';
end;
$$;

-- Vérifie un code sans le consommer (formulaire d'inscription).
create function public.check_beta_code(p_code text) returns text
language sql stable security definer
set search_path = ''
as $$
  select case
    when c.code is null or c.disabled then 'invalide'
    when (c.expires_at is not null and c.expires_at <= now())
      or (c.access_ends_at is not null and c.access_ends_at <= now()) then 'expire'
    when c.uses >= c.uses_max then 'epuise'
    else 'ok'
  end
  from (select public.normalize_code(p_code) as code) as input
  left join public.beta_codes c on c.code = input.code;
$$;

create function public.redeem_beta_code(p_code text) returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  return public.grant_beta_from_code(v_uid, p_code);
end;
$$;

-- Création du profil à l'inscription, et utilisation du code bêta transmis dans
-- les métadonnées. Un code refusé ne bloque jamais la création du compte :
-- l'utilisateur pourra en saisir un autre sur la page d'activation.
create function public.handle_new_user() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 60);
  v_code text := trim(coalesce(new.raw_user_meta_data ->> 'beta_code', ''));
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(v_name, ''), left(split_part(coalesce(new.email, ''), '@', 1), 60))
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Suppression du compte par son titulaire : toutes ses données suivent (cascade).
create function public.delete_my_account() returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

-- Quiz -----------------------------------------------------------------------

-- Enregistre une partie terminée. Le score est recalculé ici à partir des
-- réponses choisies : le navigateur ne peut pas l'imposer.
-- p_answers : [{ "question_id": "...", "chosen": "a" }, ...] dans l'ordre joué.
create function public.submit_attempt(
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
begin
  if v_uid is null then
    raise exception 'Connexion requise' using errcode = '28000';
  end if;
  if not public.has_access() then
    raise exception 'Accès non autorisé' using errcode = '42501';
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

  insert into public.attempts (user_id, chapter_id, level, score, total, retry)
  values (v_uid, p_chapter_id, p_level, v_score, v_count, coalesce(p_retry, false))
  returning id into v_attempt;

  insert into public.answers (attempt_id, question_id, position, chosen_option, is_correct)
  select v_attempt, q.id, (e.ord - 1)::integer, e.x ->> 'chosen', (e.x ->> 'chosen') = q.correct_option
  from jsonb_array_elements(p_answers) with ordinality as e (x, ord)
  join public.questions q on q.id = e.x ->> 'question_id';

  return jsonb_build_object('attempt_id', v_attempt, 'score', v_score, 'total', v_count);
end;
$$;

-- Dernière réponse de l'utilisateur à chaque question (sert à « Refaire mes erreurs »
-- et au tableau de progression). Exécutée avec les droits de l'appelant : la RLS
-- limite le résultat à ses propres réponses.
create function public.my_question_status(p_chapter_id uuid default null)
returns table (
  question_id text,
  chapter_id uuid,
  level public.level,
  answered integer,
  last_correct boolean,
  last_answered_at timestamptz
)
language sql stable security invoker
set search_path = ''
as $$
  select distinct on (an.question_id)
    an.question_id,
    at.chapter_id,
    at.level,
    (count(*) over (partition by an.question_id))::integer,
    an.is_correct,
    at.created_at
  from public.answers an
  join public.attempts at on at.id = an.attempt_id
  where at.user_id = (select auth.uid())
    and (p_chapter_id is null or at.chapter_id = p_chapter_id)
  order by an.question_id, at.created_at desc;
$$;

-- Administration -------------------------------------------------------------

create function public.assert_admin() returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé à l''administration' using errcode = '42501';
  end if;
end;
$$;

create function public.admin_set_subject_visibility(p_subject_id uuid, p_visible boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.subjects set visible = p_visible where id = p_subject_id;
  if not found then
    raise exception 'Matière introuvable' using errcode = 'P0002';
  end if;
end;
$$;

create function public.admin_set_review_status(p_question_id text, p_status public.review_status)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.questions
  set review_status = p_status, reviewed_at = now(), reviewed_by = (select auth.uid())
  where id = p_question_id;
  if not found then
    raise exception 'Question introuvable' using errcode = 'P0002';
  end if;
end;
$$;

-- Code aléatoire lisible : 8 caractères sans ambiguïté (0/O, 1/I), soit 40 bits.
create function public.random_beta_code(p_prefix text) returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := extensions.gen_random_bytes(8);
  v_out text := '';
begin
  for i in 0..7 loop
    v_out := v_out || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    if i = 3 then
      v_out := v_out || '-';
    end if;
  end loop;
  if public.normalize_code(p_prefix) = '' then
    return v_out;
  end if;
  return public.normalize_code(p_prefix) || '-' || v_out;
end;
$$;

-- Crée p_count codes aléatoires, ou un seul code choisi (p_code).
create function public.admin_create_beta_codes(
  p_count integer,
  p_uses_max integer,
  p_label text default '',
  p_expires_at timestamptz default null,
  p_access_ends_at timestamptz default null,
  p_prefix text default 'JQ',
  p_code text default null
) returns setof public.beta_codes
language plpgsql security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  perform public.assert_admin();
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'Nombre de codes invalide (1 à 200)' using errcode = '22023';
  end if;
  if nullif(public.normalize_code(p_code), '') is not null and p_count <> 1 then
    raise exception 'Un code choisi ne peut être créé qu''une fois' using errcode = '22023';
  end if;

  for i in 1..p_count loop
    v_code := coalesce(nullif(public.normalize_code(p_code), ''), public.random_beta_code(p_prefix));
    return query
      insert into public.beta_codes (code, label, uses_max, expires_at, access_ends_at, created_by)
      values (v_code, coalesce(p_label, ''), p_uses_max, p_expires_at, p_access_ends_at, (select auth.uid()))
      returning *;
  end loop;
end;
$$;

create function public.admin_set_beta_code_disabled(p_code text, p_disabled boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.beta_codes set disabled = p_disabled where code = public.normalize_code(p_code);
  if not found then
    raise exception 'Code introuvable' using errcode = 'P0002';
  end if;
end;
$$;

create function public.admin_resolve_feedback(p_feedback_id uuid, p_resolved boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  update public.feedback
  set resolved_at = case when p_resolved then now() else null end
  where id = p_feedback_id;
  if not found then
    raise exception 'Retour introuvable' using errcode = 'P0002';
  end if;
end;
$$;

-- Taux de réussite par question. Seules les premières tentatives comptent
-- (les parties « Refaire mes erreurs » sont exclues pour ne pas fausser le taux).
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

-- Répartition des réponses choisies pour une question (premières tentatives).
create function public.admin_option_stats(p_question_id text)
returns table (option_id text, chosen_count integer)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();
  return query
  select an.chosen_option, count(*)::integer
  from public.answers an
  join public.attempts at on at.id = an.attempt_id
  where an.question_id = p_question_id and not at.retry
  group by an.chosen_option;
end;
$$;

create function public.admin_overview() returns jsonb
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
    )
  ) into v_result;
  return v_result;
end;
$$;

-- Import du contenu ------------------------------------------------------------

-- Importe une matière complète, dans une seule transaction. Appelée par le script
-- d'import (clé de service) ou par un administrateur.
-- Statut de relecture : celui du fichier pour une nouvelle question ou une question
-- dont le contenu a changé ; sinon le statut en base est conservé.
-- Les questions des chapitres importés absentes du fichier sont retirées (pas supprimées).
create function public.import_subject(p_payload jsonb, p_publish boolean default false)
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
    insert into public.chapters (subject_id, slug, number, label, title, summary, default_decor, position)
    values (
      v_subject_id,
      v_chapter ->> 'slug',
      v_chapter ->> 'number',
      v_chapter ->> 'label',
      v_chapter ->> 'title',
      coalesce(v_chapter ->> 'summary', ''),
      (v_chapter ->> 'default_decor')::public.decor,
      (v_chapter ->> 'position')::integer
    )
    on conflict (subject_id, slug) do update
      set number = excluded.number,
          label = excluded.label,
          title = excluded.title,
          summary = excluded.summary,
          default_decor = excluded.default_decor,
          position = excluded.position
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
