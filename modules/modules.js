/* ============================================================================
 * KEYSTONE · MODULES — the enterprise suite (render functions)
 * ----------------------------------------------------------------------------
 * Each module renders through the K context (store · ledger · automation).
 * Two loops are genuinely live end-to-end on the native store:
 *   • CRM: "Mark won" → automation cascades a Project + Job + tasks.
 *   • Action Hub: approving the money-gated voucher POSTS to the event-sourced
 *     ledger → job Cost Status + Trial Balance recompute live from activity.
 * Everything else is real seeded data with honest empty states — no shells.
 * ==========================================================================*/
window.KeystoneModules = (function () {
  "use strict";
  function esc(s) { return window.K.esc(s); }
  function chip(t, k) { return '<span class="chip ' + (k || "mute") + '">' + esc(t) + "</span>"; }
  function pill(t) { return '<span class="pill">' + esc(t) + "</span>"; }
  function grid(cls, html) { return '<div class="grid ' + cls + '">' + html + "</div>"; }
  function card(o) {
    return '<div class="card ' + (o.cls || "") + '">' +
      (o.title ? '<div class="card-h"><div><h3>' + esc(o.title) + "</h3>" + (o.sub ? '<div class="sub">' + esc(o.sub) + "</div>" : "") + "</div>" + (o.head || "") + "</div>" : "") +
      o.body + "</div>";
  }
  function kpi(o) {
    return '<div class="card kpi ' + (o.kind || "") + '" ' + (o.click ? 'data-click="' + o.click + '"' : "") + '><span class="accent"></span>' +
      '<div class="lab">' + esc(o.lab) + '</div><div class="val mono">' + o.val + "</div>" + (o.meta ? '<div class="meta">' + o.meta + "</div>" : "") + "</div>";
  }
  function head(title, sub, tools) { return '<div class="view-head"><div><h2>' + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>" + (tools ? '<div class="tools">' + tools + "</div>" : "") + "</div>"; }
  function tbl(cols, rows) {
    // Sortable: every <th> carries data-ksort (column index); one delegated
    // listener (wired below) sorts the rendered tbody in place, numeric-aware.
    // Columns may carry sortVal(r) for an explicit sort key (default r[c.k]).
    // Signature is unchanged — modules2/3 callers work untouched.
    var th = "<tr>" + cols.map(function (c, ci) { return '<th class="' + (c.cls || "") + '" data-ksort="' + ci + '" style="cursor:pointer" title="Click to sort">' + esc(c.label) + '<span class="ksort-ind"></span></th>'; }).join("") + "</tr>";
    var bd = rows.map(function (r) {
      return "<tr" + (r._click ? ' class="clk" data-click="' + r._click + '"' : "") + ">" + cols.map(function (c) {
        var v = c.map ? c.map(r) : r[c.k];
        var sv = c.sortVal ? c.sortVal(r) : (c.k != null ? r[c.k] : null);
        return '<td class="' + (c.cls || "") + '"' + (sv == null ? "" : ' data-sort="' + esc(String(sv)) + '"') + ">" + (v == null ? "" : v) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    var foot = rows.length > 10 ? '<div style="padding:7px 2px 0;font-size:11px;color:var(--txt-3)">' + rows.length + " rows</div>" : "";
    return '<div class="twrap"><table><thead>' + th + "</thead><tbody>" + bd + "</tbody></table>" + foot + "</div>";
  }
  // One delegated sorter for every tbl() on any view or drill.
  if (!window.__keystoneSortWired) {
    window.__keystoneSortWired = true;
    document.addEventListener("click", function (ev) {
      var t = ev.target, th = null;
      while (t && t !== document) { if (t.tagName === "TH" && t.getAttribute && t.getAttribute("data-ksort") != null) { th = t; break; } t = t.parentNode; }
      if (!th) return;
      var table = th; while (table && table.tagName !== "TABLE") table = table.parentNode;
      var tbody = table && table.tBodies && table.tBodies[0]; if (!tbody) return;
      var ci = Number(th.getAttribute("data-ksort"));
      var dir = th.getAttribute("data-kdir") === "asc" ? "desc" : "asc";
      var sibs = th.parentNode.children, i;
      for (i = 0; i < sibs.length; i++) { sibs[i].removeAttribute("data-kdir"); var ind0 = sibs[i].querySelector(".ksort-ind"); if (ind0) ind0.textContent = ""; }
      th.setAttribute("data-kdir", dir);
      var ind = th.querySelector(".ksort-ind"); if (ind) ind.textContent = dir === "asc" ? " ▲" : " ▼";
      var trs = Array.prototype.slice.call(tbody.rows);
      function keyOf(tr) { var td = tr.cells[ci]; if (!td) return ""; var ds = td.getAttribute("data-sort"); return ds != null && ds !== "" ? ds : td.textContent; }
      var numeric = trs.length && trs.every(function (tr) { var k = String(keyOf(tr)).replace(/[\s$,%()]/g, ""); return k === "" || /^-?\d*\.?\d+d?$/.test(k); });
      trs.sort(function (a, b) {
        var ka = keyOf(a), kb = keyOf(b), out;
        if (numeric) out = (parseFloat(String(ka).replace(/[\s$,%()]/g, "")) || 0) - (parseFloat(String(kb).replace(/[\s$,%()]/g, "")) || 0);
        else { var sa = String(ka).toLowerCase(), sb = String(kb).toLowerCase(); out = sa < sb ? -1 : sa > sb ? 1 : 0; }
        return dir === "asc" ? out : -out;
      });
      for (i = 0; i < trs.length; i++) tbody.appendChild(trs[i]);
    });
  }
  function bar(nm, pct, val, kind) {
    return '<div class="bar-row"><div class="nm">' + esc(nm) + '</div><div class="bar-track"><div class="bar-fill ' + (kind || "") + '" style="width:' + Math.max(0, Math.min(100, pct)) + '%"></div></div><div class="vv">' + val + "</div></div>";
  }
  function empty(icon, title, msg) { return '<div class="empty"><div class="ic">' + icon + "</div><b>" + esc(title) + "</b><p>" + esc(msg) + "</p></div>"; }
  function statusChip(s) {
    var m = { open: "warn", pending: "warn", "in-progress": "info", prep: "mute", billing: "info", complete: "ok", paid: "ok", approved: "ok", matched: "ok", valid: "ok", won: "ok", active: "ok", connected: "ok",
      hold: "bad", exception: "bad", expired: "bad", missing: "bad", lost: "mute", "pending-post": "warn", "pending-approval": "warn", sunsetting: "warn", screening: "info", submitted: "info", "new": "info", no_po: "bad",
      issued: "info", received: "ok", closed: "mute", draft: "mute", voided: "bad", delegated: "info", cancelled: "bad", withdrawn: "mute", "applied-posted": "ok" };
    return chip(String(s).replace(/[-_]/g, " "), m[s] || "mute");
  }

  // render harness: build html with data-click keys, then bind
  function mountView(K, mount, htmlFn) {
    var CLICK = {}, n = 0;
    function on(fn) { var k = "c" + (++n); CLICK[k] = fn; return k; }
    mount.innerHTML = htmlFn(on);
    mount.querySelectorAll("[data-click]").forEach(function (e) {
      var k = e.getAttribute("data-click");
      e.addEventListener("click", function (ev) { ev.stopPropagation(); if (CLICK[k]) CLICK[k](e); });
    });
  }

  var F = function () { return window.K.fmt; };

  /* ============================== shared form kit (drill-hosted create forms) */
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  var TODAY = "2026-07-18";   // demo "today" — all derived aging keys off this
  window.KEYSTONE_TODAY = TODAY;   // shared app-date anchor — automation.js todayStr() reads this so cascade stamps agree with the UI
  function todayISO() { return TODAY; }   // anchored to the app TODAY — raw toISOString() is UTC and drifts to tomorrow in US evenings
  // Aging is DERIVED at read time from invoice_date vs TODAY — stored ageDays
  // seed fields are never read (they go stale the day after they are written).
  function ageDaysOf(inv) {
    var d = new Date(String((inv && inv.invoice_date) || "").slice(0, 10) + "T00:00:00");
    if (isNaN(d)) return Number(inv && inv.ageDays) || 0;
    return Math.max(0, Math.round((new Date(TODAY + "T00:00:00") - d) / 86400000));
  }
  function isoPlusDays(iso, n) {
    var d = new Date(String(iso || TODAY).slice(0, 10) + "T00:00:00");
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  // Persistent check numbers: tenant-level counter in settings/payment. First
  // print assigns + stamps check_no on the AP invoice; every later output
  // (register / positive pay / reprint) reuses the stamped number.
  function checkNoFor(K, inv) {
    if (inv.check_no) return inv.check_no;
    var S = K.store;
    var st = S.get("settings", "payment");
    if (!st) st = S.insert("settings", { id: "payment", next_check_no: 1006 }, { silent: true });
    var num = Number(st.next_check_no) || 1006;
    S.update("settings", "payment", { next_check_no: num + 1 }, { silent: true });
    S.update("apInvoices", inv.id, { check_no: String(num), check_date: TODAY }, { silent: true });
    inv.check_no = String(num); inv.check_date = TODAY;
    return String(num);
  }
  // Derived job cost status with NO stored-field fallbacks: budget from budget
  // lines, committed from commitments + EXECUTED change-order cost deltas,
  // spent from the ledger. A job with no data shows honest zeros ("awaiting
  // first cost"), never a stored figure the ledger cannot back.
  function derivedStatus(K, job) {
    var S = K.store, L = window.KeystoneLedger;
    var budget = r2(S.list("budgetLines", { job_code: job.job_code }).reduce(function (s, b) { return s + (Number(b.current_cost) || 0); }, 0));
    // cancelled commitments never count toward committed cost (founder #4a)
    var committed = r2(S.list("commitments", { job_code: job.job_code }).filter(function (c) { return c.status !== "cancelled"; }).reduce(function (s, c) { return s + (Number(c.original_value) || 0); }, 0));
    var coDelta = r2(S.list("changeOrders").filter(function (c) { return c.job_id === job.job_code && c.status === "executed"; }).reduce(function (s, c) { return s + (Number(c.cost_total) || 0); }, 0));
    committed = r2(committed + coDelta);
    var spent = L.jobSpent(job.job_code);
    var contract = Number(job.contract_amount) || 0;
    var billed = L.jobBilled(job.job_code);
    var forecast = Math.max(budget, committed, spent);
    return { contract: contract, budget: budget, committed: committed, coDelta: coDelta, spent: spent, billed: billed,
      forecast: r2(forecast), margin: r2(contract - forecast), marginPct: contract ? r2((contract - forecast) / contract * 100) : 0,
      pctSpent: budget ? Math.min(100, Math.round(spent / budget * 100)) : 0,
      noCost: !budget && !committed && !spent };
  }
  // Recursive family roll-up of derivedStatus — a parent aggregates its whole
  // subtree (lot sub-jobs AND their scope sub-sub-jobs). Contract stays the
  // parent's own figure (children's contract splits/unallocated slices must
  // never double-count the parent's contract).
  function rollupStatus(K, job) {
    var agg = derivedStatus(K, job);
    var kids = descendantJobsOf(K, job.job_code);
    if (!kids.length) return agg;
    kids.forEach(function (kid) {
      var d = derivedStatus(K, kid);
      agg.budget = r2(agg.budget + d.budget);
      agg.committed = r2(agg.committed + d.committed);
      agg.coDelta = r2(agg.coDelta + d.coDelta);
      agg.spent = r2(agg.spent + d.spent);
      agg.billed = r2(agg.billed + d.billed);
    });
    agg.forecast = r2(Math.max(agg.budget, agg.committed, agg.spent));
    agg.margin = r2(agg.contract - agg.forecast);
    agg.marginPct = agg.contract ? r2(agg.margin / agg.contract * 100) : 0;
    agg.pctSpent = agg.budget ? Math.min(100, Math.round(agg.spent / agg.budget * 100)) : 0;
    agg.noCost = !agg.budget && !agg.committed && !agg.spent;
    return agg;
  }
  function plusDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function endOfMonth() { var d = new Date(), e = new Date(d.getFullYear(), d.getMonth() + 1, 0); return e.getFullYear() + "-" + ("0" + (e.getMonth() + 1)).slice(-2) + "-" + ("0" + e.getDate()).slice(-2); }
  function fld(lb, inner) { return '<label class="field"><span class="lb">' + esc(lb) + "</span>" + inner + "</label>"; }
  function inp(id, type, val, ph) { return '<input class="in" id="' + id + '" type="' + (type || "text") + '"' + (type === "number" ? ' step="0.01"' : "") + ' value="' + esc(val == null ? "" : val) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + " />"; }
  function sel(id, opts, cur) {
    return '<select class="in" id="' + id + '">' + opts.map(function (o) {
      var v = (o && typeof o === "object") ? o.v : o, l = (o && typeof o === "object") ? o.l : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + esc(l) + "</option>";
    }).join("") + "</select>";
  }
  function V(id) { var e = document.getElementById(id); return e ? e.value : ""; }
  function VN(id) { var n = parseFloat(String(V(id)).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; }
  function bindClick(id, fn) { var e = document.getElementById(id); if (e) e.addEventListener("click", fn); return e; }
  function drillForm(K, title, body, submitLabel, fn) {
    K.drill(title, body + '<div class="btnrow" style="margin-top:18px"><button class="btn primary" id="fGo">' + esc(submitLabel) + "</button></div>");
    bindClick("fGo", fn);
  }
  // After a create submitted from a "…/new-x" route, leave the route so a
  // re-render does not reopen the form; otherwise just re-render in place.
  function afterCreate(K, base) {
    K.closeDrill();
    var h = (location.hash || "").replace(/^#\//, "");
    if (h !== base && (/\/new-[a-z0-9-]+$/.test(h) || /-new$/.test(h) || /\/(receive|issue)$/.test(h))) location.hash = "#/" + base;
    else K.reRender();
  }

  /* ============================== inline line-item grid (KUI.itemsEditor contract)
   * itemsEditor(cfg)    cfg = { id, columns:[{k,label,type:"text"|"num"|"select",
   *                     options?,width?}], rows:[...], totalKeys?:[k] } → html string.
   * itemsEditorBind(id, onChange) wires inputs + add/remove-row (delegated, so
   *                     repaints keep working). onChange receives a rows copy.
   * itemsEditorRows(id) reads the current rows.
   * Numeric columns render right-aligned mono; totalKeys get a running total row. */
  var IE_REG = {};
  function ieOptV(o) { return (o && typeof o === "object") ? o.v : o; }
  function ieOptL(o) { return (o && typeof o === "object") ? o.l : o; }
  function ieGtc(cfg) {
    return cfg.columns.map(function (c) {
      return c.width || (c.type === "num" ? "88px" : c.type === "select" ? "minmax(90px,1fr)" : "minmax(90px,1.6fr)");
    }).join(" ") + " 24px";
  }
  function ieCell(c, r, ri) {
    var v = r[c.k]; if (v == null) v = "";
    if (c.type === "select") {
      return '<select class="in" style="padding:6px 8px;font-size:12px" data-iek="' + esc(c.k) + '" data-ier="' + ri + '">' + (c.options || []).map(function (o) {
        return '<option value="' + esc(ieOptV(o)) + '"' + (String(ieOptV(o)) === String(v) ? " selected" : "") + ">" + esc(ieOptL(o)) + "</option>";
      }).join("") + "</select>";
    }
    if (c.type === "num") return '<input class="in mono" style="text-align:right;padding:6px 8px;font-size:12px" type="number" step="0.01" data-iek="' + esc(c.k) + '" data-ier="' + ri + '" value="' + esc(v) + '" />';
    return '<input class="in" style="padding:6px 8px;font-size:12px" data-iek="' + esc(c.k) + '" data-ier="' + ri + '" value="' + esc(v) + '" />';
  }
  function ieNum2(n) { return r2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function ieInner(st) {
    var cfg = st.cfg, gtc = ieGtc(cfg);
    var head = '<div style="display:grid;grid-template-columns:' + gtc + ';gap:6px;font-size:10px;color:var(--txt-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">'
      + cfg.columns.map(function (c) { return "<span" + (c.type === "num" ? ' style="text-align:right"' : "") + ">" + esc(c.label) + "</span>"; }).join("") + "<span></span></div>";
    var rows = st.rows.map(function (r, ri) {
      return '<div style="display:grid;grid-template-columns:' + gtc + ';gap:6px;margin-bottom:6px;align-items:center">'
        + cfg.columns.map(function (c) { return ieCell(c, r, ri); }).join("")
        + '<span data-ierm="' + ri + '" style="cursor:pointer;text-align:center;color:var(--txt-3);font-size:12px" title="Remove line">✕</span></div>';
    }).join("");
    var tot = "";
    if (cfg.totalKeys && cfg.totalKeys.length) {
      tot = '<div style="display:grid;grid-template-columns:' + gtc + ';gap:6px;padding-top:7px;border-top:1px solid var(--line);font-size:12px">'
        + cfg.columns.map(function (c, ci) {
          if (cfg.totalKeys.indexOf(c.k) < 0) return ci === 0 ? '<span style="color:var(--txt-3);font-weight:700">TOTAL — ' + st.rows.length + " lines</span>" : "<span></span>";
          var s = 0; st.rows.forEach(function (r) { s += Number(r[c.k]) || 0; });
          return '<span class="mono" style="text-align:right;font-weight:700" data-ietot="' + esc(c.k) + '">' + ieNum2(s) + "</span>";
        }).join("") + "<span></span></div>";
    }
    return head + (rows || '<p class="subtle" style="margin:4px 0 8px">No lines yet — add one below.</p>') + tot
      + '<div class="btnrow" style="margin-top:6px"><button type="button" class="btn sm" data-ieadd="1">+ line</button></div>';
  }
  function iePaint(id) {
    var st = IE_REG[id], el = document.getElementById(id);
    if (st && el) el.innerHTML = ieInner(st);
  }
  function ieRefreshTotals(id) {
    var st = IE_REG[id], el = document.getElementById(id);
    if (!st || !el || !st.cfg.totalKeys) return;
    st.cfg.totalKeys.forEach(function (k) {
      var s = 0; st.rows.forEach(function (r) { s += Number(r[k]) || 0; });
      Array.prototype.forEach.call(el.querySelectorAll('[data-ietot="' + k + '"]'), function (t) { t.textContent = ieNum2(s); });
    });
    var lbl = el.querySelector("[data-ietot]");
    if (lbl) { /* row count label lives in the first cell of the total row */ }
  }
  function ieRowsCopy(st) { return st.rows.map(function (r) { return Object.assign({}, r); }); }
  function itemsEditor(cfg) {
    IE_REG[cfg.id] = { cfg: cfg, rows: (cfg.rows || []).map(function (r) { return Object.assign({}, r); }), onChange: null };
    return '<div id="' + esc(cfg.id) + '" class="items-ed" style="margin:6px 0 10px">' + ieInner(IE_REG[cfg.id]) + "</div>";
  }
  function itemsEditorBind(id, onChange) {
    var st = IE_REG[id], el = document.getElementById(id);
    if (!st) return;
    st.onChange = onChange || null;
    if (!el || el._ieWired) return;
    el._ieWired = true;
    function colOf(k) { var out = null; st.cfg.columns.forEach(function (c) { if (c.k === k) out = c; }); return out; }
    function onEdit(ev) {
      var t = ev.target; if (!t || !t.getAttribute) return;
      var k = t.getAttribute("data-iek"); if (k == null) return;
      var row = st.rows[Number(t.getAttribute("data-ier"))]; if (!row) return;
      var c = colOf(k);
      row[k] = (c && c.type === "num") ? (parseFloat(t.value) || 0) : t.value;
      ieRefreshTotals(id);
      if (st.onChange) st.onChange(ieRowsCopy(st));
    }
    el.addEventListener("input", onEdit);
    el.addEventListener("change", onEdit);
    el.addEventListener("click", function (ev) {
      var t = ev.target; if (!t || !t.getAttribute) return;
      if (t.getAttribute("data-ieadd")) {
        ev.preventDefault();
        var blank = {};
        st.cfg.columns.forEach(function (c) { blank[c.k] = c.type === "num" ? 0 : (c.type === "select" && c.options && c.options.length ? ieOptV(c.options[0]) : ""); });
        st.rows.push(blank); iePaint(id);
        if (st.onChange) st.onChange(ieRowsCopy(st));
      } else if (t.getAttribute("data-ierm") != null) {
        st.rows.splice(Number(t.getAttribute("data-ierm")), 1); iePaint(id);
        if (st.onChange) st.onChange(ieRowsCopy(st));
      }
    });
  }
  function itemsEditorRows(id) { return IE_REG[id] ? ieRowsCopy(IE_REG[id]) : []; }
  function ieSetRows(id, rows) {
    var st = IE_REG[id]; if (!st) return;
    st.rows = (rows || []).map(function (r) { return Object.assign({}, r); });
    iePaint(id);
    if (st.onChange) st.onChange(ieRowsCopy(st));
  }

  /* ============================== the legacy ERP-parity helpers (job ticket depth) */
  var BLDG_TYPES = [{ v: "TH", l: "TH — Townhouse" }, { v: "SF", l: "SF — Single Family" }, { v: "MF", l: "MF — Multi-Family" }];
  function bldgLabelOf(t) { return { TH: "Townhouse", SF: "Single Family", MF: "Multi-Family" }[t] || t || "—"; }
  function jobTitleOf(j) { return (j && (j.job_id || j.job_code)) || "—"; }
  function jobOptsOf(K) {
    return K.store.list("jobs").map(function (j) { return { v: j.job_code, l: jobTitleOf(j) + " · " + (j.scope || "") }; });
  }
  function childJobsOf(K, jobCode) {
    return K.store.list("jobs").filter(function (j) { return j.parent_job === jobCode; });
  }
  function jobOrdersOf(K, jobCode) {
    return K.store.list("jobOrders", { job_code: jobCode });
  }
  function custCodeOf(acct) {
    if (!acct) return "XX";
    if (acct.code) return String(acct.code).toUpperCase();
    return String(acct.legal_name || acct.dba || "XX").split(/\s+/).slice(0, 2).map(function (w) { return (w[0] || "").toUpperCase(); }).join("") || "XX";
  }
  function routeChipOf(route) {
    var m = { WH: ["WH — warehouse", "info"], CP: ["CP — consignment", "mute"], PO: ["PO — purchase", "warn"], WO: ["WO — work order", "brand"] };
    var x = m[route];
    if (!x) return chip(route || "—", "mute");
    return '<span class="chip ' + x[1] + '" title="' + esc(x[0]) + '">' + esc(route) + "</span>";
  }
  var COLOR_HEX = { "STORM": "#5b6770", "PLATINUM GRAY": "#b9bdc0", "STERLING GRAY": "#9ba2a6", "HARBOR BLUE": "#4f6d87",
    "GLACIER WHITE": "#eef0ee", "WHITE": "#f4f4f2", "BLACK": "#1e1e1e", "NATURAL LINEN": "#e5dcc6" };
  function colorChipOf(c) {
    if (!c) return '<span class="muted">—</span>';
    var hex = COLOR_HEX[String(c).toUpperCase()];
    return '<span class="chip mute">' + (hex ? '<span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:' + hex + ';border:1px solid var(--line)"></span>' : "") + esc(c) + "</span>";
  }
  var MS_LANES = [["delivery", "Delivery"], ["start", "Start"], ["finish", "Finish"], ["sub_paid", "Sub Paid"], ["invoice", "Invoice"], ["close", "Close"]];
  /* ---- LIVE day counter (KUI.daysSince contract) ---------------------------
   * The 7/18 recon proved the legacy ERP computes the DAYS column at render time
   * (same milestones read 11/7/3 on Jul 10 and 19/15/11 on Jul 18). So stored
   * m.days is NEVER read — days derive from the milestone date vs TODAY.
   * Returns integer days elapsed; negative = future; null when unparseable. */
  function daysSince(iso) {
    if (!iso) return null;
    var d = new Date(String(iso).slice(0, 10) + "T00:00:00");
    if (isNaN(d)) return null;
    return Math.round((new Date(TODAY + "T00:00:00") - d) / 86400000);
  }
  function daysPhrase(n) {
    if (n == null) return null;
    if (n === 0) return "today";
    return n > 0 ? n + "d ago" : "in " + (-n) + "d";
  }
  // Target-vs-actual milestone delta — "3d late" / "2d early" / "on target".
  function msDelta(tgt, act) {
    if (!tgt || !act) return null;
    var a = new Date(String(act).slice(0, 10) + "T00:00:00"), t = new Date(String(tgt).slice(0, 10) + "T00:00:00");
    if (isNaN(a) || isNaN(t)) return null;
    var dd = Math.round((a - t) / 86400000);
    if (dd === 0) return "on target";
    return dd > 0 ? dd + "d late" : (-dd) + "d early";
  }
  /* ---- KUI.ctxStrip — the parent-context strip on every child record ------
   * pairs = [{lab, val, go?}] ; go is a route string ("projects/26-035").
   * Works inside drills AND views via one delegated data-ctxgo listener. */
  function ctxStrip(pairs) {
    return '<div class="ctx-strip">' + (pairs || []).map(function (p) {
      if (!p) return "";
      var v = (p.val == null || p.val === "") ? "—" : String(p.val);
      return '<span class="cx"><small>' + esc(p.lab) + "</small><b>"
        + (p.go ? '<span class="lnk" data-ctxgo="' + esc(p.go) + '">' + esc(v) + " →</span>" : esc(v))
        + "</b></span>";
    }).join("") + "</div>";
  }
  if (!window.__keystoneCtxWired) {
    window.__keystoneCtxWired = true;
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      while (t && t !== document) {
        if (t.getAttribute && t.getAttribute("data-ctxgo") != null) {
          ev.stopPropagation();
          if (window.K) { if (window.K.closeDrill) window.K.closeDrill(); window.K.go(t.getAttribute("data-ctxgo")); }
          return;
        }
        t = t.parentNode;
      }
    });
    // keyboard access for the clickable milestone lanes (.ms-lane, tabindex=0)
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var t = ev.target;
      if (t && t.classList && t.classList.contains("ms-lane")) { ev.preventDefault(); t.click(); }
    });
  }
  /* ---- job hierarchy helpers — RECURSIVE (parents aggregate grandchildren) */
  function descendantJobsOf(K, jobCode) {
    var S = K.store, out = [];
    function walk(code, depth) {
      if (depth > 4) return;
      S.list("jobs").forEach(function (j) {
        if (j.parent_job === code) { out.push(j); walk(j.job_code, depth + 1); }
      });
    }
    walk(jobCode, 0);
    return out;
  }
  function familyCodesOf(K, job) {
    return [job.job_code].concat(descendantJobsOf(K, job.job_code).map(function (j) { return j.job_code; }));
  }
  // Depth-first ordering of a flat jobs list: parent → children → grandchildren.
  // Each returned row carries _lv (0/1/2…) for indentation.
  function orderJobsTree(jobs) {
    var byParent = {}, out = [];
    jobs.forEach(function (j) { var p = j.parent_job || "__root"; (byParent[p] = byParent[p] || []).push(j); });
    function add(list, lv) {
      (list || []).forEach(function (j) { j._lv = lv; out.push(j); add(byParent[j.job_code], lv + 1); });
    }
    add(byParent.__root, 0);
    jobs.forEach(function (j) { if (out.indexOf(j) < 0) { j._lv = j.parent_job ? 1 : 0; out.push(j); } });
    return out;
  }
  function treeIndent(lv) { return lv ? '<span class="muted">' + new Array(lv).join("&nbsp;&nbsp;&nbsp;") + "↳ </span>" : ""; }
  /* ---- window.K.context — THE child-record graph assembler -----------------
   * context(col, rec) → { record, job, parents, project, customer, site,
   *   vendor, contract, lines, milestones, milestoneLog, linked:{apInvoices,
   *   arInvoices, commitments, subDraws, receipts, goodsReceipts, rfis, punch,
   *   documents, approvals, workOrders}, audit:[≤8], daysSince }.
   * Every key present only when resolvable. A future LLM (or any drill) reading
   * a child record gets the assembled graph, not 5 fields. Single pass per
   * collection; null-safe throughout; consumed via typeof-guard cross-file. */
  function kContext(col, rec) {
    var S = window.KeystoneStore;
    var out = { daysSince: daysSince };
    if (!S) return out;
    if (typeof rec === "string") rec = S.get(col, rec);
    if (!rec) return out;
    out.record = rec;
    // job + parent chain
    var job = null;
    if (col === "jobs") job = rec;
    else {
      var jc0 = rec.job_code || rec.job_id || null;   // AP/AR/RFI/punch store the job code in job_id
      if (jc0) job = S.list("jobs").filter(function (j) { return j.job_code === jc0 || j.id === jc0; })[0] || null;
    }
    var jc = job ? job.job_code : (rec.job_code || null);
    if (job) {
      out.job = job;
      var parents = [], cur = job, guard = 0;
      while (cur && cur.parent_job && guard < 6) {
        guard++;
        var pj = cur.parent_job;
        cur = S.list("jobs").filter(function (j) { return j.job_code === pj; })[0] || null;
        if (cur) parents.push(cur);
      }
      if (parents.length) out.parents = parents;
      var eff = parents.length ? parents[parents.length - 1] : job;   // root holds project/contract/milestones
      var prj = job.project_id ? S.get("projects", job.project_id) : null;
      if (!prj && eff.project_id) prj = S.get("projects", eff.project_id);
      if (prj) out.project = prj;
      if (prj && prj.customer_id) { var cu = S.get("accounts", prj.customer_id); if (cu) out.customer = cu; }
      var siteId = job.site_id || eff.site_id;
      if (siteId) { var st = S.get("sites", siteId); if (st) out.site = st; }
      out.milestones = (job.dates || eff.dates) || null;
      var mlog = S.list("milestoneLog").filter(function (m) { return m.job_code === job.job_code || m.job_code === eff.job_code; });
      if (mlog.length) out.milestoneLog = mlog;
      var ctr = S.list("contracts").filter(function (c) { return c.job_id === job.job_code || c.job_id === eff.job_code; })[0];
      if (ctr) out.contract = ctr;
    }
    if (!out.customer && rec.customer_id) { var cu2 = S.get("accounts", rec.customer_id); if (cu2) out.customer = cu2; }
    if (rec.vendor_id) { var vn = S.get("vendors", rec.vendor_id); if (vn) out.vendor = vn; }
    if (!out.vendor && rec.contractor) {
      var vn2 = S.list("vendors").filter(function (v) { return v.name === rec.contractor; })[0];
      if (vn2) out.vendor = vn2;
    }
    if (rec.lines && rec.lines.length) out.lines = rec.lines;
    else if (rec.sov && rec.sov.length) out.lines = rec.sov;
    // reference tokens this record is known by (for approval/audit matching)
    var refs = [];
    [rec.id, rec.reference_no, rec.invoice_number, rec.wo_number, rec.subcontract_id, rec.rfi_number].forEach(function (x) { if (x) refs.push(String(x)); });
    function mentions(txt) {
      if (!txt) return false;
      for (var i = 0; i < refs.length; i++) { if (String(txt).indexOf(refs[i]) >= 0) return true; }
      return false;
    }
    // linked records — everything that references this record or its job
    var lk = {};
    var poRef = rec.reference_no || rec.po_ref || null;
    lk.apInvoices = S.list("apInvoices").filter(function (i) { return (poRef && i.po_ref === poRef) || (jc && i.job_id === jc); });
    lk.arInvoices = S.list("arInvoices").filter(function (i) { return (jc && i.job_id === jc) || (i.invoice_number && mentions(i.invoice_number)); });
    lk.commitments = S.list("commitments").filter(function (c) { return (jc && c.job_code === jc) || (rec.po_ref && c.reference_no === rec.po_ref); });
    var woKeys = {};
    [rec.wo_number, rec.subcontract_id, rec.wo_ref, rec.reference_no].forEach(function (x) { if (x) woKeys[String(x)] = true; });
    lk.subDraws = S.list("subDraws").filter(function (d) { return (d.wo_ref && woKeys[String(d.wo_ref)]) || (jc && d.job_code === jc); });
    lk.workOrders = S.list("subcontracts").filter(function (s2) { return (jc && s2.job_id === jc) || woKeys[String(s2.wo_number || "")] || woKeys[String(s2.subcontract_id || "")]; });
    // AR receipts live in the ledger (source=ar-receipt); GR receipts on the PO
    var LG = window.KeystoneLedger;
    lk.receipts = (LG && typeof LG.activity === "function") ? LG.activity().filter(function (a) {
      return a.source === "ar-receipt" && ((jc && a.job_code === jc) || mentions(a.memo));
    }) : [];
    var cmIds = {};
    if (col === "commitments") cmIds[rec.id] = true;
    else lk.commitments.forEach(function (c) { cmIds[c.id] = true; });
    lk.goodsReceipts = S.list("goodsReceipts").filter(function (g) { return cmIds[g.commitment_id]; });
    lk.rfis = jc ? S.list("rfis").filter(function (r) { return r.job_id === jc; }) : [];
    lk.punch = jc ? S.list("punchItems").filter(function (p) { return p.job_id === jc; }) : [];
    lk.documents = S.list("documents").filter(function (d) { return (jc && d.linked_type === "job" && d.linked_id === jc) || d.linked_id === rec.id; });
    lk.approvals = S.list("approvals").filter(function (a) { return (jc && a.job_code === jc && (mentions(a.title) || mentions(a.detail))) || mentions(a.title) || mentions(a.detail); });
    out.linked = lk;
    // last ≤8 audit rows touching this record (by ref, then collection+token)
    var aud = [];
    S.audit(160).forEach(function (a) {
      if (aud.length >= 8) return;
      if (a.ref === rec.id || (a.ref && refs.indexOf(String(a.ref)) >= 0) || (a.collection === col && mentions(a.ref))) aud.push(a);
    });
    out.audit = aud;
    return out;
  }
  // app.js builds window.K after this file parses (and replaces any earlier
  // object), so attach as soon as the real K exists — short poll covers the
  // DOMContentLoaded-vs-macrotask ordering; consumers typeof-guard regardless.
  (function attachCtx(n) {
    if (window.K && window.K.store) { window.K.context = kContext; return; }
    if (n < 80) setTimeout(function () { attachCtx(n + 1); }, 25);
  })(0);

  /* ---- window.K.can — action-level permission gate (wave 5) ----------------
   * Reads tenant config T.permissions = { "<actionId>": { minTier: n } |
   * { roles: [..] } }. Default-ALLOW for unlisted actions; command + admin are
   * always allowed. The session role's tier resolves via T.roles[].tier.
   * Exposed on window.K with the same attach pattern K.context uses; every
   * cross-file consumer typeof-guards. */
  function kCan(actionId) {
    var T = window.KEYSTONE_TENANT || {};
    var sess = null;
    try { sess = (window.KeystoneAuth && window.KeystoneAuth.current) ? window.KeystoneAuth.current() : null; } catch (e0) {}
    var role = sess ? sess.role : null;
    if (role === "command" || role === "admin") return true;
    var rule = (T.permissions || {})[actionId];
    if (!rule) return true;   // default allow — only configured actions restrict
    if (rule.roles && rule.roles.length) return rule.roles.indexOf(role) >= 0;
    if (rule.minTier != null) {
      var tier = 0;
      (T.roles || []).forEach(function (r) { if (r.id === role) tier = Number(r.tier) || 0; });
      return tier >= Number(rule.minTier);
    }
    return true;
  }
  (function attachCan(n) {
    if (window.K && window.K.store) { if (typeof window.K.can !== "function") window.K.can = kCan; return; }
    if (n < 80) setTimeout(function () { attachCan(n + 1); }, 25);
  })(0);
  // local convenience — prefer the attached gate (another file may refine it)
  function can(actionId) {
    if (window.K && typeof window.K.can === "function") return window.K.can(actionId);
    return kCan(actionId);
  }

  function milestoneTracker(K, job, laneKey) {
    // laneKey (optional): mountView on()-factory adapter — laneKey(msId) returns
    // a data-click key; when provided each lane is a clickable, keyboard-
    // focusable .ms-lane opening the milestone drill (trigger + children).
    var f = K.fmt, d = job.dates || {};
    return '<div style="display:grid;grid-template-columns:repeat(6,minmax(88px,1fr));gap:8px;overflow-x:auto">' + MS_LANES.map(function (ln, i) {
      var m = d[ln[0]] || {};
      var done = !!m.flag, laterDone = false, j2;
      for (j2 = i + 1; j2 < MS_LANES.length; j2++) { if ((d[MS_LANES[j2][0]] || {}).flag) laterDone = true; }
      var kind = done ? "ok" : laterDone ? "warn" : "mute";
      var bd = done ? "var(--ok)" : laterDone ? "var(--warn)" : "var(--line)";
      var live = daysSince(m.actual_date || m.date);   // LIVE — achieved date when present, else target; never stored m.days
      var delta = msDelta(m.date, m.actual_date);   // #D7 — target survives the flip; actual lands beside it
      var dateTxt = (m.actual_date && m.date && m.actual_date !== m.date)
        ? "target " + f.dateShort(m.date) + " · actual " + f.dateShort(m.actual_date) + (delta ? " (" + delta + ")" : "")
        : ((m.actual_date || m.date) ? f.dateShort(m.actual_date || m.date) : "—");
      var clickable = laneKey ? ' class="ms-lane" tabindex="0" role="button" data-click="' + laneKey(ln[0]) + '" title="Open milestone — trigger, provenance, child actions"' : "";
      return "<div" + clickable + ' style="border:1px solid ' + bd + ';border-radius:10px;padding:8px 9px;text-align:center;min-width:0">'
        + '<div style="font-size:10px;color:var(--txt-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em">' + esc(ln[1]) + "</div>"
        + '<div style="font-size:15px;line-height:1.4;color:var(--' + (done ? "ok" : laterDone ? "warn" : "txt-4") + ')">' + (done ? "✓" : "○") + "</div>"
        + '<div class="mono" style="font-size:10.5px;color:var(--txt-2)">' + dateTxt + "</div>"
        + (live != null ? '<div style="margin-top:2px">' + chip(daysPhrase(live), done ? kind : (live > 0 ? "warn" : "mute")) + "</div>" : "")
        + "</div>";
    }).join("") + "</div>";
  }
  // Accounting summary — the legacy ERP tile semantics derived from LIVE data
  // (arInvoices / apInvoices / contract draws / ledger), children included so a
  // parent "both" job rolls its sub-jobs up. Arithmetic ties by construction:
  // net = to_collect − to_pay · net_cash = collected − paid.
  function acctSummaryOf(K, job) {
    var S = K.store;
    var codes = familyCodesOf(K, job);   // RECURSIVE — grandchildren (lot→scope) roll up too
    function inC(c) { return codes.indexOf(c) >= 0; }
    var ars = S.list("arInvoices").filter(function (i) { return inC(i.job_id); });
    var aps = S.list("apInvoices").filter(function (i) { return inC(i.job_id); });
    var proposed = Number(job.proposed_amount) || Number(job.contract_amount) || 0;
    var invoiced = r2(ars.reduce(function (s, i) { return s + (Number(i.sales_amount) || 0); }, 0));
    var arBal = r2(ars.reduce(function (s, i) { return s + (Number(i.balance) || 0); }, 0));
    var collected = r2(invoiced - arBal);
    var retHeld = r2(ars.reduce(function (s, i) { return s + (Number(i.retainage_amount) || 0); }, 0));
    var apInv = r2(aps.reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0));
    var apPaid = r2(aps.filter(function (i) { return i.status === "paid"; }).reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0));
    var toPay = r2(apInv - apPaid);
    var toCollect = r2(proposed - collected);
    var ct = S.list("contracts").filter(function (c) { return inC(c.job_id); })[0] || null;
    var draws = (ct && ct.draws) || [];
    var drawTot = r2(draws.reduce(function (s, dr) { return s + (Number(dr.amount) || 0); }, 0));
    var drawPaid = r2(draws.filter(function (dr) { return dr.status === "paid"; }).reduce(function (s, dr) { return s + (Number(dr.amount) || 0); }, 0));
    return {
      proposed: proposed, to_collect: toCollect, to_pay: toPay, net: r2(toCollect - toPay),
      collected: collected, paid: apPaid, net_cash: r2(collected - apPaid),
      receivables: { invoiced: invoiced, uninvoiced: r2(Math.max(0, proposed - invoiced)), receipts: collected, balance: arBal },
      payables: { invoiced: apInv, disbursed: apPaid, balance: toPay },
      retainage: { held: retHeld },
      draws: { list: draws, total: drawTot, applied: drawPaid, open: r2(drawTot - drawPaid) },
      arInvoices: ars, apInvoices: aps, contract: ct,
    };
  }

  /* ============================== WAVE 6 shared infrastructure ==============
   * Contracts this wave (typeof-guarded by every cross-file consumer):
   *   window.KMilestones.auto  — deterministic milestone auto-flip w/ provenance
   *   KUI.typeahead / typeaheadVal / typeaheadBind — datalist input helper
   *   KUI.notesSection / notesBind — universal notes block (recordNotes)
   *   window.KApprove.approval — THE one approve-and-post path (Action Hub,
   *     AP tab rows, AP drill, job-ticket draws all call this — never forked). */
  function sessName() {
    var s = null;
    try { s = (window.K && typeof window.K.session === "function") ? window.K.session() : (window.KeystoneAuth && KeystoneAuth.current()); } catch (e0) {}
    return (s && s.name) || "user";
  }
  // last_update_* stamp for job edits — spread onto every jobs patch (#1)
  function stampU(patch) {
    return Object.assign({}, patch || {}, { last_update_by: sessName(), last_update_date: TODAY });
  }
  /* ---- KUI.typeahead (contract) — datalist-based select-with-search ------- */
  var TA_REG = {};
  function typeahead(id, options, cur, ph) {
    var opts = (options || []).map(function (o) {
      if (o && typeof o === "object") { var v = o.value != null ? o.value : o.v; var l = o.label != null ? o.label : (o.l != null ? o.l : String(v)); return { v: v, l: String(l) }; }
      return { v: o, l: String(o) };
    });
    TA_REG[id] = opts;
    var curLab = "";
    if (cur != null && cur !== "") {
      opts.forEach(function (o) { if (!curLab && String(o.v) === String(cur)) curLab = o.l; });
      if (!curLab) curLab = String(cur);
    }
    return '<input class="in" id="' + esc(id) + '" list="' + esc(id) + '_dl" value="' + esc(curLab) + '" placeholder="' + esc(ph || "Type to search…") + '" autocomplete="off" />'
      + '<datalist id="' + esc(id) + '_dl">' + opts.map(function (o) { return '<option value="' + esc(o.l) + '"></option>'; }).join("") + "</datalist>";
  }
  function typeaheadVal(id) {
    var el = document.getElementById(id);
    if (!el) return "";
    var raw = el.value, opts = TA_REG[id] || [], i;
    for (i = 0; i < opts.length; i++) { if (opts[i].l === raw) return opts[i].v; }
    for (i = 0; i < opts.length; i++) { if (String(opts[i].v) === raw) return opts[i].v; }
    return raw;
  }
  function typeaheadBind(id, fn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", function () { fn(typeaheadVal(id)); });
    el.addEventListener("input", function () {
      var opts = TA_REG[id] || [], i;
      for (i = 0; i < opts.length; i++) { if (opts[i].l === el.value) { fn(opts[i].v); return; } }
    });
  }
  /* ---- KUI.notesSection (contract) — recordNotes on any record ------------ */
  function notesIdOf(refCol, refId) { return "nts_" + String(refCol) + "_" + String(refId).replace(/[^A-Za-z0-9_-]/g, "_"); }
  function notesRows(refCol, refId) {
    var S = window.KeystoneStore;
    return S ? S.list("recordNotes").filter(function (n) { return n.ref_col === refCol && n.ref_id === refId; })
      .sort(function (a, b) { return String(b.at || "").localeCompare(String(a.at || "")); }) : [];
  }
  function notesListHtml(refCol, refId) {
    var rows = notesRows(refCol, refId);
    var f = (window.K && window.K.fmt) || null;
    if (!rows.length) return '<p class="subtle" style="margin:4px 0">No notes yet — first note sets the record straight.</p>';
    return rows.map(function (n) {
      return '<div style="padding:7px 0;border-top:1px solid var(--line)"><div style="display:flex;gap:10px;align-items:center;font-size:12px"><b>' + esc(n.by || "user") + '</b><span class="mono subtle" style="margin-left:auto;font-size:10.5px">' + (f && n.at ? f.date(String(n.at).slice(0, 10)) : esc(String(n.at || "").slice(0, 10))) + '</span></div><div style="font-size:12.5px;color:var(--txt-2);margin-top:2px">' + esc(n.text) + "</div></div>";
    }).join("");
  }
  function notesSection(refCol, refId, bare) {
    var nid = notesIdOf(refCol, refId);
    var n = notesRows(refCol, refId).length;
    return (bare ? "" : drillH("Notes (" + n + ")"))
      + '<div id="' + nid + '">' + notesListHtml(refCol, refId) + "</div>"
      + '<div style="display:flex;gap:8px;margin-top:8px"><input class="in" id="' + nid + '_in" placeholder="Add a note — e.g. talked to customer AP, pay date promised…" style="flex:1" /><button type="button" class="btn primary sm" id="' + nid + '_add">Add note</button></div>';
  }
  function notesBind(refCol, refId, onAdd) {
    var nid = notesIdOf(refCol, refId);
    var btn = document.getElementById(nid + "_add"), inEl = document.getElementById(nid + "_in");
    if (!btn || btn._ntWired) return;
    btn._ntWired = true;
    function add() {
      var S = window.KeystoneStore;
      var txt = inEl ? inEl.value : "";
      if (!txt) { if (window.K) window.K.toast("Type the note first.", { kind: "warn" }); return; }
      S.insert("recordNotes", { ref_col: refCol, ref_id: refId, text: txt, by: sessName(), at: new Date().toISOString() });
      if (inEl) inEl.value = "";
      var list = document.getElementById(nid);
      if (list) list.innerHTML = notesListHtml(refCol, refId);
      if (typeof onAdd === "function") { try { onAdd(txt); } catch (e1) {} }
    }
    btn.addEventListener("click", add);
    if (inEl) inEl.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); add(); } });
  }
  /* ---- window.KMilestones (contract) — deterministic milestone auto-update
   * auto(K, jobCode, milestone, childRef, note): flips jobs.dates.<milestone>
   * to {flag:true, date:TODAY} when unset, logs provenance with the SESSION
   * user as actor + the triggering child record, and toasts. Never re-flags. */
  window.KMilestones = window.KMilestones || {};
  window.KMilestones.auto = function (K, jobCode, milestone, childRef, note) {
    try {
      var S = (K && K.store) || window.KeystoneStore;
      if (!S || !jobCode || !milestone) return null;
      var job = S.list("jobs").filter(function (j) { return j.job_code === jobCode || j.id === jobCode; })[0];
      if (!job) return null;
      var dates = JSON.parse(JSON.stringify(job.dates || freshDates()));
      var m = dates[milestone] || {};
      if (m.flag) return null;   // already achieved — no double flip, no dup provenance
      // Keep the PLAN: date stays the TARGET (set only when it was empty); the
      // achievement lands in actual_date so target-vs-actual survives the flip.
      dates[milestone] = Object.assign({}, m, { flag: true, date: m.date || TODAY, actual_date: TODAY });
      var who = sessName();
      if (typeof childRef === "string") childRef = { kind: "ref", ref: childRef };
      S.update("jobs", job.id, { dates: dates, last_update_by: who, last_update_date: TODAY }, { silent: true });
      S.insert("milestoneLog", { job_code: job.job_code, milestone: milestone, at: new Date().toISOString(), by: who,
        source: childRef ? ((childRef.kind || "ref") + " " + (childRef.ref || "")) : "auto",
        note: note || "", children: childRef ? [childRef] : [] }, { silent: true });
      if (K && K.toast) K.toast(msLaneLabel(milestone) + " auto-flagged on " + job.job_code + (childRef && childRef.label ? " — " + childRef.label : "") + ".", { title: "Milestone", kind: "ok" });
      return true;
    } catch (e2) { return null; }
  };
  /* unflag(K, jobCode, milestone, note): the deterministic INVERSE of auto —
   * when the provenance behind an auto-flip is voided, clears the flag (and
   * the actual_date), KEEPS the target date, and appends a milestoneLog row
   * with the session user as actor. Reusable by any reversal path. */
  window.KMilestones.unflag = function (K, jobCode, milestone, note) {
    try {
      var S = (K && K.store) || window.KeystoneStore;
      if (!S || !jobCode || !milestone) return null;
      var job = S.list("jobs").filter(function (j) { return j.job_code === jobCode || j.id === jobCode; })[0];
      if (!job) return null;
      var dates = JSON.parse(JSON.stringify(job.dates || freshDates()));
      var m = dates[milestone] || {};
      if (!m.flag) return null;   // nothing to clear
      dates[milestone] = { flag: false, date: m.date || null };   // target survives; the actual no longer stands
      var who = sessName();
      S.update("jobs", job.id, { dates: dates, last_update_by: who, last_update_date: TODAY }, { silent: true });
      S.insert("milestoneLog", { job_code: job.job_code, milestone: milestone, at: new Date().toISOString(), by: who,
        source: "unflag", note: note || "provenance voided — flag cleared", children: [] }, { silent: true });
      if (K && K.toast) K.toast(msLaneLabel(milestone) + " flag cleared on " + job.job_code + " — " + (note || "provenance voided") + ".", { title: "Milestone", kind: "warn" });
      return true;
    } catch (e3) { return null; }
  };
  /* Deterministic wiring on the store event bus — catches EVERY path that
   * mutates these records (drills, forms, automation, other module files):
   *   PO received → delivery · subcontract posted → start · draw applied →
   *   sub_paid · AR invoice inserted → invoice · job complete → close.
   * ("finish" is wired by the field agent per the contract.) */
  (function wireMilestoneAuto() {
    var S = window.KeystoneStore;
    if (!S || window.__keystoneMsAutoWired) return;
    window.__keystoneMsAutoWired = true;
    function KK() { return window.K && window.K.store ? window.K : { store: S, toast: function () {}, session: function () { return null; } }; }
    S.on("commitments.updated", function (p) {
      var r = p && p.record, b = p && p.before;
      if (!r || !b || !r.job_code) return;
      if (r.status === "received" && b.status !== "received") {
        window.KMilestones.auto(KK(), r.job_code, "delivery", { kind: "po", ref: r.reference_no || r.id, label: "PO " + (r.reference_no || r.id) + " received" }, "Goods received against the PO");
      }
      if (r.commitment_type === "Subcontract" && r.status === "open" && b.status !== "open") {
        window.KMilestones.auto(KK(), r.job_code, "start", { kind: "wo", ref: r.reference_no || r.id, label: "WO " + (r.reference_no || r.id) + " posted" }, "Subcontract posted — work authorized");
      }
    });
    S.on("subDraws.updated", function (p) {
      var r = p && p.record, b = p && p.before;
      if (!r || !b || !r.job_code) return;
      var live = /applied|approved|posted|paid/i;
      if (live.test(String(r.status || "")) && !live.test(String(b.status || ""))) {
        window.KMilestones.auto(KK(), r.job_code, "sub_paid", { kind: "draw", ref: r.id, label: "Draw — " + (r.contractor || "sub") }, "Contractor draw approved and posted");
      }
    });
    S.on("arInvoices.created", function (p) {
      var r = p && p.record;
      if (r && r.job_id && (Number(r.sales_amount) || 0) > 0) {
        window.KMilestones.auto(KK(), r.job_id, "invoice", { kind: "ar", ref: r.invoice_number || r.id, label: "AR " + (r.invoice_number || "") }, "AR invoice raised on the job");
      }
    });
    S.on("jobs.updated", function (p) {
      var r = p && p.record, b = p && p.before;
      if (r && b && r.status === "complete" && b.status !== "complete") {
        window.KMilestones.auto(KK(), r.job_code, "close", { kind: "job", ref: r.job_code, label: "Job set complete" }, "Job status set to complete");
      }
    });
  })();
  /* ---- AP ↔ commitment matching (#13) — po_ref exact OR vendor+job, across
   * commitments AND posted subcontracts. Returns typed candidates. */
  function matchCandidatesFor(K, vendorId, vendorName, jobCode, poRef) {
    var S = K.store, out = [], seen = {};
    var vend = vendorId ? S.get("vendors", vendorId) : (vendorName ? S.list("vendors").filter(function (v) { return v.name === vendorName; })[0] : null);
    var vid = (vend && vend.id) || vendorId || null;
    S.list("commitments").forEach(function (c) {
      if (c.status === "cancelled") return;
      var exact = poRef && c.reference_no === poRef;
      var vj = vid && jobCode && c.vendor_id === vid && c.job_code === jobCode;
      if (!exact && !vj) return;
      if (seen[c.reference_no]) return;
      seen[c.reference_no] = true;
      out.push({ kind: c.commitment_type === "Subcontract" ? "Subcontract" : "PO", ref: c.reference_no,
        category: c.category || (c.commitment_type === "Subcontract" ? "S" : "M"), cost_code: c.cost_code || "07460",
        label: (c.commitment_type === "Subcontract" ? "SC " : "PO ") + c.reference_no + " · " + (c.description || "").slice(0, 32) + " · $" + (Number(c.original_value) || 0).toFixed(2), rec: c });
    });
    S.list("subcontracts").forEach(function (s2) {
      if (["active", "open"].indexOf(s2.status) < 0) return;
      var ref = s2.wo_number || s2.subcontract_id;
      if (seen[s2.subcontract_id] || seen[ref]) return;
      var exact = poRef && (s2.subcontract_id === poRef || s2.wo_number === poRef);
      var vj = vid && jobCode && s2.vendor_id === vid && s2.job_id === jobCode;
      if (!exact && !vj) return;
      seen[ref] = true;
      out.push({ kind: "WO", ref: ref, category: "S", cost_code: "07460",
        label: "WO " + ref + " · " + (s2.scope || "subcontract").slice(0, 32) + " · $" + (Number(s2.current_value || s2.original_value) || 0).toFixed(2), rec: s2 });
    });
    return out;
  }
  /* ---- window.KApprove — the ONE approve-and-post path (#5, #2b, #10) ----- *
   * Handles both AP "Pay …" approvals (posts the voucher by CATEGORY per line:
   * M→50050 L→50000 E→50075 S→50100, chart-guarded) and "Release draw"
   * approvals (posts sub-labor cost w/ job_code + flips the subDraw to
   * applied-posted so every surface sees it). Returns {ok, msg}. */
  function approveApproval(K, a) {
    var S = K.store, L = window.KeystoneLedger;
    a = S.get("approvals", a.id) || a;
    if (a.status !== "pending") return { ok: false, msg: "Approval is " + a.status + " — only PENDING approvals can be approved." };
    if (/must be posted|Blocked/i.test(a.detail || "")) return { ok: false, msg: "Blocked — " + a.detail };
    var who = sessName();
    var job = a.job_code || null;
    // ---- sub-draw release: post cost + flip the draw everywhere (#2b) ----
    if (a.workflow === "Sub draw" || /^Release draw/i.test(a.title || "")) {
      var dm = /draw (\S+)/i.exec(a.detail || "");
      var d = dm ? S.get("subDraws", dm[1]) : null;
      if (!d) d = S.list("subDraws").filter(function (x) { return x.status === "pending" && (!job || x.job_code === job) && Math.abs((Number(x.amount) || 0) - (Number(a.amount) || 0)) < 0.005; })[0] || null;
      if (!d) return { ok: false, msg: "The pending draw behind this approval is no longer in the store." };
      // idempotency guard (#D2): an already-released draw must NEVER post again
      // — approving a stale/duplicate approval would double the cost.
      if (d.status === "applied-posted") return { ok: false, msg: "Draw " + d.id + " is already APPLIED-POSTED — approving again would post the cost a second time. Void the release that posted it (the draw reverts to pending), then approve." };
      var jrec0 = S.list("jobs").filter(function (j) { return j.job_code === d.job_code; })[0] || {};
      var acctS = apAcctFor("S");
      try {
        L.postJournal({ memo: "Draw " + d.id + " — " + (d.contractor || "sub") + (d.wo_ref ? " (WO " + d.wo_ref + ")" : ""), source: "sub-draw", source_ref: d.id, date: TODAY,
          lines: [{ account: acctS, debit: r2(d.amount), job_code: d.job_code, cost_code: jrec0.cost_code || "07460", category: "S", memo: "Sub draw — " + (d.contractor || "") },
                  { account: "2000", credit: r2(d.amount), memo: "AP — " + (d.contractor || "sub draw") }] });
      } catch (eD) { return { ok: false, msg: "Ledger post failed: " + String((eD && eD.message) || eD) }; }
      S.update("subDraws", d.id, { status: "applied-posted", approved_by: who, approved_at: new Date().toISOString() });
      if (d.wo_ref) {
        var sub2 = S.list("subcontracts").filter(function (s2) { return s2.wo_number === d.wo_ref || s2.subcontract_id === d.wo_ref; })[0];
        if (sub2) S.update("subcontracts", sub2.id, { billed_to_date: r2((Number(sub2.billed_to_date) || 0) + (Number(d.amount) || 0)) }, { silent: true });
        var cm3 = S.list("commitments").filter(function (c) { return c.reference_no === d.wo_ref && c.commitment_type === "Subcontract"; })[0];
        if (cm3) S.update("commitments", cm3.id, { invoiced_to_date: r2((Number(cm3.invoiced_to_date) || 0) + (Number(d.amount) || 0)) }, { silent: true });
      }
      S.update("approvals", a.id, { status: "approved", approved_by: who, approved_at: new Date().toISOString(), posted_draw: d.id });
      return { ok: true, msg: "Draw released — " + (acctS === "50100" ? "Dr 50100 Subcontracts" : "Dr " + acctS + " (50100 absent from chart — fell back)") + " posted with job " + d.job_code + "; draw is APPLIED-POSTED on the job ticket, calendar and cost activity." };
    }
    // ---- AP voucher: resolve the linked invoice, post BY CATEGORY (#10) ----
    if ((a.title || "").indexOf("Pay") === 0 && a.amount) {
      var cands = S.list("apInvoices").filter(function (i) { return ["paid", "approved", "voided", "withdrawn"].indexOf(i.status) < 0; });
      var inv = null;
      var invNoM = /—\s*(\S+)\s*$/.exec(a.title || "");
      if (invNoM) inv = cands.filter(function (i) { return i.invoice_number === invNoM[1]; })[0] || null;
      if (!inv && a.vendor) {
        inv = cands.filter(function (i) { return i.vendor === a.vendor && (!job || i.job_id === job) && Math.abs((i.amount || 0) - a.amount) < 0.005; })[0]
          || cands.filter(function (i) { return i.vendor === a.vendor && (!job || i.job_id === job); })[0] || null;
      }
      if (!inv && job) {
        inv = cands.filter(function (i) { return i.job_id === job && Math.abs((i.amount || 0) - a.amount) < 0.005; })[0]
          || cands.filter(function (i) { return i.job_id === job; })[0] || null;
      }
      var jobId = (inv && inv.job_id) || job || null;
      var commit = null;
      if (inv && inv.po_ref) commit = S.list("commitments").filter(function (c) { return c.reference_no === inv.po_ref; })[0] || null;
      if (!commit && jobId) {
        var vend = a.vendor ? S.list("vendors").filter(function (v) { return v.name === a.vendor; })[0] : null;
        var pool = S.list("commitments").filter(function (c) { return c.job_code === jobId && c.status !== "cancelled"; });
        if (vend) commit = pool.filter(function (c) { return c.vendor_id === vend.id; })[0] || null;
        else if (inv && inv.vendor_id) commit = pool.filter(function (c) { return c.vendor_id === inv.vendor_id; })[0] || null;
      }
      var jrec = jobId ? (S.list("jobs").filter(function (j2) { return j2.job_code === jobId; })[0] || {}) : {};
      var defCC = (commit && commit.cost_code) || jrec.cost_code || "07460";
      var defCat = (inv && inv.category) || (commit && commit.category) || "M";
      var lines = [];
      var fellBack = false;
      if (inv && inv.lines && inv.lines.length) {
        // by-category coding straight from the invoice lines (#10)
        var groups = {}, order = [];
        inv.lines.forEach(function (l) {
          if (!(Number(l.amount) > 0)) return;
          var cat = l.category || defCat;
          var acct = apAcctFor(cat);
          if (AP_CAT_ACCT[cat] && acct !== AP_CAT_ACCT[cat]) fellBack = true;
          var key = acct + "|" + (l.cost_code || defCC) + "|" + cat;
          if (!groups[key]) { groups[key] = { account: acct, cost_code: l.cost_code || defCC, category: cat, amount: 0 }; order.push(key); }
          groups[key].amount = r2(groups[key].amount + (Number(l.amount) || 0));
        });
        order.forEach(function (key) {
          var g = groups[key];
          var catName = { M: "material", L: "labor", E: "equipment", S: "subcontract" }[g.category] || "cost";
          lines.push({ account: g.account, debit: g.amount, job_code: jobId, cost_code: g.cost_code, category: g.category, memo: (a.vendor || "vendor") + " " + catName });
        });
        var lineTot = r2(lines.reduce(function (s, l) { return s + l.debit; }, 0));
        if (Math.abs(lineTot - a.amount) > 0.005 && lines.length) {
          // header/items drift — true up on the first line so AP credits the full amount
          lines[0].debit = r2(lines[0].debit + r2(a.amount - lineTot));
        }
      }
      if (!lines.length) {
        var acct1 = apAcctFor(defCat);
        if (AP_CAT_ACCT[defCat] && acct1 !== AP_CAT_ACCT[defCat]) fellBack = true;
        var catName1 = { M: "material", L: "labor", E: "equipment", S: "subcontract" }[defCat] || "material";
        lines = [{ account: acct1, debit: a.amount, job_code: jobId, cost_code: defCC, category: defCat, memo: (a.vendor || "vendor") + " " + catName1 }];
      }
      lines.push({ account: "2000", credit: a.amount, memo: "AP — " + (a.vendor || "") });
      try {
        L.postJournal({ memo: a.title, source: "ap-approval", source_ref: a.id, date: TODAY, lines: lines });
        if (inv) S.update("apInvoices", inv.id, { status: "approved" });
        if (commit) S.update("commitments", commit.id, { invoiced_to_date: r2((Number(commit.invoiced_to_date) || 0) + (Number(a.amount) || 0)) });
      } catch (eA) { return { ok: false, msg: "Ledger post failed: " + String((eA && eA.message) || eA) }; }
      // stamp WHAT this approve incremented so a later void unwinds exactly it (#D4)
      S.update("approvals", a.id, { status: "approved", approved_by: who, approved_at: new Date().toISOString(),
        posted_commit: commit ? commit.id : null, posted_amount: r2(Number(a.amount) || 0) });
      return { ok: true, msg: "Approved — voucher posted by category (" + lines.slice(0, -1).map(function (l) { return "Dr " + l.account; }).join(" · ") + ")." + (fellBack ? " NOTE: a category account is absent from the chart — fell back to 50050." : "") };
    }
    // ---- generic (non-money workflow gate) approvals ----
    S.update("approvals", a.id, { status: "approved", approved_by: who, approved_at: new Date().toISOString() });
    return { ok: true, msg: "Approved." };
  }
  window.KApprove = { approval: approveApproval };
  /* ---- job-ticket completeness (#1) — gaps + guided completion drill ------ */
  function ticketGaps(K, job) {
    var gaps = [];
    if (!job.site_id) gaps.push("site");
    if (!job.bldg_type) gaps.push("building type");
    if (!(job.lots && job.lots.length)) gaps.push("lots");
    if (!job.pm) gaps.push("PM");
    if (!job.supervisor || job.supervisor === "unassigned") gaps.push("supervisor");
    if (!job.address && !job.city) gaps.push("address");
    var d = job.dates || {};
    if (!((d.delivery && d.delivery.date) || (d.start && d.start.date) || (d.finish && d.finish.date))) gaps.push("milestone targets");
    return gaps;
  }
  // Created / Last-update falls back to the record's AUDIT rows when the
  // stamps are absent (#1) — no more empty provenance on migrated tickets.
  function jobProvenance(K, job) {
    var S = K.store;
    var created = { by: job.created_by || null, date: job.created_date || null };
    var updated = { by: job.last_update_by || null, date: job.last_update_date || null };
    if (!created.by || !updated.by) {
      var rows = S.audit(500).filter(function (a) { return a.collection === "jobs" && (a.ref === job.id || a.ref === job.job_code); });
      if (!updated.by && rows.length) updated = { by: (rows[0].actor || {}).name || "system", date: String(rows[0].at || "").slice(0, 10) };
      var cRow = rows.filter(function (a) { return a.op === "create"; })[0] || rows[rows.length - 1] || null;
      if (!created.by && cRow) created = { by: (cRow.actor || {}).name || "system", date: String(cRow.at || "").slice(0, 10) };
    }
    if (!created.date && job.createdAt) created.date = String(job.createdAt).slice(0, 10);
    if (!updated.date && job.updatedAt) updated.date = String(job.updatedAt).slice(0, 10);
    return { created: created, updated: updated };
  }
  function completeTicketForm(K, job, opp) {
    var S = K.store;
    var pr = S.get("projects", job.project_id) || {};
    var acct = S.get("accounts", pr.customer_id || (opp && opp.account_id)) || {};
    var custId = acct.id || pr.customer_id || (opp && opp.account_id) || null;
    var loc = (opp && opp.location) || "";
    var staff = S.list("staff");
    function poolOpts(roles) {
      var pool = staff.filter(function (s2) { return roles.indexOf(s2.role) >= 0; });
      if (pool.length) return pool.map(function (s2) { return { v: s2.name, l: s2.name + " · " + (s2.title || s2.dept || "") }; });
      var us = (K.T.users || []).filter(function (u) { return roles.indexOf(u.role) >= 0; });
      if (!us.length) us = K.T.users || [];
      return us.map(function (u) { return { v: u.name, l: u.name + " · " + u.roleLabel }; });
    }
    var pmOpts = poolOpts(["production", "command", "bd"]);
    var supOpts = poolOpts(["field", "production"]);
    var sOpts = S.list("sites").filter(function (st2) { return !custId || st2.customer_id === custId; })
      .map(function (st2) { return { v: st2.id, l: st2.code + " — " + st2.name }; })
      .concat([{ v: "__new", l: "— new site —" }]);
    var d0 = job.dates || {};
    var html = ctxStrip([
      { lab: "Job", val: jobTitleOf(job) },
      opp ? { lab: "From bid", val: opp.id + " · " + opp.project_name } : null,
      acct.legal_name ? { lab: "Customer", val: custCodeOf(acct) + " — " + acct.legal_name } : null,
    ].filter(function (p) { return p && p.val; }))
      + '<p class="muted" style="margin:0 0 12px">A converted bid must not stay a hollow ticket — fill the fields the bid could not carry. Everything is pre-filled where the bid knew it.</p>'
      + '<div class="form-2">'
      + fld("Site / community", sel("ctSite", sOpts, job.site_id || (sOpts[0] && sOpts[0].v)))
      + fld("New site name", inp("ctSiteName", "text", "", "e.g. TOWNS AT WHITE OAKS"))
      + fld("New site code", inp("ctSiteCode", "text", "", "e.g. TW"))
      + fld("Building type", sel("ctBldg", BLDG_TYPES, job.bldg_type || "TH"))
      + fld("Lots (comma-separated)", inp("ctLots", "text", (job.lots || []).join(", "), "e.g. 1, 2, 3, 4"))
      + fld("Address", inp("ctAddr", "text", job.address || "", "street address"))
      + fld("City / ST", inp("ctCity", "text", job.city || loc, "City, ST"))
      + fld("Project manager", sel("ctPm", pmOpts, job.pm || (pmOpts[0] && pmOpts[0].v)))
      + fld("Supervisor", sel("ctSup", supOpts, job.supervisor || (supOpts[0] && supOpts[0].v)))
      + "</div>"
      + drillH("Milestone targets")
      + '<div class="form-2">'
      + fld("Delivery target", inp("ctDel", "date", (d0.delivery || {}).date || ""))
      + fld("Start target", inp("ctStart", "date", (d0.start || {}).date || ""))
      + fld("Finish target", inp("ctFin", "date", (d0.finish || {}).date || ""))
      + "</div>"
      + '<div class="btnrow" style="margin-top:18px"><button class="btn primary" id="ctGo">Complete the ticket</button><button class="btn" id="ctLater">Complete later</button></div>'
      + '<p class="subtle" style="margin-top:8px">"Complete later" keeps a low-quality-ticket warning on the job listing exactly what is missing.</p>';
    K.drill("Complete the job ticket · " + job.job_code, html);
    function syncNewSite() {
      var isNew = V("ctSite") === "__new";
      ["ctSiteName", "ctSiteCode"].forEach(function (id2) {
        var el = document.getElementById(id2);
        if (el && el.parentNode) el.parentNode.style.opacity = isNew ? "1" : ".38";
      });
    }
    var stEl = document.getElementById("ctSite");
    if (stEl) stEl.addEventListener("change", syncNewSite);
    syncNewSite();
    bindClick("ctLater", function () {
      K.closeDrill();
      K.toast("Ticket left incomplete — the warning chip on the job lists the missing fields.", { title: "Complete later", kind: "warn" });
    });
    bindClick("ctGo", function () {
      var siteId = V("ctSite"), siteRec = null;
      if (siteId === "__new") {
        var sn = V("ctSiteName"), sc = V("ctSiteCode");
        if (!sn || !sc) { K.toast("New site needs a name and a code (e.g. TW).", { kind: "warn" }); return; }
        siteRec = S.insert("sites", { code: sc.toUpperCase(), name: sn.toUpperCase(), customer_id: custId, city: V("ctCity") || "" });
      } else siteRec = S.get("sites", siteId);
      var lots = String(V("ctLots") || "").split(/[,\s]+/).filter(function (x) { return x !== ""; });
      var bldg = V("ctBldg");
      var dates = JSON.parse(JSON.stringify(job.dates || freshDates()));
      ["delivery", "start", "finish"].forEach(function (k2, i2) {
        var v2 = V(["ctDel", "ctStart", "ctFin"][i2]);
        dates[k2] = Object.assign({}, dates[k2] || {}, { date: v2 || (dates[k2] || {}).date || null });
      });
      var patch = stampU({
        site_id: siteRec ? siteRec.id : job.site_id || null, bldg_type: bldg, bldg_type_label: bldgLabelOf(bldg),
        lots: lots.length ? lots : (job.lots || []), address: V("ctAddr"), city: V("ctCity"),
        pm: V("ctPm"), supervisor: V("ctSup"), dates: dates,
      });
      if (!job.created_by) { patch.created_by = sessName(); patch.created_date = TODAY; }
      // rebuild the coded the legacy ERP job id once the parts exist
      if (siteRec && bldg && lots.length) {
        var lotSpec = lots.length > 1 ? lots[0] + "-" + lots[lots.length - 1] : lots[0];
        var sfx = job.scope === "roofing" ? "-R" : job.scope === "both" ? "" : "-S";
        patch.job_id = custCodeOf(acct) + "-" + siteRec.code + "-" + bldg + "-" + lotSpec + (job.is_model ? " (MODEL)" : "") + sfx;
      }
      S.update("jobs", job.id, patch);
      K.toast(job.job_code + " completed" + (patch.job_id ? " — coded id " + patch.job_id : "") + ". Created/Last-update stamps carry your name.", { title: "Ticket completed", kind: "ok" });
      K.closeDrill(); K.reRender();
    });
  }
  function openCompleteTicket(K, jobCode, opp) {
    var S = K.store;
    var job = S.list("jobs").filter(function (j) { return j.job_code === jobCode || j.id === jobCode; })[0];
    if (!job) return;
    if (ticketGaps(K, job).length) completeTicketForm(K, job, opp || null);
  }

  /* ============================== quick-action registry (Action Hub renders it)
   * modules2.js pushes its own ops actions (RFI / daily log / punch / timecard /
   * estimate / work order) onto the same array — render-time, whatever exists.
   * Every entry carries a dept ("BD / Sales" · "Estimating" · "Production" ·
   * "Field" · "Accounting — AP" · "Accounting — AR" · "Payroll / HR" ·
   * "Service / Warranty" · "Executive") so the workbench can filter per role. */
  window.KActions = window.KActions || [];
  (function () {
    function act(id, icon, label, hint, route, dept) { window.KActions.push({ id: id, icon: icon, label: label, hint: hint, mod: route.split("/")[0], route: route, dept: dept || "Production" }); }
    act("new-bid", "◍", "New bid", "CRM", "crm/new-bid", "BD / Sales");
    act("new-lead", "◍", "New lead", "CRM", "crm/new-lead", "BD / Sales");
    act("new-account", "◍", "New account", "CRM", "crm/new-account", "BD / Sales");
    act("new-job", "▤", "New job", "Projects", "projects/new-job", "Production");
    act("new-po", "⛓", "New PO", "Procurement", "procurement/new-po", "Production");
    act("new-vendor", "⛓", "New vendor", "Procurement", "procurement/new-vendor", "Production");
    act("new-subcontract", "⛓", "New subcontract", "Procurement", "procurement/new-sub", "Production");
    act("new-ap-invoice", "$", "New AP invoice", "Finance", "finance/ap-new", "Accounting — AP");
    act("new-ar-invoice", "$", "New AR invoice", "Finance", "finance/ar-new", "Accounting — AR");
    act("manual-journal", "$", "Manual journal", "Finance", "finance/gl-new", "Accounting — AP");
    act("new-contract", "▧", "New contract", "Billing", "billing/new-contract", "Accounting — AR");
    act("new-draw", "▧", "New draw", "Billing", "billing/new-draw", "Accounting — AR");
    act("receive-stock", "▦", "Receive stock", "Inventory", "inventory/receive", "Production");
    act("issue-stock", "▦", "Issue to job", "Inventory", "inventory/issue", "Production");
    act("new-sku", "▦", "New SKU", "Inventory", "inventory/new-sku", "Production");
    act("new-asset", "▦", "New asset", "Inventory", "inventory/new-asset", "Production");
  })();
  // Late pass: modules2/3 push their entries after this file runs — stamp a dept
  // on anything that arrived without one (script tags execute synchronously, so
  // a 0-timeout runs after every module file has registered).
  setTimeout(function () {
    var DM = { "projectops/new-rfi": "Production", "projectops/new-log": "Field", "projectops/new-punch": "Field",
      "change/new-pco": "Production", "payroll/new-timecard": "Payroll / HR", "estimating/new-estimate": "Estimating",
      "field/new-incident": "Field", "field/new-toolbox": "Field", "service/new-wo": "Service / Warranty",
      "documents/new-upload": "Production" };
    (window.KActions || []).forEach(function (a) { if (!a.dept) a.dept = DM[a.route] || "Production"; });
  }, 0);

  /* ===================================================================== HOME */
  var home = {
    render: function (K, p, mount) {
      var S = K.store, L = window.KeystoneLedger, A = window.KeystoneAutomation, f = K.fmt;
      mountView(K, mount, function (on) {
        var tb = L.trialBalance();
        var cash = L.balance("1000"), ar = L.balance("1200"), ap = L.balance("2000");
        var approvals = S.list("approvals", { status: "pending" });
        var apprUsd = approvals.reduce(function (s, a) { return s + (a.amount || 0); }, 0);
        var jobs = S.list("jobs");
        var activeJobs = jobs.filter(function (j) { return j.status !== "complete"; }).length;
        var wip = jobs.reduce(function (s, j) { var cs = L.jobCostStatus(j.job_code); return s + Math.max(0, cs.contract - cs.billed); }, 0);
        var runs = A.runs(40);
        var pipeline = S.list("opportunities").filter(function (o) { return ["new", "screening", "submitted"].indexOf(o.stage) >= 0; });
        var pipeUsd = pipeline.reduce(function (s, o) { return s + (o.bid_amount || 0); }, 0);

        var kpis = grid("g-kpi",
          kpi({ lab: "Cash position", val: f.usdShort(cash), meta: chip("derived from ledger", "ok"), kind: "ok", click: on(function () { K.go("finance"); }) }) +
          kpi({ lab: "A/R outstanding", val: f.usdShort(ar), meta: '<span class="muted">' + S.count("arInvoices") + " open invoices</span>", kind: "info", click: on(function () { K.go("finance"); }) }) +
          kpi({ lab: "Pending approvals", val: f.usd(apprUsd), meta: chip(approvals.length + " awaiting", approvals.length ? "warn" : "mute"), kind: "warn", click: on(function () { K.go("actionhub"); }) }) +
          kpi({ lab: "Active jobs · WIP", val: activeJobs + "", meta: '<span class="muted">' + f.usdShort(wip) + " work-in-progress</span>", kind: "", click: on(function () { K.go("projects"); }) })
        );

        var feed = runs.length ? '<div class="feed">' + runs.slice(0, 8).map(function (r) {
          var k = r.status === "completed" ? "ok" : r.status === "gated" ? "warn" : r.status === "deferred" ? "info" : "bad";
          return '<div class="feed-item"><div class="ic ' + k + '">⚡</div><div class="tx">' + esc(r.workflow) + '<span class="note">' + esc(r.status) + " · " + r.steps.length + " steps" + (r.note ? " · " + esc(r.note) : "") + '</span></div><div class="tm">' + f.ago(r.at) + "</div></div>";
        }).join("") + "</div>" : empty("⚡", "No automation runs yet", "Trigger a workflow from CRM (mark a bid won) or the Automation Studio.");

        var tbCard = card({ title: "Trial balance", sub: (tb.balanced ? "In balance" : "OUT OF BALANCE") + " · derived live from " + S.count("glActivity") + " activity rows",
          head: tb.balanced ? '<span class="badge-live"><span class="dot"></span>balanced</span>' : chip("unbalanced", "bad"),
          body: '<div class="kv"><div class="k">Total debits</div><div class="v">' + f.usd(tb.totalDebit, true) + '</div><div class="k">Total credits</div><div class="v">' + f.usd(tb.totalCredit, true) + "</div></div>" +
            bar("Cash", 100 * cash / (cash + ar || 1), f.usdShort(cash), "ok") + bar("A/R", 100 * ar / (cash + ar || 1), f.usdShort(ar), "info") });

        var margin = card({ title: "Job margins", sub: "Contract vs forecast cost — derived from the ledger",
          body: jobs.map(function (j) {
            var d = derivedStatus(K, j);
            return d.noCost ? bar(j.job_code + " · " + j.scope, 0, "awaiting first cost", "warn")
              : bar(j.job_code + " · " + j.scope, d.marginPct, f.pct(d.marginPct), d.marginPct < 15 ? "warn" : "ok");
          }).join("") });

        // "My work" — the session seat's own queue (tasks + approvals + follow-ups)
        var role = (K.session() || {}).role;
        var seesAll = role === "command" || role === "admin";
        var mine = [];
        S.list("tasks").forEach(function (t) { if (t.status !== "done" && (t.assignee_role === role || seesAll)) mine.push({ ic: "✓", tx: t.title, note: (t.dept || "") + (t.due ? " · due " + f.dateShort(t.due) : ""), go: "actionhub" }); });
        if (role === "finance" || seesAll) approvals.forEach(function (a) { mine.push({ ic: "◆", tx: a.title, note: "approval · " + f.usd(a.amount || 0), go: "actionhub" }); });
        if (role === "bd" || seesAll) S.list("opportunities").forEach(function (o) { if (o.followup_next && o.followup_next <= TODAY && ["won", "lost"].indexOf(o.stage) < 0) mine.push({ ic: "↻", tx: "Follow up — " + o.project_name, note: "due " + f.dateShort(o.followup_next), go: "crm/" + o.id }); });
        var myWork = card({ title: "My work", sub: ((K.session() || {}).roleLabel || "This seat") + " — tasks, approvals & follow-ups for this seat only",
          body: mine.length ? '<div class="feed">' + mine.slice(0, 6).map(function (w) {
            return '<div class="feed-item" data-click="' + on(function () { K.go(w.go); }) + '" style="cursor:pointer"><div class="ic">' + w.ic + '</div><div class="tx">' + esc(w.tx) + '<span class="note">' + esc(w.note) + "</span></div></div>";
          }).join("") + (mine.length > 6 ? '<div class="subtle" style="padding-top:6px;font-size:11px">+ ' + (mine.length - 6) + " more in the Action Hub</div>" : "") + "</div>"
            : empty("✓", "Queue clear", "Nothing assigned to this seat right now.") });

        return head("Home", K.session().name + " · " + K.session().roleLabel + " — company at a glance", chip(K.T.name, "brand") + pill(K.T.env)) +
          kpis +
          myWork +
          grid("g-2", card({ title: "Autonomous activity", sub: "What Keystone did on its own", head: '<span class="act" data-click="' + on(function () { K.go("automation"); }) + '">Automation Studio →</span>', body: feed }) + tbCard) +
          grid("g-2e", margin + card({ title: "Pipeline", sub: pipeline.length + " open bids · " + f.usd(pipeUsd), head: '<span class="act" data-click="' + on(function () { K.go("crm"); }) + '">CRM →</span>',
            body: pipeline.slice(0, 5).map(function (o) { return bar(o.project_name, o.probability, f.usdShort(o.bid_amount), "info"); }).join("") || empty("◍", "No open bids", "") }));
      });
    },
  };

  /* ===================================================================== CRM */
  var BID_PROB = { "new": 20, screening: 35, submitted: 55, won: 100, lost: 0 };
  function ownerName(K, role) { var u = (K.T.users || []).filter(function (x) { return x.role === role; })[0]; return u ? u.name : (role || "—"); }
  function rowLine(inner) { return '<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line)">' + inner + "</div>"; }
  function drillH(t) { return '<h3 style="margin:18px 0 8px;font-size:12.5px">' + esc(t) + "</h3>"; }

  /* ---- account 360 drill ---- */
  function drillAccount(K, a0) {
    var S = K.store, f = K.fmt;
    var a = S.get("accounts", a0.id) || a0;
    var contacts = S.list("contacts", { account_id: a.id });
    var bids = S.list("opportunities", { account_id: a.id });
    var openBids = bids.filter(function (o) { return ["new", "screening", "submitted"].indexOf(o.stage) >= 0; });
    var prjIds = {}; S.list("projects").forEach(function (p) { if (p.customer_id === a.id) prjIds[p.id] = true; });
    var jobs = S.list("jobs").filter(function (j) { return prjIds[j.project_id]; });
    var ars = S.list("arInvoices").filter(function (i) { return i.customer_id === a.id; });
    var html = '<div class="kv">'
      + '<div class="k">Type</div><div class="v">' + chip(a.account_type || "—", "mute") + (a.dba ? ' <span class="subtle">dba ' + esc(a.dba) + "</span>" : "") + "</div>"
      + '<div class="k">Market</div><div class="v">' + esc((a.market || "—") + (a.city ? " · " + a.city : "")) + "</div>"
      + '<div class="k">Prequal</div><div class="v">' + statusChip(a.prequal_status || "prospect") + "</div>"
      + '<div class="k">YTD revenue</div><div class="v">' + f.usd(a.ytd_revenue || 0) + "</div>"
      + '<div class="k">Open A/R</div><div class="v">' + f.usd(a.open_ar || 0) + "</div></div>";
    html += drillH("Contacts (" + contacts.length + ")");
    html += contacts.length ? contacts.map(function (c) {
      return rowLine("<span><b style=\"font-size:12.5px\">" + esc(c.first_name + " " + c.last_name) + "</b> " + pill(c.title || c.role || "") + '<div class="subtle">' + esc((c.email || "—") + " · " + (c.phone || "—")) + "</div></span>");
    }).join("") : '<p class="subtle">No contacts on file.</p>';
    html += drillH("Bids (" + bids.length + " · " + openBids.length + " open)");
    html += bids.length ? bids.map(function (o, i) {
      return '<div class="clk" data-bid="' + i + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">' + esc(o.project_name) + "</b>" + statusChip(o.stage) + '<span class="subtle" style="margin-left:auto">' + f.usdShort(o.bid_amount) + "</span></div>";
    }).join("") : '<p class="subtle">No bids yet.</p>';
    html += drillH("Jobs (" + jobs.length + ")");
    html += jobs.length ? jobs.map(function (j, i) {
      return '<div class="clk" data-job="' + i + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);cursor:pointer"><b class="mono" style="font-size:12.5px">' + esc(j.job_code) + "</b>" + chip(j.scope, j.scope === "roofing" ? "roof" : "side") + statusChip(j.status) + '<span class="subtle" style="margin-left:auto">' + f.usd(j.contract_amount) + "</span></div>";
    }).join("") : '<p class="subtle">No jobs yet.</p>';
    html += drillH("A/R invoices (" + ars.length + ")");
    html += ars.length ? ars.map(function (iv) {
      return rowLine('<span class="mono" style="font-size:12px">' + esc(iv.invoice_number) + '</span><span class="subtle">' + esc(iv.job_id || "") + '</span><span class="subtle" style="margin-left:auto">' + ageDaysOf(iv) + "d · " + f.usd(iv.balance, true) + "</span>");
    }).join("") : '<p class="subtle">Nothing outstanding.</p>';
    K.drill("Account · " + (a.legal_name || a.id), html);
    var db = document.getElementById("drillBody");
    Array.prototype.forEach.call(db.querySelectorAll("[data-bid]"), function (el) { el.addEventListener("click", function () { drillOpp(K, bids[Number(el.getAttribute("data-bid"))]); }); });
    Array.prototype.forEach.call(db.querySelectorAll("[data-job]"), function (el) { el.addEventListener("click", function () { K.closeDrill(); K.go("projects/" + jobs[Number(el.getAttribute("data-job"))].id); }); });
  }
  /* ---- bid workspace: tabbed drill (overview · estimate · drawings · activity · documents) ---- */
  // wave-5: run the bid→job package assembler right after the won cascade and
  // phrase the toast honestly — full package · budget-only (no routes) · none.
  function jobPackageMsg(K, opp, jobCode) {
    var pkg = null;
    try {
      if (window.KJobPackage && typeof window.KJobPackage.fromBid === "function") pkg = window.KJobPackage.fromBid(K, K.store.get("opportunities", opp.id) || opp, jobCode);
    } catch (e0) {}
    if (!pkg) return "";
    if (pkg.orders || pkg.pos || pkg.subs) return " + " + pkg.orders + " job order(s), " + pkg.pos + " draft PO(s), " + pkg.subs + " draft subcontract(s) and " + pkg.budget + " budget line(s) from the bid estimate — assign vendors to activate the drafts.";
    if (pkg.budget) return " + " + pkg.budget + " budget line(s) from the estimate categories. Bid estimate has no itemized routes — job package incomplete; enrich the bid estimate.";
    return " No bid estimate on file — job package empty; a bid without that structure is a low-quality bid.";
  }
  function drillOpp(K, o0, tab) {
    var S = K.store, f = K.fmt, O = window.KeystoneOutput;
    var o = S.get("opportunities", o0.id) || o0;
    tab = tab || "overview";
    var acct = S.get("accounts", o.account_id) || {};
    var ct = o.contact_id ? (S.get("contacts", o.contact_id) || null) : null;
    var est = S.list("bidEstimates", { opportunity_id: o.id }).sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0] || null;
    var drawings = S.list("bidDrawings", { opportunity_id: o.id });
    var acts = S.list("bidActivity", { opportunity_id: o.id }).sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var bdocs = S.list("bidDocuments", { opportunity_id: o.id });
    var TABS = [["overview", "Overview"], ["estimate", "Estimate"], ["drawings", "Drawings" + (drawings.length ? " · " + drawings.length : "")], ["activity", "Activity" + (acts.length ? " · " + acts.length : "")], ["documents", "Documents" + (bdocs.length ? " · " + bdocs.length : "")]];
    var tabs = '<div class="tabs">' + TABS.map(function (t) { return '<div class="tab ' + (tab === t[0] ? "on" : "") + '" data-t="' + t[0] + '">' + t[1] + "</div>"; }).join("") + "</div>";
    var body = "";
    if (tab === "overview") {
      var canWin = o.stage !== "won" && o.stage !== "lost";
      body = '<div class="kv">'
        + '<div class="k">Account</div><div class="v"><span class="act" id="acctLink" style="cursor:pointer">' + esc(acct.legal_name || o.account_id) + " →</span></div>"
        + '<div class="k">Contact</div><div class="v">' + (ct ? esc(ct.first_name + " " + ct.last_name) + ' <span class="subtle">' + esc((ct.title || "") + " · " + (ct.email || "") + " · " + (ct.phone || "")) + "</span>" : '<span class="subtle">—</span>') + "</div>"
        + '<div class="k">Scope</div><div class="v">' + chip(o.scope, o.scope === "roofing" ? "roof" : "side") + " " + (o.sqft || 0).toLocaleString() + " sqft · " + esc(o.location || "—") + "</div>"
        + '<div class="k">Bid amount</div><div class="v"><b>' + f.usd(o.bid_amount) + "</b></div>"
        + '<div class="k">Stage</div><div class="v">' + statusChip(o.stage) + "</div>"
        + '<div class="k">Probability</div><div class="v">' + (o.probability || 0) + "%</div>"
        + '<div class="k">Bid due</div><div class="v">' + f.date(o.bid_due_date) + "</div>"
        + '<div class="k">Follow-up next</div><div class="v">' + (o.followup_next ? f.date(o.followup_next) : '<span class="subtle">—</span>') + "</div>"
        + '<div class="k">Owner</div><div class="v">' + esc(ownerName(K, o.owner_role)) + "</div>"
        + (o.lost_reason ? '<div class="k">Lost reason</div><div class="v" style="color:var(--bad)">' + esc(o.lost_reason) + "</div>" : "")
        + "</div>";
      if (o.stage === "won" && o.won_job) {
        body += '<p class="muted" style="margin-top:14px">Won → job ' + esc(o.won_job) + ' created by the automation.</p><div class="btnrow"><button class="btn" id="gotoJob">Open job ' + esc(o.won_job) + " →</button></div>";
        if (can("conversion.undo")) {
          body += '<div class="btnrow" style="margin-top:10px">' + revControl("oppUnconv", "Un-convert — remove the job package") + "</div>"
            + '<p class="subtle" style="margin-top:6px">Removes the job family, job orders, draft POs/subcontracts, budget and auto tasks, and returns this bid to SUBMITTED. Blocked if money or time already references the job.</p>';
        }
      }
      var btns = "";
      if (o.stage === "new") btns += '<button class="btn" id="advBtn">Advance to Screening</button>';
      if (o.stage === "screening") btns += '<button class="btn" id="advBtn">Advance to Submitted</button>';
      if (canWin) btns += '<button class="btn primary" id="winBtn">✓ Mark won → auto-create job</button><button class="btn danger" id="lostBtn">Mark lost</button>';
      if (btns) body += '<div class="btnrow" style="margin-top:18px">' + btns + "</div>";
    } else if (tab === "estimate") {
      if (!est) body = empty("∑", "No estimate on this bid yet", "Build one from the Estimating module assemblies.");
      else {
        var sub = est.subtotal, aAmt = r2(sub * (1 + est.overhead_pct / 100)), bAmt = r2(aAmt * (1 + est.profit_pct / 100)), tot = r2(bAmt * (1 + (est.bond_pct || 0) / 100));
        var ties = Math.abs(tot - (o.bid_amount || 0)) < 0.005;
        body = '<div class="btnrow" style="margin-bottom:12px">' + pill("v" + est.version) + statusChip(est.status) + (ties ? chip("ties to bid " + f.usd(o.bid_amount, true), "ok") : chip("does not tie to bid", "bad")) + '<button class="btn sm" id="prQuote" style="margin-left:auto">⎙ Print quote</button></div>'
          + '<div class="twrap"><table><thead><tr><th>Item</th><th class="num">Qty</th><th>UoM</th><th class="num">Unit cost</th><th class="num">Total</th></tr></thead><tbody>'
          + (est.lines || []).map(function (l) { return "<tr><td>" + esc(l.item) + '</td><td class="num">' + l.qty + "</td><td>" + esc(l.uom) + '</td><td class="num">' + f.usd(l.unit_cost, true) + '</td><td class="num">' + f.usd(l.total, true) + "</td></tr>"; }).join("")
          + '<tr><td colspan="4"><b>Direct cost subtotal</b></td><td class="num"><b>' + f.usd(sub, true) + "</b></td></tr>"
          + '<tr><td colspan="4">Overhead ' + est.overhead_pct + '%</td><td class="num">' + f.usd(r2(aAmt - sub), true) + "</td></tr>"
          + '<tr><td colspan="4">Profit ' + est.profit_pct + '%</td><td class="num">' + f.usd(r2(bAmt - aAmt), true) + "</td></tr>"
          + (est.bond_pct ? '<tr><td colspan="4">Bond ' + est.bond_pct + '%</td><td class="num">' + f.usd(r2(tot - bAmt), true) + "</td></tr>" : "")
          + '<tr><td colspan="4"><b>BID TOTAL</b></td><td class="num"><b>' + f.usd(tot, true) + "</b></td></tr>"
          + "</tbody></table></div>";
      }
    } else if (tab === "drawings") {
      body = drawings.length ? drawings.map(function (d) {
        return '<div class="sketch">' + d.svg + '<div class="cap"><span><b>' + esc(d.name) + '</b></span><span class="subtle">part of bid package · ' + esc(d.kind) + "</span></div></div>";
      }).join("") : empty("✎", "No drawings attached", "Elevation and site sketches from the plan set land here.");
    } else if (tab === "activity") {
      var ICO = { itb: "◍", site: "⚑", takeoff: "∑", quote: "▧", followup: "↻", note: "✎" };
      body = (acts.length ? '<div class="feed">' + acts.map(function (a2) {
        return '<div class="feed-item"><div class="ic">' + (ICO[a2.kind] || "•") + '</div><div class="tx">' + esc(a2.note) + '<span class="note">' + esc(a2.actor || "") + " · " + f.date(String(a2.at).slice(0, 10)) + "</span></div></div>";
      }).join("") + "</div>" : empty("↻", "No activity yet", "Log the first touch below."))
        + '<div style="display:flex;gap:8px;margin-top:14px"><input class="in" id="actNote" placeholder="Add a note to the timeline…" style="flex:1" /><button class="btn primary" id="actAdd">Add</button></div>';
    } else {
      body = bdocs.length ? '<div class="twrap"><table><thead><tr><th>Document</th><th>Type</th><th>Added</th><th class="num">Size</th></tr></thead><tbody>'
        + bdocs.map(function (d2, i) { return '<tr class="clk" data-doc="' + i + '"><td><b>' + esc(d2.name) + "</b></td><td>" + chip(d2.type, "mute") + "</td><td>" + f.dateShort(d2.added_at) + '</td><td class="num">' + esc(d2.size || "") + "</td></tr>"; }).join("")
        + "</tbody></table></div>" : empty("❐", "No documents", "ITB, plan set, quote PDF and photos attach here.");
    }
    K.drill("Bid " + o.id + " · " + o.project_name, tabs + body);
    var db = document.getElementById("drillBody");
    Array.prototype.forEach.call(db.querySelectorAll(".tab[data-t]"), function (el) { el.addEventListener("click", function () { drillOpp(K, o, el.getAttribute("data-t")); }); });
    bindClick("acctLink", function () { drillAccount(K, acct); });
    bindClick("gotoJob", function () { K.closeDrill(); K.go("projects/" + o.won_job); });
    bindClick("advBtn", function () {
      var next = o.stage === "new" ? "screening" : "submitted";
      S.update("opportunities", o.id, { stage: next, probability: BID_PROB[next] });
      K.toast(o.project_name + " advanced to " + next + ".", { title: "Stage moved", kind: "ok" });
      K.reRender(); drillOpp(K, o, "overview");
    });
    bindClick("winBtn", function () {
      // lightweight inline confirm — first click arms, second click executes the cascade
      var b = document.getElementById("winBtn");
      if (b && !b._armed) { b._armed = true; b.textContent = "Confirm won → creates job"; return; }
      S.update("opportunities", o.id, { stage: "won", probability: 100, won_job: "JOB-" + o.id });   // fires wf_won_opportunity
      // wave-5: carry the FULL bid package onto the new job (CMiC bid-items pattern)
      K.closeDrill();
      K.toast("Won bid recorded — automation is creating the project, job and takeoff task." + jobPackageMsg(K, o, "JOB-" + o.id), { title: "Automation fired", kind: "ok", ms: 7500 });
      // #1 conversion completeness: the new job must not stay a hollow ticket —
      // open the guided completion drill pre-filled from the bid (skippable).
      setTimeout(function () { K.reRender(); openCompleteTicket(K, "JOB-" + o.id, S.get("opportunities", o.id) || o); }, 250);
    });
    bindRev(K, "oppUnconv", function (reason) {
      var res = window.KReversals.undoConversion(K, o, reason);
      revToast(K, res, "Un-convert bid");
      if (res.ok) { K.closeDrill(); K.reRender(); }
    });
    bindClick("lostBtn", function () {
      var reason = window.prompt("Reason lost (goes on the record):", "Price");
      if (reason === null) return;
      S.update("opportunities", o.id, { stage: "lost", probability: 0, lost_reason: reason });
      K.closeDrill(); K.reRender();
    });
    bindClick("prQuote", function () {
      if (!est) return;
      var s2 = est.subtotal, a3 = r2(s2 * (1 + est.overhead_pct / 100)), b3 = r2(a3 * (1 + est.profit_pct / 100)), t3 = r2(b3 * (1 + (est.bond_pct || 0) / 100));
      var lines = (est.lines || []).map(function (l) { return { desc: l.item + " — " + l.qty + " " + l.uom, amount: l.total }; });
      lines.push({ desc: "Overhead " + est.overhead_pct + "%", amount: r2(a3 - s2) });
      lines.push({ desc: "Profit " + est.profit_pct + "%", amount: r2(b3 - a3) });
      if (est.bond_pct) lines.push({ desc: "Bond " + est.bond_pct + "%", amount: r2(t3 - b3) });
      O.print("Quote — " + o.project_name, O.docs.invoice({ type: "QUOTE — proposal", number: "Q-" + o.id + "-v" + est.version, date: todayISO(), due: o.bid_due_date, customer: (acct.legal_name || "") + (acct.city ? " · " + acct.city : ""), job: o.project_name + " · " + (o.location || ""), lines: lines }));
    });
    bindClick("actAdd", function () {
      var v = V("actNote"); if (!v) return;
      S.insert("bidActivity", { opportunity_id: o.id, at: new Date().toISOString(), kind: "note", note: v, actor: (K.session() || {}).name || "user" });
      drillOpp(K, o, "activity");
    });
    Array.prototype.forEach.call(db.querySelectorAll("tr[data-doc]"), function (el) {
      el.addEventListener("click", function () { K.toast("Demo file — document storage connects to Google Drive in production.", { title: bdocs[Number(el.getAttribute("data-doc"))].name, kind: "" }); });
    });
  }

  /* ---- CRM create forms (kanban +New, toolbar, lead conversion) ---- */
  function bidForm(K, preset) {
    preset = preset || {};
    var S = K.store;
    var accts = S.list("accounts"), cts = S.list("contacts");
    var acctOpts = accts.map(function (a) { return { v: a.id, l: a.legal_name }; });
    var ctOpts = [{ v: "", l: "— none yet —" }].concat(cts.map(function (c) { var a = S.get("accounts", c.account_id) || {}; return { v: c.id, l: c.first_name + " " + c.last_name + " (" + (a.dba || a.legal_name || "") + ")" }; }));
    var defAcct = preset.account_id;
    if (!defAcct && preset.client) {
      var q = String(preset.client).toLowerCase();
      accts.forEach(function (a) {
        if (defAcct) return;
        var ln = String(a.legal_name || "").toLowerCase(), dn = String(a.dba || "").toLowerCase();
        if ((dn && q.indexOf(dn) >= 0) || (ln && q.indexOf(ln.split(" ")[0]) >= 0) || ln.indexOf(q) >= 0) defAcct = a.id;
      });
    }
    var stage = preset.stage || "new";
    var html = '<div class="form-2">'
      + fld("Project name", inp("bProj", "text", preset.project_name || "", "e.g. Parkside Ph.2"))
      + fld("Account", sel("bAcct", acctOpts, defAcct || (acctOpts[0] && acctOpts[0].v)))
      + fld("Contact", sel("bCt", ctOpts, preset.contact_id || ""))
      + fld("Scope", sel("bScope", ["siding", "roofing", "both"], preset.scope || "siding"))
      + fld("Sqft", inp("bSqft", "number", preset.sqft || "", "22400"))
      + fld("Bid amount ($)", inp("bAmt", "number", "", "148500"))
      + fld("Bid due date", inp("bDue", "date", ""))
      + fld("Stage", sel("bStage", [{ v: "new", l: "New" }, { v: "screening", l: "Screening" }, { v: "submitted", l: "Submitted" }, { v: "won", l: "Won" }, { v: "lost", l: "Lost" }], stage))
      + fld("Location", inp("bLoc", "text", preset.location || "", "City, ST"))
      + "</div>"
      + '<p class="subtle">Probability presets by stage: new 20 · screening 35 · submitted 55.</p>';
    drillForm(K, preset.lead ? "Convert lead → bid" : "New bid", html, "Create bid", function () {
      var name = V("bProj"); if (!name) { K.toast("Project name is required.", { kind: "warn" }); return; }
      var amt = VN("bAmt"); if (!amt) { K.toast("Bid amount is required.", { kind: "warn" }); return; }
      var st = V("bStage") || "new";
      var mx = 2000; S.list("opportunities").forEach(function (x) { var m = /^BID-(\d+)$/.exec(x.id || ""); if (m) mx = Math.max(mx, parseInt(m[1], 10)); });
      var rec = S.insert("opportunities", { id: "BID-" + (mx + 1), account_id: V("bAcct"), contact_id: V("bCt") || null, project_name: name, location: V("bLoc"), scope: V("bScope"), sqft: VN("bSqft"), bid_due_date: V("bDue") || null, bid_amount: amt, stage: st, probability: BID_PROB[st] == null ? 20 : BID_PROB[st], owner_role: "bd" });
      if (preset.lead) S.update("leads", preset.lead.id, { status: "converted", converted_bid: rec.id });
      K.toast(rec.id + " · " + name + " → " + st + " column.", { title: preset.lead ? "Lead converted" : "Bid created", kind: "ok" });
      afterCreate(K, "crm");
    });
  }
  function leadForm(K) {
    var S = K.store;
    drillForm(K, "New lead", '<div class="form-2">'
      + fld("Client", inp("lClient", "text", "", "Builder / GC name"))
      + fld("Project", inp("lProj", "text", "", "Subdivision / phase"))
      + fld("Location", inp("lLoc", "text", "", "City, ST"))
      + fld("Scope", sel("lScope", ["siding", "roofing", "both"], "siding"))
      + fld("Source", sel("lSrc", ["portal", "email", "referral", "web"], "portal")) + "</div>",
      "Create lead", function () {
        if (!V("lClient")) { K.toast("Client is required.", { kind: "warn" }); return; }
        S.insert("leads", { source: V("lSrc"), source_sender: "", received_at: new Date().toISOString(), raw_subject: V("lClient") + " — " + (V("lProj") || "inquiry"), parsed_client: V("lClient"), parsed_project: V("lProj") || "—", parsed_location: V("lLoc") || "—", parsed_scope: V("lScope"), status: "new" });
        K.toast(V("lClient") + " added to the triage queue.", { title: "Lead created", kind: "ok" });
        afterCreate(K, "crm");
      });
  }
  function accountForm(K) {
    var S = K.store;
    drillForm(K, "New account", '<div class="form-2">'
      + fld("Legal name", inp("aLegal", "text", "", "e.g. Meritage Homes Corp"))
      + fld("DBA", inp("aDba", "text", "", "short name"))
      + fld("Type", sel("aType", ["builder", "gc", "developer", "owner"], "builder"))
      + fld("Market", sel("aMkt", ["VA", "MD", "DC", "WV", "NC", "GA"], "VA"))
      + fld("City", inp("aCity", "text", "", "City, ST")) + "</div>",
      "Create account", function () {
        if (!V("aLegal")) { K.toast("Legal name is required.", { kind: "warn" }); return; }
        S.insert("accounts", { legal_name: V("aLegal"), dba: V("aDba") || V("aLegal"), account_type: V("aType"), market: V("aMkt"), city: V("aCity"), prequal_status: "prospect", ytd_revenue: 0, open_ar: 0 });
        K.toast(V("aLegal") + " added as a prospect.", { title: "Account created", kind: "ok" });
        afterCreate(K, "crm");
      });
  }

  var crm = {
    count: function (K) { return K.store.list("opportunities").filter(function (o) { return ["new", "screening", "submitted"].indexOf(o.stage) >= 0; }).length; },
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt;
      var STAGES = [{ k: "new", n: "New" }, { k: "screening", n: "Screening" }, { k: "submitted", n: "Submitted" }, { k: "won", n: "Won" }, { k: "lost", n: "Lost" }];
      mountView(K, mount, function (on) {
        var opps = S.list("opportunities");
        var open = opps.filter(function (o) { return ["new", "screening", "submitted"].indexOf(o.stage) >= 0; });
        var won = opps.filter(function (o) { return o.stage === "won"; }), lost = opps.filter(function (o) { return o.stage === "lost"; });
        var winRate = (won.length + lost.length) ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
        var pipeUsd = open.reduce(function (s, o) { return s + (o.bid_amount || 0); }, 0);

        var kanban = '<div class="kanban">' + STAGES.map(function (st) {
          var cards = opps.filter(function (o) { return o.stage === st.k; });
          var val = cards.reduce(function (s, o) { return s + (o.bid_amount || 0); }, 0);
          return '<div class="kcol" data-stage="' + st.k + '"><div class="kcol-h"><span>' + st.n + '</span><span class="n">' + cards.length + " · " + f.usdShort(val) + "</span></div>" +
            cards.map(function (o) {
              var liveStage = ["won", "lost"].indexOf(o.stage) < 0;
              var overdue = liveStage && o.bid_due_date && o.bid_due_date < TODAY;
              var fuDue = liveStage && o.followup_next && o.followup_next <= TODAY;
              return '<div class="kcard" draggable="true" data-oid="' + esc(o.id) + '" data-click="' + on(function () { drillOpp(K, o); }) + '"><b>' + esc(o.project_name) + "</b><div class=\"m\">" + chip(o.scope, o.scope === "roofing" ? "roof" : "side") + '<span class="muted">' + f.usdShort(o.bid_amount) + '</span><span class="muted">' + (o.probability || 0) + "%</span></div>"
                + '<div class="m" style="margin-top:4px"><span class="muted mono" style="font-size:10.5px">due ' + f.dateShort(o.bid_due_date) + "</span>" + (overdue ? chip("overdue", "bad") : "") + (fuDue ? chip("follow-up", "warn") : "") + "</div></div>";
            }).join("") +
            '<div class="kadd" data-click="' + on(function () { bidForm(K, { stage: st.k }); }) + '">+ New</div>' +
            "</div>";
        }).join("") + "</div>";

        var fups = opps.filter(function (o) { return o.followup_next && o.followup_next <= TODAY && ["won", "lost"].indexOf(o.stage) < 0; })
          .sort(function (a, b) { return String(a.followup_next).localeCompare(String(b.followup_next)); });
        var fupCard = card({ title: "Follow-ups due", sub: fups.length + " open bids need a touch (follow-up date ≤ today)",
          body: fups.length ? fups.map(function (o) {
            var days = Math.round((new Date(TODAY + "T00:00:00") - new Date(String(o.followup_next).slice(0, 10) + "T00:00:00")) / 86400000);
            return '<div data-click="' + on(function () { drillOpp(K, o); }) + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);cursor:pointer"><b style="font-size:12.5px">' + esc(o.project_name) + "</b>" + statusChip(o.stage) + '<span class="subtle">' + esc((S.get("accounts", o.account_id) || {}).dba || "") + '</span><span class="subtle" style="margin-left:auto">' + f.dateShort(o.followup_next) + "</span>" + (days > 0 ? chip(days + "d overdue", "bad") : chip("due today", "warn")) + "</div>";
          }).join("") : empty("↻", "No follow-ups due", "") });

        var leads = S.list("leads");
        var leadTbl = tbl([{ label: "Received", map: function (r) { return '<span class="mono">' + f.dateShort(r.received_at) + "</span>"; } }, { label: "Client", k: "parsed_client" }, { label: "Project", k: "parsed_project" }, { label: "Location", k: "parsed_location" }, { label: "Scope", map: function (r) { return chip(r.parsed_scope, "mute"); } }, { label: "Status", map: function (r) { return statusChip(r.status); } },
          { label: "", map: function (r) { return r.status === "converted" ? chip("converted", "ok") : '<button class="btn sm" data-click="' + r._conv + '">Convert → bid</button>'; } }],
          leads.map(function (r) {
            return Object.assign({}, r, { _conv: on(function () { bidForm(K, { stage: "new", lead: r, client: r.parsed_client, project_name: r.parsed_project === "—" ? "" : r.parsed_project, location: r.parsed_location === "—" ? "" : r.parsed_location, scope: r.parsed_scope }); }) });
          }));

        var accts = S.list("accounts");
        var acctTbl = tbl([{ label: "Account", map: function (r) { return "<b>" + esc(r.legal_name) + "</b>"; } }, { label: "Type", map: function (r) { return chip(r.account_type, "mute"); } }, { label: "Market", k: "market" }, { label: "Prequal", map: function (r) { return statusChip(r.prequal_status); } }, { label: "YTD revenue", cls: "num", map: function (r) { return f.usd(r.ytd_revenue); } }, { label: "Open A/R", cls: "num", map: function (r) { return f.usd(r.open_ar); } }],
          accts.map(function (a) { return Object.assign({}, a, { _click: on(function () { drillAccount(K, a); }) }); }));

        var tools = '<button class="btn sm primary" data-click="' + on(function () { bidForm(K, { stage: "new" }); }) + '">+ New bid</button>'
          + '<button class="btn sm" data-click="' + on(function () { leadForm(K); }) + '">+ New lead</button>'
          + '<button class="btn sm" data-click="' + on(function () { accountForm(K); }) + '">+ New account</button> '
          + chip(open.length + " open bids", "info");

        return head("CRM & Pipeline", "Leads, accounts and the bid pipeline CMiC never had — won bids cascade into jobs automatically", tools) +
          grid("g-kpi",
            kpi({ lab: "Open pipeline", val: f.usdShort(pipeUsd), meta: '<span class="muted">' + open.length + " active bids</span>", kind: "info" }) +
            kpi({ lab: "Win rate", val: winRate + "%", meta: '<span class="muted">' + won.length + " won · " + lost.length + " lost</span>", kind: winRate >= 50 ? "ok" : "warn" }) +
            kpi({ lab: "New leads", val: S.list("leads", { status: "new" }).length + "", meta: chip("needs triage", "warn"), kind: "warn" }) +
            kpi({ lab: "Accounts", val: accts.length + "", meta: '<span class="muted">' + accts.filter(function (a) { return a.prequal_status === "prospect"; }).length + " prospects</span>" })
          ) +
          card({ title: "Bid pipeline", sub: "Click a card → full bid workspace. Drag a card to move stage (drop on Won fires the job-creation automation). + New adds straight into a column.", body: kanban }) +
          fupCard +
          grid("g-2", card({ title: "Inbound leads", sub: "Auto-parsed from portal / email / referral — one click converts to a bid", body: leads.length ? leadTbl : empty("◍", "Inbox clear", "") }) +
            card({ title: "Accounts", sub: "Click an account → contacts, bids, jobs and A/R in one view", body: acctTbl }));
      });
      // HTML5 drag-to-stage: drop = S.update(stage + stage-default probability);
      // dropping on Won sets won_job so the same wf_won_opportunity automation
      // fires as the drill's "Mark won" button; Lost still collects a reason.
      (function () {
        var dragId = null;
        Array.prototype.forEach.call(mount.querySelectorAll(".kcard[draggable]"), function (el) {
          el.addEventListener("dragstart", function (ev) {
            dragId = el.getAttribute("data-oid");
            if (ev.dataTransfer) { ev.dataTransfer.effectAllowed = "move"; try { ev.dataTransfer.setData("text/plain", dragId); } catch (e2) {} }
          });
        });
        Array.prototype.forEach.call(mount.querySelectorAll(".kcol[data-stage]"), function (col) {
          col.addEventListener("dragover", function (ev) { ev.preventDefault(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move"; });
          col.addEventListener("drop", function (ev) {
            ev.preventDefault();
            var id = dragId || (ev.dataTransfer && ev.dataTransfer.getData("text/plain"));
            dragId = null;
            if (!id) return;
            var o = S.get("opportunities", id); if (!o) return;
            var st2 = col.getAttribute("data-stage");
            if (o.stage === st2) return;
            var patch = { stage: st2, probability: BID_PROB[st2] == null ? (o.probability || 0) : BID_PROB[st2] };
            if (st2 === "won") patch.won_job = o.won_job || ("JOB-" + o.id);
            if (st2 === "lost") { var reason = window.prompt("Reason lost (goes on the record):", "Price"); if (reason === null) return; patch.lost_reason = reason; }
            S.update("opportunities", o.id, patch);   // stage=won fires wf_won_opportunity
            var pkgMsg = st2 === "won" ? jobPackageMsg(K, o, patch.won_job) : "";
            K.toast(o.project_name + " → " + st2 + (st2 === "won" ? " — automation is creating the project + job." + pkgMsg : "."), { title: "Stage moved", kind: "ok", ms: st2 === "won" ? 7500 : undefined });
            // #1: drop-on-Won follows the same completeness path as "Mark won"
            setTimeout(function () { K.reRender(); if (st2 === "won") openCompleteTicket(K, patch.won_job, S.get("opportunities", o.id) || o); }, st2 === "won" ? 250 : 0);
          });
        });
      })();
      if (p.id === "new-bid") bidForm(K, { stage: "new" });
      else if (p.id === "new-lead") leadForm(K);
      else if (p.id === "new-account") accountForm(K);
      else if (p.id && p.id.indexOf("new-") !== 0) { var o0 = S.get("opportunities", p.id); if (o0) drillOpp(K, o0); }
    },
  };

  /* ================================================================ PROJECTS */
  function ta(id, val, ph) {
    return '<textarea class="in" id="' + id + '" rows="2"' + (ph ? ' placeholder="' + esc(ph) + '"' : "")
      + ' style="resize:vertical;font-family:var(--mono);font-size:12px;width:100%">' + esc(val == null ? "" : val) + "</textarea>";
  }
  function nextJobCode(K) {
    var mx = 0;
    K.store.list("jobs").forEach(function (j) { var m = /^26-(\d+)$/.exec(j.job_code || ""); if (m) mx = Math.max(mx, parseInt(m[1], 10)); });
    return "26-" + ("00" + (mx + 1)).slice(-3);
  }
  function freshDates(del, st, fin) {
    return { delivery: { flag: false, date: del || null }, start: { flag: false, date: st || null, days: null },
      finish: { flag: false, date: fin || null, days: null }, sub_paid: { flag: false },
      invoice: { flag: false, date: null, days: null }, close: { flag: false } };
  }
  // Copy the newest same-bldg-type BASE job-order template onto a new job —
  // the the legacy ERP pattern: every ticket starts from the standard BASE list.
  function seedBaseOrders(K, targetJobCode, bldg) {
    var S = K.store, src = null;
    S.list("jobs").forEach(function (j) {
      if (src || j.job_code === targetJobCode) return;
      if (bldg && j.bldg_type && j.bldg_type !== bldg) return;
      if (S.list("jobOrders").some(function (o) { return o.job_code === j.job_code && o.lot === "BASE"; })) src = j;
    });
    if (!src) {   // fall back to any job with a BASE template
      S.list("jobs").forEach(function (j) {
        if (src || j.job_code === targetJobCode) return;
        if (S.list("jobOrders").some(function (o) { return o.job_code === j.job_code && o.lot === "BASE"; })) src = j;
      });
    }
    if (!src) return 0;
    var rows = S.list("jobOrders").filter(function (o) { return o.job_code === src.job_code && o.lot === "BASE"; });
    rows.forEach(function (o) {
      S.insert("jobOrders", { job_code: targetJobCode, lot: "BASE", route: o.route, category: o.category,
        material: o.material, color: o.color, qty: o.qty, unit: o.unit, status: "planned" }, { silent: true });
    });
    return rows.length;
  }
  function jobForm(K) {
    var S = K.store, f = K.fmt;
    var code = nextJobCode(K);
    var accts = S.list("accounts");
    var custOpts = accts.map(function (a) { return { v: a.id, l: a.legal_name + " (" + custCodeOf(a) + ")" }; });
    var prOpts = [{ v: "__new", l: "— new project (auto-named from site + lots) —" }].concat(S.list("projects").map(function (p2) { return { v: p2.id, l: p2.name }; }));
    var staff = S.list("staff");
    function poolOpts(roles) {
      var pool = staff.filter(function (s2) { return roles.indexOf(s2.role) >= 0; });
      if (pool.length) return pool.map(function (s2) { return { v: s2.name, l: s2.name + " · " + (s2.title || s2.dept || "") }; });
      var us = (K.T.users || []).filter(function (u) { return roles.indexOf(u.role) >= 0; });
      if (!us.length) us = K.T.users || [];
      return us.map(function (u) { return { v: u.name, l: u.name + " · " + u.roleLabel }; });
    }
    var pmOpts = poolOpts(["production", "command", "bd"]);
    var supOpts = poolOpts(["field", "production"]);
    if (!pmOpts.length) pmOpts = [{ v: "unassigned", l: "unassigned" }];
    if (!supOpts.length) supOpts = [{ v: "unassigned", l: "unassigned" }];
    function siteOptsFor(custId) {
      return S.list("sites").filter(function (st2) { return !custId || st2.customer_id === custId; })
        .map(function (st2) { return { v: st2.id, l: st2.code + " — " + st2.name }; })
        .concat([{ v: "__new", l: "— new site —" }]);
    }
    var sOpts = siteOptsFor(custOpts[0] && custOpts[0].v);
    var html = drillH("Customer · site · building")
      + '<div class="form-2">'
      + fld("Customer", sel("jCust", custOpts, custOpts[0] && custOpts[0].v))
      + fld("Site / community", sel("jSite", sOpts, sOpts[0] && sOpts[0].v))
      + fld("New site name", inp("jSiteName", "text", "", "e.g. TOWNS AT WHITE OAKS"))
      + fld("New site code", inp("jSiteCode", "text", "", "e.g. TW"))
      + fld("Building type", sel("jBldg", BLDG_TYPES, "TH"))
      + fld("Lots (comma-separated)", inp("jLots", "text", "", "e.g. 1, 2, 3, 4"))
      + fld("Model", '<span style="display:inline-flex;gap:8px;align-items:center;font-size:12.5px;padding:8px 0"><input type="checkbox" id="jModel" style="width:auto" /> MODEL job (template lots)</span>')
      + fld("Scope", sel("jScope", [{ v: "siding", l: "Siding (-S)" }, { v: "roofing", l: "Roofing (-R)" }, { v: "both", l: "Both — parent + 2 sub-jobs" }], "siding"))
      + "</div>"
      + '<div id="jSplitWrap" class="hidden"><div class="form-2">'
      + fld("Siding portion ($)", inp("jAmtS", "number", "", "blank = split evenly"))
      + fld("Roofing portion ($)", inp("jAmtR", "number", "", "blank = split evenly"))
      + "</div></div>"
      + drillH("Location · people")
      + '<div class="form-2">'
      + fld("Address", inp("jAddr", "text", "", "e.g. 100 Aurora Court"))
      + fld("City / ST / zip", inp("jCity", "text", "", "e.g. White Post, VA 22663"))
      + fld("Project", sel("jPrj", prOpts, "__new"))
      + fld("Project manager", sel("jPm", pmOpts, pmOpts[0] && pmOpts[0].v))
      + fld("Supervisor", sel("jSup", supOpts, supOpts[0] && supOpts[0].v))
      + fld("Job code (auto)", '<input class="in" id="jCode" value="' + code + '" readonly />')
      + "</div>"
      + fld("Pricing-memo note (mono — the the legacy ERP header note)", ta("jNote", "", "SAMPLE  LAP-73.3252  SHAKE-2.412  BNB-2.472  |  ALT  LAP-72 …"))
      + drillH("Money · milestones · colors")
      + '<div class="form-2">'
      + fld("Proposed amount ($)", inp("jAmt", "number", "", "0.00"))
      + fld("Retainage %", inp("jRet", "number", 0))
      + fld("Cost budget ($)", inp("jBud", "number", "", "0.00"))
      + fld("Delivery target", inp("jDelDate", "date", ""))
      + fld("Start target", inp("jStartDate", "date", ""))
      + fld("Finish target", inp("jFinDate", "date", ""))
      + "</div>"
      + fld("Color scheme per lot (comma-separated, aligned to lots)", inp("jColors", "text", "", "e.g. Storm, Platinum Gray, Harbor Blue, Sterling Gray"))
      + '<p class="subtle">Coded job id builds itself: customer code + site code + building type + lot span (+ MODEL) + scope suffix — e.g. <span class="mono">LH-TW-TH-1-4 (MODEL)-S</span>. Scope BOTH creates the parent plus a -S and a -R sub-job (one parent, never duplicate job ids). The BASE job-order template copies from the newest same-type job.</p>';
    drillForm(K, "New job — the legacy ERP-depth ticket", html, "Create job", function () {
      var custId = V("jCust"), acct = S.get("accounts", custId) || {};
      var amt = VN("jAmt");
      if (!amt) { K.toast("Proposed amount is required.", { kind: "warn" }); return; }
      var lots = String(V("jLots") || "").split(/[,\s]+/).filter(function (x) { return x !== ""; });
      var siteId = V("jSite"), siteRec = null;
      if (siteId === "__new" || !siteId) {
        var sn = V("jSiteName"), sc = V("jSiteCode");
        if (!sn || !sc) { K.toast("New site needs a name and a code (e.g. TW).", { kind: "warn" }); return; }
        siteRec = S.insert("sites", { code: sc.toUpperCase(), name: sn.toUpperCase(), customer_id: custId, city: V("jCity") || "" });
      } else siteRec = S.get("sites", siteId);
      var bldg = V("jBldg");
      var scope = V("jScope");
      var isModel = !!(document.getElementById("jModel") || {}).checked;
      var lotSpec = lots.length > 1 ? lots[0] + "-" + lots[lots.length - 1] : (lots[0] || "1");
      var idBase = custCodeOf(acct) + "-" + ((siteRec && siteRec.code) || "XX") + "-" + bldg + "-" + lotSpec + (isModel ? " (MODEL)" : "");
      var me = (K.session() || {}).name || "user";
      var prjId = V("jPrj");
      if (prjId === "__new") {
        var prName = ((siteRec && siteRec.name) || "New site") + " — " + (isModel ? "Model " : "Lots ") + lotSpec;
        var pr = S.insert("projects", { project_code: "PRJ-" + code, name: prName, customer_id: custId, pm: V("jPm"), address: (V("jAddr") ? V("jAddr") + ", " : "") + (V("jCity") || ""), scope: scope, status: "prep", start_date: V("jStartDate") || todayISO(), contract_amount: amt });
        prjId = pr.id;
      }
      var colors = String(V("jColors") || "").split(",").map(function (x) { return x.replace(/^\s+|\s+$/g, ""); }).filter(function (x) { return x; });
      // fresh nested objects PER insert — three jobs must never share one
      // dates/lots/colors reference through the store's shallow assign
      function common() {
        return {
          project_id: prjId, status: "prep", supervisor: V("jSup"), pm: V("jPm"),
          bldg_type: bldg, bldg_type_label: bldgLabelOf(bldg), lots: lots.slice(), is_model: isModel,
          site_id: siteRec && siteRec.id, address: V("jAddr"), city: V("jCity"), note: V("jNote"),
          retainage_pct: VN("jRet"), created_by: me, created_date: TODAY, last_update_by: me, last_update_date: TODAY,
          dates: freshDates(V("jDelDate"), V("jStartDate"), V("jFinDate")),
          colors: colors.length ? colors.slice() : undefined, pct: 0,
        };
      }
      var made = [];
      var multiLot = lots.length > 1;
      if (multiLot) {
        // STRUCTURE upgrade beyond the legacy ERP: parent → LOT sub-jobs (one per
        // lot) → per-lot scope sub-sub-jobs when scope=both. Amounts stay
        // unallocated on children — the parent holds the contract.
        var pSuffix = scope === "both" ? "" : (scope === "roofing" ? "-R" : "-S");
        S.insert("jobs", Object.assign(common(), { id: code, job_code: code, job_id: idBase + pSuffix, scope: scope,
          contract_amount: amt, proposed_amount: amt, budget_cost: VN("jBud"), cost_code: scope === "roofing" ? "07310" : "07460" }));
        made.push("parent " + code);
        lots.forEach(function (lot, li) {
          var lotCode = code + ".L" + lot;
          S.insert("jobs", Object.assign(common(), { id: lotCode, job_code: lotCode, job_id: idBase + "-L" + lot, parent_job: code,
            sub_kind: "lot", lot: String(lot), lots: [String(lot)], color: colors[li] || undefined, scope: scope,
            contract_amount: 0, proposed_amount: 0, budget_cost: 0, cost_code: scope === "roofing" ? "07310" : "07460" }));
          if (scope === "both") {
            S.insert("jobs", Object.assign(common(), { id: lotCode + ".S", job_code: lotCode + ".S", job_id: idBase + "-L" + lot + "-S", parent_job: lotCode,
              sub_kind: "scope", lot: String(lot), lots: [String(lot)], scope: "siding", contract_amount: 0, proposed_amount: 0, budget_cost: 0, cost_code: "07460" }));
            S.insert("jobs", Object.assign(common(), { id: lotCode + ".R", job_code: lotCode + ".R", job_id: idBase + "-L" + lot + "-R", parent_job: lotCode,
              sub_kind: "scope", lot: String(lot), lots: [String(lot)], scope: "roofing", contract_amount: 0, proposed_amount: 0, budget_cost: 0, cost_code: "07310" }));
          }
        });
        made.push(lots.length + " lot sub-jobs (.L" + lots.join(" / .L") + ")");
        if (scope === "both") made.push("2 scope sub-sub-jobs under each lot (.S / .R)");
        made.push("contract unallocated on children — parent holds " + f.usd(amt, true));
        var seededM = seedBaseOrders(K, code, bldg);
        if (seededM) made.push(seededM + " BASE template lines");
      } else if (scope === "both") {
        // pain #11: roofing + siding live as SUB-JOBS under ONE parent
        var sAmt = VN("jAmtS"), rAmt = VN("jAmtR");
        if (!sAmt && !rAmt) { sAmt = r2(amt / 2); rAmt = r2(amt - sAmt); }
        else if (!sAmt) sAmt = r2(amt - rAmt);
        else if (!rAmt) rAmt = r2(amt - sAmt);
        if (Math.abs(r2(sAmt + rAmt) - amt) > 0.005) { K.toast("Siding + roofing portions must equal the proposed amount (" + f.usd(amt, true) + ").", { kind: "warn" }); return; }
        S.insert("jobs", Object.assign(common(), { id: code, job_code: code, job_id: idBase, scope: "both",
          contract_amount: amt, proposed_amount: amt, budget_cost: VN("jBud"), cost_code: "07460" }));
        S.insert("jobs", Object.assign(common(), { id: code + ".S", job_code: code + ".S", job_id: idBase + "-S", scope: "siding", parent_job: code, sub_kind: "scope",
          contract_amount: sAmt, proposed_amount: sAmt, budget_cost: 0, cost_code: "07460" }));
        S.insert("jobs", Object.assign(common(), { id: code + ".R", job_code: code + ".R", job_id: idBase + "-R", scope: "roofing", parent_job: code, sub_kind: "scope",
          contract_amount: rAmt, proposed_amount: rAmt, budget_cost: 0, cost_code: "07310" }));
        made.push("parent " + code, "sub-jobs " + code + ".S / " + code + ".R");
        var seededB = seedBaseOrders(K, code + ".S", bldg);
        if (seededB) made.push(seededB + " BASE template lines");
      } else {
        var suffix = scope === "roofing" ? "-R" : "-S";
        S.insert("jobs", Object.assign(common(), { id: code, job_code: code, job_id: idBase + suffix, scope: scope,
          contract_amount: amt, proposed_amount: amt, budget_cost: VN("jBud"), cost_code: scope === "roofing" ? "07310" : "07460" }));
        made.push("job " + code);
        var seeded = seedBaseOrders(K, code, bldg);
        if (seeded) made.push(seeded + " BASE template lines");
      }
      K.toast(idBase + (scope === "both" ? "" : (scope === "roofing" ? "-R" : "-S")) + " · " + f.usd(amt) + " — created " + made.join(", ") + ".", { title: multiLot ? "Job tree created" : "Job created", kind: "ok", ms: 7000 });
      K.closeDrill();
      K.go("projects/" + code);
    });
    // dynamic wiring: customer → site options; site → new-site inputs; scope → split
    function syncSiteInputs() {
      var isNew = V("jSite") === "__new";
      ["jSiteName", "jSiteCode"].forEach(function (id2) {
        var el = document.getElementById(id2);
        if (el && el.parentNode) el.parentNode.style.opacity = isNew ? "1" : ".38";
      });
    }
    var custEl = document.getElementById("jCust"), siteEl = document.getElementById("jSite"), scopeEl = document.getElementById("jScope");
    if (custEl) custEl.addEventListener("change", function () {
      var opts = siteOptsFor(custEl.value);
      if (siteEl) {
        siteEl.innerHTML = opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.l) + "</option>"; }).join("");
        syncSiteInputs();
      }
    });
    if (siteEl) siteEl.addEventListener("change", syncSiteInputs);
    if (scopeEl) scopeEl.addEventListener("change", function () {
      var w = document.getElementById("jSplitWrap");
      if (w) w.classList[scopeEl.value === "both" ? "remove" : "add"]("hidden");
    });
    syncSiteInputs();
  }
  // "+ New sub-job" on a parent ticket — pain #11 (one parent, scoped children)
  function subJobForm(K, parent) {
    var S = K.store, f = K.fmt;
    var supOpts = (K.T.users || []).filter(function (u) { return u.role === "field" || u.role === "production"; }).map(function (u) { return { v: u.name, l: u.name + " · " + u.roleLabel }; });
    if (!supOpts.length) supOpts = [{ v: parent.supervisor || "unassigned", l: parent.supervisor || "unassigned" }];
    function subCode(scope) {
      var letter = scope === "roofing" ? "R" : "S";
      var c = parent.job_code + "." + letter, n = 2;
      while (S.list("jobs").some(function (j) { return j.job_code === c; })) { c = parent.job_code + "." + letter + n; n++; }
      return c;
    }
    drillForm(K, "New sub-job under " + jobTitleOf(parent), '<div class="form-2">'
      + fld("Scope", sel("sjScope", [{ v: "siding", l: "Siding (-S)" }, { v: "roofing", l: "Roofing (-R)" }], parent.scope === "roofing" ? "siding" : "roofing"))
      + fld("Sub-job code (auto)", '<input class="in" id="sjCode" value="' + esc(subCode(parent.scope === "roofing" ? "siding" : "roofing")) + '" readonly />')
      + fld("Contract amount ($)", inp("sjAmt", "number", "", "0.00"))
      + fld("Supervisor", sel("sjSup", supOpts, parent.supervisor || (supOpts[0] && supOpts[0].v))) + "</div>"
      + '<p class="subtle">Sub-jobs share the parent ticket (customer, site, lots, milestones) and roll up into its accounting summary — one parent, never a duplicate job id (pain #11).</p>',
      "Create sub-job", function () {
        var scope = V("sjScope"), amt = VN("sjAmt");
        if (!amt) { K.toast("Contract amount is required.", { kind: "warn" }); return; }
        var code = subCode(scope);
        var idBase = String(parent.job_id || parent.job_code).replace(/-[SR]$/, "");
        S.insert("jobs", { id: code, job_code: code, job_id: idBase + (scope === "roofing" ? "-R" : "-S"), parent_job: parent.job_code,
          project_id: parent.project_id, scope: scope, status: "prep", supervisor: V("sjSup"), pm: parent.pm,
          contract_amount: amt, proposed_amount: amt, budget_cost: 0, pct: 0, cost_code: scope === "roofing" ? "07310" : "07460",
          bldg_type: parent.bldg_type, bldg_type_label: parent.bldg_type_label, lots: parent.lots, is_model: parent.is_model,
          site_id: parent.site_id, address: parent.address, city: parent.city,
          created_by: (K.session() || {}).name || "user", created_date: TODAY, last_update_by: (K.session() || {}).name || "user", last_update_date: TODAY,
          dates: freshDates() });
        K.toast(code + " · " + f.usd(amt) + " " + scope + " — rolled up under " + parent.job_code + ".", { title: "Sub-job created", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
    var scEl = document.getElementById("sjScope");
    if (scEl) scEl.addEventListener("change", function () {
      var el = document.getElementById("sjCode"); if (el) el.value = subCode(scEl.value);
    });
  }
  // "+ Add job order" — one itemized the legacy ERP detail line on a lot
  function jobOrderForm(K, job, lot) {
    var S = K.store;
    var lots = ["BASE"].concat((job.lots || []).map(String));
    jobOrdersOf(K, job.job_code).forEach(function (o) { if (lots.indexOf(String(o.lot)) < 0) lots.push(String(o.lot)); });
    drillForm(K, "New job order · " + jobTitleOf(job), '<div class="form-2">'
      + fld("Lot", sel("joLot", lots, lot || "BASE"))
      + fld("Route", sel("joRoute", [{ v: "WH", l: "WH — warehouse stock" }, { v: "CP", l: "CP — company/consignment" }, { v: "PO", l: "PO — purchase order" }, { v: "WO", l: "WO — work order" }], "PO"))
      + fld("Category", inp("joCat", "text", "", 'e.g. J CHANNEL 3/4"'))
      + fld("Material", inp("joMat", "text", "", "e.g. ALSIDE"))
      + fld("Color", inp("joColor", "text", "", "e.g. STORM"))
      + fld("Qty", inp("joQty", "number", "", "0"))
      + fld("Unit", sel("joUnit", ["SQ", "PCS", "BOX", "EA", "TUBE", "PAIR", "ROLL", "LF"], "PCS")) + "</div>",
      "Add job order", function () {
        if (!V("joCat")) { K.toast("Category is required.", { kind: "warn" }); return; }
        S.insert("jobOrders", { job_code: job.job_code, lot: V("joLot"), route: V("joRoute"), category: V("joCat"),
          material: V("joMat"), color: V("joColor"), qty: VN("joQty") || null, unit: V("joUnit"), status: "planned" });
        K.toast(V("joCat") + " added to lot " + V("joLot") + " (" + V("joRoute") + ").", { title: "Job order added", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  function budgetLineForm(K, job) {
    var S = K.store, f = K.fmt;
    var ccOpts = S.list("costCodes").map(function (c) { return { v: c.code, l: c.code + " — " + c.name }; });
    var catOpts = S.list("categories").map(function (c) { return { v: c.category_code, l: c.category_code + " — " + c.name }; });
    drillForm(K, "New budget line · " + job.job_code, '<div class="form-2">'
      + fld("Cost code", sel("blCc", ccOpts, job.cost_code))
      + fld("Category", sel("blCat", catOpts, "M"))
      + fld("Description", inp("blDesc", "text", "", "e.g. Board & batten accent walls"))
      + fld("Amount ($)", inp("blAmt", "number", "", "0.00")) + "</div>",
      "Add to budget", function () {
        var amt = VN("blAmt");
        if (!amt || !V("blDesc")) { K.toast("Description and amount are required.", { kind: "warn" }); return; }
        S.insert("budgetLines", { job_code: job.job_code, cost_code: V("blCc"), category: V("blCat"), description: V("blDesc"), original_cost: amt, current_cost: amt, spent: 0 });
        K.toast("Budget +" + f.usd(amt) + " on " + V("blCc") + "." + V("blCat") + " — derived Cost Status updated.", { title: "Budget line added", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  function jobCostReport(K, job, pr) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt, O = window.KeystoneOutput;
    var d = derivedStatus(K, job);
    var bls = S.list("budgetLines", { job_code: job.job_code });
    var rows = bls.map(function (b) {
      var spent = L.activity({ job_code: job.job_code }).filter(function (a) { return a.cost_code === b.cost_code && a.category === b.category && a.debit; }).reduce(function (s, a) { return s + a.debit; }, 0);
      return "<tr><td>" + esc(b.cost_code + "." + b.category) + "</td><td>" + esc(b.description) + '</td><td class="r">' + f.usd(b.current_cost, true) + '</td><td class="r">' + f.usd(spent, true) + '</td><td class="r">' + f.usd(r2(b.current_cost - spent), true) + "</td></tr>";
    }).join("") || '<tr><td colspan="5">No budget lines yet</td></tr>';
    var html = '<div class="pd">'
      + '<div class="pd-hd"><div><div class="pd-title">JOB COST REPORT</div><div class="pd-sub">Job ' + esc(job.job_code) + " · " + esc(pr.name || "") + '</div></div><div class="pd-co">' + esc(K.T.name) + "</div></div>"
      + '<div class="pd-meta">As of ' + TODAY + " · Budget / Committed / Spent derived live from the event-sourced ledger — per line matched on cost code AND category</div>"
      + '<table class="pd-t"><thead><tr><th>Cost code</th><th>Description</th><th class="r">Budget</th><th class="r">Spent</th><th class="r">Remaining</th></tr></thead><tbody>' + rows
      + '<tr class="tot"><td colspan="2">Totals</td><td class="r">' + f.usd(d.budget, true) + '</td><td class="r">' + f.usd(d.spent, true) + '</td><td class="r">' + f.usd(r2(d.budget - d.spent), true) + "</td></tr></tbody></table>"
      + '<table class="pd-t" style="margin-top:10px"><tbody>'
      + '<tr><td>Contract</td><td class="r">' + f.usd(d.contract, true) + "</td></tr>"
      + '<tr><td>Committed' + (d.coDelta ? " (incl. executed CO " + f.usd(d.coDelta, true) + ")" : "") + '</td><td class="r">' + f.usd(d.committed, true) + "</td></tr>"
      + '<tr><td>Billed to date</td><td class="r">' + f.usd(d.billed, true) + "</td></tr>"
      + '<tr class="tot"><td>Forecast margin</td><td class="r">' + (d.noCost ? "— (awaiting first cost)" : f.usd(d.margin, true) + " (" + f.pct(d.marginPct) + ")") + "</td></tr></tbody></table>"
      + '<div class="pd-ft">Generated by Keystone · ' + esc(K.T.name) + "</div></div>";
    O.print("Job Cost Report — " + job.job_code, html);
  }
  /* ============================== milestone drill + month-grid calendar ---- */
  function msLaneLabel(msId) {
    var out = msId;
    MS_LANES.forEach(function (ln) { if (ln[0] === msId) out = ln[1]; });
    return out;
  }
  // Clickable milestone → what triggered it, who, when, and the child actions
  // that followed. the legacy ERP has NO milestone provenance — this is the
  // improvement surface the event-sourced store makes possible.
  function drillMilestone(K, job, msId) {
    var S = K.store, f = K.fmt;
    var m = (job.dates || {})[msId] || {};
    var lab = msLaneLabel(msId);
    var live = daysSince(m.actual_date || m.date);
    var logs = S.list("milestoneLog").filter(function (x) { return x.job_code === job.job_code && x.milestone === msId; })
      .sort(function (a, b) { return String(b.at || "").localeCompare(String(a.at || "")); });
    var html = ctxStrip([
      { lab: "Job", val: jobTitleOf(job), go: "projects/" + job.id },
      { lab: "Milestone", val: lab },
      { lab: "Lane", val: (MS_LANES.map(function (ln) { return ln[0]; }).indexOf(msId) + 1) + " of 6" },
    ]);
    html += '<div class="kv">'
      + '<div class="k">State</div><div class="v">' + (m.flag ? chip("✓ done", "ok") : chip("○ pending", "mute")) + "</div>"
      + '<div class="k">Target</div><div class="v">' + (m.date ? f.date(m.date) : '<span class="subtle">— not set</span>') + "</div>"
      + (m.actual_date ? '<div class="k">Actual</div><div class="v">' + f.date(m.actual_date)
          + (msDelta(m.date, m.actual_date) ? " " + chip(msDelta(m.date, m.actual_date), /late/.test(msDelta(m.date, m.actual_date)) ? "warn" : "ok") : "") + "</div>" : "")
      + '<div class="k">Days</div><div class="v">' + (live != null ? chip(daysPhrase(live), m.flag ? "ok" : (live > 0 ? "warn" : "info")) + ' <span class="subtle">computed live at render — the legacy ERP-style</span>' : '<span class="subtle">—</span>') + "</div>"
      + (!m.flag && m.date && live != null && live > 0 ? '<div class="k">Alert</div><div class="v">' + chip("target passed " + daysPhrase(live) + " — still unflagged", "bad") + "</div>" : "")
      + "</div>";
    html += drillH("What triggered it (" + logs.length + ")");
    if (logs.length) {
      var chipWires = [];
      html += logs.map(function (lg, li) {
        var kids = lg.children || [];
        return '<div style="padding:9px 0;border-top:1px solid var(--line)">'
          + '<div style="display:flex;gap:10px;align-items:center;font-size:12.5px"><b>' + esc(lg.by || "system") + '</b><span class="subtle">' + esc(lg.source || "") + '</span><span class="mono subtle" style="margin-left:auto">' + (lg.at ? f.date(String(lg.at).slice(0, 10)) : "—") + "</span></div>"
          + (lg.note ? '<div class="subtle" style="margin-top:3px;font-size:12px">' + esc(lg.note) + "</div>" : "")
          + (kids.length ? '<div class="btnrow" style="margin-top:7px">' + kids.map(function (ch, ci) {
              chipWires.push({ li: li, ci: ci, ch: ch });
              return '<span class="chip info" data-msc="' + li + "-" + ci + '" style="cursor:pointer" title="Open ' + esc(ch.kind || "record") + '">' + esc(ch.label || (ch.kind + " " + ch.ref)) + " →</span>";
            }).join(" ") + "</div>" : "")
          + "</div>";
      }).join("");
      html += '<p class="subtle" style="margin-top:10px">Child actions above are live links — each opens its full assembled drill.</p>';
    } else {
      html += '<p class="subtle">No provenance recorded — the the legacy ERP migration only stamps dates. New milestone flips log who, what and the child actions that followed.</p>';
    }
    K.drill("Milestone · " + lab + " — " + jobTitleOf(job), html);
    var db = document.getElementById("drillBody");
    Array.prototype.forEach.call(db.querySelectorAll("[data-msc]"), function (el) {
      el.addEventListener("click", function () {
        var p = el.getAttribute("data-msc").split("-");
        var lg = logs[Number(p[0])] || {};
        var ch = (lg.children || [])[Number(p[1])];
        if (ch) openRefDrill(K, ch.kind, ch.ref);
      });
    });
  }
  function pad2(n) { return ("0" + n).slice(-2); }
  function shiftMonth(key, delta) {
    var p = String(key).split("-");
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1 + delta, 1);
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1);
  }
  // Event assembler shared by the month grid AND the day drill (#7) — every
  // item carries an open() so any surface can route to the full drill.
  function calEventsFor(K, job) {
    var S = K.store, f = K.fmt;
    var ev = {};
    function addEv(iso, labTxt, cls, open) {
      if (!iso) return;
      iso = String(iso).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;   // never plot a garbage date (the legacy ERP 11/30/-0001 bug)
      (ev[iso] = ev[iso] || []).push({ lab: labTxt, cls: cls, open: open });
    }
    var d = job.dates || {};
    MS_LANES.forEach(function (ln) {
      var m = d[ln[0]] || {};
      if (!m.date) return;
      var cls = m.flag ? "done" : ((daysSince(m.date) || 0) > 0 ? "late" : "");
      addEv(m.date, "◆ " + ln[1], cls, (function (msId) { return function () { drillMilestone(K, job, msId); }; })(ln[0]));
    });
    var fam = familyCodesOf(K, job);
    S.list("commitments").forEach(function (c) {
      if (fam.indexOf(c.job_code) < 0) return;
      addEv(c.date || String(c.createdAt || "").slice(0, 10), (c.commitment_type === "Subcontract" ? "SC " : "PO ") + (c.reference_no || ""), "", function () { drillCommit(K, c); });
    });
    S.list("subcontracts").forEach(function (s2) {
      if (fam.indexOf(s2.job_id) < 0) return;
      addEv(s2.date || s2.closed_date || String(s2.createdAt || "").slice(0, 10), "WO " + (s2.wo_number || s2.subcontract_id || ""), "", function () { drillSubcontract(K, s2); });
    });
    S.list("subDraws").forEach(function (dr) {
      if (fam.indexOf(dr.job_code) < 0) return;
      addEv(dr.date, "Draw " + f.usdShort(dr.amount), "", function () { drillSubDraw(K, dr); });
    });
    S.list("arInvoices").forEach(function (i) {
      if (fam.indexOf(i.job_id) < 0) return;
      addEv(i.invoice_date, "AR " + (i.invoice_number || ""), "", function () { drillArInv(K, i); });
    });
    return ev;
  }
  // Day drill — EVERY item on the day, each row routing to its full drill (#7)
  function drillCalDay(K, job, iso) {
    var f = K.fmt;
    var evs = (calEventsFor(K, job)[iso]) || [];
    var html = ctxStrip([
      { lab: "Job", val: jobTitleOf(job), go: "projects/" + job.id },
      { lab: "Day", val: f.date(iso) },
      { lab: "Items", val: String(evs.length) },
    ]);
    html += evs.length ? evs.map(function (e, i) {
      return '<div class="clk" data-cde="' + i + '" style="display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--line);cursor:pointer"><span class="mev ' + (e.cls || "") + '" style="pointer-events:none">' + esc(e.lab) + '</span><span class="subtle" style="margin-left:auto">open →</span></div>';
    }).join("") : '<p class="subtle">Nothing scheduled or recorded on this day.</p>';
    K.drill("Calendar · " + f.date(iso) + " — " + jobTitleOf(job), html);
    var db = document.getElementById("drillBody");
    Array.prototype.forEach.call(db.querySelectorAll("[data-cde]"), function (el) {
      el.addEventListener("click", function () { var e = evs[Number(el.getAttribute("data-cde"))]; if (e && e.open) e.open(); });
    });
  }
  // Month-grid milestone calendar (.mcal) — plots the 6 milestones plus linked
  // child events (PO / WO / draw / AR invoice dates) on their days. Every day
  // with items is clickable (incl. the "+N" overflow) → the day drill.
  function msCalendarHtml(K, on, job, monthKey) {
    var p = String(monthKey).split("-");
    var y = parseInt(p[0], 10), mo = parseInt(p[1], 10) - 1;
    var ev = calEventsFor(K, job);
    var DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    var html = '<div class="mcal">' + DOW.map(function (x) { return '<div class="mch">' + x + "</div>"; }).join("");
    var startDow = new Date(y, mo, 1).getDay();
    var daysInM = new Date(y, mo + 1, 0).getDate();
    var prevDays = new Date(y, mo, 0).getDate();
    var total = Math.ceil((startDow + daysInM) / 7) * 7, i;
    for (i = 0; i < total; i++) {
      var dayNum, iso = null, out = false;
      if (i < startDow) { dayNum = prevDays - startDow + 1 + i; out = true; }
      else if (i - startDow < daysInM) { dayNum = i - startDow + 1; iso = y + "-" + pad2(mo + 1) + "-" + pad2(dayNum); }
      else { dayNum = i - startDow - daysInM + 1; out = true; }
      var evs = (iso && ev[iso]) ? ev[iso] : [];
      var dayKey = evs.length ? on((function (iso2) { return function () { drillCalDay(K, job, iso2); }; })(iso)) : null;
      html += '<div class="mcd' + (out ? " out" : "") + (iso === TODAY ? " today" : "") + '"' + (dayKey ? ' data-click="' + dayKey + '" style="cursor:pointer" title="Open this day — ' + evs.length + ' item(s)"' : "") + '><span class="md">' + dayNum + "</span>"
        + evs.slice(0, 3).map(function (e) { return '<span class="mev ' + e.cls + '" data-click="' + on(e.open) + '" style="cursor:pointer" title="' + esc(e.lab) + '">' + esc(e.lab) + "</span>"; }).join("")
        + (evs.length > 3 ? '<span class="mev" data-click="' + dayKey + '" style="cursor:pointer" title="Open the day — all ' + evs.length + ' items">+' + (evs.length - 3) + " more</span>" : "")
        + "</div>";
    }
    return html + "</div>";
  }
  /* ============================== job-ticket quick creates (honest posting) */
  function subDrawForm(K, job) {
    var S = K.store, f = K.fmt;
    var subs = S.list("vendors").filter(function (v) { return v.is_subcontractor; });
    if (!subs.length) { K.toast("No subcontractor vendors yet — add one first.", { kind: "warn" }); return; }
    var vOpts = subs.map(function (v) { return { v: v.id, l: v.name }; });
    var fam = familyCodesOf(K, job);
    var wos = S.list("subcontracts").filter(function (s2) { return fam.indexOf(s2.job_id) >= 0; });
    var woOpts = [{ v: "", l: "— no WO reference —" }].concat(wos.map(function (w) {
      var ref = w.wo_number || w.subcontract_id;
      var v2 = S.get("vendors", w.vendor_id) || {};
      return { v: ref, l: ref + " · " + (v2.name || "") };
    }));
    drillForm(K, "New draw · " + jobTitleOf(job), '<div class="form-2">'
      + fld("Contractor", sel("sdV", vOpts, vOpts[0].v))
      + fld("Amount ($)", inp("sdAmt", "number", "", "0.00"))
      + fld("Work order", sel("sdWo", woOpts, woOpts[1] ? woOpts[1].v : ""))
      + fld("Date", inp("sdDate", "date", TODAY))
      + "</div>"
      + fld("Memo", inp("sdMemo", "text", "", "e.g. siding install — lots 1-2 complete"))
      + '<p class="subtle">Creates a PENDING contractor draw plus a money approval in the Action Hub — nothing posts to the ledger until a human approves.</p>',
      "Create draw", function () {
        var amt = VN("sdAmt"); if (!amt) { K.toast("Amount is required.", { kind: "warn" }); return; }
        var v = S.get("vendors", V("sdV")) || {};
        var rec = S.insert("subDraws", { job_code: job.job_code, vendor_id: v.id, contractor: v.name, date: V("sdDate") || TODAY, amount: amt, status: "pending", wo_ref: V("sdWo") || null, memo: V("sdMemo") || "" });
        S.insert("approvals", { title: "Release draw — " + v.name + " · " + f.usd(amt, true), tier: "money", amount: amt, status: "pending", vendor: v.name, job_code: job.job_code, detail: "Contractor draw " + rec.id + (V("sdWo") ? " against WO " + V("sdWo") : "") + " on job " + job.job_code + ". Approving posts sub-labor cost to the ledger.", workflow: "Sub draw", createdBy: (K.session() || {}).name || "user" });
        K.toast(v.name + " · " + f.usd(amt) + " draw pending — money approval queued in the Action Hub.", { title: "Draw created", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  // #3: pre-posting WO edit — contractor, scope, value, retention. Posted WOs
  // use the reversal path (un-post first); this form refuses them.
  function editWoForm(K, sub0) {
    var S = K.store, f = K.fmt;
    var sub = S.get("subcontracts", sub0.id) || sub0;
    if (["draft", "pending-post"].indexOf(sub.status) < 0) {
      K.toast("WO " + (sub.wo_number || sub.subcontract_id) + " is " + sub.status + " — posted WOs change through the reversal path (un-post first).", { title: "Not editable", kind: "warn" });
      return;
    }
    var subs = S.list("vendors").filter(function (v) { return v.is_subcontractor; });
    var vOpts = subs.map(function (v) { return { v: v.id, l: v.name }; });
    drillForm(K, "Edit WO " + (sub.wo_number || sub.subcontract_id), '<div class="form-2">'
      + fld("Contractor", sel("ewV", vOpts, sub.vendor_id))
      + fld("Value ($)", inp("ewAmt", "number", sub.current_value != null ? sub.current_value : sub.original_value))
      + fld("Retention %", inp("ewRet", "number", sub.retention_pct || 0))
      + fld("Status", '<input class="in" value="' + esc(sub.status) + '" readonly />')
      + "</div>"
      + fld("Scope", ta("ewScope", sub.scope || "", "scope of work"))
      + '<p class="subtle">Pre-posting only — the linked commitment updates in lock-step so committed cost never drifts.</p>',
      "Save WO", function () {
        var amt = VN("ewAmt");
        if (!amt) { K.toast("Value is required.", { kind: "warn" }); return; }
        S.update("subcontracts", sub.id, { vendor_id: V("ewV"), scope: V("ewScope"), original_value: amt, current_value: amt, retention_pct: VN("ewRet") });
        var cm = S.list("commitments").filter(function (x) { return x.reference_no === sub.subcontract_id && x.commitment_type === "Subcontract"; })[0];
        if (cm) S.update("commitments", cm.id, { vendor_id: V("ewV"), original_value: amt, description: V("ewScope") || cm.description });
        K.toast("WO " + (sub.wo_number || sub.subcontract_id) + " updated · " + f.usd(amt) + " — commitment kept in lock-step.", { title: "WO saved", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  function jobCustomerOf(K, job) {
    var S = K.store;
    var pr = S.get("projects", job.project_id) || {};
    return S.get("accounts", pr.customer_id) || {};
  }
  function nextArSeq(S, prefix) {
    var n = 0;
    S.list("arInvoices").forEach(function (i) { if (String(i.invoice_number || "").indexOf(prefix) === 0) n++; });
    return prefix + (n + 1);
  }
  function arChargeForm(K, job) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var acct = jobCustomerOf(K, job);
    drillForm(K, "AR charge · " + jobTitleOf(job), '<div class="form-2">'
      + fld("Amount ($)", inp("acAmt", "number", "", "0.00"))
      + fld("Date", inp("acDate", "date", TODAY))
      + "</div>"
      + fld("Memo", inp("acMemo", "text", "", "e.g. extra color change — lot 3"))
      + '<p class="subtle">Posts Dr 1200 A/R / Cr 4000 revenue against this job — the the legacy ERP OTHER CHARGE, honestly on the ledger.</p>',
      "Post charge", function () {
        var amt = VN("acAmt"); if (!amt) { K.toast("Amount is required.", { kind: "warn" }); return; }
        var no = nextArSeq(S, "CHG-" + job.job_code + "-");
        try { L.postJournal({ memo: no + " — " + (V("acMemo") || "AR charge"), source: "ar", date: V("acDate") || TODAY, lines: [{ account: "1200", debit: amt, job_code: job.job_code, memo: no }, { account: "4000", credit: amt, job_code: job.job_code, memo: "Charge — " + job.job_code }] }); }
        catch (e) { K.toast(String((e && e.message) || e), { title: "Post failed", kind: "bad" }); return; }
        S.insert("arInvoices", { invoice_number: no, customer_id: acct.id || null, customer: acct.legal_name || "—", job_id: job.job_code, invoice_date: V("acDate") || TODAY, due_date: isoPlusDays(V("acDate") || TODAY, 30), sales_amount: amt, balance: amt, retainage_amount: 0, status: "open", kind: "charge", memo: V("acMemo") || "" });
        K.toast(no + " · " + f.usd(amt) + " posted to A/R + revenue.", { title: "AR charge", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  function arCreditForm(K, job) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var acct = jobCustomerOf(K, job);
    drillForm(K, "AR credit · " + jobTitleOf(job), '<div class="form-2">'
      + fld("Credit amount ($, positive)", inp("acrAmt", "number", "", "0.00"))
      + fld("Date", inp("acrDate", "date", TODAY))
      + "</div>"
      + fld("Reason (required — goes on the record)", inp("acrWhy", "text", "", "e.g. back-charge for damaged panels"))
      + '<p class="subtle">Stored as a NEGATIVE line and posts Dr 4000 revenue / Cr 1200 A/R — reduces what the customer owes.</p>',
      "Post credit", function () {
        var amt = VN("acrAmt"); if (!amt) { K.toast("Amount is required.", { kind: "warn" }); return; }
        var why = V("acrWhy"); if (!why) { K.toast("A reason is required for a credit.", { kind: "warn" }); return; }
        var no = nextArSeq(S, "CRD-" + job.job_code + "-");
        try { L.postJournal({ memo: no + " — " + why, source: "ar", date: V("acrDate") || TODAY, lines: [{ account: "4000", debit: amt, job_code: job.job_code, memo: no + " — " + why }, { account: "1200", credit: amt, job_code: job.job_code, memo: "Credit — " + job.job_code }] }); }
        catch (e) { K.toast(String((e && e.message) || e), { title: "Post failed", kind: "bad" }); return; }
        S.insert("arInvoices", { invoice_number: no, customer_id: acct.id || null, customer: acct.legal_name || "—", job_id: job.job_code, invoice_date: V("acrDate") || TODAY, due_date: isoPlusDays(V("acrDate") || TODAY, 30), sales_amount: -amt, balance: -amt, retainage_amount: 0, status: "open", kind: "credit", reason: why });
        K.toast(no + " · −" + f.usd(amt) + " credit posted (reason on record).", { title: "AR credit", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  /* ---- job P&L print — revenue vs direct cost by category vs the estimate */
  function jobPlReport(K, job, pr) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt, O = window.KeystoneOutput;
    var fam = familyCodesOf(K, job);
    var revenue = r2(fam.reduce(function (s, c) { return s + L.jobBilled(c); }, 0));
    var cogsAccts = {};
    S.list("glAccounts").forEach(function (a) { if (a.account_type === "cogs") cogsAccts[a.account_code] = true; });
    var CAT = { M: "Materials", L: "Labor", E: "Equipment", S: "Subcontract" };
    var byCat = {}, order = ["Materials", "Labor", "Equipment", "Subcontract", "Other"];
    L.activity().forEach(function (a) {
      if (fam.indexOf(a.job_code) < 0 || !cogsAccts[a.account]) return;
      var k2 = CAT[a.category] || "Other";
      byCat[k2] = r2((byCat[k2] || 0) + (Number(a.debit) || 0) - (Number(a.credit) || 0));
    });
    var costTot = 0;
    order.forEach(function (k2) { if (byCat[k2]) costTot = r2(costTot + byCat[k2]); });
    var gm = r2(revenue - costTot), gmPct = revenue ? r2(gm / revenue * 100) : 0;
    var opp = S.list("opportunities").filter(function (o) { return o.won_job === job.id || o.won_job === job.job_code; })[0];
    var est = opp ? S.list("bidEstimates", { opportunity_id: opp.id }).sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0] : null;
    var rows = order.filter(function (k2) { return byCat[k2]; }).map(function (k2) {
      return "<tr><td>" + esc(k2) + '</td><td class="r">' + f.usd(byCat[k2], true) + '</td><td class="r">' + (revenue ? f.pct(byCat[k2] / revenue * 100, 1) : "—") + "</td></tr>";
    }).join("") || '<tr><td colspan="3">No direct cost posted yet</td></tr>';
    var estHtml = "";
    if (est) {
      var estCost = Number(est.subtotal) || 0;
      var estBid = Number(opp.bid_amount) || Number(est.total) || 0;
      var estGm = r2(estBid - estCost), estGmPct = estBid ? r2(estGm / estBid * 100) : 0;
      estHtml = '<table class="pd-t" style="margin-top:10px"><thead><tr><th></th><th class="r">Estimate (bid ' + esc(opp.id) + " v" + (est.version || 1) + ')</th><th class="r">Actual to date</th></tr></thead><tbody>'
        + '<tr><td>Revenue</td><td class="r">' + f.usd(estBid, true) + '</td><td class="r">' + f.usd(revenue, true) + "</td></tr>"
        + '<tr><td>Direct cost</td><td class="r">' + f.usd(estCost, true) + '</td><td class="r">' + f.usd(costTot, true) + "</td></tr>"
        + '<tr class="tot"><td>Gross margin</td><td class="r">' + f.usd(estGm, true) + " (" + f.pct(estGmPct, 1) + ')</td><td class="r">' + f.usd(gm, true) + " (" + f.pct(gmPct, 1) + ")</td></tr>"
        + "</tbody></table>";
    }
    var html = '<div class="pd">'
      + '<div class="pd-hd"><div><div class="pd-title">P&amp;L REPORT</div><div class="pd-sub">Job ' + esc(job.job_code) + " · " + esc(jobTitleOf(job)) + ((pr && pr.name) ? " · " + esc(pr.name) : "") + '</div></div><div class="pd-co">' + esc(K.T.name) + "</div></div>"
      + '<div class="pd-meta">As of ' + TODAY + " · Revenue = billed A/R · direct cost = ledger COGS by category · family roll-up: " + fam.join(", ") + "</div>"
      + '<table class="pd-t"><thead><tr><th>Line</th><th class="r">Amount</th><th class="r">% of revenue</th></tr></thead><tbody>'
      + '<tr><td><b>Revenue billed</b></td><td class="r"><b>' + f.usd(revenue, true) + '</b></td><td class="r">100%</td></tr>'
      + rows
      + '<tr><td><b>Total direct cost</b></td><td class="r"><b>' + f.usd(costTot, true) + '</b></td><td class="r">' + (revenue ? f.pct(costTot / revenue * 100, 1) : "—") + "</td></tr>"
      + '<tr class="tot"><td>Gross margin</td><td class="r">' + f.usd(gm, true) + '</td><td class="r">' + f.pct(gmPct, 1) + "</td></tr>"
      + "</tbody></table>"
      + estHtml
      + (est ? "" : '<div class="pd-meta" style="margin-top:8px">No won-bid estimate on file for this job — estimate comparison appears when the winning bid carries one.</div>')
      + '<div class="pd-ft">Generated by Keystone · ' + esc(K.T.name) + "</div></div>";
    O.print("PL Report — " + job.job_code, html);
  }
  /* ============================== structure tree (job → lots → scopes) ----- */
  function lotColorOf(K, j) {
    if (j.color) return j.color;
    if (j.colors && j.colors.length === 1) return j.colors[0];
    var p = K.store.list("jobs").filter(function (x) { return x.job_code === j.parent_job; })[0];
    if (p && p.colors && p.lots) {
      var ix = (p.lots || []).map(String).indexOf(String(j.lot));
      if (ix >= 0 && p.colors[ix]) return p.colors[ix];
    }
    return null;
  }
  function structureCardBody(K, on, job) {
    var S = K.store, f = K.fmt;
    function nodeHtml(j, lv) {
      var icTxt = lv === 0 ? "J" : (j.sub_kind === "lot" ? "L" + (j.lot != null ? j.lot : "") : ({ roofing: "R", siding: "S", "sheet-metal": "G" }[j.scope] || "S"));
      var meta = [];
      if (j.sub_kind === "lot") {
        var lotStr = String(j.lot != null ? j.lot : "");
        var joN = S.list("jobOrders").filter(function (o) { return (o.job_code === j.parent_job || o.job_code === j.job_code) && String(o.lot) === lotStr; }).length;
        var lotRe = new RegExp("\\blot\\s*" + lotStr + "\\b", "i");
        var pN = S.list("punchItems").filter(function (p2) { return (p2.job_id === j.parent_job || p2.job_id === j.job_code) && p2.status === "open" && lotRe.test((p2.location || "") + " " + (p2.description || "")); }).length;
        var colr = lotColorOf(K, j);
        if (colr) meta.push(colorChipOf(colr));
        meta.push("<span>" + joN + " orders</span>");
        meta.push(pN ? chip(pN + " punch open", "warn") : "<span>0 punch</span>");
      } else {
        var d2 = derivedStatus(K, j);
        if (d2.contract) meta.push("<span>" + f.usdShort(d2.contract) + "</span>");
        meta.push(statusChip(j.status));
      }
      return '<div class="tnode' + (lv ? " lv" + lv : "") + '" data-click="' + on(function () { K.go("projects/" + j.id); }) + '" title="Open this ticket"><span class="tic">' + esc(icTxt) + "</span><b>" + esc(jobTitleOf(j)) + "</b>"
        + '<span class="muted mono" style="font-size:10.5px">' + esc(j.job_code) + "</span>"
        + '<span class="tmeta">' + meta.join(" ") + "</span></div>";
    }
    var kids = childJobsOf(K, job.job_code);
    var html = '<div class="tree">' + nodeHtml(job, 0);
    kids.forEach(function (k1) {
      html += nodeHtml(k1, 1);
      childJobsOf(K, k1.job_code).forEach(function (k2) { html += nodeHtml(k2, 2); });
    });
    html += "</div>";
    if (!kids.length) html += '<p class="subtle" style="margin-top:8px">No sub-jobs yet — lots become lv1 sub-jobs and scopes lv2 sub-sub-jobs under this parent (never duplicate job ids).</p>';
    return html;
  }
  var projects = {
    count: function (K) { return K.store.list("jobs").filter(function (j) { return j.status !== "complete" && !j.parent_job; }).length; },
    render: function (K, p, mount) {
      var S = K.store, L = window.KeystoneLedger, f = K.fmt;
      if (p.id === "prj") return projects.project(K, p.sub, mount);
      if (p.id && p.id.indexOf("new-") !== 0) return projects.detail(K, p.id, mount);
      mountView(K, mount, function (on) {
        var jobs = S.list("jobs");
        // depth-first tree order: parent → lot sub-jobs → scope sub-sub-jobs
        var ordered = orderJobsTree(jobs);
        var rows = ordered.map(function (j) {
          var cs = derivedStatus(K, j);
          var pr = S.get("projects", j.project_id) || {};
          return Object.assign({}, j, { _cs: cs, _prName: pr.name || j.project_id, _prId: pr.id,
            _click: on(function () { K.go("projects/" + j.id); }),
            _prGo: on(function () { if (pr.id) K.go("projects/prj/" + pr.id); }) });
        });
        var tops = rows.filter(function (r) { return !r.parent_job; });
        var totContract = tops.reduce(function (s, r) { return s + r._cs.contract; }, 0);
        var totSpent = rows.reduce(function (s, r) { return s + r._cs.spent; }, 0);
        var totCommit = rows.reduce(function (s, r) { return s + r._cs.committed; }, 0);
        var t = tbl([
          { label: "Job", sortVal: function (r) { return r.job_code; }, map: function (r) { return treeIndent(r._lv) + "<b>" + esc(jobTitleOf(r)) + "</b>" + (r.job_id ? ' <span class="mono muted" style="font-size:10.5px">' + esc(r.job_code) + "</span>" : ""); } },
          { label: "Project", sortVal: function (r) { return r._prName; }, map: function (r) { return '<span class="act" data-click="' + r._prGo + '" title="Open project page">' + esc(r._prName) + " →</span>"; } },
          { label: "Scope", map: function (r) { return chip(r.scope, r.scope === "roofing" ? "roof" : "side"); } },
          { label: "Status", map: function (r) { return statusChip(r.status); } },
          { label: "Contract", cls: "num", sortVal: function (r) { return r._cs.contract; }, map: function (r) { return f.usd(r._cs.contract); } },
          { label: "Committed", cls: "num", sortVal: function (r) { return r._cs.committed; }, map: function (r) { return f.usd(r._cs.committed); } },
          { label: "Spent", cls: "num", sortVal: function (r) { return r._cs.spent; }, map: function (r) { return f.usd(r._cs.spent); } },
          { label: "Margin", cls: "num", sortVal: function (r) { return r.sub_kind === "lot" ? -998 : (r._cs.noCost ? -999 : r._cs.marginPct); }, map: function (r) { return r.sub_kind === "lot" ? '<span class="muted">rolls up at parent</span>' : (r._cs.noCost ? chip("awaiting first cost", "warn") : '<span class="mono" style="color:var(--' + (r._cs.marginPct < 15 ? "warn" : "ok") + ')">' + f.pct(r._cs.marginPct) + "</span>"); } },
        ], rows);
        /* ---- Founder #1: Projects grouped by CUSTOMER (top level) -----------
         * The cards are already customer×site, so a customer×site grouping layer
         * on top was redundant. New shape: TOP LEVEL = customer (collapsible,
         * persisted), and each row inside is one PROJECT (= a site, or one phase
         * of a multi-phase site). Row → project page → its jobs. No dead ends. */
        var COLLAPSE_KEY = "keystone.custgrp.collapsed";
        var collapsed = {};
        try { collapsed = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "{}") || {}; } catch (e0) {}
        function saveCollapsed() { try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed)); } catch (e1) {} }
        var swos = S.list("serviceWorkOrders");
        var arAll = S.list("arInvoices");
        // Per-project roll-up: contract from TOP jobs only, spent/budget/forecast
        // over the whole subtree — each job counted exactly once, so lot/scope
        // sub-jobs never double-count the parent's contract.
        function projRoll(pr) {
          var pjobs = jobs.filter(function (j) { return j.project_id === pr.id; });
          var c = 0, sp = 0, bd = 0, fc = 0, tops = 0, active = 0, mix = {};
          pjobs.forEach(function (j) {
            var ds = derivedStatus(K, j);
            sp = r2(sp + ds.spent); bd = r2(bd + ds.budget); fc = r2(fc + ds.forecast);
            if (!j.parent_job) {
              tops++; c = r2(c + ds.contract);
              mix[j.status] = (mix[j.status] || 0) + 1;
              if (j.status !== "complete") active++;
            }
          });
          var margin = r2(c - fc), marginPct = c ? r2(margin / c * 100) : 0;
          var siteId = pr.site_id;
          pjobs.forEach(function (j) { if (!siteId && j.site_id) siteId = j.site_id; });
          var site = siteId ? S.get("sites", siteId) : null;
          var fam = {}; pjobs.forEach(function (j) { fam[j.job_code] = true; });
          var svcN = swos.filter(function (w) { return (site && w.site_id === site.code) || fam[w.job_code]; }).length;
          return { pr: pr, jobs: pjobs, tops: tops, subs: pjobs.length - tops, contract: c, spent: sp,
            budget: bd, forecast: fc, margin: margin, marginPct: marginPct, active: active, mix: mix,
            site: site, svcN: svcN };
        }
        var custGroups = {}, custOrder = [];
        S.list("projects").forEach(function (pr) {
          var custId = pr.customer_id || "nocust";
          if (!custGroups[custId]) {
            custGroups[custId] = { customer: S.get("accounts", pr.customer_id) || {}, rolls: [], sites: {}, contract: 0, spent: 0, active: 0, openAR: 0 };
            custOrder.push(custId);
          }
          var g0 = custGroups[custId], rr = projRoll(pr);
          g0.rolls.push(rr);
          if (rr.site) g0.sites[rr.site.id] = true;
          g0.contract = r2(g0.contract + rr.contract);
          g0.spent = r2(g0.spent + rr.spent);
          g0.active += rr.active;
        });
        custOrder.forEach(function (custId) {
          var g0 = custGroups[custId];
          // Customer open A/R — every open AR invoice for the customer (live balance)
          g0.openAR = r2(arAll.filter(function (i) { return i.customer_id === custId; }).reduce(function (s, i) { return s + (Number(i.balance) || 0); }, 0));
          // Phases of the same site sit adjacent (multi-phase sites, founder note)
          g0.rolls.sort(function (a, b) {
            var sa = (a.site && a.site.name) || "zzz", sb = (b.site && b.site.name) || "zzz";
            if (sa !== sb) return sa < sb ? -1 : 1;
            return String(a.pr.name || "").localeCompare(String(b.pr.name || ""));
          });
        });
        custOrder.sort(function (a, b) {
          var ca = custGroups[a].contract, cb = custGroups[b].contract;
          if (cb !== ca) return cb - ca;
          var na = custGroups[a].customer.dba || custGroups[a].customer.legal_name || a;
          var nb = custGroups[b].customer.dba || custGroups[b].customer.legal_name || b;
          return String(na).localeCompare(String(nb));
        });
        function mixChips(mix) {
          var out = [], k;
          for (k in mix) if (mix.hasOwnProperty(k)) out.push(statusChip(k) + (mix[k] > 1 ? '<span class="mono subtle" style="font-size:10px"> ×' + mix[k] + "</span>" : ""));
          return out.join(" ") || '<span class="subtle">—</span>';
        }
        var projSection = custOrder.length ? custOrder.map(function (custId) {
          var g = custGroups[custId];
          var isClosed = !!collapsed[custId];
          var custNm = g.customer.dba || g.customer.legal_name || "No customer";
          var nSites = 0, sk; for (sk in g.sites) if (g.sites.hasOwnProperty(sk)) nSites++;
          var arKind = g.openAR > 0 ? "warn" : "mute";
          var hdr = '<div data-click="' + on(function () { if (collapsed[custId]) delete collapsed[custId]; else collapsed[custId] = 1; saveCollapsed(); K.reRender(); }) + '" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--line);border-radius:10px;cursor:pointer;margin-top:8px">'
            + '<span style="font-size:11px;color:var(--txt-3)">' + (isClosed ? "▸" : "▾") + "</span>"
            + '<b style="font-size:13px">' + esc(custNm) + "</b>"
            + '<span class="subtle" style="font-size:11.5px">' + g.rolls.length + " project" + (g.rolls.length === 1 ? "" : "s") + " · " + nSites + " site" + (nSites === 1 ? "" : "s") + " · " + g.active + " active job" + (g.active === 1 ? "" : "s") + "</span>"
            + '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center">'
            + chip("contract " + f.usdShort(g.contract), "brand") + chip("spent " + f.usdShort(g.spent), "ok")
            + '<span class="chip ' + arKind + '" data-click="' + on(function () { drillAccount(K, g.customer); }) + '" style="cursor:pointer" title="Open A/R across this customer — opens the customer">A/R ' + f.usdShort(g.openAR) + "</span>"
            + "</span></div>";
          var inner = "";
          if (!isClosed) {
            inner = '<div style="padding:2px 6px 8px">' + tbl([
              { label: "Project", sortVal: function (r) { return (r.site && r.site.name) || r.pr.name; }, map: function (r) { return "<b>" + esc(r.pr.name) + "</b>" + (r.site ? ' <span class="chip mute" style="font-size:10px">' + esc(r.site.code) + "</span>" : "") + ' <span class="mono muted" style="font-size:10.5px">' + esc(r.pr.project_code || "") + "</span>"; } },
              { label: "PM", sortVal: function (r) { return r.pr.pm || ""; }, map: function (r) { return esc(r.pr.pm || "—"); } },
              { label: "Jobs", cls: "num", sortVal: function (r) { return r.tops; }, map: function (r) { return r.tops + (r.subs ? ' <span class="subtle" style="font-size:10px">+' + r.subs + " sub</span>" : ""); } },
              { label: "Contract", cls: "num", sortVal: function (r) { return r.contract; }, map: function (r) { return f.usd(r.contract); } },
              { label: "Spent", cls: "num", sortVal: function (r) { return r.spent; }, map: function (r) { return f.usd(r.spent); } },
              { label: "Margin", cls: "num", sortVal: function (r) { return r.contract ? r.marginPct : -999; }, map: function (r) { return r.contract ? '<span class="mono" style="color:var(--' + (r.marginPct < 15 ? "warn" : "ok") + ')">' + f.pct(r.marginPct) + "</span>" : chip("no cost yet", "warn"); } },
              { label: "Status", map: function (r) { return mixChips(r.mix); } },
              { label: "Service", cls: "num", sortVal: function (r) { return r.svcN; }, map: function (r) { return r.svcN ? '<span class="chip info" data-click="' + on(function () { K.go("service"); }) + '" style="cursor:pointer" title="Service history on this site — opens Service & Warranty">⚒ ' + r.svcN + "</span>" : '<span class="subtle">—</span>'; } },
            ], g.rolls.map(function (r) { return Object.assign({}, r, { _click: on(function () { K.go("projects/prj/" + r.pr.id); }) }); })) + "</div>";
          }
          return hdr + inner;
        }).join("") : empty("▤", "No projects yet", "Win a bid or create a job — the project umbrella builds itself.");
        /* ---- #6: page-level month calendar — every job's milestones + starts */
        projects._calM = projects._calM || {};
        var pKey = projects._calM.__page || TODAY.slice(0, 7);
        var pp = pKey.split("-");
        var pLabel = new Date(parseInt(pp[0], 10), parseInt(pp[1], 10) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        var pageEv = {};
        function pAdd(iso, lab, cls, k2) {
          if (!iso) return;
          iso = String(iso).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
          (pageEv[iso] = pageEv[iso] || []).push({ lab: lab, cls: cls, k: k2 });
        }
        jobs.filter(function (j) { return !j.parent_job; }).forEach(function (j) {
          var d4 = j.dates || {};
          MS_LANES.forEach(function (ln) {
            var m = d4[ln[0]] || {};
            if (!m.date) return;
            pAdd(m.date, j.job_code + " " + ln[1], m.flag ? "done" : ((daysSince(m.date) || 0) > 0 ? "late" : ""), on((function (jb, ms) { return function () { drillMilestone(K, jb, ms); }; })(j, ln[0])));
          });
        });
        S.list("projects").forEach(function (pr) {
          if (pr.start_date) pAdd(pr.start_date, "▶ " + (pr.project_code || pr.name || "").slice(0, 14), "", on((function (id2) { return function () { K.go("projects/prj/" + id2); }; })(pr.id)));
        });
        var DOW2 = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        var py = parseInt(pp[0], 10), pmo = parseInt(pp[1], 10) - 1;
        var pcal = '<div class="mcal">' + DOW2.map(function (x) { return '<div class="mch">' + x + "</div>"; }).join("");
        var pStart = new Date(py, pmo, 1).getDay(), pDays = new Date(py, pmo + 1, 0).getDate(), pPrev = new Date(py, pmo, 0).getDate();
        var pTot = Math.ceil((pStart + pDays) / 7) * 7, pi;
        for (pi = 0; pi < pTot; pi++) {
          var pDayNum, pIso = null, pOut = false;
          if (pi < pStart) { pDayNum = pPrev - pStart + 1 + pi; pOut = true; }
          else if (pi - pStart < pDays) { pDayNum = pi - pStart + 1; pIso = py + "-" + pad2(pmo + 1) + "-" + pad2(pDayNum); }
          else { pDayNum = pi - pStart - pDays + 1; pOut = true; }
          var pEvs = (pIso && pageEv[pIso]) ? pageEv[pIso] : [];
          pcal += '<div class="mcd' + (pOut ? " out" : "") + (pIso === TODAY ? " today" : "") + '"><span class="md">' + pDayNum + "</span>"
            + pEvs.slice(0, 3).map(function (e) { return '<span class="mev ' + e.cls + '" data-click="' + e.k + '" style="cursor:pointer" title="' + esc(e.lab) + '">' + esc(e.lab) + "</span>"; }).join("")
            + (pEvs.length > 3 ? '<span class="mev" title="' + esc(pEvs.slice(3).map(function (e) { return e.lab; }).join(" · ")) + '">+' + (pEvs.length - 3) + " more</span>" : "")
            + "</div>";
        }
        pcal += "</div>";
        var pageCalCard = card({ title: "Delivery calendar — all jobs", sub: "Every job's milestone dates + scheduled starts on one month grid. Click an event → its provenance drill.",
          head: '<button class="btn sm" data-click="' + on(function () { projects._calM.__page = shiftMonth(pKey, -1); K.reRender(); }) + '">‹</button> <span class="mono" style="font-size:11.5px">' + esc(pLabel) + '</span> <button class="btn sm" data-click="' + on(function () { projects._calM.__page = shiftMonth(pKey, 1); K.reRender(); }) + '">›</button>',
          body: pcal });
        /* ---- jobs table — collapsible too, persisted ---- */
        var jobsClosed = false;
        try { jobsClosed = localStorage.getItem("keystone.jobstbl.collapsed") === "1"; } catch (e2) {}
        var jobsCard = card({ title: "All jobs" + (jobsClosed ? " · " + jobs.length + " (collapsed)" : ""), sub: "Click a row → the full job ticket. ↳ rows are sub-jobs (roofing/siding under one parent). Project name drills to the project page.",
          head: '<button class="btn sm" data-click="' + on(function () { try { localStorage.setItem("keystone.jobstbl.collapsed", jobsClosed ? "0" : "1"); } catch (e3) {} K.reRender(); }) + '">' + (jobsClosed ? "▸ Expand" : "▾ Collapse") + "</button>",
          body: jobsClosed ? '<p class="subtle" style="margin:0">' + jobs.length + " job(s) hidden — expand to work the list.</p>" : t });
        return head("Projects & Jobs", "Customers, each opening to their projects (one per site or phase) — every project → its page, every job → its ticket. Costing on the derived-balance ledger.",
          '<button class="btn sm primary" data-click="' + on(function () { jobForm(K); }) + '">+ New job</button>') +
          grid("g-kpi",
            kpi({ lab: "Contract value", val: f.usdShort(totContract), kind: "" }) +
            kpi({ lab: "Committed", val: f.usdShort(totCommit), kind: "info" }) +
            kpi({ lab: "Cost to date", val: f.usdShort(totSpent), meta: chip("live from ledger", "ok"), kind: "ok" }) +
            kpi({ lab: "Active jobs", val: jobs.filter(function (j) { return j.status !== "complete"; }).length + "", meta: '<span class="muted">' + jobs.length + " total</span>" })
          ) +
          card({ title: "Projects — by customer", sub: "Each customer opens to its projects — one row per site (or per phase of a multi-phase site), with contract / spent / margin roll-ups and site service history. Click a header to collapse (remembered) · click a project → its project page.", body: projSection }) +
          jobsCard +
          pageCalCard;
      });
      if (p.id === "new-job") jobForm(K);
    },
    /* ---- project page: header · jobs + sub-jobs w/ roll-ups · linked bid · docs · milestones ---- */
    project: function (K, id, mount) {
      var S = K.store, L = window.KeystoneLedger, f = K.fmt;
      var pr = S.get("projects", id) || S.list("projects").filter(function (x) { return x.project_code === id; })[0];
      if (!pr) { mount.innerHTML = head("Project", "") + empty("▤", "Project not found", String(id || "")); return; }
      mountView(K, mount, function (on) {
        var acct = S.get("accounts", pr.customer_id) || {};
        var jobs = S.list("jobs", { project_id: pr.id });
        var site = pr.site_id ? S.get("sites", pr.site_id) : null;
        if (!site) jobs.forEach(function (j) { if (!site && j.site_id) site = S.get("sites", j.site_id); });
        var ordered = orderJobsTree(jobs);   // recursive: parent → lots → scopes
        var rows = ordered.map(function (j) {
          return Object.assign({}, j, { _cs: derivedStatus(K, j), _click: on(function () { K.go("projects/" + j.id); }) });
        });
        var tops = rows.filter(function (r) { return !r.parent_job; });
        var cTot = tops.reduce(function (s, r) { return s + r._cs.contract; }, 0);
        var bTot = rows.reduce(function (s, r) { return s + r._cs.budget; }, 0);
        var sTot = rows.reduce(function (s, r) { return s + r._cs.spent; }, 0);
        var fTot = rows.reduce(function (s, r) { return s + r._cs.forecast; }, 0);
        var mTot = r2(cTot - fTot), mPct = cTot ? r2(mTot / cTot * 100) : 0;
        var codes = jobs.map(function (j) { return j.job_code; });
        var arBal = S.list("arInvoices").filter(function (i) { return codes.indexOf(i.job_id) >= 0; }).reduce(function (s, i) { return s + (Number(i.balance) || 0); }, 0);
        var wonBid = S.list("opportunities").filter(function (o) { return o.won_job && (codes.indexOf(o.won_job) >= 0 || jobs.some(function (j) { return j.id === o.won_job; })); })[0];
        var jt = tbl([
          { label: "Job", map: function (r) { return treeIndent(r._lv) + "<b>" + esc(jobTitleOf(r)) + "</b>"; } },
          { label: "Scope", map: function (r) { return chip(r.scope, r.scope === "roofing" ? "roof" : "side"); } },
          { label: "Status", map: function (r) { return statusChip(r.status); } },
          { label: "Contract", cls: "num", sortVal: function (r) { return r._cs.contract; }, map: function (r) { return f.usd(r._cs.contract); } },
          { label: "Budget", cls: "num", sortVal: function (r) { return r._cs.budget; }, map: function (r) { return f.usd(r._cs.budget); } },
          { label: "Spent", cls: "num", sortVal: function (r) { return r._cs.spent; }, map: function (r) { return f.usd(r._cs.spent); } },
          { label: "Margin", cls: "num", sortVal: function (r) { return r.sub_kind === "lot" ? -998 : (r._cs.noCost ? -999 : r._cs.marginPct); }, map: function (r) { return r.sub_kind === "lot" ? '<span class="muted">rolls up at parent</span>' : (r._cs.noCost ? chip("awaiting first cost", "warn") : '<span class="mono" style="color:var(--' + (r._cs.marginPct < 15 ? "warn" : "ok") + ')">' + f.pct(r._cs.marginPct) + "</span>"); } },
        ], rows);
        var docs = S.list("documents").filter(function (d) { return d.linked_type === "job" && codes.indexOf(d.linked_id) >= 0; });
        var docTbl = docs.length ? tbl([
          { label: "Document", map: function (r) { return "<b>" + esc(r.title) + "</b>"; } },
          { label: "Type", map: function (r) { return chip(r.doc_type, "mute"); } },
          { label: "Job", k: "linked_id" },
          { label: "Date", map: function (r) { return f.dateShort(r.date); } },
        ], docs.map(function (d) { return Object.assign({}, d, { _click: on(function () { K.toast("Demo file — the document store connects to Drive/SharePoint in production.", { title: d.filename || d.title, kind: "" }); }) }); })) : empty("❐", "No documents linked", "Job documents roll up here.");
        var msRows = tops.map(function (r) {
          var d = r.dates || {};
          return '<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line)"><span class="mono" style="font-size:11.5px;min-width:120px">' + esc(jobTitleOf(r)) + "</span>"
            + '<span style="display:flex;gap:6px;flex-wrap:wrap">' + MS_LANES.map(function (ln) {
              var m = d[ln[0]] || {};
              return '<span title="' + esc(ln[1] + (m.date ? " · " + m.date : "")) + '" style="font-size:11px;color:var(--' + (m.flag ? "ok" : "txt-4") + ')">' + (m.flag ? "✓" : "○") + " " + esc(ln[1]) + "</span>";
            }).join("") + "</span></div>";
        }).join("") || '<p class="subtle">No jobs yet.</p>';
        var hdr = card({ title: pr.name, sub: (pr.project_code || "") + " · " + (pr.scope || "") ,
          head: statusChip(pr.status),
          body: '<div class="kv">'
            + '<div class="k">Customer</div><div class="v"><span class="act" data-click="' + on(function () { drillAccount(K, acct); }) + '" style="cursor:pointer">' + esc(acct.legal_name || pr.customer_id || "—") + " →</span></div>"
            + '<div class="k">Site</div><div class="v">' + (site ? esc(site.code + " — " + site.name) + (site.city ? ' <span class="subtle">· ' + esc(site.city) + "</span>" : "") : '<span class="subtle">—</span>') + "</div>"
            + '<div class="k">PM</div><div class="v">' + esc(pr.pm || "—") + "</div>"
            + '<div class="k">Address</div><div class="v">' + esc(pr.address || "—") + "</div>"
            + '<div class="k">Start</div><div class="v">' + f.date(pr.start_date) + "</div>"
            + '<div class="k">Contract</div><div class="v"><b>' + f.usd(pr.contract_amount || cTot, true) + "</b></div>"
            + '<div class="k">Linked bid</div><div class="v">' + (wonBid ? '<span class="act" data-click="' + on(function () { drillOpp(K, wonBid); }) + '" style="cursor:pointer">' + esc(wonBid.id + " · " + wonBid.project_name) + " →</span>" : '<span class="subtle">—</span>') + "</div>"
            + "</div>" });
        return head("Project " + (pr.project_code || pr.id), pr.name + " — jobs, sub-jobs and roll-ups",
          '<span class="act" data-click="' + on(function () { K.go("projects"); }) + '">← Projects</span> '
          + (acct.id ? '<span class="act" data-click="' + on(function () { drillAccount(K, acct); }) + '">' + esc(acct.dba || acct.legal_name || "customer") + " →</span> " : "")
          + '<button class="btn sm primary" data-click="' + on(function () { jobForm(K); }) + '">+ New job</button>') +
          grid("g-kpi",
            kpi({ lab: "Contract value", val: f.usdShort(cTot), kind: "" }) +
            kpi({ lab: "Cost to date", val: f.usdShort(sTot), meta: '<span class="muted">budget ' + f.usdShort(bTot) + "</span>", kind: "ok" }) +
            kpi({ lab: "Combined margin", val: cTot ? f.pct(mPct) : "—", meta: '<span class="muted">' + f.usd(mTot) + "</span>", kind: mPct < 15 ? "warn" : "ok" }) +
            kpi({ lab: "Open A/R", val: f.usdShort(arBal), kind: "info" })
          ) +
          grid("g-2", hdr + card({ title: "Milestones overview", sub: "Per top-level job — the six the legacy ERP lanes", body: msRows })) +
          card({ title: "Jobs & sub-jobs", sub: "Roll-up: contract " + f.usd(cTot) + " · budget " + f.usd(bTot) + " · spent " + f.usd(sTot) + " · combined margin " + f.pct(mPct) + " — contract counts parents only (sub-jobs split the parent)", body: jt }) +
          card({ title: "Documents", sub: docs.length + " linked via jobs", body: docTbl }) +
          card({ title: "Notes (" + notesRows("projects", pr.id).length + ")", sub: "The running record on this project — visible to every seat", body: '<div style="max-width:720px">' + notesSection("projects", pr.id, true) + "</div>" });
      });
      notesBind("projects", pr.id);
    },
    /* ---- JOB TICKET — the legacy ERP job-dashboard parity, surpassed ---- */
    detail: function (K, id, mount) {
      var S = K.store, L = window.KeystoneLedger, f = K.fmt;
      var job = S.get("jobs", id) || S.list("jobs").filter(function (j) { return j.job_code === id; })[0];
      if (!job) { mount.innerHTML = head("Job", "") + empty("▤", "Job not found", id); return; }
      if (job.sub_kind === "lot") return projects.lotDetail(K, job, mount);
      var pr = S.get("projects", job.project_id) || {};
      var cs = derivedStatus(K, job);
      projects._lotTab = projects._lotTab || {};
      projects._calM = projects._calM || {};
      mountView(K, mount, function (on) {
        var budgetLines = S.list("budgetLines", { job_code: job.job_code });
        var commits = S.list("commitments", { job_code: job.job_code });
        var cogsAccts = {}; S.list("glAccounts").forEach(function (a) { if (a.account_type === "cogs") cogsAccts[a.account_code] = true; });
        var activity = L.activity({ job_code: job.job_code }).filter(function (a) { return a.debit && cogsAccts[a.account]; });
        var famCodes = familyCodesOf(K, job);
        var ars = S.list("arInvoices").filter(function (i) { return famCodes.indexOf(i.job_id) >= 0; });
        var acct = S.get("accounts", pr.customer_id) || {};
        var site = job.site_id ? S.get("sites", job.site_id) : null;
        var parent = job.parent_job ? (S.list("jobs").filter(function (j) { return j.job_code === job.parent_job; })[0] || null) : null;
        var kids = childJobsOf(K, job.job_code);
        var kidsAll = descendantJobsOf(K, job.job_code);
        if (kidsAll.length) cs = rollupStatus(K, job);   // recursive family roll-up

        // All four tiles derive from the same sources (budget lines, commitments
        // + executed COs, ledger activity) — a job with no cost yet shows honest
        // zeros with an "awaiting first cost" chip, never stored figures.
        var hero = grid("g-kpi",
          kpi({ lab: "Contract", val: f.usdShort(cs.contract), kind: "" }) +
          kpi({ lab: "Cost budget", val: f.usdShort(cs.budget), meta: cs.noCost ? chip("awaiting first cost", "warn") : '<span class="muted">committed ' + f.usdShort(cs.committed) + (cs.coDelta ? " incl CO " + f.usdShort(cs.coDelta) : "") + "</span>", kind: "info" }) +
          kpi({ lab: "Spent to date", val: f.usdShort(cs.spent), meta: cs.noCost ? chip("no ledger activity yet", "mute") : chip(f.pct(cs.pctSpent) + " of budget", cs.pctSpent > 90 ? "warn" : "ok"), kind: "ok" }) +
          kpi({ lab: "Forecast margin", val: cs.noCost ? "—" : f.pct(cs.marginPct), meta: cs.noCost ? chip("awaiting first cost", "warn") : '<span class="muted">' + f.usd(cs.margin) + "</span>", kind: cs.noCost ? "" : (cs.marginPct < 15 ? "warn" : "ok") })
        );

        /* ---- ticket header — the coded the legacy ERP anatomy ---- */
        var lotChips = (job.lots && job.lots.length) ? job.lots.map(function (l) { return chip("Lot " + l, "info"); }).join(" ") : '<span class="subtle">—</span>';
        var prov = jobProvenance(K, job);
        var gaps = ticketGaps(K, job);
        var gapsChip = gaps.length ? '<span class="chip warn" data-click="' + on(function () {
            var wonOpp0 = S.list("opportunities").filter(function (o2) { return o2.won_job === job.job_code || o2.won_job === job.id; })[0] || null;
            completeTicketForm(K, job, wonOpp0);
          }) + '" style="cursor:pointer" title="Low-quality ticket — click to complete. Missing: ' + esc(gaps.join(", ")) + '">⚠ incomplete — ' + gaps.length + " missing</span> " : "";
        var hdrCard = card({ title: jobTitleOf(job), sub: "Job " + job.job_code + (pr.name ? " · " + pr.name : ""),
          head: gapsChip + (job.is_model ? chip("MODEL", "brand") + " " : "") + statusChip(job.status),
          body: '<div class="kv">'
            + '<div class="k">Customer</div><div class="v"><span class="act" data-click="' + on(function () { drillAccount(K, acct); }) + '" style="cursor:pointer">' + esc(custCodeOf(acct)) + " — " + esc(acct.legal_name || pr.customer_id || "—") + " →</span></div>"
            + '<div class="k">Site</div><div class="v">' + (site ? '<span class="mono">' + esc(site.code) + "</span> — " + esc(site.name) : '<span class="subtle">—</span>') + "</div>"
            + '<div class="k">Building</div><div class="v">' + esc(job.bldg_type ? job.bldg_type + " — " + (job.bldg_type_label || bldgLabelOf(job.bldg_type)) : "—") + "</div>"
            + '<div class="k">Lots</div><div class="v">' + lotChips + "</div>"
            + '<div class="k">Scope</div><div class="v">' + chip(job.scope, job.scope === "roofing" ? "roof" : "side") + (parent ? ' <span class="act" data-click="' + on(function () { K.go("projects/" + parent.id); }) + '" style="cursor:pointer">↰ parent ' + esc(jobTitleOf(parent)) + " →</span>" : "") + "</div>"
            + '<div class="k">Address</div><div class="v">' + esc((job.address || pr.address || "—") + (job.city ? " · " + job.city : "")) + "</div>"
            + '<div class="k">PM</div><div class="v">' + esc(job.pm || pr.pm || "—") + "</div>"
            + '<div class="k">Supervisor</div><div class="v">' + esc(job.supervisor || "—") + "</div>"
            + (job.drive_folder ? '<div class="k">Drive folder</div><div class="v"><a class="act" href="' + esc(job.drive_folder) + '" target="_blank" rel="noopener">Open job folder ↗</a> ' + chip("demo link", "mute") + "</div>" : "")
            + '<div class="k">Created</div><div class="v">' + esc(prov.created.by || "—") + ' <span class="subtle">' + (prov.created.date ? f.dateShort(prov.created.date) : "—") + (job.created_by ? "" : " · from audit") + "</span></div>"
            + '<div class="k">Last update</div><div class="v">' + esc(prov.updated.by || "—") + ' <span class="subtle">' + (prov.updated.date ? f.dateShort(prov.updated.date) : "—") + (job.last_update_by ? "" : " · from audit") + "</span></div>"
            + "</div>"
            + (job.note ? '<div class="mono" style="margin-top:12px;padding:9px 11px;border:1px dashed var(--line);border-radius:9px;font-size:11.5px;color:var(--txt-2)" title="Pricing-memo note (the legacy ERP header)">' + esc(job.note) + "</div>" : "") });

        var msCard = card({ title: "Milestones", sub: "The six the legacy ERP lanes — day counts computed LIVE at render. Click a lane → what triggered it, who, and the child actions that followed.",
          body: milestoneTracker(K, job, function (msId) { return on(function () { drillMilestone(K, job, msId); }); }) });
        // month-grid milestone calendar (item: MILESTONE CALENDAR)
        var mKey = projects._calM[job.job_code] || TODAY.slice(0, 7);
        var mp = mKey.split("-");
        var mLabel = new Date(parseInt(mp[0], 10), parseInt(mp[1], 10) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
        var msCalCard = card({ title: "Milestone calendar", sub: "Milestones (◆) + child events — PO · WO · draws · AR invoices — on their days. Click any event for its drill.",
          head: '<button class="btn sm" data-click="' + on(function () { projects._calM[job.job_code] = shiftMonth(mKey, -1); K.reRender(); }) + '" title="Previous month">‹</button> <span class="mono" style="font-size:11.5px">' + esc(mLabel) + '</span> <button class="btn sm" data-click="' + on(function () { projects._calM[job.job_code] = shiftMonth(mKey, 1); K.reRender(); }) + '" title="Next month">›</button>',
          body: msCalendarHtml(K, on, job, mKey) });
        // DRAW & WO — the the legacy ERP tab, every row a deep drill
        var wos = S.list("subcontracts").filter(function (s2) { return famCodes.indexOf(s2.job_id) >= 0; });
        var sdraws = S.list("subDraws").filter(function (dd) { return famCodes.indexOf(dd.job_code) >= 0; });
        function secLbl(t2) { return '<div style="font-size:10.5px;color:var(--txt-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin:0 0 5px">' + esc(t2) + "</div>"; }
        var woTbl = wos.length ? tbl([
          { label: "Status", map: function (r) { return statusChip(r.status); } },
          { label: "WO #", map: function (r) { return '<span class="mono"><b>' + esc(r.wo_number || r.subcontract_id || "—") + "</b></span>"; } },
          { label: "Date", sortVal: function (r) { return r.date || r.closed_date || ""; }, map: function (r) { return '<span class="mono">' + f.dateShort(r.date || r.closed_date || String(r.createdAt || "").slice(0, 10)) + "</span>"; } },
          { label: "Contractor", map: function (r) { var v = S.get("vendors", r.vendor_id) || {}; return esc(v.name || r.vendor_id); } },
          { label: "Value", cls: "num", sortVal: function (r) { return r.current_value || r.original_value || 0; }, map: function (r) { return f.usd(r.current_value || r.original_value); } },
          { label: "", map: function (r) { return r._edit ? '<button class="btn sm" data-click="' + r._edit + '" title="Edit contractor, scope, value, retention — pre-posting only">Edit</button>' : '<span class="muted" title="Posted — changes go through the reversal path">—</span>'; } },
        ], wos.map(function (w) { return Object.assign({}, w, { _click: on(function () { drillSubcontract(K, w); }),
            _edit: ["draft", "pending-post"].indexOf(w.status) >= 0 ? on(function () { editWoForm(K, w); }) : null }); }))
          : empty("⚒", "No work orders", "Subcontract WOs land here when a sub is engaged.");
        var sdTbl = sdraws.length ? tbl([
          { label: "Date", sortVal: function (r) { return r.date || ""; }, map: function (r) { return '<span class="mono">' + f.dateShort(r.date) + "</span>"; } },
          { label: "Contractor", map: function (r) { return esc(r.contractor || (S.get("vendors", r.vendor_id) || {}).name || "—"); } },
          { label: "Amount", cls: "num", sortVal: function (r) { return r.amount || 0; }, map: function (r) { return f.usd(r.amount, true); } },
          { label: "Status", map: function (r) { return subDrawStatusChips(r.status); } },
          { label: "", map: function (r) { return r._appr ? '<button class="btn sm primary" data-click="' + r._appr + '">✓ Approve</button>' : ""; } },
        ], sdraws.map(function (dd) {
          // #5: approve pending draws IN CONTEXT — same two-click confirm, same
          // KApprove.approval path as the Action Hub (never forked).
          var pend = dd.status === "pending" ? S.list("approvals", { status: "pending" }).filter(function (a2) { return (a2.detail || "").indexOf(dd.id) >= 0; })[0] : null;
          return Object.assign({}, dd, { _click: on(function () { drillSubDraw(K, dd); }),
            _appr: pend ? on(function (el) {
              if (el && !el._armed) { el._armed = true; el.textContent = "Confirm — post " + f.usd(dd.amount); return; }
              var res = approveApproval(K, pend);
              K.toast(res.msg, { title: res.ok ? "Draw approved" : "Not approved", kind: res.ok ? "ok" : "warn", ms: 6500 });
              if (res.ok) setTimeout(function () { K.reRender(); }, 150);
            }) : null });
        }))
          : empty("▧", "No draws yet", "Contractor payment draws (the the legacy ERP DRAW tab) land here.");
        var drawWoCard = card({ title: "Draw & WO", sub: "Contractor work orders + payment draws — click any row for the full assembled drill. Pending draws approve right here (same posting path as the Action Hub).",
          head: '<button class="btn sm" data-click="' + on(function () { subcontractForm(K, { job_code: job.job_code }); }) + '">+ New WO</button>'
            + '<button class="btn sm primary" data-click="' + on(function () { subDrawForm(K, job); }) + '">+ New draw</button>',
          body: secLbl("Work orders (" + wos.length + ")") + woTbl
            + '<div style="margin-top:14px">' + secLbl("Draws (" + sdraws.length + ")") + sdTbl + "</div>" });

        /* ---- accounting summary — derived live (children roll up) ---- */
        var ac = acctSummaryOf(K, job);
        function tile(lab, val, tone) {
          return '<div style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;min-width:0">'
            + '<div style="font-size:10px;color:var(--txt-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em">' + esc(lab) + "</div>"
            + '<div class="mono" style="font-size:13.5px;font-weight:700;color:var(--' + (tone || "txt") + ')">' + f.usd(val, true) + "</div></div>";
        }
        var tiles = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;margin-bottom:14px">'
          + tile("Proposed", ac.proposed) + tile("To collect", ac.to_collect, "info") + tile("To pay", ac.to_pay, "warn")
          + tile("Net", ac.net, ac.net >= 0 ? "ok" : "bad") + tile("Collected", ac.collected, "ok") + tile("Paid", ac.paid)
          + tile("Net cash", ac.net_cash, ac.net_cash >= 0 ? "ok" : "bad") + "</div>";
        function mini(title2, rows2) {
          return '<div><div style="font-size:10.5px;color:var(--txt-3);font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px">' + esc(title2) + "</div>"
            + rows2.map(function (r3) { return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:11.5px;padding:2.5px 0"><span style="color:var(--txt-2)">' + esc(r3[0]) + '</span><span class="mono">' + f.usd(r3[1], true) + "</span></div>"; }).join("") + "</div>";
        }
        var minis = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:16px">'
          + mini("Receivables", [["Invoiced", ac.receivables.invoiced], ["Uninvoiced proposal", ac.receivables.uninvoiced], ["Receipts", ac.receivables.receipts], ["Balance", ac.receivables.balance]])
          + mini("Payables", [["Invoiced", ac.payables.invoiced], ["Disbursed", ac.payables.disbursed], ["Balance", ac.payables.balance]])
          + mini("Draws (billing apps)", [["Applications", ac.draws.total], ["Applied / paid", ac.draws.applied], ["Open", ac.draws.open]])
          + mini("Retainage", [["Held on A/R", ac.retainage.held]])
          + "</div>";
        var marginStrip = '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--line)">'
          + bar("Gross margin (contract vs forecast cost)", cs.noCost ? 0 : cs.marginPct, cs.noCost ? "awaiting first cost" : f.usd(cs.margin) + " · " + f.pct(cs.marginPct), cs.noCost ? "warn" : (cs.marginPct < 15 ? "warn" : "ok")) + "</div>";
        var acctCard = card({ title: "Accounting summary", sub: "Derived live from A/R · A/P · draws · the ledger" + (kidsAll.length ? " — includes " + kidsAll.length + " descendant sub-job(s)" : "") + ". Net = to collect − to pay · net cash = collected − paid.",
          head: '<button class="btn sm" data-click="' + on(function () { arChargeForm(K, job); }) + '">+ AR charge</button>'
            + '<button class="btn sm" data-click="' + on(function () { arCreditForm(K, job); }) + '">+ AR credit</button>'
            + '<button class="btn sm" data-click="' + on(function () { arInvoiceForm(K, job.job_code); }) + '">+ Invoice</button>'
            + '<button class="btn sm" data-click="' + on(function () { receiptForm(K, job); }) + '">+ Receipt</button>',
          body: tiles + minis + marginStrip });

        /* ---- job orders — per-lot itemized detail (BASE + lots) ---- */
        var orders = jobOrdersOf(K, job.job_code);
        var lots = ["BASE"];
        (job.lots || []).forEach(function (l) { if (lots.indexOf(String(l)) < 0) lots.push(String(l)); });
        orders.forEach(function (o) { if (lots.indexOf(String(o.lot)) < 0) lots.push(String(o.lot)); });
        var curLot = projects._lotTab[job.job_code] || "BASE";
        if (lots.indexOf(curLot) < 0) curLot = lots[0];
        var lotTabs = '<div class="tabs" style="margin-bottom:12px">' + lots.map(function (l) {
          var n = orders.filter(function (o) { return String(o.lot) === l; }).length;
          return '<div class="tab ' + (curLot === l ? "on" : "") + '" data-click="' + on(function () { projects._lotTab[job.job_code] = l; K.reRender(); }) + '">' + esc(l === "BASE" ? "BASE template" : "Lot " + l) + (n ? " · " + n : "") + "</div>";
        }).join("") + "</div>";
        var lotRows = orders.filter(function (o) { return String(o.lot) === curLot; });
        var joTbl = lotRows.length ? tbl([
          { label: "Route", sortVal: function (r) { return r.route || ""; }, map: function (r) { return routeChipOf(r.route); } },
          { label: "Category", map: function (r) { return "<b>" + esc(r.category) + "</b>"; } },
          { label: "Material", map: function (r) { return esc(r.material || "—"); } },
          { label: "Color", sortVal: function (r) { return r.color || ""; }, map: function (r) { return colorChipOf(r.color); } },
          { label: "Qty", cls: "num", sortVal: function (r) { return r.qty || 0; }, map: function (r) { return r.qty == null ? '<span class="muted">—</span>' : '<span class="mono">' + r.qty + "</span>"; } },
          { label: "Unit", k: "unit" },
          { label: "Status", map: function (r) { return statusChip(r.status || "planned"); } },
        ], lotRows) : empty("▦", "No job orders on " + (curLot === "BASE" ? "the BASE template" : "lot " + curLot), "Add lines below — WH pulls stock, CP is consignment, PO drafts a purchase order, WO a work order.");
        var poables = orders.filter(function (o) { return o.route === "PO" && o.status !== "ordered"; });
        var joCard = card({ title: "Job orders — itemized detail", sub: orders.length + " lines across " + lots.length + " tabs · route legend: WH warehouse · CP consignment · PO purchase · WO work order",
          head: '<button class="btn sm" data-click="' + on(function () { jobOrderForm(K, job, curLot); }) + '">+ Add job order</button> '
            + '<button class="btn sm primary" ' + (poables.length ? "" : "disabled ") + 'data-click="' + on(function () {
              if (!poables.length) { K.toast("No open route=PO lines to order.", { kind: "warn" }); return; }
              var items = poables.map(function (o) {
                return { jo_ref: o.id, desc: o.category + (o.material ? " — " + o.material : "") + (o.color ? " · " + o.color : "") + (String(o.lot) !== "BASE" ? " (lot " + o.lot + ")" : ""), qty: Number(o.qty) || 0, unit: o.unit || "", unit_cost: 0, amount: 0 };
              });
              poForm(K, { job_code: job.job_code, items: items });
            }) + '">Generate PO from ' + poables.length + " PO lines</button>",
          body: lotTabs + joTbl });

        var budgetCard = card({ title: "Budget vs committed vs spent", sub: "Per cost code + category — spent matched on BOTH, derived from the ledger",
          head: '<button class="btn sm" data-click="' + on(function () { budgetLineForm(K, job); }) + '">+ Budget line</button>',
          body: budgetLines.length ? budgetLines.map(function (b) {
            var spent = L.activity({ job_code: job.job_code }).filter(function (a) { return a.cost_code === b.cost_code && a.category === b.category && a.debit; }).reduce(function (s, a) { return s + a.debit; }, 0);
            return bar(b.cost_code + "." + b.category + " · " + b.description.slice(0, 22), b.current_cost ? spent / b.current_cost * 100 : 0, f.usd(spent) + " / " + f.usd(b.current_cost), spent > b.current_cost ? "bad" : "ok");
          }).join("") : empty("▤", "No budget yet", "Import a takeoff to populate the budget.") });

        var commitTbl = commits.length ? tbl([{ label: "Type", k: "commitment_type" }, { label: "Ref", map: function (r) { return r.status === "cancelled" ? "<s>" + esc(r.reference_no) + "</s>" : esc(r.reference_no); } }, { label: "Vendor", map: function (r) { var v = S.get("vendors", r.vendor_id) || {}; return esc(v.name || r.vendor_id); } }, { label: "Value", cls: "num", sortVal: function (r) { return r.original_value; }, map: function (r) { return r.status === "cancelled" ? '<s class="muted">' + f.usd(r.original_value) + "</s>" : f.usd(r.original_value); } }, { label: "Invoiced", cls: "num", sortVal: function (r) { return r.invoiced_to_date || 0; }, map: function (r) { return f.usd(r.invoiced_to_date); } }, { label: "Status", map: function (r) { return statusChip(r.status); } }, { label: "", map: function (r) { return '<button class="btn sm" data-click="' + r._pr + '">⎙ PO</button>'; } }],
          commits.map(function (c) { return Object.assign({}, c, { _click: on(function () { drillCommit(K, c); }), _pr: on(function () { printCommitPo(K, c); }) }); })) : empty("⛓", "No commitments", "");
        var actTbl = activity.length ? tbl([{ label: "Date", map: function (r) { return '<span class="mono">' + f.dateShort(r.date) + "</span>"; } }, { label: "Account", k: "account" }, { label: "Cost code", map: function (r) { return (r.cost_code || "") + (r.category ? "." + r.category : ""); } }, { label: "Memo", k: "memo" }, { label: "Amount", cls: "num", map: function (r) { return f.usd(r.debit, true); } }], activity) : empty("$", "No cost posted yet", "Cost posts here when an AP voucher is approved.");

        /* ---- STRUCTURE — job → lot sub-jobs → scope sub-sub-jobs (pain #11) */
        var kidTot = { b: 0, s: 0 };
        kidsAll.forEach(function (k2) { var d3 = derivedStatus(K, k2); kidTot.b = r2(kidTot.b + d3.budget); kidTot.s = r2(kidTot.s + d3.spent); });
        var subCard = card({ title: "Structure — job → lots → scopes",
          sub: kidsAll.length ? kidsAll.length + " descendant(s) · roll-up budget " + f.usd(kidTot.b) + " · spent " + f.usd(kidTot.s) + " — click a node to open its ticket" : "Lots become lv1 sub-jobs, scopes lv2 sub-sub-jobs — one parent, never duplicate job ids (pain #11)",
          head: '<button class="btn sm primary" data-click="' + on(function () { subJobForm(K, job); }) + '">+ New sub-job</button>',
          body: structureCardBody(K, on, job) });
        var docs = S.list("documents").filter(function (d) { return d.linked_type === "job" && d.linked_id === job.job_code; });
        var docCard = card({ title: "Documents", sub: docs.length + " linked to this job",
          body: docs.length ? tbl([
            { label: "Document", map: function (r) { return "<b>" + esc(r.title) + "</b>"; } },
            { label: "Type", map: function (r) { return chip(r.doc_type, "mute"); } },
            { label: "Date", map: function (r) { return f.dateShort(r.date); } },
          ], docs.map(function (d) { return Object.assign({}, d, { _click: on(function () { K.toast("Demo file — the document store connects to Drive/SharePoint in production.", { title: d.filename || d.title, kind: "" }); }) }); })) : empty("❐", "No documents", "Options lists, drawings and color schemes link here.") });

        var colors = (job.colors && job.colors.length) ? card({ title: "Model color schedule", sub: "Per-lot — the field data CMiC can't hold", body: '<div class="btnrow">' + job.colors.map(function (c) { return colorChipOf(c); }).join(" ") + "</div>" }) : "";
        var billCard = card({ title: "Billing", sub: "A/R against this job family — click a row for the full invoice drill", body: ars.length ? tbl([{ label: "Invoice", map: function (r) { return '<span class="mono">' + esc(r.invoice_number) + "</span>" + (r.kind === "credit" ? " " + chip("credit", "warn") : ""); } }, { label: "Job", k: "job_id" }, { label: "Date", map: function (r) { return f.dateShort(r.invoice_date); } }, { label: "Amount", cls: "num", sortVal: function (r) { return r.sales_amount || 0; }, map: function (r) { return f.usd(r.sales_amount); } }, { label: "Balance", cls: "num", sortVal: function (r) { return r.balance || 0; }, map: function (r) { return f.usd(r.balance, true); } }], ars.map(function (i) { return Object.assign({}, i, { _click: on(function () { drillArInv(K, i); }) }); })) : empty("▧", "Not billed yet", "") });

        // sub-jobs carry their parent context on a strip (never orphaned)
        var childStrip = parent ? ctxStrip([
          { lab: "Parent job", val: jobTitleOf(parent), go: "projects/" + parent.id },
          { lab: "Customer", val: acct.legal_name ? custCodeOf(acct) + " — " + acct.legal_name : null },
          site ? { lab: "Site", val: site.code + " — " + site.name } : null,
          job.sub_kind === "scope" ? { lab: "Scope slice", val: job.scope } : null,
          { lab: "PM", val: job.pm || pr.pm },
        ].filter(function (p) { return p && p.val; })) : "";

        // wave-5: a job born from a bid can be un-converted (gated + blocker-checked)
        var wonOpp = S.list("opportunities").filter(function (o2) { return o2.stage === "won" && (o2.won_job === job.job_code || o2.won_job === job.id); })[0] || null;
        var unconvBtn = "";
        if (wonOpp && can("conversion.undo")) {
          unconvBtn = '<button class="btn sm danger" data-click="' + on(function () {
            drillForm(K, "Un-convert " + job.job_code + " ← bid " + wonOpp.id,
              fld("Reason (required — goes on the audit record)", inp("ucReason", "text", "", "why this conversion is being undone"))
              + '<p class="subtle">Removes the job family, job orders, draft POs/subcontracts, budget lines and open auto tasks, and returns bid ' + esc(wonOpp.id) + " to SUBMITTED. Blocked if ledger activity, non-draft commitments, AP/AR or timecards reference the family.</p>",
              "Un-convert", function () {
                var reason = V("ucReason");
                if (!reason) { K.toast("A reason is required — it goes on the audit record.", { kind: "warn" }); return; }
                var res = window.KReversals.undoConversion(K, wonOpp, reason);
                revToast(K, res, "Un-convert");
                if (res.ok) { K.closeDrill(); K.go("projects"); }
              });
          }) + '">⤺ Un-convert</button>';
        }
        return head("Job " + jobTitleOf(job), (pr.name || "") + " · " + (job.scope || ""),
          '<span class="act" data-click="' + on(function () { K.go("projects"); }) + '">← all jobs</span> '
          + (pr.id ? '<span class="act" data-click="' + on(function () { K.go("projects/prj/" + pr.id); }) + '">project →</span> ' : "")
          + '<button class="btn sm" data-click="' + on(function () { poForm(K, { job_code: job.job_code }); }) + '">+ New PO</button>'
          + '<button class="btn sm" data-click="' + on(function () { jobCostReport(K, job, pr); }) + '">⎙ Job cost report</button>'
          + '<button class="btn sm" data-click="' + on(function () { jobPlReport(K, job, pr); }) + '">⎙ PL report</button>'
          + unconvBtn + " "
          + statusChip(job.status)) +
          childStrip +
          hero +
          grid("g-2", hdrCard + msCard) +
          grid("g-2", msCalCard + drawWoCard) +
          acctCard +
          joCard +
          grid("g-2", budgetCard + card({ title: "Cost activity (ledger)", sub: activity.length + " posted lines", body: actTbl })) +
          grid("g-2", card({ title: "Commitments (PO / Subcontract)", sub: "Click a row → the assembled PO / subcontract drill", body: commitTbl }) + billCard) +
          grid("g-2", subCard + docCard) +
          card({ title: "Notes (" + notesRows("jobs", job.id).length + ")", sub: "The running record on this job — who said what, when (visible to every seat)", body: '<div style="max-width:720px">' + notesSection("jobs", job.id, true) + "</div>" }) +
          colors;
      });
      notesBind("jobs", job.id);
    },
    /* ---- LOT SUB-JOB TICKET — the per-lot slice of the parent (item 4) ---- */
    lotDetail: function (K, job, mount) {
      var S = K.store, f = K.fmt;
      var parent = S.list("jobs").filter(function (j) { return j.job_code === job.parent_job; })[0] || null;
      var pr = S.get("projects", job.project_id) || (parent ? S.get("projects", parent.project_id) : null) || {};
      var acct = S.get("accounts", pr.customer_id) || {};
      var siteId = job.site_id || (parent && parent.site_id);
      var site = siteId ? S.get("sites", siteId) : null;
      var lotStr = String(job.lot != null ? job.lot : ((job.lots && job.lots[0]) || ""));
      var lotRe = new RegExp("\\blot\\s*" + lotStr + "\\b", "i");
      var pCode = parent ? parent.job_code : job.parent_job;
      mountView(K, mount, function (on) {
        var color = lotColorOf(K, job);
        var strip = ctxStrip([
          parent ? { lab: "Parent job", val: jobTitleOf(parent), go: "projects/" + parent.id } : { lab: "Parent job", val: job.parent_job },
          { lab: "Lot", val: "Lot " + lotStr },
          acct.legal_name ? { lab: "Customer", val: custCodeOf(acct) + " — " + acct.legal_name } : null,
          site ? { lab: "Site", val: site.code + " — " + site.name } : null,
          color ? { lab: "Color scheme", val: color } : null,
          { lab: "PM", val: job.pm || (parent && parent.pm) || pr.pm },
        ].filter(function (p) { return p && p.val; }));
        // this lot's job orders (they live on the parent code, lot-tagged)
        var orders = S.list("jobOrders").filter(function (o) { return (o.job_code === pCode || o.job_code === job.job_code) && String(o.lot) === lotStr; });
        var joTbl = orders.length ? tbl([
          { label: "Route", sortVal: function (r) { return r.route || ""; }, map: function (r) { return routeChipOf(r.route); } },
          { label: "Category", map: function (r) { return "<b>" + esc(r.category) + "</b>"; } },
          { label: "Material", map: function (r) { return esc(r.material || "—"); } },
          { label: "Color", sortVal: function (r) { return r.color || ""; }, map: function (r) { return colorChipOf(r.color); } },
          { label: "Qty", cls: "num", sortVal: function (r) { return r.qty || 0; }, map: function (r) { return r.qty == null ? '<span class="muted">—</span>' : '<span class="mono">' + r.qty + "</span>"; } },
          { label: "Unit", k: "unit" },
          { label: "Status", map: function (r) { return statusChip(r.status || "planned"); } },
        ], orders) : empty("▦", "No job orders on lot " + lotStr, "Lot-tagged detail lines from the parent ticket appear here.");
        // punch + RFIs that name this lot
        var punch = S.list("punchItems").filter(function (p2) { return (p2.job_id === pCode || p2.job_id === job.job_code) && lotRe.test((p2.location || "") + " " + (p2.description || "")); });
        var rfis = S.list("rfis").filter(function (r) { return (r.job_id === pCode || r.job_id === job.job_code) && lotRe.test((r.subject || "") + " " + (r.location || "")); });
        var punchTbl = punch.length ? tbl([
          { label: "#", map: function (r) { return '<span class="mono">' + esc(r.punch_number || r.id) + "</span>"; } },
          { label: "Location", k: "location" },
          { label: "Description", k: "description" },
          { label: "Assignee", k: "assignee" },
          { label: "Due", map: function (r) { return f.dateShort(r.due_date); } },
          { label: "Status", map: function (r) { return statusChip(r.status); } },
        ], punch) : empty("⚑", "No punch items name lot " + lotStr, "");
        var rfiRows = rfis.length ? rfis.map(function (r) {
          return rowLine('<span class="mono" style="font-size:12px">' + esc(r.rfi_number || r.id) + "</span><b style=\"font-size:12.5px\">" + esc(r.subject || "") + '</b><span class="subtle" style="margin-left:auto">' + esc(r.ball_in_court || "") + "</span>" + statusChip(r.status || "open"));
        }).join("") : '<p class="subtle">No RFIs reference lot ' + esc(lotStr) + ".</p>";
        // documents that name this lot
        var docs = S.list("documents").filter(function (dd) { return dd.linked_type === "job" && (dd.linked_id === pCode || dd.linked_id === job.job_code) && lotRe.test(dd.title || ""); });
        var docTbl = docs.length ? tbl([
          { label: "Document", map: function (r) { return "<b>" + esc(r.title) + "</b>"; } },
          { label: "Type", map: function (r) { return chip(r.doc_type, "mute"); } },
          { label: "Date", map: function (r) { return f.dateShort(r.date); } },
        ], docs.map(function (d) { return Object.assign({}, d, { _click: on(function () { K.toast("Demo file — the document store connects to Drive/SharePoint in production.", { title: d.filename || d.title, kind: "" }); }) }); })) : empty("❐", "No lot-" + lotStr + " documents", "Options lists and color sheets that name this lot land here.");
        // options / model — shown only when the parent actually carries them
        var model = job.model || (parent && parent.model) || null;
        var optsList = job.options || (parent && parent.options) || null;
        var optCard = (model || optsList) ? card({ title: "Options / model", sub: "From the parent ticket",
          body: '<div class="kv">' + (model ? '<div class="k">Model</div><div class="v">' + esc(model) + "</div>" : "")
            + (optsList ? '<div class="k">Options</div><div class="v">' + esc(Object.prototype.toString.call(optsList) === "[object Array]" ? optsList.join(" · ") : String(optsList)) + "</div>" : "") + "</div>" }) : "";
        // milestones tracked at parent — lanes still clickable into the parent's drills
        var msCard2 = parent ? card({ title: "Milestones — tracked at parent", sub: "Lots inherit the parent schedule; click a lane for its provenance drill",
          body: milestoneTracker(K, parent, function (msId) { return on(function () { drillMilestone(K, parent, msId); }); }) }) : "";
        // honest per-lot financials note — no fabricated allocations
        var finNote = card({ title: "Financials", sub: "",
          body: '<p class="muted" style="margin:0">Financials roll up at ' + (parent ? '<span class="act" data-click="' + on(function () { K.go("projects/" + parent.id); }) + '" style="cursor:pointer">' + esc(jobTitleOf(parent)) + " →</span>" : esc(job.parent_job || "the parent")) + " — per-lot cost allocation arrives with field time tagging. No invented per-lot figures.</p>" });
        var scopes = childJobsOf(K, job.job_code);
        var scopeCard = scopes.length ? card({ title: "Scope sub-jobs on this lot", sub: scopes.length + " scope ticket(s)",
          body: '<div class="tree">' + scopes.map(function (s2) {
            return '<div class="tnode" data-click="' + on(function () { K.go("projects/" + s2.id); }) + '"><span class="tic">' + ({ roofing: "R", siding: "S", "sheet-metal": "G" }[s2.scope] || "S") + "</span><b>" + esc(jobTitleOf(s2)) + '</b><span class="tmeta">' + statusChip(s2.status) + "</span></div>";
          }).join("") + "</div>" }) : "";
        return head("Lot " + lotStr + " · " + jobTitleOf(job), (pr.name || "") + " — lot sub-job of " + (parent ? jobTitleOf(parent) : job.parent_job),
          '<span class="act" data-click="' + on(function () { K.go("projects"); }) + '">← all jobs</span> '
          + (parent ? '<span class="act" data-click="' + on(function () { K.go("projects/" + parent.id); }) + '">↰ parent ticket</span> ' : "")
          + chip("LOT sub-job", "brand") + " " + statusChip(job.status)) +
          strip +
          card({ title: "Job orders — lot " + lotStr, sub: orders.length + " lot-tagged lines from the parent ticket", body: joTbl }) +
          grid("g-2", card({ title: "Punch — lot " + lotStr, sub: punch.length + " item(s) name this lot", body: punchTbl })
            + card({ title: "RFIs — lot " + lotStr, sub: rfis.length + " reference this lot", body: rfiRows })) +
          (msCard2 ? msCard2 : "") +
          grid("g-2", finNote + card({ title: "Documents — lot " + lotStr, body: docTbl })) +
          (optCard || "") + (scopeCard || "");
      });
    },
  };

  /* ============================================================= PROCUREMENT */
  // Deep PO form — line items auto-fill from the job's route=PO job orders the
  // moment a job is picked (founder ask #4); rows stay hand-editable; amount =
  // qty × unit cost recomputes live; the commitment stores the lines.
  function poForm(K, preset) {
    preset = preset || {};
    var S = K.store, f = K.fmt;
    var vendors = S.list("vendors");
    var vOpts = vendors.map(function (v) { return { v: v.id, l: v.name }; });
    if (preset.vendor_blank) vOpts = [{ v: "", l: "— select vendor —" }].concat(vOpts);
    var jOpts = jobOptsOf(K);
    var ccOpts = S.list("costCodes").map(function (c) { return { v: c.code, l: c.code + " — " + c.name }; });
    var catOpts = S.list("categories").map(function (c) { return { v: c.category_code, l: c.category_code + " — " + c.name }; });
    // Each auto-filled line carries jo_ref (its job order) — on submit ONLY the
    // lines that SURVIVED on the PO flip their orders to "ordered" (#D6); rows
    // the user removes leave their job orders "planned".
    function poLinesFromJob(jobCode) {
      var open = jobOrdersOf(K, jobCode).filter(function (o) { return o.route === "PO" && o.status !== "ordered"; });
      return open.map(function (o) {
        return { jo_ref: o.id, desc: o.category + (o.material ? " — " + o.material : "") + (o.color ? " · " + o.color : "") + (String(o.lot) !== "BASE" ? " (lot " + o.lot + ")" : ""), qty: Number(o.qty) || 0, unit: o.unit || "", unit_cost: 0, amount: 0 };
      });
    }
    var initJob = preset.job_code || (jOpts[0] && jOpts[0].v);
    var initRows;
    if (preset.items && preset.items.length) initRows = preset.items;
    else if (preset.description) { initRows = [{ desc: preset.description, qty: 1, unit: "", unit_cost: Number(preset.amount) || 0, amount: r2(Number(preset.amount) || 0) }]; }
    else initRows = poLinesFromJob(initJob);
    function jobAddr(jobCode) {
      var j = S.list("jobs").filter(function (x) { return x.job_code === jobCode; })[0] || {};
      var pr = S.get("projects", j.project_id) || {};
      return (j.address ? j.address + (j.city ? ", " + j.city : "") : pr.address) || "";
    }
    var vSel = preset.vendor_blank ? "" : (preset.vendor_id || (vOpts[0] && vOpts[0].v));
    var v0 = S.get("vendors", vSel) || {};
    var html = '<div class="form-2">'
      + fld("Vendor (type to search)", typeahead("poV", vOpts, vSel))
      + fld("Job (type to search)", typeahead("poJ", jOpts, initJob))
      + fld("Needed by", inp("poNeed", "date", ""))
      + fld("Terms (from vendor)", inp("poTerms", "text", v0.terms || "NET30"))
      + fld("Cost code", sel("poCc", ccOpts, preset.cost_code || "07460"))
      + fld("Category", sel("poCat", catOpts, "M"))
      + "</div>"
      + fld("Ship to (auto from the job address)", inp("poShip", "text", jobAddr(initJob), "delivery address"))
      + drillH("Line items — auto-filled from route=PO job orders; edit freely")
      + itemsEditor({ id: "poItems", columns: [
          { k: "desc", label: "Description", type: "text", width: "minmax(160px,2.2fr)" },
          { k: "qty", label: "Qty", type: "num", width: "70px" },
          { k: "unit", label: "Unit", type: "text", width: "64px" },
          { k: "unit_cost", label: "Unit cost", type: "num", width: "88px" },
          { k: "amount", label: "Amount", type: "num", width: "96px" },
        ], rows: initRows, totalKeys: ["amount"] })
      + '<p class="subtle">Amount recomputes as qty × unit cost when both are set. The PO total is the line total — it cannot drift from the items.</p>';
    drillForm(K, "New purchase order", html, "Create PO", function () {
      var vSel2 = typeaheadVal("poV");
      if (!vSel2 || !S.get("vendors", vSel2)) { K.toast("Pick a vendor from the list for the PO.", { kind: "warn" }); return; }
      var rows = itemsEditorRows("poItems").filter(function (r) { return r.desc && (Number(r.amount) || 0) > 0; });
      if (!rows.length) { K.toast("At least one line with an amount is required.", { kind: "warn" }); return; }
      var total = r2(rows.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0));
      var job = typeaheadVal("poJ");
      // #3 bug class: count-based sequences collide after deletes / mixed
      // sources and block the SECOND create — always skip to a free ref.
      var seq = S.list("commitments").filter(function (c) { return c.job_code === job; }).length + 1;
      var ref = job + "-" + ("00" + seq).slice(-3);
      while (S.list("commitments").some(function (c2) { return c2.reference_no === ref || c2.id === "PO-" + ref; })) {
        seq++; ref = job + "-" + ("00" + seq).slice(-3);
      }
      S.insert("commitments", { id: "PO-" + ref, commitment_type: "PO", reference_no: ref, job_code: job, vendor_id: vSel2,
        cost_code: V("poCc"), category: V("poCat"), original_value: total, invoiced_to_date: 0, status: "open",
        description: rows[0].desc + (rows.length > 1 ? " (+" + (rows.length - 1) + " more)" : ""),
        lines: rows, needed_by: V("poNeed") || null, ship_to: V("poShip") || null, terms: V("poTerms") || null });
      // #D6: only job orders whose lines were KEPT on the PO flip to "ordered"
      var keptJo = [];
      rows.forEach(function (r) { if (r.jo_ref && keptJo.indexOf(r.jo_ref) < 0) keptJo.push(r.jo_ref); });
      keptJo.forEach(function (id2) { if (S.get("jobOrders", id2)) S.update("jobOrders", id2, { status: "ordered" }, { silent: true }); });
      K.toast("PO " + ref + " · " + rows.length + " lines · " + f.usd(total) + " committed against job " + job + (keptJo.length ? " — " + keptJo.length + " job orders marked ordered." : "."), { title: "PO created", kind: "ok" });
      afterCreate(K, "procurement");
    });
    itemsEditorBind("poItems", function () {
      var st = IE_REG["poItems"], el = document.getElementById("poItems");
      if (!st || !el) return;
      var dirty = false;
      st.rows.forEach(function (r, i) {
        var q = Number(r.qty) || 0, u = Number(r.unit_cost) || 0;
        if (q > 0 && u > 0) {
          var amt = r2(q * u);
          if (Math.abs(amt - (Number(r.amount) || 0)) > 0.004) {
            r.amount = amt; dirty = true;
            var cell = el.querySelector('[data-iek="amount"][data-ier="' + i + '"]');
            if (cell && cell !== document.activeElement) cell.value = amt;
          }
        }
      });
      if (dirty) ieRefreshTotals("poItems");
    });
    typeaheadBind("poV", function (vid) {
      var v2 = S.get("vendors", vid) || {};
      var t2 = document.getElementById("poTerms"); if (t2 && v2.terms) t2.value = v2.terms;
    });
    typeaheadBind("poJ", function (jobCode) {
      var sh = document.getElementById("poShip"); if (sh) sh.value = jobAddr(jobCode);
      if (!(preset.items && preset.items.length) && !preset.description) ieSetRows("poItems", poLinesFromJob(jobCode));
    });
  }
  // Deep vendor form — terms, pay method, TIN, contact, insurance dates (feed
  // complianceDocs so the payment hold logic sees them), prequal score.
  function vendorForm(K) {
    var S = K.store, f = K.fmt;
    drillForm(K, "New vendor", drillH("Identity")
      + '<div class="form-2">'
      + fld("Name", inp("vName", "text", "", "e.g. Chesapeake Gutter Supply"))
      + fld("Type", sel("vType", [{ v: "supplier", l: "Material supplier" }, { v: "subcontractor", l: "Subcontractor" }], "supplier"))
      + fld("Category", inp("vCat", "text", "", "e.g. Gutters / downspouts"))
      + fld("TIN / EIN", inp("vTin", "text", "", "9 digits — masked everywhere after save"))
      + "</div>"
      + drillH("Payment")
      + '<div class="form-2">'
      + fld("Terms", sel("vTerms", ["NET30", "NET15", "NET60", "Pay-when-paid", "Due on receipt"], "NET30"))
      + fld("Pay method", sel("vPay", [{ v: "check", l: "Check" }, { v: "ach", l: "ACH" }, { v: "cc", l: "Credit card" }], "check"))
      + fld("Prequal score (0–100)", inp("vPrequal", "number", "", "e.g. 82"))
      + "</div>"
      + drillH("Contact")
      + '<div class="form-2">'
      + fld("Contact name", inp("vCtName", "text", "", "e.g. Dana Ellis"))
      + fld("Contact email", inp("vCtEmail", "text", "", "orders@vendor.com"))
      + fld("Contact phone", inp("vCtPhone", "text", "", "703-555-0100"))
      + "</div>"
      + drillH("Insurance / compliance — payments HOLD until these are on file")
      + '<div class="form-2">'
      + fld("COI expiry", inp("vCoi", "date", ""))
      + fld("Workers comp expiry", inp("vWc", "date", ""))
      + "</div>",
      "Create vendor", function () {
        if (!V("vName")) { K.toast("Vendor name is required.", { kind: "warn" }); return; }
        var isSub = V("vType") === "subcontractor";
        var rec = S.insert("vendors", { name: V("vName"), is_subcontractor: isSub, terms: V("vTerms"), pay_method: V("vPay"),
          tin: String(V("vTin") || "").replace(/[^0-9]/g, ""), vendor_hold: false, category: V("vCat") || "—",
          prequal_score: VN("vPrequal") || undefined,
          contact: (V("vCtName") || V("vCtEmail") || V("vCtPhone")) ? { name: V("vCtName"), email: V("vCtEmail"), phone: V("vCtPhone") } : undefined });
        var made = [];
        var coi = V("vCoi"), wc = V("vWc");
        S.insert("complianceDocs", coi ? { vendor_id: rec.id, doc_type: "coi", effective_date: TODAY, expires_on: coi, status: coi > TODAY ? "valid" : "expired" } : { vendor_id: rec.id, doc_type: "coi", status: "missing" }, { silent: true });
        made.push("COI " + (coi ? (coi > TODAY ? "valid to " + f.dateShort(coi) : "EXPIRED") : "missing"));
        if (isSub) {
          S.insert("complianceDocs", wc ? { vendor_id: rec.id, doc_type: "workers_comp", effective_date: TODAY, expires_on: wc, status: wc > TODAY ? "valid" : "expired" } : { vendor_id: rec.id, doc_type: "workers_comp", status: "missing" }, { silent: true });
          made.push("WC " + (wc ? (wc > TODAY ? "valid" : "EXPIRED") : "missing"));
        }
        if (V("vTin")) { S.insert("complianceDocs", { vendor_id: rec.id, doc_type: "w9", status: "valid", effective_date: TODAY }, { silent: true }); made.push("W-9 on file"); }
        K.toast(V("vName") + " added — compliance: " + made.join(" · ") + ". Missing/expired docs hold payment automatically.", { title: "Vendor created", kind: "ok" });
        afterCreate(K, "procurement");
      });
  }
  function subcontractForm(K, preset) {
    preset = preset || {};
    var S = K.store, f = K.fmt;
    var subs = S.list("vendors").filter(function (v) { return v.is_subcontractor; });
    if (!subs.length) { K.toast("No subcontractor vendors yet — add one first.", { kind: "warn" }); return; }
    var vOpts = subs.map(function (v) { return { v: v.id, l: v.name }; });
    var jOpts = S.list("jobs").map(function (j) { return { v: j.job_code, l: jobTitleOf(j) + " · " + (j.scope || "") }; });
    drillForm(K, "New subcontract / WO", '<div class="form-2">'
      + fld("Subcontractor (type to search)", typeahead("scV", vOpts, preset.vendor_id || (vOpts[0] && vOpts[0].v)))
      + fld("Job (type to search)", typeahead("scJ", jOpts, preset.job_code || (jOpts[0] && jOpts[0].v)))
      + fld("Value ($)", inp("scAmt", "number", "", "0.00"))
      + fld("Retention %", inp("scRet", "number", 10)) + "</div>"
      + fld("Scope", ta("scScope", "", "scope of work — e.g. siding install lots 1-4"))
      + '<p class="subtle">The WO number is per-job sequential — create as many as the job needs; each drafts a matching commitment. Edit pre-posting from the job ticket; posted WOs change through reversals.</p>',
      "Draft subcontract", function () {
        var amt = VN("scAmt"); if (!amt) { K.toast("Value is required.", { kind: "warn" }); return; }
        var vSel3 = typeaheadVal("scV");
        if (!vSel3 || !S.get("vendors", vSel3)) { K.toast("Pick a subcontractor from the list.", { kind: "warn" }); return; }
        var job = typeaheadVal("scJ");
        if (!job) { K.toast("Pick a job from the list.", { kind: "warn" }); return; }
        // #3: per-job sequence must skip refs already taken (repeat-safe) —
        // count-based seq collided after deletes/mixed sources and blocked #2.
        var seq = S.list("subcontracts").filter(function (s2) { return s2.job_id === job; }).length + 1;
        var ref = job + "-0" + seq;
        while (S.list("subcontracts").some(function (s2) { return s2.subcontract_id === ref; }) || S.list("commitments").some(function (c2) { return c2.reference_no === ref; })) {
          seq++; ref = job + "-0" + seq;
        }
        S.insert("commitments", { id: "SC-" + ref, commitment_type: "Subcontract", reference_no: ref, job_code: job, vendor_id: vSel3, cost_code: "07460", category: "S", original_value: amt, invoiced_to_date: 0, retention_held: 0, status: "pending-post", description: V("scScope") || undefined });
        S.insert("subcontracts", { subcontract_id: ref, vendor_id: vSel3, job_id: job, original_value: amt, current_value: amt, retention_pct: VN("scRet"), billed_to_date: 0, pay_when_paid: true, status: "pending-post", compliance_hold: false, scope: V("scScope") || undefined });
        K.toast("Subcontract " + ref + " · " + f.usd(amt) + " drafted — posts after the compliance check. Create another any time.", { title: "Subcontract drafted", kind: "ok" });
        afterCreate(K, "procurement");
      });
  }
  // ---- commitment lifecycle (print · issue → receive → close · post subcontract) ----
  // the legacy ERP PO numbering: coded job id + "-" + per-job po_id (e.g.
  // "LH-TW-TH-1-4 (MODEL)-S-1"). po_id is stored at creation; legacy commitments
  // derive it from the reference_no sequence.
  function poIdOf(c) {
    if (c.po_id != null) return c.po_id;
    var m = /(\d+)\s*$/.exec(String(c.reference_no || ""));
    return m ? parseInt(m[1], 10) : 1;
  }
  function poNumberOf(K, c) {
    var job = K.store.list("jobs").filter(function (j) { return j.job_code === c.job_code; })[0] || {};
    return (job.job_id || c.job_code || "PO") + "-" + poIdOf(c);
  }
  // Enriched PO line for display/print — stored lines may be the deep
  // the legacy ERP shape {lot, category, material, note, color, qty, unit,
  // unit_cost, amount} or the older {desc, qty, unit, unit_cost, amount}.
  function poLineDesc(l) {
    var bits = [];
    if (l.lot && String(l.lot) !== "BASE") bits.push("Lot " + l.lot);
    bits.push(l.category || l.desc || "—");
    if (l.material) bits.push(l.material);
    if (l.color) bits.push(l.color);
    var out = bits.join(" · ");
    if (l.note) out += " (" + l.note + ")";
    return out;
  }
  function printCommitPo(K, c) {
    var S = K.store, O = window.KeystoneOutput;
    var v = S.get("vendors", c.vendor_id) || {};
    var job = S.list("jobs").filter(function (j) { return j.job_code === c.job_code; })[0] || {};
    var poNo = c.commitment_type === "Subcontract" ? c.reference_no : poNumberOf(K, c);
    var cc = (c.cost_code || "") + (c.category ? "." + c.category : "");
    var lines = (c.lines && c.lines.length) ? c.lines.map(function (l) {
      return { desc: poLineDesc(l), cc: cc, qty: l.qty, uom: l.unit || l.uom || "", unit: l.unit_cost, amount: l.amount };
    }) : [{ desc: c.description || (c.commitment_type === "Subcontract" ? "Subcontract scope of work" : "Materials per estimate"), cc: cc, amount: c.original_value }];
    var shipBits = [];
    if (c.ship_method) shipBits.push(c.ship_method);
    if (c.ship_date) shipBits.push("ship " + c.ship_date);
    if (c.attention) shipBits.push("ATTN " + c.attention);
    O.print("Purchase Order " + poNo, O.docs.po({
      number: poNo, date: c.date || String(c.createdAt || TODAY).slice(0, 10), needed_by: c.needed_by,
      vendor: v.name || c.vendor_id,
      vendor_addr: [v.account_no ? "Account # " + v.account_no : "", v.order_email || "", v.phone || ""].filter(function (x) { return x; }).join(" · "),
      ship_to: (c.ship_to || job.address || c.job_code || "") + (shipBits.length ? " — " + shipBits.join(" · ") : ""),
      job: c.job_code, cost_code: c.cost_code, amount: c.original_value, terms: c.terms || v.terms,
      lines: lines,
    }));
  }
  /* ---- shared child-record ref resolver — milestoneLog.children chips,
   * calendar events and cross-drill links all route through this. */
  function openRefDrill(K, kind, ref) {
    var S = K.store;
    kind = String(kind || "").toLowerCase();
    if (kind === "po" || kind === "commitment") {
      var c = S.get("commitments", ref) || S.list("commitments").filter(function (x) { return x.reference_no === ref; })[0];
      if (c) return drillCommit(K, c);
    } else if (kind === "wo" || kind === "subcontract") {
      var sc2 = S.get("subcontracts", ref) || S.list("subcontracts").filter(function (x) { return x.wo_number === ref || x.subcontract_id === ref; })[0];
      if (sc2) return drillSubcontract(K, sc2);
      var cm2 = S.list("commitments").filter(function (x) { return x.reference_no === ref && x.commitment_type === "Subcontract"; })[0];
      if (cm2) return drillSubcontract(K, cm2);
    } else if (kind === "draw" || kind === "subdraw" || kind === "sub_draw") {
      var d2 = S.get("subDraws", ref);
      if (d2) return drillSubDraw(K, d2);
    } else if (kind === "ar" || kind === "invoice" || kind === "arinvoice") {
      var ar2 = S.get("arInvoices", ref) || S.list("arInvoices").filter(function (x) { return x.invoice_number === ref; })[0];
      if (ar2) return drillArInv(K, ar2);
    } else if (kind === "ap" || kind === "apinvoice" || kind === "voucher") {
      var ap2 = S.get("apInvoices", ref) || S.list("apInvoices").filter(function (x) { return x.invoice_number === ref; })[0];
      if (ap2) return drillApInv(K, ap2);
    } else if (kind === "receipt" || kind === "journal" || kind === "payment") {
      return drillJournal(K, ref);
    } else if (kind === "milestone" || kind === "ms") {
      // ref convention: "<job_code>:<milestone>" (e.g. "26-035:start")
      var mp2 = String(ref).split(":");
      var j4 = S.list("jobs").filter(function (x) { return x.job_code === mp2[0] || x.id === mp2[0]; })[0];
      if (j4) return drillMilestone(K, j4, mp2[1] || "start");
    } else if (kind === "job") {
      var j2 = S.get("jobs", ref) || S.list("jobs").filter(function (x) { return x.job_code === ref; })[0];
      if (j2) { K.closeDrill(); return K.go("projects/" + j2.id); }
    } else if (kind === "document" || kind === "doc") {
      var doc2 = S.get("documents", ref);
      K.toast("Demo file — the document store connects to Drive/SharePoint in production.", { title: (doc2 && (doc2.filename || doc2.title)) || String(ref), kind: "" });
      return;
    }
    K.toast("Linked record " + String(ref) + " (" + kind + ") is not in the store.", { title: "Not found", kind: "warn" });
  }
  // audit-feed renderer shared by every assembled drill (provenance section)
  function auditFeedHtml(K, rows) {
    var f = K.fmt;
    if (!rows || !rows.length) return '<p class="subtle">No audit rows touch this record yet.</p>';
    return rows.map(function (a) {
      return rowLine(chip(a.op, a.op === "create" ? "ok" : a.op === "delete" ? "bad" : "mute")
        + '<span class="subtle" style="flex:1">' + esc((a.actor && a.actor.name) || "system") + " · " + esc(a.summary || (a.op + " " + a.collection)) + "</span>"
        + '<span class="mono subtle" style="margin-left:auto">' + f.ago(a.at) + "</span>");
    }).join("");
  }
  // context strip for any record that resolves a job through K.context
  function ctxStripFor(K, ctx, extra) {
    var job = ctx.job || {}, acct = ctx.customer || {}, site = ctx.site || null, pr = ctx.project || {};
    var pairs = [
      job.id ? { lab: "Job", val: jobTitleOf(job), go: "projects/" + job.id } : null,
      acct.legal_name ? { lab: "Customer", val: custCodeOf(acct) + " — " + acct.legal_name } : null,
      site ? { lab: "Site", val: site.code + " — " + site.name } : null,
    ];
    (extra || []).forEach(function (p) { pairs.push(p); });
    if (job.pm || pr.pm) pairs.push({ lab: "PM", val: job.pm || pr.pm });
    return ctxStrip(pairs.filter(function (p) { return p && p.val; }));
  }
  function postSubcontract(K, c) {
    var S = K.store;
    S.update("commitments", c.id, { status: "open" });
    var sub = S.list("subcontracts").filter(function (s2) { return s2.subcontract_id === c.reference_no; })[0];
    if (sub) S.update("subcontracts", sub.id, { status: "active" });
    // Release any approval that was blocked on this subcontract being posted —
    // the Action Hub's blocked predicate keys off the detail text.
    S.list("approvals", { status: "pending" }).forEach(function (a) {
      if (a.detail && a.detail.indexOf(c.reference_no) >= 0 && /must be posted|Blocked/i.test(a.detail)) {
        S.update("approvals", a.id, { detail: "Subcontract " + c.reference_no + " posted — released for approval." });
      }
    });
    K.toast("Subcontract " + c.reference_no + " posted — commitment active, linked pay-app approval released.", { title: "Subcontract posted", kind: "ok" });
    K.reRender();
  }

  /* ==================================================================== WAVE 5
   * REVERSAL FRAMEWORK — every lifecycle action gets a gated, audited inverse.
   * Doctrine: the ledger is IMMUTABLE — a reversal never deletes activity, it
   * posts a COMPENSATING journal (Dr/Cr swapped), so the trial balance stays
   * balanced by construction. Records are voided/reverted in place with the
   * reason on the row; every reversal writes an op:"reverse"/"void" audit row
   * (Admin → "Reversals & audit" reviews the last 20).
   * All functions here are DOM-free (drills wire the buttons) and exposed on
   * window.KReversals so the workbench's Action Hub can call them. */
  function sessionName(K) {
    var s = null;
    try { s = (K && typeof K.session === "function") ? K.session() : null; } catch (e0) {}
    return (s && s.name) || "user";
  }
  function logReversal(K, op, col, ref, reason, note) {
    var S = K.store;
    try {
      if (typeof S._audit === "function") {
        S._audit(op, col, ref, null, { reason: reason, note: note || "", by: sessionName(K) });
        if (typeof S._persist === "function") S._persist();
      }
    } catch (e1) {}
  }
  // Post the mirror of an existing journal — Dr/Cr swapped line by line. The
  // swap guarantees the compensating entry balances iff the original did.
  function compensateJournal(memo, jid, source, sourceRef) {
    var L = window.KeystoneLedger;
    var rows = (L && typeof L.activity === "function") ? L.activity().filter(function (a) { return a.journal_id === jid; }) : [];
    if (!rows.length) return null;
    return L.postJournal({ memo: memo, source: source, source_ref: sourceRef || jid, date: TODAY,
      lines: rows.map(function (a) {
        return { account: a.account, debit: r2(Number(a.credit) || 0), credit: r2(Number(a.debit) || 0),
          job_code: a.job_code || null, cost_code: a.cost_code || null, category: a.category || null, memo: memo };
      }) });
  }
  function tbNote() {
    var L = window.KeystoneLedger;
    var tb = (L && typeof L.trialBalance === "function") ? L.trialBalance() : { balanced: true };
    return tb.balanced ? "Trial balance stays in balance." : "TRIAL BALANCE OUT OF BALANCE — check the ledger!";
  }
  function rvVoidApproval(K, a0, reason) {
    var S = K.store, L = window.KeystoneLedger;
    var a = S.get("approvals", a0.id) || a0;
    if (!can("approval.void")) return { ok: false, msg: "Your seat is not permitted to void approvals (approval.void)." };
    if (a.status !== "approved") return { ok: false, msg: "Approval is " + a.status + " — only an APPROVED approval can be voided." };
    // Draw releases post their journal as source "sub-draw" keyed by the DRAW
    // id (not the approval id) — resolve the draw so the void can find it (#D1).
    var isDraw = a.workflow === "Sub draw" || /^Release draw/i.test(a.title || "");
    var inv = null, draw = null;
    if (isDraw) {
      draw = a.posted_draw ? S.get("subDraws", a.posted_draw) : null;
      if (!draw) {
        var dm0 = /draw (\S+)/i.exec(a.detail || "");
        draw = dm0 ? S.get("subDraws", dm0[1]) : null;
      }
      if (!draw) draw = S.list("subDraws").filter(function (x) { return x.status === "applied-posted" && (!a.job_code || x.job_code === a.job_code) && Math.abs((Number(x.amount) || 0) - (Number(a.amount) || 0)) < 0.005; })[0] || null;
    } else {
      inv = S.list("apInvoices").filter(function (i) { return i.invoice_number && String(a.title || "").indexOf(i.invoice_number) >= 0; })[0]
        || S.list("apInvoices").filter(function (i) { return a.vendor && i.vendor === a.vendor && Math.abs((Number(i.amount) || 0) - (Number(a.amount) || 0)) < 0.005 && i.status === "approved"; })[0] || null;
      if (inv && inv.status === "paid") return { ok: false, blocked: true, msg: "BLOCKED — " + inv.invoice_number + " is already PAID (executed by " + (inv.executed_by || "unknown") + "). Void the payment first, then the approval." };
    }
    var row = null;
    if (L && typeof L.activity === "function") {
      if (isDraw) {
        if (draw) {
          var drRows = L.activity().filter(function (x) { return x.source === "sub-draw" && x.source_ref === draw.id; });
          row = drRows.length ? drRows[drRows.length - 1] : null;   // latest release post for the draw
        }
      } else {
        row = L.activity().filter(function (x) { return x.source === "ap-approval" && x.source_ref === a.id; })[0] || null;
      }
    }
    var cjid = null;
    if (row) {
      try { cjid = compensateJournal("VOID: " + (row.memo || a.title) + " — " + reason, row.journal_id, "approval-void", a.id); }
      catch (e2) { return { ok: false, msg: "Compensating post failed: " + String((e2 && e2.message) || e2) }; }
    }
    S.update("approvals", a.id, { status: "voided", void_reason: reason, voided_by: sessionName(K), voided_at: new Date().toISOString() });
    if (inv) S.update("apInvoices", inv.id, { status: "pending-approval" });
    // #D4: unwind EXACTLY the commitment counter this approve incremented (the
    // approve stamped posted_commit/posted_amount); floor at 0, never negative.
    if (!isDraw && a.posted_commit) {
      var pc = S.get("commitments", a.posted_commit);
      if (pc) S.update("commitments", pc.id, { invoiced_to_date: Math.max(0, r2((Number(pc.invoiced_to_date) || 0) - (Number(a.posted_amount != null ? a.posted_amount : a.amount) || 0))) });
    }
    // #D2: the released draw reverts to PENDING so the re-queued approval below
    // is what legitimately re-releases it — and its WO counters unwind.
    if (isDraw && draw) {
      var dAmt = Number(draw.amount) || 0;
      S.update("subDraws", draw.id, { status: "pending", approved_by: null, approved_at: null, void_note: "release voided: " + reason });
      if (draw.wo_ref) {
        var sub2 = S.list("subcontracts").filter(function (s2) { return s2.wo_number === draw.wo_ref || s2.subcontract_id === draw.wo_ref; })[0];
        if (sub2) S.update("subcontracts", sub2.id, { billed_to_date: Math.max(0, r2((Number(sub2.billed_to_date) || 0) - dAmt)) }, { silent: true });
        var cm3 = S.list("commitments").filter(function (c) { return c.reference_no === draw.wo_ref && c.commitment_type === "Subcontract"; })[0];
        if (cm3) S.update("commitments", cm3.id, { invoiced_to_date: Math.max(0, r2((Number(cm3.invoiced_to_date) || 0) - dAmt)) }, { silent: true });
      }
    }
    // #12: the record reverts to a state that EXPECTS a queue entry — insert a
    // FRESH pending approval (new id) so it reappears in the Action Hub.
    var requeue = { title: a.title, tier: a.tier || "money", amount: a.amount, status: "pending",
      vendor: a.vendor || null, job_code: a.job_code || null, workflow: a.workflow || "Re-queued approval",
      createdBy: sessionName(K), requeued_from: a.id,
      detail: (a.detail ? a.detail + " · " : "") + "re-queued after void: " + reason };
    var fresh = S.insert("approvals", requeue);
    logReversal(K, "void", "approvals", a.id, reason, "void approval — " + (a.title || a.id) + " (re-queued as " + fresh.id + ")");
    return { ok: true, msg: "Approval voided. " + (cjid ? "Compensating journal " + cjid + " posted (Dr/Cr of the original swapped). " : "No posted journal was found for it — status void only. ")
      + (inv ? inv.invoice_number + " reverted to pending-approval. " : "")
      + (draw ? "Draw " + draw.id + " reverted to PENDING" + (draw.wo_ref ? " — WO " + draw.wo_ref + " billed/invoiced counters unwound" : "") + ". " : "")
      + "A fresh approval is back in the Action Hub queue. " + tbNote() };
  }
  function rvVoidPayment(K, r0, reason) {
    var S = K.store, L = window.KeystoneLedger;
    var r = S.get("apInvoices", r0.id) || r0;
    if (!can("payment.void")) return { ok: false, msg: "Your seat is not permitted to void executed payments (payment.void — command only)." };
    if (r.status !== "paid") return { ok: false, msg: r.invoice_number + " is " + r.status + " — only an EXECUTED (paid) payment can be un-confirmed." };
    try {
      L.postJournal({ memo: "VOID payment — " + r.vendor + " " + r.invoice_number + " — " + reason, source: "payment-void", source_ref: r.id, date: TODAY,
        lines: [{ account: "1000", debit: r2(r.amount), memo: "Cash restored — VOID " + r.invoice_number },
                { account: "2000", credit: r2(r.amount), memo: "AP reinstated — " + r.vendor }] });
    } catch (e3) { return { ok: false, msg: "Compensating post failed: " + String((e3 && e3.message) || e3) }; }
    S.update("apInvoices", r.id, { status: "approved", executed_by: null, executed_at: null, payment_void_reason: reason });
    logReversal(K, "void", "apInvoices", r.id, reason, "void executed payment — " + r.invoice_number + " (" + r.vendor + ")");
    return { ok: true, msg: "Payment un-confirmed — Dr 1000 Cash / Cr 2000 AP posted (reverse of the execution), " + r.invoice_number + " back to APPROVED, executed-by cleared. The printed check " + (r.check_no ? r.check_no + " " : "") + "stays on the record. " + tbNote() };
  }
  function rvVoidArReceipt(K, r0, journalId, reason) {
    var S = K.store, L = window.KeystoneLedger;
    var r = S.get("arInvoices", r0.id) || r0;
    if (!can("payment.void")) return { ok: false, msg: "Your seat is not permitted to void cash receipts (payment.void)." };
    var rows = L.activity().filter(function (x) { return x.journal_id === journalId; });
    if (!rows.length) return { ok: false, msg: "Receipt journal " + String(journalId) + " has no activity rows." };
    if (rows[0].source !== "ar-receipt") return { ok: false, msg: String(journalId) + " is not an AR receipt journal (source: " + (rows[0].source || "—") + ")." };
    if (L.activity().some(function (x) { return x.source === "ar-receipt-void" && x.source_ref === journalId; })) return { ok: false, msg: "Receipt " + String(journalId) + " was already voided." };
    var amt = r2(rows.reduce(function (s, x) { return s + (Number(x.debit) || 0); }, 0));
    try { compensateJournal("VOID: " + (rows[0].memo || "receipt") + " — " + reason, journalId, "ar-receipt-void", journalId); }
    catch (e4) { return { ok: false, msg: "Compensating post failed: " + String((e4 && e4.message) || e4) }; }
    S.update("arInvoices", r.id, { balance: r2((Number(r.balance) || 0) + amt), status: "open", receipt_void_reason: reason });
    logReversal(K, "void", "arInvoices", r.id, reason, "void receipt " + journalId + " on " + r.invoice_number);
    return { ok: true, msg: "Receipt voided — compensating journal posted (cash reversed), " + r.invoice_number + " balance restored by " + amt.toFixed(2) + " and reopened. " + tbNote() };
  }
  function rvVoidArInvoice(K, r0, reason) {
    var S = K.store, L = window.KeystoneLedger;
    var r = S.get("arInvoices", r0.id) || r0;
    if (!can("approval.void")) return { ok: false, msg: "Your seat is not permitted to void AR invoices (approval.void)." };
    if (r.status === "voided") return { ok: false, msg: r.invoice_number + " is already voided." };
    var rcpts = L.activity().filter(function (x) { return x.source === "ar-receipt" && x.account === "1200" && (x.memo || "").indexOf(r.invoice_number) >= 0; });
    var live = rcpts.filter(function (x) { return !L.activity().some(function (y) { return y.source === "ar-receipt-void" && y.source_ref === x.journal_id; }); });
    if (live.length) return { ok: false, blocked: true, msg: "BLOCKED — " + live.length + " receipt(s) are applied to " + r.invoice_number + ". Void the receipt(s) first." };
    var post = L.activity().filter(function (x) { return (x.source === "ar" || x.source === "ar-invoice") && x.account === "1200" && x.debit && (x.memo || "").indexOf(r.invoice_number) >= 0; })[0];
    var cjid = null;
    if (post) {
      try { cjid = compensateJournal("VOID: " + r.invoice_number + " — " + reason, post.journal_id, "ar-void", r.id); }
      catch (e5) { return { ok: false, msg: "Compensating post failed: " + String((e5 && e5.message) || e5) }; }
    }
    S.update("arInvoices", r.id, { status: "voided", balance: 0, void_reason: reason, voided_by: sessionName(K), voided_at: new Date().toISOString() });
    logReversal(K, "void", "arInvoices", r.id, reason, "void AR invoice " + r.invoice_number);
    return { ok: true, msg: r.invoice_number + " voided. " + (cjid ? "Compensating journal " + cjid + " posted — revenue and A/R reversed. " : "It was never posted to the ledger — status void only. ") + tbNote() };
  }
  function rvUnissuePo(K, c0, reason) {
    var S = K.store;
    var c = S.get("commitments", c0.id) || c0;
    if (!can("po.unissue")) return { ok: false, msg: "Your seat is not permitted to un-issue POs (po.unissue)." };
    if (c.status !== "issued") {
      var extra = "";
      if (c.status === "received") {
        var grLive0 = S.list("goodsReceipts", { commitment_id: c.id }).filter(function (g0) { return !g0.voided_at; });
        extra = " " + (grLive0.length || 1) + " goods receipt(s) on file — void them first; the PO then reverts to ISSUED and can be un-issued.";
      }
      return { ok: false, msg: "PO " + c.reference_no + " is " + c.status + " — only an ISSUED PO can be un-issued." + extra };
    }
    var blockers = [];
    var liveGr = S.list("goodsReceipts", { commitment_id: c.id }).filter(function (g) { return !g.voided_at; });
    if (liveGr.length) blockers.push(liveGr.length + " goods receipt(s) on file — void them first");
    var aps = S.list("apInvoices").filter(function (i) { return i.po_ref === c.reference_no; });
    if (aps.length) blockers.push("AP invoice(s) " + aps.map(function (i) { return i.invoice_number; }).join(", ") + " reference this PO");
    if (blockers.length) return { ok: false, blocked: true, msg: "BLOCKED — " + blockers.join(" · ") + "." };
    S.update("commitments", c.id, { status: "open", unissue_reason: reason });
    logReversal(K, "reverse", "commitments", c.id, reason, "un-issue PO " + c.reference_no);
    return { ok: true, msg: "PO " + c.reference_no + " un-issued — status ISSUED → OPEN. The vendor copy is void; re-issue when ready." };
  }
  function rvVoidGoodsReceipt(K, g0, reason) {
    var S = K.store;
    var g = S.get("goodsReceipts", g0.id) || g0;
    if (!can("po.unreceive")) return { ok: false, msg: "Your seat is not permitted to void goods receipts (po.unreceive)." };
    if (g.voided_at) return { ok: false, msg: "This receipt is already voided (" + (g.void_reason || "no reason recorded") + ")." };
    S.update("goodsReceipts", g.id, { voided_at: new Date().toISOString(), voided_by: sessionName(K), void_reason: reason });
    var c = S.get("commitments", g.commitment_id);
    var reverted = false;
    if (c) {
      var live = S.list("goodsReceipts", { commitment_id: c.id }).filter(function (x) { return !x.voided_at; });
      if (!live.length && c.status === "received") { S.update("commitments", c.id, { status: "issued" }); reverted = true; }
    }
    // #D3: a delivery milestone whose provenance points at THIS PO must not stay
    // flagged when the last live goods receipt behind it is voided — clear the
    // flag (target date survives) via the reusable KMilestones.unflag inverse.
    var msCleared = false;
    if (c && c.job_code && window.KMilestones && typeof window.KMilestones.unflag === "function") {
      var dlogs = S.list("milestoneLog").filter(function (x) { return x.job_code === c.job_code && x.milestone === "delivery"; })
        .sort(function (x, y) { return String(x.at || "").localeCompare(String(y.at || "")); });
      var lastLog = dlogs.length ? dlogs[dlogs.length - 1] : null;
      var pointsHere = !!(lastLog && (lastLog.children || []).some(function (ch) { return ch && (ch.ref === c.reference_no || ch.ref === c.id || ch.ref === g.id); }));
      if (pointsHere) {
        var jobCommitIds = {};
        S.list("commitments").forEach(function (cm) { if (cm.job_code === c.job_code) jobCommitIds[cm.id] = true; });
        var otherLive = S.list("goodsReceipts").filter(function (x) { return !x.voided_at && jobCommitIds[x.commitment_id]; });
        if (!otherLive.length) msCleared = !!window.KMilestones.unflag(K, c.job_code, "delivery", "provenance voided — flag cleared");
      }
    }
    logReversal(K, "void", "goodsReceipts", g.id, reason, "void goods receipt on " + ((c && c.reference_no) || g.commitment_id));
    return { ok: true, msg: "Goods receipt voided — the row stays on the record marked VOIDED with your reason. The AP 3-way match no longer counts it" + (reverted ? "; PO " + c.reference_no + " reverted RECEIVED → ISSUED." : ".")
      + (msCleared ? " Delivery milestone flag cleared — this was the only live goods receipt behind it (target date kept)." : "") };
  }
  function rvReopenPo(K, c0, reason) {
    var S = K.store;
    var c = S.get("commitments", c0.id) || c0;
    if (!can("po.reopen")) return { ok: false, msg: "Your seat is not permitted to re-open POs (po.reopen)." };
    if (c.status !== "closed") return { ok: false, msg: "PO " + c.reference_no + " is " + c.status + " — only a CLOSED PO can be re-opened." };
    var live = S.list("goodsReceipts", { commitment_id: c.id }).filter(function (g) { return !g.voided_at; });
    var prior = c.status_prior || (live.length ? "received" : "issued");
    S.update("commitments", c.id, { status: prior, status_prior: null, reopen_reason: reason });
    logReversal(K, "reverse", "commitments", c.id, reason, "re-open PO " + c.reference_no + " → " + prior);
    return { ok: true, msg: "PO " + c.reference_no + " re-opened — status CLOSED → " + prior.toUpperCase() + " (its state before closing)." };
  }
  function rvUnpostSubcontract(K, c0, reason) {
    var S = K.store;
    var c = S.get("commitments", c0.id) || c0;
    if (!can("sc.unpost")) return { ok: false, msg: "Your seat is not permitted to un-post subcontracts (sc.unpost)." };
    if (c.commitment_type !== "Subcontract") return { ok: false, msg: c.reference_no + " is not a subcontract commitment." };
    if (c.status !== "open") return { ok: false, msg: "Subcontract " + c.reference_no + " is " + c.status + " — only a POSTED (open) subcontract can be un-posted." };
    var sub = S.list("subcontracts").filter(function (s2) { return s2.subcontract_id === c.reference_no; })[0] || null;
    var blockers = [];
    var billed = Number((sub && sub.billed_to_date) || c.invoiced_to_date) || 0;
    if (billed > 0) blockers.push(billed.toFixed(2) + " already billed against it");
    var apprApproved = S.list("approvals").filter(function (a) { return a.status === "approved" && ((a.title || "").indexOf(c.reference_no) >= 0 || (a.detail || "").indexOf(c.reference_no) >= 0); });
    if (apprApproved.length) blockers.push("approval “" + apprApproved[0].title + "” already APPROVED (void it first)");
    if (blockers.length) return { ok: false, blocked: true, msg: "BLOCKED — " + blockers.join(" · ") + "." };
    S.update("commitments", c.id, { status: "pending-post", unpost_reason: reason });
    if (sub) S.update("subcontracts", sub.id, { status: "pending-post" });
    var reblocked = 0;
    S.list("approvals", { status: "pending" }).forEach(function (a) {
      if (((a.title || "").indexOf(c.reference_no) >= 0 || (a.detail || "").indexOf(c.reference_no) >= 0)) {
        S.update("approvals", a.id, { detail: "Blocked: subcontract " + c.reference_no + " must be posted first." });
        reblocked++;
      }
    });
    logReversal(K, "reverse", "commitments", c.id, reason, "un-post subcontract " + c.reference_no);
    return { ok: true, msg: "Subcontract " + c.reference_no + " un-posted — commitment and WO back to PENDING-POST" + (reblocked ? "; " + reblocked + " linked approval(s) re-blocked until it posts again." : ".") };
  }
  // #4a: cancel an open/issued PO that has zero receipts and zero AP against
  // it. Cancelled POs stay on the record struck-through and NEVER count in
  // committed-cost roll-ups. Genuinely-draft POs delete outright instead.
  function rvCancelPo(K, c0, reason) {
    var S = K.store;
    var c = S.get("commitments", c0.id) || c0;
    if (!(can("po.reopen") || can("record.delete"))) return { ok: false, msg: "Your seat is not permitted to cancel POs (po.reopen / record.delete)." };
    if (c.commitment_type === "Subcontract") return { ok: false, msg: c.reference_no + " is a subcontract — use un-post, not PO cancel." };
    if (["open", "issued"].indexOf(c.status) < 0) return { ok: false, msg: "PO " + c.reference_no + " is " + c.status + " — only an OPEN or ISSUED PO cancels (drafts delete; received POs reverse)." };
    var liveGr = S.list("goodsReceipts", { commitment_id: c.id }).filter(function (g) { return !g.voided_at; });
    if (liveGr.length) return { ok: false, blocked: true, msg: "BLOCKED — " + liveGr.length + " goods receipt(s) on file. Void the receipt(s) first; a received PO never silently cancels." };
    var aps = S.list("apInvoices").filter(function (i) { return i.po_ref === c.reference_no && ["voided", "withdrawn"].indexOf(i.status) < 0; });
    if (aps.length) return { ok: false, blocked: true, msg: "BLOCKED — AP invoice(s) " + aps.map(function (i) { return i.invoice_number; }).join(", ") + " bill against this PO. Resolve those first." };
    S.update("commitments", c.id, { status: "cancelled", cancel_reason: reason, cancelled_by: sessionName(K), cancelled_at: new Date().toISOString() });
    logReversal(K, "void", "commitments", c.id, reason, "cancel PO " + c.reference_no);
    return { ok: true, msg: "PO " + c.reference_no + " cancelled — dropped from committed cost, shown struck-through with your reason on the record." };
  }
  function rvDeleteDraftPo(K, c0, reason) {
    var S = K.store;
    var c = S.get("commitments", c0.id) || c0;
    if (!can("record.delete")) return { ok: false, msg: "Your seat is not permitted to delete records (record.delete)." };
    if (c.status !== "draft") return { ok: false, msg: "PO " + c.reference_no + " is " + c.status + " — only a genuinely-DRAFT PO deletes. Open/issued POs cancel instead." };
    S.remove("commitments", c.id);
    logReversal(K, "void", "commitments", c.id, reason || "draft discarded", "delete draft PO " + c.reference_no);
    return { ok: true, msg: "Draft PO " + c.reference_no + " deleted — it never committed cost, so nothing to compensate." };
  }
  function rvUndoConversion(K, o0, reason) {
    var S = K.store, L = window.KeystoneLedger;
    var opp = S.get("opportunities", o0.id) || o0;
    if (!can("conversion.undo")) return { ok: false, msg: "Your seat is not permitted to undo bid conversions (conversion.undo)." };
    if (opp.stage !== "won" || !opp.won_job) return { ok: false, msg: "Bid " + opp.id + " is not a converted (won) bid." };
    var job = S.list("jobs").filter(function (j) { return j.job_code === opp.won_job || j.id === opp.won_job; })[0];
    if (!job) {
      S.update("opportunities", opp.id, { stage: "submitted", probability: BID_PROB.submitted, won_job: null, unconverted_at: new Date().toISOString(), unconvert_reason: reason });
      logReversal(K, "reverse", "opportunities", opp.id, reason, "un-convert bid " + opp.id + " — job " + opp.won_job + " already gone; bid reverted");
      return { ok: true, msg: "Job " + opp.won_job + " was not in the store — the bid itself was reverted to SUBMITTED." };
    }
    var fam = familyCodesOf(K, job);
    function inFam(code) { return fam.indexOf(code) >= 0; }
    var blockers = [];
    var led = (L && typeof L.activity === "function") ? L.activity().filter(function (a) { return inFam(a.job_code); }) : [];
    if (led.length) blockers.push(led.length + " ledger row(s) posted against the job family");
    var hardCommits = S.list("commitments").filter(function (c) { return inFam(c.job_code) && c.status !== "draft"; });
    if (hardCommits.length) blockers.push("non-draft commitment(s) " + hardCommits.map(function (c) { return c.reference_no; }).join(", "));
    var hardSubs = S.list("subcontracts").filter(function (s2) { return inFam(s2.job_id) && s2.status !== "draft"; });
    if (hardSubs.length) blockers.push("non-draft subcontract(s) " + hardSubs.map(function (s2) { return s2.subcontract_id; }).join(", "));
    var aps = S.list("apInvoices").filter(function (i) { return inFam(i.job_id); });
    if (aps.length) blockers.push(aps.length + " AP invoice(s)");
    var ars = S.list("arInvoices").filter(function (i) { return inFam(i.job_id); });
    if (ars.length) blockers.push(ars.length + " AR invoice(s)");
    var tcs = S.list("fieldTimeEntries").filter(function (t) { return inFam(t.job_id); });
    if (tcs.length) blockers.push(tcs.length + " field timecard(s)");
    if (blockers.length) return { ok: false, blocked: true, msg: "BLOCKED — " + blockers.join(" · ") + " reference the " + job.job_code + " family. Reverse those first; un-convert never orphans money or time." };
    var n = { jobs: 0, orders: 0, pos: 0, subs: 0, budget: 0, tasks: 0 };
    S.list("jobOrders").filter(function (o) { return inFam(o.job_code); }).forEach(function (o) { S.remove("jobOrders", o.id, { silent: true }); n.orders++; });
    S.list("commitments").filter(function (c) { return inFam(c.job_code); }).forEach(function (c) { S.remove("commitments", c.id, { silent: true }); n.pos++; });
    S.list("subcontracts").filter(function (s2) { return inFam(s2.job_id); }).forEach(function (s2) { S.remove("subcontracts", s2.id, { silent: true }); n.subs++; });
    S.list("budgetLines").filter(function (b) { return inFam(b.job_code); }).forEach(function (b) { S.remove("budgetLines", b.id, { silent: true }); n.budget++; });
    S.list("tasks").filter(function (t) { return t.job_code && inFam(t.job_code) && t.status !== "done"; }).forEach(function (t) { S.remove("tasks", t.id, { silent: true }); n.tasks++; });
    descendantJobsOf(K, job.job_code).forEach(function (j) { S.remove("jobs", j.id, { silent: true }); n.jobs++; });
    S.remove("jobs", job.id, { silent: true }); n.jobs++;
    var prj = job.project_id ? S.get("projects", job.project_id) : null;
    var prjGone = false;
    if (prj && !S.list("jobs", { project_id: prj.id }).length) { S.remove("projects", prj.id, { silent: true }); prjGone = true; }
    S.update("opportunities", opp.id, { stage: "submitted", probability: BID_PROB.submitted, won_job: null, unconverted_at: new Date().toISOString(), unconvert_reason: reason });
    logReversal(K, "reverse", "opportunities", opp.id, reason, "un-convert bid " + opp.id + " — removed job " + job.job_code + " family");
    return { ok: true, msg: "Un-converted " + opp.id + " — removed " + n.jobs + " job(s), " + n.orders + " job order(s), " + n.pos + " draft PO(s), " + n.subs + " draft subcontract(s), " + n.budget + " budget line(s), " + n.tasks + " open task(s)" + (prjGone ? ", and the empty project" : "") + ". Bid returned to SUBMITTED at " + BID_PROB.submitted + "%. Nothing was posted to the ledger, so nothing to compensate." };
  }
  window.KReversals = {
    can: can,
    cancelPo: rvCancelPo,
    deleteDraftPo: rvDeleteDraftPo,
    voidApproval: rvVoidApproval,
    voidPayment: rvVoidPayment,
    voidArReceipt: rvVoidArReceipt,
    voidArInvoice: rvVoidArInvoice,
    unissuePo: rvUnissuePo,
    voidGoodsReceipt: rvVoidGoodsReceipt,
    reopenPo: rvReopenPo,
    unpostSubcontract: rvUnpostSubcontract,
    undoConversion: rvUndoConversion,
  };
  /* shared inline reason UI — every reversal requires a written reason */
  function revControl(id, label, ph) {
    return '<button class="btn danger sm" id="' + id + 'Btn">' + esc(label) + "</button>"
      + '<div id="' + id + 'Wrap" class="hidden" style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%">'
      + '<input class="in" id="' + id + 'Reason" placeholder="' + esc(ph || "Reason (required — goes on the audit record)") + '" style="flex:1;min-width:220px" />'
      + '<button class="btn danger sm" id="' + id + 'Go">Confirm — ' + esc(label) + "</button></div>";
  }
  function bindRev(K, id, fn) {
    bindClick(id + "Btn", function () { var w = document.getElementById(id + "Wrap"); if (w) w.classList.toggle("hidden"); });
    bindClick(id + "Go", function () {
      var reason = V(id + "Reason");
      if (!reason) { K.toast("A reason is required — it goes on the audit record.", { kind: "warn" }); return; }
      fn(reason);
    });
  }
  function revToast(K, res, title) {
    K.toast(res.msg, { title: title || (res.ok ? "Reversed" : (res.blocked ? "Blocked" : "Not reversed")), kind: res.ok ? "ok" : (res.blocked ? "bad" : "warn"), ms: 7000 });
  }

  /* ---- window.KJobPackage — bid → job package assembler (CMiC bid-items) --
   * fromBid(K, opp, jobCode): budget lines from every estimate line; when the
   * lines carry route tags (WH/CP/PO/WO), also job orders, ONE draft PO
   * commitment per PO group (vendor blank — assigned at activation) and a
   * draft subcontract from the labor lines. Untagged lines fall back:
   * labor/install/crew → WO, everything else → PO. Returns counts so the
   * caller can toast honestly; routed:false = estimate had no route tags. */
  window.KJobPackage = {
    fromBid: function (K, opp, jobCode) {
      var S = K.store;
      var out = { orders: 0, pos: 0, subs: 0, budget: 0, routed: false, estimate: null };
      if (!S || !opp || !jobCode) return out;
      var est = S.list("bidEstimates", { opportunity_id: opp.id }).sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0] || null;
      if (!est || !(est.lines || []).length) return out;
      out.estimate = est.id;
      var lines = est.lines;
      out.routed = lines.some(function (l) { return !!l.route; });
      function routeOf(l) {
        if (l.route) return l.route;
        var t = String(l.item || "").toLowerCase();
        return (/labor|install|crew/.test(t)) ? "WO" : "PO";
      }
      // The estimate line's `category` is the the legacy ERP merchandising category
      // ("SHINGLES", "UNDERLAYMENT") — the ACCOUNTING category (M/L/E/S) derives
      // from it only when it already is one, else from the route.
      function acctCatOf(l) {
        if (l.category === "M" || l.category === "L" || l.category === "E" || l.category === "S") return l.category;
        return routeOf(l) === "WO" ? "L" : "M";
      }
      function merchCatOf(l) {
        if (l.category && !(l.category === "M" || l.category === "L" || l.category === "E" || l.category === "S")) return l.category;
        return l.item;
      }
      // 1) budget — one line per estimate line, M/L/E/S category derived
      lines.forEach(function (l) {
        S.insert("budgetLines", { job_code: jobCode, cost_code: l.cost_code || "07460", category: acctCatOf(l),
          description: l.item, original_cost: r2(l.total), current_cost: r2(l.total), spent: 0, source: "bid:" + est.id }, { silent: true });
        out.budget++;
      });
      if (!out.routed) return out;   // no itemized routes — budget only (honest partial)
      // 2) job orders — WH/CP/PO lines become itemized ticket detail
      var poGroups = {}, poOrder = [];
      lines.forEach(function (l) {
        var rt = routeOf(l);
        if (rt === "WO") return;
        S.insert("jobOrders", { job_code: jobCode, lot: "BASE", route: rt, category: merchCatOf(l),
          material: l.material || "", color: l.color || "", qty: l.qty == null ? null : Number(l.qty), unit: l.uom || "",
          status: "planned", source: "bid:" + est.id }, { silent: true });
        out.orders++;
        if (rt === "PO") {
          var g = String(l.po_group || "1");
          if (!poGroups[g]) { poGroups[g] = []; poOrder.push(g); }
          poGroups[g].push(l);
        }
      });
      // 3) ONE draft PO commitment per PO-route group — vendor assigned at activation
      poOrder.forEach(function (g) {
        var gl = poGroups[g];
        var total = r2(gl.reduce(function (s, l) { return s + (Number(l.total) || 0); }, 0));
        var seq = S.list("commitments").filter(function (c) { return c.job_code === jobCode; }).length + 1;
        var ref = jobCode + "-" + ("00" + seq).slice(-3);
        S.insert("commitments", { id: "PO-" + ref, commitment_type: "PO", reference_no: ref, job_code: jobCode,
          vendor_id: "", cost_code: gl[0].cost_code || "07460", category: acctCatOf(gl[0]),
          original_value: total, invoiced_to_date: 0, status: "draft", source: "bid:" + est.id,
          description: gl[0].item + (gl.length > 1 ? " (+" + (gl.length - 1) + " more)" : ""),
          lines: gl.map(function (l) { return { lot: "BASE", category: merchCatOf(l), material: l.material || "", color: l.color || "", qty: l.qty, unit: l.uom || "", unit_cost: l.unit_cost, amount: r2(l.total) }; }) }, { silent: true });
        out.pos++;
      });
      // 4) draft subcontract from the labor (WO) lines
      var wo = lines.filter(function (l) { return routeOf(l) === "WO"; });
      if (wo.length) {
        var amt = r2(wo.reduce(function (s, l) { return s + (Number(l.total) || 0); }, 0));
        var seq2 = S.list("subcontracts").filter(function (s2) { return s2.job_id === jobCode; }).length + 1;
        var ref2 = jobCode + "-0" + seq2;
        S.insert("subcontracts", { subcontract_id: ref2, vendor_id: "", job_id: jobCode, original_value: amt,
          current_value: amt, retention_pct: 0, billed_to_date: 0, pay_when_paid: true, status: "draft",
          compliance_hold: false, scope: wo.map(function (l) { return l.item; }).join(" · "), source: "bid:" + est.id }, { silent: true });
        out.subs++;
      }
      return out;
    },
  };
  // Activate a draft (from-bid) commitment or subcontract — assign the vendor,
  // then the normal lifecycle takes over (PO → open, subcontract → pending-post).
  function activateDraftCommit(K, c) {
    var S = K.store, f = K.fmt;
    var vOpts = [{ v: "", l: "— select vendor —" }].concat(S.list("vendors").filter(function (v) { return !v.is_subcontractor; }).map(function (v) { return { v: v.id, l: v.name }; }));
    drillForm(K, "Activate draft PO " + c.reference_no, fld("Vendor", sel("adcV", vOpts, ""))
      + '<p class="subtle">This PO came from the won bid’s estimate with no vendor. Assigning a vendor activates it (status OPEN) — then issue → receive → match as normal.</p>',
      "Activate PO", function () {
        var v = V("adcV"); if (!v) { K.toast("Pick a vendor to activate the PO.", { kind: "warn" }); return; }
        S.update("commitments", c.id, { vendor_id: v, status: "open" });
        K.toast("PO " + c.reference_no + " activated — vendor assigned, status DRAFT → OPEN (" + f.usd(c.original_value) + " now committed).", { title: "Draft PO activated", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  function activateDraftSub(K, sub) {
    var S = K.store, f = K.fmt;
    var vOpts = [{ v: "", l: "— select subcontractor —" }].concat(S.list("vendors").filter(function (v) { return v.is_subcontractor; }).map(function (v) { return { v: v.id, l: v.name }; }));
    drillForm(K, "Activate draft subcontract " + sub.subcontract_id, fld("Subcontractor", sel("adsV", vOpts, ""))
      + '<p class="subtle">This subcontract came from the won bid’s labor lines with no contractor. Assigning one moves it to PENDING-POST — post it from Procurement to release linked pay-apps.</p>',
      "Activate subcontract", function () {
        var v = V("adsV"); if (!v) { K.toast("Pick a subcontractor to activate.", { kind: "warn" }); return; }
        S.update("subcontracts", sub.id, { vendor_id: v, status: "pending-post" });
        var cm = S.list("commitments").filter(function (x) { return x.reference_no === sub.subcontract_id && x.commitment_type === "Subcontract"; })[0];
        if (cm) S.update("commitments", cm.id, { vendor_id: v, status: "pending-post" });
        else S.insert("commitments", { id: "SC-" + sub.subcontract_id, commitment_type: "Subcontract", reference_no: sub.subcontract_id, job_code: sub.job_id, vendor_id: v, cost_code: "07460", category: "S", original_value: sub.original_value, invoiced_to_date: 0, retention_held: 0, status: "pending-post", source: sub.source || null });
        K.toast("Subcontract " + sub.subcontract_id + " activated — contractor assigned, status DRAFT → PENDING-POST (" + f.usd(sub.original_value) + "). Post it to make it active.", { title: "Draft subcontract activated", kind: "ok" });
        K.closeDrill(); K.reRender();
      });
  }
  /* ---- PO DRILL — the the legacy ERP PO view, surpassed --------------------- *
   * Full assembled graph: parent-context strip · header (PO# = coded job id +
   * po_id, lifecycle, ship/attention) · vendor block · itemized lot/color
   * lines · financial state (invoiced, balance, GR, linked AP) · provenance. */
  function drillCommit(K, c0) {
    var S = K.store, f = K.fmt;
    var c = S.get("commitments", c0.id) || c0;
    if (c.commitment_type === "Subcontract") return drillSubcontract(K, c);
    var ctx = kContext("commitments", c);
    var v = ctx.vendor || S.get("vendors", c.vendor_id) || {};
    var job = ctx.job || {};
    var grs = S.list("goodsReceipts", { commitment_id: c.id });
    var snap = c.job_snapshot || {};
    var model = snap.model || job.model || null;
    var optsList = snap.options || job.options || null;
    var optsTxt = optsList ? (Object.prototype.toString.call(optsList) === "[object Array]" ? optsList.join(" · ") : String(optsList)) : null;
    var poNo = poNumberOf(K, c);
    var invoiced = Number(c.invoiced_to_date) || 0;
    var balance = r2((Number(c.original_value) || 0) - invoiced);
    // (a) parent-context strip — the order is self-explanatory, like the legacy ERP
    var html = ctxStripFor(K, ctx, [
      model ? { lab: "Model", val: model } : null,
      optsTxt ? { lab: "Options", val: optsTxt } : null,
    ]);
    // (b) header
    html += '<div class="kv">'
      + '<div class="k">PO #</div><div class="v mono"><b>' + esc(poNo) + "</b></div>"
      + '<div class="k">PO ID</div><div class="v mono">' + esc(String(poIdOf(c))) + ' <span class="subtle">(per-job sequence)</span></div>'
      + '<div class="k">Status</div><div class="v">' + statusChip(c.status) + "</div>"
      + '<div class="k">Date</div><div class="v">' + f.date(c.date || String(c.createdAt || "").slice(0, 10)) + "</div>"
      + '<div class="k">Needed by</div><div class="v" id="cmNeedVal">' + (c.needed_by ? f.date(c.needed_by) : '<span class="subtle">—</span>') + "</div>"
      // the legacy ERP renders a garbage 11/30/-0001 for an unset ship date — ours never does
      + '<div class="k">Ship</div><div class="v">' + (c.ship_method ? chip(c.ship_method, c.ship_method === "PICKUP" ? "warn" : "info") : '<span class="subtle">—</span>') + (c.ship_date ? ' <span class="mono">' + f.dateShort(c.ship_date) + "</span>" : "") + (c.attention ? ' <span class="subtle">ATTN ' + esc(c.attention) + "</span>" : "") + "</div>"
      + '<div class="k">Terms</div><div class="v">' + esc(c.terms || v.terms || "—") + "</div>"
      + '<div class="k">Cost code</div><div class="v mono">' + esc((c.cost_code || "—") + (c.category ? "." + c.category : "")) + "</div>"
      + "</div>";
    // (c) VENDOR block — order email stays honestly blank when the legacy ERP has none
    html += drillH("Vendor");
    html += '<div class="kv">'
      + '<div class="k">Name</div><div class="v"><span class="act" id="cmVLink" style="cursor:pointer">' + esc(v.name || c.vendor_id || "—") + " →</span></div>"
      + '<div class="k">Account #</div><div class="v mono">' + esc(v.account_no || "—") + "</div>"
      + '<div class="k">Order email</div><div class="v">' + (v.order_email ? '<span class="mono">' + esc(v.order_email) + "</span>" : '<span class="subtle">—</span>') + "</div>"
      + (v.other_email ? '<div class="k">Other email</div><div class="v mono">' + esc(v.other_email) + "</div>" : "")
      + '<div class="k">Phone</div><div class="v mono">' + esc(v.phone || (v.contact && v.contact.phone) || "—") + "</div>"
      + (v.note ? '<div class="k">Note</div><div class="v">' + esc(v.note) + "</div>" : "")
      + "</div>";
    // (d) LINES — lot-tagged, per-color, like the 31-line the legacy ERP order
    var lines = (c.lines && c.lines.length) ? c.lines : [{ lot: "", category: c.description || "Materials per estimate", material: "", note: "", color: "", qty: 1, unit: "", unit_cost: c.original_value, amount: c.original_value, _derived: true }];
    var lnTot = r2(lines.reduce(function (s, l) { return s + (Number(l.amount) || 0); }, 0));
    html += drillH("Lines (" + lines.length + (lines[0] && lines[0]._derived ? " — derived from total" : "") + ")");
    html += '<div class="twrap"><table><thead><tr><th>Lot</th><th>Category / description</th><th>Material</th><th>Note</th><th>Color</th><th class="num">Qty</th><th>Unit</th><th class="num">Unit cost</th><th class="num">Amount</th></tr></thead><tbody>'
      + lines.map(function (l) {
        return '<tr><td class="mono">' + esc(l.lot == null || l.lot === "" ? "—" : String(l.lot)) + "</td><td><b>" + esc(l.category || l.desc || "—") + "</b></td><td>" + esc(l.material || "—") + "</td><td>" + esc(l.note || "—") + "</td><td>" + colorChipOf(l.color) + '</td><td class="num mono">' + (l.qty == null ? "—" : l.qty) + "</td><td>" + esc(l.unit || l.uom || "—") + '</td><td class="num">' + (l.unit_cost != null ? f.usd(l.unit_cost, true) : "—") + '</td><td class="num">' + f.usd(l.amount || 0, true) + "</td></tr>";
      }).join("")
      + '<tr><td colspan="8"><b>TOTAL — ' + lines.length + ' lines</b></td><td class="num"><b>' + f.usd(lnTot, true) + "</b></td></tr>"
      + "</tbody></table></div>";
    // (e) FINANCIAL state — the money truth behind the paper
    html += drillH("Financial state");
    html += '<div class="kv">'
      + '<div class="k">Original value</div><div class="v"><b>' + f.usd(c.original_value, true) + "</b></div>"
      + '<div class="k">Invoiced to date</div><div class="v">' + f.usd(invoiced, true) + "</div>"
      + '<div class="k">Balance</div><div class="v"><b style="color:var(--' + (balance > 0 ? "info" : "ok") + ')">' + f.usd(balance, true) + "</b></div>"
      + (c.retention_held != null ? '<div class="k">Retention held</div><div class="v">' + f.usd(c.retention_held, true) + "</div>" : "")
      + "</div>";
    var liveGrs = grs.filter(function (g) { return !g.voided_at; });
    html += drillH("Goods receipts (" + liveGrs.length + (grs.length > liveGrs.length ? " · " + (grs.length - liveGrs.length) + " voided" : "") + ")");
    html += grs.length ? grs.map(function (g, gi) {
      // #4b receive proof: who / when / note on the row AND on hover
      var hover = "Received by " + (g.received_by || "—") + " on " + (g.date || "—") + (g.qty_note ? " — " + g.qty_note : "");
      var inner = '<span title="' + esc(hover) + '" style="display:flex;gap:10px;align-items:center;flex:1;min-width:0"><span class="mono" style="font-size:12px">' + f.dateShort(g.date) + '</span><span class="subtle" style="flex:1">' + esc(g.qty_note || "") + (g.attachment ? ' · <span class="mono" style="font-size:10.5px">' + (String(g.attachment).indexOf("http") === 0 ? '<a class="act" href="' + esc(g.attachment) + '" target="_blank" rel="noopener">attachment ↗</a>' : esc(g.attachment)) + "</span>" : "") + '</span><span class="subtle">' + esc(g.received_by || "") + "</span></span>";
      if (g.voided_at) inner += " " + chip("VOIDED — " + (g.void_reason || "no reason"), "bad");
      else if (can("po.unreceive")) inner += ' <button class="btn danger sm" data-grv="' + gi + '">Void receipt</button>';
      return rowLine(inner);
    }).join("") : '<p class="subtle">Nothing received yet — receive against this PO to complete the 3-way match.</p>';
    if (liveGrs.length && can("po.unreceive")) {
      html += '<div id="cmGrvWrap" class="hidden" style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<span class="subtle" id="cmGrvLbl" style="min-width:120px"></span>'
        + '<input class="in" id="cmGrvReason" placeholder="Reason (required — stays on the voided row)" style="flex:1;min-width:200px" />'
        + '<button class="btn danger sm" id="cmGrvGo">Confirm — void receipt</button></div>';
    }
    var aps = ((ctx.linked || {}).apInvoices || []).filter(function (i) { return i.po_ref === c.reference_no; });
    html += drillH("Linked AP invoices (" + aps.length + ")");
    html += aps.length ? '<div class="twrap"><table><thead><tr><th>Invoice</th><th>Date</th><th>Match</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>'
      + aps.map(function (i, ix) {
        return '<tr class="clk" data-apx="' + ix + '"><td class="mono">' + esc(i.invoice_number) + "</td><td>" + f.dateShort(i.invoice_date) + "</td><td>" + statusChip(i.match_status) + '</td><td class="num">' + f.usd(i.amount, true) + "</td><td>" + statusChip(i.status) + "</td></tr>";
      }).join("") + "</tbody></table></div>"
      : '<p class="subtle">No AP invoices reference this PO yet.</p>';
    // notes on the record (#14 — one universal system)
    html += notesSection("commitments", c.id);
    // (f) PROVENANCE — who created it, and every audit row that touched it
    html += drillH("Provenance");
    html += '<div class="kv"><div class="k">Created</div><div class="v">' + esc(c.created_by || "—") + ' <span class="subtle">' + (c.createdAt ? f.date(String(c.createdAt).slice(0, 10)) : (c.date ? f.date(c.date) : "—")) + "</span></div></div>"
      + auditFeedHtml(K, ctx.audit);
    // (g) actions — forward lifecycle + gated reversals (wave 5)
    var btns = '<button class="btn" id="cmPr">⎙ Print PO</button><button class="btn sm" id="cmEditNeed">Edit needed-by</button>';
    if (c.status === "draft") btns += '<button class="btn primary" id="cmActivate">Activate — assign vendor</button>';
    if (c.status === "open") btns += '<button class="btn primary" id="cmIssue">Issue PO →</button>';
    if (c.status === "issued") btns += '<button class="btn primary" id="cmRecv">Receive goods →</button>';
    if (c.status === "received") btns += '<button class="btn" id="cmClose">Close PO</button>';
    var revHtml = "";
    if (c.status === "issued" && can("po.unissue")) revHtml += revControl("cmUnissue", "Un-issue PO (back to open)");
    if (c.status === "closed" && can("po.reopen")) revHtml += revControl("cmReopen", "Re-open PO");
    // #4a: cancel (open/issued, zero receipts + zero AP) · delete genuine drafts
    var cancelable = ["open", "issued"].indexOf(c.status) >= 0 && !liveGrs.length
      && !S.list("apInvoices").some(function (i) { return i.po_ref === c.reference_no && ["voided", "withdrawn"].indexOf(i.status) < 0; });
    if (cancelable && (can("po.reopen") || can("record.delete"))) revHtml += revControl("cmCancel", "Cancel PO (no receipts, no AP)");
    if (c.status === "draft" && can("record.delete")) revHtml += revControl("cmDelDraft", "Delete draft PO", "Why is this draft being discarded?");
    html += '<div class="btnrow" style="margin-top:18px">' + btns + "</div>"
      + (revHtml ? '<div class="btnrow" style="margin-top:10px">' + revHtml + "</div>" : "")
      + '<div id="cmNeedWrap" class="hidden" style="margin-top:10px;display:flex;gap:8px;align-items:center"><input class="in" id="cmNeedIn" type="date" value="' + esc(c.needed_by || "") + '" style="max-width:180px" /><button class="btn sm primary" id="cmNeedGo">Save needed-by</button></div>';
    K.drill("PO " + poNo, html);
    var db = document.getElementById("drillBody");
    bindClick("cmVLink", function () { if (v.id) drillVendor(K, v); });
    Array.prototype.forEach.call(db.querySelectorAll("tr[data-apx]"), function (el) {
      el.addEventListener("click", function () { drillApInv(K, aps[Number(el.getAttribute("data-apx"))]); });
    });
    bindClick("cmPr", function () { printCommitPo(K, c); });
    bindClick("cmEditNeed", function () { var w = document.getElementById("cmNeedWrap"); if (w) w.classList.toggle("hidden"); });
    bindClick("cmNeedGo", function () {
      var nv = V("cmNeedIn");
      S.update("commitments", c.id, { needed_by: nv || null });
      K.toast("Needed-by " + (nv ? "set to " + nv : "cleared") + " on " + poNo + ".", { title: "PO updated", kind: "ok" });
      K.reRender(); drillCommit(K, c0);
    });
    bindClick("cmIssue", function () { S.update("commitments", c.id, { status: "issued" }); K.toast("PO " + c.reference_no + " issued to " + (v.name || "vendor") + ".", { title: "Issued", kind: "ok" }); K.reRender(); drillCommit(K, c0); });
    bindClick("cmActivate", function () { activateDraftCommit(K, c); });
    // #4b: receive is a PROOF event — received_by (session), REQUIRED note,
    // optional packing-slip / Drive-link attachment. Status flip fires the
    // delivery-milestone wiring deterministically.
    bindClick("cmRecv", function () {
      drillForm(K, "Receive goods · PO " + c.reference_no,
        '<div class="kv"><div class="k">Received by</div><div class="v">' + esc(sessName()) + ' <span class="subtle">(session — stamped on the receipt)</span></div>'
        + '<div class="k">Date</div><div class="v">' + f.date(TODAY) + "</div></div>"
        + fld("Receive note (required — qty / condition)", inp("rgNote", "text", "", "e.g. Full order received; 2 boxes short on J-channel"))
        + fld("Attachment — packing-slip name or Drive link (optional)", inp("rgAtt", "text", "", "e.g. packing-slip-4417.pdf or https://drive.google.com/…")),
        "Record receipt", function () {
          var note = V("rgNote");
          if (!note) { K.toast("A receive note is required — it is the proof on the record.", { kind: "warn" }); return; }
          S.insert("goodsReceipts", { commitment_id: c.id, date: TODAY, qty_note: note, received_by: sessName(), attachment: V("rgAtt") || null });
          S.update("commitments", c.id, { status: "received" });
          K.toast("Receipt recorded on " + c.reference_no + " by " + sessName() + " — 3-way match sees PO + receipt + invoice; delivery milestone auto-checks.", { title: "Goods received", kind: "ok" });
          K.reRender(); drillCommit(K, c0);
        });
    });
    bindRev(K, "cmCancel", function (reason) {
      var res = window.KReversals.cancelPo(K, c, reason);
      revToast(K, res, "Cancel PO");
      if (res.ok) { K.reRender(); drillCommit(K, c0); }
    });
    bindRev(K, "cmDelDraft", function (reason) {
      var res = window.KReversals.deleteDraftPo(K, c, reason);
      revToast(K, res, "Delete draft PO");
      if (res.ok) { K.closeDrill(); K.reRender(); }
    });
    notesBind("commitments", c.id);
    // close remembers the prior status so Re-open can restore it exactly
    bindClick("cmClose", function () { S.update("commitments", c.id, { status: "closed", status_prior: c.status }); K.toast("PO " + c.reference_no + " closed (was " + c.status + " — re-open restores that).", { title: "Closed", kind: "ok" }); K.reRender(); drillCommit(K, c0); });
    // ---- wave-5 reversals: un-issue · re-open · per-row GR void ----
    bindRev(K, "cmUnissue", function (reason) {
      var res = window.KReversals.unissuePo(K, c, reason);
      revToast(K, res, "Un-issue PO");
      if (res.ok) { K.reRender(); drillCommit(K, c0); }
    });
    bindRev(K, "cmReopen", function (reason) {
      var res = window.KReversals.reopenPo(K, c, reason);
      revToast(K, res, "Re-open PO");
      if (res.ok) { K.reRender(); drillCommit(K, c0); }
    });
    var grvTarget = null;
    Array.prototype.forEach.call(db.querySelectorAll("[data-grv]"), function (el) {
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        grvTarget = grs[Number(el.getAttribute("data-grv"))] || null;
        var w = document.getElementById("cmGrvWrap"), lb = document.getElementById("cmGrvLbl");
        if (w) w.classList.remove("hidden");
        if (lb && grvTarget) lb.textContent = "Voiding receipt of " + f.dateShort(grvTarget.date) + ":";
      });
    });
    bindClick("cmGrvGo", function () {
      if (!grvTarget) return;
      var reason = V("cmGrvReason");
      if (!reason) { K.toast("A reason is required — it stays on the voided receipt row.", { kind: "warn" }); return; }
      var res = window.KReversals.voidGoodsReceipt(K, grvTarget, reason);
      revToast(K, res, "Void goods receipt");
      if (res.ok) { K.reRender(); drillCommit(K, c0); }
    });
  }
  /* ---- SUBCONTRACT / WO DRILL — same assembled pattern ------------------- *
   * Accepts either the commitment (type=Subcontract) or the subcontracts row. */
  function drillSubcontract(K, src) {
    var S = K.store, f = K.fmt;
    var c = null, sub = null;
    if (src.commitment_type === "Subcontract") {
      c = S.get("commitments", src.id) || src;
      sub = S.list("subcontracts").filter(function (s2) { return s2.subcontract_id === c.reference_no; })[0] || null;
    } else {
      sub = S.get("subcontracts", src.id) || src;
      c = S.list("commitments").filter(function (x) { return x.reference_no === sub.subcontract_id && x.commitment_type === "Subcontract"; })[0] || null;
    }
    var base = c || sub || {};
    var ctx = kContext(c ? "commitments" : "subcontracts", base);
    var v = ctx.vendor || S.get("vendors", base.vendor_id) || {};
    var ref = (sub && sub.subcontract_id) || base.reference_no || base.id;
    var woNo = (sub && sub.wo_number) || base.wo_number || null;
    var val = Number((sub && sub.current_value) != null ? sub.current_value : base.original_value) || 0;
    var billed = Number((sub && sub.billed_to_date) || base.invoiced_to_date) || 0;
    var retPct = Number(sub && sub.retention_pct) || 0;
    var retHeld = Number(base.retention_held) || r2(billed * retPct / 100);
    var status = (sub && sub.status) || base.status;
    var closedDate = (sub && sub.closed_date) || base.closed_date || null;
    var html = ctxStripFor(K, ctx, [woNo ? { lab: "WO #", val: woNo } : null]);
    html += '<div class="kv">'
      + '<div class="k">WO #</div><div class="v mono"><b>' + esc(woNo || "—") + "</b>" + (woNo ? "" : ' <span class="subtle">(assigned at posting)</span>') + "</div>"
      + '<div class="k">Ref</div><div class="v mono">' + esc(ref) + "</div>"
      + '<div class="k">Status</div><div class="v">' + statusChip(status) + (closedDate ? ' <span class="subtle">closed ' + f.dateShort(closedDate) + "</span>" : "") + "</div>"
      + '<div class="k">Scope</div><div class="v">' + esc((sub && sub.scope) || base.description || "Subcontract scope of work") + "</div>"
      + '<div class="k">Value</div><div class="v"><b>' + f.usd(val, true) + "</b></div>"
      + '<div class="k">Billed to date</div><div class="v">' + f.usd(billed, true) + ' <span class="subtle">balance ' + f.usd(r2(val - billed), true) + "</span></div>"
      + '<div class="k">Retention</div><div class="v">' + retPct + "% · " + f.usd(retHeld, true) + " held</div>"
      + '<div class="k">Payment terms</div><div class="v">' + ((sub && sub.pay_when_paid) || v.terms === "Pay-when-paid" ? chip("pay-when-paid", "warn") : chip(v.terms || "—", "mute")) + "</div>"
      + "</div>";
    // contractor block + compliance snapshot — payments hold on a lapse
    html += drillH("Contractor");
    var comps = S.list("complianceDocs", { vendor_id: v.id });
    html += '<div class="kv">'
      + '<div class="k">Name</div><div class="v"><span class="act" id="scVLink" style="cursor:pointer">' + esc(v.name || base.vendor_id || "—") + " →</span></div>"
      + '<div class="k">Phone</div><div class="v mono">' + esc(v.phone || (v.contact && v.contact.phone) || "—") + "</div>"
      + (v.prequal_score ? '<div class="k">Prequal</div><div class="v">' + chip(v.prequal_score, v.prequal_score >= 70 ? "ok" : "warn") + "</div>" : "")
      + '<div class="k">Compliance</div><div class="v">' + (comps.length ? comps.map(function (d) {
          return chip(String(d.doc_type).toUpperCase().replace(/_/g, " ") + " " + d.status, d.status === "valid" ? "ok" : "bad");
        }).join(" ") : chip("nothing on file — payments hold", "bad")) + "</div>"
      + (v.vendor_hold ? '<div class="k">Hold</div><div class="v">' + chip("VENDOR PAYMENT HOLD", "bad") + "</div>" : "")
      + "</div>";
    // draws against this WO — click → the deep draw drill
    var scJob = base.job_code || base.job_id || (sub && sub.job_id) || null;
    var draws = S.list("subDraws").filter(function (d) {
      return (d.wo_ref && (d.wo_ref === woNo || d.wo_ref === ref)) || (!d.wo_ref && scJob && d.job_code === scJob && d.vendor_id === base.vendor_id);
    });
    var drawTot = r2(draws.reduce(function (s, d) { return s + (Number(d.amount) || 0); }, 0));
    html += drillH("Draws against this WO (" + draws.length + (draws.length ? " · " + f.usd(drawTot, true) : "") + ")");
    html += draws.length ? '<div class="twrap"><table><thead><tr><th>Date</th><th>Contractor</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>'
      + draws.map(function (d, ix) {
        return '<tr class="clk" data-scdraw="' + ix + '"><td class="mono">' + f.dateShort(d.date) + "</td><td>" + esc(d.contractor || v.name || "—") + '</td><td class="num">' + f.usd(d.amount, true) + "</td><td>" + subDrawStatusChips(d.status) + "</td></tr>";
      }).join("") + "</tbody></table></div>"
      : '<p class="subtle">No draws yet — contractor payment draws land here as work completes.</p>';
    // linked approvals + provenance
    var apprs = (ctx.linked || {}).approvals || [];
    html += drillH("Linked approvals (" + apprs.length + ")");
    html += apprs.length ? apprs.map(function (a) {
      return rowLine(statusChip(a.status) + '<span class="subtle" style="flex:1">' + esc(a.title) + " · " + esc(a.workflow || "") + '</span><span class="mono" style="margin-left:auto">' + f.usd(a.amount || 0, true) + "</span>");
    }).join("") : '<p class="subtle">No approvals reference this subcontract.</p>';
    html += notesSection("subcontracts", (sub && sub.id) || base.id);
    html += drillH("Provenance");
    html += auditFeedHtml(K, ctx.audit);
    var btns = '<button class="btn" id="scPr">⎙ Print</button>';
    if (status === "draft") btns += '<button class="btn primary" id="scActivate">Activate — assign contractor</button>';
    if (c && c.status === "pending-post") btns += '<button class="btn primary" id="scPost">Post subcontract</button>';
    var scRevHtml = "";
    if (c && c.status === "open" && can("sc.unpost")) scRevHtml = revControl("scUnpost", "Un-post subcontract (back to pending-post)");
    html += '<div class="btnrow" style="margin-top:18px">' + btns + "</div>"
      + (scRevHtml ? '<div class="btnrow" style="margin-top:10px">' + scRevHtml + "</div>" : "");
    K.drill("Subcontract " + (woNo ? woNo + " · " : "") + ref, html);
    var db = document.getElementById("drillBody");
    bindClick("scVLink", function () { if (v.id) drillVendor(K, v); });
    Array.prototype.forEach.call(db.querySelectorAll("tr[data-scdraw]"), function (el) {
      el.addEventListener("click", function () { drillSubDraw(K, draws[Number(el.getAttribute("data-scdraw"))]); });
    });
    bindClick("scPr", function () { if (c) printCommitPo(K, c); });
    bindClick("scPost", function () { K.closeDrill(); if (c) postSubcontract(K, c); });
    bindClick("scActivate", function () { if (sub) activateDraftSub(K, sub); });
    notesBind("subcontracts", (sub && sub.id) || base.id);
    bindRev(K, "scUnpost", function (reason) {
      var res = window.KReversals.unpostSubcontract(K, c, reason);
      revToast(K, res, "Un-post subcontract");
      if (res.ok) { K.reRender(); drillSubcontract(K, src); }
    });
  }
  /* ---- SUB-DRAW DRILL — contractor payment draw (distinct from owner
   * pay-app draws inside contracts). the legacy ERP status codes rendered as
   * plain language; the AP/ledger rows behind the draw are shown honestly. */
  function subDrawStatusChips(status) {
    var s = String(status || "").toUpperCase();
    if (!s) return chip("—", "mute");
    var out = [];
    if (s.indexOf("APLD") >= 0 || s.indexOf("APPLIED") >= 0) out.push(chip("APPLIED — counted against the WO", "info"));
    if (s.indexOf("PSTD") >= 0 || s.indexOf("POSTED") >= 0) out.push(chip("POSTED — in the ledger", "ok"));
    if (s.indexOf("PEND") >= 0) out.push(chip("PENDING — awaiting approval", "warn"));
    if (s.indexOf("PAID") >= 0) out.push(chip("PAID", "ok"));
    if (!out.length) out.push(statusChip(status));
    return out.join(" ");
  }
  function drillSubDraw(K, d0) {
    var S = K.store, f = K.fmt, L = window.KeystoneLedger;
    var d = S.get("subDraws", d0.id) || d0;
    var ctx = kContext("subDraws", d);
    var v = ctx.vendor || S.get("vendors", d.vendor_id) || {};
    var wo = d.wo_ref ? (S.list("subcontracts").filter(function (s2) { return s2.wo_number === d.wo_ref || s2.subcontract_id === d.wo_ref; })[0] || null) : null;
    var html = ctxStripFor(K, ctx, [d.wo_ref ? { lab: "WO", val: d.wo_ref } : null]);
    html += '<div class="kv">'
      + '<div class="k">Date</div><div class="v">' + f.date(d.date) + (daysSince(d.date) != null ? ' <span class="subtle">' + daysPhrase(daysSince(d.date)) + "</span>" : "") + "</div>"
      + '<div class="k">Contractor</div><div class="v"><span class="act" id="sdVLink" style="cursor:pointer">' + esc(d.contractor || v.name || "—") + " →</span></div>"
      + '<div class="k">Amount</div><div class="v"><b>' + f.usd(d.amount, true) + "</b></div>"
      + '<div class="k">Status</div><div class="v">' + subDrawStatusChips(d.status) + "</div>"
      + '<div class="k">Work order</div><div class="v">' + (d.wo_ref ? '<span class="act" id="sdWoLink" style="cursor:pointer">' + esc(d.wo_ref) + " →</span>" : '<span class="subtle">— not tied to a WO</span>') + "</div>"
      + (d.memo ? '<div class="k">Memo</div><div class="v">' + esc(d.memo) + "</div>" : "")
      + "</div>";
    // the money rows behind the draw — AP invoices + ledger activity
    var vAps = S.list("apInvoices").filter(function (i) { return i.vendor_id === d.vendor_id && (!d.job_code || i.job_id === d.job_code); });
    html += drillH("AP invoices behind this contractor (" + vAps.length + ")");
    html += vAps.length ? vAps.map(function (i) {
      return rowLine('<span class="mono" style="font-size:12px" >' + esc(i.invoice_number) + '</span><span class="subtle">' + f.dateShort(i.invoice_date) + '</span><span class="mono" style="margin-left:auto">' + f.usd(i.amount, true) + "</span>" + statusChip(i.status));
    }).join("") : '<p class="subtle">No AP invoices from this contractor on the job.</p>';
    var led = (L && typeof L.activity === "function") ? L.activity().filter(function (a) {
      return (a.memo || "").indexOf(d.id) >= 0 || (a.source === "sub-draw" && a.job_code === d.job_code)
        || (d.job_code && a.job_code === d.job_code && a.category === "S" && a.debit);
    }) : [];
    html += drillH("Ledger rows (" + led.length + ")");
    html += led.length ? led.map(function (a) {
      return rowLine('<span class="mono" style="font-size:11.5px">' + f.dateShort(a.date) + '</span><span class="mono" style="font-size:11.5px">' + esc(a.account) + '</span><span class="subtle" style="flex:1">' + esc(a.memo || "") + '</span><span class="mono" style="margin-left:auto">' + (a.debit ? "Dr " + f.usd(a.debit, true) : "Cr " + f.usd(a.credit, true)) + "</span>");
    }).join("") : '<p class="subtle">No ledger rows tied to this draw yet — the legacy ERP-migrated draws carry status only; new draws post through the approval path.</p>';
    // #5: a pending draw approves right here — same KApprove path as the Hub
    var sdPend = d.status === "pending" ? S.list("approvals", { status: "pending" }).filter(function (a2) { return (a2.detail || "").indexOf(d.id) >= 0; })[0] : null;
    if (sdPend) {
      html += '<div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sdApGo">✓ Approve &amp; post — ' + f.usd(d.amount, true) + "</button></div>";
    }
    html += notesSection("subDraws", d.id);
    html += drillH("Provenance");
    html += auditFeedHtml(K, ctx.audit);
    K.drill("Draw · " + (d.contractor || v.name || d.id) + " · " + f.usd(d.amount, true), html);
    bindClick("sdVLink", function () { if (v.id) drillVendor(K, v); });
    bindClick("sdWoLink", function () { if (wo) drillSubcontract(K, wo); else openRefDrill(K, "wo", d.wo_ref); });
    bindClick("sdApGo", function () {
      var b = document.getElementById("sdApGo");
      if (b && !b._armed) { b._armed = true; b.textContent = "Confirm — post " + f.usd(d.amount, true) + " to the ledger"; return; }
      var res = approveApproval(K, sdPend);
      K.toast(res.msg, { title: res.ok ? "Draw approved" : "Not approved", kind: res.ok ? "ok" : "warn", ms: 6500 });
      if (res.ok) { K.reRender(); drillSubDraw(K, d0); }
    });
    notesBind("subDraws", d.id);
  }
  /* ---- JOURNAL DRILL — the receipt/payment behind a money event ---------- */
  function drillJournal(K, jid) {
    var L = window.KeystoneLedger, f = K.fmt;
    var rows = (L && typeof L.activity === "function") ? L.activity().filter(function (a) { return a.journal_id === jid; }) : [];
    if (!rows.length) { K.toast("Journal " + String(jid) + " has no activity rows.", { title: "Not found", kind: "warn" }); return; }
    var td = r2(rows.reduce(function (s, a) { return s + (Number(a.debit) || 0); }, 0));
    var html = '<div class="kv">'
      + '<div class="k">Journal</div><div class="v mono">' + esc(jid) + "</div>"
      + '<div class="k">Date</div><div class="v">' + f.date(rows[0].date) + "</div>"
      + '<div class="k">Source</div><div class="v">' + chip(rows[0].source || "manual", "mute") + "</div>"
      + '<div class="k">Memo</div><div class="v">' + esc(rows[0].memo || "—") + "</div>"
      + '<div class="k">Amount</div><div class="v"><b>' + f.usd(td, true) + "</b></div></div>"
      + drillH("Lines (" + rows.length + ")")
      + '<div class="twrap"><table><thead><tr><th>Acct</th><th>Job</th><th>Memo</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead><tbody>'
      + rows.map(function (a) {
        return '<tr><td class="mono">' + esc(a.account) + "</td><td>" + esc(a.job_code || "—") + "</td><td>" + esc(a.memo || "") + '</td><td class="num">' + (a.debit ? f.usd(a.debit, true) : "") + '</td><td class="num">' + (a.credit ? f.usd(a.credit, true) : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    K.drill("Journal · " + jid, html);
  }
  /* ---- AP INVOICE DRILL (shared) — assembled via K.context ---------------- *
   * Extracted from the Finance tab (wave 3) so the PO drill, sub-draw drill,
   * milestone children and the AP tab all open ONE deep view. */
  function apDueOfInv(r) { return r.due_date || isoPlusDays(r.invoice_date, 30); }   // terms NET30 when absent
  function apChkFor(r) { return { number: r.check_no || "—", date: r.check_date || TODAY, payee: r.vendor, amount: r.amount, memo: "Invoice " + r.invoice_number, invoices: [{ num: r.invoice_number, amount: r.amount }] }; }
  // voided GRs don't count toward the 3-way match — the chip reverts on void
  function apGrFor(K, r) { if (!r.po_ref) return null; var cm = K.store.list("commitments").filter(function (c) { return c.reference_no === r.po_ref; })[0]; return cm ? K.store.list("goodsReceipts", { commitment_id: cm.id }).filter(function (g) { return !g.voided_at; }) : null; }
  function drillApInv(K, r) {
    var S = K.store, f = K.fmt, L = window.KeystoneLedger, O = window.KeystoneOutput;
    r = S.get("apInvoices", r.id) || r;
    var ctx = kContext("apInvoices", r);
    var canPay = r.status === "approved" || r.status === "paid";
    var gr = apGrFor(K, r);
    var commit = r.po_ref ? S.list("commitments").filter(function (c) { return c.reference_no === r.po_ref; })[0] : null;
    var html = ctxStripFor(K, ctx, [{ lab: "Vendor", val: r.vendor }]);
    // #4b: the receipt chip carries the PROOF — who received, when, the note
    var grHover = (gr && gr.length) ? gr.map(function (g) { return (g.received_by || "—") + " · " + (g.date || "—") + (g.qty_note ? " — " + g.qty_note : ""); }).join(" | ") : "";
    html += '<div class="kv"><div class="k">Vendor</div><div class="v">' + esc(r.vendor) + '</div><div class="k">Amount</div><div class="v">' + f.usd(r.amount, true) + '</div><div class="k">Job</div><div class="v">' + esc(r.job_id || "—") + '</div><div class="k">Invoice date</div><div class="v">' + f.date(r.invoice_date) + '</div><div class="k">Due</div><div class="v">' + f.date(apDueOfInv(r)) + (daysSince(apDueOfInv(r)) != null && daysSince(apDueOfInv(r)) > 0 && r.status !== "paid" ? " " + chip(daysPhrase(daysSince(apDueOfInv(r))) + " overdue", "bad") : "") + '</div><div class="k">Match</div><div class="v">' + statusChip(r.match_status) + (commit ? " " + chip(commit.commitment_type === "Subcontract" ? "matched to SC" : "matched to PO", "info") : "") + (gr && gr.length ? ' <span class="chip ok" title="' + esc(grHover) + '">receipt on file</span>' : "") + '</div><div class="k">Status</div><div class="v">' + statusChip(r.status) + (r.check_no ? ' <span class="mono subtle">check ' + esc(r.check_no) + "</span>" : "") + "</div>"
      + (r.retainage_held ? '<div class="k">Retainage held</div><div class="v">' + f.usd(r.retainage_held, true) + "</div>" : "")
      + (r.exception ? '<div class="k">Exception</div><div class="v" style="color:var(--bad)">' + esc(r.exception) + "</div>" : "") + (r.hold_dismissed ? '<div class="k">Hold dismissed</div><div class="v">' + esc(r.hold_dismissed) + "</div>" : "") + "</div>";
    // linked commitment + receipt chips
    if (commit || (gr && gr.length)) {
      html += '<div class="btnrow" style="margin-top:10px">'
        + (commit ? '<button class="btn sm" id="apCmLink">⛓ ' + esc(commit.commitment_type + " " + commit.reference_no) + " · " + f.usd(commit.original_value, true) + "</button>" : "")
        + (gr && gr.length ? '<span class="chip ok" title="' + esc(grHover) + '">' + gr.length + " goods receipt(s)</span>" : "") + "</div>";
    }
    // #13: choose the PO/WO this invoice bills against — po_ref exact OR
    // vendor+job across commitments AND posted subcontracts, type shown.
    var mCands = (["paid", "voided", "withdrawn"].indexOf(r.status) < 0) ? matchCandidatesFor(K, r.vendor_id, r.vendor, r.job_id, r.po_ref) : [];
    if (mCands.length && (!commit || mCands.length > 1)) {
      html += drillH("Match to a PO / WO (" + mCands.length + " candidate(s))");
      html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + sel("apMatchSel", mCands.map(function (cd) { return { v: cd.ref, l: cd.kind + " · " + cd.label }; }), r.po_ref || (mCands[0] && mCands[0].ref))
        + '<button class="btn sm primary" id="apMatchGo">Set match</button></div>'
        + '<p class="subtle" style="margin-top:6px">Choose the PO/WO this invoice bills against — the match writes po_ref so the chip persists, and GL coding defaults from the commitment category.</p>';
    }
    // ITEMS — stored lines; legacy seed invoices show one derived line
    var lines = (r.lines && r.lines.length) ? r.lines : [{ desc: "Invoice total — " + (r.job_id ? "job " + r.job_id : "overhead"), cost_code: (commit && commit.cost_code) || "", category: (commit && commit.category) || "", qty: 1, unit_cost: r.amount, amount: r.amount }];
    var lineTot = r2(lines.reduce(function (s, l) { return s + (Number(l.amount) || 0); }, 0));
    html += drillH("Items (" + lines.length + (r.lines && r.lines.length ? "" : " — derived from total") + ")");
    html += '<div class="twrap"><table><thead><tr><th>Description</th><th>CC.Cat</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead><tbody>'
      + lines.map(function (l) { return "<tr><td>" + esc(l.desc) + '</td><td class="mono">' + esc((l.cost_code || "—") + (l.category ? "." + l.category : "")) + '</td><td class="num">' + (l.qty == null ? "—" : l.qty) + '</td><td class="num">' + f.usd(l.unit_cost || 0, true) + '</td><td class="num">' + f.usd(l.amount || 0, true) + "</td></tr>"; }).join("")
      + '<tr><td colspan="4"><b>Items total</b></td><td class="num"><b>' + f.usd(lineTot, true) + "</b></td></tr>"
      + (Math.abs(lineTot - (r.amount || 0)) > 0.005 ? '<tr><td colspan="4" style="color:var(--bad)">Header mismatch</td><td class="num" style="color:var(--bad)">' + f.usd(r2(lineTot - (r.amount || 0)), true) + "</td></tr>" : "")
      + "</tbody></table></div>";
    // GL distribution — the posted journal when it exists, else the preview
    var posted = L.activity().filter(function (a) { return (a.memo || "").indexOf(r.invoice_number) >= 0 || (a.source === "ap-approval" && a.job_code === r.job_id && Math.abs((Number(a.debit) || 0) - r.amount) < 0.005); });
    html += drillH("GL distribution " + (posted.length ? "(posted — click a row for its journal)" : "(will post on approval)"));
    if (posted.length) {
      html += posted.map(function (a, ix) {
        return '<div class="clk" data-apj="' + ix + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);cursor:pointer" title="Open journal ' + esc(a.journal_id || "") + '"><span class="mono" style="font-size:11.5px">' + f.dateShort(a.date) + '</span><span class="mono" style="font-size:11.5px">' + esc(a.account) + '</span><span class="subtle" style="flex:1">' + esc(a.memo || "") + '</span><span class="mono" style="margin-left:auto">' + (a.debit ? "Dr " + f.usd(a.debit, true) : "Cr " + f.usd(a.credit, true)) + " →</span></div>";
      }).join("");
    } else {
      var byAcct = {};
      lines.forEach(function (l) { var a2 = apAcctFor(l.category); byAcct[a2] = r2((byAcct[a2] || 0) + (Number(l.amount) || 0)); });
      html += Object.keys(byAcct).map(function (a2) {
        var nm = (L.account(a2) || {}).account_name || a2;
        return rowLine('<span class="mono" style="font-size:11.5px">' + esc(a2) + '</span><span class="subtle" style="flex:1">' + esc(nm) + '</span><span class="mono" style="margin-left:auto">Dr ' + f.usd(byAcct[a2], true) + "</span>");
      }).join("") + rowLine('<span class="mono" style="font-size:11.5px">2000</span><span class="subtle" style="flex:1">Accounts Payable</span><span class="mono" style="margin-left:auto">Cr ' + f.usd(lineTot, true) + "</span>");
    }
    // approval history + provenance (from the one context assembler)
    var apprs = S.list("approvals").filter(function (a) { return (a.title || "").indexOf(r.invoice_number) >= 0; });
    html += drillH("Approval history (" + apprs.length + ")");
    html += apprs.length ? apprs.map(function (a, ax) {
      var extra = "";
      // #5: the approval chip IS the control — pending rows approve right here
      // through the same KApprove.approval path as the Action Hub.
      if (a.status === "pending" && !/must be posted|Blocked/i.test(a.detail || "")) extra = ' <button class="btn primary sm" data-apok="' + ax + '">✓ Approve &amp; post</button>';
      if (a.status === "approved" && can("approval.void")) extra = ' <button class="btn danger sm" data-apv="' + ax + '">Void</button>';
      if (a.status === "voided") extra = ' <span class="subtle">' + esc(a.void_reason ? "reason: " + a.void_reason : "") + "</span>";
      return rowLine(statusChip(a.status) + '<span class="subtle" style="flex:1">' + esc(a.workflow || "") + " · " + esc(a.createdBy || "") + '</span><span class="mono" style="margin-left:auto">' + f.usd(a.amount || 0, true) + "</span>" + extra);
    }).join("") : '<p class="subtle">No approval rows yet.</p>';
    if (apprs.some(function (a) { return a.status === "approved"; }) && can("approval.void")) {
      html += '<div id="apAvWrap" class="hidden" style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<span class="subtle" id="apAvLbl" style="min-width:120px"></span>'
        + '<input class="in" id="apAvReason" placeholder="Reason (required — goes on the compensating journal memo)" style="flex:1;min-width:220px" />'
        + '<button class="btn danger sm" id="apAvGo">Confirm — void approval</button></div>';
    }
    html += notesSection("apInvoices", r.id);
    html += drillH("Provenance");
    html += auditFeedHtml(K, ctx.audit);
    html += (r.status === "hold"
        ? '<p class="muted" style="margin-top:14px">On hold — resolve the exception before payment.</p><div class="btnrow" style="margin-top:8px"><button class="btn" id="dhBtn">Dismiss hold (reason)</button></div><div id="dhWrap" class="hidden" style="margin-top:10px"><input class="in" id="dhReason" placeholder="Why is this safe to pay? (goes on the record)" style="width:100%" /><div class="btnrow" style="margin-top:8px"><button class="btn primary" id="dhGo">Dismiss &amp; queue payment approval</button></div></div>'
        : (canPay ? '<div class="btnrow" style="margin-top:16px"><button class="btn primary" id="prchk">⎙ Print check' + (r.check_no ? " (No. " + esc(r.check_no) + ")" : "") + "</button></div>" : '<p class="muted" style="margin-top:14px">Not yet approved — approve inline above (same posting path as the Action Hub) before a check can print.</p>'));
    // wave-5: un-confirm an EXECUTED payment — compensating journal, command-gated
    if (r.status === "paid" && can("payment.void")) {
      html += '<div class="btnrow" style="margin-top:12px">' + revControl("apPv", "Void payment (un-confirm executed)") + "</div>";
    }
    // #4c: pending-approval invoices that never posted can be deleted (hard)
    // or withdrawn (soft, finance tier) — a mis-keyed invoice is not forever.
    var neverPosted = !posted.length;
    if (r.status === "pending-approval" && neverPosted) {
      var exitBtns = "";
      if (can("invoice.withdraw")) exitBtns += revControl("apWd", "Withdraw invoice (soft — keeps the record)", "Why is this being withdrawn?");
      if (can("record.delete")) exitBtns += revControl("apDel", "Delete invoice (removes it + its approval)", "Why is this being deleted?");
      if (exitBtns) html += '<div class="btnrow" style="margin-top:12px">' + exitBtns + "</div>";
    }
    K.drill("AP · " + r.invoice_number, html);
    var db2 = document.getElementById("drillBody");
    if (db2) Array.prototype.forEach.call(db2.querySelectorAll("[data-apj]"), function (el) {
      el.addEventListener("click", function () { var a = posted[Number(el.getAttribute("data-apj"))]; if (a && a.journal_id) drillJournal(K, a.journal_id); });
    });
    bindClick("apCmLink", function () { if (commit) drillCommit(K, commit); });
    bindClick("prchk", function () { var num = checkNoFor(K, r); O.print("Check " + num + " — " + r.vendor, O.docs.check(apChkFor(r))); K.reRender(); });
    // #13: set the match — writes po_ref (persists the chip) + category default
    bindClick("apMatchGo", function () {
      var ref = V("apMatchSel");
      var cd = null;
      mCands.forEach(function (x) { if (!cd && x.ref === ref) cd = x; });
      if (!cd) return;
      S.update("apInvoices", r.id, { po_ref: cd.ref, match_status: "matched", category: cd.category });
      K.toast(r.invoice_number + " matched to " + cd.kind + " " + cd.ref + " — GL coding defaults to category " + cd.category + ".", { title: "Matched", kind: "ok" });
      K.reRender(); drillApInv(K, r);
    });
    // #5: inline approve — the ONE shared path (KApprove.approval), two-click confirm
    if (db2) Array.prototype.forEach.call(db2.querySelectorAll("[data-apok]"), function (el) {
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (!el._armed) { el._armed = true; el.textContent = "Confirm — post to ledger"; return; }
        var a = apprs[Number(el.getAttribute("data-apok"))];
        if (!a) return;
        var res = approveApproval(K, a);
        K.toast(res.msg, { title: res.ok ? "Approved & posted" : "Not approved", kind: res.ok ? "ok" : "warn", ms: 6500 });
        if (res.ok) { K.reRender(); drillApInv(K, r); }
      });
    });
    // #4c: soft withdraw / hard delete for never-posted pending invoices
    bindRev(K, "apWd", function (reason) {
      S.update("apInvoices", r.id, { status: "withdrawn", withdraw_reason: reason, withdrawn_by: sessName(), withdrawn_at: new Date().toISOString() });
      S.list("approvals", { status: "pending" }).forEach(function (a) {
        if ((a.title || "").indexOf(r.invoice_number) >= 0) S.update("approvals", a.id, { status: "withdrawn", detail: (a.detail || "") + " · invoice withdrawn: " + reason });
      });
      K.toast(r.invoice_number + " withdrawn — record kept, pending approval cleared from the queue.", { title: "Invoice withdrawn", kind: "ok" });
      K.closeDrill(); K.reRender();
    });
    bindRev(K, "apDel", function (reason) {
      if (!can("record.delete")) { K.toast("Your seat is not permitted to delete records (record.delete).", { kind: "warn" }); return; }
      var nAppr = 0;
      S.list("approvals", { status: "pending" }).forEach(function (a) {
        if ((a.title || "").indexOf(r.invoice_number) >= 0) { S.remove("approvals", a.id); nAppr++; }
      });
      S.remove("apInvoices", r.id);
      try { if (typeof S._audit === "function") { S._audit("void", "apInvoices", r.id, null, { reason: reason, note: "delete pending AP invoice " + r.invoice_number, by: sessName() }); S._persist(); } } catch (eDel) {}
      K.toast(r.invoice_number + " deleted with " + nAppr + " pending approval row(s) — reason on the audit log.", { title: "Invoice deleted", kind: "ok" });
      K.closeDrill(); K.reRender();
    });
    notesBind("apInvoices", r.id);
    // wave-5: void an approved approval from the AP drill (workbench Action Hub calls the same KReversals.voidApproval)
    var apvTarget = null;
    if (db2) Array.prototype.forEach.call(db2.querySelectorAll("[data-apv]"), function (el) {
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        apvTarget = apprs[Number(el.getAttribute("data-apv"))] || null;
        var w = document.getElementById("apAvWrap"), lb = document.getElementById("apAvLbl");
        if (w) w.classList.remove("hidden");
        if (lb && apvTarget) lb.textContent = "Voiding “" + (apvTarget.title || apvTarget.id) + "”:";
      });
    });
    bindClick("apAvGo", function () {
      if (!apvTarget) return;
      var reason = V("apAvReason");
      if (!reason) { K.toast("A reason is required — it goes on the compensating journal.", { kind: "warn" }); return; }
      var res = window.KReversals.voidApproval(K, apvTarget, reason);
      revToast(K, res, "Void approval");
      if (res.ok) { K.reRender(); drillApInv(K, r); }
    });
    bindRev(K, "apPv", function (reason) {
      var res = window.KReversals.voidPayment(K, r, reason);
      revToast(K, res, "Void payment");
      if (res.ok) { K.reRender(); drillApInv(K, r); }
    });
    bindClick("dhBtn", function () { var w = document.getElementById("dhWrap"); if (w) w.classList.remove("hidden"); });
    bindClick("dhGo", function () {
      var reason = V("dhReason");
      if (!reason) { K.toast("A reason is required — it goes on the audit record.", { kind: "warn" }); return; }
      S.update("apInvoices", r.id, { status: "pending-approval", hold_dismissed: reason });
      S.insert("approvals", { title: "Pay " + r.vendor + " — " + r.invoice_number, tier: "money", amount: r.amount, status: "pending", vendor: r.vendor, job_code: r.job_id || null, detail: "Hold dismissed by " + ((K.session() || {}).name || "user") + ": " + reason, workflow: "Exception override", createdBy: (K.session() || {}).name || "user" });
      K.toast(r.invoice_number + " released to pending-approval — money approval queued in the Action Hub.", { title: "Hold dismissed", kind: "ok" });
      K.closeDrill(); K.reRender();
    });
  }
  /* ---- AR INVOICE DRILL (shared) — assembled via K.context ---------------- */
  function printArInvoice(K, r) {
    var S = K.store, O = window.KeystoneOutput;
    var ct2 = S.list("contracts").filter(function (c) { return c.job_id === r.job_id; })[0];
    O.print("Invoice " + r.invoice_number, O.docs.invoice({
      number: r.invoice_number, date: r.invoice_date, due: r.due_date || isoPlusDays(r.invoice_date, 30),
      customer: r.customer, job: (r.job_id || "—"), contract_ref: r.contract_ref || (ct2 && ct2.contract_id),
      lines: [{ desc: "Contract billing — job " + (r.job_id || "—"), amount: r.sales_amount }],
      retainage: r.retainage_amount || 0,
    }));
  }
  function drillArInv(K, r0) {
    var S = K.store, f = K.fmt, L = window.KeystoneLedger;
    var r = S.get("arInvoices", r0.id) || r0;
    var ctx = kContext("arInvoices", r);
    var age = ageDaysOf(r);
    var ct = ctx.contract || S.list("contracts").filter(function (c) { return c.job_id === r.job_id; })[0];
    var html = ctxStripFor(K, ctx, [{ lab: "Invoice", val: r.invoice_number }]);
    html += '<div class="kv">'
      + '<div class="k">Customer</div><div class="v">' + esc(r.customer) + "</div>"
      + '<div class="k">Job</div><div class="v">' + esc(r.job_id || "—") + (r.contract_ref ? ' <span class="subtle">' + esc(r.contract_ref) + "</span>" : "") + "</div>"
      + '<div class="k">Invoice date</div><div class="v">' + f.date(r.invoice_date) + "</div>"
      + '<div class="k">Due</div><div class="v">' + f.date(r.due_date || isoPlusDays(r.invoice_date, 30)) + "</div>"
      + '<div class="k">Age</div><div class="v">' + chip(age + "d", age > 60 ? "bad" : age > 30 ? "warn" : "mute") + "</div>"
      + '<div class="k">Sales amount</div><div class="v">' + f.usd(r.sales_amount, true) + ((r.sales_amount || 0) < 0 ? " " + chip("credit", "warn") : "") + "</div>"
      + (r.reason ? '<div class="k">Reason</div><div class="v">' + esc(r.reason) + "</div>" : "")
      + '<div class="k">Retainage</div><div class="v">' + f.usd(r.retainage_amount || 0, true) + "</div>"
      + '<div class="k">Balance</div><div class="v"><b>' + f.usd(r.balance, true) + "</b>" + ((r.balance || 0) <= 0 ? " " + chip("paid", "ok") : "") + "</div></div>";
    if (r.lines && r.lines.length) {
      var liTot = r2(r.lines.reduce(function (s, l) { return s + (Number(l.this_amount) || 0); }, 0));
      html += drillH("Invoice lines (" + r.lines.length + ")");
      html += '<div class="twrap"><table><thead><tr><th>Bill code</th><th>Description</th><th class="num">Scheduled</th><th class="num">This invoice</th></tr></thead><tbody>'
        + r.lines.map(function (l) { return '<tr><td class="mono">' + esc(l.code) + "</td><td>" + esc(l.desc) + '</td><td class="num">' + f.usd(l.scheduled || 0, true) + '</td><td class="num">' + f.usd(l.this_amount || 0, true) + "</td></tr>"; }).join("")
        + '<tr><td colspan="3"><b>Total</b></td><td class="num"><b>' + f.usd(liTot, true) + "</b></td></tr></tbody></table></div>";
    }
    if (ct) {
      html += drillH("Schedule of values — contract " + ct.contract_id + " (billed / scheduled)");
      html += (ct.sov || []).map(function (l) {
        return rowLine('<span class="mono" style="font-size:11.5px">' + esc(l.bill_code) + '</span><span class="subtle">' + esc(l.description) + '</span><span class="subtle" style="margin-left:auto">' + f.usd(r2((l.prior || 0) + (l.this_period || 0)), true) + " / " + f.usd(l.scheduled_value, true) + "</span>");
      }).join("");
    }
    // receipt history — each row is the journal behind the cash; click → journal drill
    var rcps = ((ctx.linked || {}).receipts || []).filter(function (a) { return a.account === "1200" && (a.memo || "").indexOf(r.invoice_number) >= 0; });
    var LG2 = window.KeystoneLedger;
    function rcpVoided(jid2) { return LG2 && typeof LG2.activity === "function" && LG2.activity().some(function (x) { return x.source === "ar-receipt-void" && x.source_ref === jid2; }); }
    html += drillH("Receipt history (" + rcps.length + ")");
    html += rcps.length ? rcps.map(function (a, ix) {
      var vd = rcpVoided(a.journal_id);
      return '<div class="clk" data-arj="' + ix + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);cursor:pointer" title="Open the receipt journal"><span class="mono" style="font-size:11.5px">' + f.dateShort(a.date) + '</span><span class="subtle" style="flex:1">' + esc(a.memo || "") + '</span><span class="mono" style="margin-left:auto;color:var(--ok)">' + f.usd(a.credit, true) + " →</span>"
        + (vd ? " " + chip("VOIDED", "bad") : (can("payment.void") ? ' <button class="btn danger sm" data-arv="' + ix + '">Void</button>' : "")) + "</div>";
    }).join("") : '<p class="subtle">No receipts applied yet.</p>';
    if (rcps.some(function (a) { return !rcpVoided(a.journal_id); }) && can("payment.void")) {
      html += '<div id="arRvWrap" class="hidden" style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '<span class="subtle" id="arRvLbl" style="min-width:120px"></span>'
        + '<input class="in" id="arRvReason" placeholder="Reason (required — goes on the compensating journal memo)" style="flex:1;min-width:220px" />'
        + '<button class="btn danger sm" id="arRvGo">Confirm — void receipt</button></div>';
    }
    html += notesSection("arInvoices", r.id);
    html += drillH("Provenance");
    html += auditFeedHtml(K, ctx.audit);
    html += '<div class="btnrow" style="margin-top:16px"><button class="btn" id="arPr">⎙ Print invoice</button>' + ((r.balance || 0) > 0 ? '<button class="btn primary" id="arRc">Record receipt — ' + f.usd(r.balance, true) + "</button>" : "") + "</div>";
    if (r.status !== "voided" && can("approval.void")) {
      html += '<div class="btnrow" style="margin-top:10px">' + revControl("arVi", "Void invoice " + r.invoice_number) + "</div>";
    }
    K.drill("AR · " + r.invoice_number, html);
    var db = document.getElementById("drillBody");
    Array.prototype.forEach.call(db.querySelectorAll("[data-arj]"), function (el) {
      el.addEventListener("click", function () { drillJournal(K, rcps[Number(el.getAttribute("data-arj"))].journal_id); });
    });
    // wave-5: per-receipt void (compensating journal) + invoice void
    var arvTarget = null;
    Array.prototype.forEach.call(db.querySelectorAll("[data-arv]"), function (el) {
      el.addEventListener("click", function (ev) {
        ev.stopPropagation();
        arvTarget = rcps[Number(el.getAttribute("data-arv"))] || null;
        var w = document.getElementById("arRvWrap"), lb = document.getElementById("arRvLbl");
        if (w) w.classList.remove("hidden");
        if (lb && arvTarget) lb.textContent = "Voiding receipt " + arvTarget.journal_id + ":";
      });
    });
    bindClick("arRvGo", function () {
      if (!arvTarget) return;
      var reason = V("arRvReason");
      if (!reason) { K.toast("A reason is required — it goes on the compensating journal.", { kind: "warn" }); return; }
      var res = window.KReversals.voidArReceipt(K, r, arvTarget.journal_id, reason);
      revToast(K, res, "Void receipt");
      if (res.ok) { K.reRender(); drillArInv(K, r); }
    });
    bindRev(K, "arVi", function (reason) {
      var res = window.KReversals.voidArInvoice(K, r, reason);
      revToast(K, res, "Void AR invoice");
      if (res.ok) { K.reRender(); drillArInv(K, r); }
    });
    bindClick("arPr", function () { printArInvoice(K, r); });
    bindClick("arRc", function () {
      var bal = r2(r.balance);
      try { L.postJournal({ memo: "Receipt — " + r.invoice_number, source: "ar-receipt", date: TODAY, lines: [{ account: "1000", debit: bal, memo: "Deposit — " + r.customer }, { account: "1200", credit: bal, job_code: r.job_id, memo: "Clear " + r.invoice_number }] }); }
      catch (e) { K.toast(String((e && e.message) || e), { title: "Post failed", kind: "bad" }); return; }
      S.update("arInvoices", r.id, { balance: 0, status: "paid" });
      K.toast(f.usd(bal) + " applied — cash up, A/R cleared, aging updated.", { title: "Receipt recorded", kind: "ok" });
      K.closeDrill(); K.reRender();
    });
    notesBind("arInvoices", r.id);
  }
  function drillVendor(K, v0) {
    var S = K.store, f = K.fmt, O = window.KeystoneOutput;
    var v = S.get("vendors", v0.id) || v0;
    var docs = S.list("complianceDocs", { vendor_id: v.id });
    var commits = S.list("commitments", { vendor_id: v.id });
    var invs = S.list("apInvoices", { vendor_id: v.id });
    var ytdPaid = invs.filter(function (i) { return i.status === "paid"; }).reduce(function (s, i) { return s + (i.amount || 0); }, 0);
    var tinMask = v.tin ? "**-***" + String(v.tin).slice(-4) : "— not on file";
    var html = '<div class="kv">'
      + '<div class="k">Type</div><div class="v">' + chip(v.is_subcontractor ? "subcontractor" : "supplier", "mute") + ' <span class="subtle">' + esc(v.category || "") + "</span></div>"
      + '<div class="k">Terms</div><div class="v">' + esc(v.terms || "—") + " · pays by " + esc(v.pay_method || "check") + "</div>"
      + '<div class="k">TIN</div><div class="v mono">' + esc(tinMask) + "</div>"
      + '<div class="k">Hold</div><div class="v">' + (v.vendor_hold ? chip("PAYMENT HOLD", "bad") : chip("clear", "ok")) + "</div>"
      + (v.prequal_score ? '<div class="k">Prequal</div><div class="v">' + chip(v.prequal_score, v.prequal_score >= 70 ? "ok" : "warn") + "</div>" : "")
      + '<div class="k">YTD paid</div><div class="v">' + f.usd(ytdPaid, true) + "</div></div>"
      + '<div class="btnrow" style="margin-top:14px"><button class="btn sm" id="v1099">⎙ Print 1099-NEC</button><button class="btn sm" id="vNewPo">+ PO for this vendor</button></div>';
    html += drillH("Compliance (" + docs.length + ")");
    html += docs.length ? docs.map(function (d) {
      return rowLine(chip(String(d.doc_type).toUpperCase().replace(/_/g, " "), "mute") + '<span class="subtle">' + esc(d.coverage_limit || "") + '</span><span class="subtle" style="margin-left:auto">' + (d.expires_on ? "exp " + f.dateShort(d.expires_on) : "") + "</span>" + statusChip(d.status));
    }).join("") : '<p class="subtle">No documents on file — payments will hold.</p>';
    html += drillH("Commitments (" + commits.length + ")");
    html += commits.length ? commits.map(function (c) {
      return rowLine('<span class="mono" style="font-size:12px">' + esc(c.reference_no) + "</span>" + chip(c.commitment_type, "mute") + '<span class="subtle">' + esc(c.job_code || "") + '</span><span class="subtle" style="margin-left:auto">' + f.usd(c.original_value, true) + "</span>" + statusChip(c.status));
    }).join("") : '<p class="subtle">None yet.</p>';
    html += drillH("AP invoices (" + invs.length + ")");
    html += invs.length ? invs.map(function (i) {
      return rowLine('<span class="mono" style="font-size:12px">' + esc(i.invoice_number) + '</span><span class="subtle">' + esc(i.job_id || "—") + '</span><span class="subtle" style="margin-left:auto">' + f.usd(i.amount, true) + "</span>" + statusChip(i.status));
    }).join("") : '<p class="subtle">No invoices yet.</p>';
    K.drill("Vendor · " + v.name, html);
    bindClick("v1099", function () { O.print("1099-NEC — " + v.name, O.docs.form1099({ vendor: v.name, tin: tinMask, amount: ytdPaid })); });
    bindClick("vNewPo", function () { poForm(K, { vendor_id: v.id }); });
  }
  var procurement = {
    count: function (K) { return K.store.list("complianceDocs").filter(function (d) { return d.status === "expired" || d.status === "missing"; }).length || null; },
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, O = window.KeystoneOutput;
      mountView(K, mount, function (on) {
        var vendors = S.list("vendors"), subs = S.list("subcontracts"), commits = S.list("commitments"), docs = S.list("complianceDocs");
        var firstPO = commits.filter(function (c) { return c.commitment_type === "PO"; })[0];
        var lapsed = docs.filter(function (d) { return d.status === "expired" || d.status === "missing"; });
        var expSoon = docs.filter(function (d) { if (d.status !== "valid" || !d.expires_on) return false; var days = (new Date(d.expires_on) - new Date(TODAY)) / 86400000; return days <= 30; });

        var vTbl = tbl([{ label: "Vendor", map: function (r) { return "<b>" + esc(r.name) + "</b>"; } }, { label: "Type", map: function (r) { return chip(r.is_subcontractor ? "subcontractor" : "supplier", "mute"); } }, { label: "Category", k: "category" }, { label: "Terms", k: "terms" }, { label: "Prequal", map: function (r) { return r.prequal_score ? chip(r.prequal_score, r.prequal_score >= 70 ? "ok" : "warn") : '<span class="muted">—</span>'; } }, { label: "Hold", map: function (r) { return r.vendor_hold ? chip("HOLD", "bad") : chip("clear", "ok"); } }],
          vendors.map(function (v) { return Object.assign({}, v, { _click: on(function () { drillVendor(K, v); }) }); }));

        var cTbl = tbl([{ label: "Ref", sortVal: function (r) { return r.reference_no; }, map: function (r) { return r.status === "cancelled" ? '<s class="muted" title="Cancelled — ' + esc(r.cancel_reason || "no reason") + '">' + esc(r.reference_no) + "</s>" : esc(r.reference_no); } }, { label: "Type", k: "commitment_type" }, { label: "Vendor", map: function (r) { var v = S.get("vendors", r.vendor_id) || {}; return esc(v.name || r.vendor_id); } }, { label: "Job", k: "job_code" }, { label: "Value", cls: "num", sortVal: function (r) { return r.original_value; }, map: function (r) { return r.status === "cancelled" ? '<s class="muted">' + f.usd(r.original_value) + "</s>" : f.usd(r.original_value); } }, { label: "Status", map: function (r) { return statusChip(r.status); } },
          { label: "", map: function (r) { return '<button class="btn sm" data-click="' + r._pr + '">⎙ PO</button>' + (r.commitment_type === "Subcontract" && r.status === "pending-post" ? ' <button class="btn sm primary" data-click="' + r._post + '">Post subcontract</button>' : "") + (r.status === "draft" ? ' <button class="btn sm primary" data-click="' + r._act + '">Activate</button>' : ""); } }],
          commits.map(function (c) { return Object.assign({}, c, { _click: on(function () { drillCommit(K, c); }), _pr: on(function () { printCommitPo(K, c); }), _post: on(function () { postSubcontract(K, c); }), _act: on(function () { activateDraftCommit(K, c); }) }); }));

        var dTbl = tbl([{ label: "Vendor", map: function (r) { var v = S.get("vendors", r.vendor_id) || {}; return esc(v.name || r.vendor_id); } }, { label: "Document", map: function (r) { return chip(r.doc_type.toUpperCase(), "mute"); } }, { label: "Coverage", k: "coverage_limit" }, { label: "Expires", map: function (r) { return r.expires_on ? f.date(r.expires_on) : '<span class="muted">—</span>'; } }, { label: "Status", map: function (r) { return statusChip(r.status); } }], docs);

        var tools = '<button class="btn sm primary" data-click="' + on(function () { poForm(K, {}); }) + '">+ New PO</button>'
          + '<button class="btn sm" data-click="' + on(function () { vendorForm(K); }) + '">+ New vendor</button>'
          + '<button class="btn sm" data-click="' + on(function () { subcontractForm(K, {}); }) + '">+ New subcontract</button>'
          + (firstPO ? '<button class="btn sm" data-click="' + on(function () { printCommitPo(K, firstPO); }) + '">⎙ Print PO</button> ' : "")
          + (lapsed.length ? chip(lapsed.length + " compliance lapses", "bad") : chip("compliance clear", "ok"));
        return head("Procurement / SCM", "Vendors, subcontracts, commitments and compliance — payments auto-hold on a lapse", tools) +
          grid("g-kpi",
            kpi({ lab: "Vendors", val: vendors.length + "", meta: '<span class="muted">' + vendors.filter(function (v) { return v.is_subcontractor; }).length + " subs</span>" }) +
            kpi({ lab: "Open commitments", val: f.usdShort(commits.reduce(function (s, c) { return s + c.original_value; }, 0)), kind: "info" }) +
            kpi({ lab: "Compliance lapses", val: lapsed.length + "", meta: chip("block payment", lapsed.length ? "bad" : "ok"), kind: lapsed.length ? "bad" : "ok" }) +
            kpi({ lab: "Expiring ≤30d", val: expSoon.length + "", meta: chip("auto-chase", "warn"), kind: "warn" })
          ) +
          grid("g-2", card({ title: "Vendors & subcontractors", sub: "Click a vendor → terms, compliance, commitments, invoices, 1099", body: vTbl }) + card({ title: "Compliance documents", sub: "COI · W-9 · Workers Comp · Lien waivers", body: dTbl })) +
          card({ title: "Commitments — POs & Subcontracts", body: cTbl });
      });
      if (p.id === "new-vendor") vendorForm(K);
      else if (p.id === "new-po") poForm(K, {});
      else if (p.id === "new-sub") subcontractForm(K, {});
    },
  };

  /* ================================================================ INVENTORY */
  function skuForm(K) {
    var S = K.store;
    var supOpts = S.list("vendors").filter(function (v) { return !v.is_subcontractor; }).map(function (v) { return { v: v.id, l: v.name }; });
    drillForm(K, "New SKU", '<div class="form-2">'
      + fld("SKU code", inp("skCode", "text", "", "e.g. AL-LAP-HARBOR"))
      + fld("Description", inp("skDesc", "text", "", "e.g. Prodigy LAP siding — Harbor Blue"))
      + fld("UoM", sel("skUom", ["SQ", "ROLL", "EA", "BOX", "LF"], "SQ"))
      + fld("Category", sel("skCat", ["Siding", "Roofing", "Underlayment", "Trim", "Fasteners"], "Siding"))
      + fld("Standard cost ($)", inp("skCost", "number", "", "0.00"))
      + fld("Default supplier", sel("skSup", supOpts, supOpts[0] && supOpts[0].v)) + "</div>",
      "Create SKU", function () {
        if (!V("skCode") || !V("skDesc")) { K.toast("SKU code and description are required.", { kind: "warn" }); return; }
        S.insert("skus", { sku: V("skCode"), description: V("skDesc"), uom: V("skUom"), category: V("skCat"), standard_cost: VN("skCost"), default_supplier: V("skSup"), cost_code_default: V("skCat") === "Roofing" ? "07310" : "07460", active: true });
        K.toast(V("skCode") + " added to the price book.", { title: "SKU created", kind: "ok" });
        afterCreate(K, "inventory");
      });
  }
  function receiveForm(K) {
    var S = K.store;
    var skuOpts = S.list("skus").map(function (s2) { return { v: s2.sku, l: s2.sku + " — " + s2.description }; });
    drillForm(K, "Receive stock", '<div class="form-2">'
      + fld("SKU", sel("rvSku", skuOpts, skuOpts[0] && skuOpts[0].v))
      + fld("Quantity", inp("rvQty", "number", "", "0"))
      + fld("Location", sel("rvLoc", ["Manassas Yard", "Buford Yard"], "Manassas Yard")) + "</div>",
      "Receive", function () {
        var qty = VN("rvQty"); if (qty <= 0) { K.toast("Quantity must be positive.", { kind: "warn" }); return; }
        var sku = V("rvSku"), loc = V("rvLoc");
        var row = S.list("stockLevels").filter(function (s2) { return s2.sku === sku && s2.location === loc; })[0];
        if (row) S.update("stockLevels", row.id, { qty_on_hand: r2(row.qty_on_hand + qty), qty_available: r2(row.qty_available + qty) });
        else S.insert("stockLevels", { sku: sku, location: loc, qty_on_hand: qty, qty_reserved: 0, qty_available: qty, reorder_point: 0, reorder_qty: 0 });
        K.toast("+" + qty + " × " + sku + " into " + loc + ".", { title: "Stock received", kind: "ok" });
        afterCreate(K, "inventory");
      });
  }
  function issueForm(K) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var skuOpts = S.list("skus").map(function (s2) { return { v: s2.sku, l: s2.sku + " — " + s2.description }; });
    var jOpts = S.list("jobs").map(function (j) { return { v: j.job_code, l: j.job_code + " · " + j.scope }; });
    drillForm(K, "Issue stock to a job", '<div class="form-2">'
      + fld("SKU", sel("isSku", skuOpts, skuOpts[0] && skuOpts[0].v))
      + fld("Quantity", inp("isQty", "number", "", "0"))
      + fld("Job", sel("isJob", jOpts, jOpts[0] && jOpts[0].v)) + "</div>"
      + '<p class="subtle">Issuing decrements the yard and posts material cost to the job ledger (Dr 50050 job cost / Cr inventory asset).</p>',
      "Issue to job", function () {
        var qty = VN("isQty"); if (qty <= 0) { K.toast("Quantity must be positive.", { kind: "warn" }); return; }
        var sku = V("isSku"), job = V("isJob");
        var sk = S.list("skus").filter(function (s2) { return s2.sku === sku; })[0] || {};
        var rows = S.list("stockLevels").filter(function (s2) { return s2.sku === sku; });
        var row = rows.filter(function (s2) { return s2.qty_on_hand >= qty; })[0] || rows[0];
        if (!row || row.qty_on_hand < qty) { K.toast("Not enough on hand (" + (row ? row.qty_on_hand : 0) + " available).", { title: "Short stock", kind: "warn" }); return; }
        S.update("stockLevels", row.id, { qty_on_hand: r2(row.qty_on_hand - qty), qty_available: Math.max(0, r2(row.qty_available - qty)) });
        var cost = r2((sk.standard_cost || 0) * qty);
        var invAcct = L.account("1300") ? "1300" : (L.account("1500") ? "1500" : null);
        if (cost && invAcct) {
          try {
            L.postJournal({ memo: "Material issue " + sku + " → job " + job, source: "inventory", date: todayISO(),
              lines: [{ account: "50050", debit: cost, job_code: job, cost_code: sk.cost_code_default || "07460", category: "M", memo: sku + " × " + qty + " issued from " + row.location },
                      { account: invAcct, credit: cost, memo: "Inventory relief — " + sku }] });
          } catch (e) { K.toast(String(e.message || e), { title: "Post failed", kind: "bad" }); return; }
        }
        K.toast(qty + " × " + sku + " → " + job + " — posts " + f.usd(cost) + " material cost to the job ledger.", { title: "Stock issued", kind: "ok" });
        afterCreate(K, "inventory");
      });
  }
  function assetForm(K) {
    var S = K.store;
    drillForm(K, "New asset", '<div class="form-2">'
      + fld("Name", inp("eqName", "text", "", "e.g. Skyjack lift SJ-3219"))
      + fld("Category", sel("eqCat", ["Vehicle", "Access", "Tools", "Machine"], "Access"))
      + fld("Own / rent", sel("eqOwn", ["owned", "rented"], "owned"))
      + fld("Rate/hr ($)", inp("eqRate", "number", "", "0.00"))
      + fld("Location", sel("eqLoc", ["Manassas Yard", "Buford Yard"], "Manassas Yard")) + "</div>",
      "Add asset", function () {
        if (!V("eqName")) { K.toast("Name is required.", { kind: "warn" }); return; }
        S.insert("equipment", { name: V("eqName"), category: V("eqCat"), serial: "—", owned_or_rented: V("eqOwn"), hourly_rate: VN("eqRate"), status: "available", current_location: V("eqLoc") });
        K.toast(V("eqName") + " added to the register.", { title: "Asset added", kind: "ok" });
        afterCreate(K, "inventory");
      });
  }
  var inventory = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt;
      mountView(K, mount, function (on) {
        var skus = S.list("skus"), stock = S.list("stockLevels"), eq = S.list("equipment");
        var low = stock.filter(function (s) { return s.qty_available <= s.reorder_point; });
        var sTbl = tbl([{ label: "SKU", map: function (r) { return '<span class="mono">' + esc(r.sku) + "</span>"; } }, { label: "Description", k: "description" }, { label: "UoM", k: "uom" }, { label: "Category", map: function (r) { return chip(r.category, "mute"); } }, { label: "Std cost", cls: "num", map: function (r) { return f.usd(r.standard_cost, true); } }], skus);
        var stTbl = tbl([{ label: "SKU", map: function (r) { return '<span class="mono">' + esc(r.sku) + "</span>"; } }, { label: "Location", k: "location" }, { label: "On hand", cls: "num", k: "qty_on_hand" }, { label: "Reserved", cls: "num", k: "qty_reserved" }, { label: "Available", cls: "num", sortVal: function (r) { return r.qty_available; }, map: function (r) { return '<b style="color:var(--' + (r.qty_available <= r.reorder_point ? "bad" : "txt") + ')">' + r.qty_available + "</b>"; } }, { label: "Reorder", map: function (r) { return r._re ? '<button class="btn sm" data-click="' + r._re + '">REORDER ' + r.reorder_qty + "</button>" : chip("ok", "ok"); } }],
          stock.map(function (r) {
            if (r.qty_available > r.reorder_point) return r;
            var sk = skus.filter(function (x) { return x.sku === r.sku; })[0] || {};
            return Object.assign({}, r, { _re: on(function () {
              // Reorder chip → prefilled New PO: vendor left blank, qty = reorder_qty, description = SKU
              poForm(K, { vendor_blank: true, cost_code: sk.cost_code_default, amount: r2((sk.standard_cost || 0) * (r.reorder_qty || 0)), description: r.sku + " × " + r.reorder_qty + " " + (sk.uom || "") + " (reorder — " + r.location + ")" });
            }) });
          }));
        var eTbl = tbl([{ label: "Asset", map: function (r) { return "<b>" + esc(r.name) + "</b>"; } }, { label: "Category", map: function (r) { return chip(r.category, "mute"); } }, { label: "Own/Rent", k: "owned_or_rented" }, { label: "Rate/hr", cls: "num", map: function (r) { return r.hourly_rate ? f.usd(r.hourly_rate, true) : "—"; } }, { label: "Status", map: function (r) { return statusChip(r.status); } }, { label: "Location", map: function (r) { return esc(r.job_code || r.current_location); } }], eq);
        var tools = '<button class="btn sm primary" data-click="' + on(function () { receiveForm(K); }) + '">Receive stock</button>'
          + '<button class="btn sm" data-click="' + on(function () { issueForm(K); }) + '">Issue to job</button>'
          + '<button class="btn sm" data-click="' + on(function () { skuForm(K); }) + '">+ New SKU</button>'
          + '<button class="btn sm" data-click="' + on(function () { assetForm(K); }) + '">+ New asset</button> '
          + chip("differentiator vs CMiC", "brand");
        return head("Inventory & Assets", "Materials, price books, warehouse stock and the equipment register — the layer CMiC handles thinly", tools) +
          grid("g-kpi",
            kpi({ lab: "SKUs", val: skus.length + "" }) +
            kpi({ lab: "Stock value", val: f.usdShort(stock.reduce(function (s, r) { var sk = S.list("skus").filter(function (x) { return x.sku === r.sku; })[0] || {}; return s + (sk.standard_cost || 0) * r.qty_on_hand; }, 0)), kind: "info" }) +
            kpi({ lab: "Low stock", val: low.length + "", meta: chip("reorder", low.length ? "warn" : "ok"), kind: low.length ? "warn" : "ok" }) +
            kpi({ lab: "Equipment", val: eq.length + "", meta: '<span class="muted">' + eq.filter(function (e) { return e.status === "on_job"; }).length + " on jobs</span>" })
          ) +
          grid("g-2", card({ title: "Warehouse stock", sub: "Reorder points auto-flag · issue posts cost to the job", body: stTbl }) + card({ title: "Equipment register", sub: "Job-cost allocated by timecard", body: eTbl })) +
          card({ title: "Materials catalog & price book", body: sTbl });
      });
      if (p.id === "new-sku") skuForm(K);
      else if (p.id === "receive") receiveForm(K);
      else if (p.id === "issue") issueForm(K);
      else if (p.id === "new-asset") assetForm(K);
    },
  };

  /* ================================================================== FINANCE */
  var AP_CAT_ACCT = { M: "50050", L: "50000", E: "50075", S: "50100" };
  function apAcctFor(cat) {
    var L = window.KeystoneLedger;
    var a = AP_CAT_ACCT[cat] || "50050";
    if (L && typeof L.account === "function" && !L.account(a)) a = "50050";
    return a;
  }
  // Deep AP form — items auto-fill from the job's open commitments (or budget
  // lines) the moment a job is matched; header amount ties to the items with a
  // live mismatch warning; GL distribution previews before anything posts.
  function apInvoiceForm(K) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var vOpts = S.list("vendors").map(function (v) { return { v: v.id, l: v.name }; });
    var jOpts = [{ v: "", l: "— overhead / no job —" }].concat(jobOptsOf(K));
    var ccOpts = S.list("costCodes").map(function (c) { return { v: c.code, l: c.code }; });
    var catOpts = S.list("categories").map(function (c) { return { v: c.category_code, l: c.category_code + " — " + c.name }; });
    function apLinesFromJob(jobCode) {
      if (!jobCode) return [];
      var open = S.list("commitments").filter(function (c) { return c.job_code === jobCode && c.status !== "closed"; });
      if (open.length) {
        return open.map(function (c) {
          var remaining = Math.max(0, r2((Number(c.original_value) || 0) - (Number(c.invoiced_to_date) || 0)));
          return { desc: c.commitment_type + " " + c.reference_no + (c.description ? " — " + c.description : ""), cost_code: c.cost_code || "07460", category: c.category || "M", qty: 1, unit_cost: remaining, amount: remaining };
        });
      }
      return S.list("budgetLines", { job_code: jobCode }).map(function (b) {
        var remaining = Math.max(0, r2((Number(b.current_cost) || 0) - (Number(b.spent) || 0)));
        return { desc: b.description, cost_code: b.cost_code, category: b.category, qty: 1, unit_cost: remaining, amount: remaining };
      });
    }
    var html = '<div class="form-2">'
      + fld("Vendor (type to search)", typeahead("apV", vOpts, vOpts[0] && vOpts[0].v))
      + fld("Invoice number", inp("apNo", "text", "", "vendor invoice #"))
      + fld("Invoice date", inp("apDate", "date", todayISO()))
      + fld("Due date", inp("apDue", "date", plusDays(30)))
      + fld("Job (type to search)", typeahead("apJ", jOpts, "", "— overhead / no job —"))
      + fld("Source", sel("apSrc", [{ v: "manual", l: "Manual entry" }, { v: "email", l: "Email intake" }, { v: "ocr_pdf", l: "OCR (PDF)" }], "manual"))
      + fld("Bills against (PO / WO)", '<select class="in" id="apPo"><option value="">— no PO/WO match —</option></select>')
      + fld("GL category (M/L/E/S — defaults from the match)", sel("apCat", catOpts, "M"))
      + fld("Header amount ($)", inp("apAmt", "number", "", "0.00"))
      + fld("Retainage held ($ — subs)", inp("apRetH", "number", 0))
      + "</div>"
      + drillH("Line items — auto-fill from the job's open commitments / budget lines")
      + itemsEditor({ id: "apItems", columns: [
          { k: "desc", label: "Description", type: "text", width: "minmax(150px,2.2fr)" },
          { k: "cost_code", label: "Cost code", type: "select", options: ccOpts, width: "86px" },
          { k: "category", label: "Cat", type: "select", options: catOpts, width: "72px" },
          { k: "qty", label: "Qty", type: "num", width: "60px" },
          { k: "unit_cost", label: "Unit cost", type: "num", width: "88px" },
          { k: "amount", label: "Amount", type: "num", width: "96px" },
        ], rows: [], totalKeys: ["amount"] })
      + '<div id="apTie" class="btnrow" style="margin:4px 0 10px"></div>'
      + drillH("GL distribution preview — what posts on approval")
      + '<div id="apGl" class="subtle" style="font-size:12px"></div>'
      + '<p class="subtle" style="margin-top:12px">Manual entries skip the OCR intake workflow; a money approval is queued in the Action Hub — nothing pays without a human.</p>';
    var armed = { on: false };
    drillForm(K, "New AP invoice", html, "Record invoice", function () {
      var v = S.get("vendors", typeaheadVal("apV")) || {};
      if (!v.id) { K.toast("Pick a vendor from the list.", { kind: "warn" }); return; }
      var rows = itemsEditorRows("apItems").filter(function (r) { return r.desc && (Number(r.amount) || 0) > 0; });
      var itemTot = r2(rows.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0));
      var amt = VN("apAmt") || itemTot;
      if (!amt) { K.toast("Amount is required (header or at least one item line).", { kind: "warn" }); return; }
      if (rows.length && Math.abs(itemTot - amt) > 0.005 && !armed.on) {
        armed.on = true;
        var b = document.getElementById("fGo");
        if (b) b.textContent = "Record anyway — items " + f.usd(itemTot, true) + " ≠ header " + f.usd(amt, true);
        K.toast("Items total " + f.usd(itemTot, true) + " does not tie to the header amount " + f.usd(amt, true) + " — click again to record with the mismatch on the record.", { title: "Amount mismatch", kind: "warn" });
        return;
      }
      var no = V("apNo") || ("MAN-" + Date.now().toString(36).toUpperCase());
      // duplicate guard: exact same vendor + invoice number is blocked outright
      var dupe = S.list("apInvoices").filter(function (i) { return (i.vendor_id === v.id || i.vendor === v.name) && String(i.invoice_number) === String(no); })[0];
      if (dupe) { K.toast(no + " already exists for " + v.name + " (" + f.usd(dupe.amount, true) + " · " + dupe.status + ") — not recorded.", { title: "Duplicate invoice blocked", kind: "bad" }); return; }
      var jobSel = typeaheadVal("apJ") || null;
      var poRef = V("apPo") || null;   // #13: the match writes po_ref so the chip persists
      // silent: manual entry must not fire the OCR 3-way-match workflow — its approval is created explicitly below
      S.insert("apInvoices", { vendor_id: v.id, vendor: v.name, invoice_number: no, job_id: jobSel, amount: amt,
        invoice_date: V("apDate") || todayISO(), due_date: V("apDue") || plusDays(30), source_channel: V("apSrc") || "manual",
        po_ref: poRef, match_status: poRef ? "matched" : "no_po", category: V("apCat") || "M",
        status: "pending-approval", lines: rows, retainage_held: VN("apRetH") || 0 }, { silent: true });
      S.insert("approvals", { title: "Pay " + v.name + " — " + no, tier: "money", amount: amt, status: "pending", vendor: v.name, job_code: jobSel, detail: "Manually entered AP invoice (" + rows.length + " lines" + (poRef ? ", matched to " + poRef : "") + "). Approving posts the voucher to the ledger by category.", workflow: "Manual AP entry", createdBy: (K.session() || {}).name || "user" });
      K.toast(no + " · " + f.usd(amt) + " · " + rows.length + " lines recorded" + (poRef ? " · matched to " + poRef : "") + " — payment approval queued in the Action Hub.", { title: "AP invoice", kind: "ok" });
      afterCreate(K, "finance/ap");
    });
    function apRefresh() {
      var rows = itemsEditorRows("apItems").filter(function (r) { return (Number(r.amount) || 0) > 0; });
      var itemTot = r2(rows.reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0));
      var hdr = VN("apAmt");
      var tie = document.getElementById("apTie");
      if (tie) {
        var inner;
        if (!rows.length) inner = chip("no item lines yet", "mute");
        else if (!hdr) inner = chip("items " + f.usd(itemTot, true) + " — header empty (will use items total)", "info");
        else if (Math.abs(itemTot - hdr) < 0.005) inner = chip("items tie to header " + f.usd(hdr, true) + " ✓", "ok");
        else inner = chip("items " + f.usd(itemTot, true) + " ≠ header " + f.usd(hdr, true) + " (Δ " + f.usd(r2(itemTot - hdr), true) + ")", "bad");
        tie.innerHTML = inner + ' <button type="button" class="btn sm" id="apUseTot">Use items total</button>';
        bindClick("apUseTot", function () { var e2 = document.getElementById("apAmt"); if (e2) e2.value = itemTot; apRefresh(); });
      }
      armed.on = false;
      var go = document.getElementById("fGo"); if (go) go.textContent = "Record invoice";
      var gl = document.getElementById("apGl");
      if (gl) {
        if (!rows.length) gl.innerHTML = "Add item lines to preview the journal.";
        else {
          var byAcct = {}, jobId = typeaheadVal("apJ");
          rows.forEach(function (r) {
            var a = apAcctFor(r.category);
            byAcct[a] = r2((byAcct[a] || 0) + (Number(r.amount) || 0));
          });
          var ret = VN("apRetH") || 0;
          var out = Object.keys(byAcct).map(function (a) {
            var nm = (L.account(a) || {}).account_name || a;
            return '<div style="display:flex;justify-content:space-between;padding:2px 0"><span>Dr ' + a + " — " + esc(nm) + (jobId ? ' <span class="muted">(job ' + esc(jobId) + ")</span>" : "") + '</span><span class="mono">' + f.usd(byAcct[a], true) + "</span></div>";
          });
          // #10 guard: category account missing from the chart → visible fallback
          var fell = [];
          rows.forEach(function (r) {
            var want = AP_CAT_ACCT[r.category];
            if (want && apAcctFor(r.category) !== want && fell.indexOf(want) < 0) fell.push(want);
          });
          if (fell.length) out.push('<div style="padding:4px 0">' + chip("account " + fell.join(", ") + " absent from chart — coding falls back to 50050", "warn") + "</div>");
          if (ret > 0) out.push('<div style="display:flex;justify-content:space-between;padding:2px 0"><span>Cr 2300 — Retainage Payable</span><span class="mono">' + f.usd(ret, true) + "</span></div>");
          out.push('<div style="display:flex;justify-content:space-between;padding:2px 0;border-top:1px solid var(--line)"><span>Cr 2000 — Accounts Payable</span><span class="mono">' + f.usd(r2(itemTot - (ret > 0 ? ret : 0)), true) + "</span></div>");
          gl.innerHTML = out.join("");
        }
      }
    }
    itemsEditorBind("apItems", function () {
      var st = IE_REG["apItems"], el = document.getElementById("apItems");
      if (st && el) {
        var dirty = false;
        st.rows.forEach(function (r, i) {
          var q = Number(r.qty) || 0, u = Number(r.unit_cost) || 0;
          if (q > 0 && u > 0) {
            var amt = r2(q * u);
            if (Math.abs(amt - (Number(r.amount) || 0)) > 0.004) {
              r.amount = amt; dirty = true;
              var cell = el.querySelector('[data-iek="amount"][data-ier="' + i + '"]');
              if (cell && cell !== document.activeElement) cell.value = amt;
            }
          }
        });
        if (dirty) ieRefreshTotals("apItems");
      }
      apRefresh();
    });
    // #13: match select — po_ref exact OR vendor+job across commitments AND
    // posted subcontracts; single candidate auto-selects; category defaults.
    var apMatchCands = [];
    function setCatBulk(cat) {
      var catEl = document.getElementById("apCat");
      if (catEl && cat) catEl.value = cat;
      var st = IE_REG.apItems;
      if (st && st.rows.length && cat) {
        var rows2 = st.rows.map(function (r) { return Object.assign({}, r, { category: cat }); });
        ieSetRows("apItems", rows2);
      }
      apRefresh();
    }
    function refreshMatch() {
      var el = document.getElementById("apPo");
      if (!el) return;
      var prior = el.value;
      apMatchCands = matchCandidatesFor(K, typeaheadVal("apV"), null, typeaheadVal("apJ"), null);
      el.innerHTML = '<option value="">— no PO/WO match (' + apMatchCands.length + " candidate" + (apMatchCands.length === 1 ? "" : "s") + ") —</option>"
        + apMatchCands.map(function (cd) { return '<option value="' + esc(cd.ref) + '">' + esc(cd.kind + " · " + cd.label) + "</option>"; }).join("");
      var keep = apMatchCands.some(function (cd) { return cd.ref === prior; });
      if (keep) el.value = prior;
      else if (apMatchCands.length === 1) { el.value = apMatchCands[0].ref; setCatBulk(apMatchCands[0].category); }
      else el.value = "";
    }
    typeaheadBind("apJ", function (jobCode) { ieSetRows("apItems", apLinesFromJob(jobCode)); refreshMatch(); });
    typeaheadBind("apV", function () { refreshMatch(); });
    var apPoEl = document.getElementById("apPo"), apCatEl = document.getElementById("apCat");
    if (apPoEl) apPoEl.addEventListener("change", function () {
      var cd = null;
      apMatchCands.forEach(function (x) { if (!cd && x.ref === apPoEl.value) cd = x; });
      if (cd) setCatBulk(cd.category); else apRefresh();
    });
    if (apCatEl) apCatEl.addEventListener("change", function () { setCatBulk(apCatEl.value); });
    var apAmtEl = document.getElementById("apAmt"), apRetEl = document.getElementById("apRetH");
    if (apAmtEl) apAmtEl.addEventListener("input", apRefresh);
    if (apRetEl) apRetEl.addEventListener("input", apRefresh);
    refreshMatch();
    apRefresh();
  }
  // Deep AR form — items auto-fill from the job's contract SOV (billing codes,
  // scheduled values, cost-basis % complete → this-period suggestion).
  function arInvoiceForm(K, presetJob) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var cOpts = S.list("accounts").map(function (a) { return { v: a.id, l: a.legal_name }; });
    var jOpts = jobOptsOf(K);
    function arLinesFromJob(jobCode) {
      var ct = S.list("contracts").filter(function (c) { return c.job_id === jobCode; })[0];
      var jp = (L && typeof L.jobProgress === "function") ? L.jobProgress(jobCode) : null;
      var pct = jp && isFinite(jp.pctComplete) ? jp.pctComplete : 0;
      if (ct && (ct.sov || []).length) {
        return ct.sov.map(function (l) {
          var btd = r2((Number(l.prior) || 0) + (Number(l.this_period) || 0));
          var sched = Number(l.scheduled_value) || 0;
          var sugg = Math.max(0, r2(r2(sched * pct / 100) - btd));
          return { code: l.bill_code, desc: l.description, scheduled: sched, this_amount: sugg };
        });
      }
      var j = S.list("jobs").filter(function (x) { return x.job_code === jobCode; })[0] || {};
      var contract = Number(j.contract_amount) || 0;
      var billed = (L && typeof L.jobBilled === "function") ? L.jobBilled(jobCode) : 0;
      return [{ code: jobCode + ".01", desc: "Contract billing — job " + jobCode, scheduled: contract, this_amount: Math.max(0, r2(r2(contract * pct / 100) - billed)) }];
    }
    var initJob = presetJob || (jOpts[0] && jOpts[0].v);
    var initCust = cOpts[0] && cOpts[0].v;
    if (presetJob) {
      var pj = S.list("jobs").filter(function (x) { return x.job_code === presetJob; })[0];
      var ppr = pj ? S.get("projects", pj.project_id) : null;
      if (ppr && ppr.customer_id) initCust = ppr.customer_id;
    }
    var html = '<div class="form-2">'
      + fld("Customer (type to search)", typeahead("arC", cOpts, initCust))
      + fld("Job (type to search)", typeahead("arJ", jOpts, initJob))
      + fld("Invoice date", inp("arDate", "date", todayISO()))
      + fld("Due date", inp("arDue", "date", plusDays(30)))
      + fld("Retainage %", inp("arRet", "number", 10))
      + fld("Post to GL now (Dr 1200 / Cr 4000)", sel("arPost", [{ v: "yes", l: "Yes — post revenue" }, { v: "no", l: "No — draft only" }], "yes"))
      + "</div>"
      + drillH("Billing lines — from the contract SOV · this-period suggested from cost-basis % complete")
      + itemsEditor({ id: "arItems", columns: [
          { k: "code", label: "Bill code", type: "text", width: "minmax(96px,1fr)" },
          { k: "desc", label: "Description", type: "text", width: "minmax(140px,2fr)" },
          { k: "scheduled", label: "Scheduled", type: "num", width: "96px" },
          { k: "this_amount", label: "This invoice", type: "num", width: "96px" },
        ], rows: arLinesFromJob(initJob), totalKeys: ["scheduled", "this_amount"] })
      + '<div id="arTie" class="btnrow" style="margin:4px 0 8px"></div>';
    drillForm(K, "New AR invoice", html, "Create invoice", function () {
      var rows = itemsEditorRows("arItems").filter(function (r) { return (Number(r.this_amount) || 0) > 0; });
      var amt = r2(rows.reduce(function (s, r) { return s + (Number(r.this_amount) || 0); }, 0));
      if (!amt) { K.toast("Enter at least one this-invoice amount on a line.", { kind: "warn" }); return; }
      var over = rows.filter(function (r) { return (Number(r.scheduled) || 0) > 0 && (Number(r.this_amount) || 0) > (Number(r.scheduled) || 0); });
      if (over.length) { K.toast(over.length + " line(s) bill more than their scheduled value — trim them first.", { title: "Over scheduled value", kind: "warn" }); return; }
      var acct = S.get("accounts", typeaheadVal("arC")) || {};
      if (!acct.id) { K.toast("Pick a customer from the list.", { kind: "warn" }); return; }
      var arJob = typeaheadVal("arJ");
      var mx = 8386; S.list("arInvoices").forEach(function (i) { var m = /(\d+)/.exec(String(i.invoice_number || "")); if (m) mx = Math.max(mx, parseInt(m[1], 10)); });
      var no = "AR" + (mx + 1);
      var ret = r2(amt * VN("arRet") / 100);
      S.insert("arInvoices", { invoice_number: no, customer_id: acct.id, customer: acct.legal_name, job_id: arJob,
        invoice_date: V("arDate") || todayISO(), due_date: V("arDue") || plusDays(30), sales_amount: amt, balance: amt,
        retainage_amount: ret, status: "open", lines: rows });
      if (V("arPost") === "yes") {
        try { L.postJournal({ memo: no + " — " + acct.legal_name, source: "ar", date: V("arDate") || todayISO(), lines: [{ account: "1200", debit: amt, job_code: arJob, memo: no + " — " + acct.legal_name }, { account: "4000", credit: amt, job_code: arJob, memo: "Revenue — " + arJob }] }); }
        catch (e) { K.toast(String(e.message || e), { title: "Post failed", kind: "bad" }); return; }
      }
      K.toast(no + " · " + f.usd(amt) + " · " + rows.length + " lines · retainage " + f.usd(ret, true) + (V("arPost") === "yes" ? " — posted to A/R + revenue." : " — drafted."), { title: "AR invoice", kind: "ok" });
      afterCreate(K, "finance/ar");
    });
    function arRefresh() {
      var rows = itemsEditorRows("arItems");
      var amt = r2(rows.reduce(function (s, r) { return s + (Number(r.this_amount) || 0); }, 0));
      var ret = r2(amt * VN("arRet") / 100);
      var el = document.getElementById("arTie");
      if (el) el.innerHTML = chip("this invoice " + f.usd(amt, true), amt ? "info" : "mute") + " " + chip("retainage " + f.usd(ret, true), "warn") + " " + chip("net due " + f.usd(r2(amt - ret), true), "ok");
    }
    itemsEditorBind("arItems", arRefresh);
    typeaheadBind("arJ", function (jobCode) { ieSetRows("arItems", arLinesFromJob(jobCode)); });
    var arRetEl2 = document.getElementById("arRet");
    if (arRetEl2) arRetEl2.addEventListener("input", arRefresh);
    arRefresh();
  }
  function receiptForm(K, job) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var open = S.list("arInvoices").filter(function (i) { return (i.balance || 0) > 0; });
    if (job && job.job_code) {
      var fam = familyCodesOf(K, job);
      var scoped = open.filter(function (i) { return fam.indexOf(i.job_id) >= 0; });
      if (scoped.length) open = scoped;   // fall back to all when the job has none
    }
    if (!open.length) { K.toast("No open A/R invoices to receipt.", { kind: "warn" }); return; }
    var iOpts = open.map(function (i) { return { v: i.id, l: i.invoice_number + " — " + i.customer + " · " + f.usd(i.balance, true) }; });
    drillForm(K, "Record customer receipt", fld("Invoice", sel("rcI", iOpts, iOpts[0].v))
      + '<p class="subtle">Posts Dr 1000 Cash / Cr 1200 A/R for the full open balance and marks the invoice paid.</p>',
      "Record receipt", function () {
        var inv = S.get("arInvoices", V("rcI")); if (!inv) return;
        var bal = r2(inv.balance);
        try { L.postJournal({ memo: "Receipt — " + inv.invoice_number, source: "ar-receipt", date: todayISO(), lines: [{ account: "1000", debit: bal, memo: "Deposit — " + inv.customer }, { account: "1200", credit: bal, job_code: inv.job_id, memo: "Clear " + inv.invoice_number }] }); }
        catch (e) { K.toast(String(e.message || e), { title: "Post failed", kind: "bad" }); return; }
        S.update("arInvoices", inv.id, { balance: 0, status: "paid" });
        K.toast(f.usd(bal) + " applied — cash up, A/R cleared, aging updated.", { title: "Receipt recorded", kind: "ok" });
        afterCreate(K, "finance/ar");
      });
  }
  function journalForm(K) {
    var S = K.store, L = window.KeystoneLedger, f = K.fmt;
    var accts = S.list("glAccounts");
    var lines = [{ account: "1000", debit: "", credit: "" }, { account: "1000", debit: "", credit: "" }];
    var memoVal = "", dateVal = todayISO();
    function read() {
      var db = document.getElementById("drillBody"); if (!db) return;
      Array.prototype.forEach.call(db.querySelectorAll("[data-jf]"), function (el) {
        var i = Number(el.getAttribute("data-ji"));
        if (lines[i]) lines[i][el.getAttribute("data-jf")] = el.value;
      });
      memoVal = V("jMemo"); dateVal = V("jDate") || dateVal;
    }
    function totals() {
      var td = 0, tc = 0;
      lines.forEach(function (l) { td += Number(l.debit) || 0; tc += Number(l.credit) || 0; });
      return { td: r2(td), tc: r2(tc), ok: r2(td) > 0 && Math.abs(td - tc) < 0.005 };
    }
    function updateBar() {
      var t = totals(), el = document.getElementById("jBal");
      if (el) el.innerHTML = "Dr " + f.usd(t.td, true) + " · Cr " + f.usd(t.tc, true) + " " + (t.ok ? chip("balanced", "ok") : chip("out of balance " + f.usd(r2(t.td - t.tc), true), "bad"));
      var go = document.getElementById("jGo"); if (go) go.disabled = !t.ok;
    }
    function paint() {
      var rows = lines.map(function (l, i) {
        return '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:8px">'
          + '<select class="in" data-jf="account" data-ji="' + i + '">' + accts.map(function (a) { return '<option value="' + esc(a.account_code) + '"' + (String(a.account_code) === String(l.account) ? " selected" : "") + ">" + esc(a.account_code + " — " + a.account_name) + "</option>"; }).join("") + "</select>"
          + '<input class="in" data-jf="debit" data-ji="' + i + '" type="number" step="0.01" placeholder="Debit" value="' + esc(l.debit) + '" />'
          + '<input class="in" data-jf="credit" data-ji="' + i + '" type="number" step="0.01" placeholder="Credit" value="' + esc(l.credit) + '" />'
          + "</div>";
      }).join("");
      K.drill("Manual journal entry", '<div class="form-2">'
        + fld("Date", '<input class="in" id="jDate" type="date" value="' + esc(dateVal) + '" />')
        + fld("Memo", '<input class="in" id="jMemo" value="' + esc(memoVal) + '" placeholder="Why this entry exists" />') + "</div>"
        + '<div class="subtle" style="margin:2px 0 8px">Lines — each needs an account and a debit OR credit. Posting is blocked until balanced.</div>'
        + rows
        + '<div class="btnrow"><button class="btn sm" id="jAdd">+ line</button><span id="jBal" class="subtle" style="margin-left:auto"></span></div>'
        + '<div class="btnrow" style="margin-top:16px"><button class="btn primary" id="jGo" disabled>Post journal</button></div>');
      var db = document.getElementById("drillBody");
      Array.prototype.forEach.call(db.querySelectorAll("[data-jf]"), function (el) {
        el.addEventListener("input", function () { read(); updateBar(); });
        el.addEventListener("change", function () { read(); updateBar(); });
      });
      bindClick("jAdd", function () { read(); lines.push({ account: accts[0] ? accts[0].account_code : "1000", debit: "", credit: "" }); paint(); });
      bindClick("jGo", function () {
        read();
        var use = lines.filter(function (l) { return l.account && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0); })
          .map(function (l) { return { account: l.account, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: memoVal }; });
        if (use.length < 2) { K.toast("A journal needs at least two lines.", { kind: "warn" }); return; }
        try { L.postJournal({ memo: memoVal || "Manual journal", source: "manual-journal", date: dateVal, lines: use }); }
        catch (e) { K.toast(String(e.message || e), { title: "Post failed", kind: "bad" }); return; }
        K.toast("Journal posted — trial balance updated live.", { title: "Posted", kind: "ok" });
        afterCreate(K, "finance/gl");
      });
      updateBar();
    }
    paint();
  }
  function curCheckFormat(K) { return localStorage.getItem("keystone.checkFormat") || ((K.T.print || {}).checkFormat) || "figures-top-2"; }
  function checkFormatDrill(K) {
    var O = window.KeystoneOutput;
    var cur = curCheckFormat(K);
    var fmts = (O && O.checkFormats) || [];
    var bank = K.T.banking || {};
    var html = '<p class="muted" style="margin:0 0 12px">Check stock: ' + esc(bank.bank_name || "pre-printed stock") + " · routing " + esc(bank.routing_masked || "—") + " · acct " + esc(bank.account_masked || "—") + "</p>";
    if (!fmts.length) html += empty("⎙", "Format catalog not loaded", "KeystoneOutput.checkFormats ships with the output engine — current selection: " + cur + ".");
    else html += fmts.map(function (x, i) {
      var onSel = x.id === cur;
      return '<div class="clk" data-fmt="' + i + '" style="display:flex;gap:12px;align-items:center;padding:12px 12px;border:1px solid var(--' + (onSel ? "brand" : "line") + ');border-radius:11px;margin-bottom:10px;cursor:pointer">'
        + '<span style="font-size:15px">' + (onSel ? "●" : "○") + "</span>"
        + "<span><b>" + esc(x.label || x.id) + '</b><div class="subtle">position ' + esc(x.position || "—") + " · stubs " + esc(x.stubs == null ? "—" : String(x.stubs)) + " · face " + esc(x.face || "—") + "</div></span>"
        + (onSel ? '<span style="margin-left:auto">' + chip("current", "ok") + "</span>" : "")
        + "</div>";
    }).join("");
    K.drill("Check print format", html);
    var db = document.getElementById("drillBody");
    Array.prototype.forEach.call(db.querySelectorAll("[data-fmt]"), function (el) {
      el.addEventListener("click", function () {
        var x = fmts[Number(el.getAttribute("data-fmt"))];
        localStorage.setItem("keystone.checkFormat", x.id);
        K.toast("Checks now print in the " + (x.label || x.id) + " format.", { title: "Check format", kind: "ok" });
        K.reRender();
        checkFormatDrill(K);
      });
    });
  }
  var finance = {
    render: function (K, p, mount) {
      var S = K.store, L = window.KeystoneLedger, f = K.fmt, O = window.KeystoneOutput;
      // sub-route convention: p.id is the tab, so create routes are "<tab>-new"
      var tab = p.id || "ap", routeOpen = null;
      if (tab === "ap-new") { tab = "ap"; routeOpen = function () { apInvoiceForm(K); }; }
      else if (tab === "ar-new") { tab = "ar"; routeOpen = function () { arInvoiceForm(K); }; }
      else if (tab === "gl-new") { tab = "gl"; routeOpen = function () { journalForm(K); }; }
      if (["ap", "payments", "ar", "gl"].indexOf(tab) < 0) tab = "ap";
      var tools = "";
      mountView(K, mount, function (on) {
        function tabBar(cur) { return '<div class="tabs">' + [["ap", "Accounts Payable"], ["payments", "Payments"], ["ar", "Accounts Receivable"], ["gl", "General Ledger"]].map(function (t) { return '<div class="tab ' + (cur === t[0] ? "on" : "") + '" data-click="' + on(function () { K.go("finance/" + t[0]); }) + '">' + t[1] + "</div>"; }).join("") + "</div>"; }

        var body = "";
        if (tab === "ap") {
          var inv = S.list("apInvoices"); var exc = inv.filter(function (i) { return i.status === "hold" || i.match_status === "exception" || i.match_status === "no_po"; });
          // Approved-only: executed (paid) invoices must never re-enter a payment batch.
          var payable = inv.filter(function (i) { return i.status === "approved"; });
          var paidHist = inv.filter(function (i) { return i.status === "paid"; });
          var regPaid = false; try { regPaid = localStorage.getItem("keystone.reg.includePaid") === "1"; } catch (e0) {}
          var dupCount = {};
          inv.forEach(function (i) { var k2 = (i.vendor_id || i.vendor) + "|" + i.invoice_number; dupCount[k2] = (dupCount[k2] || 0) + 1; });
          // Shared deep drill (drillApInv) — one assembler serves the AP tab,
          // the PO drill, sub-draws and milestone children (wave-4 refactor).
          function apDueOf(r) { return apDueOfInv(r); }
          function chkFor(r) { return apChkFor(r); }
          function grFor(r) { return apGrFor(K, r); }
          function drillAp(r) { drillApInv(K, r); }
          var iTbl = tbl([
            { label: "Invoice", sortVal: function (r) { return r.invoice_number; }, map: function (r) { return '<span class="mono">' + esc(r.invoice_number) + "</span>" + (dupCount[(r.vendor_id || r.vendor) + "|" + r.invoice_number] > 1 ? " " + chip("possible dup", "bad") : ""); } },
            { label: "Vendor", k: "vendor" },
            { label: "Job", k: "job_id" },
            { label: "Date", sortVal: function (r) { return r.invoice_date || ""; }, map: function (r) { return '<span class="mono">' + f.dateShort(r.invoice_date) + "</span>"; } },
            { label: "Due", sortVal: function (r) { return apDueOf(r) || ""; }, map: function (r) { return '<span class="mono">' + f.dateShort(apDueOf(r)) + "</span>"; } },
            { label: "Source", map: function (r) { return chip(r.source_channel === "ocr_pdf" ? "OCR" : r.source_channel, "mute"); } },
            { label: "Match", map: function (r) { var m = statusChip(r.match_status); var gr = grFor(r); if (gr && gr.length) m += ' <span class="chip ok" title="' + esc(gr.map(function (g) { return (g.received_by || "—") + " · " + (g.date || "—") + (g.qty_note ? " — " + g.qty_note : ""); }).join(" | ")) + '">GR ✓</span>'; return m; } },
            { label: "Amount", cls: "num", sortVal: function (r) { return r.amount; }, map: function (r) { return f.usd(r.amount, true); } },
            { label: "Status", map: function (r) { return statusChip(r.status); } },
            // #5: approve IN CONTEXT — pending-approval rows carry the same
            // two-click approve-and-post control as the Action Hub (one path).
            { label: "", map: function (r) { return r._apok ? '<button class="btn sm primary" data-click="' + r._apok + '">✓ Approve &amp; post</button>' : ""; } }],
            inv.map(function (r) {
              var pend = r.status === "pending-approval" ? S.list("approvals", { status: "pending" }).filter(function (a2) { return (a2.title || "").indexOf(r.invoice_number) >= 0 && !/must be posted|Blocked/i.test(a2.detail || ""); })[0] : null;
              return Object.assign({}, r, { _click: on(function () { drillAp(r); }),
                _apok: pend ? on(function (el) {
                  if (el && !el._armed) { el._armed = true; el.textContent = "Confirm — post " + f.usd(r.amount, true); return; }
                  var res = approveApproval(K, pend);
                  K.toast(res.msg, { title: res.ok ? "Approved & posted" : "Not approved", kind: res.ok ? "ok" : "warn", ms: 6500 });
                  if (res.ok) setTimeout(function () { K.reRender(); }, 150);
                }) : null });
            }));
          var apOpen = inv.filter(function (i) { return i.status !== "paid"; });
          var apBase = apOpen.reduce(function (s, i) { return s + (i.amount || 0); }, 0);
          var apBuckets = [{ n: "Current", t: function (d2) { return d2 < 1; } }, { n: "1–30", t: function (d2) { return d2 >= 1 && d2 <= 30; } }, { n: "31–60", t: function (d2) { return d2 >= 31 && d2 <= 60; } }, { n: "61–90", t: function (d2) { return d2 >= 61 && d2 <= 90; } }, { n: "90+", t: function (d2) { return d2 > 90; } }];
          var apAging = apBuckets.map(function (b) { var items = apOpen.filter(function (i) { return b.t(ageDaysOf(i)); }); var tot = items.reduce(function (s, i) { return s + (i.amount || 0); }, 0); return bar(b.n + " (" + items.length + ")", 100 * tot / (apBase || 1), f.usdShort(tot), b.n === "90+" || b.n === "61–90" ? "bad" : b.n === "31–60" ? "warn" : "ok"); }).join("");
          var excCard = card({ title: "Held / exceptions", sub: "Click through to dismiss a hold with a reason — releases a money approval",
            body: exc.length ? exc.map(function (r) {
              return '<div data-click="' + on(function () { drillAp(r); }) + '" style="display:flex;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);cursor:pointer"><span class="mono" style="font-size:12px">' + esc(r.invoice_number) + '</span><span class="subtle">' + esc(r.vendor) + '</span><span class="subtle" style="margin-left:auto">' + f.usd(r.amount, true) + "</span>" + statusChip(r.status) + "</div>";
            }).join("") : empty("✓", "No exceptions", "") });
          tools = '<button class="btn sm primary" data-click="' + on(function () { apInvoiceForm(K); }) + '">+ New AP invoice</button>'
            + '<button class="btn sm" data-click="' + on(function () { var list = payable.concat(regPaid ? paidHist : []); if (!list.length) { K.toast("Nothing approved to register.", { kind: "warn" }); return; } O.print("Check Register", O.docs.checkRegister(list.map(chkFor))); }) + '">⎙ Check register</button>'
            + '<button class="btn sm" data-click="' + on(function () { try { localStorage.setItem("keystone.reg.includePaid", regPaid ? "0" : "1"); } catch (e1) {} K.reRender(); }) + '">Register incl. paid: ' + (regPaid ? "ON" : "off") + "</button>"
            + '<button class="btn sm" data-click="' + on(function () { if (!payable.length) { K.toast("Nothing approved to pay.", { kind: "warn" }); return; } O.download("ap-ach-20260718.ach", O.push.nacha(payable.map(function (r) { return { name: r.vendor, amount: r.amount, routing: "021000021", account: "000123456", id: r.invoice_number }; }), { desc: "AP PAYMENT" })); K.toast(payable.length + " approved payments · NACHA ACH file downloaded.", { title: "ACH generated", kind: "ok" }); }) + '">⇪ ACH file</button>'
            + '<button class="btn sm" data-click="' + on(function () { var pp = payable.filter(function (r) { return r.check_no; }); if (!pp.length) { K.toast("No printed checks to report — print checks first, then send positive pay.", { kind: "warn" }); return; } O.download("positive-pay.csv", O.push.positivePay(pp.map(chkFor))); K.toast(pp.length + " issued checks · positive-pay file downloaded.", { title: "Positive Pay", kind: "ok" }); }) + '">⇪ Positive Pay</button>';
          body = grid("g-kpi",
            kpi({ lab: "AP outstanding", val: f.usdShort(L.balance("2000")), meta: chip("derived", "ok"), kind: "info" }) +
            kpi({ lab: "Invoices", val: inv.length + "" }) +
            kpi({ lab: "On hold / exception", val: exc.length + "", meta: chip("needs a human", exc.length ? "bad" : "ok"), kind: exc.length ? "bad" : "ok" }) +
            kpi({ lab: "Native OCR intake", val: inv.filter(function (i) { return i.source_channel === "ocr_pdf"; }).length + "", meta: chip("no Kofax", "brand"), kind: "" })
          ) + card({ title: "AP invoices — intake → 3-way match → pay", sub: "Click a row → drill (exception resolution, check print). Batch outputs are approved-only; check numbers persist from the tenant counter.", body: iTbl })
            + grid("g-2", card({ title: "AP aging", sub: "Unpaid invoices, aged from invoice date at read time", body: apAging }) + excCard);
        } else if (tab === "payments") {
          var ready = S.list("apInvoices").filter(function (i) { return i.status === "approved"; });
          var paidL = S.list("apInvoices").filter(function (i) { return i.status === "paid"; });
          var curFmt = curCheckFormat(K);
          var fmts = (O && O.checkFormats) || [];
          var fmtObj = fmts.filter(function (x) { return x.id === curFmt; })[0] || null;
          var micr = (fmtObj && fmtObj.face === "full") && localStorage.getItem("keystone.micr") === "1";
          function chk(r) { return { number: r.check_no || "—", date: r.check_date || TODAY, payee: r.vendor, amount: r.amount, memo: "Invoice " + r.invoice_number, invoices: [{ num: r.invoice_number, amount: r.amount }] }; }
          function confirmExec(r) {
            // If the ledger post fails, do NOT mark paid — surface it and stop.
            try { L.postJournal({ memo: "Payment executed — " + r.vendor, source: "ap-payment", date: TODAY, lines: [{ account: "2000", debit: r.amount, memo: "Clear AP " + r.vendor }, { account: "1000", credit: r.amount, memo: "Cash disbursed" }] }); }
            catch (e) { K.toast(String((e && e.message) || e), { title: "NOT executed — ledger post failed", kind: "bad" }); return; }
            S.update("apInvoices", r.id, { status: "paid", executed_by: (K.session() || {}).name, executed_at: new Date().toISOString() });
            K.toast("Confirmed EXECUTED by " + ((K.session() || {}).name) + " — AP cleared to cash, recorded to the ledger + audit.", { title: "Payment executed", kind: "ok" }); setTimeout(function () { K.reRender(); }, 200);
          }
          var readyTbl = ready.length ? tbl([
            { label: "Vendor", map: function (r) { return "<b>" + esc(r.vendor) + "</b>"; } },
            { label: "Invoice", map: function (r) { return '<span class="mono">' + esc(r.invoice_number) + "</span>"; } },
            { label: "Method", map: function () { return chip("check", "mute"); } },
            { label: "Amount", cls: "num", map: function (r) { return f.usd(r.amount, true); } },
            { label: "Check", map: function (r) { return r.check_no ? '<span class="mono">' + esc(r.check_no) + "</span>" : '<span class="muted">—</span>'; } },
            { label: "Check PDF", map: function (r) { return '<button class="btn sm" data-click="' + r._pr + '">⎙ Print check</button>'; } },
            { label: "Human executes", map: function (r) { return '<button class="btn sm primary" data-click="' + r._cf + '">✓ Confirm executed</button>'; } },
          ], ready.map(function (r) { return Object.assign({}, r, { _pr: on(function () { var num = checkNoFor(K, r); O.print("Check " + num + " — " + r.vendor, O.docs.check(chk(r), { micr: micr, format: curFmt })); K.reRender(); }), _cf: on(function () { confirmExec(r); }) }); })) : empty("✓", "Nothing awaiting execution", "Approved AP payments land here for a human to pay and confirm.");
          // wave-5: executed rows drill into the AP invoice — the drill carries the
          // command-gated "Void payment (un-confirm executed)" compensating path.
          var paidTbl = paidL.length ? tbl([{ label: "Vendor", k: "vendor" }, { label: "Invoice", map: function (r) { return '<span class="mono">' + esc(r.invoice_number) + "</span>"; } }, { label: "Check", map: function (r) { return r.check_no ? '<span class="mono">' + esc(r.check_no) + "</span>" : '<span class="muted">—</span>'; } }, { label: "Amount", cls: "num", sortVal: function (r) { return r.amount; }, map: function (r) { return f.usd(r.amount, true); } }, { label: "Executed by", map: function (r) { return esc(r.executed_by || "—"); } }], paidL.map(function (r) { return Object.assign({}, r, { _click: on(function () { drillApInv(K, r); }) }); })) : empty("—", "No payments executed yet", "");
          tools = '<button class="btn sm" data-click="' + on(function () { if (!ready.length) { K.toast("Nothing to pay.", { kind: "warn" }); return; } O.print("Check Run (" + ready.length + " checks)", O.docs.checksBatch(ready.map(function (r) { checkNoFor(K, r); return chk(r); }), { micr: micr, format: curFmt })); K.reRender(); }) + '">⎙ Print all checks</button>'
            + '<button class="btn sm" data-click="' + on(function () { if (!ready.length) return; O.download("ap-ach-20260718.ach", O.push.nacha(ready.map(function (r) { return { name: r.vendor, amount: r.amount, routing: "021000021", account: "000123456", id: r.invoice_number }; }), { desc: "AP PAYMENT" })); K.toast(ready.length + " payments · ACH file downloaded — Finance/Command upload it to the bank manually.", { title: "ACH file", kind: "ok" }); }) + '">⇪ ACH file (manual send)</button>'
            + '<button class="btn sm" data-click="' + on(function () { checkFormatDrill(K); }) + '">Check format: ' + esc((fmtObj && fmtObj.label) || curFmt) + "</button>"
            + '<button class="btn sm" data-click="' + on(function () {
                if (O.docs.checkAlignment) O.print("Alignment test", O.docs.checkAlignment(fmtObj || curFmt));
                else K.toast("Alignment test ships with the output engine update.", { title: "Not available yet", kind: "warn" });
              }) + '">⎙ Alignment test</button>';
          if (fmtObj && fmtObj.face === "full") tools += '<button class="btn sm" data-click="' + on(function () { localStorage.setItem("keystone.micr", micr ? "0" : "1"); K.reRender(); }) + '">MICR line: ' + (micr ? "ON" : "off") + "</button>";
          body = grid("g-kpi",
            kpi({ lab: "Awaiting execution", val: ready.length + "", meta: chip(f.usd(ready.reduce(function (s, r) { return s + r.amount; }, 0)), ready.length ? "warn" : "ok"), kind: "warn" }) +
            kpi({ lab: "Executed (period)", val: paidL.length + "", kind: "ok" }) +
            kpi({ lab: "Money movement", val: "Manual", meta: chip("Finance / Command", "info"), kind: "" }) +
            kpi({ lab: "Posting", val: "Automated", meta: chip("to the ledger", "ok"), kind: "ok" })
          ) + grid("g-2", card({ title: "Ready to pay — approved, posted, awaiting execution", sub: "Print the check (PDF) → pay it in real life → confirm executed. AI never moves money.", body: readyTbl }) + card({ title: "Executed payments", sub: "Human-confirmed disbursements, recorded to the ledger", body: paidTbl }));
        } else if (tab === "ar") {
          var ar = S.list("arInvoices");
          // Aging derives from invoice_date vs TODAY at read time — the stored
          // seed ageDays field is never read (it goes stale daily).
          // Shared deep drill (drillArInv) — assembled via K.context; the
          // receipt rows drill into their journals.
          function drillAr(r0) { drillArInv(K, r0); }
          var buckets = [{ n: "Current", t: function (d) { return d < 1; } }, { n: "1–30", t: function (d) { return d >= 1 && d <= 30; } }, { n: "31–60", t: function (d) { return d >= 31 && d <= 60; } }, { n: "61–90", t: function (d) { return d >= 61 && d <= 90; } }, { n: "90+", t: function (d) { return d > 90; } }];
          var bhtml = buckets.map(function (b) { var items = ar.filter(function (i) { return b.t(ageDaysOf(i)); }); var tot = items.reduce(function (s, i) { return s + i.balance; }, 0); return bar(b.n + " (" + items.length + ")", 100 * tot / (L.balance("1200") || 1), f.usdShort(tot), b.n === "90+" || b.n === "61–90" ? "bad" : b.n === "31–60" ? "warn" : "ok"); }).join("");
          var arTbl = tbl([
            { label: "Invoice", sortVal: function (r) { return r.invoice_number; }, map: function (r) { return '<span class="mono">' + esc(r.invoice_number) + "</span>"; } },
            { label: "Customer", k: "customer" }, { label: "Job", k: "job_id" },
            { label: "Age", cls: "num", sortVal: function (r) { return ageDaysOf(r); }, map: function (r) { var d3 = ageDaysOf(r); return '<span style="color:var(--' + (d3 > 60 ? "bad" : d3 > 30 ? "warn" : "txt-2") + ')">' + d3 + "d</span>"; } },
            { label: "Retainage", cls: "num", sortVal: function (r) { return r.retainage_amount || 0; }, map: function (r) { return f.usd(r.retainage_amount); } },
            { label: "Balance", cls: "num", sortVal: function (r) { return r.balance || 0; }, map: function (r) { return f.usd(r.balance, true); } },
            { label: "", map: function (r) { return '<button class="btn sm" data-click="' + r._pr + '">⎙</button>'; } }],
            ar.map(function (r) { return Object.assign({}, r, { _click: on(function () { drillAr(r); }), _pr: on(function () { printArInvoice(K, r); }) }); }));
          // per-customer statements — open invoices grouped by customer
          var custMap = {};
          ar.forEach(function (i) { if ((i.balance || 0) > 0) (custMap[i.customer] = custMap[i.customer] || []).push(i); });
          var stmtBtns = Object.keys(custMap).map(function (cn) {
            return '<button class="btn sm" data-click="' + on(function () {
              O.print("Statement — " + cn, O.docs.statement({ customer: cn, asOf: TODAY, invoices: custMap[cn].map(function (i) { return Object.assign({}, i, { ageDays: ageDaysOf(i) }); }) }));
            }) + '">⎙ Statement: ' + esc(cn) + "</button>";
          }).join("");
          body = grid("g-kpi",
            kpi({ lab: "A/R outstanding", val: f.usdShort(L.balance("1200")), meta: chip("derived", "ok"), kind: "info" }) +
            kpi({ lab: "Overdue 60+", val: f.usdShort(ar.filter(function (i) { return ageDaysOf(i) > 60; }).reduce(function (s, i) { return s + i.balance; }, 0)), kind: "bad" }) +
            kpi({ lab: "Retainage held", val: f.usdShort(ar.reduce(function (s, i) { return s + (i.retainage_amount || 0); }, 0)), kind: "warn" }) +
            kpi({ lab: "Open invoices", val: ar.filter(function (i) { return (i.balance || 0) > 0; }).length + "" })
          ) + grid("g-2", card({ title: "A/R invoices", sub: "Click a row → invoice drill (SOV, retainage, receipt, print)", body: arTbl }) + card({ title: "Aging", sub: "Derived from invoice date at read time — never stored", body: bhtml }));
          tools = '<button class="btn sm primary" data-click="' + on(function () { arInvoiceForm(K); }) + '">+ New AR invoice</button>'
            + '<button class="btn sm" data-click="' + on(function () { receiptForm(K); }) + '">Record receipt</button>'
            + stmtBtns;
        } else {
          var tbv = L.trialBalance();
          // account drill: filtered activity with a running balance — click any TB row
          function drillGlAccount(code, name) {
            var rows2 = L.activity().filter(function (a) { return a.account === code; });
            rows2.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)) || String(a.journal_id).localeCompare(String(b.journal_id)); });
            var run = 0;
            var body2 = rows2.map(function (a) {
              run = r2(run + (Number(a.debit) || 0) - (Number(a.credit) || 0));
              return '<tr><td class="mono">' + f.dateShort(a.date) + '</td><td class="mono">' + esc(a.journal_id) + "</td><td>" + esc(a.memo || "") + "</td><td>" + esc(a.job_code || "—") + '</td><td class="num">' + (a.debit ? f.usd(a.debit, true) : "") + '</td><td class="num">' + (a.credit ? f.usd(a.credit, true) : "") + '</td><td class="num mono">' + f.usd(run, true) + "</td></tr>";
            }).join("");
            var acctRec = L.account(code) || {};
            K.drill("GL " + code + " — " + name,
              '<div class="kv"><div class="k">Type</div><div class="v">' + chip(acctRec.account_type || "—", "mute") + '</div><div class="k">Balance</div><div class="v"><b>' + f.usd(L.balance(code), true) + '</b> <span class="subtle">(natural sign)</span></div><div class="k">Activity rows</div><div class="v">' + rows2.length + "</div></div>"
              + drillH("Activity — running balance (Dr − Cr)")
              + (rows2.length ? '<div class="twrap"><table><thead><tr><th>Date</th><th>Jnl</th><th>Memo</th><th>Job</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody>' + body2 + "</tbody></table></div>" : '<p class="subtle">No activity on this account yet.</p>'));
          }
          var tbTbl = tbl([{ label: "Acct", map: function (r) { return '<span class="mono">' + r.code + "</span>"; } }, { label: "Account", k: "name" }, { label: "Type", map: function (r) { return chip(r.type, "mute"); } }, { label: "Debit", cls: "num", map: function (r) { return r.debit ? f.usd(r.debit, true) : ""; } }, { label: "Credit", cls: "num", map: function (r) { return r.credit ? f.usd(r.credit, true) : ""; } }],
            tbv.rows.map(function (r) { return Object.assign({}, r, { _click: on(function () { drillGlAccount(r.code, r.name); }) }); }).concat([{ code: "", name: "TOTAL", type: "", debit: tbv.totalDebit, credit: tbv.totalCredit }]));
          var act = L.activity().slice(0, 14);
          var aTbl = tbl([{ label: "Date", map: function (r) { return '<span class="mono">' + f.dateShort(r.date) + "</span>"; } }, { label: "Jnl", map: function (r) { return '<span class="mono">' + esc(r.journal_id) + "</span>"; } }, { label: "Acct", k: "account" }, { label: "Job", map: function (r) { return r.job_code || "—"; } }, { label: "Memo", k: "memo" }, { label: "Debit", cls: "num", map: function (r) { return r.debit ? f.usd(r.debit, true) : ""; } }, { label: "Credit", cls: "num", map: function (r) { return r.credit ? f.usd(r.credit, true) : ""; } }], act);
          body = grid("g-kpi",
            kpi({ lab: "Trial balance", val: tbv.balanced ? "In balance" : "OUT", meta: chip(f.usd(tbv.totalDebit), tbv.balanced ? "ok" : "bad"), kind: tbv.balanced ? "ok" : "bad" }) +
            kpi({ lab: "Activity rows", val: S.count("glActivity") + "", meta: chip("immutable", "brand") }) +
            kpi({ lab: "Cash", val: f.usdShort(L.balance("1000")), kind: "ok" }) +
            kpi({ lab: "Revenue (YTD)", val: f.usdShort(L.balance("4000")), kind: "info" })
          ) + grid("g-2", card({ title: "Trial balance", sub: "Derived live — no stored balances. Click an account → full activity drill with a running balance.", body: tbTbl }) + card({ title: "Recent GL activity", sub: "Immutable debit/credit rows", body: aTbl }));
          tools = '<button class="btn sm primary" data-click="' + on(function () { journalForm(K); }) + '">+ Manual journal</button>'
            + '<button class="btn sm" data-click="' + on(function () { O.print("Financial Statements", O.docs.financials(tbv)); }) + '">⎙ Financial statements</button>';
        }
        return head("Finance", "General Ledger, A/P and A/R on the event-sourced ledger — control accounts stay reconciled by construction", tools) + tabBar(tab) + body;
      });
      if (routeOpen) routeOpen();
    },
  };

  /* ================================================================== BILLING */
  function contractForm(K) {
    var S = K.store, f = K.fmt;
    var cOpts = S.list("accounts").map(function (a) { return { v: a.id, l: a.legal_name }; });
    var jOpts = S.list("jobs").map(function (j) { return { v: j.job_code, l: j.job_code + " · " + j.scope }; });
    drillForm(K, "New billing contract", '<div class="form-2">'
      + fld("Customer", sel("cC", cOpts, cOpts[0] && cOpts[0].v))
      + fld("Job", sel("cJ", jOpts, jOpts[0] && jOpts[0].v))
      + fld("Contract sum ($)", inp("cAmt", "number", "", "0.00"))
      + fld("Retainage %", inp("cRet", "number", 10)) + "</div>"
      + '<p class="subtle">The SOV starts as one line for the full sum — split it with draw applications as billing progresses.</p>',
      "Create contract", function () {
        var amt = VN("cAmt"); if (!amt) { K.toast("Contract sum is required.", { kind: "warn" }); return; }
        var job = V("cJ");
        var jrec = S.list("jobs").filter(function (j) { return j.job_code === job; })[0] || {};
        var pr = S.get("projects", jrec.project_id) || {};
        S.insert("contracts", { contract_id: pr.project_code || ("CT-" + job), customer_id: V("cC"), job_id: job, original_sum: amt, net_change: 0, sum_to_date: amt, retainage_pct: VN("cRet") || 10, billing_method: "AIA", status: "active", application_no: 0, draws: [], sov: [{ bill_code: job + ".07460.M", description: "Contract scope of work", scheduled_value: amt, this_period: 0, prior: 0, pct: 0 }] });
        K.toast("Contract on job " + job + " · " + f.usd(amt) + " — SOV locked, draws bill against it.", { title: "Contract created", kind: "ok" });
        afterCreate(K, "billing");
      });
  }
  function drawForm(K, contractId) {
    var S = K.store, f = K.fmt;
    var contracts = S.list("contracts");
    if (!contracts.length) { K.toast("Create a contract first.", { kind: "warn" }); return; }
    var c = (contractId && S.get("contracts", contractId)) || contracts[0];
    var sov = c.sov || [];
    var appNo = (c.application_no || 0) + 1;
    var selHtml = contracts.length > 1 ? fld("Contract", sel("dwC", contracts.map(function (x) { return { v: x.id, l: x.contract_id + " · job " + x.job_id }; }), c.id)) : "";
    var rows = sov.map(function (l, i) {
      var btd = r2((l.prior || 0) + (l.this_period || 0));
      var remaining = r2(l.scheduled_value - btd);
      return '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 64px;gap:8px;align-items:center;margin-bottom:8px;font-size:12px">'
        + "<span><b>" + esc(l.bill_code) + '</b><div class="subtle">' + esc(l.description) + "</div></span>"
        + '<span class="mono">' + f.usd(l.scheduled_value, true) + "</span>"
        + '<span class="mono subtle">' + f.usd(btd, true) + "</span>"
        + '<input class="in" data-dw="' + i + '" type="number" step="0.01" min="0" max="' + remaining + '" placeholder="0.00" />'
        + '<span class="mono" id="dwPct' + i + '">' + f.pct(l.scheduled_value ? btd / l.scheduled_value * 100 : 0) + "</span>"
        + "</div>";
    }).join("");
    drillForm(K, "Draw application · " + c.contract_id, selHtml
      + '<p class="muted" style="margin:0 0 12px">Application ' + appNo + " — previous this-period rolls into prior on submit. Columns: line · scheduled · billed to date · <b>this period</b> · % complete.</p>"
      + rows
      + '<div class="btnrow" style="margin-top:6px"><span id="dwTot" class="subtle">This application: $0.00</span></div>',
      "Submit application " + appNo, function () {
        var db2 = document.getElementById("drillBody");
        var inputs = [];
        Array.prototype.forEach.call(db2.querySelectorAll("[data-dw]"), function (el) { inputs[Number(el.getAttribute("data-dw"))] = Number(el.value) || 0; });
        var amount = 0;
        var newSov = sov.map(function (l, i) {
          var add = r2(inputs[i] || 0); amount = r2(amount + add);
          var prior = r2((l.prior || 0) + (l.this_period || 0));
          return Object.assign({}, l, { prior: prior, this_period: add, pct: l.scheduled_value ? r2((prior + add) / l.scheduled_value * 100) : 0 });
        });
        if (!amount) { K.toast("Enter at least one this-period amount.", { kind: "warn" }); return; }
        var draws = (c.draws || []).map(function (d) { return d.status === "pending" ? Object.assign({}, d, { status: "billed" }) : d; });
        draws.push({ app_no: appNo, period_to: endOfMonth(), amount: amount, status: "pending" });
        S.update("contracts", c.id, { sov: newSov, application_no: appNo, draws: draws });
        K.toast("Application " + appNo + " · " + f.usd(amount) + " — SOV rolled, history recorded. Print the G702 from the contract card.", { title: "Draw created", kind: "ok" });
        afterCreate(K, "billing");
      });
    var db = document.getElementById("drillBody");
    var selEl = document.getElementById("dwC");
    if (selEl) selEl.addEventListener("change", function () { drawForm(K, selEl.value); });
    function refresh() {
      var inputs = [];
      Array.prototype.forEach.call(db.querySelectorAll("[data-dw]"), function (el) { inputs[Number(el.getAttribute("data-dw"))] = Number(el.value) || 0; });
      var tot = 0;
      sov.forEach(function (l, i) {
        var add = inputs[i] || 0; tot = r2(tot + add);
        var btd = r2((l.prior || 0) + (l.this_period || 0) + add);
        var el = document.getElementById("dwPct" + i);
        if (el) el.textContent = f.pct(l.scheduled_value ? btd / l.scheduled_value * 100 : 0);
      });
      var t = document.getElementById("dwTot"); if (t) t.textContent = "This application: " + f.usd(tot, true);
    }
    Array.prototype.forEach.call(db.querySelectorAll("[data-dw]"), function (el) { el.addEventListener("input", refresh); });
  }
  var billing = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt, O = window.KeystoneOutput, L = window.KeystoneLedger;
      mountView(K, mount, function (on) {
        var contracts = S.list("contracts");
        function aiaPayload(c) {
          var acct = S.get("accounts", c.customer_id) || {};
          var draws = c.draws || [];
          var priorCerts = draws.filter(function (d) { return d.status === "paid"; }).reduce(function (s, d) { return s + (d.amount || 0); }, 0);
          return {
            app: (c.application_no || draws.length || 1), contract: c.contract_id, job: c.job_id,
            customer: acct.legal_name || c.customer_id,
            owner: { name: acct.legal_name || c.customer_id, city: acct.city || "" },
            contractor: { name: K.T.name, addr: "1 Studio Way, Suite 100", city: "Atlanta, GA 30303" },
            period: todayISO(), original_sum: c.original_sum, net_change: c.net_change || 0,
            prior_certificates: r2(priorCerts), retPct: c.retainage_pct, retMaterialsPct: 0,
            change_orders: { additions: 0, deductions: 0 },
            sov: (c.sov || []).map(function (l) { return { code: l.bill_code, desc: l.description, scheduled: l.scheduled_value, prior: l.prior || 0, "this": l.this_period, stored: 0, pct: l.pct }; }),
          };
        }
        var body = contracts.map(function (c) {
          var sov = c.sov || [], draws = c.draws || [];
          var drawsHtml = draws.length ? '<div style="margin-top:12px"><div class="subtle" style="margin-bottom:4px">Draw applications</div>' + draws.map(function (d) {
            return '<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--line);font-size:12px"><span class="mono">App ' + d.app_no + '</span><span class="subtle">period to ' + f.dateShort(d.period_to) + '</span><span class="mono" style="margin-left:auto">' + f.usd(d.amount, true) + "</span>" + statusChip(d.status) + "</div>";
          }).join("") + "</div>" : "";
          // shared earned-value source when the ledger exposes it (defensive — added in parallel)
          var jp = (L && typeof L.jobProgress === "function") ? L.jobProgress(c.job_id) : null;
          var jpTxt = (jp && jp.pctComplete != null && isFinite(jp.pctComplete)) ? " · job " + f.pct(jp.pctComplete) + " complete (cost basis)" : "";
          return card({ title: "Contract " + c.contract_id, sub: ((S.get("accounts", c.customer_id) || {}).legal_name || c.customer_id) + " · job " + c.job_id + " · AIA G702/G703 · " + c.retainage_pct + "% retainage · app " + (c.application_no || 0) + jpTxt,
            head: '<button class="btn sm primary" data-click="' + on(function () { drawForm(K, c.id); }) + '">+ New draw</button> <button class="btn sm" data-click="' + on(function () { O.print("AIA G702/G703 — " + c.contract_id, O.docs.aia(aiaPayload(c))); }) + '">⎙ Print AIA draw</button> ' + chip(f.usd(c.sum_to_date), "brand"),
            body: tbl([{ label: "Bill code", map: function (r) { return '<span class="mono">' + esc(r.bill_code) + "</span>"; } }, { label: "Description", k: "description" }, { label: "Scheduled", cls: "num", map: function (r) { return f.usd(r.scheduled_value); } }, { label: "Prior", cls: "num", map: function (r) { return f.usd(r.prior || 0); } }, { label: "This period", cls: "num", map: function (r) { return f.usd(r.this_period); } }, { label: "% complete", cls: "num", map: function (r) { return f.pct(r.pct); } }], sov) +
              '<div style="margin-top:12px">' + sov.map(function (l) { return bar(l.bill_code, l.pct, f.usd(r2((l.prior || 0) + l.this_period)) + " billed", l.pct >= 100 ? "ok" : "info"); }).join("") + "</div>" + drawsHtml });
        }).join("");
        return head("Billing & Draws", "AIA G702/G703 progress billing with a locked Schedule of Values — draws can't bill a code that doesn't exist",
          '<button class="btn sm primary" data-click="' + on(function () { contractForm(K); }) + '">+ New contract</button>') +
          grid("g-kpi",
            kpi({ lab: "Contracts", val: contracts.length + "" }) +
            kpi({ lab: "Contract value", val: f.usdShort(contracts.reduce(function (s, c) { return s + c.sum_to_date; }, 0)), kind: "brand" }) +
            kpi({ lab: "Billed this period", val: f.usdShort(contracts.reduce(function (s, c) { return s + (c.sov || []).reduce(function (t, l) { return t + l.this_period; }, 0); }, 0)), kind: "info" }) +
            kpi({ lab: "Retainage held", val: f.usdShort(contracts.reduce(function (s, c) { return s + (c.sov || []).reduce(function (t, l) { return t + r2(((l.prior || 0) + (l.this_period || 0)) * c.retainage_pct / 100); }, 0); }, 0)), meta: '<span class="muted">% of completed to date</span>', kind: "warn" })
          ) + body;
      });
      if (p.id === "new-contract") contractForm(K);
      else if (p.id === "new-draw") drawForm(K, null);
    },
  };

  /* =============================================================== AUTOMATION */
  // Re-apply persisted per-workflow toggles to the live engine at load, so a
  // disabled workflow stays off for event triggers even before the Studio opens.
  (function () {
    try {
      var A0 = window.KeystoneAutomation;
      if (A0 && A0.workflows) A0.workflows.forEach(function (w) { if (localStorage.getItem("keystone.wf." + w.id) === "off") w.enabled = false; });
    } catch (e) {}
  })();
  var automation = {
    render: function (K, p, mount) {
      var S = K.store, A = window.KeystoneAutomation, f = K.fmt;
      mountView(K, mount, function (on) {
        var wfs = A.workflows, runs = A.runs(40), cat = K.T.apiCatalog || [], hooks = S.list("webhooks");
        // Honest manual runs: pick a REAL record matching the trigger collection.
        function wfSample(w) {
          var colName = String(w.trigger || "").split(".")[0];
          var rec = null, lab = "";
          if (colName === "opportunities") { var open2 = S.list("opportunities").filter(function (o) { return ["new", "screening", "submitted"].indexOf(o.stage) >= 0; }); rec = open2[0] || S.list("opportunities")[0]; lab = rec && rec.project_name; }
          else if (colName === "apInvoices") { rec = S.list("apInvoices")[0]; lab = rec && (rec.invoice_number + " · " + rec.vendor); }
          else if (colName === "jobs") { rec = S.list("jobs")[0]; lab = rec && ("job " + rec.job_code); }
          else { rec = S.list(colName)[0] || null; lab = rec && (rec.name || rec.id); }
          return rec ? { record: rec, collection: colName, label: String(lab || rec.id) } : null;
        }

        var partnerBar = '<div class="btnrow" style="margin-bottom:4px">' + Object.keys(A.partners).map(function (pn) {
          var st = A.partners[pn];
          return '<button class="btn sm" data-click="' + on(function () { A.setPartner(pn, st === "up" ? "down" : "up"); K.reRender(); }) + '"><span class="status-line"><span class="d ' + (st === "up" ? "ok" : "bad") + '"></span>' + pn + " · " + st + "</span></button>";
        }).join("") + "</div>";

        var wfCards = wfs.map(function (w) {
          var enabled = true; try { enabled = localStorage.getItem("keystone.wf." + w.id) !== "off"; } catch (e3) {}
          w.enabled = enabled;   // keep the live engine honest with the persisted toggle
          var sample = wfSample(w);
          var flow = '<div class="flow"><div class="flow-node trigger"><div class="t">Trigger</div><b>' + esc(w.trigger) + "</b><small>" + (w.when ? "when " + w.when.field + " " + w.when.op + " " + w.when.value : "on event") + "</small></div>" +
            w.steps.map(function (s) { return '<div class="flow-arrow">→</div><div class="flow-node ' + (s.gate ? "gate" : "action") + '"><div class="t">' + (s.gate ? s.gate + " gate" : s.action) + '</div><b>' + esc(s.label || s.action) + "</b><small>" + (s.gate ? "human approval" : "auto") + "</small></div>"; }).join("") + "</div>";
          var runBtn = "";
          if (enabled) {
            var runLabel = sample ? "▶ Run with sample: " + (sample.label.length > 26 ? sample.label.slice(0, 24) + "…" : sample.label) : "▶ Run (no sample record)";
            runBtn = ' <button class="btn sm" data-click="' + on(function () {
              var r = A.trigger(w.id, sample ? { record: sample.record, collection: sample.collection } : {});
              K.toast(w.name + " → " + (r ? r.status : "no run") + (sample ? " · sample: " + sample.label : ""), { title: "Workflow run", kind: r && r.status === "completed" ? "ok" : "warn" });
              K.reRender();
            }) + '">' + esc(runLabel) + "</button>";
          }
          return card({ title: w.name, sub: "requires: " + (w.requires.length ? w.requires.join(", ") : "nothing") + " · " + w.steps.length + " steps",
            head: (enabled ? chip("enabled", "ok") : chip("disabled", "mute"))
              + ' <button class="btn sm" data-click="' + on(function () {
                  try { localStorage.setItem("keystone.wf." + w.id, enabled ? "off" : "on"); } catch (e4) {}
                  w.enabled = !enabled;
                  K.toast(w.name + (enabled ? " disabled — event triggers will not fire." : " re-enabled."), { title: "Workflow " + (enabled ? "off" : "on"), kind: enabled ? "warn" : "ok" });
                  K.reRender();
                }) + '">' + (enabled ? "⏸ Disable" : "▶ Enable") + "</button>" + runBtn,
            body: flow });
        }).join("");

        var runTbl = runs.length ? tbl([{ label: "When", map: function (r) { return '<span class="mono">' + f.ago(r.at) + "</span>"; } }, { label: "Workflow", k: "workflow" }, { label: "Source", k: "source" }, { label: "Steps", cls: "num", map: function (r) { return r.steps.length; } }, { label: "Status", map: function (r) { return statusChip(r.status === "completed" ? "approved" : r.status); } }, { label: "Note", map: function (r) { return '<span class="muted">' + esc(r.note || "") + "</span>"; } }], runs) : empty("⚡", "No runs yet", "Fire a workflow above or mark a bid won in CRM.");

        var apiTbl = tbl([{ label: "Method", map: function (r) { return chip(r.method, r.method === "GET" ? "info" : r.method === "POST" ? "ok" : "warn"); } }, { label: "Path", map: function (r) { return '<span class="mono">' + esc(r.path) + "</span>"; } }, { label: "Entity", k: "entity" }, { label: "Mode", map: function (r) { return chip(r.write_mode, r.write_mode === "gated" ? "warn" : "mute"); } }, { label: "Approval", map: function (r) { return r.approval ? chip("human", "warn") : chip("auto", "ok"); } }], cat);
        var hookTbl = tbl([{ label: "Event", map: function (r) { return '<span class="mono">' + esc(r.event_type_filter) + "</span>"; } }, { label: "Target", map: function (r) { return '<span class="muted mono">' + esc(r.target_url) + "</span>"; } }, { label: "Active", map: function (r) { return r.active ? chip("live", "ok") : chip("off", "mute"); } }, { label: "Last delivery", k: "last_delivery_status" }], hooks);

        return head("Automation Studio", "Workflows run themselves — deterministic, no LLM in the posting loop. Money & irreversible steps always route to a human.", chip(runs.length + " runs", "brand")) +
          card({ title: "Tech-partner status", sub: "Toggle a partner down → dependent workflows fall back to the Action Hub instead of failing", body: partnerBar }) +
          card({ title: "Workflows", sub: "Trigger → steps → staged actions", body: wfCards }) +
          grid("g-2", card({ title: "Run history", body: runTbl }) + card({ title: "Webhooks", sub: "Signed outbound — real-time, not a 7am digest", body: hookTbl })) +
          card({ title: "Open API surface", sub: "Every entity is a REST resource · new entity = config, not code", body: apiTbl });
      });
    },
  };

  /* ================================================================ ACTION HUB */
  var actionhub = {
    count: function (K) { return K.store.count("approvals", { status: "pending" }) + K.store.list("tasks").filter(function (t) { return t.kind === "automation_fallback" && t.status === "open"; }).length; },
    render: function (K, p, mount) {
      var S = K.store, L = window.KeystoneLedger, f = K.fmt;
      mountView(K, mount, function (on) {
        var appr = S.list("approvals", { status: "pending" });
        var fallbacks = S.list("tasks").filter(function (t) { return t.kind === "automation_fallback" && t.status !== "done"; });
        var tasks = S.list("tasks").filter(function (t) { return t.kind !== "automation_fallback" && t.status !== "done"; });

        function approve(a) {
          // #5: ONE approve path for the whole suite — the Action Hub calls the
          // same KApprove.approval the AP tab, AP drill and job-ticket draws
          // use. It posts AP vouchers BY CATEGORY (#10) and releases sub-draws
          // with full visibility (#2b). Never fork this logic.
          var res = approveApproval(K, a);
          K.toast(res.msg, { title: res.ok ? "Posted" : "Not approved", kind: res.ok ? "ok" : "warn", ms: 6500 });
          if (res.ok) setTimeout(function () { K.reRender(); }, 200);
        }
        function reject(a) { S.update("approvals", a.id, { status: "rejected" }); K.reRender(); }

        var apprCards = appr.length ? appr.map(function (a) {
          var blocked = /must be posted|Blocked/.test(a.detail || "");
          return card({ cls: "", title: a.title, sub: (a.vendor || "") + (a.job_code ? " · job " + a.job_code : "") + " · " + a.workflow,
            head: chip(a.tier === "money" ? f.usd(a.amount) : a.tier, a.tier === "money" ? "warn" : "info"),
            body: (a.detail ? '<p class="muted" style="margin:0 0 12px">' + esc(a.detail) + "</p>" : "") +
              '<div class="btnrow"><button class="btn primary" ' + (blocked ? "disabled" : "") + ' data-click="' + on(function (el) {
                // lightweight inline confirm — first click arms, second executes
                if (el && !el._armed) { el._armed = true; el.textContent = "Confirm — post " + (a.tier === "money" ? f.usd(a.amount) : "") + " to ledger"; return; }
                approve(a);
              }) + '">✓ Approve & post</button><button class="btn danger" data-click="' + on(function () { reject(a); }) + '">Reject</button>' + (blocked ? chip("blocked — post the subcontract first", "bad") : "") + "</div>" });
        }).join("") : empty("◆", "No approvals pending", "Money and irreversible actions land here for a human. Nothing auto-pays.");

        var fbCards = fallbacks.length ? fallbacks.map(function (t) {
          return card({ title: t.title, sub: t.dept + " · " + (t.reason || "fallback"),
            head: chip("human needed", "bad"),
            body: '<p class="muted" style="margin:0 0 12px">' + esc(t.detail || "") + "</p><div class=\"btnrow\"><button class=\"btn\" data-click=\"" + on(function () { S.update("tasks", t.id, { status: "done" }); K.toast("Handled — cleared from the fallback queue.", { title: "Done", kind: "ok" }); K.reRender(); }) + '">Mark handled</button></div>' });
        }).join("") : empty("◎", "Automation is caught up", "Fallback tasks appear here only when a workflow can't run or a partner is down.");

        var taskTbl = tasks.length ? tbl([{ label: "Task", k: "title" }, { label: "Dept", k: "dept" }, { label: "Job", map: function (r) { return r.job_code || "—"; } }, { label: "Due", map: function (r) { return r.due ? f.dateShort(r.due) : "—"; } }, { label: "", map: function (r) { return '<button class="btn sm" data-click="' + r._done + '">Done</button>'; } }], tasks.map(function (t) { return Object.assign({}, t, { _done: on(function () { S.update("tasks", t.id, { status: "done" }); K.reRender(); }) }); })) : empty("✓", "No open tasks", "");

        var qaList = window.KActions || [];
        var qaCard = card({ title: "Quick actions — all modules", sub: "Every manual create in the suite, one tap — each opens inside its owning module",
          body: qaList.length ? '<div class="qa-grid">' + qaList.map(function (a) {
            return '<div class="qa" data-click="' + on(function () {
              // #3 bug class: K.go to the CURRENT hash fires no hashchange, so a
              // second click on the same create silently did nothing — force a
              // re-render (which re-opens the form) when the route is unchanged.
              var cur = (location.hash || "").replace(/^#\//, "");
              if (cur === a.route) K.reRender(); else K.go(a.route);
            }) + '"><span class="ic">' + a.icon + '</span><span>' + esc(a.label) + (a.hint ? "<small>" + esc(a.hint) + "</small>" : "") + "</span></div>";
          }).join("") + "</div>" : empty("◆", "No actions registered", "") });

        return head("Action Hub", "The human-in-the-loop fallback — used only when automation can't run, or to authorize money. Everything else runs itself.", chip(appr.length + " approvals · " + fallbacks.length + " fallbacks", appr.length + fallbacks.length ? "warn" : "ok")) +
          grid("g-2",
            card({ title: "Approvals — money & irreversible", sub: "Approving posts to the ledger; nothing auto-pays", body: apprCards }) +
            card({ title: "Automation fallbacks", sub: "Non-automatable or partner-outage work, pre-filled with context", body: fbCards })
          ) +
          qaCard +
          card({ title: "Open tasks", body: taskTbl });
      });
    },
  };

  /* ===================================================================== ADMIN */
  var admin = {
    render: function (K, p, mount) {
      var S = K.store, f = K.fmt;
      mountView(K, mount, function (on) {
        var users = K.T.users, roles = K.T.roles, ints = S.list("integrations"), audit = S.audit(20);
        var uTbl = tbl([{ label: "User", map: function (r) { return '<b>' + esc(r.name) + "</b>"; } }, { label: "Email", map: function (r) { return '<span class="mono muted">' + esc(r.email) + "</span>"; } }, { label: "Role", map: function (r) { return chip(r.roleLabel, "brand"); } }, { label: "Auth", map: function (r) { return chip("Google", "info"); } }], users);
        var iTbl = ints.map(function (i) {
          return card({ title: i.name, sub: i.detail, head: statusChip(i.status),
            body: '<div class="kv"><div class="k">Kind</div><div class="v">' + esc(i.kind) + '</div><div class="k">Scope</div><div class="v">' + esc(i.scope) + "</div></div>" + (i.status === "pending-approval" ? '<p class="muted">Money-gated — needs Michael\'s approval before provisioning (GCP spend).</p>' : "") });
        }).join("");
        var aTbl = tbl([{ label: "When", map: function (r) { return '<span class="mono">' + f.ago(r.at) + "</span>"; } }, { label: "Actor", map: function (r) { return esc((r.actor || {}).name || "system"); } }, { label: "Op", map: function (r) { return chip(r.op, "mute"); } }, { label: "Collection", k: "collection" }, { label: "Ref", map: function (r) { return '<span class="mono muted">' + esc(r.ref || "") + "</span>"; } }], audit);
        // wave-5 founder-invited improvement: command reviews who un-did what —
        // every reverse/void writes an explicit audit row with its reason.
        var revs = S.audit(500).filter(function (a) { return a.op === "reverse" || a.op === "void"; }).slice(0, 20);
        var revTbl = revs.length ? tbl([
          { label: "When", map: function (r) { return '<span class="mono">' + f.ago(r.at) + "</span>"; } },
          { label: "Who", map: function (r) { return esc((r.actor || {}).name || (r.after && r.after.by) || "system"); } },
          { label: "Op", map: function (r) { return chip(r.op, r.op === "void" ? "bad" : "warn"); } },
          { label: "What", map: function (r) { return esc((r.after && r.after.note) || r.summary || (r.op + " " + r.collection)); } },
          { label: "Ref", map: function (r) { return '<span class="mono muted">' + esc(r.ref || "") + "</span>"; } },
          { label: "Reason", map: function (r) { return '<span class="subtle">' + esc((r.after && r.after.reason) || "—") + "</span>"; } },
        ], revs) : empty("⤺", "No reversals yet", "Un-issue, un-post, void and un-convert actions land here with who, what and the written reason.");
        var revCard = card({ title: "Reversals & audit", sub: "Last 20 reverse/void actions — every un-do is gated by seat, requires a reason, and posts compensating journals (the ledger is never edited)", body: revTbl });
        return head("Admin & Integrations", "Users, RBAC, integrations and the tamper-evident audit log", chip(K.T.name + " · tenant #1", "brand")) +
          grid("g-kpi",
            kpi({ lab: "Users", val: users.length + "", meta: chip("Google SSO", "info") }) +
            kpi({ lab: "Roles", val: roles.length + "" }) +
            kpi({ lab: "Integrations", val: ints.filter(function (i) { return i.status === "connected"; }).length + " live", meta: chip("1 money-gated", "warn"), kind: "info" }) +
            kpi({ lab: "Audit rows", val: S.count("_audit") + "", meta: chip("immutable", "ok"), kind: "ok" })
          ) +
          grid("g-2", card({ title: "Users & roles", sub: "Identity = Google email · RBAC by role", body: uTbl }) + card({ title: "Roles", body: tbl([{ label: "Role", k: "name" }, { label: "Tier", cls: "num", k: "tier" }, { label: "Sees", k: "blurb" }], roles) })) +
          revCard +
          card({ title: "Integrations", sub: "Google Workspace + GCP + Make + Anthropic · CMiC is migration-only, sunsetting", body: '<div class="grid g-2e">' + iTbl + "</div>" }) +
          card({ title: "Audit log", sub: "Every privileged write — who, what, when", body: aTbl });
      });
    },
  };

  // Expose the shared UI kit so add-on module files (modules2.js) stay consistent.
  // Additions (form kit) are additive — the original surface is unchanged.
  window.KUI = { esc: esc, chip: chip, pill: pill, grid: grid, card: card, kpi: kpi, head: head,
    tbl: tbl, bar: bar, empty: empty, statusChip: statusChip, mountView: mountView,
    fld: fld, inp: inp, sel: sel, val: V, valNum: VN, drillForm: drillForm, bindClick: bindClick, afterCreate: afterCreate,
    // line-item grid (contract): itemsEditor(cfg) → html · itemsEditorBind(id, onChange) · itemsEditorRows(id)
    itemsEditor: itemsEditor, itemsEditorBind: itemsEditorBind, itemsEditorRows: itemsEditorRows,
    // the legacy ERP-depth helpers shared with add-on module files
    ta: ta, routeChip: routeChipOf, colorChip: colorChipOf, milestoneTracker: milestoneTracker, jobTitle: jobTitleOf,
    // wave-4 child-record contracts: parent-context strip · live day counter ·
    // the graph assembler (also on window.K.context) · shared ref resolver
    ctxStrip: ctxStrip, daysSince: daysSince, context: kContext, openRef: openRefDrill,
    // wave-6 contracts: datalist typeahead · universal notes block · shared
    // approve path · match candidates · ticket completeness · derived costing
    typeahead: typeahead, typeaheadVal: typeaheadVal, typeaheadBind: typeaheadBind,
    notesSection: notesSection, notesBind: notesBind,
    approveApproval: approveApproval, matchCandidates: matchCandidatesFor,
    ticketGaps: ticketGaps, completeTicketForm: completeTicketForm, derivedStatus: derivedStatus };

  return { home: home, crm: crm, projects: projects, procurement: procurement, inventory: inventory, finance: finance, billing: billing, automation: automation, actionhub: actionhub, admin: admin };
})();
