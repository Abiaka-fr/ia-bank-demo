# Intégration backend — écart entre le contrat et l'API réelle

**Rédigé le 2026-09-04 après lecture de `backend/API.md` et de `backend/app/routers/`.**
Document de travail pour la Phase 2. `backend/` est en **lecture seule** pour une session frontend
(voir `CLAUDE.md` § 2) : rien de ce qui suit ne doit être « corrigé » dans le code de Thư — tout est
à trancher en revue commune.

## Résumé en une phrase

**Mis à jour le 2026-09-07 (après-midi).** Le backend de Thư existe et fonctionne, expose un
**modèle de données différent** de celui de `docs/api-contract.md`, mais couvre désormais le cœur
du produit côté lecture : documents, exigences **et constats** (`RequirementProcedureMap` routé le
2026-09-07). Ce qui manque encore : validation humaine, upload, agrégats de tableau de bord — tous
sur MSW dans le frontend, dans les deux modes.

## Ce que le backend expose aujourd'hui (12 endpoints)

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | état de la base |
| POST | `/api/auth/signup` | création de compte → JWT |
| POST | `/api/auth/signin` | connexion → JWT |
| GET | `/api/auth/me` | profil courant |
| GET | `/api/documents` | liste paginée + filtres (`category`, `domain`, `language`, `document_type`, `title`) |
| GET | `/api/documents/{document_id}` | métadonnées d'un document |
| GET | `/api/documents/content/{version_id}` | contenu d'une version, **découpé en chunks** |
| GET | `/api/requirements/by-documents` | exigences de N documents, paginé + filtres |
| GET | `/api/requirements/{requirement_id}` | une exigence |
| GET | `/api/mappings/all` | **ajouté le 2026-09-07** — couples exigence × procédure, liste plate paginée |
| GET | `/api/mappings/requirements-to-procedures` | **ajouté le 2026-09-07** — imbriqué par exigence, c'est celui que le frontend utilise |
| GET | `/api/mappings/procedures-to-requirements` | **ajouté le 2026-09-07** — imbriqué par procédure, non utilisé côté frontend pour l'instant |

Toutes les routes `/api/**` exigent un **JWT `Authorization: Bearer <token>`**.

## Écarts à trancher

### 1. Authentification — le frontend est à refaire, le backend fait autorité

| | Contrat (frontend) | Backend réel |
|---|---|---|
| Connexion | `POST /api/auth/login` | `POST /api/auth/signin` |
| Inscription | absente | `POST /api/auth/signup` |
| Réponse | `{ user, token }` | `{ access_token, token_type, user }` |
| Jeton | décoratif, non envoyé | **JWT obligatoire sur tout `/api/**`** |
| Rôle | `role: string` libre | `role: "COMPLIANCE_OFFICER"` (énuméré côté backend) |
| Profil | — | `is_active`, `created_at` en plus |

**Le backend a raison** : c'est une vraie authentification, la nôtre était une simulation. À faire
côté frontend : renommer `login` → `signin`, lire `access_token`, **poser l'en-tête `Authorization`
sur toutes les requêtes**, et gérer l'expiration (60 min par défaut) → re-connexion.
`GET /api/users` (liste des assignables) n'existe pas : à demander, ou à retirer de la
fonctionnalité d'assignation.

### 2. Documents — un seul type au lieu de deux, et le domaine n'est plus une liste

Le contrat sépare `regulations` et `procedures` ; le backend a **un seul** `/api/documents`
discriminé par `category` (`EXTERNAL` / `INTERNAL` / `CONTROL`). C'est plus propre : nos deux écrans
peuvent se brancher dessus avec un filtre.

Champs qui ne correspondent pas :

| Contrat | Backend | Remarque |
|---|---|---|
| `authority_or_owner` | `origin_code` + `origin_name` | deux champs au lieu d'un |
| `domain: string[]` | `domain: string` | **un seul domaine** — la carte des impacts et le graphique « par domaine » supposent une liste |
| `version` | `current_version` | renommage |
| `status: NOT_ANALYZED\|ANALYZING\|ANALYZED` | absent | **rien ne dit si un document a été analysé** |
| `extracted_text` | absent, remplacé par `/content/{version_id}` en chunks | il faut d'abord obtenir un `version_id`, non renvoyé par `/api/documents` |
| — | `data_classification`, `current_file_path`, `created_at` | en plus |

**Question ouverte n°1 :** comment obtenir le `version_id` courant d'un document ? Ni
`GET /api/documents` ni `GET /api/documents/{id}` ne le renvoient, alors que
`/api/documents/content/{version_id}` en a besoin. C'est un chaînon manquant bloquant pour
l'onglet « Texte source ».

### 3. Exigences — forme différente et pagination

| Contrat | Backend |
|---|---|
| `GET /api/regulations/:id/requirements` → `Requirement[]` | `GET /api/requirements/by-documents?document_ids=…` → `{ total, items, limit, offset }` |
| `source_text` | `requirement_text` |
| `normalized_requirement` | `title` (court) |
| `domain: string[]` | `domain: string` |
| `impacted_activity: string[]` | absent |
| `effective_date` | absent |
| — | `risk_level` (LOW/MEDIUM/HIGH), `status` (ACTIVE/SUPERSEDED) |

`risk_level` ressemble à notre `Finding.priority` mais porte sur l'exigence, pas sur le constat.
**Question ouverte n°2 :** `risk_level` remplace-t-il `priority`, ou les deux coexistent-ils ?

### 4. Le cœur du produit — en partie résolu le 2026-09-07

