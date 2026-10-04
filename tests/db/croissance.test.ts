import { describe, expect, it } from "vitest";
import {
  asAnon,
  asService,
  asSuperuser,
  asUser,
  createAdmin,
  createTester,
  createUser,
  importFixture,
  inTransaction,
  sqlError,
  type Db,
} from "./helpers";

/*
 * Phase 2 : déblocage des niveaux, Premium, examens blancs, parrainage, nouveaux chapitres.
 * Matière d'exemple : chapitres « decouverte » et « methode », deux questions par niveau.
 */

const RIGHT: Record<string, string> = {
  "exemple-decouverte-facile-01": "c",
  "exemple-decouverte-facile-02": "v",
  "exemple-decouverte-intermediaire-01": "b",
  "exemple-decouverte-intermediaire-02": "f",
};

async function play(
  db: Db,
  userId: string,
  chapterId: string,
  level: string,
  answers: [string, string][],
  retry = false,
) {
  await asUser(db, userId);
  const { rows } = await db.query("select public.submit_attempt($1, $2::public.level, $3, $4::jsonb) as r", [
    chapterId,
    level,
    retry,
    JSON.stringify(answers.map(([question_id, chosen]) => ({ question_id, chosen }))),
  ]);
  return rows[0].r as { score: number; total: number };
}

async function levels(db: Db, userId: string, chapterId: string) {
  await asUser(db, userId);
  const { rows } = await db.query("select level, unlocked from public.my_level_access($1)", [chapterId]);
  return Object.fromEntries(rows.map((row) => [row.level, row.unlocked]));
}

/** Pass accordé directement (comme le ferait l'administration). */
async function grant(db: Db, userId: string, plan: string, endsAt = "2090-01-01T00:00:00Z") {
  await asSuperuser(db);
  await db.query(
    "insert into public.entitlements (user_id, plan, ends_at, source) values ($1, $2::public.plan, $3, 'admin')",
    [userId, plan, endsAt],
  );
}

async function markRelue(db: Db, pattern = "exemple-%") {
  await asSuperuser(db);
  await db.query("update public.questions set review_status = 'relue' where id like $1", [pattern]);
}

/** Textes légaux complétés et dates de partiels : de quoi ouvrir la vente. */
async function openSales(db: Db) {
  await asSuperuser(db);
  await db.query("update public.legal_pages set body = replace(body, '[À COMPLÉTER', '[complété')");
  await db.query("delete from public.exam_sessions");
  await db.query(
    `insert into public.exam_sessions (academic_year, label, ends_at) values
       ('2090-2091', 'Partiels de janvier', '2091-01-31T22:59:59Z'),
       ('2090-2091', 'Partiels de mai', '2091-05-31T21:59:59Z')`,
  );
}

async function buy(db: Db, userId: string, plan: string) {
  await asUser(db, userId);
  const { rows } = await db.query("select public.start_checkout($1::public.plan, true, true) as r", [plan]);
  const order = rows[0].r as { payment_id: string; amount_cents: number; discount_cents: number };
  await db.query("select public.attach_checkout_session($1, $2)", [
    order.payment_id,
    `cs_${order.payment_id}`,
  ]);
  await asService(db);
  const done = await db.query("select public.fulfill_payment($1, $2, $3, $4, 'eur') as r", [
    order.payment_id,
    `cs_${order.payment_id}`,
    `pi_${order.payment_id}`,
    order.amount_cents,
  ]);
  return { ...order, result: done.rows[0].r as { status: string; referral: string | null } };
}

async function quote(db: Db, userId: string, plan: string) {
  await asUser(db, userId);
  const { rows } = await db.query("select public.quote_pass($1::public.plan) as q", [plan]);
  return rows[0].q as {
    price_cents: number;
    discount_cents: number;
    discount_reason: string | null;
    covered: boolean;
    available: boolean;
  };
}

