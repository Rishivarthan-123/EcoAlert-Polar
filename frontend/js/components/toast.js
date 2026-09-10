/**
 * EcoAlert Polar - Toast Notification Component
 */

class EcoToast {
  constructor() {
    this.container = document.getElementById("toast-container");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
    }
  }

  show(type, title, message, durationMs = 4500) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let icon = "ℹ";
    if (type === "success") icon = "✓";
    if (type === "warning") icon = "⚠";
    if (type === "danger") icon = "⛔";

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    this.container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 350);
    }, durationMs);
  }

  success(title, message) {
    this.show("success", title, message);
  }

  warning(title, message) {
    this.show("warning", title, message);
  }

  danger(title, message) {
    this.show("danger", title, message);
  }

  info(title, message) {
    this.show("info", title, message);
  }
}

window.ecoToast = new EcoToast();
