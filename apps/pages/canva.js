/* apps/pages/canva.js — Guided interactive Canva-style editor.
 * Walks Stray through making his own birthday gift in 3 tutorial steps:
 *   1. Drag 7 gold elements onto the card— they snap into place
 *   2. Edit the title text
 *   3. Save & finish
 * On save, fires `walkthrough:gift-complete` (window event + AppCommon bus).
 * Registered with AppBrowser via the canva.com URL matcher.
 *
 * Everything is visual / local — no backend, no real Canva SDK.
 */
(function () {
  if (!window.AppBrowser) { console.warn("[canva.js] AppBrowser not loaded"); return; }

  /* ---------------- Draggable assets (positions from canva-layout-*.json) ---------------- */
  /* Each percent value (xPct, yPct, wPct, hPct) is exactly the position of that
   * element in the JSON file's 1536x395 viewport. The canva-page is 5:4, so the
   * elements look like the *real* design: clustered in the central area. */
  var DRAGGABLE_ASSETS = [
    /* JSON idx 1: "Golden Stars and Moon Cutout" - LEFT star frame */
    { id: "01-star-l",  src: "static/canva-002.png", name: "Golden Stars & Moon (left)",
      xPct: 45.34, yPct: 43.79, wPct: 7.45,  hPct: 28.98, z: 4 },
    /* JSON idx 2: "Golden Stars and Moon Cutout" - RIGHT star frame */
    { id: "02-star-r",  src: "static/canva-003.png", name: "Golden Stars & Moon (right)",
      xPct: 52.47, yPct: 42.56, wPct: 7.95,  hPct: 30.93, z: 5 },
    /* JSON idx 3: "golden square frame" - center frame */
    { id: "03-frame",   src: "static/canva-004.webp", name: "Golden Square Frame",
      xPct: 47.82, yPct: 41.95, wPct: 9.05,  hPct: 25.06, z: 3 },
    /* JSON idx 4: "Glod Glitter Balloons" - LEFT, tall */
    { id: "04-balloons-l", src: "static/canva-005.webp", name: "Glitter Balloons (left)",
      xPct: 46.04, yPct: 38.61, wPct: 3.23,  hPct: 35.10, z: 8 },
    /* JSON idx 5: "Glod Glitter Balloons" - RIGHT, tall */
    { id: "05-balloons-r", src: "static/canva-006.webp", name: "Glitter Balloons (right)",
      xPct: 55.59, yPct: 44.31, wPct: 3.23,  hPct: 35.10, z: 9 },
    /* JSON idx 6: small bottom-center decorative */
    { id: "06-deco-1",  src: "static/canva-007.png", name: "Gold Decoration",
      xPct: 52.47, yPct: 58.08, wPct: 3.12,  hPct: 17.52, z: 6 },
    /* JSON idx 7: tiny bottom-center cluster */
    { id: "07-deco-2",  src: "static/canva-008.png", name: "Gold Star Cluster",
      xPct: 49.07, yPct: 57.75, wPct: 2.45,  hPct: 12.18, z: 7 }
  ];

  /* ---------------- Tutorial steps (generated from draggables) ---------------- */
  /* 9 steps total: one per draggable asset + title + save. Each drop validates
   * the current step's bucket, then advances to the next bucket. */
  var STEPS = [];
  /* Two generic Add Image steps for steps 10 and 11 (id "image-1", "image-2").
   * Cherry-picked onto master as an isolated change; bg step and other
   * unrelated WIP from the feature branch are intentionally not landed here
   * to keep the canonical deployment stable. The user clicks the Add Image
   * button themselves (one step, one explicit user action); the file picker
   * opens in free-mode so any of the available photos can be added. */
  STEPS.push({
    id: "image-1",
    kind: "image",
    selector: "[data-canva-act='addimage']",
    tip: "Click 🖼 Add Image and pick a photo to drop onto your gift!"
  });
  STEPS.push({
    id: "image-2",
    kind: "image",
    selector: "[data-canva-act='addimage']",
    tip: "Add one more photo to your gift — pick any friend you like!"
  });
  DRAGGABLE_ASSETS.forEach(function (a, i) {
    STEPS.push({
      id: "place-" + a.id,
      kind: "place",
      assetIdx: i,
      selector: ".canva-tray-item",
      tip: "Drag the " + escapeHTML(a.name) + " onto your gift card!"
    });
  });
  STEPS.push({
    id: "title",
    kind: "title",
    selector: ".canva-stage-element.text",
    tip: "Double-click the title to edit it - put anything you want!"
  });
  STEPS.push({
    id: "ai",
    kind: "ai",
    selector: "[data-canva-act='ai']",
    tip: "Tap ✨ Canva AI to auto-polish your gift - it'll handle the rest!"
  });
  STEPS.push({
    id: "save",
    kind: "save",
    selector: "[data-canva-act='save']",
    tip: "Click the 💾 Save & Finish button when your gift looks perfect!"
  });  /* ---------------- Editor CSS ---------------- */
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
      ".canva-stage-element.image { line-height: 0; }",
      ".canva-stage-element.image img { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; user-select: none; }",
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
      /* Drag ghost */
      ".canva-ghost { position: fixed; pointer-events: none; z-index: 10000; opacity: 0.85; filter: drop-shadow(0 8px 24px rgba(0,0,0,.35)); transform: translate(-50%, -50%); transition: none; }",
      ".canva-ghost img { display: block; max-width: 120px; max-height: 120px; object-fit: contain; }",

      /* Snap animation */
      ".canva-stage-element.snapping { transition: left 0.35s cubic-bezier(.34,1.56,.64,1), top 0.35s cubic-bezier(.34,1.56,.64,1); }",

      /* Placed badge */
      ".canva-placed-badge { position: absolute; pointer-events: none; z-index: 80; font-size: 13px; font-weight: 700; color: #7d2ae8; background: #fff; padding: 4px 12px; border-radius: 20px; box-shadow: 0 4px 16px rgba(125,42,232,.3); animation: badgePop 0.8s ease-out forwards; }",
      "@keyframes badgePop { 0% { opacity:0; transform: scale(.5) translateY(6px); } 30% { opacity:1; transform: scale(1.15) translateY(-4px); } 60% { transform: scale(1) translateY(-8px); } 100% { opacity:0; transform: scale(.9) translateY(-20px); } }",

      /* Asset tray */
      ".canva-tray { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px 8px; width: 100%; }",
      ".canva-tray-counter { font-size: 10px; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: .08em; }",
      ".canva-tray-item { width: 56px; height: 56px; border-radius: 12px; background: #fafafa; border: 2px dashed #d0d0d0; display: grid; place-items: center; cursor: grab; transition: all .2s ease; user-select: none; overflow: hidden; }",
      ".canva-tray-item:hover { border-color: #7d2ae8; transform: scale(1.08); box-shadow: 0 6px 20px rgba(125,42,232,.25); }",
      ".canva-tray-item:active { cursor: grabbing; transform: scale(.95); }",
      ".canva-tray-item.pulse { animation: trayPulse 1.2s ease-in-out infinite; border-color: #7d2ae8; }",
      "@keyframes trayPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(125,42,232,.4); } 50% { box-shadow: 0 0 0 10px rgba(125,42,232,0); } }",
      ".canva-tray-item img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }",
      ".canva-tray-label { font-size: 10px; color: #555; text-align: center; max-width: 70px; line-height: 1.3; font-weight: 600; }",
      ".canva-tray-done { font-size: 13px; color: #15803d; font-weight: 800; padding: 8px; text-align: center; }",
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
      '    <span class="step-num" id="canvaStepNum">1 / 9</span>',
      '    <span class="step-tip" id="canvaStepTip">Drag the first gold element onto your gift!</span>',
      '  </div>',
      '  <div class="canva-main">',
      '        <div class="canva-sidebar">',
      '      <div class="canva-tray" id="canvaTray"></div>',
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
      '          <div class="canva-swatch selected" data-bg="#0a0a0f" style="background:#0a0a0f"></div>',
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
      '</div>',
      '      <div class="canva-section">',
        '<h4>Polish</h4>',
        '<span class="canva-pill primary" data-canva-act="ai">✨ Canva AI</span>',
      '</div>',
      '      <div class="canva-section">',
        '<h4>Finish</h4>',
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
    state = { bg: "#0a0a0f", bgChosen: false, elements: [], step: 0, completed: false, placed: [], aiDone: false, aiBusy: false };
    zCounter = 10;
    setupInteractions(contentEl);

    /* Apply confetti wallpaper background BEFORE the first step so the
     * coach-mark spotlight can see everything inside the canva-page. */

    /* Populate the tray FIRST so the coach mark spotlight can find the
     * .canva-tray-item target on the very first frame. */
    renderTray(contentEl);
    showStep(contentEl, 0);

    if (window.AppCommon && typeof window.AppCommon.emit === "function") {
      window.AppCommon.emit("walkthrough:browser-opened", { url: "canva.com" });
    }
  }

  /* ---------------- Asset Tray & Drag System ---------------- */

  /* Render the sidebar tray: show the asset for the current step. */
  function renderTray(root) {
    var tray = root.querySelector("#canvaTray");
    if (!tray) return;
    tray.innerHTML = "";
    if (state.completed) {
      tray.innerHTML = '<div class="canva-tray-done">🎉 Done!</div>';
      return;
    }
    var step = STEPS[state.step];
    if (!step) return;
    if (step.kind !== "place") {
      /* Title / save step - nothing in tray */
      tray.innerHTML = '<div class="canva-tray-done">✅ Step done<br><span style="font-size:10px;color:#888">continue below</span></div>';
      return;
    }
    /* Show the asset to drag (1 of 7 -> placed-count + 1) */
    var i = step.assetIdx;
    var a = DRAGGABLE_ASSETS[i];
    var placedCount = state.placed.length;
    tray.innerHTML =
      '<div class="canva-tray-counter">Item ' + (placedCount + 1) + ' of ' + DRAGGABLE_ASSETS.length + '</div>' +
      '<div class="canva-tray-item pulse" data-canva-drag="' + i + '">' +
        '<img src="' + a.src + '" alt="' + escapeHTML(a.name) + '" draggable="false" />' +
      '</div>' +
      '<div class="canva-tray-label">' + escapeHTML(a.name) + '</div>';

    var item = tray.querySelector(".canva-tray-item");
    if (item) {
      item.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        startTrayDrag(root, a, e);
      });
    }
  }

  var dragGhost = null;
  var dragAsset = null;
  var dragRoot = null;

  function startTrayDrag(root, asset, e) {
    dragRoot = root;
    dragAsset = asset;
    var ghost = document.createElement("div");
    ghost.className = "canva-ghost";
    ghost.innerHTML = '<img src="' + asset.src + '" alt="" draggable="false" />';
    ghost.style.left = e.clientX + "px";
    ghost.style.top  = e.clientY + "px";
    document.body.appendChild(ghost);
    dragGhost = ghost;
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragUp);
    document.addEventListener("pointercancel", onDragUp);
  }

  function onDragMove(e) {
    if (!dragGhost) return;
    dragGhost.style.left = e.clientX + "px";
    dragGhost.style.top  = e.clientY + "px";
  }

  function onDragUp(e) {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragUp);
    document.removeEventListener("pointercancel", onDragUp);
    if (!dragGhost || !dragAsset || !dragRoot) return;
    var pageEl = dragRoot.querySelector("#canvaPage");
    if (!pageEl) { cleanupDrag(); return; }
    var pageRect = pageEl.getBoundingClientRect();
    var inside = e.clientX >= pageRect.left && e.clientX <= pageRect.right &&
                 e.clientY >= pageRect.top  && e.clientY <= pageRect.bottom;
    if (inside) {
      dropAndSnapToStage(dragRoot, dragAsset, e.clientX, e.clientY, pageRect);
    }
    cleanupDrag();
  }

  function cleanupDrag() {
    if (dragGhost) { dragGhost.remove(); dragGhost = null; }
    dragAsset = null;
    dragRoot = null;
  }

  function dropAndSnapToStage(root, asset, cx, cy, pageRect) {
    var pageEl = root.querySelector("#canvaPage");
    if (!pageEl) return;
    var dropX = ((cx - pageRect.left) / pageRect.width) * 100;
    var dropY = ((cy - pageRect.top)  / pageRect.height) * 100;

    var el = document.createElement("div");
    el.className = "canva-stage-element image";
    el.id = uid();
    el.dataset.type = "image";
    el.dataset.assetId = asset.id;
    el.style.left   = dropX + "%";
    el.style.top    = dropY + "%";
    el.style.width  = asset.wPct + "%";
    el.style.height = asset.hPct + "%";
    el.style.zIndex = String(asset.z);

    var img = document.createElement("img");
    img.src = asset.src;
    img.alt = asset.name;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.display = "block";
    img.draggable = false;
    el.appendChild(img);
    pageEl.appendChild(el);
    hideEmpty(pageEl);

    var data = { id: el.id, type: "image", asset: asset, x: dropX, y: dropY, w: asset.wPct, h: asset.hPct, moved: false };
    state.elements.push(data);
    el.addEventListener("click", function (ev) { ev.stopPropagation(); selectElement(root, data); });
    makeDraggable(root, el, data);

    /* Force layout, then snap to JSON target position. */
    el.offsetHeight;
    el.classList.add("snapping");
    el.style.left = asset.xPct + "%";
    el.style.top  = asset.yPct + "%";
    el.style.width  = asset.wPct + "%";
    el.style.height = asset.hPct + "%";
    data.x = asset.xPct;
    data.y = asset.yPct;
    data.w = asset.wPct;
    data.h = asset.hPct;
    data.moved = true;

    showPlacedBadge(root, el);

    /* Mark this asset as placed for the current step's bucket. */
    var step = STEPS[state.step];
    var assetIdx = step ? step.assetIdx : -1;
    if (assetIdx >= 0 && state.placed.indexOf(assetIdx) < 0) {
      state.placed.push(assetIdx);
    }

    var handler = function () {
      el.removeEventListener("transitionend", handler);
      finishAssetPlacement(root);
    };
    el.addEventListener("transitionend", handler);
  }

  function showPlacedBadge(root, el) {
    var badge = document.createElement("div");
    badge.className = "canva-placed-badge";
    badge.textContent = "✨ Placed!";
    var pageEl = root.querySelector("#canvaPage");
    var elRect = el.getBoundingClientRect();
    var pageRect = pageEl.getBoundingClientRect();
    badge.style.left = (elRect.left - pageRect.left + elRect.width / 2) + "px";
    badge.style.top  = (elRect.top  - pageRect.top  - 10) + "px";
    badge.style.transform = "translate(-50%, -100%)";
    pageEl.appendChild(badge);
    setTimeout(function () { badge.remove(); }, 850);
  }

  function finishAssetPlacement(root) {
    var step = STEPS[state.step];
    if (!step) return;
    if (step.kind === "place") {
      if (!state.completed && state.step < STEPS.length - 1 && validateStep(step.id)) {
        /* Last-place index = STEPS.length - 3 (e.g. 6 when total=9) -> next step is 'title'.
           (Removed the silent auto-prefill that injected "Happy Birthday Stray! 🎂"
           into the title slot. Now the user lands on the title step with no text
           element and must opt in via the toolbar "+ Add Text" button or by
           double-clicking into the canvas — no preset title is forced.) */
        var wasLastPlace = (state.step === STEPS.length - 3);
        advanceStep(root);
      }
    }
    /* renderTray is now called inside showStep(), so no need here. */
  }

  /* ---------------- ✨ Canva AI ---------------- */
  /* The new tutorial step before "save" — runs a fake-AI progress overlay
   * over the canva page, then reveals static/final.png as the AI-polished
   * result and advances to the save step. The reveal layer is positioned
   * under the user's elements so the existing layout stays interactive while
   * the polished version is shown. */
  function runCanvaAI(root, btn) {
    if (state.aiBusy || state.aiDone) return;
    state.aiBusy = true;
    if (btn) { btn.classList.add("busy"); btn.style.pointerEvents = "none"; }

    var pageEl = root.querySelector("#canvaPage");

    var overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;background:rgba(15,12,28,.86);display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;gap:14px;" +
      "z-index:9999;color:#fff;font-family:-apple-system,'Segoe UI',sans-serif;" +
      "border-radius:6px;padding:24px;text-align:center;";
    overlay.innerHTML = [
      '<div style="font-size:18px;font-weight:700;letter-spacing:-.01em;">✨ Canva AI is polishing…</div>',
      '<div style="width:240px;height:8px;background:rgba(255,255,255,.18);border-radius:99px;overflow:hidden;">',
      '  <div id="canvaAiFill" style="height:100%;width:0;background:linear-gradient(90deg,#7d2ae8,#eb459e);transition:width .25s linear;"></div>',
      '</div>',
      '<div id="canvaAiStatus" style="font-size:13px;opacity:.85;min-height:18px;">Thinking…</div>',
      '<div style="font-size:11px;opacity:.55;margin-top:6px;">✨ this doesn’t look good — Canva AI to the rescue!</div>'
    ].join("");
    pageEl.appendChild(overlay);

    /* Reveal layer — static/final.png as the AI-polished final design. */
    var reveal = document.createElement("div");
    reveal.style.cssText =
      "position:absolute;inset:8px;background:url('static/final.png') center/contain no-repeat #0a0a0f;" +
      "opacity:0;transition:opacity 1s ease;pointer-events:none;border-radius:4px;" +
      "box-shadow:0 18px 48px rgba(0,0,0,.45);";
    pageEl.appendChild(reveal);

    var fillEl   = overlay.querySelector("#canvaAiFill");
    var statusEl = overlay.querySelector("#canvaAiStatus");
    var thoughts = [
      "Analyzing layout…",
      "Rebalancing composition…",
      "Polishing colors & typography…",
      "Adding finishing touches…",
      "Beautifying your gift…",
      "✨ One last sparkle…"
    ];
    var pct = 0, i = 0, totalMs = 0;

    function tick() {
      totalMs += 110;
      pct = Math.min(100, Math.round((totalMs / 2400) * 100));
      fillEl.style.width = pct + "%";
      if (i < thoughts.length && pct >= ((i + 1) * (100 / thoughts.length) | 0)) {
        statusEl.textContent = thoughts[i++];
      }
      if (pct < 100) {
        setTimeout(tick, 110);
      } else {
        statusEl.textContent = "✨ Done — revealing final design";
        requestAnimationFrame(function () { reveal.style.opacity = "1"; });
        setTimeout(function () {
          overlay.remove();
          state.aiBusy = false;
          state.aiDone = true;
          if (btn) { btn.classList.remove("busy"); btn.style.pointerEvents = ""; }
          advanceStep(root);
        }, 950);
      }
    }
    setTimeout(tick, 120);
  }

