/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StockPricePoint } from "../src/types";

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(data: StockPricePoint[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(data[i].close); // fallback to raw
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(data: StockPricePoint[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let currentEma = data[0].close;
  ema.push(currentEma);

  for (let i = 1; i < data.length; i++) {
    currentEma = data[i].close * k + currentEma * (1 - k);
    ema.push(currentEma);
  }
  return ema;
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(data: StockPricePoint[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (data.length === 0) return rsi;

  let gains = 0;
  let losses = 0;

  // Initialize
  rsi.push(50); // initial default

  // Calculate first change
  for (let i = 1; i < Math.min(period + 1, data.length); i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Fill initial blanks
  for (let i = 1; i < period; i++) {
    rsi.push(50);
  }

  const firstRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  if (data.length >= period) {
    rsi.push(firstRsi);
  }

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const currentRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    rsi.push(currentRsi);
  }

  return rsi;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: StockPricePoint[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; hist: number[] } {
  const fastEma = calculateEMA(data, fastPeriod);
  const slowEma = calculateEMA(data, slowPeriod);

  const macd: number[] = [];
  for (let i = 0; i < data.length; i++) {
    macd.push(fastEma[i] - slowEma[i]);
  }

  // Calculate Signal line (EMA of MACD)
  const signal: number[] = [];
  const k = 2 / (signalPeriod + 1);
  let currentSignal = macd[0];
  signal.push(currentSignal);

  for (let i = 1; i < macd.length; i++) {
    currentSignal = macd[i] * k + currentSignal * (1 - k);
    signal.push(currentSignal);
  }

  const hist: number[] = [];
  for (let i = 0; i < macd.length; i++) {
    hist.push(macd[i] - signal[i]);
  }

  return { macd, signal, hist };
}

/**
 * Calculates Bollinger Bands
 */
export function calculateBollingerBands(
  data: StockPricePoint[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(data[i].close);
      lower.push(data[i].close);
    } else {
      let varianceSum = 0;
      const avg = middle[i];
      for (let j = 0; j < period; j++) {
        varianceSum += Math.pow(data[i - j].close - avg, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);
      upper.push(avg + stdDevMultiplier * stdDev);
      lower.push(avg - stdDevMultiplier * stdDev);
    }
  }

  return { upper, middle, lower };
}

/**
 * Calculates ATR (Average True Range)
 */
export function calculateATR(data: StockPricePoint[], period: number = 14): number[] {
  const tr: number[] = [];
  tr.push(data[0].high - data[0].low);

  for (let i = 1; i < data.length; i++) {
    const tr1 = data[i].high - data[i].low;
    const tr2 = Math.abs(data[i].high - data[i - 1].close);
    const tr3 = Math.abs(data[i].low - data[i - 1].close);
    tr.push(Math.max(tr1, tr2, tr3));
  }

  const atr: number[] = [];
  if (data.length === 0) return atr;

  let currentAtr = tr[0];
  atr.push(currentAtr);

  for (let i = 1; i < data.length; i++) {
    currentAtr = (currentAtr * (period - 1) + tr[i]) / period;
    atr.push(currentAtr);
  }

  return atr;
}

/**
 * Calculates Volatility (Rolling Std Dev of close prices)
 */
export function calculateVolatility(data: StockPricePoint[], period: number = 10): number[] {
  const vol: number[] = [];
  const sma = calculateSMA(data, period);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      vol.push(0.01); // minor base volatility
    } else {
      let sumSqDiff = 0;
      const avg = sma[i];
      for (let j = 0; j < period; j++) {
        sumSqDiff += Math.pow(data[i - j].close - avg, 2);
      }
      vol.push(Math.sqrt(sumSqDiff / period));
    }
  }
  return vol;
}

/**
 * Calculates Momentum (10-day rate of change)
 */
export function calculateMomentum(data: StockPricePoint[], period: number = 10): number[] {
  const mom: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      mom.push(0);
    } else {
      mom.push(data[i].close - data[i - period].close);
    }
  }
  return mom;
}

/**
 * Enriches the entire StockPricePoint stream with all calculations
 */
export function enrichWithIndicators(data: StockPricePoint[]): StockPricePoint[] {
  if (data.length === 0) return data;

  const sma = calculateSMA(data, 20);
  const ema = calculateEMA(data, 12);
  const rsi = calculateRSI(data, 14);
  const { macd, signal: macdSignal, hist: macdHist } = calculateMACD(data);
  const { upper: bbUpper, middle: bbMiddle, lower: bbLower } = calculateBollingerBands(data, 20, 2);
  const atr = calculateATR(data, 14);
  const volatility = calculateVolatility(data, 10);
  const momentum = calculateMomentum(data, 10);

  return data.map((d, index) => ({
    ...d,
    sma: Number(sma[index].toFixed(2)),
    ema: Number(ema[index].toFixed(2)),
    rsi: Number(rsi[index].toFixed(2)),
    macd: Number(macd[index].toFixed(2)),
    macdSignal: Number(macdSignal[index].toFixed(2)),
    macdHist: Number(macdHist[index].toFixed(2)),
    bbUpper: Number(bbUpper[index].toFixed(2)),
    bbMiddle: Number(bbMiddle[index].toFixed(2)),
    bbLower: Number(bbLower[index].toFixed(2)),
    atr: Number(atr[index].toFixed(2)),
    volatility: Number(volatility[index].toFixed(2)),
    momentum: Number(momentum[index].toFixed(2)),
  }));
}
