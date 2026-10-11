# F12-MODULE-PLAN Manifest

## 1. Ticket Information

- Ticket ID: `F12-MODULE-PLAN`
- Ticket Name: `F1.2 Thu gom bưu gửi liên tỉnh — Source Audit and Overall Plan`
- Owner: `Claude Code`; independent challenge of the data contract by a different model before F12-PHASE-1 PASS (DEC-021)
- Governance Version: `V2 Active`
- Activation authority: `PO request in chat 2026-10-11: audit the F1.2 detail and national files to prepare F1.2 like F1.1, accepting side only (no delivery stage), Import for day/week/month/12-month charts, Import done the F1.1 way`
- Branch: `codex/da-impl-006`
- Activation date: `2026-10-11`
- Does not change Current Ticket.

## 2. Objective

Evidence-backed audit of the two real F1.2 exports (Huế detail, national) and a phased plan to deliver F1.2 as F1.1 was delivered, without implementing anything and without inferring business rules.

## 3. Current Status

- State: `AUDIT COMPLETE / PO DECISIONS RECORDED` (2026-10-11: PO accepted every recommendation, PD-F12-5..11 in the checkpoint Section 2; target rate 95 % set as PD-F12-12). F12-PHASE-0, 1, 2 and 4 activated and implemented: `docs/10_TICKETS/F12-PHASE-0-4_MANIFEST.md`.
- PO UI Check Required: `No` (planning only).

## 4. Required Reading

- `docs/06_REVIEWS/Shared/F12-MODULE-PLAN_CHECKPOINT_001.md` — all findings, figures, data contract, phase plan, questions.
- Precedent: `docs/10_TICKETS/F11-MODULE-PLAN_MANIFEST.md` and its checkpoint.
- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (for the later Dashboard tickets).

## 5. Key Findings

- Detail: 1 758 parcels × 35 columns, one row per parcel, all accepting province 53, rating never blank, `Đạt ⇔ elapsed ≤ 10 h` (1 758 / 1 758). Elapsed is portal-computed (accept → BĐ10 scan, night window excluded), may be negative; stored, never recomputed.
- Data day is the BĐ10 date (10/10/2026); the export file name carries only the export time.
- National: 53 additive unit rows + grand total first, two-row merged header + number row, rate as text. Huế row = detail file on every column (1 758 / 1 620 / 138, buckets) except the 133 "chưa đủ thông tin" outside the denominator. Huế 8th / 34 at 92,15 %.
- Accepting side: 73 offices, each in exactly one of 37 units (`Tên Huyện`); `Khách hàng lớn` = 31 % of volume.

## 6. Scope

In scope: read-only audit, checkpoint, this manifest, governance sync. Out of scope: any code, schema, database, Import, portal access, file under `Data DKCL/`.

## 7. Validation

Read-only Python scripts in the session scratchpad: column profiling, duplicate check, rating rule reproduction, elapsed-rule fit, bucket recomputation vs national row 53, grand-total = sum-of-rows, national rank over the 34 frozen codes.

## 8. Next Ticket

None self-activated. Proposed: `F12-PHASE-0`, `F12-PHASE-1`, `F12-PHASE-2`, `F12-PHASE-4`, `F12-PHASE-3`, `F12-DASHBOARD-RANKING-01`, `F12-DASHBOARD-UI-01` (checkpoint Section 10). Phases 0–2 and 4 can start once Q-F12-1..3 are answered.
