/* ============================================================================
 * DiSilence OS · TENANT EXT — narrative collections (loads after disilence.js,
 * before core/store.js). Mutates the already-created tenant global (a core +
 * ext split keeps each file readable). All representative / DEMO / data-safe:
 * phases and structure (safe) without commercial terms, per-client revenue,
 * PII, or live portal tokens (masked).
 * ==========================================================================*/
(function () {
  "use strict";
  var T = window.KEYSTONE_TENANT;
  if (!T) return;
  T.version = 3;
  var C = T.collections;

  /* ---- Engagements: active client delivery, by lifecycle phase (safe). No $. */
  C.engagements = [
    { id: "ENG-FJ", account_id: "ACC-FJ", name: "Franklin Junction — corporate website", division: "Creative", type: "Website + retainer",
      phase: "PAID", whose: "you", lead: "Michael Mun", started: "2026-07-16", note: "Payment link + next-steps queued; portal live.", health: "on-track" },
    { id: "ENG-FIG", account_id: "ACC-FIG", name: "Fire Impact Golf — DTC + performance", division: "Creative", type: "Performance engagement",
      phase: "LIVE", whose: "us", lead: "Michael Mun", started: "2026-04-22", note: "Site live; liquidation lane running.", health: "on-track" },
    { id: "ENG-BLOOM", account_id: "ACC-BLOOM", name: "Bloom / OmBloom — brand + site + deck", division: "Creative", type: "Brand system",
      phase: "MANAGED", whose: "us", lead: "Kyle Choi", started: "2026-06-14", note: "Demo site + investor deck delivered.", health: "on-track" },
    { id: "ENG-WME", account_id: "ACC-WME", name: "WME — athlete site program", division: "Creative", type: "Productized sites",
      phase: "BUILDING", whose: "us", lead: "Kyle Choi", started: "2026-06-10", note: "Concept demos live (Kyler, JJ); productizing pipeline.", health: "watch" },
    { id: "ENG-ERP", account_id: "ACC-ERP", name: "Enterprise ERP — implementation (confidential)", division: "AI", type: "ERP build",
      phase: "BUILDING", whose: "us", lead: "Michael Mun", started: "2026-03-27", note: "Active guardrail client — details redacted.", health: "on-track" },
  ];

  /* ---- Client + partner portals (the surface deployed at /portal/). Tokens are
   * bearer secrets → MASKED here. Variant customer|partner (partner hides billing). */
  C.portals = [
    { id: "PT-FJ", account_id: "ACC-FJ", name: "Franklin Junction", variant: "customer", phase: "Payment & kickoff", whose: "you", token_masked: "#12c1••••••••••••", path: "/portal/", updated: "2026-07-20", note: "Site map + checklist loaded ahead of schedule." },
    { id: "PT-FIG", account_id: "ACC-FIG", name: "Fire Impact Golf", variant: "customer", phase: "Managed", whose: "us", token_masked: "#a41f••••••••••••", path: "/portal/", updated: "2026-06-20", note: "Live · ongoing." },
    { id: "PT-D2C", account_id: "ACC-D2C", name: "Consumer brand partner (confidential)", variant: "partner", phase: "Co-build", whose: "together", token_masked: "#••••••••••••••••", path: "/portal/", updated: "2026-07-15", note: "Partner tier — milestones + shared docs only, no commercial terms." },
    { id: "PT-FB", account_id: "ACC-FB", name: "F&B partner network (confidential)", variant: "partner", phase: "Scoping", whose: "together", token_masked: "#••••••••••••••••", path: "/portal/", updated: "2026-07-10", note: "Partner tier — redacted." },
  ];

  /* ---- Outbound campaigns (Smartlead). Representative DEMO metrics. */
  C.campaigns = [
    { id: "CMP-1", name: "SMB Standard — Atlanta restaurants", channel: "Smartlead", status: "active", sent: 420, opened: 231, replied: 18, booked: 4, gate: "auto", note: "First-touch, confidence ≥ 0.80 → auto-send." },
    { id: "CMP-2", name: "SMB Re-contact — prior demos", channel: "Smartlead", status: "queued", sent: 0, opened: 0, replied: 0, booked: 0, gate: "send", note: "Awaiting send-gate approval." },
    { id: "CMP-3", name: "Mid-market — AI ops audit", channel: "Gmail (queued)", status: "review", sent: 0, opened: 0, replied: 0, booked: 0, gate: "send", note: "Mid-market → always queued." },
  ];

  /* ---- Content engine queue (6-phase, graded ≥7 to distribute). */
  C.contentPieces = [
    { id: "CN-1", title: "Host Kitchens explainer — carousel", channel: "LinkedIn", division: "Creative", phase: "Distribute", grade: 8.1, status: "published" },
    { id: "CN-2", title: "AI-ops audit — what it finds", channel: "Newsletter", division: "AI", phase: "Critique", grade: 7.4, status: "review" },
    { id: "CN-3", title: "Athlete site teardown — reel", channel: "Instagram", division: "Creative", phase: "Produce", grade: null, status: "in-progress" },
    { id: "CN-4", title: "Fairway Bombers — weekly", channel: "beehiiv", division: "Creative", phase: "Plan", grade: null, status: "planned" },
    { id: "CN-5", title: "Composed in Silence — brand film cut", channel: "X", division: "Creative", phase: "Ideate", grade: null, status: "idea" },
  ];

  /* ---- Autonomous fleet — the real Polaris/EOI agents + skills (honest: these
   * are systems, not people). Status representative. */
  C.agents = [
    { id: "AG-ROUTER", name: "eoi-router", kind: "skill", dept: "Operations", status: "active", detail: "Deterministic intent → skill dispatch + lock arbitration" },
    { id: "AG-SENDGATE", name: "eoi-send-gate", kind: "skill", dept: "Growth", status: "active", detail: "Autonomy-tier gate on every outbound (auto | queued)" },
    { id: "AG-SCOREBOARD", name: "eoi-scoreboard", kind: "skill", dept: "Command", status: "active", detail: "Live KPI single-pane from telemetry" },
    { id: "AG-WATCHDOG", name: "eoi-watchdog", kind: "skill", dept: "Operations", status: "active", detail: "Hunts broken/stagnating work → pages [EOI-PAGE]" },
    { id: "AG-CONTENT", name: "content-engine", kind: "skill", dept: "Growth", status: "active", detail: "6-phase, 13-channel hub-and-spoke publishing" },
    { id: "AG-DESIGNER", name: "designer", kind: "agent", dept: "Delivery", status: "on-call", detail: "CIS build protocol — anti-templated web experiences" },
    { id: "AG-REVIEWER", name: "reviewer", kind: "agent", dept: "Delivery", status: "on-call", detail: "Adversarial grade before ship (≥7 bar)" },
    { id: "AG-QA", name: "qa", kind: "agent", dept: "Delivery", status: "on-call", detail: "Verify-before-completion" },
  ];

  /* ---- Decision log (confidence-tiered autonomy). Mirrors the Notion EOI log. */
  C.decisions = [
    { id: "DL-1", ts: "2026-07-20", title: "Build DiSilence OS on Keystone tenant seam", tier: "HIGH", confidence: 9, decision: "auto-approved", dept: "Operations", note: "Reversible internal work; new tenant, no client writes." },
    { id: "DL-2", ts: "2026-07-20", title: "Deploy app.disilence.com as public shell + login gate", tier: "HIGH", confidence: 8, decision: "auto-approved", dept: "Operations", note: "No sensitive financials in bundle; privacy-preserving default." },
    { id: "DL-3", ts: "2026-07-17", title: "Portal-first re-sequence for Franklin Junction", tier: "MEDIUM", confidence: 7, decision: "logged", dept: "Delivery", note: "Portal before send pack." },
    { id: "DL-4", ts: "2026-07-20", title: "Wire live financials into DiSilence OS", tier: "LOW", confidence: 5, decision: "pending", dept: "Command", note: "Needs Michael: which real figures to surface behind auth." },
  ];

  /* ---- Billing & retainers — representative subscriptions (anonymized). Clearly
   * DEMO; real MRR wires via the authenticated data seam, never hardcoded. */
  C.subscriptions = [
    { id: "SUB-1", label: "Creative retainer — SMB", division: "Creative", plan: "$150–$8,000/mo", count: 3, status: "active", note: "Representative — figures illustrative." },
    { id: "SUB-2", label: "AI ops retainer", division: "AI", plan: "$4,000–$12,000/mo", count: 1, status: "active", note: "Representative — figures illustrative." },
    { id: "SUB-3", label: "Athlete site — productized", division: "Creative", plan: "$500–$2,000/site", count: 2, status: "pilot", note: "Representative — figures illustrative." },
  ];
})();
