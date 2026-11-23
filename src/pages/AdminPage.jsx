import { useCallback, useEffect, useState } from 'react';
import { api } from '../data/api.js';
import { navigate } from '../lib/router.js';
import { useApp } from '../store.jsx';
import AppointmentsTab from './admin/AppointmentsTab.jsx';
import GamesTab from './admin/GamesTab.jsx';
import TeamsTab from './admin/TeamsTab.jsx';
import PeopleTab from './admin/PeopleTab.jsx';
import BoardTab from './admin/BoardTab.jsx';
import FieldsTab from './admin/FieldsTab.jsx';
import InvitesTab from './admin/InvitesTab.jsx';

// Reiter und wer sie sieht: admin = alles, board = Vorstand (nur Ansprechpartner), trainer = eigene Termine
const TABS = [
  ['termine', 'Termine', AppointmentsTab, ['admin', 'trainer']],
  ['spiele', 'Spiele & Import', GamesTab, ['admin', 'trainer']],
  ['mannschaften', 'Mannschaften', TeamsTab, ['admin']],
  ['personen', 'Personen & Konten', PeopleTab, ['admin']],
  ['ansprechpartner', 'Ansprechpartner', BoardTab, ['admin', 'board']],
  ['plaetze', 'Plätze', FieldsTab, ['admin']],
  ['einladungen', 'Einladungen', InvitesTab, ['admin']],
];

export default function AdminPage({ params }) {
  const { role, isAdmin, canManage } = useApp();
  const tabs = TABS.filter((t) => t[3].includes(role));
  const current = tabs.find((t) => t[0] === params.tab) || tabs[0];

  // Vollständige Personenliste (Admin, Vorstand) und App-Konten (nur Admin)
  const [people, setPeople] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const reloadPeople = useCallback(async () => {
    if (role !== 'admin' && role !== 'board') return;
    setPeople(await api.list('people', { order: 'name' }));
    if (role === 'admin') setProfiles(await api.list('profiles', { order: 'email' }));
  }, [role]);
  useEffect(() => { reloadPeople(); }, [reloadPeople]);

  if (!canManage || !current) return <div className="page"><h1>Verwaltung</h1><p>Für diesen Bereich fehlt dir die Berechtigung.</p></div>;
  const Comp = current[2];
  return (
    <div className="page">
      <h1>Verwaltung</h1>
      {tabs.length > 1 && (
        <div className="tabs" role="tablist">
          {tabs.map(([key, label]) => (
            <button key={key} role="tab" aria-selected={key === current[0]} className={key === current[0] ? 'on' : ''}
              onClick={() => navigate(`/verwaltung/${key}`, { replace: true })}>{label}</button>
          ))}
        </div>
      )}
      <Comp people={people} profiles={profiles} reloadPeople={reloadPeople} isAdmin={isAdmin} />
    </div>
  );
}
