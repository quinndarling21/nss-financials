import { buildBaseline, STATE_VERSION } from './baseline.js';
import { todayISO } from './dates.js';

const KEY = 'nssfin.state.v1';

let mem = null;
let memRaw = null;
let memOnly = false;

function readRaw() {
  if (memOnly) return undefined;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return undefined;
  }
}

export function save(s) {
  mem = s;
  memRaw = JSON.stringify(s);
  try {
    localStorage.setItem(KEY, memRaw);
  } catch {
    memOnly = true;
  }
}

// Re-reads storage so a second window on the same browser sees the same ledger.
export function db() {
  const raw = readRaw();
  if (raw === undefined) {
    if (!mem) mem = buildBaseline(null);
    return mem;
  }
  if (raw !== null && raw === memRaw && mem) return mem;
  if (raw !== null) {
    try {
      const s = JSON.parse(raw);
      if (s && s.v === STATE_VERSION && Array.isArray(s.vouchers) && Array.isArray(s.pos)) {
        mem = s;
        memRaw = raw;
        return mem;
      }
    } catch {
      // unreadable entry falls through to a rebuild
    }
  }
  const s = buildBaseline(mem ? mem.epoch : null);
  save(s);
  return s;
}

export function rebuild(epoch) {
  const s = buildBaseline(epoch);
  save(s);
  return s;
}

export function ensureBusinessDate() {
  const s = db();
  if (s.businessDate !== todayISO()) {
    rebuild(s.epoch);
    return true;
  }
  return false;
}

export async function checkEpoch() {
  let value;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch('epoch.json?ts=' + Date.now(), { cache: 'no-store', signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return false;
    const body = await res.json();
    value = body ? body.epoch : undefined;
  } catch {
    return false;
  }
  if (value === undefined || value === null) return false;
  const s = db();
  if (s.epoch === null || s.epoch === undefined) {
    // State was just built from the baseline without a known epoch; adopt it.
    s.epoch = value;
    save(s);
    return false;
  }
  if (String(value) !== String(s.epoch)) {
    rebuild(value);
    return true;
  }
  return false;
}
