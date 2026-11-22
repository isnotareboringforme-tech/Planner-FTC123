// ===== OPEN CITY · Stage 1: Foundation =====
// Standalone page (city.html) that the Arcade loads. Everything is procedural: no downloaded models/textures/sounds.
// World axes: +y up. Heading H means forward = (sin H, cos H) on the (x, z) plane; LEFT of that is (cos H, -sin H).
// Later stages add more files (city-*.js) on top of this one.
import * as THREE from "./three.module.js";

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
function mulberry(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = mulberry(20261121);
const rr = (a, b) => a + R() * (b - a);
const pick = (a) => a[Math.floor(R() * a.length)];

// ---------- save + device ----------
const SAVE_KEY = "city.v1";
const coarse = matchMedia("(pointer: coarse)").matches;
const save = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch {} return { q: null, sens: 1, snd: true, money: 2500, tests: {}, hour: 17.4, ...s }; })();
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} };
if (coarse) { document.body.classList.add("touch"); $("#touch").hidden = false; }
const QUAL = { low: { pr: 1, shadow: 0, label: "Low" }, med: { pr: 1.5, shadow: 1024, label: "Medium" }, high: { pr: 2, shadow: 2048, label: "High" } };
if (!QUAL[save.q]) save.q = coarse ? "med" : "high";

function fatal(msg) { $("#mbody").innerHTML = `<p class="err">${msg}</p><p class="help">If you're inside the Arcade, tap the ⛶ button or open this page directly. A browser with WebGL is required.</p>`; }

// ---------- renderer / scene ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $("#gl"), antialias: !coarse, powerPreference: "high-performance" }); }
catch (e) { fatal("This browser couldn't start WebGL, so the 3D city can't run here."); throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.3, 3200);
scene.fog = new THREE.FogExp2(0xbfdcff, 0.00075);
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function applyQuality() {
  const q = QUAL[save.q];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pr));
  sun.shadow.mapSize.set(q.shadow || 512, q.shadow || 512);
  if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  shadowsOn = q.shadow > 0; resize();
}
function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
window.addEventListener("resize", resize); window.addEventListener("orientationchange", () => setTimeout(resize, 200));
let shadowsOn = true;

// ---------- world constants ----------
const N = 8, PITCH = 80, ROAD_W = 16, HALF = 32, ORG = -280;       // 8x8 blocks, 80 m pitch, block centers -280..280
const roadLine = (k) => -320 + PITCH * k;                           // 9 streets each way: -320..320
const SLAB_H = 0.18, BEACH_X = -385, WATER_Y = -0.3, WORLD = 900;
const beachH = (x) => (x > BEACH_X ? 0 : Math.max(-2.94, (x - BEACH_X) * 0.0625));
function slabAt(x, z) { const i = Math.round((x - ORG) / PITCH), j = Math.round((z - ORG) / PITCH); if (i < 0 || i >= N || j < 0 || j >= N) return false; return Math.abs(x - (ORG + i * PITCH)) <= HALF && Math.abs(z - (ORG + j * PITCH)) <= HALF; }
const groundH = (x, z) => (slabAt(x, z) ? SLAB_H : beachH(x));

// ---------- collision grid (boxes + circles) ----------
const CELL = 32, grid = new Map(); let stamp = 0;
const gk = (ix, iz) => (ix + 600) * 1300 + (iz + 600);
function gridAdd(c, x0, z0, x1, z1) { for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++) for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) { const k = gk(ix, iz); let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(c); } }
const bldRects = [];
function addBoxCol(x0, z0, x1, z1, h) { const c = { t: 0, x0, z0, x1, z1, h, q: 0 }; gridAdd(c, x0, z0, x1, z1); return c; }
function addCircCol(x, z, r) { const c = { t: 1, x, z, r, q: 0 }; gridAdd(c, x - r, z - r, x + r, z + r); }
const QOUT = [];
function queryCols(x, z, r) {
  QOUT.length = 0; stamp++;
  for (let ix = Math.floor((x - r) / CELL); ix <= Math.floor((x + r) / CELL); ix++) for (let iz = Math.floor((z - r) / CELL); iz <= Math.floor((z + r) / CELL); iz++) {
    const a = grid.get(gk(ix, iz)); if (!a) continue;
    for (const c of a) if (c.q !== stamp) { c.q = stamp; QOUT.push(c); }
  }
  return QOUT;
}
// push a circle (p.x,p.z radius r) out of everything it overlaps; returns {hit, nx, nz, pen}
const HIT = { hit: false, nx: 0, nz: 0, pen: 0 };
function resolveCircle(p, r) {
  HIT.hit = false; HIT.pen = 0;
  for (const c of queryCols(p.x, p.z, r + 1)) {
    let nx = 0, nz = 0, pen = 0;
    if (c.t === 0) {
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-9) { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = r - d; }
      else { const l = p.x - c.x0, rt = c.x1 - p.x, tp = p.z - c.z0, bt = c.z1 - p.z, m = Math.min(l, rt, tp, bt); if (m === l) { nx = -1; pen = l + r; } else if (m === rt) { nx = 1; pen = rt + r; } else if (m === tp) { nz = -1; pen = tp + r; } else { nz = 1; pen = bt + r; } }
    } else {
      const dx = p.x - c.x, dz = p.z - c.z, rs = r + c.r, d2 = dx * dx + dz * dz; if (d2 >= rs * rs) continue;
      const d = Math.sqrt(d2) || 1e-4; nx = dx / d; nz = dz / d; pen = rs - d;
    }
    p.x += nx * pen; p.z += nz * pen; HIT.hit = true; HIT.nx = nx; HIT.nz = nz; HIT.pen = Math.max(HIT.pen, pen);
  }
  return HIT;
}
function pointInCol(x, y, z, m) { for (const c of queryCols(x, z, m + 0.5)) if (c.t === 0 && c.h > y && x > c.x0 - m && x < c.x1 + m && z > c.z0 - m && z < c.z1 + m) return true; return false; }

// ---------- procedural textures ----------
function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = ANISO; if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
}
function speckle(g, w, h, n, cols, size = 2) { for (let i = 0; i < n; i++) { g.fillStyle = pick(cols); g.fillRect(Math.random() * w, Math.random() * h, size, size); } }
const texGround = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#a79c76"; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${100 + Math.random() * 50},${50 + Math.random() * 30},.22)`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 22, 4 + Math.random() * 14, Math.random() * 3, 0, TAU); g.fill(); } speckle(g, w, h, 2500, ["#8d825f", "#bdb48f", "#7d8a55", "#c9c0a0"]); }, { repeat: [150, 150] });
const texSand = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e3d3a6"; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, ["#d6c594", "#efe2bb", "#cdbb88"]); }, { repeat: [100, 100] });
const texConcrete = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#b9b8b2"; g.fillRect(0, 0, w, h); speckle(g, w, h, 1500, ["#a9a8a2", "#c8c7c0", "#b0afa9"]); g.strokeStyle = "rgba(60,60,58,.5)"; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }, { repeat: [16, 16] });
function asphalt(g, w, h) { g.fillStyle = "#2c2e33"; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ["#383a40", "#25272b", "#41434a", "#202226"]); for (let i = 0; i < 6; i++) { g.strokeStyle = "rgba(15,15,18,.35)"; g.lineWidth = 3; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + 40 - Math.random() * 80, y + 60 - Math.random() * 120); g.stroke(); } }
const texRoad = canvasTex(256, 1024, (g, w, h) => {
  asphalt(g, w, h); g.fillStyle = "#e9e9e4";
  g.fillRect(14, 0, 4, h); g.fillRect(w - 18, 0, 4, h);                                    // edge lines
  g.fillStyle = "#f2c230"; g.fillRect(121, 0, 4, h); g.fillRect(131, 0, 4, h);              // double yellow
  g.fillStyle = "#e9e9e4"; for (let y = 70; y < h - 60; y += 96) { g.fillRect(62, y, 4, 48); g.fillRect(190, y, 4, 48); } // lane dashes
  for (let x = 22; x < w - 20; x += 36) { g.fillRect(x, 6, 20, 34); g.fillRect(x, h - 40, 20, 34); }                    // crosswalks
  g.fillRect(14, 56, 100, 5); g.fillRect(142, h - 61, 100, 5);                                                       // stop lines
});
const texInter = canvasTex(128, 128, asphalt);

function winTex(kind, seed) {
  const r = mulberry(seed), S = 256, C = 64;
  const mk = () => { const c = document.createElement("canvas"); c.width = c.height = S; return c; };
  const a = mk(), e = mk(), g = a.getContext("2d"), ge = e.getContext("2d");
  if (kind === "std") { g.fillStyle = "#ebe8e0"; g.fillRect(0, 0, S, S); speckle(g, S, S, 900, ["#dedbd2", "#f4f2ec"], 1); } else { g.fillStyle = "#1d2d3f"; g.fillRect(0, 0, S, S); }
  ge.fillStyle = "#000"; ge.fillRect(0, 0, S, S);
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const x = cx * C, y = cy * C, lit = r() < 0.42, warm = r() < 0.75;
    if (kind === "std") {
      const gr = g.createLinearGradient(0, y + 12, 0, y + 46); gr.addColorStop(0, "#5b7da3"); gr.addColorStop(0.5, "#2c4361"); gr.addColorStop(1, "#1b2838");
      g.fillStyle = "#d3cfc4"; g.fillRect(x + 11, y + 9, C - 22, C - 20); g.fillStyle = gr; g.fillRect(x + 14, y + 12, C - 28, C - 26);
      if (lit) { ge.fillStyle = warm ? "#ffd596" : "#cfe4ff"; ge.fillRect(x + 14, y + 12, C - 28, C - 26); }
    } else {
      const gr = g.createLinearGradient(x, y, x + C, y + C); gr.addColorStop(0, "#7da3c6"); gr.addColorStop(0.5, "#2f4d6d"); gr.addColorStop(1, "#16283a");
      g.fillStyle = gr; g.fillRect(x + 3, y + 3, C - 6, C - 18); g.fillStyle = "#5d6f80"; g.fillRect(x + 3, y + C - 14, C - 6, 11);
      if (lit) { ge.fillStyle = warm ? "#ffcf8a" : "#d6e8ff"; ge.fillRect(x + 3, y + 3, C - 6, C - 18); }
    }
  }
  const t = (c, srgb) => { const x = new THREE.CanvasTexture(c); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = ANISO; x.colorSpace = THREE.SRGBColorSpace; return x; };
  return { map: t(a), em: t(e) };
}

// ---------- sky, lights, time of day ----------
const skyU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, gnd: { value: new THREE.Color() } };
const skyMat = new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.5)) : mix(hor, gnd, smoothstep(0.0, 0.3, -h)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}",
});
const skyGeo = new THREE.SphereGeometry(1500, 32, 16);
const sky = new THREE.Mesh(skyGeo, skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
const glowTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,.95)"); gr.addColorStop(0.4, "rgba(255,255,255,.25)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const sunSpr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
sunSpr.scale.set(260, 260, 1); sunSpr.renderOrder = -9; sunSpr.frustumCulled = false; scene.add(sunSpr);
const moonSpr = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xcfe0ff, transparent: true, depthWrite: false, fog: false }));
moonSpr.scale.set(90, 90, 1); moonSpr.renderOrder = -9; moonSpr.frustumCulled = false; scene.add(moonSpr);
const starGeo = new THREE.BufferGeometry(); { const p = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { const a = R() * TAU, y = R() * 0.95 + 0.05, rad = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * rad * 1400; p[i * 3 + 1] = y * 1400; p[i * 3 + 2] = Math.sin(a) * rad * 1400; } starGeo.setAttribute("position", new THREE.BufferAttribute(p, 3)); }
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); stars.frustumCulled = false; stars.renderOrder = -9; scene.add(stars);

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a60, 0.5); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3); scene.add(sun, sun.target);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 500; { const e = 70; Object.assign(sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e }); }
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; sun.castShadow = true;
const moon = new THREE.DirectionalLight(0x7f9cff, 0); scene.add(moon, moon.target);

