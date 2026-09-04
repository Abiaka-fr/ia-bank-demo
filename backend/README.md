# Backend — Zone de Thư

Ce dossier est la propriété de Thư (Dev B). La stack (langage, framework, base de données,
provider LLM, vector store) est son choix — non imposé par ce dépôt.

## Ce qui n'est PAS négociable

Le backend doit implémenter les endpoints décrits dans **`../docs/api-contract.md`** avec exactement
les formes de requête/réponse documentées. Le frontend développe en parallèle contre des mocks basés
sur ce contrat — toute divergence casse le frontend silencieusement.

Si un changement de contrat est nécessaire (champ manquant, endpoint supplémentaire, etc.) : le
documenter dans `../docs/api-contract.md` d'abord, en informer Giang, puis implémenter.

## Contexte utile pour cette partie

- Data model (Document/Requirement/Finding) : `../docs/api-contract.md`
- Glossaire métier KYC/AML : `../docs/glossary.md`
- Garde-fous IA (ce que le modèle ne doit jamais affirmer) : `../docs/ui-guardrails.md`
- Corpus de démo à ingérer : fichiers `.docx` dans le dossier parent du dépôt
  (`../../IABank_Internal_Procedures_KYC_AML_FR_v1.docx`,
  `../../IABank_Regulation1_ACPR_Instruction_Connaissance_Client_FR_v1.docx`,
  `../../IABank_Regulation2_EBA_Guidelines_EDD_WireTransfer_EN_v1.docx`)
- Cadre d'évaluation recommandé (golden test cases, métriques de retrieval/classification) : voir
  `Abiaka_Regulatory_AI_POC_Full_Project_Guide_EN.docx` section 15
- Garde-fous techniques recommandés (hallucination, prompt injection dans les documents, etc.) :
  même document, section 14

## Suggestion (non contraignante)

Une fois la stack choisie, créer un `backend/CLAUDE.md` sur le même modèle que
`../frontend/CLAUDE.md` : stack figée, structure de dossiers, commande de bootstrap, règles
anti-duplication, checklist avant de terminer une tâche. Mettre à jour `../PROGRESS.md` (section
"Journal des décisions") une fois le choix fait.
