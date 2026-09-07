// F13-ROUTE-EVIDENCE-STATUS-02 Phase B1 (Design of Record §5.2, §6.4 C-04). Single source of
// truth for the SQL-side derivation of RULE_F13_302's violation-reason classification, the
// status-group grouping, and the delay-hours computation used by the new `GET /f13/evidence`
// endpoint (evidenceQueryService.js / FactBuuGuiRepository.js Evidence methods).
//
// This is a DERIVATION, not a fork: `backend/src/engine/rules/RuleF13302.js` remains the SSOT
// for the >3h delayed-cash threshold. The equivalence between this SQL and the JS rule is
// proven and pinned by `backend/src/repositories/FactBuuGuiRepository.evidence.test.js`'s
// `T-B01` test (real SQLite, not mocked) — if either side's threshold changes without the
// other, that test goes red. Do not edit the `> 3.0` literal here without updating
// `RuleF13302.js`'s own `diffHours > 3` in the same change, and re-running `T-B01`.
//
// The timestamp-format guard mirrors `RuleF13302.js`'s own regex exactly:
// `/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/` (dd/MM/yyyy HH:mm:ss). Verified
// against real production data on SQLite `3.52.0` (`julianday`, `GLOB`) during Design of
// Record R0 — 0 mismatches across all 314,421 real "Không đạt" rows. See Design of Record
// §5.2/§8.2/R-06 for the read-only measurement this rests on.

const VIOLATION_REASON = {
    DELAYED_CASH: 'Chậm nộp tiền',
    OTHER: 'Không đạt khác',
    UNKNOWN: 'Chưa xác định nguyên nhân',
};

const VIOLATION_REASON_FILTER_SLUGS = {
    delayed_cash: VIOLATION_REASON.DELAYED_CASH,
    other: VIOLATION_REASON.OTHER,
    unknown: VIOLATION_REASON.UNKNOWN,
};

const STATUS_GROUP = {
    PASSED: 'passed',
    FAILED: 'failed',
    RETURNED: 'returned',
};

// D-OPEN-01 (PO decision, 2026-09-07, F13-STANDARDIZATION-001_MANIFEST.md §64): the
// `danh_gia_2026` column, NULL or blank, is Chuyển hoàn — with no special-case carve-out for
// the 108 rows whose `ket_qua_f13` happens to carry a real verdict (Design of Record §3.3 /
// §14 `D-OPEN-01`). The PO explicitly kept the existing `total_returned` convention
// (`FactBuuGuiRepository.js`'s `getFactByDate`-adjacent aggregate) rather than splitting out a
// fourth "unclassified" group.
const STATUS_PREDICATES = {
    passed: `danh_gia_2026 = 'Đạt'`,
    failed: `danh_gia_2026 = 'Không đạt'`,
    returned: `(danh_gia_2026 IS NULL OR TRIM(danh_gia_2026) = '')`,
};

function tsFormatOkSql(column) {
    return `${column} IS NOT NULL AND ${column} GLOB '[0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]'`;
}

// `dd/MM/yyyy HH:mm:ss` -> ISO `yyyy-MM-ddTHH:mm:ss` via fixed-position `substr`, then
// `julianday()`. Only ever applied to a column already passed `tsFormatOkSql()`.
function tsJulianDaySql(column) {
    return `julianday(substr(${column},7,4)||'-'||substr(${column},4,2)||'-'||substr(${column},1,2)||'T'||substr(${column},12,8))`;
}

// SQL CASE expression for the `status_group` output column (§6.3/§6.4). Every row falls into
// exactly one of the three groups — there is no fourth `danh_gia_2026` value in the real data
// (Design of Record §3.2, confirmed by a real `GROUP BY` over the whole table).
function statusGroupCaseSql() {
    return `CASE
        WHEN danh_gia_2026 = 'Đạt' THEN 'passed'
        WHEN danh_gia_2026 = 'Không đạt' THEN 'failed'
        ELSE 'returned'
    END`;
}

// SQL CASE expression for `violation_reason` (§5.2, §6.4 C-04). NULL for every row whose
// `danh_gia_2026` is not exactly 'Không đạt' — Đạt and Chuyển hoàn never carry a reason.
function violationReasonCaseSql() {
    const ptcOk = tsFormatOkSql('thoi_gian_ptc');
    const nopOk = tsFormatOkSql('thoi_gian_nop_tien');
    const ptcJd = tsJulianDaySql('thoi_gian_ptc');
    const nopJd = tsJulianDaySql('thoi_gian_nop_tien');
    // `danh_gia_2026 IS NOT 'Không đạt'` (not `<>`): SQLite's `<>`/`=` are NULL-in-NULL-out, so
    // a NULL danh_gia_2026 (Chuyển hoàn) would fail `<> 'Không đạt'` silently (NULL, not TRUE)
    // and fall through to the timestamp branches below — reproduced and caught by T-B03.
    // `IS NOT` is SQLite's NULL-safe comparison and gives the correct TRUE for a NULL column.
    return `CASE
        WHEN danh_gia_2026 IS NOT 'Không đạt' THEN NULL
        WHEN NOT (${ptcOk}) OR NOT (${nopOk}) THEN '${VIOLATION_REASON.UNKNOWN}'
        WHEN (${nopJd} - ${ptcJd}) * 24.0 > 3.0 THEN '${VIOLATION_REASON.DELAYED_CASH}'
        ELSE '${VIOLATION_REASON.OTHER}'
    END`;
}

// SQL expression for `do_tre_gio` (§6.4 C-03, §7.5): the delay concept only exists for
// 'Không đạt' rows, same scoping as violation_reason above — a Đạt/Chuyển hoàn row has "no
// concept" of delay (Design of Record §7.5), not merely a hidden real number, so it is NULL
// here too, not just at display time. NULL whenever either timestamp is missing or does not
// match the dd/MM/yyyy HH:mm:ss format — never a fabricated 0. Rounded to 2 decimal places,
// matching `F13DashboardService.js`'s existing `do_tre_gio` convention (`.toFixed(2)` on the
// equivalent JS computation).
function delayHoursSql() {
    const ptcOk = tsFormatOkSql('thoi_gian_ptc');
    const nopOk = tsFormatOkSql('thoi_gian_nop_tien');
    const ptcJd = tsJulianDaySql('thoi_gian_ptc');
    const nopJd = tsJulianDaySql('thoi_gian_nop_tien');
    return `CASE WHEN danh_gia_2026 = 'Không đạt' AND (${ptcOk}) AND (${nopOk}) THEN ROUND((${nopJd} - ${ptcJd}) * 24.0, 2) ELSE NULL END`;
}

module.exports = {
    VIOLATION_REASON,
    VIOLATION_REASON_FILTER_SLUGS,
    STATUS_GROUP,
    STATUS_PREDICATES,
    statusGroupCaseSql,
    violationReasonCaseSql,
    delayHoursSql,
};
