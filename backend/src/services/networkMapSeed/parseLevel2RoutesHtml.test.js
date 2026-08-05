'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLevel2RoutesHtml } = require('./parseLevel2RoutesHtml');

function buildHtml(mailRoutesJson) {
    return `<html><script>\n// ===== TÍCH HỢP HÀNH TRÌNH ĐƯỜNG THƯ CẤP 2 =====\nconst MAIL_ROUTES = ${mailRoutesJson};\nconst mailMap = 1;\n</script></html>`;
}

test('extracts routes/stops and computes stats matching the locked baseline shape', () => {
    const routes = [
        {
            id: 1, name: 'Route A', declaredKm: 36, tripsPerWeek: 7, operator: 'X',
            stops: [
                { seq: 1, code: 'A1', name: 'Stop 1', arrival: '05:00', handling: '00:05', departure: '05:05', legKm: null, note: '', lat: 16.1, lon: 107.1 },
                { seq: 2, code: 'A2', name: 'Stop 2', arrival: '05:30', handling: '00:05', departure: '05:35', legKm: 18, note: '', lat: 16.2, lon: 107.2 },
            ],
        },
        {
            id: 2, name: 'Route B', declaredKm: 8, tripsPerWeek: 7, operator: 'X',
            stops: [
                { seq: 1, code: 'A1', name: 'Stop 1', arrival: '06:00', handling: '00:05', departure: '06:05', legKm: null, note: '', lat: 16.1, lon: 107.1 },
            ],
        },
    ];
    const { routes: parsed, stats, warnings } = parseLevel2RoutesHtml(buildHtml(JSON.stringify(routes)));

    assert.equal(parsed.length, 2);
    assert.equal(stats.routeCount, 2);
    assert.equal(stats.stopCount, 3);
    assert.equal(stats.uniquePointCount, 2); // A1 repeats across routes
    assert.equal(stats.totalDeclaredKm, 44);
    assert.equal(warnings.length, 0);
});

test('warns instead of fabricating coordinates for a stop missing lat/lon', () => {
    const routes = [{
        id: 1, name: 'Route A', declaredKm: 10, tripsPerWeek: 7, operator: 'X',
        stops: [{ seq: 1, code: 'A1', name: 'Stop 1', arrival: '05:00', handling: '', departure: '', legKm: null, note: '', lat: null, lon: null }],
    }];
    const { warnings } = parseLevel2RoutesHtml(buildHtml(JSON.stringify(routes)));

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /missing lat\/lon/);
});

test('warns instead of silently dropping a route with zero stops', () => {
    const routes = [{ id: 1, name: 'Empty route', declaredKm: 0, tripsPerWeek: 0, operator: 'X', stops: [] }];
    const { warnings } = parseLevel2RoutesHtml(buildHtml(JSON.stringify(routes)));

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /has no stops/);
});

test('throws a clear error when MAIL_ROUTES is not present in the HTML', () => {
    assert.throws(() => parseLevel2RoutesHtml('<html>no data here</html>'), /MAIL_ROUTES array not found/);
});
