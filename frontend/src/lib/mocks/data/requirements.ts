/** Exigences extraites de l'Instruction ACPR n° 2026-04 (corpus de démo). */
import type { Requirement } from "@/types/api";

import { ACPR_REGULATION_ID } from "./documents";

const base = {
  source_document_id: ACPR_REGULATION_ID,
  effective_date: "2026-04-01",
  language: "FR",
} as const;

export const requirements: readonly Requirement[] = [
  {
    ...base,
    requirement_id: "REQ-001",
    source_reference: "Article 1",
    source_text:
      "Tout établissement assujetti met en œuvre des mesures de vigilance permettant d'identifier son client et de vérifier son identité au moyen de documents, données ou informations issus d'une source fiable et indépendante, préalablement à l'entrée en relation d'affaires. Cette obligation s'applique à l'égard du titulaire du compte, du ou des bénéficiaires effectifs, ainsi que de tout mandataire ou signataire habilité à agir pour le compte du client.",
    normalized_requirement:
      "Identifier et vérifier l'identité du client, des bénéficiaires effectifs et des mandataires avant l'entrée en relation, à partir d'une source fiable et indépendante.",
    domain: ["KYC"],
    impacted_activity: ["Entrée en relation", "Ouverture de compte"],
  },
  {
    ...base,
    requirement_id: "REQ-002",
    source_reference: "Article 2",
    source_text:
      "L'établissement identifie toute personne physique détenant, directement ou indirectement, une fraction du capital ou des droits de vote du client personne morale supérieure à 25 %, ou exerçant par tout autre moyen un pouvoir de contrôle sur celui-ci. À défaut d'identification d'une personne physique répondant à ces critères, la personne physique exerçant la fonction de dirigeant principal du client est réputée bénéficiaire effectif.",
    normalized_requirement:
      "Identifier le bénéficiaire effectif au seuil de 25 % de détention ou de contrôle, avec repli sur le dirigeant principal.",
    domain: ["KYC"],
    impacted_activity: ["Entrée en relation", "Clients personnes morales"],
  },
  {
    ...base,
    requirement_id: "REQ-003",
    source_reference: "Article 3",
    source_text:
      "L'établissement actualise les éléments d'identification et de connaissance de sa clientèle selon une fréquence proportionnée au niveau de risque du client, et au minimum : tous les ans pour les clients présentant un profil de risque élevé, tous les cinq ans pour les clients présentant un profil de risque moyen, et tous les dix ans pour les clients présentant un profil de risque faible.",
    normalized_requirement:
      "Actualiser le dossier de connaissance client au minimum tous les 1 an (risque élevé), 5 ans (risque moyen) et 10 ans (risque faible).",
    domain: ["KYC"],
    impacted_activity: ["Revue périodique", "Gestion du portefeuille clients"],
  },
  {
    ...base,
    requirement_id: "REQ-004",
    source_reference: "Article 4",
    source_text:
      "Indépendamment de la fréquence mentionnée à l'article 3, l'établissement procède à une actualisation des données de connaissance client dans un délai de trente (30) jours à compter de la survenance de tout événement de nature à modifier significativement le profil de risque du client, et notamment tout changement affectant l'identité du ou des bénéficiaires effectifs.",
    normalized_requirement:
      "Actualiser le dossier client dans les 30 jours suivant tout événement modifiant significativement son profil de risque, notamment un changement de bénéficiaire effectif.",
    domain: ["KYC"],
    impacted_activity: ["Revue événementielle", "Surveillance continue"],
  },
  {
    ...base,
    requirement_id: "REQ-005",
    source_reference: "Article 5",
    source_text:
      "L'établissement applique des mesures de vigilance complémentaires à l'égard de toute personne politiquement exposée, que celle-ci exerce ou ait exercé une fonction publique importante sur le territoire national ou à l'étranger. Ces mesures incluent la détermination de l'origine du patrimoine et des fonds impliqués dans la relation d'affaires, ainsi que l'approbation par un membre de la direction avant l'entrée en relation d'affaires ou la poursuite de celle-ci.",
    normalized_requirement:
      "Appliquer des mesures de vigilance renforcée aux personnes politiquement exposées nationales comme étrangères, incluant origine du patrimoine et approbation de la direction.",
    domain: ["Sanctions", "KYC"],
    impacted_activity: ["Filtrage PPE", "Entrée en relation"],
  },
  {
    ...base,
    requirement_id: "REQ-006",
    source_reference: "Article 6",
    source_text:
      "Avant l'établissement d'une relation de correspondant bancaire, l'établissement recueille des informations suffisantes sur l'établissement répondant afin d'apprécier la qualité de son dispositif de lutte contre le blanchiment de capitaux et le financement du terrorisme. Cette évaluation est renouvelée selon une fréquence permettant de tenir compte de toute évolution significative du profil de risque de l'établissement répondant, et au minimum tous les trois ans.",
    normalized_requirement:
      "Évaluer le dispositif LCB-FT de la banque répondante avant l'entrée en relation de correspondance, puis renouveler cette évaluation au minimum tous les trois ans.",
    domain: ["AML/CFT"],
    impacted_activity: ["Correspondant bancaire", "Revue périodique"],
  },
  {
    ...base,
    requirement_id: "REQ-007",
    source_reference: "Article 7",
    source_text:
      "Une « banque fictive » s'entend de tout établissement constitué dans un pays où il n'a pas de présence physique effective et qui n'est affilié à aucun groupe financier réglementé et soumis à supervision. L'établissement assujetti n'entretient aucune relation de correspondant bancaire, directe ou indirecte, avec une banque fictive.",
    normalized_requirement:
      "Interdire toute relation de correspondant bancaire, directe ou indirecte, avec une banque fictive.",
    domain: ["AML/CFT"],
    impacted_activity: ["Correspondant bancaire"],
  },
  {
    ...base,
    requirement_id: "REQ-008",
    source_reference: "Article 8",
    source_text:
      "L'établissement s'abstient d'ouvrir ou de maintenir tout compte anonyme ou sous une identité fictive, ainsi que tout compte pour lequel l'identité du titulaire réel ne peut être établie ou vérifiée.",
    normalized_requirement:
      "Interdire l'ouverture et le maintien de comptes anonymes, sous identité fictive, ou dont le titulaire réel ne peut être vérifié.",
    domain: ["KYC"],
    impacted_activity: ["Acceptation client", "Ouverture de compte"],
  },
  {
    ...base,
    requirement_id: "REQ-009",
    source_reference: "Article 9",
    source_text:
      "L'établissement met en place un dispositif de contrôle interne permettant de vérifier l'application effective des mesures de vigilance prévues par la présente instruction, incluant un programme de formation du personnel et une présentation périodique au comité d'audit ou à l'organe équivalent, à une fréquence au moins trimestrielle.",
    normalized_requirement:
      "Maintenir un dispositif de contrôle interne KYC/LCB-FT incluant formation du personnel et reporting trimestriel au comité d'audit.",
    domain: ["Contrôle Interne"],
    impacted_activity: ["Contrôle interne", "Gouvernance"],
  },
];
