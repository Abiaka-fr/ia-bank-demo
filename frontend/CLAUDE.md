# Frontend — IA Bank Regulatory AI Copilot

Contexte projet complet : `../CLAUDE.md` (le lire d'abord si ce n'est pas déjà fait dans cette
session). Ce fichier ne contient QUE les règles spécifiques au frontend.

## Stack (figée — ne pas changer sans mise à jour de ce fichier)

- **Next.js 16 (App Router)** + TypeScript strict — attention : Next 16 a renommé la convention
  `middleware.ts` en **`proxy.ts`** (voir `src/proxy.ts`), et les docs de la version installée sont
  dans `node_modules/next/dist/docs/`
- **Tailwind CSS** + **shadcn/ui** (Radix) pour tous les composants
- **TanStack Query** pour le data fetching / cache
- **Zod** pour valider les réponses API à l'exécution (les types de `docs/api-contract.md` sont la
  vérité ; Zod vérifie qu'on ne reçoit pas autre chose côté runtime)
- **MSW (Mock Service Worker)** pour mocker le backend tant que Thư n'a pas d'endpoints prêts
- **next-intl** pour l'i18n — **bilingue FR/EN dès le départ, ce n'est PAS optionnel** (voir section
  "Bilingue" ci-dessous)
- **Recharts** (via composants `chart` de shadcn/ui) pour le Dashboard
- **Vitest + React Testing Library** pour les tests unitaires/composants — `jsdom` est épinglé en
  v26 tant que la machine tourne sur Node 20 (jsdom 30 et Vitest 5 exigent Node 22, voir `.nvmrc`)
- **pnpm** comme gestionnaire de paquets
- Déploiement : **Vercel**

## 🌐 Bilingue FR/EN — règle obligatoire, pas juste "nice to have"

Contrairement à la brief originale (qui traitait FR/EN comme un "P2 optionnel si effort faible"),
**ce projet exige le bilingue dès la Phase 1**. Règles :

1. **Aucune chaîne de caractères visible à l'utilisateur n'est codée en dur dans un composant.**
   Tout texte passe par `next-intl` (`useTranslations()` / `getTranslations()`), même un texte qui
   semble "juste temporaire".
