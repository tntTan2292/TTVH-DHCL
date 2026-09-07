// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record §5.4 step 3, §9.1). Server-side
// keyword matcher for the new `GET /f13/evidence` search path — byte-for-byte the same
// two-branch algorithm as `frontend/src/features/shipment/shipmentPerformanceData.js`'s
// `matchesSearchQuery`/`stripVietnameseDiacritics` (PO-accepted `DEFECT A` remediation,
// 2026-08-11), so keyword-matching behaviour does not change when it moves server-side.
//
// NOTE for Phase F1 (`Antigravity`, `DEC-020`): `frontend/` and `backend/` are two separate npm
// packages with no shared module resolution path — this repository has no workspace/monorepo
// config, so this file cannot literally be `require()`d/`import`ed from `frontend/src`.
// "Dùng chung" per the Design of Record therefore means *logically identical*, not one
// physically shared file: keep `shipmentPerformanceData.js`'s copy byte-for-byte identical to
// this one, and rely on the `T-F02` equivalence test (Design of Record §10.3) to catch any
// future drift between the two.

function stripVietnameseDiacritics(text) {
    return String(text)
        .normalize('NFD')
        .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

// True if `query` matches any of `fields`, either exactly (substring, case-insensitive) or, as
// a fallback, with Vietnamese diacritics stripped from both sides.
function matchesSearchQuery(fields, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;

    const candidates = fields.filter((value) => value !== undefined && value !== null && value !== '');
    const qStripped = stripVietnameseDiacritics(q);

    return candidates.some((value) => {
        const text = String(value).toLowerCase();
        if (text.includes(q)) return true;
        return stripVietnameseDiacritics(text).includes(qStripped);
    });
}

module.exports = { stripVietnameseDiacritics, matchesSearchQuery };
