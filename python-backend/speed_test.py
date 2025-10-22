#!/usr/bin/env python3
"""
Test different sentiment analysis speeds
"""

import time
import json
from transformers import pipeline
from fast_sentiment_config import SENTIMENT_MODELS, DEVICE, DEVICE_NAME

def test_model_speed(model_name, test_comments):
    """Test the speed of a specific model"""
    print(f"\n🧪 Testing {model_name} model...")
    
    config = SENTIMENT_MODELS[model_name]
    print(f"   Model: {config['model']}")
    print(f"   Batch size: {config['batch_size']}")
    
    # Load model with GPU acceleration
    start_time = time.time()
    analyzer = pipeline(
        "sentiment-analysis", 
        model=config['model'], 
        batch_size=config['batch_size'],
        device=DEVICE
    )
    load_time = time.time() - start_time
    print(f"   Load time: {load_time:.2f}s ({DEVICE_NAME})")
    
    # Test analysis
    start_time = time.time()
    results = analyzer(test_comments)
    analysis_time = time.time() - start_time
    
    print(f"   Analysis time: {analysis_time:.2f}s")
    print(f"   Speed: {len(test_comments)/analysis_time:.1f} comments/second")
    print(f"   Total time: {load_time + analysis_time:.2f}s")
    
    return {
        'model': model_name,
        'load_time': load_time,
        'analysis_time': analysis_time,
        'speed': len(test_comments)/analysis_time,
        'total_time': load_time + analysis_time
    }

def main():
    """Run speed comparison"""
    print("⚡ Sentiment Analysis Speed Test")
    print("=" * 50)
    
    # Load test data
    test_file = "pre-process/reddit_housefull_1761127963.json"
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        comments = data.get('comments', [])[:100]  # Test with first 100 comments
        test_texts = [c.get('text', '')[:512] for c in comments if c.get('text', '')][:50]  # 50 valid comments
        
        print(f"📊 Testing with {len(test_texts)} comments")
        
        results = []
        
        # Test each model
        for model_name in ['ultra_fast', 'fast', 'balanced', 'accurate']:
            try:
                result = test_model_speed(model_name, test_texts)
                results.append(result)
            except Exception as e:
                print(f"   ❌ Error testing {model_name}: {e}")
        
        # Show comparison
        print(f"\n📈 SPEED COMPARISON")
        print("=" * 50)
        results.sort(key=lambda x: x['total_time'])
        
        for i, result in enumerate(results, 1):
            print(f"{i}. {result['model'].upper()}: {result['speed']:.1f} comments/sec (Total: {result['total_time']:.1f}s)")
        
        print(f"\n💡 RECOMMENDATION:")
        fastest = results[0]
        print(f"   Use '{fastest['model']}' model for {fastest['speed']:.1f}x faster processing")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()