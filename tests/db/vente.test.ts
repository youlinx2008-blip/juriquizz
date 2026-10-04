import { describe, expect, it } from "vitest";
import {
  asAnon,
  asService,
  asSuperuser,
  asUser,
  createAdmin,
  createCode,
  createTester,
  createUser,
  importFixture,
  inTransaction,
  sqlError,
  type Db,
} from "./helpers";

/** Textes légaux complétés et dates de partiels : de quoi ouvrir la vente. */
async function openSales(db: Db) {
  await asSuperuser(db);
  await db.query("update public.legal_pages set body = replace(body, '[À COMPLÉTER', '[complété')");
  // Dates propres aux tests, quelles que soient celles déjà saisies en local.
  await db.query("delete from public.exam_sessions");
  await db.query(
    `insert into public.exam_sessions (academic_year, label, ends_at) values
       ('2090-2091', 'Partiels de janvier', '2091-01-31T22:59:59Z'),
       ('2090-2091', 'Partiels de mai', '2091-05-31T21:59:59Z'),
       ('2091-2092', 'Partiels de janvier', '2092-01-31T22:59:59Z')`,
  );
}

async function checkout(db: Db, userId: string, plan: string) {
  await asUser(db, userId);
  const { rows } = await db.query("select public.start_checkout($1::public.plan, true, true) as r", [plan]);
  const result = rows[0].r as { payment_id: string; amount_cents: number; ends_at: string };
  await db.query("select public.attach_checkout_session($1, $2)", [
    result.payment_id,
    `cs_test_${result.payment_id}`,
  ]);
  return result;
}

async function fulfill(db: Db, paymentId: string, amount: number, session = `cs_test_${paymentId}`) {
  await asService(db);
  const { rows } = await db.query("select public.fulfill_payment($1, $2, $3, $4, 'eur') as r", [
    paymentId,
    session,
    `pi_${paymentId}`,
    amount,
  ]);
  return rows[0].r as { status: string; ends_at: string };
}

describe("offres et dates de fin", () => {
  it("annonce une date de fin pour chaque pass, selon les partiels saisis", () =>
    inTransaction(async (db) => {
      await asSuperuser(db);
      await db.query("delete from public.exam_sessions");
      await asAnon(db);
      let offers = (await db.query("select plan, available, ends_at from public.pass_offers()")).rows;
      // Sans dates de partiels, seul le Pass Mensuel peut se vendre.
      expect(offers.map((o) => [o.plan, o.available])).toEqual([
        ["pass_mensuel", true],
        ["pass_partiels", false],
        ["pass_annee", false],
      ]);
      await openSales(db);
      await asAnon(db);
      offers = (await db.query("select plan, available, ends_at from public.pass_offers()")).rows;
      const byPlan = Object.fromEntries(offers.map((o) => [o.plan, o]));
      expect(new Date(byPlan.pass_partiels.ends_at).toISOString()).toBe("2091-01-31T22:59:59.000Z");
      expect(new Date(byPlan.pass_annee.ends_at).toISOString()).toBe("2091-05-31T21:59:59.000Z");
      const days = (Date.parse(byPlan.pass_mensuel.ends_at) - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);
    }));

  it("applique le prix de lancement jusqu'à la date prévue", () =>
    inTransaction(async (db) => {
      await openSales(db);
      await asAnon(db);
      const price = async () =>
        (await db.query("select price_cents from public.pass_offers() where plan = 'pass_partiels'")).rows[0]
          .price_cents;
      expect(await price()).toBe(1500);
      await asSuperuser(db);
      await db.query(
        "update public.plans set promo_until = now() + interval '14 days' where id = 'pass_partiels'",
      );
      await asAnon(db);
      expect(await price()).toBe(1200);
    }));
});

