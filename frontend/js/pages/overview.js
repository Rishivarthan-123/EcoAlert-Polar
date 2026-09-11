/**
 * EcoAlert Polar - Overview Page Controller
 *
 * Uses the backend Station Telemetry API as the primary source
 * for live station values and the AI services for intelligence.
 */

class EcoOverviewPage {
  constructor() {
    this.initialized = false;
    this.syncInProgress = false;
  }

  async mount() {
    this.render();
    this.bindEvents();

    this.initialized = true;

    // Load authoritative backend telemetry and AI intelligence.
    await this.syncBackendState();
  }

  render() {
    // 1. Render dynamic health/risk banner
    const bannerContainer = document.getElementById("overview-risk-banner");
    if (bannerContainer && window.ecoAlerts) {
      window.ecoAlerts.renderStationBanner(bannerContainer);
    }

    // 2. Render Alert List
    const alertContainer = document.getElementById("overview-alert-list");
    if (alertContainer && window.ecoAlerts) {
      window.ecoAlerts.renderAlertList(alertContainer);
    }

    // 3. Update KPIs & Energy Bus & AI Intelligence
    this.updateKPIs();
    this.updateEnergyBus();
    this.updateAIIntelligence();

    // 4. Render Charts
    requestAnimationFrame(() => {
      if (window.renderDemandChart) {
        window.renderDemandChart("overview-demand-chart");
      }
      if (window.renderSupplyDemandChart) {
        window.renderSupplyDemandChart("overview-supply-demand-chart");
      }
      if (window.renderBatteryChart) {
        window.renderBatteryChart("overview-battery-chart");
      }
    });
  }

  updateEnergyBus() {
    const state = window.ecoState.getState();
    const energy = state.energy || {};
    const battery = energy.battery || {};
    const generator = energy.generator || {};

    const renEl = document.getElementById("bus-val-renewable");
    const windEl = document.getElementById("bus-val-wind");
    const solarEl = document.getElementById("bus-val-solar");
    const totalEl = document.getElementById("bus-val-total");
    const demEl = document.getElementById("bus-val-demand");
    const batEl = document.getElementById("bus-val-battery");
    const genEl = document.getElementById("bus-val-generator");

    const renewable = Number(energy.renewableGeneration ?? 25.0).toFixed(1);
    const wind = Number(energy.windGeneration ?? 25.0).toFixed(1);
    const solar = Number(energy.solarGeneration ?? 0.0).toFixed(1);
    const demand = Number(energy.currentDemand ?? 90.0).toFixed(1);
    const discharge = Number(battery.dischargeRateKw ?? 65.0).toFixed(1);

    if (renEl) renEl.textContent = `${renewable} kW`;
    if (windEl) windEl.textContent = `${wind} kW`;
    if (solarEl) solarEl.textContent = `${solar} kW`;
    if (totalEl) totalEl.textContent = `${renewable} kW`;
    if (demEl) demEl.textContent = `${demand} kW`;
    if (batEl) batEl.textContent = `-${discharge} kW`;
    if (genEl) {
      const status = generator.status || "AVAILABLE";
      genEl.textContent = status;
      genEl.className = status === "RUNNING" ? "badge badge-critical" : "badge badge-safe";
    }
  }

  updateAIIntelligence() {
    const state = window.ecoState.getState();
    const energy = state.energy || {};
    const risk = state.risk || {};
    const ai = state.ai || {};

    const predDemEl = document.getElementById("ai-val-pred-demand");
    const predRenEl = document.getElementById("ai-val-pred-ren");
    const balanceEl = document.getElementById("ai-val-balance");
    const anomalyEl = document.getElementById("ai-val-anomaly");
    const riskEl = document.getElementById("ai-val-risk");
    const recEl = document.getElementById("ai-val-recommendation");

    const pDemand = Number(energy.predictedDemand ?? 108.0).toFixed(1);
    const pRenewable = Number(energy.renewableForecast ?? 22.0).toFixed(1);
    const balance = (pRenewable - pDemand).toFixed(1);
    const isAnomaly = ai.anomaly?.isAnomaly ?? false;
    const riskLevel = String(risk.level || "HIGH").toUpperCase();

    if (predDemEl) predDemEl.textContent = `${pDemand} kW`;
    if (predRenEl) predRenEl.textContent = `${pRenewable} kW`;
    if (balanceEl) {
      balanceEl.textContent = `${balance} kW`;
      balanceEl.style.color = Number(balance) < 0 ? "var(--critical-red)" : "var(--success-aurora)";
    }
    if (anomalyEl) {
      anomalyEl.textContent = isAnomaly ? "DETECTED" : "NOMINAL";
      anomalyEl.className = isAnomaly ? "badge badge-critical" : "badge badge-safe";
    }
    if (riskEl) {
      riskEl.textContent = riskLevel;
      riskEl.className = riskLevel === "CRITICAL" ? "badge badge-critical" : (riskLevel === "HIGH" ? "badge badge-high" : "badge badge-warning");
    }
    if (recEl) {
      const recs = risk.recommendedActions || [];
      recEl.textContent = recs.length > 0 ? recs.join(" + ") : "Continue normal monitoring and balance loads.";
    }
  }

