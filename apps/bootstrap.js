/* apps/bootstrap.js — Host-shell bootstrap.
 * Everything that stays in the host page (window-mgr, menubar, dock click
 * dispatcher, desktop click, walkthrough orchestrator). Expects the
 * apps/* modules to be loaded first via <script src="..."> tags.
 *
 * Exposes globals that the apps call into:
 *   trafficLightsHTML, focusWindow, makeDraggable, setupWindowControls,
 *   setMenuBar, updateDock, openApp
 */
(function () {

  /* ---------------- DOM refs ---------------- */
  var desktop = document.getElementById("desktop");
  var dock = document.getElementById("dock");
  var toastEl = document.getElementById("toast");
  var activeAppName = document.getElementById("activeAppName");
  var appMenus = document.getElementById("appMenus");
  var appleBtn = document.getElementById("appleBtn");
  var menuDropdown = document.getElementById("menuDropdown");
  var clockEl = document.getElementById("clock");
  var screen = document.getElementById("screen");

  /* ---------------- Globals re-exposed from AppCommon ---------------- */
  var escapeHTML = window.AppCommon.escapeHTML;
  var cap = window.AppCommon.cap;
  var initials = window.AppCommon.initials;
  var showToast = window.AppCommon.showToast;

  /* ---------------- State ---------------- */
  var topZ = 100;
  var activeApp = "Finder";
  var toastTimer = null;
  var openApps = new Set();
  var discordFirstOpen = false;

  var menuLists = {
    Finder:  ["File", "Edit", "View", "Go", "Window", "Help"],
    Chrome:  ["File", "Edit", "View", "History", "Bookmarks", "Profiles", "Tab", "Window", "Help"],
    Discord: ["Discord", "Edit", "View", "Servers", "Mark As", "Window", "Help"]
  };

  /* ---------------- Window-mgmt helpers ---------------- */
  function trafficLightsHTML() {
    return [
      '<div class="traffic-lights">',
      '  <button class="tl-close" title="Close"></button>',
      '  <button class="tl-min"   title="Minimize"></button>',
      '  <button class="tl-max"   title="Zoom"></button>',
      "</div>"
    ].join("");
  }

  function setMenuBar(app) {
    activeApp = app;
    activeAppName.textContent = app;
    var items = menuLists[app] || menuLists.Finder;
    appMenus.innerHTML = items.map(function (m) {
      return '<button class="menu-btn" data-appmenu="' + escapeHTML(m) + '">' + escapeHTML(m) + "</button>";
    }).join("");
  }

  function updateDock() {
    document.querySelectorAll(".dock-icon").forEach(function (icon) {
      icon.classList.toggle("running", openApps.has(icon.dataset.app));
    });
  }

  function focusWindow(win) {
    document.querySelectorAll(".window").forEach(function (w) { w.classList.remove("focused"); });
    win.classList.add("focused");
    topZ = Math.min(topZ + 1, 9000);
    win.style.zIndex = topZ;
    var app = win.dataset.app;
    if (app) setMenuBar(cap(app));
  }

  function makeDraggable(win, handle) {
    handle.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (e.target.closest("button, input, a, select, textarea, .chrome-tab, .channel-item, .server-icon, .member, .bookmark, .shortcut")) return;
      if (win.classList.contains("maximized")) return;

      focusWindow(win);

      var rect = win.getBoundingClientRect();
      var parentRect = desktop.getBoundingClientRect();
      var offsetX = e.clientX - rect.left;
      var offsetY = e.clientY - rect.top;

      try { handle.setPointerCapture(e.pointerId); } catch (_) {}

      var move = function (ev) {
        var x = ev.clientX - parentRect.left - offsetX;
        var y = ev.clientY - parentRect.top - offsetY;
        x = Math.min(Math.max(x, -rect.width + 120), parentRect.width - 120);
        y = Math.min(Math.max(y, 0), parentRect.height - 50);
        win.style.left = x + "px";
        win.style.top = y + "px";
      };
      var cleanup = function () {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", cleanup);
        handle.removeEventListener("pointercancel", cleanup);
        try { if (handle.releasePointerCapture) handle.releasePointerCapture(e.pointerId); } catch (_) {}
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", cleanup);
      handle.addEventListener("pointercancel", cleanup);
    });

    handle.addEventListener("dblclick", function (e) {
      if (e.target.closest("button, input, a, select, textarea, .chrome-tab, .channel-item, .server-icon, .member, .bookmark, .shortcut")) return;
      win.classList.toggle("maximized");
    });
  }

  function setupWindowControls(win) {
    win.addEventListener("pointerdown", function () { focusWindow(win); });
    win.querySelector(".tl-close").addEventListener("click", function (e) {
      e.stopPropagation();
      var app = win.dataset.app;
      win.remove();
      openApps.delete(app);
      if (activeApp === cap(app)) setMenuBar("Finder");
      updateDock();
    });
    win.querySelector(".tl-min").addEventListener("click", function (e) {
      e.stopPropagation();
      win.classList.add("minimized");
      setMenuBar("Finder");
    });
    win.querySelector(".tl-max").addEventListener("click", function (e) {
      e.stopPropagation();
      win.classList.toggle("maximized");
    });
    win.querySelectorAll(".draggable").forEach(function (handle) { makeDraggable(win, handle); });
  }

  function openApp(app) {
    var win = document.getElementById(app + "-window");

    if (!win) {
      if (app === "chrome") {
        desktop.insertAdjacentHTML("beforeend", window.AppChrome.chromeWindowHTML());
      } else if (app === "discord") {
        desktop.insertAdjacentHTML("beforeend", window.AppDiscord.window.discordWindowHTML());
      } else if (app === "finder" || app === "trash") {
        showToast(cap(app) + " is not part of this mock.");
        return;
      } else {
        showToast(cap(app) + " is not part of this mock.");
        return;
      }
      win = document.getElementById(app + "-window");
      win.dataset.app = app;
      setupWindowControls(win);
      if (app === "chrome") {
        window.AppChrome.setupChrome(win);
      } else if (app === "discord") {
        window.AppDiscord.setup(win, {
          onRuleRead: function () {
            window.AppCommon.emit("walkthrough:rule-read");
          }
        });
      }
      openApps.add(app);
    }

    win.classList.remove("minimized", "hidden");
    focusWindow(win);
    updateDock();
  }

  /* ---------------- Menubar ---------------- */
  function updateClock() {
    var d = new Date();
    var date = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    var time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    clockEl.textContent = date + "  " + time;
  }

  appMenus.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-appmenu]");
    if (!btn) return;
    showToast(activeApp + " > " + btn.dataset.appmenu + " is visual only.");
  });

  appleBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    menuDropdown.classList.toggle("open");
  });

  document.addEventListener("click", function () {
    menuDropdown.classList.remove("open");
  });

  menuDropdown.addEventListener("click", function (e) {
    e.stopPropagation();
    var item = e.target.closest("[data-action]");
    if (item) {
      showToast(item.dataset.action);
      menuDropdown.classList.remove("open");
    }
  });

  document.querySelector(".menubar .right").addEventListener("click", function (e) {
    var btn = e.target.closest(".status-btn");
    if (!btn) return;
    showToast(btn.title + " is visual only.");
  });

  /* ---------------- Dock click dispatcher ---------------- */
  dock.addEventListener("click", function (e) {
    var icon = e.target.closest(".dock-icon");
    if (!icon) return;
    var app = icon.dataset.app;

    if (app === "chrome") {
      cancelHint();
      openApp("chrome");
    } else if (app === "discord") {
      openApp("discord");
      /* Auto-jump to #rule only on first open (the birthday rule). After that, resume last state. */
      if (!discordFirstOpen) {
        discordFirstOpen = true;
        var win = document.getElementById("discord-window");
        if (win && typeof win.selectBirthdayRule === "function") {
          win.selectBirthdayRule();
        }
      }
    } else {
      showToast(cap(app) + " is not part of this mock.");
    }
  });

  desktop.addEventListener("pointerdown", function (e) {
    if (e.target === desktop) {
      setMenuBar("Finder");
      document.querySelectorAll(".window").forEach(function (w) { w.classList.remove("focused"); });
    }
  });

  /* ---------------- Notification auto-dismiss timers ---------------- */
  var birthdayAutoTimer = null;
  var dmAutoTimer = null;

  /* Close button handler (shared for all notifications). */
  document.querySelectorAll(".n-close").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var target = btn.dataset.nClose;
      if (target === "birthday") hideBirthdayNotification();
      else if (target === "dm") hideDMNotification();
      else if (target === "hint") cancelHint();
    });
  });

  /* ---------------- Birthday notification ---------------- */
  var birthdayRuleUnread = true;
  function showBirthdayNotification() {
    var notification = document.getElementById("birthdayNotification");
    if (!notification) return;
    if (!birthdayRuleUnread) return;
    notification.classList.add("show");
    var badge = document.getElementById("discordDockBadge");
    if (badge) badge.classList.remove("hidden");
    if (window.AppDiscordPanic) window.AppDiscordPanic.bounceDock();
    /* Auto-dismiss after 8 seconds. */
    if (birthdayAutoTimer) clearTimeout(birthdayAutoTimer);
    birthdayAutoTimer = setTimeout(hideBirthdayNotification, 8000);
  }
  function hideBirthdayNotification() {
    if (birthdayAutoTimer) { clearTimeout(birthdayAutoTimer); birthdayAutoTimer = null; }
    var notification = document.getElementById("birthdayNotification");
    if (notification) notification.classList.remove("show");
  }
  function openBirthdayDiscord() {
    hideBirthdayNotification();
    openApp("discord");
    var win = document.getElementById("discord-window");
    if (win && typeof win.selectBirthdayRule === "function") {
      win.selectBirthdayRule();
    }
  }
  var birthdayNotification = document.getElementById("birthdayNotification");
  if (birthdayNotification) {
    birthdayNotification.addEventListener("click", function (e) {
      if (e.target.closest(".n-close")) return;
      openBirthdayDiscord();
    });
    birthdayNotification.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBirthdayDiscord(); }
    });
  }

  /* ---------------- DM notification ---------------- */
  function showDMNotification() {
    var n = document.getElementById("dmNotification");
    if (!n) return;
    n.classList.add("show");
    /* Auto-dismiss after 6 seconds. */
    if (dmAutoTimer) clearTimeout(dmAutoTimer);
    dmAutoTimer = setTimeout(hideDMNotification, 6000);
  }
  function hideDMNotification() {
    if (dmAutoTimer) { clearTimeout(dmAutoTimer); dmAutoTimer = null; }
    var n = document.getElementById("dmNotification");
    if (n) n.classList.remove("show");
  }
  function openSofiaDM() {
    hideDMNotification();
    openApp("discord");
    var w = document.getElementById("discord-window");
    if (w && w.appDiscord && w.appDiscord.openDM) w.appDiscord.openDM("sofia");
  }
  var dmNotification = document.getElementById("dmNotification");
  if (dmNotification) {
    dmNotification.addEventListener("click", function (e) {
      if (e.target.closest(".n-close")) return;
      openSofiaDM();
    });
    dmNotification.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSofiaDM(); }
    });
  }

  /* ---------------- Hint notification ----------------
   * Persistent hint that appears after a delay; dismissed by clicking
   * it, by opening the relevant dock icon, or programmatically.
   */
  var hintTimer = null;
  function scheduleHint(delay, content) {
    cancelHint();
    var c = content || {};
    hintTimer = setTimeout(function () {
      hintTimer = null;
      showHintNotification(c);
    }, delay);
  }
  function cancelHint() {
    if (hintTimer) { clearTimeout(hintTimer); hintTimer = null; }
    hideHintNotification();
  }
  function showHintNotification(c) {
    var el = document.getElementById("hintNotification");
    if (!el) return;
    var titleEl = el.querySelector(".h-title");
    var subEl = el.querySelector(".h-sub");
    var textEl = el.querySelector(".h-text");
    var iconEl = el.querySelector(".h-icon");
    if (titleEl) titleEl.textContent = c.title || "Hint";
    if (subEl) subEl.textContent = c.subtitle || "";
    if (textEl) textEl.textContent = c.text || "";
    if (iconEl && c.icon) iconEl.textContent = c.icon;
    el.classList.add("show");
  }
  function hideHintNotification() {
    var el = document.getElementById("hintNotification");
    if (el) el.classList.remove("show");
  }
  var hintNotificationEl = document.getElementById("hintNotification");
  if (hintNotificationEl) {
    hintNotificationEl.addEventListener("click", cancelHint);
  }

  /* ---------------- Walkthrough orchestrator ----------------
   * Step machine. Each step has:
   *   - id       — string
   *   - run()    — kicks it off
   *   - onEvent  — event name that triggers the next step
   * Completing the Discord step fires `walkthrough:discord-complete`,
   * which we listen for here as the gateway to the future "browser" step.
   */
  var STEPS = {
    "birthday-notif": {
      run: function () { setTimeout(showBirthdayNotification, 1200); },
      onEvent: null
    },
    "rule-read": {
      run: function () {
        /* Triggered by AppCommon.on("walkthrough:rule-read") from setupDiscord. */
        setTimeout(function () {
          if (window.AppDiscordPanic) window.AppDiscordPanic.start();
        }, 4500);
      },
      onEvent: "walkthrough:rule-read"
    },
    "discord-complete": {
      run: function () {
        /* No auto app-switch. Player opens Chrome themselves. */
        showToast("Discord step done. Sofia asked you to make your own birthday gift.");
        window.AppCommon.emit("walkthrough:ready-for-browser");
        scheduleHint(10000, {
          title: "Hint 💝",
          subtitle: "From Sofia",
          text: "Stray needs to make a birthday gift on the browser. Click the Chrome icon in the dock to start!",
          icon: "💡"
        });
      },
      onEvent: "walkthrough:discord-complete"
    },
    "gift-complete": {
      run: function () {
        /* Fired by apps/pages/canva.js when Stray clicks "Save & Finish". */
        showToast("Gift saved! Sofia just saw it...");
        cancelHint();

        /* Push a new message into Sofia's DM so when user re-opens Discord
         * they see Sofia's reaction right after the scripted conversation. */
        try {
          if (window.AppDiscord && window.AppDiscord.data && window.AppDiscord.data.discordMessageData) {
            var sofiaData = window.AppDiscord.data.discordMessageData.sofia;
            if (!sofiaData) sofiaData = window.AppDiscord.data.discordMessageData.sofia = [];
            sofiaData.push({
              author: "Sofia",
              color: "#9b59b6",
              time: "Today at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
              text: "STRAY I SAW THE GIFT IM LITERALLY CRYING 😭😭 happy birthday king u made urself the perfect one 💖",
              avImg: "static/sofia.webp"
            });
            var dw = document.getElementById("discord-window");
            if (dw && dw.appDiscord) {
              dw.appDiscord.refresh("sofia");
              dw.appDiscord.refreshDockBadge();
            }
          }
        } catch (e) { console.warn("[gift-complete] could not push Sofia reply:", e); }

        /* Schedule a hint that points back to Discord. */
        scheduleHint(3500, {
          title: "From Sofia 💖",
          subtitle: "Direct Message",
          text: "STRAY I SAW THE GIFT I'M CRYING 😭 come back to Discord!",
          icon: "💌"
        });

        /* Bounce the Discord dock icon for extra attention. */
        if (window.AppDiscordPanic && window.AppDiscordPanic.bounceDock) {
          window.AppDiscordPanic.bounceDock();
        }
      },
      onEvent: "walkthrough:gift-complete"
    }
  };

  function bindWalkthroughStep(stepId, evName) {
    if (!evName) return;
    window.AppCommon.on(evName, function () {
      var step = STEPS[stepId];
      if (step && typeof step.run === "function") step.run();
    }, { once: false });
  }
  Object.keys(STEPS).forEach(function (k) {
    if (STEPS[k].onEvent) bindWalkthroughStep(k, STEPS[k].onEvent);
  });

  /* ---------------- Kiosk / iframe init ---------------- */
  var params = new URLSearchParams(window.location.search);
  var shouldStart = params.get("start") === "1";
  var inIframe = false;
  try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
  if (shouldStart || inIframe) {
    document.body.classList.add("kiosk");
  }

  /* ---------------- Boot ---------------- */
  setMenuBar("Finder");
  updateClock();
  setInterval(updateClock, 20000);
  updateDock();

  var walkthroughStarted = false;
  function startWalkthrough(delay) {
    if (walkthroughStarted) return;
    walkthroughStarted = true;
    setTimeout(showBirthdayNotification, delay || 1200);
  }
  if (shouldStart) {
    startWalkthrough(1200);
  }

  /* Expose globals for the apps to call into. */
  window.trafficLightsHTML   = trafficLightsHTML;
  window.focusWindow         = focusWindow;
  window.makeDraggable       = makeDraggable;
  window.setupWindowControls = setupWindowControls;
  window.setMenuBar          = setMenuBar;
  window.updateDock          = updateDock;
  window.openApp             = openApp;
  window.cap                 = cap;
  window.initials            = initials;
  window.showDMNotification  = showDMNotification;
  window.hideDMNotification  = hideDMNotification;
})();
