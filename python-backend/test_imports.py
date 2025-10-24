#!/usr/bin/env python3
"""
Test imports for debugging
"""

print("🔍 Testing imports...")

try:
    import google.generativeai as genai
    print("✅ google.generativeai imported successfully")
except ImportError as e:
    print(f"❌ google.generativeai import failed: {e}")

try:
    from ai_summary_generator import AISummaryGenerator
    print("✅ AISummaryGenerator imported successfully")
except ImportError as e:
    print(f"❌ AISummaryGenerator import failed: {e}")

try:
    import sys
    print(f"🐍 Python path: {sys.executable}")
    print(f"📦 Python version: {sys.version}")
except Exception as e:
    print(f"❌ System info failed: {e}")

print("✅ Import test complete")