#!/usr/bin/env bash
#
# Expose le frontend ET le backend sur Internet via Tailscale Funnel (HTTPS public).
#
#   Frontend : https://<machine>.<tailnet>.ts.net          (port public 443  -> 127.0.0.1:3000)
#   Backend  : https://<machine>.<tailnet>.ts.net:8443     (port public 8443 -> 127.0.0.1:8000)
#
# Comme run-backend.sh, rien n'est écrit sous `backend/` : le backend tourne sur la copie
# SQLite `.local/backend-dev.sqlite`, jamais sur la base Neon partagée de Thư.
#
# Prérequis (une fois) :
#   - ./scripts/local-dev/setup-backend.sh
#   - cd frontend && pnpm install
#   - Funnel activé sur le tailnet (admin console Tailscale) et droit d'opérateur :
#       sudo tailscale set --operator=$USER
#
# Usage :
#   ./scripts/local-dev/run-public.sh          # build + démarrage, Ctrl+C pour tout arrêter
#   SKIP_BUILD=1 ./scripts/local-dev/run-public.sh
#   # Frontend déployé ailleurs (Vercel) qui appelle ce backend : autoriser son origine
#   EXTRA_CORS_ORIGINS="https://mon-projet.vercel.app" ./scripts/local-dev/run-public.sh
#
# Données : `.local/backend-dev.sqlite`. Pour y recopier la base Neon (lecture seule) :
#   scripts/local-dev/clone_neon_to_sqlite.py
#
# ⚠️ Les comptes de démo (mot de passe `demo1234`) deviennent utilisables par n'importe qui
# connaissant l'URL. Couper avec Ctrl+C (qui retire aussi la config Funnel) après la démo.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

VENV_PY="$REPO_ROOT/.venv-backend/bin/python"
DEV_DB="$REPO_ROOT/.local/backend-dev.sqlite"
FRONTEND_PORT=3000
BACKEND_PORT=8000
BACKEND_PUBLIC_PORT=8443

if [ ! -x "$VENV_PY" ] || [ ! -f "$DEV_DB" ]; then
  echo "Environnement local absent. Lancer d'abord : ./scripts/local-dev/setup-backend.sh" >&2
  exit 1
fi
command -v pnpm >/dev/null || { echo "pnpm introuvable dans le PATH." >&2; exit 1; }

# Une seconde instance échouerait au démarrage, et son nettoyage couperait la config Funnel
# de la première : on s'arrête avant d'installer le trap.
for port in "$FRONTEND_PORT" "$BACKEND_PORT"; do
  if ss -ltn "sport = :$port" | grep -q LISTEN; then
    echo "Port $port déjà utilisé (démo déjà lancée ?). Arrêter l'autre instance d'abord." >&2
    exit 1
  fi
done

HOST="$(tailscale status --json | "$VENV_PY" -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
FRONTEND_URL="https://$HOST"
BACKEND_URL="https://$HOST:$BACKEND_PUBLIC_PORT"

# Secret JWT aléatoire, conservé dans .local/ (gitignoré) : le serveur est public, la
# valeur fixe de run-backend.sh ne convient pas, mais un redémarrage ne doit pas
# déconnecter les utilisateurs.
SECRET_FILE="$REPO_ROOT/.local/public-secret-key"
[ -f "$SECRET_FILE" ] || "$VENV_PY" -c 'import secrets; print(secrets.token_urlsafe(48))' > "$SECRET_FILE"

# --- Frontend : build de production (NEXT_PUBLIC_* est figé au build) ------------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  echo "Build du frontend (NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL) …"
  (cd frontend && NEXT_PUBLIC_BACKEND_URL="$BACKEND_URL" pnpm build)
fi

PIDS=()
cleanup() {
  echo; echo "Arrêt : retrait de la config Funnel et des serveurs …"
  tailscale funnel --https=443 off >/dev/null 2>&1 || true
  tailscale funnel --https="$BACKEND_PUBLIC_PORT" off >/dev/null 2>&1 || true
  kill "${PIDS[@]}" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# --- Backend ------------------------------------------------------------------
PYTHONPATH="$REPO_ROOT/backend" \
DATABASE_URL="sqlite:///$DEV_DB" \
DEBUG="false" \
SECRET_KEY="$(cat "$SECRET_FILE")" \
CORS_ORIGINS="$(EXTRA="${EXTRA_CORS_ORIGINS:-}" "$VENV_PY" -c 'import json,os,sys; print(json.dumps(sys.argv[1:] + os.environ["EXTRA"].split()))' "$FRONTEND_URL" "http://localhost:$FRONTEND_PORT")" \
  "$VENV_PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT" \
    --app-dir "$REPO_ROOT/backend" --proxy-headers &
PIDS+=($!)

# --- Frontend -----------------------------------------------------------------
(cd frontend && exec pnpm start --hostname 127.0.0.1 --port "$FRONTEND_PORT") &
PIDS+=($!)

# --- Funnel -------------------------------------------------------------------
tailscale funnel --bg --https=443 "http://127.0.0.1:$FRONTEND_PORT"
tailscale funnel --bg --https="$BACKEND_PUBLIC_PORT" "http://127.0.0.1:$BACKEND_PORT"

cat <<EOF

Frontend : $FRONTEND_URL
Backend  : $BACKEND_URL      (Swagger : $BACKEND_URL/docs)
Connexion: marie.lefevre@iabank.fr / demo1234
Ctrl+C pour tout arrêter.
EOF

wait -n "${PIDS[@]}"
