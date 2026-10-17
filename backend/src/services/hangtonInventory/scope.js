'use strict';

// HANGTON-INVENTORY-01 PO decisions D1-D3: scope of the stock set, applied by QIS after the fetch.
const SCOPE_STATUSES = Object.freeze([
    'Phát không thành công',
    'Vu hồi về bưu cục',
    'Đã giao cho bưu tá',
    'Đã phân tuyến',
    'Đã xác nhận đến',
]);
const SCOPE_DK1 = 'LM';
const SLOTS = Object.freeze(['0730', '1130', '2100']);

// "Loại Tồn" -> numeric rank so levels can be compared ("<1 ngày" = 0, "≥1.5 ngày" = 1.5, ...).
function tonRank(level) {
    const text = String(level || '');
    if (text.startsWith('<')) return 0;
    const m = text.match(/(\d+(?:[.,]\d+)?)/);
    return m ? Number(m[1].replace(',', '.')) : null;
}

function inScope(row) {
    return row && row.DK1 === SCOPE_DK1
        && SCOPE_STATUSES.includes(row.StatusName)
        && Boolean(row.ItemCode)
        && tonRank(row['Loại Tồn']) !== null;
}

function toItem(row) {
    return {
        item_code: row.ItemCode,
        status_name: row.StatusName,
        ton_level: row['Loại Tồn'],
        ton_rank: tonRank(row['Loại Tồn']),
        office: row['Bưu cục Phát'] ?? null,
        office_code: row['Mã Bưu Cục'] ?? null,
        district: row['Huyện Phát'] ?? null,
        cod: row.COD ?? null,
        parcel_type: row['Loại Bưu Gửi'] ?? null,
        customer_class: row['Phân Loại KH'] ?? null,
        postman_code: row.PostManCode ?? null,
        postman_name: row.PostManName ?? null,
        reason: row['Lý Do'] ?? null,
        tms_scan_ms: row['Ngày Quét TMS'] ?? null,
        weight: row['Trọng Lượng'] ?? null,
    };
}

function selectScope(rows) {
    const seen = new Set();
    const items = [];
    for (const row of rows || []) {
        if (!inScope(row) || seen.has(row.ItemCode)) continue;
        seen.add(row.ItemCode);
        items.push(toItem(row));
    }
    return items;
}

module.exports = { SCOPE_STATUSES, SCOPE_DK1, SLOTS, tonRank, inScope, toItem, selectScope };
