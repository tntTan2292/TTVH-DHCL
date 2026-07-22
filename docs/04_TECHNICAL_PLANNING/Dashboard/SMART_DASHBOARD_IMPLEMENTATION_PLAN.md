# Smart Dashboard Implementation Plan

## 1. Authority

- Status: `COMPLETED / PO PASS`
- Authority: Product Owner `PO PASS` on `2026-07-18`
- Source ticket: [docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md)
- Related register: [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- Closure Date: `2026-07-22`

The approved target is the consolidated smart Dashboard. The previous high-density multi-widget concept is rejected as insufficiently optimized. Implementation must merge overlapping charts and widgets into fewer complete decision surfaces.

No Dashboard product code was changed under `DASHBOARD-AUDIT-001`.

## 2. Approved Reading Sequence

1. Context and filters
2. Unified Command Summary
3. Unified BCVH Analysis Table
4. Integrated Trend and Comparison
5. Operating Patterns
6. Unified Action Center

The Dashboard must answer these questions in order:

1. What is the current situation? (Surface A - Unified Command Summary)
2. Which BCVH requires attention? (Surface C - Unified BCVH Analysis Table)
3. Is performance improving or deteriorating? What is the current trend/comparison? (Surface B - Integrated Trend and Comparison)
4. Is there a recurring pattern? (Surface D - Operating Patterns)
5. What immediate action should be taken? (Surface E - Unified Action Center)

## 3. Approved Decision Surfaces

### Surface A - Command Summary

Content:

- date range
- canonical BCVH filter
- total volume
- pass rate
- failed rate
- missing/unknown rate
- one concise generated executive insight

Rules:

- one KPI story only
- no second Executive Summary
- no ranking KPI card
- no repeated pass/fail cards elsewhere
- insight text must be grounded in approved runtime values
- do not invent causal explanations

### Surface B - Integrated Trend and Comparison

Left side / Chart Area:

- one primary chart called `Xu huong dieu hanh tong hop`
- modes or tabs: `30 ngay` (30 days), `7 ngay so sanh` (7 days comparison), `Theo BCVH` (by BCVH)
- volume bars
- pass-rate line
- target/reference line
- below-threshold and abnormal-day markers
- complete legend and tooltip

Right side / Risk Panel:

- `Ngoai le & Rui ro chinh` (Exceptions & Main Risks) panel
- highest-priority warnings (up to 3 prioritized risks, removing descriptions)
- affected units
- observed evidence
- severity

Rules:

- replace separate 30-day, 7-day, legacy timeline, and Quality Pulse storytelling with one coordinated decision area
- do not display multiple charts that answer substantially the same trend question
- use `Tỷ lệ đạt` as the only primary quality-rate story; `Không đạt` and `Chuyển hoàn` are supporting composition/evidence only
- show D-1 and D-7 leadership comparison simultaneously, limited to `Tỷ lệ đạt` and `Sản lượng`, visually prioritizing "Hôm nay" as the primary value (larger, bolder, main text color), while the comparison reference (Hôm qua/Cùng kỳ) is smaller, muted, and delta values are placed next to the reference values
- Risk Panel is hidden in `30 ngày` (30-days / monthly trend) mode to expand the workspace full width, and is displayed only in `7 ngày so sánh` or `Theo BCVH` modes. There is no fixed requirement that the right-side risk panel must always be visible.
- causal explanations must only come from approved data sources
- unsupported causes must be labeled as unknown or awaiting confirmation

### Surface C - BCVH Analysis

Use one unified analytical table, placed directly below the Command Summary:

- BCVH (Total row + exactly 06 canonical BCVH units from existing SSOT)
- volume
- pass
- fail
- missing/unknown
- comparison with prior period
- compact trend
- warning level
- action/detail entry point

Rules:

- replace redundant ranking and comparison widgets
- allow sorting and scoped drill-down where already authorized
- ranking must be grounded in current values
- visual status must follow the semantic color system
- do not create new BCVH mapping rules; no new BCVH mapping rule was introduced during assembly

### Surface D - Operating Patterns

Use one card with tabs:

- `Theo thu`
- `Theo thang`
- `Heatmap`

Rules:

- show only one pattern visualization at a time
- include a concise, data-grounded insight
- provide a clear threshold legend (separating legends and explanatory notes, wrapping legends horizontally, and positioning notes on a separate line below the legend to prevent overlapping)
- do not render three separate pattern charts simultaneously
- preserve current calculation contracts unless separately authorized
- Heatmap responsive follow-up, month blocks adapting to viewport width, legend/note overlap fixes, and 100% desktop zoom usability were completed, absorbed, and accepted within `DA-IMPL-007`.

### Surface E - Action Center

Merge:

- recommendations
- row-level guidance
- follow-up information

Target structure:

- priority
- issue
- unit
- recommended action
- status
- follow-up entry point

Rules:

- Dashboard only retains Top 3 prioritized actions.
- Message generation, Daily Brief drafts, and advanced message management are not part of the Dashboard; future message management and drafting belong to a separately governed `BCVH Ranking` module ticket. Do not leave message generation as a current Dashboard target.
- each issue appears once
- do not show multiple widgets repeating the same recommendation
- distinguish system recommendation, confirmed cause, and human follow-up
- no invented owner, cause, deadline, or status (removing evidence, cause, owner, and confidence level fields from the dashboard display to maintain simplicity)
- missing values must remain visibly unknown

## 4. Semantic Color Standard

Required meanings:

- blue: volume and neutral quantitative information
- green: passed, good condition, positive state
- red: failed, critical risk, negative condition
- amber: warning and attention required
- gray: unknown, missing, unavailable, or secondary
- distinct consistent accent: target/reference/comparison

Rules:

- one color must not represent conflicting business meanings
- trend direction and business status must not be confused
- target lines must use one consistent style across charts
- legends are mandatory where multiple business meanings are shown
- color must not be the only indicator
- use labels, icons, line styles, badges, or patterns where appropriate
- accessible contrast must be preserved

## 5. Label And Wording Standard

PO-facing Dashboard surfaces must use Vietnamese business terminology and must remove technical or shell wording.

Standardize:

- titles
- date context
- aggregate versus BCVH scope
- percentage and count formatting
- current period versus comparison period
- target and threshold wording
- missing-data descriptions
- tooltip and legend wording

Do not rename authoritative business terms without Product Owner authority.

## 6. Preservation Requirements

Across all DA implementation tickets preserve:

- KPI formulas
- SSOT
- API contracts unless a targeted authorized defect requires correction
- database schema
- canonical BCVH mappings
- missing-date and missing-data semantics
- accepted import reconciliation
- login/session behavior
- URL filter context
- accepted Dashboard runtime data

Do not invent:

- business thresholds
- causes
- owners
- deadlines
- status
- role or permission rules
- new business calculations

## 7. Implementation Sequence

All tickets in the Smart Dashboard sequence are completed:

- `DA-IMPL-001` - Dashboard Language and Semantic Foundation: `COMPLETED / PO PASS`
- `DA-IMPL-002` - Unified Command Summary: `COMPLETED / PO PASS`
- `DA-IMPL-003` - Integrated Trend and Risk Workspace: `COMPLETED / PO PASS`
- `AUTO-IMPORT-001` - Source Portal Discovery and Security Assessment: `COMPLETED / HANDOFF`
- `AUTO-IMPORT-002` - Automated Download and Validation Pipeline: `COMPLETED / PO PASS`
- `AUTO-IMPORT-003` - Scheduled Import, Retry, Monitoring and Operations UI: `COMPLETED / PO PASS`
- `DA-IMPL-004` - Unified BCVH Analysis Table: `COMPLETED / PO PASS`
- `DA-IMPL-005` - Operating Pattern Tabs: `COMPLETED / PO PASS`
- `AUTO-IMPORT-004` - TCT Source Discovery and Nationwide Ranking Contract: `COMPLETED / PO PASS`
- `AUTO-IMPORT-005` - TCT Manual Backfill and Shared DKCL Background Operations: `COMPLETED / PO PASS`
- `DA-IMPL-006` - Unified Action Center: `COMPLETED / PO PASS`
- `DA-IMPL-007` - Smart Dashboard Final Assembly: `COMPLETED / PO PASS`

Active DA Ticket: `None`.

From DA-IMPL-002 onward, compactness is a cross-ticket Dashboard acceptance constraint. At the desktop reference viewport `1440x900`, the primary leadership summary should be visible within the first viewport, and the final Dashboard direction target of no more than approximately two vertical viewports has been preserved.

`TICKET-0102` remains deferred and inactive (`DEFERRED / INACTIVE`) during this Dashboard implementation sequence unless the Product Owner explicitly activates it.

## 8. Final Closure

- Status: `COMPLETED / PO PASS` (2026-07-22)
- Final Code SHA: `f9a62f5fe031520b88648280db6e26d84f4a1f8d`
- Documentation HEAD: `See remote branch HEAD`
- Scope & Boundaries: No backend API, schema, KPI formulas, nationwide ranking data sources, or mapping rules were changed. All protected boundaries were successfully preserved.
