/**
 * EcoAlert Polar - Supply vs Demand Chart (SVG)
 * Dynamically highlights deficit/risk regions or surplus regions based on live station telemetry.
 */

window.renderSupplyDemandChart = function(containerId, isLarge = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const timeline = window.ecoState.getState("timeline") || {};
  const hours = timeline.hours || ["Now", "+1h", "+2h", "+3h", "+4h", "+5h", "+6h"];
  const predictedDemand = timeline.predictedDemand || [90, 108, 114, 111, 104, 98, 92];
  const availableSupply = timeline.availableSupply || [75, 72, 67, 62, 65, 70, 75];

  const width = container.clientWidth || 540;
  const height = isLarge ? 280 : 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const allVals = [...predictedDemand, ...availableSupply];
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);

  const minVal = Math.max(0, Math.floor(rawMin * 0.75 / 10) * 10);
  const maxVal = Math.max(120, Math.ceil(rawMax * 1.25 / 10) * 10);

  const getX = (i) => padLeft + (i / Math.max(hours.length - 1, 1)) * plotW;
  const getY = (val) => padTop + plotH - ((val - minVal) / Math.max(maxVal - minVal, 1)) * plotH;

  // Dynamic grid lines
  const stepSize = Math.max(10, Math.round((maxVal - minVal) / 4 / 10) * 10);
  const gridSteps = [];
  for (let s = minVal + stepSize; s < maxVal; s += stepSize) {
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

  // Predicted Demand curve
  let demandD = `M ${getX(0)} ${getY(predictedDemand[0])}`;
  for (let i = 1; i < predictedDemand.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(predictedDemand[i - 1]);
    const currX = getX(i);
    const currY = getY(predictedDemand[i]);
    const midX = (prevX + currX) / 2;
    demandD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Available Supply curve
  let supplyD = `M ${getX(0)} ${getY(availableSupply[0])}`;
  for (let i = 1; i < availableSupply.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(availableSupply[i - 1]);
    const currX = getX(i);
    const currY = getY(availableSupply[i]);
    const midX = (prevX + currX) / 2;
    supplyD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Calculate dynamic deficit points (where demand > supply)
  const gaps = predictedDemand.map((d, i) => d - availableSupply[i]);
  const deficits = gaps.filter(g => g > 0);
  const isDeficit = deficits.length > 0;

  // Dynamic Polygon Path construction for deficit/surplus zone
  let areaPath = `M ${getX(0)} ${getY(predictedDemand[0])}`;
  for (let i = 1; i < hours.length; i++) {
    areaPath += ` L ${getX(i)} ${getY(predictedDemand[i])}`;
  }
  for (let i = hours.length - 1; i >= 0; i--) {
    areaPath += ` L ${getX(i)} ${getY(availableSupply[i])}`;
  }
  areaPath += " Z";

  // Label configuration
  let labelText = "";
  let badgeColor = "var(--critical-red)";
  let fillColor = "rgba(255, 92, 122, 0.18)";
  let strokeColor = "rgba(255, 92, 122, 0.5)";

  if (isDeficit) {
    const minDef = Math.min(...deficits);
    const maxDef = Math.max(...deficits);
    labelText = minDef === maxDef ? `DEFICIT: ${maxDef} kW` : `DEFICIT: ${minDef}–${maxDef} kW`;
  } else {
    const maxSurplus = Math.abs(Math.min(...gaps));
    labelText = `SURPLUS: +${maxSurplus} kW`;
    badgeColor = "var(--success-aurora)";
    fillColor = "rgba(57, 230, 165, 0.15)";
    strokeColor = "rgba(57, 230, 165, 0.4)";
  }

  // Position badge at peak difference index
  let peakGapIdx = 0;
  let maxAbsGap = 0;
  gaps.forEach((g, i) => {
    if (Math.abs(g) > maxAbsGap) {
      maxAbsGap = Math.abs(g);
      peakGapIdx = i;
    }
  });

  const markerX = getX(peakGapIdx);
  const midPointY = getY((predictedDemand[peakGapIdx] + availableSupply[peakGapIdx]) / 2);

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="deficitPattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="${isDeficit ? 'rgba(255, 92, 122, 0.4)' : 'rgba(57, 230, 165, 0.3)'}" stroke-width="2" />
        </pattern>
      </defs>
      ${gridSvg}
      
      <!-- Dynamic Deficit or Surplus Zone -->
      <path d="${areaPath}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="3 3" />
      <path d="${areaPath}" fill="url(#deficitPattern)" />
      
      <!-- Supply line (Aurora Green) -->
      <path d="${supplyD}" class="chart-line-supply" />
      
      <!-- Demand line (AI Violet dashed) -->
      <path d="${demandD}" class="chart-line-predicted" />
      
      <!-- Deficit / Surplus Indicator Label -->
      <g transform="translate(${markerX}, ${midPointY})">
        <rect x="-65" y="-12" width="130" height="24" rx="4" fill="#0B1728" stroke="${badgeColor}" stroke-width="1.5" />
        <text x="0" y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="${badgeColor}">
          ${labelText}
        </text>
      </g>

      ${xLabelsSvg}

      <!-- Interactive Nodes -->
      ${predictedDemand.map((d, i) => `
        <circle cx="${getX(i)}" cy="${getY(d)}" r="4" class="chart-node chart-node-predicted" data-val="Demand: ${d} kW" data-hr="${hours[i]}" />
        <circle cx="${getX(i)}" cy="${getY(availableSupply[i])}" r="4" class="chart-node" style="stroke: var(--success-aurora); fill: #0B1728;" data-val="Supply: ${availableSupply[i]} kW" data-hr="${hours[i]}" />
      `).join('')}
    </svg>
    <div class="chart-tooltip" id="tooltip-${containerId}"></div>
  `;

  // Tooltip interaction
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
