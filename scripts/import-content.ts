/**
 * Importe un ou plusieurs fichiers de contenu en base.
 *
 *   npm run content:import -- content/questions.json [--publier] [--essai]
 *
 * --publier : rend la matière visible (une nouvelle matière est masquée par défaut).
 * --essai   : valide le fichier sans rien écrire.
 */
import { createServiceClient, parseArgs } from "./lib/service-client";
import { describePayload, loadContentFile } from "./lib/load-content";

async function main() {
  const { files, flags } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error("Usage : npm run content:import -- <fichier.json> [--publier] [--essai]");
    process.exit(2);
  }

  const dryRun = flags.has("essai");
  const client = dryRun ? null : createServiceClient();

  for (const file of files) {
    const { payload, warnings } = loadContentFile(file);
    console.log(describePayload(payload));
    for (const warning of warnings) console.warn(`  attention : ${warning.path} : ${warning.message}`);
    if (!client) {
      console.log("  Fichier valide (essai : rien n'a été écrit).");
      continue;
    }

    const { data, error } = await client.rpc("import_subject", {
      p_payload: payload,
      p_publish: flags.has("publier"),
    });
    if (error) throw new Error(`Import refusé : ${error.message}`);

    const report = data as Record<string, unknown>;
    console.log(
      `  Import terminé : ${report.inserted} ajoutées, ${report.updated} modifiées (relecture remise à zéro), ` +
        `${report.moved} déplacées, ${report.unchanged} inchangées, ${report.retired} retirées.`,
    );
    console.log(`  Matière ${report.visible ? "visible" : "masquée (publiez-la depuis l'administration)"}.`);
    const absent = report.chapters_absent_from_file as string[];
    if (absent.length) {
      console.warn(`  Chapitres en base absents du fichier (laissés tels quels) : ${absent.join(", ")}`);
    }
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
