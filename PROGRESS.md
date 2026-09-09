# Suivi du Projet — IA Bank Regulatory AI Copilot

> Toute session doit lire ce fichier en premier et le mettre à jour avant de terminer.

## Phase actuelle

**Phase 1 — Fondations** : terminée le 2026-09-04.

**Phase 2 — Dashboard & Analyse Réglementaire** (`docs/phases/phase-2-core-ui.md`) : **portée
frontend terminée le 2026-09-07.** Tout ce que le frontend pouvait faire seul est fait : recherche/
filtre des exigences, branchement du backend réel de Thư endpoint par endpoint (auth, documents,
exigences, et depuis le 2026-09-07 après-midi les constats via `GET /api/mappings/*`), backend
exécutable en local sans PostgreSQL. Il ne reste que des points qui ne dépendent pas d'une session
de code frontend : le **déploiement Vercel** et des **décisions à prendre avec Thư en revue commune**
(voir « Reste à faire » dans le fichier de phase). Détail complet en bas de ce fichier.

**Phase 5 — Client Readiness, points 1/3/5(doc) traités le 2026-09-09** (`docs/phases/phase-5-client-readiness.md`), pas Phase 3.
Les Phases 3 (Impact Analysis) et 4 (Evidence & validation humaine) ont leur portée frontend déjà
couverte — construites en avance dès la Phase 1 puis complétées le 2026-09-07. Un seul point mineur
reste ouvert pour ces deux phases : la persistance des filtres/tri dans l'URL sur l'onglet Analyse
d'impact. **Déploiement Vercel fait par Giang le 2026-09-09.** Relecture bilingue complète faite
(rien trouvé à corriger), `error.tsx`/`not-found.tsx`/`global-error.tsx` ajoutés (trou réel trouvé
en testant : une route inexistante plantait avec « Missing <html> and <body> tags »),
`docs/known-limitations.md` créé. Reste de la Phase 5 : rejouer le script de démo sur
l'environnement Vercel déployé (pas seulement en local).

