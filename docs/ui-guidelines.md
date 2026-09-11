# Design System Frontend

Objectif : UI propre, cohérente, crédible pour une démo bancaire — pas de composants "faits main"
approximatifs. On s'appuie sur des primitives éprouvées plutôt que de tout réinventer.

## Stack UI (voir aussi `frontend/CLAUDE.md`)

- **Tailwind CSS** pour le styling
- **shadcn/ui** (Radix UI + Tailwind) pour tous les composants de base — Table, Card, Badge, Dialog,
  Tabs, Select, Sheet, etc. **Ne pas recoder un composant que shadcn fournit déjà.** Serveur MCP
  shadcn configuré dans Claude Code pour un accès direct au registre de composants réel.
- **lucide-react** pour les icônes (déjà inclus avec shadcn/ui)
- **Recharts** pour les graphiques du Dashboard (via les composants `chart` de shadcn/ui)
- Police : Inter (ou police système par défaut de shadcn) — pas de choix de police exotique

## Principes

1. **Bilingue FR/EN obligatoire dès la Phase 1** (pas juste "French-first, EN si le temps le
   permet"). Voir `frontend/CLAUDE.md` section Bilingue pour les règles précises. Français = langue
   par défaut à l'ouverture, mais le toggle EN doit exister et être complet.
2. **Densité d'information > décoration.** C'est un outil de travail pour un Responsable Conformité,
   pas une landing page marketing. Tables denses, badges clairs, peu d'animation.
3. **Statuts = couleur constante partout.** Toujours utiliser le même mapping couleur pour les 5
   valeurs d'`assessment` (table ci-dessous) — Dashboard, table Impact Analysis, Evidence view
   doivent utiliser EXACTEMENT les mêmes couleurs pour le même statut.
4. **Traçabilité visible.** Toute preuve affichée doit montrer sa source (document + référence) —
   ne jamais afficher un extrait de texte sans dire d'où il vient.
5. **Accessibilité de base.** Contraste suffisant sur les badges de statut, navigation clavier
   possible sur les actions de validation (Accept/Reject/Escalate). Un statut n'est jamais porté par
   la couleur seule — toujours icône + label à côté du badge coloré.
6. **Vérification visuelle obligatoire** avant de considérer une tâche UI terminée — voir
   `frontend/CLAUDE.md` section "Vérification visuelle".

## Layout général

- Sidebar de navigation gauche (5 écrans : Dashboard, Analyse Réglementaire, Impact Analysis,
  Evidence, Copilot) + top bar avec le nom de la régulation sélectionnée + toggle FR/EN.
- Écran "hero" = Impact Analysis (table dense, filtrable, tri par priorité) — c'est l'écran que le
  client regarde le plus longtemps en démo, soigner en priorité.

## Palette — couleurs validées (issues d'une méthode de data-viz avec vérification
d'accessibilité CVD/contraste automatisée — ne pas improviser d'autres couleurs à côté)

### Statuts d'évaluation (`assessment`) — 5 valeurs fixes, mapping figé

| Statut (code) | Couleur | Hex | Usage |
|---|---|---|---|
| `COVERED` | vert (good) | `#0ca30c` | badge + icône check |
| `PARTIAL` | ambre (warning) | `#fab219` | badge + icône alerte triangle |
| `POTENTIAL_GAP` | rouge (critical) | `#d03b3b` | badge + icône alerte cercle |
| `NO_RELEVANT_PROCEDURE` | gris neutre | `#8a8a86` | badge + icône point d'interrogation |
| `EXPERT_REVIEW` | violet | `#4a3aa7` | badge + icône personne/loupe |

Ces 5 couleurs sont réservées à ce mapping — ne jamais les réutiliser pour autre chose (une série
de graphique, un statut de document, etc.) afin qu'un statut reste immédiatement reconnaissable.

### Palette catégorielle (graphiques du Dashboard — répartition par domaine, etc.)

Ordre fixe, ne jamais permuter ni faire cycler au-delà de 8 séries (au-delà, regrouper en "Autres") :

