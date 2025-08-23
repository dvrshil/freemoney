# Real Browser Messaging API (FastAPI)

This backend wraps `backend/real_browser.py` with a FastAPI server exposing a batch endpoint to send messages via a real Chrome profile using the `browser-use` agent.

## Endpoints
- POST `/send-messages`: Triggers a browser automation task to open X (Twitter) profile/DMs and send messages for a batch.
- GET `/health`: Health check.

## Request Body
```
POST /send-messages
Content-Type: application/json
// Preferred (matches frontend):
[
  { "twitterUrl": "https://x.com/target1", "message": "hello one" },
  { "twitterUrl": "https://x.com/target2", "message": "hello two" }
]

// Also supported (backwards compatible):
[
  { "x_url": "https://x.com/target1", "personal_message": "hello one" },
  { "x_url": "https://x.com/target2", "personal_message": "hello two" }
]

// Optional overrides can be passed as query params for the whole batch:
//   ?model=gpt-5-mini&azure_endpoint=...&chrome_executable_path=...
```

## Response
```
200 OK
{
  "results": [
    { "id": "https://x.com/target1", "status": "ok" },
    { "id": "https://x.com/target2", "status": "error", "detail": "<reason>" }
  ]
}
```

## Environment Variables
Provide these via `.env` in `backend/` (or the project root), or the process environment:

- OPENAI_API_KEY (required)
- OPENAI_MODEL (optional, fallback if no `model` query param)
- BROWSER_EXECUTABLE_PATH (default: macOS Chrome path)
- BROWSER_USER_DATA_DIR (default: `~/.config/browseruse/profiles/real-chrome`)
- FRONTEND_ORIGIN (default: `http://localhost:3000` for local CORS)
- PORT (default: `8000`)

Note: The current implementation wires `browser_use` with OpenAI. Azure variables
(`AZURE_OPENAI_*`) are not consumed yet.

See `.env.example` for the list without values.

## Chrome Profile Setup (macOS example)
1. Close Chrome.
2. Copy your profile for `browser-use`:
   ```bash
   mkdir -p ~/.config/browseruse/profiles \
     && cp -r "~/Library/Application Support/Google/Chrome" ~/.config/browseruse/profiles/real-chrome
   ```
3. Ensure `BROWSER_EXECUTABLE_PATH` and `BROWSER_USER_DATA_DIR` match your environment.

## Install & Run
From project root or `backend/`:

- One-liner with auto-venv:
  ```bash
  bash backend/run_server.sh
  ```
  - Creates `backend/.venv` if missing
  - Installs `backend/requirements.txt`
  - Serves FastAPI on `http://localhost:8000` by default

- Manual commands:
  ```bash
  cd backend
  python3 -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  uvicorn backend.main:app --host 0.0.0.0 --port 8000
  ```

## Notes
- Secrets must not be committed. Use `.env` locally and deployment secret managers in production.
- This server uses CORS for the configured `FRONTEND_ORIGIN` to allow local Next.js dev on `:3000`.
- The `browser-use` library drives a real browser; ensure system Chrome is installed and accessible.
