import asyncio
import os
import logging
import json
from typing import Optional, Set

from dotenv import load_dotenv
from browser_use import Agent, BrowserProfile, BrowserSession, ChatOpenAI

# Load environment variables from a local .env file if present
load_dotenv()

# File to track sent messages
SENT_URLS_FILE = os.path.join(os.path.dirname(__file__), "sent_urls.json")


def _load_sent_urls() -> Set[str]:
    """Load the set of URLs that have already been sent messages."""
    try:
        if os.path.exists(SENT_URLS_FILE):
            with open(SENT_URLS_FILE, 'r') as f:
                return set(json.load(f))
        return set()
    except Exception as e:
        logging.warning(f"Could not load sent URLs file: {e}")
        return set()


def _save_sent_url(x_url: str) -> None:
    """Save a URL to the sent URLs file."""
    try:
        sent_urls = _load_sent_urls()
        sent_urls.add(x_url)
        with open(SENT_URLS_FILE, 'w') as f:
            json.dump(list(sent_urls), f, indent=2)
        logging.info(f"Saved sent URL: {x_url}")
    except Exception as e:
        logging.error(f"Could not save sent URL {x_url}: {e}")


def _has_sent_to_url(x_url: str) -> bool:
    """Check if we have already sent a message to this URL."""
    return x_url in _load_sent_urls()


def _build_prompt(x_url: str, personal_message: str) -> str:
    return (
        "\n".join(
            [
                f"1. Visit {x_url}",
                "2. press the message icon from the top middle of their profile. NOT THE ONE ON THE LEFT SIDEBAR!",
                f"3. send message `{personal_message}` and press enter to send",
                "Never wait for a response. Just send the message and move on."
            ]
        )
        + "\n"
    )


DEFAULT_CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
DEFAULT_USER_DATA_DIR = os.path.expanduser("~/.config/browseruse/profiles/real-chrome")
DEFAULT_MODEL = "gpt-5-mini"


async def send_message_with_browser(
    x_url: str,
    personal_message: str,
    *,
    model: str = DEFAULT_MODEL,
    chrome_executable_path: Optional[str] = None,
    chrome_user_data_dir: Optional[str] = None,
) -> None:
    """
    Use BrowserUse + OpenAI to automate sending a DM on X.

    All settings are hardcoded here for simplicity, except the OpenAI key
    which must be provided via environment (`OPENAI_API_KEY`).
    """

    # Check if we've already sent a message to this URL
    if _has_sent_to_url(x_url):
        logging.info(f"Skipping {x_url} - already sent a message to this URL")
        return

    # Load only to pick up OPENAI_API_KEY; other settings are hardcoded.
    load_dotenv()

    # Resolve Chrome settings using hardcoded defaults unless explicitly overridden
    chrome_executable_path = chrome_executable_path or DEFAULT_CHROME_EXECUTABLE
    chrome_user_data_dir = os.path.expanduser(
        chrome_user_data_dir or DEFAULT_USER_DATA_DIR
    )

    if not os.path.exists(chrome_executable_path):
        raise RuntimeError(
            f"Chrome executable not found at '{chrome_executable_path}'. Set BROWSER_EXECUTABLE_PATH."
        )

    # Ensure profile dir exists so BrowserUse doesn't fail on first launch
    os.makedirs(chrome_user_data_dir, exist_ok=True)

    browser_profile = BrowserProfile(
        executable_path=chrome_executable_path,
        user_data_dir=chrome_user_data_dir,
    )
    browser_session = BrowserSession(browser_profile=browser_profile)

    prompt = _build_prompt(x_url=x_url, personal_message=personal_message)

    # LLM configuration: Only OPENAI_API_KEY is required
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set for backend real browser agent.")

    logging.info(
        "Launching BrowserUse agent: model=%s, target=%s, profile=%s",
        model or "<library default>",
        x_url,
        chrome_user_data_dir,
    )

    agent = Agent(
        llm=ChatOpenAI(
            model=model,
            api_key=openai_api_key,
            reasoning_effort="minimal"
        ),
        task=prompt,
        browser_session=browser_session,
    )

    await agent.run()
    
    # Save the URL to prevent duplicate messages
    _save_sent_url(x_url)


async def _main_example():
    # Example manual run using env vars and defaults
    x_url = os.getenv("X_TARGET_URL", "https://x.com/dvrshil")
    personal_message = os.getenv("X_MESSAGE", "hello from the other side")
    await send_message_with_browser(x_url=x_url, personal_message=personal_message)


if __name__ == "__main__":
    asyncio.run(_main_example())
