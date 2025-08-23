import os
import asyncio
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, Field

from .real_browser import send_message_with_browser


class SendMessagesItem(BaseModel):
    x_url: HttpUrl = Field(..., description="Profile or DM URL on X")
    personal_message: str = Field(..., min_length=1, description="Message to send")


class BatchItemResult(BaseModel):
    id: str
    status: str
    detail: Optional[str] = None


class SendMessagesBatchResponse(BaseModel):
    results: list[BatchItemResult]


app = FastAPI(title="Real Browser Messaging API", version="0.1.0")

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
    for item in items:
        x_url = str(item.x_url)
        try:
            await send_message_with_browser(
                x_url=x_url,
                personal_message=item.personal_message,
                model=model,
                azure_api_key=azure_api_key,
                azure_endpoint=azure_endpoint,
                chrome_executable_path=chrome_executable_path,
                chrome_user_data_dir=chrome_user_data_dir,
            )
            results.append(BatchItemResult(id=x_url, status="ok"))
        except Exception as e:  # noqa: BLE001
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
