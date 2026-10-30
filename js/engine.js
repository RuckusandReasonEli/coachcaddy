// Coach Caddy logic: shot wording, recaps, club reliability and caddy recommendations.
import { SURFACES, SLOPES, TEMP_YDS_PER_10F, ELEVATION_PCT_PER_1000FT, DIFFICULTY, RELIABILITY, RANGE_DRILLS, PUTT_DRILLS, SHOT_TYPES, BASIC, CLOCK } from './data.js';

const SOLID = new Set(['pure', 'solid']);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

// ---------- shot wording ----------

const CONTACT_WORD = { pure: 'Pure', solid: 'Solid', thin: 'Thin', top: 'Topped', heel: 'Heel', toe: 'Toe', shank: 'Shank', under: 'Under it', skied: 'Skied', chunk: 'Chunk' };

// Length (row) and direction (col) are each optional, so every combination reads naturally.
export function finishWords(s) {
  if (!s.finish) return '';
  const f = s.finish, r = f.row || null, c = f.col || null;
  if (s.view === 'green') {
    if (f.holed) return 'holed it';
    const where = [r && r !== 'pin' ? r : '', c && c !== 'line' ? c : ''].filter(Boolean).join(' ');
    if (f.ft != null) return `${Math.max(1, Math.round(f.ft))} ft${where ? ', ' + where : ''}`;
    if (where) return where;
    return r === 'pin' && c === 'line' ? 'on target' : r === 'pin' ? 'pin high' : c === 'line' ? 'on line' : '';
  }
  if (s.view === 'woods') {
    const col = c ? { obL: 'OB left', obR: 'OB right', left: 'left rough', right: 'right rough', line: 'fairway' }[c] : '';
    const len = r === 'long' ? 'long' : r === 'short' ? 'short' : '';
    return [len, col].filter(Boolean).join(', ') || (r === 'pin' ? 'normal length' : '');
  }
  if (r && c) {
    if (r === 'pin' && c === 'line') return 'on target';
    if (r === 'pin') return c;
    if (c === 'line') return r;
    return `${r} ${c}`;
  }
  if (r) return r === 'pin' ? 'pin high' : r;
  if (c) return c === 'line' ? 'on line' : c;
  return '';
}

export function describeShot(s) {
  const parts = s.contact ? [CONTACT_WORD[s.contact] || cap(s.contact)] : [];
  const fin = finishWords(s);
  if (fin) parts.push(fin);
  if (s.curve && s.curve !== 'none') parts.push(s.curve);
  if (s.height) parts.push(s.height);
  if (s.carry) parts.push(`${s.carry} yds`);
  return parts.length ? cap(parts.join(' · ')) : 'No details';
}

function dirOf(s) {
  if (!s.finish || !s.finish.col) return null;
  const c = s.finish.col;
  return c === 'obL' ? 'left' : c === 'obR' ? 'right' : c;
}

// ---------- range recap ----------

const PATTERNS = [
  { id: 'lowpoint', test: t => t.share('chunk') >= 0.15 && t.share('thin', 'top') >= 0.15,
    say: 'Chunks and thins together usually mean the low point is moving around.', drills: ['line', 'feet'], science: 'lowpoint' },
  { id: 'lifting', test: t => t.share('thin', 'top') >= 0.3,
    say: 'Thin and topped strikes often point to lifting through impact.', drills: ['ninethree', 'pause'], science: 'lowpoint' },
  { id: 'open', test: t => t.dir('right') >= 0.4 || t.curveShare('fade', 'slice') >= 0.3,
    say: 'Misses to the right often point to a face open to the path.', drills: ['gate', 'split'], science: 'facepath' },
  { id: 'closed', test: t => t.dir('left') >= 0.4 && t.curveShare('draw', 'hook') >= 0.2,
    say: 'Misses that curve left often point to a face closed to the path.', drills: ['gate', 'align'], science: 'facepath' },
  { id: 'pull', test: t => t.dir('left') >= 0.4,
    say: 'Straight misses left usually mean aim or path is pointing left.', drills: ['align', 'gate'], science: 'flight' },
  { id: 'heel', test: t => t.share('heel', 'shank') >= 0.25,
    say: 'Heel strikes often come from the hands drifting toward the ball.', drills: ['feet', 'spray'], science: 'flight' },
  { id: 'toe', test: t => t.share('toe') >= 0.25,
    say: 'Toe strikes often come from standing up or reaching.', drills: ['feet', 'spray'], science: 'flight' },
  { id: 'gap', test: t => t.solid >= 0.65 && (t.row('long') + t.row('short')) >= 0.45,
    say: 'Contact is good; distances are scattered, so gapping is the next job.', drills: ['ladder', 'gapping'], science: 'flight' },
];

