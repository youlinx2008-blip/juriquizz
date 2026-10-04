"use client";

import { useActionState, useId } from "react";
import type { AdminFormState } from "@/app/actions/admin";
import {
  addExamSessionAction,
  setBetaEndAction,
  updateGrowthSettingsAction,
  updateLegalPageAction,
  updatePlanAction,
} from "@/app/actions/admin-vente";

function Status({ state }: { state: AdminFormState }) {
  if (state.status === "idle") return null;
  return (
    <p
      className={`notice ${state.status === "ok" ? "good" : "bad"}`}
      role={state.status === "ok" ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

export type PlanFields = {
  plan: string;
  label: string;
  description: string;
  price: string;
  promoPrice: string;
  promoUntil: string;
  onSale: boolean;
  duration: string;
};

export function PlanForm({ plan }: { plan: PlanFields }) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updatePlanAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <input type="hidden" name="plan" value={plan.plan} />
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor={`${id}-label`}>Nom</label>
          <input
            id={`${id}-label`}
            name="label"
            type="text"
            maxLength={60}
            defaultValue={plan.label}
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 140 }}>
          <label htmlFor={`${id}-price`}>Prix (€ TTC)</label>
          <input
            id={`${id}-price`}
            name="price"
            type="text"
            inputMode="decimal"
            defaultValue={plan.price}
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 160 }}>
          <label htmlFor={`${id}-promo`}>Prix de lancement</label>
          <input
            id={`${id}-promo`}
            name="promoPrice"
            type="text"
            inputMode="decimal"
            defaultValue={plan.promoPrice}
          />
        </div>
        <div className="field" style={{ maxWidth: 190 }}>
          <label htmlFor={`${id}-until`}>Jusqu&rsquo;au (inclus)</label>
          <input id={`${id}-until`} name="promoUntil" type="date" defaultValue={plan.promoUntil} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea
          id={`${id}-description`}
          name="description"
          rows={2}
          maxLength={300}
          defaultValue={plan.description}
        />
        <p className="help">Durée : {plan.duration}.</p>
      </div>
      <div className="radios">
        <label>
          <input type="checkbox" name="onSale" defaultChecked={plan.onSale} />
          En vente
        </label>
      </div>
      <Status state={state} />
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          Enregistrer l&rsquo;offre
        </button>
      </div>
    </form>
  );
}

export function ExamSessionForm({ defaultYear }: { defaultYear: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(addExamSessionAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field" style={{ maxWidth: 170 }}>
          <label htmlFor={`${id}-year`}>Année universitaire</label>
          <input id={`${id}-year`} name="academicYear" type="text" defaultValue={defaultYear} required />
        </div>
        <div className="field">
          <label htmlFor={`${id}-label`}>Libellé</label>
          <input
            id={`${id}-label`}
            name="label"
            type="text"
            maxLength={80}
            placeholder="Partiels de janvier"
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 190 }}>
          <label htmlFor={`${id}-end`}>Dernier jour des partiels</label>
          <input id={`${id}-end`} name="endsOn" type="date" required />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          Ajouter
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function BetaEndForm({ current }: { current: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(setBetaEndAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor={`${id}-end`}>Dernier jour de la bêta</label>
          <input id={`${id}-end`} name="betaEnd" type="date" defaultValue={current} required />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          Enregistrer
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}

export function LegalPageForm({ slug, title, body }: { slug: string; title: string; body: string }) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateLegalPageAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <input type="hidden" name="slug" value={slug} />
      <div className="field">
        <label htmlFor={`${id}-title`}>Titre</label>
        <input id={`${id}-title`} name="title" type="text" maxLength={120} defaultValue={title} required />
      </div>
      <div className="field">
        <label htmlFor={`${id}-body`}>Texte (Markdown : « ## » pour un titre, « - » pour une liste)</label>
        <textarea id={`${id}-body`} name="body" rows={18} defaultValue={body} required className="mono" />
      </div>
      <Status state={state} />
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          Enregistrer une nouvelle version
        </button>
      </div>
    </form>
  );
}

export type GrowthSettings = {
  levelsUnlock: boolean;
  referralEnabled: boolean;
  referralDiscount: string;
  referralBonusDays: number;
  referralMaxPerYear: number;
};

export function GrowthSettingsForm({ settings }: { settings: GrowthSettings }) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateGrowthSettingsAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <fieldset className="field radios">
        <legend>Niveaux</legend>
        <label>
          <input type="checkbox" name="levelsUnlock" defaultChecked={settings.levelsUnlock} />
          Débloquer le niveau suivant à partir de 70 % de bonnes réponses au niveau précédent
        </label>
      </fieldset>
      <fieldset className="field radios">
        <legend>Parrainage</legend>
        <label>
          <input type="checkbox" name="referralEnabled" defaultChecked={settings.referralEnabled} />
          Parrainage ouvert (lien d&rsquo;invitation, réduction du filleul, jours offerts au parrain)
        </label>
      </fieldset>
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field" style={{ maxWidth: 200 }}>
          <label htmlFor={`${id}-discount`}>Réduction du filleul (€)</label>
          <input
            id={`${id}-discount`}
            name="referralDiscount"
            type="text"
            inputMode="decimal"
            defaultValue={settings.referralDiscount}
            aria-describedby={`${id}-discount-help`}
          />
          <p className="help" id={`${id}-discount-help`}>
            Sur son premier achat ; le prix payé reste de 0,50 € au moins.
          </p>
        </div>
        <div className="field" style={{ maxWidth: 200 }}>
          <label htmlFor={`${id}-days`}>Jours offerts au parrain</label>
          <input
            id={`${id}-days`}
            name="referralBonusDays"
            type="number"
            min={0}
            max={60}
            defaultValue={settings.referralBonusDays}
          />
        </div>
        <div className="field" style={{ maxWidth: 220 }}>
          <label htmlFor={`${id}-max`}>Parrainages récompensés par an</label>
          <input
            id={`${id}-max`}
            name="referralMaxPerYear"
            type="number"
            min={0}
            max={100}
            defaultValue={settings.referralMaxPerYear}
          />
        </div>
      </div>
      <Status state={state} />
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          Enregistrer les réglages
        </button>
      </div>
    </form>
  );
}