describe("achat d'un pass", () => {
  it("la vente reste fermée tant que les textes légaux sont à compléter", () =>
    inTransaction(async (db) => {
      await openSales(db);
      await db.query(
        "update public.legal_pages set body = body || ' [À COMPLÉTER : test]' where slug = 'cgv'",
      );
      const userId = await createUser(db);
      await asUser(db, userId);
      const error = await sqlError(db, "select public.start_checkout('pass_mensuel', true, true)");
      expect(error?.code).toBe("55000");
    }));

  it("exige l'acceptation des CGV et la renonciation au délai de rétractation", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const userId = await createUser(db);
      await asUser(db, userId);
      expect((await sqlError(db, "select public.start_checkout('pass_mensuel', true, false)"))?.code).toBe(
        "22023",
      );
      expect((await sqlError(db, "select public.start_checkout('pass_mensuel', false, true)"))?.code).toBe(
        "22023",
      );
    }));

  it("limite les tentatives de paiement en rafale", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const userId = await createUser(db);
      await asUser(db, userId);
      for (let i = 0; i < 10; i++) await db.query("select public.start_checkout('pass_mensuel', true, true)");
      expect((await sqlError(db, "select public.start_checkout('pass_mensuel', true, true)"))?.code).toBe(
        "54000",
      );
    }));

  it("ne vend pas un pass qui n'ajouterait aucun jour d'accès", () =>
    inTransaction(async (db) => {
      await openSales(db);
      // Accès bêta sans date de fin : aucun pass n'apporte rien de plus.
      const tester = await createTester(db);
      await asUser(db, tester);
      expect((await sqlError(db, "select public.start_checkout('pass_mensuel', true, true)"))?.code).toBe(
        "JQ409",
      );

      // Pass Année en cours : le Pass Partiels finirait avant lui ; l'inverse reste possible.
      const holder = await createUser(db);
      const order = await checkout(db, holder, "pass_annee");
      await fulfill(db, order.payment_id, 2500);
      await asUser(db, holder);
      expect((await sqlError(db, "select public.start_checkout('pass_partiels', true, true)"))?.code).toBe(
        "JQ409",
      );

      const monthly = await createUser(db);
      const first = await checkout(db, monthly, "pass_mensuel");
      await fulfill(db, first.payment_id, 900);
      const upgrade = await checkout(db, monthly, "pass_partiels");
      expect(upgrade.amount_cents).toBe(1500);
    }));

  it("un achat payé ouvre l'accès pour la bonne durée, une seule fois", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      await openSales(db);
      const userId = await createUser(db);
      const order = await checkout(db, userId, "pass_partiels");
      expect(order.amount_cents).toBe(1500);

      await asUser(db, userId);
      expect((await db.query("select public.has_access() as a")).rows[0].a).toBe(false);

      // Le montant payé doit être celui annoncé.
      await asService(db);
      expect(
        (
          await sqlError(db, "select public.fulfill_payment($1, $2, 'pi_x', 100, 'eur')", [
            order.payment_id,
            `cs_test_${order.payment_id}`,
          ])
        )?.code,
      ).toBe("22023");
      expect(
        (
          await sqlError(db, "select public.fulfill_payment($1, 'cs_autre', 'pi_x', 1500, 'eur')", [
            order.payment_id,
          ])
        )?.code,
      ).toBe("22023");

      const first = await fulfill(db, order.payment_id, 1500);
      expect(first.status).toBe("ok");
      expect(new Date(first.ends_at).toISOString()).toBe("2091-01-31T22:59:59.000Z");
      const again = await fulfill(db, order.payment_id, 1500);
      expect(again.status).toBe("deja_traite");

      await asSuperuser(db);
      const entitlements = await db.query(
        "select plan, source, ends_at from public.entitlements where user_id = $1",
        [userId],
      );
      expect(entitlements.rows).toHaveLength(1);
      expect(entitlements.rows[0]).toMatchObject({ plan: "pass_partiels", source: "stripe" });

      // Détenteur d'un pass (et non testeur bêta) : seulement les questions relues.
      await db.query(
        "update public.questions set review_status = 'relue' where id in ('exemple-decouverte-facile-01', 'exemple-methode-facile-01')",
      );
      await asUser(db, userId);
      expect((await db.query("select public.has_access() as a")).rows[0].a).toBe(true);
      const { rows } = await db.query(
        "select q.id from public.questions q join public.chapters c on c.id = q.chapter_id where c.subject_id = $1 order by q.id",
        [subjectId],
      );
      expect(rows.map((row) => row.id)).toEqual([
        "exemple-decouverte-facile-01",
        "exemple-methode-facile-01",
      ]);
    }));

  it("le Pass Mensuel dure 30 jours à partir du paiement", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const userId = await createUser(db);
      const order = await checkout(db, userId, "pass_mensuel");
      const result = await fulfill(db, order.payment_id, 900);
      const days = (Date.parse(result.ends_at) - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);
    }));

  it("un pass expiré ferme l'accès", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const userId = await createUser(db);
      const order = await checkout(db, userId, "pass_mensuel");
      await fulfill(db, order.payment_id, 900);
      await asSuperuser(db);
      await db.query(
        "update public.entitlements set starts_at = now() - interval '31 days', ends_at = now() - interval '1 day' where user_id = $1",
        [userId],
      );
      await asUser(db, userId);
      expect((await db.query("select public.has_access() as a")).rows[0].a).toBe(false);
      const context = (await db.query("select public.viewer_context() as c")).rows[0].c;
      expect(context.has_access).toBe(false);
      expect(context.last_ended_at).not.toBeNull();
    }));

  it("un remboursement ferme l'accès aussitôt", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const userId = await createUser(db);
      const order = await checkout(db, userId, "pass_mensuel");
      await fulfill(db, order.payment_id, 900);
      // Même dans la seconde du paiement (ici, la même transaction), l'accès se ferme.
      await asService(db);
      await db.query("select public.refund_payment($1)", [`pi_${order.payment_id}`]);
      await asUser(db, userId);
      expect((await db.query("select public.has_access() as a")).rows[0].a).toBe(false);
      await asSuperuser(db);
      const payment = await db.query("select status from public.payments where id = $1", [order.payment_id]);
      expect(payment.rows[0].status).toBe("rembourse");
    }));

  it("l'administration liste les achats avec l'adresse de l'acheteur", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const buyer = await createUser(db);
      const order = await checkout(db, buyer, "pass_mensuel");
      await fulfill(db, order.payment_id, 900);
      await asUser(db, buyer);
      expect((await sqlError(db, "select * from public.admin_payments()"))?.code).toBe("42501");
      const admin = await createAdmin(db);
      await asUser(db, admin);
      const { rows } = await db.query("select * from public.admin_payments() where payment_id = $1", [
        order.payment_id,
      ]);
      expect(rows[0]).toMatchObject({ plan: "pass_mensuel", status: "paye", amount_cents: 900 });
      expect(rows[0].email).toMatch(/@example\.com$/);
      expect(rows[0].ends_at).not.toBeNull();
    }));

  it("seul le serveur confirme un paiement ; chacun ne voit que ses achats", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const alice = await createUser(db);
      const bob = await createUser(db);
      const order = await checkout(db, alice, "pass_mensuel");
      await asUser(db, alice);
      expect(
        (
          await sqlError(db, "select public.fulfill_payment($1, $2, 'pi', 900, 'eur')", [
            order.payment_id,
            `cs_test_${order.payment_id}`,
          ])
        )?.code,
      ).toBe("42501");
      await asUser(db, bob);
      expect((await db.query("select id from public.payments")).rowCount).toBe(0);
      expect(
        (await sqlError(db, "select public.attach_checkout_session($1, 'cs_vol')", [order.payment_id]))?.code,
      ).toBe("P0002");
      await asUser(db, alice);
      expect((await db.query("select id from public.payments")).rowCount).toBe(1);
    }));

  it("un achat survit à la suppression du compte (obligation comptable)", () =>
    inTransaction(async (db) => {
      await openSales(db);
      const userId = await createUser(db);
      const order = await checkout(db, userId, "pass_mensuel");
      await fulfill(db, order.payment_id, 900);
      await asUser(db, userId);
      await db.query("select public.delete_my_account()");
      await asSuperuser(db);
      const { rows } = await db.query("select user_id, status from public.payments where id = $1", [
        order.payment_id,
      ]);
      expect(rows[0]).toEqual({ user_id: null, status: "paye" });
    }));
});