/* ---------------- Wiring ---------------- */
  function setupInteractions(root) {
    var pageEl = root.querySelector("#canvaPage");

    /* Background swatches */
    root.querySelectorAll("#canvaBgGrid .canva-swatch").forEach(function (sw) {
      sw.addEventListener("click", function (e) {
        e.stopPropagation();
        state.bg = sw.dataset.bg;
        state.bgChosen = true;
        /* Only change background-color — keep the wallpaper background-image intact */
        pageEl.style.backgroundColor = state.bg;
        root.querySelectorAll("#canvaBgGrid .canva-swatch").forEach(function (s) { s.classList.remove("selected"); });
        sw.classList.add("selected");
        /* Background changes are visual-only — no step advancement needed */
      });
    });

    /* Add Text */
    var addTextBtn = root.querySelector('[data-canva-act="addtext"]');
    if (addTextBtn) addTextBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      addTextElement(root, "Happy Birthday, Stray! ✨");
      if (STEPS[state.step].id === "title") advanceStep(root);
    });

    /* Add Image */
    var addImgBtn = root.querySelector('[data-canva-act="addimage"]');
    if (addImgBtn) addImgBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      openPicker(root);
    });

    /* ✨ Canva AI polish (inserted before Save step) */
    var aiBtn = root.querySelector('[data-canva-act="ai"]');
    if (aiBtn) aiBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (state.aiBusy || state.aiDone) return;
      runCanvaAI(root, aiBtn);
    });

    /* Save - gated on aiDone: if the user hits Save before the AI polish has
     * run (whether because the polish UI was off-screen, the preview was stale,
     * or any other skip path), route the click through the polish first so the
     * AI step can never be silently bypassed. */
    var saveBtn = root.querySelector('[data-canva-act="save"]');
    if (saveBtn) saveBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!state.aiDone) {
        runCanvaAI(root, saveBtn);
        return;
      }
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
    el.style.left = "50%";
    el.style.top  = "8%";
    el.style.transform = "translateX(-50%)";
    el.style.fontSize = "28px";
    el.style.color = "#ffd700";
    el.style.textShadow = "0 2px 8px rgba(0,0,0,.7), 0 0 2px rgba(0,0,0,.9)";
    el.style.zIndex = String(++zCounter);
    pageEl.appendChild(el);
    hideEmpty(pageEl);

    var data = { id: el.id, type: "text", text: text, x: 50, y: 8, fontSize: 28, color: "#ffd700", moved: false };
    state.elements.push(data);

    el.addEventListener("input", function () { data.text = el.textContent; });
    el.addEventListener("dblclick", function (e) {
      e.stopPropagation();
      el.contentEditable = "true";
      el.focus();
      selectAllText(el);
    });
    el.addEventListener("blur", function () {
      el.contentEditable = "false";
      /* Advance from title step to save step when user finishes editing */
      if (!state.completed && state.step < STEPS.length && STEPS[state.step].id === "title") {
        advanceStep(root);
      }
    });
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      selectElement(root, data);
    });
    makeDraggable(root, el, data);
    selectElement(root, data);
  }

  function addImageElement(root, asset) {
    var pageEl = root.querySelector("#canvaPage");
    var el = document.createElement("div");
    el.className = "canva-stage-element image";
    el.id = uid();
    el.dataset.type = "image";
    el.style.width  = (asset.wPct || 10) + "%";
    el.style.height = (asset.hPct || asset.wPct || 10) + "%";
    if (asset.src) {
      var imgHtml = '<img src="' + asset.src + '" alt="' + escapeHTML(asset.name) + '" style="width:100%;height:100%;object-fit:contain;display:block;" />';
      el.innerHTML = imgHtml;
    } else {
      el.classList.add("fallback");
      el.style.background = "linear-gradient(135deg, " + asset.color + ", #ec4899)";
      el.textContent = asset.emoji || "✨";
    }
    el.style.left = (asset.xPct || 50) + "%";
    el.style.top  = (asset.yPct || 50) + "%";
    el.style.zIndex = String(++zCounter);
    pageEl.appendChild(el);
    hideEmpty(pageEl);

    var data = { id: el.id, type: "image", asset: asset, x: asset.xPct || 50, y: asset.yPct || 50, moved: false };
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
        : "Image — " + (data.asset ? data.asset.name : "—");
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
      /* Bring to front while dragging */
      el.style.zIndex = String(++zCounter);

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
        /* No 'drag' step anymore — placed elements can be repositioned freely */
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
      '  <h3>Pick a gold element to add</h3>',
      '  <div class="picker-grid">'
    ];
    DRAGGABLE_ASSETS.forEach(function (a) {
      var avatarInner = a.src
        ? '<img src="' + a.src + '" alt="' + escapeHTML(a.name) + '" style="width:100%;height:100%;object-fit:cover;" />'
        : escapeHTML(a.emoji || "✨");
      var avatarStyle = a.src ? "" : ' style="background:linear-gradient(135deg,' + a.color + ',#ec4899)"';
      html.push(
        '<div class="picker-tile" data-asset-id="' + a.id + '">' +
          '<div class="picker-avatar"' + avatarStyle + '>' + avatarInner + '</div>' +
          '<div class="picker-name">' + escapeHTML(a.name) + '</div>' +
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
      var tile = e.target.closest("[data-asset-id]");
      if (tile) {
        var asset = DRAGGABLE_ASSETS.find(function (a) { return a.id === tile.dataset.assetId; });
        mask.remove();
        if (asset) {
          addImageElement(root, asset);
          /* Image added — visual only */
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
    /* Render tray AFTER state.step is updated so the asset for THIS step appears. */
    renderTray(root);
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
    /* "place-XXX-id" steps require that asset to be in state.placed[]. */
    if (id.indexOf("place-") === 0) {
      /* Find which DRAGGABLE_ASSETS slot is required for this step. */
      for (var s = 0; s < STEPS.length; s++) {
        if (STEPS[s].id === id) {
          return state.placed.indexOf(STEPS[s].assetIdx) >= 0;
        }
      }
      return false;
    }
    if (id === "title") return state.elements.some(function (e) { return e.type === "text"; });
    if (id === "ai")   return !!state.aiDone;
    if (id === "save")  return true;
    return false;
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

  function stepTitle() {
    var s = STEPS[state.step];
    if (!s) return "";
    if (s.kind === "place") return "Add gold element";
    if (s.kind === "title") return "Edit the title";
    if (s.kind === "ai")    return "Polish with Canva AI";
    if (s.kind === "save")  return "Save your gift";
    return "";
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
        var a = el.asset;
        if (!a || !a.src) return;
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
          var w = (el.w || a.wPct || 12) * (W / 100);
          var h = (el.h || a.wPct || 12) * (W / 100);
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
          var w = (el.w || a.wPct || 12) * (W / 100);
          var x = (el.x / 100) * W;
          var y = (el.y / 100) * H;
          cx.fillStyle = a.color || "#ccc";
          cx.fillRect(x, y, w, w);
          cx.fillStyle = "#fff";
          cx.font = "bold 28px sans-serif";
          cx.textAlign = "center";
          cx.textBaseline = "middle";
          cx.fillText(a.emoji || "✧", x + w / 2, y + w / 2);
          cx.textAlign = "start";
          pending--;
          if (pending <= 0) finish();
        };
        img.src = a.src;
      }

      /* Count image elements that need loading */
      for (var i = 0; i < elems.length; i++) {
        if (elems[i].type === "image" && elems[i].asset && elems[i].asset.src) pending++;
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