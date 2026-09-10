/**
 * EcoAlert Polar - Sidebar Navigation Component
 */

class EcoSidebar {
  constructor() {
    this.navItems = [
      { id: "overview", label: "Overview", icon: "activity" },
      { id: "predictions", label: "Predictions", icon: "trending-up" },
      { id: "crisis-risk", label: "Crisis & Risk", icon: "alert-triangle", hasRiskBadge: true },
      { id: "loads", label: "Loads", icon: "zap" },
      { id: "digital-twin", label: "Digital Twin", icon: "cpu" },
      { id: "safety", label: "Safety & Approval", icon: "shield", hasPendingBadge: true },
      { id: "history", label: "History / Logs", icon: "clock" }
    ];

    this.sidebarEl = document.getElementById("sidebar");
    this.backdropEl = document.getElementById("sidebar-backdrop");
    this.mobileToggleBtn = document.getElementById("mobile-menu-toggle");

    this.render();
    this.bindEvents();

    // Subscribe to state to update badges
    window.ecoState.subscribe("risk", () => this.updateBadges());
    window.ecoState.subscribe("uiState", () => this.updateBadges());
  }

  getIconSvg(name) {
    const icons = {
      "activity": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
      "trending-up": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
      "alert-triangle": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      "zap": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      "cpu": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`,
      "shield": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      "clock": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
    };
    return icons[name] || icons["activity"];
  }

  render() {
    if (!this.sidebarEl) return;

    this.sidebarEl.innerHTML = `
      <!-- Brand & Polar Logo -->
      <div class="sidebar-brand">
        <a href="#overview" class="brand-wrapper">
          <img src="assets/logo/logo.svg" alt="EcoAlert Polar Logo" class="brand-logo-img" />
          <div class="brand-text">
            <span class="brand-title">ECOALERT</span>
            <span class="brand-subtitle">POLAR</span>
          </div>
        </a>
      </div>

      <!-- System Status Pill -->
      <div class="sidebar-status-card">
        <div class="status-left">
          <span class="status-dot live"></span>
          <span class="tech-label" style="color: var(--text-main); font-weight: 700;">SYSTEM STATUS</span>
        </div>
        <div class="status-station-tag">MAIN STATION</div>
      </div>

      <!-- Navigation Section -->
      <nav class="sidebar-nav" aria-label="Main Navigation">
        <div class="nav-label">COMMAND & INTELLIGENCE</div>
        ${this.navItems.map(item => `
          <a href="#${item.id}" class="nav-item" data-page="${item.id}" id="nav-${item.id}">
            <div class="nav-item-content">
              <span class="nav-icon">${this.getIconSvg(item.icon)}</span>
              <span>${item.label}</span>
            </div>
            ${item.hasRiskBadge ? `<span class="nav-badge-risk" id="badge-nav-risk">HIGH</span>` : ''}
            ${item.hasPendingBadge ? `<span class="nav-badge-pending" id="badge-nav-pending">1 PENDING</span>` : ''}
          </a>
        `).join('')}
      </nav>

      <!-- Sidebar Footer -->
      <div class="sidebar-footer">
        <div class="system-tag">
          <span class="system-version">SYSTEM v1.0.0</span>
          <span class="simulation-ready-tag">● READY</span>
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);">
          Antarctic Energy AI Core
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Nav links click
    const links = this.sidebarEl.querySelectorAll(".nav-item");
    links.forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const pageId = link.getAttribute("data-page");
        if (window.ecoNav) {
          window.ecoNav.navigateTo(pageId);
        }
        this.closeDrawer();
      });
    });

    // Mobile drawer toggle
    if (this.mobileToggleBtn) {
      this.mobileToggleBtn.addEventListener("click", () => this.toggleDrawer());
    }

    if (this.backdropEl) {
      this.backdropEl.addEventListener("click", () => this.closeDrawer());
    }
  }

  setActive(pageId) {
    const items = this.sidebarEl.querySelectorAll(".nav-item");
    items.forEach(item => {
      if (item.getAttribute("data-page") === pageId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  updateBadges() {
    const state = window.ecoState.getState();
    const riskBadge = document.getElementById("badge-nav-risk");
    if (riskBadge) {
      if (state.risk.level === "HIGH" || state.risk.level === "CRITICAL") {
        riskBadge.style.display = "inline-block";
        riskBadge.textContent = state.risk.level;
      } else {
        riskBadge.style.display = "none";
      }
    }

    const pendingBadge = document.getElementById("badge-nav-pending");
    if (pendingBadge) {
      const count = state.uiState.pendingApprovalCount;
      if (count > 0) {
        pendingBadge.style.display = "inline-block";
        pendingBadge.textContent = `${count} PENDING`;
      } else {
        pendingBadge.style.display = "none";
      }
    }
  }

  toggleDrawer() {
    this.sidebarEl.classList.toggle("drawer-open");
    if (this.backdropEl) this.backdropEl.classList.toggle("active");
  }

  closeDrawer() {
    this.sidebarEl.classList.remove("drawer-open");
    if (this.backdropEl) this.backdropEl.classList.remove("active");
  }
}

window.EcoSidebar = EcoSidebar;
