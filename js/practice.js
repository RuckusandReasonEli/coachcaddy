// v0.8 practice logic: two-metric drill tracking, drill and skill scores, the baseline,
// drill recommendations and drill impact. No screen code here, so any front end (the phone
// today, a Watch companion later) can log through the same functions.
import { RANGE_DRILLS, PUTT_DRILLS } from './data.js';
import { drillById, drillTarget } from './engine.js';

// ---------- one question per ball ----------
// yes / no: [button label, small line under it]. kind picks the Good, Okay, Poor wording.
export const TALLY = {
  line:      { q: 'Which did the club hit first?', hint: 'Look at the divot against the line.', yes: ['Ball first', 'divot after the line'], no: ['Turf first', 'divot before the line'], kind: 'contact',
               rate: { good: 'Crisp every time. Ball first, divot after the line.', okay: 'Mostly solid, a few thin or heavy.', poor: 'Still hitting behind it.' } },
  feet:      { q: 'Did you hold the finish?', hint: 'Count two seconds on the lead foot.', yes: ['Held the finish', 'balanced 2 seconds'], no: ['Lost balance', 'stepped or wobbled'], kind: 'contact' },
  ninethree: { q: 'Where did it start?', hint: 'Watch the first few yards of flight.', yes: ['Started on line', 'at the target'], no: ['Started off line', 'a push or a pull'], kind: 'direction' },
  pause:     { q: 'Did you hold the pause?', hint: 'A clear stop at the top, then go.', yes: ['Held the pause', 'clear stop at the top'], no: ['Rushed it', 'no real stop'], kind: 'contact' },
  spray:     { q: 'Where is the mark on the face?', hint: 'Check the spray after each ball.', yes: ['Center', 'middle of the face'], no: ['Heel or toe', 'off the center'], kind: 'contact' },
  align:     { q: 'Did your setup match the sticks?', hint: 'Feet, hips and shoulders parallel to the stick.', yes: ['Matched the sticks', 'square to the line'], no: ['Off the sticks', 'open or closed'], kind: 'direction' },
  slomo:     { q: 'Same tempo at full speed?', hint: 'Keep the slow-motion rhythm.', yes: ['Kept the tempo', 'smooth and even'], no: ['Sped up', 'rushed from the top'], kind: 'contact' },
  gate:      { q: 'Clean through the gate?', hint: 'The club passes between the tees.', yes: ['Clean through', 'no tee touched'], no: ['Hit a gate', 'touched a tee'], kind: 'direction' },
  split:     { q: 'Did the club come from the inside?', hint: 'The divot points at or left of the target.', yes: ['From the inside', 'divot on line'], no: ['Over the top', 'divot points left'], kind: 'direction' },
  ladder:    { q: 'Within 5 yards of the target?', hint: 'Use the flags or a rangefinder.', yes: ['Within 5 yds', 'on the number'], no: ['Outside 5 yds', 'long or short'], kind: 'distance' },
  clock:     { q: 'Within 5 yards of the target?', hint: 'Same backswing, same carry.', yes: ['Within 5 yds', 'on the number'], no: ['Outside 5 yds', 'long or short'], kind: 'distance' },
  gapping:   { q: 'Within 5 yards of your number?', hint: 'Full grip, then choked down 1 inch.', yes: ['Within 5 of stock', 'on your number'], no: ['Outside', 'long or short'], kind: 'distance' },
  onedist:   { q: 'Within 5 yards of the target?', hint: 'One flag, three different clubs.', yes: ['Within 5 yds', 'on the number'], no: ['Outside 5 yds', 'long or short'], kind: 'distance' },
  fairway:   { q: 'In the fairway?', hint: 'Pick two flags as the edges.', yes: ['In the fairway', 'between the flags'], no: ['Missed it', 'left or right'], kind: 'direction' },
  punch:     { q: 'Did it stay low?', hint: 'Under a tree branch, running out.', yes: ['Stayed low', 'flat and running'], no: ['Ballooned', 'climbed too high'], kind: 'shape' },
  nine:      { q: 'Did the shape match?', hint: 'Compare the flight with the shape above.', yes: ['Shape matched', 'height and curve'], no: ['Didn’t match', 'height or curve off'], kind: 'shape' },
  play9:     { q: 'Did it hit the target?', hint: 'The fairway on tee shots, the green on approaches.', yes: ['Hit the target', 'fairway or green'], no: ['Missed it', 'off the target'], kind: 'shape' },
  routine:   { q: 'Full routine, no step-off?', hint: 'Same steps, same timing, every ball.', yes: ['Full routine', 'committed'], no: ['Skipped a step', 'or stepped off'], kind: 'shape' },
  pgate:     { q: 'Through the gate?', hint: 'Two tees just wider than the ball.', yes: ['Through the gate', 'clean start'], no: ['Hit a tee', 'off the line'], kind: 'putting' },
  pchalk:    { q: 'Did it roll on the line?', hint: 'Watch the first two feet.', yes: ['Rolled the line', 'on the chalk'], no: ['Off the line', 'left or right'], kind: 'putting' },
  plead:     { q: 'Made it?', hint: 'Lead hand only.', yes: ['Made', 'in the hole'], no: ['Missed', 'stayed out'], kind: 'putting' },
  pclock:    { q: 'Made it?', hint: 'Every putt from 3 ft around the hole.', yes: ['Made', 'in the hole'], no: ['Missed', 'stayed out'], kind: 'putting' },
  p369:      { q: 'Made it?', hint: 'Full routine on every putt.', yes: ['Made', 'in the hole'], no: ['Missed', 'stayed out'], kind: 'putting' },
  pworld:    { q: 'Made it?', hint: 'Read each putt before you hit it.', yes: ['Made', 'in the hole'], no: ['Missed', 'stayed out'], kind: 'putting' },
  pladder:   { q: 'Inside 3 feet?', hint: 'A holed putt counts too.', yes: ['Inside 3 ft', 'or holed'], no: ['Outside 3 ft', 'long or short'], kind: 'putting' },
  plag:      { q: 'Inside 3 feet?', hint: 'A holed putt counts too.', yes: ['Inside 3 ft', 'or holed'], no: ['Outside 3 ft', 'long or short'], kind: 'putting' },
  peyes:     { q: 'Inside 3 feet?', hint: 'Guess first, then look.', yes: ['Inside 3 ft', 'or holed'], no: ['Outside 3 ft', 'long or short'], kind: 'putting' },
  par18:     { q: 'Down in two?', hint: 'Chip or putt, then hole out.', yes: ['Down in 2', 'par saved'], no: ['3 or more', 'a dropped shot'], kind: 'putting' },
};
export const tallyFor = id => TALLY[id] || { q: 'Did it work?', hint: '', yes: ['Yes', ''], no: ['No', ''], kind: 'contact' };

