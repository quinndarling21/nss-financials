import { Screen, K, err } from './screen.js';

const OPTIONS = [
  ['1', 'Vendor inquiry', 'APV010'],
  ['2', 'Purchase order inquiry', 'APP020'],
  ['3', 'Receiving inquiry', 'APR030'],
  ['4', 'Voucher entry', 'APV040'],
  ['5', 'Open vouchers', 'APV050'],
  ['6', 'Payment proposal', 'APP060'],
  ['7', 'Vendor bank detail review', 'APV070'],
];

export class MainMenu extends Screen {
  constructor(app) {
    super(app);
    this.f = { sel: '' };
  }

  get id() { return 'APMENU'; }

  get title() { return 'Accounts Payable Menu'; }

  legend() {
    return [K.F3, K.ENTER];
  }

  view(v) {
    v.t(3, 1, 'Select one of the following:');
    OPTIONS.forEach(([n, label], i) => {
      v.b(5 + i, 5, `${n.padStart(2)}. ${label}`, () => this.pick(n), `${n}. ${label}`);
    });
    v.b(13, 5, '90. Sign off', () => this.pick('90'), '90. Sign off');
    v.t(19, 1, 'Selection or command');
    v.t(20, 1, '===>', 'w');
    v.f('sel', 'Selection', 20, 6, 20, this.f.sel, { upper: true });
  }

  pick(n) {
    this.f.sel = n;
    this.submit();
  }

  key(k) {
    if (k === 'F3') return this.app.signOff();
    if (k === 'Enter') return this.submit();
    return undefined;
  }

  submit() {
    const raw = this.f.sel.trim().toUpperCase();
    if (!raw) return;
    const sel = /^\d+$/.exec(raw) ? String(Number(raw)) : raw;
    if (sel === '90' || sel === 'SIGNOFF') {
      this.app.signOff();
      return;
    }
    const hit = OPTIONS.find(o => o[0] === sel);
    if (hit) {
      this.app.open(hit[2]);
      return;
    }
    this.msg = err('NSF0002 Selection not valid.');
    this.focusReq = 'sel';
  }
}
