-- JuriQuizz, phase 0 (bêta gratuite) : tables et types.
-- Les règles d'accès (RLS) et les droits sont dans 20261002120200_security.sql.

create type public.level as enum ('facile', 'intermediaire', 'confirme');
create type public.question_type as enum ('qcm', 'vrai_faux', 'cas_pratique');
-- a_relire : visible en bêta avec un bandeau ; relue : visible par tous les accès ;
-- a_corriger : masquée aux étudiants jusqu'à correction.
create type public.review_status as enum ('a_relire', 'relue', 'a_corriger');
create type public.decor as enum ('ruines', 'frontiere', 'codex', 'eglise', 'plaine', 'mer', 'chateau');
-- La phase 1 ajoutera les pass payants à cette liste.
create type public.plan as enum ('beta');
create type public.feedback_rating as enum ('claire', 'pas_claire', 'erreur');

create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Contenu ------------------------------------------------------------------

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  -- Droit de retrait : une matière masquée disparaît pour tous sauf l'administration.
  visible boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  number text not null,
  label text not null,
  title text not null,
  summary text not null default '',
  default_decor public.decor not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create index chapters_subject_idx on public.chapters (subject_id, position);

create table public.questions (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  level public.level not null,
  -- Rang dans le niveau, dans l'ordre du fichier importé.
  position integer not null,
  course_order integer not null,
  type public.question_type not null,
  decor public.decor,
  prompt text not null,
  -- [{ "id": "a", "text": "..." }], dans l'ordre du fichier : ne jamais mélanger à l'affichage,
  -- les explications renvoient parfois aux lettres.
  options jsonb not null,
  correct_option text not null,
  hint text,
  -- Liste de paragraphes.
  explanation jsonb not null,
  review_status public.review_status not null default 'a_relire',
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  -- Empreinte du contenu, pour repérer les questions modifiées lors d'un nouvel import.
  content_hash text not null,
  -- Question retirée du fichier : conservée pour l'historique, invisible pour les étudiants.
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_options_shape check (
    jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6
  ),
  constraint questions_correct_in_options check (
    options @> jsonb_build_array(jsonb_build_object('id', correct_option))
  ),
  constraint questions_explanation_shape check (
    jsonb_typeof(explanation) = 'array' and jsonb_array_length(explanation) > 0
  )
);

create index questions_chapter_level_idx on public.questions (chapter_id, level, position);

-- Comptes ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  -- Préférences : null signifie « réglage par défaut de l'appareil ».
  sound_pref text check (sound_pref in ('on', 'off')),
  decor_pref text check (decor_pref in ('anime', 'fixe', 'off')),
  theme_pref text check (theme_pref in ('auto', 'clair', 'sombre')),
  volume real check (volume >= 0 and volume <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.beta_codes (
  code text primary key check (
    code ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$' and char_length(code) between 6 and 40
  ),
  label text not null default '' check (char_length(label) <= 120),
  uses_max integer not null default 1 check (uses_max between 1 and 10000),
  uses integer not null default 0 check (uses >= 0),
  -- Date limite pour utiliser le code.
  expires_at timestamptz,
  -- Fin de l'accès accordé par le code (null : jusqu'à la fin de la bêta).
  access_ends_at timestamptz,
  disabled boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan public.plan not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  source text not null check (source in ('beta_code', 'admin')),
  beta_code text references public.beta_codes (code) on delete set null,
  created_at timestamptz not null default now(),
  constraint entitlements_period check (ends_at is null or ends_at > starts_at)
);

create index entitlements_user_idx on public.entitlements (user_id);

-- Quiz ---------------------------------------------------------------------

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  level public.level not null,
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  -- true pour « Refaire mes erreurs » : exclu des meilleurs scores et des statistiques.
  retry boolean not null default false,
  created_at timestamptz not null default now(),
  constraint attempts_score_le_total check (score <= total)
);

create index attempts_user_idx on public.attempts (user_id, chapter_id, level, created_at desc);
create index attempts_chapter_idx on public.attempts (chapter_id);

create table public.answers (
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  position integer not null,
  chosen_option text not null,
  is_correct boolean not null,
  primary key (attempt_id, question_id)
);

create index answers_question_idx on public.answers (question_id);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  rating public.feedback_rating not null,
  comment text not null default '' check (char_length(comment) <= 2000),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index feedback_question_idx on public.feedback (question_id);
create index feedback_created_idx on public.feedback (created_at desc);
create index feedback_user_idx on public.feedback (user_id);

-- Horodatage des modifications ---------------------------------------------

create trigger subjects_updated_at before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
