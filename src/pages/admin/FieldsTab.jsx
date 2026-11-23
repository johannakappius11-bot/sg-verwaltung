import { useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { COLOR_CHOICES, fieldColor } from '../../lib/colors.js';
import { ErrorBox, Field, Icon, Sheet } from '../../components/ui.jsx';
import { confirmDialog } from '../../components/dialog.jsx';

export default function FieldsTab() {
  const { data } = useApp();
  const [edit, setEdit] = useState(null);
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={() => setEdit({})}><Icon name="plus" /> Platz anlegen</button>
      <ul className="list">
        {data.fields.map((f, i) => (
          <li key={f.id} className="list-item">
            <i className="dot dot-lg" style={{ '--c': fieldColor(f, i) }} />
            <div className="grow"><div className="list-title">{f.name}</div><div className="muted small">{f.short_name} · {f.address || 'keine Adresse'}</div></div>
            <button className="icon-btn" onClick={() => setEdit(f)} aria-label="Bearbeiten"><Icon name="edit" /></button>
          </li>
        ))}
      </ul>
      {edit && <FieldForm field={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function FieldForm({ field, onClose }) {
  const { data, reloadData, toast } = useApp();
  const isNew = !field.id;
  const [f, setF] = useState({ name: field.name || '', short_name: field.short_name || '', address: field.address || '', color: fieldColor(field, data.fields.length), sort: field.sort ?? data.fields.length + 1 });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save() {
    if (!f.name.trim() || !f.short_name.trim()) return setError('Bitte Name und Kurzname angeben.');
    const row = { ...f, sort: Number(f.sort) || 0, address: f.address || null };
    try { if (isNew) await api.insert('fields', row); else await api.update('fields', field.id, row); await reloadData(); toast('Gespeichert'); onClose(); }
    catch (e) { setError(e.message); }
  }
  async function del() {
    if (!(await confirmDialog('Platz löschen? Alle regelmäßigen Termine auf diesem Platz werden ebenfalls gelöscht!'))) return;
    try { await api.remove('fields', field.id); await reloadData(); onClose(); } catch (e) { setError(e.message); }
  }
  return (
    <Sheet title={isNew ? 'Neuer Platz' : field.name} onClose={onClose}
      footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del}><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
      <div className="form">
        <Field label="Name"><input value={f.name} onChange={set('name')} placeholder="Sportplatz Scharmede" /></Field>
        <Field label="Kurzname (für den Umschalter)"><input value={f.short_name} onChange={set('short_name')} placeholder="Scharmede" /></Field>
        <Field label="Farbe im Plan">
          <div className="chip-wrap">
            {COLOR_CHOICES.map(([c, l]) => (
              <button type="button" key={c} className={`place-chip ${f.color === c ? 'on' : ''}`} aria-pressed={f.color === c}
                style={{ '--c': c, '--ct': 'transparent' }} onClick={() => setF((x) => ({ ...x, color: c }))}><i className="dot" />{l}</button>
            ))}
          </div>
        </Field>
        <Field label="Adresse"><input value={f.address} onChange={set('address')} /></Field>
        <Field label="Reihenfolge"><input type="number" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}
