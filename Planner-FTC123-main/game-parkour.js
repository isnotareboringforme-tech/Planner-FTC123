// ===== SKY PARKOUR: first-person platforming course =====
async function gameParkour(tok) {
  const S = await makeStage(tok, { fov: 80, bg: 0x8fd0ff, fog: [40, 190] });
  if (!S) return;
  const { T, scene, camera } = S;
  const I = makeInput(S, [{ n: "jump", t: "JUMP", r: 26, b: 70, s: 92, c: "fire" }, { n: "reload", t: "↺", r: 140, b: 40, s: 54 }]);
  scene.add(new T.HemisphereLight(0xffffff, 0x6fa0d0, 1.35));
  const sun = new T.DirectionalLight(0xfff2d8, 1.5); sun.position.set(30, 60, 20); scene.add(sun);
  const fx = makeFx(S, 300, 8, 0.5), R = rng(2024);

  // ----- build the course -----
  const SECTIONS = 5, PER = 9, boxes = [], movers = [], crumbles = [], checkpoints = [];
  const hues = [0.55, 0.38, 0.12, 0.8, 0.0];
  function plat(x, y, z, w, d, hue, kind = "n") {
    const h = 0.7, c = new T.Color().setHSL(hue, 0.6, 0.55);
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color: c, roughness: 0.6 })); m.position.set(x, y - h / 2, z); scene.add(m);
    const edge = new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); m.add(edge);
    const b = { min: new T.Vector3(x - w / 2, y - h, z - d / 2), max: new T.Vector3(x + w / 2, y, z + d / 2), m, on: true, delta: new T.Vector3() }; boxes.push(b);
    if (kind === "m") movers.push({ b, x0: x, amp: rnd(2.5, 4), sp: rnd(0.7, 1.2), ph: R() * 6 });
    if (kind === "c") { b.m.material.color.setHSL(0.08, 0.8, 0.55); crumbles.push({ b, t: -1, y0: y }); }
    return b;
  }
  let cx = 0, cy = 0, cz = 0; const start = { x: 0, y: 0, z: 0 };
  plat(0, 0, 0, 7, 7, 0.55);
  for (let s = 0; s < SECTIONS; s++) {
    for (let i = 0; i < PER; i++) {
      const diff = s * 0.22 + i * 0.03, size = Math.max(1.7, 3.3 - diff * 1.3), gap = 1.6 + diff * 1.7 + R() * 0.8;
      cz -= size / 2 + gap + size / 2; cx = Math.max(-9, Math.min(9, cx + (R() - 0.5) * (3 + s * 1.5))); cy += (R() - 0.35) * 0.9 * (R() < 0.7 ? 1 : 0.5);
      cy = Math.max(-3, Math.min(14, cy));
      const roll = R(), kind = s >= 1 && roll < 0.2 ? "m" : s >= 2 && roll < 0.4 ? "c" : "n";
      if (kind === "m") plat(cx, cy, cz, size + 0.6, size + 0.2, hues[s], "m");
      else if (s === 3 && R() < 0.3) plat(cx, cy, cz, 1.3, size + 4, hues[s]);
      else plat(cx, cy, cz, size, size, hues[s], kind);
    }
    cz -= 5.5; const last = s === SECTIONS - 1;
    const b = plat(cx, cy, cz, 7, 7, hues[s]);
    const cp = { x: cx, y: cy, z: cz }; checkpoints.push(cp);
    const ring = new T.Mesh(new T.TorusGeometry(1.4, 0.12, 8, 24), new T.MeshBasicMaterial({ color: last ? 0xffd166 : 0x5ef0d0 })); ring.position.set(cx, cy + 1.8, cz); scene.add(ring); cp.ring = ring; cp.goal = last;
  }
  // decorative floating islands
  for (let i = 0; i < 40; i++) { const m = new T.Mesh(new T.IcosahedronGeometry(rnd(2, 7), 0), new T.MeshStandardMaterial({ color: new T.Color().setHSL(0.3 + R() * 0.2, 0.3, 0.7), flatShading: true })); m.position.set((R() < 0.5 ? -1 : 1) * rnd(18, 55), rnd(-25, 10), rnd(-cz - 30, 30) * -1 * 1); m.position.z = -R() * (-cz + 60) + 30; scene.add(m); }

  // ----- player -----
  const P = { pos: new T.Vector3(0, 0, 0), vel: new T.Vector3(), yaw: 0, pitch: 0, hw: 0.3, h: 1.8, onGround: false, ground: null };
  let coyote = 0, jumpBuf = 0, cpIndex = -1, falls = 0, t = 0, state = "menu", best = hs("parkour"), ov = null, started = false, paused = true, bob = 0;
  const here = () => (cpIndex < 0 ? start : checkpoints[cpIndex]);
  function respawn(hard) { const c = here(); P.pos.set(c.x, c.y + 0.05, c.z + (cpIndex < 0 ? 0 : 0)); P.vel.set(0, 0, 0); if (hard) P.yaw = 0; }

  S.hud.innerHTML = `<div class="hud-top"><span id="p-time">0:00.0</span><span id="p-sec">Start</span><span id="p-falls">Falls 0</span></div><div class="banner" id="p-ban"></div><button class="pausebtn" id="p-pause" aria-label="Pause">❚❚</button>`;
  const hudT = S.hud.querySelector("#p-time"), hudS = S.hud.querySelector("#p-sec"), hudF = S.hud.querySelector("#p-falls"), ban = S.hud.querySelector("#p-ban"); let banT = 0;
  const say = (m, s = 2) => { ban.textContent = m; ban.style.opacity = 1; banT = s; };

  function begin() { if (ov) { ov.hide(); ov = null; } paused = false; I.lock(); if (state !== "play") { cpIndex = -1; falls = 0; t = 0; state = "play"; respawn(true); } }
  function pause() { if (paused || state !== "play") return; paused = true; I.set("jump", false); ov = S.overlay("Paused", "WASD move · Shift sprint · Space jump · R back to checkpoint", "Resume", begin); }
  I.onlock = (l) => { if (!l && !I.coarse && state === "play" && !paused) pause(); };
  S.hud.querySelector("#p-pause").onclick = (e) => { e.stopPropagation(); pause(); };
  ov = S.overlay("SKY PARKOUR", `Reach the golden ring at the end. ${SECTIONS} sections, checkpoints between them.<br>WASD move · Shift sprint · Space jump (you can jump just after leaving an edge) · R: back to checkpoint<br>Orange platforms crumble. Blue ones slide.`, best ? `Start  (best ${fmtTime(best / 100)})` : "Start", begin);

  S.run((dt, time) => {
    fx.update(dt); if (banT > 0) { banT -= dt; if (banT <= 0) ban.style.opacity = 0; }
    for (const c of checkpoints) c.ring.rotation.y += dt * 1.5;
    // moving + crumbling platforms
    for (const m of movers) { const old = m.b.m.position.x, nx = m.x0 + Math.sin(time * m.sp + m.ph) * m.amp; m.b.m.position.x = nx; m.b.delta.set(nx - old, 0, 0); m.b.min.x += nx - old; m.b.max.x += nx - old; }
    for (const c of crumbles) {
      if (c.t >= 0) { c.t += dt; c.b.m.position.x += (Math.random() - 0.5) * 0.02; if (c.t > 0.7 && c.b.on) { c.b.on = false; c.b.m.visible = false; fx.burst(c.b.m.position, 0xffa040, 18, 4, 0.8); } if (c.t > 3.2) { c.b.on = true; c.b.m.visible = true; c.t = -1; } }
    }
    if (paused || state !== "play") { camera.position.set(0, 9, 22); camera.lookAt(0, 0, -30); return; }
    t += dt;
    applyLook(P, I); const mv = I.move(), sy = Math.sin(P.yaw), cy_ = Math.cos(P.yaw), sp = I.act.sprint ? 10 : 7;
    const tx = (mv.x * cy_ - mv.y * sy) * sp, tz = (-mv.x * sy - mv.y * cy_) * sp, k = Math.min(1, (P.onGround ? 16 : 4.5) * dt);
    if (P.ground) P.pos.add(P.ground.delta);
    P.vel.x += (tx - P.vel.x) * k; P.vel.z += (tz - P.vel.z) * k; P.vel.y -= 26 * dt;
    coyote = P.onGround ? 0.12 : coyote - dt; jumpBuf = I.take("jump") ? 0.12 : jumpBuf - dt;
    if (jumpBuf > 0 && coyote > 0) { P.vel.y = 8.6; coyote = 0; jumpBuf = 0; tone(300, 520, 0.1, "triangle", 0.04); }
    const wasGround = P.onGround; physStep(P, boxes, dt, null);
    if (P.ground) { const c = crumbles.find((q) => q.b === P.ground); if (c && c.t < 0) c.t = 0; }
    if (!wasGround && P.onGround) { tone(120, 70, 0.08, "sine", 0.05); }
    if (I.take("reload")) { respawn(false); say("Back to checkpoint", 1); }
    if (P.pos.y < -22) { falls++; respawn(false); tone(300, 80, 0.4, "sawtooth", 0.06); say("Try again", 1); }
    // checkpoints
    for (let i = cpIndex + 1; i < checkpoints.length; i++) {
      const c = checkpoints[i];
      if (Math.abs(P.pos.x - c.x) < 4 && Math.abs(P.pos.z - c.z) < 4 && Math.abs(P.pos.y - c.y) < 1.5) {
        cpIndex = i; tone(600, 1200, 0.3, "triangle", 0.06); fx.burst(new T.Vector3(c.x, c.y + 1.8, c.z), c.goal ? 0xffd166 : 0x5ef0d0, 40, 8, 1);
        if (c.goal) {
          state = "done"; paused = true; if (document.pointerLockElement) document.exitPointerLock();
          const cs = Math.round(t * 100); if (!best || cs < best) { best = cs; setHs("parkour", cs); }
          ov = S.overlay("YOU DID IT!", `Time <b>${fmtTime(t)}</b> · ${falls} falls<br>Best ${fmtTime(best / 100)}`, "Run again", () => { ov.hide(); ov = null; state = "menu"; begin(); });
        } else say(`Checkpoint ${i + 1} / ${SECTIONS - 1}`, 2);
        break;
      }
    }
    const spd = Math.hypot(P.vel.x, P.vel.z); bob += dt * spd * 1.3;
    camera.position.set(P.pos.x, P.pos.y + 1.62 + (P.onGround ? Math.sin(bob * 1.5) * 0.025 * Math.min(1, spd / 7) : 0), P.pos.z);
    camera.rotation.set(P.pitch, P.yaw, 0, "YXZ");
    hudT.textContent = fmtTime(t); hudS.textContent = cpIndex < 0 ? "Section 1" : "Section " + Math.min(SECTIONS, cpIndex + 2); hudF.textContent = "Falls " + falls;
  });
}
