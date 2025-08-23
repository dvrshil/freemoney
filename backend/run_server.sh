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