2. **Chaque nouvelle clé de traduction est ajoutée dans `messages/fr.json` ET `messages/en.json`
   dans le même commit.** Ne jamais laisser une clé exister dans un seul des deux fichiers — un
   écran qui a du texte en FR mais pas en EN (ou l'inverse) est considéré comme un bug, pas un
   détail.
3. Le sélecteur de langue (toggle FR/EN visible dans l'UI) est construit dès que la structure de
   routing i18n de Next.js est en place en Phase 1 — pas repoussé en Phase 5. Ce qui peut attendre
   la Phase 5, c'est le *polish* du toggle, pas son existence.
4. **Les preuves (`EvidenceRef.excerpt`) ne sont JAMAIS traduites** — toujours affichées dans leur
   langue source originale (voir `docs/api-contract.md`). Seule l'interface (labels, boutons,
   explications générées) est bilingue. Ne pas confondre les deux.
5. Avant de terminer une tâche qui touche l'UI : vérifier qu'aucune clé n'est orpheline entre les
   deux fichiers de langue (`pnpm dlx next-intl-lint` si configuré, sinon diff manuel des clés des
   deux JSON).

## Bootstrap (à exécuter en tout début de Phase 1, si pas déjà fait)

```bash
cd frontend
pnpm dlx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
pnpm dlx shadcn@latest init
pnpm add @tanstack/react-query zod next-intl recharts
pnpm add -D msw vitest @testing-library/react @testing-library/jest-dom playwright
```

Ajouter ensuite les composants shadcn au fur et à mesure du besoin avec
`pnpm dlx shadcn@latest add <component>` plutôt que de les coder à la main.

### Serveur MCP shadcn (à faire une fois, dans Claude Code — pas dans le code du projet)

Donne à Claude Code un accès direct au registre de composants shadcn/ui réel (évite le code
halluciné/obsolète) :

```bash
claude mcp add shadcn -- npx shadcn@latest mcp
```

## 📸 Vérification visuelle obligatoire après toute modification d'UI

Ne jamais considérer une tâche UI terminée sans l'avoir *vue*. Après toute modification visible
d'un écran :

1. Lancer l'app (`pnpm dev`) et naviguer vers l'écran modifié dans un navigateur piloté par
   Playwright (script simple dans `frontend/scripts/screenshot.ts`, ou toute méthode équivalente
   disponible dans l'environnement de la session).
2. Prendre une capture d'écran de l'état réel.
3. Comparer visuellement contre `../docs/ui-guidelines.md` (palette, densité, statuts colorés) et
   contre le wireframe de l'écran décrit dans la phase concernée (`../docs/phases/`).
4. Corriger avant de proposer la tâche comme terminée — ne pas se fier uniquement à la lecture du
   code JSX pour juger du rendu.

Cette boucle "coder → capturer → comparer → corriger" est ce qui évite le décalage classique entre
"le code compile" et "l'UI est présentable".

## Structure de dossiers attendue

```
frontend/src/
├── app/
│   ├── layout.tsx              # racine minimale (le <html> est rendu par [locale])
│   └── [locale]/               # routing i18n next-intl
│       ├── layout.tsx          # <html>, providers, polices
│       ├── login/              # écran de connexion, HORS coquille applicative
│       └── (app)/              # coquille : garde de session + sidebar + top bar
│           ├── dashboard/      # tableau de bord consolidé (toutes régulations)
│           ├── regulations/    # liste + upload
│           │   └── [id]/       # détail : onglets Vue d'ensemble / Exigences /
│           │                   #   Analyse d'impact / Texte source (?tab=…&focus=…)
│           └── copilot/        # P2, ne pas prioriser
├── components/
│   ├── ui/                     # primitives shadcn/ui générées — ne pas éditer sauf besoin réel
│   ├── layout/                 # sidebar, top bar, toggle FR/EN, menu utilisateur, garde
│   ├── providers/              # MSW, TanStack Query, session
│   └── features/               # composants métier
├── i18n/                       # routing next-intl (+ src/proxy.ts pour le middleware Next 16)
├── lib/
│   ├── api/                    # client API typé, un fichier par ressource
│   ├── mocks/                  # handlers MSW + corpus de démo
│   ├── assessment.ts           # source unique du mapping statut → couleur
│   ├── evidence-match.ts       # localisation d'un extrait dans un document (fonction pure)
│   └── mindmap-layout.ts       # disposition de la carte des impacts (fonction pure)
├── types/api.ts                # miroir de docs/api-contract.md (schémas Zod + types inférés)
├── messages/                   # dictionnaires next-intl — fr.json et en.json, TOUJOURS synchronisés
├── test/render.tsx             # rendu de test avec les providers réels
└── scripts/screenshot.ts       # script Playwright pour la vérification visuelle
```

**Écrans (depuis la revue v1.1) :** la sidebar ne compte que 3 entrées — Tableau de bord, Analyse
réglementaire, Copilot. « Analyse d'impact » et « Preuves » ne sont plus des écrans globaux : ce
sont des onglets du détail d'une régulation, car on ne consulte des constats qu'après avoir choisi
la régulation concernée. L'onglet actif et l'élément mis en avant vivent dans l'URL
(`?tab=…&focus=…`), ce qui rend chaque vue partageable.

## Règle anti-duplication (rappel du CLAUDE.md racine, spécifique frontend)

Avant de créer un composant :
1. Chercher dans `components/ui/` s'il existe déjà en tant que primitive shadcn (`ls
   src/components/ui/`).
2. Chercher dans `components/features/` s'il existe déjà un composant métier similaire
   (`grep -ri` sur le nom probable).
3. **Un même composant métier utilisé sur plusieurs écrans reste un seul composant** — jamais une
   copie par écran. Exemple : `RegulationMindmap` sert à la fois le tableau de bord d'accueil
   (toutes les régulations, paginé) et l'onglet « Vue d'ensemble » d'une régulation (une seule,
   non paginée) via une prop optionnelle (`regulationId`) — pas un second composant
   `RegulationOwnMindmap`. Si un écran a besoin d'un comportement légèrement différent, ajouter un
   paramètre au composant existant plutôt que le dupliquer.
4. Avant de créer un nouveau type, vérifier `src/types/` et `docs/api-contract.md` — ne jamais
   dupliquer une interface déjà définie ailleurs.
5. Avant d'ajouter une nouvelle route API mock dans `lib/mocks/`, vérifier qu'elle n'existe pas déjà
   dans les handlers MSW existants.

## Checklist avant de terminer une tâche non triviale

- [ ] `pnpm lint` sans erreur
- [ ] `pnpm tsc --noEmit` sans erreur
- [ ] `pnpm test` passe (si des tests existent pour la zone touchée)
- [ ] Aucun composant/fichier dupliqué laissé derrière (voir règle anti-duplication ci-dessus)
- [ ] Tout texte utilisateur ajouté respecte `../docs/ui-guardrails.md`
- [ ] Toute nouvelle chaîne existe dans `messages/fr.json` ET `messages/en.json` (voir section
      Bilingue ci-dessus) — `pnpm test` échoue automatiquement si une clé n'existe que d'un côté
      (`src/messages/messages.test.ts`)
- [ ] Capture d'écran prise et comparée à `../docs/ui-guidelines.md` pour toute modification visible
- [ ] `../PROGRESS.md` mis à jour si la tâche correspond à un point de la phase en cours

## Ce que le frontend NE fait PAS

- N'implémente aucune logique d'extraction/retrieval/comparaison IA — c'est le backend (Thư).
- Ne suppose jamais un comportement backend non documenté dans `../docs/api-contract.md`.
- **Ne modifie JAMAIS quoi que ce soit sous `../backend/`** — lecture seule, sans exception. Voir la
  règle complète dans `../CLAUDE.md` § 2. On peut et on doit lire `../backend/API.md` avant de
  parler d'intégration ; on n'y touche pas. Un problème constaté côté backend se note dans
  `../PROGRESS.md`, il ne se corrige pas depuis une session frontend.
- Ne committe jamais `../backend/env` (identifiants ; ignoré par le `.gitignore` racine).
