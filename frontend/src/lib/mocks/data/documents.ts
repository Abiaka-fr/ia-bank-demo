/**
 * Corpus de démo — extrait des documents fictifs du projet
 * (`IABank_Regulation1_ACPR_*.docx`, `IABank_Regulation2_EBA_*.docx`,
 * `IABank_Internal_Procedures_KYC_AML_FR_v1.docx`).
 *
 * Aucune donnée client réelle. Les textes sont conservés dans leur langue d'origine :
 * les extraits de preuve ne sont jamais traduits (voir frontend/CLAUDE.md § Bilingue).
 */
import { documentMetaSchema, type DocumentDetail, type DocumentMeta } from "@/types/api";

export const ACPR_REGULATION_ID = "REG-ACPR-2026-04";

const acprExtractedText = `Instruction ACPR n° 2026-04 — Mesures de vigilance en matière de connaissance de la clientèle et de lutte contre le blanchiment de capitaux et le financement du terrorisme.

Article 1 — Identification et vérification de la clientèle
1. Tout établissement assujetti met en œuvre des mesures de vigilance permettant d'identifier son client et de vérifier son identité au moyen de documents, données ou informations issus d'une source fiable et indépendante, préalablement à l'entrée en relation d'affaires.
2. Cette obligation s'applique à l'égard du titulaire du compte, du ou des bénéficiaires effectifs, ainsi que de tout mandataire ou signataire habilité à agir pour le compte du client.

Article 2 — Bénéficiaire effectif
1. L'établissement identifie toute personne physique détenant, directement ou indirectement, une fraction du capital ou des droits de vote du client personne morale supérieure à 25 %, ou exerçant par tout autre moyen un pouvoir de contrôle sur celui-ci.
2. À défaut d'identification d'une personne physique répondant à ces critères, la personne physique exerçant la fonction de dirigeant principal du client est réputée bénéficiaire effectif.

Article 3 — Fréquence de l'actualisation des données de connaissance client
1. L'établissement actualise les éléments d'identification et de connaissance de sa clientèle selon une fréquence proportionnée au niveau de risque du client, et au minimum : tous les ans pour les clients présentant un profil de risque élevé, tous les cinq ans pour les clients présentant un profil de risque moyen, et tous les dix ans pour les clients présentant un profil de risque faible.

Article 4 — Actualisation événementielle des données de connaissance client
1. Indépendamment de la fréquence mentionnée à l'article 3, l'établissement procède à une actualisation des données de connaissance client dans un délai de trente (30) jours à compter de la survenance de tout événement de nature à modifier significativement le profil de risque du client, et notamment tout changement affectant l'identité du ou des bénéficiaires effectifs.

Article 5 — Personnes politiquement exposées
1. L'établissement applique des mesures de vigilance complémentaires à l'égard de toute personne politiquement exposée, que celle-ci exerce ou ait exercé une fonction publique importante sur le territoire national ou à l'étranger.
2. Ces mesures incluent la détermination de l'origine du patrimoine et des fonds impliqués dans la relation d'affaires, ainsi que l'approbation par un membre de la direction avant l'entrée en relation d'affaires ou la poursuite de celle-ci.

Article 6 — Relations de correspondance bancaire
1. Avant l'établissement d'une relation de correspondant bancaire, l'établissement recueille des informations suffisantes sur l'établissement répondant afin d'apprécier la qualité de son dispositif de lutte contre le blanchiment de capitaux et le financement du terrorisme, et s'assure qu'il ne s'agit pas d'une banque fictive au sens de l'article 7 de la présente instruction.
2. Cette évaluation est renouvelée selon une fréquence permettant de tenir compte de toute évolution significative du profil de risque de l'établissement répondant, et au minimum tous les trois ans.

Article 7 — Interdiction des relations avec les banques fictives
1. Une « banque fictive » s'entend de tout établissement constitué dans un pays où il n'a pas de présence physique effective et qui n'est affilié à aucun groupe financier réglementé et soumis à supervision.
2. L'établissement assujetti n'entretient aucune relation de correspondant bancaire, directe ou indirecte, avec une banque fictive.

Article 8 — Acceptation de la clientèle
1. L'établissement s'abstient d'ouvrir ou de maintenir tout compte anonyme ou sous une identité fictive, ainsi que tout compte pour lequel l'identité du titulaire réel ne peut être établie ou vérifiée.

Article 9 — Dispositif de contrôle interne
1. L'établissement met en place un dispositif de contrôle interne permettant de vérifier l'application effective des mesures de vigilance prévues par la présente instruction, incluant un programme de formation du personnel et une présentation périodique au comité d'audit ou à l'organe équivalent, à une fréquence au moins trimestrielle.

Article 10 — Entrée en vigueur
La présente instruction entre en vigueur le 1er avril 2026. Les établissements assujettis disposent d'un délai de mise en conformité de trois mois à compter de cette date.`;

