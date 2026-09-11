/**
 * EcoAlert Polar - Renewable Energy Prediction Chart (SVG)
 * Dynamic SVG plotting for wind turbine and solar array generation.
 */

window.renderRenewableChart = function(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const timeline = window.ecoState.getState("timeline") || {};
  const energy = window.ecoState.getState("energy") || {};

  const hours = timeline.hours || ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"];
  const windGen = timeline.windGeneration || [25, 23, 21, 19, 22, 24, 26];
  const solarGen = timeline.solarGeneration || [0, 0, 0, 0, 0, 0, 0];
  const currentSolar = Number(energy.solarGeneration ?? solarGen[0] ?? 0);

  const width = container.clientWidth || 540;
  const height = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allVals = [...windGen, ...solarGen];
  const maxVal = Math.max(40, Math.ceil(Math.max(...allVals) * 1.25 / 10) * 10);
  const minVal = 0;

  const getX = (i) => padLeft + (i / Math.max(hours.length - 1, 1)) * plotW;
  const getY = (val) => padTop + plotH - ((val - minVal) / Math.max(maxVal - minVal, 1)) * plotH;

  // Dynamic Grid steps
  const stepSize = Math.max(10, Math.round(maxVal / 4 / 10) * 10);
  const gridSteps = [];
  for (let s = 0; s <= maxVal; s += stepSize) {
    gridSteps.push(s);
  }

  let gridSvg = "";
  gridSteps.forEach(step => {
    const y = getY(step);
    gridSvg += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
      <text x="${padLeft - 8}" y="${y + 3}" text-anchor="end" class="chart-axis-text">${step}k</text>
    `;
  });

  // X axis labels
  let xLabelsSvg = "";
  hours.forEach((hr, i) => {
    const x = getX(i);
    xLabelsSvg += `
      <text x="${x}" y="${height - 8}" text-anchor="middle" class="chart-axis-text">${hr}</text>
    `;
  });

  // Wind Generation Path (Smooth spline)
  let windD = `M ${getX(0)} ${getY(windGen[0])}`;
  for (let i = 1; i < windGen.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(windGen[i - 1]);
    const currX = getX(i);
    const currY = getY(windGen[i]);
    const midX = (prevX + currX) / 2;
    windD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Solar Line (Dynamic - shows Polar Night note if 0 kW, or curve if active)
  let solarLineSvg = "";
  if (currentSolar === 0 && solarGen.every(v => v === 0)) {
    const solarY = getY(0);
    solarLineSvg = `
      <line x1="${padLeft}" y1="${solarY}" x2="${width - padRight}" y2="${solarY}" stroke="#FFC857" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.5" />
      <text x="${width - padRight - 4}" y="${solarY - 6}" text-anchor="end" class="chart-axis-text" fill="#FFC857">SOLAR: 0 kW (Polar Night)</text>
    `;
  } else {
    let solarD = `M ${getX(0)} ${getY(solarGen[0])}`;
    for (let i = 1; i < solarGen.length; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(solarGen[i - 1]);
      const currX = getX(i);
      const currY = getY(solarGen[i]);
      const midX = (prevX + currX) / 2;
      solarD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
    }
    solarLineSvg = `
      <path d="${solarD}" stroke="#FFC857" stroke-width="2" fill="none" stroke-dasharray="5 3" />
      <text x="${width - padRight - 4}" y="${getY(solarGen[0]) - 6}" text-anchor="end" class="chart-axis-text" fill="#FFC857">SOLAR: ${currentSolar} kW Active</text>
    `;
  }

  // Wind Interactive Nodes
  let nodesSvg = "";
  windGen.forEach((val, i) => {
    const cx = getX(i);
    const cy = getY(val);
    nodesSvg += `
      <circle cx="${cx}" cy="${cy}" r="4" class="chart-node" style="stroke: var(--primary-cyan); fill: #0B1728;" data-val="${val} kW Wind" data-hr="${hours[i]}" />
    `;
  });

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="windAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#55D6FF" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#55D6FF" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      ${gridSvg}
      ${solarLineSvg}
      <path d="${windD} L ${getX(hours.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z" fill="url(#windAreaGrad)" />
      <path d="${windD}" class="chart-line-actual" />
      ${xLabelsSvg}
      ${nodesSvg}
    </svg>
    <div class="chart-tooltip" id="tooltip-${containerId}"></div>
  `;

  // Tooltips
  const tooltip = document.getElementById(`tooltip-${containerId}`);
  const nodes = container.querySelectorAll(".chart-node");
  nodes.forEach(node => {
    node.addEventListener("mouseenter", () => {
      if (!tooltip) return;
      const val = node.getAttribute("data-val");
      const hr = node.getAttribute("data-hr");
      tooltip.textContent = `${hr}: ${val}`;
      tooltip.classList.add("visible");
      const rect = node.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      tooltip.style.left = `${rect.left - contRect.left + 5}px`;
      tooltip.style.top = `${rect.top - contRect.top}px`;
    });
    node.addEventListener("mouseleave", () => {
      if (tooltip) tooltip.classList.remove("visible");
    });
  });
};
