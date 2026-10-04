-- Audit avant le lancement : limites contre les envois en rafale, version du schéma, et droits
-- d'exécution des fonctions réduits au strict nécessaire.

-- Limites quotidiennes ----------------------------------------------------------------
-- Un étudiant reste très loin de ces nombres ; un script qui enverrait des parties ou des
-- signalements en boucle est arrêté.

create function public.attempts_daily_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.attempts a
    where a.user_id = new.user_id and a.created_at > now() - interval '1 day'
  ) >= 400 then
    raise exception 'Trop de parties enregistrées aujourd''hui' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger attempts_daily_limit before insert on public.attempts
  for each row execute function public.attempts_daily_limit();

create function public.feedback_daily_limit() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.feedback f
    where f.user_id = new.user_id and f.created_at > now() - interval '1 day'
  ) >= 50 then
    raise exception 'Trop de retours envoyés aujourd''hui' using errcode = '54000';
  end if;
  return new;
end;
$$;

create trigger feedback_daily_limit before insert on public.feedback
  for each row execute function public.feedback_daily_limit();

-- Version du schéma ----------------------------------------------------------------------
-- Dernière migration appliquée, pour la vérification avant mise en ligne (npm run preflight).

create function public.schema_version() returns text
language plpgsql stable security definer
set search_path = ''
as $$
begin
  return (select max(version) from supabase_migrations.schema_migrations);
exception when undefined_table or invalid_schema_name then
  return null;
end;
$$;

-- Droits d'exécution ---------------------------------------------------------------------
-- Postgres accorde l'exécution d'une nouvelle fonction à tous (PUBLIC) ; la révocation « par
-- schéma » de la phase 0 ne retirait pas ce droit-là, si bien que les fonctions créées depuis
-- étaient appelables par les visiteurs (elles refusaient toutes un appelant non autorisé). On le
-- retire partout, puis on accorde explicitement aux visiteurs ce que les pages publiques utilisent.
-- Toute nouvelle fonction doit faire de même (tests/db/securite.test.ts le vérifie).

revoke execute on all functions in schema public from public, anon;

-- Pages publiques : inscription (code bêta, lien de parrainage), tarifs, accueil.
grant execute on function public.check_beta_code(text) to anon;
grant execute on function public.referral_invitation(text) to anon;
grant execute on function public.legal_ready() to anon;
grant execute on function public.pass_offers() to anon;
grant execute on function public.premium_exclusives() to anon;
grant execute on function public.chapter_news() to anon;

-- Le serveur (clé secrète) garde l'accès à tout.
grant execute on all functions in schema public to service_role;
