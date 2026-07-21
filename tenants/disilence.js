/* ============================================================================
 * DiSilence OS · TENANT FIXTURE — DiSilence itself (our own operating system)
 * ----------------------------------------------------------------------------
 * The same Keystone platform we build for enterprise clients, turned inward and
 * personalized for how DiSilence actually runs: a creative + AI studio with a
 * Creative division, an AI/automation division, and an autonomous operating
 * layer (Polaris / the EOI) underneath.
 *
 * DATA POSTURE — this file ships in a PUBLIC bundle, so it is deliberately
 * data-safe. It names only entities already public on disilence.com; every real
 * client's commercial terms, per-client revenue, deal values, PII, and any
 * confidential or active-guardrail relationship are REDACTED (shown as
 * anonymized "Confidential" rows) or given representative DEMO figures. Live
 * financials wire in later via the authenticated ?api= data seam — never
 * hardcoded here. env:"DEMO" everywhere.
 * ==========================================================================*/
/* Live Google Sign-In for the disilence.com Workspace. This client id is PUBLIC by
 * design (it ships in the page); the client SECRET is never used or stored here —
 * this is a browser-side GIS ID-token flow. With this set, the app runs in
 * production auth mode: the offline seat-picker is never rendered and only
 * Google-verified @disilence.com accounts get in (see assets/auth.js). */
window.KEYSTONE_GOOGLE_CLIENT_ID = "484296853486-criongkm52q29pgl53jeft242rscc117.apps.googleusercontent.com";

