import { NextResponse } from 'next/server';
import { validatePolygon } from '../../../lib/geo.js';
import { calculate } from '../../../lib/pricing.js';
import { allowed } from '../../../lib/questions.js';
import { BUSINESS, DISCLAIMER_VERSION, REASONS, SERVICES, SERVICE_ZIPS } from '../../../lib/config.js';

// In-memory stand-in for the estimate_requests table. Swap for Supabase inserts (one transaction).
const db = (globalThis.__mapquo ||= { byKey: new Map(), byCode: new Map() });
const fail = (error, status = 400) => NextResponse.json({ error }, { status });

function validate(b) {
  const a = b.answers || {}, c = b.customer || {};
  if (!/^[\w-]{8,64}$/.test(String(b.idempotencyKey || ''))) return 'Missing request key.';
  if (!String(b.address || '').trim() || String(b.address).length > 300) return 'Enter the property address.';
  if (!String(b.postal || '').trim()) return 'Enter the ZIP code.';
  for (const q of ['service_type', 'existing_surface', 'driveway_condition', 'project_footprint'])
    if (!allowed(q).includes(a[q])) return 'Answer every question to continue.';
  const issues = a.property_issues;
  if (!Array.isArray(issues) || !issues.length || !issues.every((i) => allowed('property_issues').includes(i))) return 'Answer every question to continue.';
  if (issues.length > 1 && (issues.includes('none') || issues.includes('not_sure'))) return 'Issue answers conflict.';
  if (!String(c.name || '').trim() || String(c.name).length > 100) return 'Enter your name.';
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(c.email || '')), phone = String(c.phone || '').replace(/\D/g, '').length >= 10;
  if (!email && !phone) return 'Enter a valid email or phone number.';
  if (c.consent !== true) return 'Please agree to be contacted about this estimate.';
  return null;
}

export async function POST(req) {
  let b; try { b = await req.json(); } catch { return fail('Invalid request.'); }
  if (db.byKey.has(b?.idempotencyKey)) return NextResponse.json(db.byKey.get(b.idempotencyKey)); // duplicate submit
  const err = validate(b); if (err) return fail(err);
  const a = { ...b.answers };
  if (a.service_type === 'sealcoat') a.existing_surface = 'asphalt'; // sealcoat is asphalt only

  const poly = validatePolygon(b.polygon); if (!poly.ok) return fail(poly.error);
  const sqft = poly.sqft; // authoritative: recalculated on the server
  const pricing = SERVICES[a.service_type];
  let calc;
  if (!SERVICE_ZIPS.has(String(b.postal).trim())) calc = { status: 'outside_service_area', reasons: [] };
  else if (!pricing || pricing.estimate_mode !== 'automatic') calc = { status: 'manual_review', reasons: [] };
  else calc = calculate({ sqft, answers: a, pricing });

  const code = 'MQ-' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const record = { code, business: BUSINESS.id, created_at: new Date().toISOString(), sqft, answers: a, customer: b.customer,
    address: b.address, polygon: b.polygon, pricing_config_version: pricing?.config_version, disclaimer_version: DISCLAIMER_VERSION, ...calc };
  db.byCode.set(code, record); // lead is stored for every status

  const res = { code, status: calc.status, sqft, business: BUSINESS.name, service: a.service_type,
    scope: pricing?.scope_display_text, low: calc.low, high: calc.high, breakdown: calc.breakdown,
    reasons: (calc.reasons || []).map((r) => REASONS[r].message) };
  db.byKey.set(b.idempotencyKey, res);
  return NextResponse.json(res);
}

// "Request an on-site visit" from the result page.
export async function PATCH(req) {
  const { code } = await req.json().catch(() => ({}));
  const rec = db.byCode.get(code); if (!rec) return fail('Estimate not found.', 404);
  rec.visit_requested = true; return NextResponse.json({ ok: true });
}
