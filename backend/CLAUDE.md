# Backend Development Guide

This is Thư's zone. Stack: **FastAPI + PostgreSQL 18 (native local) + SQLAlchemy 2.0 + Alembic + psycopg3 + venv/pip**.

## 0. Setup (first time only)

1. **Create virtual environment:**
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   ```

2. **Install dependencies:**
   ```bash
   pip install -e .
   ```

3. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

4. **Migrate data from SQLite reference database:**
   ```bash
   python scripts/migrate_sqlite_to_postgres.py
   ```

5. **Start the app:**
   ```bash
   uvicorn app.main:app --reload
   ```
   App runs at `http://localhost:8000` — visit `/docs` for interactive API docs, `/health` to check database connection.

## 1. Before Writing Code

### Search Before Creating

- **Before adding a table:** Check `app/models/` — does a similar model already exist?
- **Before adding an endpoint:** Check `../docs/api-contract.md` — is it documented there? If not, propose a contract change first.
- **Before naming anything:** Verify it matches the glossary in `../docs/glossary.md`.

## 2. Project Structure

```
backend/
├── CLAUDE.md                 # This file
├── pyproject.toml            # Project metadata and dependencies
├── .env                      # Environment variables (gitignored)
├── .env.example              # Template for .env
├── alembic.ini               # Alembic config
├── alembic/
│   ├── env.py                # Alembic environment
│   └── versions/             # Migration files
│       └── 001_create_initial_schema.py
├── app/
│   ├── main.py               # FastAPI app factory
│   ├── config.py             # Settings (from .env)
│   ├── db/
│   │   ├── base.py           # SQLAlchemy Base + model imports (for Alembic)
│   │   ├── session.py        # Engine, SessionLocal, get_db() dependency
│   │   └── __init__.py
│   ├── models/               # SQLAlchemy models (one file per logical group)
│   │   ├── document.py       # Document, DocumentVersion, DocumentChunk
│   │   ├── requirement.py    # RegulatoryRequirement
│   │   ├── procedure.py      # Procedure, ProcedureVersion
│   │   ├── control.py        # Control
│   │   ├── mapping.py        # RequirementProcedureMap
│   │   ├── audit.py          # AuditHistory
│   │   ├── source.py         # OfficialPublicSource
│   │   └── __init__.py
│   ├── routers/              # API route handlers
│   │   ├── health.py         # GET /health
│   │   └── __init__.py
│   └── __init__.py
└── scripts/
    └── migrate_sqlite_to_postgres.py  # One-off SQLite → Postgres ETL
```

## 3. Key Files & Modules

- **`app/config.py`**: Reads `DATABASE_URL` and other env vars from `.env`. Never hardcode connection strings.
- **`app/db/base.py`**: Holds SQLAlchemy `Base` and imports all models. Alembic uses this to auto-detect schema changes.
- **`app/db/session.py`**: Creates engine, SessionLocal, and `get_db()` FastAPI dependency.
- **`app/models/*.py`**: One file per logical table group (documents, requirements, procedures, etc.). No "models.py" with 2000 lines.
- **`alembic/versions/`**: One migration file per logical change. `001_create_initial_schema.py` created the 10 core tables. New migrations go here.

## 4. Checklist: Before Ending a Task

- [ ] **Lint passes:** `ruff check app/`
- [ ] **Format passes:** `black app/` (and check via `git diff` — don't commit style-only changes)
- [ ] **Type hints:** New code has `def func(...) -> ReturnType:` where `ReturnType` is not `Any`. Run `mypy app/` if strict checking is on.
- [ ] **Tests pass:** `pytest tests/` (if tests exist)
- [ ] **App starts:** `uvicorn app.main:app --reload` runs without error
- [ ] **Contract is correct:** Any new endpoint/field matches `../docs/api-contract.md` exactly
- [ ] **No dead code:** Remove unused imports, commented-out code, temp `print()` statements
- [ ] **Update `../PROGRESS.md`:** What was done, what remains, any blockers

## 5. Common Tasks

### Add a New Endpoint

1. **Check the contract:** Is it in `../docs/api-contract.md`? If not, propose an update first (in PROGRESS.md section "Points du contrat encore ouverts").
2. **Create a router:** New file in `app/routers/` (e.g., `regulations.py`).
3. **Add models:** If new tables needed, add them to `app/models/`.
4. **Create a migration:** `alembic revision --autogenerate -m "Add xyz table"`, then review the generated file in `alembic/versions/`.
5. **Run migration:** `alembic upgrade head`.
6. **Implement the endpoint:** Use `get_db()` dependency for database access.
7. **Test & verify:** `uvicorn app.main:app --reload` + call `/docs`.
8. **Update PROGRESS.md** with what was done.

### Add a Database Migration

```bash
# Auto-generate from model changes
alembic revision --autogenerate -m "Add new_field to xyz table"

# Review the file in alembic/versions/
# Then apply it:
alembic upgrade head
```

### Debug Database Issues

```python
# In your endpoint or script:
from sqlalchemy import text
result = db.execute(text("SELECT version()"))
print(result.scalar())
```

## 6. Known Gaps (Schema ↔ Contract)

The database schema mirrors the reference SQLite faithfully; alignment with `../docs/api-contract.md` will be a separate task.

### Enum Mismatches
- **`assessment`:** DB has `COVERED | PARTIALLY_COVERED | POTENTIAL_GAP | HUMAN_REVIEW`; contract has `COVERED | PARTIAL | POTENTIAL_GAP | NO_RELEVANT_PROCEDURE | EXPERT_REVIEW`. **Decision pending with Giang.**
- **`human_status`:** DB has `PENDING_REVIEW` only; contract has `PENDING | ACCEPTED | REJECTED | ESCALATED`. **Decision pending with Giang.**

### Missing Tables
- **`users`** — not in the DB; required by contract for `/api/auth/*` and `/api/users` endpoints.
- **`evidence` linking table** — no direct link between findings and document chunks; must be inferred from requirement↔procedure↔requirement source.

### Scalar vs. Array
- **`domain`** is a scalar `VARCHAR` in the DB (e.g., `"AML/CFT"`); contract models it as `string[]` on Requirement/DocumentMeta. **Decision pending.**

### Missing Fields
- **`RequirementProcedureMap`:** Missing `priority`, `custom_action`, `assignee_id`, `updated_at`. These will be added when aligning with the contract.

---

**Questions? Blockers?** Update `../PROGRESS.md` with the issue and tag it in the "Blocages" section.
