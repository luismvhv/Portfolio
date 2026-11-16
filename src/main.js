/* Arranque, cámara, interacción, navegación entre espacios y menú.
   No contiene contenido: todo sale de data/projects.js. */
import { SITE, PROJECTS, CONTACT_SPACE } from '../data/projects.js';
import { MAT, PIECE_DEFAULTS, ZOOM_MAX, SPACE_RADIUS } from './config.js';
import { buildMat } from './mat.js';
import { createSpace, layoutSpace, arrive } from './spaces.js';
import { fetchSTL, buildPiece, makeObject, lineMaterial } from './geometry.js';
import * as phys from './physics.js';

const THREE = window.THREE;
const $ = id => document.getElementById(id);
const view = $('view'), board = $('board'), intro = $('intro'), tip = $('tip');
const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth <= 700;
function fail(msg) { const d = $('err'); d.hidden = false; d.textContent = msg; }

/* =====================================================================
   Menú y textos del sitio
   ===================================================================== */
document.body.classList.add('intro');
if (isMobile()) document.body.classList.add('menu-closed');
$('siteName').textContent = $('introName').textContent = SITE.name;
$('siteTag').textContent = SITE.tagline;
$('siteBio').textContent = SITE.bio;
$('siteFoot').textContent = SITE.footer;
$('list').innerHTML = PROJECTS.map((p, i) =>
  '<li><button data-go="' + p.id + '"><b>' + String(i + 1).padStart(2, '0') + '</b><span>' + p.title + '</span><small>' + (p.subtitle || '') + '</small></button></li>').join('');
let typed = false;
window.typewriter($('typed'), SITE.tagline, { delay: reduced ? 100 : 2100, speed: reduced ? 20 : 95 }, () => { typed = true; maybeDrop(); });

function setMenu(open) {
  document.body.classList.toggle('menu-closed', !open);
  try { localStorage.setItem('menu', open ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
}
try { if (!isMobile() && localStorage.getItem('menu') === '0') document.body.classList.add('menu-closed'); } catch (e) { /* idem */ }
$('fold').addEventListener('click', () => setMenu(false));
$('unfold').addEventListener('click', () => setMenu(true));

/* =====================================================================
   Espacios: la mat principal y una mat por proyecto (más contacto)
   ===================================================================== */
const spaces = {};
const home = { id: 'home', x: 0, z: 0, w: MAT.w, h: MAT.h, el: document.createElement('section') };
home.el.className = 'space on';
home.el.style.cssText = 'left:' + (-MAT.w / 2) + 'px;top:' + (-MAT.h / 2) + 'px;width:' + MAT.w + 'px;height:' + MAT.h + 'px';
home.el.appendChild(buildMat(MAT.w, MAT.h, 7, 'SELF-HEALING CUTTING MAT · ' + MAT.w / 10 + ' × ' + MAT.h / 10 + ' cm'));
board.appendChild(home.el);
spaces.home = home;
let cur = home;

const spaceDefs = [...PROJECTS, CONTACT_SPACE];
const pending = spaceDefs.map((def, i) => {
  const sp = createSpace(def, 100 + i * 37);
  sp.el.classList.add('on');
  sp.el.style.visibility = 'hidden';
  board.appendChild(sp.el);
  return sp;
});
async function layoutSpaces() {
  if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 3000))]);
  const R = Math.max(SPACE_RADIUS, pending.length * 500);
  pending.forEach((sp, i) => {
    const a = -Math.PI / 2 + i / pending.length * Math.PI * 2;
    layoutSpace(sp, { x: Math.round(Math.cos(a) * R), z: Math.round(Math.sin(a) * R) });
    sp.el.classList.remove('on');
    sp.el.style.visibility = '';
    spaces[sp.id] = sp;
    phys.addWalls(sp.x, sp.z, sp.w, sp.h);
  });
}

/* =====================================================================
   Escena: cámara cenital sobre el tablero HTML
   ===================================================================== */
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const FOV = 20, TAN = Math.tan(FOV * Math.PI / 360);
const camera = new THREE.PerspectiveCamera(FOV, 1, 10, 20000);
camera.up.set(0, 0, -1);

