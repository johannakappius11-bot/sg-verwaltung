import { useEffect, useRef } from 'react';
import { navigate } from '../lib/router.js';
import { useApp } from '../store.jsx';

export function Link({ to, children, className, ...rest }) {
  return (
    <a href={to} className={className} {...rest}
      onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); navigate(to); }}>
      {children}
    </a>
  );
}

// Unten einfahrendes Fenster (gut mit dem Daumen bedienbar)
export function Sheet({ title, onClose, children, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}
        onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen"><Icon name="close" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Avatar({ person, size = 48 }) {
  const { photos } = useApp();
  const url = person?.photo_path && photos[person.photo_path];
  const initials = (person?.name || '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return url
    ? <img className="avatar" src={url} alt="" width={size} height={size} style={{ width: size, height: size }} />
    : <div className="avatar avatar-ph" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">{initials}</div>;
}

// Kontaktkarte: Name immer, Telefon/E-Mail/Foto nur mit Einwilligung (kommt so aus der Datenbank)
export function PersonCard({ person, subtitle }) {
  if (!person) return null;
  return (
    <div className="person">
      <Avatar person={person} />
      <div className="person-main">
        <div className="person-name">{person.name}</div>
        {subtitle && <div className="muted small">{subtitle}</div>}
        {(person.phone || person.email) && (
          <div className="person-actions">
            {person.phone && <a className="btn btn-sm" href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}><Icon name="phone" /> {person.phone}</a>}
            {person.email && <a className="btn btn-sm" href={`mailto:${person.email}`}><Icon name="mail" /> E-Mail</a>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="muted small">{hint}</span>}
    </label>
  );
}

export function Empty({ children }) { return <p className="empty">{children}</p>; }

export function ErrorBox({ error }) { return error ? <div className="alert alert-error" role="alert">{error}</div> : null; }

const ICONS = {
  close: 'M6 6l12 12M18 6L6 18',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',
  mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0112 0v1M17 11a3 3 0 100-6M22 21v-1a5 5 0 00-4-5',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21v-1a8 8 0 0116 0v1',
  settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  warn: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  share: 'M12 3v12M7 8l5-5 5 5M5 13v7h14v-7',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  pin: 'M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12zM12 11a2 2 0 100-4 2 2 0 000 4z',
  bus: 'M5 17V6a3 3 0 013-3h8a3 3 0 013 3v11M5 12h14M7 20v-3M17 20v-3M5 17h14',
  download: 'M12 3v12M7 10l5 5 5-5M5 20h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
};
export function Icon({ name, size = 20 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  return toastMsg ? <div className="toast" role="status">{toastMsg}</div> : null;
}
