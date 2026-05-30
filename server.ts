/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { enrichWithIndicators } from "./utils/indicators";
import { generateStockHistory, getSymbolBaseConfig } from "./utils/preprocessing";
import { analyzeNewsSentiment } from "./utils/sentiment";
import {
  compileModelPredictions,
  runIsolationForest,
  runKMeans,
} from "./utils/prediction";
import { StockAnalysisData, SymbolType } from "./src/types";

// ============================================================================
// 1. STATEFUL ARCHITECTURE & UTILITIES
// ============================================================================

// Logger configuration helpers
function logInfo(msg: string) {
  console.log(`[INFO] [${new Date().toISOString()}] ${msg}`);
}
function logError(msg: string, err?: any) {
  console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, err);
}

// Support List of market symbols
const SUPPORTED_SYMBOLS: SymbolType[] = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"];

/**
 * Enterprise Circuit Breaker Pattern around external Gemini NLP API Calls
 */
class CircuitBreaker {
  private state: "CLOSED" | "OPEN" | "HALF-OPEN" = "CLOSED";
  private failureThreshold = 3;
  private cooldownPeriod = 30000; // 30-second trip cooldown
  private consecutiveFailures = 0;
  private lastStateChange = Date.now();

  public async execute<T>(action: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    const now = Date.now();
    
    if (this.state === "OPEN") {
      if (now - this.lastStateChange > this.cooldownPeriod) {
        this.state = "HALF-OPEN";
        this.lastStateChange = now;
        logInfo("[CIRCUIT BREAKER] Entering HALF-OPEN state. Testing Gemini API availability...");
      } else {
        logInfo("[CIRCUIT BREAKER] State is OPEN. Skipping external API call; routing instantly to local VADER Lexicon fallback.");
        return fallback();
      }
    }

    try {
      const result = await action();
      if (this.state === "HALF-OPEN") {
        this.state = "CLOSED";
        this.consecutiveFailures = 0;
        this.lastStateChange = now;
        logInfo("[CIRCUIT BREAKER] External API call succeeded on HALF-OPEN! Resetting breaker state to CLOSED.");
      }
      this.consecutiveFailures = 0;
      return result;
    } catch (error: any) {
      this.consecutiveFailures++;
      logError(`[CIRCUIT BREAKER] Failure registered. Consecutive failure tally: ${this.consecutiveFailures}`, error);
      
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = "OPEN";
        this.lastStateChange = now;
        logError("[CIRCUIT BREAKER] Consecutive failure threshold crossed! Tripping breaker to OPEN state.");
      }
      return fallback();
    }
  }

  public getStatus() {
    return this.state;
  }
}

const geminiBreaker = new CircuitBreaker();

/**
 * Sentiment caching layer to prevent excessive token use and bypass rate limits (10 minutes longevity)
 */
interface NewsSentimentCacheEntry {
  timestamp: number;
  data: any;
}
const newsCache: Record<string, NewsSentimentCacheEntry> = {};
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// 2. EXPRESS API SERVER DEFINITIONS & API DECOUPLING
// ============================================================================

const app = express();
const PORT = 3000;

app.use(express.json());

// Spawn reference for parent process clean up
let pythonSubprocess: ChildProcess | null = null;
let usePython3Fallback = false;

// Starts Python FastAPI microservice
function startPythonFastAPIService() {
  const cmd = usePython3Fallback ? "python3" : "python";
  logInfo(`Starting decoupled Python FastAPI gateway service using ${cmd}...`);
  
  const env = { ...process.env, PYTHON_PORT: "8000" };
  
  try {
    pythonSubprocess = spawn(cmd, ["main.py"], { env });

    pythonSubprocess.stdout?.on("data", (data) => {
      console.log(`[FASTAPI-STDOUT] ${data.toString().trim()}`);
    });

    pythonSubprocess.stderr?.on("data", (data) => {
      console.error(`[FASTAPI-STDERR] ${data.toString().trim()}`);
    });

    pythonSubprocess.on("error", (err: any) => {
      logError(`FastAPI subprocess (${cmd}) error occurred:`, err);
      if (err.code === "ENOENT") {
        if (!usePython3Fallback) {
          logInfo("Command 'python' was not found. Retrying with 'python3' fallback...");
          usePython3Fallback = true;
          startPythonFastAPIService();
        } else {
          logError("Both 'python' and 'python3' commands failed with ENOENT. Running without FastAPI service (using graceful local quant fallbacks).");
        }
      }
    });

    pythonSubprocess.on("close", (code) => {
      if (code !== null && code !== 0) {
        logError(`decoupled Python FastAPI service terminated with exit code ${code}. Re-spawning in 5 seconds...`);
        setTimeout(startPythonFastAPIService, 5000);
      }
    });
  } catch (err) {
    logError("Synchronous exception during FastAPI service spawn:", err);
  }
}

