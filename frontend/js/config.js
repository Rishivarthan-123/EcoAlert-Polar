/**
 * EcoAlert Polar - Configuration & Constants
 */

window.ECO_CONFIG = {
  APP_NAME: "EcoAlert Polar",
  VERSION: "1.0.0",
  STATION_NAME: "Main Station (Amundsen-Scott)",
  UPDATE_INTERVAL_MS: 3000,
  
  // Risk Score Levels
  RISK_LEVELS: {
    SAFE: { label: "SAFE", min: 0, max: 25, color: "#39E6A5", badgeClass: "badge-safe" },
    WARNING: { label: "WARNING", min: 26, max: 60, color: "#FFC857", badgeClass: "badge-warning" },
    HIGH: { label: "HIGH", min: 61, max: 85, color: "#FF8557", badgeClass: "badge-high" },
    CRITICAL: { label: "CRITICAL", min: 86, max: 100, color: "#FF5C7A", badgeClass: "badge-critical" }
  },

  // Operating Modes
  OPERATING_MODES: {
    NORMAL: { label: "NORMAL", color: "#39E6A5" },
    ALERT: { label: "ALERT", color: "#FFC857" },
    CRITICAL: { label: "CRITICAL", color: "#FF5C7A" }
  },

  // Load Priority Classes
  LOAD_PRIORITIES: {
    CRITICAL: { label: "CRITICAL", badgeClass: "badge-critical", color: "#FF5C7A" },
    ESSENTIAL: { label: "ESSENTIAL", badgeClass: "badge-cyan", color: "#55D6FF" },
    NON_CRITICAL: { label: "NON-CRITICAL", badgeClass: "badge-violet", color: "#8B7CFF" }
  },

  // Stations List (summary for selector)
  AVAILABLE_STATIONS: [
    { id: "STATION-AMUNDSEN-01", name: "Main Station (Amundsen-Scott)", season: "WINTER", temp: -20 },
    { id: "STATION-VOSTOK-02", name: "Sub-Station Vostok Ridge", season: "WINTER", temp: -38 },
    { id: "STATION-ROSS-03", name: "Coastal Outpost Ross Island", season: "WINTER", temp: -14 }
  ],

  // Full telemetry profiles per station — pushed to backend on station switch
  STATION_PROFILES: {
    "STATION-AMUNDSEN-01": {
      station: {
        id: "STATION-AMUNDSEN-01",
        name: "Main Station (Amundsen-Scott Sector)",
        code: "POLAR-MAIN",
        zone: "Research & Habitat Zone Alpha",
        season: "WINTER",
        operatingMode: "ALERT",
        coordinates: "89°59'S, 139°16'W",
        elevation: "2,835 m",
        operator: { name: "Cmdr. Elena Vance", role: "Lead Energy Officer", clearance: "Level 4 - Life Support & Grid Admin", avatar: "EV" }
      },
      environment: { temperature: -20, feelsLike: -34, windSpeed: 9.2, solarRadiation: 0, windDirection: "SSW (205°)", barometer: "982 hPa (Falling)", stormAlert: "Blizzard Warning Phase 2 Active" },
      occupancy: { current: 15, capacity: 40 },
      energy: {
        currentDemand: 90, nominalDemand: 75,
        windGeneration: 25, solarGeneration: 0,
        battery: { soc: 35, health: 96, capacityKwh: 500 },
        generator: { status: "AVAILABLE", capacityKw: 150, fuelReservePercent: 82, fuelDaysRemaining: 18.5 }
      }
    },
    "STATION-VOSTOK-02": {
      station: {
        id: "STATION-VOSTOK-02",
        name: "Sub-Station Vostok Ridge",
        code: "POLAR-VOSTOK",
        zone: "Deep Ice Research Zone Beta",
        season: "WINTER",
        operatingMode: "CRITICAL",
        coordinates: "78°27'S, 106°50'E",
        elevation: "3,488 m",
        operator: { name: "Dr. Alexei Morozov", role: "Station Commander", clearance: "Level 5 - Emergency Override", avatar: "AM" }
      },
      environment: { temperature: -38, feelsLike: -57, windSpeed: 14.8, solarRadiation: 0, windDirection: "NNE (025°)", barometer: "645 hPa (Extreme Low)", stormAlert: "Extreme Cold Event – Thermal Emergency" },
      occupancy: { current: 6, capacity: 20 },
      energy: {
        currentDemand: 112, nominalDemand: 95,
        windGeneration: 18, solarGeneration: 0,
        battery: { soc: 21, health: 88, capacityKwh: 350 },
        generator: { status: "RUNNING", capacityKw: 120, fuelReservePercent: 41, fuelDaysRemaining: 6.2 }
      }
    },
    "STATION-ROSS-03": {
      station: {
        id: "STATION-ROSS-03",
        name: "Coastal Outpost Ross Island",
        code: "POLAR-ROSS",
        zone: "Coastal Survey & Marine Lab",
        season: "WINTER",
        operatingMode: "NORMAL",
        coordinates: "77°51'S, 166°41'E",
        elevation: "34 m",
        operator: { name: "Lt. Sarah Kimura", role: "Outpost Energy Lead", clearance: "Level 3 - Grid Monitoring", avatar: "SK" }
      },
      environment: { temperature: -14, feelsLike: -22, windSpeed: 6.3, solarRadiation: 2.1, windDirection: "W (270°)", barometer: "1008 hPa (Stable)", stormAlert: "None Active" },
      occupancy: { current: 8, capacity: 25 },
      energy: {
        currentDemand: 54, nominalDemand: 48,
        windGeneration: 31, solarGeneration: 2,
        battery: { soc: 68, health: 99, capacityKwh: 300 },
        generator: { status: "AVAILABLE", capacityKw: 80, fuelReservePercent: 91, fuelDaysRemaining: 34.0 }
      }
    }
  },

  // Storage Keys
  STORAGE_KEYS: {
    ACTIVE_PAGE: "ecoalert_active_page",
    SIMULATION_STATE: "ecoalert_sim_state"
  }
};
