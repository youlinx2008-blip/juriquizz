"use client";

import { useActionState, useId, useState } from "react";
import type { AdminFormState } from "@/app/actions/admin";
import { deleteExamAction, saveExamAction } from "@/app/actions/admin-examens";
import { LEVELS, type LevelId } from "@/lib/levels";

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

export type ExamFormSubject = {
  id: string;
  title: string;
  chapters: { id: string; label: string; title: string }[];
};

export type ExamFormValues = {
  id: string;
  subjectId: string;
  title: string;
  slug: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  levels: LevelId[];
  chapterIds: string[];
  premium: boolean;
  visible: boolean;
  position: number;
  /** Déjà proposé aux étudiants au moins une fois. */
  published: boolean;
};

/** Création (sans `exam`) ou modification d'un examen blanc. */
export function ExamForm({ subjects, exam }: { subjects: ExamFormSubject[]; exam?: ExamFormValues }) {
  const id = useId();
  const [state, action, pending] = useActionState<AdminFormState, FormData>(saveExamAction, {
    status: "idle",
  });
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? subjects[0]?.id ?? "");
  const subject = subjects.find((item) => item.id === subjectId);
  const premiumLocked = Boolean(exam?.published && !exam.premium);

  return (
    <form className="form" action={action}>
      {exam && <input type="hidden" name="id" value={exam.id} />}
      {exam ? (
        <input type="hidden" name="subjectId" value={exam.subjectId} />
      ) : (
        <div className="field">
          <label htmlFor={`${id}-subject`}>Matière</label>
          <select
            id={`${id}-subject`}
            name="subjectId"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            required
          >
            {subjects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field">
          <label htmlFor={`${id}-title`}>Titre</label>
          <input
            id={`${id}-title`}
            name="title"
            type="text"
            maxLength={120}
            defaultValue={exam?.title}
            placeholder="Partiel blanc n° 1"
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${id}-slug`}>Adresse (facultatif)</label>
          <input
            id={`${id}-slug`}
            name="slug"
            type="text"
            maxLength={60}
            defaultValue={exam?.slug}
            aria-describedby={`${id}-slug-help`}
          />
          <p className="help" id={`${id}-slug-help`}>
            Vide : tirée du titre.
          </p>
        </div>
      </div>
      <div className="filters" style={{ marginBottom: 0 }}>
        <div className="field" style={{ maxWidth: 170 }}>
          <label htmlFor={`${id}-count`}>Nombre de questions</label>
          <input
            id={`${id}-count`}
            name="questionCount"
            type="number"
            min={5}
            max={100}
            defaultValue={exam?.questionCount ?? 20}
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 170 }}>
          <label htmlFor={`${id}-duration`}>Durée (minutes)</label>
          <input
            id={`${id}-duration`}
            name="durationMinutes"
            type="number"
            min={5}
            max={240}
            defaultValue={exam?.durationMinutes ?? 30}
            required
          />
        </div>
        <div className="field" style={{ maxWidth: 130 }}>
          <label htmlFor={`${id}-position`}>Ordre</label>
          <input
            id={`${id}-position`}
            name="position"
            type="number"
            min={0}
            max={1000}
            defaultValue={exam?.position ?? 0}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea
          id={`${id}-description`}
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={exam?.description}
        />
      </div>
      <fieldset className="field radios">
        <legend>Niveaux des questions</legend>
        {LEVELS.map((level) => (
          <label key={level.id}>
            <input
              type="checkbox"
              name="levels"
              value={level.id}
              defaultChecked={exam ? exam.levels.includes(level.id) : level.id !== "facile"}
            />
            {level.label}
          </label>
        ))}
      </fieldset>
      {subject && subject.chapters.length > 0 && (
        <fieldset className="field radios" key={subject.id} aria-describedby={`${id}-chapters-help`}>
          <legend>Chapitres</legend>
          <p className="help" id={`${id}-chapters-help`}>
            Aucun coché : toute la matière, y compris les chapitres ajoutés plus tard.
          </p>
          {subject.chapters.map((chapter) => (
            <label key={chapter.id}>
              <input
                type="checkbox"
                name="chapterIds"
                value={chapter.id}
                defaultChecked={exam?.chapterIds.includes(chapter.id)}
              />
              {chapter.label}, {chapter.title}
            </label>
          ))}
        </fieldset>
      )}
      <div className="radios">
        <label>
          <input
            type="checkbox"
            name="premium"
            defaultChecked={exam?.premium}
            disabled={premiumLocked}
            aria-describedby={premiumLocked ? `${id}-premium-help` : undefined}
          />
          Réservé au Pass Année Premium
        </label>
        <label>
          <input type="checkbox" name="visible" defaultChecked={exam?.visible} />
          Proposé aux étudiants
        </label>
      </div>
      {premiumLocked && (
        <p className="fine" id={`${id}-premium-help`}>
          Déjà proposé à tous les détenteurs d&rsquo;un pass : il ne peut plus devenir une exclusivité
          Premium.
        </p>
      )}
      <Status state={state} />
      <div>
        <button className="btn primary" type="submit" disabled={pending}>
          {exam ? "Enregistrer l’examen" : "Créer l’examen"}
        </button>
      </div>
    </form>
  );
}

export function DeleteExamForm({ examId, title }: { examId: string; title: string }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(deleteExamAction, {
    status: "idle",
  });
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={examId} />
      <Status state={state} />
      <div>
        <button className="btn danger small" type="submit" disabled={pending}>
          Supprimer<span className="visually-hidden"> : {title}</span>
        </button>
      </div>
    </form>
  );
}
