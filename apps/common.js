/* apps/common.js — foundational helpers used by every app & orchestrator. */
window.AppCommon = (function () {
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function initials(name) {
    return String(name)
      .split(/\s+/)
      .filter(Boolean)
      .map(function (w) { return w[0]; })
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function showToast(msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.classList.remove("show"); }, 2300);
  }

  /* Tiny pub/sub for walkthrough-style step handoff. */
  function on(evt, fn, opts) {
    document.addEventListener(evt, function (e) { fn(e.detail); }, opts || false);
  }
  function emit(evt, detail) {
    document.dispatchEvent(new CustomEvent(evt, { detail: detail }));
  }

  return { escapeHTML: escapeHTML, cap: cap, initials: initials, showToast: showToast, on: on, emit: emit };
})();