describe("déblocage des niveaux à 70 %", () => {
  it("le niveau suivant s'ouvre après une partie complète réussie à 70 % au moins", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const chapter = chapterId("decouverte");
      const tester = await createTester(db);
      expect(await levels(db, tester, chapter)).toEqual({
        facile: true,
        intermediaire: false,
        confirme: false,
      });
      expect(
        (
          await sqlError(db, "select public.submit_attempt($1, 'intermediaire', false, $2::jsonb)", [
            chapter,
            JSON.stringify([{ question_id: "exemple-decouverte-intermediaire-01", chosen: "b" }]),
          ])
        )?.code,
      ).toBe("JQ423");

      // 1 sur 2 : 50 %, insuffisant.
      await play(db, tester, chapter, "facile", [
        ["exemple-decouverte-facile-01", "c"],
        ["exemple-decouverte-facile-02", "f"],
      ]);
      expect((await levels(db, tester, chapter)).intermediaire).toBe(false);
      // « Refaire mes erreurs » et partie incomplète : ne débloquent rien.
      await play(db, tester, chapter, "facile", [["exemple-decouverte-facile-02", "v"]], true);
      await play(db, tester, chapter, "facile", [["exemple-decouverte-facile-01", "c"]]);
      expect((await levels(db, tester, chapter)).intermediaire).toBe(false);

      await play(db, tester, chapter, "facile", [
        ["exemple-decouverte-facile-01", RIGHT["exemple-decouverte-facile-01"]],
        ["exemple-decouverte-facile-02", RIGHT["exemple-decouverte-facile-02"]],
      ]);
      expect(await levels(db, tester, chapter)).toEqual({
        facile: true,
        intermediaire: true,
        confirme: false,
      });
      await play(db, tester, chapter, "intermediaire", [
        ["exemple-decouverte-intermediaire-01", RIGHT["exemple-decouverte-intermediaire-01"]],
        ["exemple-decouverte-intermediaire-02", RIGHT["exemple-decouverte-intermediaire-02"]],
      ]);
      expect((await levels(db, tester, chapter)).confirme).toBe(true);
      // Le déblocage vaut chapitre par chapitre.
      expect((await levels(db, tester, chapterId("methode"))).intermediaire).toBe(false);
    }));

  it("un niveau sans question visible ne bloque pas ; l'administration et le réglage lèvent le verrou", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const chapter = chapterId("decouverte");
      // Détenteur d'un pass : seules les questions relues comptent, ici celles du niveau intermédiaire.
      await markRelue(db, "exemple-decouverte-intermediaire-%");
      const holder = await createUser(db);
      await grant(db, holder, "pass_mensuel");
      expect(await levels(db, holder, chapter)).toEqual({
        facile: true,
        intermediaire: true,
        confirme: false,
      });

      const admin = await createAdmin(db);
      expect(await levels(db, admin, chapter)).toEqual({ facile: true, intermediaire: true, confirme: true });

      await asSuperuser(db);
      await db.query("update public.settings set levels_unlock = false");
      expect((await levels(db, holder, chapter)).confirme).toBe(true);
    }));
});

