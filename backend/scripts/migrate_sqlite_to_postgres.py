"""Migrate data from SQLite reference database to PostgreSQL."""

import argparse
import sqlite3
from datetime import datetime
from pathlib import Path
import sys

from sqlalchemy.orm import Session

# Add parent directory to path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import settings
from app.db import SessionLocal
from app.models import (
    Document,
    DocumentChunk,
    DocumentVersion,
    RegulatoryRequirement,
    Procedure,
    ProcedureVersion,
    Control,
    RequirementProcedureMap,
    AuditHistory,
    OfficialPublicSource,
)


def get_sqlite_connection(db_path: str) -> sqlite3.Connection:
    """Get a read-only connection to the SQLite database."""
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def parse_timestamp(value: str | None) -> datetime | None:
    """Parse timestamp string to datetime object."""
    if not value:
        return None
    try:
        # Try ISO format with T separator
        if 'T' in value:
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        # Try format with space separator
        return datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        return None


def migrate_documents(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate documents table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM documents")

    count = 0
    for row in cursor.fetchall():
        doc = Document(
            document_id=row['document_id'],
            title=row['title'],
            category=row['category'],
            document_type=row['document_type'],
            origin_code=row['origin_code'],
            origin_name=row['origin_name'],
            domain=row['domain'],
            language=row['language'],
            current_version=row['current_version'],
            current_file_path=row['current_file_path'],
            data_classification=row['data_classification'],
            created_at=parse_timestamp(row['created_at']),
        )
        pg_session.add(doc)
        count += 1

    pg_session.flush()
    return count


def migrate_document_versions(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate document_versions table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM document_versions")

    count = 0
    for row in cursor.fetchall():
        ver = DocumentVersion(
            version_id=row['version_id'],
            document_id=row['document_id'],
            version_no=row['version_no'],
            version_timestamp=parse_timestamp(row['version_timestamp']),
            status=row['status'],
            file_path=row['file_path'],
            sha256=row['sha256'],
            created_by=row['created_by'],
            change_reason=row['change_reason'],
        )
        pg_session.add(ver)
        count += 1

    pg_session.flush()
    return count


def migrate_document_chunks(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate document_chunks table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM document_chunks")

    count = 0
    for row in cursor.fetchall():
        chunk = DocumentChunk(
            chunk_id=row['chunk_id'],
            document_id=row['document_id'],
            version_id=row['version_id'],
            chunk_no=row['chunk_no'],
            section_title=row['section_title'],
            content=row['content'],
            language=row['language'],
            domain=row['domain'],
        )
        pg_session.add(chunk)
        count += 1

    pg_session.flush()
    return count


def migrate_regulatory_requirements(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate regulatory_requirements table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM regulatory_requirements")

    count = 0
    for row in cursor.fetchall():
        req = RegulatoryRequirement(
            requirement_id=row['requirement_id'],
            source_document_id=row['source_document_id'],
            title=row['title'],
            domain=row['domain'],
            language=row['language'],
            requirement_text=row['requirement_text'],
            risk_level=row['risk_level'],
            source_reference=row['source_reference'],
            status=row['status'],
        )
        pg_session.add(req)
        count += 1

    pg_session.flush()
    return count


def migrate_procedures(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate procedures table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM procedures")

    count = 0
    for row in cursor.fetchall():
        proc = Procedure(
            procedure_id=row['procedure_id'],
            document_id=row['document_id'],
            name=row['name'],
            domain=row['domain'],
            owner=row['owner'],
            status=row['status'],
            current_version=row['current_version'],
        )
        pg_session.add(proc)
        count += 1

    pg_session.flush()
    return count


def migrate_procedure_versions(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate procedure_versions table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM procedure_versions")

    count = 0
    for row in cursor.fetchall():
        proc_ver = ProcedureVersion(
            procedure_version_id=row['procedure_version_id'],
            procedure_id=row['procedure_id'],
            version_no=row['version_no'],
            version_timestamp=parse_timestamp(row['version_timestamp']),
            status=row['status'],
            document_version_id=row['document_version_id'],
        )
        pg_session.add(proc_ver)
        count += 1

    pg_session.flush()
    return count


def migrate_controls(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate controls table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM controls")

    count = 0
    for row in cursor.fetchall():
        ctrl = Control(
            control_id=row['control_id'],
            document_id=row['document_id'],
            name=row['name'],
            domain=row['domain'],
            frequency=row['frequency'],
            owner=row['owner'],
            status=row['status'],
        )
        pg_session.add(ctrl)
        count += 1

    pg_session.flush()
    return count


def migrate_requirement_procedure_map(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate requirement_procedure_map table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM requirement_procedure_map")

    count = 0
    for row in cursor.fetchall():
        mapping = RequirementProcedureMap(
            mapping_id=row['mapping_id'],
            requirement_id=row['requirement_id'],
            procedure_id=row['procedure_id'],
            assessment=row['assessment'],
            confidence=row['confidence'],
            explanation=row['explanation'],
            recommended_action=row['recommended_action'],
            human_status=row['human_status'],
        )
        pg_session.add(mapping)
        count += 1

    pg_session.flush()
    return count


def migrate_audit_history(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate audit_history table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM audit_history")

    count = 0
    for row in cursor.fetchall():
        audit = AuditHistory(
            audit_id=row['audit_id'],
            document_id=row['document_id'],
            version_id=row['version_id'],
            event_timestamp=parse_timestamp(row['event_timestamp']),
            event_type=row['event_type'],
            actor=row['actor'],
            details=row['details'],
        )
        pg_session.add(audit)
        count += 1

    pg_session.flush()
    return count


def migrate_official_public_sources(sqlite_conn: sqlite3.Connection, pg_session: Session) -> int:
    """Migrate official_public_sources table."""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM official_public_sources")

    count = 0
    for row in cursor.fetchall():
        source = OfficialPublicSource(
            source_id=row['source_id'],
            authority=row['authority'],
            jurisdiction=row['jurisdiction'],
            domain=row['domain'],
            title=row['title'],
            document_type=row['document_type'],
            language=row['language'],
            publication_date=parse_timestamp(row['publication_date']),
            status=row['status'],
            source_url=row['source_url'],
            direct_url=row['direct_url'],
            local_status=row['local_status'],
            demo_use=row['demo_use'],
            excerpt=row['excerpt'],
        )
        pg_session.add(source)
        count += 1

    pg_session.flush()
    return count


def check_target_empty(pg_session: Session) -> bool:
    """Check if target PostgreSQL database is empty."""
    from sqlalchemy import text

    cursor = pg_session.execute(text("SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = 'public'"))
    count = cursor.scalar()
    return count == 0


def get_sqlite_counts(sqlite_conn: sqlite3.Connection) -> dict[str, int]:
    """Get row counts from SQLite database."""
    cursor = sqlite_conn.cursor()
    tables = [
        'documents',
        'document_versions',
        'document_chunks',
        'regulatory_requirements',
        'procedures',
        'procedure_versions',
        'controls',
        'requirement_procedure_map',
        'audit_history',
        'official_public_sources',
    ]

    counts = {}
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        counts[table] = cursor.fetchone()[0]

    return counts


def get_postgres_counts(pg_session: Session) -> dict[str, int]:
    """Get row counts from PostgreSQL database."""
    from sqlalchemy import text

    tables = [
        'documents',
        'document_versions',
        'document_chunks',
        'regulatory_requirements',
        'procedures',
        'procedure_versions',
        'controls',
        'requirement_procedure_map',
        'audit_history',
        'official_public_sources',
    ]

    counts = {}
    for table in tables:
        result = pg_session.execute(text(f"SELECT COUNT(*) FROM {table}"))
        counts[table] = result.scalar()

    return counts


def main():
    """Main migration function."""
    parser = argparse.ArgumentParser(description='Migrate data from SQLite to PostgreSQL')
    parser.add_argument('--sqlite-path', default='reference_database/reference/abiaka_regulatory_demo.sqlite',
                        help='Path to SQLite database file')
    parser.add_argument('--reset', action='store_true', help='Reset target database before migration')

    args = parser.parse_args()

    # Resolve SQLite path relative to script location
    script_dir = Path(__file__).parent.parent
    sqlite_path = script_dir / args.sqlite_path

    if not sqlite_path.exists():
        print(f"❌ SQLite database not found at: {sqlite_path}")
        return 1

    print(f"🚀 Starting migration from {sqlite_path}")
    print(f"📍 Target: {settings.database_url}")

    try:
        # Connect to databases
        sqlite_conn = get_sqlite_connection(str(sqlite_path))
        pg_session = SessionLocal()

        # Check if target is empty
        if not check_target_empty(pg_session) and not args.reset:
            print("❌ Target PostgreSQL database is not empty. Use --reset to truncate first.")
            return 1

        # If reset flag, truncate all tables
        if args.reset:
            print("🧹 Truncating existing tables...")
            tables = [
                'audit_history',
                'requirement_procedure_map',
                'procedure_versions',
                'procedure_versions',
                'controls',
                'procedures',
                'regulatory_requirements',
                'document_chunks',
                'document_versions',
                'documents',
                'official_public_sources',
            ]
            from sqlalchemy import text
            for table in tables:
                try:
                    pg_session.execute(text(f"TRUNCATE TABLE {table} CASCADE"))
                except Exception:
                    pass
            pg_session.commit()

        # Get source counts
        print("\n📊 Source (SQLite) row counts:")
        sqlite_counts = get_sqlite_counts(sqlite_conn)
        for table, count in sqlite_counts.items():
            print(f"  {table}: {count}")

        # Migrate tables in FK-safe order
        print("\n⏳ Migrating data...")

        migrations = [
            ("documents", migrate_documents),
            ("document_versions", migrate_document_versions),
            ("document_chunks", migrate_document_chunks),
            ("regulatory_requirements", migrate_regulatory_requirements),
            ("procedures", migrate_procedures),
            ("procedure_versions", migrate_procedure_versions),
            ("controls", migrate_controls),
            ("requirement_procedure_map", migrate_requirement_procedure_map),
            ("audit_history", migrate_audit_history),
            ("official_public_sources", migrate_official_public_sources),
        ]

        total_migrated = 0
        for table_name, migrate_func in migrations:
            count = migrate_func(sqlite_conn, pg_session)
            print(f"  ✓ {table_name}: {count} rows")
            total_migrated += count

        # Commit transaction
        pg_session.commit()
        print(f"\n✅ Migration complete! Total rows migrated: {total_migrated}")

        # Verify counts
        print("\n📊 Target (PostgreSQL) row counts:")
        pg_counts = get_postgres_counts(pg_session)
        for table, count in pg_counts.items():
            sqlite_count = sqlite_counts.get(table, 0)
            match = "✓" if count == sqlite_count else "✗"
            print(f"  {match} {table}: {count} (source: {sqlite_count})")

        # Check for mismatches
        mismatches = [table for table in sqlite_counts if pg_counts[table] != sqlite_counts[table]]
        if mismatches:
            print(f"\n⚠️  Mismatches found in: {', '.join(mismatches)}")
            return 1

        print("\n✅ Verification passed! All row counts match.")
        return 0

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        sqlite_conn.close()
        pg_session.close()


if __name__ == "__main__":
    sys.exit(main())
