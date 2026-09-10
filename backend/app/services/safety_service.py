from typing import Any, Dict, List


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def evaluate_safety(
    risk_level: str,
    action: str,
    current_demand_kw: float,
    available_power_kw: float,
    battery_soc: float,
    battery_health: float,
    fuel_reserve_percent: float,
    generator_capacity_kw: float,
    requested_power_kw: float = 0.0,
) -> Dict[str, Any]:
    """
    Safety Guardian for EcoAlert Polar.

    Validates a proposed energy-management action before it can
    proceed to operator approval.
    """

    risk = risk_level.lower().strip()
    requested_action = action.strip()

    current_demand = max(
        0.0,
        _safe_float(current_demand_kw),
    )

    available_power = max(
        0.0,
        _safe_float(available_power_kw),
    )

    battery_soc_value = min(
        100.0,
        max(0.0, _safe_float(battery_soc)),
    )

    battery_health_value = min(
        100.0,
        max(0.0, _safe_float(battery_health)),
    )

    fuel_reserve = min(
        100.0,
        max(0.0, _safe_float(fuel_reserve_percent)),
    )

    generator_capacity = max(
        0.0,
        _safe_float(generator_capacity_kw),
    )

    requested_power = max(
        0.0,
        _safe_float(requested_power_kw),
    )

    safety_checks: List[Dict[str, Any]] = []
    blocking_reasons: List[str] = []
    warnings: List[str] = []

    # ---------------------------------------------------------
    # 1. Validate action
    # ---------------------------------------------------------

    allowed_actions = {
        "maintain",
        "reduce_load",
        "defer_load",
        "charge_battery",
        "discharge_battery",
        "start_generator",
        "stop_generator",
        "emergency_shutdown",
    }

    normalized_action = requested_action.lower()

    if normalized_action not in allowed_actions:
        blocking_reasons.append(
            f"Unsupported control action: {requested_action}"
        )

        safety_checks.append(
            {
                "check": "action_validation",
                "status": "failed",
                "message": "Requested action is not an approved EcoAlert Polar control action",
            }
        )
    else:
        safety_checks.append(
            {
                "check": "action_validation",
                "status": "passed",
                "message": "Requested action is recognized",
            }
        )

    # ---------------------------------------------------------
    # 2. Battery safety
    # ---------------------------------------------------------

    if battery_health_value < 50:
        blocking_reasons.append(
            f"Battery health is too low ({battery_health_value:.1f}%)"
        )

        safety_checks.append(
            {
                "check": "battery_health",
                "status": "failed",
                "message": "Battery health is below the safe operating threshold",
            }
        )
    else:
        safety_checks.append(
            {
                "check": "battery_health",
                "status": "passed",
                "message": "Battery health is within the safe operating range",
            }
        )

    if normalized_action == "discharge_battery" and battery_soc_value < 20:
        blocking_reasons.append(
            f"Battery SOC is too low for discharge ({battery_soc_value:.1f}%)"
        )

        safety_checks.append(
            {
                "check": "battery_discharge_soc",
                "status": "failed",
                "message": "Battery discharge is blocked below 20% SOC",
            }
        )
    else:
        safety_checks.append(
            {
                "check": "battery_discharge_soc",
                "status": "passed",
                "message": "Battery discharge SOC condition is acceptable",
            }
        )

    if normalized_action == "charge_battery" and battery_soc_value >= 100:
        blocking_reasons.append(
            "Battery is already at 100% SOC"
        )

    # ---------------------------------------------------------
    # 3. Generator safety
    # ---------------------------------------------------------

    if normalized_action == "start_generator":
        if generator_capacity <= 0:
            blocking_reasons.append(
                "Generator capacity is unavailable"
            )

        if fuel_reserve < 10:
            blocking_reasons.append(
                f"Fuel reserve is critically low ({fuel_reserve:.1f}%)"
            )

        if generator_capacity > 0:
            safety_checks.append(
                {
                    "check": "generator_capacity",
                    "status": "passed",
                    "message": f"Generator capacity available: {generator_capacity:.1f} kW",
                }
            )

        if fuel_reserve >= 10:
            safety_checks.append(
                {
                    "check": "fuel_reserve",
                    "status": "passed",
                    "message": f"Fuel reserve available: {fuel_reserve:.1f}%",
                }
            )
        else:
            safety_checks.append(
                {
                    "check": "fuel_reserve",
                    "status": "failed",
                    "message": "Fuel reserve is below the minimum safe threshold",
                }
            )

    # ---------------------------------------------------------
    # 4. Requested power validation
    # ---------------------------------------------------------

    if requested_power > 0:
        if generator_capacity > 0 and requested_power > generator_capacity:
            blocking_reasons.append(
                f"Requested power ({requested_power:.1f} kW) exceeds "
                f"generator capacity ({generator_capacity:.1f} kW)"
            )

            safety_checks.append(
                {
                    "check": "power_limit",
                    "status": "failed",
                    "message": "Requested power exceeds available generator capacity",
                }
            )
        else:
            safety_checks.append(
                {
                    "check": "power_limit",
                    "status": "passed",
                    "message": "Requested power is within the configured limit",
                }
            )

    # ---------------------------------------------------------
    # 5. Critical-load protection
    # ---------------------------------------------------------

    if normalized_action in {
        "defer_load",
        "reduce_load",
        "emergency_shutdown",
    }:
        if available_power < current_demand:
            warnings.append(
                "Current available power is below station demand; "
                "critical loads must remain protected"
            )

    safety_checks.append(
        {
            "check": "critical_load_protection",
            "status": "passed",
            "message": "Critical station loads must remain protected",
        }
    )

    # ---------------------------------------------------------
    # 6. Risk-level validation
    # ---------------------------------------------------------

    if risk == "critical":
        warnings.append(
            "Station is currently in a critical risk condition; "
            "operator approval is required before major control actions"
        )
    elif risk == "warning":
        warnings.append(
            "Station is in a warning condition; verify the proposed action"
        )

    safety_checks.append(
        {
            "check": "risk_assessment",
            "status": "passed",
            "message": f"Current system risk level: {risk}",
        }
    )

    # ---------------------------------------------------------
    # 7. Determine safety state
    # ---------------------------------------------------------

    if blocking_reasons:
        safety_status = "blocked"
        approval_required = False
    elif risk == "critical":
        safety_status = "requires_approval"
        approval_required = True
    elif normalized_action in {
        "start_generator",
        "stop_generator",
        "emergency_shutdown",
        "discharge_battery",
    }:
        safety_status = "requires_approval"
        approval_required = True
    else:
        safety_status = "safe"
        approval_required = False

    # ---------------------------------------------------------
    # 8. Generate safety recommendation
    # ---------------------------------------------------------

    if safety_status == "blocked":
        recommendation = (
            "Do not execute the requested action until all blocking "
            "safety conditions are resolved."
        )

    elif approval_required:
        recommendation = (
            "Action passed safety validation but requires operator approval "
            "before execution."
        )

    else:
        recommendation = (
            "Action passed safety validation and does not require additional "
            "operator approval under the current conditions."
        )

    # ---------------------------------------------------------
    # 9. Return result
    # ---------------------------------------------------------

    return {
        "safetyStatus": safety_status,
        "approvalRequired": approval_required,
        "action": requested_action,
        "riskLevel": risk,
        "currentDemandKw": round(current_demand, 3),
        "availablePowerKw": round(available_power, 3),
        "batterySocPercent": round(battery_soc_value, 2),
        "batteryHealthPercent": round(battery_health_value, 2),
        "fuelReservePercent": round(fuel_reserve, 2),
        "generatorCapacityKw": round(generator_capacity, 3),
        "requestedPowerKw": round(requested_power, 3),
        "safetyChecks": safety_checks,
        "blockingReasons": blocking_reasons,
        "warnings": warnings,
        "recommendation": recommendation,
    }


def process_operator_decision(
    safety_result: Dict[str, Any],
    decision: str,
    operator_name: str,
    notes: str = "",
) -> Dict[str, Any]:
    """
    Processes the operator's approval or rejection after safety validation.
    """

    normalized_decision = decision.lower().strip()

    if normalized_decision not in {"approve", "reject"}:
        raise ValueError(
            "Operator decision must be 'approve' or 'reject'."
        )

    operator = operator_name.strip()

    if not operator:
        raise ValueError(
            "Operator name is required."
        )

    safety_status = safety_result.get(
        "safetyStatus",
        "blocked",
    )

    if normalized_decision == "approve":
        if safety_status == "blocked":
            return {
                "decisionStatus": "rejected",
                "approved": False,
                "reason": (
                    "Action cannot be approved because the Safety Guardian "
                    "has blocked it."
                ),
                "operator": operator,
                "notes": notes,
            }

        return {
            "decisionStatus": "approved",
            "approved": True,
            "reason": (
                "Operator approved the safety-validated action."
            ),
            "operator": operator,
            "notes": notes,
        }

    return {
        "decisionStatus": "rejected",
        "approved": False,
        "reason": "Operator rejected the proposed action.",
        "operator": operator,
        "notes": notes,
    }