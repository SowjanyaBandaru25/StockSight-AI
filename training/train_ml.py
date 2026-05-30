# ==============================================================================
# AI StockVision — train_ml.py (Supervised ML Model Arena)
# ==============================================================================

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.svm import SVR
import xgboost as xgb
import pickle
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TrainML")

class MLSensorCore:
    def __init__(self, data_path: str):
        self.data_path = data_path
        self.models = {}

    def load_and_preprocess(self):
        logger.info(f"Loading historical market session matrices from {self.data_path}...")
        # Simulate loading feature-engineered datasets
        np.random.seed(42)
        rows = 500
        data = {
            "close": np.random.uniform(150, 220, rows),
            "rsi": np.random.uniform(25, 75, rows),
            "volatility": np.random.uniform(0.5, 3.5, rows),
            "momentum": np.random.uniform(-4, 4, rows),
            "sentiment_score": np.random.uniform(-0.8, 0.8, rows),
        }
        df = pd.DataFrame(data)
        # Shift target variable by 1 to represent next-day forecasting
        df["target_close"] = df["close"].shift(-1)
        df.dropna(inplace=True)
        return df

    def execute_arena(self):
        df = self.load_and_preprocess()
        features = ["close", "rsi", "volatility", "momentum", "sentiment_score"]
        
        X = df[features]
        y = df["target_close"]

        # Train-Test Validation Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        models_to_train = {
            "LinearRegression": LinearRegression(),
            "RandomForest": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
            "DecisionTree": DecisionTreeRegressor(max_depth=6),
            "KNN": KNeighborsRegressor(n_neighbors=5),
            "SVM": SVR(kernel="rbf", C=100, gamma=0.1),
            "XGBoost": xgb.XGBRegressor(n_estimators=150, learning_rate=0.05, max_depth=5, random_state=42)
        }

        for name, model in models_to_train.items():
            logger.info(f"Fitting model hyperparameters for: {name}...")
            model.fit(X_train, y_train)
            
            # Save trained model binaries
            os.makedirs("models/saved_models", exist_ok=True)
            with open(f"models/saved_models/{name.lower()}_model.pkl", "wb") as f:
                pickle.dump(model, f)
            logger.info(f"Model successfully saved to models/saved_models/{name.lower()}_model.pkl")

if __name__ == "__main__":
    arena = MLSensorCore(data_path="data/processed/clean_metrics.csv")
    arena.execute_arena()
