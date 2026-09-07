# Backend API Documentation

## Base URL
`http://localhost:8000`

---

## Endpoints

### 1. Health Check

#### `GET /health`
Check database connectivity and server health.

**Response (200 OK)**
```json
{
  "status": "ok",
  "database": "connected"
}
```

**Response (500 on error)**
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "<error message>"
}
```

---

## 2. Documents

### List Documents with Filters

#### `GET /api/documents`
Get a paginated list of documents with optional filtering by category, domain, language, document type, or title search.

**Query Parameters (all optional)**
- `category` (string): Filter by category (EXTERNAL, INTERNAL, CONTROL)
- `domain` (string): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION, MIFID)
- `language` (string): Filter by language (EN, FR)
- `document_type` (string): Filter by document type (REGULATORY_STANDARD, GUIDELINE, PROCEDURE, SUPERVISORY_POSITION, REGULATION, GUIDANCE, POLICY, CONTROL_STANDARD)
- `title` (string): Search by title (case-insensitive partial match)
- `limit` (integer): Max results per page (default: 50, max: 200)
- `offset` (integer): Number of results to skip for pagination (default: 0)

**Authentication** Required (Bearer token)

**Request Examples**
```
GET /api/documents?domain=AML/CFT&language=FR
GET /api/documents?category=EXTERNAL&limit=100
GET /api/documents?title=KYC&offset=50
GET /api/documents?domain=MIFID&document_type=GUIDELINE&limit=20
```

**Response (200 OK)**
```json
{
  "total": 32,
  "items": [
    {
      "document_id": "EXT-EU-AML-001",
      "title": "EU AML/CFT Customer Due Diligence Demo Standard",
      "category": "EXTERNAL",
      "document_type": "REGULATORY_STANDARD",
      "origin_code": "EU",
      "origin_name": "European Union",
      "domain": "AML/CFT",
      "language": "EN",
      "current_version": "2.0",
      "current_file_path": "documents/external/EXT-EU-AML-001__v2_0__EN.md",
      "data_classification": "SYNTHETIC_DEMO",
      "created_at": "2024-03-25T09:00:00"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

**Response (401 Unauthorized)**
```json
{
  "detail": "Not authenticated"
}
```

---

### Get Document by ID

#### `GET /api/documents/{document_id}`
Retrieve a single document by its ID.

**Path Parameters**
- `document_id` (required): The ID of the document (e.g., EXT-EU-AML-001)

**Authentication** Required (Bearer token)

**Request Example**
```
GET /api/documents/EXT-EU-AML-001
```

**Response (200 OK)**
```json
{
  "document_id": "EXT-EU-AML-001",
  "title": "EU AML/CFT Customer Due Diligence Demo Standard",
  "category": "EXTERNAL",
  "document_type": "REGULATORY_STANDARD",
  "origin_code": "EU",
  "origin_name": "European Union",
  "domain": "AML/CFT",
  "language": "EN",
  "current_version": "2.0",
  "current_file_path": "documents/external/EXT-EU-AML-001__v2_0__EN.md",
  "data_classification": "SYNTHETIC_DEMO",
  "created_at": "2024-03-25T09:00:00"
}
```

**Response (404 Not Found)**
```json
{
  "detail": "Document not found"
}
```

---

### Update Document Content & Create New Version

#### `POST /api/documents/{document_id}/update`
Update document content, create a new version, and auto-increment the version number. All chunks must be provided.

**Path Parameters**
- `document_id` (required): The ID of the document to update (e.g., EXT-EU-AML-001)

**Request Body**
- `change_reason` (required): Reason/description of the changes
- `created_by` (required): User or system that made the update  
- `file_path` (optional): Path to the updated document file (for audit trail reference)
- `chunks` (required): Array of document chunks with updated content

**Chunk Structure (each chunk requires):**
```json
{
  "chunk_no": 1,
  "section_title": "Document Header",
  "content": "# Document Content...",
  "language": "EN",
  "domain": "AML/CFT"
}
```

**Authentication** Required (Bearer token)

**Request Example**
```json
POST /api/documents/EXT-EU-AML-001/update
{
  "change_reason": "Updated KYC procedures for new regulatory requirements",
  "created_by": "compliance.officer@bank.com",
  "file_path": "documents/external/EXT-EU-AML-001__v3_0__EN.md",
  "chunks": [
    {
      "chunk_no": 1,
      "section_title": "Document Header",
      "content": "# EU AML/CFT Standard v3.0...",
      "language": "EN",
      "domain": "AML/CFT"
    },
    {
      "chunk_no": 2,
      "section_title": "Purpose and Scope",
      "content": "## Purpose...",
      "language": "EN",
      "domain": "AML/CFT"
    }
  ]
}
```

**Response (201 Created)**
```json
{
  "version_id": "VER-EXT-EU-AML-001-03",
  "document_id": "EXT-EU-AML-001",
  "version_no": "3.0",
  "status": "ACTIVE",
  "created_by": "compliance.officer@bank.com",
  "change_reason": "Updated KYC procedures for new regulatory requirements",
  "total_chunks": 2,
  "chunks": [
    {
      "chunk_id": "CHK-EXT-EU-AML-001-03-001",
      "document_id": "EXT-EU-AML-001",
      "version_id": "VER-EXT-EU-AML-001-03",
      "chunk_no": 1,
      "section_title": "Document Header",
      "content": "# EU AML/CFT Standard v3.0...",
      "language": "EN",
      "domain": "AML/CFT"
    },
    {
      "chunk_id": "CHK-EXT-EU-AML-001-03-002",
      "document_id": "EXT-EU-AML-001",
      "version_id": "VER-EXT-EU-AML-001-03",
      "chunk_no": 2,
      "section_title": "Purpose and Scope",
      "content": "## Purpose...",
      "language": "EN",
      "domain": "AML/CFT"
    }
  ]
}
```

**Response (400 Bad Request)**
```json
{
  "detail": "Chunks must be numbered sequentially starting from 1"
}
```

**Response (404 Not Found)**
```json
{
  "detail": "Document not found"
}
```

**Notes:**
- Version number is auto-incremented (e.g., 1.0 → 2.0 → 3.0)
- New version_id is generated automatically (VER-{doc_id}-{version_no_padded})
- New chunk_ids are generated (CHK-{doc_id}-{version_no}-{chunk_no_padded})
- All previous ACTIVE versions are marked as SUPERSEDED
- Document.current_version is updated to the new version
- Chunks must be numbered sequentially starting from 1
- All chunks from the previous version should be re-submitted (it's a full replacement)

---

### Get Document Content by Version ID

#### `GET /api/documents/content/{version_id}`
Retrieve all document content (chunks) for a specific document version, including version metadata and all text chunks.

**Path Parameters**
- `version_id` (required): The ID of the document version (e.g., VER-EXT-EU-AML-001-01)

**Authentication** Required (Bearer token)

**Request Example**
```
GET /api/documents/content/VER-EXT-EU-AML-001-01
```

**Response (200 OK)**
```json
{
  "version": {
    "version_id": "VER-EXT-EU-AML-001-01",
    "document_id": "EXT-EU-AML-001",
    "version_no": "1.0",
    "version_timestamp": "2024-03-26T19:07:00",
    "status": "SUPERSEDED",
    "file_path": "documents/external/EXT-EU-AML-001__v1_0__EN.md",
    "sha256": "cfd5c2f9711afbc02ce904cea36f2825db6d374cf1bec234ca4889488ffd1162",
    "created_by": "demo.system",
    "change_reason": "Version 1.0 controlled update"
  },
  "chunks": [
    {
      "chunk_id": "CHK-EXT-EU-AML-001-01-001",
      "document_id": "EXT-EU-AML-001",
      "version_id": "VER-EXT-EU-AML-001-01",
      "chunk_no": 1,
      "section_title": "Document Header",
      "content": "# EU AML/CFT Customer Due Diligence Demo Standard\n\n**Document ID:** EXT-EU-AML-001\n...",
      "language": "EN",
      "domain": "AML/CFT"
    },
    {
      "chunk_id": "CHK-EXT-EU-AML-001-01-002",
      "document_id": "EXT-EU-AML-001",
      "version_id": "VER-EXT-EU-AML-001-01",
      "chunk_no": 2,
      "section_title": "1. Purpose and Scope",
      "content": "## 1. Purpose and Scope\n\nThis document defines a demonstration framework...",
      "language": "EN",
      "domain": "AML/CFT"
    }
  ],
  "total_chunks": 9
}
```

**Response (404 Not Found)**
```json
{
  "detail": "Document version not found"
}
```

**Notes:**
- Chunks are sorted by `chunk_no` in ascending order
- Each chunk contains the full text content for that section
- `total_chunks` indicates the total number of chunks in this version

---

## 3. Regulatory Requirements

### List Requirements by Source Document IDs

#### `GET /api/requirements/by-documents`
Get regulatory requirements linked to a provided list of source document IDs with optional filtering.

**Query Parameters**
- `document_ids` (required, list): One or more source document IDs to filter by
- `domain` (optional): Filter by domain (e.g., AML/CFT, KYC, DATA_PROTECTION)
- `risk_level` (optional): Filter by risk level (LOW, MEDIUM, HIGH)
- `language` (optional): Filter by language (EN, FR)
- `status` (optional): Filter by status (ACTIVE, SUPERSEDED)
- `limit` (integer): Max results per page (default: 50, max: 200)
- `offset` (integer): Number of results to skip for pagination (default: 0)

**Authentication** Required (Bearer token)

**Request Examples**
```
GET /api/requirements/by-documents?document_ids=EXT-EU-AML-001
GET /api/requirements/by-documents?document_ids=EXT-EU-AML-001&document_ids=EXT-EBA-KYC-002
GET /api/requirements/by-documents?document_ids=EXT-EU-AML-001&risk_level=HIGH&limit=100
GET /api/requirements/by-documents?document_ids=EXT-ACPR-LCBFT-003&language=FR&domain=AML/CFT
```

**Response (200 OK)**
```json
{
  "total": 12,
  "items": [
    {
      "requirement_id": "REQ-0001",
      "source_document_id": "EXT-EU-AML-001",
      "title": "Risk classification",
      "domain": "AML/CFT",
      "language": "EN",
      "requirement_text": "Customers must be classified using documented money-laundering and terrorist-financing risk factors.",
      "risk_level": "MEDIUM",
      "source_reference": "Section 3",
      "status": "ACTIVE"
    },
    {
      "requirement_id": "REQ-0002",
      "source_document_id": "EXT-EU-AML-001",
      "title": "Enhanced due diligence",
      "domain": "AML/CFT",
      "language": "EN",
      "requirement_text": "High-risk customers require enhanced due diligence and documented approval.",
      "risk_level": "HIGH",
      "source_reference": "Section 4",
      "status": "ACTIVE"
    }
  ],
  "limit": 50,
  "offset": 0,
  "document_ids_queried": [
    "EXT-EU-AML-001",
    "EXT-EBA-KYC-002"
  ]
}
```

**Response (400 Bad Request)**
```json
{
  "detail": "At least one document_id is required"
}
```

**Response (401 Unauthorized)**
```json
{
  "detail": "Not authenticated"
}
```

---

### Get Requirement by ID

#### `GET /api/requirements/{requirement_id}`
Retrieve a single regulatory requirement by its ID.

**Path Parameters**
- `requirement_id` (required): The ID of the requirement (e.g., REQ-0001)

**Authentication** Required (Bearer token)

**Request Example**
```
GET /api/requirements/REQ-0001
```

**Response (200 OK)**
```json
{
  "requirement_id": "REQ-0001",
  "source_document_id": "EXT-EU-AML-001",
  "title": "Risk classification",
  "domain": "AML/CFT",
  "language": "EN",
  "requirement_text": "Customers must be classified using documented money-laundering and terrorist-financing risk factors.",
  "risk_level": "MEDIUM",
  "source_reference": "Section 3",
  "status": "ACTIVE"
}
```

**Response (404 Not Found)**
```json
{
  "detail": "Requirement not found"
}
```

---

## 4. Requirement-Procedure Mappings

### Update Mapping Human Review Status

#### `PUT /api/mappings/{mapping_id}/human-status`
Update the human review status of a requirement-procedure mapping.

**Path Parameters**
- `mapping_id` (required): The ID of the mapping (e.g., MAP-0001)

**Request Body**
- `human_status` (required): One of the following:
  - `PENDING_REVIEW` — Awaiting human review (default)
  - `ESCALATE` — Escalate to senior review/approval
  - `ACCEPT` — Approved by human reviewer
  - `REJECT` — Rejected by human reviewer

**Authentication** Required (Bearer token)

**Request Examples**
```json
PUT /api/mappings/MAP-0001/human-status
{"human_status": "ACCEPT"}

PUT /api/mappings/MAP-0001/human-status
{"human_status": "ESCALATE"}

PUT /api/mappings/MAP-0001/human-status
{"human_status": "REJECT"}
```

**Response (200 OK)**
```json
{
  "mapping_id": "MAP-0001",
  "requirement_id": "REQ-0001",
  "procedure_id": "PRC-AML-007",
  "assessment": "COVERED",
  "confidence": 0.93,
  "explanation": "The internal procedure contains explicit controls...",
  "recommended_action": "No immediate update proposed...",
  "human_status": "ACCEPT",
  "assignee": null
}
```

**Response (400 Bad Request)**
```json
{
  "detail": "Invalid human_status. Allowed values: PENDING_REVIEW, ESCALATE, ACCEPT, REJECT"
}
```

**Response (404 Not Found)**
```json
{
  "detail": "Mapping not found"
}
```

---

### Update Mapping Assignee

#### `PUT /api/mappings/{mapping_id}/assignee`
Update the assignee of a requirement-procedure mapping to assign compliance work to a specific team member.

**Path Parameters**
- `mapping_id` (required): The ID of the mapping (e.g., MAP-0001)

**Request Body**
- `assignee` (optional): User ID or email to assign (can be null to clear assignment)

**Authentication** Required (Bearer token)

**Request Examples**
```json
PUT /api/mappings/MAP-0001/assignee
{"assignee": "compliance.officer@bank.com"}

PUT /api/mappings/MAP-0001/assignee
{"assignee": "junior.analyst@bank.com"}

PUT /api/mappings/MAP-0001/assignee
{"assignee": null}
```

**Response (200 OK)**
```json
{
  "mapping_id": "MAP-0001",
  "requirement_id": "REQ-0001",
  "procedure_id": "PRC-AML-007",
  "assessment": "COVERED",
  "confidence": 0.93,
  "explanation": "The internal procedure contains explicit controls...",
  "recommended_action": "No immediate update proposed...",
  "human_status": "ACCEPT",
  "assignee": "compliance.officer@bank.com"
}
```

**Response (404 Not Found)**
```json
{
  "detail": "Mapping not found"
}
```

---

## Old Requirement-Procedure Mappings (Keep reading below)

### List All Mappings (Flat)

#### `GET /api/mappings/all`
Get a flat list of all requirement-procedure mappings with optional filters.

**Query Parameters**
- `requirement_id` (optional): Filter by specific requirement ID
- `procedure_id` (optional): Filter by specific procedure ID
- `assessment` (optional): Filter by assessment status (COVERED, PARTIALLY_COVERED, POTENTIAL_GAP, HUMAN_REVIEW)
- `human_status` (optional): Filter by human review status (PENDING_REVIEW, ACCEPTED, REJECTED, ESCALATED)
- `limit` (integer): Max results per page (default: 50, max: 200)
- `offset` (integer): Number of results to skip for pagination (default: 0)

**Authentication** Required (Bearer token)

**Request Examples**
```
GET /api/mappings/all
GET /api/mappings/all?requirement_id=REQ-0001
GET /api/mappings/all?assessment=COVERED&limit=100
GET /api/mappings/all?human_status=PENDING_REVIEW
```

**Response (200 OK)**
```json
{
  "total": 12,
  "items": [
    {
      "mapping_id": "MAP-0001",
      "requirement_id": "REQ-0001",
      "procedure_id": "PRC-AML-007",
      "assessment": "COVERED",
      "confidence": 0.93,
      "explanation": "The internal procedure contains explicit controls...",
      "recommended_action": "No immediate update proposed...",
      "human_status": "PENDING_REVIEW",
      "assignee": null
    }
  ],
  "limit": 50,
  "offset": 0
}
```

---

### Requirements with Their Procedures (Nested)

#### `GET /api/mappings/requirements-to-procedures`
Get nested structure: list of requirements with all procedures they map to.

**Query Parameters**
- `requirement_ids` (required, list): List of requirement IDs to expand
- `assessment` (optional): Filter mappings by assessment status
- `risk_level` (optional): Filter requirements by risk level (LOW, MEDIUM, HIGH)

**Authentication** Required (Bearer token)

**Request Examples**
```
GET /api/mappings/requirements-to-procedures?requirement_ids=REQ-0001
GET /api/mappings/requirements-to-procedures?requirement_ids=REQ-0001&requirement_ids=REQ-0002
GET /api/mappings/requirements-to-procedures?requirement_ids=REQ-0001&assessment=COVERED
```

**Response (200 OK)**
```json
{
  "total_requirements": 2,
  "total_mappings": 5,
  "data": [
    {
      "requirement": {
        "requirement_id": "REQ-0001",
        "source_document_id": "EXT-EU-AML-001",
        "title": "Risk classification",
        "domain": "AML/CFT",
        "risk_level": "MEDIUM",
        "status": "ACTIVE"
      },
      "procedures": [
        {
          "procedure": {
            "procedure_id": "PRC-AML-007",
            "document_id": "INT-PROC-AML",
            "name": "Risk Classification Process",
            "domain": "AML/CFT",
            "status": "ACTIVE"
          },
          "mapping": {
            "mapping_id": "MAP-0001",
            "assessment": "COVERED",
            "confidence": 0.93,
            "explanation": "...",
            "human_status": "PENDING_REVIEW",
            "assignee": null
          }
        }
      ],
      "total_procedures": 2
    }
  ]
}
```

---

### Procedures with Their Requirements (Nested)

#### `GET /api/mappings/procedures-to-requirements`
Get nested structure: list of procedures with all requirements they address.

**Query Parameters**
- `procedure_ids` (required, list): List of procedure IDs to expand
- `assessment` (optional): Filter mappings by assessment status
- `domain` (optional): Filter requirements by domain (AML/CFT, KYC, etc.)

**Authentication** Required (Bearer token)

**Request Examples**
```
GET /api/mappings/procedures-to-requirements?procedure_ids=PRC-AML-007
GET /api/mappings/procedures-to-requirements?procedure_ids=PRC-AML-007&assessment=COVERED
GET /api/mappings/procedures-to-requirements?procedure_ids=PRC-KYC-002&domain=KYC
```

**Response (200 OK)**
```json
{
  "total_procedures": 1,
  "total_mappings": 3,
  "data": [
    {
      "procedure": {
        "procedure_id": "PRC-AML-007",
        "document_id": "INT-PROC-AML",
        "name": "AML Transaction Monitoring",
        "domain": "AML/CFT",
        "status": "ACTIVE"
      },
      "requirements": [
        {
          "requirement": {
            "requirement_id": "REQ-0001",
            "source_document_id": "EXT-EU-AML-001",
            "title": "Risk classification",
            "domain": "AML/CFT",
            "risk_level": "MEDIUM"
          },
          "mapping": {
            "mapping_id": "MAP-0001",
            "assessment": "COVERED",
            "confidence": 0.93,
            "human_status": "PENDING_REVIEW",
            "assignee": "compliance.officer@bank.com"
          }
        }
      ],
      "total_requirements": 3
    }
  ]
}
```

---

## 5. User Management

### List Users

#### `GET /api/users`
Get a paginated list of users with optional filtering.

**Query Parameters**
- `role` (optional): Filter by role (e.g., COMPLIANCE_OFFICER)
- `is_active` (optional): Filter by active status (true/false)
- `limit` (integer): Max results per page (default: 50, max: 200)
- `offset` (integer): Number of results to skip for pagination (default: 0)

**Authentication** Required (Bearer token)

**Request Examples**
```
GET /api/users
GET /api/users?role=COMPLIANCE_OFFICER
GET /api/users?is_active=true&limit=100
GET /api/users?role=COMPLIANCE_OFFICER&is_active=true&limit=50
```

**Response (200 OK)**
```json
{
  "total": 4,
  "items": [
    {
      "user_id": "USR-a1b2c3d4e5f6g7h8i9j0",
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "COMPLIANCE_OFFICER",
      "is_active": true,
      "created_at": "2026-09-05T12:16:17.670429"
    }
  ],
  "limit": 50,
  "offset": 0
}
```

**Response (401 Unauthorized)**
```json
{
  "detail": "Not authenticated"
}
```

---

### Get User by ID

#### `GET /api/users/{user_id}`
Retrieve a single user by their ID.

**Path Parameters**
- `user_id` (required): The ID of the user (e.g., USR-a1b2c3d4e5f6g7h8i9j0)

**Authentication** Required (Bearer token)

**Request Example**
```
GET /api/users/USR-a1b2c3d4e5f6g7h8i9j0
```

**Response (200 OK)**
```json
{
  "user_id": "USR-a1b2c3d4e5f6g7h8i9j0",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "COMPLIANCE_OFFICER",
  "is_active": true,
  "created_at": "2026-09-05T12:16:17.670429"
}
```

**Response (404 Not Found)**
```json
{
  "detail": "User not found"
}
```

---

## 6. Authentication

### Signup

#### `POST /api/auth/signup`
Create a new user account and receive a JWT access token.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "full_name": "John Doe"
}
```

**Field Requirements**
- `email` (required): Valid email address
- `password` (required): Minimum 8 characters
- `full_name` (optional): User's full name

**Response (201 Created)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "user_id": "USR-a1b2c3d4e5f6g7h8i9j0",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "COMPLIANCE_OFFICER",
    "is_active": true,
    "created_at": "2026-09-05T11:58:00.322915"
  }
}
```

**Response (409 Conflict)**
```json
{
  "detail": "Email already registered"
}
```

**Response (422 Unprocessable Entity)**
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "invalid email format",
      "input": "invalid-email"
    }
  ]
}
```

---

### Signin

#### `POST /api/auth/signin`
Authenticate a user by email/password and receive an access token.

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Field Requirements**
- `email` (required): Valid email address
- `password` (required): User's password

**Response (200 OK)**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "user_id": "USR-a1b2c3d4e5f6g7h8i9j0",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "COMPLIANCE_OFFICER",
    "is_active": true,
    "created_at": "2026-09-05T11:58:00.322915"
  }
}
```

