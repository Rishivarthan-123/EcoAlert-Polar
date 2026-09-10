/**
 * EcoAlert Polar - Predictions Page Controller
 */

class EcoPredictionsPage {
  constructor() {
    this.currentHorizon = "1h";
    this.currentScenario = "current";
    this.currentRenewableType = "wind";
  }

  mount() {
    this.renderCharts();
    this.bindControls();
  }

  renderCharts() {
    requestAnimationFrame(() => {
      if (window.renderDemandChart) {
        window.renderDemandChart("predictions-demand-chart");
      }
      if (window.renderRenewableChart) {
        window.renderRenewableChart("predictions-renewable-chart");
      }
    });
  }

  bindControls() {
    // Horizon controls
    const horizonBtns = document.querySelectorAll("#demand-horizon-control .segment-btn");
    horizonBtns.forEach(btn => {
      btn.addEventListener("click", async () => {
        horizonBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentHorizon = btn.getAttribute("data-horizon");
        
        const labelEl = document.getElementById("pred-page-horizon-label");
        if (labelEl) labelEl.textContent = this.currentHorizon.toUpperCase();

        const pred = await window.ECO_API.getDemandPrediction(this.currentHorizon, this.currentScenario);
        const demandValEl = document.getElementById("pred-page-demand");
        const peakValEl = document.getElementById("pred-page-peak");

        if (demandValEl) demandValEl.textContent = `${pred.predictedDemandKw} kW`;
        if (peakValEl) peakValEl.textContent = `${pred.peakDemandKw} kW`;

        window.ecoToast.info("Horizon Updated", `Demand model recalibrated for ${this.currentHorizon} forecast.`);
      });
    });

    // Scenario controls
    const scenarioBtns = document.querySelectorAll("#demand-scenario-control .segment-btn");
    scenarioBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        scenarioBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentScenario = btn.getAttribute("data-scenario");
        window.ecoToast.info("Scenario Switched", `Viewing ${this.currentScenario === 'current' ? 'Live Grid' : 'Digital Twin'} prediction baseline.`);
      });
    });

    // Renewable Type controls
    const renBtns = document.querySelectorAll("#renewable-type-control .segment-btn");
    renBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        renBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentRenewableType = btn.getAttribute("data-type");
        window.ecoToast.info("Array Focus", `Highlighting ${this.currentRenewableType.toUpperCase()} generation arrays.`);
      });
    });
  }
}

window.EcoPredictionsPage = EcoPredictionsPage;
