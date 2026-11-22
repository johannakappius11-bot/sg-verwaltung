// Wählt automatisch: echte Datenbank (Supabase) oder Demo-Modus.
import { createSupabaseApi } from './supabaseApi.js';
import { createDemoApi } from './demoApi.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const api = url && key ? createSupabaseApi(url, key) : createDemoApi();
export const isDemo = api.mode === 'demo';
