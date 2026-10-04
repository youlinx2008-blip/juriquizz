import { DECORS, type DecorKey } from "@/lib/decors/registry";

export function Emblem({ decor }: { decor: DecorKey }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={DECORS[decor].emblem} />
    </svg>
  );
}

/** Balance de la justice : le logo de JuriQuizz. */
export function BrandMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3v17M7 20h10M4 7h16" />
      <path d="M4 7l-2.5 6a2.8 2.8 0 0 0 5 0L4 7zM20 7l-2.5 6a2.8 2.8 0 0 0 5 0L20 7z" />
    </svg>
  );
}
