// "Zuständig für": einzelne Themen anzeigen und bearbeiten
import { useState } from 'react';
import { Icon } from './ui.jsx';

// Themen eines Eintrags (neues Feld topics, sonst alte Freitext-Zuständigkeit aufteilen)
export const topicsOf = (b) => (b?.topics?.length ? b.topics
  : (b?.responsibility || '').split(/[,;]/).map((s) => s.trim()).filter(Boolean));

export function TopicChips({ topics }) {
  if (!topics?.length) return null;
  return (
    <div className="topics">
      <span className="topics-label">Zuständig für</span>
      <ul className="topic-list">{topics.map((t) => <li key={t} className="topic">{t}</li>)}</ul>
    </div>
  );
}

// suggestions: bereits verwendete Themen zur Auswahl
export function TopicsInput({ value, onChange, suggestions = [], id = 'topics' }) {
  const [text, setText] = useState('');
  const add = () => {
    const t = text.trim();
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) onChange([...value, t]);
    setText('');
  };
  const left = suggestions.filter((s) => !value.includes(s));
  return (
    <div className="topics-input">
      {value.length > 0 && (
        <ul className="topic-list">
          {value.map((t) => (
            <li key={t} className="topic topic-edit">
              {t}
              <button type="button" aria-label={`${t} entfernen`} onClick={() => onChange(value.filter((v) => v !== t))}><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="row gap">
        <input id={id} value={text} list={`${id}-list`} placeholder="Thema, z. B. Bandenwerbung"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
        <button type="button" className="btn" onClick={add} disabled={!text.trim()}><Icon name="plus" size={18} /> Hinzufügen</button>
      </div>
      <datalist id={`${id}-list`}>{left.map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
}
