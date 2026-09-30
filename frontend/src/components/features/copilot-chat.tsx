"use client";

import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, RotateCcw, SendHorizontal } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Fragment, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { EvidenceCard } from "@/components/features/evidence-card";
import { MarkdownLine } from "@/components/features/markdown-line";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askCopilot } from "@/lib/api/copilot";
import type { CopilotAnswer } from "@/types/api";

const SUGGESTIONS = ["remaining", "gaps", "procedures", "regulations"] as const;
/** Échanges renvoyés comme contexte (même choix que le chatbot du projet DA). */
const HISTORY_TURNS = 4;

type Turn = { question: string; answer: CopilotAnswer };

/**
 * Hors du composant : le changement FR↔EN change le segment `[locale]` et remonte la
 * page — la conversation doit survivre à ce remontage (même session, deux langues).
 */
// ponytail: mémoire du module — perdue au rechargement, et partagée si un autre compte se
// connecte dans le même onglet ; passer en stockage par utilisateur si cela devient un besoin.
let savedTurns: Turn[] = [];

export function CopilotChat() {
  const t = useTranslations("copilot");
  const locale = useLocale();
  const [question, setQuestion] = useState("");
  const [turns, setTurnsState] = useState(() => savedTurns);

  function setTurns(next: Turn[]) {
    savedTurns = next;
    setTurnsState(next);
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
      setTurns([...savedTurns, { question: asked, answer }]);
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
    <div className="flex min-h-[calc(100svh-12rem)] flex-col gap-4">
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
      <div className="sticky bottom-0 -mx-4 -mb-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:-mb-6 md:px-6">
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
          {turns.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("newConversation")}
              title={t("newConversation")}
              disabled={mutation.isPending}
              onClick={() => setTurns([])}
            >
              <RotateCcw aria-hidden />
            </Button>
          ) : null}
        </form>
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
