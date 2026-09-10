/**
 * EcoAlert Polar - History & Logs Page Controller
 */

class EcoHistoryPage {
  constructor() {
    this.initialized = false;
    this.filters = {
      search: "",
      category: "ALL",
      severity: "ALL"
    };
  }

  mount() {
    this.renderLogs();
    this.bindEvents();
    this.initialized = true;
  }

  async renderLogs() {
    const tbody = document.getElementById("history-table-body");
    if (!tbody) return;

    const logs = await window.ECO_API.getHistory(this.filters);

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No history log entries match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const sevBadge = this.getSeverityBadge(log.severity);

      return `
        <tr>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; color: var(--primary-cyan);">${log.id}</div>
            <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">${log.timestamp}</div>
          </td>
          <td>
            <strong style="color: var(--text-highlight);">${log.event}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${log.station}</div>
          </td>
          <td><span class="badge badge-cyan">${log.category}</span></td>
          <td>${sevBadge}</td>
          <td style="max-width: 320px; line-height: 1.4; font-size: 0.8rem; color: var(--text-secondary);">
            ${log.details}
          </td>
          <td>
            <div style="font-size: 0.82rem; font-weight: 600; color: var(--text-highlight);">${log.operator}</div>
          </td>
        </tr>
      `;
    }).join('');
  }

  getSeverityBadge(severity) {
    if (severity === "CRITICAL") return `<span class="badge badge-critical"><span class="status-dot critical"></span> CRITICAL</span>`;
    if (severity === "WARNING") return `<span class="badge badge-warning"><span class="status-dot warning"></span> WARNING</span>`;
    return `<span class="badge badge-safe"><span class="status-dot live"></span> INFO</span>`;
  }

  bindEvents() {
    const searchInput = document.getElementById("history-search-input");
    const catSelect = document.getElementById("history-category-select");
    const sevSelect = document.getElementById("history-severity-select");
    const resetBtn = document.getElementById("btn-reset-history-filters");
    const exportBtn = document.getElementById("btn-export-logs");

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.filters.search = e.target.value;
        this.renderLogs();
      });
    }

    if (catSelect) {
      catSelect.addEventListener("change", (e) => {
        this.filters.category = e.target.value;
        this.renderLogs();
      });
    }

    if (sevSelect) {
      sevSelect.addEventListener("change", (e) => {
        this.filters.severity = e.target.value;
        this.renderLogs();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        this.filters = { search: "", category: "ALL", severity: "ALL" };
        if (searchInput) searchInput.value = "";
        if (catSelect) catSelect.value = "ALL";
        if (sevSelect) sevSelect.value = "ALL";
        this.renderLogs();
        window.ecoToast.info("Filters Reset", "Viewing all station logs.");
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener("click", async () => {
        const logs = await window.ECO_API.getHistory();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
        const dlAnchor = document.createElement("a");
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `ecoalert-polar-audit-log-${Date.now()}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
        window.ecoToast.success("Export Complete", "Station audit logs exported as JSON.");
      });
    }
  }
}

window.EcoHistoryPage = EcoHistoryPage;
