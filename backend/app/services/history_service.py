from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4


_history: List[Dict[str, Any]] = []


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_log(
    event_type: str,
    source: str,
    status: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    log = {
        "id": str(uuid4()),
        "timestamp": _timestamp(),
        "eventType": event_type,
        "source": source,
        "status": status,
        "details": details or {},
    }

    _history.insert(0, log)

    return log


def get_logs(
    limit: int = 100,
    event_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    logs = _history

    if event_type:
        logs = [
            log
            for log in logs
            if log["eventType"].lower() == event_type.lower()
        ]

    return logs[:limit]


def get_log(log_id: str) -> Optional[Dict[str, Any]]:
    for log in _history:
        if log["id"] == log_id:
            return log

    return None


def clear_logs() -> int:
    count = len(_history)
    _history.clear()
    return count


def get_history_summary() -> Dict[str, Any]:
    total = len(_history)

    successful = sum(
        1
        for log in _history
        if log["status"].lower() == "success"
    )

    warnings = sum(
        1
        for log in _history
        if log["status"].lower() == "warning"
    )

    failures = sum(
        1
        for log in _history
        if log["status"].lower() in {
            "failed",
            "blocked",
            "rejected",
        }
    )

    return {
        "totalEvents": total,
        "successfulEvents": successful,
        "warningEvents": warnings,
        "failedEvents": failures,
    }