// Sample history so the reliability and recap features can be tried right away.
import { uid } from './store.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const IRON_ZONE = {
  long: { left: [60, 55], line: [179, 55], right: [298, 55] },
  pin: { left: [50, 190], line: [179, 108], right: [308, 190] },
  short: { left: [60, 315], line: [179, 315], right: [298, 315] },
};

function rangeShot(r, club, kind, q, drill, t) {
  const roll = r();
  let contact = 'solid';
  if (roll > q) {
    const m = r();
    contact = m < 0.3 ? 'thin' : m < 0.5 ? 'chunk' : m < 0.7 ? 'toe' : m < 0.85 ? 'heel' : 'top';
  } else if (r() < 0.35) contact = 'pure';
  const dirRoll = r();
  const col = dirRoll < q * 0.85 ? 'line' : r() < 0.65 ? 'right' : 'left';
  const row = r() < q * 0.8 ? 'pin' : r() < 0.55 ? 'short' : 'long';
  const curve = col === 'right' && r() < 0.5 ? 'fade' : col === 'left' && r() < 0.4 ? 'draw' : null;
  if (kind === 'wood') {
    const wcol = col === 'line' ? 'line' : r() < 0.15 ? (col === 'left' ? 'obL' : 'obR') : col;
    const xs = { obL: 13, left: 68, line: 179, right: 290, obR: 345 };
    const ys = { long: 60, pin: 140, short: 370 };
    return { t, club, type: 'tee', view: 'woods', drill, contact: contact === 'chunk' ? 'thin' : contact, curve,
      finish: { row, col: wcol }, x: xs[wcol] + Math.round((r() - 0.5) * 30), y: ys[row] + Math.round((r() - 0.5) * 40) };
  }
  if (club === '56' || club === '52') {
    const ft = Math.round((2 + (1 - q) * 14 * r() + r() * 4) * 10) / 10;
    const ang = r() * Math.PI * 2;
    const dx = Math.cos(ang) * ft, dy = Math.sin(ang) * ft;
    return { t, club, type: 'pitch', view: 'green', drill, contact, curve: null, carry: null,
      finish: { ft, dx, dy, row: dy > 1.5 ? 'long' : dy < -1.5 ? 'short' : 'pin', col: dx < -1.5 ? 'left' : dx > 1.5 ? 'right' : 'line' },
      x: Math.round(179 + dx * 12), y: Math.round(136 - dy * 12) };
  }
  if (contact === 'chunk') {
    const x = col === 'left' ? 60 : col === 'right' ? 298 : 179;
    return { t, club, type: 'full', view: 'irons', drill, contact, curve: null, finish: { row: 'short', col }, x: x + Math.round((r() - 0.5) * 60), y: 395 };
  }
  const [x, y] = IRON_ZONE[row][col];
  return { t, club, type: 'full', view: 'irons', drill, contact, curve, finish: { row, col }, x: x + Math.round((r() - 0.5) * 50), y: y + Math.round((r() - 0.5) * 30) };
}

export function makeSample() {
  const r = rng(42);
  const day = 86400000;
  const now = Date.now();
  const quality = { D: 0.55, '3W': 0.5, '5H': 0.74, '6i': 0.6, '7i': 0.8, '8i': 0.68, '9i': 0.66, PW: 0.78, '56': 0.6 };
  const plans = [
    { clubs: ['7i', '8i', 'D', 'PW'], drills: ['gate', 'line'] },
    { clubs: ['7i', '5H', 'PW', '56'], drills: ['gate', 'ladder'] },
    { clubs: ['7i', '6i', 'D', '3W', '5H'], drills: ['line', 'fairway'] },
    { clubs: ['7i', '8i', '9i', 'PW', '5H', '56'], drills: ['gate', 'ladder'] },
    { clubs: ['7i', '6i', '9i', 'D', '3W', 'PW', '5H', '8i', '56'], drills: ['fairway', 'gate', 'ladder'] },
  ];
  const sessions = [];
  plans.forEach((p, i) => {
    const start = now - (22 - i * 5) * day;
    const shots = [];
    p.clubs.forEach(c => {
      const kind = c === 'D' || c === '3W' ? 'wood' : 'iron';
      const n = 4 + Math.floor(r() * 4);
      const q = Math.min(0.95, quality[c] + i * 0.02);
      for (let k = 0; k < n; k++) shots.push(rangeShot(r, c, kind, q, p.drills[k % p.drills.length], start + shots.length * 60000));
    });
    sessions.push({ kind: 'range', id: uid(), started: start, ended: start + 3600000, drills: p.drills, shots });
  });
  // putting
  const putts = [];
  for (let k = 0; k < 20; k++) {
    const dist = k < 10 ? 5 : 20 + (k % 3) * 10;
    const made = dist <= 5 ? r() < 0.75 : r() < 0.1;
    const len = r() < 0.7 ? 'short' : 'long';
    const ft = made ? 0 : dist <= 5 ? 1 + r() * 1.5 : 2 + r() * 4;
    const dx = made ? 0 : (r() - 0.35) * ft, dy = made ? 0 : (len === 'long' ? 1 : -1) * Math.sqrt(Math.max(0, ft * ft - dx * dx));
    putts.push({ t: now - 4 * day + k * 60000, drill: dist <= 5 ? 'pgate' : 'pladder', dist, brk: dist <= 5 ? 'straight' : 'right', made,
      ft: Math.round(ft * 10) / 10, dx, dy, side: dx < -0.4 ? 'left' : dx > 0.4 ? 'right' : 'center', len, lowSide: !made && dist > 5 ? dx > 0 : null,
      x: Math.round(179 + dx * 14), y: Math.round(150 - dy * 14) });
  }
  sessions.push({ kind: 'putt', id: uid(), started: now - 4 * day, ended: now - 4 * day + 2400000, drills: ['pgate', 'pladder'], putts });
  // a course round
  const holes = [];
  for (let h = 1; h <= 18; h++) {
    const par = [4, 5, 3, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5, 4][h - 1];
    const shots = [];
    if (par === 3) shots.push({ club: '7i', from: 'tee', result: r() < 0.4 ? 'green' : 'short' });
    else {
      shots.push({ club: 'D', from: 'tee', result: r() < 0.08 ? 'penalty' : r() < 0.5 ? 'fairway' : r() < 0.5 ? 'right' : 'left' });
      if (par === 5) shots.push({ club: '5H', from: 'fairway', result: 'fairway' });
      const res = r() < 0.4 ? 'green' : r() < 0.6 ? 'short' : 'right';
      shots.push({ club: '8i', from: r() < 0.5 ? 'fairway' : 'rough', result: res });
      if (res !== 'green') shots.push({ club: '56', from: 'fringe', result: 'green' });
    }
    holes.push({ n: h, par, yds: null, shots, putts: r() < 0.15 ? 3 : r() < 0.6 ? 2 : 1 });
  }
  sessions.push({ kind: 'course', id: uid(), started: now - 2 * day, ended: now - 2 * day + 4 * 3600000, holes });
  return sessions;
}
