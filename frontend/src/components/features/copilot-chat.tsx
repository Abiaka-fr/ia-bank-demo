"use client";

import { useMutation } from "@tanstack/react-query";
import { RotateCcw, SendHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EvidenceCard } from "@/components/features/evidence-card";
import { MarkdownLine } from "@/components/features/markdown-line";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askCopilot } from "@/lib/api/copilot";
import type { CopilotAnswer } from "@/types/api";

const SUGGESTIONS = ["remaining", "gaps", "procedures", "regulations"] as const;
/** Échanges renvoyés comme contexte (même choix que le chatbot du projet DA). */
const HISTORY_TURNS = 4;

type Turn = { question: string; answer: CopilotAnswer };

// ponytail: conversation gardée en mémoire du composant (perdue au rechargement) ;
// persister côté serveur si l'historique doit survivre à la session.
export function CopilotChat() {
  const t = useTranslations("copilot");
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);

  const mutation = useMutation({
    mutationFn: (asked: string) =>
      askCopilot(
        asked,
        turns
          .slice(-HISTORY_TURNS)
          .map((turn) => ({ question: turn.question, answer: turn.answer.answer })),
      ),
    onSuccess: (answer, asked) => {
      setTurns((previous) => [...previous, { question: asked, answer }]);
      setQuestion("");
    },
    onError: (error) => toast.error(t("error"), { description: error.message }),
  });

  function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed && !mutation.isPending) mutation.mutate(trimmed);
  }

  return (
    <div className="space-y-4">
      {turns.map((turn, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {turn.question}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1 text-sm leading-relaxed">
              {turn.answer.answer.split("\n").map((line, lineIndex) => (
                <MarkdownLine key={lineIndex} text={line} />
              ))}
            </div>
            {turn.answer.evidence.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  {t("evidenceHeading")}
                </p>
                {turn.answer.evidence.map((evidence, evidenceIndex) => (
                  <EvidenceCard key={evidenceIndex} evidence={evidence} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noEvidence")}</p>
            )}
            <p className="text-[11px] text-muted-foreground">{t("disclaimer")}</p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="space-y-3">
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
              disabled={mutation.isPending}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask(question);
                }
              }}
            />
            <Button type="submit" disabled={mutation.isPending || !question.trim()}>
              <SendHorizontal aria-hidden />
              {t("send")}
            </Button>
          </form>
          {mutation.isPending ? (
            <p className="text-sm text-muted-foreground" role="status">
              {t("pending")}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("suggestionsLabel")}</span>
              {SUGGESTIONS.map((key) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => ask(t(`suggestions.${key}`))}
                >
                  {t(`suggestions.${key}`)}
                </Button>
              ))}
              {turns.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setTurns([])}
                >
                  <RotateCcw aria-hidden />
                  {t("newConversation")}
                </Button>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
