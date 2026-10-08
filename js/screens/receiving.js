import { Screen, K, err, pageOf, moreIndicator, roll } from './screen.js';
import { contract, purchaseOrder, receiptsFor, vendor } from '../ledger.js';
import { fmtDate } from '../dates.js';
import { fmt2, lead, lpad, out, rpad, toH } from '../format.js';

const ROWS_PER_PAGE = 12;

export class ReceivingInquiry extends Screen {
  constructor(app) {
    super(app);
    this.f = { po: '' };
    this.shown = null;
    this.page = 0;
  }

  get id() { return 'APR030'; }

  get title() { return 'Receiving Inquiry'; }

  legend() {
    return [K.F3, K.F5, K.F12, K.ENTER, K.PGUP, K.PGDN];
  }

  rows() {
    const p = purchaseOrder(this.shown);
    if (!p) return [];
    const out = [];
    for (const r of receiptsFor(p.no)) {
      for (const l of r.lines) {
        const pl = p.lines.find(x => x.ln === l.ln);
        out.push({ rec: r, ln: l.ln, item: pl ? pl.item : '', qtyH: toH(l.qty) });
      }
    }
    return out.sort((a, b) => a.rec.date.localeCompare(b.rec.date) || a.rec.no.localeCompare(b.rec.no) || a.ln - b.ln);
  }

  view(v) {
    v.t(3, 2, lead('PO number', 22));
    v.f('po', 'PO number', 3, 25, 10, this.f.po, { upper: true });
    const p = this.shown && purchaseOrder(this.shown);
    if (!p) return;
    const ven = vendor(p.vendor);
    v.t(5, 2, out('Vendor', 20));
    v.t(5, 23, `${p.vendor}   ${ven ? ven.name : ''}`, 'w');
    v.t(6, 2, out('PO status', 20));
    v.t(6, 23, p.status, 'y');
    v.t(6, 46, out('Buyer', 14));
    v.t(6, 62, p.buyer, 'w');
    v.t(7, 2, out('Ship-to', 20));
    v.t(7, 23, p.shipTo, 'w');

    v.t(9, 1, 'Receiver', 'w');
    v.t(9, 11, 'Date', 'w');
    v.t(9, 21, 'Location', 'w');
    v.t(9, 40, 'Ln', 'w');
    v.t(9, 44, 'Item', 'w');
    v.t(9, 53, 'Qty received', 'w');
    v.t(9, 67, 'Received by', 'w');

    const all = this.rows();
    if (!all.length) {
      v.t(10, 1, 'No receipts on file for this PO.');
      return;
    }
    const pg = pageOf(all, ROWS_PER_PAGE - 1, this.page);
    pg.rows.forEach((x, i) => {
      const r = 10 + i;
      v.t(r, 1, x.rec.no, 'w');
      v.t(r, 11, fmtDate(x.rec.date));
      v.t(r, 21, rpad(x.rec.location, 18));
      v.t(r, 40, lpad(x.ln, 2));
      v.t(r, 44, x.item);
      v.t(r, 53, lpad(fmt2(x.qtyH), 12), 'w');
      v.t(r, 67, x.rec.by);
    });
    moreIndicator(v, pg, () => this.handle('PageDown'));
  }

  key(k) {
    if (k === 'F3') return this.app.menu();
    if (k === 'F12') {
      if (!this.shown) return this.app.menu();
      this.shown = null;
      this.f.po = '';
      return undefined;
    }
    if (k === 'Enter') return this.lookup();
    if (this.shown) roll(this, k, this.rows().length, ROWS_PER_PAGE - 1);
    return undefined;
  }

  lookup() {
    const val = this.f.po.trim().toUpperCase();
    this.f.po = val;
    this.page = 0;
    if (!val) {
      this.msg = err('NSF0301 Type a PO number.');
      this.focusReq = 'po';
      return;
    }
    if (contract(val)) {
      this.shown = null;
      this.msg = err(`NSF0310 ${val} is a contract. Receipt not required.`);
      this.focusReq = 'po';
      return;
    }
    if (!purchaseOrder(val)) {
      this.shown = null;
      this.msg = err(`NSF0302 PO ${val} not found.`);
      this.focusReq = 'po';
      return;
    }
    this.shown = val;
  }
}
