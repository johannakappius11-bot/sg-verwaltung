// Wählt automatisch: echte Datenbank (Supabase) oder Demo-Modus.
// Demo-Modus: VITE_DEMO=true (z. B. für die Vorschau) oder wenn keine Zugangsdaten vorhanden sind.
import { config } from '../config.js';
import { createSupabaseApi } from './supabaseApi.js';
import { createDemoApi } from './demoApi.js';

const demo = import.meta.env.VITE_DEMO === 'true';
const url = config.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
const key = config.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const api = !demo && url && key ? createSupabaseApi(url, key) : createDemoApi();
export const isDemo = api.mode === 'demo';
