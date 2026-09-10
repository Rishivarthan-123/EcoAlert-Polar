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
      selector.addEventListener("change", (e) => {
        const found = window.ECO_CONFIG.AVAILABLE_STATIONS.find(s => s.id === e.target.value);
        if (found) {
          window.ecoState.updateSlice("station", { name: found.name, id: found.id });
          if (window.ecoToast) window.ecoToast.info("Station Changed", `Switched monitoring telemetry to ${found.name}.`);
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
    const modeBadge = document.getElementById("header-mode-badge");
    const modeText = document.getElementById("header-mode-text");
    if (modeBadge && modeText) {
      const mode = state.station?.operatingMode || "ALERT";
      modeBadge.className = `mode-badge ${mode}`;
      modeText.textContent = mode;
    }
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
