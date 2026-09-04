# Phase 3 — Impact Analysis (écran hero) (≈ Semaine 3)

Source : Full Project Guide, section 17, semaine 3 ; écran détaillé section 9.3.

## Objectif

L'écran le plus regardé pendant la démo client (7 minutes, voir section 19 de la brief). Doit être
rapide, lisible, crédible.

## Portée (frontend uniquement)

1. **Table Impact Analysis** (colonnes : Requirement, Matched Procedure, Assessment, Confidence,
   Priority, Action) :
   - Tri par priorité, filtre par statut/domaine
   - Badge coloré par `assessment` (voir code couleur figé dans `docs/glossary.md`)
   - Clic sur une ligne → navigue vers l'écran Evidence (Phase 4) pour ce finding
2. Intégration `GET /api/findings?regulation_id=...` (réel ou mock selon avancement backend).
3. Persistance de l'état de filtre/tri dans l'URL (pour pouvoir partager un lien pendant la démo).

## Definition of Done

- [ ] Table affiche tous les findings d'une régulation, triable/filtrable
- [ ] Couleurs de statut identiques à celles du Dashboard (cohérence visuelle vérifiée)
- [ ] Navigation ligne → détail Evidence fonctionne (même si l'écran Evidence est encore un
      placeholder à ce stade, le routing doit marcher)
- [ ] `PROGRESS.md` mis à jour
