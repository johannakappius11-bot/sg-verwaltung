// =====================================================================
//  Vereins-Einstellungen – hier könnt ihr Namen, Logos und Texte ändern.
// =====================================================================
export const config = {
  appName: 'Platzplan SG',
  title: 'SG Scharmede/Thüle',
  clubs: ['SC Concordia Scharmede', 'VfL Thüle'],

  // Logos: Dateien in den Ordner public/logos legen und hier den Dateinamen eintragen.
  logoLeft: '/logos/scharmede.svg',
  logoRight: '/logos/thuele.svg',

  // Vereine für Filter: Mannschaften/Ansprechpartner der SG erscheinen bei beiden Vereinen
  clubFilter: [
    { value: 'SC Concordia Scharmede', label: 'Scharmede' },
    { value: 'VfL Thüle', label: 'Thüle' },
  ],
  // Bereiche auf der Seite "Ansprechpartner"
  contactGroups: ['Vorstand', 'Jugendabteilung', 'Spielbetrieb', 'Sportanlage & Platzpflege', 'Sonstige'],

  // Woran erkennt der Import ein Heimspiel? (Teil des Mannschaftsnamens in fussball.de)
  homeKeywords: ['Scharmede', 'Thüle', 'Thuele'],

  // Sichtbarer Zeitbereich im Wochenplan (wird bei Bedarf automatisch erweitert)
  dayStartHour: 9,
  dayEndHour: 22,

  // Verbindung zur Datenbank (Supabase, Frankfurt). Beide Werte sind öffentlich –
  // die Daten schützt die Datenbank selbst. Den "service_role"/"Secret key" NIE hier eintragen!
  supabaseUrl: 'https://jsfloxvcxahisiqhfohq.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzZmxveHZjeGFoaXNpcWhmb2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0MTY1MDAsImV4cCI6MjExMDk5MjUwMH0.etbwBpEtFrkbiUSD5MusDEjz4XK7cCiSozteBRM0JGk',

  // Kontakt für Fragen zur App (erscheint auf der Login-Seite)
  supportContact: 'Bitte wende dich an den Vorstand.',
};
