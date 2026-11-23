import { useEffect, useState } from 'react';
import { api } from '../../data/api.js';
import { useApp } from '../../store.jsx';
import { alertDialog, confirmDialog } from '../../components/dialog.jsx';

const ROLES = [['member', 'Mitglied'], ['trainer', 'Trainer'], ['admin', 'Admin/Vorstand']];

export default function UsersTab({ people }) {
  const { me, toast, data } = useApp();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const load = () => api.list('profiles', { order: 'email' }).then(setUsers).catch((e) => alertDialog(e.message));
  useEffect(() => { load(); }, []);
  const personOf = (u) => people.find((p) => p.user_id === u.id);
  const teamsOf = (p) => p ? data.contacts.filter((c) => c.person_id === p.id).map((c) => data.teams.find((t) => t.id === c.team_id)?.short_name).join(', ') : '';
  const shown = users.filter((u) => `${u.email} ${personOf(u)?.name || ''}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <p className="muted small">{users.length} Konten. Trainer dürfen nur die Termine der Mannschaften pflegen, bei denen sie als Ansprechpartner eingetragen sind (Verwaltung → Mannschaften).</p>
      <input type="search" placeholder="Suchen …" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Nutzer suchen" />
      <ul className="list">
        {shown.map((u) => {
          const p = personOf(u);
          return (
            <li key={u.id} className="list-item wrap">
              <div className="grow">
                <div className="list-title">{p?.name || '–'}</div>
                <div className="muted small">{u.email}{u.role === 'trainer' ? ` · Teams: ${teamsOf(p) || 'keine zugeordnet!'}` : ''}</div>
              </div>
              <select value={u.role} disabled={u.id === me.id} aria-label="Rolle" onChange={async (e) => {
                try { await api.update('profiles', u.id, { role: e.target.value }); toast('Rolle geändert'); load(); } catch (err) { alertDialog(err.message); }
              }}>
                {ROLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              {u.id !== me.id && (
                <button className="btn btn-sm btn-danger" onClick={async () => {
                  if (!(await confirmDialog(`Konto ${u.email} löschen? Die Person bleibt als Ansprechpartner erhalten, kann sich aber nicht mehr anmelden.`))) return;
                  try { await api.rpc('admin_delete_user', { p_user: u.id }); toast('Konto gelöscht'); load(); } catch (err) { alertDialog(err.message); }
                }}>Löschen</button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
