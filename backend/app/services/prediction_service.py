from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone

import joblib
import pandas as pd


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]

ARTIFACT_DIR = BASE_DIR / "ml" / "artifacts"

DEMAND_MODEL_PATH = ARTIFACT_DIR / "demand_model.joblib"
RENEWABLE_MODEL_PATH = ARTIFACT_DIR / "renewable_model.joblib"
ANOMALY_MODEL_PATH = ARTIFACT_DIR / "anomaly_model.joblib"


# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ModelArtifact = Dict[str, Any]


# ---------------------------------------------------------------------------
# Model artifacts
# ---------------------------------------------------------------------------

_demand_artifact: Optional[ModelArtifact] = None
_renewable_artifact: Optional[ModelArtifact] = None
_anomaly_artifact: Optional[ModelArtifact] = None


# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

def _load_model_artifact(
    model_path: Path,
) -> ModelArtifact:
    """
    Load a trained EcoAlert Polar model artifact.

    Each training script saves an artifact containing:
        - model
        - features
        - additional model metadata
    """

    if not model_path.exists():
        raise FileNotFoundError(
            f"AI model artifact not found: {model_path}"
        )

    artifact = joblib.load(model_path)

    if not isinstance(artifact, dict):
        raise ValueError(
            f"Invalid model artifact format: {model_path}"
        )

    if "model" not in artifact:
        raise ValueError(
            f"Model artifact does not contain 'model': {model_path}"
        )

    if "features" not in artifact:
        raise ValueError(
            f"Model artifact does not contain 'features': {model_path}"
        )

    return artifact


def load_models() -> None:
    """
    Load all three EcoAlert Polar AI models.

    Models:
        1. Energy demand prediction
        2. Renewable generation prediction
        3. Energy anomaly detection
    """

    global _demand_artifact
    global _renewable_artifact
    global _anomaly_artifact

    _demand_artifact = _load_model_artifact(
        DEMAND_MODEL_PATH
    )

    _renewable_artifact = _load_model_artifact(
        RENEWABLE_MODEL_PATH
    )

    _anomaly_artifact = _load_model_artifact(
        ANOMALY_MODEL_PATH
    )


def _get_demand_artifact() -> ModelArtifact:
    if _demand_artifact is None:
        load_models()

    if _demand_artifact is None:
        raise RuntimeError("Demand model could not be loaded.")

    return _demand_artifact


def _get_renewable_artifact() -> ModelArtifact:
    if _renewable_artifact is None:
        load_models()

    if _renewable_artifact is None:
        raise RuntimeError("Renewable model could not be loaded.")

    return _renewable_artifact


def _get_anomaly_artifact() -> ModelArtifact:
    if _anomaly_artifact is None:
        load_models()

    if _anomaly_artifact is None:
        raise RuntimeError("Anomaly model could not be loaded.")

    return _anomaly_artifact


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _prepare_features(
    input_data: Dict[str, Any],
    required_features: list[str],
) -> pd.DataFrame:
    """
    Convert API input into a DataFrame using the exact feature order
    stored with the trained model.
    """

    missing_features = [
        feature
        for feature in required_features
        if feature not in input_data
    ]

    if missing_features:
        raise ValueError(
            "Missing required AI features: "
            + ", ".join(missing_features)
        )

    values = {
        feature: input_data[feature]
        for feature in required_features
    }

    dataframe = pd.DataFrame(
        [values],
        columns=required_features,
    )

    for feature in required_features:
        dataframe[feature] = pd.to_numeric(
            dataframe[feature],
            errors="coerce",
        )

    invalid_features = [
        feature
        for feature in required_features
        if pd.isna(dataframe.loc[0, feature])
    ]

    if invalid_features:
        raise ValueError(
            "Invalid numeric values for AI features: "
            + ", ".join(invalid_features)
        )

    return dataframe


def _safe_float(value: Any) -> float:
    return float(value)


# ---------------------------------------------------------------------------
# Demand prediction
# ---------------------------------------------------------------------------

