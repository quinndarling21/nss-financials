import { Screen, K, err } from './screen.js';
import { vendor } from '../ledger.js';
import { fmtDate } from '../dates.js';
import { lead, out, maskAccount, maskRouting } from '../format.js';

export class BankReview extends Screen {
  constructor(app) {
    super(app);
    this.f = { vno: '' };
    this.shown = null;
  }

  get id() { return 'APV070'; }

  get title() { return 'Vendor Bank Detail Review'; }

  legend() {
    return [K.F3, K.F5, K.F12, K.ENTER];
  }

  view(v) {
    v.t(3, 2, lead('Vendor number', 24));
    v.f('vno', 'Vendor number', 3, 27, 5, this.f.vno, { upper: true });
    v.t(20, 1, 'Bank changes require Vendor Master maintenance (VMS) with dual approval.', 'w');
    const x = this.shown && vendor(this.shown);
    if (!x) return;
    const b = x.bank;
    v.t(5, 2, out('Vendor', 23));
    v.t(5, 26, `${x.no}   ${x.name}`, 'w');
    v.t(6, 2, out('Payment method', 23));
    v.t(6, 26, x.payMethod, 'w');
    v.t(6, 44, out('Phone on file', 18));
    v.t(6, 64, x.phone, 'w');

    v.t(8, 2, 'Bank details on file', 'w');
    v.t(9, 4, out('Bank name', 21));
    v.t(9, 26, b.name, 'w');
    v.t(10, 4, out('Routing', 21));
    v.t(10, 26, maskRouting(b.routing4), 'w');
    v.t(11, 4, out('Account', 21));
    v.t(11, 26, maskAccount(b.account4), 'w');
    v.t(12, 4, out('Account type', 21));
    v.t(12, 26, b.type, 'w');
    v.t(13, 4, out('Effective date', 21));
    v.t(13, 26, fmtDate(b.effective), 'w');
    v.t(14, 4, out('Last changed', 21));
    v.t(14, 26, `${fmtDate(b.changed)}   by ${b.changedBy}`, 'w');
    v.t(15, 4, out('Verified call-back', 21));
    v.t(15, 26, `${fmtDate(b.verified)}   by ${b.verifiedBy}`, 'w');

    v.t(17, 2, 'Pending change requests', 'w');
    v.t(18, 4, 'None pending', 'y');
  }

  key(k) {
    if (k === 'F3') return this.app.menu();
    if (k === 'F12') {
      if (!this.shown) return this.app.menu();
      this.shown = null;
      this.f.vno = '';
      return undefined;
    }
    if (k === 'Enter') return this.lookup();
    return undefined;
  }

  lookup() {
    const no = this.f.vno.trim();
    if (!no) {
      this.msg = err('NSF0701 Type a vendor number.');
      this.focusReq = 'vno';
      return;
    }
    if (!vendor(no)) {
      this.shown = null;
      this.msg = err(`NSF0702 Vendor ${no} not found.`);
      this.focusReq = 'vno';
      return;
    }
    this.shown = no;
  }
}
