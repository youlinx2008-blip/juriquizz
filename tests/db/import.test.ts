import { describe, expect, it } from "vitest";
import { asService, asSuperuser, fixturePayload, importFixture, inTransaction, sqlError } from "./helpers";

type Raw = { chapitres: { niveaux: Record<string, Record<string, unknown>[]> }[] };

describe("import du contenu", () => {
  it("importe toutes les questions dans l'ordre du fichier, avec leurs explications", () =>
    inTransaction(async (db) => {
      const { report, chapterId } = await importFixture(db);
      expect(report).toMatchObject({ subject_created: true, visible: true, chapters: 2, inserted: 12 });
      const { rows } = await db.query(
        "select id, position, options, explanation, review_status from public.questions where chapter_id = $1 and level = 'facile' order by position",
        [chapterId("decouverte")],
      );
      const expected = fixturePayload().chapters[0].questions.filter((q) => q.level === "facile");
      expect(rows.map((row) => row.id)).toEqual(expected.map((q) => q.id));
      expect(rows[0].options).toEqual(expected[0].options);
      expect(rows[0].explanation).toEqual(expected[0].explanation);
      expect(rows[0].review_status).toBe("a_relire");
    }));

  it("un nouvel import identique ne change rien et garde les statuts de relecture", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      await asSuperuser(db);
      await db.query(
        "update public.questions set review_status = 'relue' where id = 'exemple-decouverte-facile-01'",
      );
      const { report } = await importFixture(db);
      expect(report).toMatchObject({
        subject_created: false,
        inserted: 0,
        updated: 0,
        moved: 0,
        unchanged: 12,
        retired: 0,
      });
      const { rows } = await db.query(
        "select review_status from public.questions where id = 'exemple-decouverte-facile-01'",
      );
      expect(rows[0].review_status).toBe("relue");
    }));

  it("une question modifiée repasse « à relire » ; une question réordonnée garde son statut", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      await asSuperuser(db);
      await db.query(
        "update public.questions set review_status = 'relue' where id like 'exemple-decouverte-facile-%'",
      );
      const { report } = await importFixture(db, {
        mutate: (raw) => {
          const facile = (raw as Raw).chapitres[0].niveaux.facile;
          facile[0].enonce = "Combien de niveaux de quiz chaque chapitre propose-t-il ?";
          facile.reverse();
        },
      });
      expect(report).toMatchObject({ updated: 1, moved: 1, unchanged: 10 });
      const { rows } = await db.query(
        "select id, position, review_status from public.questions where id like 'exemple-decouverte-facile-%' order by position",
      );
      expect(rows).toEqual([
        { id: "exemple-decouverte-facile-02", position: 0, review_status: "relue" },
        { id: "exemple-decouverte-facile-01", position: 1, review_status: "a_relire" },
      ]);
    }));

  it("une question absente du fichier est retirée (pas supprimée), puis revient si elle réapparaît", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      const { report } = await importFixture(db, {
        mutate: (raw) => {
          (raw as Raw).chapitres[1].niveaux.confirme.pop();
        },
      });
      expect(report).toMatchObject({ retired: 1 });
      await asSuperuser(db);
      const retired = await db.query(
        "select retired_at is not null as retired from public.questions where id = 'exemple-methode-confirme-02'",
      );
      expect(retired.rows[0].retired).toBe(true);
      const { report: again } = await importFixture(db);
      expect(again).toMatchObject({ moved: 1, retired: 0 });
    }));

  it("refuse un identifiant de question déjà utilisé par une autre matière", () =>
    inTransaction(async (db) => {
      await importFixture(db);
      const other = fixturePayload();
      other.subject = { slug: "autre-matiere", title: "Autre matière" };
      await asService(db);
      const error = await sqlError(db, "select public.import_subject($1::jsonb, false)", [
        JSON.stringify(other),
      ]);
      expect(error?.code).toBe("23505");
      expect(error?.message).toMatch(/appartient déjà à une autre matière/);
    }));

  it("une nouvelle matière reste masquée tant qu'on ne la publie pas", () =>
    inTransaction(async (db) => {
      const { report } = await importFixture(db, { publish: false });
      expect(report).toMatchObject({ visible: false });
      const { report: published } = await importFixture(db, { publish: true });
      expect(published).toMatchObject({ visible: true });
    }));
});
