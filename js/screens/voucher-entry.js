import { Screen, K, err, info, roll } from './screen.js';
import { View } from '../terminal.js';
import {
  contract, findDuplicate, matchContractLine, matchPOLine, postVoucher, purchaseOrder, vendor,
} from '../ledger.js';
import { addDays, fmtDate, parseDate } from '../dates.js';
import {
  fmt2, lead, lpad, out, parseCents, parsePrice, parseQty, priceInput, qtyInput, rpad, toE4,
} from '../format.js';

const LINE_ROWS = 7;
const FIRST_LINE_ROW = 10;
const HEADER_FIELDS = ['vendor', 'invNo', 'invDate', 'invAmt', 'tax', 'po', 'due', 'hold', 'reason'];

const blankHeader = () => ({
  vendor: '', invNo: '', invDate: '', invAmt: '', tax: '.00', po: '', due: '', hold: '', reason: '',
});

const STATUS_CLASS = { MATCH: 'w', 'NON-PO': 'w', 'QTY VAR': 'r', 'PRICE VAR': 'r', INVALID: 'r', OMIT: '' };

export class VoucherEntry extends Screen {
  constructor(app) {
    super(app);
    this.reset();
  }

  get id() { return 'APV040'; }

  get title() { return 'Voucher Entry'; }

  reset() {
    this.f = blankHeader();
    this.lines = [];
    this.linesFor = null;
    this.dueAuto = '';
    this.passed = null;
    this.dup = null;
    this.dupMsg = null;
    this.page = 0;
  }

  legend() {
    const keys = [K.F3, K.F5, K.F10P, K.F12, K.ENTER];
    if (this.lines.length > LINE_ROWS) keys.push(K.PGUP, K.PGDN);
    return keys;
  }

  set(name, value) {
    const m = name.match(/^(qty|price)(\d+)$/);
    if (m) {
      const l = this.lines[Number(m[2])];
      if (l) l[m[1]] = value;
      return;
    }
    super.set(name, value);
  }

  exit(name) {
    if (!HEADER_FIELDS.includes(name) && !/^(qty|price)\d+$/.exec(name)) return false;
    if (this.dup) return false;
    this.sync(name === 'po');
    return true;
  }

  // Normalizes entered values, fills the due date from terms and loads PO lines when asked.
  sync(loadLines) {
    const f = this.f;
    f.vendor = f.vendor.trim();
    const invDate = parseDate(f.invDate);
    if (invDate) f.invDate = fmtDate(invDate);
    const amt = parseCents(f.invAmt);
    if (Number.isFinite(amt)) f.invAmt = fmt2(amt);
    if (!f.tax.trim()) f.tax = '.00';
    const tax = parseCents(f.tax);
    if (Number.isFinite(tax)) f.tax = fmt2(tax);
    const ven = vendor(f.vendor);
    if (ven && invDate) {
      const auto = fmtDate(addDays(invDate, ven.termsDays));
      if (!f.due.trim() || f.due === this.dueAuto) f.due = auto;
      this.dueAuto = auto;
    }
    const due = parseDate(f.due);
    if (due) f.due = fmtDate(due);
    f.hold = f.hold.trim().toUpperCase();
    if (loadLines) this.loadLines();
  }

  loadLines() {
    const key = this.f.po.trim().toUpperCase();
    this.f.po = key;
    if (key === this.linesFor) return;
    this.linesFor = key;
    this.page = 0;
    if (!key) {
      this.lines = [{ kind: 'NONPO', n: 1, item: '', desc: 'NON-PO EXPENSE' }];
      return;
    }
    const c = contract(key);
    if (c) {
      this.lines = [{
        kind: 'CTR', n: 1, item: c.lineItem, desc: c.lineDescription, qty: '1', price: priceInput(toE4(c.monthly)),
      }];
      return;
    }
    const p = purchaseOrder(key);
    if (p) {
      this.lines = p.lines.map(l => ({
        kind: 'PO',
        n: l.ln,
        item: l.item,
        desc: l.desc,
        qty: qtyInput(Math.max(0, l.qtyH - l.invH)),
        price: priceInput(l.priceE4),
      }));
      return;
    }
    this.lines = [];
    this.msg = err(`NSF0414 PO ${key} not found.`);
  }

