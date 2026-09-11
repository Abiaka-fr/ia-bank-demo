# Phase 6 — Retours Francis (post Phase 5, ≈ Semaine 2)

Source : session vocale de fin de Semaine 1 (transcript) + 2 emails de suivi (« Extended European
Regulatory Search » et « dashboard/profils »). Remplace la portée générique de l'ancienne
Phase 6 (« contingence/polish ») — Francis a donné un backlog concret, on n'a plus besoin d'un
fourre-tout.

**Décision de cadrage (Giang, 2026-09-10), à respecter dans toute cette phase :**

1. **Le frontend avance sans attendre le backend.** `backend/` reste au choix de Thư (stack,
   calendrier) — cette phase ne bloque sur aucune décision backend sauf mention explicite « ⛔
   bloqué côté backend » ci-dessous.
2. **Les rôles/profils sont géés 100 % côté frontend, aucune autorisation réelle côté serveur.**
   `User.role` reste une chaîne libre non validée par le backend (`backend/app/schemas/user.py`,
   contrat v1.5) — on ne demande pas à Thư de créer une énumération ni un système de permissions.
   Le frontend décide seul quoi afficher/cacher selon le rôle. C'est un garde-fou d'expérience de
   démo, pas une sécurité — à documenter dans `docs/known-limitations.md` comme les autres.
3. **Priorité au visible en démo.** Un item qui change ce que Francis voit à l'écran passe avant un
   item d'infrastructure invisible.

---

## 0. Le sujet le plus sensible en premier : couleurs

> Francis, verbatim : *« Red or orange means important. When I look at your screen, straight away
> I'm looking at potential gap because red, and next AI governance because orange. »*

**Diagnostic précis** (fait le 2026-09-10, avant d'écrire cette phase — voir
`frontend/src/app/globals.css` et `docs/ui-guidelines.md` § Palette) : la palette catégorielle des
8 domaines (graphique « Exigences par domaine », carte des impacts) **chevauche la palette de
statut** à 3 endroits sur 8, pas un seul :

| Slot catégoriel | Teinte | Hex | Collision avec |
|---|---|---|---|
| 2 | orange | `#eb6834` | proche de `PARTIAL` (ambre `#fab219`) et `POTENTIAL_GAP` (rouge `#d03b3b`) — **exactement le cas signalé par Francis** |
| 4 | jaune | `#eda100` | proche de `PARTIAL` (ambre `#fab219`) |
| 6 | vert | `#008300` | proche de `COVERED` (vert `#0ca30c`) |
| 7 | violet | `#4a3aa7` | **identique** à `EXPERT_REVIEW` — documenté comme intentionnel dans `docs/ui-guidelines.md`, mais risqué si un domaine tombe sur ce slot pendant que des badges de statut sont visibles au même écran |
| 8 | rouge | `#e34948` | quasi identique à `POTENTIAL_GAP` (rouge `#d03b3b`) |

Autrement dit : **4 des 8 couleurs de domaine peuvent se faire lire comme un statut** — vert =
« couvert », jaune/orange = « partiel/gap », rouge = « gap », violet = « revue experte ». Sur un
dashboard qui affiche les deux palettes côte à côte (répartition par domaine + répartition par
statut), c'est le pire des cas.

`docs/ui-guidelines.md` précise que cette palette catégorielle vient « d'une méthode de data-viz
avec vérification d'accessibilité CVD/contraste automatisée — ne pas improviser d'autres couleurs
à côté ». **Donc pas de correctif à la volée avec des hex choisis au pif** : à refaire proprement
avec la méthode de palette (skill `dataviz` disponible côté Claude Code), en imposant une
contrainte nouvelle qui n'existait pas à la conception initiale : **exclure des 8 teintes
catégorielles toute la famille rouge/orange/ambre/vert/violet déjà réservée aux 5 statuts**, pas
seulement éviter les doublons exacts.

**Décision finale de Francis (2026-09-11, plus simple que la contrainte initiale ci-dessus) :**
pas besoin d'exclure toute la famille ambre/vert/violet — seulement rouge et orange, parce que ce
sont les deux teintes qui déclenchent la lecture réflexe « urgent ». Citation exacte : *« never use
red or orange in any chart/element carrying multiple simultaneous colors »* — et il valide
explicitement que la barre Force de la preuve (rouge/jaune/vert, une seule échelle) reste telle
quelle (« On the heatmap this is good »). Donc seuls les slots 2 (orange) et 8 (rouge) ont été
remplacés, pas les 8.

**Action concrète — FAIT le 2026-09-11** :
- [x] Recherche des 2 nouvelles teintes avec `scripts/validate_palette.js` du skill `dataviz`
      (bande de luminosité, plancher de chroma, séparation CVD protan/deutan/tritan, plancher de
      vision normale ΔE≥15, `--pairs all`) — pas de hex choisi au pif. Résultat : slot 2 devient
      prune/magenta `#93126b` (clair) / `#d162a5` (sombre), slot 8 devient brun/olive `#7b4a00`
      (clair) / `#b08a00` (sombre). Palette complète re-testée en `--pairs all` : tous les checks
      passent (seuls les 2 WARN de contraste déjà présents avant le changement subsistent, rien de
      nouveau).
- [x] `frontend/src/app/globals.css` mis à jour (`--cat-2`, `--cat-8`, clair et sombre).
- [x] `docs/ui-guidelines.md` § Palette catégorielle mis à jour avec la nouvelle table (clair +
      sombre) et la citation de Francis.
