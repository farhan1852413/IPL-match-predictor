import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Coins, 
  MapPin, 
  RotateCcw, 
  Play, 
  Gauge, 
  History, 
  Sparkles, 
  ArrowLeftRight, 
  Compass, 
  Activity, 
  CheckCircle,
  HelpCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';

const API_BASE = 'http://localhost:5000/api';

// Team Color Maps for UI Accentuation
const teamColors = {
  'Chennai Super Kings': '#F7C30A',
  'Mumbai Indians': '#004BA0',
  'Kolkata Knight Riders': '#3A225D',
  'Royal Challengers Bangalore': '#EC1C24',
  'Delhi Capitals': '#005CA5',
  'Punjab Kings': '#ED1F24',
  'Rajasthan Royals': '#EA1B8F',
  'Sunrisers Hyderabad': '#FF822E',
  'Lucknow Super Giants': '#0057E2',
  'Gujarat Titans': '#1B254B'
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Metadata & Stats from backend
  const [teams, setTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [cities, setCities] = useState([]);
  const [stats, setStats] = useState({
    team_stats: [],
    toss_impact: { win_toss_win_match: 51.02, win_toss_lose_match: 48.98 },
    toss_decision: { field: 65.54, bat: 34.46 }
  });
  
  // History predictions list
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ------------------------------------
  // Tab 1: Pre-Match Predictor Form State
  // ------------------------------------
  const [prematchForm, setPrematchForm] = useState({
    team1: 'Mumbai Indians',
    team2: 'Chennai Super Kings',
    toss_winner: 'Mumbai Indians',
    toss_decision: 'field',
    venue: 'Wankhede Stadium'
  });
  const [prematchResult, setPrematchResult] = useState(null);

  // ------------------------------------
  // Tab 2: Live Simulator State
  // ------------------------------------
  const [liveForm, setLiveForm] = useState({
    batting_team: 'Royal Challengers Bangalore',
    bowling_team: 'Kolkata Knight Riders',
    venue: 'M Chinnaswamy Stadium',
    target_score: 180,
    current_score: 0,
    wickets_down: 0,
    overs_completed: 0.0
  });
  const [liveResult, setLiveResult] = useState(null);
  
  // Array tracking live win percentage over simulated deliveries
  const [probabilityHistory, setProbabilityHistory] = useState([]);
  const [deliveryCounter, setDeliveryCounter] = useState(0);

  // ------------------------------------
  // Head-to-Head Calculator State
  // ------------------------------------
  const [h2hTeamA, setH2hTeamA] = useState('Mumbai Indians');
  const [h2hTeamB, setH2hTeamB] = useState('Chennai Super Kings');
  const [h2hData, setH2hData] = useState(null);

  // Fetch Metadata and Stats on startup
  useEffect(() => {
    fetchMetadata();
    fetchStats();
    fetchHistory();
  }, []);

  // Recalculate dynamic head-to-head whenever choices change
  useEffect(() => {
    calculateHeadToHead();
  }, [h2hTeamA, h2hTeamB, stats.team_stats]);

  // Keep toss_winner synchronized with team1 and team2 changes to prevent validation issues
  useEffect(() => {
    if (prematchForm.toss_winner !== prematchForm.team1 && prematchForm.toss_winner !== prematchForm.team2) {
      setPrematchForm(prev => ({
        ...prev,
        toss_winner: prev.team1
      }));
    }
  }, [prematchForm.team1, prematchForm.team2, prematchForm.toss_winner]);

  const fetchMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE}/metadata`);
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams || []);
        setVenues(data.venues || []);
        setCities(data.cities || []);
        
        // Setup initial dropdown defaults
        if (data.teams?.length > 1) {
          setPrematchForm(prev => ({
            ...prev,
            team1: data.teams[0],
            team2: data.teams[1],
            toss_winner: data.teams[0]
          }));
          setLiveForm(prev => ({
            ...prev,
            batting_team: data.teams[0],
            bowling_team: data.teams[1]
          }));
        }
        if (data.venues?.length > 0) {
          setPrematchForm(prev => ({ ...prev, venue: data.venues[0] }));
          setLiveForm(prev => ({ ...prev, venue: data.venues[0] }));
        }
      }
    } catch (e) {
      console.error("Error fetching metadata", e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (e) {
      console.error("Error fetching statistics", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history`);
      const data = await res.json();
      if (res.ok) {
        setHistory(data);
      }
    } catch (e) {
      console.error("Error fetching history", e);
    }
  };

  const clearHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history/clear`, { method: 'POST' });
      if (res.ok) {
        setHistory([]);
      }
    } catch (e) {
      console.error("Error clearing history", e);
    }
  };

  // Fetch exact historic head-to-head metrics from backend
  const calculateHeadToHead = async () => {
    if (h2hTeamA === h2hTeamB) {
      setH2hData({ error: 'Please choose two different teams.' });
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE}/stats/h2h?teamA=${encodeURIComponent(h2hTeamA)}&teamB=${encodeURIComponent(h2hTeamB)}`);
      const data = await res.json();
      if (res.ok) {
        setH2hData(data);
      } else {
        setH2hData({ error: data.error || 'Failed to calculate records.' });
      }
    } catch (e) {
      console.error("Error calculating head-to-head", e);
      setH2hData({ error: 'Unable to connect to database server.' });
    }
  };

  const handlePrematchPredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setPrematchResult(null);

    if (prematchForm.team1 === prematchForm.team2) {
      setErrorMsg("Error: Team 1 and Team 2 cannot be the same.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/predict/prematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prematchForm)
      });
      const data = await res.json();
      if (res.ok) {
        setPrematchResult(data);
        fetchHistory();
      } else {
        setErrorMsg(data.error || "Prediction request failed.");
      }
    } catch (err) {
      setErrorMsg("Unable to connect to Flask API. Please make sure the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  // Run the live prediction API
  const runLivePrediction = async (currentFormState) => {
    setErrorMsg('');
    
    if (currentFormState.batting_team === currentFormState.bowling_team) {
      setErrorMsg("Error: Chasing team and Bowling team cannot be the same.");
      return;
    }
    if (currentFormState.current_score >= currentFormState.target_score) {
      setErrorMsg("Error: Target already achieved!");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/predict/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentFormState)
      });
      const data = await res.json();
      if (res.ok) {
        setLiveResult(data);
        
        // Add to probability graph history
        const probChasing = data.probabilities[currentFormState.batting_team];
        const ballsRemaining = data.balls_left;
        const currentBall = 120 - ballsRemaining;
        
        setProbabilityHistory(prev => [
          ...prev, 
          {
            ball: currentBall,
            overs: currentFormState.overs_completed,
            [currentFormState.batting_team]: probChasing,
            [currentFormState.bowling_team]: 100 - probChasing,
            runs: currentFormState.current_score,
            wickets: currentFormState.wickets_down
          }
        ]);
        
        fetchHistory();
      } else {
        setErrorMsg(data.error || "Simulation request failed.");
      }
    } catch (err) {
      setErrorMsg("API Connection error. Verify your Flask backend is running on http://127.0.0.1:5000");
    }
  };

  // Scoring triggers for television scoreboard overlay
  const handleScoreEvent = (runsAdded, isWicket = false, isBall = true) => {
    setLiveForm(prev => {
      let nextRuns = prev.current_score + runsAdded;
      let nextWickets = prev.wickets_down + (isWicket ? 1 : 0);
      
      // Calculate next overs completed
      let nextOvers = prev.overs_completed;
      if (isBall) {
        let oversInt = Math.floor(prev.overs_completed);
        let balls = Math.round((prev.overs_completed - oversInt) * 10);
        balls += 1;
        if (balls >= 6) {
          oversInt += 1;
          balls = 0;
        }
        nextOvers = parseFloat(`${oversInt}.${balls}`);
      }

      // Safeguards
      if (nextWickets >= 10) nextWickets = 9; // Max 9 wickets down (last man stands)
      if (nextRuns >= prev.target_score) nextRuns = prev.target_score - 1; // Cap to simulate thrilling finish

      const updatedForm = {
        ...prev,
        current_score: nextRuns,
        wickets_down: nextWickets,
        overs_completed: nextOvers
      };
      
      // Instantly run prediction for updated state
      runLivePrediction(updatedForm);
      setDeliveryCounter(c => c + 1);

      return updatedForm;
    });
  };

  const handleLiveReset = () => {
    const defaultLive = {
      ...liveForm,
      current_score: 0,
      wickets_down: 0,
      overs_completed: 0.0
    };
    setLiveForm(defaultLive);
    setLiveResult(null);
    setProbabilityHistory([]);
    setDeliveryCounter(0);
    setErrorMsg('');
  };

  // Helper utility functions
  const round = (val, dec) => Number(Math.round(val + 'e' + dec) + 'e-' + dec);

  // Recharts PIE formatting constants
  const RADIAN = Math.PI / 180;
  const COLORS = ['#00F2FE', '#F53803'];

  return (
    <div className="min-h-screen flex flex-col">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-50 glass-card rounded-none border-t-0 border-x-0 bg-slate-950/80 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-neon rounded-xl animate-pulse-slow shadow-neon-blue">
            <Trophy className="w-8 h-8 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight font-sans bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">
              IPL CRIC-PREDICTOR
            </h1>
            <p className="text-xs text-slate-400 font-medium">Winner Engine & Live Run Simulator • Final Year Project</p>
          </div>
        </div>

        {/* TAB BUTTONS */}
        <nav className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => { setActiveTab('dashboard'); setErrorMsg(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-gradient-neon text-slate-900 shadow-neon-blue' : 'text-slate-300 hover:text-white'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('prematch'); setErrorMsg(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ${activeTab === 'prematch' ? 'bg-gradient-neon text-slate-900 shadow-neon-blue' : 'text-slate-300 hover:text-white'}`}
          >
            Pre-Match Predictor
          </button>
          <button
            onClick={() => { setActiveTab('live'); setErrorMsg(''); handleLiveReset(); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ${activeTab === 'live' ? 'bg-gradient-neon text-slate-900 shadow-neon-blue' : 'text-slate-300 hover:text-white'}`}
          >
            Live Simulator
          </button>
        </nav>
      </header>

      {/* CORE FRAMEWORK CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: ACTIVE VIEW CONTENT */}
        <section className="lg:col-span-3 space-y-6">
          {errorMsg && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-red-200 text-sm flex items-center gap-3 animate-pulse">
              <span className="font-extrabold text-red-400">⚠️ Error:</span>
              <p>{errorMsg}</p>
            </div>
          )}

          {/* ========================================================
              VIEW A: DASHBOARD
              ======================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* ANALYTIC METRIC CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 flex items-center justify-between border-l-4 border-cyan-400">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toss Win Impact</h3>
                    <p className="text-3xl font-extrabold text-slate-100 mt-1">{stats.toss_impact.win_toss_win_match}%</p>
                    <p className="text-[10px] text-cyan-400 font-semibold mt-1">Winning toss correlates to winning match</p>
                  </div>
                  <Coins className="w-10 h-10 text-cyan-400 opacity-80" />
                </div>
                
                <div className="glass-card p-5 flex items-center justify-between border-l-4 border-purple-500">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toss Choice Trend</h3>
                    <p className="text-3xl font-extrabold text-slate-100 mt-1">{stats.toss_decision.field}%</p>
                    <p className="text-[10px] text-purple-400 font-semibold mt-1">Teams electing to field first</p>
                  </div>
                  <Compass className="w-10 h-10 text-purple-400 opacity-80" />
                </div>

                <div className="glass-card p-5 flex items-center justify-between border-l-4 border-pink-500">
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Matches Analyzed</h3>
                    <p className="text-3xl font-extrabold text-slate-100 mt-1">1,033</p>
                    <p className="text-[10px] text-pink-400 font-semibold mt-1">Deliveries analyzed: 246k+</p>
                  </div>
                  <Activity className="w-10 h-10 text-pink-400 opacity-80" />
                </div>
              </div>

              {/* DATA VISUALIZATIONS SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* STANDINGS BAR CHART */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-bold text-slate-100">IPL Historical Win Percentages</h2>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.team_stats}
                        layout="vertical"
                        margin={{ left: 20, right: 10, top: 0, bottom: 0 }}
                      >
                        <XAxis type="number" stroke="#9CA3AF" fontSize={10} domain={[0, 100]} />
                        <YAxis 
                          type="category" 
                          dataKey="team" 
                          stroke="#9CA3AF" 
                          fontSize={9} 
                          tickFormatter={(t) => t.replace('Royal Challengers', 'RCB').replace('Chennai Super', 'CSK').replace('Mumbai Indians', 'MI').replace('Kolkata Knight', 'KKR').replace('Sunrisers', 'SRH').replace('Delhi Capitals', 'DC').replace('Rajasthan Royals', 'RR').replace('Punjab Kings', 'PBKS').replace('Lucknow Super', 'LSG').replace('Gujarat Titans', 'GT')}
                        />
                        <ChartTooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff', fontSize: '12px' }}
                          itemStyle={{ color: '#00F2FE', fontSize: '12px' }}
                        />
                        <Bar dataKey="win_percentage" radius={[0, 4, 4, 0]}>
                          {
                            stats.team_stats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={teamColors[entry.team] || '#3B82F6'} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* TOSS INFLUENCE PIE CHART */}
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Coins className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-slate-100">Toss Winner Match Outcome</h2>
                  </div>
                  <div className="h-64 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Won Match', value: stats.toss_impact.win_toss_win_match },
                            { name: 'Lost Match', value: stats.toss_impact.win_toss_lose_match }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          <Cell fill="#00F2FE" />
                          <Cell fill="#F53803" />
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute text-center">
                      <p className="text-3xl font-extrabold text-cyan-400">{stats.toss_impact.win_toss_win_match}%</p>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Correlation</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center italic mt-2">
                    Across 1,033 matches, winning the toss slightly swings match outcome in favor by 51%.
                  </p>
                </div>
              </div>

              {/* DYNAMIC HEAD-TO-HEAD CALCULATOR */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <ArrowLeftRight className="w-6 h-6 text-purple-400" />
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-100">Dynamic Head-to-Head Comparison</h2>
                    <p className="text-xs text-slate-400">Evaluate dynamic statistics based on historical standings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                  {/* Select Team A */}
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Team A</label>
                    <select
                      value={h2hTeamA}
                      onChange={(e) => setH2hTeamA(e.target.value)}
                      className="w-full glass-input"
                    >
                      {teams.map(t => <option key={t} value={t} className="bg-slate-900 text-slate-100">{t}</option>)}
                    </select>
                  </div>

                  {/* VS Indicator */}
                  <div className="flex justify-center md:col-span-1 pt-4 md:pt-0">
                    <span className="px-3 py-1.5 bg-gradient-neon text-slate-900 rounded-full font-black text-xs">VS</span>
                  </div>

                  {/* Select Team B */}
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Team B</label>
                    <select
                      value={h2hTeamB}
                      onChange={(e) => setH2hTeamB(e.target.value)}
                      className="w-full glass-input"
                    >
                      {teams.map(t => <option key={t} value={t} className="bg-slate-900 text-slate-100">{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* H2H Results Screen */}
                {h2hData && !h2hData.error && (
                  <div className="mt-8 bg-slate-900/50 p-6 rounded-xl border border-slate-800">
                    <div className="flex justify-between items-center text-center max-w-lg mx-auto mb-4">
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-sm md:text-base">{h2hTeamA}</h4>
                        <p className="text-2xl font-black mt-1" style={{ color: teamColors[h2hTeamA] }}>{h2hData.winsA} Wins</p>
                        <p className="text-xs text-slate-400 font-semibold">({h2hData.ratioA}%)</p>
                      </div>
                      <div className="px-4">
                        <span className="text-slate-500 font-semibold text-xs block">PLAYED</span>
                        <span className="text-2xl font-extrabold text-slate-300">{h2hData.played}</span>
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-100 text-sm md:text-base">{h2hTeamB}</h4>
                        <p className="text-2xl font-black mt-1" style={{ color: teamColors[h2hTeamB] }}>{h2hData.winsB} Wins</p>
                        <p className="text-xs text-slate-400 font-semibold">({h2hData.ratioB}%)</p>
                      </div>
                    </div>

                    {/* Progress Bar Visualization */}
                    <div className="w-full bg-slate-800 h-4 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full transition-all duration-300" 
                        style={{ 
                          width: `${h2hData.ratioA}%`, 
                          backgroundColor: teamColors[h2hTeamA] || '#3B82F6' 
                        }} 
                      />
                      <div 
                        className="h-full transition-all duration-300" 
                        style={{ 
                          width: `${h2hData.ratioB}%`, 
                          backgroundColor: teamColors[h2hTeamB] || '#EC1C24' 
                        }} 
                      />
                    </div>
                  </div>
                )}

                {h2hData?.error && (
                  <p className="text-center text-sm text-yellow-400 font-semibold mt-6">{h2hData.error}</p>
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              VIEW B: PRE-MATCH PREDICTOR
              ======================================================== */}
          {activeTab === 'prematch' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* Form Input (3/5 Columns) */}
              <div className="md:col-span-3 glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-bold text-slate-100 font-sans">Pre-Match Configuration</h2>
                    <p className="text-xs text-slate-400">Configure parameters to calculate pre-match win rate</p>
                  </div>
                </div>

                <form onSubmit={handlePrematchPredict} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-400">Team 1 (Home Team)</label>
                      <select
                        value={prematchForm.team1}
                        onChange={(e) => setPrematchForm(prev => ({ ...prev, team1: e.target.value }))}
                        className="w-full glass-input"
                      >
                        {teams.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-400">Team 2 (Away Team)</label>
                      <select
                        value={prematchForm.team2}
                        onChange={(e) => setPrematchForm(prev => ({ ...prev, team2: e.target.value }))}
                        className="w-full glass-input"
                      >
                        {teams.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-400">Toss Winner</label>
                      <select
                        value={prematchForm.toss_winner}
                        onChange={(e) => setPrematchForm(prev => ({ ...prev, toss_winner: e.target.value }))}
                        className="w-full glass-input"
                      >
                        <option value={prematchForm.team1} className="bg-slate-900">{prematchForm.team1}</option>
                        <option value={prematchForm.team2} className="bg-slate-900">{prematchForm.team2}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-slate-400">Toss Decision</label>
                      <select
                        value={prematchForm.toss_decision}
                        onChange={(e) => setPrematchForm(prev => ({ ...prev, toss_decision: e.target.value }))}
                        className="w-full glass-input"
                      >
                        <option value="field" className="bg-slate-900">Choose to Field</option>
                        <option value="bat" className="bg-slate-900">Choose to Bat</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Match Venue</label>
                    <select
                      value={prematchForm.venue}
                      onChange={(e) => setPrematchForm(prev => ({ ...prev, venue: e.target.value }))}
                      className="w-full glass-input"
                    >
                      {venues.map(v => <option key={v} value={v} className="bg-slate-900">{v}</option>)}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-gradient-neon text-slate-900 font-extrabold uppercase rounded-xl tracking-wider hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-slate-900" />
                        Execute Pre-Match Predictor
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Prediction Result Display (2/5 Columns) */}
              <div className="md:col-span-2 space-y-4">
                {prematchResult ? (
                  <div className="glass-card p-6 border-glow-active h-full flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <span className="px-3 py-1 bg-cyan-950 border border-cyan-500/30 text-cyan-400 rounded-full font-semibold text-[10px] uppercase tracking-wider">
                          Result Calculated
                        </span>
                        <span className="text-[10px] text-slate-400">{prematchResult.timestamp}</span>
                      </div>

                      <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Predicted Winner</h3>
                      <p 
                        className="text-3xl font-black tracking-tight mt-1 text-glow-blue" 
                        style={{ color: teamColors[prematchResult.predicted_winner] }}
                      >
                        {prematchResult.predicted_winner}
                      </p>
                      
                      <div className="mt-8 space-y-4">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-300">
                            <span>{prematchForm.team1}</span>
                            <span>{prematchResult.probabilities[prematchForm.team1]}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-400 to-cyan-500" 
                              style={{ width: `${prematchResult.probabilities[prematchForm.team1]}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold text-slate-300">
                            <span>{prematchForm.team2}</span>
                            <span>{prematchResult.probabilities[prematchForm.team2]}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-pink-500 to-pink-600" 
                              style={{ width: `${prematchResult.probabilities[prematchForm.team2]}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                        Prediction Confidence
                      </h4>
                      <p className="text-2xl font-black text-slate-100 mt-1">{prematchResult.confidence}%</p>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">
                        Computed utilizing standard Scikit-Learn Random Forest Classifier fitted on 1,033 historical matches.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center opacity-85">
                    <HelpCircle className="w-12 h-12 text-slate-600 mb-3 animate-bounce" />
                    <h3 className="font-extrabold text-slate-300">No Prediction Formulated</h3>
                    <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                      Configure the parameters on the left and click "Execute Pre-Match Predictor" to compute win probabilities.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================
              VIEW C: LIVE MATCH SIMULATOR
              ======================================================== */}
          {activeTab === 'live' && (
            <div className="space-y-6">
              
              {/* CHASE SETUP CONTROLLER */}
              {!liveResult && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Gauge className="w-6 h-6 text-pink-400" />
                    <div>
                      <h2 className="text-xl font-bold text-slate-100 font-sans">Setup Simulated Run-Chase</h2>
                      <p className="text-xs text-slate-400">Initialize the live-match scenario parameters to begin simulations</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Chasing Team (Batting 2nd)</label>
                        <select
                          value={liveForm.batting_team}
                          onChange={(e) => setLiveForm(prev => ({ ...prev, batting_team: e.target.value }))}
                          className="w-full glass-input"
                        >
                          {teams.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Defending Team (Bowling 2nd)</label>
                        <select
                          value={liveForm.bowling_team}
                          onChange={(e) => setLiveForm(prev => ({ ...prev, bowling_team: e.target.value }))}
                          className="w-full glass-input"
                        >
                          {teams.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Match Venue</label>
                        <select
                          value={liveForm.venue}
                          onChange={(e) => setLiveForm(prev => ({ ...prev, venue: e.target.value }))}
                          className="w-full glass-input"
                        >
                          {venues.map(v => <option key={v} value={v} className="bg-slate-900">{v}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400">Target Score (1st Innings Runs + 1)</label>
                        <input
                          type="number"
                          value={liveForm.target_score}
                          onChange={(e) => setLiveForm(prev => ({ ...prev, target_score: parseInt(e.target.value) || 0 }))}
                          min="1"
                          max="300"
                          className="w-full glass-input"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => runLivePrediction(liveForm)}
                      className="w-full py-3.5 bg-gradient-neon text-slate-900 font-extrabold uppercase rounded-xl tracking-wider hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-slate-900" />
                      Initialize Simulator Scoreboard
                    </button>
                  </div>
                </div>
              )}

              {/* LIVE SIMULATOR TELEVISION INTERACTIVE SCOREBOARD */}
              {liveResult && (
                <div className="space-y-6">
                  
                  {/* Scoreboard Widget */}
                  <div className="glass-card p-6 border-l-4 border-l-cyan-400 bg-slate-900/60 shadow-neon-blue relative overflow-hidden">
                    {/* Glowing effect inside card */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />

                    <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                      <div>
                        <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-widest animate-pulse">● LIVE RUN-CHASE SIMULATION</span>
                        <h3 className="text-sm font-semibold text-slate-400 mt-0.5">{liveForm.venue}</h3>
                      </div>
                      <button
                        onClick={handleLiveReset}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Simulator
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                      {/* Left: Score display */}
                      <div className="md:col-span-2 space-y-1">
                        <span className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">{liveForm.batting_team}</span>
                        <div className="flex items-baseline gap-2">
                          <h1 className="text-5xl font-black tracking-tight text-white">{liveForm.current_score}-{liveForm.wickets_down}</h1>
                          <span className="text-lg font-bold text-slate-400">({liveForm.overs_completed} / 20 Ov)</span>
                        </div>
                        <p className="text-xs font-bold text-yellow-400 mt-1 uppercase tracking-wide">
                          Need {liveForm.target_score - liveForm.current_score} Runs off {liveResult.balls_left} Balls (Target: {liveForm.target_score})
                        </p>
                      </div>

                      {/* Center: Run Rates */}
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 flex justify-around text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current RR</span>
                          <p className="text-xl font-extrabold text-slate-100 mt-0.5">{liveResult.crr}</p>
                        </div>
                        <div className="w-px bg-slate-800 h-8 self-center" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Required RR</span>
                          <p className="text-xl font-extrabold text-cyan-400 mt-0.5">{liveResult.rrr}</p>
                        </div>
                      </div>

                      {/* Right: Dynamic Win Probability */}
                      <div className="text-center md:text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Win Probability</span>
                        <span 
                          className="text-4xl font-black mt-0.5 block text-glow-blue"
                          style={{ color: teamColors[liveForm.batting_team] }}
                        >
                          {liveResult.probabilities[liveForm.batting_team]}%
                        </span>
                        <span className="text-xs text-slate-400 mt-1 block">To win chase</span>
                      </div>
                    </div>

                    {/* Interactive Scoreboard Buttons */}
                    <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Simulate Delivery Events</span>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        <button
                          onClick={() => handleScoreEvent(1, false, true)}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                          <Plus className="w-3 h-3 text-cyan-400" />
                          1 Run
                        </button>
                        <button
                          onClick={() => handleScoreEvent(4, false, true)}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-extrabold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                          Boundary (4)
                        </button>
                        <button
                          onClick={() => handleScoreEvent(6, false, true)}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-purple-400 font-extrabold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                          Sixer (6)
                        </button>
                        <button
                          onClick={() => handleScoreEvent(0, true, true)}
                          className="py-2.5 bg-red-950/40 hover:bg-red-950/80 text-red-400 font-bold rounded-lg border border-red-900/50 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                          🔴 Wicket
                        </button>
                        <button
                          onClick={() => handleScoreEvent(0, false, true)}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                          Dot Ball
                        </button>
                        <button
                          onClick={() => handleScoreEvent(1, false, false)}
                          className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-1 text-xs"
                        >
                          Wide/NoBall (+1)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PROBABILITY TIMELINE LINE CHART */}
                  {probabilityHistory.length > 0 && (
                    <div className="glass-card p-5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-cyan-400" />
                          <h2 className="text-lg font-bold text-slate-100">Live Win Probability Shifts</h2>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Simulated: {deliveryCounter} Balls</span>
                      </div>

                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={probabilityHistory}
                            margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
                          >
                            <XAxis dataKey="ball" stroke="#9CA3AF" fontSize={9} />
                            <YAxis stroke="#9CA3AF" fontSize={9} domain={[0, 100]} />
                            <ChartTooltip 
                              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                              itemStyle={{ fontSize: '11px' }}
                            />
                            <Legend fontSize={10} />
                            <Area 
                              type="monotone" 
                              dataKey={liveForm.batting_team} 
                              stroke={teamColors[liveForm.batting_team] || '#00F2FE'} 
                              fillOpacity={0.15}
                              fill={teamColors[liveForm.batting_team] || '#00F2FE'} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey={liveForm.bowling_team} 
                              stroke={teamColors[liveForm.bowling_team] || '#F53803'} 
                              fillOpacity={0.05}
                              fill={teamColors[liveForm.bowling_team] || '#F53803'} 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                      <p className="text-[10px] text-slate-400 text-center italic mt-2">
                        Observe the real-time Win Probability fluctuations plotted delivery-by-delivery as parameters adjust.
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}
        </section>

        {/* RIGHT COLUMN: PREDICTION HISTORY TIMELINE PANEL */}
        <section className="lg:col-span-1 space-y-6">
          <div className="glass-card p-5 h-full flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold text-slate-100 font-sans">Session Logs</h2>
                </div>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                    title="Clear history log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* History scroll list */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {history.length > 0 ? (
                  history.map((h, i) => (
                    <div key={i} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${h.prediction_type === 'prematch' ? 'bg-cyan-950 text-cyan-400' : 'bg-pink-950 text-pink-400'}`}>
                          {h.prediction_type}
                        </span>
                        <span className="text-[9px] text-slate-500">{h.timestamp.split(' ')[1]}</span>
                      </div>

                      {/* Teams & Venue details */}
                      <div>
                        {h.prediction_type === 'prematch' ? (
                          <p className="font-bold text-slate-200">{h.team1} vs {h.team2}</p>
                        ) : (
                          <div>
                            <p className="font-bold text-slate-200">{h.batting_team} chase vs {h.bowling_team}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Score: {h.current_score}/{h.wickets_down} ({h.overs_completed} Ov) • Target: {h.target}</p>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">📍 {h.venue}</p>
                      </div>

                      {/* Winner Prediction output */}
                      <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">Predicted</span>
                        <span className="font-extrabold" style={{ color: teamColors[h.predicted_winner] }}>
                          {h.predicted_winner.replace('Royal Challengers Bangalore', 'RCB').replace('Chennai Super Kings', 'CSK').replace('Mumbai Indians', 'MI').replace('Kolkata Knight Riders', 'KKR').replace('Sunrisers Hyderabad', 'SRH').replace('Delhi Capitals', 'DC').replace('Rajasthan Royals', 'RR').replace('Punjab Kings', 'PBKS').replace('Lucknow Super Giants', 'LSG').replace('Gujarat Titans', 'GT')} ({h.confidence}%)
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-80">
                    <HelpCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No history logged.</p>
                    <p className="text-[10px] text-slate-500 leading-normal mt-1 max-w-xs mx-auto">Predictions run in the app will dynamically compile in this list.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 text-[10px] text-slate-500 font-medium leading-normal bg-slate-950/20">
              ⚡ Local Model Server active at http://localhost:5000. Predictions compiled instantly via Random Forest inference.
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="glass-card rounded-none border-b-0 border-x-0 bg-slate-950 text-center py-6 text-xs text-slate-500 border-t border-slate-900 mt-12">
        <p className="font-medium">IPL Winner Prediction & Match Simulator Web Application</p>
        <p className="mt-1.5 text-[10px] text-slate-600">Final Year Engineering Project • Designed and Developed in Python Flask & React Vite</p>
      </footer>
    </div>
  );
}
