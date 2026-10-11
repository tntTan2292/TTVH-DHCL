# UI-VN-LABELS-01 Manifest

Status: `IMPLEMENTED / TECH PASS / ACCEPTED BY PO FOR NOW (2026-10-11)`. Display text only: no route, path, permission, API or data change. Executor: Claude Code (Sonnet 5.5). Parallel workstream; `PROJECT_SNAPSHOT.md` Current Ticket is another ticket.

## 1. Decision (PO, chat 2026-10-11)

Module and screen names are shown in Vietnamese, close to postal business wording. Indicator code stays in front of the name. Names:

| Old | New |
|---|---|
| F1.1 Quality Management | F1.1 – Chất lượng toàn trình nội tỉnh |
| F1.2 Quality Management | F1.2 – Thu gom liên tỉnh (PO: F1.2 will be this module; a "hàng tồn" module is planned later, not part of this ticket) |
| F1.3 Quality Management | F1.3 – Chất lượng phát liên tỉnh |
| F4.1 Quality Management | F4.1 – Chất lượng phát thành công bưu cục |
| Operation Dashboard | Bảng điều hành |
| BCVH Ranking | Phân tích BCVH |
| Tuyến Ranking / Route Ranking | Phân tích tuyến phát |
| Evidence | Dữ liệu minh chứng (in running text: minh chứng) |
| System Administration | Quản trị hệ thống |
| Data Import Center | Trung tâm nạp dữ liệu |
| KPI Configuration | Cấu hình chỉ tiêu |
| System Information | Thông tin hệ thống |
| Dashboard Tổng Quan | Tổng quan điều hành |
| Breadcrumb "Home" and URL segments | Trang chủ and Vietnamese segment labels (`BREADCRUMB_LABELS`) |

"BCVH" stays (business term).

## 2. Changed

`navigation/appNavigation.jsx`, `components/Sidebar.jsx` (kept in sync, tested), `components/shared/SharedLayout.jsx` (expanded-group keys + breadcrumb), page headings (F11/F12/F13/F41 pages, KPI, System info, Dashboard home, Route ranking), error/loading/back-link texts in the ranking, route and shipment (evidence) pages, Data Import Center heading and log column, dashboard page title. Tests asserting the old display strings were updated to the new strings (appNavigation.test.js and 6 source-contract tests); no logic assertion was weakened.

## 3. Not changed / residual

Code comments and identifiers; URLs; the word "Import" inside the Data Import Center body (many labels such as "Nhật ký Import") — separate sweep if the PO wants it; `networkMap/*` (other session's uncommitted edits); backend messages.

## 4. Validation

Frontend 651/651, `oxlint` 0 errors, `vite build` clean. No browser opened.

PO checklist: sidebar group and item names; one page of each indicator (title); breadcrumb on a ranking and an evidence page; Trung tâm nạp dữ liệu heading.

## 5. System title, brand block and footer (PO, same day)

PO asked for the system title without abbreviations: sidebar brand block now reads "Bưu điện thành phố Huế" (small, orange), "Trung Tâm Vận hành", "Hệ thống Điều hành chất lượng"; collapsed badge "TT"; sidebar footer "Design by TNT" (expanded only); browser tab title "Hệ thống Điều hành chất lượng"; login page heading "Đăng nhập hệ thống" with the same sub lines and footer "Design by TNT"; Tổng quan điều hành and Trung tâm nạp dữ liệu sub lines updated. Long group names (e.g. "F4.1 – Chất lượng phát thành công bưu cục") now wrap in the 280 px sidebar instead of overflowing. Unchanged: "QIS V2 Platform" chip on the Bù dữ liệu tự động page (internal name); `components/Sidebar.jsx` (unused legacy copy, only its menu list is tested).

## 6. PO status

2026-10-11: PO checked the screens and accepted them for now; further naming ideas later. The planned "hàng tồn" module and F1.2 = Thu gom liên tỉnh content are separate tickets.