- [x] **Vérification visuelle faite le 2026-09-11** (Claude Code) : dashboard réel (backend local,
      Marie Lefèvre) confirme le slot 2 (« AI_GOVERNANCE ») en prune/magenta, plus en orange.
- [ ] **Trouvaille annexe, pas dans le scope de la demande de Francis** : en testant, la palette
      sombre complète (les 6 autres slots inchangés) ne passe PAS `validate_palette.js --mode dark`
      — la plupart de ses valeurs dépassent la bande de luminosité attendue en sombre. Documenté
      comme limitation séparée dans `docs/known-limitations.md` (point 13), pas bloquant pour la
      démo (mode clair par défaut), à reprendre en entier une autre fois.

---

## 1. Rôles & profils d'accès — 100 % frontend

Francis distingue 3 profils dans son email dashboard (Head of Compliance / Compliance Officer /
Compliance Knowledge Manager-Admin) et cite explicitement l'auditeur dans la session vocale
(« when I am an auditor, I will get one or two functionality »). Bonne nouvelle : **les 4 comptes
de démo existants (`scripts/local-dev/seed_dev_db.py`) couvrent déjà 3 de ces profils sans rien
ajouter côté données** :

| Compte démo existant | `role` (chaîne libre, backend) | Profil d'accès (frontend, nouveau) | Écran d'atterrissage | Peut valider un constat ? | Voit Knowledge Base / Admin ? |
|---|---|---|---|---|---|
| Marie Lefèvre | Responsable Conformité | **HEAD_OF_COMPLIANCE** | Dashboard (vue exécutive) | Optionnel (lecture prioritaire) | Non |
| Thomas Rousseau | Analyste Conformité | **COMPLIANCE_OFFICER** (profil principal de la démo) | Analyse d'impact | Oui — Accepter/Rejeter/Escalader, upload | Non |
| Claire Dubois | Auditeur Interne | **AUDITOR** | Analyse d'impact (lecture seule) | Non — boutons de décision masqués | Non |
| Karim Benali | Juriste Réglementaire | **COMPLIANCE_OFFICER** | Analyse d'impact | Oui | Non |
| **(à ajouter — 1 compte)* | proposer « Admin Base de Connaissances » | **COMPLIANCE_ADMIN** | Knowledge Base (voir § 3) | Non | Oui — gestion utilisateurs, vue sources |

**Comment ça marche techniquement (frontend seul)** :
- Nouveau `lib/access-profile.ts` : une table de correspondance `role string → AccessProfile`
  (avec les 4 libellés démo ci-dessus déjà mappés) + un **profil par défaut `COMPLIANCE_OFFICER`**
  pour tout rôle non reconnu — donc aucune régression si Thư ou quelqu'un crée un compte avec un
  intitulé de poste imprévu.
- `AccessProfile` pilote : (a) les items visibles dans `nav-items.ts`/`app-sidebar.tsx`, (b) la
  route de redirection après connexion, (c) si les boutons Accepter/Rejeter/Escalader et le bouton
  Upload sont rendus ou non dans `findings-actions-table.tsx` / `regulations-view.tsx`.
- **Rien de tout ça ne passe par une requête réseau** — même utilisateur, même token, juste un
  `switch` côté client sur le libellé de rôle déjà chargé en session. C'est explicitement un
  garde-fou d'expérience de démo, pas un contrôle d'accès réel — à écrire noir sur blanc dans
  `docs/known-limitations.md` (nouveau point, à côté du #10 déjà existant sur le changement de
  rôle libre).

**Definition of Done** :
- [x] `lib/access-profile.ts` + table de mapping + tests unitaires (comme `assessment.ts`)
- [x] Sidebar filtrée par profil (masquer, pas désactiver visuellement en grisé — Francis veut une
      expérience nette par rôle, pas un écran plein de trucs interdits)
- [x] Redirection post-connexion vers l'écran d'atterrissage du profil
- [x] Boutons de décision masqués pour `AUDITOR`
- [x] 5ᵉ compte démo « Admin Base de Connaissances » ajouté dans `scripts/local-dev/seed_dev_db.py`
      (hors `backend/`, autorisé)
- [x] `docs/known-limitations.md` mis à jour

**Fait le 2026-09-11** (Claude Code) — voir l'entrée correspondante dans `PROGRESS.md` pour le détail
et la vérification en conditions réelles. Note ouverte : `COMPLIANCE_ADMIN` pointe temporairement
vers `/regulations` en attendant que l'écran Knowledge Base (§ 3) existe.

---

## 2. Dashboard exécutif — ajustements, pas reconstruction

**Correction du 2026-09-11, après relecture du transcript brut (`Feedback week 1.docx`) :**
Giang se souvenait que Francis demandait un dashboard « façon ticket report ». C'est l'inverse —
citation exacte : *« When I get a look on the first dashboard, it is more like a ticket following...
I just see the background of ticket that I need to analyze, but for me it is more like just a
reporting application, not a full analysis. »* **Francis reproche au dashboard de RESSEMBLER à un
suivi de tickets, et demande le contraire** : un outil d'analyse conformité, pas un tracker.

Ce que ça implique concrètement (nouveau, pas encore dans les 3 items ci-dessous) :
- Un **résumé court par document** (une phrase disant de quoi il parle), pas seulement
  `regulation_id` + titre — citation : *« I have just a title. I don't know what is about this
  document... it can be interesting to have a short résumé of that document. »*
- Un **filtre par classification/type de document** (« concerning customer », « concerning head
  office »...), pas seulement par autorité — citation : *« if I have 100 documents to validate, I
  will get too much block... I want to use some filter possibility. »*
