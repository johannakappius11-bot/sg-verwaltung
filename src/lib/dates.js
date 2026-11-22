// Kleine Datums-Hilfen (lokale Zeit des Geräts, Wochen beginnen am Montag)
export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const pad = (n) => String(n).padStart(2, '0');

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function startOfWeek(d) { const x = startOfDay(d); return addDays(x, -(isoWeekday(x) - 1)); }
export function isoWeekday(d) { return ((d.getDay() + 6) % 7) + 1; } // 1 = Mo … 7 = So
export function ymd(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function hm(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function combine(dateStr, timeStr) {
  const d = parseYmd(dateStr); const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m || 0, 0, 0); return d;
}
export function sameDay(a, b) { return ymd(a) === ymd(b); }
export function fmtDate(d) { return `${WEEKDAYS[isoWeekday(d) - 1]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`; }
export function fmtDateLong(d) { return `${WEEKDAYS_LONG[isoWeekday(d) - 1]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; }
export function fmtDateShort(d) { return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; }
export function timeStr(t) { return (t || '').slice(0, 5); } // "18:00:00" -> "18:00"
export function minutes(t) { const [h, m] = timeStr(t).split(':').map(Number); return h * 60 + (m || 0); }

export function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x - y0) / 86400000 + 1) / 7);
}
export function weekLabel(monday) {
  const sun = addDays(monday, 6);
  return `KW ${isoWeek(monday)} · ${pad(monday.getDate())}.${pad(monday.getMonth() + 1)}.–${pad(sun.getDate())}.${pad(sun.getMonth() + 1)}.`;
}
