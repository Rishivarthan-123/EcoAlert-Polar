/**
 * EcoAlert Polar - Circular Risk Donut Gauge & Risk Timeline
 * Signature visualization for the Crisis & Risk Intelligence screen.
 */

window.renderRiskGauge = function(containerId, score = 78, level = "HIGH") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const radius = 90;
  const circumference = 2 * Math.PI * radius; // ~565.48
  const offset = circumference - (score / 100) * circumference;

  const isHighOrCritical = level === "HIGH" || level === "CRITICAL";

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
          <div class="gauge-percent mono-val">${score}%</div>
          <div class="gauge-status-badge">
            <span class="badge ${level === 'CRITICAL' ? 'badge-critical' : 'badge-high'}">
              <span class="status-dot critical"></span> ${level}
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

  const timelineSteps = [
    { step: "NOW", time: "14:00", level: "WARNING", status: "Active Observation", isCurrent: true },
    { step: "+30m", time: "14:30", level: "HIGH", status: "Heating Surge Spike", isCurrent: false },
    { step: "+1h", time: "15:00", level: "HIGH", status: "Turbine Wind Drop", isCurrent: false },
    { step: "+1.5h", time: "15:30", level: "CRITICAL", status: "Shortage Deficit (33 kW)", isTransition: true },
    { step: "+2h", time: "16:00", level: "SHORTAGE", status: "Battery < 20% Safe Buffer", isCriticalEnd: true }
  ];

  container.innerHTML = `
    <div class="risk-timeline-card glass-card">
      <div class="chart-card-header" style="margin-bottom: 0;">
        <div class="chart-title-group">
          <span class="tech-label" style="color: var(--critical-red);">PREDICTIVE EVENT HORIZON</span>
          <h3 class="chart-title">Station Risk Evolution Timeline</h3>
        </div>
        <span class="badge badge-critical">CRISIS TRANSITION AT +1.5h</span>
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