- Confirme (déjà capté au §1) que le dashboard doit changer **radicalement** selon le rôle, pas
  juste rediriger vers une route différente — citation : *« when you connect in term of compliance
  officer or auditor intern, you cannot get the same dashboard, not at all. »*

**Statut réel au 2026-09-11 (vérifié dans le code, pas supposé)** : `portfolio-dashboard-view.tsx`
porte le commentaire `// Écran d'accueil (v1.1)` — c'est-à-dire que sa structure (5 KPI + graphique
domaine + graphique statut + table « Détail par régulation » + mindmap) **n'a pas changé depuis
avant le retour de Francis**. Seuls les 3 points ci-dessous (CTA, route d'atterrissage, filtre
autorité) ont été traités — **le sentiment « ticket-tracker » que Francis reproche n'a, à ce stade,
reçu aucune correction**. Les deux points « résumé court » et « filtre par classification »
ci-dessus sont donc de nouveaux items à planifier, pas des doublons de travail déjà fait.

Le Dashboard actuel (KPI + répartition domaine/statut + carte des impacts + top findings) colle
déjà à ~80 % à l'« Executive Compliance Dashboard » de Francis en termes de contenu affiché — le
problème signalé est plus une question de **ton/présentation** (compte de tickets vs outil
d'analyse) que de données manquantes. Écarts déjà traités :

- [x] Bouton **« Lancer une nouvelle analyse d'impact »** proéminent (CTA en haut du dashboard,
      pas seulement accessible depuis l'écran Régulations) — fait le 2026-09-11, mène vers
      `/regulations` (pas d'écran « Analyse d'impact » global depuis la revue v1.1)
- [x] Ce dashboard est l'écran d'atterrissage de `HEAD_OF_COMPLIANCE` uniquement — pour
      `COMPLIANCE_OFFICER`/`AUDITOR`, l'atterrissage direct est `/regulations` (le plus proche
      d'« Analyse d'impact » sans régulation présélectionnée) — fait dès la Phase 6 § 1
- [x] Filtre **par autorité** (ACPR / EBA / EU...) — fait le 2026-09-11, mais placé sur l'écran
      « Analyse réglementaire » (liste des régulations) et non sur l'onglet Exigences comme
      envisagé initialement : `authority_or_owner` est un champ de la régulation
      (`DocumentMeta`), pas de l'exigence (`Requirement`) — au sein d'une seule régulation déjà
      ouverte, toutes les exigences partagent la même autorité, un filtre y serait un no-op
- [x] **Recherche par titre/identifiant** sur l'écran « Analyse réglementaire » — demandé
      explicitement par Giang le 2026-09-11 (pas dans le texte original de Francis, mais même
      besoin concret que le filtre autorité), même emplacement et même pattern que la recherche
      déjà existante sur l'onglet Exigences (`requirements-tab.tsx`)
- [x] **Résumé court par document** — FAIT le 2026-09-11 : `AwaitingBackendBadge`
      (`components/features/awaiting-backend-badge.tsx`, `field="DocumentMeta.summary"`) affiché
      sur chaque carte, à la place du texte de résumé, tant que `DocumentMeta.summary` n'existe pas
      (backend ni mock). Thư a été prévenu directement (message de Giang, 2026-09-11).
- [x] **Filtre par classification de document** (« concerning customer », « concerning head
      office »...) — FAIT le 2026-09-11 : option de filtre visible dans le menu (`regulations-view.tsx`)
      mais désactivée, avec `AwaitingBackendBadge` (`field="DocumentMeta.classification"`) en regard
      — `document_type` existant ne porte que `REGULATION`/`INTERNAL_PROCEDURE`, pas cette
      classification métier.

**Ce qui n'a pas encore été codé (au 2026-09-11)** — raison technique, pas de la paresse :
- `documentMetaSchema` (`frontend/src/types/api.ts`), le schéma utilisé pour toute vue en LISTE
  (dashboard, `/regulations`, Knowledge Base), n'a **aucun champ résumé/description**. Le texte
  complet (`extracted_text`) n'existe que sur `documentDetailSchema`, chargé document par document
  — afficher un résumé sur chaque carte de liste sans champ dédié demanderait de charger le texte
  complet de chaque document juste pour en tronquer un extrait (N+1 requêtes, mauvais pattern).
  D'où le badge plutôt qu'un contournement technique douteux.
- Le filtre par classification suppose une taxonomie qui n'existe nulle part dans le corpus actuel
  (`Document.domain` est la seule classification réelle, déjà utilisée par le filtre autorité) —
  inventer les catégories aurait été de la donnée fabriquée, contraire à `docs/ui-guardrails.md`.
  D'où l'option désactivée + badge, plutôt que des catégories inventées ou une absence totale.

**Statut avec Thư (2026-09-11)** : Giang lui a déjà signalé la liste complète des champs manquants
(résumé, classification, dates — voir §4). Convention retenue : **construire et afficher tout de
suite avec le badge « en attente »**, Thư verra directement dans l'app quel champ manque exactement
plutôt que d'attendre une liste séparée — il complètera à son rythme, sans que ça bloque le
frontend.

---

### 2.1 Carte des impacts (mindmap) — Francis l'a mentionné, pas encore traité

**Trouvé en relisant le transcript brut le 2026-09-11** (Giang avait raison de redemander) —
citation exacte : *« I like this graph, huh? But I have just the ID number. [...] I need to click
on it to know exactly what is about that document. [...] this is mandatory to have it, but perhaps
we can also ameliorate a bit the visibility. »*

