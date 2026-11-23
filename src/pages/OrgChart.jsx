// Organigramm: Vorstandsposten je Verein (Scharmede, Thüle).
// Aufbau: Verein → 1. Vorsitz → weitere Vorstandsposten (2. Vorsitz zuerst, dann nach Reihenfolge).
import { useState } from 'react';
import { config } from '../config.js';
import { useApp } from '../store.jsx';
import { Avatar, Empty, PersonCard, Sheet } from '../components/ui.jsx';

const isFirstChair = (pos = '') => /^\s*1\.?\s*vorsitz/i.test(pos);
const isSecondChair = (pos = '') => /^\s*2\.?\s*vorsitz/i.test(pos);

function Node({ entry, onOpen, lead }) {
  const { personById } = useApp();
  const person = personById[entry.person_id];
  return (
    <button className={`org-node ${lead ? 'lead' : ''}`} onClick={() => onOpen(entry)}>
      <Avatar person={person} size={lead ? 44 : 36} />
      <span className="org-text">
        <span className="org-pos">{entry.position}</span>
        <span className="org-name">{person?.name || '–'}</span>
      </span>
    </button>
  );
}

function ClubTree({ club, entries, onOpen }) {
  const chair = entries.find((e) => isFirstChair(e.position));
  const rest = entries.filter((e) => e !== chair)
    .sort((a, b) => (isSecondChair(b.position) - isSecondChair(a.position)) || a.sort - b.sort);
  const top = chair || null;
  const below = top ? rest : entries;
  return (
    <section className="org-club">
      <div className="org-root">{club.value}</div>
      {entries.length === 0 ? <p className="org-empty">Noch keine Vorstandsposten eingetragen.</p> : (
        <ul className="org-tree">
          {top ? (
            <li>
              <Node entry={top} onOpen={onOpen} lead />
              {below.length > 0 && (
                <ul>{below.map((e) => <li key={e.id}><Node entry={e} onOpen={onOpen} /></li>)}</ul>
              )}
            </li>
          ) : below.map((e) => <li key={e.id}><Node entry={e} onOpen={onOpen} /></li>)}
        </ul>
      )}
    </section>
  );
}

export default function OrgChart() {
  const { data, personById } = useApp();
  const [open, setOpen] = useState(null);
  const board = data.board.filter((b) => (b.category || 'Vorstand') === 'Vorstand');
  const any = config.clubFilter.some((c) => board.some((b) => b.club === c.value));
  return (
    <div>
      <p className="muted small">Vorstandsposten der beiden Vereine. Antippen zeigt die Kontaktdaten.</p>
      {!any && <Empty>Noch keine Vorstandsposten eingetragen. Admins und Vorstand pflegen sie unter Verwalten → Ansprechpartner (Bereich „Vorstand“).</Empty>}
      <div className="org-grid">
        {config.clubFilter.map((c) => (
          <ClubTree key={c.value} club={c} entries={board.filter((b) => b.club === c.value)} onOpen={setOpen} />
        ))}
      </div>
      {open && (
        <Sheet title={open.position} onClose={() => setOpen(null)}>
          <p className="muted small">{open.club}</p>
          <PersonCard person={personById[open.person_id]} subtitle={open.responsibility ? `Zuständig für: ${open.responsibility}` : null} />
        </Sheet>
      )}
    </div>
  );
}
