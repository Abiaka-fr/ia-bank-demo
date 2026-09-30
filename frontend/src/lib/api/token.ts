/**
 * Jeton JWT de la session courante.
 *
 * Isolé dans son propre module (et non dans le `SessionProvider`) pour que la couche
 * API puisse le lire sans dépendre de React : `backendFetch` est appelé depuis des
 * fonctions pures, pas depuis un composant.
 *
 * Stockage `localStorage` : la session est partagée entre les onglets (un nouvel onglet
 * ne redemande pas la connexion) et dure jusqu'à l'expiration du JWT (24 h côté backend)
 * ou la déconnexion. Jamais écrit dans un cookie (rien ne part automatiquement au serveur).
 */
const TOKEN_KEY = "ia-bank.token";
/** Utilisateur en session — lu par `SessionProvider`, purgé ici avec le jeton. */
export const SESSION_USER_KEY = "ia-bank.session";

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    // Stockage indisponible (navigation privée stricte) : la requête partira sans
    // en-tête et le backend répondra 401, ce qui est le comportement correct.
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sans persistance, la session ne survivra pas au rechargement.
  }
}

export function clearToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    // Rien à nettoyer si le stockage est indisponible.
  }
  // Sans jeton, l'utilisateur doit disparaître aussi, sinon la garde de session reste sur
  // un écran en erreur au lieu de renvoyer à la connexion. `SessionProvider` écoute
  // `storage` (qui ne se déclenche nativement que dans les AUTRES onglets).
  window.dispatchEvent(new Event("storage"));
}