  evalLines() {
    const f = this.f;
    const c = this.linesFor ? contract(this.linesFor) : null;
    const p = this.linesFor && !c ? purchaseOrder(this.linesFor) : null;
    return this.lines.map((l, i) => {
      if (l.kind === 'NONPO') {
        const amt = parseCents(f.invAmt);
        const tax = parseCents(f.tax);
        const ext = (Number.isFinite(amt) ? amt : 0) - (Number.isFinite(tax) ? tax : 0);
        return { i, l, kind: l.kind, n: l.n, qtyH: 100, priceE4: ext * 100, ext, status: 'NON-PO' };
      }
      const qtyH = parseQty(l.qty);
      const priceE4 = parsePrice(l.price);
      if (!Number.isFinite(qtyH) || qtyH < 0) return { i, l, kind: l.kind, n: l.n, ext: 0, status: 'INVALID', bad: `qty${i}` };
      if (!Number.isFinite(priceE4) || priceE4 < 0) return { i, l, kind: l.kind, n: l.n, ext: 0, status: 'INVALID', bad: `price${i}` };
      const m = l.kind === 'CTR' ? matchContractLine(c, qtyH, priceE4) : matchPOLine(p, l.n, qtyH, priceE4);
      return { i, l, kind: l.kind, n: l.n, qtyH, priceE4, ext: m.ext, status: m.status };
    });
  }

  totals(ev) {
    const sub = ev.reduce((t, e) => t + e.ext, 0);
    const tax = parseCents(this.f.tax);
    const amt = parseCents(this.f.invAmt);
    const t = Number.isFinite(tax) ? tax : 0;
    const a = Number.isFinite(amt) ? amt : 0;
    return { sub, tax: t, total: sub + t, amt: a, diff: a - (sub + t) };
  }

  snapshot() {
    return JSON.stringify([this.f, this.linesFor, this.lines.map(l => [l.qty, l.price])]);
  }

  view(v) {
    const f = this.f;
    const ven = vendor(f.vendor);
    v.t(3, 1, lead('Vendor', 20));
    v.f('vendor', 'Vendor', 3, 23, 5, f.vendor, { upper: true });
    if (ven) {
      v.t(3, 31, ven.name, 'w');
      v.t(3, 66, `Net ${ven.termsDays}`, 'w');
    }
    v.t(4, 1, lead('Invoice no.', 20));
    v.f('invNo', 'Invoice no.', 4, 23, 16, f.invNo, { upper: true });
    v.t(4, 40, lead('Invoice date', 17));
    v.f('invDate', 'Invoice date', 4, 59, 8, f.invDate);
    v.t(5, 1, lead('Invoice amount', 20));
    v.f('invAmt', 'Invoice amount', 5, 23, 13, f.invAmt);
    v.t(5, 40, lead('Sales tax', 17));
    v.f('tax', 'Sales tax', 5, 59, 10, f.tax);
    v.t(6, 1, lead('PO number', 20));
    v.f('po', 'PO number', 6, 23, 10, f.po, { upper: true });
    v.t(6, 40, lead('Due date', 17));
    v.f('due', 'Due date', 6, 59, 8, f.due);
    v.t(7, 1, lead('Pay hold', 20));
    v.f('hold', 'Pay hold', 7, 23, 1, f.hold, { upper: true });
    v.t(7, 26, 'H=Hold');
    v.t(7, 40, lead('Hold reason', 17));
    v.f('reason', 'Hold reason', 7, 59, 20, f.reason, { upper: true });

    v.t(9, 1, 'Ln', 'w');
    v.t(9, 4, 'Item', 'w');
    v.t(9, 13, 'Description', 'w');
    v.t(9, 39, 'Qty', 'w');
    v.t(9, 49, 'Unit price', 'w');
    v.t(9, 64, 'Amount', 'w');
    v.t(9, 71, 'Status', 'w');

    const ev = this.evalLines();
    if (!this.lines.length) {
      v.t(FIRST_LINE_ROW, 4, 'Lines load from the PO or contract number. Leave PO blank for non-PO.');
    }
    const start = this.page * LINE_ROWS;
    ev.slice(start, start + LINE_ROWS).forEach((e, j) => {
      const r = FIRST_LINE_ROW + j;
      const l = e.l;
      v.t(r, 1, lpad(e.n, 2));
      v.t(r, 4, rpad(l.item, 8));
      v.t(r, 13, rpad(l.desc, 25));
      if (l.kind === 'NONPO') {
        v.t(r, 39, lpad('1', 9));
        v.t(r, 49, lpad(fmt2(e.ext), 10));
      } else {
        v.f(`qty${e.i}`, `Line ${e.n} qty`, r, 39, 9, l.qty);
        v.f(`price${e.i}`, `Line ${e.n} unit price`, r, 49, 10, l.price);
      }
      v.t(r, 60, lpad(fmt2(e.ext), 10), 'w');
      v.t(r, 71, e.status, STATUS_CLASS[e.status] || '');
    });
    if (this.lines.length > LINE_ROWS) {
      const more = start + LINE_ROWS < this.lines.length;
      if (more) v.b(17, 72, 'More...', () => this.handle('PageDown'), 'More');
      else v.t(17, 73, 'Bottom');
    }

    const t = this.totals(ev);
    v.t(18, 1, out('Lines subtotal', 20));
    v.t(18, 23, lpad(fmt2(t.sub), 13), 'w');
    v.t(19, 1, out('Sales tax', 20));
    v.t(19, 23, lpad(fmt2(t.tax), 13), 'w');
    v.t(20, 1, out('Total', 20));
    v.t(20, 23, lpad(fmt2(t.total), 13), 'w');
    v.t(18, 40, out('Invoice amount', 20));
    v.t(18, 62, lpad(fmt2(t.amt), 13), 'w');
    v.t(19, 40, out('Difference', 20));
    v.t(19, 62, lpad(fmt2(t.diff), 13), t.diff ? 'y' : 'w');

    if (this.dup) v.window = this.dupWindow(this.dup);
  }

