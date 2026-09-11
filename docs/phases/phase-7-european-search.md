# Phase 7 — Extended European Regulatory Search (frontend, Giang)

Source : réponse de Francis du 2026-09-11 (plan 10 jours généré via ChatGPT, à adapter aux
capacités réelles) + tableau des 10 user cases (UC01–UC10) + décision sur les couleurs.

**Portée de ce document : uniquement la colonne "Developer A / App / Integration" de son plan —
c'est-à-dire ce que Giang construit.** La colonne backend (CELLAR/SPARQL, extraction, dédoublonnage)
est à la main de Thư ; ce document note ses livrables attendus jour par jour comme **dépendance**,
pas comme travail à faire soi-même.

**Rapport avec `docs/phases/phase-6-francis-feedback.md`** : ce fichier ne le remplace pas. Les
sujets indépendants de cette phase (couleurs, rôles/profils FE) restent dans phase-6 et se font en
parallèle — ils ne bloquent rien ici et ne sont bloqués par rien ici non plus. Les sujets qui,
eux, fusionnent naturellement dans le travail European Search (écran Knowledge Base → section
« European Sources », écran Regulatory Changes → alimenté par les nouvelles publications UE) sont
absorbés dans les jours ci-dessous plutôt que traités deux fois.

**Mise à jour du 2026-09-11** : Francis a répondu sur la structure à 5 écrans de l'application
(`docs/phases/phase-6-francis-feedback.md` §2.2) — l'écran « Regulatory / Procedure Analysis » qu'il
y décrit **est le Jour 0 ci-dessous**, pas un écran séparé. Le « Ordre d'exécution » de phase-6 en
fait maintenant la priorité n°1 (avant même le reste du redesign Dashboard). **Construire le Jour 0
en suivant phase-6, pas ici en double** — ce document garde le détail technique (composants,
fichiers), phase-6 porte la priorité et le lien avec la demande de Francis.

---

## ⚠️ Jour 0 (prérequis, hors des 10 jours de Francis) : écran Procédure, à corriger

Le plan entier de Francis part de l'analyse **Procédure → Bank KB → Europe** (exemple :
`PROC-ICT-017`). **Correction du 2026-09-11** (le diagnostic initial du 2026-09-11 était trop
pessimiste — revérifié en détail après une question de Giang) : il existe déjà `/procedures/[id]`
(`frontend/src/app/[locale]/(app)/procedures/[id]/page.tsx` → `ProcedurePageView`) et
`fetchProcedures()` / `fetchProcedure()` (`lib/api/procedures.ts`, list + detail, déjà branchés en
mode mock et backend réel). **Mais ce n'est pas l'écran qu'il faut** : c'est un visualiseur en
lecture seule d'UN document cité par une preuve (ouvert uniquement via
`ProcedureEvidenceDialog` → « Open in new tab », avec `?excerpt=...&section=...` dans l'URL) — pas
un écran de navigation autonome. Concrètement, aujourd'hui :

