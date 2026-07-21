/* ============================================================================
 * KEYSTONE · CORE LEDGER — event-sourced, derived-balance accounting
 * ----------------------------------------------------------------------------
 * The doctrine that makes Keystone trustworthy as a system of record, and the
 * thing CMiC gets wrong: balances are NEVER stored as mutable figures. Every
 * financial fact is an immutable debit/credit activity row in `glActivity`;
 * the Trial Balance, an account balance, and each job's Cost Status
 * (Budget / Committed / Spent / Remaining / Billed / Margin) are all SUM()ed
 * from those rows at query time. Nothing can drift, reopen, or double-count.
 *
 * Sub-ledger control accounts (AP/AR/JC) are only posted by their sub-ledgers
 * — postJournal is the single write path, so a voucher post, an AR invoice,
 * and a cost transaction all land here the same way and the control accounts
 * stay reconciled by construction.
 * ==========================================================================*/
(function () {
  "use strict";
  var Store = window.KeystoneStore;
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  /* ---- store hygiene (runs once at load, embedded mode only) --------------
   * The chart of accounts lives in `glAccounts`; `accounts` is the CRM customer
   * master. Older snapshots (and fixture extensions that pushed chart rows into
   * `accounts`) are migrated here so both collections are always well-formed. */
  (function hygiene() {
    try {
      if (Store.config && Store.config.MODE === "api") return;   // seed.json is authoritative there
      var T = window.KEYSTONE_TENANT || {}, seedC = T.collections || {};
      var db = Store.db || {};
      function cp(x) { return JSON.parse(JSON.stringify(x)); }
      // 1) collections added after this snapshot was saved → backfill from the fixture
      Object.keys(seedC).forEach(function (k) { if (!db[k]) db[k] = cp(seedC[k]); });
      // 2) chart rows that landed in the CRM accounts collection → move to glAccounts
      var crm = [];
      (db.accounts || []).forEach(function (a) {
        if (a && a.account_code) {
          var dupe = (db.glAccounts || []).some(function (g) { return g.account_code === a.account_code; });
          if (!dupe) (db.glAccounts = db.glAccounts || []).push(a);
        } else crm.push(a);
      });
      db.accounts = crm;
      // pre-rename snapshots lost the CRM customers entirely — restore from the fixture
      if (!db.accounts.length && seedC.accounts) db.accounts = cp(seedC.accounts);
      // 3) contracts schema upgrade (draws history + application_no + multi-line SOV)
      if ((db.contracts || []).some(function (c) { return !c.draws; }) && seedC.contracts) db.contracts = cp(seedC.contracts);
      Store._persist();
    } catch (e) { if (window.console) console.warn("[keystone] ledger hygiene skipped", e); }
  })();

  var Ledger = {
    accounts: function () { return Store.list("glAccounts"); },
    account: function (code) { return Store.list("glAccounts").filter(function (a) { return a.account_code === code; })[0] || null; },

    // raw signed activity for an account = Σdebit − Σcredit
    _net: function (code) {
      return Store.list("glActivity").reduce(function (s, r) {
        return r.account === code ? s + (Number(r.debit) || 0) - (Number(r.credit) || 0) : s;
      }, 0);
    },

    // Balance in the account's natural sign (assets/expenses positive on debit;
    // liabilities/equity/revenue positive on credit).
    balance: function (code) {
      var a = this.account(code); var net = this._net(code);
      var crNormal = a && (a.account_type === "liability" || a.account_type === "equity" || a.account_type === "revenue");
      return r2(crNormal ? -net : net);
    },

    trialBalance: function () {
      var self = this;
      var rows = this.accounts().map(function (a) {
        var net = self._net(a.account_code);
        return { code: a.account_code, name: a.account_name, type: a.account_type,
          debit: net > 0 ? r2(net) : 0, credit: net < 0 ? r2(-net) : 0 };
      }).filter(function (r) { return r.debit || r.credit; });
      var td = rows.reduce(function (s, r) { return s + r.debit; }, 0);
      var tc = rows.reduce(function (s, r) { return s + r.credit; }, 0);
      return { rows: rows, totalDebit: r2(td), totalCredit: r2(tc), balanced: Math.abs(td - tc) < 0.005 };
    },

    // Cost-to-date for a job = Σ debits on COGS-type accounts tagged to that job.
    jobSpent: function (jobCode) {
      var cogs = {};
      Store.list("glAccounts").forEach(function (a) { if (a.account_type === "cogs") cogs[a.account_code] = true; });
      return r2(Store.list("glActivity").reduce(function (s, r) {
        return (r.job_code === jobCode && cogs[r.account]) ? s + (Number(r.debit) || 0) - (Number(r.credit) || 0) : s;
      }, 0));
    },

    jobBilled: function (jobCode) {
      return r2(Store.list("arInvoices").filter(function (i) { return i.job_id === jobCode; })
        .reduce(function (s, i) { return s + (Number(i.sales_amount) || 0); }, 0));
    },

    jobCostStatus: function (jobCode) {
      var job = Store.list("jobs").filter(function (j) { return j.job_code === jobCode; })[0] || {};
      var budget = r2(Store.list("budgetLines").filter(function (b) { return b.job_code === jobCode; })
        .reduce(function (s, b) { return s + (Number(b.current_cost) || 0); }, 0)) || job.budget_cost || 0;
      var committed = r2(Store.list("commitments").filter(function (c) { return c.job_code === jobCode; })
        .reduce(function (s, c) { return s + (Number(c.original_value) || 0); }, 0)) || job.committed || 0;
      var spent = this.jobSpent(jobCode);
      var contract = Number(job.contract_amount) || 0;
      var billed = this.jobBilled(jobCode);
      var forecastCost = Math.max(budget, committed, spent);
      return {
        job_code: jobCode, contract: contract, budget: budget, committed: committed,
        spent: spent, remaining: r2(budget - spent), uncommitted: r2(budget - committed),
        billed: billed, forecastCost: r2(forecastCost),
        margin: r2(contract - forecastCost), marginPct: contract ? r2((contract - forecastCost) / contract * 100) : 0,
        pctSpent: budget ? Math.min(100, Math.round(spent / budget * 100)) : 0,
      };
    },

    // THE single write path. lines: [{account, debit?, credit?, job_code?, cost_code?, category?, memo?}]
    postJournal: function (j) {
      var lines = j.lines || [];
      var td = lines.reduce(function (s, l) { return s + (Number(l.debit) || 0); }, 0);
      var tc = lines.reduce(function (s, l) { return s + (Number(l.credit) || 0); }, 0);
      if (Math.abs(td - tc) > 0.005) throw new Error("unbalanced journal (Dr " + r2(td) + " ≠ Cr " + r2(tc) + ")");
      // Every line must hit a real chart account — validated BEFORE any write.
      // Tolerance: if the chart is empty (mid-hygiene/migration), skip validation.
      var chart = Store.list("glAccounts");
      if (chart && chart.length) {
        var known = {};
        chart.forEach(function (a) { known[a.account_code] = true; });
        for (var vi = 0; vi < lines.length; vi++) {
          if (!known[lines[vi].account]) throw new Error("Unknown GL account " + lines[vi].account);
        }
      }
      var jid = Store._uid("jnl");
      var date = j.date || new Date().toISOString().slice(0, 10);
      lines.forEach(function (l) {
        Store.insert("glActivity", {
          journal_id: jid, date: date, account: l.account, debit: r2(l.debit || 0), credit: r2(l.credit || 0),
          job_code: l.job_code || null, cost_code: l.cost_code || null, category: l.category || null,
          memo: l.memo || j.memo || "", source: j.source || "manual", source_ref: j.source_ref || null, period: date.slice(0, 7),
        }, { silent: true });
      });
      Store.emit("gl.posted", { journal_id: jid, memo: j.memo, amount: r2(td), source: j.source, lines: lines.length });
      return jid;
    },

    activity: function (filter) { return Store.list("glActivity", filter); },

    // Shared earned-value progress source — WIP schedule, % complete billing and
    // over/under-billing all read THIS so they can never disagree. All derived:
    // contract from jobCostStatus, cost-to-date from ledger activity, billed
    // from arInvoices sales_amount.
    jobProgress: function (job_code) {
      var st = this.jobCostStatus(job_code);
      var contract = st.contract;
      var budget = st.budget;
      var costToDate = st.spent;
      var pct = budget ? (costToDate / budget * 100) : 0;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      pct = r2(pct);
      var earnedRevenue = r2(contract * pct / 100);
      var billedToDate = this.jobBilled(job_code);
      return {
        contract: contract, budget: budget, costToDate: costToDate,
        pctComplete: pct, earnedRevenue: earnedRevenue, billedToDate: billedToDate,
        overUnder: r2(billedToDate - earnedRevenue),
      };
    },
  };

  window.KeystoneLedger = Ledger;
})();
