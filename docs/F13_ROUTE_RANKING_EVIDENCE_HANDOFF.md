# F13 Route Ranking — Evidence Handoff for Claude Code–Opus
**Ticket:** `F13-ROUTE-RANKING-REDESIGN-PLAN`  
**Stage:** Visual / Runtime Discovery → Design Handoff  
**Inspector:** Antigravity–Gemini (Static Code Inspection Only)  
**Date:** 2026-08-03  
**Runtime evidence:** NONE — browser subagent RESOURCE_EXHAUSTED. All findings are static-code-derived unless noted.

---

## 1. Inspection Method & Confidence

| Category | Method | Confidence |
|---|---|---|
| Layout structure | JSX source analysis | HIGH — code is ground truth |
| Widget hierarchy | JSX source analysis | HIGH |
| Filter/sort contract | JS module + JSX | HIGH |
| Data fields (columns) | JSX table + API client | HIGH |
| Visual appearance, colors | CSS class names in JSX | MEDIUM — no runtime render |
| Loading/error/empty states | JSX conditional branches | HIGH for existence, LOW for visual quality |
| Responsive breakpoints | Tailwind class names in JSX | MEDIUM |
| Postman/BCVH display per route | JSX field mapping | HIGH for structure, NOT for UX readability |
| Priority/alert visual system | JSX — partially hardcoded | HIGH for gap identification |

---

## 2. Files Inspected

| File | Role |
|---|---|
| [`RoutePerformancePage.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RoutePerformancePage.jsx) | Main orchestrator — 312 lines |
| [`routeRankingFilters.js`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/routeRankingFilters.js) | Filter contract |
| [`RouteExecutiveBrief.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteExecutiveBrief.jsx) | Executive summary widget |
| [`RoutePriorityAnalysis.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RoutePriorityAnalysis.jsx) | Priority widget |
| [`RouteRootCause.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteRootCause.jsx) | Root cause widget |
| [`RouteRecommendation.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteRecommendation.jsx) | Recommendation widget |
| [`RouteDrilldown.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteDrilldown.jsx) | Drill-down shell |
| [`RouteShellShared.jsx`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteShellShared.jsx) | Shared card shell wrapper |
| [`F13DashboardClient.js`](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/api/F13DashboardClient.js) (L64–74) | API contract |

---

## 3. Verified Structure — VERIFIED FROM CODE

### 3.1 Page Identity & Route
- **Frontend route:** `/f13/ranking/route`
- **Page title:** `"Route Performance Center"`
- **Page subtitle:** `"Route runtime view theo kiến trúc đã Freeze."` ← internal dev artifact text, NOT user-facing OM language

### 3.2 Global Filter Bar
Rendered via shared `GlobalFilterBar` component. Parameters managed via URL search params:

| Param | Default | Notes |
|---|---|---|
| `from_date` | `2026-06-23` (hardcoded fallback) | VERIFIED FROM CODE |
| `to_date` | `2026-06-23` (hardcoded fallback) | VERIFIED FROM CODE |
| `bcvh_id` | `'533140'` = BCVH Thuận Hóa | VERIFIED FROM CODE |
| `interval` | `'daily'` | Only used for label, not API |
| `search` | `''` | Client-side text filter |
| `sort` | `'passed_rate'` | API sort field |
| `order` | `'asc'` | API sort direction |
| `route_type` | `'postman'` (DEFAULT) | API param — filter contract |

BCVH dropdown options (6 options):  
`533140 Thuận Hóa` | `535470 Hương Trà` | `535790 A Lưới` | `536250 Hương Thủy` | `537015 Thuận An` | `537220 Phú Lộc`

### 3.3 Route Type Filter Tabs — VERIFIED FROM CODE (PO-CONFIRMED CONTRACT)
```
[Tuyến bưu tá] [Tất cả]
```
- Default: `Tuyến bưu tá` (`postman`)
- Both values exist in `routeRankingFilters.js` and match the PO-confirmed contract exactly
- Tabs render as `<button>` inside an inline-flex container with toggle visual (active = `primary-600` background, inactive = muted text)
- Filter is applied at API level via `route_type` param

### 3.4 KPI Summary Row — VERIFIED FROM CODE
4 KPI cards rendered as `grid md:grid-cols-2 xl:grid-cols-4`:

