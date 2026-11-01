// Course finder: OpenGolfAPI (public course data from OpenStreetMap), the same source Mulligan Skins uses.
// Search needs a connection; once a course is added it is stored on the phone, so a round works offline.
export const OGA = 'https://api.opengolfapi.org';
export const STATES = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const COLORS = ['white', 'blue', 'gold', 'red', 'black', 'green', 'silver'];

const pick = (o, keys) => { if (!o) return null; for (const k of keys) if (o[k] != null && o[k] !== '') return o[k]; return null; };
const numOf = v => { if (v == null) return null; if (typeof v === 'object') v = pick(v, ['yardage', 'yards', 'value', 'length']); const n = parseInt(v, 10); return isNaN(n) ? null : n; };
const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i);

async function ogaGet(path) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(OGA + path, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(timer); }
}
const tryGet = path => ogaGet(path).catch(() => null);

export const hitName = c => String(pick(c, ['course_name', 'name', 'club_name']) || 'Unnamed course');
export function hitLine(c) {
  const bits = [];
  const city = pick(c, ['city', 'town']), st = pick(c, ['state', 'state_code']);
  if (city || st) bits.push([city, st].filter(Boolean).join(', '));
  const holes = numOf(pick(c, ['holes', 'num_holes', 'hole_count', 'total_holes']));
  if (holes) bits.push(`${holes} holes`);
  const par = numOf(pick(c, ['par', 'total_par']));
  if (par) bits.push(`Par ${par}`);
  return bits.join(' · ');
}

// Returns the list of matching courses, sorted by name. Throws when the database can't be reached.
export async function searchCourses(q, state) {
  const qs = new URLSearchParams({ limit: '50' });
  if (q) qs.set('q', q);
  if (state) qs.set('state', state);
  const data = await ogaGet('/v1/courses/search?' + qs);
  const hits = (data && (data.courses || data.results || (Array.isArray(data) ? data : []))) || [];
  return hits.sort((a, b) => hitName(a).localeCompare(hitName(b)));
}

// Loads one course's scorecard and turns it into Coach Caddy's course format. Null when it can't be loaded.
export async function loadCourse(hit) {
  const id = pick(hit, ['id', 'course_id', 'uuid']);
  const enc = encodeURIComponent(id);
  const [full, basic, tees, holes] = await Promise.all([tryGet(`/api/v1/courses/${enc}`), tryGet(`/v1/courses/${enc}`), tryGet(`/v1/courses/${enc}/tees`), tryGet(`/v1/courses/${enc}/holes`)]);
  if (!full && !basic) return null;
  const detail = Object.assign({}, hit, basic || {}, full || {});
  if (!detail.scorecard && basic && basic.scorecard) detail.scorecard = basic.scorecard;
  return mapApiCourse(detail, tees, holes);
}

function guessColor(name, k) {
  const s = String(name || '').toLowerCase();
  for (const c of COLORS) if (s.includes(c)) return c;
  if (s.includes('yellow') || s.includes('champ') || s.includes('tips')) return 'gold';
  if (s.includes('forward') || s.includes('women') || s.includes('ladies')) return 'red';
  return ['red', 'white', 'blue', 'gold', 'black'][k % 5];
}

