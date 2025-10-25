#!/usr/bin/env python3
"""
fast_reddit_fetcher.py
Reddit-only hybrid fetcher (Pushshift removed).
Uses MultiAccountRedditFetcher with caching.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any
from reddit_fetcher import MultiAccountRedditFetcher

CACHE_DIR = "pre-process"

class FastRedditFetcher:
    def __init__(self, use_live_api_only: bool = True):
        self.use_live_api_only = use_live_api_only
        self.accounts = []
        print("🚀 FastRedditFetcher initialized (Reddit API only mode).")

    def fetch_mass_comments(self, query: str, target_comments: int = 10000, min_score: int = 5) -> Dict[str, Any]:
        start = time.time()
        os.makedirs(CACHE_DIR, exist_ok=True)

        cache_file = os.path.join(CACHE_DIR, f"reddit_cache_{query.replace(' ', '_')}.json")
        if os.path.exists(cache_file):
            print(f"💾 Using cached data for '{query}'...")
            with open(cache_file, "r", encoding="utf-8") as f:
                return json.load(f)

        print(f"🔍 Fetching '{query}' from Reddit API across all accounts...")
        fetcher = MultiAccountRedditFetcher()
        result = fetcher.fetch_mass_comments(query=query, target_comments=target_comments, min_score=min_score)

        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        elapsed = time.time() - start
        print(f"✅ Reddit-only fetch complete: {len(result['comments'])} comments in {elapsed:.2f}s")
        return result