// ---------- one rating per drill ----------
export const RATE_WORDS = {
  contact:   { good: 'Crisp every time.', okay: 'Mostly solid, a few thin or heavy.', poor: 'Still missing the strike.' },
  direction: { good: 'Starting where I aimed.', okay: 'Mostly on line, a few pushes or pulls.', poor: 'Can’t control the start line yet.' },
  distance:  { good: 'Landing on my numbers.', okay: 'Close, a few long or short.', poor: 'Distances all over.' },
  shape:     { good: 'Shots on command.', okay: 'Some good, some misses.', poor: 'Not there yet.' },
  putting:   { good: 'Rolling it on line and pace.', okay: 'Mostly good, a few off.', poor: 'Fighting line or speed.' },
};
export const rateWords = id => { const t = tallyFor(id); return { ...RATE_WORDS[t.kind], ...(t.rate || {}) }; };

// ---------- scores ----------
export const SCORE = { count: 0.7, feel: 0.3, feelVal: { good: 100, okay: 60, poor: 20 }, solid: 75, building: 50, fade: 0.85 };
export const bandOf = s => s >= SCORE.solid ? 'Solid' : s >= SCORE.building ? 'Building' : 'Not yet';
export function drillScore(hit, n, rating) {
  if (!n) return null;
  const rate = hit / n * 100;
  const f = SCORE.feelVal[rating];
  const score = Math.round(f == null ? rate : SCORE.count * rate + SCORE.feel * f);
  let flag = null;
  if (rating === 'good' && rate < 50) flag = 'Felt good, the count says otherwise. Check what you are looking for.';
  if (rating === 'poor' && rate >= 80) flag = 'The count says solid. Trust it.';
  return { score, band: bandOf(score), rate: Math.round(rate), hit, n, rating: f == null ? null : rating, flag };
}

