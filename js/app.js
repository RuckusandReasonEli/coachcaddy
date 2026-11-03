// Coach Caddy app: hash router and screens.
import { S, update, uid, club, inBag, exportJSON, resetAll } from './store.js';
import { SHOT_TYPES, RANGE_DRILLS, PUTT_DRILLS, SURFACES, SLOPES, DIFFICULTY, RELIABILITY, MAX_CUSTOM_CLUBS, BASIC, LADDER_YDS, CLOCK, NINE_SEQ, PLAY9_HOLES } from './data.js';
import { viewFor, hitTest, curveFromPath, curveName, drawIrons, drawWoods, drawGreen, drawPutt, toViewBox, drawCarry, carryHit, drawFace, faceHit, shapeGlyph } from './targets.js';
import { describeShot, finishWords, rangeRecap, puttRecap, courseRecap, reliability, recommend, adjustedCarry, tempSummary, drillById, drillScores, clubTable, gapSuggest, targetWords, puttDrillScores, roundSummary, gir, scoreWord, toParText, lieWords } from './engine.js';
import { esc, insignia, caddyGlyph, golferGlyph, bagGlyph, sunIcon, moonIcon, lockIcon, checkOn, checkOff, scienceCard, science, drillGlyph, toast, ytLink, openYouTube, rangeScene, fairwayScene, clubShort, ic } from './ui.js';
import { makeSample } from './sample.js';
import { buildCSV, dataCounts, stamp, APP_VERSION } from './export.js';
import { STATES, searchCourses, loadCourse, hitName, hitLine, customCourse, courseStats } from './courses.js';
import { WARMUP, WARMUP_WORK as WORK, WARMUP_READY as READY } from './warmup.js';
import { tallyFor, rateWords, drillResult, sessionDrills, skillTrend, skillScore, BASELINE, stageClub, SKILLS, baselineSkills, recommend as recommendDrills, baselineHeadline, retestPlan, metric, drillImpact, DRILL_SKILL } from './practice.js';

const app = document.getElementById('app');
const TAG = 'Your data, your practice, your results.';  // full line lives in index.html and the manifest
let ui = {};                       // transient screen state (selections, open sheets)
let lastHash = null;               // render() resets the warm-up timer only when the route changes

// ---------- theme ----------
// Appearance follows the phone (Automatic) unless Day or Night is picked in Settings.
const darkQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function themeNow() { const t = S().theme; return t === 'night' || (t !== 'day' && darkQ && darkQ.matches) ? 'night' : 'day'; }
function applyTheme(r) {
  const t = themeNow();
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = r && r.a === '' ? (t === 'night' ? '#173F2F' : '#184A37') : (t === 'night' ? '#0D1612' : '#F6F3EA');
}
if (darkQ) { const f = () => applyTheme(route()); darkQ.addEventListener ? darkQ.addEventListener('change', f) : darkQ.addListener(f); }
function themeBtn() { return ''; } // appearance lives in Settings now

// Dynamic Type: text sizes are in rem, and the root follows the phone's text size (capped so one-screen layouts still fit).
function applyTextSize() {
  const root = document.documentElement;
  let px = 17;
  try {
    const p = document.createElement('span');
    p.style.font = '-apple-system-body';
    if (p.style.font) {
      root.classList.add('apple');
      p.style.position = 'absolute'; p.style.visibility = 'hidden';
      document.body.appendChild(p); px = parseFloat(getComputedStyle(p).fontSize) || 17; p.remove();
    }
  } catch (e) {}
  root.style.fontSize = Math.min(23, Math.max(14, px)) + 'px';
}
applyTextSize();
document.addEventListener('visibilitychange', () => { if (!document.hidden) applyTextSize(); });

// ---------- tab bar ----------
// Four peer areas. Full-screen tasks (loggers, the warm-up timer, hole scoring, the caddy) hide it.
function tabFor(r) {
  if (r.a === '' || r.a === 'settings') return 'home';
  if (r.a === 'practice' || (r.a === 'warmup' && !r.b) || ((r.a === 'range' || r.a === 'putt') && r.b !== 'log' && r.b !== 'drill') || (r.a === 'baseline' && r.b)) return 'practice';
  if (r.a === 'play' || ((r.a === 'round' || r.a === 'course') && r.b === 'recap')) return 'play';
  if (r.a === 'bag') return 'bag';
  return null;
}
function tabBar(cur) {
  const tabs = [['home', '', 'Home'], ['practice', 'practice', 'Practice'], ['play', 'play', 'Play'], ['bag', 'bag', 'My bag']];
  return `<nav class="tabbar" aria-label="Main">${tabs.map(([k, href, name]) => `<a href="#/${href}" class="${k === cur ? 'on' : ''}"${k === cur ? ' aria-current="page"' : ''}>${ic(k, 26)}<span>${name}</span></a>`).join('')}</nav>`;
}

// ---------- routing ----------
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [a = '', b = '', c = ''] = h.split('/');
  return { a, b, c };
}
function go(path) { location.hash = '#/' + path; }

// Re-rendering after a tap keeps scroll positions; only a new route starts at the top.
let lastPick = null;
function render() {
  const r = route();
  applyTheme(r);
  const same = location.hash === lastHash;
  if (!same) {
    stopWarm(); wu.phase = 'idle'; ui.openDetail = null;
    if (r.a !== 'warmup' || !r.b) ui.wuChain = false;
  }
  const keep = {};
  if (same) app.querySelectorAll('[data-keep]').forEach(el => { keep[el.dataset.keep] = el.scrollTop; });
  const winY = window.scrollY;
  closeOverlays();
  let html;
  switch (r.a) {
    case '': html = home(); break;
    case 'practice': html = r.b === 'helps' ? helpsView() : practice(); break;
    case 'baseline': html = r.b === 'result' ? baselineResultView(r.c) : r.b === 'retest' ? retestResultView(r.c) : testLog(); break;
    case 'warmup': html = r.b ? warmMove(r.b) : warmList(); break;
    case 'range': html = r.b === 'log' ? rangeLog() : r.b === 'drill' ? drillResultView('range') : r.b === 'recap' ? rangeRecapView(r.c) : rangePick(); break;
    case 'putt': html = r.b === 'log' ? puttLog() : r.b === 'drill' ? drillResultView('putt') : r.b === 'recap' ? puttRecapView(r.c) : puttPick(); break;
    case 'course': html = r.b === 'recap' ? courseRecapView(r.c) : (S().active && S().active.kind === 'course') ? courseLog() : (go('play'), ''); break;
    case 'play': html = r.b === 'course' ? coursePreview() : r.b === 'conditions' ? playSetup() : playStart(); break;
    case 'round': html = r.b === 'recap' ? roundRecapView(r.c) : roundHole(); break;
    case 'caddy': html = caddy(); break;
    case 'bag': html = r.b === 'how' ? bagHow() : bag(); break;
    case 'settings': html = settings(); break;
    default: html = home();
  }
  // Screens with a pinned action bar, a tab bar (or marked data-shell) fill exactly one screen height.
  const tab = tabFor(r);
  const shell = !!tab || html.includes('class="bar') || html.includes('data-shell');
  app.classList.toggle('shell-app', shell);
  app.classList.toggle('has-tabs', !!tab);
  app.innerHTML = `<main class="screen${shell ? ' shell' : ''}">${html}${tab ? tabBar(tab) : ''}</main>`;
  after(r);
  if (same) {
    app.querySelectorAll('[data-keep]').forEach(el => { if (keep[el.dataset.keep] != null) el.scrollTop = keep[el.dataset.keep]; });
    window.scrollTo(0, winY);
  } else window.scrollTo(0, 0);
  if (r.a === 'caddy') centerPick();
  if (ui.ddScroll) revealDetail();
  lastHash = location.hash;
}

function after(r) {
  if (r.a === 'range' && r.b === 'log') { bindTarget('range'); bindRail(); }
  if (r.a === 'baseline' && !r.b) bindTarget('range');
  if (r.a === 'putt' && r.b === 'log') bindTarget('putt');
  if (r.a === 'caddy') bindSwipe();
  if (r.a === 'round' && !r.b) bindHoleStrip();
  if (r.a === 'warmup' && r.b) {
    paintWarm();
    bindWarmSwipe(r.b);
    if (ui.wuChain && wu.phase === 'idle' && !wu.t) { ui.wuChain = false; runWarm('ready', READY); }
  }
}

// Caddy: bring the recommended club to the middle of the list when the pick changes.
function centerPick() {
  const pick = app.querySelector('.club-row.pick');
  const key = pick ? pick.dataset.club + '@' + S().caddy.target : null;
  if (pick && key !== lastPick) {
    const box = pick.closest('.scroll-y');
    if (box) box.scrollTop += pick.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - pick.offsetHeight) / 2;
  }
  lastPick = key;
}

// ---------- helpers ----------
const back = (to, label) => `<a class="back" href="#/${to}">${ic('back', 22)}<span>${esc(label)}</span></a>`;
const toParShort = d => d === 0 ? 'Even' : toParText(d);
const toParWords = d => d === 0 ? 'Even par' : d > 0 ? `${d} over par` : `${-d} under par`;
const nb = t => String(t).replace(/(\d) (ft|yds?|in|balls?|putts?|°F)\b/g, '$1\u00a0$2'); // keep numbers with their units
const sentence = t => t ? t[0].toUpperCase() + t.slice(1).toLowerCase() : t;
const chev = () => `<span class="chev">${ic('chev', 18)}</span>`;
const fmtDate = t => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const shotType = id => SHOT_TYPES.find(t => t.id === id) || SHOT_TYPES[0];

function finishActive() {
  const a = S().active;
  if (!a) return null;
  const has = a.kind !== 'baseline' && a.kind !== 'retest' && ((a.shots && a.shots.length) || (a.putts && a.putts.length) || (a.holes && a.holes.some(h => (h.shots && h.shots.length) || h.putts || h.strokes != null)));
  update(s => {
    if (has) s.sessions.push({ ...a, ended: Date.now(), pending: undefined });
    s.active = null;
  });
  return has ? a.id : null;
}

function updHole(fn) { update(s => fn(s.active.holes[s.active.hole])); render(); }

function relRow(r, top) {
  if (!r || r.locked) return `<span class="locked" title="Sessions logged with this club">${lockIcon}${r ? r.sessions : 0}/${RELIABILITY.sessionsRequired}<span class="sess"> sessions</span></span>`;
  return `<span class="rel"><span class="track"><span class="fill ${top ? 'gold' : ''}" style="width:${r.score}%"></span></span><b>${r.score}</b></span>`;
}

// ---------- home ----------
// Progress toward the first reliability rating: the club closest to unlocking sets the count.
function relWait(rel) {
  const need = RELIABILITY.sessionsRequired;
  const best = Math.min(need, Math.max(0, ...Object.values(rel.clubs).map(v => v.sessions || 0)));
  const segs = Array.from({ length: need }, (_, i) => `<span class="${i < best ? 'on' : ''}"></span>`).join('');
  return `<span class="rel-meter" role="img" aria-label="${best} of ${need} sessions">${segs}</span>
    <span class="muted">${best} of ${need} sessions logged. Your first club rating unlocks at ${need}.</span>`;
}

function home() {
  const st = S();
  const rel = reliability(st);
  const since = Date.now() - 30 * 86400000;
  const recent = st.sessions.filter(s => ['range', 'baseline', 'retest'].includes(s.kind) && s.ended > since);
  const shots = recent.flatMap(s => s.shots);
  const withC = shots.filter(x => x.contact);
  const solid = withC.length ? Math.round(withC.filter(x => ['pure', 'solid'].includes(x.contact)).length / withC.length * 100) : null;
  const top = Object.entries(rel.clubs).filter(([, v]) => v.top).sort((a, b) => b[1].score - a[1].score);
  const last = st.sessions.slice().sort((a, b) => b.ended - a.ended)[0];
  let take = '';
  if (last) {
    const tk = takeaway(last, st);
    take = `<a class="card mini clamp2" href="#/${tk.href}" style="text-decoration:none;color:inherit"><span class="lbl">Last takeaway · ${fmtDate(last.ended)}</span><span>${esc(tk.text)}</span></a>`;
  }
  const c = st.conditions;
  let active = '';
  if (st.active) {
    const a = st.active, k = a.kind, rd = k === 'round' ? a : null;
    const title = rd ? rd.course.name : k === 'range' ? (a.basic ? 'Basic range session' : 'Range session') : k === 'putt' ? 'Putting session' : k === 'baseline' ? 'Baseline' : k === 'retest' ? 'Re-test' : 'Round';
    let sub = '';
    if (rd) { const thru = rd.holes.filter(x => x.done && x.strokes != null).length; sub = `Hole ${rd.holes[rd.hole].n}${thru ? ` · ${toParShort(roundSummary(rd).toPar)} through ${thru}` : ''}`; }
    else if (k === 'range' || k === 'baseline' || k === 'retest') sub = `${a.shots.length} ball${a.shots.length === 1 ? '' : 's'} logged`;
    else if (k === 'putt') sub = `${a.putts.length} putt${a.putts.length === 1 ? '' : 's'} logged`;
    active = `<a class="card hero resume" href="#/${k === 'round' ? 'round' : k === 'baseline' || k === 'retest' ? 'baseline' : k + '/log'}"><span class="grow"><span class="lbl">In progress</span><span class="h2">${esc(title)}</span>${sub ? `<span class="muted">${esc(sub)}</span>` : ''}</span><span class="resume-go">Resume${ic('chev', 18)}</span></a>`;
  }
  return `
  <header class="masthead">
    <div class="top"><span class="wordmark">${insignia(36)}<span>Coach Caddy</span></span><a class="round-btn" href="#/settings" aria-label="Settings">${ic('gear', 22)}</a></div>
  </header>
  <div class="scroll-y home-body" data-shell data-keep="home">
  ${active}
  <div class="home-tiles">
  <a class="tile scene" href="#/practice">${rangeScene()}<span class="scrim"></span><span class="mat"></span>${golferGlyph(104, 'g-gold on-mat', '#276446')}
    <span class="lbl">Range · putting · warm-up</span><h2 class="one-line">Coach: Practice</h2>
    <span class="readout">${shots.length ? `${shots.length} shots${solid != null ? ` · ${solid}% solid` : ''}` : 'Start logging to see your numbers'}</span></a>
  <a class="tile scene" href="#/play">${fairwayScene()}<span class="scrim"></span>${caddyGlyph(136, 'g-gold at-bottom', '#23603F')}
    <span class="lbl">On the course</span><h2 class="one-line">Caddy: Play</h2>
    <span class="readout">${c.set ? `${c.temp}°F · ${tempSummary(c)}` : 'Conditions, carries and every lie'}</span></a>
  </div>
  <a class="warm-link" href="#/warmup/${WARMUP[0].id}">${drillGlyph('stretch')}<span class="grow"><b>Warm up first</b><span class="muted">${WARMUP.length} moves · about 4 min</span></span>${chev()}</a>
  ${top.length ? `<a class="card mini" href="#/bag" style="text-decoration:none;color:inherit"><span class="lbl">Most reliable right now</span><div class="chips one-line-chips">${top.map(([id, v]) => `<span class="chip gold" style="display:flex;align-items:center;gap:4px">${ic('star', 14)}${esc(club(id).name)} ${v.score}</span>`).join('')}</div></a>`
    : `<a class="card mini" href="#/bag" style="text-decoration:none;color:inherit"><span class="lbl">Club reliability</span>${relWait(rel)}</a>`}
  ${take}
  </div>`;
}

