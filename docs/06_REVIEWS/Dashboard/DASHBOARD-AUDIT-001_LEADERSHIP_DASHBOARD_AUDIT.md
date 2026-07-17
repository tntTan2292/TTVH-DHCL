# DASHBOARD-AUDIT-001 Leadership Dashboard Audit

## 1. Review Result

- Ticket ID: `DASHBOARD-AUDIT-001`
- Ticket name: `Dashboard Widget, Chart and Visual Consistency Audit`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- Review Status: `READY FOR PO CHECK`
- PO Product Status: `READY FOR PO CHECK`
- Audit date: `2026-07-18`
- Route inspected: `/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all`
- Runtime evidence: authenticated local preview on `127.0.0.1:4174`; backend on `127.0.0.1:5050`
- Product-code changes: `None`

## 2. Scope And Evidence

This audit covers the visible Leadership Dashboard only. It does not change KPI formulas, API contracts, database schema, canonical BCVH mappings, TODAY-003 through TODAY-008 accepted behavior, or TICKET-0101 login/session behavior.

Evidence used:

- Source trace: `frontend/src/features/dashboard/DashboardPage.jsx`
- Source trace: `frontend/src/features/dashboard/components/*Adapter.jsx`
- Source trace: `frontend/src/components/f13/ExecutiveSummary.jsx`
- Source trace: `frontend/src/components/f13/QualityTimelinePanel.jsx`
- Source trace: `frontend/src/components/f13/BcvhOperationTable.jsx`
- Source trace: `frontend/src/components/f13/RuleRecommendationPanel.jsx`
- Source trace: `frontend/src/components/f13/MessageGenerationPanel.jsx`
- Source trace: `frontend/src/components/f13/TopListCard.jsx`
- API route trace: `backend/src/routes/f13Routes.js`
- Controller trace: `backend/src/controllers/DashboardController.js`, `backend/src/controllers/kpiController.js`
- Service trace: `backend/src/services/F13DashboardService.js`, `backend/src/services/timelineService.js`, `backend/src/services/ruleEngineService.js`, `backend/src/services/messageGenerationService.js`
- Governance trace: TODAY-007 and TODAY-008 completed manifests and review evidence.

Runtime observation on `2026-07-18`:

- Login reached authenticated `/f13/dashboard` using the documented local demo account.
- Visible heading inventory included `Executive Dashboard`, `Executive Header`, `Sản lượng và chất lượng phát – 30 ngày`, `So sánh cùng kỳ 7 ngày`, `Quality Timeline & Patterns`, `Executive Summary`, `Khuyến nghị Điều hành Hôm nay`, `Daily Brief & Message`, `Navigation Integration Table`, `Ranking Surface`, and `Widget Placeholder Summary`.
- Rendered chart surfaces: `5` Recharts SVG chart surfaces plus the custom heatmap grid.
- Rendered table surfaces: `1` BCVH operation table, `7` rendered body rows including total row.
- Visible placeholders: `3`.

## 3. Master Component Inventory

