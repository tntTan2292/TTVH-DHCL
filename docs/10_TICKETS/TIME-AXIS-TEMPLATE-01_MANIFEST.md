# TIME-AXIS-TEMPLATE-01 Manifest

## 1. Ticket Information

- Ticket ID: `TIME-AXIS-TEMPLATE-01`
- Ticket Name: `Theo ngày / Theo tuần / Theo tháng of F1.1, F1.2, F4.1, F4.2 on the F1.3 template`
- Owner: `Claude Code`, on PO request in chat 2026-11-03
- Governance Version: `V2 Active`
- Branch: `codex/da-impl-006`
- Does not change Current Ticket. Follows `F13-V2-STRUCTURE-01`.

## 2. Scope (PO 2026-11-03)

In: the three time pages for the four indicators. Out: any Chuyên đề of these indicators. Each is calculated differently, so the PO explains it first. The old pages of each indicator stay until the PO accepts its new pages.

## 3. Delivered

- The F1.3 pages are now a template: `frontend/src/features/f13v2/F13V2{Day,Week,Month}Page.jsx` read the indicator from `IndicatorProvider`. Routes `/f11|f12|f41|f42/v2/{ngay,tuan,thang}`. F1.3 itself: same blocks, its active tab now uses its theme colour.
- Backend: `/api/<indicator>/v2/{layout,period/resolve,day/summary}` from `backend/src/routes/timeAxisRoutes.js`; block lists per indicator in `services/f13v2/blockRegistry.js`; range table `F41RankingService.compareSamePeriod` (same same-period rule as F1.3). No existing endpoint changed, no schema change.
- **PO accepted all four on 2026-11-03.** Open to every account allowed that indicator. PO, same day: the three pages are one module, so the menu has one item per indicator, **Kết quả chất lượng**, and Theo ngày / tuần / tháng are the tabs at the top of the page (F1.3 as well; its Chuyên đề items stay below). The item stays lit on all three tabs. Old links: `/<indicator>/dashboard` goes to Theo ngày, `/<indicator>/ranking/bcvh` to Theo tuần, keeping the unit and any date range.

| Page | All four | F1.1 | F1.2 | F4.2 |
| --- | --- | --- | --- | --- |
| Theo ngày | Tổng quan, Bảng tổng hợp (city accounts), Bảng so sánh khoảng ngày (2 days or more), Xu hướng | Bảng bưu cục chấp nhận × BCVH phát | | Sáu BCVH trong ngày, Bảng bưu tá |
| Theo tuần | So sánh theo tuần, Diễn biến theo tuần | Same matrix, on the page's week | | Bảng bưu tá, on the page's week |
| Theo tháng | So sánh theo tháng, Xu hướng + heatmap tháng | Same matrix, on the page's month | Khối lũy kế | Bảng bưu tá, on the page's month |

## 4. Validation

- Backend: `timeAxisRoutes.test.js`, `compareSamePeriod.test.js`, plus the F1.3 module tests. Frontend suite and build.
- Real data, read only, range 01-15/10/2026 against 01-15/09/2026: every unit of `compareSamePeriod` equals the indicator's existing `getBcvhRanking` for both periods, 0 mismatches (F4.1 79,492 / 61.7 %, F1.1 20,991 / 86.5 %, F1.2 18,091 / 90 % over 38 units, F4.2 94,147 / 79.5 %).
- Browser on an isolated stack (admin, leader, BCVH account, sample data): all 12 pages open with no page error and no 5xx.

## 5. Known points for the PO check

- PO 2026-11-03: the F1.1 matrix belongs on all three pages. It and the F4.2 postman blocks follow the page's period there and hide their own period controls; on Theo ngày a range uses the whole range. Their old Bảng điều hành behaviour is unchanged.
- A BCVH-mode account has no own-row day table on these indicators (only F1.3 has one): as on their old Bảng điều hành it has no day table, and it gets the range table for 2 days or more.
- The range table of F4.1 shows the main rate only, not "Không đo TMS".
- F1.2: the long title of the month comparison table runs under the camera button (same block as the old page).

## 6. Status

`CLOSED / PO UI PASS (2026-11-03)`.

Residual: the old page components (`F1xDashboardPage`, `F1xBcvhRankingPage`, `F4xDashboardPage`, `F4xBcvhRankingPage`, `features/dashboard/DashboardPage.jsx`) are no longer routed but stay in the repository because their blocks and tests still read them; they can be removed in a clean-up ticket. These blocks of the old analysis page have no place on the new pages: the day ranking table with ranks and the F1.2 accepting-office ranking table (`/f12/ranking/offices`; the offices remain in the Theo ngày table).
