import { createServiceClient } from "../../scripts/lib/service-client";
import { run } from "./support";

/** Efface ce que les tests ont créé et rétablit ce qu'ils ont modifié : la base locale reste propre. */
export default async function globalTeardown() {
  const client = createServiceClient();
  const data = run();
  const marker = `e2e-${data.runId.toLowerCase()}-`;
  const testUsers: string[] = [];
  for (let page = 1; ; page++) {
    const { data: list, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const user of list.users) if (user.email?.startsWith(marker)) testUsers.push(user.id);
    if (list.users.length < 200) break;
  }
  // Les achats survivent à la suppression d'un compte (obligation comptable) : ceux des tests sont effacés.
  if (testUsers.length) await client.from("payments").delete().in("user_id", testUsers);
  for (const id of testUsers) await client.auth.admin.deleteUser(id);

  await client.from("beta_codes").delete().like("code", `E2E-${data.runId}%`);
  await client.from("beta_codes").delete().like("label", `e2e ${data.runId}%`);
  if (data.restore.storagePaths.length) await client.storage.from("cours").remove(data.restore.storagePaths);
  if (data.createdSubjects.length) await client.from("subjects").delete().in("id", data.createdSubjects);

  for (const page of data.restore.legalPages) {
    await client.from("legal_pages").update({ body: page.body }).eq("slug", page.slug);
  }
  if (data.restore.examSessionIds.length) {
    await client.from("exam_sessions").delete().in("id", data.restore.examSessionIds);
  }
  for (const plan of data.restore.plans) {
    await client.from("plans").update({ on_sale: plan.on_sale }).eq("id", plan.id);
  }
}