| Component ID | Visible title | Type | Screen position | Business question answered | Intended leadership decision | Primary metric or dimensions | Time context | BCVH/filter context | API/data source | Existing colors | Legend and labels | Related/overlap | Observed usability issue | Classification | Recommendation | Priority | Proposed ticket |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DA-001 | Executive Dashboard header | Page header/action | Top | Which dashboard context is open? | Confirm current command center and open ranking when needed. | Route title/action | URL context | All filters downstream | React only | Primary blue action | English title, Vietnamese action | Shell/filter | Subtitle still says dashboard shell and future logic. | MODIFY | Replace shell wording with operational context and selected date/BCVH. | P1 | DA-IMPL-001 |
| DA-002 | Global filters | Filter bar | Top | Which date and BCVH scope is being reviewed? | Set reporting scope before interpreting metrics. | `from_date`, `to_date`, `ma_bcvh`, search, interval badge | Selected date range | Canonical all + 6 BCVH options | `/api/f13/dashboard/meta` fields `max_date`, `bcvh_units` | Neutral, blue/green status badges | `Daily`, `Dashboard Shell` | All components | Search is disconnected from visible dashboard surfaces; interval badge is not user-selectable. | MODIFY | Keep date/BCVH; either wire or remove search; rename shell badge. | P1 | DA-IMPL-001 |
| DA-003 | KPI card: KPI | KPI card | Executive header | What is current quality rate? | Determine if whole network is on track. | `passed_rate`, `total_bg` | Selected period from KPI API | Scoped by `ma_bcvh` | `/api/f13/dashboard/kpi` fields `passed_rate`, `total_bg` | Blue/info | Count and percent shown | DA-008, DA-015, DA-021 | Duplicates Executive Summary KPI. | MERGE | Keep as top summary, reduce repeated detail below. | P1 | DA-IMPL-002 |
| DA-004 | KPI card: Đạt | KPI card | Executive header | How many passed? | Confirm good volume. | `passed_rate`, derived count | Selected period | Scoped by `ma_bcvh` | `/api/f13/dashboard/kpi` | Green | Count + percent | DA-010, DA-021 | Derived count is not returned directly by endpoint; missing/unknown status not explicit. | MODIFY | Label as derived from total and pass rate or expose unknown status separately in future authorized ticket. | P2 | DA-IMPL-002 |
| DA-005 | KPI card: Không đạt | KPI card | Executive header | How many failed? | Identify failure load. | `failed_rate`, derived count | Selected period | Scoped by `ma_bcvh` | `/api/f13/dashboard/kpi` | Red | Count + percent | DA-011, DA-021, DA-025 | Does not show missing/unknown gap between passed+failed and total. | MODIFY | Add missing/unknown explanation without changing formula. | P1 | DA-IMPL-002 |
| DA-006 | KPI card: Tỷ lệ không đạt | KPI card | Executive header | What percent failed? | Decide if failure risk is material. | `failed_rate` | Selected period | Scoped by `ma_bcvh` | `/api/f13/dashboard/kpi` | Red/neutral | `Theo contract runtime` | DA-005, DA-011 | Exact duplicate of failed-rate insight. | MERGE | Remove or fold into failed card. | P1 | DA-IMPL-002 |
| DA-007 | Sản lượng và chất lượng phát – 30 ngày | Combo bar/line chart | After KPI cards | How did volume and quality move over last 30 days? | Detect trend and target misses. | `total_volume`, `quality_rate`, `passed`, `failed`, `target_rate` | Rolling 30 days ending selected/latest `toDate` | Scoped by `ma_bcvh` | `/api/f13/dashboard/daily-trend` fields `items[]` | Teal bars, blue line, red dashed target | Clear custom legend and axes | DA-012, DA-013 | Good executive chart, but uses 90% target while legacy timeline also shows 95/90 thresholds. | KEEP | Preserve accepted TODAY behavior; align target terminology across dashboard. | P1 | DA-IMPL-003 |
| DA-008 | So sánh cùng kỳ 7 ngày | Comparison combo chart | After 30-day chart | Is current 7-day period better than previous period? | Compare current vs prior operating period. | Current/previous volume and quality | 7-day same-position comparison derived from 30-day data | Scoped by `ma_bcvh` through parent data | `/api/f13/dashboard/daily-trend` normalized by adapter | Teal/current, slate/previous, blue quality, red target | Partial legend: bars and target only; line meanings rely on chart names/tooltips | DA-007 | Legend does not fully distinguish current/previous quality lines. | MODIFY | Add complete legend for four series and target. | P1 | DA-IMPL-003 |
| DA-009 | Quality Timeline & Patterns / Quality Pulse | Alert summary | Mid-page | Is quality momentum improving or deteriorating? | Escalate if recent quality is deteriorating. | Last 3 days vs previous 3 days pulse | From 90-day timeline, displayed in current timeline panel | Scoped by `ma_bcvh` | `/api/f13/dashboard/quality-timeline` field `pulse` | Red/yellow/green/gray | English title, Vietnamese text | DA-012 through DA-015 | Valuable but buried below two charts; title English. | MOVE | Move into current exceptions/risk section near KPI summary; rename in Vietnamese. | P1 | DA-IMPL-004 |
| DA-010 | Xu hướng 30 ngày (Daily Timeline) | Line chart | Timeline panel | What is daily quality over last 30 days? | Detect day-level quality volatility. | `daily[].kpi_rate` | Last 30 days of 90-day timeline payload | Scoped by `ma_bcvh` | `/api/f13/dashboard/quality-timeline` field `daily[]` | Blue line, orange 95%, red 90% | Reference labels in English | DA-007 | Partially duplicates DA-007 quality line; conflicting target/threshold semantics. | MERGE | Merge into DA-007 or keep only if it becomes threshold-focused exception chart. | P1 | DA-IMPL-005 |
| DA-011 | Quy luật Tuần (Weekly Pattern) | Bar chart | Timeline panel | Which weekdays tend to perform worse? | Plan weekday staffing/monitoring. | `weekly[].avg_kpi` by weekday | 90-day weekday average | Scoped by `ma_bcvh` | `/api/f13/dashboard/quality-timeline` field `weekly[]` | Green/pink/yellow/red/gray | No visible legend; tooltip labels | DA-013 | Uses color thresholds 70/60/50 unrelated to 90/95 thresholds elsewhere. | MODIFY | Keep as operational pattern; add legend and clarify 90-day average. | P2 | DA-IMPL-006 |
| DA-012 | Quy luật Tháng (Monthly Pattern) | Area chart | Timeline panel | Which day-of-month positions tend to underperform? | Plan monthly control points. | `monthly[].avg_kpi` by day of month | 90-day day-of-month average | Scoped by `ma_bcvh` | `/api/f13/dashboard/quality-timeline` field `monthly[]` | Blue area only | No threshold legend despite color data existing in service | DA-011 | Executive value is less immediate; title does not say 90-day average. | MOVE | Move below ranking/detail or mark as operational pattern. | P3 | DA-IMPL-006 |
| DA-013 | Heatmap Lịch Chất Lượng (30 Ngày) | Heatmap | Timeline panel | Which dates were risky in last 30 days? | Spot clusters of bad days. | `heatmap[][]` date, KPI, DoD | Last 30 days | Scoped by `ma_bcvh` | `/api/f13/dashboard/quality-timeline` field `heatmap` | Green/pink/yellow/red/gray | Weekday labels only; no color legend | DA-010, DA-011 | Same colors mean threshold bands, but thresholds are not visible; pink is not semantically obvious. | MODIFY | Add color legend and non-color labels/patterns. | P1 | DA-IMPL-006 |
| DA-014 | Executive Summary | Metric block | Two-column section after timeline | What is the same top KPI summary with more details? | Reconfirm top-level state. | Derived KPI, total, passed, failed | Selected period | Scoped by `ma_bcvh` | Same KPI state from `/api/f13/dashboard/kpi` | Blue/slate/green/red | Vietnamese labels | DA-003 through DA-006 | Duplicates KPI cards and appears too late; DoD/CK values are hardcoded `0` by adapter. | MERGE | Merge with top KPI summary or remove repeated cards after PO approval. | P1 | DA-IMPL-002 |
| DA-015 | Khuyến nghị Điều hành Hôm Nay | Recommendation list | Beside Executive Summary | Which BCVH needs immediate action? | Assign operational follow-up. | Recommendation priority, condition, impact, action | Selected `fromDate` to `toDate`; internal last 7-day average | Not scoped by selected `ma_bcvh` in current adapter | `/api/f13/recommendations` fields `priority`, `level`, `category`, `ten_bcvh`, `condition`, `impact`, `action` | Red/orange/blue/gray | Priority badges | DA-009, DA-020, DA-025 | Not BCVH-scoped despite global filter; hidden if no recommendations; endpoint is outside `/dashboard/*`. | MODIFY | Clarify aggregate scope or pass BCVH filter in a future authorized API ticket; show empty state. | P1 | DA-IMPL-007 |
| DA-016 | Daily Brief & Message section header | Section header | Before brief/message | Groups narrative outputs. | Orient reader to generated text. | N/A | Selected date context | Aggregate/partial, depending child | React only | Neutral | English title | DA-017, DA-018 | Subtitle says surfaces are minimal shell. | MODIFY | Replace placeholder wording with business wording. | P2 | DA-IMPL-001 |
| DA-017 | Bản Tin Điều Hành Nhanh | Narrative brief | Lower page | What is the quick operating summary? | Send immediate guidance. | KPI, pass/fail counts, target status | Selected period via KPI state | Scoped by `ma_bcvh` for KPI only | KPI state from `/api/f13/dashboard/kpi` | Blue/red text | Bullets | DA-018 | Uses fixed 95 target and fake `rank: 0`; DoD is hardcoded `0`, producing misleading `ĐI NGANG 0%`. | MODIFY | Remove rank/DoD claims unless backed by endpoint fields; align target term. | P1 | DA-IMPL-008 |
| DA-018 | Xuất Thông Báo Nhanh (Message Generation) | Message textarea/tabs | Lower page | What templated message can be copied? | Prepare communication to leaders/BCVH. | Generated `dieu_hanh`, `bao_cao` text | `toDate`; compares yesterday and same weekday | Aggregate only; no selected BCVH parameter | `/api/f13/dashboard/message` fields `dieu_hanh`, `bao_cao` | Blue tabs, green copied state | Tabs and copy action | DA-017, DA-020 | Very long text appears before operational table; aggregate scope not labeled. | MOVE | Move to final recommendation/follow-up section and label aggregate date scope. | P2 | DA-IMPL-009 |
| DA-019 | Navigation Integration Table | Section header | Before top lists | Introduces top-list navigation. | Decide where to drill into ranking. | N/A | Selected date range | Aggregate canonical units | React only | Neutral | English shell wording | DA-020, DA-021 | Title is technical, not business-facing. | MODIFY | Rename to `BCVH nổi bật và cần cải thiện`. | P1 | DA-IMPL-001 |
| DA-020 | Top 2 BCVH tốt nhất | Ranking card | Before operation table | Which units are best performers? | Recognize/learn from strong units. | Top 2 by KPI rate | Selected range | Hardcoded canonical units; not filtered by selected BCVH | `/api/f13/dashboard/top` field `best[]` | Emerald badges | Rank and percent | DA-021 | Duplicates operation table ranking but gives executive shortcut. | KEEP | Preserve as executive exception/ranking summary; add scope label. | P2 | DA-IMPL-010 |
| DA-021 | Top 2 BCVH cần cải thiện | Ranking card | Before operation table | Which units need improvement? | Prioritize intervention. | Bottom 2 by KPI rate | Selected range | Hardcoded canonical units; not filtered by selected BCVH | `/api/f13/dashboard/top` field `lowest[]` | Red/orange badges | Rank and percent | DA-015, DA-025 | Overlaps recommendation and table; still useful as quick exception list. | KEEP | Keep near exception section; add link behavior hint and scope label. | P1 | DA-IMPL-010 |
| DA-022 | Ranking Surface header | Section header | Before table | Introduces BCVH table. | Orient to operational detail. | N/A | Selected range | Global filter visible | React only | Neutral | English technical title | DA-023 | Could be more business-facing. | MODIFY | Rename to `Chi tiết điều hành BCVH`. | P2 | DA-IMPL-001 |
| DA-023 | Bảng Điều Hành BCVH (Operation Table) | Operational table | Lower page | How is each BCVH performing and trending? | Drill into unit-level action. | `sl_bg_ptc`, `sl_ptc_nop_tien`, `dat_kpi_2026`, `khong_dat_kpi_2026`, `kpi_2026`, `kpi_2026_dod`, `kpi_2026_swc` | Controller accepts range but service ranks by `toDate`; DoD and SWC from `toDate-1`, `toDate-7` | Adapter passes `maBcvh` but legacy component does not send it | `/api/f13/ranking/bcvh` fields `data[]`, `meta.total_row` | Blue total row; green/pink/yellow/red statuses; red risk rows | Footer status counts | DA-020, DA-021 | Time context differs from selected range expectation; BCVH filter not applied; status thresholds 70/60/50 conflict with 90/95. | MODIFY | Keep table but clarify `toDate` basis, add filter behavior decision, align status legend. | P1 | DA-IMPL-011 |
| DA-024 | Operation table expanded row recommendation | Inline detail | Inside table row expansion | What should this BCVH do? | Take row-specific action. | Status, target 95%, pass/total, DoD/SWC, generated text | `toDate` row context | Row BCVH | Derived in frontend from table row | Red/gray | Inline labels | DA-015 | Recommendation text is frontend-derived and threshold-based, not same as rule engine. | MODIFY | Label as table guidance or consolidate with rule-engine recommendation after PO decision. | P2 | DA-IMPL-011 |
| DA-025 | Operation table footer legend | Legend/counts | Bottom of table | How many units are in each status band? | Assess spread of BCVH risk. | Counts by XANH/HỒNG/VÀNG/ĐỎ | Current table data | Current table data | Frontend computed from table rows | Red/yellow/pink/green | Icons and counts | DA-011, DA-013 | No threshold definitions visible; colors conflict with target colors. | MODIFY | Add threshold definitions and semantic color standard. | P1 | DA-IMPL-006 |
| DA-026 | Widget Placeholder 1 | Placeholder card | Bottom | None. | None. | Static text | None | None | React only | Neutral | `Executive first view` | DA-001 | Placeholder remains visible on PO-facing dashboard. | REMOVE | Remove or replace only after PO approves target structure. | P1 | DA-IMPL-012 |
| DA-027 | Widget Placeholder 2 | Placeholder card | Bottom | None. | None. | Static text | None | None | React only | Neutral | `Recommendation surface` | DA-015 | Placeholder remains visible. | REMOVE | Remove or replace only after PO approves target structure. | P1 | DA-IMPL-012 |
| DA-028 | Widget Placeholder 3 | Placeholder card | Bottom | None. | None. | Static text | None | None | React only | Neutral | `Message / integration surface` | DA-018 | Placeholder remains visible. | REMOVE | Remove or replace only after PO approves target structure. | P1 | DA-IMPL-012 |