**Mise à jour :** Thư a poussé le commit `db41421` (« Api get map of requirement and procedure »)
le 2026-09-07, routant enfin `RequirementProcedureMap` via 3 endpoints (`GET /api/mappings/all`,
`/requirements-to-procedures`, `/procedures-to-requirements` — voir `backend/API.md` § 4). C'est
la réponse à l'ancienne question ouverte n°3 : **les modèles `mapping.py` étaient bien déjà prêts**,
il ne manquait que le routeur. Branché côté frontend le jour même
(`frontend/src/lib/api/backend/finding-adapt.ts` + `resources.ts::fetchFindings`) — les onglets
« Vue d'ensemble » et « Analyse d'impact » affichent désormais de vrais constats en mode
`NEXT_PUBLIC_BACKEND_URL`.

Ce qui reste sans équivalent backend :

- `POST /api/findings/:id/validate` — la validation humaine (Accepter / Rejeter / Escalader) : reste
  sur MSW, aucune route de validation sous `/api/mappings`.
- `GET /api/dashboard/overview`, `/summary`, `/map` — pas d'agrégats côté serveur. `/summary` est
  recalculé côté client à partir des vrais constats (`buildDashboardSummary`, réutilisée telle
  quelle depuis MSW) ; `/overview` et `/map` (portefeuille toutes régulations, carte mentale)
  restent sur MSW.
- `POST /api/regulations` — l'upload de document.
- l'assignation (`assignee_id`) sur un document ou un constat.

**Limite assumée sur la traduction `Finding` :** `RequirementProcedureMap` ne relie pas un couple
à un passage précis du document interne (pas de `chunk_id`). `regulatory_evidence` reste une
citation exacte (le texte de l'exigence). `internal_evidence` ne peut être qu'un extrait non ciblé
pris en tête du document de la procédure, honnêtement étiqueté comme tel (jamais présenté comme une
citation précise) — voir le commentaire en tête de `finding-adapt.ts`. À rediscuter avec Thư :
l'idéal serait un `chunk_id` sur `RequirementProcedureMap`.

**Question ouverte n°2, provisoirement tranchée côté frontend :** `risk_level` de l'exigence est
utilisé tel quel comme `priority` du constat (mêmes valeurs LOW/MEDIUM/HIGH) — à confirmer en revue
commune plutôt qu'à considérer comme acquis.

### 5. Conventions transverses

| | Contrat | Backend |
|---|---|---|
| Erreur | `{ error: { code, message } }` | `{ detail: "…" }` |
| Listes | tableau nu | `{ total, items, limit, offset }` |
| Identifiants | `REG-ACPR-2026-04`, `KYC-004`, `REQ-001` | `EXT-EU-AML-001`, `REQ-0001` |
| Corpus | les `.docx` du projet (ACPR, EBA, 12 procédures internes) | 32 documents `SYNTHETIC_DEMO` en base |

**Question ouverte n°4 :** quel corpus fait foi pour la démo client ? Les écarts KYC/AML ont été
construits à la main dans les `.docx` (fréquences 2/8/10 ans contre 1/5/10, PPE nationales
absentes…) et c'est ce qui rend la démo parlante. Le corpus du backend est un autre jeu de données.

## Conséquence pour le frontend

Le client API est isolé dans `frontend/src/lib/api/` et chaque réponse est validée par Zod : le
branchement se fera **endpoint par endpoint**, sans réécrire les écrans. Concrètement :

1. une couche d'adaptation traduira la forme backend vers nos types (`domain` string → tableau,
   `requirement_text` → `source_text`, enveloppe `{items}` → tableau) ;
2. `NEXT_PUBLIC_API_MOCKING` reste à `enabled` pour tout ce que le backend ne couvre pas encore
   (constats, dashboard, upload) — MSW et backend réel cohabiteront pendant la Phase 2 ;
3. les schémas Zod **ne doivent pas être assouplis** pour « faire passer » une réponse : un échec de
   validation est le signal que le contrat et le backend divergent.

## À trancher en revue commune (par ordre d'urgence)

1. **Version des documents** — comment récupérer le `version_id` courant (question n°1). Bloquant
   — contourné côté frontend en attendant (`frontend/src/lib/api/backend/current-version-id.ts`).
2. ~~Qui produit les `Finding`~~ — **résolu le 2026-09-07**, voir § 4 : `db41421` route
   `RequirementProcedureMap`. Reste à trancher : un lien vers un passage précis du document interne
   (`chunk_id`), et si `risk_level` fait bien office de `priority`.
3. **Corpus de démo** — `.docx` du projet ou base du backend (question n°4).
4. **Conventions** — format d'erreur, enveloppe de pagination, `domain` liste ou chaîne. Absorbées
   côté frontend (`frontend/src/lib/api/backend/`), mais une convergence réelle resterait plus sûre.
5. **Localisation** des textes générés (déjà ouvert depuis la v1 du contrat) — concerne maintenant
   aussi `Finding.explanation`/`recommended_action` venant de `RequirementProcedureMap` (en anglais
   dans le corpus backend).
6. `GET /api/users` pour l'assignation, ou abandon de la fonctionnalité.
7. **Nouveau** : route de validation humaine pour les constats (`POST` sous `/api/mappings` ou
   équivalent) — sans elle, Accepter/Rejeter/Escalader reste un exercice sur MSW même en mode réel.
8. **Nouveau (v1.3, 2026-09-07)** : `actor_id` sur la validation et
   `GET /api/regulations/:id/history` (onglet Historique) — mêmes que le point 7, sans route de
   validation backend, l'historique ne peut journaliser que les décisions prises en mode mock.
