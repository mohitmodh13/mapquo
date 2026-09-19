import { REASONS } from './config.js';

export const roundTo = (v, inc) => Math.round(v / inc) * inc;

// Pure calculation, steps 6-13 of the spec. `pricing` is the active service_pricing row plus its rules.
export function calculate({ sqft, answers, pricing: p }) {
  const base = Math.max(sqft * p.base_rate_per_sqft, p.minimum_price);
  const keys = [
    `existing_surface:${answers.existing_surface}`, `driveway_condition:${answers.driveway_condition}`,
    ...answers.property_issues.map((i) => `property_issues:${i}`), `project_footprint:${answers.project_footprint}`,
  ];
  const matched = keys.map((k) => p.rules[k]).filter(Boolean);
  if (matched.some((r) => r.action === 'manual_review')) return { status: 'manual_review', reasons: [] };

  // Percent rules use the base price and never compound.
  const mods = matched.filter((r) => r.type && r.type !== 'none').map((r) => ({
    label: REASONS[r.reason]?.line || r.reason,
    amount: r.type === 'flat' ? r.value : r.type === 'per_sqft' ? sqft * r.value : (base * r.value) / 100,
  }));
  const inc = p.rounding_increment;
  const center = roundTo(base + mods.reduce((s, m) => s + m.amount, 0), inc);
  const low = roundTo(center * (1 - p.range_percent / 100), inc);
  const high = roundTo(center * (1 + p.range_percent / 100), inc);
  const reasons = [...new Set(matched.filter((r) => r.action === 'disclaimer').map((r) => r.reason))];
  return {
    status: reasons.length ? 'estimated_with_review' : 'estimated', center, low, high, reasons,
    breakdown: [{ label: `Standard scope, ${sqft.toLocaleString('en-US')} sq ft`, amount: base }, ...mods],
  };
}
