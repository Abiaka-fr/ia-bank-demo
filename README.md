# IA Bank — Regulatory AI Copilot (POC)

POC de 5 semaines pour ABIAKA : un outil d'aide à la décision qui analyse une nouvelle
réglementation, identifie les procédures internes potentiellement impactées, met en évidence les
écarts possibles avec preuves à l'appui, et laisse un Responsable Conformité valider chaque
constat.

> Ce fichier est pour les humains. Pour le contexte destiné à un agent Claude Code, voir
> [`CLAUDE.md`](./CLAUDE.md) — il est lu automatiquement à l'ouverture d'une session.

## Équipe

- **Giang (Dev A, temps plein)** — Frontend + intégration + demo. Voir [`frontend/`](./frontend).
- **Thư (Dev B, temps partiel)** — Backend + pipeline IA (extraction, retrieval, comparaison).
  Voir [`backend/`](./backend).

## Démarrage rapide

- Contexte produit complet : `../Abiaka_Regulatory_AI_POC_Full_Project_Guide_EN.docx` (dossier parent)
- Corpus de démo (procédures + réglementations fictives) : fichiers `IABank_*.docx` dans le dossier
  parent
- État actuel du projet : [`PROGRESS.md`](./PROGRESS.md)
- Planning par phase : [`docs/phases/`](./docs/phases)
- Contrat d'API frontend ↔ backend : [`docs/api-contract.md`](./docs/api-contract.md)

## Déploiement cible

Frontend → Vercel · Backend → Railway/Render (choix final selon la stack de Thư).
