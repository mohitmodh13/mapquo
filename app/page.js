'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { areaSqFt } from '../lib/geo.js';
import { validatePolygon } from '../lib/geo.js';
import { QUESTIONS } from '../lib/questions.js';
import { BUSINESS, DISCLAIMER, REASONS, SERVICES, SERVICE_ZIPS } from '../lib/config.js';
import { calculate } from '../lib/pricing.js';

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');

function Site({ site, setSite, onNext }) {
  const el = useRef(null), map = useRef(null), layer = useRef(null), lf = useRef(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [msg, setMsg] = useState('');
  const pts = site.polygon;

  useEffect(() => {
    let dead = false;
    (async () => {
      const mod = await import('leaflet'), L = mod.default || mod;
      if (dead || map.current) return;
      const m = L.map(el.current, { center: site.center || [39.8, -98.6], zoom: site.center ? 19 : 4 });
      L.tileLayer(ESRI, { maxZoom: 19, attribution: 'Imagery © Esri' }).addTo(m);
      layer.current = L.layerGroup().addTo(m);
      m.on('click', (e) => setSite((s) => ({ ...s, polygon: [...s.polygon, [e.latlng.lat, e.latlng.lng]] })));
      lf.current = L; map.current = m; setReady(true);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; setReady(false); };
  }, []);

  useEffect(() => { if (ready && site.center) map.current.setView(site.center, 19); }, [ready, site.center]);
  useEffect(() => {
    if (!ready) return;
    const L = lf.current, g = layer.current, style = { color: '#F5C518', weight: 3, fillOpacity: 0.25 };
    g.clearLayers();
    if (pts.length >= 3) L.polygon(pts, style).addTo(g); else if (pts.length === 2) L.polyline(pts, style).addTo(g);
    pts.forEach((p) => L.circleMarker(p, { radius: 6, color: '#1B1F23', weight: 2, fillColor: '#F5C518', fillOpacity: 1 }).addTo(g));
  }, [ready, pts]);

  async function find() {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=us&q=' + encodeURIComponent(site.address));
      const [hit] = await r.json();
      if (!hit) setMsg('We could not find that address. Add the city and state, then try again.');
      else setSite((s) => ({ ...s, center: [+hit.lat, +hit.lon], address: hit.display_name, postal: (hit.address?.postcode || '').slice(0, 5), polygon: [] }));
    } catch { setMsg('Address search is unavailable right now. Try again in a moment.'); }
    setBusy(false);
  }

  const sqft = pts.length >= 3 ? Math.round(areaSqFt(pts)) : 0;
  return (
    <section>
      <h1>Where is the driveway?</h1>
      <p className="muted">Find the address, then tap each corner of the area to outline it.</p>
      <div className="row">
        <input className="grow" type="text" aria-label="Property address" placeholder="Street address, city, state" value={site.address}
          onChange={(e) => setSite((s) => ({ ...s, address: e.target.value }))} onKeyDown={(e) => e.key === 'Enter' && find()} />
        <button className="btn" onClick={find} disabled={busy || !site.address.trim()}>{busy ? 'Searching' : 'Find address'}</button>
      </div>
      {msg && <p className="err" role="alert">{msg}</p>}
      <label htmlFor="zip">ZIP code</label>
      <input id="zip" type="text" inputMode="numeric" maxLength={10} value={site.postal} onChange={(e) => setSite((s) => ({ ...s, postal: e.target.value }))} />
      <div id="map" ref={el} role="application" aria-label="Map. Tap to add corners of the project area." />
      <div className="row">
        <button className="btn alt" disabled={!pts.length} onClick={() => setSite((s) => ({ ...s, polygon: s.polygon.slice(0, -1) }))}>Undo last corner</button>
        <button className="btn alt" disabled={!pts.length} onClick={() => setSite((s) => ({ ...s, polygon: [] }))}>Clear outline</button>
        <span className="muted">{sqft ? `About ${sqft.toLocaleString('en-US')} sq ft` : 'Add at least three corners.'}</span>
      </div>
      <button className="btn" disabled={!sqft || !site.postal.trim() || !site.address.trim()} onClick={onNext}>Continue</button>
    </section>
  );
}

function Result({ r, onRestart }) {
  const [visit, setVisit] = useState(false);
  function requestVisit() { setVisit(true); }
  const svcName = QUESTIONS.service_type.options.find((o) => o[0] === r.service)?.[1];
  if (r.status === 'outside_service_area') return (<section><h1>We received your request</h1>
    <p>That address is outside the area {r.business} serves right now, so we can’t show an estimate. Your reference is <b>{r.code}</b>.</p>
    <button className="btn alt" onClick={onRestart}>Try another address</button></section>);
  if (r.status === 'manual_review') return (<section><h1>We received your request</h1>
    <p>{r.business} needs to review this request before estimating it. We saved your outline, answers, and contact details, and the contractor will follow up. Your reference is <b>{r.code}</b>.</p>
    <button className="btn alt" onClick={onRestart}>Start another estimate</button></section>);
  const review = r.status === 'estimated_with_review';
  return (
    <section>
      <h1>Preliminary estimate</h1>
      <div className="range" aria-label={`Estimate ${money(r.low)} to ${money(r.high)}`}>{money(r.low)} – {money(r.high)}{review && '*'}</div>
      <p><b>{svcName}</b> for {r.sqft.toLocaleString('en-US')} sq ft, from the area you outlined.</p>
      <p className="muted">{r.scope}</p>
      <table><tbody>{r.breakdown.map((b) => <tr key={b.label}><td>{b.label}</td><td>{money(b.amount)}</td></tr>)}</tbody></table>
      {review && (<><h2>* Needs a site visit to confirm</h2>
        <ul className="notes">{r.reasons.map((m) => <li key={m}>{m}</li>)}</ul>
        <p>Unmeasured corrective work is not included in this preliminary estimate.</p></>)}
      <div className="row">
        {visit ? <p><b>Visit requested.</b> {r.business} will contact you. Reference {r.code}.</p>
          : <button className="btn" onClick={requestVisit}>Request an on-site visit</button>}
      </div>
      <p className="disc">{DISCLAIMER}</p>
    </section>
  );
}

export default function Page() {
  const [idx, setIdx] = useState(0);
  const [site, setSite] = useState({ address: '', postal: '', center: null, polygon: [] });
  const [ans, setAns] = useState({ service_type: '', existing_surface: '', driveway_condition: '', property_issues: [], project_footprint: '' });
  const [contact, setContact] = useState({ name: '', email: '', phone: '', consent: false });
  const [result, setResult] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const key = useRef(null);

  const steps = ['site', 'service_type', ...(ans.service_type === 'sealcoat' ? [] : ['existing_surface']), 'driveway_condition', 'property_issues', 'project_footprint', 'contact', 'result'];
  const step = steps[idx], q = QUESTIONS[step];
  const next = () => setIdx((i) => i + 1), back = () => setIdx((i) => Math.max(0, i - 1));
  const pick = (k, v) => { setAns((a) => ({ ...a, [k]: v })); next(); };
  const toggle = (v) => setAns((a) => {
    const cur = a.property_issues;
    if (v === 'none' || v === 'not_sure') return { ...a, property_issues: cur.includes(v) ? [] : [v] }; // exclusive answers
    const rest = cur.filter((x) => x !== 'none' && x !== 'not_sure');
    return { ...a, property_issues: rest.includes(v) ? rest.filter((x) => x !== v) : [...rest, v] };
  });

  async function submit() {
    setBusy(true); setError('');
    key.current ||= crypto.randomUUID(); // idempotency: a retry returns the same estimate
    try {
      const answers = { ...ans, existing_surface: ans.service_type === 'sealcoat' ? 'asphalt' : ans.existing_surface };
      const polygon = validatePolygon(site.polygon);
      if (!polygon.ok) throw new Error(polygon.error);
      const pricing = SERVICES[answers.service_type];
      const calc = !SERVICE_ZIPS.has(site.postal.trim()) ? { status: 'outside_service_area', reasons: [] }
        : !pricing || pricing.estimate_mode !== 'automatic' ? { status: 'manual_review', reasons: [] }
        : calculate({ sqft: polygon.sqft, answers, pricing });
      const data = { code: 'MQ-' + key.current.slice(0, 8).toUpperCase(), status: calc.status, sqft: polygon.sqft,
        business: BUSINESS.name, service: answers.service_type, scope: pricing?.scope_display_text, low: calc.low,
        high: calc.high, breakdown: calc.breakdown, reasons: (calc.reasons || []).map((r) => REASONS[r].message) };
      setResult(data);
      next();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }
  const restart = () => { key.current = null; setResult(null); setSite((s) => ({ ...s, polygon: [] })); setIdx(0); };
  const contactOk = contact.name.trim() && (contact.email.trim() || contact.phone.trim()) && contact.consent;

  return (
    <>
      <header><div className="brand">Mapquo</div>
        <div className="road"><i /><b style={{ width: `${(idx / (steps.length - 1)) * 100}%` }} /></div></header>
      <main>
        {step === 'site' && <Site site={site} setSite={setSite} onNext={next} />}
        {q && (
          <section>
            <h1>{q.title}</h1>
            {q.hint && <p className="muted">{q.hint}</p>}
            <div className="opts">
              {q.options.map(([v, label, desc]) => {
                const on = q.multi ? ans[step].includes(v) : ans[step] === v;
                return <button key={v} className={'opt' + (on ? ' on' : '')} aria-pressed={on} onClick={() => (q.multi ? toggle(v) : pick(step, v))}>{label}{desc && <small>{desc}</small>}</button>;
              })}
            </div>
            {q.multi && <button className="btn" disabled={!ans.property_issues.length} onClick={next}>Continue</button>}
            <div><button className="link" onClick={back}>Back</button></div>
          </section>
        )}
        {step === 'contact' && (
          <section>
            <h1>Where should we send it?</h1>
            <p className="muted">Your name and either an email or a phone number.</p>
            <label htmlFor="n">Name</label><input id="n" type="text" autoComplete="name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            <label htmlFor="e">Email</label><input id="e" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <label htmlFor="p">Phone</label><input id="p" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <label className="check"><input type="checkbox" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} />
              <span>I agree to be contacted about this estimate.</span></label>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row"><button className="btn" disabled={!contactOk || busy} onClick={submit}>{busy ? 'Calculating' : 'Get my estimate'}</button>
              <button className="link" onClick={back}>Back</button></div>
          </section>
        )}
        {step === 'result' && result && <Result r={result} onRestart={restart} />}
      </main>
    </>
  );
}
