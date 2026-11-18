// ===== Arcade: game library inside the hidden section =====
// Everything here is local to this browser. Games load inside an <iframe> created by script, and this
// page never changes its own address (no hash, no pushState), so nothing is added to browser history by playing.
// To add a game permanently, add a line to GL below. Players can also add games in Arcade > Discover.
(() => {
const CATS = ["FPS", "Battle Royale", "Sandbox", "Strategy", "Survival", "Multiplayer"];
const CI = { FPS: "🎯", "Battle Royale": "🪂", Sandbox: "🧱", Strategy: "🧠", Survival: "🐍", Multiplayer: "🌐" };
// id, name, url, categories, mo = iPhone suitability ("good" = touch controls work, "test" = may need a keyboard),
// ct = controls, e = emoji, c = thumbnail colors, ds = description, tp = tip, lv = intensity 1-3
const GL = [
  { id: "eagler", n: "Eaglercraft", u: "https://eaglercraft.com/", g: ["Sandbox", "Survival", "Multiplayer"], mo: "test", ct: "Keyboard + mouse", e: "⛏️", c: ["#3a7d2c", "#6b4a2b"], lv: 2,
    ds: "Minecraft in your browser.", tp: "Eaglercraft is built for keyboard and mouse, so touch controls depend on the build. On iPhone, open Fix and paste the link of a touch-friendly Eaglercraft build, or use a Bluetooth keyboard." },
  { id: "bloxd", n: "Bloxd.io", u: "https://bloxd.io/", g: ["Sandbox", "Multiplayer"], mo: "good", ct: "Touch or keyboard", e: "🧊", c: ["#2b8cff", "#1b3b7a"], lv: 2, ds: "Minecraft-style sandbox with minigames." },
  { id: "diep", n: "Diep.io", u: "https://diep.io/", g: ["Survival", "Multiplayer"], mo: "good", ct: "Touch joystick or keyboard", e: "🔵", c: ["#00b2e1", "#1c2b4a"], lv: 2, ds: "Tank arena. Level up and upgrade." },
  { id: "zombs", n: "ZombsRoyale.io", u: "https://zombsroyale.io/", g: ["Battle Royale", "Multiplayer"], mo: "good", ct: "Touch or keyboard", e: "🧟", c: ["#5aa02c", "#1d2b12"], lv: 3, ds: "2D battle royale. Last one standing wins." },
  { id: "battle", n: "BattleDudes.io", u: "https://battledudes.io/", g: ["Battle Royale", "Multiplayer"], mo: "test", ct: "Test on your device", e: "🪖", c: ["#ff7a3c", "#4a1d12"], lv: 3, ds: "Multiplayer battle game." },
  { id: "terr", n: "Territorial.io", u: "https://territorial.io/", g: ["Strategy", "Multiplayer"], mo: "good", ct: "Tap or click", e: "🗺️", c: ["#e6b422", "#3a2f0b"], lv: 2, ds: "Grow your territory and conquer the map." },
  { id: "slither", n: "Slither.io", u: "https://slither.io/", g: ["Survival", "Multiplayer"], mo: "good", ct: "Touch or mouse", e: "🐍", c: ["#7a4cff", "#14123a"], lv: 1, ds: "Eat to grow. Don't hit other snakes." },
  { id: "agar", n: "Agar.io", u: "https://agar.io/", g: ["Survival", "Multiplayer"], mo: "good", ct: "Touch or mouse", e: "🟣", c: ["#e0457b", "#2a1030"], lv: 1, ds: "Absorb smaller cells. Avoid bigger ones." },
  { id: "hole", n: "Hole.io", u: "https://hole.io/", g: ["Multiplayer"], mo: "good", ct: "Touch or mouse", e: "🕳️", c: ["#222831", "#00adb5"], lv: 1, ds: "Swallow the city with a growing hole." },
  { id: "wormate", n: "Wormate.io", u: "https://wormate.io/", g: ["Survival", "Multiplayer"], mo: "good", ct: "Touch or mouse", e: "🪱", c: ["#ff8fab", "#3b1d4a"], lv: 1, ds: "Colorful worm arena." },
  { id: "paper", n: "Paper.io 2", u: "https://paper-io.com/", g: ["Strategy", "Multiplayer"], mo: "good", ct: "Swipe or keyboard", e: "📄", c: ["#34c3a0", "#13324a"], lv: 1, ds: "Claim territory by drawing loops." },
  { id: "karts", n: "Smash Karts", u: "https://smashkarts.io/", g: ["Multiplayer"], mo: "good", ct: "Touch or keyboard", e: "🏎️", c: ["#ff4d6d", "#2b1b5a"], lv: 3, ds: "Kart racing with weapons." },
  { id: "kour", n: "Kour.io", u: "https://kour.io/", g: ["FPS", "Multiplayer"], mo: "good", ct: "Touch or keyboard + mouse", e: "🔫", c: ["#ff9f1c", "#2b2d42"], lv: 3, ds: "Fast blocky shooter." },
  { id: "krunker", n: "Krunker.io", u: "https://krunker.io/", g: ["FPS", "Multiplayer"], mo: "test", ct: "Keyboard + mouse", e: "🎯", c: ["#ff3b3b", "#1a1a2e"], lv: 3, ds: "Fast pixel-style shooter.", tp: "Best with keyboard and mouse. Test touch controls on your phone." },
  { id: "venge", n: "Venge.io", u: "https://venge.io/", g: ["FPS", "Multiplayer"], mo: "test", ct: "Keyboard + mouse", e: "💥", c: ["#8338ec", "#10002b"], lv: 3, ds: "Hero-style multiplayer shooter." },
  { id: "warb", n: "War Brokers", u: "https://warbrokers.io/", g: ["FPS", "Multiplayer"], mo: "test", ct: "Keyboard + mouse", e: "🪖", c: ["#6b8e23", "#1b2412"], lv: 3, ds: "Online 3D shooter with vehicles." },
  { id: "mcc", n: "Minecraft Classic", u: "https://classic.minecraft.net/", g: ["Sandbox"], mo: "test", ct: "Keyboard + mouse", e: "🟫", c: ["#7cb342", "#5d4037"], lv: 1, ds: "The original creative-mode build.", tp: "Needs mouse look, which iPhone Safari does not support. Works on desktop and with a keyboard on iPad." },
].map((g) => ({ ad: "2026-11-17", ...g }));

const QT = ["One more match.", "Lag is just the game thinking about its choices.", "Every expert was once stuck on level one.", "Warm up first. Then go for the win.", "Take a break. Drink some water.", "Good games are better with good friends.", "The best loot is the friends we made along the way.", "Respawn, regroup, retry.", "Small upgrades add up.", "Play for fun first, rank second."];
const DEF = { fav: [], pin: [], hid: [], rate: {}, note: {}, cnt: {}, last: {}, rc: [], pl: {}, secs: {}, days: [], ach: {}, req: [], url: {}, th: {}, cg: [], bad: {}, fl: {}, tot: 0, dc: {}, us: null,
  cf: { theme: "default", accent: "", an: "full", bg: true, sfx: "soft", nm: "", lg: "🎮", lgi: "", wl: "", keep: false, trk: true, wipe: false, mus: "off", vol: 40, gid: "", ord: ["dc", "rc", "gotd", "pin", "new", "qt"], hd: {} } };

const q = (s, r = document) => r.querySelector(s), qa = (s, r = document) => [...r.querySelectorAll(s)];
const ld = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
let as = JSON.parse(JSON.stringify(DEF));
{ const sv0 = ld("arc.v1", {}); as = { ...as, ...sv0 }; as.cf = { ...DEF.cf, ...(sv0.cf || {}) }; for (const k of ["rate", "note", "cnt", "last", "pl", "secs", "ach", "url", "th", "bad", "fl", "dc"]) if (!as[k] || typeof as[k] !== "object" || Array.isArray(as[k])) as[k] = {}; for (const k of ["fav", "pin", "hid", "rc", "days", "req", "cg"]) if (!Array.isArray(as[k])) as[k] = []; }
const CFG = window.ARC_CFG || {};
const esc2 = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const td = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const hsh = (s) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
let tst = null;
function toast(m) { const t = q("#arc-toast"); if (!t) return; t.textContent = m; t.hidden = false; clearTimeout(tst); tst = setTimeout(() => (t.hidden = true), 2800); }
function sv() { try { localStorage.setItem("arc.v1", JSON.stringify(as)); } catch { toast("Storage is full. Remove some thumbnails or notes."); } }
const trk = () => as.cf.trk;
const ga = () => GL.concat(as.cg);
const gm = (id) => ga().find((g) => g.id === id);
const gu = (g) => as.url[g.id] || g.u;
const gv = () => ga().filter((g) => !as.hid.includes(g.id));
const tsec = () => Object.values(as.secs).reduce((a, b) => a + b, 0);
const fdur = (s) => (s >= 3600 ? Math.floor(s / 3600) + "h " + Math.floor((s % 3600) / 60) + "m" : s >= 60 ? Math.floor(s / 60) + "m" : s + "s");
const ago = (t) => { if (!t) return "never"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
function stk() { const s = new Set(as.days), d = new Date(); let n = 0; if (!s.has(td())) d.setDate(d.getDate() - 1); for (;;) { const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); if (!s.has(k)) break; n++; d.setDate(d.getDate() - 1); } return n; }

// ---------- sound effects + music (synth, no files) ----------
function bp(f0, f1, d, ty = "sine", v = 0.05) {
  if (as.cf.sfx === "off" || typeof ac !== "function") return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime; o.type = ty; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d);
}
function sx(k) {
  const p = as.cf.sfx; if (p === "off") return; const ty = p === "soft" ? "sine" : "square", v = p === "soft" ? 0.05 : 0.03, m = p === "retro" ? 0.5 : 1;
  if (k === "tap") bp(660 * m, 520 * m, 0.07, ty, v); else if (k === "ok") { bp(520 * m, 780 * m, 0.1, ty, v); setTimeout(() => bp(780 * m, 1040 * m, 0.12, ty, v), 90); } else if (k === "ach") [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => bp(f, f, 0.14, ty, v), i * 110));
}
const MD = { chill: { sc: [0, 2, 4, 7, 9, 12, 14], r: 261.63, ty: "sine", tm: 520, pr: 0.7, v: 0.5 }, neon: { sc: [0, 3, 7, 10, 12, 15, 19], r: 220, ty: "triangle", tm: 230, pr: 0.8, v: 0.45 }, dark: { sc: [0, 3, 5, 7, 10], r: 98, ty: "sawtooth", tm: 700, pr: 0.5, v: 0.22 } };
const mu = { g: null, t: null };
function mnote() {
  const m = MD[as.cf.mus]; if (!m || !mu.g) return; const a = ac(); if (!a) return;
  if (Math.random() < m.pr) {
    const f = m.r * Math.pow(2, m.sc[Math.floor(Math.random() * m.sc.length)] / 12), o = a.createOscillator(), g = a.createGain(), t = a.currentTime, fl = a.createBiquadFilter();
    o.type = m.ty; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(m.v, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + (m.tm * 3) / 1000);
    o.connect(fl).connect(g).connect(mu.g); o.start(t); o.stop(t + (m.tm * 3) / 1000 + 0.1);
  }
  mu.t = setTimeout(mnote, m.tm);
}
function musc() {
  clearTimeout(mu.t); mu.t = null;
  if (as.cf.mus === "off" || !MD[as.cf.mus]) { if (mu.g) { try { mu.g.disconnect(); } catch {} mu.g = null; } return; }
  const a = ac(); if (!a) return;
  if (!mu.g) { mu.g = a.createGain(); mu.g.connect(a.destination); }
  mu.g.gain.value = (as.cf.vol / 100) * 0.5; mnote(); as.fl.music = 1;
}

