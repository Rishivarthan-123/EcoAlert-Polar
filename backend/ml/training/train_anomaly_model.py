from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest


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
    / "anomaly_model.joblib"
)

FEATURES = [
    "temperature",
    "feelsLike",
    "windSpeed",
    "solarRadiation",
    "occupancy",
    "currentDemand",
    "renewableGeneration",
    "batterySoc",
    "batteryHealth",
    "batteryChargeRateKw",
    "batteryDischargeRateKw",
    "generatorCapacityKw",
    "fuelReservePercent",
    "energyBalanceKw",
    "heatingLoadKw",
    "laboratoryLoadKw",
    "lightingLoadKw",
    "auxiliaryLoadKw",
    "lifeSupportLoadKw",
    "communicationLoadKw",
]


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

    df = df.sort_values(
        "timestamp"
    ).reset_index(drop=True)

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


def train_model(
    X: pd.DataFrame,
) -> IsolationForest:

    model = IsolationForest(
        n_estimators=300,
        contamination=0.03,
        max_samples="auto",
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X)

    return model


def evaluate_anomalies(
    model: IsolationForest,
    X: pd.DataFrame,
) -> pd.DataFrame:

    predictions = model.predict(X)

    anomaly_scores = model.decision_function(X)

    result = pd.DataFrame(
        {
            "prediction": predictions,
            "anomaly_score": anomaly_scores,
        }
    )

    result["is_anomaly"] = (
        result["prediction"] == -1
    )

    return result


def main() -> None:
    print(
        "Loading EcoAlert Polar dataset..."
    )

    df = load_dataset()

    validate_features(df)

    print(
        f"Total rows: {len(df):,}"
    )

    X = df[FEATURES].copy()

    print()
    print("Training Isolation Forest...")
    print("-" * 40)

    model = train_model(X)

    results = evaluate_anomalies(
        model,
        X,
    )

    anomaly_count = int(
        results["is_anomaly"].sum()
    )

    normal_count = int(
        (~results["is_anomaly"]).sum()
    )

    anomaly_percentage = (
        anomaly_count
        / len(results)
        * 100.0
    )

    print(
        f"Normal records   : {normal_count:,}"
    )

    print(
        f"Anomalous records: {anomaly_count:,}"
    )

    print(
        f"Anomaly rate     : {anomaly_percentage:.2f}%"
    )

    print()
    print("Sample anomaly results")
    print("-" * 40)

    sample = pd.DataFrame(
        {
            "timestamp": df[
                "timestamp"
            ].head(10),
            "currentDemand": df[
                "currentDemand"
            ].head(10),
            "renewableGeneration": df[
                "renewableGeneration"
            ].head(10),
            "batterySoc": df[
                "batterySoc"
            ].head(10),
            "prediction": results[
                "prediction"
            ].head(10),
            "anomaly_score": results[
                "anomaly_score"
            ].head(10),
            "is_anomaly": results[
                "is_anomaly"
            ].head(10),
        }
    )

    print(
        sample.to_string(
            index=False,
        )
    )

    ARTIFACT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    artifact = {
        "model": model,
        "features": FEATURES,
        "contamination": 0.03,
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
    print(
        "Anomaly detection model training completed."
    )


if __name__ == "__main__":
    main()