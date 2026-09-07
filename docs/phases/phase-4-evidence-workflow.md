# Phase 4 — Evidence & Validation Humaine (≈ Semaine 4)

Source : Full Project Guide, section 17, semaine 4 ; écran détaillé section 9.4.

## Objectif

L'écran de confiance du produit : preuve visible + décision humaine explicite. C'est ce qui rend le
produit crédible plutôt qu'une "boîte noire IA".

> **État au 2026-09-07 — portée frontend terminée.** Comme la Phase 3, cette portée a été construite
> en avance pendant les revues de la Phase 1 (fusionnée dans l'onglet « Analyse d'impact » plutôt
> qu'un écran séparé — un constat se déplie sur place avec ses preuves, jamais un aller-retour).
> La session du 2026-09-07 a branché la validation sur les vrais constats du backend (côté lecture)
> et ajouté un onglet **Historique** qui n'était pas prévu dans la portée d'origine.

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

- [x] Écran Evidence affiche les deux preuves côte à côte pour au moins les 9 scénarios d'écart du
      corpus de démo (Covered/Partial/Gap/No Procedure/Ambiguous)
      *(`EvidenceCard` × 2 dans la ligne dépliée de `FindingsActionsTable` ; les 5 valeurs
      d'`assessment` sont couvertes par le corpus mock. Rendu Markdown depuis le 2026-09-07 pour
      les preuves multi-lignes du corpus backend)*
- [x] Accept/Reject/Escalate/Comment persistent réellement (via API réelle ou mock persistant)
      *(`validateFinding` → MSW → `sessionStorage`, survit à un rechargement d'onglet. Non couvert
      par le backend de Thư — aucune route de validation — reste sur MSW y compris quand le reste
      de l'écran affiche des constats réels ; voir `docs/backend-integration.md` point ouvert n°7)*
- [x] Dashboard reflète les changements de statut après validation
      *(vrai depuis toujours en mock ; confirmé encore plus strictement le 2026-09-07 — une
      régulation entièrement traitée disparaît même du tableau de bord et de la carte des
      impacts, et les compteurs "Écarts potentiels"/"Revues expert requises" ne comptent plus
      que les constats encore en attente)*
- [x] Aucune formulation UI ne viole `docs/ui-guardrails.md` (relecture explicite de cet écran)
- [x] `PROGRESS.md` mis à jour

## Ce qui a été ajouté au-delà du DoD original (2026-09-07)

- **Onglet Historique** (nouveau, pas dans le DoD d'origine) : chaque décision (Accepter / Rejeter /
  Escalader) est journalisée — qui, quoi, quand, sur quelle exigence/procédure, avec le commentaire
  ou l'action retenue. Contrat v1.3 (`docs/api-contract.md`) : `actor_id` requis sur
  `POST /api/findings/:id/validate`, nouvel endpoint `GET /api/regulations/:id/history`. Non
  couvert par le backend (comme la validation dont il découle) — reste sur MSW dans les deux modes.
- **Limite assumée sur la preuve interne en mode backend réel** : `RequirementProcedureMap` ne
  relie pas un constat à un passage précis du document interne. La preuve interne est donc un
  extrait non ciblé pris en tête du document, honnêtement étiqueté comme tel (jamais présenté
  comme une citation précise) — voir `frontend/src/lib/api/backend/finding-adapt.ts` et
  `docs/backend-integration.md` § 4. En mode mock, la preuve reste une citation exacte comme avant.

## Reste ouvert

- La validation humaine ne peut pas encore être persistée par le backend réel de Thư — un constat
  chargé depuis le backend et « traité » l'est uniquement dans le mock local de la session. À
  trancher en revue : route de validation côté backend, ou acceptation que ce flux reste un
  mock pour la démo.
