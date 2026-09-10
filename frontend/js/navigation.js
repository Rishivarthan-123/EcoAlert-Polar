/**
 * EcoAlert Polar - Navigation & Routing Engine
 * Handles seamless view transitions, URL hash routing, and page controller lifecycles.
 */

class EcoNavigation {
  constructor() {
    this.pageConfigs = {
      "overview": {
        title: "Polar Station Energy Overview",
        breadcrumb: "Overview",
        controller: () => new window.EcoOverviewPage()
      },
      "predictions": {
        title: "AI Energy Demand & Generation Predictions",
        breadcrumb: "Predictions",
        controller: () => new window.EcoPredictionsPage()
      },
      "crisis-risk": {
        title: "Polar Energy Crisis Intelligence & Threat Assessment",
        breadcrumb: "Crisis & Risk",
        controller: () => new window.EcoCrisisRiskPage()
      },
      "loads": {
        title: "Adaptive Load Prioritization & Shedding Matrix",
        breadcrumb: "Loads",
        controller: () => new window.EcoLoadsPage()
      },
      "digital-twin": {
        title: "Polar Station Digital Twin & Scenario Simulator",
        breadcrumb: "Digital Twin",
        controller: () => new window.EcoDigitalTwinPage()
      },
      "safety": {
        title: "Safety Guardian Life-Safety & Authorization Gateway",
        breadcrumb: "Safety & Approval",
        controller: () => new window.EcoSafetyPage()
      },
      "history": {
        title: "System Telemetry History & Blackbox Audit Logs",
        breadcrumb: "History / Logs",
        controller: () => new window.EcoHistoryPage()
      }
    };

    this.activePage = null;
    this.controllers = new Map();
    this.initHashListener();
  }

  initHashListener() {
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.replace("#", "") || "overview";
      this.navigateTo(hash);
    });
  }

  navigateTo(pageId, params = {}) {
    if (!this.pageConfigs[pageId]) {
      pageId = "overview";
    }

    const config = this.pageConfigs[pageId];

    // Hide all view elements
    const allViews = document.querySelectorAll(".page-view");
    allViews.forEach(v => v.classList.remove("active"));

    // Activate current view element
    const currentView = document.getElementById(`view-${pageId}`);
    if (currentView) {
      currentView.classList.add("active");
    }

    // Update Header Title & Breadcrumb
    if (window.ecoHeader) {
      window.ecoHeader.updateTitle(config.title, config.breadcrumb);
    }

    // Update Sidebar active state
    if (window.ecoSidebar) {
      window.ecoSidebar.setActive(pageId);
    }

    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Update URL hash without re-triggering listener
    if (window.location.hash !== `#${pageId}`) {
      window.history.pushState(null, "", `#${pageId}`);
    }

    // Instantiate / Mount page controller
    if (!this.controllers.has(pageId)) {
      this.controllers.set(pageId, config.controller());
    }
    const controller = this.controllers.get(pageId);
    if (controller && typeof controller.mount === "function") {
      controller.mount(params);
    }

    this.activePage = pageId;

    // Update state
    window.ecoState.updateSlice("uiState", { activePage: pageId });
  }
}

window.EcoNavigation = EcoNavigation;
