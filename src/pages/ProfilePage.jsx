import { useEffect, useState } from 'react';
import { api, isDemo } from '../data/api.js';
import { useApp } from '../store.jsx';
import { Avatar, ErrorBox, Field, Link } from '../components/ui.jsx';
import PhotoInput from '../components/PhotoInput.jsx';
import { alertDialog, confirmDialog } from '../components/dialog.jsx';

const ROLE = { member: 'Mitglied', trainer: 'Trainer/in', admin: 'Admin / Vorstand' };

export default function ProfilePage() {
  const { me, reloadMe, reloadData, toast, refreshPhotos, data } = useApp();
  const p = me.person || {};
  const [f, setF] = useState({ name: p.name || '', phone: p.phone || '', email: p.email || '', consent: !!p.consent });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const myTeams = data.teams.filter((t) => me.teamIds.includes(t.id));

  async function save(patch = {}) {
    if (!me.person) return;
    setError(''); setBusy(true);
    try {
      const row = { name: f.name.trim() || p.name, phone: f.phone.trim() || null, email: f.email.trim() || null, consent: f.consent, ...patch };
      await api.update('people', me.person.id, row);
      await reloadMe(); await reloadData(); toast('Gespeichert');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  // Eigenes Foto immer anzeigen (auch ohne Einwilligung – nur andere sehen es dann nicht)
  const [ownUrl, setOwnUrl] = useState(null);
  useEffect(() => {
    if (!p.photo_path) { setOwnUrl(null); return; }
    api.photoUrls([p.photo_path]).then((m) => setOwnUrl(m[p.photo_path] || null)).catch(() => {});
  }, [p.photo_path]);

  return (
    <div className="page">
      <h1>Mein Profil</h1>
      <p className="muted">{me.email} · Rolle: <strong>{ROLE[me.role]}</strong>{myTeams.length ? ` · ${myTeams.map((t) => t.name).join(', ')}` : ''}</p>

      {me.person ? (
        <div className="form">
          <Field label="Name (wird anderen Mitgliedern angezeigt)"><input value={f.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field label="Telefonnummer (optional)"><input type="tel" inputMode="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></Field>
          <Field label="Kontakt-E-Mail (optional)"><input type="email" value={f.email} onChange={set('email')} /></Field>

          <div className="photo-row">
            {ownUrl ? <img className="avatar" src={ownUrl} alt="Mein Foto" style={{ width: 72, height: 72 }} /> : <Avatar person={{ name: p.name }} size={72} />}
            <div className="col gap-s">
              <PhotoInput folder={me.id} label={p.photo_path ? 'Foto ersetzen' : 'Foto hochladen'} onUploaded={async (path) => {
                const old = p.photo_path; await save({ photo_path: path }); if (old) api.deletePhoto(old); refreshPhotos();
              }} />
              {p.photo_path && <button className="btn btn-danger" disabled={busy} onClick={async () => { const old = p.photo_path; await save({ photo_path: null }); api.deletePhoto(old); }}>Foto löschen</button>}
            </div>
          </div>

          <div className="consent-box">
            <label className="check">
              <input type="checkbox" checked={f.consent} onChange={set('consent')} />
              <span><strong>Einwilligung:</strong> Ich bin einverstanden, dass mein Foto, meine Telefonnummer und meine Kontakt-E-Mail
                den angemeldeten Nutzern dieser App angezeigt werden (z. B. als Ansprechpartner meiner Mannschaft).
                Ohne Häkchen wird nur mein Name angezeigt. Ich kann die Einwilligung jederzeit widerrufen, indem ich das Häkchen entferne.</span>
            </label>
            {p.consent && p.consent_at && <p className="muted small">Eingewilligt am {new Date(p.consent_at).toLocaleDateString('de-DE')}</p>}
          </div>
          <ErrorBox error={error} />
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => save()}>{busy ? 'Speichert …' : 'Speichern'}</button>
        </div>
      ) : <p className="muted">Zu deinem Konto ist kein Personeneintrag vorhanden.</p>}

      <h2>App</h2>
      <ul className="list">
        <li><Link className="list-item" to="/installieren">App auf dem Startbildschirm installieren</Link></li>
        <li><Link className="list-item" to="/datenschutz">Datenschutzerklärung</Link></li>
        <li><Link className="list-item" to="/impressum">Impressum</Link></li>
      </ul>

      <div className="stack">
        <button className="btn btn-block" onClick={() => api.signOut()}>Abmelden</button>
        {!isDemo && (
          <button className="btn btn-block btn-danger" onClick={async () => {
            if (!(await confirmDialog('Konto wirklich löschen? Deine Daten (Telefon, Foto) werden entfernt. Falls du als Trainer oder im Vorstand eingetragen bist, bleibt nur dein Name dort stehen, bis ein Admin den Eintrag ändert.', { confirmLabel: 'Konto löschen', danger: true }))) return;
            try { await api.rpc('delete_my_account'); await api.signOut(); } catch (e) { alertDialog(e.message); }
          }}>Konto löschen</button>
        )}
      </div>
    </div>
  );
}
