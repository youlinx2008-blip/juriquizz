-- Phase 1 : les pass payants. Dans une migration à part : une valeur ajoutée à un type
-- énuméré n'est utilisable qu'une fois la transaction validée.
alter type public.plan add value if not exists 'pass_mensuel';
alter type public.plan add value if not exists 'pass_partiels';
alter type public.plan add value if not exists 'pass_annee';