window.KEYSTONE_TENANT = {
  id: "disilence",
  version: 5,
  name: "DiSilence",
  product: "DiSilence OS",
  tagline: "Composed in silence. Judged before it ships.",
  vertical: "creative-ai-agency",
  env: "DEMO",
  theme: { brand: "#f2a03d", brand2: "#f6b968", brandDeep: "#c47615" },
  logo: "brand/disilence-mark.svg",
  regions: ["Atlanta", "US"],

  /* ---- Access control: only Google-verified @disilence.com accounts may sign
   * in (enforced in auth.js on the returned ID token; the real boundary is the
   * OAuth consent screen set to "Internal" for the disilence.com Workspace).
   * Add a domain here to admit another org; add a person to users[] for a seat. */
  auth: { allowedDomains: ["disilence.com"] },

  /* ---- User directory (Google-email identities → RBAC) -------------------
   * Only real @disilence.com seats + the Polaris system operator (an honest
   * automation identity, not a person). The seat switcher lets you preview any
   * role. Michael stays first so the login demo-list leads with the command tier. */
  users: [
    { email: "mike@disilence.com", name: "Michael Mun", role: "command", roleLabel: "Founder / CEO", initials: "MM", color: "#f2a03d", staff_id: "ST-1" },
    { email: "kyle@disilence.com", name: "Kyle Choi", role: "delivery", roleLabel: "Creative & Delivery", initials: "KC", color: "#c9c5bb", staff_id: "ST-2" },
    { email: "polaris@disilence.com", name: "Polaris", role: "ops", roleLabel: "Autonomous Operator · EOI", initials: "◆", color: "#8b8e96", staff_id: null },
  ],

  /* ---- Roles (RBAC) — agency vertical ----------------------------------- */
  roles: [
    { id: "command", name: "Command", tier: 10, blurb: "Everything — pipeline, delivery, books, autonomous exceptions to sign off." },
    { id: "finance", name: "Finance", tier: 8, blurb: "Billing, retainers, books, money-gated approvals." },
    { id: "delivery", name: "Delivery", tier: 6, blurb: "Engagements, production & review cycles, client portals." },
    { id: "growth", name: "Growth", tier: 5, blurb: "Pipeline, outbound campaigns, content engine." },
    { id: "ops", name: "Operations", tier: 7, blurb: "Automation studio, the autonomous fleet, the decision log." },
    { id: "admin", name: "Admin", tier: 10, blurb: "Users, roles, integrations, audit." },
    { id: "guest", name: "Guest", tier: 1, blurb: "Read-only until invited." },
  ],

  permissions: {
    "record.delete": { roles: ["command", "admin"] },
    "money.approve": { minTier: 8 },
    "send.autonomous": { minTier: 7 },
    "portal.provision": { minTier: 6 },
    "autonomy.tier.change": { roles: ["command", "admin"] },
  },

  /* ---- Module suite (agency vertical) — replaces the default construction rail.
   * app.js reads T.modules when present. Renderers for the custom ids live in
   * modules/modules-disilence.js; documents/automation/admin reuse the generic
   * Keystone renderers (they are vertical-agnostic). */
  modules: [
    { id: "home", name: "Command", icon: "◎", group: "Overview" },
    { id: "fleet", name: "Studio & Fleet", icon: "⚇", group: "Overview" },
    { id: "insights", name: "Insights & Forecast", icon: "◔", group: "Overview", roles: ["command", "finance", "growth"] },
    { id: "pipeline", name: "Clients & Pipeline", icon: "◍", group: "Growth", roles: ["growth", "finance"] },
    { id: "outbound", name: "Outbound & Campaigns", icon: "➤", group: "Growth", roles: ["growth"] },
    { id: "content", name: "Content Engine", icon: "✦", group: "Growth", roles: ["growth", "delivery"] },
    { id: "engagements", name: "Engagements", icon: "▤", group: "Delivery", roles: ["delivery", "finance"] },
    { id: "portals", name: "Client Portals", icon: "◈", group: "Delivery", roles: ["delivery"] },
    { id: "billing", name: "Billing & Retainers", icon: "▧", group: "Delivery", roles: ["finance"] },
    { id: "documents", name: "Documents", icon: "❐", group: "Delivery" },
    { id: "automation", name: "Automation Studio", icon: "⚡", group: "Operations" },
    { id: "decisions", name: "Decision Log", icon: "◆", group: "Operations" },
    { id: "admin", name: "Admin & Integrations", icon: "⚙", group: "System", roles: ["admin"] },
  ],

  /* ---- Automation (workflows-as-data) — the REAL EOI automations, honestly
   * modeled. Money + outbound steps route to a human gate (send-gate / money
   * gate), exactly like the live doctrine. */
  workflows: [
    { id: "wf_inbound_lead", name: "Inbound lead → triage + CRM", trigger: "leads.insert", mode: "auto", dept: "Growth", requires: [],
      steps: [
        { action: "task", label: "Classify + enrich lead", params: {} },
        { action: "create", label: "Create opportunity in the CRM", params: { entity: "opportunities" } },
        { action: "notify", label: "Notify Growth", params: {} },
      ] },
    { id: "wf_demo_approved", name: "Demo approved → send-gate queue", trigger: "opportunities.update", when: { field: "stage", op: "eq", value: "demo-approved" }, mode: "auto", dept: "Growth", requires: [],
      steps: [
        { action: "task", label: "Draft outreach", params: {} },
        { action: "task", label: "Send-gate review (queued)", params: {}, gate: "send", approval: { title: "Approve outbound send", tier: "send" } },
      ] },
    { id: "wf_payment_provision", name: "Payment cleared → provision portal", trigger: "arInvoices.update", when: { field: "status", op: "eq", value: "paid" }, mode: "auto", dept: "Delivery", requires: [],
      steps: [
        { action: "create", label: "Create client portal + token", params: { entity: "portals" } },
        { action: "webhook", label: "Notify portal API (Make)", params: {} },
        { action: "notify", label: "Welcome + what-happens-next", params: {} },
      ] },
    { id: "wf_decision_page", name: "Sub-threshold decision → page Michael", trigger: "approvals.insert", when: { field: "tier", op: "eq", value: "low" }, mode: "auto", dept: "Operations", requires: [],
      steps: [
        { action: "create", label: "Write EOI Decision Log row", params: { entity: "decisions" } },
        { action: "notify", label: "[EOI-PAGE] page via Notion + Gmail", params: {} },
      ] },
    { id: "wf_content_publish", name: "Content graded ≥7 → distribute", trigger: "contentPieces.update", when: { field: "grade", op: "gte", value: 7 }, mode: "auto", dept: "Growth", requires: [],
      steps: [
        { action: "task", label: "Format per channel", params: {} },
        { action: "webhook", label: "Publish via Postiz + beehiiv", params: {} },
      ] },
  ],

  apiCatalog: [
    { entity: "leads", method: "POST", path: "/v1/leads", write_mode: "auto", approval: false },
    { entity: "opportunities", method: "POST", path: "/v1/opportunities", write_mode: "auto", approval: false },
    { entity: "outbound", method: "POST", path: "/v1/smartlead/send", write_mode: "gated", approval: true },
    { entity: "portals", method: "POST", path: "/v1/portal/provision", write_mode: "gated", approval: true },
    { entity: "content", method: "POST", path: "/v1/postiz/publish", write_mode: "auto", approval: false },
    { entity: "billing", method: "POST", path: "/v1/stripe/subscription", write_mode: "gated", approval: true },
    { entity: "decisions", method: "POST", path: "/v1/notion/decision-log", write_mode: "auto", approval: false },
  ],

  /* ==========================================================================
   * COLLECTIONS — core. Narrative collections (engagements, portals, campaigns,
   * contentPieces, agents, decisions) are added by tenants/disilence-ext.js.
   * ======================================================================== */
  collections: {

    /* ---- Accounts: clients + partners. PUBLIC-SAFE — names only where already
     * public on disilence.com; confidential/guardrailed relationships are
     * redacted. NO commercial terms or per-client revenue. */
    accounts: [
      { id: "ACC-FJ", legal_name: "Franklin Junction", dba: "Franklin Junction", account_type: "client", division: "Creative", segment: "Host Kitchens · enterprise foodservice", relationship: "Website + retainer", status: "active", region: "Remote", public: true },
      { id: "ACC-FIG", legal_name: "Fire Impact Golf", dba: "Fire Impact Golf", account_type: "client", division: "Creative", segment: "Golf performance / DTC", relationship: "Performance engagement", status: "active", region: "Atlanta", public: true },
      { id: "ACC-BLOOM", legal_name: "Bloom / OmBloom", dba: "Bloom", account_type: "client", division: "Creative", segment: "Patisserie / F&B", relationship: "Brand + site + investor deck", status: "active", region: "Atlanta", public: true },
      { id: "ACC-WME", legal_name: "WME Athlete Program", dba: "WME", account_type: "client", division: "Creative", segment: "Athlete personal brand sites", relationship: "Productized athlete sites", status: "productizing", region: "US", public: true },
      { id: "ACC-KM", legal_name: "Kyler Murray", dba: "Kyler Murray", account_type: "talent", division: "Creative", segment: "NFL · personal brand", relationship: "Concept demo", status: "concept", region: "US", public: true },
      { id: "ACC-JJ", legal_name: "Justin Jefferson", dba: "Justin Jefferson", account_type: "talent", division: "Creative", segment: "NFL · personal brand", relationship: "Concept demo", status: "concept", region: "US", public: true },
      { id: "ACC-ERP", legal_name: "Enterprise ERP client", dba: "Confidential", account_type: "client", division: "AI", segment: "Construction ERP implementation", relationship: "Active delivery — redacted", status: "active", region: "US", public: false },
      { id: "ACC-D2C", legal_name: "Consumer brand partner", dba: "Confidential", account_type: "partner", division: "AI", segment: "D2C marketing engine", relationship: "Co-build — redacted", status: "active", region: "Intl", public: false },
      { id: "ACC-FB", legal_name: "F&B partner network", dba: "Confidential", account_type: "partner", division: "Creative", segment: "Multi-brand F&B / franchise", relationship: "Connector / affiliate — redacted", status: "active", region: "US", public: false },
    ],

    /* ---- Contacts: intentionally empty in the PUBLIC bundle — no client contact
     * identities are published. Real contacts live behind the authenticated seam. */
    contacts: [],

    /* ---- Pipeline: representative DEMO opportunities. Deliberately NOT tied to
     * real clients' actual deal values — anonymized ICP rows with illustrative
     * figures so the pipeline reads live without exposing any real terms. */
    opportunities: [
      { id: "OPP-1", account_id: null, project_name: "Atlanta SMB — restaurant group", division: "Creative", offer: "Signature web + retainer", stage: "demo-sent", owner_role: "growth", est_value: 4800, unit: "/mo", next_step: "Follow demo link", followup_next: "2026-07-22" },
      { id: "OPP-2", account_id: null, project_name: "Mid-market — AI ops audit", division: "AI", offer: "AI audit → retainer", stage: "proposal", owner_role: "growth", est_value: 5000, unit: "one-time", next_step: "SOW review", followup_next: "2026-07-21" },
      { id: "OPP-3", account_id: null, project_name: "Multi-unit F&B — landing system", division: "Creative", offer: "Autonomous landing system", stage: "qualified", owner_role: "growth", est_value: 3500, unit: "/mo", next_step: "Discovery", followup_next: "2026-07-23" },
      { id: "OPP-4", account_id: null, project_name: "Athlete personal site", division: "Creative", offer: "WME talent site", stage: "demo-approved", owner_role: "growth", est_value: 1200, unit: "/site", next_step: "Send-gate → close", followup_next: "2026-07-20" },
      { id: "OPP-5", account_id: null, project_name: "Regional retailer — content engine", division: "Creative", offer: "Creative intelligence retainer", stage: "new", owner_role: "growth", est_value: 6000, unit: "/mo", next_step: "Enrich + qualify", followup_next: "2026-07-24" },
      { id: "OPP-6", account_id: null, project_name: "SaaS scale-up — AI content system", division: "AI", offer: "AI-native brand & content", stage: "won", owner_role: "growth", est_value: 9000, unit: "/mo", next_step: "Provision portal", followup_next: null },
    ],

    /* ---- Leads: recent inbound, honestly representative. */
    leads: [
      { id: "LD-1", source: "demo-link", parsed_project: "Atlanta bakery", parsed_scope: "website", status: "new", received_at: "2026-07-19T14:00:00Z" },
      { id: "LD-2", source: "referral", parsed_project: "Mid-market ops audit", parsed_scope: "ai-audit", status: "qualified", received_at: "2026-07-18T10:30:00Z" },
    ],

    /* ---- Staff: real DiSilence humans (org chart). Agents live in ext as a
     * separate "agents" collection so the fleet reads honestly (systems, not people). */
    staff: [
      { id: "ST-1", name: "Michael Mun", title: "Founder / CEO", role: "command", dept: "Command", manager: null },
      { id: "ST-2", name: "Kyle Choi", title: "Creative & Delivery", role: "delivery", dept: "Delivery", manager: "Michael Mun" },
    ],

    /* ---- Integrations (real stack, connection status only — no secrets/ids). */
    integrations: [
      { id: "INT-CRM", name: "DiSilence CRM", kind: "native", status: "native", detail: "Our own clients + pipeline — system of record (no third-party CRM)", scope: "clients, opportunities, engagements" },
      { id: "INT-GM", name: "Gmail", kind: "email", status: "connected", detail: "Outbound + inbox triage", scope: "send, read" },
      { id: "INT-DRIVE", name: "Google Drive", kind: "storage", status: "connected", detail: "Client folders + deliverables", scope: "drive.file" },
      { id: "INT-MAKE", name: "Make.com", kind: "automation", status: "connected", detail: "Portal API + routing scenarios", scope: "webhooks" },
      { id: "INT-STRIPE", name: "Stripe", kind: "billing", status: "connected", detail: "Retainer subscriptions", scope: "checkout, portal" },
      { id: "INT-NOTION", name: "Notion", kind: "docs", status: "connected", detail: "EOI Decision Log", scope: "pages" },
      { id: "INT-SMARTLEAD", name: "Smartlead", kind: "outbound", status: "connected", detail: "SMB cold campaigns", scope: "campaigns, leads" },
      { id: "INT-POSTIZ", name: "Postiz", kind: "social", status: "connected", detail: "Multi-channel publishing", scope: "posts" },
      { id: "INT-BEEHIIV", name: "beehiiv", kind: "newsletter", status: "connected", detail: "Autoblock + Fairway Bombers", scope: "sends" },
    ],

    webhooks: [
      { id: "WH-1", event_type_filter: "portals.provision", target_url: "https://hook.us2.make.com/…/portal-api", active: true, last_delivery_status: "200 OK" },
      { id: "WH-2", event_type_filter: "leads.insert", target_url: "https://hook.us2.make.com/…/lead-intake", active: true, last_delivery_status: "200 OK" },
    ],

    /* ---- Operational worklist — safe, no money figures. */
    tasks: [
      { id: "TK-1", kind: "send", dept: "Delivery", title: "Franklin Junction — payment link + next-steps send", status: "open", assignee_role: "command", due: "2026-07-20", source: "seed", blocking: true, detail: "Draft ready; awaiting Stripe link + Drive share + PDF attach." },
      { id: "TK-2", kind: "review", dept: "Growth", title: "3 content pieces awaiting grade ≥7", status: "open", assignee_role: "growth", due: "2026-07-21", source: "seed" },
      { id: "TK-3", kind: "provision", dept: "Delivery", title: "Provision portal on next paid subscription", status: "open", assignee_role: "delivery", due: "2026-07-22", source: "seed" },
      { id: "TK-4", kind: "outbound", dept: "Growth", title: "SMB re-contact wave — send-gate review", status: "open", assignee_role: "growth", due: "2026-07-21", source: "seed" },
    ],

    approvals: [
      { id: "APR-1", title: "Approve outbound send — SMB re-contact wave", tier: "send", status: "pending", dept: "Growth", workflow: "Demo approved → send-gate", createdBy: "automation" },
      { id: "APR-2", title: "Provision Stripe subscription — mid-market win", tier: "money", status: "pending", dept: "Delivery", workflow: "Payment cleared → provision", createdBy: "automation" },
    ],

    notifications: [],
    recordNotes: [],
    delegations: [],

    documents: [
      { id: "DOC-1", name: "Franklin Junction — Site Map Proposal", kind: "proposal", account_id: "ACC-FJ", date: "2026-07-17", status: "sent" },
      { id: "DOC-2", name: "Franklin Junction — Information Checklist", kind: "checklist", account_id: "ACC-FJ", date: "2026-07-17", status: "sent" },
      { id: "DOC-3", name: "Franklin Junction — Terms One-Pager", kind: "terms", account_id: "ACC-FJ", date: "2026-07-20", status: "ready" },
      { id: "DOC-4", name: "Bloom / OmBloom — Investor Deck (Duluth)", kind: "deck", account_id: "ACC-BLOOM", date: "2026-06-14", status: "delivered" },
    ],

    /* Collections some generic renderers may probe — kept empty (honest) so no
     * construction data ever appears; the agency modules own the real surfaces. */
    arInvoices: [],
    apInvoices: [],
    glAccounts: [],
    glActivity: [],
    contracts: [],
    settings: [],
  },
};