describe("appareils connectés", () => {
  const key = () => crypto.randomUUID();
  const register = async (db: Db, browser: string, label = "Chrome sur Android") =>
    (await db.query("select public.register_device($1, $2) as s", [browser, label])).rows[0].s as string;
  const status = async (db: Db, browser: string) =>
    (await db.query("select public.check_device($1) as s", [browser])).rows[0].s as string;
  /** Dans une transaction, now() ne bouge pas : on date les connexions à la main. */
  async function age(db: Db, userId: string, browser: string, minutes: number) {
    await asSuperuser(db);
    await db.query(
      "update public.device_sessions set created_at = now() - make_interval(mins => $3) where user_id = $1 and browser_key = $2",
      [userId, browser, minutes],
    );
    await asUser(db, userId);
  }

  it("deux appareils au plus : le plus ancien est déconnecté, et peut se reconnecter", () =>
    inTransaction(async (db) => {
      const userId = await createUser(db);
      const [first, second, third] = [key(), key(), key()];
      await asUser(db, userId);
      await register(db, first);
      await age(db, userId, first, 3);
      await register(db, second);
      await age(db, userId, second, 2);
      // Même navigateur et même libellé : toujours le même appareil, quel que soit le délai.
      await register(db, third);
      expect(await status(db, first)).toBe("revoque");
      expect(await status(db, second)).toBe("actif");
      expect(await status(db, third)).toBe("actif");

      // Reconnexion du premier : il redevient le plus récent, le deuxième est déconnecté.
      await age(db, userId, third, 1);
      await register(db, first);
      expect(await status(db, first)).toBe("actif");
      expect(await status(db, second)).toBe("revoque");
      expect(await status(db, third)).toBe("actif");

      // Un navigateur jamais connecté à ce compte est inconnu.
      const other = await createUser(db);
      await asUser(db, other);
      expect(await status(db, third)).toBe("inconnu");
    }));

  it("un même navigateur ne compte qu'une fois", () =>
    inTransaction(async (db) => {
      const userId = await createUser(db);
      const browser = key();
      await asUser(db, userId);
      await register(db, browser);
      await register(db, browser);
      await register(db, browser, "Chrome sur Android (mis à jour)");
      const { rows } = await db.query("select label from public.device_sessions where user_id = $1", [
        userId,
      ]);
      expect(rows).toEqual([{ label: "Chrome sur Android (mis à jour)" }]);
    }));

  it("l'administration n'est pas limitée", () =>
    inTransaction(async (db) => {
      const admin = await createAdmin(db);
      await asUser(db, admin);
      const browsers = [key(), key(), key(), key()];
      for (const browser of browsers) await register(db, browser);
      for (const browser of browsers) expect(await status(db, browser)).toBe("actif");
    }));
});

