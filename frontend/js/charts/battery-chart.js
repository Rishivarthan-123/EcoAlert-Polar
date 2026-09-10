/**
 * EcoAlert Polar - Battery Reserve Chart (SVG)
 * Shows battery state-of-charge trajectory over time and safe buffer limit.
 */

window.renderBatteryChart = function(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const data = window.ecoState.getState("timeline");

  // ---------------------------------------------------------
  // Validate timeline data
  // ---------------------------------------------------------

  if (
    !data ||
    !Array.isArray(data.hours) ||
    data.hours.length === 0 ||
    !Array.isArray(data.batterySocForecast) ||
    data.batterySocForecast.length === 0
  ) {
    container.innerHTML = `
      <div class="chart-empty-state">
        Battery forecast data unavailable.
      </div>
    `;
    return;
  }

  // ---------------------------------------------------------
  // Battery mitigation trajectory
  //
  // The current demo dataset contains the baseline forecast
  // but does not provide a separate mitigated trajectory.
  //
  // Therefore, create a safe-buffer visualization by holding
  // the projected SOC at the minimum safe threshold once the
  // baseline forecast falls below it.
  // ---------------------------------------------------------

  const safeBuffer = 20;

  const batterySocForecast =
    data.batterySocForecast.map(value => {
      const numericValue = Number(value);
      return Number.isFinite(numericValue)
        ? numericValue
        : 0;
    });

  const batterySocMitigated =
    Array.isArray(data.batterySocMitigated) &&
    data.batterySocMitigated.length === data.hours.length
      ? data.batterySocMitigated.map(value => {
          const numericValue = Number(value);
          return Number.isFinite(numericValue)
            ? numericValue
            : safeBuffer;
        })
      : batterySocForecast.map(value =>
          Math.max(value, safeBuffer)
        );

  // ---------------------------------------------------------
  // Chart dimensions
  // ---------------------------------------------------------

  const width = container.clientWidth || 540;
  const height = 200;

  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minVal = 0;
  const maxVal = 50;

  // Prevent division-by-zero if there is only one point.
  const pointCount = data.hours.length;
  const xDenominator = Math.max(pointCount - 1, 1);

  const getX = (i) =>
    pointCount === 1
      ? padLeft + plotW / 2
      : padLeft + (i / xDenominator) * plotW;

  const getY = (val) =>
    padTop +
    plotH -
    ((val - minVal) / (maxVal - minVal)) * plotH;

  // ---------------------------------------------------------
  // Grid lines
  // ---------------------------------------------------------

  const gridSteps = [0, 10, 20, 30, 40, 50];

  let gridSvg = "";

  gridSteps.forEach(step => {
    const y = getY(step);

    gridSvg += `
      <line
        x1="${padLeft}"
        y1="${y}"
        x2="${width - padRight}"
        y2="${y}"
        class="chart-grid-line"
      />

      <text
        x="${padLeft - 8}"
        y="${y + 3}"
        text-anchor="end"
        class="chart-axis-text"
      >
        ${step}%
      </text>
    `;
  });

  // ---------------------------------------------------------
  // Safe buffer threshold line
  // ---------------------------------------------------------

  const bufferY = getY(safeBuffer);

  const bufferLineSvg = `
    <line
      x1="${padLeft}"
      y1="${bufferY}"
      x2="${width - padRight}"
      y2="${bufferY}"
      stroke="var(--warning-amber)"
      stroke-width="1.5"
      stroke-dasharray="4 3"
    />

    <text
      x="${width - padRight - 4}"
      y="${bufferY - 5}"
      text-anchor="end"
      class="chart-axis-text"
      fill="var(--warning-amber)"
    >
      SAFE BUFFER 20%
    </text>
  `;

  // ---------------------------------------------------------
  // X axis labels
  // ---------------------------------------------------------

  let xLabelsSvg = "";

  data.hours.forEach((hr, i) => {
    const x = getX(i);

    xLabelsSvg += `
      <text
        x="${x}"
        y="${height - 8}"
        text-anchor="middle"
        class="chart-axis-text"
      >
        ${hr}
      </text>
    `;
  });

  // ---------------------------------------------------------
  // Build baseline SOC curve
  // ---------------------------------------------------------

  let socD = `
    M ${getX(0)}
    ${getY(batterySocForecast[0])}
  `;

  for (let i = 1; i < batterySocForecast.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(batterySocForecast[i - 1]);

    const currX = getX(i);
    const currY = getY(batterySocForecast[i]);

    const midX = (prevX + currX) / 2;

    socD += `
      C
      ${midX} ${prevY},
      ${midX} ${currY},
      ${currX} ${currY}
    `;
  }

  // ---------------------------------------------------------
  // Build mitigated SOC curve
  // ---------------------------------------------------------

  let mitD = `
    M ${getX(0)}
    ${getY(batterySocMitigated[0])}
  `;

  for (let i = 1; i < batterySocMitigated.length; i++) {
    const prevX = getX(i - 1);
    const prevY = getY(batterySocMitigated[i - 1]);

    const currX = getX(i);
    const currY = getY(batterySocMitigated[i]);

    const midX = (prevX + currX) / 2;

    mitD += `
      C
      ${midX} ${prevY},
      ${midX} ${currY},
      ${currX} ${currY}
    `;
  }

  // ---------------------------------------------------------
  // Battery baseline nodes
  // ---------------------------------------------------------

  let nodesSvg = "";

  batterySocForecast.forEach((val, i) => {
    const cx = getX(i);
    const cy = getY(val);

    const isBelowBuffer = val < safeBuffer;

    const strokeColor = isBelowBuffer
      ? "var(--critical-red)"
      : "var(--warning-amber)";

    nodesSvg += `
      <circle
        cx="${cx}"
        cy="${cy}"
        r="4"
        class="chart-node"
        style="
          stroke: ${strokeColor};
          fill: #0B1728;
        "
        data-val="${val}% SOC"
        data-hr="${data.hours[i]}"
      />
    `;
  });

  // ---------------------------------------------------------
  // Render chart
  // ---------------------------------------------------------

  container.innerHTML = `
    <svg
      class="chart-svg"
      viewBox="0 0 ${width} ${height}"
    >

      <defs>
        <linearGradient
          id="batteryGrad"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop
            offset="0%"
            stop-color="#FFC857"
            stop-opacity="0.25"
          />

          <stop
            offset="60%"
            stop-color="#FF5C7A"
            stop-opacity="0.15"
          />

          <stop
            offset="100%"
            stop-color="#FF5C7A"
            stop-opacity="0.0"
          />
        </linearGradient>
      </defs>

      ${gridSvg}

      ${bufferLineSvg}

      <!-- Baseline battery depletion area -->
      <path
        d="
          ${socD}
          L ${getX(data.hours.length - 1)} ${getY(0)}
          L ${getX(0)} ${getY(0)}
          Z
        "
        fill="url(#batteryGrad)"
      />

      <!-- Mitigated / safe-buffer trajectory -->
      <path
        d="${mitD}"
        stroke="var(--success-aurora)"
        stroke-width="1.8"
        stroke-dasharray="5 4"
        fill="none"
        opacity="0.85"
      />

      <!-- Baseline trajectory -->
      <path
        d="${socD}"
        class="chart-line-battery"
      />

      ${xLabelsSvg}

      ${nodesSvg}

    </svg>

    <div
      class="chart-tooltip"
      id="tooltip-${containerId}"
    ></div>
  `;

  // ---------------------------------------------------------
  // Tooltips
  // ---------------------------------------------------------

  const tooltip =
    document.getElementById(
      `tooltip-${containerId}`
    );

  const nodes =
    container.querySelectorAll(
      ".chart-node"
    );

  nodes.forEach(node => {

    node.addEventListener(
      "mouseenter",
      () => {

        if (!tooltip) return;

        const val =
          node.getAttribute(
            "data-val"
          );

        const hr =
          node.getAttribute(
            "data-hr"
          );

        tooltip.textContent =
          `${hr}: ${val}`;

        tooltip.classList.add(
          "visible"
        );

        const rect =
          node.getBoundingClientRect();

        const contRect =
          container.getBoundingClientRect();

        tooltip.style.left =
          `${rect.left - contRect.left + 5}px`;

        tooltip.style.top =
          `${rect.top - contRect.top}px`;
      }
    );

    node.addEventListener(
      "mouseleave",
      () => {

        if (!tooltip) return;

        tooltip.classList.remove(
          "visible"
        );
      }
    );
  });
};