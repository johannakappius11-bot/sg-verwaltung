// Demo-Modus: läuft komplett im Browser mit Testdaten, ohne Server.
// Wird automatisch genutzt, solange keine Supabase-Zugangsdaten eingetragen sind.
// Hinweis: Daten liegen nur in diesem Browser und dienen nur zum Ausprobieren.
import { seed } from './seed.js';
import { addDays, startOfWeek, combine, ymd } from '../lib/dates.js';

const STORE_KEY = 'platzplan-demo-v2';
const USER_KEY = 'platzplan-demo-user';
let counter = 0;
const newId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function buildDb() {
  const id = (k) => `id-${k}`;
  const monday = startOfWeek(new Date());
  const at = (week, weekday, time, addMin = 0) => {
    const d = combine(ymd(addDays(monday, week * 7 + weekday - 1)), time);
    return new Date(d.getTime() + addMin * 60000).toISOString();
  };
  const db = {
    fields: seed.fields.map((f) => ({ id: id('f' + f.key), name: f.name, short_name: f.short_name, address: f.address, color: f.color, sort: f.sort })),
    people: seed.people.map((p) => ({ id: id(p.key), user_id: null, name: p.name, phone: p.phone, email: p.email, photo_path: null, consent: p.consent, consent_at: p.consent ? new Date().toISOString() : null })),
    teams: seed.teams.map((t, i) => ({ id: id('t' + t.key), name: t.name, short_name: t.short_name, category: t.category, home_field_id: id('f' + t.home), fussballde_widget_id: null, ical_url: null, active: true, sort: i + 1 })),
    team_contacts: seed.contacts.map(([t, p, role, prim], i) => ({ id: id('tc' + i), team_id: id('t' + t), person_id: id(p), role, is_primary: prim, sort: i })),
    board_members: seed.board.map(([p, position, club, responsibility, sort]) => ({ id: id('b' + p), person_id: id(p), position, club, responsibility, sort })),
    series: seed.series.map(([t, f, weekday, a, b], i) => ({ id: id('s' + i), team_id: id('t' + t), field_id: id('f' + f), kind: 'training', weekday, start_time: a + ':00', end_time: b + ':00', valid_from: ymd(addDays(monday, -28)), valid_until: null, note: null })),
    series_exceptions: [],
    events: [
      ...seed.games.map((g, i) => ({
        id: id('g' + i), team_id: id('t' + g.team), field_id: g.away ? null : id('f' + seed.teams.find((t) => t.key === g.team).home),
        kind: 'spiel', title: null, starts_at: at(g.week, g.weekday, g.time), ends_at: at(g.week, g.weekday, g.time, g.dur),
        is_away: g.away, opponent: g.opponent, venue: g.venue || null, competition: g.competition, note: null, source: 'manual', external_uid: 'seed-game-' + i,
      })),
      ...seed.others.map((o, i) => ({
        id: id('o' + i), team_id: id('t' + o.team), field_id: id('f' + o.field), kind: 'sonstiges', title: o.title, note: o.note,
        starts_at: at(o.week, o.weekday, o.time), ends_at: at(o.week, o.weekday, o.time, o.dur), is_away: false, source: 'manual', external_uid: 'seed-other-' + i,
      })),
    ],
    profiles: seed.demoUsers.map((u) => ({ id: u.key, email: u.email, role: u.role, created_at: new Date().toISOString() })),
    invites: [{ id: 'inv1', token: 'demo-einladung', label: 'Allgemeiner Link (Mitglieder)', role: 'member', active: true, uses: 4, expires_at: null, created_at: new Date().toISOString() }],
    photos: {},
  };
  // Demo-Nutzer mit Personen verknüpfen
  for (const u of seed.demoUsers) {
    if (u.person) db.people.find((p) => p.id === id(u.person)).user_id = u.key;
    else db.people.push({ id: id('pu' + u.key), user_id: u.key, name: u.name, phone: null, email: u.email, photo_path: null, consent: false, consent_at: null });
  }
  return db;
}

function load() {
  try { const s = localStorage.getItem(STORE_KEY); if (s) return JSON.parse(s); } catch { /* ignorieren */ }
  return buildDb();
}

