/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  DollarSign,
  AlertCircle,
  HelpCircle,
  FolderTree,
  ChevronRight,
  User,
  GitBranch,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

import { StockAnalysisData, SymbolType } from "./types";
import { StatCard } from "./components/StatCard";
import { StockChart } from "./components/StockChart";
import { SentimentTracker } from "./components/SentimentTracker";
import { UnsupervisedVisuals } from "./components/UnsupervisedVisuals";
import { DeepForecastingPanel } from "./components/DeepForecastingPanel";
import { IndicatorsPanel } from "./components/IndicatorsPanel";
import { SecureSandboxAuth, SecurityUser } from "./lib/firebase";
import { LoginScreen } from "./components/LoginScreen";

const SYMBOLS: Array<{ symbol: SymbolType; name: string }> = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "NVDA", name: "NVIDIA Corp." },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "META", name: "Meta Platforms" },
];

export default function App() {
  const [user, setUser] = useState<SecurityUser | null>(null);
  const [activeSymbol, setActiveSymbol] = useState<SymbolType>("AAPL");
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [activeIndicator, setActiveIndicator] = useState<"none" | "bb" | "sma" | "ema" | "macd" | "rsi">("none");
  const [selectedModel, setSelectedModel] = useState<string>("LSTM");
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M" | "3M">("1M");
  
  // Real-time calculation state
  const [data, setData] = useState<StockAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorObj, setErrorObj] = useState<string | null>(null);
  
  // High-frequency bid/ask ticks
  const [lastTickPrice, setLastTickPrice] = useState<number | null>(null);
  const [tickDirection, setTickDirection] = useState<"up" | "down" | "stable">("stable");
  const [lastTickStamp, setLastTickStamp] = useState<string>("");

  // WebSocket portfolio optimization status states
  const [optimizerStatus, setOptimizerStatus] = useState<"IDLE" | "RUNNING" | "SUCCESS" | "FAILED">("IDLE");
  const [optimizerMessage, setOptimizerMessage] = useState<string>("");
  const [optimizedResults, setOptimizedResults] = useState<any | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Authenticate session on launch from secure vaults
  useEffect(() => {
    const activeSession = SecureSandboxAuth.getActiveSession();
    if (activeSession) {
      setUser(activeSession);
    }
  }, []);

  // Core API loader
  const loadStockData = async (symbol: SymbolType) => {
    setLoading(true);
    setErrorObj(null);
    try {
      const API = import.meta.env.VITE_API_URL;

const response = await fetch(`${API}/api/python/stock/${symbol}`);
      if (!response.ok) {
        throw new Error("Failed to process stock indicators pipeline.");
      }
      const payload: StockAnalysisData = await response.json();
      setData(payload);
      setLastTickPrice(payload.metadata.currentPrice);
      setLastTickStamp(new Date().toLocaleTimeString());
      setTickDirection("stable");
    } catch (err: any) {
      console.error("API Fetch Error: ", err);
      setErrorObj(err.message || "Endpoint rate limits or server timeout.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on change of symbol of authorized session
  useEffect(() => {
    if (user) {
      loadStockData(activeSymbol);
    }
  }, [activeSymbol, user]);

  // Persistent WebSockets connection interface when authenticated
  useEffect(() => {
    if (!user) return;

   const backend = import.meta.env.VITE_API_URL;

const wsUrl =
  backend
    .replace("https://", "wss://")
    .replace("http://", "ws://") +
  `/ws/live?symbol=${activeSymbol}`;

    console.log(`Connecting dynamic tick streaming WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === "TICK" && payload.symbol === activeSymbol) {
          setLastTickPrice(payload.price);
          setTickDirection(payload.direction);
          setLastTickStamp(payload.timestamp);
        } else if (payload.type === "OPTIMIZE_TASK_SUBMITTED") {
          setOptimizerStatus("RUNNING");
          setOptimizerMessage(payload.message);
        } else if (payload.type === "OPTIMIZE_TASK_COMPLETED") {
          setOptimizerStatus("SUCCESS");
          setOptimizedResults(payload.result);
          setOptimizerMessage("Task offloaded and completed successfully.");
        } else if (payload.type === "OPTIMIZE_TASK_FAILED" || payload.type === "OPTIMIZE_TASK_TIMEOUT") {
          setOptimizerStatus("FAILED");
          setOptimizerMessage(payload.error || "Optimization queue failed.");
        }
      } catch (err) {
        console.error("Failed to parse incoming WebSocket frame: ", err);
      }
    };

    ws.onclose = () => {
      console.log("Persistent price ticks WebSocket closed.");
    };

    ws.onerror = (err) => {
      console.error("WebSocket transport exception: ", err);
    };

    return () => {
      ws.close();
    };
  }, [activeSymbol, user]);

  const triggerPortfolioOptimization = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setOptimizerStatus("RUNNING");
      setOptimizerMessage("Bundling and uploading covariance data matrices to Task Queue...");
      setOptimizedResults(null);
      wsRef.current.send(JSON.stringify({
        type: "OPTIMIZE_PORTFOLIO",
        symbols: SYMBOLS.map(s => s.symbol),
        riskProfile: data?.portfolioDiversification.riskCategory.toLowerCase() || "medium"
      }));
    } else {
      setOptimizerStatus("FAILED");
      setOptimizerMessage("Action aborted: WebSockets interface is currently offline.");
    }
  };

  const triggerManualRefresh = () => {
    loadStockData(activeSymbol);
  };

  if (!user) {
    return <LoginScreen onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div id="main_dashboard_layout" className={`min-h-screen font-sans tracking-tight transition-colors duration-300 relative overflow-hidden ${
      theme === "dark" 
        ? "bg-slate-950 text-slate-100" 
        : "bg-slate-50 text-slate-800"
    }`}>
      {/* Absolute Dynamic Gradient Glow Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-purple-500/5 dark:bg-purple-650/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Platform Header */}
      <header className={`sticky top-0 z-40 border-b transition-colors duration-300 shadow-sm ${
        theme === "dark"
          ? "border-slate-800 bg-slate-950/80 backdrop-blur-xl"
          : "border-slate-200 bg-white/95 backdrop-blur-xl"
      }`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white font-serif text-lg font-bold shadow-md shadow-indigo-500/30">
              S
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight font-sans text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-650 to-pink-500">
                Stock<span className="font-serif italic font-medium">Vision</span>
              </h1>
              <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500 block mt-0.5">
                Financial Research Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Authenticated Quant User Badge */}
            <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left shadow-xs transition-colors duration-300 ${
              theme === "dark"
                ? "border-slate-800 bg-slate-950 text-slate-200"
                : "border-slate-200 bg-white"
            }`}>
              <div className={`h-6 w-6 rounded flex items-center justify-center font-serif text-xs font-bold shrink-0 border ${
                theme === "dark"
                  ? "bg-indigo-950/40 border-indigo-900 text-indigo-400"
                  : "bg-indigo-50 border-indigo-100 text-indigo-700"
              }`}>
                {user.displayName.substring(0, 1).toUpperCase()}
              </div>
              <div className="hidden leading-tight text-left md:block select-none">
                <p className={`font-sans text-xs font-bold tracking-tight ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>{user.displayName}</p>
                <p className="font-mono text-[9px] text-slate-550 mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={() => {
                  SecureSandboxAuth.signOut();
                  setUser(null);
                }}
                className={`ml-1 rounded p-1 transition-all cursor-pointer ${
                  theme === "dark"
                    ? "text-slate-500 hover:bg-slate-900 hover:text-rose-455"
                    : "text-slate-450 hover:bg-slate-50 hover:text-rose-600"
                }`}
                title="Log Out Access Client"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* High-Tech Light/Dark Theme Switcher */}
            <button
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              className={`flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer shadow-3xs ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-950 text-amber-400 hover:bg-slate-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title={theme === "dark" ? "Activate Light Mode" : "Activate Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-slate-750" />}
            </button>

            <button
              onClick={triggerManualRefresh}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold transition-all cursor-pointer shadow-3xs ${
                theme === "dark"
                  ? "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-900 hover:text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-905 hover:text-slate-900"
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${theme === "dark" ? "text-indigo-400" : "text-indigo-550"} ${loading ? "animate-spin" : ""}`} />
              Re-Sync
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8 sm:px-8 space-y-12">
        {/* Error Alert panel */}
        {errorObj && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-700 shadow-sm animate-pulse">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
            <p>
              <strong>System Exception:</strong> {errorObj}. The core quant pipeline has loaded robust offline caches for operations.
            </p>
          </div>
        )}

        {/* Elegant Page Header Banner */}
        <div className={`border-b pb-6 mt-2 transition-colors duration-300 ${theme === "dark" ? "border-slate-850" : "border-slate-200"}`}>
          <span className={`text-[11px] font-bold uppercase tracking-widest block mb-1 ${theme === "dark" ? "text-indigo-400" : "text-indigo-650"}`}>
            Quantitative Analysis Workspace
          </span>
          <h2 className={`text-3xl font-serif font-semibold tracking-tight ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Market Observations &amp; Algorithmic Regimes
          </h2>
          <p className={`text-sm mt-2 font-serif italic max-w-2xl leading-relaxed ${theme === "dark" ? "text-slate-400" : "text-slate-550"}`}>
            Configure symbol overlays, indicator timelines, and machine learning models in our active asset laboratory below.
          </p>
        </div>

        {/* Interactive Workspace controls bar */}
        <div className={`flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs transition-colors duration-300 ${
          theme === "dark"
            ? "border-slate-800 bg-slate-900/40 backdrop-blur-md"
            : "border-slate-200 bg-white"
        }`}>
          <div className="flex flex-wrap items-center gap-2">
            {SYMBOLS.map((s) => {
              const isSelected = activeSymbol === s.symbol;
              return (
                <button
                  key={s.symbol}
                  onClick={() => setActiveSymbol(s.symbol)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all border cursor-pointer ${
                    isSelected
                      ? theme === "dark"
                        ? "bg-indigo-950/40 border-indigo-900 text-indigo-400 font-bold"
                        : "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold"
                      : theme === "dark"
                        ? "border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                        : "border-transparent text-slate-505 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  {s.symbol}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Indicator Select tab overlays */}
            <div className={`flex items-center gap-2 text-xs font-medium ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
              <Layers className={`h-4 w-4 ${theme === "dark" ? "text-indigo-400" : "text-indigo-500"}`} />
              <span>Chart Indicator:</span>
              <select
                value={activeIndicator}
                onChange={(e) => setActiveIndicator(e.target.value as any)}
                className={`border rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none cursor-pointer transition-colors duration-300 ${
                  theme === "dark"
                    ? "border-slate-800 bg-slate-950 text-slate-300"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value="none">None</option>
                <option value="sma">SMA (20-day)</option>
                <option value="ema">EMA (12-day)</option>
                <option value="bb">Bollinger Bands</option>
              </select>
            </div>
            
            <div className={`h-4 w-[1px] hidden sm:block ${theme === "dark" ? "bg-slate-850" : "bg-slate-200"}`} />

            <div className={`flex items-center gap-0.5 rounded-lg p-1 border font-mono text-2xs ${
              theme === "dark"
                ? "bg-slate-950 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}>
              {(["1D", "1W", "1M", "3M"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`rounded-md px-3 py-1.5 font-bold cursor-pointer transition-all ${
                    timeframe === t 
                      ? theme === "dark"
                        ? "bg-slate-900 border border-slate-800 text-indigo-400 shadow-xs animate-bounce-once" 
                        : "bg-white border border-slate-200 text-indigo-700 shadow-xs" 
                      : theme === "dark"
                        ? "text-slate-500 hover:text-slate-300"
                        : "text-slate-505 hover:text-slate-800"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dashboard Grid Workspace */}
        {loading && !data ? (
          <div className="flex min-h-[480px] flex-col items-center justify-center space-y-4 text-center py-20 bg-white rounded-2xl border border-slate-200/85">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="font-serif italic text-xs text-slate-500">Retrieving simulation matrices...</p>
          </div>
        ) : data ? (
          <div className="space-y-16">
            
            {/* Stat Cards Row */}
            <div>
              <span className={`text-xs font-mono font-black uppercase tracking-widest block mb-4 text-transparent bg-clip-text bg-gradient-to-r ${
                theme === "dark" 
                  ? "from-pink-400 via-rose-400 via-purple-400 to-indigo-400" 
                  : "from-pink-600 via-rose-500 via-purple-600 to-indigo-700"
              }`}>
                ⚡ Key Metrics at a glance
              </span>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  id="market-price-card"
                  title={`${data.metadata.name}`}
                  value={lastTickPrice !== null ? `$${lastTickPrice.toFixed(2)}` : `$${data.metadata.currentPrice.toFixed(2)}`}
                  change={data.metadata.change}
                  changePercent={data.metadata.changePercent}
                  icon={<DollarSign className={`h-4.5 w-4.5 ${tickDirection === "up" ? "text-emerald-500" : tickDirection === "down" ? "text-rose-500" : "text-slate-400"}`} />}
                  subValue={tickDirection !== "stable" ? (tickDirection === "up" ? "▲ Ticking" : "▼ Ticking") : undefined}
                  theme={theme}
                />
                <StatCard
                  id="hft-ticker-card"
                  title="Last Update Index"
                  value={lastTickStamp || "Waiting..."}
                  icon={<Cpu className="h-4.5 w-4.5 text-indigo-500" />}
                  subValue={`VOL: ${(data.metadata.volume24h / 1000000).toFixed(1)}M`}
                  theme={theme}
                />
                <StatCard
                  id="ml-forecast-card"
                  title={`${selectedModel} Prediction`}
                  value={`$${data.predictions[selectedModel]?.nextDayPrice.toFixed(2) || "N/A"}`}
                  icon={<Sparkles className="h-4.5 w-4.5 text-indigo-505 text-amber-500" />}
                  subValue={`CONFIDENCE: ${data.predictions[selectedModel]?.confidence || 0}%`}
                  theme={theme}
                />
                <StatCard
                  id="sentiment-metric-card"
                  title="Asset Sentiment label"
                  value={data.overallSentiment.label.toUpperCase()}
                  icon={<TrendingUp className="h-4.5 w-4.5 text-teal-500" />}
                  risk={data.portfolioDiversification.riskCategory}
                  theme={theme}
                />
              </div>
            </div>

            {/* SPACED VERTICALLY: Section I - Historical Price Trends Chart */}
            <div className={`p-6 rounded-3xl border shadow-md transition-all duration-300 space-y-5 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800/80 shadow-emerald-950/10 hover:border-emerald-900/50"
                : "bg-gradient-to-br from-emerald-50/20 via-white to-emerald-50/10 border-emerald-150/70 shadow-emerald-500/5 hover:border-emerald-250"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                theme === "dark" ? "border-slate-800" : "border-emerald-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-xs font-bold font-mono shadow-md shadow-emerald-500/20">I</span>
                  <div>
                    <h3 className={`text-lg font-sans font-bold tracking-tight leading-none ${
                      theme === "dark" ? "text-slate-200" : "text-slate-955"
                    }`}>
                      Historical Valuations &amp; Adaptive AI Overlay
                    </h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mt-1.5 ${
                      theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                    }`}>Primary Asset Overlay Timeseries Channel</p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-lg select-none bg-emerald-500 text-white shadow-xs">
                  Active Timeseries
                </span>
              </div>
              <p className={`text-xs leading-relaxed max-w-3xl font-serif italic ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Daily close prices paired with computed Bollinger envelopes, moving averages, and multi-session deep-learning projections.
              </p>
              <div className={`rounded-2xl border overflow-hidden shadow-xs ${
                theme === "dark" ? "border-slate-800 bg-slate-950" : "bg-white border-emerald-100"
              }`}>
                <StockChart
                  historical={data.historical}
                  prediction={data.predictions[selectedModel]}
                  modelName={selectedModel}
                  activeIndicator={activeIndicator}
                  theme={theme}
                />
              </div>
            </div>

            {/* SPACED VERTICALLY: Section II - Sentiment & News Feed */}
            <div className={`p-6 rounded-3xl border shadow-md transition-all duration-300 space-y-5 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800/80 shadow-teal-950/10 hover:border-teal-900/50"
                : "bg-gradient-to-br from-teal-50/20 via-white to-teal-50/10 rounded-3xl border border-teal-150/70 shadow-md shadow-teal-500/5 hover:border-teal-250"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                theme === "dark" ? "border-slate-800" : "border-teal-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-xs font-bold font-mono shadow-md shadow-teal-500/20">II</span>
                  <div>
                    <h3 className={`text-lg font-sans font-bold tracking-tight leading-none ${
                      theme === "dark" ? "text-slate-200" : "text-slate-955"
                    }`}>
                      NLP Sentiment Regimes &amp; Sourced News Feed
                    </h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mt-1.5 ${
                      theme === "dark" ? "text-teal-400" : "text-teal-600"
                    }`}>Semantic Text Intelligence Engine</p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-lg select-none bg-teal-500 text-white shadow-xs">
                  Sentiment Scoring
                </span>
              </div>
              <p className={`text-xs leading-relaxed max-w-3xl font-serif italic ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Real-time sentiment index scoring extracted from prominent financial publications and algorithmic trading channels.
              </p>
              <div className={`rounded-2xl border overflow-hidden shadow-xs ${
                theme === "dark" ? "border-slate-800 bg-slate-950" : "bg-white border-teal-100"
              }`}>
                <SentimentTracker news={data.news} overall={data.overallSentiment} theme={theme} />
              </div>
            </div>

            {/* SPACED VERTICALLY: Section III - Deep Learning Forecast Arena */}
            <div className={`p-6 rounded-3xl border shadow-md transition-all duration-300 space-y-5 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800/80 shadow-amber-950/10 hover:border-amber-900/50"
                : "bg-gradient-to-br from-amber-50/20 via-white to-amber-50/10 rounded-3xl border border-amber-150/75 shadow-md shadow-amber-500/5 hover:border-amber-250"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                theme === "dark" ? "border-slate-800" : "border-amber-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white text-xs font-bold font-mono shadow-md shadow-amber-500/20">III</span>
                  <div>
                    <h3 className={`text-lg font-sans font-bold tracking-tight leading-none ${
                      theme === "dark" ? "text-slate-200" : "text-slate-955"
                    }`}>
                      Supervised Machine Learning Comparison Matrix
                    </h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mt-1.5 ${
                      theme === "dark" ? "text-amber-400" : "text-amber-600"
                    }`}>Crossbacktesting Metrics &amp; Confusion Grids</p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-lg select-none bg-amber-500 text-white shadow-xs">
                  Model Backtest
                </span>
              </div>
              <p className={`text-xs leading-relaxed max-w-3xl font-serif italic ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Compare R² score coefficients, root-mean square errors (RMSE), and True Positive rates compiled over backtesting runs.
              </p>
              <div className={`rounded-2xl border overflow-hidden shadow-xs ${
                theme === "dark" ? "border-slate-800 bg-slate-950" : "bg-white border-amber-100"
              }`}>
                <DeepForecastingPanel
                  predictions={data.predictions}
                  selectedModel={selectedModel}
                  onSelectModel={setSelectedModel}
                  theme={theme}
                />
              </div>
            </div>

            {/* SPACED VERTICALLY: Section IV - Portfolio Optimization */}
            <div className={`p-6 rounded-3xl border shadow-md transition-all duration-300 space-y-5 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800/80 shadow-violet-950/10 hover:border-violet-900/50"
                : "bg-gradient-to-br from-violet-50/25 via-white to-violet-50/10 rounded-3xl border border-violet-150/70 shadow-md shadow-violet-500/5 hover:border-violet-250"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                theme === "dark" ? "border-slate-800" : "border-violet-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white text-xs font-bold font-mono shadow-md shadow-violet-500/20">IV</span>
                  <div>
                    <h3 className={`text-lg font-sans font-bold tracking-tight leading-none ${
                      theme === "dark" ? "text-slate-200" : "text-slate-955"
                    }`}>
                      Modern Portfolio Covariance Optimizer &amp; Anomalies
                    </h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mt-1.5 ${
                      theme === "dark" ? "text-violet-400" : "text-violet-650"
                    }`}>Unsupervised Extraction &amp; Sharpe Risk Optimization</p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-lg select-none bg-violet-500 text-white shadow-xs">
                  Markowitz Frontier
                </span>
              </div>
              <p className={`text-xs leading-relaxed max-w-3xl font-serif italic ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Detect systemic outliers via Isolation Forest nodes, group assets with K-Means regimes, and solve Sharpe Monte Carlo models.
              </p>
              <div className={`rounded-2xl border overflow-hidden shadow-xs ${
                theme === "dark" ? "border-slate-800 bg-slate-950/20" : "bg-white border-violet-100"
              }`}>
                <UnsupervisedVisuals
                  anomalies={data.anomalies}
                  clusters={data.clusters}
                  portfolioDiversification={data.portfolioDiversification}
                  symbol={activeSymbol}
                  optimizerStatus={optimizerStatus}
                  optimizerMessage={optimizerMessage}
                  optimizedResults={optimizedResults}
                  onTriggerOptimize={triggerPortfolioOptimization}
                  theme={theme}
                />
              </div>
            </div>

            {/* SPACED VERTICALLY: Section V - Technical Indicators reference */}
            <div className={`p-6 rounded-3xl border shadow-md transition-all duration-300 space-y-5 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800/80 shadow-indigo-950/10 hover:border-indigo-900/50"
                : "bg-gradient-to-br from-indigo-50/25 via-white to-indigo-50/10 rounded-3xl border border-indigo-150 shadow-md shadow-indigo-500/5 hover:border-indigo-250"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                theme === "dark" ? "border-slate-800" : "border-indigo-200"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white text-xs font-bold font-mono shadow-md shadow-indigo-500/20">V</span>
                  <div>
                    <h3 className={`text-lg font-sans font-bold tracking-tight leading-none ${
                      theme === "dark" ? "text-slate-200" : "text-slate-955"
                    }`}>
                      Quantitative Signal Glossary &amp; Technical Manual
                    </h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mt-1.5 ${
                      theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                    }`}>Interactive Education &amp; Active Signal Academics</p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-lg select-none bg-indigo-550 text-white shadow-xs">
                  Educational Core
                </span>
              </div>
              <p className={`text-xs leading-relaxed max-w-3xl font-serif italic ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                A structured technical masterclass describing mathematical formulations used inside our dynamic neural feature vectors.
              </p>
              <div className={`rounded-2xl border overflow-hidden shadow-xs ${
                theme === "dark" ? "border-slate-800 bg-slate-950/20" : "bg-white border-indigo-100"
              }`}>
                <IndicatorsPanel explanations={data.indicatorsExplanation} theme={theme} />
              </div>
            </div>

            {/* SPACED VERTICALLY: Section VI - Analyst Memo */}
            <div className={`p-6 rounded-3xl border shadow-md transition-all duration-300 space-y-5 ${
              theme === "dark"
                ? "bg-slate-900/40 border-slate-800/80 shadow-slate-950/10 hover:border-slate-700/60"
                : "bg-gradient-to-br from-slate-100 via-white to-slate-50/50 rounded-3xl border border-slate-300 shadow-md shadow-slate-500/5 hover:border-slate-400"
            }`}>
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                theme === "dark" ? "border-slate-800" : "border-slate-300"
              }`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-white text-xs font-bold font-mono shadow-md shadow-slate-500/20">VI</span>
                  <div>
                    <h3 className={`text-lg font-sans font-bold tracking-tight leading-none ${
                      theme === "dark" ? "text-slate-200" : "text-slate-955"
                    }`}>
                      Quantitative Research Memorandum
                    </h3>
                    <p className={`text-[10px] font-mono uppercase tracking-widest font-semibold mt-1.5 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}>Principal Investor &amp; Advisor Statement</p>
                  </div>
                </div>
                <span className="self-start sm:self-center px-3 py-1.5 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-lg select-none bg-slate-700 text-white shadow-xs">
                  Official Memo
                </span>
              </div>
              <p className={`text-xs leading-relaxed max-w-3xl font-serif italic ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                A compliance note regarding machine learning approximations, risk mitigation, and backtesting safety protocols.
              </p>
              
              <div className={`rounded-2xl border p-8 font-sans shadow-xs relative overflow-hidden transition-all duration-300 ${
                theme === "dark" ? "border-slate-800 bg-slate-950 text-slate-350" : "border-slate-200 bg-white"
              }`}>
                <div className={`absolute top-0 left-0 w-2.5 h-full ${theme === "dark" ? "bg-slate-800" : "bg-slate-700"}`} />
                <div className={`mb-6 flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 ${
                  theme === "dark" ? "border-slate-900" : "border-slate-100"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className={`h-5 w-5 ${theme === "dark" ? "text-slate-400" : "text-slate-650"}`} />
                    <span className={`font-serif text-lg font-bold tracking-tight ${theme === "dark" ? "text-slate-250 text-slate-200" : "text-slate-900"}`}>Research Memorandum</span>
                  </div>
                  <div className="text-right mt-2 sm:mt-0 font-mono text-3xs text-slate-400">
                    <span>INDEX REGISTRATION: NO. 45-88-A</span>
                  </div>
                </div>

                <div className={`space-y-4 text-xs leading-relaxed font-serif ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  <p>
                    <strong>MEMORANDUM FOR SANDBOX INVESTORS AND RESEARCHERS</strong>
                  </p>
                  <p>
                    The machine learning methodologies deployed inside StockVision (namely Long Short-Term Memory recurrent networks, XGBoost decision forests, and Isolation Forest dimension clustering) are calculated over dynamic 60-day historical timeseries segments. True performance is optimized for simulation overlays.
                  </p>
                  <p>
                    Trading securities carries dynamic systemic risks. Simulated optimizations inside Section IV do not guarantee positive return frontiers and should remain deployed purely within quantitative sandbox testings.
                  </p>
                  <p className={`italic pt-4 border-t font-sans text-2xs uppercase tracking-wider font-semibold ${
                    theme === "dark" ? "border-slate-900 text-slate-500" : "border-slate-100 text-slate-500"
                  }`}>
                    Respectfully presented,
                    <br />
                    <span className={`font-serif italic font-bold capitalize mt-1 block ${theme === "dark" ? "text-slate-200" : "text-slate-900"}`}>Catherine V.</span>
                    Principal Quantitative Analyst, StockVision Research Group
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className={`flex h-64 flex-col items-center justify-center py-16 rounded-2xl border shadow-xs ${
            theme === "dark" ? "border-slate-800 bg-slate-950 text-slate-450" : "text-slate-500 bg-white border-slate-200"
          }`}>
            <p className="font-serif italic">Database synchronization error. Re-try starting the server.</p>
          </div>
        )}
      </main>
    </div>
  );
}
