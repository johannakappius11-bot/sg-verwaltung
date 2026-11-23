// Seite "Ansprechpartner": Vorstand, weitere Funktionen und Trainer/Betreuer der Mannschaften.
// Umschalter: Liste (mit Filter) oder Organigramm (Vorstand je Verein).
import { useState } from 'react';
import { config } from '../config.js';
import { useApp } from '../store.jsx';
import { Empty, Link, PersonCard } from '../components/ui.jsx';
import ListFilter, { clubLabel, matchesClub, norm, usePersistentFilter } from '../components/ListFilter.jsx';
import OrgChart from './OrgChart.jsx';
import { TopicChips, topicsOf } from '../components/Topics.jsx';

const TEAM_CAT = 'Trainer & Betreuer';
const VIEW_KEY = 'platzplan-contacts-view';

export default function BoardPage() {
  const { data, personById } = useApp();
  const [filter, setFilter] = usePersistentFilter('platzplan-contacts-filter', { q: '', club: [], cat: [] });
  const [view, setViewState] = useState(() => { try { return localStorage.getItem(VIEW_KEY) || 'liste'; } catch { return 'liste'; } });
  const setView = (v) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, v); } catch { /* */ } };

  // Trainer, Co-Trainer und Betreuer der aktiven Mannschaften als eigene Einträge
  const teamEntries = data.contacts
    .map((c) => ({ c, team: data.teams.find((t) => t.id === c.team_id) }))
    .filter(({ team }) => team?.active)
    .sort((a, b) => a.team.sort - b.team.sort || (b.c.is_primary - a.c.is_primary) || a.c.sort - b.c.sort)
    .map(({ c, team }) => ({ id: `tc-${c.id}`, person_id: c.person_id, position: c.role, club: team.club, teamName: team.name, category: TEAM_CAT, team }));
  const all = [...data.board, ...teamEntries];

  // Reihenfolge der Bereiche: Trainer & Betreuer nach der Jugendabteilung
  const base = [...config.contactGroups];
  base.splice(Math.max(base.indexOf('Jugendabteilung') + 1, 1), 0, TEAM_CAT);
  const cats = [...base, ...new Set(all.map((b) => b.category || 'Vorstand').filter((c) => !base.includes(c)))];

  const shown = all.filter((b) => {
    if (!matchesClub(b.club, filter.club)) return false;
    if (filter.cat.length && !filter.cat.includes(b.category || 'Vorstand')) return false;
    if (filter.q) {
      const hay = norm([personById[b.person_id]?.name, b.position, b.teamName, ...topicsOf(b), b.club].join(' '));
      if (!norm(filter.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const groups = cats.filter((c) => shown.some((b) => (b.category || 'Vorstand') === c));

  return (
    <div className="page">
      <h1>Ansprechpartner</h1>
      <div className="seg seg-sm view-switch" role="tablist" aria-label="Ansicht">
        {[['liste', 'Liste'], ['organigramm', 'Organigramm']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {view === 'organigramm' ? <OrgChart /> : (
        <>
          <ListFilter id="contacts" value={filter} onChange={setFilter} count={shown.length} total={all.length}
            placeholder="Name, Mannschaft oder Thema suchen …"
            groups={[
              { key: 'club', label: 'Verein', options: config.clubFilter.map((c) => ({ value: c.value, label: c.label })) },
              { key: 'cat', label: 'Bereich', options: cats.filter((c) => all.some((b) => (b.category || 'Vorstand') === c)).map((c) => ({ value: c, label: c })) },
            ]} />
          {!all.length && <Empty>Noch keine Ansprechpartner eingetragen.</Empty>}
          {all.length > 0 && !shown.length && <Empty>Niemand passt zu diesem Filter.</Empty>}
          {groups.map((c) => (
            <section key={c}>
              <h2 className="group-title">{c}</h2>
              {shown.filter((b) => (b.category || 'Vorstand') === c).map((b) => (
                <div key={b.id} className="card">
                  <div className="card-kicker">
                    {b.team ? <>{b.position} · <Link to={`/mannschaften/${b.team.id}`}>{b.team.name}</Link></> : b.position}
                    {b.club && <span className={`badge ${clubLabel(b.club) === 'SG' ? 'badge-sg' : ''}`}>{clubLabel(b.club)}</span>}
                  </div>
                  <PersonCard person={personById[b.person_id]} />
                  {!b.team && <TopicChips topics={topicsOf(b)} />}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </div>
  );
}