const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0006;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const shadowGeo = new THREE.PlaneGeometry(1, 1);
shadowGeo.rotateX(-Math.PI / 2);
const shadowPlane = new THREE.Mesh(shadowGeo, new THREE.ShadowMaterial({ opacity: 0.4 }));
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

const cam = { x: 0, z: 0, s: 1 };            // centro de la vista (mm) y escala (px por mm)
let vw = 0, vh = 0, travel = null, inertia = null;
const sHome = () => Math.max(.5, Math.min(1.25, view.clientWidth / 1150, view.clientHeight / 760));
cam.s = sHome();

function sMin() {
  if (cur === home) return Math.max(vw / cur.w, vh / cur.h);          // nunca se ve fuera de la mat principal
  return Math.min(1, vw / (cur.w + 160), vh / (cur.h + 160));
}
function clampCam() {
  const pad = cur === home ? 0 : 80, hw = vw / (2 * cam.s), hh = vh / (2 * cam.s);
  const mx = Math.max(0, cur.w / 2 + pad - hw), mz = Math.max(0, cur.h / 2 + pad - hh);
  cam.x = Math.max(cur.x - mx, Math.min(cur.x + mx, cam.x));
  cam.z = Math.max(cur.z - mz, Math.min(cur.z + mz, cam.z));
}
function applyCamera() {
  const w = view.clientWidth, h = view.clientHeight;
  if (w !== vw || h !== vh) {
    vw = w; vh = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    lineMaterial.resolution.set(w, h);
  }
  if (!travel) { cam.s = Math.max(sMin(), Math.min(ZOOM_MAX, cam.s)); clampCam(); }
  const dist = vh / (2 * cam.s * TAN);
  camera.position.set(cam.x, dist, cam.z);
  camera.near = dist * 0.05; camera.far = dist + 800;
  camera.lookAt(cam.x, 0, cam.z);
  camera.updateProjectionMatrix();
  const tx = vw / 2 - cam.x * cam.s, ty = vh / 2 - cam.z * cam.s;
  board.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + cam.s + ')';
  view.style.backgroundSize = 90 * cam.s + 'px ' + 90 * cam.s + 'px';
  view.style.backgroundPosition = tx + 'px ' + ty + 'px';
  lineMaterial.linewidth = Math.max(1.2, Math.min(2.6, 0.8 + cam.s * 0.8));
  // la luz y el plano de sombras siguen a la cámara
  const half = Math.max(vw, vh) / (2 * cam.s) + 300, sc = sun.shadow.camera;
  sun.position.set(cam.x - 700, 2000, cam.z - 900);
  sun.target.position.set(cam.x, 0, cam.z);
  sc.left = -half; sc.right = half; sc.top = half; sc.bottom = -half; sc.near = 100; sc.far = 4500;
  sc.updateProjectionMatrix();
  shadowPlane.position.set(cam.x, -1.5, cam.z);
  shadowPlane.scale.set(half * 2.4, 1, half * 2.4);
}
const screenToWorld = (px, py) => ({ x: cam.x + (px - vw / 2) / cam.s, z: cam.z + (py - vh / 2) / cam.s });
const worldToScreen = (x, z) => ({ x: vw / 2 + (x - cam.x) * cam.s, y: vh / 2 + (z - cam.z) * cam.s });

/* =====================================================================
   Piezas: una por proyecto en la mat principal + las extras de cada espacio
   ===================================================================== */
