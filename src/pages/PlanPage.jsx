// Platzplan: eine gemeinsame Wochen-/Tagesansicht für alle Plätze.
// Farbe = Ort (Platzfarbe, Auswärts grau). Form = Art: Training hell mit Farbstreifen,
// Spiel kräftig ausgefüllt mit Ball-Symbol, Sonstiges schraffiert.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config.js';
import { api } from '../data/api.js';
import { useApp } from '../store.jsx';
import { addDays, fmtDate, fmtDateLong, hm, isoWeekday, sameDay, startOfWeek, weekLabel, WEEKDAYS, ymd } from '../lib/dates.js';
import { buildOccurrences, conflictKeys, KIND_LABEL, layoutLanes } from '../lib/schedule.js';
import { AWAY_COLOR, tint } from '../lib/colors.js';
import { Icon, PersonCard, Sheet } from '../components/ui.jsx';
import EventForm from '../components/EventForm.jsx';
import { alertDialog, confirmDialog, promptDialog } from '../components/dialog.jsx';

const VIEW_KEY = 'platzplan-view';
const FILTER_KEY = 'platzplan-filter';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } },
};
// hiddenPlaces: ausgeblendete Sportanlagen (+ 'away'), hiddenFields: einzelne ausgeblendete Plätze
const EMPTY_FILTER = { hiddenPlaces: [], hiddenFields: [], kinds: [], teams: [] }; // kinds/teams leer = alle
const loadFilter = () => { try { return { ...EMPTY_FILTER, ...JSON.parse(store.get(FILTER_KEY) || '{}') }; } catch { return EMPTY_FILTER; } };


export function Ball({ size = 11 }) {
  return (
    <svg className="ball" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
    </svg>
  );
}