**Côté backend, 4 nouveaux commits de Thư lus le 2026-09-09** (`GET /api/users`,
`PUT /api/mappings/:id/human-status`+`/assignee`, `POST /api/documents/{id}/update`,
`current_version: str|float`) — deux bugs réels trouvés et corrigés côté frontend/outillage local
au passage (schéma Zod pas à jour, colonne backend sans migration cassant tout `/api/mappings/*`).
**`GET /api/users` et la validation humaine réelle (`PUT /api/mappings/:id/human-status`+
`/assignee`) branchés côté frontend le 2026-09-09 soir**, vérifiés en conditions réelles (Accepter
et Escalader+assignation persistent bien sur le backend local, un troisième bug réel trouvé et
corrigé au passage — voir l'entrée du soir plus bas). Détail complet dans
`docs/backend-integration.md`.

Phase 0 — Initialisation : terminée le 2026-09-04.

## Résumé d'avancement

- [x] Corpus de démo généré : 12 procédures internes (FR) + 2 réglementations (ACPR-FR, EBA-EN)
- [x] Scaffolding projet créé (CLAUDE.md, phases, contrat d'API, guidelines)
- [x] Frontend Next.js bootstrappé (Next 16 App Router, TS strict, Tailwind v4, shadcn/ui)
- [x] Bilingue FR/EN opérationnel (next-intl, routing `/[locale]`, toggle en top bar, clés FR/EN
      synchronisées et vérifiées par un test)
- [x] 5 routes en place (Dashboard, Analyse réglementaire, Analyse d'impact, Preuves, Copilot)
- [x] Client API typé + validation Zod à l'exécution contre `docs/api-contract.md`
- [x] Couche de mock MSW couvrant **tous** les endpoints du contrat
- [x] Slice verticale de bout en bout (1 régulation → 9 exigences → 12 procédures → constats
      couvrant les 5 statuts → preuves côte à côte → Accepter/Rejeter/Escalader) fonctionnelle en
      mock, vérifiée dans le navigateur
- [x] Authentification de démonstration (écran de connexion, session, utilisateurs assignables)
- [x] Upload de régulation (.docx uniquement) avec assignation, modifiable sur la carte
- [x] Dashboard consolidé sur toutes les régulations + détail par régulation
- [ ] Contrat d'API **v1.1** validé avec Thư (backend) — **à faire en réunion, voir ci-dessous**
- [x] Backend bootstrappé par Thư — FastAPI + PostgreSQL + SQLAlchemy/Alembic, 9 endpoints
      (auth JWT, documents, exigences). Voir `backend/API.md`.
- [x] Backend : constats (`Finding`) — routés par Thư le 2026-09-07
      (`GET /api/mappings/*`), voir plus bas
- [x] Backend : validation humaine — routée par Thư le 2026-09-07 après-midi
      (`PUT /api/mappings/:id/human-status`+`/assignee`), **branchée côté frontend le
      2026-09-09 soir**. Liste des utilisateurs (`GET /api/users`) branchée le même soir.
- [ ] Backend : agrégats de tableau de bord (`/dashboard/overview`, `/summary`, `/map`)
      et journalisation des décisions (`actor_id`) — **toujours non commencés côté
      backend**, restent sur MSW dans les deux modes du frontend
- [x] Frontend branché sur le backend réel pour ce qu'il couvre — connexion, régulations,
      procédures, exigences (couche d'adaptation `frontend/src/lib/api/backend/`, bascule
      par `NEXT_PUBLIC_BACKEND_URL`). Constats, tableau de bord, upload, validation humaine
      restent sur MSW, le backend ne les expose pas encore.
- [x] Backend exécutable en local sans PostgreSQL (`scripts/local-dev/`, voir README dédié) —
      utile tant que Thư n'a pas encore déployé le sien sur un serveur accessible.
- [x] Constats (`Finding`) branchés sur le backend réel — Thư a routé
      `GET /api/mappings/*` le 2026-09-07 ; adaptés côté frontend
      (`frontend/src/lib/api/backend/finding-adapt.ts`), limite assumée documentée sur
      la précision de la preuve interne (extrait non ciblé, faute de lien vers un
      passage précis côté backend — voir `docs/backend-integration.md` § 4)
- [x] Tableau de bord (portefeuille + par régulation) ne compte plus que le travail
      **restant** (constats encore en attente), régulations/carte des impacts filtrées
      sur le non-100 %, paginées — voir notes du 2026-09-07
- [x] Onglet **Historique** des décisions humaines (qui, quoi, quand) — contrat v1.3,
      `GET /api/regulations/:id/history`, MSW uniquement (comme la validation dont il
      découle)
- [ ] Contrat d'API v1.3 validé avec Thư (`actor_id` sur `validate`, endpoint
      `/history`) — **à faire en réunion**
- [x] Déploiement Vercel (frontend) — fait par Giang le 2026-09-09
- [x] Phase 5 : filets de sécurité Next.js (`error.tsx`, `not-found.tsx`, `global-error.tsx`)
      pour ne plus jamais montrer un écran blanc/une erreur runtime brute en démo
- [x] `docs/known-limitations.md` — limitations connues reformulées pour un public client
- [ ] Phase 5 : rejouer le script de démo (7 min) sur l'environnement Vercel déployé

## Journal des décisions

- **2026-09-04** — Architecture confirmée : hybride, Frontend (Giang) = Next.js 15 (App Router) +
  TypeScript + Tailwind + shadcn/ui ; Backend + pipeline IA (Thư) = stack libre, à documenter par
  elle dans `backend/README.md` une fois choisie. Déploiement : Vercel (frontend) +
  Railway/Render (backend). Frontière stricte : `frontend/` et `backend/` ne se parlent que via
  `docs/api-contract.md`.
- **2026-09-04** — Corpus de démo : procédures internes en français, 2 réglementations construites
  (ACPR-FR, EBA-EN) avec 9 scénarios d'écart volontairement conçus (voir table de mapping dans la
  conversation Cowork du 2026-09-04, à reporter dans `docs/glossary.md`/`docs/api-contract.md` si
  utile aux golden test cases).

- **2026-09-04** — Bilingue FR/EN élevé de "P2 optionnel" (statut dans la brief originale) à
  **exigence obligatoire dès la Phase 1** : next-intl configuré dès le bootstrap, toggle FR/EN dans
  la top bar, `messages/fr.json`/`messages/en.json` toujours synchronisés. Décision de Giang.
- **2026-09-04** — Outillage UI ajouté : serveur MCP shadcn/ui (accès direct au registre de
  composants réel) + boucle obligatoire "coder → capturer une capture d'écran → comparer à
  `docs/ui-guidelines.md` → corriger" avant de considérer une tâche UI terminée. Palette de couleurs
  validée (statuts + graphiques) figée dans `docs/ui-guidelines.md`.

## Blocages / Questions ouvertes

- Stack backend de Thư pas encore choisie → le frontend doit démarrer avec des données mockées
  respectant `docs/api-contract.md` en attendant.
- **⚠️ Le backend de Thư diverge du contrat — analyse complète dans `docs/backend-integration.md`.**
  Le backend existe et fonctionne, mais il expose un modèle de données différent et ne couvre pas
  encore le cœur du produit (aucun `Finding`, aucun agrégat, pas d'upload, pas de validation
  humaine). Quatre points bloquants à trancher en revue commune :
  1. **Comment obtenir le `version_id` courant d'un document** — `/api/documents/content/{version_id}`
     en a besoin, aucun endpoint ne le renvoie. Bloque l'onglet « Texte source ».
  2. **Qui produit les `Finding`** et sous quelle forme. Les modèles `mapping.py` / `control.py` /
     `audit.py` existent côté backend mais ne sont exposés par aucune route.
  3. **Quel corpus fait foi** : les `.docx` du projet (9 écarts KYC/AML construits à la main, ce qui
     fait la démo) ou les 32 documents `SYNTHETIC_DEMO` de la base backend.
  4. **Conventions** : format d'erreur, enveloppe de pagination, `domain` liste ou chaîne.

  Sur l'authentification, **c'est le backend qui a raison** : il fait du vrai JWT là où le frontend
  simule. Le frontend s'alignera (`signin` et non `login`, en-tête `Authorization` partout).

- **Contrat d'API v1.1 puis v1.2 — proposition écrite, non validée. Revue avec Thư à programmer.** Le
  contrat porte désormais un bandeau « v1.1 » et les blocs modifiés sont marqués `// v1.1`. Le
  frontend et la couche de mock sont déjà alignés dessus ; le backend ne doit s'y aligner qu'après
  la revue commune. Changements demandés par Giang le 2026-09-04 :
  1. **`Finding` devient un couple (exigence × procédure)** — `procedure_id: string | null` remplace
     `matched_procedure_ids: string[]`. Une exigence touchant deux procédures produit deux constats,
     chacun avec son action recommandée et sa propre validation humaine. C'était la question
     ouverte : que faire quand une exigence impacte deux procédures et demande deux actions.
  2. **`custom_action`** — le relecteur peut retenir une action différente de celle proposée.
     Champ vide = l'action recommandée s'applique.
  3. **Utilisateurs et assignation** — type `User`, endpoints `/api/auth/*` et `/api/users`,
     `assignee_id` sur `DocumentMeta` (qui traite la régulation) et sur `Finding` (à qui un constat
     est confié lors d'une escalade).
  4. **`GET /api/dashboard/overview`** — agrégats sur toutes les régulations (`PortfolioSummary`),
     qui alimentent aussi les cartes de la liste pour éviter un appel par carte.
  5. **`POST /api/regulations`** prend `file` (.docx), `file_name`, `assignee_id`, `uploaded_by_id` ;
     ajout de `PATCH /api/regulations/:id` pour changer l'assignation.
  6. **v1.2 — `by_human_status`** sur `RegulationSummary` et `DashboardSummary` : répartition des
     constats par décision humaine. `DocumentMeta.status` ne décrit que l'avancement de l'analyse
     automatique ; il ne disait rien de l'avancement de la revue humaine, ce qui rendait les
     chiffres du tableau de bord difficiles à interpréter (question soulevée par Giang).
  7. **v1.2 — `GET /api/dashboard/map`** (`RegulationMapNode[]`) : arborescence
     Régulation → Exigence → Procédure alimentant la carte mentale du tableau de bord.
- **Points du contrat encore ouverts (à trancher avec Thư) :**
  1. **`Finding.explanation` / `recommended_action` / `Requirement.normalized_requirement` ne sont
     pas localisables.** Ces textes viennent du backend et s'affichent tels quels : en interface EN,
     l'utilisateur voit du français. À trancher : le backend génère-t-il dans la langue demandée
     (paramètre `?language=`), ou renvoie-t-il un objet `{ FR, EN }` ? (Ne concerne pas
     `EvidenceRef.excerpt`, qui reste par principe dans sa langue source.)
  2. **`POST /api/regulations/:id/analyze` est asynchrone mais aucun moyen de suivre l'avancement
     n'est documenté.** Le frontend ne sait pas quand repasser `status` de `ANALYZING` à `ANALYZED`.
     À définir : polling sur `GET /api/regulations/:id`, ou endpoint de statut dédié. Devient
     bloquant maintenant que l'upload existe : une régulation importée reste en `NOT_ANALYZED`.
  3. **Authentification réelle.** L'écran de connexion actuel est une simulation frontend (mot de
     passe unique de démo, session en `sessionStorage`). Aucun contrôle d'accès réel. À décider si
     le POC en a besoin, ou si cela reste hors périmètre.
- **Déploiement Vercel (Phase 1, point 8) — non fait.** `frontend/vercel.json` est prêt, mais le
  déploiement demande un accès au compte Vercel. Point d'attention : le dépôt contenant aussi
  `backend/`, il faut régler **Root Directory = `frontend`** dans le projet Vercel.
- **Version de Node.** La machine de développement tourne sur Node 20.20.2 ; Vitest 5 et jsdom 30
  déclarent `engines: node >= 22`. `jsdom` a été épinglé en v26 pour que `pnpm test` passe sur
  Node 20. Un `.nvmrc` (22) a été ajouté : passer la machine en Node 22 permettra de dépingler.

## Notes de fin de session

> Ajouter une entrée ici à la fin de chaque session : date, ce qui a été fait, ce qui reste, tout
> point de blocage. Ne pas écraser les entrées précédentes.

- **2026-09-04 (Cowork — initialisation)** : création du scaffolding complet du dépôt (CLAUDE.md,
  README, PROGRESS, docs/api-contract.md, docs/glossary.md, docs/ui-guardrails.md,
  docs/ui-guidelines.md, docs/phases/phase-1 à phase-6, frontend/CLAUDE.md, backend/README.md,
  commande `/pre-code-check`). Rien codé encore. Prochaine étape : ouvrir une session Claude Code
  dans `frontend/` et suivre `docs/phases/phase-1-foundation.md`.

- **2026-09-04 (Claude Code — Phase 1, frontend)** : implémentation de la portée frontend de la
  Phase 1 dans `frontend/`.

  **Fait :**
  - Bootstrap Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui (base Radix,
    preset nova). `pnpm` via corepack.
  - Bilingue FR/EN dès le départ : next-intl, routing `/[locale]/…`, middleware dans `src/proxy.ts`
    (Next 16 a renommé `middleware.ts` en `proxy.ts`), toggle FR/EN dans la top bar,
    `src/messages/fr.json` et `en.json` à 139 clés strictement identiques — un test Vitest échoue si
    une clé n'existe que d'un côté ou si une traduction est vide.
  - 5 routes : `/dashboard`, `/regulations` (+ `/regulations/[id]`), `/impact-analysis`,
    `/evidence` (+ `/evidence/[findingId]`), `/copilot` (placeholder assumé, P2).
  - `src/types/api.ts` : miroir de `docs/api-contract.md`. Schémas Zod ET types TypeScript inférés
    des schémas — une seule définition par entité, pas de duplication type/validateur.
  - `src/lib/api/` : un fichier par ressource. Chaque réponse est validée par Zod ; une réponse hors
    contrat lève une `ApiContractError` affichée comme erreur explicite au lieu de casser l'écran.
  - `src/lib/mocks/` : handlers MSW couvrant **tous** les endpoints du contrat (y compris
    `/api/copilot/ask`, qui répond explicitement qu'aucune preuve n'a été trouvée plutôt que
    d'inventer une réponse sans citation). Corpus de démo tiré des `.docx` réels : 2 régulations,
    12 procédures internes, 9 exigences (articles 1 à 9 de l'instruction ACPR), 9 constats couvrant
    les 5 valeurs d'`assessment`. Les écarts sont ceux réellement construits dans le corpus
    (KYC-004 : 2/8/10 ans contre 1/5/10 ans exigés ; article 4 sans procédure correspondante ;
    SAN-001 limité aux PPE étrangères ; CORR-001 sans périodicité de réévaluation…).
  - Slice verticale démontrable : régulation → exigences → constat → preuves côte à côte →
    Accepter / Rejeter / Escalader avec commentaire. La décision remonte dans la table d'analyse
    d'impact et dans les KPI du dashboard. Elle est persistée en `sessionStorage` pour survivre à un
    rechargement pendant une démo (un nouvel onglet repart du corpus d'origine).
  - Palette de `docs/ui-guidelines.md` figée en variables CSS dans `globals.css` et exposée via un
    seul module `src/lib/assessment.ts` — aucune couleur de statut codée en dur ailleurs. Chaque
    statut est rendu avec icône + libellé, jamais la couleur seule.
  - Tests Vitest : 21 tests / 5 fichiers (parité des dictionnaires, agrégation du dashboard,
    validation du contrat d'API et round-trip de validation humaine contre les mêmes handlers MSW,
    accessibilité des badges de statut, traçabilité et non-traduction des extraits de preuve).
  - `src/scripts/screenshot.ts` : boucle de vérification visuelle Playwright (10 écrans FR + EN),
    échoue si une erreur console apparaît. Captures dans `frontend/screenshots/` (gitignoré).

  **Vérifié :** `pnpm lint`, `pnpm typecheck`, `pnpm test` (21/21), `pnpm build` passent tous. Flux
  complet rejoué dans un navigateur piloté (sélection de régulation → détail → constat → validation
  → propagation à la table → bascule FR/EN) sans erreur console. Écrans comparés à
  `docs/ui-guidelines.md`.

  **Corrigé en cours de route grâce à la boucle visuelle :** `worker.start()` de MSW appelé deux
  fois (double montage des effets en dev) ; `TableCell` de shadcn en `whitespace-nowrap` faisant
  déborder la table hero ; titres de procédures répétant leur identifiant ; validations perdues au
  rechargement ; libellé « Analyser cette régulation » sur un bouton qui ne fait que sélectionner.

  **Reste à faire pour clore la Phase 1 :** les deux points « Blocages » ci-dessus (revue du contrat
  d'API avec Thư — 3 questions listées ; premier déploiement Vercel avec Root Directory = `frontend`).

- **2026-09-04 (Claude Code — revue Giang, refonte v1.1)** : sept demandes de correction après la
  revue visuelle de la Phase 1. Toutes traitées.

  1. **Police à empattements corrigée.** `globals.css` (preset shadcn) lit `--font-sans`, alors que
     `next/font` déclarait la variable `--font-geist-sans` : `font-sans` était vide et le navigateur
     retombait sur une police à empattements. Une seule ligne, mais invisible à la lecture du code.
  2. **Écran de connexion** (`/[locale]/login`) : formulaire e-mail + mot de passe, 4 utilisateurs
     de démonstration, mot de passe unique affiché sous le formulaire. Session en `sessionStorage`,
     garde de route sur tout le groupe `(app)`. **Ce n'est pas de la sécurité** — voir le point
     ouvert dans « Blocages ».
  3. **Dashboard consolidé** : l'écran d'accueil agrège désormais toutes les régulations (KPI global
     + tableau détaillé par régulation). L'ancien dashboard par régulation est devenu l'onglet
     « Vue d'ensemble » de la page de détail.
  4. **Upload de régulation** : bouton dans la liste, `.docx` uniquement (filtré côté client ET
     refusé côté serveur), champ « personne en charge » au moment de l'import. Conformément à la
     décision de Giang, **aucune exigence n'est fabriquée** : la régulation importée reste en
     `NOT_ANALYZED` en attendant l'extraction par le backend.
  5. **Cartes de régulation enrichies** : statut d'analyse, personne ayant importé, personne en
     charge modifiable directement sur la carte, progression « constats traités », et bloc
     « Confié par escalade à » listant les personnes désignées lors d'une escalade lorsqu'elles
     diffèrent du responsable de la régulation.
  6. **Après l'upload**, redirection automatique vers la page de détail de la régulation créée ;
     accessible aussi par « Détail de la régulation » sur chaque carte.
  7. **Écran Preuves refondu en tableau d'actions** (la demande la plus structurante) :
     `Finding` devient un couple (exigence × procédure). Une exigence touchant deux procédures
     produit deux lignes, chacune avec son action recommandée, son champ « action retenue » et ses
     boutons Accepter / Rejeter / Escalader. Champ « action retenue » vide = l'action recommandée
     s'applique. L'escalade exige de choisir la personne à qui le constat est confié. Chaque ligne
     se déplie pour afficher les preuves source côte à côte — un constat n'est jamais affiché sans
     sa traçabilité (`docs/ui-guardrails.md`).

  **Navigation revue** (décision de Giang) : la sidebar passe de 5 à 3 entrées — Tableau de bord,
  Analyse réglementaire, Copilot. « Analyse d'impact » et « Preuves » sont devenus des onglets de la
  page de détail d'une régulation : on ne consulte des constats qu'après avoir choisi la régulation.

  **Corpus de démo** : 9 exigences → 11 constats (REQ-001 et REQ-005 touchent chacune deux
  procédures), couvrant toujours les 5 valeurs d'`assessment`.

  **Vérifié :** `pnpm lint`, `pnpm typecheck`, `pnpm test` (29 tests / 6 fichiers), `pnpm build`
  passent. Parcours complet rejoué dans un navigateur piloté, sans erreur console : connexion,
  mot de passe erroné, escalade avec assignation, remontée de l'assigné sur la carte, refus d'un
  fichier `.txt`, import d'un `.docx` puis redirection vers le détail, bascule FR/EN.

  **Bug réel trouvé par les tests :** la validation « .docx uniquement » s'appuyait sur le nom porté
  par la partie multipart, que certains runtimes ne conservent pas — le contrôle laissait alors
  passer n'importe quel format. Le client envoie désormais `file_name` explicitement et le serveur
  valide dessus (ajouté au contrat).

  **Reste à faire :** revue du contrat v1.1 avec Thư (voir « Blocages »), et premier déploiement
  Vercel (Root Directory = `frontend`).

- **2026-09-04 (Claude Code — preuves cliquables + corpus complété)** :

  - **Preuve interne cliquable.** Dans l'onglet « Analyse d'impact », déplier une ligne puis cliquer
    sur la carte de preuve interne ouvre la **procédure complète** dans une fenêtre, avec le passage
    cité surligné et la vue positionnée dessus. Seules les preuves internes sont cliquables : ce sont
    les seules dont le corpus indexé contient le texte intégral.
  - Le repérage du passage vit dans `src/lib/evidence-match.ts` (fonction pure, 5 tests) : il
    compare dans les deux sens et gère les extraits agrégeant plusieurs passages séparés par
    « […] » — vérifié sur KYC-004 §1 (un passage) et CTRL-001 §1 et §4 (deux passages).
    Surlignage en teinte neutre, les 5 couleurs de statut restant réservées à `assessment`.
  - **Corpus de démo complété.** Les textes de procédure étaient tronqués (points de numérotation
    manquants : KYC-004 affichait 1, 2, 4). Acceptable tant qu'on ne montrait que la citation,
    gênant maintenant que la fenêtre affiche le texte intégral. Les 12 procédures sont désormais
    reprises intégralement du `.docx` source ; un contrôle vérifie qu'aucun trou de numérotation
    ne subsiste.
  - **Corrigé au passage :** deux balises `<main>` imbriquées (`SidebarInset` de shadcn en rend déjà
    une) — HTML invalide et navigation par points de repère cassée pour les lecteurs d'écran.

  **Vérifié :** `pnpm lint`, `pnpm typecheck`, `pnpm test` (34 tests / 7 fichiers) passent. Fenêtre
  de procédure rejouée dans un navigateur (ouverture, surlignage, défilement), sans erreur console,
  et ajoutée à la boucle de capture `pnpm screenshot`.

  **Page blanche signalée par Giang : non reproduite.** Sur son propre serveur (port 3000), la
  navigation `/` → `/fr/login` → connexion → `/fr/dashboard` rend correctement, sans erreur console.
  Cause la plus probable : navigateur ouvert pendant la refonte des routes (le groupe `(app)` a été
  créé et deux routes supprimées), ou service worker MSW en cache. Un rechargement forcé
  (Cmd+Shift+R) suffit ; à re-signaler si cela se reproduit sur un onglet neuf.

- **2026-09-04 (Claude Code — carte des impacts, progression de revue, navigation)** : quatre
  demandes de Giang, toutes traitées.

  1. **Carte des impacts sur le tableau de bord.** Arborescence Régulation → Exigence → Procédure,
     chaque nœud cliquable : la régulation ouvre son détail, l'exigence et la procédure ouvrent
     l'onglet « Analyse d'impact » positionné sur la ou les lignes correspondantes. Rendue en listes
     imbriquées plutôt qu'en graphe dessiné, pour rester navigable au clavier et par un lecteur
     d'écran. Nouvel endpoint `GET /api/dashboard/map` (v1.2 du contrat).
  2. **Progression de la revue à la place du statut d'analyse.** Le badge « Analysée » ne disait
     rien de l'avancement du traitement : il est remplacé, dès qu'il existe des constats, par une
     barre segmentée (En attente / Accepté / Rejeté / Escaladé) avec pourcentage. Visible sur les
     cartes, dans le tableau du dashboard, en tête de la page de détail, et par exigence dans
     l'onglet « Exigences ». Le badge d'analyse ne subsiste que là où il n'y a encore rien à
     traiter. Nouveau champ `by_human_status` (v1.2 du contrat).
  3. **Navigation par lien profond.** L'onglet et l'élément mis en avant vivent dans l'URL
     (`?tab=…&focus=…`, `src/lib/use-regulation-tab.ts`) : chaque vue est partageable, et une
     exigence touchant deux procédures met bien ses deux lignes en avant. Depuis l'onglet
     « Exigences », un bouton « Traiter » mène directement aux lignes de l'exigence.
  4. **Zone de texte source à hauteur variable** (`h-[calc(100svh-22rem)]`) : elle occupait une
     hauteur fixe et laissait la moitié de l'écran vide sur un grand moniteur — 648 px au lieu de
     512 px sur une fenêtre de 1000 px.
  5. **Cartes de régulation entièrement cliquables** : le lien du titre couvre la carte via
     `::after`, les commandes internes (sélecteur d'assignation) repassent au-dessus. Un seul lien
     vers le détail, donc pas de doublon pour un lecteur d'écran.

  **Vérifié :** `pnpm lint`, `pnpm typecheck`, `pnpm test` (38 tests / 7 fichiers) passent. Parcours
  rejoué dans un navigateur, sans erreur console : carte mentale (9 nœuds exigence, 11 nœuds
  procédure), clic exigence → 2 lignes mises en avant, clic procédure → 1 ligne, clic sur une carte
  → détail, onglet Exigences (9 boutons « Traiter »), hauteur du texte source. Les captures
  `fr-focus-requirement` et `fr-regulation-source` rejoignent la boucle `pnpm screenshot`.

  **Corrigé au passage :** dans la carte mentale, « Aucune procédure pertinente » s'affichait deux
  fois (libellé + badge d'évaluation).

- **2026-09-04 (Claude Code — vraie carte mentale + revue générale avant Phase 2)** :

  - **Carte des impacts redessinée.** La première version était un arbre en listes imbriquées :
    Giang a signalé à juste titre que ce n'était pas une carte mentale. Elle est maintenant
    **dessinée** — arbre couché, liaisons en courbes de Bézier tracées en SVG, nœuds arrondis
    colorés par branche. Les nœuds restent des liens HTML posés au-dessus du SVG : navigation au
    clavier et texte sélectionnable conservés, ce que du texte tracé en SVG aurait perdu.
    Le calcul de disposition est une fonction pure testée (`src/lib/mindmap-layout.ts`, 6 tests) :
    une ligne par feuille, chaque parent centré sur ses enfants.
  - **Carte déplacée sous les graphiques**, comme demandé.
  - **Légende ajoutée** : la pastille d'un nœud porte le statut d'évaluation, le sous-titre porte la
    décision humaine.

  **Revue générale avant Phase 2 — trouvé et corrigé :**
  - **La « force de la preuve » avait disparu de l'interface.** Elle était affichée dans l'ancien
    tableau et l'ancien écran Preuves, tous deux remplacés ; le champ existe au contrat et les
    garde-fous encadrent son libellé, mais plus rien ne l'affichait. Réintégrée dans la zone dépliée
    d'une ligne, à côté de l'explication.
  - Code mort supprimé : `findUserById`, `EBA_REGULATION_ID`, et quatre exports rendus internes
    (`reviewProgress`, `REGULATION_TABS`, `categoricalColorVars`, `API_BASE_URL`).
  - `fetchProcedures`, `fetchFindingsByRequirement` et `analyzeRegulation` sont **volontairement
    conservés bien qu'inutilisés par l'UI** : le client API reflète le contrat endpoint par endpoint,
    et `analyzeRegulation` servira dès que le backend suivra l'avancement de l'analyse.

  **Documentation mise à jour pour la Phase 2 :**
  - `frontend/CLAUDE.md` — arborescence réelle (groupe `(app)`, écran de connexion hors coquille,
    onglets du détail), Next 16 et sa convention `proxy.ts`, épinglage de `jsdom`, et mention que
    `pnpm test` échoue tout seul si une clé de traduction manque d'un côté.
  - `docs/ui-guidelines.md` — tableau « où la couleur a le droit d'apparaître » (les trois familles
    ne se recouvrent pas ; tout ce qui n'est ni `assessment` ni série de graphique reste en niveaux
    de gris), et distinction explicite entre progression de revue et statut d'analyse.
  - `docs/phases/phase-2-core-ui.md` — état réel : les points 1 et 2 de la portée sont déjà faits,
    la Definition of Done est cochée en conséquence, et une section « Reste à faire » liste les cinq
    chantiers réels de la Phase 2.
  - `docs/api-contract.md` — v1.2 (`by_human_status`, `GET /api/dashboard/map`).

  **Vérifié :** `pnpm lint`, `pnpm typecheck`, `pnpm test` (44 tests / 8 fichiers), `pnpm build`
  passent. Parité FR/EN : 165 clés identiques. Captures régénérées.

- **2026-09-04 (Claude Code — lecture du backend de Thư, préparation Phase 2)** :

  - **`backend/` passe explicitement en lecture seule** pour toute session frontend
    (`CLAUDE.md` § 2, rappelé dans `frontend/CLAUDE.md`) : lecture encouragée — et même exigée avant
    de parler d'intégration — mais aucune modification, création, suppression ni renommage, y
    compris `backend/.gitignore`. Un problème constaté se note dans `PROGRESS.md`, il ne se corrige
    pas depuis une session frontend.
  - **`backend/env` ajouté au `.gitignore` racine.** Ce fichier contient des identifiants (7
    variables). Il passait entre les mailles des deux `.gitignore` : celui de `backend/` vise `.env`
    (avec point) et `env/` (dossier), alors que le fichier s'appelle `env` — donc ni l'un ni
    l'autre. Il apparaissait dans `git status` depuis le début de la session. **Vérifié : il n'a
    jamais été committé**, aucun secret n'est dans l'historique, rien à révoquer. La règle est
    posée dans le `.gitignore` racine, pour ne pas toucher à celui de Thư.
  - **`docs/backend-integration.md` créé** : comparaison ligne à ligne entre `docs/api-contract.md`
    et l'API réelle (9 endpoints lus dans `backend/API.md` et vérifiés dans
    `backend/app/routers/`), avec les écarts de champs, les conventions divergentes et quatre
    questions ouvertes classées par urgence.
  - **`docs/phases/phase-2-core-ui.md` réécrit** autour de l'existant : section A (bloquants à
    trancher avec Thư), section B (réalisable dès maintenant côté frontend), section C (souhaitable).

  **Ce que la lecture du backend change pour la Phase 2 :** le plan « brancher le backend » ne tient
  plus tel quel. `/api/documents` et `/api/requirements/by-documents` sont branchables via une
  couche d'adaptation ; tout le reste — constats, tableau de bord, upload, validation humaine —
  n'existe pas côté serveur et **reste sur MSW**. Les deux cohabiteront pendant la phase.


- **2026-09-07 (Claude Code — backend en local sans PostgreSQL, intégration réelle, recherche des
  exigences)** : demande de Giang — pouvoir faire tourner le backend de Thư sur sa propre machine
  (elle ne l'a pas encore poussé sur un serveur accessible) et brancher réellement le frontend
  dessus pour ce qu'il couvre déjà, sans toucher à `backend/`.

  **Constat de départ, en lisant `backend/` (lecture seule, rien modifié) :**
  - les modèles SQLAlchemy de Thư (`backend/app/models/`) n'utilisent **aucun type spécifique à
    PostgreSQL** — le backend tourne sans changement sur SQLite ;
  - `backend/reference_database/reference/abiaka_regulatory_demo.sqlite` **est committé** et
    contient déjà les 1 262 lignes de démo (32 documents, 44 exigences, 54 couples
    exigence × procédure…) ;
  - en revanche, suivre `backend/QUICKSTART.md` tel quel échoue sur un clone : PostgreSQL 18 n'est
    pas installé sur cette machine, et `alembic/versions/*.py` est gitignoré côté backend — jamais
    committé, donc `alembic upgrade head` est impossible sans base déjà migrée ;
  - la machine tournait sur Python 3.9 (celui livré par macOS) ; le backend déclare
    `requires-python >= 3.10`. `brew install python@3.12` a été nécessaire ;
  - aucune table `users` dans la base de référence, alors que toutes les routes `/api/**` exigent
    un JWT : impossible de se connecter sans en créer.

  **Fait — `scripts/local-dev/` (hors `backend/`, ne modifie rien sous cette arborescence) :**
  - `setup-backend.sh` : détecte un Python >= 3.10, crée `.venv-backend/` à la racine, installe les
    dépendances de `backend/pyproject.toml` (sans `psycopg`, inutile sur SQLite ; sans installer le
    paquet backend en editable, ce qui aurait écrit un `.egg-info/` sous une zone en lecture seule),
    copie la base de référence vers `.local/backend-dev.sqlite` (copie de travail, l'original
    committé n'est jamais touché), puis lance `seed_dev_db.py` qui crée la table `users` (absente)
    et 4 comptes de démonstration alignés sur ceux du corpus MSW du frontend
    (`marie.lefevre@iabank.fr` / `demo1234`, etc.) ;
  - `run-backend.sh` : démarre `uvicorn` avec `PYTHONPATH=backend` (le paquet n'est pas installé),
    `DATABASE_URL` pointé sur la copie SQLite, CORS ouvert sur `localhost:3000` ;
  - `scripts/local-dev/README.md` : guide complet, tableau de ce qui bascule en réel vs reste sur
    MSW, section « ce qui reste un contournement, à trancher avec Thư ».
  - **Vérifié en conditions réelles** (pas seulement lu) : backend démarré, `/health` répond
    `connected`, connexion JWT réussie, `/api/documents`, `/api/requirements/by-documents` et
    `/api/documents/content/{version_id}` répondent avec les vraies données `SYNTHETIC_DEMO`.

  **Fait — intégration frontend réelle, `frontend/src/lib/api/backend/` (nouveau) :**
  - `config.ts` : bascule par variable d'environnement `NEXT_PUBLIC_BACKEND_URL` — vide (défaut) =
    100 % MSW ; renseigné = les endpoints couverts par le backend partent en absolu vers lui, le
    reste continue en relatif vers MSW. Les deux cohabitent sans conflit (MSW n'intercepte que le
    relatif).
  - `schemas.ts` : miroir Zod des réponses **réelles** du backend (distinct de `src/types/api.ts`,
    qui reste le miroir du contrat) — ne jamais mélanger les deux, ne jamais assouplir un schéma du
    contrat pour faire passer une réponse.
  - `adapt.ts` (fonctions pures, 13 tests) : traduit backend → contrat — `domain` chaîne → tableau,
    `origin_code`/`origin_name` → `authority_or_owner`, `requirement_text` → `source_text`,
    `title` → `normalized_requirement`, chunks recollés → `extracted_text`. Le statut d'un document
    est **toujours** rendu `NOT_ANALYZED` en mode réel (le backend ne dit rien de l'avancement de
    l'analyse) — l'affirmer autrement violerait `docs/ui-guardrails.md`.
  - `client.ts` : pose `Authorization: Bearer`, traduit `{detail}` → `ApiError`, purge le jeton sur
    401 (`lib/api/token.ts`, extrait du `SessionProvider` pour que la couche API le lise sans
    dépendre de React).
  - `current-version-id.ts` (5 tests) : **contournement isolé et documenté** — aucun endpoint ne
    renvoie le `version_id` courant d'un document (question ouverte n°1 de
    `docs/backend-integration.md`), bloquant pour l'onglet « Texte source ». Reconstruit à partir
    d'une convention vérifiée sur les 88 lignes de `document_versions` de la base de référence ;
    échoue bruyamment (`BackendGapError`) si elle ne tient plus, plutôt que d'afficher un texte vide.
  - `resources.ts` : implémentations réelles pour signIn, régulations, procédures, exigences.
  - `src/lib/api/regulations.ts`, `procedures.ts`, `auth.ts` : chaque fonction choisit sa source
    (`isBackendLive`), les écrans n'ont pas changé.

  **Fait — dernier point de la Definition of Done Phase 2 : recherche/filtre des exigences.**
  `RequirementsTab` : recherche plein texte (identifiant, référence, texte normalisé, texte
  source) et filtre par domaine, calculés en local sur les exigences déjà chargées par l'écran.
  Mêmes primitives shadcn (`Input`, `Select`) et même style que le filtre déjà existant sur
  l'onglet « Analyse d'impact ». 2 nouvelles clés dans `messages/fr.json`/`en.json`.

  **Vérifié en conditions réelles, pas seulement en mock :** backend lancé en local, frontend
  pointé dessus (`NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`), parcours rejoué dans un
  navigateur piloté : connexion avec un vrai JWT, liste des 8 régulations `SYNTHETIC_DEMO` réelles
  (adaptées, affichées avec le même design que le mock), détail d'une régulation avec son texte
  source reconstruit à partir des chunks, ses 6 exigences réelles avec recherche/filtre — **zéro
  erreur console**. `pnpm lint`, `pnpm typecheck`, `pnpm test` (60 tests / 10 fichiers, +16 par
  rapport à la session précédente), `pnpm build` passent tous. `backend/` vérifié intact
  (`git status --short backend/` vide).

  **Reste à faire :** revue commune avec Thư sur les points encore bloquants (voir
  `docs/phases/phase-2-core-ui.md` § A) — en particulier faire converger le contournement
  `current-version-id.ts` vers un vrai champ `current_version_id` côté backend, et décider qui
  route les `Finding` (la table `requirement_procedure_map` de la base de référence a déjà la forme
  couple exigence × procédure choisie en v1.1 du contrat — la matière semble prête). Déploiement
  Vercel toujours pas fait. Écran Procédures internes toujours pas construit (le client API sait
  déjà les lister en mode réel).

- **2026-09-07 (Claude Code — mapping exigence × procédure, Vue d'ensemble et Analyse
  d'impact en réel)** : Thư a poussé le commit `db41421` (« Api get map of requirement
  and procedure ») pendant la session — 3 nouveaux endpoints `GET /api/mappings/*`
  routant enfin `RequirementProcedureMap`, jusque-là non exposé. C'est exactement la
  matière que la note de la session précédente signalait comme « prête côté données,
  pas encore routée ».

  **Lu avant de coder** (lecture seule, `backend/` non modifié) : `backend/API.md`,
  `backend/app/routers/mappings.py`, `backend/app/schemas/mapping.py`, confirmés contre
  la base de référence (`requirement_procedure_map`, 54 lignes, toutes avec au moins
  une procédure — aucun cas « exigence sans procédure » dans le corpus actuel, géré
  quand même par prudence côté frontend).

  **Fait — `frontend/src/lib/api/backend/`** :
  - `schemas.ts` : miroir Zod des 3 nouvelles formes de réponse
    (`backendMappingSchema`, réponses imbriquées `requirements-to-procedures`).
  - `finding-adapt.ts` (nouveau fichier, 13 tests) : traduit un couple mapping vers
    `Finding` du contrat. `assessment` (COVERED/PARTIALLY_COVERED/POTENTIAL_GAP/
    HUMAN_REVIEW) → les 5 valeurs du contrat, repli sur `EXPERT_REVIEW` (jamais
    `COVERED`) si une valeur est inconnue ; `human_status` → repli sur `PENDING` ;
    `risk_level` de l'exigence réutilisé tel quel comme `priority` (mêmes valeurs
    LOW/MEDIUM/HIGH — répond à la question ouverte n°2 de `docs/backend-integration.md`
    dans un sens qui n'engage que le frontend, à confirmer avec Thư).
  - **Limite assumée et documentée, pas contournée en silence** : le backend ne relie
    pas un couple exigence × procédure à un passage précis du document interne (pas de
    `chunk_id` sur le mapping). `regulatory_evidence` reste une citation exacte (le
    texte même de l'exigence, déjà chargé). `internal_evidence` ne peut être qu'un
    **extrait non ciblé** pris en tête du document de la procédure — jamais un texte
    inventé, seulement moins précis — avec un libellé de section qui le dit
    explicitement (« Début du document (passage non ciblé par le mapping) ») plutôt que
    de prétendre à une précision absente. Choix dicté par la règle produit non
    négociable de `docs/ui-guardrails.md` : jamais un constat affiché sans sa preuve.
    Une exigence sans aucune procédure mappée (aucun cas aujourd'hui) donne un constat
    `NO_RELEVANT_PROCEDURE` avec preuve réglementaire seule, comme le fait déjà le
    corpus mock.
  - `resources.ts` : `fetchFindings(regulationId)` — récupère les exigences, le titre
    de la régulation, appelle `requirements-to-procedures`, puis charge (une fois par
    document distinct, en parallèle) le texte de chaque procédure pour construire la
    preuve interne. Un échec isolé (procédure sans version exploitable) dégrade cette
    seule ligne — `console.error` + preuve interne vide — sans casser tout l'onglet.
  - `src/lib/api/findings.ts` : `fetchFindingsByRegulation` bascule vers le backend
    réel en mode `NEXT_PUBLIC_BACKEND_URL`.
  - `src/lib/api/dashboard.ts` : `fetchDashboardSummary` n'a pas d'équivalent backend
    (`/api/dashboard/summary` n'existe pas) — recalculé **côté client** avec
    `buildDashboardSummary`, la même fonction pure déjà utilisée par MSW
    (`src/lib/mocks/summary.ts`), à partir des exigences et constats réels. Un seul
    calcul d'agrégation dans le projet, pas une deuxième implémentation à maintenir.

  **Vérifié en conditions réelles** (backend local + frontend pointé dessus, navigateur
  piloté, contexte neuf pour éviter un token périmé) : régulation `EXT-EU-AML-001`
  ouverte — onglet « Vue d'ensemble » affiche désormais de vrais KPI (8 constats, 0 %
  traité), onglet « Analyse d'impact » liste les 8 vrais couples exigence × procédure
  (REQ-0001 apparaît deux fois pour ses deux procédures, comme en base), avec les
  vraies actions recommandées et le vrai `explanation` du backend (en anglais — pas
  encore localisable, point déjà ouvert). Une ligne dépliée montre la preuve
  réglementaire (citation exacte) et la preuve interne (extrait non ciblé, honnêtement
  étiqueté) ; cliquer dessus ouvre la fenêtre de lecture de la procédure et surligne
  correctement le passage — puisque l'extrait est un vrai préfixe du document, il est
  retrouvé sans anomalie. **Zéro erreur console.** `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (73 tests / 11 fichiers, +13 par rapport à la session précédente),
  `pnpm build` passent tous.

  **Reste ouvert avec Thư** : faire converger l'approximation `internal_evidence` vers
  un vrai lien mapping → passage (idéalement un `chunk_id` sur
  `RequirementProcedureMap`) ; confirmer que `risk_level` fait bien office de
  `priority` ; la validation humaine (Accepter/Rejeter/Escalader) reste sur MSW, aucune
  route de validation n'existe encore sous `/api/mappings`.

- **2026-09-07 (Claude Code — Vue d'ensemble réelle, portefeuille réel, rendu Markdown,
  fenêtre de preuve agrandie)** : quatre demandes de Giang après la session précédente.

  1. **Onglet « Vue d'ensemble » resté vide malgré des constats réels.** Pas un manque
     d'API : `RegulationDetailView` gatait l'onglet sur `regulation.status === "ANALYZED"`,
     un champ que le backend réel ne renvoie jamais (voir session du 2026-09-07 matin,
     `adaptDocumentStatus()` renvoie toujours `NOT_ANALYZED`, à dessein). Remplacé par
     un signal réel : présence d'exigences chargées (`hasAnalysisData`), qui pilote
     aussi bien l'onglet par défaut à l'ouverture que le badge de statut d'analyse dans
     l'en-tête (`findings.length === 0`, même condition que la barre de progression
     juste en dessous — les deux ne s'affichent jamais en même temps).
  2. **Tableau de bord (portefeuille, toutes régulations) toujours mock.**
     `/api/dashboard/overview` et `/api/dashboard/map` n'existent pas côté backend :
     recalculés côté client avec `buildPortfolioSummary`/`buildRegulationMap`, les
     mêmes fonctions pures que MSW utilise déjà. Nouveau `loadPortfolioData()` dans
     `dashboard.ts` : charge exigences + constats de **8 régulations en parallèle**,
     avec `fetchFindings(id, { includeEvidence: false })` — un nouveau paramètre sur
     `fetchFindings` qui saute le chargement du texte des procédures, inutile pour de
     simples compteurs agrégés. Sans cette option, charger le texte intégral de chaque
     procédure impactée pour les 8 régulations aurait multiplié les requêtes pour rien.
     `fetchFindings` accepte aussi des `requirements` déjà chargés, pour éviter un
     second appel redondant à `fetchRequirements` par régulation.
  3. **Rendu Markdown minimal** pour le texte source et les preuves internes : le
     corpus backend est écrit en Markdown (`# Titre`, `**gras**`, `> citation`) et
     s'affichait avec les caractères bruts. Nouveau `src/lib/simple-markdown.ts`
     (fonctions pures, 10 tests : titres, gras, italique, code, listes, citations) et
     `src/components/features/markdown-line.tsx` (rendu, une ligne = un bloc — pour ne
     pas casser le surlignage par index de ligne de `procedure-evidence-dialog.tsx`).
     Volontairement minimal : pas de dépendance markdown externe, le besoin d'affichage
     ne le justifie pas. Branché dans l'onglet « Texte source extrait », la carte de
     preuve (`EvidenceCard`) et la fenêtre de lecture de procédure.
  4. **Fenêtre de preuve agrandie** à ~60 % de l'écran en largeur et hauteur (demande
     explicite ; elle était figée à `max-w-3xl` / `h-[26rem]`). **Bug réel trouvé et
     corrigé en vérifiant visuellement** (pas seulement en lisant le code) : passer le
     `ScrollArea` d'une hauteur fixe (`h-[26rem]`) à `flex-1` dans un conteneur flexible
     a fait déborder son contenu sous sa propre bordure au lieu d'être coupé et
     défilable — le viewport interne de Radix ScrollArea ne se limitait pas strictement
     à la hauteur donnée par flexbox dans ce contexte imbriqué. Corrigé en ajoutant
     `overflow-hidden` explicitement sur le `ScrollArea` lui-même (en plus de
     `DialogContent`, qui en avait aussi besoin pour ne pas déborder de la carte au-delà
     de `max-h-[90vh]`).

  **Vérifié en conditions réelles** (backend local + frontend pointé dessus, navigateur
  piloté) : Vue d'ensemble d'une régulation réelle affiche KPI + graphiques (barres
  visibles avec les vrais comptages, vérifié en zoomant après un doute initial sur une
  capture compressée) ; tableau de bord d'accueil affiche 8 régulations réelles, 44
  exigences, 16 écarts potentiels, 12 revues expert, 54 validations en attente, et la
  carte des impacts complète (8 arbres, tous les couples exigence × procédure réels) ;
  texte source et preuve interne rendus en Markdown lisible ; fenêtre de preuve agrandie
  sans débordement, passage cité toujours surligné correctement. **Zéro erreur console.**
  `pnpm lint`, `pnpm typecheck`, `pnpm test` (83 tests / 12 fichiers, +10 par rapport à
  la session précédente), `pnpm build` passent tous.

  **Reste ouvert** : le graphique en barres d'un domaine unique (régulation n'ayant
  qu'un seul domaine) affiche une barre disproportionnellement épaisse — comportement
  préexistant de `DomainChart` avec une seule catégorie, non lié aux correctifs du jour,
  non traité (hors périmètre de la demande).

- **2026-09-07 (Claude Code — 9 demandes sur le tableau de bord et le détail d'une
  régulation : filtrage sur le travail restant, navigation, historique)** :

  1. **Tableau de bord — seules les régulations non entièrement traitées** dans
     « Détail par régulation », section déplacée **sous** les graphiques, paginée
     (5/page). Nouvelle fonction pure `isRegulationFullyHandled` (`lib/mocks/summary.ts`,
     testée) : vraie quand il existe au moins un constat et qu'aucun n'est plus
     `PENDING`. Une régulation sans aucun constat (pas encore analysée) reste affichée —
     rien à masquer, juste rien à traiter pour l'instant.
  2. **Cartes KPI et graphiques ne comptent plus que le travail restant.**
     `buildPortfolioSummary` recalculé : `potential_gaps`, `expert_reviews_required`,
     `by_assessment` ne portent que sur les constats encore `PENDING` ; `by_domain`
     exclut une exigence dès que tous ses constats sont tranchés (mais la garde si elle
     n'a encore aucun constat). `requirements_identified` et `regulations_total`
     restent des compteurs de périmètre, volontairement non affectés — la question
     réelle du prompt utilisait indifféremment « req » pour exigence et constat ;
     seuls les compteurs qui ont un sens de « décision humaine » ont été filtrés,
     documenté dans le commentaire du code pour trancher si mauvaise lecture.
  3. **Ligne de tableau entièrement cliquable** (dashboard, plus seulement la flèche) :
     `role="link"`, clic et clavier (Entrée/Espace), navigation via `useRouter().push`.
  4. Couvert par le point 2 (mêmes graphiques, même recalcul).
  5. **Carte des impacts filtrée et paginée** en mode portefeuille (5 régulations/page,
     nouvelle fonction pure `isMapNodeFullyHandled` dans `mindmap-layout.ts`, testée) —
     mais **pas** en mode « une seule régulation » (voir point 6) : sa propre carte doit
     rester visible même entièrement traitée.
  6. **`RegulationMindmap` réutilisé** (pas dupliqué) dans l'onglet « Vue d'ensemble »
     d'une régulation via une prop `regulationId` optionnelle : filtre sur cette seule
     régulation, sans pagination. Règle explicitée dans `frontend/CLAUDE.md` §
     anti-duplication (point 3 ajouté) pour que ce réflexe soit écrit, pas seulement
     pratiqué.
  7. **Carte d'exigence entièrement cliquable** (onglet « Exigences ») via le même motif
     `::after` que les cartes de régulation (`regulations-view.tsx`) — vérifié en
     cliquant sur le corps de la carte (pas un lien) : navigation confirmée.
  8. **Ligne de l'onglet « Analyse d'impact » : trois cellules sans contrôle interactif**
     (Exigence, Procédure impactée, Action recommandée) ouvrent/ferment le détail au
     clic, sans perdre l'activation clavier du bouton chevron (`stopPropagation` pour
     éviter un double bascule). **Force de la preuve colorée** rouge/jaune/vert (seuils
     40 %/75 %), en réutilisant les variables `--gap`/`--partial`/`--covered` déjà
     validées plutôt qu'une palette ad hoc — exception documentée dans
     `docs/ui-guidelines.md` (jusqu'ici cette barre était en niveaux de gris comme tout
     le "reste").
  9. **Nouvel onglet « Historique »** : qui a pris quelle décision, sur quel constat,
     quand. Contrat v1.3 : `actor_id` devient requis sur `POST /api/findings/:id/validate`
     (lu depuis la session courante), nouvel endpoint
     `GET /api/regulations/:id/history` → `AuditHistoryEntry[]`. Non couvert par le
     backend (comme la validation dont il découle) — reste sur MSW dans les deux modes.
     Store mock étendu (`appendHistoryEntry`/`listHistory`, persistant en
     `sessionStorage` comme le reste).

  **Bug trouvé et corrigé en testant, pas en lisant le code** : le nouvel onglet
  « Historique » ne s'ouvrait pas via `?tab=history` — `useRegulationTab` avait une
  liste blanche d'onglets valides qui ne connaissait pas encore `"history"`, donc l'URL
  était silencieusement ignorée et retombait sur « Vue d'ensemble ». Une seule ligne
  oubliée ; jamais vue avant de cliquer réellement sur l'onglet.

  **Vérifié en conditions réelles** : mode backend réel pour les points 1/2/4/5/6
  (pagination confirmée — « Page 1 sur 2 » sur 8 régulations et sur la carte des
  impacts — clic sur une ligne de tableau navigue, mindmap propre à une régulation
  affichée dans son onglet Vue d'ensemble) ; mode mock pour les points 7/8/9 (validation
  humaine nécessaire, non branchée côté backend) — clic sur le corps d'une carte
  d'exigence navigue, clic sur une cellule non interactive déplie le détail, force de
  la preuve affichée en vert à 94 %, et une décision « Accepter » apparaît immédiatement
  dans l'onglet Historique avec le bon auteur, la bonne exigence et la bonne procédure.
  **Zéro erreur console** dans les deux modes. `pnpm lint`, `pnpm typecheck`, `pnpm test`
  (92 tests / 12 fichiers, +9 par rapport à la session précédente), `pnpm build`
  passent tous. `backend/` vérifié intact.

  **Reste ouvert** : la question de fond derrière le point 2 (est-ce que
  « Requirements identified » doit aussi baisser à mesure que la revue avance, ou
  rester un compteur de périmètre) mérite d'être confirmée avec Giang — l'implémentation
  actuelle a tranché pour « compteur de périmètre inchangé », documenté en commentaire
  dans `lib/mocks/summary.ts` pour être facile à inverser si la lecture est différente.

- **2026-09-09 (Claude Code — 4 commits de Thư, 2 bugs réels trouvés et corrigés côté
  frontend/outillage, Vercel déployé par Giang)** :

  **Vercel déployé par Giang** — le point resté ouvert depuis la Phase 1 est clos.

  **4 nouveaux commits backend depuis la dernière lecture (`db41421`)** :

  1. `624db76` — **`GET /api/users`** (+ `/{user_id}`) : liste paginée, filtres `role`/`is_active`.
     Répond à une question ouverte depuis la v1 du contrat. **Pas encore branché côté frontend**
     (`fetchUsers` reste sur MSW) — forme à vérifier contre `userSchema` avant de basculer.
  2. `2e747d9` — **`PUT /api/mappings/:id/human-status` et `/assignee`** : la validation humaine
     peut enfin être persistée côté backend. **Pas encore branchée côté frontend.** Écarts à
     absorber avant de le faire : énumération différente
     (`PENDING_REVIEW`/`ACCEPT`/`REJECT`/`ESCALATE` contre
     `PENDING`/`ACCEPTED`/`REJECTED`/`ESCALATED` du contrat), deux appels séparés au lieu d'un, et
     surtout **aucun champ `actor_id`/`custom_action`/`reviewer_comment`** — l'onglet Historique
     resterait vide pour toute décision prise via cette route.
  3. `c3c0e51` — `POST /api/documents/{id}/update` : nouvelle version d'un document existant
     (incrémente `current_version`, marque l'ancienne version `SUPERSEDED`). Confirme au passage la
     convention `VER-{document_id}-{version_no}` déjà déduite dans
     `current-version-id.ts`. Pas branché, aucun écran ne le déclenche.
  4. `d34d746` — `DocumentRead.current_version` élargi à `str | float` (un bug qu'elle a rencontré
     : certains documents ont cette valeur en nombre, pas en chaîne).

  **Bug réel n°1, trouvé en lisant le commit 4 et vérifié en le cherchant chez nous** :
  `backendDocumentSchema.current_version` (`frontend/src/lib/api/backend/schemas.ts`) n'acceptait
  que `string` — exactement le bug que Thư venait de corriger côté backend, jamais reporté côté
  frontend. Un document avec cette valeur en nombre aurait fait échouer `fetchRegulations()` en
  entier (`ApiContractError` sur tout le tableau, pas seulement la ligne fautive). Corrigé :
  `z.union([z.string(), z.number()])`, propagé à `deriveCurrentVersionId` et `adaptDocument`
  (`String(...)` avant usage). Aucun document de la base de référence n'est actuellement concerné
  (vérifié), mais le prochain corpus importé par Thư pourrait l'être. Test ajouté.

  **Bug réel n°2, trouvé en testant les nouveaux endpoints avant de les documenter** : le commit 2
  ajoute une colonne `assignee` à `RequirementProcedureMap` **sans migration** (`alembic/versions/`
  gitignoré côté backend — Thư ne peut pas en committer). Conséquence : SQLAlchemy sélectionne
  cette colonne dans **toute** requête sur la table, y compris `GET /api/mappings/*` — donc
  **l'ensemble de l'intégration des constats, construite et vérifiée le 2026-09-07, était cassée**
  sur notre base locale (`no such column: requirement_procedure_map.assignee`, HTTP 500 partout).
  Corrigé dans l'outillage local (`scripts/local-dev/seed_dev_db.py::sync_missing_columns`,
  nouveau) : compare chaque table déclarée dans les modèles à la base réelle et ajoute les colonnes
  manquantes (`ALTER TABLE ... ADD COLUMN`, toujours nullable). Généralise le contournement déjà en
  place pour la table `users` à *tout* futur ajout de colonne côté Thư — le prochain écart de ce
  genre se corrigera tout seul au lieu de re-casser silencieusement l'intégration. Vérifié après
  correction : `/api/mappings/requirements-to-procedures`, `/human-status` et `/assignee`
  répondent 200 ; état de test remis à zéro (`PENDING_REVIEW`, `assignee: null`) après vérification.

  **Vérifié** : `pnpm lint`, `pnpm typecheck`, `pnpm test` (93 tests / 12 fichiers, +1) passent.
  `backend/` non modifié (`git status --short backend/` vide).

  **Reste à faire (prochaine session)** : brancher `GET /api/users`, et brancher la validation
  humaine (`PUT /api/mappings/:id/human-status`+`/assignee`) avec sa couche d'adaptation
  d'énumération — l'historique restera sur MSW tant que le backend n'a pas d'`actor_id`. Voir
  `docs/backend-integration.md` points 6-9 pour le détail.

- **2026-09-09 (Claude Code — Phase 5, points 1/3/5(doc))** : implémentation de la portée Phase 5
  restante (polish bilingue, états vides/erreurs, `docs/known-limitations.md`).

  **Lu avant de coder** (lecture seule) : `backend/API.md`, `backend/app/routers/`, `git log --
  backend/` — confirmé qu'aucun commit backend n'est arrivé depuis la lecture du 2026-09-09 matin
  (toujours `d34d746` en tête). Rien de nouveau à absorber côté intégration pour cette session.

  1. **Polish bilingue (point 1).** Relecture systématique : parité `fr.json`/`en.json` déjà
     garantie par le test existant (184 clés de chaque côté, aucune vide) ; grep ciblé sur les
     tournures interdites de `docs/ui-guardrails.md` (« non-compliant », « l'IA a validé »,
     « viole »…) dans les messages ET dans le JSX — rien trouvé ; grep sur les attributs
     (`placeholder`/`title`/`alt`/`aria-label`) et le texte JSX littéral pour un texte codé en dur
     qui aurait échappé à `next-intl` — rien trouvé non plus. La discipline bilingue des sessions
     précédentes tenait déjà ; rien à corriger.
  2. **États vides et erreurs (point 3).** Les écrans métier avaient déjà `LoadingState`/
     `ErrorState`/`EmptyState` (`components/features/query-state.tsx`) sur toutes les vues de
     données. **Trou réel trouvé en testant dans un navigateur, pas en lisant le code** : aucun
     fichier de convention Next.js `error.tsx`/`not-found.tsx`/`global-error.tsx` n'existait nulle
     part dans `src/app/`. Naviguer vers une route inexistante (`/fr/does-not-exist`) tombait sur
     le `_not-found` généré automatiquement par Next, qui ne rend que `app/layout.tsx` (sans
     `<html>/<body>`, portés par `[locale]/layout.tsx`) → `Runtime Error: Missing <html> and <body>
     tags in the root layout` affiché en plein écran. Un vrai écran cassé, exactement ce que le
     point 3 de la phase interdit.
     - `src/app/[locale]/error.tsx` : boundary React (obligatoire côté Next), bilingue via
       next-intl (disponible ici car rendu à l'intérieur de `[locale]/layout.tsx`), bouton
       Réessayer + lien retour tableau de bord.
     - `src/app/[locale]/not-found.tsx` : même traitement pour un `notFound()` explicite ou une
       route manquante *à l'intérieur* de l'arbre `[locale]`.
     - `src/app/not-found.tsx` et `src/app/global-error.tsx` : filets de secours racine, pour le
       cas où même `[locale]/layout.tsx` n'a pas pu se monter — hors de portée de
       `NextIntlClientProvider`, donc texte bilingue écrit en dur, choix documenté en commentaire
       comme exception assumée (cas limite qui ne devrait jamais s'afficher en usage sain).
     - Nouvelles clés `errors.pageTitle`/`pageBody`/`backToDashboard`/`notFoundPageTitle`/
       `notFoundPageBody` ajoutées dans les deux dictionnaires.
  3. **`docs/known-limitations.md` créé** (point 5 du DoD) : neuf limitations réécrites pour un
     public client (validation humaine et historique non persistés côté backend réel, preuve
     interne non ciblée, tableau de bord recalculé côté client, upload simulé, textes backend non
     traduits, `priority` déduit de `risk_level`, authentification de démo, Copilot en placeholder)
     à partir de ce qui était déjà noté au fil de l'eau dans `docs/backend-integration.md` et
     `PROGRESS.md`, sans rien inventer de nouveau.

  **Vérifié dans un navigateur piloté** (pas seulement lu) : `/fr/does-not-exist` affiche
  maintenant l'écran de secours bilingue au lieu de l'erreur runtime, zéro erreur console ;
  `/fr/regulations/DOES-NOT-EXIST` (régulation inexistante, à l'intérieur de l'app, connecté en
  tant que Marie Lefèvre) affiche l'`ErrorState` « Ressource introuvable » existant avec bouton
  Réessayer ; écran Copilot revérifié en anglais, toujours honnêtement étiqueté « écran prévu pour
  une phase ultérieure ». `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (93/93, inchangé — aucun
  test n'était attendu sur ces fichiers de convention Next.js, purement structurels), `pnpm build`
  passent tous. `backend/` vérifié intact.

  **Reste à faire pour clore la Phase 5** : point 5 du DoD — rejouer le script de démo de 7 minutes
  sur l'environnement Vercel déployé (pas seulement en local), ce qui demande l'URL de déploiement
  et un passage en direct, non fait depuis cette session. Le point 4 (Copilot UI, P2 optionnel)
  reste volontairement hors périmètre : le P0 ci-dessus est solide mais le point 5 n'est pas encore
  vérifié en conditions réelles, et la phase précise de ne construire le Copilot que si tout le P0
  est solide **et** vérifié.

- **2026-09-09 (soir, Claude Code — GET /api/users et validation humaine réelle branchés)** :
  Giang a signalé que les deux endpoints de Thư lus le matin même n'étaient en réalité pas encore
  branchés côté frontend (la session précédente s'était concentrée sur le polish bilingue et les
  états d'erreur). Fait cette session, dans `frontend/src/lib/api/backend/` sauf indication
  contraire :

  1. **`GET /api/users`** : `backendUserListSchema` (nouveau, `schemas.ts`), `fetchUsers()`
     (`resources.ts`, réutilise `adaptUser` déjà écrit le 2026-09-07), branché dans
     `src/lib/api/auth.ts::fetchUsers` (`isBackendLive ? backend.fetchUsers() : MSW`). Les
     sélecteurs d'assignation (`AssigneeSelect`, écran de connexion) n'ont pas changé : ils
     consomment `useUsers()` sans savoir laquelle des deux sources a répondu.
  2. **Validation humaine réelle** (`PUT /api/mappings/:id/human-status` et `/assignee`,
     commit `2e747d9`) : nouvelle fonction `validateMapping()` dans `resources.ts`, branchée dans
     `src/lib/api/findings.ts::validateFinding`. Enchaîne les deux appels PUT (le backend n'a pas de
     route combinée comme le contrat) ; le second n'a lieu que si `assignee_id` est fourni (évite un
     appel inutile sur un simple Accepter/Rejeter).
     - **Bug réel trouvé en écrivant l'adaptateur d'énumération, pas en le lisant après coup** :
       `finding-adapt.ts::adaptHumanStatus` (écrit le 2026-09-07) ne reconnaissait que le participe
       passé (`ACCEPTED`/`REJECTED`/`ESCALATED`), en s'appuyant sur le filtre documenté de
       `GET /api/mappings/all`. Mais l'exemple de réponse de `PUT .../human-status` dans
       `backend/API.md` montre `"human_status": "ACCEPT"` (verbe court) — c'est cette valeur qui est
       réellement stockée. Sans correction, une exigence tout juste acceptée via le backend réel
       serait retombée en « En attente » au chargement suivant. `adaptHumanStatus` accepte
       maintenant les deux formes ; nouvelle fonction symétrique `adaptHumanStatusToBackend` pour le
       sens aller (contrat → backend), les deux couvertes par 5 tests.
     - Une exigence sans procédure associée (préfixe `NO-MAPPING-`, aucun cas dans le corpus actuel)
       n'a pas de ligne `RequirementProcedureMap` : `validateMapping` lève une `BackendGapError`
       explicite plutôt que d'appeler une route inexistante.
     - **Accepté explicitement, documenté dans `docs/known-limitations.md`** : `custom_action` et
       `reviewer_comment` ne sont pas transmis au backend (pas de colonnes côté serveur) ; l'onglet
       Historique reste sur MSW dans les deux modes, le backend ne journalisant toujours pas
       `actor_id`.

  **Vérifié en conditions réelles** (backend de Thư lancé en local via
  `scripts/local-dev/run-backend.sh`, frontend pointé dessus, navigateur piloté, connecté en tant
  que Marie Lefèvre) : Accepter sur `MAP-0001` (REQ-0001 × PRC-AML-007) — l'interface affiche
  aussitôt « Accepté » et la barre de progression passe à 13 % (1/8) ; confirmé indépendamment par
  `curl GET /api/mappings/all` sur le backend, qui renvoie bien `"human_status": "ACCEPT"`. Escalader
  `MAP-0003` (REQ-0002 × PRC-AML-008) avec Thomas Rousseau assigné — l'interface affiche « Escaladé »
  avec le bon nom, confirmé par `curl` : `"human_status": "ESCALATE", "assignee": "USR-002"`. Liste
  des 4 utilisateurs réels du backend correctement proposée dans le sélecteur d'assignation. **Zéro
  erreur console** liée à ce changement. Base de développement locale remise à
  `PENDING_REVIEW`/`assignee: null` sur les deux mappings après vérification (`sqlite3` direct,
  backend arrêté), pour ne pas laisser de résidu de test à la prochaine session. `pnpm lint`,
  `pnpm tsc --noEmit`, `pnpm test` (96/96, +3 tests sur l'adaptateur d'énumération) passent tous.
  `backend/` vérifié intact (`git status --short backend/` vide).

  **Reste ouvert** : point 5 de la Phase 5 (rejouer le script de démo sur Vercel) toujours pas fait ;
  point mineur de la Phase 3 (filtres non persistés dans l'URL sur l'onglet Analyse d'impact)
  toujours ouvert, signalé de nouveau par Giang — à traiter à la prochaine session si le temps le
  permet, non bloquant.

- **2026-09-09 (soir, suite — Claude Code — écran de création de compte, pull backend vérifié)** :
  trois demandes de Giang après relecture des changements ci-dessus.

  1. **Pull backend de Thư (`b811678`) vérifié avant de coder** : un seul fichier changé
     (`backend/app/schemas/document.py`), un `field_validator` qui force `current_version` à
     toujours être une chaîne (le bug inverse de celui contourné le 2026-09-09 matin, maintenant
     réglé à la source). **Aucun changement lié à `actor_id` ou à l'historique** — confirmé en
     relisant `backend/app/models/mapping.py`, `backend/app/schemas/mapping.py` et
     `backend/app/routers/users.py` : toujours pas de colonne `actor_id`, toujours pas de route
     d'audit. La réponse de la session précédente (Historique reste MSW) tient donc toujours.
  2. **Écran de création de compte (v1.4 du contrat)** : `POST /api/auth/signup` — déjà exposé par
     le backend de Thư (`backend/API.md` § 6), mais absent du contrat frontend et jamais branché.
     Ajouté :
     - `docs/api-contract.md` v1.4 (`POST /api/auth/signup`), `types/api.ts::signupBodySchema`.
     - `frontend/src/lib/api/backend/resources.ts::signUp` (backend réel) et
       `frontend/src/lib/api/auth.ts::signUp` (bascule mock/réel, même motif que `login`).
     - Mock : `src/lib/mocks/store.ts` gagne un état utilisateurs mutable
       (`listUsers`/`findUserByEmail`/`addUser`/`getPassword`/`setPassword`, persistant en
       `sessionStorage` comme le reste) — avant, `data/users.ts` exportait une liste figée non
       modifiable ; un compte créé en mock rejoint maintenant la liste des utilisateurs assignables
       pour le reste de la session, avec son propre mot de passe (les 4 comptes de démo continuent
       de partager `DEMO_PASSWORD`).
     - `src/app/[locale]/signup/` + `signup-form.tsx` (même structure que l'écran de connexion,
       hors coquille applicative). `login-form.tsx` : **retrait des identifiants pré-remplis et de
       l'indice de démo**, ajout d'un lien vers la création de compte (demande explicite de Giang,
       « bỏ mấy người mặc định đi »).
     - **Rôle non assignable, décision explicite de Giang après clarification** : le backend fixe
       `role` à `COMPLIANCE_OFFICER` pour tout nouveau compte (`backend/app/models/user.py`) et
       n'expose aucune route pour le changer ensuite (`backend/app/routers/users.py` n'a que des
       `GET`). Un écran d'assignation de poste a donc été **volontairement pas construit** cette
       session — Giang a choisi de ne pas le faire en mock uniquement (ce qui aurait donné une
       fonctionnalité qui semble marcher mais ne persiste nulle part en mode réel) et d'attendre que
       Thư expose une route `PATCH /api/users/:id` (ou équivalent). Suivi dans
       `docs/backend-integration.md` point 10.

  **Vérifié en conditions réelles** (backend local + frontend, navigateur piloté, deux contextes
  isolés) : création de compte en mode backend réel → `GET /api/users` sur le vrai backend confirme
  la ligne créée (`role: "COMPLIANCE_OFFICER"`) ; tentative avec un e-mail déjà utilisé
  (`marie.lefevre@iabank.fr`) → message « Cette adresse e-mail est déjà utilisée » (409 réel du
  backend) ; création de compte en mode mock (`NEXT_PUBLIC_BACKEND_URL` vidé temporairement) →
  connexion automatique, dashboard mock affiché. **Zéro erreur console** dans les deux modes.
  `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (100/100, +4 tests) et `pnpm build` (nouvelles routes
  `/fr/signup`, `/en/signup`) passent tous. Compte de test créé sur le backend local et
  `.env.local` remis à son état d'origine (`NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`) après
  vérification, backend arrêté proprement.

- **2026-09-09 (soir, suite — Claude Code — écran d'assignation de rôle, débloqué par un
  nouveau commit de Thư arrivé pendant la session)** : Giang a signalé que le
  signup échouait à nouveau — même cause que le matin (backend local arrêté en fin de
  session précédente, `.env.local` toujours pointé dessus). Backend relancé. Giang a
  aussi demandé de revérifier si Thư avait poussé une route de changement de rôle.

  **Pull vérifié avant de coder** : Thư a poussé `fabd0cf` (« Create API to update role
  of user ») quelques minutes après la session précédente — exactement le blocage noté
  dans `docs/backend-integration.md` point 10/11. `PUT /api/users/:id/role`, body
  `{role: string}` → `User`. `role` reste une chaîne libre (pas d'énumération), et la
  route n'a **aucun contrôle d'autorisation propre** (n'importe quel compte authentifié
  peut changer le rôle de n'importe quel autre) — limite assumée, affichée directement
  dans l'écran plutôt que cachée.

  **Fait :**
  - `docs/api-contract.md` v1.5, `types/api.ts::updateUserRoleBodySchema`.
  - `backend/resources.ts::updateUserRole` (backend réel) et
    `frontend/src/lib/api/users.ts` (nouveau fichier — `fetchUsers` en est extrait
    d'`auth.ts`, `updateUserRole` ajouté ; un fichier par ressource, comme demandé par
    `frontend/CLAUDE.md`). Mock : `store.ts::updateUserRole`, route
    `PUT /api/users/:id/role` dans `handlers.ts`.
  - Écran `/users` (« Utilisateurs ») : nouvelle entrée de sidebar « Administration »,
    table éditable (nom, e-mail, rôle en texte libre + bouton Enregistrer par ligne,
    `user-role-row.tsx`), bandeau d'avertissement sur l'absence de contrôle d'accès.
  - `client.ts` (contrat) élargi à la méthode `PUT`, comme le client backend l'était déjà.

  **Vérifié en conditions réelles** (backend local relancé, frontend, navigateur piloté,
  connecté en Marie Lefèvre) : rôle de Karim Benali changé « Juriste Réglementaire » →
  « Analyste Senior », confirmé par `GET /api/users` sur le vrai backend, remis à sa
  valeur d'origine après vérification. **Zéro erreur console** (un avertissement
  d'accessibilité mineur — champ sans `id`/`name` — trouvé et corrigé au passage).
  `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (102/102, +2 tests) et `pnpm build`
  (nouvelles routes `/fr/users`, `/en/users`) passent tous. `backend/` vérifié intact.
  **Backend local laissé démarré à la fin de cette session** (contrairement aux fois
  précédentes) pour que Giang puisse continuer à tester sans retomber sur le même
  blocage — à arrêter manuellement si besoin (`pkill -f uvicorn`).

- **2026-09-09 (nuit, Claude Code — deux bugs réels trouvés en testant, pas en lisant le
  code)** : Giang a signalé, après usage normal de l'écran : assignation d'une
  régulation impossible (« ça dit que ça ne peut pas sauvegarder »), même chose à
  l'escalade, et l'historique qui ne se remplit toujours pas (déjà su et accepté plus
  tôt dans la session — pas un bug, juste re-signalé en le vivant en conditions
  réelles).

  **Reproduit dans un navigateur piloté avant de corriger quoi que ce soit** (backend
  local relancé, resté démarré depuis la session précédente) :

  1. **Bug réel n°1 — assignation d'une régulation, 404 systématique en mode backend
     réel.** Cliquer sur « Personne en charge » d'une carte régulation
     (`EXT-EU-AML-001`, un vrai document du backend) et choisir un nom renvoyait bien un
     404 dans la console, le sélecteur revenait à « Non assigné ». Cause : le code
     appelait toujours `PATCH /api/regulations/:id`, routé vers le handler MSW —
     lequel cherche la régulation dans le corpus mocké d'origine (2 régulations),
     jamais dans le corpus réel de Thư (8 régulations). Corrigé par un nouveau fichier
     `frontend/src/lib/api/regulation-assignee-overrides.ts` : un overlay purement
     local au navigateur (`sessionStorage`), indépendant du backend (qui n'a pas ce
     champ) et du corpus MSW — `fetchRegulations`/`fetchRegulation` l'appliquent en
     mode backend réel, `updateRegulationAssignee` l'écrit au lieu d'appeler MSW.
  2. **Bug réel n°2 — l'assigné d'une escalade ne « tenait » pas après rechargement.**
     La décision (Escaladé) restait bien affichée, mais « Personne en charge » revenait
     systématiquement à « Non assigné » après un `reload`, alors que
     `GET /api/mappings/all` sur le vrai backend confirmait `assignee: "USR-002"` —
     donc bien persisté, seulement jamais relu. Cause : `assembleMappedFinding`
     (`finding-adapt.ts`) ne mappait pas le champ `assignee` de la réponse backend vers
     `Finding.assignee_id` — une ligne oubliée en branchant `validateMapping` plus tôt
     dans la soirée. Corrigée en une ligne, deux tests ajoutés.
  3. **Historique — pas un bug, confirmation du comportement déjà documenté** : le
     backend ne journalise toujours pas qui a pris une décision (`actor_id`), donc
     l'onglet Historique reste sur MSW dans les deux modes (`docs/known-limitations.md`
     point 2) — déjà expliqué et accepté par Giang plus tôt dans la session, resignalé
     ici en le constatant à l'usage plutôt qu'en s'en souvenant.

  **Vérifié en conditions réelles après correction** (backend local, navigateur
  piloté, connecté en Marie Lefèvre) : assigner Marie Lefèvre à `EXT-EU-AML-001` →
  succès immédiat, aucune erreur console, persiste après `reload` de la page ;
  escalade avec Claire Dubois assignée sur REQ-0001×PRC-AML-008 → « Escaladé » +
  « Claire Dubois » toujours affichés après `reload`. En bonus, la carte
  « Confié par escalade à » (déjà existante) affiche maintenant correctement les noms,
  ce qui était cassé par le même bug n°2. `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`
  (107/107, +5 tests) et `pnpm build` passent tous. `backend/` vérifié intact. Backend
  local laissé démarré à la fin de cette session, comme la précédente.

- **2026-09-09 (nuit, suite — Claude Code — traduction française des constats, refonte
  de l'onglet Analyse d'impact)** : Giang a signalé que Thư avait ajouté
  `explanation_lang_fr`/`recommended_action_lang_fr` dans `backend/API.md`, que la
  colonne « Explication » manquait dans le tableau Analyse d'impact, et a demandé un
  brainstorm avant toute modification sur la structure des onglets (largeur du
  tableau, relation entre « Exigences extraites » et « Analyse d'impact »).

  **Brainstorm mené avant de coder** (`AskUserQuestion`, deux décisions validées par
  Giang) :
  1. Détail d'un constat (preuves, explication, éléments manquants) : converti en
     fenêtre dédiée (`FindingDetailDialog`) plutôt que colonne supplémentaire ou
     panneau qui pousse les lignes suivantes — le tableau reste compact quel que soit
     le nombre de constats consultés.
  2. Les deux onglets restent séparés (lecture vs décision), mais liés plus
     étroitement : une exigence à un seul constat ouvre directement son détail depuis
     « Exigences extraites » ; à plusieurs constats, bascule toujours vers « Analyse
     d'impact » (un seul dialogue ne peut pas représenter plusieurs couples à la fois).

  **Fait :**
  - **Traduction française (v1.6)** : `Finding.explanation_fr`/`recommended_action_fr`
    (contrat), mappés depuis `mapping.explanation_lang_fr`/`recommended_action_lang_fr`
    (`finding-adapt.ts`). Nouveau `lib/localized-text.ts::pickLocalizedText` (pure,
    testée) choisit la variante selon la langue de l'interface — les deux variantes
    étant déjà chargées, changer FR/EN n'a pas besoin de recharger les données.
  - **`FindingDetailDialog`** (nouveau composant) : preuves côte à côte, explication,
    force de la preuve, éléments manquants, action recommandée complète — extrait de
    l'ancien panneau qui s'ouvrait dans `finding-action-row.tsx`. Les boutons de
    décision restent dans la ligne du tableau (rester rapide pour trancher plusieurs
    constats à la suite).
  - **`requirements-tab.tsx`** : exigence à un seul constat → bouton « Traiter » et
    carte cliquable ouvrent `FindingDetailDialog` directement ; à plusieurs constats →
    comportement inchangé (bascule vers Analyse d'impact, lignes mises en avant).

  **Deux bugs réels trouvés en vérifiant en conditions réelles, un dans mon propre
  code du soir, un côté backend :**
  1. **`ScrollArea` (Radix) ne défilait pas dans `FindingDetailDialog`** — le contenu
     débordait silencieusement sous la fenêtre sans scrollbar ni erreur. Diagnostiqué
     en comparant les hauteurs calculées (`scrollHeight`/`clientHeight`) du viewport
     interne de Radix par script : `height:100%` refusait de se résoudre dans ce
     contexte flexbox imbriqué, cause non identifiée avec certitude malgré plusieurs
     essais (wrapper intermédiaire compris, comme dans `ProcedureEvidenceDialog`).
     Contourné en remplaçant `ScrollArea` par un simple `div` à défilement natif
     (`overflow-y-auto`), qui n'a pas ce problème.
  2. **`GET /api/mappings/*` cassé (HTTP 500) sur la base locale** : Thư a ajouté les
     deux colonnes `explanation_lang_fr`/`recommended_action_lang_fr` au modèle sans
     migration (même défaut que le bug `assignee` du 2026-09-09 matin —
     `alembic/versions/` reste gitignoré côté backend). Corrigé en relançant
     l'outillage local déjà écrit pour ce problème
     (`scripts/local-dev/seed_dev_db.py::sync_missing_columns`) — aucun code frontend
     à changer.

  **Bug réel repéré mais non corrigé, hors périmètre de la demande** : un jeton JWT
  expiré (session ouverte depuis plusieurs heures) laisse l'écran croire l'utilisateur
  connecté tout en affichant une erreur générique sur chaque donnée, sans jamais
  proposer de se reconnecter — noté dans `docs/backend-integration.md` point 15 et
  `docs/known-limitations.md` point 12 comme piste pour une session future
  (`AuthGuard`/`SessionProvider` devraient réagir à `ApiError.code ===
  "UNAUTHENTICATED"` en forçant une déconnexion).

  **Vérifié en conditions réelles** (backend local, navigateur piloté, connecté en
  Marie Lefèvre, variantes françaises posées manuellement en base sur `MAP-0001` pour
  le test) : tableau Analyse d'impact affiche le texte français dans la colonne
  « Action recommandée » ; `FindingDetailDialog` affiche « Explication »/« Action
  recommandée » en français, défile correctement (scrollbar visible, contenu complet
  atteignable) ; depuis « Exigences extraites », REQ-0002 (un seul constat) ouvre le
  dialogue directement au clic sur « Traiter » ou sur la carte. **Zéro erreur console**
  liée à ces changements. Base de test remise à son état d'origine après vérification.
  `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (112/112, +7 tests) et `pnpm build`
  passent tous. `backend/` vérifié intact. Backend local laissé démarré à la fin de
  cette session.

- **2026-09-09 (nuit, encore — Claude Code — même bug de scroll trouvé dans une
  fenêtre plus ancienne, badge Next.js Dev Tools retiré)** : Giang a signalé, capture
  DevTools à l'appui, ne pas réussir à lire un document interne au-delà de sa première
  section alors que la réponse réseau (visible dans l'onglet Network) contenait bien
  tous les chunks (`chunk_no` 1 à 4+) — et que la fenêtre de lecture ne défilait pas
  non plus. A aussi signalé un badge « N » (Next.js Dev Tools) gênant en bas à gauche.

  **Vérifié avant de conclure** : le backend ne pagine pas `GET /api/documents/content/
  {version_id}` (`total_chunks=len(chunks)`, tous les chunks toujours renvoyés) — la
  donnée complète était bien reçue, comme le montrait la capture. Le problème n'était
  donc pas côté backend ni côté assemblage du texte (`adaptExtractedText` recolle déjà
  tous les chunks) : c'était le même bug de `ScrollArea` (Radix) que celui corrigé plus
  tôt dans la soirée dans `FindingDetailDialog`, présent depuis le début dans
  `ProcedureEvidenceDialog` (la fenêtre de lecture d'une procédure complète) — resté
  invisible jusqu'ici faute d'avoir testé un document assez long pour déborder.

  **Fait :**
  - `ProcedureEvidenceDialog` : même correctif que `FindingDetailDialog` — `ScrollArea`
    remplacé par un `div` à défilement natif (`overflow-y-auto`). Un document plus long
    que la fenêtre est maintenant entièrement atteignable en défilant.
  - `next.config.ts` : `devIndicators: false` — retire le badge « N » (visible
    seulement en `pnpm dev`, jamais sur Vercel, mais gênant pendant une démo lancée en
    local).

  **Vérifié en conditions réelles** (backend local, navigateur piloté) : ouverture de
  PROC-AML-007 depuis un constat, mesure directe du conteneur de défilement
  (`scrollHeight` 762 vs `clientHeight` 551, `scrollTop` réglable jusqu'à 210,5) —
  confirme que le document déborde bien et que le défilement fonctionne
  mécaniquement, avec la scrollbar visible dans la fenêtre. Badge Next.js Dev Tools
  absent après redémarrage du serveur de dev. `pnpm lint`, `pnpm tsc --noEmit`,
  `pnpm test` (112/112, inchangé — correctif de layout, rien à tester côté logique) et
  `pnpm build` passent tous. `backend/` vérifié intact. Backend local laissé démarré à
  la fin de cette session.
