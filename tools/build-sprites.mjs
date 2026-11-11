// Generates uniform, transparent 8-bit sprite sheets for CHAINSAW CLASH.
// Layout: 8 columns x 11 rows, each cell 64x80.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'sprites');
const CELL_W = 64, CELL_H = 80, COLS = 8;
const ANIM = {
  idle:      { row: 0, frames: 4, fps: 5 },
  walk:      { row: 1, frames: 6, fps: 10 },
  run:       { row: 2, frames: 6, fps: 14 },
  jump:      { row: 3, frames: 2, fps: 2 },
  punch:     { row: 4, frames: 4, fps: 18 },
  kick:      { row: 5, frames: 4, fps: 16 },
  special:   { row: 6, frames: 6, fps: 12 },
  ultimate:  { row: 7, frames: 8, fps: 10 },
  hurt:      { row: 8, frames: 2, fps: 14 },
  knockdown: { row: 9, frames: 3, fps: 8 },
  victory:   { row: 10, frames: 4, fps: 6 }
};
const ROWS = Object.keys(ANIM).length;

/* ------------------------------------------------------------------ colors */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v * k))));
const tint = (c, k) => c.map(v => Math.max(0, Math.min(255, Math.round(v + (255 - v) * k))));
const OUTLINE = hex('#15131a');

/* ------------------------------------------------------------------ canvas */
const cell = () => ({ w: CELL_W, h: CELL_H, d: new Uint8Array(CELL_W * CELL_H * 4) });

function put(c, x, y, col, a = 255) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  if (a >= 255) {
    c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; c.d[i + 3] = 255;
  } else {
    const t = a / 255, ia = 1 - t, o = c.d;
    o[i] = Math.round(col[0] * t + o[i] * ia);
    o[i + 1] = Math.round(col[1] * t + o[i + 1] * ia);
    o[i + 2] = Math.round(col[2] * t + o[i + 2] * ia);
    o[i + 3] = Math.max(o[i + 3], Math.round(255 * t));
  }
}

function rect(c, x, y, w, h, col, a = 255) {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) put(c, x + xx, y + yy, col, a);
}

function rrect(c, x, y, w, h, col) {
  rect(c, x + 1, y, w - 2, h, col);
  rect(c, x, y + 1, w, h - 2, col);
}

function line(c, x0, y0, x1, y1, t, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const off = (t - 1) >> 1;
  for (;;) {
    rect(c, x0 - off, y0 - off, t, t, col);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function circle(c, cx, cy, r, col) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r + r * 0.4) put(c, cx + x, cy + y, col);
  }
}

function taper(c, cx, y0, y1, w0, w1, col) {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const w = Math.round(w0 + (w1 - w0) * t);
    rect(c, cx - (w >> 1), y, w, 1, col);
  }
}

// Dark silhouette border + a subtle rim light on the upper-left.
function finish(c) {
  const src = c.d.slice();
  const A = (x, y) => (x < 0 || y < 0 || x >= c.w || y >= c.h) ? 0 : src[(y * c.w + x) * 4 + 3];
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const i = (y * c.w + x) * 4;
    if (src[i + 3]) continue;
    if (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1)) {
      c.d[i] = OUTLINE[0]; c.d[i + 1] = OUTLINE[1]; c.d[i + 2] = OUTLINE[2]; c.d[i + 3] = 255;
    }
  }
  return c;
}

function blit(sheet, c, col, row) {
  const ox = col * CELL_W, oy = row * CELL_H;
  for (let y = 0; y < CELL_H; y++) for (let x = 0; x < CELL_W; x++) {
    const si = (y * CELL_W + x) * 4;
    if (!c.d[si + 3]) continue;
    const di = ((oy + y) * sheet.w + ox + x) * 4;
    sheet.d[di] = c.d[si]; sheet.d[di + 1] = c.d[si + 1];
    sheet.d[di + 2] = c.d[si + 2]; sheet.d[di + 3] = c.d[si + 3];
  }
}

