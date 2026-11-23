// Formular für eine Person (Trainer, Ansprechpartner …), optional mit Verwaltung des App-Kontos (nur Admin)
import { useEffect, useState } from 'react';
import { api } from '../data/api.js';
import { useApp } from '../store.jsx';
import { Avatar, ErrorBox, Field, Icon, Sheet } from './ui.jsx';
import PhotoInput from './PhotoInput.jsx';
import { confirmDialog } from './dialog.jsx';

export const ROLE_LABEL = { member: 'Mitglied', trainer: 'Trainer', board: 'Vorstand', admin: 'Admin' };
const ROLE_HINT = {
  member: 'sieht alles, kann nichts ändern',
  trainer: 'pflegt Termine seiner Mannschaften',
  board: 'pflegt Ansprechpartner',
  admin: 'darf alles',
};

// profile: App-Konto der Person (nur für Admins übergeben), onSaved(row) bekommt den gespeicherten Eintrag
export default function PersonForm({ person, profile, onClose, onSaved }) {
  const { reloadData, toast, me, isAdmin, data } = useApp();
  const isNew = !person.id;
  const [f, setF] = useState({ name: person.name || '', phone: person.phone || '', email: person.email || '', consent: !!person.consent, photo_path: person.photo_path || null });
  const [role, setRole] = useState(profile?.role || 'member');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  useEffect(() => { if (f.photo_path) api.photoUrls([f.photo_path]).then((m) => setPhotoUrl(m[f.photo_path])); else setPhotoUrl(null); }, [f.photo_path]);

  const isSelf = profile && profile.id === me.id;
  const ownAccount = !!person.user_id;
  const readOnly = ownAccount && !isAdmin; // Vorstand darf Personen mit eigenem Konto nicht ändern
  const teamsOf = data.contacts.filter((c) => c.person_id === person.id).map((c) => data.teams.find((t) => t.id === c.team_id)?.name).filter(Boolean);

  async function save() {
    if (!f.name.trim()) return setError('Bitte einen Namen eingeben.');
    setBusy(true); setError('');
    const row = { name: f.name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null, consent: f.consent, photo_path: f.photo_path };
    if (isNew && person.user_id) row.user_id = person.user_id; // Konto ohne Personeneintrag verknüpfen
    try {
      const saved = isNew ? await api.insert('people', row) : await api.update('people', person.id, row);
      if (profile && role !== profile.role) await api.update('profiles', profile.id, { role });
      if (person.photo_path && person.photo_path !== f.photo_path) api.deletePhoto(person.photo_path);
      await reloadData(); await onSaved?.(saved); toast('Gespeichert'); onClose();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function deleteAccount() {
    if (!(await confirmDialog(`App-Konto von ${profile.email} löschen? ${person.name} kann sich dann nicht mehr anmelden, bleibt aber als Person (z. B. Ansprechpartner) erhalten.`,
      { title: 'Konto löschen', confirmLabel: 'Konto löschen', danger: true }))) return;
    try { await api.rpc('admin_delete_user', { p_user: profile.id }); await reloadData(); await onSaved?.(); toast('Konto gelöscht'); onClose(); } catch (e) { setError(e.message); }
  }

  async function deletePerson() {
    const msg = `„${person.name}“ komplett löschen? Die Person wird auch als Ansprechpartner bei Mannschaften und auf der Seite Ansprechpartner entfernt.`
      + (profile ? ' Ihr App-Konto wird ebenfalls gelöscht.' : '');
    if (!(await confirmDialog(msg, { title: 'Person löschen', confirmLabel: 'Person löschen', danger: true }))) return;
    try {
      if (profile) await api.rpc('admin_delete_user', { p_user: profile.id });
      await api.remove('people', person.id);
      if (person.photo_path) api.deletePhoto(person.photo_path);
      await reloadData(); await onSaved?.(); toast('Gelöscht'); onClose();
    } catch (e) { setError(e.message); }
  }

  return (
    <Sheet title={isNew ? 'Neue Person' : person.name} onClose={onClose}
      footer={readOnly ? <button className="btn btn-block" onClick={onClose}>Schließen</button> : (
        <div className="row gap">
          {!isNew && isAdmin && !isSelf && <button className="btn btn-danger" onClick={deletePerson} aria-label="Person löschen"><Icon name="trash" /></button>}
          <button className="btn btn-primary grow" disabled={busy} onClick={save}>{busy ? 'Speichert …' : 'Speichern'}</button>
        </div>
      )}>
      <div className="form">
        {readOnly && <div className="alert alert-info small">{person.name} hat ein eigenes App-Konto und pflegt Name, Telefon und Einwilligung selbst im Profil.</div>}
        <Field label="Name"><input id="person-name" value={f.name} onChange={set('name')} disabled={readOnly} /></Field>
        <Field label="Telefon"><input id="person-phone" type="tel" value={f.phone} onChange={set('phone')} disabled={readOnly} /></Field>
        <Field label="Kontakt-E-Mail" hint={ownAccount ? null : 'Wird die Person später eingeladen und meldet sich mit dieser Adresse an, wird ihr Konto automatisch verknüpft.'}>
          <input id="person-email" type="email" value={f.email} onChange={set('email')} autoCapitalize="none" disabled={readOnly} />
        </Field>
        {!readOnly && (
          <div className="photo-row">
            {photoUrl ? <img className="avatar" src={photoUrl} alt="" style={{ width: 64, height: 64 }} /> : <Avatar person={{ name: f.name }} size={64} />}
            <div className="col gap-s">
              <PhotoInput folder={isAdmin ? 'admin' : me.id} label={f.photo_path ? 'Foto ersetzen' : 'Foto hochladen'} onUploaded={(path) => setF((x) => ({ ...x, photo_path: path }))} />
              {f.photo_path && <button className="btn btn-danger" onClick={() => setF((x) => ({ ...x, photo_path: null }))}>Foto entfernen</button>}
            </div>
          </div>
        )}
        {!readOnly && (
          <div className="consent-box">
            <label className="check">
              <input type="checkbox" checked={f.consent} onChange={set('consent')} />
              <span><strong>Einwilligung liegt vor:</strong> Foto, Telefon und Kontakt-E-Mail dürfen angezeigt werden.</span>
            </label>
            <p className="muted small">Nur ankreuzen, wenn die Person nachweisbar zugestimmt hat (z. B. schriftlich oder per E-Mail – bitte aufbewahren). Ohne Häkchen wird nur der Name angezeigt.</p>
          </div>
        )}

        {isAdmin && (!isNew || profile) && (
          <section className="account-box">
            <h3>App-Konto</h3>
            {profile ? (
              <>
                <p className="small">Anmeldung mit <strong>{profile.email}</strong></p>
                <Field label="Rolle" hint={isSelf ? 'Die eigene Rolle kann man nicht ändern.' : ROLE_HINT[role]}>
                  <select id="person-role" value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf}>
                    {Object.entries(ROLE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                {role === 'trainer' && (
                  <p className={`small ${teamsOf.length ? 'muted' : 'warn-text'}`}>
                    {teamsOf.length ? `Darf Termine pflegen für: ${teamsOf.join(', ')}` : 'Noch keiner Mannschaft zugeordnet – unter „Mannschaften“ als Ansprechpartner eintragen.'}
                  </p>
                )}
                {!isSelf && <button className="btn btn-danger btn-sm" onClick={deleteAccount}>Nur App-Konto löschen</button>}
              </>
            ) : <p className="muted small">Kein App-Konto. Die Person kann über einen Einladungslink eingeladen werden.</p>}
          </section>
        )}
        <ErrorBox error={error} />
      </div>
    </Sheet>
  );
}
