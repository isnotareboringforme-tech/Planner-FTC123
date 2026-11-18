// ===== Study Planner =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ---------- data ----------
const DEFAULT_CLASSES = [
  { name: "Math", color: "#3b6cf6" }, { name: "English", color: "#e0568a" }, { name: "Science", color: "#12a58b" },
  { name: "History", color: "#d98a1c" }, { name: "Language", color: "#8b5cf6" }, { name: "Other", color: "#64748b" },
];
let items = load("planner.items.v1", []); if (!Array.isArray(items)) items = [];
let classes = load("planner.classes", null); if (!Array.isArray(classes) || !classes.length) classes = DEFAULT_CLASSES.map((c) => ({ ...c }));
let grades = load("planner.grades", []); if (!Array.isArray(grades)) grades = [];
let settings = { name: "", theme: "auto", accent: "#3b6cf6", ...(load("planner.settings", {}) || {}) };
const saveItems = () => store("planner.items.v1", items);
const saveClasses = () => store("planner.classes", classes);
const saveGrades = () => store("planner.grades", grades);
const saveSettings = () => store("planner.settings", settings);
const classColor = (n) => (classes.find((c) => c.name === n) || { color: "#64748b" }).color;
const findItem = (id) => items.find((i) => String(i.id) === String(id));

// ---------- dates ----------
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const daysUntil = (s) => Math.round((parse(s) - startOfToday()) / 864e5);
const fmt = (d, o = { month: "short", day: "numeric" }) => d.toLocaleDateString(undefined, o);
function dueLabel(s) {
  const n = daysUntil(s);
  if (n < 0) return n === -1 ? "Due yesterday" : `${-n} days overdue`;
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n < 7) return "Due " + fmt(parse(s), { weekday: "long" });
  return "Due " + fmt(parse(s));
}
const weekDays = (off) => { const b = startOfToday(); b.setDate(b.getDate() - b.getDay() + off * 7); return [...Array(7)].map((_, i) => { const d = new Date(b); d.setDate(b.getDate() + i); return d; }); };

// ---------- settings / theme ----------
function applySettings() {
  const r = document.documentElement;
  if (settings.theme === "auto") delete r.dataset.theme; else r.dataset.theme = settings.theme;
  r.style.setProperty("--accent", settings.accent);
  const dark = settings.theme === "dark" || (settings.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  $("meta[name=theme-color]").content = dark ? "#0f1626" : "#f3f5fb";
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applySettings);

// ---------- grades math ----------
const LET = [[93, "A", 4], [90, "A-", 3.7], [87, "B+", 3.3], [83, "B", 3], [80, "B-", 2.7], [77, "C+", 2.3], [73, "C", 2], [70, "C-", 1.7], [67, "D+", 1.3], [63, "D", 1], [60, "D-", 0.7]];
const letter = (p) => (LET.find((l) => p >= l[0]) || [0, "F", 0])[1];
const points = (p) => (LET.find((l) => p >= l[0]) || [0, "F", 0])[2];
function classStats(name) {
  const g = grades.filter((x) => x.cls === name); if (!g.length) return null;
  let num = 0, den = 0; g.forEach((x) => { const w = x.w || 1; num += (x.score / x.max) * w; den += w; });
  return { avg: (num / den) * 100, count: g.length };
}
const gradeClasses = () => { const names = [...new Set(grades.map((g) => g.cls))]; const order = classes.map((c) => c.name); return names.sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99 || a.localeCompare(b)); };
function overall() {
  const s = gradeClasses().map((n) => ({ n, ...classStats(n) })); if (!s.length) return null;
  return { avg: s.reduce((a, x) => a + x.avg, 0) / s.length, gpa: s.reduce((a, x) => a + points(x.avg), 0) / s.length, list: s };
}

