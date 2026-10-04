"use client";

import Link from "next/link";
import { useActionState } from "react";
import { startCheckoutAction, type CheckoutState } from "@/app/actions/checkout";
import { FieldError, invalidProps } from "@/components/forms/field-error";
import type { PassPlan } from "@/lib/plans";

export function OrderForm({ plan, priceLabel }: { plan: PassPlan; priceLabel: string }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckoutAction, {
    status: "idle",
  });
  const fields = state.status === "error" ? (state.fields ?? {}) : {};
  return (
    <form className="form" action={action} noValidate>
      <input type="hidden" name="plan" value={plan} />
      {state.status === "error" && (
        <p className="notice bad" role="alert">
          {state.message}
        </p>
      )}
      <div className="consents">
        <div>
          <label>
            <input
              type="checkbox"
              name="acceptCgv"
              required
              {...invalidProps("acceptCgv-error", fields.acceptCgv)}
            />
            <span>
              J&rsquo;ai lu et j&rsquo;accepte les{" "}
              <Link href="/cgv" target="_blank" rel="noopener">
                conditions générales de vente
              </Link>
              .
            </span>
          </label>
          <FieldError id="acceptCgv-error" message={fields.acceptCgv} />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              name="waiveWithdrawal"
              required
              {...invalidProps("waiveWithdrawal-error", fields.waiveWithdrawal)}
            />
            <span>
              Je demande l&rsquo;accès immédiat au contenu, dès le paiement, et je renonce expressément à mon
              droit de rétractation de 14 jours (article L221-28, 13°, du Code de la consommation).
            </span>
          </label>
          <FieldError id="waiveWithdrawal-error" message={fields.waiveWithdrawal} />
        </div>
      </div>
      <div className="actions">
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Ouverture du paiement…" : `Payer ${priceLabel}`}
        </button>
      </div>
      <p className="fine">
        Tu vas être redirigé vers la page de paiement sécurisée de Stripe. JuriQuizz ne voit jamais ta carte
        bancaire.
      </p>
    </form>
  );
}
