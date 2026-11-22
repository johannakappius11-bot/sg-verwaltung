// Supabase Edge Function "ical-sync"
// Liest für jede Mannschaft mit hinterlegter iCal-Adresse den Kalender und übernimmt die Spiele.
// Aufruf: aus der App (nur Admins) oder zeitgesteuert (siehe README, Header "x-cron-secret").
import { createClient } from 'npm:@supabase/supabase-js@2';

const HOME_KEYWORDS = (Deno.env.get('HOME_KEYWORDS') || 'Schamede,Thüle,Thuele').split(',').map((s) => s.trim().toLowerCase());
const TZ = 'Europe/Berlin';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

type Ev = { uid?: string; summary?: string; location?: string; start?: Date; end?: Date; allDay?: boolean; status?: string };

// Ortszeit Europe/Berlin -> UTC
function berlinToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number): Date {
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(guess).reduce((a: Record<string, number>, p) => (p.type !== 'literal' ? { ...a, [p.type]: +p.value } : a), {});
  const asBerlin = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(guess.getTime() - (asBerlin - guess.getTime()));
}

function icalDate(value: string, params: string) {
  const v = value.trim();
  if (/VALUE=DATE(?!-)/.test(params) || /^\d{8}$/.test(v)) return { date: berlinToUtc(+v.slice(0, 4), +v.slice(4, 6), +v.slice(6, 8), 0, 0, 0), allDay: true };
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s = '0', z] = m;
  return { date: z ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s)) : berlinToUtc(+y, +mo, +d, +h, +mi, +s), allDay: false };
}
const unesc = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

function parseIcal(text: string): Ev[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: Ev[] = []; let cur: Ev | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur?.start) out.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':'); if (i < 0) continue;
    const [name, ...params] = line.slice(0, i).split(';'); const value = line.slice(i + 1); const p = params.join(';');
    switch (name.toUpperCase()) {
      case 'UID': cur.uid = value.trim(); break;
      case 'SUMMARY': cur.summary = unesc(value).trim(); break;
      case 'LOCATION': cur.location = unesc(value).trim(); break;
      case 'STATUS': cur.status = value.trim(); break;
      case 'DTSTART': { const r = icalDate(value, p); if (r) { cur.start = r.date; cur.allDay = r.allDay; } break; }
      case 'DTEND': { const r = icalDate(value, p); if (r) cur.end = r.date; break; }
    }
  }
  return out;
}

const isOurs = (s: string) => HOME_KEYWORDS.some((k) => s.toLowerCase().includes(k));
function splitMatch(summary = '') {
  const parts = summary.replace(/\(.*?\)/g, ' ').trim().split(/\s+(?:-|–|:|vs\.?|gegen)\s+/i);
  if (parts.length < 2) return null;
  const home = parts[0].trim(); const away = parts.slice(1).join(' - ').trim();
  if (isOurs(home) && !isOurs(away)) return { isAway: false, opponent: away };
  if (isOurs(away) && !isOurs(home)) return { isAway: true, opponent: home };
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  const url = Deno.env.get('SUPABASE_URL')!;
  const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Berechtigung: Cron-Geheimnis ODER angemeldeter Admin
  const cronSecret = Deno.env.get('CRON_SECRET');
  let allowed = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret;
  if (!allowed) {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data } = await service.auth.getUser(jwt);
    if (data?.user) {
      const { data: prof } = await service.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      allowed = prof?.role === 'admin';
    }
  }
  if (!allowed) return json({ message: 'Keine Berechtigung' }, 403);

  const { data: teams, error } = await service.from('teams').select('id,name,home_field_id,ical_url').not('ical_url', 'is', null);
  if (error) return json({ message: error.message }, 500);
  const { data: fields } = await service.from('fields').select('id,short_name');

  const report: string[] = [];
  const now = new Date();
  for (const team of teams || []) {
    try {
      const res = await fetch(team.ical_url.replace(/^webcal:/i, 'https:'), { headers: { 'User-Agent': 'Platzplan-Vereinsapp/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = parseIcal(await res.text()).filter((e) => e.start && e.start >= now);
      const rows = events.map((ev) => {
        const m = splitMatch(ev.summary);
        const isAway = m ? m.isAway : !(ev.location && isOurs(ev.location));
        const start = ev.start!;
        const end = ev.end && !ev.allDay && ev.end > start ? ev.end : new Date(start.getTime() + 120 * 60000);
        const loc = (ev.location || '').toLowerCase();
        const field = (fields || []).find((f) => loc.includes(f.short_name.toLowerCase()));
        return {
          team_id: team.id, kind: 'spiel', starts_at: start.toISOString(), ends_at: end.toISOString(),
          is_away: isAway, field_id: isAway ? null : field?.id || team.home_field_id,
          opponent: m?.opponent || ev.summary || 'Unbekannt', venue: isAway ? ev.location || null : null,
          note: ev.status === 'CANCELLED' ? 'Abgesagt laut Kalender' : null,
          source: 'ical', external_uid: `ical:${team.id}:${ev.uid || start.toISOString()}`,
        };
      });
      if (rows.length) {
        const { error: e } = await service.from('events').upsert(rows, { onConflict: 'external_uid' });
        if (e) throw e;
      }
      // Zukünftige Spiele entfernen, die nicht mehr im Kalender stehen (z. B. verlegt mit neuer ID)
      const keep = rows.map((r) => r.external_uid);
      let del = service.from('events').delete().eq('team_id', team.id).eq('source', 'ical').gte('starts_at', now.toISOString());
      if (keep.length) del = del.not('external_uid', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`);
      await del;
      report.push(`${team.name}: ${rows.length} Spiele`);
    } catch (e) {
      report.push(`${team.name}: FEHLER (${(e as Error).message})`);
    }
  }
  return json({ message: report.length ? report.join(' · ') : 'Keine Mannschaft mit Kalender-Abo.' });
});
