// Coach Caddy app: hash router and screens.
import { S, update, uid, club, inBag, exportJSON, resetAll } from './store.js';
import { SHOT_TYPES, RANGE_DRILLS, PUTT_DRILLS, SURFACES, SLOPES, DIFFICULTY, RELIABILITY, MAX_CUSTOM_CLUBS } from './data.js';
import { viewFor, hitTest, curveFromPath, curveName, drawIrons, drawWoods, drawGreen, drawPutt, toViewBox } from './targets.js';
import { describeShot, rangeRecap, puttRecap, courseRecap, reliability, recommend, adjustedCarry, tempSummary, drillById } from './engine.js';
import { esc, insignia, caddyGlyph, golferGlyph, bagGlyph, sunIcon, moonIcon, lockIcon, checkOn, checkOff, scienceCard, science, drillGlyph, toast, ytLink, openYouTube, rangeScene, fairwayScene } from './ui.js';
import { makeSample } from './sample.js';
import { WARMUP, WARMUP_WORK as WORK, WARMUP_READY as READY } from './warmup.js';

const app = document.getElementById('app');
const TAG = 'Your data, your practice, your results: science-driven game improvement.';
let ui = {};                       // transient screen state (selections, open sheets)
let lastHash = null;               // render() resets the warm-up timer only when the route changes

// ---------- theme ----------
function applyTheme() {
  document.documentElement.dataset.theme = S().theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = S().theme === 'night' ? '#0D1612' : '#F6F3EA';
}
function themeBtn() {
  const night = S().theme === 'night';
  return `<button class="round-btn" data-act="theme" aria-label="${night ? 'Switch to day mode' : 'Switch to night mode'}">${night ? sunIcon : moonIcon}</button>`;
}

// ---------- routing ----------
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [a = '', b = '', c = ''] = h.split('/');
  return { a, b, c };
}
function go(path) { location.hash = '#/' + path; }

function render() {
  applyTheme();
  const r = route();
  if (location.hash !== lastHash) {
    lastHash = location.hash;
    stopWarm(); wu.phase = 'idle';
    if (r.a !== 'warmup' || !r.b) ui.wuAuto = false;
  }
  closeOverlays();
  let html;
  switch (r.a) {
    case '': html = home(); break;
    case 'practice': html = practice(); break;
    case 'warmup': html = r.b ? warmMove(r.b) : warmList(); break;
    case 'range': html = r.b === 'log' ? rangeLog() : r.b === 'recap' ? rangeRecapView(r.c) : rangePick(); break;
    case 'putt': html = r.b === 'log' ? puttLog() : r.b === 'recap' ? puttRecapView(r.c) : puttPick(); break;
    case 'course': html = r.b === 'recap' ? courseRecapView(r.c) : courseLog(); break;
    case 'play': html = playSetup(); break;
    case 'caddy': html = caddy(); break;
    case 'bag': html = r.b === 'how' ? bagHow() : bag(); break;
    default: html = home();
  }
  app.innerHTML = `<main class="screen">${html}</main>`;
  after(r);
  window.scrollTo(0, 0);
}

function after(r) {
  if (r.a === 'range' && r.b === 'log') bindTarget('range');
  if (r.a === 'putt' && r.b === 'log') bindTarget('putt');
  if (r.a === 'caddy') bindSwipe();
  if (r.a === 'warmup' && r.b) {
    paintWarm();
    if (ui.wuAuto && wu.phase === 'idle' && !wu.t) runWarm('ready', READY);
  }
}

// ---------- helpers ----------
const back = (to, label) => `<a class="back" href="#/${to}">‹ ${label}</a>`;
const fmtDate = t => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const shotType = id => SHOT_TYPES.find(t => t.id === id) || SHOT_TYPES[0];

function finishActive() {
  const a = S().active;
  if (!a) return null;
  const has = (a.shots && a.shots.length) || (a.putts && a.putts.length) || (a.holes && a.holes.some(h => h.shots.length || h.putts));
  update(s => {
    if (has) s.sessions.push({ ...a, ended: Date.now(), pending: undefined });
    s.active = null;
  });
  return has ? a.id : null;
}

function relRow(r, top) {
  if (!r || r.locked) return `<span class="locked" title="Sessions logged with this club">${lockIcon}${r ? r.sessions : 0}/${RELIABILITY.sessionsRequired}<span class="sess"> sessions</span></span>`;
  return `<span class="rel"><span class="track"><span class="fill ${top ? 'gold' : ''}" style="width:${r.score}%"></span></span><b>${r.score}</b></span>`;
}

// ---------- home ----------
// Sessions until the first club earns a rating (the club closest to unlocking sets the count).
function relWait(rel) {
  const best = Math.max(0, ...Object.values(rel.clubs).map(v => v.sessions || 0));
  const left = Math.max(1, RELIABILITY.sessionsRequired - best);
  return `Club reliability ratings calculated in ${left} more session${left === 1 ? '' : 's'}.`;
}

function home() {
  const st = S();
  const rel = reliability(st);
  const since = Date.now() - 30 * 86400000;
  const recent = st.sessions.filter(s => s.kind === 'range' && s.ended > since);
  const shots = recent.flatMap(s => s.shots);
  const withC = shots.filter(x => x.contact);
  const solid = withC.length ? Math.round(withC.filter(x => ['pure', 'solid'].includes(x.contact)).length / withC.length * 100) : null;
  const top = Object.entries(rel.clubs).filter(([, v]) => v.top).sort((a, b) => b[1].score - a[1].score);
  const last = st.sessions.slice().sort((a, b) => b.ended - a.ended)[0];
  let take = '';
  if (last) {
    const rc = last.kind === 'range' ? rangeRecap(last, st.bag) : last.kind === 'putt' ? puttRecap(last) : courseRecap(last);
    take = `<a class="card dashed" href="#/${last.kind}/recap/${last.id}" style="text-decoration:none;color:inherit"><span class="lbl">Last takeaway · ${fmtDate(last.ended)}</span><span>${esc(rc.headline)}. ${esc(rc.lines[0] || rc.cause || '')}</span></a>`;
  }
  const c = st.conditions;
  const active = st.active ? `<a class="card hero" href="#/${st.active.kind}/log" style="text-decoration:none"><span class="lbl">In progress</span><span class="h2">Resume ${st.active.kind === 'range' ? 'range session' : st.active.kind === 'putt' ? 'putting session' : 'round'} ›</span></a>` : '';
  return `
  <header class="masthead">
    <div class="top"><span class="wordmark">${insignia(40)}<span>COACH CADDY</span></span><span style="display:flex;gap:8px">${themeBtn()}<a class="pill-link" href="#/bag">My bag</a></span></div>
    <p class="tag">${TAG}</p>
  </header>
  <p class="prompt">Practice or Play?</p>
  ${active}
  <a class="tile scene" href="#/practice">${rangeScene()}<span class="scrim"></span><span class="mat"></span>${golferGlyph(104, 'g-gold on-mat', '#276446')}
    <span class="lbl">Range · Putting · Course</span><h2 class="one-line">Coach: Practice</h2>
    <span class="readout">${shots.length ? `${shots.length} shots · 30 days${solid != null ? ` · ${solid}% solid` : ""}` : 'Start logging to see your numbers'}</span></a>
  <a class="tile scene" href="#/play">${fairwayScene()}<span class="scrim"></span>${caddyGlyph(136, 'g-gold at-bottom', '#23603F')}
    <span class="lbl">On the course</span><h2 class="one-line">Caddy: Play</h2>
    <span class="readout">${c.set ? `${c.temp}°F · ${c.moisture} · ${tempSummary(c)}` : 'Conditions, carries and every lie'}</span></a>
  ${top.length ? `<a class="card" href="#/bag" style="text-decoration:none;color:inherit"><span class="lbl">Most reliable right now</span><div class="chips">${top.map(([id, v]) => `<span class="chip gold" style="display:flex;align-items:center">★ ${esc(club(id).name)} ${v.score}</span>`).join('')}</div></a>`
    : `<a class="card" href="#/bag" style="text-decoration:none;color:inherit"><span class="lbl">Club reliability</span><span class="muted">${relWait(rel)}</span></a>`}
  ${take}`;
}

