// Vietnamese diacritic-insensitive search support (Product Owner remediation,
// 2026-08-11 — DEFECT A): a manager typing "Huong Phong" (no diacritics, e.g. from a
// keyboard/IME state that dropped them) should still find "Hương Phong". This only
// ever *widens* matching as a fallback after an exact (with-diacritics) match fails —
// it never narrows or alters matching. Route codes (mã tuyến) are plain digits with no
// diacritics, so stripping is always a no-op on them: this can never cause a code
// search to match the wrong route.
export function stripVietnameseDiacritics(text) {
  return String(text)
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// True if `query` matches any of `fields`, either exactly (substring, case-insensitive
// — this alone already covers route codes and diacritic-correct name search) or, as a
// fallback, with Vietnamese diacritics stripped from both sides.
export function matchesSearchQuery(fields, query) {
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

// fact_f13 event timestamps are stored as 'dd/MM/yyyy HH:mm:ss', which `new Date(string)`
// cannot parse (returns Invalid Date). Parse explicitly instead.
export function parseF13Timestamp(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute, second] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateDelayHours(ptc, nopTien, extendedData) {
  if (extendedData && typeof extendedData === 'object') {
    const delay = extendedData.do_tre_gio ?? extendedData.delay_hours ?? extendedData.delayHours;
    if (delay !== undefined && delay !== null && delay !== '') {
      return Number(delay);
    }
  }

  if (!ptc || !nopTien) return null;
  const ptcDate = parseF13Timestamp(ptc);
  const nopTienDate = parseF13Timestamp(nopTien);
  if (!ptcDate || !nopTienDate) return null;
  return Number(((nopTienDate - ptcDate) / (1000 * 60 * 60)).toFixed(1));
}

// Phase 2 search-result-presentation contract (Product Owner finding, 2026-08-12,
// locked into Phase 2 scope — F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section
// 14; AC-16/AC-17/AC-18/AC-22).

// AC-16: the exact required summary line. `routeCount` must be computed over real
// `ma_tuyen` values (see groupRowsByRoute below), never over display-name text.
export function formatSearchResultSummary({ count = 0, routeCount = 0, keyword = '' }) {
  return `Tìm thấy ${count.toLocaleString('vi-VN')} bưu gửi thuộc ${routeCount.toLocaleString('vi-VN')} tuyến cho '${keyword}'.`;
}

// AC-17/AC-18/AC-22: group rows by their real route identity (ma_tuyen), never by the
// displayed route-name text alone — two differently-coded routes must never merge into
// one group even if their display names are identical or similar, and every route with
// a matching/near-matching name must appear as its own group (this is automatic here:
// every row already survived the keyword filter before grouping, so every route that
// row belongs to is included — there is no "first match only" truncation).
// Rows with no route identity at all (should not occur for canonical data) fall into a
// single explicit group rather than being silently dropped or merged into an unrelated
// route.
export function groupRowsByRoute(rows = []) {
  const groups = new Map();

  rows.forEach((row) => {
    const key = row.routeId || `__no-route__:${row.routeName || 'N/A'}`;
    if (!groups.has(key)) {
      groups.set(key, {
        routeId: row.routeId || '',
        routeName: row.routeName || 'N/A',
        rows: [],
      });
    }
    groups.get(key).rows.push(row);
  });

  return Array.from(groups.values())
    .map((group) => ({ ...group, count: group.rows.length }))
    .sort((a, b) => a.routeName.localeCompare(b.routeName, 'vi-VN') || String(a.routeId).localeCompare(String(b.routeId)));
}

// F13-ROUTE-EVIDENCE-STATUS-02 Phase I1 integration-defect fix (2026-09-07): the URL's
// `reason` param must default to 'all', never to a specific violation-reason group. Extracted
// as a pure function (rather than an inline `|| DEFAULT_REASON` fallback) so the "no reason
// param present" case is directly unit-testable without a full component render.
export function resolveReasonParam(rawReason) {
  return rawReason || 'all';
}

// Real defect found during Phase I1 real-data integration validation: the previous
// `handleStatusChange` only reset `reason` to 'all' when the PRIOR `reasonParam` was already
// falsy/'all' — but a URL that had picked up `reason=delayed_cash` from any earlier point (the
// Route Ranking drill-down link's own default, or a prior reason-tab click) left that value
// untouched on every subsequent status-card click, so re-entering `status=failed` silently
// narrowed to "Chậm nộp tiền" instead of the full "Không đạt" population — visibly
// inconsistent with the status card's own displayed count. This function makes the outcome of
// a status-card click deterministic, independent of whatever `reason` happened to be
// beforehand: entering `failed` always shows every reason group; leaving it always clears the
// (now-irrelevant) reason filter.
export function resolveStatusChangeReasonPatch(nextStatus) {
  return nextStatus === 'failed' ? 'all' : '';
}

// Status and Period options for F13-ROUTE-EVIDENCE-STATUS-02
export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'passed', label: 'Đạt' },
  { value: 'failed', label: 'Không đạt' },
  { value: 'returned', label: 'Chuyển hoàn' },
];

