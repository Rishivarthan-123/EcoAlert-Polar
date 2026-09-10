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

  // Stations List
  AVAILABLE_STATIONS: [
    { id: "STATION-AMUNDSEN-01", name: "Main Station (Amundsen-Scott)", season: "WINTER", temp: -20 },
    { id: "STATION-VOSTOK-02", name: "Sub-Station Vostok Ridge", season: "WINTER", temp: -38 },
    { id: "STATION-ROSS-03", name: "Coastal Outpost Ross Island", season: "WINTER", temp: -14 }
  ],

  // Storage Keys
  STORAGE_KEYS: {
    ACTIVE_PAGE: "ecoalert_active_page",
    SIMULATION_STATE: "ecoalert_sim_state"
  }
};
