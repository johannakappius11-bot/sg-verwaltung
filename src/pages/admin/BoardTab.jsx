import { useState } from 'react';
import { api } from '../../data/api.js';
import { config } from '../../config.js';
import { useApp } from '../../store.jsx';
import { ErrorBox, Field, Icon, Sheet } from '../../components/ui.jsx';

export default function BoardTab({ people }) {
  const { data, personById } = useApp();
  const [edit, setEdit] = useState(null);
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={() => setEdit({})}><Icon name="plus" /> Vorstandsmitglied hinzufügen</button>
      <ul className="list">
        {data.board.map((b) => (
          <li key={b.id} className="list-item">
            <div className="grow">
              <div className="list-title">{personById[b.person_id]?.name}</div>
              <div className="muted small">{b.position} · {b.club}{b.responsibility ? ` · ${b.responsibility}` : ''}</div>
            </div>
            <button className="icon-btn" onClick={() => setEdit(b)} aria-label="Bearbeiten"><Icon name="edit" /></button>
          </li>
        ))}
      </ul>
      <p className="muted small">Telefon, E-Mail und Foto werden nur angezeigt, wenn die Person eingewilligt hat (Verwaltung → Personen bzw. im eigenen Profil).</p>
      {edit && <BoardForm entry={edit} people={people} onClose={() => setEdit(null)} />}
    </div>
  );
}

function BoardForm({ entry, people, onClose }) {
  const { data, reloadData, toast } = useApp();
  const isNew = !entry.id;
  const [f, setF] = useState({ person_id: entry.person_id || '', position: entry.position || '', club: entry.club || config.clubs[0], responsibility: entry.responsibility || '', sort: entry.sort ?? data.board.length + 1 });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save() {
    if (!f.person_id || !f.position.trim()) return setError('Bitte Person und Amt angeben.');
    const row = { ...f, sort: Number(f.sort) || 0, responsibility: f.responsibility || null };
    try { if (isNew) await api.insert('board_members', row); else await api.update('board_members', entry.id, row); await reloadData(); toast('Gespeichert'); onClose(); }
    catch (e) { setError(e.message); }
  }
  async function del() {
    if (!confirm('Eintrag entfernen? (Die Person selbst bleibt erhalten.)')) return;
    try { await api.remove('board_members', entry.id); await reloadData(); onClose(); } catch (e) { setError(e.message); }
  }
  return (
    <Sheet title={isNew ? 'Vorstandsmitglied' : 'Eintrag bearbeiten'} onClose={onClose}
      footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del}><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
      <div className="form">
        <Field label="Person" hint="Neue Personen unter „Personen“ anlegen.">
          <select value={f.person_id} onChange={set('person_id')}>
            <option value="">Bitte wählen …</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Amt"><input value={f.position} onChange={set('position')} placeholder="z. B. 1. Vorsitzender" /></Field>
        <Field label="Verein">
          <select value={f.club} onChange={set('club')}>
            {[...config.clubs, config.title].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Zuständig für"><input value={f.responsibility} onChange={set('responsibility')} placeholder="z. B. Platzbelegung, Jugend" /></Field>
        <Field label="Reihenfolge"><input type="number" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}
