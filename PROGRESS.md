# Suivi du Projet — IA Bank Regulatory AI Copilot

> Toute session doit lire ce fichier en premier et le mettre à jour avant de terminer.

## Phase actuelle

**Phase 0 — Initialisation** (terminée le 2026-09-04)
Prochaine phase : **Phase 1 — Fondations** (voir `docs/phases/phase-1-foundation.md`), non démarrée.

## Résumé d'avancement

- [x] Corpus de démo généré : 12 procédures internes (FR) + 2 réglementations (ACPR-FR, EBA-EN)
- [x] Scaffolding projet créé (CLAUDE.md, phases, contrat d'API, guidelines)
- [ ] Frontend Next.js bootstrappé
- [ ] Contrat d'API v1 validé avec Thư (backend)
- [ ] Backend / pipeline IA (Thư — stack à définir par elle)
- [ ] Slice verticale de bout en bout (1 régulation → 3 exigences → 3 procédures → 1 écart →
      preuve → validation) fonctionnelle avec données mockées
- [ ] Déploiement Vercel (frontend) configuré

## Journal des décisions

- **2026-09-04** — Architecture confirmée : hybride, Frontend (Giang) = Next.js 15 (App Router) +
  TypeScript + Tailwind + shadcn/ui ; Backend + pipeline IA (Thư) = stack libre, à documenter par
  elle dans `backend/README.md` une fois choisie. Déploiement : Vercel (frontend) +
  Railway/Render (backend). Frontière stricte : `frontend/` et `backend/` ne se parlent que via
  `docs/api-contract.md`.
- **2026-09-04** — Corpus de démo : procédures internes en français, 2 réglementations construites
  (ACPR-FR, EBA-EN) avec 9 scénarios d'écart volontairement conçus (voir table de mapping dans la
  conversation Cowork du 2026-09-04, à reporter dans `docs/glossary.md`/`docs/api-contract.md` si
  utile aux golden test cases).

- **2026-09-04** — Bilingue FR/EN élevé de "P2 optionnel" (statut dans la brief originale) à
  **exigence obligatoire dès la Phase 1** : next-intl configuré dès le bootstrap, toggle FR/EN dans
  la top bar, `messages/fr.json`/`messages/en.json` toujours synchronisés. Décision de Giang.
- **2026-09-04** — Outillage UI ajouté : serveur MCP shadcn/ui (accès direct au registre de
  composants réel) + boucle obligatoire "coder → capturer une capture d'écran → comparer à
  `docs/ui-guidelines.md` → corriger" avant de considérer une tâche UI terminée. Palette de couleurs
  validée (statuts + graphiques) figée dans `docs/ui-guidelines.md`.

## Blocages / Questions ouvertes

- Stack backend de Thư pas encore choisie → le frontend doit démarrer avec des données mockées
  respectant `docs/api-contract.md` en attendant.

## Notes de fin de session

> Ajouter une entrée ici à la fin de chaque session : date, ce qui a été fait, ce qui reste, tout
> point de blocage. Ne pas écraser les entrées précédentes.

- **2026-09-04 (Cowork — initialisation)** : création du scaffolding complet du dépôt (CLAUDE.md,
  README, PROGRESS, docs/api-contract.md, docs/glossary.md, docs/ui-guardrails.md,
  docs/ui-guidelines.md, docs/phases/phase-1 à phase-6, frontend/CLAUDE.md, backend/README.md,
  commande `/pre-code-check`). Rien codé encore. Prochaine étape : ouvrir une session Claude Code
  dans `frontend/` et suivre `docs/phases/phase-1-foundation.md`.