// Field names are matched loosely so small differences in the API's answers still map (from Mulligan Skins).
export function mapApiCourse(detail, teesResp, holesResp) {
  const d = detail || {};
  const holeSources = [d.holes_data, d.scorecard, Array.isArray(d.holes) ? d.holes : null, holesResp && (holesResp.holes || holesResp.scorecard)]
    .filter(a => Array.isArray(a) && a.length);
  const byHole = {};
  holeSources.forEach(src => src.forEach((it, idx) => {
    const h = numOf(pick(it, ['hole_number', 'hole', 'number', 'hole_no'])) || idx + 1;
    const e = byHole[h] || (byHole[h] = { par: null, hcp: null, yard: [] });
    if (e.par == null) e.par = numOf(it.par);
    if (e.hcp == null) e.hcp = numOf(pick(it, ['handicap_index', 'handicap', 'stroke_index', 'hcp', 'si']));
    const y = pick(it, ['yardages', 'yardage', 'yards', 'tees', 'tee_yardages']);
    if (y != null) e.yard.push(y);
  }));
  let tees = [d.tees, teesResp && teesResp.tees, Array.isArray(teesResp) ? teesResp : null].find(a => Array.isArray(a) && a.length) || [];
  tees = tees.map((t, k) => ({ k, name: String(pick(t, ['tee_name', 'name', 'color', 'tee', 'tee_color']) || `Tee ${k + 1}`),
    total: numOf(pick(t, ['total_yardage', 'yardage', 'yards', 'total_yards', 'length'])), per: pick(t, ['holes', 'hole_yardages', 'yardages', 'holes_data']) }));
  if (!tees.length) {
    const keys = new Set();
    Object.values(byHole).forEach(e => e.yard.forEach(y => { if (y && typeof y === 'object' && !Array.isArray(y)) Object.keys(y).forEach(k => keys.add(k)); }));
    tees = [...keys].map((name, k) => ({ k, name, total: null, per: null }));
  }
  const holeNums = Object.keys(byHole).map(Number).filter(Boolean);
  const declared = numOf(pick(d, ['holes', 'num_holes', 'hole_count', 'total_holes'])) || (typeof d['golf:holes'] === 'number' ? d['golf:holes'] : null);
  const maxHole = Math.max(holeNums.length ? Math.max(...holeNums) : 0, declared || 0);
  const L = maxHole && maxHole <= 9 ? 9 : 18;
  const yardFor = (tee, h) => {
    if (Array.isArray(tee.per)) {
      const v = tee.per.find(x => x && typeof x === 'object' && numOf(pick(x, ['hole_number', 'hole', 'number'])) === h);
      const n = v ? numOf(v) : numOf(tee.per[h - 1]);
      if (n) return n;
    }
    const e = byHole[h]; if (!e) return null;
    for (const y of e.yard) {
      if (typeof y === 'number' || typeof y === 'string') { if (tees.length === 1) return numOf(y); continue; }
      if (Array.isArray(y)) {
        const m = y.find(x => x && typeof x === 'object' && String(pick(x, ['tee_name', 'name', 'tee', 'color']) || '').toLowerCase() === tee.name.toLowerCase());
        const n = m ? numOf(m) : numOf(y[tee.k]);
        if (n) return n;
      } else if (y && typeof y === 'object') {
        const key = Object.keys(y).find(k => k.toLowerCase() === tee.name.toLowerCase());
        if (key) { const n = numOf(y[key]); if (n) return n; }
      }
    }
    return null;
  };
  let appTees = tees.map(t => ({ name: t.name, color: guessColor(t.name, t.k), yds: range(1, L + 1).map(h => yardFor(t, h)), total: t.total }));
  appTees.forEach(t => { if (!t.total) t.total = t.yds.reduce((a, y) => a + (y || 0), 0) || null; });
  appTees = appTees.sort((a, b) => (a.total || 0) - (b.total || 0)).slice(0, 6);
  const holes = range(1, L + 1).map(h => ({ par: byHole[h] ? byHole[h].par : null, hcp: byHole[h] ? byHole[h].hcp : null }));
  const id = String(pick(d, ['id', 'course_id', 'uuid']) || '');
  return {
    id: 'oga-' + (id || Date.now().toString(36)),
    name: String(pick(d, ['course_name', 'name', 'club_name', 'facility_name']) || 'Course'),
    city: String(pick(d, ['city', 'town']) || ''), state: String(pick(d, ['state', 'state_code']) || ''),
    holes, tees: appTees,
    source: { api: 'opengolfapi', id, fetchedAt: Date.now() },
  };
}

// A course typed in by hand: every hole par 4 until changed on the hole screen.
export function customCourse(name, n) {
  return { id: 'cc-' + Date.now().toString(36), name: name || 'Custom course', city: '', state: '', custom: true,
    holes: range(0, n).map(() => ({ par: 4, hcp: null })), tees: [], source: { api: 'custom' } };
}

// What the data covers, for the preview checks.
export function courseStats(c) {
  const L = c.holes.length;
  return { holes: L, pars: c.holes.filter(h => h.par).length, hcps: c.holes.filter(h => h.hcp).length, tees: c.tees.length,
    yards: c.tees.some(t => t.yds.some(Boolean)), par: c.holes.reduce((a, h) => a + (h.par || 0), 0) };
}
