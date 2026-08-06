/**
 * deliveryRoutesImport — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Sơ đồ tuyến phát: locked row key stays (ma_buu_gui, ngay_phat,
 * route_po_code) — never LADING_CODE-only. Confirm writes via
 * INSERT ... ON CONFLICT(...) DO UPDATE — never INSERT OR IGNORE, so an
 * edited-and-reimported row's changes are never silently discarded.
 * Never deletes existing rows or rows absent from the file.
 *
 * Hard-error scope: any error row blocks Confirm for the entire file.
 */

'use strict';

const { all, get } = require('../../config/db');
const { parseDeliveryRoutesImportFile } = require('./parseDeliveryRoutesImportExcel');
const { recordSnapshot } = require('./importSnapshot');

const TRACKED_FIELDS = [
    'ma_bcvh', 'postman_code', 'bien_so', 'lat', 'lon', 'status_time',
    'loai_dich_vu', 'tien_thu_ho', 'thoi_gian_nhap_phat', 'raw_thoi_gian_nhap_phat', 'ca_phat', 'ngay_nhap_phat',
];

function keyOf(record) {
    return `${record.ma_buu_gui}|${record.ngay_phat}|${record.route_po_code}`;
}

function fieldsDiffer(existingRow, parsedRecord) {
    return TRACKED_FIELDS.some((field) => (existingRow[field] ?? null) !== (parsedRecord[field] ?? null));
}

/** Parses the flat Import-ready file (Export's own format) — intra-file duplicates flagged, not dropped. */
function parseForImport(filePath) {
    const { records, warnings } = parseDeliveryRoutesImportFile(filePath);
    return { records, warnings };
}

async function classifyDeliveryPoints(parsedRecords) {
    // Fetch only rows whose key could plausibly match, in bulk, to avoid
    // one query per row on a potentially large file.
    const distinctKeys = [...new Set(parsedRecords.map(keyOf))];
    const existingByKey = new Map();
    // SQLite has a bound-parameter limit; batch lookups defensively.
    const BATCH_SIZE = 500;
    for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
        const batch = parsedRecords.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?,?,?)').join(',');
        const params = batch.flatMap((r) => [r.ma_buu_gui, r.ngay_phat, r.route_po_code]);
        // eslint-disable-next-line no-await-in-loop
        const rows = await all(
            `SELECT * FROM network_delivery_point WHERE (ma_buu_gui, ngay_phat, route_po_code) IN (${placeholders})`,
            params,
        );
        rows.forEach((row) => existingByKey.set(keyOf(row), row));
    }
    void distinctKeys;

    const rows = parsedRecords.map((record, index) => {
        const rowNumber = index + 1;

        if (!record.ma_buu_gui || !record.ngay_phat || !record.route_po_code) {
            return { rowNumber, classification: 'error', reason: 'Thiếu ma_buu_gui/ngay_phat/route_po_code', record };
        }

        const key = keyOf(record);

        if (record.is_duplicate_in_file) {
            return { rowNumber, classification: 'duplicate', reason: `Trùng khóa (${key}) trong file`, record, key };
        }

        const existing = existingByKey.get(key);
        if (!existing) {
            return { rowNumber, classification: 'added', record, key };
        }
        if (fieldsDiffer(existing, record)) {
            return { rowNumber, classification: 'changed', record, key, existing };
        }
        return { rowNumber, classification: 'unchanged', record, key, existing };
    });

    const summary = { added: 0, changed: 0, unchanged: 0, duplicate: 0, error: 0 };
    rows.forEach((r) => { summary[r.classification] += 1; });

    return { rows, summary };
}

function hasBlockingError(classifiedRows) {
    return classifiedRows.some((r) => r.classification === 'error');
}