// Each measure only counts shots where it was recorded (contact, length and direction are all optional).
function tally(shots) {
  const n = shots.length || 1;
  const withC = shots.filter(s => s.contact);
  const nc = withC.length || 1;
  const count = (...keys) => withC.filter(s => keys.includes(s.contact)).length;
  const withDir = shots.filter(s => s.finish && s.finish.col);
  const withRow = shots.filter(s => s.finish && s.finish.row);
  return {
    n: shots.length,
    solid: withC.length ? withC.filter(s => SOLID.has(s.contact)).length / nc : null,
    share: (...keys) => count(...keys) / nc,
    count,
    dir: d => withDir.filter(s => dirOf(s) === d).length / (withDir.length || 1),
    dirCount: d => withDir.filter(s => dirOf(s) === d).length,
    row: r => withRow.filter(s => s.finish.row === r).length / (withRow.length || 1),
    curveShare: (...c) => shots.filter(s => c.includes(s.curve)).length / n,
  };
}

function goalHit(s) {
  const solid = SOLID.has(s.contact || 'solid');
  switch (s.type) {
    case 'tee': return s.finish && s.finish.col === 'line';
    case 'draw': return s.curve === 'draw';
    case 'fade': return s.curve === 'fade';
    case 'punch': return s.height === 'low' && solid;
    case 'high': return s.height === 'high' && s.finish && s.finish.col === 'line';
    case 'pitch': return s.finish && (s.finish.holed || s.finish.ft <= 10);
    case 'chip': return s.finish && (s.finish.holed || s.finish.ft <= 6);
    case 'three': return s.carry != null;
    default: return solid && s.finish && s.finish.col === 'line';
  }
}

