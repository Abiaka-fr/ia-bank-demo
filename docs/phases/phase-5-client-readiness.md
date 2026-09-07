# Phase 5 — Client Readiness (≈ Semaine 5)

Source : Full Project Guide, section 17, semaine 5 ; script de démo section 19 ; Definition of Done
section 20.

## Objectif

Rendre le POC démontrable de façon fiable et répétable devant un client, sans intervention manuelle.

> **État au 2026-09-07 — c'est la phase à ouvrir maintenant.** Les Phases 2, 3 et 4 ont leur portée
> frontend terminée (voir leurs fichiers respectifs) : Dashboard, Analyse réglementaire, Analyse
> d'impact et Evidence/validation sont construits et branchés sur le backend réel de Thư pour tout
> ce qu'il couvre. Rien ici ne dépend d'un développement frontend supplémentaire pour démarrer —
> seulement d'un accès au compte Vercel et d'une revue de démo. Un point mineur hérité de la
> Phase 3 reste ouvert en parallèle (persistance des filtres dans l'URL,
> `docs/phases/phase-3-impact-engine.md`), mais ne bloque pas cette phase.

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
- [ ] Le déploiement Vercel supporte une répétition du script de démo sans erreur
- [ ] `PROGRESS.md` mis à jour, limitations connues documentées (nouveau fichier
      `docs/known-limitations.md` si besoin)
