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

// No query overrides are supported; settings are hardcoded in the backend.
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
Provide only the OpenAI key via `.env` in `backend/` (or the process environment):

- OPENAI_API_KEY (required)

Everything else is hardcoded for local development:
- Model: `gpt-4o-mini`
- Chrome executable: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- Chrome user data dir: `~/.config/browseruse/profiles/real-chrome`

The server still defaults to CORS origin `http://localhost:3000` and port `8000` inside the code.

See `.env.example` for the list without values.

## Chrome Profile Setup (macOS example)
1. Close Chrome.
2. Copy your profile for `browser-use`:
   ```bash
   mkdir -p ~/.config/browseruse/profiles \
     && cp -r "~/Library/Application Support/Google/Chrome" ~/.config/browseruse/profiles/real-chrome
   ```
3. The backend uses hardcoded paths shown above. If your Chrome path/profile differs,
   update `DEFAULT_CHROME_EXECUTABLE` or `DEFAULT_USER_DATA_DIR` in `backend/real_browser.py`.

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