| Label | Value Source | Tone |
|---|---|---|
| `Route theo dõi` | `meta.pagination.total_items` or `filteredRows.length` | `primary` |
| `BCVH context` | `bcvhName` / `bcvhId` | `warning` |
| `Interval` | `intervalLabel` (daily/weekly/lũy kế) | `success` |
| `Search` | `search` param or `'N/A'` | `danger` |

> **Gap identified:** "Search" as a KPI card with tone `danger` is a debug/dev artifact. It has no operational meaning for a manager. "Interval" similarly. These two cards consume premium KPI real estate with non-executive information.

### 3.5 Ranking Table Columns — VERIFIED FROM CODE

Table renders inline in `RoutePerformancePage.jsx` (not a separate component file), `data-testid="route-ranking-table"`:

| Column | Field | Type | Note |
|---|---|---|---|
| XH (rank) | `index + 1` | Counter | No sort indicator |
| Mã tuyến | `row.code` \| `row.ma_tuyen` | mono font | |
| Tên tuyến | `row.name` \| `row.ten_tuyen` \| `row.ma_tuyen` | **Clickable button** | Triggers `onSelectRoute` |
| Tổng BG | `row.total_bg` | Numeric, localeString | |
| Đạt | `row.passed` | Numeric, `text-green-700` | |
| Không đạt | `row.failed` \| `row.total_failed` | Numeric, `text-red-600` | |
| Tỷ lệ đạt | `row.passed_rate` | `x.x%` | No color-coding based on value |
| Phân loại | `row.is_postman_delivery_route` | Badge | Green = Tuyến bưu tá / Slate = Nhận tại bưu cục |

**Critical gap — no postman field in table:** No column for bưu tá phụ trách (responsible postman name). VERIFIED FROM CODE — the field does not exist in the table columns.

**Critical gap — no sort controls in table:** Column headers (`<th>`) have no `onClick` handlers, no sort indicator arrows. Sort is applied only at URL-param level externally (sort=`passed_rate`, order=`asc` by default). Manager cannot re-sort by clicking columns.

**Critical gap — no alert/priority color on rows:** Row background is only `primary-50` (selected) or `surface-50` (hovered). No red/amber/green coloring based on `passed_rate` value or intervention urgency. A manager cannot visually distinguish a route at 40% from one at 85% without reading the number.

**Data limitation — table is capped at `visibleRows = filteredRows.slice(0, 3)`:** The API fetches up to `pageSize=1000` rows, but the table renders **only the first 3 rows** (`const visibleRows = useMemo(() => filteredRows.slice(0, 3)...`). However the table is passed `filteredRows` (full list), not `visibleRows`. So all rows render — `visibleRows` is computed but only fed to `priorityItems` for widgets. Table shows full list.

### 3.6 Widget Hierarchy Below Table — VERIFIED FROM CODE

All 5 widget blocks render in a single vertical `space-y-5` column below the table. Each has a `SectionHeader` label + the widget. Order:

```
1. GlobalFilterBar
2. KPI Row (4 cards)
3. SectionHeader "Bảng Tuyến Ranking" + RouteRankingTable (FULL data)
4. SectionHeader "Executive Brief Area" + RouteExecutiveBrief
5. SectionHeader "Priority Analysis Area" + RoutePriorityAnalysis
6. SectionHeader "Root Cause Area" + RouteRootCause
7. SectionHeader "Recommendation Area" + RouteRecommendation
8. SectionHeader "Shipment Drill-down Area" + RouteDrilldown
```

### 3.7 Widget Content State — VERIFIED FROM CODE

| Widget | Data source | Content state |
|---|---|---|
| `RouteExecutiveBrief` | `executiveContext`, `impactItems` — derived from URL params and `filteredRows.length` | Partially live: dates, bcvhName, row count |
| `RoutePriorityAnalysis` | `priorityItems` = **top 3 routes** (`visibleRows`) with name + passed_rate | Live (top 3 name + rate) but static label badges only |
| `RouteRootCause` | `rootCauseItems` = 3 text strings: row count + selected route name + a hardcoded notice | Minimal live text in shell |
| `RouteRecommendation` | `recommendationItems` = 2 items: selected route name + `"Based on runtime score X%"` text | Shell-grade text — not operational |
| `RouteDrilldown` | `drilldownContext` = 5 context strings (BCVH, route, dates, filter, sort) | Shell placeholder — EmptyState shown |

