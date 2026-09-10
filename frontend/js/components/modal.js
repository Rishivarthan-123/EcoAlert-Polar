/**
 * EcoAlert Polar - Modal Dialog System
 */

class EcoModal {
  constructor() {
    this.ensureDom();
  }

  ensureDom() {
    let backdrop = document.getElementById("global-modal-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "global-modal-backdrop";
      backdrop.className = "modal-backdrop";
      if (document.body) {
        document.body.appendChild(backdrop);
      }
    }
    this.backdrop = backdrop;

    this.backdrop.innerHTML = `
      <div class="modal-dialog" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title-row">
            <span id="modal-icon" style="font-size: 1.2rem;">⚡</span>
            <h3 class="modal-title" id="modal-title">System Notice</h3>
          </div>
          <button class="modal-close-btn" id="modal-close-btn" aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body" id="modal-body"></div>
        <div class="modal-footer" id="modal-footer"></div>
      </div>
    `;

    this.titleEl = document.getElementById("modal-title");
    this.iconEl = document.getElementById("modal-icon");
    this.bodyEl = document.getElementById("modal-body");
    this.footerEl = document.getElementById("modal-footer");
    this.closeBtn = document.getElementById("modal-close-btn");

    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.close());
    }
    if (this.backdrop) {
      this.backdrop.addEventListener("click", (e) => {
        if (e.target === this.backdrop) this.close();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.backdrop && this.backdrop.classList.contains("open")) {
        this.close();
      }
    });
  }

  open({ title, icon = "⚡", bodyHtml, buttons = [] }) {
    if (!this.titleEl) this.ensureDom();
    if (this.titleEl) this.titleEl.textContent = title;
    if (this.iconEl) this.iconEl.textContent = icon;
    if (this.bodyEl) this.bodyEl.innerHTML = bodyHtml;
    if (this.footerEl) {
      this.footerEl.innerHTML = "";
      buttons.forEach(btnConfig => {
        const btn = document.createElement("button");
        btn.className = `btn ${btnConfig.className || 'btn-secondary'}`;
        btn.textContent = btnConfig.text;
        btn.addEventListener("click", () => {
          if (btnConfig.onClick) btnConfig.onClick();
          if (btnConfig.autoClose !== false) this.close();
        });
        this.footerEl.appendChild(btn);
      });
    }

    if (this.backdrop) {
      this.backdrop.classList.add("open");
    }
  }

  close() {
    if (this.backdrop) {
      this.backdrop.classList.remove("open");
    }
  }

  showBlockedModal(reason) {
    this.open({
      title: "Action Blocked by Safety Guardian",
      icon: "⛔",
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(255, 92, 122, 0.12); border: 1px solid rgba(255, 92, 122, 0.35); padding: 14px 18px; border-radius: 8px;">
            <div style="font-weight: 700; color: var(--critical-red); margin-bottom: 4px; font-family: var(--font-mono);">
              SAFETY PROTOCOL INTERLOCK ACTIVE
            </div>
            <p style="color: var(--text-main); font-size: 0.88rem; line-height: 1.45;">
              ${reason}
            </p>
          </div>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">
            Antarctic Station Rule: Life-support and primary heating loads cannot be automatically disconnected or reduced below survival thresholds without explicit multi-officer override keys.
          </p>
        </div>
      `,
      buttons: [
        { text: "Acknowledge & Return", className: "btn-secondary", onClick: () => {} }
      ]
    });
  }

  showReasonModal(load) {
    this.open({
      title: `AI Prioritization Rationale: ${load.name}`,
      icon: "🧠",
      bodyHtml: `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(7, 17, 31, 0.6); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div class="tech-label">Current Priority</div>
              <div style="margin-top: 4px;"><span class="badge ${load.currentPriority === 'CRITICAL' ? 'badge-critical' : 'badge-cyan'}">${load.currentPriority}</span></div>
            </div>
            <div style="background: rgba(7, 17, 31, 0.6); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-subtle);">
              <div class="tech-label">Recommended Priority</div>
              <div style="margin-top: 4px;"><span class="badge ${load.recommendedPriority === 'CRITICAL' ? 'badge-critical' : load.recommendedPriority === 'NON-CRITICAL' ? 'badge-violet' : 'badge-cyan'}">${load.recommendedPriority}</span></div>
            </div>
          </div>

          <div style="background: rgba(16, 31, 51, 0.7); border: 1px solid var(--border-highlight); padding: 14px 16px; border-radius: 8px;">
            <div class="tech-label" style="color: var(--primary-cyan); margin-bottom: 6px;">AI RATIONALE ANALYSIS</div>
            <p style="color: var(--text-main); line-height: 1.5; font-size: 0.88rem;">
              ${load.reason}
            </p>
          </div>

          <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
            Rated Load Draw: <strong style="color: var(--text-highlight);">${load.powerKw} kW</strong> &bull; Schedulable: <strong style="color: ${load.canShed ? 'var(--success-aurora)' : 'var(--critical-red)'};">${load.canShed ? 'YES' : 'NO (LOCKED)'}</strong>
          </div>
        </div>
      `,
      buttons: [
        { text: "Close", className: "btn-secondary" }
      ]
    });
  }
}

// Lazy Singleton Proxy ensuring zero initialization timing errors
window.ecoModal = {
  get _instance() {
    if (!this.__inst) {
      this.__inst = new EcoModal();
    }
    return this.__inst;
  },
  open(opts) {
    return this._instance.open(opts);
  },
  close() {
    return this._instance.close();
  },
  showBlockedModal(reason) {
    return this._instance.showBlockedModal(reason);
  },
  showReasonModal(load) {
    return this._instance.showReasonModal(load);
  }
};
