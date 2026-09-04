# Contrat d'API — Frontend ↔ Backend

**Source de vérité partagée entre `frontend/` (Giang) et `backend/` (Thư).** Toute modification doit
être décidée d'un commun accord et reportée dans `PROGRESS.md`. Le frontend construit son client
API et ses données mockées à partir de ce fichier — ne jamais halluciner un champ ou un endpoint qui
n'y figure pas.

Basé sur le data model de la brief projet (`Abiaka_Regulatory_AI_POC_Full_Project_Guide_EN.docx`,
section 12) et le "Shared Interface Contract" (section 16.4).

> **v1.1 — proposition du 2026-09-04, en attente de validation par Thư.**
> Les blocs marqués `// v1.1` ci-dessous sont des modifications demandées par Giang après la revue
> de la Phase 1. Elles sont déjà implémentées côté frontend et dans la couche de mock ; le backend
> ne doit s'y aligner qu'une fois la revue commune faite. Résumé des changements :
> 1. `Finding` devient un couple **(exigence × procédure)** au lieu d'un constat portant plusieurs
>    procédures — chaque couple a son action et sa propre validation humaine.
> 2. Ajout de `custom_action` : le relecteur peut retenir une action différente de celle proposée.
> 3. Ajout des utilisateurs (`User`), de l'authentification, et de l'assignation
>    (`assignee_id` sur une régulation et sur un constat escaladé).
> 4. Ajout de `GET /api/dashboard/overview` : agrégats sur **toutes** les régulations.
> 5. `POST /api/regulations` prend un `assignee_id` ; ajout de `PATCH /api/regulations/:id`.

## Conventions générales

- Toutes les réponses en JSON, `Content-Type: application/json`.
- Toutes les dates en ISO 8601 (`YYYY-MM-DD`).
- Tous les IDs sont des strings (`REQ-017`, `KYC-004`, etc.), pas des nombres.
- Erreurs : `{ "error": { "code": string, "message": string } }` avec status HTTP approprié.
- Le backend peut être servi sous n'importe quelle stack (Thư) — le frontend ne dépend que de cette
  forme JSON, jamais d'une implémentation particulière.

## Types partagés

```typescript
type Language = "FR" | "EN";
type Assessment = "COVERED" | "PARTIAL" | "POTENTIAL_GAP" | "NO_RELEVANT_PROCEDURE" | "EXPERT_REVIEW";
type Priority = "LOW" | "MEDIUM" | "HIGH";
type HumanStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "ESCALATED";
type DocumentType = "REGULATION" | "INTERNAL_PROCEDURE";

// v1.1 — utilisateurs et assignation
interface User {
  user_id: string;
  full_name: string;
  email: string;
  role: string;            // ex: "Responsable Conformité", "Analyste Conformité"
}

interface EvidenceRef {
  document_id: string;
  document_title: string;
  section_reference: string;   // ex: "Article 4" ou "KYC-004 §1"
  excerpt: string;             // texte source exact, langue d'origine
  language: Language;
}

interface DocumentMeta {
  document_id: string;
  title: string;
  document_type: DocumentType;
  authority_or_owner: string;  // ex: "ACPR", "EBA", "IA Bank - Direction Conformité"
  domain: string[];            // ex: ["KYC", "AML/CFT"]
  language: Language;
  version: string;
  publication_date?: string;
  effective_date?: string;
  status: "NOT_ANALYZED" | "ANALYZING" | "ANALYZED";
  uploaded_by_id?: string;   // v1.1 — User.user_id, absent pour le corpus préchargé
  uploaded_at?: string;      // v1.1 — ISO 8601
  assignee_id?: string;      // v1.1 — User.user_id chargé du traitement, modifiable
}

interface Requirement {
  requirement_id: string;          // "REQ-017"
  source_document_id: string;
  source_reference: string;        // "Article 4"
  source_text: string;             // texte exact source
  normalized_requirement: string;  // reformulation courte
  domain: string[];
  impacted_activity: string[];
  effective_date?: string;
  language: Language;
}

// v1.1 — un Finding = UN couple (exigence × procédure interne).
// Une exigence touchant deux procédures produit donc DEUX findings, chacun avec sa
// propre action et sa propre validation humaine. Une exigence sans procédure
// correspondante produit un finding avec `procedure_id: null`.
interface Finding {
  finding_id: string;
  requirement_id: string;
  procedure_id: string | null;           // v1.1 — remplace `matched_procedure_ids`
  assessment: Assessment;
  regulatory_evidence: EvidenceRef[];
  internal_evidence: EvidenceRef[];
  explanation: string;                   // doit respecter docs/ui-guardrails.md
  missing_or_ambiguous_elements: string[];
  recommended_action: string;            // action proposée par le système
  custom_action?: string;                // v1.1 — action retenue par le relecteur.
                                         // Si absente/vide, c'est `recommended_action`
                                         // qui fait foi.
  priority: Priority;
  confidence_or_evidence_strength?: number; // 0-1, optionnel — voir guardrails
  human_status: HumanStatus;
  assignee_id?: string;                  // v1.1 — renseigné à l'escalade
  reviewer_comment?: string;
  updated_at: string;
}

// Agrégats d'UNE régulation (écran de détail d'une régulation).
interface DashboardSummary {
  requirements_identified: number;
  procedures_impacted: number;
  potential_gaps: number;
  expert_reviews_required: number;
  actions_pending: number;
  actions_total: number;                 // v1.1 — pour afficher "3 / 11 traités"
  by_domain: { domain: string; count: number }[];
  by_assessment: { assessment: Assessment; count: number }[];
  top_priority_findings: Finding[];
}

// v1.1 — agrégats sur TOUTES les régulations (écran Dashboard d'accueil).
// `by_regulation` alimente aussi les cartes de la liste des régulations, pour
// éviter un appel `summary` par carte.
interface RegulationSummary {
  regulation_id: string;
  title: string;
  status: DocumentMeta["status"];
  assignee_id?: string;
  requirements_identified: number;
  potential_gaps: number;
  expert_reviews_required: number;
  actions_pending: number;
  actions_total: number;
  // Personnes à qui un constat a été confié lors d'une escalade, lorsqu'elles
  // diffèrent de `assignee_id`. Affiché sur la carte de la régulation.
  escalated_assignee_ids: string[];
}

interface PortfolioSummary {
  regulations_total: number;
  regulations_analyzed: number;
  requirements_identified: number;
  potential_gaps: number;
  expert_reviews_required: number;
  actions_pending: number;
  by_regulation: RegulationSummary[];
  by_domain: { domain: string; count: number }[];
  by_assessment: { assessment: Assessment; count: number }[];
}
```

