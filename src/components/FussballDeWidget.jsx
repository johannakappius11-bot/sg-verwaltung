// Offizielles fussball.de-Widget, datenschutzfreundlich erst nach Klick geladen.
// Das Widget muss auf fussball.de für die Adresse (Domain) dieser App erzeugt worden sein.
// Falls fussball.de das Einbettungsformat ändert, nur die Variable "src" anpassen.
import { useState } from 'react';

export default function FussballDeWidget({ widgetId }) {
  const [show, setShow] = useState(false);
  const id = `fbde-${widgetId.replace(/[^A-Za-z0-9]/g, '')}`;
  const src = `https://www.fussball.de/widget2/-/schluessel/${encodeURIComponent(widgetId)}/target/${id}/caller/${encodeURIComponent(window.location.hostname)}`;
  if (!show) {
    return (
      <div className="widget-consent">
        <p className="small">Beim Laden werden Daten (u. a. deine IP-Adresse) an fussball.de (DFB-Medien) übertragen. Mehr dazu in der Datenschutzerklärung.</p>
        <button className="btn" onClick={() => setShow(true)}>fussball.de-Spielplan laden</button>
      </div>
    );
  }
  return <iframe id={id} title="Spielplan fussball.de" src={src} className="widget-frame" loading="lazy" />;
}
