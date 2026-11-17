/* Espacios de proyecto: una mat propia por proyecto, con título, post-its, fotos y zona de piezas.
   Todo se genera a partir de data/projects.js y se coloca solo (salvo lo que lleve `at`). */
import { MAT } from './config.js';
import { buildMat, rng } from './mat.js';
import { SITE } from '../data/projects.js';

const COLORS = ['yellow', 'pink', 'blue', 'yellow', 'white', 'pink'];
const LEFT = 70, TOP = 80, BENCH_W = 430, COL_W = 290, GAP = 34, CONTENT_X = LEFT + BENCH_W + 50;
export const DOCK = { w: 300, h: 260 };

const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Texto manuscrito: cada palabra con un desvío mínimo para que no quede perfectamente alineado */
function hand(text, r) {
  return esc(text).split(/\s+/).map(w =>
    '<span class="w" style="--y:' + ((r() - .5) * 2.4).toFixed(2) + 'px;--a:' + ((r() - .5) * 3).toFixed(2) + 'deg">' + w + '</span>').join(' ');
}
function mailto(subject) {
  const e = SITE.contact.email;
  if (!e) return '<span class="pend">Email pendiente de añadir</span>';
  return '<a href="mailto:' + e + (typeof subject === 'string' ? '?subject=' + encodeURIComponent(subject) : '') + '">' + esc(e) + '</a>';
}
function noteHTML(n, i, r) {
  let body = '';
  if (n.text) body += '<p>' + hand(n.text, r) + '</p>';
  if (n.list) body += '<ul>' + n.list.map(x => '<li style="--a:' + ((r() - .5) * 1.6).toFixed(2) + 'deg">' + hand(x, r) + '</li>').join('') + '</ul>';
  if (n.links) body += n.links.map(l => '<p>' + (l.url ? '<a href="' + l.url + '" target="_blank" rel="noopener">' + hand(l.label, r) + '</a>'
    : '<span class="pend">' + hand(l.label + ': enlace pendiente', r) + '</span>') + '</p>').join('');
  if (n.email) body += '<p>' + mailto(n.email) + '</p>';
  if (n.linkedin) body += '<p>' + (SITE.contact.linkedin ? '<a href="' + SITE.contact.linkedin + '" target="_blank" rel="noopener">LinkedIn</a>' : '<span class="pend">LinkedIn pendiente</span>') + '</p>';
  // contorno ligeramente irregular, distinto en cada nota
  const j = () => (r() * 1.3).toFixed(2), k = () => (100 - r() * 1.3).toFixed(2);
  const clip = 'polygon(' + j() + '% ' + j() + '%,50% ' + (r() * .6).toFixed(2) + '%,' + k() + '% ' + j() + '%,' + k() + '% ' + k() + '%,' + (45 + r() * 10).toFixed(1) + '% ' + k() + '%,' + j() + '% ' + k() + '%)';
  return '<div class="note item ' + (n.color || COLORS[i % COLORS.length]) + '" style="--r:' + (n.rot != null ? n.rot : ((r() - .5) * 6).toFixed(2)) + 'deg">' +
    '<div class="paper" style="clip-path:' + clip + '">' + (n.title ? '<h3>' + hand(n.title, r) + '</h3>' : '') + body + '</div></div>';
}
function photoHTML(p, r) {
  const inner = p.src ? '<img src="' + p.src + '" alt="' + esc(p.caption || '') + '" draggable="false">' : '<div class="ph">foto pendiente</div>';
  return '<figure class="photo item" style="--r:' + (p.rot != null ? p.rot : ((r() - .5) * 9).toFixed(2)) + 'deg;--tape:' + ((r() - .5) * 10).toFixed(1) + 'deg">' +
    inner + '<figcaption>' + esc(p.caption || '') + '</figcaption></figure>';
}

