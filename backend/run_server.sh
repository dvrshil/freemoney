#!/usr/bin/env bash
set -euo pipefail

# Simple runner that:
# 1) Creates a virtualenv in backend/.venv if missing
# 2) Installs requirements
# 3) Starts the FastAPI app on PORT (default 8000)

here="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
cd "$here"

PORT="${PORT:-8000}"
PY="${PYTHON:-python3}"
VENV_DIR="${VENV_DIR:-.venv}"

# Load dotenv from backend/.env (now expected to only contain OPENAI_API_KEY)
ENV_FILE="${ENV_FILE:-.env}"
if [ -f "$ENV_FILE" ]; then
  echo "[setup] Loading $ENV_FILE"
  # shellcheck source=/dev/null
  set -a && source "$ENV_FILE" && set +a
fi

# If OPENAI_API_KEY not set yet, try to read it from project root .env.local
if [ -z "${OPENAI_API_KEY:-}" ] && [ -f "$here/../.env.local" ]; then
  candidate_line="$(grep -E '^[[:space:]]*OPENAI_API_KEY[[:space:]]*=' "$here/../.env.local" | tail -n1)"
  if [ -n "$candidate_line" ]; then
    echo "[setup] Loading OPENAI_API_KEY from ../.env.local"
    set -a
    # shellcheck disable=SC1090
    source <(printf '%s\n' "$candidate_line")
    set +a
  fi
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "[warn] OPENAI_API_KEY is not set. Browser DM automation will fail until provided."
fi

FIRST_SETUP=0
if [ ! -d "$VENV_DIR" ]; then
  echo "[setup] Creating virtualenv at $VENV_DIR"
  "$PY" -m venv "$VENV_DIR"
  FIRST_SETUP=1
fi

if [ -z "${VIRTUAL_ENV:-}" ]; then
  # shellcheck source=/dev/null
  source "$VENV_DIR/bin/activate"
fi

echo "[setup] Using Python: $(python -V)"

if [ "$FIRST_SETUP" -eq 1 ] || [ "${FORCE_INSTALL:-0}" = "1" ]; then
  echo "[setup] Installing requirements"
  pip install --upgrade pip
  pip install -r requirements.txt
else
  echo "[setup] Existing venv detected; skipping install (set FORCE_INSTALL=1 to reinstall)"
fi

echo "[run] Starting FastAPI on port $PORT"
# Change directory to parent directory so 'backend' is available as a module
cd ..
exec uvicorn backend.main:app --host 0.0.0.0 --port "$PORT"
