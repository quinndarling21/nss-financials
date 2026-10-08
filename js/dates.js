const TZ = 'America/Los_Angeles';

const dateParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function parts(fmt, d) {
  const o = {};
  for (const p of fmt.formatToParts(d)) o[p.type] = p.value;
  return o;
}

export function todayISO(now = new Date()) {
  const p = parts(dateParts, now);
  return `${p.year}-${p.month}-${p.day}`;
}

export function nowTime(now = new Date()) {
  const p = parts(timeParts, now);
  const h = p.hour === '24' ? '00' : p.hour;
  return `${h}:${p.minute}:${p.second}`;
}

export function toDays(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function fromDays(n) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}

export function addDays(iso, n) {
  return fromDays(toDays(iso) + n);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

export function runIdFor(iso) {
  const [, m, d] = iso.split('-');
  return `${m}${d}-A`;
}

// Accepts MMDDYY, MMDDYYYY, M/D/YY, MM/DD/YYYY (slash, dash or dot separators).
export function parseDate(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{2})(\d{2})(\d{2}|\d{4})$/) || s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (!m) return null;
  const mo = Number(m[1]);
  const d = Number(m[2]);
  let y = Number(m[3]);
  if (m[3].length === 2) y += 2000;
  if (mo < 1 || mo > 12 || d < 1) return null;
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > dim) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
