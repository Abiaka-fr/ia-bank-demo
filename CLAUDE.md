# IA Bank — Regulatory AI Copilot POC

Ce dépôt contient le POC "Regulatory AI Copilot" pour IA Bank (client fictif, contexte démo/Presales
ABIAKA). Toute session Claude Code ouverte à la racine de ce dépôt DOIT lire ce fichier en premier,
puis suivre les règles ci-dessous avant d'écrire la moindre ligne de code.

## 0. À lire en premier, dans cet ordre

1. **`PROGRESS.md`** (racine) — état actuel du projet, phase en cours, décisions prises, notes de la
   dernière session. Ne jamais commencer à coder sans l'avoir lu.
2. **`docs/phases/phase-N-*.md`** — le fichier de la phase en cours (indiquée dans `PROGRESS.md`).
   Chaque phase correspond à ~1 semaine du planning. Objectif, portée, definition of done.
3. **`docs/api-contract.md`** — le contrat d'API entre le frontend et le backend (source de vérité
   partagée avec Thư / le backend). Le frontend ne doit JAMAIS supposer un comportement backend qui
   n'est pas documenté ici.
4. **`docs/ui-guardrails.md`** et **`docs/glossary.md`** — vocabulaire métier et formulations
   autorisées/interdites (critique : ce produit ne doit jamais affirmer une conclusion de conformité
   autonome, voir section "Garde-fous" ci-dessous).

## 1. Contexte produit (résumé)

Le produit n'est PAS un chatbot générique. C'est un outil d'aide à la décision pour un Responsable
Conformité bancaire :

```
RÉGLEMENTATION → EXIGENCES → PROCÉDURES INTERNES → IMPACT → ÉCARTS POTENTIELS
→ PREUVES → ACTIONS → VALIDATION HUMAINE
```

- Utilisateur final : Responsable Conformité Réglementaire (Head of Compliance), langue de démo :
  français en priorité.
- Le système propose des constats ; un humain valide toujours la conclusion finale. Voir
  `docs/ui-guardrails.md` pour les formulations exactes autorisées.
- Détail fonctionnel complet : voir les documents source `.docx` dans le dossier parent
  (`../Abiaka_Regulatory_AI_POC_Full_Project_Guide_EN.docx`) et le corpus de démo
  (`../IABank_Internal_Procedures_KYC_AML_FR_v1.docx`,
  `../IABank_Regulation1_ACPR_Instruction_Connaissance_Client_FR_v1.docx`,
  `../IABank_Regulation2_EBA_Guidelines_EDD_WireTransfer_EN_v1.docx`).

## 2. Répartition du travail (important — ne pas casser cette frontière)

| Zone | Propriétaire | Stack |
|---|---|---|
| `frontend/` | **Giang (Dev A, temps plein)** | Next.js + TypeScript — voir `frontend/CLAUDE.md` |
| `backend/` (API + pipeline IA) | **Thư (Dev B, temps partiel)** | Choix libre de Thư |
| `docs/api-contract.md` | **Partagé** | Contrat figé d'un commun accord avant modification |

### 🚫 `backend/` est en lecture seule pour toute session frontend — règle absolue

`backend/` est la zone de Thư. Une session ouverte côté frontend :

- **peut lire** tout ce qui s'y trouve (`backend/API.md`, `backend/README.md`, `backend/CLAUDE.md`,
  `backend/app/**`) — et **doit** le faire avant de parler d'intégration ;
- **ne doit modifier, créer, renommer, déplacer ni supprimer AUCUN fichier sous `backend/`**, y
  compris `backend/.gitignore`, les migrations, les modèles et la base SQLite de référence. Aucune
  exception, même « juste une petite correction évidente » : Thư travaille dessus en parallèle et
  une modification silencieuse casserait son environnement.
- Si quelque chose semble faux côté backend, on l'**écrit** dans `PROGRESS.md` (section Blocages)
  pour la prochaine revue commune — on ne le corrige pas soi-même.

Le seul point de contact autorisé est `docs/api-contract.md`, partagé, et modifiable uniquement
d'un commun accord. Symétriquement pour une session backend vis-à-vis de `frontend/`.

Toute évolution du contrat d'API doit être répercutée dans `docs/api-contract.md` ET signalée dans
`PROGRESS.md`.

**Fichiers d'environnement** : `backend/env` contient des identifiants. Il est ignoré par le
`.gitignore` racine (le `.gitignore` de `backend/` ne l'attrape pas : il vise `.env` et `env/`,
pas un fichier nommé `env`). Ne jamais le committer, ne jamais en recopier le contenu ailleurs.

## 3. Règles de travail obligatoires (toutes sessions, tout le temps)

### Avant d'écrire du nouveau code
1. **Chercher avant de créer.** Utiliser grep/recherche de fichiers pour vérifier qu'une fonction,
   un composant, un type ou une route similaire n'existe pas déjà avant d'en écrire un nouveau.
   Réutiliser/étendre plutôt que dupliquer. En cas de doute, lister les fichiers du dossier concerné
   avant d'ajouter un fichier de plus.
2. Vérifier `docs/api-contract.md` avant d'appeler ou de créer un endpoint — ne jamais inventer une
   forme de réponse qui n'y est pas documentée.
3. Vérifier `docs/ui-guardrails.md` avant d'écrire un texte affiché à l'utilisateur (labels,
   messages, tooltips) — respecter strictement les formulations autorisées.

### Après avoir écrit du code
4. Lancer le lint + typecheck (+ tests s'ils existent) avant de considérer une tâche terminée.
   Ne jamais laisser un état "ça compile pas encore" en fin de session.
5. Supprimer le code mort / les imports inutilisés / les fichiers dupliqués laissés en cours de
   route — ne pas laisser deux versions d'un même composant.
6. Mettre à jour `PROGRESS.md` (section "Notes de fin de session") avant de terminer une session :
   ce qui a été fait, ce qui reste, tout blocage rencontré. La session suivante peut être ouverte par
   quelqu'un d'autre / sans mémoire de cette conversation — ce fichier est la seule continuité.

### Qualité générale
- Code simple, lisible, commentaires uniquement là où le "pourquoi" n'est pas évident.
- Composants petits, colocalisés avec ce qu'ils servent plutôt qu'un unique gros fichier.
- Aucune donnée client réelle : uniquement le corpus de démo fictif fourni.
- Le produit ne doit jamais formuler de conclusion de conformité autonome (voir
  `docs/ui-guardrails.md`) — c'est une règle produit non négociable, pas seulement un détail UI.

## 4. Structure du dépôt

```
ia-bank-demo/
├── CLAUDE.md                 # ce fichier
├── README.md                 # vue d'ensemble humaine
├── PROGRESS.md                # état du projet, à lire/mettre à jour à chaque session
├── docs/
│   ├── api-contract.md        # contrat FE <-> BE (source de vérité)
│   ├── backend-integration.md # écart entre le contrat et le backend réel de Thư
│   ├── glossary.md            # vocabulaire métier KYC/AML condensé
│   ├── ui-guardrails.md       # formulations autorisées/interdites + code couleur des statuts
│   ├── ui-guidelines.md       # design system frontend
│   └── phases/                # 1 fichier par phase (~1 semaine)
├── frontend/                  # Next.js — propriété de Giang, voir frontend/CLAUDE.md
└── backend/                   # propriété de Thư, stack libre — voir backend/README.md
```

## 5. Commandes utiles

- `/pre-code-check` (voir `.claude/commands/pre-code-check.md`) — check-list à lancer avant de
  commencer une modification non triviale : recherche de doublons, relecture du contrat d'API et des
  guardrails UI concernés.
