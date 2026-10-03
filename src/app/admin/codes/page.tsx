import type { Metadata } from "next";
import { setCodeDisabledAction } from "@/app/actions/admin";
import { SceneSetter } from "@/components/scene-setter";
import { formatDay, isPast } from "@/lib/dates";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { CreateCodesForm } from "./create-codes-form";

export const metadata: Metadata = { title: "Codes bêta" };

export default async function AdminCodesPage({ searchParams }: PageProps<"/admin/codes">) {
  const { nouveaux } = await searchParams;
  const created = typeof nouveaux === "string" && nouveaux ? nouveaux.split(",") : [];
  const supabase = await createClient();
  const { data: codes, error } = await supabase
    .from("beta_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <>
      <SceneSetter decor="chateau" />
      {created.length > 0 && (
        <section className="paper pad" aria-labelledby="nouveaux-codes">
          <h2 id="nouveaux-codes" style={{ marginTop: 0 }}>
            {created.length > 1 ? `${created.length} codes créés` : "Code créé"}
          </h2>
          <p className="help">
            À transmettre aux testeurs, par exemple avec le lien d&rsquo;inscription prérempli :
          </p>
          <ul>
            {created.map((code) => (
              <li key={code}>
                <code>{code}</code> · <code>{`${siteUrl()}/inscription?code=${code}`}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="paper pad">
        <h1 className="title small">Codes bêta</h1>
        <CreateCodesForm />
      </section>
      <section className="paper pad" aria-labelledby="liste-codes">
        <h2 id="liste-codes" style={{ marginTop: 0 }}>
          Codes existants
        </h2>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Libellé</th>
                <th scope="col">Utilisé</th>
                <th scope="col">Utilisable jusqu&rsquo;au</th>
                <th scope="col">Fin de l&rsquo;accès</th>
                <th scope="col">État</th>
              </tr>
            </thead>
            <tbody>
              {(codes ?? []).map((code) => {
                const expired = isPast(code.expires_at);
                const exhausted = code.uses >= code.uses_max;
                const state = code.disabled
                  ? "Désactivé"
                  : expired
                    ? "Expiré"
                    : exhausted
                      ? "Épuisé"
                      : "Actif";
                return (
                  <tr key={code.code}>
                    <td>
                      <code>{code.code}</code>
                    </td>
                    <td>{code.label}</td>
                    <td className="num-cell">
                      {code.uses} / {code.uses_max}
                    </td>
                    <td>{code.expires_at ? formatDay(code.expires_at) : "–"}</td>
                    <td>{code.access_ends_at ? formatDay(code.access_ends_at) : "Fin de la bêta"}</td>
                    <td>
                      <span className={`pill ${state === "Actif" ? "relue" : "a_corriger"}`}>{state}</span>
                      <form action={setCodeDisabledAction} style={{ marginTop: 6 }}>
                        <input type="hidden" name="code" value={code.code} />
                        <input type="hidden" name="disabled" value={code.disabled ? "false" : "true"} />
                        <button className="btn small" type="submit">
                          {code.disabled ? "Réactiver" : "Désactiver"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
