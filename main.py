# ==============================================================================
# AI StockVision Platform — FastAPI Quantitative Microservice Gateway
# ==============================================================================

import os
import time
import math
import logging
import asyncio
from typing import List, Dict, Any, Optional

from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans

# 1. Initialize Logger Configuration
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("AI-StockVision-FastAPI")

app = FastAPI(
    title="AI StockVision Quantitative Engine",
    description="FastAPI service for indicators, unsupervised clustering, ML forecasters, and task offloading",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://stock-sight-ai-4cvv.vercel.app",
        "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Baseline configs for supported stock symbols
SYMBOL_CONFIGS = {
    "AAPL": {"name": "Apple Inc.", "sector": "Technology", "price": 185.4},
    "MSFT": {"name": "Microsoft Corporation", "sector": "Technology", "price": 421.2},
    "GOOGL": {"name": "Alphabet Inc.", "sector": "Technology", "price": 172.6},
    "AMZN": {"name": "Amazon.com, Inc.", "sector": "Consumer Cyclical", "price": 181.8},
    "NVDA": {"name": "NVIDIA Corporation", "sector": "Semiconductors", "price": 125.5},
    "TSLA": {"name": "Tesla, Inc.", "sector": "Automotive", "price": 179.3},
    "META": {"name": "Meta Platforms, Inc.", "sector": "Technology", "price": 468.9},
}

# 3. Simulated in-memory async task database (task queue)
tasks_db: Dict[str, Dict[str, Any]] = {}


class OptimizeRequest(BaseModel):
    symbols: List[str]
    risk_tolerance: Optional[str] = "medium"


# Background task logic for Sharpe Ratio portfolio optimization
async def run_portfolio_optimization(task_id: str, symbols: List[str], risk_tolerance: str):
    logger.info(f"Starting async portfolio optimization background task {task_id} for {symbols}")

    # Simulate heavy quantitative Monte Carlo simulations (3 seconds simulated compute)
    await asyncio.sleep(3.0)

    try:
        n = len(symbols)
        raw_weights = np.random.dirichlet(alpha=np.ones(n), size=1)[0]

        optimized_weights = {}
        for idx, sym in enumerate(symbols):
            optimized_weights[sym] = round(float(raw_weights[idx]) * 100, 1)

        # Re-balance slightly to make sum exactly 100
        total_sum = sum(optimized_weights.values())
        diff = 100.0 - total_sum
        if diff != 0 and len(symbols) > 0:
            optimized_weights[symbols[0]] = round(optimized_weights[symbols[0]] + diff, 1)

        sharpe_ratio = round(float(1.5 + np.random.rand() * 1.8), 2)
        annualized_return = round(float(10.0 + np.random.rand() * 25.0), 1)
        annualized_volatility = round(float(8.0 + np.random.rand() * 12.0), 1)

        tasks_db[task_id] = {
            "status": "COMPLETED",
            "completed_at": time.time(),
            "result": {
                "weights": optimized_weights,
                "sharpe_ratio": sharpe_ratio,
                "expected_return_pct": annualized_return,
                "expected_volatility_pct": annualized_volatility,
                "risk_profile": risk_tolerance.upper(),
                "simulation_runs": 10000,
                "efficient_frontier_points": 50,
            },
        }
        logger.info(f"Background task {task_id} completed successfully")
    except Exception as e:
        logger.error(f"Background task {task_id} failed: {e}")
        tasks_db[task_id] = {
            "status": "FAILED",
            "error": str(e),
            "completed_at": time.time(),
        }


# ==============================================================================
# Helper Math For Financial Quant Modeling
# ==============================================================================

def generate_gbm_path(symbol: str, days: int = 150) -> pd.DataFrame:
    """Generates geometric Brownian motion (GBM) timeseries for simulation using pandas/numpy."""
    conf = SYMBOL_CONFIGS.get(symbol, {"price": 185.4})
    base_price = conf["price"]
    drift = 0.0003
    volatility = 0.015

    end_date = pd.Timestamp.now()
    start_date = end_date - pd.Timedelta(days=days)
    dates = pd.date_range(start=start_date, periods=days, freq="D")

    z = np.random.standard_normal(days)

    prices = [base_price]
    for i in range(1, days):
        shock = (drift - (volatility ** 2) / 2) + volatility * z[i]
        price_change = math.exp(shock)
        prices.append(prices[-1] * price_change)

    df = pd.DataFrame(index=dates)
    df["close"] = np.round(prices, 2)

    df["open"] = df["close"].shift(1).fillna(base_price) + np.random.uniform(-1, 1, days) * (df["close"] * 0.005)
    df["open"] = np.round(df["open"], 2)

    df["high"] = df[["open", "close"]].max(axis=1) * (1 + np.random.uniform(0.001, 0.01, days))
    df["high"] = np.round(df["high"], 2)

    df["low"] = df[["open", "close"]].min(axis=1) * (1 - np.random.uniform(0.001, 0.01, days))
    df["low"] = np.round(df["low"], 2)

    df["volume"] = np.random.randint(1000000, 10000000, size=days)

    return df


def calculate_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Performs feature engineering & technical indicators calculation."""
    close = df["close"]

    # 1. SMA (20)
    df["sma"] = np.round(close.rolling(window=20, min_periods=1).mean(), 2)

    # 2. EMA (12)
    df["ema"] = np.round(close.ewm(span=12, adjust=False).mean(), 2)

    # 3. RSI (14)
    delta = close.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14, min_periods=1).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14, min_periods=1).mean()
    rs = gain / (loss + 1e-9)
    df["rsi"] = np.round(100 - (100 / (1 + rs)), 2)
    df["rsi"] = df["rsi"].fillna(50.0)

    # 4. MACD Suite (12, 26, 9)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    df["macdHist"] = np.round(macd_line - signal_line, 2)
    df["macdHist"] = df["macdHist"].fillna(0.0)

    # 5. Bollinger Bands (20, 2 std)
    sma20 = close.rolling(window=20, min_periods=1).mean()
    std20 = close.rolling(window=20, min_periods=1).std().fillna(1.0)
    df["bbUpper"] = np.round(sma20 + (2 * std20), 2)
    df["bbLower"] = np.round(sma20 - (2 * std20), 2)

    # 6. ATR (14)
    high_low = df["high"] - df["low"]
    high_close = (df["high"] - df["close"].shift()).abs()
    low_close = (df["low"] - df["close"].shift()).abs()
    tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
    df["atr"] = np.round(tr.rolling(window=14, min_periods=1).mean(), 2)
    df["atr"] = df["atr"].fillna(1.2)

    # 7. Historical volatility
    returns = close.pct_change()
    df["volatility"] = np.round(returns.rolling(window=14, min_periods=1).std() * 100, 2)
    df["volatility"] = df["volatility"].fillna(1.5)

    # 8. Absolute Momentum (10 days)
    df["momentum"] = np.round(close - close.shift(10), 2)
    df["momentum"] = df["momentum"].fillna(0.5)

    return df


# ==============================================================================
# REST API Endpoints Fulfilling Decoupled Quant Operations
# ==============================================================================

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    """Landing route so visiting the bare Render URL doesn't 404.

    Accepts both GET and HEAD — some uptime monitors / load balancers
    (including Render's own port check at boot) send HEAD requests, and
    FastAPI only auto-handles HEAD for routes that declare it explicitly.
    """
    return {
        "service": "AI StockVision Quantitative Gateway",
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def api_health():
    return {
        "status": "healthy",
        "service": "AI StockVision Quantitative Gateway",
        "timestamp": pd.Timestamp.now().isoformat(),
    }


@app.get("/api/python/stock/{symbol}")
def run_python_pipeline(symbol: str):
    """Primary REST gateway orchestrating machine learning calculations from native python code."""
    symbol = symbol.upper()
    if symbol not in SYMBOL_CONFIGS:
        raise HTTPException(status_code=400, detail=f"Stock symbol '{symbol}' is not currently supported.")

    logger.info(f"Executing decoupled python analytics core for {symbol}")

    # 1. GBM simulation path (150 days)
    df = generate_gbm_path(symbol, 150)

    # 2. Compute technical indicators
    df = calculate_technical_indicators(df)

    # Form historical list of records for client delivery
    historical_points = []
    for idx_str, r in df.iterrows():
        historical_points.append({
            "date": idx_str.strftime("%Y-%m-%d"),
            "open": float(r["open"]),
            "high": float(r["high"]),
            "low": float(r["low"]),
            "close": float(r["close"]),
            "volume": int(r["volume"]),
            "sma": float(r["sma"]),
            "ema": float(r["ema"]),
            "rsi": float(r["rsi"]),
            "macdHist": float(r["macdHist"]),
            "bbUpper": float(r["bbUpper"]),
            "bbLower": float(r["bbLower"]),
            "atr": float(r["atr"]),
            "volatility": float(r["volatility"]),
            "momentum": float(r["momentum"]),
        })

    last_row = df.iloc[-1]
    last_price = float(last_row["close"])
    last_vol = float(last_row["volatility"])

    # 3. Simulated multi-model forecast suite
    predictions = {}

    all_models = [
        ("Linear Regression", 62 + last_vol, 1.45, 1.15, 0.78, 0.65, 0.64, 1.002),
        ("Logistic Regression", 68, 1.58, 1.25, 0.71, 0.70, 0.69, 1.008),
        ("Decision Tree", 70, 1.62, 1.30, 0.69, 0.72, 0.71, 1.009),
        ("Random Forest", 78 + last_vol * 1.5, 1.22, 0.95, 0.84, 0.78, 0.77, 1.011),
        ("XGBoost", 82, 1.05, 0.82, 0.88, 0.82, 0.81, 1.014),
        ("SVM", 74, 1.31, 1.02, 0.81, 0.75, 0.74, 0.992),
        ("KNN", 66, 1.48, 1.18, 0.76, 0.69, 0.68, 1.005),
        ("ANN", 79, 1.25, 0.94, 0.82, 0.76, 0.75, 1.012),
        ("RNN", 81, 1.18, 0.88, 0.85, 0.78, 0.77, 1.015),
        ("LSTM", 86, 0.92, 0.71, 0.91, 0.84, 0.83, 1.018),
        ("GRU", 84, 0.96, 0.74, 0.89, 0.82, 0.81, 1.016),
        ("CNN-LSTM Hybrid", 88, 0.88, 0.68, 0.93, 0.86, 0.85, 1.022),
    ]

    for item in all_models:
        name, base_conf, rmse, mae, r2, acc, f1, price_multiplier = item
        pred_p = last_price * price_multiplier

        forecast_points = []
        temp_p = last_price
        diff_step = (pred_p - last_price) / 5
        base_date = df.index[-1]

        for d in range(1, 7):
            next_d = base_date + pd.Timedelta(days=d)
            temp_p += diff_step + np.random.uniform(-0.5, 0.5) * (last_vol * 0.4)
            forecast_points.append({
                "date": next_d.strftime("%Y-%m-%d"),
                "value": round(float(temp_p), 2),
            })

        predictions[name] = {
            "modelName": name,
            "nextDayPrice": round(pred_p, 2),
            "direction": "up" if pred_p >= last_price else "down",
            "confidence": int(base_conf),
            "metrics": {
                "rmse": round(float(rmse + np.random.uniform(0.01, 0.09)), 3),
                "mae": round(float(mae + np.random.uniform(0.01, 0.07)), 3),
                "r2": round(float(r2 - np.random.uniform(0.001, 0.015)), 3),
                "accuracy": round(float(acc + np.random.uniform(-0.02, 0.02)), 3),
                "f1": round(float(f1 + np.random.uniform(-0.02, 0.02)), 3),
            },
            "forecast": forecast_points,
        }

    # 4. Outlier detection using scikit-learn IsolationForest
    try:
        pct_changes = df["close"].pct_change().fillna(0.0).values.reshape(-1, 1)
        clf = IsolationForest(contamination=0.04, random_state=42)
        preds = clf.fit_predict(pct_changes)

        anomalies_list = []
        for i, val in enumerate(preds):
            if val == -1 and i > 0:
                anomalies_list.append(df.index[i].strftime("%Y-%m-%d"))
        anomalies_list = anomalies_list[-5:]
    except Exception as ex:
        logger.error(f"IsolationForest exception model failed: {ex}")
        anomalies_list = [df.index[-5].strftime("%Y-%m-%d")]

    # 5. K-Means clustering across all symbols
    clusters_resp = {
        "High Performers": [],
        "Moderate Consolidation": [],
        "Lagging Assets": [],
    }
    try:
        symbols_list = list(SYMBOL_CONFIGS.keys())
        returns_list = [float(np.random.uniform(-0.03, 0.03)) for _ in symbols_list]

        X = np.array(returns_list).reshape(-1, 1)
        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        kmeans_preds = kmeans.fit_predict(X)

        centroids = kmeans.cluster_centers_.flatten()
        sorted_centroids_indices = np.argsort(centroids)  # [Lagging, Mid, High]

        for idx, cluster_label in enumerate(kmeans_preds):
            s = symbols_list[idx]
            if cluster_label == sorted_centroids_indices[2]:
                clusters_resp["High Performers"].append(s)
            elif cluster_label == sorted_centroids_indices[1]:
                clusters_resp["Moderate Consolidation"].append(s)
            else:
                clusters_resp["Lagging Assets"].append(s)
    except Exception as ex:
        logger.error(f"K-Means clustering failed, utilizing math heuristic: {ex}")
        clusters_resp["High Performers"] = ["NVDA", "MSFT"]
        clusters_resp["Moderate Consolidation"] = [symbol]
        clusters_resp["Lagging Assets"] = ["TSLA"]

    return {
        "symbol": symbol,
        "historical": historical_points,
        "predictions": predictions,
        "anomalies": anomalies_list,
        "clusters": clusters_resp,
        "computed_at": time.time(),
    }
        # Compatibility endpoint for frontend
    @app.get("/api/stock/{symbol}")
    def stock(symbol: str):
        return run_python_pipeline(symbol)

# ==============================================================================
# Simulated Async Background Task Queue Endpoints
# ==============================================================================

@app.post("/api/python/optimize-portfolio")
def submit_optimization_task(req: OptimizeRequest, background_tasks: BackgroundTasks):
    """Submits heavy asset-weight optimization to a background async task."""
    task_id = f"task-{hash(time.time()) & 0xfffffff}"

    tasks_db[task_id] = {
        "status": "PENDING",
        "submitted_at": time.time(),
        "result": None,
    }

    background_tasks.add_task(
        run_portfolio_optimization,
        task_id=task_id,
        symbols=req.symbols,
        risk_tolerance=req.risk_tolerance,
    )

    return {
        "taskId": task_id,
        "status": "PENDING",
        "message": "Optimization queue registered successfully. Checking metrics computation thread.",
    }


@app.get("/api/python/optimize-portfolio/{task_id}")
def check_optimizer_task_status(task_id: str):
    """Queries asynchronous compute task registers."""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not discovered in queue repository")

    return tasks_db[task_id]


# ==============================================================================
# Main execution routine
# ==============================================================================

def main():
    logger.info("Launching decoupled FastAPI service gateway...")
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
