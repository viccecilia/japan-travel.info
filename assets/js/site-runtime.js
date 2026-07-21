(function () {
  const config = window.JAPAN_TRAVEL_CONFIG || {};
  const i18n = window.JT_I18N || {};
  const memberText = i18n.member || {};
  const cookieText = i18n.cookie || {};
  const formText = i18n.form || {};
  const memberFields = ({
    "zh-cn": { code: "推荐码", clicks: "访问次数", valid: "有效订单", tier: "当前等级", item: "内容类型", id: "内容", created: "保存时间", updated: "更新时间", order: "预约编号", status: "状态", reason: "变更原因", routeTitle: "路线名称", routeDefault: "我的关西路线" },
    "zh-tw": { code: "推薦碼", clicks: "訪問次數", valid: "有效訂單", tier: "目前等級", item: "內容類型", id: "內容", created: "儲存時間", updated: "更新時間", order: "預約編號", status: "狀態", reason: "變更原因", routeTitle: "路線名稱", routeDefault: "我的關西路線" },
    ja: { code: "紹介コード", clicks: "アクセス数", valid: "有効注文", tier: "現在のランク", item: "内容種別", id: "内容", created: "保存日時", updated: "更新日時", order: "予約番号", status: "状態", reason: "変更理由", routeTitle: "ルート名", routeDefault: "マイ関西ルート" },
    en: { code: "Referral code", clicks: "Visits", valid: "Valid orders", tier: "Current tier", item: "Content type", id: "Item", created: "Saved", updated: "Updated", order: "Booking reference", status: "Status", reason: "Change reason", routeTitle: "Route name", routeDefault: "My Kansai route" },
    ko: { code: "추천 코드", clicks: "방문 수", valid: "유효 주문", tier: "현재 등급", item: "콘텐츠 유형", id: "콘텐츠", created: "저장 시간", updated: "업데이트", order: "예약 번호", status: "상태", reason: "변경 이유", routeTitle: "코스 이름", routeDefault: "나의 간사이 코스" }
  })[document.body.dataset.lang] || {};
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
    bySel(".filter-panel").forEach((panel) => {
      const scope = panel.closest(".page, .section, main") || document;
      const input = panel.querySelector(".search");
      let region = "all";
      let category = "all";
      const apply = () => {
        const q = (input?.value || "").trim().toLowerCase();
        let count = 0;
        bySel("[data-search]", scope).forEach((node) => {
          const visible = (!q || node.dataset.search.toLowerCase().includes(q)) && (region === "all" || node.dataset.region === region) && (category === "all" || node.dataset.category === category);
          node.hidden = !visible;
          if (visible) count++;
        });
        safeText(panel.querySelector("[data-result-count]"), count);
      };
      input?.addEventListener("input", apply);
      bySel("[data-filter]", panel).forEach((button) => button.addEventListener("click", () => {
        region = button.dataset.filter;
        bySel("[data-filter]", panel).forEach((x) => { x.classList.toggle("active", x === button); x.setAttribute("aria-pressed", x === button ? "true" : "false"); });
        apply();
      }));
      bySel("[data-category]", panel).forEach((button) => button.addEventListener("click", () => {
        category = button.dataset.category;
        bySel("[data-category]", panel).forEach((x) => { x.classList.toggle("active", x === button); x.setAttribute("aria-pressed", x === button ? "true" : "false"); });
        apply();
      }));
    });
    bySel("[data-route-filters]").forEach((panel) => {
      const scope = panel.closest("main") || document;
      bySel("[data-route-filter]", panel).forEach((button) => button.addEventListener("click", () => {
        const key = button.dataset.routeFilter.toLowerCase();
        bySel("[data-route-filter]", panel).forEach((x) => { x.classList.toggle("active", x === button); x.setAttribute("aria-pressed", x === button ? "true" : "false"); });
        bySel(".route-card", scope).forEach((card) => { card.hidden = key !== "all" && !card.textContent.toLowerCase().includes(key); });
      }));
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
      content.innerHTML = `<div class="mini-card"><p><strong>${esc(memberText.email || "Email")}:</strong> ${esc(member.email || "")}</p><p><strong>${esc(memberText.nickname || "Nickname")}:</strong> ${esc(member.nickname || "")}</p></div>`;
      return;
    }
    const action = { favorites: "favorite-list", trips: "saved-trip-list", bookings: "booking-reference-list", referrals: "referral-summary", vip: "vip-summary" }[slug];
    if (!action) return;
    const data = new FormData();
    data.set("action", action);
    data.set("language", lang());
    const json = await postMember(data);
    if (slug === "favorites") {
      content.innerHTML = renderListLocalized(json.favorites, [["item_type",memberFields.item],["item_id",memberFields.id],["created_at",memberFields.created]], memberText.empty);
      content.insertAdjacentHTML("beforeend", `<form class="member-form" data-favorite-remove><label>${esc(memberFields.id)}<input name="item_id"></label><button class="btn">${esc(memberText.remove || "Remove")}</button></form>`);
      content.querySelector("[data-favorite-remove]").addEventListener("submit", async (event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        fd.set("action", "favorite-remove");
        fd.set("item_type", "spot");
        await postMember(fd);
        await renderMemberPanel(shell, member);
      });
    } else if (slug === "trips") {
      content.innerHTML = `<form class="member-form" data-trip-save><label>${esc(memberFields.routeTitle)}<input name="title" value="${esc(memberFields.routeDefault)}"></label><input type="hidden" name="payload_json" value='{"source":"member_page"}'><button class="btn primary">${esc(memberText.save || "Save")}</button></form>` + renderListLocalized(json.trips, [["title",memberFields.routeTitle],["created_at",memberFields.created],["updated_at",memberFields.updated]], memberText.empty);
      content.querySelector("[data-trip-save]").addEventListener("submit", async (event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        fd.set("action", "saved-trip");
        await postMember(fd);
        await renderMemberPanel(shell, member);
      });
    } else if (slug === "bookings") {
      content.innerHTML = renderListLocalized(json.bookings, [["rezio_order_id",memberFields.order],["status",memberFields.status],["created_at",memberFields.created]], memberText.empty);
    } else if (slug === "referrals") {
      content.innerHTML = `<div class="member-list"><article class="mini-card"><p><strong>${esc(memberFields.code)}:</strong> ${esc(json.referral?.referral_code || "")}</p><p><strong>${esc(memberFields.clicks)}:</strong> ${esc(json.referral?.clicks || 0)}</p><p><strong>${esc(memberFields.valid)}:</strong> ${esc(json.referral?.valid_orders || 0)}</p></article></div>`;
    } else if (slug === "vip") {
      content.innerHTML = `<div class="member-list"><article class="mini-card"><p><strong>${esc(memberFields.tier)}:</strong> ${esc(json.vip?.tier || "Visitor")}</p><p><strong>${esc(memberFields.valid)}:</strong> ${esc(json.vip?.valid_orders || 0)}</p></article></div>` + renderListLocalized(json.vip?.history, [["tier",memberFields.tier],["reason",memberFields.reason],["created_at",memberFields.created]], memberText.empty);
    }
  }
  function renderListLocalized(items, fields, empty) {
    if (!items || !items.length) return `<p class="member-empty">${esc(empty || memberText.empty || "No records yet.")}</p>`;
    return `<div class="member-list">${items.map((item) => `<article class="mini-card">${fields.map(([key,label]) => `<p><strong>${esc(label || key)}:</strong> ${esc(item[key] ?? "")}</p>`).join("")}</article>`).join("")}</div>`;
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
    bySel("[data-contact-method]").forEach((select) => {
      const update = () => bySel("[data-contact-field]", select.closest("form")).forEach((node) => node.classList.toggle("active", node.dataset.contactField === select.value));
      select.addEventListener("change", update);
      update();
    });
    bySel("[data-enhanced-form]").forEach((form) => {
      let idempotencyKey = "";
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const status = form.querySelector("[data-form-status]");
        const submit = form.querySelector("button[type='submit']");
        if (submit?.disabled) return;
        submit && (submit.disabled = true);
        form.setAttribute("aria-busy", "true");
        status?.classList.remove("success", "error");
        safeText(status, formText.sending || "Sending...");
        const data = new FormData(form);
        data.set("source_url", location.href);
        if (!idempotencyKey) idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        data.set("idempotency_key", idempotencyKey);
        data.set("visitor_id", visitorId());
        data.set("ref_code", decodeURIComponent(getCookie("jt_ref_code")));
        try {
          data.set("csrf_token", await csrfToken());
          const res = await fetch(form.action, { method: "POST", body: data, credentials: "same-origin" });
          const json = await res.json().catch(() => ({}));
          if (!res.ok || !json.ok) throw new Error(json.message || "failed");
          safeText(status, json.message || formText.received || "Inquiry received.");
          status?.classList.add("success");
          form.reset();
          idempotencyKey = "";
          track("Lead", { request_id: json.request_id || "" });
        } catch (error) {
          safeText(status, error.message && error.message !== "failed" ? error.message : (formText.failed || "Processing failed. Please try again later."));
          status?.classList.add("error");
        } finally {
          submit && (submit.disabled = false);
          form.removeAttribute("aria-busy");
        }
      });
    });
  }
  bySel("[data-member-logout]").forEach((button) => button.addEventListener("click", async () => {
    try { const data = new FormData(); data.set("action", "logout"); await postMember(data); location.href = `/${lang()}/member/login/`; } catch (_) {}
  }));
  initSocial();
  initSearch();
  initForms();
  initMember();
  initCookieBanner();
  track(document.body.dataset.page?.startsWith("spots/") ? "ViewSpot" : document.body.dataset.page?.startsWith("routes/") ? "ViewRoute" : "PageView");
})();