const pieces = [], byHandle = new Map();
const pieceDefs = [];
PROJECTS.forEach(p => {
  if (p.piece) pieceDefs.push({ project: p, main: true, opt: { ...PIECE_DEFAULTS, ...p.piece }, spaceId: 'home' });
  (p.extras || []).forEach((e, i) => pieceDefs.push({ project: p, main: false, slot: i, opt: { ...PIECE_DEFAULTS, ...e }, spaceId: p.id }));
});
const progress = pieceDefs.map(() => ({ got: 0, total: 0, done: false }));
let loadedAll = false;
function showProgress() {
  let got = 0, total = 0;
  progress.forEach(s => { got += s.done ? (s.total || 1e6) : s.got; total += s.total || 1e6; });
  $('load').textContent = String(loadedAll ? 100 : Math.min(99, Math.floor(got / total * 100))).padStart(3, '0') + '%';
}
async function loadPiece(d, i) {
  try {
    const tris = await fetchSTL(d.opt.file, (got, total) => { progress[i].got = got; progress[i].total = total; showProgress(); });
    const built = buildPiece(tris, d.opt);
    const obj = makeObject(built);
    obj.visible = false;
    scene.add(obj);
    const body = phys.addBody(built, d.opt.collider);
    const p = { ...d, built, obj, phys: body, size: built.size, radius: Math.hypot(built.size.x, built.size.z) / 2, mode: 'wait', home: null };
    byHandle.set(body.collider.handle, p);
    pieces.push(p);
  } catch (err) { fail('No se pudo cargar ' + d.opt.file + ': ' + err.message); }
  progress[i].done = true;
  showProgress();
}

/* Sitio libre para cada pieza: espiral desde el centro hasta no solaparse con las ya colocadas */
function assignHomes() {
  const placed = [];
  pieces.filter(p => p.main).forEach(p => {
    let pos = p.opt.at ? { x: p.opt.at[0], z: p.opt.at[1] } : null;
    for (let k = 0; !pos && k < 4000; k++) {
      const rad = 22 * Math.sqrt(k), a = k * 2.39996, x = Math.cos(a) * rad * 1.5, z = Math.sin(a) * rad;
      if (Math.abs(x) > MAT.w / 2 - 150 || Math.abs(z) > MAT.h / 2 - 150) continue;
      if (placed.every(q => Math.hypot(q.x - x, q.z - z) > q.r + p.radius + 45)) pos = { x, z };
    }
    p.home = pos || { x: 0, z: 0 };
    placed.push({ x: p.home.x, z: p.home.z, r: p.radius });
  });
  pieces.filter(p => !p.main).forEach(p => { p.home = spaces[p.project.id].extraSlots[p.slot]; });
}
const randQ = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
function drop(p, i, at) {
  const dist = vh / (2 * cam.s * TAN), t = at || p.home;
  p.obj.visible = true;
  p.mode = 'free';
  phys.place(p.phys, t.x, Math.min(dist * 0.5, 900) + i * 110, t.z, randQ());
  phys.impulse(p.phys, { x: 0, y: -700, z: 0 }, { x: (Math.random() - .5) * 6, y: (Math.random() - .5) * 6, z: (Math.random() - .5) * 6 });
}
function settle(p, at) {            // deja la pieza tumbada en un punto, sin caída
  p.obj.visible = true;
  p.mode = 'free';
  phys.place(p.phys, at.x, p.size.y / 2 + 2, at.z, { x: 0, y: 0, z: 0, w: 1 });
}

/* =====================================================================
   Preloader → caída de piezas → se desvanece el título
   ===================================================================== */
let dropped = false, introGone = false, dropT = 0;
function maybeDrop() {
  if (dropped || !typed || !loadedAll) return;
  dropped = true;
  setTimeout(() => {
    dropT = performance.now();
    pieces.filter(p => p.main).forEach((p, i) => drop(p, i));
    pieces.filter(p => !p.main).forEach(p => settle(p, p.home));
  }, 450);
}
function dissolveIntro() {
  if (introGone) return;
  introGone = true;
  intro.classList.add('gone');
  setTimeout(() => {
    document.body.classList.remove('intro');
    intro.style.display = 'none';
    const id = routeId();
    if (id !== 'home') go(id, true);
  }, 650);
}
function checkIntroHit(now) {
  if (!dropT || introGone) return;
  if (now - dropT > 2600) return dissolveIntro();
  const r = intro.querySelector('.name').getBoundingClientRect(), v = view.getBoundingClientRect();
  for (const p of pieces) {
    if (!p.main || p.obj.position.y > 260) continue;      // se desvanece cuando una pieza lo atraviesa al aterrizar
    const s = worldToScreen(p.obj.position.x, p.obj.position.z);
    if (s.x + v.left > r.left - 80 && s.x + v.left < r.right + 80 && s.y + v.top > r.top - 40 && s.y + v.top < r.bottom + 120) return dissolveIntro();
  }
}

