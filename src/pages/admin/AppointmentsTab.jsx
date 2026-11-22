import { useEffect, useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { addDays, fmtDate, hm, startOfDay, WEEKDAYS_LONG, ymd } from '../../lib/dates.js';
import { KIND_LABEL } from '../../lib/schedule.js';
import { Empty, Icon } from '../../components/ui.jsx';
import EventForm from '../../components/EventForm.jsx';

export default function AppointmentsTab() {
  const { data, editableTeams, fieldById, teamById, reloadData, toast, isAdmin } = useApp();
  const [teamId, setTeamId] = useState(editableTeams.length === 1 ? editableTeams[0].id : '');
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(null);
  const [tick, setTick] = useState(0);

  const teamIds = teamId ? [teamId] : editableTeams.map((t) => t.id);
  useEffect(() => {
    const from = startOfDay(new Date());
    api.list('events', { gte: { ends_at: from.toISOString() }, lt: { starts_at: addDays(from, 90).toISOString() }, order: 'starts_at' })
      .then((ev) => setEvents(ev)).catch(() => {});
  }, [tick]);

  const today = ymd(new Date());
  const series = data.series.filter((s) => teamIds.includes(s.team_id))
    .sort((a, b) => (teamById[a.team_id]?.sort ?? 0) - (teamById[b.team_id]?.sort ?? 0) || a.weekday - b.weekday);
  const singles = events.filter((e) => teamIds.includes(e.team_id));
  const reload = () => setTick((t) => t + 1);

  const delSeries = async (s) => {
    const ended = s.valid_until && s.valid_until < today;
    const choice = ended ? (confirm('Diese beendete Serie endgültig löschen?') ? 'delete' : null)
      : prompt('Was möchtest du tun?\n1 = Serie ab heute beenden (vergangene Termine bleiben)\n2 = Serie komplett löschen', '1');
    try {
      if (choice === '1') {
        const yesterday = ymd(addDays(new Date(), -1));
        if (s.valid_from > yesterday) await api.remove('series', s.id); // hat noch nicht begonnen
        else await api.update('series', s.id, { valid_until: yesterday });
        toast('Serie beendet');
      }
      else if (choice === '2' || choice === 'delete') { await api.remove('series', s.id); toast('Serie gelöscht'); }
      else return;
      await reloadData();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="toolbar">
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)} aria-label="Mannschaft filtern">
          {editableTeams.length > 1 && <option value="">Alle Mannschaften</option>}
          {editableTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setForm({ defaults: { team_id: teamId || undefined } })}><Icon name="plus" /> Neuer Termin</button>
      </div>
      {!isAdmin && <p className="muted small">Du kannst Termine deiner eigenen Mannschaft(en) anlegen und ändern.</p>}

      <h2>Regelmäßige Termine (wöchentlich)</h2>
      {series.length ? (
        <ul className="list">
          {series.map((s) => {
            const ended = s.valid_until && s.valid_until < today;
            return (
              <li key={s.id} className={`list-item ${ended ? 'dim' : ''}`}>
                <div className="grow">
                  <div className="list-title">{teamById[s.team_id]?.name} · {KIND_LABEL[s.kind]}</div>
                  <div className="small">{WEEKDAYS_LONG[s.weekday - 1]} {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} · {fieldById[s.field_id]?.short_name}</div>
                  <div className="muted small">ab {s.valid_from.split('-').reverse().join('.')}{s.valid_until ? ` bis ${s.valid_until.split('-').reverse().join('.')}` : ''}{ended ? ' (beendet)' : ''}</div>
                </div>
                <button className="icon-btn" onClick={() => setForm({ series: s })} aria-label="Bearbeiten"><Icon name="edit" /></button>
                <button className="icon-btn" onClick={() => delSeries(s)} aria-label="Löschen oder beenden"><Icon name="trash" /></button>
              </li>
            );
          })}
        </ul>
      ) : <Empty>Keine regelmäßigen Termine.</Empty>}

      <h2>Einzeltermine & Spiele (nächste 90 Tage)</h2>
      {singles.length ? (
        <ul className="list">
          {singles.map((e) => (
            <li key={e.id} className="list-item">
              <div className="grow">
                <div className="list-title">{teamById[e.team_id]?.name} · {e.kind === 'spiel' ? (e.is_away ? 'Auswärtsspiel' : 'Heimspiel') : e.title || KIND_LABEL[e.kind]}</div>
                <div className="small">{fmtDate(new Date(e.starts_at))} {hm(new Date(e.starts_at))}–{hm(new Date(e.ends_at))} · {e.is_away ? (e.venue || 'auswärts') : fieldById[e.field_id]?.short_name}</div>
                {e.opponent && <div className="muted small">gegen {e.opponent}{e.source !== 'manual' ? ` · importiert (${e.source})` : ''}</div>}
              </div>
              <button className="icon-btn" onClick={() => setForm({ event: e })} aria-label="Bearbeiten"><Icon name="edit" /></button>
              <button className="icon-btn" aria-label="Löschen" onClick={async () => {
                if (!confirm('Termin löschen?')) return;
                try { await api.remove('events', e.id); toast('Gelöscht'); reload(); } catch (err) { alert(err.message); }
              }}><Icon name="trash" /></button>
            </li>
          ))}
        </ul>
      ) : <Empty>Keine Einzeltermine.</Empty>}

      {form && <EventForm initial={form} onClose={() => setForm(null)} onSaved={reload} />}
    </div>
  );
}
