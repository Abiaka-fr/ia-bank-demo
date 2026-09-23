# Choix de la base du backend, partagé par run-backend.sh et run-public.sh (à sourcer
# après avoir défini REPO_ROOT, VENV_PY et DEV_DB). Exporte DATABASE_URL, DB_LABEL et
# OPENROUTER_API_KEY (lue dans `backend/.env` quelle que soit la base, sauf si déjà définie).
#
#   DB_TARGET=cloud (défaut) : base Neon, URL lue dans `backend/.env` (lecture seule).
#   DB_TARGET=local          : copie SQLite `.local/backend-dev.sqlite`.
#
# `backend/.env` doit être lu ici : les scripts lancent uvicorn depuis la racine du dépôt,
# où le `env_file=".env"` de app/config.py ne le trouverait pas.

read_backend_env() {
  "$VENV_PY" -c 'from dotenv import dotenv_values; import sys; print(dotenv_values(sys.argv[1]).get(sys.argv[2]) or "")' \
    "$REPO_ROOT/backend/.env" "$1"
}

# Clé LLM des routes d'extraction/d'analyse : sans elle, ces routes répondent 400.
OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-$(read_backend_env OPENROUTER_API_KEY)}"
[ -n "$OPENROUTER_API_KEY" ] || echo "Avertissement : OPENROUTER_API_KEY absente — extraction/analyse IA indisponibles (400)." >&2

DB_TARGET="${DB_TARGET:-cloud}"

case "$DB_TARGET" in
  cloud)
    DATABASE_URL="$(read_backend_env DATABASE_URL)"
    if [ -z "$DATABASE_URL" ]; then
      echo "DATABASE_URL absente de backend/.env : impossible d'utiliser la base cloud (DB_TARGET=local pour SQLite)." >&2
      exit 1
    fi
    # Seul psycopg 3 est installé ; `postgresql://` désignerait psycopg2.
    DATABASE_URL="${DATABASE_URL/#postgresql:\/\//postgresql+psycopg://}"
    # Hôte seul : l'URL complète contient le mot de passe.
    DB_LABEL="cloud Neon ($(sed -E 's#^[^@]*@([^/:?]+).*#\1#' <<<"$DATABASE_URL"))"
    ;;
  local)
    if [ ! -f "$DEV_DB" ]; then
      echo "Base locale absente. Lancer d'abord : ./scripts/local-dev/setup-backend.sh" >&2
      exit 1
    fi
    DATABASE_URL="sqlite:///$DEV_DB"
    DB_LABEL="local SQLite (.local/backend-dev.sqlite)"
    ;;
  *)
    echo "DB_TARGET invalide : '$DB_TARGET' (attendu : cloud ou local)." >&2
    exit 1
    ;;
esac

export DATABASE_URL DB_LABEL OPENROUTER_API_KEY
