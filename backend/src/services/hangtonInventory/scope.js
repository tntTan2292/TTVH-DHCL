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
// A manual point is an EXTRA snapshot (PO 2026-10-27): slot "M" + HHMMSS of the moment it was taken. It never takes the
// place of one of the three scheduled slots.
const MANUAL_SLOT_RE = /^M\d{6}$/;

function isManualSlot(slot) { return MANUAL_SLOT_RE.test(String(slot || '')); }
function isValidSlot(slot) { return SLOTS.includes(slot) || isManualSlot(slot); }

function pad2(n) { return String(n).padStart(2, '0'); }

function manualSlotFor(now = new Date()) {
    return `M${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
}

// Wall-clock time a scheduled slot stands for today: slotTime(now, '0730') -> today 07:30 local.
function slotTime(now, slot) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(slot.slice(0, 2)), Number(slot.slice(2)), 0, 0);
}

// "0730" -> "07:30", "M104532" -> "10:45"
function slotClock(slot) {
    const s = String(slot || '');
    const digits = isManualSlot(s) ? s.slice(1, 5) : s.slice(0, 4);
    return digits.length === 4 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : s;
}

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

module.exports = { SCOPE_STATUSES, SCOPE_DK1, SLOTS, MANUAL_SLOT_RE, isManualSlot, isValidSlot, manualSlotFor, slotTime, slotClock, tonRank, inScope, toItem, selectScope };
