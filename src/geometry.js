/* Carga de STL y preparación de la malla: superficie blanca lisa, aristas vivas y contorno. */
const THREE = window.THREE;

/* ---------- Carga (con progreso) de .stl binario/ASCII o .json con el STL en base64 ---------- */
export async function fetchSTL(file, onProgress) {
  const res = await fetch(file);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const total = +res.headers.get('content-length') || 0;
  let bytes;
  if (res.body && res.body.getReader && total) {
    const reader = res.body.getReader(), chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      if (onProgress) onProgress(got, total);
    }
    bytes = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { bytes.set(c, o); o += c.length; }
  } else {
    bytes = new Uint8Array(await res.arrayBuffer());
  }
  if (/\.json(\?|$)/i.test(file)) {
    const b64 = JSON.parse(new TextDecoder().decode(bytes)).b64;
    bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0));
  }
  return parseSTL(bytes);
}

/* Devuelve un Float32Array con los triángulos (9 números por triángulo) */
function parseSTL(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = bytes.length >= 84 ? dv.getUint32(80, true) : 0;
  if (bytes.length === 84 + n * 50 && n > 0) {
    const out = new Float32Array(n * 9);
    for (let i = 0; i < n; i++) {
      const o = 84 + i * 50 + 12;
      for (let k = 0; k < 9; k++) out[i * 9 + k] = dv.getFloat32(o + k * 4, true);
    }
    return out;
  }
  const txt = new TextDecoder().decode(bytes), nums = [];
  const re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
  let m;
  while ((m = re.exec(txt))) nums.push(+m[1], +m[2], +m[3]);
  if (!nums.length) throw new Error('STL no reconocido');
  return new Float32Array(nums);
}

/* ---------- Preparación ----------
   - centra y escala la malla
   - suelda vértices para conocer qué caras comparten cada arista
   - genera solo las aristas cuyo ángulo entre caras supera edgeAngle
   - calcula normales suaves para el contorno exterior */
