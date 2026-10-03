-- JuriQuizz, phase 0 : row-level security et droits.
-- On retire d'abord tous les droits, puis on accorde exactement ce qu'il faut, pour que
-- le résultat soit le même que l'exposition automatique des tables soit active ou non.

alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.questions enable row level security;
alter table public.profiles enable row level security;
alter table public.admins enable row level security;
alter table public.beta_codes enable row level security;
alter table public.entitlements enable row level security;
alter table public.attempts enable row level security;
alter table public.answers enable row level security;
alter table public.feedback enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables ---------------------------------------------------------------------

-- Présentation des matières et chapitres : visible des visiteurs si la matière est publiée.
grant select on public.subjects, public.chapters to anon, authenticated;

create policy subjects_select_anon on public.subjects
  for select to anon
  using (visible);

create policy subjects_select_auth on public.subjects
  for select to authenticated
  using (visible or (select public.is_admin()));

create policy chapters_select_anon on public.chapters
  for select to anon
  using (exists (select 1 from public.subjects s where s.id = chapters.subject_id and s.visible));

create policy chapters_select_auth on public.chapters
  for select to authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.subjects s where s.id = chapters.subject_id and s.visible)
  );

-- Questions : jamais pour les visiteurs ; pour les comptes, selon can_see_question.
grant select on public.questions to authenticated;

create policy questions_select on public.questions
  for select to authenticated
  using (public.can_see_question(chapter_id, review_status, retired_at));

-- Profils : chacun lit et règle le sien ; l'administration lit les pseudos.
grant select on public.profiles to authenticated;
grant update (display_name, sound_pref, decor_pref, theme_pref, volume) on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Administrateurs : chacun peut seulement savoir s'il l'est.
grant select on public.admins to authenticated;

create policy admins_select_own on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Codes bêta : lecture réservée à l'administration, écriture par fonctions.
grant select on public.beta_codes to authenticated;

create policy beta_codes_select_admin on public.beta_codes
  for select to authenticated
  using ((select public.is_admin()));

-- Accès : chacun voit les siens ; écriture uniquement par les fonctions.
grant select on public.entitlements to authenticated;

create policy entitlements_select on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Parties et réponses : chacun ne lit que les siennes ; écriture par submit_attempt.
grant select on public.attempts, public.answers to authenticated;

create policy attempts_select_own on public.attempts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy answers_select_own on public.answers
  for select to authenticated
  using (
    exists (
      select 1 from public.attempts a
      where a.id = answers.attempt_id and a.user_id = (select auth.uid())
    )
  );

-- Retours sur les questions : chacun écrit et lit les siens ; l'administration lit tout.
grant select on public.feedback to authenticated;
grant insert (question_id, rating, comment) on public.feedback to authenticated;

create policy feedback_select on public.feedback
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy feedback_insert_own on public.feedback
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.questions q where q.id = feedback.question_id)
  );

-- Le champ user_id prend l'identité de l'auteur : impossible d'écrire au nom d'un autre.
alter table public.feedback alter column user_id set default auth.uid();

-- Fonctions ------------------------------------------------------------------

grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_access() to authenticated;
grant execute on function public.has_beta_access() to authenticated;
grant execute on function public.viewer_context() to authenticated;
grant execute on function public.can_see_question(uuid, public.review_status, timestamptz) to authenticated;
grant execute on function public.check_beta_code(text) to anon, authenticated;
grant execute on function public.redeem_beta_code(text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.submit_attempt(uuid, public.level, boolean, jsonb) to authenticated;
grant execute on function public.my_question_status(uuid) to authenticated;

-- Fonctions d'administration : elles vérifient elles-mêmes is_admin().
grant execute on function public.admin_set_subject_visibility(uuid, boolean) to authenticated;
grant execute on function public.admin_set_review_status(text, public.review_status) to authenticated;
grant execute on function public.admin_create_beta_codes(integer, integer, text, timestamptz, timestamptz, text, text) to authenticated;
grant execute on function public.admin_set_beta_code_disabled(text, boolean) to authenticated;
grant execute on function public.admin_resolve_feedback(uuid, boolean) to authenticated;
grant execute on function public.admin_question_stats(uuid) to authenticated;
grant execute on function public.admin_option_stats(text) to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.import_subject(jsonb, boolean) to authenticated;

-- Les fonctions créées plus tard ne doivent pas être exécutables par défaut.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
