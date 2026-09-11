# Intégration backend — écart entre le contrat et l'API réelle

**Rédigé le 2026-09-04 après lecture de `backend/API.md` et de `backend/app/routers/`.**
Document de travail pour la Phase 2. `backend/` est en **lecture seule** pour une session frontend
(voir `CLAUDE.md` § 2) : rien de ce qui suit ne doit être « corrigé » dans le code de Thư — tout est
à trancher en revue commune.

## Résumé en une phrase

**Mis à jour le 2026-09-09 (soir).** Le backend de Thư existe et fonctionne, expose un **modèle de
données différent** de celui de `docs/api-contract.md`, mais couvre désormais le cœur du produit :
documents, exigences, constats (`RequirementProcedureMap`, routé le 2026-09-07), **la persistance
d'une décision humaine** (`PUT /api/mappings/:id/human-status` et `/assignee`, ajoutés le
2026-09-07 après-midi, **branchés côté frontend le 2026-09-09 soir**) et **la liste des
utilisateurs** (`GET /api/users`, ajouté le 2026-09-07, **branché le 2026-09-09 soir**). Ce qui
manque encore : upload, agrégats de tableau de bord, historique des décisions (pas d'`actor_id`
côté backend) — sur MSW dans le frontend, dans les deux modes.

## Ce que le backend expose aujourd'hui (17 endpoints)

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
| PUT | `/api/mappings/{id}/human-status` | **ajouté le 2026-09-07 après-midi** — persiste `PENDING_REVIEW\|ACCEPT\|REJECT\|ESCALATE`. **Branché côté frontend le 2026-09-09 soir.** |
| PUT | `/api/mappings/{id}/assignee` | **ajouté le 2026-09-07 après-midi** — assigne un `mapping` à un utilisateur (email ou id). **Branché côté frontend le 2026-09-09 soir.** |
| GET | `/api/users` | **ajouté le 2026-09-07** — liste paginée, filtres `role`/`is_active`. **Branché côté frontend le 2026-09-09 soir** (`fetchUsers`). |
| GET | `/api/users/{user_id}` | **ajouté le 2026-09-07** — un utilisateur. |
| POST | `/api/documents/{id}/update` | **ajouté le 2026-09-07** — nouvelle version d'un document (upload de contenu). Pas branché côté frontend, aucun écran ne le déclenche encore. |

Toutes les routes `/api/**` exigent un **JWT `Authorization: Bearer <token>`**. 17 endpoints en
tout désormais (9 au 2026-09-04, 3 le 2026-09-07 matin, 5 le 2026-09-07 après-midi).

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

- `GET /api/dashboard/overview`, `/summary`, `/map` — pas d'agrégats côté serveur. `/summary` est
  recalculé côté client à partir des vrais constats (`buildDashboardSummary`, réutilisée telle
  quelle depuis MSW) ; `/overview` et `/map` (portefeuille toutes régulations, carte mentale)
  restent sur MSW.
- `POST /api/regulations` — l'upload de document (mais `POST /api/documents/{id}/update`, ajouté le
  2026-09-07, gère déjà la mise à jour de contenu d'un document existant — pas exactement la même
  chose que créer une nouvelle régulation).
- **Journalisation** de qui a pris une décision, quand, avec quel commentaire — voir point 7/8
  ci-dessous. `PUT /api/mappings/:id/human-status` persiste la décision elle-même depuis le
  2026-09-07 après-midi, mais rien ne dit qui, ni pourquoi.

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
6. ~~`GET /api/users` pour l'assignation~~ — **résolu le 2026-09-07** (commit `624db76`, « API to
   get user list by role »), **branché côté frontend le 2026-09-09 soir**
   (`backend/resources.ts::fetchUsers`, `auth.ts::fetchUsers`). Forme vérifiée en conditions
   réelles contre le backend local, pas seulement contre `userSchema`.
