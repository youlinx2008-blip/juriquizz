"use client";

import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { useEffect, useRef, useState } from "react";
import { READER_HEADER } from "@/lib/pdf/reader";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjsPromise: Promise<PdfJs> | null = null;

/**
 * La bibliothèque de lecture n'est chargée qu'à l'ouverture d'un cours. Version « legacy » : elle
 * embarque les compléments nécessaires aux navigateurs qui ne sont pas les plus récents.
 */
function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    if (!pdfjs.GlobalWorkerOptions.workerPort) {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url),
        { type: "module" },
      );
    }
    return pdfjs;
  });
  return pdfjsPromise;
}

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "Le cours n’a pas pu être ouvert. Réessaie dans un instant.";
}

/**
 * Lecteur intégré : chaque page est dessinée dans la page web (avec son texte, sélectionnable et lu
 * par les lecteurs d'écran), au fil du défilement. Pas de bouton de téléchargement ni d'impression.
 */
export function PdfViewer({ src, label }: { src: string; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(0);

  // Téléchargement et ouverture du document.
  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    (async () => {
      // L'en-tête signale le lecteur intégré : le fichier ne s'ouvre pas autrement.
      const response = await fetch(src, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { [READER_HEADER]: "1" },
      });
      if (!response.ok) throw new Error(await readError(response));
      const data = new Uint8Array(await response.arrayBuffer());
      const pdfjs = await loadPdfJs();
      if (cancelled) return;
      task = pdfjs.getDocument({ data });
      const opened = await task.promise;
      if (!cancelled) setDoc(opened);
    })().catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "Le cours n’a pas pu être ouvert.");
    });
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [src]);

  // Largeur disponible (arrondie, pour ne pas tout redessiner au moindre pixel).
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, Math.floor(entry.contentRect.width / 20) * 20));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Pages : emplacements à la bonne taille, dessinées quand elles approchent de l'écran.
  useEffect(() => {
    const element = host.current;
    if (!doc || !element || width === 0) return;
    let cancelled = false;
    const observers: IntersectionObserver[] = [];
    element.replaceChildren();

    (async () => {
      const pdfjs = await loadPdfJs();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (let number = 1; number <= doc.numPages; number++) {
        const page = await doc.getPage(number);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / base.width });
        const frame = document.createElement("div");
        frame.className = "pdf-page";
        frame.setAttribute("role", "group");
        frame.setAttribute("aria-label", `Page ${number} sur ${doc.numPages}`);
        frame.style.width = `${Math.floor(viewport.width)}px`;
        frame.style.height = `${Math.floor(viewport.height)}px`;
        frame.style.setProperty("--total-scale-factor", String(viewport.scale));
        element.append(frame);

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width * ratio);
            canvas.height = Math.floor(viewport.height * ratio);
            canvas.setAttribute("aria-hidden", "true");
            const text = document.createElement("div");
            text.className = "textLayer";
            frame.append(canvas, text);
            page
              .render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] })
              .promise.then(() =>
                new pdfjs.TextLayer({
                  textContentSource: page.streamTextContent(),
                  container: text,
                  viewport,
                }).render(),
              )
              .then(() => frame.setAttribute("data-rendered", "true"))
              .catch(() => undefined);
          },
          { rootMargin: "800px 0px" },
        );
        observer.observe(frame);
        observers.push(observer);
      }
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      observers.forEach((observer) => observer.disconnect());
    };
  }, [doc, width]);

  return (
    <div className="pdf-viewer" role="region" aria-label={label} aria-busy={!doc && !error}>
      {error ? (
        <p className="notice bad" role="alert">
          {error}
        </p>
      ) : (
        !doc && (
          <p className="pdf-loading" role="status">
            Ouverture du cours…
          </p>
        )
      )}
      <div ref={host} className="pdf-pages" />
    </div>
  );
}
