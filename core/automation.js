/* ============================================================================
 * KEYSTONE · AUTOMATION ENGINE — deterministic workflow runtime
 * ----------------------------------------------------------------------------
 * The product's reason to exist: workflows run themselves. This engine
 * subscribes to the native store's event bus and, when a trigger fires,
 * executes a workflow's steps against the store — no LLM in the runtime loop
 * (LLMs help author/classify offline; execution is deterministic, so a partner
 * outage can never corrupt the books).
 *
 * Three doctrines, enforced here:
 *   • MONEY / IRREVERSIBLE steps never auto-execute — they open an approval in
 *     the Action Hub (human dispatch). Everything else is autonomous.
 *   • The ACTION HUB is the human-in-the-loop fallback. A workflow routes to it
 *     when a step is non-automatable OR a required tech partner (Anthropic /
 *     OpenAI / Make.com) is down. The work is never dropped — it's queued for a
 *     person with full context.
 *   • Every run is recorded (`_runs`) and audited via the store.
 *
 * Workflows are DATA (defined in tenant config), so a new automation is a
 * config change, not a code change — the same seam that lets us resell.
 * ==========================================================================*/
(function () {
  "use strict";

  function lookup(path, ctx) {
    return path.trim().split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, ctx);
  }
  function tmpl(str, ctx) {
    if (typeof str !== "string") return str;
    // Whole template is a single {{path}} expression → pass numbers through
    // un-stringified, so amounts land in created records as real numbers.
    var solo = /^\{\{([^}]+)\}\}$/.exec(str);
    if (solo) {
      var sv = lookup(solo[1], ctx);
      if (typeof sv === "number") return sv;
      return sv == null ? "" : String(sv);
    }
    return str.replace(/\{\{([^}]+)\}\}/g, function (_, path) {
      var v = lookup(path, ctx);
      return v == null ? "" : v;
    });
  }
  function resolve(obj, ctx) {
    if (obj == null) return obj;
    if (typeof obj === "string") return tmpl(obj, ctx);
    if (Array.isArray(obj)) return obj.map(function (x) { return resolve(x, ctx); });
    if (typeof obj === "object") {
      var out = {}; Object.keys(obj).forEach(function (k) { out[k] = resolve(obj[k], ctx); }); return out;
    }
    return obj;
  }
  function evalCond(cond, ctx) {
    if (!cond) return true;
    // cond: { field:"record.status", op:"eq"|"gt"|"lt"|"neq"|"gte"|"lte", value:x }
    var left = String(cond.field).split(".").reduce(function (o, k) { return o == null ? o : o[k]; }, ctx);
    var r = cond.value;
    switch (cond.op) {
      case "eq": return left === r; case "neq": return left !== r;
      case "gt": return Number(left) > Number(r); case "lt": return Number(left) < Number(r);
      case "gte": return Number(left) >= Number(r); case "lte": return Number(left) <= Number(r);
      case "truthy": return !!left; default: return true;
    }
  }

  function Engine(store) {
    this.store = store;
    this.workflows = [];
    this.partners = { anthropic: "up", openai: "up", make: "up", google: "up" };  // ops status
    this._subsWired = false;
  }

  Engine.prototype.load = function (defs) {
    this.workflows = (defs || []).map(function (w) {
      return Object.assign({ enabled: true, mode: "auto", steps: [], requires: [] }, w);
    });
    this._wire();
    return this;
  };

  Engine.prototype.setPartner = function (name, status) {
    this.partners[name] = status;
    this.store.emit("automation.partner", { partner: name, status: status });
  };
  Engine.prototype.partnerDown = function (reqs) {
    var self = this;
    return (reqs || []).filter(function (p) { return self.partners[p] && self.partners[p] !== "up"; });
  };

  Engine.prototype._wire = function () {
    if (this._subsWired) return;
    var self = this;
    this.store.on("*", function (payload, evt) {
      if (!evt || evt.indexOf("automation.") === 0 || evt.indexOf("store.") === 0) return;
      self.workflows.forEach(function (w) {
        if (!w.enabled || !w.trigger) return;
        if (w.trigger !== evt) return;
        if (w.when && !evalCond(w.when, payload)) return;
        // Transition semantics: a conditioned workflow fires on an .updated event
        // only when the condition BECOMES true. A record that already matched
        // (e.g. a bid already won) must not re-fire its cascade on later edits —
        // that spawned duplicate jobs.
        if (w.when && evt.indexOf(".updated") > 0 && payload && payload.before) {
          if (evalCond(w.when, { record: payload.before, collection: payload.collection })) return;
        }
        self.run(w, payload, "event");
      });
    });
    this._subsWired = true;
  };

  // Manually fire a workflow by id (Action Hub "run now", tests)
  Engine.prototype.trigger = function (id, payload) {
    var w = this.workflows.filter(function (x) { return x.id === id; })[0];
    if (!w) return null;
    return this.run(w, payload || {}, "manual");
  };

  Engine.prototype.run = function (w, payload, source) {
    var store = this.store;
    var run = { id: store._uid("run"), workflowId: w.id, workflow: w.name, at: new Date().toISOString(),
      source: source, status: "running", trigger: w.trigger, steps: [], actor: "automation" };

    // Partner-outage / fallback gate BEFORE any step executes
    var down = this.partnerDown(w.requires);
    if (down.length) {
      run.status = "deferred";
      run.note = "Partner unavailable: " + down.join(", ") + " — routed to Action Hub for a human.";
      this._toActionHub(w, payload, run.note, "partner_outage");
      return this._finish(run);
    }

    var ctx = Object.assign({}, payload, { now: run.at });
    for (var i = 0; i < w.steps.length; i++) {
      var step = w.steps[i];
      var rec = { action: step.action, label: step.label || step.action, status: "ok" };
      try {
        // money / irreversible → approval, never auto-execute
        if (step.gate === "money" || step.gate === "irreversible") {
          var appr = resolve(step.approval || { title: w.name, tier: step.gate }, ctx);
          store.insert("approvals", Object.assign({ status: "pending", tier: step.gate, source: w.id,
            workflow: w.name, createdBy: "automation" }, appr));
          rec.status = "gated"; rec.detail = "queued for human approval (" + step.gate + ")";
          run.status = "gated";
        } else {
          var out = this._exec(step, ctx);
          rec.detail = out && out.detail;
          if (out && out.record) ctx[step.as || "last"] = out.record;   // chain outputs
        }
      } catch (e) {
        rec.status = "error"; rec.detail = String((e && e.message) || e);
        run.status = "failed";
        this._toActionHub(w, payload, "Automation step failed: " + rec.detail, "error");
      }
      run.steps.push(rec);
      if (run.status === "failed") break;
    }
    if (run.status === "running") run.status = "completed";
    return this._finish(run);
  };

  // Cascade-created records carry REAL provenance (founder #1): the acting
  // session user (whose click fired the trigger) is stamped as created_by,
  // not the anonymous "automation" — the engine only runs because they acted.
  function actorName() {
    try {
      var s = window.KeystoneAuth && window.KeystoneAuth.current && window.KeystoneAuth.current();
      if (s && s.name) return s.name;
    } catch (_) {}
    return "automation";
  }
  // Anchor to the app-level TODAY the UI uses (modules.js publishes
  // window.KEYSTONE_TODAY) — a raw toISOString().slice() is UTC and stamps
  // TOMORROW's date in US evenings, so cascade-created records read
  // "created after last update". Fallback builds the date in LOCAL time.
  function todayStr() {
    if (typeof window !== "undefined" && window.KEYSTONE_TODAY) return String(window.KEYSTONE_TODAY);
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }

  Engine.prototype._exec = function (step, ctx) {
    var store = this.store, p = resolve(step.params || {}, ctx);
    switch (step.action) {
      case "create": {
        var data = p.data || {};
        if (data.created_by == null) data.created_by = actorName();
        if (data.created_date == null) data.created_date = todayStr();
        if (data.last_update_by == null) data.last_update_by = data.created_by;
        if (data.last_update_date == null) data.last_update_date = data.created_date;
        return { record: store.insert(p.collection, data), detail: "created " + p.collection };
      }
      case "update":
        return { record: store.update(p.collection, p.id, p.patch || {}), detail: "updated " + p.collection };
      case "task":
        return { record: store.insert("tasks", Object.assign({ status: "open", kind: p.kind || "review",
          dept: p.dept || "Ops", source: "automation" }, p)), detail: "task created" };
      case "notify":
        return { record: store.insert("notifications", { channel: p.channel || "inapp", to: p.to || "",
          message: p.message || "", at: new Date().toISOString() }), detail: "notified " + (p.to || p.channel) };
      case "webhook":  // simulated outbound integration call (real MODE=api would fetch)
        return { detail: "POST " + (p.url || "webhook") + " (" + (p.event || "event") + ")" };
      case "noop":
        return { detail: p.detail || "ok" };
      default:
        return { detail: "unknown action " + step.action };
    }
  };

  Engine.prototype._toActionHub = function (w, payload, reason, kind) {
    this.store.insert("tasks", {
      status: "open", kind: "automation_fallback", dept: w.dept || "Ops",
      title: w.name + " — needs a human", detail: reason, source: "automation", workflow: w.id,
      payload: payload && payload.record ? { collection: payload.collection, id: payload.record.id } : null,
      reason: kind,
    });
  };

  Engine.prototype._finish = function (run) {
    this.store.insert("_runs", run, { silent: true });
    this.store.emit("automation.run", run);
    return run;
  };

  Engine.prototype.runs = function (limit) { return this.store.list("_runs").slice(0, limit || 50); };

  // instantiate once the store exists; load defs from tenant config
  var engine = new Engine(window.KeystoneStore);
  var defs = (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.workflows) || [];
  engine.load(defs);
  window.KeystoneAutomation = engine;
})();