**Response (401 Unauthorized)**
```json
{
  "detail": "Invalid email or password"
}
```

**Response (403 Forbidden)**
```json
{
  "detail": "Account is disabled"
}
```

---

### Get Current User

#### `GET /api/auth/me`
Retrieve the currently authenticated user's profile.

**Authentication**
Required. Use the access token from signup/signin in the Authorization header:
```
Authorization: Bearer <access_token>
```

**Response (200 OK)**
```json
{
  "user_id": "USR-a1b2c3d4e5f6g7h8i9j0",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "COMPLIANCE_OFFICER",
  "is_active": true,
  "created_at": "2026-09-05T11:58:00.322915"
}
```

**Response (401 Unauthorized)**
```json
{
  "detail": "Not authenticated"
}
```

---

## Data Models

### User
```json
{
  "user_id": "USR-<hex>",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "COMPLIANCE_OFFICER",
  "is_active": true,
  "created_at": "2026-09-05T11:58:00.322915",
  "updated_at": "2026-09-05T11:58:00.322915"
}
```

### Token
```json
{
  "access_token": "JWT token string",
  "token_type": "bearer",
  "user": { /* User object */ }
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — resource created successfully |
| 401 | Unauthorized — invalid/missing credentials or expired token |
| 403 | Forbidden — authenticated but not allowed (e.g., disabled account) |
| 409 | Conflict — resource already exists (e.g., email taken) |
| 422 | Unprocessable Entity — invalid input validation |
| 500 | Internal Server Error |

---

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

1. **Signup or Signin** → receive `access_token`
2. **Include token in requests** → `Authorization: Bearer <access_token>`
3. **Token expires** → re-authenticate to get a new one (default: 60 minutes)

### Bearer Token Example
```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  http://localhost:8000/api/auth/me
```

---

## Rate Limiting
Currently not implemented. To be added as needed.

---

## Error Handling

All errors follow this format:
```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Testing with cURL

