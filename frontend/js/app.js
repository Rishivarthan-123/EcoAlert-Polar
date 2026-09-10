/**
 * EcoAlert Polar - Main Application Entrypoint
 * Bootstraps components, state subscriptions, initial routing,
 * and authoritative central backend telemetry polling.
 */

document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "%c ECOALERT POLAR // ANTARCTIC ENERGY COMMAND CENTER ",
    "background: #0B1728; color: #55D6FF; font-weight: bold; font-size: 14px; padding: 6px 12px; border-radius: 4px; border: 1px solid #55D6FF;"
  );
  console.log("AI Energy Intelligence & Predictive Decision Support System Initialized.");

  // 1. Initialize UI Frame Components
  window.ecoSidebar = new window.EcoSidebar();
  window.ecoHeader = new window.EcoHeader();
  window.ecoStationContext = new window.EcoStationContext();

  // 2. Initialize Navigation Router
  window.ecoNav = new window.EcoNavigation();

  // 3. Mount Initial Page from URL hash or default to overview
  const initialHash = window.location.hash.replace("#", "") || "overview";
  window.ecoNav.navigateTo(initialHash);

  // 4. Central Telemetry Polling Engine (Backend Source of Truth)
  let isPolling = false;

  async function pollStationTelemetry() {
    if (isPolling) return;
    isPolling = true;

    try {
      if (window.ECO_API && typeof window.ECO_API.getStationState === "function") {
        const data = await window.ECO_API.getStationState();
        if (data && window.ecoState && typeof window.ecoState.setStationTelemetry === "function") {
          window.ecoState.setStationTelemetry(data);
        }
      }
    } catch (err) {
      console.warn("Backend polling offline:", err);
      if (window.ecoState && typeof window.ecoState.markTelemetryOffline === "function") {
        window.ecoState.markTelemetryOffline();
      }
    } finally {
      isPolling = false;
    }
  }

  // Initial immediate fetch
  pollStationTelemetry();

  // Polling loop every 6 seconds for live backend state
  const pollingInterval = setInterval(pollStationTelemetry, 6000);

  // Clean up on window unload
  window.addEventListener("beforeunload", () => {
    clearInterval(pollingInterval);
  });
});
