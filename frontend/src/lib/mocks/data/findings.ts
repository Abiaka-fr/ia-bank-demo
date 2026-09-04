/**
 * Constats d'impact de démo pour l'Instruction ACPR n° 2026-04.
 *
 * v1.1 du contrat : **un constat = un couple (exigence × procédure interne)**. Une
 * exigence qui touche deux procédures produit donc deux constats, chacun avec son
 * action recommandée et sa propre validation humaine. Une exigence sans procédure
 * correspondante produit un constat avec `procedure_id: null`.
 *
 * Les `explanation` / `recommended_action` respectent `docs/ui-guardrails.md` :
 * aucune conclusion de conformité autonome, toujours une validation humaine attendue.
 */
import type { EvidenceRef, Finding } from "@/types/api";

import { ACPR_REGULATION_ID, procedures, regulations } from "./documents";

const ACPR_TITLE =
  regulations.find((r) => r.document_id === ACPR_REGULATION_ID)?.title ??
  ACPR_REGULATION_ID;

const UPDATED_AT = "2026-02-18T09:30:00.000Z";

function reg(sectionReference: string, excerpt: string): EvidenceRef {
  return {
    document_id: ACPR_REGULATION_ID,
    document_title: ACPR_TITLE,
    section_reference: sectionReference,
    excerpt,
    language: "FR",
  };
}

function proc(
  procedureId: string,
  sectionReference: string,
  excerpt: string,
): EvidenceRef {
  return {
    document_id: procedureId,
    document_title:
      procedures.find((p) => p.document_id === procedureId)?.title ?? procedureId,
    section_reference: sectionReference,
    excerpt,
    language: "FR",
  };
}

type Seed = Omit<Finding, "human_status" | "updated_at">;

