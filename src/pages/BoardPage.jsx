import { useApp } from '../store.jsx';
import { Empty, PersonCard } from '../components/ui.jsx';

export default function BoardPage() {
  const { data, personById } = useApp();
  const clubs = [...new Set(data.board.map((b) => b.club || 'Vorstand'))];
  return (
    <div className="page">
      <h1>Vorstand</h1>
      {!data.board.length && <Empty>Noch keine Vorstandsmitglieder eingetragen.</Empty>}
      {clubs.map((c) => (
        <section key={c}>
          <h2 className="group-title">{c}</h2>
          {data.board.filter((b) => (b.club || 'Vorstand') === c).map((b) => (
            <div key={b.id} className="card">
              <div className="card-kicker">{b.position}</div>
              <PersonCard person={personById[b.person_id]} subtitle={b.responsibility ? `Zuständig für: ${b.responsibility}` : null} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