Inventory count: `28` visible Dashboard components/surfaces.

## 4. Business-Meaning Audit

The Dashboard currently answers four valid leadership questions:

1. Current performance: KPI, pass/fail counts, selected date and BCVH context.
2. Trend/comparison: 30-day trend and 7-day current-vs-previous comparison.
3. Exceptions: quality pulse, bottom BCVH, rule recommendations.
4. Operational detail and follow-up: BCVH table, generated messages, detailed row guidance.

The problem is not lack of data; it is mixed hierarchy and repeated meanings. KPI, pass/fail counts, failed rate, Executive Summary, Daily Brief, message text, Top 2 cards, and operation table all describe overlapping slices of the same quality story. This is acceptable only if the layout makes their decision role explicit: summary first, exception next, trend next, detail later, message last.

Executive-level useful components:

- DA-002 filters
- DA-003 through DA-006 KPI cards after merge/simplification
- DA-007 30-day combo trend
- DA-008 7-day comparison
- DA-009 quality pulse
- DA-015 recommendations
- DA-020 and DA-021 top/bottom BCVH cards

Operational-level useful components:

- DA-010 through DA-013 timeline/pattern surfaces
- DA-023 operation table
- DA-024 expanded row recommendation
- DA-018 message generation

Low or no product value in current form:

