import { useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { ErrorBox, Field, Icon, Sheet } from '../../components/ui.jsx';
import { confirmDialog } from '../../components/dialog.jsx';

export default function TeamsTab({ people }) {
  const { data, contactsForTeam, fieldLabel } = useApp();
  const [edit, setEdit] = useState(null);
  return (
    <div>
      <button className="btn btn-primary btn-block" onClick={() => setEdit({})}><Icon name="plus" /> Mannschaft anlegen</button>
      <ul className="list">
        {data.teams.map((t) => (
          <li key={t.id} className={`list-item ${t.active ? '' : 'dim'}`}>
            <div className="grow">
              <div className="list-title">{t.name}{!t.active && ' (inaktiv)'}</div>
              <div className="muted small">{t.category || '–'} · {t.home_field_id ? fieldLabel(t.home_field_id) : 'kein Heimplatz'} · {contactsForTeam(t.id).map((c) => c.person.name).join(', ') || 'keine Ansprechpartner'}</div>
            </div>
            <button className="icon-btn" onClick={() => setEdit(t)} aria-label="Bearbeiten"><Icon name="edit" /></button>
          </li>
        ))}
      </ul>
      {edit && <TeamForm team={edit} people={people} onClose={() => setEdit(null)} />}
    </div>
  );
}

function TeamForm({ team, people, onClose }) {
  const { data, reloadData, toast, contactsForTeam, fieldLabel } = useApp();
  const isNew = !team.id;
  const [f, setF] = useState({
    name: team.name || '', short_name: team.short_name || '', category: team.category || 'Junioren',
    home_field_id: team.home_field_id || data.fields[0]?.id || '', active: team.active ?? true,
    sort: team.sort ?? data.teams.length + 1, fussballde_widget_id: team.fussballde_widget_id || '', ical_url: team.ical_url || '',
  });
  const [error, setError] = useState('');
  const [newContact, setNewContact] = useState({ person_id: '', role: 'Trainer' });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const contacts = team.id ? contactsForTeam(team.id) : [];

  async function save() {
    if (!f.name.trim()) return setError('Bitte einen Namen eingeben.');
    const row = { ...f, name: f.name.trim(), short_name: f.short_name.trim() || f.name.trim().slice(0, 8), sort: Number(f.sort) || 0,
      home_field_id: f.home_field_id || null, fussballde_widget_id: f.fussballde_widget_id.trim() || null, ical_url: f.ical_url.trim() || null };
    try {
      if (isNew) await api.insert('teams', row); else await api.update('teams', team.id, row);
      await reloadData(); toast('Gespeichert'); onClose();
    } catch (e) { setError(e.message); }
  }
  async function del() {
    if (!(await confirmDialog(`Mannschaft „${team.name}" mit allen Terminen löschen? Tipp: Stattdessen „aktiv" abwählen, dann bleiben die Daten erhalten.`))) return;
    try { await api.remove('teams', team.id); await reloadData(); toast('Gelöscht'); onClose(); } catch (e) { setError(e.message); }
  }
  async function addContact() {
    if (!newContact.person_id) return;
    try {
      await api.insert('team_contacts', { team_id: team.id, person_id: newContact.person_id, role: newContact.role || 'Trainer', is_primary: contacts.length === 0, sort: contacts.length });
      setNewContact({ person_id: '', role: 'Trainer' }); await reloadData();
    } catch (e) { setError(e.message); }
  }

  return (
    <Sheet title={isNew ? 'Neue Mannschaft' : team.name} onClose={onClose}
      footer={<div className="row gap">{!isNew && <button className="btn btn-danger" onClick={del}><Icon name="trash" /></button>}<button className="btn btn-primary grow" onClick={save}>Speichern</button></div>}>
      <div className="form">
        <Field label="Name"><input value={f.name} onChange={set('name')} placeholder="z. B. D-Jugend (U13)" /></Field>
        <Field label="Kurzname (für den Kalender)" hint="max. ca. 7 Zeichen"><input value={f.short_name} onChange={set('short_name')} maxLength={12} /></Field>
        <Field label="Bereich">
          <select value={f.category} onChange={set('category')}>
            {['Senioren', 'Frauen', 'Junioren', 'Juniorinnen', 'Weitere'].map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Heimplatz">
          <select value={f.home_field_id} onChange={set('home_field_id')}>
            <option value="">–</option>
            {data.fields.map((fl) => <option key={fl.id} value={fl.id}>{fieldLabel(fl.id, { long: true })}</option>)}
          </select>
        </Field>
        <Field label="Reihenfolge"><input type="number" inputMode="numeric" value={f.sort} onChange={set('sort')} /></Field>
        <label className="check"><input type="checkbox" checked={f.active} onChange={set('active')} /><span>Aktiv (wird in der Übersicht angezeigt)</span></label>
        <Field label="fussball.de Widget-ID (optional)" hint="Auf fussball.de unter „Widgets“ für die Adresse dieser App erzeugen und die ID hier eintragen.">
          <input value={f.fussballde_widget_id} onChange={set('fussballde_widget_id')} autoCapitalize="none" />
        </Field>
        <Field label="Kalender-Abo für Spiele (iCal-Adresse, optional)" hint="Beginnt meist mit https:// oder webcal:// und endet oft auf .ics">
          <input value={f.ical_url} onChange={set('ical_url')} inputMode="url" autoCapitalize="none" />
        </Field>

        {!isNew && (
          <>
            <h3>Ansprechpartner</h3>
            <ul className="list">
              {contacts.map((c) => (
                <li key={c.id} className="list-item">
                  <div className="grow"><div className="list-title">{c.person.name}{c.is_primary && ' ★'}</div><div className="muted small">{c.role}</div></div>
                  {!c.is_primary && <button className="btn btn-sm" onClick={async () => {
                    for (const o of contacts) if (o.is_primary) await api.update('team_contacts', o.id, { is_primary: false });
                    await api.update('team_contacts', c.id, { is_primary: true }); await reloadData();
                  }}>Haupt-Kontakt</button>}
                  <button className="icon-btn" aria-label="Entfernen" onClick={async () => { await api.remove('team_contacts', c.id); await reloadData(); }}><Icon name="trash" /></button>
                </li>
              ))}
            </ul>
            <div className="row gap wrap">
              <select value={newContact.person_id} onChange={(e) => setNewContact((x) => ({ ...x, person_id: e.target.value }))} className="grow" aria-label="Person">
                <option value="">Person wählen …</option>
                {people.filter((p) => !contacts.some((c) => c.person_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={newContact.role} onChange={(e) => setNewContact((x) => ({ ...x, role: e.target.value }))} aria-label="Funktion">
                {['Trainer', 'Trainerin', 'Co-Trainer', 'Co-Trainerin', 'Betreuer', 'Betreuerin'].map((r) => <option key={r}>{r}</option>)}
              </select>
              <button className="btn" onClick={addContact} disabled={!newContact.person_id}>Hinzufügen</button>
            </div>
            <p className="muted small">Fehlt jemand? Unter „Personen“ anlegen. Trainer mit App-Konto dürfen die Termine dieser Mannschaft pflegen, wenn ihre Rolle „Trainer“ ist.</p>
          </>
        )}
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}