const KF = [ // hour, zenith, horizon, ground, sunColor, sunIntensity, hemiIntensity
  [0, 0x02050d, 0x0a1226, 0x04060a, 0xffffff, 0, 0.22], [4.6, 0x050a1c, 0x141d44, 0x05070c, 0xffffff, 0, 0.22],
  [5.9, 0x2b4079, 0xff9a6a, 0x3a2a2a, 0xff9a5a, 0.7, 0.35], [7.2, 0x4a82cc, 0xffc9a0, 0x6a5a4a, 0xffd2a0, 2.2, 0.5],
  [10, 0x3d86e6, 0xbfdeff, 0x7a7a6a, 0xfff3e0, 3.1, 0.6], [13.5, 0x2f7de0, 0xaed4ff, 0x7a7a6a, 0xffffff, 3.4, 0.62],
  [16.6, 0x4382d2, 0xffe0b4, 0x6a5a4a, 0xffddb0, 2.8, 0.55], [18.2, 0x5b68a6, 0xff8450, 0x4a3030, 0xff8a4a, 1.9, 0.42],
  [19.2, 0x2a3068, 0x8a4a6c, 0x2a2030, 0xff6a3a, 0.35, 0.3], [20.6, 0x0a1130, 0x242a52, 0x06080e, 0xffffff, 0, 0.22], [24, 0x02050d, 0x0a1226, 0x04060a, 0xffffff, 0, 0.22],
];
const TOD = { top: new THREE.Color(), hor: new THREE.Color(), gnd: new THREE.Color(), sunC: new THREE.Color(), sunI: 3, hemiI: 0.5, night: 0, elev: 1, dir: new THREE.Vector3() };
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const mixKF = (key, a, b, t, out) => out.copy(_c1.set(a[key])).lerp(_c2.set(b[key]), t);
let hour = save.hour, hourFrozen = false, lastEnvHour = -99, envTarget = null;
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(skyGeo, skyMat));
const envSun = new THREE.Mesh(new THREE.SphereGeometry(70, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); envScene.add(envSun);
function updateEnv() {
  envSun.position.copy(TOD.dir).multiplyScalar(1100); envSun.material.color.copy(TOD.sunC).multiplyScalar(TOD.elev > 0 ? 14 * Math.min(1, TOD.sunI / 2) : 0.02 + 0.0);
  const t = pmrem.fromScene(envScene, 0.02, 1, 3000); if (envTarget) envTarget.dispose(); envTarget = t; scene.environment = t.texture; lastEnvHour = hour;
}
function setTime(h, forceEnv) {
  hour = ((h % 24) + 24) % 24; save.hour = hour;
  let i = 0; while (i < KF.length - 2 && hour >= KF[i + 1][0]) i++;
  const a = KF[i], b = KF[i + 1], t = (hour - a[0]) / (b[0] - a[0]);
  mixKF(1, a, b, t, TOD.top); mixKF(2, a, b, t, TOD.hor); mixKF(3, a, b, t, TOD.gnd); mixKF(4, a, b, t, TOD.sunC);
  TOD.sunI = lerp(a[5], b[5], t); TOD.hemiI = lerp(a[6], b[6], t);
  const ang = ((hour - 6) / 12) * Math.PI; TOD.elev = Math.sin(ang); TOD.dir.set(Math.cos(ang), Math.sin(ang), 0.32).normalize();   // sun rises in the east (+x), sets over the ocean (-x)
  TOD.night = clamp((0.12 - TOD.elev) / 0.3, 0, 1);
  skyU.top.value.copy(TOD.top); skyU.hor.value.copy(TOD.hor); skyU.gnd.value.copy(TOD.gnd);
  scene.fog.color.copy(TOD.hor); scene.fog.density = 0.00075 + TOD.night * 0.0003;
  hemi.color.copy(TOD.top).lerp(new THREE.Color(1, 1, 1), 0.35); hemi.groundColor.copy(TOD.gnd).lerp(new THREE.Color(0.5, 0.45, 0.4), 0.5); hemi.intensity = TOD.hemiI;
  sun.color.copy(TOD.sunC); sun.intensity = TOD.sunI; moon.intensity = 0.55 * TOD.night;
  scene.environmentIntensity = 0.35 + 0.5 * (1 - TOD.night);
  renderer.toneMappingExposure = lerp(1.0, 1.35, TOD.night);
  sunSpr.material.color.copy(TOD.sunC).multiplyScalar(TOD.elev > -0.05 ? 1 : 0); starMat.opacity = clamp(TOD.night * 1.1, 0, 1); moonSpr.visible = TOD.night > 0.05;
  if (forceEnv || Math.abs(hour - lastEnvHour) > 0.45) updateEnv();
  if (winMats) for (const m of winMats) m.emissiveIntensity = TOD.night * 1.6;
  if (lampHeadMat) lampHeadMat.color.set(TOD.night > 0.25 ? 0xffe0a8 : 0x6c6f74);
  if (carObj) carObj.setNight(TOD.night);
}
const fmtClock = () => { const h = Math.floor(hour), m = Math.floor((hour - h) * 60); return ((h % 12) || 12) + ":" + String(m).padStart(2, "0") + (h < 12 ? " AM" : " PM"); };

// ---------- terrain: ground, beach, sea, mountains ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2300, 3600), new THREE.MeshStandardMaterial({ map: texGround, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(-330 + 1150, 0, 0); ground.material.map.repeat.set(2300 / 18, 3600 / 18); ground.receiveShadow = true; scene.add(ground);
{ // sand + sloping sea floor: profile in x
  const pts = [[-330, 0], [BEACH_X, 0], [-432, -2.94], [-1800, -2.94]], pos = [], uv = [], idx = [];
  for (const [x, y] of pts) for (const z of [-1800, 1800]) { pos.push(x, y, z); uv.push(x / 12, z / 12); }
  for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: texSand, roughness: 1, side: THREE.DoubleSide })); m.material.map.repeat.set(1, 1); m.receiveShadow = true; scene.add(m);
}
const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x0b5a78, roughness: 0.06, metalness: 0.0, envMapIntensity: 1.4, clearcoat: 0.6, clearcoatRoughness: 0.1 });
const farWater = new THREE.Mesh(new THREE.PlaneGeometry(2700, 6000), waterMat); farWater.rotation.x = -Math.PI / 2; farWater.position.set(-386 - 1350, WATER_Y - 0.14, 0); scene.add(farWater);
const nearGeo = new THREE.PlaneGeometry(520, 1300, 36, 90); nearGeo.rotateX(-Math.PI / 2);
const nearWater = new THREE.Mesh(nearGeo, waterMat); nearWater.position.set(-386 - 260, WATER_Y, 0); scene.add(nearWater);
const nwBase = Float32Array.from(nearGeo.attributes.position.array), nwPos = nearGeo.attributes.position, nwNrm = nearGeo.attributes.normal;
function animWater(t) {
  const p = nwPos.array, n = nwNrm.array, ox = nearWater.position.x;
  for (let i = 0; i < p.length; i += 3) {
    const x = nwBase[i] + ox, z = nwBase[i + 2];
    const a1 = x * 0.09 + t * 1.3, a2 = z * 0.06 + x * 0.03 - t * 1.05, a3 = z * 0.21 + t * 1.9;
    p[i + 1] = Math.sin(a1) * 0.07 + Math.sin(a2) * 0.06 + Math.sin(a3) * 0.025;
    const dx = Math.cos(a1) * 0.07 * 0.09 + Math.cos(a2) * 0.06 * 0.03, dz = Math.cos(a2) * 0.06 * 0.06 + Math.cos(a3) * 0.025 * 0.21, l = 1 / Math.hypot(dx, 1, dz);
    n[i] = -dx * l; n[i + 1] = l; n[i + 2] = -dz * l;
  }
  nwPos.needsUpdate = true; nwNrm.needsUpdate = true;
}
const foam = new THREE.Mesh(new THREE.PlaneGeometry(5, 1400), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false })); foam.rotation.x = -Math.PI / 2; foam.position.set(BEACH_X - 4.2, WATER_Y + 0.04, 0); scene.add(foam);
{ // mountains: three hazy ridges on the east / north / south, the sea is west
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, side: THREE.DoubleSide, fog: true });
  for (const [rad, hmax, col] of [[1080, 260, 0x7b6b5c], [1180, 380, 0x6a6a74], [1290, 520, 0x5b6280]]) {
    const SEG = 220, pos = [], colr = [], idx = []; const c = new THREE.Color(col), seed = R() * 100;
    for (let i = 0; i <= SEG; i++) {
      const a = lerp(-Math.PI * 0.78, Math.PI * 0.78, i / SEG) - Math.PI / 2 + Math.PI;   // skip the western arc (ocean)
      const th = a + Math.PI / 2 - Math.PI; const ang = th;
      const n = Math.sin(ang * 9 + seed) * 0.35 + Math.sin(ang * 23 + seed * 2) * 0.22 + Math.sin(ang * 51 + seed * 3) * 0.1 + 0.55;
      const h = hmax * clamp(n, 0.08, 1) * (0.6 + 0.4 * Math.sin(ang * 3 + seed));
      const x = Math.sin(ang) * rad, z = Math.cos(ang) * rad;
      pos.push(x, -20, z, x * 0.985, h, z * 0.985); const lo = c.clone().multiplyScalar(0.55), hi = c.clone().lerp(new THREE.Color(0xd8d4cc), 0.25);
      colr.push(lo.r, lo.g, lo.b, hi.r, hi.g, hi.b); if (i < SEG) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(colr, 3)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m);
  }
}

// ---------- instanced helpers ----------
const _o = new THREE.Object3D();
function instanced(geo, mat, list, { shadow = false, colors = null } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length;
  list.forEach((t, i) => { _o.position.set(t.x, t.y ?? 0, t.z); _o.rotation.set(0, t.ry ?? 0, 0); _o.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1); _o.updateMatrix(); m.setMatrixAt(i, _o.matrix); if (colors) m.setColorAt(i, colors(t, i)); });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m;
}
class Mesher {
  constructor() { this.p = []; this.n = []; this.u = []; this.c = []; this.i = []; this.v = 0; }
  quad(V, nx, ny, nz, UV, col) { for (let k = 0; k < 4; k++) { this.p.push(V[k][0], V[k][1], V[k][2]); this.n.push(nx, ny, nz); this.u.push(UV[k][0], UV[k][1]); this.c.push(col.r, col.g, col.b); } const v = this.v; this.i.push(v, v + 1, v + 2, v, v + 2, v + 3); this.v += 4; }
  mesh(mat, shadow = true) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.u, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3)); g.setIndex(this.i); const m = new THREE.Mesh(g, mat); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); return m; }
}
const BAY = 4.2, FLOOR = 3.6;
function walls(M, x0, z0, x1, z1, y0, y1, col) {
  const ou = Math.floor(R() * 4) / 4, ov = Math.floor(R() * 4) / 4, nf = Math.max(1, Math.round((y1 - y0) / FLOOR)), vv = nf / 4;
  const face = (V, len, nx, nz) => { const nb = Math.max(1, Math.round(len / BAY)), uu = nb / 4; M.quad(V, nx, 0, nz, [[ou, ov], [ou + uu, ov], [ou + uu, ov + vv], [ou, ov + vv]], col); };
  face([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], x1 - x0, 0, 1);
  face([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], x1 - x0, 0, -1);
  face([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], z1 - z0, 1, 0);
  face([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], z1 - z0, -1, 0);
}
function roofTop(M, x0, z0, x1, z1, y, col) { M.quad([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], 0, 1, 0, [[0, 0], [1, 0], [1, 1], [0, 1]], col); }
const _col = new THREE.Color();
const col = (hex) => _col.clone().set(hex);

