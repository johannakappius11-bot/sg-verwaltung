// Globaler App-Zustand: angemeldeter Nutzer und Stammdaten
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './data/api.js';
import { AWAY_COLOR, fieldColor } from './lib/colors.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const EMPTY = { sites: [], fields: [], teams: [], contacts: [], people: [], board: [], series: [], exceptions: [] };

export function AppProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = lädt noch
  const [me, setMe] = useState(null);
  const [data, setData] = useState(EMPTY);
  const [photos, setPhotos] = useState({});
  const [toastMsg, setToastMsg] = useState('');
  const [loadError, setLoadError] = useState('');
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg); clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 3000);
  }, []);

  const reloadData = useCallback(async () => {
    try {
      const [sites, fields, teams, contacts, people, board, series, exceptions] = await Promise.all([
        api.list('sites', { order: 'sort' }), api.list('fields', { order: 'sort' }), api.list('teams', { order: 'sort' }),
        api.list('team_contacts', { order: 'sort' }), api.list('people_public', { order: 'name' }),
        api.list('board_members', { order: 'sort' }), api.list('series'), api.list('series_exceptions'),
      ]);
      setData({ sites, fields, teams, contacts, people, board, series, exceptions });
      setLoadError('');
      api.photoUrls(people.map((p) => p.photo_path)).then(setPhotos).catch(() => {});
    } catch (e) { setLoadError(e.message); }
  }, []);

  const reloadMe = useCallback(async (u) => {
    const cur = u || (await api.getUser());
    if (!cur) { setMe(null); return; }
    try { setMe(await api.me(cur)); } catch (e) { setLoadError(e.message); }
  }, []);

  useEffect(() => {
    let alive = true;
    api.getUser().then((u) => { if (alive) setUser(u); });
    const off = api.onAuthChange((u) => setUser(u));
    return () => { alive = false; off(); };
  }, []);

  useEffect(() => {
    if (!user) { setMe(null); setData(EMPTY); return; }
    reloadMe(user); reloadData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => {
    const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
    const teamById = byId(data.teams); const fieldById = byId(data.fields); const personById = byId(data.people);
    const siteById = byId(data.sites);
    const siteIndex = Object.fromEntries(data.sites.map((x, i) => [x.id, i]));
    const fieldsOfSite = (siteId) => data.fields.filter((f) => f.site_id === siteId);
    const siteColor = (siteId) => fieldColor(siteById[siteId], siteIndex[siteId] ?? 0);
    // Farbe eines Termins: Farbe der Sportanlage, auswärts grau
    const colorOf = (o) => (o.isAway || !o.fieldId ? AWAY_COLOR : siteColor(fieldById[o.fieldId]?.site_id));
    // Beschriftung eines Platzes: "Scharmede" bzw. bei mehreren Plätzen "Thüle · Platz 2"
    const fieldLabel = (fieldId, { short = false, long = false } = {}) => {
      const f = fieldById[fieldId]; if (!f) return '–';
      const site = siteById[f.site_id];
      const multi = fieldsOfSite(f.site_id).length > 1;
      if (short) return multi ? f.short_name : '';
      const base = long ? site?.name || site?.short_name : site?.short_name;
      return multi || !site ? `${base || ''}${base ? ' · ' : ''}${f.name}` : base;
    };
    const role = me?.role || 'none';
    const contactsForTeam = (teamId) => data.contacts
      .filter((c) => c.team_id === teamId)
      .sort((a, b) => (b.is_primary - a.is_primary) || a.sort - b.sort)
      .map((c) => ({ ...c, person: personById[c.person_id] }))
      .filter((c) => c.person);
    const canEditTeam = (teamId) => role === 'admin' || (role === 'trainer' && (me?.teamIds || []).includes(teamId));
    const editableTeams = data.teams.filter((t) => canEditTeam(t.id));
    return {
      user, me, role, data, photos, toastMsg, loadError,
      teamById, fieldById, personById, siteById, fieldsOfSite, siteColor, colorOf, fieldLabel, contactsForTeam, canEditTeam, editableTeams,
      isAdmin: role === 'admin', canManage: role === 'admin' || (role === 'trainer' && editableTeams.length > 0),
      toast, reloadData, reloadMe: () => reloadMe(user),
      refreshPhotos: () => api.photoUrls(data.people.map((p) => p.photo_path)).then(setPhotos),
    };
  }, [user, me, data, photos, toastMsg, loadError, toast, reloadData, reloadMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
