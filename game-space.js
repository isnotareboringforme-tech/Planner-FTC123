// ===== STAR FIGHTER: 3D space shooter =====
async function gameSpace(tok) {
  const S = await makeStage(tok, { fov: 68, bg: 0x04030c, fog: [80, 220] });
  if (!S) return;
  const { T, scene, camera } = S;
  const fx = makeFx(S, 600, 0, 0.55);
  scene.add(new T.HemisphereLight(0x9fb0ff, 0x1a0f33, 1.2));
  const sun = new T.DirectionalLight(0xffffff, 1.6); sun.position.set(6, 10, 8); scene.add(sun);
  const BX = 9, BY = 5.2;

  // starfield
  const N = 1400, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { sp[i * 3] = rnd(-70, 70); sp[i * 3 + 1] = rnd(-45, 45); sp[i * 3 + 2] = rnd(-230, 20); }
  const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(sp, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({ color: 0xcfe0ff, size: 0.35, transparent: true, opacity: 0.9 })); stars.frustumCulled = false; scene.add(stars);
  const planet = new T.Mesh(new T.SphereGeometry(40, 32, 24), new T.MeshStandardMaterial({ color: 0x2b3f8f, roughness: 1, emissive: 0x0a1030 })); planet.position.set(-70, -30, -210); scene.add(planet);

  // ship
  const ship = new T.Group();
  const hull = new T.MeshStandardMaterial({ color: 0xdfe8ff, metalness: 0.6, roughness: 0.3 }), acc = new T.MeshStandardMaterial({ color: 0x5ef0d0, emissive: 0x5ef0d0, emissiveIntensity: 0.9 });
  const nose = new T.Mesh(new T.ConeGeometry(0.4, 1.8, 8), hull); nose.rotation.x = -Math.PI / 2; ship.add(nose);
  const wing = new T.Mesh(new T.BoxGeometry(2.6, 0.08, 0.9), hull); wing.position.z = 0.5; ship.add(wing);
  for (const sx of [-1, 1]) { const tip = new T.Mesh(new T.BoxGeometry(0.1, 0.28, 0.8), acc); tip.position.set(sx * 1.3, 0.1, 0.5); ship.add(tip); }
  const glow = new T.Mesh(new T.SphereGeometry(0.22, 8, 8), new T.MeshBasicMaterial({ color: 0x66ccff })); glow.position.z = 1.05; ship.add(glow);
  const shield = new T.Mesh(new T.SphereGeometry(1.5, 16, 12), new T.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.25, wireframe: true })); shield.visible = false; ship.add(shield);
  scene.add(ship);

  // lasers (pool)
  const lg = new T.CylinderGeometry(0.06, 0.06, 1.8, 6); lg.rotateX(Math.PI / 2);
  const lm = new T.MeshBasicMaterial({ color: 0x6dffb0 }), em = new T.MeshBasicMaterial({ color: 0xff5e6d });
  const shots = [], bolts = [];
  const enemies = [], pups = [];
  const ast = new T.IcosahedronGeometry(1, 1), amat = new T.MeshStandardMaterial({ color: 0x7a6f66, roughness: 1, flatShading: true });
  const fm = new T.MeshStandardMaterial({ color: 0xff5e6d, emissive: 0x6a1020, metalness: 0.4, roughness: 0.4, flatShading: true });
  const bm = new T.MeshStandardMaterial({ color: 0xb06bff, emissive: 0x3a1a70, metalness: 0.4, roughness: 0.4, flatShading: true });

  function spawnEnemy() {
    const r = Math.random(), w = Math.min(1, time_ / 90), x = rnd(-BX, BX), y = rnd(-BY, BY);
    let e;
    if (r < 0.55 - w * 0.2) { const s = rnd(0.8, 2.0); const m = new T.Mesh(ast, amat); m.scale.setScalar(s); e = { kind: "ast", m, hp: Math.ceil(s * 1.6), r: s, v: rnd(24, 36), spin: new T.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)), pts: 20 }; }
    else if (r < 0.92 - w * 0.1 || time_ < 40) { const m = new T.Group(); const b = new T.Mesh(new T.ConeGeometry(0.6, 2.2, 5), fm); b.rotation.x = Math.PI / 2; const wg = new T.Mesh(new T.BoxGeometry(2.2, 0.1, 0.8), fm); wg.position.z = -0.4; m.add(b, wg); e = { kind: "fighter", m, hp: 2, r: 1.2, v: rnd(20, 28), cd: rnd(1, 2.4), ph: Math.random() * 6, x0: x, pts: 60 }; }
    else { const m = new T.Mesh(new T.OctahedronGeometry(1.8, 0), bm); e = { kind: "bomber", m, hp: 9, r: 1.9, v: 11, cd: 1.2, ph: 0, x0: x, pts: 200 }; }
    e.m.position.set(x, y, -170); e.max = e.hp; scene.add(e.m); enemies.push(e);
  }
  function enemyShoot(e, n = 1) {
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(new T.SphereGeometry(0.28, 8, 8), em); m.position.copy(e.m.position); scene.add(m);
      const d = new T.Vector3(ship.position.x - e.m.position.x + (n > 1 ? (i - (n - 1) / 2) * 6 : 0), ship.position.y - e.m.position.y, ship.position.z - e.m.position.z).normalize();
      bolts.push({ m, v: d.multiplyScalar(58), life: 4 });
    }
    tone(700, 300, 0.1, "sawtooth", 0.02);
  }
  function powerup(pos) {
    const kind = ["shield", "rapid", "repair"][Math.floor(Math.random() * 3)], c = { shield: 0x66aaff, rapid: 0xffd166, repair: 0x3cf08a }[kind];
    const m = new T.Mesh(new T.OctahedronGeometry(0.6, 0), new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1 })); m.position.copy(pos); scene.add(m); pups.push({ m, kind });
  }

  // state
  let time_ = 0, state = "menu", hp = 100, score = 0, kills = 0, fireCd = 0, spawnT = 0, shieldT = 0, rapidT = 0, hitFlash = 0, best = hs("space"), ov = null;
  const tgt = { x: 0, y: 0 }, vel = { x: 0, y: 0 }; const keys = {};
  S.hud.innerHTML = `<div class="hud-top"><span id="s-score">0</span><span id="s-pow"></span></div><div class="hud-bl"><div class="hpbar"><i id="s-hp"></i></div><b id="s-hpn">100</b></div><div class="vig" id="s-vig"></div>`;
  const hudS = S.hud.querySelector("#s-score"), hudHp = S.hud.querySelector("#s-hp"), hudHpn = S.hud.querySelector("#s-hpn"), hudP = S.hud.querySelector("#s-pow"), vig = S.hud.querySelector("#s-vig");

  S.on(document, "keydown", (e) => { keys[e.code] = true; if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault(); });
  S.on(document, "keyup", (e) => { keys[e.code] = false; });
  const cv = S.renderer.domElement;
  function point(e) { const r = cv.getBoundingClientRect(); tgt.x = ((e.clientX - r.left) / r.width * 2 - 1) * BX; tgt.y = -((e.clientY - r.top) / r.height * 2 - 1) * BY * 1.1; }
  S.on(cv, "pointermove", (e) => { if (state === "play" && (e.pointerType === "mouse" || e.buttons)) point(e); });
  S.on(cv, "pointerdown", (e) => { if (state === "play") point(e); });

  function reset() {
    for (const e of enemies) scene.remove(e.m); enemies.length = 0; for (const s of shots) scene.remove(s.m); shots.length = 0;
    for (const b of bolts) scene.remove(b.m); bolts.length = 0; for (const p of pups) scene.remove(p.m); pups.length = 0;
    time_ = 0; hp = 100; score = 0; kills = 0; shieldT = rapidT = 0; tgt.x = tgt.y = 0; ship.position.set(0, 0, 0); state = "play"; spawnT = 1;
  }
  function damage(d) {
    if (shieldT > 0) { tone(500, 800, 0.1, "triangle", 0.04); return; }
    hp -= d; hitFlash = 0.7; noise(0.25, 0.1, 900); tone(160, 60, 0.3, "sawtooth", 0.06);
    if (hp <= 0 && state === "play") {
      state = "dead"; fx.burst(ship.position, 0xffa040, 80, 14, 1.2); ship.visible = false; if (score > best) { best = score; setHs("space", best); }
      setTimeout(() => { if (tok !== gameToken) return; ov = S.overlay("SHIP DESTROYED", `Score <b>${score}</b> · ${kills} kills<br>Best ${best}`, "Fly again", () => { ov.hide(); ov = null; ship.visible = true; reset(); }); }, 900);
    }
  }
  function killEnemy(e) {
    kills++; score += e.pts; fx.burst(e.m.position, e.kind === "ast" ? 0xffb070 : 0xff7a5e, e.kind === "bomber" ? 60 : 28, 11, 0.9); noise(0.35, 0.1, 1500); tone(180, 40, 0.3, "sawtooth", 0.05);
    if (Math.random() < (e.kind === "ast" ? 0.07 : 0.2)) powerup(e.m.position);
    scene.remove(e.m); enemies.splice(enemies.indexOf(e), 1);
  }
  ov = S.overlay("STAR FIGHTER", "Move the mouse (or drag your finger) to fly. Auto-fire is on.<br>Keyboard: WASD / arrows. Grab power-ups: blue shield, yellow rapid fire, green repair.", best ? `Launch  (best ${best})` : "Launch", () => { ov.hide(); ov = null; reset(); });

  S.run((dt, time) => {
    fx.update(dt);
    const p = sp; const spd = state === "play" ? 70 + time_ * 0.3 : 30;
    for (let i = 0; i < N; i++) { p[i * 3 + 2] += spd * dt; if (p[i * 3 + 2] > 20) { p[i * 3 + 2] -= 250; p[i * 3] = rnd(-70, 70); p[i * 3 + 1] = rnd(-45, 45); } }
    sg.attributes.position.needsUpdate = true; planet.rotation.y += dt * 0.02;
    vig.style.opacity = hitFlash = Math.max(0, hitFlash - dt * 1.5);
    if (state === "menu") { ship.position.set(Math.sin(time) * 3, Math.cos(time * 1.3), 0); ship.rotation.z = -Math.cos(time) * 0.4; camera.position.set(0, 2.2, 10); camera.lookAt(0, 0.5, -10); return; }
    if (state === "play") {
      time_ += dt;
      const kx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0), ky = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      tgt.x = Math.max(-BX, Math.min(BX, tgt.x + kx * 16 * dt)); tgt.y = Math.max(-BY, Math.min(BY, tgt.y + ky * 12 * dt));
      const ox = ship.position.x, oy = ship.position.y;
      ship.position.x += (tgt.x - ship.position.x) * Math.min(1, 9 * dt); ship.position.y += (tgt.y - ship.position.y) * Math.min(1, 9 * dt);
      ship.rotation.z = -(ship.position.x - ox) * 8 * (dt > 0 ? 1 : 0) * 0.5; ship.rotation.x = (ship.position.y - oy) * 4; ship.rotation.z = Math.max(-0.9, Math.min(0.9, ship.rotation.z));
      glow.scale.setScalar(1 + Math.sin(time * 40) * 0.2);

      // fire
      fireCd -= dt;
      if (fireCd <= 0) {
        fireCd = rapidT > 0 ? 0.075 : 0.14;
        for (const sx of [-0.8, 0.8]) { const m = new T.Mesh(lg, lm); m.position.set(ship.position.x + sx, ship.position.y, -1.5); scene.add(m); shots.push({ m, life: 1.4 }); }
        tone(880, 440, 0.07, "square", 0.02);
      }
      // spawn
      spawnT -= dt; if (spawnT <= 0) { spawnT = Math.max(0.3, 1.0 - time_ * 0.006); spawnEnemy(); if (time_ > 45 && Math.random() < 0.3) spawnEnemy(); }
      if (shieldT > 0) shieldT -= dt; if (rapidT > 0) rapidT -= dt; shield.visible = shieldT > 0;
      hudP.textContent = (shieldT > 0 ? "🛡 " + Math.ceil(shieldT) + "s  " : "") + (rapidT > 0 ? "⚡ " + Math.ceil(rapidT) + "s" : "");
    }
    // shots
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.m.position.z -= 150 * dt; s.life -= dt; let gone = s.life <= 0;
      if (!gone) for (const e of enemies) {
        const q = e.m.position;
        if (Math.abs(s.m.position.x - q.x) < e.r + 0.3 && Math.abs(s.m.position.y - q.y) < e.r + 0.3 && Math.abs(s.m.position.z - q.z) < e.r + 1.5) {
          e.hp--; gone = true; fx.burst(s.m.position, 0x6dffb0, 5, 5, 0.3); e.m.scale.multiplyScalar(1.0);
          if (e.hp <= 0) killEnemy(e); break;
        }
      }
      if (gone) { scene.remove(s.m); shots.splice(i, 1); }
    }
    // enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i], q = e.m.position; q.z += e.v * dt;
      if (e.kind === "ast") { e.m.rotation.x += e.spin.x * dt; e.m.rotation.y += e.spin.y * dt; }
      else { e.ph += dt; q.x = e.x0 + Math.sin(e.ph * (e.kind === "bomber" ? 0.8 : 1.6)) * (e.kind === "bomber" ? 5 : 3); e.m.rotation.z = Math.cos(e.ph * 1.6) * 0.4;
        e.cd -= dt; if (state === "play" && e.cd <= 0 && q.z > -130 && q.z < -8) { enemyShoot(e, e.kind === "bomber" ? 3 : 1); e.cd = e.kind === "bomber" ? 1.8 : rnd(1.3, 2.4); } }
      if (state === "play" && Math.abs(q.x - ship.position.x) < e.r + 0.8 && Math.abs(q.y - ship.position.y) < e.r + 0.6 && Math.abs(q.z - ship.position.z) < e.r + 0.8) { damage(e.kind === "ast" ? 18 : 28); fx.burst(q, 0xffa040, 30, 10, 0.8); scene.remove(e.m); enemies.splice(i, 1); continue; }
      if (q.z > 16) { scene.remove(e.m); enemies.splice(i, 1); }
    }
    // enemy bolts
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.m.position.addScaledVector(b.v, dt); b.life -= dt; let gone = b.life <= 0 || b.m.position.z > 14;
      if (!gone && state === "play" && b.m.position.distanceTo(ship.position) < 1.1) { damage(12); gone = true; }
      if (gone) { scene.remove(b.m); bolts.splice(i, 1); }
    }
    // power-ups
    for (let i = pups.length - 1; i >= 0; i--) {
      const u = pups[i]; u.m.position.z += 22 * dt; u.m.rotation.y += dt * 3; u.m.rotation.x += dt * 2;
      if (state === "play" && u.m.position.distanceTo(ship.position) < 1.7) {
        if (u.kind === "shield") shieldT = 8; else if (u.kind === "rapid") rapidT = 10; else hp = Math.min(100, hp + 35);
        tone(600, 1200, 0.2, "triangle", 0.06); fx.burst(u.m.position, 0xffffff, 14, 6, 0.5); scene.remove(u.m); pups.splice(i, 1);
      } else if (u.m.position.z > 14) { scene.remove(u.m); pups.splice(i, 1); }
    }
    hudS.textContent = score; hudHp.style.width = Math.max(0, hp) + "%"; hudHpn.textContent = Math.max(0, Math.ceil(hp)); hudHp.style.background = hp < 30 ? "#ff5e6d" : "#3cf08a";
    camera.position.set(ship.position.x * 0.45, ship.position.y * 0.4 + 2.4, 10); camera.lookAt(ship.position.x * 0.2, ship.position.y * 0.2, -14);
  });
}
