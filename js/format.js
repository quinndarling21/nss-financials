// Money is held in cents, quantities in hundredths, unit prices in ten-thousandths.

export const toC = n => Math.round(Number(n) * 100);
export const toH = n => Math.round(Number(n) * 100);
export const toE4 = n => Math.round(Number(n) * 10000);
export const extC = (qtyH, priceE4) => Math.round((qtyH * priceE4) / 10000);

// 5250 edit style: thousands separators, no leading zero, trailing minus.
export function fmt2(v) {
  const neg = v < 0;
  const a = Math.abs(Math.round(v));
  const whole = Math.floor(a / 100);
  const frac = String(a % 100).padStart(2, '0');
  return `${whole ? whole.toLocaleString('en-US') : ''}.${frac}${neg ? '-' : ''}`;
}

export function fmtPrice(e4) {
  const s = (e4 / 10000).toFixed(e4 % 100 === 0 ? 2 : 4);
  const [w, f] = s.split('.');
  return `${Number(w) ? Number(w).toLocaleString('en-US') : ''}.${f}`;
}

export function qtyInput(h) {
  return h % 100 === 0 ? String(h / 100) : (h / 100).toFixed(2);
}

export function priceInput(e4) {
  return (e4 / 10000).toFixed(e4 % 100 === 0 ? 2 : 4);
}

function parseScaled(s, places) {
  let t = String(s ?? '').trim().replace(/[$,\s]/g, '');
  if (!t) return null;
  let neg = false;
  if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); } else if (t.startsWith('-')) { neg = true; t = t.slice(1); }
  const re = new RegExp(`^(\\d+\\.?\\d{0,${places}}|\\.\\d{1,${places}})$`);
  if (!re.exec(t)) return NaN;
  const [w, f = ''] = t.split('.');
  const scale = 10 ** places;
  const v = Number(w || 0) * scale + Number((f + '0'.repeat(places)).slice(0, places));
  return neg ? -v : v;
}

// null when blank, NaN when not a number.
export const parseCents = s => parseScaled(s, 2);
export const parseQty = s => parseScaled(s, 2);
export const parsePrice = s => parseScaled(s, 4);

export function rpad(s, n) {
  s = String(s ?? '');
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

export function lpad(s, n) {
  s = String(s ?? '');
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

// IBM i prompt leaders: "Vendor . . . . ." with dots aligned on alternate columns.
export function lead(label, width) {
  let s = label;
  if (s.length < width) s += ' ';
  while (s.length < width) s += s.length % 2 === (width - 1) % 2 ? '.' : ' ';
  return s;
}

// Output prompt "Vendor . . . :" padded so the value column sits two blanks after the colon.
export function out(label, width) {
  return `${lead(label, width - 3)} :`;
}

export const maskRouting = last4 => `*****${last4}`;
export const maskAccount = last4 => `********${last4}`;