// Asynchronously install python dependencies before running the FastAPI script
function ensurePythonDependencies(callback: () => void) {
  const pythonCmd = usePython3Fallback ? "python3" : "python";
  logInfo(`Checking and updating python packages using ${pythonCmd} -m pip install...`);
  
  const env = { ...process.env };
  const installProcess = spawn(pythonCmd, ["-m", "pip", "install", "-r", "requirements.txt", "--break-system-packages"], { env });

  installProcess.stdout?.on("data", (data) => {
    console.log(`[PIP-STDOUT] ${data.toString().trim()}`);
  });

  installProcess.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg.includes("ERROR") || msg.includes("WARNING") || msg.includes("ModuleNotFoundError")) {
      console.warn(`[PIP-STDERR] ${msg}`);
    }
  });

  installProcess.on("error", (err: any) => {
    logError(`Pip installation process error: ${err.message}`);
    if (err.code === "ENOENT" && !usePython3Fallback) {
      logInfo("Pip executable not found with default command/path. Retrying check with python3...");
      usePython3Fallback = true;
      ensurePythonDependencies(callback);
    } else {
      logInfo("Could not check/install python packages automatically. Running fastAPIService directly...");
      callback();
    }
  });

  installProcess.on("close", (code) => {
    if (code === 0) {
      logInfo("All decoupled python dependencies successfully verified & synchronized!");
      callback();
    } else {
      logError(`Pip install exited with code ${code}.`);
      if (!usePython3Fallback) {
        logInfo("Retrying setup check with python3...");
        usePython3Fallback = true;
        ensurePythonDependencies(callback);
      } else {
        logInfo("Could not check/install python packages automatically. Running fastAPIService directly...");
        callback();
      }
    }
  });
}

// Boot Python on module init after verifying pydantic & mathematical libraries are present
ensurePythonDependencies(() => {
  startPythonFastAPIService();
});

/**
 * Health routing
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    gateway: "Express-NodeJS-Bridge",
    pythonServiceState: pythonSubprocess ? "Spawning/Active" : "Offline",
    breakerStatus: geminiBreaker.getStatus(),
    timestamp: new Date().toISOString()
  });
});

/**
 * Primary HTTP Analysis Request
 * Pulls from FastAPI core, falling back to local TypeScript processing if offline
 */