describe("cours en PDF", () => {
  async function addDocument(db: Db, chapterId: string) {
    await asSuperuser(db);
    const { rows } = await db.query(
      "insert into public.course_documents (chapter_id, storage_path, title, page_count, file_size) values ($1, 'x/cours.pdf', 'Cours', 12, 1000) returning id",
      [chapterId],
    );
    return rows[0].id as string;
  }

  it("la lecture demande un accès valide et une matière publiée", () =>
    inTransaction(async (db) => {
      const { chapterId, subjectId } = await importFixture(db);
      const documentId = await addDocument(db, chapterId("decouverte"));
      const stranger = await createUser(db);
      await asUser(db, stranger);
      expect((await sqlError(db, "select public.authorize_pdf_view($1)", [documentId]))?.code).toBe("42501");
      const tester = await createTester(db);
      await asUser(db, tester);
      // Le nom imprimé en filigrane est demandé avant la première lecture.
      expect((await sqlError(db, "select public.authorize_pdf_view($1)", [documentId]))?.code).toBe("JQ428");
      await db.query("update public.profiles set full_name = 'Élodie Dupré' where id = $1", [tester]);
      const { rows } = await db.query("select public.authorize_pdf_view($1) as r", [documentId]);
      expect(rows[0].r).toMatchObject({ storage_path: "x/cours.pdf", full_name: "Élodie Dupré" });
      expect(rows[0].r.email).toMatch(/@example\.com$/);
      await asSuperuser(db);
      await db.query("update public.subjects set visible = false where id = $1", [subjectId]);
      await asUser(db, tester);
      expect((await sqlError(db, "select public.authorize_pdf_view($1)", [documentId]))?.code).toBe("P0002");
    }));

  it("limite les consultations à 40 par jour", () =>
    inTransaction(async (db) => {
      const { chapterId } = await importFixture(db);
      const documentId = await addDocument(db, chapterId("decouverte"));
      const tester = await createTester(db);
      await asSuperuser(db);
      await db.query("update public.profiles set full_name = 'Élodie Dupré' where id = $1", [tester]);
      await db.query(
        "insert into public.pdf_views (user_id, document_id) select $1, $2 from generate_series(1, 40)",
        [tester, documentId],
      );
      await asUser(db, tester);
      expect((await sqlError(db, "select public.authorize_pdf_view($1)", [documentId]))?.code).toBe("54000");
    }));

  it("seule l'administration dépose des fichiers dans le stockage privé", () =>
    inTransaction(async (db) => {
      const tester = await createTester(db);
      const admin = await createAdmin(db);
      await asUser(db, tester);
      expect(
        (await sqlError(db, "insert into storage.objects (bucket_id, name) values ('cours', 'piege.pdf')"))
          ?.code,
      ).toBe("42501");
      expect((await db.query("select name from storage.objects where bucket_id = 'cours'")).rowCount).toBe(0);
      await asUser(db, admin);
      expect(
        await sqlError(db, "insert into storage.objects (bucket_id, name) values ('cours', 'admin.pdf')"),
      ).toBeNull();
    }));
});

