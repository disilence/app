/* ============================================================================
 * KEYSTONE · APP SHELL — boot · auth gate · nav · routing · drill · palette
 * ==========================================================================*/
(function () {
  "use strict";
  var T = window.KEYSTONE_TENANT, Store = window.KeystoneStore, Auto = window.KeystoneAutomation;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- shared helpers exposed to modules (window.K) --------------------- */
  var fmt = {
    usd: function (n, c) { var v = Number(n) || 0; return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 }); },
    usdShort: function (n) { var v = Math.abs(Number(n) || 0), s = (Number(n) || 0) < 0 ? "-" : ""; if (v >= 1e6) return s + "$" + (v / 1e6).toFixed(2).replace(/\.00$/, "") + "M"; if (v >= 1e3) return s + "$" + Math.round(v / 1e3) + "k"; return s + "$" + Math.round(v); },
    pct: function (n, d) { return (Number(n) || 0).toFixed(d == null ? 0 : d) + "%"; },
    date: function (iso) { if (!iso) return "—"; var dt = new Date(String(iso).slice(0, 10) + "T00:00:00"); return isNaN(dt) ? "—" : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); },
    dateShort: function (iso) { if (!iso) return "—"; var dt = new Date(String(iso).slice(0, 10) + "T00:00:00"); return isNaN(dt) ? "—" : dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); },
    ago: function (iso) { var t = new Date(iso).getTime(); if (isNaN(t)) return ""; var s = Math.max(1, Math.round((Date.now() - t) / 1000)); if (s < 60) return s + "s ago"; if (s < 3600) return Math.round(s / 60) + "m ago"; if (s < 86400) return Math.round(s / 3600) + "h ago"; return Math.round(s / 86400) + "d ago"; },
  };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function node(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }

  /* ---- module registry -------------------------------------------------- */
  // roles: [] means all roles. Otherwise the listed roles + command/admin.
  // A tenant may supply its OWN module suite via T.modules (agency vs construction
  // verticals show different rails from one codebase). Falls back to the default
  // construction set below when a tenant doesn't declare one (e.g. Solid).
  var MODULES = (T && T.modules) || [
    { id: "home", name: "Home", icon: "◎", group: "Overview" },
    { id: "org", name: "Organization", icon: "⚇", group: "Overview" },
    { id: "insights", name: "Insights & Forecast", icon: "◔", group: "Overview", roles: ["finance", "bd", "production"] },
    { id: "crm", name: "CRM & Pipeline", icon: "◍", group: "Revenue", roles: ["bd", "finance"] },
    { id: "estimating", name: "Estimating", icon: "∑", group: "Revenue", roles: ["bd", "production"] },
    { id: "billing", name: "Billing & Draws", icon: "▧", group: "Revenue", roles: ["finance", "bd"] },
    { id: "projects", name: "Projects & Jobs", icon: "▤", group: "Delivery" },
    { id: "projectops", name: "Project Ops", icon: "✎", group: "Delivery", roles: ["production", "field"] },
    { id: "field", name: "Field & Safety", icon: "⛑", group: "Delivery", roles: ["field", "production"] },
    { id: "change", name: "Change Mgmt", icon: "↹", group: "Delivery", roles: ["production", "finance"] },
    { id: "procurement", name: "Procurement / SCM", icon: "⛓", group: "Delivery", roles: ["production", "finance"] },
    { id: "inventory", name: "Inventory & Assets", icon: "▦", group: "Delivery", roles: ["production", "field"] },
    { id: "service", name: "Service & Warranty", icon: "⚒", group: "Delivery", roles: ["field", "production"] },
    { id: "documents", name: "Documents", icon: "❐", group: "Delivery" },
    { id: "finance", name: "Finance — AP · AR · GL", icon: "$", group: "Finance", roles: ["finance"] },
    { id: "payroll", name: "Payroll & Certified", icon: "§", group: "Finance", roles: ["finance"] },
    { id: "reporting", name: "Reporting & BI", icon: "◫", group: "Finance", roles: ["finance", "production"] },
    { id: "automation", name: "Automation Studio", icon: "⚡", group: "Automation" },
    { id: "actionhub", name: "Action Hub", icon: "◆", group: "Automation" },
    { id: "admin", name: "Admin & Integrations", icon: "⚙", group: "System", roles: ["admin"] },
    { id: "migration", name: "Migration Console", icon: "⇪", group: "System", roles: ["admin"] },
  ];
  function visibleModules(role) {
    return MODULES.filter(function (m) {
      if (!m.roles || !m.roles.length) return true;
      if (role === "command" || role === "admin") return true;
      return m.roles.indexOf(role) !== -1;
    });
  }
  function moduleCount(m) {
    try { return window.KeystoneModules[m.id] && window.KeystoneModules[m.id].count ? window.KeystoneModules[m.id].count(K) : null; } catch (_) { return null; }
  }

  /* ---- drill + toast ---------------------------------------------------- */
  var scrim = $("#scrim"), drill = $("#drill");
  function openDrill(title, html) { $("#drillTitle").textContent = title; $("#drillBody").innerHTML = html; drill.classList.add("on"); scrim.classList.add("on"); }
  function closeDrill() { drill.classList.remove("on"); scrim.classList.remove("on"); }
  $("#drillClose").addEventListener("click", closeDrill); scrim.addEventListener("click", closeDrill);
  function toast(msg, opts) {
    opts = opts || {}; var t = node('<div class="toast ' + (opts.kind || "") + '"><b>' + esc(opts.title || "Done") + "</b><small>" + esc(msg) + "</small></div>");
    $("#toasts").appendChild(t); setTimeout(function () { t.style.opacity = "0"; t.style.transition = ".3s"; setTimeout(function () { t.remove(); }, 320); }, opts.ms || 4200);
  }

  /* ---- the K context passed to modules ---------------------------------- */
  var K = {
    T: T, store: Store, automation: Auto, fmt: fmt, esc: esc, node: node,
    session: function () { return KeystoneAuth.current(); },
    go: function (path) { location.hash = "#/" + path; },
    drill: openDrill, closeDrill: closeDrill, toast: toast,
    reRender: function () { render(); refreshNavCounts(); },
  };
  window.K = K;

  /* ---- LOGIN ------------------------------------------------------------ */
  function applyTheme() {
    document.documentElement.setAttribute("data-tenant", T.id);
    if (T.theme) { var r = document.documentElement.style; r.setProperty("--brand", T.theme.brand); r.setProperty("--brand-2", T.theme.brand2); r.setProperty("--brand-deep", T.theme.brandDeep); r.setProperty("--brand-dim", hexA(T.theme.brand, .15)); }
    // login chrome
    var lm = $("#loginLogo"); if (T.logo) { lm.innerHTML = '<img src="' + T.logo + '" alt="">'; } else { lm.textContent = (T.product || "K")[0]; }
    $("#loginTitle").textContent = T.product || "Keystone";
    $("#loginTenant").textContent = T.name;
    document.title = (T.product || "Keystone") + " — " + T.name;
  }
  function hexA(hex, a) { var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); if (!m) return "rgba(109,124,255," + a + ")"; return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + a + ")"; }

  function renderLogin() {
    var box = $("#demoUsers"); box.innerHTML = "";
    T.users.forEach(function (u) {
      var el = node('<div class="demo-user"><span class="av" style="background:' + u.color + '">' + esc(u.initials) + '</span><span class="who"><b>' + esc(u.name) + "</b><small>" + esc(u.roleLabel) + "</small></span><span class=\"arr\">→</span></div>");
      el.addEventListener("click", function () { KeystoneAuth.signInAs(u, "demo"); enterApp(); });
      box.appendChild(el);
    });
    // Google button: real GIS if configured, else simulated primary sign-in
    var realOk = KeystoneAuth.initGoogle($("#gbtnReal"));
    KeystoneAuth._onSignedIn = enterApp;
    if (realOk) { $("#gbtnSim").classList.add("hidden"); $("#gnote").textContent = ""; }
    else {
      $("#gbtnReal").classList.add("hidden");
      $("#gnote").innerHTML = "Live Google Sign-In activates when an OAuth client id is set — free to configure. Running in <b>simulated</b> mode so the app works offline.";
      $("#gbtnSim").addEventListener("click", function () {
        var primary = T.users[0]; KeystoneAuth.signInAs(primary, "google-simulated"); enterApp();
      });
    }
  }

  /* ---- SHELL ------------------------------------------------------------ */
  function buildBrand() {
    var m = $("#railMark"); if (T.logo) m.innerHTML = '<img src="' + T.logo + '" alt="">'; else m.textContent = (T.product || "K")[0];
    $("#railName").textContent = T.product || "Keystone";
    $("#railKicker").textContent = T.name;
    $("#railTenant").textContent = T.name;
    $("#railEnv").textContent = T.env || "Demo";
    $("#envTag").textContent = T.env || "DEMO";
  }
  function buildNav() {
    var role = (K.session() || {}).role, nav = $("#nav"); nav.innerHTML = "";
    var mods = visibleModules(role), groups = [];
    mods.forEach(function (m) { if (groups.indexOf(m.group) < 0) groups.push(m.group); });
    groups.forEach(function (g) {
      nav.appendChild(node('<div class="sec">' + esc(g) + "</div>"));
      mods.filter(function (m) { return m.group === g; }).forEach(function (m) {
        var cnt = moduleCount(m);
        var el = node('<button type="button" class="nav" data-mod="' + m.id + '"><span class="ic">' + m.icon + '</span><span class="tx">' + esc(m.name) + "</span>" + (cnt != null ? '<span class="ct">' + cnt + "</span>" : "") + "</button>");
        el.addEventListener("click", function () { K.go(m.id); closeMobileRail(); });
        nav.appendChild(el);
      });
    });
    highlightNav();
  }
  function refreshNavCounts() { $$("#nav .nav").forEach(function (el) { var id = el.getAttribute("data-mod"); var m = MODULES.filter(function (x) { return x.id === id; })[0]; var cnt = m && moduleCount(m); var ct = el.querySelector(".ct"); if (cnt != null) { if (ct) ct.textContent = cnt; } }); }
  function highlightNav() { var cur = currentRoute().mod; $$("#nav .nav").forEach(function (el) { el.classList.toggle("on", el.getAttribute("data-mod") === cur); }); }

  function buildMe() {
    var s = K.session(); if (!s) return;
    $("#meAv").textContent = s.initials; $("#meAv").style.background = s.color || "#26344e";
    $("#meNm").childNodes[0].nodeValue = s.name;
    var roleLbl = (T.roles.filter(function (r) { return r.id === s.role; })[0] || {}).name || s.roleLabel || s.role;
    $("#meRole").textContent = roleLbl + (s.mode && s.mode.indexOf("google") === 0 ? " · Google" : "");
    if (s.picture) { $("#meAv").style.background = "center/cover url(" + s.picture + ")"; $("#meAv").textContent = ""; }
    // Visible seat switcher — role-filtered nav was invisible without it (7 of 19
    // modules hidden from a Finance seat with no cue that other seats exist).
    var rc = $("#roleChip");
    if (rc) { rc.innerHTML = "Seat · <b>" + esc(roleLbl) + "</b> ▾"; rc.title = "Switch seat — modules are filtered by role"; }
  }
  var roleChipEl = $("#roleChip"); if (roleChipEl) roleChipEl.addEventListener("click", accountPanel);

  /* ---- notifications bell (automation "notify" steps land in-app) -------- */
  function unreadNotifs() { return Store.list("notifications").filter(function (n) { return !n.read_at; }); }
  function refreshBell() {
    var ct = $("#bellCt"); if (!ct) return;
    var n = unreadNotifs().length;
    ct.textContent = n > 9 ? "9+" : String(n);
    ct.classList.toggle("hidden", n === 0);
  }
  function bellPanel() {
    var all = Store.list("notifications").slice().sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var html = all.length
      ? '<div class="feed">' + all.slice(0, 30).map(function (n) {
          return '<div class="feed-item"><div class="ic ' + (n.read_at ? "" : "info") + '">🔔</div><div class="tx">' + esc(n.message || "(no message)") +
            '<span class="note">' + esc(n.to || n.channel || "in-app") + "</span></div><div class=\"tm\">" + fmt.ago(n.at) + "</div></div>";
        }).join("") + "</div>"
      : '<div class="empty"><div class="ic">🔔</div><b>No notifications yet</b><p>Automation workflows post here when they notify a human.</p></div>';
    var unread = unreadNotifs();
    openDrill("Notifications" + (unread.length ? " · " + unread.length + " unread" : ""),
      (unread.length ? '<div class="btnrow" style="margin-bottom:14px"><button class="btn sm" id="markAllRead">Mark all read</button></div>' : "") + html);
    var mb = $("#markAllRead");
    if (mb) mb.addEventListener("click", function () {
      unread.forEach(function (n) { Store.update("notifications", n.id, { read_at: new Date().toISOString() }, { silent: true }); });
      refreshBell(); bellPanel();
    });
  }
  var bellEl = $("#bell"); if (bellEl) bellEl.addEventListener("click", bellPanel);
  $("#me").addEventListener("click", accountPanel);
  function accountPanel() {
    var s = K.session();
    var roles = T.roles.filter(function (r) { return r.id !== "guest"; });
    openDrill("Account", '<div class="kv"><div class="k">Signed in</div><div class="v">' + esc(s.name) + '</div><div class="k">Email</div><div class="v">' + esc(s.email) + '</div><div class="k">Mode</div><div class="v">' + esc(s.mode) + '</div><div class="k">Tenant</div><div class="v">' + esc(T.name) + '</div></div>'
      + '<div class="sub" style="margin:16px 0 8px;color:var(--txt-3)">Switch seat (demo — shows RBAC per role)</div>'
      + '<div class="btnrow" id="roleBtns">' + roles.map(function (r) { return '<button class="btn sm ' + (r.id === s.role ? "primary" : "") + '" data-role="' + r.id + '">' + esc(r.name) + "</button>"; }).join("") + "</div>"
      + '<div style="margin-top:22px"><button class="btn danger" id="signOut">Sign out</button></div>');
    $$("#roleBtns [data-role]").forEach(function (b) { b.addEventListener("click", function () { switchRole(b.getAttribute("data-role")); }); });
    $("#signOut").addEventListener("click", function () { KeystoneAuth.signOut(); location.reload(); });
  }
  function switchRole(roleId) {
    var s = K.session(); var r = T.roles.filter(function (x) { return x.id === roleId; })[0];
    s.role = roleId; s.roleLabel = r ? r.name : roleId; localStorage.setItem("keystone.session", JSON.stringify(s));
    closeDrill(); buildNav(); buildMe(); render(); toast("Now viewing as " + (r ? r.name : roleId), { title: "Seat switched" });
  }

  /* ---- routing ---------------------------------------------------------- */
  function currentRoute() { var h = (location.hash || "#/home").replace(/^#\//, ""); var p = h.split("/"); return { mod: p[0] || "home", id: p[1] || null, sub: p[2] || null }; }
  var lastRouteKey = null;
  function render() {
    var r = currentRoute(); var mod = window.KeystoneModules[r.mod] || window.KeystoneModules.home;
    // Re-rendering the SAME view (approve/insert/toggle) must not yank the user
    // back to the top — only a real route change resets scroll.
    var routeKey = r.mod + "/" + (r.id || "") + "/" + (r.sub || "");
    var sameView = routeKey === lastRouteKey; lastRouteKey = routeKey;
    var mainEl = $(".main"); var keepScroll = sameView && mainEl ? mainEl.scrollTop : 0;
    var role = (K.session() || {}).role;
    // guard: role can't see module → home
    var allowed = visibleModules(role).some(function (m) { return m.id === r.mod; });
    if (!allowed && r.mod !== "home") { K.go("home"); return; }
    var meta = MODULES.filter(function (m) { return m.id === r.mod; })[0] || { name: "Home" };
    $("#viewTitle").textContent = meta.name;
    var content = $("#content"); content.innerHTML = "";
    try { mod.render(K, { id: r.id, sub: r.sub }, content); } catch (e) { content.innerHTML = '<div class="empty"><div class="ic">⚠</div><b>Render error in ' + esc(r.mod) + '</b><p>' + esc(String(e && e.message || e)) + "</p></div>"; }
    renderGuide(content, r);
    highlightNav();
    if (mainEl) mainEl.scrollTop = keepScroll; else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", render);

  /* ---- task-guidance banner (intent set by workbench's KGuide) ----------- */
  // Beginner-tutorial strip at the top of the page a task routed the user to.
  // Slim + dismissible so it guides without disturbing the layout.
  function renderGuide(content, r) {
    var G = window.KGuide; if (!G || !G.current) return;
    var routeKey = r.mod + (r.id ? "/" + r.id : "");
    var intent = null;
    try { intent = G.current(routeKey); } catch (_) {}
    if (!intent) return;
    var steps = (intent.steps || []).map(function (s, i) { return '<span class="gstep"><b>' + (i + 1) + "</b>" + esc(s) + "</span>"; }).join("");
    var bar = node('<div class="guide-banner" role="status"><span class="gic">🧭</span><div class="gtx"><b>' + esc(intent.title || "Here to complete a task") + "</b><div class=\"gsteps\">" + steps + '</div></div><button type="button" class="gx" aria-label="Dismiss guide">✕</button></div>');
    bar.querySelector(".gx").addEventListener("click", function () { try { G.dismiss(); } catch (_) {} bar.remove(); });
    content.insertBefore(bar, content.firstChild);
  }

  /* ---- search + command palette ----------------------------------------- */
  var cmdk = $("#cmdk");
  function paletteItems(q) {
    q = (q || "").toLowerCase(); var out = [];
    visibleModules((K.session() || {}).role).forEach(function (m) { if (!q || m.name.toLowerCase().indexOf(q) >= 0) out.push({ icon: m.icon, label: m.name, hint: "module", go: m.id }); });
    (window.KActions || []).forEach(function (a) { if (q && a.label.toLowerCase().indexOf(q) >= 0) out.push({ icon: a.icon || "▶", label: a.label, hint: "action", go: a.route }); });
    if (q) {
      Store.list("jobs").forEach(function (j) { if (((j.job_code || "") + " " + (j.scope || "")).toLowerCase().indexOf(q) >= 0) out.push({ icon: "▤", label: "Job " + j.job_code, hint: j.scope, go: "projects/" + j.id }); });
      Store.list("opportunities").forEach(function (o) { if (((o.project_name || "") + " " + o.id).toLowerCase().indexOf(q) >= 0) out.push({ icon: "◍", label: o.project_name, hint: o.stage, go: "crm/" + o.id }); });
      Store.list("accounts").forEach(function (a) { if ((a.legal_name || "").toLowerCase().indexOf(q) >= 0) out.push({ icon: "◍", label: a.legal_name, hint: "account", go: "crm" }); });
      Store.list("vendors").forEach(function (v) { if ((v.name || "").toLowerCase().indexOf(q) >= 0) out.push({ icon: "⛓", label: v.name, hint: "vendor", go: "procurement" }); });
      Store.list("rfis").forEach(function (r) { if (((r.subject || "") + " " + (r.rfi_number || "")).toLowerCase().indexOf(q) >= 0) out.push({ icon: "✎", label: "RFI " + (r.rfi_number || r.id) + " — " + (r.subject || ""), hint: r.job_id || "rfi", go: "projectops" }); });
      Store.list("apInvoices").forEach(function (i) { if (((i.invoice_number || "") + " " + (i.vendor || "")).toLowerCase().indexOf(q) >= 0) out.push({ icon: "$", label: i.invoice_number + " · " + (i.vendor || ""), hint: "AP invoice", go: "finance/ap" }); });
    }
    return out.slice(0, 12);
  }
  var selIdx = 0;
  function renderPalette(q) {
    var items = paletteItems(q), list = $("#cmdkList"); list.innerHTML = "";
    items.forEach(function (it, i) { var el = node('<div class="cmdk-item ' + (i === selIdx ? "sel" : "") + '"><span class="ic">' + it.icon + '</span><span>' + esc(it.label) + '</span><small>' + esc(it.hint) + "</small></div>"); el.addEventListener("click", function () { K.go(it.go); closePalette(); }); list.appendChild(el); });
    cmdk._items = items;
  }
  function openPalette(q) { cmdk.classList.add("on"); selIdx = 0; $("#cmdkInput").value = q || ""; renderPalette(q || ""); $("#cmdkInput").focus(); }
  function closePalette() { cmdk.classList.remove("on"); }
  $("#cmdkInput").addEventListener("input", function (e) { selIdx = 0; renderPalette(e.target.value); });
  $("#cmdkInput").addEventListener("keydown", function (e) {
    var items = cmdk._items || [];
    if (e.key === "ArrowDown") { selIdx = Math.min(items.length - 1, selIdx + 1); renderPalette($("#cmdkInput").value); e.preventDefault(); }
    else if (e.key === "ArrowUp") { selIdx = Math.max(0, selIdx - 1); renderPalette($("#cmdkInput").value); e.preventDefault(); }
    else if (e.key === "Enter") { if (items[selIdx]) { K.go(items[selIdx].go); closePalette(); } }
    else if (e.key === "Escape") closePalette();
  });
  cmdk.addEventListener("click", function (e) { if (e.target === cmdk) closePalette(); });
  $("#search").addEventListener("focus", function () { openPalette(""); });
  document.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(""); } });

  /* ---- rail toggle + mobile --------------------------------------------- */
  var app = $("#app");
  $("#railToggle").addEventListener("click", function () { app.classList.toggle("rail-collapsed"); try { localStorage.setItem("keystone.rail", app.classList.contains("rail-collapsed") ? "1" : "0"); } catch (_) {} });
  $("#hamb").addEventListener("click", function () { app.classList.toggle("rail-open"); });
  $("#railscrim").addEventListener("click", closeMobileRail);
  function closeMobileRail() { app.classList.remove("rail-open"); }
  if (localStorage.getItem("keystone.rail") === "1") app.classList.add("rail-collapsed");

  /* ---- live feed / sync indicator --------------------------------------- */
  function wireLive() {
    Store.on("*", function (payload, evt) {
      if (!evt || evt === "*") return;
      $("#syncTxt").textContent = "live";
      var dot = $(".sync .dot"); if (dot) { dot.style.background = "var(--brand)"; setTimeout(function () { dot.style.background = "var(--ok)"; }, 700); }
      // refresh counts + current view for data-mutating events (not pure automation.run noise)
      if (evt.indexOf("automation.") !== 0) { refreshNavCounts(); }
      if (evt.indexOf("notifications.") === 0) refreshBell();
    });
  }

  /* ---- boot ------------------------------------------------------------- */
  function enterApp() {
    $("#login").classList.add("hidden");
    app.classList.remove("hidden");
    buildBrand(); buildNav(); buildMe(); wireLive(); refreshBell();
    if (!location.hash) location.hash = "#/home";
    render();
  }
  async function boot() {
    applyTheme();
    if (Store.config.MODE === "api") {
      try { await Store.loadSnapshot(); $("#envTag").textContent = "LIVE API"; }
      catch (e) { if (window.console) console.warn("[keystone] snapshot load failed", e); }
    }
    if (KeystoneAuth.current()) enterApp(); else { renderLogin(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
