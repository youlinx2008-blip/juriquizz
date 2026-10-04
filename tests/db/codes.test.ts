import { describe, expect, it } from "vitest";
import { asAnon, asSuperuser, asUser, createCode, createUser, inTransaction, sqlError } from "./helpers";

async function betaEntitlements(db: Parameters<Parameters<typeof inTransaction>[0]>[0], userId: string) {
  await asSuperuser(db);
  const { rows } = await db.query(
    "select plan, beta_code, ends_at from public.entitlements where user_id = $1",
    [userId],
  );
  return rows;
}

describe("codes bêta", () => {
  it("l'inscription avec un code valide ouvre l'accès bêta et crée le profil", () =>
    inTransaction(async (db) => {
      await createCode(db, "JQ-ABCD-EFGH", { usesMax: 2 });
      const userId = await createUser(db, { beta_code: " jq-abcd-efgh ", display_name: "Camille" });
      expect(await betaEntitlements(db, userId)).toEqual([
        { plan: "beta", beta_code: "JQ-ABCD-EFGH", ends_at: null },
      ]);
      const profile = await db.query("select display_name from public.profiles where id = $1", [userId]);
      expect(profile.rows[0].display_name).toBe("Camille");
      const code = await db.query("select uses from public.beta_codes where code = 'JQ-ABCD-EFGH'");
      expect(code.rows[0].uses).toBe(1);
    }));

  it("un code refusé ne bloque pas l'inscription : le compte existe, sans accès", () =>
    inTransaction(async (db) => {
      const userId = await createUser(db, { beta_code: "INEXISTANT" });
      expect(await betaEntitlements(db, userId)).toEqual([]);
      const profile = await db.query("select id from public.profiles where id = $1", [userId]);
      expect(profile.rowCount).toBe(1);
    }));

  it("respecte le nombre d'utilisations, l'expiration et la désactivation", () =>
    inTransaction(async (db) => {
      await createCode(db, "UNE-SEULE-FOIS", { usesMax: 1 });
      await createCode(db, "TROP-TARD", { expiresAt: "2020-01-01T00:00:00Z" });
      await createCode(db, "ACCES-FINI", { accessEndsAt: "2020-01-01T00:00:00Z" });
      await createCode(db, "DESACTIVE", { disabled: true });
      const first = await createUser(db);
      const second = await createUser(db);
      await asUser(db, first);
      const redeem = async (code: string) =>
        (await db.query("select public.redeem_beta_code($1) as result", [code])).rows[0].result;
      expect(await redeem("TROP-TARD")).toBe("expire");
      expect(await redeem("ACCES-FINI")).toBe("expire");
      expect(await redeem("DESACTIVE")).toBe("invalide");
      expect(await redeem("NIMPORTEQUOI")).toBe("invalide");
      expect(await redeem("une-seule-fois")).toBe("ok");
      expect(await redeem("UNE-SEULE-FOIS")).toBe("deja_actif");
      await asUser(db, second);
      expect(await redeem("UNE-SEULE-FOIS")).toBe("epuise");
      await asSuperuser(db);
      const uses = await db.query("select uses from public.beta_codes where code = 'UNE-SEULE-FOIS'");
      expect(uses.rows[0].uses).toBe(1);
    }));

  it("la date de fin d'accès du code est reportée sur l'accès accordé", () =>
    inTransaction(async (db) => {
      await createCode(db, "FIN-JANVIER", { accessEndsAt: "2099-01-31T22:59:59Z" });
      const userId = await createUser(db, { beta_code: "FIN-JANVIER" });
      const [entitlement] = await betaEntitlements(db, userId);
      expect(new Date(entitlement.ends_at).toISOString()).toBe("2099-01-31T22:59:59.000Z");
    }));

  it("un visiteur peut vérifier un code sans le consommer, mais pas lister les codes", () =>
    inTransaction(async (db) => {
      await createCode(db, "VERIF-SEULE", { usesMax: 1 });
      await asAnon(db);
      const { rows } = await db.query("select public.check_beta_code('verif-seule') as status");
      expect(rows[0].status).toBe("ok");
      expect((await sqlError(db, "select code from public.beta_codes"))?.code).toBe("42501");
      await asSuperuser(db);
      const uses = await db.query("select uses from public.beta_codes where code = 'VERIF-SEULE'");
      expect(uses.rows[0].uses).toBe(0);
    }));

  it("refuse l'utilisation d'un code sans être connecté", () =>
    inTransaction(async (db) => {
      await createCode(db, "SANS-COMPTE");
      await asAnon(db);
      expect((await sqlError(db, "select public.redeem_beta_code('SANS-COMPTE')"))?.code).toBe("42501");
    }));
});
