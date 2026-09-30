"use client";

import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { Bot, Loader2, PanelLeftClose, PanelLeftOpen, Plus, SendHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EvidenceCard } from "@/components/features/evidence-card";
import { MarkdownLine } from "@/components/features/markdown-line";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askCopilot } from "@/lib/api/copilot";
import type { CopilotAnswer } from "@/types/api";

const SUGGESTIONS = ["remaining", "gaps", "procedures", "regulations"] as const;
/** Échanges renvoyés comme contexte (même choix que le chatbot du projet DA). */
const HISTORY_TURNS = 4;

type Turn = { question: string; answer: CopilotAnswer };
type Conversation = { id: string; turns: Turn[] };

/**
 * Le backend ne stocke rien (`backend/API.md`, `/api/copilot/ask`) : les conversations
 * vivent dans le navigateur, une clé par utilisateur. Elles survivent au rechargement et
 * au changement FR↔EN (qui remonte la page).
 */
// ponytail: localStorage — propre à ce navigateur, plafonné à MAX_CONVERSATIONS ; passer
// par un endpoint backend si l'historique doit suivre l'utilisateur d'un poste à l'autre.
const MAX_CONVERSATIONS = 20;
/** Préférence d'affichage de la liste, propre au navigateur. */
const HISTORY_OPEN_KEY = "ia-bank.copilot.historyOpen";

function loadConversations(key: string): Conversation[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
}