app.get("/api/stock/:symbol", async (req, res) => {
  const symbol = (req.params.symbol || "AAPL").toUpperCase() as SymbolType;

  logInfo(`Endpoint api/stock/${symbol} hit.`);

  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    logError(`No assets matching query for: ${symbol}`);
    res.status(400).json({ error: "Stock symbol not currently supported." });
    return;
  }

  try {
    const config = getSymbolBaseConfig(symbol);
    
    // 1. Fetch live calculations from python FastAPI
    let pyData: any = null;
    let fallbackUsed = false;
    
    try {
      logInfo(`Forwarding calculations query to Python FastAPI (http://localhost:8000/api/python/stock/${symbol})...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      try {
        const pyResponse = await fetch(`http://localhost:8000/api/python/stock/${symbol}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (pyResponse.ok) {
          pyData = await pyResponse.json();
        } else {
          logError(`FastAPI returned non-healthy response: ${pyResponse.status}`);
        }
      } catch (innerErr: any) {
        clearTimeout(timeoutId);
        throw innerErr;
      }
    } catch (e: any) {
      logError(`FastAPI bridge is offline or timed out. Graceful local Quant fallback activated: ${e.message}`);
      fallbackUsed = true;
    }

    // Initialize core analysis payloads
    let historical: any[];
    let predictions: any;
    let anomalies: string[];
    let clusters: any;

    if (pyData) {
      // Use Python decoupled calculations (Pandas + Numpy + scikit-learn + FastAPI LSTM/XGBoost)
      historical = pyData.historical;
      predictions = pyData.predictions;
      anomalies = pyData.anomalies;
      clusters = pyData.clusters;
    } else {
      // Offline fallback: Use standard TypeScript engineering metrics
      const rawHistory = generateStockHistory(symbol, 150, config.price);
      historical = enrichWithIndicators(rawHistory);
      anomalies = runIsolationForest(historical);
      
      const assetReturns = SUPPORTED_SYMBOLS.map(sym => {
        const change = (Math.random() - 0.5) * 0.05;
        return { symbol: sym, returnPct: change };
      });
      clusters = runKMeans(assetReturns, 3);
    }

    // 2. Perform Resilient Sentiment Analysis with Caching + Circuit Breaker
    let sentimentResult: any = null;
    const cachedEntry = newsCache[symbol];
    
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS)) {
      logInfo(`Sentiment Cache HIT for: ${symbol}`);
      sentimentResult = cachedEntry.data;
    } else {
      logInfo(`Sentiment Cache MISS for: ${symbol}. Running live Gemini NLP pipeline wrapper...`);
      const apiKey = process.env.GEMINI_API_KEY;
      
      sentimentResult = await geminiBreaker.execute(
        async () => {
          if (!apiKey) throw new Error("GEMINI_API_KEY environment variable undefined");
          return await analyzeNewsSentiment(symbol, apiKey);
        },
        async () => {
          logInfo("[NLP PIPELINE] Fallback activated. Serving local news sentiment calculations (VADER light)...");
          // Undefined key triggers VADER logic inside analyzeNewsSentiment
          return await analyzeNewsSentiment(symbol, undefined);
        }
      );
      
      newsCache[symbol] = {
        timestamp: Date.now(),
        data: sentimentResult
      };
    }

    // Adjust fallback predictions if Python was offline
    if (!pyData) {
      predictions = compileModelPredictions(symbol, historical, sentimentResult.overall.score);
    }

    // 3. Compile indicators explanation map
    const lastPoint = historical[historical.length - 1] || { close: config.price };
    const indicatorsExplanation = {
      SMA: {
        label: "SMA (Simple Moving Average)",
        value: `${lastPoint.sma || "N/A"}`,
        explanation: "Simple line tracking the average closing price over 20 days. Trend direction indicator used to detect resistance/breakouts."
      },
      EMA: {
        label: "EMA (Exponential Moving Average)",
        value: `${lastPoint.ema || "N/A"}`,
        explanation: "Exponential smoothing line prioritizing recent prices over past data points. Rapidly signals trend changes."
      },
      RSI: {
        label: "RSI (Relative Strength Index)",
        value: `${lastPoint.rsi || "N/A"}`,
        explanation: "Momentum wave ranging 0-100. Readings ≤30 flag oversold buying regimes, while readings ≥70 indicate overbought sell setups."
      },
      MACD: {
        label: "MACD Indicator Suite",
        value: `Hist: ${lastPoint.macdHist || "N/A"}`,
        explanation: "Subtracts the 12-day EMA from 26-day EMA. Crossings above or below the signal line give buy/sell execution markers."
      },
      BollingerBands: {
        label: "Bollinger Volatility Bands",
        value: `U: ${lastPoint.bbUpper || "n/a"} | L: ${lastPoint.bbLower || "n/a"}`,
        explanation: "Dynamic pricing channels plotting standard deviation lines. Touches on outer boundaries signal statistical extremes."
      },
      ATR: {
        label: "ATR (Average True Range)",
        value: `${lastPoint.atr || "N/A"}`,
        explanation: "Captures structural daily price ranges over standard 14 days. Critical index indicating the exact market volatility gap."
      },
      Volatility: {
        label: "Historical Return Volatility",
        value: `${lastPoint.volatility || "N/A"}`,
        explanation: "Calculated standard deviation of close returns. High spikes signal intense investor indecision and risk spreads."
      },
      Momentum: {
        label: "Price Absolute Momentum",
        value: `${lastPoint.momentum || "N/A"}`,
        explanation: "Quantifies direction and net speed of price shift relative to 10 sessions ago. Signals raw breakout strength."
      }
    };

    // 4. Portfolio weights
    const recommendedWeights: Record<string, number> = {};
    let remaining = 100;
    recommendedWeights[symbol] = 40;
    remaining -= 40;

    const remainingSyms = SUPPORTED_SYMBOLS.filter(s => s !== symbol).slice(0, 3);
    remainingSyms.forEach((sym, i) => {
      const alloc = i === remainingSyms.length - 1 ? remaining : Math.round(remaining / 2);
      recommendedWeights[sym] = alloc;
      remaining -= alloc;
    });

    const diversificationScore = Math.round(75 + sentimentResult.overall.score * 10);
    const riskCategory = (lastPoint.volatility || 1.0) < 1.4 ? "Low" : ((lastPoint.volatility || 1.0) < 2.5 ? "Medium" : "High");

    const responsePayload: StockAnalysisData = {
      metadata: {
        symbol,
        name: config.name,
        sector: config.sector,
        currentPrice: lastPoint.close,
        change: Number((lastPoint.close - historical[historical.length - 2].close).toFixed(2)),
        changePercent: Number(((lastPoint.close - historical[historical.length - 2].close) / historical[historical.length - 2].close * 100).toFixed(2)),
        high24h: lastPoint.high,
        low24h: lastPoint.low,
        volume24h: lastPoint.volume,
      },
      historical,
      indicatorsExplanation,
      news: sentimentResult.items,
      overallSentiment: sentimentResult.overall,
      predictions,
      anomalies,
      clusters,
      portfolioDiversification: {
        diversificationScore,
        recommendedWeights,
        riskCategory
      }
    };

    res.json(responsePayload);
  } catch (error) {
    logError(`Failed to coordinate stock indicator query for ${symbol}:`, error);
    res.status(500).json({ error: "Bridge pipelines offline. Recalling structural models shortly." });
  }
});

