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
import UsersTab from './admin/UsersTab.jsx';
import InvitesTab from './admin/InvitesTab.jsx';

const TABS = [
  ['termine', 'Termine', AppointmentsTab, false],
  ['spiele', 'Spiele & Import', GamesTab, false],
  ['mannschaften', 'Mannschaften', TeamsTab, true],
  ['personen', 'Personen', PeopleTab, true],
  ['vorstand', 'Vorstand', BoardTab, true],
  ['plaetze', 'Plätze', FieldsTab, true],
  ['nutzer', 'Nutzer', UsersTab, true],
  ['einladungen', 'Einladungen', InvitesTab, true],
];

export default function AdminPage({ params }) {
  const { isAdmin, canManage } = useApp();
  const tabs = TABS.filter((t) => isAdmin || !t[3]);
  const current = tabs.find((t) => t[0] === params.tab) || tabs[0];
  const Comp = current[2];

  // Vollständige Personenliste (nur für Admins lesbar)
  const [people, setPeople] = useState([]);
  const reloadPeople = useCallback(async () => { if (isAdmin) setPeople(await api.list('people', { order: 'name' })); }, [isAdmin]);
  useEffect(() => { reloadPeople(); }, [reloadPeople]);

  if (!canManage) return <div className="page"><h1>Verwaltung</h1><p>Für diesen Bereich fehlt dir die Berechtigung.</p></div>;
  return (
    <div className="page">
      <h1>Verwaltung</h1>
      <div className="tabs" role="tablist">
        {tabs.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={key === current[0]} className={key === current[0] ? 'on' : ''}
            onClick={() => navigate(`/verwaltung/${key}`, { replace: true })}>{label}</button>
        ))}
      </div>
      <Comp people={people} reloadPeople={reloadPeople} />
    </div>
  );
}
