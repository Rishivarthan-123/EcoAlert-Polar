/**
 * EcoAlert Polar - Centralized Reactive State Store
 * Single Source of Truth for station telemetry, intelligence & simulations
 *
 * The backend Station Telemetry API is the authoritative source for
 * live station values. ECO_DEMO_DATA is retained only as a safe
 * initial/fallback state until backend telemetry is available.
 */

class EcoStateStore {

  constructor() {
    const baseline = window.ECO_DEMO_DATA || {};

    // Deep clone initial state
    this.state = JSON.parse(JSON.stringify(baseline));

    // Telemetry metadata
    this.state.telemetry = {
      connected: false,
      source: "INITIAL_FALLBACK_STATE",
      lastUpdated: new Date().toISOString()
    };

    // AI state
    this.state.ai = {
      demand: null,
      renewable: null,
      anomaly: null,
      risk: null,
      lastUpdated: null
    };

    // UI & Flow State
    this.state.uiState = {
      activePage: "overview",
      isSidebarOpen: false,
      isSimulationActive: false,
      pendingApprovalCount: 1,
      lastTickTime: new Date().toISOString()
    };

    // Digital Twin Simulator Parameters
    this.state.digitalTwin = {
      isSimulated: false,
      inputs: {
        temperature: -35,
        windSpeed: 2.0,
        solarAvailability: "LOW",
        occupancy: 38,
        researchActivity: "HIGH",
        batterySoc: 35,
        generatorStatus: "AVAILABLE",
        equipmentFault: "NONE",
        renewableOverride: 12
      },
      results: null
    };

    // Safety Guardian State
    this.state.safety = {
      currentProposal: {
        id: "PROP-904",
        source: "CRISIS_RECOMMENDATION",
        title: "Delay Auxiliary Equipment (10 kW) & Reduce Lighting 50% (6 kW)",
        targetLoadId: "load-auxiliary",
        actionType: "DELAY_2H",
        expectedSavingKw: 16,
        equipmentCritical: false,
        withinSafetyLimits: true,
        emergencyCondition: false,
        operatorAuthorized: true,
        approvalRequired: true,
        finalStatus: "PERMITTED",
        blockedReason: ""
      },
      actionStatus: "PENDING_APPROVAL"
    };

    // Subscriptions Map
    this.listeners = new Map();
  }

  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    return () => {
      if (this.listeners.has(key)) {
        this.listeners.get(key).delete(callback);
      }
    };
  }

  notify(key, data) {
    if (this.listeners.has(key)) {
      this.listeners.get(key).forEach(callback => {
        try {
          callback(data, this.state);
        } catch (error) {
          console.error("Subscriber error:", error);
        }
      });
    }

    if (this.listeners.has("*")) {
      this.listeners.get("*").forEach(callback => {
        try {
          callback(this.state);
        } catch (error) {
          console.error("Global subscriber error:", error);
        }
      });
    }
  }

  getState(key) {
    if (!key) return this.state;
    return this.state[key];
  }

  setState(updater, key = "*") {
    if (typeof updater === "function") {
      this.state = updater(this.state);
    } else if (typeof updater === "object" && updater !== null) {
      this.state = {
        ...this.state,
        ...updater
      };
    }
    this.notify(key, this.state);
  }

  updateSlice(sliceKey, partial) {
    this.state[sliceKey] = {
      ...(this.state[sliceKey] || {}),
      ...partial
    };
    this.notify(sliceKey, this.state[sliceKey]);
    this.notify("*", this.state);
  }

  /**
   * Recalculate dynamic timeline points from current state & AI models.
   */
  _recalculateTimeline() {
    const energy = this.state.energy || {};
    const battery = energy.battery || {};

    const demand = Number(energy.currentDemand ?? 90);
    const pDemand = Number(energy.predictedDemand ?? 108);
    const ren = Number(energy.renewableGeneration ?? 25);
    const pRen = Number(energy.renewableForecast ?? 22);
    const wind = Number(energy.windGeneration ?? ren);
    const solar = Number(energy.solarGeneration ?? 0);
    const soc = Number(battery.soc ?? 35);
    const generatorStatus = energy.generator?.status || "AVAILABLE";

    // Build responsive 6-hour timeline
    const hours = ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"];
    const actualDemand = [demand, null, null, null, null, null, null];

    const predictedDemand = [
      demand,
      pDemand,
      Math.round(pDemand * 1.06),
      Math.round(pDemand * 1.03),
      Math.round(pDemand * 0.96),
      Math.round(pDemand * 0.91),
      Math.round(pDemand * 0.85)
    ];

    const availableSupply = [
      ren + (soc > 20 ? 50 : (generatorStatus === "RUNNING" ? 80 : 0)),
      pRen + (soc > 20 ? 50 : (generatorStatus === "RUNNING" ? 80 : 0)),
      Math.round(pRen * 0.9) + (soc > 20 ? 45 : (generatorStatus === "RUNNING" ? 75 : 0)),
      Math.round(pRen * 0.85) + 40,
      Math.round(pRen * 0.9) + 40,
      Math.round(pRen * 1.0) + 45,
      Math.round(pRen * 1.1) + 50
    ];

    const windGeneration = [
      wind,
      Math.round(wind * 0.92),
      Math.round(wind * 0.84),
      Math.round(wind * 0.76),
      Math.round(wind * 0.88),
      Math.round(wind * 0.95),
      Math.round(wind * 1.05)
    ];

    const solarGeneration = [
      solar,
      Math.round(solar * 1.1),
      Math.round(solar * 1.2),
      Math.round(solar * 1.0),
      Math.round(solar * 0.5),
      0,
      0
    ];

    const renewableForecast = [
      ren,
      pRen,
      Math.round(pRen * 0.9),
      Math.round(pRen * 0.85),
      Math.round(pRen * 0.9),
      Math.round(pRen * 1.0),
      Math.round(pRen * 1.1)
    ];

    // Dynamic battery SOC curve
    let bSoc = soc;
    const batterySocForecast = [bSoc];
    for (let i = 1; i < hours.length; i++) {
      const net = renewableForecast[i] - predictedDemand[i];
      if (net < 0) {
        bSoc = Math.max(0, bSoc - Math.round(Math.abs(net) * 0.12));
      } else {
        bSoc = Math.min(100, bSoc + Math.round(net * 0.08));
      }
      batterySocForecast.push(bSoc);
    }

    // Dynamic risk timeline step labels based on deficit calculation
    const maxDeficit = Math.max(0, ...predictedDemand.map((d, idx) => d - availableSupply[idx]));
    const mode = this.state.station?.operatingMode || "NORMAL";

    this.state.timeline = {
      hours,
      actualDemand,
      predictedDemand,
      peakDemandLine: Array(7).fill(Math.round(Math.max(...predictedDemand) + 7)),
      availableSupply,
      renewableForecast,
      windGeneration,
      solarGeneration,
      batterySocForecast,
      riskTimeline: [
        { step: "NOW", time: "14:00", level: mode === "CRITICAL" ? "CRITICAL" : "WARNING", label: `Current Grid State (${demand} kW)` },
        { step: "+30m", time: "14:30", level: pDemand > demand ? "HIGH" : "SAFE", label: `Demand Trend: ${pDemand} kW` },
        { step: "+1h", time: "15:00", level: wind < 20 ? "HIGH" : "SAFE", label: `Wind Array Output ${wind} kW` },
        { step: "+1.5h", time: "15:30", level: maxDeficit > 0 ? "CRITICAL" : "SAFE", label: maxDeficit > 0 ? `Deficit Gap ${maxDeficit} kW` : "Supply Reserves Stable" },
        { step: "+2h", time: "16:00", level: batterySocForecast[2] < 20 ? "SHORTAGE" : "SAFE", label: `Battery Buffer ${batterySocForecast[2]}%` }
      ]
    };
  }

  setStationTelemetry(stationState) {
    if (!stationState || typeof stationState !== "object") return;

    const previous = this.state;

    this.state = {
      ...previous,

      station: stationState.station || previous.station || {},
      environment: stationState.environment || previous.environment || {},
      energy: stationState.energy || previous.energy || {},
      occupancy: stationState.occupancy ?? previous.occupancy ?? {},
      loads: Array.isArray(stationState.loads) ? stationState.loads : (previous.loads || []),

      telemetry: {
        connected: stationState.telemetry?.connected ?? true,
        source: stationState.telemetry?.source || "LIVE_BACKEND_TELEMETRY",
        lastUpdated: stationState.telemetry?.lastUpdated || new Date().toISOString()
      }
    };

    this._recalculateTimeline();

    this.notify("station", this.state.station);
    this.notify("environment", this.state.environment);
    this.notify("energy", this.state.energy);
    this.notify("occupancy", this.state.occupancy);
    this.notify("loads", this.state.loads);
    this.notify("telemetry", this.state.telemetry);
    this.notify("timeline", this.state.timeline);
    this.notify("*", this.state);
  }

  setAIState(aiData) {
    if (!aiData || typeof aiData !== "object") return;

    this.state.ai = {
      ...(this.state.ai || {}),
      ...aiData,
      lastUpdated: new Date().toISOString()
    };

    this._recalculateTimeline();

    this.notify("ai", this.state.ai);
    this.notify("timeline", this.state.timeline);
    this.notify("*", this.state);
  }

  markTelemetryOffline() {
    this.state.telemetry = {
      ...(this.state.telemetry || {}),
      connected: false,
      source: "FRONTEND_FALLBACK",
      lastUpdated: new Date().toISOString()
    };

    this.notify("telemetry", this.state.telemetry);
    this.notify("*", this.state);
  }
}

// Instantiate global singleton
window.ecoState = new EcoStateStore();