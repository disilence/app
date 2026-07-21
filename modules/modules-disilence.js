/* ============================================================================
 * DiSilence OS · AGENCY MODULE SUITE
 * ----------------------------------------------------------------------------
 * Registers the DiSilence-vertical renderers into window.KeystoneModules,
 * providing every module in the DiSilence rail. Loads AFTER modules.js (for the
 * shared KUI kit) and BEFORE app.js so the router sees them. The `automation`
 * renderer is the one left to modules.js (it is vertical-agnostic and reads the
 * tenant's own workflows); home/insights/billing/documents/admin are overridden
 * here so no construction-vertical copy ever reaches the DiSilence tenant.
 *
 * All data is representative / DEMO and data-safe — no real commercial terms,
 * per-client revenue, PII, or live portal tokens (see the tenant fixtures).
 * ==========================================================================*/
(function () {
  "use strict";
  var U = window.KUI, M = window.KeystoneModules;
  if (!U || !M) return;

  // Restraint: status meaning uses the brand's pass/veto + the one amber; purely
  // categorical tags (division, kind, phase, partner) stay neutral (mute) so no
  // second accent hue competes with the single signal.
  var whoseBadge = function (w) {
    return w === "you" ? U.chip("On you", "warn") : w === "together" ? U.chip("Together", "mute") : U.chip("On us", "ok");
  };
  var tierChip = function (t) {
    var k = t === "HIGH" ? "ok" : t === "MEDIUM" ? "warn" : t === "LOW" ? "bad" : "mute";
    return U.chip(t, k);
  };
  var divChip = function (d) { return U.chip(d, "mute"); };
  var gateChip = function (g) { return g === "auto" ? U.chip("auto-send", "ok") : U.chip("queued · gate", "warn"); };
  // Phase → progression color: shipped/managed = pass, in-build = amber, else neutral.
  var phaseChip = function (ph) {
    var done = /LIVE|MANAGED/i.test(ph), active = /BUILD|REVIEW|PAID|COLLECT/i.test(ph);
    return U.chip(ph, done ? "ok" : active ? "warn" : "mute");
  };

  /* ============================ COMMAND (home) ============================ */
  M.home = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt;
      var accounts = S.list("accounts"), engagements = S.list("engagements"), opps = S.list("opportunities");
      var campaigns = S.list("campaigns"), content = S.list("contentPieces"), decisions = S.list("decisions");
      var tasks = S.list("tasks"), approvals = S.list("approvals"), agents = S.list("agents");
      var activeClients = accounts.filter(function (a) { return a.account_type === "client" && a.status === "active"; }).length;
      var pendDec = decisions.filter(function (d) { return d.decision === "pending"; }).length + approvals.filter(function (a) { return a.status === "pending"; }).length;
      var inFlight = content.filter(function (c) { return c.status !== "published"; }).length;
      var openOpps = opps.filter(function (o) { return o.stage !== "won" && o.stage !== "lost"; });

      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Active clients", val: activeClients, meta: accounts.length + " total in book", click: on(function () { K.go("pipeline"); }) }) +
          U.kpi({ lab: "Active engagements", val: engagements.length, meta: "across Creative + AI", click: on(function () { K.go("engagements"); }) }) +
          U.kpi({ lab: "Campaigns", val: campaigns.filter(function (c) { return c.status === "active"; }).length + " / " + campaigns.length, meta: "active / total", click: on(function () { K.go("outbound"); }) }) +
          U.kpi({ lab: "Content in flight", val: inFlight, meta: content.length + " in the engine", click: on(function () { K.go("content"); }) }) +
          U.kpi({ lab: "Decisions pending", val: pendDec, kind: pendDec ? "warn" : "", meta: "awaiting a call", click: on(function () { K.go("decisions"); }) })
        );

        var taskRows = tasks.slice().sort(function (a, b) { return (b.blocking ? 1 : 0) - (a.blocking ? 1 : 0); }).map(function (t) {
          return { _click: on(function () { taskDrill(K, t); }),
            move: (t.blocking ? '<span class="sig-dot"></span>' : "") + U.esc(t.title),
            dept: U.chip(t.dept, "mute"), due: f.date(t.due), st: U.statusChip(t.status) };
        });
        var worklist = U.card({ title: "Priority worklist", sub: "What needs a human — blocking first", body:
          taskRows.length ? U.tbl([
            { label: "Item", k: "move" }, { label: "Dept", k: "dept" }, { label: "Due", k: "due" }, { label: "Status", k: "st" }
          ], taskRows) : U.empty("◎", "All clear", "Nothing blocking right now.") });

        var actFeed = decisions.slice(0, 4).map(function (d) {
          return '<div class="act-row"><span>' + tierChip(d.tier) + " " + U.esc(d.title) + '</span><small>' + U.esc(d.decision) + " · " + f.date(d.ts) + "</small></div>";
        }).join("");
        var autoCard = U.card({ title: "Autonomous activity", sub: agents.filter(function (a) { return a.status === "active"; }).length + " systems active · Polaris running the loop",
          head: '<span class="act" data-click="' + on(function () { K.go("automation"); }) + '">Automation →</span>',
          body: '<div class="actlist">' + (actFeed || U.empty("◆", "Quiet", "")) + "</div>" });

        var byStage = {};
        openOpps.forEach(function (o) { byStage[o.stage] = (byStage[o.stage] || 0) + 1; });
        var pipeBody = Object.keys(byStage).map(function (s) {
          return U.bar(s.replace(/-/g, " "), Math.round(byStage[s] / openOpps.length * 100), String(byStage[s]));
        }).join("");
        var pipeCard = U.card({ title: "Pipeline", sub: openOpps.length + " open · representative", head: '<span class="act" data-click="' + on(function () { K.go("pipeline"); }) + '">Clients & Pipeline →</span>', body: pipeBody || U.empty("◍", "No open pipeline", "") });

        return U.head("Command", T().tagline, envNote()) + kpis +
          U.grid("g-2", autoCard + pipeCard) + worklist;
      });
    },
    count: function (K) { var n = K.store.list("tasks").filter(function (t) { return t.status === "open" && t.blocking; }).length; return n || null; }
  };

  function T() { return window.KEYSTONE_TENANT; }
  function envNote() { return '<span class="chip mute" title="Representative data — live figures wire via the authenticated data seam">DEMO data</span>'; }

  function taskDrill(K, t) {
    K.drill(t.title, U.card({ title: "Detail", body:
      '<div class="kv"><b>Dept</b><span>' + U.esc(t.dept) + "</span></div>" +
      '<div class="kv"><b>Due</b><span>' + K.fmt.date(t.due) + "</span></div>" +
      '<div class="kv"><b>Status</b><span>' + U.statusChip(t.status) + "</span></div>" +
      (t.detail ? '<p class="sub" style="margin-top:10px">' + U.esc(t.detail) + "</p>" : "") }));
  }

  /* ============================ STUDIO & FLEET (fleet) ==================== */
  M.fleet = {
    render: function (K, p, mount) {
      var S = K.store, staff = S.list("staff"), agents = S.list("agents");
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Team", val: staff.length, meta: "humans" }) +
          U.kpi({ lab: "Autonomous fleet", val: agents.length, meta: "skills + agents" }) +
          U.kpi({ lab: "Active now", val: agents.filter(function (a) { return a.status === "active"; }).length, meta: "systems running" }) +
          U.kpi({ lab: "On-call", val: agents.filter(function (a) { return a.status === "on-call"; }).length, meta: "spawn on demand" })
        );
        var staffTbl = U.tbl([
          { label: "Name", k: "name" }, { label: "Title", k: "title" }, { label: "Dept", map: function (r) { return U.chip(r.dept, "mute"); } }
        ], staff);
        var agentRows = agents.map(function (a) {
          return { _click: on(function () { K.drill(a.name, U.card({ title: a.kind === "skill" ? "Skill" : "Agent", body: '<p class="sub">' + U.esc(a.detail) + "</p>" })); }),
            name: (a.status === "active" ? '<span class="sig-dot"></span>' : "") + U.esc(a.name), kind: U.chip(a.kind, "mute"), dept: U.chip(a.dept, "mute"), st: U.statusChip(a.status) };
        });
        var agentTbl = U.tbl([
          { label: "System", k: "name" }, { label: "Kind", k: "kind" }, { label: "Dept", k: "dept" }, { label: "Status", k: "st" }
        ], agentRows);
        return U.head("Studio & Fleet", "The humans and the autonomous operating layer", "") + kpis +
          U.grid("g-2", U.card({ title: "Team", sub: "DiSilence, Atlanta", body: staffTbl }) +
            U.card({ title: "Autonomous fleet", sub: "Polaris / EOI — skills and role agents", body: agentTbl }));
      });
    },
    count: function (K) { return K.store.list("agents").filter(function (a) { return a.status === "active"; }).length || null; }
  };

  /* ============================ CLIENTS & PIPELINE (pipeline) ============= */
  M.pipeline = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, opps = S.list("opportunities"), accounts = S.list("accounts");
      var open = opps.filter(function (o) { return o.stage !== "won" && o.stage !== "lost"; });
      var repValue = open.reduce(function (s, o) { return s + (o.unit === "/mo" ? o.est_value * 12 : o.est_value); }, 0);
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Open opportunities", val: open.length, meta: opps.length + " total" }) +
          U.kpi({ lab: "Creative", val: open.filter(function (o) { return o.division === "Creative"; }).length, meta: "division" }) +
          U.kpi({ lab: "AI", val: open.filter(function (o) { return o.division === "AI"; }).length, meta: "division" }) +
          U.kpi({ lab: "Representative value", val: f.usdShort(repValue), meta: "annualized · DEMO" })
        );
        var oppRows = opps.map(function (o) {
          return { _click: on(function () { oppDrill(K, o); }),
            proj: U.esc(o.project_name), div: divChip(o.division), offer: U.esc(o.offer),
            stage: U.statusChip(o.stage), val: f.usd(o.est_value) + '<small style="color:var(--txt-3)"> ' + U.esc(o.unit) + "</small>",
            next: U.esc(o.next_step) };
        });
        var oppTbl = U.tbl([
          { label: "Opportunity", k: "proj" }, { label: "Div", k: "div" }, { label: "Offer", k: "offer" },
          { label: "Stage", k: "stage" }, { label: "Value", k: "val", cls: "num" }, { label: "Next step", k: "next" }
        ], oppRows);
        var acctRows = accounts.map(function (a) {
          return { _click: on(function () { acctDrill(K, a); }),
            name: (a.public ? "" : '<span title="Confidential — redacted">🔒 </span>') + U.esc(a.legal_name),
            type: U.chip(a.account_type, "mute"), div: divChip(a.division),
            rel: U.esc(a.relationship), st: U.statusChip(a.status) };
        });
        var acctTbl = U.tbl([
          { label: "Account", k: "name" }, { label: "Type", k: "type" }, { label: "Div", k: "div" },
          { label: "Relationship", k: "rel" }, { label: "Status", k: "st" }
        ], acctRows);
        return U.head("Clients & Pipeline", "Deals and the book of business — figures representative", envNote()) + kpis +
          U.card({ title: "Pipeline", sub: open.length + " open opportunities · anonymized ICP rows (no real deal terms)", body: oppTbl }) +
          U.card({ title: "Book of business", sub: "Clients + partners · confidential relationships redacted", body: acctTbl });
      });
    },
    count: function (K) { return K.store.list("opportunities").filter(function (o) { return o.stage !== "won" && o.stage !== "lost"; }).length || null; }
  };

  function oppDrill(K, o) {
    K.drill(o.project_name, U.card({ title: "Opportunity", body:
      '<div class="kv"><b>Division</b><span>' + U.esc(o.division) + "</span></div>" +
      '<div class="kv"><b>Offer</b><span>' + U.esc(o.offer) + "</span></div>" +
      '<div class="kv"><b>Stage</b><span>' + U.statusChip(o.stage) + "</span></div>" +
      '<div class="kv"><b>Est. value</b><span>' + K.fmt.usd(o.est_value) + " " + U.esc(o.unit) + " <small>(representative)</small></span></div>" +
      '<div class="kv"><b>Next step</b><span>' + U.esc(o.next_step) + "</span></div>" }));
  }
  function acctDrill(K, a) {
    K.drill(a.legal_name, U.card({ title: a.public ? "Account" : "Account · confidential", body:
      '<div class="kv"><b>Type</b><span>' + U.esc(a.account_type) + "</span></div>" +
      '<div class="kv"><b>Division</b><span>' + U.esc(a.division) + "</span></div>" +
      '<div class="kv"><b>Segment</b><span>' + U.esc(a.segment) + "</span></div>" +
      '<div class="kv"><b>Relationship</b><span>' + U.esc(a.relationship) + "</span></div>" +
      '<div class="kv"><b>Region</b><span>' + U.esc(a.region) + "</span></div>" +
      (a.public ? "" : '<p class="sub" style="margin-top:10px">Commercial terms redacted from this environment.</p>') }));
  }

  /* ============================ OUTBOUND (outbound) ====================== */
  M.outbound = {
    render: function (K, p, mount) {
      var S = K.store, campaigns = S.list("campaigns");
      var sent = campaigns.reduce(function (s, c) { return s + c.sent; }, 0);
      var repl = campaigns.reduce(function (s, c) { return s + c.replied; }, 0);
      var booked = campaigns.reduce(function (s, c) { return s + c.booked; }, 0);
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Campaigns", val: campaigns.filter(function (c) { return c.status === "active"; }).length + " / " + campaigns.length, meta: "active / total" }) +
          U.kpi({ lab: "Sent", val: sent, meta: "representative" }) +
          U.kpi({ lab: "Replies", val: repl, meta: sent ? K.fmt.pct(repl / sent * 100, 1) + " reply rate" : "—" }) +
          U.kpi({ lab: "Booked", val: booked, meta: "meetings" })
        );
        var rows = campaigns.map(function (c) {
          return { _click: on(function () { K.drill(c.name, U.card({ title: "Campaign", body: '<p class="sub">' + U.esc(c.note) + "</p>" })); }),
            name: U.esc(c.name), ch: U.chip(c.channel, "mute"), st: U.statusChip(c.status),
            sent: c.sent, repl: c.replied, gate: gateChip(c.gate) };
        });
        var tbl = U.tbl([
          { label: "Campaign", k: "name" }, { label: "Channel", k: "ch" }, { label: "Status", k: "st" },
          { label: "Sent", k: "sent", cls: "num" }, { label: "Replies", k: "repl", cls: "num" }, { label: "Gate", k: "gate" }
        ], rows);
        return U.head("Outbound & Campaigns", "Cold + re-contact · every send passes the autonomy gate", envNote()) + kpis +
          U.card({ title: "Campaigns", sub: "SMB first-touch auto-sends at confidence ≥ 0.80; mid-market + existing clients always queue", body: tbl });
      });
    },
    count: function (K) { return K.store.list("campaigns").filter(function (c) { return c.gate === "send" && c.status !== "active"; }).length || null; }
  };

  /* ============================ CONTENT ENGINE (content) ================= */
  M.content = {
    render: function (K, p, mount) {
      var S = K.store, content = S.list("contentPieces");
      var graded = content.filter(function (c) { return c.grade != null; });
      var avg = graded.length ? (graded.reduce(function (s, c) { return s + c.grade; }, 0) / graded.length) : null;
      var PHASES = ["Ideate", "Plan", "Produce", "Critique", "Distribute"];
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "In the engine", val: content.length, meta: "pieces" }) +
          U.kpi({ lab: "Published", val: content.filter(function (c) { return c.status === "published"; }).length, meta: "shipped" }) +
          U.kpi({ lab: "Avg grade", val: avg == null ? "—" : avg.toFixed(1), meta: "≥ 7.0 to ship" }) +
          U.kpi({ lab: "Awaiting grade", val: content.filter(function (c) { return c.grade == null; }).length, meta: "in production" })
        );
        var phaseBody = PHASES.map(function (ph) {
          var n = content.filter(function (c) { return c.phase === ph; }).length;
          return U.bar(ph, Math.round(n / content.length * 100), String(n));
        }).join("");
        var rows = content.map(function (c) {
          return { name: U.esc(c.title), ch: U.chip(c.channel, "mute"), div: divChip(c.division),
            phase: U.chip(c.phase, c.phase === "Distribute" ? "ok" : "mute"),
            grade: c.grade == null ? '<span style="color:var(--txt-3)">—</span>' : (c.grade >= 7 ? U.chip(c.grade.toFixed(1), "ok") : U.chip(c.grade.toFixed(1), "warn")),
            st: U.statusChip(c.status) };
        });
        var tbl = U.tbl([
          { label: "Piece", k: "name" }, { label: "Channel", k: "ch" }, { label: "Div", k: "div" },
          { label: "Phase", k: "phase" }, { label: "Grade", k: "grade" }, { label: "Status", k: "st" }
        ], rows);
        return U.head("Content Engine", "6-phase hub-and-spoke · graded ≥ 7 before it distributes", "") + kpis +
          U.grid("g-2e", U.card({ title: "Phase pipeline", sub: "Ideate → Distribute", body: phaseBody }) +
            U.card({ title: "Queue", sub: content.length + " pieces", body: tbl }));
      });
    },
    count: function (K) { return K.store.list("contentPieces").filter(function (c) { return c.status !== "published"; }).length || null; }
  };

  /* ============================ ENGAGEMENTS (engagements) ================ */
  M.engagements = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, eng = S.list("engagements");
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Active engagements", val: eng.length, meta: "in delivery" }) +
          U.kpi({ lab: "On track", val: eng.filter(function (e) { return e.health === "on-track"; }).length, kind: "ok", meta: "healthy" }) +
          U.kpi({ lab: "Watch", val: eng.filter(function (e) { return e.health === "watch"; }).length, kind: "warn", meta: "needs attention" }) +
          U.kpi({ lab: "Your move", val: eng.filter(function (e) { return e.whose === "you"; }).length, meta: "awaiting client" })
        );
        var rows = eng.map(function (e) {
          return { _click: on(function () { engDrill(K, e); }),
            name: U.esc(e.name), div: divChip(e.division), phase: phaseChip(e.phase),
            whose: whoseBadge(e.whose), lead: U.esc(e.lead),
            health: e.health === "on-track" ? U.chip("on track", "ok") : U.chip("watch", "warn") };
        });
        var tbl = U.tbl([
          { label: "Engagement", k: "name" }, { label: "Div", k: "div" }, { label: "Phase", k: "phase" },
          { label: "Move", k: "whose" }, { label: "Lead", k: "lead" }, { label: "Health", k: "health" }
        ], rows);
        return U.head("Engagements", "Every active client delivery, by lifecycle phase", "") + kpis +
          U.card({ title: "Delivery board", sub: "DEMO → WON → PAID → BUILDING → REVIEW → LIVE → MANAGED", body: tbl });
      });
    },
    count: function (K) { return K.store.list("engagements").filter(function (e) { return e.whose === "you"; }).length || null; }
  };

  function engDrill(K, e) {
    var portal = K.store.list("portals").filter(function (pt) { return pt.account_id === e.account_id; })[0];
    K.drill(e.name, U.card({ title: "Engagement", body:
      '<div class="kv"><b>Division</b><span>' + U.esc(e.division) + "</span></div>" +
      '<div class="kv"><b>Type</b><span>' + U.esc(e.type) + "</span></div>" +
      '<div class="kv"><b>Phase</b><span>' + phaseChip(e.phase) + "</span></div>" +
      '<div class="kv"><b>Next move</b><span>' + whoseBadge(e.whose) + "</span></div>" +
      '<div class="kv"><b>Lead</b><span>' + U.esc(e.lead) + "</span></div>" +
      '<div class="kv"><b>Started</b><span>' + K.fmt.date(e.started) + "</span></div>" +
      '<p class="sub" style="margin-top:10px">' + U.esc(e.note) + "</p>" +
      (portal ? '<p style="margin-top:10px"><a href="' + portal.path + '" target="_blank" rel="noopener">Open client portal →</a></p>' : "") }));
  }

  /* ============================ CLIENT PORTALS (portals) ================= */
  M.portals = {
    render: function (K, p, mount) {
      var S = K.store, portals = S.list("portals");
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Portals live", val: portals.length, meta: "customer + partner" }) +
          U.kpi({ lab: "Customer", val: portals.filter(function (p2) { return p2.variant === "customer"; }).length, meta: "billing shown" }) +
          U.kpi({ lab: "Partner", val: portals.filter(function (p2) { return p2.variant === "partner"; }).length, meta: "milestones only" }) +
          U.kpi({ lab: "Your move", val: portals.filter(function (p2) { return p2.whose === "you"; }).length, meta: "awaiting client" })
        );
        var rows = portals.map(function (pt) {
          return { name: U.esc(pt.name), variant: pt.variant === "partner" ? U.chip("partner", "warn") : U.chip("customer", "mute"),
            phase: U.esc(pt.phase), whose: whoseBadge(pt.whose), tok: '<code>' + U.esc(pt.token_masked) + "</code>",
            open: '<a href="' + pt.path + '" target="_blank" rel="noopener">Open →</a>' };
        });
        var tbl = U.tbl([
          { label: "Client / partner", k: "name" }, { label: "Variant", k: "variant" }, { label: "Phase", k: "phase" },
          { label: "Move", k: "whose" }, { label: "Token", k: "tok" }, { label: "Portal", map: function (r) { return r.open; } }
        ], rows);
        return U.head("Client Portals", "The customer + partner support portal — one token-gated surface, two variants", envNote()) + kpis +
          U.card({ title: "Provisioned portals", sub: "Tokens are private bearer keys (masked here). Customer variant shows billing; partner variant shows milestones + shared docs only.", body: tbl }) +
          U.card({ title: "The portal surface", sub: "Deployed at app.disilence.com/portal/", body:
            '<p class="sub">Each client or partner gets a private link (<code>/portal/#&lt;token&gt;</code>) showing exactly where their project stands, whose move it is, every document in one place, and a direct upload/message channel back to us. New portals auto-provision on the "payment cleared" workflow. <a href="/portal/" target="_blank" rel="noopener">Open the portal →</a></p>' });
      });
    },
    count: function (K) { return K.store.list("portals").length || null; }
  };

  /* ============================ BILLING & RETAINERS (billing) ============ */
  M.billing = {
    render: function (K, p, mount) {
      var S = K.store, subs = S.list("subscriptions");
      var total = subs.reduce(function (s, x) { return s + x.count; }, 0);
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Subscriptions", val: total, meta: "representative" }) +
          U.kpi({ lab: "Creative", val: subs.filter(function (s2) { return s2.division === "Creative"; }).reduce(function (a, b) { return a + b.count; }, 0), meta: "retainers" }) +
          U.kpi({ lab: "AI", val: subs.filter(function (s2) { return s2.division === "AI"; }).reduce(function (a, b) { return a + b.count; }, 0), meta: "retainers" }) +
          U.kpi({ lab: "Billing", val: "Stripe", meta: "self-serve portal" })
        );
        var rows = subs.map(function (s2) {
          return { label: U.esc(s2.label), div: divChip(s2.division), plan: U.esc(s2.plan), count: s2.count, st: U.statusChip(s2.status) };
        });
        var tbl = U.tbl([
          { label: "Subscription", k: "label" }, { label: "Div", k: "div" }, { label: "Plan", k: "plan" },
          { label: "Count", k: "count", cls: "num" }, { label: "Status", k: "st" }
        ], rows);
        return U.head("Billing & Retainers", "Recurring revenue — figures illustrative in this environment", envNote()) + kpis +
          U.card({ title: "Retainers", sub: "Anonymized subscription tiers · real MRR wires via the authenticated data seam, never hardcoded", body: tbl }) +
          U.card({ title: "How billing runs", body: '<p class="sub">Retainers bill through Stripe subscriptions with a self-serve customer portal. On a cleared payment, the "provision portal" workflow spins up the client portal + kickoff automatically. Live revenue figures are read from Stripe behind authentication — this public environment shows representative ranges only.</p>' });
      });
    },
    count: function (K) { return null; }
  };

  /* ============================ DECISION LOG (decisions) ================= */
  M.decisions = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, decisions = S.list("decisions"), approvals = S.list("approvals");
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Logged", val: decisions.length, meta: "confidence-tiered" }) +
          U.kpi({ lab: "HIGH", val: decisions.filter(function (d) { return d.tier === "HIGH"; }).length, kind: "ok", meta: "auto-approved" }) +
          U.kpi({ lab: "LOW", val: decisions.filter(function (d) { return d.tier === "LOW"; }).length, kind: "bad", meta: "paged / halted" }) +
          U.kpi({ lab: "Approvals pending", val: approvals.filter(function (a) { return a.status === "pending"; }).length, kind: "warn", meta: "in the gate" })
        );
        var dRows = decisions.map(function (d) {
          return { _click: on(function () { K.drill(d.title, U.card({ title: "Decision", body:
              '<div class="kv"><b>Tier</b><span>' + tierChip(d.tier) + " · " + d.confidence + "/10</span></div>" +
              '<div class="kv"><b>Outcome</b><span>' + U.esc(d.decision) + "</span></div>" +
              '<div class="kv"><b>Dept</b><span>' + U.esc(d.dept) + "</span></div>" +
              '<p class="sub" style="margin-top:10px">' + U.esc(d.note) + "</p>" })); }),
            ts: f.date(d.ts), title: U.esc(d.title), tier: tierChip(d.tier), conf: d.confidence + "/10",
            outcome: U.esc(d.decision), dept: U.chip(d.dept, "mute") };
        });
        var dTbl = U.tbl([
          { label: "Date", k: "ts" }, { label: "Decision", k: "title" }, { label: "Tier", k: "tier" },
          { label: "Conf.", k: "conf", cls: "num" }, { label: "Outcome", k: "outcome" }, { label: "Dept", k: "dept" }
        ], dRows);
        var aRows = approvals.map(function (a) {
          return { title: U.esc(a.title), tier: U.chip(a.tier, a.tier === "money" ? "warn" : "mute"), dept: U.chip(a.dept, "mute"), st: U.statusChip(a.status) };
        });
        var aTbl = aRows.length ? U.tbl([
          { label: "Approval", k: "title" }, { label: "Gate", k: "tier" }, { label: "Dept", k: "dept" }, { label: "Status", k: "st" }
        ], aRows) : U.empty("◆", "Nothing in the gate", "");
        return U.head("Decision Log", "Confidence-tiered autonomy — HIGH proceeds, LOW pages Michael", "") + kpis +
          U.card({ title: "Decisions", sub: "Mirrors the EOI Decision Log (Notion) — every autonomous call, one row", body: dTbl }) +
          U.card({ title: "Awaiting approval", sub: "Money + outbound gates route here", body: aTbl });
      });
    },
    count: function (K) {
      var d = K.store.list("decisions").filter(function (x) { return x.decision === "pending"; }).length;
      var a = K.store.list("approvals").filter(function (x) { return x.status === "pending"; }).length;
      return (d + a) || null;
    }
  };

  /* ============================ INSIGHTS (insights) ====================== */
  M.insights = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, opps = S.list("opportunities"), eng = S.list("engagements"), subs = S.list("subscriptions");
      var open = opps.filter(function (o) { return o.stage !== "won" && o.stage !== "lost"; });
      var repValue = open.reduce(function (s, o) { return s + (o.unit === "/mo" ? o.est_value * 12 : o.est_value); }, 0);
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Pipeline (annualized)", val: f.usdShort(repValue), meta: "representative · DEMO" }) +
          U.kpi({ lab: "Active engagements", val: eng.length, meta: "in delivery" }) +
          U.kpi({ lab: "Retainers", val: subs.reduce(function (a, b) { return a + b.count; }, 0), meta: "representative" }) +
          U.kpi({ lab: "Divisions", val: "2", meta: "Creative + AI" })
        );
        var byDiv = { Creative: 0, AI: 0 };
        open.forEach(function (o) { byDiv[o.division] += (o.unit === "/mo" ? o.est_value * 12 : o.est_value); });
        var bars = Object.keys(byDiv).map(function (d) {
          return U.bar(d, Math.round(byDiv[d] / (repValue || 1) * 100), f.usdShort(byDiv[d]));
        }).join("");
        return U.head("Insights & Forecast", "Rollups on captured activity — live figures wire via the authenticated seam", envNote()) + kpis +
          U.grid("g-2", U.card({ title: "Pipeline by division", sub: "Annualized, representative", body: bars }) +
            U.card({ title: "Reading this board", body: '<p class="sub">This environment ships with <b>representative</b> operating data so the system is fully explorable without exposing real financials. Point the store at the authenticated backend (<code>?api=&lt;base&gt;</code>) to render live pipeline, MRR, and win-rate from our own CRM + Stripe. Structure and phases are real; the money is illustrative until then.</p>' }));
      });
    },
    count: function (K) { return null; }
  };

  /* ==== ADMIN & INTEGRATIONS (override — the generic one carries construction
   * copy; this is a clean DiSilence-native admin over the same tenant data). == */
  M.admin = {
    render: function (K, p, mount) {
      var T2 = window.KEYSTONE_TENANT, S = K.store;
      var integrations = S.list("integrations"), webhooks = S.list("webhooks");
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Users", val: T2.users.length, meta: "@disilence.com seats" }) +
          U.kpi({ lab: "Roles", val: T2.roles.length, meta: "RBAC tiers" }) +
          U.kpi({ lab: "Integrations", val: integrations.filter(function (i) { return i.status === "connected"; }).length + " / " + integrations.length, meta: "connected / total" }) +
          U.kpi({ lab: "Webhooks", val: webhooks.filter(function (w) { return w.active; }).length, meta: "active" })
        );
        var uTbl = U.tbl([{ label: "Name", k: "name" }, { label: "Email", k: "email" }, { label: "Seat", k: "role" }],
          T2.users.map(function (u) { return { name: U.esc(u.name), email: "<code>" + U.esc(u.email) + "</code>", role: U.chip(u.roleLabel, "mute") }; }));
        var iTbl = U.tbl([{ label: "Integration", k: "name" }, { label: "Kind", k: "kind" }, { label: "Detail", k: "detail" }, { label: "Status", k: "st" }],
          integrations.map(function (i) { return { name: U.esc(i.name), kind: U.chip(i.kind, "mute"), detail: U.esc(i.detail), st: U.statusChip(i.status) }; }));
        var whTbl = U.tbl([{ label: "Event", k: "ev" }, { label: "Target", k: "url" }, { label: "Active", k: "st" }, { label: "Last", k: "last" }],
          webhooks.map(function (w) { return { ev: "<code>" + U.esc(w.event_type_filter) + "</code>", url: "<code>" + U.esc(w.target_url) + "</code>", st: w.active ? U.chip("active", "ok") : U.chip("off", "mute"), last: U.esc(w.last_delivery_status) }; }));
        var roleList = '<div class="rolelist">' + T2.roles.map(function (r) { return '<div class="kv"><b>' + U.esc(r.name) + " · t" + r.tier + "</b><span>" + U.esc(r.blurb) + "</span></div>"; }).join("") + "</div>";
        return U.head("Admin & Integrations", "Users, roles, and the connected stack", "") + kpis +
          U.grid("g-2", U.card({ title: "Users & seats", sub: "Switch seats from the top bar to preview any role", body: uTbl }) +
            U.card({ title: "Roles", sub: "RBAC tiers", body: roleList })) +
          U.card({ title: "Integrations", sub: "The real DiSilence stack — connection status only, no secrets", body: iTbl }) +
          U.card({ title: "Webhooks", sub: "Event-driven — outbound to Make + backends", body: whTbl });
      });
    },
    count: function (K) { return null; }
  };

  /* ==== DOCUMENTS (override — generic one carries construction OCR examples). = */
  M.documents = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, docs = S.list("documents"), accounts = S.list("accounts");
      function acctName(id) { var a = accounts.filter(function (x) { return x.id === id; })[0]; return a ? a.legal_name : "—"; }
      U.mountView(K, mount, function (on) {
        var kpis = U.grid("g-kpi",
          U.kpi({ lab: "Documents", val: docs.length, meta: "system of record" }) +
          U.kpi({ lab: "Proposals", val: docs.filter(function (d) { return d.kind === "proposal"; }).length, meta: "sent / ready" }) +
          U.kpi({ lab: "Delivered", val: docs.filter(function (d) { return d.status === "delivered"; }).length, meta: "to clients" }) +
          U.kpi({ lab: "Ready to send", val: docs.filter(function (d) { return d.status === "ready"; }).length, kind: "warn", meta: "queued" })
        );
        var tbl = U.tbl([{ label: "Document", k: "name" }, { label: "Kind", k: "kind" }, { label: "Client", k: "acct" }, { label: "Date", k: "date" }, { label: "Status", k: "st" }],
          docs.map(function (d) { return { name: U.esc(d.name), kind: U.chip(d.kind, "mute"), acct: U.esc(acctName(d.account_id)), date: f.date(d.date), st: U.statusChip(d.status) }; }));
        return U.head("Documents", "Every proposal, deck, and deliverable — auto-linked to its client", "") + kpis +
          U.card({ title: "Document register", sub: docs.length + " documents", body: docs.length ? tbl : U.empty("❐", "No documents yet", "") });
      });
    },
    count: function (K) { return K.store.list("documents").length || null; }
  };

})();
