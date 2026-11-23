// Testdaten (fiktiv). Werden im Demo-Modus verwendet und mit
// `node scripts/make-seed-sql.mjs` in supabase/seed.sql umgewandelt.
// Termine sind relativ zur aktuellen Woche (week: 0 = diese Woche).

export const seed = {
  // Sportanlagen (Orte) mit Farbe im Plan
  sites: [
    { key: 'S', name: 'Sportanlage Scharmede', short_name: 'Scharmede', address: 'Am Sportplatz, 33154 Salzkotten-Scharmede (Platzhalter)', color: '#2e7d32', sort: 1 },
    { key: 'T', name: 'Sportanlage Thüle', short_name: 'Thüle', address: 'Sportplatzweg, 33154 Salzkotten-Thüle (Platzhalter)', color: '#c62828', sort: 2 },
  ],
  // Plätze je Anlage (Scharmede: 1 Platz, Thüle: 2 Plätze)
  fields: [
    { key: 'S1', site: 'S', name: 'Fußballplatz', short_name: 'Platz', sort: 1 },
    { key: 'T1', site: 'T', name: 'Platz 1', short_name: 'P1', sort: 2 },
    { key: 'T2', site: 'T', name: 'Platz 2', short_name: 'P2', sort: 3 },
  ],
  teams: [
    { key: 'H1', name: '1. Herren', short_name: '1. H', category: 'Senioren', home: 'S1', club: 'SG Scharmede/Thüle' },
    { key: 'H2', name: '2. Herren', short_name: '2. H', category: 'Senioren', home: 'T1', club: 'SG Scharmede/Thüle' },
    { key: 'AH', name: 'Alte Herren', short_name: 'AH', category: 'Senioren', home: 'T1', club: 'VfL Thüle' },
    { key: 'FR', name: 'Frauen', short_name: 'Frauen', category: 'Frauen', home: 'S1', club: 'SC Concordia Scharmede' },
    { key: 'A', name: 'A-Jugend (U19)', short_name: 'A-Jgd', category: 'Junioren', home: 'S1', club: 'SG Scharmede/Thüle' },
    { key: 'B', name: 'B-Jugend (U17)', short_name: 'B-Jgd', category: 'Junioren', home: 'T1', club: 'SG Scharmede/Thüle' },
    { key: 'C', name: 'C-Jugend (U15)', short_name: 'C-Jgd', category: 'Junioren', home: 'S1', club: 'SG Scharmede/Thüle' },
    { key: 'D', name: 'D-Jugend (U13)', short_name: 'D-Jgd', category: 'Junioren', home: 'T2', club: 'VfL Thüle' },
    { key: 'E1', name: 'E1-Jugend (U11)', short_name: 'E1', category: 'Junioren', home: 'T2', club: 'VfL Thüle' },
    { key: 'E2', name: 'E2-Jugend (U11)', short_name: 'E2', category: 'Junioren', home: 'S1', club: 'SC Concordia Scharmede' },
    { key: 'F', name: 'F-Jugend (U9)', short_name: 'F-Jgd', category: 'Junioren', home: 'S1', club: 'SC Concordia Scharmede' },
    { key: 'BAM', name: 'Bambini (U7)', short_name: 'Bambini', category: 'Junioren', home: 'T2', club: 'VfL Thüle' },
  ],
  people: [
    { key: 'p1', name: 'Markus Beispiel', phone: '0170 1234501', email: 'markus@example.org', consent: true },
    { key: 'p2', name: 'Thomas Muster', phone: '0170 1234502', email: null, consent: true },
    { key: 'p3', name: 'Stefan Platzhalter', phone: '0170 1234503', email: null, consent: false },
    { key: 'p4', name: 'Julia Testfrau', phone: '0170 1234504', email: 'julia@example.org', consent: true },
    { key: 'p5', name: 'Andreas Probe', phone: '0170 1234505', email: null, consent: true },
    { key: 'p6', name: 'Christian Demo', phone: '0170 1234506', email: null, consent: false },
    { key: 'p7', name: 'Sabine Vorlage', phone: '0170 1234507', email: null, consent: true },
    { key: 'p8', name: 'Michael Entwurf', phone: '0170 1234508', email: null, consent: true },
    { key: 'p9', name: 'Katrin Schema', phone: '0170 1234509', email: null, consent: false },
    { key: 'p10', name: 'Daniel Fiktiv', phone: '0170 1234510', email: null, consent: true },
    { key: 'p11', name: 'Nina Exempel', phone: '0170 1234511', email: null, consent: true },
    { key: 'p12', name: 'Peter Annahme', phone: '0170 1234512', email: null, consent: true },
    { key: 'p13', name: 'Laura Skizze', phone: '0170 1234513', email: null, consent: false },
    { key: 'v1', name: 'Hubert Vorsitz', phone: '05292 1001', email: 'vorstand@scharmede.example', consent: true },
    { key: 'v2', name: 'Gerd Vorstand', phone: '05258 2002', email: 'vorstand@thuele.example', consent: true },
    { key: 'v3', name: 'Monika Kasse', phone: '05292 1003', email: null, consent: true },
    { key: 'v4', name: 'Frank Jugendleiter', phone: '0171 9900404', email: 'jugend@sg.example', consent: true },
    { key: 'v5', name: 'Ralf Geschäft', phone: null, email: null, consent: false },
    { key: 'v6', name: 'Werner Platzpflege', phone: '0171 5550606', email: null, consent: true },
    { key: 'v7', name: 'Bernd Rasenmeister', phone: '0171 5550707', email: null, consent: true },
    { key: 'v8', name: 'Jörg Pfeife', phone: '0171 5550808', email: 'schiri@sg.example', consent: true },
    { key: 'v9', name: 'Heike Ausrüstung', phone: '0171 5550909', email: null, consent: false },
  ],
  contacts: [
    ['H1', 'p1', 'Trainer', true], ['H1', 'p2', 'Co-Trainer', false],
    ['H2', 'p3', 'Trainer', true],
    ['AH', 'p5', 'Betreuer', true],
    ['FR', 'p4', 'Trainerin', true],
    ['A', 'p6', 'Trainer', true], ['A', 'p2', 'Betreuer', false],
    ['B', 'p8', 'Trainer', true],
    ['C', 'p10', 'Trainer', true],
    ['D', 'p7', 'Trainerin', true], ['D', 'p12', 'Co-Trainer', false],
    ['E1', 'p11', 'Trainerin', true],
    ['E2', 'p12', 'Trainer', true],
    ['F', 'p9', 'Trainerin', true],
    ['BAM', 'p13', 'Trainerin', true],
  ],
  // [Person, Funktion, Verein, Zuständigkeit, Reihenfolge, Bereich]
  board: [
    ['v1', '1. Vorsitzender', 'SC Concordia Scharmede', 'Gesamtleitung, Platzbelegung Scharmede', 1, 'Vorstand'],
    ['v2', '1. Vorsitzender', 'VfL Thüle', 'Gesamtleitung, Platzbelegung Thüle', 2, 'Vorstand'],
    ['v3', 'Kassiererin', 'SC Concordia Scharmede', 'Finanzen, Mitgliedsbeiträge', 3, 'Vorstand'],
    ['v5', 'Geschäftsführer', 'VfL Thüle', 'Passwesen, Mitgliederverwaltung', 4, 'Vorstand'],
    ['v4', 'Jugendleiter', 'SG Scharmede/Thüle', 'Jugendabteilung, Platzbelegung Jugend', 5, 'Jugendabteilung'],
    ['v8', 'Schiedsrichter-Obmann', 'SG Scharmede/Thüle', 'Schiedsrichter, Spielverlegungen', 6, 'Spielbetrieb'],
    ['v6', 'Platzwart', 'SC Concordia Scharmede', 'Platzpflege, Flutlicht, Kabinen Scharmede', 7, 'Sportanlage & Platzpflege'],
    ['v7', 'Platzwart', 'VfL Thüle', 'Platzpflege Platz 1 und 2, Flutlicht, Kabinen Thüle', 8, 'Sportanlage & Platzpflege'],
    ['v9', 'Zeugwartin', 'SG Scharmede/Thüle', 'Trikots, Bälle, Trainingsmaterial', 9, 'Sonstige'],
  ],

  // [team, field, weekday (1=Mo … 7=So), start, end]
  series: [
    ['H1', 'S1', 2, '19:00', '20:30'], ['H1', 'S1', 4, '19:00', '20:30'],
    ['H2', 'T1', 2, '19:00', '20:30'], ['H2', 'T1', 4, '19:30', '21:00'],
    ['AH', 'T1', 5, '19:00', '20:30'],
    ['FR', 'S1', 1, '18:30', '20:00'], ['FR', 'S1', 3, '19:00', '20:30'],
    ['A', 'S1', 1, '17:00', '18:30'], ['A', 'S1', 3, '17:30', '19:00'],
    ['B', 'T1', 1, '17:30', '19:00'], ['B', 'T1', 3, '18:00', '19:30'],
    ['C', 'S1', 2, '17:30', '19:00'], ['C', 'S1', 4, '17:30', '19:00'],
    ['D', 'T2', 3, '16:30', '18:00'], ['D', 'T2', 5, '17:00', '18:30'],
    ['E1', 'T2', 3, '17:00', '18:15'],              // überschneidet sich mit D-Jugend (Demo für Warnung)
    ['E2', 'S1', 2, '16:30', '17:30'],
    ['F', 'S1', 4, '16:30', '17:30'],
    ['BAM', 'T2', 5, '15:30', '16:30'],
  ],
  // Spiele: week relativ zur aktuellen Woche, weekday 1=Mo … 7=So
  games: [
    { team: 'H1', week: 0, weekday: 7, time: '15:00', dur: 120, away: false, opponent: 'SV Musterdorf', competition: 'Kreisliga A' },
    { team: 'H2', week: 0, weekday: 7, time: '13:00', dur: 120, away: false, opponent: 'SV Musterdorf II', competition: 'Kreisliga C' },
    { team: 'A', week: 0, weekday: 6, time: '15:00', dur: 120, away: true, opponent: 'JSG Waldstadt', venue: 'Sportpark Waldstadt, Hauptstraße 1, 33100 Waldstadt', competition: 'Kreisliga' },
    { team: 'D', week: 0, weekday: 6, time: '11:00', dur: 90, away: false, opponent: 'TuS Grünfeld', competition: 'Kreisliga' },
    { team: 'E1', week: 0, weekday: 6, time: '10:00', dur: 75, away: true, opponent: 'SpVg Lindenau', venue: 'Sportplatz Lindenau, Am Bach 3', competition: 'Kreisklasse' },
    { team: 'FR', week: 0, weekday: 7, time: '11:00', dur: 120, away: true, opponent: 'FC Beispielhausen', venue: 'Kunstrasen Beispielhausen, Schulweg 12', competition: 'Bezirksliga' },
    { team: 'AH', week: 0, weekday: 5, time: '19:00', dur: 90, away: true, opponent: 'SC Bergheide AH', venue: 'Sportplatz Bergheide', competition: 'Freundschaftsspiel' },
    { team: 'H1', week: 1, weekday: 7, time: '14:30', dur: 120, away: true, opponent: 'FC Beispielhausen', venue: 'Waldstadion Beispielhausen, Schulweg 10', competition: 'Kreisliga A' },
    { team: 'H2', week: 1, weekday: 7, time: '12:30', dur: 120, away: true, opponent: 'FC Beispielhausen II', venue: 'Waldstadion Beispielhausen, Schulweg 10', competition: 'Kreisliga C' },
    { team: 'B', week: 1, weekday: 6, time: '13:00', dur: 100, away: false, opponent: 'VfB Waldstadt', competition: 'Kreisliga' },
    { team: 'C', week: 1, weekday: 6, time: '11:00', dur: 90, away: false, opponent: 'TuS Grünfeld', competition: 'Kreisliga' },
    { team: 'FR', week: 1, weekday: 7, time: '11:00', dur: 120, away: false, opponent: 'SV Musterdorf', competition: 'Bezirksliga' },
    { team: 'H1', week: -1, weekday: 7, time: '15:00', dur: 120, away: false, opponent: 'SC Bergheide', competition: 'Kreisliga A' },
    { team: 'H1', week: 2, weekday: 7, time: '15:00', dur: 120, away: false, opponent: 'TuS Grünfeld', competition: 'Kreisliga A' },
  ],
  // Sonstige Termine
  others: [
    { team: 'F', field: 'T2', week: 1, weekday: 6, time: '10:00', dur: 240, title: 'Spielfest F-Jugend', note: 'Mit 6 Mannschaften, Platz komplett belegt' },
  ],
  // Demo-Nutzer (nur Demo-Modus): Rolle + verknüpfte Person
  demoUsers: [
    { key: 'u_admin', email: 'admin@demo.de', role: 'admin', person: 'v4' },
    { key: 'u_trainer', email: 'trainer@demo.de', role: 'trainer', person: 'p7' },
    { key: 'u_member', email: 'mitglied@demo.de', role: 'member', person: null, name: 'Max Mitglied' },
  ],
};
