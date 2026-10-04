import { describe, expect, it } from "vitest";
import {
  asAnon,
  asSuperuser,
  asUser,
  createAdmin,
  createTester,
  createUser,
  importFixture,
  inTransaction,
  sqlError,
} from "./helpers";

async function visibleQuestionIds(db: Parameters<Parameters<typeof inTransaction>[0]>[0], subjectId: string) {
  const { rows } = await db.query(
    `select q.id from public.questions q join public.chapters c on c.id = q.chapter_id
     where c.subject_id = $1 order by q.id`,
    [subjectId],
  );
  return rows.map((row) => row.id as string);
}

describe("accès au contenu (RLS)", () => {
  it("un visiteur voit la matière publiée et ses chapitres, jamais les questions", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      await asAnon(db);
      const subjects = await db.query("select id from public.subjects where id = $1", [subjectId]);
      expect(subjects.rowCount).toBe(1);
      const chapters = await db.query("select id from public.chapters where subject_id = $1", [subjectId]);
      expect(chapters.rowCount).toBe(2);
      const error = await sqlError(db, "select id from public.questions limit 1");
      expect(error?.code).toBe("42501");
    }));

  it("un compte sans accès ne voit aucune question", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const userId = await createUser(db);
      await asUser(db, userId);
      expect(await visibleQuestionIds(db, subjectId)).toEqual([]);
      const { rows } = await db.query("select public.has_access() as access");
      expect(rows[0].access).toBe(false);
    }));

  it("un testeur bêta voit les questions à relire et relues, pas celles à corriger ni retirées", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      await asSuperuser(db);
      await db.query(
        "update public.questions set review_status = 'relue' where id = 'exemple-decouverte-facile-01'",
      );
      await db.query(
        "update public.questions set review_status = 'a_corriger' where id = 'exemple-decouverte-facile-02'",
      );
      await db.query("update public.questions set retired_at = now() where id = 'exemple-methode-facile-01'");
      const userId = await createTester(db);
      await asUser(db, userId);
      const ids = await visibleQuestionIds(db, subjectId);
      expect(ids).toHaveLength(10);
      expect(ids).toContain("exemple-decouverte-facile-01");
      expect(ids).not.toContain("exemple-decouverte-facile-02");
      expect(ids).not.toContain("exemple-methode-facile-01");
    }));

  it("une matière masquée disparaît pour les étudiants mais reste visible pour l'administration", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db, { publish: false });
      const tester = await createTester(db);
      const admin = await createAdmin(db);
      await asUser(db, tester);
      expect(await visibleQuestionIds(db, subjectId)).toEqual([]);
      expect((await db.query("select id from public.subjects where id = $1", [subjectId])).rowCount).toBe(0);
      expect(
        (await db.query("select id from public.chapters where subject_id = $1", [subjectId])).rowCount,
      ).toBe(0);
      await asUser(db, admin);
      expect(await visibleQuestionIds(db, subjectId)).toHaveLength(12);
      expect((await db.query("select id from public.subjects where id = $1", [subjectId])).rowCount).toBe(1);
      await asAnon(db);
      expect((await db.query("select id from public.subjects where id = $1", [subjectId])).rowCount).toBe(0);
    }));

  it("un accès expiré ne donne plus rien", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const userId = await createTester(db);
      await asSuperuser(db);
      await db.query(
        "update public.entitlements set starts_at = now() - interval '2 days', ends_at = now() - interval '1 day' where user_id = $1",
        [userId],
      );
      await asUser(db, userId);
      expect(await visibleQuestionIds(db, subjectId)).toEqual([]);
    }));

  it("chacun ne lit que ses propres données", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const alice = await createTester(db);
      const bob = await createTester(db);
      await asUser(db, alice);
      await db.query("select public.submit_attempt($1, 'facile', false, $2::jsonb)", [
        chapterId("decouverte"),
        JSON.stringify([
          { question_id: "exemple-decouverte-facile-01", chosen: "c" },
          { question_id: "exemple-decouverte-facile-02", chosen: "f" },
        ]),
      ]);
      await db.query(
        "insert into public.feedback (question_id, rating, comment) values ('exemple-decouverte-facile-01', 'pas_claire', 'confus')",
      );
      await db.query("update public.profiles set display_name = 'Alice' where id = $1", [alice]);

      await asUser(db, bob);
      for (const table of ["attempts", "answers", "feedback", "entitlements", "profiles"]) {
        const column = table === "answers" ? "attempt_id" : "id";
        const { rows } = await db.query(`select ${column} from public.${table}`);
        const own =
          table === "profiles"
            ? rows.filter((row) => row.id === bob).length
            : table === "entitlements"
              ? 1
              : 0;
        expect(rows.length, table).toBe(own);
      }
      const update = await db.query("update public.profiles set display_name = 'piraté' where id = $1", [
        alice,
      ]);
      expect(update.rowCount).toBe(0);
    }));

  it("un utilisateur ne peut ni s'accorder un accès, ni se déclarer administrateur, ni écrire un score", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const userId = await createUser(db);
      await asUser(db, userId);
      expect(
        (
          await sqlError(
            db,
            "insert into public.entitlements (user_id, plan, source) values ($1, 'beta', 'admin')",
            [userId],
          )
        )?.code,
      ).toBe("42501");
      expect((await sqlError(db, "insert into public.admins (user_id) values ($1)", [userId]))?.code).toBe(
        "42501",
      );
      expect(
        (
          await sqlError(
            db,
            "insert into public.attempts (user_id, chapter_id, level, score, total) values ($1, $2, 'facile', 2, 2)",
            [userId, chapterId("decouverte")],
          )
        )?.code,
      ).toBe("42501");
      expect(
        (await sqlError(db, "update public.profiles set created_at = now() where id = $1", [userId]))?.code,
      ).toBe("42501");
      expect(await sqlError(db, "select code from public.beta_codes")).toBeNull();
      expect((await db.query("select code from public.beta_codes")).rowCount).toBe(0);
    }));

  it("un retour est toujours enregistré au nom de son auteur", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      const alice = await createTester(db);
      const bob = await createTester(db);
      await asUser(db, alice);
      const forged = await sqlError(
        db,
        "insert into public.feedback (user_id, question_id, rating) values ($1, 'exemple-decouverte-facile-01', 'erreur')",
        [bob],
      );
      expect(forged?.code).toBe("42501");
      await db.query(
        "insert into public.feedback (question_id, rating) values ('exemple-decouverte-facile-01', 'erreur')",
      );
      await asSuperuser(db);
      const { rows } = await db.query(
        "select user_id from public.feedback where question_id = 'exemple-decouverte-facile-01'",
      );
      expect(rows.map((row) => row.user_id)).toEqual([alice]);
    }));

  it("un compte sans accès ne peut pas signaler une question qu'il ne voit pas", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      const userId = await createUser(db);
      await asUser(db, userId);
      const error = await sqlError(
        db,
        "insert into public.feedback (question_id, rating) values ('exemple-decouverte-facile-01', 'erreur')",
      );
      expect(error?.code).toBe("42501");
    }));

  it("la suppression du compte efface toutes les données de l'utilisateur", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const userId = await createTester(db);
      await asUser(db, userId);
      await db.query("select public.submit_attempt($1, 'facile', false, $2::jsonb)", [
        chapterId("decouverte"),
        JSON.stringify([{ question_id: "exemple-decouverte-facile-01", chosen: "a" }]),
      ]);
      await db.query("select public.delete_my_account()");
      await asSuperuser(db);
      for (const [table, column] of [
        ["auth.users", "id"],
        ["public.profiles", "id"],
        ["public.entitlements", "user_id"],
        ["public.attempts", "user_id"],
      ]) {
        const { rowCount } = await db.query(`select 1 from ${table} where ${column} = $1`, [userId]);
        expect(rowCount, table).toBe(0);
      }
    }));
});
