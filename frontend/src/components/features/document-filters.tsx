"use client";

import { useTranslations } from "next-intl";

import { AssigneeName } from "@/components/features/assignee-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "ALL";
const UNASSIGNED = "UNASSIGNED";

type FilterableDocument = { domain: string[]; assignee_id?: string };

export type DocumentFilterValues = { domain: string; assignee: string };

export const NO_DOCUMENT_FILTER: DocumentFilterValues = { domain: ALL, assignee: ALL };

export function matchesDocumentFilters(
  document: FilterableDocument,
  { domain, assignee }: DocumentFilterValues,
): boolean {
  const matchesDomain = domain === ALL || document.domain.includes(domain);
  const matchesAssignee =
    assignee === ALL ||
    (assignee === UNASSIGNED ? !document.assignee_id : document.assignee_id === assignee);
  return matchesDomain && matchesAssignee;
}

/** Filtres Domaine + Personne en charge, partagés par les listes régulations et procédures. */
export function DocumentFilters({
  documents,
  value,
  onChange,
}: {
  documents: readonly FilterableDocument[];
  value: DocumentFilterValues;
  onChange: (value: DocumentFilterValues) => void;
}) {
  const t = useTranslations("regulations");
  const assigneeT = useTranslations("assignee");

  const domains = [...new Set(documents.flatMap((document) => document.domain))].sort();
  const assigneeIds = [
    ...new Set(documents.flatMap((document) => document.assignee_id ?? [])),
  ];
  const hasUnassigned = documents.some((document) => !document.assignee_id);

  return (
    <>
      <Select value={value.domain} onValueChange={(domain) => onChange({ ...value, domain })}>
        <SelectTrigger size="sm" aria-label={t("filterDomain")} className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {t("filterDomain")}: {t("filterAllDomains")}
          </SelectItem>
          {domains.map((domain) => (
            <SelectItem key={domain} value={domain}>
              {domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.assignee}
        onValueChange={(assignee) => onChange({ ...value, assignee })}
      >
        <SelectTrigger size="sm" aria-label={assigneeT("label")} className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>
            {assigneeT("label")}: {t("filterAllAssignees")}
          </SelectItem>
          {assigneeIds.map((userId) => (
            <SelectItem key={userId} value={userId}>
              <AssigneeName userId={userId} />
            </SelectItem>
          ))}
          {hasUnassigned ? (
            <SelectItem value={UNASSIGNED}>{assigneeT("unassigned")}</SelectItem>
          ) : null}
        </SelectContent>
      </Select>
    </>
  );
}
