// Erzeugt supabase/seed.sql aus src/data/seed.js
// Aufruf: node scripts/make-seed-sql.mjs
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { seed } from '../src/data/seed.js';

const uid = (k) => { const h = createHash('md5').update('seed-' + k).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const q = (v) => v == null ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
const ts = (week, weekday, time, addMin = 0) =>
  `((wk + ${week * 7 + weekday - 1} + time '${time}') + interval '${addMin} minutes') at time zone 'Europe/Berlin'`;

let s = `-- Testdaten (fiktiv) – automatisch erzeugt aus src/data/seed.js
-- Im Supabase SQL Editor NACH schema.sql ausführen. Termine liegen um die aktuelle Woche herum.
-- Entfernen: siehe README, Abschnitt "Testdaten löschen".
do $$
declare wk date := date_trunc('week', now() at time zone 'Europe/Berlin')::date;
begin
`;
seed.fields.forEach(f => s += `insert into public.fields (id,name,short_name,address,sort) values (${q(uid('f'+f.key))},${q(f.name)},${q(f.short_name)},${q(f.address)},${f.sort}) on conflict do nothing;\n`);
seed.people.forEach(p => s += `insert into public.people (id,name,phone,email,consent) values (${q(uid(p.key))},${q(p.name)},${q(p.phone)},${q(p.email)},${p.consent}) on conflict do nothing;\n`);
seed.teams.forEach((t, i) => s += `insert into public.teams (id,name,short_name,category,home_field_id,sort) values (${q(uid('t'+t.key))},${q(t.name)},${q(t.short_name)},${q(t.category)},${q(uid('f'+t.home))},${i+1}) on conflict do nothing;\n`);
seed.contacts.forEach(([t, p, role, prim], i) => s += `insert into public.team_contacts (team_id,person_id,role,is_primary,sort) values (${q(uid('t'+t))},${q(uid(p))},${q(role)},${prim},${i}) on conflict do nothing;\n`);
seed.board.forEach(([p, pos, club, resp, sort]) => s += `insert into public.board_members (id,person_id,position,club,responsibility,sort) values (${q(uid('b'+p))},${q(uid(p))},${q(pos)},${q(club)},${q(resp)},${sort}) on conflict do nothing;\n`);
seed.series.forEach(([t, f, wd, a, b], i) => s += `insert into public.series (id,team_id,field_id,kind,weekday,start_time,end_time,valid_from) values (${q(uid('s'+i))},${q(uid('t'+t))},${q(uid('f'+f))},'training',${wd},'${a}','${b}',wk - 28) on conflict do nothing;\n`);
seed.games.forEach((g, i) => {
  const field = g.away ? 'null' : q(uid('f' + seed.teams.find(t => t.key === g.team).home));
  s += `insert into public.events (team_id,field_id,kind,starts_at,ends_at,is_away,opponent,venue,competition,source,external_uid) values (${q(uid('t'+g.team))},${field},'spiel',${ts(g.week,g.weekday,g.time)},${ts(g.week,g.weekday,g.time,g.dur)},${g.away},${q(g.opponent)},${q(g.venue)},${q(g.competition)},'manual',${q('seed-game-'+i)}) on conflict do nothing;\n`;
});
seed.others.forEach((o, i) => s += `insert into public.events (team_id,field_id,kind,title,note,starts_at,ends_at,source,external_uid) values (${q(uid('t'+o.team))},${q(uid('f'+o.field))},'sonstiges',${q(o.title)},${q(o.note)},${ts(o.week,o.weekday,o.time)},${ts(o.week,o.weekday,o.time,o.dur)},'manual',${q('seed-other-'+i)}) on conflict do nothing;\n`);
s += `end $$;\n`;
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), s);
console.log('supabase/seed.sql geschrieben');
