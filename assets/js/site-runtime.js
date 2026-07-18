(function () {
  const config = window.JAPAN_TRAVEL_CONFIG || {};

  function showMessage(target, text) {
    const box = target.closest("section, .panel, .card")?.querySelector("[data-message]");
    if (box) box.textContent = text;
  }

  function resolveRezio(button) {
    const key = button.dataset.rezioKey;
    const routeUrls = config.rezioRouteUrls || {};
    const productUrls = config.rezioProductUrls || {};
    return routeUrls[key] || productUrls[key] || config.rezioDefaultUrl || "";
  }

  document.addEventListener("click", async (event) => {
    const rezio = event.target.closest("[data-rezio-key]");
    if (rezio) {
      event.preventDefault();
      const url = resolveRezio(rezio);
      if (!url) {
        showMessage(rezio, rezio.dataset.unconfigured || "Reservation link is not configured yet.");
        return;
      }
      if (config.analyticsEndpoint) {
        try {
          navigator.sendBeacon?.(
            config.analyticsEndpoint,
            JSON.stringify({ type: "rezio_redirect_attempt", key: rezio.dataset.rezioKey, at: new Date().toISOString() })
          );
        } catch (_) {}
      }
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const gated = event.target.closest("[data-requires-login]");
    if (gated) {
      event.preventDefault();
      showMessage(gated, gated.dataset.loginMessage || "Please sign in to use this member feature.");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-member-form]");
    if (!form) return;
    event.preventDefault();
    const message = form.querySelector("[data-message]");
    const endpoint = config.memberApiBase ? `${config.memberApiBase.replace(/\/$/, "")}/join` : "";
    if (!endpoint) {
      if (message) message.textContent = form.dataset.unconfigured || "Member API is not configured yet.";
      return;
    }
    if (message) message.textContent = form.dataset.sending || "Sending...";
    try {
      const body = Object.fromEntries(new FormData(form).entries());
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("request_failed");
      if (message) message.textContent = form.dataset.sent || "Please check your email.";
      form.reset();
    } catch (_) {
      if (message) message.textContent = form.dataset.failed || "Unable to process now. Please try again later.";
    }
  });
})();
