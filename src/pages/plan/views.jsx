// Die drei Ansichten des Platzplans: Liste, Tag (Spalte pro Platz), Woche.
import { useEffect, useRef, useState } from 'react';
import { config } from '../../config.js';
import { useApp } from '../../store.jsx';
import { addDays, fmtDateLong, hm, isoWeekday, sameDay, ymd, WEEKDAYS, WEEKDAYS_LONG } from '../../lib/dates.js';
import { KIND_LABEL, layoutLanes } from '../../lib/schedule.js';
import { AWAY_COLOR, tint } from '../../lib/colors.js';

export function Ball({ size = 11 }) {
  return (
    <svg className="ball" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#fff" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor" />
    </svg>
  );
}

export function useIsWide(px = 700) {
  const q = `(min-width: ${px}px)`;
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q); const on = () => setWide(m.matches);
    if (m.addEventListener) m.addEventListener('change', on); else m.addListener(on);
    return () => (m.removeEventListener ? m.removeEventListener('change', on) : m.removeListener(on));
  }, [q]);
  return wide;
}

// Beschreibung eines Termins in einer Zeile
function useDescribe() {
  const { teamById, fieldLabel } = useApp();
  return (o) => {
    const team = teamById[o.teamId];
    const where = o.isAway ? 'Auswärts' : fieldLabel(o.fieldId);
    const name = o.kind === 'sonstiges' && o.title ? o.title : team?.name || '–';
    const sub = o.cancelled ? `fällt aus${o.cancelReason ? `: ${o.cancelReason}` : ''}`
      : o.kind === 'spiel' ? (o.isAway ? `Auswärts bei ${o.opponent || '?'}` : `Heimspiel gegen ${o.opponent || '?'} · ${where}`)
        : `${KIND_LABEL[o.kind]}${o.kind === 'sonstiges' && o.title ? ` · ${team?.name || ''}` : ''} · ${where}`;
    return { team, name, short: o.kind === 'sonstiges' && o.title ? o.title : team?.short_name || '–', sub, where };
  };
}

// Sichtbarer Zeitbereich passend zu den Terminen
export function hourRange(items) {
  let s = items.length ? Math.min(...items.map((o) => o.start.getHours())) : config.dayStartHour;
  let e = items.length ? Math.max(...items.map((o) => (sameDay(o.start, o.end) ? o.end.getHours() + (o.end.getMinutes() ? 1 : 0) : 24))) : config.dayEndHour;
  if (e - s < 5) { s = Math.max(0, Math.min(s, e - 5)); e = Math.max(e, s + 5); }
  return [s, e];
}

