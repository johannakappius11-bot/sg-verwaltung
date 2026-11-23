// Platzplan mit drei Ansichten:
//  Liste  – Termine pro Tag untereinander (Standard auf dem Handy)
//  Tag    – Zeitraster mit einer Spalte pro Platz (freie Zeiten, Doppelbelegung)
//  Woche  – Handy: Übersicht Tage × Orte; großer Bildschirm: volles Wochenraster
// Farbe = Ort (Sportanlage, auswärts grau). Training hell mit Farbstreifen, Spiel kräftig mit Ball.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../data/api.js';
import { useApp } from '../store.jsx';
import { addDays, fmtDate, fmtDateLong, hm, isoWeekday, sameDay, startOfWeek, weekLabel, WEEKDAYS, ymd } from '../lib/dates.js';
import { buildOccurrences, conflictKeys, KIND_LABEL } from '../lib/schedule.js';
import { AWAY_COLOR, tint } from '../lib/colors.js';
import { Icon, PersonCard, Sheet } from '../components/ui.jsx';
import EventForm from '../components/EventForm.jsx';
import { alertDialog, confirmDialog, promptDialog } from '../components/dialog.jsx';
import { Ball, ListView, ResourceDayView, useIsWide, WeekGridView, WeekSummaryView } from './plan/views.jsx';

const VIEW_KEY = 'platzplan-view2';
const FILTER_KEY = 'platzplan-filter';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } },
};
// hiddenPlaces: ausgeblendete Sportanlagen (+ 'away'), hiddenFields: einzelne ausgeblendete Plätze
const EMPTY_FILTER = { hiddenPlaces: [], hiddenFields: [], kinds: [], teams: [] }; // kinds/teams leer = alle
const loadFilter = () => { try { return { ...EMPTY_FILTER, ...JSON.parse(store.get(FILTER_KEY) || '{}') }; } catch { return EMPTY_FILTER; } };
const VIEWS = [['liste', 'Liste'], ['tag', 'Tag'], ['woche', 'Woche']];

export default function PlanPage() {
  const { data, teamById, fieldById, canManage, editableTeams, siteColor, fieldLabel, me } = useApp();
  const wide = useIsWide();
  const placeOf = (o) => (o.isAway ? 'away' : fieldById[o.fieldId]?.site_id || 'none');
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState(() => {
    const v = store.get(VIEW_KEY);
    return VIEWS.some(([k]) => k === v) ? v : (window.innerWidth < 700 ? 'liste' : 'woche');
  });
  const [day, setDay] = useState(() => isoWeekday(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filter, setFilter] = useState(loadFilter);
  const [error, setError] = useState('');
  const barRef = useRef(null);
  const [barH, setBarH] = useState(52);

  useEffect(() => { store.set(VIEW_KEY, view); }, [view]);
  useEffect(() => { store.set(FILTER_KEY, JSON.stringify(filter)); }, [filter]);
  // Höhe der mitlaufenden Leiste (für die Tagesüberschriften der Liste)
  useEffect(() => {
    if (!barRef.current || !window.ResizeObserver) return undefined;
    const ro = new ResizeObserver(() => setBarH(barRef.current?.offsetHeight || 52));
    ro.observe(barRef.current); return () => ro.disconnect();
  }, []);

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
  const isThisWeek = sameDay(monday, startOfWeek(new Date()));
  const isToday = view === 'tag' ? sameDay(days[day - 1], new Date()) : isThisWeek;

  const shift = (dir) => {
    if (view === 'tag') {
      const nd = day + dir;
      if (nd < 1) { setMonday(addDays(monday, -7)); setDay(7); } else if (nd > 7) { setMonday(addDays(monday, 7)); setDay(1); } else setDay(nd);
    } else setMonday(addDays(monday, dir * 7));
  };
  const today = () => { setMonday(startOfWeek(new Date())); setDay(isoWeekday(new Date())); };
  const openDay = (d) => { setDay(d); setView('tag'); window.scrollTo(0, 0); };

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
  const label = view === 'tag' ? fmtDate(days[day - 1]) + days[day - 1].getFullYear() : weekLabel(monday);

  return (
    <div className="plan" style={{ '--bar-h': `${barH}px` }}>
      {/* Mitlaufende Leiste: Blättern, Datum, Filter */}
      <div className="plan-bar" ref={barRef}>
        <button className="icon-btn" onClick={() => shift(-1)} aria-label={view === 'tag' ? 'Vorheriger Tag' : 'Vorherige Woche'}><Icon name="left" /></button>
        <button className="plan-label" onClick={today} aria-label={`${label}${isToday ? '' : ' – zu heute springen'}`}>
          <strong>{label}</strong>
          <small>{isToday ? (view === 'tag' ? 'heute' : 'diese Woche') : 'antippen: zu heute'}</small>
        </button>
        <button className="icon-btn" onClick={() => shift(1)} aria-label={view === 'tag' ? 'Nächster Tag' : 'Nächste Woche'}><Icon name="right" /></button>
        <button className={`icon-btn filter-icon ${extraCount ? 'active' : ''}`} onClick={() => setFilterOpen(true)} aria-label={`Filter${extraCount ? ` (${extraCount} aktiv)` : ''}`}>
          <Icon name="filter" />{extraCount > 0 && <span className="count">{extraCount}</span>}
        </button>
      </div>

      <div className="plan-controls">
        <div className="row gap">
          <div className="seg seg-sm grow" role="tablist" aria-label="Ansicht">
            {VIEWS.map(([k, l]) => <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}
          </div>
          {canManage && editableTeams.length > 0 && (
            <button className="btn btn-sm btn-primary" aria-label="Neuer Termin" onClick={() => setForm({ defaults: { date: ymd(view === 'tag' ? days[day - 1] : (isThisWeek ? new Date() : monday)) } })}>
              <Icon name="plus" size={18} /><span className="hide-xs">Termin</span>
            </button>
          )}
        </div>
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
        {summary && (
          <div className="filter-summary">
            <span>Gefiltert: <strong>{summary}</strong></span>
            <button className="link-btn" onClick={() => setFilter((f) => ({ ...f, kinds: [], teams: [], hiddenFields: [] }))}>Aufheben</button>
          </div>
        )}
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

      <div className={`plan-body ${loading ? 'is-loading' : ''}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {view === 'liste' && <ListView days={days} items={shown} conflicts={conflicts} onSelect={setSelected} />}
        {view === 'tag' && <div className="grid-wrap"><ResourceDayView day={days[day - 1]} items={shown} conflicts={conflicts} onSelect={setSelected} filter={filter} /></div>}
        {view === 'woche' && (wide
          ? <div className="grid-wrap"><WeekGridView days={days} items={shown} conflicts={conflicts} onSelect={setSelected} /></div>
          : <WeekSummaryView days={days} items={shown} conflicts={conflicts} filter={filter} onOpenDay={openDay} />)}
      </div>

      <div className="legend" aria-label="Legende">
        <span><i className="sw sw-training" /> Training</span>
        <span><i className="sw sw-spiel"><Ball size={9} /></i> Spiel</span>
        <span><i className="sw sw-sonstiges" /> Sonstiges</span>
        <span><i className="sw sw-warn">!</i> Doppelt belegt</span>
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