/* =====================================================================
   Navegación: la pieza sale disparada y la cámara la persigue hasta su espacio.
   Los espacios están lejos de la mat principal y solo se llega a ellos así.
   ===================================================================== */
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const routeId = () => { const id = location.hash.replace(/^#\/?/, ''); return spaces[id] ? id : 'home'; };
function focusOf(sp) {
  if (sp === home) return { x: 0, z: 0, s: sHome() };
  const fit = Math.min(vw / (sp.w + 100), vh / (sp.h + 100));
  if (fit >= .72) return { x: sp.x, z: sp.z, s: Math.min(1.3, fit) };
  const s = .72;                                                    // pantallas pequeñas: empieza por el título y la pieza
  return { x: sp.x - sp.w / 2 - 40 + vw / (2 * s), z: sp.z - sp.h / 2 - 40 + vh / (2 * s), s };
}
function go(id, fromRoute) {
  const to = spaces[id];
  if (!to || travel || !introGone || to === cur) return;
  if (grabbed) releaseGrab();
  if (isMobile()) setMenu(false);
  to.el.classList.add('on');
  const flights = [];
  pieces.filter(p => p.main && p.mode !== 'wait').forEach(p => {
    const dest = p.project.id === id ? id : 'home';
    if (p.spaceId === dest) return;
    const t = p.obj.position, target = dest === 'home' ? p.home : to.dock;
    phys.setFlying(p.phys, true);
    p.mode = 'fly';
    flights.push({ p, dest, from: t.clone(), fromQ: p.obj.quaternion.clone(), to: new THREE.Vector3(target.x, p.size.y / 2 + 2, target.z), turns: (Math.random() < .5 ? -1 : 1) * 2 });
  });
  travel = { from: cur, to, c0: { ...cam }, c1: focusOf(to), flights, t0: performance.now(), dur: reduced ? 500 : 1900 };
  inertia = null;
  $('home').classList.remove('show');
  if (!fromRoute) history.pushState(null, '', id === 'home' ? '#/' : '#/' + id);
}
const qA = new THREE.Quaternion(), qB = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), ID = new THREE.Quaternion();
function updateTravel(now) {
  const tr = travel, t = Math.min(1, (now - tr.t0) / tr.dur);
  const eP = ease(Math.min(1, t * 1.14)), eC = ease(Math.max(0, (t - .07) / .93));     // la pieza sale primero; la cámara la persigue
  cam.x = tr.c0.x + (tr.c1.x - tr.c0.x) * eC;
  cam.z = tr.c0.z + (tr.c1.z - tr.c0.z) * eC;
  cam.s = (tr.c0.s + (tr.c1.s - tr.c0.s) * eC) * (1 - .3 * Math.sin(Math.PI * eC));   // se aleja un poco a mitad de camino
  tr.flights.forEach(f => {
    const pos = { x: f.from.x + (f.to.x - f.from.x) * eP, y: f.from.y + (f.to.y - f.from.y) * eP + Math.sin(Math.PI * eP) * 140, z: f.from.z + (f.to.z - f.from.z) * eP };
    qA.copy(f.fromQ).slerp(ID, eP);
    qB.setFromAxisAngle(UP, (1 - eP) * f.turns * Math.PI * 2);
    qA.premultiply(qB);
    phys.moveFlying(f.p.phys, pos, { x: qA.x, y: qA.y, z: qA.z, w: qA.w });
  });
  if (t < 1) return;
  tr.flights.forEach(f => { phys.setFlying(f.p.phys, false); f.p.mode = 'free'; f.p.spaceId = f.dest; });
  tr.from.el.classList.remove('on');
  cur = tr.to;
  travel = null;
  if (cur !== home) arrive(cur);
  $('home').classList.toggle('show', cur !== home);
}
window.addEventListener('popstate', () => go(routeId(), true));
window.addEventListener('hashchange', () => go(routeId(), true));

/* =====================================================================
   Interacción: arrastrar la mat, agarrar piezas por un punto, zoom
   ===================================================================== */
let drag = null, grabbed = null, lupa = false, lastTap = { p: null, t: 0 }, pinch = null, hover = null;
const pointers = {};
const localXY = e => { const r = view.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
function pick(l) {
  const g = screenToWorld(l.x, l.y), o = camera.position;
  const d = { x: g.x - o.x, y: -o.y, z: g.z - o.z }, n = Math.hypot(d.x, d.y, d.z);
  const hit = phys.castRay({ x: o.x, y: o.y, z: o.z }, { x: d.x / n, y: d.y / n, z: d.z / n });
  const p = hit && byHandle.get(hit.handle);
  return p && p.mode === 'free' ? { p, point: hit.point } : null;
}
function cursorAt(l, y) {           // punto bajo el cursor a la altura y
  const g = screenToWorld(l.x, l.y), o = camera.position, k = 1 - y / o.y;
  return { x: o.x + (g.x - o.x) * k, z: o.z + (g.z - o.z) * k };
}
function releaseGrab() { phys.endGrab(); grabbed = null; }
const isUI = t => t.closest && t.closest('a,button');

view.addEventListener('pointerdown', e => {
  if (!introGone && dropT) dissolveIntro();
  if (isUI(e.target) || travel) return;
  pointers[e.pointerId] = localXY(e);
  const ids = Object.keys(pointers);
  if (ids.length === 2) {                                  // pellizco: zoom
    if (grabbed) releaseGrab();
    const a = pointers[ids[0]], b = pointers[ids[1]];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: cam.s };
    drag = null;
    return;
  }
  inertia = null;
  view.setPointerCapture(e.pointerId);
  const l = localXY(e), hit = pick(l);
  if (hit) {
    grabbed = hit.p;
    phys.startGrab(hit.p.phys, hit.point);
    drag = { type: 'piece', p: hit.p, y: hit.point.y, sx: l.x, sy: l.y, lx: l.x, ly: l.y, moved: false };
    tip.style.display = 'none';
    view.classList.add('panning');
  } else {
    drag = { type: 'pan', sx: l.x, sy: l.y, cx: cam.x, cz: cam.z, moved: false, hist: [] };
    view.classList.add('panning');
  }
});
view.addEventListener('pointermove', e => {
  if (pointers[e.pointerId]) pointers[e.pointerId] = localXY(e);
  if (pinch) {
    const ids = Object.keys(pointers);
    if (ids.length === 2) { const a = pointers[ids[0]], b = pointers[ids[1]]; cam.s = pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d; }
    return;
  }
  const l = localXY(e);
  if (drag) {
    if (!drag.moved && Math.hypot(l.x - drag.sx, l.y - drag.sy) > 6) drag.moved = true;
    if (drag.type === 'pan') {
      cam.x = drag.cx - (l.x - drag.sx) / cam.s;
      cam.z = drag.cz - (l.y - drag.sy) / cam.s;
      drag.hist.push({ x: l.x, y: l.y, t: performance.now() });
      if (drag.hist.length > 8) drag.hist.shift();
    } else { drag.lx = l.x; drag.ly = l.y; }
    return;
  }
  if (travel || e.pointerType === 'touch') return;
  const hit = pick(l);
  hover = hit && hit.p;
  if (hover) {
    view.style.cursor = 'pointer';
    tip.textContent = (hover.opt.name || hover.project.title) + (hover.main ? ' · ' + hover.project.title : '');
    tip.style.display = 'block';
    tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  } else { view.style.cursor = ''; tip.style.display = 'none'; }
});
function pointerEnd(e) {
  delete pointers[e.pointerId];
  if (pinch) { if (Object.keys(pointers).length < 2) pinch = null; return; }
  if (!drag) return;
  const d = drag;
  drag = null;
  view.classList.remove('panning');
  if (d.type === 'piece') {
    releaseGrab();                                          // la pieza conserva su velocidad y giro: sale lanzada
    if (d.moved || e.type !== 'pointerup') return;
    const now = performance.now(), p = d.p;
    if (lupa || (lastTap.p === p && now - lastTap.t < 450)) { lastTap = { p: null, t: 0 }; if (p.main && cur === home) go(p.project.id); return; }
    lastTap = { p, t: now };
    return;
  }
  const now = performance.now(), rec = d.hist.filter(h => now - h.t < 100);
  if (rec.length >= 2) {
    const a = rec[0], b = rec[rec.length - 1], dt = Math.max(16, b.t - a.t);
    inertia = { vx: -(b.x - a.x) / dt / cam.s, vz: -(b.y - a.y) / dt / cam.s };
  }
}
view.addEventListener('pointerup', pointerEnd);
view.addEventListener('pointercancel', pointerEnd);
view.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
view.addEventListener('wheel', e => {
  e.preventDefault();
  if (travel) return;
  const l = localXY(e), before = screenToWorld(l.x, l.y);
  cam.s = Math.max(sMin(), Math.min(ZOOM_MAX, cam.s * Math.exp(-e.deltaY * 0.0012)));
  cam.x = before.x - (l.x - vw / 2) / cam.s;               // zoom hacia el puntero
  cam.z = before.z - (l.y - vh / 2) / cam.s;
}, { passive: false });

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-go],.back');
  if (!b) return;
  go(b.dataset.go || 'home');
});
$('navContact').addEventListener('click', () => go(CONTACT_SPACE.id));
$('navInfo').addEventListener('click', () => {
  if (SITE.contact.email) location.href = 'mailto:' + SITE.contact.email + '?subject=' + encodeURIComponent('Información sobre tus proyectos');
  else go(CONTACT_SPACE.id);
});
$('lupa').addEventListener('click', () => { lupa = !lupa; $('lupa').classList.toggle('on', lupa); });
$('reset').addEventListener('click', () => {
  if (travel || !introGone) return;
  let i = 0;
  pieces.filter(p => p.spaceId === cur.id && p.mode === 'free').forEach(p => drop(p, i++, p.main && cur !== home ? cur.dock : p.home));
  if (cur === home) { const f = focusOf(home); cam.x = f.x; cam.z = f.z; cam.s = f.s; }
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!introGone) { typed = true; maybeDrop(); dissolveIntro(); } else go('home');
});