// ---------- the city ----------
const winMats = [];
let lampHeadMat = null;
const TINT_STD = [0xfff4e2, 0xf0e0c0, 0xe0a888, 0xffffff, 0xd5d9dc, 0xcfd9c4, 0xb9c6d4, 0xe8cfa6];
const TINT_GLASS = [0x9fc4e6, 0x7fa8cf, 0x9fd0d0, 0x8aa0c0, 0xb3c0cc, 0x6f90b8];
const ROOF_COL = [0x6f6d68, 0x59585a, 0x8a5a44, 0x7d7a74];
const WALL = new Mesher(), GLASS = new Mesher(), ROOF = new Mesher(), POOLS = new Mesher(), PARKS = new Mesher();
const palms = [], lamps = [], blocks = [], parkedSpots = [];
const slabsList = [];

function building(x0, z0, x1, z1, h, { glass = false, roof = null } = {}) {
  const M = glass ? GLASS : WALL, c = col(pick(glass ? TINT_GLASS : TINT_STD)), rc = col(roof ?? pick(ROOF_COL));
  let top = h;
  if (h > 62 && x1 - x0 > 14 && z1 - z0 > 14) {       // setback tower
    const h1 = h * rr(0.55, 0.7), ins = rr(3, 5.5); walls(M, x0, z0, x1, z1, SLAB_H, h1, c); roofTop(ROOF, x0, z0, x1, z1, h1, rc);
    walls(M, x0 + ins, z0 + ins, x1 - ins, z1 - ins, h1, h, c); x0 += ins; x1 -= ins; z0 += ins; z1 -= ins;
  } else walls(M, x0, z0, x1, z1, SLAB_H, h, c);
  roofTop(ROOF, x0, z0, x1, z1, h, rc);
  if (h > 12) for (let k = 0, n = 1 + Math.floor(R() * 3); k < n; k++) { const w = rr(2, 4.5), d = rr(2, 4.5), px = rr(x0 + 1, Math.max(x0 + 1.01, x1 - w - 1)), pz = rr(z0 + 1, Math.max(z0 + 1.01, z1 - d - 1)), hh = rr(1.2, 3.2), rc2 = col(0x9a9890); walls(ROOF, px, pz, px + w, pz + d, h, h + hh, rc2); roofTop(ROOF, px, pz, px + w, pz + d, h + hh, rc2); }
  return addBoxCol(x0, z0, x1, z1, h);
}
function villa(x0, z0, x1, z1, beach) {
  const h = beach ? rr(6.5, 11) : rr(5.2, 8.6), w = x1 - x0, d = z1 - z0, tint = pick(TINT_STD), c = col(tint), rc = col(beach ? 0xe9e6df : pick([0x8a5a44, 0x9a6a50, 0x6f6d68]));
  const sp = Math.random() < 0.5; const bx1 = sp ? x1 : x0 + w * 0.65, bz1 = z1 - (sp ? d * 0.35 : 0);
  walls(WALL, x0, z0, bx1, bz1, SLAB_H, h, c); roofTop(ROOF, x0 - 0.3, z0 - 0.3, bx1 + 0.3, bz1 + 0.3, h, rc); bldRects.push([x0, z0, bx1, bz1]); addBoxCol(x0, z0, bx1, bz1, h);
  const h2 = h * 0.55; // wing / garage
  if (sp) { walls(WALL, x0, bz1, x0 + w * 0.5, z1, SLAB_H, h2, c); roofTop(ROOF, x0 - 0.2, bz1, x0 + w * 0.5 + 0.2, z1 + 0.2, h2, rc); addBoxCol(x0, bz1, x0 + w * 0.5, z1, h2); bldRects.push([x0, bz1, x0 + w * 0.5, z1]); }
  else { walls(WALL, bx1, z0, x1, z0 + d * 0.5, SLAB_H, h2, c); roofTop(ROOF, bx1, z0 - 0.2, x1 + 0.2, z0 + d * 0.5 + 0.2, h2, rc); addBoxCol(bx1, z0, x1, z0 + d * 0.5, h2); bldRects.push([bx1, z0, x1, z0 + d * 0.5]); }
  if (R() < 0.45) { const px0 = sp ? x0 + w * 0.55 : x0 + 0.5, pz0 = sp ? bz1 + 1 : z0 + d * 0.55, pw = Math.min(6, w * 0.4), pd = Math.min(4.5, d * 0.35); if (pw > 3) POOLS.quad([[px0, SLAB_H + 0.04, pz0 + pd], [px0 + pw, SLAB_H + 0.04, pz0 + pd], [px0 + pw, SLAB_H + 0.04, pz0], [px0, SLAB_H + 0.04, pz0]], 0, 1, 0, [[0, 0], [1, 0], [1, 1], [0, 1]], col(0xffffff)); }
}
function addPalm(x, z, s = 1) { palms.push({ x, z, s: s * rr(0.85, 1.25), ry: R() * TAU }); addCircCol(x, z, 0.35); }

for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
  const cx = ORG + i * PITCH, cz = ORG + j * PITCH, dist = Math.hypot(i - 3.5, j - 3.5);
  const zone = i === 0 ? "beach" : dist < 2.35 ? "down" : dist < 3.75 ? (R() < 0.14 ? "park" : "mid") : (R() < 0.1 ? "park" : "sub");
  blocks.push({ i, j, cx, cz, zone }); slabsList.push({ x: cx, y: SLAB_H / 2, z: cz });
  const lo = (v) => v - 28, hi = (v) => v + 28;
  if (zone === "down") {
    for (const [ax, az] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const x0 = lo(cx) + ax * 30, z0 = lo(cz) + az * 30, ins = () => rr(0, 3);
      if (R() < 0.1) { PARKS.quad([[x0, SLAB_H + 0.03, z0 + 26], [x0 + 26, SLAB_H + 0.03, z0 + 26], [x0 + 26, SLAB_H + 0.03, z0], [x0, SLAB_H + 0.03, z0]], 0, 1, 0, [[0, 0], [1, 1], [1, 0], [0, 1]], col(0xffffff)); for (let k = 0; k < 4; k++) addPalm(x0 + rr(2, 24), z0 + rr(2, 24)); continue; }
      const h = 52 + (3.4 - dist) * 48 + R() * 60; const b = building(x0 + ins(), z0 + ins(), x0 + 26 - ins(), z0 + 26 - ins(), h, { glass: h > 70 || R() < 0.4 }); bldRects.push([b.x0, b.z0, b.x1, b.z1]);
    }
  } else if (zone === "mid") {
    if (R() < 0.28) { const b = building(lo(cx) + 1, lo(cz) + 1, hi(cx) - 1, hi(cz) - 1, rr(10, 22)); bldRects.push([b.x0, b.z0, b.x1, b.z1]); }
    else for (const [ax, az] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const x0 = lo(cx) + ax * 30, z0 = lo(cz) + az * 30, ins = () => rr(0, 3.5); if (R() < 0.08) { for (let k = 0; k < 3; k++) addPalm(x0 + rr(2, 24), z0 + rr(2, 24)); continue; } const b = building(x0 + ins(), z0 + ins(), x0 + 26 - ins(), z0 + 26 - ins(), rr(14, 44), { glass: R() < 0.25 }); bldRects.push([b.x0, b.z0, b.x1, b.z1]); }
  } else if (zone === "park") {
    PARKS.quad([[cx - 29, SLAB_H + 0.03, cz + 29], [cx + 29, SLAB_H + 0.03, cz + 29], [cx + 29, SLAB_H + 0.03, cz - 29], [cx - 29, SLAB_H + 0.03, cz - 29]], 0, 1, 0, [[0, 0], [1, 0], [1, 1], [0, 1]], col(0xffffff));
    for (let k = 0; k < 12; k++) addPalm(cx + rr(-26, 26), cz + rr(-26, 26));
  } else { // villas
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
      const x0 = lo(cx) + a * 19.5 + rr(0, 1.2), z0 = lo(cz) + b * 19.5 + rr(0, 1.2);
      if (R() < 0.8) villa(x0 + 1, z0 + 1, x0 + 16, z0 + 16, zone === "beach"); else for (let k = 0; k < 2; k++) addPalm(x0 + rr(2, 15), z0 + rr(2, 15));
      if (R() < 0.5) addPalm(x0 + rr(0, 17), z0 + rr(0, 17));
    }
  }
  // street trees + lamps on the sidewalk ring
  const step = zone === "down" ? 48 : zone === "mid" ? 32 : 20;
  for (let t = -24; t <= 24; t += step) for (const [px, pz] of [[cx + t, cz - 30.6], [cx + t, cz + 30.6], [cx - 30.6, cz + t], [cx + 30.6, cz + t]]) if (R() < 0.85) addPalm(px, pz, 0.9);
  for (const [px, pz] of [[cx - 31, cz - 31], [cx + 31, cz - 31], [cx - 31, cz + 31], [cx + 31, cz + 31], [cx, cz - 31], [cx, cz + 31], [cx - 31, cz], [cx + 31, cz]]) { lamps.push({ x: px, z: pz }); addCircCol(px, pz, 0.3); }
}
// materials for the merged city meshes
const winStd = winTex("std", 11), winGlass = winTex("glass", 22);
const matStd = new THREE.MeshStandardMaterial({ map: winStd.map, emissiveMap: winStd.em, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.62, metalness: 0.05 });
const matGlass = new THREE.MeshStandardMaterial({ map: winGlass.map, emissiveMap: winGlass.em, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.18, metalness: 0.7, envMapIntensity: 1.3 });
winMats.push(matStd, matGlass);
WALL.mesh(matStd); GLASS.mesh(matGlass);
ROOF.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), false);
POOLS.mesh(new THREE.MeshPhysicalMaterial({ vertexColors: true, color: 0x24b4e6, roughness: 0.05, clearcoat: 1 }), false);
PARKS.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x5f9a4a, roughness: 1, map: texGround }), false).receiveShadow = true;
// sidewalks / block slabs
instanced(new THREE.BoxGeometry(64, SLAB_H, 64), new THREE.MeshStandardMaterial({ map: texConcrete, roughness: 0.95 }), slabsList);
// roads (instanced textured segments + intersections)
{
  const segs = [], inter = [];
  for (let k = 0; k < 9; k++) for (let g = 0; g < 8; g++) { const c = -320 + PITCH * g + 40; segs.push({ x: roadLine(k), z: c, ry: 0 }); segs.push({ x: c, z: roadLine(k), ry: Math.PI / 2 }); }
  for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) inter.push({ x: roadLine(a), z: roadLine(b) });
  for (let m = 0; m < 10; m++) { const c = 360 + 64 * m; segs.push({ x: c, z: 0, ry: Math.PI / 2 }); segs.push({ x: 0, z: c, ry: 0 }); segs.push({ x: 0, z: -c, ry: 0 }); }
  const pg = new THREE.PlaneGeometry(ROAD_W, 64); pg.rotateX(-Math.PI / 2); const ig = new THREE.PlaneGeometry(ROAD_W, ROAD_W); ig.rotateX(-Math.PI / 2);
  const rm = new THREE.MeshStandardMaterial({ map: texRoad, roughness: 0.82, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const im = new THREE.MeshStandardMaterial({ map: texInter, roughness: 0.82, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  instanced(pg, rm, segs.map((s) => ({ ...s, y: 0.03 }))); instanced(ig, im, inter.map((s) => ({ ...s, y: 0.03 })));
}
// palms (trunk + crown) and lamp posts
{
  const trunk = new THREE.CylinderGeometry(0.17, 0.3, 1, 5, 1, true); trunk.translate(0, 0.5, 0);
  const crown = (() => { const pos = [], idx = [], nL = 6; let v = 0;
    for (let l = 0; l < nL; l++) { const a = (l / nL) * TAU + R() * 0.3, len = rr(2.8, 3.8), pitch = rr(0.15, 0.5), ca = Math.cos(a), sa = Math.sin(a), S = 4;
      for (let s = 0; s <= S; s++) { const t = s / S, d = t * len, y = Math.sin(t * 2.2) * 0.9 * (1 - pitch) + t * pitch * 1.3 - t * t * 2.4, w = 0.5 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.03; const px = ca * d, pz = sa * d; pos.push(px - sa * w, y, pz + ca * w, px + sa * w, y, pz - ca * w); if (s < S) { idx.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } v += 2; } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; })();
  const mT = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 1 }), mC = new THREE.MeshStandardMaterial({ color: 0x3f7d36, roughness: 0.8, side: THREE.DoubleSide });
  const ts = palms.map((p) => { const h = rr(7, 12) * p.s; p.h = h; return { x: p.x, y: SLAB_H * (slabAt(p.x, p.z) ? 1 : 0), z: p.z, ry: p.ry, sx: 1 + p.s * 0.2, sy: h, sz: 1 + p.s * 0.2 }; });
  instanced(trunk, mT, ts, { shadow: true });
  instanced(crown, mC, palms.map((p, i) => ({ x: p.x, y: ts[i].y + p.h - 0.2, z: p.z, ry: p.ry, sx: p.s, sy: p.s, sz: p.s })), { shadow: false });
  const pole = new THREE.CylinderGeometry(0.1, 0.14, 7, 6); pole.translate(0, 3.5, 0); const arm = new THREE.BoxGeometry(1.8, 0.1, 0.1); arm.translate(0.9, 7.05, 0);
  const head = new THREE.BoxGeometry(0.6, 0.12, 0.3); head.translate(1.7, 6.97, 0);
  const lamp = lamps.map((l) => { const bx = ORG + Math.round((l.x - ORG) / PITCH) * PITCH, bz = ORG + Math.round((l.z - ORG) / PITCH) * PITCH; return { x: l.x, y: SLAB_H, z: l.z, ry: Math.atan2(-(l.z - bz), l.x - bx) + Math.PI }; });
  instanced(pole, new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.6 }), lamp); instanced(arm, new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.6, metalness: 0.6 }), lamp);
  lampHeadMat = new THREE.MeshBasicMaterial({ color: 0x6c6f74 }); instanced(head, lampHeadMat, lamp);
}
// scrub + rocks in the desert around the city
{
  const sh = [], rk = []; for (let k = 0; k < 1000; k++) { const a = R() * TAU, r = rr(360, 980), x = Math.cos(a) * r, z = Math.sin(a) * r; if (x < -330 || (Math.abs(z) < 14) || (Math.abs(x) < 14)) continue; const s = rr(0.8, 2.4); sh.push({ x, y: 0.2, z, ry: R() * TAU, sx: s * 1.3, sy: s * 0.7, sz: s * 1.3 }); }
  for (let k = 0; k < 250; k++) { const a = R() * TAU, r = rr(370, 980), x = Math.cos(a) * r, z = Math.sin(a) * r; if (x < -330 || Math.abs(z) < 14 || Math.abs(x) < 14) continue; const s = rr(0.8, 4); rk.push({ x, y: s * 0.3, z, ry: R() * TAU, sx: s * 1.3, sy: s, sz: s }); }
  instanced(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), sh, { colors: (t, i) => new THREE.Color().setHSL(0.22 + (i % 7) * 0.01, 0.28, 0.28 + (i % 5) * 0.03) });
  instanced(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), rk, { shadow: true, colors: (t, i) => new THREE.Color().setHSL(0.08, 0.15, 0.35 + (i % 6) * 0.04) });
}

