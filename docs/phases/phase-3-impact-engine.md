# Phase 3 — Impact Analysis (écran hero) (≈ Semaine 3)

Source : Full Project Guide, section 17, semaine 3 ; écran détaillé section 9.3.

## Objectif

L'écran le plus regardé pendant la démo client (7 minutes, voir section 19 de la brief). Doit être
rapide, lisible, crédible.

> **État au 2026-09-07 — portée frontend déjà construite, avant même d'ouvrir formellement cette
> phase.** Les revues de la Phase 1 ont fait construire cet écran en avance (décision de Giang :
> **onglet** « Analyse d'impact » de la page de détail d'une régulation, pas un écran séparé — on
> ne consulte des constats qu'après avoir choisi la régulation concernée). La session du
> 2026-09-07 l'a branché sur les vrais constats du backend (`GET /api/mappings/*`) et a ajouté
> couleurs, navigation cliquable généralisée et force de la preuve colorée. Un seul point du DoD
> original n'est toujours pas fait : la persistance des filtres/tri dans l'URL.

> ⚠️ Rappel : toute nouvelle chaîne UI ajoutée dans cette phase va dans `messages/fr.json` ET `messages/en.json` (voir `frontend/CLAUDE.md` section Bilingue). Aucune exception.
## Portée (frontend uniquement)

1. **Table Impact Analysis** (colonnes : Requirement, Matched Procedure, Assessment, Confidence,
   Priority, Action) :
   - Tri par priorité, filtre par statut/domaine
   - Badge coloré par `assessment` (voir code couleur figé dans `docs/glossary.md`)
   - Clic sur une ligne → navigue vers l'écran Evidence (Phase 4) pour ce finding
2. Intégration `GET /api/findings?regulation_id=...` (réel ou mock selon avancement backend).
3. Persistance de l'état de filtre/tri dans l'URL (pour pouvoir partager un lien pendant la démo).

## Definition of Done

- [x] Table affiche tous les findings d'une régulation, triable/filtrable
      *(`FindingsActionsTable` — colonnes Exigence/Procédure impactée/Action recommandée/Action
      retenue/Décision ; filtres Statut d'évaluation, Priorité, Validation ; tri par priorité via
      `sortByPriority`. Alimentée par les vrais constats du backend depuis le 2026-09-07 quand
      `NEXT_PUBLIC_BACKEND_URL` est renseigné, sinon par le corpus mock — même composant, même
      contrat `Finding` dans les deux cas)*
- [x] Couleurs de statut identiques à celles du Dashboard (cohérence visuelle vérifiée)
      *(`AssessmentBadge`, source unique `lib/assessment.ts` ; le Dashboard et cet onglet
      partagent exactement la même palette et les mêmes noms de statut)*
- [x] Navigation ligne → détail Evidence fonctionne
      *(la ligne se déplie sur place plutôt que de naviguer vers un écran séparé — décision de
      Giang en Phase 1, voir `docs/ui-guardrails.md` : un constat n'est jamais affiché sans sa
      preuve, donc la déplier au même endroit évite un aller-retour. Depuis le 2026-09-07,
      cliquer n'importe où sur les 3 premières colonnes de la ligne déplie/replie — plus
      seulement le petit bouton chevron)*
- [ ] **Persistance de l'état de filtre/tri dans l'URL — jamais fait.** Les filtres
      Statut/Priorité/Validation vivent en `useState` local dans `FindingsActionsTable` : un lien
      partagé pendant la démo, ou un rechargement de page, les perd. Seuls l'onglet actif et
      l'exigence/le constat mis en avant (`?tab=…&focus=…`) sont dans l'URL aujourd'hui — pas les
      3 filtres. À faire : étendre `use-regulation-tab.ts` (ou un hook dédié) pour y ajouter
      `assessment`/`priority`/`validation`.
- [x] `PROGRESS.md` mis à jour

## Ce qui a été ajouté au-delà du DoD original (2026-09-07)

- **Force de la preuve colorée** rouge/jaune/vert selon le niveau (40 %/75 %), au lieu des niveaux
  de gris prévus par `docs/ui-guidelines.md` d'origine — exception documentée, demande explicite.
- **Constats réels du backend** : `assessment`, `human_status`, `priority` (depuis `risk_level` de
  l'exigence), preuve réglementaire exacte, preuve interne en extrait non ciblé mais honnêtement
  étiqueté (voir `docs/backend-integration.md` § 4 pour la limite assumée).
- **Onglet Historique** (voir `docs/phases/phase-4-evidence-workflow.md`) : chaque décision prise
  depuis cet onglet est journalisée avec auteur et horodatage.