// ---------- your data: export and reset ----------
function countWords(n) {
  const parts = [];
  if (n.sessions) parts.push(`${n.sessions} session${n.sessions === 1 ? '' : 's'}`);
  if (n.shots) parts.push(`${n.shots} shot${n.shots === 1 ? '' : 's'}`);
  if (n.putts) parts.push(`${n.putts} putt${n.putts === 1 ? '' : 's'}`);
  return parts;
}
function settings() {
  const st = S(), parts = countWords(dataCounts(st));
  const seg = (act, cur, opts) => `<div class="seg">${opts.map(([v, t]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</div>`;
  return `
  <div class="top">${back('', 'Home')}</div>
  <h1>Settings</h1>
  <div class="scroll-y" data-keep="settings">
  <section class="group"><h2 class="group-h">Appearance</h2>${seg('setTheme', st.theme, [['system', 'Automatic'], ['day', 'Day'], ['night', 'Night']])}<p class="footnote">Automatic follows your phone’s light and dark setting.</p></section>
  <section class="group"><h2 class="group-h">Practice</h2>
    <button class="switch-row" role="switch" aria-checked="${st.warmBell !== false}" data-act="warmBell"><span class="grow"><b>Bell between warm-up moves</b><span class="muted">A soft chime when each move ends</span></span><i class="switch" aria-hidden="true"></i></button>
    <button class="switch-row" role="switch" aria-checked="${!!st.detailTrack}" data-act="detailTrack"><span class="grow"><b>Detailed drill tracking</b><span class="muted">Use the pictures inside drills instead of two buttons</span></span><i class="switch" aria-hidden="true"></i></button></section>
  <section class="group"><h2 class="group-h">You swing</h2>${seg('hand', st.hand, [['right', 'Right-handed'], ['left', 'Left-handed']])}<p class="footnote">Sets heel and toe, draw and fade, and which way the club face points.</p></section>
  <section class="group"><h2 class="group-h">Your data</h2><p class="footnote">Stored only on this phone. ${parts.length ? esc(parts.join(' · ')) + '.' : 'Nothing logged yet.'}</p>
    <div class="list">
      <button class="list-row" data-act="exportCsv"><span>Export data (CSV)</span>${ic('share', 20)}</button>
      <button class="list-row" data-act="export"><span>Backup (JSON)</span>${ic('share', 20)}</button>
      ${!reliability(st).anyUnlocked ? `<button class="list-row" data-act="sample"><span>Try sample data</span>${ic('chev', 18)}</button>` : ''}
    </div></section>
  <section class="group"><div class="list"><button class="list-row danger" data-act="reset"><span>Reset all data</span></button></div><p class="footnote">Deletes every session, your bag numbers and your settings.</p></section>
  <section class="group"><h2 class="group-h">About</h2><div class="list">
    <a class="list-row" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener"><span>Course data © OpenStreetMap contributors (ODbL)</span>${ic('chev', 18)}</a>
    <a class="list-row" href="https://opengolfapi.org" target="_blank" rel="noopener"><span>Course search by OpenGolfAPI</span>${ic('chev', 18)}</a></div>
    <p class="footnote">Coach Caddy ${APP_VERSION}. No account and no tracking. Course search sends only the name and state you type.</p></section>
  </div>`;
}
function dataCard() {
  const parts = countWords(dataCounts(S()));
  return `<div class="card data-card"><span class="lbl">Your data</span><span class="muted">Stored only on this phone. ${parts.length ? parts.join(' · ') + '.' : 'Nothing logged yet.'}</span>
    <div class="data-btns"><button class="btn sec" data-act="exportCsv">Export data (CSV)</button><button class="btn danger-out" data-act="reset">Reset</button></div></div>`;
}
// The CSV goes to the share sheet where the phone offers one (the reliable route in an iPhone home-screen app), else downloads.
async function exportCSV() {
  const { csv, rows } = buildCSV(S());
  const name = `coach-caddy-data-${stamp(Date.now()).replace(' ', '-').replace(':', '')}.csv`;
  const done = () => toast(`Exported ${rows} row${rows === 1 ? '' : 's'}`);
  try {
    const file = new File([csv], name, { type: 'text/csv' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Coach Caddy data' });
      return done();
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // closed the share sheet
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  done();
}
function resetPrompt() {
  const parts = countWords(dataCounts(S()));
  const what = (parts.length ? `That is ${parts.join(', ')}, ` : 'That is ') + 'your bag numbers and your settings. This can\u2019t be undone.';
  openOverlay(`<div class="modal-wrap" data-reset><div class="modal reset-modal" role="alertdialog" aria-modal="true" aria-labelledby="rsT" aria-describedby="rsQ">
    <h2 id="rsT">Reset Coach Caddy?</h2>
    <p id="rsQ"><b>If you reset, all your data will be deleted. Are you sure?</b></p>
    <p class="what">${esc(what)}</p>
    <div class="stack"><button class="btn sec" data-reset="export">Export a copy first</button><button class="btn danger" data-reset="yes">Yes, delete everything</button><button class="btn plain strong" data-reset="cancel">Cancel</button></div></div></div>`);
  const wrap = document.querySelector('[data-reset].modal-wrap');
  const close = () => { wrap.remove(); document.removeEventListener('keydown', esc_); };
  const esc_ = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', esc_);
  wrap.querySelector('[data-reset=cancel]').focus();
  wrap.addEventListener('click', e => {
    const b = e.target.closest('[data-reset]');
    if (!b || b === wrap) { if (e.target === wrap) close(); return; }
    if (b.dataset.reset === 'cancel') close();
    else if (b.dataset.reset === 'export') exportCSV();
    else if (b.dataset.reset === 'yes') {
      close(); resetAll(); ui = {};
      if (location.hash && location.hash !== '#/') go(''); else render();
      toast('All data deleted');
    }
  });
}

// ---------- play a round ----------
// Caddy: Play opens Start a round: saved courses, a course search (OpenGolfAPI), a custom course, or Just the caddy.
const curRound = () => { const a = S().active; return a && a.kind === 'round' ? a : null; };
const courseById = id => (S().courses || []).find(c => c.id === id);
const parTotal = c => c.holes.reduce((a, h) => a + (h.par || 0), 0);
const fmtYds = n => n ? n.toLocaleString() : '';
function courseLine(c) {
  const where = [c.city, c.state].filter(Boolean).join(', ');
  const p = parTotal(c), full = c.holes.every(h => h.par);
  return [where, `${c.holes.length} holes`, full ? `Par ${p}` : ''].filter(Boolean).join(' · ');
}

function playStart() {
  const st = S(), r = curRound();
  const courses = (st.courses || []).slice().sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
  const rounds = st.sessions.filter(s => s.kind === 'round').sort((a, b) => b.ended - a.ended).slice(0, 5);
  const f = ui.find || {};
  return `
  <div class="top">${back('', 'Home')}</div>
  <h1>Caddy: Play</h1>
  <div class="scroll-y" data-keep="pstart">
  ${r ? `<a class="card hero resume" href="#/round"><span class="grow"><span class="lbl">Round in progress</span><span class="h2">${esc(r.course.name)}</span><span class="muted">Hole ${r.holes[r.hole].n}</span></span><span class="resume-go">Resume${ic('chev', 18)}</span></a>` : ''}
  <button class="course-row" data-act="justCaddy"><span class="row-ic">${caddyGlyph(34, 'g-brand')}</span><span class="grow"><b>Just the caddy</b><span class="muted">Club advice for any shot, no scorecard</span></span>${chev()}</button>
  ${courses.length ? `<span class="lbl">Your courses</span><div class="course-list">${courses.map(c => `<button class="course-row" data-act="pickCourse" data-v="${esc(c.id)}"><span class="grow"><b>${esc(c.name)}</b><span class="muted">${esc(courseLine(c))}${c.lastPlayed ? ` · played ${fmtDate(c.lastPlayed)}` : ''}</span></span>${chev()}</button>`).join('')}</div>` : ''}
  <span class="lbl">Find a course</span>
  <div class="find-row"><select id="findState" aria-label="State"><option value="">All</option>${STATES.map(s => `<option${s === (f.state != null ? f.state : st.lastState) ? ' selected' : ''}>${s}</option>`).join('')}</select>
    <input id="findQ" type="search" placeholder="Course name" autocomplete="off" enterkeyhint="search" value="${esc(f.q || '')}" aria-label="Course name"></div>
  <p class="helper" id="findMsg" aria-live="polite">${esc(f.msg || 'Pick a state or type at least 2 letters of a course name.')}</p>
  <div class="course-list" id="findResults">${findResultsHtml()}</div>
  <button class="course-row" data-act="customCourse"><span class="row-ic plain">${ic('plus', 24)}</span><span class="grow"><b>Custom course</b><span class="muted">Type a name; holes start as par 4</span></span></button>
  <p class="attrib">Course data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL) via <a href="https://opengolfapi.org" target="_blank" rel="noopener">OpenGolfAPI</a>. Community data, so check pars against the scorecard.</p>
  ${rounds.length ? `<span class="lbl">Past rounds</span><div class="course-list">${rounds.map(s => { const sm = roundSummary(s); return `<a class="course-row" href="#/round/recap/${s.id}"><span class="grow"><b>${esc(s.course.name)}</b><span class="muted">${fmtDate(s.ended)} · ${sm.played} holes</span></span><span class="rd-total">${sm.strokes} <small>${toParText(sm.toPar)}</small></span></a>`; }).join('')}</div>` : ''}
  </div>`;
}
function findResultsHtml() {
  const hits = (ui.find && ui.find.hits) || [];
  return hits.map((c, i) => `<button class="course-row" data-act="findHit" data-v="${i}"><span class="grow"><b>${esc(hitName(c))}</b><span class="muted">${esc(hitLine(c))}</span></span>${chev()}</button>`).join('');
}
let findTimer = null, findSeq = 0;
async function runFind() {
  const f = ui.find = ui.find || {};
  const qEl = document.getElementById('findQ'), sEl = document.getElementById('findState');
  if (qEl) f.q = qEl.value.trim();
  if (sEl) f.state = sEl.value;
  const setMsg = t => { f.msg = t; const m = document.getElementById('findMsg'); if (m) m.textContent = t; };
  const setHits = h => { f.hits = h; const box = document.getElementById('findResults'); if (box) box.innerHTML = findResultsHtml(); };
  if (!f.state && (f.q || '').length < 2) { setHits([]); setMsg('Pick a state or type at least 2 letters of a course name.'); return; }
  const seq = ++findSeq;
  setMsg('Searching…');
  let hits;
  try { hits = await searchCourses(f.q, f.state); }
  catch (e) { if (seq === findSeq) { setHits([]); setMsg('Couldn’t reach the course database. Check your signal and try again, or add a custom course.'); } return; }
  if (seq !== findSeq) return;
  setHits(hits);
  setMsg(hits.length ? `${hits.length}${hits.length >= 50 ? '+' : ''} course${hits.length > 1 ? 's' : ''}. Tap one to see its scorecard.${hits.length >= 50 ? ' Type more of the name to narrow it down.' : ''}` : 'No courses found. Try fewer letters, another state, or add a custom course.');
}
function queueFind() { clearTimeout(findTimer); findTimer = setTimeout(runFind, 400); }

function previewOpen(course) {
  const saved = (S().courses || []).find(c => c.id === course.id || (c.source && course.source && c.source.api === 'opengolfapi' && c.source.id && c.source.id === course.source.id));
  if (saved && course !== saved && !course.custom) course = { ...course, id: saved.id, lastPlayed: saved.lastPlayed, lastTee: saved.lastTee };
  ui.preview = JSON.parse(JSON.stringify(course));
  ui.prevTee = course.lastTee != null && course.lastTee < course.tees.length ? course.lastTee : Math.min(1, Math.max(0, course.tees.length - 1));
  ui.prevHoles = '18';
  go('play/course');
}

function coursePreview() {
  const c = ui.preview;
  if (!c) { go('play'); return ''; }
  const sx = courseStats(c), L = c.holes.length;
  const saved = !!courseById(c.id);
  const chip = (ok, okText, noText) => `<li class="${ok ? 'ok' : 'no'}">${ic(ok ? 'check' : 'minus', 18)}<span>${esc(ok ? okText : noText)}</span></li>`;
  const strip = (a, b) => `<div class="par-strip"><table><tr><th>Hole</th>${c.holes.slice(a, b).map((h, i) => `<th>${a + i + 1}</th>`).join('')}</tr><tr><th>Par</th>${c.holes.slice(a, b).map(h => `<td>${h.par || '–'}</td>`).join('')}</tr>${sx.hcps ? `<tr><th>Hcp</th>${c.holes.slice(a, b).map(h => `<td>${h.hcp || '–'}</td>`).join('')}</tr>` : ''}</table></div>`;
  return `
  <div class="top">${back('play', 'Play')}</div>
  <div class="scroll-y" data-keep="pcourse">
  <div><h1 class="course-h1">${esc(c.name)}</h1><span class="muted">${esc(courseLine(c))}</span></div>
  <ul class="facts">${chip(sx.pars === L, 'Pars for every hole', sx.pars ? `Pars for ${sx.pars} of ${L} holes` : 'No hole pars yet')}${chip(sx.hcps >= L, 'Hole handicaps', 'No hole handicaps')}${chip(sx.yards, 'Yardage by hole', 'No hole yardages')}</ul>
  ${strip(0, Math.min(9, L))}${L > 9 ? strip(9, L) : ''}
  ${sx.pars < L ? `<p class="helper">Holes without a par can be set on the hole screen as you play.</p>` : ''}
  <span class="lbl">Tees</span>
  ${c.tees.length ? `<div class="tee-row">${c.tees.map((t, i) => `<button class="tee-btn${i === ui.prevTee ? ' on' : ''}" data-act="prevTee" data-v="${i}" aria-pressed="${i === ui.prevTee}"><b><i class="tee-dot" style="background:${TEE_COLOR[t.color] || '#9AA3A0'}"></i>${esc(t.name)}</b><span>${t.total ? fmtYds(t.total) + ' yds' : 'no yardage'}</span>${i === ui.prevTee ? `<span class="tee-check">${ic('check', 18)}</span>` : ''}</button>`).join('')}</div>` : `<p class="helper">No tee yardages for this course. Holes show par only, and the caddy starts from your last yardage.</p>`}
  ${L === 18 ? `<span class="lbl">Holes</span><div class="seg">${[['18', 'All 18'], ['front', 'Front 9'], ['back', 'Back 9']].map(([v, t]) => `<button class="${ui.prevHoles === v ? 'on' : ''}" data-act="prevHoles" data-v="${v}">${t}</button>`).join('')}</div>` : ''}
  ${c.custom ? '' : `<p class="attrib">Course data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL) via <a href="https://opengolfapi.org" target="_blank" rel="noopener">OpenGolfAPI</a>.</p>`}
  </div>
  <div class="bar"><button class="btn pri" data-act="coursePlay">${saved ? 'Play this course' : 'Add and play'}</button></div>`;
}
const TEE_COLOR = { white: '#F3F1EA', blue: '#2D6F93', gold: '#D9A636', red: '#B3261E', black: '#1B1B1B', green: '#2E7D4F', silver: '#B8BFBD' };

function askCustomCourse() {
  openOverlay(`<div class="modal-wrap"><div class="modal" role="dialog" aria-label="Custom course"><h2>Custom course</h2>
    <label class="lbl" for="ccName">Name</label><input id="ccName" type="text" maxlength="40" placeholder="e.g. Haggin Oaks Arcade">
    <span class="lbl">Holes</span><div class="seg" id="ccHoles"><button class="on" data-n="18">18</button><button data-n="9">9</button></div>
    <p class="helper">Every hole starts as a par 4. Change pars on the hole screen as you play.</p>
    <div class="btn-row"><button class="btn sec" data-modal="cancel">Cancel</button><button class="btn pri" data-modal="ok">Add course</button></div></div></div>`);
  const wrap = document.querySelector('.modal-wrap');
  let n = 18;
  wrap.addEventListener('click', e => {
    const b = e.target.closest('[data-n]');
    if (b) { n = +b.dataset.n; wrap.querySelectorAll('[data-n]').forEach(x => x.classList.toggle('on', x === b)); return; }
    const m = e.target.closest('[data-modal]');
    if (!m && e.target !== wrap) return;
    if (m && m.dataset.modal === 'ok') { const c = customCourse(document.getElementById('ccName').value.trim(), n); wrap.remove(); previewOpen(c); return; }
    wrap.remove();
  });
}

function startRound() {
  const dr = ui.roundDraft, c = dr && courseById(dr.courseId);
  if (!c) { go('play'); return; }
  const tee = c.tees[dr.tee] || null;
  const L = c.holes.length;
  const idx = dr.sel === 'front' ? [...Array(9).keys()] : dr.sel === 'back' ? [...Array(9).keys()].map(i => i + 9) : [...Array(L).keys()];
  if (S().active) finishActive();
  update(s => {
    s.active = { kind: 'round', id: uid(), started: Date.now(), hole: 0, cond: { ...s.conditions },
      course: { id: c.id, name: c.name, city: c.city, state: c.state, tee: tee ? tee.name : '', sel: dr.sel },
      holes: idx.map(i => ({ n: i + 1, par: c.holes[i].par || null, yds: tee ? tee.yds[i] || null : null, hcp: c.holes[i].hcp || null, strokes: null, putts: null, fw: null, pen: 0, caddy: [], done: false })) };
    const sc = s.courses.find(x => x.id === c.id); if (sc) sc.lastPlayed = Date.now();
  });
  ui.roundDraft = null; ui.revisitFrom = null;
  go('round');
}

function roundHole() {
  const a = curRound();
  if (!a) { go('play'); return ''; }
  const h = a.holes[a.hole];
  const sm = roundSummary(a);
  const thru = a.holes.filter(x => x.done && x.strokes != null).length;
  const isLast = a.hole === a.holes.length - 1;
  const revisit = ui.revisitFrom != null;
  const sub = [h.par ? `Par ${h.par}` : 'Par –', h.yds ? `${h.yds} yds` : '', h.hcp ? `Hcp ${h.hcp}` : ''].filter(Boolean).join(' · ');
  const strip = a.holes.map((x, i) => { const d = x.strokes != null && x.done, rel = d && x.par ? x.strokes - x.par : null;
    return `<button class="hs${i === a.hole ? ' on' : ''}${d ? ' done' : ''}${rel != null && rel < 0 ? ' under' : rel != null && rel > 0 ? ' over' : ''}" data-act="goHole" data-v="${i}" aria-label="Hole ${x.n}${d ? `, ${x.strokes}` : ', not played'}"${i === a.hole ? ' aria-current="true"' : ''}><b>${x.n}</b><span>${d ? x.strokes : ''}</span></button>`; }).join('');
  const word = h.strokes != null ? scoreWord(h.strokes, h.par) : 'Tap + or a score';
  const quick = h.par ? [[-1, 'Birdie'], [0, 'Par'], [1, 'Bogey'], [2, 'Double']] : [];
  const resWord = { on: 'On target', short: 'Short', long: 'Long', left: 'Left', right: 'Right' };
  const editPar = !h.par || (courseById(a.course.id) || {}).custom;
  return `
  <div class="logtop"><button class="back close" data-act="endRound" aria-label="End the round">Close</button>
    <div class="lt-mid"><span class="lt-line"><span class="lt-name">Hole ${h.n}</span></span><span class="lt-sub">${esc(sub)}</span><span class="lt-sub">${thru ? `${toParShort(sm.toPar)} through ${thru}` : 'First hole'}</span></div>
    <span class="lt-pad" aria-hidden="true"></span></div>
  <div class="hole-strip" data-strip role="group" aria-label="Holes">${strip}</div>
  <div class="scroll-y log-body hole-body" data-keep="round-${a.hole}">
  ${editPar ? `<div class="field"><span class="lbl">Par</span><div class="seg">${[3, 4, 5].map(p => `<button class="${h.par === p ? 'on' : ''}" data-act="setPar" data-v="${p}">${p}</button>`).join('')}</div></div>` : ''}
  <div class="card caddy-card"><button class="btn goldbtn sm" data-act="askCaddy">${caddyGlyph(24, 'g-brand')}Ask caddy${h.caddy.length ? '' : h.yds ? ` · ${h.yds} yds` : ''}</button>
    ${h.caddy.length ? `<div class="call-chips">${h.caddy.map((c, i) => `<button class="call-chip${c.result ? ' r-' + c.result : ''}" data-act="callResult" data-v="${i}"><b>${esc(c.clubName)}${c.choke ? ', choked' : ''}</b><span>${c.yards} yds · ${esc(lieWords(c))}</span><em>${c.result ? resWord[c.result] : 'How did it go?'}</em></button>`).join('')}</div>` : `<span class="muted">Yardage and lie start from this hole. Tap Use this club in the caddy to save the call here.</span>`}
  </div>
  ${h.par !== 3 ? `<div class="field"><span class="lbl">Tee shot</span><div class="seg">${[['left', 'Left'], ['fairway', 'Fairway'], ['right', 'Right']].map(([v, t]) => `<button class="${h.fw === v ? 'on' : ''}" data-act="rFw" data-v="${v}">${t}</button>`).join('')}</div></div>` : ''}
  <div class="field pen-row"><span class="lbl">Penalties</span><div class="pen"><button class="step sm" data-act="rPen" data-v="-1" aria-label="One penalty fewer">${ic('minus', 20)}</button><b aria-live="polite">${h.pen || 0}</b><button class="step sm" data-act="rPen" data-v="1" aria-label="One penalty more">${ic('plus', 20)}</button></div></div>
  <div class="field"><span class="lbl">Putts</span><div class="seg">${[0, 1, 2, 3, 4].map(n => `<button class="${h.putts === n ? 'on' : ''}" data-act="rPutts" data-v="${n}">${n === 4 ? '4+' : n}</button>`).join('')}</div></div>
  <div class="card stroke-card">
    <span class="lbl">Score</span>
    <div class="strokes"><button class="step" data-act="rStrokes" data-v="-1" aria-label="One stroke fewer">${ic('minus', 26)}</button>
      <div class="st-num" aria-live="polite"><b class="${h.strokes == null ? 'blank' : ''}">${h.strokes != null ? h.strokes : '–'}</b><span>${esc(word)}</span></div>
      <button class="step" data-act="rStrokes" data-v="1" aria-label="One stroke more">${ic('plus', 26)}</button></div>
    ${quick.length ? `<div class="quick">${quick.map(([d, t]) => `<button class="chip${h.strokes === h.par + d ? ' on' : ''}" data-act="rStrokesSet" data-v="${h.par + d}">${t}</button>`).join('')}</div>` : ''}
  </div>
  </div>
  <div class="bar"><button class="btn pri" data-act="finishHole" ${h.strokes == null ? 'disabled' : ''}>${revisit ? 'Save hole' : isLast ? 'Finish the round' : 'Finish the hole'}</button></div>`;
}
function bindHoleStrip() {
  const strip = app.querySelector('[data-strip]'), on = strip && strip.querySelector('.hs.on');
  if (on) strip.scrollLeft += on.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - on.offsetWidth) / 2;
}
function confirmRound(kind) {
  const a = curRound();
  const scored = a.holes.filter(x => x.strokes != null).length;
  const blank = a.holes.length - scored;
  const end = kind === 'end';
  const title = !scored ? 'Leave this round?' : end ? 'End the round now?' : 'Finish the round?';
  const text = !scored ? 'Nothing is scored yet, so nothing will be saved.' : blank ? `${scored} hole${scored > 1 ? 's are' : ' is'} scored. Holes without a score are left blank.` : 'All holes are scored. You’ll see the round outline next.';
  openOverlay(`<div class="modal-wrap"><div class="modal" role="alertdialog" aria-label="${esc(title)}"><h2>${esc(title)}</h2><p>${esc(text)}</p>
    <div class="btn-row"><button class="btn sec" data-modal="cancel">Keep playing</button><button class="btn pri" data-modal="ok">${!scored ? 'Leave' : end ? 'End round' : 'Finish the round'}</button></div></div></div>`);
  const wrap = document.querySelector('.modal-wrap');
  wrap.querySelector('[data-modal=cancel]').focus();
  wrap.addEventListener('click', e => {
    const m = e.target.closest('[data-modal]');
    if (!m && e.target !== wrap) return;
    wrap.remove();
    if (m && m.dataset.modal === 'ok') { const id = finishActive(); ui.revisitFrom = null; ui.fromHole = false; id ? go('round/recap/' + id) : go('play'); }
  });
}
function callSheet(i) {
  const a = curRound(), c = a.holes[a.hole].caddy[i];
  const opts = [['on', 'On target'], ['short', 'Short'], ['long', 'Long'], ['left', 'Left'], ['right', 'Right']];
  openOverlay(`<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="How did it go?" data-stop>
    <div class="grab"></div><div class="sheet-title"><h2>How did it go?</h2><button class="sheet-done" data-act="closeSheet">Done</button></div>
    <p class="muted">${esc(c.clubName)} · ${c.yards} yds · ${esc(lieWords(c))} · plays like ${c.playsLike}. ${esc(c.aim || '')}</p>
    <div class="grid3 res-grid">${opts.map(([v, t]) => `<button class="chip sq${c.result === v ? ' on' : ''}" data-act="setCallResult" data-v="${i}:${v}">${t}</button>`).join('')}</div>
    <button class="btn danger-text plain" data-act="setCallResult" data-v="${i}:x">Remove this call</button></div></div>`);
}

function roundRecapView(id) {
  const sess = S().sessions.find(s => s.id === id && s.kind === 'round');
  if (!sess) return `<div class="top">${back('play', 'Play')}</div><h1>Round not found</h1>`;
  const sm = roundSummary(sess);
  const byParTiles = Object.entries(sm.byPar);
  const resWord = { on: 'On target', short: 'Short', long: 'Long', left: 'Left', right: 'Right' };
  const mark = h => { if (h.strokes == null) return '<span class="sc blank">–</span>'; const d = h.par ? h.strokes - h.par : 0; return `<span class="sc${d <= -1 ? ' under' : ''}${d <= -2 ? ' eagle' : ''}${d === 1 ? ' bogey' : ''}${d >= 2 ? ' dbl' : ''}">${h.strokes}</span>`; };
  const fwMark = h => h.par === 3 || !h.fw ? '' : h.fw === 'fairway' ? ic('check', 16, 'Fairway') : h.fw === 'left' ? '<span class="miss" aria-label="Missed left">L</span>' : '<span class="miss" aria-label="Missed right">R</span>';
  const girMark = h => { const g = gir(h); return g == null ? '' : g ? ic('check', 16, 'Green in regulation') : '<span class="miss" aria-label="Missed green">·</span>'; };
  const halfRow = (label, hs) => { const xs = hs.filter(h => h.strokes != null); return `<tr class="sum"><td>${label}</td><td>${hs.reduce((a, h) => a + (h.par || 0), 0)}</td><td>${xs.reduce((a, h) => a + h.strokes, 0) || '–'}</td><td>${hs.filter(h => h.putts != null).reduce((a, h) => a + h.putts, 0) || ''}</td><td></td><td></td><td></td></tr>`; };
  const rows = hs => hs.map(h => `<tr><td>${h.n}</td><td>${h.par || '–'}</td><td>${mark(h)}</td><td>${h.putts != null ? h.putts : ''}</td><td>${fwMark(h)}</td><td>${girMark(h)}</td><td>${(h.caddy || []).length ? `<span class="cad-n" role="img" aria-label="${h.caddy.length} caddy call${h.caddy.length > 1 ? 's' : ''}">${h.caddy.length}</span>` : ''}</td></tr>`).join('');
  const H = sess.holes, two = H.length > 9;
  const byPar = Object.entries(sm.byPar).map(([p, v]) => `Par ${p}s ${v}`).join(' · ');
  return `
  <div class="top">${back('play', 'Play')}<button class="icon-btn" data-act="exportCsv" aria-label="Export data">${ic('share', 22)}</button></div>
  <div class="scroll-y" data-keep="rrecap">
  <div class="title-block"><span class="eyebrow">${fmtDate(sess.ended)}${sess.course.tee ? ` · ${esc(sess.course.tee)} tees` : ''}</span><h1 class="course-h1">${esc(sess.course.name)}</h1></div>
  <div class="score-big"><b>${sm.strokes}</b><span><strong>${toParWords(sm.toPar)}</strong><span class="muted">${sm.front != null && sm.back != null ? `Front ${sm.front || '–'}, back ${sm.back || '–'} · ` : ''}${sm.played} of ${H.length} holes scored</span></span></div>
  <div class="card"><span class="h2" style="font-size:20px">${esc(sm.headline)}</span>${sm.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>
  <div class="card score-card"><span class="lbl">Scorecard</span><table class="sc-table"><tr><th>Hole</th><th>Par</th><th>Score</th><th>Putts</th><th>Fwy</th><th>GIR</th><th>Caddy</th></tr>
    ${two ? rows(H.slice(0, 9)) + halfRow('Out', H.slice(0, 9)) + rows(H.slice(9)) + halfRow('In', H.slice(9)) : rows(H)}
    <tr class="sum tot"><td>Total</td><td>${H.reduce((a, h) => a + (h.par || 0), 0)}</td><td>${sm.strokes}</td><td>${sm.putts || ''}</td><td></td><td></td><td></td></tr></table>
    <span class="muted key">Birdies circled, bogeys boxed. Fwy shows L or R for the miss side. A gold number counts caddy calls on that hole.</span></div>
  <div class="stat-row stat4"><div class="stat"><b>${sm.fw.of ? `${sm.fw.hit}/${sm.fw.of}` : '–'}</b><span>Fairways</span></div><div class="stat"><b>${sm.gir.of ? `${sm.gir.hit}/${sm.gir.of}` : '–'}</b><span>Greens</span></div><div class="stat"><b>${sm.puttHoles ? sm.putts : '–'}</b><span>Putts</span></div><div class="stat"><b>${sm.pens}</b><span>Penalties</span></div></div>
  ${byParTiles.length ? `<span class="lbl">Average score by par</span><div class="stat-row stat4">${byParTiles.map(([p, v]) => `<div class="stat"><b>${v}</b><span>Par ${p}s</span></div>`).join('')}</div>` : ''}
  <div class="card caddy-sum"><span class="lbl">Caddy calls by lie</span>
    ${sm.calls.length ? `<p class="muted">Caddy used ${sm.calls.length} time${sm.calls.length > 1 ? 's' : ''} on ${sm.holesWithCalls} hole${sm.holesWithCalls > 1 ? 's' : ''} · ${sm.lieGroups.length} lie${sm.lieGroups.length > 1 ? 's' : ''}${sm.callsMarked ? ` · ${sm.callsOnTarget} of ${sm.callsMarked} marked on target` : ''}</p>
      ${sm.lieGroups.map(g => `<div class="lie-group"><b>${esc(g.lie)}</b>${g.calls.map(c => `<div class="call-row"><span>Hole ${c.hole}</span><span>${c.yards}${c.playsLike !== c.yards ? `<small>, plays ${c.playsLike}</small>` : ''}</span><span>${esc(c.clubName)}${c.choke ? ', choked' : ''}</span><span class="res ${c.result || ''}">${c.result ? resWord[c.result] : '–'}</span></div>`).join('')}</div>`).join('')}`
    : `<p class="muted">The caddy wasn’t used this round.</p>`}
  </div>
  </div>
  ${sm.played ? `<div class="bar"><button class="btn pri" data-act="roundPlan" data-r="${sm.plan.range.join(',')}" data-p="${sm.plan.putt.join(',')}">Save as next practice plan</button></div>` : ''}`;
}

// ---------- practice ----------
// Today's session: warm-up, baseline, drills, re-test. Each step can be skipped.
const dayKey = () => new Date().toLocaleDateString('en-CA');
function todayState() { const t = S().today; return t && t.day === dayKey() ? t : { day: dayKey() }; }
function setToday(fn) { update(s => { if (!s.today || s.today.day !== dayKey()) s.today = { day: dayKey() }; fn(s.today); }); }
function flowSteps() {
  const t = todayState(), st = S();
  const drillsDone = t.drillsId && st.sessions.some(x => x.id === t.drillsId);
  const steps = [
    { id: 'warm', name: 'Warm-up', sub: `${WARMUP.length} moves, a bell between each`, tag: '4 min', done: t.warm, skip: t.warmSkip },
    { id: 'baseline', name: 'Baseline', sub: '10 free, then 5 each: wedge, 7-iron, driver', tag: '25 balls', done: !!t.baselineId, skip: t.baseSkip },
    { id: 'drills', name: 'Drills', sub: t.baselineId ? 'Picked from today’s baseline' : 'Picked from your baseline', tag: '40 balls', done: drillsDone, skip: false },
    { id: 'retest', name: 'Re-test', sub: '5 balls: did the drill help?', tag: 'Optional', done: !!t.retestId, skip: t.retestSkip || (drillsDone && !t.baselineId) },
  ];
  const now = steps.find(x => !x.done && !x.skip);
  return { steps, now, t };
}
function practice() {
  const { steps, now, t } = flowSteps();
  const label = { warm: 'Start with the warm-up', baseline: 'Start the baseline', drills: t.baselineId ? 'Start today’s drills' : 'Pick today’s drills', retest: 'Re-test · 5 balls' };
  const skip = { warm: 'Skip to the baseline', baseline: 'Skip the baseline', retest: 'Skip the re-test' };
  return `
  <div class="top">${back('', 'Home')}</div>
  <h1>Coach: Practice</h1>
  <div class="scroll-y" data-keep="practice">
  <div class="card flow-card">
    <div class="flow-head"><span class="lbl">Today’s session · about 45 minutes</span><span class="h2">${now ? 'Warm up, test, then train' : 'Session done. Nice work.'}</span></div>
    <div class="flow">${steps.map((x, i) => `<button class="flow-step${x.done ? ' done' : x === now ? ' now' : x.skip ? ' skipped' : ''}" data-act="flowStep" data-v="${x.id}"><span class="flow-n">${x.done ? ic('check', 18) : i + 1}</span><span><b>${x.name}</b><span class="muted">${esc(x.sub)}</span></span><span class="flow-tag${x === now ? ' gold' : ''}">${x.done ? 'Done' : x === now ? 'Start here' : x.skip ? 'Skipped' : x.tag}</span></button>`).join('')}</div>
  </div>
  <span class="lbl">Or practise your own way</span>
  <button class="row-link" data-act="startBasic">${drillGlyph('traj')}<span class="grow"><span class="name">Just hit balls</span><span class="muted">No count, any club</span></span>${chev()}</button>
  <a class="row-link" href="#/range">${drillGlyph('line')}<span class="grow"><span class="name">Pick drills yourself</span><span class="muted">All ${RANGE_DRILLS.length} range drills</span></span>${chev()}</a>
  <a class="row-link" href="#/putt">${drillGlyph('pworld')}<span class="grow"><span class="name">Putting</span><span class="muted">Line, speed, pressure</span></span>${chev()}</a>
  <a class="row-link" href="#/practice/helps">${drillGlyph('ladder')}<span class="grow"><span class="name">What helps you</span><span class="muted">Drills ranked by what they changed</span></span>${chev()}</a>
  </div>
  <div class="bar">${now ? `<button class="btn pri" data-act="flowStep" data-v="${now.id}">${label[now.id]}</button>${skip[now.id] ? `<button class="btn plain" data-act="flowSkip" data-v="${now.id}">${skip[now.id]}</button>` : ''}`
    : `<button class="btn sec" data-act="flowStep" data-v="drills">See today’s recap</button>`}</div>`;
}

// ---------- warm-up ----------
// Five 45-second mobility moves shown as swipeable cards, each with its own timer.
// With Auto-advance checked (saved on the phone), a finished move rolls into the next card,
// which starts itself after a 3-second get-ready.
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
  bell(next ? 1 : 2);
  if (!next) setToday(t => { t.warm = true; });
  if (S().warmAuto && next) { ui.wuChain = true; go('warmup/' + next.id); return; }
  if (!next) toast('Warm-up done. Go hit some balls.');
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
  <div class="scroll-y" data-keep="wlist">
  <p class="helper">Five moves to wake up your hips, spine and shoulders before your first swing. Each move runs 45 seconds. Turn on Auto-advance to go hands-free.</p>
  <div class="stat-row"><div class="stat"><b>${WARMUP.length}</b><span>Moves</span></div><div class="stat"><b>${fmtS(WORK)}</b><span>Each</span></div><div class="stat"><b>${mins}</b><span>Minutes</span></div></div>
  ${WARMUP.map((m, i) => `<a class="row-link" href="#/warmup/${m.id}"><span class="wu-thumb" aria-hidden="true">${m.frames[1].svg}<i class="wu-num">${i + 1}</i></span><span class="grow"><span class="name">${esc(sentence(m.name))}</span><span class="muted">${esc(m.targets.join(', '))}</span></span>${chev()}</a>`).join('')}
  </div>
  <div class="bar"><button class="btn pri" data-act="warmRoutine">Start routine</button></div>`;
}

function warmMove(id) {
  const i = warmIdx(id);
  if (i < 0) { go('warmup'); return ''; }
  const m = WARMUP[i], next = WARMUP[i + 1];
  const dir = ui.wuLast == null || ui.wuLast === i ? '' : i > ui.wuLast ? 'from-r' : 'from-l';
  ui.wuLast = i;
  return `
  <div class="top">${back('warmup', 'Warm-up')}<span class="wu-dots" role="img" aria-label="Move ${i + 1} of ${WARMUP.length}">${WARMUP.map((_, j) => `<span class="${j === i ? 'on' : j < i ? 'past' : ''}"></span>`).join('')}</span><span class="wu-time" id="wuTime" role="timer" aria-live="off">${fmtS(WORK)}</span></div>
  <div class="scroll-y wu-body" data-keep="wmove-${id}">
  <div class="wu-slide ${dir}" id="wuSlide">
  <div class="wu-head"><span class="lbl">Move ${i + 1} of ${WARMUP.length}</span><h1>${esc(sentence(m.name))}</h1>
    <div class="chips">${m.targets.map(t => `<span class="badge plain">${esc(t)}</span>`).join('')}</div>
    <p class="helper">${esc(m.why)}</p></div>
  <div class="wu-frames">${m.frames.map((f, j) => `<div class="wu-frame"><span class="lbl"><span class="n ${j ? 'go' : ''}">${j + 1}</span>${esc(f.label)}</span>${f.svg}</div>`).join('')}</div>
  <div class="wu-bar" aria-hidden="true"><span id="wuFill"></span></div>
  <ol class="wu-cues">${m.cues.map(c => `<li>${esc(c)}</li>`).join('')}</ol>
  <div class="card soft"><span class="lbl t-gold">Coach tip</span><span>${esc(m.tip)}</span></div>
  </div>
  </div>
  <div class="bar">
  <button class="switch-row" role="switch" aria-checked="${S().warmBell !== false}" data-act="warmBell"><span class="grow"><b>Bell between moves</b><span class="muted">Rings when a move ends and the next begins</span></span><i class="switch" aria-hidden="true"></i></button>
  <button class="switch-row" role="switch" aria-checked="${!!S().warmAuto}" data-act="warmAuto"><span class="grow"><b>Auto-advance</b><span class="muted">${next ? `When the timer ends, start ${esc(sentence(next.name))}` : 'Last move of the warm-up'}</span></span><i class="switch" aria-hidden="true"></i></button>
  <div class="btn-row"><button class="btn pri" id="wuGo" data-act="warmGo">Start ${fmtS(WORK)}</button>${next
    ? `<a class="btn sec wu-next" href="#/warmup/${next.id}" aria-label="Next move: ${esc(next.name)}">${ic('chev', 24)}</a>`
    : `<button class="btn sec wu-next" data-act="warmDone" aria-label="Finish the warm-up">${ic('check', 24)}</button>`}</div>
  </div>`;
}

// Swipe left or right across a card to move between them, like slides.
function bindWarmSwipe(id) {
  const el = document.getElementById('wuSlide');
  if (!el) return;
  const i = warmIdx(id);
  let x0 = null, y0 = null;
  el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const to = WARMUP[i + (dx < 0 ? 1 : -1)];
    if (to) go('warmup/' + to.id);
  }, { passive: true });
}

// ---------- range: drill picker ----------
const TRACKER_NAME = { full: 'Full-swing tracker', carry: 'Distance tracker', shape: 'Shape tracker', strike: 'Strike map', play9: 'Play 9' };
function basicCard() {
  const last = S().sessions.filter(s => s.kind === 'range' && s.basic).sort((x, y) => y.ended - x.ended)[0];
  const clubs = last ? [...new Set(last.shots.map(s => s.club))].map(id => clubShort(club(id))).join(', ') : '';
  return `<div class="card hero basic-card"><span class="lbl">Basic range session</span><span class="h2">Just hit balls</span>
    <span class="muted">No drill and no ball count. Pick a club, log what happened, switch clubs whenever you like.</span>
    <button class="btn goldbtn" data-act="startBasic">Start basic session</button>
    ${last ? `<span class="mono basic-last">Last time · ${fmtDate(last.ended)} · ${last.shots.length} balls · ${esc(clubs)}</span>` : ''}</div>`;
}
function rangePick() {
  if (!ui.rangePick) ui.rangePick = new Set((S().plan && S().plan.range) || ['gate', 'line', 'ladder']);
  const cat = ui.rangeCat || 'All';
  const cats = ['All', 'Contact', 'Direction', 'Distance', 'Shape', 'Transfer'];
  const list = RANGE_DRILLS.filter(d => cat === 'All' || d.cat === cat);
  const n = ui.rangePick.size;
  const balls = RANGE_DRILLS.filter(d => ui.rangePick.has(d.id)).reduce((a, d) => a + d.balls, 0);
  return `
  <div class="top">${back('practice', 'Practice')}${themeBtn()}</div>
  <h1>Range</h1>
  <div class="scroll-y" data-keep="rpick">
  ${basicCard()}
  <div class="or-row"><span class="lbl">Or work a drill</span><i></i></div>
  <div class="chips scroll sticky-chips">${cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-act="rangeCat" data-v="${c}">${c}</button>`).join('')}</div>
  ${list.map(d => {
    const on = ui.rangePick.has(d.id);
    return `<div class="drill ${on ? 'on' : ''}" role="button" tabindex="0" data-act="pickRange" data-v="${d.id}" aria-pressed="${on}">${drillGlyph(d.glyph)}
      <span class="grow"><span class="name">${esc(d.name)}</span><span class="meta">${esc(d.trains)} · ${d.balls}\u00a0balls</span><span class="meta">${esc(club(d.club).name)}, ${esc(shotType(d.type).name.toLowerCase())}</span><span class="meta tracker-tag">${TRACKER_NAME[d.tracker || 'full']}${d.check ? ' · drill check' : ''}</span></span>${detailBtn(d)}<span class="pick-mark">${on ? checkOn : checkOff}</span></div>`;
  }).join('')}
  </div>
  <div class="bar"><button class="btn pri" data-act="startRange" ${n ? '' : 'disabled'}>Start · ${n} drill${n === 1 ? '' : 's'} · ${balls} balls</button></div>`;
}


// ---------- drill details ----------
// Tap Details on a drill card to open it in place; ⓘ in a logger opens the same details as a sheet.
const BRK_WORD = { left: 'breaks left', straight: 'straight', right: 'breaks right' };
function detailPanel(d, sheet = false) {
  const D = d.detail;
  if (!D) return '';
  const putt = d.putts != null;
  const setup = putt ? [`${d.dist} ft · ${BRK_WORD[d.brk]}`, `${d.putts} putts`, D.gear] : [d.mode === 'onedist' ? '8i full · 7i ¾ · 6i punch' : d.mode === 'nine' ? `${club(d.club).name} · shape changes each ball` : d.tracker === 'play9' ? 'Caddy picks each club' : `${club(d.club).name} · ${shotType(d.type).name.toLowerCase()}`, d.balls ? `${d.balls} balls` : '', D.gear];
  const on = putt ? ui.puttPick && ui.puttPick.has(d.id) : ui.rangePick && ui.rangePick.has(d.id);
  const pick = putt ? 'pickPutt' : 'pickRange';
  return `<div class="dd" id="dd-${d.id}" data-act="noop">
    <div class="dd-setup">${setup.filter(x => x && x !== 'No gear needed').map(x => `<span>${esc(x)}</span>`).join('')}</div>
    <div class="dd-sec"><h4>How to do it</h4><ol>${D.steps.map(x => `<li><span>${esc(x)}</span></li>`).join('')}</ol></div>
    <div class="dd-sec"><h4>Purpose</h4><p>${esc(D.purpose)}</p></div>
    <div class="dd-sec dd-feel"><h4>Feel</h4><p>${esc(D.feel)}</p></div>
    <div class="dd-ok"><h4>If done correctly</h4><ul>${D.ok.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="dd-target"><b>${esc(D.target.text)}</b><span>Target</span></div></div>
    ${sheet ? `<div class="dd-yt">${ytLink(d)}<span class="muted">Watch it done on YouTube</span></div>` : `<div class="dd-foot"><button class="btn sec" data-act="drillDetail" data-v="${d.id}">Hide details</button><button class="btn ${on ? 'sec' : 'pri'}" data-act="${pick}" data-v="${d.id}">${on ? 'Remove from session' : 'Add to session'}</button></div>`}
  </div>`;
}
// Each drill card has one secondary target: the info button opens the drill's details in a sheet.
function detailBtn(d) {
  if (!d.detail) return '';
  return `<button class="info-btn" data-act="drillInfoPick" data-v="${d.id}" aria-label="About ${esc(d.name)}">${ic('info', 24)}</button>`;
}
// Opening a card scrolls it to just under the filter chips; closing one only scrolls if its top went out of view.
function revealDetail() {
  const id = ui.ddScroll, closing = ui.ddClosing;
  ui.ddScroll = null; ui.ddClosing = false;
  const card = app.querySelector(`.drill[data-v="${id}"]`), sc = card && card.closest('.scroll-y');
  if (!sc) return;
  const chips = sc.querySelector('.sticky-chips');
  const off = (chips ? chips.offsetHeight : 0) + 8;
  const top = card.getBoundingClientRect().top - sc.getBoundingClientRect().top;
  if (!closing || top < off) sc.scrollTop += top - off;
}
function detailSheet(d, sub, pick) {
  const putt = d.putts != null;
  const on = putt ? ui.puttPick && ui.puttPick.has(d.id) : ui.rangePick && ui.rangePick.has(d.id);
  const foot = pick
    ? `<button class="btn ${on ? 'sec' : 'pri'}" data-act="${putt ? 'pickPutt' : 'pickRange'}" data-v="${d.id}">${on ? 'Remove from session' : 'Add to session'}</button>`
    : `<button class="btn pri" data-act="closeSheet">Back to the drill</button>`;
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="${esc(d.name)}: how to do it" data-stop>
    <div class="grab"></div><div class="sheet-title"><h2>${esc(d.name)}</h2><button class="sheet-done" data-act="closeSheet">Done</button></div>
    ${sub ? `<span class="footnote sheet-sub">${esc(sub)}</span>` : ''}
    <div class="sheet-body">${detailPanel(d, true)}</div>
    ${foot}
  </div></div>`;
}

// ---------- range: logger ----------
function currentDrill(a) { return drillById((a.drills || [])[a.di]) || RANGE_DRILLS[0]; }
function drillShots(a) { const d = currentDrill(a); return a.shots.filter(s => s.drill === d.id); }
const shotsFor = (a, d) => a.shots.filter(s => s.drill === d.id);
const trackerOf = a => a.kind === 'baseline' || a.kind === 'retest' ? 'full' : currentDrill(a).tracker || 'full';
const capWord = w => w ? w[0].toUpperCase() + w.slice(1) : w;
const avgCarry = xs => Math.round(xs.reduce((t, s) => t + s.carry, 0) / xs.length);

// Which target the logger draws. Play 9 approaches always aim at a green.
function logView(a) {
  if (a.kind === 'baseline' || a.kind === 'retest') return viewFor(club(a.club).kind, a.type);
  if (trackerOf(a) === 'play9') { const n = p9Now(a); return n && n.phase === 'approach' ? 'irons' : 'woods'; }
  return viewFor(club(a.club).kind, a.type);
}

function targetSvg(a) {
  const cl = club(a.club);
  const view = logView(a);
  const test = a.kind === 'baseline' || a.kind === 'retest';
  const shots = (test ? a.shots.filter(s => s.stage === a.stages[a.si].id) : drillShots(a)).filter(s => s.view === view);
  const pd = a.pending || {};
  const pt = pd.x != null ? pd : null;
  if (view === 'woods') return drawWoods(shots, pd.contact, S().hand, a.type === 'tee' || cl.id === 'D', pt);
  if (view === 'green') return drawGreen(shots, pd.contact, S().hand, pt);
  return drawIrons(shots, pd.contact, S().hand, pt);
}

// ---------- shot draft (range) ----------
// A shot is built up from optional parts and saved with Next shot.
function hasDraft(pd) { return !!(pd && (pd.contact || pd.row || pd.col || pd.holed || pd.curve || pd.height || pd.carry != null || pd.check != null || pd.got || pd.face)); }
function draftPart(pd) {
  const finish = (pd.row || pd.col || pd.holed)
    ? { row: pd.row || null, col: pd.col || null, ...(pd.ft != null ? { ft: pd.ft, dx: pd.dx, dy: pd.dy } : {}), ...(pd.holed ? { holed: true } : {}) }
    : null;
  return { contact: pd.contact || null, finish, curve: pd.curve || null, carry: pd.carry != null ? pd.carry : null, x: pd.x != null ? pd.x : null, y: pd.y != null ? pd.y : null };
}
const OUT_CONTACT = [['pure', 'Pure'], ['thin', 'Thin'], ['chunk', 'Chunk', 'Fat'], ['heel', 'Heel'], ['toe', 'Toe']];
const DIR3 = [['left', 'Left'], ['line', 'On line'], ['right', 'Right']];
function outRow(label, act, opts, cur) {
  return `<div class="out-row"><span class="lbl">${label}</span><div class="out-chips" style="--n:${opts.length}">${opts.map(([v, txt, short]) =>
    `<button class="chip sq ${cur === v ? 'on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${cur === v}" aria-label="${txt}">${short ? (v === 'chunk' ? `<span class="xs-hide">${txt}</span><span class="xs-only">${short}</span>` : `<span class="wide-only">${txt}</span><span class="narrow-only">${short}</span>`) : txt}</button>`).join('')}</div></div>`;
}

// Logger header: End, drill name (truncates), progress, and next drill, all in one row.
// Logger header (a full-screen task): Close leading, title and progress centred, Finish or Next drill trailing.
function logTop(endAct, d, progress, nextAct, more, nextLabel) {
  const closeAct = endAct === 'endRange' ? 'closeRange' : endAct === 'endPutt' ? 'closePutt' : endAct;
  return `<div class="logtop"><button class="back close" data-act="${closeAct}" aria-label="End the session">Close</button>
    <div class="lt-mid"><span class="lt-line"><span class="lt-name">${esc(d.name)}</span>${d.detail ? `<button class="info-btn" data-act="drillInfo" aria-label="How to do ${esc(d.name)}">${ic('info', 22)}</button>` : ''}</span><span class="lt-sub">${progress}</span></div>
    <button class="back lt-next" data-act="${nextAct}">${nextLabel || (more ? 'Next drill' : 'Finish')}</button></div>`;
}
// Closing a session keeps what was logged and opens the recap, so ask first once something is logged.
function confirmEnd(kind) {
  const a = S().active;
  if (!a) return;
  const n = kind === 'putt' ? a.putts.length : a.shots.length;
  if (!n) { finishActive(); go('practice'); return; }
  const unit = kind === 'putt' ? 'putt' : 'ball';
  openOverlay(`<div class="modal-wrap"><div class="modal" role="alertdialog" aria-label="End this session?"><h2>End this session?</h2><p>${n} ${unit}${n > 1 ? 's are' : ' is'} saved. The recap opens next.</p>
    <div class="btn-row"><button class="btn sec" data-modal="cancel">Keep going</button><button class="btn pri" data-modal="ok">End session</button></div></div></div>`);
  const wrap = document.querySelector('.modal-wrap');
  wrap.querySelector('[data-modal=cancel]').focus();
  wrap.addEventListener('click', e => {
    const m = e.target.closest('[data-modal]');
    if (!m && e.target !== wrap) return;
    wrap.remove();
    if (m && m.dataset.modal === 'ok') (kind === 'putt' ? actions.endPutt : actions.endRange)();
  });
}

// ---------- club rail ----------
// The bag in one swipeable row: one tap changes club; touch and hold opens the full bag.
const TYPE_SHORT = { full: 'Full', tee: 'Tee', draw: 'Draw', fade: 'Fade', punch: 'Punch', high: 'High', three: '¾', pitch: 'Pitch', chip: 'Chip' };
function clubRail(a, d, counts) {
  const rel = reliability(S()).clubs;
  const chips = inBag().map(c => {
    const r = rel[c.id], top = r && r.top, on = c.id === a.club, n = counts && counts[c.id];
    return `<button class="rail-club${on ? ' on' : ''}${top && !on ? ' top' : ''}" data-act="railClub" data-v="${c.id}" aria-pressed="${on}" aria-label="${esc(c.name)}, ${c.carry} yards${top ? ', most reliable' : ''}${n ? `, ${n} balls` : ''}"><b>${top ? ic('star', 11) : ''}${esc(clubShort(c))}</b><span>${c.carry}</span>${c.id === d.club && d.id !== 'basic' ? '<i class="rail-dot" aria-hidden="true"></i>' : ''}${n ? `<em>${n}</em>` : ''}</button>`;
  }).join('');
  return `<div class="rail-row"><button class="type-chip" data-act="openShotSetup" aria-label="Swing: ${esc(shotType(a.type).name)}. Opens the full bag.">${esc(TYPE_SHORT[a.type] || shotType(a.type).name)}${ic('down', 14)}</button><div class="rail" data-rail role="group" aria-label="Clubs. Touch and hold for the full bag.">${chips}</div></div>`;
}
function bindRail() {
  const rail = app.querySelector('[data-rail]');
  if (!rail) return;
  const on = rail.querySelector('.rail-club.on');
  if (on) rail.scrollLeft += on.getBoundingClientRect().left - rail.getBoundingClientRect().left - (rail.clientWidth - on.offsetWidth) / 2;
  let t = null;
  rail.addEventListener('pointerdown', () => { clearTimeout(t); ui.railHeld = false; t = setTimeout(() => {
    ui.railHeld = true; ui.holdUp = 0; openOverlay(shotSetupSheet());
    // The finger lifts over the new sheet: swallow that one click so it can't close the sheet or pick a tile.
    document.addEventListener('pointerup', () => { ui.holdUp = Date.now(); }, { once: true, capture: true });
  }, 520); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => rail.addEventListener(ev, () => clearTimeout(t)));
  rail.addEventListener('scroll', () => clearTimeout(t), { passive: true });
}
// Changing club keeps what you've marked, except a spot on a target that no longer applies.
function chooseClub(v) {
  update(s => {
    const a = s.active, d = currentDrill(a), before = logView(a), k = club(v).kind;
    a.club = v;
    if (a.type === 'tee' && !['wood', 'hybrid'].includes(k)) a.type = 'full';
    if ((a.type === 'pitch' || a.type === 'chip') && k !== 'wedge') a.type = 'full';
    if (logView(a) !== before && a.pending) Object.assign(a.pending, { x: null, y: null, row: null, col: null, ft: null, dx: null, dy: null, holed: false });
    if (d.tracker !== 'play9' && d.mode !== 'onedist') s.lastClub = { ...(s.lastClub || {}), [d.id]: v };
  });
}
// The club and swing a drill starts with (Play 9 and One yardage choose for you).
function drillStartClub(a, d) {
  if (d.tracker === 'play9') { const now = p9Now(a); return now ? { club: p9Pick(now), type: now.phase === 'tee' ? 'tee' : 'full' } : { club: a.club, type: 'full' }; }
  if (d.mode === 'onedist') return oneDistPlan(d)[shotsFor(a, d).length % 3];
  const last = (S().lastClub || {})[d.id];
  return { club: last && inBag().some(c => c.id === last) ? last : d.club, type: d.type };
}

function checkRow(q, cur) {
  return `<div class="check-row"><div class="check-q"><span class="lbl">Drill check · optional</span><b>${esc(q)}</b></div><div class="check-btns">
    <button class="chip sq ${cur === true ? 'on' : ''}" data-act="drillCheck" data-v="yes" aria-pressed="${cur === true}">${ic('check', 16)}Yes</button>
    <button class="chip sq ${cur === false ? 'on' : ''}" data-act="drillCheck" data-v="no" aria-pressed="${cur === false}">${ic('x', 16)}No</button></div></div>`;
}

// Basic session: how the selected club is going today.
function clubToday(a) {
  const cl = club(a.club);
  const mine = a.shots.filter(s => s.club === cl.id);
  if (!mine.length) return `<div class="club-today"><div><span class="lbl">${esc(cl.name)} today</span><b>No balls yet</b><span class="muted">Switch clubs any time on the rail</span></div></div>`;
  const withC = mine.filter(s => s.contact);
  const solid = withC.length ? Math.round(withC.filter(s => ['pure', 'solid'].includes(s.contact)).length / withC.length * 100) : null;
  const dirs = { left: 0, right: 0 };
  mine.forEach(s => { const c = s.finish && s.finish.col; if (c === 'left' || c === 'obL') dirs.left++; if (c === 'right' || c === 'obR') dirs.right++; });
  const lean = dirs.left >= 2 && dirs.left > dirs.right ? `Misses lean left (${dirs.left} of ${mine.length})` : dirs.right >= 2 && dirs.right > dirs.left ? `Misses lean right (${dirs.right} of ${mine.length})` : 'No clear miss yet';
  const dots = mine.filter(s => s.x != null && (s.view === 'irons' || s.view === 'woods')).map(s => {
    const miss = s.finish && s.finish.col && s.finish.col !== 'line';
    return `<circle cx="${(s.x / 358 * 96).toFixed(1)}" cy="${(s.y / 430 * 56).toFixed(1)}" r="2.6" fill="${miss ? '#E2B65A' : '#FFFFFF'}"/>`;
  }).join('');
  return `<div class="club-today"><div><span class="lbl">${esc(cl.name)} today</span><b>${mine.length} ball${mine.length === 1 ? '' : 's'}${solid != null ? ` · ${solid}% solid` : ''}</b><span class="muted">${lean}</span></div>
    <svg width="96" height="56" viewBox="0 0 96 56" role="img" aria-label="Where ${esc(cl.name)} shots finished today"><rect width="96" height="56" rx="8" class="t-grass"/><line x1="48" y1="3" x2="48" y2="53" stroke="#FFFFFF" stroke-opacity=".35" stroke-dasharray="3 3"/>${dots}</svg></div>`;
}

// ---------- distance tracker ----------
function oneDistPlan(d) {
  const base = club(d.club);
  const longer = inBag().filter(c => c.carry > base.carry).sort((x, y) => x.carry - y.carry);
  return [{ club: base.id, type: 'full' }, { club: (longer[0] || base).id, type: 'three' }, { club: (longer[1] || longer[0] || base).id, type: 'punch' }];
}
function clockFace(angle, on) {
  const r = angle * Math.PI / 180, x = 32 + 24 * Math.cos(r), y = 32 + 24 * Math.sin(r);
  return `<svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" class="${on ? 'f-sf' : 'f-sf2'}"/><g class="s-ink2" stroke-width="2" stroke-linecap="round"><line x1="32" y1="6" x2="32" y2="10"/><line x1="58" y1="32" x2="54" y2="32"/><line x1="32" y1="58" x2="32" y2="54"/><line x1="6" y1="32" x2="10" y2="32"/></g><line x1="32" y1="32" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="${on ? 's-brand' : 's-ink'}" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="4" class="${on ? 'f-brand' : 'f-ink'}"/></svg>`;
}
function carryCtx(a, d) {
  const shots = shotsFor(a, d), n = shots.length, pd = a.pending || {}, cl = club(a.club);
  if (d.mode === 'ladder') {
    const i = n % LADDER_YDS.length, target = LADDER_YDS[i];
    return { target, label: 'Target ladder · steps up each ball', ghosts: shots,
      sel: `<div class="ladder">${LADDER_YDS.map((y, j) => `<span class="rung${j < i ? ' done' : ''}${j === i ? ' on' : ''}">${y}${j < i ? ic('check', 14) : ''}</span>`).join('')}</div>`,
      next: `Next · ${LADDER_YDS[(i + 1) % LADDER_YDS.length]} yds ›` };
  }
  if (d.mode === 'clock') {
    const len = pd.swing || CLOCK[n % CLOCK.length].id;
    const mineFor = id => shots.filter(s => s.club === cl.id && s.swing === id && s.carry != null);
    const L = CLOCK.find(c => c.id === len);
    const target = mineFor(len).length ? avgCarry(mineFor(len)) : Math.round(cl.carry * L.share);
    const ang = { 730: 135, 900: 180, 1030: 225 };
    return { target, label: 'Backswing length · lead arm points to', ghosts: mineFor(len), swing: len,
      sel: `<div class="clock-pick">${CLOCK.map(c => { const xs = mineFor(c.id), on = c.id === len; return `<button class="clock-btn${on ? ' on' : ''}" data-act="clockLen" data-v="${c.id}" aria-pressed="${on}">${clockFace(ang[c.id], on)}<b>${c.name}</b><span>${xs.length ? `avg ${avgCarry(xs)}` : 'new'}</span></button>`; }).join('')}</div>`,
      next: 'Next shot ›' };
  }
  if (d.mode === 'grip') {
    const grip = pd.grip || (n % 2 ? 'choked' : 'full');
    const target = grip === 'choked' ? cl.choked : cl.carry;
    return { target, label: 'This ball · grip', grip, ghosts: shots.filter(s => s.club === cl.id && s.grip === grip),
      sel: `<div class="seg grip-seg">${[['full', 'Full grip'], ['choked', 'Choked 1 in']].map(([v, t]) => `<button class="${grip === v ? 'on' : ''}" data-act="gripSel" data-v="${v}" aria-pressed="${grip === v}">${t}</button>`).join('')}</div>`,
      next: `Next · ${grip === 'full' ? 'choked' : 'full grip'} ›` };
  }
  const plan = oneDistPlan(d), i = n % 3, target = club(d.club).carry;
  const sw = { full: 'full', three: '¾', punch: 'punch' };
  return { target, label: `One target · ${target} yds`, ghosts: shots,
    sel: `<div class="ladder">${plan.map((p, j) => `<span class="rung${j < i ? ' done' : ''}${j === i ? ' on' : ''}">${esc(clubShort(club(p.club)))} ${sw[p.type]}</span>`).join('')}</div>`,
    next: `Next · ${clubShort(club(plan[(i + 1) % 3].club))} ${sw[plan[(i + 1) % 3].type]} ›` };
}
function carryBody(a, d, pd) {
  const cx = carryCtx(a, d);
  const ghosts = cx.ghosts.filter(s => s.carry != null && s.target != null).map(s => ({ dy: s.carry - s.target, lx: s.lx != null ? s.lx : 201 }));
  const pt = pd.carry != null ? { carry: pd.carry, lx: pd.lx != null ? pd.lx : 201 } : null;
  const diff = pd.carry != null ? pd.carry - cx.target : null;
  const verdict = diff == null ? '' : Math.abs(diff) <= 5 ? `<span class="verdict ok">${diff > 0 ? '+' : ''}${diff} · on the number</span>` : `<span class="verdict off">${diff > 0 ? '+' : ''}${diff} · ${diff > 0 ? 'long' : 'short'}</span>`;
  return { cx, html: `
  <div class="sel-block"><span class="lbl">${cx.label}</span>${cx.sel}</div>
  <div class="target-wrap">${drawCarry(cx.target, ghosts, pt)}</div>
  <div class="carry-read"><button class="step" data-act="carryStep" data-v="-1" aria-label="One yard shorter">−</button>
    <div class="carry-num"><span class="big">${pd.carry != null ? pd.carry : '–'} <small>yds carry</small></span>${verdict || `<span class="muted">Tap where it landed · target ${cx.target}</span>`}</div>
    <button class="step" data-act="carryStep" data-v="1" aria-label="One yard longer">+</button></div>
  <div class="outcome opt-row">${outRow('Contact', 'setContact', OUT_CONTACT, pd.contact)}</div>` };
}

// ---------- shape tracker ----------
const SHAPE_H = ['high', 'mid', 'low'], SHAPE_C = ['draw', 'none', 'fade'];
const shapeWords = (h, c) => `${h} ${c === 'none' ? 'straight' : c}`;
function shapePlan(a, d) { const n = shotsFor(a, d).length; return d.mode === 'punch' ? ['low', 'none'] : NINE_SEQ[n % 9]; }
function shapeBody(a, d, pd) {
  const plan = shapePlan(a, d), hand = S().hand, shots = shotsFor(a, d);
  const cycle = d.mode === 'nine' ? shots.slice(shots.length - (shots.length % 9)) : [];
  const head = `<div class="shape-head"><span></span>${SHAPE_C.map(c => `<span class="lbl">${c === 'none' ? 'Straight' : capWord(c)}</span>`).join('')}</div>`;
  const rows = SHAPE_H.map(h => `<div class="shape-row"><span class="lbl">${capWord(h)}</span>${SHAPE_C.map(c => {
    const planned = plan[0] === h && plan[1] === c, got = pd.got && pd.got.h === h && pd.got.c === c;
    const past = cycle.find(s => s.plan && s.plan.h === h && s.plan.c === c);
    const mark = past ? `<i class="shape-mark ${past.matched ? 'yes' : 'no'}">${ic(past.matched ? 'check' : 'x', 14, past.matched ? 'Matched earlier' : 'Missed earlier')}</i>` : '';
    return `<button class="shape-cell${planned ? ' planned' : ''}${got ? ' got' : ''}" data-act="shapeGot" data-v="${h}-${c}" aria-pressed="${!!got}" aria-label="${shapeWords(h, c)}${planned ? ', planned' : ''}">${shapeGlyph(h, c, hand)}${got ? '<span class="tag">Hit</span>' : planned ? '<span class="tag">Planned</span>' : ''}${mark}</button>`;
  }).join('')}</div>`).join('');
  let status = `This ball: ${shapeWords(plan[0], plan[1])}`, verdict = '';
  if (pd.got) {
    const hOk = pd.got.h === plan[0], cOk = pd.got.c === plan[1];
    status = hOk && cOk ? `Hit the ${shapeWords(plan[0], plan[1])}` : `Hit ${shapeWords(pd.got.h, pd.got.c)}`;
    verdict = hOk && cOk ? 'Matched' : !hOk && !cOk ? 'Both off' : hOk ? 'Curve off' : 'Height off';
  }
  return `
  <div class="status${pd.got ? ' draft' : ''}" aria-live="polite"><span>${capWord(status)}</span><span class="muted">${verdict}</span></div>
  <div class="shape-grid">${head}${rows}</div>
  <p class="helper">Tap the box the ball actually flew. Tap the gold box when it matched.</p>
  <div class="outcome opt-row">${outRow('Start line', 'setDir', DIR3, pd.col)}</div>`;
}

// ---------- strike map ----------
const faceWords = f => f.h === 'center' && f.v === 'mid' ? 'Center' : `${capWord(f.h)}, ${f.v}`;
const faceContact = f => f.h === 'heel' ? 'heel' : f.h === 'toe' ? 'toe' : f.v === 'low' ? 'thin' : f.v === 'high' ? 'under' : 'pure';
function strikeBody(a, d, pd) {
  const faces = shotsFor(a, d).filter(s => s.face).map(s => s.face);
  const last = faces.slice(-6), k = h => last.filter(f => f.h === h).length;
  let insight = '';
  if (last.length >= 3) {
    const heel = k('heel'), toe = k('toe'), center = k('center');
    insight = heel >= 3 && heel > toe ? `<b>${heel} of the last ${last.length} toward the heel</b><span>Heel strikes often come from the hands drifting out at the ball. Feet together is the follow-up drill.</span>`
      : toe >= 3 && toe > heel ? `<b>${toe} of the last ${last.length} toward the toe</b><span>Toe strikes often come from standing up or reaching. Feet together helps here too.</span>`
      : `<b>${center} of the last ${last.length} in the center</b><span>Keep the same setup and tempo.</span>`;
    insight = `<div class="insight">${insight}</div>`;
  }
  return `
  <div class="status${pd.face ? ' draft' : ''}" aria-live="polite"><span>${pd.face ? esc(faceWords(pd.face)) + (pd.col ? ` · started ${pd.col === 'line' ? 'on line' : pd.col}` : '') : 'Tap the powder mark'}</span><span class="muted">${pd.face ? 'This shot' : `${faces.length} logged`}</span></div>
  <div class="target-wrap">${drawFace(S().hand, faces, pd.face, (c => c.id === 'D' ? 'driver' : ['wood', 'hybrid'].includes(c.kind) ? 'wood' : 'iron')(club(a.club)))}</div>
  <div class="sr-only" role="group" aria-label="Mark the strike with buttons">${['high', 'mid', 'low'].flatMap(v => ['heel', 'center', 'toe'].map(h => `<button data-act="faceZone" data-v="${h}:${v}">${h === 'center' && v === 'mid' ? 'Center' : `${capWord(h)}, ${v}`}</button>`)).join('')}</div>
  ${insight}
  <div class="outcome opt-row">${outRow('Flight', 'setDir', DIR3, pd.col)}</div>`;
}

// ---------- Play 9 on the range ----------
// The round is worked out from the shots logged, so Undo always puts you back on the right hole.
function p9Carry(s) {
  let c = s.carry != null ? s.carry : club(s.club).carry;
  const row = s.finish && s.finish.row;
  if (row === 'long') c += 10; if (row === 'short') c -= 15;
  c -= { chunk: 30, top: 80, skied: 60, thin: 10, shank: 100 }[s.contact] || 0;
  return Math.max(20, c);
}
function p9Now(a) {
  const shots = a.shots.filter(s => s.drill === 'play9');
  let i = 0;
  for (let h = 0; h < PLAY9_HOLES.length; h++) {
    const H = PLAY9_HOLES[h], n = H.par - 2;
    let left = H.yds;
    for (let k = 0; k < n; k++) {
      const phase = k === n - 1 ? 'approach' : k === 0 ? 'tee' : 'layup';
      if (i < shots.length) { left = Math.max(30, left - p9Carry(shots[i])); i++; continue; }
      return { h, k, n, H, phase, left: Math.round(left / 5) * 5, hole: shots.slice(i - k, i) };
    }
  }
  return null;
}
function p9Pick(now) {
  const bag = inBag().slice().sort((x, y) => x.carry - y.carry), rel = reliability(S()).clubs;
  const longest = bag[bag.length - 1], noD = bag.filter(c => c.id !== 'D');
  if (now.phase === 'tee') return (bag.find(c => c.id === 'D') || longest).id;
  if (now.phase === 'layup') { const fit = noD.filter(c => c.carry <= now.left - 40); return (fit[fit.length - 1] || noD[noD.length - 1] || longest).id; }
  const pool = now.left > 225 ? bag : noD;
  let pick = pool.find(c => c.carry >= now.left - 3) || pool[pool.length - 1] || longest;
  const score = c => (rel[c.id] && !rel[c.id].locked ? rel[c.id].score : 0);
  const alt = pool.filter(c => c.carry >= now.left - 3 && c.carry <= now.left + 12 && score(c) >= score(pick) + 8).sort((x, y) => score(y) - score(x))[0];
  return (alt || pick).id;
}
function p9Pips(a) {
  const shots = a.shots.filter(s => s.drill === 'play9');
  return `<div class="p9-pips" role="img" aria-label="Fairways and greens by hole">${PLAY9_HOLES.map((H, h) => {
    const mine = shots.filter(s => s.hole === h + 1);
    const tee = mine.find(s => s.phase === 'tee'), app_ = mine.find(s => s.phase === 'approach');
    const fw = H.par === 3 ? 'na' : !tee ? '' : (tee.tally ? tee.hit : tee.finish && tee.finish.col === 'line') ? 'hit' : 'miss';
    const gr = !app_ ? '' : (app_.tally ? app_.hit : app_.finish && app_.finish.row === 'pin' && app_.finish.col === 'line') ? 'hit' : 'miss';
    return `<span><b>${h + 1}</b><i class="${fw}"></i><i class="${gr} g"></i></span>`;
  }).join('')}</div>`;
}
function play9Card(a, now) {
  const phaseName = { tee: 'Tee shot', layup: 'Lay-up', approach: 'Approach' };
  const steps = [];
  for (let k = 0; k < now.n; k++) {
    const ph = k === now.n - 1 ? 'approach' : k === 0 ? 'tee' : 'layup';
    const done = now.hole[k];
    steps.push(`<span class="p9-step${done ? ' done' : k === now.k ? ' on' : ''}"><i>${done ? ic('check', 12) : k + 1}</i>${phaseName[ph]}${done ? ` · ${esc(clubShort(club(done.club)))}${done.finish && done.finish.col ? ' · ' + esc(finishWords(done)) : ''}` : k === now.k ? (ph === 'approach' ? ` · ${now.left} to the pin` : ` · ${now.left} to go`) : ''}</span>`);
  }
  const pick = club(p9Pick(now));
  const note = a.club === pick.id ? `Caddy picked ${esc(pick.name)}: ${pick.carry} carry.` : `You picked ${esc(club(a.club).name)}. Caddy would use ${esc(pick.name)}.`;
  return `<div class="p9-card"><div class="p9-top"><b>Hole ${now.h + 1} · Par ${now.H.par} · ${now.H.yds}</b><span>${note}</span></div><div class="p9-steps">${steps.join('')}</div>${p9Pips(a)}</div>`;
}

function rangeLog() {
  const a = S().active;
  if (!a || a.kind !== 'range') { go('range'); return ''; }
  const d = currentDrill(a);
  const tr = d.tracker || 'full';
  const cl = club(a.club);
  const st = shotType(a.type);
  const done = drillShots(a).length;
  const last = a.shots[a.shots.length - 1];
  const pend = a.pending || {};
  const view = logView(a);
  const has = hasDraft(pend);
  const basic = d.id === 'basic';
  const more = a.di < a.drills.length - 1;
  const counts = basic ? a.shots.reduce((m, s) => { m[s.club] = (m[s.club] || 0) + 1; return m; }, {}) : null;
  if (!basic && !S().detailTrack) return tallyLog(a, d, 'range');
  let progress = `${done}/${d.balls} balls`, body = '', nextLabel = 'Next shot ›', carryBtn = false, topNext = null;
  if (basic) {
    progress = `${a.shots.length} ball${a.shots.length === 1 ? '' : 's'} · ${Object.keys(counts).length} club${Object.keys(counts).length === 1 ? '' : 's'}`;
    topNext = 'Finish';
  }
  if (tr === 'full' || tr === 'play9') {
    const draft = { view, height: pend.height || null, ...draftPart(pend) };
    const lenOpts = view === 'woods' ? [['short', 'Short'], ['pin', 'Normal'], ['long', 'Long']] : [['short', 'Short'], ['pin', 'Pin high'], ['long', 'Long']];
    const dirOpts = view === 'woods' ? [['obL', 'OB L'], ['left', 'Left'], ['line', 'Fairway', 'Fwy'], ['right', 'Right'], ['obR', 'OB R']] : DIR3;
    const heightRow = st.height ? outRow('Height', 'height', [['low', 'Low'], ['mid', 'Mid'], ['high', 'High']], pend.height) : '';
    const curveRow = st.curve ? outRow('Curve', 'curve', [['hook', 'Hook'], ['draw', 'Draw'], ['none', 'Straight', 'Str.'], ['fade', 'Fade'], ['slice', 'Slice']], pend.curve) : '';
    let lead = basic ? clubToday(a) : '';
    if (tr === 'play9') {
      const now = p9Now(a);
      if (!now) return `${logTop('endRange', d, 'All 9 holes played', 'endRange', false)}<div class="scroll-y" data-shell><div class="card hero"><span class="lbl">Round complete</span><span class="h2">${esc(p9Score(a))}</span></div></div><div class="bar"><button class="btn pri" data-act="${more ? 'nextDrill' : 'endRange'}">${more ? 'Next drill' : 'Finish session'}</button></div>`;
      progress = `Hole ${now.h + 1} of 9 · shot ${now.k + 1} of ${now.n}`;
      lead = play9Card(a, now);
      nextLabel = now.k === now.n - 1 ? (now.h < 8 ? `Next · hole ${now.h + 2} ›` : 'Finish round ›') : 'Next shot ›';
    }
    const idle = basic || tr === 'play9' ? 'Tap the ball, then the grass' : 'Tap the ball, then the grass';
    body = `${lead}
  <div class="status ${has ? 'draft' : ''}" aria-live="polite"><span>${has ? esc(describeShot(draft)) + (pend.check != null ? ` · check ${pend.check ? 'yes' : 'no'}` : '') : last && last.drill === d.id ? esc(describeShot(last)) : idle}</span><span class="muted">${has ? 'This shot' : done ? `Saved #${done}` : ''}</span></div>
  <div class="target-wrap">${targetSvg(a)}</div>
  ${zoneButtons(view)}
  <p class="helper opt">Tap the ball for contact, then the grass where it finished. Bottom row = chunk · hold the ball = topped or shank · drag = curve.</p>
  ${d.check ? checkRow(d.check, pend.check) : heightRow ? `<div class="outcome opt-row">${heightRow}</div>` : ''}`;
    carryBtn = tr === 'full';
  } else if (tr === 'carry') {
    const r = carryBody(a, d, pend); body = r.html; nextLabel = r.cx.next;
  } else if (tr === 'shape') {
    body = shapeBody(a, d, pend);
    const n = done + 1; nextLabel = d.mode === 'nine' ? `Next · ${shapeWords(...NINE_SEQ[n % 9])} ›` : 'Next shot ›';
  } else if (tr === 'strike') {
    body = strikeBody(a, d, pend);
  }
  return `
  ${logTop('endRange', d, progress, basic ? 'endRange' : 'nextDrill', more, topNext)}
  ${clubRail(a, d, counts)}
  <div class="scroll-y log-body" data-keep="rlog-${d.id}">
  ${body}
  </div>
  <div class="bar"><div class="bar-row${carryBtn ? '' : ' two'}">
    <button class="btn sec sm" data-act="undo">${has ? 'Clear' : 'Undo'}</button>
    ${carryBtn ? `<button class="btn dash sm" data-act="carry" aria-label="Carry yards, optional">${pend.carry != null ? `${pend.carry} yds` : '+ Carry'}</button>` : ''}
    <button class="btn pri next-shot" data-act="nextShot" ${has ? '' : 'disabled'}>${nextLabel}</button>
  </div></div>`;
}
// The drawn targets are the visual way to log. These buttons give VoiceOver and Switch Control the same outcomes.
function zoneButtons(view) {
  const hand = S().hand, L = hand === 'left' ? 'toe' : 'heel', R = hand === 'left' ? 'heel' : 'toe';
  const b = (v, t) => `<button data-act="zone" data-v="${v}">${t}</button>`;
  const under = view === 'woods' ? 'skied' : 'under';
  const ball = ['thin', L, 'pure', R, under].map(c => b(`c:${c}`, `Contact: ${c}`));
  const rowW = { long: 'Long', pin: view === 'woods' ? 'Normal length' : 'Pin high', short: 'Short' };
  const cols = view === 'woods' ? [['obL', 'out of bounds left'], ['left', 'left rough'], ['line', 'fairway'], ['right', 'right rough'], ['obR', 'out of bounds right']] : [['left', 'left'], ['line', 'on line'], ['right', 'right']];
  const fin = ['long', 'pin', 'short'].flatMap(r => cols.map(([c, t]) => b(`f:${r}:${c}`, `Finished: ${rowW[r]}, ${t}`)));
  const chunk = view === 'woods' ? [] : [['left', 'left'], ['line', 'straight'], ['right', 'right']].map(([c, t]) => b(`k:${c}`, `Chunked, ${t}`));
  return `<div class="sr-only" role="group" aria-label="Log this shot with buttons">${ball.join('')}${fin.join('')}${chunk.join('')}</div>`;
}
function p9Score(a) {
  const shots = a.shots.filter(s => s.drill === 'play9');
  if (shots.some(s => s.tally)) { const t = ph => shots.filter(s => s.phase === ph); const h = xs => xs.filter(s => s.hit).length; return `Fairways ${h(t('tee'))} of ${t('tee').length} · greens ${h(t('approach'))} of ${t('approach').length}`; }
  const fw = shots.filter(s => s.phase === 'tee' && s.finish && s.finish.col);
  const gr = shots.filter(s => s.phase === 'approach' && s.finish);
  return `Fairways ${fw.filter(s => s.finish.col === 'line').length} of ${fw.length} · greens ${gr.filter(s => s.finish.row === 'pin' && s.finish.col === 'line').length} of ${gr.length}`;
}

// Full bag: tiles with carry, loft and reliability, plus every swing type.
function shotSetupSheet() {
  const a = S().active;
  const groups = [['Woods and hybrids', ['wood', 'hybrid']], ['Irons', ['iron']], ['Wedges', ['wedge']]];
  const rel = reliability(S()).clubs;
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="Club and swing" data-stop>
    <div class="grab"></div><div class="sheet-title"><h2>Club and swing</h2><button class="sheet-done" data-act="closeSheet">Done</button></div>
    <div class="sheet-body">
    ${groups.map(([name, kinds]) => { const list = inBag().filter(c => kinds.includes(c.kind)); return list.length ? `<span class="lbl">${name}</span><div class="bag-tiles">${list.map(c => {
      const r = rel[c.id], top = r && r.top, on = c.id === a.club;
      return `<button class="bag-tile${on ? ' on' : ''}${top && !on ? ' top' : ''}" data-act="setClub" data-v="${c.id}" aria-pressed="${on}" aria-label="${esc(c.name)}"><b>${top ? ic('star', 12) : ''}${esc(clubShort(c))}</b><span>${c.carry} yds</span></button>`;
    }).join('')}</div>` : ''; }).join('')}
    <span class="lbl">Swing</span>
    <div class="swing-grid">${SHOT_TYPES.map(t => `<button class="chip sq ${t.id === a.type ? 'on' : ''}" data-act="setType" data-v="${t.id}" aria-pressed="${t.id === a.type}">${esc(t.name)}</button>`).join('')}</div>
    <p class="footnote">A star marks your most reliable clubs.</p>
    </div>
    <button class="btn pri" data-act="closeSheet">Use ${esc(club(a.club).name)} · ${esc(shotType(a.type).name)}</button>
  </div></div>`;
}

// ---------- range recap ----------
function rangeRecapView(id) {
  const st = S();
  const sess = st.sessions.find(s => s.id === id);
  if (!sess) return `<div class="top">${back('', 'Home')}</div><h1>Session not found</h1>`;
  if ((sess.shots || []).some(x => x.tally)) return tallyRecapView(sess);
  const rc = rangeRecap(sess, st.bag);
  const rel = reliability(st).clubs[rc.mainClub];
  const n = sess.shots.length;
  return `
  <div class="top">${back('', 'Home')}</div>
  <div class="scroll-y" data-keep="rrecap">
  <div class="title-block"><span class="eyebrow">${sess.basic ? 'Basic session' : 'Session recap'} · ${fmtDate(sess.ended)} · ${n}\u00a0balls</span>
  <h1>${esc(rc.headline)}</h1></div>
  ${(() => { const ds = drillScores(sess); return ds.length ? `<div class="card"><span class="lbl">Drill scores</span>${ds.map(x => `<div class="score-row"><b>${esc(x.name)}</b><span>${esc(nb(x.value))}</span></div>${x.target ? tgtPill(x.target) : ''}`).join('')}</div>` : ''; })()}
  ${gapSuggest(sess, st.bag).map(g => `<div class="card gap-card"><span class="lbl">Update My bag?</span><span>${esc(g.name)}: full <b>${g.full}</b> (was ${g.was[0]}), choked <b>${g.choked}</b> (was ${g.was[1]}).</span><button class="btn pri sm" data-act="applyGap" data-v="${g.id}" data-full="${g.full}" data-choked="${g.choked}">Update My bag</button></div>`).join('')}
  <div class="card">${rc.lines.map(l => `<p>${esc(nb(l))}</p>`).join('')}<p class="muted">${esc(nb(rc.cause))}</p></div>
  ${(() => { const ct = clubTable(sess, st.bag); return ct.length > 1 || sess.basic ? `<div class="card"><span class="lbl">By club</span><table class="club-tbl"><thead><tr><th>Club</th><th>Balls</th><th>Solid</th><th>Usual miss</th></tr></thead><tbody>${ct.map(r => `<tr><td>${esc(r.name)}</td><td>${r.n}</td><td>${r.solid != null ? r.solid + '%' : '–'}</td><td>${r.lean ? esc(capWord(r.lean)) : '–'}</td></tr>`).join('')}</tbody></table></div>` : ''; })()}
  ${scienceCard(rc.science)}
  <div class="stat-row">${['right', 'line', 'left'].map(k => `<div class="stat ${rc.dirs[k] === Math.max(rc.dirs.left, rc.dirs.right) && k !== 'line' && rc.dirs[k] > 0 ? 'hi' : ''}"><b>${rc.dirs[k]}</b><span>${k === 'line' ? 'on line' : k}</span></div>`).join('')}</div>
  ${rc.goals.length ? `<div class="card">${rc.goals.map(g => `<span><b>${esc(g.name)}:</b> ${g.hits} of ${g.n} hit the goal</span>`).join('')}</div>` : ''}
  ${rc.mainClub ? `<a class="setup-row" href="#/bag" style="text-decoration:none"><span>${esc(club(rc.mainClub).name)} reliability ${rel && !rel.locked ? `<b>${rel.score}</b>` : ''}</span>${rel && !rel.locked ? (rel.top ? `<span class="badge">${ic('star', 13)} Most reliable</span>` : '') : `<span class="locked">${lockIcon}${rel ? rel.sessions : 0} of ${RELIABILITY.sessionsRequired}</span>`}</a>` : ''}
  <div class="card hero"><span class="lbl">Next time</span>
    <span>${rc.drills.map(id => `${esc(drillById(id).name)} · ${drillById(id).balls} balls`).join('<br>')}<br><span class="muted">Clubs: ${rc.focusClubs.map(esc).join(', ')}</span></span></div>
  </div>
  <div class="bar"><button class="btn pri" data-act="savePlan" data-kind="range" data-v="${rc.drills.join(',')}">Save as next practice plan</button></div>`;
}

// Recap status: an icon and the words, never colour alone.
const tgtPill = t => `<p class="tgt ${t.status}">${t.status === 'met' ? ic('check', 16) : t.status === 'not' ? ic('ring', 16) : ''}<span>${esc(nb(targetWords(t)))}</span></p>`;

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
  <div class="scroll-y" data-keep="ppick">
  ${scienceCard('break')}
  <div class="chips scroll sticky-chips">${cats.map(c => `<button class="chip ${c === cat ? 'on' : ''}" data-act="puttCat" data-v="${c}">${c}</button>`).join('')}</div>
  ${list.map(d => {
    const on = ui.puttPick.has(d.id);
    return `<div class="drill ${on ? 'on' : ''}" role="button" tabindex="0" data-act="pickPutt" data-v="${d.id}" aria-pressed="${on}">${drillGlyph(d.glyph)}
      <span class="grow"><span class="name">${esc(d.name)}</span><span class="meta">${esc(d.trains)}</span><span class="meta">${d.dist}\u00a0ft · ${d.putts}\u00a0putts</span></span>${detailBtn(d)}<span class="pick-mark">${on ? checkOn : checkOff}</span></div>`;
  }).join('')}
  </div>
  <div class="bar"><button class="btn pri" data-act="startPutt" ${n ? '' : 'disabled'}>Start · ${n} drill${n === 1 ? '' : 's'} · ${putts} putts</button></div>`;
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
  if (!S().detailTrack) return tallyLog(a, d, 'putt');
  const mine = a.putts.filter(p => p.drill === d.id);
  const made = mine.filter(p => p.made).length;
  const last = a.putts[a.putts.length - 1];
  const brkName = { left: 'Breaks left', straight: 'Straight', right: 'Breaks right' }[a.brk];
  const pd = a.ppend || {};
  const has = hasPutt(pd);
  return `
  ${logTop('endPutt', d, `${mine.length}/${d.putts} putts`, 'nextPuttDrill', a.di < a.drills.length - 1)}
  <div class="scroll-y log-body" data-keep="plog">
  <button class="setup-row" data-act="openPuttSetup"><span><b>${a.dist}\u00a0ft</b> · ${brkName}</span><span class="muted setup-change">Change${ic('chev', 16)}</span></button>
  <div class="status ${has ? 'draft' : ''}" aria-live="polite"><span>${has ? esc(puttWords(draftPutt(a, pd))) : last ? esc(puttWords(last)) : 'Tap where the ball stopped'}</span><span class="muted">${has ? 'This putt' : `Made ${made} of ${mine.length}`}</span></div>
  <div class="target-wrap">${drawPutt(mine, a.brk, pd.made ? { x: 179, y: 150 } : pd.x != null ? pd : null)}</div>
  <div class="sr-only" role="group" aria-label="Log this putt with buttons"><button data-act="puttResult" data-v="made">Made it</button><button data-act="puttLen" data-v="short">Finished short</button><button data-act="puttLen" data-v="long">Finished long</button><button data-act="puttSide" data-v="left">Missed left</button><button data-act="puttSide" data-v="center">On line</button><button data-act="puttSide" data-v="right">Missed right</button></div>
  <p class="helper opt">Tap the cup if it dropped, or where the ball stopped. Gold = ideal pace.</p>
  <button class="switch-row opt" role="switch" aria-checked="${!!pd.lip}" data-act="puttResult" data-v="lip"><span class="grow"><b>Lipped out</b><span class="muted">Optional</span></span><i class="switch" aria-hidden="true"></i></button>
  </div>
  <div class="bar"><div class="bar-row two">
    <button class="btn sec sm" data-act="undoPutt">${has ? 'Clear' : 'Undo'}</button>
    <button class="btn pri next-shot" data-act="nextPutt" ${has ? '' : 'disabled'}>Next shot ›</button>
  </div></div>`;
}

function puttSetupSheet() {
  const a = S().active;
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="Putt setup" data-stop>
    <div class="grab"></div><div class="sheet-title"><h2>Distance and break</h2><button class="sheet-done" data-act="closeSheet">Done</button></div>
    <div class="sheet-body">
    <span class="lbl">Distance</span>
    <div class="strokes dist-step"><button class="step" data-act="distStep" data-v="-1" aria-label="One foot shorter">${ic('minus', 24)}</button><div class="st-num" aria-live="polite"><b>${a.dist}</b><span>feet</span></div><button class="step" data-act="distStep" data-v="1" aria-label="One foot longer">${ic('plus', 24)}</button></div>
    <div class="quick">${[3, 5, 10, 20].map(f => `<button class="chip ${f === a.dist ? 'on' : ''}" data-act="setDist" data-v="${f}">${f}\u00a0ft</button>`).join('')}</div>
    <span class="lbl">Break</span>
    <div class="seg">${['left', 'straight', 'right'].map(b => `<button class="${b === a.brk ? 'on' : ''}" data-act="setBreak" data-v="${b}">${b === 'straight' ? 'Straight' : 'Breaks ' + b}</button>`).join('')}</div>
    </div></div></div>`;
}

function puttRecapView(id) {
  const sess = S().sessions.find(s => s.id === id);
  if (!sess) return `<div class="top">${back('', 'Home')}</div><h1>Session not found</h1>`;
  if ((sess.putts || []).some(x => x.tally)) return tallyRecapView(sess);
  const rc = puttRecap(sess);
  return `
  <div class="top">${back('', 'Home')}</div>
  <div class="scroll-y" data-keep="precap">
  <div class="title-block"><span class="eyebrow">Putting recap · ${fmtDate(sess.ended)} · ${sess.putts.length}\u00a0putts</span>
  <h1>${esc(rc.headline)}</h1></div>
  ${rc.long && rc.long.n ? `<span class="lbl">15 ft and longer</span><div class="stat-row"><div class="stat ${rc.long.short >= rc.long.long ? 'hi' : ''}"><b>${rc.long.short}</b><span>Short</span></div><div class="stat ${rc.long.long > rc.long.short ? 'hi' : ''}"><b>${rc.long.long}</b><span>Long</span></div><div class="stat"><b>${rc.long.made}</b><span>Made</span></div></div>` : ''}
  <div class="card">${rc.lines.map(l => `<p>${esc(nb(l))}</p>`).join('')}</div>
  ${(() => { const ds = puttDrillScores(sess); return ds.length ? `<div class="card"><span class="lbl">Drill scores</span>${ds.map(x => `<div class="score-row"><b>${esc(x.name)}</b><span>${esc(nb(x.value))}</span></div>${x.target ? tgtPill(x.target) : ''}`).join('')}</div>` : ''; })()}
  ${scienceCard(rc.focus === 'break' || rc.focus === 'line' ? 'break' : 'speed')}
  <div class="card hero"><span class="lbl">Next time</span><span>${rc.drills.map(id => `${esc(drillById(id).name)} · ${drillById(id).putts} putts`).join('<br>')}</span></div>
  </div>
  <div class="bar"><button class="btn pri" data-act="savePlan" data-kind="putt" data-v="${rc.drills.join(',')}">Save as next practice plan</button></div>`;
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
  <div class="scroll-y" data-keep="course">
  <div style="display:flex;align-items:baseline;justify-content:space-between"><h1>Hole ${h.n}</h1><button class="chip" data-act="par">Par ${h.par}</button></div>
  <div class="shot-list">${h.shots.map((s, i) => `<div><span>${i + 1} · ${esc(club(s.club).name)} · ${s.from}</span><b>${s.result}</b></div>`).join('')}</div>
  <div class="card" style="border:2px solid var(--brand)">
    <div style="display:flex;justify-content:space-between;align-items:center"><span class="h2">Shot ${h.shots.length + 1}</span>
      <select data-act="draftClub" aria-label="Club" style="min-height:40px;border-radius:12px;border:1.5px solid var(--line);background:var(--sf);padding:0 10px">${inBag().map(c => `<option value="${c.id}" ${c.id === dr.club ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
    <span class="lbl">From</span><div class="chips">${FROM.map(f => `<button class="chip ${dr.from === f ? 'on' : ''}" data-act="draftFrom" data-v="${f}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
    <span class="lbl">Result</span><div class="chips">${RESULT.map(r => `<button class="chip ${dr.result === r ? 'on' : ''}" data-act="draftResult" data-v="${r}">${r[0].toUpperCase() + r.slice(1)}</button>`).join('')}</div>
    <button class="btn pri" data-act="addShot" ${dr.result ? '' : 'disabled style="opacity:.5"'}>Log shot</button>
  </div>
  </div>
  <div class="bar"><div class="course-bar">
    <button class="btn sec sm" data-act="undoShot">Undo</button>
    <span class="putt-step" role="group" aria-label="Putts on this hole"><button data-act="putts" data-v="-1" aria-label="One fewer putt">−</button><span><b>${h.putts}</b><small>putt${h.putts === 1 ? '' : 's'}</small></span><button data-act="putts" data-v="1" aria-label="One more putt">+</button></span>
    <button class="btn pri" data-act="nextHole">${a.hole < 18 ? 'Next hole ›' : 'Finish round'}</button>
  </div></div>`;
}

function courseRecapView(id) {
  const sess = S().sessions.find(s => s.id === id);
  if (!sess) return `<div class="top">${back('', 'Home')}</div><h1>Round not found</h1>`;
  const rc = courseRecap(sess);
  const max = Math.max(1, ...rc.buckets.map(b => b.w));
  return `
  <div class="top">${back('', 'Home')}${themeBtn()}</div>
  <div class="scroll-y" data-keep="crecap">
  <span class="lbl">Round recap · ${fmtDate(sess.ended)} · ${rc.holes} holes · ${rc.strokes} strokes</span>
  <h1>${esc(rc.headline)}</h1>
  <div class="card">${rc.lines.map(l => `<p>${esc(l)}</p>`).join('') || '<p>No obvious leaks. Nice round.</p>'}</div>
  <div class="card soft"><span class="lbl">Where it leaked</span><div class="bars">${rc.buckets.map((b, i) => `<div class="bar-row"><span ${i === 0 ? 'style="font-weight:700"' : ''}>${b.name}</span><span class="track"><span class="fill ${i === 0 ? 'gold' : ''}" style="width:${Math.round(b.w / max * 100)}%"></span></span><span class="mono" style="text-align:right">${b.n} ${b.unit}</span></div>`).join('')}</div>
    <span class="muted" style="font-size:13px">Approach play drives most of the scoring gap between golfers (Broadie, strokes gained).</span></div>
  ${rc.plan ? `<div class="card hero"><span class="lbl">Next practice</span><span>Range: ${rc.plan.range.map(i => esc(drillById(i).name)).join(', ')}<br>Putting: ${rc.plan.putt.map(i => esc(drillById(i).name)).join(', ')}</span></div>` : ''}
  </div>
  ${rc.plan ? `<div class="bar"><button class="btn goldbtn" data-act="roundPlan" data-r="${rc.plan.range.join(',')}" data-p="${rc.plan.putt.join(',')}">Add to next session</button></div>` : ''}`;
}

// ---------- play ----------
function playSetup() {
  const c = S().conditions;
  const course = ui.roundDraft && courseById(ui.roundDraft.courseId);
  const seg = (act, cur, opts) => `<div class="seg">${opts.map(m => `<button class="${cur === m ? 'on' : ''}" data-act="${act}" data-v="${m}" aria-pressed="${cur === m}">${capWord(m)}</button>`).join('')}</div>`;
  return `
  <div class="top">${course && ui.preview ? back('play/course', 'Course') : back('play', 'Play')}</div>
  <h1>Conditions</h1>
  <div class="scroll-y" data-keep="play">
  <p class="footnote">${course ? esc(course.name) + '. ' : 'Just the caddy. '}Set once; carries and lies adjust from here.</p>
  <div class="field"><div class="field-top"><span class="lbl">Temperature</span><b class="val" id="tempVal">${c.temp}°F</b></div>
    <input type="range" min="30" max="105" step="1" value="${c.temp}" style="--p:${(c.temp - 30) / 0.75}%" data-input="temp" aria-label="Temperature in degrees Fahrenheit"></div>
  <div class="field"><span class="lbl">Ground</span>${seg('moist', c.moisture, ['dry', 'normal', 'wet'])}</div>
  <div class="field"><span class="lbl">Elevation</span>
    <div class="strokes elev-step"><button class="step" data-act="elevStep" data-v="-100" aria-label="100 feet lower">${ic('minus', 24)}</button>
      <label class="st-num"><input type="number" inputmode="numeric" data-elev value="${c.elev}" aria-label="Elevation in feet"><span>feet above sea level</span></label>
      <button class="step" data-act="elevStep" data-v="100" aria-label="100 feet higher">${ic('plus', 24)}</button></div></div>
  <div class="field"><span class="lbl">Difficulty</span>${seg('diff', c.difficulty, ['easy', 'medium', 'hard'])}<p class="helper">${esc(DIFFICULTY[c.difficulty])}</p></div>
  </div>
  <div class="bar">${ui.roundDraft ? '<button class="btn pri" data-act="teeOff">Tee off</button>' : '<button class="btn pri" data-act="openCaddy">Open caddy</button>'}</div>`;
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
  const rd = curRound(), fromHole = rd && ui.fromHole ? rd.holes[rd.hole] : null;
  const rows = inBag().map(cl => {
    const r = rel.clubs[cl.id];
    const adj = adjustedCarry(cl, c, rec.choke);
    return `<div class="club-row ${cl.id === pickId ? 'pick' : r && r.top ? 'top' : ''}" data-club="${cl.id}"><span class="nm">${r && r.top ? ic('star', 13) : ''}${esc(cl.name)}</span><span class="num">${adj}</span>${relRow(r, r && r.top)}</div>`;
  }).join('');
  const lieTab = `
    <span class="lbl">Surface</span>
    <div class="chips">${Object.entries(SURFACES).map(([k, v]) => `<button class="chip ${cad.surface === k ? 'on' : ''}" data-act="surface" data-v="${k}">${v.name}</button>`).join('')}</div>
    <span class="lbl">Slope</span>
    <div class="seg">${['flat', 'up', 'down'].filter(k => SLOPES[k]).map(k => `<button class="${cad.slope === k ? 'on' : ''}" data-act="slope" data-v="${k}" aria-pressed="${cad.slope === k}">${SLOPES[k].name}</button>`).join('')}</div>
    <span class="lbl">Ball position</span>
    <div class="seg">${['above', 'below'].filter(k => SLOPES[k]).map(k => `<button class="${cad.slope === k ? 'on' : ''}" data-act="slope" data-v="${k}" aria-pressed="${cad.slope === k}">${SLOPES[k].name}</button>`).join('')}</div>
    ${Object.keys(SLOPES).filter(k => !['flat', 'up', 'down', 'above', 'below'].includes(k)).length ? `<div class="chips">${Object.entries(SLOPES).filter(([k]) => !['flat', 'up', 'down', 'above', 'below'].includes(k)).map(([k, v]) => `<button class="chip ${cad.slope === k ? 'on' : ''}" data-act="slope" data-v="${k}">${v.name}</button>`).join('')}</div>` : ''}
    <button class="switch-row" role="switch" aria-checked="${!!cad.steep}" data-act="steep" ${cad.slope === 'flat' ? 'disabled' : ''}><span class="grow"><b>Steep slope</b><span class="muted">${cad.slope === 'flat' ? 'Pick a slope first' : 'Bigger adjustment for a severe lie'}</span></span><i class="switch" aria-hidden="true"></i></button>`;
  const sheetTab = `
    <div style="display:flex;flex-direction:column;gap:3px">${rows}</div>
    <p class="helper">${esc(rec.notes.join(' '))}</p>`;
  return `
  <div class="top navbar">${fromHole ? back('round', `Hole ${fromHole.n}`) : back('play/conditions', 'Conditions')}<span class="nav-title"><b>Caddy</b><small>${fromHole ? `Hole ${fromHole.n}${fromHole.yds ? ` · ${fromHole.yds}\u00a0yds` : ''}` : `${c.temp}°F · ${c.moisture} · ${c.difficulty}`}</small></span><span class="top-pad" aria-hidden="true"></span></div>
  <div class="card yd-card">
    <span class="big">${cad.target} <span class="unit">yds to pin</span></span>
    <input type="range" min="50" max="300" step="10" value="${cad.target}" style="--p:${(cad.target - 50) / 2.5}%" data-input="target" aria-label="Yards to pin, in 10-yard steps">
    <div class="ticks" aria-hidden="true"><span>50</span><span>100</span><span>150</span><span>200</span><span>250</span><span>300</span></div>
  </div>
  <p class="cond-line">Lie: ${esc(capWord(lieName))}</p>
  <nav class="seg" aria-label="Caddy tabs"><button class="${sheet ? 'on' : ''}" data-act="tab" data-v="sheet" aria-current="${sheet ? 'page' : 'false'}">Cheat sheet</button><button class="${!sheet ? 'on' : ''}" data-act="tab" data-v="lie" aria-current="${!sheet ? 'page' : 'false'}">Lie</button></nav>
  ${sheet ? '<div class="table-head lbl"><span>Club</span><span>Carry</span><span>Reliability</span></div>' : ''}
  <div id="swipe" class="scroll-y caddy-body" data-keep="caddy-${sheet ? 'sheet' : 'lie'}">${sheet ? sheetTab : lieTab}</div>
  <div class="bar bar-card"><div class="shotcard" aria-live="polite">
    <span class="h2">${rec.pick ? esc(rec.pick.c.name) + (rec.choke ? ', choked down' : ', stock swing') : 'No club fits'}</span>
    <span class="muted">Plays like ${rec.playsLike} · ${esc(rec.aim)} ${esc(rec.swing)}</span>
    <span class="muted" style="font-size:14px">${esc(rec.reason)}</span>
    ${rec.watch ? `<span class="muted" style="font-size:14px"><b style="color:var(--heroInk)">Watch:</b> ${esc(rec.watch)}</span>` : ''}
    <span class="ev">${rec.evidence}</span>
    ${fromHole && rec.pick ? `<button class="btn goldbtn sm use-club" data-act="useClub">Use this club · save to hole ${fromHole.n}</button>` : ''}
  </div></div>`;
}

// ---------- bag ----------
function bag() {
  const st = S();
  const rel = reliability(st);
  const n3 = Math.min(rel.rangeSessions, RELIABILITY.sessionsRequired);
  const banner = !rel.anyUnlocked ? `
    <div class="card hero banner" role="status">
      <div class="banner-top"><span style="color:var(--gold)">${lockIcon}</span><b>No reliability scores yet</b><span class="mono banner-n">${n3} of ${RELIABILITY.sessionsRequired}</span></div>
      <div class="pips" aria-label="${n3} of ${RELIABILITY.sessionsRequired} sessions logged">${[0, 1, 2].map(i => `<span class="${i < rel.rangeSessions ? 'on' : ''}"></span>`).join('')}</div>
      <p class="muted">A club is scored after ${RELIABILITY.sessionsRequired} practice sessions with it. Until then the caddy picks by carry alone.</p>
      <div class="btn-row"><a class="btn goldbtn sm" href="#/bag/how">Why three?</a><button class="btn sec sm on-hero" data-act="sample">Try sample data</button></div>
    </div>` : '';
  const edit = !!ui.bagEdit, nCustom = st.bag.filter(c => c.custom).length;
  return `
  <div class="top">${back('', 'Home')}<button class="back lt-next" data-act="bagEdit" aria-pressed="${edit}">${edit ? 'Done' : 'Edit'}</button></div>
  <div class="title-row bag-title"><span class="title-row">${bagGlyph(42, 'g-brand')}<h1>My bag</h1></span><span class="footnote">Carries at 70°F, sea level</span></div>
  <div class="scroll-y" data-keep="bag">
  ${banner}
  <div class="bag-head${edit ? ' editing' : ''}" aria-hidden="true"><span>Club</span><span>Full</span><span>Choked</span><span>Reliability</span></div>
  <div class="bag-list">${st.bag.map(c => {
    const r = rel.clubs[c.id];
    const top = !c.out && r && r.top;
    const sub = [c.loft != null ? `${c.loft}° loft` : '', c.out ? 'Out of the bag' : ''].filter(Boolean).join(' · ');
    const lead = edit ? `<button class="edit-btn ${c.out ? 'put' : 'take'}" data-act="toggleOut" data-v="${c.id}" aria-label="${c.out ? 'Put' : 'Take'} ${esc(c.name)} ${c.out ? 'back in' : 'out of'} the bag">${ic(c.out ? 'plus' : 'minus', 18)}</button>` : '';
    const tail = edit && c.custom ? `<button class="edit-del" data-act="deleteClub" data-v="${c.id}" aria-label="Delete ${esc(c.name)}">${ic('trash', 20)}</button>` : '';
    return `<div class="bag-row${top ? ' top' : ''}${c.out ? ' out' : ''}${edit ? ' editing' : ''}">${lead}<button class="bag-main" data-act="editClub" data-v="${c.id}" aria-label="${esc(c.name)}: full ${c.carry}, choked ${c.choked}${c.out ? ', out of the bag' : ''}. Edit">
      <span class="nm-cell"><span class="nm">${top ? ic('star', 13) : ''}${esc(c.name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>
      <span class="num">${c.carry}</span><span class="num">${c.choked}</span>${c.out ? '<span class="out-note">Out</span>' : relRow(r, top)}</button>${tail}</div>`;
  }).join('')}</div>
  <p class="footnote">${edit ? 'Take clubs out of the bag, or delete custom clubs. Logged shots stay in your history.' : 'Tap a club to change its carries or loft.'}</p>
  <a class="list-row" href="#/bag/how"><span>How reliability works</span>${ic('chev', 18)}</a>
  </div>
  <div class="bar"><button class="btn sec" data-act="addClub" ${nCustom >= MAX_CUSTOM_CLUBS ? 'disabled' : ''}>${ic('plus', 20)}<span>Add a club</span><span class="muted add-n">${nCustom} of ${MAX_CUSTOM_CLUBS} custom</span></button></div>`;
}

// Edit one club in a sheet: carries, loft and whether it's in the bag.
function clubSheet(id) {
  const c = S().bag.find(x => x.id === id);
  if (!c) return '';
  const loft = c.kind === 'wedge' || c.loft != null || c.custom;
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="Edit ${esc(c.name)}" data-stop>
    <div class="grab"></div><div class="sheet-title three"><button class="sheet-done plain" data-act="closeSheet">Cancel</button><h2>${esc(c.name)}</h2><button class="sheet-done" data-act="saveClub" data-v="${c.id}">Save</button></div>
    <div class="sheet-body club-form">
    <div class="two"><label><span class="lbl">Full carry (yds)</span><input id="eCarry" type="number" inputmode="numeric" value="${c.carry}"></label>
      <label><span class="lbl">Choked carry (yds)</span><input id="eChoked" type="number" inputmode="numeric" value="${c.choked}"></label></div>
    ${loft ? `<label><span class="lbl">Loft (degrees)</span><input id="eLoft" type="number" inputmode="numeric" placeholder="Optional" value="${c.loft != null ? c.loft : ''}"></label>` : ''}
    <button class="switch-row" role="switch" aria-checked="${!c.out}" data-act="sheetSwitch" id="eIn"><span class="grow"><b>In the bag</b><span class="muted">Clubs out of the bag are skipped by the caddy and the rail</span></span><i class="switch" aria-hidden="true"></i></button>
    ${c.custom ? `<button class="list-row danger" data-act="deleteClub" data-v="${c.id}"><span>Delete ${esc(c.name)}</span></button>` : ''}
    </div></div></div>`;
}

function bagHow() {
  return `
  <div class="top">${back('bag', 'My bag')}</div>
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
  openOverlay(`<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="Add a club"><div class="grab"></div>
    <div class="sheet-title three"><button class="sheet-done plain" data-modal="cancel">Cancel</button><h2>Add a club</h2><button class="sheet-done" data-modal="ok">Add</button></div>
    <div class="sheet-body club-form">
    <label class="lbl" for="cName">Name</label><input id="cName" type="text" maxlength="14" placeholder="4-hybrid">
    <span class="lbl">Type</span><div class="seg grid4">${kinds.map(([k, n], i) => `<button class="${i === 1 ? 'on' : ''}" data-kind="${k}">${n}</button>`).join('')}</div>
    <div class="two"><label><span class="lbl">Full carry (yds)</span><input id="cCarry" type="number" inputmode="numeric" placeholder="180"></label>
    <label><span class="lbl">Loft (degrees)</span><input id="cLoft" type="number" inputmode="numeric" placeholder="Optional"></label></div>
    </div></div></div>`);
  const wrap = document.querySelector('.sheet-wrap');
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
    if (kind === 'range' && gesture.pts.length > 3 && ['full', 'play9'].includes(trackerOf(S().active))) {
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
    const tr = trackerOf(S().active);
    if (tr === 'carry') return carryTap(p);
    if (tr === 'strike') return strikeTap(p);
    const curve = curveFromPath(g.pts);
    rangeInput(g.pts[0], p, curve, g.long);
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', () => { gesture = null; clearTimeout(pressTimer); });
}

function carryTap(p) {
  const a = S().active, d = currentDrill(a), cx = carryCtx(a, d), hit = carryHit(cx.target, p.x, p.y);
  update(s => { const pd = s.active.pending = s.active.pending || {}; Object.assign(pd, { carry: hit.carry, lx: hit.lx, side: hit.side }); });
  if (navigator.vibrate) navigator.vibrate(6);
  render();
}
function strikeTap(p) {
  const f = faceHit(p.x, p.y, S().hand);
  update(s => { const pd = s.active.pending = s.active.pending || {}; pd.face = f; });
  if (navigator.vibrate) navigator.vibrate(6);
  render();
}

function rangeInput(start, p, curve, long) {
  const a = S().active;
  const cl = club(a.club);
  const view = logView(a);
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
  const shot = { t: Date.now(), drill: d.id, club: a.club, type: a.type, view, hand: S().hand, height: pend.height || null, carry: null, tracker: d.tracker || 'full', ...part };
  if (!shot.curve) shot.curve = null;
  let advanced = false;
  update(s => {
    s.active.shots.push(shot);
    s.active.pending = {};
    if (navigator.vibrate) navigator.vibrate(12);
    const n = s.active.shots.filter(x => x.drill === d.id).length;
    if (d.balls && n >= d.balls && s.active.di < s.active.drills.length - 1) {
      s.active.di++;
      const nd = currentDrill(s.active), st0 = drillStartClub(s.active, nd);
      s.active.club = st0.club; s.active.type = st0.type;
      advanced = nd.name;
    } else if (d.tracker === 'play9' || d.mode === 'onedist') {
      const nx = drillStartClub(s.active, d); s.active.club = nx.club; s.active.type = nx.type;
    }
  });
  if (advanced) toast(`${d.name} done. Next: ${advanced}`);
  else if (d.balls && drillShots(S().active).length === d.balls) toast(`${d.name} done. Tap Finish when ready.`);
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
  warmRoutine: () => { unlockAudio(); ui.wuChain = true; go('warmup/' + WARMUP[0].id); },
  warmGo: () => {
    unlockAudio();
    if (wu.phase === 'work') {
      wu.ms = Math.max(0, wu.end - Date.now()); wu.left = Math.ceil(wu.ms / 1000);
      stopWarm(); wu.phase = 'paused'; paintWarm(); return;
    }
    if (wu.phase === 'paused') { runWarm('work', wu.ms / 1000); return; }
    runWarm('work', WORK); // idle, done, or skipping the get-ready countdown
  },
  setTheme: v => { update(s => { s.theme = v; }); render(); },
  warmAuto: (v, el) => { update(s => { s.warmAuto = !s.warmAuto; }); el.setAttribute('aria-checked', String(!!S().warmAuto)); },
  sheetSwitch: (v, el) => { el.setAttribute('aria-checked', String(el.getAttribute('aria-checked') !== 'true')); },
  drillInfoPick: v => { const d = drillById(v); if (d) openOverlay(detailSheet(d, d.trains, true)); },
  closeRange: () => confirmEnd('range'),
  closePutt: () => confirmEnd('putt'),
  zone: v => {
    const [k, a1, a2] = v.split(':');
    const words = { c: `Contact ${a1}`, k: 'Chunked', f: '' };
    update(s => {
      const pd = s.active.pending = s.active.pending || {};
      const clear = { ft: null, dx: null, dy: null, holed: false, x: null, y: null };
      if (k === 'c') pd.contact = pd.contact === a1 ? null : a1;
      else if (k === 'k') Object.assign(pd, clear, { contact: 'chunk', row: 'short', col: a1 });
      else Object.assign(pd, clear, { row: a1, col: a2 });
    });
    render();
    const again = app.querySelector(`[data-act="zone"][data-v="${v}"]`); if (again) again.focus();
    if (words[k]) toast(words[k]);
  },
  faceZone: v => {
    const [h, vv] = v.split(':');
    const X = { heel: 126, center: 203, toe: 286 }, Y = { high: 100, mid: 163, low: 230 };
    update(s => { const pd = s.active.pending = s.active.pending || {}; pd.face = { h, v: vv, x: X[h], y: Y[vv] }; });
    render();
    const again = app.querySelector(`[data-act="faceZone"][data-v="${v}"]`); if (again) again.focus();
  },
  distStep: v => { update(s => { s.active.dist = Math.min(60, Math.max(2, s.active.dist + +v)); }); render(); openOverlay(puttSetupSheet()); },
  elevStep: v => { update(s => { s.conditions.elev = Math.min(10000, Math.max(0, Math.round((s.conditions.elev + +v) / 100) * 100)); s.conditions.set = true; }); render(); },
  bagEdit: () => { ui.bagEdit = !ui.bagEdit; render(); },
  editClub: v => { if (ui.bagEdit) return; openOverlay(clubSheet(v)); const f = document.getElementById('eCarry'); if (f) f.focus(); },
  saveClub: v => {
    const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
    const carry = parseInt(val('eCarry'), 10), choked = parseInt(val('eChoked'), 10);
    const loftRaw = val('eLoft'), loft = loftRaw == null || loftRaw === '' ? null : parseInt(loftRaw, 10);
    const inBagNow = document.getElementById('eIn').getAttribute('aria-checked') === 'true';
    if (isNaN(carry) || carry < 20 || carry > 400 || isNaN(choked) || choked < 20 || choked > 400) return toast('Enter carries between 20 and 400 yards');
    if (loft != null && (isNaN(loft) || loft < 5 || loft > 70)) return toast('Loft should be between 5° and 70°');
    if (!inBagNow && !S().bag.find(x => x.id === v).out && inBag().length <= 1) return toast('Keep at least one club in the bag');
    update(s => { const c = s.bag.find(x => x.id === v); c.carry = carry; c.choked = choked; if (loftRaw != null) c.loft = loft; c.out = !inBagNow; s.bag.sort((a, b) => b.carry - a.carry); });
    closeOverlays(); render(); toast('Saved');
  },
  rangeCat: v => { ui.rangeCat = v; render(); },
  noop: () => {},
  drillDetail: v => actions.drillInfoPick(v),
  drillInfo: () => {
    const a = S().active;
    if (!a) return;
    const putt = a.kind === 'putt', d = putt ? drillById(a.drills[a.di]) : currentDrill(a);
    const n = (putt ? a.putts : a.shots).filter(x => x.drill === d.id).length;
    const total = putt ? d.putts : d.balls;
    openOverlay(detailSheet(d, total ? `${putt ? 'Putt' : 'Ball'} ${Math.min(n + 1, total)} of ${total}` : `${n} logged`));
  },
  pickRange: v => { ui.rangePick.has(v) ? ui.rangePick.delete(v) : ui.rangePick.add(v); render(); },
  startBasic: () => {
    if (S().active) finishActive();
    const st0 = drillStartClub({ shots: [] }, BASIC);
    update(s => { s.active = { kind: 'range', basic: true, id: uid(), started: Date.now(), drills: [BASIC.id], di: 0, club: st0.club, type: 'full', shots: [], pending: {} }; });
    go('range/log');
  },
  startRange: () => {
    const drills = RANGE_DRILLS.filter(d => ui.rangePick.has(d.id)).map(d => d.id);
    if (!drills.length) return;
    if (S().active) finishActive();
    const first = drillById(drills[0]);
    const st0 = drillStartClub({ shots: [], club: first.club }, first);
    update(s => { s.active = { kind: 'range', id: uid(), started: Date.now(), drills, di: 0, club: st0.club, type: st0.type, shots: [], pending: {} }; });
    ui.rangePick = null;
    go('range/log');
  },
  openShotSetup: () => openOverlay(shotSetupSheet()),
  setClub: v => { chooseClub(v); render(); openOverlay(shotSetupSheet()); },
  railClub: v => { chooseClub(v); render(); },
  drillCheck: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; const val = v === 'yes'; pd.check = pd.check === val ? null : val; }); render(); },
  carryStep: v => { const a = S().active, cx = carryCtx(a, currentDrill(a)); update(s => { const pd = s.active.pending = s.active.pending || {}; pd.carry = Math.max(5, (pd.carry != null ? pd.carry : cx.target) + +v); }); render(); },
  clockLen: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.swing = v; }); render(); },
  gripSel: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.grip = v; }); render(); },
  shapeGot: v => { const [h, c] = v.split('-'); update(s => { const pd = s.active.pending = s.active.pending || {}; pd.got = pd.got && pd.got.h === h && pd.got.c === c ? null : { h, c }; }); render(); },
  setType: v => { update(s => { s.active.type = v; if (v === 'tee' && !['wood', 'hybrid'].includes(club(s.active.club).kind)) s.active.club = 'D'; if ((v === 'pitch' || v === 'chip') && club(s.active.club).kind !== 'wedge') s.active.club = '56'; s.active.pending = {}; }); render(); openOverlay(shotSetupSheet()); },
  closeSheet: () => closeOverlays(),
  height: v => { update(s => { s.active.pending = { ...(s.active.pending || {}), height: v }; }); render(); },
  curve: v => { update(s => { s.active.pending = { ...(s.active.pending || {}), curve: v }; }); render(); },
  undo: () => { update(s => {
    if (hasDraft(s.active.pending)) { s.active.pending = {}; return; }
    s.active.shots.pop();
    const d = currentDrill(s.active); // drill-led clubs follow the shot you are back on
    if (d.tracker === 'play9' || d.mode === 'onedist') { const nx = drillStartClub(s.active, d); s.active.club = nx.club; s.active.type = nx.type; }
  }); render(); },
  setContact: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.contact = pd.contact === v ? null : v; }); render(); },
  setLen: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.row = pd.row === v ? null : v; Object.assign(pd, { x: null, y: null, ft: null, dx: null, dy: null, holed: false }); }); render(); },
  setDir: v => { update(s => { const pd = s.active.pending = s.active.pending || {}; pd.col = pd.col === v ? null : v; Object.assign(pd, { x: null, y: null, ft: null, dx: null, dy: null, holed: false }); }); render(); },
  nextShot: () => {
    const a = S().active, pd = a.pending || {}, d = currentDrill(a), tr = d.tracker || 'full';
    if (!hasDraft(pd)) return toast('Mark something about the shot first');
    if (tr === 'carry') {
      const cx = carryCtx(a, d);
      if (pd.carry == null && !pd.contact) return toast('Tap where it landed');
      const diff = pd.carry != null ? pd.carry - cx.target : null;
      const finish = diff == null && !pd.side ? null : { row: diff == null ? null : diff > 5 ? 'long' : diff < -5 ? 'short' : 'pin', col: pd.side || null };
      return commitShot({ contact: pd.contact || null, carry: pd.carry != null ? pd.carry : null, target: cx.target, side: pd.side || null, lx: pd.lx != null ? pd.lx : null, swing: cx.swing || null, grip: cx.grip || null, finish, curve: null, x: null, y: null }, 'carry');
    }
    if (tr === 'shape') {
      const [h, c] = shapePlan(a, d);
      const got = pd.got || null;
      return commitShot({ plan: { h, c }, got, matched: !!got && got.h === h && got.c === c, contact: pd.contact || null, curve: got ? got.c : null, height: got ? got.h : null, finish: pd.col ? { row: null, col: pd.col } : null, x: null, y: null }, 'shape');
    }
    if (tr === 'strike') {
      const f = pd.face || null;
      return commitShot({ face: f, contact: f ? faceContact(f) : (pd.contact || null), finish: pd.col ? { row: null, col: pd.col } : null, curve: null, x: null, y: null }, 'strike');
    }
    const part = draftPart(pd);
    if (pd.check != null) part.check = pd.check;
    if (tr === 'play9') { const now = p9Now(a); if (!now) return; Object.assign(part, { hole: now.h + 1, par: now.H.par, phase: now.phase, dist: now.left }); }
    commitShot(part, logView(a));
  },
  carry: () => promptCarry(),
  nextDrill: () => {
    const a = S().active;
    if (a.di < a.drills.length - 1) { update(s => { s.active.di++; const nd = currentDrill(s.active), st0 = drillStartClub(s.active, nd); s.active.club = st0.club; s.active.type = st0.type; s.active.pending = {}; }); render(); }
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
  openCaddy: () => { ui.fromHole = false; update(s => { s.conditions.set = true; }); go('caddy'); },
  justCaddy: () => { ui.roundDraft = null; ui.fromHole = false; go('play/conditions'); },
  pickCourse: v => { const c = courseById(v); if (c) previewOpen(c); },
  findHit: async v => {
    const hit = ui.find && ui.find.hits && ui.find.hits[+v];
    if (!hit) return;
    const m = document.getElementById('findMsg');
    if (m) m.textContent = `Loading ${hitName(hit)}…`;
    const c = await loadCourse(hit);
    if (!c) { if (m) m.textContent = 'Couldn’t load this course. Check your signal and try again.'; return; }
    previewOpen(c);
  },
  customCourse: () => askCustomCourse(),
  prevTee: v => { ui.prevTee = +v; render(); },
  prevHoles: v => { ui.prevHoles = v; render(); },
  coursePlay: () => {
    const c = ui.preview;
    if (!c) return;
    update(s => { s.courses = s.courses || []; const keep = { ...c, lastTee: ui.prevTee }; const i = s.courses.findIndex(x => x.id === c.id); if (i >= 0) s.courses[i] = { ...s.courses[i], ...keep }; else s.courses.push(keep); });
    ui.roundDraft = { courseId: c.id, tee: ui.prevTee, sel: c.holes.length === 18 ? ui.prevHoles : '18' };
    go('play/conditions');
  },
  teeOff: () => { update(s => { s.conditions.set = true; }); startRound(); },
  rStrokes: v => updHole(h => { h.strokes = h.strokes == null ? (h.par || 4) + (+v < 0 ? -1 : 0) : Math.max(1, h.strokes + +v); }),
  rStrokesSet: v => updHole(h => { h.strokes = Math.max(1, +v); }),
  rPutts: v => updHole(h => { h.putts = h.putts === +v ? null : +v; }),
  rFw: v => updHole(h => { h.fw = h.fw === v ? null : v; }),
  rPen: v => updHole(h => { h.pen = Math.max(0, (h.pen || 0) + +v); }),
  setPar: v => {
    update(s => { const a = s.active, h = a.holes[a.hole]; h.par = +v; if (h.par === 3) h.fw = null; const c = s.courses.find(x => x.id === a.course.id); if (c && c.holes[h.n - 1]) c.holes[h.n - 1].par = +v; });
    render();
  },
  goHole: v => {
    const a = curRound(), i = +v;
    if (!a || i === a.hole) return;
    if (a.holes[i].done) { if (ui.revisitFrom == null) { const firstOpen = a.holes.findIndex(x => !x.done); ui.revisitFrom = !a.holes[a.hole].done ? a.hole : firstOpen >= 0 ? firstOpen : null; } }
    else ui.revisitFrom = null;
    update(s => { s.active.hole = i; });
    render();
  },
  finishHole: () => {
    const a = curRound(), h = a && a.holes[a.hole];
    if (!h) return;
    if (h.strokes == null) return toast('Set the score first');
    update(s => { s.active.holes[s.active.hole].done = true; });
    if (ui.revisitFrom != null) { const to = ui.revisitFrom; ui.revisitFrom = null; update(s => { s.active.hole = to; }); toast(`Hole ${h.n} saved`); render(); return; }
    if (a.hole === a.holes.length - 1) { render(); confirmRound('finish'); return; }
    const r = curRound(), sm = roundSummary(r), thru = r.holes.filter(x => x.done && x.strokes != null).length;
    let next = r.holes.findIndex((x, i) => i > r.hole && !x.done);
    if (next < 0) next = r.holes.findIndex(x => !x.done);
    if (next < 0) next = Math.min(r.hole + 1, r.holes.length - 1);
    update(s => { s.active.hole = next; });
    toast(`${scoreWord(h.strokes, h.par) || h.strokes + ' strokes'} on ${h.n} · ${toParText(sm.toPar)} thru ${thru}`);
    render();
  },
  endRound: () => confirmRound('end'),
  askCaddy: () => {
    const a = curRound(), h = a && a.holes[a.hole];
    if (!h) return;
    update(s => { if (!h.caddy.length) { if (h.yds) s.caddy.target = Math.max(50, Math.min(300, Math.round(h.yds / 10) * 10)); s.caddy.surface = 'fairway'; s.caddy.slope = 'flat'; s.caddy.steep = false; } s.caddy.tab = 'sheet'; });
    ui.fromHole = true;
    go('caddy');
  },
  useClub: () => {
    const st = S(), a = curRound();
    if (!a) return;
    const rec = recommend(st, reliability(st));
    if (!rec.pick) return toast('No club fits this shot');
    const cad = st.caddy, h = a.holes[a.hole];
    update(s => { s.active.holes[s.active.hole].caddy.push({ t: Date.now(), yards: cad.target, playsLike: rec.playsLike, surface: cad.surface, slope: cad.slope, steep: !!cad.steep,
      club: rec.pick.c.id, clubName: rec.pick.c.name, choke: !!rec.choke, aim: rec.aim, swing: rec.swing, cond: { temp: s.conditions.temp, moisture: s.conditions.moisture, elev: s.conditions.elev }, result: null }); });
    toast(`${rec.pick.c.name} saved to hole ${h.n}`);
    go('round');
  },
  callResult: v => callSheet(+v),
  setCallResult: v => {
    const [i, r] = v.split(':');
    update(s => { const h = s.active.holes[s.active.hole]; if (r === 'x') h.caddy.splice(+i, 1); else h.caddy[+i].result = h.caddy[+i].result === r ? null : r; });
    render();
  },
  tab: v => { update(s => { s.caddy.tab = v; }); render(); },
  surface: v => { update(s => { s.caddy.surface = v; }); render(); },
  slope: v => { update(s => { s.caddy.slope = v; }); render(); },
  steep: () => { if (S().caddy.slope === 'flat') return; update(s => { s.caddy.steep = !s.caddy.steep; }); render(); },
  hand: v => { update(s => { s.hand = v; }); render(); },
  applyGap: (v, el) => {
    update(s => { const c = s.bag.find(x => x.id === v); if (c) { c.carry = +el.dataset.full; c.choked = +el.dataset.choked; } });
    toast('My bag updated'); el.disabled = true; el.textContent = 'Updated';
  },
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
    update(s => { s.bag = s.bag.filter(x => x.id !== v); }); closeOverlays(); render();
  },
  addClub: () => askClub(),
  sample: () => {
    if (!confirm('Add sample practice history so you can try reliability and recaps? You can reset it later in Settings.')) return;
    update(s => { s.sessions = s.sessions.concat(makeSample()); });
    toast('Sample history added'); render();
  },
  export: () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `coach-caddy-backup-${stamp(Date.now(), false)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  },
  reset: () => resetPrompt(),
  exportCsv: () => { exportCSV(); },
};

// ================= v0.8: baseline, two-button drills, scores, re-test, what helps =================

// ---------- the bell ----------
// A soft two-partial chime made in the browser, so there is no sound file to load. The phone only
// lets a page play sound after a tap, so the warm-up buttons unlock it first.
let actx = null;
function unlockAudio() {
  try {
    if (!actx) { const C = window.AudioContext || window.webkitAudioContext; if (C) actx = new C(); }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch (e) {}
}
function bell(times = 1) {
  if (S().warmBell === false || !actx) return;
  try {
    for (let k = 0; k < times; k++) {
      const t0 = actx.currentTime + 0.02 + k * 0.5;
      [[880, 0.32], [1760, 0.12], [2640, 0.05]].forEach(([f, g]) => {
        const o = actx.createOscillator(), v = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        v.gain.setValueAtTime(0.0001, t0);
        v.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
        v.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
        o.connect(v); v.connect(actx.destination); o.start(t0); o.stop(t0 + 1.9);
      });
    }
  } catch (e) {}
}

// ---------- small pieces ----------
const sgn = v => v == null ? '–' : v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0';
const pct = v => v == null ? '–' : `${v}%`;
const clubWords = c => c.id === 'PW' ? 'Pitching wedge' : c.name;
// The baseline headline follows the first drill it picked, so the two never disagree.
function baseHead(sess, recs) {
  const sk = baselineSkills(sess), lead = (recs || sess.recs || []).find(r => r.id !== 'play9');
  if (!lead || lead.skill === 'transfer') return baselineHeadline(sk);
  const name = SKILLS[lead.skill], v = (sk.find(x => x.id === lead.skill) || {}).v;
  return v != null && v === Math.min(...sk.filter(x => x.v != null).map(x => x.v)) ? `${name} is the leak today` : `${name} first today`;
}
const isTest = a => a && (a.kind === 'baseline' || a.kind === 'retest');
const entriesOf = sess => (sess.kind === 'putt' ? sess.putts : sess.shots) || [];
const bandColor = b => b === 'Solid' ? 'var(--brand)' : b === 'Building' ? 'var(--gold)' : 'var(--red)';
function ring(v, band, size = 76) {
  const r = size / 2 - 8, c = 2 * Math.PI * r, m = size / 2;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--sf2)" stroke-width="8"/><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="${bandColor(band)}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(c * v / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${m} ${m})"/><text x="${m}" y="${m + 7}" text-anchor="middle" font-size="${size > 60 ? 22 : 15}" font-weight="700" fill="var(--ink)" font-family="Space Grotesk, sans-serif">${v}</text></svg>`;
}
function spark(vals) {
  const xs = vals.slice(-6);
  if (xs.length < 2) return '';
  const pts = xs.map((v, i) => [Math.round(i * 320 / (xs.length - 1)), Math.round(52 - v / 100 * 48)]);
  return `<svg class="spark" viewBox="-6 0 332 56" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--brand)" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
}
// A drill's skill: the baseline skill it moves when there is one, otherwise what the drill trains.
const skillKey = d => DRILL_SKILL[d.id] || d.trains;
const skillName = d => DRILL_SKILL[d.id] ? SKILLS[DRILL_SKILL[d.id]] : d.trains;
function skillPoints(d, extra) {
  const key = skillKey(d), out = [];
  S().sessions.filter(s => (s.kind === 'range' || s.kind === 'putt') && (!extra || s.id !== extra.id)).concat(extra ? [extra] : []).forEach(s => {
    const rs = sessionDrills(s).filter(r => skillKey(r.drill) === key);
    if (rs.length) out.push({ t: s.ended || Date.now(), score: Math.round(rs.reduce((n, r) => n + r.score, 0) / rs.length) });
  });
  return out.sort((a, b) => a.t - b.t);
}

// What Home shows about the last session, for every kind of session.
function takeaway(sess, st) {
  const k = sess.kind;
  if (k === 'baseline') {
    const recs = (sess.recs || []).filter(r => r.id !== 'play9').map(r => drillById(r.id).name);
    return { href: `baseline/result/${sess.id}`, text: `${baseHead(sess)}.${recs.length ? ` Drills: ${recs.join(' and ')}.` : ''}` };
  }
  if (k === 'retest') return { href: `baseline/retest/${sess.id}`, text: `Re-test: ${SKILLS[sess.skill]} ${pct(sess.before)} to ${pct(sess.value)}.` };
  if (entriesOf(sess).some(x => x.tally)) {
    const ds = sessionDrills(sess).sort((a, b) => b.score - a.score);
    if (ds.length) return { href: `${k}/recap/${sess.id}`, text: `${ds.length} drill${ds.length > 1 ? 's' : ''}. Best: ${ds[0].drill.name} ${ds[0].score}, ${ds[0].band.toLowerCase()}.` };
  }
  const rc = k === 'range' ? rangeRecap(sess, st.bag) : k === 'putt' ? puttRecap(sess) : k === 'round' ? roundSummary(sess) : courseRecap(sess);
  return { href: `${k}/recap/${sess.id}`, text: `${rc.headline}. ${rc.lines[0] || rc.cause || ''}` };
}

// ---------- baseline and re-test logger ----------
function setStage(A, bag) {
  const st = A.stages[A.si];
  if (!st || !st.club) return;
  A.club = stageClub(st, bag);
  const k = (bag.find(c => c.id === A.club) || {}).kind;
  A.type = st.type === 'tee' && !['wood', 'hybrid'].includes(k) ? 'full' : st.type;
}
function startTest(kind, extra = {}) {
  if (S().active) finishActive();
  const stages = kind === 'baseline' ? BASELINE.map(x => ({ ...x })) : [{ ...extra.stage, n: 5 }];
  update(s => {
    const A = s.active = { kind, id: uid(), started: Date.now(), stages, si: 0, free: 0, shots: [], pending: {}, club: stageClub({ club: '7i', kind: 'iron' }, s.bag), type: 'full' };
    if (kind === 'retest') Object.assign(A, { skill: extra.skill, before: extra.before, baselineId: extra.baselineId, drillIds: extra.drillIds });
    setStage(A, s.bag);
  });
  go('baseline');
}
function finishTest() {
  const a = S().active;
  if (!isTest(a)) return;
  if (!a.shots.length) { update(s => { s.active = null; }); toast('Nothing tracked, so nothing saved'); go('practice'); return; }
  const sess = { ...a, ended: Date.now(), pending: undefined };
  if (a.kind === 'baseline') {
    sess.recs = recommendDrills(S(), sess);
    update(s => { s.sessions.push(sess); s.active = null; });
    setToday(t => { t.baselineId = sess.id; });
    go('baseline/result/' + sess.id);
  } else {
    sess.value = metric(a.skill, a.shots);
    update(s => { s.sessions.push(sess); s.active = null; });
    setToday(t => { t.retestId = sess.id; });
    go('baseline/retest/' + sess.id);
  }
}
function testLog() {
  const a = S().active;
  if (!isTest(a)) { go('practice'); return ''; }
  const base = a.kind === 'baseline', stg = a.stages[a.si];
  const cnt = x => x.id === 'free' ? a.free : a.shots.filter(s => s.stage === x.id).length;
  const done = cnt(stg), last = a.si === a.stages.length - 1;
  const pills = base ? `<div class="stage-pills" role="list" aria-label="Baseline stages">${a.stages.map((x, i) => `<span role="listitem" class="${i < a.si ? 'done' : i === a.si ? 'on' : ''}"><b>${esc(x.name)}</b>${i < a.si ? `${x.id === 'free' ? '' : cnt(x) + ' · '}done` : i === a.si ? `${cnt(x)} of ${x.n}` : `${x.n} balls`}</span>`).join('')}</div>` : '';
  const cl = club(a.club);
  const swing = a.type === 'tee' ? 'tee' : 'full';
  const top = `<div class="logtop"><button class="back close" data-act="testClose" aria-label="Stop the ${base ? 'baseline' : 're-test'}">Close</button>
    <div class="lt-mid"><span class="lt-line"><span class="lt-name">${base ? 'Baseline' : 'Re-test'}</span></span><span class="lt-sub">${stg.id === 'free' ? 'Free swings · not tracked' : `${esc(clubWords(cl))} · ${swing}`}</span></div>
    <button class="back lt-next" data-act="testSkip">${last ? 'Finish' : stg.id === 'free' ? 'Skip' : 'Skip club'}</button></div>`;
  if (stg.id === 'free') {
    const nextClub = club(stageClub(a.stages[a.si + 1], S().bag));
    return `${top}${pills}
    <div class="scroll-y log-body" data-keep="free">
    <div class="card free-card"><span class="lbl">Get loose. Any club, nothing is scored.</span>
      <span class="free-count" aria-live="polite">${a.free}<small> / ${stg.n}</small></span>
      <div class="dots10" aria-hidden="true">${Array.from({ length: stg.n }, (_, i) => `<i class="${i < a.free ? 'on' : ''}"></i>`).join('')}</div>
      <button class="hit-btn" data-act="testFree">Hit one<small>tap after each ball</small></button></div>
    <p class="footnote" style="text-align:center">Tracked shots start after ball ${stg.n}, with the ${esc(clubWords(nextClub).toLowerCase())}.</p>
    </div>
    <div class="bar"><button class="btn sec" data-act="testSkip">I’m loose · start tracked shots</button></div>`;
  }
  const pd = a.pending || {}, has = hasDraft(pd), view = logView(a);
  const prev = a.shots.filter(s => s.stage === stg.id).slice(-1)[0];
  const intro = base ? '' : `<div class="card soft retest-note"><span class="lbl">Re-test · ${esc(SKILLS[a.skill])}</span><span>Same as this morning’s baseline: ${esc(clubWords(cl).toLowerCase())}, ${stg.n} balls. Baseline: <b>${pct(a.before)}</b>.</span></div>`;
  return `${top}${pills}
  <div class="scroll-y log-body" data-keep="test-${stg.id}">
  ${intro}
  <div class="status ${has ? 'draft' : ''}" aria-live="polite"><span>${has ? esc(describeShot({ view, ...draftPart(pd) })) : prev ? esc(describeShot(prev)) : stg.id === 'driver' ? 'Pick two flags as the fairway' : 'Tap the ball, then the grass'}</span><span class="muted">${has ? 'This shot' : `Ball ${Math.min(done + 1, stg.n)} of ${stg.n}`}</span></div>
  <div class="target-wrap">${targetSvg(a)}</div>
  ${zoneButtons(view)}
  <p class="helper opt">Tap the ball for contact, then the grass where it finished. Same club, same swing, every ball.</p>
  </div>
  <div class="bar"><div class="bar-row two">
    <button class="btn sec sm" data-act="testUndo" ${has || a.shots.length ? '' : 'disabled'}>${has ? 'Clear' : 'Undo'}</button>
    <button class="btn pri next-shot" data-act="testShot" ${has ? '' : 'disabled'}>${done + 1 >= stg.n ? (last ? 'Save · see results' : `Save · next ${esc(a.stages[a.si + 1].name)}`) : 'Next shot ›'}</button>
  </div></div>`;
}

// ---------- baseline result ----------
function skillBars(skills, prev) {
  return `<div class="skill-bars">${skills.map(s => {
    const p = prev && prev.find(x => x.id === s.id), d = p && p.v != null && s.v != null ? s.v - p.v : null;
    return `<div class="skill${s.v != null && s.v < 60 ? ' low' : ''}"><span>${esc(s.name)}</span><b>${s.v == null ? '–' : s.v}</b><div class="tr"><i style="width:${s.v || 0}%"></i></div><small>${esc(s.note)}${d != null ? ` · ${sgn(d)} on last baseline` : ''}</small></div>`;
  }).join('')}</div>`;
}
function recCard(r) {
  const d = drillById(r.id);
  return `<button class="rec" data-act="drillInfoPick" data-v="${d.id}" aria-label="${esc(d.name)}. ${esc(r.why)} Tap for how to do it.">${drillGlyph(d.glyph)}<span><b>${esc(d.name)} · ${d.balls} balls</b><span class="why">${esc(r.why)}</span><span class="skilltag">${r.skill === 'transfer' ? 'Transfer' : 'Trains ' + esc(SKILLS[r.skill].toLowerCase())}</span></span></button>`;
}
function baselineResultView(id) {
  const st = S(), sess = st.sessions.find(s => s.id === id && s.kind === 'baseline');
  if (!sess) return `<div class="top">${back('practice', 'Practice')}</div><h1>Baseline not found</h1>`;
  const sk = baselineSkills(sess);
  const prevB = st.sessions.filter(s => s.kind === 'baseline' && s.ended < sess.ended).sort((a, b) => b.ended - a.ended)[0];
  const recs = sess.recs || recommendDrills(st, sess);
  const t = todayState(), isToday = t.baselineId === id;
  const started = !!t.drillsId && (st.sessions.some(x => x.id === t.drillsId) || (st.active && st.active.id === t.drillsId));
  const balls = recs.reduce((n, r) => n + (drillById(r.id).balls || 0), 0);
  return `
  <div class="top">${back('practice', 'Practice')}</div>
  <div class="scroll-y" data-keep="bres">
  <div class="title-block"><span class="eyebrow">Baseline · ${fmtDate(sess.ended)} · ${sess.shots.length} tracked balls</span><h1>${esc(baseHead(sess, recs))}</h1></div>
  <div class="card"><span class="lbl">Your skills ${isToday ? 'today' : 'that day'}</span>${skillBars(sk, prevB ? baselineSkills(prevB) : null)}</div>
  <span class="lbl">${isToday ? 'Today’s drills' : 'Drills from this baseline'}</span>
  ${recs.map(recCard).join('')}
  <p class="footnote">Picked from what the baseline showed. A drill that has moved your skill before goes first.</p>
  </div>
  <div class="bar">${isToday && started
    ? `<a class="btn sec" href="#/practice">Back to today’s session</a>`
    : `<button class="btn pri" data-act="startRecDrills" data-v="${id}">Start drills · ${balls} balls</button>${isToday ? '<a class="btn plain" href="#/range">Pick my own drills</a>' : ''}`}</div>`;
}

// ---------- re-test result ----------
function retestResultView(id) {
  const sess = S().sessions.find(s => s.id === id && s.kind === 'retest');
  if (!sess) return `<div class="top">${back('practice', 'Practice')}</div><h1>Re-test not found</h1>`;
  const name = SKILLS[sess.skill], d = sess.value != null && sess.before != null ? sess.value - sess.before : null;
  const head = d == null ? 'Re-test saved' : d >= 10 ? `${name} up ${d} points` : d <= -10 ? `${name} down ${-d} points` : `${name} held steady`;
  const drills = (sess.drillIds || []).map(x => drillById(x)).filter(Boolean).map(x => x.name);
  return `
  <div class="top">${back('practice', 'Practice')}</div>
  <div class="scroll-y" data-keep="rres">
  <div class="title-block"><span class="eyebrow">Re-test · ${fmtDate(sess.ended)} · ${sess.shots.length} balls</span><h1>${esc(head)}</h1></div>
  <div class="card">
    <div class="metric-row"><b>Baseline</b><span>${pct(sess.before)}</span></div>
    <div class="metric-row"><b>After the drills</b><span>${pct(sess.value)}${d != null ? ` · ${d ? sgn(d) : 'no change'}` : ''}</span></div>
    <div class="metric-row"><b>Club</b><span>${esc(club(sess.stages[0] ? stageClub(sess.stages[0], S().bag) : sess.club).name)}</span></div>
    ${drills.length ? `<div class="metric-row"><b>Drills</b><span>${esc(drills.join(', '))}</span></div>` : ''}</div>
  <div class="card soft"><span class="lbl t-gold">How to read it</span><span>Five balls is a quick read, and the end of a session flatters you. The next baseline is the number that ranks drills, because learning that lasts shows up a session later.</span></div>
  </div>
  <div class="bar"><a class="btn pri" href="#/practice">Done</a></div>`;
}

// ---------- two-button drill logger ----------
const tallyOf = (a, d, kind) => (kind === 'putt' ? a.putts : a.shots).filter(x => x.drill === d.id && x.tally);
function tallyContext(a, d, kind, n) {
  if (kind === 'putt') return `<b>${a.dist} ft</b> · ${{ left: 'Breaks left', straight: 'Straight', right: 'Breaks right' }[a.brk]}`;
  const cl = club(a.club);
  if (d.mode === 'ladder') return `Target <b>${LADDER_YDS[n % LADDER_YDS.length]} yds</b> · steps up each ball`;
  if (d.mode === 'clock') { const c = CLOCK[n % CLOCK.length]; return `Backswing to <b>${c.name}</b> · about ${Math.round(cl.carry * c.share)} yds`; }
  if (d.mode === 'grip') return n % 2 ? `<b>Choked 1 in</b> · ${cl.choked} yds` : `<b>Full grip</b> · ${cl.carry} yds`;
  if (d.mode === 'onedist') { const p = oneDistPlan(d)[n % 3]; return `<b>${esc(club(p.club).name)}</b> ${esc(shotType(p.type).name.toLowerCase())} · to ${club(d.club).carry} yds`; }
  if (d.mode === 'nine') { const [h, c] = NINE_SEQ[n % 9]; return `This ball: <b>${shapeWords(h, c)}</b>`; }
  if (d.mode === 'punch') return 'This ball: <b>low</b>, under a branch';
  if (d.tracker === 'play9') { const now = p9Now(a); return now ? `<b>Hole ${now.h + 1}</b> · par ${now.H.par} · ${now.phase === 'approach' ? `${now.left} to the pin` : now.phase === 'tee' ? 'tee shot' : `lay-up, ${now.left} to go`}` : 'All 9 holes played'; }
  return `<b>${esc(cl.name)}</b> · ${esc(shotType(a.type).name)}`;
}
function tallyLog(a, d, kind) {
  const putt = kind === 'putt', xs = tallyOf(a, d, kind), total = (putt ? d.putts : d.balls) || 10;
  const n = xs.length, yes = xs.filter(x => x.hit).length, no = n - yes, left = Math.max(0, total - n);
  const t = tallyFor(d.id), more = a.di < a.drills.length - 1, unit = putt ? 'putt' : 'ball';
  const sub = `${putt ? 'Putt' : 'Ball'} ${Math.min(n + 1, total)} of ${total}${putt ? '' : ' · ' + esc(clubShort(club(a.club)))}`;
  const tgt = d.detail && d.detail.target ? `Target: ${esc(d.detail.target.text)}` : '';
  const trail = xs.slice(-24).map(x => `<i class="${x.hit ? 'y' : 'n'}"></i>`).join('') + Array.from({ length: Math.min(left, Math.max(0, 24 - Math.min(24, n))) }, () => '<i class="e"></i>').join('');
  const rated = (a.ratings || {})[d.id];
  return `
  ${logTop(putt ? 'endPutt' : 'endRange', d, sub, 'tallyFinish', more, n >= total || !n ? null : 'Done')}
  ${putt ? '' : clubRail(a, d)}
  <div class="scroll-y log-body" data-keep="tlog-${d.id}">
  <button class="setup-row ctx-row" data-act="${putt ? 'openPuttSetup' : 'openShotSetup'}"><span>${tallyContext(a, d, kind, n)}</span><span class="muted setup-change">Change${ic('chev', 16)}</span></button>
  <div class="card q-card"><span class="lbl">One question, every ${unit}</span><span class="q">${esc(t.q)}</span>${t.hint ? `<span class="muted">${esc(t.hint)}</span>` : ''}</div>
  <div class="tally">
    <button class="yes" data-act="tally" data-v="1" aria-label="${esc(t.yes[0])}. ${yes} so far."><b>${yes}</b><span>${esc(t.yes[0])}</span>${t.yes[1] ? `<small>${esc(t.yes[1])}</small>` : ''}</button>
    <button class="no" data-act="tally" data-v="0" aria-label="${esc(t.no[0])}. ${no} so far."><b>${no}</b><span>${esc(t.no[0])}</span>${t.no[1] ? `<small>${esc(t.no[1])}</small>` : ''}</button>
  </div>
  <div class="trail" role="img" aria-label="${yes} ${esc(t.yes[0].toLowerCase())}, ${no} ${esc(t.no[0].toLowerCase())}, ${left} to go">${trail}</div>
  ${tgt ? `<p class="footnote" style="text-align:center">${tgt}</p>` : ''}
  </div>
  <div class="bar"><div class="bar-row two">
    <button class="btn sec sm" data-act="tallyUndo" ${n ? '' : 'disabled'}>Undo</button>
    <button class="btn pri" data-act="tallyFinish" ${n ? '' : 'disabled'}>${!n ? `${total} ${unit}s to go` : left ? `${left} left · rate it now` : rated ? 'See the drill score' : 'Rate this drill'}</button>
  </div></div>`;
}
function tallyDrill() {
  const a = S().active;
  return a.kind === 'putt' ? drillById(a.drills[a.di]) : currentDrill(a);
}
function rateSheet() {
  const a = S().active, d = tallyDrill(), kind = a.kind, xs = tallyOf(a, d, kind);
  const t = tallyFor(d.id), w = rateWords(d.id), cur = (a.ratings || {})[d.id], hit = xs.filter(x => x.hit).length;
  const opts = [['good', 'Good', ic('check', 22)], ['okay', 'Okay', '~'], ['poor', 'Poor', ic('x', 22)]];
  return `<div class="sheet-wrap" data-act="closeSheet"><div class="sheet" role="dialog" aria-label="How did it feel?" data-stop>
    <div class="grab"></div><div class="sheet-title"><h2>How did it feel?</h2><button class="sheet-done" data-act="rateDrill" data-v="skip">Skip</button></div>
    <div class="sheet-body"><p class="footnote">${hit} of ${xs.length} ${esc(t.yes[0].toLowerCase())}. Now the quality, in one tap.</p>
    <div class="rate-opts">${opts.map(([k, name, g]) => `<button class="rate-opt ${k}${cur === k ? ' on' : ''}" data-act="rateDrill" data-v="${k}" aria-pressed="${cur === k}"><i aria-hidden="true">${g}</i><span><b>${name}</b><span>${esc(w[k])}</span></span></button>`).join('')}</div>
    </div></div></div>`;
}
function drillResultView(kind) {
  const a = S().active;
  if (!a || a.kind !== kind) { go('practice'); return ''; }
  const d = drillById(a.lastDrill) || tallyDrill();
  const r = drillResult(a, d.id);
  if (!r) { go(kind + '/log'); return ''; }
  const t = tallyFor(d.id), more = a.di < a.drills.length - 1, nd = more ? drillById(a.drills[a.di + 1]) : null;
  const pts = skillPoints(d, { ...a, ended: Date.now() });
  const sc = pts.map(p => p.score);
  const meaning = r.band === 'Solid' ? 'Solid · 75 and up' : r.band === 'Building' ? 'Building · solid is 75 and up' : 'Not yet · building starts at 50';
  const rateWord = r.rating ? capWord(r.rating) : 'Skipped';
  const clubs = kind === 'range' ? [...new Set(a.shots.filter(x => x.drill === d.id).map(x => clubShort(club(x.club))))].join(', ') : `${a.dist} ft`;
  return `
  <div class="top">${back(kind + '/log', d.name)}</div>
  <div class="scroll-y" data-keep="dres">
  <div class="title-block"><span class="eyebrow">${esc(d.name)} · ${r.n} ${kind === 'putt' ? 'putts' : 'balls'} · ${esc(clubs)}</span><h1>${esc(skillName(d))} is ${r.band === 'Not yet' ? 'not there yet' : r.band.toLowerCase()}</h1></div>
  <div class="card"><div class="score-ring">${ring(r.score, r.band)}<span><b>Drill score ${r.score}</b><span class="muted">${meaning}</span></span></div>
    <div class="metric-row"><b>${esc(t.yes[0])}</b><span>${r.hit} of ${r.n} · ${r.rate}%${r.met === true ? ' · target met' : r.met === false && r.target ? ` · target ${esc(r.target)}` : ''}</span></div>
    <div class="metric-row"><b>How it felt</b><span>${rateWord}</span></div>
    <div class="metric-row"><b>Score</b><span>${r.rating ? `${r.rate}% × 0.7 + ${rateWord} ${({ good: 100, okay: 60, poor: 20 })[r.rating]} × 0.3` : 'The count alone, no rating'}</span></div></div>
  ${r.flag ? `<div class="card soft"><span class="lbl t-gold">Feel versus count</span><span>${esc(r.flag)}</span></div>` : ''}
  <div class="card"><span class="lbl">${esc(skillName(d))} · ${sc.length > 1 ? `last ${Math.min(6, sc.length)} sessions` : 'first session'}</span>
    ${spark(sc)}<span class="muted">${sc.length > 1 ? `${sc[Math.max(0, sc.length - 6)]} → ${sc[sc.length - 1]} · skill score ${skillScore(pts)}` : 'The trend line starts next time.'}</span></div>
  </div>
  <div class="bar"><button class="btn pri" data-act="tallyNext">${more ? `Next drill · ${esc(nd.name)}` : 'Finish session'}</button></div>`;
}

// Recap for sessions logged with the two buttons.
function tallyRecapView(sess) {
  const st = S(), putt = sess.kind === 'putt', ds = sessionDrills(sess);
  const n = entriesOf(sess).length;
  const low = ds.slice().sort((x, y) => x.score - y.score)[0];
  const head = !ds.length ? 'Session saved' : ds.length === 1 ? `${ds[0].drill.name}: ${ds[0].band.toLowerCase()}` : low.score >= 75 ? 'Solid across the board' : `${skillName(low.drill)} needs the most work`;
  const t = todayState(), todays = t.drillsId === sess.id && t.baselineId;
  let retest = '';
  if (todays) {
    const done = t.retestId && st.sessions.find(x => x.id === t.retestId);
    const base = st.sessions.find(x => x.id === t.baselineId);
    const first = base && (base.recs || []).find(r => r.id !== 'play9');
    const plan = retestPlan(first ? first.skill : 'contact');
    retest = done ? `<a class="card" href="#/baseline/retest/${done.id}" style="text-decoration:none;color:inherit"><span class="lbl">Re-test</span><span>${esc(SKILLS[done.skill])}: ${pct(done.before)} → ${pct(done.value)}</span></a>`
      : base ? `<div class="card hero"><span class="lbl">Did it stick?</span><span>5 balls with your ${esc(club(stageClub(plan.stage, st.bag)).name)} to check ${esc(SKILLS[plan.skill].toLowerCase())} against this morning’s baseline.</span><button class="btn goldbtn" data-act="startRetest">Re-test · 5 balls</button></div>` : '';
  }
  return `
  <div class="top">${back(todays ? 'practice' : '', todays ? 'Practice' : 'Home')}</div>
  <div class="scroll-y" data-keep="trecap">
  <div class="title-block"><span class="eyebrow">${putt ? 'Putting' : 'Range'} recap · ${fmtDate(sess.ended)} · ${n} ${putt ? 'putts' : 'balls'}</span><h1>${esc(head)}</h1></div>
  ${ds.map(r => `<div class="card drill-card"><div class="score-ring">${ring(r.score, r.band, 56)}<span><b>${esc(r.drill.name)}</b><span class="muted">${r.hit} of ${r.n} ${esc(tallyFor(r.drill.id).yes[0].toLowerCase())} · felt ${r.rating ? r.rating : 'not rated'} · ${r.band}</span></span></div>${r.flag ? `<span class="muted flag">${esc(r.flag)}</span>` : ''}</div>`).join('')}
  ${retest}
  </div>
  <div class="bar"><a class="btn ${retest && !t.retestId ? 'sec' : 'pri'}" href="#/${todays ? 'practice' : ''}">Done</a></div>`;
}

// ---------- what helps you ----------
function helpsView() {
  const st = S(), imp = drillImpact(st), nb_ = st.sessions.filter(s => s.kind === 'baseline').length;
  const rows = Object.entries(imp).map(([id, o]) => ({ d: drillById(id), ...o })).filter(x => x.d && (x.n || x.same.length))
    .sort((a, b) => (b.n >= 3) - (a.n >= 3) || (b.avg != null ? b.avg : -999) - (a.avg != null ? a.avg : -999) || (b.sameAvg || 0) - (a.sameAvg || 0));
  const row = x => `<button class="impact" data-act="drillInfoPick" data-v="${x.d.id}">${drillGlyph(x.d.glyph)}<span><b>${esc(x.d.name)}</b><span class="muted">${esc(SKILLS[x.skill] || x.d.trains)} · ${x.n} session${x.n === 1 ? '' : 's'}${x.n < 3 ? ' <span class="chip-read">Early read</span>' : ''}${x.sameAvg != null ? ` · re-test ${sgn(x.sameAvg)}` : ''}</span></span><span class="delta${x.avg == null || x.avg <= 2 ? ' flat' : ''}">${x.avg == null ? '–' : sgn(x.avg)}<small>next session</small></span></button>`;
  return `
  <div class="top">${back('practice', 'Practice')}</div>
  <h1>What helps you</h1>
  <div class="scroll-y" data-keep="helps">
  <p class="helper">How much each drill moved its skill from one baseline to the next. Retention counts, not just the good balls at the end of a drill.</p>
  ${rows.length ? `<div class="card impact-list">${rows.map(row).join('')}</div>`
    : `<div class="card soft"><span class="lbl">Nothing to rank yet</span><span>${nb_ ? `${nb_} baseline${nb_ === 1 ? '' : 's'} so far. ` : ''}Do a baseline, your drills, and a baseline again next session. Each pair of baselines shows what the drills between them changed.</span></div>`}
  <p class="footnote">A drill needs 3 sessions before it is ranked. Points are percentage points on the skill’s baseline number.</p>
  </div>`;
}

// ---------- actions ----------
const startRangeBase = actions.startRange;
Object.assign(actions, {
  startRange: () => {
    startRangeBase();
    const a = S().active;
    if (a && a.kind === 'range' && !todayState().drillsId) setToday(t => { t.drillsId = a.id; });
  },
  flowStep: v => {
    const t = todayState(), st = S(), has = id => id && st.sessions.find(x => x.id === id);
    if (v === 'warm') return actions.warmRoutine();
    if (v === 'baseline') return has(t.baselineId) ? go('baseline/result/' + t.baselineId) : startTest('baseline');
    if (v === 'drills') {
      const s = has(t.drillsId);
      if (s) return go(`${s.kind}/recap/${s.id}`);
      if (st.active && st.active.id === t.drillsId) return go(st.active.kind + '/log');
      if (has(t.baselineId)) return go('baseline/result/' + t.baselineId);
      return go('range');
    }
    if (v === 'retest') return has(t.retestId) ? go('baseline/retest/' + t.retestId) : actions.startRetest();
  },
  flowSkip: v => { setToday(t => { t[{ warm: 'warmSkip', baseline: 'baseSkip', retest: 'retestSkip' }[v]] = true; }); render(); },
  warmDone: () => { stopWarm(); setToday(t => { t.warm = true; }); go('practice'); },
  warmBell: (v, el) => {
    update(s => { s.warmBell = s.warmBell === false; });
    app.querySelectorAll('[data-act="warmBell"]').forEach(b => b.setAttribute('aria-checked', String(S().warmBell !== false)));
    if (S().warmBell !== false) { unlockAudio(); bell(1); }
  },
  detailTrack: (v, el) => { update(s => { s.detailTrack = !s.detailTrack; }); el.setAttribute('aria-checked', String(!!S().detailTrack)); },
  // baseline and re-test
  testFree: () => {
    let moved = false;
    update(s => { const A = s.active; A.free++; if (A.free >= A.stages[A.si].n) { A.si++; setStage(A, s.bag); moved = true; } });
    buzz(8);
    if (moved) toast(`Loose. Now ${S().active.stages[S().active.si].n} tracked with the ${clubWords(club(S().active.club)).toLowerCase()}`);
    render();
  },
  testSkip: () => {
    const a = S().active;
    if (a.si >= a.stages.length - 1) return finishTest();
    update(s => { s.active.si++; s.active.pending = {}; setStage(s.active, s.bag); });
    render();
  },
  testShot: () => {
    const a = S().active, pd = a.pending || {};
    if (!hasDraft(pd)) return toast('Tap the ball, then the grass');
    const stg = a.stages[a.si];
    const shot = { t: Date.now(), drill: a.kind, stage: stg.id, club: a.club, type: a.type, view: logView(a), hand: S().hand, height: null, carry: null, tracker: 'full', ...draftPart(pd) };
    if (!shot.curve) shot.curve = null;
    let next = null, all = false;
    update(s => {
      const A = s.active; A.shots.push(shot); A.pending = {};
      if (A.shots.filter(x => x.stage === stg.id).length >= stg.n) {
        if (A.si < A.stages.length - 1) { A.si++; setStage(A, s.bag); next = A.stages[A.si].name; } else all = true;
      }
    });
    buzz(12);
    if (all) return finishTest();
    if (next) toast(`${stg.name} done. Next: ${next}`);
    render();
  },
  testUndo: () => {
    update(s => {
      const A = s.active;
      if (hasDraft(A.pending)) { A.pending = {}; return; }
      const x = A.shots.pop(); if (!x) return;
      const i = A.stages.findIndex(st => st.id === x.stage);
      if (i >= 0 && i !== A.si) { A.si = i; setStage(A, s.bag); }
    });
    render();
  },
  testClose: () => {
    const a = S().active, base = a.kind === 'baseline';
    if (!a.shots.length && !a.free) { update(s => { s.active = null; }); go('practice'); return; }
    openOverlay(`<div class="modal-wrap"><div class="modal" role="alertdialog" aria-label="Stop the ${base ? 'baseline' : 're-test'}?"><h2>Stop the ${base ? 'baseline' : 're-test'}?</h2><p>${a.shots.length ? `${a.shots.length} tracked ball${a.shots.length > 1 ? 's' : ''} will not be saved. ` : ''}A part ${base ? 'baseline' : 're-test'} would make the comparison unfair.${base && a.shots.length ? ' Use Finish to save what you have.' : ''}</p>
      <div class="btn-row"><button class="btn sec" data-modal="cancel">Keep going</button><button class="btn pri" data-modal="ok">Stop</button></div></div></div>`);
    const wrap = document.querySelector('.modal-wrap');
    wrap.querySelector('[data-modal=cancel]').focus();
    wrap.addEventListener('click', e => {
      const m = e.target.closest('[data-modal]');
      if (!m && e.target !== wrap) return;
      wrap.remove();
      if (m && m.dataset.modal === 'ok') { update(s => { s.active = null; }); go('practice'); }
    });
  },
  startRecDrills: v => {
    const base = S().sessions.find(x => x.id === v);
    const drills = ((base && base.recs) || []).map(r => r.id).filter(id => drillById(id));
    if (!drills.length) return go('range');
    if (S().active) finishActive();
    const first = drillById(drills[0]), st0 = drillStartClub({ shots: [], club: first.club }, first);
    update(s => { s.active = { kind: 'range', id: uid(), started: Date.now(), drills, di: 0, club: st0.club, type: st0.type, shots: [], pending: {}, baselineId: v }; });
    if (todayState().baselineId === v) setToday(t => { t.drillsId = S().active.id; });
    go('range/log');
  },
  startRetest: () => {
    const t = todayState(), st = S();
    const base = st.sessions.find(x => x.id === t.baselineId);
    if (!base) return toast('A re-test needs today’s baseline');
    const first = (base.recs || []).find(r => r.id !== 'play9');
    const plan = retestPlan(first ? first.skill : 'contact');
    let before = metric(plan.skill, base.shots.filter(s => s.stage === plan.stage.id));
    if (before == null) { const b = baselineSkills(base).find(x => x.id === plan.skill); before = b ? b.v : null; }
    const ds = st.sessions.find(x => x.id === t.drillsId);
    const drillIds = ds ? [...new Set(entriesOf(ds).map(x => x.drill))] : (base.recs || []).map(r => r.id);
    startTest('retest', { stage: plan.stage, skill: plan.skill, before, baselineId: base.id, drillIds });
  },
  // two-button drills
  tally: v => {
    const a = S().active, putt = a.kind === 'putt', d = tallyDrill(), hit = v === '1';
    const total = (putt ? d.putts : d.balls) || 10, t = tallyFor(d.id);
    const n0 = tallyOf(a, d, a.kind).length;
    if (n0 >= total) return actions.tallyFinish();
    update(s => {
      const A = s.active;
      if (putt) { A.putts.push({ t: Date.now(), drill: d.id, dist: A.dist, brk: A.brk, tally: true, hit, made: t.q === 'Made it?' ? hit : null }); return; }
      const shot = { t: Date.now(), drill: d.id, club: A.club, type: A.type, view: 'tally', hand: s.hand, tally: true, hit, contact: null, finish: null, curve: null, carry: null, height: null, x: null, y: null, tracker: d.tracker || 'full' };
      if (d.tracker === 'play9') { const now = p9Now(A); if (now) Object.assign(shot, { hole: now.h + 1, par: now.H.par, phase: now.phase, dist: now.left }); }
      if (d.mode === 'nine' || d.mode === 'punch') { const [h, c] = d.mode === 'punch' ? ['low', 'none'] : NINE_SEQ[n0 % 9]; shot.plan = { h, c }; }
      if (d.mode === 'ladder') shot.target = LADDER_YDS[n0 % LADDER_YDS.length];
      if (d.mode === 'clock') shot.swing = CLOCK[n0 % CLOCK.length].id;
      if (d.mode === 'grip') shot.grip = n0 % 2 ? 'choked' : 'full';
      A.shots.push(shot);
      if (d.tracker === 'play9' || d.mode === 'onedist') { const nx = drillStartClub(A, d); A.club = nx.club; A.type = nx.type; }
    });
    buzz(hit ? 12 : [8, 40, 8]);
    render();
    if (n0 + 1 >= total) setTimeout(() => openOverlay(rateSheet()), 220);
  },
  tallyUndo: () => {
    const a = S().active, d = tallyDrill();
    update(s => {
      const A = s.active, list = A.kind === 'putt' ? A.putts : A.shots;
      for (let i = list.length - 1; i >= 0; i--) if (list[i].drill === d.id && list[i].tally) { list.splice(i, 1); break; }
      if (A.ratings) delete A.ratings[d.id];
      if (A.kind === 'range' && (d.tracker === 'play9' || d.mode === 'onedist')) { const nx = drillStartClub(A, d); A.club = nx.club; A.type = nx.type; }
    });
    render();
  },
  tallyFinish: () => {
    const a = S().active, d = tallyDrill(), n = tallyOf(a, d, a.kind).length;
    if (!n) {
      if (a.di < a.drills.length - 1) return a.kind === 'putt' ? actions.nextPuttDrill() : actions.nextDrill();
      return confirmEnd(a.kind);
    }
    if (a.ratings && a.ratings[d.id] && a.lastDrill === d.id) return go(a.kind + '/drill');
    openOverlay(rateSheet());
  },
  rateDrill: v => {
    const a = S().active, d = tallyDrill();
    update(s => { const A = s.active; A.ratings = A.ratings || {}; if (v === 'skip') delete A.ratings[d.id]; else A.ratings[d.id] = v; A.lastDrill = d.id; });
    closeOverlays();
    go(a.kind + '/drill');
  },
  tallyNext: () => {
    const a = S().active;
    if (!a) return go('practice');
    if (a.di >= a.drills.length - 1) return a.kind === 'putt' ? actions.endPutt() : actions.endRange();
    update(s => {
      const A = s.active; A.di++; A.pending = {}; A.ppend = {};
      const nd = A.kind === 'putt' ? drillById(A.drills[A.di]) : currentDrill(A);
      if (A.kind === 'putt') { A.dist = nd.dist; A.brk = nd.brk; } else { const st0 = drillStartClub(A, nd); A.club = st0.club; A.type = st0.type; }
    });
    go(a.kind + '/log');
  },
});

document.addEventListener('click', e => {
  if (ui.railHeld) { ui.railHeld = false; if (!ui.holdUp || Date.now() - ui.holdUp < 600) { e.preventDefault(); e.stopPropagation(); return; } }
  const yt = e.target.closest('a[data-yt]');
  if (yt) { if (openYouTube(yt.dataset.yt)) e.preventDefault(); return; } // never toggles the drill card
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.classList.contains('sheet-wrap') && e.target !== el) return; // clicks inside the sheet
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset.v, el); }
});

document.addEventListener('keydown', e => {
  if (e.target.id === 'findQ' && e.key === 'Enter') { e.preventDefault(); clearTimeout(findTimer); runFind(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
});

document.addEventListener('input', e => {
  if (e.target.id === 'findQ') { queueFind(); return; }
  const k = e.target.dataset.input;
  if (!k) return;
  const v = +e.target.value;
  const t0 = e.target; t0.style.setProperty('--p', `${(v - t0.min) / (t0.max - t0.min) * 100}%`);
  if (k === 'target') {
    update(s => { s.caddy.target = v; });
    const big = app.querySelector('.big');
    if (big && big.firstChild) big.firstChild.textContent = v + ' ';
  }
  if (k === 'temp' || k === 'elev') {
    update(s => { s.conditions[k] = v; s.conditions.set = true; });
    const tv = document.getElementById('tempVal'); // update the label without losing slider focus
    if (k === 'temp' && tv) tv.textContent = `${v}°F`;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'findState') { update(s => { s.lastState = t.value; }); runFind(); return; }
  if (t.dataset.act === 'draftClub') { update(s => { s.active.draft.club = t.value; }); return; }
  if (t.hasAttribute('data-elev')) { const v = Math.min(10000, Math.max(0, parseInt(t.value, 10) || 0)); update(s => { s.conditions.elev = v; s.conditions.set = true; }); t.value = v; return; }
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
