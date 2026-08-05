/**
 * parseLevel2RoutesHtml — NETWORK-MANAGEMENT-001 Phase 2.
 *
 * Mạng đường thư cấp 2 has no coordinates in its Excel source
 * (`Data QLML/2026.08. Mang DTC2.xlsx` — HIỆN TRẠNG block has route/stop
 * names, schedule and distance only). Per the Product Owner's item 5
 * ("HTML ĐTC2 chỉ dùng để đối chiếu dữ liệu, tọa độ, giao diện..."), the
 * stop-level geometry (lat/lon) is read from the reference HTML's embedded
 * `MAIL_ROUTES` JS array, which already matches the locked Manifest
 * baseline (28 hành trình, 148 lượt dừng, 47 mã điểm, 1.435 km) — i.e. the
 * current network ("mạng cũ"), not the "ĐƯỜNG THƯ CẤP 2 TỔ CHỨC LẠI"
 * proposal, which is out of scope by explicit Product Owner decision.
 */

'use strict';

const MAIL_ROUTES_PATTERN = /const MAIL_ROUTES = (\[.*?\]);/s;

function parseLevel2RoutesHtml(htmlContent) {
    const match = htmlContent.match(MAIL_ROUTES_PATTERN);
    if (!match) {
        throw new Error('MAIL_ROUTES array not found in the reference HTML — cannot seed Mạng đường thư cấp 2 geometry.');
    }

    const routes = JSON.parse(match[1]);
    const warnings = [];

    let totalStops = 0;
    const uniquePoints = new Set();

    for (const route of routes) {
        if (!Array.isArray(route.stops) || route.stops.length === 0) {
            warnings.push(`Route ${route.id} (${route.name}) has no stops.`);
            continue;
        }
        for (const stop of route.stops) {
            totalStops += 1;
            if (stop.code) uniquePoints.add(stop.code);
            if (typeof stop.lat !== 'number' || typeof stop.lon !== 'number') {
                warnings.push(`Route ${route.id} stop seq ${stop.seq} (${stop.name}) missing lat/lon.`);
            }
        }
    }

    const totalDeclaredKm = routes.reduce((sum, route) => sum + (typeof route.declaredKm === 'number' ? route.declaredKm : 0), 0);

    return {
        routes,
        warnings,
        stats: {
            routeCount: routes.length,
            stopCount: totalStops,
            uniquePointCount: uniquePoints.size,
            totalDeclaredKm: Math.round(totalDeclaredKm * 1000) / 1000,
        },
    };
}

module.exports = { parseLevel2RoutesHtml, MAIL_ROUTES_PATTERN };