describe("Premium", () => {
  const premiumMethode = {
    mutate: (raw: Record<string, unknown>) => {
      (raw.chapitres as Record<string, unknown>[])[1].premium = true;
    },
  };

  it("les chapitres Premium sont réservés au Pass Année Premium (et aux testeurs)", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db, premiumMethode);
      await markRelue(db);
      const visible = async (userId: string) => {
        await asUser(db, userId);
        const { rows } = await db.query(
          "select count(*)::int as n from public.questions where chapter_id = $1",
          [chapterId("methode")],
        );
        return rows[0].n as number;
      };
      const yearly = await createUser(db);
      await grant(db, yearly, "pass_annee");
      const premium = await createUser(db);
      await grant(db, premium, "pass_annee_premium");
      const tester = await createTester(db);
      expect(await visible(yearly)).toBe(0);
      expect(await visible(premium)).toBe(6);
      expect(await visible(tester)).toBe(6);
      // Ni dans la démonstration.
      await asSuperuser(db);
      await db.query("update public.questions set demo = true where id like 'exemple-methode-%'");
      const free = await createUser(db);
      expect(await visible(free)).toBe(0);

      // Cours en PDF d'un chapitre Premium.
      await asSuperuser(db);
      await db.query("update public.profiles set full_name = 'Élodie Dupré' where id in ($1, $2)", [
        yearly,
        premium,
      ]);
      const { rows } = await db.query(
        `insert into public.course_documents (chapter_id, storage_path, title, page_count, file_size)
         values ($1, 'x/premium.pdf', 'Méthode', 3, 1000) returning id`,
        [chapterId("methode")],
      );
      await asUser(db, yearly);
      expect((await sqlError(db, "select public.authorize_pdf_view($1)", [rows[0].id]))?.code).toBe("JQ402");
      await asUser(db, premium);
      expect(
        (await db.query("select public.authorize_pdf_view($1) as r", [rows[0].id])).rows[0].r.title,
      ).toBe("Méthode");
    }));

  it("un contenu déjà publié ne passe jamais en Premium", () =>
    inTransaction(async (db) => {
      const { chapterId, subjectId } = await importFixture(db);
      const admin = await createAdmin(db);
      await asUser(db, admin);
      expect(
        (await sqlError(db, "select public.admin_set_chapter_premium($1, true)", [chapterId("methode")]))
          ?.code,
      ).toBe("JQ403");
      // Ni par un nouvel import.
      await asService(db);
      const { fixturePayload } = await import("./helpers");
      const payload = fixturePayload((raw) => {
        (raw.chapitres as Record<string, unknown>[])[1].premium = true;
      });
      expect(
        (await sqlError(db, "select public.import_subject($1::jsonb, true)", [JSON.stringify(payload)]))
          ?.code,
      ).toBe("JQ403");

      // Matière jamais publiée : le choix reste possible.
      const hidden = await importFixture(db, {
        publish: false,
        mutate: (raw) => {
          raw.id = "matiere-cachee";
          for (const chapter of raw.chapitres as { niveaux: Record<string, { id: string }[]> }[]) {
            for (const level of Object.values(chapter.niveaux))
              for (const q of level) q.id = `cachee-${q.id}`;
          }
        },
      });
      await asUser(db, admin);
      await db.query("select public.admin_set_chapter_premium($1, true)", [hidden.chapterId("methode")]);
      // L'inverse (ouvrir un contenu Premium à tous) est toujours permis.
      await db.query("select public.admin_set_chapter_premium($1, false)", [hidden.chapterId("methode")]);
      expect(subjectId).toBeTruthy();

      // Examens : même règle après publication.
      await asUser(db, admin);
      const exam = await db.query(
        `insert into public.mock_exams (subject_id, slug, title, question_count, duration_minutes, visible)
         values ($1, 'blanc', 'Examen blanc', 5, 30, true) returning id`,
        [subjectId],
      );
      expect(
        (await sqlError(db, "update public.mock_exams set premium = true where id = $1", [exam.rows[0].id]))
          ?.code,
      ).toBe("JQ403");
    }));

  it("le Premium n'est en vente qu'avec deux exclusivités disponibles", () =>
    inTransaction(async (db) => {
      await openSales(db);
      await asSuperuser(db);
      await db.query("update public.plans set on_sale = true where id = 'pass_annee_premium'");
      const available = async () => {
        await asAnon(db);
        return (
          await db.query("select available from public.pass_offers() where plan = 'pass_annee_premium'")
        ).rows[0].available as boolean;
      };
      expect(await available()).toBe(false);
      const { subjectId } = await importFixture(db, premiumMethode);
      await markRelue(db);
      expect(await available()).toBe(false);
      // Deuxième exclusivité : un examen blanc Premium publié.
      const admin = await createAdmin(db);
      await asUser(db, admin);
      await db.query(
        `insert into public.mock_exams (subject_id, slug, title, question_count, duration_minutes, premium, visible)
         values ($1, 'blanc-premium', 'Examen blanc Premium', 6, 30, true, true)`,
        [subjectId],
      );
      expect(await available()).toBe(true);
      await asAnon(db);
      const { rows } = await db.query("select kind, title from public.premium_exclusives() order by kind");
      expect(rows).toEqual([
        { kind: "chapitre", title: expect.any(String) },
        { kind: "examen", title: "Examen blanc Premium" },
      ]);
    }));

  it("passage au Premium : le Pass Année déjà payé est déduit", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const { subjectId } = await importFixture(db, premiumMethode);
      await markRelue(db);
      const admin = await createAdmin(db);
      await asUser(db, admin);
      await db.query(
        `insert into public.mock_exams (subject_id, slug, title, question_count, duration_minutes, premium, visible)
         values ($1, 'blanc-premium', 'Examen blanc Premium', 6, 30, true, true)`,
        [subjectId],
      );
      await asSuperuser(db);
      await db.query("update public.plans set on_sale = true where id = 'pass_annee_premium'");

      const student = await createUser(db);
      expect((await quote(db, student, "pass_annee_premium")).price_cents).toBe(3500);
      await buy(db, student, "pass_annee");
      const upgrade = await quote(db, student, "pass_annee_premium");
      expect(upgrade).toMatchObject({
        price_cents: 1000,
        discount_cents: 2500,
        discount_reason: "passage_premium",
      });
      expect(upgrade.covered).toBe(false);
      const order = await buy(db, student, "pass_annee_premium");
      expect(order.amount_cents).toBe(1000);
      expect((await quote(db, student, "pass_annee_premium")).covered).toBe(true);
      await asUser(db, student);
      expect((await db.query("select public.has_premium() as p")).rows[0].p).toBe(true);
      // Un testeur bêta a déjà tout : le Premium ne lui apporterait rien.
      const tester = await createTester(db);
      expect((await quote(db, tester, "pass_annee_premium")).covered).toBe(true);

      // Un Pass Année qui finit avant le Premium (année précédente) n'est pas déduit.
      const former = await createUser(db);
      const previous = await buy(db, former, "pass_annee");
      await asSuperuser(db);
      await db.query(
        "update public.entitlements set ends_at = now() + interval '20 days' where payment_id = $1",
        [previous.payment_id],
      );
      expect(await quote(db, former, "pass_annee_premium")).toMatchObject({
        price_cents: 3500,
        discount_cents: 0,
        discount_reason: null,
      });
    }));
});

