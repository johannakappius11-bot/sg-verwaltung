// Foto auswählen, auf 400 px verkleinern (Datensparsamkeit) und hochladen
import { useState } from 'react';
import { api } from '../data/api.js';

export async function resizeImage(file, max = 400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
  } finally { URL.revokeObjectURL(url); }
}

export default function PhotoInput({ folder, onUploaded, label = 'Foto auswählen' }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`btn ${busy ? 'disabled' : ''}`}>
      {busy ? 'Lädt hoch …' : label}
      <input type="file" accept="image/*" hidden disabled={busy} onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = '';
        if (!file) return;
        setBusy(true);
        try { const blob = await resizeImage(file); const path = await api.uploadPhoto(blob, folder); await onUploaded(path); }
        catch (err) { alert('Foto konnte nicht hochgeladen werden: ' + err.message); }
        setBusy(false);
      }} />
    </label>
  );
}