export function CopilotChat() {
  const t = useTranslations("copilot");
  const locale = useLocale();
  const { user } = useSession();
  const storageKey = `ia-bank.copilot.${user?.user_id ?? "anonymous"}`;
  const [question, setQuestion] = useState("");
  const [historyOpen, setHistoryOpen] = useState(() => {
    try {
      return window.localStorage.getItem(HISTORY_OPEN_KEY) !== "0";
    } catch {
      return true;
    }
  });

  function toggleHistory() {
    setHistoryOpen(!historyOpen);
    try {
      window.localStorage.setItem(HISTORY_OPEN_KEY, historyOpen ? "0" : "1");
    } catch {
      // Préférence non conservée : sans conséquence.
    }
  }
  const [conversations, setConversations] = useState(() => loadConversations(storageKey));
  // Reprend la conversation la plus récente ; sinon une nouvelle, enregistrée à la 1re réponse.
  const [activeId, setActiveId] = useState(
    () => conversations[0]?.id ?? crypto.randomUUID(),
  );
  const turns = conversations.find((c) => c.id === activeId)?.turns ?? [];

  function saveTurns(nextTurns: Turn[]) {
    // La conversation active remonte en tête : c'est elle qu'on retrouve au rechargement.
    const next = [
      { id: activeId, turns: nextTurns },
      ...conversations.filter((c) => c.id !== activeId),
    ].slice(0, MAX_CONVERSATIONS);
    setConversations(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Stockage plein ou bloqué : la conversation reste utilisable, juste pas conservée.
    }
  }

  const mutation = useMutation({
    mutationFn: (asked: string) =>
      askCopilot(
        asked,
        turns
          .slice(-HISTORY_TURNS)
          .map((turn) => ({ question: turn.question, answer: turn.answer.answer })),
        locale === "en" ? "EN" : "FR",
      ),
    onSuccess: (answer, asked) => {
      saveTurns([...turns, { question: asked, answer }]);
      setQuestion("");
    },
    onError: (error) => toast.error(t("error"), { description: error.message }),
  });

  function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed && !mutation.isPending) mutation.mutate(trimmed);
  }

  const pendingQuestion = mutation.isPending ? mutation.variables : null;
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length, pendingQuestion]);

  return (
    // ponytail: 12rem ≈ barre du haut + en-tête de page, à ajuster si l'en-tête change.
    <div className="flex min-h-[calc(100svh-12rem)] flex-col gap-4 lg:flex-row">
      <aside
        className={cn(
          "flex shrink-0 flex-col gap-1 rounded-lg border bg-card p-2 lg:sticky lg:top-4 lg:self-start",
          historyOpen && "lg:w-64",
        )}
      >
        <div className={cn("flex items-center gap-1", !historyOpen && "lg:flex-col")}>
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={historyOpen}
            aria-controls="copilot-history"
            aria-label={t(historyOpen ? "hideHistory" : "showHistory")}
            title={t(historyOpen ? "hideHistory" : "showHistory")}
            onClick={toggleHistory}
          >
            {historyOpen ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
          </Button>
          {historyOpen ? (
            <span className="flex-1 truncate text-xs font-medium uppercase text-muted-foreground">
              {t("history")}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("newConversation")}
            title={t("newConversation")}
            disabled={mutation.isPending || turns.length === 0}
            onClick={() => setActiveId(crypto.randomUUID())}
          >
            <Plus aria-hidden />
          </Button>
        </div>
        {historyOpen ? (
          <nav
            id="copilot-history"
            aria-label={t("history")}
            className="flex max-h-40 flex-col gap-0.5 overflow-y-auto border-t pt-1 lg:max-h-[calc(100svh-18rem)]"
          >
            {conversations.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">{t("noHistory")}</p>
            ) : null}
            {conversations.map((conversation) => {
              const title = conversation.turns[0]?.question ?? "";
              const active = conversation.id === activeId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  title={title}
                  aria-current={active ? "true" : undefined}
                  disabled={mutation.isPending}
                  onClick={() => setActiveId(conversation.id)}
                  className={cn(
                    "truncate rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50",
                    active && "bg-muted font-medium",
                  )}
                >
                  {title}
                </button>
              );
            })}
          </nav>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-1 flex-col gap-4" aria-live="polite">
        {turns.map((turn, index) => (
          <Fragment key={index}>
            <UserBubble text={turn.question} />
            <AssistantBubble>
              <div className="space-y-1 text-sm leading-relaxed">
                {turn.answer.answer.split("\n").map((line, lineIndex) => (
                  <MarkdownLine key={lineIndex} text={line} />
                ))}
              </div>
              {turn.answer.evidence.length > 0 ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {t("evidenceHeading")}
                  </p>
                  {turn.answer.evidence.map((evidence, evidenceIndex) => (
                    <EvidenceCard key={evidenceIndex} evidence={evidence} />
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">{t("noEvidence")}</p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">{t("disclaimer")}</p>
            </AssistantBubble>
          </Fragment>
        ))}
        {pendingQuestion ? (
          <>
            <UserBubble text={pendingQuestion} />
            <AssistantBubble>
              <p
                className="flex items-center gap-2 text-sm text-muted-foreground"
                role="status"
              >
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("pending")}
              </p>
            </AssistantBubble>
          </>
        ) : null}
        <div ref={endRef} />
      </div>

      {turns.length === 0 && !pendingQuestion ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Bot className="size-10 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">{t("suggestionsLabel")}</p>
          <div className="flex max-w-2xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((key) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="h-auto whitespace-normal py-1.5 text-left"
                onClick={() => ask(t(`suggestions.${key}`))}
              >
                {t(`suggestions.${key}`)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Collé en bas de l'écran : la conversation défile derrière, comme une messagerie. */}
      <div className="sticky bottom-0 -mb-4 border-t bg-background/95 py-3 backdrop-blur md:-mb-6">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            ask(question);
          }}
        >
          <Textarea
            aria-label={t("inputLabel")}
            placeholder={t("placeholder")}
            value={question}
            rows={1}
            className="max-h-40 min-h-10 resize-none"
            disabled={mutation.isPending}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                ask(question);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t("send")}
            disabled={mutation.isPending || !question.trim()}
          >
            <SendHorizontal aria-hidden />
          </Button>
        </form>
      </div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
        {text}
      </p>
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="size-4 text-muted-foreground" aria-hidden />
      </span>
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-4 py-3">
        {children}
      </div>
    </div>
  );
}