describe("examens blancs chronométrés", () => {
  async function createExam(db: Db, subjectId: string, fields: Record<string, unknown> = {}) {
    const admin = await createAdmin(db);
    await asUser(db, admin);
    const values = {
      slug: "blanc",
      title: "Examen blanc",
      question_count: 6,
      duration_minutes: 30,
      visible: true,
      premium: false,
      ...fields,
    };
    const { rows } = await db.query(
      `insert into public.mock_exams (subject_id, slug, title, question_count, duration_minutes, visible, premium, levels)
       values ($1, $2, $3, $4, $5, $6, $7, '{facile,intermediaire,confirme}') returning id`,
      [
        subjectId,
        values.slug,
        values.title,
        values.question_count,
        values.duration_minutes,
        values.visible,
        values.premium,
      ],
    );
    return rows[0].id as string;
  }

  it("tire les questions, fixe l'échéance, reprend l'épreuve en cours et note la copie", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const examId = await createExam(db, subjectId);
      const tester = await createTester(db);
      await asUser(db, tester);
      const start = (await db.query("select public.start_mock_exam($1) as r", [examId])).rows[0].r;
      expect(start.resumed).toBe(false);
      const minutes = (Date.parse(start.deadline) - Date.now()) / 60_000;
      expect(minutes).toBeGreaterThan(29);
      expect(minutes).toBeLessThan(31);
      const again = (await db.query("select public.start_mock_exam($1) as r", [examId])).rows[0].r;
      expect(again).toMatchObject({ attempt_id: start.attempt_id, resumed: true });

      const { rows } = await db.query("select question_ids from public.exam_attempts where id = $1", [
        start.attempt_id,
      ]);
      const ids = rows[0].question_ids as string[];
      expect(ids).toHaveLength(6);
      expect(new Set(ids).size).toBe(6);
      await asSuperuser(db);
      const correct = await db.query("select id, correct_option from public.questions where id = any ($1)", [
        ids,
      ]);
      const answers = Object.fromEntries(correct.rows.slice(0, 4).map((row) => [row.id, row.correct_option]));
      answers["exemple-pas-dans-l-epreuve"] = "a";
      await asUser(db, tester);
      const result = (
        await db.query("select public.submit_mock_exam($1, $2::jsonb) as r", [
          start.attempt_id,
          JSON.stringify(answers),
        ])
      ).rows[0].r;
      expect(result).toMatchObject({ status: "ok", score: 4, total: 6, late: false });
      const twice = (
        await db.query("select public.submit_mock_exam($1, '{}'::jsonb) as r", [start.attempt_id])
      ).rows[0].r;
      expect(twice).toMatchObject({ status: "deja_rendu", score: 4 });

      // Copie rendue après l'échéance : notée, signalée hors délai.
      const late = (await db.query("select public.start_mock_exam($1) as r", [examId])).rows[0].r;
      await asSuperuser(db);
      await db.query(
        "update public.exam_attempts set started_at = now() - interval '1 hour', deadline = now() - interval '10 minutes' where id = $1",
        [late.attempt_id],
      );
      await asUser(db, tester);
      expect(
        (await db.query("select public.submit_mock_exam($1, '{}'::jsonb) as r", [late.attempt_id])).rows[0].r
          .late,
      ).toBe(true);

      // Une autre personne ne peut pas rendre cette copie.
      const other = await createTester(db);
      await asUser(db, other);
      expect(
        (await sqlError(db, "select public.submit_mock_exam($1, '{}'::jsonb)", [start.attempt_id]))?.code,
      ).toBe("P0002");
    }));

  it("respecte la visibilité des questions, les examens masqués et les examens Premium", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const examId = await createExam(db, subjectId);
      // Détenteur d'un pass : questions relues seulement ; ici aucune.
      const holder = await createUser(db);
      await grant(db, holder, "pass_mensuel");
      await asUser(db, holder);
      expect((await sqlError(db, "select public.start_mock_exam($1)", [examId]))?.code).toBe("JQ422");
      await markRelue(db);
      await asUser(db, holder);
      expect(
        (await db.query("select public.start_mock_exam($1) as r", [examId])).rows[0].r.attempt_id,
      ).toBeTruthy();

      const hiddenExam = await createExam(db, subjectId, { slug: "cache", visible: false });
      await asUser(db, holder);
      expect((await sqlError(db, "select public.start_mock_exam($1)", [hiddenExam]))?.code).toBe("P0002");
      const premiumExam = await createExam(db, subjectId, { slug: "premium", premium: true });
      await asUser(db, holder);
      expect((await sqlError(db, "select public.start_mock_exam($1)", [premiumExam]))?.code).toBe("JQ402");
      // Sans accès du tout : refus.
      const free = await createUser(db);
      await asUser(db, free);
      expect((await sqlError(db, "select public.start_mock_exam($1)", [examId]))?.code).toBe("42501");
      // Chacun ne voit que ses épreuves, administration comprise.
      expect((await db.query("select count(*)::int as n from public.exam_attempts")).rows[0].n).toBe(0);
      const admin = await createAdmin(db);
      await asUser(db, admin);
      expect((await db.query("select count(*)::int as n from public.exam_attempts")).rows[0].n).toBe(0);
    }));

  it("un examen publié ne se supprime pas, il se masque ; le lien Examens apparaît", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      const draft = await createExam(db, subjectId, { slug: "brouillon", visible: false });
      const published = await createExam(db, subjectId, { slug: "publie" });
      const admin = await createAdmin(db);
      await asUser(db, admin);
      expect((await db.query("delete from public.mock_exams where id = $1", [published])).rowCount).toBe(0);
      expect((await db.query("delete from public.mock_exams where id = $1", [draft])).rowCount).toBe(1);
      // Masqué puis remis : toujours publié, toujours pas supprimable.
      await db.query("update public.mock_exams set visible = false where id = $1", [published]);
      expect((await db.query("delete from public.mock_exams where id = $1", [published])).rowCount).toBe(0);

      // Examen proposé dans une matière visible : le lien « Examens » apparaît.
      await db.query("update public.mock_exams set visible = true where id = $1", [published]);
      const tester = await createTester(db);
      await asUser(db, tester);
      expect((await db.query("select public.viewer_context() ->> 'has_exams' as h")).rows[0].h).toBe("true");
    }));
});