- DA-026 through DA-028 placeholders
- Shell/technical section headings DA-016, DA-019, DA-022 until renamed

## 5. Overlap And Redundancy Analysis

| Overlap ID | Components involved | Duplicated meaning | Difference | Recommendation | Risk |
| --- | --- | --- | --- | --- | --- |
| OV-001 | DA-003 to DA-006 and DA-014 | Same KPI, total, passed, failed, failed rate | Executive Summary adds detail rows, but several values are hardcoded zero | Merge into one executive summary area; remove repeated lower summary or convert it to exception explanation | PO may prefer current redundancy for reassurance |
| OV-002 | DA-005 and DA-006 | Failed count/rate | DA-006 only repeats rate | Remove DA-006 or fold into DA-005 | Low |
| OV-003 | DA-007 and DA-010 | 30-day quality line | DA-007 adds volume and target; DA-010 adds 95/90 threshold labels | Preserve DA-007; convert DA-010 into threshold/exceptions only or remove after PO approval | Medium because TODAY-006 preserved timeline surfaces |
| OV-004 | DA-011, DA-012, DA-013 | Pattern surfaces from same 90-day timeline payload | Different dimensions: weekday, day-of-month, calendar date | Keep separate but move lower and add legends/time labels | Low |
| OV-005 | DA-015, DA-017, DA-018, DA-024 | Recommendations/action language | Different generators: rule engine, static frontend brief, backend template, table heuristic | Define source hierarchy: rule engine for recommendations, message engine for communication, table text for row detail only | Medium because wording may be PO-sensitive |
| OV-006 | DA-020/DA-021 and DA-023 | BCVH ranking | Cards summarize top/bottom; table gives full operational detail | Keep cards as executive shortcuts; keep table lower | Low |
| OV-007 | DA-009 and DA-010/DA-013 | Recent quality deterioration | Pulse summarizes; charts show history | Move pulse near top exception section; keep charts for evidence | Low |

