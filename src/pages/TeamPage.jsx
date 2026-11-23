import { useEffect, useMemo, useState } from 'react';
import { api } from '../data/api.js';
import { useApp } from '../store.jsx';
import { addDays, fmtDate, hm, startOfDay } from '../lib/dates.js';
import { buildOccurrences, KIND_LABEL } from '../lib/schedule.js';
import { Empty, Icon, Link, PersonCard } from '../components/ui.jsx';
import FussballDeWidget from '../components/FussballDeWidget.jsx';

export default function TeamPage({ params }) {
  const { teamById, contactsForTeam, fieldLabel, data } = useApp();
  const team = teamById[params.id];
  const [events, setEvents] = useState([]);
  const from = useMemo(() => startOfDay(new Date()), []);
  const to = useMemo(() => addDays(from, 56), [from]);

  useEffect(() => {
    if (!team) return;
    api.list('events', { eq: { team_id: team.id }, gte: { ends_at: from.toISOString() }, lt: { starts_at: to.toISOString() }, order: 'starts_at' })
      .then(setEvents).catch(() => {});
  }, [team?.id, from, to]); // eslint-disable-line

  if (!team) return <div className="page"><Empty>Mannschaft nicht gefunden.</Empty></div>;
  const occ = buildOccurrences({ series: data.series.filter((s) => s.team_id === team.id), exceptions: data.exceptions, events, from, to });
  const games = occ.filter((o) => o.kind === 'spiel');
  const trainings = data.series.filter((s) => s.team_id === team.id && (!s.valid_until || s.valid_until >= from.toISOString().slice(0, 10)));
  const nextOther = occ.filter((o) => o.kind !== 'spiel').slice(0, 6);
  const WD = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

  return (
    <div className="page">
      <Link to="/mannschaften" className="back"><Icon name="left" size={18} /> Alle Mannschaften</Link>
      <h1>{team.name}</h1>
      <p className="muted">Heimplatz: {team.home_field_id ? fieldLabel(team.home_field_id, { long: true }) : '–'}</p>

      <h2>Ansprechpartner</h2>
      {contactsForTeam(team.id).map((c) => <PersonCard key={c.id} person={c.person} subtitle={c.role} />)}
      {!contactsForTeam(team.id).length && <Empty>Kein Ansprechpartner hinterlegt.</Empty>}

      <h2>Trainingszeiten</h2>
      {trainings.length ? (
        <ul className="plain">
          {trainings.sort((a, b) => a.weekday - b.weekday).map((s) => (
            <li key={s.id}><strong>{WD[s.weekday]}</strong> {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)} Uhr · {fieldLabel(s.field_id)}</li>
          ))}
        </ul>
      ) : <Empty>Keine regelmäßigen Trainingszeiten.</Empty>}

      <h2>Nächste Spiele</h2>
      {games.length ? (
        <ul className="plain">
          {games.map((g) => (
            <li key={g.key}>
              <strong>{fmtDate(g.start)} {hm(g.start)}</strong> · {g.isAway ? 'Auswärts bei ' : 'Heim gegen '}{g.opponent || '?'}
              {g.isAway && g.venue ? <div className="muted small">{g.venue}</div> : !g.isAway && <div className="muted small">{fieldLabel(g.fieldId, { long: true })}</div>}
            </li>
          ))}
        </ul>
      ) : <Empty>Keine Spiele in den nächsten 8 Wochen eingetragen.</Empty>}

      {nextOther.length > 0 && <>
        <h2>Nächste Termine</h2>
        <ul className="plain">
          {nextOther.map((o) => <li key={o.key} className={o.cancelled ? 'strike' : ''}>{fmtDate(o.start)} {hm(o.start)}–{hm(o.end)} · {o.title || KIND_LABEL[o.kind]} · {fieldLabel(o.fieldId)}{o.cancelled ? ' (fällt aus)' : ''}</li>)}
        </ul>
      </>}

      {team.fussballde_widget_id && <>
        <h2>Spielplan auf fussball.de</h2>
        <FussballDeWidget widgetId={team.fussballde_widget_id} />
      </>}
    </div>
  );
}
