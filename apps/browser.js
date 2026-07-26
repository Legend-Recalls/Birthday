/* apps/browser.js — mock-page registry for the in-Chrome browser step.
 *
 * Pages register a URL matcher + renderer. chrome.js calls maybeRender() before
 * its built-in placeholderPage(); if anything matches, that page owns the content.
 *
 * API:
 *   AppBrowser.register(matchFn, renderFn)
 *     - matchFn(url, title) returns truthy if this page handles the URL
 *     - renderFn(contentEl, url, title) populates contentEl with the mock page
 *
 *   AppBrowser.maybeRender(contentEl, url, title)
 *     - returns true if a registered page rendered, false otherwise
 *
 *   AppBrowser.navigate(contentEl, url, title)
 *     - same as maybeRender but always fills content (never falsy back)
 */
window.AppBrowser = (function () {
  var routes = [];

  function register(match, render) {
    if (typeof match !== "function" || typeof render !== "function") return;
    routes.push({ match: match, render: render });
  }

  function maybeRender(contentEl, url, title) {
    for (var i = 0; i < routes.length; i++) {
      var r = routes[i];
      if (r.match(url, title || "")) {
        try { r.render(contentEl, url, title || ""); }
        catch (e) { console.error("[AppBrowser] page render threw:", e); }
        return true;
      }
    }
    return false;
  }

  function navigate(contentEl, url, title) {
    if (!maybeRender(contentEl, url, title)) {
      contentEl.innerHTML = '<div class="placeholder-page"><div class="placeholder-card"><div class="placeholder-icon">🗂️</div><h2>' + escapeHTML(title || url) + '</h2><p>This mock browser only loads registered pages.</p><code>' + escapeHTML(url) + '</code></div></div>';
    }
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }

  return { register: register, maybeRender: maybeRender, navigate: navigate };
})();
