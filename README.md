# ❄️ EcoAlert Polar — Architecture & Static Operation Guide

**EcoAlert Polar** is an AI-powered energy intelligence and decision-support command center designed for polar (Antarctic) research stations.

This application is built as a **100% Static Frontend Web Application** using pure **HTML5, Vanilla CSS3, and ES6+ JavaScript**. It requires **no Node.js server, no Python backend, no database, and no npm build tools** to run.

This guide explains in detail **how the website works under the hood in its static form**, how data moves across pages, how charts render without external libraries, and how a real backend can be plugged in later without altering the user interface.

---

## 📑 Table of Contents

1. [High-Level Architecture (The Big Picture)](#1-high-level-architecture-the-big-picture)
2. [How the Static SPA (Single Page App) Works](#2-how-the-static-spa-single-page-app-works)
3. [The "Brain": State Management & Demo Data](#3-the-brain-state-management--demo-data)
4. [The Mock API Layer (Future Backend Bridge)](#4-the-mock-api-layer-future-backend-bridge)
5. [The Connected Demo Journey (Step-by-Step Flow)](#5-the-connected-demo-journey-step-by-step-flow)
6. [How Charts & Visualizations Render Statically](#6-how-charts--visualizations-render-statically)
7. [Component & Page Lifecycle](#7-component--page-lifecycle)
8. [Connecting Real Backends (FastAPI / Node.js)](#8-connecting-real-backends-fastapi--nodejs)
9. [How to Run the Website](#9-how-to-run-the-website)

---

## 1. High-Level Architecture (The Big Picture)

```
                            ┌────────────────────────────────────────┐
                            │          frontend/index.html           │
                            │      (Single Page App Root Shell)      │
                            └───────────────────┬────────────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
      │   GLOBAL FRAMES    │         │     8 PAGE VIEWS   │         │    SHARED STATE    │
      │                    │         │                    │         │                    │
      │ • sidebar.js       │         │ 1. Overview        │         │ • demo-data.js     │
      │ • header.js        │         │ 2. Predictions     │         │ • state.js (Store) │
      │ • context-strip.js │         │ 3. Crisis & Risk   │         │ • api.js (Service) │
      │ • modal.js         │         │ 4. Loads           │         └────────────────────┘
      │ • toast.js         │         │ 5. Digital Twin    │                    │
      └────────────────────┘         │ 6. What-If         │                    ▼
                                     │ 7. Safety Guardian │         ┌────────────────────┐
                                     │ 8. History / Logs  │         │   SVG CHARTS       │
                                     └────────────────────┘         │                    │
                                                                    │ • demand-chart     │
                                                                    │ • supply-demand    │
                                                                    │ • battery-chart    │
                                                                    │ • risk-gauge/time  │
                                                                    └────────────────────┘
```

---

## 2. How the Static SPA (Single Page App) Works

### A. The Shell (`frontend/index.html`)
`index.html` serves as the primary container. It loads:
1. **5 modular CSS stylesheets** (`main.css`, `dashboard.css`, `components.css`, `charts.css`, `responsive.css`).
2. The persistent outer frames: **Left Sidebar**, **Top Global Header**, and **Station Context Strip**.
3. All **8 Page Views** pre-rendered inside `<main id="page-container">` with distinct IDs (`view-overview`, `view-predictions`, etc.).
4. **18 modular JavaScript files** at the bottom in strict dependency order.

### B. Client-Side Hash Routing (`frontend/js/navigation.js`)
Instead of loading a new `.html` file from a server whenever a user clicks a menu item (which causes full-page flashes and state loss), the app uses **URL Hash Routing** (`#overview`, `#predictions`, `#crisis-risk`, etc.):

1. When a user clicks a sidebar link or button:
   ```javascript
   window.location.hash = "#crisis-risk";
   ```
2. The `hashchange` listener in `navigation.js` intercepts this:
   ```javascript
   window.addEventListener("hashchange", () => {
     const hash = window.location.hash.replace("#", "") || "overview";
     this.navigateTo(hash);
   });
   ```
3. `navigateTo(pageId)` performs four instant actions:
   - **Hides all other views** by removing the CSS class `.active`.
   - **Reveals the targeted view** by adding `.active` (`display: block` with a subtle fade-in animation).
   - **Updates the Top Header** with the page title and breadcrumb.
   - **Calls the Page Controller's `mount()` method** (e.g., `EcoCrisisRiskPage.mount()`) to trigger chart drawing and button event bindings.

---

## 3. The "Brain": State Management & Demo Data

Because there is no database running in the background, state must live reliably in the browser's JavaScript memory.

### A. Baseline Seed Data (`frontend/data/demo-data.js`)
Contains the deterministic Antarctic station baseline telemetry:
- **Station**: Main Station (Amundsen-Scott Sector), Winter, -20°C, Wind 9.2 m/s, 15 Researchers.
- **Energy**: 90 kW Current Demand, 25 kW Renewable Wind, 35% Battery SOC (175 kWh).
- **Threat Index**: 78% HIGH RISK, 33 kW deficit predicted in 1.5 hours.
- **Loads**: Heating Unit 01 (35 kW), Laboratory (25 kW), Lighting (12 kW), Auxiliary (10 kW).

### B. Reactive State Store (`frontend/js/state.js`)
Uses the **Observer (Publish/Subscribe) Pattern**:
```javascript
// Any component can read state:
const currentDemand = window.ecoState.getState("energy").currentDemand;

// Any component can update state:
window.ecoState.updateSlice("energy", { currentDemand: 84 });

// Any component can subscribe to live changes:
window.ecoState.subscribe("energy", (newEnergy) => {
  document.getElementById("kpi-current-demand").textContent = newEnergy.currentDemand;
});
```

When an action is approved in Safety Guardian, `state.js` automatically notifies:
- The **Top Header** (updates operating mode).
- The **Station Context Strip** (updates demand from 90 kW to 84 kW).
- The **Overview Page** (updates KPI cards and switches the banner to STABLE).
- The **Sidebar** (removes the "1 PENDING" badge).

---

## 4. The Mock API Layer (Future Backend Bridge)

The file `frontend/js/api.js` abstracts data fetching. Instead of calling hardcoded variables directly inside UI components, all components call `window.ECO_API`:

```javascript
// Example from crisis-risk.js:
const riskData = await window.ECO_API.getCrisisPrediction();
```

Inside `api.js`:
```javascript
async getCrisisPrediction() {
  await this._mockDelay(180); // Simulates 180ms network & AI inference latency
  const state = window.ecoState.getState();
  return state.risk;
}
```

### Why this design is critical:
When a real Python FastAPI or Node.js backend is created later, **you do not rewrite the UI**. You only replace the contents of `api.js` with standard browser `fetch()` requests!

---

## 5. The Connected Demo Journey (Step-by-Step Flow)

The application tells a coherent, multi-page story across the 8 sections:

```
1. OVERVIEW
   └─ Displays 90 kW demand, 25 kW wind, 35% battery.
   └─ Shows "⚠ HIGH ENERGY RISK: Potential energy shortage in 1.5h".

2. PREDICTIONS
   └─ DeepAR model predicts demand surge to 108 kW (peak 115 kW).
   └─ Wind speed tapering from 9.2 m/s to 5.1 m/s (generation dropping to 22 kW).

3. CRISIS & RISK (Signature Intelligence Screen)
   └─ Visualizes the 78% HIGH RISK circular gauge with pulsing glow.
   └─ Highlights expected deficit of 33 kW at 15:30 UTC.
   └─ Diagnoses 3 root causes: Increasing Demand, Low Renewables, Declining Reserves.
   └─ Recommends: Defer Auxiliary Equipment (10 kW) + Dim Walkway Lighting (6 kW).
   └─ User clicks: [ TEST RESPONSE IN WHAT-IF ]

4. WHAT-IF OPTIMIZATION
   └─ Automatically pre-selects Auxiliary Equipment + Dim Lighting.
   └─ User clicks: [ SIMULATE IMPACT ]
   └─ On-the-fly math: Demand drops 90 kW → 84 kW (-6 kW).
   └─ Risk decreases 78% → 42% (MEDIUM). Survival extends 4.0h → 5.2h (+1.2h).
   └─ Critical loads touched = NO.
   └─ User clicks: [ REVIEW SAFETY GUARDIAN APPROVAL → ]

5. SAFETY GUARDIAN
   └─ Evaluates proposed dispatch against Polar Safety Protocol LS-104.
   └─ Checklist: Equipment Critical = NO, Within Limits = PASS, Status = PERMITTED.
   └─ User clicks: [ APPROVE ACTION & APPLY ]
   └─ Confirmation modal requests operator digital signature.
   └─ User confirms:
      • State mutates: Demand drops to 84 kW, Risk drops to 42%.
      • Success toast displays: "✓ Safety check completed."
      • New event is recorded to Station History.
      • Automatic transition to History page.

6. HISTORY & BLACKBOX LOGS
   └─ The newly approved action appears at the top of the audit log:
      "LOG-XXXX: Operator Action Authorized & Applied - Cmdr. Elena Vance".
```

---

## 6. How Charts & Visualizations Render Statically

The application uses **zero third-party charting libraries** (no Chart.js, no D3.js). All charts are custom-built inside `frontend/js/charts/` using pure **Scalable Vector Graphics (SVG)**.

### A. Line & Spline Charts (`demand-chart.js`, `renewable-chart.js`)
Smooth curves are drawn using SVG Cubic Bézier curves (`C` path commands) calculated dynamically from data arrays:
```javascript
// Calculates coordinate mapping:
const getX = (i) => padLeft + (i / (data.hours.length - 1)) * plotWidth;
const getY = (val) => padTop + plotHeight - ((val - min) / (max - min)) * plotHeight;

// Builds smooth SVG path:
let path = `M ${getX(0)} ${getY(data[0])}`;
for (let i = 1; i < data.length; i++) {
  const midX = (getX(i - 1) + getX(i)) / 2;
  path += ` C ${midX} ${getY(data[i - 1])}, ${midX} ${getY(data[i])}, ${getX(i)} ${getY(data[i])}`;
}
```

### B. Deficit Region Shading (`supply-demand-chart.js`)
The region where predicted demand exceeds available supply is filled with an SVG diagonal pattern (`#deficitPattern`) and animated red opacity to highlight the 33 kW deficit window.

### C. Circular 78% Risk Gauge (`risk-chart.js`)
Uses the SVG circle circumference formula:
$$\text{Circumference} = 2 \times \pi \times r = 2 \times 3.14159 \times 90 \approx 565.48$$
$$\text{Stroke Dashoffset} = 565.48 - \left(\frac{78}{100} \times 565.48\right) = 124.4$$
CSS transitions animate the stroke around the circle with a glowing radial shadow.

---

## 7. Component & Page Lifecycle

1. **Lazy Initialization for Modals & Toasts**:
   Components like `modal.js` and `toast.js` use lazy getter proxies. They do not query the DOM until the first modal or toast is triggered, preventing any timing errors.
2. **Safe Safeguard Interlocks**:
   If a user tries to simulate an unsafe action (e.g., tripping the Habitat Main Heater in -20°C weather via the preset in What-If), Safety Guardian detects `equipmentCritical: true`, switches to **`BLOCKED`**, disables the Approve button, and displays the life-safety violation code.

---

## 8. Connecting Real Backends (FastAPI / Node.js)

When you are ready to connect a real backend:

### Step 1: Replace Mock Functions in `frontend/js/api.js`
Replace the mock returns with `fetch()` calls:
```javascript
// BEFORE (Mock):
async getStationState() {
  await this._mockDelay(150);
  return window.ecoState.getState();
}

// AFTER (Real FastAPI or Express):
async getStationState() {
  const response = await fetch("http://localhost:8000/api/station/telemetry");
  return await response.json();
}
```

### Step 2: Replace AI Simulation Calls
```javascript
// Real AI Model Inference Endpoint:
async runWhatIf(actions) {
  const response = await fetch("http://localhost:8000/api/ai/what-if", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(actions)
  });
  return await response.json();
}
```
**No HTML or CSS changes are required.** The frontend will immediately display live backend data.

---

## 9. How to Run the Website

### Method 1: Local HTTP Server (Recommended)
Open a terminal in the project directory:

```bash
# Using Python:
cd "c:\Users\Gopi Kannan\Documents\EcoAlert-Polar\frontend"
python -m http.server 8080
```
Open **`http://localhost:8080`** in Google Chrome, Microsoft Edge, or Mozilla Firefox.

### Method 2: Direct File Open
You can also open [`frontend/index.html`](frontend/index.html) directly in any browser by double-clicking the file in Windows Explorer. All resources, SVGs, styles, and templates are completely self-contained.
