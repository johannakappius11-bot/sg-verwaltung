// Minimaler Router ohne Zusatzbibliothek (History API)
import { useEffect, useState } from 'react';

// VITE_ROUTER=memory: Adresse im Speicher statt in der URL (für eingebettete Vorschau)
const MEMORY = import.meta.env.VITE_ROUTER === 'memory';
let memPath = '/';
const current = () => (MEMORY ? memPath : window.location.pathname);

export function navigate(to, { replace = false } = {}) {
  if (MEMORY) { memPath = to; window.dispatchEvent(new Event('popstate')); window.scrollTo(0, 0); return; }
  if (to === window.location.pathname + window.location.search) return;
  window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
  window.dispatchEvent(new Event('popstate'));
  window.scrollTo(0, 0);
}

export function usePath() {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => setPath(current());
    window.addEventListener('popstate', on);
    return () => window.removeEventListener('popstate', on);
  }, []);
  return path;
}

export function match(pattern, path) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
  const m = path.match(re);
  return m ? Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) : null;
}
