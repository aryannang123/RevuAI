#!/usr/bin/env python3
"""
Test script for adaptive relevance filtering
Shows how strict vs relaxed mode works
"""

def is_relevant(text: str, query: str, relaxed: bool = False) -> bool:
    """Same adaptive logic as in the fetcher"""
    if not text or not query:
        return False
    
    text_lower = text.lower()
    query_lower = query.lower()
    query_terms = query_lower.split()
    
    # Single word: direct match
    if len(query_terms) == 1:
        return query_lower in text_lower
    
    # STRICT MODE: Full phrase OR all terms
    if not relaxed:
        if query_lower in text_lower:
            return True
        return all(term in text_lower for term in query_terms)
    
    # RELAXED MODE: Majority of terms
    else:
        if query_lower in text_lower:
            return True
        terms_present = sum(1 for term in query_terms if term in text_lower)
        required_terms = max(1, len(query_terms) // 2 + 1)
        return terms_present >= required_terms


print("="*70)
print("🧪 ADAPTIVE FILTERING TEST: Strict vs Relaxed Mode")
print("="*70)

test_cases = [
    {
        "query": "iPhone 15 Pro Max",
        "scenario": "LOW ENGAGEMENT (avg 30 comments/post)",
        "mode": "relaxed",
        "tests": [
            ("Got the iPhone 15 Pro Max yesterday!", True, True),
            ("iPhone 15 Pro camera is insane", True, True),  # 3/4 terms
            ("The iPhone 15 has great battery", True, True),  # 2/4 terms (majority)
            ("iPhone Pro models are expensive", False, True),  # 2/4 terms
            ("My phone is amazing", False, False),
            ("The 15 Pro looks cool", False, True),  # 2/4 terms
        ]
    },
    {
        "query": "Tesla Model 3",
        "scenario": "HIGH ENGAGEMENT (avg 200 comments/post)",
        "mode": "strict",
        "tests": [
            ("Just got my Tesla Model 3!", True, True),
            ("Tesla Model charging is fast", True, False),  # Missing "3"
            ("Model 3 interior is minimal", False, True),  # Missing "Tesla"
            ("Electric cars are the future", False, False),
            ("My Tesla is awesome", False, False),  # Missing "Model 3"
        ]
    }
]

for case in test_cases:
    query = case["query"]
    mode = case["mode"]
    relaxed = (mode == "relaxed")
    
    print(f"\n📱 Query: \"{query}\"")
    print(f"🎯 Scenario: {case['scenario']}")
    print(f"⚙️  Mode: {mode.upper()}")
    print("-" * 70)
    
    for text, strict_result, relaxed_result in case["tests"]:
        result = is_relevant(text, query, relaxed=relaxed)
        expected = relaxed_result if relaxed else strict_result
        status = "✅" if result == expected else "❌"
        action = "KEEP" if result else "FILTER"
        
        # Show what each mode would do
        strict_action = "KEEP" if strict_result else "FILTER"
        relaxed_action = "KEEP" if relaxed_result else "FILTER"
        
        print(f"{status} [{action:6}] {text[:45]}")
        print(f"         Strict: {strict_action:6} | Relaxed: {relaxed_action:6}")

print("\n" + "="*70)
print("💡 KEY POINTS:")
print("   • STRICT MODE: Requires ALL terms or exact phrase")
print("   • RELAXED MODE: Accepts MAJORITY of terms (>50%)")
print("   • Automatically switches based on query engagement")
print("="*70)


"""
Test script to demonstrate relevance filtering
Shows examples of what gets kept vs filtered out
"""

def is_relevant(text: str, query: str) -> bool:
    """Same logic as in the fetcher"""
    if not text or not query:
        return False
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    query_terms = query_lower.split()
    
    # For single word: direct match
    if len(query_terms) == 1:
        return query_lower in text_lower
    
    # For multi-word: check if full phrase OR all terms present
    if query_lower in text_lower:
        return True
    
    return all(term in text_lower for term in query_terms)


# Test cases
print("="*60)
print("🧪 RELEVANCE FILTERING TEST")
print("="*60)

test_cases = [
    {
        "query": "iPhone 15",
        "tests": [
            ("Got the iPhone 15 Pro yesterday, loving it!", True),
            ("The iPhone 15 camera is amazing", True),
            ("Just upgraded from 14 to 15, best decision", True),
            ("My iPhone has great battery life", False),  # Missing "15"
            ("The 15 inch laptop is great", False),  # Has "15" but not "iPhone"
            ("This is completely unrelated", False),
            ("iphone 15 is expensive but worth it", True),  # Case insensitive
        ]
    },
    {
        "query": "Xbox 360",
        "tests": [
            ("My Xbox 360 still works perfectly", True),
            ("Bought an Xbox 360 from eBay", True),
            ("The 360 controller is legendary", False),  # Missing "Xbox"
            ("Xbox Series X is better", False),  # Missing "360"
            ("Red Ring of Death on my 360", False),  # Missing "Xbox"
            ("xbox 360 games are classics", True),
        ]
    },
    {
        "query": "Tesla",
        "tests": [
            ("Ordered my Tesla Model 3!", True),
            ("Tesla's autopilot is impressive", True),
            ("Electric cars are the future", False),
            ("My car broke down today", False),
            ("tesla cybertruck looks cool", True),
        ]
    }
]

for case in test_cases:
    query = case["query"]
    print(f"\n📱 Query: \"{query}\"")
    print("-" * 60)
    
    for text, expected in case["tests"]:
        result = is_relevant(text, query)
        status = "✅" if result == expected else "❌"
        action = "KEEP" if result else "FILTER"
        
        print(f"{status} [{action:6}] {text[:50]}")
    
print("\n" + "="*60)
print("✅ Test complete! This is how comments are filtered.")
print("="*60)