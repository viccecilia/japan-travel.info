(function () {
  const config = window.JAPAN_TRAVEL_CONFIG || {};
  const i18n = window.JT_I18N || {};
  const memberText = i18n.member || {};
  const cookieText = i18n.cookie || {};
  const formText = i18n.form || {};
  const consentCookie = "jt_cookie_consent";
  const necessaryCookies = ["jt_visitor_id", "jt_ref_code", "jt_landing_page", "jt_language"];
  const analyticsCookies = ["jt_utm_source", "jt_utm_medium", "jt_utm_campaign", "jt_utm_content"];

  const bySel = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safeText = (node, text) => { if (node) node.textContent = text; };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  const lang = () => document.body.dataset.lang || "";
  const pagePath = () => location.pathname;
  function setCookie(name, value, days) {
    const maxAge = days ? `; Max-Age=${Math.floor(days * 86400)}` : "";
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}${maxAge}`;
  }
  function getCookie(name) {
    return document.cookie.split("; ").map((x) => x.split("=")).find(([k]) => decodeURIComponent(k) === name)?.[1] || "";
  }
  function deleteCookie(name) {
    document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
  function consentState() {
    const value = decodeURIComponent(getCookie(consentCookie));
    return value === "accepted" || value === "declined" ? value : "unset";
  }
  function analyticsAllowed() {
    return consentState() === "accepted";
  }
  function setConsent(state) {
    setCookie(consentCookie, state, 180);
    if (state !== "accepted") analyticsCookies.forEach(deleteCookie);
  }
  function visitorId() {
    let id = decodeURIComponent(getCookie("jt_visitor_id"));
    if (!id) {
      id = `vis_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
      setCookie("jt_visitor_id", id, 365);
    }
    return id;
  }
  function captureAttribution() {
    const params = new URLSearchParams(location.search);
    visitorId();
    const ref = params.get("ref_code");
    if (ref) setCookie("jt_ref_code", ref.replace(/[^a-z0-9_-]/gi, ""), 30);
    setCookie("jt_landing_page", location.pathname, 30);
    setCookie("jt_language", lang(), 30);
    if (analyticsAllowed()) {
      for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
        const value = params.get(key);
        if (value) setCookie(`jt_${key}`, value.slice(0, 120), 30);
      }
    }
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
    if (!analyticsAllowed() || !config.analyticsEndpoint) return;
    if (type === "Purchase") return;
    const data = JSON.stringify({
      type,
      page: pagePath(),
      language: lang(),
      visitor_id: visitorId(),
      at: new Date().toISOString(),
      ...payload
    });
    try { navigator.sendBeacon?.(config.analyticsEndpoint, data); } catch (_) {}
  }
  function loadScript(src, attrs = {}) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    document.head.appendChild(script);
  }
  function maybeLoadPixels() {
    if (!analyticsAllowed()) return;
    if (config.metaPixelId) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
      window.fbq("init", config.metaPixelId);
      window.fbq("track", "PageView");
    }
    if (config.tiktokPixelId) {
      window.TiktokAnalyticsObject = "ttq";
      const ttq = window.ttq = window.ttq || [];
      ttq.methods = ["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer = function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}; for (let i=0;i<ttq.methods.length;i++) ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.load = function(id){loadScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`)};
      ttq.load(config.tiktokPixelId);
      ttq.page();
    }
  }
  function initCookieBanner() {
    captureAttribution();
    const addSettings = () => {
      if (document.querySelector("[data-cookie-settings]")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cookie-settings";
      btn.dataset.cookieSettings = "1";
      btn.textContent = cookieText.settings || "Cookie settings";
      btn.addEventListener("click", () => showBanner(true));
      document.body.appendChild(btn);
    };
    const showBanner = (force = false) => {
      if (!force && consentState() !== "unset") return;
      document.querySelector(".cookie")?.remove();
      const box = document.createElement("div");
      box.className = "cookie";
      box.innerHTML = `<p>${esc(cookieText.message || "Analytics cookies are optional.")}</p><button type="button" data-accept>${esc(cookieText.accept || "Accept")}</button><button type="button" data-decline>${esc(cookieText.decline || "Decline")}</button>`;
      document.body.appendChild(box);
      box.addEventListener("click", (event) => {
        if (event.target.matches("[data-accept]")) {
          setConsent("accepted");
          captureAttribution();
          box.remove();
          maybeLoadPixels();
          track("ConsentAccepted");
        }
        if (event.target.matches("[data-decline]")) {
          setConsent("declined");
          box.remove();
        }
      });
    };
    addSettings();
    showBanner(false);
    maybeLoadPixels();
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
          node.hidden = q && !node.dataset.search.toLowerCase().includes(q);
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
  function rezioUrl(original, productKey) {
    const url = new URL(original, location.origin);
    const params = new URLSearchParams(location.search);
    url.searchParams.set("language", lang());
    url.searchParams.set("landing_page", decodeURIComponent(getCookie("jt_landing_page")) || location.pathname);
    url.searchParams.set("visitor_id", visitorId());
    const ref = decodeURIComponent(getCookie("jt_ref_code")) || params.get("ref_code") || "";
    if (ref) url.searchParams.set("ref_code", ref);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const live = params.get(key);
      const stored = analyticsAllowed() ? decodeURIComponent(getCookie(`jt_${key}`)) : "";
      const value = live || stored || (key === "utm_source" ? "japan-travel-info" : key === "utm_medium" ? "website" : key === "utm_campaign" ? "kansai-guide" : productKey);
      if (value) url.searchParams.set(key, value);
    }
    return url.href;
  }
  function initRezioLinks() {
    bySel("a[href^='/go/rezio/'],a[href*='/go/rezio/']").forEach((a) => {
      a.addEventListener("click", () => {
        const key = a.dataset.serverRezio || a.getAttribute("href").split("/").filter(Boolean).pop() || "";
        a.href = rezioUrl(a.getAttribute("href"), key);
        track("RezioClick", { product_key: key });
      });
    });
  }
  async function postMember(data) {
    data.set("csrf_token", await csrfToken());
    const res = await fetch("/api/member.php", { method: "POST", body: data, credentials: "same-origin" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) throw new Error(json.message || "failed");
    return json;
  }
  async function currentMember() {
    const res = await fetch("/api/member.php?action=current", { credentials: "same-origin", cache: "no-store" });
    return res.ok ? (await res.json()).member : null;
  }
  function renderList(items, fields, empty) {
    if (!items || !items.length) return `<p>${esc(empty)}</p>`;
    return `<div class="member-list">${items.map((item) => `<article class="mini-card">${fields.map((f) => `<p><strong>${esc(f)}:</strong> ${esc(item[f] ?? "")}</p>`).join("")}</article>`).join("")}</div>`;
  }
  async function renderMemberPanel(shell, member) {
    const slug = shell.dataset.memberPage;
    const panel = shell.querySelector("[data-member-panel]");
    if (!panel) return;
    const status = panel.querySelector("[data-member-status]");
    const content = panel.querySelector("[data-member-content]");
    if (!member) {
      safeText(status, memberText.signInFirst || "Please sign in first.");
      content.innerHTML = `<a class="btn primary" href="../login/">${esc(memberText.login || "Sign in")}</a>`;
      return;
    }
    safeText(status, `${member.email}${member.nickname ? ` · ${member.nickname}` : ""}`);
    if (slug === "dashboard") {
      content.innerHTML = `<a class="btn primary" href="profile/">${esc(memberText.profile || "Profile")}</a> <button class="btn" type="button" data-member-logout>${esc(memberText.logout || "Sign out")}</button>`;
      content.querySelector("[data-member-logout]").addEventListener("click", async () => {
        const data = new FormData();
        data.set("action", "logout");
        await postMember(data);
        location.href = "login/";
      });
      return;
    }
    if (slug === "profile") {
      content.innerHTML = `<form class="member-form" data-member-profile><label>${esc(memberText.nickname || "Nickname")}<input name="nickname" value="${esc(member.nickname || "")}" maxlength="80"></label><button class="btn primary">${esc(memberText.save || "Save")}</button></form>`;
      content.querySelector("form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        data.set("action", "profile");
        data.set("language", lang());
        await postMember(data);
        safeText(status, memberText.save || "Saved");
      });
      return;
    }
    const action = { favorites: "favorite-list", trips: "saved-trip-list", bookings: "booking-reference-list", referrals: "referral-summary", vip: "vip-summary" }[slug];
    if (!action) return;
    const data = new FormData();
    data.set("action", action);
    data.set("language", lang());
    const json = await postMember(data);
    if (slug === "favorites") {
      content.innerHTML = renderList(json.favorites, ["item_type", "item_id", "created_at"], memberText.empty || "No records yet.");
      content.insertAdjacentHTML("beforeend", `<form class="member-form" data-favorite-remove><input name="item_id" placeholder="spot id"><button class="btn">${esc(memberText.remove || "Remove")}</button></form>`);
      content.querySelector("[data-favorite-remove]").addEventListener("submit", async (event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        fd.set("action", "favorite-remove");
        fd.set("item_type", "spot");
        await postMember(fd);
        await renderMemberPanel(shell, member);
      });
    } else if (slug === "trips") {
      content.innerHTML = `<form class="member-form" data-trip-save><input name="title" value="Kansai route"><input type="hidden" name="payload_json" value='{"source":"member_page"}'><button class="btn primary">${esc(memberText.save || "Save")}</button></form>` + renderList(json.trips, ["title", "created_at", "updated_at"], memberText.empty || "No records yet.");
      content.querySelector("[data-trip-save]").addEventListener("submit", async (event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        fd.set("action", "saved-trip");
        await postMember(fd);
        await renderMemberPanel(shell, member);
      });
    } else if (slug === "bookings") {
      content.innerHTML = renderList(json.bookings, ["rezio_order_id", "status", "created_at"], memberText.empty || "No records yet.");
    } else if (slug === "referrals") {
      content.innerHTML = `<div class="member-list"><article class="mini-card"><p><strong>Code:</strong> ${esc(json.referral?.referral_code || "")}</p><p><strong>Clicks:</strong> ${esc(json.referral?.clicks || 0)}</p><p><strong>Valid orders:</strong> ${esc(json.referral?.valid_orders || 0)}</p></article></div>`;
    } else if (slug === "vip") {
      content.innerHTML = `<div class="member-list"><article class="mini-card"><p><strong>Tier:</strong> ${esc(json.vip?.tier || "Visitor")}</p><p><strong>Valid orders:</strong> ${esc(json.vip?.valid_orders || 0)}</p></article></div>` + renderList(json.vip?.history, ["tier", "reason", "created_at"], memberText.empty || "No records yet.");
    }
  }
  function initMember() {
    bySel("[data-member-form]").forEach((form) => {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = form.querySelector("[data-member-status]");
        safeText(status, formText.sending || "Processing...");
        try {
          const data = new FormData(form);
          const token = new URLSearchParams(location.search).get("token");
          if (token && !data.get("token")) data.set("token", token);
          if (data.get("action") === "reset-password" && data.get("token") && data.get("password")) data.set("action", "reset-confirm");
          const json = await postMember(data);
          safeText(status, json.message || (formText.received || "Done"));
        } catch (error) {
          safeText(status, error.message || (formText.failed || "Failed"));
        }
      });
    });
    bySel("[data-member-shell]").forEach(async (shell) => {
      const member = await currentMember();
      const profileInput = shell.querySelector("input[name='nickname']");
      if (member && profileInput && !profileInput.value) profileInput.value = member.nickname || "";
      await renderMemberPanel(shell, member);
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
        data.set("visitor_id", visitorId());
        data.set("ref_code", decodeURIComponent(getCookie("jt_ref_code")));
        data.set("csrf_token", await csrfToken());
        safeText(status, formText.sending || "Sending...");
        try {
          const res = await fetch(form.action, { method: "POST", body: data, credentials: "same-origin" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.message || "failed");
          safeText(status, json.message || formText.received || "Inquiry received.");
          form.reset();
          track("Lead", { request_id: json.request_id || "" });
        } catch (_) {
          safeText(status, formText.failed || "Processing failed. Please try again later.");
        }
      });
    });
  }
  initSocial();
  initSearch();
  initForms();
  initMember();
  initRezioLinks();
  initCookieBanner();
  track(document.body.dataset.page?.startsWith("spots/") ? "ViewSpot" : document.body.dataset.page?.startsWith("routes/") ? "ViewRoute" : "PageView");
})();
