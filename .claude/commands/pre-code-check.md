---
description: Check-list à lancer avant une modification de code non triviale (anti-duplication, contrat d'API, guardrails UI)
---

Avant de commencer la modification demandée, effectue dans l'ordre :

1. **Recherche de doublons** : à partir de la description de la tâche, identifie les mots-clés
   probables (nom de fonction/composant/type) et lance une recherche (grep/glob) dans le dossier
   concerné (`frontend/` ou `backend/`) pour vérifier qu'une implémentation similaire n'existe pas
   déjà. Liste ce que tu as trouvé, même si rien de pertinent.
2. **Relecture du contrat d'API** : si la tâche touche un appel réseau ou une forme de donnée,
   relis `docs/api-contract.md` et confirme que ce que tu vas faire est cohérent avec le contrat
   existant. Si un changement de contrat est nécessaire, propose-le explicitement avant de coder.
3. **Relecture des garde-fous UI** : si la tâche affiche du texte à l'utilisateur, relis
   `docs/ui-guardrails.md` et vérifie qu'aucune formulation interdite n'est introduite.
4. **Lecture de `PROGRESS.md`** : confirme que la tâche correspond bien à la phase en cours
   (`docs/phases/`) et ne casse pas une frontière frontend/backend.

Résume en 3-4 lignes ce que tu as vérifié avant de commencer à coder. Si tu identifies un doublon ou
un conflit avec le contrat d'API, arrête-toi et propose une solution avant de continuer.