### Get Documents (requires auth token first)
```bash
# 1. Signup to get a token
TOKEN_RESP=$(curl -s -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }')
TOKEN=$(echo $TOKEN_RESP | jq -r '.access_token')

# 2. List all documents (first 10)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents?limit=10"

# 3. Filter by domain
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents?domain=AML/CFT&limit=5"

# 4. Filter by language
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents?language=FR&limit=5"

# 5. Search by title
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents?title=KYC"

# 6. Get a single document
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/EXT-EU-AML-001"

# 7. Get document content (all chunks) by version ID
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/content/VER-EXT-EU-AML-001-01" | jq '.total_chunks, .chunks[0].section_title'
```

### Testing Content Endpoint
```bash
# Get a version ID first
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents?limit=1" | jq -r '.items[0].document_id'

# Then get all content for that version
VERSION_ID="VER-EXT-EU-AML-001-01"
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/documents/content/$VERSION_ID" | jq '{total_chunks, version_no: .version.version_no, first_chunk_title: .chunks[0].section_title}'
```

### Signup (Get Token First)
For all the examples below, you'll need a token. Signup first:
```bash
TOKEN_RESP=$(curl -s -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}')
TOKEN=$(echo $TOKEN_RESP | jq -r '.access_token')
```

### Get Requirements by Document IDs
```bash
# Single document
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/requirements/by-documents?document_ids=EXT-EU-AML-001&limit=10"

# Multiple documents
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/requirements/by-documents?document_ids=EXT-EU-AML-001&document_ids=EXT-EBA-KYC-002&limit=20"

# Filter by risk level
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/requirements/by-documents?document_ids=EXT-EU-AML-001&risk_level=HIGH"

# Filter by language
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/requirements/by-documents?document_ids=EXT-ACPR-LCBFT-003&language=FR"

# Get single requirement
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/requirements/REQ-0001"

### Get Requirement-Procedure Mappings
```bash
# Get all mappings (flat list)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mappings/all?limit=10"

