import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config.js';
import { api } from '../data/api.js';
import { useApp } from '../store.jsx';
import { addDays, fmtDate, fmtDateLong, hm, isoWeekday, sameDay, startOfWeek, weekLabel, WEEKDAYS, ymd } from '../lib/dates.js';
import { buildOccurrences, conflictKeys, KIND_LABEL, layoutLanes } from '../lib/schedule.js';
import { Icon, PersonCard, Sheet } from '../components/ui.jsx';
import EventForm from '../components/EventForm.jsx';

const FIELD_KEY = 'platzplan-field';
const VIEW_KEY = 'platzplan-view';
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } } };

export default function PlanPage() {
  const { data, teamById, canManage, editableTeams } = useApp();
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [fieldId, setFieldId] = useState(() => store.get(FIELD_KEY));
  const [view, setView] = useState(() => store.get(VIEW_KEY) || 'woche');
  const [day, setDay] = useState(() => isoWeekday(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');

  const field = data.fields.find((f) => f.id === fieldId) || data.fields[0];
  useEffect(() => { if (field) store.set(FIELD_KEY, field.id); }, [field?.id]); // eslint-disable-line
  useEffect(() => { store.set(VIEW_KEY, view); }, [view]);

  const from = monday; const to = useMemo(() => addDays(monday, 7), [monday]);
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      setEvents(await api.list('events', { lt: { starts_at: to.toISOString() }, gte: { ends_at: from.toISOString() } }));
      setError('');
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [from, to]);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  const all = useMemo(() => buildOccurrences({ series: data.series, exceptions: data.exceptions, events, from, to }), [data.series, data.exceptions, events, from, to]);
  const conflicts = useMemo(() => conflictKeys(all), [all]);
  const onField = all.filter((o) => !o.isAway && o.fieldId === field?.id);
  const away = all.filter((o) => o.isAway);

  const days = [...Array(7)].map((_, i) => addDays(monday, i));
  const shownDays = view === 'tag' ? [days[day - 1]] : days;
  const isThisWeek = sameDay(monday, startOfWeek(new Date()));

  // Sichtbarer Zeitbereich: passt sich an die Termine an (weniger Scrollen)
  const visible = onField.filter((o) => shownDays.some((d) => sameDay(o.start, d)));
  let startH = visible.length ? Math.min(...visible.map((o) => o.start.getHours())) : config.dayStartHour;
  let endH = visible.length ? Math.max(...visible.map((o) => o.end.getHours() + (o.end.getMinutes() ? 1 : 0))) : config.dayEndHour;
  if (endH - startH < 5) { startH = Math.max(0, Math.min(startH, endH - 5)); endH = Math.max(endH, startH + 5); }

  const shift = (dir) => {
    if (view === 'tag') {
      const nd = day + dir;
      if (nd < 1) { setMonday(addDays(monday, -7)); setDay(7); } else if (nd > 7) { setMonday(addDays(monday, 7)); setDay(1); } else setDay(nd);
    } else setMonday(addDays(monday, dir * 7));
  };
  const today = () => { setMonday(startOfWeek(new Date())); setDay(isoWeekday(new Date())); };

  // Wischen nach links/rechts blättert
  const touch = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return; const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x; const dy = t.clientY - touch.current.y; touch.current = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shift(dx < 0 ? 1 : -1);
  };

  if (!data.fields.length) return <div className="page"><p className="empty">Noch keine Plätze angelegt.</p></div>;

  return (
    <div className="plan">
      <div className="plan-controls">
        <div className="seg seg-lg" role="tablist" aria-label="Platz wählen">
          {data.fields.map((f) => (
            <button key={f.id} role="tab" aria-selected={f.id === field.id} className={f.id === field.id ? 'on' : ''} onClick={() => setFieldId(f.id)}>{f.short_name}</button>
          ))}
        </div>
        <div className="week-nav">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label={view === 'tag' ? 'Vorheriger Tag' : 'Vorherige Woche'}><Icon name="left" /></button>
          <div className="week-label">
            <strong>{view === 'tag' ? fmtDateLong(days[day - 1]) : weekLabel(monday)}</strong>
            {view === 'woche' && isThisWeek && <span className="muted small"> · diese Woche</span>}
          </div>
          <button className="icon-btn" onClick={() => shift(1)} aria-label={view === 'tag' ? 'Nächster Tag' : 'Nächste Woche'}><Icon name="right" /></button>
        </div>
        <div className="row gap between">
          <div className="seg seg-sm">
            <button className={view === 'woche' ? 'on' : ''} onClick={() => setView('woche')}>Woche</button>
            <button className={view === 'tag' ? 'on' : ''} onClick={() => setView('tag')}>Tag</button>
          </div>
          {(!isThisWeek || (view === 'tag' && day !== isoWeekday(new Date()))) && <button className="btn btn-sm" onClick={today}>Heute</button>}
          {canManage && editableTeams.length > 0 && (
            <button className="btn btn-sm btn-primary" onClick={() => setForm({ defaults: { field_id: field.id, date: ymd(view === 'tag' ? days[day - 1] : (isThisWeek ? new Date() : monday)) } })}>
              <Icon name="plus" size={18} /> Termin
            </button>
          )}
        </div>
        {view === 'tag' && (
          <div className="day-chips">
            {days.map((d, i) => (
              <button key={i} className={`${day === i + 1 ? 'on' : ''} ${sameDay(d, new Date()) ? 'today' : ''}`} onClick={() => setDay(i + 1)}>
                <span>{WEEKDAYS[i]}</span><small>{d.getDate()}.</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className={`grid-wrap ${loading ? 'is-loading' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className={`cal cal-${view}`} style={{ '--cols': shownDays.length }}>
          <div className="cal-head">
            <div className="cal-axis-head" />
            {shownDays.map((d) => (
              <div key={ymd(d)} className={`cal-day-head ${sameDay(d, new Date()) ? 'today' : ''}`}>
                <span>{WEEKDAYS[isoWeekday(d) - 1]}</span><strong>{d.getDate()}.</strong>
              </div>
            ))}
          </div>
          {away.length > 0 && (
            <div className="cal-away">
              <div className="cal-axis-head" />
              {shownDays.map((d) => (
                <div key={ymd(d)} className="cal-away-cell">
                  {away.filter((o) => sameDay(o.start, d)).map((o) => (
                    <button key={o.key} className="away-chip" onClick={() => setSelected(o)}>
                      <span className="away-tag">{view === 'tag' ? 'Auswärts' : <><span className="hide-xs">Auswärts</span><span className="show-xs">Ausw.</span></>}</span>
                      <span className="away-team">{teamById[o.teamId]?.short_name}{view === 'tag' ? ` · ${hm(o.start)} · bei ${o.opponent || '?'}` : ''}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="cal-body" style={{ '--hours': endH - startH }}>
            <div className="cal-axis">
              {[...Array(endH - startH)].map((_, i) => <div key={i} className="cal-hour"><span>{startH + i}</span></div>)}
            </div>
            {shownDays.map((d) => (
              <DayColumn key={ymd(d)} day={d} items={onField.filter((o) => sameDay(o.start, d))} startH={startH}
                conflicts={conflicts} onSelect={setSelected} wide={view === 'tag'} />
            ))}
          </div>
        </div>
      </div>

      <div className="legend">
        <span><i className="sw sw-training" /> Training</span>
        <span><i className="sw sw-spiel" /> Heimspiel</span>
        <span><i className="sw sw-sonstiges" /> Sonstiges</span>
        <span><i className="sw sw-conflict" /> Doppelt belegt</span>
      </div>
      <p className="muted small center">Tipp: Zum Blättern nach links/rechts wischen. Termin antippen für Details.</p>

      {selected && <DetailSheet item={selected} conflict={conflicts.has(selected.key)} onClose={() => setSelected(null)}
        onEdit={(init) => { setSelected(null); setForm(init); }} onChanged={() => { setSelected(null); loadEvents(); }} />}
      {form && <EventForm initial={form} onClose={() => setForm(null)} onSaved={loadEvents} />}
    </div>
  );
}

function DayColumn({ day, items, startH, conflicts, onSelect, wide }) {
  const { teamById } = useApp();
  const now = new Date();
  const nowTop = sameDay(day, now) ? (now.getHours() - startH) * 60 + now.getMinutes() : null;
  return (
    <div className="cal-col">
      {nowTop !== null && nowTop > 0 && <div className="now-line" style={{ top: `calc(${nowTop} * var(--ppm))` }} />}
      {layoutLanes(items).map(({ item: o, lane, lanes }) => {
        const top = (o.start.getHours() - startH) * 60 + o.start.getMinutes();
        const len = (o.end - o.start) / 60000;
        const team = teamById[o.teamId];
        const conflict = conflicts.has(o.key);
        const label = o.kind === 'sonstiges' && o.title ? o.title : team?.[wide ? 'name' : 'short_name'] || '–';
        return (
          <button key={o.key}
            className={`block block-${o.kind} ${conflict ? 'conflict' : ''} ${o.cancelled ? 'cancelled' : ''}`}
            style={{ top: `calc(${top} * var(--ppm))`, height: `calc(${len} * var(--ppm) - 2px)`, left: `calc(${lane} * 100% / ${lanes})`, width: `calc(100% / ${lanes} - 2px)` }}
            onClick={() => onSelect(o)}
            aria-label={`${team?.name || ''}, ${KIND_LABEL[o.kind]}, ${hm(o.start)} bis ${hm(o.end)}${o.cancelled ? ', fällt aus' : ''}${conflict ? ', Doppelbelegung' : ''}`}>
            {conflict && <span className="block-warn" aria-hidden="true">!</span>}
            <span className="block-team">{label}</span>
            {(wide || lanes < 3) && <span className="block-time">{hm(o.start)}{wide ? `–${hm(o.end)}` : ''}</span>}
            {wide && <span className="block-kind">{o.cancelled ? 'fällt aus' : o.kind === 'spiel' ? `Spiel gegen ${o.opponent || '?'}` : KIND_LABEL[o.kind]}</span>}
          </button>
        );
      })}
    </div>
  );
}

function DetailSheet({ item: o, conflict, onClose, onEdit, onChanged }) {
  const { teamById, fieldById, contactsForTeam, canEditTeam, data, reloadData, toast } = useApp();
  const team = teamById[o.teamId];
  const contacts = contactsForTeam(o.teamId);
  const canEdit = canEditTeam(o.teamId);
  const [busy, setBusy] = useState(false);
  const series = o.type === 'series' ? data.series.find((s) => s.id === o.seriesId) : null;

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); await reloadData(); toast(msg); onChanged(); } catch (e) { alert(e.message); }
    setBusy(false);
  };
  const title = o.kind === 'spiel' ? (o.isAway ? 'Auswärtsspiel' : 'Heimspiel') : o.kind === 'sonstiges' ? (o.title || 'Termin') : 'Training';
  const mapUrl = o.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.venue)}` : null;

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="detail">
        <div className="detail-team">{team?.name || 'Unbekannte Mannschaft'}</div>
        {o.cancelled && <div className="alert alert-warn">Dieser Termin fällt aus{o.cancelReason ? `: ${o.cancelReason}` : '.'}</div>}
        {conflict && <div className="alert alert-warn"><Icon name="warn" /> Doppelbelegung: Zu dieser Zeit ist der Platz mehrfach belegt.</div>}
        <dl className="dl">
          <dt>Wann</dt><dd>{fmtDateLong(o.start)}<br />{hm(o.start)}–{hm(o.end)} Uhr</dd>
          {o.kind === 'spiel' && <><dt>Gegner</dt><dd>{o.opponent || '–'}</dd></>}
          {o.competition && <><dt>Wettbewerb</dt><dd>{o.competition}</dd></>}
          {o.isAway
            ? <><dt>Spielort</dt><dd>{o.venue || 'nicht angegeben'}{mapUrl && <><br /><a href={mapUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={16} /> In Karte öffnen</a></>}</dd></>
            : <><dt>Platz</dt><dd>{fieldById[o.fieldId]?.name || '–'}</dd></>}
          {series && <><dt>Wiederholung</dt><dd>jede Woche{series.valid_until ? ` bis ${series.valid_until.split('-').reverse().join('.')}` : ''}</dd></>}
          {o.note && <><dt>Notiz</dt><dd>{o.note}</dd></>}
        </dl>
        <h3>Ansprechpartner</h3>
        {contacts.length ? contacts.map((c) => <PersonCard key={c.id} person={c.person} subtitle={c.role} />) : <p className="muted">Kein Ansprechpartner hinterlegt.</p>}

        {canEdit && (
          <div className="detail-actions">
            {o.type === 'series' && !o.cancelled && (
              <button className="btn" disabled={busy} onClick={() => {
                const reason = prompt(`Training am ${fmtDate(o.start)} absagen?\nGrund (optional):`, '');
                if (reason !== null) act(() => api.insert('series_exceptions', { series_id: o.seriesId, date: o.date, reason: reason || null }), 'Termin abgesagt');
              }}>Nur diesen Termin absagen</button>
            )}
            {o.type === 'series' && o.cancelled && (
              <button className="btn" disabled={busy} onClick={() => act(() => api.remove('series_exceptions', o.exceptionId), 'Absage zurückgenommen')}>Absage zurücknehmen</button>
            )}
            {series && <button className="btn" onClick={() => onEdit({ series })}><Icon name="edit" /> Alle Termine dieser Serie bearbeiten</button>}
            {o.type === 'event' && <button className="btn" onClick={() => onEdit({ event: o.event })}><Icon name="edit" /> Bearbeiten</button>}
            {o.type === 'event' && (
              <button className="btn btn-danger" disabled={busy} onClick={() => confirm('Diesen Termin wirklich löschen?') && act(() => api.remove('events', o.eventId), 'Gelöscht')}>
                <Icon name="trash" /> Löschen
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
