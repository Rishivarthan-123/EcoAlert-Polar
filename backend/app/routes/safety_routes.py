from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.safety_service import (
    evaluate_safety,
    process_operator_decision,
)


router = APIRouter(
    prefix="/api/safety",
    tags=["Safety & Approval"],
)


class SafetyInput(BaseModel):
    riskLevel: str = "normal"

    action: str

    currentDemandKw: float = Field(
        0.0,
        ge=0,
    )

    availablePowerKw: float = Field(
        0.0,
        ge=0,
    )

    batterySoc: float = Field(
        0.0,
        ge=0,
        le=100,
    )

    batteryHealth: float = Field(
        100.0,
        ge=0,
        le=100,
    )

    fuelReservePercent: float = Field(
        100.0,
        ge=0,
        le=100,
    )

    generatorCapacityKw: float = Field(
        0.0,
        ge=0,
    )

    requestedPowerKw: float = Field(
        0.0,
        ge=0,
    )


class OperatorApprovalRequest(BaseModel):
    safety: Dict[str, Any]
    decision: str
    operatorName: str
    notes: str = ""


@router.get("/health")
def safety_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "safety-guardian",
    }


@router.post("/evaluate")
def evaluate_action(
    data: SafetyInput,
) -> Dict[str, Any]:
    try:
        result = evaluate_safety(
            risk_level=data.riskLevel,
            action=data.action,
            current_demand_kw=data.currentDemandKw,
            available_power_kw=data.availablePowerKw,
            battery_soc=data.batterySoc,
            battery_health=data.batteryHealth,
            fuel_reserve_percent=data.fuelReservePercent,
            generator_capacity_kw=data.generatorCapacityKw,
            requested_power_kw=data.requestedPowerKw,
        )

        return {
            "status": "success",
            "safety": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Safety evaluation failed: {exc}",
        ) from exc


@router.post("/approve")
def operator_decision(
    data: OperatorApprovalRequest,
) -> Dict[str, Any]:
    try:
        result = process_operator_decision(
            safety_result=data.safety,
            decision=data.decision,
            operator_name=data.operatorName,
            notes=data.notes,
        )

        return {
            "status": "success",
            "approval": result,
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Operator decision processing failed: {exc}",
        ) from exc