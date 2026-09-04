# Phase 1 — Fondations (≈ Semaine 1)

Source : Full Project Guide, section 17, colonne "Developer A — Full-Time", semaine 1.

## Objectif

Poser le squelette technique + contrat d'API + une slice verticale fonctionnelle de bout en bout
avec des données mockées, pour valider que l'architecture tient avant de scaler.

## Portée (frontend uniquement)

1. **Bootstrap du projet** dans `frontend/` :
   ```
   npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir --import-alias "@/*"
   npx shadcn@latest init
   ```
   Puis ajouter : `@tanstack/react-query`, `zod` (validation des réponses API côté client),
   `next-intl` (préparation i18n), `msw` (mock API), `vitest` + `@testing-library/react`.
   Gestionnaire de paquets : `pnpm`.
2. **Squelette de navigation** : sidebar + 5 routes vides (Dashboard, Analyse Réglementaire, Impact
   Analysis, Evidence, Copilot) — voir `docs/ui-guidelines.md` pour le layout.
3. **Client API typé** (`frontend/src/lib/api/`) généré à partir des types de
   `docs/api-contract.md` — copier/synchroniser ces types dans `frontend/src/types/`.
4. **Couche de mock** (MSW) répondant sur tous les endpoints de `docs/api-contract.md`, alimentée
   par des données de démo cohérentes avec le corpus réel (`../IABank_*.docx`) — au moins 1
   régulation, 3 exigences, 3 procédures, 1 écart, preuves associées.
5. **Slice verticale démontrable** : sélectionner une régulation → voir ses 3 exigences → ouvrir 1
   finding → voir les preuves côte à côte → valider (Accept/Reject/Escalate) — tout en mock, mais
   l'UI et le flux de données réels.
6. **Geler le contrat d'API v1** avec Thư (revue commune de `docs/api-contract.md`).
7. Config déploiement Vercel (même vide/minimal, valider que le pipeline de déploiement marche tôt).

## Definition of Done

- [ ] `pnpm dev` lance l'app sans erreur, lint + typecheck passent
- [ ] Les 5 routes existent (même si 4 sont des placeholders "à venir")
- [ ] La slice verticale mock fonctionne de bout en bout, visible dans le navigateur
- [ ] `docs/api-contract.md` marqué comme "v1 gelée" dans `PROGRESS.md` avec accord de Thư
- [ ] Premier déploiement Vercel réussi (même minimal)
- [ ] `PROGRESS.md` mis à jour (case à cocher + note de fin de session)

## Ne pas faire en Phase 1

- Ne pas connecter au vrai backend de Thư (elle ne sera probablement pas prête) — rester sur mock.
- Ne pas peaufiner le design — structure et flux d'abord, polish en Phase 5.
