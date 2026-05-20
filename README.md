# 🏏 IPL Winner Predictor & Live Match Simulator

![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-4.x-purple?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Python](https://img.shields.io/badge/Python-3.10+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.x-black?style=for-the-badge&logo=flask)
![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-Machine_Learning-orange?style=for-the-badge&logo=scikit-learn)


A full-stack, machine-learning-powered web application built as an engineering project. This platform leverages historical ball-by-ball IPL dataset (246,000+ deliveries) to provide rich data analytics, pre-match winner predictions, and an interactive live run-chase simulator.

A full-stack, machine-learning-powered web application built as a final-year engineering project. This platform leverages historical ball-by-ball IPL dataset (246,000+ deliveries) to provide rich data analytics, pre-match winner predictions, and an interactive live run-chase simulator.


## ✨ Key Features

*   **📊 Historical Analytics Dashboard**: Visualizes overall team win-rates, toss decision trends, and toss-win impact using interactive Recharts.
*   **⚔️ Dynamic Head-to-Head Calculator**: Computes exact, real-world historical records (matches played, wins, ratios) between any two franchises directly from the dataset.
*   **🔮 Pre-Match Predictor**: Predicts the match outcome before the first ball is bowled based on teams, venue, toss winner, and toss decision.
*   **📈 Live Chase Simulator**: Features an interactive, television-style scoreboard overlay. Simulate delivery events (runs, wickets, dot balls) and watch a real-time AreaChart dynamically map the shifting win probabilities ball-by-ball.
*   **🎨 Premium UI/UX**: Built with a "Cinematic Glassmorphism Dark" aesthetic, featuring neon glows, custom keyframe animations, and highly responsive Tailwind CSS v4 styling.

## 🛠️ Technology Stack

### Frontend (Client-Side)
*   **Framework**: React (Vite)
*   **Styling**: Tailwind CSS v4 (Glassmorphism, custom utility classes)
*   **Data Visualization**: Recharts (Animated Pie, Bar, and Area charts)
*   **Icons**: Lucide React

### Backend (Server-Side & API)
*   **Framework**: Python Flask
*   **Routing**: RESTful API endpoints with CORS enabled
*   **Data Processing**: Pandas, NumPy

### Machine Learning (Predictive Engine)
*   **Library**: Scikit-Learn
*   **Algorithms**: Random Forest Classifiers
*   **Serialization**: Joblib
*   **Dataset**: Ball-by-ball IPL historic data (74MB+ CSV)

## 🧠 Machine Learning Models

The predictive engine relies on two distinct models trained on historical data:

1.  **Pre-Match Model**: Trained on match-level data. Features include `team1`, `team2`, `venue`, `toss_winner`, and `toss_decision`. Achieves a realistic baseline accuracy indicative of high pre-match volatility.
2.  **Live Simulator Model**: Trained on delivery-level 2nd-innings chase data. Features include `batting_team`, `bowling_team`, `venue`, `runs_left`, `balls_left`, `wickets_left`, `target_score`, `current_run_rate`, and `required_run_rate`. Achieves an outstanding **99.03% classification accuracy** for real-time scenario evaluations.

## 🚀 Installation & Setup Instructions

Follow these steps to run the project locally on your machine.

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [Python](https://www.python.org/) (v3.10 or higher)

### 1. Start the Flask Backend Server
Open a terminal or command prompt, navigate to the project root, and run:
```bash
# Navigate to project directory
cd ipl_predictor

# Install Python dependencies (if not already installed)
pip install -r backend/requirements.txt

# Start the Flask server
python backend/app.py
```
*The server will load the ML models, pre-cache dataset statistics, and run on `http://127.0.0.1:5000`.*

### 2. Start the React Frontend Client
Open a **new, separate terminal window**, navigate to the frontend folder, and run:
```bash
# Navigate to the frontend directory
cd ipl_predictor/frontend

# Install Node modules (if first time)
npm install

# Start the Vite development server
npm run dev
```
*The React app will compile instantly and run on `http://localhost:5173/`.*

## 📐 System Architecture

The application implements a clean, decoupled Three-Tier Architecture:
1.  **Presentation Tier**: React Vite client handling state management, user inputs, and chart rendering.
2.  **Logic Tier**: Flask REST API handling data validation, route routing, and session history.
3.  **Data/Inference Tier**: In-memory Scikit-Learn models and pre-cached Pandas DataFrames enabling sub-millisecond predictions without disk I/O latency.

## 👨‍💻 Author

<<<<<<< HEAD
Developed as a Final Year Engineering Project.
=======
Developed as a Final Year Engineering Project.
>>>>>>> fdcbb83676e98a8c6dfa4dd3c2ff12f90d746b34
