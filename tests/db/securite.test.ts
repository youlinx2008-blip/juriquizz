import { describe, expect, it } from "vitest";
import { asAnon, asSuperuser, asUser, createTester, importFixture, inTransaction, sqlError } from "./helpers";

/*
 * Garde-fous de sécurité sur tout le schéma : une nouvelle table ou une nouvelle fonction doit
 * être protégée et ses droits accordés explicitement (et ajoutés ici, après réflexion).
 */

/** Fonctions appelables sans compte : pages publiques, inscription. */
const ANON_FUNCTIONS = [
  "chapter_news",
  "check_beta_code",
  "legal_ready",
  "pass_offers",
  "premium_exclusives",
  "referral_invitation",
];

/** Fonctions appelables avec un compte ; chacune vérifie elle-même l'appelant si besoin. */
const AUTHENTICATED_FUNCTIONS = [
  "accept_terms",
  "admin_create_beta_codes",
  "admin_option_stats",
  "admin_overview",
  "admin_payments",
  "admin_question_stats",
  "admin_resolve_feedback",
  "admin_set_beta_code_disabled",
  "admin_set_beta_end",
  "admin_set_chapter_premium",
  "admin_set_question_demo",
  "admin_set_review_status",
  "admin_set_subject_visibility",
  "admin_update_legal_page",
  "attach_checkout_session",
  "authorize_pdf_view",
  "can_see_demo_question",
  "can_see_question",
  "chapter_news",
  "check_beta_code",
  "check_device",
  "delete_my_account",
  "exam_relue_pool_size",
  "has_access",
  "has_beta_access",
  "has_premium",
  "import_subject",
  "is_admin",
  "legal_ready",
  "level_unlocked",
  "my_level_access",
  "my_question_status",
  "my_referral_code",
  "my_referrals",
  "pass_offers",
  "premium_exclusives",
  "quote_pass",
  "redeem_beta_code",
  "referral_invitation",
  "register_device",
  "revoke_device",
  "start_checkout",
  "start_mock_exam",
  "submit_attempt",
  "submit_mock_exam",
  "viewer_context",
];

async function executableBy(db: Parameters<Parameters<typeof inTransaction>[0]>[0], role: string) {
  const { rows } = await db.query(
    `select distinct p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege($1, p.oid, 'execute') order by 1`,
    [role],
  );
  return rows.map((row) => row.proname as string);
}

describe("garde-fous du schéma", () => {
  it("les visiteurs n'exécutent que les fonctions des pages publiques", () =>
    inTransaction(async (db) => {
      expect(await executableBy(db, "anon")).toEqual(ANON_FUNCTIONS);
      await asAnon(db);
      expect((await sqlError(db, "select public.exam_relue_pool_size(gen_random_uuid())"))?.code).toBe(
        "42501",
      );
      expect((await sqlError(db, "select public.my_referral_code()"))?.code).toBe("42501");
    }));

  it("les comptes connectés n'exécutent que les fonctions prévues", () =>
    inTransaction(async (db) => {
      expect(await executableBy(db, "authenticated")).toEqual(AUTHENTICATED_FUNCTIONS);
    }));

  it("toutes les tables sont protégées par la RLS, avec au moins une politique", () =>
    inTransaction(async (db) => {
      const { rows } = await db.query(
        `select c.relname, c.relrowsecurity,
                exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind in ('r', 'p')`,
      );
      expect(rows.length).toBeGreaterThan(10);
      expect(rows.filter((row) => !row.relrowsecurity || !row.policies).map((row) => row.relname)).toEqual(
        [],
      );
    }));

  it("les fonctions qui s'exécutent avec les droits du propriétaire fixent leur search_path", () =>
    inTransaction(async (db) => {
      const { rows } = await db.query(
        `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prosecdef
           and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
      );
      expect(rows).toEqual([]);
    }));

  it("les cours en PDF sont dans un stockage privé", () =>
    inTransaction(async (db) => {
      const { rows } = await db.query("select public from storage.buckets where id = 'cours'");
      expect(rows).toEqual([{ public: false }]);
    }));
});

describe("limites quotidiennes", () => {
  it("au-delà de 400 parties ou de 50 retours en un jour, la base refuse", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const chapter = chapterId("decouverte");
      const tester = await createTester(db);
      await asSuperuser(db);
      await db.query(
        `insert into public.attempts (user_id, chapter_id, level, score, total, retry)
         select $1, $2, 'facile', 1, 2, false from generate_series(1, 400)`,
        [tester, chapter],
      );
      await db.query(
        `insert into public.feedback (user_id, question_id, rating)
         select $1, 'exemple-decouverte-facile-01', 'claire' from generate_series(1, 50)`,
        [tester],
      );
      await asUser(db, tester);
      expect(
        (
          await sqlError(db, "select public.submit_attempt($1, 'facile', false, $2::jsonb)", [
            chapter,
            JSON.stringify([{ question_id: "exemple-decouverte-facile-01", chosen: "c" }]),
          ])
        )?.code,
      ).toBe("54000");
      expect(
        (
          await sqlError(
            db,
            // Comme l'application : le compte est celui de la session.
            "insert into public.feedback (question_id, rating) values ('exemple-decouverte-facile-01', 'claire')",
          )
        )?.code,
      ).toBe("54000");
    }));
});
