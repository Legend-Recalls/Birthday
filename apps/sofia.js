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
    { user: "sofia? u ok?",                    sofia: "OMG finally crying",                                                      delay: 900  },
    { user: "why were u spamming HELP",        sofia: "BC U WERNT ANSWERING STRAY",                                              delay: 1000 },
    { user: "lol sorry was busy",              sofia: "BUSY ON UR BIRTHDAY?? omg",                                              delay: 1000 },
    { user: "im fine chill skull",              sofia: "ok ok sorry. just wanted to make sure ur good",                         delay: 1100 },
    { user: "i love u tho",                    sofia: "love u more heart",                                                      delay: 900  },
    { user: "anyway whats going on",           sofia: "oh right. ok so we kinda forgot to get u a gift",                        delay: 1300 },
    { user: "...",                              sofia: "WAIT WAIT DONT BE MAD",                                                  delay: 800  },
    { user: "im not lol",                      sofia: "we made u something instead. this whole thing - fake mac, fake chrome, fake discord - all for you", delay: 2000 },
    { user: "yall are unhinged crying",        sofia: "happy birthday tho cake sparkle",                                        delay: 1100 },
    { user: "lol i love it",                   sofia: "we love u more. enjoy pout",                                             delay: 1000 },
    /* New section: Sofia pivots — ask Stray to make his own gift to save their reputation. */
    { user: "wait what",                        sofia: "wait actually... we kinda need u to make urself a gift now",            delay: 1500 },
    { user: "lmao WHAT",                       sofia: "we forgot urs so ur post has to make us look good",                     delay: 1500 },
    { user: "yall are dead to me",            sofia: "PLEASEEE our reputation is at stake",                                     delay: 1500 },
    { user: "ugh fine",                        sofia: "thank u. chrome is right there. make something on a browser",           delay: 1500 },
    { user: "heart",                            sofia: "love u happy birthday ok bye",                                           delay: 1000 },
    { user: "hug",                              sofia: null,                                                                    delay: 600  }
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
          author: "star Sofia star", color: "#80848e",
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