// ---------- particles ----------
class Particles {
  constructor(max, mat, grav, alpha) { this.max = max; this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.ttl = new Float32Array(max); this.base = new Float32Array(max * 4); this.grav = grav; this.n = 0; this.alpha = alpha;
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -9999;
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(this.col, 4)); this.g = g;
    this.pts = new THREE.Points(g, mat); this.pts.frustumCulled = false; scene.add(this.pts); }
  spawn(x, y, z, vx, vy, vz, life, r, g, b, a = 1) { const k = this.n; this.n = (this.n + 1) % this.max; this.pos.set([x, y, z], k * 3); this.vel.set([vx, vy, vz], k * 3); this.base.set([r, g, b, a], k * 4); this.life[k] = this.ttl[k] = life; }
  update(dt) { for (let k = 0; k < this.max; k++) { if (this.life[k] <= 0) continue; this.life[k] -= dt; const f = Math.max(0, this.life[k] / this.ttl[k]); this.vel[k * 3 + 1] -= this.grav * dt; for (let a = 0; a < 3; a++) this.pos[k * 3 + a] += this.vel[k * 3 + a] * dt;
      this.col[k * 4] = this.base[k * 4]; this.col[k * 4 + 1] = this.base[k * 4 + 1]; this.col[k * 4 + 2] = this.base[k * 4 + 2]; this.col[k * 4 + 3] = this.base[k * 4 + 3] * (this.alpha ? f : 1) * (this.alpha ? 1 : f); if (this.life[k] <= 0) this.pos[k * 3 + 1] = -9999; }
    this.g.attributes.position.needsUpdate = true; this.g.attributes.color.needsUpdate = true; }
}
const smoke = new Particles(260, new THREE.PointsMaterial({ size: 2.4, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.003 }), -0.4, true);
const sparks = new Particles(160, new THREE.PointsMaterial({ size: 0.28, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), 9, false);

// ---------- audio (synth only) ----------
let AC = null, master = null, noiseBuf = null, eng = null, amb = null, hornNodes = null;
function audioInit() {
  if (AC) { if (AC.state === "suspended") AC.resume(); return; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = AC.createGain(); master.gain.value = save.snd ? 1 : 0; master.connect(AC.destination);
  noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const loop = (type, f, q) => { const s = AC.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(fl).connect(g).connect(master); s.start(); return { s, fl, g }; };
  amb = { wind: loop("lowpass", 380), surf: loop("lowpass", 700), city: loop("bandpass", 240, 0.6), screech: loop("bandpass", 1900, 6) };
  // engine: two oscillators through a low-pass
  const o1 = AC.createOscillator(), o2 = AC.createOscillator(), fl = AC.createBiquadFilter(), g = AC.createGain(), sh = AC.createWaveShaper();
  o1.type = "sawtooth"; o2.type = "square"; fl.type = "lowpass"; fl.frequency.value = 600; g.gain.value = 0;
  const cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 2.2); } sh.curve = cv;
  o1.connect(sh); o2.connect(sh); sh.connect(fl).connect(g).connect(master); o1.start(); o2.start(); eng = { o1, o2, fl, g };
}
function sfxNoise(dur, vol, lp) { if (!AC) return; const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime; s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = lp; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur); }
function sfxTone(f0, f1, dur, type = "sine", vol = 0.06) { if (!AC) return; const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime; o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g).connect(master); o.start(t); o.stop(t + dur); }
function hornOn(on) { if (!AC) return; if (on && !hornNodes) { const a = AC.createOscillator(), b = AC.createOscillator(), g = AC.createGain(); a.type = b.type = "square"; a.frequency.value = 380; b.frequency.value = 480; g.gain.value = 0.05; a.connect(g); b.connect(g); g.connect(master); a.start(); b.start(); hornNodes = { a, b, g }; } else if (!on && hornNodes) { hornNodes.a.stop(); hornNodes.b.stop(); hornNodes = null; } }
function setSound(on) { save.snd = on; persist(); if (master) master.gain.value = on ? 1 : 0; $("#bSnd").textContent = on ? "🔊" : "🔇"; }

// ---------- character ----------
function makePerson() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.position.y = 0.95;
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8a47c, roughness: 0.7 }), shirt = new THREE.MeshStandardMaterial({ color: 0x24324a, roughness: 0.8 }), jeans = new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.9 }), shoe = new THREE.MeshStandardMaterial({ color: 0xe9e9e9, roughness: 0.6 }), hair = new THREE.MeshStandardMaterial({ color: 0x20150d, roughness: 0.9 });
  const cap = (r, l, mat, y) => { const g = new THREE.CapsuleGeometry(r, l, 4, 10); g.translate(0, y, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m; };
  const torso = cap(0.17, 0.34, shirt, 0.3); torso.scale.z = 0.72; body.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), skin); head.position.set(0, 0.8, 0.01); head.castShadow = true; body.add(head);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10, 0, TAU, 0, Math.PI * 0.55), hair); hr.position.set(0, 0.815, -0.01); body.add(hr);
  const neck = cap(0.045, 0.06, skin, 0.7); body.add(neck);
  const limb = (x, y, len, r, mat, parent) => { const p = new THREE.Group(); p.position.set(x, y, 0); const g = new THREE.CapsuleGeometry(r, len, 4, 8); g.translate(0, -len / 2 - r * 0.3, 0); const m = new THREE.Mesh(g, mat); m.castShadow = true; p.add(m); parent.add(p); return p; };
  const arm = (x) => { const s = limb(x, 0.58, 0.46, 0.055, shirt, body); const f = limb(0, -0.55, 0.38, 0.05, skin, s); return { s, f }; };
  const leg = (x) => { const t = limb(x, 0, 0.42, 0.095, jeans, body); t.position.y = 0.02; const k = limb(0, -0.5, 0.38, 0.075, jeans, t); const ft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), shoe); ft.position.set(0, -0.5, 0.06); ft.castShadow = true; k.add(ft); return { t, k }; };
  const A = [arm(0.24), arm(-0.24)], L = [leg(0.1), leg(-0.1)];
  return { root, body, torso, head, A, L };
}
const person = makePerson(); scene.add(person.root);

