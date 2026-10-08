import { Screen, K, err, info, pageOf, moreIndicator, roll } from './screen.js';
import { View } from '../terminal.js';
import { findVoucher, setHold, vendor, voucherList } from '../ledger.js';
import { fmtDate } from '../dates.js';
import { fmt2, fmtPrice, lead, lpad, out, rpad } from '../format.js';

const LIST_ROWS = 13;
const DETAIL_ROWS = 8;
const STATUS_CLASS = { Open: 'w', Held: 'y', Paid: '' };

export class OpenVouchers extends Screen {
  constructor(app) {
    super(app);
    this.f = { vend: '' };
    this.filter = '';
    this.opts = {};
    this.page = 0;
    this.mode = 'list';
    this.shown = null;
    this.dpage = 0;
    this.hold = null;
  }

  get id() { return 'APV050'; }

  get title() { return this.mode === 'display' ? 'Voucher Display' : 'Open Vouchers'; }

  legend() {
    if (this.mode === 'display') {
      const v = findVoucher(this.shown);
      const keys = [K.F3, K.F12];
      if (v && v.lines.length > DETAIL_ROWS) keys.push(K.PGUP, K.PGDN);
      return keys;
    }
    return [K.F3, K.F5, K.F12, K.ENTER, K.PGUP, K.PGDN];
  }

  set(name, value) {
    if (name.startsWith('opt_')) this.opts[name.slice(4)] = value;
    else if (name === 'hHold' && this.hold) this.hold.hold = value;
    else if (name === 'hReason' && this.hold) this.hold.reason = value;
    else super.set(name, value);
  }

  rows() {
    const all = voucherList();
    return this.filter ? all.filter(v => v.vendor === this.filter) : all;
  }

  view(v) {
    if (this.mode === 'display') return this.viewDisplay(v);
    v.t(3, 1, lead('Vendor', 20));
    v.f('vend', 'Vendor', 3, 23, 5, this.f.vend, { upper: true });
    v.t(3, 30, 'Blank for all vendors');
    v.t(4, 1, 'Type options, press Enter.');
    v.t(5, 3, '2=Change hold   5=Display');
    v.t(7, 0, 'Opt', 'w');
    v.t(7, 4, 'Voucher', 'w');
    v.t(7, 12, 'Vendor', 'w');
    v.t(7, 28, 'Invoice', 'w');
    v.t(7, 44, 'Amount', 'w');
    v.t(7, 51, 'Due date', 'w');
    v.t(7, 60, 'Sts', 'w');
    v.t(7, 65, 'Hold reason', 'w');

    const rows = this.rows();
    if (!rows.length) v.t(8, 4, 'No vouchers on file for this vendor.');
    const pg = pageOf(rows, LIST_ROWS, this.page);
    pg.rows.forEach((x, i) => {
      const r = 8 + i;
      const ven = vendor(x.vendor);
      v.f(`opt_${x.no}`, `Opt ${x.no}`, r, 1, 1, this.opts[x.no] || '');
      v.b(r, 4, x.no, () => this.display(x.no), `Display voucher ${x.no}`);
      v.t(r, 12, x.vendor);
      v.t(r, 18, rpad(ven ? ven.shortName : '', 9));
      v.t(r, 28, rpad(x.invoice, 12));
      v.t(r, 41, lpad(fmt2(x.amount), 9), 'w');
      v.t(r, 51, fmtDate(x.due));
      v.t(r, 60, x.status, STATUS_CLASS[x.status]);
      v.t(r, 65, rpad(x.holdReason, 15), 'y');
    });
    moreIndicator(v, pg, () => this.handle('PageDown'));
    if (this.hold) v.window = this.holdWindow();
    return undefined;
  }

  holdWindow() {
    const h = this.hold;
    const x = findVoucher(h.no);
    const ven = vendor(x.vendor);
    const w = new View();
    const r = 6;
    const c = 8;
    const width = 64;
    const L = c + 3;
    const V = L + 20;
    w.t(r + 1, c + Math.floor((width - 15) / 2), 'Change Pay Hold', 'w');
    w.t(r + 3, L, out('Voucher', 18));
    w.t(r + 3, V, x.no, 'w');
    w.t(r + 4, L, out('Vendor', 18));
    w.t(r + 4, V, `${x.vendor}  ${ven ? ven.name : ''}`, 'w');
    w.t(r + 5, L, out('Invoice', 18));
    w.t(r + 5, V, `${x.invoice}   ${fmt2(x.amount)}`, 'w');
    w.t(r + 6, L, out('Status', 18));
    w.t(r + 6, V, x.status, 'w');
    w.t(r + 8, L, lead('Pay hold', 18));
    w.f('hHold', 'Pay hold', r + 8, V, 1, h.hold, { upper: true });
    w.t(r + 8, V + 3, 'H=Hold, blank=Release');
    w.t(r + 9, L, lead('Hold reason', 18));
    w.f('hReason', 'Hold reason', r + 9, V, 20, h.reason, { upper: true });
    w.b(r + 12, L, 'Enter=Submit', () => this.saveHold(), 'Enter Submit');
    w.b(r + 12, L + 15, 'F12=Cancel', () => { this.hold = null; }, 'F12 Cancel');
    return { r, c, w: width, h: 15, view: w };
  }

