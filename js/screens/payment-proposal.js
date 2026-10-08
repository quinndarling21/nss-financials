import { Screen, K, err, info, pageOf, moreIndicator, roll } from './screen.js';
import { View } from '../terminal.js';
import { proposal, releaseRun, vendor } from '../ledger.js';
import { fmtDate } from '../dates.js';
import { fmt2, out, rpad } from '../format.js';

const BODY_FIRST = 7;
const BODY_ROWS = 14;

const plural = n => `${n} voucher${n === 1 ? '' : 's'}`;

function right(v, r, end, s, cls = '') {
  v.t(r, end - s.length + 1, s, cls);
}

export class PaymentProposal extends Screen {
  constructor(app) {
    super(app);
    this.f = { confirm: '' };
    this.confirming = false;
    this.page = 0;
  }

  get id() { return 'APP060'; }

  get title() { return 'Payment Proposal'; }

  legend() {
    const keys = [K.F3, K.F5, K.F10R, K.F12];
    if (this.body(proposal()).length > BODY_ROWS) keys.push(K.PGUP, K.PGDN);
    return keys;
  }

  body(p) {
    const rows = [];
    const name = x => rpad(vendor(x.vendor)?.name || x.vendor, 31);
    rows.push((v, r) => v.t(r, 1, p.rec ? 'Vouchers in run (paid)' : 'Vouchers in run', 'w'));
    rows.push((v, r) => {
      v.t(r, 1, 'Vendor', 'w');
      v.t(r, 33, 'Voucher', 'w');
      v.t(r, 41, 'Invoice', 'w');
      v.t(r, 54, 'Due date', 'w');
      v.t(r, 73, 'Amount', 'w');
    });
    if (!p.vouchers.length) rows.push((v, r) => v.t(r, 3, 'No open vouchers due by the next pay date.'));
    for (const x of p.vouchers) {
      rows.push((v, r) => {
        v.t(r, 1, name(x));
        v.t(r, 33, x.no);
        v.t(r, 41, rpad(x.invoice, 12));
        v.t(r, 54, fmtDate(x.due));
        right(v, r, 78, fmt2(x.amount), 'w');
      });
    }
    rows.push((v, r) => {
      v.t(r, 1, out('Run total', 20));
      v.t(r, 23, plural(p.vouchers.length), 'w');
      right(v, r, 78, fmt2(p.total), 'y');
    });
    rows.push(null);
    rows.push((v, r) => v.t(r, 1, 'Held - not in run', 'w'));
    rows.push((v, r) => {
      v.t(r, 1, 'Vendor', 'w');
      v.t(r, 33, 'Voucher', 'w');
      v.t(r, 41, 'Invoice', 'w');
      v.t(r, 54, 'Hold reason', 'w');
      v.t(r, 73, 'Amount', 'w');
    });
    if (!p.held.length) rows.push((v, r) => v.t(r, 3, 'No vouchers on hold.'));
    for (const x of p.held) {
      rows.push((v, r) => {
        v.t(r, 1, name(x));
        v.t(r, 33, x.no);
        v.t(r, 41, rpad(x.invoice, 12));
        v.t(r, 54, rpad(x.holdReason, 15), 'y');
        right(v, r, 78, fmt2(x.amount), 'w');
      });
    }
    return rows;
  }

  view(v) {
    const p = proposal();
    v.t(3, 1, out('Payment run', 20));
    v.t(3, 22, p.id, 'w');
    v.t(3, 44, out('Status', 18));
    v.t(3, 64, p.status, 'y');
    v.t(4, 1, out('Pay method', 20));
    v.t(4, 22, 'ACH', 'w');
    v.t(4, 44, out('Next pay date', 18));
    v.t(4, 64, fmtDate(p.nextPay), 'w');
    v.t(5, 1, out('Released at', 20));
    v.t(5, 44, out('Released by', 18));
    if (p.rec) {
      v.t(5, 22, p.rec.releasedAt, 'w');
      v.t(5, 64, p.rec.releasedBy, 'w');
    }

    const body = this.body(p);
    const pg = pageOf(body, BODY_ROWS, this.page);
    pg.rows.forEach((fn, i) => { if (fn) fn(v, BODY_FIRST + i); });
    if (body.length > BODY_ROWS) moreIndicator(v, pg, () => this.handle('PageDown'));

    if (this.confirming) v.window = this.confirmWindow(p);
  }

  confirmWindow(p) {
    const w = new View();
    const r = 8;
    const c = 12;
    const width = 56;
    const L = c + 3;
    const prompt = `Release payment run ${p.id}? Y/N`;
    w.t(r + 1, c + Math.floor((width - 15) / 2), 'Confirm Release', 'w');
    w.t(r + 3, L, prompt, 'w');
    w.f('confirm', 'Confirm', r + 3, L + prompt.length + 2, 1, this.f.confirm, { upper: true });
    w.t(r + 4, L, `${plural(p.vouchers.length)}   ${fmt2(p.total)}   ACH`);
    w.b(r + 6, L, 'Y=Yes', () => this.answer('Y'), 'Y Yes');
    w.b(r + 6, L + 8, 'N=No', () => this.answer('N'), 'N No');
    w.b(r + 6, L + 15, 'Enter=Submit', () => this.answer(this.f.confirm), 'Enter Submit');
    w.b(r + 6, L + 30, 'F12=Cancel', () => this.answer('N'), 'F12 Cancel');
    return { r, c, w: width, h: 9, view: w };
  }

  key(k) {
    if (k === 'F3') return this.app.menu();
    if (this.confirming) {
      if (k === 'Enter') this.answer(this.f.confirm);
      else if (k === 'F12') this.answer('N');
      return undefined;
    }
    if (k === 'F12') return this.app.menu();
    if (k === 'F10') return this.askRelease();
    if (k === 'F5') return undefined;
    roll(this, k, this.body(proposal()).length, BODY_ROWS);
    return undefined;
  }

  askRelease() {
    const p = proposal();
    if (p.rec) {
      this.msg = err(`NSF0605 Payment run ${p.id} already released.`);
      return;
    }
    if (!p.vouchers.length) {
      this.msg = err(`NSF0612 No vouchers in payment run ${p.id}.`);
      return;
    }
    this.f.confirm = '';
    this.confirming = true;
  }

  answer(a) {
    const ans = String(a || '').trim().toUpperCase();
    const p = proposal();
    if (ans === 'N') {
      this.confirming = false;
      this.msg = info('NSF0610 Release cancelled.');
      return;
    }
    if (ans !== 'Y') {
      this.msg = err('NSF0611 Type Y or N.');
      this.focusReq = 'confirm';
      return;
    }
    this.confirming = false;
    const done = releaseRun(this.app.user);
    if (!done) {
      this.msg = err(`NSF0605 Payment run ${p.id} already released.`);
      return;
    }
    this.page = 0;
    this.msg = info(`NSF0600 Payment run ${done.id} released. ${plural(done.vouchers.length)}, ${fmt2(done.total)}.`);
  }
}
