import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../lib/pricing.js';
import { SERVICES } from '../lib/config.js';
import { validatePolygon } from '../lib/geo.js';

const clean = { existing_surface: 'asphalt', driveway_condition: 'good', property_issues: ['none'], project_footprint: 'same' };
const run = (svc, sqft, over = {}) => calculate({ sqft, answers: { ...clean, ...over }, pricing: SERVICES[svc] });

test('spec example: concrete + review flags', () => {
  const r = run('replacement', 800, { existing_surface: 'concrete', driveway_condition: 'poor', property_issues: ['drainage'], project_footprint: 'widen' });
  assert.deepEqual([r.center, r.low, r.high, r.status, r.reasons.length], [8000, 7200, 8800, 'estimated_with_review', 3]);
  assert.equal(r.breakdown.filter((b) => b.label === 'Concrete removal').length, 1);
});
test('clean asphalt replacement is plain estimated', () => {
  const r = run('replacement', 800); assert.equal(r.status, 'estimated'); assert.equal(r.center, 6400);
});
test('minimum price applies before modifiers', () => assert.equal(run('replacement', 100).breakdown[0].amount, 4000));
test('poor + potholes + cracking adds no money and dedupes reasons', () => {
  const r = run('replacement', 800, { driveway_condition: 'poor', property_issues: ['potholes', 'cracking'] });
  assert.equal(r.center, 6400); assert.equal(r.status, 'estimated_with_review'); assert.equal(r.reasons.length, 3);
});
test('widening keeps price and flags review', () => {
  const r = run('sealcoat', 1000, { project_footprint: 'widen' }); assert.equal(r.center, 450); assert.equal(r.status, 'estimated_with_review');
});
test('overlay on concrete is manual review', () => assert.equal(run('overlay', 800, { existing_surface: 'concrete' }).status, 'manual_review'));
test('self-intersecting polygon is rejected', () =>
  assert.equal(validatePolygon([[0, 0], [0.0001, 0.0001], [0, 0.0001], [0.0001, 0]]).ok, false));