def predict_demand(
    input_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Predict energy demand for the next hour using trained XGBoost Regressor.
    """

    artifact = _get_demand_artifact()

    model = artifact["model"]
    features = artifact["features"]

    X = _prepare_features(
        input_data,
        features,
    )

    prediction = model.predict(X)[0]

    predicted_demand = max(
        0.0,
        _safe_float(prediction),
    )

    return {
        "predictedDemandKw": round(
            predicted_demand,
            3,
        ),
        "horizonHours": artifact.get(
            "horizon_hours",
            1,
        ),
        "model": "XGBoost",
    }


# ---------------------------------------------------------------------------
# Renewable generation prediction
# ---------------------------------------------------------------------------

def predict_renewable(
    input_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Predict renewable energy generation for the next hour using trained XGBoost Regressor.
    """

    artifact = _get_renewable_artifact()

    model = artifact["model"]
    features = artifact["features"]

    X = _prepare_features(
        input_data,
        features,
    )

    prediction = model.predict(X)[0]

    predicted_renewable = max(
        0.0,
        _safe_float(prediction),
    )

    return {
        "predictedRenewableKw": round(
            predicted_renewable,
            3,
        ),
        "horizonHours": artifact.get(
            "horizon_hours",
            1,
        ),
        "model": "XGBoost",
    }


# ---------------------------------------------------------------------------
# Anomaly detection
# ---------------------------------------------------------------------------

def detect_anomaly(
    input_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Detect abnormal station energy conditions using trained Isolation Forest.
    """

    artifact = _get_anomaly_artifact()

    model = artifact["model"]
    features = artifact["features"]

    X = _prepare_features(
        input_data,
        features,
    )

    prediction = int(
        model.predict(X)[0]
    )

    anomaly_score = _safe_float(
        model.decision_function(X)[0]
    )

    is_anomaly = prediction == -1

    return {
        "isAnomaly": is_anomaly,
        "prediction": prediction,
        "anomalyScore": round(
            anomaly_score,
            6,
        ),
        "model": "Isolation Forest",
    }


# ---------------------------------------------------------------------------
# Combined AI analysis
# ---------------------------------------------------------------------------

def generate_ai_prediction(
    input_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run the complete EcoAlert Polar AI pipeline.
    """

    demand_result = predict_demand(input_data)
    renewable_result = predict_renewable(input_data)
    anomaly_result = detect_anomaly(input_data)

    predicted_demand = demand_result["predictedDemandKw"]
    predicted_renewable = renewable_result["predictedRenewableKw"]
    predicted_energy_balance = predicted_renewable - predicted_demand

    if anomaly_result["isAnomaly"]:
        risk_level = "critical"
    elif predicted_energy_balance < 0:
        risk_level = "warning"
    else:
        risk_level = "normal"

    return {
        "demand": demand_result,
        "renewable": renewable_result,
        "anomaly": anomaly_result,
        "energyBalanceKw": round(predicted_energy_balance, 3),
        "riskLevel": risk_level,
    }


# ---------------------------------------------------------------------------
# Legitimate Multi-Hour Forecast Series Generation
# ---------------------------------------------------------------------------

def generate_forecast_series(
    input_data: Dict[str, Any],
    hours_ahead: int = 6,
) -> Dict[str, Any]:
    """
    Generate a 6-hour forecast timeline by running the trained XGBoost models
    across future hourly feature states.
    """
    labels: List[str] = ["Now"]
    predicted_demands: List[float] = [round(input_data.get("currentDemand", 90.0), 1)]
    predicted_renewables: List[float] = [round(input_data.get("renewableGeneration", 25.0), 1)]
    available_supplies: List[float] = [round(input_data.get("renewableGeneration", 25.0) + (input_data.get("batteryDischargeRateKw", 65.0) if input_data.get("batterySoc", 35) > 20 else 0.0), 1)]
    battery_socs: List[float] = [round(input_data.get("batterySoc", 35.0), 1)]

    current_hour = int(input_data.get("hour", 14))
    curr_battery_kwh = float(input_data.get("batteryAvailableKwh", 175.0))
    capacity_kwh = float(input_data.get("batteryCapacityKwh", 500.0))
    if capacity_kwh <= 0:
        capacity_kwh = 500.0

    temp_state = dict(input_data)

    for i in range(1, hours_ahead + 1):
        step_hour = (current_hour + i) % 24
        labels.append(f"+{i}h")

        # Simulate gradual diurnal variation in features
        temp_state["hour"] = step_hour
        # Diurnal wind variation: slightly drops in evening
        if step_hour > 16 or step_hour < 6:
            temp_state["windSpeed"] = max(2.0, float(input_data.get("windSpeed", 9.2)) - (0.5 * i))
            temp_state["windGeneration"] = max(5.0, float(input_data.get("windGeneration", 25.0)) - (1.5 * i))
            temp_state["renewableGeneration"] = temp_state["windGeneration"] + float(temp_state.get("solarGeneration", 0.0))

        d_res = predict_demand(temp_state)
        r_res = predict_renewable(temp_state)

        p_demand = d_res["predictedDemandKw"]
        p_ren = r_res["predictedRenewableKw"]

        predicted_demands.append(p_demand)
        predicted_renewables.append(p_ren)

        # Net balance for battery projection
        net = p_ren - p_demand
        if net < 0:
            deficit = abs(net)
            curr_battery_kwh = max(0.0, curr_battery_kwh - deficit)
            supp = p_ren + min(deficit, 65.0)
        else:
            surplus = net
            curr_battery_kwh = min(capacity_kwh, curr_battery_kwh + surplus)
            supp = p_ren

        soc_pct = round((curr_battery_kwh / capacity_kwh) * 100.0, 1)
        battery_socs.append(soc_pct)
        available_supplies.append(round(supp, 1))

    return {
        "hours": labels,
        "actualDemand": [round(input_data.get("currentDemand", 90.0), 1)] + [None] * hours_ahead,
        "predictedDemand": predicted_demands,
        "peakDemandLine": [max(predicted_demands) + 7.0] * (hours_ahead + 1),
        "availableSupply": available_supplies,
        "renewableForecast": predicted_renewables,
        "batterySocForecast": battery_socs,
    }


def get_model_status() -> Dict[str, Any]:
    demand_artifact = _get_demand_artifact()
    renewable_artifact = _get_renewable_artifact()
    anomaly_artifact = _get_anomaly_artifact()

    return {
        "demand": {
            "loaded": True,
            "model": "XGBoost Regressor",
            "features": demand_artifact["features"],
            "horizonHours": demand_artifact.get("horizon_hours", 1),
        },
        "renewable": {
            "loaded": True,
            "model": "XGBoost Regressor",
            "features": renewable_artifact["features"],
            "horizonHours": renewable_artifact.get("horizon_hours", 1),
        },
        "anomaly": {
            "loaded": True,
            "model": "Isolation Forest",
            "features": anomaly_artifact["features"],
            "contamination": anomaly_artifact.get("contamination", 0.03),
        },
    }