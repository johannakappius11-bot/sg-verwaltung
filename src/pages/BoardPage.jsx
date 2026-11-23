// Seite "Ansprechpartner": Vorstand und weitere Funktionen (Jugend, Platzwart, Schiedsrichter …)
import { config } from '../config.js';
import { useApp } from '../store.jsx';
import { Empty, PersonCard } from '../components/ui.jsx';
import ListFilter, { clubLabel, matchesClub, norm, usePersistentFilter } from '../components/ListFilter.jsx';

export default function BoardPage() {
  const { data, personById } = useApp();
  const [filter, setFilter] = usePersistentFilter('platzplan-contacts-filter', { q: '', club: [], cat: [] });
  const all = data.board;
  const cats = [...config.contactGroups, ...new Set(all.map((b) => b.category || 'Vorstand').filter((c) => !config.contactGroups.includes(c)))];

  const shown = all.filter((b) => {
    if (!matchesClub(b.club, filter.club)) return false;
    if (filter.cat.length && !filter.cat.includes(b.category || 'Vorstand')) return false;
    if (filter.q) {
      const hay = norm([personById[b.person_id]?.name, b.position, b.responsibility, b.club].join(' '));
      if (!norm(filter.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const groups = cats.filter((c) => shown.some((b) => (b.category || 'Vorstand') === c));

  return (
    <div className="page">
      <h1>Ansprechpartner</h1>
      <ListFilter id="contacts" value={filter} onChange={setFilter} count={shown.length} total={all.length}
        placeholder="Name oder Thema suchen …"
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
              <div className="card-kicker">{b.position}{b.club && <span className={`badge ${clubLabel(b.club) === 'SG' ? 'badge-sg' : ''}`}>{clubLabel(b.club)}</span>}</div>
              <PersonCard person={personById[b.person_id]} subtitle={b.responsibility ? `Zuständig für: ${b.responsibility}` : null} />
            </div>
          ))}
        </section>
      ))}
      <p className="muted small">Trainer und Betreuer findest du bei den Mannschaften.</p>
    </div>
  );
}