/* =====================================================================
   Bucle
   ===================================================================== */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (travel) updateTravel(now);
  else if (inertia) {
    cam.x += inertia.vx * dt * 1000; cam.z += inertia.vz * dt * 1000;
    inertia.vx *= Math.pow(0.04, dt); inertia.vz *= Math.pow(0.04, dt);
    if (Math.hypot(inertia.vx, inertia.vz) < 0.01) inertia = null;
  }
  if (drag && drag.type === 'piece') {
    const edge = 50;                                         // al llevar una pieza al borde de la vista, la cámara la acompaña
    const ex = drag.lx < edge ? -1 : drag.lx > vw - edge ? 1 : 0, ez = drag.ly < edge ? -1 : drag.ly > vh - edge ? 1 : 0;
    cam.x += ex * 500 * dt; cam.z += ez * 500 * dt;
  }
  applyCamera();
  if (drag && drag.type === 'piece') { const c = cursorAt({ x: drag.lx, y: drag.ly }, drag.y); phys.moveGrab(c.x, c.z); }

  phys.stepPhysics(dt);
  for (const p of pieces) {
    if (p.mode === 'wait') continue;
    const t = p.phys.body.translation(), q = p.phys.body.rotation();
    if (p.mode === 'free' && !(t.y > -60 && t.y < 3000)) { settle(p, p.spaceId === 'home' ? p.home : p.main ? spaces[p.spaceId].dock : p.home); continue; }   // seguro
    p.obj.position.set(t.x, t.y, t.z);
    p.obj.quaternion.set(q.x, q.y, q.z, q.w);
  }
  checkIntroHit(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* =====================================================================
   Arranque
   ===================================================================== */
(async function start() {
  try {
    applyCamera();
    await phys.initPhysics();
    phys.addWalls(0, 0, MAT.w, MAT.h);
    await layoutSpaces();
    requestAnimationFrame(frame);
    await Promise.all(pieceDefs.map(loadPiece));
    assignHomes();
    loadedAll = true;
    showProgress();
    maybeDrop();
  } catch (err) { fail('Error al iniciar: ' + err.message); console.error(err); }
})();

/* Acceso para pruebas automáticas */
window.__app = { drop, settle, pieces, spaces, cam, phys, go, get cur() { return cur; }, get travel() { return travel; }, worldToScreen, screenToWorld };
