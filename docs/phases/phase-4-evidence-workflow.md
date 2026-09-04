# Phase 4 — Evidence & Validation Humaine (≈ Semaine 4)

Source : Full Project Guide, section 17, semaine 4 ; écran détaillé section 9.4.

## Objectif

L'écran de confiance du produit : preuve visible + décision humaine explicite. C'est ce qui rend le
produit crédible plutôt qu'une "boîte noire IA".


> ⚠️ Rappel : toute nouvelle chaîne UI ajoutée dans cette phase va dans `messages/fr.json` ET `messages/en.json` (voir `frontend/CLAUDE.md` section Bilingue). Aucune exception.
## Portée (frontend uniquement)

1. **Écran Evidence & Explainability** :
   - Passage réglementaire et passage de procédure interne affichés côte à côte
   - Passages surlignés utilisés par le modèle (si fournis par le backend)
   - Explication concise de l'assessment (texte respectant `docs/ui-guardrails.md`)
   - Éléments manquants/ambigus listés explicitement
   - Action recommandée + priorité
   - Contrôles humains : Accept / Reject / Escalate / Ajouter un commentaire
   - Traçabilité : ID document, section/page, version
2. Intégration `POST /api/findings/:id/validate` — état optimiste côté UI + gestion d'erreur.
3. Le Dashboard (Phase 2) doit refléter les findings validés (agrégation mise à jour).

## Definition of Done

- [ ] Écran Evidence affiche les deux preuves côte à côte pour au moins les 9 scénarios d'écart du
      corpus de démo (Covered/Partial/Gap/No Procedure/Ambiguous)
- [ ] Accept/Reject/Escalate/Comment persistent réellement (via API réelle ou mock persistant)
- [ ] Dashboard reflète les changements de statut après validation
- [ ] Aucune formulation UI ne viole `docs/ui-guardrails.md` (relecture explicite de cet écran)
- [ ] `PROGRESS.md` mis à jour
