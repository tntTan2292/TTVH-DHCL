import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./ShipmentPerformancePage.jsx', import.meta.url), 'utf8');

// Product Owner remediation (2026-08-11) — DEFECT A: Vietnamese diacritic-insensitive
// search, routed through the shared matchesSearchQuery helper rather than a raw
// .includes() check, so exact route-code search is never weakened.
test('Evidence page filters rows through matchesSearchQuery, not a raw substring check', () => {
  assert.match(source, /matchesSearchQuery/);
  assert.doesNotMatch(source, /\.some\(\(value\) => String\(value\)\.toLowerCase\(\)\.includes\(q\)\)/);
});

// DEFECT B: the empty state must distinguish keyword-no-match, route-has-no-violations,
// and whole-context-empty — never one generic message, and never an unconditional
// "chọn Tất cả tuyến" suggestion (that only made sense when a specific route was
// selected, which the old code did not check).
test('Evidence page empty state distinguishes a keyword-no-match reason from a route/context reason', () => {
  assert.match(source, /Không tìm thấy kết quả phù hợp với từ khóa/);
  assert.match(source, /không có bưu gửi vi phạm/);
  assert.match(source, /Không có Evidence trong bối cảnh này/);
});

test('Evidence page empty state no longer shows the old unconditional "Tất cả tuyến" suggestion regardless of context', () => {
  // The old, now-removed generic message text.
  assert.doesNotMatch(source, /Hãy đổi bộ lọc hoặc chọn 'Tất cả tuyến'/);
});

test('Evidence page empty state offers a real action to clear the keyword or view all routes, not just text', () => {
  assert.match(source, /handleClearSearch/);
  assert.match(source, /handleViewAllRoutes/);
  assert.match(source, /Xóa từ khóa/);
  assert.match(source, /Xem Tất cả tuyến/);
});

// The empty-state branch selection itself must check the keyword first (priority per
// Product Owner instruction: "Có keyword thì empty state phải ưu tiên giải thích do
// keyword"), then the specific-route case, then fall through to the whole-context case.
test('Evidence page empty state prioritizes the keyword reason before the route/context reason', () => {
  const keywordBranchIndex = source.indexOf("if (search.trim())");
  const routeBranchIndex = source.indexOf('if (routeIdParam)');
  assert.ok(keywordBranchIndex !== -1, 'keyword branch must exist');
  assert.ok(routeBranchIndex !== -1, 'route branch must exist');
  assert.ok(keywordBranchIndex < routeBranchIndex, 'the keyword branch must be checked before the route branch');
});
