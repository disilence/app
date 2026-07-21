/* ============================================================================
 * KEYSTONE · OUTPUT ENGINE — record · PRINT · PUSH (CMiC-parity output layer)
 * ----------------------------------------------------------------------------
 * The layer an ERP needs to actually RUN a business: generate the printable
 * documents (checks, invoices, POs, AIA-format G702/G703 draws, RFIs, 1099-NEC,
 * certified payroll WH-347, statements, financial statements) and the
 * electronic PUSH files (NACHA ACH for AP/payroll, bank positive-pay).
 * Everything derives from the native store + ledger, so a printed check ties
 * to the same journal the ledger recorded.
 *
 * CHECK SYSTEM — format-driven (like CMiC's check-template picker):
 *   window.KeystoneOutput.checkFormats lists the available layouts. The
 *   DEFAULT ("figures-top-2") prints FIGURES ONLY into pre-printed check
 *   stock — bank block, borders, PAY-TO labels and the MICR line are already
 *   on the stock, so Keystone prints nothing but date / payee / amount /
 *   amount-in-words / memo at the industry-standard positions, plus the two
 *   remittance stubs (stub area of the stock is blank). On screen a light-gray
 *   ".stock-sim" underlay shows what the stock pre-prints; print.css strips it
 *   so paper output is figures only. "full-*" formats draw the whole face
 *   (blank-stock shops) with optional MICR-style encoding line.
 *   Docs.checkAlignment(formatId) prints X-patterns at every field position
 *   for stock alignment testing.
 *
 * Print = a clean print sheet (only the document prints; app chrome is hidden
 * by the print stylesheet — assets/print.css). Push = a real file download in
 * the correct format. Demo-printable today; production adds MICR toner, live
 * bank transmission, and IRS e-file — flagged in the capability matrix, never
 * faked.
 * ==========================================================================*/
