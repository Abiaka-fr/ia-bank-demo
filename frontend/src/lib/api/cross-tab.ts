/**
 * Prévient les autres onglets qu'une donnée a changé. Chaque onglet a son propre cache
 * TanStack Query : une décision prise sur la page d'un constat (ouverte dans un nouvel
 * onglet) n'atteignait jamais l'onglet de la liste, qui restait sur « En attente ».
 *
 * Un seul canal par onglet, pour l'envoi et l'écoute : un `BroadcastChannel` ne reçoit
 * pas ses propres messages, l'onglet émetteur ne se réinvalide donc pas lui-même.
 */
const CHANNEL_NAME = "ia-bank.data-changed";

let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel === undefined) {
    // Absent côté serveur et sous jsdom : la synchronisation est alors simplement inactive.
    channel =
      typeof window !== "undefined" && "BroadcastChannel" in window
        ? new BroadcastChannel(CHANNEL_NAME)
        : null;
  }
  return channel;
}

export function notifyOtherTabs(): void {
  getChannel()?.postMessage(null);
}

/** Renvoie la fonction de désabonnement. */
export function onOtherTabChange(listener: () => void): () => void {
  const current = getChannel();
  if (!current) return () => {};
  current.addEventListener("message", listener);
  return () => current.removeEventListener("message", listener);
}
