import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing for React Frontend

# Path declarations
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
ML_MODEL_DIR = os.path.join(PROJECT_ROOT, "ml_model")
CSV_PATH = os.path.join(ML_MODEL_DIR, "data", "ipl.csv")

# Initialize models and encoders as global variables
prematch_model = None
live_model = None
encoders = None
historical_stats = {}
prediction_history = []
df_matches = None

def load_ml_resources():
    global prematch_model, live_model, encoders, historical_stats, df_matches
    print("Loading ML models and label encoders...")
    try:
        prematch_model = joblib.load(os.path.join(ML_MODEL_DIR, "prematch_model.joblib"))
        live_model = joblib.load(os.path.join(ML_MODEL_DIR, "live_model.joblib"))
        encoders = joblib.load(os.path.join(ML_MODEL_DIR, "label_encoders.joblib"))
        print("ML resources loaded successfully.")
    except Exception as e:
        print(f"Error loading ML resources: {e}")
        print("Please make sure you have run 'python ml_model/train.py' first!")

    # Pre-cache overall statistics once on startup from ipl.csv for quick response times
    try:
        print("Pre-caching IPL historical statistics from dataset...")
        df = pd.read_csv(CSV_PATH)
        
        # Clean team names
        team_mapping = {
            'Chennai Super Kings': 'Chennai Super Kings',
            'Mumbai Indians': 'Mumbai Indians',
            'Kolkata Knight Riders': 'Kolkata Knight Riders',
            'Royal Challengers Bangalore': 'Royal Challengers Bangalore',
            'Royal Challengers Bengaluru': 'Royal Challengers Bangalore',
            'Delhi Daredevils': 'Delhi Capitals',
            'Delhi Capitals': 'Delhi Capitals',
            'Kings XI Punjab': 'Punjab Kings',
            'Punjab Kings': 'Punjab Kings',
            'Rajasthan Royals': 'Rajasthan Royals',
            'Deccan Chargers': 'Sunrisers Hyderabad',
            'Sunrisers Hyderabad': 'Sunrisers Hyderabad',
            'Lucknow Super Giants': 'Lucknow Super Giants',
            'Gujarat Titans': 'Gujarat Titans'
        }
        df['team1'] = df['team1'].map(team_mapping)
        df['team2'] = df['team2'].map(team_mapping)
        df['winner'] = df['winner'].map(team_mapping)
        df['toss_winner'] = df['toss_winner'].map(team_mapping)
        
        df_matches = df.drop_duplicates('match_id').dropna(subset=['team1', 'team2', 'winner', 'toss_winner'])
        
        # 1. Overall Team Stats (Win Rates)
        team_stats = []
        for team in encoders['active_teams']:
            played = int(df_matches[(df_matches['team1'] == team) | (df_matches['team2'] == team)].shape[0])
            won = int(df_matches[df_matches['winner'] == team].shape[0])
            win_pct = round((won / played * 100), 2) if played > 0 else 0
            team_stats.append({
                'team': team,
                'played': played,
                'won': won,
                'win_percentage': win_pct
            })
        
        # 2. Toss Impact Rate
        toss_wins = df_matches.shape[0]
        toss_and_match_wins = int(df_matches[df_matches['toss_winner'] == df_matches['winner']].shape[0])
        toss_win_percentage = round((toss_and_match_wins / toss_wins * 100), 2) if toss_wins > 0 else 50.0
        
        # 3. Toss Decision Choice
        decision_counts = df_matches['toss_decision'].value_counts()
        field_count = int(decision_counts.get('field', 50))
        bat_count = int(decision_counts.get('bat', 50))
        total_decisions = field_count + bat_count
        field_pct = round((field_count / total_decisions * 100), 2) if total_decisions > 0 else 50.0
        bat_pct = round((bat_count / total_decisions * 100), 2) if total_decisions > 0 else 50.0

        historical_stats = {
            'team_stats': sorted(team_stats, key=lambda x: x['win_percentage'], reverse=True),
            'toss_impact': {
                'win_toss_win_match': toss_win_percentage,
                'win_toss_lose_match': round(100 - toss_win_percentage, 2)
            },
            'toss_decision': {
                'field': field_pct,
                'bat': bat_pct
            }
        }
        print("Historical stats cached successfully.")
    except Exception as e:
        print(f"Error caching historical stats: {e}")
        # Default fallback values to prevent system crashes
        historical_stats = {
            'team_stats': [],
            'toss_impact': {'win_toss_win_match': 52.0, 'win_toss_lose_match': 48.0},
            'toss_decision': {'field': 60.0, 'bat': 40.0}
        }

# Trigger resources load
load_ml_resources()