(function () {
  "use strict";

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function usd(n, cents) { var v = Number(n) || 0; return v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents === false ? 0 : 2, maximumFractionDigits: 2 }); }
  function dt(iso) { if (!iso) return "—"; var d = new Date(String(iso).slice(0, 10) + "T00:00:00"); return isNaN(d) ? String(iso) : d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }); }
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function xs(n) { return Array((n || 8) + 1).join("X"); }

  var ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function under1000(n) {
    var s = "";
    if (n >= 100) { s += ONES[Math.floor(n / 100)] + " hundred"; n %= 100; if (n) s += " "; }
    if (n >= 20) { s += TENS[Math.floor(n / 10)]; n %= 10; if (n) s += "-" + ONES[n]; }
    else if (n > 0) s += ONES[n];
    return s;
  }
  function amountWords(amt) {
    amt = Number(amt) || 0;
    var whole = Math.floor(amt), cents = Math.round((amt - whole) * 100);
    var parts = [], groups = ["", " thousand", " million"], i = 0;
    if (whole === 0) parts.push("zero");
    while (whole > 0 && i < 3) { var g = whole % 1000; if (g) parts.unshift(under1000(g) + groups[i]); whole = Math.floor(whole / 1000); i++; }
    var words = parts.join(" ").replace(/\s+/g, " ").trim();
    words = words.charAt(0).toUpperCase() + words.slice(1);
    return words + " and " + (cents < 10 ? "0" + cents : cents) + "/100";
  }
  function tenant() { return window.KEYSTONE_TENANT || { name: "Company" }; }
  function company() { var t = tenant(); return { name: t.name || "the enterprise", addr: "1 Studio Way, Suite 100", city: "Atlanta, GA 30303" }; }
  function banking() { return (tenant().banking) || {}; }
  function bankName() { return banking().bank_name || "First National Bank"; }
  function bankRouting() { return String(banking().routing || "051000017"); }
  function bankAccount() { return String(banking().account || "1234567890"); }
  function bankFractional() { return banking().fractional || "68-424/514"; }

  /* ---- print surface + download ---------------------------------------- */
  function show(title, html) {
    var wrap = document.getElementById("printsheet");
    if (!wrap) return;
    document.getElementById("printTitle").textContent = title;
    var sheet = document.getElementById("printSheet");
    sheet.innerHTML = html;
    // check pages need full-bleed physical geometry — flag the sheet
    if (html && String(html).indexOf("ck-page") !== -1) sheet.className = "sheet has-checks";
    else sheet.className = "sheet";
    wrap.classList.add("on");
    wrap.scrollTop = 0;
  }
  function download(filename, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || "text/plain" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 200);
    } catch (e) { if (window.console) console.warn("download failed", e); }
  }

  /* ======================================================================
   * CHECK SYSTEM — format registry + resolution + page renderers
   * ====================================================================== */
  var CHECK_FORMATS = [
    { id: "figures-top-2", label: "Figures only · check on top · 2 stubs", position: "top", stubs: 2, face: "figures" },   // DEFAULT — matches Solid today
    { id: "figures-bottom-2", label: "Figures only · check on bottom · 2 stubs", position: "bottom", stubs: 2, face: "figures" },
    { id: "figures-middle-1", label: "Figures only · check in middle · 1 stub", position: "middle", stubs: 1, face: "figures" },
    { id: "full-top-2", label: "Full face + MICR · check on top · 2 stubs (blank stock)", position: "top", stubs: 2, face: "full", micr: true },
    { id: "full-bottom-2", label: "Full face + MICR · check on bottom · 2 stubs (blank stock)", position: "bottom", stubs: 2, face: "full", micr: true },
  ];
  function checkFormatById(id) {
    if (!id) return null;
    if (typeof id === "object") return id;
    for (var i = 0; i < CHECK_FORMATS.length; i++) if (CHECK_FORMATS[i].id === id) return CHECK_FORMATS[i];
    return null;
  }
  // Resolution order: opts.format → legacy opts.micr → localStorage → tenant → default
  function resolveCheckFormat(opts) {
    opts = opts || {};
    var f = checkFormatById(opts.format);
    if (!f && opts.micr === true) f = checkFormatById("full-top-2"); // legacy micr toggle
    if (!f) { try { f = checkFormatById(localStorage.getItem("keystone.checkFormat")); } catch (e) { f = null; } }
    if (!f) f = checkFormatById((tenant().print || {}).checkFormat);
    if (!f) f = checkFormatById("figures-top-2");
    return f;
  }

  function micrLine(number) {
    return "⑈" + esc(number) + "⑈ ⑆" + esc(bankRouting()) + "⑆ " + esc(bankAccount()) + "⑈";
  }

  // The gray SIMULATED pre-printed stock — screen preview only (print.css
  // hides .stock-sim entirely under @media print).
  function stockSim(o, align) {
    var c = company();
    return '<div class="stock-sim">' +
      '<div class="ss-frame"></div><div class="ss-frame2"></div>' +
      '<div class="ss-co"><b>' + esc(c.name) + "</b><br/>" + esc(c.addr) + "<br/>" + esc(c.city) + "</div>" +
      '<div class="ss-bank">' + esc(bankName()).toUpperCase() + '<br/><span class="ss-pre">[pre-printed by check stock]</span></div>' +
      '<div class="ss-no">No. ' + esc(align ? "000000" : o.number) + "</div>" +
      '<div class="ss-frac">' + esc(bankFractional()) + "</div>" +
      '<div class="ss-date-l">DATE</div><div class="ss-dateline"></div>' +
      '<div class="ss-payl">PAY TO THE<br/>ORDER OF</div><div class="ss-payline"></div>' +
      '<div class="ss-dollar">$</div><div class="ss-amtbox"></div>' +
      '<div class="ss-wordline"></div><div class="ss-dollars">DOLLARS</div>' +
      '<div class="ss-memo-l">MEMO</div><div class="ss-memoline"></div>' +
      '<div class="ss-void">VOID AFTER 90 DAYS</div>' +
      '<div class="ss-sig"></div><div class="ss-sig-l">AUTHORIZED SIGNATURE</div>' +
      '<div class="ss-micr">' + micrLine(align ? "000000" : o.number) + "</div>" +
      "</div>";
  }

  // FIGURES ONLY — nothing prints in the check zone but these fields.
  function checkZoneFigures(o, align) {
    var f;
    if (align) {
      f = { date: "XX/XX/XXXX", payee: xs(30), amt: "$X,XXX,XXX.XX", words: xs(5) + " " + xs(8) + " " + xs(7) + " " + xs(5) + " and XX/100", memo: xs(16) };
    } else {
      f = { date: dt(o.date), payee: esc(o.payee), amt: usd(o.amount), words: esc(amountWords(o.amount)), memo: o.memo ? esc(o.memo) : "" };
    }
    return '<div class="ck-zone ck-check">' + stockSim(o, align) +
      '<div class="ck-f ck-date">' + f.date + "</div>" +
      '<div class="ck-f ck-payee">' + f.payee + "</div>" +
      '<div class="ck-f ck-amt">' + f.amt + "</div>" +
      '<div class="ck-f ck-words">' + f.words + ' <span class="ck-fill">' + Array(36).join("*") + "</span></div>" +
      (f.memo ? '<div class="ck-f ck-memo">' + f.memo + "</div>" : "") +
      "</div>";
  }

  // FULL FACE — drawn check for blank stock, bank identity from tenant.banking.
  function checkZoneFull(o, fmt, opts, align) {
    var c = company();
    var wantMicr = fmt.micr || (opts && opts.micr);
    var payee = align ? xs(30) : esc(o.payee);
    var amt = align ? "$X,XXX,XXX.XX" : usd(o.amount);
    var words = align ? xs(6) + " " + xs(8) + " " + xs(7) + " and XX/100" : esc(amountWords(o.amount));
    var date = align ? "XX/XX/XXXX" : dt(o.date);
    var num = align ? "000000" : esc(o.number);
    return '<div class="ck-zone ck-checkzone"><div class="ck-fullface">' +
      '<div class="ckf-top">' +
        '<div class="ckf-co"><b>' + esc(c.name) + "</b><br/>" + esc(c.addr) + "<br/>" + esc(c.city) + "</div>" +
        '<div class="ckf-bank">' + esc(bankName()) + '<br/><span class="ckf-frac">' + esc(bankFractional()) + "</span></div>" +
        '<div class="ckf-no">No. ' + num + '<div class="ckf-date">Date&nbsp; <span class="ckf-u">' + date + "</span></div></div>" +
      "</div>" +
      '<div class="ckf-payline"><span class="ckf-l">PAY TO THE<br/>ORDER OF</span><span class="ckf-payee">' + payee + '</span><span class="ckf-amt">' + amt + "</span></div>" +
      '<div class="ckf-words">' + words + ' <span class="ckf-fill">' + Array(30).join("*") + "</span> DOLLARS</div>" +
      '<div class="ckf-bot">' +
        '<div class="ckf-memo">' + (o.memo && !align ? "MEMO&nbsp; " + esc(o.memo) : (align ? "MEMO&nbsp; " + xs(14) : "")) + '<div class="ckf-void">VOID AFTER 90 DAYS</div></div>' +
        '<div class="ckf-sig">AUTHORIZED SIGNATURE</div>' +
      "</div>" +
      (wantMicr ? '<div class="ckf-micr">' + micrLine(num) + "</div>" : "") +
      "</div></div>";
  }

  // Remittance stub — this DOES print (stub area of the stock is blank).
  function stubInvoices(o) {
    var list = o.invoices;
    if (!list || !list.length) list = [{ num: o.memo || "—", amount: o.amount }];
    return list.map(function (i) {
      var gross = i.gross != null ? i.gross : (i.amount || 0);
      var disc = i.discount || 0;
      var net = i.net != null ? i.net : r2(gross - disc);
      return { num: i.num || i.invoice_number || "—", date: i.date || o.date, gross: gross, discount: disc, net: net };
    });
  }
  function checkStub(o, tag, align) {
    var c = company();
    if (align) {
      return '<div class="ck-zone ck-stub"><div class="ck-stub-hd"><b>' + xs(20) + '</b><span class="ck-tag">' + esc(tag) + "</span></div>" +
        '<div class="ck-stub-sub">Check No. XXXXXX · XX/XX/XXXX · Pay to: ' + xs(24) + "</div>" +
        '<table class="ck-st"><thead><tr><th>Invoice</th><th>Date</th><th class="r">Gross</th><th class="r">Discount</th><th class="r">Net</th></tr></thead><tbody>' +
        '<tr><td>' + xs(10) + "</td><td>XX/XX/XXXX</td><td class=\"r\">$X,XXX.XX</td><td class=\"r\">$X.XX</td><td class=\"r\">$X,XXX.XX</td></tr>" +
        '<tr class="tot"><td colspan="4">Total</td><td class="r">$X,XXX.XX</td></tr></tbody></table></div>';
    }
    var inv = stubInvoices(o);
    var tot = inv.reduce(function (s, i) { return s + i.net; }, 0);
    return '<div class="ck-zone ck-stub">' +
      '<div class="ck-stub-hd"><b>' + esc(c.name) + '</b><span class="ck-tag">' + esc(tag) + "</span></div>" +
      '<div class="ck-stub-sub">Check No. ' + esc(o.number) + " · " + dt(o.date) + " · Pay to: " + esc(o.payee) + "</div>" +
      '<table class="ck-st"><thead><tr><th>Invoice</th><th>Date</th><th class="r">Gross</th><th class="r">Discount</th><th class="r">Net</th></tr></thead><tbody>' +
      inv.map(function (i) { return "<tr><td>" + esc(i.num) + "</td><td>" + dt(i.date) + '</td><td class="r">' + usd(i.gross) + '</td><td class="r">' + (i.discount ? "(" + usd(i.discount) + ")" : "—") + '</td><td class="r">' + usd(i.net) + "</td></tr>"; }).join("") +
      '<tr class="tot"><td colspan="4">Total</td><td class="r">' + usd(tot) + "</td></tr></tbody></table></div>";
  }

  // One full 8.5in × 11in check page in the given format.
  function checkPage(o, fmt, opts, last, align) {
    o = o || {};
    var chk = fmt.face === "full" ? checkZoneFull(o, fmt, opts, align) : checkZoneFigures(o, align);
    var stubs = [];
    if (fmt.stubs >= 1) stubs.push(checkStub(o, "Remittance — vendor copy", align));
    if (fmt.stubs >= 2) stubs.push(checkStub(o, "Remittance — file copy", align));
    var zones;
    if (fmt.position === "bottom") zones = stubs.concat([chk]);
    else if (fmt.position === "middle") zones = [stubs[0] || '<div class="ck-zone ck-blank"></div>', chk].concat(stubs.slice(1));
    else zones = [chk].concat(stubs);
    var note = "";
    if (fmt.face === "figures") {
      note = '<div class="ck-note">' + (align ? "ALIGNMENT TEST — X marks every printed field · " : "") +
        "gray = pre-printed on stock — not printed by Keystone · format: " + esc(fmt.label) + "</div>";
    } else if (align) {
      note = '<div class="ck-note">ALIGNMENT TEST — X marks every printed field · format: ' + esc(fmt.label) + "</div>";
    }
    return '<div class="ck-page' + (last ? " ck-final" : "") + '">' + note + zones.join("") + "</div>";
  }

  /* ---- document templates (return print HTML) -------------------------- */
  var Docs = {
    check: function (o, opts) {
      // o: { number, date, payee, amount, memo, invoices:[{num,date,gross,discount,net}|{num,amount}] }
      // opts: { format: "figures-top-2" | format object, micr: true (legacy → full face) }
      opts = opts || {};
      return checkPage(o, resolveCheckFormat(opts), opts, true, false);
    },
    // Batch check run: one page per check, page-break per page, single format.
    checksBatch: function (list, opts) {
      opts = opts || {};
      var fmt = resolveCheckFormat(opts);
      return (list || []).map(function (c, i) { return checkPage(c, fmt, opts, i === list.length - 1, false); }).join("");
    },
    // Stock alignment test — X-pattern strings at every field position.
    checkAlignment: function (formatId) {
      var fmt = checkFormatById(formatId) || resolveCheckFormat();
      return checkPage({ number: "000000", date: "2026-07-18", payee: "", amount: 0, memo: "" }, fmt, {}, true, true);
    },
    checkRegister: function (checks, opts) {
      opts = opts || {};
      checks = checks || [];
      var tot = checks.reduce(function (s, c) { return s + (c.amount || 0); }, 0);
      var dates = checks.map(function (c) { return String(c.date || ""); }).filter(function (d) { return d; }).sort();
      var range = dates.length ? dt(dates[0]) + " – " + dt(dates[dates.length - 1]) : "—";
      var acct = String(opts.account || bankAccount());
      var running = 0;
      return doc("Check Register", header("CHECK REGISTER", "Disbursements — " + range, "Bank: " + bankName() + " · Account ····" + acct.slice(-4) + " · " + checks.length + " checks") +
        '<table class="pd-t"><thead><tr><th>Check #</th><th>Date</th><th>Payee</th><th>Memo</th><th class="r">Amount</th><th class="r">Running total</th></tr></thead><tbody>' +
        checks.map(function (c) { running = r2(running + (c.amount || 0)); return "<tr><td>" + esc(c.number) + "</td><td>" + dt(c.date) + "</td><td>" + esc(c.payee) + "</td><td>" + esc(c.memo || "") + '</td><td class="r">' + usd(c.amount) + '</td><td class="r">' + usd(running) + "</td></tr>"; }).join("") +
        '<tr class="tot"><td colspan="4">Total — ' + checks.length + ' checks</td><td class="r">' + usd(tot) + '</td><td class="r">' + usd(tot) + "</td></tr></tbody></table>");
    },
    invoice: function (o) {
      // o: { number, date, due, terms, customer, remit_to, job, contract_ref, po_ref,
      //      lines:[{desc,qty,uom,unit,amount}], retainage | retainage_pct, prior_billed, notes }
      o = o || {};
      var c = company();
      var lines = (o.lines && o.lines.length ? o.lines : [{ desc: "Contract billing", amount: o.amount || 0 }]).map(function (l) {
        var amount = l.amount != null ? l.amount : r2((Number(l.qty) || 0) * (Number(l.unit) || 0));
        return { desc: l.desc || "—", qty: l.qty, uom: l.uom || "", unit: l.unit, amount: amount };
      });
      var sub = r2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
      var retPct = o.retainage_pct != null ? o.retainage_pct : (o.retainage && sub ? r2(o.retainage / sub * 100) : 0);
      var retAmt = o.retainage != null ? o.retainage : r2(sub * retPct / 100);
      var totalDue = r2(sub - retAmt);
      var prior = Number(o.prior_billed) || 0;
      var remit = o.remit_to || (c.name + "<br/>" + c.addr + "<br/>" + c.city);
      return doc("Invoice " + (o.number || ""), header("INVOICE", "No. " + (o.number || "—"), "Date " + dt(o.date) + " · Due " + dt(o.due) + " · Terms " + esc(o.terms || "Net 30")) +
        '<div class="pd-2"><div><b>Bill To</b><br/>' + esc(o.customer || "—") + '</div><div><b>Remit To</b><br/>' + remit + "</div></div>" +
        '<div class="pd-refs"><span><b>Job</b> ' + esc(o.job || "—") + "</span><span><b>Contract</b> " + esc(o.contract_ref || "—") + "</span><span><b>PO Ref</b> " + esc(o.po_ref || "—") + "</span></div>" +
        '<table class="pd-t"><thead><tr><th>Description</th><th class="r">Qty</th><th>UoM</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead><tbody>' +
        lines.map(function (l) { return "<tr><td>" + esc(l.desc) + '</td><td class="r">' + (l.qty != null ? l.qty : "") + "</td><td>" + esc(l.uom) + '</td><td class="r">' + (l.unit != null ? usd(l.unit) : "") + '</td><td class="r">' + usd(l.amount) + "</td></tr>"; }).join("") +
        '<tr><td colspan="4" class="r">Subtotal</td><td class="r">' + usd(sub) + "</td></tr>" +
        (retAmt ? '<tr><td colspan="4" class="r">Less retainage' + (retPct ? " (" + retPct + "%)" : "") + '</td><td class="r">(' + usd(retAmt) + ")</td></tr>" : "") +
        '<tr class="tot hl"><td colspan="4" class="r">TOTAL DUE</td><td class="r">' + usd(totalDue) + "</td></tr></tbody></table>" +
        '<div class="age-strip"><div class="age-b"><div class="n">Prior billed</div><div class="v">' + usd(prior) + '</div></div><div class="age-b"><div class="n">This invoice</div><div class="v">' + usd(sub) + '</div></div><div class="age-b"><div class="n">Billed to date</div><div class="v">' + usd(r2(prior + sub)) + '</div></div><div class="age-b"><div class="n">Retainage held</div><div class="v">' + usd(retAmt) + "</div></div></div>" +
        '<div class="pd-pay"><b>Payment instructions</b> — remit by check to the address above, or by ACH (routing/account provided on request). Reference invoice ' + esc(o.number || "") + " on all payments." +
        (o.notes ? "<br/>" + esc(o.notes) : "") +
        '<br/><span class="pd-note">Invoices unpaid 30 days past the due date may accrue a finance charge as provided in the contract.</span></div>');
    },
    po: function (o) {
      // o: { number, date, needed_by, terms, buyer, vendor, vendor_addr, ship_to, job,
      //      lines:[{desc,cc,qty,uom,unit,amount}], tax, amount, cost_code }
      o = o || {};
      var lines = (o.lines && o.lines.length ? o.lines : [{ desc: "Materials per estimate", cc: o.cost_code || "", amount: o.amount || 0 }]).map(function (l) {
        var amount = l.amount != null ? l.amount : r2((Number(l.qty) || 0) * (Number(l.unit) || 0));
        return { desc: l.desc || "—", cc: l.cc || l.cost_code || "", qty: l.qty, uom: l.uom || "", unit: l.unit, amount: amount };
      });
      var sub = r2(lines.reduce(function (s, l) { return s + l.amount; }, 0));
      var tax = Number(o.tax) || 0;
      var tot = r2(sub + tax);
      return doc("Purchase Order " + (o.number || ""), header("PURCHASE ORDER", "No. " + (o.number || "—"), "This PO number must appear on all invoices, packing lists and correspondence") +
        '<div class="pd-refs"><span><b>PO No.</b> ' + esc(o.number || "—") + "</span><span><b>Date</b> " + dt(o.date) + "</span><span><b>Needed by</b> " + dt(o.needed_by) + "</span><span><b>Terms</b> " + esc(o.terms || "Net 30") + "</span><span><b>Buyer</b> " + esc(o.buyer || "Purchasing") + "</span></div>" +
        '<div class="pd-2"><div><b>Vendor</b><br/>' + esc(o.vendor || "—") + (o.vendor_addr ? "<br/>" + esc(o.vendor_addr) : "") + '</div><div><b>Ship To / Job</b><br/>' + esc(o.ship_to || o.job || "—") + "</div></div>" +
        '<table class="pd-t"><thead><tr><th>Description</th><th>Cost code</th><th class="r">Qty</th><th>UoM</th><th class="r">Unit cost</th><th class="r">Amount</th></tr></thead><tbody>' +
        lines.map(function (l) { return "<tr><td>" + esc(l.desc) + "</td><td>" + esc(l.cc) + '</td><td class="r">' + (l.qty != null ? l.qty : "") + "</td><td>" + esc(l.uom) + '</td><td class="r">' + (l.unit != null ? usd(l.unit) : "") + '</td><td class="r">' + usd(l.amount) + "</td></tr>"; }).join("") +
        '<tr><td colspan="5" class="r">Subtotal</td><td class="r">' + usd(sub) + "</td></tr>" +
        (tax ? '<tr><td colspan="5" class="r">Tax</td><td class="r">' + usd(tax) + "</td></tr>" : "") +
        '<tr class="tot"><td colspan="5" class="r">PO Total</td><td class="r">' + usd(tot) + "</td></tr></tbody></table>" +
        '<div class="pd-tc"><b>Terms &amp; conditions</b> — 1. Acceptance of this order constitutes acceptance of these terms. 2. Goods are subject to inspection and approval at destination; rejected goods are returned at vendor expense. 3. Invoices must reference the PO number and cost code to be matched for payment. 4. No substitutions, price changes or quantity overruns without written authorization from the buyer. 5. Vendor certifies compliance with applicable lien-waiver and insurance requirements.</div>' +
        '<div class="pd-sigrow"><span class="pd-sigline">Authorized signature</span><span class="pd-sigline">Date</span></div>');
    },
    aia: function (o) {
      // Faithful-layout original — titled Application and Certificate for Payment,
      // "conforms to AIA G702 format". Every derived number computed internally.
      // o: { app, period, contract_date, owner:{name,addr}, contractor:{name,addr},
      //     project, via, project_nos, original_sum, net_change, prior_certificates,
      //     retPct, retMaterialsPct, change_orders:{add_prev,ded_prev,add_this,ded_this},
      //     sov:[{code,desc,scheduled,prior,this,stored,pct}] }
      // Backward-compatible with { app, contract, job, customer, period, retPct, sov }.
      o = o || {};
      var c = company();
      var retPct = o.retPct != null ? o.retPct : 10;
      var retMatPct = o.retMaterialsPct != null ? o.retMaterialsPct : 0;
      var sov = (o.sov || []).map(function (l) {
        var sched = Number(l.scheduled) || 0, prior = Number(l.prior) || 0, cur = Number(l["this"]) || 0, stored = Number(l.stored) || 0;
        var g = r2(prior + cur + stored);
        var pct = sched ? r2(g / sched * 100) : (Number(l.pct) || 0);
        return { code: l.code || "", desc: l.desc || "", sched: sched, prior: prior, cur: cur, stored: stored,
          g: g, pct: pct, h: r2(sched - g), i: r2((prior + cur) * retPct / 100 + stored * retMatPct / 100) };
      });
      var totSched = r2(sov.reduce(function (s, l) { return s + l.sched; }, 0));
      var totPrior = r2(sov.reduce(function (s, l) { return s + l.prior; }, 0));
      var totCur = r2(sov.reduce(function (s, l) { return s + l.cur; }, 0));
      var totStored = r2(sov.reduce(function (s, l) { return s + l.stored; }, 0));
      var totG = r2(sov.reduce(function (s, l) { return s + l.g; }, 0));
      var totH = r2(sov.reduce(function (s, l) { return s + l.h; }, 0));
      var totI = r2(sov.reduce(function (s, l) { return s + l.i; }, 0));
      var co = o.change_orders || {};
      var addPrev = Number(co.add_prev) || 0, dedPrev = Number(co.ded_prev) || 0, addThis = Number(co.add_this) || 0, dedThis = Number(co.ded_this) || 0;
      var line1 = o.original_sum != null ? r2(o.original_sum) : totSched;
      var line2 = o.net_change != null ? r2(o.net_change) : r2((addPrev + addThis) - (dedPrev + dedThis));
      var line3 = r2(line1 + line2);
      var line4 = totG;
      var line5a = r2((totPrior + totCur) * retPct / 100);
      var line5b = r2(totStored * retMatPct / 100);
      var line5 = r2(line5a + line5b);
      var line6 = r2(line4 - line5);
      var line7 = o.prior_certificates != null ? r2(o.prior_certificates) : r2(totPrior * (1 - retPct / 100));
      var line8 = r2(line6 - line7);
      var line9 = r2(line3 - line6);
      var ownerName = (o.owner && o.owner.name) || o.customer || "—";
      var ownerAddr = (o.owner && o.owner.addr) || "";
      var ctrName = (o.contractor && o.contractor.name) || c.name;
      var ctrAddr = (o.contractor && o.contractor.addr) || (c.addr + "<br/>" + c.city);
      var project = o.project || ((o.job ? "Job " + o.job : "") + (o.contract ? " · " + o.contract : "")) || "—";
      function ln(no, label, val, cls) { return '<tr class="' + (cls || "") + '"><td class="g7-no">' + no + '.</td><td class="g7-lab">' + label + '</td><td class="r g7-amt">' + val + "</td></tr>"; }
      function bx(lab) { return '<span class="g7-bx">☐ ' + lab + "</span>"; }
      var page1 =
        '<div class="g7">' +
        '<div class="g7-head"><div><div class="pd-title">APPLICATION AND CERTIFICATE FOR PAYMENT</div><div class="pd-sub">conforms to AIA G702 format · page 1 of 2</div></div>' +
          '<div class="g7-dist"><div class="g7-dist-t">DISTRIBUTION TO:</div>' + bx("OWNER") + bx("ARCHITECT") + bx("CONTRACTOR") + bx("FIELD") + bx("OTHER") + "</div></div>" +
        '<div class="g7-info">' +
          '<div><span class="g7-t">TO OWNER:</span><br/>' + esc(ownerName) + (ownerAddr ? "<br/>" + esc(ownerAddr) : "") + "</div>" +
          '<div><span class="g7-t">FROM CONTRACTOR:</span><br/>' + esc(ctrName) + "<br/>" + ctrAddr + "</div>" +
          '<div><span class="g7-t">PROJECT:</span><br/>' + esc(project) + '<br/><span class="g7-t">VIA (ARCHITECT):</span><br/>' + esc(o.via || "—") + "</div>" +
          '<div class="g7-right"><div><span class="g7-t">APPLICATION NO:</span> ' + esc(o.app || 1) + '</div><div><span class="g7-t">PERIOD TO:</span> ' + dt(o.period) + '</div><div><span class="g7-t">CONTRACT DATE:</span> ' + dt(o.contract_date) + '</div><div><span class="g7-t">PROJECT NOS:</span> ' + esc(o.project_nos || o.job || "—") + "</div></div>" +
        "</div>" +
        '<div class="g7-cols">' +
        '<div class="g7-left"><div class="g7-sec">' + "CONTRACTOR'S APPLICATION FOR PAYMENT" + '</div>' +
          '<div class="g7-app-note">Application is made for payment, as shown below, in connection with the Contract. Continuation Sheet is attached.</div>' +
          '<table class="g7-lines"><tbody>' +
          ln("1", "ORIGINAL CONTRACT SUM", usd(line1)) +
          ln("2", "NET CHANGE BY CHANGE ORDERS", usd(line2)) +
          ln("3", "CONTRACT SUM TO DATE (Line 1 ± 2)", usd(line3)) +
          ln("4", "TOTAL COMPLETED &amp; STORED TO DATE (Column G on Continuation Sheet)", usd(line4)) +
          '<tr><td class="g7-no">5.</td><td class="g7-lab">RETAINAGE:<div class="g7-sub5">a. ' + retPct + '% of Completed Work <span class="g7-5amt">' + usd(line5a) + "</span></div><div class=\"g7-sub5\">b. " + retMatPct + '% of Stored Material <span class="g7-5amt">' + usd(line5b) + '</span></div>Total Retainage (Lines 5a + 5b)</td><td class="r g7-amt">' + usd(line5) + "</td></tr>" +
          ln("6", "TOTAL EARNED LESS RETAINAGE (Line 4 less Line 5 Total)", usd(line6)) +
          ln("7", "LESS PREVIOUS CERTIFICATES FOR PAYMENT (Line 6 from prior Certificate)", usd(line7)) +
          ln("8", "CURRENT PAYMENT DUE", "<b>" + usd(line8) + "</b>", "g7-hl") +
          ln("9", "BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 less Line 6)", usd(line9)) +
          "</tbody></table>" +
          '<table class="g7-cos"><thead><tr><th>CHANGE ORDER SUMMARY</th><th class="r">ADDITIONS</th><th class="r">DEDUCTIONS</th></tr></thead><tbody>' +
          '<tr><td>Total changes approved in previous months by Owner</td><td class="r">' + usd(addPrev) + '</td><td class="r">' + usd(dedPrev) + "</td></tr>" +
          '<tr><td>Total approved this month</td><td class="r">' + usd(addThis) + '</td><td class="r">' + usd(dedThis) + "</td></tr>" +
          '<tr class="tot"><td>TOTALS</td><td class="r">' + usd(r2(addPrev + addThis)) + '</td><td class="r">' + usd(r2(dedPrev + dedThis)) + "</td></tr>" +
          '<tr><td>NET CHANGES by Change Order</td><td class="r" colspan="2">' + usd(line2) + "</td></tr>" +
          "</tbody></table></div>" +
        '<div class="g7-rightcol">' +
          '<div class="g7-cert">' + "The undersigned Contractor certifies that, to the best of the Contractor's knowledge, information and belief, the Work covered by this Application for Payment has been completed in accordance with the Contract Documents; that all amounts previously paid to the Contractor under prior Certificates for Payment have been applied to the Work; and that the current payment shown herein is now due." + "</div>" +
          '<div class="g7-sigrow"><span class="pd-sigline">CONTRACTOR — By</span><span class="pd-sigline sm">Date</span></div>' +
          '<div class="g7-notary">State of: ______________________ County of: ______________________<br/>Subscribed and sworn to before me this ______ day of ______________<br/>Notary Public: ______________________ My Commission expires: ____________</div>' +
          '<div class="g7-sec">' + "ARCHITECT'S CERTIFICATE FOR PAYMENT" + "</div>" +
          '<div class="g7-cert">' + "In accordance with the Contract Documents, based on on-site observations and the data comprising this application, the Architect certifies to the Owner that, to the best of the Architect's knowledge, information and belief, the Work has progressed as indicated, the quality of the Work is in accordance with the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED." + "</div>" +
          '<div class="g7-amtcert">AMOUNT CERTIFIED: <b>' + usd(line8) + "</b> <span class=\"g7-note\">(attach explanation if amount certified differs from amount applied)</span></div>" +
          '<div class="g7-sigrow"><span class="pd-sigline">ARCHITECT — By</span><span class="pd-sigline sm">Date</span></div>' +
          '<div class="g7-note">This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein.</div>' +
        "</div></div></div>";
      var page2 =
        '<div class="pd-brk"></div><div class="g7">' +
        '<div class="g7-head"><div><div class="pd-title">CONTINUATION SHEET</div><div class="pd-sub">conforms to AIA G703 format · page 2 of 2</div></div>' +
          '<div class="g7-right sm"><div><span class="g7-t">APPLICATION NO:</span> ' + esc(o.app || 1) + '</div><div><span class="g7-t">APPLICATION DATE:</span> ' + dt(o.period) + '</div><div><span class="g7-t">PERIOD TO:</span> ' + dt(o.period) + "</div></div></div>" +
        '<table class="g703"><thead>' +
        '<tr><th>A</th><th>B</th><th>C</th><th>D</th><th>E</th><th>F</th><th>G</th><th>%</th><th>H</th><th>I</th></tr>' +
        '<tr class="g703-lab"><th>ITEM NO.</th><th>DESCRIPTION OF WORK</th><th>SCHEDULED VALUE</th><th>FROM PREVIOUS APPLICATION (D)</th><th>THIS PERIOD (E)</th><th>MATERIALS PRESENTLY STORED (F)</th><th>TOTAL COMPLETED AND STORED TO DATE (D+E+F)</th><th>(G ÷ C)</th><th>BALANCE TO FINISH (C − G)</th><th>RETAINAGE</th></tr>' +
        "</thead><tbody>" +
        sov.map(function (l) { return "<tr><td>" + esc(l.code) + "</td><td>" + esc(l.desc) + '</td><td class="r">' + usd(l.sched) + '</td><td class="r">' + usd(l.prior) + '</td><td class="r">' + usd(l.cur) + '</td><td class="r">' + usd(l.stored) + '</td><td class="r">' + usd(l.g) + '</td><td class="r">' + l.pct + '%</td><td class="r">' + usd(l.h) + '</td><td class="r">' + usd(l.i) + "</td></tr>"; }).join("") +
        '<tr class="tot"><td></td><td>GRAND TOTALS</td><td class="r">' + usd(totSched) + '</td><td class="r">' + usd(totPrior) + '</td><td class="r">' + usd(totCur) + '</td><td class="r">' + usd(totStored) + '</td><td class="r">' + usd(totG) + '</td><td class="r">' + (totSched ? r2(totG / totSched * 100) : 0) + '%</td><td class="r">' + usd(totH) + '</td><td class="r">' + usd(totI) + "</td></tr>" +
        "</tbody></table></div>";
      return doc("Application for Payment", page1 + page2);
    },
    rfi: function (o) {
      // Request for Information — AIA G716 layout style.
      // o: { number, date, project, job, from, to, re, spec_section, drawing_ref,
      //     respond_by, question, answer, answered_by, answered_at, attachments:[], impact }
      o = o || {};
      var c = company();
      var impact = o.impact == null ? "" : String(o.impact).toLowerCase();
      function ibx(key, lab) {
        var on = impact.indexOf(key) !== -1;
        return '<span class="g7-bx">' + (on ? "☑" : "☐") + " " + lab + "</span>";
      }
      var att = o.attachments || [];
      var respArea = o.answer
        ? '<div class="rfi-resp-txt">' + esc(o.answer) + "</div>"
        : '<div class="rfi-rule"></div><div class="rfi-rule"></div><div class="rfi-rule"></div><div class="rfi-rule"></div>';
      return doc("RFI " + (o.number || ""), header("REQUEST FOR INFORMATION", "RFI No. " + (o.number || "—"), "conforms to AIA G716 format") +
        '<div class="pd-refs"><span><b>Project</b> ' + esc(o.project || o.job || "—") + "</span><span><b>RFI Number</b> " + esc(o.number || "—") + "</span><span><b>Date</b> " + dt(o.date) + "</span></div>" +
        '<div class="pd-2"><div><b>From (Contractor)</b><br/>' + esc(o.from || c.name) + '</div><div><b>To</b><br/>' + esc(o.to || "—") + "</div></div>" +
        '<div class="rfi-fields">' +
          '<div><span class="g7-t">RE:</span> ' + esc(o.re || "—") + "</div>" +
          '<div><span class="g7-t">SPEC SECTION:</span> ' + esc(o.spec_section || "—") + '&nbsp;&nbsp;<span class="g7-t">DRAWING REFERENCE:</span> ' + esc(o.drawing_ref || "—") + "</div>" +
          '<div><span class="g7-t">RESPONSE REQUESTED BY:</span> ' + dt(o.respond_by) + "</div>" +
          '<div class="rfi-impact"><span class="g7-t">IMPACT:</span> ' + ibx("none", "None") + ibx("cost", "Cost impact") + ibx("schedule", "Schedule impact") + "</div>" +
        "</div>" +
        '<h3 class="pd-h">REQUEST</h3><div class="rfi-body">' + esc(o.question || "—") + "</div>" +
        '<h3 class="pd-h">RESPONSE</h3>' + respArea +
        '<div class="rfi-attr">Response by: ' + esc(o.answered_by || "____________________") + " &nbsp;·&nbsp; Firm: " + esc(o.answer_firm || "____________________") + " &nbsp;·&nbsp; Date: " + (o.answered_at ? dt(o.answered_at) : "____________") + "</div>" +
        '<h3 class="pd-h">ATTACHMENTS</h3>' +
        (att.length ? '<ul class="rfi-att">' + att.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>" : '<div class="pd-note">None.</div>') +
        '<div class="pd-sigrow"><span class="pd-sigline">Submitted by (Contractor)</span><span class="pd-sigline sm">Date</span></div>' +
        '<div class="pd-sigrow"><span class="pd-sigline">Returned by (Architect / Owner)</span><span class="pd-sigline sm">Date</span></div>');
    },
    form1099: function (o) {
      // Copy B facsimile grid. o: { vendor, addr, tin, amount, fed_withheld,
      //   state_tax, state_no, state_income, year }
      o = o || {};
      var c = company();
      var year = o.year || "2026";
      return doc("1099-NEC — " + (o.vendor || ""),
        '<div class="f99">' +
        '<table class="f99-t"><tbody>' +
        '<tr><td rowspan="2" class="f99-payer"><span class="f99-l">PAYER’S name, street address, city or town, state, and ZIP code</span><br/><b>' + esc(c.name) + "</b><br/>" + esc(c.addr) + "<br/>" + esc(c.city) + '</td>' +
          '<td class="f99-omb"><span class="f99-l">OMB No. 1545-0116</span><div class="f99-yr">' + esc(year) + '</div><div class="f99-form">Form <b>1099-NEC</b></div></td>' +
          '<td class="f99-title" rowspan="2"><div class="f99-name">Nonemployee<br/>Compensation</div><div class="f99-copy">Copy B — For Recipient</div></td></tr>' +
        '<tr><td><span class="f99-l">1&nbsp; Nonemployee compensation</span><div class="f99-amt">' + usd(o.amount) + "</div></td></tr>" +
        '<tr><td><span class="f99-l">PAYER’S TIN</span><div>' + esc(o.payer_tin || "54-1234567") + '</div></td><td><span class="f99-l">RECIPIENT’S TIN</span><div>' + esc(o.tin || "***-**-****") + '</div></td><td><span class="f99-l">4&nbsp; Federal income tax withheld</span><div class="f99-amt">' + usd(o.fed_withheld || 0) + "</div></td></tr>" +
        '<tr><td colspan="2"><span class="f99-l">RECIPIENT’S name, street address, city or town, state, and ZIP code</span><br/><b>' + esc(o.vendor || "—") + "</b>" + (o.addr ? "<br/>" + esc(o.addr) : "") + '</td>' +
          '<td><span class="f99-l">5&nbsp; State tax withheld</span><div class="f99-amt">' + usd(o.state_tax || 0) + '</div><span class="f99-l">6&nbsp; State / Payer’s state no.</span><div>' + esc(o.state_no || "—") + '</div><span class="f99-l">7&nbsp; State income</span><div class="f99-amt">' + usd(o.state_income != null ? o.state_income : o.amount) + "</div></td></tr>" +
        "</tbody></table>" +
        '<div class="pd-note" style="margin-top:8px">This is important tax information and is being furnished to the IRS. Copy A is filed with the IRS (e-file via FIRE/IRIS); Copy B is for the recipient.</div>' +
        "</div>");
    },
    wh347: function (o) {
      // Certified payroll toward the DOL WH-347 layout.
      // o: { job, project, location, contract_no, payroll_no, weekEnding, subcontractor,
      //     rows:[{name,id_last4,exemptions,classification,days:[7],ot_days:[7],rate,ot_rate,
      //            gross,fica,tax,other,net}] }  — falls back to the legacy
      //     {name,craft,local,hours,base,fringe,gross} shape.
      o = o || {};
      var c = company();
      var cols = (function () {
        var end = new Date(String(o.weekEnding || "2026-07-18").slice(0, 10) + "T00:00:00");
        if (isNaN(end)) end = new Date("2026-07-18T00:00:00");
        var names = ["S", "M", "T", "W", "T", "F", "S"], out = [];
        for (var i = 6; i >= 0; i--) {
          var d = new Date(end.getTime() - i * 86400000);
          out.push({ dow: names[d.getDay()], md: (d.getMonth() + 1) + "/" + d.getDate() });
        }
        return out;
      })();
      var rows = (o.rows || []).map(function (r) {
        var days = r.days, i;
        if (!days || !days.length) {
          days = [0, 0, 0, 0, 0, 0, 0];
          var rem = Number(r.hours) || 0;
          for (i = 0; i < 5 && rem > 0; i++) { var h = Math.min(8, rem); days[i] = h; rem = r2(rem - h); }
          if (rem > 0) days[5] = rem;
        }
        var ot = r.ot_days && r.ot_days.length ? r.ot_days : [0, 0, 0, 0, 0, 0, 0];
        var st = 0, ott = 0;
        for (i = 0; i < 7; i++) { st += Number(days[i]) || 0; ott += Number(ot[i]) || 0; }
        var rate = r.rate != null ? r.rate : (r.base != null ? r.base : 0);
        var otRate = r.ot_rate != null ? r.ot_rate : r2(rate * 1.5);
        var gross = r.gross != null ? r.gross : r2(st * rate + ott * otRate);
        var fica = r.fica != null ? r.fica : r2(gross * 0.0765);
        var tax = r.tax != null ? r.tax : r2(gross * 0.12);
        var other = r.other != null ? r.other : 0;
        var ded = r2(fica + tax + other);
        var net = r.net != null ? r.net : r2(gross - ded);
        var last4 = r.id_last4;
        if (!last4) { var hsh = 0, nm = String(r.name || ""); for (i = 0; i < nm.length; i++) hsh = (hsh * 31 + nm.charCodeAt(i)) % 9000; last4 = String(1000 + hsh); }
        return { name: r.name || "—", last4: last4, ex: r.exemptions != null ? r.exemptions : 0,
          cls: r.classification || r.craft || "—", days: days, ot: ot, st: st, ott: ott,
          rate: rate, otRate: otRate, gross: gross, fica: fica, tax: tax, other: other, ded: ded, net: net };
      });
      var totGross = r2(rows.reduce(function (s, r) { return s + r.gross; }, 0));
      var totNet = r2(rows.reduce(function (s, r) { return s + r.net; }, 0));
      function dayCells(arr) { var out = ""; for (var i = 0; i < 7; i++) { var v = Number(arr[i]) || 0; out += '<td class="r">' + (v ? v : "") + "</td>"; } return out; }
      var page1 =
        '<div class="wh">' +
        header("U.S. DEPARTMENT OF LABOR — PAYROLL", "For Contractor or Subcontractor use on Federally assisted construction (WH-347 layout)", "Persons are not required to respond to this collection unless it displays a valid OMB control number") +
        '<div class="wh-top">' +
          '<div><span class="g7-bx">' + (o.subcontractor ? "☐" : "☑") + ' CONTRACTOR</span> <span class="g7-bx">' + (o.subcontractor ? "☑" : "☐") + " SUBCONTRACTOR</span><br/><b>" + esc(c.name) + "</b> · " + esc(c.addr) + ", " + esc(c.city) + "</div>" +
          '<div><span class="g7-t">PAYROLL NO:</span> ' + esc(o.payroll_no || "1") + '<br/><span class="g7-t">FOR WEEK ENDING:</span> ' + dt(o.weekEnding) + "</div>" +
          '<div><span class="g7-t">PROJECT AND LOCATION:</span> ' + esc(o.project || o.job || "—") + (o.location ? " · " + esc(o.location) : "") + '<br/><span class="g7-t">PROJECT OR CONTRACT NO:</span> ' + esc(o.contract_no || o.job || "—") + "</div>" +
        "</div>" +
        '<table class="wh-t"><thead>' +
        '<tr><th rowspan="2">NAME AND INDIVIDUAL IDENTIFYING NUMBER (last 4 of SSN)</th><th rowspan="2" class="vert">NO. OF W/H EXEMPTIONS</th><th rowspan="2">WORK CLASSIFICATION</th><th rowspan="2" class="vert">OT / ST</th><th colspan="7">DAY AND DATE — HOURS WORKED EACH DAY</th><th rowspan="2" class="r">TOTAL HOURS</th><th rowspan="2" class="r">RATE OF PAY</th><th rowspan="2" class="r">GROSS AMOUNT EARNED</th><th colspan="4">DEDUCTIONS</th><th rowspan="2" class="r">NET WAGES PAID FOR WEEK</th></tr>' +
        "<tr>" + cols.map(function (d) { return "<th>" + d.dow + "<br/>" + d.md + "</th>"; }).join("") + '<th class="r">FICA</th><th class="r">W/H TAX</th><th class="r">OTHER</th><th class="r">TOTAL</th></tr>' +
        "</thead><tbody>" +
        rows.map(function (r) {
          return '<tr><td rowspan="2">' + esc(r.name) + ' <span class="wh-id">····' + esc(r.last4) + '</span></td><td rowspan="2" class="r">' + r.ex + '</td><td rowspan="2">' + esc(r.cls) + '</td><td class="wh-os">O</td>' + dayCells(r.ot) + '<td class="r">' + (r.ott || "") + '</td><td class="r">' + (r.ott ? usd(r.otRate) : "") + '</td><td rowspan="2" class="r">' + usd(r.gross) + '</td><td rowspan="2" class="r">' + usd(r.fica) + '</td><td rowspan="2" class="r">' + usd(r.tax) + '</td><td rowspan="2" class="r">' + usd(r.other) + '</td><td rowspan="2" class="r">' + usd(r.ded) + '</td><td rowspan="2" class="r">' + usd(r.net) + "</td></tr>" +
            '<tr><td class="wh-os">S</td>' + dayCells(r.days) + '<td class="r">' + r.st + '</td><td class="r">' + usd(r.rate) + "</td></tr>";
        }).join("") +
        '<tr class="tot"><td colspan="13">TOTALS</td><td class="r">' + usd(totGross) + '</td><td colspan="4"></td><td class="r">' + usd(totNet) + "</td></tr>" +
        "</tbody></table></div>";
      var page2 =
        '<div class="pd-brk"></div><div class="wh">' +
        '<h3 class="pd-h">STATEMENT OF COMPLIANCE</h3>' +
        '<div class="wh-soc">Date: ' + dt(o.weekEnding) + "<br/><br/>I, ____________________________ (name of signatory party), ____________________________ (title), do hereby state:<br/><br/>" +
        "(1) That I pay or supervise the payment of the persons employed by <b>" + esc(c.name) + "</b> on the <b>" + esc(o.project || o.job || "project") + "</b>; that during the payroll period commencing on the ____ day of ________, and ending the ____ day of ________, all persons employed on said project have been paid the full weekly wages earned, that no rebates have been or will be made either directly or indirectly to or on behalf of said contractor from the full weekly wages earned by any person, and that no deductions have been made either directly or indirectly from the full wages earned by any person, other than permissible deductions as defined in Regulations, Part 3.<br/><br/>" +
        "(2) That any payrolls otherwise under this contract required to be submitted for the above period are correct and complete; that the wage rates for laborers or mechanics contained therein are not less than the applicable wage rates contained in any wage determination incorporated into the contract; that the classifications set forth therein for each laborer or mechanic conform with the work performed.<br/><br/>" +
        "(3) That any apprentices employed in the above period are duly registered in a bona fide apprenticeship program registered with a State apprenticeship agency recognized by the Bureau of Apprenticeship and Training, United States Department of Labor.<br/><br/>" +
        "(4) That:<br/>" +
        '<div class="wh-fb"><span class="g7-bx">☐</span> <b>(a) WHERE FRINGE BENEFITS ARE PAID TO APPROVED PLANS, FUNDS, OR PROGRAMS</b> — in addition to the basic hourly wage rates paid to each laborer or mechanic listed in the above referenced payroll, payments of fringe benefits as listed in the contract have been or will be made to appropriate programs for the benefit of such employees.</div>' +
        '<div class="wh-fb"><span class="g7-bx">☐</span> <b>(b) WHERE FRINGE BENEFITS ARE PAID IN CASH</b> — each laborer or mechanic listed in the above referenced payroll has been paid, as indicated on the payroll, an amount not less than the sum of the applicable basic hourly wage rate plus the amount of the required fringe benefits as listed in the contract.</div>' +
        '<div class="wh-fb"><span class="g7-bx">☐</span> <b>(c) EXCEPTIONS</b><table class="pd-t" style="margin-top:6px"><thead><tr><th>EXCEPTION (CRAFT)</th><th>EXPLANATION</th></tr></thead><tbody><tr class="wh-blankrow"><td></td><td></td></tr><tr class="wh-blankrow"><td></td><td></td></tr></tbody></table></div>' +
        '<div class="wh-remarks"><span class="g7-t">REMARKS:</span></div>' +
        '<div class="pd-sigrow"><span class="pd-sigline">NAME AND TITLE</span><span class="pd-sigline">SIGNATURE</span></div>' +
        '<div class="wh-warn">THE WILLFUL FALSIFICATION OF ANY OF THE ABOVE STATEMENTS MAY SUBJECT THE CONTRACTOR OR SUBCONTRACTOR TO CIVIL OR CRIMINAL PROSECUTION. SEE SECTION 1001 OF TITLE 18 AND SECTION 231 OF TITLE 31 OF THE UNITED STATES CODE.</div>' +
        "</div></div>";
      return doc("WH-347 — " + (o.job || ""), page1 + page2);
    },
    statement: function (o) {
      o = o || {};
      var inv = o.invoices || [];
      var tot = inv.reduce(function (s, i) { return s + (i.balance || 0); }, 0);
      var buckets = [
        { n: "Current", t: function (d) { return d < 1; } },
        { n: "1–30", t: function (d) { return d >= 1 && d <= 30; } },
        { n: "31–60", t: function (d) { return d >= 31 && d <= 60; } },
        { n: "61–90", t: function (d) { return d >= 61 && d <= 90; } },
        { n: "90+", t: function (d) { return d > 90; } },
      ];
      var strip = '<div class="age-strip">' + buckets.map(function (b) {
        var bt = inv.filter(function (i) { return b.t(i.ageDays || 0); }).reduce(function (s, i) { return s + (i.balance || 0); }, 0);
        return '<div class="age-b' + (bt && (b.n === "61–90" || b.n === "90+") ? " bad" : "") + '"><div class="n">' + b.n + '</div><div class="v">' + usd(bt) + "</div></div>";
      }).join("") + "</div>";
      return doc("Statement — " + (o.customer || ""), header("STATEMENT OF ACCOUNT", o.customer || "—", "As of " + dt(o.asOf)) +
        strip +
        '<table class="pd-t"><thead><tr><th>Invoice</th><th>Date</th><th>Job</th><th class="r">Age</th><th class="r">Balance</th></tr></thead><tbody>' +
        inv.map(function (i) { return "<tr><td>" + esc(i.invoice_number) + "</td><td>" + dt(i.invoice_date) + "</td><td>" + esc(i.job_id || "") + '</td><td class="r">' + (i.ageDays || 0) + 'd</td><td class="r">' + usd(i.balance) + "</td></tr>"; }).join("") +
        '<tr class="tot"><td colspan="4">Total Due</td><td class="r">' + usd(tot) + "</td></tr></tbody></table>" +
        '<div class="pd-pay"><b>Please remit promptly.</b> Amounts in the 61–90 and 90+ columns are past due. Questions on any invoice: contact accounting at ' + esc(company().name) + ".</div>");
    },
    financials: function (tb, opts) {
      opts = opts || {};
      var asOf = opts.asOf || "2026-07-18";
      var by = { asset: [], liability: [], equity: [], revenue: [], cogs: [], expense: [] };
      (tb.rows || []).forEach(function (r) { (by[r.type] || (by[r.type] = [])).push(r); });
      function drTotal(list) { return r2(list.reduce(function (s, r) { return s + (r.debit - r.credit); }, 0)); }
      function crTotal(list) { return r2(list.reduce(function (s, r) { return s + (r.credit - r.debit); }, 0)); }
      function rows(list, cr) { return list.map(function (r) { var v = cr ? (r.credit - r.debit) : (r.debit - r.credit); return "<tr><td>&nbsp;&nbsp;" + esc(r.name) + '</td><td class="r">' + usd(r2(v)) + "</td></tr>"; }).join(""); }
      var rev = crTotal(by.revenue), cogs = drTotal(by.cogs), opex = drTotal(by.expense);
      var grossProfit = r2(rev - cogs), netIncome = r2(grossProfit - opex);
      var assets = drTotal(by.asset), liab = crTotal(by.liability), equity0 = crTotal(by.equity);
      var totalLE = r2(liab + equity0 + netIncome);
      var tie = Math.abs(totalLE - assets) < 0.005;
      var incomeStmt =
        '<h3 class="pd-h">Income Statement</h3><div class="pd-note">For the period ended ' + dt(asOf) + "</div>" +
        '<table class="pd-t"><tbody>' +
        '<tr class="sec"><td><b>Revenue</b></td><td class="r"><b>' + usd(rev) + "</b></td></tr>" + rows(by.revenue, true) +
        '<tr class="sec"><td><b>Cost of Construction</b></td><td class="r"><b>' + usd(cogs) + "</b></td></tr>" + rows(by.cogs, false) +
        '<tr class="sub"><td><b>GROSS PROFIT</b></td><td class="r"><b>' + usd(grossProfit) + "</b></td></tr>" +
        (by.expense.length ? '<tr class="sec"><td><b>Operating Expenses</b></td><td class="r"><b>' + usd(opex) + "</b></td></tr>" + rows(by.expense, false) : "") +
        '<tr class="tot"><td>NET INCOME</td><td class="r">' + usd(netIncome) + "</td></tr></tbody></table>";
      var balanceSheet =
        '<h3 class="pd-h">Balance Sheet</h3><div class="pd-note">As of ' + dt(asOf) + "</div>" +
        '<table class="pd-t"><tbody>' +
        '<tr class="sec"><td><b>Assets</b></td><td class="r"><b>' + usd(assets) + "</b></td></tr>" + rows(by.asset, false) +
        '<tr class="sub"><td><b>Total Assets</b></td><td class="r"><b>' + usd(assets) + "</b></td></tr>" +
        '<tr class="sec"><td><b>Liabilities</b></td><td class="r"><b>' + usd(liab) + "</b></td></tr>" + rows(by.liability, true) +
        '<tr class="sec"><td><b>Equity</b></td><td class="r"><b>' + usd(r2(equity0 + netIncome)) + "</b></td></tr>" + rows(by.equity, true) +
        "<tr><td>&nbsp;&nbsp;Current period net income</td><td class=\"r\">" + usd(netIncome) + "</td></tr>" +
        '<tr class="tot"><td>Total Liabilities + Equity ' + (tie ? "✓ ties to Total Assets" : "✗ DOES NOT TIE — " + usd(assets)) + '</td><td class="r">' + usd(totalLE) + "</td></tr></tbody></table>";
      var trialBal =
        '<h3 class="pd-h">Trial Balance</h3>' +
        '<table class="pd-t"><thead><tr><th>Acct</th><th>Account</th><th class="r">Debit</th><th class="r">Credit</th></tr></thead><tbody>' +
        (tb.rows || []).map(function (r) { return "<tr><td>" + esc(r.code) + "</td><td>" + esc(r.name) + '</td><td class="r">' + (r.debit ? usd(r.debit) : "") + '</td><td class="r">' + (r.credit ? usd(r.credit) : "") + "</td></tr>"; }).join("") +
        '<tr class="tot"><td></td><td>TOTAL — ' + (tb.balanced ? "in balance" : "OUT OF BALANCE") + '</td><td class="r">' + usd(tb.totalDebit) + '</td><td class="r">' + usd(tb.totalCredit) + "</td></tr></tbody></table>";
      return doc("Financial Statements", header("FINANCIAL STATEMENTS", company().name, "Trial balance " + (tb.balanced ? "in balance" : "OUT OF BALANCE") + " · period ended " + dt(asOf)) +
        incomeStmt + balanceSheet + trialBal);
    },
  };
  function header(title, sub, meta) { var c = company(); return '<div class="pd-hd"><div><div class="pd-title">' + esc(title) + '</div><div class="pd-sub">' + esc(sub) + "</div></div><div class=\"pd-co\">" + esc(c.name) + "<br/>" + esc(c.addr) + "<br/>" + esc(c.city) + "</div></div><div class=\"pd-meta\">" + esc(meta) + "</div>"; }
  function doc(_t, body) { return '<div class="pd">' + body + '<div class="pd-ft">Generated by Keystone · ' + company().name + "</div></div>"; }

  /* ---- PUSH: electronic file formats ----------------------------------- */
  function pad(s, n, ch, left) { s = String(s == null ? "" : s); ch = ch || " "; while (s.length < n) s = left ? ch + s : s + ch; return s.slice(0, n); }
  function amtCents(n) { return pad(Math.round((Number(n) || 0) * 100), 10, "0", true); }

  var Push = {
    // NACHA ACH file (PPD/CCD) — structurally valid 94-char records. Company /
    // bank identity comes from (window.KEYSTONE_TENANT.banking||{}) with the
    // demo placeholders as graceful fallbacks.
    nacha: function (entries, opts) {
      opts = opts || {};
      entries = entries || [];
      var bkg = banking();
      var odfi = pad(String(bkg.routing || "051000017"), 9);
      var odfi8 = odfi.slice(0, 8);
      var companyId = opts.companyId || bkg.company_id || "1234567890";
      var originName = (bkg.bank_name || "First National Bank").toUpperCase();
      var companyName = opts.company || company().name;
      var today = "260718", now = "0312";
      var lines = [];
      // Type 1 — FILE HEADER (94): "1" + priority "01" + immediate dest (blank+9, 10)
      // + immediate origin (10) + date(6) + time(4) + file ID mod "A" + record size
      // "094" + blocking "10" + format "1" + dest name(23) + origin name(23) + ref(8)
      lines.push("101 " + odfi + pad(companyId, 10) + today + now + "A" + "094" + "10" + "1" + pad(originName, 23) + pad(companyName, 23) + pad("", 8));
      // Type 5 — BATCH HEADER (94): "5" + service class "220" (credits) + company
      // name(16) + discretionary(20) + company id(10) + SEC "PPD" + entry desc(10)
      // + descriptive date(6) + effective date(6) + settlement(3 blank) + originator
      // status "1" + ODFI(8) + batch no(7)
      lines.push("5" + "220" + pad(companyName, 16) + pad("", 20) + pad(companyId, 10) + "PPD" + pad(opts.desc || "PAYMENT", 10) + today + today + pad("", 3) + "1" + odfi8 + pad(1, 7, "0", true));
      var totCents = 0, hash = 0;
      entries.forEach(function (e, i) {
        // per-entry routing/account, demo placeholders only when absent
        var routing = String((e && e.routing) || "021000021");
        var r8 = pad(routing, 8);                                  // receiving DFI id = first 8 digits
        var chk = routing.length > 8 ? routing.charAt(8) : "9";    // 9th digit = check digit
        var acct = String((e && e.account) || "000000000");
        hash += parseInt(r8, 10) || 0;
        totCents += Math.round(((e && e.amount) || 0) * 100);
        // Type 6 — ENTRY DETAIL (94): "6" + tx code "22" (checking credit) + DFI(8)
        // + check digit(1) + account(17) + amount(10) + individual id(15) + name(22)
        // + discretionary(2) + addenda indicator "0" + trace = ODFI(8) + seq(7)
        lines.push("6" + "22" + r8 + chk + pad(acct, 17) + amtCents((e && e.amount) || 0) + pad((e && e.id) || "", 15) + pad((e && e.name) || "", 22) + pad("", 2) + "0" + odfi8 + pad(i + 1, 7, "0", true));
      });
      var hash10 = pad(hash % 10000000000, 10, "0", true);         // entry hash keeps LAST 10 digits
      // Type 8 — BATCH CONTROL (94): "8" + "220" + entry/addenda count(6) + entry
      // hash(10) + total debit(12) + total credit(12) + company id(10) + MAC(19)
      // + reserved(6) + ODFI(8) + batch no(7)
      lines.push("8" + "220" + pad(entries.length, 6, "0", true) + hash10 + pad(0, 12, "0", true) + pad(totCents, 12, "0", true) + pad(companyId, 10) + pad("", 19) + pad("", 6) + odfi8 + pad(1, 7, "0", true));
      // Type 9 — FILE CONTROL (94): "9" + batch count(6) + block count(6) + entry/
      // addenda count(8) + entry hash(10) + total debit(12) + total credit(12) + reserved(39)
      var blockCount = Math.ceil((lines.length + 1) / 10);         // incl. this record, pre-filler
      lines.push("9" + pad(1, 6, "0", true) + pad(blockCount, 6, "0", true) + pad(entries.length, 8, "0", true) + hash10 + pad(0, 12, "0", true) + pad(totCents, 12, "0", true) + pad("", 39));
      while (lines.length % 10 !== 0) lines.push(pad("", 94, "9"));  // filler 9-records to a full block
      // self-check: every NACHA record must be exactly 94 characters
      for (var li = 0; li < lines.length; li++) {
        if (lines[li].length !== 94 && window.console) console.warn("[keystone] NACHA record " + (li + 1) + " is " + lines[li].length + " chars (expected 94)");
      }
      return lines.join("\n") + "\n";
    },
    positivePay: function (checks, opts) {
      opts = opts || {};
      var acct = opts.account || banking().account || "1234567890";
      var rows = [["Account", "Check Number", "Amount", "Issue Date", "Payee", "Status"]];
      checks.forEach(function (c) { rows.push([acct, c.number, (c.amount || 0).toFixed(2), dt(c.date), c.payee, "Issued"]); });
      return rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(","); }).join("\r\n") + "\r\n";
    },
  };

  window.KeystoneOutput = {
    print: show, download: download, docs: Docs, push: Push, amountWords: amountWords,
    checkFormats: CHECK_FORMATS,
    checkFormat: resolveCheckFormat,
    setCheckFormat: function (id) { try { localStorage.setItem("keystone.checkFormat", id); } catch (e) {} },
  };

  // wire the print surface controls once the DOM is ready
  function wire() {
    var go = document.getElementById("printGo"), cl = document.getElementById("printClose"), wrap = document.getElementById("printsheet");
    if (go) go.addEventListener("click", function () { window.print(); });
    if (cl) cl.addEventListener("click", function () { wrap.classList.remove("on"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
