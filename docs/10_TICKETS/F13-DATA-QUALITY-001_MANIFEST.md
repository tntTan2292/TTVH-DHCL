# F13-DATA-QUALITY-001 Manifest

- Ticket ID: `F13-DATA-QUALITY-001`
- Ticket Name: `F1.3 Data Coverage & Quality Module`
- Phase: `F1.3 Operational Module`
- Current state: `PROPOSED / READY FOR PO DECISION`
- Technical Status: `DISCOVERY COMPLETE - NO IMPLEMENTATION`
- Runtime Status: `DATABASE AUDIT PASS`
- PO UI Check Required: `Yes after implementation approval`
- PO Product Status: `WAITING FOR PO APPROVAL`
- Activation authority: `None yet`
- Recommendation date: `2026-07-28`
- Recommended executor if approved: `Codex`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-DATA-QUALITY-001_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-SHIPMENT-001_MANIFEST.md`
- `docs/07_REFERENCE/Legacy/F1.3/F1.3 DATA DICTIONARY v1.0.md`
- `docs/07_REFERENCE/Legacy/F1.3/F1.3 MODULE SPECIFICATION v1.0.md`
- `docs/05_DEVELOPMENT/Implementation/database_schema.md`

## Decision Required

Product Owner must approve or reject this exact next ticket before implementation starts.

Recommended next ticket:

`F13-DATA-QUALITY-001 - F1.3 Data Coverage & Quality Module`

## Objective If Approved

Implement a read-only F1.3 data coverage and quality module that shows what current data can safely support before deeper operational drill-down work resumes.

Minimum useful outcome:

- Date coverage and row counts for Hue F1.3.
- National coverage for `fact_f13_national`.
- Import-log status summary.
- Null rates and completeness warnings for core fields.
- Future-date exclusion warning.
- Module readiness labels for Dashboard, BCVH, Route, Shipment, Pareto/RCA, Evidence, Message Center, Delay, Person Responsibility, Lifecycle, Reporting/Export.

## Authority And Constraints

- `F13-SHIPMENT-001` implementation is deferred by Product Owner, not rejected.
- Do not implement Shipment drill-down under this ticket.
- Do not change product code, UI, schema, formulas, or business rules before PO approval.
- If approved, implementation must remain read-only and must not modify Import lifecycle or operational data.
- Do not infer person ownership, RCA causes, workflow status, lifecycle events, message status, or export history.
- Do not treat existing menu/screen shells as evidence of data readiness.

## Data Basis

Current audit evidence:

- `fact_f13`: `640,049` rows; `206` valid business dates from `2026-01-01` through `2026-07-27`; `627,371` distinct shipment IDs.
- `fact_f13_national`: `2,992` rows; `88` dates; `34` provinces.
- `import_log`: `315` rows, all `SUCCESS`.
- `extended_data`: absent from the actual current `fact_f13` schema.
- Person/responsibility fields: no authoritative employee/postman/person field confirmed.

## Out Of Scope

- Shipment implementation.
- Message Center implementation.
- Evidence Center implementation.
- Reporting/export implementation.
- Person/postman responsibility.
- RCA cause assignment.
- Delay formula changes.
- New schema, KPI formula, threshold, canonical mapping, or import behavior.

## Suggested Validation If Approved

- LEVEL 2 targeted validation because the module summarizes shared data readiness used by multiple F1.3 modules.
- Read-only database contract tests for coverage/null-rate queries.
- Frontend rendering tests for readiness labels and unavailable wording.
- API/runtime validation against current SQLite DB.
- `git diff --check`.
- PO-visible checklist for data coverage and readiness labels.

## PO Decision Options

1. Approve `F13-DATA-QUALITY-001` exactly as recommended.
2. Defer this ticket and keep the project at `READY FOR PO DECISION`.
3. Provide another single authorized next ticket.

## Handoff

Status: `READY FOR PO DECISION`.

No code implementation is authorized until Product Owner approves this proposed ticket.
