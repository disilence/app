/* ============================================================================
 * KEYSTONE · AUTH — Google Sign-In (Web 2.0 identity) with an offline fallback
 * ----------------------------------------------------------------------------
 * Production: "Sign in with Google" via Google Identity Services (GIS). The
 * only config needed is a PUBLIC OAuth client id — no secret in the browser.
 * Set window.KEYSTONE_GOOGLE_CLIENT_ID (in tenant config or an env-injected
 * <meta>) and the real Google One-Tap / button flow lights up, returning a
 * signed ID token (JWT) we decode for {email, name, picture}. The email is
 * matched to a Keystone user record to resolve tenant + role (RBAC).
 *
 * Offline/demo: with no client id (or GIS unreachable — e.g. a sandboxed
 * preview), the same button signs the user in as the tenant's primary account
 * in a clearly-labelled `google-simulated` mode, and the role picker lets you
 * jump into any seat to demo RBAC. Nothing here ever handles a password.
 *
 * Session lives in localStorage (`keystone.session`). At production this is a
 * short-lived signed cookie/JWT from the Keystone API — the shape is identical
 * so the swap is a transport change, not a UI change.
 * ==========================================================================*/
(function () {
  "use strict";

  var SKEY = "keystone.session";

  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    try { return decodeURIComponent(escape(window.atob(s))); } catch (_) { return window.atob(s); }
  }
  function decodeJwt(tok) {
    try { return JSON.parse(b64urlDecode(String(tok).split(".")[1])); } catch (_) { return null; }
  }

  var listeners = [];
  var Auth = {
    /* Resolve a signed-in identity to a Keystone user (tenant + role). The user
     * directory is the tenant's `users` collection; unknown Google accounts get
     * a read-only "guest" until an admin invites them. */
    resolveUser: function (email) {
      var users = (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.users) || [];
      var u = users.filter(function (x) { return (x.email || "").toLowerCase() === String(email || "").toLowerCase(); })[0];
      return u || null;
    },

    current: function () {
      try { return JSON.parse(localStorage.getItem(SKEY) || "null"); } catch (_) { return null; }
    },

    _set: function (sess) {
      if (sess) localStorage.setItem(SKEY, JSON.stringify(sess));
      else localStorage.removeItem(SKEY);
      listeners.forEach(function (fn) { try { fn(sess); } catch (_) {} });
      return sess;
    },

    onChange: function (fn) { listeners.push(fn); },

    /* Sign in as a specific Keystone user record (used by the role picker and
     * by the simulated Google path). */
    signInAs: function (user, mode) {
      if (!user) return null;
      var sess = {
        email: user.email, name: user.name, role: user.role, roleLabel: user.roleLabel || user.role,
        tenant: (window.KEYSTONE_TENANT && window.KEYSTONE_TENANT.id) || "keystone",
        initials: user.initials || (user.name || "?").split(" ").map(function (p) { return p[0]; }).slice(0, 2).join(""),
        color: user.color || "#26344e", picture: user.picture || null,
        mode: mode || "google-simulated", ts: Date.now(),
      };
      return this._set(sess);
    },

    /* Allowed sign-in domains for this tenant. Explicit via T.auth.allowedDomains;
     * otherwise derived from the domains of the seats in T.users (so DiSilence →
     * ["disilence.com"]). This is an INTERNAL operating system, not a public SaaS
     * — accounts outside these domains (and not explicitly listed) are refused. */
    allowedDomains: function () {
      var T = window.KEYSTONE_TENANT || {};
      if (T.auth && T.auth.allowedDomains && T.auth.allowedDomains.length) {
        return T.auth.allowedDomains.map(function (d) { return String(d).toLowerCase(); });
      }
      var seen = {}, out = [];
      ((T.users) || []).forEach(function (u) {
        var d = String(u.email || "").split("@")[1];
        if (d && !seen[d.toLowerCase()]) { seen[d.toLowerCase()] = 1; out.push(d.toLowerCase()); }
      });
      return out;
    },

    /* Real Google flow. Access gate: only a Google-verified email that is EITHER
     * on the explicit user allowlist OR on an allowed domain may enter. Everyone
     * else is refused (no self-serve guest onboarding on an internal OS). Real
     * enforcement is the OAuth consent screen set to "Internal" for the Workspace;
     * this domain check is defense-in-depth on the returned ID token. */
    _handleGoogleCredential: function (resp) {
      var claims = decodeJwt(resp && resp.credential);
      if (!claims || !claims.email) { if (Auth._onDenied) Auth._onDenied(""); return; }
      var known = Auth.resolveUser(claims.email);
      var domain = String(claims.email).split("@")[1] || "";
      var domains = Auth.allowedDomains();
      var domainOk = domains.length === 0 || domains.indexOf(domain.toLowerCase()) !== -1;
      var verified = claims.email_verified !== false;   // Google sets true for real accounts
      if (!verified || !(known || domainOk)) {
        Auth.signOut();
        if (Auth._onDenied) Auth._onDenied(claims.email);
        return;
      }
      var u = known;
      if (!u) {
        // A verified org member not yet given a seat: read-only guest until invited.
        u = { email: claims.email, name: claims.name || claims.email, role: "guest", roleLabel: "Guest (read-only)",
              picture: claims.picture, initials: (claims.name || "?").split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("") };
      } else if (claims.picture) { u = Object.assign({}, u, { picture: claims.picture }); }
      Auth.signInAs(u, "google");
      if (Auth._onSignedIn) Auth._onSignedIn();
    },

    /* Attempt to initialise real GIS. Returns true if a client id is present
     * and the library loaded; false → caller uses the simulated path. */
    initGoogle: function (buttonEl) {
      var cid = window.KEYSTONE_GOOGLE_CLIENT_ID ||
        (document.querySelector('meta[name="google-client-id"]') || {}).content;
      if (!cid || !window.google || !google.accounts || !google.accounts.id) return false;
      try {
        google.accounts.id.initialize({ client_id: cid, callback: this._handleGoogleCredential, auto_select: false });
        if (buttonEl) google.accounts.id.renderButton(buttonEl, { theme: "outline", size: "large", width: 360, text: "signin_with" });
        return true;
      } catch (_) { return false; }
    },

    signOut: function () {
      try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (_) {}
      this._set(null);
    },
  };

  window.KeystoneAuth = Auth;
})();
