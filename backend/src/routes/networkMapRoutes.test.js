'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('networkMapRoutes wires viewer-readable GET endpoints and admin-only import endpoints', () => {
    const source = fs.readFileSync(path.join(__dirname, 'networkMapRoutes.js'), 'utf8');

    assert.match(source, /const allowViewerRead = \[requireAuth, requireRole\(\['admin', 'viewer'\]\)\];/);
    assert.match(source, /const allowAdminOnly = \[requireAuth, requireRole\(\['admin'\]\)\];/);

    assert.match(source, /router\.get\('\/service-points', \.\.\.allowViewerRead/);
    assert.match(source, /router\.post\('\/service-points\/import', \.\.\.allowAdminOnly/);

    assert.match(source, /router\.get\('\/level2-routes', \.\.\.allowViewerRead/);
    assert.match(source, /router\.post\('\/level2-routes\/import', \.\.\.allowAdminOnly/);

    assert.match(source, /router\.get\('\/delivery-routes\/meta', \.\.\.allowViewerRead/);
    assert.match(source, /router\.get\('\/delivery-routes\/points', \.\.\.allowViewerRead/);
    assert.match(source, /router\.post\('\/delivery-routes\/import', \.\.\.allowAdminOnly/);
});

test('server.js mounts networkMapRoutes under /api/network-map', () => {
    const source = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');

    assert.match(source, /const networkMapRoutes = require\('\.\/src\/routes\/networkMapRoutes'\);/);
    assert.match(source, /app\.use\('\/api\/network-map', networkMapRoutes\);/);
});