// ---------- navigation ----------
let view = "home", tf = "open", tq = "", weekOff = 0;
function go(v) {
  view = v;
  $$(".view").forEach((s) => (s.hidden = s.id !== "v-" + v));
  $$("#nav button[data-view]").forEach((b) => { b.classList.toggle("on", b.dataset.view === v); if (b.dataset.view === v) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
  window.scrollTo(0, 0); render();
}
function render() { ({ home: renderHome, tasks: renderTasks, week: renderWeek, grades: renderGrades, tools: () => renderTools(), settings: renderSettings }[view])(); }
$("#nav").addEventListener("click", (e) => { const b = e.target.closest("[data-view]"); if (b) go(b.dataset.view); });
document.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go); });

// ---------- task rows ----------
function taskRow(it) {
  const n = daysUntil(it.due), st = it.done ? "done" : n < 0 ? "late" : n <= 1 ? "soon" : "";
  return `<li class="task ${st}" data-id="${it.id}" style="--c:${classColor(it.cls)}">
    <input type="checkbox" ${it.done ? "checked" : ""} aria-label="Mark ${esc(it.title)} done">
    <button class="tbody" data-edit aria-label="Edit ${esc(it.title)}">
      <span class="tt">${esc(it.title)}${it.star ? ' <i class="star" aria-label="important">★</i>' : ""}</span>
      <span class="tm"><b class="chip">${esc(it.cls)}</b><span class="due">${dueLabel(it.due)}</span></span>
    </button></li>`;
}
document.addEventListener("change", (e) => {
  const cb = e.target.closest(".task input[type=checkbox]"); if (!cb) return;
  const it = findItem(cb.closest(".task").dataset.id); if (it) { it.done = cb.checked; saveItems(); render(); }
});
document.addEventListener("click", (e) => { const b = e.target.closest(".task [data-edit]"); if (b) openEdit(b.closest(".task").dataset.id); });

