# Garde-fous UI — Formulations Autorisées / Interdites

**Règle produit non négociable** : l'outil ne doit JAMAIS affirmer une conclusion de conformité
autonome. Il propose des constats ; un humain (Responsable Conformité) valide. Toute chaîne de
caractères affichée à l'utilisateur (label, message, tooltip, texte de bouton, texte du Copilot)
doit respecter ce tableau. Source : Full Project Guide section 14.1.

| ❌ Ne jamais afficher | ✅ Utiliser à la place |
|---|---|
| "The Bank is non-compliant" / "La banque n'est pas conforme" | "Écart potentiel détecté — revue de conformité requise" |
| "The AI validated compliance" / "L'IA a validé la conformité" | "Preuve identifiée — validation par un expert requise" |
| "This procedure violates the regulation" / "Cette procédure viole la régulation" | "Cette procédure ne semble pas couvrir intégralement l'exigence REQ-XXX" |
| "No rule exists" / "Aucune règle n'existe" | "Aucune procédure interne pertinente trouvée dans le corpus indexé" |
| Réponse du Copilot sans citation | Toujours citer la preuve, ou dire explicitement qu'aucune preuve n'a été trouvée |

## Autres règles de formulation

- Le score de confiance (si affiché) n'est PAS une probabilité juridique — le libeller comme un
  indicateur d'aide à la décision ("force de la preuve"), jamais comme une certitude.
- Toujours afficher la preuve source (extrait + référence document/section) à côté de tout constat
  matériel — jamais un constat "nu" sans traçabilité.
- Le texte affiché doit rester en français par défaut (voir `docs/ui-guidelines.md` — French-first).

## Code couleur des 5 statuts d'évaluation

Voir `docs/glossary.md` pour la table complète — à respecter strictement pour cohérence visuelle
(ne pas réinventer une palette par écran).
