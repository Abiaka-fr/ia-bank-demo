/**
 * Constats d'impact de démo pour l'Instruction ACPR n° 2026-04.
 *
 * Les `explanation` / `recommended_action` respectent `docs/ui-guardrails.md` :
 * aucune conclusion de conformité autonome, toujours une validation humaine attendue.
 */
import type { EvidenceRef, Finding } from "@/types/api";

import { ACPR_REGULATION_ID, procedures, regulations } from "./documents";

const ACPR_TITLE =
  regulations.find((r) => r.document_id === ACPR_REGULATION_ID)?.title ??
  ACPR_REGULATION_ID;

function procedureTitle(id: string): string {
  return procedures.find((p) => p.document_id === id)?.title ?? id;
}

function regulatoryEvidence(
  sectionReference: string,
  excerpt: string,
): EvidenceRef {
  return {
    document_id: ACPR_REGULATION_ID,
    document_title: ACPR_TITLE,
    section_reference: sectionReference,
    excerpt,
    language: "FR",
  };
}

function internalEvidence(
  procedureId: string,
  sectionReference: string,
  excerpt: string,
): EvidenceRef {
  return {
    document_id: procedureId,
    document_title: procedureTitle(procedureId),
    section_reference: sectionReference,
    excerpt,
    language: "FR",
  };
}

const UPDATED_AT = "2026-02-18T09:30:00.000Z";

