"""
EcoAlert Polar - Station Telemetry API
"""

from typing import Any, Dict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.history_service import create_log
from app.services.station_service import (
    get_energy_snapshot,
    get_station_state,
    update_station_state,
)


router = APIRouter(
    prefix="/api/station",
    tags=["Station Telemetry"],
)


class StationTelemetryUpdate(BaseModel):
    data: Dict[str, Any]


@router.get("/health")
def station_health():
    return {
        "status": "healthy",
        "service": "station-telemetry",
        "source": "SIMULATED_STATION_TELEMETRY",
    }


@router.get("/state")
def station_state():
    try:
        return {
            "status": "success",
            "station": get_station_state(),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to read station state: {exc}",
        )


@router.get("/energy")
def station_energy():
    try:
        return {
            "status": "success",
            "energy": get_energy_snapshot(),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to read energy snapshot: {exc}",
        )


@router.post("/telemetry")
def update_station_telemetry(
    payload: StationTelemetryUpdate,
):
    try:
        updated_state = update_station_state(
            payload.data
        )

        try:
            create_log(
                event_type="Station Telemetry Updated",
                source="Telemetry",
                status="success",
                details={
                    "updatedKeys": list(payload.data.keys()),
                    "source": "LIVE_BACKEND_TELEMETRY"
                }
            )
        except Exception:
            pass

        return {
            "status": "success",
            "message": "Station telemetry updated.",
            "station": updated_state,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to update station telemetry: {exc}",
        )