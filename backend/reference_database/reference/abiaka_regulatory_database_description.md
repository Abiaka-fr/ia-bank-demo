# Abiaka Regulatory Compliance Database Description

## 1. Overview

`abiaka_regulatory_demo.sqlite` is a prototype database for a regulatory and compliance management system.

The schema is centered around:

- Regulatory documents
- Document versions
- Document chunks
- Regulatory requirements
- Internal procedures
- Procedure versions
- Controls
- Requirement-to-procedure mappings
- Audit history
- Official public regulatory sources

The main business flow is:

```text
Official Public Source
        ↓
Regulatory Document
        ↓
Document Version
        ↓
Document Chunks
        ↓
Regulatory Requirement
        ↓
Requirement ↔ Procedure Mapping
        ↓
Internal Procedure
        ↓
Procedure Version
        ↓
Control
```

The database currently uses SQLite and does not declare formal foreign-key constraints, but relationships can be inferred from ID fields.

---

## 2. Table Descriptions

### 2.1 `documents`

**Purpose:**  
Central registry of logical documents managed by the compliance system.

A document represents the logical identity of a regulatory or internal document, independently of its individual versions.

**Examples:**

- EU AML/CFT regulation
- EBA KYC guidelines
- DORA requirements
- CNIL guidance
- Internal compliance policies/procedures

**Key fields:**

| Field | Description |
|---|---|
| `document_id` | Unique identifier of the document |
| `title` | Document title |
| `category` | Document category |
| `document_type` | Type of document |
| `origin_code` | Code of the originating authority |
| `origin_name` | Name of the originating authority |
| `domain` | Compliance domain |
| `language` | Document language |
| `current_version` | Current version number |
| `current_file_path` | Location of the current file |
| `data_classification` | Data/document classification |
| `created_at` | Creation timestamp |

**Relationships:**

- One `document` can have many `document_versions`.
- One `document` can have many `document_chunks`.
- One `document` can be the source of many `regulatory_requirements`.
- One `document` can have many `audit_history` records.

---

### 2.2 `document_versions`

**Purpose:**  
Stores the version history of documents.

A single logical document can have multiple versions over time.

Example:

```text
Document: EU AML Regulation
├── Version 1.0 → SUPERSEDED
├── Version 2.0 → SUPERSEDED
└── Version 3.0 → ACTIVE
```

**Key fields:**

| Field | Description |
|---|---|
| `version_id` | Unique version identifier |
| `document_id` | Parent document |
| `version_no` | Version number |
| `version_timestamp` | Version creation/effective timestamp |
| `status` | Version status |
| `file_path` | File for this version |
| `sha256` | File integrity hash |
| `created_by` | User/system that created the version |
| `change_reason` | Reason for the new version |

**Relationship:**

```text
documents (1) ─────── (N) document_versions
```

---

### 2.3 `document_chunks`

**Purpose:**  
Stores extracted sections/chunks of documents.

This table is particularly important for search and future semantic-search functionality.

A large document is divided into smaller chunks:

```text
Regulatory Document
├── Chunk 1
├── Chunk 2
├── Chunk 3
├── ...
└── Chunk N
```

Each chunk can preserve its document and version context.

**Key fields:**

| Field | Description |
|---|---|
| `chunk_id` | Unique chunk identifier |
| `document_id` | Parent document |
| `version_id` | Specific document version |
| `chunk_no` | Chunk sequence number |
| `section_title` | Section/heading |
| `content` | Extracted text |
| `language` | Language |
| `domain` | Compliance domain |

**Relationships:**

```text
documents (1) ─────── (N) document_chunks

document_versions (1) ─────── (N) document_chunks
```

For PostgreSQL, this table is the natural location for an embedding column such as:

```sql
embedding vector(1536)
```

when using `pgvector`.

---

### 2.4 `regulatory_requirements`

**Purpose:**  
Represents individual regulatory obligations extracted from regulatory documents.

Instead of treating a regulation as one large document, this table structures the document into actionable requirements.

Example:

```text
Requirement:
Banks must identify and verify customers.
```

**Key fields:**

| Field | Description |
|---|---|
| `requirement_id` | Unique requirement identifier |
| `source_document_id` | Source regulatory document |
| `title` | Requirement title |
| `domain` | Compliance domain |
| `language` | Requirement language |
| `requirement_text` | Actual regulatory obligation |
| `risk_level` | Requirement risk level |
| `source_reference` | Article/section/reference |
| `status` | Requirement status |

**Relationship:**

```text
documents (1) ─────── (N) regulatory_requirements
```

Each requirement originates from a regulatory document.

---

### 2.5 `procedures`

**Purpose:**  
Represents internal policies/procedures used by the organization to implement compliance requirements.

Examples:

- Customer Due Diligence and KYC Policy
- Customer Onboarding Procedure
- Periodic KYC Review Procedure
- AML Monitoring Procedure

**Key fields:**

| Field | Description |
|---|---|
| `procedure_id` | Unique procedure identifier |
| `document_id` | Related document |
| `name` | Procedure name |
| `domain` | Compliance domain |
| `owner` | Responsible owner |
| `status` | Procedure status |
| `current_version` | Current version |

