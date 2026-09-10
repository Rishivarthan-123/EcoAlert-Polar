/**
 * EcoAlert Polar - API Abstraction Layer
 *
 * Connects the EcoAlert Polar frontend to the FastAPI backend.
 * Backend: http://127.0.0.1:8000
 */

window.ECO_API = {

  // ---------------------------------------------------------
  // BACKEND CONFIGURATION
  // ---------------------------------------------------------

  BASE_URL: (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin.includes("http"))
    ? window.location.origin
    : "http://127.0.0.1:8000",

  _url(path) {
    return `${this.BASE_URL}${path}`;
  },

  async _get(path) {
    const response = await fetch(this._url(path), {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      let detail = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) detail = errorData.detail;
      } catch (_) {}
      throw new Error(detail);
    }

    return response.json();
  },

  async _post(path, payload) {
    const response = await fetch(this._url(path), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let detail = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) detail = errorData.detail;
      } catch (_) {}
      throw new Error(detail);
    }

    return response.json();
  },

  async _delete(path) {
    const response = await fetch(this._url(path), {
      method: "DELETE",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      let detail = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) detail = errorData.detail;
      } catch (_) {}
      throw new Error(detail);
    }

    return response.json();
  },

  // ---------------------------------------------------------
  // FRONTEND STATE HELPERS
  // ---------------------------------------------------------

  _getState() {
    if (window.ecoState && typeof window.ecoState.getState === "function") {
      return window.ecoState.getState();
    }
    return {};
  },

  async _getStationTelemetry() {
    try {
      const response = await this._get("/api/station/state");
      return response.station || {};
    } catch (error) {
      console.warn("Station telemetry API unavailable. Using fallback state:", error);
      return this._getState();
    }
  },

  async _buildEnergyInput() {
    const state = await this._getStationTelemetry();

    const environment = state.environment || {};
    const energy = state.energy || {};
    const station = state.station || {};
    const loads = Array.isArray(state.loads) ? state.loads : [];
    const now = new Date();

    const hour = Number.isFinite(Number(environment.hour)) ? Number(environment.hour) : now.getHours();
    const dayOfWeek = Number.isFinite(Number(environment.day_of_week))
      ? Number(environment.day_of_week)
      : (Number.isFinite(Number(environment.dayOfWeek)) ? Number(environment.dayOfWeek) : now.getDay());
    const month = Number.isFinite(Number(environment.month)) ? Number(environment.month) : (now.getMonth() + 1);

    const temperature = Number(environment.temperature ?? environment.temp ?? -20);
    const feelsLike = Number(environment.feelsLike ?? environment.feels_like ?? temperature);
    const windSpeed = Number(environment.windSpeed ?? environment.wind_speed ?? 9.2);
    const solarRadiation = Number(environment.solarRadiation ?? environment.solar_radiation ?? 0);

    const occupancy = Number(
      typeof state.occupancy === "object"
        ? (state.occupancy.current ?? 15)
        : (state.occupancy ?? station.occupancy ?? 15)
    );

    const currentDemand = Number(energy.currentDemand ?? energy.current_demand ?? 90);
    const nominalDemand = Number(energy.nominalDemand ?? energy.nominal_demand ?? 75);

    const windGeneration = Number(energy.windGeneration ?? energy.wind_generation ?? energy.wind ?? 25);
    const solarGeneration = Number(energy.solarGeneration ?? energy.solar_generation ?? energy.solar ?? 0);
    const renewableGeneration = Number(
      energy.renewableGeneration ?? energy.renewable_generation ?? energy.renewable ?? (windGeneration + solarGeneration)
    );

    const battery = energy.battery || {};
    const generator = energy.generator || {};

    const batterySoc = Number(energy.batterySoc ?? energy.batterySOC ?? energy.battery_soc ?? battery.soc ?? 35);
    const batteryAvailableKwh = Number(
      energy.batteryAvailableKwh ?? energy.batteryAvailableKWh ?? energy.batteryCapacityKwh ?? battery.availableKwh ?? 175
    );
    const batteryHealth = Number(energy.batteryHealth ?? energy.battery_health ?? battery.health ?? 96);
    const batteryChargeRateKw = Number(energy.batteryChargeRateKw ?? energy.batteryChargeRate ?? battery.chargeRateKw ?? 0);
    const batteryDischargeRateKw = Number(energy.batteryDischargeRateKw ?? energy.batteryDischargeRate ?? battery.dischargeRateKw ?? 65);

    const generatorCapacityKw = Number(energy.generatorCapacityKw ?? energy.generatorCapacity ?? generator.capacityKw ?? 150);
    const fuelReservePercent = Number(energy.fuelReservePercent ?? energy.fuelReserve ?? generator.fuelReservePercent ?? 82);
    const fuelDaysRemaining = Number(energy.fuelDaysRemaining ?? energy.fuelDays ?? generator.fuelDaysRemaining ?? 18.5);

    const energyBalanceKw = Number(energy.energyBalanceKw ?? energy.energyBalance ?? (renewableGeneration - currentDemand));

    const getLoadPower = (ids, fallbackNames = []) => {
      const found = loads.find(load => {
        const loadId = String(load.id || "").toLowerCase();
        const loadName = String(load.name || "").toLowerCase();
        return (
          ids.some(id => loadId === String(id).toLowerCase()) ||
          fallbackNames.some(name => loadName.includes(String(name).toLowerCase()))
        );
      });
      return Number(found?.powerKw ?? 0);
    };

    const heatingLoadKw = getLoadPower(["load-heating-01"], ["heating"]) || 35;
    const laboratoryLoadKw = getLoadPower(["load-laboratory"], ["laboratory"]) || 25;
    const lightingLoadKw = getLoadPower(["load-lighting"], ["lighting"]) || 12;
    const auxiliaryLoadKw = getLoadPower(["load-auxiliary"], ["auxiliary"]) || 10;
    const lifeSupportLoadKw = getLoadPower(["load-life-support"], ["life support", "o2 generation", "air scrubber"]) || 8;
    const communicationLoadKw = getLoadPower(["load-comm-telemetry"], ["satellite comm", "communication", "telemetry"]) || 5;

    return {
      hour,
      day_of_week: dayOfWeek,
      month,

      temperature,
      feelsLike,
      windSpeed,
      solarRadiation,
      occupancy,

      currentDemand,
      nominalDemand,

      windGeneration,
      solarGeneration,
      renewableGeneration,

      batterySoc,
      batteryAvailableKwh,
      batteryHealth,

      batteryChargeRateKw,
      batteryDischargeRateKw,

      generatorCapacityKw,
      fuelReservePercent,
      fuelDaysRemaining,

      energyBalanceKw,

      heatingLoadKw,
      laboratoryLoadKw,
      lightingLoadKw,
      auxiliaryLoadKw,
      lifeSupportLoadKw,
      communicationLoadKw
    };
  },

  // ---------------------------------------------------------
  // STATION STATE API
  // ---------------------------------------------------------

  async getStationState() {
    try {
      const response = await this._get("/api/station/state");
      const station = response.station || {};
      return {
        station: station.station || {},
        environment: station.environment || {},
        energy: station.energy || {},
        risk: station.risk || {},
        occupancy: station.occupancy || {},
        loads: station.loads || [],
        telemetry: station.telemetry || { connected: true, source: "LIVE_BACKEND_TELEMETRY" }
      };
    } catch (error) {
      console.warn("Station telemetry unavailable. Using frontend fallback:", error);
      const state = this._getState();
      return {
        station: state.station || {},
        environment: state.environment || {},
        energy: state.energy || {},
        risk: state.risk || {},
        occupancy: state.occupancy || {},
        loads: state.loads || [],
        telemetry: { connected: false, source: "FRONTEND_FALLBACK" }
      };
    }
  },

  async updateStationTelemetry(data) {
    return this._post("/api/station/telemetry", { data });
  },

  // ---------------------------------------------------------
  // FORECAST TIMELINE API
  // ---------------------------------------------------------

  async getForecastTimeline() {
    try {
      const input = await this._buildEnergyInput();
      const response = await this._post("/api/predictions/forecast", input);
      if (response && response.forecast) {
        return response.forecast;
      }
    } catch (err) {
      console.warn("Forecast timeline API fallback:", err);
    }
    return this._getState().timeline || {};
  },

  // ---------------------------------------------------------
  // AI DEMAND PREDICTION
  // ---------------------------------------------------------

  async getDemandPrediction(horizon = "1h", scenario = "current") {
    const input = await this._buildEnergyInput();
    const response = await this._post("/api/predictions/demand", input);
    const result = response.prediction || response;
    const predictedDemand = Number(result.predictedDemandKw ?? 0);
    const timeline = await this.getForecastTimeline();

    return {
      predictedDemandKw: Math.round(predictedDemand * 100) / 100,
      peakDemandKw: Math.round(predictedDemand * 1.06 * 100) / 100,
      trend: predictedDemand > input.currentDemand ? "INCREASING" : (predictedDemand < input.currentDemand ? "DECREASING" : "STABLE"),
      horizon,
      horizonHours: result.horizonHours ?? 1,
      timestamp: new Date().toISOString(),
      scenario,
      model: result.model || "XGBoost",
      mainFactors: [
        { name: `Exterior Temp (${input.temperature}°C)`, weight: 45, impact: "Thermal heating load driver" },
        { name: "Cryo & Atmospheric Lab Core", weight: 32, impact: "Scientific freezer demand" },
        { name: "Station Occupancy & Crew Shift", weight: 23, impact: "Habitability baseline" }
      ],
      timeline
    };
  },

  // ---------------------------------------------------------
  // AI RENEWABLE PREDICTION
  // ---------------------------------------------------------

  async getRenewablePrediction(type = "all", horizon = "1h") {
    const input = await this._buildEnergyInput();
    const response = await this._post("/api/predictions/renewable", input);
    const result = response.prediction || response;
    const predictedRenewable = Number(result.predictedRenewableKw ?? 0);

    const currentRenewable = Number(input.renewableGeneration);
    const windCurrent = Number(input.windGeneration);
    const solarCurrent = Number(input.solarGeneration);
    const currentSolarRadiation = Number(input.solarRadiation);

    const windRatio = currentRenewable > 0 ? (windCurrent / currentRenewable) : 1.0;
    const solarRatio = currentRenewable > 0 ? (solarCurrent / currentRenewable) : 0.0;

    const predictedWind = predictedRenewable * windRatio;
    const predictedSolar = predictedRenewable * solarRatio;

    return {
      currentGenerationKw: Math.round(currentRenewable * 100) / 100,
      forecastGenerationKw: Math.round(predictedRenewable * 100) / 100,
      trend: predictedRenewable > currentRenewable ? "INCREASING" : (predictedRenewable < currentRenewable ? "DECREASING" : "STABLE"),
      confidenceScore: 94.2,
      horizon,
      horizonHours: result.horizonHours ?? 1,
      model: result.model || "XGBoost",
      breakdown: {
        wind: Math.round(windCurrent * 100) / 100,
        windForecast: Math.round(predictedWind * 100) / 100,
        solar: Math.round(solarCurrent * 100) / 100,
        solarForecast: Math.round(predictedSolar * 100) / 100
      },
      meteorology: {
        windSpeed: `${input.windSpeed} m/s`,
        gustProbability: "Normal",
        solarStatus: currentSolarRadiation > 0 ? `${currentSolarRadiation} W/m²` : "0 W/m² (Polar Night Darkness)"
      }
    };
  },

  // ---------------------------------------------------------
  // CRISIS & RISK
  // ---------------------------------------------------------

  async getCrisisPrediction() {
    const input = await this._buildEnergyInput();
    const response = await this._post("/api/risk/analyze", input);
    const risk = response.risk || {};
    const state = await this.getStationState();

    return {
      ...risk,
      level: (risk.riskLevel || state.risk?.level || "normal").toUpperCase(),
      score: Number(risk.riskScore ?? state.risk?.score ?? 0),
      statusText: (risk.riskLevel || "normal").toUpperCase(),
      crisisPredicted: risk.riskLevel === "critical" || risk.riskLevel === "warning",
      summary: (risk.reasons && risk.reasons.length > 0)
        ? risk.reasons.join(". ")
        : (risk.warnings && risk.warnings.length > 0 ? risk.warnings.join(". ") : "Station operating under stable energy conditions."),
      reasons: risk.reasons || [],
      warnings: risk.warnings || [],
      recommendedActions: risk.recommendedActions || []
    };
  },

  // ---------------------------------------------------------
  // LOAD MANAGEMENT
  // ---------------------------------------------------------

  async getLoadPriorities() {
    const input = await this._buildEnergyInput();
    const currentDemand = Number(input.currentDemand);
    const renewableGeneration = Number(input.renewableGeneration);
    const availablePower = Math.max(0, renewableGeneration);

    const response = await this._post("/api/loads/analyze", {
      lifeSupportLoadKw: input.lifeSupportLoadKw,
      communicationLoadKw: input.communicationLoadKw,
      laboratoryLoadKw: input.laboratoryLoadKw,
      heatingLoadKw: input.heatingLoadKw,
      lightingLoadKw: input.lightingLoadKw,
      auxiliaryLoadKw: input.auxiliaryLoadKw,
      availablePowerKw: availablePower > 0 ? availablePower : currentDemand
    });

    const management = response.loadManagement || {};
    return management.loads || [];
  },

  // ---------------------------------------------------------
  // DIGITAL TWIN
  // ---------------------------------------------------------

  async runDigitalTwin(params = {}) {
    const stateInput = await this._buildEnergyInput();

    const temperature = Number(params.temperature ?? stateInput.temperature);
    const windSpeed = Number(params.windSpeed ?? stateInput.windSpeed);
    const occupancy = Number(params.occupancy ?? stateInput.occupancy);
    const batterySoc = Number(params.batterySoc ?? stateInput.batterySoc);

    let solarGeneration = stateInput.solarGeneration;
    if (params.solarAvailability === "HIGH") {
      solarGeneration = Math.max(solarGeneration, 35);
    } else if (params.solarAvailability === "LOW") {
      solarGeneration = Math.min(solarGeneration, 2);
    }

    const response = await this._post("/api/digital-twin/simulate", {
      windGeneration: Number(params.windGeneration ?? stateInput.windGeneration),
      solarGeneration,
      generatorOutputKw: Number(params.generatorOutputKw ?? 0),
      generatorCapacityKw: stateInput.generatorCapacityKw,
      heatingLoadKw: stateInput.heatingLoadKw,
      laboratoryLoadKw: stateInput.laboratoryLoadKw,
      lightingLoadKw: stateInput.lightingLoadKw,
      auxiliaryLoadKw: stateInput.auxiliaryLoadKw,
      lifeSupportLoadKw: stateInput.lifeSupportLoadKw,
      communicationLoadKw: stateInput.communicationLoadKw,
      batterySoc,
      batteryAvailableKwh: stateInput.batteryAvailableKwh,
      batteryChargeRateKw: stateInput.batteryChargeRateKw,
      batteryDischargeRateKw: stateInput.batteryDischargeRateKw
    });

    const twin = response.digitalTwin || {};
    const generation = twin.generation || {};
    const loads = twin.loads || {};
    const energy = twin.energy || {};
    const battery = twin.battery || {};
    const generator = twin.generator || {};

    const simulatedDemand = Number(loads.totalLoadKw ?? 0);
    const simulatedRenewable = Number(generation.renewableKw ?? 0);
    const initialBalance = Number(energy.initialBalanceKw ?? 0);
    const survivalEnergy = Number(battery.energyAvailableKwh ?? 0);

    const survivalHours = Math.max(0, initialBalance) > 0
      ? "24+"
      : ((simulatedDemand - simulatedRenewable) > 0
        ? (survivalEnergy / (simulatedDemand - simulatedRenewable)).toFixed(1)
        : "24+");

    let energyRiskLevel = "SAFE";
    if (twin.stationStatus === "critical") {
      energyRiskLevel = "CRITICAL";
    } else if (twin.stationStatus === "deficit") {
      energyRiskLevel = "HIGH";
    } else if (twin.stationStatus === "battery_low") {
      energyRiskLevel = "WARNING";
    } else if (twin.stationStatus === "balanced") {
      energyRiskLevel = "SAFE";
    }

    return {
      inputs: {
        ...params,
        temperature,
        windSpeed,
        occupancy,
        batterySoc
      },
      results: {
        currentDemandKw: stateInput.currentDemand,
        simulatedDemandKw: simulatedDemand,
        demandDeltaKw: simulatedDemand - Number(stateInput.currentDemand),
        renewableKw: simulatedRenewable,
        batterySoc: Number(battery.projectedSocPercent ?? batterySoc),
        energyRiskScore: energyRiskLevel === "CRITICAL" ? 92 : (energyRiskLevel === "HIGH" ? 78 : (energyRiskLevel === "WARNING" ? 55 : 32)),
        energyRiskLevel,
        survivalHours,
        crisisEta: Number(energy.remainingDeficitKw ?? 0) > 0 ? "SHORTAGE DETECTED" : "NO CRISIS",
        recommendedAction: (twin.recommendations && twin.recommendations.length > 0)
          ? twin.recommendations[0]
          : "Maintain standard baseline operations",
        stationStatus: twin.stationStatus,
        generatorRequired: Boolean(generator.required),
        recommendedGeneratorOutputKw: Number(generator.recommendedOutputKw ?? 0),
        finalEnergyBalanceKw: Number(energy.finalBalanceKw ?? 0)
      },
      backendResponse: twin
    };
  },

  // ---------------------------------------------------------
  // SAFETY GUARDIAN & OPERATOR APPROVAL
  // ---------------------------------------------------------

  async runSafetyCheck(proposal = {}) {
    const input = await this._buildEnergyInput();
    const targetLoadId = proposal.targetLoadId || "";
    const targetLoadName = proposal.targetLoadName || "";
    const action = proposal.action || "reduce_load";

    const response = await this._post("/api/safety/evaluate", {
      riskLevel: input.currentDemand > input.renewableGeneration ? "critical" : "normal",
      action,
      currentDemandKw: input.currentDemand,
      availablePowerKw: input.renewableGeneration,
      batterySoc: input.batterySoc,
      batteryHealth: input.batteryHealth,
      fuelReservePercent: input.fuelReservePercent,
      generatorCapacityKw: input.generatorCapacityKw,
      requestedPowerKw: Number(proposal.requestedPowerKw ?? proposal.powerKw ?? 0)
    });

    const safety = response.safety || {};
    const criticalTarget = targetLoadId === "load-heating-01" ||
      targetLoadId === "load-life-support" ||
      targetLoadName.toLowerCase().includes("life support") ||
      targetLoadName.toLowerCase().includes("heating");

    return {
      ...safety,
      permitted: safety.safetyStatus !== "blocked",
      equipmentCritical: criticalTarget,
      withinSafetyLimits: safety.blockingReasons && safety.blockingReasons.length === 0,
      emergencyCondition: safety.riskLevel === "critical",
      operatorAuthorized: !safety.approvalRequired,
      approvalRequired: Boolean(safety.approvalRequired),
      finalStatus: safety.safetyStatus === "blocked" ? "BLOCKED" : (safety.approvalRequired ? "REQUIRES APPROVAL" : "PERMITTED"),
      blockedReason: (safety.blockingReasons && safety.blockingReasons.length > 0) ? safety.blockingReasons.join("; ") : ""
    };
  },

  async approveAction(actionData = {}) {
    const state = this._getState();
    const safetyResult = actionData.safety || actionData.safetyResult || {
      safetyStatus: actionData.approvalRequired ? "requires_approval" : "safe",
      approvalRequired: Boolean(actionData.approvalRequired),
      action: actionData.action || "reduce_load",
      riskLevel: state.risk?.level || "normal"
    };

    const operatorName = actionData.operatorName || state.station?.operator?.name || "Cmdr. Elena Vance";
    const notes = actionData.notes || actionData.reason || "Operator approved energy-management action.";

    const response = await this._post("/api/safety/approve", {
      safety: safetyResult,
      decision: actionData.decision || "approve",
      operatorName,
      notes
    });

    const approval = response.approval || {};

    try {
      await this._post("/api/history/logs", {
        eventType: approval.approved ? "operator_approval" : "operator_rejection",
        source: "safety-guardian",
        status: approval.approved ? "success" : "rejected",
        details: {
          action: actionData.action || safetyResult.action,
          operator: operatorName,
          notes,
          decisionStatus: approval.decisionStatus
        }
      });
    } catch (historyError) {
      console.warn("History logging failed after decision:", historyError);
    }

    if (approval.approved && window.ecoState && typeof window.ecoState.setState === "function") {
      const currentState = window.ecoState.getState();
      const currentLogs = currentState.historyLogs || [];
      const frontendLog = {
        id: `APPROVAL-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event: "Operator Action Authorized",
        category: "Safety Guardian",
        station: currentState.station?.name || "EcoAlert Polar Station",
        severity: "INFO",
        status: "APPROVED",
        details: notes,
        operator: operatorName
      };

      window.ecoState.setState(prev => ({
        ...prev,
        historyLogs: [frontendLog, ...currentLogs],
        uiState: {
          ...(prev.uiState || {}),
          pendingApprovalCount: 0
        }
      }));
    }

    return {
      success: Boolean(approval.approved),
      log: approval,
      approval
    };
  },

  // ---------------------------------------------------------
  // HISTORY / LOGS
  // ---------------------------------------------------------

  async getHistory(filters = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(filters.limit || 100));

    if (filters.category && filters.category !== "ALL") {
      params.set("event_type", filters.category);
    }

    const query = params.toString();
    try {
      const response = await this._get(`/api/history/logs?${query}`);
      let logs = response.logs || [];

      if (filters.severity && filters.severity !== "ALL") {
        logs = logs.filter(log => String(log.status || "").toUpperCase() === String(filters.severity).toUpperCase());
      }

      if (filters.search) {
        const q = String(filters.search).toLowerCase();
        logs = logs.filter(log => {
          const details = JSON.stringify(log.details || {}).toLowerCase();
          return (
            String(log.id || "").toLowerCase().includes(q) ||
            String(log.eventType || "").toLowerCase().includes(q) ||
            String(log.source || "").toLowerCase().includes(q) ||
            details.includes(q)
          );
        });
      }

      return logs.map(log => ({
        ...log,
        event: log.event || log.eventType || "System Event",
        category: log.category || log.source || "System",
        severity: log.severity || (String(log.status || "").toUpperCase() === "FAILED" ? "CRITICAL" : "INFO"),
        status: log.status || "INFO",
        details: typeof log.details === "string" ? log.details : JSON.stringify(log.details || {})
      }));
    } catch (err) {
      console.warn("History API offline. Falling back to local state:", err);
      const state = this._getState();
      return state.historyLogs || [];
    }
  },

  // ---------------------------------------------------------
  // HEALTH CHECKS
  // ---------------------------------------------------------

  async getBackendHealth() { return this._get("/health"); },
  async getStationHealth() { return this._get("/api/station/health"); },
  async getAIHealth() { return this._get("/api/predictions/health"); },
  async getRiskHealth() { return this._get("/api/risk/health"); },
  async getLoadHealth() { return this._get("/api/loads/analyze"); },
  async getDigitalTwinHealth() { return this._get("/api/digital-twin/health"); },
  async getSafetyHealth() { return this._get("/api/safety/health"); },
  async getHistoryHealth() { return this._get("/api/history/health"); }
};