export default function PlanPage() {
  const { data, teamById, fieldById, canManage, editableTeams, siteColor, fieldLabel, me } = useApp();
  const placeOf = (o) => (o.isAway ? 'away' : fieldById[o.fieldId]?.site_id || 'none');
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState(() => store.get(VIEW_KEY) || 'woche');
  const [day, setDay] = useState(() => isoWeekday(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState(loadFilter);
  const [error, setError] = useState('');

  useEffect(() => { store.set(VIEW_KEY, view); }, [view]);
  useEffect(() => { store.set(FILTER_KEY, JSON.stringify(filter)); }, [filter]);

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
  const shown = all.filter((o) => !filter.hiddenPlaces.includes(placeOf(o)) && !filter.hiddenFields.includes(o.fieldId)
    && (!filter.kinds.length || filter.kinds.includes(o.kind))
    && (!filter.teams.length || filter.teams.includes(o.teamId)));

  const days = [...Array(7)].map((_, i) => addDays(monday, i));
  const shownDays = view === 'tag' ? [days[day - 1]] : days;
  const isThisWeek = sameDay(monday, startOfWeek(new Date()));

  // Sichtbarer Zeitbereich passt sich an die Termine an (weniger Scrollen)
  const visible = shown.filter((o) => shownDays.some((d) => sameDay(o.start, d)));
  let startH = visible.length ? Math.min(...visible.map((o) => o.start.getHours())) : config.dayStartHour;
  let endH = visible.length ? Math.max(...visible.map((o) => (sameDay(o.start, o.end) ? o.end.getHours() + (o.end.getMinutes() ? 1 : 0) : 24))) : config.dayEndHour;
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

  const places = [...data.sites.map((x) => ({ key: x.id, label: x.short_name, color: siteColor(x.id) })), { key: 'away', label: 'Auswärts', color: AWAY_COLOR }];
  const togglePlace = (k) => setFilter((f) => ({ ...f, hiddenPlaces: f.hiddenPlaces.includes(k) ? f.hiddenPlaces.filter((x) => x !== k) : [...f.hiddenPlaces, k] }));
  const extraCount = (filter.kinds.length ? 1 : 0) + (filter.teams.length ? 1 : 0) + (filter.hiddenFields.length ? 1 : 0);
  const summary = [
    filter.hiddenFields.length ? `ohne ${filter.hiddenFields.map((id) => fieldLabel(id)).join(', ')}` : null,
    filter.kinds.length ? filter.kinds.map((k) => KIND_LABEL[k]).join(' + ') : null,
    filter.teams.length ? (filter.teams.length === 1 ? teamById[filter.teams[0]]?.name : `${filter.teams.length} Mannschaften`) : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="plan">
      <div className="plan-controls">
        <div className="filter-row">
          <div className="place-chips" role="group" aria-label="Orte ein- und ausblenden">
            {places.map((p) => {
              const on = !filter.hiddenPlaces.includes(p.key);
              return (
                <button key={p.key} className={`place-chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => togglePlace(p.key)}
                  style={{ '--c': p.color, '--ct': tint(p.color, 0.14) }}>
                  <i className="dot" />{p.label}
                </button>
              );
            })}
          </div>
          <button className={`btn btn-sm filter-btn ${extraCount ? 'active' : ''}`} aria-label="Filter" onClick={() => setFilterOpen(true)}>
            <Icon name="filter" size={18} /><span className="lbl">Filter</span>{extraCount ? ` (${extraCount})` : ''}
          </button>
        </div>
        {summary && (
          <div className="filter-summary">
            <span>Gefiltert: <strong>{summary}</strong></span>
            <button className="link-btn" onClick={() => setFilter((f) => ({ ...f, kinds: [], teams: [], hiddenFields: [] }))}>Aufheben</button>
          </div>
        )}
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
            <button className="btn btn-sm btn-primary" onClick={() => setForm({ defaults: { date: ymd(view === 'tag' ? days[day - 1] : (isThisWeek ? new Date() : monday)) } })}>
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
          <div className="cal-body" style={{ '--hours': endH - startH }}>
            <div className="cal-axis">
              {[...Array(endH - startH)].map((_, i) => <div key={i} className="cal-hour"><span>{startH + i}</span></div>)}
            </div>
            {shownDays.map((d) => (
              <DayColumn key={ymd(d)} day={d} items={shown.filter((o) => sameDay(o.start, d))} startH={startH}
                conflicts={conflicts} onSelect={setSelected} wide={view === 'tag'} />
            ))}
          </div>
        </div>
        {!loading && !visible.length && <p className="cal-empty">Keine Termine{shown.length !== all.length ? ' für diese Filterauswahl' : ''} {view === 'tag' ? 'an diesem Tag' : 'in dieser Woche'}.</p>}
      </div>

      <div className="legend" aria-label="Legende">
        <span><i className="sw sw-training" /> Training</span>
        <span><i className="sw sw-spiel"><Ball size={9} /></i> Spiel</span>
        <span><i className="sw sw-sonstiges" /> Sonstiges</span>
        <span><i className="sw sw-conflict" /> Doppelt belegt</span>
      </div>
      <p className="muted small center">Farbe = Ort ({places.map((p) => p.label).join(', ')}). Wischen zum Blättern, Termin antippen für Details.</p>

      {filterOpen && <FilterSheet filter={filter} setFilter={setFilter} places={places} myTeamIds={me?.teamIds || []} onClose={() => setFilterOpen(false)} />}
      {selected && <DetailSheet item={selected} conflict={conflicts.has(selected.key)} onClose={() => setSelected(null)}
        onEdit={(init) => { setSelected(null); setForm(init); }} onChanged={() => { setSelected(null); loadEvents(); }} />}
      {form && <EventForm initial={form} onClose={() => setForm(null)} onSaved={loadEvents} />}
    </div>
  );
}

function FilterSheet({ filter, setFilter, places, myTeamIds, onClose }) {
  const { data, fieldsOfSite } = useApp();
  const teams = data.teams.filter((t) => t.active);
  const groups = [...new Set(teams.map((t) => t.category || 'Weitere'))];
  const toggle = (key, v) => setFilter((f) => ({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] }));
  const placeOn = (k) => !filter.hiddenPlaces.includes(k);
  return (
    <Sheet title="Filter" onClose={onClose} footer={
      <div className="row gap">
        <button className="btn" onClick={() => setFilter(EMPTY_FILTER)}>Alles zeigen</button>
        <button className="btn btn-primary grow" onClick={onClose}>Fertig</button>
      </div>
    }>
      <div className="form">
        <div>
          <div className="field-label">Ort</div>
          <div className="chip-wrap">
            {places.map((p) => (
              <button key={p.key} className={`place-chip ${placeOn(p.key) ? 'on' : ''}`} aria-pressed={placeOn(p.key)}
                style={{ '--c': p.color, '--ct': tint(p.color, 0.14) }}
                onClick={() => toggle('hiddenPlaces', p.key)}><i className="dot" />{p.label}</button>
            ))}
          </div>
          {data.sites.filter((x) => fieldsOfSite(x.id).length > 1 && placeOn(x.id)).map((x) => (
            <div key={x.id} className="sub-fields">
              <span className="muted small">{x.short_name}:</span>
              {fieldsOfSite(x.id).map((fl) => {
                const on = !filter.hiddenFields.includes(fl.id);
                return <button key={fl.id} className={`chip chip-sm ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle('hiddenFields', fl.id)}>{fl.name}</button>;
              })}
            </div>
          ))}
        </div>
        <div>
          <div className="field-label">Art</div>
          <div className="chip-wrap">
            {Object.entries(KIND_LABEL).map(([k, l]) => {
              const on = filter.kinds.includes(k);
              return <button key={k} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle('kinds', k)}>{l}</button>;
            })}
          </div>
          <p className="muted small">Nichts gewählt = alle Arten.</p>
        </div>
        <div>
          <div className="row between">
            <div className="field-label">Mannschaften</div>
            <div className="row gap-s">
              {myTeamIds.length > 0 && <button className="link-btn" onClick={() => setFilter((f) => ({ ...f, teams: myTeamIds }))}>Meine</button>}
              <button className="link-btn" onClick={() => setFilter((f) => ({ ...f, teams: [] }))}>Alle</button>
            </div>
          </div>
          {groups.map((g) => (
            <div key={g} className="team-group">
              <div className="muted small">{g}</div>
              <div className="chip-wrap">
                {teams.filter((t) => (t.category || 'Weitere') === g).map((t) => {
                  const on = filter.teams.includes(t.id);
                  return <button key={t.id} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle('teams', t.id)}>{t.name}</button>;
                })}
              </div>
            </div>
          ))}
          <p className="muted small">Nichts gewählt = alle Mannschaften.</p>
        </div>
      </div>
    </Sheet>
  );
}

