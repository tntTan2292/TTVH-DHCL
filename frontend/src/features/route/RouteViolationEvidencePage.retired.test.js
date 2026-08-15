import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Phase 4 (F13-STANDARDIZATION-001_MANIFEST.md Section 9, "Phase 4 — Retire the old
// component"): RouteViolationEvidencePage.jsx and its test file are permanently retired now
// that the merged Evidence screen has Product Owner runtime acceptance. The governed legacy
// URL (/f13/ranking/route/violations) keeps working via App.jsx's translating redirect,
// which never depended on this component — see App.role-routing.test.js for the redirect's
// own coverage.

const routeDir = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.join(routeDir, '..', '..', 'App.jsx'), 'utf8');

test('RouteViolationEvidencePage.jsx no longer exists on disk', () => {
  assert.equal(fs.existsSync(path.join(routeDir, 'RouteViolationEvidencePage.jsx')), false);
});

test('RouteViolationEvidencePage.smoke.test.js no longer exists on disk', () => {
  assert.equal(fs.existsSync(path.join(routeDir, 'RouteViolationEvidencePage.smoke.test.js')), false);
});

test('App.jsx no longer imports or references RouteViolationEvidencePage', () => {
  assert.doesNotMatch(appSource, /RouteViolationEvidencePage/);
});

test('App.jsx still redirects the legacy /f13/ranking/route/violations path via LegacyRouteViolationsRedirect, not the retired component', () => {
  assert.match(appSource, /path="ranking\/route\/violations" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><LegacyRouteViolationsRedirect/);
});