export function createDemoApi() {
  let db = load();
  let userId = null;
  try { userId = localStorage.getItem(USER_KEY); } catch { /* ignorieren */ }
  const listeners = new Set();
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch { /* voll */ } };
  const notify = () => listeners.forEach((cb) => cb(userId ? { id: userId } : null));
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const delay = (v) => new Promise((r) => setTimeout(() => r(v), 60));

  const role = () => db.profiles.find((p) => p.id === userId)?.role || 'none';
  const myTeams = () => {
    const person = db.people.find((p) => p.user_id === userId);
    if (!person || role() !== 'trainer') return [];
    return db.team_contacts.filter((tc) => tc.person_id === person.id).map((tc) => tc.team_id);
  };
  const deny = () => { throw new Error('Dafür fehlt dir die Berechtigung.'); };
  function canWrite(table, row) {
    if (role() === 'admin') return true;
    if (table === 'events' || table === 'series') return myTeams().includes(row.team_id);
    if (table === 'series_exceptions') { const s = db.series.find((x) => x.id === row.series_id); return s && myTeams().includes(s.team_id); }
    if (table === 'people') return row.user_id === userId;
    return false;
  }

  function view(table) {
    if (table === 'people_public') {
      return db.people.map((p) => ({ id: p.id, name: p.name, phone: p.consent ? p.phone : null, email: p.consent ? p.email : null, photo_path: p.consent ? p.photo_path : null }));
    }
    if (table === 'people' && role() !== 'admin') return db.people.filter((p) => p.user_id === userId);
    if ((table === 'profiles') && role() !== 'admin') return db.profiles.filter((p) => p.id === userId);
    if (table === 'invites' && role() !== 'admin') return [];
    return db[table] || [];
  }

  return {
    mode: 'demo',
    demoUsers: seed.demoUsers,
    async getUser() { return userId ? { id: userId, email: db.profiles.find((p) => p.id === userId)?.email } : null; },
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async demoLogin(key) { userId = key; try { localStorage.setItem(USER_KEY, key); } catch { /* */ } notify(); },
    async sendCode(email) {
      if (!db.profiles.some((p) => p.email === email.trim().toLowerCase()))
        throw new Error('Im Demo-Modus bitte eine der Demo-Adressen nutzen (z. B. admin@demo.de).');
      return delay();
    },
    async verifyCode(email, code) {
      if (code.trim() !== '123456') throw new Error('Im Demo-Modus lautet der Code immer 123456.');
      const p = db.profiles.find((x) => x.email === email.trim().toLowerCase());
      await this.demoLogin(p.id);
    },
    async signOut() { userId = null; try { localStorage.removeItem(USER_KEY); } catch { /* */ } notify(); },
    async checkInvite(token) { return db.invites.some((i) => i.token === token && i.active); },
    async me(user) {
      const p = db.profiles.find((x) => x.id === user.id);
      const person = db.people.find((x) => x.user_id === user.id) || null;
      const teamIds = person ? db.team_contacts.filter((tc) => tc.person_id === person.id).map((tc) => tc.team_id) : [];
      return { id: user.id, email: p?.email, role: p?.role || 'none', person: clone(person), teamIds };
    },
    async list(table, o = {}) {
      if (role() === 'none') return [];
      let rows = view(table);
      for (const [k, v] of Object.entries(o.eq || {})) rows = rows.filter((r) => r[k] === v);
      for (const [k, v] of Object.entries(o.gte || {})) rows = rows.filter((r) => r[k] >= v);
      for (const [k, v] of Object.entries(o.lt || {})) rows = rows.filter((r) => r[k] < v);
      for (const [k, v] of Object.entries(o.in || {})) rows = rows.filter((r) => v.includes(r[k]));
      if (o.order) rows = [...rows].sort((a, b) => (a[o.order] > b[o.order] ? 1 : -1) * (o.desc ? -1 : 1));
      return delay(clone(rows));
    },
    async insert(table, row) {
      if (!canWrite(table, row)) deny();
      const r = { id: newId(), ...row };
      if (table === 'invites') { r.token = r.token || newId(); r.uses = 0; r.active = r.active ?? true; }
      if (table === 'people' && r.consent) r.consent_at = new Date().toISOString();
      db[table].push(r); save(); return delay(clone(r));
    },
    async update(table, id, patch) {
      const row = db[table].find((r) => r.id === id);
      if (!row) throw new Error('Nicht gefunden');
      if (!canWrite(table, row) || !canWrite(table, { ...row, ...patch })) deny();
      if (table === 'people' && 'consent' in patch) patch.consent_at = patch.consent ? (row.consent ? row.consent_at : new Date().toISOString()) : null;
      Object.assign(row, patch); save(); return delay(clone(row));
    },
    async remove(table, id) {
      const row = db[table].find((r) => r.id === id);
      if (row && !canWrite(table, row)) deny();
      db[table] = db[table].filter((r) => r.id !== id);
      if (table === 'teams') { db.team_contacts = db.team_contacts.filter((x) => x.team_id !== id); db.series = db.series.filter((x) => x.team_id !== id); db.events = db.events.filter((x) => x.team_id !== id); }
      if (table === 'people') { db.team_contacts = db.team_contacts.filter((x) => x.person_id !== id); db.board_members = db.board_members.filter((x) => x.person_id !== id); }
      if (table === 'series') db.series_exceptions = db.series_exceptions.filter((x) => x.series_id !== id);
      save(); return delay();
    },
    async upsertMany(table, rows, onConflict) {
      const out = [];
      for (const r of rows) {
        if (!canWrite(table, r)) deny();
        const ex = db[table].find((x) => x[onConflict] === r[onConflict]);
        if (ex) { Object.assign(ex, r); out.push(ex); } else { const n = { id: newId(), ...r }; db[table].push(n); out.push(n); }
      }
      save(); return delay(clone(out));
    },
    async rpc(name, args) {
      if (name === 'admin_delete_user') {
        if (role() !== 'admin') deny();
        db.profiles = db.profiles.filter((p) => p.id !== args.p_user);
        db.people.forEach((p) => { if (p.user_id === args.p_user) p.user_id = null; });
        save(); return null;
      }
      if (name === 'delete_my_account') {
        db.profiles = db.profiles.filter((p) => p.id !== userId);
        db.people.forEach((p) => { if (p.user_id === userId) Object.assign(p, { user_id: null, phone: null, photo_path: null, consent: false }); });
        save(); await this.signOut(); return null;
      }
      throw new Error('Unbekannte Funktion ' + name);
    },
    async photoUrls(paths) { return Object.fromEntries(paths.filter((p) => p && db.photos[p]).map((p) => [p, db.photos[p]])); },
    async uploadPhoto(blob, folder) {
      const dataUrl = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
      const path = `${folder}/${newId()}.jpg`; db.photos[path] = dataUrl; save(); return path;
    },
    async deletePhoto(path) { delete db.photos[path]; save(); },
    async syncIcal() { throw new Error('Die automatische Kalender-Synchronisierung funktioniert nur mit Server (nicht im Demo-Modus). Nutze zum Testen den Datei-Import.'); },
    resetDemo() { try { localStorage.removeItem(STORE_KEY); } catch { /* */ } db = buildDb(); save(); },
  };
}