// ---------- image helpers + screenshots (IndexedDB) ----------
function rsz(file, mx, ql) {
  return new Promise((ok, no) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => { const s = Math.min(1, mx / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = Math.round(i.width * s); c.height = Math.round(i.height * s); c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL("image/jpeg", ql)); }; i.onerror = () => { URL.revokeObjectURL(u); no(); }; i.src = u; });
}
const idb = () => new Promise((ok, no) => { try { const r = indexedDB.open("arc-db", 1); r.onupgradeneeded = () => r.result.createObjectStore("shots", { keyPath: "id", autoIncrement: true }); r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); } catch (e) { no(e); } });
const shl = async () => { try { const d = await idb(); return await new Promise((ok) => { const r = d.transaction("shots").objectStore("shots").getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ok([]); }); } catch { return []; } };
const shadd = async (o) => { const d = await idb(); return new Promise((ok, no) => { const r = d.transaction("shots", "readwrite").objectStore("shots").add(o); r.onsuccess = () => ok(); r.onerror = () => no(); }); };
const shdel = async (id) => { const d = await idb(); return new Promise((ok) => { const r = d.transaction("shots", "readwrite").objectStore("shots").delete(id); r.onsuccess = () => ok(); r.onerror = () => ok(); }); };
const shclr = async () => { try { const d = await idb(); d.transaction("shots", "readwrite").objectStore("shots").clear(); } catch {} };

// ---------- achievements + daily challenges ----------
const AC = [
  ["first", "First launch", "Open any game", () => as.tot >= 1], ["five", "Explorer", "Open 5 different games", () => Object.keys(as.cnt).length >= 5],
  ["allc", "Completionist", "Open a game from every category", () => CATS.every((c) => ga().some((g) => g.g.includes(c) && as.cnt[g.id]))],
  ["fav3", "Collector", "Favorite 3 games", () => as.fav.length >= 3], ["rate", "Critic", "Rate a game", () => Object.keys(as.rate).length >= 1],
  ["note", "Note taker", "Save a game note", () => Object.values(as.note).some(Boolean)], ["pl", "Curator", "Make a playlist", () => Object.keys(as.pl).length >= 1],
  ["st3", "On a roll", "Use the arcade 3 days in a row", () => stk() >= 3], ["hour", "Marathon", "Play for an hour in total", () => tsec() >= 3600],
  ["theme", "Stylist", "Change the theme", () => as.cf.theme !== "default"], ["music", "DJ", "Turn on the music", () => !!as.fl.music],
  ["quiz", "Decisive", "Finish the game finder", () => !!as.fl.quiz], ["shot", "Photographer", "Save a screenshot", () => !!as.fl.shot],
  ["custom", "Builder", "Add your own game", () => as.cg.length >= 1], ["sign", "Signed in", "Sign in with Google", () => !!as.us], ["egg", "Secret finder", "Find the hidden theme", () => !!as.fl.egg],
];
function ckach() { for (const [id, n, , f] of AC) if (!as.ach[id] && f()) { as.ach[id] = Date.now(); sx("ach"); toast("🏆 Achievement: " + n); } sv(); }
function dcr() { if (as.dc.d !== td()) as.dc = { d: td(), op: [], ct: [], rt: 0, secs: 0, nw: 0 }; return as.dc; }
function chs() {
  const d = dcr(), s = hsh(td()), cat = CATS[s % CATS.length];
  return [{ t: "Open a " + cat + " game", ok: d.ct.includes(cat) }, { t: "Play for 5 minutes", ok: d.secs >= 300 }, s % 2 ? { t: "Try a game you've never opened", ok: d.nw > 0 } : { t: "Rate a game", ok: d.rt > 0 }];
}

// ---------- state + theme ----------
const st = { v: "home", cat: "All", qy: "", mob: false, sh: false, qz: null, cmp: [null, null], ex: false };
let ck = null, cur = null, tk = null, tkn = 0;
function thm() {
  const b = document.body; b.dataset.at = as.cf.theme; b.dataset.an = as.cf.an; b.dataset.bg = as.cf.bg ? "1" : "0";
  if (as.cf.accent) b.style.setProperty("--ah", as.cf.accent); else b.style.removeProperty("--ah");
}

