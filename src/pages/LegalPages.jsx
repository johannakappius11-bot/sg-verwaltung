// Impressum und Datenschutzerklärung der Platzplan-App.
// Angaben vom VfL 1919 Thüle e.V. (Stand November 2026). Vor Änderungen bitte rechtlich prüfen lassen.
import { useApp } from '../store.jsx';
import { Link } from '../components/ui.jsx';

const CONTACT_MAIL = 'sgscharmedethuele.verwaltung@gmail.com';

function Back() {
  const { user } = useApp();
  return <Link to={user ? '/profil' : '/'} className="back">← Zurück</Link>;
}

export function ImpressumPage() {
  return (
    <div className="page legal">
      <Back />
      <h1>Impressum</h1>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>VfL 1919 Thüle e.V.<br />Stangenweg 48<br />33154 Salzkotten</p>
      <p>Diese App wird für die Spielgemeinschaft SC Concordia Scharmede / VfL Thüle betrieben.</p>

      <h2>Vertreten durch</h2>
      <p>
        Dieter Schmidt (1. Vorsitzender)<br />
        Hans-Josef Kamp (2. Vorsitzender)<br />
        Anette Schröder-Israel (Kassiererin)<br />
        Jörg Greitemeyer (1. Geschäftsführer)
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${CONTACT_MAIL}`}>{CONTACT_MAIL}</a><br />
        Telefon Sportheim: <a href="tel:+4952589279634">05258 / 9279634</a>
      </p>

      <h2>Registereintrag</h2>
      <p>Eintragung im Vereinsregister<br />Registergericht: Amtsgericht Paderborn<br />Registernummer: VR 914</p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>Heiner Käuper, Anschrift wie oben</p>

      <h2>Haftung für Inhalte</h2>
      <p>Die Inhalte dieser App wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
        der Inhalte, insbesondere der Termine, können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir für
        eigene Inhalte nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir jedoch nicht verpflichtet,
        übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
        rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach
        den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist erst ab dem Zeitpunkt der
        Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir
        diese Inhalte umgehend entfernen.</p>

      <h2>Haftung für Links</h2>
      <p>Die App enthält Links zu externen Angeboten (z. B. fussball.de, Kartendienste), auf deren Inhalte wir keinen
        Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter verantwortlich. Bei Bekanntwerden von
        Rechtsverletzungen werden wir derartige Links umgehend entfernen.</p>

      <h2>Urheberrecht</h2>
      <p>Die durch die Betreiber erstellten Inhalte und Werke, einschließlich der Vereinslogos, unterliegen dem deutschen
        Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
        Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Rechteinhabers. Soweit Inhalte nicht vom
        Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Sollten Sie auf eine Urheberrechtsverletzung
        aufmerksam werden, bitten wir um einen entsprechenden Hinweis.</p>
    </div>
  );
}

export function DatenschutzPage() {
  return (
    <div className="page legal">
      <Back />
      <h1>Datenschutzerklärung</h1>
      <p className="muted small">für die App „Platzplan SG Scharmede/Thüle“ · Stand: November 2026</p>

      <h2>1. Verantwortlicher</h2>
      <p>VfL 1919 Thüle e.V., Stangenweg 48, 33154 Salzkotten, vertreten durch den Vorstand (siehe <Link to="/impressum">Impressum</Link>).<br />
        E-Mail: <a href={`mailto:${CONTACT_MAIL}`}>{CONTACT_MAIL}</a></p>
      <p>Die App wird gemeinsam mit dem SC Concordia Scharmede im Rahmen der Spielgemeinschaft genutzt.
        Allgemeine Hinweise zum Datenschutz im VfL Thüle finden Sie <a href="https://2018.vfl-thuele.de/vorstand/datenschutzerklaerung" target="_blank" rel="noopener noreferrer">hier</a>.</p>

      <h2>2. Zweck der App</h2>
      <p>Die App dient der Organisation der Platzbelegung der Sportanlagen in Scharmede und Thüle. Sie zeigt, welche
        Mannschaft wann trainiert oder spielt und wer Ansprechpartner ist. Sie ist nur für eingeladene Personen zugänglich.</p>

      <h2>3. Welche Daten wir verarbeiten</h2>
      <ul>
        <li><strong>Konto:</strong> E-Mail-Adresse, Name und Rolle (Gast, Mitglied, Trainer, Admin) – für Anmeldung und
          Rechteverwaltung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhältnis bzw. Mitgliedschaft) und
          lit. f DSGVO (berechtigtes Interesse an der Organisation des Trainings- und Spielbetriebs).</li>
        <li><strong>Ansprechpartner (Trainer, Betreuer, Vorstand, weitere Funktionen):</strong> Name und Funktion –
          Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO. <strong>Foto, Telefonnummer und Kontakt-E-Mail werden nur mit
          Einwilligung angezeigt</strong> (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung kann jederzeit im Profil
          widerrufen werden; die Daten werden dann sofort nicht mehr angezeigt.</li>
        <li><strong>Termine:</strong> Trainings- und Spieltermine der Mannschaften. Es werden keine Daten einzelner
          Spielerinnen und Spieler gespeichert.</li>
        <li><strong>Technisch notwendige Daten:</strong> Beim Aufruf der App werden IP-Adresse, Zeitpunkt und
          Browser-Informationen kurzzeitig in Server-Protokollen der unten genannten Dienstleister verarbeitet, um die App
          sicher bereitzustellen (Art. 6 Abs. 1 lit. f DSGVO).</li>
      </ul>

      <h2>4. Dienstleister (Auftragsverarbeiter)</h2>
      <ul>
        <li><strong>Supabase Inc.</strong> – Datenbank, Anmeldung und Speicher für Fotos. Die Daten werden auf Servern in
          Frankfurt am Main (EU) gespeichert.</li>
        <li><strong>Sendinblue SAS (Brevo)</strong>, Paris, Frankreich – Versand der Anmelde-E-Mails.</li>
        <li><strong>Cloudflare, Inc.</strong>, USA – Auslieferung der App-Dateien. Dabei werden keine Mitgliederdaten,
          sondern nur technische Verbindungsdaten verarbeitet.</li>
      </ul>
      <p>Mit den Dienstleistern bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO. Soweit dabei Daten in die
        USA übermittelt werden können, erfolgt dies auf Grundlage des EU-US Data Privacy Framework bzw. der
        EU-Standardvertragsklauseln.</p>

      <h2>5. fussball.de und Kartendienste</h2>
      <p>Auf Mannschaftsseiten kann ein Spielplan-Widget von fussball.de eingebunden sein. Es wird erst nach einem Klick
        geladen; dabei werden Daten wie Ihre IP-Adresse an den Betreiber von fussball.de übertragen. Der Link „In Karte
        öffnen“ bei Auswärtsspielen führt zu Google Maps; dabei gelten die Datenschutzbestimmungen von Google.</p>

      <h2>6. Speicherung auf Ihrem Gerät</h2>
      <p>Die App speichert Ihre Anmeldung und einfache Einstellungen (z. B. gewählte Ansicht und Filter) im Speicher Ihres
        Browsers. Das ist für die Funktion der App erforderlich (§ 25 Abs. 2 TDDDG). Es werden keine Tracking- oder
        Werbe-Cookies und keine Analysedienste verwendet.</p>

      <h2>7. Speicherdauer</h2>
      <p>Kontodaten werden gelöscht, wenn Sie Ihr Konto löschen (Profil → „Konto löschen“) oder Sie keine Funktion mehr im
        Verein haben. Vergangene Termine werden spätestens zwölf Monate nach Ende der jeweiligen Saison gelöscht.</p>

      <h2>8. Ihre Rechte</h2>
      <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
        und Widerspruch sowie das Recht, erteilte Einwilligungen jederzeit zu widerrufen. Wenden Sie sich dazu an die oben
        genannte E-Mail-Adresse.</p>
      <p>Sie können sich außerdem bei der Aufsichtsbehörde beschweren: Landesbeauftragte für Datenschutz und
        Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf.</p>
    </div>
  );
}
