/* apps/sofia.js — Pluggable scripted DM with Sofia for the Discord app.
 * Receives install(ctx) with: getInput, getSendBtn, isActive, pushMessage, refreshSofia, timeNow, onComplete.
 * Uses capture-phase keydown/click with stopImmediatePropagation to override the
 * default trySend() in Discord. Pure vanilla; re-installable on each window create.
 */
window.AppSofia = (function () {

  /* The script is intentionally placed at the top so it's easy to edit.
   * Last exchanges pivot: Sofia asks Stray to make his own gift so their
   * reputation is saved. Browses opens here as the next "browser step".
   */
  var SOFIA_SCRIPT = [
    { user: "sofia? u good?",                   sofia: "OMG finally 😭 yea im fine",                                            delay: 900  },
    { user: "why were u spamming HELP",        sofia: "BC U WERENT ANSWERING LMAO",                                             delay: 1000 },
    { user: "lol i was busy",                   sofia: "ON UR BIRTHDAY?? 💀 get ur priorities straight",                         delay: 1000 },
    { user: "ok fair enough",                   sofia: "anyway... so we kinda forgot to get u a gift 😅",                        delay: 1300 },
    { user: "...",                              sofia: "WAIT DONT BE MAD PLS",                                                   delay: 800  },
    { user: "im not mad lol",                   sofia: "we made u this whole thing instead — fake mac, fake chrome, fake discord — all for u 🎉", delay: 2000 },
    { user: "thats actually insane lol",        sofia: "HAPPY BIRTHDAY THO 🎂✨ ur welcome",                                 delay: 1100 },
    { user: "ok wait this is actually so cool", sofia: "ikr 😌 but also... we kinda need u to make ur own gift now lol",          delay: 1500 },
    { user: "wdym",                             sofia: "we forgot urs so now its on u 💀 go make something on a browser",       delay: 1500 },
    { user: "yall are actually useless lol",    sofia: "PLEASEEE our reputation is on the line 😭",                               delay: 1500 },
    { user: "fine whatever",                    sofia: "THANK U 🙏 chrome is right there. make us proud bestie",                delay: 1500 },
    { user: "ur lucky ur my friend",           sofia: "ik 😌 happy birthday ok byeee",                                          delay: 1000 },
    { user: "bye sofia",                        sofia: null,                                                                    delay: 600  }
  ];

  var ctx = null;          /* install(ctx) sets this */
  var installed = false;
  var step = 0;
  var pending = null;
  var scriptDone = false;  /* latched true once Sofia's scripted convo finishes; persists across Discord re-opens so the script never replays */

  function scriptText() { return SOFIA_SCRIPT[step].user; }
  function atEnd() { return step >= SOFIA_SCRIPT.length; }
  function isActive() { return !!ctx && ctx.isActive(); }

  function focusHandler() {
    if (!isActive() || atEnd()) return;
    var input = ctx.getInput();
    if (!input) return;
    var scripted = scriptText();
    if (input.value !== scripted) {
      input.value = scripted;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function keydownHandler(e) {
    if (!isActive()) return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopImmediatePropagation();
      sofiaSend();
      return;
    }
    if (atEnd()) return;
    var isChar = e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    var isEdit = e.key === "Backspace" || e.key === "Delete" ||
                 e.key === "ArrowLeft" || e.key === "ArrowRight" ||
                 e.key === "Home" || e.key === "End" ||
                 e.key === "ArrowUp" || e.key === "ArrowDown";
    if (isChar || isEdit) {
      e.preventDefault();
      e.stopImmediatePropagation();
      var input = ctx.getInput();
      if (!input) return;
      var scripted = scriptText();
      if (input.value !== scripted) {
        input.value = scripted;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  }

  function clickHandler(e) {
    if (!isActive()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    sofiaSend();
  }

  function sofiaSend() {
    if (!isActive()) return;
    if (atEnd()) { sofiaFreeSend(); return; }
    var item = SOFIA_SCRIPT[step];
    var input = ctx.getInput();
    var sendBtn = ctx.getSendBtn();

    ctx.pushMessage({
      author: "Stray", color: "#5865f2", avEmoji: "smirk", avImg: "static/stray.webp",
      time: ctx.timeNow(), text: item.user
    }, "stray");
    if (input) input.value = "";
    if (sendBtn) sendBtn.classList.add("hidden");
    ctx.refreshSofia();

    step++;

    if (pending) clearTimeout(pending);
    pending = setTimeout(function () {
      pending = null;
      if (item.sofia) {
        ctx.pushMessage({
          author: "✧ Sofia ✧", color: "#80848e",
          time: ctx.timeNow(), text: item.sofia, avImg: "static/sofia.webp"
        }, "sofia");
        ctx.refreshSofia();
      }
      setTimeout(refillIfFocused, 200);
      /* Did we just send the LAST line? Fire completion + latch scriptDone. */
      if (step >= SOFIA_SCRIPT.length) {
        scriptDone = true;
        if (typeof ctx.onComplete === "function") ctx.onComplete();
      }
    }, item.delay || 1000);
  }

  function sofiaFreeSend() {
    var input = ctx.getInput();
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    ctx.pushMessage({
      author: "Stray", color: "#5865f2", avEmoji: "smirk", avImg: "static/stray.webp",
      time: ctx.timeNow(), text: text
    }, "stray");
    input.value = "";
    var sendBtn = ctx.getSendBtn();
    if (sendBtn) sendBtn.classList.add("hidden");
    ctx.refreshSofia();
  }

  function refillIfFocused() {
    if (atEnd()) return;
    var input = ctx.getInput();
    if (!input) return;
    if (document.activeElement !== input) return;
    var scripted = scriptText();
    if (input.value !== scripted) {
      input.value = scripted;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function install(newCtx) {
    /* Tear down previous install if any (safety on Discord re-open). */
    if (installed) uninstall();

    ctx = newCtx;
    installed = true;
    /* If the script was completed in a previous session, keep step at the end
     * so the existing keydown/click handlers naturally fall through to
     * sofiaFreeSend() on Enter / send-click. (Free typing for char keys is
     * already handled by keydownHandler's `if (atEnd()) return`.) */
    step = scriptDone ? SOFIA_SCRIPT.length : 0;

    var input = ctx.getInput();
    var sendBtn = ctx.getSendBtn();
    if (!input || !sendBtn) {
      ctx = null;
      installed = false;
      return;
    }

    /* The capture-phase handlers run BEFORE Discord's bubble-phase trySend,
     * and stopImmediatePropagation cancels the bubble-phase on the same element.
     * This is why we pass `true` as the third argument. */
    input.addEventListener("focus", focusHandler);
    input.addEventListener("keydown", keydownHandler, true);
    sendBtn.addEventListener("click", clickHandler, true);
  }

  function uninstall() {
    if (!installed || !ctx) return;
    var input = ctx.getInput();
    var sendBtn = ctx.getSendBtn();
    if (input) {
      input.removeEventListener("focus", focusHandler);
      input.removeEventListener("keydown", keydownHandler, true);
    }
    if (sendBtn) sendBtn.removeEventListener("click", clickHandler, true);
    if (pending) { clearTimeout(pending); pending = null; }
    ctx = null;
    installed = false;
  }

  /* Public API. */
  return {
    SOFIA_SCRIPT: SOFIA_SCRIPT,
    install: install,
    uninstall: uninstall,
    getStep: function () { return step; },
    isInstalled: function () { return installed; },
    isScriptDone: function () { return scriptDone; }
  };
})();
