/**
 * EcoAlert Polar - Crisis & Risk Page Controller
 * Controls the signature intelligence screen.
 */

class EcoCrisisRiskPage {
  constructor() {
    this.initialized = false;
  }

  mount() {
    this.renderVisuals();
    this.bindEvents();
    this.initialized = true;
  }

  renderVisuals() {
    const state = window.ecoState.getState();
    const risk = state.risk || {};

    requestAnimationFrame(() => {
      // 1. Render Circular Donut Risk Gauge
      if (window.renderRiskGauge) {
        window.renderRiskGauge("crisis-gauge-container", risk.score || 0, risk.level || "NORMAL");
      }

      // 2. Render Large Supply vs Demand Deficit Chart
      if (window.renderSupplyDemandChart) {
        window.renderSupplyDemandChart("crisis-supply-demand-chart", true);
      }

      // 3. Render Risk Timeline Track
      if (window.renderRiskTimeline) {
        window.renderRiskTimeline("crisis-risk-timeline-container");
      }
    });
  }

  bindEvents() {
    window.ecoState.subscribe("risk", () => this.renderVisuals());
    window.ecoState.subscribe("timeline", () => this.renderVisuals());
    window.ecoState.subscribe("station", () => this.renderVisuals());
  }
}

window.EcoCrisisRiskPage = EcoCrisisRiskPage;