function DayColumn({ day, items, startH, conflicts, onSelect, wide }) {
  const { teamById, colorOf, fieldLabel } = useApp();
  const now = new Date();
  const nowTop = sameDay(day, now) ? (now.getHours() - startH) * 60 + now.getMinutes() : null;
  return (
    <div className="cal-col">
      {nowTop !== null && nowTop > 0 && <div className="now-line" style={{ top: `calc(${nowTop} * var(--ppm))` }} />}
      {layoutLanes(items).map(({ item: o, lane, lanes }) => {
        const top = (o.start.getHours() - startH) * 60 + o.start.getMinutes();
        const len = (Math.min(o.end, addDays(day, 1)) - o.start) / 60000;
        const team = teamById[o.teamId];
        const conflict = conflicts.has(o.key);
        const color = colorOf(o);
        const label = o.kind === 'sonstiges' && o.title ? o.title : team?.[wide ? 'name' : 'short_name'] || '–';
        const where = o.isAway ? 'Auswärts' : fieldLabel(o.fieldId);
        const code = o.isAway ? '' : fieldLabel(o.fieldId, { short: true });
        const detail = o.cancelled ? 'fällt aus'
          : o.kind === 'spiel' ? (o.isAway ? `Auswärts bei ${o.opponent || '?'}` : `Heimspiel gegen ${o.opponent || '?'} · ${where}`)
            : `${KIND_LABEL[o.kind]} · ${where}`;
        return (
          <button key={o.key}
            className={`block kind-${o.kind} ${o.isAway ? 'is-away' : ''} ${conflict ? 'conflict' : ''} ${o.cancelled ? 'cancelled' : ''}`}
            style={{ '--c': color, '--ct': tint(color, 0.2), top: `calc(${top} * var(--ppm))`, height: `calc(${len} * var(--ppm) - 2px)`, left: `calc(${lane} * 100% / ${lanes})`, width: `calc(100% / ${lanes} - 2px)` }}
            onClick={() => onSelect(o)}
            aria-label={`${team?.name || ''}, ${detail}, ${hm(o.start)} bis ${hm(o.end)}${conflict ? ', Doppelbelegung' : ''}`}>
            {conflict && <span className="block-warn" aria-hidden="true">!</span>}
            <span className="block-team">{o.kind === 'spiel' && <Ball />}{label}</span>
            {(wide || lanes < 3) && <span className="block-time">{hm(o.start)}{wide ? `–${hm(o.end)}` : ''}</span>}
            {code && !wide && <span className="block-res">{code}</span>}
            {wide && <span className="block-kind">{detail}</span>}
          </button>
        );
      })}
    </div>
  );
}

