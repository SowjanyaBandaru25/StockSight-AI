/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Line,
  Bar,
  ComposedChart,
  Cell,
} from "recharts";
import { StockPricePoint, PredictionResult } from "../types";
import { Eye, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";

interface StockChartProps {
  historical: StockPricePoint[];
  prediction?: PredictionResult;
  modelName: string;
  activeIndicator: "none" | "bb" | "sma" | "ema" | "macd" | "rsi";
  theme?: "light" | "dark";
}

export function StockChart({
  historical,
  prediction,
  modelName,
  activeIndicator,
  theme = "light",
}: StockChartProps) {
  const [hoveredData, setHoveredData] = useState<any>(null);
  const isDark = theme === "dark";

  // Take the last 60 days to keep the chart beautiful and high-density
  const chartData = historical.slice(-60);

  // Append predictions to historical trends for unified display
  const combinedData = [...chartData.map(d => ({
    ...d,
    isForecast: false,
    forecastValue: null as number | null,
  }))];

  if (prediction && prediction.forecast) {
    const lastPoint = chartData[chartData.length - 1];
    
    // Add connector point
    combinedData.push({
      date: lastPoint.date,
      open: lastPoint.open,
      high: lastPoint.high,
      low: lastPoint.low,
      close: lastPoint.close,
      volume: 0,
      sma: lastPoint.sma,
      ema: lastPoint.ema,
      bbUpper: lastPoint.bbUpper,
      bbLower: lastPoint.bbLower,
      bbMiddle: lastPoint.bbMiddle,
      isForecast: true,
      forecastValue: lastPoint.close,
    });

    prediction.forecast.forEach(f => {
      combinedData.push({
        date: f.date,
        open: f.value,
        high: f.value,
        low: f.value,
        close: f.value,
        volume: 0,
        sma: undefined,
        ema: undefined,
        bbUpper: undefined,
        bbLower: undefined,
        bbMiddle: undefined,
        isForecast: true,
        forecastValue: f.value,
      });
    });
  }

  // Format custom tooltips
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`rounded-xl border p-4 font-mono text-xs shadow-xl backdrop-blur-md ${
          isDark 
            ? "border-slate-800 bg-slate-950/90 text-slate-200 shadow-premium-dark" 
            : "border-slate-200 bg-white/95 text-slate-800 shadow-premium-light"
        }`}>
          <p className={`border-b pb-1.5 font-bold ${
            isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-650"
          }`}>
            {data.date} {data.isForecast ? " (FORECAST)" : ""}
          </p>
          <div className="mt-2 space-y-1">
            <p className="flex justify-between gap-6">
              <span>Close Price:</span>
              <span className="font-bold text-teal-450">${Number(data.close || data.forecastValue).toFixed(2)}</span>
            </p>
            {!data.isForecast && (
              <>
                <p className="flex justify-between gap-6">
                  <span>High / Low:</span>
                  <span className={`${isDark ? "text-slate-350" : "text-slate-800"} font-semibold`}>
                    ${data.high?.toFixed(2)} / ${data.low?.toFixed(2)}
                  </span>
                </p>
                <p className="flex justify-between gap-6">
                  <span>Open:</span>
                  <span className={isDark ? "text-slate-400" : "text-slate-550"}>${data.open?.toFixed(2)}</span>
                </p>
                <p className="flex justify-between gap-6 text-slate-500">
                  <span>Volume:</span>
                  <span>{(data.volume / 1000000).toFixed(2)}M</span>
                </p>
              </>
            )}
            {data.sma && activeIndicator === "sma" && (
              <p className="flex justify-between gap-6 text-amber-500">
                <span>SMA (20):</span>
                <span>${data.sma.toFixed(2)}</span>
              </p>
            )}
            {data.ema && activeIndicator === "ema" && (
              <p className="flex justify-between gap-6 text-indigo-400">
                <span>EMA (12):</span>
                <span>${data.ema.toFixed(2)}</span>
              </p>
            )}
            {data.bbUpper && activeIndicator === "bb" && (
              <p className="flex justify-between gap-6 text-sky-400">
                <span>BB Upper:</span>
                <span>${data.bbUpper.toFixed(2)}</span>
              </p>
            )}
            {data.bbLower && activeIndicator === "bb" && (
              <p className="flex justify-between gap-6 text-sky-400">
                <span>BB Lower:</span>
                <span>${data.bbLower.toFixed(2)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`rounded-2xl border p-6 shadow-xl relative overflow-hidden transition-all duration-300 ${
      isDark 
        ? "border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-premium-dark text-slate-105" 
        : "border-slate-100 bg-white shadow-premium-light text-slate-850"
    }`}>
      {/* Soft color-theme top banner */}
      <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-emerald-500 to-emerald-200" />
      
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h4 className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${
            isDark ? "text-emerald-400" : "text-slate-800"
          }`}>
            <Eye className="h-4.5 w-4.5 text-emerald-500" />
            Core Analytics &amp; Price Evolution
          </h4>
          <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Visualizing historical timeseries data alongside modern predictive layers from <span className={`font-semibold underline ${isDark ? "text-emerald-400 decoration-emerald-800" : "text-emerald-600 decoration-emerald-200"}`}>{modelName}</span>.
          </p>
        </div>

        {prediction && (
          <div className={`flex items-center gap-3.5 self-start rounded-xl px-4 py-2 border shadow-3xs ${
            isDark 
              ? "bg-slate-950/40 border-slate-805 text-slate-300"
              : "bg-emerald-50/50 border-emerald-100 shadow-xs"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-emerald-800"}`}>AI Bias:</span>
              <span
                className={`inline-flex items-center gap-0.5 font-sans text-xs font-bold capitalize ${
                  prediction.direction === "up" ? "text-emerald-450 font-bold" : "text-rose-455 font-bold"
                }`}
              >
                {prediction.direction === "up" ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {prediction.direction}
              </span>
            </div>
            <div className={`h-3 w-[1px] ${isDark ? "bg-slate-800" : "bg-emerald-200"}`} />
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-500" : "text-emerald-800"}`}>Estimate:</span>
              <span className={`font-mono text-xs font-bold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>${prediction.nextDayPrice.toFixed(2)}</span>
            </div>
            <div className={`h-3 w-[1px] ${isDark ? "bg-slate-800" : "bg-emerald-200"}`} />
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? "text-slate-505" : "text-emerald-800"}`}>Confidence:</span>
              <span className={`font-mono text-xs font-bold ${isDark ? "text-indigo-400 font-bold" : "text-indigo-650"}`}>{prediction.confidence}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Main financial chart */}
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={combinedData}
            onMouseMove={(state: any) => {
              if (state && state.activePayload) {
                setHoveredData(state.activePayload[0].payload);
              }
            }}
            onMouseLeave={() => setHoveredData(null)}
          >
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={isDark ? 0.25 : 0.2} />
                <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={isDark ? 0.08 : 0.06} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} opacity={isDark ? 0.4 : 0.7} />
            
            <XAxis
              dataKey="date"
              stroke={isDark ? "#94a3b8" : "#64748b"}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            
            <YAxis
              domain={["auto", "auto"]}
              stroke={isDark ? "#94a3b8" : "#64748b"}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              dx={-5}
              tickFormatter={(value) => `$${value}`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Bollinger Bands Shaded Area */}
            {activeIndicator === "bb" && (
              <Area
                type="monotone"
                dataKey="bbUpper"
                stroke="transparent"
                fill="url(#colorBB)"
                fillOpacity={1}
              />
            )}
            
            {activeIndicator === "bb" && (
              <Line
                type="monotone"
                dataKey="bbUpper"
                stroke="#38bdf8"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
            )}

            {activeIndicator === "bb" && (
              <Line
                type="monotone"
                dataKey="bbLower"
                stroke="#38bdf8"
                strokeWidth={1}
                strokeDasharray="4 4"
                dot={false}
              />
            )}

            {activeIndicator === "bb" && (
              <Line
                type="monotone"
                dataKey="bbMiddle"
                stroke="#0284c7"
                strokeWidth={1.2}
                dot={false}
              />
            )}

            {/* Simple Moving Average */}
            {activeIndicator === "sma" && (
              <Line
                type="monotone"
                dataKey="sma"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
              />
            )}

            {/* Exponential Moving Average */}
            {activeIndicator === "ema" && (
              <Line
                type="monotone"
                dataKey="ema"
                stroke="#6366f1"
                strokeWidth={1.5}
                dot={false}
              />
            )}

            {/* Actual close price Area path */}
            <Area
              type="monotone"
              dataKey="close"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorClose)"
              dot={false}
            />

            {/* Simulated Forecast Trend */}
            <Line
              type="monotone"
              dataKey="forecastValue"
              stroke="#818cf8"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 4, stroke: "#6366f1", strokeWidth: 1.5, fill: "#eff6ff" }}
            />

            {/* Volume bar chart on bottom layer dynamically colorized */}
            <Bar
              dataKey="volume"
              yAxisId={0}
              maxBarSize={8}
            >
              {combinedData.map((entry, index) => {
                const isUp = !entry.close || !entry.open || entry.close >= entry.open;
                const strokeColor = isUp ? "#059669" : "#e11d48"; // emerald-600 or rose-600
                const fillColor = isUp ? "#10b981" : "#f43f5e"; // emerald-500 or rose-500
                return (
                  <Cell
                    key={`volume-cell-${index}`}
                    fill={fillColor}
                    fillOpacity={0.25}
                    stroke={strokeColor}
                    strokeOpacity={0.35}
                    strokeWidth={0.5}
                  />
                );
              })}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className={`mt-4 flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-2xs font-mono transition-all duration-300 ${
        isDark ? "border-slate-800 text-slate-400" : "border-slate-200 text-slate-500"
      }`}>
        <div className="flex gap-4">
          <span className={`flex items-center gap-1 font-semibold ${isDark ? "text-slate-350" : "text-slate-600"}`}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Close Trend
          </span>
          <span className={`flex items-center gap-1 font-semibold ${isDark ? "text-slate-350" : "text-slate-600"}`}>
            <span className="h-2 w-2 rounded-full bg-indigo-500" style={{ borderStyle: "dashed", strokeDasharray: "2" }} /> AI Forecast (5d out)
          </span>
          {activeIndicator !== "none" && (
            <span className={`flex items-center gap-1 font-semibold ${isDark ? "text-slate-200" : "text-slate-750"}`}>
              <span className={`h-2 w-2 rounded-full ${
                activeIndicator === "sma" ? "bg-amber-500" : activeIndicator === "ema" ? "bg-indigo-500" : "bg-sky-400"
              }`} />
              Active Indicators: {activeIndicator.toUpperCase()}
            </span>
          )}
        </div>
        <div className="font-semibold text-slate-500">
          Hover point close:{" "}
          <span className={`font-bold ${isDark ? "text-teal-400" : "text-slate-800"}`}>
            {hoveredData ? `$${Number(hoveredData.close || hoveredData.forecastValue).toFixed(2)}` : "None Selected"}
          </span>
        </div>
      </div>
    </div>
  );
}
