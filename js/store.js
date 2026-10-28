// Local-first storage. Everything lives in this phone's localStorage; nothing leaves the device.
import { DEFAULT_BAG } from './data.js';

const KEY = 'coachcaddy.v1';

function fresh() {
  return {
    version: 1,
    theme: 'day',
    hand: 'right',
    bag: DEFAULT_BAG.map(c => ({ ...c })),
    sessions: [],          // finished range, putting and course sessions
    active: null,          // session in progress
    plan: null,            // saved "next time" plan
    conditions: { temp: 70, moisture: 'normal', elev: 0, difficulty: 'medium', set: false },
    warmAuto: true,        // warm-up cards roll into the next move when the timer ends
    caddy: { target: 150, surface: 'fairway', slope: 'flat', steep: false, tab: 'sheet' },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    if (Array.isArray(s.bag)) s.bag = migrateBag(s.bag);
    return { ...fresh(), ...s, conditions: { ...fresh().conditions, ...(s.conditions || {}) }, caddy: { ...fresh().caddy, ...(s.caddy || {}) } };
  } catch (e) {
    return fresh();
  }
}

// Older bags named wedges by loft only ("52°"). Give them names and an editable loft.
function migrateBag(bag) {
  const named = { PW: ['PW', 46], 52: ['Gap wedge', 52], 56: ['Sand wedge', 56], 60: ['Flop wedge', 60] };
  return bag.map(c => {
    const n = named[c.id];
    if (n && (c.loft == null)) return { ...c, name: /^\d+°$/.test(c.name) || c.name === 'PW' ? n[0] : c.name, loft: n[1] };
    return c;
  });
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full or blocked */ }
}

export function S() { return state; }

export function update(fn) {
  fn(state);
  save();
}

export function replaceAll(next) {
  state = { ...fresh(), ...next };
  save();
}

export function resetAll() {
  state = fresh();
  save();
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function club(id) {
  return state.bag.find(c => c.id === id) || state.bag[0];
}

// Clubs currently in the bag (not crossed out).
export function inBag() {
  return state.bag.filter(c => !c.out);
}

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}