// ---------- link probe (reachability only: a reachable site can still refuse to be embedded) ----------
async function probe(u, ms = 8000) {
  const t0 = performance.now(), c = new AbortController(), to = setTimeout(() => c.abort(), ms);
  try { await fetch(u, { mode: "no-cors", cache: "no-store", referrerPolicy: "no-referrer", signal: c.signal }); clearTimeout(to); return { ok: true, ms: Math.round(performance.now() - t0) }; }
  catch (e) { clearTimeout(to); return { ok: false, ms: Math.round(performance.now() - t0), to: e.name === "AbortError" }; }
}
function conn() {
  const c = navigator.connection; if (!navigator.onLine) return "🔴 Offline";
  if (c && c.effectiveType) return "🟢 Online · " + c.effectiveType.toUpperCase() + (c.rtt ? " · " + c.rtt + " ms" : "");
  return "🟢 Online";
}

// ---------- views ----------
const bd = (g) => `<em class="${g.mo === "good" ? "ok" : "tst"}">${g.mo === "good" ? "📱 Touch OK" : "⌨️ Test controls"}</em>` + (as.bad[g.id] && as.bad[g.id].ok === false ? '<em class="bad">⚠ Link issue</em>' : "") + (as.bad[g.id] && as.bad[g.id].blank ? '<em class="bad">⛔ Blocks embedding</em>' : "");
function thmb(g) { const t = as.th[g.id]; return t ? `background:url("${t}") center/cover` : `background:linear-gradient(135deg,${g.c[0]},${g.c[1]})`; }
function card(g) {
  const f = as.fav.includes(g.id), p = as.pin.includes(g.id), r = as.rate[g.id];
  return `<article class="gc"><button class="gt" data-a="play" data-id="${g.id}" style="${esc2(thmb(g))}" aria-label="Play ${esc2(g.n)}">${as.th[g.id] ? "" : `<span>${g.e}</span>`}</button>
  <div class="gi"><b>${esc2(g.n)}</b><small>${g.g.map(esc2).join(" · ")}${r ? " · " + "★".repeat(r) : ""}</small><div class="gb">${bd(g)}</div></div>
  <div class="ga"><button data-a="fav" data-id="${g.id}" aria-label="Favorite" class="${f ? "on" : ""}">${f ? "★" : "☆"}</button><button data-a="pin" data-id="${g.id}" aria-label="Pin to top" class="${p ? "on" : ""}">📌</button><button data-a="more" data-id="${g.id}" aria-label="Details">⋯</button></div></article>`;
}
const mini = (g) => `<button class="mg" data-a="play" data-id="${g.id}" style="${esc2(thmb(g))}"><span>${as.th[g.id] ? "" : g.e}</span><b>${esc2(g.n)}</b></button>`;
const row = (arr) => (arr.length ? `<div class="mrow">${arr.map(mini).join("")}</div>` : "");

function fgames() {
  let a = ga(); const k = st.qy.trim().toLowerCase();
  if (!st.sh) a = a.filter((g) => !as.hid.includes(g.id)); else a = a.filter((g) => as.hid.includes(g.id));
  if (st.cat === "Favorites") a = a.filter((g) => as.fav.includes(g.id)); else if (CATS.includes(st.cat)) a = a.filter((g) => g.g.includes(st.cat)); else if (st.cat.startsWith("pl:")) { const l = as.pl[st.cat.slice(3)] || []; a = a.filter((g) => l.includes(g.id)); }
  if (st.mob) a = a.filter((g) => g.mo === "good");
  if (k) a = a.filter((g) => (g.n + " " + g.g.join(" ") + " " + g.ds + " " + (g.mo === "good" ? "iphone mobile touch" : "keyboard") + " " + (g.g.includes("Multiplayer") ? "multiplayer online mp" : "")).toLowerCase().includes(k));
  return a.sort((x, y) => (as.pin.includes(y.id) - as.pin.includes(x.id)) || x.n.localeCompare(y.n));
}
const grid = () => { const a = fgames(); return a.length ? a.map(card).join("") : `<p class="none">${st.sh ? "No hidden games." : "No games match. Try another word or category."}</p>`; };

function sec(id) {
  const vis = gv();
  if (id === "rc") { const a = as.rc.map(gm).filter((g) => g && !as.hid.includes(g.id)); return `<h3 class="sec">Recently played</h3>` + (a.length ? row(a) : `<p class="note">${trk() ? "Games you open will show up here." : "Recent games are off in Settings > Privacy."}</p>`); }
  if (id === "gotd") { const g = vis[hsh(td()) % (vis.length || 1)]; return g ? `<h3 class="sec">Game of the day</h3>` + feat(g) : ""; }
  if (id === "pin") { const a = [...new Set([...as.pin, ...as.fav])].map(gm).filter((g) => g && !as.hid.includes(g.id)); return a.length ? `<h3 class="sec">Pinned and favorites</h3>` + row(a) : ""; }
  if (id === "new") { const a = vis.slice().sort((x, y) => (y.ad > x.ad ? 1 : y.ad < x.ad ? -1 : 0) || (as.cg.includes(y) - as.cg.includes(x))).slice(0, 5); return `<h3 class="sec">New in your library</h3>` + row(a); }
  if (id === "dc") return `<h3 class="sec">Today's challenges</h3><ul class="chl">${chs().map((c) => `<li class="${c.ok ? "ok" : ""}">${c.ok ? "✅" : "⬜"} ${esc2(c.t)}</li>`).join("")}</ul>`;
  if (id === "qt") return `<h3 class="sec">Quote</h3><button class="qt" data-a="qt">“${esc2(QT[(hsh(td()) + (st.qi || 0)) % QT.length])}”</button>`;
  return "";
}
const feat = (g) => `<div class="feat" style="${esc2(thmb(g))}"><div class="fi"><b>${esc2(g.n)}</b><span>${esc2(g.ds)}</span><div class="gb">${bd(g)}</div><button class="obtn" data-a="play" data-id="${g.id}">Play now</button></div></div>`;

