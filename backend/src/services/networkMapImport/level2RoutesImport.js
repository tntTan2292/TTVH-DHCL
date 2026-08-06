/**
 * level2RoutesImport — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Đường thư cấp 2: Admin selects specific hành trình(s) to replace — never
 * the whole network. Route identity = network_level2_route.id ("Route
 * ID"), verbatim; blank Route ID = new route, shown clearly in preview.
 * Geometry is never parsed from Excel/HTML here — every stop's Mã điểm
 * must already exist in network_service_point (checked, not guessed);
 * lat/lon are read from there at write time. trạng_thái of the service
 * point is irrelevant to this check — "Tạm dừng" points are valid
 * geometry sources, never filtered out.
 *
 * Hard-error scope: a route with an invalid Mã điểm blocks only that
 * route; other valid routes in the same file remain individually
 * selectable for Confirm.
 */

'use strict';

const { all, get } = require('../../config/db');
const { recordSnapshot } = require('./importSnapshot');
const { groupStopRowsByRoute } = require('./parseLevel2RoutesImportExcel');

const ROUTE_FIELDS = ['route_name', 'declared_km', 'trips_per_week', 'operator'];
const STOP_FIELDS = ['seq', 'ma_diem', 'stop_name', 'arrival', 'handling', 'departure', 'leg_km', 'note'];

function stopsDiffer(existingStops, fileStops) {
    if (existingStops.length !== fileStops.length) return true;
    const sortedExisting = [...existingStops].sort((a, b) => a.seq - b.seq);
    const sortedFile = [...fileStops].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    return sortedExisting.some((existing, i) => {
        const fileStop = sortedFile[i];
        return STOP_FIELDS.some((field) => (existing[field] ?? null) !== (fileStop[field] ?? null));
    });
}

function routeFieldsDiffer(existingRoute, group) {
    return ROUTE_FIELDS.some((field) => (existingRoute[field] ?? null) !== (group[field] ?? null));
}

/**
 * Classifies each route group. Every stop's ma_diem is validated against
 * live network_service_point (existence only — trang_thai never filters).
 */
async function classifyLevel2Routes(routeGroups) {
    const allServicePoints = await all('SELECT ma_diem FROM network_service_point');
    const validCodes = new Set(allServicePoints.map((r) => r.ma_diem));

    const classified = [];
    for (const group of routeGroups) {
        const missingCodes = group.stops
            .filter((s) => !s.ma_diem || !validCodes.has(s.ma_diem))
            .map((s) => ({ rowNumber: s.rowNumber, ma_diem: s.ma_diem }));

        if (missingCodes.length > 0) {
            classified.push({
                ...group,
                classification: 'error',
                reason: `${missingCodes.length} điểm dừng có Mã điểm thiếu hoặc không tồn tại trong Mạng điểm phục vụ`,
                missingCodes,
            });
            continue; // eslint-disable-line no-continue
        }

        if (group.isNew) {
            classified.push({ ...group, classification: 'added' });
            continue; // eslint-disable-line no-continue
        }

        const routeId = Number(group.route_id);
        // eslint-disable-next-line no-await-in-loop
        const existingRoute = await get('SELECT * FROM network_level2_route WHERE id = ?', [routeId]);
        if (!existingRoute) {
            classified.push({ ...group, classification: 'error', reason: `Route ID "${group.route_id}" không tồn tại` });
            continue; // eslint-disable-line no-continue
        }

        // eslint-disable-next-line no-await-in-loop
        const existingStops = await all('SELECT * FROM network_level2_route_stop WHERE route_id = ? ORDER BY seq', [routeId]);
        const differs = routeFieldsDiffer(existingRoute, group) || stopsDiffer(existingStops, group.stops);

        classified.push({
            ...group,
            classification: differs ? 'changed' : 'unchanged',
            existingRoute,
            existingStops,
        });
    }

    const summary = { added: 0, changed: 0, unchanged: 0, error: 0 };
    classified.forEach((r) => { summary[r.classification] += 1; });

    return { routes: classified, summary };
}

/**
 * Applies only the routes whose group key is in `selectedRouteKeys`
 * (Admin's explicit per-route selection — never "replace everything").
 * `runInTx` must be the transactional executor from transactionHelper.
 */
async function applyLevel2RoutesImport(runInTx, importLogId, classifiedRoutes, selectedRouteKeys) {
    const selectedSet = new Set(selectedRouteKeys);
    let routesAdded = 0;
    let routesUpdated = 0;
    let routesSkipped = 0;

    for (const group of classifiedRoutes) {
        const groupKey = group.route_id !== null ? `id:${group.route_id}` : `new:${group.route_name}`;
        if (!selectedSet.has(groupKey)) {
            routesSkipped += 1;
            continue; // eslint-disable-line no-continue
        }
        if (group.classification === 'error' || group.classification === 'unchanged') {
            routesSkipped += 1;
            continue; // eslint-disable-line no-continue
        }

        if (group.classification === 'added') {
            // eslint-disable-next-line no-await-in-loop
            const routeResult = await runInTx(
                `INSERT INTO network_level2_route (route_name, declared_km, trips_per_week, operator, import_log_id, updated_at)
                 VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [group.route_name, group.declared_km, group.trips_per_week, group.operator, importLogId],
            );
            const newRouteId = routeResult.lastID;
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_level2_route', { id: newRouteId }, 'INSERT', null);

            for (const stop of group.stops) {
                // eslint-disable-next-line no-await-in-loop
                const stopResult = await runInTx(
                    `INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name, arrival, handling, departure, leg_km, note)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [newRouteId, stop.seq, stop.ma_diem, stop.stop_name, stop.arrival, stop.handling, stop.departure, stop.leg_km, stop.note],
                );
                // eslint-disable-next-line no-await-in-loop
                await recordSnapshot(importLogId, 'network_level2_route_stop', { id: stopResult.lastID }, 'INSERT', null);
            }
            routesAdded += 1;
            continue; // eslint-disable-line no-continue
        }

        // classification === 'changed': update route fields, delete-and-reinsert only this route's stops.
        const routeId = Number(group.route_id);

        // eslint-disable-next-line no-await-in-loop
        await recordSnapshot(importLogId, 'network_level2_route', { id: routeId }, 'UPDATE', group.existingRoute);
        // eslint-disable-next-line no-await-in-loop
        await runInTx(
            `UPDATE network_level2_route SET route_name = ?, declared_km = ?, trips_per_week = ?, operator = ?, import_log_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [group.route_name, group.declared_km, group.trips_per_week, group.operator, importLogId, routeId],
        );

        for (const existingStop of group.existingStops) {
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_level2_route_stop', { id: existingStop.id }, 'DELETE', existingStop);
        }
        // eslint-disable-next-line no-await-in-loop
        await runInTx('DELETE FROM network_level2_route_stop WHERE route_id = ?', [routeId]);

        for (const stop of group.stops) {
            // eslint-disable-next-line no-await-in-loop
            const stopResult = await runInTx(
                `INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name, arrival, handling, departure, leg_km, note)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [routeId, stop.seq, stop.ma_diem, stop.stop_name, stop.arrival, stop.handling, stop.departure, stop.leg_km, stop.note],
            );
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_level2_route_stop', { id: stopResult.lastID }, 'INSERT', null);
        }
        routesUpdated += 1;
    }

    return { routesAdded, routesUpdated, routesSkipped };
}

module.exports = { classifyLevel2Routes, applyLevel2RoutesImport, groupStopRowsByRoute };
