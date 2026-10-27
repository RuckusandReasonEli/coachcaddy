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
    caddy: { target: 150, surface: 'fairway', slope: 'flat', steep: false, tab: 'sheet' },
  };
}

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    return { ...fresh(), ...s, conditions: { ...fresh().conditions, ...(s.conditions || {}) }, caddy: { ...fresh().caddy, ...(s.caddy || {}) } };
  } catch (e) {
    return fresh();
  }
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

export function exportJSON() {
  return JSON.stringify(state, null, 2);
}