# ====================
# API ENDPOINTS
# ====================

@app.route('/api/metadata', methods=['GET'])
def get_metadata():
    """
    Returns active teams, venues, and cities lists to populate frontend selection dropdowns.
    """
    if encoders is None:
        return jsonify({"error": "ML resources not loaded. Try starting again."}), 500
    
    return jsonify({
        "teams": encoders['active_teams'],
        "venues": encoders['unique_venues'],
        "cities": encoders['unique_cities']
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """
    Returns cached analytical graphs metadata (toss impact, win percentage per team, etc.).
    """
    return jsonify(historical_stats)

@app.route('/api/predict/prematch', methods=['POST'])
def predict_prematch():
    """
    Endpoint for predicting match outcome BEFORE it starts.
    Expects JSON:
    {
        "team1": "Mumbai Indians",
        "team2": "Chennai Super Kings",
        "toss_winner": "Mumbai Indians",
        "toss_decision": "field",
        "venue": "Wankhede Stadium"
    }
    """
    if prematch_model is None or encoders is None:
        return jsonify({"error": "Model is not loaded."}), 500

    data = request.json
    try:
        team1 = data.get('team1')
        team2 = data.get('team2')
        toss_winner = data.get('toss_winner')
        toss_decision = data.get('toss_decision')  # 'bat' or 'field'
        venue = data.get('venue')

        # Input Validations
        if not all([team1, team2, toss_winner, toss_decision, venue]):
            return jsonify({"error": "Missing input fields."}), 400
        
        if team1 == team2:
            return jsonify({"error": "Team 1 and Team 2 cannot be the same."}), 400
        
        if toss_winner not in [team1, team2]:
            return jsonify({"error": "Toss winner must be either Team 1 or Team 2."}), 400

        # Encode variables
        team_enc = encoders['team_encoder']
        venue_enc = encoders['venue_encoder']

        team1_encoded = team_enc.transform([team1])[0]
        team2_encoded = team_enc.transform([team2])[0]
        venue_encoded = venue_enc.transform([venue])[0]
        toss_winner_is_team1 = 1 if toss_winner == team1 else 0
        toss_decision_encoded = 1 if toss_decision == 'bat' else 0

        # Prepare features array
        # Order: ['team1_encoded', 'team2_encoded', 'venue_encoded', 'toss_winner_is_team1', 'toss_decision_encoded']
        features = np.array([[team1_encoded, team2_encoded, venue_encoded, toss_winner_is_team1, toss_decision_encoded]])
        
        # Predict probability
        prob = prematch_model.predict_proba(features)[0]
        
        # Class 1: team1 wins, Class 0: team2 wins
        prob_team1 = round(prob[1] * 100, 2)
        prob_team2 = round(prob[0] * 100, 2)

        predicted_winner = team1 if prob_team1 >= prob_team2 else team2
        confidence = max(prob_team1, prob_team2)

        response_data = {
            "prediction_type": "prematch",
            "team1": team1,
            "team2": team2,
            "toss_winner": toss_winner,
            "toss_decision": toss_decision,
            "venue": venue,
            "predicted_winner": predicted_winner,
            "confidence": confidence,
            "probabilities": {
                team1: prob_team1,
                team2: prob_team2
            },
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Add to session prediction history
        prediction_history.append(response_data)

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": f"Failed to predict: {str(e)}"}), 500

@app.route('/api/predict/live', methods=['POST'])
def predict_live():
    """
    Endpoint for predicting live win probability ball-by-ball.
    Expects JSON:
    {
        "batting_team": "Royal Challengers Bangalore", # Chasing team (Inning 2 batting)
        "bowling_team": "Kolkata Knight Riders",
        "venue": "M Chinnaswamy Stadium",
        "target_score": 200,
        "current_score": 120,
        "wickets_down": 4,
        "overs_completed": 12.4
    }
    """
    if live_model is None or encoders is None:
        return jsonify({"error": "Live prediction model not loaded."}), 500

    data = request.json
    try:
        batting_team = data.get('batting_team')
        bowling_team = data.get('bowling_team')
        venue = data.get('venue')
        target_score = int(data.get('target_score', 0))
        current_score = int(data.get('current_score', 0))
        wickets_down = int(data.get('wickets_down', 0))
        overs_completed = float(data.get('overs_completed', 0.0))

        # Input validations
        if not all([batting_team, bowling_team, venue]):
            return jsonify({"error": "Missing teams or venue information."}), 400
        
        if batting_team == bowling_team:
            return jsonify({"error": "Chasing team and Bowling team cannot be the same."}), 400

        if target_score <= 0:
            return jsonify({"error": "Target score must be greater than 0."}), 400

        if current_score < 0:
            return jsonify({"error": "Current runs cannot be negative."}), 400
        
        if current_score >= target_score:
            return jsonify({"error": "Match already won by batting team (Current runs >= Target)."}), 400

        if wickets_down < 0 or wickets_down >= 10:
            return jsonify({"error": "Wickets down must be between 0 and 9."}), 400

        # Parse overs to compute balls remaining
        # Example: 12.4 overs completed
        overs_int = int(overs_completed)
        balls_this_over = int(round((overs_completed - overs_int) * 10))
        
        if balls_this_over > 6:
            return jsonify({"error": "Invalid overs. Balls bowled in an over cannot exceed 6 (e.g. 10.6 is invalid, use 11.0)."}), 400

        balls_bowled = (overs_int * 6) + balls_this_over
        
        if balls_bowled < 0 or balls_bowled >= 120:
            return jsonify({"error": "Overs completed must be between 0.0 and 19.5 (less than 20 overs)."}), 400

        balls_left = 120 - balls_bowled
        runs_left = target_score - current_score
        wickets_left = 10 - wickets_down

        # Calculate run rates
        crr = round(current_score / (balls_bowled / 6), 2) if balls_bowled > 0 else 0.0
        rrr = round((runs_left * 6) / balls_left, 2) if balls_left > 0 else 99.0

        # Encode categoricals
        team_enc = encoders['team_encoder']
        venue_enc = encoders['venue_encoder']

        batting_encoded = team_enc.transform([batting_team])[0]
        bowling_encoded = team_enc.transform([bowling_team])[0]
        venue_encoded = venue_enc.transform([venue])[0]

        # Prepare live feature array
        # Order: ['batting_encoded', 'bowling_encoded', 'venue_encoded', 'runs_left', 'balls_left', 'wickets_left', 'target_score', 'crr', 'rrr']
        features = np.array([[
            batting_encoded, bowling_encoded, venue_encoded,
            runs_left, balls_left, wickets_left,
            target_score, crr, rrr
        ]])

        # Predict probability
        prob = live_model.predict_proba(features)[0]
        
        # Class 1: batting_team (chasing) wins, Class 0: bowling_team defends target
        prob_chasing = round(prob[1] * 100, 2)
        prob_defending = round(prob[0] * 100, 2)

        predicted_winner = batting_team if prob_chasing >= prob_defending else bowling_team
        confidence = max(prob_chasing, prob_defending)

        response_data = {
            "prediction_type": "live",
            "batting_team": batting_team,
            "bowling_team": bowling_team,
            "venue": venue,
            "target": target_score,
            "current_score": current_score,
            "wickets_down": wickets_down,
            "overs_completed": overs_completed,
            "balls_left": balls_left,
            "runs_left": runs_left,
            "crr": crr,
            "rrr": rrr,
            "predicted_winner": predicted_winner,
            "confidence": confidence,
            "probabilities": {
                batting_team: prob_chasing,
                bowling_team: prob_defending
            },
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # Add to prediction history
        prediction_history.append(response_data)

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": f"Failed to simulate: {str(e)}"}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    """
    Returns prediction history logged in the current server instance.
    """
    return jsonify(prediction_history[::-1])  # Return reversed history (most recent first)

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    """
    Clears prediction history.
    """
    global prediction_history
    prediction_history = []
    return jsonify({"message": "History cleared successfully."})

@app.route('/api/stats/h2h', methods=['GET'])
def get_h2h():
    """
    Calculates exact real-world historic head-to-head records from dataset.
    """
    teamA = request.args.get('teamA')
    teamB = request.args.get('teamB')
    if not teamA or not teamB:
        return jsonify({"error": "Missing team parameters"}), 400
    
    if df_matches is None:
        return jsonify({"error": "IPL Match Dataset not loaded."}), 500

    # Filter matches where these two teams faced each other
    sub_df = df_matches[
        ((df_matches['team1'] == teamA) & (df_matches['team2'] == teamB)) |
        ((df_matches['team1'] == teamB) & (df_matches['team2'] == teamA))
    ]
    
    played = int(sub_df.shape[0])
    winsA = int(sub_df[sub_df['winner'] == teamA].shape[0])
    winsB = int(sub_df[sub_df['winner'] == teamB].shape[0])
    
    ratioA = round((winsA / played * 100), 1) if played > 0 else 0.0
    ratioB = round((winsB / played * 100), 1) if played > 0 else 0.0
    
    return jsonify({
        "played": played,
        "winsA": winsA,
        "winsB": winsB,
        "ratioA": ratioA,
        "ratioB": ratioB
    })

if __name__ == '__main__':
    # Run Flask server locally on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
