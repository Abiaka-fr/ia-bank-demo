/**
 * Utilitaires de formatage de dates pour l'UI.
 *
 * Toutes les dates affichées à l'utilisateur doivent utiliser ces fonctions
 * pour garantir une cohérence formatage à travers l'application.
 */

/**
 * Formate une date ISO 8601 au format DD/MM/YYYY.
 *
 * @param dateString - Date ISO 8601 (ex: "2024-05-20T09:00:00" ou "2024-05-20")
 * @returns Date formatée (ex: "20/05/2024") ou undefined si la date est invalide
 *
 * @example
 * formatDateDDMMYYYY("2024-05-20T09:00:00") // "20/05/2024"
 * formatDateDDMMYYYY("2024-05-20") // "20/05/2024"
 * formatDateDDMMYYYY(undefined) // undefined
 */
export function formatDateDDMMYYYY(dateString?: string | null): string | undefined {
  if (!dateString) return undefined;

  try {
    // Extract YYYY-MM-DD part (first 10 characters)
    const datePart = dateString.slice(0, 10);

    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return undefined;
    }

    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return undefined;
  }
}

/**
 * Formate un **instant** (création, modification, décision) en date et heure locales du
 * navigateur : `DD/MM/YYYY HH:mm`. Le backend écrit ses horodatages en UTC sans fuseau
 * (`datetime.utcnow`) : les découper tels quels affichait l'heure UTC, et parfois la
 * veille. À ne pas utiliser pour une date de calendrier (publication, entrée en vigueur),
 * qui ne doit jamais glisser d'un jour — voir `formatDateDDMMYYYY`.
 */
export function formatLocalDateTime(dateString?: string | null): string | undefined {
  // Une date seule (« 2024-05-20 ») n'est pas un instant : rien à convertir.
  if (!dateString?.includes("T")) return formatDateDDMMYYYY(dateString);

  const hasTimeZone = /(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(dateString);
  const date = new Date(hasTimeZone ? dateString : `${dateString}Z`);
  if (Number.isNaN(date.getTime())) return undefined;

  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Date locale (`DD/MM/YYYY`) d'un instant — voir `formatLocalDateTime`. */
export function formatLocalDate(dateString?: string | null): string | undefined {
  return formatLocalDateTime(dateString)?.slice(0, 10);
}
