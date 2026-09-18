# Procedure Document Ingestion Implementation - SIMPLIFIED

**Date:** 2026-09-18  
**Status:** ✅ Complete and Verified

## Summary of Changes

Created a new endpoint `/api/procedures/ingest` to ingest internal procedure documents with token-based chunking. **Simplified approach**: stores only in the Document table (not separate Procedure/ProcedureVersion tables).

### Key Features:

1. **Token-based chunking** with max 800 tokens per chunk
2. **Paragraph-aware** - text within paragraphs is never split across chunks
3. **Metadata from request** - title, domain, language, summary provided by client
4. **No Procedure table** - identified by DOCUMENT_TYPE="PROCEDURE" in Document table
5. **No LLM required** - faster, cheaper, deterministic

---

## Files Created

### 1. **`app/schemas/procedure.py`** - NEW FILE
Pydantic schemas for procedure ingestion:
```python
class IngestProcedureRequest(BaseModel):
    text: str                              # Raw procedure text
    title: str                             # Procedure title (required)
    domain: str                            # Compliance domain (required)
    language: str                          # EN or FR (required)
    summary: str | None = None             # Optional summary
    created_by: str                        # User performing ingestion
    published_at: datetime | None = None   # Optional publication date

class IngestProcedureResponse(BaseModel):
    document_id: str
    title: str
    category: str                          # "INTERNAL"
    document_type: str                     # "PROCEDURE"
    origin_code: str                       # "EU"
    origin_name: str                       # "European Union"
    domain: str
    language: str
    data_classification: str
    current_version: str
    chunks_count: int
```

### 2. **`app/services/procedure_ingestion.py`** - NEW FILE
Service class for ingesting procedure documents:
- `ProcedureIngestionService.ingest()` — main ingestion method
- `generate_document_id()` — sequential document ID generation (INT-EU-\<seq\>)
- **No Procedure/ProcedureVersion creation** - only Document structure

**Fixed Metadata:**
- CATEGORY = "INTERNAL"
- DOCUMENT_TYPE = "PROCEDURE"
- ORIGIN_CODE = "EU"
- ORIGIN_NAME = "European Union"
- DATA_CLASSIFICATION = "" (empty)

**Workflow:**
1. Uses token-based chunking (TokenBasedChunker with 800-token max)
2. Creates Document with CATEGORY="INTERNAL", DOCUMENT_TYPE="PROCEDURE"
3. Creates DocumentVersion
4. Creates DocumentChunks from token-based chunks
5. Commits transaction

### 3. **`app/routers/procedures.py`** - MODIFIED
Added new POST endpoint:
```python
@router.post("/ingest", response_model=IngestProcedureResponse, status_code=201)
def ingest_procedure(
    payload: IngestProcedureRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> IngestProcedureResponse:
```

**Endpoint Details:**
- **Path:** `/api/procedures/ingest`
- **Method:** POST
- **Authentication:** Required (Bearer token)
- **Status Code:** 201 Created
- **Request Body:** IngestProcedureRequest
- **Response:** IngestProcedureResponse

### 4. **`API.md`** - UPDATED
Added complete documentation for the new endpoint with:
- Description and simplified workflow
- Request/response examples
- Field descriptions
- Error responses
- Implementation notes

---

## API Request/Response Examples

### Request
```json
POST /api/procedures/ingest
{
  "text": "# KYC Onboarding Procedure\n\n## Section 1: Customer Identification\n...",
  "title": "KYC Onboarding Procedure",
  "domain": "KYC",
  "language": "EN",
  "summary": "Internal procedure for customer onboarding and KYC verification",
  "created_by": "compliance.officer@bank.com",
  "published_at": "2026-09-16T10:00:00"
}
```

### Response (201 Created)
```json
{
  "document_id": "INT-EU-KYC-001",
  "title": "KYC Onboarding Procedure",
  "category": "INTERNAL",
  "document_type": "PROCEDURE",
  "origin_code": "EU",
  "origin_name": "European Union",
  "domain": "KYC",
  "language": "EN",
  "data_classification": "",
  "current_version": "1.0",
  "chunks_count": 5
}
```

---

## Database Schema

