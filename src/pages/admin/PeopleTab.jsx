// Personen und App-Konten in einer Liste (nur Admin)
import { useState } from 'react';
import { useApp } from '../../store.jsx';
import { Avatar, Icon } from '../../components/ui.jsx';
import PersonForm, { ROLE_LABEL } from '../../components/PersonForm.jsx';

export default function PeopleTab({ people, profiles, reloadPeople }) {
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('alle');
  const { data } = useApp();
  const profileOf = (p) => profiles.find((u) => u.id === p.user_id);
  const functionsOf = (p) => [
    ...data.contacts.filter((c) => c.person_id === p.id).map((c) => `${c.role} ${data.teams.find((t) => t.id === c.team_id)?.short_name || ''}`),
    ...data.board.filter((b) => b.person_id === p.id).map((b) => b.position),
  ].join(', ');
  const orphanProfiles = profiles.filter((u) => !people.some((p) => p.user_id === u.id));

  const shown = people.filter((p) => {
    const acc = profileOf(p);
    if (filter === 'konto' && !acc) return false;
    if (filter === 'ohne' && acc) return false;
    return `${p.name} ${p.email || ''} ${acc?.email || ''}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <div>
      <p className="muted small">Alle Personen – Trainer, Betreuer, Ansprechpartner und Mitglieder mit App-Konto. Antippen zum Bearbeiten, für Rolle und Konto.</p>
      <div className="toolbar">
        <input type="search" placeholder="Name oder E-Mail suchen …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Personen suchen" />
        <button className="btn btn-primary" onClick={() => setEdit({ person: {} })}><Icon name="plus" /> Person</button>
      </div>
      <div className="seg seg-sm" role="group" aria-label="Personen filtern">
        {[['alle', `Alle (${people.length})`], ['konto', `Mit App-Konto (${people.filter((p) => profileOf(p)).length})`], ['ohne', 'Ohne Konto']].map(([k, l]) => (
          <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      <ul className="list">
        {shown.map((p) => {
          const acc = profileOf(p);
          return (
            <li key={p.id} className="list-item" onClick={() => setEdit({ person: p, profile: acc })}>
              <Avatar person={{ name: p.name }} size={40} />
              <div className="grow">
                <div className="list-title">{p.name} {acc && <span className={`badge role-${acc.role}`}>{ROLE_LABEL[acc.role] || acc.role}</span>}</div>
                <div className="muted small">{acc ? acc.email : 'kein App-Konto'}</div>
                <div className="muted small">{functionsOf(p) || 'ohne Funktion'} · {p.consent ? 'Einwilligung ✓' : 'nur Name sichtbar'}</div>
              </div>
              <Icon name="right" />
            </li>
          );
        })}
      </ul>
      {orphanProfiles.length > 0 && (
        <>
          <h3>Konten ohne Personeneintrag</h3>
          <ul className="list">
            {orphanProfiles.map((u) => (
              <li key={u.id} className="list-item" onClick={() => setEdit({ person: { name: u.email, user_id: u.id }, profile: u })}>
                <div className="grow"><div className="list-title">{u.email}</div><div className="muted small">{ROLE_LABEL[u.role]}</div></div>
                <Icon name="right" />
              </li>
            ))}
          </ul>
        </>
      )}
      {edit && <PersonForm person={edit.person} profile={edit.profile} onClose={() => setEdit(null)} onSaved={reloadPeople} />}
    </div>
  );
}
