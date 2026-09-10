from typing import Any, Dict


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def simulate_station(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates the current energy state of the polar research station.

    The digital twin combines:
    - Renewable generation
    - Battery state
    - Generator capacity
    - Station electrical loads
    """

    # ---------------------------------------------------------
    # Generation
    # ---------------------------------------------------------

    wind_generation = max(
        0.0,
        _safe_float(data.get("windGeneration")),
    )

    solar_generation = max(
        0.0,
        _safe_float(data.get("solarGeneration")),
    )

    renewable_generation = (
        wind_generation + solar_generation
    )

    generator_output = max(
        0.0,
        _safe_float(data.get("generatorOutputKw")),
    )

    generator_capacity = max(
        0.0,
        _safe_float(data.get("generatorCapacityKw")),
    )

    # Generator cannot exceed its rated capacity.
    generator_output = min(
        generator_output,
        generator_capacity,
    ) if generator_capacity > 0 else generator_output

    total_generation = (
        renewable_generation + generator_output
    )

    # ---------------------------------------------------------
    # Loads
    # ---------------------------------------------------------

    heating = max(
        0.0,
        _safe_float(data.get("heatingLoadKw")),
    )

    laboratory = max(
        0.0,
        _safe_float(data.get("laboratoryLoadKw")),
    )

    lighting = max(
        0.0,
        _safe_float(data.get("lightingLoadKw")),
    )

    auxiliary = max(
        0.0,
        _safe_float(data.get("auxiliaryLoadKw")),
    )

    life_support = max(
        0.0,
        _safe_float(data.get("lifeSupportLoadKw")),
    )

    communication = max(
        0.0,
        _safe_float(data.get("communicationLoadKw")),
    )

    total_load = (
        heating
        + laboratory
        + lighting
        + auxiliary
        + life_support
        + communication
    )

    # ---------------------------------------------------------
    # Energy balance
    # ---------------------------------------------------------

    energy_balance = (
        total_generation - total_load
    )

    # ---------------------------------------------------------
    # Battery
    # ---------------------------------------------------------

    battery_soc = min(
        100.0,
        max(
            0.0,
            _safe_float(data.get("batterySoc")),
        ),
    )

    battery_capacity = max(
        0.0,
        _safe_float(data.get("batteryAvailableKwh")),
    )

    battery_charge_rate = max(
        0.0,
        _safe_float(data.get("batteryChargeRateKw")),
    )

    battery_discharge_rate = max(
        0.0,
        _safe_float(data.get("batteryDischargeRateKw")),
    )

    battery_energy_kwh = (
        battery_capacity * battery_soc / 100.0
    )

    battery_action = "idle"
    battery_power_kw = 0.0

    # Surplus energy charges the battery.
    if energy_balance > 0 and battery_capacity > 0:
        available_surplus = energy_balance

        battery_power_kw = min(
            available_surplus,
            battery_charge_rate,
        )

        battery_action = (
            "charging"
            if battery_power_kw > 0
            else "idle"
        )

        battery_energy_kwh += battery_power_kw

    # Energy deficit discharges the battery.
    elif energy_balance < 0 and battery_capacity > 0:
        required_power = abs(energy_balance)

        battery_power_kw = min(
            required_power,
            battery_discharge_rate,
            battery_energy_kwh,
        )

        battery_action = (
            "discharging"
            if battery_power_kw > 0
            else "depleted"
        )

        battery_energy_kwh -= battery_power_kw

    if battery_capacity > 0:
        battery_energy_kwh = min(
            battery_capacity,
            max(0.0, battery_energy_kwh),
        )

        projected_battery_soc = (
            battery_energy_kwh
            / battery_capacity
            * 100.0
        )
    else:
        projected_battery_soc = battery_soc

    # ---------------------------------------------------------
    # Remaining energy balance after battery
    # ---------------------------------------------------------

    if battery_action == "charging":
        final_energy_balance = (
            energy_balance - battery_power_kw
        )
    elif battery_action == "discharging":
        final_energy_balance = (
            energy_balance + battery_power_kw
        )
    else:
        final_energy_balance = energy_balance

    remaining_deficit = max(
        0.0,
        -final_energy_balance,
    )

    remaining_surplus = max(
        0.0,
        final_energy_balance,
    )

    # ---------------------------------------------------------
    # Station status
    # ---------------------------------------------------------

    if remaining_deficit > 0:
        if projected_battery_soc <= 20:
            station_status = "critical"
        else:
            station_status = "deficit"
    elif projected_battery_soc <= 20:
        station_status = "battery_low"
    elif remaining_surplus > 0:
        station_status = "stable"
    else:
        station_status = "balanced"

    # ---------------------------------------------------------
    # Generator recommendation
    # ---------------------------------------------------------

    generator_required = False
    recommended_generator_output = 0.0

    if remaining_deficit > 0:
        generator_required = True

        if generator_capacity > 0:
            recommended_generator_output = min(
                remaining_deficit,
                generator_capacity,
            )
        else:
            recommended_generator_output = remaining_deficit

    # ---------------------------------------------------------
    # Recommendations
    # ---------------------------------------------------------

    recommendations = []

    if generator_required:
        recommendations.append(
            "Generator support is required to cover the remaining energy deficit"
        )

    if projected_battery_soc <= 20:
        recommendations.append(
            "Battery state of charge is low; preserve remaining battery capacity"
        )

    if battery_action == "charging":
        recommendations.append(
            f"Use {battery_power_kw:.1f} kW surplus to charge the battery"
        )

    if battery_action == "discharging":
        recommendations.append(
            f"Battery is supplying {battery_power_kw:.1f} kW to support station loads"
        )

    if remaining_surplus > 0:
        recommendations.append(
            f"{remaining_surplus:.1f} kW of surplus generation remains available"
        )

    if not recommendations:
        recommendations.append(
            "Station energy state is stable"
        )

    # ---------------------------------------------------------
    # Return digital twin state
    # ---------------------------------------------------------

    return {
        "stationStatus": station_status,

        "generation": {
            "windKw": round(wind_generation, 3),
            "solarKw": round(solar_generation, 3),
            "renewableKw": round(renewable_generation, 3),
            "generatorKw": round(generator_output, 3),
            "totalGenerationKw": round(total_generation, 3),
        },

        "loads": {
            "heatingKw": round(heating, 3),
            "laboratoryKw": round(laboratory, 3),
            "lightingKw": round(lighting, 3),
            "auxiliaryKw": round(auxiliary, 3),
            "lifeSupportKw": round(life_support, 3),
            "communicationKw": round(communication, 3),
            "totalLoadKw": round(total_load, 3),
        },

        "energy": {
            "initialBalanceKw": round(
                energy_balance,
                3,
            ),
            "finalBalanceKw": round(
                final_energy_balance,
                3,
            ),
            "remainingDeficitKw": round(
                remaining_deficit,
                3,
            ),
            "remainingSurplusKw": round(
                remaining_surplus,
                3,
            ),
        },

        "battery": {
            "initialSocPercent": round(
                battery_soc,
                2,
            ),
            "projectedSocPercent": round(
                projected_battery_soc,
                2,
            ),
            "capacityKwh": round(
                battery_capacity,
                3,
            ),
            "energyAvailableKwh": round(
                battery_energy_kwh,
                3,
            ),
            "action": battery_action,
            "powerKw": round(
                battery_power_kw,
                3,
            ),
        },

        "generator": {
            "capacityKw": round(
                generator_capacity,
                3,
            ),
            "currentOutputKw": round(
                generator_output,
                3,
            ),
            "required": generator_required,
            "recommendedOutputKw": round(
                recommended_generator_output,
                3,
            ),
        },

        "recommendations": recommendations,
    }