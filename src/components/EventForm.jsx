// Formular für Trainings, Spiele und sonstige Termine – einmalig oder wöchentlich
import { useState } from 'react';
import { api } from '../data/api.js';
import { useApp } from '../store.jsx';
import { combine, fmtDate, hm, isoWeekday, timeStr, WEEKDAYS, WEEKDAYS_LONG, ymd } from '../lib/dates.js';

// Mehrfache Kollisionen mit derselben Serie zusammenfassen
function groupConflicts(list) {
  const map = new Map();
  for (const { other: o } of list) {
    const key = o.seriesId || o.key;
    if (map.has(key)) map.get(key).count++;
    else map.set(key, { key, series: !!o.seriesId, start: o.start, end: o.end, teamId: o.teamId, count: 1 });
  }
  return [...map.values()];
}
import { buildOccurrences, candidatesFromSeries, findConflicts } from '../lib/schedule.js';
import { ErrorBox, Field, Icon, Sheet } from './ui.jsx';

// initial: { series } | { event } | { defaults }
export default function EventForm({ initial = {}, onClose, onSaved }) {
  const { data, editableTeams, teamById, fieldById, reloadData, toast } = useApp();
  const s = initial.series; const ev = initial.event; const d = initial.defaults || {};
  const isNew = !s && !ev;
  const firstTeam = d.team_id || editableTeams[0]?.id || '';
  const [f, setF] = useState(() => {
    if (s) return { team_id: s.team_id, kind: s.kind, date: s.valid_from, start: timeStr(s.start_time), end: timeStr(s.end_time), field_id: s.field_id || '', repeat: true, until: s.valid_until || '', note: s.note || '', is_away: false };
    if (ev) { const a = new Date(ev.starts_at); const b = new Date(ev.ends_at);
      return { team_id: ev.team_id, kind: ev.kind, date: ymd(a), start: hm(a), end: hm(b), field_id: ev.field_id || '', is_away: ev.is_away, opponent: ev.opponent || '', venue: ev.venue || '', competition: ev.competition || '', title: ev.title || '', note: ev.note || '', repeat: false }; }
    return { team_id: firstTeam, kind: d.kind || 'training', date: d.date || ymd(new Date()), start: d.start || '18:00', end: d.end || '19:30',
      field_id: d.field_id || teamById[firstTeam]?.home_field_id || data.fields[0]?.id || '', is_away: false, opponent: '', venue: '', competition: '', title: '', note: '', repeat: d.kind !== 'spiel', until: '' };
  });
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setF((x) => {
      const n = { ...x, [k]: v };
      if (k === 'team_id' && !x.is_away) n.field_id = teamById[v]?.home_field_id || x.field_id;
      if (k === 'kind' && v === 'spiel') n.repeat = false;
      if (k === 'kind' && v !== 'spiel') n.is_away = false;
      return n;
    });
    setConflicts(null);
  };

  const asSeries = f.repeat && f.kind !== 'spiel';
  const weekdayName = f.date ? WEEKDAYS_LONG[isoWeekday(new Date(f.date + 'T12:00')) - 1] : '';

  async function save(force = false) {
    setError('');
    if (!f.team_id) return setError('Bitte eine Mannschaft wählen.');
    if (!f.date || !f.start || !f.end) return setError('Bitte Datum und Uhrzeiten angeben.');
    if (f.end <= f.start) return setError('Das Ende muss nach dem Beginn liegen.');
    if (!f.is_away && !f.field_id) return setError('Bitte einen Platz wählen.');
    if (asSeries && f.until && f.until < f.date) return setError('„Wiederholen bis" liegt vor dem ersten Termin.');
    setBusy(true);
    try {
      let row; let from; let to; let candidates; let ignore;
      if (asSeries) {
        row = { team_id: f.team_id, field_id: f.field_id, kind: f.kind, weekday: isoWeekday(new Date(f.date + 'T12:00')), start_time: f.start, end_time: f.end, valid_from: f.date, valid_until: f.until || null, note: f.note || null };
        ({ from, to, items: candidates } = candidatesFromSeries({ ...row, id: s?.id }));
        ignore = s ? `s:${s.id}:` : null;
      } else {
        const a = combine(f.date, f.start); const b = combine(f.date, f.end);
        row = { team_id: f.team_id, kind: f.kind, starts_at: a.toISOString(), ends_at: b.toISOString(), is_away: f.is_away, field_id: f.is_away ? null : f.field_id,
          opponent: f.kind === 'spiel' ? f.opponent || null : null, venue: f.is_away ? f.venue || null : null, competition: f.kind === 'spiel' ? f.competition || null : null,
          title: f.title || null, note: f.note || null };
        from = new Date(a); from.setHours(0, 0, 0, 0); to = new Date(from); to.setDate(to.getDate() + 1);
        candidates = [{ key: 'neu', fieldId: row.field_id, isAway: row.is_away, start: a, end: b }];
        ignore = ev ? `e:${ev.id}` : null;
      }
      if (!force && !row.is_away) {
        const events = await api.list('events', { lt: { starts_at: to.toISOString() }, gte: { ends_at: from.toISOString() } });
        const existing = buildOccurrences({ series: data.series, exceptions: data.exceptions, events, from, to });
        const found = findConflicts(candidates, existing, ignore);
        if (found.length) { setConflicts(found); setBusy(false); return; }
      }
      if (s && asSeries) await api.update('series', s.id, row);
      else if (s) { await api.remove('series', s.id); await api.insert('events', row); }
      else if (ev) await api.update('events', ev.id, row);
      else await api.insert(asSeries ? 'series' : 'events', row);
      await reloadData();
      toast('Gespeichert');
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  const title = isNew ? 'Neuer Termin' : s ? 'Wöchentlichen Termin bearbeiten' : 'Termin bearbeiten';
  return (
    <Sheet title={title} onClose={onClose} footer={<>
      <ErrorBox error={error} />
      {conflicts && (
        <div className="alert alert-warn small" role="alert">
          <strong><Icon name="warn" size={16} /> Doppelbelegung!</strong> Platz ist schon belegt:
          <ul>
            {groupConflicts(conflicts).slice(0, 4).map((g) => (
              <li key={g.key}>{g.series ? `jeden ${WEEKDAYS[isoWeekday(g.start) - 1]}` : fmtDate(g.start)} {hm(g.start)}–{hm(g.end)} · {teamById[g.teamId]?.name || 'Termin'}{g.count > 1 ? ` (${g.count}×)` : ''}</li>
            ))}
            {groupConflicts(conflicts).length > 4 && <li>… und weitere</li>}
          </ul>
        </div>
      )}
      {conflicts ? (
        <div className="row gap">
          <button className="btn" onClick={() => setConflicts(null)}>Ändern</button>
          <button className="btn btn-warn grow" disabled={busy} onClick={() => save(true)}>Trotzdem speichern</button>
        </div>
      ) : <button className="btn btn-primary btn-block" disabled={busy} onClick={() => save(false)}>{busy ? 'Speichert …' : 'Speichern'}</button>}
    </>}>
      <div className="form">
        <Field label="Mannschaft">
          <select value={f.team_id} onChange={set('team_id')}>
            {editableTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Art">
          <div className="seg">
            {[['training', 'Training'], ...(s ? [] : [['spiel', 'Spiel']]), ['sonstiges', 'Sonstiges']].map(([k, l]) => (
              <button type="button" key={k} className={f.kind === k ? 'on' : ''} onClick={() => set('kind')({ target: { value: k } })}>{l}</button>
            ))}
          </div>
        </Field>
        {f.kind === 'spiel' && (
          <>
            <div className="seg">
              <button type="button" className={!f.is_away ? 'on' : ''} onClick={() => setF((x) => ({ ...x, is_away: false, field_id: x.field_id || teamById[x.team_id]?.home_field_id || '' }))}>Heimspiel</button>
              <button type="button" className={f.is_away ? 'on' : ''} onClick={() => setF((x) => ({ ...x, is_away: true }))}>Auswärtsspiel</button>
            </div>
            <Field label="Gegner"><input value={f.opponent} onChange={set('opponent')} placeholder="z. B. SV Musterdorf" /></Field>
            <Field label="Wettbewerb (optional)"><input value={f.competition} onChange={set('competition')} placeholder="z. B. Kreisliga A, Pokal" /></Field>
          </>
        )}
        {f.kind === 'sonstiges' && <Field label="Bezeichnung"><input value={f.title} onChange={set('title')} placeholder="z. B. Turnier, Platzpflege" /></Field>}
        <Field label={asSeries ? 'Erster Termin' : 'Datum'}><input type="date" value={f.date} onChange={set('date')} /></Field>
        <div className="row gap">
          <Field label="Von"><input type="time" value={f.start} onChange={set('start')} step="300" /></Field>
          <Field label="Bis"><input type="time" value={f.end} onChange={set('end')} step="300" /></Field>
        </div>
        {f.is_away ? (
          <Field label="Spielort (Adresse)"><input value={f.venue} onChange={set('venue')} placeholder="Sportplatz, Straße, Ort" /></Field>
        ) : (
          <Field label="Platz">
            <div className="seg">
              {data.fields.map((fl) => <button type="button" key={fl.id} className={f.field_id === fl.id ? 'on' : ''} onClick={() => set('field_id')({ target: { value: fl.id } })}>{fl.short_name}</button>)}
            </div>
          </Field>
        )}
        {f.kind !== 'spiel' && isNew && (
          <label className="check">
            <input type="checkbox" checked={f.repeat} onChange={set('repeat')} />
            <span>Jede Woche wiederholen{f.repeat && weekdayName ? ` (jeden ${weekdayName})` : ''}</span>
          </label>
        )}
        {asSeries && <Field label="Wiederholen bis (optional)" hint="Leer lassen = bis auf Weiteres"><input type="date" value={f.until} onChange={set('until')} /></Field>}
        <Field label="Notiz (optional)"><textarea rows={2} value={f.note} onChange={set('note')} /></Field>
      </div>
    </Sheet>
  );
}
