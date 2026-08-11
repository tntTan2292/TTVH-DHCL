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

// The backend's GET /f13/evidence-list already implements real, correct server-side
// pagination (total_items/total_pages computed over the full filtered set, independent
// of the page returned) — the previous "1000 rows in one request" Evidence bug was purely
// a frontend defect: it never requested a second page. This helper walks every backend
// page for the current filter and concatenates the results, so search/sort/counts always
// operate on the complete matching set, never a silently-truncated first slice.
//
// `fetchPage(page, pageSize)` must return `{ data, meta }` matching the evidence-list
// contract (meta.pagination.total_pages). A bounded `maxPages` ceiling protects against a
// runaway loop if the backend ever reports an incorrect total_pages; hitting the ceiling
// is reported via `truncated: true` rather than silently dropping the remaining rows.
export const EVIDENCE_FETCH_PAGE_SIZE = 200;
export const EVIDENCE_FETCH_MAX_PAGES = 100; // safety ceiling: 100 * 200 = 20,000 rows

export async function fetchAllEvidenceRows(fetchPage, options = {}) {
  const pageSize = options.pageSize || EVIDENCE_FETCH_PAGE_SIZE;
  const maxPages = options.maxPages || EVIDENCE_FETCH_MAX_PAGES;

  let rows = [];
  let meta = null;

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page, pageSize);
    const pageRows = Array.isArray(result?.data) ? result.data : [];
    rows = rows.concat(pageRows);
    meta = result?.meta || meta;

    const totalPages = meta?.pagination?.total_pages;
    const hasMore = typeof totalPages === 'number' ? page < totalPages : pageRows.length === pageSize;
    if (!hasMore) {
      return { rows, meta, truncated: false };
    }
  }

  // Reached maxPages while more data still remained — report it instead of silently
  // dropping rows past the ceiling.
  return { rows, meta, truncated: true };
}
