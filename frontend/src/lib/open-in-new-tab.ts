/**
 * Ouvre une page interne dans un nouvel onglet en lui transmettant la session.
 *
 * **Bug réel trouvé en testant** (pas en lisant le code) : un simple
 * `<a target="_blank">`, même sans `rel="noopener"`, n'hérite pas de la
 * `sessionStorage` de l'onglet d'origine dans les navigateurs actuels — la session
 * (`session-provider.tsx`) y vit, donc le nouvel onglet retombait systématiquement sur
 * l'écran de connexion. `window.open("", "_blank")` donne d'abord une fenêtre vide de
 * même origine, sur laquelle `sessionStorage` peut être copiée par script avant de la
 * naviguer vers l'URL réelle — seule méthode fiable trouvée pour ce cas.
 */
export function openInNewTabWithSession(href: string): void {
  const newWindow = window.open("", "_blank");
  if (!newWindow) return; // Fenêtre bloquée par le navigateur : rien de plus à faire.

  try {
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key === null) continue;
      newWindow.sessionStorage.setItem(key, sessionStorage.getItem(key) ?? "");
    }
  } catch {
    // Accès au stockage refusé (mode privé strict, etc.) : le nouvel onglet
    // affichera l'écran de connexion plutôt que de planter.
  }

  newWindow.location.href = href;
}