const seeds: readonly Seed[] = [
  {
    finding_id: "FND-001-A",
    requirement_id: "REQ-001",
    procedure_id: "KYC-001",
    assessment: "COVERED",
    regulatory_evidence: [
      reg(
        "Article 1 §2",
        "Cette obligation s'applique à l'égard du titulaire du compte, du ou des bénéficiaires effectifs, ainsi que de tout mandataire ou signataire habilité à agir pour le compte du client.",
      ),
    ],
    internal_evidence: [
      proc(
        "KYC-001",
        "KYC-001 §5",
        "L'identité doit être vérifiée pour : (i) le titulaire du compte, (ii) le ou les bénéficiaires effectifs, (iii) les mandataires et signataires autorisés, et (iv) tout intermédiaire agissant pour le compte du client.",
      ),
    ],
    explanation:
      "Preuve identifiée dans le corpus interne — validation par un expert requise. Le périmètre des personnes à identifier décrit par KYC-001 §5 recouvre celui de l'article 1 §2.",
    missing_or_ambiguous_elements: [],
    recommended_action:
      "Conserver KYC-001 §5 comme preuve de référence lors de la revue de conformité.",
    priority: "LOW",
    confidence_or_evidence_strength: 0.88,
  },
  {
    finding_id: "FND-001-B",
    requirement_id: "REQ-001",
    procedure_id: "KYC-003",
    assessment: "COVERED",
    regulatory_evidence: [
      reg(
        "Article 1 §1",
        "Tout établissement assujetti met en œuvre des mesures de vigilance permettant d'identifier son client et de vérifier son identité au moyen de documents, données ou informations issus d'une source fiable et indépendante, préalablement à l'entrée en relation d'affaires.",
      ),
    ],
    internal_evidence: [
      proc(
        "KYC-003",
        "KYC-003 §4",
        "L'identité du ou des bénéficiaires effectifs est vérifiée au moyen de documents, données ou informations issus d'une source fiable et indépendante, dans les mêmes conditions que pour le client lui-même.",
      ),
    ],
    explanation:
      "Preuve identifiée dans le corpus interne — validation par un expert requise. KYC-003 §4 reprend l'exigence de source fiable et indépendante pour les bénéficiaires effectifs.",
    missing_or_ambiguous_elements: [],
    recommended_action:
      "Aucune action documentaire identifiée ; confirmer lors de la revue de conformité.",
    priority: "LOW",
    confidence_or_evidence_strength: 0.85,
  },
  {
    finding_id: "FND-002",
    requirement_id: "REQ-002",
    procedure_id: "KYC-003",
    assessment: "COVERED",
    regulatory_evidence: [
      reg(
        "Article 2",
        "L'établissement identifie toute personne physique détenant, directement ou indirectement, une fraction du capital ou des droits de vote du client personne morale supérieure à 25 %, ou exerçant par tout autre moyen un pouvoir de contrôle sur celui-ci.",
      ),
    ],
    internal_evidence: [
      proc(
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
  },
  {
    finding_id: "FND-003",
    requirement_id: "REQ-003",
    procedure_id: "KYC-004",
    assessment: "POTENTIAL_GAP",
    regulatory_evidence: [
      reg(
        "Article 3 §1",
        "[…] au minimum : tous les ans pour les clients présentant un profil de risque élevé, tous les cinq ans pour les clients présentant un profil de risque moyen, et tous les dix ans pour les clients présentant un profil de risque faible.",
      ),
    ],
    internal_evidence: [
      proc(
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
      "Aligner les fréquences de KYC-004 §1 sur 1 an / 5 ans / 10 ans avant le 1er avril 2026.",
    priority: "HIGH",
    confidence_or_evidence_strength: 0.94,
  },
  {
    finding_id: "FND-004",
    requirement_id: "REQ-004",
    procedure_id: null,
    assessment: "NO_RELEVANT_PROCEDURE",
    regulatory_evidence: [
      reg(
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
      "Créer une procédure couvrant l'actualisation événementielle sous 30 jours, ou indexer le document existant qui la couvrirait.",
    priority: "HIGH",
    confidence_or_evidence_strength: 0.71,
  },
  {
    finding_id: "FND-005-A",
    requirement_id: "REQ-005",
    procedure_id: "SAN-001",
    assessment: "PARTIAL",
    regulatory_evidence: [
      reg(
        "Article 5 §1",
        "L'établissement applique des mesures de vigilance complémentaires à l'égard de toute personne politiquement exposée, que celle-ci exerce ou ait exercé une fonction publique importante sur le territoire national ou à l'étranger.",
      ),
    ],
    internal_evidence: [
      proc(
        "SAN-001",
        "SAN-001 §4",
        "La Banque applique des mesures de vigilance renforcée aux clients identifiés comme Personnes Politiquement Exposées (PPE) de nationalité étrangère, incluant la détermination de l'origine du patrimoine et l'approbation de la direction avant l'entrée en relation.",
      ),
    ],
    explanation:
      "Cette procédure ne semble pas couvrir intégralement l'exigence REQ-005 : SAN-001 §4 vise les personnes politiquement exposées de nationalité étrangère, alors que l'article 5 §1 vise également les fonctions publiques importantes exercées sur le territoire national.",
    missing_or_ambiguous_elements: [
      "Personnes politiquement exposées nationales non explicitement visées par SAN-001 §4",
    ],
    recommended_action:
      "Étendre le périmètre de SAN-001 §4 aux personnes politiquement exposées nationales.",
    priority: "HIGH",
    confidence_or_evidence_strength: 0.86,
  },
  {
    finding_id: "FND-005-B",
    requirement_id: "REQ-005",
    procedure_id: "KYC-005",
    assessment: "PARTIAL",
    regulatory_evidence: [
      reg(
        "Article 5 §2",
        "Ces mesures incluent la détermination de l'origine du patrimoine et des fonds impliqués dans la relation d'affaires, ainsi que l'approbation par un membre de la direction avant l'entrée en relation d'affaires ou la poursuite de celle-ci.",
      ),
    ],
    internal_evidence: [
      proc(
        "KYC-005",
        "KYC-005 §3 et §5",
        "Pour les clients à haut risque, la Banque recueille des informations complémentaires relatives à l'origine des fonds, au patrimoine du client, et à la justification économique de la relation d'affaires. […] Toute relation présentant un profil de risque élevé fait l'objet d'une validation par un responsable habilité avant l'entrée en relation.",
      ),
    ],
    explanation:
      "Cette procédure ne semble pas couvrir intégralement l'exigence REQ-005 : KYC-005 traite l'origine du patrimoine et l'approbation préalable pour les clients classés à haut risque, sans rattacher explicitement ces mesures au statut de personne politiquement exposée.",
    missing_or_ambiguous_elements: [
      "Lien entre statut de personne politiquement exposée et classification à haut risque non explicité dans KYC-005",
    ],
    recommended_action:
      "Préciser dans KYC-005 que le statut de personne politiquement exposée déclenche systématiquement la diligence renforcée.",
    priority: "MEDIUM",
    confidence_or_evidence_strength: 0.74,
  },
  {
    finding_id: "FND-006",
    requirement_id: "REQ-006",
    procedure_id: "CORR-001",
    assessment: "PARTIAL",
    regulatory_evidence: [
      reg(
        "Article 6 §2",
        "Cette évaluation est renouvelée selon une fréquence permettant de tenir compte de toute évolution significative du profil de risque de l'établissement répondant, et au minimum tous les trois ans.",
      ),
    ],
    internal_evidence: [
      proc(
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
      "Ajouter à CORR-001 une périodicité de réévaluation d'au maximum trois ans.",
    priority: "MEDIUM",
    confidence_or_evidence_strength: 0.79,
  },
  {
    finding_id: "FND-007",
    requirement_id: "REQ-007",
    procedure_id: "CORR-001",
    assessment: "EXPERT_REVIEW",
    regulatory_evidence: [
      reg(
        "Article 7 §2",
        "L'établissement assujetti n'entretient aucune relation de correspondant bancaire, directe ou indirecte, avec une banque fictive.",
      ),
    ],
    internal_evidence: [
      proc(
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
  },
  {
    finding_id: "FND-008",
    requirement_id: "REQ-008",
    procedure_id: "KYC-002",
    assessment: "COVERED",
    regulatory_evidence: [
      reg(
        "Article 8 §1",
        "L'établissement s'abstient d'ouvrir ou de maintenir tout compte anonyme ou sous une identité fictive, ainsi que tout compte pour lequel l'identité du titulaire réel ne peut être établie ou vérifiée.",
      ),
    ],
    internal_evidence: [
      proc(
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
  },
  {
    finding_id: "FND-009",
    requirement_id: "REQ-009",
    procedure_id: "CTRL-001",
    assessment: "COVERED",
    regulatory_evidence: [
      reg(
        "Article 9 §1",
        "[…] incluant un programme de formation du personnel et une présentation périodique au comité d'audit ou à l'organe équivalent, à une fréquence au moins trimestrielle.",
      ),
    ],
    internal_evidence: [
      proc(
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
  },
];

export const seedFindings: readonly Finding[] = seeds.map((seed) => ({
  ...seed,
  human_status: "PENDING",
  updated_at: UPDATED_AT,
}));