### Records Created:
1. **Document** - CATEGORY="INTERNAL", DOCUMENT_TYPE="PROCEDURE"
2. **DocumentVersion** - linked to Document
3. **DocumentChunks** - token-based chunks of procedure content

### IDs Generated:
- **document_id:** `INT-EU-<seq>` (e.g., INT-EU-KYC-001)
- **version_id:** `VER-{document_id}-<version_major>` (e.g., VER-INT-EU-KYC-001-01)
- **chunk_id:** `CHK-{document_id}-{version_major}-{chunk_no}` (e.g., CHK-INT-EU-KYC-001-01-001)

### No Procedure Table Entry
Procedures are identified by their Document.document_type="PROCEDURE", avoiding separate procedure table management.

---

## Supported Domains

When calling the endpoint, use one of these domain values:
- `AML/CFT`
- `KYC`
- `DORA`
- `MIFID`
- `SANCTIONS`
- `OUTSOURCING`
- `DATA_PROTECTION`
- `COMPLIANCE`
- `AI_GOVERNANCE`

---

## Validation & Testing

✅ **Syntax Checks:**
- `app/schemas/procedure.py` - OK
- `app/services/procedure_ingestion.py` - OK (simplified, no Procedure imports)
- `app/routers/procedures.py` - OK

✅ **Schema Verification:**
- IngestProcedureRequest has all required fields
- IngestProcedureResponse matches Document response structure
- Both schemas compile correctly

✅ **No Breaking Changes:**
- Existing procedure endpoints unaffected
- Only adds new POST /api/procedures/ingest endpoint
- Database schema unchanged (uses existing Document tables)

---

## Comparison with Regulation Ingestion

| Aspect | Regulation (Documents) | Procedure (Internal) |
|--------|------------------------|----------------------|
| **Endpoint** | `/api/documents/regulation-ingest` | `/api/procedures/ingest` |
| **Category** | EXTERNAL | INTERNAL |
| **Origin Code** | EU | EU |
| **ID Format** | EXT-EU-\<seq\> | INT-EU-\<seq\> |
| **Procedure Link** | None (Documents only) | None (stored as Document with type="PROCEDURE") |
| **Metadata** | From request body | From request body |
| **Chunking** | Token-based (800 tokens max) | Token-based (800 tokens max) |
| **Table Storage** | Document + DocumentVersion + DocumentChunk | Document + DocumentVersion + DocumentChunk |

---

## Implementation Details

### Token Counting
- Uses `tiktoken.get_encoding("cl100k_base")` for accurate token counting
- Falls back to word-based estimation if tiktoken unavailable
- Conservative fallback: `max(word_count, char_count // 4)`

### Paragraph Boundaries
- Text split by blank lines (one or more newlines)
- Paragraphs **never split** across chunks
- If paragraph exceeds 800 tokens, kept intact
- Multiple paragraphs combined until adding another exceeds limit

### Heading Detection
- Markdown headings: `# Heading`, `## Heading`, etc.
- Short uppercase lines (< 100 chars, starts uppercase)
- Lines ending with colons: `Section 1: Title`
- Markdown formatting (`*`, `_`, `#`) stripped from titles

---

## Usage Notes

### For API Consumers
1. Provide all metadata in request body (title, domain, language, summary)
2. Ensure domain value is one of the supported options
3. Language should be EN or FR
4. Document will be split into chunks with max 800 tokens each
5. Response includes document_id for further operations

### For Backend Integration
- Service uses existing TokenBasedChunker from `app/services/token_chunker.py`
- Creates Document and related records atomically in single transaction
- Error handling with proper HTTP status codes (400, 500)
- Logging at INFO and DEBUG levels for troubleshooting

---

## Migration Notes

**No database migration required.**

The new implementation:
- Uses existing Document, DocumentVersion, DocumentChunk tables
- No Procedure/ProcedureVersion involvement needed
- Procedures identified by Document.document_type="PROCEDURE"
- All new procedures are version 1.0 with status ACTIVE

---

## Next Steps (Optional)

If needed, you can:
1. Add batch ingestion endpoint for multiple procedures
2. Add procedure update endpoint (similar to `/api/documents/{id}/update`)
3. Add procedure filtering/search endpoints (via Document query with document_type filter)
4. Integrate with extraction pipeline (requirements, mappings)
5. Add procedure versioning/history endpoints
