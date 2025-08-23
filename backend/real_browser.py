import asyncio
import os
from typing import Optional

from dotenv import load_dotenv
from browser_use import Agent, BrowserProfile, BrowserSession, ChatAzureOpenAI

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
    # set env from .env
    load_dotenv()
    model = model or os.getenv("AZURE_OPENAI_MODEL", "gpt-5-mini")
    azure_api_key = azure_api_key or os.getenv("AZURE_OPENAI_API_KEY")
    azure_endpoint = azure_endpoint or os.getenv("AZURE_OPENAI_ENDPOINT")

    chrome_executable_path = chrome_executable_path or os.getenv(
        "BROWSER_EXECUTABLE_PATH",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    )
    chrome_user_data_dir = chrome_user_data_dir or os.getenv(
        "BROWSER_USER_DATA_DIR", "~/.config/browseruse/profiles/real-chrome"
    )

    if not azure_api_key or not azure_endpoint:
        raise RuntimeError(
            "Missing Azure OpenAI configuration. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT."
        )

    browser_profile = BrowserProfile(
        executable_path=chrome_executable_path,
        user_data_dir=chrome_user_data_dir,
    )
    browser_session = BrowserSession(browser_profile=browser_profile)

    prompt = _build_prompt(x_url=x_url, personal_message=personal_message)

    agent = Agent(
        llm=ChatAzureOpenAI(
            model=model,
            api_key=azure_api_key,
            azure_endpoint=azure_endpoint,
            reasoning_effort="minimal",
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