describe("parrainage", () => {
  async function enableReferral(db: Db) {
    await asSuperuser(db);
    await db.query(
      "update public.settings set referral_enabled = true, referral_discount_cents = 200, referral_bonus_days = 7",
    );
  }

  async function codeOf(db: Db, userId: string) {
    await asUser(db, userId);
    return (await db.query("select public.my_referral_code() as c")).rows[0].c as string;
  }

  it("réduction sur le premier pass du filleul, jours offerts au parrain à la suite de son accès", () =>
    inTransaction(async (db) => {
      await openSales(db);
      await enableReferral(db);
      const referrer = await createUser(db);
      await buy(db, referrer, "pass_partiels");
      const code = await codeOf(db, referrer);
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(await codeOf(db, referrer)).toBe(code);
      await asAnon(db);
      expect(
        (await db.query("select public.referral_invitation($1) as r", [code.toLowerCase()])).rows[0].r,
      ).toEqual({
        valid: true,
        discount_cents: 200,
      });

      const referee = await createUser(db, { referral_code: code });
      const offer = await quote(db, referee, "pass_mensuel");
      expect(offer).toMatchObject({ price_cents: 700, discount_cents: 200, discount_reason: "parrainage" });
      const order = await buy(db, referee, "pass_mensuel");
      expect(order.amount_cents).toBe(700);
      expect(order.result.referral).toBe("ok");

      await asSuperuser(db);
      const bonus = await db.query(
        "select starts_at, ends_at from public.entitlements where user_id = $1 and source = 'parrainage'",
        [referrer],
      );
      // À la suite du Pass Partiels (fin des partiels de janvier), pour 7 jours.
      expect(new Date(bonus.rows[0].starts_at).toISOString()).toBe("2091-01-31T22:59:59.000Z");
      expect(new Date(bonus.rows[0].ends_at).toISOString()).toBe("2091-02-07T22:59:59.000Z");
      await asUser(db, referrer);
      expect((await db.query("select public.viewer_context() as c")).rows[0].c.access_ends_at).toMatch(
        /^2091-02-07/,
      );
      expect((await db.query("select public.my_referrals() as r")).rows[0].r).toEqual({
        invited: 1,
        rewarded: 1,
        bonus_days: 7,
      });

      // Second achat du filleul : plus de réduction.
      expect((await quote(db, referee, "pass_annee")).discount_cents).toBe(0);

      // Remboursement du premier achat : les jours offerts disparaissent.
      await asService(db);
      await db.query("select public.refund_payment($1)", [`pi_${order.payment_id}`]);
      await asUser(db, referrer);
      expect((await db.query("select public.viewer_context() as c")).rows[0].c.access_ends_at).toMatch(
        /^2091-01-31/,
      );
    }));

  it("pas d'invitation enregistrée quand le parrainage est fermé ; rien entre comptes d'un même appareil", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const referrer = await createUser(db);
      const code = await codeOf(db, referrer);
      const closed = await createUser(db, { referral_code: code });
      await asSuperuser(db);
      expect(
        (await db.query("select referred_by from public.profiles where id = $1", [closed])).rows[0]
          .referred_by,
      ).toBeNull();

      await enableReferral(db);
      const sameDevice = await createUser(db, { referral_code: code });
      const browser = crypto.randomUUID();
      for (const userId of [referrer, sameDevice]) {
        await asUser(db, userId);
        await db.query("select public.register_device($1, 'Chrome sur Android')", [browser]);
      }
      const order = await buy(db, sameDevice, "pass_mensuel");
      expect(order.amount_cents).toBe(700);
      expect(order.result.referral).toBe("meme_appareil");
      await asSuperuser(db);
      expect(
        (await db.query("select count(*)::int as n from public.entitlements where user_id = $1", [referrer]))
          .rows[0].n,
      ).toBe(0);
    }));
});