### 3.8 Page-level States — VERIFIED FROM CODE
- **Loading:** Full-page `LoadingState` replaces content — `"Đang tải dữ liệu Route runtime..."`
- **Error:** Full-page `ErrorState` with `error.message` — replaces content
- **Empty table:** Inline message `"Không có tuyến phù hợp với bộ lọc hiện tại."` in table area only — widgets still render below

### 3.9 API Call — VERIFIED FROM CODE
```
GET /f13/ranking/route?date=...&bcvh=...&page=1&page_size=1000&sort=passed_rate&order=asc&route_type=postman
```
- Fetches up to 1000 rows in one shot — no pagination UI
- Re-fetches on change of: `bcvhId`, `fromDate`, `order`, `routeType`, `sort`
- **Note:** `toDate` and `search` do NOT trigger re-fetch — `toDate` is display-only, `search` is client-side filter only

### 3.10 Responsive Grid — VERIFIED FROM CODE (CSS class inference)
- KPI row: `md:grid-cols-2 xl:grid-cols-4` → stacks on mobile
- ExecutiveBrief inner grid: `md:grid-cols-3` → stacks on small screens
- PriorityAnalysis: `xl:grid-cols-3` → 3 cards on xl, stacks below
- RootCause: `xl:grid-cols-2`
- Recommendation: `xl:grid-cols-2`
- Drilldown: `xl:grid-cols-3`
- Table: `overflow-x-auto` → scrollable on narrow viewport

---

## 4. Findings Table — UI/UX Gaps Inferred From Code

| # | Vấn đề | Evidence | Ảnh hưởng quản trị | Mức ưu tiên |
|---|---|---|---|---|
| **G1** | **Không có cột bưu tá phụ trách trong bảng** | Table JSX: 8 columns, không có postman name/code | Manager không biết ai chịu trách nhiệm tuyến mà không cần drill-down | 🔴 CAO |
| **G2** | **Không có màu cảnh báo theo hiệu suất tuyến** | Row CSS: chỉ `primary-50` (selected) / `surface-50` (hover), không có conditional color dựa trên `passed_rate` | Không thể nhận biết tuyến tốt/xấu bằng mắt — phải đọc từng số | 🔴 CAO |
| **G3** | **Không có column sort interactive** | `<th>` elements: không có onClick, không có sort indicator | Manager không thể sắp xếp lại theo ý muốn từ giao diện | 🔴 CAO |
| **G4** | **Widget Priority Analysis là shell, không phản ánh mức độ ưu tiên thật** | `RoutePriorityAnalysis`: badges "High Priority / Shell-safe / No KPI calc" hardcoded; severity grid chỉ 4 ô màu tĩnh | Mục "Priority Analysis" không có giá trị quyết định điều hành | 🔴 CAO |
| **G5** | **Widget Root Cause là shell text, không có phân tích thực** | `RouteRootCause`: content = row count + selected route name + hardcoded "No extra backend calculation" | Mục "Root Cause" không trả lời được câu hỏi nguyên nhân | 🔴 CAO |
| **G6** | **Widget Recommendation chỉ lặp lại tên tuyến đã chọn** | `recommendationItems`: `"Based on runtime score X%"` — suy từ `passed_rate`, không có nghiệp vụ | Không hỗ trợ quyết định hành động tiếp theo | 🔴 CAO |
| **G7** | **RouteDrilldown = EmptyState placeholder** | `RouteDrilldown.jsx`: `EmptyState` component, description là "...trong các ticket tiếp theo" | Toàn bộ drill-down area là placeholder rõ ràng | 🟡 TRUNG BÌNH (đã biết, blocked by design) |
| **G8** | **KPI row có 2 card debug ("Search", "Interval") chiếm vị trí ưu tiên** | `summaryStats`: card "Search" với tone `danger`, card "Interval" với tone `success` — không có ý nghĩa điều hành | Mất KPI slot cho thông tin hữu ích (số tuyến đỏ, tỷ lệ trung bình BCVH, v.v.) | 🟡 TRUNG BÌNH |
| **G9** | **Page title/subtitle là nội dung developer** | `subtitle="Route runtime view theo kiến trúc đã Freeze."`, `StatusBadge "Route Runtime"`, `"Shared Layout Ready"` | Nội dung không phù hợp với môi trường vận hành thực tế | 🟡 TRUNG BÌNH |
| **G10** | **Không có pagination UI mặc dù API hỗ trợ** | API call: `page=1, page_size=1000` cố định; không có pagination controls | Với số lượng tuyến lớn, tất cả load về client cùng lúc | 🟢 THẤP |
| **G11** | **`toDate` không trigger API re-fetch** | `useEffect` deps: `[bcvhId, fromDate, order, routeType, sort]` — thiếu `toDate` | Date range filter chưa hoàn chỉnh | 🟡 TRUNG BÌNH |
| **G12** | **Không có navigation flow từ BCVH Ranking sang Tuyến Ranking** | `RouteDrilldown`: chỉ có text navigation map, không có clickable link/button từ BCVH sang route | Luồng cross-module chưa được hỗ trợ | 🟡 TRUNG BÌNH |
| **G13** | **Widget layout: 5 widget blocks xếp dọc bên dưới bảng** | JSX render order trong `RoutePerformancePage` | Manager phải scroll rất dài để thấy insights — table và widgets không song song | 🟡 TRUNG BÌNH |
| **G14** | **Không có state "không có dữ liệu" riêng cho widget khi route không được chọn** | Widget data derives from `selectedRow` — nếu null, hiển thị "N/A" inline text | Trải nghiệm không rõ ràng khi chưa chọn tuyến | 🟢 THẤP |

