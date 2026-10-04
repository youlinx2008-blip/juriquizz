-- JuriQuizz, phase 2 (croissance) : déblocage des niveaux, examens blancs, Premium, parrainage,
-- nouveaux chapitres. Les droits et la RLS sont dans 20261005120200_croissance_securite.sql.

-- Réglages -----------------------------------------------------------------------

alter table public.settings
  -- Le niveau suivant se débloque à partir de 70 % de bonnes réponses au niveau précédent.
  add column levels_unlock boolean not null default true,
  -- Parrainage (fermé tant que l'administration ne l'ouvre pas).
  add column referral_enabled boolean not null default false,
  add column referral_discount_cents integer not null default 200
    check (referral_discount_cents between 0 and 2000),
  add column referral_bonus_days integer not null default 7 check (referral_bonus_days between 0 and 60),
  add column referral_max_per_year integer not null default 10 check (referral_max_per_year between 0 and 100);

-- Parties : une partie complète (toutes les questions visibles du niveau) peut débloquer le niveau
-- suivant ; les parties enregistrées avant la phase 2 étaient complètes.
alter table public.attempts add column complete boolean not null default true;

-- Chapitres : publication et exclusivités Premium ---------------------------------

alter table public.chapters
  -- Première mise à disposition des étudiants (matière visible) : un contenu publié n'est jamais
  -- déplacé en Premium.
  add column published_at timestamptz,
  add column premium boolean not null default false;

-- Chapitres déjà visibles : publiés depuis leur création.
update public.chapters c
set published_at = c.created_at
from public.subjects s
where s.id = c.subject_id and s.visible;

create function public.chapters_publication() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.published_at is null and exists (select 1 from public.subjects s where s.id = new.subject_id and s.visible) then
      new.published_at := now();
    end if;
    return new;
  end if;
  if new.premium and not old.premium and old.published_at is not null then
    raise exception 'Un chapitre déjà publié ne passe pas en Premium : il a pu être vendu sans.'
      using errcode = 'JQ403';
  end if;
  return new;
end;
$$;

create trigger chapters_publication before insert or update on public.chapters
  for each row execute function public.chapters_publication();

create function public.subjects_publication() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.visible and not old.visible then
    update public.chapters set published_at = now() where subject_id = new.id and published_at is null;
  end if;
  return new;
end;
$$;

create trigger subjects_publication after update of visible on public.subjects
  for each row execute function public.subjects_publication();

-- Examens blancs chronométrés -----------------------------------------------------

create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  question_count integer not null check (question_count between 5 and 100),
  duration_minutes integer not null check (duration_minutes between 5 and 240),
  -- Chapitres couverts (vide : tous ceux de la matière) et niveaux d'où les questions sont tirées.
  chapter_ids uuid[] not null default '{}',
  levels public.level[] not null default '{intermediaire,confirme}' check (cardinality(levels) > 0),
  premium boolean not null default false,
  visible boolean not null default false,
  published_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create trigger mock_exams_updated_at before update on public.mock_exams
  for each row execute function public.set_updated_at();

create function public.mock_exams_publication() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.premium and not old.premium and old.published_at is not null then
    raise exception 'Un examen déjà publié ne passe pas en Premium : il a pu être vendu sans.'
      using errcode = 'JQ403';
  end if;
  if new.visible and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger mock_exams_publication before insert or update on public.mock_exams
  for each row execute function public.mock_exams_publication();

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.mock_exams (id) on delete cascade,
  -- Questions tirées au début de l'épreuve, dans l'ordre présenté.
  question_ids text[] not null check (cardinality(question_ids) > 0),
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  -- { "id-de-question": "id-d-option" }
  answers jsonb,
  score integer,
  total integer,
  -- Copie rendue après la fin du temps (au-delà d'une marge de deux minutes).
  late boolean,
  check (deadline > started_at)
);

create index exam_attempts_user_idx on public.exam_attempts (user_id, started_at desc);
create index exam_attempts_exam_idx on public.exam_attempts (exam_id);

-- Premium ------------------------------------------------------------------------

-- « Tout le Pass Année, plus des exclusivités » ; mis en vente seulement avec deux exclusivités
-- au moins réellement disponibles (voir pass_offers).
insert into public.plans (id, label, description, price_cents, duration, on_sale, position)
values (
  'pass_annee_premium',
  'Pass Année Premium',
  'Tout le Pass Année, plus les exclusivités Premium, jusqu’à la fin des partiels de l’année universitaire.',
  3500,
  'annee',
  false,
  4
);

-- Parrainage ---------------------------------------------------------------------

create table public.referral_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column referred_by uuid references auth.users (id) on delete set null,
  add column referred_at timestamptz;

alter table public.payments
  -- Réduction accordée sur le prix de l'offre (parrainage, passage au Premium).
  add column discount_cents integer not null default 0 check (discount_cents >= 0),
  add column discount_reason text check (discount_reason in ('parrainage', 'passage_premium')),
  -- Parrain récompensé quand ce paiement est confirmé.
  add column referrer_id uuid references auth.users (id) on delete set null;

-- Jours offerts au parrain : un accès à part, qui prend la suite de son accès en cours.
alter table public.entitlements drop constraint entitlements_source_check;
alter table public.entitlements
  add constraint entitlements_source_check check (source in ('beta_code', 'admin', 'stripe', 'parrainage')),
  add column referral_payment_id uuid references public.payments (id) on delete set null;

create unique index entitlements_referral_idx on public.entitlements (referral_payment_id)
  where referral_payment_id is not null;
