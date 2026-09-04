# Suivi du Projet — IA Bank Regulatory AI Copilot

> Toute session doit lire ce fichier en premier et le mettre à jour avant de terminer.

## Phase actuelle

**Phase 1 — Fondations** (voir `docs/phases/phase-1-foundation.md`) — en cours, portée frontend
livrée le 2026-09-04. Restent deux points non réalisables en session de code : le gel du contrat
d'API avec Thư et le premier déploiement Vercel (voir « Blocages » ci-dessous).
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
- [ ] Backend / pipeline IA (Thư — stack à définir par elle)
- [ ] Déploiement Vercel (frontend) — `vercel.json` prêt, déploiement réel non effectué

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
- **Contrat d'API v1.1 — proposition écrite, non validée. Revue avec Thư à programmer.** Le
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

