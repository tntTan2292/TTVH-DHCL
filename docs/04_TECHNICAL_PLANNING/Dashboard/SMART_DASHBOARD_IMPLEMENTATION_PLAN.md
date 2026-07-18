# Smart Dashboard Implementation Plan

## 1. Authority

- Status: `Active`
- Authority: Product Owner `PO PASS` on `2026-07-18`
- Source ticket: [docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DASHBOARD-AUDIT-001_MANIFEST.md)
- Related register: [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)

The approved target is the consolidated smart Dashboard. The previous high-density multi-widget concept is rejected as insufficiently optimized. Implementation must merge overlapping charts and widgets into fewer complete decision surfaces.

No Dashboard product code was changed under `DASHBOARD-AUDIT-001`.

## 2. Approved Reading Sequence

1. Context and filters
2. KPI command summary
3. Integrated trend and current risks
4. BCVH comparison and prioritization
5. Operating patterns
6. Action and follow-up

The Dashboard must answer these questions in order:

1. What is the current situation?
2. Is performance improving or deteriorating?
3. What is abnormal or below target?
4. Which BCVH requires attention?
5. Is there a recurring operating pattern?
6. What action should be taken and tracked?

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

### Surface B - Integrated Trend and Risk

Left side:

- one primary chart called `Xu huong dieu hanh tong hop`
- modes or tabs: `30 ngay`, `7 ngay so sanh`, `Theo BCVH`
- volume bars
- pass-rate line
- failed-rate line
- target/reference line
- below-threshold and abnormal-day markers
- complete legend and tooltip

Right side:

- `Ngoai le & Rui ro chinh`
- highest-priority warnings
- affected units
- observed evidence
- severity
- concise attention points

Rules:

- replace separate 30-day, 7-day, legacy timeline, and Quality Pulse storytelling with one coordinated decision area
- do not display multiple charts that answer substantially the same trend question
- causal explanations must only come from approved data sources
- unsupported causes must be labeled as unknown or awaiting confirmation

### Surface C - BCVH Analysis

Use one unified analytical table:

- BCVH
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
- do not create new BCVH mapping rules

### Surface D - Operating Patterns

Use one card with tabs:

- `Theo thu`
- `Theo thang`
- `Heatmap`

Rules:

- show only one pattern visualization at a time
- include a concise, data-grounded insight
- provide a clear threshold legend
- do not render three separate pattern charts simultaneously
- preserve current calculation contracts unless separately authorized

### Surface E - Action Center

Merge:

- recommendations
- Daily Brief
- message generation
- row-level guidance
- follow-up information

Target structure:

- priority
- issue
- unit
- evidence or confirmed cause
- recommended action
- owner where available
- status
- follow-up entry point

Rules:

- each issue appears once
- do not show multiple widgets repeating the same recommendation
- distinguish system recommendation, confirmed cause, and human follow-up
- no invented owner, cause, deadline, or status
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

Recommended sequence:

1. `DA-IMPL-001` - Dashboard Language and Semantic Foundation
2. `DA-IMPL-002` - Unified Command Summary
3. `DA-IMPL-003` - Integrated Trend and Risk Workspace
4. `DA-IMPL-004` - Unified BCVH Analysis Table
5. `DA-IMPL-005` - Operating Pattern Tabs
6. `DA-IMPL-006` - Unified Action Center
7. `DA-IMPL-007` - Smart Dashboard Final Assembly

Only `DA-IMPL-001` is active. Later DA-IMPL tickets are planned and inactive until the prior ticket receives `PO PASS` or an explicit governance decision allows parallel work.

`TICKET-0102` remains deferred and inactive during this Dashboard implementation sequence unless Product Owner later changes priority.
