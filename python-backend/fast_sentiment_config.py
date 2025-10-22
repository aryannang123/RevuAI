# fast_sentiment_config.py
# Configuration for ultra-fast sentiment analysis

"""
PERFORMANCE OPTIMIZATION GUIDE:
- Use GPU if available (100x faster than CPU)
- Batch processing (10-50x faster than single predictions)
- Smaller, faster models (2-5x faster)
- Quantization for CPU (2-3x faster)
"""

import torch

# Check GPU availability
DEVICE = 0 if torch.cuda.is_available() else -1
DEVICE_NAME = "GPU" if DEVICE == 0 else "CPU"

# Model configurations (ordered by speed)
SENTIMENT_MODELS = {
    "ultra_fast": {
        "model": "distilbert-base-uncased-finetuned-sst-2-english",
        "batch_size": 64,
        "speed": "Ultra Fast",
        "accuracy": "Good",
        "description": "Best for speed, good accuracy"
    },
    "fast": {
        "model": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "batch_size": 32,
        "speed": "Fast",
        "accuracy": "Better",
        "description": "Balanced speed and accuracy"
    },
    "accurate": {
        "model": "nlptown/bert-base-multilingual-uncased-sentiment",
        "batch_size": 16,
        "speed": "Slower",
        "accuracy": "Best",
        "description": "Best accuracy, slower"
    }
}

# Default model (ultra_fast for production)
DEFAULT_MODEL = "ultra_fast"

# Batch processing settings
MAX_BATCH_SIZE = 64 if DEVICE == 0 else 32  # Larger batches on GPU
TRUNCATE_LENGTH = 256  # Shorter = faster

# CPU optimization (only if no GPU)
USE_QUANTIZATION = DEVICE == -1  # Quantize on CPU for 2-3x speedup

print(f"🚀 Sentiment Analysis Config:")
print(f"   Device: {DEVICE_NAME}")
print(f"   Model: {SENTIMENT_MODELS[DEFAULT_MODEL]['model']}")
print(f"   Batch Size: {MAX_BATCH_SIZE}")
print(f"   Truncate: {TRUNCATE_LENGTH} tokens")
if USE_QUANTIZATION:
    print(f"   CPU Quantization: Enabled")