// Coach Caddy logic: shot wording, recaps, club reliability and caddy recommendations.
import { SURFACES, SLOPES, TEMP_YDS_PER_10F, ELEVATION_PCT_PER_1000FT, DIFFICULTY, RELIABILITY, RANGE_DRILLS, PUTT_DRILLS, SHOT_TYPES } from './data.js';

const SOLID = new Set(['pure', 'solid']);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;

// ---------- shot wording ----------

const CONTACT_WORD = { pure: 'Pure', solid: 'Solid', thin: 'Thin', top: 'Topped', heel: 'Heel', toe: 'Toe', shank: 'Shank', under: 'Under it', skied: 'Skied', chunk: 'Chunk' };

export function finishWords(s) {
  if (!s.finish) return '';
  const f = s.finish;
  if (s.view === 'green') {
    if (f.holed) return 'holed it';
    const where = [f.row !== 'pin' ? f.row : '', f.col !== 'line' ? f.col : ''].filter(Boolean).join(' ');
    return `${Math.max(1, Math.round(f.ft))} ft${where ? ', ' + where : ''}`;
  }
  if (s.view === 'woods') {
    const col = { obL: 'OB left', obR: 'OB right', left: 'left rough', right: 'right rough', line: 'fairway' }[f.col];
    return (f.row === 'long' ? 'long, ' : f.row === 'short' ? 'short, ' : '') + col;
  }
  if (f.row === 'pin' && f.col === 'line') return 'on target';
  if (f.row === 'pin') return f.col;
  if (f.col === 'line') return f.row;
  return `${f.row} ${f.col}`;
}

export function describeShot(s) {
  const parts = [CONTACT_WORD[s.contact] || 'Solid'];
  const fin = finishWords(s);
  if (fin) parts.push(fin);
  if (s.curve && s.curve !== 'none') parts.push(s.curve);
  if (s.height) parts.push(s.height);
  if (s.carry) parts.push(`${s.carry} yds`);
  return parts.join(' · ');
}

function dirOf(s) {
  if (!s.finish) return null;
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

function tally(shots) {
  const n = shots.length || 1;
  const count = (...keys) => shots.filter(s => keys.includes(s.contact)).length;
  const withFin = shots.filter(s => s.finish);
  const nf = withFin.length || 1;
  return {
    n: shots.length,
    solid: shots.filter(s => SOLID.has(s.contact || 'solid')).length / n,
    share: (...keys) => count(...keys) / n,
    count,
    dir: d => withFin.filter(s => dirOf(s) === d).length / nf,
    dirCount: d => withFin.filter(s => dirOf(s) === d).length,
    row: r => withFin.filter(s => s.finish.row === r).length / nf,
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
  const solidPct = Math.round(t.solid * 100);
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
    if (b - a >= 0.15) lines.push(`Your ${mainName} got steadier in the back half.`);
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
  const missClubs = clubIds.filter(id => tally(byClub[id]).solid < 0.7).slice(0, 2);
  const focusClubs = (missClubs.length ? missClubs : [main]).map(id => (bag.find(c => c.id === id) || {}).name || id);

  // shot goals
  const goals = {};
  shots.forEach(s => {
    if (!s.type || s.type === 'full') return;
    const g = goals[s.type] = goals[s.type] || { type: s.type, n: 0, hits: 0 };
    g.n++; if (goalHit(s)) g.hits++;
  });

  return {
    headline: `${solidPct}% solid contact`,
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

function sessionClubScore(shots) {
  const W = RELIABILITY.weights;
  const n = shots.length;
  const contact = shots.reduce((a, s) => a + (SOLID.has(s.contact || 'solid') ? 1 : (s.contact === 'heel' || s.contact === 'toe') ? 0.5 : 0), 0) / n;
  const fin = shots.filter(s => s.finish);
  const nf = fin.length || 1;
  const line = fin.filter(s => s.view === 'green' ? Math.abs(s.finish.dx || 0) <= 3 : s.finish.col === 'line').length / nf;
  const carries = shots.map(s => s.carry).filter(c => c != null);
  let dist;
  if (carries.length >= 3) {
    const mean = carries.reduce((a, b) => a + b, 0) / carries.length;
    const sd = Math.sqrt(carries.reduce((a, b) => a + (b - mean) ** 2, 0) / carries.length);
    dist = Math.max(0, Math.min(1, 1 - sd / (0.06 * mean)));
  } else {
    dist = fin.filter(s => s.view === 'green' ? Math.abs(s.finish.dy || 0) <= 3 : s.finish.row === 'pin').length / nf;
  }
  return 100 * (W.contact * contact + W.direction * line + W.distance * dist);
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
  const ranked = Object.entries(out).filter(([, v]) => !v.locked).sort((a, b) => b[1].score - a[1].score);
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
  const eligible = state.bag.filter(c => !excluded(c)).map(c => ({ c, adj: adjustedCarry(c, cond, choke), r: rel.clubs[c.id] }))
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
  return RANGE_DRILLS.find(d => d.id === id) || PUTT_DRILLS.find(d => d.id === id);
}
