// Import von Spielterminen aus iCal (.ics) und CSV
import { config } from '../config.js';

// ---------- iCal ----------
function icalDate(value, params = '') {
  const v = value.trim();
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(v)) {
    return { date: new Date(+v.slice(0, 4), +v.slice(4, 6) - 1, +v.slice(6, 8)), allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = '0', z] = m;
  // Zeiten mit TZID werden als deutsche Ortszeit (Gerätezeit) behandelt
  const date = z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : new Date(+y, +mo - 1, +d, +h, +mi, +s);
  return { date, allDay: false };
}
const unescape = (s) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

export function parseIcal(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events = []; let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur?.start) events.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';'); const value = line.slice(i + 1);
    const p = params.join(';');
    switch (name.toUpperCase()) {
      case 'UID': cur.uid = value.trim(); break;
      case 'SUMMARY': cur.summary = unescape(value).trim(); break;
      case 'LOCATION': cur.location = unescape(value).trim(); break;
      case 'DESCRIPTION': cur.description = unescape(value).trim(); break;
      case 'DTSTART': { const r = icalDate(value, p); if (r) { cur.start = r.date; cur.allDay = r.allDay; } break; }
      case 'DTEND': { const r = icalDate(value, p); if (r) cur.end = r.date; break; }
      case 'STATUS': cur.status = value.trim(); break;
      default:
    }
  }
  return events;
}

const isOurs = (s) => config.homeKeywords.some((k) => s.toLowerCase().includes(k.toLowerCase()));

// "SG Scharmede/Thüle - SV Musterdorf" -> Heim/Gast erkennen
// Spieltitel aufräumen: Klammern, Symbole, Wettbewerb davor ("Kreisliga A: …"), Ergebnis dahinter ("… 2:1")
function cleanSummary(s = '') {
  return s.replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N}\s.\-–:/&'’]/gu, ' ')
    .replace(/\s+\d+\s*:\s*\d+\s*$/, '')
    .replace(/\s+/g, ' ').trim();
}
export const isByeWeek = (s = '') => /spielfrei/i.test(s);

export function splitMatch(summary = '') {
  const clean = cleanSummary(summary);
  const parts = clean.split(/\s+(?:-|–|vs\.?|gegen)\s+|\s+:\s+/i);
  if (parts.length < 2) return null;
  const home = parts[0].replace(/^.*:\s+/, '').trim();
  const away = parts.slice(1).join(' - ').trim();
  if (isOurs(home) && !isOurs(away)) return { isAway: false, opponent: away };
  if (isOurs(away) && !isOurs(home)) return { isAway: true, opponent: home };
  return null;
}

// iCal-Ereignis -> Spiel-Datensatz (ohne IDs)
export function icalToGame(ev, team, fields) {
  const m = splitMatch(ev.summary);
  let isAway = m ? m.isAway : !(ev.location && isOurs(ev.location));
  const start = ev.start;
  const end = ev.end && !ev.allDay && ev.end > start ? ev.end : new Date(start.getTime() + 120 * 60000);
  return {
    team_id: team.id,
    kind: 'spiel',
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    is_away: isAway,
    field_id: isAway ? null : guessField(ev.location, fields) || team.home_field_id,
    opponent: m?.opponent || ev.summary || 'Unbekannt',
    venue: isAway ? ev.location || null : null,
    competition: null,
    note: ev.status === 'CANCELLED' ? 'Abgesagt laut Kalender' : null,
    source: 'ical',
    external_uid: `ical:${team.id}:${ev.uid || start.toISOString()}`,
    _unsure: !m,
  };
}

function guessField(location, fields) {
  if (!location) return null;
  const l = location.toLowerCase();
  return fields.find((f) => l.includes(f.short_name.toLowerCase()))?.id || null;
}

// ---------- CSV ----------
export function parseCsv(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const sep = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = []; let row = []; let field = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') q = false; else field += c;
    } else if (c === '"') q = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = ''; if (row.some((x) => x.trim())) rows.push(row); row = [];
    } else field += c;
  }
  row.push(field); if (row.some((x) => x.trim())) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map((h) => h.replace(/^﻿/, '').trim().toLowerCase());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}

export const CSV_TEMPLATE =
  'Datum;Uhrzeit;Mannschaft;Heim;Gast;Spielort;Wettbewerb;Dauer\n'
  + '29.11.2026;15:00;1. Herren;SG Scharmede/Thüle;SV Musterdorf;;Kreisliga A;120\n'
  + '06.12.2026;14:30;1. Herren;FC Beispielhausen;SG Scharmede/Thüle;Waldstadion Beispielhausen;Kreisliga A;120\n';

function parseGermanDate(d, t) {
  let m = d.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  let y, mo, da;
  if (m) { [, da, mo, y] = m; if (y.length === 2) y = '20' + y; }
  else { m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return null; [, y, mo, da] = m; }
  const tm = (t || '').match(/^(\d{1,2})[:.](\d{2})/);
  if (!tm) return null;
  return new Date(+y, +mo - 1, +da, +tm[1], +tm[2]);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9äöüß]/g, '');

// CSV-Zeile -> Spiel-Datensatz, oder { error }
export function csvToGame(row, teams, fallbackTeam) {
  const start = parseGermanDate(row.datum || '', row.uhrzeit || row.anstoß || row.anstoss || '');
  if (!start) return { error: `Datum/Uhrzeit nicht lesbar: "${row.datum} ${row.uhrzeit}"` };
  const tname = row.mannschaft || '';
  const team = tname ? teams.find((t) => norm(t.name) === norm(tname) || norm(t.short_name) === norm(tname)) : fallbackTeam;
  if (!team) return { error: `Mannschaft nicht gefunden: "${tname}"` };
  const heim = row.heim || ''; const gast = row.gast || '';
  let isAway;
  if (isOurs(heim) && !isOurs(gast)) isAway = false;
  else if (isOurs(gast) && !isOurs(heim)) isAway = true;
  else if ((row.art || '').toLowerCase().startsWith('a')) isAway = true;
  else isAway = false;
  const opponent = isAway ? heim : gast;
  const dur = parseInt(row.dauer, 10) || 120;
  return {
    team_id: team.id, kind: 'spiel', starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + dur * 60000).toISOString(),
    is_away: isAway, field_id: isAway ? null : team.home_field_id,
    opponent: opponent || 'Unbekannt', venue: isAway ? row.spielort || null : null,
    competition: row.wettbewerb || null, note: null, source: 'csv',
    external_uid: `csv:${team.id}:${start.toISOString()}`,
  };
}
