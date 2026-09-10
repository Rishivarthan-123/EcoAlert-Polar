from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor


BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_PATH = (
    BASE_DIR
    / "ml"
    / "data"
    / "ecoalert_training_data.csv"
)

ARTIFACT_DIR = (
    BASE_DIR
    / "ml"
    / "artifacts"
)

MODEL_PATH = (
    ARTIFACT_DIR
    / "demand_model.joblib"
)

FEATURES = [
    "hour",
    "day_of_week",
    "month",
    "temperature",
    "feelsLike",
    "windSpeed",
    "solarRadiation",
    "occupancy",
    "currentDemand",
    "nominalDemand",
    "windGeneration",
    "solarGeneration",
    "renewableGeneration",
    "batterySoc",
    "batteryAvailableKwh",
    "batteryHealth",
    "batteryChargeRateKw",
    "batteryDischargeRateKw",
    "generatorCapacityKw",
    "fuelReservePercent",
    "fuelDaysRemaining",
    "heatingLoadKw",
    "laboratoryLoadKw",
    "lightingLoadKw",
    "auxiliaryLoadKw",
    "lifeSupportLoadKw",
    "communicationLoadKw",
]

TARGET = "currentDemand"


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATASET_PATH}"
        )

    df = pd.read_csv(DATASET_PATH)

    df["timestamp"] = pd.to_datetime(
        df["timestamp"],
        utc=True,
    )

    df = df.sort_values("timestamp").reset_index(
        drop=True
    )

    return df


def validate_features(df: pd.DataFrame) -> None:
    missing_features = [
        feature
        for feature in FEATURES
        if feature not in df.columns
    ]

    if missing_features:
        raise ValueError(
            "Missing required features: "
            + ", ".join(missing_features)
        )

    if TARGET not in df.columns:
        raise ValueError(
            f"Target column '{TARGET}' is missing."
        )


def create_future_demand_target(
    df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Create a target representing demand one hour ahead.

    The model therefore learns:

        current station conditions
                  ↓
        demand during next hour
    """

    result = df.copy()

    result["target_demand_next_hour"] = (
        result[TARGET].shift(-1)
    )

    result = result.dropna(
        subset=["target_demand_next_hour"]
    ).reset_index(drop=True)

    return result


def chronological_split(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:

    total_rows = len(df)

    train_end = int(total_rows * 0.70)
    validation_end = int(total_rows * 0.85)

    train_df = df.iloc[:train_end].copy()

    validation_df = df.iloc[
        train_end:validation_end
    ].copy()

    test_df = df.iloc[
        validation_end:
    ].copy()

    return (
        train_df,
        validation_df,
        test_df,
    )


def train_model(
    X_train: pd.DataFrame,
    y_train: pd.Series,
) -> XGBRegressor:

    model = XGBRegressor(
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    return model


def evaluate_model(
    model: XGBRegressor,
    X: pd.DataFrame,
    y: pd.Series,
    dataset_name: str,
) -> dict[str, float]:

    predictions = model.predict(X)

    mae = mean_absolute_error(
        y,
        predictions,
    )

    rmse = float(
        np.sqrt(
            mean_squared_error(
                y,
                predictions,
            )
        )
    )

    r2 = r2_score(
        y,
        predictions,
    )

    print()
    print(f"{dataset_name} RESULTS")
    print("-" * 40)
    print(f"MAE  : {mae:.3f} kW")
    print(f"RMSE : {rmse:.3f} kW")
    print(f"R²   : {r2:.3f}")

    return {
        "mae": float(mae),
        "rmse": rmse,
        "r2": float(r2),
    }


def main() -> None:
    print("Loading EcoAlert Polar dataset...")

    df = load_dataset()

    validate_features(df)

    print(f"Total rows: {len(df):,}")

    df = create_future_demand_target(df)

    print(
        "Target: next-hour energy demand"
    )

    train_df, validation_df, test_df = (
        chronological_split(df)
    )

    X_train = train_df[FEATURES]
    y_train = train_df[
        "target_demand_next_hour"
    ]

    X_validation = validation_df[FEATURES]
    y_validation = validation_df[
        "target_demand_next_hour"
    ]

    X_test = test_df[FEATURES]
    y_test = test_df[
        "target_demand_next_hour"
    ]

    print()
    print("Chronological split")
    print("-" * 40)
    print(f"Training   : {len(train_df):,}")
    print(f"Validation : {len(validation_df):,}")
    print(f"Testing    : {len(test_df):,}")

    print()
    print("Training XGBoost demand model...")

    model = train_model(
        X_train,
        y_train,
    )

    validation_metrics = evaluate_model(
        model,
        X_validation,
        y_validation,
        "VALIDATION",
    )

    test_metrics = evaluate_model(
        model,
        X_test,
        y_test,
        "TEST",
    )

    ARTIFACT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    artifact = {
        "model": model,
        "features": FEATURES,
        "target": "target_demand_next_hour",
        "horizon_hours": 1,
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
    }

    joblib.dump(
        artifact,
        MODEL_PATH,
    )

    print()
    print("MODEL SAVED")
    print("-" * 40)
    print(MODEL_PATH)

    print()
    print("Sample predictions")
    print("-" * 40)

    sample_predictions = model.predict(
        X_test.head(10)
    )

    comparison = pd.DataFrame(
        {
            "actual_kw": y_test.head(10).to_numpy(),
            "predicted_kw": sample_predictions,
        }
    )

    print(
        comparison.to_string(
            index=False,
            float_format=lambda value: f"{value:.2f}",
        )
    )

    print()
    print(
        "Energy demand model training completed."
    )


if __name__ == "__main__":
    main()