## 6. Visual Hierarchy And Layout Audit

Observed top-to-bottom sequence:

1. Header and filters
2. Executive Header section
3. KPI cards
4. 30-day trend
5. 7-day comparison
6. Full timeline/pattern block
7. Executive Summary plus recommendations
8. Daily brief and message generation
9. Navigation Integration Table / Top 2 cards
10. Ranking Surface / operation table
11. Widget placeholders

Major findings:

- High-priority exceptions are not visible early enough. Quality Pulse, recommendations, and bottom BCVH appear after charts or mid-page.
- Summary is duplicated and split. KPI cards appear high, but Executive Summary appears after the timeline block.
- Operational detail appears after message generation, even though message text should be a follow-up output after understanding exceptions and ranking.
- Shell wording remains visible: `Dashboard Shell`, `Executive Header`, `Navigation Integration Table`, `Widget Placeholder Summary`.
- Vertical scrolling is heavy because the timeline block contains four large surfaces before the exception/recommendation layer.
- Related components are separated: Top 2 cards and operation table belong together, but recommendations appear far above them.

Recommended target hierarchy:

1. Context and filters
2. Executive summary
3. Current exceptions and risks
4. Trend and period comparison
5. BCVH comparison and ranking
6. Operational detail and patterns
7. Recommendation, message generation, and follow-up