describe("nouveaux chapitres", () => {
  it("date de mise à disposition des chapitres publiés", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      await asAnon(db);
      const { rows } = await db.query("select chapter_id, available_at from public.chapter_news()");
      const news = new Map(rows.map((row) => [row.chapter_id, row.available_at]));
      expect(news.get(chapterId("decouverte"))).toBeTruthy();
      await asSuperuser(db);
      const published = await db.query("select published_at from public.chapters where id = $1", [
        chapterId("decouverte"),
      ]);
      expect(published.rows[0].published_at).not.toBeNull();
    }));

  it("une matière masquée n'a pas de nouveautés ; rendue visible, ses chapitres sont nouveaux", () =>
    inTransaction(async (db) => {
      const { subjectId, chapterId } = await importFixture(db, { publish: false });
      await db.query("update public.subjects set visible = false where id = $1", [subjectId]);
      await db.query("update public.chapters set published_at = null where subject_id = $1", [subjectId]);
      await db.query(
        "update public.questions set created_at = now() - interval '1 year' where chapter_id in (select id from public.chapters where subject_id = $1)",
        [subjectId],
      );
      const hidden = await db.query(
        "select count(*)::int as n from public.chapter_news() where chapter_id = $1",
        [chapterId("decouverte")],
      );
      expect(hidden.rows[0].n).toBe(0);
      await db.query("update public.subjects set visible = true where id = $1", [subjectId]);
      const { rows } = await db.query(
        "select available_at > now() - interval '1 minute' as recent from public.chapter_news() where chapter_id = $1",
        [chapterId("decouverte")],
      );
      expect(rows[0].recent).toBe(true);
    }));
});
