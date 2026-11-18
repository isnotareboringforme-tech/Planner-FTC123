// ===== NEON RUSH: 3-lane endless runner =====
async function gameRunner(tok) {
  const S = await makeStage(tok, { fov: 64, bg: 0x090c1f, fog: [35, 150] });
  if (!S) return;
  const { T, scene, camera } = S;
  const LANE = 2.6, fx = makeFx(S, 300, 6, 0.4);
  scene.add(new T.HemisphereLight(0x8fa8ff, 0x180c33, 1.1));
  const sun = new T.DirectionalLight(0xff9ad5, 0.8); sun.position.set(-10, 20, 10); scene.add(sun);

  // road: plane that follows the player, snapped to the line spacing so it looks like it scrolls
  const rc = document.createElement("canvas"); rc.width = 256; rc.height = 64; const rx = rc.getContext("2d");
  rx.fillStyle = "#0c1230"; rx.fillRect(0, 0, 256, 64); rx.fillStyle = "#5ef0d0"; rx.fillRect(0, 0, 256, 3);
  rx.fillStyle = "#ff4fa3"; rx.fillRect(0, 0, 4, 64); rx.fillRect(252, 0, 4, 64);
  rx.fillStyle = "#274a8a"; rx.fillRect(84, 0, 2, 32); rx.fillRect(170, 0, 2, 32);
  const rtex = new T.CanvasTexture(rc); rtex.wrapS = rtex.wrapT = T.RepeatWrapping; rtex.repeat.set(1, 40); rtex.anisotropy = 4;
  const road = new T.Mesh(new T.PlaneGeometry(LANE * 3, 160), new T.MeshBasicMaterial({ map: rtex })); road.rotation.x = -Math.PI / 2; scene.add(road);
  const side = new T.Mesh(new T.PlaneGeometry(300, 160), new T.MeshBasicMaterial({ color: 0x070a1a })); side.rotation.x = -Math.PI / 2; side.position.y = -0.05; scene.add(side);

  // player
  const hero = new T.Group();
  const hm = new T.MeshStandardMaterial({ color: 0x5ef0d0, emissive: 0x1a8f7a, emissiveIntensity: 0.8, roughness: 0.4 });
  const torso = new T.Mesh(new T.BoxGeometry(0.6, 0.8, 0.4), hm); torso.position.y = 0.95;
  const head = new T.Mesh(new T.SphereGeometry(0.22, 12, 10), new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0x335577 })); head.position.y = 1.55;
  const legL = new T.Mesh(new T.BoxGeometry(0.2, 0.55, 0.22), hm), legR = legL.clone(); legL.position.set(-0.15, 0.3, 0); legR.position.set(0.15, 0.3, 0);
  hero.add(torso, head, legL, legR); scene.add(hero);

  // decor buildings
  const city = [], bm = [0x1c2a66, 0x3a1f66, 0x16405c, 0x5c1f4a].map((c) => new T.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 }));
  let nextCity = 0;
  function spawnCity(z) {
    for (const sx of [-1, 1]) {
      const h = rnd(6, 26), w = rnd(3, 7), m = new T.Mesh(new T.BoxGeometry(w, h, rnd(4, 9)), bm[Math.floor(Math.random() * bm.length)]);
      m.position.set(sx * (LANE * 1.5 + 3 + w / 2 + rnd(0, 8)), h / 2, z); scene.add(m); city.push(m);
    }
  }

  // obstacles / coins
  const obs = [], coins = [];
  const bmat = { block: new T.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x7a1a30, emissiveIntensity: 0.9 }), low: new T.MeshStandardMaterial({ color: 0xffb703, emissive: 0x7a5200, emissiveIntensity: 0.9 }), high: new T.MeshStandardMaterial({ color: 0xb06bff, emissive: 0x4a2a80, emissiveIntensity: 0.9 }) };
  const cgeo = new T.CylinderGeometry(0.32, 0.32, 0.08, 14), cmat = new T.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffa800, emissiveIntensity: 0.9, metalness: 0.6 });
  function addObs(kind, lane, z) {
    let g, y0, y1;
    if (kind === "block") { g = new T.BoxGeometry(LANE * 0.85, 1.9, 1.2); y0 = 0; y1 = 1.9; }
    else if (kind === "low") { g = new T.BoxGeometry(LANE * 0.95, 0.8, 0.7); y0 = 0; y1 = 0.8; }
    else { g = new T.BoxGeometry(LANE * 0.95, 0.5, 0.7); y0 = 1.15; y1 = 1.65; }
    const m = new T.Mesh(g, bmat[kind]); m.position.set(lane * LANE, (y0 + y1) / 2, z); scene.add(m);
    if (kind === "high") for (const sx of [-1, 1]) { const p = new T.Mesh(new T.BoxGeometry(0.12, 1.7, 0.12), bmat.high); p.position.set(sx * LANE * 0.5, -0.4, 0); m.add(p); }
    obs.push({ m, lane, z, y0, y1, hw: LANE * 0.42, hd: kind === "block" ? 0.6 : 0.35 });
  }
  function addCoins(lane, z0, n, arc = false) {
    for (let i = 0; i < n; i++) { const m = new T.Mesh(cgeo, cmat); m.rotation.x = Math.PI / 2; m.position.set(lane * LANE, 0.9 + (arc ? Math.sin((i / (n - 1)) * Math.PI) * 1.4 : 0), z0 - i * 1.7); scene.add(m); coins.push(m); }
  }
  function spawnRow(z) {
    const r = Math.random(), safe = Math.floor(Math.random() * 3) - 1, lanes = [-1, 0, 1];
    if (r < 0.4) { for (const l of lanes) if (l !== safe && Math.random() < 0.85) addObs("block", l, z); addCoins(safe, z + 3, 5); }
    else if (r < 0.62) { for (const l of lanes) addObs("low", l, z); addCoins(safe, z + 2, 5, true); }
    else if (r < 0.8) { for (const l of lanes) addObs("high", l, z); addCoins(lanes[Math.floor(Math.random() * 3)], z + 2, 4); }
    else { addObs("block", safe, z); addObs("low", -safe || 1, z); addCoins(-safe || 1, z + 4, 6); }
  }

  // state
  let lane = 0, px = 0, py = 0, vy = 0, slide = 0, speed = 15, dist = 0, coinCount = 0, state = "menu", z = 0, nextRow = -40, shake = 0, best = hs("runner"), ov = null, t0 = 0;
  S.hud.innerHTML = `<div class="hud-top"><span id="r-score">0 m</span><span id="r-coins">● 0</span></div>`;
  const hudS = S.hud.querySelector("#r-score"), hudC = S.hud.querySelector("#r-coins");

  function reset() {
    for (const o of obs) scene.remove(o.m); obs.length = 0; for (const c of coins) scene.remove(c); coins.length = 0;
    lane = 0; px = 0; py = 0; vy = 0; slide = 0; speed = 15; dist = 0; coinCount = 0; z = 0; nextRow = -40; shake = 0; state = "play"; t0 = 0;
    hero.visible = true; hero.rotation.set(0, 0, 0);
  }
  function crash() {
    state = "dead"; shake = 0.6; noise(0.5, 0.12, 900); tone(200, 40, 0.5, "sawtooth", 0.07); fx.burst(new T.Vector3(px, 1, z), 0xff4d6d, 40, 9, 0.9); hero.visible = false;
    const sc = Math.floor(dist) + coinCount * 10; if (sc > best) { best = sc; setHs("runner", best); }
    setTimeout(() => { if (tok !== gameToken || state !== "dead") return; ov = S.overlay("CRASHED", `Score <b>${sc}</b> (${Math.floor(dist)} m + ${coinCount} coins)<br>Best ${best}`, "Run again", () => { ov.hide(); ov = null; reset(); }); }, 700);
  }
  const moveLane = (d) => { if (state !== "play") return; const n = Math.max(-1, Math.min(1, lane + d)); if (n !== lane) { lane = n; tone(400, 520, 0.06, "triangle", 0.03); } };
  const jump = () => { if (state === "play" && py <= 0.01) { vy = 11.5; slide = 0; tone(300, 600, 0.15, "triangle", 0.05); } };
  const doSlide = () => { if (state !== "play") return; if (py > 0.01) vy = -16; slide = 0.75; tone(260, 130, 0.12, "sawtooth", 0.04); };
  S.on(document, "keydown", (e) => {
    if (e.repeat) return; const c = e.code;
    if (c === "ArrowLeft" || c === "KeyA") moveLane(-1); else if (c === "ArrowRight" || c === "KeyD") moveLane(1);
    else if (c === "ArrowUp" || c === "KeyW" || c === "Space") { e.preventDefault(); jump(); } else if (c === "ArrowDown" || c === "KeyS") { e.preventDefault(); doSlide(); }
  });
  let sx = 0, sy = 0; const cv = S.renderer.domElement;
  S.on(cv, "pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
  S.on(cv, "pointerup", (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { jump(); return; }
    if (Math.abs(dx) > Math.abs(dy)) moveLane(dx > 0 ? 1 : -1); else if (dy < 0) jump(); else doSlide();
  });
  ov = S.overlay("NEON RUSH", "A / D or ← → change lane · W / Space jump · S slide<br>Touch: swipe left/right/up/down, tap to jump.<br>Jump the yellow bars, slide under the purple ones, dodge red blocks.", best ? `Run  (best ${best})` : "Run", () => { ov.hide(); ov = null; reset(); });

  S.run((dt, time) => {
    fx.update(dt);
    road.position.set(0, 0, Math.floor(z / 4) * 4 - 70); hero.position.set(px, py, z);
    if (state === "menu") { camera.position.set(Math.sin(time * 0.4) * 4, 3.2, 8); camera.lookAt(0, 1.2, -10); return; }
    if (state === "play") {
      speed = Math.min(36, 15 + dist * 0.012); dist += speed * dt; z -= speed * dt;
      px += (lane * LANE - px) * Math.min(1, 14 * dt);
      vy -= 34 * dt; py += vy * dt; if (py < 0) { py = 0; vy = 0; }
      if (slide > 0) slide -= dt;
      const sliding = slide > 0 && py < 0.05, ph = sliding ? 0.7 : 1.7;
      hero.scale.y = sliding ? 0.5 : 1; hero.rotation.z = (lane * LANE - px) * -0.08; const rs = time * speed * 0.55; legL.rotation.x = Math.sin(rs) * 0.8; legR.rotation.x = -Math.sin(rs) * 0.8;
      while (nextRow > z - 110) { spawnRow(nextRow); nextRow -= Math.max(14, 30 - dist * 0.01); }
      while (nextCity > z - 120) { spawnCity(nextCity); nextCity -= 9; }
      for (let i = obs.length - 1; i >= 0; i--) {
        const o = obs[i];
        if (o.m.position.z > z + 15) { scene.remove(o.m); obs.splice(i, 1); continue; }
        if (Math.abs(o.m.position.z - z) < o.hd + 0.25 && Math.abs(o.m.position.x - px) < o.hw + 0.25 && py < o.y1 && py + ph > o.y0) { crash(); break; }
      }
      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i]; c.rotation.z += dt * 5;
        if (c.position.z > z + 15) { scene.remove(c); coins.splice(i, 1); continue; }
        if (Math.abs(c.position.z - z) < 0.8 && Math.abs(c.position.x - px) < 0.9 && py < c.position.y + 0.5 && py + ph > c.position.y - 0.4) { coinCount++; fx.burst(c.position, 0xffd166, 6, 3, 0.4); tone(900, 1400, 0.08, "triangle", 0.04); scene.remove(c); coins.splice(i, 1); }
      }
      for (let i = city.length - 1; i >= 0; i--) if (city[i].position.z > z + 30) { scene.remove(city[i]); city.splice(i, 1); }
      hudS.textContent = Math.floor(dist) + " m"; hudC.textContent = "● " + coinCount;
    }
    shake = Math.max(0, shake - dt);
    camera.position.set(px * 0.55 + (Math.random() - 0.5) * shake * 0.6, 3.4 + py * 0.3 + (Math.random() - 0.5) * shake * 0.6, z + 7.5);
    camera.lookAt(px * 0.3, 1.1, z - 8);
  });
}
