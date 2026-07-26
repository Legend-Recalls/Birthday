/* apps/browser-step.js — orchestrator for the "browser" step.
 *
 * Goal: when the Discord scripted conversation ends, open Chrome (if not already)
 * and navigate to a registered mock page (default: canva.com).
 *
 * Trigger: listen for `walkthrough:discord-complete` (fired by AppSofia on
 * script end) and open the browser step.
 *
 * To change the default target URL, override BROWSER_STEP_TARGET.
 */
window.AppBrowserStep = (function () {
  var BROWSER_STEP_TARGET = "canva.com";
  var done = false;
  var active = false;

  function getChromeWindow() { return document.getElementById("chrome-window"); }
  function getChromeInputs() {
    var win = getChromeWindow();
    if (!win) return null;
    return {
      urlEl: win.querySelector("#chromeUrl"),
      win: win
    };
  }

  function navigateChrome(url) {
    var ins = getChromeInputs();
    if (!ins || !ins.urlEl) return false;

    /* Reuse chrome.js's setup by simulating the user typing + Enter. */
    ins.urlEl.value = url;
    ins.urlEl.focus();
    ins.urlEl.dispatchEvent(new Event("input", { bubbles: true }));
    ins.urlEl.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    /* Also tell chrome to actually render with a focus call. */
    ins.urlEl.blur();
    return true;
  }

  function start(target) {
    if (done) return;
    done = true;
    active = true;

    /* 1. Open Chrome (re-uses global openApp from bootstrap.js). */
    if (typeof window.openApp === "function") {
      window.openApp("chrome");
    }

    var url = target || BROWSER_STEP_TARGET;

    /* 2. Wait one frame so chrome.js wires its DOM, then navigate. */
    setTimeout(function () {
      var ok = navigateChrome(url);
      if (!ok) {
        console.warn("[AppBrowserStep] chrome URL bar not ready yet");
        setTimeout(function () { navigateChrome(url); }, 400);
      }
      if (window.AppCommon && typeof window.AppCommon.emit === "function") {
        window.AppCommon.emit("walkthrough:browser-opened", { url: url });
      }
    }, 350);
  }

  function reset() { done = false; active = false; }

  return {
    start: start,
    reset: reset,
    isDone: function () { return done; },
    isActive: function () { return active; },
    setTarget: function (url) { BROWSER_STEP_TARGET = url; },
    getTarget: function () { return BROWSER_STEP_TARGET; }
  };
})();
