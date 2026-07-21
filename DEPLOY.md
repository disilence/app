# DiSilence OS — deploy to app.disilence.com

This folder is a **self-contained static build** of the DiSilence enterprise
operating system (the Keystone platform, tenant `disilence`) plus the customer +
partner support portal at `/portal/`. It is deployed to a public GitHub Pages
repo and served at **https://app.disilence.com/**.

It is intentionally **data-safe**: no real MRR, per-client revenue, deal values,
PII, live portal tokens, or guardrailed-client details are in the bundle. Client
names + phases shown are already public on disilence.com; money figures are
representative/DEMO. Live figures wire in later via the authenticated data seam
(see "Wire live data" below) — never hardcoded here.

---

## ✅ The ONE thing you need to do: add a DNS record

Everything else (repo, GitHub Pages, HTTPS) is already configured. At your
domain / nameserver registrar for **disilence.com**, add:

| Field | Value |
|---|---|
| Type | **CNAME** |
| Host / Name | **app** |
| Value / Target | **disilence.github.io** |
| TTL | 3600 (or 600 for faster first propagation) |

> If DNS is on Cloudflare, set the record to **DNS-only (grey cloud)**, not proxied.

That's it. Within a few minutes to ~1 hour, `https://app.disilence.com` goes
live with an auto-provisioned HTTPS certificate. (This mirrors exactly how
`demo.disilence.com` already works.)

---

## Optional — turn on real "Sign in with Google" (for the @disilence.com team)

Today the app runs in a clearly-labelled **simulated** login mode (it works
offline; pick a seat on the login screen). To enable real Google sign-in,
restricted to your team:

1. In **Google Cloud Console → APIs & Services → Credentials**, create an
   **OAuth 2.0 Client ID** (type: Web application).
2. Add **Authorized JavaScript origin**: `https://app.disilence.com`.
3. Copy the client id (ends in `.apps.googleusercontent.com`).
4. Paste it into `tenants/disilence.js` at the top:
   `window.KEYSTONE_GOOGLE_CLIENT_ID = "…apps.googleusercontent.com";`
   (or into the `<meta name="google-client-id">` in `index.html`), then push.

Unknown emails are admitted read-only as `guest`; the `users[]` list in
`tenants/disilence.js` maps @disilence.com people to real seats.

*(Creating OAuth credentials and adding the DNS record are the two steps that
can't be done autonomously — both are yours.)*

---

## Optional next — wire live data (the seam is already built)

The store ships with representative DEMO data. To render live pipeline, MRR,
win-rate, etc. from real sources behind authentication, point the store at a
backend: append `?api=<base>` to the URL, or set `CONFIG.MODE = "api"` in
`core/store.js`. The backend returns the same collection shapes at
`<base>/v1/snapshot`. Until then, structure + phases are real; money is
illustrative. **Decide with Michael which real figures to surface, and behind
what auth, before wiring** (that's logged as a LOW-tier decision in the app's
Decision Log).

---

## How to update the app

Edit files here, commit, and push to the `disilence/app` repo `main` branch —
GitHub Pages redeploys in ~1–2 minutes. Bump the `?v=` cache-buster in
`index.html` and `tenants/disilence.js` `version` when you change seed data.

## How to add a client or partner portal

Each client/partner gets a private link `app.disilence.com/portal/#<token>`.
Add a row to the Make.com "Client Portal API" scenario (token → state JSON with
`variant: "customer" | "partner"`), create their Drive folder, and register them
in the `portals` collection + `config/existing-clients.yaml`. The
"payment cleared → provision portal" workflow automates this for new paying
customers.
