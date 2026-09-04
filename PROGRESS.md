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
- [ ] Contrat d'API v1 validé avec Thư (backend) — **à faire en réunion, 3 points ouverts ci-dessous**
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
- **Gel du contrat d'API v1 (Phase 1, point 7) — non fait, nécessite une revue avec Thư.** Trois
  points ont été relevés en construisant le client typé et la couche de mock :
  1. **Pas de `GET /api/findings/:id`.** L'écran Preuves est centré sur un constat unique ; il doit
     aujourd'hui charger `GET /api/findings?regulation_id=…` puis filtrer côté client. Proposition :
     ajouter `GET /api/findings/:id` au contrat.
  2. **`Finding.explanation` / `recommended_action` / `Requirement.normalized_requirement` ne sont
     pas localisables.** Ces textes viennent du backend et s'affichent tels quels : en interface EN,
     l'utilisateur voit du français. À trancher : le backend génère-t-il dans la langue demandée
     (paramètre `?language=`), ou renvoie-t-il un objet `{ FR, EN }` ? (Ne concerne pas
     `EvidenceRef.excerpt`, qui reste par principe dans sa langue source.)
  3. **`POST /api/regulations/:id/analyze` est asynchrone mais aucun moyen de suivre l'avancement
     n'est documenté.** Le frontend ne sait pas quand repasser `status` de `ANALYZING` à `ANALYZED`.
     À définir : polling sur `GET /api/regulations/:id`, ou endpoint de statut dédié.
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
