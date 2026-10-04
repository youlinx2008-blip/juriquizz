export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="form-error" id={id}>
      {message}
    </p>
  );
}

/** Attributs d'accessibilité d'un champ en erreur. */
export function invalidProps(id: string, message?: string) {
  return message ? { "aria-invalid": true as const, "aria-describedby": id } : {};
}
