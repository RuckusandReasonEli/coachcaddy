// CSV export: everything stored on the phone at that moment, one row per record.
// The first column, record_type, says what the row is: range_shot, putt, course_hole, course_shot, club, setting.
import { RANGE_DRILLS, PUTT_DRILLS, SHOT_TYPES, BASIC } from './data.js';
import { reliability } from './engine.js';

export const APP_VERSION = '0.5.0';

const COLS = [
  'record_type', 'session_id', 'session_kind', 'session_status', 'session_date', 'logged_at', 'drill',
  'club', 'swing', 'contact', 'length', 'direction', 'carry_yds', 'target_yds', 'drill_check', 'strike_spot',
  'shape_planned', 'shape_hit', 'play9_hole', 'play9_par', 'play9_shot',
  'putt_ft', 'break', 'made', 'finished_ft', 'miss', 'lip_out',
  'hole', 'par', 'strokes', 'putts', 'from', 'result',
  'full_carry', 'choked_carry', 'loft', 'in_bag', 'custom', 'reliability',
  'setting', 'value',
];

const CONTACT = { pure: 'Pure', solid: 'Solid', thin: 'Thin', top: 'Topped', heel: 'Heel', toe: 'Toe', shank: 'Shank', under: 'Under it', skied: 'Skied', chunk: 'Chunk' };
const ROW = { long: 'Long', short: 'Short', pin: 'Pin high', normal: 'Normal' };
const COL = { line: 'On line', left: 'Left', right: 'Right', obL: 'OB left', obR: 'OB right' };
const WOODS_COL = { line: 'Fairway', left: 'Left rough', right: 'Right rough', obL: 'OB left', obR: 'OB right' };
const BRK = { left: 'Breaks left', straight: 'Straight', right: 'Breaks right' };
const PHASE = { tee: 'Tee shot', layup: 'Lay-up', approach: 'Approach' };
const RESULT = { fairway: 'Fairway', green: 'Green', short: 'Short', long: 'Long', left: 'Left', right: 'Right', penalty: 'Penalty', holed: 'Holed' };
const FROM = { tee: 'Tee', fairway: 'Fairway', rough: 'Rough', sand: 'Sand', fringe: 'Fringe' };

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
const yn = v => v == null ? '' : v ? 'Yes' : 'No';
const pad = n => String(n).padStart(2, '0');
export function stamp(t, withTime = true) {
  if (!t) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}${withTime ? ` ${pad(d.getHours())}:${pad(d.getMinutes())}` : ''}`;
}
const shape = s => s ? `${cap(s.h)} ${s.c === 'none' ? 'straight' : s.c}` : '';
const drillName = id => { const d = id === BASIC.id ? null : RANGE_DRILLS.find(x => x.id === id) || PUTT_DRILLS.find(x => x.id === id); return d ? d.name : ''; };

// Quote every text field; numbers go in bare. Commas, quotes and line breaks stay inside one cell.
function cell(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return String(v);
  return `"${String(v).replace(/"/g, '""')}"`;
}

export function buildCSV(st) {
  const bag = st.bag || [];
  const clubName = id => { const c = bag.find(x => x.id === id); return c ? c.name : id || ''; };
  const swing = id => { const t = SHOT_TYPES.find(x => x.id === id); return t ? t.name : id || ''; };
  const rows = [];
  const add = o => rows.push(o);
  const sessions = (st.sessions || []).map(s => ({ s, status: 'finished' }));
  if (st.active) sessions.push({ s: st.active, status: 'in_progress' });

  sessions.forEach(({ s, status }) => {
    const base = { session_id: s.id, session_kind: s.kind, session_status: status, session_date: stamp(s.ended || s.started, false) };
    if (s.kind === 'range') {
      (s.shots || []).forEach(x => {
        const f = x.finish || {};
        add({ record_type: 'range_shot', ...base, logged_at: stamp(x.t), drill: drillName(x.drill), club: clubName(x.club), swing: swing(x.type),
          contact: CONTACT[x.contact] || cap(x.contact), length: ROW[f.row] || cap(f.row),
          direction: f.holed ? 'Holed' : (x.view === 'woods' ? WOODS_COL : COL)[f.col] || cap(f.col),
          carry_yds: x.carry, target_yds: x.target, drill_check: yn(x.check),
          strike_spot: x.face ? (x.face.h === 'center' && x.face.v === 'mid' ? 'Center' : `${cap(x.face.h)}, ${x.face.v}`) : '',
          shape_planned: shape(x.plan), shape_hit: shape(x.got),
          play9_hole: x.hole, play9_par: x.phase ? x.par : null, play9_shot: PHASE[x.phase] || '' });
      });
    } else if (s.kind === 'putt') {
      (s.putts || []).forEach(p => {
        const miss = p.made ? '' : [p.len ? cap(p.len) : '', p.side === 'center' ? 'on line' : p.lowSide != null ? (p.lowSide ? 'low side' : 'high side') : p.side || ''].filter(Boolean).join(' ');
        add({ record_type: 'putt', ...base, logged_at: stamp(p.t), drill: drillName(p.drill), putt_ft: p.dist, break: BRK[p.brk] || '',
          made: yn(!!p.made), finished_ft: p.made ? 0 : p.ft, miss: cap(miss), lip_out: yn(!!p.lip) });
      });
    } else if (s.kind === 'course') {
      (s.holes || []).filter(h => h.shots.length || h.putts).forEach(h => {
        add({ record_type: 'course_hole', ...base, hole: h.n, par: h.par, strokes: h.shots.length + (h.putts || 0), putts: h.putts || 0 });
        h.shots.forEach(x => add({ record_type: 'course_shot', ...base, hole: h.n, par: h.par, club: clubName(x.club), from: FROM[x.from] || cap(x.from), result: RESULT[x.result] || cap(x.result) }));
      });
    }
  });

  const rel = reliability(st).clubs;
  bag.forEach(c => {
    const r = rel[c.id];
    add({ record_type: 'club', club: c.name, full_carry: c.carry, choked_carry: c.choked, loft: c.loft, in_bag: yn(!c.out), custom: yn(!!c.custom), reliability: r && !r.locked ? r.score : '' });
  });

  const cond = st.conditions || {};
  const plan = st.plan || {};
  [['app_version', APP_VERSION], ['exported_at', stamp(Date.now())], ['theme', st.theme], ['handedness', st.hand],
   ['warm_up_auto_advance', yn(st.warmAuto)], ['temperature_f', cond.temp], ['moisture', cond.moisture], ['elevation_ft', cond.elev],
   ['course_difficulty', cond.difficulty], ['next_range_plan', (plan.range || []).map(drillName).join(', ')],
   ['next_putting_plan', (plan.putt || []).map(drillName).join(', ')]]
    .forEach(([k, v]) => add({ record_type: 'setting', setting: k, value: v == null ? '' : String(v) }));

  const text = [COLS.join(','), ...rows.map(r => COLS.map(c => cell(r[c])).join(','))].join('\r\n');
  return { csv: '﻿' + text + '\r\n', rows: rows.length };
}

// What a reset would delete, for the Home card and the prompt.
export function dataCounts(st) {
  const all = (st.sessions || []).concat(st.active ? [st.active] : []);
  const shots = all.reduce((n, s) => n + (s.shots ? s.shots.length : 0) + (s.holes ? s.holes.reduce((m, h) => m + h.shots.length, 0) : 0), 0);
  const putts = all.reduce((n, s) => n + (s.putts ? s.putts.length : 0) + (s.holes ? s.holes.reduce((m, h) => m + (h.putts || 0), 0) : 0), 0);
  return { sessions: all.length, shots, putts };
}