// ---------- Home ----------
const TIPS = [
  "Start with the assignment you're dreading. The rest feels easier after.",
  "Study in 25-minute blocks with 5-minute breaks. Short sprints beat long slogs.",
  "Explain a topic out loud like you're teaching it. Gaps show up fast.",
  "Write down tomorrow's top three tasks tonight.",
  "Sleep counts as studying. Memory gets sorted overnight.",
  "Test yourself instead of rereading. Recall is what sticks.",
  "Put your phone in another room for one focused hour.",
  "Break big projects into steps with their own due dates.",
  "Review notes within 24 hours of class to keep them fresh.",
  "Spread study sessions across days instead of cramming.",
];
function renderHome() {
  const h = new Date().getHours();
  const first = settings.name.trim().split(/\s+/)[0];
  $("#greet").textContent = `Good ${h < 12 ? "morning" : h < 18 ? "afternoon" : "evening"}${first ? ", " + first : ""}`;
  $("#today").textContent = fmt(new Date(), { weekday: "long", month: "long", day: "numeric" });
  $("#avatar").textContent = (first || "S")[0].toUpperCase();

  const open = items.filter((i) => !i.done);
  const late = open.filter((i) => daysUntil(i.due) < 0).length;
  const today = open.filter((i) => daysUntil(i.due) === 0).length;
  const next7 = open.filter((i) => { const n = daysUntil(i.due); return n >= 0 && n <= 7; }).length;
  const wk = weekDays(0).map(iso), inWeek = items.filter((i) => wk.includes(i.due));
  const done = inWeek.filter((i) => i.done).length, pct = inWeek.length ? done / inWeek.length : 0;
  const ov = overall(), upNext = open.slice().sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const tip = TIPS[Math.floor((startOfToday() - new Date(new Date().getFullYear(), 0, 0)) / 864e5) % TIPS.length];

  const welcome = !settings.name && !load("planner.welcomed", false) ? `
    <form class="card welcome" id="welcome-form"><h2>Welcome! What should we call you?</h2>
      <div class="fields"><input id="w-name" type="text" placeholder="Your first name" maxlength="30" autocomplete="off">
      <button class="btn" type="submit">Save</button></div>
      <button class="link" type="button" id="w-skip">Skip for now</button></form>` : "";

  $("#home-body").innerHTML = `${welcome}
    <section class="hero">
      <svg viewBox="0 0 80 80" class="ring" role="img" aria-label="${Math.round(pct * 100)} percent of this week's tasks done">
        <circle cx="40" cy="40" r="34" class="rt"/><circle cx="40" cy="40" r="34" class="rf" style="stroke-dasharray:${(pct * 213.6).toFixed(1)} 213.6"/>
        <text x="40" y="46" text-anchor="middle">${inWeek.length ? Math.round(pct * 100) + "%" : "–"}</text></svg>
      <div><h2>${inWeek.length ? `${done} of ${inWeek.length} done this week` : "Nothing due this week"}</h2>
      <p>${inWeek.length ? (done === inWeek.length ? "All caught up. Nice work." : `${inWeek.length - done} to go before the weekend.`) : "Add an assignment to get started."}</p></div>
    </section>
    <div class="tiles">
      <button class="tile ${late ? "bad" : ""}" data-go="tasks"><b>${late}</b><span>Overdue</span></button>
      <button class="tile" data-go="tasks"><b>${today}</b><span>Due today</span></button>
      <button class="tile" data-go="week"><b>${next7}</b><span>Next 7 days</span></button>
      <button class="tile" data-go="grades"><b>${ov ? Math.round(ov.avg) + "%" : "–"}</b><span>Average grade</span></button>
    </div>
    <section class="card"><div class="cardhead"><h2>Up next</h2><button class="link" data-go="tasks">See all</button></div>
      ${upNext.length ? `<ul class="tasks">${upNext.map(taskRow).join("")}</ul>` : `<p class="none">You're clear. Add something in Assignments.</p>`}</section>
    <section class="card"><div class="cardhead"><h2>Grades</h2><button class="link" data-go="grades">Open</button></div>
      ${ov ? `<p class="gline"><b>${ov.gpa.toFixed(2)}</b> GPA <span>on a 4.0 scale</span></p>` + ov.list.slice(0, 5).map((s) => `<div class="mini" style="--c:${classColor(s.n)}"><span>${esc(s.n)}</span><div class="bar"><i style="width:${Math.min(100, Math.max(0, s.avg))}%"></i></div><em>${s.avg.toFixed(0)}%</em></div>`).join("")
        : `<p class="none">No grades yet. Add one to see your average and GPA.</p>`}</section>
    <section class="card tip"><h2>Study tip</h2><p>${esc(tip)}</p></section>`;
  if (typeof homeExtras === "function") homeExtras();
}
document.addEventListener("submit", (e) => {
  if (e.target.id !== "welcome-form") return;
  e.preventDefault(); settings.name = $("#w-name").value.trim(); saveSettings(); store("planner.welcomed", true); render();
});
document.addEventListener("click", (e) => { if (e.target.id === "w-skip") { store("planner.welcomed", true); render(); } });

// ---------- Tasks ----------
function renderTasks() {
  const q = tq.trim().toLowerCase();
  const list = items.filter((i) => tf === "all" || (tf === "done" ? i.done : !i.done))
    .filter((i) => !q || i.title.toLowerCase().includes(q) || i.cls.toLowerCase().includes(q))
    .sort((a, b) => a.due.localeCompare(b.due) || (b.star ? 1 : 0) - (a.star ? 1 : 0));
  $("#empty").hidden = list.length > 0;
  $("#empty").textContent = items.length ? "Nothing matches that." : "Nothing here yet. Add your first assignment above.";
  let out = "";
  if (tf === "open") {
    for (const [t, f] of [["Overdue", (n) => n < 0], ["Today", (n) => n === 0], ["Next 7 days", (n) => n > 0 && n <= 7], ["Later", (n) => n > 7]]) {
      const g = list.filter((i) => f(daysUntil(i.due)));
      if (g.length) out += `<h3 class="grp">${t}<span>${g.length}</span></h3><ul class="tasks">${g.map(taskRow).join("")}</ul>`;
    }
  } else out = `<ul class="tasks">${list.map(taskRow).join("")}</ul>`;
  $("#list").innerHTML = out;
}
$("#filters").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  tf = b.dataset.f; $$("#filters button").forEach((x) => x.classList.toggle("on", x === b)); renderTasks();
});
$("#search").addEventListener("input", (e) => { tq = e.target.value; renderTasks(); });

function fillClassSelects() {
  for (const id of ["#f-class", "#g-class"]) {
    const s = $(id), cur = s.value;
    s.innerHTML = classes.map((c) => `<option>${esc(c.name)}</option>`).join("");
    if (classes.some((c) => c.name === cur)) s.value = cur;
  }
}

// ---------- Edit dialog ----------
let editId = null;
function openEdit(id) {
  const it = findItem(id); if (!it) return; editId = id;
  const names = classes.map((c) => c.name); if (!names.includes(it.cls)) names.push(it.cls);
  $("#e-class").innerHTML = names.map((n) => `<option>${esc(n)}</option>`).join("");
  $("#e-title").value = it.title; $("#e-class").value = it.cls; $("#e-date").value = it.due;
  $("#e-notes").value = it.notes || ""; $("#e-star").checked = !!it.star;
  $("#edit-dialog").showModal();
}
$("#e-cancel").onclick = () => $("#edit-dialog").close();
$("#e-del").onclick = () => { items = items.filter((i) => String(i.id) !== String(editId)); saveItems(); $("#edit-dialog").close(); render(); };
$("#e-save").onclick = () => {
  const it = findItem(editId); const t = $("#e-title").value.trim();
  if (!it || !t || !$("#e-date").value) return;
  Object.assign(it, { title: t, cls: $("#e-class").value, due: $("#e-date").value, notes: $("#e-notes").value.trim(), star: $("#e-star").checked });
  saveItems(); $("#edit-dialog").close(); render();
};

// ---------- Week ----------
function renderWeek() {
  const days = weekDays(weekOff), t0 = iso(new Date());
  $("#week-range").textContent = `${fmt(days[0])} – ${fmt(days[6])}`;
  $("#week-body").innerHTML = days.map((d) => {
    const k = iso(d), list = items.filter((i) => i.due === k).sort((a, b) => a.done - b.done);
    return `<section class="day ${k === t0 ? "today" : ""}"><header><b>${fmt(d, { weekday: "short" })}</b><span>${fmt(d)}</span><em>${list.length ? list.filter((i) => !i.done).length + " to do" : ""}</em></header>
      ${list.length ? `<ul class="tasks">${list.map(taskRow).join("")}</ul>` : `<p class="none">Nothing due</p>`}</section>`;
  }).join("");
}
$("#week-prev").onclick = () => { weekOff--; renderWeek(); };
$("#week-next").onclick = () => { weekOff++; renderWeek(); };
$("#week-now").onclick = () => { weekOff = 0; renderWeek(); };

// ---------- Grades ----------
function renderGrades() {
  const ov = overall();
  $("#grade-summary").innerHTML = ov ? `<div class="gsum"><div><b>${ov.avg.toFixed(1)}%</b><span>Average</span></div><div><b>${letter(ov.avg)}</b><span>Letter</span></div><div><b>${ov.gpa.toFixed(2)}</b><span>GPA (4.0)</span></div></div>` : "";
  $("#grade-list").innerHTML = gradeClasses().map((n) => {
    const s = classStats(n);
    return `<section class="card gclass" style="--c:${classColor(n)}"><div class="cardhead"><h2><i class="dot"></i>${esc(n)}</h2><div class="gbig"><b>${s.avg.toFixed(1)}%</b><span class="pill">${letter(s.avg)}</span></div></div>
      <ul class="glist">${grades.filter((g) => g.cls === n).map((g) => `<li><span>${esc(g.name)}${g.w && g.w !== 1 ? ` <small>×${g.w}</small>` : ""}</span><em>${g.score}/${g.max} · ${((g.score / g.max) * 100).toFixed(0)}%</em><button class="x" data-gdel="${g.id}" aria-label="Delete ${esc(g.name)}">×</button></li>`).join("")}</ul></section>`;
  }).join("") || `<p class="none center">No grades yet. Add your first one above.</p>`;
  calc();
}
$("#g-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const score = parseFloat($("#g-score").value), max = parseFloat($("#g-max").value) || 100, w = parseFloat($("#g-w").value) || 1;
  const name = $("#g-name").value.trim() || "Grade";
  if (isNaN(score) || max <= 0) return;
  grades.push({ id: Date.now() + Math.random(), cls: $("#g-class").value, name, score, max, w });
  saveGrades(); $("#g-name").value = ""; $("#g-score").value = ""; renderGrades();
});
$("#grade-list").addEventListener("click", (e) => {
  const b = e.target.closest("[data-gdel]"); if (!b) return;
  grades = grades.filter((g) => String(g.id) !== b.dataset.gdel); saveGrades(); renderGrades();
});
function calc() {
  const cur = parseFloat($("#c-cur").value), w = parseFloat($("#c-w").value), tgt = parseFloat($("#c-tgt").value), out = $("#c-out");
  if ([cur, w, tgt].some(isNaN) || w <= 0 || w > 100) { out.textContent = "Enter all three numbers to see what you need."; return; }
  const need = (tgt - cur * (1 - w / 100)) / (w / 100);
  out.innerHTML = need > 100 ? `You'd need <b>${need.toFixed(1)}%</b>, which is above 100%. That target is a stretch without extra credit.`
    : need <= 0 ? `You already have it. Even a <b>0%</b> keeps you at ${tgt}% or better.` : `You need about <b>${need.toFixed(1)}%</b> on the final.`;
}
["#c-cur", "#c-w", "#c-tgt"].forEach((s) => $(s).addEventListener("input", calc));

