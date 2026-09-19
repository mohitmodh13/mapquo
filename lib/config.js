// Demo contractor configuration. Stands in for the Supabase tables service_pricing / pricing_rules /
// business_service_areas. Replace these exports with Supabase queries when the database is connected.
export const DISCLAIMER_VERSION = 'v1';
export const DISCLAIMER = 'This is a preliminary estimate based on the outlined area, the information you provided, and the contractor\u2019s standard scope. It is not a final quote or an offer to perform work. The contractor must inspect the property and confirm measurements, access, drainage, base conditions, existing materials, requested footprint changes, and required repairs. The final written proposal may differ.';
export const BUSINESS = { id: 'demo', name: 'Demo Paving Co.' };
export const SERVICE_ZIPS = new Set((process.env.SERVICE_ZIPS || '12345,10001,60601,94103').split(',').map((z) => z.trim()));

export const REASONS = {
  condition_poor: { message: 'You described the surface as poor. The contractor will confirm its condition on site.' },
  condition_very_poor: { message: 'You described widespread deterioration. This needs a priority site review.' },
  condition_unsure: { message: 'You were not sure of the surface condition, so the contractor will check it on site.' },
  issue_drainage: { message: 'Drainage or standing water needs to be verified. Drainage correction is not included.' },
  issue_potholes: { message: 'Potholes can involve base damage. Pothole and base repair is not included.' },
  issue_cracking: { message: 'Significant cracking needs inspection. Crack repair beyond standard scope is not included.' },
  issue_soft: { message: 'Sunken or soft areas may need base work. That work is not included.' },
  issue_oil: { message: 'Oil or fuel stains will be checked. Special stain treatment is not included.' },
  issue_access: { message: 'Limited equipment access will be confirmed on site and may affect the final price.' },
  issue_unsure: { message: 'You were not sure about property issues, so the contractor will check on site.' },
  footprint_change: { message: 'A change in size or shape is not in this estimate. The price uses the outlined area only.' },
  surface_unpriced: { message: 'Removal of this existing surface is not priced remotely and will be confirmed on site.' },
  surface_concrete: { line: 'Concrete removal', message: 'Concrete removal is included in this estimate.' },
};

const R = (reason) => ({ action: 'disclaimer', reason });
const COND = { poor: R('condition_poor'), very_poor: R('condition_very_poor'), not_sure: R('condition_unsure') };
const ISSUE = { drainage: R('issue_drainage'), potholes: R('issue_potholes'), cracking: R('issue_cracking'),
  soft_areas: R('issue_soft'), oil: R('issue_oil'), access: R('issue_access'), not_sure: R('issue_unsure') };
const FOOT = Object.fromEntries(['widen', 'extend', 'add_parking', 'other'].map((k) => [k, R('footprint_change')]));

// Builds the "question:answer" -> rule map. Condition and issue rules never carry money (no double counting).
const rules = (issues, surface = {}) => ({
  ...Object.fromEntries(Object.entries(COND).map(([k, v]) => [`driveway_condition:${k}`, v])),
  ...Object.fromEntries(issues.map((k) => [`property_issues:${k}`, ISSUE[k]])),
  ...Object.fromEntries(Object.entries(FOOT).map(([k, v]) => [`project_footprint:${k}`, v])),
  ...Object.fromEntries(Object.entries(surface).map(([k, v]) => [`existing_surface:${k}`, v])),
});
const unpriced = R('surface_unpriced');
const svc = (o) => ({ estimate_mode: 'automatic', config_version: 1, ...o });

export const SERVICES = {
  replacement: svc({ base_rate_per_sqft: 8, minimum_price: 4000, range_percent: 10, rounding_increment: 100,
    scope_display_text: 'Removal and hauling of current asphalt, standard grading and base preparation, compacted asphalt, and edge work.',
    rules: rules(['drainage', 'potholes', 'cracking', 'soft_areas', 'access', 'not_sure'], {
      concrete: { type: 'per_sqft', value: 2, action: 'none', reason: 'surface_concrete' },
      gravel: unpriced, dirt_grass: unpriced, combination: unpriced, not_sure: unpriced }) }),
  gravel_to_asphalt: svc({ base_rate_per_sqft: 6.5, minimum_price: 3500, range_percent: 10, rounding_increment: 100,
    scope_display_text: 'Regrading, compaction, standard aggregate base, compacted asphalt, and edge work.',
    rules: rules(['drainage', 'soft_areas', 'access', 'not_sure'], { dirt_grass: unpriced, combination: unpriced, not_sure: unpriced }) }),
  overlay: svc({ base_rate_per_sqft: 4.5, minimum_price: 2500, range_percent: 12, rounding_increment: 50,
    scope_display_text: 'Cleaning, tack coat, edge preparation, minor patching, and a compacted asphalt overlay.',
    rules: rules(['drainage', 'potholes', 'cracking', 'soft_areas', 'access', 'not_sure'], {
      concrete: { action: 'manual_review', reason: 'surface_unpriced' } }) }),
  sealcoat: svc({ base_rate_per_sqft: 0.45, minimum_price: 350, range_percent: 15, rounding_increment: 25,
    scope_display_text: 'Cleaning, edging, two coats of sealer, and minor crack and oil-spot treatment. Asphalt surfaces only.',
    rules: rules(['drainage', 'potholes', 'cracking', 'soft_areas', 'oil', 'access', 'not_sure']) }),
  // repair and unknown have no row: they are lead-only (manual review) in V1.
};
