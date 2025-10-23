#!/usr/bin/env python3
"""
Check available Gemini models
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
if not api_key or api_key == 'your_gemini_api_key_here':
    print("❌ Please set a valid GEMINI_API_KEY in .env file")
    exit(1)

genai.configure(api_key=api_key)

print("🔍 Available Gemini models:")
try:
    for model in genai.list_models():
        if 'generateContent' in model.supported_generation_methods:
            print(f"✅ {model.name}")
except Exception as e:
    print(f"❌ Error listing models: {e}")