// ---------- the car ----------
function buildCar() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xc8161d, metalness: 0.7, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.04 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x080b10, metalness: 0.9, roughness: 0.04, envMapIntensity: 1.5 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.6, metalness: 0.4 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 0.4 }), tailMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff1018, emissiveIntensity: 0.5 });
  const prof = (pts, depth, mat, bev) => { const sh = new THREE.Shape(); pts.forEach(([z, y], k) => (k ? sh.lineTo(-z, y) : sh.moveTo(-z, y))); const ge = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 1 }); ge.translate(0, 0, -depth / 2); ge.rotateY(Math.PI / 2); const m = new THREE.Mesh(ge, mat); m.castShadow = true; body.add(m); return m; };
  const tub = prof([[2.2, 0.45], [2.28, 0.62], [2.02, 0.78], [1.15, 0.9], [0.7, 0.93], [-1.5, 0.99], [-2.2, 0.96], [-2.28, 0.7], [-2.2, 0.4], [-1.9, 0.3], [1.9, 0.3]], 1.6, paint, 0.12);
  prof([[1.0, 0.92], [0.38, 1.27], [-0.7, 1.29], [-1.48, 1.0]], 1.42, glass, 0.04);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 1.0), paint); roof.position.set(0, 1.32, -0.18); roof.castShadow = true; body.add(roof);
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; body.add(m); return m; };
  add(new THREE.BoxGeometry(1.7, 0.08, 0.35), dark, 0, 0.32, 2.3); add(new THREE.BoxGeometry(1.0, 0.18, 0.06), dark, 0, 0.58, 2.42);
  for (const s of [-1, 1]) { add(new THREE.BoxGeometry(0.42, 0.1, 0.12), headMat, s * 0.66, 0.76, 2.17).rotation.y = s * 0.2; add(new THREE.BoxGeometry(0.5, 0.08, 0.06), tailMat, s * 0.62, 0.88, -2.33); add(new THREE.BoxGeometry(0.14, 0.1, 0.22), dark, s * 1.0, 1.0, 0.75); add(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1, roughness: 0.25 }), s * 0.5, 0.36, -2.35).rotation.x = Math.PI / 2; }
  add(new THREE.BoxGeometry(1.7, 0.05, 0.34), paint, 0, 1.18, -2.2); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 0.22, 0.2), dark, s * 0.6, 1.08, -2.15);
  const tire = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.22 });
  const wheels = [];
  for (const [x, z, f] of [[0.92, 1.42, 1], [-0.92, 1.42, 1], [0.92, -1.38, 0], [-0.92, -1.38, 0]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.35, z); const spin = new THREE.Group(); pivot.add(spin);
    const tg = new THREE.CylinderGeometry(0.35, 0.35, 0.27, 24); tg.rotateZ(Math.PI / 2); const t = new THREE.Mesh(tg, tire); t.castShadow = true; spin.add(t);
    const rg = new THREE.CylinderGeometry(0.23, 0.23, 0.285, 12); rg.rotateZ(Math.PI / 2); spin.add(new THREE.Mesh(rg, rim));
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.4), dark); sp.rotation.x = (k / 5) * Math.PI; spin.add(sp); }
    g.add(pivot); wheels.push({ pivot, spin, front: !!f });
  }
  const head = new THREE.SpotLight(0xfff0d0, 0, 80, 0.6, 0.7, 1.2); head.position.set(0, 0.8, 2.0); const tgt = new THREE.Object3D(); tgt.position.set(0, 0.2, 14); g.add(head, tgt); head.target = tgt;
  return { grp: g, body, wheels, paint, headMat, tailMat, head, setNight(n) { head.intensity = this.on ? 320 * n : 0; headMat.emissiveIntensity = 0.35 + 1.6 * n; } };
}
const carObj = buildCar(); scene.add(carObj.grp);
const car = { x: 3.4, z: 28, H: 0, vx: 0, vz: 0, yr: 0, steer: 0, thr: 0, brake: 0, hb: false, health: 100, roll: 0, rollV: 0, pitch: 0, pitchV: 0, spin: 0, vf: 0, vl: 0, gear: 0, rpm: 0, y: 0, latA: 0, lonA: 0, prevVf: 0, slip: 0 };
const CAR_VMAX = 74, CAR_R = 1.0, CAR_OFF = [-1.45, 0, 1.45];

// ---------- player / camera state ----------
const P = { x: 5.5, y: 0, z: 17, vy: 0, face: 0, speed: 0, ground: true, crouch: false, stamina: 100, tired: false, swim: false, hp: 100, inCar: false, phase: 0, sprintT: 0, swimT: 0, walked: 0, air: 0, stepT: 0 };
const CAM = { yaw: 0, pitch: 0.3, dist: 4.2, d: 4.2, t: new THREE.Vector3(), idle: 0, shake: 0, fov: 62 };
let paused = true, started = false, frameNo = 0;

// ---------- input ----------
const K = {};   // keyboard state
const T = { jx: 0, jy: 0, gas: false, brake: false, hb: false, sprint: false, jump: false, horn: false };
const E = { use: false, crouch: false, jump: false };
let lookX = 0, lookY = 0, locked = false;
addEventListener("keydown", (e) => {
  if (paused) return; if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault(); if (e.repeat) return;
  K[e.code] = true; if (e.code === "KeyE" || e.code === "KeyF") E.use = true; if (e.code === "KeyC") E.crouch = true; if (e.code === "Space") E.jump = true; if (e.code === "KeyH") hornOn(true);
  if (e.code === "KeyP" || e.code === "Tab") { e.preventDefault(); pauseGame(); }
});
addEventListener("keyup", (e) => { K[e.code] = false; if (e.code === "KeyH") hornOn(false); });
addEventListener("blur", () => { for (const k in K) K[k] = false; });
document.addEventListener("mousemove", (e) => { if (paused) return; if (locked) { lookX += e.movementX; lookY += e.movementY; } else if (e.buttons & 1) { lookX += e.movementX; lookY += e.movementY; } });
document.addEventListener("pointerlockchange", () => { locked = document.pointerLockElement === $("#gl"); if (!locked && started && !paused && !coarse) pauseGame(); });
$("#gl").addEventListener("mousedown", () => { if (!paused && !coarse && !locked) { try { const p = $("#gl").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch {} } });
function lockPointer() { if (coarse) return; try { const p = $("#gl").requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch {} }
// touch: dynamic joystick (left), look drag (right), buttons
{
  const zl = $("#zl"), zr = $("#zr"), joy = $("#joy"), knob = joy.firstElementChild; let jid = null, ox = 0, oy = 0, lid = null, lx = 0, ly = 0;
  zl.addEventListener("pointerdown", (e) => { jid = e.pointerId; zl.setPointerCapture(jid); ox = e.clientX; oy = e.clientY; const r = zl.getBoundingClientRect(); joy.style.left = e.clientX - r.left + "px"; joy.style.top = e.clientY - r.top + "px"; joy.style.opacity = 1; knob.style.transform = ""; $("#joyhint").style.opacity = 0; });
  zl.addEventListener("pointermove", (e) => { if (e.pointerId !== jid) return; let dx = e.clientX - ox, dy = e.clientY - oy; const m = Math.hypot(dx, dy), Rr = 50; if (m > Rr) { dx *= Rr / m; dy *= Rr / m; } knob.style.transform = `translate(${dx}px,${dy}px)`; T.jx = dx / Rr; T.jy = -dy / Rr; });
  const jend = (e) => { if (e.pointerId !== jid) return; jid = null; T.jx = T.jy = 0; joy.style.opacity = 0; $("#joyhint").style.opacity = 0.7; }; zl.addEventListener("pointerup", jend); zl.addEventListener("pointercancel", jend);
  zr.addEventListener("pointerdown", (e) => { lid = e.pointerId; zr.setPointerCapture(lid); lx = e.clientX; ly = e.clientY; });
  zr.addEventListener("pointermove", (e) => { if (e.pointerId !== lid) return; lookX += (e.clientX - lx) * 2.2; lookY += (e.clientY - ly) * 2.2; lx = e.clientX; ly = e.clientY; });
  const lend = (e) => { if (e.pointerId === lid) lid = null; }; zr.addEventListener("pointerup", lend); zr.addEventListener("pointercancel", lend);
  const hold = (id, key, edge) => { const b = $(id); b.addEventListener("pointerdown", (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add("down"); T[key] = true; if (edge) E[edge] = true; if (key === "horn") hornOn(true); }); for (const ev of ["pointerup", "pointercancel"]) b.addEventListener(ev, () => { b.classList.remove("down"); T[key] = false; if (key === "horn") hornOn(false); }); };
  hold("#bJump", "jump", "jump"); hold("#bSprint", "sprint"); hold("#bGas", "gas"); hold("#bBrake", "brake"); hold("#bHB", "hb"); hold("#bHorn", "horn");
  for (const [id, edge] of [["#bUse", "use"], ["#bCrouch", "crouch"]]) $(id).addEventListener("pointerdown", (e) => { e.preventDefault(); E[edge] = true; });
}
$("#bPause").addEventListener("click", () => pauseGame()); $("#bSnd").addEventListener("click", () => { audioInit(); setSound(!save.snd); }); $("#bSnd").textContent = save.snd ? "🔊" : "🔇";

// ---------- test checklist ----------
const TESTS = [
  ["look", "Look around with the camera", "Mouse (click the game) or drag the right side of the screen"],
  ["walk", "Walk about 20 m on foot", "WASD or the left thumbstick"],
  ["jump", "Jump", "Space or JUMP"],
  ["crouch", "Crouch", "C or DUCK"],
  ["sprint", "Sprint for 3 seconds", "Hold Shift or RUN. The stamina bar drains"],
  ["enter", "Get into the red sports car", "Walk up to it and press E or ENTER"],
  ["mph60", "Reach 60 mph", "W or GAS"],
  ["drift", "Drift: handbrake while turning", "Space or HAND BRAKE while steering"],
  ["crash", "Crash into a building", "Watch the CAR health bar and sparks"],
  ["mph120", "Reach 120 mph", "Drive the long highway east (menu → Teleport → Highway)"],
  ["exit", "Get out of the car", "E or EXIT"],
  ["swim", "Swim in the ocean", "Walk west to the beach and keep going"],
  ["night", "See the city at night", "Menu → Time of day → Night"],
  ["tp", "Use a teleport", "Menu → Teleport"],
];
function tick(id) { if (save.tests[id]) return; save.tests[id] = 1; persist(); toast("✅ " + TESTS.find((t) => t[0] === id)[1]); sfxTone(520, 1040, 0.18, "triangle", 0.05); }
let lookAcc = 0;

// ---------- HUD ----------
const H = { clock: $("#clock"), money: $("#money"), hp: $("#hpb i"), st: $("#stb i"), ca: $("#cab i"), cab: $("#cab"), cal: $("#cal"), mph: $("#mph"), rpm: $("#rpm i"), gear: $("#gear"), prompt: $("#prompt"), toast: $("#toast"), objt: $("#objt"), objs: $("#objs"), mm: $("#mm") };
const setTxt = (e, v) => { v = String(v); if (e._t !== v) { e._t = v; e.textContent = v; } };
const setW = (e, v) => { v = Math.round(clamp(v, 0, 100)); if (e._w !== v) { e._w = v; e.style.width = v + "%"; } };
let toastT = 0, lastClock = "", lastObj = "";
function toast(m, s = 2.4) { H.toast.textContent = m; H.toast.classList.add("on"); toastT = s; }
function hudUpdate(dt) {
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) H.toast.classList.remove("on"); }
  const c = fmtClock(); if (c !== lastClock) { H.clock.textContent = c; lastClock = c; }
  setTxt(H.money, "$" + save.money.toLocaleString()); setW(H.hp, P.hp); setW(H.st, P.stamina);
  if (H.cab.hidden === P.inCar) H.cab.hidden = H.cal.hidden = !P.inCar;
  if (P.inCar) { setW(H.ca, car.health); setTxt(H.mph, Math.round(Math.abs(car.vf) * 2.23694)); setW(H.rpm, car.rpm * 100); setTxt(H.gear, Math.abs(car.vf) < 0.8 ? "N" : car.vf < -0.5 ? "R" : "Gear " + car.gear); }
  const t = TESTS.find((x) => !save.tests[x[0]]), o = t ? t[1] + "|" + t[2] : "All Stage 1 tests passed! 🎉|Tell me what to fix or improve, then we move to Stage 2";
  if (o !== lastObj) { lastObj = o; const [a, b] = o.split("|"); H.objt.textContent = t ? "Test: " + a : a; H.objs.textContent = b; }
}
// minimap
const MAPX0 = -440, MAPZ0 = -460, MAPW = 900, MAPH = 920;
const mapC = document.createElement("canvas"); mapC.width = MAPW; mapC.height = MAPH;
{
  const g = mapC.getContext("2d"), X = (x) => x - MAPX0, Z = (z) => z - MAPZ0;
  g.fillStyle = "#b8ad84"; g.fillRect(0, 0, MAPW, MAPH);
  g.fillStyle = "#e3d3a6"; g.fillRect(0, 0, X(BEACH_X), MAPH); g.fillStyle = "#2f86a8"; g.fillRect(0, 0, X(BEACH_X - 6), MAPH);
  g.fillStyle = "#555961"; for (let k = 0; k < 9; k++) { g.fillRect(X(roadLine(k) - 8), 0, 16, MAPH); g.fillRect(0, Z(roadLine(k) - 8), MAPW, 16); } g.fillRect(X(320), Z(-6), MAPW, 12);
  g.fillStyle = "#2f86a8"; g.fillRect(0, 0, X(BEACH_X - 6), MAPH);
  for (const b of blocks) { g.fillStyle = b.zone === "park" ? "#6fa65e" : "#9c9b95"; g.fillRect(X(b.cx - 32), Z(b.cz - 32), 64, 64); }
  g.fillStyle = "#6fa65e"; for (const b of blocks) if (b.zone === "park") g.fillRect(X(b.cx - 29), Z(b.cz - 29), 58, 58);
  g.fillStyle = "#d9d8d3"; for (const r of bldRects) g.fillRect(X(r[0]), Z(r[1]), r[2] - r[0], r[3] - r[1]);
}
const mmg = H.mm.getContext("2d");
function drawMinimap() {
  if (window.__noMap) return;
  const S = H.mm.width, c = S / 2, zoom = (S / 300) * (P.inCar ? lerp(1.0, 0.55, clamp(Math.abs(car.vf) / 50, 0, 1)) : 1.15), px = P.inCar ? car.x : P.x, pz = P.inCar ? car.z : P.z;
  mmg.save(); mmg.fillStyle = "#b8ad84"; mmg.fillRect(0, 0, S, S); mmg.beginPath(); mmg.arc(c, c, c - 2, 0, TAU); mmg.clip();
  mmg.translate(c, c); mmg.rotate(CAM.yaw + Math.PI); mmg.scale(zoom, zoom); mmg.drawImage(mapC, -(px - MAPX0), -(pz - MAPZ0));
  if (!P.inCar) { mmg.fillStyle = "#ff3b3b"; mmg.fillRect(car.x - px - 3, car.z - pz - 3, 6, 6); }
  mmg.restore();
  mmg.save(); mmg.translate(c, c); mmg.fillStyle = "#fff"; mmg.strokeStyle = "#08121a"; mmg.lineWidth = 3; mmg.beginPath(); mmg.moveTo(0, -13); mmg.lineTo(9, 10); mmg.lineTo(0, 5); mmg.lineTo(-9, 10); mmg.closePath(); mmg.stroke(); mmg.fill(); mmg.restore();
  mmg.fillStyle = "#fff"; mmg.font = "bold 20px system-ui"; mmg.textAlign = "center"; mmg.fillText("N", c - Math.sin(CAM.yaw) * (c - 16), c + Math.cos(CAM.yaw) * (c - 16) + 7);
}

