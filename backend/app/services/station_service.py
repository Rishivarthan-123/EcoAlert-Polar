"""
EcoAlert Polar - Station Telemetry Service

Provides the central station state used by the dashboard and
other backend decision-support services.

The backend Station Telemetry Service is the authoritative single source
of truth for all station metrics.
"""

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict


_station_state: Dict[str, Any] = {
    "station": {
        "id": "STATION-AMUNDSEN-01",
        "name": "Main Station (Amundsen-Scott Sector)",
        "code": "POLAR-MAIN",
        "zone": "Research & Habitat Zone Alpha",
        "season": "WINTER",
        "operatingMode": "ALERT",
        "coordinates": "89°59'S, 139°16'W",
        "elevation": "2,835 m",
        "operator": {
            "name": "Cmdr. Elena Vance",
            "role": "Lead Energy Officer",
            "clearance": "Level 4 - Life Support & Grid Admin",
            "avatar": "EV",
        },
    },

    "environment": {
        "temperature": -20.0,
        "feelsLike": -34.0,
        "windSpeed": 9.2,
        "windDirection": "SSW (205°)",
        "solarRadiation": 0.0,
        "barometer": "982 hPa (Falling)",
        "stormAlert": "Blizzard Warning Phase 2 Active",
        "hour": 14,
        "day_of_week": datetime.now(timezone.utc).weekday(),
        "month": datetime.now(timezone.utc).month,
    },

    "occupancy": {
        "current": 15,
        "capacity": 40,
        "roleBreakdown": {
            "researchers": 8,
            "engineers": 4,
            "medicalSupport": 3,
        },
        "activityLevel": "HIGH",
    },

    "energy": {
        "currentDemand": 90.0,
        "nominalDemand": 75.0,
        "renewableGeneration": 25.0,
        "windGeneration": 25.0,
        "solarGeneration": 0.0,

        "battery": {
            "soc": 35.0,
            "capacityKwh": 500.0,
            "availableKwh": 175.0,
            "health": 96.0,
            "chargeRateKw": 0.0,
            "dischargeRateKw": 65.0,
            "minSafeBuffer": 20.0,
        },

        "generator": {
            "status": "AVAILABLE",
            "capacityKw": 150.0,
            "fuelReservePercent": 82.0,
            "fuelDaysRemaining": 18.5,
            "autoStartThresholdSoc": 15.0,
        },

        "survivalTimeHours": 8.0,
        "batteryOnlySurvivalHours": 2.7,
    },

    "loads": [
        {
            "id": "load-heating-01",
            "name": "Heating Unit 01 (Habitat Main)",
            "type": "Heating",
            "powerKw": 35.0,
            "priority": "CRITICAL",
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "CRITICAL",
            "action": "PROTECT",
            "status": "ACTIVE",
            "critical": True,
            "canShed": False,
            "reason": "Extreme polar cold (-20°C) requires active heating to prevent thermal collapse in living quarters. Cannot be interrupted.",
        },
        {
            "id": "load-laboratory",
            "name": "Laboratory Core (Atmospheric/Ice)",
            "type": "Research",
            "powerKw": 25.0,
            "priority": "ESSENTIAL",
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "ESSENTIAL",
            "action": "MAINTAIN",
            "status": "ACTIVE",
            "critical": False,
            "canShed": False,
            "reason": "Ice core freezer preservation active. Core experiments cannot tolerate power dips >15 minutes without data loss.",
        },
        {
            "id": "load-lighting",
            "name": "Lighting (Station & Exterior)",
            "type": "Facility",
            "powerKw": 12.0,
            "priority": "ESSENTIAL",
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "NON-CRITICAL",
            "action": "REDUCE",
            "status": "ACTIVE",
            "critical": False,
            "canShed": True,
            "suggestedReductionKw": 6.0,
            "reason": "Common area and exterior floodlights can be reduced by 50% with zero safety hazard during non-critical hours.",
        },
        {
            "id": "load-auxiliary",
            "name": "Auxiliary Equipment (Water Heater/Pump)",
            "type": "Support",
            "powerKw": 10.0,
            "priority": "NON-CRITICAL",
            "currentPriority": "NON-CRITICAL",
            "recommendedPriority": "NON-CRITICAL",
            "action": "DELAY",
            "status": "ACTIVE",
            "critical": False,
            "canShed": True,
            "suggestedReductionKw": 10.0,
            "reason": "Secondary greywater pumping cycle and laundry water heater can be deferred for up to 4 hours safely without crew impact.",
        },
        {
            "id": "load-life-support",
            "name": "O2 Generation & Air Scrubbers",
            "type": "Life Support",
            "powerKw": 8.0,
            "priority": "CRITICAL",
            "currentPriority": "CRITICAL",
            "recommendedPriority": "CRITICAL",
            "action": "PROTECT",
            "status": "ACTIVE",
            "critical": True,
            "canShed": False,
            "reason": "Class 1 Life Support system. Station air circulation and O2 enrichment must never be interrupted under any condition.",
        },
        {
            "id": "load-comm-telemetry",
            "name": "Satellite Comm & Deep Space Uplink",
            "type": "Telemetry",
            "powerKw": 5.0,
            "priority": "ESSENTIAL",
            "currentPriority": "ESSENTIAL",
            "recommendedPriority": "ESSENTIAL",
            "action": "MAINTAIN",
            "status": "ACTIVE",
            "critical": False,
            "canShed": False,
            "reason": "Emergency distress relay and Antarctic research uplink window active until 18:00 UTC. Required for crew safety coordination.",
        },
    ],

    "telemetry": {
        "source": "LIVE_BACKEND_TELEMETRY",
        "connected": True,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    },
}


