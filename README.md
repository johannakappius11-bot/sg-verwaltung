# Platzplan SG Scharmede/Thüle

Web-App (PWA) für **SC Concordia Scharmede** und **VfL Thüle**: Wer trainiert oder spielt wann auf welchem Platz – und wen kann man ansprechen?

- 📅 **Gemeinsamer Wochenplan** für beide Sportanlagen (Thüle mit zwei Plätzen), farbig nach Ort (Scharmede grün, Thüle rot, auswärts grau), Wochen- und Tagesansicht, Wischen zum Blättern
- 🔎 **Filter** nach Ort, Art (Training/Spiel/Sonstiges) und Mannschaft. Training = helle Fläche mit Farbstreifen, Spiel = kräftig ausgefüllt mit Ball-Symbol
- ⚽ **Spiele**: Heimspiele belegen den Platz, Auswärtsspiele stehen als „Auswärts" mit Gegner und Spielort im Plan
- 👥 **Mannschaften** mit Trainern/Betreuern und **Ansprechpartner** (Vorstand, Jugend, Trainer & Betreuer, Spielbetrieb, Platzwarte …) inkl. **Organigramm** der Vorstände mit Zuständigkeiten – beide filterbar nach Verein (SG-Einträge bei beiden), Bereich und per Suche
- 🔐 **Anmeldung ohne Passwort** (E-Mail-Link oder 6-stelliger Code), Zugang nur per **Einladungslink**
- 🛠 **Verwaltung**: Trainingszeiten (auch wöchentlich wiederkehrend), Absagen einzelner Termine, **Warnung bei Doppelbelegung**, Import von Spielen (Kalenderdatei/CSV), Personen & Konten, Rollen, Einladungslinks
- 🛡 **DSGVO**: Foto/Telefon/E-Mail nur mit Einwilligung (jederzeit widerrufbar), Datenbank in Frankfurt
- 📱 Läuft auf **iPhone und Android** gleich, installierbar auf dem Startbildschirm

---

## Inhalt

