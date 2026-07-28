# F1.3 Operational Capability Audit

- Audit date: `2026-07-28`
- Scope: data-first capability audit using only the current SQLite database and existing authoritative contracts.
- Database: `backend/src/db/database.sqlite`
- Status: `DISCOVERY COMPLETE / SUPERSEDED BY PO DEFERRAL`
- Implementation performed: `None`

## Product Owner Decision Recorded

Product Owner deferred `F13-SHIPMENT-001` implementation. Its manifest remains preserved and must not be deleted or treated as rejected.

Before selecting the next F1.3 implementation ticket, Product Owner required a data-first audit of current F1.3 modules/menu using only current database evidence and existing authoritative contracts.

Product Owner later deferred `F13-DATA-QUALITY-001` implementation. Its manifest remains preserved and must not be deleted or treated as rejected. Current active handoff is the bounded internal-counter route candidate audit documented in `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`.

## Database Capability Matrix

| Area | Actual tables | Structured fields / stable keys | Coverage profile | Data classification | Smallest usable operational outcome |
| --- | --- | --- | --- | --- | --- |
| Operation Dashboard | `fact_f13`, `fact_f13_national`, `import_log`, `system_config`, `sys_kpi_thresholds` | Date, shipment, BCVH, route, result, PTC time, cash handover time, duration string, national province aggregates | `fact_f13`: `640,049` rows, `206` valid business dates `2026-01-01..2026-07-27`, plus `4` future-dated rows in `2098`; national: `2,992` rows, `88` dates, `34` provinces | `READY` for KPI/ranking with guarded date handling; `PARTIALLY READY` for recent-day result completeness | Keep leadership KPI/ranking surfaces and add explicit data-quality warning where result completeness is weak |
| BCVH Ranking | `fact_f13` | `ma_bcvh`, `ten_bcvh`, `danh_gia_2026`, volume fields by count | `9` BCVH values in DB; canonical Dashboard uses `6`; core ID/name null rate `0%` | `READY` for BCVH aggregation; `PARTIALLY READY` for non-canonical extras | Keep BCVH ranking and canonical filters; keep non-canonical units out of leadership unless authorized |
| Route Ranking | `fact_f13` | `ma_tuyen`, `ten_tuyen`, BCVH, result | `154` routes; route code/name null count `4` (`0%` rounded) | `READY` for route aggregation | Keep route ranking as the next drill-down level below BCVH |
| Shipment | `fact_f13` | `ma_bg`, BCVH, route, result, PTC, cash handover, duration | `627,371` distinct shipment IDs; `0` shipment ID nulls; result null `24,208` (`3.78%`) | `PARTIALLY READY` | Defer full Shipment module until data-quality states are exposed; current smallest outcome is failed-shipment list by date/BCVH/route |
| Pareto / RCA | `fact_f13` | Route and failed-count fields | Route failed counts exist where result is populated; no structured cause field exists | `PARTIALLY READY` for Pareto; `NOT JUSTIFIED` for cause claims | Keep Pareto as distribution of failures; label RCA causes as unavailable unless sourced |
| Evidence | `fact_f13` | Full row-level shipment facts | Row-level facts exist; no separate evidence/lifecycle table | `PARTIALLY READY` | Keep evidence as row-level shipment fact detail, not proof workflow |
| Message Center | None found | No message, recommendation, or dispatch table found in current DB | No message history, send state, recipient, status, approval, or audit fields | `DATA MISSING` | Defer Message Center implementation |
| Time / delay analysis | `fact_f13` | `thoi_gian_ptc`, `thoi_gian_nop_tien`, `thoi_gian_thuc_hien_thuc_te_gio` | PTC null `3.77%`; cash handover null `67.85%`; timestamp text uses `DD/MM/YYYY HH:mm:ss`, not SQLite-native parse; duration stored as text such as `39:11` | `PARTIALLY READY` | Implement guarded delay-band profiling from duration text only after contract validation |
| Postman / person responsibility | None confirmed | No employee, HRM, postman, staff, or person-responsibility field exists; only ward/location-like fields matched loose person search | No authoritative person field | `NOT JUSTIFIED` | Do not show person ownership; show responsible BCVH/route only |
| Operational lifecycle | `import_log` only | Import file/date/status/record counts | `315` import logs; all `SUCCESS`; no shipment event lifecycle table | `PARTIALLY READY` for import lifecycle; `DATA MISSING` for shipment lifecycle | Keep Import operations separate; do not claim shipment workflow status |
| Reporting / export | None found | No export table/history found | No persistent export metadata | `DATA MISSING` | Defer reporting/export module or implement export as stateless later only with PO approval |
| Data coverage / quality | `fact_f13`, `fact_f13_national`, `import_log` | Date coverage, row counts, null rates, result completeness, future-date detection, national coverage | Current DB directly supports coverage audit and visible quality warnings | `READY` | Implement a Data Coverage & Quality module first |

## Current-Module Gap Matrix

