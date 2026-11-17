/* Físicas con Rapier (WebAssembly). Unidades: milímetros y segundos. */
import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js';
import { PHYSICS as P } from './config.js';

let world, ray;
const DT = 1 / 120;
let grab = null;

export async function initPhysics() {
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: -P.gravity, z: 0 });
  world.lengthUnit = 1000;                      // trabajamos en milímetros: 1000 unidades por metro
  world.timestep = DT;
  world.numSolverIterations = P.solverIterations;
  world.integrationParameters.numAdditionalFrictionIterations = 4;
  // Suelo: bloque cuya cara superior es el plano y = 0. Cubre todas las mats sin medidas desorbitadas
  // (un bloque gigante pierde precisión en los contactos y hace vibrar las piezas).
  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -100, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(16000, 100, 16000).setFriction(P.friction).setRestitution(P.restitution), floor);
  ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
}

/* Paredes invisibles alrededor de una mat (centro cx, cz) */
export function addWalls(cx, cz, w, h) {
  const T = 200, H = 1500;
  const mk = (x, z, hx, hz) => {
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, H, z));
    world.createCollider(RAPIER.ColliderDesc.cuboid(hx, H, hz).setFriction(0.2).setRestitution(0.3), b);
  };
  mk(cx - w / 2 - T, cz, T, h / 2 + 2 * T); mk(cx + w / 2 + T, cz, T, h / 2 + 2 * T);
  mk(cx, cz - h / 2 - T, w / 2, T); mk(cx, cz + h / 2 + T, w / 2, T);
}

export function addBody(built, kind) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(0, -5000, 0).setCcdEnabled(true)
    .setLinearDamping(P.linearDamping).setAngularDamping(P.angularDamping));
  let desc = kind === 'hull' ? RAPIER.ColliderDesc.convexHull(built.points) : null;
  if (!desc) desc = RAPIER.ColliderDesc.cuboid(built.size.x / 2, built.size.y / 2, built.size.z / 2);
  const collider = world.createCollider(desc.setFriction(P.friction).setRestitution(P.restitution).setDensity(1), body);
  body.setEnabled(false);
  return { body, collider };
}

export function place(b, x, y, z, q) {
  b.body.setEnabled(true);
  b.collider.setEnabled(true);
  b.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
  b.body.setTranslation({ x, y, z }, true);
  if (q) b.body.setRotation(q, true);
  b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}
/* Vuelo guiado entre espacios: la pieza no choca con nada mientras dura */
export function setFlying(b, on) {
  b.body.setEnabled(true);
  b.collider.setEnabled(!on);
  b.body.setBodyType(on ? RAPIER.RigidBodyType.KinematicPositionBased : RAPIER.RigidBodyType.Dynamic, true);
  if (!on) { b.body.setLinvel({ x: 0, y: 0, z: 0 }, true); b.body.setAngvel({ x: 0, y: 0, z: 0 }, true); }
}
export function moveFlying(b, pos, q) { b.body.setTranslation(pos, true); b.body.setRotation(q, true); }
export function impulse(b, v, spin) {
  const m = b.body.mass();
  b.body.setLinvel(v, true);
  if (spin) b.body.setAngvel(spin, true);
  return m;
}

/* Rayo contra las formas de colisión: devuelve { collider, point } */
export function castRay(origin, dir) {
  ray.origin = origin; ray.dir = dir;
  const hit = world.castRay(ray, 1e5, true, RAPIER.QueryFilterFlags.EXCLUDE_FIXED);
  if (!hit) return null;
  const t = hit.timeOfImpact;
  return { handle: hit.collider.handle, point: { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t } };
}

/* ---------- Agarre por punto ----------
   El punto agarrado queda unido al cursor con un muelle amortiguado (como un "mouse joint").
   La fuerza se aplica en ese punto, no en el centro: la pieza pivota, coge inercia y sale lanzada. */
