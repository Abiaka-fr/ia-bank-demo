/**
 * Profils d'accès — 100 % frontend, aucune autorisation réelle côté serveur.
 *
 * `User.role` reste une chaîne libre non validée par le backend
 * (`backend/app/schemas/user.py`, contrat v1.5). Ce module ne fait que décider, à
 * partir de ce libellé déjà chargé en session, ce que l'interface affiche ou cache —
 * jamais une requête réseau, jamais un vrai contrôle d'accès. Voir
 * `docs/known-limitations.md` et `docs/phases/phase-6-francis-feedback.md` § 1.
 *
 * Un rôle non reconnu retombe sur `COMPLIANCE_OFFICER` (profil principal de la démo,
 * celui qui a le plus de droits d'usage courant) plutôt que de bloquer l'écran : créer
 * un compte avec un intitulé de poste imprévu ne doit jamais casser l'application.
 */
import type { User } from "@/types/api";

export const ACCESS_PROFILES = [
  "HEAD_OF_COMPLIANCE",
  "COMPLIANCE_OFFICER",
  "AUDITOR",
  "COMPLIANCE_ADMIN",
] as const;

export type AccessProfile = (typeof ACCESS_PROFILES)[number];

export const DEFAULT_ACCESS_PROFILE: AccessProfile = "COMPLIANCE_OFFICER";

/**
 * Libellés `role` connus — voir `scripts/local-dev/seed_dev_db.py`. Source unique pour
 * la résolution de profil ET pour le sélecteur de rôle de l'écran « Utilisateurs »
 * (`user-role-row.tsx`) : un rôle choisi dans la liste correspond toujours à un profil
 * précis, jamais au défaut par ambiguïté.
 *
 * `role` reste stocké en français côté serveur (chaîne libre, voir
 * `backend/app/schemas/user.py`) — `labelKey` pointe vers `messages/{fr,en}.json` sous
 * `roles.*` pour afficher un libellé traduit en interface EN sans changer la valeur
 * envoyée à l'API. Voir `roleLabel()` ci-dessous.
 */
export const KNOWN_ROLES = [
  {
    role: "Responsable Conformité",
    profile: "HEAD_OF_COMPLIANCE",
    labelKey: "headOfCompliance",
  },
  {
    role: "Analyste Conformité",
    profile: "COMPLIANCE_OFFICER",
    labelKey: "complianceOfficer",
  },
  {
    role: "Juriste Réglementaire",
    profile: "COMPLIANCE_OFFICER",
    labelKey: "regulatoryCounsel",
  },
  { role: "Auditeur Interne", profile: "AUDITOR", labelKey: "auditor" },
  {
    role: "Admin Base de Connaissances",
    profile: "COMPLIANCE_ADMIN",
    labelKey: "knowledgeBaseAdmin",
  },
] as const satisfies readonly { role: string; profile: AccessProfile; labelKey: string }[];

const ROLE_TO_PROFILE: Record<string, AccessProfile> = Object.fromEntries(
  KNOWN_ROLES.map(({ role, profile }) => [role, profile]),
);

const ROLE_TO_LABEL_KEY: Record<string, string> = Object.fromEntries(
  KNOWN_ROLES.map(({ role, labelKey }) => [role, labelKey]),
);

export function resolveAccessProfile(role: string | null | undefined): AccessProfile {
  if (!role) return DEFAULT_ACCESS_PROFILE;
  return ROLE_TO_PROFILE[role] ?? DEFAULT_ACCESS_PROFILE;
}

/**
 * Libellé de rôle traduit dans la langue de l'interface. `t` doit venir de
 * `useTranslations("roles")`. Un rôle non reconnu (compte créé avant cette liste, ou
 * rôle saisi à la main) n'a pas de traduction possible — il est affiché tel quel plutôt
 * que de faire échouer l'écran.
 */
export function roleLabel(role: string, t: (key: string) => string): string {
  const labelKey = ROLE_TO_LABEL_KEY[role];
  return labelKey ? t(labelKey) : role;
}

export function accessProfileForUser(user: User | null | undefined): AccessProfile {
  return resolveAccessProfile(user?.role);
}

/**
 * Écran d'atterrissage post-connexion. `COMPLIANCE_OFFICER`/`AUDITOR` devraient
 * atterrir sur « Analyse d'impact » (demande de Francis), mais cet écran n'existe plus
 * en tant que route globale depuis la revue v1.1 — ce n'est qu'un onglet du détail
 * d'une régulation. `/regulations` (choisir la régulation à traiter) est le point
 * d'entrée le plus proche sans régulation présélectionnée.
 */
export const LANDING_ROUTE: Record<AccessProfile, string> = {
  HEAD_OF_COMPLIANCE: "/dashboard",
  COMPLIANCE_OFFICER: "/regulations",
  AUDITOR: "/regulations",
  COMPLIANCE_ADMIN: "/knowledge-base",
};

export function landingRouteForUser(user: User | null | undefined): string {
  return LANDING_ROUTE[accessProfileForUser(user)];
}

/** Un auditeur consulte, ne décide jamais (Accepter/Rejeter/Escalader). */
export function canValidateFindings(profile: AccessProfile): boolean {
  return profile !== "AUDITOR";
}

/** Même restriction que la validation — cohérent avec l'esprit « lecture seule ». */
export function canUploadRegulations(profile: AccessProfile): boolean {
  return profile !== "AUDITOR";
}

/** Déclencher `POST /api/procedures/:id/analyze` (écran Analyze, Phase 6 § 2.2 / Phase 7
 * Jour 0) — même restriction que le reste des actions d'écriture. */
export function canAnalyzeProcedures(profile: AccessProfile): boolean {
  return profile !== "AUDITOR";
}

export function canPrint(profile: AccessProfile): boolean {
  return profile !== "AUDITOR";
}

/** Knowledge Base (§ 3) : admin en écriture, Head of Compliance en lecture. */
export function canSeeKnowledgeBase(profile: AccessProfile): boolean {
  return profile === "COMPLIANCE_ADMIN" || profile === "HEAD_OF_COMPLIANCE";
}

/** Écran « Utilisateurs » (gestion des rôles) — réservé à l'admin. */
export function canSeeUserAdmin(profile: AccessProfile): boolean {
  return profile === "COMPLIANCE_ADMIN";
}
