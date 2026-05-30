/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StockPricePoint, SymbolType } from "../src/types";

/**
 * Standard MinMaxScaler implementation
 */
export class MinMaxScaler {
  private min = 0;
  private max = 1;

  fitTransform(values: number[]): number[] {
    if (values.length === 0) return [];
    this.min = Math.min(...values);
    this.max = Math.max(...values);
    const range = this.max - this.min || 1;
    return values.map(v => (v - this.min) / range);
  }

  inverseTransform(values: number[]): number[] {
    const range = this.max - this.min || 1;
    return values.map(v => v * range + this.min);
  }
}

/**
 * Generates geometric Brownian motion (GBM) timeseries for simulation
 */
export function generateStockHistory(
  symbol: SymbolType,
  days: number = 100,
  basePrice: number = 150,
  drift: number = 0.0003, // average daily return
  volatility: number = 0.015 // daily variance stddev
): StockPricePoint[] {
  const data: StockPricePoint[] = [];
  const startTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

  let currentPrice = basePrice;

  for (let i = 0; i < days; i++) {
    const timestamp = new Date(startTimestamp + i * 24 * 60 * 60 * 1000);
    const dateStr = timestamp.toISOString().split("T")[0];

    // standard normal random distribution using Box-Muller transform
    const u1 = Math.random() || 0.0001;
    const u2 = Math.random() || 0.0001;
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // GBM Pricing formula: price_t = price_{t-1} * exp((drift - vol^2 / 2) + vol * z)
    const shock = (drift - Math.pow(volatility, 2) / 2) + volatility * z;
    const priceChange = Math.exp(shock);
    const prevClose = currentPrice;
    currentPrice = prevClose * priceChange;

    const high = Math.max(prevClose, currentPrice) * (1 + Math.random() * 0.01);
    const low = Math.min(prevClose, currentPrice) * (1 - Math.random() * 0.01);
    const open = prevClose + (Math.random() - 0.5) * (Math.abs(prevClose - currentPrice));
    const volume = Math.floor(1000000 + Math.random() * 9000000);

    data.push({
      date: dateStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(currentPrice.toFixed(2)),
      volume: volume,
    });
  }

  return data;
}

/**
 * Helper to retrieve baseline specifications for our supported symbols
 */
export function getSymbolBaseConfig(symbol: SymbolType): { name: string; sector: string; price: number } {
  const configs: Record<SymbolType, { name: string; sector: string; price: number }> = {
    AAPL: { name: "Apple Inc.", sector: "Technology", price: 185.4 },
    MSFT: { name: "Microsoft Corporation", sector: "Technology", price: 421.2 },
    GOOGL: { name: "Alphabet Inc.", sector: "Technology", price: 172.6 },
    AMZN: { name: "Amazon.com, Inc.", sector: "Consumer Cyclical", price: 181.8 },
    NVDA: { name: "NVIDIA Corporation", sector: "Semiconductors", price: 125.5 },
    TSLA: { name: "Tesla, Inc.", sector: "Automotive", price: 179.3 },
    META: { name: "Meta Platforms, Inc.", sector: "Technology", price: 468.9 }
  };

  // Safe mapping correction (since bracket notation used )
  const conf = configs[symbol];
  return {
    name: conf ? conf.name : "Apple Inc.",
    sector: conf ? conf.sector : "Technology",
    price: conf ? conf.price : 185.4
  };
}