function vhome() {
  const nm = as.us ? as.us.nm.split(" ")[0] : "", wl = as.cf.wl || (nm ? "Welcome back, " + nm : "Welcome back");
  return `<div class="ahero"><div><h2>${esc2(wl)}</h2><p id="arc-date"></p></div><div class="clk" id="arc-clk"></div></div>` + as.cf.ord.filter((i) => !as.cf.hd[i]).map(sec).join("");
}
function vlib() {
  const pls = Object.keys(as.pl);
  return `<div class="tools"><input id="arc-q" type="search" placeholder="Search by name, genre, or multiplayer" value="${esc2(st.qy)}" aria-label="Search games"></div>
  <div class="chips">${["All", ...CATS, "Favorites", ...pls.map((p) => "pl:" + p)].map((c) => `<button data-a="cat" data-c="${esc2(c)}" class="${st.cat === c ? "on" : ""}">${c.startsWith("pl:") ? "📁 " + esc2(c.slice(3)) : (CI[c] || (c === "Favorites" ? "★" : "")) + " " + c}</button>`).join("")}</div>
  <div class="chips sm"><label class="tg"><input type="checkbox" data-a="mob" ${st.mob ? "checked" : ""}> iPhone-friendly only</label><label class="tg"><input type="checkbox" data-a="sh" ${st.sh ? "checked" : ""}> Show hidden (${as.hid.length})</label><button data-a="rnd" class="ghost">🎲 Random</button></div>
  <div class="ggrid" id="arc-grid">${grid()}</div>`;
}
function vstats() {
  const all = ga(), top = all.filter((g) => as.cnt[g.id]).sort((a, b) => as.cnt[b.id] - as.cnt[a.id]), gc = {};
  for (const g of all) for (const c of g.g) gc[c] = (gc[c] || 0) + (as.cnt[g.id] || 0);
  const fg = Object.entries(gc).sort((a, b) => b[1] - a[1])[0], lp = all.filter((g) => as.last[g.id]).sort((a, b) => as.last[b.id] - as.last[a.id])[0];
  const t = (n, l) => `<div class="stile"><b>${n}</b><span>${l}</span></div>`;
  return `<div class="stiles">${t(as.tot, "Games opened")}${t(top[0] ? esc2(top[0].n) : "—", "Most played")}${t(fg && fg[1] ? fg[0] : "—", "Favorite genre")}${t(stk() + " day" + (stk() === 1 ? "" : "s"), "Gaming streak")}${t(fdur(tsec()), "Total playtime")}${t(lp ? esc2(lp.n) : "—", "Last played")}</div>
  <p class="note">Playtime only counts time while this page is open and visible with a game on screen. It can't see what happens inside a game.</p>
  <h3 class="sec">Every game</h3><div class="tbl"><div class="tr th"><span>Game</span><span>Opens</span><span>Time</span><span>Last</span></div>${all.map((g) => `<div class="tr"><span>${g.e} ${esc2(g.n)}${as.rate[g.id] ? " " + "★".repeat(as.rate[g.id]) : ""}</span><span>${as.cnt[g.id] || 0}</span><span>${fdur(as.secs[g.id] || 0)}</span><span>${ago(as.last[g.id])}</span></div>`).join("")}</div>`;
}
function qzv() {
  const Q = [["What do you feel like?", [["🎯 Shooting", "shoot"], ["🧱 Building", "Sandbox"], ["🧠 Strategy", "Strategy"], ["🐍 Grow and survive", "Survival"], ["🎲 Anything", ""]]], ["Playing on iPhone with touch?", [["Yes, touch only", "t"], ["No, keyboard is fine", "k"]]], ["How intense?", [["😌 Chill", 1], ["🙂 Medium", 2], ["😤 Sweaty", 3]]]];
  const z = st.qz; if (!z) return `<button class="obtn" data-a="qz0">Start the game finder</button>`;
  if (z.s < 3) return `<p><b>${Q[z.s][0]}</b></p><div class="chips">${Q[z.s][1].map((o, i) => `<button data-a="qza" data-i="${i}">${o[0]}</button>`).join("")}</div>`;
  const [a, b, c] = z.a.map((x, i) => Q[i][1][x][1]);
  const sc = gv().map((g) => { let s = 0; if (a === "shoot") s += g.g.includes("FPS") || g.g.includes("Battle Royale") ? 3 : 0; else if (a) s += g.g.includes(a) ? 3 : 0; if (b === "t") s += g.mo === "good" ? 2 : -6; s -= Math.abs(g.lv - c); return [s, g]; }).sort((x, y) => y[0] - x[0]).slice(0, 3);
  return `<p><b>Try these:</b></p><div class="ggrid">${sc.map((x) => card(x[1])).join("")}</div><button class="ghost" data-a="qz0">Start over</button>`;
}
function cmpv() {
  const a = ga(), sel = (i) => `<select data-a="cmp" data-i="${i}"><option value="">Pick a game</option>${a.map((g) => `<option value="${g.id}" ${st.cmp[i] === g.id ? "selected" : ""}>${esc2(g.n)}</option>`).join("")}</select>`;
  const [x, y] = st.cmp.map((i) => gm(i)), r = (l, f) => `<div class="tr"><span>${l}</span><span>${x ? f(x) : "—"}</span><span>${y ? f(y) : "—"}</span></div>`;
  return `<div class="atwo">${sel(0)}${sel(1)}</div>` + (x || y ? `<div class="tbl c3">${r("Genre", (g) => esc2(g.g.join(", ")))}${r("Controls", (g) => esc2(g.ct))}${r("iPhone", (g) => (g.mo === "good" ? "Good" : "Test it"))}${r("Multiplayer", (g) => (g.g.includes("Multiplayer") ? "Yes" : "No"))}${r("Intensity", (g) => "🔥".repeat(g.lv))}${r("Your rating", (g) => (as.rate[g.id] ? "★".repeat(as.rate[g.id]) : "—"))}</div>` : "");
}
function vdisc() {
  const vis = gv(), top = vis.filter((g) => as.cnt[g.id]).sort((a, b) => as.cnt[b.id] - as.cnt[a.id]).slice(0, 5);
  return `${sec("gotd")}<div class="chips"><button data-a="rnd" class="obtn sm">🎲 Random game</button></div>
  <h3 class="sec">Most opened by you</h3>${top.length ? row(top) : '<p class="note">Open some games and your favorites show up here.</p>'}
  ${sec("new")}
  <h3 class="sec">Game finder quiz</h3><div class="card2">${qzv()}</div>
  <h3 class="sec">Compare two games</h3><div class="card2">${cmpv()}</div>
  <h3 class="sec">Request a game</h3><form class="card2 fm" data-f="req"><input name="n" placeholder="Game name" required><input name="u" placeholder="Link (optional)" inputmode="url"><button class="obtn sm">Save request</button></form>
  ${as.req.length ? `<ul class="rq">${as.req.map((r, i) => `<li><span><b>${esc2(r.n)}</b> ${esc2(r.u)}</span>${r.u ? `<button data-a="rqadd" data-i="${i}" class="ghost">Add to library</button>` : ""}<button data-a="rqcp" data-i="${i}" class="ghost">Copy</button><button data-a="rqdel" data-i="${i}" class="x" aria-label="Delete">×</button></li>`).join("")}</ul><p class="note">Requests stay on this device. Copy one and send it to whoever runs your copy of the app.</p>` : ""}
  <h3 class="sec">Add your own game</h3><form class="card2 fm" data-f="cg"><input name="n" placeholder="Name" required><input name="u" placeholder="https://…" inputmode="url" required><select name="c">${CATS.map((c) => `<option>${c}</option>`).join("")}</select><button class="obtn sm">Add</button></form>`;
}
function vfun() {
  const n = Object.keys(as.ach).length;
  return `<h3 class="sec">Achievements (${n}/${AC.length})</h3><div class="achs">${AC.map(([id, nm, ds]) => `<div class="ach ${as.ach[id] ? "on" : ""}"><b>${as.ach[id] ? "🏆" : "🔒"} ${nm}</b><span>${ds}</span></div>`).join("")}</div>
  ${sec("dc")}
  <h3 class="sec">Playlists</h3><form class="fm inl" data-f="pl"><input name="n" placeholder="New playlist name" required><button class="obtn sm">Create</button></form>
  <div class="pls">${Object.entries(as.pl).map(([k, l]) => `<div class="pl"><b>📁 ${esc2(k)}</b> <small>${l.length} game${l.length === 1 ? "" : "s"}</small> <button class="ghost" data-a="plgo" data-k="${esc2(k)}">Open</button> <button class="x" data-a="pldel" data-k="${esc2(k)}" aria-label="Delete playlist">×</button></div>`).join("") || '<p class="note">Add games to a playlist from a game\'s ⋯ menu.</p>'}</div>
  <h3 class="sec">Screenshot gallery</h3><p class="note">Browsers can't capture another site's game, so take a screenshot with your device (iPhone: side button + volume up), then add it here.</p>
  <div class="fm inl"><select id="arc-shg">${ga().map((g) => `<option value="${g.id}">${esc2(g.n)}</option>`).join("")}</select><label class="obtn sm filebtn">Add screenshot<input type="file" accept="image/*" data-a="shadd" hidden></label></div><div class="shots" id="arc-shots"></div>
  ${sec("qt")}<p class="note">Psst: tap the arcade logo 7 times.</p>`;
}
const sel = (p, v, o) => `<select data-s="${p}">${o.map(([k, l]) => `<option value="${k}" ${String(v) === String(k) ? "selected" : ""}>${l}</option>`).join("")}</select>`;
const chk = (p, v, l) => `<label class="tg"><input type="checkbox" data-s="${p}" ${v ? "checked" : ""}> ${l}</label>`;
const SN = { dc: "Daily challenges", rc: "Recently played", gotd: "Game of the day", pin: "Pinned and favorites", new: "New in library", qt: "Quote" };
function vset() {
  const c = as.cf, gid = CFG.gid || c.gid;
  const acct = as.us ? `<div class="acct">${as.us.pic ? `<img src="${esc2(as.us.pic)}" alt="" referrerpolicy="no-referrer">` : ""}<div><b>${esc2(as.us.nm)}</b><br><small>${esc2(as.us.em)}</small></div><button class="ghost" data-a="gout">Sign out</button></div>`
    : gid ? `<div id="arc-gbtn"></div><p class="note">This only identifies you on this device for a personal welcome. It does not sync your data.</p>`
    : `<p class="note">To turn on Sign in with Google, create a free OAuth Client ID (steps in README.md), add your site's address as an authorized JavaScript origin, and paste the Client ID here.</p><div class="fm inl"><input data-s="cf.gid" placeholder="123456789-abc.apps.googleusercontent.com" value="${esc2(c.gid)}"><button class="obtn sm" data-a="gsave">Save</button></div>`;
  return `<h3 class="sec">Account</h3><div class="card2">${acct}</div>
  <h3 class="sec">Personalization</h3><div class="card2 sg">
   <label>App name<input data-s="cf.nm" value="${esc2(c.nm)}" placeholder="Arcade" maxlength="24"></label>
   <label>Logo (emoji)<input data-s="cf.lg" value="${esc2(c.lg)}" maxlength="4"></label>
   <label class="filebtn ghost">Upload logo image<input type="file" accept="image/*" data-a="lgup" hidden></label>${c.lgi ? '<button class="ghost" data-a="lgrm">Remove logo image</button>' : ""}
   <label>Welcome message<input data-s="cf.wl" value="${esc2(c.wl)}" placeholder="Welcome back" maxlength="60"></label>
   <label>Theme ${sel("cf.theme", c.theme, [["default", "Default teal"], ["blue", "Neon blue"], ["purple", "Purple"], ["red", "Red"], ["black", "Black"], ["green", "Matrix green"], ...(as.fl.egg ? [["rainbow", "Rainbow (secret)"]] : [])])}</label>
   <label>Accent color <span class="accrow"><input type="color" data-s="cf.accent" value="${c.accent || "#5ef0d0"}"><button class="ghost" data-a="accrs">Reset</button></span></label>
   <label>Animations ${sel("cf.an", c.an, [["full", "Full"], ["low", "Reduced"], ["off", "Off"]])}</label>${chk("cf.bg", c.bg, "Animated background")}
   <label>Sound effects ${sel("cf.sfx", c.sfx, [["off", "Off"], ["soft", "Soft"], ["arcade", "Arcade"], ["retro", "Retro"]])}</label></div>
  <h3 class="sec">Homepage layout</h3><div class="card2">${c.ord.map((i, n) => `<div class="ordr"><span>${chk("hd." + i, !c.hd[i], SN[i])}</span><button class="ghost" data-a="up" data-i="${n}" aria-label="Move up">↑</button><button class="ghost" data-a="dn" data-i="${n}" aria-label="Move down">↓</button></div>`).join("")}</div>
  <h3 class="sec">Music</h3><div class="card2 sg"><label>Background music ${sel("cf.mus", c.mus, [["off", "Off"], ["chill", "Chill"], ["neon", "Neon"], ["dark", "Dark"]])}</label><label>Volume <input type="range" min="0" max="100" value="${c.vol}" data-s="cf.vol"></label><p class="note">Made live in your browser, so there are no music files. Game audio is separate and has its own volume.</p></div>
  <h3 class="sec">Privacy</h3><div class="card2 sg">${chk("cf.trk", c.trk, "Remember recents, stats and play history")}${chk("cf.wipe", c.wipe, "Erase recents and stats when I exit")}${chk("cf.keep", c.keep, "Keep games open when I switch apps")}
   <p class="note">Games open inside this page and the page's address never changes, so nothing is added to browser history. Your network (like a school or workplace Wi-Fi) can still see which sites your device contacts.</p>
   <div class="chips sm"><button class="ghost" data-a="clr1">Clear recents</button><button class="ghost" data-a="clr2">Clear stats</button><button class="ghost" data-a="clr3">Clear notes and ratings</button><button class="ghost danger" data-a="clr4">Delete all Arcade data</button></div></div>
  <h3 class="sec">Backup</h3><div class="card2 chips sm"><button class="ghost" data-a="exp">Export settings</button><label class="ghost filebtn">Restore from file<input type="file" accept="application/json" data-a="imp" hidden></label></div><p class="note">Export includes favorites, notes, ratings, stats and settings. Screenshots stay on this device.</p>
  <h3 class="sec">Tools</h3><div class="card2"><p id="arc-cn">${conn()}</p><div class="chips sm"><button class="ghost" data-a="chkall">Check all game links</button>${deferred ? '<button class="ghost" data-a="inst">Install this app</button>' : ""}</div><div id="arc-chk"></div><p class="note">The link check tells you whether a site answers. A site that answers can still refuse to load inside another page. If a game is blank, open Fix in the player.${/iPhone|iPad/.test(navigator.userAgent) ? " To install on iPhone: Share > Add to Home Screen." : ""}</p></div>`;
}