describe("démonstration, textes légaux, bêta", () => {
  it("un compte sans pass voit les questions de démonstration relues, et elles seules", () =>
    inTransaction(async (db) => {
      const { subjectId } = await importFixture(db);
      await asSuperuser(db);
      await db.query(
        "update public.questions set demo = true where id in ('exemple-decouverte-facile-01', 'exemple-decouverte-facile-02')",
      );
      await db.query(
        "update public.questions set review_status = 'relue' where id = 'exemple-decouverte-facile-01'",
      );
      const userId = await createUser(db);
      await asUser(db, userId);
      const { rows } = await db.query(
        "select q.id from public.questions q join public.chapters c on c.id = q.chapter_id where c.subject_id = $1",
        [subjectId],
      );
      expect(rows.map((row) => row.id)).toEqual(["exemple-decouverte-facile-01"]);
      await asAnon(db);
      expect((await sqlError(db, "select id from public.questions"))?.code).toBe("42501");
    }));

  it("chaque modification d'un texte légal crée une version, conservée", () =>
    inTransaction(async (db) => {
      const admin = await createAdmin(db);
      const tester = await createTester(db);
      await asUser(db, tester);
      expect(
        (await sqlError(db, "select public.admin_update_legal_page('cgv', 'CGV', 'texte pirate')"))?.code,
      ).toBe("42501");
      await asUser(db, admin);
      const before = (await db.query("select version from public.legal_pages where slug = 'cgv'")).rows[0]
        .version;
      const { rows } = await db.query(
        "select public.admin_update_legal_page('cgv', 'CGV', 'Nouveau texte') as v",
      );
      expect(rows[0].v).toBe(before + 1);
      const history = await db.query(
        "select version, body from public.legal_page_versions where slug = 'cgv' order by version",
      );
      expect(history.rows.at(-1)).toEqual({ version: before + 1, body: "Nouveau texte" });
      expect(history.rows).toHaveLength(before + 1);
    }));

  it("l'inscription retient la version des CGU acceptée", () =>
    inTransaction(async (db) => {
      await asSuperuser(db);
      const version = (await db.query("select version from public.legal_pages where slug = 'cgu'")).rows[0]
        .version;
      const userId = await createUser(db, { terms_version: String(version) });
      await asSuperuser(db);
      const { rows } = await db.query(
        "select terms_version, terms_accepted_at is not null as dated from public.profiles where id = $1",
        [userId],
      );
      expect(rows[0]).toEqual({ terms_version: version, dated: true });
    }));

  it("fixer la fin de la bêta arrête tous les accès bêta à cette date", () =>
    inTransaction(async (db) => {
      const tester = await createTester(db);
      const admin = await createAdmin(db);
      await asUser(db, admin);
      const { rows } = await db.query("select public.admin_set_beta_end('2090-06-30T21:59:59Z') as n");
      expect(rows[0].n).toBeGreaterThanOrEqual(1);
      await asSuperuser(db);
      const entitlement = await db.query("select ends_at from public.entitlements where user_id = $1", [
        tester,
      ]);
      expect(new Date(entitlement.rows[0].ends_at).toISOString()).toBe("2090-06-30T21:59:59.000Z");

      // Un code créé ensuite, sans date de fin, s'arrête lui aussi à la fin de la bêta.
      await createCode(db, "APRES-COUP");
      const late = await createUser(db, { beta_code: "APRES-COUP" });
      await asSuperuser(db);
      const lateAccess = await db.query("select ends_at from public.entitlements where user_id = $1", [late]);
      expect(new Date(lateAccess.rows[0].ends_at).toISOString()).toBe("2090-06-30T21:59:59.000Z");

      // Bêta terminée : les codes ne servent plus.
      await db.query("update public.settings set beta_ends_at = now() - interval '1 day'");
      await asAnon(db);
      expect((await db.query("select public.check_beta_code('APRES-COUP') as s")).rows[0].s).toBe("expire");
    }));
});
