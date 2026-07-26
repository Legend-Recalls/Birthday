# 🎂 For Stray — Interactive Birthday Surprise

A single-page, client-side interactive birthday experience — a fake MacBook desktop with a scripted Discord conversation, a mock Chrome browser, and a guided Canva gift editor. No backend, no API, no framework — just pure HTML/CSS/JS in a single-file app broken into modular `apps/`.

Built as an interactive story where **you (Stray)** get pulled into your own birthday surprise by your friends.

---

## ✨ What happens

1. **Start** — a glass-morphism card invites you to go fullscreen
2. **Birthday notification** — a Discord notification from Hanaria pops up
3. **Discord** — open the Discord app and read the `#rule` channel
4. **Sofia panics** — she spams `HELP` in DMs; start a **scripted conversation**
5. **The pivot** — Sofia confesses everyone forgot your gift and asks **you** to make one yourself
6. **Chrome** — open the browser, navigate to `canva.com`
7. **Canva editor** — a guided 5-step tutorial walks you through making your own birthday gift:
   - Pick a background color
   - Add a title (double-click to edit)
   - Add friend photos (Hanaria, Sofia, Lells, Mia)
   - Drag everything into place
   - Save & finish
8. **Sofia reacts** — she sees the gift and sends a tearful DM

---

## 🚀 How to run

### Open locally

Just open `emulator.html?start=1` in any modern browser:

```bash
open emulator.html?start=1   # macOS
xdg-open emulator.html?start=1  # Linux
start emulator.html?start=1    # Windows
```

### Via HTTP server (for smooth asset loading)

```bash
python3 -m http.server 3000 --bind 0.0.0.0
# then visit http://localhost:3000/emulator.html?start=1
```

### Production build

```bash
./build.sh
# Emits everything into ./dist/
```

---

## 📁 Project structure

```
/
├── start.html             # Fullscreen launchpad
├── emulator.html          # Desktop shell (DOM + CSS only, ~44 KB)
├── apps/
│   ├── common.js          # escapeHTML, showToast, event bus
│   ├── discord.js         # Discord window data + templates + setup
│   ├── discord-panic.js   # Sofia's HELP spam module
│   ├── sofia.js           # Scripted DM conversation (16-line script)
│   ├── browser.js         # URL-to-page registry for Chrome
│   ├── browser-step.js    # Browser step orchestrator (dormant)
│   ├── pages/
│   │   └── canva.js       # Guided interactive Canva gift editor (668 lines)
│   ├── chrome.js          # Chrome window with tabs, bookmarks, navigation
│   └── bootstrap.js       # Host shell: window manager, dock, walkthrough orchestrator
├── static/
│   ├── discord-icon.png
│   ├── hanaria.webp
│   ├── lells.webp
│   ├── sofia.webp
│   └── stray.webp
├── build.sh               # Production build script
└── README.md
```

---

## 🧠 How the walkthrough works

`apps/bootstrap.js` contains a step machine (`STEPS` object). Each step is triggered by a custom event on `AppCommon` bus:

| Event | Triggers | What happens |
|---|---|---|
| *(boot)* | — | Birthday notification appears after 1.2 s |
| `walkthrough:rule-read` | User reads `#rule` channel | 4.5 s delay → Sofia HELP panic starts |
| `walkthrough:discord-complete` | Sofia's scripted convo ends | Toast + 10 s hint to open Chrome |
| *(user opens Chrome)* | — | Hint dismissed, Chrome opens |
| *(user types canva.com)* | URL matcher | AppBrowser routes to `apps/pages/canva.js` |
| `walkthrough:gift-complete` | User clicks Save in Canva | Sofia reaction message pushed + hint to return to Discord |

---

## 🎨 Canva editor features

- **5-step tutorial** with spotlight + coach-mark cards (glowing pointer + instruction box)
- **Background** — 12 color swatches (click to apply)
- **Text** — "Add Text" places a title; double-click to edit inline
- **Images** — pick from 4 friend avatars in a modal; drops onto canvas
- **Drag** — pointer-based drag with percentage-position clamping (0–100%)
- **Properties panel** — bg swatches, add text/image, selected info, delete, save
- **Coach marks** — auto-position relative to target; pulse animation; reposition on resize

---

## 🐛 Sofia script re-open fix

If you close and re-open Discord after the scripted conversation completes, the script **does not replay** — `scriptDone` is latched and the input routes directly to free typing on Enter. (Exposed as `AppSofia.isScriptDone()`.)

---

## 📦 No dependencies

- Zero npm packages
- Zero build tools
- Zero external requests (all assets are local `.webp` files)
- Runs in any modern browser (Chrome, Firefox, Safari, Edge)

---

## 🧱 Making it a full game

The architecture is designed for expansion:
- Add new pages by calling `AppBrowser.register(matchFn, renderFn)` in a new file under `apps/pages/`
- Add walkthrough steps by adding entries to the `STEPS` object in `apps/bootstrap.js`
- Add new desktop apps by writing a module matching the `chrome.js` / `discord.js` pattern and wiring it into `openApp()`
