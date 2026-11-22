// Eigene Dialogfenster statt alert/confirm/prompt des Browsers:
// sehen auf allen Geräten gleich aus und funktionieren auch in eingebetteten Ansichten.
import { useEffect, useState } from 'react';
import { Sheet } from './ui.jsx';

let show = null;
const queue = [];
function open(d) {
  return new Promise((res) => {
    const item = { ...d, res };
    if (show) show(item); else queue.push(item);
  });
}

export const alertDialog = (message, title = 'Hinweis') => open({ type: 'alert', title, message });
export const confirmDialog = (message, { title = 'Bitte bestätigen', confirmLabel = 'OK', danger = false } = {}) =>
  open({ type: 'confirm', title, message, confirmLabel, danger });
export const promptDialog = (message, defaultValue = '', { title = 'Eingabe', confirmLabel = 'OK' } = {}) =>
  open({ type: 'prompt', title, message, defaultValue, confirmLabel });
// choices: [{ value, label, danger }]
export const choiceDialog = (message, choices, { title = 'Bitte wählen' } = {}) =>
  open({ type: 'choice', title, message, choices });

export function DialogHost() {
  const [d, setD] = useState(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    show = (item) => { setValue(item.defaultValue ?? ''); setD(item); };
    if (queue.length) show(queue.shift());
    return () => { show = null; };
  }, []);
  if (!d) return null;

  const close = (result) => {
    d.res(result);
    const next = queue.shift();
    if (next) { setValue(next.defaultValue ?? ''); setD(next); } else setD(null);
  };
  const cancelValue = d.type === 'confirm' ? false : d.type === 'alert' ? undefined : null;

  let footer;
  if (d.type === 'alert') footer = <button className="btn btn-primary btn-block" onClick={() => close()}>OK</button>;
  else if (d.type === 'choice') {
    footer = (
      <div className="stack-s">
        {d.choices.map((c) => (
          <button key={c.value} className={`btn btn-block ${c.danger ? 'btn-danger' : ''}`} onClick={() => close(c.value)}>{c.label}</button>
        ))}
        <button className="btn btn-block" onClick={() => close(null)}>Abbrechen</button>
      </div>
    );
  } else {
    footer = (
      <div className="row gap">
        <button className="btn" onClick={() => close(cancelValue)}>Abbrechen</button>
        <button className={`btn grow ${d.danger ? 'btn-danger-solid' : 'btn-primary'}`}
          onClick={() => close(d.type === 'prompt' ? value : true)}>{d.confirmLabel}</button>
      </div>
    );
  }

  return (
    <Sheet title={d.title} onClose={() => close(cancelValue)} footer={footer}>
      <p className="dialog-msg">{d.message}</p>
      {d.type === 'prompt' && (
        <input id="dialog-input" value={value} onChange={(e) => setValue(e.target.value)} autoFocus
          onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && close(value)} />
      )}
    </Sheet>
  );
}
