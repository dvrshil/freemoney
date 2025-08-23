#!/usr/bin/env python3
"""
Safe Twitter DM Permission Checker

This script checks DM permissions for Bay Area investors using Twitter's GraphQL API
with rate limiting, error handling, and progress tracking for account safety.
"""

import json
import time
import random
import re
import logging
import requests
from urllib.parse import quote
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import os


class TwitterDMChecker:
    def __init__(self, config_file: str = "twitter_config.json"):
        """Initialize the Twitter DM checker with configuration."""
        self.config_file = config_file
        self.config = self._load_config()
        self.session = requests.Session()
        self.progress_file = "dm_check_progress.json"
        self.results_file = "bay_area_investors_with_open_dms.json"
        self.errors_log = "dm_check_errors.log"
        
        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(self.errors_log),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # Rate limiting settings
        self.min_delay = self.config.get('min_delay', 1)
        self.max_delay = self.config.get('max_delay', 10)
        self.max_daily_requests = self.config.get('max_daily_requests', 300)
        self.requests_today = 0
        
        # Setup session headers
        self._setup_session()
        
        # Load progress if exists
        self.progress = self._load_progress()
        
    def _load_config(self) -> Dict:
        """Load configuration from JSON file."""
        if not os.path.exists(self.config_file):
            # Create default config template
            default_config = {
                "bearer_token": "YOUR_BEARER_TOKEN",
                "cookies": {
                    "auth_token": "YOUR_AUTH_TOKEN",
                    "ct0": "YOUR_CSRF_TOKEN",
                    "twid": "YOUR_TWID"
                },
                "csrf_token": "YOUR_CSRF_TOKEN",
                "min_delay": 2,
                "max_delay": 8,
                "max_daily_requests": 300,
                "test_mode": True,
                "test_batch_size": 10
            }
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            self.logger.error(f"Created config template at {self.config_file}. Please fill in your authentication details.")
            raise SystemExit("Please configure authentication details in twitter_config.json")
        
        with open(self.config_file, 'r') as f:
            return json.load(f)
    
    def _setup_session(self):
        """Setup requests session with headers and cookies."""
        # Set headers to mimic browser
        self.session.headers.update({
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'authorization': f'Bearer {self.config["bearer_token"]}',
            'content-type': 'application/json',
            'dnt': '1',
            'priority': 'u=1, i',
            'referer': 'https://x.com/',
            'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
            'x-csrf-token': self.config["csrf_token"],
            'x-twitter-active-user': 'no',
            'x-twitter-auth-type': 'OAuth2Session',
            'x-twitter-client-language': 'en'
        })
        
        # Set cookies
        for name, value in self.config["cookies"].items():
            self.session.cookies.set(name, value)
    
    def _load_progress(self) -> Dict:
        """Load progress from checkpoint file."""
        if os.path.exists(self.progress_file):
            with open(self.progress_file, 'r') as f:
                return json.load(f)
        return {
            "completed": [],
            "failed": [],
            "results": [],
            "last_checkpoint": None,
            "requests_today": 0,
            "start_time": datetime.now().isoformat()
        }
    
    def _save_progress(self):
        """Save current progress to checkpoint file."""
        self.progress["last_checkpoint"] = datetime.now().isoformat()
        self.progress["requests_today"] = self.requests_today
        
        with open(self.progress_file, 'w') as f:
            json.dump(self.progress, f, indent=2)
        
        # Also save current results
        if self.progress["results"]:
            with open(self.results_file, 'w') as f:
                json.dump(self.progress["results"], f, indent=2)
    
    def extract_username_from_url(self, twitter_url: str) -> Optional[str]:
        """Extract username from Twitter URL."""
        if not twitter_url:
            return None
            
        # Handle both twitter.com and x.com URLs
        patterns = [
            r'(?:twitter\.com|x\.com)/([^/?]+)',
            r'@([A-Za-z0-9_]+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, twitter_url)
            if match:
                username = match.group(1)
                # Remove any query parameters or fragments
                username = username.split('?')[0].split('#')[0]
                return username
        
        return None
    
    def build_graphql_url(self, username: str) -> str:
        """Build the GraphQL URL for checking user DM permissions."""
        variables = {
            "screen_name": username,
            "withGrokTranslatedBio": True
        }
        
        features = {
            "hidden_profile_subscriptions_enabled": True,
            "payments_enabled": False,
            "rweb_xchat_enabled": False,
            "profile_label_improvements_pcf_label_in_post_enabled": True,
            "rweb_tipjar_consumption_enabled": True,
            "verified_phone_label_enabled": False,
            "subscriptions_verification_info_is_identity_verified_enabled": True,
            "subscriptions_verification_info_verified_since_enabled": True,
            "highlights_tweets_tab_ui_enabled": True,
            "responsive_web_twitter_article_notes_tab_enabled": True,
            "subscriptions_feature_can_gift_premium": True,
            "creator_subscriptions_tweet_preview_api_enabled": True,
            "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
            "responsive_web_graphql_timeline_navigation_enabled": True
        }
        
        field_toggles = {
            "withAuxiliaryUserLabels": True
        }
        
        base_url = "https://x.com/i/api/graphql/ck5KkZ8t5cOmoLssopN99Q/UserByScreenName"
        url = f"{base_url}?variables={quote(json.dumps(variables))}&features={quote(json.dumps(features))}&fieldToggles={quote(json.dumps(field_toggles))}"
        
        return url
    
    def check_dm_permission(self, username: str) -> Tuple[bool, Optional[bool], Optional[str]]:
        """
        Check if a user has open DMs.
        
        Returns:
            (success, can_dm, error_message)
        """
        try:
            url = self.build_graphql_url(username)
            
            # Add some randomization to headers
            self.session.headers['x-client-transaction-id'] = f"{random.randint(10000000000000000, 99999999999999999)}"
            
            response = self.session.get(url, timeout=30)
            self.requests_today += 1
            
            if response.status_code == 200:
                data = response.json()
                
                # Check for errors in response
                if 'errors' in data:
                    error_msg = data['errors'][0].get('message', 'Unknown error')
                    self.logger.warning(f"API error for {username}: {error_msg}")
                    return False, None, error_msg
                
                # Extract DM permissions
                user_result = data.get('data', {}).get('user', {}).get('result', {})
                dm_perms = user_result.get('dm_permissions', {})
                can_dm = dm_perms.get('can_dm', False)
                
                self.logger.info(f"✅ {username}: can_dm = {can_dm}")
                return True, can_dm, None
                
            elif response.status_code == 429:
                self.logger.warning(f"Rate limited! Waiting longer...")
                return False, None, "Rate limited"
                
            else:
                error_msg = f"HTTP {response.status_code}"
                self.logger.error(f"HTTP error for {username}: {error_msg}")
                return False, None, error_msg
                
        except Exception as e:
            error_msg = str(e)
            self.logger.error(f"Exception checking {username}: {error_msg}")
            return False, None, error_msg
    
    def smart_delay(self, is_error: bool = False, is_rate_limited: bool = False):
        """Implement smart delays with backoff."""
        if is_rate_limited:
            # Long delay for rate limiting
            delay = random.randint(60, 120)
            self.logger.info(f"Rate limited - waiting {delay} seconds...")
        elif is_error:
            # Medium delay for errors
            delay = random.randint(5, 15)
            self.logger.info(f"Error occurred - waiting {delay} seconds...")
        else:
            # Normal random delay
            delay = random.uniform(self.min_delay, self.max_delay)
            
            # Add occasional longer pauses to seem more human (less frequent, shorter)
            if random.random() < 0.05:  # 5% chance (reduced from 10%)
                delay += random.randint(5, 15)  # 5-15 seconds (reduced from 15-45)
                self.logger.info(f"Taking longer break: {delay:.1f} seconds")
        
        time.sleep(delay)
    
    def load_investors(self) -> List[Dict]:
        """Load investor data from JSON file."""
        with open('/Users/georgepickett/freemoney/investors_data/bay_area_investors.json', 'r') as f:
            return json.load(f)
    
    def run_check(self, test_mode: bool = None, batch_size: int = None):
        """Run the DM permission check for all investors."""
        investors = self.load_investors()
        
        # Override with config values if not specified
        if test_mode is None:
            test_mode = self.config.get('test_mode', True)
        if batch_size is None:
            batch_size = self.config.get('test_batch_size', 10)
        
        if test_mode:
            self.logger.info(f"🧪 Running in TEST MODE - checking only {batch_size} investors")
            investors = investors[:batch_size]
        else:
            self.logger.info(f"🚀 Running FULL MODE - checking all {len(investors)} investors")
        
        # Filter out already completed
        completed_usernames = set(self.progress["completed"])
        pending_investors = []
        
        for investor in investors:
            twitter_url = investor.get('enrichment', {}).get('personal_twitter_profile')
            if not twitter_url:
                continue
                
            username = self.extract_username_from_url(twitter_url)
            if not username or username in completed_usernames:
                continue
                
            pending_investors.append((investor, username))
        
        self.logger.info(f"📊 Total investors to check: {len(pending_investors)}")
        self.logger.info(f"📊 Already completed: {len(completed_usernames)}")
        
        # Check daily request limit
        if self.requests_today >= self.max_daily_requests:
            self.logger.error(f"⚠️ Daily request limit reached ({self.max_daily_requests}). Please try tomorrow.")
            return
        
        # Process investors
        for i, (investor, username) in enumerate(pending_investors, 1):
            if self.requests_today >= self.max_daily_requests:
                self.logger.warning(f"⚠️ Daily request limit reached. Stopping.")
                break
            
            self.logger.info(f"[{i}/{len(pending_investors)}] Checking {investor['name']} (@{username})")
            
            success, can_dm, error = self.check_dm_permission(username)
            
            if success:
                # Record completion
                self.progress["completed"].append(username)
                
                # If they have open DMs, add to results
                if can_dm:
                    result = investor.copy()
                    result["dm_check_result"] = {
                        "can_dm": True,
                        "checked_at": datetime.now().isoformat(),
                        "username": username
                    }
                    self.progress["results"].append(result)
                    self.logger.info(f"✅ Added {investor['name']} to results (DMs open)")
                
                # Save progress every 10 successful requests
                if len(self.progress["completed"]) % 10 == 0:
                    self._save_progress()
                
                # Normal delay
                self.smart_delay()
                
            else:
                # Record failure
                self.progress["failed"].append({
                    "username": username,
                    "investor_name": investor['name'],
                    "error": error,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Handle rate limiting
                if error == "Rate limited":
                    self.smart_delay(is_rate_limited=True)
                else:
                    self.smart_delay(is_error=True)
        
        # Final save
        self._save_progress()
        
        # Summary
        self.logger.info(f"""
📈 SUMMARY:
- Total checked: {len(self.progress['completed'])}
- With open DMs: {len(self.progress['results'])}
- Failed checks: {len(self.progress['failed'])}
- Requests made today: {self.requests_today}
- Results saved to: {self.results_file}
        """)


if __name__ == "__main__":
    checker = TwitterDMChecker()
    
    # Run full mode to check all 439 investors
    checker.run_check(test_mode=False)