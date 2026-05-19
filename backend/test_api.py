import json
import sys
import os

# Include parent directory in search path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BACKEND_DIR)

from app import app

def test_endpoints():
    print("--- Starting Backend API Test Suite ---")
    client = app.test_client()

    # 1. Test Metadata
    print("\n[Test 1/4] Testing GET /api/metadata...")
    res = client.get('/api/metadata')
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print("FAIL: Metadata failed.")
        sys.exit(1)
    
    data = json.loads(res.data)
    teams = data.get('teams', [])
    venues = data.get('venues', [])
    cities = data.get('cities', [])
    print(f"PASS: Found {len(teams)} teams, {len(venues)} venues, and {len(cities)} cities.")
    print(f"Sample Teams: {teams[:3]}")

    # 2. Test Stats
    print("\n[Test 2/4] Testing GET /api/stats...")
    res = client.get('/api/stats')
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print("FAIL: Stats failed.")
        sys.exit(1)
    
    data = json.loads(res.data)
    print(f"PASS: Stats retrieved successfully.")
    print(f"Toss Impact: {data.get('toss_impact')}")
    print(f"Toss Decision Ratio: {data.get('toss_decision')}")
    print(f"Number of cached team standings: {len(data.get('team_stats', []))}")

    # 3. Test Pre-match Predictor
    print("\n[Test 3/4] Testing POST /api/predict/prematch...")
    prematch_payload = {
        "team1": "Mumbai Indians",
        "team2": "Chennai Super Kings",
        "toss_winner": "Mumbai Indians",
        "toss_decision": "field",
        "venue": "Wankhede Stadium"
    }
    res = client.post('/api/predict/prematch', 
                      data=json.dumps(prematch_payload), 
                      content_type='application/json')
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print(f"FAIL: Pre-match predictor failed: {res.data.decode()}")
        sys.exit(1)
    
    data = json.loads(res.data)
    print("PASS: Pre-match predictor successful!")
    print(f"Predicted Winner: {data.get('predicted_winner')}")
    print(f"Confidence: {data.get('confidence')}%")
    print(f"Probabilities: {data.get('probabilities')}")

    # 4. Test Live Simulator
    print("\n[Test 4/4] Testing POST /api/predict/live...")
    live_payload = {
        "batting_team": "Royal Challengers Bangalore",
        "bowling_team": "Kolkata Knight Riders",
        "venue": "M Chinnaswamy Stadium",
        "target_score": 180,
        "current_score": 110,
        "wickets_down": 3,
        "overs_completed": 12.4
    }
    res = client.post('/api/predict/live', 
                      data=json.dumps(live_payload), 
                      content_type='application/json')
    print(f"Status Code: {res.status_code}")
    if res.status_code != 200:
        print(f"FAIL: Live predictor failed: {res.data.decode()}")
        sys.exit(1)
    
    data = json.loads(res.data)
    print("PASS: Live simulator predictor successful!")
    print(f"Runs Left: {data.get('runs_left')}, Balls Left: {data.get('balls_left')}")
    print(f"CRR: {data.get('crr')}, RRR: {data.get('rrr')}")
    print(f"Predicted Winner: {data.get('predicted_winner')}")
    print(f"Confidence: {data.get('confidence')}%")
    print(f"Probabilities: {data.get('probabilities')}")

    print("\n--- All Backend API Tests Passed! ---")

if __name__ == '__main__':
    test_endpoints()
