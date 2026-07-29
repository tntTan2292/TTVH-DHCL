import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewerAccessPath, getDefaultRouteForRole, isAdminRole, isViewerRole } from './roles.js';

test('viewer default route lands on the completed F1.3 dashboard', () => {
  assert.equal(getDefaultRouteForRole('viewer'), '/f13/dashboard');
  assert.equal(getDefaultRouteForRole('admin'), '/');
});

test('viewer access policy allows only approved completed F1.3 surfaces', () => {
  assert.equal(canViewerAccessPath('/f13/dashboard'), true);
  assert.equal(canViewerAccessPath('/f13/ranking/bcvh'), true);
  assert.equal(canViewerAccessPath('/f13/ranking/route'), true);
  assert.equal(canViewerAccessPath('/import'), false);
  assert.equal(canViewerAccessPath('/system-info'), false);
  assert.equal(canViewerAccessPath('/f13/pareto'), false);
  assert.equal(canViewerAccessPath('/f13/ranking/shipment'), false);
});

test('role helpers keep administrator and viewer semantics separate', () => {
  assert.equal(isAdminRole('admin'), true);
  assert.equal(isAdminRole('viewer'), false);
  assert.equal(isViewerRole('viewer'), true);
  assert.equal(isViewerRole('admin'), false);
});
