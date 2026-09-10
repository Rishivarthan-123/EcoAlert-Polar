from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.history_service import (
    clear_logs,
    create_log,
    get_history_summary,
    get_log,
    get_logs,
)


router = APIRouter(
    prefix="/api/history",
    tags=["History & Logs"],
)


class LogRequest(BaseModel):
    eventType: str
    source: str
    status: str
    details: Dict[str, Any] = {}


@router.get("/health")
def history_health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "history-log-service",
    }


@router.post("/logs")
def add_log(data: LogRequest) -> Dict[str, Any]:
    try:
        log = create_log(
            event_type=data.eventType,
            source=data.source,
            status=data.status,
            details=data.details,
        )

        return {
            "status": "success",
            "log": log,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create history log: {exc}",
        ) from exc


@router.get("/logs")
def list_logs(
    limit: int = Query(
        100,
        ge=1,
        le=500,
    ),
    event_type: Optional[str] = Query(
        None,
    ),
) -> Dict[str, Any]:
    try:
        logs = get_logs(
            limit=limit,
            event_type=event_type,
        )

        return {
            "status": "success",
            "count": len(logs),
            "logs": logs,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve history logs: {exc}",
        ) from exc


@router.get("/logs/{log_id}")
def retrieve_log(log_id: str) -> Dict[str, Any]:
    log = get_log(log_id)

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="History log not found",
        )

    return {
        "status": "success",
        "log": log,
    }


@router.get("/summary")
def history_summary() -> Dict[str, Any]:
    return {
        "status": "success",
        "summary": get_history_summary(),
    }


@router.delete("/logs")
def delete_logs() -> Dict[str, Any]:
    deleted_count = clear_logs()

    return {
        "status": "success",
        "deletedCount": deleted_count,
    }