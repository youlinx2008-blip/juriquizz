"use client";

import { useActionState, useId, useRef, useState, useTransition, type FormEvent } from "react";
import type { AdminFormState } from "@/app/actions/admin";
import { registerCourseDocumentAction, updateCourseDocumentAction } from "@/app/actions/admin-cours";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 50 * 1024 * 1024;

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

/** Dépôt d'un cours en PDF : envoi direct au stockage privé, puis enregistrement (pages comptées). */
export function CourseUploadForm({
  chapterId,
  defaultTitle,
  replacing,
}: {
  chapterId: string;
  defaultTitle: string;
  replacing: boolean;
}) {
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<AdminFormState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setState({ status: "error", message: "Choisis un fichier PDF." });
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setState({ status: "error", message: "Le fichier doit être un PDF." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ status: "error", message: "Fichier trop lourd : 50 Mo au plus." });
      return;
    }
    startTransition(async () => {
      const path = `${chapterId}/${crypto.randomUUID()}.pdf`;
      const upload = await createClient()
        .storage.from("cours")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (upload.error) {
        setState({ status: "error", message: `Dépôt impossible : ${upload.error.message}` });
        return;
      }
      const result = await registerCourseDocumentAction({
        chapterId,
        storagePath: path,
        title: String(data.get("title") ?? ""),
        previewPages: Number(data.get("previewPages") ?? 2),
      });
      setState(result);
      if (result.status === "ok") form.current?.reset();
    });
  }

  return (
    <form ref={form} className="form" onSubmit={submit}>
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor={`${id}-file`}>{replacing ? "Remplacer le PDF" : "Fichier PDF"}</label>
          <input id={`${id}-file`} name="file" type="file" accept="application/pdf,.pdf" required />
        </div>
        <div className="field">
          <label htmlFor={`${id}-title`}>Titre affiché</label>
          <input id={`${id}-title`} name="title" type="text" maxLength={200} defaultValue={defaultTitle} />
        </div>
        <div className="field" style={{ minWidth: 120, maxWidth: 160 }}>
          <label htmlFor={`${id}-preview`}>Pages d&rsquo;aperçu</label>
          <input id={`${id}-preview`} name="previewPages" type="number" min={0} max={10} defaultValue={2} />
        </div>
      </div>
      <Status state={state} />
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "Envoi…" : replacing ? "Remplacer" : "Déposer le cours"}
        </button>
      </div>
    </form>
  );
}

/** Titre et nombre de pages d'aperçu d'un cours déjà déposé. */
export function CourseSettingsForm({
  chapterId,
  title,
  previewPages,
}: {
  chapterId: string;
  title: string;
  previewPages: number;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(updateCourseDocumentAction, {
    status: "idle",
  });
  return (
    <form className="form" action={action}>
      <input type="hidden" name="chapterId" value={chapterId} />
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor={`${id}-title`}>Titre affiché</label>
          <input id={`${id}-title`} name="title" type="text" maxLength={200} defaultValue={title} />
        </div>
        <div className="field" style={{ minWidth: 120, maxWidth: 160 }}>
          <label htmlFor={`${id}-preview`}>Pages d&rsquo;aperçu</label>
          <input
            id={`${id}-preview`}
            name="previewPages"
            type="number"
            min={0}
            max={10}
            defaultValue={previewPages}
          />
        </div>
        <button className="btn small" type="submit" disabled={pending}>
          Enregistrer
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}