const TABS = [["home", "🏠 Home"], ["lib", "📚 Library"], ["disc", "✨ Discover"], ["fun", "🏆 Fun"], ["stats", "📊 Stats"], ["set", "⚙️ Settings"]];
function hdr() { const c = as.cf; return `<div class="ahead"><button class="logo" data-a="logo" aria-label="Logo">${c.lgi ? `<img src="${esc2(c.lgi)}" alt="">` : esc2(c.lg || "🎮")}</button><b>${esc2(c.nm || "Arcade")}</b><span class="grow"></span><span class="conn" id="arc-cn2">${conn()}</span></div>`; }
function rd() {
  clearInterval(ck); const root = q("#pane-arcade"); if (!root) return; dcr();
  const V = { home: vhome, lib: vlib, disc: vdisc, fun: vfun, stats: vstats, set: vset }[st.v]();
  root.innerHTML = hdr() + `<nav class="anav" role="tablist">${TABS.map(([k, l]) => `<button data-a="tab" data-v="${k}" class="${st.v === k ? "on" : ""}">${l}</button>`).join("")}</nav><div class="amain" id="arc-main">${V}</div>`;
  const clk = q("#arc-clk"); if (clk) { const t = () => { const n = new Date(); clk.textContent = n.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); q("#arc-date").textContent = n.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }); }; t(); ck = setInterval(t, 1000); }
  if (st.v === "fun") shw();
  if (st.v === "set" && !as.us && (CFG.gid || as.cf.gid)) gbtn();
}
async function shw() {
  const b = q("#arc-shots"); if (!b) return; const l = (await shl()).reverse();
  b.innerHTML = l.length ? l.map((s) => `<figure><img src="${s.img}" alt="Screenshot"><figcaption>${esc2((gm(s.gid) || {}).n || "")} <button class="x" data-a="shdel" data-id="${s.id}" aria-label="Delete">×</button></figcaption></figure>`).join("") : '<p class="note">No screenshots yet.</p>';
}

