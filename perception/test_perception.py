"""
Test script to verify the perception layer is working correctly.
"""

import requests
import json
import base64

# Perception layer URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint."""
    print("Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_analyze_get():
    """Test GET /analyze endpoint (should return schema info)."""
    print("\nTesting GET /analyze endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/analyze")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Status: {data.get('status')}")
        print(f"Message: {data.get('message')}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_text_analysis():
    """Test text analysis."""
    print("\nTesting text analysis...")
    try:
        payload = {
            "user_responses": [
                "I have over 5 years of experience in software development.",
                "I'm confident in my ability to lead teams and deliver projects on time.",
                "I believe I can bring value to your organization."
            ],
            "interviewer_questions": [
                "Tell me about your experience.",
                "What are your strengths?",
                "Why should we hire you?"
            ],
            "response_durations": [12.5, 15.0, 10.5]
        }
        
        response = requests.post(f"{BASE_URL}/analyze/text", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Processing time: {data.get('processing_time_ms', 0):.2f}ms")
            
            # Show sample metrics
            text_metrics = data.get('text_metrics', {})
            print("\nSample normalized metrics:")
            print(f"  - Semantic relevance: {text_metrics.get('semantic_relevance_mean', 0):.3f}")
            print(f"  - Assertive phrase ratio: {text_metrics.get('assertive_phrase_ratio', 0):.3f}")
            print(f"  - Average sentiment: {text_metrics.get('avg_sentiment', 0):.3f}")
            print(f"  - Empathy phrase ratio: {text_metrics.get('empathy_phrase_ratio', 0):.3f}")
            
            return True
        else:
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_root():
    """Test root endpoint."""
    print("\nTesting root endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Service: {data.get('service')}")
        print(f"Version: {data.get('version')}")
        print(f"Available endpoints: {list(data.get('endpoints', {}).keys())}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 60)
    print("AURA Perception Layer - Test Suite")
    print("=" * 60)
    
    results = {
        "Root endpoint": test_root(),
        "Health check": test_health(),
        "GET /analyze": test_analyze_get(),
        "Text analysis": test_text_analysis()
    }
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ All tests passed! Perception layer is working correctly.")
    else:
        print("✗ Some tests failed. Check the output above for details.")
    print("=" * 60)

if __name__ == "__main__":
    main()
