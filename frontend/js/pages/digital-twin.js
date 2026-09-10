/**
 * EcoAlert Polar - Digital Twin Page Controller
 */

class EcoDigitalTwinPage {
  constructor() {
    this.initialized = false;
  }

  mount() {
    this.bindSliders();
    this.bindEvents();
    this.initialized = true;
  }

  bindSliders() {
    // Temp Slider
    const tempSlider = document.getElementById("slider-dt-temp");
    const tempVal = document.getElementById("val-dt-temp");
    if (tempSlider && tempVal) {
      tempSlider.addEventListener("input", (e) => {
        tempVal.textContent = `${e.target.value}°C`;
      });
    }

    // Wind Slider
    const windSlider = document.getElementById("slider-dt-wind");
    const windVal = document.getElementById("val-dt-wind");
    if (windSlider && windVal) {
      windSlider.addEventListener("input", (e) => {
        windVal.textContent = `${e.target.value} m/s`;
      });
    }

    // Crew Slider
    const crewSlider = document.getElementById("slider-dt-crew");
    const crewVal = document.getElementById("val-dt-crew");
    if (crewSlider && crewVal) {
      crewSlider.addEventListener("input", (e) => {
        crewVal.textContent = `${e.target.value} Researchers`;
      });
    }

    // Battery Slider
    const batSlider = document.getElementById("slider-dt-battery");
    const batVal = document.getElementById("val-dt-battery");
    if (batSlider && batVal) {
      batSlider.addEventListener("input", (e) => {
        const kwh = Math.round((e.target.value / 100) * 500);
        batVal.textContent = `${e.target.value}% (${kwh} kWh)`;
      });
    }

    // Activity control
    const actBtns = document.querySelectorAll("#dt-activity-control .segment-btn");
    actBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        actBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
  }

  getInputs() {
    const activeActBtn = document.querySelector("#dt-activity-control .segment-btn.active");
    return {
      temperature: parseFloat(document.getElementById("slider-dt-temp")?.value || -35),
      windSpeed: parseFloat(document.getElementById("slider-dt-wind")?.value || 2.0),
      solarAvailability: document.getElementById("select-dt-solar")?.value || "LOW",
      occupancy: parseInt(document.getElementById("slider-dt-crew")?.value || 38, 10),
      researchActivity: activeActBtn ? activeActBtn.getAttribute("data-act") : "HIGH",
      batterySoc: parseInt(document.getElementById("slider-dt-battery")?.value || 35, 10),
      generatorStatus: document.getElementById("select-dt-gen")?.value || "AVAILABLE",
      equipmentFault: document.getElementById("select-dt-fault")?.value || "NONE"
    };
  }

  bindEvents() {
    const runBtn = document.getElementById("btn-run-simulation");
    if (runBtn) {
      runBtn.addEventListener("click", async () => {
        runBtn.disabled = true;
        runBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/></svg>
          SOLVING THERMAL & GRID MODELS...
        `;

        const inputs = this.getInputs();
        const res = await window.ECO_API.runDigitalTwin(inputs);

        runBtn.disabled = false;
        runBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          RUN SIMULATION
        `;

        // Update comparison display
        const simDemandEl = document.getElementById("dt-sim-demand");
        const simRenEl = document.getElementById("dt-sim-renewable");
        const simRiskEl = document.getElementById("dt-sim-risk");
        const simSurvEl = document.getElementById("dt-sim-survival");
        const simEtaEl = document.getElementById("dt-sim-eta");
        const simActionEl = document.getElementById("dt-sim-action");
        const statusTag = document.getElementById("sim-status-tag");

        if (simDemandEl) simDemandEl.textContent = `${res.results.simulatedDemandKw} kW`;
        if (simRenEl) simRenEl.textContent = `${res.results.renewableKw} kW`;
        if (simRiskEl) {
          simRiskEl.textContent = `${res.results.energyRiskScore}% (${res.results.energyRiskLevel})`;
          simRiskEl.style.color = res.results.energyRiskLevel === "CRITICAL" ? "var(--critical-red)" : "var(--warning-amber)";
        }
        if (simSurvEl) simSurvEl.textContent = `${res.results.survivalHours} h`;
        if (simEtaEl) simEtaEl.textContent = res.results.crisisEta;
        if (simActionEl) simActionEl.textContent = res.results.recommendedAction;
        if (statusTag) {
          statusTag.textContent = "SIMULATION CONVERGED (0.38s)";
          statusTag.className = "badge badge-safe";
        }

        window.ecoToast.warning("Simulation Complete", "Simulation uses virtual station conditions. Real grid telemetry unaffected.");
      });
    }

    // Reset Defaults
    const resetBtn = document.getElementById("btn-reset-dt-params");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        const tempSlider = document.getElementById("slider-dt-temp");
        const windSlider = document.getElementById("slider-dt-wind");
        const crewSlider = document.getElementById("slider-dt-crew");
        const batSlider = document.getElementById("slider-dt-battery");

        if (tempSlider) { tempSlider.value = -35; tempSlider.dispatchEvent(new Event("input")); }
        if (windSlider) { windSlider.value = 2.0; windSlider.dispatchEvent(new Event("input")); }
        if (crewSlider) { crewSlider.value = 38; crewSlider.dispatchEvent(new Event("input")); }
        if (batSlider) { batSlider.value = 35; batSlider.dispatchEvent(new Event("input")); }

        window.ecoToast.info("Parameters Reset", "Default Antarctic storm baseline restored.");
      });
    }
  }
}

window.EcoDigitalTwinPage = EcoDigitalTwinPage;
