/* Cutting mat: cuadrícula principal muy marcada, numeración, ángulos, cortes y desgaste.
   Todo es HTML/SVG vectorial (nítido con zoom) salvo las manchas, que son un lienzo de baja resolución. */
import { MAT } from './config.js';

export function rng(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

let grainURL = null;
function grain() {
  if (grainURL) return grainURL;
  const c = document.createElement('canvas');
  c.width = c.height = 220;
  const g = c.getContext('2d'), img = g.createImageData(220, 220), r = rng(5);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() < .5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = r() * 26;
  }
  g.putImageData(img, 0, 0);
  return (grainURL = c.toDataURL());
}

/* Manchas, zonas gastadas que apagan las líneas y roces claros */
function wearCanvas(w, h, r) {
  const k = 1 / 3, c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d');
  g.scale(k, k);
  const n = Math.round(w * h / 90000);
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, rad = 60 + r() * 260, t = r();
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const col = t < .45 ? '26,77,69' : t < .75 ? '10,40,35' : '150,200,188';     // verde mat (borra línea), sombra, roce claro
    const a = t < .45 ? .35 + r() * .4 : t < .75 ? .1 + r() * .16 : .05 + r() * .08;
    gr.addColorStop(0, 'rgba(' + col + ',' + a + ')');
    gr.addColorStop(.6, 'rgba(' + col + ',' + a * .5 + ')');
    gr.addColorStop(1, 'rgba(' + col + ',0)');
    g.fillStyle = gr;
    g.save(); g.translate(x, y); g.rotate(r() * 3); g.scale(1, .4 + r() * .6); g.translate(-x, -y);
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    g.restore();
  }
  return c;
}

export function buildMat(w, h, seed, label, angles = true) {
  const r = rng(seed), M = MAT.margin, G = MAT.grid;
  const el = document.createElement('div');
  el.className = 'mat';
  el.style.width = w + 'px'; el.style.height = h + 'px';

  const gw = Math.floor((w - 2 * M) / G) * G, gh = Math.floor((h - 2 * M) / G) * G;
  const L = (w - gw) / 2, T = (h - gh) / 2, R = L + gw, B = T + gh;

  const gr = document.createElement('div');
  gr.className = 'mat-grain';
  gr.style.backgroundImage = 'url(' + grain() + ')';
  el.appendChild(gr);

  const grid = document.createElement('div');
  grid.className = 'mat-grid';
  grid.style.cssText = 'left:' + L + 'px;top:' + T + 'px;width:' + gw + 'px;height:' + gh + 'px;background-size:' + G + 'px ' + G + 'px';
  el.appendChild(grid);

  const wear = wearCanvas(w, h, r);
  wear.className = 'mat-wear';
  el.appendChild(wear);

  const s = [];
  // Reglas y numeración (cm) en los cuatro bordes
  let ticks = '', txt = '';
  for (let x = 0; x <= gw; x += G) {
    ticks += 'M' + (L + x) + ' ' + T + 'v-12M' + (L + x) + ' ' + B + 'v12';
    if (x % (2 * G) === 0) txt += '<text x="' + (L + x) + '" y="' + (T - 18) + '" text-anchor="middle">' + x / 10 + '</text><text x="' + (L + x) + '" y="' + (B + 28) + '" text-anchor="middle">' + x / 10 + '</text>';
  }
  for (let y = 0; y <= gh; y += G) {
    ticks += 'M' + L + ' ' + (T + y) + 'h-12M' + R + ' ' + (T + y) + 'h12';
    if (y % (2 * G) === 0 && y > 0) txt += '<text x="' + (L - 17) + '" y="' + (T + y + 4) + '" text-anchor="end">' + y / 10 + '</text><text x="' + (R + 17) + '" y="' + (T + y + 4) + '">' + y / 10 + '</text>';
  }
  s.push('<path d="' + ticks + '" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>');
  s.push('<g class="mat-num">' + txt + '</g>');

  // Transportador (abajo a la izquierda) y diagonales a 45° (arriba a la derecha)
  const len = angles ? Math.min(gw, gh) * .48 : 0;
  let ang = '', lab = '';
  if (angles) {
  [15, 30, 45, 60, 75].forEach(a => {
    const t = a * Math.PI / 180;
    ang += 'M' + L + ' ' + B + 'L' + (L + len * Math.cos(t)).toFixed(1) + ' ' + (B - len * Math.sin(t)).toFixed(1);
    lab += '<text x="' + (L + (len + 26) * Math.cos(t)).toFixed(1) + '" y="' + (B - (len + 26) * Math.sin(t) + 4).toFixed(1) + '" text-anchor="middle">' + a + '°</text>';
  });
  [.3, .5, .7].forEach(f => { const q = len * f; ang += 'M' + (L + q) + ' ' + B + 'A' + q + ' ' + q + ' 0 0 0 ' + L + ' ' + (B - q); });
  const dn = Math.max(2, Math.round(Math.min(gw, gh) / 500));
  for (let k = 1; k <= dn; k++) ang += 'M' + (R - k * 3 * G) + ' ' + T + 'L' + R + ' ' + (T + k * 3 * G);
  }
  s.push('<path d="' + ang + '" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>');
  s.push('<g class="mat-num" style="font-size:13px">' + lab + '</g>');
  if (label) s.push('<text class="mat-num" x="' + (R - 10) + '" y="' + (B - 14) + '" text-anchor="end" style="letter-spacing:2px">' + label + '</text>');

  // Cortes de cúter: tajos rectos en racimos, con un filo claro y su sombra
  let light = '', dark = '';
  const clusters = Math.round(w * h / 160000);
  for (let i = 0; i < clusters; i++) {
    const cx = r() * w, cy = r() * h, a0 = r() * Math.PI, m = 1 + Math.floor(r() * 5);
    for (let j = 0; j < m; j++) {
      const a = a0 + (r() - .5) * .25, l = 40 + r() * 260, x = cx + (r() - .5) * 90, y = cy + (r() - .5) * 90;
      const dx = Math.cos(a) * l, dy = Math.sin(a) * l;
      light += 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'l' + dx.toFixed(1) + ' ' + dy.toFixed(1);
      dark += 'M' + (x + 1.2).toFixed(1) + ' ' + (y + 1.2).toFixed(1) + 'l' + dx.toFixed(1) + ' ' + dy.toFixed(1);
    }
  }
  s.push('<path d="' + dark + '" stroke="#0b2b26" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>');
  s.push('<path d="' + light + '" stroke="#cfe6df" stroke-opacity=".3" stroke-width="1" stroke-linecap="round"/>');
  let dots = '';
  for (let i = 0; i < clusters * 2; i++) dots += '<circle cx="' + (r() * w).toFixed(0) + '" cy="' + (r() * h).toFixed(0) + '" r="' + (r() * 2.4 + .6).toFixed(1) + '"/>';
  s.push('<g fill="#0b2b26" fill-opacity=".45">' + dots + '</g>');

  el.insertAdjacentHTML('beforeend', '<svg class="mat-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' + s.join('') + '</svg>');
  return el;
}
