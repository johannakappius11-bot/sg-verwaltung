import { useApp } from '../store.jsx';
import { Avatar, Empty, Icon, Link } from '../components/ui.jsx';

export default function TeamsPage() {
  const { data, contactsForTeam, fieldLabel } = useApp();
  const teams = data.teams.filter((t) => t.active);
  const groups = [...new Set(teams.map((t) => t.category || 'Weitere'))];
  return (
    <div className="page">
      <h1>Mannschaften</h1>
      {!teams.length && <Empty>Noch keine Mannschaften angelegt.</Empty>}
      {groups.map((g) => (
        <section key={g}>
          <h2 className="group-title">{g}</h2>
          <ul className="list">
            {teams.filter((t) => (t.category || 'Weitere') === g).map((t) => {
              const main = contactsForTeam(t.id)[0];
              return (
                <li key={t.id}>
                  <Link to={`/mannschaften/${t.id}`} className="list-item">
                    <Avatar person={main?.person} size={44} />
                    <div className="grow">
                      <div className="list-title">{t.name}</div>
                      <div className="muted small">{main ? `${main.role}: ${main.person.name}` : 'Kein Ansprechpartner'} · {t.home_field_id ? fieldLabel(t.home_field_id) : '–'}</div>
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
