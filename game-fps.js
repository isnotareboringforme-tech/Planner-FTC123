// ===== ARENA STRIKE: wave-based first-person shooter =====
async function gameFps(tok) {
  const S = await makeStage(tok, { fov: 76, bg: 0x1b2a55, fog: [40, 120], shadows: !matchMedia("(pointer: coarse)").matches });
  if (!S) return;
  const { T, scene, camera } = S;
  const I = makeInput(S, [
    { n: "fire", t: "FIRE", r: 22, b: 100, s: 86, c: "fire" },
    { n: "jump", t: "JUMP", r: 124, b: 44, s: 62 },
    { n: "reload", t: "R", r: 30, b: 206, s: 50 },
  ]);
  const HALF = 36, R = rng(11);

  // ----- lights + ground -----
  scene.add(new T.HemisphereLight(0xb8ccff, 0x2a3558, 1.9));
  const sun = new T.DirectionalLight(0xffffff, 1.7); sun.position.set(24, 46, 14);
  if (S.renderer.shadowMap.enabled) { sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536); const c = sun.shadow.camera; c.left = c.bottom = -48; c.right = c.top = 48; c.far = 120; }
  scene.add(sun);
  const gc = document.createElement("canvas"); gc.width = gc.height = 128; const gx = gc.getContext("2d");
  gx.fillStyle = "#1c2a52"; gx.fillRect(0, 0, 128, 128); gx.strokeStyle = "#3f5aa8"; gx.lineWidth = 3; gx.strokeRect(0, 0, 128, 128);
  const gtex = new T.CanvasTexture(gc); gtex.wrapS = gtex.wrapT = T.RepeatWrapping; gtex.repeat.set(HALF, HALF); gtex.anisotropy = 4;
  const ground = new T.Mesh(new T.PlaneGeometry(HALF * 2, HALF * 2), new T.MeshStandardMaterial({ map: gtex, roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // ----- walls + cover (rendered + collidable) -----
  const boxes = [], wallMeshes = [];
  const palette = [0x4a5ca0, 0x4f78c8, 0x6a52a8, 0x2f8a96, 0x9a4f7a];
  function addBox(cx, cz, w, d, h, color, neon = true) {
    const m = new T.Mesh(new T.BoxGeometry(w, h, d), new T.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15 }));
    m.position.set(cx, h / 2, cz); m.castShadow = m.receiveShadow = true; scene.add(m);
    if (neon) { const e = new T.LineSegments(new T.EdgesGeometry(m.geometry), new T.LineBasicMaterial({ color: 0x5ef0d0, transparent: true, opacity: 0.55 })); e.position.copy(m.position); scene.add(e); }
    boxes.push({ min: new T.Vector3(cx - w / 2, 0, cz - d / 2), max: new T.Vector3(cx + w / 2, h, cz + d / 2) }); wallMeshes.push(m);
  }
  addBox(0, -HALF - 1, HALF * 2 + 4, 2, 7, 0x2c3a72, false); addBox(0, HALF + 1, HALF * 2 + 4, 2, 7, 0x2c3a72, false);
  addBox(-HALF - 1, 0, 2, HALF * 2, 7, 0x2c3a72, false); addBox(HALF + 1, 0, 2, HALF * 2, 7, 0x2c3a72, false);
  const heights = [1.0, 1.1, 2.4, 2.4, 3.2];
  let tries = 0, placed = 0;
  while (placed < 20 && tries++ < 200) {
    const x = (R() * 2 - 1) * (HALF - 5), z = (R() * 2 - 1) * (HALF - 5), w = 2 + R() * 4, d = 2 + R() * 4;
    if (Math.hypot(x, z - 24) < 7 || boxes.slice(4).some((b) => Math.abs(x - (b.min.x + b.max.x) / 2) < (w + b.max.x - b.min.x) / 2 + 1.4 && Math.abs(z - (b.min.z + b.max.z) / 2) < (d + b.max.z - b.min.z) / 2 + 1.4)) continue;
    addBox(x, z, w, d, heights[Math.floor(R() * heights.length)], palette[Math.floor(R() * palette.length)]); placed++;
  }
  for (const [x, z] of [[-24, -24], [24, -24], [-24, 24], [24, 24]]) {
    const p = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 8, 12), new T.MeshStandardMaterial({ color: 0x0b1020, emissive: 0x5ef0d0, emissiveIntensity: 0.8 }));
    p.position.set(x, 4, z); scene.add(p);
    const l = new T.PointLight(0x5ef0d0, 14, 22); l.position.set(x, 5, z); scene.add(l);
  }

  // ----- player + gun -----
  const P = { pos: new T.Vector3(0, 0, 26), vel: new T.Vector3(), yaw: 0, pitch: 0, hw: 0.35, h: 1.8, onGround: true, ground: null, hp: 100 };
  const EYE = 1.62; let recoil = 0, bob = 0;
  scene.add(camera);
  const gun = new T.Group(); camera.add(gun);
  const gm = new T.MeshStandardMaterial({ color: 0x1b2036, metalness: 0.6, roughness: 0.4 }), gm2 = new T.MeshStandardMaterial({ color: 0x5ef0d0, emissive: 0x5ef0d0, emissiveIntensity: 0.9 });
  const body = new T.Mesh(new T.BoxGeometry(0.1, 0.14, 0.55), gm); body.position.set(0, 0, 0);
  const barrel = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 0.4), gm); barrel.position.set(0, 0.03, -0.42);
  const stock = new T.Mesh(new T.BoxGeometry(0.08, 0.16, 0.2), gm); stock.position.set(0, -0.08, 0.2);
  const stripe = new T.Mesh(new T.BoxGeometry(0.104, 0.02, 0.3), gm2); stripe.position.set(0, 0.06, -0.02);
  gun.add(body, barrel, stock, stripe); gun.position.set(0.24, -0.22, -0.5); gun.scale.setScalar(0.75);
  const flash = new T.Mesh(new T.SphereGeometry(0.07, 8, 8), new T.MeshBasicMaterial({ color: 0xffd27a })); flash.position.set(0, 0.03, -0.7); flash.visible = false; gun.add(flash);
  const flashLight = new T.PointLight(0xffb060, 0, 9); flashLight.position.set(0, 0.03, -0.8); gun.add(flashLight);

  const fx = makeFx(S, 500, 9, 0.28);
  const tracers = []; for (let i = 0; i < 8; i++) { const g = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]); const l = new T.Line(g, new T.LineBasicMaterial({ color: 0xffe9a8, transparent: true })); l.visible = false; l.frustumCulled = false; scene.add(l); tracers.push({ l, t: 0 }); }
  let ti = 0;

  // ----- enemies -----
  const TYPES = {
    grunt: { hp: 60, speed: 3.6, col: 0x3d8bff, sc: 1, shoot: 1.7, dmg: 9, keep: 11, pts: 100, ps: 15 },
    rusher: { hp: 45, speed: 6.6, col: 0xff4d5e, sc: 0.9, shoot: 0, dmg: 14, keep: 0, pts: 120 },
    tank: { hp: 280, speed: 2.2, col: 0xb06bff, sc: 1.55, shoot: 2.6, dmg: 13, keep: 14, pts: 320, ps: 13, burst: 3 },
  };
  const enemies = [], dying = [], projs = [];
  const eyeMat = new T.MeshBasicMaterial({ color: 0xffe14d });
  const projGeo = new T.SphereGeometry(0.14, 8, 8);
  function spawnEnemy(type) {
    const d = TYPES[type]; let x, z, tries = 0;
    do { const a = Math.random() * 6.283; x = Math.cos(a) * (HALF - 3); z = Math.sin(a) * (HALF - 3); tries++; } while ((Math.hypot(x - P.pos.x, z - P.pos.z) < 18) && tries < 20);
    const g = new T.Group(); const mat = new T.MeshStandardMaterial({ color: d.col, roughness: 0.5, metalness: 0.2, emissive: 0x000000 });
    const e = { type, d, g, mat, hp: d.hp * (1 + (wave - 1) * 0.08), cd: Math.random() * d.shoot || 1, t: Math.random() * 9, parts: [], dead: false, strafe: Math.random() < 0.5 ? 1 : -1, burst: 0 };
    const add = (geo, px, py, pz, head = false, m = mat) => { const me = new T.Mesh(geo, m); me.position.set(px, py, pz); me.castShadow = true; me.userData = { e, head }; g.add(me); e.parts.push(me); return me; };
    add(new T.BoxGeometry(0.7, 0.9, 0.42), 0, 1.15, 0); add(new T.BoxGeometry(0.28, 0.8, 0.3), -0.2, 0.4, 0); add(new T.BoxGeometry(0.28, 0.8, 0.3), 0.2, 0.4, 0);
    add(new T.BoxGeometry(0.2, 0.7, 0.2), -0.5, 1.1, 0); add(new T.BoxGeometry(0.2, 0.7, 0.2), 0.5, 1.1, 0);
    const head = add(new T.SphereGeometry(0.24, 12, 10), 0, 1.82, 0, true); const eye = new T.Mesh(new T.BoxGeometry(0.3, 0.07, 0.1), eyeMat); eye.position.set(0, 0.03, 0.2); head.add(eye);
    g.scale.setScalar(d.sc); g.position.set(x, 0, z); scene.add(g); enemies.push(e); return e;
  }
  function shootAt(e, spread = 0) {
    const from = new T.Vector3(e.g.position.x, 1.5 * e.d.sc, e.g.position.z), to = new T.Vector3(P.pos.x, P.pos.y + 1.1, P.pos.z);
    const dir = to.sub(from).normalize(); dir.x += (Math.random() - 0.5) * spread; dir.z += (Math.random() - 0.5) * spread; dir.normalize();
    const m = new T.Mesh(projGeo, new T.MeshBasicMaterial({ color: e.d.col === 0xb06bff ? 0xd6a8ff : 0x7fb4ff })); m.position.copy(from); scene.add(m);
    projs.push({ m, v: dir.multiplyScalar(e.d.ps), life: 5, dmg: e.d.dmg }); tone(520, 260, 0.12, "sawtooth", 0.025);
  }

  // ----- pickups -----
  const pickups = [];
  function dropPickup(x, z) {
    const r = Math.random(); if (r > 0.42) return;
    const kind = r < 0.2 ? "hp" : "ammo", m = new T.Mesh(new T.BoxGeometry(0.4, 0.4, 0.4), new T.MeshStandardMaterial({ color: kind === "hp" ? 0x3cf08a : 0xffd166, emissive: kind === "hp" ? 0x3cf08a : 0xffd166, emissiveIntensity: 0.8 }));
    m.position.set(x, 0.7, z); scene.add(m); pickups.push({ m, kind, t: 0 });
  }

  // ----- HUD -----
  S.hud.innerHTML = `<div class="hud-top"><span id="f-wave">Wave 1</span><span id="f-score">0</span></div>
    <div class="crosshair"></div><div class="hitm" id="f-hit">✕</div><div class="vig" id="f-vig"></div>
    <div class="hud-bl"><div class="hpbar"><i id="f-hp"></i></div><b id="f-hpn">100</b></div>
    <div class="hud-br"><b id="f-ammo">30</b><span id="f-res"> / 120</span></div><div class="banner" id="f-banner"></div>
    <button class="pausebtn" id="f-pause" aria-label="Pause">❚❚</button>`;
  const H = (id) => S.hud.querySelector("#" + id);
  const hudWave = H("f-wave"), hudScore = H("f-score"), hudHp = H("f-hp"), hudHpn = H("f-hpn"), hudAmmo = H("f-ammo"), hudRes = H("f-res"), banner = H("f-banner"), vig = H("f-vig"), hit = H("f-hit");
  let bannerT = 0, hitT = 0, vigA = 0;
  const say = (t, s = 2) => { banner.textContent = t; banner.style.opacity = 1; bannerT = s; };

  // ----- state -----
  let state = "menu", paused = true, score = 0, kills = 0, wave = 0, toSpawn = 0, spawnT = 0, nextWaveT = 0, best = hs("fps");
  let mag = 30, reserve = 120, reloadT = 0, fireCd = 0, lastHurt = -9, ov = null;
  const ray = new T.Raycaster(); ray.far = 120; const tmpV = new T.Vector3(), tmpD = new T.Vector3(), tmpM = new T.Vector3();

  function newGame() {
    for (const e of enemies.concat(dying)) scene.remove(e.g); enemies.length = dying.length = 0;
    for (const p of projs) scene.remove(p.m); projs.length = 0;
    for (const p of pickups) scene.remove(p.m); pickups.length = 0;
    P.pos.set(0, 0, 26); P.vel.set(0, 0, 0); P.yaw = 0; P.pitch = 0; P.hp = 100;
    score = kills = wave = 0; mag = 30; reserve = 120; reloadT = 0; state = "play"; startWave();
  }
  function startWave() {
    wave++; toSpawn = 5 + wave * 2; spawnT = 1; hudWave.textContent = "Wave " + wave; say("WAVE " + wave, 2.2);
    if (wave > 1) { P.hp = Math.min(100, P.hp + 25); reserve = Math.min(240, reserve + 60); tone(300, 700, 0.3, "triangle", 0.05); }
  }
  function begin() { if (ov) { ov.hide(); ov = null; } paused = false; I.lock(); if (state !== "play") newGame(); }
  function pause(title = "Paused") {
    if (paused || state === "dead") return; paused = true; I.set("fire", false);
    ov = S.overlay(title, "Mouse to aim · WASD move · Shift sprint · Space jump · Click fire · R reload<br>Touch: left stick moves, drag the right side to look", "Resume", begin);
  }
  I.onlock = (l) => { if (!l && !I.coarse && state === "play" && !paused) pause(); };
  H("f-pause").onclick = (e) => { e.stopPropagation(); pause(); };
  S.on(document, "keydown", (e) => { if (e.code === "KeyP") pause(); });
  ov = S.overlay("ARENA STRIKE", "Survive endless waves of robots. Headshots hit hard.<br>WASD move · Mouse aim · Click fire · R reload · Space jump · Shift sprint<br>Touch: left stick moves, drag right side to look.", best ? `Play  (best ${best})` : "Play", begin);

  // ----- actions -----
  function reload() { if (reloadT > 0 || mag >= 30 || reserve <= 0) return; reloadT = 1.5; tone(200, 140, 0.15, "square", 0.03); }
  function hurt(d) {
    P.hp -= d; lastHurt = S.time; vigA = 0.8; noise(0.15, 0.07, 700); tone(120, 60, 0.2, "sawtooth", 0.05);
    if (P.hp <= 0 && state === "play") {
      state = "dead"; paused = true; if (document.pointerLockElement) document.exitPointerLock();
      if (score > best) { best = score; setHs("fps", best); }
      ov = S.overlay("YOU DIED", `Score <b>${score}</b> · Wave ${wave} · ${kills} kills<br>Best ${best}`, "Play again", () => { ov.hide(); ov = null; paused = false; state = "menu"; begin(); });
    }
  }
  function killEnemy(e, headshot) {
    e.dead = true; enemies.splice(enemies.indexOf(e), 1); dying.push(e); e.dt = 0;
    score += e.d.pts + (headshot ? 50 : 0); kills++; fx.burst(tmpM.set(e.g.position.x, 1.2 * e.d.sc, e.g.position.z), e.d.col, 26, 7, 0.8);
    noise(0.25, 0.09, 1200); dropPickup(e.g.position.x, e.g.position.z);
  }
  function fire() {
    if (reloadT > 0 || fireCd > 0) return;
    if (mag <= 0) { reload(); return; }
    mag--; fireCd = 0.095; recoil = Math.min(recoil + 0.35, 1);
    const moving = I.move().x || I.move().y, sp = (moving || !P.onGround ? 0.03 : 0.008);
    scene.updateMatrixWorld();
    camera.getWorldPosition(tmpV); tmpD.set((Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, -1).normalize().applyQuaternion(camera.quaternion);
    ray.set(tmpV, tmpD);
    const parts = []; for (const e of enemies) for (const p of e.parts) parts.push(p);
    const eh = ray.intersectObjects(parts, false)[0], wh = ray.intersectObjects(wallMeshes.concat([ground]), false)[0];
    let end = tmpV.clone().addScaledVector(tmpD, 90);
    if (wh) end = wh.point.clone();
    if (eh && (!wh || eh.distance < wh.distance)) {
      end = eh.point.clone(); const e = eh.object.userData.e, hs_ = eh.object.userData.head, dmg = hs_ ? 62 : 24;
      e.hp -= dmg; e.mat.emissive.setHex(0xffffff); e.flash = 0.06; hitT = 0.14; hit.style.opacity = 1; hit.style.color = hs_ ? "#ff5e6d" : "#fff";
      fx.burst(end, 0xffe9a8, 6, 4, 0.3); if (e.hp <= 0) killEnemy(e, hs_);
    } else fx.burst(end, 0x9fb8ff, 5, 3, 0.25);
    const tr = tracers[ti++ % tracers.length]; gun.localToWorld(tmpM.set(0, 0.03, -0.75)); const pa = tr.l.geometry.attributes.position;
    pa.setXYZ(0, tmpM.x, tmpM.y, tmpM.z); pa.setXYZ(1, end.x, end.y, end.z); pa.needsUpdate = true; tr.l.visible = true; tr.t = 0.06; tr.l.material.opacity = 1;
    flash.visible = true; flashLight.intensity = 5; flash.rotation.z = Math.random() * 6; tone(180, 60, 0.09, "sawtooth", 0.06); noise(0.07, 0.07, 3000);
    if (mag === 0) reload();
  }

  // ----- main loop -----
  if (window.__dbg) window.__dbg.fps = { I, P, enemies, fire: () => fire(), begin: () => begin() };
  S.run((dt, time) => {
    fx.update(dt);
    for (const t of tracers) if (t.t > 0) { t.t -= dt; t.l.material.opacity = Math.max(0, t.t / 0.06); if (t.t <= 0) t.l.visible = false; }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) banner.style.opacity = 0; }
    if (hitT > 0) { hitT -= dt; if (hitT <= 0) hit.style.opacity = 0; }
    vigA = Math.max(0, vigA - dt * 1.4); vig.style.opacity = vigA + (P.hp < 30 ? 0.25 + 0.15 * Math.sin(time * 6) : 0);
    for (const p of pickups) { p.t += dt; p.m.rotation.y += dt * 2; p.m.position.y = 0.7 + Math.sin(p.t * 3) * 0.12; }
    if (paused || state !== "play") { camera.position.set(0, 14, 40); camera.lookAt(0, 3, 0); for (const e of enemies) e.g.rotation.y += dt * 0.3; return; }

    // look + move
    applyLook(P, I); const mv = I.move(), sprint = I.act.sprint ? 1.45 : 1;
    const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), sp = 7 * sprint;
    const tx = (mv.x * cy - mv.y * sy) * sp, tz = (-mv.x * sy - mv.y * cy) * sp, k = Math.min(1, (P.onGround ? 14 : 3) * dt);
    P.vel.x += (tx - P.vel.x) * k; P.vel.z += (tz - P.vel.z) * k; P.vel.y -= 24 * dt;
    if (I.act.jump && P.onGround) { P.vel.y = 8.4; P.onGround = false; tone(260, 420, 0.1, "triangle", 0.03); }
    physStep(P, boxes, dt, 0);
    P.pos.x = Math.max(-HALF + 0.4, Math.min(HALF - 0.4, P.pos.x)); P.pos.z = Math.max(-HALF + 0.4, Math.min(HALF - 0.4, P.pos.z));
    const speedH = Math.hypot(P.vel.x, P.vel.z); bob += dt * speedH * 1.5;
    recoil = Math.max(0, recoil - dt * 5);
    camera.position.set(P.pos.x, P.pos.y + EYE + (P.onGround ? Math.sin(bob * 1.6) * 0.03 * Math.min(1, speedH / 7) : 0), P.pos.z);
    camera.rotation.set(P.pitch + recoil * 0.035, P.yaw, 0, "YXZ");
    gun.position.set(0.24 + Math.sin(bob) * 0.008 * Math.min(1, speedH / 7), -0.22 + Math.abs(Math.cos(bob)) * 0.01 * Math.min(1, speedH / 7) + recoil * 0.015, -0.5 + recoil * 0.05);
    flashLight.intensity = Math.max(0, flashLight.intensity - dt * 90); flash.visible = flashLight.intensity > 0.5;

    // weapon
    fireCd -= dt; if (I.take("reload")) reload();
    if (reloadT > 0) { reloadT -= dt; gun.rotation.x = -0.5 * Math.sin(Math.min(1, (1.5 - reloadT) / 1.5) * Math.PI); if (reloadT <= 0) { const n = Math.min(30 - mag, reserve); mag += n; reserve -= n; gun.rotation.x = 0; tone(500, 700, 0.08, "square", 0.03); } }
    if (I.act.fire) fire();

    // waves + spawns
    if (toSpawn > 0) { spawnT -= dt; if (spawnT <= 0 && enemies.length < 11) { spawnT = Math.max(0.5, 1.6 - wave * 0.08); toSpawn--; const r = Math.random(); spawnEnemy(wave >= 3 && r < 0.14 ? "tank" : wave >= 2 && r < 0.45 ? "rusher" : "grunt"); } }
    else if (!enemies.length && nextWaveT <= 0) nextWaveT = 3;
    if (nextWaveT > 0) { nextWaveT -= dt; if (nextWaveT <= 0) startWave(); }

    // enemies
    for (const e of enemies) {
      const g = e.g, dx = P.pos.x - g.position.x, dz = P.pos.z - g.position.z, dist = Math.hypot(dx, dz) || 1; e.t += dt;
      g.rotation.y = Math.atan2(dx, dz);
      let mx = 0, mz = 0;
      if (dist > e.d.keep) { mx = dx / dist; mz = dz / dist; } else if (e.d.keep && dist < e.d.keep - 3) { mx = -dx / dist * 0.6; mz = -dz / dist * 0.6; }
      if (e.d.keep && dist < e.d.keep + 3) { mx += (dz / dist) * 0.7 * e.strafe; mz += (-dx / dist) * 0.7 * e.strafe; if (Math.random() < dt * 0.4) e.strafe *= -1; }
      g.position.x += mx * e.d.speed * dt; g.position.z += mz * e.d.speed * dt;
      for (const o of enemies) if (o !== e) { const ox = g.position.x - o.g.position.x, oz = g.position.z - o.g.position.z, od = Math.hypot(ox, oz); if (od > 0 && od < 1.1) { g.position.x += ox / od * 2 * dt; g.position.z += oz / od * 2 * dt; } }
      pushOutCircle(g.position, 0.5 * e.d.sc, boxes);
      g.position.x = Math.max(-HALF + 1, Math.min(HALF - 1, g.position.x)); g.position.z = Math.max(-HALF + 1, Math.min(HALF - 1, g.position.z));
      g.position.y = Math.abs(Math.sin(e.t * 8)) * 0.07;
      if (e.flash > 0) { e.flash -= dt; if (e.flash <= 0) e.mat.emissive.setHex(0); }
      e.cd -= dt;
      if (e.d.shoot) {
        if (e.cd <= 0 && dist < 36) { if (e.d.burst) { e.burst = e.d.burst; e.cd = 0.18; } else { shootAt(e, 0.06); e.cd = e.d.shoot * (0.8 + Math.random() * 0.5); } }
        if (e.burst > 0 && e.cd <= 0) { shootAt(e, 0.08); e.burst--; e.cd = e.burst > 0 ? 0.18 : e.d.shoot; }
      } else if (dist < 1.7 && e.cd <= 0) { hurt(e.d.dmg); e.cd = 0.8; tone(90, 50, 0.15, "square", 0.05); }
    }
    for (let i = dying.length - 1; i >= 0; i--) { const e = dying[i]; e.dt += dt; e.g.rotation.x = -Math.min(1.5, e.dt * 4); e.g.position.y = Math.max(-0.5, -e.dt * 0.4); if (e.dt > 0.7) { scene.remove(e.g); dying.splice(i, 1); } }

    // enemy bullets
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i]; p.life -= dt; p.m.position.addScaledVector(p.v, dt); const q = p.m.position; let dead = p.life <= 0;
      if (!dead) for (const b of boxes) if (q.x > b.min.x && q.x < b.max.x && q.z > b.min.z && q.z < b.max.z && q.y < b.max.y) { dead = true; break; }
      if (!dead && q.y < 0) dead = true;
      if (!dead && Math.abs(q.x - P.pos.x) < 0.5 && Math.abs(q.z - P.pos.z) < 0.5 && q.y > P.pos.y && q.y < P.pos.y + 1.8) { hurt(p.dmg); dead = true; }
      if (dead) { fx.burst(q, 0x7fb4ff, 5, 3, 0.3); scene.remove(p.m); p.m.material.dispose(); projs.splice(i, 1); }
    }
    // pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (Math.hypot(p.m.position.x - P.pos.x, p.m.position.z - P.pos.z) < 1.3) {
        if (p.kind === "hp") P.hp = Math.min(100, P.hp + 30); else reserve = Math.min(240, reserve + 45);
        tone(500, 900, 0.14, "triangle", 0.05); scene.remove(p.m); pickups.splice(i, 1);
      }
    }
    if (time - lastHurt > 6 && P.hp < 100) P.hp = Math.min(100, P.hp + 6 * dt);
    hudScore.textContent = score; hudHp.style.width = Math.max(0, P.hp) + "%"; hudHpn.textContent = Math.max(0, Math.ceil(P.hp));
    hudAmmo.textContent = reloadT > 0 ? "…" : mag; hudRes.textContent = " / " + reserve; hudHp.style.background = P.hp < 30 ? "#ff5e6d" : "#3cf08a";
  });
}
