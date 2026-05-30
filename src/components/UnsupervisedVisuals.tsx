/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertOctagon, TrendingUp, Compass, Shuffle, PieChart, RefreshCw, Layers, CheckCircle2, XCircle } from "lucide-react";

interface UnsupervisedVisualsProps {
  anomalies: string[];
  clusters: Record<string, string[]>;
  portfolioDiversification: {
    diversificationScore: number;
    recommendedWeights: Record<string, number>;
    riskCategory: "Low" | "Medium" | "High";
  };
  symbol: string;
  optimizerStatus: "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";
  optimizerMessage: string;
  optimizedResults: {
    weights: Record<string, number>;
    sharpe_ratio: number;
    expected_return_pct: number;
    expected_volatility_pct: number;
    risk_profile: string;
    simulation_runs: number;
    efficient_frontier_points: number;
  } | null;
  onTriggerOptimize: () => void;
  theme?: "light" | "dark";
}

export function UnsupervisedVisuals({
  anomalies,
  clusters,
  portfolioDiversification,
  symbol,
  optimizerStatus,
  optimizerMessage,
  optimizedResults,
  onTriggerOptimize,
  theme = "light",
}: UnsupervisedVisualsProps) {
  const isDark = theme === "dark";

  // PCA weights representing financial eigenvalues
  const pcaLoadings = {
    "RSI Pressure (PC1)": 0.584,
    "Volatility Variance (PC2)": 0.412,
    "Momentum Delta (PC3)": -0.215,
  };

  return (
    <div className={`rounded-xl border p-6 shadow-xs relative overflow-hidden transition-all duration-300 ${
      isDark 
        ? "border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-premium-dark text-slate-105" 
        : "border-slate-200 bg-white shadow-premium-light text-slate-850"
    }`}>
      {/* Soft color-theme top banner */}
      <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-violet-600 to-violet-450" />
      
      <div className="mb-6">
        <h4 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${
          isDark ? "text-violet-405" : "text-slate-800"
        }`}>
          <Compass className="h-4.5 w-4.5 text-violet-500" />
          Unsupervised Regimes &amp; Modern Portfolio Allocation
        </h4>
        <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          Identifying hidden clusters, isolating extreme pricing shocks, and executing Markovian Sharpe weight optimizations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left column: Anomaly outbreaks and PCA loadings */}
        <div className="space-y-6">
          {/* Isolation Forest Outliers */}
          <div className={`rounded-xl p-4 border transition-colors duration-300 ${
            isDark ? "bg-rose-950/20 border-rose-900/40" : "bg-rose-50/50 border-rose-200/60"
          }`}>
            <span className={`text-2xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 mb-2 ${
              isDark ? "text-rose-400" : "text-rose-700"
            }`}>
              <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
              Isolation Forest Outliers (Anomalous dates)
            </span>
            <p className={`text-2xs mb-3 ${isDark ? "text-slate-400" : "text-slate-550"}`}>
              Outlier node isolation algorithm highlighting dates of extreme trading volume coupled with systemic price swings.
            </p>
            {anomalies.length === 0 ? (
              <p className="text-xs text-slate-450 font-mono italic">No outliers detected in the historical timeframe.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {anomalies.map((date) => (
                  <span
                    key={date}
                    className={`rounded px-2 py-0.5 font-mono text-2xs font-semibold ${
                      isDark 
                        ? "bg-rose-950/60 border border-rose-900/60 text-rose-450 text-rose-400" 
                        : "bg-rose-100/80 border border-rose-200 text-rose-700"
                    }`}
                  >
                    ⚠ {date}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* PCA Projections */}
          <div className={`rounded-xl p-5 border transition-colors duration-300 shadow-3xs ${
            isDark 
              ? "bg-gradient-to-br from-purple-950/15 to-purple-950/5 border-purple-900/40" 
              : "bg-gradient-to-br from-purple-50/20 to-purple-100/10 border-purple-100/55"
          }`}>
            <span className={`text-2xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 mb-2 ${
              isDark ? "text-purple-400" : "text-purple-700"
            }`}>
              <Shuffle className="h-3.5 w-3.5 text-purple-505 text-purple-450" />
              PCA Dimensions Loading Map
            </span>
            <p className={`text-2xs mb-3 ${isDark ? "text-slate-400" : "text-slate-550"}`}>
              Eigenvalue matrix decomposition extracting principal variances across standard indicators.
            </p>
            <div className="space-y-3 font-mono text-xs">
              {Object.entries(pcaLoadings).map(([key, val]) => (
                <div key={key}>
                  <div className={`flex justify-between text-2xs mb-0.5 font-medium ${
                    isDark ? "text-slate-350" : "text-slate-600"
                  }`}>
                    <span>{key}</span>
                    <span className={`font-bold ${isDark ? "text-purple-400" : "text-purple-800"}`}>{val.toFixed(3)}</span>
                  </div>
                  <div className={`h-2 w-full rounded-full ${isDark ? "bg-purple-950/50" : "bg-purple-100/40"}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-300 shadow-xs ${
                        val >= 0 ? "bg-gradient-to-r from-purple-500 to-indigo-500" : "bg-gradient-to-r from-teal-400 to-teal-600"
                      }`}
                      style={{ width: `${Math.abs(val) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: K-Means clusters & Sharpe portfolio optimizer */}
        <div className="space-y-6">
          {/* K-Means grouped assets */}
          <div className={`rounded-xl p-5 border transition-colors duration-300 shadow-3xs ${
            isDark 
              ? "bg-gradient-to-br from-teal-950/15 to-teal-950/5 border-teal-900/40" 
              : "bg-gradient-to-br from-teal-50/20 to-teal-100/10 border-teal-100/55"
          }`}>
            <span className={`text-2xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 mb-2 ${
              isDark ? "text-teal-400" : "text-teal-700"
            }`}>
              <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
              K-Means Multi-Asset Regime Clusters
            </span>
            <p className={`text-2xs mb-3 ${isDark ? "text-slate-400" : "text-slate-550"}`}>
              Euclidean distance partitioning grouping similar stock regimes in real-time.
            </p>
            <div className="space-y-3 font-mono text-2xs">
              {Object.entries(clusters).map(([clusterName, syms]) => {
                const getClusterBadgeColor = (name: string) => {
                  if (isDark) {
                    if (name.includes("High")) return "text-emerald-405 border-emerald-950 bg-emerald-950/30";
                    if (name.includes("Lagging")) return "text-rose-405 border-rose-955 bg-rose-950/30";
                    return "text-indigo-405 border-indigo-950 bg-indigo-950/30";
                  } else {
                    if (name.includes("High")) return "text-emerald-750 border-emerald-250 bg-emerald-50/50";
                    if (name.includes("Lagging")) return "text-rose-750 border-rose-250 bg-rose-50/50";
                    return "text-indigo-750 border-indigo-200/55 bg-indigo-50/50";
                  }
                };

                return (
                  <div key={clusterName} className={`rounded-xl border p-3 ${getClusterBadgeColor(clusterName)}`}>
                    <p className="font-bold uppercase tracking-wider mb-1.5">{clusterName}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {syms.length === 0 ? (
                        <span className="text-slate-450 italic">No assets assigned</span>
                      ) : (
                        syms.map((s) => (
                          <span
                            key={s}
                            className={`px-2 py-1 rounded-md text-xs font-bold border transition-all ${
                              s === symbol
                                ? "bg-teal-500 text-white border-transparent shadow-xs"
                                : isDark
                                  ? "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-900"
                                  : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50"
                            }`}
                          >
                            {s} {s === symbol ? "(Active)" : ""}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Markowitz & Asynchronous Sharpe portfolio diversification weights */}
          <div className={`rounded-xl p-5 border transition-colors duration-300 shadow-3xs ${
            isDark 
              ? "bg-gradient-to-br from-indigo-950/15 to-pink-950/5 border-indigo-900/40" 
              : "bg-gradient-to-br from-indigo-50/20 to-pink-50/15 border-indigo-100/55"
          }`}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className={`text-2xs font-bold font-mono tracking-wider uppercase flex items-center gap-1.5 ${
                isDark ? "text-pink-400" : "text-pink-700"
              }`}>
                <PieChart className="h-3.5 w-3.5 text-pink-500 animate-pulse" />
                Markowitz &amp; Sharpe Risk Optimization
              </span>
              <button
                onClick={onTriggerOptimize}
                disabled={optimizerStatus === "RUNNING"}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-3xs font-bold border uppercase transition-all shadow-xs cursor-pointer ${
                  isDark
                    ? "bg-pink-950/50 hover:bg-pink-905 border-pink-900/60 text-pink-300"
                    : "bg-pink-100 hover:bg-pink-150 text-pink-850 border-pink-200/80"
                } ${optimizerStatus === "RUNNING" ? "opacity-50 cursor-not-allowed animate-pulse" : ""}`}
              >
                <RefreshCw className={`h-2.5 w-2.5 ${optimizerStatus === "RUNNING" ? "animate-spin" : ""}`} />
                {optimizerStatus === "RUNNING" ? "Optimizing..." : "Deep Fit Sharpe"}
              </button>
            </div>

            {/* Task Management Feedback logs */}
            {optimizerStatus !== "IDLE" && (
              <div className={`mb-4 rounded-xl border p-3.5 font-mono text-3xs shadow-xs ${
                isDark ? "border-slate-800 bg-slate-950/60" : "border-indigo-100 bg-white/70"
              }`}>
                <div className="flex items-center gap-2">
                  {optimizerStatus === "RUNNING" && (
                    <div className="h-2 w-2 animate-ping rounded-full bg-pink-500" />
                  )}
                  {optimizerStatus === "SUCCESS" && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-555" />
                  )}
                  {optimizerStatus === "FAILED" && (
                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                  )}
                  <span className={`font-bold uppercase tracking-wider ${
                    optimizerStatus === "SUCCESS" ? "text-emerald-400" : optimizerStatus === "FAILED" ? "text-rose-500" : "text-pink-400"
                  }`}>
                    FastAPI Queue: {optimizerStatus}
                  </span>
                </div>
                <p className={`mt-1.5 leading-normal font-sans ${isDark ? "text-slate-350" : "text-slate-650"}`}>{optimizerMessage}</p>
                {optimizerStatus === "RUNNING" && (
                  <div className={`mt-2.5 h-1.5 w-full rounded-full ${isDark ? "bg-slate-900" : "bg-indigo-100"} overflow-hidden`}>
                    <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-indigo-500 animate-pulse" style={{ width: "70%" }} />
                  </div>
                )}
              </div>
            )}

            {/* Displaying async custom task results or falling back to default heuristic */}
            {optimizerStatus === "SUCCESS" && optimizedResults ? (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-3xs">
                  <div className={`rounded-xl p-2.5 border shadow-3xs ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-white border-indigo-100"
                  }`}>
                    <p className={`font-bold uppercase tracking-wide ${isDark ? "text-indigo-400" : "text-indigo-800"}`}>Max Sharpe</p>
                    <p className={`mt-1 text-xs font-black ${isDark ? "text-emerald-400" : "text-emerald-650"}`}>📊 {optimizedResults.sharpe_ratio}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 border shadow-3xs ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-white border-indigo-100"
                  }`}>
                    <p className={`font-bold uppercase tracking-wide ${isDark ? "text-indigo-400" : "text-indigo-800"}`}>Exp. Return (Yr)</p>
                    <p className={`mt-1 text-xs font-black ${isDark ? "text-indigo-350 text-indigo-400" : "text-indigo-750"}`}>📈 {optimizedResults.expected_return_pct}%</p>
                  </div>
                  <div className={`rounded-xl p-2.5 border shadow-3xs ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-white border-indigo-100"
                  }`}>
                    <p className={`font-bold uppercase tracking-wide ${isDark ? "text-indigo-400" : "text-indigo-800"}`}>Target Risk</p>
                    <p className={`mt-1 text-xs font-black ${isDark ? "text-purple-400" : "text-purple-650"}`}>📉 {optimizedResults.expected_volatility_pct}%</p>
                  </div>
                </div>

                <div className={`rounded-xl p-3.5 border font-mono text-2xs shadow-3xs ${
                  isDark ? "bg-slate-950 border-slate-805" : "bg-white border-indigo-100/60"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold uppercase text-3xs tracking-wider ${isDark ? "text-slate-400" : "text-slate-800"}`}>Monte Carlo Balance Weights:</span>
                    <span className="text-3xs text-slate-500">{optimizedResults.simulation_runs} simulations</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(optimizedResults.weights).map(([sym, wt]) => (
                      <div key={sym}>
                        <div className="flex justify-between text-3xs mb-0.5 text-slate-550 font-medium">
                          <span className={sym === symbol ? "text-teal-400 font-bold" : ""}>
                            {sym} {sym === symbol ? "(Active Focus)" : ""}
                          </span>
                          <span className={`font-bold ${isDark ? "text-slate-300" : "text-slate-805"}`}>{wt}%</span>
                        </div>
                        <div className={`h-1.5 w-full rounded-full ${isDark ? "bg-slate-900" : "bg-slate-100"}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              sym === symbol ? "bg-gradient-to-r from-teal-400 to-teal-600" : "bg-gradient-to-r from-slate-500 to-indigo-500"
                            }`}
                            style={{ width: `${wt}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Diversification Score Card */}
                <div className={`rounded-xl p-4 text-center border flex flex-col justify-center shadow-3xs ${
                  isDark ? "bg-slate-950 border-slate-800 text-slate-105" : "bg-white border-indigo-100/55"
                }`}>
                  <p className={`text-3xs uppercase tracking-wider font-bold block ${isDark ? "text-indigo-400" : "text-indigo-800"}`}>Diversification index</p>
                  <p className="text-3xl font-extrabold font-mono text-teal-500 mt-1">{portfolioDiversification.diversificationScore}</p>
                  <p className={`text-3xs mt-2 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>Volatility mitigation score based on current covariance regime.</p>
                </div>

                {/* Weights table displaying current symbol focus allocations */}
                <div className="space-y-2 font-mono text-2xs flex flex-col justify-center">
                  <p className={`font-bold uppercase tracking-wider text-3xs mb-1 ${isDark ? "text-indigo-400" : "text-indigo-805"}`}>Target Asset Weights:</p>
                  {Object.entries(portfolioDiversification.recommendedWeights).map(([sym, weight]) => (
                    <div key={sym}>
                      <div className={`flex items-center justify-between border-b pb-1.5 text-slate-550 font-medium ${
                        isDark ? "border-slate-800" : "border-indigo-100/40"
                      }`}>
                        <span className={sym === symbol ? "text-teal-400 font-extrabold" : isDark ? "text-slate-400" : "text-slate-600"}>
                          {sym} {sym === symbol ? "★" : ""}
                        </span>
                        <span className={`font-bold ${isDark ? "text-slate-200" : "text-indigo-900"}`}>{weight}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
