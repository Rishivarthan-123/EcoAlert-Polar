/**
 * EcoAlert Polar - Alert Component & Station Risk Banner
 */

class EcoAlertCenter {
  constructor() {
    this.bannerContainer = null;
    this.alertListContainer = null;
  }

  /**
   * Render dynamic station health / risk banner in a target element
   */
  renderStationBanner(targetEl) {
    if (!targetEl) return;
    this.bannerContainer = targetEl;
    const state = window.ecoState.getState();
    const isHighRisk = state.risk.level === "HIGH" || state.risk.level === "CRITICAL";

    if (isHighRisk) {
      targetEl.innerHTML = `
        <div class="station-banner status-high-risk">
          <div class="banner-content">
            <div class="banner-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div class="banner-info">
              <div class="banner-top-row">
                <span class="badge badge-critical"><span class="status-dot critical"></span> HIGH ENERGY RISK</span>
                <span class="tech-label" style="color: var(--critical-red);">CRISIS PREDICTED IN 1.5 HOURS</span>
              </div>
              <h2 class="banner-title" style="margin-top: 4px;">Potential Energy Shortage Predicted at 15:30 UTC</h2>
              <p class="banner-desc">
                Expected deficit: <strong style="color: var(--critical-red);">${state.risk.expectedDeficitKw} kW</strong> &bull; 
                Primary causes: <strong style="color: var(--text-highlight);">Increasing demand</strong>, 
                <strong style="color: var(--text-highlight);">Low renewable generation</strong>, 
                <strong style="color: var(--text-highlight);">Declining battery reserve</strong>. 
                Recommended response: <strong style="color: var(--primary-cyan);">Reduce or delay non-critical loads</strong>.
              </p>
            </div>
          </div>
          <div class="banner-metrics">
            <div class="banner-metric-card">
              <div class="banner-metric-label">DEFICIT ETA</div>
              <div class="banner-metric-val">1.5h</div>
            </div>
            <div class="banner-metric-card">
              <div class="banner-metric-label">NET DEFICIT</div>
              <div class="banner-metric-val">-${state.risk.expectedDeficitKw} kW</div>
            </div>
            <button class="btn btn-primary btn-sm" id="banner-action-btn">
              Mitigate Risk →
            </button>
          </div>
        </div>
      `;

      const btn = targetEl.querySelector("#banner-action-btn");
      if (btn) {
        btn.addEventListener("click", () => {
          if (window.ecoNav) window.ecoNav.navigateTo("crisis-risk");
        });
      }
    } else {
      targetEl.innerHTML = `
        <div class="station-banner status-stable">
          <div class="banner-content">
            <div class="banner-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div class="banner-info">
              <div class="banner-top-row">
                <span class="badge badge-safe"><span class="status-dot live"></span> STATION ENERGY SYSTEM STABLE</span>
                <span class="tech-label" style="color: var(--success-aurora);">ALL CRITICAL SYSTEMS SAFE</span>
              </div>
              <h2 class="banner-title" style="margin-top: 4px;">Station Energy Reserves Operating Nominally</h2>
              <p class="banner-desc">
                All critical habitat and life support loads are fully powered. Grid optimization active. Next predicted pressure window: <strong>> 6.0 hours</strong>.
              </p>
            </div>
          </div>
          <div class="banner-metrics">
            <div class="banner-metric-card">
              <div class="banner-metric-label">GRID STATUS</div>
              <div class="banner-metric-val" style="color: var(--success-aurora);">OPTIMAL</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Render Alert Center list
   */
  renderAlertList(targetEl) {
    if (!targetEl) return;
    this.alertListContainer = targetEl;
    const state = window.ecoState.getState();

    targetEl.innerHTML = `
      <div class="alert-center-list">
        ${state.alerts.map(alt => `
          <div class="alert-card ${alt.severity}">
            <div class="alert-top">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="badge ${alt.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}">${alt.severity}</span>
                <span class="alert-title">${alt.title}</span>
              </div>
              <span class="alert-time mono-val">${alt.timestamp}</span>
            </div>
            <div class="alert-reason">${alt.reason}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
              <span class="alert-zone-tag">ZONE: ${alt.zone}</span>
              ${alt.actionRequired ? `<a href="#crisis-risk" class="tech-label" style="color: var(--critical-red); text-decoration: underline; font-weight: 700;">Action Required →</a>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

window.ecoAlerts = new EcoAlertCenter();
