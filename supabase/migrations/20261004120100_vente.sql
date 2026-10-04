-- JuriQuizz, phase 1 (vente) : offres, paiements, cours en PDF, appareils, textes légaux, démonstration.
-- Les droits et la RLS sont dans 20261004120200_vente_securite.sql.

-- Offres -----------------------------------------------------------------------

create table public.plans (
  id public.plan primary key,
  label text not null,
  description text not null default '',
  -- Prix TTC en centimes.
  price_cents integer not null check (price_cents >= 50),
  -- Prix de lancement, appliqué jusqu'à promo_until (exemple : les deux premières semaines de vente).
  promo_price_cents integer check (promo_price_cents >= 50),
  promo_until timestamptz,
  -- jours : durée fixe à partir du paiement ; session : jusqu'à la fin des prochains partiels ;
  -- annee : jusqu'à la fin des derniers partiels de l'année universitaire en cours.
  duration text not null check (duration in ('jours', 'session', 'annee')),
  duration_days integer check (duration_days > 0),
  on_sale boolean not null default false,
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint plans_duration_days check ((duration = 'jours') = (duration_days is not null))
);

create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

insert into public.plans (id, label, description, price_cents, promo_price_cents, duration, duration_days, on_sale, position)
values
  ('pass_mensuel', 'Pass Mensuel',
   'Tous les quiz et tous les cours en PDF pendant 30 jours, sans renouvellement automatique.',
   900, null, 'jours', 30, true, 1),
  ('pass_partiels', 'Pass Partiels',
   'Tous les quiz et tous les cours en PDF jusqu’à la fin des partiels de la session en cours.',
   1500, 1200, 'session', null, true, 2),
  ('pass_annee', 'Pass Année',
   'Tous les quiz et tous les cours en PDF jusqu’à la fin des partiels de l’année universitaire (les deux sessions).',
   2500, null, 'annee', null, true, 3);

-- Fins des sessions de partiels, saisies dans l'administration.
create table public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null check (academic_year ~ '^\d{4}-\d{4}$'),
  label text not null check (char_length(label) between 1 and 80),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index exam_sessions_ends_idx on public.exam_sessions (ends_at);
create unique index exam_sessions_label_idx on public.exam_sessions (academic_year, lower(label));

-- Réglages généraux (une seule ligne).
create table public.settings (
  id boolean primary key default true check (id),
  -- Fin de la bêta : aucun accès bêta ne va au-delà, même ouvert par un code créé après coup.
  beta_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.settings (id) values (true);

-- Accès accordé par un paiement.
alter table public.entitlements drop constraint entitlements_source_check;
alter table public.entitlements
  add constraint entitlements_source_check check (source in ('beta_code', 'admin', 'stripe'));
-- Un accès remboursé se ferme à l'instant même : une période vide est permise.
alter table public.entitlements drop constraint entitlements_period;
alter table public.entitlements
  add constraint entitlements_period check (ends_at is null or ends_at >= starts_at);

-- Paiements -------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  -- Conservé sans le compte s'il est supprimé : obligation comptable.
  user_id uuid references auth.users (id) on delete set null,
  plan public.plan not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'cree' check (status in ('cree', 'paye', 'rembourse', 'expire')),
  -- Date de fin annoncée avant le paiement.
  quoted_ends_at timestamptz not null,
  stripe_session_id text unique,
  stripe_payment_intent text unique,
  -- Version des CGV acceptées et renonciation expresse au droit de rétractation (contenu numérique).
  cgv_version integer not null,
  withdrawal_waiver_at timestamptz not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  refunded_at timestamptz
);

create index payments_user_idx on public.payments (user_id, created_at desc);

alter table public.entitlements
  add column payment_id uuid references public.payments (id) on delete set null;

create unique index entitlements_payment_idx on public.entitlements (payment_id) where payment_id is not null;

-- Cours en PDF ----------------------------------------------------------------

create table public.course_documents (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null unique references public.chapters (id) on delete cascade,
  -- Chemin dans le compartiment privé « cours » ; jamais servi tel quel aux étudiants.
  storage_path text not null,
  title text not null default '',
  page_count integer not null check (page_count > 0),
  -- Pages libres d'accès (première page, sommaire) pour l'aperçu.
  preview_pages integer not null default 2 check (preview_pages between 0 and 10),
  file_size integer not null check (file_size > 0),
  uploaded_by uuid references auth.users (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table public.pdf_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.course_documents (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index pdf_views_user_idx on public.pdf_views (user_id, viewed_at desc);

-- Appareils connectés (deux au plus par compte) -------------------------------

create table public.device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Identifiant aléatoire du navigateur (cookie) : un même navigateur reste un seul appareil.
  browser_key uuid not null,
  label text not null default '' check (char_length(label) <= 200),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, browser_key)
);

create index device_sessions_user_idx on public.device_sessions (user_id, created_at desc);

-- Textes légaux (modifiables dans l'administration, versionnés) ---------------

create table public.legal_pages (
  slug text primary key check (slug in ('cgu', 'cgv', 'mentions-legales', 'confidentialite')),
  title text not null,
  body text not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Historique : le texte exact accepté par chaque acheteur reste consultable.
create table public.legal_page_versions (
  slug text not null references public.legal_pages (slug) on delete cascade,
  version integer not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (slug, version)
);

create function public.legal_pages_versioning() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.body is distinct from old.body or new.title is distinct from old.title then
      new.version := old.version + 1;
      new.updated_at := now();
    else
      return new;
    end if;
  end if;
  insert into public.legal_page_versions (slug, version, title, body)
  values (new.slug, new.version, new.title, new.body)
  on conflict (slug, version) do update set title = excluded.title, body = excluded.body;
  return new;
end;
$$;

create trigger legal_pages_versioning_insert after insert on public.legal_pages
  for each row execute function public.legal_pages_versioning();
create trigger legal_pages_versioning_update before update on public.legal_pages
  for each row execute function public.legal_pages_versioning();

-- Comptes : acceptation des CGU ; questions : démonstration -------------------

alter table public.profiles
  add column terms_version integer,
  add column terms_accepted_at timestamptz,
  -- Nom et prénom imprimés, avec l'adresse e-mail, en filigrane des cours en PDF.
  add column full_name text check (full_name is null or char_length(full_name) between 2 and 120);

-- Questions proposées dans le mini-quiz de démonstration (comptes sans pass).
alter table public.questions add column demo boolean not null default false;
