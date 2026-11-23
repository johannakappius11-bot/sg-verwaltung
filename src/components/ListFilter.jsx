// Filterleiste für Listen: Suchfeld + Auswahl-Chips (Mehrfachauswahl, nichts gewählt = alle)
import { useEffect, useState } from 'react';
import { config } from '../config.js';

export function usePersistentFilter(key, initial) {
  const [value, setValue] = useState(() => {
    try { return { ...initial, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* */ } }, [key, value]);
  return [value, setValue];
}

// Verein: SG-Einträge (oder ohne Angabe) gehören zu beiden Vereinen
const knownClub = (club) => config.clubFilter.some((c) => c.value === club);
export const matchesClub = (club, selected) => !selected?.length || !club || !knownClub(club) || selected.includes(club);
export const clubLabel = (club) => config.clubFilter.find((c) => c.value === club)?.label || (club ? 'SG' : '');

export const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// groups: [{ key, label, options: [{ value, label, color }] }]
export default function ListFilter({ id, value, onChange, groups, placeholder, count, total }) {
  const toggle = (k, v) => onChange({ ...value, [k]: (value[k] || []).includes(v) ? value[k].filter((x) => x !== v) : [...(value[k] || []), v] });
  const active = !!value.q || groups.some((g) => (value[g.key] || []).length);
  return (
    <div className="list-filter">
      <input id={`${id}-search`} type="search" value={value.q || ''} placeholder={placeholder} aria-label={placeholder}
        onChange={(e) => onChange({ ...value, q: e.target.value })} />
      {groups.map((g) => (
        <div key={g.key} className="lf-row" role="group" aria-label={g.label}>
          <span className="lf-label">{g.label}</span>
          <div className="lf-chips">
            {g.options.map((o) => {
              const on = (value[g.key] || []).includes(o.value);
              return (
                <button key={o.value} className={`chip chip-sm ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(g.key, o.value)}>
                  {o.color && <i className="dot" style={{ '--c': o.color }} />}{o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="lf-foot">
        <span className="muted small">{active ? `${count} von ${total}` : `${total}`} {total === 1 ? 'Eintrag' : 'Einträge'}</span>
        {active && <button className="link-btn" onClick={() => onChange(Object.fromEntries(Object.keys(value).map((k) => [k, k === 'q' ? '' : []])))}>Filter zurücksetzen</button>}
      </div>
    </div>
  );
}
