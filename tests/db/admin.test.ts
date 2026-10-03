import { describe, expect, it } from "vitest";
import {
  asService,
  asSuperuser,
  asUser,
  createAdmin,
  createTester,
  fixturePayload,
  importFixture,
  inTransaction,
  sqlError,
} from "./helpers";

describe("administration", () => {
  it("les fonctions d'administration sont refusées aux étudiants", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const tester = await createTester(db);
      await asUser(db, tester);
      const calls: [string, unknown[]][] = [
        ["select public.admin_set_subject_visibility($1, false)", [subjectId]],
        ["select public.admin_set_review_status('exemple-decouverte-facile-01', 'relue')", []],
        ["select * from public.admin_create_beta_codes(1, 1)", []],
        ["select * from public.admin_question_stats()", []],
        ["select * from public.admin_option_stats('exemple-decouverte-facile-01')", []],
        ["select public.admin_overview()", []],
        ["select public.import_subject($1::jsonb, true)", [JSON.stringify(fixturePayload())]],
      ];
      for (const [sql, params] of calls) {
        expect((await sqlError(db, sql, params))?.code, sql).toBe("42501");
      }
    }));

  it("masquer une matière, changer un statut de relecture (avec auteur et date)", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const admin = await createAdmin(db);
      await asUser(db, admin);
      await db.query("select public.admin_set_subject_visibility($1, false)", [subjectId]);
      await db.query("select public.admin_set_review_status('exemple-decouverte-facile-01', 'relue')");
      await asSuperuser(db);
      const subject = await db.query("select visible from public.subjects where id = $1", [subjectId]);
      expect(subject.rows[0].visible).toBe(false);
      const question = await db.query(
        "select review_status, reviewed_by, reviewed_at is not null as dated from public.questions where id = 'exemple-decouverte-facile-01'",
      );
      expect(question.rows[0]).toEqual({ review_status: "relue", reviewed_by: admin, dated: true });
    }));

  it("crée des codes aléatoires lisibles et uniques, ou un code choisi", () =>
    inTransaction(async (db) => {
      const admin = await createAdmin(db);
      await asUser(db, admin);
      const { rows } = await db.query(
        "select code, uses_max, label from public.admin_create_beta_codes(20, 3, 'TD 4')",
      );
      expect(rows).toHaveLength(20);
      for (const row of rows) {
        expect(row.code).toMatch(/^JQ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
        expect(row).toMatchObject({ uses_max: 3, label: "TD 4" });
      }
      expect(new Set(rows.map((row) => row.code)).size).toBe(20);
      const chosen = await db.query(
        "select code from public.admin_create_beta_codes(1, 300, 'amphi', null, null, 'JQ', 'amphi-l1-2026')",
      );
      expect(chosen.rows[0].code).toBe("AMPHI-L1-2026");
      expect(
        (
          await sqlError(
            db,
            "select * from public.admin_create_beta_codes(2, 1, '', null, null, 'JQ', 'DEUX-FOIS')",
          )
        )?.code,
      ).toBe("22023");
    }));

  it("taux de réussite par question, sur les premières tentatives seulement", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const alice = await createTester(db);
      const bob = await createTester(db);
      const admin = await createAdmin(db);
      const play = async (userId: string, chosen: string, retry = false) => {
        await asUser(db, userId);
        await db.query("select public.submit_attempt($1, 'facile', $2, $3::jsonb)", [
          chapterId("decouverte"),
          retry,
          JSON.stringify([{ question_id: "exemple-decouverte-facile-01", chosen }]),
        ]);
      };
      await play(alice, "c");
      await play(bob, "a");
      await play(bob, "c", true);
      await asUser(db, bob);
      await db.query(
        "insert into public.feedback (question_id, rating, comment) values ('exemple-decouverte-facile-01', 'pas_claire', 'ambigu')",
      );
      await asUser(db, admin);
      const { rows } = await db.query(
        "select answers_count, correct_count, users_count, feedback_pas_claire, feedback_open from public.admin_question_stats() where question_id = 'exemple-decouverte-facile-01'",
      );
      expect(rows[0]).toEqual({
        answers_count: 2,
        correct_count: 1,
        users_count: 2,
        feedback_pas_claire: 1,
        feedback_open: 1,
      });
      const options = await db.query(
        "select option_id, chosen_count from public.admin_option_stats('exemple-decouverte-facile-01') order by option_id",
      );
      expect(options.rows).toEqual([
        { option_id: "a", chosen_count: 1 },
        { option_id: "c", chosen_count: 1 },
      ]);
      const overview = await db.query("select public.admin_overview() as o");
      expect(overview.rows[0].o.feedback_open).toBeGreaterThanOrEqual(1);
    }));

  it("l'administration lit les retours et les pseudos, pas les étudiants", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      const alice = await createTester(db);
      const admin = await createAdmin(db);
      await asUser(db, alice);
      await db.query(
        "insert into public.feedback (question_id, rating, comment) values ('exemple-decouverte-facile-01', 'erreur', 'date fausse')",
      );
      await asUser(db, admin);
      const feedback = await db.query("select comment from public.feedback where user_id = $1", [alice]);
      expect(feedback.rows).toEqual([{ comment: "date fausse" }]);
      const profile = await db.query("select id from public.profiles where id = $1", [alice]);
      expect(profile.rowCount).toBe(1);
      await db.query(
        "select public.admin_resolve_feedback((select id from public.feedback where user_id = $1), true)",
        [alice],
      );
      await asSuperuser(db);
      const resolved = await db.query(
        "select resolved_at is not null as done from public.feedback where user_id = $1",
        [alice],
      );
      expect(resolved.rows[0].done).toBe(true);
    }));

  it("seule la clé de service ou l'administration peut importer du contenu", () =>
    inTransaction(async (db) => {
      await asService(db);
      const { rows } = await db.query("select public.import_subject($1::jsonb, false) as report", [
        JSON.stringify(fixturePayload()),
      ]);
      expect(rows[0].report).toMatchObject({ inserted: 12, visible: false });
    }));
});
