/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { ArrowUpRight, ArrowDownRight, Activity } from "lucide-react";

interface StatCardProps {
  id: string;
  title: string;
  value: string | number;
  subValue?: string;
  change?: number;
  changePercent?: number;
  icon?: React.ReactNode;
  risk?: "Low" | "Medium" | "High";
  theme?: "light" | "dark";
}

export function StatCard({
  id,
  title,
  value,
  subValue,
  change,
  changePercent,
  icon,
  risk,
  theme = "light",
}: StatCardProps) {
  const isPositive = change !== undefined ? change >= 0 : true;
  const isDark = theme === "dark";

  // Card classes based on ID and theme
  const getCardStyles = () => {
    if (isDark) {
      switch (id) {
        case "market-price-card":
          return "border-emerald-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/30 hover:border-emerald-500 shadow-md shadow-emerald-950/10";
        case "hft-ticker-card":
          return "border-indigo-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/30 hover:border-indigo-500 shadow-md shadow-indigo-950/10";
        case "ml-forecast-card":
          return "border-amber-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/30 hover:border-amber-500 shadow-md shadow-amber-950/10";
        default:
          return "border-teal-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950/30 hover:border-teal-500 shadow-md shadow-teal-950/10";
      }
    } else {
      // Light Mode vibrant colored gradients for high-end feel
      switch (id) {
        case "market-price-card":
          return "border-emerald-450 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/20 text-white border-emerald-500";
        case "hft-ticker-card":
          return "border-indigo-450 bg-gradient-to-br from-indigo-500 via-indigo-650 to-purple-650 hover:shadow-lg hover:shadow-indigo-500/20 text-white border-indigo-500";
        case "ml-forecast-card":
          return "border-amber-450 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-500 hover:shadow-lg hover:shadow-amber-500/20 text-white border-amber-500";
        default:
          return "border-teal-450 bg-gradient-to-br from-teal-500 via-teal-650 to-cyan-600 hover:shadow-lg hover:shadow-teal-500/20 text-white border-teal-505";
      }
    }
  };

  // Card bar indicator (only for dark mode or specific borders)
  const getTopBarStyles = () => {
    switch (id) {
      case "market-price-card":
        return "from-emerald-500 to-emerald-300";
      case "hft-ticker-card":
        return "from-indigo-500 to-indigo-300";
      case "ml-forecast-card":
        return "from-amber-500 to-amber-300";
      default:
        return "from-teal-500 to-teal-300";
    }
  };

  // Label text styles
  const getTitleStyles = () => {
    if (isDark) {
      return "text-slate-350 font-bold tracking-widest";
    } else {
      return "text-white font-black tracking-widest";
    }
  };

  // Value text styles with gorgeous premium text gradients for dark mode
  const getValueStyles = () => {
    if (isDark) {
      switch (id) {
        case "market-price-card":
          return "text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400";
        case "hft-ticker-card":
          return "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-400";
        case "ml-forecast-card":
          return "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-350 to-amber-400";
        default:
          return "text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-teal-400";
      }
    } else {
      return "text-white select-all drop-shadow-sm";
    }
  };

  // SubValue text styles
  const getSubValueStyles = () => {
    if (isDark) {
      return "text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800 font-bold";
    } else {
      return "text-white bg-white/20 px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider backdrop-blur-3xs";
    }
  };

  // Change indicator / info label style
  const getChangeLabelStyles = () => {
    if (isDark) {
      return "text-slate-400 font-bold";
    } else {
      return "text-white/90 font-bold";
    }
  };

  // Icon block styles
  const getIconStyles = () => {
    if (isDark) {
      switch (id) {
        case "market-price-card":
          return "bg-emerald-950/50 text-emerald-405 border-emerald-900/60";
        case "hft-ticker-card":
          return "bg-indigo-950/50 text-indigo-405 border-indigo-900/60";
        case "ml-forecast-card":
          return "bg-amber-950/50 text-amber-405 border-amber-900/60";
        default:
          return "bg-teal-950/50 text-teal-405 border-teal-900/60";
      }
    } else {
      return "bg-white/20 text-white border-white/25 backdrop-blur-2xs";
    }
  };

  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${getCardStyles()}`}
    >
      {/* Absolute top glow accent line */}
      <div className={`absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r ${getTopBarStyles()}`} />

      <div className="flex items-center justify-between">
        <span className={`text-[11px] tracking-widest uppercase font-mono ${getTitleStyles()}`}>
          {title}
        </span>
        <div className={`rounded-xl p-2 border transition-all duration-300 ${getIconStyles()}`}>
          {icon || <Activity className="h-4.5 w-4.5" />}
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className={`font-mono text-2xl font-black tracking-tight ${getValueStyles()}`}>
          {value}
        </span>
        {subValue && (
          <span className={`text-[10px] font-mono uppercase tracking-wider ${getSubValueStyles()}`}>
            {subValue}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        {change !== undefined && (
          <>
            {isPositive ? (
              <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold rounded-lg px-2 py-0.5 ${
                isDark 
                  ? "text-emerald-400 bg-emerald-950/20 border border-emerald-900/40" 
                  : "text-white bg-white/20"
              }`}>
                <ArrowUpRight className="h-3 w-3" />
                +{changePercent?.toFixed(2)}%
              </span>
            ) : (
              <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold rounded-lg px-2 py-0.5 ${
                isDark 
                  ? "text-rose-405 bg-rose-950/20 border border-rose-900/40" 
                  : "text-white bg-rose-500/40"
              }`}>
                <ArrowDownRight className="h-3 w-3" />
                {changePercent?.toFixed(2)}%
              </span>
            )}
            <span className={`text-[10px] font-mono uppercase tracking-widest ${getChangeLabelStyles()}`}>
              24h
            </span>
          </>
        )}

        {risk && (
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-mono uppercase tracking-widest ${getChangeLabelStyles()}`}>RISK:</span>
            <span
              className={`font-mono text-2xs font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                risk === "Low"
                  ? isDark
                    ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                    : "bg-white/25 text-white border-white/30"
                  : risk === "Medium"
                  ? isDark
                    ? "bg-amber-950/40 text-amber-400 border-amber-900/60"
                    : "bg-white/25 text-white border-white/30"
                  : isDark
                  ? "bg-rose-955/40 text-rose-400 border-rose-900/60"
                  : "bg-rose-500/40 text-white border-rose-400/50"
              }`}
            >
              {risk}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
