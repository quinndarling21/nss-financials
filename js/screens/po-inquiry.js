import { Screen, K, err, pageOf, moreIndicator, roll } from './screen.js';
import { contract, purchaseOrder, receivedH, poTotal, vendor } from '../ledger.js';
import { fmtDate } from '../dates.js';
import { extC, fmt2, fmtPrice, lead, lpad, out, rpad, toC } from '../format.js';

const LINES_PER_PAGE = 4;

export class POInquiry extends Screen {
  constructor(app) {
    super(app);
    this.f = { po: '' };
    this.shown = null;
    this.page = 0;
  }

  get id() { return 'APP020'; }

  get title() { return 'Purchase Order Inquiry'; }

  legend() {
    return [K.F3, K.F5, K.F12, K.ENTER, K.PGUP, K.PGDN];
  }

  view(v) {
    v.t(3, 2, lead('PO number', 22));
    v.f('po', 'PO number', 3, 25, 10, this.f.po, { upper: true });
    v.t(3, 37, 'PO or contract number');
    if (!this.shown) return;
    if (this.shown.type === 'CTR') this.viewContract(v, contract(this.shown.no));
    else this.viewPO(v, purchaseOrder(this.shown.no));
  }

  viewPO(v, p) {
    if (!p) return;
    const ven = vendor(p.vendor);
    v.t(5, 2, out('Vendor', 20));
    v.t(5, 23, `${p.vendor}   ${ven ? ven.name : ''}`, 'w');
    v.t(6, 2, out('Buyer', 20));
    v.t(6, 23, p.buyer, 'w');
    v.t(6, 46, out('Order date', 18));
    v.t(6, 66, fmtDate(p.orderDate), 'w');
    v.t(7, 2, out('Ship-to', 20));
    v.t(7, 23, p.shipTo, 'w');
    v.t(7, 46, out('Status', 18));
    v.t(7, 66, p.status, 'y');
    v.t(8, 2, out(p.blanket ? 'Blanket amount' : 'PO total', 20));
    v.t(8, 23, fmt2(poTotal(p)), 'w');
    if (p.blanket) {
      v.t(9, 2, out('Blanket period', 20));
      v.t(9, 23, `${fmtDate(p.blanket.start)} to ${fmtDate(p.blanket.end)}`, 'w');
    }

    v.t(10, 1, 'Ln', 'w');
    v.t(10, 5, 'Item', 'w');
    v.t(10, 15, 'Description', 'w');
    v.t(10, 47, 'UOM', 'w');
    v.t(10, 52, 'Unit price', 'w');
    v.t(10, 69, 'Extended', 'w');
    v.t(11, 15, 'Qty ordered', 'w');
    v.t(11, 30, 'Qty received', 'w');
    v.t(11, 46, 'Qty invoiced', 'w');

    const pg = pageOf(p.lines, LINES_PER_PAGE, this.page);
    pg.rows.forEach((l, i) => {
      const r = 12 + i * 2;
      v.t(r, 1, lpad(l.ln, 2));
      v.t(r, 5, l.item);
      v.t(r, 15, rpad(l.desc, 30));
      v.t(r, 47, l.uom);
      v.t(r, 52, lpad(fmtPrice(l.priceE4), 10));
      v.t(r, 64, lpad(fmt2(extC(l.qtyH, l.priceE4)), 13), 'w');
      v.t(r + 1, 14, lpad(fmt2(l.qtyH), 12), 'w');
      v.t(r + 1, 28, lpad(fmt2(receivedH(p.no, l.ln)), 14), 'w');
      v.t(r + 1, 44, lpad(fmt2(l.invH), 14), 'w');
    });
    moreIndicator(v, pg, () => this.handle('PageDown'));
  }

  viewContract(v, c) {
    if (!c) return;
    const ven = vendor(c.vendor);
    v.t(5, 2, out('Contract', 20));
    v.t(5, 23, c.no, 'w');
    v.t(5, 46, out('Status', 18));
    v.t(5, 66, c.status, 'y');
    v.t(6, 2, out('Vendor', 20));
    v.t(6, 23, `${c.vendor}   ${ven ? ven.name : ''}`, 'w');
    v.t(7, 2, out('Description', 20));
    v.t(7, 23, c.description, 'w');
    v.t(8, 2, out('Monthly amount', 20));
    v.t(8, 23, fmt2(toC(c.monthly)), 'w');
    v.t(9, 2, out('Term', 20));
    v.t(9, 23, `${fmtDate(c.start)} to ${fmtDate(c.end)}`, 'w');
    v.t(10, 2, out('Location', 20));
    v.t(10, 23, c.location, 'w');
    v.t(11, 2, out('Receiving', 20));
    v.t(11, 23, c.receiptRequired ? 'Receipt required' : 'Receipt not required', 'y');
    v.t(12, 2, out('Contract owner', 20));
    v.t(12, 23, c.owner, 'w');
    v.t(14, 2, 'Vouchers against this contract match to the monthly amount.');
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
    if (this.shown && this.shown.type === 'PO') {
      const p = purchaseOrder(this.shown.no);
      roll(this, k, p ? p.lines.length : 0, LINES_PER_PAGE);
    }
    return undefined;
  }

  lookup() {
    const val = this.f.po.trim().toUpperCase();
    this.f.po = val;
    if (!val) {
      this.msg = err('NSF0301 Type a PO or contract number.');
      this.focusReq = 'po';
      return;
    }
    this.page = 0;
    if (contract(val)) {
      this.shown = { type: 'CTR', no: val };
      return;
    }
    if (purchaseOrder(val)) {
      this.shown = { type: 'PO', no: val };
      return;
    }
    this.shown = null;
    this.msg = err(`NSF0302 PO ${val} not found.`);
    this.focusReq = 'po';
  }
}
