from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.prediction_service import generate_ai_prediction
from app.services.risk_service import analyze_risk


router = APIRouter(
    prefix="/api/risk",
    tags=["Crisis & Risk"],
)


class RiskInput(BaseModel):
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
def risk_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "crisis-risk-engine",
    }


@router.post("/analyze")
def analyze_crisis_risk(data: RiskInput) -> Dict[str, Any]:
    try:
        input_data = data.dict()

        # Run the trained AI models first.
        ai_result = generate_ai_prediction(input_data)

        demand_result = ai_result["demand"]
        renewable_result = ai_result["renewable"]
        anomaly_result = ai_result["anomaly"]

        # Pass AI output into the risk engine.
        risk_result = analyze_risk(
            current_demand_kw=data.currentDemand,
            predicted_demand_kw=demand_result["predictedDemandKw"],
            renewable_generation_kw=data.renewableGeneration,
            predicted_renewable_kw=renewable_result[
                "predictedRenewableKw"
            ],
            battery_soc=data.batterySoc,
            battery_health=data.batteryHealth,
            fuel_reserve_percent=data.fuelReservePercent,
            fuel_days_remaining=data.fuelDaysRemaining,
            generator_capacity_kw=data.generatorCapacityKw,
            anomaly_detected=anomaly_result["isAnomaly"],
            anomaly_score=anomaly_result["anomalyScore"],
        )

        return {
            "status": "success",
            "ai": ai_result,
            "risk": risk_result,
        }

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Crisis & Risk analysis failed: {exc}",
        ) from exc