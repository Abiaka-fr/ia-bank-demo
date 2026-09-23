"""Copie les données de la base Neon (PostgreSQL) vers une base SQLite locale.

Lecture seule côté Neon. Le schéma SQLite est créé à partir des modèles SQLAlchemy du
backend (`backend/app/models/`), sans rien modifier sous `backend/`. Les tables absentes
de Neon restent vides : la base locale devient un miroir de Neon.

L'URL de connexion n'est jamais écrite sur disque : elle est lue dans la variable
d'environnement NEON_DATABASE_URL.

Usage (voir aussi scripts/local-dev/README.md) :
    NEON_DATABASE_URL='postgresql://…' \\
      .venv-backend/bin/python scripts/local-dev/clone_neon_to_sqlite.py .local/neon-clone.sqlite
"""

import os
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import Date, DateTime, MetaData, create_engine, event, select

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT / "backend"))
# `app.db` crée un moteur à l'import : il lui faut une URL valide, jamais utilisée ici.
os.environ.setdefault("DATABASE_URL", "sqlite://")

from app.db.base import Base  # noqa: E402
import app.models  # noqa: E402,F401  (enregistre les modèles sur Base.metadata)
import app.models.mapping  # noqa: E402,F401
import app.models.procedure  # noqa: E402,F401


def neon_engine():
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        sys.exit("NEON_DATABASE_URL absente.")
    # psycopg 3 ; la chaîne Neon commence par postgresql:// (pilote psycopg2 par défaut).
    url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url)

    @event.listens_for(engine, "connect")
    def read_only(dbapi_conn, _):
        with dbapi_conn.cursor() as cur:
            cur.execute("SET default_transaction_read_only = on")
        dbapi_conn.commit()

    return engine


def to_target_type(column, value):
    """Neon stocke certaines dates en `text` alors que les modèles déclarent `DateTime`."""
    if isinstance(value, str) and isinstance(column.type, (DateTime, Date)):
        parsed = datetime.fromisoformat(value)
        return parsed.date() if isinstance(column.type, Date) and not isinstance(column.type, DateTime) else parsed
    return value


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    target_path = Path(sys.argv[1]).resolve()
    if target_path.exists():
        sys.exit(f"{target_path} existe déjà — choisir un autre chemin ou le supprimer.")

    source = neon_engine()
    target = create_engine(f"sqlite:///{target_path}")
    Base.metadata.create_all(target)

    neon_meta = MetaData()
    neon_meta.reflect(bind=source)

    with source.connect() as src, target.begin() as dst:
        # Ordre des clés étrangères : parents avant enfants.
        for table in Base.metadata.sorted_tables:
            if table.name not in neon_meta.tables:
                print(f"{table.name:28} absente de Neon — laissée vide")
                continue
            neon_table = neon_meta.tables[table.name]
            columns = [c for c in table.columns if c.name in neon_table.columns]
            rows = [
                {c.name: to_target_type(c, r._mapping[c.name]) for c in columns}
                for r in src.execute(select(*(neon_table.c[c.name] for c in columns)))
            ]
            if rows:
                dst.execute(table.insert(), rows)
            skipped = set(neon_table.columns.keys()) - {c.name for c in columns}
            note = f" (colonnes Neon ignorées : {sorted(skipped)})" if skipped else ""
            print(f"{table.name:28} {len(rows):5} lignes{note}")

    print(f"\nBase écrite : {target_path}")


if __name__ == "__main__":
    main()