# Filter by assessment status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mappings/all?assessment=COVERED&limit=50"

# Filter by human review status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mappings/all?human_status=PENDING_REVIEW"

# Get requirements with their procedures (nested)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mappings/requirements-to-procedures?requirement_ids=REQ-0001"

# Get procedures with their requirements (nested)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/mappings/procedures-to-requirements?procedure_ids=PRC-AML-007"

### Update Mapping Human Status
```bash
# Accept a mapping
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"human_status":"ACCEPT"}' \
  "http://localhost:8000/api/mappings/MAP-0001/human-status"

# Escalate a mapping for senior review
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"human_status":"ESCALATE"}' \
  "http://localhost:8000/api/mappings/MAP-0001/human-status"

# Reject a mapping
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"human_status":"REJECT"}' \
  "http://localhost:8000/api/mappings/MAP-0001/human-status"

# Reset to pending review
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"human_status":"PENDING_REVIEW"}' \
  "http://localhost:8000/api/mappings/MAP-0001/human-status"
```

### Get Users
```bash
# List all users
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users"

# Filter by role
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users?role=COMPLIANCE_OFFICER"

# Filter by active status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users?is_active=true&limit=50"

# Pagination
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users?limit=100&offset=50"

# Get single user
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/users/USR-a1b2c3d4e5f6g7h8i9j0"
```

### Signup
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "full_name": "Test User"
  }'
```

### Signin
```bash
curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### Get Current User
```bash
curl -H "Authorization: Bearer <your_token>" \
  http://localhost:8000/api/auth/me
```

### Health Check
```bash
curl http://localhost:8000/health
```

---

## Interactive API Documentation

When the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Both provide interactive exploration of all endpoints, schemas, and allow you to test calls directly.