export const PERIOD_FILTER_OPTIONS = [
  { value: 'day', label: 'Ngày' },
  { value: 'month_to_anchor', label: 'Kỳ tháng đến ngày neo' },
];

// I1 integration-defect fix (2026-09-07): the empty-state title for "this route has no rows"
// used to hardcode "không có bưu gửi vi phạm" (violation-only wording, inherited unchanged
// from before PO-A/PO-C added Đạt/Chuyển hoàn to Evidence). Confirmed live against real data:
// selecting a route with 0 "Đạt" shipments and viewing status=Đạt still showed "không có bưu
// gửi vi phạm" — misleading, since a 0-count Đạt result is not about violations at all. This
// resolves the status-appropriate noun phrase so the title matches whichever status the
// manager actually selected.
export function resolveEmptyStateStatusLabel(status) {
  switch (status) {
    case 'passed': return 'bưu gửi Đạt';
    case 'failed': return 'bưu gửi vi phạm';
    case 'returned': return 'bưu gửi Chuyển hoàn';
    default: return 'bưu gửi';
  }
}

// F13-ROUTE-EVIDENCE-STATUS-02 ITR-EV-BLOCK-01 remediation (Independent Technical Review,
// 2026-09-07). Maps one `GET /f13/evidence` row into the shape the table/detail components
// consume. Extracted as a standalone pure function so both the main page fetch AND a
// per-route expand fetch (§7.6/D-OPEN-03) produce byte-identical row shapes from the same
// API response shape, instead of two hand-maintained copies of the same mapping drifting
// apart over time.
export function mapEvidenceApiRow(item, { bcvhId, bcvhName, routeIdParam, routeName, analysisDate } = {}) {
  const shipmentKey = item.ma_bg || item.id || item.shipment_id || 'N/A';
  const statusLabel = item.danh_gia_2026
    || (item.status_group === 'passed' ? 'Đạt' : item.status_group === 'returned' ? 'Chuyển hoàn' : 'Không đạt');
  const delayHours = item.do_tre_gio ?? null;

  return {
    id: shipmentKey,
    shipmentId: shipmentKey,
    shipmentName: item.ten_bg || shipmentKey,
    bcvhId: item.ma_bcvh || bcvhId,
    bcvhName: item.ten_bcvh || bcvhName,
    routeId: item.ma_tuyen || routeIdParam,
    routeName: item.ten_tuyen || routeName,
    status: statusLabel,
    statusGroup: item.status_group || (statusLabel === 'Đạt' ? 'passed' : statusLabel === 'Chuyển hoàn' ? 'returned' : 'failed'),
    violationReason: item.violation_reason || null,
    pickupTime: item.thoi_gian_ptc || null,
    handoverTime: item.thoi_gian_nop_tien || null,
    delayHours,
    delayLabel: delayHours === null || delayHours === undefined ? 'Chưa đủ dữ liệu' : `${Number(delayHours).toFixed(1)}h`,
    analysisDate: item.ngay_do_kiem || analysisDate,
    extendedData: item.extended_data || {},
  };
}

