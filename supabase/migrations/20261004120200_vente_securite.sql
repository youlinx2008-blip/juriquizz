-- JuriQuizz, phase 1 : RLS, droits et stockage privé des cours.

alter table public.plans enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.payments enable row level security;
alter table public.course_documents enable row level security;
alter table public.pdf_views enable row level security;
alter table public.device_sessions enable row level security;
alter table public.legal_pages enable row level security;
alter table public.legal_page_versions enable row level security;
alter table public.settings enable row level security;

revoke all on public.settings from anon, authenticated;
grant all on public.settings to service_role;
-- Réglages lisibles par tous (la fin de la bêta n'a rien de secret) ; écrits par fonctions seulement.
grant select on public.settings to anon, authenticated;
create policy settings_select on public.settings for select to anon, authenticated using (true);

revoke all on public.plans, public.exam_sessions, public.payments, public.course_documents, public.pdf_views,
  public.device_sessions, public.legal_pages, public.legal_page_versions
  from anon, authenticated;
grant all on public.plans, public.exam_sessions, public.payments, public.course_documents, public.pdf_views,
  public.device_sessions, public.legal_pages, public.legal_page_versions
  to service_role;

-- Offres et dates des partiels : publiques ; l'administration les modifie.
grant select on public.plans, public.exam_sessions to anon, authenticated;
grant update (label, description, price_cents, promo_price_cents, promo_until, on_sale) on public.plans to authenticated;
grant insert, update, delete on public.exam_sessions to authenticated;

create policy plans_select on public.plans for select to anon, authenticated using (true);
create policy plans_update_admin on public.plans for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy exam_sessions_select on public.exam_sessions for select to anon, authenticated using (true);
create policy exam_sessions_insert_admin on public.exam_sessions for insert to authenticated
  with check ((select public.is_admin()));
create policy exam_sessions_update_admin on public.exam_sessions for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy exam_sessions_delete_admin on public.exam_sessions for delete to authenticated
  using ((select public.is_admin()));

-- Paiements : chacun voit les siens, l'administration tous ; écriture par fonctions seulement.
grant select on public.payments to authenticated;
create policy payments_select on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Cours en PDF : la fiche (titre, nombre de pages) est publique si la matière l'est ; le fichier, jamais.
grant select on public.course_documents to anon, authenticated;
grant insert, update, delete on public.course_documents to authenticated;
create policy course_documents_select_anon on public.course_documents for select to anon
  using (
    exists (
      select 1 from public.chapters c join public.subjects s on s.id = c.subject_id
      where c.id = course_documents.chapter_id and s.visible
    )
  );
create policy course_documents_select_auth on public.course_documents for select to authenticated
  using (
    (select public.is_admin())
    or exists (
      select 1 from public.chapters c join public.subjects s on s.id = c.subject_id
      where c.id = course_documents.chapter_id and s.visible
    )
  );
create policy course_documents_insert_admin on public.course_documents for insert to authenticated
  with check ((select public.is_admin()));
create policy course_documents_update_admin on public.course_documents for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy course_documents_delete_admin on public.course_documents for delete to authenticated
  using ((select public.is_admin()));

grant select on public.pdf_views to authenticated;
create policy pdf_views_select on public.pdf_views for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Appareils : chacun voit les siens.
grant select on public.device_sessions to authenticated;
create policy device_sessions_select on public.device_sessions for select to authenticated
  using (user_id = (select auth.uid()));

-- Textes légaux : publics, anciennes versions comprises (chaque acheteur retrouve le texte accepté).
grant select on public.legal_pages, public.legal_page_versions to anon, authenticated;
create policy legal_pages_select on public.legal_pages for select to anon, authenticated using (true);
create policy legal_page_versions_select on public.legal_page_versions for select to anon, authenticated
  using (true);

-- Nom pour le filigrane des cours, modifiable par chacun sur son profil.
grant update (full_name) on public.profiles to authenticated;

-- Questions : la démonstration ouvre quelques questions relues à tout compte.
drop policy questions_select on public.questions;
create policy questions_select on public.questions
  for select to authenticated
  using (
    public.can_see_question(chapter_id, review_status, retired_at)
    or (demo and public.can_see_demo_question(chapter_id, review_status, retired_at))
  );

-- Fonctions --------------------------------------------------------------------

revoke all on function public.pass_end(public.plan, timestamptz) from public, anon, authenticated;
revoke all on function public.beta_access_end(timestamptz) from public, anon, authenticated;
revoke all on function public.legal_pages_versioning() from public, anon, authenticated;
revoke all on function public.fulfill_payment(uuid, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.refund_payment(text) from public, anon, authenticated;
revoke all on function public.expire_checkout(text) from public, anon, authenticated;
grant execute on function public.fulfill_payment(uuid, text, text, integer, text) to service_role;
grant execute on function public.refund_payment(text) to service_role;
grant execute on function public.expire_checkout(text) to service_role;
grant execute on function public.pass_end(public.plan, timestamptz) to service_role;

grant execute on function public.pass_offers() to anon, authenticated, service_role;
grant execute on function public.legal_ready() to anon, authenticated, service_role;
grant execute on function public.start_checkout(public.plan, boolean, boolean) to authenticated;
grant execute on function public.attach_checkout_session(uuid, text) to authenticated;
grant execute on function public.register_device(uuid, text) to authenticated;
grant execute on function public.check_device(uuid) to authenticated;
grant execute on function public.revoke_device(uuid) to authenticated;
grant execute on function public.authorize_pdf_view(uuid) to authenticated;
grant execute on function public.accept_terms(integer) to authenticated;
grant execute on function public.can_see_demo_question(uuid, public.review_status, timestamptz) to authenticated;
grant execute on function public.admin_set_question_demo(text, boolean) to authenticated;
grant execute on function public.admin_set_beta_end(timestamptz) to authenticated;
grant execute on function public.admin_update_legal_page(text, text, text) to authenticated;
grant execute on function public.admin_question_stats(uuid) to authenticated, service_role;
grant execute on function public.admin_payments(integer) to authenticated;

-- Stockage privé des cours en PDF : seule l'administration y dépose des fichiers ;
-- les étudiants n'y ont jamais accès directement (le serveur sert une copie filigranée).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cours', 'cours', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

create policy cours_admin_select on storage.objects for select to authenticated
  using (bucket_id = 'cours' and (select public.is_admin()));
create policy cours_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cours' and (select public.is_admin()));
create policy cours_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'cours' and (select public.is_admin()))
  with check (bucket_id = 'cours' and (select public.is_admin()));
create policy cours_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cours' and (select public.is_admin()));
