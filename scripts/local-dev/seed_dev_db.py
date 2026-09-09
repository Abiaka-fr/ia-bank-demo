"""Prépare la base SQLite de développement local pour le backend de Thư.

Ce script vit **hors** de `backend/` (zone en lecture seule, voir `CLAUDE.md` § 2) : il
importe les modèles de Thư sans en modifier une ligne, et n'écrit que dans la copie de
travail située dans `.local/` (gitignorée).

Trois choses peuvent manquer pour que le backend démarre sur la base de référence :

1. la table `users` — absente de `abiaka_regulatory_demo.sqlite`, alors que toutes les
   routes `/api/**` exigent un JWT ; sans utilisateur, impossible de se connecter ;
2. des comptes de démonstration — alignés sur ceux du corpus MSW du frontend
   (`frontend/src/lib/mocks/data/users.ts`) pour que le même identifiant fonctionne en
   mode mock et en mode backend réel ;
3. **une colonne ajoutée à un modèle existant, sans migration.** `alembic/versions/` est
   gitignoré côté backend (voir `docs/backend-integration.md`), donc Thư ne committe
   aucune migration : un modèle qui évolue (ex. `RequirementProcedureMap.assignee`,
   ajouté le 2026-09-07) casse silencieusement toute requête sur cette table pour
   quiconque a une copie de la base plus ancienne que le changement — SQLAlchemy
   sélectionne la colonne parce qu'elle est dans le modèle Python, et SQLite répond
   `no such column`. `sync_missing_columns()` compare chaque table déclarée à la base
   réelle et ajoute les colonnes manquantes (`ALTER TABLE ... ADD COLUMN`, toujours
   nullable — la seule forme qu'accepte SQLite après coup).

`Base.metadata.create_all()` est appelé avec `checkfirst=True` (défaut) : les 10 tables
déjà présentes dans la base de référence ne sont pas recréées, seule `users` l'est.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

# Les modèles de Thư sont importés depuis `backend/` sans installer le paquet : un
# `pip install -e backend/` écrirait un `backend/*.egg-info/`, donc un fichier sous une
# arborescence que la règle projet interdit de modifier.
sys.path.insert(0, str(REPO_ROOT / "backend"))


# Comptes de démonstration — mêmes adresses et mêmes rôles que le corpus MSW, pour que
# la bascule mock <-> backend réel ne change pas les identifiants de la démo.
# Aucune personne réelle : corpus fictif (voir `CLAUDE.md` § 3).
DEMO_PASSWORD = "demo1234"

DEMO_USERS = [
    ("USR-001", "marie.lefevre@iabank.fr", "Marie Lefèvre", "Responsable Conformité"),
    ("USR-002", "thomas.rousseau@iabank.fr", "Thomas Rousseau", "Analyste Conformité"),
    ("USR-003", "claire.dubois@iabank.fr", "Claire Dubois", "Auditeur Interne"),
    ("USR-004", "karim.benali@iabank.fr", "Karim Benali", "Juriste Réglementaire"),
]


def sync_missing_columns(engine, base) -> list[str]:
    """Ajoute les colonnes présentes dans les modèles mais absentes de la base.

    Ne touche que des colonnes nullable (seule forme qu'accepte `ALTER TABLE ... ADD
    COLUMN` sur une table existante en SQLite) et ne supprime ni ne renomme jamais rien
    — un modèle qui a *retiré* une colonne laisse simplement une colonne inutilisée en
    base, ce qui est sans risque, plutôt qu'une perte de données.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    added: list[str] = []

    with engine.begin() as connection:
        for table in base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # Table entièrement absente : `create_all()` s'en charge.

            existing_columns = {
                column["name"] for column in inspector.get_columns(table.name)
            }
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                column_type = column.type.compile(dialect=engine.dialect)
                connection.execute(
                    text(f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {column_type}')
                )
                added.append(f"{table.name}.{column.name}")

    return added


def main() -> int:
    if not os.environ.get("DATABASE_URL"):
        print("DATABASE_URL n'est pas défini — lancer ce script via setup-backend.sh.")
        return 1

    # `app.config` lit DATABASE_URL depuis l'environnement, et `app.db.session`
    # construit le moteur au moment de l'import : d'où l'import tardif, après le
    # contrôle ci-dessus.
    from app.core.security import hash_password
    from app.db.base import Base
    from app.db.session import SessionLocal, engine
    from app.models.user import User

    # checkfirst=True (défaut) : ne crée que les tables absentes, donc uniquement `users`.
    Base.metadata.create_all(bind=engine)

    added_columns = sync_missing_columns(engine, Base)
    if added_columns:
        print(f"Colonnes ajoutées (modèle en avance sur la base) : {', '.join(added_columns)}")

    session = SessionLocal()
    try:
        created = 0
        for user_id, email, full_name, role in DEMO_USERS:
            if session.query(User).filter(User.email == email).first() is not None:
                continue
            session.add(
                User(
                    user_id=user_id,
                    email=email,
                    full_name=full_name,
                    role=role,
                    hashed_password=hash_password(DEMO_PASSWORD),
                    is_active=True,
                )
            )
            created += 1
        session.commit()
    finally:
        session.close()

    print(f"Base de developpement prete - {created} compte(s) de demonstration cree(s).")
    print(f"Connexion : {DEMO_USERS[0][1]} / {DEMO_PASSWORD}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