Alternative considered: keep trend charts before risks because TODAY-007 accepted the current layout. Rejected for target proposal because leadership first needs to know whether action is required; trend evidence should support the exception, not delay it.

## 7. Semantic Color Audit And Proposal

Current color meanings observed:

- Blue: primary action, KPI line, Executive KPI card, total progress, current quality, neutral information.
- Teal: volume bars.
- Green: passed, positive trend, best ranking, status XANH, success copy state.
- Red: failed, target line, critical threshold, recommendation danger, bottom ranking, negative trend, status ĐỎ.
- Orange/yellow: warning, 95% threshold, VÀNG.
- Pink: HỒNG status and intermediate heatmap/timeline band.
- Gray/slate: previous period, no data, neutral surfaces, disabled/missing.

Inconsistencies:

- Red means failed volume, target/reference line, critical issue, low ranking, and negative trend.
- Blue means KPI, quality line, current period quality, neutral status, and primary UI.
- Green means passed volume, positive trend, and status XANH where XANH threshold is only `>=70`, not necessarily target pass.
- Pink has no clear business meaning for leadership unless threshold definitions are visible.
- Timeline uses 70/60/50 status bands while combo chart uses 90 target and daily timeline uses 95/90 thresholds.

Proposed semantic system:

| Meaning | Color | Additional encoding |
| --- | --- | --- |
| Total volume | Teal `#0f766e` | Bar shape, axis label `Sản lượng` |
| Passed | Green `#16a34a` | Check icon and `Đạt` label |
| Failed | Red `#dc2626` | X icon and `Không đạt` label |
| Missing/unknown | Gray `#9ca3af` | Dashed outline or `Chưa rõ trạng thái` label |
| Warning | Amber `#d97706` | Warning icon, never used for target line |
| Critical issue | Red `#b91c1c` | Alert icon, `Critical/P1` label |
| Positive improvement | Green `#15803d` | Up arrow and signed delta |
| Negative deterioration | Red `#b91c1c` | Down arrow and signed delta |
| Selected BCVH | Blue `#174ea6` | Selected pill/outline |
| Comparison period | Slate `#64748b` | Dashed line or muted bar |
| Target/reference line | Violet `#7c3aed` or black dashed | Dashed line plus direct label; do not reuse failed red |
| Neutral information | Slate `#475569` | Text/outline only |
| Disabled/unavailable | Gray `#d1d5db` | Disabled opacity and explicit unavailable text |

Legend behavior:

- Every chart with more than one metric must show a legend for all series, not only some.
- Reference/target lines must be labeled directly and shown with dashed pattern, not color alone.
- Heatmap/status charts must include threshold definitions and text labels.
- Do not rely only on color; use labels, icons, line styles, or patterns.

## 8. Label, Legend, Tooltip, And Time-Context Audit

Labels needing correction:

| Current label | Issue | Proposed wording |
| --- | --- | --- |
| `Executive Dashboard` | English while most business UI is Vietnamese | `Dashboard điều hành chất lượng F1.3` |
| `Dashboard Shell` | Technical/shell wording | `Dữ liệu runtime` or remove |
| `Executive Header` | Internal layout name | `Tổng quan điều hành` |
| Header subtitle about shell/future tickets | Misleading to PO | `Tổng quan chất lượng phát liên tỉnh theo ngày và BCVH đã chọn.` |
| `Navigation Integration Table` | Technical implementation wording | `BCVH nổi bật và cần cải thiện` |
| `Ranking Surface` | Technical wording | `Chi tiết điều hành BCVH` |
| `Widget Placeholder Summary` | Placeholder wording | Remove |
| `Widget Placeholder 1/2/3` | No business value | Remove |
| `Quality Timeline & Patterns` | English | `Diễn biến và quy luật chất lượng` |
| `Quality Pulse` | English | `Cảnh báo nhịp chất lượng` |
| `95% Threshold`, `90% Critical` | English and conflicts with `Mục tiêu 90%` elsewhere | `Ngưỡng theo dõi 95%`, `Ngưỡng cảnh báo 90%` pending PO confirmation |
| `KPI toàn mạng` | Can be false when BCVH selected | `KPI theo phạm vi lọc` |
| `Theo contract runtime` | Technical wording | `Theo dữ liệu runtime đã lọc` |
| `ĐI NGANG 0%` in Daily Brief | Adapter hardcodes DoD `0` | Remove until backed by endpoint |
| `Xếp hạng toàn quốc N/A` | Rank unavailable but stated as a fact | Remove or show `Chưa có dữ liệu xếp hạng` |
| `SHOW ALL` | English | `Hiển thị tất cả` |

