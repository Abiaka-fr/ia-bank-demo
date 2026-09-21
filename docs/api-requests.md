# API Requests — Frontend → Backend (gaps list)

**English, per Thư's request (2026-09-14).** This file lists what the frontend needs from the
backend that `backend/API.md` does not yet cover, or where a decision is still pending. It is the
mirror of `backend/API.md`: that file says what exists (read-only, maintained by Thư); this file
says what's missing or requested, so Thư can pick items off it at her own pace and check them off
here once shipped.

**Rule (agreed 2026-09-14):** the frontend calls the backend based on `backend/API.md` only —
never invents a response shape. Anything the frontend needs that isn't in `backend/API.md` gets
listed here instead of being guessed. `docs/api-contract.md` is frozen as a historical log (see the
banner at its top) and is no longer the thing to check before calling an endpoint.

## Open / deferred

1. **European search (CELLAR / EUR-Lex)** — split in two (2026-09-15):
   - **Metadata search — done frontend-side, no backend needed.** A thin Next.js route
     `GET /api/eu-search` (`frontend/src/app/api/eu-search/route.ts`) queries the public CELLAR
     SPARQL endpoint (`https://publications.europa.eu/webapi/rdf/sparql`, no registration, no CORS
     header → must be server-side) and returns `{ results: [{ celex, title, date, type, inForce,
     eurlexUrl }], page, hasMore }`. Used only by the Knowledge Base search panel. Full design,
     measured latencies and the (absent) official rate limits:
     `docs/superpowers/specs/2026-09-15-eu-search-design.md`. Thư: this answers "what does the API
     return" — feel free to reuse the SPARQL queries there.
   - **EU analysis (candidate EU requirements, dedup vs Bank KB, applicability) — still deferred to
     Thư.** Nothing in the frontend assumes a backend shape for it; `AwaitingBackendBadge` stays on
     the EU counters of the procedure analysis screen.

2. **Procedure analysis — trigger/compute endpoint.** ⚠️ **Confirmed gap, not yet raised with Thư.**
   `docs/api-contract.md` (v1.7/v1.8) proposes `POST /api/procedures/:id/analyze`, and the frontend
   already has a mock (`analyzeProcedure()`, MSW handler) built against it. A case-insensitive
   search of the full `backend/API.md` (1272 lines) for "analyz" returns **zero matches** — there is
   no real endpoint anywhere for triggering or computing a procedure/requirement mapping on demand.
   The only real way to read mapping results today is `GET /api/mappings/all?procedure_id=...`
   (and `GET /api/mappings/requirements-to-procedures`), which only returns mappings that already
   exist in the database.
   **Open question for Thư:** is analysis always a precomputed/offline/batch process (i.e. a newly
   uploaded procedure has no real way to be analyzed at all yet), or is there a trigger endpoint
   planned under a different name? This blocks the "Analyze" screen (Phase 6/7 — `POST
   /api/procedures` + `POST /api/procedures/:id/analyze`) from ever leaving mock mode until it's
   answered.

3. **Classification field — criteria.** Thư will add a classification field to documents/procedures
   ("để tạo thêm nhưng mà phân loại dựa trên tiêu chuẩn gì?" — but based on what criteria?). No
   taxonomy has been specified anywhere yet beyond Francis's loose examples ("concerning customer",
   "concerning head office"). **Needs an answer from Giang/Francis before Thư builds it** — listed
   here as blocked-on-us, not blocked-on-Thư.

## Shipped by Thư (2026-09-13/14) — verified in `backend/API.md` and the models

4. **Three distinct dates** — ✅ shipped. `Document` now has `created_at`, `updated_at`
   (`onupdate`), `published_at`; `Procedure` now has `created_at`/`updated_at`;
   `RegulatoryRequirement` too. Frontend (`documentMetaSchema`, `adapt.ts`) already maps all three
   (contract v1.10, commit `1a88b12`).
5. **Real publication date** — ✅ shipped as `Document.published_at`. Mapped frontend-side.
6. **Summary / excerpt field** — ✅ shipped as `Document.summary` (`Text`, nullable). Wired into
   the Dashboard row and `/regulations` cards frontend-side (commits `a540be4`, `4b3e7ea`,
   `0ccb9af`, `1a88b12`).

   **✅ Follow-up bug fixed (2026-09-14), was pure frontend staleness, not a backend gap** —
   `regulation-detail-view.tsx` now reads `created_at` for "Created date" and
   `updated_at ?? AwaitingBackendBadge` for "Last updated" (was hardcoding the badge and
   mislabeling `published_at`). See `docs/phases/phase-6-francis-feedback.md` §4.

## Shipped by Thư (2026-09-15) — verified in `backend/API.md` and wired in

10. **Document assignee — ✅ shipped and wired frontend-side.** `Document.assignee` (`4ea5611`) +
    `PUT /api/documents/{id}/assignee` (user_id or email). Replaces the local-only
    `regulation-assignee-overrides.ts` workaround (removed same day) — a regulation's "Assigned
    to" now really persists server-side (`lib/api/backend/resources.ts::updateDocumentAssignee`,
    `lib/api/regulations.ts::updateRegulationAssignee`). See `docs/known-limitations.md` #6.