- Il n'y a **aucun écran listant toutes les procédures** du système, nulle part dans la nav.
- Il n'y a **aucun moyen d'uploader une nouvelle procédure** (`uploadRegulation()` existe pour les
  régulations, `uploadProcedure()` n'existe pas — vérifié dans `lib/api/procedures.ts`).
- `/procedures/[id]` n'est **jamais lié depuis l'intérieur d'une régulation** : quand on « expand »
  une procédure sur l'écran Régulation, ça ouvre `ProcedureEvidenceDialog` (une modale), pas un
  lien vers cette page.
- `analyzeProcedure()` (l'appel `POST /api/procedures/:id/analyze`, contrat v1.7) n'existe
  toujours pas — ça, le diagnostic initial avait raison.

**Demande explicite de Giang (2026-09-11)** : un écran `/procedures` (liste) avec upload +
clic-pour-détail, réutilisant `/procedures/[id]` comme page de détail, et le lien « expand
procédure » depuis une régulation doit pointer vers cette même page plutôt que d'ouvrir seulement
une modale.

Avant de commencer D1, construire (c'est aussi UC02, « mandatory / P0 » chez Francis) :

- [x] **Nouvel écran `/procedures`** (liste) : table des procédures (`fetchProcedures()`, déjà
      disponible), même pattern que `/regulations` — colonnes titre, ID, domaine, date, clic →
      `/procedures/[id]`. Fait le 2026-09-11 (`ProceduresView`).
- [x] **`UploadProcedureDialog`** : copie de `UploadRegulationDialog` — `POST /api/procedures`
      ajouté au mock, contrat v1.8. Fait le 2026-09-11.
- [x] **Item de nav** `/procedures` dans `nav-items.ts`. Fait le 2026-09-11.
- [x] **`/procedures/[id]` a un bouton Imprimer** — vérifié encore visible en accès direct après
      les changements de cette session (pas seulement via `excerpt`).
- [x] **« Expand procédure » d'une régulation** : déjà relié à `/procedures/[id]` via le bouton
      « Ouvrir dans un nouvel onglet » de `ProcedureEvidenceDialog` (Phase 6 § 5) — vérifié
      suffisant, pas de lien direct supplémentaire ajouté dans `requirements-tab.tsx`.
- [x] Bouton/action "Analyser contre la base de conformité" sur `/procedures/[id]` → appelle
      `POST /api/procedures/:id/analyze` (contrat v1.7/v1.8) avec le sélecteur de scope D1
      directement posé sur cet écran. Fait le 2026-09-11.
- [x] Réutilisation de `FindingsActionsTable` telle quelle pour afficher le résultat de l'analyse
      (contrat étendu avec `requirements: Requirement[]`, v1.8, pour éviter une requête par
      exigence). Fait le 2026-09-11.
- [x] Fallback MSW pour `analyze` — répond honnêtement (`bank_requirements_identified: 0`,
      `findings: []`) plutôt qu'une erreur pour toute procédure inconnue du corpus mock (bug
      trouvé et corrigé en testant en mode backend réel, voir `PROGRESS.md`). Les compteurs Europe
      ne sont jamais renvoyés par le mock — affichés avec `AwaitingBackendBadge` côté écran.

**Sans ce jour 0, aucun jour du plan ci-dessous n'a d'écran sur lequel s'accrocher.**

---

## Plan jour par jour (Giang, colonne frontend)

| Jour | Livrable frontend | Dépendance backend (Thư) attendue ce jour-là | Fichiers concernés |
|---|---|---|---|
| **D1** ✅ | `RegulatoryScope` type (`"BANK" \| "BANK_PLUS_EU"`) + `RegulatoryScopeSelector` (Select Bank KB / Bank + Europe, pas un radio — composant déjà utilisé ailleurs pour ce genre de choix) posé sur l'écran Procédure du Jour 0. Fait le 2026-09-11. | Spike technique CELLAR/EUR-Lex (accès, stratégie de requête) — rien à intégrer encore | `types/api.ts`, `components/features/regulatory-scope-selector.tsx` |
| **D2** ✅ | Sélecteur connecté à l'appel `analyzeProcedure(id, scope)` ; en `BANK_PLUS_EU`, l'appel part quand même — `eu_candidate_requirements`/`additional_eu_candidates` restent `undefined` (jamais un mock silencieux), affichés avec `AwaitingBackendBadge`. Fait le 2026-09-11. | Premières requêtes CELLAR/SPARQL, métadonnées CELEX/ELI | `lib/api/procedures.ts` |
| **D3** | Orchestration **Bank-first, Europe additive** côté UI : la recherche Bank s'affiche et se rend utilisable immédiatement, la partie Europe arrive en second sans jamais bloquer/casser l'affichage Bank si elle échoue (règle explicite de Francis — `/analyze-procedure` : un échec du service européen ne doit jamais casser l'analyse standard) | Filtrage pertinence : procédure → thèmes → actes UE candidats | Logique dans le hook `useProcedureAnalysis` (nouveau, wrap React Query) |
| **D4** | UI de progression en 2 étapes : `✓ Bank Compliance KB searched` → `→ Searching European regulatory sources...` → `✓ European regulatory sources searched`, avec les compteurs (voir maquette de Francis) | Récupération du contenu source, extraction des passages pertinents | Nouveau `components/features/analysis-progress.tsx` |
| **D5 — jalon obligatoire** | Résultat Europe intégré dans la table Impact Analysis existante (`FindingsActionsTable`) : `PROC-ICT-017` doit afficher la chaîne complète Bank KB → Europe → constats, de bout en bout | Extraction structurée des "EU Candidate Requirements" | `findings-actions-table.tsx` (colonne Source), `types/api.ts` |
| **D6** | Badges `[BANK KB]` / `[EU LIVE]` + filtre par source dans la table (même pattern que le filtre domaine déjà existant) | Dédoublonnage exigences UE vs exigences Bank déjà connues | `assessment.ts` (nouvelle fonction de style de badge, **pas une couleur de statut** — voir note couleur plus bas), `requirements-tab.tsx` |
| **D7** | Panneau de provenance européenne (repository, CELEX, ELI, langue, date de récupération, `[Voir la source originale]`) dans `FindingDetailDialog` | Séparation relevance / applicability / coverage | Nouveau `components/features/eu-provenance-panel.tsx`, ajout du champ `applicability` (v1.7) dans `FindingDetailDialog` |
| **D8** | Accepter / Rejeter / Escalader fonctionne identiquement sur un "EU Candidate Finding" (réutiliser le workflow existant, pas un nouveau) ; libellés `[ACCEPT AS APPLICABLE] [NOT APPLICABLE] [ESCALATE]` uniquement quand `source === "EU_LIVE"` | Validation + tests golden + gestion d'échec | `finding-action-row.tsx` |
| **D9** | Dashboard : bloc "Bank KB vs EU Live" (tableau comparatif, voir maquette de Francis) + compteur "3 additional regulatory candidates identified from European sources" — **c'est ici que l'écran Regulatory Changes (demandé dans le mail précédent) trouve sa place naturelle**, alimenté par les mêmes données | Tuning sur les scénarios KYC + DORA | `portfolio-dashboard-view.tsx`, nouveau bloc de comparaison |
| **D9bis** (nouveau, 2026-09-11) | Copilot : filtrer les questions/réponses par source Bank/EU (« which findings came from Europe? ») — demandé par Francis dans sa réponse sur la structure à 5 écrans (§2.2, `docs/phases/phase-6-francis-feedback.md`), pas prioritaire pour la 1ère démo (Copilot = polish, pas chemin critique) | Aucune si le Copilot reste en mode présentation (P2) — sinon, dépend du pipeline de réponse du Copilot lui-même | Écran Copilot, actuellement placeholder (`docs/known-limitations.md` #11) |
| **D10** | Polish FR/EN (toutes les nouvelles chaînes dans `messages/fr.json` + `messages/en.json`, aucune exception), déploiement, répétition du scénario CASE-09 en conditions réelles | Cas limites, comportement si service européen indisponible | Vérification visuelle obligatoire avant de clore |

## Note couleur (rappel du retour du 2026-09-11)

Francis a tranché : **jamais de rouge ni d'orange dans un graphique/élément à plusieurs couleurs
simultanées** (l'œil s'y précipite) — mais un indicateur à une seule échelle (heatmap, force de la
preuve) peut garder rouge/orange. Concrètement pour cette phase :

- Les badges `[BANK KB]` / `[EU LIVE]` (D6) : **pas de rouge/orange**, utiliser du neutre (gris
  foncé / bleu sourd, cohérent avec `--cat-1` bleu déjà safe) — ce sont des étiquettes de source,
  pas un statut.
- La palette catégorielle 8 couleurs de `docs/ui-guidelines.md` (répartition par domaine) : retirer
  purement et simplement les 2 teintes rouge/orange (slots 2 et 8 actuels) — traité dans
  `docs/phases/phase-6-francis-feedback.md` §0, en parallèle de cette phase, pas dupliqué ici.
- La barre "Force de la preuve" (déjà rouge/jaune/vert, à une seule échelle) : **ne change pas**,
  Francis l'a explicitement validée (« On the heatmap this is good »).

## Convention « en attente backend » appliquée à cette phase (2026-09-11)

Même décision que Phase 6 (voir `docs/ui-guidelines.md` § « donnée en attente côté backend ») :
construire les écrans D1–D10 maintenant avec les données réellement disponibles, ne jamais afficher
un chiffre mocké comme s'il était réel, et marquer avec `AwaitingBackendBadge` chaque valeur qui
dépend d'un endpoint/champ que Thư n'a pas encore livré — Thư a déjà été prévenu directement du
détail (message de Giang, 2026-09-11), il verra les badges dans l'app plutôt que d'attendre une
liste séparée.

Concrètement :
- `eu_candidate_requirements`, `already_in_bank_kb`, `additional_eu_candidates` (D2–D9) : tant que
  `POST /api/procedures/:id/analyze` ne renvoie pas de vraies valeurs côté `scope: "BANK_PLUS_EU"`,
  ces compteurs portent `AwaitingBackendBadge` (`field="Finding.eu_candidate_requirements"` etc.)
  plutôt qu'un mock silencieux — différent des badges de source `[BANK KB]`/`[EU LIVE]` (D6, ceux-là
  restent tels quels, ils étiquettent une origine, pas une donnée manquante).
- `eu_provenance` (D7) : mêmes emplacements en attente tant que Thư n'a pas de vraie extraction
  CELEX/ELI — le panneau de provenance s'affiche avec la structure prévue, badge à la place des
  valeurs.
- Ne s'applique volontairement pas à `CASE-09` / `PROC-ICT-017` (le golden scenario, `docs/use-cases.md`) :
  ce scénario reste un mock **assumé et documenté comme tel** pour la démo, ce n'est pas une donnée
  qui prétend être réelle — pas de badge nécessaire là où le mock est le scénario lui-même.

## Definition of Done (reprend la formulation exacte de Francis, 2026-09-11)

> Given a new/modified Bank procedure, the user can choose Bank-only or Bank+EU analysis. Abiaka
> first searches the Bank compliance corpus, optionally retrieves relevant authoritative EU
> sources, identifies additional candidate requirements without duplicating known requirements,
> compares them against the procedure with original-source evidence, proposes operational
> actions, and leaves applicability and final compliance conclusions to the Compliance Officer.

- [ ] Jour 0 : écran Procédure + `analyzeProcedure` (mock ou réel) fonctionnels
- [ ] D1–D10 ci-dessus complétés côté frontend
- [ ] `CASE-09` (PROC-ICT-017 / DORA) rejouable de bout en bout — voir `docs/use-cases.md`
- [ ] Un échec du service européen n'empêche jamais de voir les résultats Bank KB (testé
      explicitement, pas juste supposé)
- [ ] Aucun texte UI en dehors de `messages/fr.json` / `messages/en.json`
- [ ] `docs/api-contract.md` v1.7 confirmé avec Thư (actuellement : proposition frontend, non
      encore alignée backend)
- [ ] `PROGRESS.md` mis à jour en fin de phase

## Ce qu'on NE fait PAS dans cette phase (V2, dixit Francis)

Surveillance réglementaire continue, alertes RSS, toutes les sources UE, intégration live ACPR/EBA,
détermination automatique de l'applicabilité légale, historique sophistiqué des changements
réglementaires, moteur de recherche UE parfait.