---

## 5. Những gì đang hoạt động tốt — NÊN GIỮ LẠI

| Thành phần | Đánh giá |
|---|---|
| Filter contract `Tuyến bưu tá` / `Tất cả` | ✅ VERIFIED — đúng spec, đúng default, đúng API mapping |
| Inline tab group filter design (pills) | ✅ Clean toggle pattern — nên giữ cơ chế |
| `GlobalFilterBar` shared component | ✅ Nhất quán với Dashboard và BCVH Ranking |
| `overflow-x-auto` trên table | ✅ Đảm bảo table không bể layout ở viewport hẹp |
| `data-testid="route-ranking-table"` | ✅ Test-ready — nên giữ khi redesign |
| Row click `onSelectRoute` → widget context update | ✅ Pattern interactivity tốt, nên giữ và mở rộng |
| Loading / Error state separation | ✅ Có cả hai, render toàn trang — acceptable pattern |
| `normalizeRouteTypeFilter()` guard | ✅ Defensive filter normalization — nên giữ nguyên |
| BCVH dropdown với 6 options đúng | ✅ Khớp với danh sách BCVH Hue — không thay đổi |

---

## 6. Runtime Limitations / Unverified Items

| Item | Status |
|---|---|
| Màu sắc thực tế của các CSS class (design tokens `--color-*`) | NOT VISUALLY VERIFIED — phụ thuộc vào CSS variables, không biết màu cụ thể |
| Số lượng tuyến thực tế trả về từ API cho từng BCVH | NOT VISUALLY VERIFIED |
| Hành vi loading spinner (animation, duration) | NOT VISUALLY VERIFIED |
| Hành vi khi search text filter — debounce hay instant | NOT VISUALLY VERIFIED |
| Hành vi responsive thực tế trên viewport 1024px và mobile | NOT VISUALLY VERIFIED |
| Overflow/truncation của tên tuyến dài trong table cell | NOT VISUALLY VERIFIED |
| BCVH Ranking → Route Ranking navigation flow (runtime) | NOT VISUALLY VERIFIED |
| Actual render thực tế của `RouteShellCard` (icon, padding, shadow) | NOT VISUALLY VERIFIED |
| Trạng thái khi `passed_rate` = null/undefined (fallback behavior) | DESIGN INFERENCE only |

---

## 7. Định hướng UI/UX — Nguyên tắc, chưa chốt layout

> ⚠️ Đây là **design principles** để Opus dùng làm điểm khởi đầu. Không phải layout specification.