// ---------- practice ----------
function practice() {
  const plan = S().plan;
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <div style="display:flex;align-items:center;gap:10px">${golferGlyph(46, 'g-brand')}<h1>Coach: Practice</h1></div>
  ${scienceCard('flight')}
  <a class="row-link" href="#/warmup">${drillGlyph('stretch')}<span class="grow"><span class="name">Warm-up</span><span class="muted">5 moves, about 4 minutes</span></span><span class="chev">›</span></a>
  <a class="row-link" href="#/range">${drillGlyph('traj')}<span class="grow"><span class="name">Range</span><span class="muted">Drills, tap ball and grass</span></span><span class="chev">›</span></a>
  <a class="row-link" href="#/putt">${drillGlyph('pworld')}<span class="grow"><span class="name">Putting</span><span class="muted">Line, speed, pressure</span></span><span class="chev">›</span></a>
  <a class="row-link" href="#/course">${drillGlyph('flag')}<span class="grow"><span class="name">Course</span><span class="muted">Log a round, find the leaks</span></span><span class="chev">›</span></a>
  <div class="spacer"></div>
  ${plan ? `<div class="card hero"><span class="lbl">Your plan${plan.from ? ' · ' + esc(plan.from) : ''}</span>
    <span>${plan.range && plan.range.length ? 'Range: ' + plan.range.map(id => esc(drillById(id).name)).join(', ') : ''}${plan.putt && plan.putt.length ? `<br>Putting: ${plan.putt.map(id => esc(drillById(id).name)).join(', ')}` : ''}</span>
    <div class="btn-row">${plan.range && plan.range.length ? '<a class="btn goldbtn" href="#/range">Range plan</a>' : ''}${plan.putt && plan.putt.length ? '<a class="btn sec" href="#/putt" style="border-color:var(--heroInk);color:var(--heroInk);background:transparent">Putting plan</a>' : ''}</div></div>` : ''}`;
}

// ---------- warm-up ----------
// Five 45-second mobility moves. One move can be timed on its own, or the routine runs hands-free:
// a 3-second get-ready, the move, then on to the next.
let wu = { phase: 'idle', end: 0, ms: 0, left: WORK, t: null, lock: null };
const fmtS = s => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
const warmIdx = id => WARMUP.findIndex(m => m.id === id);
const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

function stopWarm() {
  clearInterval(wu.t); wu.t = null;
  if (wu.lock) { wu.lock.release().catch(() => {}); wu.lock = null; }
}
function runWarm(phase, secs) {
  stopWarm();
  wu.phase = phase; wu.end = Date.now() + secs * 1000;
  wu.t = setInterval(tickWarm, 200);
  // Keep the screen awake while the timer runs, where the phone allows it.
  try {
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { if (wu.t) wu.lock = l; else l.release().catch(() => {}); }).catch(() => {});
  } catch (e) {}
  tickWarm();
}
function tickWarm() {
  const ms = Math.max(0, wu.end - Date.now());
  wu.left = Math.ceil(ms / 1000);
  if (ms <= 0 && wu.phase === 'ready') { buzz(60); runWarm('work', WORK); return; }
  if (ms <= 0 && wu.phase === 'work') { buzz([120, 80, 120]); doneWarm(); return; }
  paintWarm();
}
function doneWarm() {
  stopWarm();
  const next = WARMUP[warmIdx(route().b) + 1];
  if (ui.wuAuto && next) { go('warmup/' + next.id); return; }
  if (ui.wuAuto) { ui.wuAuto = false; toast('Warm-up done. Go hit some balls.'); go('warmup'); return; }
  wu.phase = 'done'; wu.left = 0; paintWarm();
}
// Updates the timer pieces in place so the screen never re-renders mid-move.
function paintWarm() {
  const t = document.getElementById('wuTime'), f = document.getElementById('wuFill'), b = document.getElementById('wuGo');
  if (!t) return;
  const p = wu.phase;
  t.textContent = p === 'ready' ? `Ready ${wu.left}` : fmtS(p === 'idle' ? WORK : wu.left);
  t.classList.toggle('on', p === 'work' || p === 'ready');
  const frac = p === 'work' ? 1 - (wu.end - Date.now()) / (WORK * 1000) : p === 'paused' ? 1 - wu.ms / (WORK * 1000) : p === 'done' ? 1 : 0;
  if (f) f.style.width = `${Math.min(100, Math.max(0, frac * 100))}%`;
  if (b) b.textContent = { idle: `Start ${fmtS(WORK)}`, ready: 'Start now', work: 'Pause', paused: `Resume ${fmtS(wu.left)}`, done: `Again ${fmtS(WORK)}` }[p];
}

function warmList() {
  const mins = Math.round(WARMUP.length * (WORK + READY) / 60);
  return `
  <div class="top">${back('practice', 'Practice')}${themeBtn()}</div>
  <h1>Pre-round warm-up</h1>
  <p class="helper">Five moves, 45 seconds each, to wake up your hips, spine and shoulders before your first swing. Start the routine and it runs hands-free.</p>
  <div class="stat-row"><div class="stat"><b>${WARMUP.length}</b><span>Moves</span></div><div class="stat"><b>${fmtS(WORK)}</b><span>Each</span></div><div class="stat"><b>${mins}</b><span>Minutes</span></div></div>
  ${WARMUP.map((m, i) => `<a class="row-link" href="#/warmup/${m.id}"><span class="wu-thumb" aria-hidden="true">${m.frames[1].svg}</span><span class="grow"><span class="name">${i + 1}. ${esc(m.name)}</span><span class="muted">${esc(m.targets.join(', '))}</span></span><span class="chev">›</span></a>`).join('')}
  <div class="spacer"></div>
  <button class="btn pri" data-act="warmRoutine">Start routine</button>`;
}

function warmMove(id) {
  const i = warmIdx(id);
  if (i < 0) { go('warmup'); return ''; }
  const m = WARMUP[i], next = WARMUP[i + 1];
  return `
  <div class="top">${back('warmup', 'Warm-up')}<span class="wu-dots" role="img" aria-label="Move ${i + 1} of ${WARMUP.length}">${WARMUP.map((_, j) => `<span class="${j <= i ? 'on' : ''}"></span>`).join('')}</span><span class="wu-time mono" id="wuTime">${fmtS(WORK)}</span></div>
  <div class="wu-head"><span class="lbl">Move ${i + 1} of ${WARMUP.length}${ui.wuAuto ? ' · Routine' : ''}</span><h1>${esc(m.name)}</h1>
    <div class="chips">${m.targets.map(t => `<span class="badge plain">${esc(t)}</span>`).join('')}</div>
    <p class="helper">${esc(m.why)}</p></div>
  <div class="wu-frames">${m.frames.map((f, j) => `<div class="wu-frame"><span class="lbl"><span class="n ${j ? 'go' : ''}">${j + 1}</span>${esc(f.label)}</span>${f.svg}</div>`).join('')}</div>
  <div class="wu-bar" aria-hidden="true"><span id="wuFill"></span></div>
  <ol class="wu-cues">${m.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
  <div class="card soft"><span class="lbl t-gold">Coach tip</span><span>${esc(m.tip)}</span></div>
  <div class="spacer"></div>
  <div class="btn-row"><button class="btn pri" id="wuGo" data-act="warmGo">Start ${fmtS(WORK)}</button>${next
    ? `<a class="btn sec wu-next" href="#/warmup/${next.id}" aria-label="Next move: ${esc(next.name)}">›</a>`
    : `<a class="btn sec wu-next" href="#/warmup" aria-label="Finish warm-up">✓</a>`}</div>`;
}

// ---------- range: drill picker ----------
function rangePick() {
  if (!ui.rangePick) ui.rangePick = new Set((S().plan && S().plan.range) || ['gate', 'line', 'ladder']);
  const cat = ui.rangeCat || 'All';
  const cats = ['All', 'Contact', 'Direction', 'Distance', 'Shape', 'Transfer'];
  const list = RANGE_DRILLS.filter(d => cat === 'All' || d.cat === cat);
  const n = ui.rangePick.size;
  const balls = RANGE_DRILLS.filter(d => ui.rangePick.has(d.id)).reduce((a, d) => a + d.balls, 0);
  return `
  <div class="top">${back('practice', 'Practice')}${themeBtn()}</div>
  <h1>Range session</h1>
  ${scienceCard('lowpoint')}
  <div class="chips scroll">${cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-act="rangeCat" data-v="${c}">${c}</button>`).join('')}</div>
  ${list.map(d => {
    const on = ui.rangePick.has(d.id);
    return `<div class="drill ${on ? 'on' : ''}" role="button" tabindex="0" data-act="pickRange" data-v="${d.id}" aria-pressed="${on}">${drillGlyph(d.glyph)}
      <span class="grow"><span class="name-row"><span class="name">${esc(d.name)}</span>${ytLink(d)}</span><span class="meta">${esc(d.trains)} · ${d.balls} balls · ${esc(club(d.club).name)}, ${esc(shotType(d.type).name.toLowerCase())}</span>${on ? `<span class="how">${esc(d.how)}</span>` : ''}</span>${on ? checkOn : checkOff}</div>`;
  }).join('')}
  <div class="spacer"></div>
  <button class="btn pri" data-act="startRange" ${n ? '' : 'disabled style="opacity:.5"'}>Start · ${n} drill${n === 1 ? '' : 's'} · ${balls} balls</button>`;
}

// ---------- range: logger ----------
function currentDrill(a) { return drillById(a.drills[a.di]) || RANGE_DRILLS[0]; }
function drillShots(a) { const d = currentDrill(a); return a.shots.filter(s => s.drill === d.id); }

function targetSvg(a) {
  const cl = club(a.club);
  const view = viewFor(cl.kind, a.type);
  const shots = drillShots(a).filter(s => s.view === view);
  const pd = a.pending || {};
  const pt = pd.x != null ? pd : null;
  if (view === 'woods') return drawWoods(shots, pd.contact, S().hand, a.type === 'tee' || cl.id === 'D', pt);
  if (view === 'green') return drawGreen(shots, pd.contact, S().hand, pt);
  return drawIrons(shots, pd.contact, S().hand, pt);
}

// ---------- shot draft (range) ----------
// A shot is built up from optional parts and saved with Next shot.
function hasDraft(pd) { return !!(pd && (pd.contact || pd.row || pd.col || pd.holed || pd.curve || pd.height || pd.carry != null)); }
function draftPart(pd) {
  const finish = (pd.row || pd.col || pd.holed)
    ? { row: pd.row || null, col: pd.col || null, ...(pd.ft != null ? { ft: pd.ft, dx: pd.dx, dy: pd.dy } : {}), ...(pd.holed ? { holed: true } : {}) }
    : null;
  return { contact: pd.contact || null, finish, curve: pd.curve || null, carry: pd.carry != null ? pd.carry : null, x: pd.x != null ? pd.x : null, y: pd.y != null ? pd.y : null };
}
const OUT_CONTACT = [['pure', 'Pure'], ['thin', 'Thin'], ['chunk', 'Chunk'], ['heel', 'Heel'], ['toe', 'Toe']];
function outRow(label, act, opts, cur) {
  return `<div class="out-row"><span class="lbl">${label}</span><div class="out-chips" style="--n:${opts.length}">${opts.map(([v, txt]) =>
    `<button class="chip sq ${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${txt}</button>`).join('')}</div></div>`;
}

function rangeLog() {
  const a = S().active;
  if (!a || a.kind !== 'range') { go('range'); return ''; }
  const d = currentDrill(a);
  const cl = club(a.club);
  const st = shotType(a.type);
  const done = drillShots(a).length;
  const last = a.shots[a.shots.length - 1];
  const rel = reliability(S()).clubs[cl.id];
  const pend = a.pending || {};
  const view = viewFor(cl.kind, a.type);
  const has = hasDraft(pend);
  const draft = { view, height: pend.height || null, ...draftPart(pend) };
  const lenOpts = view === 'woods' ? [['short', 'Short'], ['pin', 'Normal'], ['long', 'Long']] : [['short', 'Short'], ['pin', 'Pin high'], ['long', 'Long']];
  const dirOpts = view === 'woods' ? [['obL', 'OB L'], ['left', 'Left'], ['line', 'Fairway'], ['right', 'Right'], ['obR', 'OB R']] : [['left', 'Left'], ['line', 'On line'], ['right', 'Right']];
  const heightRow = st.height ? `<div class="grid3">${['low', 'mid', 'high'].map(h => `<button class="chip sq ${pend.height === h ? 'on' : ''}" data-act="height" data-v="${h}">${h[0].toUpperCase() + h.slice(1)}</button>`).join('')}</div>` : '';
  const curveRow = st.curve ? `<div class="chips">${['hook', 'draw', 'none', 'fade', 'slice'].map(c => `<button class="chip ${pend.curve === c ? 'on' : ''}" data-act="curve" data-v="${c}">${c === 'none' ? 'Straight' : c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div>` : '';
  return `
  <div class="top"><button class="back" data-act="endRange">End</button><span class="title-sm">${esc(d.name)}${ytLink(d, true)}</span><span class="muted mono">${done}/${d.balls}</span></div>
  <button class="setup-row" data-act="openShotSetup"><span><b>${esc(cl.name)}</b> · ${esc(st.name)} ${rel && !rel.locked ? `<span class="badge ${rel.top ? '' : 'plain'}">${rel.top ? '★ ' : ''}${rel.score}</span>` : ''}</span><span class="muted">Change ›</span></button>
  <div class="status ${has ? 'draft' : ''}" aria-live="polite"><span>${has ? esc(describeShot(draft)) : last ? esc(describeShot(last)) : 'Tap the ball, the grass or the rows below'}</span><span class="muted">${has ? 'This shot' : last ? `Saved #${done}` : ''}</span></div>
  ${targetSvg(a)}
  <p class="helper">Ball = contact · grass = length and direction · bottom row = chunk · hold the ball = topped or shank · drag = curve. All optional.</p>
  <div class="outcome">
    ${outRow('Contact', 'setContact', OUT_CONTACT, pend.contact)}
    ${outRow('Length', 'setLen', lenOpts, pend.row)}
    ${outRow('Direction', 'setDir', dirOpts, pend.col)}
    ${heightRow}${curveRow}
  </div>
  <button class="btn pri next-shot" data-act="nextShot" ${has ? '' : 'disabled'}>Next shot ›</button>
  <div class="btn-row"><button class="btn sec" data-act="undo" style="flex:1">${has ? 'Clear' : 'Undo'}</button><button class="btn dash" data-act="carry" style="flex:2">${pend.carry != null ? `Carry ${pend.carry} yds` : '+ Carry yds (optional)'}</button></div>
  <div class="btn-row"><button class="btn ghost" data-act="nextDrill">${a.di < a.drills.length - 1 ? 'Next drill ›' : 'Finish session ›'}</button></div>`;
}

function shotSetupSheet() {
  const a = S().active;
  const groups = [['Woods', ['wood', 'hybrid']], ['Irons', ['iron']], ['Wedges', ['wedge']]];
  const rel = reliability(S()).clubs;
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="Club and shot type" data-stop>
    <div class="grab"></div><h2>Club and shot type</h2>
    ${groups.map(([name, kinds]) => `<span class="lbl">${name}</span><div class="chips">${inBag().filter(c => kinds.includes(c.kind)).map(c => {
      const r = rel[c.id]; const top = r && r.top;
      return `<button class="chip ${c.id === a.club ? 'on' : ''} ${top ? 'gold' : ''}" data-act="setClub" data-v="${c.id}">${top ? '★ ' : ''}${esc(c.name)}</button>`;
    }).join('')}</div>`).join('')}
    <span class="lbl">Shot type</span>
    <div class="chips">${SHOT_TYPES.map(t => `<button class="chip ${t.id === a.type ? 'on' : ''}" data-act="setType" data-v="${t.id}">${esc(t.name)}</button>`).join('')}</div>
    <div class="science">${science.trajectories}<div class="science-text"><b>${esc(shotType(a.type).name)}</b><span>Counts as a win: ${esc(shotType(a.type).win.toLowerCase())}.</span></div></div>
    <button class="btn pri" data-act="closeSheet">Done</button>
  </div></div>`;
}

// ---------- range recap ----------
function rangeRecapView(id) {
  const st = S();
  const sess = st.sessions.find(s => s.id === id);
  if (!sess) return `<div class="top">${back('', 'Home')}</div><h1>Session not found</h1>`;
  const rc = rangeRecap(sess, st.bag);
  const rel = reliability(st).clubs[rc.mainClub];
  const n = sess.shots.length;
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <span class="lbl">Session recap · ${fmtDate(sess.ended)} · ${n} balls</span>
  <h1>${esc(rc.headline)}</h1>
  <div class="card">${rc.lines.map(l => `<p>${esc(l)}</p>`).join('')}<p class="muted">${esc(rc.cause)}</p></div>
  ${scienceCard(rc.science)}
  <div class="stat-row">${['right', 'line', 'left'].map(k => `<div class="stat ${rc.dirs[k] === Math.max(rc.dirs.left, rc.dirs.right) && k !== 'line' && rc.dirs[k] > 0 ? 'hi' : ''}"><b>${rc.dirs[k]}</b><span>${k === 'line' ? 'on line' : k}</span></div>`).join('')}</div>
  ${rc.goals.length ? `<div class="card">${rc.goals.map(g => `<span><b>${esc(g.name)}:</b> ${g.hits} of ${g.n} hit the goal</span>`).join('')}</div>` : ''}
  ${rc.mainClub ? `<a class="setup-row" href="#/bag" style="text-decoration:none"><span>${esc(club(rc.mainClub).name)} reliability ${rel && !rel.locked ? `<b>${rel.score}</b>` : ''}</span>${rel && !rel.locked ? (rel.top ? '<span class="badge">★ Most reliable</span>' : '') : `<span class="locked">${lockIcon}${rel ? rel.sessions : 0} of ${RELIABILITY.sessionsRequired}</span>`}</a>` : ''}
  <div class="spacer"></div>
  <div class="card hero"><span class="lbl">Next time</span>
    <span>${rc.drills.map(id => `${esc(drillById(id).name)} · ${drillById(id).balls} balls`).join('<br>')}<br><span class="muted">Clubs: ${rc.focusClubs.map(esc).join(', ')}</span></span>
    <button class="btn goldbtn" data-act="savePlan" data-kind="range" data-v="${rc.drills.join(',')}">Save plan</button></div>`;
}

// ---------- putting ----------
function puttPick() {
  if (!ui.puttPick) ui.puttPick = new Set((S().plan && S().plan.putt) || ['pgate', 'pladder', 'pclock']);
  const cat = ui.puttCat || 'All';
  const cats = ['All', 'Line', 'Speed', 'Pressure', 'Reading'];
  const list = PUTT_DRILLS.filter(d => cat === 'All' || d.cat === cat);
  const n = ui.puttPick.size;
  const putts = PUTT_DRILLS.filter(d => ui.puttPick.has(d.id)).reduce((a, d) => a + d.putts, 0);
  return `
  <div class="top">${back('practice', 'Practice')}${themeBtn()}</div>
  <h1>Putting session</h1>
  ${scienceCard('break')}
  <div class="chips scroll">${cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-act="puttCat" data-v="${c}">${c}</button>`).join('')}</div>
  ${list.map(d => {
    const on = ui.puttPick.has(d.id);
    return `<div class="drill ${on ? 'on' : ''}" role="button" tabindex="0" data-act="pickPutt" data-v="${d.id}" aria-pressed="${on}">${drillGlyph(d.glyph)}
      <span class="grow"><span class="name-row"><span class="name">${esc(d.name)}</span>${ytLink(d)}</span><span class="meta">${esc(d.trains)} · ${d.dist} ft · ${d.putts} putts</span>${on ? `<span class="how">${esc(d.how)}</span>` : ''}</span>${on ? checkOn : checkOff}</div>`;
  }).join('')}
  <div class="spacer"></div>
  <button class="btn pri" data-act="startPutt" ${n ? '' : 'disabled style="opacity:.5"'}>Start · ${n} drill${n === 1 ? '' : 's'} · ${putts} putts</button>`;
}

function puttWords(p) {
  if (p.made) return 'Made it';
  const parts = [];
  const first = [p.len ? (p.len === 'long' ? 'Long' : 'Short') : '', p.ft != null ? `${Math.max(1, Math.round(p.ft))} ft` : ''].filter(Boolean).join(' ');
  if (first) parts.push(first);
  if (p.side) parts.push(p.side === 'center' ? 'on line' : p.brk && p.brk !== 'straight' && p.lowSide != null ? (p.lowSide ? 'low side' : 'high side') : p.side);
  if (p.lip) parts.push('lip out');
  const w = parts.join(' · ');
  return w ? w[0].toUpperCase() + w.slice(1) : 'No details';
}

// ---------- putt draft ----------
function hasPutt(pd) { return !!(pd && (pd.made || pd.len || pd.side || pd.ft != null || pd.lip)); }
function lowSideOf(brk, dx, side) {
  if (brk === 'straight') return null;
  if (dx != null) return brk === 'right' ? dx > 0 : dx < 0;
  if (side && side !== 'center') return brk === 'right' ? side === 'right' : side === 'left';
  return null;
}
function draftPutt(a, pd) {
  const d = drillById(a.drills[a.di]);
  const base = { t: Date.now(), drill: d.id, dist: a.dist, brk: a.brk };
  if (pd.made) return { ...base, made: true, ft: 0, dx: 0, dy: 0, side: 'center', len: null, lowSide: null, lip: false, x: 179, y: 150 };
  const dx = pd.dx != null ? pd.dx : null;
  return { ...base, made: false, ft: pd.ft != null ? pd.ft : null, dx, dy: pd.dy != null ? pd.dy : null, side: pd.side || null, len: pd.len || null,
    lowSide: lowSideOf(a.brk, dx, pd.side), lip: !!pd.lip, x: pd.x != null ? pd.x : null, y: pd.y != null ? pd.y : null };
}

function puttLog() {
  const a = S().active;
  if (!a || a.kind !== 'putt') { go('putt'); return ''; }
  const d = drillById(a.drills[a.di]);
  const mine = a.putts.filter(p => p.drill === d.id);
  const made = mine.filter(p => p.made).length;
  const last = a.putts[a.putts.length - 1];
  const brkName = { left: 'Breaks left', straight: 'Straight', right: 'Breaks right' }[a.brk];
  const pd = a.ppend || {};
  const has = hasPutt(pd);
  return `
  <div class="top"><button class="back" data-act="endPutt">End</button><span class="title-sm">${esc(d.name)}${ytLink(d, true)}</span><span class="muted mono">${mine.length}/${d.putts}</span></div>
  <button class="setup-row" data-act="openPuttSetup"><span><b>${a.dist} ft</b> · ${brkName}</span><span class="muted">Change ›</span></button>
  <div class="status ${has ? 'draft' : ''}" aria-live="polite"><span>${has ? esc(puttWords(draftPutt(a, pd))) : last ? esc(puttWords(last)) : 'Tap the cup or where it stopped'}</span><span class="muted">${has ? 'This putt' : `Made ${made} of ${mine.length}`}</span></div>
  ${drawPutt(mine, a.brk, pd.made ? { x: 179, y: 150 } : pd.x != null ? pd : null)}
  <p class="helper">Tap the cup if it dropped, or where the ball stopped. Or just pick length and direction. Gold = ideal pace.</p>
  <div class="outcome">
    ${outRow('Result', 'puttResult', [['made', 'Made it'], ['lip', 'Lip out']], pd.made ? 'made' : pd.lip ? 'lip' : null)}
    ${outRow('Distance', 'puttLen', [['short', 'Short'], ['long', 'Long']], pd.len)}
    ${outRow('Direction', 'puttSide', [['left', 'Left'], ['center', 'On line'], ['right', 'Right']], pd.side)}
  </div>
  <button class="btn pri next-shot" data-act="nextPutt" ${has ? '' : 'disabled'}>Next shot ›</button>
  <div class="btn-row"><button class="btn sec" data-act="undoPutt" style="flex:1">${has ? 'Clear' : 'Undo'}</button></div>
  <div class="btn-row"><button class="btn ghost" data-act="nextPuttDrill">${a.di < a.drills.length - 1 ? 'Next drill ›' : 'Finish session ›'}</button></div>`;
}

function puttSetupSheet() {
  const a = S().active;
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="Putt setup" data-stop>
    <div class="grab"></div><h2>Distance and break</h2>
    <span class="lbl">Distance</span>
    <div class="chips">${[3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50].map(f => `<button class="chip ${f === a.dist ? 'on' : ''}" data-act="setDist" data-v="${f}">${f} ft</button>`).join('')}</div>
    <span class="lbl">Break</span>
    <div class="seg">${['left', 'straight', 'right'].map(b => `<button class="${b === a.brk ? 'on' : ''}" data-act="setBreak" data-v="${b}">${b === 'straight' ? 'Straight' : 'Breaks ' + b}</button>`).join('')}</div>
    <button class="btn pri" data-act="closeSheet">Done</button></div></div>`;
}

function puttRecapView(id) {
  const sess = S().sessions.find(s => s.id === id);
  if (!sess) return `<div class="top">${back('', 'Home')}</div><h1>Session not found</h1>`;
  const rc = puttRecap(sess);
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <span class="lbl">Putting recap · ${fmtDate(sess.ended)} · ${sess.putts.length} putts</span>
  <h1>${esc(rc.headline)}</h1>
  <div class="card">${rc.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
  ${scienceCard(rc.focus === 'break' || rc.focus === 'line' ? 'break' : 'speed')}
  ${rc.long && rc.long.n ? `<span class="lbl">15 ft and longer</span><div class="stat-row"><div class="stat ${rc.long.short >= rc.long.long ? 'hi' : ''}"><b>${rc.long.short}</b><span>Short</span></div><div class="stat ${rc.long.long > rc.long.short ? 'hi' : ''}"><b>${rc.long.long}</b><span>Long</span></div><div class="stat"><b>${rc.long.made}</b><span>Made</span></div></div>` : ''}
  <div class="spacer"></div>
  <div class="card hero"><span class="lbl">Next time</span><span>${rc.drills.map(id => `${esc(drillById(id).name)} · ${drillById(id).putts} putts`).join('<br>')}</span>
    <button class="btn goldbtn" data-act="savePlan" data-kind="putt" data-v="${rc.drills.join(',')}">Save plan</button></div>`;
}

// ---------- course ----------
const FROM = ['tee', 'fairway', 'rough', 'sand', 'fringe'];
const RESULT = ['fairway', 'green', 'short', 'long', 'left', 'right', 'penalty', 'holed'];

function ensureCourse() {
  let a = S().active;
  if (!a || a.kind !== 'course') {
    if (a) finishActive();
    update(s => {
      s.active = { kind: 'course', id: uid(), started: Date.now(), hole: 1, holes: Array.from({ length: 18 }, (_, i) => ({ n: i + 1, par: 4, yds: null, shots: [], putts: 0 })), draft: { club: 'D', from: 'tee', result: null } };
    });
    a = S().active;
  }
  return a;
}

function courseLog() {
  const a = ensureCourse();
  const h = a.holes[a.hole - 1];
  const dr = a.draft;
  return `
  <div class="top">${back('practice', 'Practice')}<button class="back" data-act="finishRound" style="color:var(--brand);font-weight:700">Finish round</button></div>
  <div class="hole-nav">${a.holes.map(x => `<button class="${x.n === a.hole ? 'on' : (x.shots.length ? 'done' : '')}" data-act="hole" data-v="${x.n}">${x.n}</button>`).join('')}</div>
  <div style="display:flex;align-items:baseline;justify-content:space-between"><h1>Hole ${h.n}</h1><button class="chip" data-act="par">Par ${h.par}</button></div>
  <div class="shot-list">${h.shots.map((s, i) => `<div><span>${i + 1} · ${esc(club(s.club).name)} · ${s.from}</span><b>${s.result}</b></div>`).join('')}</div>
  <div class="card" style="border:2px solid var(--brand)">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="h2">Shot ${h.shots.length + 1}</span>
      <select data-act="draftClub" aria-label="Club" style="min-height:40px;border-radius:12px;border:1.5px solid var(--line);background:var(--sf);padding:0 10px">${inBag().map(c => `<option value="${c.id}" ${c.id === dr.club ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <span class="lbl">From</span><div class="chips">${FROM.map(f => `<button class="chip ${dr.from === f ? 'on' : ''}" data-act="draftFrom" data-v="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
    <span class="lbl">Result</span><div class="chips">${RESULT.map(r => `<button class="chip ${dr.result === r ? 'on' : ''}" data-act="draftResult" data-v="${r}">${r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div>
    <button class="btn pri" data-act="addShot" ${dr.result ? '' : 'disabled style="opacity:.5"'}>Log shot</button>
  </div>
  <div class="setup-row" style="cursor:default"><b>Putts</b><span class="stepper"><button data-act="putts" data-v="-1" aria-label="One fewer putt">−</button><b>${h.putts}</b><button data-act="putts" data-v="1" aria-label="One more putt">+</button></span></div>
  <div class="btn-row"><button class="btn sec" data-act="undoShot">Undo shot</button><button class="btn pri" data-act="nextHole">${a.hole < 18 ? 'Next hole ›' : 'Finish round'}</button></div>`;
}

function courseRecapView(id) {
  const sess = S().sessions.find(s => s.id === id);
  if (!sess) return `<div class="top">${back('', 'Home')}</div><h1>Round not found</h1>`;
  const rc = courseRecap(sess);
  const max = Math.max(1, ...rc.buckets.map(b => b.w));
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <span class="lbl">Round recap · ${fmtDate(sess.ended)} · ${rc.holes} holes · ${rc.strokes} strokes</span>
  <h1>${esc(rc.headline)}</h1>
  <div class="card">${rc.lines.map(l => `<p>${esc(l)}</p>`).join('') || '<p>No obvious leaks. Nice round.</p>'}</div>
  <div class="card soft"><span class="lbl">Where it leaked</span><div class="bars">${rc.buckets.map((b, i) => `<div class="bar-row"><span ${i === 0 ? 'style="font-weight:700"' : ''}>${b.name}</span><span class="track"><span class="fill ${i === 0 ? 'gold' : ''}" style="width:${Math.round(b.w / max * 100)}%"></span></span><span class="mono" style="text-align:right">${b.n} ${b.unit}</span></div>`).join('')}</div>
    <span class="muted" style="font-size:13px">Approach play drives most of the scoring gap between golfers (Broadie, strokes gained).</span></div>
  <div class="spacer"></div>
  ${rc.plan ? `<div class="card hero"><span class="lbl">Next practice</span><span>Range: ${rc.plan.range.map(i => esc(drillById(i).name)).join(', ')}<br>Putting: ${rc.plan.putt.map(i => esc(drillById(i).name)).join(', ')}</span>
    <button class="btn goldbtn" data-act="roundPlan" data-r="${rc.plan.range.join(',')}" data-p="${rc.plan.putt.join(',')}">Add to next session</button></div>` : ''}`;
}

// ---------- play ----------
function playSetup() {
  const c = S().conditions;
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <div class="tile hero" style="min-height:150px">${caddyGlyph(128, 'g-gold at-bottom', 'var(--hero)')}
    <span class="lbl">Caddy: Play</span><h2>Today’s conditions</h2><span class="readout">Set once. Carries and lies adjust from here.</span></div>
  <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">Temperature</span><span class="big" style="font-size:26px">${c.temp}°F</span></div>
  <input type="range" min="30" max="105" step="1" value="${c.temp}" data-input="temp" aria-label="Temperature in °F">
  <span class="lbl">Moisture</span>
  <div class="seg">${['dry', 'normal', 'wet'].map(m => `<button class="${c.moisture === m ? 'on' : ''}" data-act="moist" data-v="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
  <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="lbl">Elevation</span><span class="mono">${c.elev.toLocaleString()} ft</span></div>
  <input type="range" min="0" max="8000" step="250" value="${c.elev}" data-input="elev" aria-label="Elevation in feet">
  <span class="lbl">Difficulty</span>
  <div class="seg">${['easy', 'medium', 'hard'].map(m => `<button class="${c.difficulty === m ? 'on' : ''}" data-act="diff" data-v="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
  <p class="helper">${esc(DIFFICULTY[c.difficulty])}</p>
  <div class="spacer"></div>
  <button class="btn pri" data-act="openCaddy">Open caddy</button>`;
}

function caddy() {
  const st = S();
  const cad = st.caddy, c = st.conditions;
  const rel = reliability(st);
  const rec = recommend(st, rel);
  const sheet = cad.tab !== 'lie';
  const sf = SURFACES[cad.surface], sl = SLOPES[cad.slope];
  const lieName = `${sf.name.toLowerCase()}, ${cad.slope === 'flat' ? 'flat' : sl.name.toLowerCase()}${cad.steep && cad.slope !== 'flat' ? ' (steep)' : ''}`;
  const pickId = rec.pick && rec.pick.c.id;
  const rows = inBag().map(cl => {
    const r = rel.clubs[cl.id];
    const adj = adjustedCarry(cl, c, rec.choke);
    return `<div class="club-row ${cl.id === pickId ? 'pick' : r && r.top ? 'top' : ''}"><span class="nm">${r && r.top ? '★ ' : ''}${esc(cl.name)}</span><span class="mono">${adj}</span>${relRow(r, r && r.top)}</div>`;
  }).join('');
  const lieTab = `
    <span class="lbl">Surface</span>
    <div class="chips">${Object.entries(SURFACES).map(([k, v]) => `<button class="chip ${cad.surface === k ? 'on' : ''}" data-act="surface" data-v="${k}">${v.name}</button>`).join('')}</div>
    <span class="lbl">Slope</span>
    <div class="grid3">${Object.entries(SLOPES).map(([k, v]) => `<button class="chip sq ${cad.slope === k ? 'on' : ''}" data-act="slope" data-v="${k}">${v.name}</button>`).join('')}
      <button class="chip sq ${cad.steep ? 'on' : ''}" data-act="steep" aria-pressed="${cad.steep}">Steep slope</button></div>`;
  const sheetTab = `
    <div class="table-head lbl"><span>Club</span><span>Carry</span><span>Reliability</span></div>
    <div style="display:flex;flex-direction:column;gap:3px">${rows}</div>
    <p class="helper">${esc(rec.notes.join(' '))}</p>`;
  return `
  <div class="top">${back('play', 'Setup')}<span class="title-sm">${caddyGlyph(30, 'g-gold')}Caddy</span>${themeBtn()}</div>
  <div class="card" style="gap:4px">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="big">${cad.target} <span class="muted" style="font-size:16px;font-family:Inter,sans-serif;font-weight:400">yds to pin</span></span><span class="lbl">10-yd steps</span></div>
    <input type="range" min="50" max="250" step="10" value="${cad.target}" data-input="target" aria-label="Yards to pin, in 10-yard steps">
    <div class="ticks"><span>50</span><span>100</span><span>150</span><span>200</span><span>250</span></div>
  </div>
  <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;font-size:14px;column-gap:8px"><span class="muted">${c.temp}°F · ${c.moisture} · ${c.difficulty}</span><button class="back" data-act="tab" data-v="lie" style="color:var(--brand);font-weight:700;padding:8px 0">Lie: ${esc(lieName)} ›</button></div>
  <nav class="seg" aria-label="Caddy tabs"><button class="${sheet ? 'on' : ''}" data-act="tab" data-v="sheet" aria-current="${sheet ? 'page' : 'false'}">Cheat sheet</button><button class="${!sheet ? 'on' : ''}" data-act="tab" data-v="lie" aria-current="${!sheet ? 'page' : 'false'}">Lie</button></nav>
  <div id="swipe" style="display:flex;flex-direction:column;gap:10px">${sheet ? sheetTab : lieTab}</div>
  <div class="spacer"></div>
  <div class="shotcard" aria-live="polite">
    <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="h2">${rec.pick ? esc(rec.pick.c.name) + (rec.choke ? ', choked down' : ', stock swing') : 'No club fits'}</span><span class="lbl">Shot card</span></div>
    <span class="muted">Plays like ${rec.playsLike} · ${esc(rec.aim)} ${esc(rec.swing)}</span>
    <span class="muted" style="font-size:14px">${esc(rec.reason)}</span>
    ${rec.watch ? `<span class="muted" style="font-size:14px"><b style="color:var(--heroInk)">Watch:</b> ${esc(rec.watch)}</span>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px"><span class="ev">${rec.evidence}</span><button class="back" data-act="tab" data-v="${sheet ? 'lie' : 'sheet'}" style="color:var(--heroInk);font-weight:700">${sheet ? 'Swipe for lie ›' : '‹ Swipe for carries'}</button></div>
  </div>`;
}

// ---------- bag ----------
function bag() {
  const st = S();
  const rel = reliability(st);
  const banner = !rel.anyUnlocked ? `
    <div class="card hero" role="status">
      <div style="display:flex;align-items:center;gap:10px"><span style="color:var(--gold)">${lockIcon}</span><span class="h2">No reliability scores yet</span></div>
      <p class="muted">A club gets a score after <b style="color:var(--heroInk)">${RELIABILITY.sessionsRequired} practice sessions</b> with it, so one great or awful day can’t fool your caddy. Until then, the caddy picks clubs by carry alone.</p>
      <div style="display:flex;gap:6px" aria-label="${Math.min(rel.rangeSessions, 3)} of 3 sessions logged">${[0, 1, 2].map(i => `<span style="flex:1;height:8px;border-radius:4px;background:${i < rel.rangeSessions ? 'var(--gold)' : 'var(--heroInk2)'};opacity:${i < rel.rangeSessions ? 1 : 0.35}"></span>`).join('')}</div>
      <span class="muted mono" style="font-size:13px">${Math.min(rel.rangeSessions, 3)} of 3 range sessions logged</span>
      <div class="btn-row"><a class="btn goldbtn" href="#/bag/how" style="min-height:46px;font-size:15px">Why three?</a><button class="btn sec" data-act="sample" style="min-height:46px;font-size:15px;background:transparent;color:var(--heroInk);border-color:var(--heroInk)">Try sample data</button></div>
    </div>` : '';
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <div style="display:flex;align-items:center;justify-content:space-between"><span style="display:flex;align-items:center;gap:10px">${bagGlyph(42, 'g-brand')}<h1>My bag</h1></span><span class="muted mono" style="font-size:12px">70°F · sea level</span></div>
  <div class="seg">${['right', 'left'].map(h => `<button class="${st.hand === h ? 'on' : ''}" data-act="hand" data-v="${h}">${h === 'right' ? 'Right-handed' : 'Left-handed'}</button>`).join('')}</div>
  ${banner}
  <div class="lbl bag-grid bag-head"><span>Club</span><span>Full</span><span>Choked</span><span>Reliability</span><span></span></div>
  <div style="display:flex;flex-direction:column;gap:4px">${st.bag.map(c => {
    const r = rel.clubs[c.id];
    const top = !c.out && r && r.top;
    const loft = c.kind === 'wedge' || c.loft != null
      ? `<label class="loft"><input inputmode="numeric" data-loft="${c.id}" value="${c.loft != null ? c.loft : ''}" placeholder="--" aria-label="${esc(c.name)} loft in degrees" ${c.out ? 'disabled' : ''}>°</label>` : '';
    const x = c.out
      ? `<button class="x-btn back-in" data-act="toggleOut" data-v="${c.id}" aria-label="Put ${esc(c.name)} back in the bag">↺</button>`
      : `<button class="x-btn" data-act="toggleOut" data-v="${c.id}" aria-label="Remove ${esc(c.name)} from the bag">×</button>`;
    const relCell = c.out
      ? `<span class="out-note">Out of bag${c.custom ? ` · <button class="link-btn" data-act="deleteClub" data-v="${c.id}">Delete</button>` : ''}</span>`
      : relRow(r, top);
    return `<div class="club-row bag-grid ${top ? 'top' : ''} ${c.out ? 'out' : ''}"><span class="nm-cell"><span class="nm">${top ? '★ ' : ''}${esc(c.name)}</span>${loft}</span>
      <input inputmode="numeric" data-carry="${c.id}" data-field="carry" value="${c.carry}" aria-label="${esc(c.name)} full carry" ${c.out ? 'disabled' : ''}>
      <input inputmode="numeric" data-carry="${c.id}" data-field="choked" value="${c.choked}" aria-label="${esc(c.name)} choked carry" ${c.out ? 'disabled' : ''}>
      ${relCell}${x}</div>`;
  }).join('')}</div>
  ${(() => { const n = st.bag.filter(c => c.custom).length; return `<button class="btn dash" data-act="addClub" ${n >= MAX_CUSTOM_CLUBS ? 'disabled style="opacity:.5"' : ''}>+ Add a club&nbsp;<span class="muted" style="font-weight:400">(${n} of ${MAX_CUSTOM_CLUBS} custom)</span></button>`; })()}
  <a class="setup-row" href="#/bag/how" style="text-decoration:none"><span>How reliability works</span><span class="chev">›</span></a>
  <div class="btn-row"><button class="btn ghost" data-act="export">Export data</button><button class="btn ghost" data-act="reset">Reset all</button></div>`;
}

function bagHow() {
  return `
  <div class="top">${back('bag', 'My bag')}${themeBtn()}</div>
  <h1>Club reliability</h1>
  <div class="card"><span class="lbl">A sliding scale, measured against you</span>
    <svg viewBox="0 0 326 58" role="img" aria-label="Scale from 0 to 100. 50 marks your average club." style="width:100%;height:auto">
      <defs><linearGradient id="rg" x1="0" x2="1"><stop offset="0" style="stop-color:var(--sf2)"/><stop offset="0.5" style="stop-color:var(--brand)"/><stop offset="1" style="stop-color:var(--gold)"/></linearGradient></defs>
      <rect x="0" y="22" width="326" height="12" rx="6" fill="url(#rg)"/><line x1="163" y1="16" x2="163" y2="40" class="s-ink" stroke-width="2"/>
      <text x="163" y="54" text-anchor="middle" font-size="12" class="f-ink2">50 = your average</text><text x="0" y="54" font-size="12" class="f-ink2">Shaky</text><text x="326" y="54" text-anchor="end" font-size="12" class="f-ink2">Trusted</text></svg></div>
  <div class="card"><span class="lbl">What goes into it</span>
    <div style="display:flex;height:14px;border-radius:7px;overflow:hidden" aria-hidden="true"><span style="width:50%;background:var(--brand)"></span><span style="width:30%;background:var(--gold)"></span><span style="width:20%;background:var(--ink2)"></span></div>
    <span><b class="t-brand">50% contact</b> · solid strikes<br><b class="t-gold">30% direction</b> · finished on line<br><b>20% distance</b> · carry spread when logged, otherwise pin-high finishes</span></div>
  <div class="card"><span class="lbl">It moves with you</span>
    <p class="muted">Each newer session counts more (older ones fade by 15% per session), so scores slide up as you improve and down if a club goes cold. Scores compare each club with your overall average, so 50 is a typical club for you.</p></div>
  <div class="card hero"><p><b>Unlocks after ${RELIABILITY.sessionsRequired} practice sessions</b> with that club, each with at least ${RELIABILITY.minShotsPerSession} balls.</p>
    <p class="muted">When two clubs can reach, your caddy picks the more reliable one. Your top three are starred.</p></div>`;
}

// ---------- overlays ----------
function closeOverlays() { document.querySelectorAll('.sheet-wrap,.modal-wrap').forEach(n => n.remove()); }
function openOverlay(html) { closeOverlays(); document.body.insertAdjacentHTML('beforeend', html); }

function askNumber(title, value, onOk) {
  openOverlay(`<div class="modal-wrap"><div class="modal" role="dialog" aria-label="${esc(title)}"><h2>${esc(title)}</h2>
    <input type="number" inputmode="numeric" id="numIn" value="${value}" aria-label="${esc(title)}">
    <div class="btn-row"><button class="btn sec" data-modal="cancel">Skip</button><button class="btn pri" data-modal="ok">Save</button></div></div></div>`);
  const wrap = document.querySelector('.modal-wrap');
  const inp = document.getElementById('numIn');
  inp.focus(); inp.select();
  wrap.addEventListener('click', e => {
    const m = e.target.closest('[data-modal]');
    if (!m && e.target !== wrap) return;
    if (m && m.dataset.modal === 'ok') { const v = parseInt(inp.value, 10); if (!isNaN(v)) onOk(v); }
    wrap.remove();
  });
}

// Custom club: name, type, optional loft, full carry. Placed in the bag by carry.
function askClub() {
  if (S().bag.filter(c => c.custom).length >= MAX_CUSTOM_CLUBS) return toast(`Up to ${MAX_CUSTOM_CLUBS} custom clubs`);
  const kinds = [['wood', 'Wood'], ['hybrid', 'Hybrid'], ['iron', 'Iron'], ['wedge', 'Wedge']];
  openOverlay(`<div class="modal-wrap"><div class="modal club-form" role="dialog" aria-label="Add a club"><h2>Add a club</h2>
    <label class="lbl" for="cName">Name</label><input id="cName" type="text" maxlength="14" placeholder="e.g. 4-hybrid, 2-iron, 64° wedge">
    <span class="lbl">Type</span><div class="grid4">${kinds.map(([k, n], i) => `<button class="chip sq ${i === 1 ? 'on' : ''}" data-kind="${k}">${n}</button>`).join('')}</div>
    <div class="two"><label><span class="lbl">Full carry (yds)</span><input id="cCarry" type="number" inputmode="numeric" placeholder="180"></label>
    <label><span class="lbl">Loft (°, optional)</span><input id="cLoft" type="number" inputmode="numeric" placeholder="--"></label></div>
    <div class="btn-row"><button class="btn sec" data-modal="cancel">Cancel</button><button class="btn pri" data-modal="ok">Add</button></div></div></div>`);
  const wrap = document.querySelector('.modal-wrap');
  let kind = 'hybrid';
  document.getElementById('cName').focus();
  wrap.addEventListener('click', e => {
    const k = e.target.closest('[data-kind]');
    if (k) { kind = k.dataset.kind; wrap.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('on', b === k)); return; }
    const m = e.target.closest('[data-modal]');
    if (!m && e.target !== wrap) return;
    if (m && m.dataset.modal === 'ok') {
      const name = document.getElementById('cName').value.trim();
      const carry = parseInt(document.getElementById('cCarry').value, 10);
      const loftRaw = document.getElementById('cLoft').value.trim();
      const loft = loftRaw === '' ? null : parseInt(loftRaw, 10);
      if (!name) return toast('Give the club a name');
      if (isNaN(carry) || carry < 20 || carry > 400) return toast('Enter a full carry between 20 and 400 yards');
      if (loft != null && (isNaN(loft) || loft < 5 || loft > 70)) return toast('Loft should be between 5° and 70°');
      const c = { id: 'c' + uid(), name, kind, carry, choked: Math.max(20, Math.round(carry * 0.95)), custom: true, ...(loft != null ? { loft } : {}) };
      update(s => { s.bag.push(c); s.bag.sort((a, b) => b.carry - a.carry); });
      toast(`${name} added`); render();
    }
    wrap.remove();
  });
}

// ---------- target interaction ----------
let gesture = null, pressTimer = null;

function bindTarget(kind) {
  const svg = app.querySelector('[data-target]');
  if (!svg) return;
  svg.addEventListener('pointerdown', e => {
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    const p = toViewBox(svg, e.clientX, e.clientY);
    gesture = { pts: [p], t: Date.now(), long: false };
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => { if (gesture && gesture.pts.length < 4) gesture.long = true; }, 550);
  });
  svg.addEventListener('pointermove', e => {
    if (!gesture) return;
    const p = toViewBox(svg, e.clientX, e.clientY);
    const l = gesture.pts[gesture.pts.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) < 3) return;
    gesture.pts.push(p);
    if (kind === 'range' && gesture.pts.length > 3) {
      let path = svg.querySelector('.t-drag');
      if (!path) { path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', 't-drag'); svg.appendChild(path); }
      path.setAttribute('d', 'M' + gesture.pts.map(q => `${q.x} ${q.y}`).join(' L'));
    }
  });
  const end = e => {
    if (!gesture) return;
    clearTimeout(pressTimer);
    const g = gesture; gesture = null;
    const p = g.pts[g.pts.length - 1];
    if (kind === 'putt') return logPutt(p);
    const curve = curveFromPath(g.pts);
    rangeInput(g.pts[0], p, curve, g.long);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', () => { gesture = null; clearTimeout(pressTimer); });
}

function rangeInput(start, p, curve, long) {
  const a = S().active;
  const cl = club(a.club);
  const view = viewFor(cl.kind, a.type);
  const hand = S().hand;
  const hit = hitTest(view, p.x, p.y, hand);
  if (!hit) return;
  const cn = curve ? curveName(curve, hand) : null;
  const clearPos = { ft: null, dx: null, dy: null, holed: false };
  update(s => {
    const pd = s.active.pending = s.active.pending || {};
    if (cn) pd.curve = cn;
    if (hit.kind === 'ball' && !curve) {            // contact; tap the same spot again to clear it
      let sector = hit.sector;
      if (long) sector = sector === 'thin' ? 'top' : sector === 'heel' ? 'shank' : sector;
      pd.contact = pd.contact === sector ? null : sector;
    } else if (hit.kind === 'ball') {               // a drag that ends on the ball: on target
      Object.assign(pd, clearPos, view === 'green' ? { row: 'pin', col: 'line', x: 179, y: 136 } : { row: 'pin', col: 'line', x: 179, y: 108 });
    } else if (hit.kind === 'chunk') {
      Object.assign(pd, clearPos, { contact: 'chunk', row: 'short', col: hit.col, x: p.x, y: p.y });
    } else if (hit.kind === 'tee') {
      Object.assign(pd, clearPos, { contact: 'skied', row: 'short', col: 'line', x: p.x, y: p.y });
    } else if (hit.kind === 'grass') {
      Object.assign(pd, clearPos, { row: hit.row, col: hit.col, x: p.x, y: p.y });
    } else if (hit.kind === 'green') {
      Object.assign(pd, { row: hit.row, col: hit.col, ft: hit.ft, dx: hit.dx, dy: hit.dy, holed: !!hit.holed, x: p.x, y: p.y });
    }
  });
  if (navigator.vibrate) navigator.vibrate(6);
  render();
}

function commitShot(part, view) {
  const a = S().active;
  const d = currentDrill(a);
  const pend = a.pending || {};
  const shot = { t: Date.now(), drill: d.id, club: a.club, type: a.type, view, hand: S().hand, height: pend.height || null, carry: null, ...part };
  if (!shot.curve) shot.curve = null;
  let advanced = false;
  update(s => {
    s.active.shots.push(shot);
    s.active.pending = {};
    if (navigator.vibrate) navigator.vibrate(12);
    const n = s.active.shots.filter(x => x.drill === d.id).length;
    if (n >= d.balls && s.active.di < s.active.drills.length - 1) {
      s.active.di++;
      const nd = currentDrill(s.active);
      s.active.club = nd.club; s.active.type = nd.type;
      advanced = nd.name;
    }
  });
  if (advanced) toast(`${d.name} done. Next: ${advanced}`);
  else if (drillShots(S().active).length === d.balls) toast(`${d.name} done. Tap Finish when ready.`);
  render();
}

// Carry belongs to the shot being filled in.
function promptCarry() {
  const a = S().active;
  const pd = a.pending || {};
  askNumber('Carry yards', pd.carry != null ? pd.carry : club(a.club).carry, v => { update(s => { s.active.pending = { ...(s.active.pending || {}), carry: v }; }); render(); });
}

// A tap fills in the putt being logged; Next shot saves it.
function logPutt(p) {
  const hit = hitTest('putt', p.x, p.y, S().hand);
  update(s => {
    const lip = !!(s.active.ppend && s.active.ppend.lip);
    s.active.ppend = hit.kind === 'made'
      ? { made: true }
      : { made: false, ft: hit.ft, dx: hit.dx, dy: hit.dy, side: hit.side, len: hit.len, lip, x: p.x, y: p.y };
  });
  if (navigator.vibrate) navigator.vibrate(6);
  render();
}

function commitPutt() {
  const a = S().active;
  const pd = a.ppend || {};
  if (!hasPutt(pd)) return toast('Tap where it stopped, or pick distance or direction');
  const d = drillById(a.drills[a.di]);
  const putt = draftPutt(a, pd);
  let advanced = false;
  update(s => {
    s.active.putts.push(putt);
    s.active.ppend = {};
    const n = s.active.putts.filter(x => x.drill === d.id).length;
    if (n >= d.putts && s.active.di < s.active.drills.length - 1) {
      s.active.di++;
      const nd = drillById(s.active.drills[s.active.di]);
      s.active.dist = nd.dist; s.active.brk = nd.brk; advanced = nd.name;
    }
  });
  if (navigator.vibrate) navigator.vibrate(putt.made ? [10, 40, 10] : 12);
  if (advanced) toast(`${d.name} done. Next: ${advanced}`);
  render();
}

function bindSwipe() {
  const el = document.getElementById('swipe');
  if (!el) return;
  let x0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) < 60) return;
    update(s => { s.caddy.tab = dx < 0 ? 'lie' : 'sheet'; });
    render();
  });
}

// ---------- actions ----------
const actions = {
  warmRoutine: () => { ui.wuAuto = true; go('warmup/' + WARMUP[0].id); },
  warmGo: () => {
    if (wu.phase === 'work') {
      wu.ms = Math.max(0, wu.end - Date.now()); wu.left = Math.ceil(wu.ms / 1000);
      stopWarm(); wu.phase = 'paused'; paintWarm(); return;
    }
    if (wu.phase === 'paused') { runWarm('work', wu.ms / 1000); return; }
    runWarm('work', WORK); // idle, done, or skipping the get-ready countdown
  },
  theme: () => { update(s => { s.theme = s.theme === 'night' ? 'day' : 'night'; }); render(); },
  rangeCat: v => { ui.rangeCat = v; render(); },
  pickRange: v => { ui.rangePick.has(v) ? ui.rangePick.delete(v) : ui.rangePick.add(v); render(); },
  startRange: () => {
    const drills = RANGE_DRILLS.filter(d => ui.rangePick.has(d.id)).map(d => d.id);
    if (!drills.length) return;
    if (S().active) finishActive();
    const first = drillById(drills[0]);
    update(s => { s.active = { kind: 'range', id: uid(), started: Date.now(), drills, di: 0, club: first.club, type: first.type, shots: [], pending: {} }; });
    ui.rangePick = null;
    go('range/log');
  },
  openShotSetup: () => openOverlay(shotSetupSheet()),
  setClub: v => { update(s => { s.active.club = v; const k = club(v).kind; if (s.active.type === 'tee' && !['wood', 'hybrid'].includes(k)) s.active.type = 'full'; s.active.pending = {}; }); render(); openOverlay(shotSetupSheet()); },
  setType: v => { update(s => { s.active.type = v; if (v === 'tee' && !['wood', 'hybrid'].includes(club(s.active.club).kind)) s.active.club = 'D'; if ((v === 'pitch' || v === 'chip') && club(s.active.club).kind !== 'wedge') s.active.club = '56'; s.active.pending = {}; }); render(); openOverlay(shotSetupSheet()); },
  closeSheet: () => closeOverlays(),
  height: v => { update(s => { s.active.pending = { ...(s.active.pending || {}), height: v }; }); render(); },
  curve: v => { update(s => { s.active.pending = { ...(s.active.pending || {}), curve: v }; }); render(); },
  undo: () => { update(s => { if (hasDraft(s.active.pending)) s.active.pending = {}; else s.active.shots.pop(); }); render(); },
  setContact: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.contact = pd.contact === v ? null : v; }); render(); },
  setLen: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.row = pd.row === v ? null : v; Object.assign(pd, { x: null, y: null, ft: null, dx: null, dy: null, holed: false }); }); render(); },
  setDir: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.col = pd.col === v ? null : v; Object.assign(pd, { x: null, y: null, ft: null, dx: null, dy: null, holed: false }); }); render(); },
  nextShot: () => {
    const a = S().active; const pd = a.pending || {};
    if (!hasDraft(pd)) return toast('Mark contact, length or direction first');
    commitShot(draftPart(pd), viewFor(club(a.club).kind, a.type));
  },
  carry: () => promptCarry(),
  nextDrill: () => {
    const a = S().active;
    if (a.di < a.drills.length - 1) { update(s => { s.active.di++; const nd = currentDrill(s.active); s.active.club = nd.club; s.active.type = nd.type; s.active.pending = {}; }); render(); }
    else actions.endRange();
  },
  endRange: () => { const id = finishActive(); id ? go('range/recap/' + id) : go('practice'); },
  savePlan: (v, el) => {
    const kind = el.dataset.kind;
    update(s => { s.plan = { ...(s.plan || {}), [kind]: v.split(','), from: 'last session' }; });
    toast('Plan saved. It’s pre-selected next time.');
  },
  puttCat: v => { ui.puttCat = v; render(); },
  pickPutt: v => { ui.puttPick.has(v) ? ui.puttPick.delete(v) : ui.puttPick.add(v); render(); },
  startPutt: () => {
    const drills = PUTT_DRILLS.filter(d => ui.puttPick.has(d.id)).map(d => d.id);
    if (!drills.length) return;
    if (S().active) finishActive();
    const first = drillById(drills[0]);
    update(s => { s.active = { kind: 'putt', id: uid(), started: Date.now(), drills, di: 0, dist: first.dist, brk: first.brk, putts: [] }; });
    ui.puttPick = null;
    go('putt/log');
  },
  openPuttSetup: () => openOverlay(puttSetupSheet()),
  setDist: v => { update(s => { s.active.dist = +v; }); render(); openOverlay(puttSetupSheet()); },
  setBreak: v => { update(s => { s.active.brk = v; }); render(); openOverlay(puttSetupSheet()); },
  undoPutt: () => { update(s => { if (hasPutt(s.active.ppend)) s.active.ppend = {}; else s.active.putts.pop(); }); render(); },
  puttResult: v => { update(s => {
    const pd = s.active.ppend = s.active.ppend || {};
    if (v === 'made') { s.active.ppend = pd.made ? {} : { made: true }; }
    else { pd.lip = !pd.lip; if (pd.lip) pd.made = false; }
  }); render(); },
  puttLen: v => { update(s => { const pd = s.active.ppend = s.active.ppend || {}; pd.made = false; pd.len = pd.len === v ? null : v; Object.assign(pd, { x: null, y: null, ft: null, dx: null, dy: null }); }); render(); },
  puttSide: v => { update(s => { const pd = s.active.ppend = s.active.ppend || {}; pd.made = false; pd.side = pd.side === v ? null : v; Object.assign(pd, { x: null, y: null, ft: null, dx: null, dy: null }); }); render(); },
  nextPutt: () => commitPutt(),
  nextPuttDrill: () => {
    const a = S().active;
    if (a.di < a.drills.length - 1) { update(s => { s.active.di++; const nd = drillById(s.active.drills[s.active.di]); s.active.dist = nd.dist; s.active.brk = nd.brk; }); render(); }
    else actions.endPutt();
  },
  endPutt: () => { const id = finishActive(); id ? go('putt/recap/' + id) : go('practice'); },
  hole: v => { update(s => { s.active.hole = +v; const h = s.active.holes[+v - 1]; s.active.draft = { club: h.par === 3 ? '7i' : 'D', from: h.shots.length ? 'fairway' : 'tee', result: null }; }); render(); },
  par: () => { update(s => { const h = s.active.holes[s.active.hole - 1]; h.par = h.par === 5 ? 3 : h.par + 1; if (!h.shots.length) s.active.draft.club = h.par === 3 ? '7i' : 'D'; }); render(); },
  draftFrom: v => { update(s => { s.active.draft.from = v; }); render(); },
  draftResult: v => { update(s => { s.active.draft.result = v; }); render(); },
  addShot: () => {
    update(s => {
      const a = s.active, h = a.holes[a.hole - 1], dr = a.draft;
      if (!dr.result) return;
      h.shots.push({ club: dr.club, from: dr.from, result: dr.result });
      const r = dr.result;
      const nextFrom = r === 'fairway' ? 'fairway' : r === 'penalty' ? 'rough' : ['left', 'right'].includes(r) ? 'rough' : ['short', 'long'].includes(r) ? 'fringe' : dr.from;
      const nextClub = nextFrom === 'fringe' ? '56' : (h.par === 5 && h.shots.length === 1 && r === 'fairway') ? '5H' : ['fairway', 'rough'].includes(nextFrom) ? '8i' : dr.club;
      a.draft = { club: nextClub, from: nextFrom, result: null };
      if (r === 'holed') h.putts = 0;
    });
    render();
  },
  undoShot: () => { update(s => { const h = s.active.holes[s.active.hole - 1]; h.shots.pop(); }); render(); },
  putts: v => { update(s => { const h = s.active.holes[s.active.hole - 1]; h.putts = Math.max(0, h.putts + +v); }); render(); },
  nextHole: () => { const a = S().active; if (a.hole < 18) actions.hole(a.hole + 1); else actions.finishRound(); },
  finishRound: () => { const id = finishActive(); id ? go('course/recap/' + id) : go('practice'); },
  roundPlan: (v, el) => { update(s => { s.plan = { range: el.dataset.r.split(','), putt: el.dataset.p.split(','), from: 'last round' }; }); go('practice'); },
  moist: v => { update(s => { s.conditions.moisture = v; s.conditions.set = true; }); render(); },
  diff: v => { update(s => { s.conditions.difficulty = v; s.conditions.set = true; }); render(); },
  openCaddy: () => { update(s => { s.conditions.set = true; }); go('caddy'); },
  tab: v => { update(s => { s.caddy.tab = v; }); render(); },
  surface: v => { update(s => { s.caddy.surface = v; }); render(); },
  slope: v => { update(s => { s.caddy.slope = v; }); render(); },
  steep: () => { update(s => { s.caddy.steep = !s.caddy.steep; }); render(); },
  hand: v => { update(s => { s.hand = v; }); render(); },
  toggleOut: v => {
    const c = S().bag.find(x => x.id === v);
    if (!c) return;
    if (!c.out && inBag().length <= 1) return toast('Keep at least one club in the bag');
    update(s => { const k = s.bag.find(x => x.id === v); k.out = !k.out; });
    toast(c.out ? `${c.name} back in the bag` : `${c.name} out of the bag`); render();
  },
  deleteClub: v => {
    const c = S().bag.find(x => x.id === v);
    if (!c || !c.custom) return;
    if (!confirm(`Delete ${c.name}? Logged shots stay in your history.`)) return;
    update(s => { s.bag = s.bag.filter(x => x.id !== v); }); render();
  },
  addClub: () => askClub(),
  sample: () => {
    if (!confirm('Add sample practice history so you can try reliability and recaps? You can reset it later from My bag.')) return;
    update(s => { s.sessions = s.sessions.concat(makeSample()); });
    toast('Sample history added'); render();
  },
  export: () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `coach-caddy-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  },
  reset: () => { if (confirm('Erase all sessions, bag numbers and settings on this phone?')) { resetAll(); ui = {}; go(''); render(); } },
};

document.addEventListener('click', e => {
  const yt = e.target.closest('a[data-yt]');
  if (yt) { if (openYouTube(yt.dataset.yt)) e.preventDefault(); return; } // never toggles the drill card
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.classList.contains('sheet-wrap') && e.target !== el) return; // clicks inside the sheet
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset.v, el); }
});

document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
});

document.addEventListener('input', e => {
  const k = e.target.dataset.input;
  if (!k) return;
  const v = +e.target.value;
  if (k === 'target') {
    update(s => { s.caddy.target = v; });
    const big = app.querySelector('.big');
    if (big && big.firstChild) big.firstChild.textContent = v + ' ';
  }
  if (k === 'temp' || k === 'elev') {
    update(s => { s.conditions[k] = v; s.conditions.set = true; });
    const r = route();
    if (r.a === 'play') { // update labels without losing slider focus
      const labels = app.querySelectorAll('.big, .mono');
      if (k === 'temp' && labels[0]) labels[0].textContent = `${v}°F`;
      if (k === 'elev') { const m = [...app.querySelectorAll('.mono')].find(x => x.textContent.includes(' ft')); if (m) m.textContent = `${v.toLocaleString()} ft`; }
    }
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.act === 'draftClub') { update(s => { s.active.draft.club = t.value; }); return; }
  if (t.dataset.input) { render(); return; }
  if (t.dataset.loft) {
    const raw = t.value.trim();
    const v = raw === '' ? null : parseInt(raw, 10);
    if (v != null && (isNaN(v) || v < 5 || v > 70)) { toast('Loft should be between 5° and 70°'); render(); return; }
    update(s => { const c = s.bag.find(x => x.id === t.dataset.loft); c.loft = v; });
    toast('Saved'); return;
  }
  if (t.dataset.carry) {
    const v = parseInt(t.value, 10);
    if (isNaN(v) || v < 20 || v > 400) { toast('Enter yards between 20 and 400'); render(); return; }
    update(s => { const c = s.bag.find(x => x.id === t.dataset.carry); c[t.dataset.field] = v; });
    toast('Saved');
  }
});

window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
