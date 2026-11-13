// ===== Hidden section =====
let stopGame = () => {};
const hs = (k) => { try { return +localStorage.getItem("hs." + k) || 0; } catch { return 0; } };
const setHs = (k, v) => { try { localStorage.setItem("hs." + k, v); } catch {} };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; if (cls === "score") e.setAttribute("aria-live", "polite"); return e; };

function openVault() {
  $("#planner").hidden = true;
  $("#vault").hidden = false;
  document.body.classList.add("in-vault");
  renderVideos();
  const st = vsLoad();
  if (GAMES[st.game]) { currentGame = st.game; document.querySelectorAll(".game-picker button").forEach((x) => x.classList.toggle("on", x.dataset.game === currentGame)); }
  const tb = st.tab && st.tab !== "games" ? document.querySelector(`#vault-tabs [data-tab="${st.tab}"]`) : null;
  if (tb) tb.click(); else startGame(currentGame);
}
function closeVault() {
  stopGame();
  $("#video-frame").innerHTML = "";
  closeBrowse();
  closeCloud();
  $("#vault").hidden = true;
  $("#planner").hidden = false;
  document.body.classList.remove("in-vault");
  window.scrollTo(0, 0);
}
$("#exit").onclick = closeVault;
document.addEventListener("visibilitychange", () => { if (document.hidden && !$("#vault").hidden && $("#cloud-split").hidden) closeVault(); });

$("#vault-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  vsSave({ tab: b.dataset.tab });
  document.querySelectorAll("#vault-tabs button").forEach((x) => x.classList.toggle("on", x === b));
  for (const t of ["games", "videos", "browse", "cloud"]) $("#pane-" + t).hidden = t !== b.dataset.tab;
  if (b.dataset.tab !== "browse") closeBrowse();
  if (b.dataset.tab !== "cloud") closeCloud(); else updateNet();
  if (b.dataset.tab !== "videos") $("#video-frame").innerHTML = "";
  if (b.dataset.tab !== "games") stopGame(); else startGame(currentGame);
});

// ----- Videos -----
// Starter list written from memory. If one says "unavailable", its owner turned off embedding: just edit this list.
const SUGGESTED = [
  { id: "jfKfPfyJRdk", t: "Lofi Girl: beats to study to (live)" },
  { id: "h6fcK_fRYaI", t: "The Egg (Kurzgesagt)" },
  { id: "iG9CE55wbtY", t: "Do schools kill creativity? (TED)" },
  { id: "aqz-KE-bpKQ", t: "Big Buck Bunny (Blender)" },
  { id: "jNQXAC9IVRw", t: "Me at the zoo (first YouTube video)" },
  { id: "dQw4w9WgXcQ", t: "Never Gonna Give You Up" },
];
let myVideos = [];
try { myVideos = JSON.parse(localStorage.getItem("vault.videos")) || []; } catch {}
const saveVideos = () => { try { localStorage.setItem("vault.videos", JSON.stringify(myVideos)); } catch {} };

function ytId(input) {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : "https://" + s);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12);
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{11})/);
    if (m) return m[2];
  } catch {}
  return null;
}
function playVideo(id) {
  $("#video-frame").innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&autoplay=1"
    allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  $("#video-frame").scrollIntoView({ block: "nearest" });
}
function card(v, removable) {
  const c = el("div", "vcard");
  const b = el("button", "play");
  const img = el("img"); img.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; img.alt = ""; img.loading = "lazy";
  b.append(img, el("span", "", v.t));
  b.onclick = () => playVideo(v.id);
  c.append(b);
  if (removable) {
    const x = el("button", "x", "×"); x.setAttribute("aria-label", "Remove");
    x.onclick = () => { myVideos = myVideos.filter((m) => m.id !== v.id); saveVideos(); renderVideos(); };
    c.append(x);
  }
  return c;
}
function renderVideos() {
  $("#suggested").replaceChildren(...SUGGESTED.map((v) => card(v, false)));
  $("#mylist").replaceChildren(...myVideos.map((v) => card(v, true)));
  $("#mylist-h").hidden = myVideos.length === 0;
}
$("#video-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = ytId($("#video-url").value);
  if (!id) { alert("That doesn't look like a YouTube link."); return; }
  playVideo(id);
});
$("#video-save").onclick = () => {
  const id = ytId($("#video-url").value);
  if (!id) { alert("Paste a YouTube link first."); return; }
  if (myVideos.some((m) => m.id === id)) return;
  const t = prompt("Name this video:", "Saved video");
  if (t === null) return;
  myVideos.push({ id, t: t.trim() || "Saved video" });
  saveVideos(); renderVideos();
};
$("#yt-search-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $("#yt-q").value.trim(); if (!q) return;
  window.open("https://www.youtube.com/results?search_query=" + encodeURIComponent(q), "_blank", "noopener");
});