// ---------- Google sign-in ----------
let deferred = null; window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; });
function jwt(t) { const p = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"); return JSON.parse(decodeURIComponent(atob(p).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""))); }
function gbtn() {
  const id = CFG.gid || as.cf.gid, box = q("#arc-gbtn"); if (!id || !box) return;
  const go = () => {
    try {
      google.accounts.id.initialize({ client_id: id, callback: (r) => { try { const p = jwt(r.credential); as.us = { nm: p.name || p.email, em: p.email, pic: p.picture || "", sub: p.sub }; sv(); toast("Signed in as " + as.us.nm); ckach(); rd(); } catch { toast("Sign-in failed. Try again."); } } });
      google.accounts.id.renderButton(box, { theme: "filled_black", size: "large", shape: "pill", text: "signin_with" });
    } catch { box.textContent = "Google sign-in couldn't start. Check the Client ID and that this site's address is an authorized origin."; }
  };
  if (window.google && google.accounts && google.accounts.id) return go();
  box.textContent = "Loading Google sign-in…";
  const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = () => { box.textContent = ""; go(); };
  s.onerror = () => { box.textContent = "Couldn't reach Google. Check your connection (or this network may block it)."; }; document.head.append(s);
}

// ---------- player ----------
let pl = null;
function playerEl() {
  let o = q("#arc-play"); if (o) return o;
  o = document.createElement("div"); o.id = "arc-play"; o.hidden = true;
  o.innerHTML = `<div class="ap-bar"><button data-p="back">‹ Back</button><b id="ap-n"></b><span id="ap-cn" class="conn"></span><span class="grow"></span><button data-p="rel" aria-label="Reload">↻</button><button data-p="fix">Fix</button><button data-p="full" aria-label="Full screen">⛶</button></div>
  <div class="ap-prog"><i id="ap-pi"></i></div><div class="ap-msg" id="ap-m"></div><div class="ap-tip" id="ap-tip" hidden><span></span><button data-p="tipx" aria-label="Dismiss">×</button></div><div class="ap-body" id="ap-b"></div>
  <button class="ap-x" data-p="full" hidden aria-label="Exit full screen">✕</button>
  <div class="ap-fix" id="ap-f" hidden></div>`;
  q("#vault").append(o); o.addEventListener("click", pclick); return o;
}
function setp(v, err) { const i = q("#ap-pi"); if (i) { i.style.width = v + "%"; i.className = err ? "err" : ""; } }
function pmsg(t, k) { const m = q("#ap-m"); if (m) { m.textContent = t; m.dataset.k = k || ""; } }
function rec(g) {
  if (!trk()) return; const d = dcr(), nw = !as.cnt[g.id];
  as.cnt[g.id] = (as.cnt[g.id] || 0) + 1; as.last[g.id] = Date.now(); as.rc = [g.id, ...as.rc.filter((x) => x !== g.id)].slice(0, 12); as.tot++;
  if (!as.days.includes(td())) as.days.push(td()); as.days = as.days.slice(-400);
  if (!d.op.includes(g.id)) d.op.push(g.id); g.g.forEach((c) => { if (!d.ct.includes(c)) d.ct.push(c); }); if (nw) d.nw++; ckach();
}
function pload(bust) {
  const g = pl.g, b = q("#ap-b"); clearInterval(pl.pi); clearTimeout(pl.to1); clearTimeout(pl.to2); b.innerHTML = ""; q("#ap-f").hidden = true;
  if (!navigator.onLine) { setp(100, true); pmsg("You're offline. Reconnect, then tap ↻.", "err"); return; }
  setp(6); pmsg("Connecting…");
  let u = gu(g); if (bust) u += (u.includes("?") ? "&" : "?") + "_=" + Date.now();
  const f = document.createElement("iframe"); f.title = g.n; f.referrerPolicy = "no-referrer";
  f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-modals");
  f.setAttribute("allow", "fullscreen; gamepad; autoplay; clipboard-write; accelerometer; gyroscope"); f.allowFullscreen = true;
  let done = false, p = 6;
  f.onload = () => { done = true; clearInterval(pl.pi); setp(100); pmsg("Loaded. If the box is blank or says refused to connect, tap Fix.", "ok"); setTimeout(() => { const i = q("#ap-pi"); if (i) i.style.opacity = 0; }, 800); };
  q("#ap-pi").style.opacity = 1;
  pl.pi = setInterval(() => { if (done) return; p += (88 - p) * 0.06; setp(p); }, 250);
  pl.to1 = setTimeout(() => { if (!done) pmsg("Still loading… a slow network or a busy game server can cause this.", "warn"); }, 9000);
  pl.to2 = setTimeout(() => { if (!done) { setp(100, true); pmsg("This is taking too long. The site may be down, or may not allow loading inside another page. Tap Fix.", "err"); } }, 25000);
  f.src = u; b.append(f); pmsg("Loading " + g.n + "…");
  probe(gu(g)).then((r) => {
    if (!pl || pl.g !== g) return; as.bad[g.id] = { ...(as.bad[g.id] || {}), ok: r.ok, ms: r.ms, t: Date.now() }; sv();
    if (!r.ok && navigator.onLine) { clearInterval(pl.pi); setp(100, true); pmsg(r.to ? "Can't reach " + new URL(gu(g)).hostname + " (timed out). It may be down or blocked on this network." : "Can't reach " + new URL(gu(g)).hostname + ". It may be down or blocked on this network.", "err"); }
    else if (r.ok) { const c = q("#ap-cn"); if (c) c.textContent = conn() + " · server " + r.ms + " ms"; }
  });
}
function popen(id) {
  const g = gm(id); if (!g) return; pstop(); sx("ok");
  const o = playerEl(); pl = { g }; o.hidden = false; o.classList.remove("full"); q(".ap-x", o).hidden = true; document.body.classList.add("arc-playing");
  q("#ap-n").textContent = g.n; q("#ap-cn").textContent = conn(); rec(g); sv();
  tk = setInterval(() => { if (document.hidden || !trk() || !pl) return; as.secs[g.id] = (as.secs[g.id] || 0) + 1; dcr().secs++; if (++tkn % 10 === 0) { sv(); ckach(); } }, 1000);
  pload(false);
  const tp = q("#ap-tip"); tp.hidden = !g.tp; if (g.tp) q("span", tp).textContent = "Tip: " + g.tp;
}
function pstop() {
  clearInterval(tk); tk = null; if (pl) { clearInterval(pl.pi); clearTimeout(pl.to1); clearTimeout(pl.to2); } pl = null;
  const o = q("#arc-play"); if (o) { const b = q("#ap-b"); if (b) b.innerHTML = ""; o.hidden = true; o.classList.remove("full"); }
  document.body.classList.remove("arc-playing"); try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} sv();
}
function pfix() {
  const g = pl.g, f = q("#ap-f"); f.hidden = !f.hidden; if (f.hidden) return;
  f.innerHTML = `<h3>Troubleshooting ${esc2(g.n)}</h3><div class="chips sm"><button data-p="rel">↻ Reload</button><button data-p="hard">Reload with fresh cache</button><button data-p="test">Test connection</button><button data-p="blank">The screen is blank</button></div>
  <label class="lbl2">Use a different link for this game<input id="ap-u" value="${esc2(gu(g))}" inputmode="url"></label><div class="chips sm"><button data-p="usave">Save link</button><button data-p="ureset">Reset to default</button></div>
  <ul class="tips"><li>Rotate to landscape for more room.</li><li>Close other tabs and turn off Low Power Mode if it stutters.</li><li>Add the app to your Home Screen for a cleaner full screen.</li><li>If the site never loads, it may block being shown inside another page. Try a different link above.</li></ul><p id="ap-t" class="note"></p><button data-p="fix" class="ghost">Close</button>`;
}
async function pclick(e) {
  const b = e.target.closest("[data-p]"); if (!b || !pl) return; const a = b.dataset.p, g = pl.g; sx("tap");
  if (a === "tipx") q("#ap-tip").hidden = true; else if (a === "back") pstop(); else if (a === "rel") pload(false); else if (a === "hard") pload(true); else if (a === "fix") pfix();
  else if (a === "full") { const o = q("#arc-play"), on = !o.classList.contains("full"); o.classList.toggle("full", on); q(".ap-x", o).hidden = !on; if (on && o.requestFullscreen) o.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
  else if (a === "test") { const t = q("#ap-t"); t.textContent = "Testing…"; const r = await probe(gu(g)); as.bad[g.id] = { ...(as.bad[g.id] || {}), ok: r.ok, ms: r.ms, t: Date.now() }; sv(); t.textContent = r.ok ? "The site answered in " + r.ms + " ms. If it's still blank, it likely blocks embedding. Try a different link." : "No answer" + (r.to ? " (timed out)" : "") + ". " + conn() + ". The site may be down or blocked on this network."; }
  else if (a === "blank") { as.bad[g.id] = { ...(as.bad[g.id] || {}), blank: true }; sv(); q("#ap-t").textContent = "Marked as blocking embedding. You'll see a warning on its card. Try a different link for it above."; }
  else if (a === "usave") { const v = q("#ap-u").value.trim(); if (!/^https?:\/\//i.test(v)) { q("#ap-t").textContent = "Links need to start with https://"; return; } as.url[g.id] = v; delete (as.bad[g.id] || {}).blank; sv(); pload(false); }
  else if (a === "ureset") { delete as.url[g.id]; sv(); q("#ap-u").value = g.u; pload(false); }
}

// ---------- details dialog ----------
function more(id) {
  const g = gm(id); if (!g) return; let d = q("#arc-dlg"); if (d) d.remove();
  d = document.createElement("dialog"); d.id = "arc-dlg"; q("#vault").append(d);
  const r = as.rate[id] || 0, pls = Object.keys(as.pl), cu = as.cg.includes(g);
  d.innerHTML = `<h2>${g.e} ${esc2(g.n)}</h2><p class="note">${esc2(g.ds)} · ${esc2(g.ct)}</p><div class="gb">${bd(g)}</div>${g.tp ? `<p class="note">${esc2(g.tp)}</p>` : ""}
  <div class="stars" role="group" aria-label="Rating">${[1, 2, 3, 4, 5].map((n) => `<button data-d="rate" data-n="${n}" class="${n <= r ? "on" : ""}" aria-label="${n} stars">★</button>`).join("")}</div>
  <label class="lbl2">Notes<textarea id="d-note" rows="3" placeholder="Controls, tips, your best score…">${esc2(as.note[id] || "")}</textarea></label>
  <div class="lbl2">Playlists</div><div class="chips sm">${pls.map((p) => `<label class="tg"><input type="checkbox" data-d="pl" data-k="${esc2(p)}" ${as.pl[p].includes(id) ? "checked" : ""}> ${esc2(p)}</label>`).join("") || '<span class="note">Make one in the Fun tab.</span>'}</div>
  <div class="chips sm"><label class="ghost filebtn">Custom thumbnail<input type="file" accept="image/*" data-d="th" hidden></label>${as.th[id] ? '<button class="ghost" data-d="thrm">Remove thumbnail</button>' : ""}<button class="ghost" data-d="chk">Check link</button><button class="ghost" data-d="hide">${as.hid.includes(id) ? "Unhide" : "Hide"} game</button>${cu ? '<button class="ghost danger" data-d="del">Remove game</button>' : ""}</div><p class="note" id="d-m"></p>
  <div class="btnrow end"><button class="btn line" data-d="close">Close</button><button class="btn" data-d="play">Play</button></div>`;
  d.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-d]"); if (!b) return; const a = b.dataset.d;
    if (a === "close") d.close(); else if (a === "play") { d.close(); popen(id); }
    else if (a === "rate") { as.rate[id] = as.rate[id] === +b.dataset.n ? 0 : +b.dataset.n; dcr().rt++; sv(); sx("tap"); ckach(); qa(".stars button", d).forEach((x) => x.classList.toggle("on", +x.dataset.n <= as.rate[id])); }
    else if (a === "hide") { as.hid = as.hid.includes(id) ? as.hid.filter((x) => x !== id) : [...as.hid, id]; sv(); d.close(); rd(); }
    else if (a === "del") { as.cg = as.cg.filter((x) => x.id !== id); sv(); d.close(); rd(); }
    else if (a === "thrm") { delete as.th[id]; sv(); d.close(); rd(); }
    else if (a === "chk") { const m = q("#d-m", d); m.textContent = "Checking…"; const r = await probe(gu(g)); as.bad[id] = { ...(as.bad[id] || {}), ok: r.ok, ms: r.ms, t: Date.now() }; sv(); m.textContent = r.ok ? "Reachable (" + r.ms + " ms)." : "Can't reach it" + (r.to ? " (timed out)" : "") + "."; }
  });
  d.addEventListener("input", (e) => { if (e.target.id === "d-note") { as.note[id] = e.target.value; clearTimeout(d._t); d._t = setTimeout(() => { sv(); ckach(); }, 500); } });
  d.addEventListener("change", async (e) => {
    const t = e.target, a = t.dataset.d;
    if (a === "pl") { const l = as.pl[t.dataset.k] || (as.pl[t.dataset.k] = []); as.pl[t.dataset.k] = t.checked ? [...new Set([...l, id])] : l.filter((x) => x !== id); sv(); }
    else if (a === "th" && t.files[0]) { try { as.th[id] = await rsz(t.files[0], 360, 0.8); sv(); d.close(); rd(); } catch { q("#d-m", d).textContent = "Couldn't read that image."; } }
  });
  d.addEventListener("close", () => { d.remove(); if (st.v === "lib") rd(); });
  d.showModal();
}