// ITR-EV-BLOCK-01 remediation. Real defect (Independent Technical Review, 2026-09-07):
// rendering search-result route groups from `groupRowsByRoute(sortedRows)` — the CURRENT
// SERVER PAGE only — meant any route whose matching rows all fell on a page the browser
// never requested was silently missing from the grouped view, even though the server's own
// `search.matched_routes` count correctly included it (measured live: BCVH 533140, keyword
// "HCC", 1,617 matched rows across 9 real routes rendered only 7 groups; keyword "Thuy", 1,000
// rows across 4 routes rendered only 2). Design of Record §7.6 / PO decision `D-OPEN-03`
// require the full matched-route list, computed server-side over the whole matched scope, to
// drive which groups exist — a page fetch only ever fills in a group's `rows`, never decides
// whether the group is shown.
//
// `matchedRouteList` is `meta.search.matched_route_list` from the API (every matched route,
// server-computed, real counts). `routeRowsByRoute` supplies rows already fetched for a route
// — from the initial page (whichever routes happen to be on it) or from an explicit per-route
// expand fetch (§7.6's "mở rộng một tuyến = một request", `D-OPEN-03`) — keyed by `ma_tuyen`,
// each entry `{ status: 'idle' | 'loading' | 'ready' | 'error', rows }`. A route with a real
// match but no fetched rows yet still appears as its own group (`rows: []`, `status` carried
// through so the caller can render a loading/error state without ever losing the group).
//
// `fallbackRows` is used only if the server omitted `matched_route_list` (should not happen
// once §6.4 ships it, but keeps this defensive rather than crashing/rendering nothing).
export function buildSearchRouteGroups({ matchedRouteList, routeRowsByRoute = {}, fallbackRows = [] }) {
  if (!Array.isArray(matchedRouteList) || !matchedRouteList.length) {
    return groupRowsByRoute(fallbackRows);
  }
  return matchedRouteList.map((route) => {
    const cached = routeRowsByRoute[route.ma_tuyen];
    return {
      routeId: route.ma_tuyen,
      routeName: route.ten_tuyen || route.ma_tuyen,
      count: route.count,
      rows: cached?.rows || [],
      status: cached?.status || 'idle',
    };
  });
}

// ITR-EV-NB-02 remediation (Independent Technical Review, 2026-09-07): "Tổng Evidence (bối
// cảnh)" must stay independent of the search keyword — it answers "how many shipments match
// the current status/reason filter", not "how many match the keyword too". Before this fix,
// `contextTotal` read `pagination.total_items`, which in the search branch of the API IS
// `matched_items` — so the two KPI cards ("bối cảnh" and "Kết quả tìm kiếm") always displayed
// the identical number whenever a keyword was active, collapsing AC-19's three-distinct-counts
// requirement to two. This derives the context figure the same way the backend's own
// `_resolveNonSearchTotalItems` does — from `status_summary`/`violation_summary`, which are
// always computed over the keyword-independent scope, search active or not.
export function resolveContextTotal({ status, reason, statusSummary = {}, violationSummary = {} }) {
  if (status === 'failed') {
    const reasonCount = {
      delayed_cash: violationSummary.delayed_cash_count,
      other: violationSummary.other_failed_count,
      unknown: violationSummary.unknown_count,
    }[reason];
    return reasonCount !== undefined ? reasonCount : (statusSummary.failed || 0);
  }
  if (status === 'passed') return statusSummary.passed || 0;
  if (status === 'returned') return statusSummary.returned || 0;
  return statusSummary.all || 0;
}
