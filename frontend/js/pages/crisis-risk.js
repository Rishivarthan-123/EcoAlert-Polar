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
    this.initialized = true;
  }

  renderVisuals() {
    const state = window.ecoState.getState();

    requestAnimationFrame(() => {
      // 1. Render 78% Circular Donut Risk Gauge
      if (window.renderRiskGauge) {
        window.renderRiskGauge("crisis-gauge-container", state.risk.score, state.risk.level);
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

}

window.EcoCrisisRiskPage = EcoCrisisRiskPage;