function rot(q, v) {
  const { x, y, z, w } = q, ix = w * v.x + y * v.z - z * v.y, iy = w * v.y + z * v.x - x * v.z, iz = w * v.z + x * v.y - y * v.x, iw = -x * v.x - y * v.y - z * v.z;
  return { x: ix * w + iw * -x + iy * -z - iz * -y, y: iy * w + iw * -y + iz * -x - ix * -z, z: iz * w + iw * -z + ix * -y - iy * -x };
}
export function startGrab(b, worldPoint) {
  const t = b.body.translation(), q = b.body.rotation();
  const inv = { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  const local = rot(inv, { x: worldPoint.x - t.x, y: worldPoint.y - t.y, z: worldPoint.z - t.z });
  grab = { b, local, tx: worldPoint.x, tz: worldPoint.z };
  b.body.wakeUp();
}
export function moveGrab(x, z) { if (grab) { grab.tx = x; grab.tz = z; } }
export function endGrab() { grab = null; }
export function grabAnchor() {
  if (!grab) return null;
  const t = grab.b.body.translation(), o = rot(grab.b.body.rotation(), grab.local);
  return { x: t.x + o.x, z: t.z + o.z };
}

function applyGrab() {
  const body = grab.b.body, t = body.translation(), com = body.worldCom(), v = body.linvel(), w = body.angvel();
  const o = rot(body.rotation(), grab.local);
  // La fuerza se aplica en el punto real agarrado. Si está alto, el rozamiento con la mat crea un par
  // que vuelca la pieza en la dirección del arrastre; si está a media altura, la pieza pivota y se desliza.
  const p = { x: t.x + o.x, y: t.y + o.y, z: t.z + o.z };
  const rx = p.x - com.x, ry = p.y - com.y, rz = p.z - com.z;
  const vpx = v.x + w.y * rz - w.z * ry, vpz = v.z + w.x * ry - w.y * rx;   // velocidad del punto (v + ω × r)
  const om = 2 * Math.PI * P.grabFrequency, k = om * om, c = 2 * P.grabDamping * om;
  let ax = k * (grab.tx - p.x) - c * vpx, az = k * (grab.tz - p.z) - c * vpz;
  const a = Math.hypot(ax, az);
  if (a > P.grabMaxAccel) { ax *= P.grabMaxAccel / a; az *= P.grabMaxAccel / a; }
  const m = body.mass();
  body.applyImpulseAtPoint({ x: ax * m * DT, y: 0, z: az * m * DT }, p, true);
}

const still = new Map(), snap = new Map();
function clampSpeeds() {
  world.forEachActiveRigidBody(body => {
    if (!body.isDynamic()) return;
    const v = body.linvel(), s = Math.hypot(v.x, v.y, v.z);
    if (s > P.maxSpeed) body.setLinvel({ x: v.x * P.maxSpeed / s, y: v.y * P.maxSpeed / s, z: v.z * P.maxSpeed / s }, true);
    const w = body.angvel(), a = Math.hypot(w.x, w.y, w.z);
    const held = grab && grab.b.body.handle === body.handle;
    // Reposo: un movimiento muy lento (balanceo, vibración de contacto) se frena con fuerza y la pieza se duerme;
    // el movimiento real (lanzar, empujar, rodar) está muy por encima de estos umbrales y no se ve afectado.
    if (!held && s < P.restSpeed && a < P.restSpin) {
      const f = P.restDamping;
      body.setLinvel({ x: v.x * f, y: v.y < 0 ? v.y : v.y * f, z: v.z * f }, false);
      body.setAngvel({ x: w.x * f, y: w.y * f, z: w.z * f }, false);
    }
    const calm = !held && s < P.restSpeed * .5 && a < P.restSpin * .5;
    const n = calm ? (still.get(body.handle) || 0) + 1 : 0;
    still.set(body.handle, n);
    if (n > P.restFrames) { body.sleep(); still.set(body.handle, 0); snap.delete(body.handle); return; }
    // Vibración: la velocidad puede tener picos pero la pieza no llega a ninguna parte.
    // Cada ventana de restWindow pasos se compara posición y giro; si apenas han cambiado, se duerme.
    if (held) { snap.delete(body.handle); return; }
    const t = body.translation(), q = body.rotation(), o = snap.get(body.handle);
    if (!o) { snap.set(body.handle, { t: { x: t.x, y: t.y, z: t.z }, q: { x: q.x, y: q.y, z: q.z, w: q.w }, k: 0 }); }
    else if (++o.k >= P.restWindow) {
      const d = Math.hypot(t.x - o.t.x, t.y - o.t.y, t.z - o.t.z);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(q.x * o.q.x + q.y * o.q.y + q.z * o.q.z + q.w * o.q.w))) * 180 / Math.PI;
      if (d < P.restDrift && ang < P.restDrift) { body.setLinvel({ x: 0, y: 0, z: 0 }, false); body.setAngvel({ x: 0, y: 0, z: 0 }, false); body.sleep(); snap.delete(body.handle); return; }
      snap.set(body.handle, { t: { x: t.x, y: t.y, z: t.z }, q: { x: q.x, y: q.y, z: q.z, w: q.w }, k: 0 });
    }
    if (a > P.maxSpin) body.setAngvel({ x: w.x * P.maxSpin / a, y: w.y * P.maxSpin / a, z: w.z * P.maxSpin / a }, true);
  });
}

let acc = 0;
export function stepPhysics(dt) {
  acc = Math.min(acc + dt, DT * 8);                 // paso fijo de 1/120 s, independiente de los fps
  for (; acc >= DT; acc -= DT) {
    if (grab) applyGrab();
    world.step();
    clampSpeeds();
  }
}

/* Diagnóstico: mayor penetración entre piezas (mm, 0 si no hay) y mayor velocidad */
export function debugState(list) {
  let pen = 0, speed = 0;
  for (let i = 0; i < list.length; i++) {
    const v = list[i].body.linvel(); speed = Math.max(speed, Math.hypot(v.x, v.y, v.z));
    for (let j = i + 1; j < list.length; j++) world.contactPair(list[i].collider, list[j].collider, m => {
      for (let k = 0; k < m.numContacts(); k++) pen = Math.max(pen, -m.contactDist(k));
    });
  }
  return { pen, speed };
}
