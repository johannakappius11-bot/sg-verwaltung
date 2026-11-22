// Impressum und Datenschutzerklärung – PLATZHALTER!
// Alle Stellen in [eckigen Klammern] mit euren Vereinsdaten ersetzen und rechtlich prüfen lassen
// (z. B. durch den Datenschutzbeauftragten des Kreissportbunds / Landessportbunds).
import { useApp } from '../store.jsx';
import { Link } from '../components/ui.jsx';

function Back() {
  const { user } = useApp();
  return <Link to={user ? '/profil' : '/'} className="back">← Zurück</Link>;
}

export function ImpressumPage() {
  return (
    <div className="page legal">
      <Back />
      <h1>Impressum</h1>
      <p className="alert alert-warn">Platzhalter – bitte mit den echten Vereinsdaten ausfüllen.</p>
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>[Spielgemeinschaft / verantwortlicher Verein, z. B. SC Concordia Schamede e. V.]<br />
        [Straße Hausnummer]<br />[PLZ Ort]</p>
      <p>Vertreten durch den Vorstand: [Name 1. Vorsitzende/r], [Name 2. Vorsitzende/r]</p>
      <p>Registergericht: [Amtsgericht …]<br />Registernummer: [VR …]</p>
      <h2>Kontakt</h2>
      <p>E-Mail: [vorstand@verein.de]<br />Telefon: [optional]</p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>[Name, Anschrift wie oben]</p>
      <h2>Partnerverein</h2>
      <p>[VfL Thüle e. V., Anschrift, Vertretungsberechtigte]</p>
    </div>
  );
}

export function DatenschutzPage() {
  return (
    <div className="page legal">
      <Back />
      <h1>Datenschutzerklärung</h1>
      <p className="alert alert-warn">Vorlage – bitte Platzhalter ersetzen und vor dem Start prüfen lassen.</p>

      <h2>1. Verantwortlicher</h2>
      <p>[Verein, Anschrift, E-Mail – wie im Impressum]. Bei gemeinsamer Verantwortung beider Vereine: [Vereinbarung nach Art. 26 DSGVO, Ansprechpartner].</p>

      <h2>2. Zweck der App</h2>
      <p>Die App dient der Organisation der Platzbelegung der Sportplätze in Schamede und Thüle und zeigt, welche Mannschaft wann trainiert oder spielt und wer Ansprechpartner ist. Sie ist nur für eingeladene Personen zugänglich.</p>

      <h2>3. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><strong>Konto:</strong> E-Mail-Adresse, Name, Rolle (Gast, Mitglied, Trainer, Admin). Zweck: Anmeldung und Rechteverwaltung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Mitgliedschaft/Nutzungsverhältnis) bzw. lit. f (berechtigtes Interesse an der Vereinsorganisation).</li>
        <li><strong>Ansprechpartner (Trainer, Betreuer, Vorstand):</strong> Name und Funktion – Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO. <strong>Foto, Telefonnummer und Kontakt-E-Mail nur mit Einwilligung</strong> (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung kann jederzeit im Profil widerrufen werden; die Daten werden dann sofort nicht mehr angezeigt.</li>
        <li><strong>Termine:</strong> Trainings- und Spieltermine der Mannschaften (keine Spielerdaten).</li>
        <li><strong>Technisch notwendige Daten:</strong> Beim Aufruf verarbeitet der Hosting-Anbieter die IP-Adresse und Zeitpunkt (Server-Logs) zur sicheren Bereitstellung.</li>
      </ul>

      <h2>4. Dienstleister (Auftragsverarbeiter)</h2>
      <ul>
        <li><strong>Supabase</strong> (Supabase Inc.) – Datenbank, Anmeldung und Dateispeicher. Serverstandort: Frankfurt am Main (EU). Auftragsverarbeitungsvertrag (DPA) ist abgeschlossen [bitte abschließen].</li>
        <li><strong>[Cloudflare Pages / Hosting-Anbieter]</strong> – Auslieferung der App-Dateien. [Hinweis auf Datenübermittlung/DPF bzw. Standardvertragsklauseln einfügen.]</li>
        <li><strong>[E-Mail-Versanddienst, z. B. Brevo (Frankreich)]</strong> – Versand der Anmelde-E-Mails.</li>
      </ul>

      <h2>5. fussball.de</h2>
      <p>Auf Mannschaftsseiten kann ein Spielplan-Widget von fussball.de (DFB GmbH / DFB-Medien) eingebunden sein. Es wird erst nach einem Klick geladen; dabei werden Daten wie Ihre IP-Adresse an fussball.de übertragen. [Link zur Datenschutzerklärung von fussball.de]</p>

      <h2>6. Speicherung auf dem Gerät</h2>
      <p>Die App speichert Ihre Anmeldung und einfache Einstellungen (z. B. zuletzt gewählter Platz) im Speicher Ihres Browsers. Es werden keine Tracking- oder Werbe-Cookies verwendet.</p>

      <h2>7. Speicherdauer</h2>
      <p>Kontodaten werden gelöscht, wenn Sie Ihr Konto löschen (Profil → „Konto löschen") oder Sie keine Funktion mehr im Verein haben. Vergangene Termine werden [nach Ablauf der Saison / nach 12 Monaten] gelöscht.</p>

      <h2>8. Ihre Rechte</h2>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch sowie Widerruf erteilter Einwilligungen. Wenden Sie sich dazu an [E-Mail]. Sie können sich außerdem bei der Aufsichtsbehörde beschweren: Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW).</p>

      <p className="muted small">Stand: [Datum]</p>
    </div>
  );
}
