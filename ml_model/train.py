import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import joblib

# Define data paths
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(DATA_DIR, "data", "ipl.csv")

print("--- Step 1: Loading Dataset ---")
if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"Dataset not found at {CSV_PATH}")

# Read the dataset
df = pd.read_csv(CSV_PATH)
print(f"Dataset loaded successfully with {len(df)} rows and {len(df.columns)} columns.")

# Define standard team mapping to handle franchise name changes
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

active_teams = sorted(list(set(team_mapping.values())))
print(f"Consolidating to {len(active_teams)} active teams: {active_teams}")

# --- Data Cleaning ---
# Filter matches containing only active teams
df['team1'] = df['team1'].map(team_mapping)
df['team2'] = df['team2'].map(team_mapping)
df['toss_winner'] = df['toss_winner'].map(team_mapping)
df['winner'] = df['winner'].map(team_mapping)
df['batting_team'] = df['batting_team'].map(team_mapping)
df['bowling_team'] = df['bowling_team'].map(team_mapping)

# Drop rows where team names could not be mapped (e.g. Kochi Tuskers, Pune Warriors)
df.dropna(subset=['team1', 'team2', 'toss_winner', 'winner', 'batting_team', 'bowling_team'], inplace=True)
print(f"Rows after team name cleaning: {len(df)}")

# Fill missing venue/city info
df['city'] = df['city'].fillna(df['venue'].apply(lambda x: str(x).split()[0]))

# Create dynamic list of venues/cities for the dropdowns
unique_venues = sorted(df['venue'].unique().tolist())
unique_cities = sorted(df['city'].unique().tolist())

# Fit categorical Encoders
team_encoder = LabelEncoder()
team_encoder.fit(active_teams)

venue_encoder = LabelEncoder()
venue_encoder.fit(unique_venues)

city_encoder = LabelEncoder()
city_encoder.fit(unique_cities)

# Save the encoders and dropdown choices for the backend/frontend
encoders = {
    'team_encoder': team_encoder,
    'venue_encoder': venue_encoder,
    'city_encoder': city_encoder,
    'active_teams': active_teams,
    'unique_venues': unique_venues,
    'unique_cities': unique_cities
}
joblib.dump(encoders, os.path.join(DATA_DIR, "label_encoders.joblib"))
print("Label encoders and metadata dumped successfully.")


# ==========================================
# PART A: Training Pre-Match Predictor Model
# ==========================================
print("\n--- Step 2: Training Pre-Match Prediction Model ---")

# Group by match_id to get match-level details (taking the first delivery of each match)
match_df = df.drop_duplicates(subset=['match_id']).copy()
print(f"Number of unique matches: {len(match_df)}")

# Pre-match feature engineering:
# We predict if "team1" wins. Therefore, the target is 1 if winner is team1, and 0 if winner is team2.
match_df['winner_is_team1'] = (match_df['winner'] == match_df['team1']).astype(int)
match_df['toss_winner_is_team1'] = (match_df['toss_winner'] == match_df['team1']).astype(int)
match_df['toss_decision_encoded'] = (match_df['toss_decision'] == 'bat').astype(int)

# Encode team names and venues using encoders
match_df['team1_encoded'] = team_encoder.transform(match_df['team1'])
match_df['team2_encoded'] = team_encoder.transform(match_df['team2'])
match_df['venue_encoded'] = venue_encoder.transform(match_df['venue'])

# Prepare pre-match feature matrix
# Features: team1, team2, venue, toss_winner_is_team1, toss_decision
prematch_features = ['team1_encoded', 'team2_encoded', 'venue_encoded', 'toss_winner_is_team1', 'toss_decision_encoded']
X_pre = match_df[prematch_features]
y_pre = match_df['winner_is_team1']

# Split and train
X_train_pre, X_test_pre, y_train_pre, y_test_pre = train_test_split(X_pre, y_pre, test_size=0.2, random_state=42)
prematch_model = RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42)
prematch_model.fit(X_train_pre, y_train_pre)

# Evaluate
y_pred_pre = prematch_model.predict(X_test_pre)
pre_accuracy = accuracy_score(y_test_pre, y_pred_pre)
print(f"Pre-Match Model Accuracy: {pre_accuracy * 100:.2f}%")
print(classification_report(y_test_pre, y_pred_pre))

# Save Pre-Match model
joblib.dump(prematch_model, os.path.join(DATA_DIR, "prematch_model.joblib"))
print("Pre-match model saved successfully.")


# ==========================================
# PART B: Training Live Match Simulator Model
# ==========================================
print("\n--- Step 3: Training Live Match Simulator Model ---")

# We only predict chase outcomes (2nd innings) as that is standard for live prediction simulators.
live_df = df[df['inning'] == 2].copy()

# Drop rows with invalid scores, balls, or overs to prevent division errors
live_df = live_df[
    (live_df['balls_remaining'] > 0) & 
    (live_df['wickets_remaining'] > 0) & 
    (live_df['target_score'] > 0)
].copy()

# Feature calculations:
# 1. Runs required = target_score - current_score
live_df['runs_left'] = live_df['target_score'] - live_df['current_score']
# Ensure runs_left is not negative
live_df['runs_left'] = live_df['runs_left'].apply(lambda x: max(x, 0))

# 2. Wickets left = wickets_remaining
live_df['wickets_left'] = live_df['wickets_remaining']

# 3. Balls left = balls_remaining
live_df['balls_left'] = live_df['balls_remaining']

# 4. Current Run Rate (CRR) = (current_score) / (overs played)
live_df['crr'] = live_df['current_run_rate']

# 5. Required Run Rate (RRR) = (runs_left) / (overs remaining)
live_df['rrr'] = live_df['required_run_rate']

# Handle infinite or extreme RRR values
live_df['rrr'] = live_df['rrr'].replace([np.inf, -np.inf], 99.0)
live_df['rrr'] = live_df['rrr'].fillna(0.0)

# Target: 1 if batting_team (chasing team) wins the match, else 0
live_df['winner_is_batting'] = (live_df['winner'] == live_df['batting_team']).astype(int)

# Encode categoricals using the pre-fit team & venue encoders
live_df['batting_encoded'] = team_encoder.transform(live_df['batting_team'])
live_df['bowling_encoded'] = team_encoder.transform(live_df['bowling_team'])
live_df['venue_encoded'] = venue_encoder.transform(live_df['venue'])

# Prepare live feature matrix
live_features = [
    'batting_encoded', 'bowling_encoded', 'venue_encoded', 
    'runs_left', 'balls_left', 'wickets_left', 
    'target_score', 'crr', 'rrr'
]
X_live = live_df[live_features]
y_live = live_df['winner_is_batting']

# Split and train on a subset if dataset is too massive to speed up execution, 
# but with 278k rows RF is very quick in Python. Let's split and train on 20% of data if memory/time is concern,
# or train on full 2nd innings data (approx. 100k-120k rows) which is highly fast.
X_train_live, X_test_live, y_train_live, y_test_live = train_test_split(X_live, y_live, test_size=0.2, random_state=42)

print(f"Training Live Model on {len(X_train_live)} rows...")
live_model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
live_model.fit(X_train_live, y_train_live)

# Evaluate
y_pred_live = live_model.predict(X_test_live)
live_accuracy = accuracy_score(y_test_live, y_pred_live)
print(f"Live Simulator Model Accuracy: {live_accuracy * 100:.2f}%")

# Save Live model
joblib.dump(live_model, os.path.join(DATA_DIR, "live_model.joblib"))
print("Live simulator model saved successfully.")

print("\n--- Pipeline Completed Successfully! ---")