/* Crea el DOM del espacio (sin colocar todavía) */
export function createSpace(def, seed) {
  const r = rng(seed), el = document.createElement('section');
  el.className = 'space';
  el.dataset.space = def.id;
  let h = '<div class="content">';
  // título y subtítulo fuera de la mat, justo encima de su borde superior
  h += '<header class="ztitle"><h2>' + esc(def.title) + '</h2><p>' + esc(def.subtitle || '') + '</p></header>';
  if (def.piece) h += '<div class="dock"><span>Pieza · ' + esc(def.piece.name || '') + '</span></div>';
  (def.photos || []).forEach(p => { h += photoHTML(p, r); });
  (def.notes || []).forEach((n, i) => { h += noteHTML(n, i, r); });
  el.innerHTML = h + '</div>';
  return { id: def.id, def, el, r, seed };
}

/* Coloca los elementos (hay que llamarla con el espacio visible y las tipografías cargadas) */
export function layoutSpace(sp, origin) {
  const { el, def, r } = sp, G = MAT.grid;
  const content = el.querySelector('.content'), title = el.querySelector('.ztitle'), dock = el.querySelector('.dock');
  const items = [...el.querySelectorAll('.item')];
  const defs = [...(def.photos || []), ...(def.notes || [])];
  const nExtra = (def.extras || []).length;

  const HEAD_GAP = 22, head = title.offsetHeight + HEAD_GAP;
  title.style.cssText = 'left:8px;top:' + (-head) + 'px';
  const benchTop = TOP + 34;
  const benchH = (def.piece ? DOCK.h + 40 : 0) + nExtra * 240;

  // Reparto en columnas: cada elemento va a la columna más corta
  const free = items.filter((it, i) => !defs[i].at);
  const nCols = Math.max(2, Math.min(5, Math.ceil(Math.sqrt(free.length * 1.25))));
  const colH = new Array(nCols).fill(TOP + 10);
  let maxX = CONTENT_X + nCols * (COL_W + GAP), maxY = 0;
  items.forEach((it, i) => {
    let x, yy;
    if (defs[i].at) { x = defs[i].at[0]; yy = defs[i].at[1]; }
    else {
      const c = colH.indexOf(Math.min(...colH));
      x = CONTENT_X + c * (COL_W + GAP) + (COL_W - it.offsetWidth) / 2 + (r() - .5) * 22;
      yy = colH[c] + r() * 16;
      colH[c] = yy + it.offsetHeight + GAP;
    }
    it.style.left = Math.round(x) + 'px'; it.style.top = Math.round(yy) + 'px';
    maxX = Math.max(maxX, x + it.offsetWidth + GAP); maxY = Math.max(maxY, yy + it.offsetHeight + GAP);
  });

  const w = Math.ceil((maxX + 50) / G) * G + 2 * (MAT.margin % G);
  const h = Math.ceil((Math.max(maxY, benchTop + benchH, 640) + 70) / G) * G;
  const dockC = { x: LEFT + BENCH_W / 2 - 20, y: benchTop + DOCK.h / 2 };
  if (dock) dock.style.cssText = 'left:' + (dockC.x - DOCK.w / 2) + 'px;top:' + (dockC.y - DOCK.h / 2) + 'px;width:' + DOCK.w + 'px;height:' + DOCK.h + 'px';

  el.insertBefore(buildMat(w, h, sp.seed + 11, 'CUTTING MAT · ' + def.title.toUpperCase(), false), content);
  el.style.cssText = 'left:' + (origin.x - w / 2) + 'px;top:' + (origin.z - h / 2) + 'px;width:' + w + 'px;height:' + h + 'px';
  const toWorld = (x, yy) => ({ x: origin.x - w / 2 + x, z: origin.z - h / 2 + yy });
  Object.assign(sp, {
    x: origin.x, z: origin.z, w, h, head,
    dock: toWorld(dockC.x, dockC.y),
    extraSlots: Array.from({ length: nExtra }, (_, i) => toWorld(dockC.x, benchTop + DOCK.h + 40 + 120 + i * 240))
  });
  return sp;
}

export function arrive(sp) {
  sp.el.classList.remove('arrive'); void sp.el.offsetWidth; sp.el.classList.add('arrive');
}
