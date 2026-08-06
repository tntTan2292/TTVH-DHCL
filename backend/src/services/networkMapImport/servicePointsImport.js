/**
 * servicePointsImport — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Mạng điểm phục vụ: upsert-by-ma_diem. Reuses the Phase 2 parser
 * (`parseServicePointsExcel.js`) — Export produces the identical
 * "Dữ liệu bản đồ" sheet structure, so the same parser reads both the
 * original seed file and any admin-edited re-Import file.
 *
 * trang_thai is copied verbatim from the parsed file at every step —
 * never defaulted, inferred, or transformed (locked PO decision).
 *
 * Hard-error scope: any error row blocks Confirm for the entire file.
 */

'use strict';

const { all, get } = require('../../config/db');
const { recordSnapshot } = require('./importSnapshot');

const TRACKED_FIELDS = ['ten_diem', 'loai_diem', 'dia_chi', 'phuong_xa', 'don_vi_quan_ly', 'trang_thai', 'lat', 'lon'];

function fieldsDiffer(existingRow, parsedRecord) {
    return TRACKED_FIELDS.some((field) => (existingRow[field] ?? null) !== (parsedRecord[field] ?? null));
}

/**
 * Classifies parsed rows against live DB state.
 * @returns {{ rows: Array, summary: object }}
 */
async function classifyServicePoints(parsedRecords) {
    const existingRows = await all('SELECT * FROM network_service_point');
    const existingByCode = new Map(existingRows.map((r) => [r.ma_diem, r]));
    const seenInFile = new Set();

    const rows = parsedRecords.map((record, index) => {
        const rowNumber = index + 1;

        if (!record.ma_diem || String(record.ma_diem).trim() === '') {
            return { rowNumber, classification: 'error', reason: 'Thiếu mã điểm phục vụ', record };
        }

        const maDiem = String(record.ma_diem).trim();

        if (seenInFile.has(maDiem)) {
            return { rowNumber, classification: 'duplicate', reason: `Trùng mã điểm "${maDiem}" trong file`, record, ma_diem: maDiem };
        }
        seenInFile.add(maDiem);

        const existing = existingByCode.get(maDiem);
        if (!existing) {
            return { rowNumber, classification: 'added', record, ma_diem: maDiem };
        }
        if (fieldsDiffer(existing, record)) {
            return { rowNumber, classification: 'changed', record, ma_diem: maDiem, existing };
        }
        return { rowNumber, classification: 'unchanged', record, ma_diem: maDiem, existing };
    });

    const summary = { added: 0, changed: 0, unchanged: 0, duplicate: 0, error: 0 };
    rows.forEach((r) => { summary[r.classification] += 1; });

    return { rows, summary };
}

function hasBlockingError(classifiedRows) {
    return classifiedRows.some((r) => r.classification === 'error');
}

/**
 * Applies added + changed rows via INSERT ... ON CONFLICT(ma_diem) DO
 * UPDATE, snapshotting the before-image of every changed row first.
 * Must run inside an existing transaction (see transactionHelper).
 */
async function applyServicePointsImport(runInTx, importLogId, classifiedRows) {
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
            const beforeImage = await get('SELECT * FROM network_service_point WHERE ma_diem = ?', [row.ma_diem]);
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_service_point', { ma_diem: row.ma_diem }, 'UPDATE', beforeImage);
            updated += 1;
        } else {
            // eslint-disable-next-line no-await-in-loop
            await recordSnapshot(importLogId, 'network_service_point', { ma_diem: row.ma_diem }, 'INSERT', null);
            inserted += 1;
        }

        // eslint-disable-next-line no-await-in-loop
        await runInTx(
            `INSERT INTO network_service_point (ma_diem, ten_diem, loai_diem, dia_chi, phuong_xa, don_vi_quan_ly, trang_thai, lat, lon, import_log_id, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(ma_diem) DO UPDATE SET
                ten_diem = excluded.ten_diem,
                loai_diem = excluded.loai_diem,
                dia_chi = excluded.dia_chi,
                phuong_xa = excluded.phuong_xa,
                don_vi_quan_ly = excluded.don_vi_quan_ly,
                trang_thai = excluded.trang_thai,
                lat = excluded.lat,
                lon = excluded.lon,
                import_log_id = excluded.import_log_id,
                updated_at = CURRENT_TIMESTAMP`,
            [row.ma_diem, r.ten_diem ?? null, r.loai_diem ?? null, r.dia_chi ?? null, r.phuong_xa ?? null, r.don_vi_quan_ly ?? null, r.trang_thai ?? null, r.lat ?? null, r.lon ?? null, importLogId],
        );
    }

    return { inserted, updated, skipped };
}

module.exports = { classifyServicePoints, hasBlockingError, applyServicePointsImport, TRACKED_FIELDS };