11. **⚠️ Regression, not a request — `requirement_procedure_map.assignee` removed (`3f3f05b`),
    `PUT /api/mappings/:id/assignee` no longer exists.** Frontend was calling it (escalating a
    finding to a specific person) — would have 404'd on every escalation-with-assignee in
    backend-live mode. Adapted: the frontend stopped calling the deleted route
    (`resources.ts::validateMapping`); the chosen assignee still shows immediately (optimistic)
    but is no longer persisted server-side — see `docs/known-limitations.md` #1. **Open question
    for Thư, not urgent**: was per-finding assignee intentionally dropped in favor of
    document-level-only assignment, or is a replacement planned? If intentional, this frontend
    behavior (UI-only, non-persistent) is the permanent state, not a stopgap.

12. **New dedicated `GET /api/procedures` / `GET /api/procedures/{id}` and `GET /api/requirements`
    (list-all) exist now — not wired in yet, needs a decision before doing so.** Unlike item 8
    below (which pointed the frontend at `/api/documents?document_type=PROCEDURE` for lack of
    anything better), `/api/procedures` returns a genuinely different entity: `procedure_id` (e.g.
    `PRC-AML-007`) distinct from `document_id` (e.g. `INT-PROC-AML`), with its own `name`/`owner`,
    nesting the linked `document`. The frontend's `/procedures` screen is currently built around
    one-document-is-one-procedure (routes, `fetchProcedure(id)` etc. all keyed by `document_id`).
    Switching to the real `Procedure` entity as the list/detail source would be a genuine
    identity-model change (a document could have several procedures), not a drop-in swap — **not
    done in this pass, flagged for a decision with Giang** before wiring it in. `GET
    /api/requirements` (list-all, unfiltered by document) has no current frontend use case either
    — noted here in case one comes up, not acted on.

## Resolved — already available, no backend change needed

7. **"Why is this mandatory" / explanation text for a mapping.** Already in the real response of
   `GET /api/mappings/all`: `explanation`, `explanation_lang_fr`, `recommended_action`,
   `recommended_action_lang_fr`. Frontend should call this endpoint directly instead of asking for
   a new field.

## Confirmed real — frontend to switch onto these instead of the invented `/api/procedures/*` routes

8. Procedure list/detail/content should use the **real, already-implemented** endpoints (verified
   against `backend/API.md` and `backend/app/routers/documents.py`):
   - `GET /api/documents?document_type=PROCEDURE` (list — filter confirmed real, line 31/63-64 of
     `documents.py`)
   - `GET /api/documents/{document_id}` (detail)
   - `GET /api/documents/content/{version_id}` (content, chunked)
   These replace the frontend-invented `GET /api/procedures`, `GET /api/procedures/:id` in
   `docs/api-contract.md` v1.6/v1.8. **Superseded by item 12 above (2026-09-15)** — a real,
   purpose-built `/api/procedures` now exists; whether to migrate onto it is an open decision, not
   settled by this item anymore. Note (2026-09-21): uploads now have real routes — see item 11.

## Shipped by Thư (2026-09-21) — upload / ingestion, wired in

11. **Document ingestion — ✅ shipped and wired frontend-side (2026-09-21).**
    `POST /api/documents/regulation-ingest` and `POST /api/procedures/ingest` (same body/response,
    `backend/API.md` § 3). One dialog now serves both (`components/features/upload-document-dialog.tsx`,
    replaces the two near-duplicate dialogs), calling `lib/api/upload.ts::uploadDocument`:
    `text` = the client-side extracted chunks flattened by `chunksToText` (item 9), user-entered
    `title` (prefilled from the file name), `domain` (select of the 9 values listed in API.md),
    `language` (FR/EN), optional `summary` and `published_at` (date input → `YYYY-MM-DDT00:00:00`),
    `created_by` = the signed-in user's `user_id`. MSW mode keeps the multipart mock, which now
    reads the same metadata.
    **Questions for Thư (non-blocking, defaults taken):**
    - The services set `assignee = created_by`. The dialog still lets the user pick another
      assignee → the frontend calls `PUT /api/documents/{id}/assignee` right after ingest when it
      differs. OK, or should `assignee` be an optional field of the ingest body instead?
    - Ingest does not extract requirements. The frontend does **not** chain
      `POST /api/requirements/extract` automatically — the existing button on the regulation detail
      page is used. Should upload trigger it?
    - `backend/API.md` § 3 says "Extracts metadata heuristically" in the intro but "Metadata must be
      provided by the client — no automatic extraction" in the notes. The frontend follows the notes
      (and the Pydantic schema: `title`/`domain`/`language`/`created_by` required).

## Client-side content extraction (now sent to the ingestion routes, see item 11)

9. **Frontend now extracts file content client-side before upload** (Thư's request, 2026-09-14) —
   `frontend/src/lib/file-extract.ts`. On the two upload dialogs (regulation, procedure), selecting
   a `.docx` or `.xlsx` file extracts its content **locally, no network call** (via `mammoth` for
   Word, `xlsx`/SheetJS for Excel), shows a live preview, and blocks the Upload button until
   extraction succeeds. Upload now also accepts `.xlsx`, not just `.docx`.

   **Shape produced, matching what `backend/API.md` already expects on the one real endpoint that
   takes document content** (`POST /api/documents/{id}/update`): an array of
   `{ chunk_no, section_title, content }`. Whenever the real **create** endpoint (item 2 above)
   exists, the frontend should be able to send these chunks directly — no format renegotiation
   needed, just wiring the call.

   **Update 2026-09-21:** in backend mode the chunks are flattened to `text` and sent to the
   ingestion routes (item 11). The multipart `extracted_chunks` field is now MSW-only.

---
*Maintained by the frontend session. Thư: cross off / move to "Resolved" whatever you ship, or
just tell Giang and it'll get moved here.*
