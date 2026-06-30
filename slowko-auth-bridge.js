/*
  Szpilplac Słōwko Account Bridge v13
  -----------------------------------
  Dopina wynik Słōwka do konta gracza i rankingu.

  Bezpieczne założenia:
  - nie zmienia logiki gry,
  - nie wymusza logowania,
  - nie zapisuje archiwum do rankingu,
  - nie zapisuje trybu testowego do rankingu,
  - wynik zapisuje tylko dzisiejsze Słōwko,
  - zapis jest odporny na powtórne wejście, bo baza ma upsert po user/game/mode/puzzle_no.
*/

(function () {
  "use strict";

  var VERSION = "v13";
  var SAVE_STATE = {
    booted: false,
    depsReady: null,
    attempts: {}
  };

  var TEXT = {
    pl: {
      saving: "Zapisuję wynik...",
      saved: "Wynik zapisany w rankingu.",
      notLogged: "Wynik lokalny. Zaloguj się, żeby zapisać go w rankingu.",
      login: "Zaloguj się",
      archive: "Archiwum — wynik lokalny.",
      tester: "Tryb testowy — bez rankingu.",
      noAuth: "Wynik lokalny. Konto chwilowo niedostępne.",
      score: "Punkty",
      hint: "z podpowiedzią",
      error: "Nie udało się zapisać wyniku."
    },
    szl: {
      saving: "Spamiyntuja wynik...",
      saved: "Wynik spamiyntany w rankingu.",
      notLogged: "Wynik lokalny. Zaloguj sie, coby spamiyntać go w rankingu.",
      login: "Zaloguj sie",
      archive: "Archiwum — wynik lokalny.",
      tester: "Tryb testowy — bez rankingu.",
      noAuth: "Wynik lokalny. Kōnto chwilowo niydostympne.",
      score: "Punkty",
      hint: "z podpowiydziōm",
      error: "Niy szło spamiyntać wyniku."
    }
  };

  function getLang() {
    try {
      if (window.lang === "szl") return "szl";
      return localStorage.getItem("familock_lang") === "szl" ? "szl" : "pl";
    } catch (e) {
      return "pl";
    }
  }

  function t(key) {
    var pack = TEXT[getLang()] || TEXT.pl;
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
        reject(new Error("Nie załadowano: " + src));
      };
      document.head.appendChild(script);
    });
  }

  function ensureAuthWidgetContainer() {
    if (document.getElementById("szpAuthWidget")) return;

    var node = document.createElement("div");
    node.id = "szpAuthWidget";

    var nav = document.getElementById("navBar");
    if (nav && nav.parentNode) {
      nav.insertAdjacentElement("afterend", node);
      return;
    }

    var header = document.querySelector("header");
    if (header) {
      header.appendChild(node);
      return;
    }

    document.body.insertAdjacentElement("afterbegin", node);
  }

  async function ensureDeps() {
    if (SAVE_STATE.depsReady) return SAVE_STATE.depsReady;

    SAVE_STATE.depsReady = (async function () {
      ensureAuthWidgetContainer();

      await loadScript("config.js?v=13", function () {
        return !!window.SZPILPLAC_CONFIG;
      });

      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", function () {
        return !!window.supabase;
      });

      await loadScript("auth-widget.js?v=13", function () {
        return !!window.SZPILPLAC_AUTH;
      });

      if (window.SZPILPLAC_AUTH && typeof window.SZPILPLAC_AUTH.init === "function") {
        await window.SZPILPLAC_AUTH.init({
          container: "#szpAuthWidget",
          lang: getLang()
        });
      }

      return true;
    })();

    return SAVE_STATE.depsReady;
  }

  function puzzleNo() {
    var pno = Number(window.PNO);
    if (Number.isFinite(pno) && pno > 0) return pno;

    var day = Number(window.currentDay);
    if (Number.isFinite(day)) return day + 1;

    return null;
  }

  function isTodayPuzzle() {
    return Number(window.currentDay) === Number(window.TODAY_IDX);
  }

  function isTesterMode() {
    return !!window.IS_TESTER;
  }

  function isArchivePuzzle() {
    return Number(window.currentDay) < Number(window.TODAY_IDX);
  }

  function getGame() {
    return window.game || null;
  }

  function getTries() {
    var g = getGame();
    return g && Array.isArray(g.guesses) ? g.guesses.length : null;
  }

  function usedHint() {
    return !!window.hintShown;
  }

  function calculateScore(won) {
    var tries = getTries() || 0;

    if (!won) return 5;

    var pointsByTry = [100, 85, 70, 55, 40, 25];
    var score = pointsByTry[Math.max(0, tries - 1)] || 10;

    if (usedHint()) {
      score = Math.max(10, score - 15);
    }

    return score;
  }

  function resultPayload(won) {
    var tries = getTries();
    var pno = puzzleNo();

    return {
      game: "slowko",
      mode: "daily",
      puzzleNo: pno,
      won: !!won,
      tries: tries,
      errors: tries == null ? null : (won ? Math.max(0, tries - 1) : tries),
      score: calculateScore(!!won)
    };
  }

  function accountNoteNode() {
    var modal = document.getElementById("modal");
    if (!modal) return null;

    var node = document.getElementById("slowkoAccountSaveNote");
    if (node) return node;

    node = document.createElement("div");
    node.id = "slowkoAccountSaveNote";
    node.className = "szp-auth-save-note";

    var share = document.getElementById("shareBtn");
    if (share) {
      share.insertAdjacentElement("afterend", node);
      return node;
    }

    modal.appendChild(node);
    return node;
  }

  function renderNote(kind, message, payload) {
    var node = accountNoteNode();
    if (!node) return;

    node.className = "szp-auth-save-note";
    if (kind === "ok") node.classList.add("ok");
    if (kind === "err") node.classList.add("err");

    var html = escapeHtml(message);

    if (payload && Number.isFinite(payload.score)) {
      html += " <b>" + escapeHtml(t("score")) + ": " + escapeHtml(payload.score) + "</b>.";
      if (usedHint() && payload.won) {
        html += " <span>(" + escapeHtml(t("hint")) + ")</span>";
      }
    }

    if (kind === "login") {
      html += ' <a href="konto.html">' + escapeHtml(t("login")) + "</a>";
    }

    node.innerHTML = html;
  }

  function renderLocalReason() {
    if (isTesterMode()) {
      renderNote("", t("tester"));
      return true;
    }

    if (isArchivePuzzle()) {
      renderNote("", t("archive"));
      return true;
    }

    return false;
  }

  function attemptKey() {
    return "slowko:" + puzzleNo();
  }

  async function saveCurrentResult(source) {
    var g = getGame();
    if (!g || (g.status !== "won" && g.status !== "lost")) return;

    if (renderLocalReason()) return;

    if (!isTodayPuzzle()) return;

    var key = attemptKey();
    if (SAVE_STATE.attempts[key]) return;
    SAVE_STATE.attempts[key] = true;

    var won = g.status === "won";
    var payload = resultPayload(won);

    if (!Number.isFinite(payload.puzzleNo)) {
      renderNote("err", t("error"));
      return;
    }

    renderNote("", t("saving"), payload);

    try {
      await ensureDeps();

      if (!window.SZPILPLAC_AUTH || typeof window.SZPILPLAC_AUTH.saveResult !== "function") {
        renderNote("err", t("noAuth"), payload);
        return;
      }

      if (typeof window.SZPILPLAC_AUTH.refresh === "function") {
        try {
          await window.SZPILPLAC_AUTH.refresh();
        } catch (e) {}
      }

      var res = await window.SZPILPLAC_AUTH.saveResult(payload);

      if (res && res.saved) {
        renderNote("ok", t("saved"), payload);
        return;
      }

      if (res && res.reason === "not_logged_in") {
        renderNote("login", t("notLogged"), payload);
        return;
      }

      renderNote("err", (res && res.message) || t("error"), payload);
    } catch (err) {
      console.warn("Szpilplac slowko bridge save error:", err);
      renderNote("err", t("error"), payload);
    }
  }

  function wrapShowEnd() {
    if (typeof window.showEnd !== "function" || window.showEnd.__slowkoBridgeV13) return false;

    var original = window.showEnd;
    window.showEnd = function () {
      var ret = original.apply(this, arguments);

      setTimeout(function () {
        saveCurrentResult("showEnd");
      }, 80);

      return ret;
    };

    window.showEnd.__slowkoBridgeV13 = true;
    return true;
  }

  function wrapFinish() {
    if (typeof window.finish !== "function" || window.finish.__slowkoBridgeV13) return false;

    var original = window.finish;
    window.finish = function (won) {
      var ret = original.apply(this, arguments);

      setTimeout(function () {
        saveCurrentResult("finish");
      }, 1100);

      return ret;
    };

    window.finish.__slowkoBridgeV13 = true;
    return true;
  }

  function boot() {
    if (SAVE_STATE.booted) return;
    SAVE_STATE.booted = true;

    console.info("Szpilplac slowko-account-bridge.js " + VERSION);

    ensureDeps().catch(function (err) {
      console.warn("Szpilplac auth bridge deps error:", err);
    });

    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var ok1 = wrapShowEnd();
      var ok2 = wrapFinish();

      if ((ok1 || typeof window.showEnd === "function") &&
          (ok2 || typeof window.finish === "function")) {
        clearInterval(timer);
      }

      if (tries > 80) clearInterval(timer);
    }, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