/* ---------------- 1. Liste ---------------- */
export function ListView({ days, items, conflicts, onSelect }) {
  const { colorOf } = useApp();
  const describe = useDescribe();
  const today = new Date();
  const todayIdx = days.findIndex((d) => sameDay(d, today));
  const [showPast, setShowPast] = useState(false);
  const refs = useRef({});
  useEffect(() => { setShowPast(false); }, [ymd(days[0])]); // eslint-disable-line

  const hiddenPast = todayIdx > 0 && !showPast ? days.slice(0, todayIdx) : [];
  const jump = (i) => {
    if (todayIdx > 0 && i < todayIdx && !showPast) setShowPast(true);
    setTimeout(() => refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  };

  return (
    <div className="list-view">
      <div className="day-strip" role="group" aria-label="Zu Tag springen">
        {days.map((d, i) => {
          const dayItems = items.filter((o) => sameDay(o.start, d));
          const colors = [...new Set(dayItems.map((o) => colorOf(o)))].slice(0, 3);
          return (
            <button key={i} className={`${sameDay(d, today) ? 'today' : ''} ${dayItems.length ? '' : 'empty'}`} onClick={() => jump(i)}
              aria-label={`${WEEKDAYS_LONG[i]}, ${dayItems.length} Termine`}>
              <span>{WEEKDAYS[i]}</span><strong>{d.getDate()}.</strong>
              <span className="dots">{colors.map((c) => <i key={c} className="dot dot-xs" style={{ '--c': c }} />)}</span>
            </button>
          );
        })}
      </div>

      {hiddenPast.length > 0 && (
        <button className="btn btn-block btn-sm past-toggle" onClick={() => setShowPast(true)}>
          Vergangene Tage dieser Woche anzeigen ({WEEKDAYS[0]}–{WEEKDAYS[todayIdx - 1]})
        </button>
      )}

      {days.map((d, i) => {
        if (hiddenPast.includes(d)) return null;
        const dayItems = items.filter((o) => sameDay(o.start, d));
        return (
          <section key={i} className="lv-day" ref={(el) => { refs.current[i] = el; }}>
            <h2 className={`lv-head ${sameDay(d, today) ? 'today' : ''}`}>
              {fmtDateLong(d).replace(/\.\d{4}$/, '.')}{sameDay(d, today) && <span className="lv-today">heute</span>}
            </h2>
            {dayItems.length ? (
              <div className="lv-items">
                {dayItems.map((o) => {
                  const c = colorOf(o); const t = describe(o); const conflict = conflicts.has(o.key);
                  return (
                    <button key={o.key} className={`lv-item kind-${o.kind} ${o.isAway ? 'is-away' : ''} ${o.cancelled ? 'cancelled' : ''}`}
                      style={{ '--c': c, '--ct': tint(c, 0.12) }} onClick={() => onSelect(o)}>
                      <span className="lv-time">{hm(o.start)}<small>{hm(o.end)}</small></span>
                      <span className="lv-main">
                        <span className="lv-team">{o.kind === 'spiel' && <Ball size={14} />}{t.name}</span>
                        <span className="lv-sub">{t.sub}</span>
                      </span>
                      {conflict && <span className="lv-warn" title="Doppelbelegung">!</span>}
                    </button>
                  );
                })}
              </div>
            ) : <p className="lv-empty">Keine Termine</p>}
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- Zeitraster (für Tag und Woche) ---------------- */
function Block({ o, top, len, lane, lanes, conflict, mode, onSelect }) {
  const { colorOf, fieldLabel } = useApp();
  const describe = useDescribe();
  const c = colorOf(o); const t = describe(o);
  const code = mode === 'week' && !o.isAway ? fieldLabel(o.fieldId, { short: true }) : '';
  const narrow = mode === 'week' || lanes > 1;
  return (
    <button className={`block kind-${o.kind} ${o.isAway ? 'is-away' : ''} ${conflict ? 'conflict' : ''} ${o.cancelled ? 'cancelled' : ''}`}
      style={{ '--c': c, '--ct': tint(c, 0.2), top: `calc(${top} * var(--ppm))`, height: `calc(${len} * var(--ppm) - 2px)`, left: `calc(${lane} * 100% / ${lanes})`, width: `calc(100% / ${lanes} - 2px)` }}
      onClick={() => onSelect(o)} aria-label={`${t.name}, ${t.sub}, ${hm(o.start)} bis ${hm(o.end)}${conflict ? ', Doppelbelegung' : ''}`}>
      {conflict && <span className="block-warn" aria-hidden="true">!</span>}
      <span className="block-team">{o.kind === 'spiel' && <Ball />}{narrow ? t.short : t.name}</span>
      {(mode !== 'week' || lanes < 3) && <span className="block-time">{hm(o.start)}{mode !== 'week' && lanes < 2 ? `–${hm(o.end)}` : ''}</span>}
      {code && <span className="block-res">{code}</span>}
      {mode === 'resource' && lanes < 2 && <span className="block-kind">{o.cancelled ? 'fällt aus' : o.kind === 'spiel' ? (o.isAway ? `bei ${o.opponent || '?'}` : `gg. ${o.opponent || '?'}`) : KIND_LABEL[o.kind]}</span>}
    </button>
  );
}

// columns: [{ key, head, day, items }]
function TimeGrid({ columns, conflicts, onSelect, mode, className = '' }) {
  const all = columns.flatMap((c) => c.items);
  const [startH, endH] = hourRange(all);
  const now = new Date();
  return (
    <div className={`cal cal-${mode} ${className}`} style={{ '--cols': columns.length }}>
      <div className="cal-head">
        <div className="cal-axis-head" />
        {columns.map((col) => <div key={col.key} className={`cal-day-head ${col.today ? 'today' : ''}`}>{col.head}</div>)}
      </div>
      <div className="cal-body" style={{ '--hours': endH - startH }}>
        <div className="cal-axis">
          {[...Array(endH - startH)].map((_, i) => <div key={i} className="cal-hour"><span>{startH + i}</span></div>)}
        </div>
        {columns.map((col) => {
          const nowTop = sameDay(col.day, now) ? (now.getHours() - startH) * 60 + now.getMinutes() : null;
          return (
            <div key={col.key} className="cal-col">
              {nowTop !== null && nowTop > 0 && <div className="now-line" style={{ top: `calc(${nowTop} * var(--ppm))` }} />}
              {layoutLanes(col.items).map(({ item: o, lane, lanes }) => (
                <Block key={o.key} o={o} lane={lane} lanes={lanes} mode={mode} conflict={conflicts.has(o.key)} onSelect={onSelect}
                  top={(o.start.getHours() - startH) * 60 + o.start.getMinutes()}
                  len={(Math.min(o.end, addDays(col.day, 1)) - o.start) / 60000} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 2. Tag: eine Spalte pro Platz ---------------- */
export function ResourceDayView({ day, items, conflicts, onSelect, filter }) {
  const { data, siteById, fieldsOfSite, siteColor } = useApp();
  const dayItems = items.filter((o) => sameDay(o.start, day));
  const fields = [...data.fields]
    .filter((f) => !filter.hiddenPlaces.includes(f.site_id) && !filter.hiddenFields.includes(f.id))
    .sort((a, b) => (siteById[a.site_id]?.sort ?? 0) - (siteById[b.site_id]?.sort ?? 0) || a.sort - b.sort);
  const columns = fields.map((f) => {
    const site = siteById[f.site_id]; const multi = fieldsOfSite(f.site_id).length > 1;
    return {
      key: f.id, day,
      head: <><span className="col-site"><i className="dot dot-sm" style={{ '--c': siteColor(f.site_id) }} />{site?.short_name}</span>{multi && <small>{f.name}</small>}</>,
      items: dayItems.filter((o) => !o.isAway && o.fieldId === f.id),
    };
  });
  const away = dayItems.filter((o) => o.isAway);
  if (!filter.hiddenPlaces.includes('away') && away.length) {
    columns.push({ key: 'away', day, head: <span className="col-site"><i className="dot dot-sm" style={{ '--c': AWAY_COLOR }} />Auswärts</span>, items: away });
  }
  if (!columns.length) return <p className="cal-empty">Alle Plätze sind ausgeblendet.</p>;
  return (
    <>
      <TimeGrid columns={columns} conflicts={conflicts} onSelect={onSelect} mode="resource" />
      {!dayItems.length && <p className="cal-empty">Keine Termine an diesem Tag.</p>}
    </>
  );
}

/* ---------------- 3. Woche ---------------- */
export function WeekGridView({ days, items, conflicts, onSelect }) {
  const today = new Date();
  const columns = days.map((d) => ({
    key: ymd(d), day: d, today: sameDay(d, today),
    head: <><span>{WEEKDAYS[isoWeekday(d) - 1]}</span><strong>{d.getDate()}.</strong></>,
    items: items.filter((o) => sameDay(o.start, d)),
  }));
  return (
    <>
      <TimeGrid columns={columns} conflicts={conflicts} onSelect={onSelect} mode="week" />
      {!items.length && <p className="cal-empty">Keine Termine in dieser Woche.</p>}
    </>
  );
}

// Handy: Übersicht Tage × Orte mit Anzahl; Antippen öffnet den Tag
export function WeekSummaryView({ days, items, conflicts, filter, onOpenDay }) {
  const { data, fieldById, siteColor } = useApp();
  const places = [
    ...data.sites.filter((x) => !filter.hiddenPlaces.includes(x.id)).map((x) => ({ key: x.id, label: x.short_name, color: siteColor(x.id) })),
    ...(filter.hiddenPlaces.includes('away') ? [] : [{ key: 'away', label: 'Auswärts', color: AWAY_COLOR }]),
  ];
  const placeOf = (o) => (o.isAway ? 'away' : fieldById[o.fieldId]?.site_id);
  const today = new Date();
  return (
    <div className="week-sum" style={{ '--cols': places.length }}>
      <div className="ws-row ws-head">
        <span />
        {places.map((p) => <span key={p.key} className="ws-place"><i className="dot dot-sm" style={{ '--c': p.color }} />{p.label}</span>)}
      </div>
      {days.map((d, i) => {
        const dayItems = items.filter((o) => sameDay(o.start, d));
        return (
          <button key={i} className={`ws-row ${sameDay(d, today) ? 'today' : ''}`} onClick={() => onOpenDay(i + 1)}
            aria-label={`${WEEKDAYS_LONG[i]}: ${dayItems.length} Termine, Tagesansicht öffnen`}>
            <span className="ws-day"><span>{WEEKDAYS[i]}</span><strong>{d.getDate()}.</strong></span>
            {places.map((p) => {
              const cell = dayItems.filter((o) => placeOf(o) === p.key && !o.cancelled);
              if (!cell.length) return <span key={p.key} className="ws-cell empty">–</span>;
              const tr = cell.filter((o) => o.kind === 'training').length;
              const sp = cell.filter((o) => o.kind === 'spiel').length;
              const so = cell.length - tr - sp;
              const start = new Date(Math.min(...cell.map((o) => o.start)));
              const end = new Date(Math.max(...cell.map((o) => o.end)));
              const warn = cell.some((o) => conflicts.has(o.key));
              return (
                <span key={p.key} className={`ws-cell ${sp ? 'has-game' : ''}`} style={{ '--c': p.color, '--ct': tint(p.color, 0.16) }}>
                  {warn && <span className="ws-warn" aria-label="Doppelbelegung">!</span>}
                  <span className="ws-counts">
                    {sp > 0 && <span className="ws-game"><Ball size={12} />{sp}</span>}
                    {tr > 0 && <span>{tr} Tr.</span>}
                    {so > 0 && <span>{so} Sonst.</span>}
                  </span>
                  <span className="ws-time">{hm(start)}–{hm(end)}</span>
                </span>
              );
            })}
          </button>
        );
      })}
      <p className="muted small center">Tr. = Training · Ball = Spiel. Tag antippen für Details.</p>
    </div>
  );
}
