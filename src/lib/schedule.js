// Termin-Logik: Serien ausrollen, Doppelbelegungen finden, Blöcke anordnen
import { addDays, combine, isoWeekday, parseYmd, startOfDay, timeStr, ymd } from './dates.js';

export const KIND_LABEL = { training: 'Training', spiel: 'Spiel', sonstiges: 'Sonstiges' };

// Liefert alle Termine (Einzeltermine + Serien-Vorkommen) im Zeitraum [from, to)
export function buildOccurrences({ series = [], exceptions = [], events = [], from, to }) {
  const out = [];
  const exc = new Map(exceptions.map((e) => [`${e.series_id}|${e.date}`, e]));
  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
    const wd = isoWeekday(day); const ds = ymd(day);
    for (const s of series) {
      if (s.weekday !== wd) continue;
      if (ds < s.valid_from || (s.valid_until && ds > s.valid_until)) continue;
      const ex = exc.get(`${s.id}|${ds}`);
      out.push({
        key: `s:${s.id}:${ds}`, type: 'series', seriesId: s.id, date: ds,
        teamId: s.team_id, fieldId: s.field_id, kind: s.kind, note: s.note,
        start: combine(ds, timeStr(s.start_time)), end: combine(ds, timeStr(s.end_time)),
        isAway: false, cancelled: !!ex, cancelReason: ex?.reason, exceptionId: ex?.id,
      });
    }
  }
  for (const e of events) {
    const start = new Date(e.starts_at); const end = new Date(e.ends_at);
    if (end <= from || start >= to) continue;
    out.push({
      key: `e:${e.id}`, type: 'event', eventId: e.id, event: e,
      teamId: e.team_id, fieldId: e.is_away ? null : e.field_id, kind: e.kind, title: e.title,
      note: e.note, start, end, isAway: !!e.is_away, opponent: e.opponent, venue: e.venue,
      competition: e.competition, source: e.source, cancelled: false,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

const overlaps = (a, b) => a.fieldId && a.fieldId === b.fieldId && !a.isAway && !b.isAway
  && !a.cancelled && !b.cancelled && a.start < b.end && b.start < a.end;

// Menge aller Schlüssel, die mit einem anderen Termin auf demselben Platz kollidieren
export function conflictKeys(items) {
  const keys = new Set();
  const sorted = items.filter((i) => i.fieldId && !i.isAway && !i.cancelled).sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && sorted[j].start < sorted[i].end; j++) {
      if (overlaps(sorted[i], sorted[j])) { keys.add(sorted[i].key); keys.add(sorted[j].key); }
    }
  }
  return keys;
}

// Kandidat(en) gegen bestehende Termine prüfen. ignore = Schlüsselpräfix des bearbeiteten Termins
export function findConflicts(candidates, existing, ignorePrefix) {
  const res = [];
  for (const c of candidates) {
    for (const e of existing) {
      if (ignorePrefix && e.key.startsWith(ignorePrefix)) continue;
      if (overlaps(c, e)) res.push({ candidate: c, other: e });
    }
  }
  return res;
}

// Kandidaten aus einem Formular (Einzeltermin oder Serie) erzeugen
export function candidatesFromSeries(s, horizonWeeks = 26) {
  const from = parseYmd(s.valid_from);
  let to = addDays(from, horizonWeeks * 7);
  if (s.valid_until) { const u = addDays(parseYmd(s.valid_until), 1); if (u < to) to = u; }
  return { from, to, items: buildOccurrences({ series: [{ ...s, id: s.id || 'neu' }], from, to }) };
}

// Überlappende Blöcke eines Tages nebeneinander anordnen
export function layoutLanes(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const result = []; let cluster = []; let clusterEnd = null;
  const flush = () => {
    const lanes = [];
    for (const it of cluster) {
      let lane = lanes.findIndex((end) => end <= it.start);
      if (lane === -1) { lane = lanes.length; lanes.push(it.end); } else lanes[lane] = it.end;
      result.push({ item: it, lane });
    }
    const n = lanes.length;
    for (const r of result.slice(result.length - cluster.length)) r.lanes = n;
    cluster = []; clusterEnd = null;
  };
  for (const it of sorted) {
    if (clusterEnd && it.start >= clusterEnd) flush();
    cluster.push(it); clusterEnd = clusterEnd && clusterEnd > it.end ? clusterEnd : it.end;
  }
  if (cluster.length) flush();
  return result;
}
