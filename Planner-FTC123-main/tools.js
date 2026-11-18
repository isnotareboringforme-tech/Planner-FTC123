// ===== Study tools: Pomodoro, timetable, class notes, exam countdown, GPA goal =====
const TOOL_TABS = [["focus", "Focus"], ["table", "Timetable"], ["notes", "Notes"], ["exams", "Exams"], ["goal", "GPA goal"]];
let toolTab = load("planner.toolTab", "focus"); if (!TOOL_TABS.some((t) => t[0] === toolTab)) toolTab = "focus";
let exams = load("planner.exams", []); if (!Array.isArray(exams)) exams = [];
let tt = load("planner.timetable", []); if (!Array.isArray(tt)) tt = [];
let notes = load("planner.notes", {}); if (!notes || typeof notes !== "object" || Array.isArray(notes)) notes = {};
let goal = { target: 3.5, ...(load("planner.goal", {}) || {}) };
let pcfg = { focus: 25, short: 5, long: 15, rounds: 4, ...(load("planner.pomo.cfg", {}) || {}) };
let pstats = load("planner.pomo.stats", {}); if (!pstats || typeof pstats !== "object") pstats = {};
let ttDay = new Date().getDay(), notesCls = null, noteTimer = null;
const saveExams = () => store("planner.exams", exams), saveTT = () => store("planner.timetable", tt), saveNotes = () => store("planner.notes", notes);
const saveGoal = () => store("planner.goal", goal), savePcfg = () => store("planner.pomo.cfg", pcfg), savePstats = () => store("planner.pomo.stats", pstats);
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const clsOptions = (sel) => classes.map((c) => `<option ${c.name === sel ? "selected" : ""}>${esc(c.name)}</option>`).join("");
const mmss = (s) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const t12 = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; };

// ---------- Pomodoro (state lives in memory; timestamps keep it accurate in background tabs) ----------
const pm = { mode: "focus", running: false, end: 0, left: pcfg.focus * 60, round: 1, cls: "" };
const pmLen = (m = pm.mode) => (m === "focus" ? pcfg.focus : m === "short" ? pcfg.short : pcfg.long) * 60;
let pmAC = null;
function pmBeep() {
  try { const a = pmAC || (pmAC = new (window.AudioContext || window.webkitAudioContext)()); if (a.state === "suspended") a.resume(); [660, 880, 1100].forEach((f, i) => { const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * 0.2; o.frequency.value = f; g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.2); }); } catch {}
  try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {}
}
function pmFinish() {
  pm.running = false; pmBeep();
  if (pm.mode === "focus") { const k = iso(new Date()); pstats[k] = (pstats[k] || 0) + pcfg.focus; savePstats(); pm.mode = pm.round % pcfg.rounds === 0 ? "long" : "short"; }
  else { if (pm.mode === "long") pm.round = 1; else pm.round++; pm.mode = "focus"; }
  pm.left = pmLen(); pmPaint(true);
}
function pmToggle() {
  if (pm.running) { pm.left = Math.max(0, Math.round((pm.end - Date.now()) / 1000)); pm.running = false; }
  else { if (pm.left <= 0) pm.left = pmLen(); pm.end = Date.now() + pm.left * 1000; pm.running = true; try { pmAC = pmAC || new (window.AudioContext || window.webkitAudioContext)(); pmAC.resume(); } catch {} }
  pmPaint(false);
}
function pmSkip() { pm.running = false; if (pm.mode === "focus") { pm.mode = pm.round % pcfg.rounds === 0 ? "long" : "short"; } else { if (pm.mode === "long") pm.round = 1; else pm.round++; pm.mode = "focus"; } pm.left = pmLen(); pmPaint(true); }
function pmReset() { pm.running = false; pm.left = pmLen(); pmPaint(false); }
function pmPaint(full) {
  if (view === "tools" && toolTab === "focus") {
    if (full) return renderTools();
    const left = pm.running ? Math.max(0, Math.round((pm.end - Date.now()) / 1000)) : pm.left, f = 1 - left / pmLen();
    const t = $("#pm-time"); if (t) t.textContent = mmss(left);
    const r = $("#pm-ring"); if (r) r.style.strokeDasharray = `${(f * 339.3).toFixed(1)} 339.3`;
    const b = $("#pm-go"); if (b) b.textContent = pm.running ? "Pause" : left === pmLen() ? "Start" : "Resume";
  }
  const left = pm.running ? Math.max(0, Math.round((pm.end - Date.now()) / 1000)) : pm.left;
  document.title = pm.running ? `${mmss(left)} · ${pm.mode === "focus" ? "Focus" : "Break"}` : "Study Planner";
}
setInterval(() => { if (pm.running) { if (pm.end - Date.now() <= 0) pmFinish(); else pmPaint(false); } }, 250);
document.addEventListener("visibilitychange", () => { if (!document.hidden && pm.running) pmPaint(false); });