export function rangeRecap(session, bag) {
  const shots = session.shots || [];
  if (!shots.length) return { empty: true, headline: 'No balls logged', lines: [], drills: [] };
  const t = tally(shots);
  const solidPct = t.solid == null ? null : Math.round(t.solid * 100);
  const lines = [];

  // main club and trend
  const byClub = {};
  shots.forEach(s => { (byClub[s.club] = byClub[s.club] || []).push(s); });
  const clubIds = Object.keys(byClub).sort((a, b) => byClub[b].length - byClub[a].length);
  const main = clubIds[0];
  const mainName = (bag.find(c => c.id === main) || {}).name || main;
  const ms = byClub[main];
  if (ms.length >= 8) {
    const half = Math.floor(ms.length / 2);
    const a = tally(ms.slice(0, half)).solid, b = tally(ms.slice(half)).solid;
    if (a == null || b == null) { /* not enough contact data */ }
    else if (b - a >= 0.15) lines.push(`Your ${mainName} got steadier in the back half.`);
    else if (a - b >= 0.15) lines.push(`Your ${mainName} slipped late; fatigue or rushing are common causes.`);
  }

  // biggest misses
  const missContacts = ['thin', 'top', 'chunk', 'heel', 'toe', 'shank', 'under', 'skied']
    .map(k => [k, t.count(k)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const dirs = ['left', 'right'].map(d => [d, t.dirCount(d)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const missBits = [];
  if (missContacts[0] && missContacts[0][1] >= 2) missBits.push(`${CONTACT_WORD[missContacts[0][0]].toLowerCase()} (${missContacts[0][1]})`);
  if (dirs[0] && dirs[0][1] >= 2) missBits.push(`${dirs[0][0]} (${dirs[0][1]})`);
  if (missBits.length) lines.push(`Misses leaned ${missBits.join(' and ')}.`);

  // pattern read
  const enough = shots.length >= 6;
  const hit = enough ? PATTERNS.find(p => p.test(t)) : null;
  const cause = hit ? hit.say : (solidPct >= 70 ? 'Strike and start line held up well. Keep the same feel.' : 'Not enough of one pattern yet to call a cause. Keep logging.');

  // drills for next time
  let drills = hit ? hit.drills.slice() : [];
  if (!drills.length) drills = solidPct >= 70 ? ['play9', 'onedist'] : ['line', 'gate'];
  const missClubs = clubIds.filter(id => { const s = tally(byClub[id]).solid; return s != null && s < 0.7; }).slice(0, 2);
  const focusClubs = (missClubs.length ? missClubs : [main]).map(id => (bag.find(c => c.id === id) || {}).name || id);

  // shot goals
  const goals = {};
  shots.forEach(s => {
    if (!s.type || s.type === 'full') return;
    const g = goals[s.type] = goals[s.type] || { type: s.type, n: 0, hits: 0 };
    g.n++; if (goalHit(s)) g.hits++;
  });

  return {
    headline: solidPct == null ? `${shots.length} ball${shots.length === 1 ? '' : 's'} logged` : `${solidPct}% solid contact`,
    solidPct, lines, cause, drills, focusClubs,
    science: hit ? hit.science : 'flight',
    dirs: { left: t.dirCount('left'), line: t.dirCount('line'), right: t.dirCount('right') },
    goals: Object.values(goals).map(g => ({ ...g, name: (SHOT_TYPES.find(x => x.id === g.type) || {}).name })),
    mainClub: main,
  };
}

// ---------- putting recap ----------

export function puttRecap(session) {
  const p = session.putts || [];
  if (!p.length) return { empty: true, headline: 'No putts logged', lines: [], drills: [] };
  const short = p.filter(x => x.dist <= 8), long = p.filter(x => x.dist >= 15);
  const madeShort = short.filter(x => x.made).length;
  const lShort = long.filter(x => !x.made && x.len === 'short').length;
  const lLong = long.filter(x => !x.made && x.len === 'long').length;
  const lMade = long.filter(x => x.made).length;
  const breaking = p.filter(x => !x.made && x.brk !== 'straight');
  const low = breaking.filter(x => x.lowSide).length;
  const shortMiss = short.filter(x => !x.made);
  const leftMiss = shortMiss.filter(x => x.side === 'left').length, rightMiss = shortMiss.filter(x => x.side === 'right').length;

  let headline, drills, focus;
  if (long.length >= 3 && lShort / long.length >= 0.5) {
    headline = 'Speed is the gap'; drills = ['pladder', 'plag']; focus = 'speed';
  } else if (long.length >= 3 && lLong / long.length >= 0.5) {
    headline = 'Coming in hot'; drills = ['pladder', 'peyes']; focus = 'speed';
  } else if (shortMiss.length >= 3 && Math.max(leftMiss, rightMiss) / shortMiss.length >= 0.6) {
    headline = 'Start line is the gap'; drills = ['pgate', 'plead']; focus = 'line';
  } else if (breaking.length >= 3 && low / breaking.length >= 0.6) {
    headline = 'Play more break'; drills = ['pworld', 'pchalk']; focus = 'break';
  } else {
    headline = 'Solid rolling'; drills = ['par18', 'pclock']; focus = 'keep';
  }
  const lines = [];
  if (long.length) lines.push(`From 15 ft and out, ${lShort} of ${long.length} finished short and ${lLong} long${breaking.length ? `, ${low} of ${breaking.length} breaking misses on the low side` : ''}.`);
  if (short.length) lines.push(`Inside 8 ft you made ${madeShort} of ${short.length}.${shortMiss.length >= 3 ? ` Misses: ${leftMiss} left, ${rightMiss} right.` : ''}`);
  return { headline, lines, drills, focus, long: { short: lShort, long: lLong, made: lMade, n: long.length } };
}

// ---------- course recap ----------

export function courseRecap(session) {
  const holes = (session.holes || []).filter(h => h.shots.length || h.putts);
  if (!holes.length) return { empty: true, headline: 'No holes logged', lines: [], buckets: [] };
  let pens = 0, teeMiss = 0, missedGreens = 0, missedShort = 0, failedUD = 0, three = 0, totalPutts = 0, strokes = 0;
  holes.forEach(h => {
    totalPutts += h.putts || 0;
    strokes += h.shots.length + (h.putts || 0) + h.shots.filter(s => s.result === 'penalty').length;
    if ((h.putts || 0) >= 3) three++;
    h.shots.forEach((s, i) => {
      if (s.result === 'penalty') { if (i === 0) pens++; }
      if (i === 0 && h.par > 3 && (s.result === 'left' || s.result === 'right')) teeMiss++;
      const approach = s.result !== 'fairway' && ((i === 0 && h.par === 3) || (i > 0 && ['fairway', 'rough', 'sand'].includes(s.from)));
      if (approach && !['green', 'holed'].includes(s.result)) { missedGreens++; if (s.result === 'short') missedShort++; }
    });
    if (h.shots.some(s => s.from === 'fringe') && (h.putts || 0) >= 2) failedUD++;
  });
  const buckets = [
    { id: 'approach', name: 'Approach', n: missedGreens, w: missedGreens, unit: 'miss' },
    { id: 'putting', name: 'Putting', n: three, w: three * 1.5, unit: '3-putt' },
    { id: 'tee', name: 'Off the tee', n: pens, w: pens * 1.5 + teeMiss * 0.4, unit: 'pen' },
    { id: 'short', name: 'Short game', n: failedUD, w: failedUD, unit: 'fail' },
  ].sort((a, b) => b.w - a.w);
  const leak = buckets[0];
  const plan = {
    approach: { range: ['gapping', 'ladder'], putt: ['pladder'] },
    putting: { range: ['play9'], putt: ['pladder', 'plag'] },
    tee: { range: ['fairway', 'gate'], putt: ['pclock'] },
    short: { range: ['ladder', 'clock'], putt: ['pclock'] },
  }[leak.id];
  const headline = leak.w === 0 ? 'Clean round' : `${leak.name} cost you most`;
  const lines = [];
  if (missedGreens) lines.push(`You missed ${missedGreens} greens on approach${missedShort ? `, ${missedShort} of them short` : ''}.`);
  if (pens) lines.push(`${pens} tee shot${pens > 1 ? 's' : ''} found a penalty area.`);
  if (three) lines.push(`${three} three-putt${three > 1 ? 's' : ''}, ${totalPutts} putts in all.`);
  return { headline, lines, buckets, plan, strokes, holes: holes.length };
}

// ---------- reliability ----------

// Contact, direction and distance each come only from shots where that was recorded.
// Missing parts drop out and the remaining weights are rescaled; no data at all returns null.
function sessionClubScore(shots) {
  const W = RELIABILITY.weights;
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const contact = avg(shots.filter(s => s.contact).map(s => SOLID.has(s.contact) ? 1 : (s.contact === 'heel' || s.contact === 'toe') ? 0.5 : 0));
  const lineVals = shots.filter(s => s.finish).map(s => {
    const f = s.finish;
    if (s.view === 'green' && f.dx != null) return Math.abs(f.dx) <= 3 ? 1 : 0;
    return f.col ? (f.col === 'line' ? 1 : 0) : null;
  }).filter(v => v != null);
  const line = avg(lineVals);
  const targeted = shots.filter(s => s.carry != null && s.target != null);
  const carries = shots.filter(s => s.target == null).map(s => s.carry).filter(c => c != null);
  let dist;
  if (targeted.length >= 3) {
    dist = targeted.filter(s => Math.abs(s.carry - s.target) <= 5).length / targeted.length;
  } else if (carries.length >= 3) {
    const mean = carries.reduce((a, b) => a + b, 0) / carries.length;
    const sd = Math.sqrt(carries.reduce((a, b) => a + (b - mean) ** 2, 0) / carries.length);
    dist = Math.max(0, Math.min(1, 1 - sd / (0.06 * mean)));
  } else {
    dist = avg(shots.filter(s => s.finish).map(s => {
      const f = s.finish;
      if (s.view === 'green' && f.dy != null) return Math.abs(f.dy) <= 3 ? 1 : 0;
      return f.row ? (f.row === 'pin' ? 1 : 0) : null;
    }).filter(v => v != null));
  }
  const parts = [[W.contact, contact], [W.direction, line], [W.distance, dist]].filter(([, v]) => v != null);
  if (!parts.length) return null;
  return 100 * parts.reduce((a, [w, v]) => a + w * v, 0) / parts.reduce((a, [w]) => a + w, 0);
}

export function reliability(state) {
  const R = RELIABILITY;
  const range = state.sessions.filter(s => s.kind === 'range').sort((a, b) => b.ended - a.ended);
  const perClub = {};
  const all = [];
  range.forEach((sess, idx) => {
    const by = {};
    (sess.shots || []).forEach(s => { (by[s.club] = by[s.club] || []).push(s); });
    Object.entries(by).forEach(([id, shots]) => {
      if (shots.length < R.minShotsPerSession) return;
      const score = sessionClubScore(shots);
      if (score == null) return;
      (perClub[id] = perClub[id] || []).push(score);
      all.push({ score, w: Math.pow(R.recencyDecay, idx) });
    });
  });
  const overall = all.length ? all.reduce((a, x) => a + x.score * x.w, 0) / all.reduce((a, x) => a + x.w, 0) : 0;
  const out = {};
  state.bag.forEach(c => {
    const list = perClub[c.id] || [];
    if (list.length < R.sessionsRequired) { out[c.id] = { locked: true, sessions: list.length }; return; }
    let num = 0, den = 0;
    list.forEach((sc, i) => { const w = Math.pow(R.recencyDecay, i); num += sc * w; den += w; });
    const raw = num / den;
    const score = Math.max(1, Math.min(99, Math.round(50 + (raw - overall) * R.spread)));
    out[c.id] = { locked: false, sessions: list.length, raw: Math.round(raw), score };
  });
  const outOfBag = new Set(state.bag.filter(c => c.out).map(c => c.id));
  const ranked = Object.entries(out).filter(([id, v]) => !v.locked && !outOfBag.has(id)).sort((a, b) => b[1].score - a[1].score);
  ranked.slice(0, 3).forEach(([id]) => { out[id].top = true; });
  const rangeCount = range.length;
  return { clubs: out, anyUnlocked: ranked.length > 0, rangeSessions: rangeCount, overall: Math.round(overall) };
}

// ---------- caddy ----------

export function adjustedCarry(club, cond, choke) {
  const base = choke ? club.choked : club.carry;
  const temp = ((cond.temp - 70) / 10) * (TEMP_YDS_PER_10F[club.kind] || 1.6);
  const elev = base * ELEVATION_PCT_PER_1000FT * ((cond.elev || 0) / 1000);
  return Math.round(base + temp + elev);
}

export function recommend(state, rel) {
  const cond = state.conditions, cad = state.caddy, hand = state.hand;
  const sf = SURFACES[cad.surface] || SURFACES.fairway;
  const sl = SLOPES[cad.slope] || SLOPES.flat;
  const choke = !!(sl.choke || sf.choke);
  const slopeYds = sl.yds ? sl.yds[cad.steep ? 1 : 0] : 0;
  const playsLike = cad.target + (sf.yds || 0) + slopeYds;
  const excluded = c => (sf.exclude || []).some(x => x === c.kind || x === c.id) || (c.id === 'D' && cad.target < 220);
  const eligible = state.bag.filter(c => !c.out && !excluded(c)).map(c => ({ c, adj: adjustedCarry(c, cond, choke), r: rel.clubs[c.id] }))
    .filter(x => !sf.maxCarry || x.c.carry <= sf.maxCarry)
    .sort((a, b) => a.adj - b.adj);

  let pick = eligible.find(x => x.adj >= playsLike - 2);
  let reason = '';
  if (!pick) {
    pick = eligible[eligible.length - 1];
    reason = `Nothing in the bag reaches ${playsLike}. Advance it and leave a full wedge.`;
  } else {
    const window = eligible.filter(x => x.adj >= playsLike - 2 && x.adj <= playsLike + 12 && x.r && !x.r.locked);
    if (window.length >= 2) {
      const best = window.slice().sort((a, b) => b.r.score - a.r.score)[0];
      if (best.c.id !== pick.c.id && (!pick.r || pick.r.locked || best.r.score - pick.r.score >= 8)) {
        reason = `Picked over ${pick.c.name}${choke ? ' choked' : ''} (${pick.adj}): reliability ${best.r.score} vs ${pick.r && !pick.r.locked ? pick.r.score : 'not scored yet'}.`;
        pick = best;
      }
    }
    if (!reason) reason = pick.r && !pick.r.locked
      ? `${pick.c.name} carries ${pick.adj} today. Reliability ${pick.r.score}${pick.r.top ? ', one of your most reliable' : ''}.`
      : `${pick.c.name} carries ${pick.adj} today. Reliability unlocks after 3 practice sessions with it.`;
  }

  const mirror = d => hand === 'left' ? (d === 'left' ? 'right' : 'left') : d;
  const aim = sl.aim ? `Aim a few yds ${mirror(sl.aim)}.` : 'Aim at your target.';
  const swing = (cad.steep || cad.surface === 'deep') ? 'About 80% swing, balance first.' : cad.slope === 'above' ? 'Flatter swing.' : 'Stock swing.';
  const setup = [sf.setup, sl.setup].filter(Boolean).join(' ') || 'Normal setup.';
  const watch = [sf.watch, sl.flight].filter(Boolean).join(' ');
  const notes = [];
  if (cond.moisture === 'wet') notes.push('Wet: play to carry, little roll.');
  if (cond.moisture === 'dry') notes.push('Firm: expect extra roll; land it short.');
  notes.push(DIFFICULTY[cond.difficulty] || '');
  const evidence = (cad.surface === 'fairway' && cad.slope === 'flat') ? 'Measured data' : 'Coach consensus';
  return { pick, playsLike, choke, aim, swing, setup, watch, reason, notes: notes.filter(Boolean), evidence, eligible };
}

export function tempSummary(cond) {
  const d = Math.round(((cond.temp - 70) / 10) * 1.6);
  if (Math.abs(d) < 1) return 'carries normal';
  return `carries ${d > 0 ? '+' : '−'}${Math.abs(d)} yds`;
}

export function drillById(id) {
  if (id === BASIC.id) return BASIC;
  return RANGE_DRILLS.find(d => d.id === id) || PUTT_DRILLS.find(d => d.id === id);
}

// ---------- drill scores (v0.3 trackers) ----------
const mean = xs => Math.round(xs.reduce((a, s) => a + s.carry, 0) / xs.length);

// One line per drill in a session, in the drill's own terms.
export function drillScores(sess) {
  const by = {};
  (sess.shots || []).forEach(s => { (by[s.drill] = by[s.drill] || []).push(s); });
  const out = [];
  Object.entries(by).forEach(([id, shots]) => {
    const d = drillById(id);
    if (!d || id === BASIC.id) return;
    const tr = d.tracker || 'full';
    const before = out.length;
    if (tr === 'full' && d.score) {
      const ans = shots.filter(s => s.check != null);
      if (ans.length) out.push({ name: d.name, value: `${d.score}: ${ans.filter(s => s.check).length} of ${ans.length}` });
    } else if (tr === 'carry') {
      const c = shots.filter(s => s.carry != null && s.target != null);
      if (!c.length) return;
      if (d.mode === 'clock') {
        const parts = CLOCK.map(L => { const xs = c.filter(s => s.swing === L.id); return xs.length ? `${L.name} ${mean(xs)} yds` : null; }).filter(Boolean);
        out.push({ name: d.name, value: `Average carry · ${parts.join(' · ')}` });
      } else if (d.mode === 'grip') {
        const f = c.filter(s => s.grip === 'full'), k = c.filter(s => s.grip === 'choked');
        out.push({ name: d.name, value: `Full ${f.length ? mean(f) : '–'} · choked ${k.length ? mean(k) : '–'}${f.length && k.length ? ` · gap ${mean(f) - mean(k)} yds` : ''}` });
      } else {
        out.push({ name: d.name, value: `Within 5 yds: ${c.filter(s => Math.abs(s.carry - s.target) <= 5).length} of ${c.length}` });
      }
    } else if (tr === 'shape') {
      const g = shots.filter(s => s.got);
      if (g.length) out.push({ name: d.name, value: d.mode === 'punch' ? `Stayed low: ${g.filter(s => s.got.h === 'low').length} of ${g.length}` : `Shapes matched: ${g.filter(s => s.matched).length} of ${g.length}` });
    } else if (tr === 'strike') {
      const f = shots.filter(s => s.face);
      const n = h => f.filter(s => s.face.h === h).length;
      if (f.length) out.push({ name: d.name, value: `Center ${n('center')} · heel ${n('heel')} · toe ${n('toe')} of ${f.length}` });
    } else if (tr === 'play9') {
      const fw = shots.filter(s => s.phase === 'tee' && s.finish && s.finish.col);
      const gr = shots.filter(s => s.phase === 'approach' && s.finish);
      out.push({ name: d.name, value: `Fairways ${fw.filter(s => s.finish.col === 'line').length} of ${fw.length} · greens ${gr.filter(s => s.finish.row === 'pin' && s.finish.col === 'line').length} of ${gr.length}` });
    } else if (tr === 'full' && d.detail && d.detail.target.m === 'fairway') {
      const f = shots.filter(s => s.finish && s.finish.col);
      if (f.length) out.push({ name: d.name, value: `In the fairway: ${f.filter(s => s.finish.col === 'line').length} of ${f.length}` });
    }
    const tg = drillTarget(d, shots);
    if (out.length > before) out[out.length - 1].target = tg;
  });
  return out;
}

// Drill target: how many shots met the drill's goal (see details.js) and whether the target was met.
// status: met | not | few (too few balls logged to judge).
export function drillTarget(d, shots) {
  const t = d && d.detail && d.detail.target;
  if (!t) return null;
  let pool = [], hit = 0;
  const within = (xs, key) => { const g = {}; xs.forEach(s => { (g[s[key]] = g[s[key]] || []).push(s); });
    return Object.values(g).filter(a => a.length >= 2).flatMap(a => { const m = a.reduce((x, s) => x + s.carry, 0) / a.length; return a.map(s => Math.abs(s.carry - m) <= 5); }); };
  switch (t.m) {
    case 'check': pool = shots.filter(s => s.check != null); hit = pool.filter(s => s.check).length; break;
    case 'fairway': pool = shots.filter(s => s.finish && s.finish.col); hit = pool.filter(s => s.finish.col === 'line').length; break;
    case 'within5': pool = shots.filter(s => s.carry != null && s.target != null); hit = pool.filter(s => Math.abs(s.carry - s.target) <= 5).length; break;
    case 'repeat5': { const c = shots.filter(s => s.carry != null); const r = within(c, d.mode === 'grip' ? 'grip' : 'swing'); pool = r; hit = r.filter(Boolean).length; break; }
    case 'low': pool = shots.filter(s => s.got); hit = pool.filter(s => s.got.h === 'low').length; break;
    case 'matched': pool = shots.filter(s => s.got); hit = pool.filter(s => s.matched).length; break;
    case 'center': pool = shots.filter(s => s.face); hit = pool.filter(s => s.face.h === 'center').length; break;
    case 'p9': { const fw = shots.filter(s => s.phase === 'tee' && s.finish && s.finish.col), gr = shots.filter(s => s.phase === 'approach' && s.finish);
      pool = fw.concat(gr); hit = fw.filter(s => s.finish.col === 'line').length + gr.filter(s => s.finish.row === 'pin' && s.finish.col === 'line').length; break; }
    case 'made': pool = shots; hit = shots.filter(s => s.made).length; break;
    case 'close3': pool = shots; hit = shots.filter(s => s.made || (s.ft != null && s.ft <= 3)).length; break;
    case 'online': pool = shots; hit = shots.filter(s => s.made || s.side === 'center').length; break;
  }
  const n = pool.length;
  const status = n < Math.ceil(t.of / 2) ? 'few' : hit / n >= t.n / t.of - 1e-9 ? 'met' : 'not';
  return { hit, n, status, text: t.text };
}
export function targetWords(r) {
  if (!r) return '';
  return r.status === 'met' ? `Target met · ${r.text}` : r.status === 'not' ? `Not yet · target ${r.text}` : `Target ${r.text} · log more to judge`;
}

// Putting drill scores: made, and the drill target.
export function puttDrillScores(sess) {
  const by = {};
  (sess.putts || []).forEach(p => { (by[p.drill] = by[p.drill] || []).push(p); });
  return Object.entries(by).map(([id, ps]) => {
    const d = drillById(id);
    if (!d) return null;
    const close = ps.filter(p => p.made || (p.ft != null && p.ft <= 3)).length;
    return { name: d.name, value: `Made ${ps.filter(p => p.made).length} of ${ps.length}${close > ps.filter(p => p.made).length ? ` · ${close} holed or inside 3 ft` : ""}`, target: drillTarget(d, ps) };
  }).filter(Boolean);
}

// Per-club summary for a session: balls, solid contact and which way the misses lean.
export function clubTable(sess, bag) {
  const by = {};
  (sess.shots || []).forEach(s => { (by[s.club] = by[s.club] || []).push(s); });
  return Object.entries(by).map(([id, shots]) => {
    const withC = shots.filter(s => s.contact);
    const solid = withC.length ? Math.round(withC.filter(s => SOLID.has(s.contact)).length / withC.length * 100) : null;
    const l = shots.filter(s => s.finish && ['left', 'obL'].includes(s.finish.col)).length;
    const r = shots.filter(s => s.finish && ['right', 'obR'].includes(s.finish.col)).length;
    const lean = l >= 2 && l > r ? 'left' : r >= 2 && r > l ? 'right' : '';
    const c = bag.find(b => b.id === id);
    return { id, name: c ? c.name : id, carry: c ? c.carry : 0, n: shots.length, solid, lean };
  }).sort((a, b) => b.carry - a.carry);
}

// Choke-down gapping: once a club has 3 of each grip, offer its averages for My bag.
export function gapSuggest(sess, bag) {
  const g = (sess.shots || []).filter(s => s.drill === 'gapping' && s.carry != null);
  const by = {};
  g.forEach(s => { (by[s.club] = by[s.club] || []).push(s); });
  return Object.entries(by).map(([id, xs]) => {
    const f = xs.filter(s => s.grip === 'full'), k = xs.filter(s => s.grip === 'choked');
    if (f.length < 3 || k.length < 3) return null;
    const c = bag.find(b => b.id === id);
    return c ? { id, name: c.name, full: mean(f), choked: mean(k), was: [c.carry, c.choked] } : null;
  }).filter(Boolean);
}
