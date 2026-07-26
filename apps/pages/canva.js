/* apps/pages/canva.js — Guided interactive Canva-style editor.
 * Walks Stray through making his own birthday gift in 5 tutorial steps:
 *   1. Pick a background color
 *   2. Add a title
 *   3. Add a friend photo
 *   4. Drag things into place
 *   5. Save & finish
 * On save, fires `walkthrough:gift-complete` (window event + AppCommon bus).
 * Registered with AppBrowser via the canva.com URL matcher.
 *
 * Everything is visual / local — no backend, no real Canva SDK.
 */
(function () {
  if (!window.AppBrowser) { console.warn("[canva.js] AppBrowser not loaded"); return; }

  /* ---------------- Friends available for the picker ---------------- */
  var FRIENDS = [
    { id: "hanaria", name: "Hanaria", src: "static/hanaria.webp", color: "#f23f42", emoji: "🌸" },
    { id: "sofia",   name: "Sofia",   src: "static/sofia.webp",   color: "#9b59b6", emoji: "✧"  },
    { id: "lells",   name: "Lells",   src: "static/lells.webp",   color: "#23a55a", emoji: "🐱" },
    { id: "mia",     name: "Mia",     src: null,                   color: "#fbbf24", emoji: "✨" }
  ];

  /* ---------------- Tutorial steps ---------------- */
  var STEPS = [
    {
      id: "background",
      selector: ".canva-swatch",
      tip: "Click any color swatch on the right to set the card's background."
    },
    {
      id: "title",
      selector: "[data-canva-act='addtext']",
      tip: "Click '🅰 Add Text' to place a birthday title on the card. Double-click to edit."
    },
    {
      id: "photo",
      selector: "[data-canva-act='addimage']",
      tip: "Click '🖼 Add Image' and pick a friend to drop them onto the card."
    },
    {
      id: "drag",
      selector: ".canva-stage-element",
      tip: "Click and drag any element to reposition it."
    },
    {
      id: "save",
      selector: "[data-canva-act='save']",
      tip: "Click '💾 Save & Finish' when you're happy with the gift."
    }
  ];

  /* ---------------- Editor CSS ---------------- */
  function canvaStyle() {
    return [
      "<style>",
      ".canva-mock { position: relative; display: grid; grid-template-rows: 56px 36px 1fr 48px; height: 100%; font-family: -apple-system, 'Segoe UI', sans-serif; background: #fff; color: #1a1a1a; overflow: hidden; }",
      ".canva-mock, .canva-mock * { box-sizing: border-box; }",

      /* Top bar */
      ".canva-topbar { display: flex; align-items: center; padding: 0 14px; border-bottom: 1px solid #ececec; background: #fff; gap: 14px; }",
      ".canva-logo { font: 800 22px/1 'Poppins', -apple-system, sans-serif; color: #7d2ae8; letter-spacing: -.04em; }",
      ".canva-logo .a { color: #00c4cc; }",
      ".canva-topnav { display: flex; gap: 2px; color: #777; font-size: 14px; }",
      ".canva-topnav a { padding: 6px 10px; border-radius: 6px; cursor: default; }",
      ".canva-topnav a:hover { background: #f1f1f1; color: #333; }",
      ".canva-project { font-size: 13px; color: #555; padding: 6px 12px; border-radius: 6px; background: #f5f5f5; border: 1px solid #eee; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }",
      ".canva-spacer { flex: 1; }",
      ".canva-avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #f23f42, #f0b232); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 700; cursor: default; }",
      ".canva-share { background: linear-gradient(90deg, #7d2ae8, #00c4cc); color: #fff; font-weight: 700; padding: 8px 18px; border-radius: 8px; font-size: 14px; border: 0; cursor: default; }",

      /* Step banner (sits between topbar and main) */
      ".canva-stepbar { display: flex; align-items: center; gap: 12px; padding: 0 14px; background: linear-gradient(90deg, #fff7e6, #ffe9f5); border-bottom: 1px solid #f3e0ec; font-size: 13px; color: #5a18b6; font-weight: 700; min-height: 36px; transition: background .35s ease; }",
      ".canva-stepbar .step-num { background: #7d2ae8; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 10px; font-weight: 800; letter-spacing: .03em; }",
      ".canva-stepbar .step-tip { color: #444; font-weight: 500; flex: 1; }",
      ".canva-stepbar.done { background: linear-gradient(90deg, #dcfce7, #dbeafe); color: #15803d; }",

      /* Main grid */
      ".canva-main { display: grid; grid-template-columns: 64px 1fr 280px; overflow: hidden; min-height: 0; }",
      ".canva-sidebar { background: #fafafa; border-right: 1px solid #eee; display: flex; flex-direction: column; align-items: center; padding: 12px 0; gap: 4px; overflow-y: auto; }",
      ".canva-sidebar button { width: 48px; height: 48px; border-radius: 8px; background: transparent; border: 0; color: #777; font-size: 10px; cursor: default; display: grid; place-items: center; padding: 4px; font-weight: 600; }",
      ".canva-sidebar button.active, .canva-sidebar button:hover { background: #fff; color: #7d2ae8; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }",
      ".canva-sidebar .ico { font-size: 19px; }",

      /* Canvas */
      ".canva-canvas { position: relative; background: #2c2c30; padding: 24px; overflow: hidden; display: grid; place-items: center; min-height: 0; min-width: 0; }",
      ".canva-page { background: #fff; width: min(640px, 92%); aspect-ratio: 5 / 4; box-shadow: 0 14px 40px rgba(0,0,0,.45); position: relative; overflow: hidden; transition: background .25s ease; }",
      ".canva-page .stage-empty { position: absolute; inset: 0; display: grid; place-items: center; color: #c9c9d3; font-size: 13px; pointer-events: none; user-select: none; }",

      /* Stage elements (draggable) */
      ".canva-stage-element { position: absolute; user-select: none; cursor: grab; line-height: 1; }",
      ".canva-stage-element.selected { outline: 2px solid #7d2ae8; outline-offset: 2px; }",
      ".canva-stage-element.dragging { cursor: grabbing; }",
      ".canva-stage-element.text { font-weight: 700; color: #2a1a4d; background: rgba(255,255,255,.55); border-radius: 4px; padding: 4px 10px; min-width: 60px; min-height: 28px; white-space: pre-wrap; max-width: 80%; }",
      ".canva-stage-element.image { width: 96px; height: 96px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.15); overflow: hidden; background: #f3f4f6; }",
      ".canva-stage-element.image img { width: 100%; height: 100%; object-fit: cover; display: block; }",
      ".canva-stage-element.fallback { display: grid; place-items: center; color: #fff; font-size: 38px; font-weight: 800; background-size: cover; }",
      ".canva-stage-element[contenteditable='true'] { cursor: text; outline: 2px solid #00c4cc; outline-offset: 2px; }",

      /* Properties panel */
      ".canva-properties { background: #fff; border-left: 1px solid #eee; padding: 16px; overflow-y: auto; }",
      ".canva-section { margin-bottom: 18px; }",
      ".canva-section h4 { margin: 0 0 8px; font-size: 11px; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: .06em; }",
      ".canva-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }",
      ".canva-swatch { height: 36px; border-radius: 6px; cursor: pointer; border: 2px solid transparent; transition: transform .15s ease; }",
      ".canva-swatch:hover { transform: scale(1.06); }",
      ".canva-swatch.selected { border-color: #7d2ae8; box-shadow: 0 0 0 1px #7d2ae8 inset; }",
      ".canva-pill { display: inline-block; padding: 6px 12px; border-radius: 12px; background: #f1eaff; color: #5a18b6; font-weight: 700; font-size: 11px; margin: 2px 4px 2px 0; cursor: pointer; border: 1.5px solid transparent; transition: all .15s ease; user-select: none; }",
      ".canva-pill:hover { background: #7d2ae8; color: #fff; }",
      ".canva-pill.primary { background: linear-gradient(135deg, #7d2ae8, #00c4cc); color: #fff; box-shadow: 0 4px 12px rgba(125,42,232,.35); }",
      ".canva-pill.primary:hover { filter: brightness(1.08); }",
      ".canva-selinfo { font-size: 12px; color: #555; padding: 6px 8px; background: #fafafa; border-radius: 6px; border: 1px solid #eee; }",

      /* Bottom page tabs */
      ".canva-bottom { display: flex; align-items: center; padding: 0 14px; border-top: 1px solid #ececec; background: #f5f5f5; gap: 8px; }",
      ".canva-page-tab { font-size: 12px; padding: 6px 12px; border-radius: 6px 6px 0 0; background: transparent; border: 1px solid transparent; color: #555; cursor: pointer; font-weight: 600; }",
      ".canva-page-tab.active { background: #fff; border-color: #ececec #ececec transparent #ececec; color: #7d2ae8; }",
      ".canva-page-add { width: 30px; height: 30px; border-radius: 6px; background: transparent; border: 1px dashed #bbb; color: #888; cursor: default; font-size: 18px; }",

      /* Picker modal */
      ".canva-modal-mask { position: absolute; inset: 0; background: rgba(0,0,0,.55); display: grid; place-items: center; z-index: 50; padding: 20px; }",
      ".canva-modal { background: #fff; border-radius: 14px; padding: 18px; min-width: 280px; max-width: 320px; box-shadow: 0 18px 50px rgba(0,0,0,.45); }",
      ".canva-modal h3 { margin: 0 0 12px; font-size: 15px; color: #2a1a4d; }",
      ".canva-modal .picker-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }",
      ".canva-modal .picker-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px; border-radius: 10px; border: 1px solid #eee; cursor: pointer; transition: all .15s ease; background: #fff; }",
      ".canva-modal .picker-tile:hover { border-color: #7d2ae8; transform: translateY(-2px); box-shadow: 0 6px 18px rgba(125,42,232,.18); }",
      ".canva-modal .picker-avatar { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; color: #fff; font-size: 22px; font-weight: 800; }",
      ".canva-modal .picker-avatar img { width: 100%; height: 100%; object-fit: cover; }",
      ".canva-modal .picker-name { font-size: 12px; color: #555; font-weight: 600; }",
      ".canva-modal .cancel { margin-top: 12px; width: 100%; padding: 8px; border: 0; border-radius: 8px; background: #f5f5f5; color: #555; cursor: pointer; font-weight: 600; }",
      ".canva-modal .cancel:hover { background: #ececec; }",

      /* Coach mark overlay */
      ".canva-coach-mask { position: absolute; inset: 0; pointer-events: none; z-index: 60; }",
      ".canva-spotlight { position: absolute; border-radius: 10px; box-shadow: 0 0 0 9999px rgba(15,18,28,.62), 0 0 0 3px rgba(125,42,232,.9); animation: canvaPulse 1.6s ease-in-out infinite; pointer-events: none; }",
      "@keyframes canvaPulse { 0%, 100% { box-shadow: 0 0 0 9999px rgba(15,18,28,.62), 0 0 0 3px rgba(125,42,232,.9); } 50% { box-shadow: 0 0 0 9999px rgba(15,18,28,.45), 0 0 0 6px rgba(0,196,204,.9); } }",
      ".canva-coach-card { position: absolute; background: #fff; border-radius: 12px; padding: 14px 16px; min-width: 220px; max-width: 280px; box-shadow: 0 18px 40px rgba(0,0,0,.45); pointer-events: auto; z-index: 70; border: 1px solid rgba(125,42,232,.25); }",
      ".canva-coach-card .step-pill { display: inline-block; background: #f1eaff; color: #5a18b6; font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 800; margin-bottom: 6px; letter-spacing: .04em; }",
      ".canva-coach-card h4 { margin: 0 0 6px; font-size: 13px; color: #7d2ae8; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; }",
      ".canva-coach-card p { margin: 0; font-size: 13px; color: #333; line-height: 1.45; }",
      "</style>"
    ].join("");
  }

  /* ---------------- Editor body ---------------- */
  function bodyHTML() {
    return [
      '<div class="canva-mock" id="canvaRoot">',
      '  <div class="canva-topbar">',
      '    <div class="canva-logo">C<span class="a">anva</span></div>',
      '    <nav class="canva-topnav"><a>File</a><a>Edit</a><a>View</a></nav>',
      '    <div class="canva-project">Stray&apos;s Bday Gift — in progress</div>',
      '    <div class="canva-spacer"></div>',
      '    <div class="canva-avatar" title="Stray">S</div>',
      '    <button class="canva-share" data-canva-act="publish">Share</button>',
      '  </div>',
      '  <div class="canva-stepbar" id="canvaStepbar">',
      '    <span class="step-num" id="canvaStepNum">1 / 5</span>',
      '    <span class="step-tip" id="canvaStepTip">Click any color swatch on the right to set the background.</span>',
      '  </div>',
      '  <div class="canva-main">',
      '    <div class="canva-sidebar">',
      '      <button class="active" data-tab="design"><div class="ico">🧩</div>Design</button>',
      '      <button data-tab="elements"><div class="ico">⭐</div>Elements</button>',
      '      <button data-tab="uploads"><div class="ico">📁</div>Uploads</button>',
      '      <button data-tab="text"><div class="ico">🅰</div>Text</button>',
      '      <button data-tab="projects"><div class="ico">📂</div>Projects</button>',
      '      <button data-tab="audio"><div class="ico">🎵</div>Audio</button>',
      '      <button data-tab="video"><div class="ico">🎬</div>Video</button>',
      '      <button data-tab="more"><div class="ico">⋯</div>More</button>',
      '    </div>',
      '    <div class="canva-canvas" id="canvaCanvas">',
      '      <div class="canva-page" id="canvaPage">',
      '        <div class="stage-empty" id="canvaEmpty">Your gift will appear here</div>',
      '      </div>',
      '    </div>',
      '    <div class="canva-properties">',
      '      <div class="canva-section">',
      '        <h4>Background</h4>',
      '        <div class="canva-grid" id="canvaBgGrid">',
      '          <div class="canva-swatch" data-bg="#ffffff" style="background:#ffffff;border:1px solid #ddd"></div>',
      '          <div class="canva-swatch" data-bg="#fff5f7" style="background:#fff5f7"></div>',
      '          <div class="canva-swatch" data-bg="#fef3c7" style="background:#fef3c7"></div>',
      '          <div class="canva-swatch" data-bg="#fce7f3" style="background:#fce7f3"></div>',
      '          <div class="canva-swatch" data-bg="#ede9fe" style="background:#ede9fe"></div>',
      '          <div class="canva-swatch" data-bg="#dbeafe" style="background:#dbeafe"></div>',
      '          <div class="canva-swatch" data-bg="#dcfce7" style="background:#dcfce7"></div>',
      '          <div class="canva-swatch" data-bg="#1a1a2e" style="background:#1a1a2e"></div>',
      '          <div class="canva-swatch" data-bg="#5865f2" style="background:#5865f2"></div>',
      '          <div class="canva-swatch" data-bg="#eb459e" style="background:#eb459e"></div>',
      '          <div class="canva-swatch" data-bg="#7d2ae8" style="background:#7d2ae8"></div>',
      '          <div class="canva-swatch" data-bg="#f23f42" style="background:#f23f42"></div>',
      '        </div>',
      '      </div>',
      '      <div class="canva-section">',
      '        <h4>Add</h4>',
      '        <span class="canva-pill primary" data-canva-act="addtext">🅰 Add Text</span>',
      '        <span class="canva-pill primary" data-canva-act="addimage">🖼 Add Image</span>',
      '      </div>',
      '      <div class="canva-section" id="canvaSelectedSection" style="display:none">',
      '        <h4>Selected</h4>',
      '        <div id="canvaSelectedInfo" class="canva-selinfo"></div>',
      '        <span class="canva-pill" data-canva-act="delete">🗑 Delete</span>',
      '      </div>',
      '      <div class="canva-section">',
      '        <h4>Finish</h4>',
      '        <span class="canva-pill primary" data-canva-act="save">💾 Save &amp; Finish</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '  <div class="canva-bottom">',
      '    <div class="canva-page-tab active">Page 1</div>',
      '    <div class="canva-page-tab">Page 2</div>',
      '    <div class="canva-page-tab">Page 3</div>',
      '    <button class="canva-page-add" data-canva-act="addpage">+</button>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ---------------- Editor state (per-render) ---------------- */
  var state = null;
  var zCounter = 10;
  function uid() { return "el-" + Math.random().toString(36).slice(2, 9); }
  function nowStr() {
    return "Today at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  /* ---------------- Main render ---------------- */
  function render(contentEl, url, title) {
    contentEl.innerHTML = canvaStyle() + bodyHTML();
    state = { bg: "#ffffff", bgChosen: false, elements: [], step: 0, completed: false };
    zCounter = 10;
    setupInteractions(contentEl);
    showStep(contentEl, 0);

    if (window.AppCommon && typeof window.AppCommon.emit === "function") {
      window.AppCommon.emit("walkthrough:browser-opened", { url: "canva.com" });
    }
  }

  /* ---------------- Wiring ---------------- */
  function setupInteractions(root) {
    var pageEl = root.querySelector("#canvaPage");

    /* Sidebar tabs — visual only */
    root.querySelectorAll(".canva-sidebar button[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".canva-sidebar button[data-tab]").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        toast("Canva > " + btn.dataset.tab + " is a visual mock.");
      });
    });

    /* Background swatches */
    root.querySelectorAll("#canvaBgGrid .canva-swatch").forEach(function (sw) {
      sw.addEventListener("click", function (e) {
        e.stopPropagation();
        state.bg = sw.dataset.bg;
        state.bgChosen = true;
        pageEl.style.background = state.bg;
        root.querySelectorAll("#canvaBgGrid .canva-swatch").forEach(function (s) { s.classList.remove("selected"); });
        sw.classList.add("selected");
        if (STEPS[state.step].id === "background") advanceStep(root);
      });
    });

    /* Add Text */
    var addTextBtn = root.querySelector('[data-canva-act="addtext"]');
    if (addTextBtn) addTextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      addTextElement(root, "Happy Birthday, Stray! 🎂");
      if (STEPS[state.step].id === "title") advanceStep(root);
    });

    /* Add Image */
    var addImgBtn = root.querySelector('[data-canva-act="addimage"]');
    if (addImgBtn) addImgBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openPicker(root);
    });

    /* Save */
    var saveBtn = root.querySelector('[data-canva-act="save"]');
    if (saveBtn) saveBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      complete(root);
    });

    /* Delete */
    var delBtn = root.querySelector('[data-canva-act="delete"]');
    if (delBtn) delBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      deleteSelected(root);
    });

    /* Bottom page tabs + sidebar other actions */
    root.querySelectorAll('.canva-page-tab').forEach(function (tab) {
      tab.addEventListener("click", function () {
        root.querySelectorAll('.canva-page-tab').forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
      });
    });
    root.querySelectorAll('[data-canva-act="addpage"], [data-canva-act="publish"]').forEach(function (b) {
      b.addEventListener("click", function () { toast("Canva > this is a visual mock."); });
    });

    /* Deselect on empty page click */
    pageEl.addEventListener("click", function (e) {
      if (e.target === pageEl || e.target.id === "canvaEmpty") selectElement(root, null);
    });

    /* Recompute coach-mark positions on resize */
    window.addEventListener("resize", function () { repositionCoachMark(root); });
  }

  function toast(msg) {
    if (window.AppCommon && window.AppCommon.showToast) window.AppCommon.showToast(msg);
  }

  /* ---------------- Element factories ---------------- */
  function addTextElement(root, text) {
    var pageEl = root.querySelector("#canvaPage");
    var el = document.createElement("div");
    el.className = "canva-stage-element text";
    el.id = uid();
    el.dataset.type = "text";
    el.contentEditable = "false";
    el.spellcheck = false;
    el.textContent = text;
    el.style.left = "32%";
    el.style.top  = "30%";
    el.style.fontSize = "30px";
    el.style.color = "#2a1a4d";
    el.style.zIndex = String(++zCounter);
    pageEl.appendChild(el);
    hideEmpty(pageEl);

    var data = { id: el.id, type: "text", text: text, x: 32, y: 30, fontSize: 30, color: "#2a1a4d", moved: false };
    state.elements.push(data);

    el.addEventListener("input", function () { data.text = el.textContent; });
    el.addEventListener("dblclick", function (e) {
      e.stopPropagation();
      el.contentEditable = "true";
      el.focus();
      selectAllText(el);
    });
    el.addEventListener("blur", function () { el.contentEditable = "false"; });
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      selectElement(root, data);
    });
    makeDraggable(root, el, data);
    selectElement(root, data);
  }

  function addImageElement(root, friend) {
    var pageEl = root.querySelector("#canvaPage");
    var el = document.createElement("div");
    el.className = "canva-stage-element image";
    el.id = uid();
    el.dataset.type = "image";
    if (friend.src) {
      el.innerHTML = '<img src="' + friend.src + '" alt="' + escapeHTML(friend.name) + '" />';
    } else {
      el.classList.add("fallback");
      el.style.background = "linear-gradient(135deg, " + friend.color + ", #ec4899)";
      el.textContent = friend.emoji || "✨";
    }
    el.style.left = "55%";
    el.style.top  = "60%";
    el.style.zIndex = String(++zCounter);
    pageEl.appendChild(el);
    hideEmpty(pageEl);

    var data = { id: el.id, type: "image", friend: friend, x: 55, y: 60, moved: false };
    state.elements.push(data);

    el.addEventListener("click", function (e) { e.stopPropagation(); selectElement(root, data); });
    makeDraggable(root, el, data);
    selectElement(root, data);
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }

  function hideEmpty(pageEl) {
    var empty = pageEl.querySelector("#canvaEmpty");
    if (empty && pageEl.querySelectorAll(".canva-stage-element").length > 0) empty.style.display = "none";
  }

  function selectElement(root, data) {
    root.querySelectorAll(".canva-stage-element").forEach(function (e) { e.classList.remove("selected"); });
    var section = root.querySelector("#canvaSelectedSection");
    var info    = root.querySelector("#canvaSelectedInfo");
    if (!data) {
      if (section) section.style.display = "none";
      return;
    }
    var el = root.querySelector("#" + data.id);
    if (el) el.classList.add("selected");
    if (section && info) {
      section.style.display = "block";
      info.textContent = data.type === "text"
        ? "Text — " + (data.text || "").slice(0, 40)
        : "Image — " + (data.friend ? data.friend.name : "—");
    }
  }

  function deleteSelected(root) {
    var sel = root.querySelector(".canva-stage-element.selected");
    if (!sel) return;
    var id = sel.id;
    sel.remove();
    state.elements = state.elements.filter(function (e) { return e.id !== id; });
    selectElement(root, null);
  }

  function makeDraggable(root, el, data) {
    el.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      if (el.contentEditable === "true") return;
      e.preventDefault();
      e.stopPropagation();
      el.classList.add("dragging");
      selectElement(root, data);

      var pageEl = root.querySelector("#canvaPage");
      var pageRect = pageEl.getBoundingClientRect();
      var elRect = el.getBoundingClientRect();
      var offsetX = e.clientX - elRect.left;
      var offsetY = e.clientY - elRect.top;

      function move(ev) {
        var xPct = ((ev.clientX - pageRect.left - offsetX) / pageRect.width) * 100;
        var yPct = ((ev.clientY - pageRect.top  - offsetY) / pageRect.height) * 100;
        xPct = Math.max(0, Math.min(100, xPct));
        yPct = Math.max(0, Math.min(100, yPct));
        el.style.left = xPct + "%";
        el.style.top  = yPct + "%";
        data.x = xPct;
        data.y = yPct;
        data.moved = true;
      }
      function cleanup() {
        el.classList.remove("dragging");
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", cleanup);
        document.removeEventListener("pointercancel", cleanup);
        if (STEPS[state.step].id === "drag" && state.elements.some(function (d) { return d.moved; })) {
          advanceStep(root);
        }
      }
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", cleanup);
      document.addEventListener("pointercancel", cleanup);
    });
  }

  function selectAllText(el) {
    try {
      var range = document.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) {}
  }

  /* ---------------- Picker modal ---------------- */
  function openPicker(root) {
    var pageEl = root.querySelector("#canvaPage");
    var mask = document.createElement("div");
    mask.className = "canva-modal-mask";

    var html = [
      '<div class="canva-modal">',
      '  <h3>Pick a friend to add</h3>',
      '  <div class="picker-grid">'
    ];
    FRIENDS.forEach(function (f) {
      var avatarInner = f.src
        ? '<img src="' + f.src + '" alt="' + escapeHTML(f.name) + '" />'
        : escapeHTML(f.emoji || "✨");
      var avatarStyle = f.src ? "" : ' style="background:linear-gradient(135deg,' + f.color + ',#ec4899)"';
      html.push(
        '<div class="picker-tile" data-friend="' + f.id + '">' +
          '<div class="picker-avatar"' + avatarStyle + '>' + avatarInner + '</div>' +
          '<div class="picker-name">' + escapeHTML(f.name) + '</div>' +
        '</div>'
      );
    });
    html.push('  </div>', '  <button class="cancel">Cancel</button>', '</div>');
    mask.innerHTML = html.join("");
    pageEl.appendChild(mask);

    mask.addEventListener("click", function (e) {
      if (e.target.classList.contains("canva-modal-mask") || e.target.classList.contains("cancel")) {
        mask.remove();
        return;
      }
      var tile = e.target.closest("[data-friend]");
      if (tile) {
        var friend = FRIENDS.find(function (f) { return f.id === tile.dataset.friend; });
        mask.remove();
        if (friend) {
          addImageElement(root, friend);
          if (STEPS[state.step].id === "photo") advanceStep(root);
        }
      }
    });
  }

  /* ---------------- Tutorial step controller ---------------- */
  function showStep(root, idx) {
    if (idx < 0 || idx >= STEPS.length) return;
    state.step = idx;
    var step = STEPS[idx];
    root.querySelector("#canvaStepNum").textContent = (idx + 1) + " / " + STEPS.length;
    root.querySelector("#canvaStepTip").textContent = step.tip;
    renderCoachMark(root, step);
  }

  function advanceStep(root) {
    if (state.completed) return;
    if (!validateStep(STEPS[state.step].id)) return;
    if (state.step >= STEPS.length - 1) return;
    clearCoachMark(root);
    setTimeout(function () { showStep(root, state.step + 1); }, 280);
  }

  function validateStep(id) {
    switch (id) {
      case "background": return state.bgChosen;
      case "title":      return state.elements.some(function (e) { return e.type === "text"; });
      case "photo":      return state.elements.some(function (e) { return e.type === "image"; });
      case "drag":       return state.elements.some(function (e) { return e.moved === true; });
      case "save":       return true;
      default:           return false;
    }
  }

  function renderCoachMark(root, step) {
    clearCoachMark(root);
    var rootEl = root.querySelector("#canvaRoot");
    var mask = document.createElement("div");
    mask.className = "canva-coach-mask";
    mask.id = "canvaCoachMark";
    rootEl.appendChild(mask);

    var target = root.querySelector(step.selector);

    var spotlight = null;
    if (target) {
      spotlight = document.createElement("div");
      spotlight.className = "canva-spotlight";
      mask.appendChild(spotlight);
    }

    var card = document.createElement("div");
    card.className = "canva-coach-card";
    card.innerHTML =
      '<span class="step-pill">Step ' + (state.step + 1) + ' of ' + STEPS.length + '</span>' +
      '<h4>' + stepTitle(state) + '</h4>' +
      '<p>' + escapeHTML(step.tip) + '</p>';
    mask.appendChild(card);

    /* Position spotlight + card once layout settles. */
    function place() {
      if (spotlight && target) positionSpotlight(spotlight, target, rootEl);
      positionCard(card, rootEl, spotlight);
    }
    place();
    /* Repaint after layout/font-load races. */
    requestAnimationFrame(place);

    mask._placeFn = place;
  }

  function stepTitle(state) {
    var map = {
      "background": "Pick a background",
      "title":      "Add a title",
      "photo":      "Add a friend photo",
      "drag":       "Move things around",
      "save":       "Save your gift"
    };
    return map[STEPS[state.step].id] || "";
  }

  function positionSpotlight(sp, target, rootEl) {
    var rootRect = rootEl.getBoundingClientRect();
    var tRect = target.getBoundingClientRect();
    var pad = 6;
    sp.style.left   = (tRect.left - rootRect.left - pad) + "px";
    sp.style.top    = (tRect.top  - rootRect.top  - pad) + "px";
    sp.style.width  = (tRect.width  + pad * 2) + "px";
    sp.style.height = (tRect.height + pad * 2) + "px";
  }

  function positionCard(card, rootEl, sp) {
    var rootRect = rootEl.getBoundingClientRect();
    var cardRect = card.getBoundingClientRect();
    if (!sp) {
      card.style.left = "50%";
      card.style.bottom = "60px";
      card.style.transform = "translateX(-50%)";
      card.style.top = "auto";
      return;
    }
    var spRect = sp.getBoundingClientRect();
    var x = (spRect.left - rootRect.left) + (spRect.width / 2) - (cardRect.width / 2);
    var y = (spRect.top  - rootRect.top)  + spRect.height + 14;
    x = Math.max(8, Math.min(rootRect.width  - cardRect.width  - 8, x));
    if (y + cardRect.height > rootRect.height - 8) {
      y = (spRect.top - rootRect.top) - cardRect.height - 14;
    }
    if (y < 8) y = 8;
    card.style.left = x + "px";
    card.style.top  = y + "px";
    card.style.transform = "none";
  }

  function repositionCoachMark(root) {
    var mask = root.querySelector("#canvaCoachMark");
    if (!mask || !mask._placeFn) return;
    mask._placeFn();
  }

  function clearCoachMark(root) {
    var existing = root.querySelector("#canvaCoachMark");
    if (existing) existing.remove();
  }

  /* ---------------- Completion ---------------- */
  function complete(root) {
    if (state.completed) return;
    state.completed = true;
    clearCoachMark(root);

    var stepbar  = root.querySelector("#canvaStepbar");
    var stepNum  = root.querySelector("#canvaStepNum");
    var stepTip  = root.querySelector("#canvaStepTip");
    if (stepbar) stepbar.classList.add("done");
    if (stepNum) stepNum.textContent = "🎉";
    if (stepTip) stepTip.textContent = "Saving…";

    /* Capture the canva page as a dataURL so we can drop it on the desktop. */
    captureCanvas(root, function (dataURL) {
      if (stepTip) stepTip.textContent = "Saved. Sofia's going to love this.";
      fireCompletion(dataURL);
    });
  }

  function fireCompletion(dataURL) {
    var detail = { elements: state.elements.length, bg: state.bg, image: dataURL || null };
    window.dispatchEvent(new CustomEvent("walkthrough:gift-complete", { detail: detail }));
    if (window.AppCommon && typeof window.AppCommon.emit === "function") {
      window.AppCommon.emit("walkthrough:gift-complete", detail);
    }
  }

  /* Capture the canva-page element onto a hidden canvas and return a dataURL.
   * We manually draw: background fill, then each text / image element
   * positioned in percentage-space. Friend photos are pre-loaded via Image().
   * Falls back to firing completion without an image on any error. */
  function captureCanvas(root, cb) {
    try {
      var pageEl = root.querySelector("#canvaPage");
      if (!pageEl) { cb(null); return; }

      var W = 640, H = 512;
      var c = document.createElement("canvas");
      c.width = W; c.height = H;
      var cx = c.getContext("2d");

      /* Background */
      cx.fillStyle = state.bg || "#ffffff";
      cx.fillRect(0, 0, W, H);

      var elems = state.elements.slice();
      var pending = 0;
      var done = false;

      function finish() {
        if (done) return;
        done = true;
        try { cb(c.toDataURL("image/png")); } catch (e) { cb(null); }
      }

      function drawText(el) {
        var sz = (el.fontSize || 30) * (W / 100) * 0.55;
        cx.font = "bold " + sz + "px -apple-system, 'Segoe UI', sans-serif";
        cx.fillStyle = el.color || "#2a1a4d";
        cx.textBaseline = "top";
        var x = (el.x / 100) * W;
        var y = (el.y / 100) * H;
        wrapText(cx, el.text || "", x, y, W * 0.7, sz * 1.25);
      }

      function drawImageEl(el) {
        var fr = el.friend;
        if (!fr || !fr.src) return;
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          var w = 96 * (W / 100);
          var h = w;
          var x = (el.x / 100) * W;
          var y = (el.y / 100) * H;
          var r = 12;
          cx.save();
          cx.beginPath();
          cx.moveTo(x + r, y);
          cx.lineTo(x + w - r, y);
          cx.arcTo(x + w, y, x + w, y + r, r);
          cx.lineTo(x + w, y + h - r);
          cx.arcTo(x + w, y + h, x + w - r, y + h, r);
          cx.lineTo(x + r, y + h);
          cx.arcTo(x, y + h, x, y + h - r, r);
          cx.lineTo(x, y + r);
          cx.arcTo(x, y, x + r, y, r);
          cx.clip();
          cx.drawImage(img, x, y, w, h);
          cx.restore();
          pending--;
          if (pending <= 0) finish();
        };
        img.onerror = function () {
          var w = 96 * (W / 100);
          var x = (el.x / 100) * W;
          var y = (el.y / 100) * H;
          cx.fillStyle = fr.color || "#ccc";
          cx.fillRect(x, y, w, w);
          cx.fillStyle = "#fff";
          cx.font = "bold 28px sans-serif";
          cx.textAlign = "center";
          cx.textBaseline = "middle";
          cx.fillText(fr.emoji || "✧", x + w / 2, y + w / 2);
          cx.textAlign = "start";
          pending--;
          if (pending <= 0) finish();
        };
        img.src = fr.src;
      }

      /* Count image elements that need loading */
      for (var i = 0; i < elems.length; i++) {
        if (elems[i].type === "image" && elems[i].friend && elems[i].friend.src) pending++;
      }

      /* Draw text immediately, queue images */
      for (var j = 0; j < elems.length; j++) {
        if (elems[j].type === "text") drawText(elems[j]);
        else if (elems[j].type === "image") drawImageEl(elems[j]);
      }

      /* If no images to load, finish now */
      if (pending <= 0) finish();
    } catch (e) {
      console.warn("[canva] captureCanvas error:", e);
      cb(null);
    }
  }

  function wrapText(cx, text, x, y, maxW, lineH) {
    var words = text.split(/\s+/);
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line + (line ? " " : "") + words[i];
      if (cx.measureText(test).width > maxW && line) {
        cx.fillText(line, x, y);
        line = words[i];
        y += lineH;
      } else {
        line = test;
      }
    }
    if (line) cx.fillText(line, x, y);
  }

  /* ---------------- Register with AppBrowser ---------------- */
  window.AppBrowser.register(
    function (url) { return /canva\.com/i.test(url); },
    render
  );
})();