const entriesOf = (sess, id) => ((sess.kind === 'putt' ? sess.putts : sess.shots) || []).filter(x => x.drill === id);
// One drill's result in one session: two-button entries, or older detailed entries through the drill's target.
export function drillResult(sess, id) {
  const d = drillById(id);
  const xs = entriesOf(sess, id);
  if (!d || !xs.length) return null;
  const tal = xs.filter(x => x.tally);
  let hit, n;
  if (tal.length) { hit = tal.filter(x => x.hit).length; n = tal.length; }
  else { const tg = drillTarget(d, xs); if (!tg || !tg.n) return null; hit = tg.hit; n = tg.n; }
  const r = drillScore(hit, n, (sess.ratings || {})[id]);
  const t = d.detail && d.detail.target;
  r.met = t ? hit / n >= t.n / t.of - 1e-9 && n >= Math.ceil(t.of / 2) : null;
  r.target = t ? t.text : '';
  r.drill = d; r.tally = !!tal.length;
  return r;
}
export function sessionDrills(sess) {
  const ids = [...new Set(((sess.kind === 'putt' ? sess.putts : sess.shots) || []).map(x => x.drill))].filter(id => id !== 'basic');
  return ids.map(id => drillResult(sess, id)).filter(Boolean);
}

// Skill = what a drill trains (its "trains" label). Score: recent drill scores, each older session counting 15% less.
export function skillTrend(state, skill, extra) {
  const sess = state.sessions.filter(s => s.kind === 'range' || s.kind === 'putt').concat(extra ? [extra] : []);
  const pts = [];
  sess.forEach(s => sessionDrills(s).forEach(r => { if (r.drill.trains === skill) pts.push({ t: s.ended || Date.now(), score: r.score }); }));
  return pts.sort((a, b) => a.t - b.t);
}
export function skillScore(points) {
  if (!points.length) return null;
  let num = 0, den = 0;
  points.slice().reverse().forEach((p, i) => { const w = Math.pow(SCORE.fade, i); num += p.score * w; den += w; });
  return Math.round(num / den);
}

// ---------- the baseline ----------
// The wedge is the pitching wedge (or the nearest wedge in the bag), always a full swing.
export const BASELINE = [
  { id: 'free', name: 'Free', n: 10 },
  { id: 'wedge', name: 'Wedge', n: 5, club: 'PW', kind: 'wedge', type: 'full', title: 'Pitching wedge · full swing' },
  { id: 'iron', name: '7-iron', n: 5, club: '7i', kind: 'iron', type: 'full', title: '7-iron · full swing' },
  { id: 'driver', name: 'Driver', n: 5, club: 'D', kind: 'wood', type: 'tee', title: 'Driver · at a fairway between two flags' },
];
// Pick the stage's club from the bag, falling back to the nearest of the same kind.
export function stageClub(stage, bag) {
  const inb = bag.filter(c => !c.out);
  const exact = inb.find(c => c.id === stage.club);
  if (exact) return exact.id;
  const same = inb.filter(c => c.kind === stage.kind || (stage.kind === 'wood' && c.kind === 'hybrid'));
  return (stage.kind === 'wood' ? same.sort((a, b) => b.carry - a.carry)[0] : same[0] || inb[0]).id;
}

export const SKILLS = {
  contact: 'Contact', strike: 'Strike spot', startLine: 'Start line', path: 'Path',
  wedgeDist: 'Wedge distance', driverFw: 'Driver fairways', transfer: 'Transfer',
};
const PURE = new Set(['pure', 'solid']);
const share = (xs, ok) => xs.length ? Math.round(xs.filter(ok).length / xs.length * 100) : null;
const onLine = s => s.finish && s.finish.col === 'line';
// One metric for one skill over a set of tracked shots.
export function metric(skill, shots) {
  if (skill === 'contact') return share(shots.filter(s => s.contact || s.finish), s => PURE.has(s.contact));
  if (skill === 'startLine' || skill === 'driverFw') return share(shots.filter(s => s.finish && s.finish.col), onLine);
  if (skill === 'wedgeDist') return share(shots.filter(s => s.finish && s.finish.row), s => s.finish.row === 'pin');
  return null;
}
export function baselineSkills(sess) {
  const sh = sess.shots || [];
  const irons = sh.filter(s => s.stage === 'wedge' || s.stage === 'iron'), wedge = sh.filter(s => s.stage === 'wedge'), drv = sh.filter(s => s.stage === 'driver');
  const pure = sh.filter(s => PURE.has(s.contact)).length;
  const fat = irons.filter(s => s.contact === 'chunk' || s.contact === 'under').length;
  const thin = irons.filter(s => s.contact === 'thin' || s.contact === 'top').length;
  const lineN = irons.filter(onLine).length, lineOf = irons.filter(s => s.finish && s.finish.col).length;
  const pinN = wedge.filter(s => s.finish && s.finish.row === 'pin').length, shortN = wedge.filter(s => s.finish && s.finish.row === 'short').length;
  const fwN = drv.filter(onLine).length, fwOf = drv.filter(s => s.finish && s.finish.col).length;
  return [
    { id: 'contact', name: SKILLS.contact, v: metric('contact', sh), note: `${pure} of ${sh.length} pure${fat || thin ? ` · ${[fat ? `${fat} fat` : '', thin ? `${thin} thin` : ''].filter(Boolean).join(', ')}` : ''}` },
    { id: 'startLine', name: SKILLS.startLine, v: metric('startLine', irons), note: `${lineN} of ${lineOf} wedges and 7-irons on line` },
    { id: 'wedgeDist', name: SKILLS.wedgeDist, v: metric('wedgeDist', wedge), note: `${pinN} of ${wedge.filter(s => s.finish && s.finish.row).length} pin high${shortN ? ` · ${shortN} short` : ''}` },
    { id: 'driverFw', name: SKILLS.driverFw, v: metric('driverFw', drv), note: `${fwN} of ${fwOf} in the fairway` },
  ];
}

