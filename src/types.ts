/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StockPricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  // Live calculated indicators
  sma?: number;
  ema?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
  atr?: number;
  volatility?: number;
  momentum?: number;
}

export type SymbolType = "AAPL" | "MSFT" | "GOOGL" | "AMZN" | "NVDA" | "TSLA" | "META";

export interface StockMetadata {
  symbol: SymbolType;
  name: string;
  sector: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  time: string;
  sentiment: "bullish" | "bearish" | "neutral";
  score: number; // -1 to 1
  impact: string; // Explaining why it impacts
}

export interface PredictionResult {
  modelName: string;
  nextDayPrice: number;
  direction: "up" | "down";
  confidence: number; // Percentage 0 - 100
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
    accuracy: number;
    f1: number;
  };
  forecast: Array<{ date: string; value: number }>;
}

export interface StockAnalysisData {
  metadata: StockMetadata;
  historical: StockPricePoint[];
  indicatorsExplanation: Record<string, { label: string; value: string; explanation: string }>;
  news: NewsItem[];
  overallSentiment: {
    score: number; // -1 to 1
    label: "bullish" | "bearish" | "neutral";
    twitterScore: number;
    newsScore: number;
  };
  predictions: Record<string, PredictionResult>;
  anomalies: string[]; // dates categorized as outliers
  clusters: Record<string, string[]>; // clusters generated through unsupervised learning
  portfolioDiversification: {
    diversificationScore: number; // 0-100
    recommendedWeights: Record<string, number>;
    riskCategory: "Low" | "Medium" | "High";
  };
}