// ---------- player update ----------
function moveInput() {
  let x = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + T.jx, y = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + T.jy;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y, l: Math.min(1, l) };
}
function updatePlayer(dt) {
  const mv = moveInput(), sp = (K.ShiftLeft || K.ShiftRight || T.sprint);
  if (E.crouch) { E.crouch = false; if (!P.swim) { P.crouch = !P.crouch; if (P.crouch) tick("crouch"); } }
  const gh = groundH(P.x, P.z), depth = WATER_Y - gh;
  P.swim = depth > 0.95; if (P.swim) { P.crouch = false; P.swimT += dt; if (P.swimT > 2) tick("swim"); } else P.swimT = 0;
  // desired speed
  let target = 0, wantSprint = sp && !P.crouch && !P.swim && mv.l > 0.3 && !P.tired && P.stamina > 0;
  if (mv.l > 0.08) { target = P.swim ? 2.3 : P.crouch ? 1.7 : wantSprint ? 7.4 : mv.l < 0.55 && coarse ? 1.9 : 4.6; target *= P.swim || P.crouch ? 1 : (mv.l < 0.55 && coarse ? 1 : 1); }
  if (wantSprint) { P.stamina = Math.max(0, P.stamina - 22 * dt); P.sprintT += dt; if (P.sprintT > 3) tick("sprint"); if (P.stamina <= 0) P.tired = true; } else { P.sprintT = Math.max(0, P.sprintT - dt * 2); P.stamina = Math.min(100, P.stamina + (mv.l > 0.08 ? 10 : 18) * dt); if (P.tired && P.stamina > 28) P.tired = false; }
  // world-space direction from camera
  const sy = Math.sin(CAM.yaw), cy = Math.cos(CAM.yaw), dx = sy * mv.y - cy * mv.x, dz = cy * mv.y + sy * mv.x;  // forward*y + right*x, right = (-cos, sin)
  const dl = Math.hypot(dx, dz) || 1, tvx = (dx / dl) * target, tvz = (dz / dl) * target;
  const k = Math.min(1, (P.ground || P.swim ? 12 : 3) * dt); P.vx = (P.vx || 0) + (tvx - (P.vx || 0)) * k; P.vz = (P.vz || 0) + (tvz - (P.vz || 0)) * k;
  const px = P.x, pz = P.z; P.x += P.vx * dt; P.z += P.vz * dt;
  const hit = resolveCircle(P, 0.4); P.x = clamp(P.x, -WORLD, WORLD); P.z = clamp(P.z, -WORLD, WORLD); if (P.x < -560) P.x = -560;
  P.speed = Math.hypot(P.vx, P.vz); P.walked += Math.hypot(P.x - px, P.z - pz); if (P.walked > 20) tick("walk");
  if (P.speed > 0.4) { const tf = Math.atan2(P.vx, P.vz); P.face += angDiff(P.face, tf) * Math.min(1, 14 * dt); }
  // vertical
  const g2 = groundH(P.x, P.z);
  if (P.swim) { P.y = lerp(P.y, WATER_Y - 0.78 + Math.sin(performance.now() / 600) * 0.03, Math.min(1, 8 * dt)); P.vy = 0; P.ground = false; }
  else {
    if (E.jump) { E.jump = false; if (P.ground && !P.crouch) { P.vy = 5.9; P.ground = false; tick("jump"); sfxTone(260, 420, 0.1, "triangle", 0.03); } }
    P.vy -= 19 * dt; P.y += P.vy * dt;
    if (P.y <= g2) { if (!P.ground && P.vy < -6) sfxNoise(0.12, 0.05, 500); P.y = g2; P.vy = 0; P.ground = true; } else if (P.y > g2 + 0.05) P.ground = false;
  }
  // footsteps
  if (P.ground && P.speed > 0.6 && !P.swim) { P.stepT -= dt * P.speed; if (P.stepT <= 0) { P.stepT = 2.3; sfxNoise(0.05, wantSprint ? 0.035 : 0.02, 900); } }
  animatePerson(dt, P.speed, wantSprint);
  // enter prompt
  const dc = Math.hypot(car.x - P.x, car.z - P.z);
  if (dc < 3.6 && !P.swim) { setPrompt(coarse ? "Tap ENTER to drive" : "Press E to drive"); if (E.use) { E.use = false; enterCar(); } } else setPrompt("");
  E.use = false;
}
function animatePerson(dt, speed, sprint) {
  const pr = person, t = performance.now() / 1000;
  pr.root.visible = !P.inCar; pr.root.position.set(P.x, P.y, P.z); pr.root.rotation.y = P.face;
  P.phase += dt * (3 + speed * 1.55) * (speed > 0.3 ? 1 : 0.3);
  const amp = clamp(speed / 5, 0, 1) * (sprint ? 1.25 : 0.95), s = Math.sin(P.phase), c = Math.cos(P.phase);
  const cr = P.crouch ? 1 : 0, air = !P.ground && !P.swim;
  pr.body.position.y = lerp(pr.body.position.y, 0.95 - 0.34 * cr - (speed > 0.4 && !air ? Math.abs(Math.sin(P.phase)) * 0.035 * amp : 0), Math.min(1, 14 * dt));
  const lean = (sprint ? 0.28 : speed > 3 ? 0.14 : 0.03) + cr * 0.35;
  if (P.swim) {
    pr.body.rotation.x = lerp(pr.body.rotation.x, 1.35, Math.min(1, 6 * dt)); pr.body.position.y = 0.55 + 0.3;
    const sw = performance.now() / 260 * (speed > 0.3 ? 1 : 0.4);
    pr.A[0].s.rotation.x = -Math.PI + Math.sin(sw) * 1.3 - 0.4; pr.A[1].s.rotation.x = -Math.PI + Math.sin(sw + Math.PI) * 1.3 - 0.4; pr.A[0].f.rotation.x = pr.A[1].f.rotation.x = 0.2;
    pr.L[0].t.rotation.x = Math.sin(sw * 2) * 0.35; pr.L[1].t.rotation.x = -Math.sin(sw * 2) * 0.35; pr.L[0].k.rotation.x = pr.L[1].k.rotation.x = 0.1; pr.head.position.set(0, 0.8, 0.05);
    return;
  }
  pr.head.position.set(0, 0.8, 0.01);
  pr.body.rotation.x = lerp(pr.body.rotation.x, lean, Math.min(1, 10 * dt));
  if (air) { pr.L[0].t.rotation.x = -0.9; pr.L[1].t.rotation.x = 0.4; pr.L[0].k.rotation.x = 1.1; pr.L[1].k.rotation.x = 0.7; pr.A[0].s.rotation.x = -2.2; pr.A[1].s.rotation.x = -2.0; pr.A[0].f.rotation.x = pr.A[1].f.rotation.x = -0.3; return; }
  const th = (v) => v * amp, kn = (v) => Math.max(0, v) * amp * (sprint ? 1.9 : 1.5);
  pr.L[0].t.rotation.x = th(s) * 0.95 - 0.85 * cr; pr.L[1].t.rotation.x = th(-s) * 0.95 - 0.85 * cr;
  pr.L[0].k.rotation.x = kn(c) + 1.5 * cr + 0.03; pr.L[1].k.rotation.x = kn(-c) + 1.5 * cr + 0.03;
  const as = sprint ? 1.1 : 0.7; pr.A[0].s.rotation.x = th(-s) * as + (cr ? -0.35 : 0); pr.A[1].s.rotation.x = th(s) * as + (cr ? -0.35 : 0);
  pr.A[0].f.rotation.x = -0.15 - amp * (sprint ? 1.0 : 0.35); pr.A[1].f.rotation.x = -0.15 - amp * (sprint ? 1.0 : 0.35);
  pr.A[0].s.rotation.z = 0.06; pr.A[1].s.rotation.z = -0.06;
}
let promptCur = ""; function setPrompt(t) { if (t === promptCur) return; promptCur = t; H.prompt.textContent = t; H.prompt.classList.toggle("on", !!t); }

