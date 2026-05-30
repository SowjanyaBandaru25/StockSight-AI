/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NewsItem } from "../types";
import { MessageSquare, Newspaper, Radio, AlertTriangle, ArrowRight } from "lucide-react";

interface SentimentTrackerProps {
  news: NewsItem[];
  overall: {
    score: number;
    label: "bullish" | "bearish" | "neutral";
    twitterScore: number;
    newsScore: number;
  };
  theme?: "light" | "dark";
}

export function SentimentTracker({ news, overall, theme = "light" }: SentimentTrackerProps) {
  // Convert -1 to 1 score to a standard percentage (0% to 100%)
  const percentage = Math.round(((overall.score + 1) / 2) * 100);
  const isDark = theme === "dark";

  const getSentimentColor = (lbl: "bullish" | "bearish" | "neutral") => {
    if (lbl === "bullish") {
      return isDark 
        ? "text-emerald-400 bg-emerald-950/40 border-emerald-900/45 font-bold"
        : "text-emerald-700 bg-emerald-50 border-emerald-200 font-bold";
    }
    if (lbl === "bearish") {
      return isDark
        ? "text-rose-455 bg-rose-950/40 border-rose-900/45 font-bold"
        : "text-rose-700 bg-rose-50 border-rose-200 font-bold";
    }
    return isDark
      ? "text-amber-400 bg-amber-950/45 border-amber-900/45 font-bold"
      : "text-amber-700 bg-amber-50 border-amber-200 font-bold";
  };

  const getIndividualScoreColor = (score: number) => {
    if (score > 0.15) {
      return isDark 
        ? "text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 font-semibold"
        : "text-emerald-700 bg-emerald-50 border border-emerald-100 font-semibold";
    }
    if (score < -0.15) {
      return isDark
        ? "text-rose-400 bg-rose-950/30 border border-rose-900/30 font-semibold"
        : "text-rose-700 bg-rose-50 border border-rose-100 font-semibold";
    }
    return isDark
      ? "text-slate-400 bg-slate-900/50 border border-slate-800"
      : "text-slate-600 bg-slate-50 border border-slate-100";
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all duration-300 ${
      isDark 
        ? "border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-premium-dark text-slate-105" 
        : "border-slate-100 bg-white shadow-premium-light text-slate-800"
    }`}>
      {/* Soft color-theme top banner */}
      <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-teal-500 to-teal-300" />
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${
            isDark ? "text-teal-400" : "text-slate-800"
          }`}>
            <Radio className="h-4.5 w-4.5 text-teal-500 animate-pulse" />
            Neural Sentiment Regression &amp; Global News Matrix
          </h4>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Analyzing semantic text vectors and retail media sentiment weights in real-time.
          </p>
        </div>
        <span
          className={`self-start sm:self-center rounded-lg border px-3 py-1.5 text-xs font-mono font-bold capitalize select-none shadow-xs ${getSentimentColor(
            overall.label
          )}`}
        >
          {overall.label} ({overall.score > 0 ? `+${overall.score}` : overall.score})
        </span>
      </div>

      {/* Sentiment dials and meters */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* Dial meter */}
        <div className={`flex flex-col items-center justify-center rounded-xl p-5 border text-center shadow-3xs ${
          isDark 
            ? "border-slate-800 bg-slate-950/45 text-slate-350"
            : "bg-gradient-to-br from-teal-50/25 to-teal-100/10 border-teal-100/55"
        }`}>
          <span className={`text-2xs font-semibold tracking-wider uppercase ${isDark ? "text-slate-400" : "text-slate-550"}`}>
            Platform Index Target
          </span>
          
          <div className="relative mt-4 flex items-center justify-center">
            {/* SVG Arc meter */}
            <svg className="h-28 w-28">
              <circle
                cx="56"
                cy="56"
                r="46"
                stroke={isDark ? "#1e293b" : "#F1F5F9"}
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                stroke={overall.score > 0.15 ? "#0D9488" : overall.score < -0.15 ? "#f43f5e" : "#d97706"}
                strokeWidth="10"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - percentage / 100)}
                strokeLinecap="round"
                transform="rotate(-90 56 56)"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`font-mono text-2xl font-bold ${isDark ? "text-teal-400" : "text-slate-900"}`}>{percentage}%</span>
              <span className={`text-3xs uppercase tracking-widest font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>Bullish</span>
            </div>
          </div>
          <span className={`mt-2 text-3xs font-mono ${isDark ? "text-slate-500" : "text-slate-500"}`}>
            Weighted Score: {overall.score}
          </span>
        </div>
 
        {/* Source breakdowns */}
        <div className={`flex flex-col justify-center gap-4 rounded-xl p-5 border col-span-2 shadow-3xs ${
          isDark 
            ? "border-slate-800 bg-slate-950/45 text-slate-350"
            : "bg-gradient-to-br from-teal-50/25 to-teal-100/10 border-teal-100/55 text-slate-750"
        }`}>
          <span className={`text-2xs font-semibold tracking-wider uppercase ${isDark ? "text-slate-400" : "text-slate-550"}`}>
            NLP Modality Breakdown
          </span>
 
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-mono">
                <span className={`flex items-center gap-1.5 font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <Newspaper className="h-3.5 w-3.5 text-teal-500" />
                  Financial News (60% Weight)
                </span>
                <span className={overall.newsScore > 0 ? "text-emerald-450 font-semibold" : "text-rose-455 font-semibold"}>
                  {overall.newsScore > 0 ? `+${overall.newsScore}` : overall.newsScore}
                </span>
              </div>
              <div className={`h-2 w-full rounded-full border ${isDark ? "bg-slate-900 border-slate-800" : "bg-teal-50 border-teal-100/40"}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-500 shadow-xs"
                  style={{ width: `${((overall.newsScore + 1) / 2) * 100}%` }}
                />
              </div>
            </div>
 
            <div>
              <div className="mb-1 flex items-center justify-between text-xs font-mono">
                <span className={`flex items-center gap-1.5 font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                  <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                  Retail Media Streams (40% Weight)
                </span>
                <span className={overall.twitterScore > 0 ? "text-emerald-450 font-semibold" : "text-rose-455 font-semibold"}>
                  {overall.twitterScore > 0 ? `+${overall.twitterScore}` : overall.twitterScore}
                </span>
              </div>
              <div className={`h-2 w-full rounded-full border ${isDark ? "bg-slate-900 border-slate-800" : "bg-teal-50 border-teal-100/40"}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-500 shadow-xs"
                  style={{ width: `${((overall.twitterScore + 1) / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Headlines feed */}
      <div className="mt-6">
        <span className="text-2xs font-semibold tracking-wider text-slate-500 uppercase block mb-3">
          Sourced Intel & Gemini Actionable Impact
        </span>

        <div className="max-h-[240px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          {news.length === 0 ? (
            <div className={`flex flex-col items-center justify-center p-6 text-center border rounded-xl ${
              isDark ? "border-slate-850 bg-slate-950/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"
            }`}>
              <AlertTriangle className="h-5 w-5 mb-1 text-slate-400" />
              <p className="text-xs">No active headlines queried for this symbol.</p>
            </div>
          ) : (
            news.map((item) => (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-200 ${
                  isDark 
                    ? "border-slate-850 bg-slate-950/20 hover:border-slate-705 hover:bg-slate-900/30" 
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className={`text-xs font-semibold leading-relaxed transition-colors ${
                      isDark ? "text-slate-200 group-hover:text-white" : "text-slate-800 group-hover:text-slate-950"
                    }`}>
                      {item.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 font-mono text-3xs text-slate-500">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{item.time}</span>
                    </div>
                  </div>

                  <span
                    className={`rounded font-mono text-3xs px-2 py-0.5 select-none ${getIndividualScoreColor(
                      item.score
                    )}`}
                  >
                    {item.score > 0 ? `+${item.score.toFixed(2)}` : item.score.toFixed(2)}
                  </span>
                </div>

                {/* Impact Rationale Row */}
                {item.impact && (
                  <div className={`mt-3 flex items-start gap-1.5 border pt-2.5 text-2xs leading-relaxed px-2.5 py-1.5 rounded ${
                    isDark 
                      ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-350"
                      : "border-teal-580/20 bg-teal-50/50 text-slate-600"
                  }`}>
                    <ArrowRight className={`h-3 w-3 mt-0.5 flex-shrink-0 ${isDark ? "text-emerald-400" : "text-teal-650"}`} />
                    <span>
                      <strong className={isDark ? "text-emerald-400" : "text-teal-700"}>Gemini Impact:</strong> {item.impact}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