export function buildPiece(tris, opt) {
  const g0 = new THREE.BufferGeometry();
  g0.setAttribute('position', new THREE.BufferAttribute(tris, 3));
  const r = opt.rotate || [0, 0, 0], d = Math.PI / 180;
  if (r[0] || r[1] || r[2]) g0.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0] * d, r[1] * d, r[2] * d)));
  if (opt.scale !== 1) g0.scale(opt.scale, opt.scale, opt.scale);
  g0.computeBoundingBox();
  const c = g0.boundingBox.getCenter(new THREE.Vector3()), size = g0.boundingBox.getSize(new THREE.Vector3());
  g0.translate(-c.x, -c.y, -c.z);
  const src = g0.attributes.position.array;

  // Soldadura de vértices
  const tol = Math.max(size.x, size.y, size.z) * 2e-5 || 1e-4;
  const map = new Map(), pos = [], index = new Uint32Array(src.length / 3);
  for (let i = 0; i < src.length; i += 3) {
    const key = Math.round(src[i] / tol) + '_' + Math.round(src[i + 1] / tol) + '_' + Math.round(src[i + 2] / tol);
    let id = map.get(key);
    if (id === undefined) { id = pos.length / 3; map.set(key, id); pos.push(src[i], src[i + 1], src[i + 2]); }
    index[i / 3] = id;
  }
  const nV = pos.length / 3, nF = index.length / 3;

  // Normales de cara (y descarte de triángulos degenerados)
  const fn = new Float32Array(nF * 3), ok = new Uint8Array(nF), vn = new Float32Array(nV * 3);
  for (let f = 0; f < nF; f++) {
    const a = index[f * 3] * 3, b = index[f * 3 + 1] * 3, c2 = index[f * 3 + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c2] - pos[a], vy = pos[c2 + 1] - pos[a + 1], vz = pos[c2 + 2] - pos[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
    if (a === b || b === c2 || a === c2 || l < 1e-9) continue;
    ok[f] = 1;
    fn[f * 3] = nx / l; fn[f * 3 + 1] = ny / l; fn[f * 3 + 2] = nz / l;
    for (const v of [a, b, c2]) { vn[v] += nx; vn[v + 1] += ny; vn[v + 2] += nz; }   // ponderado por área
  }

  // Aristas vivas
  const edgeFaces = new Map();
  for (let f = 0; f < nF; f++) {
    if (!ok[f]) continue;
    for (let k = 0; k < 3; k++) {
      const a = index[f * 3 + k], b = index[f * 3 + (k + 1) % 3];
      const key = a < b ? a * nV + b : b * nV + a;
      const e = edgeFaces.get(key);
      if (e) e.push(f); else edgeFaces.set(key, [f]);
    }
  }
  const cos = Math.cos(opt.edgeAngle * d), sharpEdges = [];
  const parent = new Int32Array(nV).fill(-1);            // unión de vértices conectados por aristas vivas
  const find = v => { while (parent[v] >= 0) { if (parent[parent[v]] >= 0) parent[v] = parent[parent[v]]; v = parent[v]; } return v; };
  edgeFaces.forEach((fs, key) => {
    let sharp = fs.length === 1;                         // borde abierto
    if (fs.length >= 2) {
      const p = fs[0] * 3, q = fs[1] * 3;
      sharp = fn[p] * fn[q] + fn[p + 1] * fn[q + 1] + fn[p + 2] * fn[q + 2] < cos;
    }
    if (!sharp) return;
    const a = Math.floor(key / nV), b = key % nV, ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
    sharpEdges.push(a, b);
  });
  // Se descartan los trazos sueltos (ruido de la malla): solo quedan cadenas de aristas con cierta longitud
  const chain = new Map(), minLen = Math.max(size.x, size.y, size.z) * opt.edgeMinLength, lines = [];
  const elen = i => Math.hypot(pos[sharpEdges[i] * 3] - pos[sharpEdges[i + 1] * 3], pos[sharpEdges[i] * 3 + 1] - pos[sharpEdges[i + 1] * 3 + 1], pos[sharpEdges[i] * 3 + 2] - pos[sharpEdges[i + 1] * 3 + 2]);
  for (let i = 0; i < sharpEdges.length; i += 2) { const r0 = find(sharpEdges[i]); chain.set(r0, (chain.get(r0) || 0) + elen(i)); }
  for (let i = 0; i < sharpEdges.length; i += 2) {
    if (chain.get(find(sharpEdges[i])) < minLen) continue;
    const a = sharpEdges[i] * 3, b = sharpEdges[i + 1] * 3;
    lines.push(pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));

  // Contorno: la misma malla inflada a lo largo de las normales suaves, pintada por dentro en negro
  const OUT = 1.1, hull = new Float32Array(pos.length);
  for (let v = 0; v < pos.length; v += 3) {
    const l = Math.hypot(vn[v], vn[v + 1], vn[v + 2]) || 1;
    hull[v] = pos[v] + vn[v] / l * OUT; hull[v + 1] = pos[v + 1] + vn[v + 1] / l * OUT; hull[v + 2] = pos[v + 2] + vn[v + 2] / l * OUT;
  }
  const outline = new THREE.BufferGeometry();
  outline.setAttribute('position', new THREE.BufferAttribute(hull, 3));
  outline.setIndex(geo.index);

  // Puntos para la envolvente convexa de colisión (submuestreados)
  // (se agrupan en una rejilla gruesa: una envolvente con pocas caras es más estable al apoyarse)
  const cell = Math.max(size.x, size.y, size.z) / 28, seen = new Set(), pts = [];
  for (let v = 0; v < nV; v++) {
    const k = Math.round(pos[v * 3] / cell) + '_' + Math.round(pos[v * 3 + 1] / cell) + '_' + Math.round(pos[v * 3 + 2] / cell);
    if (seen.has(k)) continue;
    seen.add(k);
    pts.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
  }

  return { geo, outline, lines: new Float32Array(lines), size, points: new Float32Array(pts), triangles: nF };
}

/* ---------- Objeto de three.js listo para la escena ---------- */
const WHITE = new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const BLACK = new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.BackSide });
const DEPTH = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
export const lineMaterial = new THREE.LineMaterial({ color: 0x0a0a0a, linewidth: 1.5 });

export function makeObject(built) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(built.geo, WHITE);
  mesh.castShadow = true;
  mesh.customDepthMaterial = DEPTH;
  group.add(mesh);
  group.add(new THREE.Mesh(built.outline, BLACK));
  if (built.lines.length) {
    const lg = new THREE.LineSegmentsGeometry();
    lg.setPositions(built.lines);
    group.add(new THREE.LineSegments2(lg, lineMaterial));
  }
  return group;
}
