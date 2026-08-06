/**
 * parseLevel2RoutesImportExcel — NETWORK-MANAGEMENT-001 Phase 3.
 *
 * Reads the flat, denormalized Import-ready Đường thư cấp 2 template (the
 * same structure Export produces) — one row per stop, route-level fields
 * repeated on every row of that route. This is a distinct parser from
 * Phase 2's `parseLevel2RoutesHtml.js` (which reads the HTML `MAIL_ROUTES`
 * array for the one-time seed); Phase 3 Import/Export never touches the
 * merged-layout source Excel or the reference HTML again.
 *
 * `Route ID` = network_level2_route.id, verbatim (blank = new route — no
 * separate route_key; id is already stable for the table's lifetime since
 * it's an AUTOINCREMENT primary key, never reused after delete).
 *
 * `Mã điểm` is required on every stop row; existence against
 * network_service_point is validated by the caller (classify step), not
 * here — this parser only extracts and structurally validates the file.
 */

'use strict';

const xlsx = require('xlsx');

const EXPECTED_HEADERS = [
    'Route ID', 'Tên ĐT', 'Cự ly (km)', 'TS chuyến/tuần', 'Đơn vị',
    'STT dừng', 'Mã điểm', 'Tên điểm dừng', 'Giờ đến', 'TG xử lý', 'Giờ đi', 'Cự ly chặng (km)', 'Ghi chú',
];
const HEADER_ROW_INDEX = 0;
const SHEET_NAME = 'ĐTC2 Import';

function parseLevel2RoutesImportWorkbook(workbook) {
    const sheetName = workbook.SheetNames.includes(SHEET_NAME) ? SHEET_NAME : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const header = rows[HEADER_ROW_INDEX] || [];

    const warnings = [];
    EXPECTED_HEADERS.forEach((expected, index) => {
        if (header[index] !== expected) {
            warnings.push(`Column ${index} header mismatch: expected "${expected}", found "${header[index]}"`);
        }
    });

    const stopRows = [];
    for (let i = HEADER_ROW_INDEX + 1; i < rows.length; i += 1) {
        const row = rows[i];
        if (!row || row.every((cell) => cell === null || cell === '')) continue; // eslint-disable-line no-continue

        stopRows.push({
            rowNumber: i + 1,
            route_id: row[0] !== null && row[0] !== '' ? String(row[0]).trim() : null,
            route_name: row[1] ?? null,
            declared_km: typeof row[2] === 'number' ? row[2] : null,
            trips_per_week: typeof row[3] === 'number' ? row[3] : null,
            operator: row[4] ?? null,
            seq: typeof row[5] === 'number' ? row[5] : null,
            ma_diem: row[6] !== null && row[6] !== '' ? String(row[6]).trim() : null,
            stop_name: row[7] ?? null,
            arrival: row[8] ?? null,
            handling: row[9] ?? null,
            departure: row[10] ?? null,
            leg_km: typeof row[11] === 'number' ? row[11] : null,
            note: row[12] ?? null,
        });
    }

    return { stopRows, warnings };
}

function parseLevel2RoutesImportFile(filePath) {
    const workbook = xlsx.readFile(filePath);
    return parseLevel2RoutesImportWorkbook(workbook);
}

/** Groups flat stop rows into per-route units. New routes (blank Route ID) group by Tên ĐT. */
function groupStopRowsByRoute(stopRows) {
    const groups = new Map();
    for (const row of stopRows) {
        const groupKey = row.route_id !== null ? `id:${row.route_id}` : `new:${row.route_name}`;
        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                route_id: row.route_id,
                route_name: row.route_name,
                declared_km: row.declared_km,
                trips_per_week: row.trips_per_week,
                operator: row.operator,
                isNew: row.route_id === null,
                stops: [],
            });
        }
        groups.get(groupKey).stops.push(row);
    }
    return [...groups.values()];
}

module.exports = {
    parseLevel2RoutesImportWorkbook,
    parseLevel2RoutesImportFile,
    groupStopRowsByRoute,
    EXPECTED_HEADERS,
    SHEET_NAME,
};
