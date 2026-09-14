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

1. **European search (CELLAR / EUR-Lex)** — deferred. Thư: "để sau đi, phải coi api đó trả về được
   cái gì đã" (need to see what that external API actually returns before deciding the backend
   shape). No frontend work should assume a response shape yet — `AwaitingBackendBadge` stays on
   any EU-search counters/results in the UI (see `docs/ui-guidelines.md`).

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

   **⚠️ Follow-up bug found while verifying (2026-09-14), not a backend gap — pure frontend
   staleness**: `regulation-detail-view.tsx` was written before these fields existed and never got
   updated. Today it labels `published_at` as "Created date" (semantically wrong — that's the
   regulation's publication date, not when the record was created) and hardcodes
   `AwaitingBackendBadge` for "Last updated" unconditionally, even though `regulation.updated_at`
   is now real and populated. Needs a small frontend fix (not a Thư/backend item) — see
   `docs/phases/phase-6-francis-feedback.md` §4 follow-up.

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
   `docs/api-contract.md` v1.6/v1.8. Note: there is still no real **upload** endpoint for procedures
   (or regulations) — uploads stay simulated in MSW until Thư builds one (see item 2, which the
   upload flow is downstream of).

---
*Maintained by the frontend session. Thư: cross off / move to "Resolved" whatever you ship, or
just tell Giang and it'll get moved here.*