Time-context issues:

- KPI endpoint uses selected `from_date` and `to_date`.
- Daily-trend chart uses rolling 30-day window built from selected/latest `toDate`, not necessarily the same `from_date`.
- Timeline panel uses 90-day data internally, but visible child charts say 30-day, weekly pattern, monthly pattern without consistently saying `90-day average`.
- Operation table accepts `fromDate` and `toDate`, but service ranks by `toDate` and computes DoD/SWC from `toDate - 1` and `toDate - 7`.
- Message generation uses `toDate` only, while filter bar shows a range.

## 9. Classification Totals

| Classification | Count | Components |
| --- | ---: | --- |
| KEEP | 3 | DA-007, DA-020, DA-021 |
| MODIFY | 15 | DA-001, DA-002, DA-004, DA-005, DA-008, DA-011, DA-013, DA-015, DA-016, DA-017, DA-019, DA-022, DA-023, DA-024, DA-025 |
| MERGE | 3 | DA-003, DA-006, DA-014 |
| MOVE | 3 | DA-009, DA-012, DA-018 |
| REMOVE | 3 | DA-026, DA-027, DA-028 |
| ADD | 4 | DA-ADD-001 Missing/unknown status card, DA-ADD-002 unified legend/threshold strip, DA-ADD-003 exception summary band, DA-ADD-004 scope/time context chip per section |

## 10. Target Dashboard Proposal

Proposed section structure:

```text
1. Context
   Date range, reporting date, BCVH selector, data freshness, dashboard scope chips

2. Executive Summary
   KPI, total volume, passed, failed, missing/unknown

3. Current Exceptions And Risks
   Quality pulse, bottom BCVH, active recommendations, critical threshold misses

4. Trend And Period Comparison
   30-day volume/quality combo, 7-day current vs previous comparison

5. BCVH Comparison And Ranking
   Top 2 best, Top 2 needs improvement, compact ranking summary

6. Operational Detail And Patterns
   BCVH operation table, weekday pattern, heatmap, monthly/day-of-month pattern

7. Recommendation And Follow-Up
   Rule recommendation detail, generated messages, copy actions
```

Text wireframe:

```text
[Dashboard title + selected date/BCVH + data freshness]
[Filters: from date | to date | BCVH]

[KPI] [Total] [Passed] [Failed] [Missing/Unknown]

[Risk pulse] [Top needs improvement] [Recommendation count/P1-P2]

[30-day volume + quality] [7-day comparison]

[Top 2 best] [Top 2 needs improvement]
[BCVH operation table]

[Weekday pattern] [Heatmap] [Monthly pattern]

[Recommendation detail]
[Message tabs + copy]
```

Before-versus-proposed mapping:

| Current area | Proposed area |
| --- | --- |
| Header + shell subtitle | Context |
| KPI cards + Executive Summary | Executive Summary merged |
| Quality Pulse | Current Exceptions And Risks |
| 30-day and 7-day charts | Trend And Period Comparison |
| Timeline daily chart | Merge with trend or threshold evidence |
| Weekly/monthly/heatmap | Operational Detail And Patterns |
| Rule recommendations | Current Exceptions and Follow-Up |
| Daily Brief and Message | Recommendation And Follow-Up |
| Top 2 cards and operation table | BCVH Comparison And Ranking / Operational Detail |
| Placeholder widgets | Remove |

Components that should not change in formula/contract:

- `/api/f13/dashboard/kpi`
- `/api/f13/dashboard/daily-trend`
- `/api/f13/dashboard/quality-timeline`
- `/api/f13/dashboard/top`
- `/api/f13/dashboard/meta`
- `/api/f13/dashboard/message`
- `/api/f13/ranking/bcvh`
- Accepted TODAY-003 through TODAY-008 chart behavior until PO approves implementation tickets.

## 11. Proposed Implementation Ticket Register

These are proposed only. They are not activated by this audit.

