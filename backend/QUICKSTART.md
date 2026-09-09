# Backend Quick Start Guide

## ✅ What's Been Set Up

- **FastAPI** web framework with automatic OpenAPI documentation
- **PostgreSQL 18** native service running locally (port 5432)
- **SQLAlchemy 2.0** ORM with models for all 10 core tables
- **Alembic** database migration tool
- **1,262 rows** of demo data migrated from the reference SQLite
- **venv + pip** with all dependencies locked in `pyproject.toml`

## 🚀 Running the Application

### 1. Activate the Virtual Environment

```bash
cd backend
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
# or
source .venv/bin/activate      # Unix/macOS or
.venv\Scripts\activate         # Windows Command Line
```

### 2. Start the FastAPI Server

```bash
uvicorn app.main:app --reload
```

The server starts at **http://localhost:8000**

### 3. Access the Documentation

- **Interactive API docs (Swagger):** http://localhost:8000/docs
- **Alternative API docs (ReDoc):** http://localhost:8000/redoc
- **Root endpoint:** http://localhost:8000/
- **Health check:** http://localhost:8000/health

## 📊 Database Schema

10 tables with foreign keys and indexes:

1. **documents** — regulatory/internal documents
2. **document_versions** — document version history
3. **document_chunks** — searchable text sections
4. **regulatory_requirements** — extracted regulatory obligations
5. **procedures** — internal policies/procedures
6. **procedure_versions** — procedure version history
7. **controls** — compliance controls
8. **requirement_procedure_map** — gap analysis (requirements ↔ procedures)
9. **audit_history** — audit events
10. **official_public_sources** — regulatory authority references

## 🔧 Database Administration

### Connect to the Database

```bash
set PGPASSWORD=ia_bank_secure_2026
psql -h localhost -p 5432 -U ia_bank_app -d ia_bank_compliance
```

Then in psql:
```sql
\dt               -- List tables
\d+ documents     -- Show table structure + indexes + FKs
SELECT COUNT(*) FROM documents;  -- Count rows
```

### Run a Migration

```bash
# Auto-generate from model changes
alembic revision --autogenerate -m "Add new_field to xyz"

# Review the file in alembic/versions/

# Apply it
alembic upgrade head
```

## 📁 Project Structure

See `CLAUDE.md` (in this directory) for complete development guide, including:
- Stack decision & rationale
- "Search before creating" rule
- Checklist before ending a task
- Common workflows (adding endpoints, migrations, debugging)