// ---------- clicks + inputs ----------
function setp2(path, v) { const k = path.split("."); let o = as; for (let i = 0; i < k.length - 1; i++) o = o[k[i]]; o[k[k.length - 1]] = v; }
async function onclick(e) {
  const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a, id = b.dataset.id;
  if (b.type === "checkbox" || b.type === "file" || b.tagName === "SELECT") return;
  if (a !== "play") sx("tap");
  if (a === "tab") { st.v = b.dataset.v; rd(); }
  else if (a === "play") popen(id);
  else if (a === "fav") { as.fav = as.fav.includes(id) ? as.fav.filter((x) => x !== id) : [...as.fav, id]; sv(); ckach(); const gd = q("#arc-grid"); if (gd) gd.innerHTML = grid(); else rd(); }
  else if (a === "pin") { as.pin = as.pin.includes(id) ? as.pin.filter((x) => x !== id) : [...as.pin, id]; sv(); const gd = q("#arc-grid"); if (gd) gd.innerHTML = grid(); else rd(); }
  else if (a === "more") more(id);
  else if (a === "cat") { st.cat = b.dataset.c; rd(); }
  else if (a === "rnd") { const v = gv(); if (v.length) popen(v[Math.floor(Math.random() * v.length)].id); }
  else if (a === "qt") { st.qi = (st.qi || 0) + 1; rd(); }
  else if (a === "qz0") { st.qz = { s: 0, a: [] }; rd(); }
  else if (a === "qza") { st.qz.a.push(+b.dataset.i); st.qz.s++; if (st.qz.s === 3) { as.fl.quiz = 1; ckach(); } rd(); }
  else if (a === "rqcp") { const r = as.req[+b.dataset.i]; try { await navigator.clipboard.writeText("Game request: " + r.n + (r.u ? " " + r.u : "")); toast("Copied"); } catch { toast("Couldn't copy. Select the text instead."); } }
  else if (a === "rqdel") { as.req.splice(+b.dataset.i, 1); sv(); rd(); }
  else if (a === "rqadd") { const r = as.req[+b.dataset.i]; addcg(r.n, r.u, "Multiplayer"); }
  else if (a === "plgo") { st.cat = "pl:" + b.dataset.k; st.v = "lib"; rd(); }
  else if (a === "pldel") { delete as.pl[b.dataset.k]; sv(); rd(); }
  else if (a === "shdel") { await shdel(+id); shw(); }
  else if (a === "logo") { st.lc = (st.lc || 0) + 1; clearTimeout(st.lt); st.lt = setTimeout(() => (st.lc = 0), 2500); if (st.lc >= 7) { st.lc = 0; egg(); } }
  else if (a === "up" || a === "dn") { const i = +b.dataset.i, j = a === "up" ? i - 1 : i + 1, o = as.cf.ord; if (j >= 0 && j < o.length) { [o[i], o[j]] = [o[j], o[i]]; sv(); rd(); } }
  else if (a === "accrs") { as.cf.accent = ""; sv(); thm(); rd(); }
  else if (a === "lgrm") { as.cf.lgi = ""; sv(); rd(); }
  else if (a === "gsave") { as.cf.gid = (q("[data-s='cf.gid']").value || "").trim(); sv(); rd(); }
  else if (a === "gout") { try { google.accounts.id.disableAutoSelect(); } catch {} as.us = null; sv(); rd(); }
  else if (a === "clr1") { as.rc = []; sv(); toast("Recents cleared"); }
  else if (a === "clr2") { as.cnt = {}; as.last = {}; as.secs = {}; as.days = []; as.tot = 0; as.dc = {}; sv(); toast("Stats cleared"); }
  else if (a === "clr3") { as.note = {}; as.rate = {}; sv(); toast("Notes and ratings cleared"); }
  else if (a === "clr4") { if (confirm("Delete ALL Arcade data on this device (favorites, notes, stats, screenshots, settings)?")) { try { localStorage.removeItem("arc.v1"); } catch {} await shclr(); as = JSON.parse(JSON.stringify(DEF)); musc(); thm(); rd(); toast("Arcade data deleted"); } }
  else if (a === "exp") { const x = document.createElement("a"); x.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "arcade", v: 1, data: as }, null, 2)], { type: "application/json" })); x.download = "arcade-backup-" + td() + ".json"; x.click(); setTimeout(() => URL.revokeObjectURL(x.href), 2000); }
  else if (a === "inst") { if (deferred) { deferred.prompt(); deferred = null; rd(); } }
  else if (a === "chkall") { const out = q("#arc-chk"); out.innerHTML = ""; for (const g of ga()) { const p = document.createElement("p"); p.className = "note"; p.textContent = g.n + ": checking…"; out.append(p); const r = await probe(gu(g), 7000); as.bad[g.id] = { ...(as.bad[g.id] || {}), ok: r.ok, ms: r.ms, t: Date.now() }; p.textContent = (r.ok ? "✅ " : "❌ ") + g.n + (r.ok ? " (" + r.ms + " ms)" : r.to ? " (timed out)" : " (no answer)"); } sv(); }
}
function addcg(n, u, c) {
  if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, "");
  try { new URL(u); } catch { toast("That link doesn't look right."); return; }
  const h = hsh(n + u) % 360; as.cg.push({ id: "c" + Date.now(), n, u, g: [c, ...(c === "Multiplayer" ? [] : ["Multiplayer"])].filter((x, i, ar) => ar.indexOf(x) === i), mo: "test", ct: "Unknown, test it", e: "🎮", c: ["hsl(" + h + ",60%,45%)", "hsl(" + ((h + 50) % 360) + ",50%,20%)"], lv: 2, ds: "Added by you.", ad: td() }); sv(); ckach(); toast("Added " + n); rd();
}
function egg() { as.fl.egg = 1; as.cf.theme = "rainbow"; sv(); thm(); ckach(); toast("🌈 Secret theme unlocked"); if (st.v === "set") rd(); }
async function onchange(e) {
  const t = e.target, s = t.dataset.s, a = t.dataset.a;
  if (s) {
    if (s.startsWith("hd.")) as.cf.hd[s.slice(3)] = !t.checked; else setp2(s, t.type === "checkbox" ? t.checked : t.type === "range" ? +t.value : t.value);
    if (s === "cf.vol" && mu.g) mu.g.gain.value = (as.cf.vol / 100) * 0.5;
    sv(); thm(); if (s === "cf.mus") { musc(); ckach(); } if (s === "cf.theme" || s === "cf.accent") ckach(); if (/^cf\.(nm|lg)$/.test(s)) { const h = q(".ahead"); if (h) h.outerHTML = hdr(); } sx("tap");
  } else if (a === "mob") { st.mob = t.checked; q("#arc-grid").innerHTML = grid(); } else if (a === "sh") { st.sh = t.checked; q("#arc-grid").innerHTML = grid(); }
  else if (a === "cmp") { st.cmp[+t.dataset.i] = t.value || null; rd(); }
  else if (a === "shadd" && t.files[0]) { try { await shadd({ gid: q("#arc-shg").value, ts: Date.now(), img: await rsz(t.files[0], 800, 0.7) }); as.fl.shot = 1; ckach(); shw(); toast("Screenshot saved"); } catch { toast("Couldn't save that image."); } }
  else if (a === "lgup" && t.files[0]) { try { as.cf.lgi = await rsz(t.files[0], 96, 0.85); sv(); rd(); } catch { toast("Couldn't read that image."); } }
  else if (a === "imp" && t.files[0]) { try { const j = JSON.parse(await t.files[0].text()); if (j.app !== "arcade" || !j.data) throw 0; as = { ...JSON.parse(JSON.stringify(DEF)), ...j.data }; as.cf = { ...DEF.cf, ...(j.data.cf || {}) }; sv(); thm(); musc(); rd(); toast("Restored"); } catch { toast("That isn't an Arcade backup file."); } }
}
function onsubmit(e) {
  const f = e.target.closest("form[data-f]"); if (!f) return; e.preventDefault(); const k = f.dataset.f, d = new FormData(f), n = (d.get("n") || "").trim();
  if (k === "req" && n) { as.req.push({ n, u: (d.get("u") || "").trim() }); sv(); toast("Request saved"); rd(); }
  else if (k === "cg" && n) addcg(n, (d.get("u") || "").trim(), d.get("c"));
  else if (k === "pl" && n) { if (!as.pl[n]) as.pl[n] = []; sv(); ckach(); rd(); }
}

