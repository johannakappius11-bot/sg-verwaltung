import { useEffect, useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { Field, Icon } from '../../components/ui.jsx';
import { alertDialog, confirmDialog, promptDialog } from '../../components/dialog.jsx';

const ROLE = { member: 'Mitglied', trainer: 'Trainer' };
const linkFor = (inv) => `${window.location.origin}/einladung/${inv.token}`;

export default function InvitesTab() {
  const { toast } = useApp();
  const [invites, setInvites] = useState([]);
  const [nf, setNf] = useState({ label: '', role: 'member' });
  const load = () => api.list('invites', { order: 'created_at', desc: true }).then(setInvites).catch((e) => alertDialog(e.message));
  useEffect(() => { load(); }, []);

  const create = async (row) => { try { await api.insert('invites', row); toast('Link erstellt'); load(); } catch (e) { alertDialog(e.message); } };
  const share = async (inv) => {
    const url = linkFor(inv);
    const text = 'Einladung zum Platzplan der SG Scharmede/Thüle';
    try {
      if (navigator.share) { await navigator.share({ title: text, text, url }); return; }
    } catch (e) { if (e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Link kopiert'); } catch { promptDialog('Bitte den Link markieren und kopieren:', url, { title: 'Link kopieren' }); }
  };

  return (
    <div>
      <p className="small">Wer einen aktiven Einladungslink hat, kann sich mit seiner E-Mail-Adresse registrieren und bekommt die angegebene Rolle.
        Teile den Link z. B. in der WhatsApp-Gruppe der Mannschaft. Ein deaktivierter Link funktioniert sofort nicht mehr; bestehende Konten bleiben bestehen.</p>
      <div className="card">
        <h3>Neuen Link erstellen</h3>
        <div className="form">
          <Field label="Bezeichnung (nur für euch)"><input value={nf.label} onChange={(e) => setNf((x) => ({ ...x, label: e.target.value }))} placeholder="z. B. Eltern D-Jugend" /></Field>
          <Field label="Rolle für neue Nutzer">
            <div className="seg">{Object.entries(ROLE).map(([k, l]) => <button key={k} className={nf.role === k ? 'on' : ''} onClick={() => setNf((x) => ({ ...x, role: k }))}>{l}</button>)}</div>
          </Field>
          {nf.role === 'trainer' && <p className="muted small">Trainer-Links nur gezielt an Trainer schicken! Danach den Trainer unter „Mannschaften“ als Ansprechpartner eintragen.</p>}
          <button className="btn btn-primary" onClick={() => { create({ label: nf.label || null, role: nf.role }); setNf({ label: '', role: 'member' }); }}><Icon name="plus" /> Link erstellen</button>
        </div>
      </div>
      <ul className="list">
        {invites.map((inv) => (
          <li key={inv.id} className={`list-item wrap ${inv.active ? '' : 'dim'}`}>
            <div className="grow">
              <div className="list-title">{inv.label || 'Einladungslink'} · {ROLE[inv.role]}</div>
              <div className="muted small break">{linkFor(inv)}</div>
              <div className="muted small">{inv.active ? 'aktiv' : 'deaktiviert'} · {inv.uses} Registrierungen</div>
            </div>
            <div className="row gap-s wrap">
              {inv.active && <button className="btn btn-sm" onClick={() => share(inv)}><Icon name="share" size={16} /> Teilen</button>}
              <button className="btn btn-sm" onClick={async () => { await api.update('invites', inv.id, { active: !inv.active }); load(); }}>{inv.active ? 'Deaktivieren' : 'Aktivieren'}</button>
              {inv.active && (
                <button className="btn btn-sm" onClick={async () => {
                  if (!(await confirmDialog('Neuen Link erzeugen? Der bisherige Link funktioniert danach nicht mehr.'))) return;
                  await api.update('invites', inv.id, { active: false });
                  await create({ label: inv.label, role: inv.role });
                }}>Neu erzeugen</button>
              )}
              <button className="btn btn-sm btn-danger" aria-label="Einladungslink löschen" onClick={async () => {
                const msg = `Einladungslink „${inv.label || 'Einladungslink'}“ endgültig löschen? Der Link funktioniert danach nicht mehr. `
                  + 'Wer sich darüber schon registriert hat, behält sein Konto.';
                if (!(await confirmDialog(msg, { title: 'Link löschen', confirmLabel: 'Löschen', danger: true }))) return;
                try { await api.remove('invites', inv.id); toast('Link gelöscht'); load(); } catch (e) { alertDialog(e.message); }
              }}><Icon name="trash" size={16} /> Löschen</button>
            </div>
          </li>
        ))}
      </ul>
      {!invites.length && <p className="empty">Noch keine Einladungslinks. Erstelle oben einen neuen Link.</p>}
    </div>
  );
}