| Slot | Teinte | Hex (clair) | Hex (sombre) |
|---|---|---|---|
| 1 | bleu | `#2a78d6` | `#6fa8e8` |
| 2 | prune/magenta | `#93126b` | `#d162a5` |
| 3 | aqua | `#1baf7a` | `#4ecfa0` |
| 4 | jaune | `#eda100` | `#f0be4d` |
| 5 | rose | `#e87ba4` | `#f0a2c0` |
| 6 | vert | `#008300` | `#46b246` |
| 7 | violet | `#4a3aa7` | `#8b7ce0` |
| 8 | brun/olive | `#7b4a00` | `#b08a00` |

**Révision du 2026-09-11 (retour Francis) :** slots 2 (orange) et 8 (rouge) remplacés — Francis a
signalé que le rouge/l'orange sur un graphique à plusieurs séries est lu comme « urgent/important »
même quand il s'agit d'un simple domaine métier (« Red or orange means important. When I look at
your screen, straight away I'm looking at potential gap because red »). Les deux nouvelles teintes
ont été cherchées et vérifiées avec `scripts/validate_palette.js` de la compétence `dataviz`
(bande de luminosité, plancher de chroma, séparation CVD protan/deutan/tritan, plancher de vision
normale ΔE≥15 en mode `--pairs all`) plutôt qu'improvisées — voir
`docs/phases/phase-6-francis-feedback.md` §0 pour le détail de la recherche. Les valeurs en mode
sombre suivent le même déplacement de teinte que les 6 autres slots (jamais validées
indépendamment par le script — la palette sombre entière ne passe pas encore la validation
complète, voir `docs/known-limitations.md`, item séparé du sujet rouge/orange).

Note : le slot 7 (violet) est intentionnellement la même teinte que `EXPERT_REVIEW` — si un
graphique catégoriel affiche aussi une répartition par assessment, réutiliser directement les
couleurs de statut ci-dessus plutôt que la palette catégorielle générique, pour rester cohérent.

### Où la couleur a le droit d'apparaître (précisé en Phase 1)

Trois familles, sans recouvrement :

| Famille | Palette | Où |
|---|---|---|
| Statut d'évaluation (`assessment`) | les 5 teintes ci-dessus | badges de statut, barres du graphique « par statut », pastille des nœuds de la carte des impacts |
| Séries de graphique / branches | palette catégorielle (8 slots) | « Exigences par domaine », liaisons de la carte des impacts |
| Tout le reste | **niveaux de gris uniquement** (`foreground` avec opacité) | priorité, décision humaine (`human_status`), barre de progression de revue, statut d'analyse d'un document, ligne mise en avant après navigation |
| Exception : force de la preuve (`confidence_or_evidence_strength`) | rouge/jaune/vert — mêmes variables que `assessment` (`--gap`/`--partial`/`--covered`), seuils à 40 % et 75 % | barre « Force de la preuve » (`evidence-strength.tsx`) |

La troisième ligne est la plus facile à enfreindre : il est tentant de colorer une décision
« Accepté » en vert. C'est interdit — le vert appartient à `COVERED`, et un même vert signifiant
deux choses différentes rend l'écran illisible d'un coup d'œil. La progression de revue se
distingue par des **niveaux de gris décroissants**, pas par des teintes.

**Exception ajoutée le 2026-09-07** (demande explicite) : la force de la preuve est un second
signal de *magnitude* (comme `assessment`, pas une catégorie comme la priorité ou la décision
humaine) — un rouge/jaune/vert y a un sens équivalent (mauvais/moyen/bon), sans se confondre avec
le vert de `COVERED` puisqu'il n'apparaît jamais au même endroit qu'un badge d'`assessment`.
Réutilise les mêmes variables CSS plutôt que d'introduire une quatrième palette.

### Progression de revue vs statut d'analyse

`DocumentMeta.status` (`NOT_ANALYZED` / `ANALYZING` / `ANALYZED`) décrit l'avancement de l'analyse
**automatique**. Il ne dit rien de l'avancement de la revue **humaine**. Les deux au même endroit
prêtaient à confusion : dès qu'une régulation a des constats, la barre de progression de revue
remplace le badge de statut d'analyse ; celui-ci ne subsiste que là où il n'y a encore rien à
traiter.

### Règles de graphique (rappel court)

- Un seul axe Y — jamais de double axe.
- Séquentiel (une magnitude) = une seule teinte, clair → foncé. Jamais d'arc-en-ciel.
- Légende toujours présente à partir de 2 séries ; labels directs sélectifs, pas un chiffre sur
  chaque point.
- Traits fins, marqueurs ≥ 8px, coins arrondis 4px sur les extrémités de données.

## Convention : donnée en attente côté backend (« Awaiting backend »)

**Décision de Giang, 2026-09-11** : plutôt que de laisser une fonctionnalité invisible tant que
Thư n'a pas exposé le champ/endpoint nécessaire, on construit l'écran maintenant avec les données
réellement disponibles, et on **marque visuellement** l'endroit qui attend une donnée backend — un
signal clair pour Thư (et pour Francis en démo, si besoin d'expliquer) plutôt qu'un silence. Ce
n'est **pas** une exception à la règle « ne jamais inventer une donnée » (`docs/ui-guardrails.md`)
— c'est l'inverse : on montre honnêtement qu'il en manque une, au lieu de la cacher ou de la
fabriquer.

**Composant** : badge neutre (gris, jamais une des 5 couleurs de statut ni la palette catégorielle
— cohérent avec la règle « tout le reste = niveaux de gris » ci-dessus), bordure en tirets pour le
distinguer visuellement d'un badge de statut normal, icône `Wrench` (lucide-react), texte court
(`awaitingBackend.badge` : « Backend requis » / « Backend pending »). Au survol/focus, un
`Tooltip` précise quoi exactement (`awaitingBackend.tooltip`, ex. : « En attente : champ `summary`
sur `DocumentMeta`, à confirmer avec Thư — voir `docs/phases/phase-6-francis-feedback.md` §2 »).
Composant à créer : `components/features/awaiting-backend-badge.tsx`, props `{ field: string }`
pour que le tooltip cite le champ exact sans dupliquer le texte à chaque usage.

**Où l'utiliser (état au 2026-09-11)** :
- Résumé court par document (Phase 6 §2) — la carte affiche le badge à la place du texte de résumé
  tant que `DocumentMeta.summary` n'existe pas.
- Filtre par classification (Phase 6 §2) — l'option de filtre reste visible dans le menu mais
  désactivée, avec le badge en regard, plutôt que de disparaître silencieusement.
- Date de création réelle du document source (Phase 6 §4) — à côté de `uploaded_at` (déjà affiché,
  réel), un second slot avec le badge tant qu'on ne sait pas si le corpus a une vraie date de
  publication distincte.
- European Search (Phase 7) — chaque compteur/valeur qui vient d'un mock en attendant Thư
  (`eu_candidate_requirements`, etc.) porte ce badge plutôt que d'afficher un chiffre mocké sans le
  signaler comme tel — cohérent avec les badges `[BANK KB]`/`[EU LIVE]` déjà prévus.

**Ce que ça change dans les items déjà notés « bloqué » / « pas implémenté »** : le statut redevient
actionnable — construire l'emplacement + le badge maintenant, sans attendre Thư ; retirer le badge
au champ par champ dès qu'il répond. Les sections concernées ci-dessous ont été mises à jour en
conséquence.

## Ce qu'on évite

- Composants UI faits maison quand shadcn/ui en fournit un équivalent
- Couleurs codées en dur dispersées dans le code (utiliser les tokens Tailwind / variables CSS
  définies à partir de la palette ci-dessus, une seule source)
- Textes UI en anglais mélangés au français dans un même écran (ou clé de traduction manquante dans
  l'un des deux fichiers `messages/*.json`)
- Tableaux/formulaires sans état de chargement ni état vide géré
- Un statut représenté uniquement par une couleur, sans icône ni label
