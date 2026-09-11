"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AssigneeSelect } from "@/components/features/assignee-select";
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
import { uploadProcedure } from "@/lib/api/procedures";

/**
 * Copie de `UploadRegulationDialog` (Phase 7 Jour 0, écran `/procedures`) — même
 * contrainte de fichier, même flux, seule la ressource cible et la redirection après
 * succès changent. Le backend n'expose aucune route `POST /api/procedures`
 * aujourd'hui (contrat v1.8, proposition) : toujours servi par MSW.
 */
const ACCEPTED_EXTENSION = ".docx";
const ACCEPTED_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function UploadProcedureDialog() {
  const t = useTranslations("uploadProcedure");
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () =>
      uploadProcedure({
        file: file!,
        assigneeId,
        uploadedById: user?.user_id,
      }),
    onSuccess: async (created) => {
      toast.success(t("succeeded"), { description: created.title });
      await queryClient.invalidateQueries({ queryKey: queryKeys.procedures() });
      setIsOpen(false);
      setFile(null);
      router.push(`/procedures/${created.document_id}`);
    },
    onError: () => toast.error(t("failed")),
  });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !selected.name.toLowerCase().endsWith(ACCEPTED_EXTENSION)) {
      toast.error(t("wrongFormat"));
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
  }

  // Même restriction que l'upload de régulation (Phase 6 § 1) : lecture seule pour
  // l'auditeur, masqué plutôt que grisé.
  if (!canUploadRegulations(accessProfileForUser(user))) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload aria-hidden />
          {t("trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="procedure-file">{t("fileLabel")}</Label>
            <Input
              id="procedure-file"
              ref={inputRef}
              type="file"
              accept={`${ACCEPTED_EXTENSION},${ACCEPTED_MIME}`}
              onChange={handleFileChange}
            />
            <p className="text-xs text-muted-foreground">{t("fileHelp")}</p>
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
            disabled={!file || mutation.isPending}
          >
            <Upload aria-hidden />
            {mutation.isPending ? t("uploading") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