**Relationship:**

Conceptually:

```text
documents (1) ─────── (N) procedures
```

The relationship is represented through `document_id`.

---

### 2.6 `procedure_versions`

**Purpose:**  
Stores versions of internal procedures.

Example:

```text
Customer Due Diligence Policy
├── Version 1.0 → SUPERSEDED
├── Version 2.0 → SUPERSEDED
└── Version 3.0 → ACTIVE
```

**Key fields:**

| Field | Description |
|---|---|
| `procedure_version_id` | Unique procedure-version identifier |
| `procedure_id` | Parent procedure |
| `version_no` | Version number |
| `version_timestamp` | Version timestamp |
| `status` | Version status |
| `document_version_id` | Related document version |

**Relationships:**

```text
procedures (1) ─────── (N) procedure_versions

document_versions (1) ─────── (N) procedure_versions
```

This makes it possible to determine which document version represents a particular procedure version.

---

### 2.7 `controls`

**Purpose:**  
Represents compliance controls implemented by the organization.

A control translates a compliance requirement or procedure into an operational mechanism that can be performed, monitored, and tested.

Example:

```text
Control:
High-risk customers require enhanced due diligence approval.
```

**Key fields:**

| Field | Description |
|---|---|
| `control_id` | Unique control identifier |
| `document_id` | Associated document |
| `name` | Control name |
| `domain` | Compliance domain |
| `frequency` | Control frequency |
| `owner` | Control owner |
| `status` | Control status |

**Relationship:**

```text
documents (1) ─────── (N) controls
```

The current schema does not provide a direct, explicit requirement-to-control mapping. A production system should consider adding this relationship.

---

### 2.8 `requirement_procedure_map`

**Purpose:**  
Maps regulatory requirements to internal procedures.

This is the central table for regulatory gap analysis.

It answers:

> Which internal procedure addresses this regulatory requirement?

It also stores the result of the assessment.

**Key fields:**

| Field | Description |
|---|---|
| `mapping_id` | Unique mapping identifier |
| `requirement_id` | Regulatory requirement |
| `procedure_id` | Internal procedure |
| `assessment` | Coverage assessment |
| `confidence` | Assessment confidence |
| `explanation` | Reason for assessment |
| `recommended_action` | Recommended remediation |
| `human_status` | Human review status |

**Typical assessments:**

```text
COVERED
PARTIALLY_COVERED
POTENTIAL_GAP
HUMAN_REVIEW
```

**Relationship:**

This is a many-to-many relationship:

```text
regulatory_requirements
        N
        │
        │
        ▼
requirement_procedure_map
        ▲
        │
        │
        N
procedures
```

One requirement can be addressed by multiple procedures, and one procedure can address multiple requirements.

---

### 2.9 `audit_history`

**Purpose:**  
Records document-related events and changes for traceability.

Example:

```text
Document
├── Version 1
│   └── CREATED
│
└── Version 2
    ├── CREATED
    └── ACTIVATED
```

**Key fields:**

| Field | Description |
|---|---|
| `audit_id` | Unique audit event identifier |
| `document_id` | Related document |
| `version_id` | Related document version |
| `event_timestamp` | Event timestamp |
| `event_type` | Type of event |
| `actor` | User/system performing the event |
| `details` | Additional event information |

**Relationships:**

```text
documents (1) ─────── (N) audit_history

document_versions (1) ─────── (N) audit_history
```

For a production compliance platform, audit logging should generally be expanded beyond documents to cover all important entities.

---

### 2.10 `official_public_sources`

**Purpose:**  
Stores references to official regulatory/public sources.

Examples include regulatory authorities and official publication sources such as:

- ACPR
- EBA
- TRACFIN

The table allows the system to maintain the authoritative source from which regulatory content originates.

**Key fields:**

| Field | Description |
|---|---|
| `source_id` | Unique source identifier |
| `authority` | Regulatory authority |
| `jurisdiction` | Country/region |
| `domain` | Regulatory domain |
| `title` | Source title |
| `document_type` | Publication type |
| `language` | Language |
| `publication_date` | Publication date |
| `status` | Source status |
| `source_url` | Official source URL |
| `direct_url` | Direct document URL |
| `local_status` | Local storage status |
| `demo_use` | Demo/system usage |
| `excerpt` | Relevant excerpt/summary |

**Current relationship:**

There is no explicit foreign-key relationship from this table to `documents`.

**Recommended conceptual relationship:**

```text
official_public_sources
          │
          │ source/reference
          ▼
      documents
          │
          ▼
regulatory_requirements
```

This would allow the system to distinguish between the authoritative public source and the locally managed document/version.

---

# 3. Main Relationships

## 3.1 Document → Document Version

```text
documents
    1
    │
    └──────── N document_versions
```

One document can have many versions.

---

## 3.2 Document → Document Chunk

```text
documents
    1
    │
    └──────── N document_chunks
```

A document is divided into multiple searchable chunks.

---

## 3.3 Document Version → Document Chunk

```text
document_versions
    1
    │
    └──────── N document_chunks
```

Each chunk belongs to a specific document version.