// What the baseline shows decides the drill (thresholds are starting points).
const RULES = [
  { skill: 'contact', drills: ['line', 'ninethree'], test: x => x.fat >= 2, why: x => `${x.fat} fat of ${x.ironsN} wedges and 7-irons: the low point is behind the ball.` },
  { skill: 'contact', drills: ['feet', 'line'], test: x => x.thin >= 2, why: x => `${x.thin} thin or topped of ${x.ironsN}: the body is rising through the strike.` },
  { skill: 'strike', drills: ['spray', 'feet'], test: x => x.heelToe >= 3, why: x => `${x.heelToe} of ${x.n} off the heel or toe.` },
  { skill: 'startLine', drills: ['align', 'gate'], test: x => x.sameSide >= 3, why: x => `${x.sameSide} of ${x.ironsN} wedges and 7-irons finished ${x.side}.` },
  { skill: 'path', drills: ['split', 'gate'], test: x => x.curveSame >= 3, why: x => `${x.curveSame} shots curved the same way (${x.curveDir}).` },
  { skill: 'wedgeDist', drills: ['ladder', 'clock'], test: x => x.wedgeOff >= 3, why: x => `${x.wedgeOff} of ${x.wedgeN} wedges finished ${x.wedgeMiss}.` },
  { skill: 'driverFw', drills: ['fairway', 'align'], test: x => x.driverN >= 3 && x.driverFw <= 2, why: x => `${x.driverFw} of ${x.driverN} drives in the fairway.` },
];
function signals(sess) {
  const sh = sess.shots || [];
  const irons = sh.filter(s => s.stage === 'wedge' || s.stage === 'iron'), wedge = sh.filter(s => s.stage === 'wedge'), drv = sh.filter(s => s.stage === 'driver');
  const left = irons.filter(s => s.finish && s.finish.col === 'left').length, right = irons.filter(s => s.finish && s.finish.col === 'right').length;
  const drawish = sh.filter(s => s.curve === 'draw' || s.curve === 'hook').length, fadeish = sh.filter(s => s.curve === 'fade' || s.curve === 'slice').length;
  const wShort = wedge.filter(s => s.finish && s.finish.row === 'short').length, wLong = wedge.filter(s => s.finish && s.finish.row === 'long').length;
  return {
    n: sh.length, ironsN: irons.length, wedgeN: wedge.length,
    fat: irons.filter(s => s.contact === 'chunk' || s.contact === 'under').length,
    thin: irons.filter(s => s.contact === 'thin' || s.contact === 'top').length,
    heelToe: sh.filter(s => ['heel', 'toe', 'shank'].includes(s.contact)).length,
    sameSide: Math.max(left, right), side: left >= right ? 'left' : 'right',
    curveSame: Math.max(drawish, fadeish), curveDir: drawish >= fadeish ? 'draw or hook' : 'fade or slice',
    wedgeOff: wShort + wLong, wedgeMiss: wShort && wLong ? 'short or long' : wShort ? 'short' : 'long',
    driverN: drv.filter(s => s.finish && s.finish.col).length, driverFw: drv.filter(onLine).length,
  };
}
// Up to two skills get one drill each; Play 9 closes the session. A drill proven for you moves to the front.
export function recommend(state, sess) {
  const x = signals(sess);
  const impact = drillImpact(state);
  const baselines = state.sessions.filter(s => s.kind === 'baseline').length;
  const pick = list => {
    const ranked = list.map(id => ({ id, i: impact[id] })).filter(o => o.i && o.i.n >= 3).sort((a, b) => b.i.avg - a.i.avg);
    if (ranked.length && ranked[0].i.avg > 0) return ranked[0].id;
    const second = list[1];
    if (second && (!impact[second] || impact[second].n < 3) && impact[list[0]] && impact[list[0]].n >= 3 && baselines % 3 === 2) return second; // give the other drill a fair trial
    return list[0];
  };
  const out = [], skills = new Set();
  RULES.forEach(r => {
    if (out.length >= 2 || skills.has(r.skill) || !r.test(x)) return;
    let id = pick(r.drills);
    if (out.some(o => o.id === id)) id = r.drills.find(d => !out.some(o => o.id === d)) || id;
    if (out.some(o => o.id === id)) return;
    skills.add(r.skill); out.push({ id, skill: r.skill, why: r.why(x) });
  });
  if (!out.length) out.push({ id: 'nine', skill: 'transfer', why: 'Nothing stands out today, so work on shaping it.' });
  out.push({ id: 'play9', skill: 'transfer', why: 'Finish by taking it to the course.' });
  return out;
}
export function baselineHeadline(skills) {
  const order = ['contact', 'startLine', 'wedgeDist', 'driverFw'];
  const scored = skills.filter(s => s.v != null).sort((a, b) => a.v - b.v || order.indexOf(a.id) - order.indexOf(b.id));
  if (!scored.length) return 'Baseline saved';
  return scored[0].v >= 70 ? 'A solid baseline today' : `${scored[0].name} is the leak today`;
}

