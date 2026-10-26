# F42-MODULE-PLAN Manifest

## 1. Ticket Information

- Ticket ID: `F42-MODULE-PLAN`
- Ticket Name: `F4.2 Chất lượng phát giao bưu tá — Source Audit and Overall Plan`
- Owner: `Claude Code`; independent challenge of the data contract by a different model before F42-PHASE-1 PASS (DEC-021)
- Governance Version: `V2 Active`
- Activation authority: `PO request in chat 2026-10-26: add indicator F4.2 like F1.1 / F1.2 / F4.1, audit the Huế detail file and the national file, rate = DKCL column 18`
- Branch: `codex/da-impl-006`
- Activation date: `2026-10-26`
- Does not change Current Ticket.

## 2. Objective

Evidence-backed audit of the two real F4.2 exports and a phased plan to deliver F4.2 like F1.2, without implementing anything and without inferring business rules.

## 3. Current Status

- State: `AUDIT COMPLETE / PO DECISIONS RECORDED` (PD-F42-1..7 in the checkpoint Section 1). Phase 0 onward not yet activated.
- PO UI Check Required: `No` (planning only).

## 4. Required Reading

- `docs/06_REVIEWS/Shared/F42-MODULE-PLAN_CHECKPOINT_001.md`
- Precedent: `docs/10_TICKETS/F12-MODULE-PLAN_MANIFEST.md`, `docs/10_TICKETS/F12-PHASE-0-4_MANIFEST.md`.
- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (for the Dashboard tickets).

## 5. Key Findings

- Rate = PTC đúng QĐ 11,5 h / all GBT rows of the day: 4 475 / 6 466 = 69,21 % (10/10/2026), identical to the DKCL screen; Không đạt 757; 1 234 unrated rows stay in the denominator.
- Data day = GBT date; the detail CSV has unquoted commas (114 rows) and padded headers; key (parcel, postman, GBT time).
- The national file is per postman (13 665 rows); Huế matches the detail file on all 128 postmen with volume; 34-province rank: Huế 26/34.
- Postmen only; the office-delivery route is not evaluated.

## 6. Scope

In scope: read-only audit, checkpoint, this manifest, governance sync. Out of scope: any code, schema, database, Import, portal access, file under `Data DKCL/`.

## 7. Validation

Read-only Python in the session scratchpad: row re-join, rating counts, reconciliation to DKCL columns 14/15/17/18, per-BCVH and per-postman comparison detail vs national (0 differences), 34-province aggregation and rank.

## 8. Next Ticket

None self-activated. Proposed: `F42-PHASE-0`, `F42-PHASE-1/2/4`, `F42-PHASE-3`, `F42-DASHBOARD-RANKING-01`, `F42-DASHBOARD-UI-01` (checkpoint Section 5).
