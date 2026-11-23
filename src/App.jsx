import { config } from './config.js';
import { isDemo, api } from './data/api.js';
import { match, usePath, navigate } from './lib/router.js';
import { useApp } from './store.jsx';
import { Icon, Link, Toast } from './components/ui.jsx';
import PlanPage from './pages/PlanPage.jsx';
import TeamsPage from './pages/TeamsPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import BoardPage from './pages/BoardPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import InstallPage from './pages/InstallPage.jsx';
import { ImpressumPage, DatenschutzPage } from './pages/LegalPages.jsx';
import { DialogHost, confirmDialog } from './components/dialog.jsx';

// Seiten, die ohne Anmeldung erreichbar sind
const PUBLIC = [
  ['/impressum', ImpressumPage], ['/datenschutz', DatenschutzPage], ['/installieren', InstallPage],
];
const PRIVATE = [
  ['/', PlanPage], ['/plan', PlanPage], ['/mannschaften', TeamsPage], ['/mannschaften/:id', TeamPage],
  ['/ansprechpartner', BoardPage], ['/vorstand', BoardPage], ['/profil', ProfilePage], ['/verwaltung', AdminPage], ['/verwaltung/:tab', AdminPage],
];

function Header() {
  return (
    <header className="app-header">
      <img src={config.logoLeft} alt={config.clubs[0]} className="logo" />
      <div className="app-title">
        <strong>{config.title}</strong>
        <span>Platzbelegung</span>
      </div>
      <img src={config.logoRight} alt={config.clubs[1]} className="logo" />
    </header>
  );
}

function BottomNav({ path }) {
  const { canManage } = useApp();
  const items = [
    ['/', 'Plan', 'calendar'], ['/mannschaften', 'Teams', 'users'], ['/ansprechpartner', 'Ansprech\u00adpartner', 'star'],
    ...(canManage ? [['/verwaltung', 'Verwalten', 'settings']] : []),
    ['/profil', 'Profil', 'user'],
  ];
  const active = (to) => (to === '/' ? path === '/' || path === '/plan' : path.startsWith(to));
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {items.map(([to, label, icon]) => (
        <Link key={to} to={to} className={active(to) ? 'active' : ''} aria-current={active(to) ? 'page' : undefined}>
          <Icon name={icon} size={24} /><span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

function DemoBar() {
  const { me } = useApp();
  if (!isDemo || !me) return null;
  const labels = { admin: 'Admin/Vorstand', trainer: 'Trainer D-Jugend', member: 'Mitglied' };
  return (
    <div className="demo-bar">
      <span>Demo:</span>
      <select value={me.id} onChange={(e) => api.demoLogin(e.target.value)} aria-label="Demo-Rolle wechseln">
        {api.demoUsers.map((u) => <option key={u.key} value={u.key}>{labels[u.role]}</option>)}
      </select>
      <button className="btn btn-sm" onClick={async () => { if (await confirmDialog('Alle Demo-Daten auf Anfang zurücksetzen?')) { api.resetDemo(); location.reload(); } }}>Zurücksetzen</button>
    </div>
  );
}

export default function App() {
  const path = usePath();
  const { user, me, loadError } = useApp();

  for (const [pattern, Page] of PUBLIC) {
    const params = match(pattern, path);
    if (params) return <Shell path={path} nav={!!user}><Page params={params} /></Shell>;
  }

  const join = match('/einladung/:token', path);
  if (user === undefined) return <Shell path={path}><div className="loading">Lädt …</div></Shell>;
  if (!user || join) return <Shell path={path}><LoginPage inviteToken={join?.token} /></Shell>;
  if (!me) return <Shell path={path}><div className="loading">{loadError || 'Lädt …'}</div></Shell>;
  if (me.role === 'none') {
    return (
      <Shell path={path}>
        <div className="page"><h1>Kein Zugang</h1>
          <p>Für dieses Konto ist kein Zugang (mehr) eingerichtet. Bitte wende dich an den Vorstand.</p>
          <button className="btn" onClick={() => api.signOut()}>Abmelden</button></div>
      </Shell>
    );
  }

  for (const [pattern, Page] of PRIVATE) {
    const params = match(pattern, path);
    if (params) return <Shell path={path} nav><Page params={params} /></Shell>;
  }
  return <Shell path={path} nav><div className="page"><h1>Seite nicht gefunden</h1><button className="btn" onClick={() => navigate('/')}>Zum Platzplan</button></div></Shell>;
}

function Shell({ children, nav, path }) {
  return (
    <div className={`app ${nav ? 'with-nav' : ''}`}>
      <Header />
      <DemoBar />
      <main className="app-main">{children}</main>
      {nav && <BottomNav path={path} />}
      <Toast />
      <DialogHost />
    </div>
  );
}
