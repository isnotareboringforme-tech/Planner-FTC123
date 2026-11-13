// ===== 3D game core (Three.js) =====
let gameToken = 0;
let _three = null;
const getThree = () => _three || (_three = import("./three.module.js"));
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}.${String(Math.floor((s % 1) * 10))}`;
const rnd = (a, b) => a + Math.random() * (b - a);
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- audio (tiny synth, no files) ----------
let _ac = null, muted = false, _noise = null;
function ac() { try { _ac = _ac || new (window.AudioContext || window.webkitAudioContext)(); if (_ac.state === "suspended") _ac.resume(); } catch {} return _ac; }
function tone(f0, f1, dur, type = "square", vol = 0.05) {
  const a = ac(); if (!a || muted) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
}
function noise(dur, vol = 0.08, lp = 2000) {
  const a = ac(); if (!a || muted) return;
  if (!_noise) { const b = a.createBuffer(1, a.sampleRate, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; _noise = b; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
  s.buffer = _noise; f.type = "lowpass"; f.frequency.value = lp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.9));
  s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + Math.min(dur, 0.9));
}

// ---------- stage: renderer + scene + loop + cleanup ----------
async function makeStage(tok, { fov = 70, bg = 0x0b1020, fog = null, shadows = false } = {}) {
  const box = el("div", "stage"); $("#game-area").append(box);
  const note = el("div", "stage-msg", "Loading 3D engine…"); box.append(note);
  let T;
  try { T = await getThree(); } catch (err) { note.textContent = "Couldn't load three.module.js. Make sure it is in the same folder as index.html."; return null; }
  if (tok !== gameToken) { box.remove(); return null; }
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }); }
  catch (err) { note.textContent = "This browser couldn't start WebGL, so 3D games can't run here."; return null; }
  note.remove();

  const S = { T, box, renderer, scene: new T.Scene(), camera: new T.PerspectiveCamera(fov, 1, 0.1, 500), w: 1, h: 1, time: 0 };
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  if (shadows) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap; }
  S.scene.background = new T.Color(bg);
  if (fog) S.scene.fog = new T.Fog(bg, fog[0], fog[1]);
  box.prepend(renderer.domElement);
  box.addEventListener("contextmenu", (e) => e.preventDefault());

  const cleanups = [];
  S.on = (t, ty, fn, o) => { t.addEventListener(ty, fn, o); cleanups.push(() => t.removeEventListener(ty, fn, o)); };
  S.cleanup = (fn) => cleanups.push(fn);
  const resize = () => {
    const w = Math.max(box.clientWidth, 2), h = Math.max(box.clientHeight, 2);
    S.w = w; S.h = h; renderer.setSize(w, h, false); S.camera.aspect = w / h; S.camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(box); resize();

  S.hud = el("div", "hud"); box.append(S.hud);
  const tools = el("div", "stage-tools");
  const mute = el("button", "", muted ? "🔇" : "🔊"); mute.setAttribute("aria-label", "Toggle sound");
  mute.onclick = (e) => { e.stopPropagation(); muted = !muted; mute.textContent = muted ? "🔇" : "🔊"; };
  tools.append(mute);
  if (box.requestFullscreen) {
    const fs = el("button", "", "⛶"); fs.setAttribute("aria-label", "Fullscreen");
    fs.onclick = (e) => { e.stopPropagation(); if (document.fullscreenElement) document.exitFullscreen(); else box.requestFullscreen().catch(() => {}); };
    tools.append(fs);
  }
  box.append(tools);

  S.overlay = (title, body, btn, cb) => {
    const o = el("div", "overlay"); const h = el("h2", "", title), p = el("p"); p.innerHTML = body;
    const b = el("button", "obtn", btn); b.onclick = (e) => { e.stopPropagation(); ac(); cb(); };
    o.append(h, p, b); box.append(o); b.focus({ preventScroll: true });
    return { el: o, hide() { o.remove(); } };
  };

  let raf = 0, last = performance.now(), running = true, update = () => {};
  const frame = (now) => {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; S.time += dt;
    update(dt, S.time); renderer.render(S.scene, S.camera);
  };
  S.run = (fn) => { update = fn; last = performance.now(); raf = requestAnimationFrame(frame); };
  S.dispose = () => {
    running = false; cancelAnimationFrame(raf);
    cleanups.forEach((f) => { try { f(); } catch {} });
    ro.disconnect();
    try { if (document.pointerLockElement) document.exitPointerLock(); if (document.fullscreenElement) document.exitFullscreen(); } catch {}
    S.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    renderer.dispose(); try { renderer.forceContextLoss(); } catch {}
    box.remove();
  };
  stopGame = S.dispose;
  return S;
}

// ---------- input: keyboard, mouse look (pointer lock), touch sticks/buttons ----------
// buttons: [{ n: action name, t: label, r: right px, b: bottom px, s: size px, c: css class }]
function makeInput(S, buttons = []) {
  const cv = S.renderer.domElement;
  const coarse = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  const I = { act: {}, edge: {}, keys: {}, lookX: 0, lookY: 0, joy: { x: 0, y: 0 }, locked: false, coarse, onlock: null };
  const set = (n, v) => { if (v && !I.act[n]) I.edge[n] = true; I.act[n] = v; };
  I.set = set;
  I.take = (n) => { const v = !!I.edge[n]; I.edge[n] = false; return v; };
  const km = { Space: "jump", KeyR: "reload", ShiftLeft: "sprint", ShiftRight: "sprint", KeyE: "use" };
  S.on(document, "keydown", (e) => {
    if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
    if (e.repeat) return;
    I.keys[e.code] = true; if (km[e.code]) set(km[e.code], true);
  });
  S.on(document, "keyup", (e) => { I.keys[e.code] = false; if (km[e.code]) set(km[e.code], false); });
  S.on(window, "blur", () => { I.keys = {}; I.act = {}; });
  S.on(document, "mousemove", (e) => { if (I.locked) { I.lookX += e.movementX; I.lookY += e.movementY; } });
  S.on(S.box, "mousedown", (e) => { if (I.locked && e.button === 0) set("fire", true); if (I.locked && e.button === 2) set("aim", true); });
  S.on(document, "mouseup", (e) => { if (e.button === 0) set("fire", false); if (e.button === 2) set("aim", false); });
  S.on(document, "pointerlockchange", () => { I.locked = document.pointerLockElement === cv; if (!I.locked) { set("fire", false); } if (I.onlock) I.onlock(I.locked); });
  I.lock = () => { if (coarse) return; try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch {} };
  const K = I.keys;
  I.move = () => {
    let x = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + I.joy.x;
    let y = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + I.joy.y;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  };
  I.look = () => { const r = { x: I.lookX, y: I.lookY }; I.lookX = I.lookY = 0; return r; };

  if (coarse) {
    const L = el("div", "touch"); S.box.append(L);
    const zl = el("div", "tz tzl"), zr = el("div", "tz tzr"); L.append(zl, zr);
    const base = el("div", "joy"), knob = el("i"); base.append(knob); zl.append(base);
    let jid = null, jx = 0, jy = 0;
    zl.addEventListener("pointerdown", (e) => {
      jid = e.pointerId; zl.setPointerCapture(jid); jx = e.clientX; jy = e.clientY;
      const r = zl.getBoundingClientRect(); base.style.left = e.clientX - r.left + "px"; base.style.top = e.clientY - r.top + "px"; base.style.opacity = 1; knob.style.transform = "translate(0,0)";
    });
    zl.addEventListener("pointermove", (e) => {
      if (e.pointerId !== jid) return; let dx = e.clientX - jx, dy = e.clientY - jy; const m = Math.hypot(dx, dy), R = 48;
      if (m > R) { dx *= R / m; dy *= R / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; I.joy.x = dx / R; I.joy.y = -dy / R;
    });
    const jend = (e) => { if (e.pointerId !== jid) return; jid = null; I.joy.x = I.joy.y = 0; base.style.opacity = 0.35; };
    zl.addEventListener("pointerup", jend); zl.addEventListener("pointercancel", jend);
    let lid = null, lx = 0, ly = 0;
    zr.addEventListener("pointerdown", (e) => { lid = e.pointerId; zr.setPointerCapture(lid); lx = e.clientX; ly = e.clientY; });
    zr.addEventListener("pointermove", (e) => { if (e.pointerId !== lid) return; I.lookX += (e.clientX - lx) * 1.9; I.lookY += (e.clientY - ly) * 1.9; lx = e.clientX; ly = e.clientY; });
    const lend = (e) => { if (e.pointerId === lid) lid = null; };
    zr.addEventListener("pointerup", lend); zr.addEventListener("pointercancel", lend);
    for (const b of buttons) {
      const n = el("button", "tb " + (b.c || ""), b.t);
      n.style.right = b.r + "px"; n.style.bottom = b.b + "px"; n.style.width = n.style.height = b.s + "px";
      n.addEventListener("pointerdown", (e) => { e.preventDefault(); n.setPointerCapture(e.pointerId); set(b.n, true); });
      for (const ev of ["pointerup", "pointercancel"]) n.addEventListener(ev, () => set(b.n, false));
      L.append(n);
    }
  }
  return I;
}

// ---------- particles (one draw call) ----------
function makeFx(S, max = 400, grav = 0, size = 0.45) {
  const T = S.T, pos = new Float32Array(max * 3).fill(0), col = new Float32Array(max * 3), base = new Float32Array(max * 3), vel = new Float32Array(max * 3), life = new Float32Array(max), ttl = new Float32Array(max);
  for (let k = 0; k < max; k++) pos[k * 3 + 1] = -9999;
  const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(pos, 3)); g.setAttribute("color", new T.BufferAttribute(col, 3));
  const m = new T.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const pts = new T.Points(g, m); pts.frustumCulled = false; S.scene.add(pts);
  let n = 0; const c = new T.Color();
  return {
    burst(p, color, count = 14, speed = 6, life0 = 0.6) {
      c.set(color);
      for (let i = 0; i < count; i++) {
        const k = n; n = (n + 1) % max;
        pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z;
        const a = Math.random() * 6.283, b = Math.acos(2 * Math.random() - 1), s = speed * (0.3 + Math.random());
        vel[k * 3] = s * Math.sin(b) * Math.cos(a); vel[k * 3 + 1] = s * Math.cos(b); vel[k * 3 + 2] = s * Math.sin(b) * Math.sin(a);
        base[k * 3] = c.r; base[k * 3 + 1] = c.g; base[k * 3 + 2] = c.b;
        life[k] = ttl[k] = life0 * (0.5 + Math.random() * 0.5);
      }
    },
    update(dt) {
      for (let k = 0; k < max; k++) {
        if (life[k] > 0) {
          life[k] -= dt; const f = Math.max(0, life[k] / ttl[k]);
          vel[k * 3 + 1] -= grav * dt;
          pos[k * 3] += vel[k * 3] * dt; pos[k * 3 + 1] += vel[k * 3 + 1] * dt; pos[k * 3 + 2] += vel[k * 3 + 2] * dt;
          col[k * 3] = base[k * 3] * f; col[k * 3 + 1] = base[k * 3 + 1] * f; col[k * 3 + 2] = base[k * 3 + 2] * f;
          if (life[k] <= 0) pos[k * 3 + 1] = -9999;
        }
      }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    },
  };
}

// ---------- first-person physics (axis-separated AABB collision) ----------
// P: { pos, vel, hw (half width), h (height), onGround, ground }; boxes: [{min, max, on?}]
function physStep(P, boxes, dt, floor = null) {
  const hw = P.hw, h = P.h, e = 1e-4, p = P.pos;
  const hit = (b) => b.on !== false && p.x + hw > b.min.x + e && p.x - hw < b.max.x - e && p.z + hw > b.min.z + e && p.z - hw < b.max.z - e && p.y + h > b.min.y + e && p.y < b.max.y - e;
  p.x += P.vel.x * dt;
  for (const b of boxes) if (hit(b)) { p.x = p.x < (b.min.x + b.max.x) / 2 ? b.min.x - hw - 2 * e : b.max.x + hw + 2 * e; P.vel.x = 0; }
  p.z += P.vel.z * dt;
  for (const b of boxes) if (hit(b)) { p.z = p.z < (b.min.z + b.max.z) / 2 ? b.min.z - hw - 2 * e : b.max.z + hw + 2 * e; P.vel.z = 0; }
  const prevY = p.y; p.y += P.vel.y * dt; P.onGround = false; P.ground = null;
  for (const b of boxes) if (hit(b)) {
    if (P.vel.y > 0 && prevY + h <= b.min.y + 0.05) { p.y = b.min.y - h - 2 * e; P.vel.y = 0; }
    else { p.y = b.max.y; P.vel.y = 0; P.onGround = true; P.ground = b; }
  }
  if (floor !== null && p.y <= floor) { p.y = floor; if (P.vel.y < 0) P.vel.y = 0; P.onGround = true; P.ground = null; }
}
// keep a circle (enemy) out of tall boxes
function pushOutCircle(p, r, boxes, maxY = 1.6) {
  for (const b of boxes) {
    if (b.min.y > maxY || b.max.y < 0.3) continue;
    const cx = Math.max(b.min.x, Math.min(p.x, b.max.x)), cz = Math.max(b.min.z, Math.min(p.z, b.max.z));
    let dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x += (dx / d) * (r - d); p.z += (dz / d) * (r - d); }
      else { const l = p.x - b.min.x, rr = b.max.x - p.x, t = p.z - b.min.z, bt = b.max.z - p.z, m = Math.min(l, rr, t, bt); if (m === l) p.x = b.min.x - r; else if (m === rr) p.x = b.max.x + r; else if (m === t) p.z = b.min.z - r; else p.z = b.max.z + r; }
    }
  }
}
// apply mouse/touch look to a yaw/pitch pair
function applyLook(P, I, sens = 0.0022) { const l = I.look(); P.yaw -= l.x * sens; P.pitch = Math.max(-1.5, Math.min(1.5, P.pitch - l.y * sens)); }

const GAMES = { fps: (t) => gameFps(t), runner: (t) => gameRunner(t), space: (t) => gameSpace(t), parkour: (t) => gameParkour(t) };
