# Phase 2 — Dashboard & Analyse Réglementaire (≈ Semaine 2)

Source : Full Project Guide, section 17, colonne "Developer A", semaine 2.

## Objectif

Construire les deux premiers écrans réels avec des données représentatives, et commencer
l'intégration API réelle si le backend de Thư expose déjà quelque chose (sinon rester sur mock,
sans bloquer).


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

- [ ] Dashboard affiche les KPI et la répartition avec des données réelles ou mock cohérentes
- [ ] Écran Analyse Réglementaire navigable pour au moins 1 régulation du corpus de démo
- [ ] Recherche/filtre des exigences fonctionne
- [ ] Aucun texte codé en dur qui viole `docs/ui-guardrails.md`
- [ ] `PROGRESS.md` mis à jour
