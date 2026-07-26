/* apps/chrome.js — Chrome window factory + state. Self-contained. */
window.AppChrome = (function () {
  var escapeHTML = window.AppCommon.escapeHTML;
  var showToast = window.AppCommon.showToast;

  function chromeWindowHTML() {
    return [
      '<div id="chrome-window" class="window chrome-window" data-app="chrome"',
      '  style="left:4%; top:6%; width:min(760px, 86%); height:min(480px, 74%);">',
        window.trafficLightsHTML
          ? window.trafficLightsHTML()
          : '<div class="traffic-lights"><button class="tl-close"></button><button class="tl-min"></button><button class="tl-max"></button></div>',
      '  <div class="chrome-tabbar draggable" id="chromeTabbar">',
      '    <div class="tabs" id="chromeTabs"></div>',
      '    <button class="new-tab-btn" id="chromeNewTab" title="New tab">+</button>',
      '  </div>',
      '  <div class="chrome-toolbar">',
      '    <button class="icon-btn" id="chromeBack" title="Back" disabled>←</button>',
      '    <button class="icon-btn" id="chromeForward" title="Forward" disabled>→</button>',
      '    <button class="icon-btn" id="chromeReload" title="Reload">⟳</button>',
      '    <div class="addressbar"><span class="lock">🔒</span>',
      '      <input id="chromeUrl" spellcheck="false" autocomplete="off" placeholder="Search or type a URL — no websites load" />',
      '    </div>',
      '    <button class="icon-btn" id="chromeStar" title="Bookmark">☆</button>',
      '    <button class="icon-btn" id="chromeExtensions" title="Extensions">🧩</button>',
      '    <button class="icon-btn avatar-btn" title="Profile">A</button>',
      '  </div>',
      '  <div class="chrome-bookmarks" id="chromeBookmarks">',
      '    <button class="bookmark" data-url="chrome://newtab">New Tab</button>',
      '    <button class="bookmark" data-url="mock://local/design-docs">Design Docs</button>',
      '    <button class="bookmark" data-url="mock://local/assets">Assets</button>',
      '    <button class="bookmark" data-url="mock://local/ui-notes">UI Notes</button>',
      '  </div>',
      '  <div class="chrome-content" id="chromeContent"></div>',
      '</div>'
    ].join("\n");
  }

  function newTabHTML() {
    return [
      '<div class="newtab-page">',
      '  <div class="newtab-card">',
      '    <div class="mock-logo">Mock<span>Browser</span></div>',
      '    <div class="searchbar"><span>🔍</span>',
      '      <input id="newtabSearch" placeholder="Search or type a URL — no websites are loaded" />',
      '    </div>',
      '    <div class="shortcuts">',
      '      <button class="shortcut" data-url="mock://local/mail" data-title="Mail"><span class="shortcut-icon" style="--c:#ea4335">M</span>Mail</button>',
      '      <button class="shortcut" data-url="mock://local/photos" data-title="Photos"><span class="shortcut-icon" style="--c:#fbbc05">P</span>Photos</button>',
      '      <button class="shortcut" data-url="mock://local/docs" data-title="Docs"><span class="shortcut-icon" style="--c:#34a853">D</span>Docs</button>',
      '      <button class="shortcut" data-url="mock://local/settings" data-title="Settings"><span class="shortcut-icon" style="--c:#8ab4f8">S</span>Settings</button>',
      '    </div>',
      '    <p class="fineprint">This Chrome window is a local UI mock. It does not build, load, or request any website.</p>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function placeholderPage(url, title) {
    return [
      '<div class="placeholder-page">',
      '  <div class="placeholder-card">',
      '    <div class="placeholder-icon">🗂️</div>',
      "    <h2>" + escapeHTML(title || url) + "</h2>",
      '    <p>This Chrome window is only a user-interface mock. No website is built, rendered, or fetched.</p>',
      "    <code>" + escapeHTML(url) + "</code>",
      '  </div>',
      '</div>'
    ].join("\n");
  }

  function faviconColor(url) {
    if (url.startsWith("chrome://")) return "#9aa0a6";
    if (url.indexOf("search") !== -1) return "#8ab4f8";
    var h = 0;
    for (var i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) % 360;
    return "hsl(" + h + " 70% 55%)";
  }

  function setupChrome(win) {
    var $ = function (s) { return win.querySelector(s); };
    var tabsEl = $("#chromeTabs");
    var contentEl = $("#chromeContent");
    var urlEl = $("#chromeUrl");
    var backBtn = $("#chromeBack");
    var forwardBtn = $("#chromeForward");
    var reloadBtn = $("#chromeReload");
    var newTabBtn = $("#chromeNewTab");
    var starBtn = $("#chromeStar");
    var extensionsBtn = $("#chromeExtensions");
    var avatarBtn = $(".avatar-btn");
    var bookmarksEl = $("#chromeBookmarks");

    function createTab(url, title) {
      var id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : "tab-" + Math.random().toString(36).slice(2);
      return { id: id, title: title, url: url, history: [{ url: url, title: title }], index: 0 };
    }

    var state = {
      tabs: [
        createTab("chrome://newtab", "New Tab"),
        createTab("mock://local/ui-notes", "UI Notes")
      ],
      active: null
    };
    state.active = state.tabs[0].id;

    function currentTab() { return state.tabs.find(function (t) { return t.id === state.active; }); }
    function prettyUrl(url) {
      return url.replace(/^mock:\/\//, "").replace(/^https?:\/\//, "");
    }
    function normalizeUrl(raw) {
      raw = String(raw || "").trim();
      if (!raw) return "chrome://newtab";
      if (raw.toLowerCase() === "newtab") return "chrome://newtab";
      if (raw === "about:blank") return "about:blank";
      if (/^chrome:\/\//i.test(raw)) return raw;
      return "mock://" + raw.replace(/^[a-z]+:\/\//i, "").replace(/^\/+/, "");
    }

    function renderTabs() {
      tabsEl.innerHTML = state.tabs.map(function (t) {
        return [
          '<div class="chrome-tab ' + (t.id === state.active ? "active" : "") + '" data-id="' + t.id + '" title="' + escapeHTML(t.title) + '">',
          '  <span class="favicon" style="background:' + faviconColor(t.url) + '"></span>',
          '  <span class="title">' + escapeHTML(t.title) + '</span>',
          '  <button class="close" title="Close tab">×</button>',
          '</div>'
        ].join("");
      }).join("");
    }

    function renderView() {
      var tab = currentTab();
      if (!tab) return;
      urlEl.value = tab.url;
      backBtn.disabled = tab.index <= 0;
      forwardBtn.disabled = tab.index >= tab.history.length - 1;      if (tab.url === "chrome://newtab") {
        contentEl.innerHTML = newTabHTML();
      } else if (window.AppBrowser && typeof window.AppBrowser.maybeRender === "function"
                 && window.AppBrowser.maybeRender(contentEl, tab.url, tab.title)) {
        /* AppBrowser handled the URL — a registered mock page rendered. */
      } else {
        contentEl.innerHTML = placeholderPage(tab.url, tab.title);
      }
    }

    function navigate(url, title, push) {
      var tab = currentTab();
      if (!tab) return;
      url = normalizeUrl(url);
      if (url === "chrome://newtab") title = "New Tab";
      if (!title) title = prettyUrl(url);
      if (push !== false) {
        tab.history = tab.history.slice(0, tab.index + 1);
        tab.history.push({ url: url, title: title });
        tab.index = tab.history.length - 1;
      }
      tab.url = url;
      tab.title = title;
      renderTabs();
      renderView();
    }

    function go(delta) {
      var tab = currentTab();
      if (!tab) return;
      var entry = tab.history[tab.index + delta];
      if (!entry) return;
      tab.index += delta;
      tab.url = entry.url;
      tab.title = entry.title;
      renderTabs();
      renderView();
    }

    function closeTab(id) {
      var idx = state.tabs.findIndex(function (t) { return t.id === id; });
      if (idx === -1) return;
      state.tabs.splice(idx, 1);
      if (state.tabs.length === 0) {
        var t2 = createTab("chrome://newtab", "New Tab");
        state.tabs.push(t2);
        state.active = t2.id;
      } else if (state.active === id) {
        state.active = state.tabs[Math.max(0, idx - 1)].id;
      }
      renderTabs();
      renderView();
    }

    tabsEl.addEventListener("click", function (e) {
      var close = e.target.closest(".close");
      var tab = e.target.closest(".chrome-tab");
      if (!tab) return;
      var id = tab.dataset.id;
      if (close) closeTab(id);
      else { state.active = id; renderTabs(); renderView(); }
    });

    newTabBtn.addEventListener("click", function () {
      var t = createTab("chrome://newtab", "New Tab");
      state.tabs.push(t);
      state.active = t.id;
      renderTabs();
      renderView();
    });

    backBtn.addEventListener("click", function () { go(-1); });
    forwardBtn.addEventListener("click", function () { go(1); });

    reloadBtn.addEventListener("click", function () {
      reloadBtn.classList.remove("spin");
      void reloadBtn.offsetWidth;
      reloadBtn.classList.add("spin");
      showToast("Reload is visual only — no website is loaded.");
    });

    urlEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var url = normalizeUrl(urlEl.value);
        navigate(url, prettyUrl(url));
        urlEl.blur();
      }
    });
    urlEl.addEventListener("focus", function () { urlEl.select(); });

    starBtn.addEventListener("click", function () {
      var starred = starBtn.classList.toggle("starred");
      starBtn.textContent = starred ? "★" : "☆";
      showToast(starred ? "Bookmark added — local UI only." : "Bookmark removed — local UI only.");
    });
    extensionsBtn.addEventListener("click", function () { showToast("Extensions menu is visual only."); });
    avatarBtn.addEventListener("click", function () { showToast("Profile menu is visual only."); });

    bookmarksEl.addEventListener("click", function (e) {
      var b = e.target.closest(".bookmark");
      if (!b) return;
      navigate(b.dataset.url, b.textContent.trim());
    });

    contentEl.addEventListener("keydown", function (e) {
      if (e.target.id === "newtabSearch" && e.key === "Enter") {
        var q = e.target.value.trim();
        if (!q) return;
        navigate("mock://search?q=" + encodeURIComponent(q), "Search: " + q);
      }
    });

    contentEl.addEventListener("click", function (e) {
      var s = e.target.closest(".shortcut");
      if (!s) return;
      navigate(s.dataset.url, s.dataset.title || s.textContent.trim());
    });

    renderTabs();
    renderView();
  }

  return { chromeWindowHTML: chromeWindowHTML, setupChrome: setupChrome };
})();