// ============================================================================
// 3. PERSISTENT WEBSOCKETS LAYER & STREAMING TICKS
// ============================================================================

// Attached WebSocket connections pool
const connectedClientWebSockets = new Set<WebSocket & { activeSymbol?: string }>();

// Broadcaster routine that streams live bids/asks ticks every 1000ms
setInterval(() => {
  connectedClientWebSockets.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const symbol = client.activeSymbol || "AAPL";
      const config = getSymbolBaseConfig(symbol as SymbolType);
      
      // Calculate micro ticks
      const volatilityModifier = 1.3;
      const variation = (Math.random() - 0.49) * (volatilityModifier * 0.15);
      const bidClose = Number((config.price + variation).toFixed(2));
      const driftDirection = variation > 0 ? "up" : variation < 0 ? "down" : "stable";

      client.send(JSON.stringify({
        type: "TICK",
        symbol: symbol,
        price: bidClose,
        direction: driftDirection,
        timestamp: new Date().toLocaleTimeString(),
        clientSessionsActive: connectedClientWebSockets.size
      }));
    }
  });
}, 1000); // Fast 1-second feed ticks

// ============================================================================
// 4. DEVELOPMENT ROUTING & SERVER LISTENERS BOOT
// ============================================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    logInfo("Mounting dynamic Vite dev server routing middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    logInfo("Mounting compiled static asset routing distributions...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Create primary HTTP listener on port 3000
  const serverInstance = app.listen(PORT, "0.0.0.0", () => {
    logInfo(`AI StockVision platform online at: http://localhost:${PORT}`);
  });

  // Upgrade router to attach persistence WebSockets
  const wss = new WebSocketServer({ noServer: true });

  serverInstance.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    
    if (pathname === "/ws/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket & { activeSymbol?: string }, request) => {
    logInfo("Broker Ingest clients handshake verified.");
    
    // Parse symbol if present in query parameters
    try {
      const parsedUrl = new URL(request.url || "", `http://${request.headers.host}`);
      const symbolParam = parsedUrl.searchParams.get("symbol");
      if (symbolParam) {
        ws.activeSymbol = symbolParam.toUpperCase();
      } else {
        ws.activeSymbol = "AAPL";
      }
    } catch {
      ws.activeSymbol = "AAPL";
    }

    connectedClientWebSockets.add(ws);

    // Initial tick down payload
    ws.send(JSON.stringify({
      type: "SYSTEM_ACK",
      message: `Ticking bridge linked. Subscribed to live pricing feed for: ${ws.activeSymbol}`,
      timestamp: new Date().toLocaleTimeString()
    }));

    ws.on("message", async (msg: string) => {
      try {
        const payload = JSON.parse(msg);
        
        if (payload.type === "SUBSCRIBE") {
          const selectedAsset = (payload.symbol || "AAPL").toUpperCase();
          ws.activeSymbol = selectedAsset;
          ws.send(JSON.stringify({
            type: "SUBSCRIBE_ACK",
            symbol: selectedAsset,
            message: `Switched real-time ticker feed to: ${selectedAsset}`
          }));
          logInfo(`Client updated live WS socket subscription to: ${selectedAsset}`);
        }
        
        // Fulfilling Celery task offloading asynchronously
        if (payload.type === "OPTIMIZE_PORTFOLIO") {
          const symbols = payload.symbols || ["AAPL", "MSFT", "GOOGL"];
          const riskProfile = payload.riskProfile || "medium";
          
          ws.send(JSON.stringify({
            type: "OPTIMIZE_TASK_SUBMITTED",
            message: "Portfolio optimization submitted to FastAPI task queue. Processing Monte Carlo simulation."
          }));

          // Direct Axios/Fetch bridge of async background task submission to Python FastAPI
          try {
            const apiRes = await fetch("http://localhost:8000/api/python/optimize-portfolio", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ symbols, risk_tolerance: riskProfile })
            });

            if (apiRes.ok) {
              const taskObj = await apiRes.json();
              const taskId = taskObj.taskId;
              
              // Poll the Python status endpoints in background, freeing up main express thread!
              let attempts = 0;
              const maxAttempts = 20;
              
              const pollInterval = setInterval(async () => {
                attempts++;
                try {
                  const checkRes = await fetch(`http://localhost:8000/api/python/optimize-portfolio/${taskId}`);
                  if (checkRes.ok) {
                    const taskStatus = await checkRes.json();
                    if (taskStatus.status === "COMPLETED") {
                      clearInterval(pollInterval);
                      ws.send(JSON.stringify({
                        type: "OPTIMIZE_TASK_COMPLETED",
                        taskId,
                        result: taskStatus.result
                      }));
                      logInfo(`Background optimization task ${taskId} successfully pushed to client.`);
                    } else if (taskStatus.status === "FAILED") {
                      clearInterval(pollInterval);
                      ws.send(JSON.stringify({
                        type: "OPTIMIZE_TASK_FAILED",
                        error: taskStatus.error || "Simulation failure."
                      }));
                    }
                  }
                } catch (checkErr: any) {
                  logError(`Error polling task status for ID ${taskId}: ${checkErr.message}`);
                }

                if (attempts >= maxAttempts) {
                  clearInterval(pollInterval);
                  ws.send(JSON.stringify({
                    type: "OPTIMIZE_TASK_TIMEOUT",
                    error: "Deep optimization took too long. Task still running on background daemon."
                  }));
                }
              }, 500); // Poll once every 500ms
            } else {
              ws.send(JSON.stringify({
                type: "OPTIMIZE_TASK_FAILED",
                error: "FastAPI server rejected task enqueue submission."
              }));
            }
          } catch (apiErr: any) {
            logError("Failed to delegate optimization background task to python core daemon: ", apiErr);
            ws.send(JSON.stringify({
              type: "OPTIMIZE_TASK_FAILED",
              error: "FastAPI optimization core unreachable. Fallback calculation engines offline."
            }));
          }
        }
      } catch (err) {
        logError("WebSocket parse failure on message receive", err);
      }
    });

    ws.on("close", () => {
      connectedClientWebSockets.delete(ws);
      logInfo("Broker Ingest client connection closed.");
    });
  });

  // Handle teardown processes cleanly
  process.on("SIGINT", () => {
    if (pythonSubprocess) {
      logInfo("Killing FastAPI daemon before shutdown.");
      pythonSubprocess.kill();
    }
    process.exit(0);
  });
}

startServer().catch((e) => {
  logError("Platform failed to boot custom express server:", e);
});
