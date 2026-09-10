from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.digital_twin_service import simulate_station


router = APIRouter(
    prefix="/api/digital-twin",
    tags=["Digital Twin"],
)


class DigitalTwinInput(BaseModel):
    windGeneration: float = Field(0.0, ge=0)
    solarGeneration: float = Field(0.0, ge=0)

    generatorOutputKw: float = Field(0.0, ge=0)
    generatorCapacityKw: float = Field(0.0, ge=0)

    heatingLoadKw: float = Field(0.0, ge=0)
    laboratoryLoadKw: float = Field(0.0, ge=0)
    lightingLoadKw: float = Field(0.0, ge=0)
    auxiliaryLoadKw: float = Field(0.0, ge=0)
    lifeSupportLoadKw: float = Field(0.0, ge=0)
    communicationLoadKw: float = Field(0.0, ge=0)

    batterySoc: float = Field(0.0, ge=0, le=100)
    batteryAvailableKwh: float = Field(0.0, ge=0)
    batteryChargeRateKw: float = Field(0.0, ge=0)
    batteryDischargeRateKw: float = Field(0.0, ge=0)


@router.get("/health")
def digital_twin_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "digital-twin-engine",
    }


@router.post("/simulate")
def simulate_digital_twin(
    data: DigitalTwinInput,
) -> Dict[str, Any]:
    try:
        result = simulate_station(
            data=data.dict(),
        )

        return {
            "status": "success",
            "digitalTwin": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Digital Twin simulation failed: {exc}",
        ) from exc