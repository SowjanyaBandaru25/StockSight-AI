/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { BookOpen, HelpCircle, GraduationCap } from "lucide-react";

interface IndicatorsPanelProps {
  explanations: Record<string, { label: string; value: string; explanation: string }>;
  theme?: "light" | "dark";
}

export function IndicatorsPanel({ explanations, theme = "light" }: IndicatorsPanelProps) {
  const [selectedKey, setSelectedKey] = useState<string>("RSI");
  const isDark = theme === "dark";

  // Custom AI usages to enrich the explanations
  const aiUsages: Record<string, string> = {
    SMA: "Neural models use SMA crossover deltas as raw directional trend layers to filter noise in high-frequency regimes.",
    EMA: "LSTM structures calculate current EMA margins as sensitive input features because of the higher weight attribution on recent ticks.",
    RSI: "Decision Trees use the standard 30 and 70 thresholds of RSI as primary root splits to categorize overbought or oversold regimes.",
    MACD: "Supervised classifiers process MACD histograms and signal lines to predict localized trend reversals during volatile consolidations.",
    BollingerBands: "Isolation Forests inspect Bollinger Band channel outliers to identify flash-crashes or highly abnormal price distributions.",
    ATR: "XGBoost and SVM models analyze ATR data values to dynamically optimize the width of risk margins and forecast exact stop-losses.",
    Volatility: "PCA decompositions weight volatility inputs heavily inside risk factor loaders to group current market regimes.",
    Momentum: "Deep learning models calculate momentum coefficients to predict trend continuation vectors and avoid catching a falling knife.",
  };

  return (
    <div className={`rounded-xl border p-6 shadow-xs relative overflow-hidden transition-all duration-300 ${
      isDark 
        ? "border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-premium-dark text-slate-105" 
        : "border-slate-200 bg-white shadow-premium-light text-slate-850"
    }`}>
      {/* Soft color-theme top banner */}
      <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-indigo-650 to-indigo-400" />
      
      <div className="mb-6 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
          isDark 
            ? "bg-indigo-950/40 border-indigo-900 text-indigo-400" 
            : "bg-indigo-50 border-indigo-100 text-indigo-700"
        }`}>
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? "text-slate-200" : "text-slate-800"}`}>
            Indicator Intelligence Academy
          </h4>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-550"}`}>
            A real-time masterclass explaining technical signals and custom AI pattern recognition weights.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Indicators list side columns */}
        <div className="flex flex-col gap-1.5 md:col-span-1">
          {Object.entries(explanations).map(([key, info]) => {
            const isSelected = selectedKey === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? "border-emerald-555 bg-emerald-950/45 text-emerald-300"
                      : "border-teal-500 bg-teal-50 text-teal-800"
                    : isDark
                      ? "border-slate-850 bg-slate-950/55 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-605 hover:border-slate-300 hover:bg-slate-100/70 hover:text-slate-800"
                }`}
              >
                <div className="space-y-0.5">
                  <span className="font-mono text-2xs font-bold uppercase">{key}</span>
                  <p className={`text-3xs truncate max-w-[140px] ${isDark ? "text-slate-450 text-slate-400" : "text-slate-500"}`}>{info.label}</p>
                </div>
                <span className={`font-mono text-xs font-bold ${isDark ? "text-teal-400" : "text-teal-705"}`}>
                  {info.value}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Detail Panel layout */}
        <div className={`rounded-xl p-5 border flex flex-col justify-between md:col-span-2 shadow-3xs transition-all duration-350 ${
          isDark 
            ? "bg-gradient-to-br from-indigo-950/15 to-teal-950/5 border-indigo-900/40" 
            : "bg-gradient-to-br from-indigo-50/25 to-teal-50/15 border-indigo-100/55"
        }`}>
          {explanations[selectedKey] ? (
            <div className="space-y-4">
              <div>
                <span className={`text-3xs uppercase tracking-widest font-mono font-bold ${isDark ? "text-indigo-400" : "text-indigo-700"}`}>
                  Indicator Focus
                </span>
                <h4 className={`text-md font-extrabold mt-0.5 ${isDark ? "text-slate-200" : "text-slate-900"}`}>
                  {explanations[selectedKey].label}
                </h4>
              </div>

              <div className="space-y-3 font-sans text-xs text-slate-700">
                <div className={`rounded-xl p-4 border leading-relaxed shadow-3xs ${
                  isDark ? "bg-slate-950 border-slate-805 text-slate-300" : "bg-white border-indigo-100/50 text-slate-700"
                }`}>
                  <span className={`font-mono text-2xs font-bold block mb-1 ${isDark ? "text-indigo-400" : "text-indigo-808"}`}>MARKET SIGNIFICANCE:</span>
                  {explanations[selectedKey].explanation}
                </div>

                <div className={`rounded-xl p-4 border leading-relaxed shadow-2xs ${
                  isDark 
                    ? "bg-gradient-to-br from-teal-950/25 to-emerald-950/10 border-teal-900/50 text-emerald-300" 
                    : "bg-gradient-to-br from-teal-50 to-emerald-50/30 border-teal-200/80 text-teal-900"
                }`}>
                  <span className={`font-mono text-2xs font-extrabold block mb-1 ${isDark ? "text-teal-400" : "text-teal-800"}`}>
                    HOW THE AI INTEGRATES THIS:
                  </span>
                  {aiUsages[selectedKey]}
                </div>
              </div>
            </div>
          ) : (
            <div className={`flex h-full flex-col items-center justify-center text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              <BookOpen className="h-6 w-6 mb-1 opacity-40 text-slate-605" />
              <p className="text-xs">Select an indicator to view structural insights.</p>
            </div>
          )}

          <div className={`mt-4 flex items-center gap-2 border-t pt-3.5 text-2xs font-mono uppercase ${
            isDark ? "border-slate-800/80 text-slate-500" : "border-slate-205 text-slate-505"
          }`}>
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
            <span>Updates tick dynamically every refresh interval</span>
          </div>
        </div>
      </div>
    </div>
  );
}
