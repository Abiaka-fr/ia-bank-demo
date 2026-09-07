#!/usr/bin/env bash
#
# Démarre le backend de Thư en local sur la base SQLite de développement.
#
# `backend/` reste en lecture seule : rien n'est écrit sous cette arborescence. Le
# paquet n'est pas installé, on ajoute simplement `backend/` au PYTHONPATH, et toute la
# configuration passe par des variables d'environnement — `app/config.py` les lit avant
# de chercher un fichier `.env` (qui, lui, appartient à Thư).
#
# Prérequis : ./scripts/local-dev/setup-backend.sh exécuté une fois.
#
# Usage :
#   ./scripts/local-dev/run-backend.sh          # port 8000
#   PORT=8010 ./scripts/local-dev/run-backend.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

VENV_PY="$REPO_ROOT/.venv-backend/bin/python"
DEV_DB="$REPO_ROOT/.local/backend-dev.sqlite"

if [ ! -x "$VENV_PY" ] || [ ! -f "$DEV_DB" ]; then
  echo "Environnement local absent. Lancer d'abord :" >&2
  echo "    ./scripts/local-dev/setup-backend.sh" >&2
  exit 1
fi

export PYTHONPATH="$REPO_ROOT/backend"
export DATABASE_URL="sqlite:///$DEV_DB"

# `echo=settings.debug` dans app/db/session.py : à `true`, SQLAlchemy journalise chaque
# requête SQL et la console devient illisible.
export DEBUG="false"

# Secret de signature JWT. Valeur fixe en local pour qu'un redémarrage du serveur
# n'invalide pas la session ouverte dans le navigateur. Développement uniquement.
export SECRET_KEY="${SECRET_KEY:-local-dev-secret-not-for-production}"

# Le frontend Next tourne sur 3000 (3001 en repli si le port est pris).
export CORS_ORIGINS='["http://localhost:3000","http://localhost:3001"]'

PORT="${PORT:-8000}"

echo "Backend    : http://localhost:$PORT"
echo "Swagger    : http://localhost:$PORT/docs"
echo "Base       : .local/backend-dev.sqlite (copie de travail, jamais la référence)"
echo "Connexion  : marie.lefevre@iabank.fr / demo1234"
echo

exec "$VENV_PY" -m uvicorn app.main:app --reload --port "$PORT" --app-dir "$REPO_ROOT/backend"