// ---------- wiring ----------
const KON = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"]; let ki = 0;
document.addEventListener("keydown", (e) => { const v = q("#pane-arcade"); if (!v || v.hidden || !pl && !v.offsetParent) return; ki = e.key === KON[ki] ? ki + 1 : e.key === KON[0] ? 1 : 0; if (ki === KON.length) { ki = 0; egg(); } if (e.key === "Escape" && pl && q("#arc-play").classList.contains("full")) q("#arc-play .ap-x").click(); });
const root = q("#pane-arcade");
{ const t = document.createElement("div"); t.id = "arc-toast"; t.className = "toast2"; t.hidden = true; t.setAttribute("role", "status"); const v = q("#vault"); if (v) v.append(t); }
if (root) {
  root.addEventListener("click", onclick); root.addEventListener("change", onchange); root.addEventListener("submit", onsubmit);
  root.addEventListener("input", (e) => { if (e.target.id === "arc-q") { st.qy = e.target.value; q("#arc-grid").innerHTML = grid(); } else if (e.target.dataset.s === "cf.vol" && mu.g) mu.g.gain.value = e.target.value / 200; });
}
window.addEventListener("online", () => { const c = q("#arc-cn"); if (c) c.textContent = conn(); }); window.addEventListener("offline", () => { const c = q("#arc-cn"); if (c) c.textContent = conn(); });
if (navigator.connection && navigator.connection.addEventListener) navigator.connection.addEventListener("change", () => { for (const s of ["#arc-cn", "#arc-cn2", "#ap-cn"]) { const c = q(s); if (c) c.textContent = conn(); } });
window.arcEnter = () => { thm(); dcr(); if (trk() && !as.days.includes(td())) { as.days.push(td()); sv(); } rd(); if (as.cf.mus !== "off") musc(); };
window.arcLeave = () => { pstop(); };
window.arcStop = () => { pstop(); clearInterval(ck); clearTimeout(mu.t); mu.t = null; if (mu.g) { try { mu.g.disconnect(); } catch {} mu.g = null; } if (as.cf.wipe) { as.rc = []; as.cnt = {}; as.last = {}; as.secs = {}; as.days = []; as.tot = 0; as.dc = {}; } sv(); document.body.removeAttribute("data-at"); };
window.arcKeep = () => as.cf.keep;
window.arcTheme = thm;
thm();
})();