**P1 — Decision-first table redesign:**  
Bảng phải trả lời ngay được: tuyến nào cần can thiệp? Thiết kế cần thêm color-coded row (đỏ/vàng/xanh), cột bưu tá phụ trách, cột mức độ ưu tiên tính từ `passed_rate`, và column headers sortable.

**P2 — Postman visibility:**  
Bưu tá phụ trách phải hiển thị ngay trong bảng ranking (không yêu cầu drill-down để biết ai chịu trách nhiệm). Cần kiểm tra backend response có trả `postman_name` / `postman_code` không.

**P3 — Widget → Insight transformation:**  
Các widget Priority, Root Cause, Recommendation phải chứa dữ liệu nghiệp vụ tính từ runtime data, không phải shell text. Thiết kế phải xác định rõ "nguồn dữ liệu nào → widget nào" trước khi implement.

**P4 — Layout: table + widgets song song:**  
Thay vì xếp dọc, cân nhắc 2-column layout: bảng bên trái, widget context bên phải (hoặc drawer/panel). Manager có thể đọc bảng và thấy insight cùng lúc không cần scroll.

**P5 — KPI row phải mang ý nghĩa điều hành:**  
Thay "Search" và "Interval" bằng: số tuyến đang dưới ngưỡng, tỷ lệ đạt trung bình của BCVH, số tuyến cần can thiệp, v.v. — những con số manager cần nhìn trước tiên.

**P6 — Giữ nguyên filter contract:**  
`Tuyến bưu tá | Tất cả` không thay đổi. Thiết kế mới chỉ thêm visual enhancements, không thay đổi business rule.

**P7 — Drill-down = design-only scope:**  
Theo PO decision: Route → Shipment drill-down chỉ xuất hiện trong design proposal. Không implement button chức năng cho đến khi có authorization riêng.

---

## 8. Danh sách Evidence cho Opus

| Item | Loại | Đường dẫn / Ghi chú |
|---|---|---|
| Document này | Static code analysis report | `F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md` |
| `RoutePerformancePage.jsx` | Source — main orchestrator | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RoutePerformancePage.jsx) |
| `routeRankingFilters.js` | Source — filter contract | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/routeRankingFilters.js) |
| `RouteExecutiveBrief.jsx` | Source | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteExecutiveBrief.jsx) |
| `RoutePriorityAnalysis.jsx` | Source | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RoutePriorityAnalysis.jsx) |
| `RouteRootCause.jsx` | Source | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteRootCause.jsx) |
| `RouteRecommendation.jsx` | Source | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteRecommendation.jsx) |
| `RouteDrilldown.jsx` | Source | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteDrilldown.jsx) |
| `RouteShellShared.jsx` | Source | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/features/route/RouteShellShared.jsx) |
| `F13DashboardClient.js` L64–74 | API contract | [link](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/frontend/src/api/F13DashboardClient.js) |
| Runtime visual screenshots | ❌ ABSENT — RESOURCE_EXHAUSTED | PO có thể bổ sung thủ công |
| `F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` | Governance | Manifest đã đọc — không kèm lại ở đây |

---

## 9. Open Questions cho Opus / PO trước khi design

> Những câu hỏi này **bắt buộc phải có câu trả lời trước khi Opus lập design plan.** Antigravity không tự suy đoán.

| # | Câu hỏi | Ảnh hưởng |
|---|---|---|
| OQ1 | Backend response `/f13/ranking/route` có trả `postman_name` / `postman_code` không? | Quyết định xem G1 (thiếu cột bưu tá) có fix được bằng frontend-only hay cần backend change |
| OQ2 | `passed_rate` threshold để phân loại đỏ/vàng/xanh là bao nhiêu? | Quyết định logic color-coding cho G2 |
| OQ3 | Layout: 2-column (table + side panel) hay giữ single-column có accordion? | Ảnh hưởng toàn bộ page layout redesign |
| OQ4 | "Ưu tiên can thiệp" được tính từ `passed_rate` thôi hay còn thêm `total_failed`, trend, v.v.? | Quyết định logic cho P3 widget transformation |
| OQ5 | Screen size target chính: desktop 1366px hay 1920px hay cả hai? | Breakpoint design decision |

---

*Handoff completed. Opus có thể tiếp tục từ đây. Không có code change, không có commit, không có implementation ticket được tạo.*
