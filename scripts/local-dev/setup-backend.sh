#!/usr/bin/env bash
#
# Prépare l'exécution locale du backend de Thư SANS PostgreSQL et SANS toucher à
# `backend/` (zone en lecture seule — voir CLAUDE.md § 2).
#
# Pourquoi ce script existe : `backend/QUICKSTART.md` suppose PostgreSQL 18 installé,
# un `.env` et un dossier `alembic/`. Or `alembic/versions/*.py` est gitignoré côté
# backend et `alembic.ini` n'a jamais été committé : `alembic upgrade head` est donc
# impossible depuis un clone. La base SQLite de référence, elle, EST committée et
# contient déjà les 1 262 lignes de démo.
#
# Ce que fait ce script :
#   1. vérifie qu'un Python >= 3.10 est disponible (le code backend utilise `X | None`) ;
#   2. crée `.venv-backend/` à la racine et y installe les dépendances de `pyproject.toml` ;
#   3. copie la base SQLite de référence vers `.local/backend-dev.sqlite` (copie de
#      travail : l'original committé n'est jamais modifié) ;
#   4. y ajoute la table `users` (absente) et 4 comptes de démonstration.
#
# À relancer sans risque : la copie de la base n'est refaite que si elle n'existe pas.
# Pour repartir d'une base propre : rm -rf .local && ./scripts/local-dev/setup-backend.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

VENV_DIR="$REPO_ROOT/.venv-backend"
LOCAL_DIR="$REPO_ROOT/.local"
DEV_DB="$LOCAL_DIR/backend-dev.sqlite"
REFERENCE_DB="$REPO_ROOT/backend/reference_database/reference/abiaka_regulatory_demo.sqlite"

# --- 1. Trouver un Python >= 3.10 -------------------------------------------

find_python() {
  for candidate in python3.13 python3.12 python3.11 python3.10 python3; do
    local bin
    bin="$(command -v "$candidate" 2>/dev/null || true)"
    [ -n "$bin" ] || continue
    if "$bin" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
      echo "$bin"
      return 0
    fi
  done
  return 1
}

if ! PYTHON_BIN="$(find_python)"; then
  cat >&2 <<'NO_PYTHON'
Aucun Python >= 3.10 trouvé.

Le backend de Thư déclare `requires-python = ">=3.10"` et utilise la syntaxe
`str | None` dans les signatures évaluées à l'exécution par FastAPI : Python 3.9
(celui livré avec macOS) ne peut pas le faire tourner.

Installer une version récente puis relancer ce script :

    brew install python@3.12

NO_PYTHON
  exit 1
fi

echo "Python utilisé : $PYTHON_BIN ($("$PYTHON_BIN" --version 2>&1))"

# --- 2. Environnement virtuel + dépendances ---------------------------------

if [ ! -d "$VENV_DIR" ]; then
  echo "Création de l'environnement virtuel dans .venv-backend/ …"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

VENV_PY="$VENV_DIR/bin/python"

echo "Installation des dépendances backend …"
"$VENV_PY" -m pip install --quiet --upgrade pip

# Liste reprise de `backend/pyproject.toml`. `psycopg` est volontairement omis : on
# tourne sur SQLite en local, et sa roue binaire est lourde à installer pour rien.
# Le paquet backend n'est PAS installé en editable (`pip install -e backend/`) : cela
# écrirait un `backend/*.egg-info/`, donc un fichier sous une zone en lecture seule.
# `run-backend.sh` pose PYTHONPATH=backend à la place.
"$VENV_PY" -m pip install --quiet \
  "fastapi>=0.115.0" \
  "uvicorn[standard]>=0.30.0" \
  "sqlalchemy>=2.0.0" \
  "pydantic>=2.0.0" \
  "pydantic-settings>=2.0.0" \
  "python-dotenv>=1.0.0" \
  "python-multipart>=0.0.6" \
  "email-validator>=2.0.0" \
  "bcrypt>=4.1.0" \
  "pyjwt>=2.8.0"

# --- 3. Copie de travail de la base de référence -----------------------------

if [ ! -f "$REFERENCE_DB" ]; then
  echo "Base de référence introuvable : $REFERENCE_DB" >&2
  exit 1
fi

mkdir -p "$LOCAL_DIR"

if [ -f "$DEV_DB" ]; then
  echo "Base de développement déjà présente : .local/backend-dev.sqlite (conservée)."
else
  echo "Copie de la base de référence vers .local/backend-dev.sqlite …"
  cp "$REFERENCE_DB" "$DEV_DB"
fi

# --- 4. Table `users` + comptes de démonstration -----------------------------

export DATABASE_URL="sqlite:///$DEV_DB"
export DEBUG="false"
"$VENV_PY" "$REPO_ROOT/scripts/local-dev/seed_dev_db.py"

cat <<'DONE'

Terminé. Pour démarrer les deux serveurs :

    ./scripts/local-dev/run-backend.sh     # http://localhost:8000/docs
    cd frontend && pnpm dev                # http://localhost:3000

Pour brancher le frontend sur le backend réel, voir scripts/local-dev/README.md.
DONE