This is important for regulatory traceability because the text used for an analysis must be tied to the correct version.

---

## 3.4 Document → Regulatory Requirement

```text
documents
    1
    │
    └──────── N regulatory_requirements
```

A regulatory document can contain many requirements.

---

## 3.5 Requirement ↔ Procedure

```text
regulatory_requirements
        N
        │
        ▼
requirement_procedure_map
        ▲
        │
        N
procedures
```

This is a many-to-many relationship.

The mapping contains the result of compliance coverage analysis.

---

## 3.6 Procedure → Procedure Version

```text
procedures
    1
    │
    └──────── N procedure_versions
```

A procedure can have multiple versions.

---

## 3.7 Procedure Version → Document Version

```text
procedure_versions
        N
        │
        ▼
document_versions
```

A procedure version can reference the document version that represents its content.

---

## 3.8 Document → Control

```text
documents
    1
    │
    └──────── N controls
```

Controls can be associated with documents, although the current model would benefit from more explicit compliance relationships.

---

## 3.9 Document → Audit History

```text
documents
    1
    │
    └──────── N audit_history
```

A document can have many audit events.

---

# 4. Complete Conceptual Model

```text
                         ┌──────────────────────────┐
                         │ official_public_sources  │
                         │                          │
                         │ Authority                │
                         │ Jurisdiction             │
                         │ Source URL               │
                         └────────────┬─────────────┘
                                      │
                                      │ source
                                      ▼
                         ┌──────────────────────────┐
                         │        documents         │
                         │                          │
                         │ Document metadata        │
                         │ Source                  │
                         │ Domain                  │
                         │ Current version         │
                         └──────┬─────────┬─────────┘
                                │         │
                     1:N        │         │ 1:N
                                ▼         ▼
                    ┌──────────────┐  ┌────────────────┐
                    │ document_    │  │ document_      │
                    │ versions     │  │ chunks         │
                    └──────┬───────┘  └───────┬────────┘
                           │                  │
                           │                  │
                           ▼                  ▼
                    ┌────────────────────────────────┐
                    │    regulatory_requirements     │
                    │                                │
                    │ Regulatory obligation          │
                    │ Source reference               │
                    │ Risk level                     │
                    └───────────────┬────────────────┘
                                    │
                                    │ N:M
                                    ▼
                    ┌────────────────────────────────┐
                    │  requirement_procedure_map     │
                    │                                │
                    │ Coverage assessment            │
                    │ Confidence                     │
                    │ Explanation                    │
                    │ Recommended action             │
                    └───────────────┬────────────────┘
                                    │
                                    │ N:M
                                    ▼
                         ┌──────────────────────┐
                         │      procedures      │
                         │                      │
                         │ Internal process     │
                         │ Owner                │
                         │ Status               │
                         └──────────┬───────────┘
                                    │
                                    │ 1:N
                                    ▼
                         ┌──────────────────────┐
                         │ procedure_versions   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ document_versions    │
                         └──────────────────────┘


                         ┌──────────────────────┐
                         │      controls        │
                         │                      │
                         │ Control               │
                         │ Owner                 │
                         │ Frequency             │
                         └──────────────────────┘

                         ┌──────────────────────┐
                         │    audit_history     │
                         │                      │
                         │ Event                 │
                         │ Actor                 │
                         │ Timestamp             │
                         └──────────────────────┘
```

---

# 5. Compliance Business Flow

The database supports the following workflow:

```text
1. Discover official regulatory source
                    ↓
2. Store regulatory document
                    ↓
3. Create document versions
                    ↓
4. Extract and chunk document content
                    ↓
5. Identify regulatory requirements
                    ↓
6. Map requirements to internal procedures
                    ↓
7. Assess coverage
                    ↓
8. Identify potential compliance gaps
                    ↓
9. Recommend remediation
```

The current schema is therefore primarily focused on **regulatory document management and requirement-to-procedure gap analysis**.

---

# 6. Recommended Extensions for a Production Compliance Management System

The current schema is a useful foundation, but a full compliance-management platform should extend it with:

```text
Regulatory Requirement
        ↓
Applicability Assessment
        ↓
Policy
        ↓
Procedure
        ↓
Control
        ↓
Control Execution
        ↓
Evidence
        ↓
Testing / Monitoring
        ↓
Finding
        ↓
Corrective Action
        ↓
Verification
        ↓
Management / Board Reporting
```

Recommended additional tables:

```text
organizations
business_units
users
roles
permissions

applicability_assessments

policies
policy_versions

control_requirements
control_versions
control_owners

compliance_activities
evidence
evidence_versions

control_tests
monitoring_results

findings
corrective_actions
verification_results

risks
risk_assessments

workflow_instances
workflow_history

notifications
audit_logs
```

For PostgreSQL, `document_chunks` can additionally use `pgvector`:

```sql
embedding vector(1536)
```

with an HNSW or IVFFlat index to support semantic search.

This would allow the platform to combine:

```text
Keyword Search
      +
Semantic Search
      +
Structured Compliance Relationships
      +
AI-assisted Gap Analysis
```

which is a strong architecture for a modern regulatory compliance management system.
