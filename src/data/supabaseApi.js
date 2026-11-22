import { createClient } from '@supabase/supabase-js';

// Supabase-Fehlermeldungen in verständliches Deutsch übersetzen
function de(error) {
  const m = (error?.message || String(error)).toLowerCase();
  let msg = error?.message || 'Unbekannter Fehler';
  if (m.includes('signups not allowed') || m.includes('user not found'))
    msg = 'Diese E-Mail-Adresse ist noch nicht registriert. Bitte nutze zuerst den Einladungslink deines Vereins.';
  else if (m.includes('database error saving new user') || m.includes('einladungslink'))
    msg = 'Der Einladungslink ist ungültig oder wurde deaktiviert. Bitte frage beim Vorstand nach einem neuen Link.';
  else if (m.includes('expired') || m.includes('invalid') && m.includes('token'))
    msg = 'Der Code ist falsch oder abgelaufen. Bitte fordere einen neuen Code an.';
  else if (m.includes('rate limit') || m.includes('security purposes'))
    msg = 'Zu viele Versuche. Bitte warte eine Minute und versuche es dann erneut.';
  else if (m.includes('row-level security') || m.includes('keine berechtigung') || m.includes('permission denied'))
    msg = 'Dafür fehlt dir die Berechtigung.';
  else if (m.includes('failed to fetch') || m.includes('network'))
    msg = 'Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung.';
  const e = new Error(msg); e.original = error; return e;
}
const chk = ({ data, error }) => { if (error) throw de(error); return data; };

export function createSupabaseApi(url, key) {
  // "implicit": Der Link in der E-Mail funktioniert auch in einem anderen Browser.
  const sb = createClient(url, key, {
    auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  const applyFilters = (q, o = {}) => {
    for (const [k, v] of Object.entries(o.eq || {})) q = q.eq(k, v);
    for (const [k, v] of Object.entries(o.gte || {})) q = q.gte(k, v);
    for (const [k, v] of Object.entries(o.lt || {})) q = q.lt(k, v);
    for (const [k, v] of Object.entries(o.in || {})) q = q.in(k, v);
    if (o.order) q = q.order(o.order, { ascending: !o.desc });
    return q;
  };

  return {
    mode: 'supabase',
    async getUser() { const { data } = await sb.auth.getSession(); return data.session?.user || null; },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user || null));
      return () => data.subscription.unsubscribe();
    },
    async sendCode(email, { create = false, name, inviteToken } = {}) {
      chk(await sb.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: create,
          emailRedirectTo: window.location.origin + '/',
          data: create ? { name, invite_token: inviteToken } : undefined,
        },
      }));
    },
    async verifyCode(email, code) {
      chk(await sb.auth.verifyOtp({ email, token: code.trim(), type: 'email' }));
    },
    async signOut() { await sb.auth.signOut(); },
    async checkInvite(token) { return chk(await sb.rpc('check_invite', { p_token: token })); },

    async me(user) {
      const profile = chk(await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
      const person = chk(await sb.from('people').select('*').eq('user_id', user.id).maybeSingle());
      let teamIds = [];
      if (person) {
        const tc = chk(await sb.from('team_contacts').select('team_id').eq('person_id', person.id));
        teamIds = tc.map((x) => x.team_id);
      }
      return { id: user.id, email: user.email, role: profile?.role || 'none', person, teamIds };
    },

    async list(table, opts) { return chk(await applyFilters(sb.from(table).select('*'), opts)); },
    async insert(table, row) { return chk(await sb.from(table).insert(row).select().single()); },
    async update(table, id, patch) { return chk(await sb.from(table).update(patch).eq('id', id).select().single()); },
    async remove(table, id) { chk(await sb.from(table).delete().eq('id', id)); },
    async upsertMany(table, rows, onConflict) {
      return chk(await sb.from(table).upsert(rows, { onConflict }).select());
    },
    async rpc(name, args) { return chk(await sb.rpc(name, args)); },

    async photoUrls(paths) {
      const list = [...new Set(paths.filter(Boolean))];
      if (!list.length) return {};
      const { data } = await sb.storage.from('photos').createSignedUrls(list, 3600);
      return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
    },
    async uploadPhoto(blob, folder) {
      const path = `${folder}/${Date.now().toString(36)}.jpg`;
      chk(await sb.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true }));
      return path;
    },
    async deletePhoto(path) { if (path) await sb.storage.from('photos').remove([path]); },
    async syncIcal() { return chk(await sb.functions.invoke('ical-sync', { body: {} })); },
  };
}
