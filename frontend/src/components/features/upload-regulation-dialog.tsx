"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AssigneeSelect } from "@/components/features/assignee-select";
import { ExtractedContentPreview } from "@/components/features/extracted-content-preview";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { accessProfileForUser, canUploadRegulations } from "@/lib/access-profile";
import { queryKeys } from "@/lib/api/query-keys";
import { uploadRegulation } from "@/lib/api/regulations";
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_MIME_TYPES,
  isAcceptedUploadFile,
} from "@/lib/file-extract";
import { useFileExtraction } from "@/lib/use-file-extraction";

const ACCEPT_ATTRIBUTE = [...ACCEPTED_UPLOAD_EXTENSIONS, ...ACCEPTED_UPLOAD_MIME_TYPES].join(",");

export function UploadRegulationDialog() {
  const t = useTranslations("upload");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const { file, chunks, status: extractionStatus, selectFile, reset: resetExtraction } =
    useFileExtraction();

  const mutation = useMutation({
    mutationFn: () =>
      uploadRegulation({
        file: file!,
        assigneeId,
        uploadedById: user?.user_id,
        chunks,
      }),
    onSuccess: async (created) => {
      toast.success(t("succeeded"), { description: created.title });
      await queryClient.invalidateQueries({ queryKey: queryKeys.regulations() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.portfolioSummary() });
      setIsOpen(false);
      resetExtraction();
      // Après l'upload, on ouvre directement le détail de la régulation créée.
      router.push(`/regulations/${created.document_id}`);
    },
    onError: () => toast.error(t("failed")),
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !isAcceptedUploadFile(selected.name)) {
      toast.error(t("wrongFormat"));
      if (inputRef.current) inputRef.current.value = "";
      resetExtraction();
      return;
    }
    // Extraction côté client (demande de Thư, 2026-09-14) — voir `lib/file-extract.ts` :
    // avant tout appel réseau, pas encore de vraie route de création de document.
    selectFile(selected);
  }

  // Profil AUDITOR : lecture seule (phase-6-francis-feedback.md § 1) — masqué, pas
  // désactivé, comme le reste des contrôles de décision.
  if (!canUploadRegulations(accessProfileForUser(user))) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload aria-hidden />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      {/* `max-h-[90vh] overflow-y-auto` : sans ça, l'aperçu d'extraction (Thư,
          2026-09-14) pousse le contenu au-delà du viewport sur un document avec
          beaucoup de sections — le pied de page (boutons) devient inatteignable
          plutôt que de faire défiler la fenêtre. Même pattern que
          `FindingDetailDialog`/`ProcedureEvidenceDialog`. */}
      <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="regulation-file">{t("fileLabel")}</Label>
            <Input
              id="regulation-file"
              ref={inputRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">{t("fileHelp")}</p>
            <ExtractedContentPreview
              status={extractionStatus}
              chunks={chunks}
              onRetry={() => selectFile(file)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("assigneeLabel")}</Label>
            <AssigneeSelect
              value={assigneeId}
              onChange={setAssigneeId}
              size="default"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{t("assigneeHelp")}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={mutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={
              // Vide tant que rien n'est extrait (aucun fichier, en cours, échec ou fichier sans texte).
              chunks.length === 0 || mutation.isPending
            }
          >
            <Upload aria-hidden />
            {mutation.isPending ? t("uploading") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
