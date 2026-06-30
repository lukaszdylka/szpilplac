/*
  Szpilplac Index Auth Bridge v17
  --------------------------------
  Prosty pasek konta na stronie głównej.

  Niezalogowany:
  - Załóż konto / Zaloguj

  Zalogowany:
  - Mój profil
  - Wyloguj

  Bez ruszania logiki index.html i bez wpływu na gry.
*/

(function () {
  "use strict";

  var VERSION = "v17";
  var AUTH_STORAGE_KEY = "szpilplac-auth-v05";
  var sb = null;
  var mounted = false;

  var TEXT = {
    pl: {
      login: "Załóż konto / Zaloguj",
      profile: "Mój profil",
      logout: "Wyloguj",
      loggedAs: "Zalogowany jako",
      rank: "Ranga",
      loading: "Sprawdzam konto..."
    },
    szl: {
      login: "Załōż kōnto / Zaloguj",
      profile: "Mōj profil",
      logout: "Wyloguj",
      loggedAs: "Zalogowany jako",
      rank: "Ranga",
      loading: "Sprawdzōm kōnto..."
    }
  };

  function getLang() {
    try {
      return localStorage.getItem("familock_lang") === "szl" ? "szl" : "pl";
    } catch (e) {
      return "pl";
    }
  }

  function t(key) {
    var pack = TEXT[getLang()] || TEXT.pl;
    return pack[key] || TEXT.pl[key] || key;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function injectStyle() {
    if (document.getElementById("szpIndexAuthStyle")) return;

    var style = document.createElement("style");
    style.id = "szpIndexAuthStyle";
    style.textContent =
      ".szp-index-auth{width:100%;max-width:480px;margin:-8px auto 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);box-shadow:var(--sh);font-size:12px;color:var(--ink2)}" +
      ".szp-index-auth-main{min-width:0;line-height:1.25}" +
      ".szp-index-auth-user{font-weight:900;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}" +
      ".szp-index-auth-sub{font-size:11px;color:var(--ink2);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".szp-index-auth-actions{display:flex;align-items:center;gap:6px;flex:none}" +
      ".szp-index-auth a,.szp-index-auth button{font:inherit;font-size:11.5px;font-weight:900;min-height:30px;padding:6px 9px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--green);text-decoration:none;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap}" +
      ".szp-index-auth button{cursor:pointer}" +
      ".szp-index-auth a:hover,.szp-index-auth button:hover{background:var(--bg);text-decoration:none}" +
      ".szp-index-auth .primary{background:var(--green);border-color:var(--green);color:#fff}" +
      ".szp-index-auth .primary:hover{filter:brightness(1.05);background:var(--green);color:#fff}" +
      "@media(max-width:430px){.szp-index-auth{align-items:stretch;flex-direction:column}.szp-index-auth-actions{width:100%;display:grid;grid-template-columns:1fr 1fr}.szp-index-auth-user{max-width:100%}.szp-index-auth a,.szp-index-auth button{width:100%}}";

    document.head.appendChild(style);
  }

  function mount() {
    if (mounted) return;
    mounted = true;

    injectStyle();

    var node = document.createElement("div");
    node.id = "szpIndexAuth";
    node.className = "szp-index-auth";
    node.innerHTML =
      '<div class="szp-index-auth-main">' +
      '<div class="szp-index-auth-user">' + esc(t("loading")) + '</div>' +
      '</div>';

    var header = document.querySelector("header");
    if (header && header.parentNode) {
      header.insertAdjacentElement("afterend", node);
      return;
    }

    document.body.insertAdjacentElement("afterbegin", node);
  }

  function loadScript(src, testFn) {
    if (typeof testFn === "function" && testFn()) return Promise.resolve();

    return new Promise(function (resolve, reject) {
      var existing = Array.from(document.scripts || []).find(function (s) {
        return s.src && s.src.indexOf(src.split("?")[0]) !== -1;
      });

      if (existing) {
        if (typeof testFn !== "function" || testFn()) return resolve();
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error("Nie załadowano " + src));
      };
      document.head.appendChild(script);
    });
  }

  async function ensureSupabase() {
    await loadScript("config.js?v=17", function () {
      return !!window.SZPILPLAC_CONFIG;
    });

    await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", function () {
      return !!window.supabase;
    });

    var cfg = window.SZPILPLAC_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
      throw new Error("Brak konfiguracji Supabase");
    }

    if (!sb) {
      sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          storageKey: AUTH_STORAGE_KEY,
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }

    return sb;
  }

  function getStoredSession() {
    try {
      var raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data.currentSession || data.session || data;
    } catch (e) {
      return null;
    }
  }

  async function getSession() {
    var client = await ensureSupabase();

    var current = await client.auth.getSession();
    if (current && current.data && current.data.session) {
      return current.data.session;
    }

    var stored = getStoredSession();
    if (stored && stored.access_token && stored.refresh_token) {
      try {
        var restored = await client.auth.setSession({
          access_token: stored.access_token,
          refresh_token: stored.refresh_token
        });
        if (restored && restored.data && restored.data.session) {
          return restored.data.session;
        }
      } catch (e) {}
      return stored;
    }

    return null;
  }

  async function getProfile(userId) {
    if (!userId || !sb) return null;

    var res = await sb
      .from("profiles")
      .select("login, display_name, rank_name, rank_override")
      .eq("id", userId)
      .maybeSingle();

    if (res.error) {
      console.warn("Szpilplac index auth profile error:", res.error.message);
      return null;
    }

    return res.data || null;
  }

  function renderLoggedOut() {
    var node = document.getElementById("szpIndexAuth");
    if (!node) return;

    node.innerHTML =
      '<div class="szp-index-auth-main">' +
      '<div class="szp-index-auth-user">Szpilplac</div>' +
      '<div class="szp-index-auth-sub">Graj bez konta albo zapisuj wyniki w rankingu.</div>' +
      '</div>' +
      '<div class="szp-index-auth-actions">' +
      '<a class="primary" href="konto.html">' + esc(t("login")) + '</a>' +
      '</div>';
  }

  function renderLoggedIn(profile, user) {
    var node = document.getElementById("szpIndexAuth");
    if (!node) return;

    var login = profile && (profile.display_name || profile.login)
      ? (profile.display_name || profile.login)
      : (user && user.email ? user.email : "gracz");

    var rank = profile && (profile.rank_override || profile.rank_name)
      ? (profile.rank_override || profile.rank_name)
      : "Gorol";

    node.innerHTML =
      '<div class="szp-index-auth-main">' +
      '<div class="szp-index-auth-user">' + esc(t("loggedAs")) + ' ' + esc(login) + '</div>' +
      '<div class="szp-index-auth-sub">' + esc(t("rank")) + ': ' + esc(rank) + '</div>' +
      '</div>' +
      '<div class="szp-index-auth-actions">' +
      '<a class="primary" href="konto.html">' + esc(t("profile")) + '</a>' +
      '<button type="button" id="szpIndexLogout">' + esc(t("logout")) + '</button>' +
      '</div>';

    var btn = document.getElementById("szpIndexLogout");
    if (btn) {
      btn.addEventListener("click", async function () {
        btn.disabled = true;
        try {
          await sb.auth.signOut();
        } catch (e) {}
        try {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        } catch (e) {}
        renderLoggedOut();
      });
    }
  }

  async function refresh() {
    mount();

    try {
      var session = await getSession();
      if (!session || !session.user) {
        renderLoggedOut();
        return;
      }

      var profile = await getProfile(session.user.id);
      renderLoggedIn(profile, session.user);
    } catch (err) {
      console.warn("Szpilplac index auth error:", err);
      renderLoggedOut();
    }
  }

  function boot() {
    console.info("Szpilplac index-auth-bridge.js " + VERSION);
    refresh();

    window.addEventListener("pageshow", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) refresh();
    });

    document.addEventListener("click", function (e) {
      if (e.target && e.target.id === "lPl") setTimeout(refresh, 50);
      if (e.target && e.target.id === "lSzl") setTimeout(refresh, 50);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
