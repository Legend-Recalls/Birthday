/* apps/discord-panic.js — Sofia HELP panic sequence.
 * Pushes 5 "HELP" messages into the Sofia DM on a 1.3s cadence, manages the
 * dock bounce + corner notification. Idempotent (re-calls are no-ops).
 *
 * Browser-facing API:
 *   AppDiscordPanic.start()      — kicks the panic
 *   AppDiscordPanic.started      — boolean; started state
 *   AppDiscordPanic.bounceDock   — exposed for other modules
 *   window.startSofiaPanic       — back-compat alias for setupDiscord setTimeout
 */
window.AppDiscordPanic = (function () {
  var started = false;

  function showDockBadge() {
    var b = document.getElementById("discordDockBadge");
    if (b) b.classList.remove("hidden");
  }
  function hideDockBadge() {
    var b = document.getElementById("discordDockBadge");
    if (b) b.classList.add("hidden");
  }

  function bounceDock() {
    var icon = document.querySelector('.dock-icon[data-app="discord"]');
    if (!icon) return;
    icon.classList.remove("bounce");
    void icon.offsetWidth;
    icon.classList.add("bounce");
    setTimeout(function () { icon.classList.remove("bounce"); }, 2300);
  }

  /* showDMNotification now lives in bootstrap.js with auto-dismiss.
   * Call the bootstrap version via window if available. */
  function showDMNotification() {
    if (typeof window.showDMNotification === "function") {
      window.showDMNotification();
    }
  }

  function ensureSofiaDM() {
    var ad = window.AppDiscord;
    if (!ad || !ad.data) return;
    var list = ad.data.discordHome.channels[0].items;
    if (!list.find(function (x) { return x.id === "sofia"; })) {
      list.push({ id: "sofia", name: "Sofia", type: "text", topic: "Direct message" });
    }
  }

  function start() {
    if (started) return;
    started = true;
    var ad = window.AppDiscord;
    if (!ad) return;

    ensureSofiaDM();

    var HELP_COUNT = 5;
    var GAP = 1300;

    for (var i = 0; i < HELP_COUNT; i++) {
      (function (i) {
        setTimeout(function () {
          ad.helpers.pushSofiaMessage({
            author: "star Sofia star",
            color: "#80848e",
            time: "Today at 12:05 AM",
            text: "HELP",
            avImg: "static/sofia.webp"
          });

          var win = document.getElementById("discord-window");
          var api = win && win.appDiscord ? win.appDiscord : null;
          var watching = !!(api && api.getActiveChannel() === "sofia");
          if (api) {
            if (!watching) api.markChannelUnread("sofia");
            api.refresh("sofia");
            api.refreshDockBadge();
          }
          if (!watching) {
            showDMNotification();
            bounceDock();
          }
        }, i * GAP);
      })(i);
    }
  }

  /* Back-compat for the hard-coded 4500ms timer inside setupDiscord. */
  window.startSofiaPanic = function () { start(); };

  return {
    start: start,
    started: function () { return started; },
    bounceDock: bounceDock,
    showDMNotification: showDMNotification,
    hideDockBadge: hideDockBadge,
    showDockBadge: showDockBadge
  };
})();
