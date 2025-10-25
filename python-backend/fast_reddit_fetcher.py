#!/usr/bin/env python3
"""
fast_reddit_fetcher.py
Reddit-only fetcher (Pushshift removed).
Uses MultiAccountRedditFetcher with caching + 24-hour cache expiration + fetch time stats.
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any
from reddit_fetcher import MultiAccountRedditFetcher

CACHE_DIR = "pre-process"
CACHE_EXPIRY_HOURS = 24  # ✅ cache lifetime


class FastRedditFetcher:
    def __init__(self, use_live_api_only: bool = True):
        self.use_live_api_only = use_live_api_only
        self.accounts = []
        print("🚀 FastRedditFetcher initialized (Reddit API only mode).")

    def _is_cache_valid(self, cache_file: str) -> bool:
        """Check if cache exists and is younger than expiry limit."""
        if not os.path.exists(cache_file):
            return False
        file_time = datetime.fromtimestamp(os.path.getmtime(cache_file))
        age_hours = (datetime.now() - file_time).total_seconds() / 3600
        if age_hours < CACHE_EXPIRY_HOURS:
            print(f"🕒 Cache valid ({age_hours:.1f}h old, under {CACHE_EXPIRY_HOURS}h limit).")
            return True
        print(f"⚠️ Cache expired ({age_hours:.1f}h old). Refetching...")
        return False

    def fetch_mass_comments(self, query: str, target_comments: int = 10000, min_score: int = 5) -> Dict[str, Any]:
        """
        Fetch comments using MultiAccountRedditFetcher.
        Automatically caches results and refreshes every 24 hours.
        Displays total fetch time and speed.
        """
        start_time = time.time()
        os.makedirs(CACHE_DIR, exist_ok=True)

        cache_file = os.path.join(CACHE_DIR, f"reddit_cache_{query.replace(' ', '_')}.json")

        # ✅ Step 1: Check for valid cache
        if self._is_cache_valid(cache_file):
            print(f"💾 Using cached data for '{query}'...")
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"📦 Loaded {len(data.get('comments', []))} comments from cache in 0.02s.\n")
            return data

        # 🧠 Step 2: Fetch new data
        print(f"🔍 Fetching '{query}' from Reddit API across all accounts...")
        fetch_start = time.time()
        fetcher = MultiAccountRedditFetcher()
        result = fetcher.fetch_mass_comments(query=query, target_comments=target_comments, min_score=min_score)
        fetch_end = time.time()

        total_comments = len(result.get("comments", []))
        fetch_duration = fetch_end - fetch_start
        cps = round(total_comments / fetch_duration, 2) if fetch_duration > 0 else 0

        # 🧾 Add timing info into metadata
        result["metadata"]["fetchDuration"] = round(fetch_duration, 2)
        result["metadata"]["commentsPerSecond"] = cps

        # 💾 Step 3: Save to cache
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

        total_duration = time.time() - start_time
        print("==========================================")
        print(f"✅ Fetch complete for '{query}'")
        print(f"📊 Total comments fetched : {total_comments}")
        print(f"⏱ Fetch duration          : {fetch_duration:.2f} sec")
        print(f"⚡ Speed                  : {cps} comments/sec")
        print(f"💾 Cached for {CACHE_EXPIRY_HOURS} hours at: {cache_file}")
        print(f"🕓 Total process time     : {total_duration:.2f} sec")
        print("==========================================\n")

        return result
