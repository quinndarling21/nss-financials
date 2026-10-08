import { View, COLS } from '../terminal.js';
import { fmtDate, nowTime, todayISO } from '../dates.js';

export const K = {
  F3: { k: 'F3', t: 'Exit' },
  F5: { k: 'F5', t: 'Refresh' },
  F10P: { k: 'F10', t: 'Post' },
  F10R: { k: 'F10', t: 'Release' },
  F12: { k: 'F12', t: 'Cancel' },
  ENTER: { k: 'Enter', t: 'Submit' },
  PGUP: { k: 'PageUp', s: 'PgUp', aria: 'Page Up' },
  PGDN: { k: 'PageDown', s: 'PgDn', aria: 'Page Down' },
};

export const err = text => ({ text, err: true });
export const info = text => ({ text, err: false });

export const MORE_ROW = 21;

export function header(v, id, title, userId) {
  v.t(0, 1, id, 'w');
  v.t(0, 23, 'NSS Financials - Accounts Payable', 'w');
  v.t(0, 59, userId || '', 'w');
  v.t(0, 70, fmtDate(todayISO()), 'w', 'date');
  v.t(1, 1, 'NSSFIN');
  v.t(1, Math.floor((COLS - title.length) / 2), title, 'c');
  v.t(1, 70, nowTime(), '', 'clock');
}

export function pageOf(items, size, page) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(0, page), pages - 1);
  return { rows: items.slice(p * size, p * size + size), page: p, pages, more: p < pages - 1, start: p * size };
}

export function moreIndicator(v, pg, onDown, r = MORE_ROW) {
  if (pg.more) v.b(r, 72, 'More...', onDown, 'More');
  else v.t(r, 73, 'Bottom');
}

// Returns true when the key was a roll key.
export function roll(scr, k, total, size, prop = 'page') {
  const pages = Math.max(1, Math.ceil(total / size));
  if (k === 'PageDown') {
    if (scr[prop] >= pages - 1) scr.msg = err('NSF0010 Already at bottom of list.');
    else scr[prop] += 1;
    return true;
  }
  if (k === 'PageUp') {
    if (scr[prop] <= 0) scr.msg = err('NSF0011 Already at top of list.');
    else scr[prop] -= 1;
    return true;
  }
  return false;
}

export class Screen {
  constructor(app) {
    this.app = app;
    this.f = {};
    this.msg = null;
    this.focusReq = null;
  }

  get id() { return ''; }

  get title() { return ''; }

  legend() { return [K.F3, K.F12]; }

  view() {}

  build() {
    const v = new View();
    if (this.id) header(v, this.id, this.title, this.app.user);
    this.view(v);
    v.legend = this.legend().map(k => ({ ...k, on: () => this.handle(k.k) }));
    v.message = this.msg;
    v.focus = this.focusReq;
    return v;
  }

  allows(k) {
    return this.legend().some(x => x.k === k);
  }

  handle(k) {
    if (/^F\d+$/.exec(k) && !this.allows(k)) {
      this.msg = err('NSF0003 Function key not allowed.');
      return undefined;
    }
    this.msg = null;
    return this.key(k);
  }

  key(k) {
    if (k === 'F3' || k === 'F12') this.app.menu();
  }

  set(name, value) {
    if (name in this.f) this.f[name] = value;
  }

  exit() {
    return false;
  }
}