Vérifié dans `regulation-mindmap.tsx` (2026-09-11) — **deux problèmes différents, pas un seul** :

- **Nœud Exigence** : `normalized_requirement` (le texte humain de l'exigence, ex. « Le client doit
  fournir une preuve d'identité avant l'ouverture du compte ») **existe déjà dans la réponse API**
  (`RegulationMapRequirement.normalized_requirement`, `docs/api-contract.md`) mais **n'est jamais
  affiché** — seuls `requirement_id` et `source_reference` (ex. « Section 6 ») sont utilisés comme
  label/sous-label (`regulation-mindmap.tsx` lignes ~91-93). **Aucun backend requis** : c'est un pur
  oubli d'affichage, à corriger en changeant le `sublabel` pour `normalized_requirement` (tronqué),
  en gardant `source_reference` en tooltip ou en 3e ligne.
- **Nœud Procédure** : ici, contrairement à l'exigence, **il n'y a vraiment aucun titre dans la
  réponse API** — `RegulationMapProcedure` (contrat) n'a que `finding_id`, `procedure_id`,
  `assessment`, `human_status`, pas de titre. Ça correspond exactement au « just the ID number » de
  Francis. **Ça, c'est un vrai ajout de contrat** (`procedure_title` sur `RegulationMapProcedure`,
  ou joindre côté backend depuis `Document.title`) — en attendant, badge `AwaitingBackendBadge`
  (`field="RegulationMapProcedure.procedure_title"`) à côté du code, pas de contournement en
  rejouant un fetch séparé par procédure (mauvais pattern, déjà écarté ailleurs dans ce document).

### 2.2 « Il y a 5 ou 6 dashboards », pas un seul à retravailler — ampleur sous-estimée

**Trouvé en relisant le transcript brut le 2026-09-11.** Ce n'est pas une reformulation du dashboard
actuel que Francis demande : citations exactes — *« there is five or six dashboards that we need to
have in the application [...] we need to arrange that one. I will get a look just after our
meeting. »* Et plus loin : *« The dashboard list, we need to review it definitively [...] they will
give you quickly the number of dashboards that we need according to the role of the person [...]
when you connect in term of compliance officer or auditor intern, you cannot get the same
dashboard, not at all. »*

**Ce que ça veut dire concrètement** : pas 1 dashboard avec un contenu ajusté selon le rôle (ce que
fait déjà §1 aujourd'hui — même écran, landing route différente), mais potentiellement **plusieurs
écrans de dashboard structurellement différents** selon le rôle/l'intention (piloter le stock de
documents ? lancer une analyse ciblée Europe ? etc. — Francis donne lui-même 2-3 exemples d'intention
différente dans le transcript). C'est un changement d'architecture d'écran, pas un ajustement de
contenu — bien plus gros que les 3 items déjà traités en §2.

**RÉSOLU le 2026-09-11** — Francis a effectivement renvoyé sa liste, comme annoncé. Réponse
exacte, **5 écrans, pas 6** :

1. **Compliance Dashboard** — landing, KPI (requirements identified, impacted procedures,
   potential gaps, expert reviews, pending actions, **+ Bank KB vs EU findings**, nouveau)
2. **Regulatory / Procedure Analysis** — upload/sélection d'une régulation OU d'une procédure
   interne, **+ sélecteur de scope** (Bank Compliance KB / Bank + European Regulatory Sources)
3. **Impact Analysis** — l'écran « hero » : exigence, procédure appariée, assessment, source,
   priorité, action — les 5 statuts (Covered/Partial/Potential Gap/No Relevant Procedure/Human
   Interpretation Required)
4. **Evidence & Explainability** — preuve réglementaire + preuve procédure interne côte à côte,
   explication IA, éléments manquants, applicability, boutons de validation humaine
5. **Compliance Copilot / Actions** — questions du type « high-priority gaps », « findings from
   Europe », « generate an operational action plan »

Flux de navigation voulu : `Dashboard → Analyze → Impact Analysis → Evidence & Validation →
Copilot/Actions`. **Explicitement pas de 6e écran pour l'Europe** — l'extension modifie les 4
premiers écrans (KPI Bank vs EU au Dashboard, sélecteur de scope à l'Analyse, badges
`[BANK KB]`/`[EU LIVE]` à l'Impact Analysis, provenance CELEX/ELI/Applicability à l'Evidence) **+
un ajout côté Copilot non prévu jusqu'ici : filtrer les questions par source Bank/EU**.

**Priorité donnée par Francis lui-même, à respecter dans l'ordre d'exécution** : sur les 5, seuls 3
sont essentiels pour la toute première démo client — **Analyze, Impact Analysis, Evidence &
Validation**. Dashboard et Copilot « add polish and commercial impact » mais ne sont pas sur le
chemin critique.

**Comparé à ce qui existe aujourd'hui dans le code (vérifié le 2026-09-11)** :
- **Écran 1 (Dashboard)** — déjà là (`portfolio-dashboard-view.tsx`), ajustements en cours (§0, §2).
  KPI « Bank KB vs EU » dépend de la Phase 7 (D9).
- **Écran 2 (Analyze) — LE VRAI MANQUE** : aujourd'hui, uploader une régulation est une simple
  modale (`UploadRegulationDialog`) sans sélecteur de scope, et il n'existe **aucun équivalent pour
  une procédure** (confirmé Jour 0 de `docs/phases/phase-7-european-search.md`). Francis vient de
  confirmer que ceci mérite un vrai écran dédié, pas une modale annexe — **fusionner** ce qui était
  déjà prévu séparément : le nouvel écran `/procedures` (upload demandé par Giang) + le sélecteur de
  scope (D1 de la Phase 7) + l'upload régulation existant, en une seule étape « Analyze » cohérente.