  viewDisplay(v) {
    const x = findVoucher(this.shown);
    if (!x) return;
    const ven = vendor(x.vendor);
    const L = 2;
    const LV = 23;
    const R = 46;
    const RV = 66;
    v.t(3, L, out('Voucher', 20));
    v.t(3, LV, x.no, 'w');
    v.t(3, R, out('Status', 18));
    v.t(3, RV, x.status, STATUS_CLASS[x.status] || 'w');
    v.t(4, L, out('Vendor', 20));
    v.t(4, LV, `${x.vendor}   ${ven ? ven.name : ''}`, 'w');
    v.t(5, L, out('Invoice no.', 20));
    v.t(5, LV, x.invoice, 'w');
    v.t(5, R, out('Invoice date', 18));
    v.t(5, RV, fmtDate(x.invDate), 'w');
    v.t(6, L, out('Invoice amount', 20));
    v.t(6, LV, fmt2(x.amount), 'w');
    v.t(6, R, out('Sales tax', 18));
    v.t(6, RV, fmt2(x.tax), 'w');
    v.t(7, L, out('PO number', 20));
    v.t(7, LV, x.po || 'NON-PO', 'w');
    v.t(7, R, out('Due date', 18));
    v.t(7, RV, fmtDate(x.due), 'w');
    v.t(8, L, out('Pay hold', 20));
    v.t(8, LV, x.payHold, 'w');
    v.t(8, R, out('Date vouchered', 18));
    v.t(8, RV, fmtDate(x.vouchered), 'w');
    v.t(9, L, out('Hold reason', 20));
    v.t(9, LV, x.holdReason, 'y');
    v.t(9, R, out('Entered by', 18));
    v.t(9, RV, x.enteredBy, 'w');
    v.t(10, L, out('Paid date', 20));
    v.t(10, LV, fmtDate(x.paidDate), 'w');
    v.t(10, R, out('Payment run', 18));
    v.t(10, RV, x.paidRun, 'w');

    v.t(12, 1, 'Ln', 'w');
    v.t(12, 5, 'Item', 'w');
    v.t(12, 15, 'Description', 'w');
    v.t(12, 53, 'Qty', 'w');
    v.t(12, 57, 'Unit price', 'w');
    v.t(12, 73, 'Amount', 'w');
    const pg = pageOf(x.lines, DETAIL_ROWS, this.dpage);
    pg.rows.forEach((l, i) => {
      const r = 13 + i;
      v.t(r, 1, lpad(l.poLine ?? pg.start + i + 1, 2));
      v.t(r, 5, l.item);
      v.t(r, 15, rpad(l.desc, 30));
      v.t(r, 46, lpad(fmt2(l.qtyH), 10), 'w');
      v.t(r, 57, lpad(fmtPrice(l.priceE4), 10), 'w');
      v.t(r, 68, lpad(fmt2(l.amount), 11), 'w');
    });
    if (x.lines.length > DETAIL_ROWS) moreIndicator(v, pg, () => this.handle('PageDown'));
  }

  display(no) {
    this.shown = no;
    this.dpage = 0;
    this.mode = 'display';
  }

  key(k) {
    if (k === 'F3') return this.app.menu();
    if (this.mode === 'display') {
      if (k === 'F12') this.mode = 'list';
      else {
        const x = findVoucher(this.shown);
        roll(this, k, x ? x.lines.length : 0, DETAIL_ROWS, 'dpage');
      }
      return undefined;
    }
    if (this.hold) {
      if (k === 'F12') this.hold = null;
      else if (k === 'Enter') this.saveHold();
      return undefined;
    }
    if (k === 'F12') return this.app.menu();
    if (k === 'Enter') return this.listEnter();
    roll(this, k, this.rows().length, LIST_ROWS);
    return undefined;
  }

  listEnter() {
    const typed = this.rows().filter(x => (this.opts[x.no] || '').trim());
    if (typed.length) {
      const x = typed[0];
      const opt = this.opts[x.no].trim();
      if (opt === '5') {
        this.opts = {};
        return this.display(x.no);
      }
      if (opt === '2') {
        if (x.status === 'Paid') {
          this.msg = err(`NSF0510 Voucher ${x.no} is paid. Hold cannot be changed.`);
          this.focusReq = `opt_${x.no}`;
          return undefined;
        }
        this.opts = {};
        this.hold = { no: x.no, hold: x.payHold, reason: x.holdReason };
        return undefined;
      }
      this.msg = err(`NSF0501 Option ${opt} not valid.`);
      this.focusReq = `opt_${x.no}`;
      return undefined;
    }
    const want = this.f.vend.trim();
    if (want && !vendor(want)) {
      this.msg = err(`NSF0502 Vendor ${want} not found.`);
      this.focusReq = 'vend';
      return undefined;
    }
    this.filter = want;
    this.page = 0;
    return undefined;
  }

  saveHold() {
    const h = this.hold;
    const hold = String(h.hold || '').trim().toUpperCase();
    const reason = String(h.reason || '').trim().toUpperCase();
    if (hold && hold !== 'H') {
      this.msg = err('NSF0409 Pay hold must be blank or H.');
      this.focusReq = 'hHold';
      return;
    }
    if (hold === 'H' && !reason) {
      this.msg = err('NSF0410 Hold reason required when pay hold is H.');
      this.focusReq = 'hReason';
      return;
    }
    const x = setHold(h.no, hold, reason);
    this.hold = null;
    if (!x) {
      this.msg = err(`NSF0510 Voucher ${h.no} is paid. Hold cannot be changed.`);
      return;
    }
    this.msg = info(hold ? `NSF0515 Voucher ${x.no} held: ${x.holdReason}.` : `NSF0516 Voucher ${x.no} released from hold.`);
  }
}
