const test = require('node:test');
const assert = require('node:assert/strict');

const f13DashboardService = require('./src/services/F13DashboardService');
const {
    CONFIRMED_NON_POSTMAN_ROUTES,
    classifyRoute,
    isHueRouteCode,
} = require('./src/config/f13RouteClassificationCatalog');

test('F1.3 route classification catalog records PO-confirmed non-postman routes', () => {
    assert.deepEqual(CONFIRMED_NON_POSTMAN_ROUTES.map((route) => route.ma_tuyen), [
        '53314018',
        '5311203',
        '53547010',
        '53579027',
        '53625013',
        '5370155',
        '5372204',
    ]);

    for (const route of CONFIRMED_NON_POSTMAN_ROUTES) {
        assert.equal(route.classification, 'customer_pickup_internal_post_office');
        assert.equal(route.po_decision_date, '2026-07-28');
        assert.match(route.decision_basis, /not counted as a postman delivery route/);
    }
});

test('route classifier separates Hue scope, confirmed non-postman, and operational default postman routes', () => {
    assert.equal(isHueRouteCode('53314018'), true);
    assert.equal(isHueRouteCode('7170550'), false);

    assert.deepEqual(classifyRoute('53314018'), {
        route_scope: 'hue',
        route_classification: 'customer_pickup_internal_post_office',
        is_postman_delivery_route: false,
        classification_source: 'po_catalog',
        classification_confirmed: true,
    });

    assert.equal(classifyRoute('53314011').is_postman_delivery_route, true);
    assert.equal(classifyRoute('53314011').classification_confirmed, false);
    assert.equal(classifyRoute('7170550').route_scope, 'non_hue');
});

test('Route Ranking postman filter excludes confirmed non-postman routes and all filter includes them', async () => {
    const postman = await f13DashboardService.getRouteRanking('2026-07-27', '533140', 1, 1000, 'total_bg', 'desc', {
        routeType: 'postman',
    });
    const all = await f13DashboardService.getRouteRanking('2026-07-27', '533140', 1, 1000, 'total_bg', 'desc', {
        routeType: 'all',
    });

    assert.equal(postman.meta.route_filter.selected, 'postman');
    assert.equal(postman.meta.route_filter.labels.postman, 'Tuyến bưu tá');
    assert.equal(postman.meta.route_filter.labels.all, 'Tất cả');
    assert.equal(postman.data.some((route) => route.ma_tuyen === '53314018'), false);
    assert.equal(postman.data.every((route) => route.ma_tuyen.startsWith('53')), true);
    assert.equal(postman.data.every((route) => route.is_postman_delivery_route), true);

    const internal = all.data.find((route) => route.ma_tuyen === '53314018');
    assert.ok(internal);
    assert.equal(internal.is_postman_delivery_route, false);
    assert.equal(internal.classification_source, 'po_catalog');
    assert.equal(all.meta.pagination.total_items, postman.meta.pagination.total_items + 1);
    assert.equal(postman.meta.route_classification.participating_postman_route_count, postman.meta.pagination.total_items);
});
