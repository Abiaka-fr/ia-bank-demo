# Phase 2 — Dashboard & Analyse Réglementaire (≈ Semaine 2)

Source : Full Project Guide, section 17, colonne "Developer A", semaine 2.

## Objectif

Construire les deux premiers écrans réels avec des données représentatives, et commencer
l'intégration API réelle si le backend de Thư expose déjà quelque chose (sinon rester sur mock,
sans bloquer).

> **État au 2026-09-07 — portée frontend terminée.** Les revues successives de Giang ont fait
> construire en Phase 1 la quasi-totalité des points 1 et 2 ci-dessous, puis la session du
> 2026-09-07 a clos les deux derniers points concrets (recherche/filtre des exigences, branchement
> du backend réel — y compris les constats, routés par Thư en cours de journée). Ce qui reste dans
> « Reste à faire » plus bas n'est plus du développement frontend : c'est soit une décision à
> prendre en revue avec Thư, soit le déploiement Vercel.


> ⚠️ Rappel : toute nouvelle chaîne UI ajoutée dans cette phase va dans `messages/fr.json` ET `messages/en.json` (voir `frontend/CLAUDE.md` section Bilingue). Aucune exception.
## Portée (frontend uniquement)

1. **Écran Dashboard** (`docs/ui-guidelines.md` + brief section 9.1) :
   - KPI cards (Requirements Identified, Procedures Impacted, Potential Gaps, Expert Reviews
     Required, Actions Pending)
   - Répartition par domaine (KYC/AML/Sanctions/...)
   - Répartition par statut d'assessment (voir code couleur `docs/glossary.md`)
   - Liste des top findings prioritaires + CTA vers Impact Analysis
