// Anmeldung ohne Passwort: E-Mail eingeben → Link antippen ODER Code eintippen.
// Der Code ist wichtig für installierte Apps (besonders iPhone): Dort öffnet der Link
// oft einen anderen Browser – der Code funktioniert immer.
import { useEffect, useState } from 'react';
import { config } from '../config.js';
import { api, isDemo } from '../data/api.js';
import { navigate } from '../lib/router.js';
import { useApp } from '../store.jsx';
import { ErrorBox, Field, Link } from '../components/ui.jsx';

const PENDING = 'platzplan-pending-login';
const getPending = () => { try { return JSON.parse(localStorage.getItem(PENDING) || 'null'); } catch { return null; } };
const setPending = (v) => { try { v ? localStorage.setItem(PENDING, JSON.stringify(v)) : localStorage.removeItem(PENDING); } catch { /* */ } };

export default function LoginPage({ inviteToken }) {
  const { user } = useApp();
  const pending = getPending();
  const [step, setStep] = useState(pending && Date.now() - pending.t < 3600e3 ? 'code' : 'email');
  const [email, setEmail] = useState(pending?.email || '');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(inviteToken ? 'checking' : null);

  // Bereits angemeldet und Einladungslink geöffnet → direkt zur App
  useEffect(() => { if (user && inviteToken) navigate('/', { replace: true }); }, [user, inviteToken]);
  useEffect(() => {
    if (!inviteToken) return;
    api.checkInvite(inviteToken).then((ok) => setInvite(ok ? 'ok' : 'invalid')).catch(() => setInvite('invalid'));
  }, [inviteToken]);

  const isJoin = invite === 'ok';

  async function send(e) {
    e.preventDefault(); setError('');
    const mail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(mail)) return setError('Bitte eine gültige E-Mail-Adresse eingeben.');
    if (isJoin && !name.trim()) return setError('Bitte deinen Namen eingeben.');
    if (isJoin && !agree) return setError('Bitte bestätige, dass du die Datenschutzerklärung gelesen hast.');
    setBusy(true);
    try {
      await api.sendCode(mail, isJoin ? { create: true, name: name.trim(), inviteToken } : {});
      setPending({ email: mail, t: Date.now() }); setEmail(mail); setStep('code');
    } catch (err) { setError(err.message); }
    setBusy(false);
  }
  async function verify(e) {
    e.preventDefault(); setError('');
    setBusy(true);
    try {
      await api.verifyCode(email, code.replace(/\s/g, ''));
      setPending(null);
      if (inviteToken) navigate('/', { replace: true });
    } catch (err) { setError(err.message); }
    setBusy(false);
  }

  return (
    <div className="page narrow">
      {invite === 'invalid' && <div className="alert alert-error">Dieser Einladungslink ist ungültig oder wurde deaktiviert. Bitte frage beim Vorstand nach einem aktuellen Link.</div>}
      <h1>{isJoin ? 'Willkommen!' : 'Anmelden'}</h1>
      <p>{isJoin
        ? `Du wurdest zum Platzplan der ${config.title} eingeladen. Gib deinen Namen und deine E-Mail-Adresse ein – ein Passwort brauchst du nicht.`
        : 'Gib deine E-Mail-Adresse ein. Wir schicken dir einen Anmelde-Link und einen Code – ein Passwort brauchst du nicht.'}</p>

      {isDemo && step === 'email' && <DemoLogin />}

      {step === 'email' ? (
        <form onSubmit={send} className="form">
          {isJoin && <Field label="Vor- und Nachname"><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>}
          <Field label="E-Mail-Adresse">
            <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" />
          </Field>
          {isJoin && (
            <label className="check">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>Ich habe die <Link to="/datenschutz">Datenschutzerklärung</Link> gelesen.</span>
            </label>
          )}
          <ErrorBox error={error} />
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sendet …' : isJoin ? 'Registrieren' : 'Anmelde-Code senden'}</button>
          {!inviteToken && <p className="muted small">Noch kein Zugang? Du brauchst den Einladungslink deines Vereins. {config.supportContact}</p>}
        </form>
      ) : (
        <form onSubmit={verify} className="form">
          <div className="alert alert-info">
            Wir haben eine E-Mail an <strong>{email}</strong> geschickt.<br />
            <strong>Entweder</strong> den Link in der E-Mail antippen <strong>oder</strong> den Code aus der E-Mail hier eingeben.
            {' '}Wenn du die App auf dem Startbildschirm nutzt, nimm am besten den Code.
          </div>
          <Field label="Code aus der E-Mail">
            <input className="code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={12}
              value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus />
          </Field>
          <ErrorBox error={error} />
          <button className="btn btn-primary btn-block" disabled={busy || code.replace(/\s/g, '').length < 6}>{busy ? 'Prüft …' : 'Anmelden'}</button>
          <button type="button" className="link-btn" onClick={() => { setStep('email'); setCode(''); setPending(null); }}>Andere E-Mail-Adresse / Code neu anfordern</button>
          <p className="muted small">Keine E-Mail bekommen? Schau bitte auch im Spam-Ordner nach.</p>
        </form>
      )}

      <p className="footer-links">
        <Link to="/installieren">App installieren</Link> · <Link to="/datenschutz">Datenschutz</Link> · <Link to="/impressum">Impressum</Link>
      </p>
    </div>
  );
}

function DemoLogin() {
  const labels = { admin: 'Admin / Vorstand', trainer: 'Trainerin (D-Jugend)', member: 'Mitglied' };
  return (
    <div className="card demo-login">
      <strong>Demo-Modus</strong>
      <p className="small">Es ist noch keine Datenbank verbunden. Probiere die App mit Testdaten aus – wähle eine Rolle:</p>
      <div className="demo-grid">
        {api.demoUsers.map((u) => <button key={u.key} className="btn" onClick={() => api.demoLogin(u.key)}>{labels[u.role]}</button>)}
      </div>
      <p className="small muted">Oder unten z. B. „admin@demo.de" eingeben – der Code ist dann immer 123456.</p>
    </div>
  );
}
