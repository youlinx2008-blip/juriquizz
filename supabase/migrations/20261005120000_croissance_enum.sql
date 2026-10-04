-- JuriQuizz, phase 2 (croissance) : nouvelles valeurs, dans une migration à part (une valeur
-- ajoutée à un type énuméré n'est utilisable qu'après validation de la transaction).
alter type public.plan add value if not exists 'pass_annee_premium';
alter type public.plan add value if not exists 'parrainage';
