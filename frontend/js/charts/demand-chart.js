/**
 * EcoAlert Polar - Demand Forecast Chart (SVG)
 * Renders actual demand, predicted demand, and peak threshold.
 */

window.renderDemandChart = function(containerId, options = {}) {
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

  const minVal = 60;
  const maxVal = 130;

  const getX = (i) => padLeft + (i / (data.hours.length - 1)) * plotW;
  const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  // Generate grid lines
  const gridSteps = [70, 90, 110, 130];
  let gridSvg = "";
  gridSteps.forEach(step => {
    const y = getY(step);
    gridSvg += `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
      <text x="${padLeft - 8}" y="${y + 3}" text-anchor="end" class="chart-axis-text">${step}k</text>
    `;
  });

  // Generate X axis labels
  let xLabelsSvg = "";
  data.hours.forEach((hr, i) => {
    const x = getX(i);
    xLabelsSvg += `
      <text x="${x}" y="${height - 8}" text-anchor="middle" class="chart-axis-text">${hr}</text>
    `;
  });

  // Predicted Demand Curve Path (Smooth spline)
  let predD = `M ${getX(0)} ${getY(data.predictedDemand[0])}`;
  for (let i = 1; i < data.predictedDemand.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(data.predictedDemand[i - 1]);
    const currX = getX(i);
    const currY = getY(data.predictedDemand[i]);
    const midX = (prevX + currX) / 2;
    predD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Peak Threshold Line (115 kW)
  const peakY = getY(115);
  const peakLineSvg = `
    <line x1="${padLeft}" y1="${peakY}" x2="${width - padRight}" y2="${peakY}" class="chart-line-peak" />
    <text x="${width - padRight - 4}" y="${peakY - 6}" text-anchor="end" class="chart-axis-text" fill="var(--critical-red)">PEAK 115 kW</text>
  `;

  // Nodes for prediction points
  let nodesSvg = "";
  data.predictedDemand.forEach((val, i) => {
    const cx = getX(i);
    const cy = getY(val);
    nodesSvg += `
      <circle cx="${cx}" cy="${cy}" r="4" class="chart-node chart-node-predicted" data-val="${val}" data-hr="${data.hours[i]}" />
    `;
  });

  // Current Actual Demand Node at index 0 (Now = 90 kW)
  const actualNodeSvg = `
    <circle cx="${getX(0)}" cy="${getY(90)}" r="6" class="chart-node" style="stroke: var(--primary-cyan); fill: #FFFFFF;" data-val="90 kW (Actual)" data-hr="Now" />
  `;

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="predAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#8B7CFF" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#8B7CFF" stop-opacity="0.0" />
        </linearGradient>
      </defs>
      ${gridSvg}
      ${peakLineSvg}
      <path d="${predD} L ${getX(data.hours.length - 1)} ${height - padBottom} L ${getX(0)} ${height - padBottom} Z" fill="url(#predAreaGrad)" />
      <path d="${predD}" class="chart-line-predicted" />
      ${xLabelsSvg}
      ${nodesSvg}
      ${actualNodeSvg}
    </svg>
    <div class="chart-tooltip" id="tooltip-${containerId}"></div>
  `;

  // Tooltip interaction
  const tooltip = document.getElementById(`tooltip-${containerId}`);
  const nodes = container.querySelectorAll(".chart-node");
  nodes.forEach(node => {
    node.addEventListener("mouseenter", (e) => {
      const val = node.getAttribute("data-val");
      const hr = node.getAttribute("data-hr");
      tooltip.textContent = `${hr}: ${val} kW`;
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
