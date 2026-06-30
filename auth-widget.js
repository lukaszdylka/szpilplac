/*
  Szpilplac Auth Widget
  ---------------------
  Wspólny moduł konta gracza dla stron Szpilplaca.

  Wymaga wcześniejszego załadowania:
  - config.js z window.SZPILPLAC_CONFIG
  - https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2

  Minimalne użycie w HTML:
    <script src="config.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script src="auth-widget.js"></script>

  Opcjonalny kontener w HTML:
    <div id="szpAuthWidget"></div>

  Helper zapisu wyniku:
    await window.SZPILPLAC_AUTH.saveResult({
      game: 'slowko',
      mode: 'daily',
      puzzleNo: 1,
      won: true,
      tries: 4,
      errors: null,
      score: 80
    });
*/

(function () {
  "use strict";

  const STATE = {
    client: null,
    user: null,
    profile: null,
    ready: false,
    lang: "pl",
    theme: "light",
    listeners: []
  };

  const STORE_KEYS = {
    lang: "familock_lang",
    theme: "szpilplac_theme",
    auth: "szpilplac-auth-v05"
  };

  const TEXT = {
    pl: {
      guest: "Grasz bez konta",
      guestCta: "Załóż konto",
      account: "Mój profil",
      ranking: "Ranking",
      loggedPrefix: "Zalogowany jako",
      hidden: "ukryty w rankingu",
      loading: "Sprawdzam konto...",
      saveLogin: "Zapisz wynik w rankingu.",
      saved: "Wynik zapisany na koncie.",
      notLogged: "Wynik lokalny. Zaloguj się, żeby zapisać go w rankingu.",
      saveError: "Nie udało się zapisać wyniku.",
      noConfig: "Brak konfiguracji Supabase.",
      noLib: "Brak biblioteki Supabase JS."
    },
    szl: {
      guest: "Szpilosz bez kōnta",
      guestCta: "Założ kōnto",
      account: "Mōj profil",
      ranking: "Ranking",
      loggedPrefix: "Zalogowany jako",
      hidden: "skryty w rankingu",
      loading: "Sprawdzōm kōnto...",
      saveLogin: "Spamiyntaj wynik w rankingu.",
      saved: "Wynik spamiyntany na kōncie.",
      notLogged: "Wynik lokalny. Zaloguj sie, coby spamiyntać go w rankingu.",
      saveError: "Niy szło spamiyntać wyniku.",
      noConfig: "Brak kōnfiguracyje Supabase.",
      noLib: "Brak biblioteki Supabase JS."
    }
  };

  function getStore(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setStore(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function t(key) {
    const pack = TEXT[STATE.lang] || TEXT.pl;
    return pack[key] || TEXT.pl[key] || key;
  }

  function escapeHtml(value) {
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

  function getBasePath() {
    const path = window.location.pathname || "/";
    const depth = path.split("/").filter(Boolean).length - 1;

    if (depth <= 0) return "";
    return "../".repeat(depth);
  }

  function urlTo(file) {
    return getBasePath() + file;
  }

  function injectStyles() {
    if (document.getElementById("szp-auth-widget-style")) return;

    const style = document.createElement("style");
    style.id = "szp-auth-widget-style";
    style.textContent = `
      .szp-auth-widget {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
        border: 1px solid var(--line, #c9bfa6);
        background: var(--surface, #fbf7ee);
        color: var(--ink, #23201a);
        border-radius: 14px;
        box-shadow: var(--sh, 0 6px 18px -10px rgba(35,32,26,.4));
        padding: 10px 12px;
        margin: 0 0 12px;
        font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .szp-auth-widget__main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .szp-auth-widget__title {
        font-family: "Oswald", system-ui, sans-serif;
        text-transform: uppercase;
        letter-spacing: .03em;
        font-size: 15px;
        line-height: 1.1;
        color: var(--ink, #23201a);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .szp-auth-widget__meta {
        font-size: 11.5px;
        line-height: 1.35;
        color: var(--ink2, #6a6150);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .szp-auth-widget__actions {
        display: flex;
        align-items: center;
        gap: 7px;
        flex: none;
      }

      .szp-auth-widget__btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        border: 1px solid var(--line, #c9bfa6);
        background: var(--surface2, #f3ecda);
        color: var(--ink, #23201a);
        text-decoration: none;
        font-size: 11.5px;
        font-weight: 800;
        line-height: 1;
        padding: 8px 10px;
        cursor: pointer;
      }

      .szp-auth-widget__btn.primary {
        background: var(--green, #2f4a39);
        border-color: var(--green, #2f4a39);
        color: #fff;
      }

      .szp-auth-widget__btn.gold {
        background: var(--gold, #bf8a3a);
        border-color: var(--gold, #bf8a3a);
        color: #20170d;
      }

      .szp-auth-widget__btn:hover {
        filter: brightness(1.04);
      }

      .szp-auth-save-note {
        margin: 10px 0 0;
        border: 1px solid var(--line, #c9bfa6);
        border-radius: 12px;
        padding: 10px 11px;
        background: var(--surface2, #f3ecda);
        color: var(--ink2, #6a6150);
        font-size: 12.5px;
        line-height: 1.45;
      }

      .szp-auth-save-note.ok {
        border-color: var(--ok, #3f8a5a);
        color: var(--ok, #3f8a5a);
        background: rgba(63, 138, 90, .1);
      }

      .szp-auth-save-note.err {
        border-color: var(--danger, #b5482f);
        color: var(--danger, #b5482f);
        background: rgba(181, 72, 47, .1);
      }

      .szp-auth-save-note a {
        color: var(--green, #2f4a39);
        font-weight: 800;
      }

      @media (max-width: 430px) {
        .szp-auth-widget {
          align-items: flex-start;
          flex-direction: column;
        }

        .szp-auth-widget__actions {
          width: 100%;
        }

        .szp-auth-widget__btn {
          flex: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function findOrCreateContainer() {
    let node = document.getElementById("szpAuthWidget");
    if (node) return node;

    node = document.querySelector("[data-szp-auth-widget]");
    if (node) return node;

    const main = document.querySelector("main");
    if (main) {
      node = document.createElement("div");
      node.id = "szpAuthWidget";
      main.insertBefore(node, main.firstChild);
      return node;
    }

    const header = document.querySelector("header");
    node = document.createElement("div");
    node.id = "szpAuthWidget";
    if (header && header.parentNode) {
      header.parentNode.insertBefore(node, header.nextSibling);
    } else {
      document.body.insertBefore(node, document.body.firstChild);
    }
    return node;
  }

  function renderWidget() {
    injectStyles();

    const container = findOrCreateContainer();

    if (!STATE.ready) {
      container.innerHTML = `
        <div class="szp-auth-widget">
          <div class="szp-auth-widget__main">
            <div class="szp-auth-widget__title">${escapeHtml(t("loading"))}</div>
            <div class="szp-auth-widget__meta">Szpilplac Familock</div>
          </div>
          <div class="szp-auth-widget__actions">
            <a class="szp-auth-widget__btn" href="${escapeHtml(urlTo("konto.html"))}">${escapeHtml(t("account"))}</a>
          </div>
        </div>
      `;
      return;
    }

    if (!STATE.user) {
      container.innerHTML = `
        <div class="szp-auth-widget">
          <div class="szp-auth-widget__main">
            <div class="szp-auth-widget__title">${escapeHtml(t("guest"))}</div>
            <div class="szp-auth-widget__meta">${escapeHtml(t("saveLogin"))}</div>
          </div>
          <div class="szp-auth-widget__actions">
            <a class="szp-auth-widget__btn gold" href="${escapeHtml(urlTo("konto.html"))}">${escapeHtml(t("guestCta"))}</a>
            <a class="szp-auth-widget__btn" href="${escapeHtml(urlTo("ranking.html"))}">${escapeHtml(t("ranking"))}</a>
          </div>
        </div>
      `;
      return;
    }

    if (!STATE.profile) {
      const email = STATE.user.email || "konto";
      container.innerHTML = `
        <div class="szp-auth-widget">
          <div class="szp-auth-widget__main">
            <div class="szp-auth-widget__title">${escapeHtml(t("loggedPrefix"))}: ${escapeHtml(email)}</div>
            <div class="szp-auth-widget__meta">Sesja aktywna, problem z odczytem profilu.</div>
          </div>
          <div class="szp-auth-widget__actions">
            <a class="szp-auth-widget__btn primary" href="${escapeHtml(urlTo("konto.html"))}">${escapeHtml(t("account"))}</a>
            <a class="szp-auth-widget__btn" href="${escapeHtml(urlTo("ranking.html"))}">${escapeHtml(t("ranking"))}</a>
          </div>
        </div>
      `;
      return;
    }

    const login = STATE.profile.login || STATE.profile.display_name || "gracz";
    const rank = STATE.profile.rank_name || "Gorol";
    const visible = STATE.profile.show_in_ranking === false ? " · " + t("hidden") : "";

    container.innerHTML = `
      <div class="szp-auth-widget">
        <div class="szp-auth-widget__main">
          <div class="szp-auth-widget__title">${escapeHtml(t("loggedPrefix"))}: ${escapeHtml(login)}</div>
          <div class="szp-auth-widget__meta">${escapeHtml(rank)}${escapeHtml(visible)}</div>
        </div>
        <div class="szp-auth-widget__actions">
          <a class="szp-auth-widget__btn primary" href="${escapeHtml(urlTo("konto.html"))}">${escapeHtml(t("account"))}</a>
          <a class="szp-auth-widget__btn" href="${escapeHtml(urlTo("ranking.html"))}">${escapeHtml(t("ranking"))}</a>
        </div>
      </div>
    `;
  }

  function notifyListeners() {
    STATE.listeners.forEach(function (fn) {
      try {
        fn({
          ready: STATE.ready,
          user: STATE.user,
          profile: STATE.profile,
          client: STATE.client
        });
      } catch (e) {
        console.warn("Szpilplac auth listener error:", e);
      }
    });
  }

  async function loadUserAndProfile() {
    if (!STATE.client) return;

    const sessionRes = await STATE.client.auth.getSession();
    if (sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
      STATE.user = sessionRes.data.session.user;
    } else {
      const userRes = await STATE.client.auth.getUser();
      STATE.user = userRes.error ? null : (userRes.data.user || null);
    }

    STATE.profile = null;

    if (STATE.user) {
      const profileRes = await STATE.client
        .from("profiles")
        .select("id, login, display_name, rank_name, show_in_ranking")
        .eq("id", STATE.user.id)
        .single();

      if (!profileRes.error) {
        STATE.profile = profileRes.data;
      }
    }

    console.log("Szpilplac auth-widget check:", {
      hasUser: !!STATE.user,
      email: STATE.user ? STATE.user.email : null,
      hasProfile: !!STATE.profile
    });

    STATE.ready = true;
    renderWidget();
    notifyListeners();
  }

  function initClient() {
    const cfg = window.SZPILPLAC_CONFIG || {};
    const url = cfg.SUPABASE_URL;
    const key = cfg.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn("Szpilplac Auth:", t("noConfig"));
      STATE.ready = true;
      renderWidget();
      return false;
    }

    if (!window.supabase) {
      console.warn("Szpilplac Auth:", t("noLib"));
      STATE.ready = true;
      renderWidget();
      return false;
    }

    STATE.client = window.supabase.createClient(url, key, {
      auth: {
        storageKey: STORE_KEYS.auth,
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true
      }
    });

    STATE.client.auth.onAuthStateChange(function () {
      loadUserAndProfile();
    });

    return true;
  }

  async function init(options) {
    options = options || {};

    STATE.lang = options.lang || getStore(STORE_KEYS.lang, "pl");
    STATE.theme = options.theme || getStore(STORE_KEYS.theme, "light");

    if (options.container) {
      const existing = document.getElementById("szpAuthWidget");
      if (!existing) {
        const c = typeof options.container === "string"
          ? document.querySelector(options.container)
          : options.container;
        if (c) c.id = "szpAuthWidget";
      }
    }

    renderWidget();

    if (!initClient()) {
      notifyListeners();
      return api;
    }

    await loadUserAndProfile();
    return api;
  }

  async function refresh() {
    await loadUserAndProfile();
    return {
      user: STATE.user,
      profile: STATE.profile
    };
  }

  function getUser() {
    return STATE.user;
  }

  function getProfile() {
    return STATE.profile;
  }

  function getClient() {
    return STATE.client;
  }

  function isLoggedIn() {
    return !!STATE.user;
  }

  function onChange(fn) {
    if (typeof fn === "function") {
      STATE.listeners.push(fn);
    }

    return function unsubscribe() {
      STATE.listeners = STATE.listeners.filter(function (x) { return x !== fn; });
    };
  }

  function normalizeResult(input) {
    input = input || {};

    const puzzleNo =
      input.puzzleNo != null ? input.puzzleNo :
      input.puzzle_no != null ? input.puzzle_no :
      input.puzzle != null ? input.puzzle :
      null;

    return {
      game: String(input.game || "").trim(),
      mode: String(input.mode || "daily").trim() || "daily",
      puzzleNo: Number(puzzleNo),
      won: !!input.won,
      tries: input.tries == null ? null : Number(input.tries),
      errors: input.errors == null ? null : Number(input.errors),
      score: input.score == null ? 0 : Number(input.score)
    };
  }

  async function saveResult(input) {
    const result = normalizeResult(input);

    if (!STATE.client) {
      return {
        saved: false,
        reason: "no_client",
        message: t("saveError")
      };
    }

    if (!STATE.user) {
      return {
        saved: false,
        reason: "not_logged_in",
        message: t("notLogged")
      };
    }

    if (!result.game || !Number.isFinite(result.puzzleNo)) {
      return {
        saved: false,
        reason: "bad_payload",
        message: t("saveError")
      };
    }

    const res = await STATE.client.rpc("save_user_game_result", {
      p_game: result.game,
      p_mode: result.mode,
      p_puzzle_no: result.puzzleNo,
      p_won: result.won,
      p_tries: result.tries,
      p_errors: result.errors,
      p_score: result.score
    });

    if (res.error) {
      return {
        saved: false,
        reason: "supabase_error",
        error: res.error,
        message: t("saveError")
      };
    }

    return {
      saved: true,
      data: res.data,
      message: t("saved")
    };
  }

  function renderSaveNote(target, saveResponse) {
    const node = typeof target === "string" ? document.querySelector(target) : target;
    if (!node) return;

    const res = saveResponse || {};
    const cls = res.saved ? "ok" : (res.reason === "not_logged_in" ? "" : "err");

    let html = escapeHtml(res.message || "");

    if (res.reason === "not_logged_in") {
      html += ` <a href="${escapeHtml(urlTo("konto.html"))}">${escapeHtml(t("guestCta"))}</a>`;
    }

    node.innerHTML = `<div class="szp-auth-save-note ${cls}">${html}</div>`;
  }

  async function saveResultAndRender(input, target) {
    const res = await saveResult(input);
    renderSaveNote(target, res);
    return res;
  }

  function setLanguage(lang) {
    STATE.lang = lang === "szl" ? "szl" : "pl";
    setStore(STORE_KEYS.lang, STATE.lang);
    renderWidget();
  }

  const api = {
    init,
    refresh,
    getClient,
    getUser,
    getProfile,
    isLoggedIn,
    onChange,
    saveResult,
    saveResultAndRender,
    renderSaveNote,
    setLanguage
  };

  console.info("Szpilplac auth-widget.js v13");
  window.SZPILPLAC_AUTH = api;

  document.addEventListener("DOMContentLoaded", function () {
    if (window.SZPILPLAC_AUTH_AUTO_INIT === false) return;
    init();
  });
})();