- **Écran 3 (Impact Analysis)** — déjà l'onglet « Actions » (`FindingsActionsTable`), déjà l'écran
  le plus soigné de l'app — correspond bien à la description de Francis.
- **Écran 4 (Evidence & Explainability)** — déjà `FindingDetailDialog`/`EvidenceCard` (côte à côte,
  explication, validation humaine) — il manque `applicability` (Phase 7 D7, pas encore fait).
- **Écran 5 (Copilot)** — aujourd'hui marqué **« écran de présentation P2, ne doit jamais devenir
  l'écran principal »** dans `docs/known-limitations.md` point 11. Francis le compte maintenant
  explicitement parmi les 5 écrans officiels (pas essentiel pour la 1ère démo, mais plus un simple
  habillage à terme) — **à reformuler dans known-limitations.md**, pas à construire dans l'urgence.

**Nouveau, pas encore dans `docs/phases/phase-7-european-search.md`** : ajouter au Copilot un filtre
Bank/EU sur les questions — item D-quelconque à insérer dans le plan jour par jour de la Phase 7.

**Ordre d'exécution à revoir** : la priorité de Francis (Analyze > Impact Analysis > Evidence, avant
Dashboard/Copilot) ne correspond pas exactement à l'ordre actuel de ce document (§0 couleurs en
premier). Les couleurs restent légitimement prioritaires (rapide, déjà fait), mais l'écran
« Analyze » (upload régulation/procédure + scope) devrait passer devant le reste du redesign
Dashboard (résumé, filtre classification) dans la suite du travail.

---

## 3. Nouvel écran : Knowledge Base & Regulatory Sources (version simple)

Écran demandé par Francis, absent aujourd'hui. Version réalisable **sans rien attendre de
Thư** : uniquement des chiffres déjà disponibles via `/api/documents` (déjà consommé ailleurs) —
nombre de documents par catégorie (réglementations/procédures), date de dernière mise à jour,
liste des autorités/sources présentes dans le corpus.

- [x] Nouvelle route `/knowledge-base`, visible pour `COMPLIANCE_ADMIN` **et** `HEAD_OF_COMPLIANCE`
      (en lecture, le temps le permettait) — fait le 2026-09-11
- [x] Bloc « Bank Compliance Knowledge Base » : compteurs régulations/procédures/exigences, sources
      (autorités uniques du corpus), date de dernière mise à jour (max des `uploaded_at`)
- [x] Bloc « European Regulatory Sources » : statut honnête « Non connecté », avec renvoi vers
      `docs/phases/phase-7-european-search.md`

## 4. Dates de création/mise à jour + tri — partiellement bloqué

Francis veut voir depuis quand une exigence/procédure existe et pouvoir trier par date.

**Précision du 2026-09-11, après relecture du transcript brut** : ce n'est pas une seule date qu'il
demande, ce sont **3 dates distinctes, et l'écart entre elles EST l'information qu'il veut voir** —
citation exacte : *« the uploaded date, it is important, but as well the create date of the
document, I think the create date is more important. The document has been created in a time,
perhaps one year before, and we upload the document six months later, so it is showing some delay
[...] I need to see [...] where I'm winning the time. »* Et plus loin : *« you can have the created
date and the last update date, because I can have different update. »* **`uploaded_at` n'est donc
PAS un substitut acceptable de `created_at`** (contrairement à ce que la ligne ci-dessous supposait
avant cette relecture) — les deux doivent coexister pour que le délai création → enregistrement
soit visible, qui est précisément la donnée que Francis veut suivre (il a donné l'exemple concret
du projet EBP Japon : ~6 mois de délai administratif à suivre poste par poste).

