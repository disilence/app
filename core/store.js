/* ============================================================================
 * KEYSTONE · CORE STORE — the native system of record (replaces CMiC)
 * ----------------------------------------------------------------------------
 * This is the seam that makes Keystone the ERP rather than a skin over one.
 * Every module reads and writes ONLY through KeystoneStore. Today the backing
 * is an in-browser database seeded from the tenant fixture and persisted to
 * localStorage, so the app is fully runnable at $0 and edits survive reloads
 * (proving "we own the data"). Flipping CONFIG.MODE to "api" points the exact
 * same calls at the Keystone REST API (Cloud Run + Postgres on GCP) — no
 * module changes, because modules never know where the data lives.
 *
 * Three things an enterprise system of record must have, built in here:
 *   1. An EVENT BUS. Every mutation emits `<collection>.<op>` — this is what
 *      the automation engine subscribes to (a won opportunity fires the
 *      job-creation workflow; a received invoice fires 3-way match).
 *   2. An AUDIT LOG. Every write appends to `_audit` (who/what/when/before).
 *      Non-negotiable for finance; also the human-readable activity feed.
 *   3. IDENTITY + TENANCY. Records carry `id`, timestamps, and the acting
 *      user. Multi-tenant isolation is per-store (one store per tenant).
 * ==========================================================================*/
