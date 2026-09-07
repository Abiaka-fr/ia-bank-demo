/**
 * Bascule mock <-> backend réel.
 *
 * Un seul interrupteur : `NEXT_PUBLIC_BACKEND_URL`.
 *
 * - **vide** (défaut) — tout part en relatif (`/api/...`) et MSW sert l'intégralité du
 *   contrat. C'est le mode de démonstration : corpus `.docx` construit à la main, les
 *   9 écarts KYC/AML qui rendent la démo parlante.
 * - **renseigné** (ex. `http://localhost:8000`) — les endpoints que le backend de Thư
 *   couvre réellement partent en absolu vers ce serveur ; **tout le reste continue de
 *   partir en relatif** et reste donc servi par MSW.
 *
 * Les deux cohabitent sans conflit précisément parce que les URL sont de forme
 * différente : MSW n'intercepte que les chemins relatifs, il laisse passer les URL
 * absolues vers `localhost:8000`.
 *
 * Ce que le backend couvre aujourd'hui (voir `docs/backend-integration.md`) :
 * authentification, documents, exigences. Ce qu'il ne couvre pas et qui reste sur MSW :
 * constats, tableau de bord, upload, validation humaine, liste des utilisateurs.
 */
const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

/** Sans barre oblique finale : les chemins concaténés commencent tous par `/`. */
export const BACKEND_URL = RAW_BACKEND_URL.replace(/\/+$/, "");

export const isBackendLive = BACKEND_URL !== "";
