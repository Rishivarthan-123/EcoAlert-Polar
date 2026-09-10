/**
 * EcoAlert Polar - Safety Guardian Page Controller
 */

class EcoSafetyPage {
  constructor() {
    this.initialized = false;
  }

  mount() {
    this.renderProposal();
    this.bindButtons();
    this.initialized = true;
  }

  renderProposal() {
    const safetyState = window.ecoState.getState("safety");
    const proposal = safetyState.currentProposal;

    const titleEl = document.getElementById("safety-action-title");
    const idEl = document.getElementById("safety-proposal-id");
    const checkEq = document.getElementById("check-equipment-critical");
    const checkLimits = document.getElementById("check-safety-limits");
    const finalBox = document.getElementById("safety-final-status-box");
    const finalText = document.getElementById("safety-final-status-text");
    const finalDesc = document.getElementById("safety-final-status-desc");
    const emojiEl = document.getElementById("safety-status-emoji");
    const approveBtn = document.getElementById("btn-approve-safety-action");
    const rejectBtn = document.getElementById("btn-reject-safety-action");

    if (titleEl) titleEl.textContent = proposal.title;
    if (idEl) idEl.textContent = proposal.id;

    if (proposal.finalStatus === "BLOCKED") {
      // Show BLOCKED state
      if (checkEq) {
        checkEq.className = "badge badge-critical";
        checkEq.textContent = "YES (CRITICAL VIOLATION)";
      }
      if (checkLimits) {
        checkLimits.className = "badge badge-critical";
        checkLimits.textContent = "FAIL (EXCEEDS LIMITS)";
      }
      if (finalBox) {
        finalBox.style.background = "rgba(255, 92, 122, 0.15)";
        finalBox.style.borderColor = "rgba(255, 92, 122, 0.5)";
      }
      if (finalText) {
        finalText.textContent = "BLOCKED";
        finalText.style.color = "var(--critical-red)";
      }
      if (finalDesc) {
        finalDesc.textContent = proposal.blockedReason || "Action violates polar habitat thermal survival minimums. Dispatched automatically rejected.";
      }
      if (emojiEl) emojiEl.textContent = "⛔";

      if (approveBtn) {
        approveBtn.disabled = true;
        approveBtn.classList.add("disabled");
        approveBtn.innerHTML = `⛔ ACTION INTERLOCKED & BLOCKED`;
      }

      // Show Blocked Toast
      window.ecoToast.danger("Safety Block", "⛔ Action blocked by Safety Guardian life safety interlocks.");
    } else {
      // Show PERMITTED state
      if (checkEq) {
        checkEq.className = "badge badge-safe";
        checkEq.textContent = "NO (PASS)";
      }
      if (checkLimits) {
        checkLimits.className = "badge badge-safe";
        checkLimits.textContent = "PASS";
      }
      if (finalBox) {
        finalBox.style.background = "rgba(57, 230, 165, 0.12)";
        finalBox.style.borderColor = "rgba(57, 230, 165, 0.4)";
      }
      if (finalText) {
        finalText.textContent = "PERMITTED";
        finalText.style.color = "var(--success-aurora)";
      }
      if (finalDesc) {
        finalDesc.textContent = "Action satisfies all polar electrical and safety codes. Awaiting operator signature.";
      }
      if (emojiEl) emojiEl.textContent = "✓";

      if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.classList.remove("disabled");
        approveBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          APPROVE ACTION & APPLY
        `;
      }
    }
  }

  bindButtons() {
    const approveBtn = document.getElementById("btn-approve-safety-action");
    const rejectBtn = document.getElementById("btn-reject-safety-action");

    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        const safetyState = window.ecoState.getState("safety");
        const proposal = safetyState.currentProposal;

        if (proposal.finalStatus === "BLOCKED") {
          window.ecoModal.showBlockedModal(proposal.blockedReason);
          return;
        }

        // Open Confirmation Dialog
        window.ecoModal.open({
          title: "Authorize Grid Dispatch Action",
          icon: "🛡️",
          bodyHtml: `
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <p style="font-size: 0.9rem; color: var(--text-main); line-height: 1.45;">
                You are about to authorize the following dispatch mitigation:
              </p>
              <div style="background: rgba(7, 17, 31, 0.8); border: 1px solid var(--border-highlight); padding: 14px 18px; border-radius: 8px;">
                <div style="font-weight: 700; color: var(--text-highlight); font-size: 0.95rem;">${proposal.title}</div>
                <div class="mono-val" style="color: var(--success-aurora); font-size: 0.85rem; margin-top: 4px;">
                  Grid Load Reduction: +${proposal.expectedSavingKw} kW
                </div>
              </div>
              <p style="font-size: 0.82rem; color: var(--text-secondary);">
                Digital Signature: <strong style="color: var(--primary-cyan);">Cmdr. Elena Vance (Level 4 Life Support Admin)</strong>
              </p>
            </div>
          `,
          buttons: [
            { text: "Cancel", className: "btn-secondary" },
            {
              text: "Confirm & Apply",
              className: "btn-success",
              onClick: async () => {
                const res = await window.ECO_API.approveAction(proposal);

                // Update timeline UI
                const step4 = document.getElementById("step-operator-approval");
                const step5 = document.getElementById("step-action-log");
                if (step4) { step4.className = "timeline-step completed"; }
                if (step5) { step5.className = "timeline-step active completed"; }

                window.ecoToast.success("Action Applied", "✓ Safety check completed. Action logged into Station History.");

                // Provide direct route to History
                setTimeout(() => {
                  if (window.ecoNav) window.ecoNav.navigateTo("history");
                }, 1200);
              }
            }
          ]
        });
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        window.ecoToast.warning("Action Rejected", "Recommendation rejected by operator. Grid baseline maintained.");
      });
    }
  }
}

window.EcoSafetyPage = EcoSafetyPage;