const ebaExtractedText = `EBA/GL/2026/03 — Guidelines on Customer Risk Classification, Enhanced Due Diligence and Wire Transfer Information Requirements.

Guideline 1 — Customer risk classification
Credit institutions shall determine the money laundering and terrorist financing risk associated with each customer relationship on the basis of, at a minimum, the following risk factors: (a) product and service type; (b) country and geographic risk; (c) customer type; (d) the expected mode of operation of the account; (e) source of funds and source of wealth; (f) customer occupation or business activity; (g) net worth, where relevant and proportionate; (h) account status and activity; (i) average monthly turnover; and (j) history of previous suspicious transaction reports filed in relation to the customer.

Guideline 2 — Periodic review of risk classification
The risk classification assigned to a customer shall be reviewed at intervals proportionate to the assessed risk, and in any case no less frequently than every six months for the overall population of monitored accounts.

Guideline 3 — Wire transfer information requirements
For any transfer of funds equal to or exceeding EUR 1,000, the payment service provider of the payer shall ensure that the transfer is accompanied by the name of the payer, the payer's account number, and either the payer's address, an official personal document number, a customer identification number, or the payer's date and place of birth.

Guideline 4 — Enhanced due diligence for high-risk relationships
Institutions shall apply enhanced due diligence measures to any business relationship or occasional transaction classified as high risk, including the gathering of additional information on the purpose and intended nature of the business relationship, and on the source of funds and source of wealth of the customer.

Guideline 5 — Correspondent banking relationships
Prior to entering into a correspondent relationship, an institution shall gather sufficient information about the respondent institution to understand fully the nature of its business, and shall determine from publicly available information the reputation of the institution and the quality of the supervision to which it is subject.

Guideline 6 — Recordkeeping
Institutions shall retain all documents, data and information obtained in the course of customer due diligence, together with records of transactions, for a period of five years following the termination of the business relationship.

Guideline 7 — Date of application
These Guidelines apply from 1 April 2026.`;

export const regulations: readonly DocumentDetail[] = [
  {
    document_id: ACPR_REGULATION_ID,
    title:
      "Instruction ACPR n° 2026-04 — Vigilance connaissance client et LCB-FT",
    document_type: "REGULATION",
    authority_or_owner: "ACPR",
    domain: ["KYC", "AML/CFT"],
    language: "FR",
    version: "1.0",
    publication_date: "2026-01-14",
    effective_date: "2026-04-01",
    status: "ANALYZED",
    uploaded_by_id: "USR-001",
    uploaded_at: "2026-01-20T08:15:00.000Z",
    assignee_id: "USR-002",
    extracted_text: acprExtractedText,
  },
  {
    document_id: "REG-EBA-GL-2026-03",
    title:
      "EBA/GL/2026/03 — Customer Risk Classification, EDD and Wire Transfer Information",
    document_type: "REGULATION",
    authority_or_owner: "EBA",
    domain: ["AML/CFT", "Sanctions"],
    language: "EN",
    version: "1.0",
    publication_date: "2026-01-22",
    effective_date: "2026-04-01",
    status: "NOT_ANALYZED",
    uploaded_by_id: "USR-001",
    uploaded_at: "2026-01-26T14:40:00.000Z",
    assignee_id: "USR-004",
    extracted_text: ebaExtractedText,
  },
];

type ProcedureSeed = {
  id: string;
  title: string;
  domain: string[];
  version: string;
  effective_date: string;
  owner: string;
  text: string;
};