// The re-test checks the skill behind today's first drill, with the club that shows it best.
const RETEST = { contact: ['contact', 'iron'], strike: ['contact', 'iron'], startLine: ['startLine', 'iron'], path: ['startLine', 'iron'], wedgeDist: ['wedgeDist', 'wedge'], driverFw: ['driverFw', 'driver'], transfer: ['contact', 'iron'] };
export function retestPlan(recSkill) {
  const [skill, stageId] = RETEST[recSkill] || RETEST.contact;
  return { skill, stage: BASELINE.find(s => s.id === stageId) };
}

// ---------- which drills help you ----------
// Each baseline is the "before" for the next. A drill's impact is how much its skill moved from the
// baseline before you practised it to the next baseline (retention), plus same-day re-tests.
export const DRILL_SKILL = { line: 'contact', feet: 'contact', pause: 'contact', spray: 'contact', slomo: 'contact', ninethree: 'startLine', gate: 'startLine', split: 'startLine', align: 'startLine', ladder: 'wedgeDist', clock: 'wedgeDist', onedist: 'wedgeDist', fairway: 'driverFw' };
export function drillImpact(state) {
  const bs = state.sessions.filter(s => s.kind === 'baseline').sort((a, b) => a.ended - b.ended)
    .map(b => ({ b, sk: Object.fromEntries(baselineSkills(b).map(s => [s.id, s.v])) }));
  const out = {};
  const add = (id, key, v) => { const o = out[id] = out[id] || { next: [], same: [], skill: DRILL_SKILL[id] }; o[key].push(v); };
  for (let i = 0; i + 1 < bs.length; i++) {
    const A = bs[i], B = bs[i + 1];
    const between = state.sessions.filter(s => s.kind === 'range' && s.ended > A.b.ended && s.ended < (B.b.started || B.b.ended));
    const ids = new Set();
    between.forEach(s => { const c = {}; (s.shots || []).forEach(x => { c[x.drill] = (c[x.drill] || 0) + 1; }); Object.entries(c).forEach(([id, k]) => { if (k >= 5) ids.add(id); }); });
    ids.forEach(id => { const sk = DRILL_SKILL[id]; if (sk && A.sk[sk] != null && B.sk[sk] != null) add(id, 'next', B.sk[sk] - A.sk[sk]); });
  }
  state.sessions.filter(s => s.kind === 'retest' && s.drillIds && s.value != null && s.before != null).forEach(r => {
    r.drillIds.forEach(id => { if (DRILL_SKILL[id] === r.skill) add(id, 'same', r.value - r.before); });
  });
  Object.values(out).forEach(o => {
    const avg = xs => xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
    o.n = o.next.length; o.avg = avg(o.next); o.sameAvg = avg(o.same);
  });
  return out;
}

export const ALL_DRILLS = () => RANGE_DRILLS.concat(PUTT_DRILLS);