/* ------------------------------------------------------------------ roster */
const CHARS = [
  { key: 'DENJI',  style: 'denji',  skin: '#f0c79b', hair: '#c99a52', coat: '#2c3a37', coat2: '#22302d', shirt: '#efe8da', pants: '#2b3037', shoe: '#15151a', accent: '#d94b37', metal: '#bcc7cd', metal2: '#8b979e' },
  { key: 'POWER',  style: 'power',  skin: '#f5d5ac', hair: '#f0d78e', coat: '#e7e0d2', coat2: '#cec7b8', shirt: '#f4efe4', pants: '#2d2b33', shoe: '#191920', accent: '#cf3442', metal: '#d7c9a0', metal2: '#b8a67c' },
  { key: 'AKI',    style: 'aki',    skin: '#ecc39a', hair: '#15161c', coat: '#232937', coat2: '#1a1f2b', shirt: '#e9e4d8', pants: '#1e232c', shoe: '#121318', accent: '#5f879b', metal: '#c7d0d4', metal2: '#9aa4aa' },
  { key: 'MAKIMA', style: 'makima', skin: '#f4cda6', hair: '#cf6b46', coat: '#2a2732', coat2: '#211f29', shirt: '#f2ece0', pants: '#24222b', shoe: '#141318', accent: '#d24a3d', eye: '#e59a4f', metal: '#c9d2d6', metal2: '#9aa4aa' },
  { key: 'KOBENI', style: 'kobeni', skin: '#f2cba6', hair: '#4c3529', coat: '#2b2c35', coat2: '#21222a', shirt: '#ece6d8', pants: '#292a33', shoe: '#141419', accent: '#cf4b3f', metal: '#cbd4d8', metal2: '#9aa4aa' },
  { key: 'HIMENO', style: 'himeno', skin: '#eec7a2', hair: '#241f2b', coat: '#252936', coat2: '#1c202b', shirt: '#d9d4c8', pants: '#20242e', shoe: '#121217', accent: '#a3a8bc', metal: '#cbd4d8', metal2: '#9aa4aa' },
  { key: 'BEAM',   style: 'beam',   skin: '#a9c9d2', hair: '#4f97b2', coat: '#3a7f9d', coat2: '#2f6b86', shirt: '#e9e3d3', pants: '#2b4657', shoe: '#152028', accent: '#55c1cf', metal: '#d9e4e7', metal2: '#a9bcc2' },
  { key: 'REZE',   style: 'reze',   skin: '#f3cba4', hair: '#4b3a52', coat: '#3a3040', coat2: '#2e2633', shirt: '#e9e2d4', pants: '#2a2431', shoe: '#151219', accent: '#e2643f', metal: '#d7c8c2', metal2: '#a89a95' },
  { key: 'KATANA', style: 'katana', skin: '#eec49c', hair: '#191b22', coat: '#24272f', coat2: '#1b1e25', shirt: '#e6e0d4', pants: '#20232b', shoe: '#121217', accent: '#b6c3ca', metal: '#ccd6da', metal2: '#97a3a9' },
  { key: 'QUANXI', style: 'quanxi', skin: '#f0cba6', hair: '#e9e4da', coat: '#2c2d37', coat2: '#22232c', shirt: '#ded9cd', pants: '#25262f', shoe: '#141418', accent: '#c9b9a5', metal: '#d3dbde', metal2: '#9fa9ad' }
];

for (const cfg of CHARS) {
  for (const k of ['skin', 'hair', 'coat', 'coat2', 'shirt', 'pants', 'shoe', 'accent', 'metal', 'metal2']) {
    if (cfg[k]) cfg[k] = hex(cfg[k]);
  }
  if (cfg.eye) cfg.eye = hex(cfg.eye);
  cfg.metal ||= hex('#c9d2d6');
  cfg.metal2 ||= hex('#98a3a8');
  cfg.eye ||= hex('#2a2328');
  cfg.wood = hex('#7a4b34');
}

/* ------------------------------------------------------------------- poses */
const TAU = Math.PI * 2;

function getPose(pose, f) {
  const p = {
    bob: 0, lean: 0, hdx: 0, hdy: 0,
    footB: [27, 73], footF: [37, 73],
    handB: [22, 45], handF: [42, 45],
    kneeB: 0, kneeF: 0, kick: false
  };
  const s = (n) => Math.round(n);
  if (pose === 'idle') {
    p.bob = [0, 0, 1, 1][f % 4];
    p.handF = [42, 45 + p.bob];
    p.handB = [22, 45 + p.bob];
    p.hdy = p.bob;
  } else if (pose === 'walk') {
    const w = Math.sin(f / 6 * TAU);
    p.bob = Math.abs(w) > 0.7 ? 1 : 0;
    p.footB = [27 + s(w * 4), 73 - Math.max(0, s(w * 3))];
    p.footF = [37 - s(w * 4), 73 - Math.max(0, s(-w * 3))];
    p.handB = [22 - s(w * 3), 45];
    p.handF = [42 + s(w * 3), 45];
  } else if (pose === 'run') {
    const w = Math.sin(f / 6 * TAU);
    p.lean = 3; p.bob = Math.abs(w) > 0.5 ? 1 : 0;
    p.footB = [26 + s(w * 7), 73 - Math.max(0, s(w * 5))];
    p.footF = [38 - s(w * 7), 73 - Math.max(0, s(-w * 5))];
    p.handB = [23 - s(w * 5), 40];
    p.handF = [40 + s(w * 5), 40];
  } else if (pose === 'jump') {
    if (f === 0) {
      p.bob = -1; p.footB = [30, 64]; p.footF = [38, 63];
      p.handB = [23, 38]; p.handF = [42, 36];
    } else {
      p.bob = -1; p.footB = [26, 69]; p.footF = [40, 68];
      p.handB = [20, 32]; p.handF = [44, 30];
    }
  } else if (pose === 'punch') {
    p.lean = 2;
    const reach = [0, 12, 16, 7][f];
    p.handF = [42 + reach, 38];
    p.handB = [22, 44];
    if (f === 0) p.handF = [37, 44];
  } else if (pose === 'kick') {
    p.lean = -1; p.kick = true;
    const reach = [0, 12, 17, 8][f];
    p.footF = [37 + reach, 73 - reach];
    p.kneeF = -6;
    p.handB = [21, 41]; p.handF = [40, 39];
  } else if (pose === 'special') {
    const reach = [0, 4, 4, 15, 17, 8][f];
    p.lean = f > 2 ? 3 : 0;
    p.bob = f < 2 ? 1 : 0;
    p.handF = [42 + reach, f < 3 ? 38 : 35];
    p.handB = [f < 2 ? 27 : 25, f < 2 ? 44 : 37];
    p.footB = [27 - (f > 2 ? 2 : 0), 73];
    p.footF = [37 + (f > 2 ? 2 : 0), 73];
  } else if (pose === 'ultimate') {
    p.bob = f < 2 ? 2 : f < 4 ? 1 : 0;
    p.lean = f > 3 ? 3 : 0;
    const up = [0, 8, 13, 14, 6, 5, 2, 0][f];
    p.handB = [24, 44 - up];
    p.handF = [41, 44 - up - (f > 2 && f < 6 ? 4 : 0)];
    p.footB = [26 - (f === 0 ? 2 : 0), 73];
    p.footF = [38 + (f === 0 ? 2 : 0), 73];
    p.hdx = [0, 0, -1, -1, 0, 0, 0, 0][f];
  } else if (pose === 'hurt') {
    p.lean = -[2, 4][f]; p.hdx = -[1, 2][f]; p.bob = [0, 1][f];
    p.handB = [19, 38]; p.handF = [35, 34];
    p.footB = [26, 73]; p.footF = [39, 73];
  } else if (pose === 'victory') {
    const w = Math.sin(f / 4 * TAU);
    p.bob = [0, 1, 1, 0][f];
    p.handB = [25, 26 + s(w)];
    p.handF = [39, 24 - s(w * 2)];
    p.footB = [28, 73]; p.footF = [36, 73];
    p.footF[0] += f % 2 ? 1 : 0;
  }
  return p;
}

/* -------------------------------------------------------------------- body */
function drawLeg(c, cfg, hip, foot, back) {
  const pants = back ? shade(cfg.pants, 0.78) : cfg.pants;
  const shoe = back ? shade(cfg.shoe, 0.8) : cfg.shoe;
  line(c, hip[0] + (back ? -2 : 2), hip[1], foot[0], foot[1] - 4, 5, pants);
  // boot with a toe pointing forward
  rect(c, foot[0] - 3, foot[1] - 6, 9, 6, shoe);
  rect(c, foot[0] + 6, foot[1] - 4, 2, 3, shoe);
  rect(c, foot[0] - 3, foot[1] - 1, 11, 1, shade(shoe, 0.65));
  // rim light + knee seam
  if (!back) {
    rect(c, foot[0] - 3, foot[1] - 6, 7, 1, tint(pants, 0.22));
    put(c, Math.round((hip[0] + foot[0]) / 2) + 1, Math.round((hip[1] + foot[1]) / 2), shade(pants, 0.7));
  }
}

function drawArm(c, cfg, sh, hand, back) {
  const sleeve = back ? shade(cfg.coat2, 0.82) : cfg.coat;
  const skin = back ? shade(cfg.skin, 0.82) : cfg.skin;
  const dx = hand[0] - sh[0], dy = hand[1] - sh[1];
  const elbow = [Math.round(sh[0] + dx * 0.55), Math.round(sh[1] + dy * 0.55)];
  line(c, sh[0], sh[1], elbow[0], elbow[1], 5, sleeve);
  rect(c, elbow[0] - 2, elbow[1] - 1, 5, 2, back ? shade(cfg.coat2, 0.65) : shade(cfg.coat, 0.72)); // cuff
  line(c, elbow[0], elbow[1], hand[0], hand[1], 3, skin);
  rrect(c, hand[0] - 2, hand[1] - 2, 5, 5, skin);
  if (!back) put(c, hand[0] - 1, hand[1] - 2, tint(skin, 0.3));
}

function drawTorso(c, cfg, sh, hip) {
  const cx = Math.round((sh[0] + hip[0]) / 2);
  taper(c, cx, sh[1], hip[1] + 1, 19, 15, cfg.coat);
  // shoulder caps
  rect(c, cx - 10, sh[1], 4, 5, shade(cfg.coat, 0.85));
  rect(c, cx + 7, sh[1], 4, 5, shade(cfg.coat, 0.7));
  rect(c, cx - 10, sh[1], 4, 1, tint(cfg.coat, 0.22));
  // shirt panel
  rect(c, cx - 3, sh[1] + 3, 6, hip[1] - sh[1] - 5, cfg.shirt);
  // jacket edges
  rect(c, cx - 8, sh[1] + 2, 2, hip[1] - sh[1] - 3, shade(cfg.coat, 0.8));
  rect(c, cx + 7, sh[1] + 2, 2, hip[1] - sh[1] - 3, shade(cfg.coat, 0.72));
  // lapels
  rect(c, cx - 5, sh[1] + 2, 2, 6, shade(cfg.coat, 0.65));
  rect(c, cx + 4, sh[1] + 2, 2, 6, shade(cfg.coat, 0.6));
  // collar
  rect(c, cx - 5, sh[1] - 1, 4, 3, cfg.shirt);
  rect(c, cx + 3, sh[1] - 1, 4, 3, cfg.shirt);
  // accent tie / zipper
  rect(c, cx - 1, sh[1] + 3, 2, 7, cfg.accent);
  rect(c, cx - 1, sh[1] + 10, 2, hip[1] - sh[1] - 12, shade(cfg.coat, 0.6));
  // belt
  rect(c, cx - 7, hip[1] - 3, 14, 2, shade(cfg.pants, 0.55));
  rect(c, cx - 2, hip[1] - 3, 3, 2, cfg.metal2);
  // rim light
  rect(c, cx - 8, sh[1] + 3, 1, hip[1] - sh[1] - 5, tint(cfg.coat, 0.18));
}

/* -------------------------------------------------------------------- head */
function eye(c, cx, top, dx, kind) {
  if (kind === 'ring') {
    rect(c, cx + dx, top, 3, 3, cfgEyeRing);
    put(c, cx + dx + 1, top + 1, hex('#2a2024'));
  } else if (kind === 'wide') {
    rect(c, cx + dx, top, 3, 3, hex('#f7f2e6'));
    rect(c, cx + dx + 1, top, 1, 3, hex('#2a2328'));
  } else {
    rect(c, cx + dx, top, 2, 2, hex('#2a2328'));
    put(c, cx + dx, top, hex('#4a4048'));
  }
}
const cfgEyeRing = hex('#e0a35c');

function drawHead(c, cfg, cx, top) {
  const skin = cfg.skin;
  const styl = cfg.style;
  // neck
  rect(c, cx - 2, top + 14, 4, 4, shade(skin, 0.82));
  // base head
  rrect(c, cx - 7, top, 14, 16, skin);
  rect(c, cx - 8, top + 7, 2, 3, shade(skin, 0.9));
  if (styl !== 'beam') rect(c, cx + 7, top + 7, 2, 3, shade(skin, 0.9));

  // ---- hairstyles / headgear -------------------------------------------
  if (styl === 'denji') {
    rect(c, cx - 8, top - 1, 16, 6, cfg.metal);
    rect(c, cx - 8, top - 1, 16, 2, tint(cfg.metal, 0.28));
    rect(c, cx - 8, top + 4, 16, 1, cfg.metal2);
    rect(c, cx - 9, top + 2, 2, 7, cfg.metal);
    rect(c, cx + 7, top + 2, 2, 7, cfg.metal);
    // chainsaw blade
    rect(c, cx - 3, top - 10, 8, 12, cfg.metal);
    rect(c, cx - 3, top - 10, 2, 12, tint(cfg.metal, 0.4));
    rect(c, cx + 3, top - 10, 2, 12, cfg.metal2);
    for (let y = top - 9; y < top + 1; y += 2) {
      rect(c, cx + 5, y, 2, 1, tint(cfg.metal, 0.5));
      rect(c, cx - 5, y + 1, 2, 1, tint(cfg.metal, 0.5));
    }
    // red casing across the forehead
    rect(c, cx - 8, top + 3, 17, 2, cfg.accent);
    rect(c, cx - 8, top + 3, 17, 1, tint(cfg.accent, 0.35));
    // teeth
    rect(c, cx - 5, top + 12, 10, 2, hex('#f2ead9'));
    for (let x = -5; x < 5; x += 2) put(c, cx + x, top + 12, hex('#2a2326'));
    // pull cord
    rect(c, cx - 9, top + 8, 3, 1, cfg.accent);
    rect(c, cx - 11, top + 9, 2, 2, cfg.accent);
  } else if (styl === 'power') {
    rect(c, cx - 8, top - 1, 16, 5, cfg.hair);
    rect(c, cx - 9, top + 2, 3, 7, cfg.hair);
    rect(c, cx + 7, top + 2, 3, 7, cfg.hair);
    rect(c, cx - 7, top + 4, 2, 4, cfg.hair);
    rect(c, cx + 5, top + 4, 2, 4, cfg.hair);
    rect(c, cx - 5, top + 1, 2, 2, tint(cfg.hair, 0.3));
    // horns
    line(c, cx - 7, top + 1, cx - 10, top - 7, 3, cfg.metal);
    line(c, cx - 10, top - 7, cx - 8, top - 10, 2, tint(cfg.metal, 0.25));
    line(c, cx + 7, top + 1, cx + 10, top - 7, 3, cfg.metal);
    line(c, cx + 10, top - 7, cx + 8, top - 10, 2, tint(cfg.metal, 0.25));
    // fangs
    put(c, cx - 3, top + 13, hex('#fff'));
  } else if (styl === 'aki') {
    rect(c, cx - 8, top - 1, 16, 5, cfg.hair);
    rect(c, cx - 8, top + 3, 2, 9, cfg.hair);
    rect(c, cx + 6, top + 3, 2, 6, cfg.hair);
    // topknot
    rect(c, cx - 1, top - 7, 4, 5, cfg.hair);
    rect(c, cx - 2, top - 2, 6, 2, cfg.hair);
    rect(c, cx, top - 6, 2, 1, shade(cfg.hair, 1.6));
    // fringe
    rect(c, cx - 6, top + 3, 2, 3, cfg.hair);
    rect(c, cx + 4, top + 3, 2, 3, cfg.hair);
    // cigarette
    rect(c, cx + 3, top + 12, 8, 1, hex('#f0eadc'));
    put(c, cx + 10, top + 12, hex('#e2603f'));
  } else if (styl === 'makima') {
    rect(c, cx - 8, top - 1, 16, 5, cfg.hair);
    rect(c, cx - 9, top + 1, 4, 17, cfg.hair);
    rect(c, cx + 6, top + 1, 4, 15, cfg.hair);
    rect(c, cx - 8, top + 4, 3, 5, cfg.hair);
    rect(c, cx + 6, top + 4, 3, 5, cfg.hair);
    rect(c, cx - 5, top + 2, 2, 4, cfg.hair);
    rect(c, cx + 2, top + 2, 2, 4, cfg.hair);
    // ringed eyes
    rect(c, cx - 5, top + 8, 3, 3, cfg.eye);
    put(c, cx - 4, top + 9, hex('#33262a'));
    rect(c, cx + 3, top + 8, 3, 3, cfg.eye);
    put(c, cx + 4, top + 9, hex('#33262a'));
    // smile
    rect(c, cx - 1, top + 13, 4, 1, hex('#8f4a44'));
  } else if (styl === 'kobeni') {
    rect(c, cx - 9, top - 1, 18, 6, cfg.hair);
    rect(c, cx - 9, top + 3, 4, 12, cfg.hair);
    rect(c, cx + 6, top + 3, 4, 12, cfg.hair);
    rect(c, cx - 7, top + 4, 2, 5, cfg.hair);
    rect(c, cx + 5, top + 4, 2, 5, cfg.hair);
    // worried brows
    rect(c, cx - 6, top + 6, 3, 1, shade(cfg.hair, 1.4));
    rect(c, cx + 2, top + 6, 3, 1, shade(cfg.hair, 1.4));
    // tear
    put(c, cx - 6, top + 10, hex('#8fc9e8'));
    rect(c, cx - 2, top + 13, 4, 1, hex('#8f4a44'));
  } else if (styl === 'himeno') {
    rect(c, cx - 8, top - 1, 16, 6, cfg.hair);
    rect(c, cx - 8, top + 4, 3, 13, cfg.hair);
    rect(c, cx + 6, top + 3, 3, 12, cfg.hair);
    rect(c, cx - 7, top + 4, 2, 5, cfg.hair);
    // eyepatch (left eye of viewer)
    rect(c, cx - 6, top + 8, 6, 4, hex('#1c1a20'));
    rect(c, cx - 8, top + 7, 12, 1, hex('#2a2530'));
    // cigarette + smoke
    rect(c, cx + 2, top + 12, 8, 1, hex('#eee6d6'));
    put(c, cx + 10, top + 12, hex('#e2603f'));
    put(c, cx + 11, top + 8, hex('#b9b4ad')); put(c, cx + 12, top + 7, hex('#9a968f'));
    rect(c, cx + 1, top + 14, 3, 1, hex('#8f4a44'));
  } else if (styl === 'beam') {
    // shark head
    rrect(c, cx - 7, top + 1, 15, 15, cfg.skin);
    rect(c, cx - 8, top + 3, 17, 10, cfg.skin);
    // dorsal fin
    line(c, cx, top - 1, cx, top - 9, 3, cfg.hair);
    rect(c, cx - 3, top - 10, 7, 2, cfg.hair);
    rect(c, cx - 4, top - 7, 8, 2, cfg.hair);
    rect(c, cx - 3, top - 4, 8, 2, cfg.hair);
    rect(c, cx - 1, top - 9, 2, 8, tint(cfg.hair, 0.3));
    // mouth + teeth
    rect(c, cx - 5, top + 10, 12, 3, hex('#28222a'));
    for (let x = -4; x < 6; x += 2) rect(c, cx + x, top + 10, 1, 1, hex('#f4efe2'));
    for (let x = -3; x < 6; x += 2) rect(c, cx + x, top + 12, 1, 1, hex('#f4efe2'));
    // eyes
    rect(c, cx - 5, top + 6, 3, 3, hex('#f6f1e4'));
    rect(c, cx - 4, top + 7, 1, 1, hex('#17151c'));
    rect(c, cx + 3, top + 6, 3, 3, hex('#f6f1e4'));
    rect(c, cx + 4, top + 7, 1, 1, hex('#17151c'));
    // gills
    rect(c, cx + 7, top + 8, 1, 4, shade(cfg.skin, 0.75));
    rect(c, cx + 8, top + 8, 1, 3, shade(cfg.skin, 0.75));
    return;
  } else if (styl === 'reze') {
    rect(c, cx - 9, top - 1, 18, 6, cfg.hair);
    rect(c, cx - 9, top + 3, 4, 13, cfg.hair);
    rect(c, cx + 6, top + 3, 4, 13, cfg.hair);
    rect(c, cx - 7, top + 4, 3, 4, cfg.hair);
    rect(c, cx + 4, top + 4, 3, 4, cfg.hair);
    // bomb hair pins
    circle(c, cx - 7, top + 1, 2, cfg.accent);
    put(c, cx - 7, top + 1, hex('#2a2328'));
    circle(c, cx + 6, top + 1, 2, cfg.accent);
    put(c, cx + 6, top + 1, hex('#2a2328'));
    // choker
    rect(c, cx - 6, top + 15, 12, 2, hex('#241f2a'));
  } else if (styl === 'katana') {
    // katana blade head
    rect(c, cx - 2, top - 12, 5, 14, cfg.metal);
    rect(c, cx - 2, top - 12, 1, 14, tint(cfg.metal, 0.35));
    rect(c, cx + 2, top - 12, 1, 14, cfg.metal2);
    // guard + handle
    rect(c, cx - 4, top + 2, 9, 2, cfg.metal2);
    rect(c, cx - 2, top + 4, 4, 4, hex('#241f26'));
    for (let y = top + 4; y < top + 8; y += 2) rect(c, cx - 2, y, 4, 1, cfg.accent);
    // hair sides
    rect(c, cx - 8, top + 4, 2, 7, cfg.hair);
    rect(c, cx + 6, top + 4, 2, 7, cfg.hair);
    // stern eyes
    rect(c, cx - 6, top + 9, 3, 1, hex('#2a2328'));
    rect(c, cx + 3, top + 9, 3, 1, hex('#2a2328'));
    rect(c, cx - 2, top + 13, 4, 1, hex('#7c423d'));
    return;
  } else if (styl === 'quanxi') {
    rect(c, cx - 9, top - 1, 18, 5, cfg.hair);
    rect(c, cx - 10, top + 2, 4, 19, cfg.hair);
    rect(c, cx + 6, top + 2, 4, 17, cfg.hair);
    rect(c, cx - 8, top + 3, 3, 5, cfg.hair);
    rect(c, cx + 5, top + 3, 3, 5, cfg.hair);
    // eyepatch over viewer-left eye
    rect(c, cx - 6, top + 8, 6, 4, hex('#1c1a20'));
    rect(c, cx - 8, top + 7, 12, 1, hex('#302a34'));
    rect(c, cx + 3, top + 9, 2, 2, hex('#2a2328'));
    rect(c, cx - 1, top + 13, 4, 1, hex('#7c423d'));
    return;
  }

  // ---- common face ------------------------------------------------------
  if (styl !== 'makima' && styl !== 'kobeni' && styl !== 'himeno') {
    eye(c, cx, top + 8, -4, 'normal');
    eye(c, cx, top + 8, 3, 'normal');
  }
  if (styl === 'himeno' || styl === 'quanxi') {
    eye(c, cx, top + 8, 3, 'normal');
  }
  if (styl === 'kobeni') {
    eye(c, cx, top + 8, -5, 'wide');
    eye(c, cx, top + 8, 2, 'wide');
  }
  if (styl === 'denji') {
    // cheeky grin
    rect(c, cx - 1, top + 12, 5, 1, hex('#7c423d'));
    put(c, cx + 4, top + 11, hex('#7c423d'));
  } else if (styl !== 'power' && styl !== 'aki' && styl !== 'reze') {
    rect(c, cx - 1, top + 13, 3, 1, hex('#7c423d'));
  }
}

/* ------------------------------------------------------------------ weapon */
function drawWeapon(c, cfg, p, pose) {
  if (!['special', 'ultimate', 'victory'].includes(pose)) return;
  const h = p.handF;
  const hx = h[0], hy = h[1];
  const metal = cfg.metal, light = tint(cfg.metal, 0.4);
  const st = cfg.style;
  if (st === 'denji') {
    const len = pose === 'ultimate' ? 24 : 18;
    rect(c, hx - 3, hy - 4, len, 8, metal);
    rect(c, hx - 3, hy - 4, len, 2, light);
    for (let x = hx; x < hx - 3 + len; x += 4) {
      rect(c, x, hy - 5, 2, 1, light);
      rect(c, x, hy + 4, 2, 1, cfg.metal2);
    }
    rect(c, hx - 1, hy - 1, len - 4, 2, cfg.accent);
    rect(c, hx - 5, hy - 2, 4, 4, cfg.metal2);
  } else if (st === 'power') {
    if (pose === 'special') {
      line(c, hx - 6, hy + 2, hx + 16, hy - 10, 3, shade(cfg.accent, 0.8));
      line(c, hx - 6, hy + 2, hx + 16, hy - 10, 1, tint(cfg.accent, 0.4));
      circle(c, hx + 17, hy - 11, 2, cfg.accent);
    } else {
      rect(c, hx + 1, hy - 12, 9, 20, cfg.accent);
      rect(c, hx + 1, hy - 12, 2, 20, tint(cfg.accent, 0.35));
      rect(c, hx + 8, hy - 12, 2, 20, shade(cfg.accent, 0.7));
      rect(c, hx - 4, hy - 1, 6, 3, cfg.wood);
      for (let y = hy - 9; y < hy + 8; y += 5) put(c, hx + 10, y, tint(cfg.accent, 0.5));
    }
  } else if (st === 'aki' || st === 'quanxi' || st === 'katana') {
    const len = pose === 'ultimate' ? 26 : 21;
    line(c, hx - 4, hy + 2, hx + len, hy - 9, 3, metal);
    line(c, hx - 4, hy + 2, hx + len, hy - 9, 1, light);
    rect(c, hx - 6, hy - 1, 5, 4, hex('#2a2530'));
    rect(c, hx - 7, hy + 1, 2, 2, cfg.accent);
    if (pose === 'ultimate') {
      put(c, hx + len + 2, hy - 11, light);
      put(c, hx + len, hy - 6, cfg.accent);
    }
  } else if (st === 'makima') {
    line(c, hx, hy + 1, hx + 18, hy - 6, 1, cfg.accent);
    circle(c, hx + 19, hy - 6, 2, cfg.accent);
    put(c, hx + 14, hy - 1, tint(cfg.accent, 0.4));
    if (pose === 'ultimate') {
      line(c, hx, hy + 6, hx + 20, hy + 8, 1, cfg.accent);
      circle(c, hx + 21, hy + 8, 2, cfg.accent);
    }
  } else if (st === 'kobeni') {
    rect(c, hx - 1, hy - 1, 11, 3, metal);
    rect(c, hx - 1, hy - 1, 11, 1, light);
    rect(c, hx - 4, hy - 1, 4, 3, hex('#2a2530'));
  } else if (st === 'himeno') {
    // ghost hand
    const gx = hx + 9, gy = hy - 5;
    rrect(c, gx - 3, gy - 2, 9, 9, hex('#c3cbdd'));
    rect(c, gx - 3, gy - 7, 2, 6, hex('#c3cbdd'));
    rect(c, gx, gy - 8, 2, 7, hex('#c3cbdd'));
    rect(c, gx + 3, gy - 7, 2, 6, hex('#c3cbdd'));
    rect(c, gx + 6, gy - 4, 4, 3, hex('#c3cbdd'));
    if (pose === 'ultimate') {
      circle(c, gx + 2, gy + 4, 6, hex('#9aa4c4'), 130);
      for (let i = 0; i < 6; i++) put(c, gx - 6 + i * 3, gy - 10 - (i % 2) * 2, hex('#c3cbdd'), 160);
    }
  } else if (st === 'beam') {
    for (let i = 0; i < 3; i++) {
      line(c, hx + 2, hy + i * 2 - 2, hx + 10, hy + i * 3 - 5, 1, cfg.accent);
      put(c, hx + 10, hy + i * 3 - 5, tint(cfg.accent, 0.5));
    }
  } else if (st === 'reze') {
    circle(c, hx + 9, hy - 1, 4, cfg.accent);
    circle(c, hx + 9, hy - 1, 2, hex('#f6c96a'));
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      put(c, hx + 9 + Math.cos(a) * 8, hy - 1 + Math.sin(a) * 8, hex('#f3b34e'));
    }
  }
}

/* ------------------------------------------------------------- knockdown */
function drawKnockdown(c, cfg, f) {
  if (f < 2) {
    const p = getPose('hurt', 1);
    p.bob = 4 + f * 3;
    p.lean = -6 - f * 2;
    p.hdx = -3;
    p.footB = [25, 73];
    p.footF = [40, 73];
    p.handB = [18, 34];
    p.handF = [33, 30];
    drawStanding(c, cfg, p, 'hurt');
    return;
  }
  // flat on the back
  const skin = cfg.skin, coat = cfg.coat;
  rect(c, 12, 62, 34, 7, cfg.pants);              // legs
  rect(c, 40, 59, 17, 8, cfg.pants);
  rect(c, 54, 59, 7, 7, cfg.shoe);
  rect(c, 18, 56, 24, 12, coat);                  // torso
  rect(c, 22, 58, 6, 9, cfg.shirt);
  rect(c, 30, 57, 20, 2, shade(coat, 0.75));
  rect(c, 16, 52, 6, 5, skin);                    // neck
  rrect(c, 6, 48, 15, 15, skin);                  // head
  rect(c, 4, 46, 15, 5, cfg.hair);                // hair
  rect(c, 4, 49, 3, 8, cfg.hair);
  rect(c, 10, 53, 2, 2, hex('#2a2328'));          // eyes
  rect(c, 14, 53, 2, 2, hex('#2a2328'));
  rect(c, 9, 58, 5, 1, hex('#7c423d'));
  rect(c, 24, 51, 12, 4, coat);                   // arm
  rect(c, 34, 51, 5, 4, skin);
  rect(c, 46, 65, 9, 2, cfg.shoe);                // boots
  rect(c, 21, 68, 3, 1, cfg.accent);
}

/* ------------------------------------------------------------------ render */
function drawStanding(c, cfg, p, pose) {
  const bob = p.bob;
  const hip = [32 + Math.round(p.lean * 0.3), 46 + bob];
  const sh = [32 + p.lean, 28 + bob];
  const head = [32 + p.lean + p.hdx, 12 + bob + p.hdy];

  drawLeg(c, cfg, hip, p.footB, true);
  drawArm(c, cfg, sh, p.handB, true);
  drawTorso(c, cfg, sh, hip);
  drawLeg(c, cfg, hip, p.footF, false);
  drawHead(c, cfg, head[0], head[1]);
  drawArm(c, cfg, sh, p.handF, false);

  if (p.kick) {
    // boot follows the kicking foot
    rect(c, p.footF[0] - 1, p.footF[1] - 2, 8, 5, cfg.shoe);
  }
  if (pose === 'punch' && p.handF[0] > 46) {
    rect(c, p.handF[0] + 2, p.handF[1] - 1, 5, 2, cfg.accent, 140);
  }
  drawWeapon(c, cfg, p, pose);
  if (pose === 'ultimate' && p.handF[1] < 30) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU;
      put(c, 32 + Math.cos(a) * 18, 32 + Math.sin(a) * 24, cfg.accent, 170);
    }
  }
}

function renderCell(cfg, pose, f) {
  const c = cell();
  if (pose === 'knockdown') drawKnockdown(c, cfg, f);
  else drawStanding(c, cfg, getPose(pose, f), pose);
  return finish(c);
}

/* --------------------------------------------------------------------- PNG */
let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function sheetFor(cfg) {
  const w = COLS * CELL_W, h = ROWS * CELL_H;
  const sheet = { w, h, d: new Uint8Array(w * h * 4) };
  for (const [pose, def] of Object.entries(ANIM)) {
    for (let f = 0; f < def.frames; f++) {
      blit(sheet, renderCell(cfg, pose, f), f, def.row);
    }
  }
  return sheet;
}

/* --------------------------------------------------------------------- run */
mkdirSync(OUT, { recursive: true });
const meta = { cell: { w: CELL_W, h: CELL_H }, columns: COLS, anims: ANIM, sheets: {} };

for (const cfg of CHARS) {
  const sheet = sheetFor(cfg);
  const file = cfg.key.toLowerCase().replace(/\s+/g, '-') + '.png';
  writeFileSync(join(OUT, file), encodePNG(sheet.w, sheet.h, sheet.d));
  meta.sheets[cfg.key] = 'assets/sprites/' + file;
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(meta, null, 2));

// QA contact sheet: idle, run, punch, special, ultimate, victory at 2x
const picks = [['idle', 0], ['run', 2], ['punch', 2], ['special', 3], ['ultimate', 4], ['victory', 1]];
const PICK_W = CELL_W * 2, PICK_H = CELL_H * 2;
const pw = picks.length * PICK_W, ph = CHARS.length * PICK_H;
const preview = new Uint8Array(pw * ph * 4);
for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
  const i = (y * pw + x) * 4;
  preview[i] = 26; preview[i + 1] = 25; preview[i + 2] = 30; preview[i + 3] = 255;
}
CHARS.forEach((cfg, row) => {
  picks.forEach(([pose, f], col) => {
    const c = renderCell(cfg, pose, f);
    for (let y = 0; y < CELL_H; y++) for (let x = 0; x < CELL_W; x++) {
      const si = (y * CELL_W + x) * 4;
      if (!c.d[si + 3]) continue;
      for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
        const di = (((row * PICK_H) + y * 2 + yy) * pw + col * PICK_W + x * 2 + xx) * 4;
        preview[di] = c.d[si]; preview[di + 1] = c.d[si + 1];
        preview[di + 2] = c.d[si + 2]; preview[di + 3] = 255;
      }
    }
  });
});
mkdirSync(join(ROOT, 'screenshots'), { recursive: true });
writeFileSync(join(ROOT, 'screenshots', 'sprite-preview.png'), encodePNG(pw, ph, preview));

console.log('Wrote', CHARS.length, 'sheets to', OUT, 'cell', CELL_W + 'x' + CELL_H);