// ----- Browse -----
const NO_EMBED = ["google.", "duckduckgo.", "bing.", "youtube.", "youtu.be", "instagram.", "facebook.", "tiktok.",
  "twitter.", "x.com", "reddit.", "netflix.", "discord.", "snapchat.", "github.com", "linkedin.", "amazon.", "twitch."];
let browseTimer = null;
function normalizeBrowse(v) {
  const isUrl = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(\/.*)?$/i.test(v);
  return isUrl ? (v.startsWith("http") ? v : "https://" + v) : null;
}
function closeBrowse() {
  clearTimeout(browseTimer);
  $("#browse-frame").innerHTML = "";
  $("#browse-frame").hidden = true;
  $("#browse-bar").hidden = true;
}
function showBrowseMessage(msg) { $("#browse-bar").hidden = false; $("#browse-status").textContent = msg; }
$("#browse-form").addEventListener("submit", (e) => {
  e.preventDefault();
  closeBrowse();
  const url = normalizeBrowse($("#browse-url").value.trim());
  if (!url) { showBrowseMessage("Enter a website address, like wikipedia.org."); return; }
  if (NO_EMBED.some((d) => new URL(url).hostname.includes(d))) { showBrowseMessage("This site can't load here because it doesn't allow embedding."); return; }
  showBrowseMessage("Loading…");
  $("#browse-frame").hidden = false;
  const f = document.createElement("iframe");
  f.referrerPolicy = "no-referrer";
  f.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups");
  f.onload = () => { clearTimeout(browseTimer); $("#browse-status").textContent = "If the box is blank, this site doesn't allow embedding."; };
  f.src = url;
  $("#browse-frame").append(f);
  browseTimer = setTimeout(() => { $("#browse-status").textContent = "Not loading. This site probably doesn't allow embedding."; }, 6000);
});
$("#browse-close").onclick = closeBrowse;

