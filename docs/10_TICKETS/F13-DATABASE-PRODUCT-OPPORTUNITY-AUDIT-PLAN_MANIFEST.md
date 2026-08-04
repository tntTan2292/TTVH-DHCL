# F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN — MANIFEST

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Technical Context](#6-technical-context)
- [7. Runtime Context](#7-runtime-context)
- [8. Related Review](#8-related-review)
- [9. Related PO Findings](#9-related-po-findings)
- [10. Documents To Update](#10-documents-to-update)
- [11. Validation](#11-validation)
- [12. Expected Output](#12-expected-output)
- [13. Next Ticket](#13-next-ticket)
- [14. PO Acceptance Checklist](#14-po-acceptance-checklist)
- [15. Authority Escalation](#15-authority-escalation)
- [16. Closure](#16-closure)

## 1. Ticket Information

- Ticket ID: `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN`
- Ticket Name: F1.3 Database, API, and Product Opportunity Audit
- Phase: Discovery / Read-only audit
- Owner: Claude Code (implementation, data, documentation, Git per DEC-020)
- Governance Version: `V2 Active`

## 2. Objective

Perform a read-only audit of the operational database, API capabilities, and all F1.3 product surfaces to identify valuable management functions the system can already support, so that product direction can be driven by evidence rather than by the Product Owner having to invent each business problem.

## 3. Current Status

- Current state: `READY FOR PO DATABASE AUDIT REVIEW`
- PO UI Check Required: `No` — this ticket produces no UI change. It requires Product Owner **review and direction decisions**, not UI acceptance.
- PO Product Status: `AWAITING PO DATABASE AUDIT REVIEW`

## 4. Required Reading

- `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` — the audit itself; the single deliverable of this ticket
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — live state

No other reading is required to act on this ticket. The checkpoint is self-contained.

## 5. Business Context

- Business problem: F1.3 product direction has been proceeding one Product Owner-identified defect at a time. The database contains substantially more decision-relevant information than the product exposes, but nobody had inventoried it, so opportunity was invisible and each new scope had to originate from the Product Owner.
- Business impact: The audit converts an undifferentiated data asset into a ranked, evidence-backed opportunity list, and identifies three navigation entries that are non-functional placeholders despite having working backends.
- Approved business rule constraints: **No business rule may be inferred by this ticket.** Where a conclusion would require one, the gap is registered in the checkpoint's Missing Data Register (Section 14) for Product Owner decision. This applies in particular to which result column is authoritative (`MD-01`), duplicate shipment handling (`MD-05`), and re-import supersede behaviour (`MD-06`).

## 6. Technical Context

- Database audited: `backend/src/db/database.sqlite` (SQLite, 555,933,696 bytes), opened `OPEN_READONLY`
- Relevant backend files (read only): `backend/src/config/db.js`, `backend/src/routes/f13Routes.js`, `backend/src/routes/importRoutes.js`, `backend/src/routes/authRoutes.js`, `backend/src/controllers/DashboardController.js`, `backend/src/controllers/RecommendationController.js`, `backend/server.js`
- Relevant frontend files (read only): `frontend/src/App.jsx`, `frontend/src/api/F13DashboardClient.js`, `frontend/src/navigation/appNavigation.jsx`, `frontend/src/features/{dashboard,ranking,route,shipment}/`, `frontend/src/pages/F13*.jsx`
- Relevant routes: all seven `/f13/*` routes
- State/contract constraints: none changed. No schema, data, index, or product code was modified by this ticket.

## 7. Runtime Context

- Current runtime endpoint: not exercised. This audit is static plus direct read-only database query.
- Browser origin: not applicable — no browser session was run.
- Backend origin: not applicable — no endpoint was invoked.
- Observed validation state: audit queries executed directly against the operational SQLite file in read-only mode. Runtime evidence remains Antigravity's ownership per DEC-020 and was not claimed here.

## 8. Related Review

- Review document: `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`
- Review status: `COMPLETE — READY FOR PO DATABASE AUDIT REVIEW`
- Key evidence:
  - 5 tables total; `fact_f13` holds 663,130 rows × 45 columns over 213 usable days (`2026-01-01`–`2026-08-03`)
  - Origin-handover → delivery latency averages `10.97h` on passing vs `47.68h` on failing shipments across 595,046 complete chains with zero parse failures — the strongest explanatory variable in the database, exposed nowhere in the product
  - 10 customer accounts of 17,012 carry `78,091` of `208,121` failures (37.5%)
  - 46 of 154 routes failed above 40% on ≥20 of the last 60 days
  - Route type spreads failure from 12.66% to 63.05%; once-daily commune routes fail 21.5 points worse than twice-daily central routes at comparable volume
  - Three F1.3 navigation entries (Pareto/RCA, Evidence, Message Center) render `PlaceholderPage` while working backend endpoints exist for all three
  - Eight data-quality defects catalogued `DQ-01`…`DQ-08`, including a duration column stored as TEXT whose `MIN`/`MAX` return silently wrong values
  - One latent API defect `API-01`: `getKpi` and `getPareto` omit the `/f13` path prefix and would 404

## 9. Related PO Findings

- PO finding IDs: none. This ticket originates from a Product Owner planning authorization, not from a defect finding.
- Status: not applicable.
- Closure or recheck requirement: none.

## 10. Documents To Update

- `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` — created
- `docs/10_TICKETS/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN_MANIFEST.md` — created (this document)
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — Current Ticket activated
- `PROJECT_PROGRESS.md` — one appended history line
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — both new documents registered

## 11. Validation

- Technical validation: all inventory, coverage, dimension, quality, and opportunity queries executed against the operational database in `OPEN_READONLY` mode. Query results are reproduced in the checkpoint with row counts and, where relevant, execution timings (329–935ms for full-history aggregate scans; 5ms for the national benchmark).
- Correctness controls applied: `BCVH TEST` and the corrupt `2098-02` rows excluded from all analytics via an explicit clean filter; minimum-volume guards applied to commune (n≥300) and route-type (n>500) analysis; `dd/MM/yyyy HH:mm:ss` timestamps reassembled to ISO before any date arithmetic, verified by a zero-unparsed count across 595,046 rows; TEXT-stored numerics explicitly `CAST` before aggregation.
- Self-correction recorded: the first COD-lag pass used native `julianday()` on the raw TEXT timestamps and returned `NULL` for every row plus a false `0` for the over-24h count. Re-run with string reassembly produced 172,508 parseable rows and 11,770 settlements beyond 24h. Both the error and the correction are documented in the checkpoint (Section 10.11) as a worked example of the `DQ-05` silent-failure class.
- Runtime validation: not applicable — no runtime change and no browser session.
- Build or lint validation: not applicable — no product code was modified. `git status` clean of source changes; only documentation added.

## 12. Expected Output

- What the ticket must achieve: a complete, evidence-backed inventory of data, API, and F1.3 surface coverage; a BUILD/MERGE/HIDE/REMOVE recommendation for every unfinished item; a ranked no-code Product Opportunity Matrix separating quick wins from functions requiring new data; and a recommended implementation sequence. **Achieved.**
- What must remain unchanged: database schema, database contents, indexes, all product code, all frontend behaviour, SSOT, and frozen documents. **All unchanged.**
- What must not be introduced: inferred business rules, exposed shipment identifiers, exposed customer names, or personal data. **None introduced** — all SQL evidence in the checkpoint is aggregate or anonymized; customer concentration is reported as counts and shares only.

## 13. Next Ticket

- Next ticket ID: none authorized.
- Next ticket name: not selected.
- Blockers or handoff notes: the checkpoint proposes a five-wave sequence (Section 13) for the CTO/Product Owner to authorize or reorder. No implementation ticket is opened by this audit. Three Product Owner decisions gate Wave 1:
  1. **MERGE confirmation** — Evidence is the same data, parameters, and access level as Shipment Ranking; the shipment client method is a direct alias of the evidence method. Confirm folding Evidence into Shipment Ranking rather than building a duplicate screen.
  2. **HIDE confirmation** — Message Center has no message, recipient, or acknowledgement state anywhere in the database, so it cannot track whether anyone acted on a message. Confirm hiding it from navigation pending a lifecycle definition, or re-scoping it as a read-only recommendations panel on the Operation Dashboard.
  3. **MD-01** — which of `ket_qua_f13` or `danh_gia_2026` is authoritative. They disagree on 31,103 rows and differ by 4.7 percentage points overall. This affects every KPI in the system and cannot be decided technically.

## 14. PO Acceptance Checklist

`PO UI Check Required = No`. There is no screen to accept. The Product Owner review required is a direction review:

- Review document: `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md`
- PO purpose: confirm the surface recommendations and authorize (or reorder) the implementation sequence
- Decisions requested:
  1. Accept or amend the BUILD/MERGE/HIDE/REMOVE recommendations in checkpoint Section 9.9
  2. Authorize, reorder, or defer the wave sequence in checkpoint Section 13
  3. Resolve `MD-01` (authoritative result column)
  4. Indicate which Missing Data Register items (`MD-02`…`MD-12`) the organisation intends to begin collecting
- PASS criteria: recommendations accepted or amended, and a Wave 0/Wave 1 scope authorized for a follow-up implementation ticket
- WARNING criteria: recommendations accepted but decisions deferred — audit stands, no implementation ticket opens
- FAIL criteria: a finding is disputed on evidence. Re-run the specific query cited in the checkpoint rather than re-auditing the whole database.
- Follow-up after PASS: CTO scopes the authorized wave as one or more implementation tickets under One Bug → One Ticket → One Commit
- Documents to update per result: `PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, and this manifest's Section 16

## 15. Authority Escalation

No escalation was required. No conflict with `PROJECT_SNAPSHOT.md`, SSOT, or any frozen document arose. No second source of truth was created — the checkpoint is a review document and holds no mutable live state.

Where a business rule would have been needed to complete an analysis, the audit registered the gap in the Missing Data Register instead of inferring it, in line with the standing constraint that Claude Code does not infer business rules.

## 16. Closure

- Status: `READY FOR PO DATABASE AUDIT REVIEW`
- Closure conditions: Product Owner reviews the checkpoint, records the three gating decisions in Section 13, and authorizes or defers the implementation sequence. This manifest is updated with the outcome and the ticket is closed by a subsequent governance sync.
- Not claimed: this ticket does not award itself PO acceptance and does not open any implementation scope.
