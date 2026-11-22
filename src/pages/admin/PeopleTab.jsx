import { useEffect, useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { Avatar, ErrorBox, Field, Icon, Sheet } from '../../components/ui.jsx';
import PhotoInput from '../../components/PhotoInput.jsx';
import { confirmDialog } from '../../components/dialog.jsx';

export default function PeopleTab({ people, reloadPeople }) {
  const [edit, setEdit] = useState(null);
  const [q, setQ] = useState('');
  const { data } = useApp();
  const shown = people.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const roleOf = (p) => [
    ...data.contacts.filter((c) => c.person_id === p.id).map((c) => `${c.role} ${data.teams.find((t) => t.id === c.team_id)?.short_name || ''}`),
    ...data.board.filter((b) => b.person_id === p.id).map((b) => b.position),
  ].join(', ');
  return (
    <div>
      <p className="muted small">Personen sind Trainer, Betreuer und Vorstandsmitglieder – mit oder ohne eigenes App-Konto.</p>
      <div className="toolbar">
        <input type="search" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Personen suchen" />
        <button className="btn btn-primary" onClick={() => setEdit({})}><Icon name="plus" /> Person</button>
      </div>
      <ul className="list">
        {shown.map((p) => (
          <li key={p.id} className="list-item" onClick={() => setEdit(p)}>
            <Avatar person={{ name: p.name }} size={40} />
            <div className="grow">
              <div className="list-title">{p.name} {p.user_id && <span className="badge">App-Konto</span>}</div>
              <div className="muted small">{roleOf(p) || 'ohne Funktion'} · {p.consent ? 'Einwilligung ✓' : 'nur Name sichtbar'}</div>
            </div>
            <Icon name="right" />
          </li>
        ))}
      </ul>
      {edit && <PersonForm person={edit} onClose={() => setEdit(null)} onSaved={reloadPeople} />}
    </div>
  );
}

function PersonForm({ person, onClose, onSaved }) {
  const { reloadData, toast } = useApp();
  const isNew = !person.id;
  const [f, setF] = useState({ name: person.name || '', phone: person.phone || '', email: person.email || '', consent: !!person.consent, photo_path: person.photo_path || null });
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  useEffect(() => { if (f.photo_path) api.photoUrls([f.photo_path]).then((m) => setPhotoUrl(m[f.photo_path])); else setPhotoUrl(null); }, [f.photo_path]);

  async function save() {
    if (!f.name.trim()) return setError('Bitte einen Namen eingeben.');
    const row = { name: f.name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null, consent: f.consent, photo_path: f.photo_path };
    try {
      if (isNew) await api.insert('people', row); else await api.update('people', person.id, row);
      if (person.photo_path && person.photo_path !== f.photo_path) api.deletePhoto(person.photo_path);
      await onSaved(); await reloadData(); toast('Gespeichert'); onClose();
    } catch (e) { setError(e.message); }
  }
  async function del() {
    if (!(await confirmDialog(`„${person.name}" löschen? Die Person wird auch als Ansprechpartner und aus dem Vorstand entfernt.`))) return;
    try { await api.remove('people', person.id); if (person.photo_path) api.deletePhoto(person.photo_path); await onSaved(); await reloadData(); onClose(); } catch (e) { setError(e.message); }
  }

  return (
    <Sheet title={isNew ? 'Neue Person' : person.name} onClose={onClose}
      footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del}><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
      <div className="form">
        {person.user_id && <div className="alert alert-info small">Diese Person hat ein eigenes App-Konto und kann ihre Daten und ihre Einwilligung selbst im Profil pflegen.</div>}
        <Field label="Name"><input value={f.name} onChange={set('name')} /></Field>
        <Field label="Telefon"><input type="tel" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Kontakt-E-Mail" hint="Wird die Person später eingeladen und meldet sich mit dieser Adresse an, wird ihr Konto automatisch verknüpft.">
          <input type="email" value={f.email} onChange={set('email')} autoCapitalize="none" />
        </Field>
        <div className="photo-row">
          {photoUrl ? <img className="avatar" src={photoUrl} alt="" style={{ width: 64, height: 64 }} /> : <Avatar person={{ name: f.name }} size={64} />}
          <div className="col gap-s">
            <PhotoInput folder="admin" label={f.photo_path ? 'Foto ersetzen' : 'Foto hochladen'} onUploaded={(path) => setF((x) => ({ ...x, photo_path: path }))} />
            {f.photo_path && <button className="btn btn-danger" onClick={() => setF((x) => ({ ...x, photo_path: null }))}>Foto entfernen</button>}
          </div>
        </div>
        <div className="consent-box">
          <label className="check">
            <input type="checkbox" checked={f.consent} onChange={set('consent')} />
            <span><strong>Einwilligung liegt vor:</strong> Foto, Telefon und Kontakt-E-Mail dürfen angezeigt werden.</span>
          </label>
          <p className="muted small">Nur ankreuzen, wenn die Person nachweisbar zugestimmt hat (z. B. schriftlich oder per E-Mail – bitte aufbewahren). Ohne Häkchen wird nur der Name angezeigt.</p>
        </div>
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}
