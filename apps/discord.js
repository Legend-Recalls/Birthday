/* apps/discord.js — Discord app (data + templates + setup + panic helpers).
 * Self-contained. Window-mgmt helpers (focusWindow, makeDraggable, setupWindowControls,
 * trafficLightsHTML) are expected to be globals provided by emulator.html's bootstrap.
 */
window.AppDiscord = (function () {
  var escapeHTML = window.AppCommon.escapeHTML;
  var initials = window.AppCommon.initials;
  var showToast = window.AppCommon.showToast;

  /* ---------------- Discord SVG ---------------- */
  function DISCORD_SVG(size) {
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>' +
      "</svg>"
    );
  }

  /* ---------------- Data ---------------- */
  var discordHome = {
    id: "home",
    name: "Direct Messages",
    color: "#5865f2",
    channels: [
      {
        category: "Direct Messages",
        items: [
          { id: "sofia",         name: "Sofia",            type: "text", topic: "Direct message", avEmoji: "🟣",  avImg: "static/sofia.webp",  color: "#9b59b6", status: "online"  },
          { id: "straygrandma",  name: "STRAY'S GRANDMA",  type: "text", topic: "",                avEmoji: "👵",                           color: "#5b6b7a", status: "offline", sub: "9 Members" },
          { id: "attention",     name: "Attention whore",  type: "text", topic: "",                avEmoji: "⚽",                           color: "#27ae60", status: "dnd",     sub: "I luv all the time" },
          { id: "halalgc",       name: "Halal gc",         type: "text", topic: "",                avEmoji: "🕌",                           color: "#e67e22", status: "offline", sub: "7 Members" },
          { id: "hanaria",       name: "Hanaria",          type: "text", topic: "",                avEmoji: "🌸",  avImg: "static/hanaria.webp", color: "#f23f42", status: "online"  },
          { id: "lells",         name: "Lells",            type: "text", topic: "",                avEmoji: "🐱",  avImg: "static/lells.webp",   color: "#23a55a", status: "online"  },
          { id: "mia",           name: "Mia",              type: "text", topic: "",                avEmoji: "✨",                            color: "#f0b232", status: "offline" }
        ]
      }
    ]
  };

  var discordServers = [
    {
      id: "s1", name: "Taskforce", color: "#5865f2",
      channels: [
        { category: "Lounge",    items: [ { id: "general", name: "general", type: "text", topic: "General chat — UI only" } ] },
        { category: "Important", items: [ { id: "rule",    name: "rule",    type: "text", topic: "Important rule channel — UI only" } ] }
      ]
    },
    {
      id: "s2", name: "Game Night", color: "#eb459e",
      channels: [
        { category: "Information",   items: [ { id: "announcements", name: "announcements", type: "text", topic: "Read-only UI" } ] },
        { category: "Text Channels", items: [
          { id: "lobby", name: "lobby", type: "text", topic: "Find players — UI only" },
          { id: "clips", name: "clips", type: "text", topic: "No media loaded" }
        ] },
        { category: "Voice Channels", items: [ { id: "game-room", name: "Game Room", type: "voice", topic: "" } ] }
      ]
    }
  ];

  var discordMessageData = {
    rule: [
      { author: "Hanaria", color: "#f23f42", avEmoji: "H", time: "Today at 12:00 AM",
        text: "HAPPY BIRTHDAY STRAY! WE ARE SO SORRY WE FORGOT TO GIVE U A GIFT.",
        avImg: "static/hanaria.webp" }
    ],
    general: [
      { author: "Ava",  color: "#f23f42", avEmoji: "A", time: "Today at 10:14 AM", text: "This channel is static local content." },
      { author: "Noah", color: "#23a55a", avEmoji: "N", time: "Today at 10:15 AM", text: "No messages are sent to a server." }
    ],
    hanaria: [
      { author: "Hanaria", color: "#f23f42", avEmoji: "🌸", time: "7:30 PM", text: "stray ur so annoying omg" },
      { author: "Stray",    color: "#5865f2", avEmoji: "😈", time: "7:31 PM", text: "love u too" },
      { author: "Hanaria", color: "#f23f42", avEmoji: "🌸", time: "7:31 PM", text: "stfu 💀" },
      { author: "Hanaria", color: "#f23f42", avEmoji: "🌸", time: "7:32 PM", text: "anyway wya tmrw" },
      { author: "Stray",    color: "#5865f2", avEmoji: "😈", time: "7:33 PM", text: "idk prolly sleeping" },
      { author: "Hanaria", color: "#f23f42", avEmoji: "🌸", time: "7:33 PM", text: "bro has no life 💀" }
    ],
    lells: [
      { author: "Lells", color: "#23a55a", avEmoji: "🐱", time: "6:15 PM", text: "YO STRAY" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "6:15 PM", text: "what" },
      { author: "Lells", color: "#23a55a", avEmoji: "🐱", time: "6:16 PM", text: "nothing just wanted to see if ur alive" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "6:16 PM", text: "barely" },
      { author: "Lells", color: "#23a55a", avEmoji: "🐱", time: "6:17 PM", text: "mood" },
      { author: "Lells", color: "#23a55a", avEmoji: "🐱", time: "6:17 PM", text: "also im bored entertain me" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "6:18 PM", text: "google exists" },
      { author: "Lells", color: "#23a55a", avEmoji: "🐱", time: "6:18 PM", text: "google cant roast people like u do" }
    ],
    mia: [
      { author: "Mia",  color: "#f0b232", avEmoji: "✨", time: "5:45 PM", text: "stray have u eaten today" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "5:46 PM", text: "define eaten" },
      { author: "Mia",  color: "#f0b232", avEmoji: "✨", time: "5:46 PM", text: "food. in ur mouth. chewed. swallowed." },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "5:47 PM", text: "then no" },
      { author: "Mia",  color: "#f0b232", avEmoji: "✨", time: "5:47 PM", text: "OMG" },
      { author: "Mia",  color: "#f0b232", avEmoji: "✨", time: "5:48 PM", text: "im literally coming over to make u food rn" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "5:48 PM", text: "ur the best" },
      { author: "Mia",  color: "#f0b232", avEmoji: "✨", time: "5:49 PM", text: "i know 😌" }
    ],
    sofia: [], /* scripted dialogue module pushes into this array */
    straygrandma: [
      { author: "Grandma", color: "#5b6b7a", avEmoji: "👵", time: "3:00 PM", text: "how do i change the font on this thing" },
      { author: "Stray",   color: "#5865f2", avEmoji: "😈", time: "3:05 PM", text: "grandma what font" },
      { author: "Grandma", color: "#5b6b7a", avEmoji: "👵", time: "3:06 PM", text: "the one thats too small my eyes hurt" },
      { author: "Stray",   color: "#5865f2", avEmoji: "😈", time: "3:07 PM", text: "go to settings > accessibility" },
      { author: "Grandma", color: "#5b6b7a", avEmoji: "👵", time: "3:15 PM", text: "i cant find it" },
      { author: "Grandma", color: "#5b6b7a", avEmoji: "👵", time: "3:16 PM", text: "wait nvm i was on the wrong device" }
    ],
    attention: [
      { author: "Stray",     color: "#27ae60", avEmoji: "😈", time: "4:20 PM", text: "bro why r u always online" },
      { author: "Attention", color: "#27ae60", avEmoji: "⚽", time: "4:20 PM", text: "someone has to keep this server alive" },
      { author: "Stray",     color: "#5865f2", avEmoji: "😈", time: "4:21 PM", text: "ur literally the only one here" },
      { author: "Attention", color: "#27ae60", avEmoji: "⚽", time: "4:21 PM", text: "exactly. someone has to." },
      { author: "Attention", color: "#27ae60", avEmoji: "⚽", time: "4:22 PM", text: "also did u see my new profile pic" },
      { author: "Stray",     color: "#5865f2", avEmoji: "😈", time: "4:22 PM", text: "yes its terrible" },
      { author: "Attention", color: "#27ae60", avEmoji: "⚽", time: "4:23 PM", text: "u take that back" }
    ],
    halalgc: [
      { author: "Ali",   color: "#e67e22", avEmoji: "🕌", time: "2:30 PM", text: "who wants biryani" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "2:30 PM", text: "ME" },
      { author: "Omar",  color: "#34495e", avEmoji: "🧑", time: "2:31 PM", text: "ME TOO" },
      { author: "Ali",   color: "#e67e22", avEmoji: "🕌", time: "2:31 PM", text: "ok who has a car" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "2:32 PM", text: "not me" },
      { author: "Omar",  color: "#34495e", avEmoji: "🧑", time: "2:32 PM", text: "not me either" },
      { author: "Ali",   color: "#e67e22", avEmoji: "🕌", time: "2:33 PM", text: "so whos getting the biryani" },
      { author: "Stray", color: "#5865f2", avEmoji: "😈", time: "2:33 PM", text: "we walk" },
      { author: "Ali",   color: "#e67e22", avEmoji: "🕌", time: "2:34 PM", text: "its 3 km away 💀" },
      { author: "Omar",  color: "#34495e", avEmoji: "🧑", time: "2:34 PM", text: "worth it for biryani" }
    ]
  };

  var discordMembers = {
    online: [
      { name: "Hanaria", color: "#f23f42", dot: "#23a55a", avatar: "static/hanaria.webp" },
      { name: "Lells",   color: "#23a55a", dot: "#23a55a", avatar: "static/lells.webp" },
      { name: "Mia",     color: "#f0b232", dot: "#f0b232" }
    ],
    offline: [
      { name: "✧ Sofia ✧", color: "#80848e", dot: "#80848e", avatar: "static/sofia.webp" }
    ]
  };

  /* ---------------- Templates ---------------- */
  function discordDefaultMessages(ch) {
    return [{
      author: "UI Bot", color: "#5865f2", time: "Today at 9:00 AM",
      text: "This is #" + ch.name + ". It is static local content only."
    }];
  }

  function messageHTML(m, showHeader) {
    if (showHeader === false) {
      return '<div class="message msg-cont"><div class="msg-body"><div class="text">' + escapeHTML(m.text) + "</div></div></div>";
    }
    var av = m.avImg
      ? '<img src="' + m.avImg + '" class="av-img" alt="">'
      : escapeHTML(m.avEmoji || initials(m.author));
    var st = m.avImg ? "" : "background:" + (m.color || "#5865f2");
    var badge = m.badge ? '<span class="author-badge">' + escapeHTML(m.badge) + "</span>" : "";
    return (
      '<div class="message">' +
        '<div class="avatar msg-av" style="' + st + '">' + av + "</div>" +
        '<div class="msg-body">' +
          '<div class="meta">' +
            '<span class="author">' + escapeHTML(m.author) + "</span>" + badge +
            '<span class="time">' + escapeHTML(m.time || "") + "</span>" +
          "</div>" +
          '<div class="text">' + escapeHTML(m.text) + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function voiceHTML(ch) {
    return (
      '<div class="voice-placeholder">' +
        '<div class="voice-icon">🔊</div>' +
        "<h3>" + escapeHTML(ch.name) + "</h3>" +
        "<p>No voice connection or server is implemented. This is only a channel UI.</p>" +
        '<button class="voice-join">Join Voice (UI only)</button>' +
      "</div>"
    );
  }

  function memberHTML(m) {
    var avatarContent = m.avatar
      ? '<img src="' + m.avatar + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover" alt="' + escapeHTML(m.name) + '" />'
      : initials(m.name);
    return (
      '<div class="member">' +
        '<div class="avatar small" style="background:' + m.color + '">' + avatarContent + "</div>" +
        '<div class="member-name">' + escapeHTML(m.name) + "</div>" +
        '<span class="status-dot" style="background:' + m.dot + '"></span>' +
      "</div>"
    );
  }

  function discordWindowHTML(birthdayUnread) {
    return [
      '<div id="discord-window" class="window discord-window" data-app="discord"',
      '  style="left:16%; top:8%; width:min(960px, 92%); height:min(580px, 84%);">',
        window.trafficLightsHTML ? window.trafficLightsHTML() : '<div class="traffic-lights"><button class="tl-close"></button><button class="tl-min"></button><button class="tl-max"></button></div>',
      '  <div class="discord-titlebar draggable" id="discordTitlebar">',
      '    <span class="tb-left"></span>',
      '    <span class="tb-center" id="discordTitleText"></span>',
      '    <span class="tb-right">',
      '      <button class="tb-icon" data-tb="inbox" title="Inbox">🗗</button>',
      '      <button class="tb-icon" data-tb="help" title="Help">?</button>',
      '    </span>',
      '  </div>',
      '  <div class="discord-body">',
      '    <div class="server-rail" id="discordServers"></div>',
      '    <div class="channel-sidebar">',
      '      <div class="server-name draggable" id="discordServerName" style="display:none">Server</div>',
      '      <div class="discord-home-top" id="discordHomeTop" style="display:none">',
      '        <div class="sidebar-search">Find or start a conversation</div>',
      '        <button class="nav-row" data-nav="Friends"><span class="nav-ico">👋</span><span class="nav-label">Friends</span><span class="nav-badge">1</span></button>',
      '        <button class="nav-row" data-nav="Nitro"><span class="nav-ico nitro">✦</span><span class="nav-label">Nitro</span><span class="nav-pill">OFFER</span></button>',
      '        <button class="nav-row" data-nav="Shop"><span class="nav-ico">🛍️</span><span class="nav-label">Shop</span><span class="nav-pill">NEW</span></button>',
      '        <button class="nav-row" data-nav="Quests"><span class="nav-ico">🎟️</span><span class="nav-label">Quests</span></button>',
      '      </div>',
      '      <div class="channels" id="discordChannels"></div>',
      '      <div class="user-panel">',
      '        <img class="avatar up-av" src="static/stray.webp" alt="Stray" />',
      '        <div class="user-meta"><div class="name">Stray</div><div class="status" id="discordUserStatus">Online</div></div>',
      '        <button class="user-btn" id="discordMute" title="Mute">🎙️</button>',
      '        <button class="user-btn" id="discordDeafen" title="Deafen">🎧</button>',
      '        <button class="user-btn" id="discordSettings" title="Settings">⚙️</button>',
      '      </div>',
      '    </div>',
      '    <div class="chat-main">',
      '      <div class="chat-header draggable" id="discordHeader"></div>',
      '      <div class="messages" id="discordMessages"></div>',
      '      <div class="chat-input-wrap" id="discordInputWrap">',
      '        <div class="chat-input">',
      '          <button class="user-btn in-ico-l" data-in="Attach" title="Attach a file">＋</button>',
      '          <input id="discordInput" placeholder="Message" autocomplete="off" />',
      '          <div class="input-icons">',
      '            <button class="in-ico" data-in="Gift" title="Send a gift">🎁</button>',
      '            <button class="in-ico gif-pill" data-in="GIF" title="GIF">GIF</button>',
      '            <button class="in-ico" data-in="Sticker" title="Sticker">🖼️</button>',
      '            <button class="in-ico" data-in="Emoji" title="Emoji">🙂</button>',
      '            <button class="in-ico apps-ico" data-in="Apps" title="Apps &amp; Commands"><span></span><span></span><span></span><span></span></button>',
      '          </div>',
      '          <button class="user-btn send-btn hidden" id="discordSend" title="Send">➤</button>',
      '        </div>',
      '      </div>',
      '    </div>',
      '    <div class="member-list hidden" id="discordMembers"></div>',
      '  </div>',
      '</div>'
    ].join("\n");
  }

  /* ---------------- Panic / push helpers (used by Sofia module & walkthrough) ---------------- */
  function ensureSofiaDM() {
    var list = discordHome.channels[0].items;
    if (!list.find(function (x) { return x.id === "sofia"; })) {
      list.push({ id: "sofia", name: "Sofia", type: "text", topic: "Direct message" });
    }
  }

  function pushSofiaMessage(msg) {
    if (!discordMessageData.sofia) discordMessageData.sofia = [];
    discordMessageData.sofia.push(msg);
  }

  function showSofiaNotification() {
    var n = document.getElementById("dmNotification");
    if (!n) return;
    n.classList.remove("show");
    void n.offsetWidth;
    n.classList.add("show");
  }

  /* ---------------- Setup ---------------- */
  function setupDiscord(win, ctx) {
    ctx = ctx || {};
    var birthdayRuleUnread = ctx.birthdayRuleUnread === undefined ? true : !!ctx.birthdayRuleUnread;

    var $ = function (s) { return win.querySelector(s); };
    var serversEl   = $("#discordServers");
    var homeTopEl   = $("#discordHomeTop");
    var serverNameEl= $("#discordServerName");
    var channelsEl  = $("#discordChannels");
    var titleTextEl = $("#discordTitleText");
    var headerEl    = $("#discordHeader");
    var messagesEl  = $("#discordMessages");
    var membersEl   = $("#discordMembers");
    var inputWrap   = $("#discordInputWrap");
    var input       = $("#discordInput");
    var sendBtn     = $("#discordSend");
    var muteBtn     = $("#discordMute");
    var deafenBtn   = $("#discordDeafen");
    var settingsBtn = $("#discordSettings");
    var userStatusEl= $("#discordUserStatus");

    var state = {
      activeServer: "s1",
      activeChannel: "general",
      muted: false,
      deafened: false,
      membersVisible: true,
      unreadRule: birthdayRuleUnread,
      unreadChannels: {},
      sofiaTriggered: false
    };

    function allServers() { return [discordHome].concat(discordServers); }
    function getServer(id) { return id === "home" ? discordHome : discordServers.find(function (s) { return s.id === id; }); }
    function findChannel(id) {
      for (var si = 0; si < allServers().length; si++) {
        var s = allServers()[si];
        for (var ci = 0; ci < s.channels.length; ci++) {
          for (var chi = 0; chi < s.channels[ci].items.length; chi++) {
            if (s.channels[ci].items[chi].id === id) return s.channels[ci].items[chi];
          }
        }
      }
      return null;
    }
    function preferredChannel(server) {
      if (server === discordHome) return findChannel("bedsheat") || server.channels[0].items[0];
      var all = server.channels.flatMap(function (c) { return c.items; });
      return all.find(function (ch) { return ch.id === "general" && ch.type === "text"; })
          || all.find(function (ch) { return ch.type === "text"; })
          || all[0];
    }
    function totalUnread() {
      var t = state.unreadRule ? 1 : 0;
      for (var k in state.unreadChannels) if (Object.prototype.hasOwnProperty.call(state.unreadChannels, k)) t += state.unreadChannels[k];
      return t;
    }
    function avInner(it) {
      if (it && it.avImg) return '<img src="' + it.avImg + '" class="av-img" alt="">';
      return escapeHTML((it && it.avEmoji) || initials((it && (it.name || it.author)) || "?"));
    }
    function avStyle(it) { return (it && it.avImg) ? "" : "background:" + ((it && it.color) || "#5865f2"); }

    function renderServers() {
      var sofiaUnread = (state.unreadChannels && state.unreadChannels.sofia) || 0;
      var sofiaActive = state.activeServer === "home" && state.activeChannel === "sofia";
      var showSofia = sofiaUnread > 0 || sofiaActive || (window.AppDiscordPanic && window.AppDiscordPanic.started);
      var tu = totalUnread();
      serversEl.innerHTML =
        '<div class="server-icon home ' + (state.activeServer === "home" && !sofiaActive ? "active" : "") + '" data-server="home" title="Direct Messages">' +
          DISCORD_SVG(26) +
          (tu > 0 ? '<span class="home-badge">' + (tu > 9 ? "9+" : tu) + "</span>" : "") +
        "</div>" +
        (showSofia
          ? '<div class="server-separator"></div>' +
            '<div class="server-icon dm-contact ' + (sofiaActive ? "active" : "") + '" data-server="home" data-dm="sofia" title="✧ Sofia ✧">' +
              '<img src="static/sofia.webp" alt="Sofia" style="width:100%;height:100%;border-radius:inherit;object-fit:cover" />' +
              '<div class="dm-ping-badge ' + (sofiaUnread > 0 && !sofiaActive ? "show" : "") + '">' + sofiaUnread + "</div>" +
            "</div>"
          : "") +
        '<div class="server-separator"></div>' +
        discordServers.map(function (s) {
          return '<div class="server-icon ' + (state.activeServer === s.id ? "active" : "") +
                 '" data-server="' + s.id + '" title="' + escapeHTML(s.name) + '" style="background:' + s.color + '">' +
                 initials(s.name) + "</div>";
        }).join("") +
        '<div class="server-separator"></div>' +
        '<div class="server-icon add" data-server="add" title="Add a Server">+</div>';
    }

    function renderChannels() {
      var server = getServer(state.activeServer);
      if (!server) return;
      if (server === discordHome) {
        serverNameEl.style.display = "none";
        homeTopEl.style.display = "block";
        var items = server.channels[0].items;
        var lis =
          '<div class="dm-section-head"><span>Direct Messages</span><button class="dm-add" data-nav="add-dm" title="Add">+</button></div>';
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var unread = state.unreadChannels[it.id] || 0;
          var badge = unread
            ? '<span class="unread-badge">' + (unread > 9 ? "9+" : unread) + "</span>"
            : (it.badge ? '<span class="name-badge">' + escapeHTML(it.badge) + "</span>" : "");
          var sub = it.inVoice
            ? '<div class="dm-sub voice"><span class="voice-ico">🔊</span> In voice</div>'
            : (it.sub ? '<div class="dm-sub">' + escapeHTML(it.sub) + "</div>" : "");
          lis +=
            '<div class="dm-item ' + (it.id === state.activeChannel ? "active" : "") + '" data-channel="' + it.id + '">' +
              '<div class="dm-av">' +
                '<div class="avatar sm-av" style="' + avStyle(it) + '">' + avInner(it) + "</div>" +
                (it.status ? '<span class="status-dot st-' + it.status + '"></span>' : "") +
              "</div>" +
              '<div class="dm-text"><div class="dm-name">' + escapeHTML(it.name) + badge + "</div>" + sub + "</div>" +
            "</div>";
        }
        channelsEl.innerHTML = lis;
      } else {
        homeTopEl.style.display = "none";
        serverNameEl.style.display = "flex";
        serverNameEl.textContent = server.name;
        channelsEl.innerHTML = server.channels.map(function (cat) {
          var html =
            '<div class="channel-category"><span>' + escapeHTML(cat.category) + '</span><span class="category-add">▾</span></div>';
          for (var j = 0; j < cat.items.length; j++) {
            var ch = cat.items[j];
            var uc = 0;
            if (ch.id === "rule" && state.unreadRule) uc = 1;
            else if (state.unreadChannels[ch.id]) uc = state.unreadChannels[ch.id];
            var ub = uc ? '<span class="unread-badge">' + (uc > 9 ? "9+" : uc) + "</span>" : "";
            html +=
              '<div class="channel-item ' + (ch.id === state.activeChannel ? "active" : "") + '" data-channel="' + ch.id + '">' +
                '<span class="channel-prefix">' + (ch.type === "voice" ? "🔊" : "#") + "</span>" +
                '<span class="channel-label">' + escapeHTML(ch.name) + "</span>" + ub +
              "</div>";
          }
          return html;
        }).join("");
      }
      var act = channelsEl.querySelector(".active");
      if (act) act.scrollIntoView({ block: "nearest" });
    }

    function renderMessages(ch) {
      var arr = discordMessageData[ch.id];
      var msgs = (arr && arr.length) ? arr : (arr === undefined ? discordDefaultMessages(ch) : arr);
      var html = "";
      var prev = null;
      for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (m.dividerBefore) html += '<div class="new-divider"><span class="new-line"></span><span class="new-pill">NEW</span></div>';
        html += messageHTML(m, prev !== m.author);
        prev = m.author;
      }
      messagesEl.innerHTML = html;
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderMembers() {
      membersEl.innerHTML =
        '<div class="member-category">Online — ' + discordMembers.online.length + "</div>" +
        discordMembers.online.map(memberHTML).join("") +
        '<div class="member-category">Offline — ' + discordMembers.offline.length + "</div>" +
        discordMembers.offline.map(memberHTML).join("");
    }

    function renderMain() {
      var server = getServer(state.activeServer);
      var isHome = server === discordHome;
      var ch = findChannel(state.activeChannel);
      if (titleTextEl) titleTextEl.innerHTML = DISCORD_SVG(18) + "<span>" + (isHome ? "Direct Messages" : escapeHTML(server.name)) + "</span>";
      membersEl.classList.toggle("hidden", isHome || !state.membersVisible);
      if (!ch) return;
      if (isHome) {
        headerEl.innerHTML =
          '<div class="ch-avatar" style="' + avStyle(ch) + '">' + avInner(ch) + "</div>" +
          '<span class="channel-name">' + escapeHTML(ch.name) + "</span>" +
          (ch.inVoice || ch.sub ? '<span class="ch-status">' + (ch.inVoice ? "🔊 In voice" : escapeHTML(ch.sub)) + "</span>" : "") +
          '<span class="spacer"></span>' +
          '<div class="ch-icons">' +
            '<button class="ch-icon" data-act="Call" title="Start voice call">📞</button>' +
            '<button class="ch-icon" data-act="Video" title="Start video call">🎥</button>' +
            '<button class="ch-icon pin" data-act="Pinned" title="Pinned messages">📌<span class="pin-dot"></span></button>' +
            '<button class="ch-icon" data-act="Add Friend" title="Add friend to DM">👤＋</button>' +
            '<button class="ch-icon" data-act="Profile" title="User profile">🧑</button>' +
          "</div>" +
          '<div class="ch-search"><span class="ch-search-ico">🔍</span><input disabled placeholder="Search ' + escapeHTML(ch.name) + '"></div>';
        inputWrap.style.display = "block";
        input.placeholder = "Message @" + ch.name;
        renderMessages(ch);
      } else {
        headerEl.innerHTML =
          '<span class="channel-hash">' + (ch.type === "voice" ? "🔊" : "#") + "</span>" +
          '<span class="channel-name">' + escapeHTML(ch.name) + "</span>" +
          (ch.topic ? '<span class="topic">' + escapeHTML(ch.topic) + "</span>" : "") +
          '<span class="spacer"></span>' +
          '<div class="ch-search"><span class="ch-search-ico">🔍</span><input disabled placeholder="Search ' + escapeHTML(ch.name) + '"></div>';
        if (ch.type === "voice") {
          inputWrap.style.display = "none";
          messagesEl.innerHTML = voiceHTML(ch);
        } else {
          inputWrap.style.display = "block";
          input.placeholder = "Message #" + ch.name;
          renderMessages(ch);
        }
      }
    }

    function selectServer(id) {
      if (id === "add") { showToast("Add a Server is visual only."); return; }
      var server = getServer(id);
      if (!server) return;
      state.activeServer = id;
      var ch = preferredChannel(server);
      state.activeChannel = ch ? ch.id : null;
      renderServers();
      renderChannels();
      renderMain();
    }

    function selectChannel(ch) {
      if (!ch) return;
      state.activeChannel = ch.id;
      if (ch.id === "rule" && state.unreadRule) {
        state.unreadRule = false;
        if (ctx.onRuleRead) ctx.onRuleRead();
      }
      if (state.unreadChannels[ch.id]) delete state.unreadChannels[ch.id];
      if (ch.id === "rule" && !state.sofiaTriggered) {
        state.sofiaTriggered = true;
        setTimeout(function () { if (typeof window.startSofiaPanic === "function") window.startSofiaPanic(); }, 4500);
      }
      renderChannels();
      renderMain();
      refreshDockBadge();
    }

    function markChannelUnread(id) { state.unreadChannels[id] = (state.unreadChannels[id] || 0) + 1; }
    function refreshDockBadge() {
      var tu = totalUnread();
      var b = document.getElementById("discordDockBadge");
      if (!b) return;
      if (tu > 0) { b.textContent = tu > 9 ? "9+" : String(tu); b.classList.remove("hidden"); }
      else b.classList.add("hidden");
    }
    function openDM(id) { selectServer("home"); var ch = findChannel(id); if (ch) selectChannel(ch); }

    function updateUser() {
      muteBtn.classList.toggle("active", state.muted);
      deafenBtn.classList.toggle("active", state.deafened);
      userStatusEl.textContent = state.deafened ? "Deafened" : state.muted ? "Muted" : "Online";
    }

    serversEl.addEventListener("click", function (e) {
      var s = e.target.closest("[data-server]");
      if (s) {
        if (s.dataset.dm) openDM(s.dataset.dm);
        else selectServer(s.dataset.server);
        return;
      }
      if (e.target.closest("[data-decor]")) showToast("This server is visual only.");
    });
    channelsEl.addEventListener("click", function (e) {
      var el = e.target.closest("[data-channel]");
      if (el) selectChannel(findChannel(el.dataset.channel));
    });
    homeTopEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-nav]");
      if (b) showToast(b.dataset.nav + " is visual only.");
    });
    serverNameEl.addEventListener("click", function () { showToast("Server menu is visual only."); });
    headerEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (b) showToast(b.dataset.act + " is visual only.");
    });
    var tbInbox = win.querySelector('[data-tb="inbox"]');
    var tbHelp = win.querySelector('[data-tb="help"]');
    if (tbInbox) tbInbox.addEventListener("click", function () { showToast("Inbox is visual only."); });
    if (tbHelp) tbHelp.addEventListener("click", function () { showToast("Help is visual only."); });

    muteBtn.addEventListener("click", function () { state.muted = !state.muted; if (state.muted) state.deafened = false; updateUser(); });
    deafenBtn.addEventListener("click", function () { state.deafened = !state.deafened; state.muted = state.deafened; updateUser(); });
    settingsBtn.addEventListener("click", function () { showToast("Settings are visual only."); });

    function trySend() {
      if (!input.value.trim()) return;
      showToast("No chat/server is implemented — message not sent.");
      input.value = "";
      sendBtn.classList.add("hidden");
    }
    input.addEventListener("input", function () { sendBtn.classList.toggle("hidden", !input.value.trim()); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") trySend(); });
    sendBtn.addEventListener("click", trySend);
    win.querySelectorAll("[data-in]").forEach(function (b) {
      b.addEventListener("click", function () { showToast(b.dataset.in + " is visual only."); });
    });

    messagesEl.addEventListener("click", function (e) {
      if (e.target.closest(".voice-join")) showToast("Voice is UI only — no voice server is connected.");
    });

    updateUser();
    selectServer(state.activeServer);
    renderMembers();

    win.selectBirthdayRule = function () {
      selectServer("s1");
      var r = findChannel("rule");
      if (r) selectChannel(r);
    };

    /* Expose win.appDiscord for plugins (Sofia, panic, etc). */
    win.appDiscord = {
      refreshDockBadge: refreshDockBadge,
      markChannelUnread: markChannelUnread,
      openDM: openDM,
      getActiveChannel: function () { return state.activeChannel; },
      getActiveServer: function () { return state.activeServer; },
      refresh: function (changedId) {
        renderServers();
        renderChannels();
        if (changedId && state.activeChannel === changedId) {
          var ch = findChannel(changedId);
          if (ch) renderMessages(ch);
        }
      },
      selectBirthdayRule: function () {
        selectServer("s1");
        var r = findChannel("rule");
        if (r) selectChannel(r);
      }
    };

    /* Hand off to the Sofia scripted-conversation module if present. */
    if (window.AppSofia && typeof window.AppSofia.install === "function") {
      window.AppSofia.install({
        getInput: function () { return win.querySelector("#discordInput"); },
        getSendBtn: function () { return win.querySelector("#discordSend"); },
        isActive: function () { return state.activeServer === "home" && state.activeChannel === "sofia"; },
        pushMessage: function (msg, authorMeta) {
          if (!discordMessageData.sofia) discordMessageData.sofia = [];
          discordMessageData.sofia.push(msg);
        },
        refreshSofia: function () {
          renderServers();
          renderChannels();
          var ch = findChannel("sofia");
          if (ch) renderMessages(ch);
        },
        timeNow: function () {
          return "Today at " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        },
        onComplete: function () {
          /* Emit both a window-level and document-level event for max reach. */
          window.dispatchEvent(new CustomEvent("walkthrough:discord-complete"));
          if (window.AppCommon && typeof window.AppCommon.emit === "function") {
            window.AppCommon.emit("walkthrough:discord-complete");
          }
        }
      });
    }
  }

  return {
    data: { discordHome: discordHome, discordServers: discordServers, discordMessageData: discordMessageData, discordMembers: discordMembers },
    templates: { messageHTML: messageHTML, voiceHTML: voiceHTML, memberHTML: memberHTML, discordDefaultMessages: discordDefaultMessages, DISCORD_SVG: DISCORD_SVG },
    window: { discordWindowHTML: discordWindowHTML },
    setup: setupDiscord,
    helpers: { ensureSofiaDM: ensureSofiaDM, pushSofiaMessage: pushSofiaMessage, showSofiaNotification: showSofiaNotification }
  };
})();
