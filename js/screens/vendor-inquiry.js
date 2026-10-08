import { Screen, K, err, pageOf, moreIndicator, roll } from './screen.js';
import { vendor, searchVendors } from '../ledger.js';
import { fmtDate } from '../dates.js';
import { lead, out, rpad, maskRouting, maskAccount } from '../format.js';

const LIST_SIZE = 12;

export class VendorInquiry extends Screen {
  constructor(app) {
    super(app);
    this.f = { vno: '', vname: '' };
    this.mode = 'entry';
    this.hits = [];
    this.opts = {};
    this.page = 0;
    this.shown = null;
    this.fromList = false;
  }

  get id() { return 'APV010'; }

  get title() {
    return this.mode === 'display' ? 'Vendor Inquiry - Display' : 'Vendor Inquiry';
  }

  legend() {
    if (this.mode === 'display') return [K.F3, K.F5, K.F12];
    if (this.mode === 'list') return [K.F3, K.F5, K.F12, K.ENTER, K.PGUP, K.PGDN];
    return [K.F3, K.F12, K.ENTER];
  }

  set(name, value) {
    if (name.startsWith('opt_')) this.opts[name.slice(4)] = value;
    else super.set(name, value);
  }

  view(v) {
    if (this.mode === 'display') return this.viewDisplay(v);
    if (this.mode === 'list') return this.viewList(v);
    v.t(3, 1, 'Type vendor number or part of the vendor name, press Enter.');
    v.t(5, 3, lead('Vendor number', 26));
    v.f('vno', 'Vendor number', 5, 31, 5, this.f.vno, { upper: true });
    v.t(6, 3, lead('Vendor name', 26));
    v.f('vname', 'Vendor name', 6, 31, 30, this.f.vname, { upper: true });
    return undefined;
  }

  viewList(v) {
    v.t(3, 1, 'Type option, press Enter.');
    v.t(4, 3, '5=Display');
    v.t(6, 1, 'Opt  Vendor  Name                              City                 Terms', 'w');
    const pg = pageOf(this.hits, LIST_SIZE, this.page);
    pg.rows.forEach((h, i) => {
      const r = 7 + i;
      v.f(`opt_${h.no}`, `Opt ${h.no}`, r, 2, 1, this.opts[h.no] || '');
      v.b(r, 6, h.no, () => this.display(h.no, true), `Display vendor ${h.no}`);
      v.t(r, 14, rpad(h.name, 32));
      v.t(r, 48, rpad(`${h.city} ${h.state}`, 20));
      v.t(r, 69, `Net ${h.termsDays}`);
    });
    moreIndicator(v, pg, () => this.handle('PageDown'));
  }

  viewDisplay(v) {
    const x = vendor(this.shown);
    if (!x) return;
    const L = 2;
    const V = 25;
    const R = 46;
    const RV = 68;
    v.t(3, L, out('Vendor', 22));
    v.t(3, V, `${x.no}   ${x.name}`, 'w');
    v.t(4, L, out('Status', 22));
    v.t(4, V, x.status, 'w');
    v.t(4, R, out('Hold code', 20));
    v.t(4, RV, x.holdCode, 'w');
    v.t(5, L, out('TIN', 22));
    v.t(5, V, x.tin, 'w');
    v.t(5, R, out('W-9 on file', 20));
    v.t(5, RV, x.w9 ? `Y  ${fmtDate(x.w9)}` : 'N', 'w');
    v.t(6, L, out('Terms', 22));
    v.t(6, V, `Net ${x.termsDays}`, 'w');
    v.t(6, R, out('1099', 20));
    v.t(6, RV, x.is1099 === 'Y' && x.type1099 ? `Y  ${x.type1099}` : x.is1099, 'w');
    v.t(7, L, out('Phone on file', 22));
    v.t(7, V, x.phone, 'w');
    v.t(8, L, out('Contact', 22));
    v.t(8, V, x.contact, 'w');
    v.t(9, L, out('Address', 22));
    v.t(9, V, x.address1, 'w');
    v.t(10, V, `${x.city} ${x.state} ${x.zip}`, 'w');

    v.t(12, L, out('Remit-to name', 22));
    v.t(12, V, x.remitName, 'w');
    v.t(13, L, out('Remit-to address', 22));
    v.t(13, V, x.address1, 'w');
    v.t(14, V, `${x.city} ${x.state} ${x.zip}`, 'w');
    v.t(15, L, out('Payment method', 22));
    v.t(15, V, x.payMethod, 'w');
    v.t(16, L, out('Remit-to bank', 22));
    v.t(16, V, x.bank.name, 'w');
    v.t(17, L, out('Routing', 22));
    v.t(17, V, maskRouting(x.bank.routing4), 'w');
    v.t(18, L, out('Account', 22));
    v.t(18, V, maskAccount(x.bank.account4), 'w');
    v.t(19, L, out('Account type', 22));
    v.t(19, V, x.bank.type, 'w');
  }

  display(no, fromList) {
    this.shown = no;
    this.fromList = fromList;
    this.mode = 'display';
    this.msg = null;
  }

  key(k) {
    if (k === 'F3') return this.app.menu();
    if (this.mode === 'display') {
      if (k === 'F12') {
        this.mode = this.fromList ? 'list' : 'entry';
        this.focusReq = this.fromList ? null : 'vno';
      }
      return undefined;
    }
    if (this.mode === 'list') {
      if (k === 'F12') {
        this.mode = 'entry';
        this.focusReq = 'vname';
        return undefined;
      }
      if (roll(this, k, this.hits.length, LIST_SIZE)) return undefined;
      if (k === 'Enter') return this.listEnter();
      return undefined;
    }
    if (k === 'F12') return this.app.menu();
    if (k === 'Enter') return this.search();
    return undefined;
  }

  search() {
    const no = this.f.vno.trim();
    const name = this.f.vname.trim();
    if (no) {
      if (vendor(no)) return this.display(no, false);
      this.msg = err(`NSF0202 Vendor ${no} not found.`);
      this.focusReq = 'vno';
      return undefined;
    }
    if (!name) {
      this.msg = err('NSF0201 Type a vendor number or part of the vendor name.');
      this.focusReq = 'vno';
      return undefined;
    }
    const hits = searchVendors(name);
    if (!hits.length) {
      this.msg = err(`NSF0203 No vendors found matching ${name}.`);
      this.focusReq = 'vname';
      return undefined;
    }
    if (hits.length === 1) return this.display(hits[0].no, false);
    this.hits = hits;
    this.opts = {};
    this.page = 0;
    this.mode = 'list';
    return undefined;
  }

  listEnter() {
    const picked = this.hits.find(h => (this.opts[h.no] || '').trim());
    if (!picked) return;
    const opt = this.opts[picked.no].trim();
    if (opt !== '5') {
      this.msg = err(`NSF0204 Option ${opt} not valid.`);
      this.focusReq = `opt_${picked.no}`;
      return;
    }
    this.opts = {};
    this.display(picked.no, true);
  }
}
