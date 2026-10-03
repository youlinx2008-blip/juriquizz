import { createServiceClient } from "../../scripts/lib/service-client";
import { run } from "./support";

/** Efface les comptes, codes et matières créés pour les tests : la base locale reste propre. */
export default async function globalTeardown() {
  const client = createServiceClient();
  const data = run();
  const marker = `e2e-${data.runId.toLowerCase()}-`;
  for (let page = 1; ; page++) {
    const { data: list, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const user of list.users) {
      if (user.email?.startsWith(marker)) await client.auth.admin.deleteUser(user.id);
    }
    if (list.users.length < 200) break;
  }
  await client.from("beta_codes").delete().like("code", `E2E-${data.runId}%`);
  await client.from("beta_codes").delete().like("label", `e2e ${data.runId}%`);
  if (data.createdSubjects.length) await client.from("subjects").delete().in("id", data.createdSubjects);
}