// ---------- car update ----------
function enterCar() {
  P.inCar = true; document.body.classList.add("incar"); carObj.on = true; carObj.setNight(TOD.night); tick("enter"); sfxNoise(0.08, 0.06, 1500); sfxTone(180, 120, 0.12, "square", 0.04);
  for (const id of ["#bUse"]) $(id).hidden = false; $("#bUse").textContent = "EXIT"; for (const id of ["#bGas", "#bBrake", "#bHB", "#bHorn"]) $(id).hidden = false; for (const id of ["#bJump", "#bSprint", "#bCrouch"]) $(id).hidden = true;
  setPrompt(""); if (eng) eng.g.gain.value = 0.0; CAM.idle = 3;
}
function exitCar() {
  const f = [Math.sin(car.H), Math.cos(car.H)], l = [Math.cos(car.H), -Math.sin(car.H)];
  for (const side of [1, -1, 2.4, -2.4]) { const tx = car.x + l[0] * 2.3 * side, tz = car.z + l[1] * 2.3 * side; const probe = { x: tx, z: tz }; resolveCircle(probe, 0.45); if (!HIT.hit) { P.x = tx; P.z = tz; break; } P.x = probe.x; P.z = probe.z; }
  P.y = groundH(P.x, P.z); P.vx = P.vz = 0; P.vy = 0; P.inCar = false; P.face = car.H; document.body.classList.remove("incar"); carObj.on = false; carObj.setNight(TOD.night); tick("exit");
  car.thr = car.brake = 0; if (eng) eng.g.gain.value = 0; if (amb) amb.screech.g.gain.value = 0; hornOn(false);
  $("#bUse").hidden = false; $("#bUse").textContent = "ENTER"; for (const id of ["#bGas", "#bBrake", "#bHB", "#bHorn"]) $(id).hidden = true; for (const id of ["#bJump", "#bSprint", "#bCrouch"]) $(id).hidden = false;
}
const GEARS = [0, 13, 24, 36, 50, 74];
function updateCar(dt, active) {
  // inputs
  let steerIn = 0, thr = 0, brk = 0, hb = false;
  if (active) {
    steerIn = clamp((K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0) + T.jx, -1, 1);
    thr = clamp((K.KeyW || K.ArrowUp ? 1 : 0) + (T.gas ? 1 : 0) + Math.max(0, T.jy), 0, 1); brk = clamp((K.KeyS || K.ArrowDown ? 1 : 0) + (T.brake ? 1 : 0) + Math.max(0, -T.jy), 0, 1); hb = !!(K.Space || T.hb);
    if (E.use) { E.use = false; if (Math.abs(car.vf) < 6) { exitCar(); return; } else toast("Slow down to get out"); }
  }
  const F = [Math.sin(car.H), Math.cos(car.H)], Lf = [Math.cos(car.H), -Math.sin(car.H)];
  car.vf = car.vx * F[0] + car.vz * F[1]; car.vl = car.vx * Lf[0] + car.vz * Lf[1];
  const dmg = car.health < 20 ? 0.45 : car.health < 50 ? 0.8 : 1;
  // longitudinal
  let a = 0; const spd = Math.abs(car.vf);
  if (thr > 0) { if (car.vf < -1.5 && brk === 0) a = 26 * thr; else a = (14.5 * Math.max(0.12, 1 - Math.pow(Math.max(0, car.vf) / CAR_VMAX, 1.6)) + (car.vf < 12 ? 3 : 0)) * thr * dmg; }
  if (brk > 0) { if (car.vf > 0.8) a = -27 * brk; else a = -6.5 * brk * Math.max(0.15, 1 - Math.abs(car.vf) / 14); }
  if (hb) a -= Math.sign(car.vf) * 7;
  a -= Math.sign(car.vf) * (0.5 + 0.0009 * car.vf * car.vf);
  if (thr === 0 && brk === 0 && spd < 0.4) { car.vx *= Math.max(0, 1 - 6 * dt); car.vz *= Math.max(0, 1 - 6 * dt); } else { car.vx += F[0] * a * dt; car.vz += F[1] * a * dt; }
  // steering + yaw
  car.steer += (steerIn - car.steer) * Math.min(1, (steerIn === 0 ? 9 : 5.5) * dt);
  const maxLat = hb ? 4.2 : 15.5, lim = 1 / (1 + spd * 0.055);
  let yrT = -car.steer * lim * spd / 2.7 * (spd < 1 ? spd : 1) * (car.vf < -0.5 ? -1 : 1) * 1.0;
  if (!hb) yrT = clamp(yrT, -maxLat / Math.max(6, spd) * 1.15, maxLat / Math.max(6, spd) * 1.15); else yrT *= 1.5;
  car.yr += (yrT - car.yr) * Math.min(1, (hb ? 3.2 : 8) * dt); car.H += car.yr * dt;
  // lateral grip
  const F2 = [Math.sin(car.H), Math.cos(car.H)], L2 = [Math.cos(car.H), -Math.sin(car.H)], vl = car.vx * L2[0] + car.vz * L2[1];
  let dvl = -vl * Math.min(1, 9 * dt); const cap = (hb ? 3.2 : maxLat) * dt; dvl = clamp(dvl, -cap, cap);
  car.vx += L2[0] * dvl; car.vz += L2[1] * dvl;
  car.slip = Math.abs(vl);
  // move + collide
  const ox = car.x, oz = car.z, sub = Math.max(1, Math.ceil(Math.hypot(car.vx, car.vz) * dt / 0.8));
  for (let s = 0; s < sub; s++) {
    car.x += car.vx * dt / sub; car.z += car.vz * dt / sub;
    for (const off of CAR_OFF) {
      const c = { x: car.x + F2[0] * off, z: car.z + F2[1] * off }, h = resolveCircle(c, CAR_R);
      if (h.hit) { car.x += c.x - (car.x + F2[0] * off); car.z += c.z - (car.z + F2[1] * off); const vn = car.vx * h.nx + car.vz * h.nz; if (vn < 0) { carHit(-vn, h.nx, h.nz, off, c); car.vx -= 1.25 * vn * h.nx; car.vz -= 1.25 * vn * h.nz; car.vx *= 0.93; car.vz *= 0.93; } }
    }
    if (car.x < BEACH_X + 1.5) { car.x = BEACH_X + 1.5; if (car.vx < 0) car.vx *= -0.15; }
    if (Math.abs(car.x) > WORLD) { car.x = clamp(car.x, -WORLD, WORLD); car.vx *= -0.2; } if (Math.abs(car.z) > WORLD) { car.z = clamp(car.z, -WORLD, WORLD); car.vz *= -0.2; }
  }
  car.vf = car.vx * F2[0] + car.vz * F2[1];
  // visuals: ground height, wheels, body spring
  const gy = Math.max(groundH(car.x, car.z), groundH(car.x + F2[0] * 1.5, car.z + F2[1] * 1.5) * 0.5 + groundH(car.x - F2[0] * 1.5, car.z - F2[1] * 1.5) * 0.5);
  car.y = lerp(car.y, gy, Math.min(1, 18 * dt));
  car.latA = lerp(car.latA, car.yr * car.vf, Math.min(1, 6 * dt)); car.lonA = lerp(car.lonA, (car.vf - car.prevVf) / Math.max(dt, 1e-3), Math.min(1, 6 * dt)); car.prevVf = car.vf;
  const rt = clamp(car.latA * 0.0042, -0.07, 0.07), pt = clamp(-car.lonA * 0.0035, -0.05, 0.05);
  car.rollV += (90 * (rt - car.roll) - 11 * car.rollV) * dt; car.roll += car.rollV * dt; car.pitchV += (90 * (pt - car.pitch) - 11 * car.pitchV) * dt; car.pitch += car.pitchV * dt;
  car.spin += car.vf / 0.35 * dt;
  carObj.grp.position.set(car.x, car.y, car.z); carObj.grp.rotation.y = car.H; carObj.body.rotation.set(car.pitch, 0, car.roll); carObj.body.position.y = 0;
  for (const w of carObj.wheels) { w.spin.rotation.x = car.spin; if (w.front) w.pivot.rotation.y = -car.steer * 0.42; }
  carObj.tailMat.emissiveIntensity = (brk > 0 || hb ? 2.2 : 0.5) + TOD.night * 0.8;
  // gears + rpm
  const v = Math.max(0, car.vf); let gi = 1; while (gi < 5 && v > GEARS[gi]) gi++; car.gear = gi; const lo = GEARS[gi - 1], hi = GEARS[gi]; const target = clamp(0.18 + 0.82 * ((v - lo * 0.55) / (hi - lo * 0.55)), 0.15, 1); car.rpm += ((thr > 0 ? target : target * 0.7) - car.rpm) * Math.min(1, 7 * dt);
  // effects
  if (active) {
    const sa = car.slip > 4 || (hb && spd > 6) ? 1 : 0;
    if (sa && Math.random() < 0.7) for (const s of [-1, 1]) smoke.spawn(car.x - F2[0] * 1.4 + L2[0] * 0.9 * s, car.y + 0.3, car.z - F2[1] * 1.4 + L2[1] * 0.9 * s, rr(-0.4, 0.4), rr(0.4, 1.2), rr(-0.4, 0.4), rr(0.8, 1.5), 0.85, 0.85, 0.85, 0.45);
    if (hb && car.slip > 5) driftT += dt; else driftT = Math.max(0, driftT - dt); if (driftT > 1) tick("drift");
    if (v * 2.23694 > 60) tick("mph60"); if (v * 2.23694 > 120) tick("mph120");
  }
  if (car.health < 50 && Math.random() < dt * (car.health < 25 ? 22 : 9)) smoke.spawn(car.x + F2[0] * 1.9, car.y + 1.0, car.z + F2[1] * 1.9, rr(-0.3, 0.3), rr(1, 2), rr(-0.3, 0.3), rr(1.5, 2.5), 0.2, 0.2, 0.2, 0.5);
  carObj.paint.color.setHex(0xc8161d).lerp(new THREE.Color(0x2a1a1a), clamp((100 - car.health) / 140, 0, 0.7));
  // audio
  if (eng && active) { const f = 38 + car.rpm * 135; eng.o1.frequency.value = f; eng.o2.frequency.value = f * 0.5; eng.fl.frequency.value = 380 + car.rpm * 900 + thr * 700; eng.g.gain.value = 0.05 + thr * 0.06 + car.rpm * 0.03; amb.screech.g.gain.value = clamp((car.slip - 3.5) * 0.012, 0, 0.07) * (spd > 3 ? 1 : 0); }
}
let driftT = 0, lastCrash = 0;
function carHit(impact, nx, nz, off, c) {
  if (impact < 1.2) return; const now = performance.now();
  if (now - lastCrash > 250) { lastCrash = now; sfxNoise(0.28, clamp(impact * 0.022, 0.05, 0.3), 700 + impact * 40); sfxTone(110, 55, 0.2, "sine", clamp(impact * 0.01, 0.03, 0.18)); }
  if (impact > 3) { car.health = Math.max(0, car.health - (impact - 3) * 1.7); CAM.shake = Math.min(0.5, CAM.shake + impact * 0.012); for (let i = 0; i < 12; i++) sparks.spawn(c.x - nx, car.y + 0.5, c.z - nz, nx * rr(1, 4) + rr(-2, 2), rr(1, 4), nz * rr(1, 4) + rr(-2, 2), rr(0.3, 0.7), 1, 0.7, 0.25); }
  if (impact > 5) tick("crash"); car.yr += (nx * Math.cos(car.H) - nz * Math.sin(car.H)) * impact * 0.02;
}

// ---------- camera ----------
function updateCamera(dt) {
  const look = { x: lookX, y: lookY }; lookX = lookY = 0;
  const sens = 0.0024 * save.sens; if (look.x || look.y) { CAM.yaw -= look.x * sens; CAM.pitch = clamp(CAM.pitch + look.y * sens, -0.3, 1.25); CAM.idle = 0; lookAcc += Math.abs(look.x * sens) + Math.abs(look.y * sens); if (lookAcc > 1.2) tick("look"); } else CAM.idle += dt;
  let tx, ty, tz, dist, pitchWant = null;
  if (P.inCar) {
    const v = Math.abs(car.vf), spd = clamp(v / 60, 0, 1); tx = car.x; ty = car.y + 1.5; tz = car.z; dist = 6.4 + spd * 2.2;
    if (CAM.idle > 1.2 && v > 1) { CAM.yaw += angDiff(CAM.yaw, car.H + (car.vf < -1 ? Math.PI : 0)) * Math.min(1, (1.4 + spd * 2.2) * dt); pitchWant = 0.17; }
    else if (CAM.idle > 3) { CAM.yaw += angDiff(CAM.yaw, car.H) * Math.min(1, 0.8 * dt); }
    if (pitchWant !== null) CAM.pitch += (pitchWant - CAM.pitch) * Math.min(1, 1.5 * dt);
    CAM.fov = lerp(CAM.fov, 62 + spd * 20, Math.min(1, 3 * dt));
  } else { tx = P.x; ty = P.y + (P.swim ? 0.9 : P.crouch ? 1.2 : 1.55); tz = P.z; dist = 3.9; CAM.fov = lerp(CAM.fov, 62 + (P.speed > 6.5 ? 5 : 0), Math.min(1, 4 * dt)); }
  const k = 1 - Math.exp(-(P.inCar ? 9 : 16) * dt); CAM.t.x += (tx - CAM.t.x) * k; CAM.t.y += (ty - CAM.t.y) * k; CAM.t.z += (tz - CAM.t.z) * k;
  const cp = Math.cos(CAM.pitch), dx = -Math.sin(CAM.yaw) * cp, dy = Math.sin(CAM.pitch), dz = -Math.cos(CAM.yaw) * cp;
  let d = dist; for (let s = 0.7; s <= dist; s += 0.35) { const x = CAM.t.x + dx * s, y = CAM.t.y + dy * s, z = CAM.t.z + dz * s; if (y < Math.max(groundH(x, z), WATER_Y > groundH(x, z) ? -9 : 0) + 0.3 || pointInCol(x, y, z, 0.35)) { d = Math.max(0.8, s - 0.55); break; } }
  CAM.d += (d - CAM.d) * (d < CAM.d ? 1 : Math.min(1, 2.5 * dt)); if (d < CAM.d) CAM.d = d;
  camera.position.set(CAM.t.x + dx * CAM.d, CAM.t.y + dy * CAM.d, CAM.t.z + dz * CAM.d);
  if (CAM.shake > 0.001) { camera.position.x += rr(-1, 1) * CAM.shake * 0.3; camera.position.y += rr(-1, 1) * CAM.shake * 0.3; CAM.shake *= Math.exp(-6 * dt); }
  if (camera.position.y < groundH(camera.position.x, camera.position.z) + 0.2) camera.position.y = groundH(camera.position.x, camera.position.z) + 0.2;
  camera.lookAt(CAM.t.x, CAM.t.y + 0.15, CAM.t.z); if (Math.abs(camera.fov - CAM.fov) > 0.05) { camera.fov = CAM.fov; camera.updateProjectionMatrix(); }
}