// ---------- Settings ----------
const ACCENTS = ["#3b6cf6", "#0b8f7a", "#d6452a", "#7c3aed", "#2f7d4f", "#c2417c"];
function renderSettings() {
  $("#settings-body").innerHTML = `
  <section class="card"><h2>Profile</h2><label class="lbl" for="s-name">Your name</label>
    <input id="s-name" type="text" value="${esc(settings.name)}" placeholder="What should we call you?" maxlength="30" autocomplete="off">
    <p class="hint">Your planner is saved on this device. Cloud sign-in isn't set up, so use a backup (below) to move your data to another device.</p></section>
  <section class="card"><h2>Appearance</h2>
    <div class="seg" id="s-theme" role="group" aria-label="Theme">${[["light", "Day"], ["dark", "Night"], ["auto", "Auto"]].map(([v, l]) => `<button data-theme="${v}" class="${settings.theme === v ? "on" : ""}">${l}</button>`).join("")}</div>
    <p class="lbl">Accent color</p>
    <div class="swatches" id="s-accent">${ACCENTS.map((c) => `<button data-accent="${c}" style="background:${c}" class="${settings.accent === c ? "on" : ""}" aria-label="Accent ${c}"></button>`).join("")}</div></section>
  <section class="card"><h2>Classes</h2>
    <ul class="clist">${classes.map((c, i) => `<li><input type="color" value="${c.color}" data-cc="${i}" aria-label="Color for ${esc(c.name)}"><span>${esc(c.name)}</span>${classes.length > 1 ? `<button class="x" data-cdel="${i}" aria-label="Remove ${esc(c.name)}">×</button>` : ""}</li>`).join("")}</ul>
    <form id="s-addclass" class="fields"><input type="color" id="s-newcolor" value="#3b6cf6" aria-label="New class color"><input id="s-newname" type="text" placeholder="New class, like Art" maxlength="24" autocomplete="off" required><button class="btn" type="submit">Add</button></form></section>
  <section class="card"><h2>Your data</h2><div class="btnrow">
    <button class="btn line" id="s-export">Download backup</button><button class="btn line" id="s-import">Restore from backup</button>
    <button class="btn line" id="s-clear">Clear completed tasks</button><button class="btn danger" id="s-erase">Erase everything</button></div>
    <input type="file" id="s-file" accept="application/json,.json" hidden>
    <p class="hint">Backups include assignments, classes, grades, and settings.</p></section>
  <section class="card"><h2>App updates</h2><p class="hint" id="s-upd">Updates install in the background. You'll see a banner when a new version is ready.</p>
    <button class="btn line" id="s-check">Check for updates</button></section>`;
}
const sb = $("#settings-body");
sb.addEventListener("input", (e) => {
  if (e.target.id === "s-name") { settings.name = e.target.value; saveSettings(); }
  if (e.target.dataset.cc !== undefined) { classes[+e.target.dataset.cc].color = e.target.value; saveClasses(); }
});
sb.addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.theme) { settings.theme = t.dataset.theme; saveSettings(); applySettings(); renderSettings(); }
  else if (t.dataset.accent) { settings.accent = t.dataset.accent; saveSettings(); applySettings(); renderSettings(); }
  else if (t.dataset.cdel !== undefined) { classes.splice(+t.dataset.cdel, 1); saveClasses(); fillClassSelects(); renderSettings(); }
  else if (t.id === "s-export") exportData();
  else if (t.id === "s-import") $("#s-file").click();
  else if (t.id === "s-clear") { const n = items.filter((i) => i.done).length; if (n && confirm(`Remove ${n} completed task(s)?`)) { items = items.filter((i) => !i.done); saveItems(); } }
  else if (t.id === "s-erase") { if (confirm("Erase ALL planner data on this device? This can't be undone.")) { try { localStorage.clear(); } catch {} location.reload(); } }
  else if (t.id === "s-check") checkUpdates();
});
sb.addEventListener("submit", (e) => {
  if (e.target.id !== "s-addclass") return; e.preventDefault();
  const n = $("#s-newname").value.trim(); if (!n || classes.some((c) => c.name.toLowerCase() === n.toLowerCase())) return;
  classes.push({ name: n, color: $("#s-newcolor").value }); saveClasses(); fillClassSelects(); renderSettings();
});
sb.addEventListener("change", (e) => {
  if (e.target.id !== "s-file" || !e.target.files[0]) return;
  e.target.files[0].text().then((t) => {
    const j = JSON.parse(t); if (j.app !== "study-planner" || !j.data) throw 0;
    if (!confirm("Replace the data on this device with this backup?")) return;
    for (const [k, v] of Object.entries(j.data)) if (k.startsWith("planner.") && typeof v === "string") { JSON.parse(v); localStorage.setItem(k, v); }
    location.reload();
  }).catch(() => alert("That file isn't a valid planner backup."));
});
function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith("planner.")) data[k] = localStorage.getItem(k); }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: "study-planner", exported: new Date().toISOString(), data }, null, 2)], { type: "application/json" }));
  a.download = `planner-backup-${iso(new Date())}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// ---------- Add form + secret entrance ----------
// SHA-256 of the passcode. Default passcode is 4821.
// To change it: open the app in a browser, open the console, run:  await sha("yourcode")
// then paste the result below.
const CODE_HASH = "a388f562e286fdf28986f9253579f4d096446e01dd0c771996a51ff11b390fa2";
async function sha(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
$("#add-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#f-title").value.trim(); if (!title) return;
  if ((await sha(title)) === CODE_HASH) { $("#f-title").value = ""; openVault(); return; }
  items.push({ id: Date.now() + Math.random(), title, cls: $("#f-class").value, due: $("#f-date").value, done: false });
  saveItems(); $("#f-title").value = ""; renderTasks();
});

// ---------- App updates ----------
let swReg = null, wantReload = false;
function showUpdate(w) {
  $("#update-banner").hidden = false;
  $("#update-btn").onclick = () => { wantReload = true; w.postMessage("SKIP_WAITING"); };
}
async function checkUpdates() {
  const msg = $("#s-upd"); msg.textContent = "Checking…";
  try { if (swReg) await swReg.update(); } catch {}
  setTimeout(() => { msg.textContent = $("#update-banner").hidden ? "You're on the latest version." : "A new version is ready. Use the banner to update."; }, 1500);
}
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then((r) => {
    swReg = r;
    if (r.waiting && navigator.serviceWorker.controller) showUpdate(r.waiting);
    r.addEventListener("updatefound", () => {
      const w = r.installing;
      w && w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) showUpdate(w); });
    });
    document.addEventListener("visibilitychange", () => { if (!document.hidden) r.update().catch(() => {}); });
    setInterval(() => r.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (wantReload) location.reload(); });
}

// ---------- start ----------
applySettings(); fillClassSelects();
$("#f-date").value = iso(new Date());
go("home");