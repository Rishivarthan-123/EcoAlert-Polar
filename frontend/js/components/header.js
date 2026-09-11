/**
 * EcoAlert Polar - Global Header Component
 */

class EcoHeader {
  constructor() {
    this.headerEl = document.getElementById("global-header");
    this.render();
    this.bindEvents();
    this.startClock();

    // Subscribe to state changes
    window.ecoState.subscribe("station", () => this.updateStationInfo());
    window.ecoState.subscribe("telemetry", () => this.updateTelemetryBadge());
  }

  render() {
    if (!this.headerEl) return;
    const state = window.ecoState.getState();
    const telemetry = state.telemetry || {};

    const isLive = telemetry.connected !== false;

    this.headerEl.innerHTML = `
      <!-- Left: Title & Breadcrumb -->
      <div class="header-left">
        <div class="header-breadcrumb">
          <span>EcoAlert Polar</span>
          <span>/</span>
          <span class="active-crumb" id="header-breadcrumb-current">Overview</span>
        </div>
        <h1 class="header-page-title" id="header-page-title">Polar Station Energy Overview</h1>
      </div>

      <!-- Right: Telemetry & Controls -->
      <div class="header-right">
        <!-- Telemetry Connection Badge -->
        <div id="header-telemetry-badge">
          ${isLive 
            ? `<span class="badge badge-live" title="Authoritative FastAPI Station Telemetry"><span class="status-dot live"></span> LIVE TELEMETRY</span>`
            : `<span class="badge badge-warning" title="Backend Offline - Showing Fallback State"><span class="status-dot warning"></span> BACKEND OFFLINE</span>`
          }
        </div>

        <!-- Live UTC Clock -->
        <div class="header-telemetry-item">
          <span class="telemetry-label">STATION TIME</span>
          <span class="telemetry-val" id="header-clock">
            <span class="status-dot live"></span>
            <span id="header-clock-time">14:00:12</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">UTC</span>
          </span>
        </div>

        <!-- Station Selector Dropdown -->
        <div class="station-select-wrapper">
          <select class="station-select" id="station-selector" aria-label="Select Polar Station">
            ${window.ECO_CONFIG.AVAILABLE_STATIONS.map(st => `
              <option value="${st.id}" ${st.id === (state.station?.id || "STATION-AMUNDSEN-01") ? 'selected' : ''}>${st.name}</option>
            `).join('')}
          </select>
        </div>

        <!-- Season Tag -->
        <div class="badge badge-cyan" title="Polar Night Active (0 W/m² Solar)">
          ❄ WINTER
        </div>

        <!-- Operating Mode Badge -->
        <div class="mode-badge ${(state.station?.operatingMode || "ALERT")}" id="header-mode-badge" title="Station Grid Condition">
          <span class="status-dot ${(state.station?.operatingMode === 'NORMAL' ? 'live' : state.station?.operatingMode === 'ALERT' ? 'warning' : 'critical')}"></span>
          <span id="header-mode-text">${state.station?.operatingMode || "ALERT"}</span>
        </div>

        <!-- Operator Profile -->
        <div class="operator-profile">
          <div class="operator-avatar" title="${state.station?.operator?.clearance || 'Level 4 Clearance'}">
            ${state.station?.operator?.avatar || 'EV'}
          </div>
          <div class="operator-info">
            <span class="operator-name">${state.station?.operator?.name || 'Cmdr. Elena Vance'}</span>
            <span class="operator-role">${state.station?.operator?.role || 'Lead Energy Officer'}</span>
          </div>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button class="mobile-menu-btn" id="mobile-menu-toggle" aria-label="Toggle navigation drawer">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }

  bindEvents() {
    const selector = document.getElementById("station-selector");
    if (selector) {
      selector.addEventListener("change", async (e) => {
        const stationId = e.target.value;
        const found = window.ECO_CONFIG.AVAILABLE_STATIONS.find(s => s.id === stationId);
        const profile = window.ECO_CONFIG.STATION_PROFILES?.[stationId];

        if (!found) return;

        // Show loading toast
        if (window.ecoToast) {
          window.ecoToast.info("Switching Station", `Loading telemetry for ${found.name}…`);
        }

        // Disable selector during transition
        selector.disabled = true;

        try {
          // 1. Push the new station's full telemetry profile to the backend
          if (profile && window.ECO_API && typeof window.ECO_API.updateStationTelemetry === "function") {
            await window.ECO_API.updateStationTelemetry(profile);
          }

          // 2. Fetch the now-updated backend state and sync to frontend store
          if (window.ECO_API && typeof window.ECO_API.getStationState === "function") {
            const data = await window.ECO_API.getStationState();
            if (data && window.ecoState && typeof window.ecoState.setStationTelemetry === "function") {
              window.ecoState.setStationTelemetry(data);
            }
          }

          // 3. Re-run AI + risk predictions against the new telemetry
          if (window.ECO_API) {
            try {
              const [demand, renewable, risk] = await Promise.all([
                window.ECO_API.getDemandPrediction("1h", "current"),
                window.ECO_API.getRenewablePrediction("all", "1h"),
                window.ECO_API.getCrisisPrediction()
              ]);

              window.ecoState.setState(prev => ({
                ...prev,
                energy: {
                  ...prev.energy,
                  predictedDemand: demand.predictedDemandKw,
                  renewableForecast: renewable.forecastGenerationKw
                },
                risk: {
                  ...prev.risk,
                  level: risk.level || "NORMAL",
                  score: risk.score || 0,
                  reasons: risk.reasons || [],
                  warnings: risk.warnings || [],
                  recommendedActions: risk.recommendedActions || [],
                  crisisPredicted: Boolean(risk.crisisPredicted)
                },
                ai: {
                  ...prev.ai,
                  demand,
                  renewable,
                  risk,
                  lastUpdated: new Date().toISOString()
                }
              }));
            } catch (aiErr) {
              console.warn("AI re-prediction after station switch failed:", aiErr);
            }
          }

          // 4. Update the header station info display
          this.updateStationInfo();

          if (window.ecoToast) {
            window.ecoToast.success(
              "Station Switched",
              `Now monitoring ${found.name}. All telemetry, KPIs, and AI predictions refreshed.`
            );
          }

        } catch (err) {
          console.error("Station switch failed:", err);
          if (window.ecoToast) {
            window.ecoToast.warning("Station Switch Warning", "Telemetry may be partially updated. Check backend connection.");
          }
        } finally {
          selector.disabled = false;
        }
      });
    }
  }

  updateTitle(title, pageName) {
    const titleEl = document.getElementById("header-page-title");
    const breadcrumbEl = document.getElementById("header-breadcrumb-current");
    if (titleEl) titleEl.textContent = title;
    if (breadcrumbEl) breadcrumbEl.textContent = pageName;
  }

  updateStationInfo() {
    const state = window.ecoState.getState();
    const selector = document.getElementById("station-selector");
    if (selector && state.station?.id) {
      selector.value = state.station.id;
    }
    const modeBadge = document.getElementById("header-mode-badge");
    const modeText = document.getElementById("header-mode-text");
    if (modeBadge && modeText) {
      const mode = state.station?.operatingMode || "ALERT";
      modeBadge.className = `mode-badge ${mode}`;
      const dot = modeBadge.querySelector(".status-dot");
      if (dot) {
        dot.className = `status-dot ${mode === "NORMAL" ? "live" : mode === "ALERT" ? "warning" : "critical"}`;
      }
      modeText.textContent = mode;
    }

    // Update operator profile block
    const nameEl = modeBadge ? modeBadge.closest(".header-right")?.querySelector(".operator-name") : null;
    const roleEl = modeBadge ? modeBadge.closest(".header-right")?.querySelector(".operator-role") : null;
    const avatarEl = modeBadge ? modeBadge.closest(".header-right")?.querySelector(".operator-avatar") : null;

    if (nameEl) nameEl.textContent = state.station?.operator?.name || "Cmdr. Elena Vance";
    if (roleEl) roleEl.textContent = state.station?.operator?.role || "Lead Energy Officer";
    if (avatarEl) avatarEl.textContent = state.station?.operator?.avatar || "EV";

    // Update station context strip station code label
    const ctxStation = document.getElementById("ctx-station");
    if (ctxStation) ctxStation.textContent = state.station?.code || "POLAR-MAIN";
  }

  updateTelemetryBadge() {
    const state = window.ecoState.getState();
    const container = document.getElementById("header-telemetry-badge");
    if (!container) return;

    const isLive = state.telemetry?.connected !== false;
    container.innerHTML = isLive 
      ? `<span class="badge badge-live" title="Authoritative FastAPI Station Telemetry"><span class="status-dot live"></span> LIVE TELEMETRY</span>`
      : `<span class="badge badge-warning" title="Backend Offline - Showing Fallback State"><span class="status-dot warning"></span> BACKEND OFFLINE</span>`;
  }

  startClock() {
    const clockEl = document.getElementById("header-clock-time");
    setInterval(() => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");
      if (clockEl) {
        clockEl.textContent = `${hours}:${minutes}:${seconds}`;
      }
    }, 1000);
  }
}

window.EcoHeader = EcoHeader;
