/**
 * EcoAlert Polar - Renewable Energy Prediction Chart (SVG)
 * Plots wind turbine and solar arrays generation and forecast.
 */

window.renderRenewableChart = function(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = window.ecoState.getState("timeline");
  const width = container.clientWidth || 540;
  const height = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = 0;
  const maxVal = 40;

  const getX = (i) => padLeft + (i / (data.hours.length - 1)) * plotW;
  const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  // Grid lines
  const gridSteps = [0, 10, 20, 30, 40];
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
  data.hours.forEach((hr, i) => {
    const x = getX(i);
    xLabelsSvg += `
      <text x="${x}" y="${height - 8}" text-anchor="middle" class="chart-axis-text">${hr}</text>
    `;
  });

  // Wind Generation Path
  let windD = `M ${getX(0)} ${getY(data.windGeneration[0])}`;
  for (let i = 1; i < data.windGeneration.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(data.windGeneration[i - 1]);
    const currX = getX(i);
    const currY = getY(data.windGeneration[i]);
    const midX = (prevX + currX) / 2;
    windD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Solar Baseline (Flat 0 kW in Polar Winter)
  const solarY = getY(0);
  const solarLineSvg = `
    <line x1="${padLeft}" y1="${solarY}" x2="${width - padRight}" y2="${solarY}" stroke="#FFC857" stroke-width="1.5" stroke-dasharray="4 2" opacity="0.4" />
    <text x="${width - padRight - 4}" y="${solarY - 6}" text-anchor="end" class="chart-axis-text" fill="#FFC857">SOLAR: 0 kW (Polar Night)</text>
  `;

  // Nodes for wind
  let nodesSvg = "";
  data.windGeneration.forEach((val, i) => {
    const cx = getX(i);
    const cy = getY(val);
    nodesSvg += `
      <circle cx="${cx}" cy="${cy}" r="4" class="chart-node" style="stroke: var(--primary-cyan); fill: #0B1728;" data-val="${val} kW Wind" data-hr="${data.hours[i]}" />
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
      <path d="${windD} L ${getX(data.hours.length - 1)} ${getY(0)} L ${getX(0)} ${getY(0)} Z" fill="url(#windAreaGrad)" />
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
      tooltip.classList.remove("visible");
    });
  });
};
