import os
import asyncio
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
try:
    # Pydantic v2
    from pydantic import ConfigDict  # type: ignore
except Exception:  # pragma: no cover - fallback for older pydantic
    ConfigDict = None  # type: ignore

from .real_browser import send_message_with_browser


class SendMessagesItem(BaseModel):
    """Flexible payload that accepts either frontend or backend field names.

    Supported keys (all optional at parsing time; validated in handler):
      - twitterUrl (preferred, from frontend)
      - message (preferred, from frontend)
      - x_url (legacy)
      - twitter_url (alias variant)
      - personal_message (legacy)
    """

    # Frontend keys
    twitterUrl: Optional[str] = None
    message: Optional[str] = None

    # Backend / alt keys
    x_url: Optional[str] = None
    twitter_url: Optional[str] = None
    personal_message: Optional[str] = None

    if ConfigDict is not None:
        model_config = ConfigDict(extra="ignore")  # type: ignore[assignment]
    else:
        class Config:  # type: ignore[no-redef]
            extra = "ignore"

    def normalized(self) -> tuple[str, str]:
        url = (self.twitterUrl or self.twitter_url or self.x_url or "").strip()
        msg = (self.message or self.personal_message or "").strip()
        if not url:
            raise ValueError("Missing URL (twitterUrl or x_url)")
        if not msg:
            raise ValueError("Missing message (message or personal_message)")
        return url, msg


class BatchItemResult(BaseModel):
    id: str
    status: str
    detail: Optional[str] = None


class SendMessagesBatchResponse(BaseModel):
    results: list[BatchItemResult]


app = FastAPI(title="Real Browser Messaging API", version="0.1.0")

# Basic logging so we see failures in server logs (not only 200 OK)
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

# Allow local dev from Next.js on :3000 by default.
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/send-messages", response_model=SendMessagesBatchResponse)
async def send_messages(
    items: list[SendMessagesItem],
    model: Optional[str] = Query(None, description="Azure OpenAI deployment/model name"),
    azure_api_key: Optional[str] = Query(None, description="Azure OpenAI API key override"),
    azure_endpoint: Optional[str] = Query(None, description="Azure OpenAI endpoint override"),
    chrome_executable_path: Optional[str] = Query(None, description="Path to Chrome executable"),
    chrome_user_data_dir: Optional[str] = Query(None, description="Browser user-data-dir for Chrome profile"),
) -> SendMessagesBatchResponse:
    results: list[BatchItemResult] = []
    logging.info("/send-messages: received %d item(s)", len(items))
    for item in items:
        try:
            x_url, personal_message = item.normalized()
        except Exception as e:  # noqa: BLE001
            # Could not normalize this item; report error and continue
            logging.error("Validation error for item: %s", e)
            results.append(BatchItemResult(id="<unknown>", status="error", detail=str(e)))
            continue

        try:
            await send_message_with_browser(
                x_url=x_url,
                personal_message=personal_message,
                model=model,
                azure_api_key=azure_api_key,
                azure_endpoint=azure_endpoint,
                chrome_executable_path=chrome_executable_path,
                chrome_user_data_dir=chrome_user_data_dir,
            )
            results.append(BatchItemResult(id=x_url, status="ok"))
        except Exception as e:  # noqa: BLE001
            # Log full traceback so server console shows why the browser/LLM run failed
            logging.exception("Failed to send message for %s: %s", x_url, e)
            results.append(BatchItemResult(id=x_url, status="error", detail=str(e)))
    return SendMessagesBatchResponse(results=results)


def _run_blocking(host: str = "0.0.0.0", port: int = 8000, reload: bool = False) -> None:
    """Convenience for `python -m backend.main`. Not used by uvicorn directly."""
    import uvicorn

    uvicorn.run("main:app", host=host, port=port, reload=reload)


if __name__ == "__main__":
    # Allow quick local run: python -m backend.main
    port = int(os.getenv("PORT", "8000"))
    _run_blocking(port=port, reload=bool(os.getenv("DEV", "")))