  dupWindow(d) {
    const w = new View();
    const r = 5;
    const c = 8;
    const width = 64;
    const L = c + 3;
    const V = L + 20;
    const ven = vendor(d.vendor);
    w.t(r + 1, c + Math.floor((width - 17) / 2), 'Duplicate Invoice', 'w');
    w.t(r + 3, L, out('Voucher', 18));
    w.t(r + 3, V, d.no, 'w');
    w.t(r + 4, L, out('Vendor', 18));
    w.t(r + 4, V, `${d.vendor}  ${ven ? ven.name : ''}`, 'w');
    w.t(r + 5, L, out('Invoice', 18));
    w.t(r + 5, V, d.invoice, 'w');
    w.t(r + 6, L, out('Invoice date', 18));
    w.t(r + 6, V, fmtDate(d.invDate), 'w');
    w.t(r + 7, L, out('Amount', 18));
    w.t(r + 7, V, fmt2(d.amount), 'w');
    w.t(r + 8, L, out('Date vouchered', 18));
    w.t(r + 8, V, fmtDate(d.vouchered), 'w');
    w.t(r + 9, L, out('Status', 18));
    w.t(r + 9, V, d.status, 'w');
    w.t(r + 10, L, out('Entered by', 18));
    w.t(r + 10, V, d.enteredBy, 'w');
    w.t(r + 12, L, 'This invoice is already on file and cannot be posted.', 'y');
    w.b(r + 14, L, 'F12=Cancel', () => this.closeDup(), 'F12 Cancel');
    const close = () => this.closeDup();
    return { r, c, w: width, h: 16, view: w, onBackdrop: close, onClick: close };
  }

  closeDup() {
    this.dup = null;
    this.msg = this.dupMsg;
    this.focusReq = 'invNo';
  }

  key(k) {
    if (k === 'F3') return this.app.menu();
    if (this.dup) {
      if (k === 'F12' || k === 'Enter') return this.closeDup();
      if (k === 'F10') {
        this.validate();
        return undefined;
      }
      this.msg = this.dupMsg;
      return undefined;
    }
    if (k === 'F12') return this.app.menu();
    if (k === 'F5') {
      this.sync(false);
      return undefined;
    }
    if (k === 'Enter') {
      this.validate();
      return undefined;
    }
    if (k === 'F10') {
      if (this.passed && this.passed === this.snapshot()) return this.post();
      if (this.validate()) return this.post();
      return undefined;
    }
    roll(this, k, this.lines.length, LINE_ROWS);
    return undefined;
  }

  fail(text, field) {
    this.msg = err(text);
    this.focusReq = field || null;
    this.passed = null;
    return false;
  }

