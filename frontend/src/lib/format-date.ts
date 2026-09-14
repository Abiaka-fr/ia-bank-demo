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
 * Formate une date ISO 8601 au format DD/MM/YYYY, avec fallback sur notAvailable.
 *
 * Utile pour les templates JSX où on veut toujours afficher quelque chose.
 *
 * @param dateString - Date ISO 8601
 * @param fallback - Texte par défaut si la date est invalide (défaut: "N/A")
 * @returns Date formatée ou fallback
 *
 * @example
 * formatDateOrFallback("2024-05-20T09:00:00") // "20/05/2024"
 * formatDateOrFallback(null, "Date unavailable") // "Date unavailable"
 */
export function formatDateOrFallback(
  dateString?: string | null,
  fallback: string = "N/A",
): string {
  return formatDateDDMMYYYY(dateString) ?? fallback;
}
