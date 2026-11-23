// Sportanlagen (Orte mit Farbe) und ihre Plätze (buchbare Ressourcen) verwalten
import { useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { COLOR_CHOICES } from '../../lib/colors.js';
import { ErrorBox, Field, Icon, Sheet } from '../../components/ui.jsx';
import { confirmDialog } from '../../components/dialog.jsx';

export default function FieldsTab() {
  const { data, fieldsOfSite, siteColor } = useApp();
  const [editSite, setEditSite] = useState(null);
  const [editField, setEditField] = useState(null);
  const orphans = data.fields.filter((f) => !data.sites.some((x) => x.id === f.site_id));
  return (
    <div>
      <p className="muted small">Eine <strong>Sportanlage</strong> ist ein Ort (z. B. Thüle) mit eigener Farbe im Plan.
        Jede Anlage hat einen oder mehrere <strong>Plätze</strong>. Doppelbelegungen werden pro Platz geprüft.</p>
      {data.sites.map((x) => (
        <section key={x.id} className="card site-card">
          <div className="row gap">
            <i className="dot dot-lg" style={{ '--c': siteColor(x.id) }} />
            <div className="grow">
              <div className="list-title">{x.name}</div>
              <div className="muted small">Kurz: {x.short_name}{x.address ? ` · ${x.address}` : ''}</div>
            </div>
            <button className="icon-btn" onClick={() => setEditSite(x)} aria-label={`${x.short_name} bearbeiten`}><Icon name="edit" /></button>
          </div>
          <ul className="list list-inner">
            {fieldsOfSite(x.id).map((f) => (
              <li key={f.id} className="list-item">
                <div className="grow"><div>{f.name}</div><div className="muted small">Kürzel im Plan: {f.short_name}</div></div>
                <button className="icon-btn" onClick={() => setEditField(f)} aria-label={`${f.name} bearbeiten`}><Icon name="edit" /></button>
              </li>
            ))}
          </ul>
          <button className="btn btn-sm" onClick={() => setEditField({ site_id: x.id })}><Icon name="plus" size={16} /> Platz hinzufügen</button>
        </section>
      ))}
      {orphans.length > 0 && <div className="alert alert-warn small">Plätze ohne Sportanlage: {orphans.map((f) => f.name).join(', ')} – bitte bearbeiten und einer Anlage zuordnen.</div>}
      <button className="btn btn-primary btn-block" onClick={() => setEditSite({})}><Icon name="plus" /> Sportanlage anlegen</button>
      {editSite && <SiteForm site={editSite} onClose={() => setEditSite(null)} />}
      {editField && <FieldForm field={editField} onClose={() => setEditField(null)} />}
    </div>
  );
}

function SiteForm({ site, onClose }) {
  const { data, reloadData, toast, siteColor } = useApp();
  const isNew = !site.id;
  const [f, setF] = useState({
    name: site.name || '', short_name: site.short_name || '', address: site.address || '',
    color: site.id ? siteColor(site.id) : COLOR_CHOICES[data.sites.length % COLOR_CHOICES.length][0], sort: site.sort ?? data.sites.length + 1,
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save() {
    if (!f.name.trim() || !f.short_name.trim()) return setError('Bitte Name und Kurzname angeben.');
    const row = { ...f, name: f.name.trim(), short_name: f.short_name.trim(), sort: Number(f.sort) || 0, address: f.address || null };
    try {
      if (isNew) {
        const created = await api.insert('sites', row);
        // Jede neue Anlage startet mit einem Platz
        await api.insert('fields', { site_id: created.id, name: 'Fußballplatz', short_name: 'Platz', sort: data.fields.length + 1 });
      } else await api.update('sites', site.id, row);
      await reloadData(); toast('Gespeichert'); onClose();
    } catch (e) { setError(e.message); }
  }
  async function del() {
    if (!(await confirmDialog(`Sportanlage „${site.name}" löschen? Alle Plätze dieser Anlage und deren regelmäßige Termine werden ebenfalls gelöscht!`, { confirmLabel: 'Löschen', danger: true }))) return;
    try { await api.remove('sites', site.id); await reloadData(); onClose(); } catch (e) { setError(e.message); }
  }
  return (
    <Sheet title={isNew ? 'Neue Sportanlage' : site.name} onClose={onClose}
      footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del} aria-label="Löschen"><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
      <div className="form">
        <Field label="Name"><input id="site-name" value={f.name} onChange={set('name')} placeholder="Sportanlage Thüle" /></Field>
        <Field label="Kurzname (im Plan und Filter)"><input id="site-short" value={f.short_name} onChange={set('short_name')} placeholder="Thüle" /></Field>
        <Field label="Farbe im Plan">
          <div className="chip-wrap">
            {COLOR_CHOICES.map(([c, l]) => (
              <button type="button" key={c} className={`place-chip ${f.color === c ? 'on' : ''}`} aria-pressed={f.color === c}
                style={{ '--c': c, '--ct': 'transparent' }} onClick={() => setF((x) => ({ ...x, color: c }))}><i className="dot" />{l}</button>
            ))}
          </div>
        </Field>
        <Field label="Adresse"><input id="site-address" value={f.address} onChange={set('address')} /></Field>
        <Field label="Reihenfolge"><input id="site-sort" type="number" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}

function FieldForm({ field, onClose }) {
  const { data, reloadData, toast } = useApp();
  const isNew = !field.id;
  const [f, setF] = useState({ site_id: field.site_id || data.sites[0]?.id || '', name: field.name || '', short_name: field.short_name || '', sort: field.sort ?? data.fields.length + 1 });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  async function save() {
    if (!f.site_id || !f.name.trim()) return setError('Bitte Sportanlage und Namen angeben.');
    const row = { ...f, name: f.name.trim(), short_name: (f.short_name.trim() || f.name.trim()).slice(0, 6), sort: Number(f.sort) || 0 };
    try { if (isNew) await api.insert('fields', row); else await api.update('fields', field.id, row); await reloadData(); toast('Gespeichert'); onClose(); }
    catch (e) { setError(e.message); }
  }
  async function del() {
    if (data.fields.filter((x) => x.site_id === field.site_id).length <= 1) return setError('Eine Sportanlage braucht mindestens einen Platz. Lösche stattdessen die ganze Anlage.');
    if (!(await confirmDialog(`„${field.name}" löschen? Alle regelmäßigen Termine auf diesem Platz werden ebenfalls gelöscht!`, { confirmLabel: 'Löschen', danger: true }))) return;
    try { await api.remove('fields', field.id); await reloadData(); onClose(); } catch (e) { setError(e.message); }
  }
  return (
    <Sheet title={isNew ? 'Neuer Platz' : field.name} onClose={onClose}
      footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del} aria-label="Löschen"><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
      <div className="form">
        <Field label="Sportanlage">
          <select id="field-site" value={f.site_id} onChange={set('site_id')}>
            {data.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Name des Platzes"><input id="field-name" value={f.name} onChange={set('name')} placeholder="z. B. Platz 1, Rasenplatz, Kunstrasen" /></Field>
        <Field label="Kürzel im Kalender (max. 6 Zeichen)" hint="Wird nur angezeigt, wenn die Anlage mehrere Plätze hat.">
          <input id="field-short" value={f.short_name} onChange={set('short_name')} maxLength={6} placeholder="P1" />
        </Field>
        <Field label="Reihenfolge"><input id="field-sort" type="number" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}