def _recalculate_derived_metrics() -> None:
    """
    Recalculate derived station energy metrics to ensure internal consistency.
    """
    energy = _station_state["energy"]
    battery = energy["battery"]
    generator = energy["generator"]

    # Calculate total renewable generation if components supplied
    if "windGeneration" in energy or "solarGeneration" in energy:
        energy["renewableGeneration"] = energy.get("windGeneration", 0.0) + energy.get("solarGeneration", 0.0)

    # Battery available kWh from SOC
    if "capacityKwh" in battery and "soc" in battery:
        battery["availableKwh"] = round((battery["capacityKwh"] * battery["soc"]) / 100.0, 2)

    net_deficit = energy["currentDemand"] - energy["renewableGeneration"]

    if net_deficit > 0:
        battery["dischargeRateKw"] = round(net_deficit, 2)
        battery["chargeRateKw"] = 0.0
    else:
        battery["dischargeRateKw"] = 0.0
        battery["chargeRateKw"] = round(abs(net_deficit), 2)

    # Battery only survival hours
    if battery["dischargeRateKw"] > 0:
        energy["batteryOnlySurvivalHours"] = round(battery["availableKwh"] / battery["dischargeRateKw"], 1)
    else:
        energy["batteryOnlySurvivalHours"] = 24.0

    # Total survival hours (Battery + Generator Fuel)
    if generator["status"] in {"AVAILABLE", "RUNNING"}:
        gen_hours = (generator["fuelDaysRemaining"] * 24.0)
        energy["survivalTimeHours"] = round(energy["batteryOnlySurvivalHours"] + min(gen_hours, 72.0), 1)
    else:
        energy["survivalTimeHours"] = energy["batteryOnlySurvivalHours"]


def get_station_state() -> Dict[str, Any]:
    """
    Return the complete current station state.
    """
    _recalculate_derived_metrics()
    state = deepcopy(_station_state)
    state["telemetry"]["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    return state


def update_station_state(
    updates: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Update station telemetry.

    Nested dictionaries are merged so a telemetry source can
    update only the values it currently knows.
    """

    def merge(
        target: Dict[str, Any],
        source: Dict[str, Any],
    ) -> None:
        for key, value in source.items():
            if (
                isinstance(value, dict)
                and isinstance(target.get(key), dict)
            ):
                merge(target[key], value)
            else:
                target[key] = value

    merge(_station_state, updates)
    _recalculate_derived_metrics()

    _station_state["telemetry"]["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    _station_state["telemetry"]["connected"] = True
    _station_state["telemetry"]["source"] = "LIVE_BACKEND_TELEMETRY"

    return get_station_state()


def get_energy_snapshot() -> Dict[str, Any]:
    """
    Return the normalized energy snapshot required by
    the AI prediction services.
    """
    state = get_station_state()

    energy = state["energy"]
    battery = energy["battery"]
    generator = energy["generator"]

    loads = state["loads"]

    load_map = {
        load["id"]: load["powerKw"]
        for load in loads
    }

    return {
        "hour": state["environment"].get("hour", datetime.now(timezone.utc).hour),
        "day_of_week": state["environment"].get("day_of_week", datetime.now(timezone.utc).weekday()),
        "month": state["environment"].get("month", datetime.now(timezone.utc).month),

        "temperature": state["environment"]["temperature"],
        "feelsLike": state["environment"]["feelsLike"],
        "windSpeed": state["environment"]["windSpeed"],
        "solarRadiation": state["environment"]["solarRadiation"],

        "occupancy": state["occupancy"]["current"],

        "currentDemand": energy["currentDemand"],
        "nominalDemand": energy["nominalDemand"],

        "windGeneration": energy["windGeneration"],
        "solarGeneration": energy["solarGeneration"],
        "renewableGeneration": energy["renewableGeneration"],

        "batterySoc": battery["soc"],
        "batteryAvailableKwh": battery["availableKwh"],
        "batteryHealth": battery["health"],
        "batteryChargeRateKw": battery["chargeRateKw"],
        "batteryDischargeRateKw": battery["dischargeRateKw"],

        "generatorCapacityKw": generator["capacityKw"],
        "fuelReservePercent": generator["fuelReservePercent"],
        "fuelDaysRemaining": generator["fuelDaysRemaining"],

        "energyBalanceKw": (
            energy["renewableGeneration"]
            - energy["currentDemand"]
        ),

        "heatingLoadKw": load_map.get(
            "load-heating-01",
            35.0,
        ),

        "laboratoryLoadKw": load_map.get(
            "load-laboratory",
            25.0,
        ),

        "lightingLoadKw": load_map.get(
            "load-lighting",
            12.0,
        ),

        "auxiliaryLoadKw": load_map.get(
            "load-auxiliary",
            10.0,
        ),

        "lifeSupportLoadKw": load_map.get(
            "load-life-support",
            8.0,
        ),

        "communicationLoadKw": load_map.get(
            "load-comm-telemetry",
            5.0,
        ),
    }