export const seedFindings: readonly Finding[] = [
  {
    finding_id: "FND-001",
    requirement_id: "REQ-001",
    matched_procedure_ids: ["KYC-001", "KYC-003"],
    assessment: "COVERED",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 1 §2",
        "Cette obligation s'applique à l'égard du titulaire du compte, du ou des bénéficiaires effectifs, ainsi que de tout mandataire ou signataire habilité à agir pour le compte du client.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "KYC-001",
        "KYC-001 §5",
        "L'identité doit être vérifiée pour : (i) le titulaire du compte, (ii) le ou les bénéficiaires effectifs, (iii) les mandataires et signataires autorisés, et (iv) tout intermédiaire agissant pour le compte du client.",
      ),
      internalEvidence(
        "KYC-003",
        "KYC-003 §4",
        "L'identité du ou des bénéficiaires effectifs est vérifiée au moyen de documents, données ou informations issus d'une source fiable et indépendante, dans les mêmes conditions que pour le client lui-même.",
      ),
    ],
    explanation:
      "Preuve identifiée dans le corpus interne — validation par un expert requise. Le périmètre des personnes à identifier décrit par KYC-001 §5 recouvre celui de l'article 1 §2, et KYC-003 §4 reprend l'exigence de source fiable et indépendante.",
    missing_or_ambiguous_elements: [],
    recommended_action:
      "Confirmer la couverture lors de la revue de conformité et conserver KYC-001 §5 comme preuve de référence.",
    priority: "LOW",
    confidence_or_evidence_strength: 0.88,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-002",
    requirement_id: "REQ-002",
    matched_procedure_ids: ["KYC-003"],
    assessment: "COVERED",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 2",
        "L'établissement identifie toute personne physique détenant, directement ou indirectement, une fraction du capital ou des droits de vote du client personne morale supérieure à 25 %, ou exerçant par tout autre moyen un pouvoir de contrôle sur celui-ci.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "KYC-003",
        "KYC-003 §2-3",
        "Pour les personnes morales, la Banque identifie toute personne physique détenant, directement ou indirectement, plus de 25 % du capital ou des droits de vote, ou exerçant par tout autre moyen un pouvoir de contrôle. À défaut […] la personne physique occupant la fonction de dirigeant principal est considérée comme bénéficiaire effectif par défaut.",
      ),
    ],
    explanation:
      "Preuve identifiée dans le corpus interne — validation par un expert requise. Le seuil de 25 % et le mécanisme de repli sur le dirigeant principal figurent tous deux dans KYC-003.",
    missing_or_ambiguous_elements: [],
    recommended_action:
      "Aucune action documentaire identifiée ; confirmer lors de la revue de conformité.",
    priority: "LOW",
    confidence_or_evidence_strength: 0.92,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-003",
    requirement_id: "REQ-003",
    matched_procedure_ids: ["KYC-004"],
    assessment: "POTENTIAL_GAP",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 3 §1",
        "[…] au minimum : tous les ans pour les clients présentant un profil de risque élevé, tous les cinq ans pour les clients présentant un profil de risque moyen, et tous les dix ans pour les clients présentant un profil de risque faible.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "KYC-004",
        "KYC-004 §1",
        "La Banque procède à la mise à jour périodique du dossier de connaissance client (KYC) selon la fréquence suivante, fonction de la catégorie de risque : tous les deux (2) ans pour les clients à risque élevé, tous les huit (8) ans pour les clients à risque moyen, et tous les dix (10) ans pour les clients à risque faible.",
      ),
    ],
    explanation:
      "Écart potentiel détecté — revue de conformité requise. Les fréquences d'actualisation prévues par KYC-004 §1 (2 ans / 8 ans / 10 ans) sont plus longues que celles de l'article 3 §1 (1 an / 5 ans / 10 ans) pour les profils de risque élevé et moyen.",
    missing_or_ambiguous_elements: [
      "Fréquence pour les clients à risque élevé : 2 ans en interne contre 1 an dans le texte",
      "Fréquence pour les clients à risque moyen : 8 ans en interne contre 5 ans dans le texte",
    ],
    recommended_action:
      "Soumettre KYC-004 §1 à la revue de conformité pour arbitrage sur l'alignement des fréquences avant le 1er avril 2026.",
    priority: "HIGH",
    confidence_or_evidence_strength: 0.94,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-004",
    requirement_id: "REQ-004",
    matched_procedure_ids: [],
    assessment: "NO_RELEVANT_PROCEDURE",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 4 §1",
        "[…] l'établissement procède à une actualisation des données de connaissance client dans un délai de trente (30) jours à compter de la survenance de tout événement de nature à modifier significativement le profil de risque du client, et notamment tout changement affectant l'identité du ou des bénéficiaires effectifs.",
      ),
    ],
    internal_evidence: [],
    explanation:
      "Aucune procédure interne pertinente trouvée dans le corpus indexé pour l'actualisation événementielle sous 30 jours. KYC-004 traite uniquement de la révision périodique fondée sur la catégorie de risque.",
    missing_or_ambiguous_elements: [
      "Déclencheurs d'actualisation événementielle non définis dans le corpus indexé",
      "Délai de 30 jours non mentionné dans le corpus indexé",
    ],
    recommended_action:
      "Faire examiner par la revue de conformité l'opportunité d'une procédure couvrant l'actualisation événementielle, ou identifier un document non encore indexé qui la couvrirait.",
    priority: "HIGH",
    confidence_or_evidence_strength: 0.71,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-005",
    requirement_id: "REQ-005",
    matched_procedure_ids: ["SAN-001", "KYC-005"],
    assessment: "PARTIAL",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 5 §1",
        "L'établissement applique des mesures de vigilance complémentaires à l'égard de toute personne politiquement exposée, que celle-ci exerce ou ait exercé une fonction publique importante sur le territoire national ou à l'étranger.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "SAN-001",
        "SAN-001 §4",
        "La Banque applique des mesures de vigilance renforcée aux clients identifiés comme Personnes Politiquement Exposées (PPE) de nationalité étrangère, incluant la détermination de l'origine du patrimoine et l'approbation de la direction avant l'entrée en relation.",
      ),
      internalEvidence(
        "KYC-005",
        "KYC-005 §3",
        "Pour les clients à haut risque, la Banque recueille des informations complémentaires relatives à l'origine des fonds, au patrimoine du client, et à la justification économique de la relation d'affaires.",
      ),
    ],
    explanation:
      "Cette procédure ne semble pas couvrir intégralement l'exigence REQ-005 : SAN-001 §4 vise les personnes politiquement exposées de nationalité étrangère, alors que l'article 5 §1 vise également les fonctions publiques importantes exercées sur le territoire national.",
    missing_or_ambiguous_elements: [
      "Personnes politiquement exposées nationales non explicitement visées par SAN-001 §4",
    ],
    recommended_action:
      "Soumettre SAN-001 §4 à la revue de conformité pour statuer sur l'extension du périmètre aux personnes politiquement exposées nationales.",
    priority: "HIGH",
    confidence_or_evidence_strength: 0.86,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-006",
    requirement_id: "REQ-006",
    matched_procedure_ids: ["CORR-001"],
    assessment: "PARTIAL",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 6 §2",
        "Cette évaluation est renouvelée selon une fréquence permettant de tenir compte de toute évolution significative du profil de risque de l'établissement répondant, et au minimum tous les trois ans.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "CORR-001",
        "CORR-001 §1-2",
        "Toute relation de correspondant bancaire est établie après collecte d'informations suffisantes sur l'activité, la gouvernance et le niveau de conformité LCB-FT de la banque répondante. Il est vérifié, sur la base d'informations publiquement disponibles, que la banque répondante n'a pas fait l'objet d'une enquête ou d'une mesure réglementaire liée au blanchiment de capitaux ou au financement du terrorisme.",
      ),
    ],
    explanation:
      "Cette procédure ne semble pas couvrir intégralement l'exigence REQ-006 : CORR-001 décrit l'évaluation initiale de la banque répondante, mais aucune fréquence de réévaluation n'a été retrouvée dans le corpus indexé.",
    missing_or_ambiguous_elements: [
      "Périodicité minimale de trois ans pour la réévaluation non retrouvée dans CORR-001",
    ],
    recommended_action:
      "Faire examiner par la revue de conformité l'ajout d'une périodicité de réévaluation dans CORR-001.",
    priority: "MEDIUM",
    confidence_or_evidence_strength: 0.79,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-007",
    requirement_id: "REQ-007",
    matched_procedure_ids: ["CORR-001"],
    assessment: "EXPERT_REVIEW",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 7 §2",
        "L'établissement assujetti n'entretient aucune relation de correspondant bancaire, directe ou indirecte, avec une banque fictive.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "CORR-001",
        "CORR-001 §3",
        "La Banque n'établit aucune relation de correspondant avec une « banque fictive » (shell bank), c'est-à-dire une entité constituée dans un pays où elle n'a pas de présence physique et qui n'est affiliée à aucun groupe financier réglementé.",
      ),
    ],
    explanation:
      "Élément ambigu — interprétation par un expert conformité requise. La définition de banque fictive concorde entre les deux textes, mais CORR-001 §3 ne précise pas si l'interdiction s'étend aux relations indirectes visées à l'article 7 §2.",
    missing_or_ambiguous_elements: [
      "Portée des relations indirectes non explicitée dans CORR-001 §3",
    ],
    recommended_action:
      "Faire trancher par un expert conformité la lecture de CORR-001 §3 au regard des relations indirectes.",
    priority: "MEDIUM",
    confidence_or_evidence_strength: 0.58,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-008",
    requirement_id: "REQ-008",
    matched_procedure_ids: ["KYC-002"],
    assessment: "COVERED",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 8 §1",
        "L'établissement s'abstient d'ouvrir ou de maintenir tout compte anonyme ou sous une identité fictive, ainsi que tout compte pour lequel l'identité du titulaire réel ne peut être établie ou vérifiée.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "KYC-002",
        "KYC-002 §1",
        "La Banque n'ouvre ni ne maintient de compte anonyme, de compte sous nom fictif, ou de compte pour le compte d'un tiers dont l'identité n'a pas été divulguée ou ne peut être vérifiée.",
      ),
    ],
    explanation:
      "Preuve identifiée dans le corpus interne — validation par un expert requise. KYC-002 §1 reprend les trois cas visés par l'article 8 §1.",
    missing_or_ambiguous_elements: [],
    recommended_action:
      "Aucune action documentaire identifiée ; confirmer lors de la revue de conformité.",
    priority: "LOW",
    confidence_or_evidence_strength: 0.95,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
  {
    finding_id: "FND-009",
    requirement_id: "REQ-009",
    matched_procedure_ids: ["CTRL-001"],
    assessment: "COVERED",
    regulatory_evidence: [
      regulatoryEvidence(
        "Article 9 §1",
        "[…] incluant un programme de formation du personnel et une présentation périodique au comité d'audit ou à l'organe équivalent, à une fréquence au moins trimestrielle.",
      ),
    ],
    internal_evidence: [
      internalEvidence(
        "CTRL-001",
        "CTRL-001 §1 et §4",
        "Le Conseil d'administration s'assure de la mise en place d'un dispositif KYC/LCB-FT effectif, incluant une supervision appropriée, une séparation des tâches, et un programme de formation continue du personnel. […] Un bilan de conformité KYC/AML est présenté au Comité d'Audit du Conseil d'administration à une fréquence trimestrielle.",
      ),
    ],
    explanation:
      "Preuve identifiée dans le corpus interne — validation par un expert requise. La formation du personnel et le reporting trimestriel au comité d'audit figurent dans CTRL-001.",
    missing_or_ambiguous_elements: [],
    recommended_action:
      "Conserver CTRL-001 §4 comme preuve du reporting trimestriel lors de la revue de conformité.",
    priority: "LOW",
    confidence_or_evidence_strength: 0.9,
    human_status: "PENDING",
    updated_at: UPDATED_AT,
  },
];