// ---------- tab views ----------
function viewFocus() {
  const left = pm.running ? Math.max(0, Math.round((pm.end - Date.now()) / 1000)) : pm.left, f = 1 - left / pmLen();
  const today = pstats[iso(new Date())] || 0, week = weekDays(0).reduce((a, d) => a + (pstats[iso(d)] || 0), 0);
  const label = { focus: "Focus", short: "Short break", long: "Long break" }[pm.mode];
  return `<section class="card pomo">
    <div class="seg" role="group" aria-label="Timer mode">${[["focus", "Focus"], ["short", "Short"], ["long", "Long"]].map(([m, l]) => `<button data-pm-mode="${m}" class="${pm.mode === m ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="pring"><svg viewBox="0 0 120 120" role="img" aria-label="${label} timer"><circle cx="60" cy="60" r="54" class="pt"/><circle id="pm-ring" cx="60" cy="60" r="54" class="pf" style="stroke-dasharray:${(f * 339.3).toFixed(1)} 339.3"/></svg>
      <div class="pcenter"><b id="pm-time">${mmss(left)}</b><span>${label} · round ${pm.round}/${pcfg.rounds}</span></div></div>
    <label class="lbl" for="pm-cls">Studying</label><select id="pm-cls"><option value="">Anything</option>${clsOptions(pm.cls)}</select>
    <div class="btnrow"><button class="btn" id="pm-go">${pm.running ? "Pause" : left === pmLen() ? "Start" : "Resume"}</button><button class="btn line" data-pm="reset">Reset</button><button class="btn line" data-pm="skip">Skip</button></div>
    <p class="hint">Today <b>${today}</b> min focused · this week <b>${week}</b> min</p></section>
    <section class="card"><h2>Timer lengths (minutes)</h2><div class="fields nums">
      <label>Focus<input type="number" min="1" max="120" inputmode="numeric" data-pcfg="focus" value="${pcfg.focus}"></label>
      <label>Short<input type="number" min="1" max="60" inputmode="numeric" data-pcfg="short" value="${pcfg.short}"></label>
      <label>Long<input type="number" min="1" max="90" inputmode="numeric" data-pcfg="long" value="${pcfg.long}"></label>
      <label>Rounds<input type="number" min="2" max="10" inputmode="numeric" data-pcfg="rounds" value="${pcfg.rounds}"></label></div></section>`;
}

function nowNext() {
  const d = new Date(), today = d.getDay(), mins = d.getHours() * 60 + d.getMinutes();
  const list = tt.filter((b) => b.day === today).sort((a, b) => a.start.localeCompare(b.start));
  const cur = list.find((b) => toMin(b.start) <= mins && mins < toMin(b.end)), nxt = list.find((b) => toMin(b.start) > mins);
  return { cur, nxt };
}
function viewTable() {
  const { cur, nxt } = nowNext(), list = tt.filter((b) => b.day === ttDay).sort((a, b) => a.start.localeCompare(b.start));
  const banner = cur ? `<b>Now:</b> ${esc(cur.cls)} until ${t12(cur.end)}${cur.room ? " · " + esc(cur.room) : ""}` : nxt ? `<b>Next:</b> ${esc(nxt.cls)} at ${t12(nxt.start)}${nxt.room ? " · " + esc(nxt.room) : ""}` : "No more classes today.";
  return `<section class="card nowcard">${banner}</section>
    <div class="daychips" id="tt-days">${DAYS.map((n, i) => `<button data-ttday="${i}" class="${ttDay === i ? "on" : ""}">${n}</button>`).join("")}</div>
    <section class="card">${list.length ? `<ul class="blocks">${list.map((b) => `<li style="--c:${classColor(b.cls)}"><div class="bt"><b>${t12(b.start)}</b><span>${t12(b.end)}</span></div><div class="bi"><b>${esc(b.cls)}</b><span>${b.room ? esc(b.room) : "&nbsp;"}</span></div><button class="x" data-ttdel="${b.id}" aria-label="Remove ${esc(b.cls)} block">×</button></li>`).join("")}</ul>` : `<p class="none">Nothing scheduled for ${DAYS[ttDay]}.</p>`}</section>
    <form class="card" id="tt-form" autocomplete="off"><h2>Add a class block</h2>
      <div class="fields"><select id="tt-day" aria-label="Day">${DAYS.map((n, i) => `<option value="${i}" ${i === ttDay ? "selected" : ""}>${n}</option>`).join("")}</select><select id="tt-cls" aria-label="Class">${clsOptions()}</select></div>
      <div class="fields nums"><label>Start<input type="time" id="tt-start" value="08:30" required></label><label>End<input type="time" id="tt-end" value="09:20" required></label><label>Room<input type="text" id="tt-room" placeholder="B204" maxlength="16"></label></div>
      <div class="btnrow"><button class="btn" type="submit">Add</button></div></form>`;
}

function viewNotes() {
  if (!notesCls || !classes.some((c) => c.name === notesCls)) notesCls = classes[0].name;
  const v = notes[notesCls] || "";
  return `<div class="daychips" id="notes-cls">${classes.map((c) => `<button data-ncls="${esc(c.name)}" class="${c.name === notesCls ? "on" : ""}" style="--c:${c.color}">${esc(c.name)}${(notes[c.name] || "").trim() ? " •" : ""}</button>`).join("")}</div>
    <section class="card notecard" style="--c:${classColor(notesCls)}"><h2><i class="dot"></i>${esc(notesCls)} notes</h2>
      <textarea id="note-text" rows="14" placeholder="Formulas, vocab, key ideas, teacher reminders…" aria-label="Notes for ${esc(notesCls)}">${esc(v)}</textarea>
      <p class="hint"><span id="note-state">Saved</span> · <span id="note-count">${v.length}</span> characters</p></section>`;
}

function examList() { return exams.slice().sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || ""))); }
const examAt = (e) => { const d = parse(e.date); if (e.time) { const [h, m] = e.time.split(":").map(Number); d.setHours(h, m); } else d.setHours(8, 0); return d; };
function nextExam() { const now = Date.now(); return examList().find((e) => examAt(e).getTime() + 36e5 * 3 > now); }
function cd(e) {
  const ms = examAt(e) - Date.now(); if (ms <= 0) return { d: 0, h: 0, m: 0, over: true };
  return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60 };
}
function viewExams() {
  const up = examList().filter((e) => examAt(e).getTime() + 36e5 * 3 > Date.now()), past = examList().filter((e) => !up.includes(e)).reverse(), n = up[0];
  const c = n && cd(n);
  return `${n ? `<section class="hero exam" style="background:linear-gradient(135deg, ${classColor(n.cls)}, color-mix(in srgb, ${classColor(n.cls)} 50%, #160c3a))"><div><p class="eyebrow">Next exam</p><h2>${esc(n.title)}</h2><p>${esc(n.cls)} · ${fmt(parse(n.date), { weekday: "long", month: "short", day: "numeric" })}${n.time ? " · " + t12(n.time) : ""}</p></div>
      <div class="count" id="ex-count"><div><b>${c.d}</b><span>days</span></div><div><b>${c.h}</b><span>hrs</span></div><div><b>${c.m}</b><span>min</span></div></div></section>` : `<section class="card"><p class="none">No upcoming exams. Add one below to start a countdown.</p></section>`}
    ${up.length > 1 || past.length ? "" : ""}
    ${up.length ? `<section class="card"><h2>Upcoming</h2><ul class="exlist">${up.map((e) => `<li style="--c:${classColor(e.cls)}"><div><b>${esc(e.title)}</b><span>${esc(e.cls)} · ${fmt(parse(e.date))}${e.time ? " · " + t12(e.time) : ""}</span></div><em>${daysUntil(e.date) <= 0 ? "Today" : daysUntil(e.date) + " d"}</em><button class="x" data-exdel="${e.id}" aria-label="Delete ${esc(e.title)}">×</button></li>`).join("")}</ul></section>` : ""}
    <form class="card" id="ex-form" autocomplete="off"><h2>Add an exam</h2>
      <input id="ex-title" type="text" placeholder="Unit 4 test, midterm, final…" maxlength="60" required>
      <div class="fields"><select id="ex-cls" aria-label="Class">${clsOptions()}</select><input id="ex-date" type="date" required aria-label="Exam date" value="${iso(new Date(Date.now() + 7 * 864e5))}"><input id="ex-time" type="time" aria-label="Time (optional)"></div>
      <div class="btnrow"><button class="btn" type="submit">Add</button></div></form>
    ${past.length ? `<section class="card"><h2>Past</h2><ul class="exlist dim">${past.slice(0, 6).map((e) => `<li style="--c:${classColor(e.cls)}"><div><b>${esc(e.title)}</b><span>${esc(e.cls)} · ${fmt(parse(e.date))}</span></div><button class="x" data-exdel="${e.id}" aria-label="Delete ${esc(e.title)}">×</button></li>`).join("")}</ul></section>` : ""}`;
}

function viewGoal() {
  const ov = overall(), tgt = +goal.target || 0, need = (LET.filter((l) => l[2] >= tgt - 1e-9).pop() || [93])[0];
  const cur = ov ? ov.gpa : null, pct = cur === null ? 0 : Math.min(100, (cur / 4) * 100), mark = Math.min(100, (tgt / 4) * 100);
  const status = cur === null ? "Add grades in the Grades tab to see where you stand." : cur >= tgt ? `You're at or above your goal by <b>${(cur - tgt).toFixed(2)}</b>.` : `You're <b>${(tgt - cur).toFixed(2)}</b> GPA points below your goal.`;
  const rows = ov ? ov.list.map((s) => `<li style="--c:${classColor(s.n)}"><span>${esc(s.n)}</span><b>${s.avg.toFixed(1)}%</b><em class="${s.avg >= need ? "ok" : "short"}">${s.avg >= need ? "On track" : "needs " + (need - s.avg).toFixed(1) + " more"}</em></li>`).join("") : "";
  const sel = (ov && ov.list.length ? ov.list : []).map((s) => `<option ${s.n === goal.cls ? "selected" : ""}>${esc(s.n)}</option>`).join("");
  return `<section class="card"><h2>GPA goal</h2><div class="fields"><label class="grow lbl" style="margin:0">Target GPA (4.0 scale)<input id="gl-target" type="number" step="0.05" min="0" max="4" inputmode="decimal" value="${tgt}"></label></div>
    <div class="gmeter" role="img" aria-label="Current GPA ${cur === null ? "unknown" : cur.toFixed(2)} of target ${tgt}"><i style="width:${pct}%"></i><u style="left:${mark}%"></u></div>
    <div class="gnums"><div><b>${cur === null ? "–" : cur.toFixed(2)}</b><span>Current</span></div><div><b>${tgt.toFixed(2)}</b><span>Goal</span></div><div><b>${need}%</b><span>Average needed</span></div></div>
    <p class="hint">${status}</p></section>
    ${ov ? `<section class="card"><h2>By class</h2><ul class="grows">${rows}</ul><p class="hint">Each class needs about ${need}% to hold a ${tgt.toFixed(2)} average.</p></section>
    <section class="card"><h2>What do I need on the next one?</h2>
      <div class="fields"><select id="gl-cls" aria-label="Class">${sel}</select></div>
      <div class="fields nums"><label>Worth % of grade<input id="gl-w" type="number" step="any" inputmode="decimal" value="${goal.w || 15}"></label><label>Target % in class<input id="gl-t" type="number" step="any" inputmode="decimal" value="${goal.t || need}"></label></div>
      <p id="gl-out" class="result" aria-live="polite"></p></section>` : ""}`;
}
function glCalc() {
  const out = $("#gl-out"); if (!out) return;
  const cls = $("#gl-cls").value, w = parseFloat($("#gl-w").value), t = parseFloat($("#gl-t").value), s = classStats(cls);
  if (!s || isNaN(w) || isNaN(t) || w <= 0 || w > 100) { out.textContent = "Enter the weight and target to see the score you need."; return; }
  const need = (t - s.avg * (1 - w / 100)) / (w / 100);
  out.innerHTML = need > 100 ? `You'd need <b>${need.toFixed(1)}%</b>, which is above 100%. Aim for a smaller step first.` : need <= 0 ? `You're already there. Even a <b>0%</b> keeps you at ${t}% or better.` : `You need about <b>${need.toFixed(1)}%</b> on it to reach ${t}% in ${esc(cls)}.`;
}

// ---------- render + events ----------
function renderTools() {
  $("#tool-tabs").innerHTML = TOOL_TABS.map(([k, l]) => `<button data-ttab="${k}" class="${toolTab === k ? "on" : ""}">${l}</button>`).join("");
  $("#tools-body").innerHTML = { focus: viewFocus, table: viewTable, notes: viewNotes, exams: viewExams, goal: viewGoal }[toolTab]();
  if (toolTab === "goal") glCalc();
}
const tb = $("#tools-body");
$("#tool-tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-ttab]"); if (!b) return; toolTab = b.dataset.ttab; store("planner.toolTab", toolTab); renderTools(); });
tb.addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.id === "pm-go") pmToggle();
  else if (t.dataset.pm === "reset") pmReset();
  else if (t.dataset.pm === "skip") pmSkip();
  else if (t.dataset.pmMode) { pm.mode = t.dataset.pmMode; pm.running = false; pm.left = pmLen(); renderTools(); pmPaint(false); }
  else if (t.dataset.ttday !== undefined) { ttDay = +t.dataset.ttday; renderTools(); }
  else if (t.dataset.ttdel) { tt = tt.filter((b) => String(b.id) !== t.dataset.ttdel); saveTT(); renderTools(); }
  else if (t.dataset.ncls) { flushNote(); notesCls = t.dataset.ncls; renderTools(); }
  else if (t.dataset.exdel) { exams = exams.filter((x) => String(x.id) !== t.dataset.exdel); saveExams(); renderTools(); }
});
function flushNote() { clearTimeout(noteTimer); const ta = $("#note-text"); if (ta && notesCls) { notes[notesCls] = ta.value; saveNotes(); } }
tb.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "note-text") { $("#note-state").textContent = "Saving…"; $("#note-count").textContent = t.value.length; clearTimeout(noteTimer); noteTimer = setTimeout(() => { flushNote(); const s = $("#note-state"); if (s) s.textContent = "Saved"; }, 400); }
  else if (t.dataset.pcfg) { const v = Math.max(1, Math.min(+t.max, Math.round(+t.value) || 0)); if (v) { pcfg[t.dataset.pcfg] = v; savePcfg(); if (!pm.running && t.dataset.pcfg !== "rounds") { pm.left = pmLen(); pmPaint(false); } } }
  else if (t.id === "gl-target") { goal.target = Math.max(0, Math.min(4, parseFloat(t.value) || 0)); saveGoal(); clearTimeout(tb._g); tb._g = setTimeout(renderTools, 600); }
  else if (t.id === "gl-w") { goal.w = parseFloat(t.value); saveGoal(); glCalc(); }
  else if (t.id === "gl-t") { goal.t = parseFloat(t.value); saveGoal(); glCalc(); }
});
tb.addEventListener("change", (e) => { if (e.target.id === "pm-cls") pm.cls = e.target.value; if (e.target.id === "gl-cls") { goal.cls = e.target.value; saveGoal(); glCalc(); } });
tb.addEventListener("submit", (e) => {
  e.preventDefault();
  if (e.target.id === "tt-form") {
    const start = $("#tt-start").value, end = $("#tt-end").value; if (!start || !end || toMin(end) <= toMin(start)) { alert("The end time needs to be after the start time."); return; }
    tt.push({ id: Date.now() + Math.random(), day: +$("#tt-day").value, cls: $("#tt-cls").value, start, end, room: $("#tt-room").value.trim() }); saveTT(); ttDay = +$("#tt-day").value; renderTools();
  } else if (e.target.id === "ex-form") {
    const title = $("#ex-title").value.trim(), date = $("#ex-date").value; if (!title || !date) return;
    exams.push({ id: Date.now() + Math.random(), title, cls: $("#ex-cls").value, date, time: $("#ex-time").value }); saveExams(); renderTools();
  }
});
document.addEventListener("click", (e) => { if (!e.target.closest("#nav [data-view]") && !e.target.closest("[data-go]")) return; flushNote(); });
// live exam countdown
setInterval(() => { if (view === "tools" && toolTab === "exams") { const n = nextExam(), box = $("#ex-count"); if (n && box) { const c = cd(n); box.innerHTML = `<div><b>${c.d}</b><span>days</span></div><div><b>${c.h}</b><span>hrs</span></div><div><b>${c.m}</b><span>min</span></div>`; } } }, 30000);

// ---------- Home extras: next exam + today's class ----------
function homeExtras() {
  const host = $("#home-body .tiles"); if (!host) return;
  const n = nextExam(), { cur, nxt } = nowNext(); let html = "";
  if (n) { const c = cd(n); html += `<button class="card homechip" data-go="tools" style="--c:${classColor(n.cls)}"><span>Next exam</span><b>${esc(n.title)}</b><em>${c.d > 0 ? c.d + " day" + (c.d === 1 ? "" : "s") : c.h + "h " + c.m + "m"}</em></button>`; }
  if (cur || nxt) { const b = cur || nxt; html += `<button class="card homechip" data-go="tools" style="--c:${classColor(b.cls)}"><span>${cur ? "Now" : "Next class"}</span><b>${esc(b.cls)}</b><em>${cur ? "until " + t12(b.end) : t12(b.start)}</em></button>`; }
  if (html) host.insertAdjacentHTML("afterend", `<div class="homechips">${html}</div>`);
}
window.addEventListener("pagehide", flushNote);
if (view === "home") renderHome(); else if (view === "tools") renderTools();
