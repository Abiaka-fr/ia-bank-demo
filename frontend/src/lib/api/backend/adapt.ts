/**
 * Traduction backend réel -> types de `docs/api-contract.md`.
 *
 * Fonctions pures, testées : c'est le seul endroit du frontend qui connaît la forme
 * réelle du serveur de Thư. Les écrans ne voient que le contrat.
 *
 * Écarts absorbés ici (détail dans `docs/backend-integration.md`) :
 *   `domain` chaîne          -> `domain: string[]`
 *   `origin_code`/`origin_name` -> `authority_or_owner`
 *   `current_version`        -> `version`
 *   `requirement_text`       -> `source_text`
 *   `title` (exigence)       -> `normalized_requirement`
 *   enveloppe `{items}`      -> tableau nu
 *   chunks                   -> `extracted_text` (un seul bloc)
 */
import type {
  DocumentDetail,
  DocumentMeta,
  DocumentStatus,
  DocumentType,
  Language,
  Requirement,
  User,
} from "@/types/api";

import type {
  BackendDocument,
  BackendDocumentContent,
  BackendRequirement,
  BackendUser,
} from "./schemas";

/**
 * Le contrat n'admet que FR et EN. Toute autre valeur retombe sur FR plutôt que de
 * faire échouer l'écran : la langue sert à l'attribut `lang` et au choix de police,
 * jamais à une décision métier.
 */
export function adaptLanguage(language: string | null | undefined): Language {
  return language?.toUpperCase() === "EN" ? "EN" : "FR";
}

/**
 * `domain` est une chaîne unique côté backend, un tableau côté contrat (une exigence
 * peut relever de plusieurs domaines). On enveloppe sans inventer : une chaîne vide ou
 * absente donne un tableau vide, pas un domaine fictif.
 */
export function adaptDomain(domain: string | null | undefined): string[] {
  const trimmed = domain?.trim();
  return trimmed ? [trimmed] : [];
}

/**
 * Le contrat porte un seul champ « autorité ou propriétaire », le backend en a deux.
 * On préfère le nom complet, plus lisible, et on retombe sur le code.
 */
export function adaptAuthority(document: BackendDocument): string {
  return document.origin_name?.trim() || document.origin_code?.trim() || "";
}

/**
 * `category` (EXTERNAL / INTERNAL / CONTROL) -> `document_type` du contrat.
 * `CONTROL` n'a pas d'équivalent : les contrôles sont rattachés aux procédures
 * internes, faute de troisième valeur au contrat.
 */
export function adaptDocumentType(
  category: string | null | undefined,
): DocumentType {
  return category === "EXTERNAL" ? "REGULATION" : "INTERNAL_PROCEDURE";
}

/**
 * Le backend ne dit **rien** de l'avancement de l'analyse : il n'a ni champ `status`
 * de document, ni table de constats exposée. On renvoie donc `NOT_ANALYZED`, qui est
 * la seule affirmation honnête — surtout pas `ANALYZED`, qui laisserait croire à
 * l'utilisateur qu'une analyse a eu lieu (interdit par `docs/ui-guardrails.md`).
 */
export function adaptDocumentStatus(): DocumentStatus {
  return "NOT_ANALYZED";
}

export function adaptDocument(document: BackendDocument): DocumentMeta {
  return {
    document_id: document.document_id,
    title: document.title,
    document_type: adaptDocumentType(document.category),
    authority_or_owner: adaptAuthority(document),
    domain: adaptDomain(document.domain),
    language: adaptLanguage(document.language),
    version: document.current_version ?? "",
    status: adaptDocumentStatus(),
    uploaded_at: document.created_at,
  };
}

/**
 * Le contenu arrive découpé en chunks ; l'onglet « Texte source » attend un seul bloc.
 * Les chunks sont recollés dans l'ordre `chunk_no` (déjà trié par le backend, mais on
 * ne s'appuie pas dessus) et séparés par une ligne vide.
 */
export function adaptExtractedText(content: BackendDocumentContent): string {
  return [...content.chunks]
    .sort((a, b) => (a.chunk_no ?? 0) - (b.chunk_no ?? 0))
    .map((chunk) => chunk.content ?? "")
    .filter((text) => text.trim() !== "")
    .join("\n\n");
}

export function adaptDocumentDetail(
  document: BackendDocument,
  content: BackendDocumentContent | null,
): DocumentDetail {
  return {
    ...adaptDocument(document),
    extracted_text: content ? adaptExtractedText(content) : "",
  };
}

/**
 * `impacted_activity` et `effective_date` n'existent pas côté backend : on renvoie un
 * tableau vide et on omet la date, plutôt que de fabriquer une valeur. L'écran affiche
 * alors simplement une liste d'activités vide.
 */
export function adaptRequirement(requirement: BackendRequirement): Requirement {
  return {
    requirement_id: requirement.requirement_id,
    source_document_id: requirement.source_document_id,
    source_reference: requirement.source_reference ?? "",
    source_text: requirement.requirement_text ?? "",
    normalized_requirement: requirement.title ?? "",
    domain: adaptDomain(requirement.domain),
    impacted_activity: [],
    language: adaptLanguage(requirement.language),
  };
}

/**
 * `full_name` est facultatif côté backend ; le contrat le veut non vide. On retombe sur
 * la partie locale de l'adresse e-mail, ce qui reste identifiant sans rien inventer.
 */
export function adaptUser(user: BackendUser): User {
  return {
    user_id: user.user_id,
    full_name: user.full_name?.trim() || user.email.split("@")[0],
    email: user.email,
    role: user.role,
  };
}