const procedureSeeds: readonly ProcedureSeed[] = [
  {
    id: "KYC-001",
    title: "Identification et Vérification du Client",
    domain: ["KYC"],
    version: "3.2",
    effective_date: "2024-09-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. Pour toute ouverture de compte, le chargé de clientèle recueille une pièce d'identité en cours de validité et un justificatif de domicile de moins de trois mois.
2. Lorsque l'adresse figurant sur le justificatif d'identité correspond à celle déclarée sur le formulaire d'ouverture de compte, ce document est accepté comme preuve conjointe d'identité et de domicile.
3. Un seul justificatif de domicile (actuel ou permanent) est exigé à l'ouverture du compte ou lors d'une mise à jour périodique. En cas de changement d'adresse, le client dispose d'un délai de six mois pour transmettre un nouveau justificatif.
4. À défaut de justificatif correspondant à l'adresse de résidence effective, une déclaration d'adresse de correspondance est recueillie ; celle-ci est confirmée par une méthode de confirmation positive.
5. L'identité doit être vérifiée pour : (i) le titulaire du compte, (ii) le ou les bénéficiaires effectifs, (iii) les mandataires et signataires autorisés, et (iv) tout intermédiaire agissant pour le compte du client.
6. Un identifiant client unique (UCIC) est attribué à chaque client afin de centraliser le suivi de la relation et des transactions associées.
7. Le transfert d'un compte d'une agence à une autre au sein de la Banque ne nécessite pas de nouvelle collecte de justificatif de domicile, sous réserve d'une auto-déclaration du client relative à son adresse actuelle.`,
  },
  {
    id: "KYC-002",
    title: "Politique d'Acceptation Client",
    domain: ["KYC"],
    version: "2.0",
    effective_date: "2023-03-15",
    owner: "IA Bank - Direction Conformité",
    text: `1. La Banque n'ouvre ni ne maintient de compte anonyme, de compte sous nom fictif, ou de compte pour le compte d'un tiers dont l'identité n'a pas été divulguée ou ne peut être vérifiée.
2. L'ouverture de compte pour le compte d'un client par un intermédiaire professionnel (avocat, expert-comptable, etc.) est refusée lorsque cet intermédiaire invoque une obligation de confidentialité l'empêchant de révéler l'identité réelle du titulaire ou du bénéficiaire des fonds.
3. Préalablement à l'ouverture, des contrôles sont réalisés afin de s'assurer que l'identité du client ne correspond à aucune personne recensée pour antécédents criminels ou figurant sur une liste d'entités visées par des mesures restrictives (cf. procédure SAN-001).
4. Chaque client est classé dans une catégorie de risque — Faible, Moyen ou Élevé — sur la base de critères tels que la nature de l'activité, la localisation géographique, et le profil social et financier.
5. Un profil est constitué pour chaque nouveau client, incluant son identité, son statut social et financier, la nature de son activité et, le cas échéant, les informations relatives à sa propre clientèle et à sa localisation. Seules les informations pertinentes au regard de la catégorie de risque sont sollicitées.
6. La Banque n'ouvre pas de compte lorsqu'elle n'est pas en mesure d'appliquer les mesures de vigilance appropriées, notamment en cas de non-coopération du client ou de non-fiabilité des informations fournies.`,
  },
  {
    id: "KYC-003",
    title: "Identification du Bénéficiaire Effectif",
    domain: ["KYC"],
    version: "1.4",
    effective_date: "2024-01-10",
    owner: "IA Bank - Direction Conformité",
    text: `1. Le bénéficiaire effectif s'entend de toute personne physique qui, en dernier ressort, possède ou contrôle le client, ou pour le compte de laquelle une transaction est exécutée.
2. Pour les personnes morales, la Banque identifie toute personne physique détenant, directement ou indirectement, plus de 25 % du capital ou des droits de vote, ou exerçant par tout autre moyen un pouvoir de contrôle.
3. À défaut d'identification d'une personne physique répondant à ces critères, la personne physique occupant la fonction de dirigeant principal est considérée comme bénéficiaire effectif par défaut.
4. L'identité du ou des bénéficiaires effectifs est vérifiée au moyen de documents, données ou informations issus d'une source fiable et indépendante, dans les mêmes conditions que pour le client lui-même.
5. La vérification du ou des bénéficiaires effectifs est renouvelée lors de toute mise à jour périodique du dossier KYC du client, selon la fréquence applicable définie en KYC-004.`,
  },
  {
    id: "KYC-004",
    title: "Révision Périodique du Dossier KYC",
    domain: ["KYC"],
    version: "2.1",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. La Banque procède à la mise à jour périodique du dossier de connaissance client (KYC) selon la fréquence suivante, fonction de la catégorie de risque : tous les deux (2) ans pour les clients à risque élevé, tous les huit (8) ans pour les clients à risque moyen, et tous les dix (10) ans pour les clients à risque faible.
2. La révision périodique comprend la confirmation de l'identité, de l'adresse, et de tout autre élément jugé raisonnablement nécessaire au regard du profil de risque du client.
3. Pour les clients classés à risque faible, en l'absence de changement de situation, une auto-certification du client peut se substituer à la production de nouveaux justificatifs.
4. Les délais mentionnés au point 1 courent à compter de la date d'ouverture du compte ou de la date de la dernière vérification KYC effectuée.
5. La présente procédure s'applique à l'ensemble des clients existants, selon une approche fondée sur le risque et la matérialité.`,
  },
  {
    id: "KYC-005",
    title: "Diligence Renforcée pour Client à Haut Risque",
    domain: ["KYC"],
    version: "1.2",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. Une diligence renforcée est appliquée à tout client classé en catégorie de risque élevé, ainsi qu'à toute relation présentant des facteurs de risque particuliers liés au produit, à la zone géographique ou au canal de distribution.
2. La classification du risque repose sur les paramètres définis dans la procédure AML-001.
3. Pour les clients à haut risque, la Banque recueille des informations complémentaires relatives à l'origine des fonds, au patrimoine du client, et à la justification économique de la relation d'affaires.
4. La revue du dossier des clients à haut risque est réalisée selon la fréquence définie en KYC-004.
5. Toute relation présentant un profil de risque élevé fait l'objet d'une validation par un responsable habilité avant l'entrée en relation.`,
  },
  {
    id: "AML-001",
    title: "Méthodologie de Classification du Risque",
    domain: ["AML/CFT"],
    version: "2.3",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. Le niveau de risque de chaque client est déterminé sur la base des paramètres suivants : code produit, code pays, type de client, mode de fonctionnement du compte, origine des fonds, profession, patrimoine net, statut du compte, chiffre d'affaires mensuel moyen, antécédents de déclaration de soupçon.
2. Chaque client est classé Faible, Moyen ou Élevé sur la base d'une évaluation individuelle, et non uniquement en fonction d'une catégorie ou d'un groupe de clients (non-résidents, négociants en métaux précieux, clients fortunés, etc.).
3. La classification de risque est révisée à une fréquence au moins semestrielle.
4. Le risque associé à un client correspond au niveau de risque le plus élevé constaté parmi l'ensemble de ses comptes.`,
  },
  {
    id: "AML-002",
    title: "Revue des Alertes de Transaction",
    domain: ["AML/CFT"],
    version: "1.6",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. La Banque exerce une surveillance continue des opérations afin de détecter toute transaction s'écartant du profil habituel du client.
2. Une attention particulière est portée aux opérations complexes, aux montants inhabituellement élevés, et aux schémas ne présentant pas de justification économique ou licite apparente.
3. Des seuils d'alerte sont définis par catégorie de compte ; toute opération dépassant ces seuils fait l'objet d'un examen approfondi.
4. Les comptes classés à risque élevé font l'objet d'une surveillance renforcée, tenant compte du pays d'origine, de l'origine des fonds et du type d'opérations concernées.
5. La revue de la classification du risque des comptes est réalisée à une fréquence au moins semestrielle, en coordination avec la procédure AML-001.`,
  },
  {
    id: "AML-003",
    title: "Escalade des Activités Suspectes et Déclaration de Soupçon",
    domain: ["AML/CFT"],
    version: "1.5",
    effective_date: "2023-06-01",
    owner: "IA Bank - Responsable Conformité (RCCI)",
    text: `1. Toute opération suspectée de constituer le produit d'une infraction, ou de participer au financement du terrorisme, fait l'objet d'une déclaration de soupçon (DS) auprès de Tracfin.
2. L'alerte est initialement analysée par l'agence ou le service concerné, puis transmise au Responsable de la Conformité pour décision finale sur l'opportunité de déclarer.
3. La procédure de déclaration est confidentielle : aucune information relative à l'existence ou au contenu d'une déclaration de soupçon ne doit être communiquée au client concerné.
4. Un registre des alertes traitées, incluant la décision motivée de déclarer ou non, est conservé conformément aux règles de conservation documentaire en vigueur.`,
  },
  {
    id: "SAN-001",
    title: "Filtrage Sanctions et Personnes Politiquement Exposées",
    domain: ["Sanctions"],
    version: "2.0",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. La Banque met à jour, sur une base au moins quotidienne, la liste consolidée des personnes et entités faisant l'objet de mesures de gel des avoirs.
2. Avant toute ouverture de compte, il est vérifié que l'identité du client ne figure pas sur ces listes. L'ensemble du portefeuille de comptes existants fait l'objet d'un criblage périodique contre ces mêmes listes.
3. Toute correspondance identifiée entre un client et une personne ou entité listée est immédiatement signalée au Responsable de la Conformité et, le cas échéant, aux autorités compétentes.
4. La Banque applique des mesures de vigilance renforcée aux clients identifiés comme Personnes Politiquement Exposées (PPE) de nationalité étrangère, incluant la détermination de l'origine du patrimoine et l'approbation de la direction avant l'entrée en relation.`,
  },
  {
    id: "CORR-001",
    title: "Relations de Correspondant Bancaire",
    domain: ["AML/CFT"],
    version: "1.3",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité",
    text: `1. Toute relation de correspondant bancaire est établie après collecte d'informations suffisantes sur l'activité, la gouvernance et le niveau de conformité LCB-FT de la banque répondante.
2. Il est vérifié, sur la base d'informations publiquement disponibles, que la banque répondante n'a pas fait l'objet d'une enquête ou d'une mesure réglementaire liée au blanchiment de capitaux ou au financement du terrorisme.
3. La Banque n'établit aucune relation de correspondant avec une « banque fictive » (shell bank), c'est-à-dire une entité constituée dans un pays où elle n'a pas de présence physique et qui n'est affiliée à aucun groupe financier réglementé.
4. L'établissement d'une relation de correspondant bancaire est soumis à l'approbation du Conseil d'administration ou du comité de direction générale.`,
  },
  {
    id: "WT-001",
    title: "Virements Électroniques et Informations sur le Donneur d'Ordre",
    domain: ["AML/CFT"],
    version: "1.1",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction des Opérations",
    text: `1. La Banque veille à ce que les virements électroniques ne puissent être utilisés par des auteurs d'infractions pour transférer des fonds de manière anonyme.
2. La Banque se tient prête à fournir, sur demande des autorités compétentes, les informations de base relatives au donneur d'ordre d'un virement, aux fins d'enquête ou de poursuite.
3. Les informations relatives au donneur d'ordre collectées sont conservées conformément aux règles générales de conservation documentaire de la Banque.`,
  },
  {
    id: "CTRL-001",
    title: "Dispositif de Contrôle Interne KYC/AML",
    domain: ["Contrôle Interne"],
    version: "2.4",
    effective_date: "2023-06-01",
    owner: "IA Bank - Direction Conformité / Inspection Générale",
    text: `1. Le Conseil d'administration s'assure de la mise en place d'un dispositif KYC/LCB-FT effectif, incluant une supervision appropriée, une séparation des tâches, et un programme de formation continue du personnel.
2. Le Département Inspection réalise des contrôles indépendants de l'application des procédures KYC/AML au sein des agences et services.
3. Les anomalies constatées par les auditeurs internes ou permanents sont portées à la connaissance du Responsable de la Conformité.
4. Un bilan de conformité KYC/AML est présenté au Comité d'Audit du Conseil d'administration à une fréquence trimestrielle.
5. Le Responsable de la Conformité désigné assure la coordination de la mise en œuvre du dispositif KYC/AML. Le Dirigeant Effectif désigné est responsable de la conformité globale aux obligations légales et réglementaires applicables.`,
  },
];

export const procedures: readonly DocumentDetail[] = procedureSeeds.map(
  (seed) => ({
    document_id: seed.id,
    // Le titre ne répète pas l'identifiant : l'UI affiche déjà `document_id` à côté.
    title: seed.title,
    document_type: "INTERNAL_PROCEDURE",
    authority_or_owner: seed.owner,
    domain: seed.domain,
    language: "FR",
    version: seed.version,
    effective_date: seed.effective_date,
    status: "ANALYZED",
    extracted_text: seed.text,
  }),
);

/**
 * Projette un document complet sur la forme `DocumentMeta` attendue par les listes.
 * Le schéma du contrat retire `extracted_text` : une seule définition à maintenir.
 */
export function toMeta(document: DocumentDetail): DocumentMeta {
  return documentMetaSchema.parse(document);
}
