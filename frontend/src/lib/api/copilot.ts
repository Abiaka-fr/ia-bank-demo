import { copilotAnswerSchema, type Language } from "@/types/api";

import { backendFetch } from "./backend/client";
import { isBackendLive } from "./backend/config";
import { apiFetch } from "./client";

export type CopilotTurn = { question: string; answer: string };

/**
 * `POST /api/copilot/ask` — le backend renvoie directement la forme du contrat : une
 * réponse + les preuves citées, reconstruites côté serveur à partir du texte source.
 * `history` : 4 échanges maximum, du plus ancien au plus récent. `locale` (langue de
 * l'interface) ne sert que si la langue de la question est ambiguë (« REQ-0001 ? ») :
 * sinon le Copilot répond dans la langue de la question.
 */
export function askCopilot(
  question: string,
  history: CopilotTurn[] = [],
  locale: Language = "FR",
) {
  const options = { method: "POST" as const, body: { question, history, locale } };
  if (isBackendLive) return backendFetch("/api/copilot/ask", copilotAnswerSchema, options);
  return apiFetch("/api/copilot/ask", copilotAnswerSchema, options);
}