2. **Écran Analyse Réglementaire** (brief section 9.2) :
   - Métadonnées du document (titre, autorité, langue, version, date d'effet)
   - Viewer du texte extrait
   - Liste des exigences (REQ-XXX) avec filtre/recherche par domaine et mot-clé
3. Intégrer `docs/api-contract.md` réellement (`GET /api/regulations`, `/api/regulations/:id`,
   `/api/regulations/:id/requirements`, `/api/dashboard/summary`) — via TanStack Query, en gardant
   le mock MSW comme fallback si le backend n'est pas encore dispo pour un endpoint donné.
4. Tous les textes UI en français (voir `docs/ui-guardrails.md` pour les formulations).

## Definition of Done

- [x] Dashboard affiche les KPI et la répartition avec des données réelles ou mock cohérentes
      *(fait en Phase 1 : KPI consolidés, répartition par domaine et par statut, tableau par
      régulation, carte des impacts)*
- [x] Écran Analyse Réglementaire navigable pour au moins 1 régulation du corpus de démo
      *(fait en Phase 1 : liste + détail à onglets Vue d'ensemble / Exigences / Analyse d'impact /
      Texte source)*
- [x] **Recherche/filtre des exigences fonctionne** *(fait le 2026-09-07 : recherche plein texte
      — identifiant, référence, texte normalisé et source — et filtre par domaine sur l'onglet
      « Exigences », en local sur les exigences déjà chargées ; `RequirementsTab`, 60 tests dont
      les nouveaux passent)*
- [x] Aucun texte codé en dur qui viole `docs/ui-guardrails.md`
      *(tout passe par next-intl, parité FR/EN vérifiée par un test)*
- [x] `PROGRESS.md` mis à jour
- [x] Backend réel branché pour tout ce qu'il couvre, y compris les constats depuis le
      2026-09-07 *(voir section B/D plus bas — reste sur MSW : upload, validation humaine,
      historique, `GET /api/users`, agrégats bruts du tableau de bord)*

## Reste à faire en Phase 2 (état réel après lecture du backend de Thư)

> Le backend existe désormais (FastAPI + PostgreSQL, 9 endpoints). Il expose un **modèle de données
> différent** du contrat et **ne couvre pas encore le cœur du produit**. L'analyse complète des
> écarts est dans **`docs/backend-integration.md`** — à lire avant toute tâche d'intégration.
> Rappel : `backend/` est en **lecture seule** pour une session frontend (`CLAUDE.md` § 2).

### A. Bloquant — à trancher en revue commune avec Thư (avant de coder l'intégration)

1. **`version_id` courant d'un document — contourné en attendant la revue.**
   `/api/documents/content/{version_id}` en a besoin, aucun endpoint ne le renvoie. En attendant,
   `frontend/src/lib/api/backend/current-version-id.ts` le reconstruit à partir d'une convention
   **vérifiée sur les 88 lignes de `document_versions` de la base de référence**
   (`VER-{document_id}-{version_no}`) et échoue bruyamment si elle ne tient plus. À proposer en
   revue : un champ `current_version_id` sur `DocumentRead`.
2. ~~Qui produit les `Finding`~~ — **résolu par Thư le 2026-09-07** (commit `db41421`,
   « Api get map of requirement and procedure ») : `GET /api/mappings/all`,
   `/requirements-to-procedures`, `/procedures-to-requirements` routent enfin
   `requirement_procedure_map`. Branché côté frontend le jour même
   (`frontend/src/lib/api/backend/finding-adapt.ts`). Reste ouvert : un lien vers un passage
   précis du document interne (`chunk_id` sur le mapping — aujourd'hui, la preuve interne n'est
   qu'un extrait non ciblé pris en tête de document, honnêtement étiqueté comme tel), et
   confirmer que `risk_level` de l'exigence fait bien office de `priority` du constat.
3. **Quel corpus fait foi pour la démo client** : les `.docx` du projet (dont les 9 écarts KYC/AML
   ont été construits à la main, ce qui rend la démo parlante) ou les 32 documents `SYNTHETIC_DEMO`
   de la base backend. **Toujours ouvert** — le frontend sait maintenant parler aux deux
   (`NEXT_PUBLIC_BACKEND_URL`, voir point 8), donc ce n'est plus bloquant pour coder, seulement pour
   savoir lequel montrer en démo client.
4. **Conventions transverses** : format d'erreur (`{error:{code,message}}` vs `{detail}`), enveloppe
   de pagination (`{total, items, limit, offset}`). **Absorbées côté frontend** dans
   `frontend/src/lib/api/backend/` (voir point 7) — la question reste ouverte pour une convergence
   définitive, mais elle ne bloque plus l'intégration.
5. Points hérités du contrat, toujours ouverts : localisation des textes générés (concerne
   maintenant aussi `Finding.explanation`/`recommended_action`, en anglais dans le corpus
   backend), suivi de l'avancement de `POST /analyze`, `GET /api/users` pour l'assignation.
6. **Nouveau (2026-09-07)** : validation humaine des constats (Accepter/Rejeter/Escalader) —
   aucune route backend, reste entièrement sur MSW dans les deux modes. Sans elle, un constat
   chargé depuis le backend réel ne peut être « traité » que dans le mock (l'onglet Historique
   n'enregistre donc que les décisions prises en mode mock).

### B. Réalisable dès maintenant côté frontend — fait le 2026-09-07

6. **Authentification alignée sur le backend réel.** `frontend/src/lib/api/backend/resources.ts`
   appelle `POST /api/auth/signin`, lit `access_token`, et `frontend/src/lib/api/backend/client.ts`
   pose `Authorization: Bearer` sur toutes les requêtes backend ; un 401 purge le jeton
   (`lib/api/token.ts`) pour renvoyer vers la connexion plutôt que de boucler. `POST /api/auth/signup`
   non branché (aucun écran d'inscription dans le périmètre de la démo).
7. **Couche d'adaptation** dans `frontend/src/lib/api/backend/` : `schemas.ts` (miroir Zod des
   réponses réelles), `adapt.ts` (fonctions pures testées — `domain` chaîne → tableau,
   `requirement_text` → `source_text`, `title` → `normalized_requirement`,
   `origin_code`/`origin_name` → `authority_or_owner`, chunks → texte recollé), `client.ts`
   (`{detail}` → `ApiError`). Les écrans n'ont pas changé.
8. **Branché endpoint par endpoint**, avec bascule par variable d'environnement
   (`NEXT_PUBLIC_BACKEND_URL`, voir `frontend/src/lib/api/backend/config.ts`) : connexion, liste des
   régulations et procédures (`/api/documents` filtré par `category`), détail + texte source,
   exigences (`/api/requirements/by-documents`, filtre `domain` transmis au serveur), et depuis
   l'après-midi du 2026-09-07, **les constats** (`GET /api/mappings/requirements-to-procedures`,
   adaptés dans `finding-adapt.ts`). Le tableau de bord (`/dashboard/overview`, `/summary`, `/map`)
   n'a pas d'équivalent backend : recalculé **côté client** à partir des exigences et constats réels
   avec les mêmes fonctions pures que MSW (`buildPortfolioSummary`/`buildDashboardSummary`/
   `buildRegulationMap`), pas une deuxième implémentation. Seuls l'upload, la validation humaine et
   `GET /api/users` restent entièrement sur MSW — le backend ne les expose pas du tout. Vérifié en
   conditions réelles à deux reprises (matin : documents/exigences ; après-midi : constats +
   tableau de bord complet) : backend lancé en local (voir point 10), 8 régulations
   `SYNTHETIC_DEMO`, texte source recomposé, exigences et constats réels affichés avec preuves,
   tableau de bord et carte des impacts alimentés en vrais chiffres — zéro erreur console à chaque
   fois. Aucun schéma Zod assoupli.
9. **Recherche et filtre des exigences.** Fait dans `RequirementsTab` : recherche plein texte
   (identifiant, référence, texte normalisé, texte source) et filtre par domaine, en local sur les
   exigences déjà chargées par l'écran.
10. **Backend exécutable en local sans PostgreSQL** — `scripts/local-dev/` (hors `backend/`, lecture
    seule respectée) : le code de Thư n'a aucun type de colonne spécifique à PostgreSQL, donc il
    tourne tel quel sur la base SQLite de référence, déjà committée avec 1 262 lignes de démo.
    `setup-backend.sh` crée un venv, copie la base dans `.local/` (jamais l'original), ajoute la
    table `users` (absente) et 4 comptes de démonstration ; `run-backend.sh` démarre le serveur.
    Voir `scripts/local-dev/README.md`. Python 3.9 (celui de macOS) est trop ancien pour le code de
    Thư (`requires-python >= 3.10`) — `brew install python@3.12` a été nécessaire sur cette machine.
11. **Premier déploiement Vercel** — hérité de la Phase 1, **toujours à faire**.
    `frontend/vercel.json` est prêt ; régler **Root Directory = `frontend`** et Node 22 dans le
    projet Vercel.

### D. Fait le 2026-09-07 après-midi (au-delà de la portée initiale de la Phase 2)

Demandes de Giang après avoir vu le tableau de bord alimenté en données réelles pour la première
fois — techniquement de la Phase 3/4 (Impact Analysis, Evidence, tableau de bord), traitées ici
parce qu'elles touchaient les mêmes écrans que le reste de la session :

13. Tableau de bord et carte des impacts filtrés sur les régulations **non entièrement traitées**,
    paginés (5/page) ; KPI et graphiques ne comptent plus que les constats **encore en attente**.
14. `RegulationMindmap` réutilisé (prop `regulationId`) dans l'onglet « Vue d'ensemble » d'une
    régulation — un seul composant pour le portefeuille et pour une régulation, jamais deux.
15. Navigation cliquable généralisée : ligne du tableau de bord, carte d'exigence, ligne
    d'analyse d'impact — plus seulement la flèche ou le bouton.
16. Rendu Markdown minimal (`lib/simple-markdown.ts`) pour le texte source et les preuves —
    jusqu'ici les `#`/`**` du corpus backend s'affichaient tels quels.
17. Fenêtre de lecture de procédure agrandie (~60 % de l'écran) ; un vrai bug de débordement
    trouvé en vérifiant visuellement (ScrollArea + `flex-1` sans `overflow-hidden`), corrigé.
18. Force de la preuve colorée rouge/jaune/vert — exception documentée à la règle « niveaux de
    gris » (`docs/ui-guidelines.md`).
19. **Nouvel onglet Historique** — contrat v1.3 (`actor_id` sur `validate`,
    `GET /api/regulations/:id/history`), MSW uniquement.

Détail complet (fichiers touchés, tests, vérifications) dans `PROGRESS.md`, entrées du 2026-09-07.

### E. Souhaitable si le temps le permet

12. **Écran Procédures internes** : le backend les expose déjà via
    `/api/documents?category=INTERNAL`, et la fenêtre de lecture d'une procédure existe déjà.
    `frontend/src/lib/api/procedures.ts` sait déjà les lister en mode backend réel ; reste à
    construire l'écran dédié (aujourd'hui, seul l'écran Régulations existe). **Toujours pas fait.**
20. **Persistance des filtres/tri de l'onglet Analyse d'impact dans l'URL** — repris du DoD de la
    Phase 3 (`docs/phases/phase-3-impact-engine.md`), jamais fait : filtres statut/priorité/
    validation en `useState` local, perdus au partage d'un lien ou au rechargement.