**Ce qu'on peut faire sans le backend** : `Document.created_at` existe déjà côté backend
(`backend/app/models/document.py`) et `ProcedureVersion.version_timestamp` aussi
(`backend/app/models/procedure.py`) — on peut donc afficher, dès maintenant, la date de création du
document source et la date de la dernière version de procédure. **Attention au nommage** :
`Document.created_at` (backend) correspond en fait à *quand la ligne a été enregistrée dans notre
DB*, exposé côté frontend sous `uploaded_at` — c'est un candidat pour le champ « Uploaded on » de
Francis, PAS pour son « Created date » (qui devrait être la date de publication/rédaction du
document source lui-même, une donnée qu'on n'a nulle part aujourd'hui, ni backend ni frontend).

**⛔ Bloqué côté backend** : `RegulatoryRequirement` et `Procedure` eux-mêmes n'ont **aucune
colonne de date** (`backend/app/models/requirement.py`, `backend/app/models/procedure.py` — vérifié
le 2026-09-10). Impossible d'afficher « cette exigence existe depuis... » sans que Thư ajoute une
colonne. **Ne pas contourner en devinant une date côté frontend** (ce serait inventer une donnée,
contraire à `docs/ui-guardrails.md`) — ceci s'applique aussi à une éventuelle « created date » du
document source : si elle n'existe pas dans le corpus, ne pas l'inventer, la marquer honnêtement
absente plutôt que de réutiliser `uploaded_at` sous un autre nom.

- [x] Afficher la date document (`uploaded_at`) sur la vue détail régulation — fait le 2026-09-11
      (déjà affichée sur les cartes de la liste depuis plus tôt, manquait sur l'en-tête du détail)
- [x] Tri par date sur les tables qui l'exposent — fait le 2026-09-11, sur l'écran « Analyse
      réglementaire » (Plus récent / Plus ancien / Titre), à l'échelle document
- [x] **FAIT le 2026-09-11** : les 3 emplacements (Created / Uploaded / Last updated) affichés côte
      à côte sur les cartes régulation (`regulations-view.tsx`) et l'en-tête de détail
      (`regulation-detail-view.tsx`) :
      - **Uploaded** : `uploaded_at`, réel, déjà affiché.
      - **Created** : `regulation.publication_date` s'il répond (déjà réel en mode mock — voir la
        nuance ci-dessus), sinon `AwaitingBackendBadge field="DocumentMeta.publication_date"` (cas
        du backend réel aujourd'hui).
      - **Last updated** : `AwaitingBackendBadge field="DocumentMeta.updated_at"` — aucun champ de
        ce type n'existe encore, ni backend ni mock.
      - Dès qu'un champ répond réellement (mock ou backend), le badge disparaît de lui-même (branche
        conditionnelle sur la valeur) — jamais de date improvisée en attendant.
      - Cartes/dates au niveau **exigence/procédure** (pas seulement document) : toujours hors
        périmètre, colonnes absentes du modèle backend (`⛔` ci-dessus, inchangé).

**Nuance découverte le 2026-09-11, en vérifiant pourquoi le dashboard réel n'affiche toujours
pas de date de création** : `publication_date` et `effective_date` existent déjà dans
`documentMetaSchema`/`documentDetailSchema` (contrat frontend) ET dans le corpus **mock** MSW
(`frontend/src/lib/mocks/data/documents.ts`) — `effective_date` est même déjà affiché sur
`regulations-view.tsx`/`regulation-detail-view.tsx`. **Mais le backend réel (`Document` model,
`backend/app/models/document.py`) n'a que `created_at`, ni `publication_date` ni `effective_date`**
— donc en mode backend réel (ce que montre la capture d'écran de Giang, IDs `EXT-...`), ces champs
sont toujours `undefined` → « N/A » à l'écran, cohérent avec le blocage déjà noté. En mode mock
(démo côté Abiaka avant branchement du vrai backend), la date de publication est déjà affichable
dès aujourd'hui — à garder en tête si la démo à Francis tourne encore en mock au moment voulu.

---

## 5. Ouvrir un document dans un onglet séparé + impression

- [x] Bouton « Ouvrir dans un nouvel onglet » sur `ProcedureEvidenceDialog` (route dédiée
      `/procedures/[id]`, en lecture seule, réutilise `ProcedureBody`) — fait le 2026-09-11.
      **Bug réel trouvé et corrigé en testant** : un `<a target="_blank">` classique (même sans
      `rel="noopener"`) ne transmet pas la `sessionStorage` de l'onglet d'origine dans les
      navigateurs actuels — le nouvel onglet retombait sur l'écran de connexion. Corrigé par
      `lib/open-in-new-tab.ts` (`window.open("", "_blank")` puis copie manuelle de
      `sessionStorage` avant de naviguer).
- [x] Bouton Imprimer (`window.print()` + `print:hidden`/`print:*` Tailwind comme feuille de style
      d'impression minimale) — fait le 2026-09-11, visible sur `/procedures/[id]` pour tous les
      profils sauf `AUDITOR` (`canPrint`, `lib/access-profile.ts`), sidebar et barre du haut
      masquées à l'impression sur tout l'écran (pas seulement cette page)

## 6. « Pourquoi c'est obligatoire », pas seulement « c'est obligatoire »

Le champ `explanation` existe déjà et s'affiche déjà (`FindingDetailDialog`). Ce que Francis demande
en plus (motiver par l'impact business — pénalité, flux de cash...) dépend du contenu que Thư/le
pipeline IA génèrent, pas d'un changement d'écran. **Rien à faire côté frontend ici** au-delà de
s'assurer que le champ a assez de place pour un texte plus long (déjà le cas, `FindingDetailDialog`
n'est pas contraint en hauteur).

## 7. Extended European Regulatory Search — décision de cadrage nécessaire, PAS à coder tel quel

Le plus gros morceau des deux emails. Francis lui-même écrit *« we don't need to build an
enterprise-grade European regulatory platform... enough to make the capability real and
demonstrable »* — donc il ouvre la porte à une version très allégée.

**Recommandation pour la Semaine 2** : construire uniquement la **coquille visuelle**, avec des
données clairement étiquetées comme telles, sans connexion réelle à CELLAR/EUR-Lex :

- [ ] Sélecteur « Regulatory Scope » (Bank Compliance Knowledge Base / Bank + European Regulatory
      Sources) sur l'écran de lancement d'analyse
- [ ] Badges `[BANK KB]` / `[EU LIVE]` dans la table Analyse d'impact — sur données de démo fixes
      pour l'instant (pas d'appel réseau vers l'UE)
- [ ] Nouveau statut d'affichage `EU CANDIDATE FINDING` (distinct des 5 statuts d'assessment
      existants — **ne pas le confondre avec eux dans `docs/glossary.md`**, c'est une couche
      au-dessus, pas un 6ᵉ statut du même mapping) + champ `Applicability` avant `Coverage`
- [ ] Écran « Knowledge Base » (§3) affiche honnêtement « Non connecté » pour la source européenne

**⛔ Ce qui reste une vraie décision d'équipe, pas un choix frontend** :
- Est-ce qu'on simule (données pré-écrites, présentées clairement comme un scénario de démo) ou
  est-ce que Thư construit une vraie intégration CELLAR (SPARQL/REST) ? Les deux sont défendables
  pour un POC, mais ça change complètement l'effort de la Semaine 2 côté backend — **à trancher
  avec Thư avant d'aller plus loin que la coquille visuelle ci-dessus**.
- Si simulation : qui écrit le scénario CASE-09 (ICT Third-Party Risk / DORA) proposé par Francis ?

## 8. Sécurité/RBAC réelle et droit d'impression réel

Pas dans le périmètre frontend de cette phase — documenté comme limitation connue (§1), cohérent
avec les limitations déjà écrites en Phase 5 (known-limitations #9/#10). À ne construire que si
Francis en fait une condition explicite de la démo, pas en anticipation.

## 9. Les « 6 user journeys » de Francis

Mentionnés à l'oral, censés venir d'un lien ChatGPT partagé — **contenu non récupérable** (page de
partage non accessible en lecture automatique). **Action non-code** : redemander directement à
Francis la liste des 6 parcours (message vocal ou texte), plutôt que d'en inventer une version.

---

## 10. Fil d'Ariane (breadcrumb) — remonté par Giang, pas par Francis

**Constat de Giang (2026-09-11)** : en ouvrant un document en plein écran (ex. depuis
`ProcedureEvidenceDialog` → « Open in new tab » → `/procedures/[id]`, ou un `expand` similaire
ailleurs dans l'app), il n'y a **aucun chemin de retour visible** vers l'écran d'où on venait —
seul le bouton retour du navigateur fonctionne, ce qui n'est pas fiable dès qu'un lien s'est ouvert
dans un nouvel onglet (le cas `/procedures/[id]` justement — pas d'historique de navigation du tout
dans ce nouvel onglet).

**Vérifié dans le code (2026-09-11)** : aucun composant breadcrumb n'existe dans l'app —
`frontend/src/components/ui/` n'a pas de `breadcrumb.tsx` (shadcn en fournit un,
`npx shadcn add breadcrumb`, jamais installé) et aucun fichier du repo ne contient le mot
« breadcrumb ». Ce n'est donc pas un oubli d'affichage, la fonctionnalité n'existe simplement pas
encore.

**Écrans concernés en priorité** :
- `/procedures/[id]` (nouvel onglet, Phase 6 §5) — pas de breadcrumb possible ici au sens strict
  (nouvel onglet = pas d'historique), mais peut au moins afficher d'où vient le lien (ex. « Depuis
  le constat REQ-042 sur DORA ») avec un lien cliquable, pas juste le document nu.
- Navigation dans une régulation : Vue d'ensemble → onglet Exigences → détail d'un constat
  (`FindingDetailDialog`) → panneau de preuve — actuellement une pile de dialogues/onglets, pas un
  chemin de navigation.
- Écran Knowledge Base → détail document, une fois construit (Phase 6 §3).

**Action — FAIT le 2026-09-11** :
- [x] Composant `Breadcrumb` shadcn/ui installé (`pnpm dlx shadcn@latest add breadcrumb`), enveloppé
      dans `components/layout/breadcrumb-trail.tsx` (une seule implémentation, pas un fil d'Ariane
      recodé par écran).
- [x] Ajouté en haut de la vue détail régulation (`regulation-detail-view.tsx`) : `Analyse
      réglementaire / <titre de la régulation>`. Écran Knowledge Base laissé sans breadcrumb pour
      l'instant (accessible directement depuis la sidebar, pas de profondeur de navigation à
      remonter).
- [x] Cas `/procedures/[id]` (nouvel onglet) : lien contextuel « Retour au constat REQ-XXX »
      construit à partir de `regulationId`/`requirementId`, deux nouveaux paramètres d'URL portés
      par le bouton « Ouvrir dans un nouvel onglet » (threading via `FindingDetailDialog` →
      `EvidenceCard` → `ProcedureEvidenceDialog`, props optionnelles pour ne rien casser côté
      `regulatory_evidence`, non cliquable, qui n'a pas ce contexte). N'apparaît que si le lien vient
      bien d'un constat (sinon, page procédure sans breadcrumb, comme avant).

---

## Ordre d'exécution recommandé — réécrit le 2026-09-11 suite à la réponse de Francis sur les 5 écrans

**Ce qui change par rapport à la version précédente de cet ordre** : Francis a lui-même donné sa
priorité (§2.2) — 3 écrans sur 5 sont essentiels pour la toute première démo (**Analyze, Impact
Analysis, Evidence & Validation**), Dashboard et Copilot sont du polish. Le redesign dashboard
(résumé/filtre, §2) descend donc sous l'écran « Analyze », qui n'existait pas du tout avant.

**0. Déjà fait, ne pas refaire** :
- [x] Couleurs (§0) — 2026-09-11
- [x] Rôles/profils d'accès 100% frontend (§1) — fondation pour tout le reste
- [x] Écran Knowledge Base version simple (§3)
- [x] `uploaded_at` affiché + tri, onglet séparé + impression (§4/§5, partie non bloquée)

**1. Fil d'Ariane / breadcrumb (§10)** — à faire maintenant, avant de construire l'écran Analyze
ci-dessous : plus cher à ajouter après coup une fois un nouvel écran de plus livré sans lui.

**2. Écran « Analyze » (Regulatory / Procedure Analysis) — NOUVELLE PRIORITÉ N°1, remplace/fusionne
plusieurs items précédemment traités séparément** (voir détail complet en §2.2) :
   - Liste + upload des procédures (demande de Giang, initialement notée comme un item à part —
     voir échange du 2026-09-11) : nouvel écran `/procedures`, `UploadProcedureDialog` (copier
     `UploadRegulationDialog`), item de nav, lien « expand procédure » d'une régulation qui pointe
     ici plutôt que sur la seule modale.
   - Sélecteur de scope Bank KB / Bank + European Regulatory Sources (= D1 de
     `docs/phases/phase-7-european-search.md`, **ne pas le refaire séparément dans la Phase 7**).
   - Bouton d'analyse appelant `POST /api/procedures/:id/analyze` (contrat v1.7).
   - **C'est aussi exactement le « Jour 0 » de la Phase 7** — construire ceci une seule fois sert
     les deux besoins (le screen que Francis demande + le prérequis technique déjà identifié).

**3. Impact Analysis** — déjà l'onglet « Actions » (`FindingsActionsTable`), déjà l'écran le plus
soigné de l'app. **Fait le 2026-09-11** :
   - [x] Nœud Exigence de la carte des impacts affiche `normalized_requirement` au lieu du seul ID
     (§2.1 — `sublabel`, `source_reference` passé en tooltip natif faute de place pour une 3e
     ligne).
   - [x] Nœud Procédure : version compacte d'`AwaitingBackendBadge` (icône clé à molette + tooltip
     natif citant `RegulationMapProcedure.procedure_title`, le badge complet aurait débordé la
     largeur du nœud) — seulement quand une procédure existe réellement (`NO_RELEVANT_PROCEDURE`
     n'a pas de titre à attendre).

**4. Evidence & Explainability** — déjà `FindingDetailDialog`/`EvidenceCard` (côte à côte,
explication, validation humaine), déjà proche de la description de Francis. Reste : `applicability`
(Phase 7, D7 — dépend du travail Europe, pas prioritaire tant que l'écran Analyze n'existe pas).

**5. Dashboard et Copilot — polish, pas le chemin critique de la 1ère démo (mots de Francis)** :
   - [x] Dashboard : résumé court avec `AwaitingBackendBadge` (§2) — fait le 2026-09-11, sur
     chaque ligne de « Détail par régulation » (`portfolio-dashboard-view.tsx`), même libellé que
     `regulations-view.tsx` (qui l'avait déjà). Filtre classification : déjà présent uniquement sur
     l'écran « Analyse réglementaire » (pas de barre de filtre équivalente sur le Dashboard,
     structurellement différent — table d'agrégats, pas une liste filtrable).
   - [ ] Dates création/mise à jour (§4, « 3 dates distinctes ») — clarification Thư d'abord
   - [ ] Copilot : filtre Bank/EU sur les questions (D9bis, Phase 7) — pas avant que le Copilot
     sorte lui-même du statut placeholder (`docs/known-limitations.md` #11)

**6. Phase 7 (European Search)** : suite normale une fois l'écran Analyze construit (le sélecteur
de scope y est posé) — D2 à D10, voir `docs/phases/phase-7-european-search.md`.

## Definition of Done (phase) — réécrit le 2026-09-11, la clôture précédente était prématurée

**Correction du 2026-09-11** : ce document avait été marqué « clos » avant la réponse de Francis
sur les 5 écrans et avant les 3 trouvailles ultérieures (mindmap §2.1, structure §2.2, breadcrumb
§10) — la clôture ne tenait plus. Repris comme un document actif.

- [x] Palette catégorielle régénérée, sans chevauchement avec la palette de statut, documentée
- [x] Système de profils d'accès frontend en place, 5 comptes démo couvrant les 4 profils
- [x] Dashboard exécutif = atterrissage `HEAD_OF_COMPLIANCE`, CTA nouvelle analyse, filtre autorité
- [x] Écran Knowledge Base (simple) livré, section UE honnêtement étiquetée non connectée
- [x] `uploaded_at` affiché + tri ; ouverture en onglet séparé + impression
- [x] Fil d'Ariane (breadcrumb) posé sur les écrans de détail (§10)
- [x] **Écran « Analyze » construit** (§2.2) : upload régulation existant + nouvel upload/liste
      procédure (`/procedures`) + sélecteur de scope Bank/Bank+EU (posé sur `/procedures/[id]`,
      avec bouton d'analyse et résultats) — fait le 2026-09-11, sert aussi de Jour 0 pour la
      Phase 7 (voir `docs/phases/phase-7-european-search.md`)
- [x] Carte des impacts : nœud Exigence affiche `normalized_requirement`, nœud Procédure porte le
      badge « en attente backend » pour son titre (§2.1) — fait le 2026-09-11
- [x] Résumé document : emplacement construit avec `AwaitingBackendBadge`, pas de contenu inventé
      (§2) — sur `regulations-view.tsx` (déjà fait plus tôt) et `portfolio-dashboard-view.tsx`
      (fait le 2026-09-11). Filtre classification : déjà en place sur `regulations-view.tsx`
      uniquement — le Dashboard n'a pas de barre de filtre équivalente (table d'agrégats).
- [ ] 3 dates (Created/Uploaded/Updated) affichées, badge pour ce qui manque encore (§4)
- [ ] `docs/known-limitations.md` #11 (Copilot) reflète la position de Francis (déjà fait le
      2026-09-11)
- [ ] `PROGRESS.md` à jour à la clôture réelle de la phase

**§7/Extended European Search continue sous `docs/phases/phase-7-european-search.md`** (Jour 0
fusionné avec l'écran Analyze ci-dessus, ne pas le construire deux fois).