function DetailSheet({ item: o, conflict, onClose, onEdit, onChanged }) {
  const { teamById, fieldLabel, contactsForTeam, canEditTeam, data, reloadData, toast, colorOf } = useApp();
  const team = teamById[o.teamId];
  const contacts = contactsForTeam(o.teamId);
  const canEdit = canEditTeam(o.teamId);
  const [busy, setBusy] = useState(false);
  const series = o.type === 'series' ? data.series.find((s) => s.id === o.seriesId) : null;

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); await reloadData(); toast(msg); onChanged(); } catch (e) { alertDialog(e.message); }
    setBusy(false);
  };
  const title = o.kind === 'spiel' ? (o.isAway ? 'Auswärtsspiel' : 'Heimspiel') : o.kind === 'sonstiges' ? (o.title || 'Termin') : 'Training';
  const mapUrl = o.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.venue)}` : null;

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="detail">
        <div className="detail-team"><i className="dot dot-lg" style={{ '--c': colorOf(o) }} />{team?.name || 'Unbekannte Mannschaft'}</div>
        {o.cancelled && <div className="alert alert-warn">Dieser Termin fällt aus{o.cancelReason ? `: ${o.cancelReason}` : '.'}</div>}
        {conflict && <div className="alert alert-warn"><Icon name="warn" /> Doppelbelegung: Zu dieser Zeit ist der Platz mehrfach belegt.</div>}
        <dl className="dl">
          <dt>Wann</dt><dd>{fmtDateLong(o.start)}<br />{hm(o.start)}–{hm(o.end)} Uhr</dd>
          {o.kind === 'spiel' && <><dt>Gegner</dt><dd>{o.opponent || '–'}</dd></>}
          {o.competition && <><dt>Wettbewerb</dt><dd>{o.competition}</dd></>}
          {o.isAway
            ? <><dt>Spielort</dt><dd>{o.venue || 'nicht angegeben'}{mapUrl && <><br /><a href={mapUrl} target="_blank" rel="noopener noreferrer"><Icon name="pin" size={16} /> In Karte öffnen</a></>}</dd></>
            : <><dt>Platz</dt><dd>{fieldLabel(o.fieldId, { long: true })}</dd></>}
          {series && <><dt>Wiederholung</dt><dd>jede Woche{series.valid_until ? ` bis ${series.valid_until.split('-').reverse().join('.')}` : ''}</dd></>}
          {o.note && <><dt>Notiz</dt><dd>{o.note}</dd></>}
        </dl>
        <h3>Ansprechpartner</h3>
        {contacts.length ? contacts.map((c) => <PersonCard key={c.id} person={c.person} subtitle={c.role} />) : <p className="muted">Kein Ansprechpartner hinterlegt.</p>}

        {canEdit && (
          <div className="detail-actions">
            {o.type === 'series' && !o.cancelled && (
              <button className="btn" disabled={busy} onClick={async () => {
                const reason = await promptDialog(`Training am ${fmtDate(o.start)} absagen? Grund (optional):`, '', { title: 'Termin absagen', confirmLabel: 'Absagen' });
                if (reason !== null) act(() => api.insert('series_exceptions', { series_id: o.seriesId, date: o.date, reason: reason || null }), 'Termin abgesagt');
              }}>Nur diesen Termin absagen</button>
            )}
            {o.type === 'series' && o.cancelled && (
              <button className="btn" disabled={busy} onClick={() => act(() => api.remove('series_exceptions', o.exceptionId), 'Absage zurückgenommen')}>Absage zurücknehmen</button>
            )}
            {series && <button className="btn" onClick={() => onEdit({ series })}><Icon name="edit" /> Alle Termine dieser Serie bearbeiten</button>}
            {o.type === 'event' && <button className="btn" onClick={() => onEdit({ event: o.event })}><Icon name="edit" /> Bearbeiten</button>}
            {o.type === 'event' && (
              <button className="btn btn-danger" disabled={busy} onClick={async () => (await confirmDialog('Diesen Termin wirklich löschen?', { confirmLabel: 'Löschen', danger: true })) && act(() => api.remove('events', o.eventId), 'Gelöscht')}>
                <Icon name="trash" /> Löschen
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