// ---------- environment updates each frame ----------
function updateWorld(dt, t) {
  if (!hourFrozen) setTime(hour + dt / 60);          // 1 game hour per real minute (a full day = 24 min)
  sky.position.copy(camera.position); sunSpr.position.copy(camera.position).addScaledVector(TOD.dir, 1250); sunSpr.quaternion.copy(camera.quaternion);
  moonSpr.position.copy(camera.position).addScaledVector(TOD.dir, -1250); moonSpr.quaternion.copy(camera.quaternion); stars.position.copy(camera.position);
  const fx = P.inCar ? car.x : P.x, fz = P.inCar ? car.z : P.z;
  sun.target.position.set(fx, 0, fz); sun.position.set(fx + TOD.dir.x * 220, TOD.dir.y * 220 + 10, fz + TOD.dir.z * 220);
  moon.target.position.set(fx, 0, fz); moon.position.set(fx - TOD.dir.x * 200, Math.max(40, -TOD.dir.y * 200), fz - TOD.dir.z * 200);
  const wantShadow = shadowsOn && TOD.elev > 0.04; if (sun.castShadow !== wantShadow) sun.castShadow = wantShadow;
  animWater(t); foam.material.opacity = 0.3 + Math.sin(t * 1.2) * 0.12; foam.position.x = BEACH_X - 4.2 + Math.sin(t * 0.8) * 0.9;
  // ambience follows where you are
  if (amb) { const dBeach = Math.max(0, fx - BEACH_X), inCity = Math.abs(fx) < 340 && Math.abs(fz) < 340, v = P.inCar ? Math.abs(car.vf) : 0;
    amb.surf.g.gain.value = clamp(1 - dBeach / 260, 0, 1) * (0.1 + 0.03 * Math.sin(t * 0.7)); amb.wind.g.gain.value = 0.012 + clamp(v / 70, 0, 1) * 0.1 + (inCity ? 0 : 0.015); amb.wind.fl.frequency.value = 300 + v * 8; amb.city.g.gain.value = inCity ? 0.035 : 0.004; }
}

// ---------- menu ----------
const menu = $("#menu"), mbody = $("#mbody");
function renderMenu(mode) {
  const chips = (list, cur, key) => `<div class="chips">${list.map(([v, l]) => `<button data-${key}="${v}" class="${String(cur) === String(v) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const done = TESTS.filter((t) => save.tests[t[0]]).length;
  let h = "";
  const rest = (mode !== "title");
  if (mode === "title") h += `<p class="help">An open-world sandbox in the making. Stage 1 is the foundation: explore a coastal city on foot and drive one sports car. Traffic, police, businesses and prison get built on top, stage by stage.</p><button class="btn big" data-a="start">${started ? "Resume" : "Start"}</button><h3>Graphics</h3>${chips(Object.entries(QUAL).map(([k, v]) => [k, v.label]), save.q, "q")}<p class="help">${coarse ? "Left thumb moves, right thumb looks. Landscape feels best. " : "WASD move · Shift sprint · Space jump / handbrake · C crouch · E enter/exit · H horn. "}Open the ☰ menu in-game for the test checklist, time of day and teleports.</p>`;
  else h += `<button class="btn big" data-a="resume">Resume</button>`;
  if (rest) {
    h += `<h3>Stage 1 test checklist (${done}/${TESTS.length})</h3><ul id="tests">${TESTS.map((t) => `<li class="${save.tests[t[0]] ? "ok" : ""}"><span>${save.tests[t[0]] ? "✅" : "⬜"}</span><span><b>${t[1]}</b><br><small style="opacity:.7">${t[2]}</small></span></li>`).join("")}</ul>`;
    h += `<h3>Time of day</h3>${chips([["8", "🌅 Morning"], ["12.5", "☀️ Noon"], ["18.2", "🌇 Sunset"], ["23", "🌙 Night"]], "", "tod")}<div class="chips" style="margin-top:6px"><button data-a="freeze" class="${hourFrozen ? "on" : ""}">${hourFrozen ? "⏸ Time frozen" : "⏵ Time flowing"}</button></div>`;
    h += `<h3>Teleport</h3>${chips([["down", "Downtown"], ["beach", "Beach"], ["sub", "Suburbs"], ["hwy", "Highway"], ["hill", "Desert"]], "", "tp")}`;
    h += `<h3>Graphics</h3>${chips(Object.entries(QUAL).map(([k, v]) => [k, v.label]), save.q, "q")}<p class="help">Phone running hot or choppy? Choose Low.</p>`;
    h += `<h3>Look sensitivity</h3><div class="row"><input type="range" min="0.4" max="2.5" step="0.05" value="${save.sens}" data-a="sens"><span id="sensv">${save.sens.toFixed(2)}</span></div>`;
    h += `<h3>Sound</h3>${chips([["1", "On"], ["0", "Off"]], save.snd ? "1" : "0", "snd")}`;
    h += `<div class="chips" style="margin-top:14px">${document.fullscreenEnabled || document.webkitFullscreenEnabled ? `<button data-a="fs">⛶ Full screen</button>` : ""}<button data-a="reset">Reset test progress</button></div>`;
  }
  mbody.innerHTML = h; menu.hidden = false;
}
const TPS = { down: [5.5, 17, 0], beach: [-345, 20, Math.PI * 1.5], sub: [236, 246, Math.PI], hwy: [352, 4, Math.PI / 2], hill: [560, 220, Math.PI] };
function teleport(k) {
  const [x, z, h] = TPS[k] || TPS.down; tick("tp");
  if (P.inCar) { car.x = x + 4; car.z = z; car.H = h === 0 ? Math.PI : h; car.vx = car.vz = 0; car.yr = 0; if (k === "hwy") { car.x = 360; car.z = 3.5; car.H = Math.PI / 2; } } else { P.x = x; P.z = z; P.y = groundH(x, z); P.vx = P.vz = 0; CAM.yaw = h; car.x = x + Math.sin(h) * 7 - Math.cos(h) * 4; car.z = z + Math.cos(h) * 7 + Math.sin(h) * 4; car.H = h; car.vx = car.vz = 0; car.yr = 0; }
  if (k === "hwy" && !P.inCar) { P.x = 340; P.z = 0; car.x = 350; car.z = 3.5; car.H = Math.PI / 2; CAM.yaw = Math.PI / 2; }
  CAM.t.set(P.inCar ? car.x : P.x, 2, P.inCar ? car.z : P.z);
}
menu.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return; audioInit();
  if (b.dataset.tod) { setTime(+b.dataset.tod, true); if (+b.dataset.tod > 21 || +b.dataset.tod < 5) tick("night"); renderMenu(started ? "pause" : "title"); return; }
  if (b.dataset.tp) { teleport(b.dataset.tp); resumeGame(); return; }
  if (b.dataset.q) { save.q = b.dataset.q; persist(); applyQuality(); renderMenu(started ? "pause" : "title"); return; }
  if (b.dataset.snd !== undefined) { setSound(b.dataset.snd === "1"); renderMenu(started ? "pause" : "title"); return; }
  const a = b.dataset.a;
  if (a === "start" || a === "resume") resumeGame(); else if (a === "freeze") { hourFrozen = !hourFrozen; renderMenu(started ? "pause" : "title"); }
  else if (a === "fs") { const el = document.documentElement; (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
  else if (a === "reset") { save.tests = {}; persist(); renderMenu(started ? "pause" : "title"); }
});
menu.addEventListener("input", (e) => { if (e.target.dataset.a === "sens") { save.sens = +e.target.value; $("#sensv").textContent = save.sens.toFixed(2); persist(); } });
function resumeGame() { audioInit(); started = true; paused = false; menu.hidden = true; $("#hud").hidden = false; lockPointer(); lastT = performance.now(); persist(); }
function pauseGame() { if (paused) return; paused = true; if (document.pointerLockElement) document.exitPointerLock(); hornOn(false); for (const k in K) K[k] = false; T.jx = T.jy = 0; T.gas = T.brake = T.hb = T.sprint = false; renderMenu("pause"); if (eng) eng.g.gain.value = 0; if (amb) amb.screech.g.gain.value = 0; }
document.addEventListener("visibilitychange", () => { if (document.hidden && started) pauseGame(); });

// ---------- main loop ----------
let lastT = performance.now(), mmT = 0;
function simStep(dt, now) {
  if (!paused) {
    if (P.inCar) { updateCar(dt, true); P.x = car.x; P.z = car.z; P.y = car.y; } else { updatePlayer(dt); updateCar(dt, false); }
    if (P.inCar && E.use) E.use = false;
    smoke.update(dt); sparks.update(dt); updateCamera(dt); updateWorld(dt, now / 1000); hudUpdate(dt); if ((mmT += dt) > 0.05) { mmT = 0; drawMinimap(); }
  } else { updateCamera(0.0001); updateWorld(0, now / 1000); if (!started) { CAM.yaw += 0.0015; } }
}
let manual = /[?&]manual/.test(location.search);
function frame(now) {
  requestAnimationFrame(frame); frameNo++; if (manual) { lastT = now; return; }
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  simStep(dt, now); renderer.render(scene, camera);
}

// ---------- boot ----------
person.root.position.set(P.x, P.y, P.z); carObj.grp.position.set(car.x, car.y, car.z); carObj.grp.rotation.y = car.H; carObj.on = false;
CAM.yaw = 0; CAM.pitch = 0.22; CAM.t.set(P.x, P.y + 1.5, P.z);
applyQuality(); setTime(hour, true); resize();
renderMenu("title");
window.__city = { sim(sec, now0 = 1000) { manual = true; let t = now0; for (let i = 0; i < Math.round(sec * 60); i++) { t += 1000 / 60; simStep(1 / 60, t); } }, shot() { manual = true; renderer.render(scene, camera); return renderer.domElement.toDataURL('image/jpeg', 0.85); }, P, car, CAM, scene, camera, renderer, save, TOD, K, T, E, teleport, setTime, tick, resumeGame, pauseGame, enterCar, exitCar, groundH, queryCols, resolveCircle, get hour() { return hour; }, stats: () => ({ cols: grid.size, palms: palms.length, lamps: lamps.length, blocks: blocks.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }) };
requestAnimationFrame(frame);
