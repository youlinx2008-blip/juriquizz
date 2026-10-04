-- JuriQuizz, phase 2 : RLS et droits.

alter table public.mock_exams enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.referral_codes enable row level security;

revoke all on public.mock_exams, public.exam_attempts, public.referral_codes from anon, authenticated;
grant all on public.mock_exams, public.exam_attempts, public.referral_codes to service_role;

-- Examens blancs : la fiche d'un examen publié est publique ; l'administration les gère.
grant select on public.mock_exams to anon, authenticated;
grant insert (subject_id, slug, title, description, question_count, duration_minutes, chapter_ids, levels, premium, visible, position)
  on public.mock_exams to authenticated;
grant update (slug, title, description, question_count, duration_minutes, chapter_ids, levels, premium, visible, position)
  on public.mock_exams to authenticated;
grant delete on public.mock_exams to authenticated;

create policy mock_exams_select_anon on public.mock_exams for select to anon
  using (visible and exists (select 1 from public.subjects s where s.id = mock_exams.subject_id and s.visible));
create policy mock_exams_select_auth on public.mock_exams for select to authenticated
  using (
    (select public.is_admin())
    or (visible and exists (select 1 from public.subjects s where s.id = mock_exams.subject_id and s.visible))
  );
create policy mock_exams_insert_admin on public.mock_exams for insert to authenticated
  with check ((select public.is_admin()));
create policy mock_exams_update_admin on public.mock_exams for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Un examen déjà publié ne se supprime pas (copies des étudiants, exclusivité vendue) : il se masque.
create policy mock_exams_delete_admin on public.mock_exams for delete to authenticated
  using ((select public.is_admin()) and published_at is null);

-- Épreuves : chacun voit les siennes ; écriture par fonctions seulement.
grant select on public.exam_attempts to authenticated;
create policy exam_attempts_select on public.exam_attempts for select to authenticated
  using (user_id = (select auth.uid()));

-- Codes de parrainage : chacun voit le sien ; création par fonction.
grant select on public.referral_codes to authenticated;
create policy referral_codes_select on public.referral_codes for select to authenticated
  using (user_id = (select auth.uid()));

-- Réglages : l'administration modifie le déblocage des niveaux et le parrainage.
grant update (levels_unlock, referral_enabled, referral_discount_cents, referral_bonus_days, referral_max_per_year)
  on public.settings to authenticated;
create policy settings_update_admin on public.settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Fonctions ------------------------------------------------------------------------

revoke all on function public.access_chain_end(uuid) from public, anon, authenticated;
revoke all on function public.grant_referral_reward(uuid) from public, anon, authenticated;
revoke all on function public.exam_question_pool(uuid) from public, anon, authenticated;
revoke all on function public.chapters_publication() from public, anon, authenticated;
revoke all on function public.subjects_publication() from public, anon, authenticated;
revoke all on function public.mock_exams_publication() from public, anon, authenticated;

grant execute on function public.has_premium() to authenticated;
grant execute on function public.level_unlocked(uuid, public.level) to authenticated;
grant execute on function public.my_level_access(uuid) to authenticated;
grant execute on function public.quote_pass(public.plan) to authenticated;
grant execute on function public.start_mock_exam(uuid) to authenticated;
grant execute on function public.submit_mock_exam(uuid, jsonb) to authenticated;
grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.my_referrals() to authenticated;
grant execute on function public.exam_relue_pool_size(uuid) to authenticated;
grant execute on function public.admin_set_chapter_premium(uuid, boolean) to authenticated;
grant execute on function public.admin_payments(integer) to authenticated;
grant execute on function public.chapter_news() to anon, authenticated;
grant execute on function public.premium_exclusives() to anon, authenticated, service_role;
grant execute on function public.referral_invitation(text) to anon, authenticated;
