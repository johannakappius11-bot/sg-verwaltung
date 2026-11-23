// Spiele: manuell eintragen, aus Datei importieren (iCal/CSV), Kalender-Abos abgleichen
import { useState } from 'react';
import { api, isDemo } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { addDays, fmtDate, hm, startOfDay } from '../../lib/dates.js';
import { buildOccurrences, findConflicts } from '../../lib/schedule.js';
import { CSV_TEMPLATE, csvToGame, icalToGame, isByeWeek, parseCsv, parseIcal } from '../../lib/importers.js';
import { ErrorBox, Field, Icon } from '../../components/ui.jsx';
import EventForm from '../../components/EventForm.jsx';

export default function GamesTab() {
  const { data, editableTeams, teamById, fieldById, isAdmin, toast, fieldLabel, siteById } = useApp();
  const [form, setForm] = useState(null);
  const [teamId, setTeamId] = useState(editableTeams[0]?.id || '');
  const [preview, setPreview] = useState(null); // { rows, errors }
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setError(''); setPreview(null);
    const text = await file.text();
    const team = teamById[teamId];
    let rows = []; const errors = [];
    try {
      if (/BEGIN:VCALENDAR/.test(text)) {
        if (!team) return setError('Bitte zuerst die Mannschaft wählen, zu der der Kalender gehört.');
        const from = startOfDay(addDays(new Date(), -1));
        rows = parseIcal(text).filter((ev) => ev.start >= from && !isByeWeek(ev.summary)).map((ev) => icalToGame(ev, team, data.fields.map((f) => ({ id: f.id, short_name: siteById[f.site_id]?.short_name || f.short_name }))));
      } else {
        parseCsv(text).forEach((r, i) => {
          const g = csvToGame(r, editableTeams, team);
          if (g.error) errors.push(`Zeile ${i + 2}: ${g.error}`); else rows.push(g);
        });
      }
    } catch (err) { return setError('Die Datei konnte nicht gelesen werden: ' + err.message); }
    rows = rows.filter((r) => editableTeams.some((t) => t.id === r.team_id));
    if (!rows.length && !errors.length) return setError('In der Datei wurden keine (zukünftigen) Spiele gefunden.');
    await markConflicts(rows);
    setPreview({ rows: rows.map((r) => ({ ...r, _use: true })), errors });
  }

  async function markConflicts(rows) {
    if (!rows.length) return;
    const starts = rows.map((r) => new Date(r.starts_at));
    const from = startOfDay(new Date(Math.min(...starts))); const to = addDays(startOfDay(new Date(Math.max(...starts))), 1);
    const events = await api.list('events', { lt: { starts_at: to.toISOString() }, gte: { ends_at: from.toISOString() } });
    const existing = buildOccurrences({ series: data.series, exceptions: data.exceptions, events, from, to })
      .filter((o) => !(o.event && rows.some((r) => r.external_uid === o.event.external_uid)));
    for (const r of rows) {
      const c = findConflicts([{ key: 'x', fieldId: r.field_id, isAway: r.is_away, start: new Date(r.starts_at), end: new Date(r.ends_at) }], existing);
      r._conflict = c.map((x) => `${teamById[x.other.teamId]?.short_name} ${hm(x.other.start)}–${hm(x.other.end)}`).join(', ');
    }
  }

  const update = (i, patch) => setPreview((p) => ({ ...p, rows: p.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  async function doImport() {
    const rows = preview.rows.filter((r) => r._use).map(({ _use, _conflict, _unsure, ...r }) => r);
    if (!rows.length) return;
    setBusy(true);
    try { await api.upsertMany('events', rows, 'external_uid'); toast(`${rows.length} Spiele übernommen`); setPreview(null); }
    catch (e) { setError(e.message); }
    setBusy(false);
  }

  function downloadTemplate() {
    const blob = new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'spiele-vorlage.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  async function sync() {
    setSyncMsg('Gleicht ab …');
    try { const r = await api.syncIcal(); setSyncMsg(r?.message || 'Abgleich abgeschlossen.'); }
    catch (e) { setSyncMsg(e.message); }
  }

  return (
    <div>
      <div className="alert alert-info small">
        <strong>So kommen Spiele in den Plan:</strong> fussball.de bietet keine offizielle Schnittstelle, über die Spiele
        automatisch in andere Apps übernommen werden dürfen. Darum gibt es drei Wege:
        <ol>
          <li><strong>Manuell eintragen</strong> (schnell für einzelne Spiele, Verlegungen, Freundschaftsspiele).</li>
          <li><strong>Datei importieren:</strong> Kalenderdatei (.ics) oder Tabelle (.csv) – z. B. aus einem Export eures DFBnet-Zugangs oder selbst gepflegt mit der Vorlage.</li>
          <li><strong>Kalender-Abo</strong> (nur Admin): Wenn ihr für eine Mannschaft eine iCal-Adresse habt, wird sie automatisch abgeglichen.</li>
        </ol>
        Zusätzlich kann auf jeder Mannschaftsseite das offizielle fussball.de-Widget angezeigt werden.
      </div>

      <button className="btn btn-primary btn-block" onClick={() => setForm({ defaults: { kind: 'spiel', team_id: teamId } })}><Icon name="plus" /> Spiel manuell eintragen</button>

      <h2>Datei importieren</h2>
      <div className="form">
        <Field label="Mannschaft (für Kalenderdateien bzw. CSV ohne Spalte „Mannschaft“)">
          <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {editableTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <label className="btn btn-block">
          <Icon name="download" /> Datei wählen (.ics oder .csv)
          <input type="file" accept=".ics,.csv,.txt,text/calendar,text/csv" hidden onChange={onFile} />
        </label>
        <button className="link-btn" onClick={downloadTemplate}>CSV-Vorlage herunterladen</button>
        <ErrorBox error={error} />
      </div>

      {preview && (
        <div className="card">
          <h3>Vorschau – bitte prüfen</h3>
          {preview.errors.length > 0 && <div className="alert alert-warn small">{preview.errors.map((e, i) => <div key={i}>{e}</div>)}</div>}
          <ul className="list">
            {preview.rows.map((r, i) => (
              <li key={r.external_uid + i} className={`list-item import-row ${r._use ? '' : 'dim'}`}>
                <input type="checkbox" checked={r._use} onChange={(e) => update(i, { _use: e.target.checked })} aria-label="Übernehmen" />
                <div className="grow">
                  <div className="list-title">{fmtDate(new Date(r.starts_at))} {hm(new Date(r.starts_at))} · {teamById[r.team_id]?.short_name}</div>
                  <div className="small">{r.is_away ? 'bei' : 'gegen'} {r.opponent}{r.is_away && r.venue ? ` · ${r.venue}` : ''}</div>
                  <div className="seg seg-sm">
                    <button className={!r.is_away ? 'on' : ''} onClick={() => update(i, { is_away: false, field_id: r.field_id || teamById[r.team_id]?.home_field_id })}>Heim</button>
                    <button className={r.is_away ? 'on' : ''} onClick={() => update(i, { is_away: true, field_id: null })}>Auswärts</button>
                    {!r.is_away && data.fields.map((f) => <button key={f.id} className={r.field_id === f.id ? 'on' : ''} onClick={() => update(i, { field_id: f.id })}>{fieldLabel(f.id)}</button>)}
                  </div>
                  {r._unsure && <div className="warn-text small">Heim/Auswärts unsicher erkannt – bitte prüfen.</div>}
                  {r._conflict && !r.is_away && <div className="warn-text small"><Icon name="warn" size={14} /> Doppelbelegung mit {r._conflict} ({fieldLabel(r.field_id)})</div>}
                </div>
              </li>
            ))}
          </ul>
          <div className="row gap">
            <button className="btn" onClick={() => setPreview(null)}>Abbrechen</button>
            <button className="btn btn-primary grow" disabled={busy} onClick={doImport}>{preview.rows.filter((r) => r._use).length} Spiele übernehmen</button>
          </div>
          <p className="muted small">Bereits importierte Spiele werden aktualisiert, nicht doppelt angelegt.</p>
        </div>
      )}

      {isAdmin && (
        <>
          <h2>Kalender-Abos (automatisch)</h2>
          <p className="small">Die iCal-Adresse wird bei der Mannschaft hinterlegt (Verwaltung → Mannschaften). Der Server gleicht die Abos {isDemo ? '' : 'automatisch zweimal täglich (ca. 4 und 13 Uhr) und '}auf Knopfdruck ab.</p>
          <ul className="plain small">
            {data.teams.filter((t) => t.ical_url).map((t) => <li key={t.id}>{t.name}</li>)}
            {!data.teams.some((t) => t.ical_url) && <li className="muted">Noch keine Mannschaft mit Kalender-Abo.</li>}
          </ul>
          <button className="btn" onClick={sync}>Jetzt abgleichen</button>
          {syncMsg && <p className="small">{syncMsg}</p>}
        </>
      )}

      {form && <EventForm initial={form} onClose={() => setForm(null)} />}
    </div>
  );
}
