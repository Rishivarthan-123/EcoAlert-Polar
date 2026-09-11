/**
 * EcoAlert Polar - Circular Risk Donut Gauge & Dynamic Risk Timeline
 * Signature visualization for the Crisis & Risk Intelligence screen.
 */

window.renderRiskGauge = function(containerId, score = 78, level = "HIGH") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const numericScore = Number(score) || 0;
  const radius = 90;
  const circumference = 2 * Math.PI * radius; // ~565.48
  const offset = Math.max(0, circumference - (numericScore / 100) * circumference);

  const upperLevel = String(level || "HIGH").toUpperCase();
  const isHighOrCritical = upperLevel === "HIGH" || upperLevel === "CRITICAL";

  let badgeClass = "badge-safe";
  let dotClass = "live";
  if (upperLevel === "CRITICAL") {
    badgeClass = "badge-critical";
    dotClass = "critical";
  } else if (upperLevel === "HIGH") {
    badgeClass = "badge-high";
    dotClass = "warning";
  } else if (upperLevel === "WARNING") {
    badgeClass = "badge-warning";
    dotClass = "warning";
  }

  container.innerHTML = `
    <div class="risk-gauge-container">
      <div class="gauge-svg-wrap">
        <svg class="gauge-svg" viewBox="0 0 220 220">
          <defs>
            <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FFC857" />
              <stop offset="50%" stop-color="#FF8557" />
              <stop offset="100%" stop-color="#FF5C7A" />
            </linearGradient>
          </defs>
          <!-- Background Track -->
          <circle cx="110" cy="110" r="${radius}" class="gauge-bg-circle" />
          <!-- Animated Fill Circle -->
          <circle cx="110" cy="110" r="${radius}" 
            class="gauge-fill-circle ${isHighOrCritical ? 'pulse-active' : ''}" 
            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};" />
        </svg>

        <!-- Center Numerical Intelligence -->
        <div class="gauge-center-content">
          <div class="gauge-percent mono-val">${numericScore}%</div>
          <div class="gauge-status-badge">
            <span class="badge ${badgeClass}">
              <span class="status-dot ${dotClass}"></span> ${upperLevel}
            </span>
          </div>
          <div class="gauge-risk-sub">ENERGY CRISIS INDEX</div>
        </div>
      </div>
    </div>
  `;
};

window.renderRiskTimeline = function(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const timeline = window.ecoState.getState("timeline") || {};
  const riskState = window.ecoState.getState("risk") || {};
  const stepsFromState = timeline.riskTimeline || [];

  const defaultSteps = [
    { step: "NOW", time: "14:00", level: "WARNING", label: "Active Grid Observation" },
    { step: "+30m", time: "14:30", level: "HIGH", label: "Heating Demand Spike" },
    { step: "+1h", time: "15:00", level: "HIGH", label: "Turbine Output Drop" },
    { step: "+1.5h", time: "15:30", level: "CRITICAL", label: "Shortage Deficit Window" },
    { step: "+2h", time: "16:00", level: "SHORTAGE", label: "Battery Reserve Low" }
  ];

  const rawSteps = stepsFromState.length > 0 ? stepsFromState : defaultSteps;

  const timelineSteps = rawSteps.map((s, idx) => ({
    step: s.step || `+${idx * 30}m`,
    time: s.time || "14:00",
    level: s.level || "WARNING",
    status: s.label || s.status || "Monitoring",
    isCurrent: idx === 0,
    isTransition: s.level === "CRITICAL" || idx === 3
  }));

  const mainCrisisText = riskState.level === "CRITICAL"
    ? "CRITICAL ALERT - IMMEDIATE LOAD SHED REQUIRED"
    : (riskState.level === "HIGH" ? "HIGH RISK - PREDICTED SHORTAGE" : "NOMINAL - MONITORING GRID");

  const mainBadgeClass = riskState.level === "CRITICAL" ? "badge-critical" : (riskState.level === "HIGH" ? "badge-high" : "badge-safe");

  container.innerHTML = `
    <div class="risk-timeline-card glass-card">
      <div class="chart-card-header" style="margin-bottom: 0;">
        <div class="chart-title-group">
          <span class="tech-label" style="color: var(--critical-red);">PREDICTIVE EVENT HORIZON</span>
          <h3 class="chart-title">Station Risk Evolution Timeline</h3>
        </div>
        <span class="badge ${mainBadgeClass}">${mainCrisisText}</span>
      </div>

      <div class="risk-timeline-track">
        ${timelineSteps.map((s, idx) => `
          <div class="timeline-checkpoint">
            <div class="checkpoint-node ${s.isCurrent ? 'active-now' : s.isTransition ? 'active-crisis' : ''}">
              ${idx + 1}
            </div>
            <div class="checkpoint-step">${s.step}</div>
            <div class="checkpoint-time">${s.time} UTC</div>
            <div class="checkpoint-label">${s.status}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};
