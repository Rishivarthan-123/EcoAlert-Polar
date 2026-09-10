from typing import Any, Dict, List


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def analyze_risk(
    current_demand_kw: float,
    predicted_demand_kw: float,
    renewable_generation_kw: float,
    predicted_renewable_kw: float,
    battery_soc: float,
    battery_health: float,
    fuel_reserve_percent: float,
    fuel_days_remaining: float,
    generator_capacity_kw: float,
    anomaly_detected: bool = False,
    anomaly_score: float = 0.0,
) -> Dict[str, Any]:

    current_demand = _safe_float(current_demand_kw)
    predicted_demand = _safe_float(predicted_demand_kw)
    renewable_generation = _safe_float(renewable_generation_kw)
    predicted_renewable = _safe_float(predicted_renewable_kw)
    battery_soc_value = _safe_float(battery_soc)
    battery_health_value = _safe_float(battery_health)
    fuel_reserve = _safe_float(fuel_reserve_percent)
    fuel_days = _safe_float(fuel_days_remaining)
    generator_capacity = _safe_float(generator_capacity_kw)
    anomaly_score_value = _safe_float(anomaly_score)

    reasons: List[str] = []
    warnings: List[str] = []
    critical_conditions: List[str] = []

    # ---------------------------------------------------------
    # 1. Predicted energy balance
    # ---------------------------------------------------------

    predicted_energy_balance = (
        predicted_renewable - predicted_demand
    )

    shortage_kw = max(0.0, -predicted_energy_balance)

    if predicted_energy_balance < 0:
        shortage_percentage = (
            shortage_kw / predicted_demand * 100
            if predicted_demand > 0
            else 0.0
        )

        if shortage_percentage >= 30:
            critical_conditions.append(
                f"Predicted energy shortage of {shortage_kw:.1f} kW"
            )
        else:
            warnings.append(
                f"Predicted energy deficit of {shortage_kw:.1f} kW"
            )

    # ---------------------------------------------------------
    # 2. Battery risk
    # ---------------------------------------------------------

    if battery_soc_value < 20:
        critical_conditions.append(
            f"Battery state of charge is critically low ({battery_soc_value:.1f}%)"
        )
    elif battery_soc_value < 40:
        warnings.append(
            f"Battery state of charge is low ({battery_soc_value:.1f}%)"
        )

    if battery_health_value < 60:
        critical_conditions.append(
            f"Battery health is critically low ({battery_health_value:.1f}%)"
        )
    elif battery_health_value < 80:
        warnings.append(
            f"Battery health is degraded ({battery_health_value:.1f}%)"
        )

    # ---------------------------------------------------------
    # 3. Fuel / generator risk
    # ---------------------------------------------------------

    if fuel_reserve < 20:
        critical_conditions.append(
            f"Fuel reserve is critically low ({fuel_reserve:.1f}%)"
        )
    elif fuel_reserve < 40:
        warnings.append(
            f"Fuel reserve is low ({fuel_reserve:.1f}%)"
        )

    if fuel_days < 3:
        critical_conditions.append(
            f"Estimated fuel remaining is only {fuel_days:.1f} days"
        )
    elif fuel_days < 7:
        warnings.append(
            f"Estimated fuel remaining is {fuel_days:.1f} days"
        )

    if generator_capacity > 0 and shortage_kw > generator_capacity:
        critical_conditions.append(
            "Generator capacity is insufficient to cover the predicted energy shortage"
        )

    # ---------------------------------------------------------
    # 4. Renewable generation risk
    # ---------------------------------------------------------

    renewable_change = (
        predicted_renewable - renewable_generation
    )

    if predicted_renewable <= 0:
        critical_conditions.append(
            "Predicted renewable generation is unavailable"
        )
    elif renewable_change < 0:
        warnings.append(
            f"Renewable generation is expected to decrease by "
            f"{abs(renewable_change):.1f} kW"
        )

    # ---------------------------------------------------------
    # 5. Demand increase risk
    # ---------------------------------------------------------

    demand_change = predicted_demand - current_demand

    if current_demand > 0:
        demand_increase_percentage = (
            demand_change / current_demand * 100
        )
    else:
        demand_increase_percentage = 0.0

    if demand_increase_percentage >= 30:
        critical_conditions.append(
            f"Predicted demand increase of "
            f"{demand_increase_percentage:.1f}%"
        )
    elif demand_increase_percentage >= 15:
        warnings.append(
            f"Predicted demand increase of "
            f"{demand_increase_percentage:.1f}%"
        )

    # ---------------------------------------------------------
    # 6. AI anomaly risk
    # ---------------------------------------------------------

    if anomaly_detected:
        critical_conditions.append(
            f"AI anomaly detector identified abnormal station behavior "
            f"(score: {anomaly_score_value:.4f})"
        )

    # ---------------------------------------------------------
    # 7. Determine overall risk
    # ---------------------------------------------------------

    if critical_conditions:
        risk_level = "critical"
    elif warnings:
        risk_level = "warning"
    else:
        risk_level = "normal"

    # ---------------------------------------------------------
    # 8. Generate recommended actions
    # ---------------------------------------------------------

    recommended_actions: List[str] = []

    if shortage_kw > 0:
        recommended_actions.append(
            "Reduce or defer non-critical electrical loads"
        )

    if battery_soc_value < 40:
        recommended_actions.append(
            "Preserve battery capacity and prioritize critical loads"
        )

    if fuel_reserve < 40 or fuel_days < 7:
        recommended_actions.append(
            "Review generator fuel consumption and reserve strategy"
        )

    if predicted_renewable < renewable_generation:
        recommended_actions.append(
            "Prepare backup generation for reduced renewable availability"
        )

    if anomaly_detected:
        recommended_actions.append(
            "Investigate abnormal station conditions before taking major control actions"
        )

    if not recommended_actions:
        recommended_actions.append(
            "Continue normal station operation and monitoring"
        )

    # ---------------------------------------------------------
    # 9. Risk score
    # ---------------------------------------------------------

    risk_score = 0.0

    if shortage_kw > 0 and predicted_demand > 0:
        risk_score += min(
            40.0,
            (shortage_kw / predicted_demand) * 100.0
        )

    if battery_soc_value < 40:
        risk_score += min(
            20.0,
            (40.0 - battery_soc_value) / 2.0
        )

    if fuel_reserve < 40:
        risk_score += min(
            15.0,
            (40.0 - fuel_reserve) * 0.375
        )

    if fuel_days < 7:
        risk_score += min(
            10.0,
            (7.0 - fuel_days) * 1.43
        )

    if anomaly_detected:
        risk_score += 25.0

    if demand_increase_percentage > 15:
        risk_score += min(
            15.0,
            (demand_increase_percentage - 15.0) * 0.5
        )

    risk_score = min(100.0, risk_score)

    # ---------------------------------------------------------
    # 10. Return complete risk assessment
    # ---------------------------------------------------------

    return {
        "riskLevel": risk_level,
        "riskScore": round(risk_score, 2),
        "predictedEnergyBalanceKw": round(
            predicted_energy_balance, 3
        ),
        "predictedDemandKw": round(
            predicted_demand, 3
        ),
        "predictedRenewableKw": round(
            predicted_renewable, 3
        ),
        "energyShortageKw": round(
            shortage_kw, 3
        ),
        "demandChangeKw": round(
            demand_change, 3
        ),
        "demandChangePercent": round(
            demand_increase_percentage, 2
        ),
        "renewableChangeKw": round(
            renewable_change, 3
        ),
        "batterySocPercent": round(
            battery_soc_value, 2
        ),
        "batteryHealthPercent": round(
            battery_health_value, 2
        ),
        "fuelReservePercent": round(
            fuel_reserve, 2
        ),
        "fuelDaysRemaining": round(
            fuel_days, 2
        ),
        "anomalyDetected": anomaly_detected,
        "anomalyScore": round(
            anomaly_score_value, 6
        ),
        "reasons": critical_conditions,
        "warnings": warnings,
        "recommendedActions": recommended_actions,
    }