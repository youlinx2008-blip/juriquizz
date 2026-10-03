/**
 * Donne (ou retire) le rôle d'administrateur à un compte existant.
 *
 *   npm run admin:add -- prenom.nom@example.com [--retirer]
 */
import { createServiceClient, parseArgs } from "./lib/service-client";

async function main() {
  const { files: emails, flags } = parseArgs(process.argv.slice(2));
  if (emails.length !== 1) {
    console.error("Usage : npm run admin:add -- <email> [--retirer]");
    process.exit(2);
  }
  const email = emails[0].trim().toLowerCase();
  const client = createServiceClient();

  let userId: string | null = null;
  for (let page = 1; !userId; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    userId = data.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null;
    if (data.users.length < 200) break;
  }
  if (!userId) throw new Error(`Aucun compte pour ${email}. Créez d'abord le compte depuis le site.`);

  if (flags.has("retirer")) {
    const { error } = await client.from("admins").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    console.log(`${email} n'est plus administrateur.`);
  } else {
    const { error } = await client.from("admins").upsert({ user_id: userId });
    if (error) throw new Error(error.message);
    console.log(`${email} est maintenant administrateur.`);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
