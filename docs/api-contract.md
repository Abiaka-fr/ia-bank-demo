# Contrat d'API — Frontend ↔ Backend

**Source de vérité partagée entre `frontend/` (Giang) et `backend/` (Thư).** Toute modification doit
être décidée d'un commun accord et reportée dans `PROGRESS.md`. Le frontend construit son client
API et ses données mockées à partir de ce fichier — ne jamais halluciner un champ ou un endpoint qui
n'y figure pas.

Basé sur le data model de la brief projet (`Abiaka_Regulatory_AI_POC_Full_Project_Guide_EN.docx`,
section 12) et le "Shared Interface Contract" (section 16.4).

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

interface Finding {
  finding_id: string;
  requirement_id: string;
  matched_procedure_ids: string[];       // ex: ["KYC-004"], peut être vide
  assessment: Assessment;
  regulatory_evidence: EvidenceRef[];
  internal_evidence: EvidenceRef[];
  explanation: string;                   // doit respecter docs/ui-guardrails.md
  missing_or_ambiguous_elements: string[];
  recommended_action: string;
  priority: Priority;
  confidence_or_evidence_strength?: number; // 0-1, optionnel — voir guardrails
  human_status: HumanStatus;
  reviewer_comment?: string;
  updated_at: string;
}

interface DashboardSummary {
  requirements_identified: number;
  procedures_impacted: number;
  potential_gaps: number;
  expert_reviews_required: number;
  actions_pending: number;
  by_domain: { domain: string; count: number }[];
  by_assessment: { assessment: Assessment; count: number }[];
  top_priority_findings: Finding[];
}
```

## Endpoints

### Régulations

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/regulations` | Liste des régulations (préchargées pour démo + uploadées) | `DocumentMeta[]` |
| POST | `/api/regulations` | Upload d'une nouvelle régulation (multipart) | `DocumentMeta` |
| GET | `/api/regulations/:id` | Détail + texte extrait | `DocumentMeta & { extracted_text: string }` |
| POST | `/api/regulations/:id/analyze` | Déclenche l'extraction des exigences (async) | `{ status: "ANALYZING" }` |
| GET | `/api/regulations/:id/requirements` | Liste des exigences extraites | `Requirement[]` |

### Findings (constats d'impact)

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/requirements/:id/findings` | Constats pour une exigence donnée | `Finding[]` |
| GET | `/api/findings?regulation_id=...` | Tous les constats d'une régulation (pour la table Impact Analysis) | `Finding[]` |
| POST | `/api/findings/:id/validate` | Valider un constat — body `{ human_status, reviewer_comment? }` | `Finding` (mis à jour) |

### Dashboard

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/dashboard/summary?regulation_id=...` | Agrégats KPI pour le Dashboard | `DashboardSummary` |

### Procédures internes (lecture seule côté frontend)

| Méthode | Route | Description | Réponse |
|---|---|---|---|
| GET | `/api/procedures` | Liste des procédures internes indexées | `DocumentMeta[]` |
| GET | `/api/procedures/:id` | Détail d'une procédure | `DocumentMeta & { extracted_text: string }` |

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
