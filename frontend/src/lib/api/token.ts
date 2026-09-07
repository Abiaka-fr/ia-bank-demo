/**
 * Jeton JWT de la session courante.
 *
 * Isolé dans son propre module (et non dans le `SessionProvider`) pour que la couche
 * API puisse le lire sans dépendre de React : `backendFetch` est appelé depuis des
 * fonctions pures, pas depuis un composant.
 *
 * Le stockage reste `sessionStorage` : le jeton disparaît à la fermeture de l'onglet,
 * et n'est jamais écrit dans un cookie (rien ne doit partir automatiquement au serveur).
 */
const TOKEN_KEY = "ia-bank.token";

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    // Stockage indisponible (navigation privée stricte) : la requête partira sans
    // en-tête et le backend répondra 401, ce qui est le comportement correct.
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sans persistance, la session ne survivra pas au rechargement.
  }
}

export function clearToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
}
