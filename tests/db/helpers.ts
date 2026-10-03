/*
 * Outils des tests de la base : chaque test s'exécute dans une transaction annulée à la fin,
 * avec le rôle et l'identité choisis (comme le ferait l'API de Supabase).
 * Prérequis : `npx supabase start` (base locale sur le port 54322).
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { afterAll } from "vitest";
import { toImportPayload } from "@/lib/content/payload";
import { validateSource } from "@/lib/content/source";

const DB_URL = process.env.SUPABASE_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const pool = new pg.Pool({ connectionString: DB_URL, max: 2 });
afterAll(async () => {
  await pool.end();
});

export type Db = pg.PoolClient;

/** Exécute fn dans une transaction toujours annulée : la base locale reste intacte. */
export async function inTransaction(fn: (db: Db) => Promise<void>): Promise<void> {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await fn(db);
  } finally {
    await db.query("rollback");
    db.release();
  }
}

export async function asSuperuser(db: Db): Promise<void> {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', '', true)");
}

export async function asAnon(db: Db): Promise<void> {
  await db.query("reset role");
  await db.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
  await db.query("set local role anon");
}

export async function asUser(db: Db, userId: string): Promise<void> {
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  await db.query("set local role authenticated");
}

export async function asService(db: Db): Promise<void> {
  await db.query("reset role");
  await db.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
  await db.query("set local role service_role");
}

let counter = 0;

/** Crée un compte (comme une inscription) ; le déclencheur crée le profil et applique le code. */
export async function createUser(db: Db, metadata: Record<string, string> = {}): Promise<string> {
  await asSuperuser(db);
  counter += 1;
  const email = `test-${Date.now()}-${counter}@example.com`;
  const { rows } = await db.query(
    `insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
     values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', $1, $2, now(), now())
     returning id`,
    [email, JSON.stringify(metadata)],
  );
  return rows[0].id as string;
}

export async function createCode(
  db: Db,
  code: string,
  options: {
    usesMax?: number;
    expiresAt?: string | null;
    accessEndsAt?: string | null;
    disabled?: boolean;
  } = {},
): Promise<void> {
  await asSuperuser(db);
  await db.query(
    `insert into public.beta_codes (code, uses_max, expires_at, access_ends_at, disabled) values ($1, $2, $3, $4, $5)`,
    [
      code,
      options.usesMax ?? 10,
      options.expiresAt ?? null,
      options.accessEndsAt ?? null,
      options.disabled ?? false,
    ],
  );
}

/** Utilisateur avec accès bêta. */
export async function createTester(db: Db): Promise<string> {
  counter += 1;
  const code = `T${Date.now()}${counter}`.toUpperCase();
  await createCode(db, code);
  return createUser(db, { beta_code: code });
}

export async function createAdmin(db: Db): Promise<string> {
  const id = await createUser(db);
  await asSuperuser(db);
  await db.query("insert into public.admins (user_id) values ($1)", [id]);
  return id;
}

export function fixturePayload(mutate?: (raw: Record<string, unknown>) => void) {
  const raw = JSON.parse(readFileSync("tests/fixtures/matiere-exemple.json", "utf8"));
  mutate?.(raw);
  const result = validateSource(raw);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return toImportPayload(result.subject);
}

/** Importe la matière d'exemple (publiée) et renvoie ses identifiants utiles. */
export async function importFixture(
  db: Db,
  options: { publish?: boolean; mutate?: (raw: Record<string, unknown>) => void } = {},
) {
  await asService(db);
  const { rows } = await db.query("select public.import_subject($1::jsonb, $2) as report", [
    JSON.stringify(fixturePayload(options.mutate)),
    options.publish ?? true,
  ]);
  const report = rows[0].report as Record<string, unknown>;
  await asSuperuser(db);
  const chapters = await db.query(
    "select id, slug from public.chapters where subject_id = $1 order by position",
    [report.subject_id],
  );
  return {
    report,
    subjectId: report.subject_id as string,
    chapterId: (slug: string) => chapters.rows.find((row) => row.slug === slug)!.id as string,
  };
}

/** Message d'erreur SQL attendu, ou null si la requête réussit. */
export async function sqlError(
  db: Db,
  sql: string,
  params: unknown[] = [],
): Promise<{ code: string; message: string } | null> {
  await db.query("savepoint attempt");
  try {
    await db.query(sql, params);
    await db.query("release savepoint attempt");
    return null;
  } catch (error) {
    await db.query("rollback to savepoint attempt");
    const e = error as { code: string; message: string };
    return { code: e.code, message: e.message };
  }
}
