import asyncio
import os
import sys

sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from dotenv import load_dotenv

load_dotenv()

from browser_use import Agent, BrowserProfile, BrowserSession, ChatAzureOpenAI

# SETUP: First copy your real Chrome profile (close Chrome first, then run):
# Mac:
# mkdir -p ~/.config/browseruse/profiles && cp -r ~/Library/Application\ Support/Google/Chrome ~/.config/browseruse/profiles/real-chrome

browser_profile = BrowserProfile(
    executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    user_data_dir="~/.config/browseruse/profiles/real-chrome",
)
browser_session = BrowserSession(browser_profile=browser_profile)

prompt = """
1. Visit https://x.com/explore
2. search for '@dvrshil' profile, and then click on the profile from the dropdown
3. press the message icon and send message `hello from the other side` and press send
"""


async def main():
    agent = Agent(
        llm=ChatAzureOpenAI(
            model="gpt-5-mini",
            api_key=api_key,
            azure_endpoint=azure_endpoint,
            reasoning_effort="minimal",
        ),
        task=prompt,
        browser_session=browser_session,
    )
    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
