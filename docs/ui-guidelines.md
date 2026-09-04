# Design System Frontend

Objectif : UI propre, cohérente, crédible pour une démo bancaire — pas de composants "faits main"
approximatifs. On s'appuie sur des primitives éprouvées plutôt que de tout réinventer.

## Stack UI (voir aussi `frontend/CLAUDE.md`)

- **Tailwind CSS** pour le styling
- **shadcn/ui** (Radix UI + Tailwind) pour tous les composants de base — Table, Card, Badge, Dialog,
  Tabs, Select, Sheet, etc. **Ne pas recoder un composant que shadcn fournit déjà.**
- **lucide-react** pour les icônes (déjà inclus avec shadcn/ui)
- **Recharts** pour les graphiques du Dashboard (via les composants `chart` de shadcn/ui)
- Police : Inter (ou police système par défaut de shadcn) — pas de choix de police exotique

## Principes

1. **French-first.** Tous les textes UI par défaut en français. Structurer les strings pour un
   switch FR/EN futur (next-intl ou simple dictionnaire) sans bloquer dessus en P0.
2. **Densité d'information > décoration.** C'est un outil de travail pour un Responsable Conformité,
   pas une landing page marketing. Tables denses, badges clairs, peu d'animation.
3. **Statuts = couleur constante partout.** Toujours utiliser le même mapping couleur pour les 5
   valeurs d'`assessment` (voir `docs/glossary.md`) — Dashboard, table Impact Analysis, Evidence
   view doivent utiliser EXACTEMENT les mêmes couleurs pour le même statut.
4. **Traçabilité visible.** Toute preuve affichée doit montrer sa source (document + référence) —
   ne jamais afficher un extrait de texte sans dire d'où il vient.
5. **Accessibilité de base.** Contraste suffisant sur les badges de statut, navigation clavier
   possible sur les actions de validation (Accept/Reject/Escalate).

## Layout général

- Sidebar de navigation gauche (5 écrans : Dashboard, Analyse Réglementaire, Impact Analysis,
  Evidence, Copilot) + top bar avec le nom de la régulation sélectionnée.
- Écran "hero" = Impact Analysis (table dense, filtrable, tri par priorité) — c'est l'écran que le
  client regarde le plus longtemps en démo, soigner en priorité.

## Graphiques / KPI (Dashboard)

- KPI cards : chiffre + label court, pas de décoration inutile.
- Pour tout graphique (répartition par domaine, par statut) : une seule palette catégorielle
  cohérente dans toute l'app, jamais un dégradé arc-en-ciel improvisé par écran. Si une session a
  accès à un skill/guide de data-visualisation, s'y référer pour la palette et les specs de graphes;
  sinon rester sobre (2-6 couleurs distinctes maximum, légendes claires, pas de 3D/effets).

## Ce qu'on évite

- Composants UI faits maison quand shadcn/ui en fournit un équivalent
- Couleurs codées en dur dispersées dans le code (utiliser les tokens Tailwind / variables CSS)
- Textes UI en anglais mélangés au français dans un même écran
- Tableaux/formulaires sans état de chargement ni état vide géré