// ----- Games -----
let currentGame = "fps";
$(".game-picker").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  currentGame = b.dataset.game; vsSave({ game: currentGame });
  document.querySelectorAll(".game-picker button").forEach((x) => x.classList.toggle("on", x === b));
  startGame(currentGame);
});
function startGame(name) {
  stopGame(); stopGame = () => {};
  const tok = ++gameToken;
  $("#game-area").innerHTML = "";
  (GAMES[name] || GAMES.fps)(tok);
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.fill(); }
function swipe(node, cb) {
  let sx, sy;
  node.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  node.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U"));
  }, { passive: true });
}
const KEYS = { ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R", w: "U", s: "D", a: "L", d: "R" };

// ----- Cloud (Cloudmoon) -----
// Nothing here writes to localStorage/sessionStorage/cookies. Cloudmoon keeps its own login inside its frame.
const CLOUD_URL = "https://web.cloudmoonapp.com/";
let cloudTimer = null;
function updateNet() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const dot = $("#net-dot"), type = $("#net-type"), note = $("#net-note"), bar = $("#net-bar");
  let kind = "unknown", label = "Connection type unknown", msg = "";
  if (!navigator.onLine) { kind = "off"; label = "Offline"; msg = "Reconnect to use Cloudmoon."; }
  else if (c && c.type === "wifi") { kind = "wifi"; label = "Wi-Fi"; msg = "Not using mobile data."; }
  else if (c && c.type === "cellular") { kind = "cell"; label = "Mobile data"; msg = "Cloud gaming uses a lot of data. Switch to Wi-Fi if you can."; }
  else if (c && c.type === "ethernet") { kind = "wifi"; label = "Wired network"; msg = "Not using mobile data."; }
  else if (c && c.type && c.type !== "unknown" && c.type !== "other") { label = "Connection: " + c.type; }
  else {
    msg = "This browser doesn't report Wi-Fi vs. data (iPhone/Safari and most computers hide it). Check the icon in your status bar.";
  }
  if (c && c.saveData) msg += " Data Saver is on.";
  if (kind === "unknown" && c && c.effectiveType) label += " (" + c.effectiveType.toUpperCase() + " speed)";
  bar.dataset.kind = kind; type.textContent = label; note.textContent = msg;
}
(() => { const c = navigator.connection; if (c && c.addEventListener) c.addEventListener("change", updateNet); window.addEventListener("online", updateNet); window.addEventListener("offline", updateNet); })();
function setFull(which) {
  for (const k of ["a", "b"]) {
    const p = $("#cpane-" + k), on = k === which && !p.classList.contains("full");
    p.classList.toggle("full", on);
    p.querySelector("[data-full]").textContent = on ? "Exit full screen" : "Full screen";
  }
  $("#cloud-split").classList.toggle("has-full", !!document.querySelector(".cpane.full"));
}
function closeTwo() {
  resetCrop("b");
  $("#two-frame").innerHTML = ""; $("#cpane-b").hidden = true; $("#cpane-b").classList.remove("full");
  $("#cpane-b [data-full]").textContent = "Full screen"; $("#cloud-two").textContent = "+ Second screen";
  $("#cloud-split").classList.remove("two", "has-full");
}
function closeCloud() {
  resetCrop("a");
  clearTimeout(cloudTimer);
  closeTwo(); $("#cpane-a").classList.remove("full");
  $("#cloud-frame").innerHTML = ""; $("#cloud-split").hidden = true; $("#cloud-bar").hidden = true; $("#cloud-intro").hidden = false;
}
$("#cloud-start").onclick = () => {
  closeCloud(); updateNet();
  const pop = $("#cloud-pop").checked;
  $("#cloud-intro").hidden = true; $("#cloud-bar").hidden = false; $("#cloud-split").hidden = false;
  $("#cloud-status").textContent = "Loading Cloudmoon…";
  const f = document.createElement("iframe");
  f.referrerPolicy = "no-referrer";
  // No allow-popups by default: links that try to open a new tab are blocked, so use the second screen instead.
  f.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-pointer-lock allow-modals" + (pop ? " allow-popups allow-popups-to-escape-sandbox" : ""));
  f.setAttribute("allow", "fullscreen; gamepad; microphone; autoplay; clipboard-write; clipboard-read");
  f.allowFullscreen = true;
  f.onload = () => { clearTimeout(cloudTimer); $("#cloud-status").textContent = pop ? "Popups allowed for sign-in." : "New-tab links are blocked. Type their address in the second screen."; };
  f.src = CLOUD_URL;
  $("#cloud-frame").append(f);
  cloudTimer = setTimeout(() => { $("#cloud-status").textContent = "Not loading. Cloudmoon may not allow embedding here."; }, 8000);
};
$("#cloud-two").onclick = () => {
  const open = !$("#cpane-b").hidden;
  if (open) { closeTwo(); return; }
  $("#cpane-b").hidden = false; $("#cloud-split").classList.add("two"); $("#cloud-two").textContent = "− Second screen";
  $("#two-url").focus({ preventScroll: true });
};
$("#two-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const url = normalizeBrowse($("#two-url").value.trim()), st = $("#two-status");
  $("#two-frame").innerHTML = "";
  if (!url) { st.textContent = "Enter a website address, like wikipedia.org."; return; }
  if (NO_EMBED.some((d) => new URL(url).hostname.includes(d))) { st.textContent = "That site doesn't allow embedding, so it can't load here."; return; }
  st.textContent = "Loading… if it stays blank, the site doesn't allow embedding.";
  const f = document.createElement("iframe");
  f.referrerPolicy = "no-referrer";
  f.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin");
  f.src = url; $("#two-frame").append(f);
});
$("#two-close").onclick = closeTwo;
document.querySelectorAll("[data-full]").forEach((b) => (b.onclick = () => setFull(b.dataset.full)));
$("#cloud-close").onclick = closeCloud;
updateNet();

