import { VENDORS } from '../data/vendors.js';
import { CONTRACTS } from '../data/contracts.js';
import { RECEIPTS } from '../data/receipts.js';
import { USERS } from '../data/users.js';
import { db, save } from './state.js';
import { addDays, nowTime, runIdFor, toDays, todayISO } from './dates.js';
import { extC, toC, toH } from './format.js';

export const DUP_WINDOW_DAYS = 7;
export const PRICE_TOL_PCT = 0.02;
export const PRICE_TOL_MAX = 2500;

export const vendorList = () => VENDORS;
export const vendor = no => VENDORS.find(v => v.no === String(no ?? '').trim()) || null;
export const contract = no => CONTRACTS.find(c => c.no === String(no ?? '').trim().toUpperCase()) || null;
export const user = id => USERS.find(u => u.id === id) || null;
export const purchaseOrder = no => db().pos.find(p => p.no === String(no ?? '').trim()) || null;

export function searchVendors(text) {
  const q = String(text).trim().toUpperCase();
  return VENDORS.filter(v => v.name.toUpperCase().includes(q));
}

export function receiptsFor(poNo) {
  return RECEIPTS.filter(r => r.po === poNo);
}

export function receivedH(poNo, ln) {
  let t = 0;
  for (const r of RECEIPTS) {
    if (r.po !== poNo) continue;
    for (const l of r.lines) if (l.ln === ln) t += toH(l.qty);
  }
  return t;
}

export function poTotal(p) {
  return p.lines.reduce((t, l) => t + extC(l.qtyH, l.priceE4), 0);
}

export function lineTolerance(extendedC) {
  return Math.min(Math.round(extendedC * PRICE_TOL_PCT), PRICE_TOL_MAX);
}

// Status of one invoice line against the PO line and its receipts.
export function matchPOLine(p, ln, qtyH, priceE4) {
  const pl = p.lines.find(l => l.ln === ln);
  const ext = extC(qtyH, priceE4);
  if (qtyH === 0) return { status: 'OMIT', ext: 0 };
  if (qtyH > receivedH(p.no, ln) - pl.invH) return { status: 'QTY VAR', ext };
  const variance = Math.abs(Math.round((qtyH * (priceE4 - pl.priceE4)) / 10000));
  if (variance > lineTolerance(extC(pl.qtyH, pl.priceE4))) return { status: 'PRICE VAR', ext };
  return { status: 'MATCH', ext };
}

export function matchContractLine(c, qtyH, priceE4) {
  const ext = extC(qtyH, priceE4);
  if (qtyH === 0) return { status: 'OMIT', ext: 0 };
  const monthly = toC(c.monthly);
  if (Math.abs(ext - monthly) > lineTolerance(monthly)) return { status: 'PRICE VAR', ext };
  return { status: 'MATCH', ext };
}

const normInvoice = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');

// Same vendor and invoice number, or same vendor and amount with invoice dates within the window.
export function findDuplicate(vendorNo, invoice, invDate, amount) {
  const mine = db().vouchers.filter(v => v.vendor === vendorNo);
  const key = normInvoice(invoice);
  const byNumber = key && mine.find(v => normInvoice(v.invoice) === key);
  if (byNumber) return byNumber;
  const d = toDays(invDate);
  const near = mine
    .filter(v => v.amount === amount && Math.abs(toDays(v.invDate) - d) <= DUP_WINDOW_DAYS)
    .sort((a, b) => Math.abs(toDays(a.invDate) - d) - Math.abs(toDays(b.invDate) - d));
  return near[0] || null;
}

export function postVoucher(rec, userId) {
  const s = db();
  const no = String(s.nextVoucher).padStart(7, '0');
  s.nextVoucher += 1;
  const v = {
    no,
    vendor: rec.vendor,
    invoice: rec.invoice,
    invDate: rec.invDate,
    amount: rec.amount,
    tax: rec.tax,
    po: rec.po,
    due: rec.due,
    status: rec.payHold === 'H' ? 'Held' : 'Open',
    payHold: rec.payHold === 'H' ? 'H' : '',
    holdReason: rec.payHold === 'H' ? rec.holdReason : '',
    enteredBy: userId,
    vouchered: todayISO(),
    paidDate: '',
    paidRun: '',
    lines: rec.lines,
  };
  s.vouchers.push(v);
  const p = s.pos.find(x => x.no === rec.po);
  if (p) {
    for (const l of rec.lines) {
      const pl = l.poLine != null && p.lines.find(x => x.ln === l.poLine);
      if (pl) pl.invH += l.qtyH;
    }
  }
  save(s);
  return v;
}

export function setHold(no, hold, reason) {
  const s = db();
  const v = s.vouchers.find(x => x.no === no);
  if (!v || v.status === 'Paid') return null;
  v.payHold = hold === 'H' ? 'H' : '';
  v.holdReason = v.payHold ? reason : '';
  v.status = v.payHold ? 'Held' : 'Open';
  save(s);
  return v;
}

export function voucherList() {
  return [...db().vouchers].sort((a, b) => b.no.localeCompare(a.no));
}

export function findVoucher(no) {
  return db().vouchers.find(v => v.no === no) || null;
}

const byVendorName = (a, b) =>
  (vendor(a.vendor)?.name || '').localeCompare(vendor(b.vendor)?.name || '') || a.no.localeCompare(b.no);

export function proposal() {
  const s = db();
  const today = todayISO();
  const id = runIdFor(today);
  const nextPay = addDays(today, 7);
  const held = s.vouchers.filter(v => v.status === 'Held').sort((a, b) => a.no.localeCompare(b.no));
  const rec = s.runs[today] || null;
  let vouchers;
  if (rec) {
    vouchers = rec.vouchers.map(no => s.vouchers.find(v => v.no === no)).filter(Boolean).sort(byVendorName);
  } else {
    vouchers = s.vouchers
      .filter(v => v.status === 'Open' && v.payHold !== 'H' && v.due <= nextPay)
      .sort(byVendorName);
  }
  const total = vouchers.reduce((t, v) => t + v.amount, 0);
  return { id, today, nextPay, status: rec ? rec.status : 'PROPOSED', rec, vouchers, held, total };
}

export function releaseRun(userId) {
  const p = proposal();
  if (p.rec || !p.vouchers.length) return null;
  const s = db();
  for (const v of p.vouchers) {
    v.status = 'Paid';
    v.paidDate = p.today;
    v.paidRun = p.id;
  }
  s.runs[p.today] = {
    id: p.id,
    date: p.today,
    method: 'ACH',
    status: 'RELEASED',
    releasedAt: nowTime(),
    releasedBy: userId,
    vouchers: p.vouchers.map(v => v.no),
  };
  save(s);
  return proposal();
}