  async syncBackendState() {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      if (!window.ECO_API) throw new Error("ECO_API is not available.");

      const stationState = await window.ECO_API.getStationState();
      const demandPrediction = await window.ECO_API.getDemandPrediction("1h", "current");
      const renewablePrediction = await window.ECO_API.getRenewablePrediction("all", "1h");
      const riskPrediction = await window.ECO_API.getCrisisPrediction();

      const backendStation = stationState.station || {};
      const environment = stationState.environment || {};
      const backendEnergy = stationState.energy || {};
      const backendBattery = backendEnergy.battery || {};
      const backendGenerator = backendEnergy.generator || {};
      const occupancy = stationState.occupancy || {};
      const backendLoads = Array.isArray(stationState.loads) ? stationState.loads : [];

      const currentState = window.ecoState.getState();
      const currentEnergy = currentState.energy || {};

      const updatedLoads = backendLoads.map(load => ({
        ...load,
        name: load.name || "Unnamed Load",
        type: load.type || "Facility",
        powerKw: Number(load.powerKw || 0),
        currentPriority: load.priority || "NON-CRITICAL",
        recommendedPriority: load.priority || "NON-CRITICAL",
        action: load.priority === "CRITICAL" ? "PROTECT" : (load.canShed ? "REDUCE" : "MAINTAIN"),
        reason: load.reason || (load.critical
          ? "Critical station service must remain protected."
          : (load.canShed ? "Load can be reduced during energy shortage." : "Essential station service should remain active."))
      }));

      const currentDemand = Number(backendEnergy.currentDemand ?? currentEnergy.currentDemand ?? 90);
      const renewableGeneration = Number(backendEnergy.renewableGeneration ?? currentEnergy.renewableGeneration ?? 25);
      const predictedDemand = Number(demandPrediction.predictedDemandKw ?? currentEnergy.predictedDemand ?? 108);
      const predictedRenewable = Number(renewablePrediction.forecastGenerationKw ?? currentEnergy.renewableForecast ?? 22);
      const energyBalance = renewableGeneration - currentDemand;

      window.ecoState.setState(prev => ({
        ...prev,

        station: {
          ...(prev.station || {}),
          ...backendStation,
          operator: backendStation.operator || prev.station?.operator
        },

        environment: {
          ...(prev.environment || {}),
          ...environment
        },

        occupancy: {
          ...(typeof prev.occupancy === "object" ? prev.occupancy : {}),
          ...occupancy,
          current: Number(occupancy.current ?? 15)
        },

        energy: {
          ...currentEnergy,
          currentDemand,
          nominalDemand: Number(backendEnergy.nominalDemand ?? currentEnergy.nominalDemand ?? 75),
          renewableGeneration,
          windGeneration: Number(backendEnergy.windGeneration ?? 25),
          solarGeneration: Number(backendEnergy.solarGeneration ?? 0),
          predictedDemand,
          renewableForecast: predictedRenewable,
          energyBalance,

          battery: {
            ...(currentEnergy.battery || {}),
            soc: Number(backendBattery.soc ?? 35),
            capacityKwh: Number(backendBattery.capacityKwh ?? 500),
            availableKwh: Number(backendBattery.availableKwh ?? 175),
            health: Number(backendBattery.health ?? 96),
            chargeRateKw: Number(backendBattery.chargeRateKw ?? 0),
            dischargeRateKw: Number(backendBattery.dischargeRateKw ?? 65),
            minSafeBuffer: Number(backendBattery.minSafeBuffer ?? 20)
          },

          generator: {
            ...(currentEnergy.generator || {}),
            status: backendGenerator.status || "AVAILABLE",
            capacityKw: Number(backendGenerator.capacityKw ?? 150),
            fuelReservePercent: Number(backendGenerator.fuelReservePercent ?? 82),
            fuelDaysRemaining: Number(backendGenerator.fuelDaysRemaining ?? 18.5),
            autoStartThresholdSoc: Number(backendGenerator.autoStartThresholdSoc ?? 15)
          },

          survivalTimeHours: backendEnergy.survivalTimeHours ?? currentEnergy.survivalTimeHours ?? 8.0,
          batteryOnlySurvivalHours: backendEnergy.batteryOnlySurvivalHours ?? currentEnergy.batteryOnlySurvivalHours ?? 2.7
        },

        loads: updatedLoads.length > 0 ? updatedLoads : (Array.isArray(prev.loads) ? prev.loads : []),

        risk: {
          ...(prev.risk || {}),
          level: riskPrediction.level || "NORMAL",
          score: Number(riskPrediction.score ?? 0),
          riskLevel: riskPrediction.riskLevel || riskPrediction.level?.toLowerCase() || "normal",
          reasons: riskPrediction.reasons || [],
          warnings: riskPrediction.warnings || [],
          recommendedActions: riskPrediction.recommendedActions || [],
          crisisPredicted: Boolean(riskPrediction.crisisPredicted)
        },

        telemetry: {
          ...(prev.telemetry || {}),
          connected: stationState.telemetry?.connected ?? true,
          source: stationState.telemetry?.source || "LIVE_BACKEND_TELEMETRY",
          lastUpdated: stationState.telemetry?.lastUpdated || new Date().toISOString()
        },

        ai: {
          ...(prev.ai || {}),
          demand: demandPrediction,
          renewable: renewablePrediction,
          risk: riskPrediction,
          lastUpdated: new Date().toISOString()
        }
      }));

      // Re-render UI
      this.updateKPIs();
      this.updateEnergyBus();
      this.updateAIIntelligence();

      const banner = document.getElementById("overview-risk-banner");
      if (banner && window.ecoAlerts) {
        window.ecoAlerts.renderStationBanner(banner);
      }

      requestAnimationFrame(() => {
        if (window.renderDemandChart) window.renderDemandChart("overview-demand-chart");
        if (window.renderSupplyDemandChart) window.renderSupplyDemandChart("overview-supply-demand-chart");
        if (window.renderBatteryChart) window.renderBatteryChart("overview-battery-chart");
      });

    } catch (error) {
      console.error("Overview backend synchronization failed:", error);
      if (window.ecoToast && typeof window.ecoToast.warning === "function") {
        window.ecoToast.warning(
          "Telemetry Sync Warning",
          "Backend telemetry is temporarily unavailable. Showing last cached station state."
        );
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  updateKPIs() {
    const state = window.ecoState.getState();
    const energy = state.energy || {};
    const risk = state.risk || {};
    const battery = energy.battery || {};

    const demandEl = document.getElementById("kpi-current-demand");
    const predEl = document.getElementById("kpi-predicted-demand");
    const renNowEl = document.getElementById("kpi-renewable-now");
    const renForeEl = document.getElementById("kpi-renewable-forecast");
    const batEl = document.getElementById("kpi-battery-soc");
    const survEl = document.getElementById("kpi-survival-time");
    const riskEl = document.getElementById("kpi-energy-risk");

    if (demandEl) demandEl.textContent = Number(energy.currentDemand ?? 90).toFixed(1);
    if (predEl) predEl.textContent = Number(energy.predictedDemand ?? 108).toFixed(1);
    if (renNowEl) renNowEl.textContent = Number(energy.renewableGeneration ?? 25).toFixed(1);
    if (renForeEl) renForeEl.textContent = Number(energy.renewableForecast ?? 22).toFixed(1);
    if (batEl) batEl.textContent = Number(battery.soc ?? 35).toFixed(0);
    if (survEl) survEl.textContent = `~${energy.survivalTimeHours ?? 8.0}`;

    if (riskEl) {
      const level = String(risk.level || "NORMAL").toUpperCase();
      riskEl.textContent = level;
      if (level === "CRITICAL") riskEl.style.color = "var(--critical-red)";
      else if (level === "HIGH") riskEl.style.color = "#FF8557";
      else if (level === "WARNING") riskEl.style.color = "var(--warning-amber)";
      else riskEl.style.color = "var(--success-aurora)";
    }
  }

  bindEvents() {
    const refreshBtn = document.getElementById("btn-refresh-overview");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", async () => {
        if (this.syncInProgress) return;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
            <path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3"/><path d="M22 12.5a10 10 0 0 1-18.8 4.3"/>
          </svg>
          Syncing...
        `;
        try {
          await this.syncBackendState();
          if (window.ecoToast && typeof window.ecoToast.success === "function") {
            window.ecoToast.success("Telemetry Synced", "Polar station telemetry and AI models have been refreshed.");
          }
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6"/><path d="M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3"/><path d="M22 12.5a10 10 0 0 1-18.8 4.3"/>
            </svg>
            Sync Telemetry
          `;
        }
      });
    }

    window.ecoState.subscribe("energy", () => {
      this.updateKPIs();
      this.updateEnergyBus();
      this.updateAIIntelligence();
    });

    window.ecoState.subscribe("timeline", () => {
      requestAnimationFrame(() => {
        if (window.renderDemandChart) window.renderDemandChart("overview-demand-chart");
        if (window.renderSupplyDemandChart) window.renderSupplyDemandChart("overview-supply-demand-chart");
        if (window.renderBatteryChart) window.renderBatteryChart("overview-battery-chart");
      });
    });

    window.ecoState.subscribe("station", () => {
      this.updateKPIs();
      this.updateEnergyBus();
      this.updateAIIntelligence();
    });

    window.ecoState.subscribe("risk", () => {
      this.updateKPIs();
      this.updateAIIntelligence();
      const bannerContainer = document.getElementById("overview-risk-banner");
      if (bannerContainer && window.ecoAlerts) {
        window.ecoAlerts.renderStationBanner(bannerContainer);
      }
    });
  }
}

window.EcoOverviewPage = EcoOverviewPage;