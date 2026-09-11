/**
 * EcoAlert Polar - Loads Page Controller
 * Displays AI Load Prioritization Table with dynamic AI Actions and Rationale reasons.
 */

class EcoLoadsPage {
  constructor() {
    this.initialized = false;
    this.analysisInProgress = false;
  }

  async mount() {
    this.renderTable();
    this.bindSubscriptions();
    this.initialized = true;

    // Load dynamic AI load analysis from backend ML service
    await this.fetchAILoadAnalysis();
  }

  bindSubscriptions() {
    window.ecoState.subscribe("loads", () => this.renderTable());
    window.ecoState.subscribe("station", () => {
      this.fetchAILoadAnalysis();
    });
  }

  async fetchAILoadAnalysis() {
    if (this.analysisInProgress) return;
    this.analysisInProgress = true;

    try {
      if (window.ECO_API && typeof window.ECO_API.getLoadPriorities === "function") {
        const aiLoads = await window.ECO_API.getLoadPriorities();
        if (Array.isArray(aiLoads) && aiLoads.length > 0) {
          window.ecoState.setState(prev => ({
            ...prev,
            loads: aiLoads
          }));
        }
      }
    } catch (err) {
      console.warn("AI Load Analysis fetch warning:", err);
    } finally {
      this.analysisInProgress = false;
      this.renderTable();
    }
  }

  renderTable() {
    const tbody = document.getElementById("loads-table-body");
    if (!tbody) return;

    const loads = window.ecoState.getState("loads") || [];

    tbody.innerHTML = loads.map(load => {
      const currentBadge = this.getPriorityBadge(load.currentPriority || load.priority || "ESSENTIAL");
      const recBadge = this.getPriorityBadge(load.recommendedPriority || load.priority || "ESSENTIAL");
      const actionBadge = this.getActionBadge(load.action || load.status || (load.canShed ? "REDUCE" : "PROTECT"));

      const reason = load.reason ||
        (load.critical ? "Critical station load — life support / safety system protected at 100% capacity." :
        load.canShed ? "Non-critical load — eligible for deferral or reduction during energy shortage." :
        "Essential station load — maintained under standard operating protocol.");

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="status-dot ${load.critical ? 'critical' : 'live'}"></span>
              <div>
                <strong style="color: var(--text-highlight);">
                  ${load.name}
                </strong>
                <div style="font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted);">
                  ${load.id}
                </div>
              </div>
            </div>
          </td>

          <td>
            <span class="tech-label" style="color: var(--text-secondary);">
              ${load.type || "System"}
            </span>
          </td>

          <td>
            <strong class="mono-val" style="font-size: 0.95rem; color: var(--text-highlight);">
              ${load.powerKw} kW
            </strong>
          </td>

          <td>
            ${currentBadge}
          </td>

          <td>
            ${recBadge}
          </td>

          <td style="max-width: 280px; line-height: 1.35; font-size: 0.8rem; color: var(--text-secondary);">
            ${reason}
          </td>

          <td>
            ${actionBadge}
          </td>

          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn-secondary btn-sm btn-view-reason" data-load-id="${load.id}">
                View Reason
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    this.bindRowButtons();
  }

  getPriorityBadge(priority) {
    const pStr = String(priority || "").toUpperCase();

    if (pStr === "CRITICAL" || pStr === "1") {
      return `<span class="badge badge-critical">CRITICAL</span>`;
    }

    if (pStr === "ESSENTIAL" || pStr === "2") {
      return `<span class="badge badge-cyan">ESSENTIAL</span>`;
    }

    return `<span class="badge badge-violet">NON-CRITICAL</span>`;
  }

  getActionBadge(action) {
    const act = String(action || "").toUpperCase();

    if (act === "PROTECT" || act === "PROTECTED") {
      return `<span class="badge badge-safe" style="color: var(--success-aurora); border-color: rgba(57, 230, 165, 0.4);">🛡️ PROTECT</span>`;
    }

    if (act === "MAINTAIN" || act === "MAINTAINED") {
      return `<span class="badge badge-cyan">⚙ MAINTAIN</span>`;
    }

    if (act === "REDUCE" || act === "REDUCED") {
      return `<span class="badge badge-warning">▼ REDUCE</span>`;
    }

    if (act === "DELAY" || act === "DEFER" || act === "DEFERRED") {
      return `<span class="badge badge-violet">⏱ DELAY</span>`;
    }

    return `<span class="badge badge-secondary">${act || "NO ACTION"}</span>`;
  }

  bindRowButtons() {
    const loads = window.ecoState.getState("loads") || [];

    document.querySelectorAll(".btn-view-reason").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-load-id");
        const found = loads.find(load => load.id === id);

        if (found && window.ecoModal && typeof window.ecoModal.showReasonModal === "function") {
          const enriched = {
            ...found,
            currentPriority: found.currentPriority || found.priority || "ESSENTIAL",
            recommendedPriority: found.recommendedPriority || found.priority || "ESSENTIAL",
            action: found.action || found.status || (found.canShed ? "REDUCE" : "PROTECT"),
            reason: found.reason ||
              (found.critical
                ? "Critical station service — life support / safety system protected at 100% capacity."
                : found.canShed
                ? "Non-critical load — eligible for deferral or reduction during energy shortage."
                : "Essential station load — maintained under standard operating protocol."),
            canShed: Boolean(found.canShed),
          };
          window.ecoModal.showReasonModal(enriched);
        }
      });
    });
  }
}

window.EcoLoadsPage = EcoLoadsPage;