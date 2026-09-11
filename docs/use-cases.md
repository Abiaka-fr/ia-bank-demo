# Cas d'usage métier (UC01–UC10) — critères d'acceptation

Source : email de Francis du 2026-09-11. Remplace le besoin des « 6 user journeys » (lien ChatGPT
illisible, voir `PROGRESS.md`) — cette table est plus précise et actionnable. **P0 = les 6
premiers, obligatoires pour la démo ; P1 = les 4 suivants, si le temps le permet.**

À utiliser comme grille de test avant toute démo, et comme check-list de non-régression après
chaque session de code touchant l'analyse ou la validation.

| # | Cas d'usage | Action utilisateur | Comportement attendu d'Abiaka | Priorité | Cas corpus |
|---|---|---|---|---|---|
| UC01 | Analyser une nouvelle régulation | Compliance upload/sélectionne une régulation | Extraire les exigences → trouver les procédures Bank impactées → identifier couverture/écarts → actions | P0 | CASE-01 à CASE-08 (corpus existant) |
| UC02 | Analyser une procédure Bank nouvelle/modifiée | Upload/sélection d'une procédure | Chercher dans la Bank Compliance KB → exigences applicables → évaluer la couverture | P0 | **Nécessite l'écran Procédure — voir Phase 7 § Jour 0** |
| UC03 | Étendre l'analyse d'une procédure à l'Europe | Sélectionne « Bank + European Sources » | Bank KB d'abord → recherche UE ensuite → exigences candidates UE additionnelles | P0 / **wow moment** | CASE-09 (nouveau, voir plus bas) |
| UC04 | Investiguer un écart potentiel | Clique sur un constat | Preuve réglementaire vs preuve interne, élément manquant, explication, action recommandée | P0 | Déjà couvert (`FindingDetailDialog`) |
| UC05 | Validation humaine | Compliance relit un constat IA | Accepter / Rejeter / Escalader / Commenter, avec piste d'audit | P0 | Déjà couvert |
| UC06 | Exigence ambiguë | L'IA rencontre une formulation réglementaire non spécifique | Retourner « Interprétation humaine requise », ne jamais inventer une règle précise | P0 | CASE-07 (« Ambiguous Requirement », corpus existant) |
| UC07 | Aucune couverture interne | Une exigence n'a pas de procédure correspondante | « Aucune procédure pertinente trouvée » + recommander une investigation (jamais « la banque n'est pas conforme ») | P1 | CASE-08 |
| UC08 | Analyse cross-langue | Exigence UE en anglais vs procédure Bank en français | Correspondance sémantique correcte, preuve originale conservée dans sa langue source (jamais traduite à la place de l'original) | P1 | Corpus EBA(EN) / procédures FR existant |
| UC09 | Interroger le Compliance Copilot | « What are my high-priority gaps? » | Répondre uniquement à partir des constats/preuves existants, toujours avec citation | P1 | Écran Copilot (actuellement P2/placeholder — voir `docs/phases/phase-5-client-readiness.md`) |
| UC10 | Plan d'action opérationnel | « Generate an operational action plan » | Générer des actions priorisées, équipes impactées, statut de validation | P1 | Nouveau — recoupe l'écran Report/Export évoqué dans le mail précédent de Francis |

## Détail des cas les plus structurants

### UC05 — Le Compliance Officer n'est pas d'accord avec l'IA

Important pour la crédibilité banque. L'IA propose `POTENTIAL_GAP`, l'humain choisit `REJECTED` et
écrit une raison (« Covered by PROC-KYC-012 §7.2, which was not retrieved »). Le finding garde
**les deux** informations côte à côte : l'évaluation IA d'origine ET la décision humaine — ne
jamais écraser l'une par l'autre. Déjà supporté par le modèle actuel (`assessment` +
`human_status` + `reviewer_comment` sont des champs distincts) — à vérifier que l'UI les affiche
bien tous les deux simultanément sur un constat rejeté, pas seulement le dernier état.

### UC06 — L'IA ne sait pas (comportement sûr)

Utiliser CASE-07 du corpus existant. Un mot comme « promptly » ou « proportionate to risk » ne doit
jamais devenir « the Bank must remediate within 30 days » — le texte affiché doit rester au niveau
`EXPERT_REVIEW` avec une explication qui dit explicitement qu'aucun délai précis n'est fixé par le
passage source. Vérifier ce texte dans `docs/glossary.md`/`docs/ui-guardrails.md` — c'est un test de
non-régression sur les garde-fous produit, pas juste un test fonctionnel.

### CASE-09 — European Extended Search (nouveau golden scenario)

- **Procédure** : `PROC-ICT-017` — ICT Third-Party Risk Management (synthétique, à créer)
- **Run 1 — Bank KB only** : 11 exigences trouvées (7 covered / 3 partial / 1 potential gap)
- **Run 2 — Bank + European Regulatory Sources** :
  - Bank KB : 11 exigences (inchangé)
  - Candidats UE : 9
  - Déjà représentés dans Bank KB : 6
  - Nouveaux candidats UE : 3
  - Exemple de nouveau constat : *ICT Exit Strategy Testing*, source DORA — Regulation (EU)
    2022/2554, procédure `PROC-ICT-017 §8.4`, assessment `PARTIALLY_COVERED`, applicability
    `TO_BE_CONFIRMED`, priorité `HIGH`
- Ce scénario est LE test de bout en bout de la Phase 7 (jalon D5 + DoD final)

## Storyline recommandée pour la démo (ne pas dérouler les 10 UC un par un)

1. Nouvelle/modifiée procédure
2. Analyser contre Bank KB
3. Montrer un écart potentiel
4. Étendre la recherche à l'Europe
5. Découvrir un candidat UE additionnel
6. Ouvrir la preuve (régulation UE ↔ procédure Bank)
7. L'IA rencontre une ambiguïté → Interprétation humaine requise
8. Le Compliance Officer valide
9. Générer le plan d'action opérationnel

Message de clôture (formulation de Francis, à réutiliser telle quelle en démo) : *« Abiaka first
tells you what your own Compliance knowledge base already knows. With one selection, the
Compliance Officer can extend the same analysis to authoritative European regulatory sources,
identify additional candidate requirements, understand exactly why they may impact the procedure,
and decide what action to take — with the final decision remaining under human control. »*