7. ~~Route de validation humaine pour les constats~~ — **résolu côté backend le 2026-09-07**
   (commit `2e747d9`), **branché côté frontend le 2026-09-09 soir**
   (`backend/resources.ts::validateMapping`). Écarts absorbés dans l'adaptation :
   - énumération différente : `PENDING_REVIEW`/`ACCEPT`/`REJECT`/`ESCALATE` (backend) contre
     `PENDING`/`ACCEPTED`/`REJECTED`/`ESCALATED` (contrat) — traduits dans les deux sens par
     `finding-adapt.ts::adaptHumanStatus`/`adaptHumanStatusToBackend`. **Bug réel trouvé en
     écrivant l'adaptateur, pas en lisant le code** : `adaptHumanStatus` ne reconnaissait que le
     participe passé (`ACCEPTED`…), alors que la réponse de `PUT .../human-status` stocke le verbe
     court (`"human_status": "ACCEPT"`, voir l'exemple de `backend/API.md` § 4) — une exigence tout
     juste acceptée via le backend réel serait retombée sur `PENDING` au prochain chargement.
     `adaptHumanStatus` accepte maintenant les deux formes ; vérifié en conditions réelles (accepter
     puis recharger la liste affiche bien « Accepté », pas « En attente »).
   - deux appels séparés (`human-status` puis `assignee`) là où le contrat n'en fait qu'un —
     `validateMapping` les enchaîne, l'appel à `/assignee` n'a lieu que si `assignee_id` est fourni ;
   - **aucun champ `actor_id`, `custom_action` ni `reviewer_comment`** côté backend — la validation
     est persistée, mais pas journalisée : l'onglet Historique (point 8) **reste sur MSW dans les
     deux modes**, y compris pour une décision prise via le backend réel — voir
     `docs/known-limitations.md` point 2 (accepté explicitement, pas un oubli) ;
   - une exigence sans procédure associée (`finding_id` préfixé `NO-MAPPING-`, voir
     `finding-adapt.ts::assembleUnmappedFinding`) n'a pas de ligne `RequirementProcedureMap` côté
     backend : `validateMapping` lève une `BackendGapError` plutôt que d'appeler une route
     inexistante — cas non rencontré dans le corpus actuel (aucune exigence sans mapping) ;
   - **`assignee` a été ajouté au modèle sans migration** (`alembic/versions/` gitignoré côté
     backend) : cassait `/api/mappings/*` en entier sur toute base plus ancienne que le changement
     (`no such column`). Contourné côté outillage local
     (`scripts/local-dev/seed_dev_db.py::sync_missing_columns`, ajoute les colonnes manquantes
     automatiquement) — **pas un correctif du bug lui-même**, qui reste réel pour quiconque a une
     base non synchronisée et n'a pas cet outillage.
   - **Vérifié en conditions réelles** (backend local + frontend pointé dessus, navigateur piloté) :
     Accepter sur `MAP-0001` → `GET /api/mappings/all` renvoie bien `human_status: "ACCEPT"` ;
     Escalader `MAP-0003` avec Thomas Rousseau assigné → `human_status: "ESCALATE"`,
     `assignee: "USR-002"`. Base de développement locale remise à `PENDING_REVIEW`/`assignee: null`
     après vérification.
8. **Nouveau (v1.3, 2026-09-07)** : `actor_id` sur la validation et
   `GET /api/regulations/:id/history` (onglet Historique) — voir point 7 : le backend peut
   maintenant persister une décision, mais toujours pas dire qui ni pourquoi.
9. **Nouveau (2026-09-09)** : `current_version` peut être un nombre plutôt qu'une chaîne
   (`DocumentRead.current_version: str | float`, commit `d34d746`, « Fix API get documents »).
   Absorbé côté frontend (`backendDocumentSchema`, `deriveCurrentVersionId`,
   `adaptDocument`) — signalé ici pour mémoire, déjà réglé. Un commit suivant
   (`b811678`, même titre) corrige la source du problème côté backend : `current_version`
   est désormais toujours une chaîne (`field_validator` qui convertit un float en amont).
   Sans lien avec `actor_id`/l'historique — vérifié en relisant ce commit le 2026-09-09 soir.
10. **Nouveau (v1.4, 2026-09-09 soir)** : `POST /api/auth/signup` branché côté frontend
    (`backend/resources.ts::signUp`), les deux modes vérifiés en conditions réelles
    (backend local : compte créé avec `role: "COMPLIANCE_OFFICER"`, confirmé par
    `GET /api/users` ; mode mock : compte ajouté à la liste des utilisateurs assignables
    pour le reste de la session). — **résolu par le point 12.**
11. ~~Ni `signup` ni aucune autre route ne permet de choisir ou de changer `User.role`
    après création~~ — **résolu quelques minutes plus tard le 2026-09-09** (voir point 12).
12. **Nouveau (v1.5, 2026-09-09 soir)** : `PUT /api/users/:id/role` (commit `fabd0cf`,
    « Create API to update role of user ») — Thư l'a poussé quelques minutes après la
    v1.4 ci-dessus, répondant exactement au point resté ouvert. Branché côté frontend
    le même soir (`backend/resources.ts::updateUserRole`,
    `frontend/src/lib/api/users.ts`, écran `/users`). **Limite assumée, à trancher avec
    Thư** : la route n'a aucun contrôle d'autorisation propre — n'importe quel compte
    authentifié peut changer le rôle de n'importe quel autre (pas de vérification que
    l'appelant a le droit de modifier ce compte précis). Affichée honnêtement dans
    l'écran plutôt que cachée (`users.permissionNotice`). `role` reste une chaîne libre
    des deux côtés (pas d'énumération imposée par le backend) — le champ est un texte
    libre, pas une liste déroulante qui inventerait des valeurs.
    **Vérifié en conditions réelles** (backend local, navigateur piloté, connecté en
    Marie Lefèvre) : rôle de Karim Benali changé « Juriste Réglementaire » →
    « Analyste Senior » → confirmé par `GET /api/users` sur le vrai backend → remis à sa
    valeur d'origine après vérification.
13. **Deux bugs réels trouvés le 2026-09-09 (nuit) en testant en conditions réelles, pas
    en lisant le code** — signalés par Giang après usage normal de l'écran, pas trouvés
    par une revue de code :
    - **L'assignation « Personne en charge » d'une régulation échouait systématiquement
      en mode backend réel** (message d'erreur visible, pas un simple problème
      d'affichage). Cause : `PATCH /api/regulations/:id` restait toujours envoyé au
      handler MSW, qui cherche la régulation dans le corpus mocké — jamais dans le
      corpus réel de Thư (`EXT-EU-AML-001` etc.), donc toujours 404. Corrigé par un
      overlay purement local (`frontend/src/lib/api/regulation-assignee-overrides.ts`),
      indépendant à la fois du backend (qui n'a pas ce champ) et du corpus MSW — voir
      `docs/known-limitations.md` point 6.
    - **L'assigné choisi à une escalade (`PUT /api/mappings/:id/assignee`) redevenait
      « Non assigné » à l'écran après un rechargement**, alors qu'il était bien persisté
      côté backend (confirmé par `GET /api/mappings/all`). Cause : `assembleMappedFinding`
      (`finding-adapt.ts`) ne relisait jamais le champ `assignee` de la réponse — la
      valeur était sauvegardée, seulement jamais réaffichée. Une ligne oubliée depuis le
      branchement initial de `validateMapping` (2026-09-09 soir, plus tôt la même
      session). Corrigé, testé en conditions réelles (escalade + assignation, rechargement
      de page, l'assigné reste affiché) et deux tests ajoutés
      (`finding-adapt.test.ts`).
14. **Nouveau (v1.6, 2026-09-09 nuit)** : `Finding.explanation_fr` /
    `recommended_action_fr`, en réponse au commit `ea02f49` de Thư (« Add French for
    explanation and recommendation », `explanation_lang_fr`/`recommended_action_lang_fr`
    sur `MappingRead`) — résout le point ouvert n°5 (textes générés non localisables).
    Branché côté frontend (`finding-adapt.ts`, `lib/localized-text.ts::pickLocalizedText`,
    utilisé dans `finding-action-row.tsx` et le nouveau `finding-detail-dialog.tsx`) :
    l'écran choisit la variante à afficher selon la langue de l'interface, sans refetch
    au changement de langue (les deux variantes sont déjà chargées).
    **Bug réel trouvé en testant, même famille que le point 7 ci-dessus** : Thư a ajouté
    les deux colonnes au modèle sans migration (encore une fois — `alembic/versions/`
    reste gitignoré côté backend), cassant `GET /api/mappings/*` en entier sur toute
    base locale plus ancienne (`no such column:
    requirement_procedure_map.explanation_lang_fr`, HTTP 500). Corrigé en relançant
    l'outillage local existant (`scripts/local-dev/seed_dev_db.py::sync_missing_columns`,
    déjà écrit le 2026-09-09 matin pour le même problème sur `assignee`) — aucun code
    frontend à changer, juste relancer le script après un pull backend qui touche au
    modèle. **Vérifié en conditions réelles** : `explanation_lang_fr` posé manuellement
    sur `MAP-0001` en base, rechargement de l'écran → « Action recommandée » dans le
    tableau et « Constat proposé »/« Action recommandée » dans `FindingDetailDialog`
    affichent bien le texte français, valeur remise à `NULL` après vérification.
15. **Bug réel trouvé le 2026-09-09 (nuit), sans lien avec un commit backend** : un
    jeton JWT expiré (60 min, session ouverte depuis plusieurs heures) laisse
    `SessionProvider` croire l'utilisateur toujours connecté (le topbar affiche encore
    son nom) alors que `sessionStorage` n'a plus de jeton — chaque appel
    `backendFetch` lève alors `ApiError("UNAUTHENTICATED", …)` **avant tout appel
    réseau** (pas de requête visible, pas de `console.error`), et chaque écran affiche
    l'erreur générique « Le chargement a échoué » sans indiquer qu'il s'agit d'une
    session expirée. Contourné cette session par une déconnexion/reconnexion manuelle,
    **pas corrigé** : `AuthGuard`/`SessionProvider` ne réagissent pas à un jeton
    manquant détecté après coup, seulement à l'absence de `user` en mémoire. Piste pour
    une session future : sur `ApiError.code === "UNAUTHENTICATED"`, forcer
    `signOut()` (pas seulement purger le jeton) pour renvoyer vers l'écran de
    connexion au lieu d'un message d'erreur générique.
16. **Nouveau (v1.9, 2026-09-11, pull suivant)** : `Requirement.normalized_requirement_fr` /
    `.source_text_fr`, en réponse au commit `be74658` de Thư (« Add requirement and title in
    French », `title_lang_fr`/`requirement_text_lang_fr` sur `RegulatoryRequirement`) — même
    famille que le point 14 ci-dessus, appliquée cette fois à l'exigence plutôt qu'au constat.
    Branché côté frontend (`lib/api/backend/schemas.ts`, `adapt.ts::adaptRequirement`,
    `lib/localized-text.ts::pickLocalizedText`, utilisé dans `requirements-tab.tsx`,
    `finding-action-row.tsx` et `finding-detail-dialog.tsx`) : même mécanique que
    `explanation_fr`/`recommended_action_fr`, aucun nouveau composant. **⚠️ Piège déjà vu au
    point 14 : colonnes ajoutées sans migration** (`alembic/versions/` toujours gitignoré côté
    backend) — sur une base locale antérieure au 2026-09-10, `GET /api/requirements/*` cassera
    avec `no such column: regulatory_requirement.title_lang_fr` tant que
    `scripts/local-dev/seed_dev_db.py` (qui appelle `sync_missing_columns()`, générique, aucun
    changement nécessaire de ce script) n'a pas été relancé après ce pull.

    **Même pull, hors contrat (commit `462fd58`, « extend signin time »)** : durée du jeton JWT
    allongée de 60 à 1440 minutes — voir `docs/known-limitations.md` point 12, mis à jour.
