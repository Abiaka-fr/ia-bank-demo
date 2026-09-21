# Database Description

This document describes the complete PostgreSQL schema for the IA Bank Regulatory AI Copilot POC.

**Last Updated:** 2026-09-21  
**Total Tables:** 11  
**Total Relationships:** 12

---

## Table of Contents

1. [Core Tables](#core-tables)
2. [User & Access Tables](#user--access-tables)
3. [Versioning Tables](#versioning-tables)
4. [Mapping & Analysis Tables](#mapping--analysis-tables)
5. [Audit & Reference Tables](#audit--reference-tables)
6. [Table Relationships](#table-relationships)

---

## Core Tables

### 1. documents
**Primary Key:** `document_id` (String)

Represents regulatory or internal documents.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| document_id | String | ✗ | - | PK; e.g., "EXT-EU-AML-001", "INT-PROC-AML" |
| title | String | ✗ | - | Document title |
| category | String | ✓ | NULL | EXTERNAL, INTERNAL, CONTROL |
| document_type | String | ✓ | NULL | REGULATORY_STANDARD, GUIDELINE, PROCEDURE, POLICY, etc. |
| origin_code | String | ✓ | NULL | e.g., "EU", "FR", "ACPR" |
| origin_name | String | ✓ | NULL | e.g., "European Union", "ACPR" |
| domain | String | ✓ | NULL | e.g., "AML/CFT", "KYC", "DATA_PROTECTION", "MIFID" |
| language | String | ✓ | NULL | EN, FR |
| summary | String (Text) | ✓ | NULL | Document summary/abstract |
| current_version | String | ✓ | NULL | Current version number as string; e.g., "2.0" |
| current_file_path | String | ✓ | NULL | File path; e.g., "documents/external/EXT-EU-AML-001__v2_0__EN.md" |
| data_classification | String | ✓ | NULL | e.g., SYNTHETIC_DEMO, CONCERNING_CUSTOMER, PUBLIC |
| created_at | DateTime | ✗ | now() | Immutable creation timestamp |
| updated_at | DateTime | ✗ | now() | Auto-updates on change |
| published_at | DateTime | ✓ | NULL | When document was published |
| assignee | String | ✓ | NULL | User ID or email responsible for document (soft reference to users) |

**Indexes:**
- None explicitly defined (PK indexed by default)

**Relationships:**
- ← versions (DocumentVersion, cascade delete)
- ← chunks (DocumentChunk, cascade delete)
- ← requirements (RegulatoryRequirement, cascade delete)
- ← procedures (Procedure, cascade delete)
- ← controls (Control, cascade delete)
- ← audit_history (AuditHistory, cascade delete)

---

### 2. regulatory_requirements
**Primary Key:** `requirement_id` (String)

Represents regulatory requirements extracted from documents.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| requirement_id | String | ✗ | - | PK; e.g., "REQ-AML-001" |
| source_document_id | String | ✗ | - | FK → documents.document_id (CASCADE) |
| title | String | ✓ | NULL | English requirement title |
| title_lang_fr | String | ✓ | NULL | French requirement title |
| domain | String | ✓ | NULL | e.g., "AML/CFT", "KYC" |
| language | String | ✓ | NULL | EN, FR |
| requirement_text | String (Text) | ✓ | NULL | English requirement text |
| requirement_text_lang_fr | String (Text) | ✓ | NULL | French requirement text |
| risk_level | String | ✓ | NULL | LOW, MEDIUM, HIGH |
| source_reference | String | ✓ | NULL | e.g., "Article 5", "Section 2.1" |
| status | String | ✓ | NULL | ACTIVE, SUPERSEDED, etc. |
| created_at | DateTime | ✗ | now() | Creation timestamp |
| updated_at | DateTime | ✗ | now() | Auto-updates on change |

**Indexes:**
- idx_regulatory_requirements_source_document_id (source_document_id)

**Relationships:**
- → document (Document, back_populates)
- ← mappings (RequirementProcedureMap, cascade delete)

---

### 3. procedures
**Primary Key:** `procedure_id` (String)

Represents internal procedures/policies.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| procedure_id | String | ✗ | - | PK; e.g., "PRC-AML-007" |
| document_id | String | ✗ | - | FK → documents.document_id (CASCADE) |
| name | String | ✓ | NULL | Procedure name |
| domain | String | ✓ | NULL | e.g., "AML/CFT", "KYC" |
| owner | String | ✓ | NULL | Owner/responsible team |
| status | String | ✓ | NULL | ACTIVE, SUPERSEDED, etc. |
| current_version | String | ✓ | NULL | Current version number |
| created_at | DateTime | ✗ | now() | Creation timestamp |
| updated_at | DateTime | ✗ | now() | Auto-updates on change |

**Indexes:**
- idx_procedures_document_id (document_id)

**Relationships:**
- → document (Document, back_populates)
- ← versions (ProcedureVersion, cascade delete)
- ← mappings (RequirementProcedureMap, cascade delete)

---

### 4. controls
**Primary Key:** `control_id` (String)

Represents compliance controls.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| control_id | String | ✗ | - | PK; e.g., "CTL-AML-001" |
| document_id | String | ✗ | - | FK → documents.document_id (CASCADE) |
| name | String | ✓ | NULL | Control name |
| domain | String | ✓ | NULL | e.g., "AML/CFT", "KYC" |
| frequency | String | ✓ | NULL | Daily, Weekly, Monthly, etc. |
| owner | String | ✓ | NULL | Control owner |
| status | String | ✓ | NULL | ACTIVE, SUPERSEDED, etc. |

**Indexes:**
- idx_controls_document_id (document_id)

**Relationships:**
- → document (Document, back_populates)

---

## User & Access Tables

### 5. users
**Primary Key:** `user_id` (String)

Application users (e.g., Compliance Officers).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| user_id | String | ✗ | _generate_user_id() | PK; format "USR-{uuid}" |
| email | String | ✗ | - | Unique; user login email |
| hashed_password | String | ✗ | - | Bcrypt-hashed password |
| full_name | String | ✓ | NULL | User's full name |
| role | String | ✗ | "COMPLIANCE_OFFICER" | COMPLIANCE_OFFICER, ANALYST, ADMIN, etc. |
| is_active | Boolean | ✗ | True | Account active status |
| created_at | DateTime | ✗ | now() | Account creation timestamp |
| updated_at | DateTime | ✗ | now() | Auto-updates on change |

**Indexes:**
- email (UNIQUE)

**Relationships:**
- None (reference in mappings.assignee is via string, not FK)

---

## Versioning Tables

### 6. document_versions
**Primary Key:** `version_id` (String)

Tracks document version history.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| version_id | String | ✗ | - | PK; e.g., "VER-DOC-001-v1" |
| document_id | String | ✗ | - | FK → documents.document_id (CASCADE) |
| version_no | String | ✓ | NULL | e.g., "1.0", "2.0" |
| version_timestamp | DateTime | ✓ | NULL | When version was created |
| status | String | ✓ | NULL | ACTIVE, SUPERSEDED |
| file_path | String | ✓ | NULL | Path to version file |
| sha256 | String | ✓ | NULL | SHA256 hash of content |
| created_by | String | ✓ | NULL | User email/id who created |
| change_reason | String | ✓ | NULL | Reason for change |

**Indexes:**
- idx_document_versions_document_id (document_id)

**Relationships:**
- → document (Document, back_populates)
- ← chunks (DocumentChunk, cascade delete)
- ← procedure_versions (ProcedureVersion, cascade delete)
- ← audit_history (AuditHistory, cascade delete)

---

### 7. document_chunks
**Primary Key:** `chunk_id` (String)

Represents sections/chunks of a document.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| chunk_id | String | ✗ | - | PK; e.g., "CHUNK-DOC-001-001" |
| document_id | String | ✗ | - | FK → documents.document_id (CASCADE) |
| version_id | String | ✗ | - | FK → document_versions.version_id (CASCADE) |
| chunk_no | Integer | ✓ | NULL | Chunk sequence number |
| section_title | String | ✓ | NULL | Section title |
| content | String (Text) | ✓ | NULL | Chunk content |
| language | String | ✓ | NULL | EN, FR |
| domain | String | ✓ | NULL | e.g., "AML/CFT" |

**Indexes:**
- idx_document_chunks_document_id (document_id)
- idx_document_chunks_version_id (version_id)

**Relationships:**
- → document (Document, back_populates)
- → version (DocumentVersion, back_populates)

---

### 8. procedure_versions
**Primary Key:** `procedure_version_id` (String)

Tracks procedure version history.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| procedure_version_id | String | ✗ | - | PK |
| procedure_id | String | ✗ | - | FK → procedures.procedure_id (CASCADE) |
| version_no | String | ✓ | NULL | e.g., "1.0", "2.0" |
| version_timestamp | DateTime | ✓ | NULL | When version was created |
| status | String | ✓ | NULL | ACTIVE, SUPERSEDED |
| document_version_id | String | ✓ | - | FK → document_versions.version_id (SET NULL) |

**Indexes:**
- idx_procedure_versions_procedure_id (procedure_id)
- idx_procedure_versions_document_version_id (document_version_id)

**Relationships:**
- → procedure (Procedure, back_populates)
- → document_version (DocumentVersion, back_populates)

---

## Mapping & Analysis Tables

### 9. requirement_procedure_map
**Primary Key:** `mapping_id` (String)

Gap analysis: maps requirements to procedures (CRITICAL for compliance assessment).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| mapping_id | String | ✗ | - | PK; e.g., "MAP-0001" |
| requirement_id | String | ✗ | - | FK → regulatory_requirements.requirement_id (CASCADE) |
| procedure_id | String | ✗ | - | FK → procedures.procedure_id (CASCADE) |
| assessment | String | ✓ | NULL | COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW |
| confidence | Float | ✓ | NULL | 0.0 – 1.0 confidence score |
| explanation | String (Text) | ✓ | NULL | English explanation of mapping |
| recommended_action | String (Text) | ✓ | NULL | English recommended action |
| explanation_lang_fr | String (Text) | ✓ | NULL | French explanation |
| recommended_action_lang_fr | String (Text) | ✓ | NULL | French recommended action |
| human_status | String | ✓ | NULL | PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED |
| suggested_modifications | JSON | ✓ | NULL | Array of suggested text modifications (see structure below) |

**Suggested Modifications Schema:**
Each modification in the array has this structure:
```json
{
  "location": {
    "chunk_no": number,
    "start_offset": number,
    "end_offset": number
  },
  "original_text": string,
  "new_text": string
}
```
- `location`: Position of the text in the document (chunk number and byte offsets)
- `original_text`: Current text that needs modification
- `new_text`: Proposed replacement text

**Indexes:**
- idx_requirement_procedure_map_requirement_id (requirement_id)
- idx_requirement_procedure_map_procedure_id (procedure_id)

**Relationships:**
- → requirement (RegulatoryRequirement, back_populates)
- → procedure (Procedure, back_populates)

---

### 9b. mapping_history
**Primary Key:** `history_id` (String)

One row per human decision on a mapping (`PUT /api/mappings/{id}/human-status`), read with
`GET /api/mappings/history?requirement_ids=...`. No foreign keys: history outlives renamed or
deleted mappings.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| history_id | String | ✗ | `MHI-{uuid hex}` | PK |
| mapping_id | String | ✗ | - | Mapping the decision was made on |
| requirement_id | String | ✗ | - | Copied from the mapping: all history of a requirement in one indexed query |
| procedure_id | String | ✓ | NULL | Procedure document_id, as on the mapping |
| from_status | String | ✓ | NULL | human_status before the decision |
| to_status | String | ✗ | - | PENDING_REVIEW, ACCEPT, REJECT, ESCALATE |
| assignee | String | ✓ | NULL | ESCALATE only: user_id or email escalated to |
| new_version_id | String | ✓ | NULL | ACCEPT only: procedure version created by applying the suggested modifications |
| comment | Text | ✓ | NULL | Reviewer's chosen action ("Action chosen by the reviewer") |
| actor | String | ✓ | NULL | user_id who made the decision |
| created_at | DateTime | ✓ | now() | |

**Indexes:**
- idx_mapping_history_requirement_id (requirement_id)
- idx_mapping_history_mapping_id (mapping_id)

---

## Audit & Reference Tables

### 10. audit_history
**Primary Key:** `audit_id` (String)

Records all document and version changes for audit trail.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| audit_id | String | ✗ | - | PK; e.g., "AUD-0001" |
| document_id | String | ✗ | - | FK → documents.document_id (CASCADE) |
| version_id | String | ✓ | - | FK → document_versions.version_id (SET NULL) |
| event_timestamp | DateTime | ✗ | now() | When event occurred |
| event_type | String | ✓ | NULL | CREATED, UPDATED, ACTIVATED, DELETED, etc. |
| actor | String | ✓ | NULL | User email/id who triggered event |
| details | String (Text) | ✓ | NULL | Free-text details of change |

**Indexes:**
- idx_audit_history_document_id (document_id)
- idx_audit_history_version_id (version_id)

**Relationships:**
- → document (Document, back_populates)
- → version (DocumentVersion, back_populates)

---

### 11. official_public_sources
**Primary Key:** `source_id` (String)

Stores references to official regulatory/public sources (metadata only, no FK to documents).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| source_id | String | ✗ | - | PK; e.g., "SRC-ACPR-001" |
| authority | String | ✓ | NULL | ACPR, EBA, TRACFIN, etc. |
| jurisdiction | String | ✓ | NULL | FR, EU, International, etc. |
| domain | String | ✓ | NULL | e.g., "AML/CFT", "KYC" |
| title | String | ✓ | NULL | Source title |
| document_type | String | ✓ | NULL | REGULATION, GUIDELINE, INSTRUCTION, etc. |
| language | String | ✓ | NULL | EN, FR |
| publication_date | DateTime | ✓ | NULL | Official publication date |
| status | String | ✓ | NULL | ACTIVE, SUPERSEDED, ARCHIVED |
| source_url | String | ✓ | NULL | Official source URL |
| direct_url | String | ✓ | NULL | Direct link to document |
| local_status | String | ✓ | NULL | DOWNLOADED, PENDING, etc. |
| demo_use | String | ✓ | NULL | Y/N — for demo corpus use |
| excerpt | String (Text) | ✓ | NULL | Relevant excerpt/summary |

**Indexes:**
- None explicitly defined

**Relationships:**
- None (intentional; no reliable mapping in source data)

---

## Table Relationships

### ER Diagram (Text Representation)

```
┌─────────────────────────────┐
│       documents (PK)        │
│  document_id (String)       │
│  title, category, domain... │
│  created_at, updated_at...  │
└──────────────┬──────────────┘
         │ (1:N)
    ┌────┴─────────────┬───────────────┬──────────────┐
    │                  │               │              │
┌───▼──────────┐  ┌────▼─────┐  ┌────▼────┐  ┌────▼────┐
│doc_versions  │  │reqs      │  │procs    │  │controls │
│(N:1)         │  │(N:1)     │  │(N:1)    │  │(N:1)    │
└───┬──────────┘  └────┬─────┘  └────┬────┘  └────┬────┘
    │ (1:N)            │             │            │
    │                  │             │            │
┌───▼──────────────────▼─────────────▼────────────▼────┐
│  requirement_procedure_map  (N:N via composite FK)   │
│  - requirement_id ──→ regulatory_requirements        │
│  - procedure_id ───→ procedures                      │
│  - assessment, confidence, human_status             │
└────────────────────────────────────────────────────┘

Doc_chunks:
┌──────────────────┐
│ document_chunks  │
│ document_id ──→  │
│ version_id ───→  │  document_versions
└──────────────────┘

Procedure_versions:
┌──────────────────────┐
│ procedure_versions   │
│ procedure_id ──────→ procedures
│ document_version_id→ document_versions (SET NULL)
└──────────────────────┘

Audit_history:
┌──────────────────┐
│ audit_history    │
│ document_id ───→ │
│ version_id ────→ │  (can be NULL)
└──────────────────┘

Users:
┌─────────────────────────────┐
│       users (PK)            │
│  user_id, email, role...    │
└─────────────────────────────┘

Official_public_sources:
┌─────────────────────────────┐
│ official_public_sources     │
│ (standalone, no FK)         │
└─────────────────────────────┘
```

---

## Column Naming Conventions

| Pattern | Meaning | Examples |
|---------|---------|----------|
| `*_id` | Primary key or foreign key identifier | document_id, requirement_id |
| `*_lang_fr` | French language variant | title_lang_fr, requirement_text_lang_fr |
| `created_at` | Immutable creation timestamp | documents.created_at |
| `updated_at` | Auto-updating modification timestamp | procedures.updated_at |
| `published_at` | Optional publication timestamp | documents.published_at |
| `*_status` | State of entity | human_status, document_status |

---

## Foreign Key Relationships Summary

| Source Table | Source Column | Target Table | Target Column | On Delete |
|--------------|---------------|--------------|---------------|-----------|
| regulatory_requirements | source_document_id | documents | document_id | CASCADE |
| procedures | document_id | documents | document_id | CASCADE |
| procedure_versions | procedure_id | procedures | procedure_id | CASCADE |
| procedure_versions | document_version_id | document_versions | version_id | SET NULL |
| document_versions | document_id | documents | document_id | CASCADE |
| document_chunks | document_id | documents | document_id | CASCADE |
| document_chunks | version_id | document_versions | version_id | CASCADE |
| controls | document_id | documents | document_id | CASCADE |
| audit_history | document_id | documents | document_id | CASCADE |
| audit_history | version_id | document_versions | version_id | SET NULL |
| requirement_procedure_map | requirement_id | regulatory_requirements | requirement_id | CASCADE |
| requirement_procedure_map | procedure_id | procedures | procedure_id | CASCADE |

---

## Notes

1. **Soft Foreign Keys:** 
   - `documents.assignee` and other assignee fields are NOT formal FKs to `users.user_id` — stored as strings (email or user_id) for flexibility.
   - These represent soft references to users and are validated at the application level, not the database level.

2. **Language Support:** Multi-language support is via `_lang_fr` column suffix convention (e.g., `title_lang_fr`, `requirement_text_lang_fr`).

3. **Cascade Deletes:** Most relationships cascade delete for data consistency. `SET NULL` is used for optional version references.

4. **Indexes:** Strategic indexes on foreign keys and frequently-queried columns improve query performance.

5. **Timestamps:** 
   - `created_at` — immutable, set once at creation
   - `updated_at` — auto-updated by SQLAlchemy on every change
   - `published_at` — optional, manually set when document is published

6. **Enum Values (NOT enforced at DB level, app-side validation):**
   - **document.category:** EXTERNAL, INTERNAL, CONTROL
   - **regulatory_requirements.risk_level:** LOW, MEDIUM, HIGH
   - **requirement_procedure_map.assessment:** COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW
   - **requirement_procedure_map.human_status:** PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED
   - **users.role:** COMPLIANCE_OFFICER, ANALYST, ADMIN

---

## Migration History

Migrations are tracked in `alembic/versions/`:
- **001:** Create initial schema
- **002:** (future)
- **003:** Add assignee + convert version_no to string
- **004:** Add explanation_lang_fr, recommended_action_lang_fr
- **005:** Add requirement_text_lang_fr
- **006:** Add title_lang_fr
- **007:** Add created_at/updated_at to requirements & procedures
- **008:** Add summary & updated_at to documents
- **009:** Add updated_at to documents
- **010:** Add published_at to documents
- **2026-09-21:** Create `mapping_history` (created on Neon from the model with
  `MappingHistory.__table__.create(engine, checkfirst=True)`, no Alembic file)

Run `alembic upgrade head` to apply all migrations.
