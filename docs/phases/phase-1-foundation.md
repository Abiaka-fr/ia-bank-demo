# Phase 1 — Fondations (≈ Semaine 1)

Source : Full Project Guide, section 17, colonne "Developer A — Full-Time", semaine 1.

## Objectif

Poser le squelette technique + contrat d'API + une slice verticale fonctionnelle de bout en bout
avec des données mockées, pour valider que l'architecture tient avant de scaler.

## Portée (frontend uniquement)

1. **Bootstrap du projet** dans `frontend/` — commande complète et setup MCP shadcn détaillés dans
   `../../frontend/CLAUDE.md` section "Bootstrap". Gestionnaire de paquets : `pnpm`.
2. **Bilingue FR/EN dès maintenant** (pas repoussé à plus tard) : configurer le routing i18n de
   next-intl, créer `messages/fr.json` et `messages/en.json` (même structure de clés dans les deux
   dès le départ) et le composant toggle FR/EN dans la top bar. Voir `../../frontend/CLAUDE.md`
   section "Bilingue" pour les règles précises — à respecter pour tout le reste du projet, pas
   seulement cette phase.
3. **Squelette de navigation** : sidebar + 5 routes vides (Dashboard, Analyse Réglementaire, Impact
   Analysis, Evidence, Copilot) — voir `docs/ui-guidelines.md` pour le layout.
4. **Client API typé** (`frontend/src/lib/api/`) généré à partir des types de
   `docs/api-contract.md` — copier/synchroniser ces types dans `frontend/src/types/`.
5. **Couche de mock** (MSW) répondant sur tous les endpoints de `docs/api-contract.md`, alimentée
   par des données de démo cohérentes avec le corpus réel (`../IABank_*.docx`) — au moins 1
   régulation, 3 exigences, 3 procédures, 1 écart, preuves associées.
6. **Slice verticale démontrable** : sélectionner une régulation → voir ses 3 exigences → ouvrir 1
   finding → voir les preuves côte à côte → valider (Accept/Reject/Escalate) — tout en mock, mais
   l'UI et le flux de données réels.
7. **Geler le contrat d'API v1** avec Thư (revue commune de `docs/api-contract.md`).
8. Config déploiement Vercel (même vide/minimal, valider que le pipeline de déploiement marche tôt).

## Definition of Done

- [ ] `pnpm dev` lance l'app sans erreur, lint + typecheck passent
- [ ] Les 5 routes existent (même si 4 sont des placeholders "à venir")
- [ ] Toggle FR/EN fonctionnel, `messages/fr.json` et `messages/en.json` synchronisés (mêmes clés)
- [ ] La slice verticale mock fonctionne de bout en bout, visible dans le navigateur (capture
      d'écran prise, voir `../../frontend/CLAUDE.md` section "Vérification visuelle")
- [ ] `docs/api-contract.md` marqué comme "v1 gelée" dans `PROGRESS.md` avec accord de Thư
- [ ] Premier déploiement Vercel réussi (même minimal)
- [ ] `PROGRESS.md` mis à jour (case à cocher + note de fin de session)

## Ne pas faire en Phase 1

- Ne pas connecter au vrai backend de Thư (elle ne sera probablement pas prête) — rester sur mock.
- Ne pas peaufiner le design en détail — structure, flux et bilingue d'abord, polish visuel en
  Phase 5.
