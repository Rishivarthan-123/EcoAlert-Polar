/**
 * EcoAlert Polar - Supply vs Demand Chart (SVG)
 * Clearly highlights the point where demand exceeds supply with a shaded risk/deficit region.
 */

window.renderSupplyDemandChart = function(containerId, isLarge = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = window.ecoState.getState("timeline");
  const width = container.clientWidth || 540;
  const height = isLarge ? 280 : 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = 50;
  const maxVal = 130;

  const getX = (i) => padLeft + (i / (data.hours.length - 1)) * plotW;
  const getY = (val) => padTop + plotH - ((val - minVal) / (maxVal - minVal)) * plotH;

  // Grid lines
  const gridSteps = [60, 80, 100, 120];
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

  // Predicted Demand curve
  let demandD = `M ${getX(0)} ${getY(data.predictedDemand[0])}`;
  for (let i = 1; i < data.predictedDemand.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(data.predictedDemand[i - 1]);
    const currX = getX(i);
    const currY = getY(data.predictedDemand[i]);
    const midX = (prevX + currX) / 2;
    demandD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Available Supply curve
  let supplyD = `M ${getX(0)} ${getY(data.availableSupply[0])}`;
  for (let i = 1; i < data.availableSupply.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(data.availableSupply[i - 1]);
    const currX = getX(i);
    const currY = getY(data.availableSupply[i]);
    const midX = (prevX + currX) / 2;
    supplyD += ` C ${midX} ${prevY}, ${midX} ${currY}, ${currX} ${currY}`;
  }

  // Construct shaded deficit polygon where demand > supply
  // Supply drops below demand right around Now -> +1.5h
  const deficitAreaPath = `
    M ${getX(0)} ${getY(data.predictedDemand[0])}
    L ${getX(1)} ${getY(data.predictedDemand[1])}
    L ${getX(2)} ${getY(data.predictedDemand[2])}
    L ${getX(3)} ${getY(data.predictedDemand[3])}
    L ${getX(4)} ${getY(data.predictedDemand[4])}
    L ${getX(5)} ${getY(data.predictedDemand[5])}
    L ${getX(6)} ${getY(data.predictedDemand[6])}
    L ${getX(6)} ${getY(data.availableSupply[6])}
    L ${getX(5)} ${getY(data.availableSupply[5])}
    L ${getX(4)} ${getY(data.availableSupply[4])}
    L ${getX(3)} ${getY(data.availableSupply[3])}
    L ${getX(2)} ${getY(data.availableSupply[2])}
    L ${getX(1)} ${getY(data.availableSupply[1])}
    L ${getX(0)} ${getY(data.availableSupply[0])}
    Z
  `;

  // Deficit marker badge at peak gap (+2h: 115 kW vs 70 kW -> 45 kW deficit)
  const markerX = getX(1.5);
  const markerY = getY(108);

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}">
      <defs>
        <pattern id="deficitPattern" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255, 92, 122, 0.4)" stroke-width="2" />
        </pattern>
      </defs>
      ${gridSvg}
      <!-- Shaded Deficit / Risk Zone -->
      <path d="${deficitAreaPath}" fill="rgba(255, 92, 122, 0.18)" stroke="rgba(255, 92, 122, 0.5)" stroke-width="1.2" stroke-dasharray="3 3" />
      <path d="${deficitAreaPath}" fill="url(#deficitPattern)" />
      
      <!-- Supply line (Aurora Green) -->
      <path d="${supplyD}" class="chart-line-supply" />
      
      <!-- Demand line (AI Violet dashed) -->
      <path d="${demandD}" class="chart-line-predicted" />
      
      <!-- Deficit Indicator Label -->
      <g transform="translate(${getX(2)}, ${getY(92)})">
        <rect x="-60" y="-12" width="120" height="24" rx="4" fill="#0B1728" stroke="var(--critical-red)" stroke-width="1.5" />
        <text x="0" y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="var(--critical-red)">
          DEFICIT: 33–45 kW
        </text>
      </g>

      ${xLabelsSvg}

      <!-- Interactive Nodes -->
      ${data.predictedDemand.map((d, i) => `
        <circle cx="${getX(i)}" cy="${getY(d)}" r="4" class="chart-node chart-node-predicted" data-val="Demand: ${d} kW" data-hr="${data.hours[i]}" />
        <circle cx="${getX(i)}" cy="${getY(data.availableSupply[i])}" r="4" class="chart-node" style="stroke: var(--success-aurora); fill: #0B1728;" data-val="Supply: ${data.availableSupply[i]} kW" data-hr="${data.hours[i]}" />
      `).join('')}
    </svg>
    <div class="chart-tooltip" id="tooltip-${containerId}"></div>
  `;

  // Tooltip interaction
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
