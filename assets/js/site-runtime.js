(function () {
  const config = window.JAPAN_TRAVEL_CONFIG || {};
  const consentKey = "jt_cookie_consent";

  function bySel(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }
  function safeText(node, text) {
    if (node) node.textContent = text;
  }
  function getConsent() {
    try { return localStorage.getItem(consentKey) === "accepted"; } catch (_) { return false; }
  }
  function setConsent(value) {
    try { localStorage.setItem(consentKey, value ? "accepted" : "declined"); } catch (_) {}
  }
  let csrfPromise = null;
  async function csrfToken() {
    if (!csrfPromise) {
      csrfPromise = fetch("/api/csrf.php", { credentials: "same-origin", cache: "no-store" })
        .then((res) => res.ok ? res.json() : Promise.reject(new Error("csrf")))
        .then((json) => json.csrf_token || "");
    }
    return csrfPromise;
  }
  function track(type, payload = {}) {
    if (!config.analyticsEndpoint) return;
    const data = JSON.stringify({
      type,
      page: location.pathname,
      language: document.body.dataset.lang || "",
      at: new Date().toISOString(),
      ...payload
    });
    try { navigator.sendBeacon?.(config.analyticsEndpoint, data); } catch (_) {}
  }
  function initCookieBanner() {
    if (getConsent()) {
      maybeLoadPixels();
      return;
    }
    const box = document.createElement("div");
    box.className = "cookie";
    box.innerHTML = '<p>Analytics cookies are optional. Meta/TikTok pixels load only after consent.</p><button type="button" data-accept>Accept</button><button type="button" data-decline>Decline</button>';
    document.body.appendChild(box);
    box.addEventListener("click", (event) => {
      if (event.target.matches("[data-accept]")) {
        setConsent(true);
        box.remove();
        maybeLoadPixels();
      }
      if (event.target.matches("[data-decline]")) {
        setConsent(false);
        box.remove();
      }
    });
  }
  function maybeLoadPixels() {
    if (!getConsent()) return;
    if (config.metaPixelId) track("MetaPixelReady", { configured: true });
    if (config.tiktokPixelId) track("TikTokPixelReady", { configured: true });
  }
  function initSocial() {
    const map = {
      instagramUrl: ["Instagram", config.instagramUrl],
      tiktokUrl: ["TikTok", config.tiktokUrl],
      lineUrl: ["LINE", config.lineUrl]
    };
    bySel("[data-social]").forEach((slot) => {
      const [name, url] = map[slot.dataset.social] || [];
      if (!url) return;
      const a = document.createElement("a");
      a.href = url;
      a.textContent = name;
      a.rel = "noopener noreferrer";
      a.target = "_blank";
      slot.replaceWith(a);
    });
  }
  function initSearch() {
    bySel(".search").forEach((input) => {
      const scope = input.closest(".page, .section, main") || document;
      input.addEventListener("input", () => {
        const q = input.value.trim().toLowerCase();
        bySel("[data-search]", scope).forEach((node) => {
          const hit = !q || node.dataset.search.toLowerCase().includes(q);
          node.hidden = !hit;
        });
      });
    });
    bySel("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        const scope = button.closest(".page, .section, main") || document;
        const key = button.dataset.filter;
        bySel("[data-region]", scope).forEach((node) => {
          node.hidden = key !== "all" && node.dataset.region !== key;
        });
      });
    });
  }
  function initForms() {
    bySel("[data-enhanced-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = form.querySelector("[data-form-status]");
        const data = new FormData(form);
        data.set("source_url", location.href);
        data.set("idempotency_key", crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
        data.set("csrf_token", await csrfToken());
        safeText(status, "Sending...");
        try {
          const res = await fetch(form.action, { method: "POST", body: data, credentials: "same-origin" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.message || "failed");
          safeText(status, json.message || "Inquiry received, but the reservation is not confirmed yet.");
          form.reset();
          track("Lead", { request_id: json.request_id || "" });
        } catch (_) {
          safeText(status, "The inquiry backend is not configured or is unavailable. No reservation has been confirmed.");
        }
      });
    });
    bySel("[data-member-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = form.querySelector("[data-member-status]");
        safeText(status, "Processing...");
        try {
          const data = new FormData(form);
          data.set("csrf_token", await csrfToken());
          const token = new URLSearchParams(location.search).get("token");
          if (token && !data.get("token")) data.set("token", token);
          if (data.get("action") === "reset-password" && data.get("token") && data.get("password")) {
            data.set("action", "reset-confirm");
          }
          const res = await fetch(form.action, { method: "POST", body: data, credentials: "same-origin" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error("failed");
          safeText(status, json.message || "Please check the next step in your email.");
          track("SignUp", {});
        } catch (_) {
          safeText(status, "Member backend is unavailable or not configured. Sensitive data was not stored in the browser.");
        }
      });
    });
  }
  document.addEventListener("click", (event) => {
    const rezio = event.target.closest("[data-server-rezio]");
    if (rezio) track("RezioClick", { product_key: rezio.dataset.serverRezio });
  });

  initSocial();
  initSearch();
  initForms();
  initCookieBanner();
  track(document.body.dataset.page?.startsWith("spots/") ? "ViewSpot" : document.body.dataset.page?.startsWith("routes/") ? "ViewRoute" : "PageView");
})();