// ----- Crop: zoom the pane so only the chosen part of the screen is shown -----
const cropState = { a: { l: 0, t: 0, r: 0, b: 0 }, b: { l: 0, t: 0, r: 0, b: 0 } };
function applyCrop(k) {
  const c = cropState[k], body = k === "a" ? $("#cloud-frame") : $("#two-frame");
  const w = Math.max(0.2, 1 - c.l - c.r), h = Math.max(0.2, 1 - c.t - c.b), s = Math.min(1 / w, 1 / h);
  if (!c.l && !c.t && !c.r && !c.b) { body.style.removeProperty("--crop"); return; }
  const ox = ((1 - w * s) / 2) * 100, oy = ((1 - h * s) / 2) * 100;
  body.style.setProperty("--crop", `translate(${ox}%, ${oy}%) scale(${s}) translate(${-c.l * 100}%, ${-c.t * 100}%)`);
}
function resetCrop(k) {
  cropState[k] = { l: 0, t: 0, r: 0, b: 0 }; applyCrop(k);
  const p = document.getElementById("crop-" + k);
  if (p) { p.hidden = true; p.querySelectorAll("input").forEach((i) => (i.value = 0)); }
  const btn = document.querySelector(`[data-crop="${k}"]`); if (btn) btn.classList.remove("on");
}
for (const k of ["a", "b"]) {
  const pane = $("#cpane-" + k), p = el("div", "croppanel"); p.id = "crop-" + k; p.hidden = true;
  const side = { l: "Left", t: "Top", r: "Right", b: "Bottom" };
  for (const s of ["l", "t", "r", "b"]) {
    const lab = document.createElement("label"); lab.append(side[s]);
    const i = document.createElement("input"); i.type = "range"; i.min = 0; i.max = 70; i.value = 0; i.setAttribute("aria-label", "Crop " + side[s]);
    i.oninput = () => { cropState[k][s] = i.value / 100; applyCrop(k); };
    lab.append(i); p.append(lab);
  }
  const rs = el("button", "", "Reset"); rs.type = "button"; rs.onclick = () => resetCrop(k); rs.dataset.keep = 1; p.append(rs);
  pane.querySelector(".cp-head").after(p);
  pane.querySelector("[data-crop]").onclick = (e) => { p.hidden = !p.hidden; e.currentTarget.classList.toggle("on", !p.hidden); };
}

// ----- Remember hidden-side choices on this device (tab, game, popup choice, second-screen address) -----
// Stored only in this browser's localStorage. Nothing is sent anywhere. Passwords are never stored by the planner.
function vsLoad() { try { return JSON.parse(localStorage.getItem("vault.state")) || {}; } catch { return {}; } }
function vsSave(p) { try { localStorage.setItem("vault.state", JSON.stringify({ ...vsLoad(), ...p })); } catch {} }
(() => { const st = vsLoad(); if (st.pop) $("#cloud-pop").checked = true; if (st.two) $("#two-url").value = st.two; })();
$("#cloud-pop").addEventListener("change", (e) => vsSave({ pop: e.target.checked }));
$("#two-form").addEventListener("submit", () => vsSave({ two: $("#two-url").value.trim() }));

// ----- Reload + coming back from a sign-in window -----
function reloadCloud() {
  const f = $("#cloud-frame iframe"); if (!f) return;
  $("#cloud-status").textContent = "Reloading…";
  const src = f.src; f.src = "about:blank"; setTimeout(() => { f.src = src; }, 150);
}
$("#cloud-reload").onclick = reloadCloud;
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !$("#vault").hidden && !$("#cloud-split").hidden)
    $("#cloud-status").textContent = "Back from signing in? Tap Reload if the screen is blank.";
});
