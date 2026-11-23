import { Link } from '../components/ui.jsx';
import { useApp } from '../store.jsx';

const ua = navigator.userAgent;
const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(ua);
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const ShareIcon = () => (
  <svg className="inline-ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Teilen-Symbol"><path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" /></svg>
);
const DotsIcon = () => (
  <svg className="inline-ico" viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-label="Menü-Symbol (drei Punkte)"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
);

export default function InstallPage() {
  const { user } = useApp();
  const ios = (
    <section className="card" key="ios">
      <h2>iPhone / iPad</h2>
      <ol className="steps">
        <li>Diese Seite in <strong>Safari</strong> öffnen (nicht in WhatsApp, Mail oder einer anderen App – dort ggf. über „In Safari öffnen").</li>
        <li>Unten (iPad: oben) auf das <strong>Teilen-Symbol</strong> <ShareIcon /> tippen.</li>
        <li>Nach unten scrollen und <strong>„Zum Home-Bildschirm"</strong> wählen.</li>
        <li>Oben rechts auf <strong>„Hinzufügen"</strong> tippen.</li>
      </ol>
    </section>
  );
  const android = (
    <section className="card" key="android">
      <h2>Android</h2>
      <ol className="steps">
        <li>Diese Seite in <strong>Chrome</strong> (oder Samsung Internet) öffnen.</li>
        <li>Oben rechts auf das <strong>Menü</strong> <DotsIcon /> tippen (Samsung Internet: unten rechts ☰).</li>
        <li><strong>„App installieren"</strong> bzw. <strong>„Zum Startbildschirm hinzufügen"</strong> wählen (Samsung: „Seite hinzufügen zu" → „Startbildschirm").</li>
        <li>Mit <strong>„Installieren"</strong> bzw. <strong>„Hinzufügen"</strong> bestätigen.</li>
      </ol>
    </section>
  );
  return (
    <div className="page">
      {!user && <Link to="/" className="back">← Zurück zur Anmeldung</Link>}
      <h1>App installieren</h1>
      {standalone
        ? <div className="alert alert-info">Die App ist bereits auf deinem Startbildschirm installiert. 👍</div>
        : <p>Du kannst SG Orga wie eine App auf deinen Startbildschirm legen. Es ist kein App Store nötig.</p>}
      {isAndroid ? [android, ios] : [ios, android]}
      <section className="card">
        <h2>Anmelden in der installierten App</h2>
        <p>Nach der Installation die App vom Startbildschirm öffnen und mit deiner E-Mail-Adresse anmelden.
          Gib dann den <strong>Code aus der E-Mail</strong> in der App ein. (Der Link in der E-Mail öffnet auf manchen Handys
          den Browser statt der App – der Code funktioniert immer.)</p>
      </section>
      {isIOS && <p className="muted small">Hinweis: Wenn du die App länger nicht öffnest, kann iOS die Anmeldung löschen. Dann einfach neu anmelden – deine Daten bleiben erhalten, sie liegen auf dem Server.</p>}
    </div>
  );
}
