# Frontend — IA Bank Regulatory AI Copilot

Contexte projet complet : `../CLAUDE.md` (le lire d'abord si ce n'est pas déjà fait dans cette
session). Ce fichier ne contient QUE les règles spécifiques au frontend.

## Stack (figée — ne pas changer sans mise à jour de ce fichier)

- **Next.js 15+ (App Router)** + TypeScript strict
- **Tailwind CSS** + **shadcn/ui** (Radix) pour tous les composants
- **TanStack Query** pour le data fetching / cache
- **Zod** pour valider les réponses API à l'exécution (les types de `docs/api-contract.md` sont la
  vérité ; Zod vérifie qu'on ne reçoit pas autre chose côté runtime)
- **MSW (Mock Service Worker)** pour mocker le backend tant que Thư n'a pas d'endpoints prêts
- **next-intl** pour l'i18n (français par défaut, structure prête pour EN plus tard)
- **Recharts** (via composants `chart` de shadcn/ui) pour le Dashboard
- **Vitest + React Testing Library** pour les tests unitaires/composants
- **pnpm** comme gestionnaire de paquets
- Déploiement : **Vercel**

## Bootstrap (à exécuter en tout début de Phase 1, si pas déjà fait)

```bash
cd frontend
pnpm dlx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query zod next-intl recharts
pnpm add -D msw vitest @testing-library/react @testing-library/jest-dom
```

Ajouter ensuite les composants shadcn au fur et à mesure du besoin avec
`pnpm dlx shadcn@latest add <component>` plutôt que de les coder à la main.

## Structure de dossiers attendue

```
frontend/src/
├── app/                    # routes Next.js (App Router)
│   ├── dashboard/
│   ├── regulations/[id]/
│   ├── impact-analysis/
│   ├── evidence/[findingId]/
│   └── copilot/            # P2, ne pas prioriser
├── components/
│   ├── ui/                 # primitives shadcn/ui générées — ne pas éditer à la main sauf besoin réel
│   └── features/           # composants métier (KpiCard, FindingBadge, EvidencePanel, ...)
├── lib/
│   ├── api/                 # client API typé, un fichier par ressource (regulations.ts, findings.ts...)
│   └── mocks/                # handlers MSW, données de démo
├── types/                    # types TS reflétant EXACTEMENT docs/api-contract.md
└── messages/                  # dictionnaires next-intl (fr.json en premier)
```

## Règle anti-duplication (rappel du CLAUDE.md racine, spécifique frontend)

Avant de créer un composant :
1. Chercher dans `components/ui/` s'il existe déjà en tant que primitive shadcn (`ls
   src/components/ui/`).
2. Chercher dans `components/features/` s'il existe déjà un composant métier similaire
   (`grep -ri` sur le nom probable).
3. Avant de créer un nouveau type, vérifier `src/types/` et `docs/api-contract.md` — ne jamais
   dupliquer une interface déjà définie ailleurs.
4. Avant d'ajouter une nouvelle route API mock dans `lib/mocks/`, vérifier qu'elle n'existe pas déjà
   dans les handlers MSW existants.

## Checklist avant de terminer une tâche non triviale

- [ ] `pnpm lint` sans erreur
- [ ] `pnpm tsc --noEmit` sans erreur
- [ ] `pnpm test` passe (si des tests existent pour la zone touchée)
- [ ] Aucun composant/fichier dupliqué laissé derrière (voir règle anti-duplication ci-dessus)
- [ ] Tout texte utilisateur ajouté respecte `../docs/ui-guardrails.md`
- [ ] `../PROGRESS.md` mis à jour si la tâche correspond à un point de la phase en cours

## Ce que le frontend NE fait PAS

- N'implémente aucune logique d'extraction/retrieval/comparaison IA — c'est le backend (Thư).
- Ne suppose jamais un comportement backend non documenté dans `../docs/api-contract.md`.
- Ne modifie jamais de fichier sous `../backend/`.
