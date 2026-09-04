# Frontend — IA Bank Regulatory AI Copilot

Next.js (App Router) + TypeScript. Règles de travail : `CLAUDE.md` (ce dossier) et `../CLAUDE.md`.

## Démarrage

```bash
corepack enable pnpm       # pnpm 9, une seule fois par machine
pnpm install
cp .env.example .env.local # facultatif : les valeurs par défaut suffisent
pnpm dev                   # ouvrir l'URL affichée (3000 si le port est libre)
```

Compte de démonstration : `marie.lefevre@iabank.fr` / `demo1234` (rappelé sous le formulaire).
L'authentification est **simulée côté frontend** — ce n'est pas un contrôle d'accès.

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

`pnpm screenshot` suppose `pnpm dev` déjà lancé. Si le port diffère :
`SCREENSHOT_BASE_URL=http://localhost:3001 pnpm screenshot`.

## Données : tout est mocké

Le backend (Thư) n'existe pas encore. Toutes les requêtes de `../docs/api-contract.md`
sont servies par **MSW** dans le navigateur, à partir du corpus de démo fictif
(`src/lib/mocks/data/`). Les décisions de validation sont conservées en `sessionStorage`
le temps de l'onglet.

Pour basculer sur un vrai backend :

```bash
NEXT_PUBLIC_API_MOCKING=disabled
NEXT_PUBLIC_API_BASE_URL=https://…
```

Les réponses restent validées par Zod (`src/types/api.ts`) : une réponse non conforme
au contrat lève une `ApiContractError` et affiche un état d'erreur explicite plutôt que
de corrompre l'écran silencieusement.

## Organisation

```
src/
├── app/[locale]/login/    # connexion (hors coquille applicative)
├── app/[locale]/(app)/    # coquille avec sidebar : dashboard, regulations (+ détail), copilot
├── components/
│   ├── ui/                # primitives shadcn/ui générées
│   ├── layout/            # sidebar, top bar, toggle FR/EN, menu utilisateur
│   ├── features/          # composants métier
│   └── providers/         # MSW, TanStack Query, session
├── i18n/                  # routing next-intl (+ src/proxy.ts pour le middleware)
├── lib/api/               # client typé, un fichier par ressource
├── lib/mocks/             # handlers MSW + corpus de démo
├── messages/              # fr.json / en.json — toujours synchronisés
├── types/api.ts           # miroir de docs/api-contract.md (schémas Zod + types)
└── scripts/screenshot.ts  # boucle de vérification visuelle
```

## Déploiement Vercel

`vercel.json` fixe le framework et les commandes. Côté tableau de bord Vercel,
**Root Directory doit être réglé sur `frontend`** (le dépôt contient aussi `backend/`).
Aucune variable d'environnement n'est requise tant que la couche de mock est active.
