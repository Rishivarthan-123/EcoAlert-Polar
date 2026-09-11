from typing import Any, Dict, List


LOAD_PRIORITY = {
    "lifeSupport": {
        "name": "Life Support",
        "priority": 1,
        "critical": True,
    },
    "communication": {
        "name": "Communication",
        "priority": 1,
        "critical": True,
    },
    "laboratory": {
        "name": "Laboratory",
        "priority": 2,
        "critical": False,
    },
    "heating": {
        "name": "Heating",
        "priority": 2,
        "critical": False,
    },
    "lighting": {
        "name": "Lighting",
        "priority": 3,
        "critical": False,
    },
    "auxiliary": {
        "name": "Auxiliary",
        "priority": 4,
        "critical": False,
    },
}


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _get_loads(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {
            "id": "load-life-support",
            "name": "O2 Generation & Air Scrubbers",
            "type": "Life Support",
            "powerKw": _safe_float(data.get("lifeSupportLoadKw")),
            "priority": LOAD_PRIORITY["lifeSupport"]["priority"],
            "currentPriority": "CRITICAL",
            "recommendedPriority": "CRITICAL",
            "action": "PROTECT",
            "critical": True,
            "canShed": False,
            "reason": "Class 1 Life Support system. Station air circulation and O2 enrichment must never be interrupted under any condition.",
        },
        {
            "id": "load-comm-telemetry",
            "name": "Satellite Comm & Deep Space Uplink",
            "type": "Telemetry",
            "powerKw": _safe_float(data.get("communicationLoadKw")),
            "priority": LOAD_PRIORITY["communication"]["priority"],
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "ESSENTIAL",
            "action": "MAINTAIN",
            "critical": True,
            "canShed": False,
            "reason": "Emergency distress relay and Antarctic research uplink window active. Required for crew safety coordination.",
        },
        {
            "id": "load-laboratory",
            "name": "Laboratory Core (Atmospheric/Ice)",
            "type": "Research",
            "powerKw": _safe_float(data.get("laboratoryLoadKw")),
            "priority": LOAD_PRIORITY["laboratory"]["priority"],
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "ESSENTIAL",
            "action": "MAINTAIN",
            "critical": False,
            "canShed": False,
            "reason": "Ice core freezer preservation active. Core experiments cannot tolerate power dips >15 minutes without data loss.",
        },
        {
            "id": "load-heating-01",
            "name": "Heating Unit 01 (Habitat Main)",
            "type": "Heating",
            "powerKw": _safe_float(data.get("heatingLoadKw")),
            "priority": LOAD_PRIORITY["heating"]["priority"],
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "CRITICAL",
            "action": "PROTECT",
            "critical": False,
            "canShed": False,
            "reason": "Extreme polar temperatures require continuous active heating to prevent thermal collapse in living quarters.",
        },
        {
            "id": "load-lighting",
            "name": "Lighting (Station & Exterior)",
            "type": "Facility",
            "powerKw": _safe_float(data.get("lightingLoadKw")),
            "priority": LOAD_PRIORITY["lighting"]["priority"],
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "NON-CRITICAL",
            "action": "REDUCE",
            "critical": False,
            "canShed": True,
            "suggestedReductionKw": round(_safe_float(data.get("lightingLoadKw")) * 0.5, 1),
            "reason": "Common area and exterior floodlights can be reduced by 50% with zero safety hazard during non-critical hours.",
        },
        {
            "id": "load-auxiliary",
            "name": "Auxiliary Equipment (Water Heater/Pump)",
            "type": "Support",
            "powerKw": _safe_float(data.get("auxiliaryLoadKw")),
            "priority": LOAD_PRIORITY["auxiliary"]["priority"],
            "currentPriority": "NON-CRITICAL",
            "recommendedPriority": "NON-CRITICAL",
            "action": "DELAY",
            "critical": False,
            "canShed": True,
            "suggestedReductionKw": _safe_float(data.get("auxiliaryLoadKw")),
            "reason": "Secondary greywater pumping and laundry water heater can be deferred for up to 4 hours without crew impact.",
        },
    ]



def manage_loads(
    data: Dict[str, Any],
    available_power_kw: float,
) -> Dict[str, Any]:
    loads = _get_loads(data)

    available_power = max(0.0, _safe_float(available_power_kw))

    total_demand = sum(load["powerKw"] for load in loads)

    critical_loads = [
        load for load in loads if load["critical"]
    ]

    non_critical_loads = [
        load for load in loads if not load["critical"]
    ]

    critical_demand = sum(
        load["powerKw"] for load in critical_loads
    )

    # Start with all loads operating.
    decisions: List[Dict[str, Any]] = []

    remaining_power = available_power

    # Critical loads are always protected first.
    for load in critical_loads:
        power = load["powerKw"]

        if remaining_power >= power:
            status = "maintain"
            supplied_power = power
            remaining_power -= power
        else:
            status = "protected"
            supplied_power = max(0.0, remaining_power)
            remaining_power = 0.0

        decisions.append(
            {
                **load,
                "status": status,
                "suppliedPowerKw": round(supplied_power, 3),
                "reductionKw": round(
                    max(0.0, power - supplied_power),
                    3,
                ),
            }
        )

    # Non-critical loads are handled by priority.
    for load in sorted(
        non_critical_loads,
        key=lambda item: item["priority"],
    ):
        power = load["powerKw"]

        if remaining_power >= power:
            status = "maintain"
            supplied_power = power
            remaining_power -= power

        elif remaining_power > 0:
            status = "reduce"
            supplied_power = remaining_power
            remaining_power = 0.0

        else:
            status = "defer"
            supplied_power = 0.0

        decisions.append(
            {
                **load,
                "status": status,
                "suppliedPowerKw": round(supplied_power, 3),
                "reductionKw": round(
                    max(0.0, power - supplied_power),
                    3,
                ),
            }
        )

    supplied_power = sum(
        decision["suppliedPowerKw"]
        for decision in decisions
    )

    curtailed_power = sum(
        decision["reductionKw"]
        for decision in decisions
    )

    remaining_deficit = max(
        0.0,
        total_demand - available_power,
    )

    if available_power >= total_demand:
        operating_mode = "normal"
    elif available_power >= critical_demand:
        operating_mode = "load_shedding"
    else:
        operating_mode = "critical"

    recommended_actions: List[str] = []

    if operating_mode == "normal":
        recommended_actions.append(
            "Maintain all station loads under normal operation"
        )

    elif operating_mode == "load_shedding":
        recommended_actions.append(
            "Protect critical loads and reduce non-critical consumption"
        )

        for decision in decisions:
            if decision["status"] == "reduce":
                recommended_actions.append(
                    f"Reduce {decision['name']} by "
                    f"{decision['reductionKw']:.1f} kW"
                )
            elif decision["status"] == "defer":
                recommended_actions.append(
                    f"Defer {decision['name']} load"
                )

    else:
        recommended_actions.append(
            "Available power is insufficient for all critical loads"
        )
        recommended_actions.append(
            "Activate approved backup generation and emergency procedures"
        )

    return {
        "operatingMode": operating_mode,
        "availablePowerKw": round(available_power, 3),
        "totalDemandKw": round(total_demand, 3),
        "criticalDemandKw": round(critical_demand, 3),
        "suppliedPowerKw": round(supplied_power, 3),
        "curtailedPowerKw": round(curtailed_power, 3),
        "remainingDeficitKw": round(remaining_deficit, 3),
        "loads": decisions,
        "recommendedActions": recommended_actions,
    }