from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.load_service import manage_loads


router = APIRouter(
    prefix="/api/loads",
    tags=["Load Management"],
)


class LoadInput(BaseModel):
    lifeSupportLoadKw: float = Field(..., ge=0)
    communicationLoadKw: float = Field(..., ge=0)
    laboratoryLoadKw: float = Field(..., ge=0)
    heatingLoadKw: float = Field(..., ge=0)
    lightingLoadKw: float = Field(..., ge=0)
    auxiliaryLoadKw: float = Field(..., ge=0)

    availablePowerKw: float = Field(..., ge=0)


@router.get("/health")
def load_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "load-management-engine",
    }


@router.post("/analyze")
def analyze_loads(data: LoadInput) -> Dict[str, Any]:
    try:
        result = manage_loads(
            data=data.dict(),
            available_power_kw=data.availablePowerKw,
        )

        return {
            "status": "success",
            "loadManagement": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Load management analysis failed: {exc}",
        ) from exc