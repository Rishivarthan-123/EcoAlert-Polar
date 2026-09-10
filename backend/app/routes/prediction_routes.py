from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.prediction_service import (
    detect_anomaly,
    generate_ai_prediction,
    generate_forecast_series,
    predict_demand,
    predict_renewable,
)


router = APIRouter(
    prefix="/api/predictions",
    tags=["AI Predictions"],
)


class EnergyInput(BaseModel):
    hour: int = Field(..., ge=0, le=23)
    day_of_week: int = Field(..., ge=0, le=6)
    month: int = Field(..., ge=1, le=12)

    temperature: float
    feelsLike: float
    windSpeed: float
    solarRadiation: float
    occupancy: float

    currentDemand: float
    nominalDemand: float = 0.0

    windGeneration: float
    solarGeneration: float
    renewableGeneration: float

    batterySoc: float
    batteryAvailableKwh: float = 0.0
    batteryHealth: float

    batteryChargeRateKw: float = 0.0
    batteryDischargeRateKw: float = 0.0

    generatorCapacityKw: float = 0.0
    fuelReservePercent: float = 0.0
    fuelDaysRemaining: float = 0.0

    energyBalanceKw: float = 0.0

    heatingLoadKw: float
    laboratoryLoadKw: float
    lightingLoadKw: float
    auxiliaryLoadKw: float
    lifeSupportLoadKw: float
    communicationLoadKw: float


@router.get("/health")
def prediction_health() -> Dict[str, Any]:
    """
    Check whether the AI prediction service is available.
    """
    return {
        "status": "ok",
        "service": "EcoAlert Polar AI Prediction Service",
    }


@router.post("/demand")
def demand_prediction(
    data: EnergyInput,
) -> Dict[str, Any]:
    """
    Predict next-hour energy demand using XGBoost.
    """
    try:
        return predict_demand(data.dict())
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.post("/renewable")
def renewable_prediction(
    data: EnergyInput,
) -> Dict[str, Any]:
    """
    Predict next-hour renewable generation using XGBoost.
    """
    try:
        return predict_renewable(data.dict())
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.post("/anomaly")
def anomaly_prediction(
    data: EnergyInput,
) -> Dict[str, Any]:
    """
    Detect abnormal energy conditions using Isolation Forest.
    """
    try:
        return detect_anomaly(data.dict())
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.post("/analyze")
def complete_ai_analysis(
    data: EnergyInput,
) -> Dict[str, Any]:
    """
    Run all EcoAlert Polar AI models together.
    """
    try:
        return generate_ai_prediction(data.dict())
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc


@router.post("/forecast")
def forecast_series(
    data: EnergyInput,
) -> Dict[str, Any]:
    """
    Generate multi-hour forecast timeline using trained ML models.
    """
    try:
        return {
            "status": "success",
            "forecast": generate_forecast_series(data.dict(), hours_ahead=6),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc