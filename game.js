/* CHAINSAW CLASH — 8-bit arena fighter
   Renders sprite sheets from assets/sprites (64x80 cells, 8 cols x 11 rows). */
(() => {
'use strict';

/* ------------------------------------------------------------------ data */
const ROSTER = [
  { key: 'DENJI',  sheet: 'assets/sprites/denji.png',  role: 'CHAINSAW HYBRID',        desc: 'A reckless kid with a chainsaw for a heart.',      stats: [4, 4, 5] },
  { key: 'POWER',  sheet: 'assets/sprites/power.png',  role: 'BLOOD FIEND',            desc: 'The mighty Power bows to absolutely nobody.',      stats: [4, 5, 4] },
  { key: 'AKI',    sheet: 'assets/sprites/aki.png',    role: 'PUBLIC SAFETY HUNTER',   desc: 'A quiet hunter with a contract to keep.',          stats: [4, 4, 4] },
  { key: 'MAKIMA', sheet: 'assets/sprites/makima.png', role: 'CONTROL DEVIL',          desc: 'A smile that makes the whole room go still.',      stats: [3, 5, 5] },
  { key: 'KOBENI', sheet: 'assets/sprites/kobeni.png', role: 'DEVIL HUNTER',           desc: 'Terrified, fast, and somehow still standing.',     stats: [5, 3, 3] },
  { key: 'HIMENO', sheet: 'assets/sprites/himeno.png', role: 'GHOST DEVIL CONTRACT',   desc: 'A veteran hunter with an unseen ally.',            stats: [3, 4, 4] },
  { key: 'BEAM',   sheet: 'assets/sprites/beam.png',   role: 'SHARK FIEND',            desc: 'The loyal shark fiend is ready to dive in.',       stats: [5, 4, 3] },
  { key: 'REZE',   sheet: 'assets/sprites/reze.png',   role: 'BOMB DEVIL HYBRID',      desc: 'Sweet smile, explosive first impression.',         stats: [4, 5, 4] },
  { key: 'KATANA', sheet: 'assets/sprites/katana.png', role: 'SAMURAI SWORD',          desc: 'A grudge sharpened into a blade.',                stats: [5, 4, 3] },
  { key: 'QUANXI', sheet: 'assets/sprites/quanxi.png', role: 'FIRST DEVIL HUNTER',     desc: 'The fastest hunter in any room she enters.',       stats: [5, 5, 4] }
];

const CELL_W = 64, CELL_H = 80;
const ANIM = {
  idle: { row: 0, frames: 4, fps: 5, loop: true },
  walk: { row: 1, frames: 6, fps: 10, loop: true },
  run: { row: 2, frames: 6, fps: 14, loop: true },
  jump: { row: 3, frames: 2, fps: 2 },
  punch: { row: 4, frames: 4, fps: 18 },
  kick: { row: 5, frames: 4, fps: 16 },
  special: { row: 6, frames: 6, fps: 12 },
  ultimate: { row: 7, frames: 8, fps: 10 },
  hurt: { row: 8, frames: 2, fps: 14 },
  knockdown: { row: 9, frames: 3, fps: 8 },
  victory: { row: 10, frames: 4, fps: 6, loop: true }
};

const MOVES = {
  punch:  { anim: 'punch', dmg: 6,  stun: 12, kb: 1.5, active: [1, 2],  reach: 27, meter: 8,  cost: 0,   stop: 3, sfx: 'hit1' },
  kick:   { anim: 'kick',  dmg: 9,  stun: 16, kb: 2.1, active: [1, 2],  reach: 32, meter: 9,  cost: 0,   stop: 4, sfx: 'hit2' },
  special:{ anim: 'special', dmg: 14, stun: 22, kb: 2.6, active: [3, 4], reach: 40, meter: 6,  cost: 30,  stop: 6, sfx: 'skill' },
  ultimate:{ anim: 'ultimate', dmg: 30, stun: 34, kb: 3.8, active: [4, 5], reach: 56, meter: 0, cost: 100, stop: 10, sfx: 'ult' }
};

const ARENAS = {
  tokyo:  { name: 'TOKYO STREETS', sky: '#2a2130', far: '#4a3646', back: '#38323c', ground: '#272329', accent: '#e54c3b' },
  ruins:  { name: 'DEVIL RUINS',   sky: '#252530', far: '#54464e', back: '#3a3740', ground: '#282830', accent: '#bf5940' },
  office: { name: 'PUBLIC SAFETY', sky: '#272b31', far: '#5b5654', back: '#403e3e', ground: '#2a2b2d', accent: '#d94c3e' },
  forest: { name: 'DARK FOREST',   sky: '#18222a', far: '#274038', back: '#20352e', ground: '#1b2924', accent: '#9b4b42' }
};

const GROUND = 128;
const W = 320, H = 180;

/* ------------------------------------------------------------------ state */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const canvas = $('#gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const SHEETS = {};
const keys = Object.create(null);
const virtual = { left: 0, right: 0, jump: 0, hit: 0, skill: 0, ult: 0 };

let selected = 0;
let mode = 'ai';
let audioOn = true;
let audioCtx = null;
let difficulty = 'normal';
let game = null;
let raf = 0;
let lastT = 0;

/* ------------------------------------------------------------------ audio */
function tone(freq, freq2, dur, type, vol) {
  if (!audioOn) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), now + dur);
    gain.gain.setValueAtTime(vol || 0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + dur);
  } catch (e) { /* ignore */ }
}
function noise(dur, vol) {
  if (!audioOn) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const len = Math.floor(audioCtx.sampleRate * dur);
    const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol || 0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.buffer = buf;
    src.connect(gain).connect(audioCtx.destination);
    src.start(now);
  } catch (e) { /* ignore */ }
}
const SFX = {
  hit1: () => { tone(220, 90, 0.08); noise(0.05, 0.03); },
  hit2: () => { tone(170, 70, 0.11); noise(0.07, 0.04); },
  skill: () => { tone(420, 120, 0.22, 'sawtooth', 0.05); noise(0.12, 0.03); },
  ult: () => { tone(660, 60, 0.45, 'square', 0.07); noise(0.3, 0.04); },
  jump: () => tone(320, 520, 0.08, 'square', 0.05),
  hurt: () => tone(140, 60, 0.12, 'square', 0.05),
  ko: () => { tone(300, 40, 0.6, 'square', 0.07); noise(0.5, 0.04); },
  select: () => tone(520, 720, 0.06, 'square', 0.04),
  start: () => { tone(300, 600, 0.12, 'square', 0.05); setTimeout(() => tone(500, 900, 0.16, 'square', 0.05), 110); }
};
function sfx(name) { (SFX[name] || SFX.hit1)(); }

/* ---------------------------------------------------------------- sprites */
function loadSheets() {
  return Promise.all(ROSTER.map(c => new Promise(res => {
    const img = new Image();
    img.onload = () => { SHEETS[c.key] = img; res(); };
    img.onerror = () => { console.warn('missing sheet', c.sheet); res(); };
    img.src = c.sheet;
  })));
}
function frameIndex(pose, poseT) {
  const a = ANIM[pose] || ANIM.idle;
  let f = Math.floor(poseT * a.fps / 60);
  if (a.loop) f = ((f % a.frames) + a.frames) % a.frames;
  else f = Math.min(a.frames - 1, Math.max(0, f));
  return { a, f };
}
function drawSprite(g, key, pose, poseT, x, y, flip, scale) {
  const img = SHEETS[key];
  const { a, f } = frameIndex(pose, poseT);
  const s = scale || 1;
  const dw = CELL_W * s, dh = CELL_H * s;
  const dx = x - dw / 2, dy = y - (CELL_H - 6) * s;
  g.save();
  if (flip) { g.translate(x * 2, 0); g.scale(-1, 1); }
  if (img) g.drawImage(img, f * CELL_W, a.row * CELL_H, CELL_W, CELL_H, dx, dy, dw, dh);
  else {
    g.fillStyle = '#8a3a30';
    g.fillRect(dx + dw * 0.3, dy + dh * 0.15, dw * 0.4, dh * 0.7);
  }
  g.restore();
}

/* -------------------------------------------------------------------- ui */
const grid = $('#fighterGrid');
const menu = $('#menuScreen');
const gameScreen = $('#gameScreen');

function paintThumb(cv, c, pose, poseT) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  g.imageSmoothingEnabled = false;
  const scale = cv.height / CELL_H;
  drawSprite(g, c.key, pose || 'idle', poseT || 0, cv.width / 2, (CELL_H - 6) * scale, false, scale);
}

function renderRoster() {
  grid.innerHTML = '';
  ROSTER.forEach((c, i) => {
    const card = document.createElement('button');
    card.className = 'fighter-card' + (i === selected ? ' active' : '');
    card.setAttribute('aria-label', c.key);
    card.innerHTML = `<canvas width="64" height="52"></canvas><span>${c.key}</span>`;
    paintThumb(card.querySelector('canvas'), c);
    card.onclick = () => selectFighter(i);
    grid.appendChild(card);
  });
  updateSelected();
}

function updateSelected() {
  const c = ROSTER[selected];
  $$('.fighter-card').forEach((el, i) => el.classList.toggle('active', i === selected));
  $('#fighterName').textContent = c.key;
  $('#fighterRole').textContent = c.role;
  $('#fighterDesc').textContent = c.desc;
  const port = $('#fighterPortrait');
  port.innerHTML = '<canvas width="64" height="64"></canvas>';
  paintThumb(port.firstChild, c);
  $('#fighterStats').innerHTML = ['POWER', 'SPEED', 'SKILL'].map((n, i) =>
    `<div class="stat"><b>${n}</b><div class="stat-bar">${
      [0, 1, 2, 3, 4].map(j => `<i class="pip${j < c.stats[i] ? ' on' : ''}"></i>`).join('')
    }</div></div>`).join('');
  syncEnemyLabel();
}

function selectFighter(i) {
  selected = (i + ROSTER.length) % ROSTER.length;
  updateSelected();
  sfx('select');
}

function syncEnemyLabel() {
  const wrap = $('#p2PickWrap');
  if (!wrap) return;
  wrap.classList.toggle('hidden', mode !== 'local');
  $('#difficulty').disabled = mode === 'local';
  const label = mode === 'local' ? 'PLAYER 02' : 'CPU // ' + difficulty.toUpperCase();
  $('#p2Label').textContent = label;
  const legend = $('#controlLegend');
  if (legend) {
    legend.innerHTML = mode === 'local'
      ? '<span><kbd>A</kbd><kbd>D</kbd> P1 MOVE</span><span><kbd>J</kbd><kbd>K</kbd><kbd>L</kbd> P1 ATTACK</span><span><kbd>←</kbd><kbd>→</kbd> P2 MOVE</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> P2 ATTACK</span>'
      : '<span><kbd>A</kbd><kbd>D</kbd>/<kbd>←</kbd><kbd>→</kbd> MOVE</span><span><kbd>W</kbd> JUMP</span><span><kbd>J</kbd> ATTACK</span><span><kbd>K</kbd> SKILL</span><span><kbd>L</kbd> ULTIMATE</span>';
  }
}

/* ------------------------------------------------------------------ input */
const P1_KEYS = {
  left: ['KeyA'], right: ['KeyD'], jump: ['KeyW', 'Space'],
  hit: ['KeyJ'], skill: ['KeyK'], ult: ['KeyL']
};
const P2_KEYS = {
  left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['ArrowUp'],
  hit: ['Numpad1', 'Digit1'], skill: ['Numpad2', 'Digit2'], ult: ['Numpad3', 'Digit3']
};

function held(i, action) {
  const set = i === 0 ? P1_KEYS : P2_KEYS;
  const codes = set[action] || [];
  for (const code of codes) if (keys[code]) return true;
  // In VS-CPU the first player may also use the arrow keys.
  if (i === 0 && mode === 'ai') {
    const alt = P2_KEYS[action] || [];
    for (const code of alt) if (keys[code]) return true;
  }
  if (i === 0) {
    if (action === 'left' && virtual.left) return true;
    if (action === 'right' && virtual.right) return true;
    if (action === 'jump' && virtual.jump) return true;
    if (action === 'hit' && virtual.hit) return true;
    if (action === 'skill' && virtual.skill) return true;
    if (action === 'ult' && virtual.ult) return true;
  }
  return false;
}

/* --------------------------------------------------------------- fighters */
function makeFighter(id, x, dir) {
  return {
    id, c: ROSTER[id],
    x, y: GROUND, vx: 0, vy: 0, dir,
    hp: 100, meter: 0,
    pose: 'idle', poseT: 0,
    move: null, moveT: 0, hitDone: false,
    cool: 0, stun: 0, getUp: 0, knock: false,
    grounded: true, chain: 0, chainWindow: 0,
    prev: {}, aiTimer: 0, aiJump: 0, combo: 0, comboT: 0
  };
}

function startMove(p, name) {
  const m = MOVES[name];
  if (!m || p.cool > 0 || p.stun > 0) return false;
  if (m.cost && p.meter < m.cost) return false;
  if (name === 'punch' || name === 'kick') {
    if (!p.grounded) return false;
  }
  if (m.cost) p.meter -= m.cost;
  p.move = m; p.moveName = name; p.moveT = 0; p.hitDone = false;
  p.chainWindow = 0;
  p.pose = m.anim; p.poseT = 0;
  const total = Math.round(ANIM[m.anim].frames * 60 / ANIM[m.anim].fps);
  p.cool = total + (name === 'ultimate' ? 12 : 4);
  if (name === 'special') { p.vx = p.dir * 2.4; sfx('skill'); }
  if (name === 'ultimate') { game.flash = 1; sfx('ult'); }
  return true;
}

function activeBox(p) {
  const m = p.move;
  if (!m) return null;
  const f = Math.floor(p.moveT * ANIM[m.anim].fps / 60);
  if (f < m.active[0] || f > m.active[1]) return null;
  const near = p.x + p.dir * 6;
  const far = p.x + p.dir * m.reach;
  const lo = Math.min(near, far), hi = Math.max(near, far);
  return { lo, hi, top: p.y - 62, bottom: p.y - 6, m };
}

function applyHit(att, def, m) {
  def.hp = Math.max(0, def.hp - m.dmg);
  def.stun = m.stun;
  def.vx = att.dir * m.kb;
  def.vy = m.kb > 3 ? -3.2 : -1.2;
  def.grounded = false;
  def.pose = m.dmg >= 25 ? 'knockdown' : 'hurt';
  def.poseT = 0;
  def.knock = m.dmg >= 25 && def.hp > 0;
  def.move = null;
  att.meter = Math.min(100, att.meter + m.meter);
  def.meter = Math.min(100, def.meter + 6);
  sfx(m.sfx);
  if (m.dmg >= 25) { def.getUp = 40; game.shake = 8; game.flash = 0.8; }
  att.combo++; att.comboT = 70;
  if (att.combo > 1) $('#comboReadout').textContent = att.combo + ' HIT COMBO';
  spawnSparks(def.x, def.y - 34, att.c.key === 'BEAM' ? '#7fdcf0' : '#f8cb62', m.dmg >= 25 ? 22 : 12);
  if (def.hp <= 0) {
    def.pose = 'knockdown'; def.poseT = 1.2; def.stun = 999; def.knock = true;
    setTimeout(() => endMatch(att), 400);
  }
}

function spawnSparks(x, y, color, n) {
  if (!game) return;
  const palette = [color, '#f5e6c4', '#e8523d', '#ffffff'];
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 18,
      y: y + (Math.random() - 0.5) * 26,
      vx: (Math.random() - 0.5) * 3.4,
      vy: -Math.random() * 2.4 - 0.4,
      life: 16 + Math.random() * 16,
      max: 32,
      col: palette[i % palette.length],
      size: 1 + (Math.random() < 0.4 ? 1 : 0)
    });
  }
}

/* ------------------------------------------------------------------- game */
function startMatch() {
  const arena = ARENAS[$('#arena').value];
  $('#arenaName').textContent = arena.name;
  const p1 = selected;
  let p2;
  if (mode === 'local') p2 = parseInt($('#p2Fighter').value, 10) || 0;
  else p2 = (p1 + 1 + Math.floor(Math.random() * (ROSTER.length - 1))) % ROSTER.length;
  $('#p1Name').textContent = ROSTER[p1].key;
  $('#p2Name').textContent = ROSTER[p2].key;
  syncEnemyLabel();

  menu.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  $('#resultOverlay').classList.add('hidden');
  $('#pauseOverlay').classList.add('hidden');
  $('#comboReadout').textContent = '';

  game = {
    players: [makeFighter(p1, 88, 1), makeFighter(p2, 232, -1)],
    arena: $('#arena').value,
    time: 99,
    active: true,
    paused: false,
    ended: false,
    particles: [],
    shake: 0,
    flash: 0,
    hitstop: 0,
    banner: 1.6
  };
  $('#fightBanner').textContent = 'FIGHT!';
  $('#fightBanner').style.opacity = 1;
  sfx('start');
  lastT = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
  $('#pauseButton').textContent = 'Ⅱ PAUSE';
}

function endMatch(winner) {
  if (!game || game.ended) return;
  game.ended = true;
  game.active = false;
  const w = winner || game.players[game.players[0].hp >= game.players[1].hp ? 0 : 1];
  const loser = game.players.find(p => p !== w);
  w.pose = 'victory'; w.poseT = 0; w.vx = 0; w.stun = 0;
  if (loser && loser.hp <= 0) { loser.pose = 'knockdown'; loser.poseT = 1.4; }
  sfx('ko');
  $('#winnerName').textContent = w.c.key + ' WINS';
  $('.result-ko').textContent = winner ? 'K.O.' : 'TIME UP';
  $('#resultMessage').textContent = winner
    ? `${w.c.key} is the last hunter standing.`
    : `Time up — ${w.c.key} leads on health.`;
  const cv = $('#resultSprite');
  if (cv) paintThumb(cv, w.c, 'victory', 0.25);
  $('#resultOverlay').classList.remove('hidden');
  draw();
}

function togglePause() {
  if (!game || game.ended) return;
  game.paused = !game.paused;
  $('#pauseOverlay').classList.toggle('hidden', !game.paused);
  if (!game.paused) { lastT = performance.now(); raf = requestAnimationFrame(loop); }
}

/* --------------------------------------------------------------------- ai */
function aiControl(p, foe, dt) {
  const cfg = {
    easy:   { speed: 1.05, aggro: 0.22, react: 40, jump: 0.004, skill: 0.18 },
    normal: { speed: 1.6,  aggro: 0.40, react: 24, jump: 0.006, skill: 0.38 },
    hard:   { speed: 2.1,  aggro: 0.68, react: 11, jump: 0.010, skill: 0.65 }
  }[difficulty];

  const dist = foe.x - p.x;
  const abs = Math.abs(dist);
  p.aiTimer -= dt;
  p.aiJump -= dt;

  if (p.stun > 0 || p.move) return;

  // spacing logic
  if (abs > 46) {
    p.vx += Math.sign(dist) * 0.5 * dt;
    if (p.aiJump <= 0 && Math.random() < cfg.jump) { p.vy = -6.2; p.grounded = false; p.aiJump = 60; sfx('jump'); }
  } else if (abs > 30) {
    if (Math.random() < cfg.aggro) p.vx += Math.sign(dist) * 0.5 * dt;
    else p.vx -= Math.sign(dist) * 0.25 * dt;
  } else {
    p.vx *= Math.pow(0.72, dt);
    if (p.aiTimer <= 0) {
      p.aiTimer = cfg.react + Math.random() * 16;
      const r = Math.random();
      // show mercy so the player can recover from a combo
      if (foe.stun > 6 && Math.random() < 0.6) {
        p.vx -= Math.sign(dist) * 0.3 * dt;
      } else if (p.meter >= 100 && r < 0.5) startMove(p, 'ultimate');
      else if (p.meter >= 30 && r < cfg.skill) startMove(p, 'special');
      else if (r < cfg.aggro + 0.35) startMove(p, Math.random() < 0.7 ? 'punch' : 'kick');
    }
  }
  const cap = cfg.speed;
  p.vx = Math.max(-cap, Math.min(cap, p.vx));
}

/* ----------------------------------------------------------------- update */
function handleHuman(p, i, dt) {
  const left = held(i, 'left'), right = held(i, 'right');
  if (left && !right) { p.vx -= 0.55 * dt; p.dir = -1; }
  else if (right && !left) { p.vx += 0.55 * dt; p.dir = 1; }
  else p.vx *= Math.pow(0.74, dt);

  const jumping = held(i, 'jump');
  if (jumping && p.grounded && !p.prev.jump) { p.vy = -6.2; p.grounded = false; sfx('jump'); }
  p.prev.jump = jumping;

  const hit = held(i, 'hit');
  const skill = held(i, 'skill');
  const ult = held(i, 'ult');
  if (hit && !p.prev.hit && !p.move) {
    if (p.chainWindow > 0) { p.chainWindow = 0; startMove(p, 'kick'); }
    else startMove(p, 'punch');
  }
  if (skill && !p.prev.skill && !p.move) startMove(p, 'special');
  if (ult && !p.prev.ult && !p.move) startMove(p, 'ultimate');
  p.prev.hit = hit; p.prev.skill = skill; p.prev.ult = ult;
}

function updatePlayer(p, foe, i, dt) {
  p.poseT += dt;
  if (p.cool > 0) p.cool = Math.max(0, p.cool - dt);
  if (p.chainWindow > 0) p.chainWindow = Math.max(0, p.chainWindow - dt);
  if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; }

  if (p.stun > 0) {
    p.stun -= dt;
    p.move = null;
    if (p.getUp > 0) { p.getUp -= dt; if (p.getUp <= 0) { p.pose = 'idle'; p.poseT = 0; p.knock = false; } }
    else if (p.knock) { p.pose = 'knockdown'; }
    else if (p.stun <= 0) { p.pose = 'idle'; p.poseT = 0; }
  } else {
    const human = i === 0 || mode === 'local';
    if (human) handleHuman(p, i, dt);
    else aiControl(p, foe, dt);

    if (p.move) {
      p.moveT += dt;
      const box = activeBox(p);
      if (box && !p.hitDone) {
        const foeLo = foe.x - 13, foeHi = foe.x + 13;
        if (foeHi > box.lo && foeLo < box.hi &&
            foe.y > box.top - 6 && foe.y - 62 < box.bottom) {
          p.hitDone = true;
          applyHit(p, foe, box.m);
          game.hitstop = box.m.stop;
          game.shake = Math.max(game.shake, box.m.stop * 0.6);
        }
      }
      const total = ANIM[p.move.anim].frames * 60 / ANIM[p.move.anim].fps;
      if (p.moveT >= total) {
        if (p.moveName === 'punch') { p.chainWindow = 16; p.chain = 1; }
        else if (p.moveName === 'kick') { p.chainWindow = 0; }
        p.move = null; p.moveName = null; p.pose = 'idle'; p.poseT = 0;
      }
    }
  }

  // physics
  p.x += p.vx * dt;
  p.vy += 0.42 * dt;
  p.y += p.vy * dt;
  if (p.y >= GROUND) { p.y = GROUND; if (!p.grounded) p.grounded = true; p.vy = 0; }
  p.x = Math.max(18, Math.min(W - 18, p.x));

  // friction
  if (!p.move || p.moveName === 'punch' || p.moveName === 'kick') p.vx *= Math.pow(0.9, dt);

  // pose when idle
  if (!p.move && p.stun <= 0 && !p.knock) {
    const prevPose = p.pose;
    if (!p.grounded) p.pose = 'jump';
    else if (Math.abs(p.vx) > 1.7) p.pose = 'run';
    else if (Math.abs(p.vx) > 0.35) p.pose = 'walk';
    else p.pose = 'idle';
    if (p.pose !== prevPose && !ANIM[p.pose].loop) p.poseT = 0;
  }

  // auto-face the opponent while neutral
  if (!p.move && p.stun <= 0) p.dir = foe.x >= p.x ? 1 : -1;
}

function pushApart(a, b) {
  const min = 32;
  const d = b.x - a.x;
  if (Math.abs(d) < min) {
    const push = (min - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
    a.x -= push; b.x += push;
    a.x = Math.max(18, Math.min(W - 18, a.x));
    b.x = Math.max(18, Math.min(W - 18, b.x));
  }
}

function update(dt) {
  if (!game || !game.active || game.paused) return;
  if (game.banner > 0) {
    game.banner -= dt / 60;
    $('#fightBanner').style.opacity = Math.max(0, Math.min(1, game.banner));
    if (game.banner <= 0) $('#fightBanner').textContent = '';
  }
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 0.05);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 0.5);

  if (game.hitstop > 0) {
    game.hitstop -= dt;
  } else {
    game.time -= dt / 60;
    if (game.time <= 0) { game.time = 0; endMatch(null); return; }
    updatePlayer(game.players[0], game.players[1], 0, dt);
    updatePlayer(game.players[1], game.players[0], 1, dt);
    pushApart(game.players[0], game.players[1]);
  }

  $('#timer').textContent = String(Math.max(0, Math.ceil(game.time))).padStart(2, '0');
  $('#p1Health').style.width = game.players[0].hp + '%';
  $('#p2Health').style.width = game.players[1].hp + '%';
  $('#p1Meter').style.width = game.players[0].meter + '%';
  $('#p2Meter').style.width = game.players[1].meter + '%';
  if (game.players[0].comboT <= 0 && game.players[1].comboT <= 0) $('#comboReadout').textContent = '';

  for (const e of game.particles) {
    e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 0.1 * dt; e.life -= dt;
  }
  game.particles = game.particles.filter(e => e.life > 0);
}

/* ------------------------------------------------------------------- draw */
function drawArena() {
  const g = ctx;
  const key = game ? game.arena : 'tokyo';
  const ar = ARENAS[key];
  const grad = g.createLinearGradient(0, 0, 0, GROUND);
  grad.addColorStop(0, ar.sky);
  grad.addColorStop(1, ar.far);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // moon / sun disc
  g.fillStyle = 'rgba(240,90,70,0.55)';
  g.beginPath(); g.arc(244, 40, 22, 0, Math.PI * 2); g.fill();

  if (key === 'forest') {
    for (let i = 0; i < 13; i++) {
      const x = i * 26;
      g.fillStyle = i % 2 ? '#20342d' : '#2a3c35';
      g.fillRect(x + 7, 26, 9, 96);
      g.fillRect(x - 2, 34, 26, 8);
      g.fillRect(x + 1, 46, 22, 7);
      g.fillRect(x - 4, 58, 30, 6);
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const x = i * 34 - 6;
      const w = 24 + (i * 17 % 20);
      const h = 34 + (i * 23 % 44);
      g.fillStyle = i % 2 ? '#38343c' : '#423a3f';
      g.fillRect(x, 116 - h, w, h);
      for (let wy = 122 - h; wy < 112; wy += 10) {
        for (let wx = x + 3; wx < x + w - 3; wx += 8) {
          g.fillStyle = (wx + wy + i) % 3 ? '#c08e63' : '#e8b96a';
          g.fillRect(wx, wy, 3, 4);
        }
      }
      if (key === 'office' && i === 5) {
        g.fillStyle = '#c1453d';
        g.fillRect(x + 4, 120 - h, w - 8, 8);
      }
    }
  }

  // skyline band + ground
  g.fillStyle = ar.back;
  g.fillRect(0, 116, W, 12);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? '#464149' : '#3a373f';
    g.fillRect(i * 64 - 12, 111, 40, 12);
  }
  g.fillStyle = ar.ground;
  g.fillRect(0, GROUND, W, H - GROUND);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(0, GROUND, W, 1);
  g.fillStyle = ar.accent;
  g.globalAlpha = 0.75;
  g.fillRect(0, GROUND + 1, W, 1);
  g.globalAlpha = 1;
  for (let i = 0; i < 18; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.18)';
    g.fillRect((i * 41 + 7) % W, GROUND + 8 + (i * 13 % 36), 9, 1);
  }
}

function draw() {
  if (!game) return;
  const g = ctx;
  const sh = game.shake;
  g.save();
  if (sh > 0) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  drawArena();

  // fighters — far one first
  const order = [...game.players].sort((a, b) => a.y - b.y);
  for (const p of order) {
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.32)';
    const sw = 22 * Math.max(0.4, 1 - (GROUND - p.y) / 90);
    g.beginPath();
    g.ellipse(p.x, GROUND + 2, sw, 4, 0, 0, Math.PI * 2);
    g.fill();
    if (p.meter >= 100 && p.pose !== 'knockdown') {
      g.fillStyle = 'rgba(248,203,98,0.28)';
      g.beginPath(); g.ellipse(p.x, p.y - 30, 20, 32, 0, 0, Math.PI * 2); g.fill();
    }
    drawSprite(g, p.c.key, p.pose, p.poseT, p.x, p.y, p.dir < 0, 1);
  }

  for (const e of game.particles) {
    g.globalAlpha = Math.max(0, e.life / e.max);
    g.fillStyle = e.col;
    g.fillRect(Math.floor(e.x), Math.floor(e.y), e.size, e.size);
  }
  g.globalAlpha = 1;
  g.restore();

  if (game.flash > 0) {
    g.fillStyle = `rgba(255,240,220,${Math.min(0.6, game.flash * 0.5)})`;
    g.fillRect(0, 0, W, H);
  }
}

function loop(t) {
  if (!game || game.ended) return;
  const dt = Math.min(2.4, (t - lastT) / 16.67 || 1);
  lastT = t;
  if (!game.paused) { update(dt); draw(); }
  raf = requestAnimationFrame(loop);
}

/* ------------------------------------------------------------------- menu */
function menuLoop() {
  const hero = $('#heroCanvas');
  if (hero && !menu.classList.contains('hidden')) {
    const g = hero.getContext('2d');
    g.clearRect(0, 0, hero.width, hero.height);
    g.imageSmoothingEnabled = false;
    const scale = 3.4;
    drawSprite(g, ROSTER[selected].key, 'idle', performance.now() / 1000, hero.width / 2, hero.height - 22, false, scale);
    requestAnimationFrame(menuLoop);
  } else if (hero) {
    requestAnimationFrame(menuLoop);
  }
}

/* ------------------------------------------------------------------ wiring */
function populateP2Select() {
  const sel = $('#p2Fighter');
  if (!sel) return;
  sel.innerHTML = ROSTER.map((c, i) => `<option value="${i}">${c.key}</option>`).join('');
  sel.value = '1';
}

$$('.segmented button').forEach(b => b.onclick = () => {
  $$('.segmented button').forEach(x => x.classList.toggle('selected', x === b));
  mode = b.dataset.mode;
  syncEnemyLabel();
});
$('#difficulty').onchange = () => { difficulty = $('#difficulty').value; syncEnemyLabel(); };
$('#prevChar').onclick = () => selectFighter(selected - 1);
$('#nextChar').onclick = () => selectFighter(selected + 1);

$('#startButton').onclick = () => { if (SHEETS[ROSTER[0].key]) startMatch(); };
$('#backButton').onclick = () => { game = null; gameScreen.classList.add('hidden'); menu.classList.remove('hidden'); };
$('#rematchButton').onclick = startMatch;
$('#menuButton').onclick = () => $('#backButton').click();
$('#pauseButton').onclick = togglePause;
$('#resumeButton').onclick = togglePause;
$('#quitButton').onclick = () => { if (game) { game.paused = false; $('#pauseOverlay').classList.add('hidden'); } $('#backButton').click(); };

$('#soundToggle').onclick = () => {
  audioOn = !audioOn;
  $('#soundToggle span').textContent = audioOn ? 'SOUND ON' : 'SOUND OFF';
};

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.code === 'Escape') togglePause();
}, { passive: false });
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

$$('.touch-controls button').forEach(b => {
  const action = b.dataset.action;
  const on = e => { e.preventDefault(); virtual[action] = 1; };
  const off = e => { e.preventDefault(); virtual[action] = 0; };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointerleave', off);
  b.addEventListener('pointercancel', off);
});

// tap the fight screen to pause on touch devices
canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') /* let controls handle */ e.preventDefault(); });

window.__CC__ = { state: () => game, keys, start: startMatch, setSelected: selectFighter };

/* -------------------------------------------------------------------- boot */
populateP2Select();
renderRoster();
loadSheets().then(() => {
  renderRoster();
  $('#startButton').classList.add('ready');
});
requestAnimationFrame(menuLoop);
})();
