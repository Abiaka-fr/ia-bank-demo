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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { accessProfileForUser, canUploadRegulations } from "@/lib/access-profile";
import { queryKeys } from "@/lib/api/query-keys";
import {
  DOCUMENT_DOMAINS,
  uploadDocument,
  type DocumentKind,
  type DocumentMetadata,
} from "@/lib/api/upload";
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_MIME_TYPES,
  isAcceptedUploadFile,
  stripAcceptedExtension,
} from "@/lib/file-extract";
import { useFileExtraction } from "@/lib/use-file-extraction";
import { languageSchema } from "@/types/api";

const ACCEPT_ATTRIBUTE = [...ACCEPTED_UPLOAD_EXTENSIONS, ...ACCEPTED_UPLOAD_MIME_TYPES].join(",");

const EMPTY_METADATA: DocumentMetadata = {
  title: "",
  domain: "",
  language: "FR",
  summary: "",
  publishedDate: "",
};

/** Ce qui change entre l'import d'une régulation et celui d'une procédure. */
const KINDS = {
  regulation: {
    namespace: "upload",
    listKeys: [queryKeys.regulations(), queryKeys.portfolioSummary()],
    route: "/regulations",
  },
  procedure: {
    namespace: "uploadProcedure",
    listKeys: [queryKeys.procedures()],
    route: "/procedures",
  },
} as const;

export function UploadDocumentDialog({ kind }: { kind: DocumentKind }) {
  const config = KINDS[kind];
  const t = useTranslations(config.namespace);
  const fields = useTranslations("upload");
  const common = useTranslations("common");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [metadata, setMetadata] = useState(EMPTY_METADATA);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const { file, chunks, status: extractionStatus, selectFile, reset: resetExtraction } =
    useFileExtraction();

  const update = (patch: Partial<DocumentMetadata>) =>
    setMetadata((current) => ({ ...current, ...patch }));

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) return;
    // Le champ fichier est démonté à la fermeture : sans ce reset, les chunks du
    // fichier précédent survivaient derrière un champ vide.
    setMetadata(EMPTY_METADATA);
    setAssigneeId(undefined);
    resetExtraction();
  }

  const mutation = useMutation({
    mutationFn: () =>
      uploadDocument(kind, {
        file: file!,
        chunks,
        metadata,
        uploadedById: user!.user_id,
        assigneeId,
      }),
    onSuccess: (created) => {
      toast.success(t("succeeded"), { description: created.title });
      // Pas d'`await` : en mode backend réel, recharger le portefeuille prend plusieurs
      // secondes et la modale restait bloquée sur « Import en cours… » après le succès.
      for (const queryKey of config.listKeys) void queryClient.invalidateQueries({ queryKey });
      handleOpenChange(false);
      router.push(`${config.route}/${created.document_id}`);
    },
    onError: (error) => toast.error(t("failed"), { description: error.message }),
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !isAcceptedUploadFile(selected.name)) {
      toast.error(t("wrongFormat"));
      if (inputRef.current) inputRef.current.value = "";
      resetExtraction();
      return;
    }
    if (selected) update({ title: stripAcceptedExtension(selected.name) });
    selectFile(selected);
  }

  // Profil AUDITOR : lecture seule (phase-6-francis-feedback.md § 1) — masqué, pas
  // désactivé, comme le reste des contrôles de décision.
  if (!canUploadRegulations(accessProfileForUser(user))) return null;

  const canSubmit =
    // Vide tant que rien n'est extrait (aucun fichier, en cours, échec ou fichier sans texte).
    chunks.length > 0 &&
    metadata.title.trim() !== "" &&
    metadata.domain !== "" &&
    user !== null &&
    !mutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload aria-hidden />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      {/* `max-h-[90vh] overflow-y-auto` : l'aperçu d'extraction peut dépasser le
          viewport sur un document avec beaucoup de sections — sans ça, les boutons du
          pied de page deviennent inatteignables. */}
      <DialogContent className="flex max-h-[90vh] flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="upload-file">{t("fileLabel")}</Label>
            <Input
              id="upload-file"
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
            <Label htmlFor="upload-title">{fields("titleLabel")}</Label>
            <Input
              id="upload-title"
              value={metadata.title}
              onChange={(event) => update({ title: event.target.value })}
              aria-required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="upload-domain">{common("domain")}</Label>
              <Select value={metadata.domain} onValueChange={(domain) => update({ domain })}>
                <SelectTrigger id="upload-domain" className="w-full" aria-required>
                  <SelectValue placeholder={fields("domainPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_DOMAINS.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-language">{common("language")}</Label>
              <Select
                value={metadata.language}
                onValueChange={(language) => update({ language: languageSchema.parse(language) })}
              >
                <SelectTrigger id="upload-language" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageSchema.options.map((language) => (
                    <SelectItem key={language} value={language}>
                      {fields(`language${language}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upload-summary">{fields("summaryLabel")}</Label>
            <Textarea
              id="upload-summary"
              rows={3}
              value={metadata.summary}
              onChange={(event) => update({ summary: event.target.value })}
            />
          </div>

          {/* `items-end` : le libellé de la date passe sur deux lignes en FR. */}
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="upload-published-at">{fields("publishedAtLabel")}</Label>
              <Input
                id="upload-published-at"
                type="date"
                value={metadata.publishedDate}
                onChange={(event) => update({ publishedDate: event.target.value })}
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
            </div>
          </div>
          {kind === "regulation" && (
            <p className="text-xs text-muted-foreground">{t("assigneeHelp")}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit}>
            <Upload aria-hidden />
            {mutation.isPending ? t("uploading") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