async function applyDeliveryRoutesImport(runInTx, importLogId, classifiedRows) {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of classifiedRows) {
        if (row.classification === 'unchanged' || row.classification === 'duplicate') {
            skipped += 1;
            continue; // eslint-disable-line no-continue
        }
        if (row.classification === 'error') {
            continue; // eslint-disable-line no-continue
        }

        const r = row.record;

        if (row.classification === 'changed') {
            // eslint-disable-next-line no-await-in-loop
            const beforeImage = await get(
                'SELECT * FROM network_delivery_point WHERE ma_buu_gui = ? AND ngay_phat = ? AND route_po_code = ?',
                [r.ma_buu_gui, r.ngay_phat, r.route_po_code],
            );
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_delivery_point', { id: beforeImage.id }, 'UPDATE', beforeImage);
            updated += 1;

            // eslint-disable-next-line no-await-in-loop
            await runInTx(
                `UPDATE network_delivery_point SET
                    ma_bcvh = ?, postman_code = ?, bien_so = ?, lat = ?, lon = ?, status_time = ?,
                    loai_dich_vu = ?, tien_thu_ho = ?, thoi_gian_nhap_phat = ?, raw_thoi_gian_nhap_phat = ?,
                    ca_phat = ?, ngay_nhap_phat = ?, import_log_id = ?
                 WHERE id = ?`,
                [
                    r.ma_bcvh ?? null, r.postman_code ?? null, r.bien_so ?? null, r.lat ?? null, r.lon ?? null, r.status_time ?? null,
                    r.loai_dich_vu ?? null, r.tien_thu_ho ?? null, r.thoi_gian_nhap_phat ?? null, r.raw_thoi_gian_nhap_phat ?? null,
                    r.ca_phat ?? null, r.ngay_nhap_phat ?? null, importLogId, beforeImage.id,
                ],
            );
        } else {
            // added — INSERT ... ON CONFLICT DO UPDATE per locked design; a
            // true INSERT here since classification already confirmed no
            // existing row for this key.
            // eslint-disable-next-line no-await-in-loop
            const result = await runInTx(
                `INSERT INTO network_delivery_point
                    (ngay_phat, ma_bcvh, postman_code, bien_so, ma_buu_gui, lat, lon, status_time, loai_dich_vu, tien_thu_ho, route_po_code, thoi_gian_nhap_phat, raw_thoi_gian_nhap_phat, ca_phat, ngay_nhap_phat, import_log_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(ma_buu_gui, ngay_phat, route_po_code) DO UPDATE SET
                    ma_bcvh = excluded.ma_bcvh, postman_code = excluded.postman_code, bien_so = excluded.bien_so,
                    lat = excluded.lat, lon = excluded.lon, status_time = excluded.status_time,
                    loai_dich_vu = excluded.loai_dich_vu, tien_thu_ho = excluded.tien_thu_ho,
                    thoi_gian_nhap_phat = excluded.thoi_gian_nhap_phat, raw_thoi_gian_nhap_phat = excluded.raw_thoi_gian_nhap_phat,
                    ca_phat = excluded.ca_phat, ngay_nhap_phat = excluded.ngay_nhap_phat, import_log_id = excluded.import_log_id`,
                [
                    r.ngay_phat, r.ma_bcvh ?? null, r.postman_code ?? null, r.bien_so ?? null, r.ma_buu_gui,
                    r.lat ?? null, r.lon ?? null, r.status_time ?? null, r.loai_dich_vu ?? null, r.tien_thu_ho ?? null,
                    r.route_po_code, r.thoi_gian_nhap_phat ?? null, r.raw_thoi_gian_nhap_phat ?? null, r.ca_phat ?? null, r.ngay_nhap_phat ?? null,
                    importLogId,
                ],
            );
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_delivery_point', { id: result.lastID }, 'INSERT', null);
            inserted += 1;
        }
    }

    return { inserted, updated, skipped };
}

module.exports = {
    parseForImport,
    classifyDeliveryPoints,
    hasBlockingError,
    applyDeliveryRoutesImport,
    TRACKED_FIELDS,
};
