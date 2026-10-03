import { describe, expect, it } from "vitest";
import {
  asSuperuser,
  asUser,
  createTester,
  createUser,
  importFixture,
  inTransaction,
  sqlError,
} from "./helpers";

const FACILE = [
  // bonne réponse : c, puis v
  { question_id: "exemple-decouverte-facile-01", chosen: "c" },
  { question_id: "exemple-decouverte-facile-02", chosen: "f" },
];

describe("enregistrement des parties", () => {
  it("recalcule le score à partir des réponses, sans faire confiance au navigateur", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const userId = await createTester(db);
      await asUser(db, userId);
      const { rows } = await db.query(
        "select public.submit_attempt($1, 'facile', false, $2::jsonb) as result",
        [chapterId("decouverte"), JSON.stringify(FACILE)],
      );
      expect(rows[0].result).toMatchObject({ score: 1, total: 2 });
      const answers = await db.query(
        "select question_id, chosen_option, is_correct, position from public.answers order by position",
      );
      expect(answers.rows).toEqual([
        { question_id: "exemple-decouverte-facile-01", chosen_option: "c", is_correct: true, position: 0 },
        { question_id: "exemple-decouverte-facile-02", chosen_option: "f", is_correct: false, position: 1 },
      ]);
      const attempts = await db.query("select user_id, level, score, total, retry from public.attempts");
      expect(attempts.rows).toEqual([{ user_id: userId, level: "facile", score: 1, total: 2, retry: false }]);
    }));

  it("refuse les réponses invalides : doublon, autre niveau, option inconnue, question invisible", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      await asSuperuser(db);
      await db.query(
        "update public.questions set review_status = 'a_corriger' where id = 'exemple-decouverte-facile-02'",
      );
      const userId = await createTester(db);
      await asUser(db, userId);
      const submit = (answers: unknown, level = "facile") =>
        sqlError(db, "select public.submit_attempt($1, $2::public.level, false, $3::jsonb)", [
          chapterId("decouverte"),
          level,
          JSON.stringify(answers),
        ]);
      const cases = [
        [FACILE[0], FACILE[0]],
        [{ question_id: "exemple-decouverte-intermediaire-01", chosen: "b" }],
        [{ question_id: "exemple-decouverte-facile-01", chosen: "z" }],
        [{ question_id: "exemple-decouverte-facile-02", chosen: "v" }],
        [{ question_id: "exemple-methode-facile-01", chosen: "v" }],
        [],
      ];
      for (const answers of cases) {
        expect((await submit(answers))?.code, JSON.stringify(answers)).toBe("22023");
      }
      expect((await db.query("select count(*)::int as n from public.attempts")).rows[0].n).toBe(0);
    }));

  it("refuse une partie à un compte sans accès", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const userId = await createUser(db);
      await asUser(db, userId);
      const error = await sqlError(db, "select public.submit_attempt($1, 'facile', false, $2::jsonb)", [
        chapterId("decouverte"),
        JSON.stringify(FACILE),
      ]);
      expect(error?.code).toBe("42501");
    }));

  it("« erreurs à refaire » : seule compte la dernière réponse à chaque question", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const userId = await createTester(db);
      await asUser(db, userId);
      await db.query("select public.submit_attempt($1, 'facile', false, $2::jsonb)", [
        chapterId("decouverte"),
        JSON.stringify([
          { question_id: "exemple-decouverte-facile-01", chosen: "a" },
          { question_id: "exemple-decouverte-facile-02", chosen: "f" },
        ]),
      ]);
      // Les horodatages d'une même transaction sont identiques : on vieillit la première partie.
      await asSuperuser(db);
      await db.query("update public.attempts set created_at = now() - interval '1 hour'");
      await asUser(db, userId);
      await db.query("select public.submit_attempt($1, 'facile', true, $2::jsonb)", [
        chapterId("decouverte"),
        JSON.stringify([{ question_id: "exemple-decouverte-facile-01", chosen: "c" }]),
      ]);
      const { rows } = await db.query(
        "select question_id, answered, last_correct from public.my_question_status($1) order by question_id",
        [chapterId("decouverte")],
      );
      expect(rows).toEqual([
        { question_id: "exemple-decouverte-facile-01", answered: 2, last_correct: true },
        { question_id: "exemple-decouverte-facile-02", answered: 1, last_correct: false },
      ]);
    }));
});