  validate() {
    this.passed = null;
    this.sync(true);
    const f = this.f;
    if (!f.vendor) return this.fail('NSF0401 Vendor number required.', 'vendor');
    if (!f.invNo.trim()) return this.fail('NSF0402 Invoice number required.', 'invNo');
    if (!f.invDate.trim()) return this.fail('NSF0403 Invoice date required.', 'invDate');
    const invDate = parseDate(f.invDate);
    if (!invDate) return this.fail('NSF0404 Invoice date not valid. Use MMDDYY.', 'invDate');
    if (!f.invAmt.trim()) return this.fail('NSF0405 Invoice amount required.', 'invAmt');
    const amt = parseCents(f.invAmt);
    if (!(amt > 0)) return this.fail('NSF0406 Invoice amount not valid.', 'invAmt');
    const tax = parseCents(f.tax);
    if (!(tax >= 0)) return this.fail('NSF0407 Sales tax not valid.', 'tax');
    const ven = vendor(f.vendor);
    if (!ven) return this.fail(`NSF0411 Vendor ${f.vendor} not found.`, 'vendor');
    if (!f.due.trim()) f.due = fmtDate(addDays(invDate, ven.termsDays));
    if (!parseDate(f.due)) return this.fail('NSF0408 Due date not valid. Use MMDDYY.', 'due');
    if (f.hold && f.hold !== 'H') return this.fail('NSF0409 Pay hold must be blank or H.', 'hold');
    if (f.hold === 'H' && !f.reason.trim()) return this.fail('NSF0410 Hold reason required when pay hold is H.', 'reason');

    const d = findDuplicate(ven.no, f.invNo.trim(), invDate, amt);
    if (d) {
      this.dup = d;
      this.dupMsg = err(`NSF0412 Duplicate invoice: already vouchered ${fmtDate(d.vouchered)} voucher ${d.no}`);
      this.msg = this.dupMsg;
      return false;
    }

    if (f.po) {
      const c = contract(f.po);
      if (c) {
        if (c.vendor !== ven.no) return this.fail(`NSF0415 Contract ${f.po} is not for vendor ${ven.no}.`, 'po');
        if (invDate < c.start || invDate > c.end) return this.fail(`NSF0417 Contract ${f.po} not in effect on ${fmtDate(invDate)}.`, 'po');
      } else {
        const p = purchaseOrder(f.po);
        if (!p) return this.fail(`NSF0414 PO ${f.po} not found.`, 'po');
        if (p.vendor !== ven.no) return this.fail(`NSF0415 PO ${f.po} is not for vendor ${ven.no}.`, 'po');
        if (p.status === 'Closed') return this.fail(`NSF0416 PO ${f.po} is closed.`, 'po');
      }
    }

    const ev = this.evalLines();
    const bad = ev.find(e => e.status === 'INVALID');
    if (bad) return this.fail(`NSF0418 Line ${bad.n} quantity or unit price not valid.`, bad.bad);
    if (!ev.some(e => e.kind === 'NONPO' || e.qtyH > 0)) return this.fail('NSF0419 No line quantities entered.', ev[0] ? `qty${ev[0].i}` : 'po');
    const variance = ev.find(e => e.status === 'QTY VAR' || e.status === 'PRICE VAR');
    if (variance) {
      const code = variance.status === 'QTY VAR' ? 'NSF0420' : 'NSF0421';
      return this.fail(`${code} Line ${variance.n} ${variance.status} - route to buyer`, `qty${variance.i}`);
    }
    const t = this.totals(ev);
    if (t.diff !== 0) return this.fail(`NSF0425 Invoice amount does not equal lines plus tax. Difference ${fmt2(t.diff)}`, 'invAmt');

    this.msg = info('NSF0400 Voucher passed edits. Press F10 to post.');
    this.focusReq = null;
    this.passed = this.snapshot();
    return true;
  }

  post() {
    const f = this.f;
    const ev = this.evalLines();
    const lines = ev
      .filter(e => e.kind === 'NONPO' || e.qtyH > 0)
      .map(e => ({
        poLine: e.kind === 'PO' ? e.n : null,
        item: e.l.item,
        desc: e.l.desc,
        qtyH: e.qtyH,
        priceE4: e.priceE4,
        amount: e.ext,
      }));
    const v = postVoucher({
      vendor: f.vendor,
      invoice: f.invNo.trim(),
      invDate: parseDate(f.invDate),
      amount: parseCents(f.invAmt),
      tax: parseCents(f.tax) || 0,
      po: f.po,
      due: parseDate(f.due),
      payHold: f.hold,
      holdReason: f.reason.trim(),
      lines,
    }, this.app.user);
    let text = `Voucher ${v.no} posted. Due ${fmtDate(v.due)}.`;
    if (v.status === 'Held') text += ` Held: ${v.holdReason}`;
    this.reset();
    this.msg = info(text);
    this.focusReq = 'vendor';
    return undefined;
  }
}
