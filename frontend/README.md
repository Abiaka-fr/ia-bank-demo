# Frontend — IA Bank Regulatory AI Copilot

Next.js (App Router) + TypeScript. Règles de travail : `CLAUDE.md` (ce dossier) et `../CLAUDE.md`.

## Démarrage

```bash
corepack enable pnpm       # pnpm 9, une seule fois par machine
pnpm install
cp .env.example .env.local # facultatif : les valeurs par défaut suffisent (mode mock)
pnpm dev                   # ouvrir l'URL affichée (3000 si le port est libre)
```

Compte de démonstration : `marie.lefevre@iabank.fr` / `demo1234` (rappelé sous le formulaire).

Node 22 recommandé (`.nvmrc`). Sur Node 20 tout fonctionne, mais Vitest et jsdom
sortent de leur plage `engines` : `jsdom` est volontairement épinglé en 26.

## Scripts

| Commande | Rôle |
|---|---|
| `pnpm dev` | serveur de développement |
| `pnpm build` / `pnpm start` | build et service de production |
| `pnpm lint` | ESLint (doit rester sans erreur) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest (unitaires + composants + contrat d'API) |
| `pnpm screenshot` | captures Playwright dans `screenshots/` — vérification visuelle obligatoire |

Le script de capture se connecte tout seul avec le compte de démonstration et parcourt les écrans
(FR + EN, onglets, mise en avant par lien, fenêtre de procédure). Il **échoue si une erreur console
apparaît**.

`pnpm screenshot` suppose `pnpm dev` déjà lancé. Si le port diffère :
`SCREENSHOT_BASE_URL=http://localhost:3001 pnpm screenshot`.

## Données : deux sources, une bascule

Le backend de Thư existe (FastAPI, voir `../backend/`) mais expose un modèle de données différent
du contrat et ne couvre pas encore tout (voir `../docs/backend-integration.md`). Le frontend parle
aux deux à la fois, endpoint par endpoint :

- **Mode mock (défaut)** — `NEXT_PUBLIC_BACKEND_URL` vide dans `.env.local`. Toutes les requêtes de
  `../docs/api-contract.md` sont servies par **MSW** dans le navigateur, à partir du corpus de démo
  fictif (`src/lib/mocks/data/`) — c'est le corpus construit à la main pour la démo client (9 écarts
  KYC/AML). Les décisions de validation sont conservées en `sessionStorage` le temps de l'onglet.
- **Mode backend réel** — renseigner `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` (ou l'URL du
  serveur de Thư) dans `.env.local`. Bascule automatique, endpoint par endpoint, dans
  `src/lib/api/*.ts` : authentification, régulations/procédures, exigences et constats partent vers
  le backend réel (`src/lib/api/backend/`, avec sa propre couche d'adaptation et ses schémas Zod) ;
  tableau de bord (recalculé côté client à partir des données réelles), upload, validation humaine
  et historique restent sur MSW — le backend ne les expose pas.

**Faire tourner le backend de Thư en local** (pas de PostgreSQL nécessaire — voir
`../scripts/local-dev/README.md`) :

```bash
../scripts/local-dev/setup-backend.sh   # une fois
../scripts/local-dev/run-backend.sh     # à chaque session → http://localhost:8000
```

Dans les deux modes, les réponses restent validées par Zod (`src/types/api.ts`) : une réponse non
conforme au contrat lève une `ApiContractError` et affiche un état d'erreur explicite plutôt que
de corrompre l'écran silencieusement — jamais de schéma assoupli pour « faire passer » une réponse.

## Organisation

```
src/
├── app/[locale]/login/    # connexion (hors coquille applicative)
├── app/[locale]/(app)/    # coquille avec sidebar : dashboard, regulations (+ détail), copilot
├── components/
│   ├── ui/                # primitives shadcn/ui générées
│   ├── layout/             # sidebar, top bar, toggle FR/EN, menu utilisateur
│   ├── features/          # composants métier (dont regulation-mindmap, regulation-history-tab,
│   │                       #   markdown-line, pagination-controls)
│   └── providers/          # MSW, TanStack Query, session
├── i18n/                  # routing next-intl (+ src/proxy.ts pour le middleware)
├── lib/api/               # client typé, un fichier par ressource
│   └── backend/           # bascule + adaptation vers le backend réel de Thư
├── lib/mocks/             # handlers MSW + corpus de démo + agrégats (summary.ts)
├── lib/evidence-match.ts  # localise un extrait dans un document (fonction pure)
├── lib/mindmap-layout.ts  # disposition + filtrage de la carte des impacts (fonction pure)
├── lib/simple-markdown.ts # rendu Markdown minimal du texte source (fonction pure)
├── messages/              # fr.json / en.json — toujours synchronisés
├── types/api.ts           # miroir de docs/api-contract.md (schémas Zod + types)
└── scripts/screenshot.ts  # boucle de vérification visuelle
```

## Déploiement Vercel

`vercel.json` fixe le framework et les commandes. Côté tableau de bord Vercel,
**Root Directory doit être réglé sur `frontend`** (le dépôt contient aussi `backend/`).
**Pas encore déployé** — voir `../docs/phases/phase-5-client-readiness.md`.
