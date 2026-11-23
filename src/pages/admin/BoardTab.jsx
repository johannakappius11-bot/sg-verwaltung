import { useState } from 'react';
import { api } from '../../data/api.js';
import { config } from '../../config.js';
import { useApp } from '../../store.jsx';
import { ErrorBox, Field, Icon, Sheet } from '../../components/ui.jsx';
import { confirmDialog } from '../../components/dialog.jsx';
import PersonForm from '../../components/PersonForm.jsx';

export default function BoardTab({ people, reloadPeople }) {
  const { data, personById, isAdmin } = useApp();
  const [edit, setEdit] = useState(null);
  return (
    <div>
      {!isAdmin && <p className="muted small">Als Vorstand pflegst du hier die Ansprechpartner. Neue Personen legst du direkt im Formular an.</p>}
      <button className="btn btn-primary btn-block" onClick={() => setEdit({})}><Icon name="plus" /> Ansprechpartner hinzufügen</button>
      <ul className="list">
        {data.board.map((b) => (
          <li key={b.id} className="list-item">
            <div className="grow">
              <div className="list-title">{personById[b.person_id]?.name}</div>
              <div className="muted small">{b.category || 'Vorstand'} · {b.position} · {b.club}{b.responsibility ? ` · ${b.responsibility}` : ''}</div>
            </div>
            <button className="icon-btn" onClick={() => setEdit(b)} aria-label="Bearbeiten"><Icon name="edit" /></button>
          </li>
        ))}
      </ul>
      <p className="muted small">Telefon, E-Mail und Foto werden nur angezeigt, wenn die Person eingewilligt hat.</p>
      {edit && <BoardForm entry={edit} people={people} reloadPeople={reloadPeople} onClose={() => setEdit(null)} />}
    </div>
  );
}

function BoardForm({ entry, people, reloadPeople, onClose }) {
  const { data, reloadData, toast } = useApp();
  const isNew = !entry.id;
  const [f, setF] = useState({ person_id: entry.person_id || '', position: entry.position || '', category: entry.category || config.contactGroups[0], club: entry.club || config.clubs[0], responsibility: entry.responsibility || '', sort: entry.sort ?? data.board.length + 1 });
  const [error, setError] = useState('');
  const [personForm, setPersonForm] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const person = people.find((p) => p.id === f.person_id);
  async function save() {
    if (!f.person_id || !f.position.trim()) return setError('Bitte Person und Funktion angeben.');
    const row = { ...f, sort: Number(f.sort) || 0, responsibility: f.responsibility || null };
    try { if (isNew) await api.insert('board_members', row); else await api.update('board_members', entry.id, row); await reloadData(); toast('Gespeichert'); onClose(); }
    catch (e) { setError(e.message); }
  }
  async function del() {
    if (!(await confirmDialog('Eintrag entfernen? (Die Person selbst bleibt erhalten.)'))) return;
    try { await api.remove('board_members', entry.id); await reloadData(); onClose(); } catch (e) { setError(e.message); }
  }
  return (
    <>
      <Sheet title={isNew ? 'Neuer Ansprechpartner' : 'Eintrag bearbeiten'} onClose={onClose}
        footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del} aria-label="Eintrag entfernen"><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
        <div className="form">
          <Field label="Person">
            <select id="board-person" value={f.person_id} onChange={set('person_id')}>
              <option value="">Bitte wählen …</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <div className="row gap wrap">
            <button type="button" className="btn btn-sm" onClick={() => setPersonForm({})}><Icon name="plus" size={16} /> Neue Person anlegen</button>
            {person && <button type="button" className="btn btn-sm" onClick={() => setPersonForm(person)}><Icon name="edit" size={16} /> {person.user_id ? 'Person ansehen' : 'Telefon/Foto bearbeiten'}</button>}
          </div>
          <Field label="Bereich">
            <select id="board-category" value={f.category} onChange={set('category')}>
              {config.contactGroups.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Funktion"><input id="board-position" value={f.position} onChange={set('position')} placeholder="z. B. 1. Vorsitzender, Platzwart, Zeugwart" /></Field>
          <Field label="Verein">
            <select id="board-club" value={f.club} onChange={set('club')}>
              {[...config.clubs, config.title].map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Zuständig für"><input id="board-resp" value={f.responsibility} onChange={set('responsibility')} placeholder="z. B. Platzbelegung, Flutlicht, Trikots" /></Field>
          <Field label="Reihenfolge"><input id="board-sort" type="number" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
          <ErrorBox error={error} />
        </div>
      </Sheet>
      {personForm && <PersonForm person={personForm} onClose={() => setPersonForm(null)}
        onSaved={async (saved) => { await reloadPeople(); if (saved?.id) setF((x) => ({ ...x, person_id: saved.id })); }} />}
    </>
  );
}
