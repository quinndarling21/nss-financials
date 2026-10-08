import { VENDORS } from '../data/vendors.js';
import { PURCHASE_ORDERS } from '../data/purchase-orders.js';
import { VOUCHERS } from '../data/vouchers.js';
import { PAYMENT_RUNS } from '../data/payment-runs.js';
import { addDays, todayISO } from './dates.js';
import { toC, toH, toE4, extC } from './format.js';

export const STATE_VERSION = 1;

export function buildBaseline(epoch) {
  const terms = Object.fromEntries(VENDORS.map(v => [v.no, v.termsDays]));

  const pos = PURCHASE_ORDERS.map(p => ({
    no: p.no,
    vendor: p.vendor,
    buyer: p.buyer,
    shipTo: p.shipTo,
    orderDate: p.orderDate,
    status: p.status,
    blanket: p.blanket ? { ...p.blanket } : null,
    lines: p.lines.map(l => ({
      ln: l.ln, item: l.item, desc: l.desc, uom: l.uom,
      qtyH: toH(l.qty), priceE4: toE4(l.price), invH: toH(l.invoiced),
    })),
  }));

  const vouchers = VOUCHERS.map(v => ({
    no: v.no,
    vendor: v.vendor,
    invoice: v.invoice,
    invDate: v.invDate,
    amount: toC(v.amount),
    tax: toC(v.tax),
    po: v.po,
    due: addDays(v.invDate, terms[v.vendor]),
    status: v.status,
    payHold: v.status === 'Held' ? 'H' : '',
    holdReason: v.holdReason || '',
    enteredBy: v.enteredBy,
    vouchered: v.vouchered,
    paidDate: v.paidDate || '',
    paidRun: v.paidRun || '',
    lines: v.lines.map(l => {
      const qtyH = toH(l.qty);
      const priceE4 = toE4(l.price);
      return { poLine: l.poLine, item: l.item, desc: l.desc, qtyH, priceE4, amount: extC(qtyH, priceE4) };
    }),
  }));

  const runs = {};
  for (const r of PAYMENT_RUNS) runs[r.date] = { ...r, vouchers: [...r.vouchers] };

  const next = Math.max(...vouchers.map(v => Number(v.no))) + 1;

  return {
    v: STATE_VERSION,
    businessDate: todayISO(),
    epoch: epoch ?? null,
    nextVoucher: next,
    vouchers,
    pos,
    runs,
    session: null,
  };
}
