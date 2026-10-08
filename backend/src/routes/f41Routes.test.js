'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('f41Routes wires viewer-readable GET endpoints only (no admin-only Import in this ticket)', () => {
    const source = fs.readFileSync(path.join(__dirname, 'f41Routes.js'), 'utf8');

    assert.match(source, /const allowViewerRead = \[requireAuth, requireRole\(\['admin', 'viewer'\]\)\];/);
    assert.match(source, /router\.get\('\/dashboard\/kpi', \.\.\.allowViewerRead/);
    assert.match(source, /router\.get\('\/dashboard\/meta', \.\.\.allowViewerRead/);
    assert.match(source, /router\.get\('\/dashboard\/bcvh-reconciliation', \.\.\.allowViewerRead/);

    // Out of scope for F41-DASHBOARD-MINIMUM-01: Import (admin-only writes), BCVH Ranking, Evidence, Tuyến Ranking, portal sync.
    assert.doesNotMatch(source, /allowAdminOnly/);
    assert.doesNotMatch(source, /router\.post/);
});

test('f41Routes exposes the Operation Dashboard / BCVH Ranking reads, all viewer-readable GET (F41-DASHBOARD-RANKING-01)', () => {
    const source = fs.readFileSync(path.join(__dirname, 'f41Routes.js'), 'utf8');
    for (const route of [
        '/dashboard/summary', '/dashboard/daily-trend', '/ranking/bcvh/overview', '/ranking/bcvh/weeks',
        '/ranking/bcvh/weekly-comparison', '/ranking/bcvh/weekly-trend', '/ranking/bcvh/months',
        '/ranking/bcvh/monthly-comparison', '/ranking/bcvh',
    ]) {
        assert.ok(source.includes(`router.get('${route}', ...allowViewerRead`), route);
    }
    // Tuyến Ranking has no data in F4.1 (D-13): no route endpoint may exist.
    assert.doesNotMatch(source, /ranking\/route/);
    assert.doesNotMatch(source, /router\.(post|put|patch|delete)/);
});

test('server.js mounts f41Routes under /api/f41', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');

    assert.match(source, /const f41Routes = require\('\.\/src\/routes\/f41Routes'\);/);
    assert.match(source, /app\.use\('\/api\/f41', f41Routes\);/);
});