| Ticket ID | Objective | Components affected | Scope | Out-of-scope guard | Dependencies | PO UI check | Risk | Suggested sequence |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: |
| DA-IMPL-001 | Replace shell/technical wording with business labels | DA-001, DA-002, DA-016, DA-019, DA-022 | Text-only label and section-title cleanup | No formula/API/layout redesign | PO wording approval | Yes | Low | 1 |
| DA-IMPL-002 | Merge duplicate KPI and Executive Summary surfaces | DA-003 to DA-006, DA-014, DA-ADD-001 | Consolidate top KPI block and add missing/unknown explanation | No KPI formula change | PO approval of summary layout | Yes | Medium | 2 |
| DA-IMPL-004 | Move current exception/risk signals near top | DA-009, DA-015, DA-021, DA-ADD-003 | Reorder existing components and add empty state | No recommendation formula change | DA-IMPL-001 | Yes | Medium | 3 |
| DA-IMPL-003 | Complete legends for trend/comparison charts | DA-007, DA-008 | Add complete legends and target labels | Preserve accepted chart data behavior | Semantic color approval | Yes | Low | 4 |
| DA-IMPL-006 | Standardize status/heatmap/pattern legends | DA-011, DA-012, DA-013, DA-025 | Add threshold definitions and color legend | No threshold formula change without PO/SSOT | Semantic color approval | Yes | Medium | 5 |
| DA-IMPL-005 | Resolve duplicate 30-day quality timeline | DA-007, DA-010 | PO decision: merge, remove, or convert daily timeline to threshold evidence | Do not remove accepted chart without PO approval | DA-IMPL-003 | Yes | Medium | 6 |
| DA-IMPL-010 | Clarify Top 2 ranking scope and placement | DA-020, DA-021 | Move near exception/ranking section; add scope label | No top ranking formula change | DA-IMPL-004 | Yes | Low | 7 |
| DA-IMPL-011 | Clarify BCVH operation table context and legend | DA-023, DA-024, DA-025 | Add `toDate` basis label, Vietnamese button label, threshold legend | No API contract or canonical BCVH change | DA-IMPL-006 | Yes | Medium | 8 |
| DA-IMPL-008 | Correct Daily Brief misleading rank/DoD wording | DA-017 | Remove unsupported rank/DoD claims or source them only if already available | No new formulas or national rank rules | PO wording approval | Yes | Medium | 9 |
| DA-IMPL-009 | Move message generation to follow-up section | DA-018 | Reposition and add aggregate date-scope label | No backend template change | DA-IMPL-008 | Yes | Low | 10 |
| DA-IMPL-007 | Decide recommendation BCVH scope | DA-015 | PO/API decision: aggregate-only label vs BCVH-filtered recommendation | No API change without separate authority | PO decision required | Yes | High | 11 |
| DA-IMPL-012 | Remove placeholder widgets | DA-026 to DA-028 | Remove bottom placeholder cards after PO approves replacement/removal | No new widget implementation | PO approval | Yes | Low | 12 |

## 12. Unresolved PO Decisions

1. Should the Dashboard target be `90%`, `95%`, or both with distinct meanings?
2. Should timeline status bands stay at 70/60/50, or be aligned to 90/95?
3. Should Executive Summary remain as a separate block, or be fully merged into the top KPI area?
4. Should the 30-day daily timeline remain separate from the accepted 30-day combo chart?
5. Should recommendations respect selected BCVH, or always show aggregate province/network exceptions?
6. Should generated messages remain on the main dashboard, or move to a follow-up/message workspace?
7. Should the operation table honor the selected BCVH filter or always show all canonical units?
8. Should placeholders be removed immediately in the first implementation ticket after PO PASS?

## 13. Validation

- Complete visible component inventory: `PASS`, 28 components/surfaces inventoried.
- Source component and adapter coverage: `PASS`.
- API/data ownership trace: `PASS`.
- Runtime route inspection: `PASS`, authenticated local preview inspected.
- TODAY-003 through TODAY-008 preservation: `PASS`; recommendations are documentation-only.
- Product-code modifications: `PASS`, none made.
- KPI formula/API/database/canonical BCVH changes: `PASS`, none proposed as direct implementation in this ticket.

## 14. Final Audit Status

- Technical Status: `PASS`
- Runtime Status: `PASS`
- Review Status: `READY FOR PO CHECK`
- PO Product Status: `READY FOR PO CHECK`
- TICKET-0102: remains `INACTIVE / DEFERRED`
- PO PASS: not awarded by Codex
