# Glossaire Métier — KYC / AML / Conformité Réglementaire

Condensé pour développeurs (pas besoin d'être expert bancaire). Détail complet :
`../../Abiaka_Regulatory_AI_POC_Full_Project_Guide_EN.docx` section 3.

| Terme | Sens pratique dans ce POC |
|---|---|
| **Regulation** | Texte légal/réglementaire externe qui s'applique à la banque (ex. instruction ACPR, guideline EBA). |
| **Requirement / Obligation** | Une obligation atomique extraite d'une régulation. Un seul document en contient souvent 20-50. ID format `REQ-XXX`. |
| **Policy** | Règle interne de haut niveau ("la banque doit connaître ses clients"). |
| **Procedure** | Instructions détaillées internes qui implémentent une policy/obligation (ex. `KYC-001`). |
| **Control** | Vérification que la procédure est réellement appliquée. |
| **Evidence** | Passage source exact justifiant un constat, traçable à un document + section/page. |
| **Regulatory Impact Assessment** | Détermine ce qu'une nouvelle régulation impacte dans la banque. |
| **Gap Analysis** | Compare une exigence externe au contenu interne pour trouver une couverture manquante/partielle. |
| **KYC** | Know Your Customer — identifier/vérifier l'identité et le profil d'un client. |
| **AML/CFT** | Anti-Money Laundering / Combating the Financing of Terrorism. |
| **UBO / Bénéficiaire effectif** | Personne physique qui possède/contrôle réellement le client. |
| **PEP / PPE** | Politically Exposed Person / Personne Politiquement Exposée. |
| **STR / Déclaration de soupçon (DS)** | Signalement d'une transaction suspecte à l'autorité compétente (Tracfin en France). |
| **Human-in-the-loop** | L'IA assiste et priorise ; le Responsable Conformité prend la décision finale. |

## Chaîne fonctionnelle clé

```
Régulation → Obligation → Policy → Procedure → Control → Evidence
```

## Les 5 statuts d'évaluation (assessment) — vocabulaire figé, ne pas en inventer d'autres

| Valeur (code) | Sens | Couleur suggérée |
|---|---|---|
| `COVERED` | La procédure interne couvre l'exigence de façon satisfaisante | vert |
| `PARTIAL` | La procédure couvre une partie de l'exigence, pas tout | ambre/jaune |
| `POTENTIAL_GAP` | Un élément important de l'exigence semble absent de la procédure | rouge |
| `NO_RELEVANT_PROCEDURE` | Aucune procédure interne ne correspond à cette exigence | gris/neutre |
| `EXPERT_REVIEW` | Ambigu, nécessite l'interprétation d'un humain (ne pas trancher automatiquement) | violet/bleu |

## Statuts de validation humaine (`human_status`)

`PENDING` → `ACCEPTED` | `REJECTED` | `ESCALATED` (avec commentaire optionnel).
