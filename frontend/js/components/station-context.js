/**
 * EcoAlert Polar - Global Station Context Strip
 * Shared telemetry bar rendered under header across all pages
 */

class EcoStationContext {
  constructor() {
    this.container = document.getElementById("station-context-strip");
    this.render();
    
    // Subscribe to state changes to update values live
    window.ecoState.subscribe("*", () => this.update());
  }

  render() {
    if (!this.container) return;
    const state = window.ecoState.getState();

    this.container.innerHTML = `
      <!-- Station -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">STATION:</span>
          <span class="context-val" id="ctx-station">${state.station.code}</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Zone -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">ZONE:</span>
          <span class="context-val" id="ctx-zone">Research Alpha</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Temperature -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">TEMP:</span>
          <span class="context-val accent-cyan" id="ctx-temp">${state.environment.temperature}°C</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Wind Speed -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">WIND:</span>
          <span class="context-val" id="ctx-wind">${state.environment.windSpeed} m/s</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Occupancy -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">CREW:</span>
          <span class="context-val" id="ctx-crew">${state.occupancy.current} Researchers</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Current Demand -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">DEMAND:</span>
          <span class="context-val accent-amber" id="ctx-demand">${state.energy.currentDemand} kW</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Battery SOC -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="1" y="6" width="18" height="12" rx="2"/><line x1="23" y1="13" x2="23" y2="11"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">BATTERY:</span>
          <span class="context-val ${state.energy.battery.soc < 40 ? 'accent-amber' : 'accent-green'}" id="ctx-battery">${state.energy.battery.soc}% (${state.energy.battery.availableKwh} kWh)</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Renewable -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">RENEWABLE:</span>
          <span class="context-val accent-green" id="ctx-renewable">${state.energy.renewableGeneration} kW</span>
        </div>
      </div>

      <div class="context-divider"></div>

      <!-- Generator -->
      <div class="context-item">
        <span class="context-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="2" y="2" width="20" height="20" rx="2"/></svg>
        </span>
        <div class="context-text">
          <span class="context-name">GENERATOR:</span>
          <span class="context-val accent-green" id="ctx-generator">${state.energy.generator.status}</span>
        </div>
      </div>
    `;
  }

  update() {
    const state = window.ecoState.getState();
    const tempEl = document.getElementById("ctx-temp");
    const windEl = document.getElementById("ctx-wind");
    const crewEl = document.getElementById("ctx-crew");
    const demandEl = document.getElementById("ctx-demand");
    const batteryEl = document.getElementById("ctx-battery");
    const renEl = document.getElementById("ctx-renewable");
    const genEl = document.getElementById("ctx-generator");

    if (tempEl) tempEl.textContent = `${state.environment.temperature}°C`;
    if (windEl) windEl.textContent = `${state.environment.windSpeed} m/s`;
    if (crewEl) crewEl.textContent = `${state.occupancy.current} Researchers`;
    if (demandEl) demandEl.textContent = `${state.energy.currentDemand} kW`;
    if (batteryEl) {
      batteryEl.textContent = `${state.energy.battery.soc}% (${state.energy.battery.availableKwh} kWh)`;
      batteryEl.className = `context-val ${state.energy.battery.soc < 40 ? 'accent-amber' : 'accent-green'}`;
    }
    if (renEl) renEl.textContent = `${state.energy.renewableGeneration} kW`;
    if (genEl) genEl.textContent = state.energy.generator.status;
  }
}

window.EcoStationContext = EcoStationContext;