| Current module/menu | Runtime-backed capability | Placeholder or inferred capability | Classification | Recommendation | Rationale |
| --- | --- | --- | --- | --- | --- |
| Operation Dashboard | KPI, national ranking, BCVH context, trend/pattern surfaces | Recent dates can include result-null records; future-dated rows exist and must stay excluded | `READY` | `KEEP` | It is the strongest current leadership surface, provided data-quality warnings stay explicit |
| BCVH Ranking | Aggregation by BCVH and canonical dashboard filters | Non-canonical DB units are not leadership-authorized | `READY` | `KEEP` | Supports management ranking by unit |
| Route Ranking | Aggregation by route under BCVH | Route-to-shipment target exists but full shipment module is deferred | `READY` | `KEEP` | Supports next-level operational drill-down |
| Shipment | Shipment IDs and row facts exist | Person owner, workflow lifecycle, and evidence center are not supported | `PARTIALLY READY` | `DEFER` | PO deferred `F13-SHIPMENT-001`; retain manifest for later |
| Pareto / RCA | Pareto by route failures can be supported | Root cause labels are not supported by cause fields | `PARTIALLY READY` | `RENAME` | Rename conceptually to failure distribution until cause contracts exist |
| Evidence | Row-level facts can be displayed | Proof package, audit trail, and lifecycle are absent | `PARTIALLY READY` | `MERGE` | Merge with shipment detail later as factual evidence, not a separate workflow yet |
| Message Center | No DB support found | Drafts, send status, recipients, approvals, and history are absent | `DATA MISSING` | `HIDE` | Existing menu/shell must not imply readiness |
| Time / delay analysis | Duration/timestamps exist | Timestamp parsing and late-rule calculations need contract validation | `PARTIALLY READY` | `IMPLEMENT LATER` | Useful after data-quality module clarifies parseability and nulls |
| Postman/person responsibility | None | Person ownership would be fabricated | `NOT JUSTIFIED` | `HIDE` | Must wait for authoritative field/source |
| Operational lifecycle | Import lifecycle exists | Shipment lifecycle does not exist | `PARTIALLY READY` | `MERGE` | Keep import lifecycle in Data Import Center; do not create shipment lifecycle module yet |
| Reporting/export | No persistent export contract found | Export history/status would be invented | `DATA MISSING` | `DEFER` | Needs separate export authority |
| Data coverage/quality | Strong DB support | None required for initial module | `READY` | `IMPLEMENT` | Highest-confidence next module and reduces risk before deeper drill-down |

## Proposed Final F1.3 Module Architecture

1. `F1.3 Command Dashboard`
   - Keep current Dashboard as leadership overview.
   - Purpose: situation, ranking, trend, pattern, and action summary.

2. `Data Coverage & Quality`
   - New recommended next module.
   - Purpose: date coverage, row counts, import status, null rates, future-date exclusion, national-vs-Hue coverage, and readiness warnings.

3. `BCVH & Route Performance`
   - Merge BCVH Ranking and Route Ranking into one progressive drill-down family.
   - Purpose: responsible operational unit and route focus.

4. `Shipment Facts & Evidence`
   - Deferred.
   - Purpose: row-level shipment facts and evidence handoff after data-quality readiness is visible.

5. `Failure Distribution`
   - Rename Pareto/RCA until true cause fields exist.
   - Purpose: distribution by route/unit/service/location, not causal claims.

6. `Delay Analysis`
   - Later implementation after timestamp/duration contract validation.
   - Purpose: time-band and late-handling patterns.

7. `Message Center`, `Person Responsibility`, `Shipment Lifecycle`, `Reporting/Export`
   - Hide/defer until authoritative tables/fields/contracts exist.

## Phased Implementation Roadmap

| Phase | Recommended ticket | Outcome | Data dependency | Status |
| --- | --- | --- | --- | --- |
| 1 | `F13-DATA-QUALITY-001` | Data Coverage & Quality module | Current DB already supports it | `RECOMMENDED NEXT` |
| 2 | Route/BCVH consolidation follow-up | Cleaner progressive unit -> route workflow | Existing ranking contracts | `Later` |
| 3 | `F13-SHIPMENT-001` | Shipment failure drill-down | Requires PO to lift deferral; no person ownership unless data appears | `Deferred` |
| 4 | Failure Distribution | Pareto without RCA cause claims | Existing failed rows | `Later` |
| 5 | Delay Analysis | Delay bands from validated duration/timestamp contract | Needs time-field validation | `Later` |
| 6 | Evidence / Message / Export / Lifecycle | Evidence package, messages, exports, workflow status | Requires new authoritative contracts | `Future only` |

## Exactly One Recommended Next Ticket

`F13-DATA-QUALITY-001 - F1.3 Data Coverage & Quality Module`

Reason:

- It is the only audited module classified `READY` that is not already implemented as a mature leadership surface.
- It uses current tables and fields without schema, formula, or business-rule changes.
- It prevents the next operational modules from overclaiming readiness, person ownership, lifecycle state, RCA cause, or evidence completeness.

Minimum approved outcome if Product Owner approves:

- A read-only operational page or Dashboard-adjacent module showing F1.3 date coverage, row counts, result-null rates, route/BCVH coverage, national coverage, import-log status, future-date exclusion warning, and module readiness labels.

## Handoff

Status: `SUPERSEDED BY PO DEFERRAL`.

No implementation is authorized until Product Owner reactivates this ticket or approves another follow-up ticket.
