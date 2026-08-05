/**
 * seed_network_management_001_phase2_data.js
 *
 * NETWORK-MANAGEMENT-001 Phase 2 — one-time data seed (NOT the Phase 3
 * "Import" feature: no upload UI, no preview/confirm step, no dedup-history
 * workflow). Reads the real PO-supplied source files read-only and loads
 * them into the Phase 1 schema so Phase 2's three map screens have real
 * data. Source files in Data QLML/ and the reference HTML files at the
 * repository root are never modified.
 *
 * Idempotent: re-running clears and reloads only the network_* rows it
 * itself owns (scoped DELETE, not TRUNCATE-everything), so it is safe to
 * run again without duplicating data. It never touches fact_f13,
 * fact_f13_national, import_log, or any other table.
 *
 * Usage: node seed_network_management_001_phase2_data.js [--db <path>]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const { parseServicePointsFile } = require('./src/services/networkMapSeed/parseServicePointsExcel');
const { parseLevel2RoutesHtml } = require('./src/services/networkMapSeed/parseLevel2RoutesHtml');
const { parseDeliveryPointsFile } = require('./src/services/networkMapSeed/parseDeliveryPointsExcel');

const DATA_QLML_DIR = path.resolve(__dirname, '../Data QLML');
const SERVICE_POINTS_XLSX = path.join(DATA_QLML_DIR, 'Mang_diem_phuc_vu_kem_du_lieu_ban_do.xlsx');
const DELIVERY_XLSB = path.join(DATA_QLML_DIR, '2026.07.01 - BatchFile Phat thang 06.2026.xlsb');
const LEVEL2_REFERENCE_HTML = path.resolve(__dirname, '../Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html');

function resolveDbPath(argv) {
    const flagIndex = argv.indexOf('--db');
    if (flagIndex !== -1 && argv[flagIndex + 1]) {
        return path.resolve(argv[flagIndex + 1]);
    }
    return path.resolve(__dirname, 'src/db/database.sqlite');
}

function fileFingerprint(filePath) {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function seedServicePoints(db) {
    const { records, warnings } = parseServicePointsFile(SERVICE_POINTS_XLSX);
    warnings.forEach((w) => console.warn(`[service-points] WARN: ${w}`));

    await dbRun(db, 'DELETE FROM network_service_point');
    const logResult = await dbRun(
        db,
        `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, inserted_records, uploaded_by)
         VALUES ('service_point', ?, ?, 'SUCCESS', ?, ?, 'phase2-seed-script')`,
        [path.basename(SERVICE_POINTS_XLSX), fileFingerprint(SERVICE_POINTS_XLSX), records.length, records.length],
    );

    for (const r of records) {
        await dbRun(
            db,
            `INSERT INTO network_service_point (ma_diem, ten_diem, loai_diem, dia_chi, phuong_xa, don_vi_quan_ly, trang_thai, lat, lon, import_log_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [r.ma_diem, r.ten_diem, r.loai_diem, r.dia_chi, r.phuong_xa, r.don_vi_quan_ly, r.trang_thai, r.lat, r.lon, logResult.lastID],
        );
    }

    console.log(`[service-points] seeded ${records.length} rows (warnings: ${warnings.length})`);
    return { count: records.length, warnings: warnings.length };
}

async function seedLevel2Routes(db) {
    const htmlContent = fs.readFileSync(LEVEL2_REFERENCE_HTML, 'utf8');
    const { routes, warnings, stats } = parseLevel2RoutesHtml(htmlContent);
    warnings.forEach((w) => console.warn(`[level2-routes] WARN: ${w}`));

    await dbRun(db, 'DELETE FROM network_level2_route_stop');
    await dbRun(db, 'DELETE FROM network_level2_route');
    const logResult = await dbRun(
        db,
        `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, inserted_records, uploaded_by)
         VALUES ('level2_route', ?, ?, 'SUCCESS', ?, ?, 'phase2-seed-script')`,
        [path.basename(LEVEL2_REFERENCE_HTML), fileFingerprint(LEVEL2_REFERENCE_HTML), routes.length, stats.stopCount],
    );

    for (const route of routes) {
        const routeResult = await dbRun(
            db,
            `INSERT INTO network_level2_route (id, route_name, declared_km, trips_per_week, operator, import_log_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [route.id, route.name, route.declaredKm ?? null, route.tripsPerWeek ?? null, route.operator ?? null, logResult.lastID],
        );
        for (const stop of route.stops || []) {
            await dbRun(
                db,
                `INSERT INTO network_level2_route_stop (route_id, seq, ma_diem, stop_name, arrival, handling, departure, leg_km, note, lat, lon)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [routeResult.lastID ?? route.id, stop.seq, stop.code ?? null, stop.name ?? null, stop.arrival ?? null, stop.handling ?? null, stop.departure ?? null, stop.legKm ?? null, stop.note ?? null, stop.lat ?? null, stop.lon ?? null],
            );
        }
    }

    console.log(`[level2-routes] seeded ${routes.length} routes / ${stats.stopCount} stops / ${stats.uniquePointCount} unique points / ${stats.totalDeclaredKm} km (warnings: ${warnings.length})`);
    return { ...stats, warnings: warnings.length };
}

async function seedDeliveryPoints(db) {
    const { records, warnings, stats } = parseDeliveryPointsFile(DELIVERY_XLSB);
    warnings.forEach((w) => console.warn(`[delivery-points] WARN: ${w}`));

    await dbRun(db, 'DELETE FROM network_delivery_point');
    const logResult = await dbRun(
        db,
        `INSERT INTO network_import_log (module, file_name, file_fingerprint, status, total_records, inserted_records, skipped_records, uploaded_by)
         VALUES ('delivery_route', ?, ?, 'SUCCESS', ?, ?, ?, 'phase2-seed-script')`,
        [path.basename(DELIVERY_XLSB), fileFingerprint(DELIVERY_XLSB), stats.total_rows, records.length, stats.total_rows - records.length],
    );

    await dbRun(db, 'BEGIN IMMEDIATE TRANSACTION');
    try {
        const stmt = `INSERT INTO network_delivery_point
            (ngay_phat, ma_bcvh, postman_code, bien_so, ma_buu_gui, lat, lon, status_time, loai_dich_vu, tien_thu_ho, route_po_code, import_log_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        for (const r of records) {
            await dbRun(db, stmt, [
                r.ngay_phat, r.ma_bcvh, r.postman_code, r.bien_so, r.ma_buu_gui,
                r.lat, r.lon, r.status_time, r.loai_dich_vu, r.tien_thu_ho, r.route_po_code, logResult.lastID,
            ]);
        }
        await dbRun(db, 'COMMIT');
    } catch (error) {
        await dbRun(db, 'ROLLBACK');
        throw error;
    }

    console.log(`[delivery-points] seeded ${records.length} of ${stats.total_rows} rows — excluded: quantity=-1(${stats.excluded_quantity_minus_1}), invalid_coords(${stats.excluded_invalid_coordinates}), duplicate(${stats.excluded_duplicate_lading_date_route}) (warnings: ${warnings.length})`);
    return { ...stats, warnings: warnings.length };
}

async function main() {
    const dbPath = resolveDbPath(process.argv.slice(2));
    console.log('=== NETWORK-MANAGEMENT-001 Phase 2 — Data Seed ===');
    console.log(`DB Path: ${dbPath}`);

    const db = new sqlite3.Database(dbPath);
    try {
        const servicePoints = await seedServicePoints(db);
        const level2Routes = await seedLevel2Routes(db);
        const deliveryPoints = await seedDeliveryPoints(db);

        console.log('');
        console.log('=== SUMMARY ===');
        console.log(JSON.stringify({ servicePoints, level2Routes, deliveryPoints }, null, 2));
    } finally {
        db.close();
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[FAIL] Seed failed:', error.message, error.stack);
        process.exit(1);
    });
}

module.exports = { seedServicePoints, seedLevel2Routes, seedDeliveryPoints };
