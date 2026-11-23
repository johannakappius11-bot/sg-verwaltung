import { config } from '../config.js';
import { useApp } from '../store.jsx';
import { Avatar, Empty, Icon, Link } from '../components/ui.jsx';
import ListFilter, { clubLabel, matchesClub, norm, usePersistentFilter } from '../components/ListFilter.jsx';

export default function TeamsPage() {
  const { data, contactsForTeam, fieldLabel, fieldById, siteColor } = useApp();
  const [filter, setFilter] = usePersistentFilter('platzplan-teams-filter', { q: '', club: [], cat: [], site: [] });
  const teams = data.teams.filter((t) => t.active);
  const categories = [...new Set(teams.map((t) => t.category || 'Weitere'))];

  const shown = teams.filter((t) => {
    if (!matchesClub(t.club, filter.club)) return false;
    if (filter.cat.length && !filter.cat.includes(t.category || 'Weitere')) return false;
    if (filter.site.length && !filter.site.includes(fieldById[t.home_field_id]?.site_id)) return false;
    if (filter.q) {
      const hay = norm([t.name, t.short_name, ...contactsForTeam(t.id).map((c) => c.person.name)].join(' '));
      if (!norm(filter.q).split(/\s+/).every((w) => hay.includes(w))) return false;
    }
    return true;
  });
  const groups = categories.filter((g) => shown.some((t) => (t.category || 'Weitere') === g));

  return (
    <div className="page">
      <h1>Mannschaften</h1>
      <ListFilter id="teams" value={filter} onChange={setFilter} count={shown.length} total={teams.length}
        placeholder="Mannschaft oder Trainer suchen …"
        groups={[
          { key: 'club', label: 'Verein', options: config.clubFilter.map((c) => ({ value: c.value, label: c.label })) },
          { key: 'cat', label: 'Bereich', options: categories.map((c) => ({ value: c, label: c })) },
          { key: 'site', label: 'Heimplatz', options: data.sites.map((x) => ({ value: x.id, label: x.short_name, color: siteColor(x.id) })) },
        ]} />
      {!teams.length && <Empty>Noch keine Mannschaften angelegt.</Empty>}
      {teams.length > 0 && !shown.length && <Empty>Keine Mannschaft passt zu diesem Filter.</Empty>}
      {groups.map((g) => (
        <section key={g}>
          <h2 className="group-title">{g}</h2>
          <ul className="list">
            {shown.filter((t) => (t.category || 'Weitere') === g).map((t) => {
              const contacts = contactsForTeam(t.id);
              const main = contacts[0];
              return (
                <li key={t.id}>
                  <Link to={`/mannschaften/${t.id}`} className="list-item">
                    <Avatar person={main?.person} size={44} />
                    <div className="grow">
                      <div className="list-title">{t.name} {t.club && <span className={`badge ${clubLabel(t.club) === 'SG' ? 'badge-sg' : ''}`}>{clubLabel(t.club)}</span>}</div>
                      <div className="muted small">{main ? `${main.role}: ${main.person.name}${contacts.length > 1 ? ` +${contacts.length - 1}` : ''}` : 'Kein Ansprechpartner'}</div>
                      <div className="muted small"><i className="dot dot-sm" style={{ '--c': siteColor(fieldById[t.home_field_id]?.site_id) }} /> {t.home_field_id ? fieldLabel(t.home_field_id) : '–'}</div>
                    </div>
                    <Icon name="right" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
