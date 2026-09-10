/**
 * EcoAlert Polar - Deterministic Baseline Demo Data
 * Reusable across all pages to tell one coherent mission control story.
 */

window.ECO_DEMO_DATA = {
  station: {
    id: "STATION-AMUNDSEN-01",
    name: "Main Station (Amundsen-Scott Sector)",
    code: "POLAR-MAIN",
    zone: "Research & Habitat Zone Alpha",
    season: "WINTER",
    operatingMode: "ALERT", // NORMAL, ALERT, CRITICAL
    coordinates: "89°59'S, 139°16'W",
    elevation: "2,835 m",
    lastUpdated: "14:00:12 UTC",
    operator: {
      name: "Cmdr. Elena Vance",
      role: "Lead Energy Officer",
      clearance: "Level 4 - Life Support & Grid Admin",
      avatar: "EV"
    }
  },

  environment: {
    temperature: -20, // °C
    feelsLike: -34, // °C (wind chill)
    windSpeed: 9.2, // m/s
    windDirection: "SSW (205°)",
    solarRadiation: 0, // W/m² (Polar Winter Night)
    barometer: "982 hPa (Falling)",
    stormAlert: "Blizzard Warning Phase 2 Active"
  },

  occupancy: {
    current: 15,
    capacity: 40,
    roleBreakdown: {
      researchers: 8,
      engineers: 4,
      medicalSupport: 3
    },
    activityLevel: "HIGH" // Normal daytime research cycle
  },

  energy: {
    currentDemand: 90, // kW
    nominalDemand: 75, // kW
    predictedDemand: 108, // kW (Next 1h)
    peakDemand: 115, // kW (Next 2.5h)
    demandTrend: "INCREASING",

    renewableGeneration: 25, // kW
    renewableForecast: 22, // kW (Next 1h)
    renewableTrend: "DECREASING",
    renewableBreakdown: {
      wind: 25,
      solar: 0,
      forecastWind1h: 22,
      forecastSolar1h: 0
    },

    battery: {
      soc: 35, // %
      capacityKwh: 500,
      availableKwh: 175,
      health: 96, // %
      chargeRateKw: 0,
      dischargeRateKw: 65, // kW (Demand 90 - Renewable 25 = 65 kW from battery)
      minSafeBuffer: 20 // %
    },

    generator: {
      status: "AVAILABLE", // AVAILABLE, RUNNING, OFFLINE, MAINTENANCE
      capacityKw: 150,
      fuelReservePercent: 82,
      fuelDaysRemaining: 18.5,
      autoStartThresholdSoc: 15 // %
    },

    survivalTimeHours: 8.0, // Nominally ~8 hours with battery + generator reserve
    batteryOnlySurvivalHours: 2.7 // At 65 kW net drain: 175 kWh / 65 kW = 2.69 hours
  },

  risk: {
    level: "HIGH", // SAFE, WARNING, HIGH, CRITICAL, BLOCKED
    score: 78, // %
    statusText: "HIGH ENERGY RISK",
    crisisPredicted: true,
    estimatedOccurrence: "1.5 HOURS",
    timeToShortageMinutes: 90,
    expectedDeficitKw: 33,
    summary: "Potential energy shortage predicted in 1.5 hours. Net generation deficit of 33 kW anticipated as heating surges and wind drops.",
    primaryCauses: [
      {
        id: "cause-1",
        title: "Increasing Station Demand",
        severity: "HIGH",
        icon: "trending-up",
        detail: "Exterior temp drop (-20°C) triggering continuous multi-stage heating coil cycles and active cryogenic lab chillers (+18 kW increase)."
      },
      {
        id: "cause-2",
        title: "Low Renewable Generation",
        severity: "HIGH",
        icon: "wind",
        detail: "Polar winter darkness provides 0 kW solar. Wind speed forecast decelerating from 9.2 m/s to 5.1 m/s, reducing turbine output to 22 kW."
      },
      {
        id: "cause-3",
        title: "Declining Reserve Buffer",
        severity: "WARNING",
        icon: "battery-charging",
        detail: "Battery SOC at 35% (175 kWh). Net discharge rate of 65 kW will breach safety reserve threshold (20%) in under 1.8 hours without mitigation."
      }
    ],
    recommendedResponse: {
      title: "Reduce or Delay Non-Critical Loads",
      action: "Defer Auxiliary Equipment cycle (10 kW) and dim Facility Walkway Lighting by 50% (6 kW).",
      savingKw: 16,
      riskReduction: "HIGH (78%) → MEDIUM (42%)",
      survivalExtension: "+2.5 Hours battery reserve",
      criticalLoadsAffected: false
    }
  },

  loads: [
    {
      id: "load-heating-01",
      name: "Heating Unit 01 (Habitat Main)",
      type: "Heating",
      powerKw: 35,
      currentPriority: "ESSENTIAL",
      recommendedPriority: "CRITICAL",
      reason: "Extreme polar cold (-20°C) requires active heating to prevent thermal collapse in living quarters.",
      action: "PROTECT",
      status: "ACTIVE",
      critical: true,
      canShed: false
    },
    {
      id: "load-laboratory",
      name: "Laboratory Core (Atmospheric/Ice)",
      type: "Research",
      powerKw: 25,
      currentPriority: "ESSENTIAL",
      recommendedPriority: "ESSENTIAL",
      reason: "Ice core freezer preservation active. Core experiments cannot tolerate power dips >15 minutes.",
      action: "MAINTAIN",
      status: "ACTIVE",
      critical: false,
      canShed: false
    },
    {
      id: "load-lighting",
      name: "Lighting (Station & Exterior)",
      type: "Facility",
      powerKw: 12,
      currentPriority: "ESSENTIAL",
      recommendedPriority: "NON-CRITICAL",
      reason: "Common area and exterior floodlights can be reduced by 50% with zero safety hazard.",
      action: "REDUCE",
      status: "ACTIVE",
      critical: false,
      canShed: true,
      suggestedReductionKw: 6
    },
    {
      id: "load-auxiliary",
      name: "Auxiliary Equipment (Water Heater/Pump)",
      type: "Support",
      powerKw: 10,
      currentPriority: "NON-CRITICAL",
      recommendedPriority: "NON-CRITICAL",
      reason: "Secondary greywater pumping cycle and laundry water heater can be deferred for up to 4 hours safely.",
      action: "DELAY",
      status: "ACTIVE",
      critical: false,
      canShed: true,
      suggestedReductionKw: 10
    },
    {
      id: "load-life-support",
      name: "O2 Generation & Air Scrubbers",
      type: "Life Support",
      powerKw: 8,
      currentPriority: "CRITICAL",
      recommendedPriority: "CRITICAL",
      reason: "Class 1 Life Support system. Station air circulation and O2 enrichment must never be interrupted.",
      action: "PROTECT",
      status: "ACTIVE",
      critical: true,
      canShed: false
    },
    {
      id: "load-comm-telemetry",
      name: "Satellite Comm & Deep Space Uplink",
      type: "Telemetry",
      powerKw: 5,
      currentPriority: "ESSENTIAL",
      recommendedPriority: "ESSENTIAL",
      reason: "Emergency distress relay and Antarctic research uplink window active until 18:00 UTC.",
      action: "MAINTAIN",
      status: "ACTIVE",
      critical: false,
      canShed: false
    }
  ],

  // Pre-calculated hourly timeline data for synchronized charting
  timeline: {
    hours: ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"],
    actualDemand: [90, null, null, null, null, null, null],
    predictedDemand: [90, 108, 115, 112, 104, 98, 92],
    peakDemandLine: [115, 115, 115, 115, 115, 115, 115],
    availableSupply: [75, 72, 70, 70, 72, 74, 76], // Combined Renewable + Safe Battery Discharge
    renewableForecast: [25, 22, 19, 18, 20, 22, 25],
    windGeneration: [25, 22, 19, 18, 20, 22, 25],
    solarGeneration: [0, 0, 0, 0, 0, 0, 0],
    batterySocForecast: [35, 27, 18, 11, 6, 2, 0], // Without intervention
    riskTimeline: [
      { step: "NOW", time: "14:00", level: "WARNING", label: "Warning Level Active" },
      { step: "+30m", time: "14:30", level: "HIGH", label: "Demand Spiking" },
      { step: "+1h", time: "15:00", level: "HIGH", label: "Wind Decreasing" },
      { step: "+1.5h", time: "15:30", level: "CRITICAL", label: "Predicted Shortage Deficit 33 kW" },
      { step: "+2h", time: "16:00", level: "SHORTAGE", label: "Battery Under Minimum 20%" }
    ]
  },

  alerts: [
    {
      id: "alt-01",
      severity: "CRITICAL",
      title: "Energy Shortage Predicted",
      timestamp: "14:00:08",
      zone: "Whole Station Grid",
      reason: "Projected 33 kW supply deficit at +1.5h (15:30 UTC).",
      actionRequired: true
    },
    {
      id: "alt-02",
      severity: "WARNING",
      title: "Demand Spike Forecasted",
      timestamp: "13:58:30",
      zone: "Heating Zone Alpha",
      reason: "Blizzard drop to -20°C driving continuous multi-stage heating coil run.",
      actionRequired: false
    },
    {
      id: "alt-03",
      severity: "WARNING",
      title: "Renewable Generation Decreasing",
      timestamp: "13:54:12",
      zone: "Turbine Field 02",
      reason: "Wind decelerating from 9.2 m/s to 5.1 m/s over next 90 min.",
      actionRequired: false
    },
    {
      id: "alt-04",
      severity: "WARNING",
      title: "Battery Reserve Approaching Safe Threshold",
      timestamp: "13:50:00",
      zone: "BESS Storage Bank B",
      reason: "Current net drain rate of 65 kW projects SOC dropping below 20% in 1.8h.",
      actionRequired: false
    }
  ],

  historyLogs: [
    {
      id: "LOG-9401",
      timestamp: "2026-09-10 14:00:08",
      event: "Crisis Prediction Triggered",
      category: "Risk Engine",
      station: "Main Station",
      severity: "CRITICAL",
      status: "ACTIVE",
      details: "AI Model detected 78% risk with 33 kW deficit in 1.5h. Load recommendation generated.",
      operator: "AI Autonomous Engine"
    },
    {
      id: "LOG-9400",
      timestamp: "2026-09-10 13:58:30",
      event: "Demand Forecast Horizon Updated",
      category: "Prediction",
      station: "Main Station / Research Alpha",
      severity: "WARNING",
      status: "COMPLETED",
      details: "1-hour horizon revised upward to 108 kW due to exterior chill factor (-34°C).",
      operator: "DeepAR Forecaster v3.2"
    },
    {
      id: "LOG-9399",
      timestamp: "2026-09-10 13:54:12",
      event: "Renewable Wind Velocity Dip",
      category: "Telemetry",
      station: "Turbine Field 02",
      severity: "WARNING",
      status: "MONITORED",
      details: "Anemometer sensor 4 reads 9.2 m/s, forecast down to 5.1 m/s.",
      operator: "Meteo-Polar System"
    },
    {
      id: "LOG-9398",
      timestamp: "2026-09-10 13:30:00",
      event: "Routine Load Prioritization Audit",
      category: "Loads",
      station: "Whole Station",
      severity: "INFO",
      status: "NORMAL",
      details: "Heating Unit 01 re-tagged from ESSENTIAL to CRITICAL based on thermal model.",
      operator: "Priority Matrix Engine"
    },
    {
      id: "LOG-9397",
      timestamp: "2026-09-10 12:45:19",
      event: "Diesel Generator Standby Self-Check",
      category: "Generator",
      station: "Power Plant 01",
      severity: "INFO",
      status: "PASSED",
      details: "Auxiliary 150 kW CAT generator crank test passed. 82% fuel reserve verified.",
      operator: "Eng. M. Kovacs"
    },
    {
      id: "LOG-9396",
      timestamp: "2026-09-10 11:15:04",
      event: "Digital Twin Calibration Sync",
      category: "Digital Twin",
      station: "Simulation Core",
      severity: "INFO",
      status: "SYNCED",
      details: "Thermal mass parameters updated to match habitat insulation test specs.",
      operator: "Simulation Service"
    }
  ]
};
