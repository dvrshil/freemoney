import asyncio
import os
import logging
from typing import Optional

from dotenv import load_dotenv
from browser_use import Agent, BrowserProfile, BrowserSession, ChatOpenAI

# Load environment variables from a local .env file if present
load_dotenv()


def _build_prompt(x_url: str, personal_message: str) -> str:
    return (
        "\n".join(
            [
                f"1. Visit {x_url}",
                "2. press the message icon from the top right corner",
                f"3. send message `{personal_message}` and press enter to send",
            ]
        )
        + "\n"
    )


async def send_message_with_browser(
    x_url: str,
    personal_message: str,
    *,
    model: Optional[str] = None,
    azure_api_key: Optional[str] = None,
    azure_endpoint: Optional[str] = None,
    chrome_executable_path: Optional[str] = None,
    chrome_user_data_dir: Optional[str] = None,
) -> None:
    """
    Use BrowserUse + Azure OpenAI to automate sending a DM on X.

    Parameters are primarily read from environment variables if not explicitly passed:
      - AZURE_OPENAI_API_KEY
      - AZURE_OPENAI_ENDPOINT
      - AZURE_OPENAI_MODEL (defaults to "gpt-5-mini")
      - BROWSER_EXECUTABLE_PATH (defaults to a macOS Chrome path)
      - BROWSER_USER_DATA_DIR (defaults to ~/.config/browseruse/profiles/real-chrome)
    """

    # Resolve configuration from args or environment variables
    load_dotenv()

    # Resolve Chrome settings
    chrome_executable_path = chrome_executable_path or os.getenv(
        "BROWSER_EXECUTABLE_PATH",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    )
    chrome_user_data_dir = chrome_user_data_dir or os.getenv(
        "BROWSER_USER_DATA_DIR", "~/.config/browseruse/profiles/real-chrome"
    )
    chrome_user_data_dir = os.path.expanduser(chrome_user_data_dir)

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

    # LLM configuration. Prefer explicit OpenAI API key. Azure is not wired through
    # browser_use's ChatOpenAI yet in this project.
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is not set for backend real browser agent."
        )

    if not model:
        # Allow override through env var if not passed via query param
        model = os.getenv("AZURE_OPENAI_MODEL") or os.getenv("OPENAI_MODEL")

    logging.info(
        "Launching BrowserUse agent: model=%s, target=%s, profile=%s",
        model or "<library default>",
        x_url,
        chrome_user_data_dir,
    )

    agent = Agent(
        llm=ChatOpenAI(
            model=model,  # Let library default if None
            api_key=openai_api_key,
        ),
        task=prompt,
        browser_session=browser_session,
    )

    await agent.run()


async def _main_example():
    # Example manual run using env vars and defaults
    x_url = os.getenv("X_TARGET_URL", "https://x.com/dvrshil")
    personal_message = os.getenv("X_MESSAGE", "hello from the other side")
    await send_message_with_browser(x_url=x_url, personal_message=personal_message)


if __name__ == "__main__":
    asyncio.run(_main_example())