1. [Sofort ausprobieren (Demo-Modus)](#1-sofort-ausprobieren-demo-modus)
2. [Wie die App aufgebaut ist](#2-wie-die-app-aufgebaut-ist)
3. [Einrichtung Schritt für Schritt](#3-einrichtung-schritt-für-schritt)
4. [Bedienung für Admins](#4-bedienung-für-admins)
5. [fussball.de – was geht und was nicht](#5-fussballde--was-geht-und-was-nicht)
6. [Backup](#6-backup)
7. [Updates](#7-updates)
8. [Datenschutz-Checkliste](#8-datenschutz-checkliste)
9. [Hilfe bei Problemen](#9-hilfe-bei-problemen)
10. [Für Entwickler](#10-für-entwickler)

---

## 1. Sofort ausprobieren (Demo-Modus)

Mit `VITE_DEMO=true` (oder ohne eingetragene Datenbank in `src/config.js`) startet die App im **Demo-Modus** mit erfundenen Testdaten
(12 Mannschaften, Trainingszeiten, Spiele, Vorstand). Oben kann man die Rolle wechseln
(Admin, Vorstand, Trainer der D-Jugend, Mitglied). Demo-Daten bleiben nur im eigenen Browser.

**Auf dem eigenen Computer** (einmalig [Node.js](https://nodejs.org) installieren, Version 20 oder neuer):

```bash
npm install
```

```bash
npm run dev
```

Dann im Browser `http://localhost:5173` öffnen. Für den Demo-Modus statt `npm run dev` den Befehl `VITE_DEMO=true npm run dev` nutzen. Im selben WLAN kann man auch mit dem Handy die angezeigte „Network"-Adresse öffnen.

**Online** geht es ebenso: Die App wie in [Schritt 3.4](#34-app-veröffentlichen) veröffentlichen, aber **ohne** die beiden Supabase-Werte – dann läuft sie online im Demo-Modus.

Ideen zum Ausprobieren:
- Mittwochs überschneiden sich auf dem Platz Thüle D-Jugend und E1 (gestrichelt mit „!“ = Doppelbelegung).
- Oben die Orte antippen, um sie aus- oder einzublenden; unter „Filter“ nach Art und Mannschaft filtern.
- Einen Termin antippen → Details und Ansprechpartner. Stefan Platzhalter (2. Herren) hat *nicht* eingewilligt → nur Name sichtbar.
- Als „Trainer (D-Jugend)" kann man nur Termine der D-Jugend anlegen.
- Verwalten → Spiele & Import → CSV-Vorlage herunterladen und wieder importieren.

---

## 2. Wie die App aufgebaut ist

```
Handy (Browser/App)  ──►  App-Dateien (Cloudflare Pages oder Vereins-Webspace)
        │
        └──────────►  Supabase (Frankfurt): Datenbank, Anmeldung, Fotos
                                   ▲
            fussball.de-Kalender ──┘ (optional, per Kalender-Abo oder Datei-Import)
```

| Teil | Was | Kosten |
|---|---|---|
| **App** | React + Vite, reine Webseite (PWA), 3 Bibliotheken | – |
| **Supabase** | Datenbank (PostgreSQL), Anmeldung per E-Mail, Fotospeicher. Region **Frankfurt** | kostenlos (Free-Plan reicht für 150 Nutzer) |
| **Hosting** | Cloudflare Pages *oder* vorhandener Vereins-Webspace | kostenlos / vorhanden |
| **E-Mail-Versand** | z. B. Brevo (Frankreich) für Anmelde-Mails | kostenlos bis 300 Mails/Tag |

### Datenstruktur

| Tabelle | Inhalt |
|---|---|
| `sites` | Sportanlagen (Scharmede, Thüle) mit Adresse und Farbe im Plan |
| `fields` | Plätze je Sportanlage (Scharmede: 1 Platz, Thüle: Platz 1 und Platz 2). Doppelbelegung wird pro Platz geprüft |
| `teams` | Mannschaften mit Bereich (Senioren, Junioren, Weitere), Liga, Verein (Scharmede, Thüle oder SG), Heimplatz, optional fussball.de-Widget-ID und Kalender-Abo |
| `people` | Personen (Trainer, Betreuer, Vorstand) – mit oder ohne App-Konto; Telefon/Foto/E-Mail + Einwilligung |
| `team_contacts` | Wer ist Ansprechpartner welcher Mannschaft (Trainer, Co-Trainer, Betreuer) |
| `board_members` | Ansprechpartner: Funktion, Bereich (Vorstand, Jugendabteilung …), Verein, Zuständig für (einzelne Themen) |
| `series` | Wiederkehrende Termine (z. B. jeden Dienstag 18–19:30, ab/bis Datum) |
| `series_exceptions` | Einzelne abgesagte Termine einer Serie |
| `events` | Einzeltermine und Spiele (Heim: mit Platz; Auswärts: Spielort, Gegner) |
| `profiles` | App-Konten mit Rolle (Mitglied, Trainer, Vorstand, Admin) |
| `invites` | Einladungslinks (Rolle, aktiv/deaktiviert, Anzahl Registrierungen) |

**Die Rechte werden in der Datenbank selbst geprüft** (Row Level Security), nicht nur in der App:
- Mitglied: nur lesen
- Trainer: nur Termine der Mannschaften, bei denen sie als Ansprechpartner eingetragen sind
- Vorstand: Ansprechpartner pflegen, Personen ohne eigenes Konto anlegen und bearbeiten
- Admin: alles
- Telefon, Foto und E-Mail anderer Personen liefert die Datenbank **nur bei Einwilligung** aus.
- Registrieren kann sich nur, wer einen gültigen Einladungslink hat. **Der allererste Nutzer wird automatisch Admin.**

---

## 3. Einrichtung Schritt für Schritt

Dauer: ca. 1 Stunde. Man braucht eine E-Mail-Adresse für die Konten (am besten eine Vereinsadresse).

### 3.1 Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) mit der Vereins-E-Mail registrieren.
2. **New project** → Name z. B. `platzplan`, ein sicheres Datenbank-Passwort vergeben (im Passwort-Manager speichern!),
   **Region: „Central EU (Frankfurt)"** wählen → Plan **Free**.
3. Warten, bis das Projekt bereit ist (ca. 2 Minuten).

### 3.2 Datenbank einrichten

1. Links **SQL Editor** → **New query**.
2. Den kompletten Inhalt der Datei [`supabase/schema.sql`](supabase/schema.sql) hineinkopieren → **Run**. Es sollte „Success" erscheinen.
3. **Optional Testdaten:** Neue Query, Inhalt von [`supabase/seed.sql`](supabase/seed.sql) einfügen → **Run**.
   (Später löschen, siehe [3.8](#38-testdaten-löschen).)

### 3.3 E-Mail-Versand einrichten (wichtig!)

Supabase verschickt ohne eigene Einstellung nur sehr wenige Mails (und nur an das eigene Team). Für 150 Nutzer braucht ihr einen Mail-Dienst:

1. Kostenloses Konto bei [Brevo](https://www.brevo.com) (Sitz Frankreich) anlegen, Absenderadresse bestätigen (z. B. `platzplan@euer-verein.de`).
   Bei Brevo unter **SMTP & API** die SMTP-Zugangsdaten ansehen.
2. In Supabase: **Authentication → Emails → SMTP Settings** → „Enable custom SMTP":
   Host `smtp-relay.brevo.com`, Port `587`, Benutzer + Passwort von Brevo, Absendername „Platzplan SG".
3. **Authentication → Emails → Templates**: Die Vorlagen **„Confirm signup"** und **„Magic Link"** so ändern,
   dass **auch der Code** drinsteht (wichtig für iPhones, siehe [9](#9-hilfe-bei-problemen)). Betreff z. B. „Dein Anmelde-Code für den Platzplan", Text:

   ```html
   <h2>Anmeldung beim Platzplan</h2>
   <p>Dein Code: <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>Gib den Code in der App ein – oder tippe auf diesen Link:</p>
   <p><a href="{{ .ConfirmationURL }}">Jetzt anmelden</a></p>
   <p>Der Code ist 1 Stunde gültig. Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>
   ```
4. **Authentication → Sign In / Providers → Email**: „Enable Email provider" an, „Confirm email" an.
   (Die Registrierung bleibt eingeschaltet – die Datenbank lässt aber nur Personen mit gültigem Einladungslink zu.)
   **Anonyme Anmeldungen** und alle anderen Anbieter (Google usw.) aus lassen.

### 3.4 App veröffentlichen

Zuerst die beiden Werte aus Supabase holen: **Project Settings → API** (bzw. „Data API" / „API Keys"):
- **Project URL** (z. B. `https://abcd1234.supabase.co`)
- **anon / public key** (langer Text; dieser Schlüssel darf öffentlich sein, die Daten schützt die Datenbank)

**Variante A – Cloudflare Pages (empfohlen, Updates automatisch)**

1. Den Projektordner als Repository auf [GitHub](https://github.com) hochladen (kostenloses Konto; Repository auf „Private" stellen).
2. Kostenloses Konto bei [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git** → Repository wählen.
3. Einstellungen: Framework preset **Vite** (bzw. „None"), Build command `npm run build`, Build output directory `dist`.
4. Unter **Environment variables** eintragen:
   `VITE_SUPABASE_URL` = Project URL, `VITE_SUPABASE_ANON_KEY` = anon key.
5. **Save and Deploy**. Nach ca. 1 Minute ist die App unter `https://platzplan-xyz.pages.dev` erreichbar.
   Eine eigene Adresse wie `platzplan.sg-scharmede-thuele.de` kann man unter „Custom domains" einstellen.

> Hinweis Datenschutz: Cloudflare ist ein US-Anbieter und liefert nur die App-Dateien aus (keine Mitgliederdaten).
> Wer **ausschließlich EU-Hosting** möchte, nimmt Variante B.

**Variante B – Vorhandener Vereins-Webspace (z. B. IONOS, Strato, All-Inkl; Server in Deutschland)**

1. Auf dem eigenen Computer im Projektordner eine Datei `.env` anlegen (Vorlage: `.env.example`) und die zwei Werte eintragen.
2. Dann ausführen:
   ```bash
   npm install
   ```
   ```bash
   npm run build
   ```
3. Den **Inhalt** des entstandenen Ordners `dist` per FTP (z. B. mit FileZilla) in das Verzeichnis einer (Sub-)Domain hochladen,
   z. B. `platzplan.euer-verein.de`. Die mitgelieferte `.htaccess` sorgt dafür, dass alle Seiten funktionieren.
4. **HTTPS muss aktiv sein** (beim Hoster ein kostenloses SSL-Zertifikat einschalten) – sonst ist die App nicht installierbar.

### 3.5 Adresse der App in Supabase eintragen

Supabase → **Authentication → URL Configuration**:
- **Site URL**: die Adresse der App, z. B. `https://platzplan-xyz.pages.dev`
- **Redirect URLs**: dieselbe Adresse mit `/**` dahinter hinzufügen, z. B. `https://platzplan-xyz.pages.dev/**`

### 3.6 Ersten Admin anlegen

Der **erste** Nutzer, der sich registriert, wird automatisch Admin – dafür braucht er noch keinen Einladungslink:

1. In der App die Adresse `…/einladung/start` aufrufen, z. B. `https://platzplan-xyz.pages.dev/einladung/start`
   (solange noch niemand registriert ist, funktioniert jeder Einladungslink).
2. Namen und E-Mail eingeben → Code aus der E-Mail eingeben → fertig, ihr seid Admin.
3. Weitere Admins oder Vorstände: Einladungslink erstellen, registrieren lassen, dann unter **Verwalten → Personen & Konten** die Person antippen und die Rolle auf „Admin“ bzw. „Vorstand“ stellen.

### 3.7 Logos, Namen, Impressum, Datenschutz

- **Logos**: Eure Dateien (PNG oder SVG, möglichst quadratisch, transparenter Hintergrund) in den Ordner `public/logos/` legen
  und in [`src/config.js`](src/config.js) die Dateinamen bei `logoLeft` / `logoRight` eintragen.
- **Vereinsnamen, Heimspiel-Erkennung, Zeitbereich**: ebenfalls in [`src/config.js`](src/config.js).
- **Impressum & Datenschutzerklärung**: In [`src/pages/LegalPages.jsx`](src/pages/LegalPages.jsx) alle `[Platzhalter]` ersetzen.
  Bitte von jemandem mit Datenschutz-Erfahrung prüfen lassen (z. B. Landessportbund NRW / Kreissportbund).
- **App-Icon** (Startbildschirm): `public/icons/icon.svg` ersetzen und `node scripts/make-icons.cjs` ausführen (oder die PNG-Dateien in `public/icons/` direkt ersetzen: 192×192, 512×512, 180×180 für iPhone).

Nach Änderungen neu veröffentlichen (Variante A: auf GitHub hochladen, Cloudflare baut automatisch; Variante B: neu bauen und hochladen).

### 3.8 Testdaten löschen

Wenn ihr mit echten Daten startet: SQL Editor →

```sql
delete from events; delete from series; delete from board_members; delete from team_contacts;
delete from teams; delete from people where user_id is null; delete from fields; delete from sites;
```

Danach unter **Verwalten → Plätze** die Sportanlagen (Scharmede, Thüle) mit ihren Plätzen und unter **Mannschaften** eure Teams anlegen.

---

## 4. Bedienung für Admins

**Reihenfolge beim Start:** Sportanlagen & Plätze → Personen (Trainer, Vorstand) → Mannschaften (mit Ansprechpartnern) → Vorstand → Trainingszeiten → Einladungslinks verteilen.

| Aufgabe | Wo |
|---|---|
| Trainingszeit jede Woche | Plan → „+ Termin" oder Verwalten → Termine → „Jede Woche wiederholen" |
| Einzelnes Training absagen | Termin im Plan antippen → „Nur diesen Termin absagen" |
| Trainingszeit ändern / beenden | Verwalten → Termine → Stift bzw. Papierkorb („ab heute beenden") |
| Spiel eintragen / importieren | Verwalten → Spiele & Import |
| Trainer darf Termine pflegen | 1. Trainer registriert sich (Trainer-Einladungslink oder Rolle unter „Nutzer" auf „Trainer"); 2. unter Mannschaften als Ansprechpartner eintragen |
| Person mit Konto verknüpfen | Bei der Person die **gleiche E-Mail-Adresse** eintragen, *bevor* sie sich registriert – dann wird automatisch verknüpft |
| Einladungslink teilen / sperren | Verwalten → Einladungen (Teilen, Deaktivieren, Neu erzeugen) |
| Rolle ändern / App-Konto löschen | Verwalten → Personen & Konten → Person antippen → Abschnitt „App-Konto“ |

**Doppelbelegung:** Beim Speichern prüft die App den Platz (bei wöchentlichen Terminen die nächsten 26 Wochen). Gibt es Überschneidungen, erscheint eine Warnung – man kann trotzdem speichern (z. B. wenn sich zwei Jugendteams den Platz bewusst teilen). Im Plan sind solche Termine orange gestrichelt markiert.

**Rollen:** Mitglied (nur lesen), Trainer (Termine der eigenen Mannschaft pflegen), Vorstand (Ansprechpartner pflegen, inkl. Personen ohne eigenes Konto anlegen), Admin (alles: Mannschaften, Plätze, Personen & Konten, Rollen, Einladungen).

---

## 5. fussball.de – was geht und was nicht

**Ehrliche Einschätzung:**

| Weg | Rechtlich sauber? | Automatisch im Platzplan? |
|---|---|---|
| **Offizielle fussball.de-Widgets** (Spielplan einer Mannschaft) | ✅ ja – von fussball.de für Vereinsseiten vorgesehen | ❌ nein – das Widget ist ein eingebettetes Fenster von fussball.de; die App kann die Spiele daraus nicht auslesen |
| **Offizielle Schnittstelle (API)** | – | ❌ gibt es für Vereine nicht |
| **Automatisches Auslesen der fussball.de-Seiten (Scraping)** | ❌ widerspricht den Nutzungsbedingungen, fussball.de schützt sich technisch dagegen | – (bewusst **nicht** eingebaut) |
| **Kalenderdatei (.ics) oder CSV importieren** | ✅ ja | ✅ ja, mit Vorschau und Heim/Auswärts-Erkennung |
| **Kalender-Abo (iCal-Adresse)** | ✅ ja, wenn ihr eine Adresse habt, die ihr nutzen dürft | ✅ ja, automatisch (z. B. nachts) |
| **Manuell eintragen** | ✅ | ✅ |

**Empfehlung für den Alltag:**
1. Zu Saisonbeginn den Spielplan jeder Mannschaft **importieren** (CSV-Vorlage aus „Spiele & Import", z. B. aus dem Spielplan abgetippt/kopiert oder aus einem Export eures **DFBnet**-Zugangs, falls euer Zugang einen Export anbietet – bitte beim Staffelleiter/Kreis nachfragen).
2. **Verlegungen** von Hand ändern (Spiel antippen → Bearbeiten) oder die Datei erneut importieren – bereits importierte Spiele werden aktualisiert statt doppelt angelegt.
3. Optional pro Mannschaft das **fussball.de-Widget** einbinden: Auf fussball.de einloggen → „Widgets" → Widget für die Mannschaft erzeugen und dabei die **Adresse eurer App** (z. B. `platzplan-xyz.pages.dev`) als Webseite angeben → die angezeigte Widget-ID unter Verwalten → Mannschaften eintragen. Das Widget wird erst nach einem Klick geladen (Datenschutz). Falls fussball.de das Einbettungsformat ändert, muss nur die Datei `src/components/FussballDeWidget.jsx` angepasst werden.

**Grenzen:**
- Ohne Kalender-Abo werden Spielverlegungen **nicht automatisch** übernommen.
- Bei der CSV-Datei erkennt die App ein Spiel als „neu", wenn sich Datum/Uhrzeit ändern (alter Eintrag muss dann gelöscht werden). Beim iCal-Abo passiert das automatisch.
- Heim/Auswärts wird an den Vereinsnamen erkannt (`homeKeywords` in `src/config.js`). Unsichere Fälle werden in der Vorschau markiert.

### Kalender-Abo automatisch abgleichen

**Bei euch eingerichtet (23.11.2026):** Die Server-Funktion `ical-sync` gleicht alle Kalender-Abos **täglich zweimal** ab (ca. 4:17 und 13:17 Uhr, im Sommer eine Stunde später) und zusätzlich, wenn ein Admin auf „Jetzt abgleichen“ tippt. Das Passwort für den zeitgesteuerten Aufruf liegt im verschlüsselten Tresor (Vault) der Datenbank.

- Kontrolle, ob der Abgleich läuft: Supabase → **SQL Editor** → `select created, status_code, content from net._http_response order by id desc limit 5;`
- Zeitplan ansehen oder ändern: Supabase → **Integrations → Cron** (Eintrag `platzplan-ical-sync`).
- Neu einrichten (z. B. in einem neuen Projekt): Funktion [`supabase/functions/ical-sync/index.ts`](supabase/functions/ical-sync/index.ts) als Edge Function `ical-sync` anlegen („Verify JWT“ aus), dann [`supabase/cron.sql`](supabase/cron.sql) mit eurer Projekt-ID und einem eigenen Zufallspasswort ausführen.

---

## 6. Backup

**Was muss gesichert werden?** Nur die Datenbank (und ggf. Fotos). Die App selbst liegt auf GitHub bzw. als Ordner bei euch.

- **Einfach (monatlich empfohlen):** Supabase → **Table Editor** → jede Tabelle öffnen → „Export" → **CSV**. Die Dateien in einem Vereinsordner ablegen.
- **Vollständig (empfohlen vor großen Änderungen):** Auf dem eigenen Computer (Node.js installiert):
  ```bash
  npx supabase db dump --db-url "postgresql://postgres.PROJEKT:PASSWORT@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" --data-only -f backup-daten.sql
  ```
  Die genaue Verbindungsadresse steht in Supabase unter **Connect → Session pooler**. Datei sicher (verschlüsselt) aufbewahren – sie enthält personenbezogene Daten.
- **Automatisch:** Im kostenpflichtigen Supabase-Pro-Plan (ca. 25 $/Monat) gibt es tägliche Backups der letzten 7 Tage.

**Wiederherstellen:** Neues Supabase-Projekt → `schema.sql` ausführen → Backup-Datei im SQL Editor ausführen (oder CSV-Dateien im Table Editor importieren: zuerst `fields`, `people`, `teams`, dann den Rest).

**Achtung Free-Plan:** Supabase pausiert kostenlose Projekte nach **7 Tagen ohne Nutzung** (z. B. Sommerpause). Daten gehen nicht verloren, man muss das Projekt im Dashboard wieder starten. Vorbeugen: Auf GitHub unter Settings → Secrets → Actions die Werte `SUPABASE_URL` und `SUPABASE_ANON_KEY` eintragen – dann hält die mitgelieferte Datei `.github/workflows/keepalive.yml` das Projekt automatisch wach.

---

## 7. Updates

- **Inhalte** (Termine, Teams, Personen) pflegt ihr in der App – dafür ist kein Update nötig.
- **App-Änderungen** (Texte, Logos, Funktionen): Dateien ändern → Variante A: auf GitHub hochladen (Cloudflare veröffentlicht automatisch); Variante B: `npm run build` und Ordner `dist` neu hochladen.
  Die Handys holen sich die neue Version beim nächsten Öffnen automatisch (ggf. App einmal schließen und neu öffnen).
- **Bibliotheken aktualisieren** (ca. 1× pro Jahr, am besten durch jemanden mit etwas Erfahrung):
  ```bash
  npm update
  ```
  ```bash
  npm run build
  ```
  Danach kurz testen (Demo-Modus: `npm run dev` ohne `.env`).
- **Datenbank-Änderungen**: `schema.sql` kann gefahrlos erneut ausgeführt werden – vorhandene Daten bleiben erhalten.

---

## 8. Datenschutz-Checkliste

- [ ] Impressum und Datenschutzerklärung ausgefüllt (`src/pages/LegalPages.jsx`)
- [ ] Supabase-Region **Frankfurt** gewählt
- [ ] **Auftragsverarbeitungsvertrag (DPA)** mit Supabase abschließen (Supabase → Organization Settings → Legal Documents / DPA) und mit Brevo
- [ ] Bei Hosting über Cloudflare: Cloudflare-DPA (im Dashboard verfügbar) bzw. Variante B (EU-Webspace) nutzen
- [ ] Bei gemeinsamer Verantwortung beider Vereine: kurze Vereinbarung nach Art. 26 DSGVO
- [ ] Einwilligungen von Personen **ohne eigenes Konto** schriftlich/per E-Mail einholen und aufbewahren, bevor ihr im Admin-Bereich „Einwilligung liegt vor" ankreuzt
- [ ] Verarbeitungsverzeichnis des Vereins um „Platzplan-App" ergänzen
- [ ] Ehemalige Trainer/Nutzer regelmäßig (z. B. zum Saisonende) löschen; alte Termine nach der Saison löschen

**Was die App für den Datenschutz tut:** keine Tracking- oder Werbe-Cookies, keine Analyse-Dienste, Fotos werden beim Hochladen auf 400 px verkleinert, Fotos liegen in einem geschützten Speicher und sind nur bei Einwilligung abrufbar, jeder Nutzer kann sein Konto selbst löschen, das fussball.de-Widget lädt erst nach Klick.

---

## 9. Hilfe bei Problemen

**„Ich bekomme keine E-Mail."** → Spam-Ordner prüfen. Admin: SMTP-Einstellungen (3.3) prüfen; bei Brevo unter „Transactional → Logs" nachsehen.

**„Ich tippe auf den Link in der E-Mail, aber die App auf dem Startbildschirm bleibt abgemeldet."** → Das ist normal, besonders auf dem iPhone: Der Link öffnet Safari/Chrome statt der installierten App, und beide haben getrennte Anmeldungen. **Lösung: Den 6-stelligen Code aus der E-Mail in der App eingeben.** Die App merkt sich, dass sie auf den Code wartet, auch wenn man zwischendurch ins Mail-Programm wechselt.

**„Der Einladungslink ist ungültig."** → Der Link wurde deaktiviert oder neu erzeugt. Admin: Verwalten → Einladungen → aktuellen Link teilen.

**„Ich bin Trainer, kann aber keine Termine anlegen."** → Zwei Dinge müssen stimmen: Rolle „Trainer" (Verwalten → Personen & Konten) **und** als Ansprechpartner der Mannschaft eingetragen (Verwalten → Mannschaften). Dann App neu öffnen.

**„Nach längerer Zeit bin ich auf dem iPhone abgemeldet."** → iOS löscht bei selten genutzten Web-Apps manchmal gespeicherte Daten. Einfach neu anmelden – alle Termine liegen auf dem Server.

**„Die App zeigt alte Inhalte."** → App ganz schließen und neu öffnen; im Browser die Seite neu laden.

**„Plötzlich geht gar nichts mehr / Fehler beim Laden."** → Supabase-Dashboard öffnen: Ist das Projekt pausiert? → „Restore project".

---

## 10. Für Entwickler

```
src/
  config.js              Vereinseinstellungen
  App.jsx                Routen, Layout, Navigation
  store.jsx              Globaler Zustand (Nutzer, Stammdaten)
  data/api.js            Wählt Supabase oder Demo-Modus
  data/supabaseApi.js    Supabase-Anbindung (implicit flow, OTP-Code)
  data/demoApi.js        In-Memory-Backend mit Testdaten
  data/seed.js           Testdaten (Quelle für Demo und supabase/seed.sql)
  lib/schedule.js        Serien ausrollen, Doppelbelegung, Spalten-Layout
  lib/importers.js       iCal- und CSV-Import
  pages/…                Seiten (Plan, Teams, Vorstand, Profil, Verwaltung)
  components/…           Formulare, Bottom-Sheet, Kontaktkarte, fussball.de-Widget
public/                  Manifest, Service Worker, Icons, Logos, _headers, .htaccess
supabase/schema.sql      Tabellen, Rechte (RLS), Trigger, Storage-Regeln
supabase/seed.sql        Testdaten (generiert: node scripts/make-seed-sql.mjs)
supabase/functions/      Edge Function für iCal-Abos
```

- Abhängigkeiten: `react`, `react-dom`, `@supabase/supabase-js` (+ `vite` zum Bauen). Kein Router, kein UI-Framework.
- Anmeldung: Supabase OTP mit `flowType: 'implicit'`, damit der E-Mail-Link auch in einem anderen Browser funktioniert; zusätzlich Code-Eingabe (`verifyOtp`), damit installierte PWAs (getrennter Speicher auf iOS) zuverlässig angemeldet werden.
- Daten liegen ausschließlich in Supabase; `localStorage` wird nur für Komfort genutzt (zuletzt gewählter Platz/Ansicht, wartende Code-Eingabe) sowie im Demo-Modus.
- Zeiten: Einzeltermine als `timestamptz`, Serien als lokale Uhrzeit + Wochentag; die App rechnet in der Gerätezeit (Deutschland).
