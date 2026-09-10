# Phase 5 — Client Readiness (≈ Semaine 5)

Source : Full Project Guide, section 17, semaine 5 ; script de démo section 19 ; Definition of Done
section 20.

## Objectif

Rendre le POC démontrable de façon fiable et répétable devant un client, sans intervention manuelle.

> **État au 2026-09-09 — points 1/3 traités.** Les Phases 2, 3 et 4 ont leur portée frontend
> terminée (voir leurs fichiers respectifs). **Déploiement Vercel fait par Giang.**
>
> **Fait cette session :**
> - **Point 1 (polish bilingue)** : relecture systématique — aucune clé orpheline entre
>   `fr.json`/`en.json` (184/184, vérifié par script + test existant), aucun texte utilisateur codé
>   en dur trouvé dans `components/features`/`components/layout`/`app`, aucune formulation
>   contrevenant à `docs/ui-guardrails.md` (grep ciblé sur les tournures interdites, rien trouvé —
>   la discipline des sessions précédentes tenait déjà).
> - **Point 3 (états vides/erreurs)** : les écrans métier avaient déjà `LoadingState`/`ErrorState`/
>   `EmptyState` (`components/features/query-state.tsx`) posés sur toutes les vues de données
>   (`regulation-detail-view.tsx`, `portfolio-dashboard-view.tsx`, `regulations-view.tsx`, etc.). Le
>   vrai trou, trouvé en testant dans un navigateur (pas en lisant le code) : **aucun fichier de
>   convention Next.js `error.tsx`/`not-found.tsx`/`global-error.tsx` n'existait**. Une URL sans
>   route correspondante (ex. lien mort) tombait sur le `_not-found` générique de Next, qui rend
>   `app/layout.tsx` seul (pas `[locale]/layout.tsx`) → `Runtime Error: Missing <html> and <body>
>   tags in the root layout`, un vrai écran cassé en plein milieu d'une démo. Ajoutés :
>   `[locale]/error.tsx` (boundary React, bilingue via next-intl, bouton Réessayer + retour tableau
>   de bord), `[locale]/not-found.tsx` (idem, pour un `notFound()` explicite ou une route manquante
>   *à l'intérieur* de l'arbre `[locale]`), `app/not-found.tsx` et `app/global-error.tsx` (filets de
>   secours racine, hors `NextIntlClientProvider`, texte bilingue en dur assumé et documenté en
>   commentaire — cas limite qui ne devrait jamais s'afficher en usage normal).
> - **`docs/known-limitations.md` créé** (point 5 du DoD) : neuf limitations reformulées pour un
>   public client à partir de ce qui était déjà noté au fil de l'eau dans
>   `docs/backend-integration.md` et `PROGRESS.md`.
>
> **Vérifié dans un navigateur piloté** (pas seulement lu) : `/fr/does-not-exist` (route inexistante)
> affiche maintenant l'écran de secours bilingue au lieu de l'erreur runtime ; `/fr/regulations/
> DOES-NOT-EXIST` (régulation inexistante, à l'intérieur de l'app) affiche l'`ErrorState`
> « Ressource introuvable » existant avec bouton Réessayer, zéro erreur console au-delà du 404
> réseau attendu ; écran Copilot revérifié en anglais, toujours honnêtement étiqueté « écran prévu
> pour une phase ultérieure ». `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` (93/93), `pnpm build`
> passent tous.
>
> **Reste à faire :** le point 5 (répéter le script de démo de 7 minutes sur l'environnement Vercel
> déployé, pas seulement en local) demande l'URL de déploiement et un passage en direct — non fait
> depuis cette session. Un point mineur hérité de la Phase 3 reste ouvert en parallèle (persistance
> des filtres dans l'URL, `docs/phases/phase-3-impact-engine.md`).

## Portée (frontend uniquement)

1. **Polish bilingue** : relecture complète de tous les textes UI (FR ET EN) contre `docs/ui-guardrails.md`. Vérifier qu'aucune clé de `messages/fr.json` / `messages/en.json` n'est orpheline ou non traduite (le bilingue est en place depuis la Phase 1 — ici on le finalise/peaufine, on ne le découvre pas).
2. **Stabilité de déploiement** : env vars Vercel propres, gestion des erreurs réseau, états de
   chargement partout, pas d'écran blanc en cas d'échec API.
3. **États vides et erreurs** gérés sur chaque écran (pas de crash si un endpoint backend est down).
4. **Copilot UI (P2, optionnel)** — seulement si tout le P0 ci-dessus est solide. Voir brief
   section 9.5. Ne jamais laisser le Copilot devenir l'écran principal de la démo.
5. **Répétition du script de démo** (7 minutes, brief section 19.1) sur l'environnement déployé,
   pas seulement en local.

## Definition of Done (reprend section 20 de la brief, portée frontend)

- [ ] Sélection d'une régulation → exigences structurées → Impact Analysis → Evidence → validation,
      exécutable de bout en bout sans intervention manuelle
- [ ] Au moins 1 scénario cross-language (régulation EN ↔ procédure FR) fonctionne et s'affiche
      correctement
- [ ] Aucune formulation ne prétend à une conclusion de conformité autonome
- [ ] Le déploiement Vercel supporte une répétition du script de démo sans erreur (déploiement
      fait, répétition en direct sur l'environnement déployé pas encore rejouée)
- [x] `PROGRESS.md` mis à jour, limitations connues documentées (nouveau fichier
      `docs/known-limitations.md` si besoin)