## Endpoints

### Régulations

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/regulations` | Liste des régulations (préchargées pour démo + uploadées) | `DocumentMeta[]` |
| POST | `/api/regulations` | v1.1 — Upload (multipart : `file` **.docx uniquement**, `file_name`, `assignee_id`, `uploaded_by_id`) | `DocumentMeta` |
| PATCH | `/api/regulations/:id` | v1.1 — Modifier l'assignation — body `{ assignee_id }` | `DocumentMeta` |
| GET | `/api/regulations/:id` | Détail + texte extrait | `DocumentMeta & { extracted_text: string }` |
| POST | `/api/regulations/:id/analyze` | Déclenche l'extraction des exigences (async) | `{ status: "ANALYZING" }` |
| GET | `/api/regulations/:id/requirements` | Liste des exigences extraites | `Requirement[]` |

`file_name` est envoyé explicitement en plus de `file` : selon le runtime, le nom du fichier
n'est pas toujours conservé dans la partie multipart. Le backend valide l'extension sur
`file_name`, et retombe sur le nom porté par `file` si le champ est absent.

### Findings (constats d'impact)

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/requirements/:id/findings` | Constats pour une exigence donnée | `Finding[]` |
| GET | `/api/findings?regulation_id=...` | Tous les constats d'une régulation (pour la table Impact Analysis) | `Finding[]` |
| POST | `/api/findings/:id/validate` | v1.1 — Valider un constat — body `{ human_status, custom_action?, reviewer_comment?, assignee_id? }` | `Finding` (mis à jour) |

### Dashboard

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/dashboard/overview` | v1.1 — Agrégats sur toutes les régulations (écran d'accueil + cartes) | `PortfolioSummary` |
| GET | `/api/dashboard/summary?regulation_id=...` | Agrégats KPI d'une régulation (écran de détail) | `DashboardSummary` |

### Procédures internes (lecture seule côté frontend)

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/procedures` | Liste des procédures internes indexées | `DocumentMeta[]` |
| GET | `/api/procedures/:id` | Détail d'une procédure | `DocumentMeta & { extracted_text: string }` |

### Authentification et utilisateurs (v1.1)

Authentification simple pour la démo — pas de SSO, pas de gestion de rôles fine. Le rôle porté par
`User.role` est **informatif** (affiché dans l'UI) et ne restreint aucune action en v1.1.

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| POST | `/api/auth/login` | body `{ email, password }` | `{ user: User, token: string }` |
| POST | `/api/auth/logout` | Termine la session | `{ ok: true }` |
| GET | `/api/auth/me` | Utilisateur de la session courante | `User` |
| GET | `/api/users` | Liste des utilisateurs assignables | `User[]` |

### Copilot (P2 — optionnel, ne pas bloquer le P0 dessus)

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| POST | `/api/copilot/ask` | body `{ question: string, language: Language }` | `{ answer: string, evidence: EvidenceRef[] }` |

## Statut de mise en œuvre

- [ ] v1 gelée d'un commun accord avec Thư (à faire en Phase 1)
- [ ] Endpoints réels disponibles côté backend
- [ ] Frontend a basculé des mocks vers les appels réels

Tant que le backend n'est pas prêt, le frontend implémente ces endpoints en mock (MSW ou route
handlers Next.js) avec des données de démo cohérentes — voir `frontend/CLAUDE.md`.