(function () {
  "use strict";

  var CONFIG = {
    MODE: "embedded",        // "embedded" (localStorage) | "api" (Keystone REST)
    API_BASE: "",            // e.g. https://api.keystone.disilence.com/v1  (MODE=api)
    PERSIST: true,           // write-through to localStorage in embedded mode
  };
  try {
    var q = new URLSearchParams(location.search);
    if (q.has("api")) { CONFIG.MODE = "api"; CONFIG.API_BASE = q.get("api") || ""; }
    if (q.has("fresh")) CONFIG.PERSIST = false;   // ignore saved state, reseed
  } catch (_) {}

  function uid(prefix) {
    // deterministic-ish, no Math.random dependency at module load
    uid._n = (uid._n || 0) + 1;
    return (prefix || "id") + "_" + Date.now().toString(36) + uid._n.toString(36);
  }
  function nowISO() { return new Date().toISOString(); }
  function clone(x) { return x == null ? x : JSON.parse(JSON.stringify(x)); }

  function Store() {
    this.tenant = (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.id) || "keystone";
    this.pkey = "keystone.data." + this.tenant;
    this.db = {};
    this._subs = {};       // event -> [fn]
    this._load();
  }

  Store.prototype._seed = function () {
    var seed = (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.collections) || {};
    this.db = clone(seed);
    if (!this.db._audit) this.db._audit = [];
    this._persist();
  };

  Store.prototype._load = function () {
    if (CONFIG.MODE === "api") { this.db = { _audit: [] }; return; }   // hydrated by loadSnapshot()
    if (CONFIG.MODE === "embedded" && CONFIG.PERSIST) {
      try {
        var raw = localStorage.getItem(this.pkey);
        if (raw) {
          var saved = JSON.parse(raw);
          // reseed if the tenant fixture version bumped (schema evolution)
          var v = (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.version) || 1;
          if (saved.__v === v) { this.db = saved.db; return; }
        }
      } catch (_) {}
    }
    this._seed();
  };

  Store.prototype._persist = function () {
    if (CONFIG.MODE !== "embedded" || !CONFIG.PERSIST) return;
    try {
      var v = (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.version) || 1;
      localStorage.setItem(this.pkey, JSON.stringify({ __v: v, db: this.db }));
    } catch (_) {}
  };

  Store.prototype.reset = function () {
    try { localStorage.removeItem(this.pkey); } catch (_) {}
    this._seed();
    this.emit("store.reset", {});
  };

  /* ---- API mode (Phase 1 backend) --------------------------------------- *
   * Reads: hydrate the whole tenant snapshot once, then serve reads from the
   * in-memory cache so modules stay synchronous (same pattern as the Command
   * Center adapter). Writes: apply locally (optimistic) AND write through to the
   * Keystone API; a transport failure degrades gracefully (local state holds). */
  Store.prototype.loadSnapshot = function () {
    var self = this;
    return fetch(CONFIG.API_BASE + "/v1/snapshot", { headers: { "X-Keystone-Tenant": self.tenant } })
      .then(function (r) { return r.json(); })
      .then(function (snap) { self.db = snap.collections || {}; if (!self.db._audit) self.db._audit = []; return self.db; });
  };
  Store.prototype._sync = function (method, path, body) {
    if (CONFIG.MODE !== "api") return;
    try {
      fetch(CONFIG.API_BASE + path, {
        method: method, headers: { "Content-Type": "application/json", "X-Keystone-Tenant": this.tenant },
        body: body ? JSON.stringify(body) : undefined,
      }).catch(function (e) { if (window.console) console.warn("[keystone] sync failed", method, path, e); });
    } catch (_) {}
  };

  /* ---- Event bus -------------------------------------------------------- */
  Store.prototype.on = function (evt, fn) {
    (this._subs[evt] = this._subs[evt] || []).push(fn);
    return this;
  };
  Store.prototype.emit = function (evt, payload) {
    var self = this;
    var fire = function (e) { (self._subs[e] || []).forEach(function (fn) { try { fn(payload, evt); } catch (err) { /* isolate */ } }); };
    fire(evt);
    fire("*");   // wildcard for the live activity feed
    return this;
  };

  /* ---- Reads ------------------------------------------------------------ */
  Store.prototype.all = function (col) { return clone(this.db[col] || []); };
  Store.prototype.list = function (col, filter) {
    var rows = this.db[col] || [];
    if (typeof filter === "function") rows = rows.filter(filter);
    else if (filter && typeof filter === "object") {
      rows = rows.filter(function (r) { return Object.keys(filter).every(function (k) { return r[k] === filter[k]; }); });
    }
    return clone(rows);
  };
  Store.prototype.get = function (col, id) {
    var r = (this.db[col] || []).filter(function (x) { return x.id === id; })[0];
    return clone(r || null);
  };
  Store.prototype.count = function (col, filter) { return this.list(col, filter).length; };
  Store.prototype.collections = function () { return Object.keys(this.db).filter(function (k) { return k[0] !== "_"; }); };

  /* ---- Writes (audited + evented) --------------------------------------- */
  Store.prototype._actor = function () {
    var s = window.KeystoneAuth && KeystoneAuth.current();
    return s ? { name: s.name, email: s.email, role: s.role } : { name: "system", email: "system", role: "system" };
  };
  Store.prototype._audit = function (op, col, id, before, after) {
    var a = this.db._audit || (this.db._audit = []);
    a.unshift({ id: uid("aud"), at: nowISO(), op: op, collection: col, ref: id,
      actor: this._actor(), summary: (op + " " + col + " " + (id || "")).trim(),
      before: before ? clone(before) : null, after: after ? clone(after) : null });
    if (a.length > 500) a.length = 500;
  };

  Store.prototype.insert = function (col, rec, opts) {
    opts = opts || {};
    var row = Object.assign({ id: rec.id || uid(col.slice(0, 3)) }, rec);
    row.createdAt = row.createdAt || nowISO();
    row.updatedAt = nowISO();
    (this.db[col] = this.db[col] || []).unshift(row);
    this._audit("create", col, row.id, null, row);
    this._persist();
    if (!opts.noSync) this._sync("POST", "/v1/" + col, row);
    if (!opts.silent) this.emit(col + ".created", { collection: col, record: clone(row) });
    return clone(row);
  };

  Store.prototype.update = function (col, id, patch, opts) {
    opts = opts || {};
    var arr = this.db[col] || [], i = arr.findIndex(function (x) { return x.id === id; });
    if (i < 0) return null;
    var before = clone(arr[i]);
    arr[i] = Object.assign({}, arr[i], patch, { updatedAt: nowISO() });
    this._audit("update", col, id, before, arr[i]);
    this._persist();
    if (!opts.noSync) this._sync("PATCH", "/v1/" + col + "/" + id, patch);
    if (!opts.silent) this.emit(col + ".updated", { collection: col, record: clone(arr[i]), before: before, patch: patch });
    return clone(arr[i]);
  };

  Store.prototype.remove = function (col, id, opts) {
    opts = opts || {};
    var arr = this.db[col] || [], i = arr.findIndex(function (x) { return x.id === id; });
    if (i < 0) return false;
    var before = clone(arr[i]);
    arr.splice(i, 1);
    this._audit("delete", col, id, before, null);
    this._persist();
    if (!opts.noSync) this._sync("DELETE", "/v1/" + col + "/" + id);
    if (!opts.silent) this.emit(col + ".deleted", { collection: col, record: before });
    return true;
  };

  /* Convenience: append to a nested array on a record (job thread, SOV lines) */
  Store.prototype.pushInto = function (col, id, field, item) {
    var r = (this.db[col] || []).filter(function (x) { return x.id === id; })[0];
    if (!r) return null;
    (r[field] = r[field] || []).push(item);
    r.updatedAt = nowISO();
    this._audit("append", col, id, null, { field: field, item: item });
    this._persist();
    this.emit(col + ".updated", { collection: col, record: clone(r), appended: { field: field, item: item } });
    return clone(r);
  };

  Store.prototype.audit = function (limit) { return clone((this.db._audit || []).slice(0, limit || 100)); };
  Store.prototype.config = CONFIG;

  // one store per tenant, created after the tenant fixture loads
  window.KeystoneStore = new Store();
  window.KeystoneStore._uid = uid;
})();
