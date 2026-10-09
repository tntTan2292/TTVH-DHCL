# F11-MODULE-PLAN Manifest

Status: `PLAN COMPLETE / AWAITING PO DECISIONS (Gate 0, 2026-10-09)`. Planning and documentation only — no product code, database, schema, watcher, portal sync, or Import behavior changed, and no later F1.1 phase is activated. The source audit, the Import plan (Huế and TCT), the Dashboard/BCVH Ranking plan, the Evidence plan, the data contract, the phasing, the risks and the open questions live in `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md`; this manifest does not duplicate them.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Technical Context](#6-technical-context)
- [7. Runtime Context](#7-runtime-context)
- [8. Scope](#8-scope)
- [9. Related Review](#9-related-review)
- [10. Related PO Findings](#10-related-po-findings)
- [11. Documents To Update](#11-documents-to-update)
- [12. Validation](#12-validation)
- [13. Expected Output](#13-expected-output)
- [14. Next Ticket](#14-next-ticket)
- [15. PO Acceptance Checklist](#15-po-acceptance-checklist)
- [16. Authority Escalation](#16-authority-escalation)

## 1. Ticket Information

- Ticket ID: `F11-MODULE-PLAN`
- Ticket Name: `F1.1 Quality Management — Source Audit and Overall Plan`
- Phase: `F1.1 Module — Planning`
- Owner: `Claude Code (Sonnet 5.5)`; independent challenge of the data contract and of the later Dashboard ticket by `Opus` (DEC-021)
- Governance Version: `V2 Active`
- Activation authority: `PO request in chat 2026-10-09: audit the Huế detail source for F1.1, then plan Import (Huế and TCT), Dashboard and BCVH like F1.3, plus Evidence — document it`
- Branch: `codex/da-impl-006`
- Baseline commit: `7dc423e` (HEAD at activation; working tree already carried unrelated pre-existing changes, left untouched)
- Activation date: `2026-10-09`

## 2. Objective

Produce an evidence-backed audit of the real F1.1 Huế detail source and a complete, phased plan to deliver F1.1 as a real operating module — Import for Huế and TCT, Operation Dashboard, BCVH Ranking and Evidence — without implementing anything and without inferring any business rule.

## 3. Current Status

- Current state: `PLAN COMPLETE / AWAITING PO DECISIONS`
- PO UI Check Required: `No` — planning ticket only. Gates G2, G5, G6, G7 of the phase plan each require Yes.
- PO Product Status: `Plan submitted 2026-10-09; audit round 2 the same evening (checkpoint Section 24). PO decisions PD-6..PD-8: metric = Đánh giá 2026 (Q-1 closed); F1.1 is toàn trình (clock from Nhận tin/Thu gom or Chấp nhận to PTC or Nộp tiền); two views — BCVH operation table (6 BCVH, delivery stage) and the pair table Chấp nhận → BCVH phát. Round 3 (same day): PD-9 blank evaluation = 0 Đạt in the denominator (as F4.1) and flagged separately; PD-10 date rule as F1.3; PD-11 six BCVH ranked, 531110/531120 counted but hidden; PD-12 detail file is the source, no summary reconciliation; PD-13 pair table for day/week/month, all offices, UI by Antigravity. Baseline under PD-9: 2.348 / 2.621 = 89,58% (six BCVH 2.338 / 2.611 = 89,54%). Q-1..Q-4a, Q-13, Q-14 answered; F11-PHASE-0 / F11-PHASE-1 need only PO authorization; no phase authorized yet.`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md` — the audit and the plan; all substantive content is there.
- Precedents the plan mirrors: `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` and `docs/04_TECHNICAL_PLANNING/Feature/F41-DASHBOARD-RANKING-01_DESIGN_OF_RECORD.md`.
- `docs/07_REFERENCE/Domains/_template_indicator/` — skeleton that F11-PHASE-0 instantiates.

## 5. Business Context

- Business problem: F1.1 (Chất lượng toàn trình bưu gửi nội tỉnh) has a directory tree, a navigation entry and a "Coming Soon" page, but no data path, no metric and no screens. Today the Product Owner builds F1.1 reporting by hand in Excel from the DKCL summary export.
- Business impact: extends the decision-support system from two indicators (F1.3, F4.1) to three, adds the first indicator whose quality depends on *two* units (accepting office and delivering BCVH), and brings per-stage violation analysis (Evidence) to nội tỉnh flow.
- Product Owner directions PD-1..PD-5 (checkpoint Section 3) are the only decisions recorded. The headline metric, denominator, ranking units, colour bands, Tuyến scope and roles are **open questions** (checkpoint Section 22), each with an evidence-based recommendation.

## 6. Technical Context

Findings of the read-only audit (details: checkpoint Sections 6-9):

- The real Huế detail file `Data DKCL/F1.1-2026.10.07.xlsx` is a clean flat table: 2 621 rows × 55 columns, one row per `Số hiệu bưu gửi`, zero duplicates, no merged cells or total row.
- **Portal schema drift is already visible**: older exports have 52 columns, the new one 55 (three appended Kỹ thuật tỉnh columns, one pair in a different ISO timestamp format). The parser must key on header names.
- Two evaluation columns exist and are exactly reproducible from elapsed time: `Đánh giá 2025` (≤ 24 h) and `Đánh giá 2026` (ward target 12/15/24/27 h). The PO confirmed `Đánh giá 2026` (PD-6) and that blank evaluations stay in the denominator as 0 Đạt (PD-9): `2.348 / 2.621 = 89,58 %` (six canonical BCVH `2.338 / 2.611 = 89,54 %`). The portal-style evaluated-rows figure `2.348 / 2.588 = 90,73 %` is kept only for comparison.
- 33 rows are not yet evaluable (13 PTC the next day, 1 without ward target, 19 without PTC); 4 undelivered rows are already `Không đạt`.
- The source has no violation-reason field (`Nội dung lý do` empty), so Evidence reasons must be derived from stage timestamps after PO training.
- The raw summary report is internally consistent but is a unit-pair aggregate with the grand-total row first. The Product Owner's pasted Excel sheets are **not** reliable reconciliation sources (`F1.1 Ngay` total row disagrees with its own body rows).
- No complete historical daily Huế file exists beyond 07/10. Round 4 (checkpoint Section 25): the real TCT file was audited — national aggregate by (accepting province × delivering province), grand-total row first, all 34 frozen ranked provinces present, Huế 7th of 34 (indicative). Its Huế row equals the 07/10 Huế detail **plus one more day** column by column (13 columns recomputed independently), so the file spans two days (Q-15) but proves TCT and Huế share data and definition. The TCT lane is now designed (Section 25.4); PD-15 closes the accepting-office ranking question.
- Round 2 (checkpoint Section 24): the toàn trình clock rule is confirmed by the data (start = nhận tin thu gom else chấp nhận; end = PTC/nộp tiền; a 10 h night deduction is observed on rows crossing midnight and is never recomputed by the system). The PO's `Đánh giá CLP F1.1.xlsx` runs on two raw pasted summary sheets (internally consistent, but a different day from 07/10) and a hand-maintained SUMIFS pair table (`Bảng-LK`) that leaks 6 offices; the pair table equals the `Đánh giá 2026` rate cut by (accepting office, delivering BCVH) and is computed from `fact_f11` detail rows, so no summary import is needed. The PO's hidden notes give the candidate violation vocabulary for the Evidence training.
- F4.1 already proved the multi-indicator pattern (registry, header-keyed parser, additive tables, constructor-injected overview/weekly services, indicator config), so F1.1 is largely configuration plus a new repository twin; F1.1-specific work is the accept × delivery matrix, the two-sided unit model, and Evidence.

## 7. Runtime Context

Not applicable — no runtime change, no server started, no Import run. All spreadsheets were opened read-only; the SHA-256 of the two files the Product Owner placed under `Data DKCL/` is recorded in the checkpoint. No file under `Data DKCL/`, `Data QLML/` or `Downloads` was created, moved, renamed or modified.

## 8. Scope

In scope: read-only source audit, survey of the existing Import/F1.3/F4.1 architecture, the checkpoint, this manifest, governance sync.

Out of scope, explicitly: any product code, `backend/src/db/schema.sql`, the live database, the Import pipeline/watcher/portal layer, any F1.3 or F4.1 behavior or data, any file operation under `Data DKCL/`, and any business rule beyond directions PD-1..PD-5.

## 9. Related Review

- Review document: `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md`
- Review status: `PLAN COMPLETE / AWAITING PO DECISIONS`
- Key evidence: Section 6.6 baseline table (per delivery unit, both evaluation columns, module and six-unit totals); Section 9 D-2 (the stale pasted sheet); Section 7 B-1 (52 vs 55 columns).

## 10. Related PO Findings

None open. This ticket was activated by a Product Owner request, not by a finding.

## 11. Documents To Update

- This manifest and the checkpoint, on PO decisions or any change of plan.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — updated as part of this activation.
- On F11-PHASE-0 authorization: a new `docs/07_REFERENCE/Domains/domain_quality_management/f1.1_chat_luong_toan_trinh_noi_tinh/` package instantiated from `_template_indicator`.

## 12. Validation

- Technical validation: not applicable — no code changed. Verification performed was read-only: workbook inventory and aggregation scripts over the six F1.1 workbooks (kept in the session scratchpad, not in the repository), reproduction of both evaluation columns from elapsed time (0 mismatches), summary total-row = sum-of-rows check, and a cell-by-cell comparison that exposed the stale pasted sheet.
- Runtime, browser, build/lint validation: not applicable.

## 13. Expected Output

- What the ticket must achieve: an evidence-verified audit, a data-contract proposal, a phased plan with PO gates, a risk register and the explicit list of decisions the Product Owner must still make.
- What must remain unchanged: all product code, `fact_f13`, `fact_f41`, the Import pipeline and watcher, the live database, every file under `Data DKCL/` and `Data QLML/`.
- What must not be introduced: any implementation, any inferred business rule, any second source of truth for the F1.1 metric.

## 14. Next Ticket

- Next ticket ID: none activated. Proposed successors, each needing explicit Product Owner authorization: `F11-PHASE-0` (SSOT/reference package, docs only) and `F11-PHASE-1` (data foundation); `F11-PHASE-3` (read-only portal discovery) may run in parallel. Full phase table: checkpoint Section 13.
- Handoff notes: no phase is self-activated. A raw portal summary export for the same date as the Huế detail file, and one real TCT F1.1 file, are needed for reconciliation and for the TCT lane respectively (checkpoint Section 23).

## 15. PO Acceptance Checklist

Not applicable — `PO UI Check Required = No`. What the Product Owner is asked to do:

- Q-1, Q-2, Q-3, Q-4a, Q-13 and Q-14 are answered (PD-6, PD-9..PD-13). Authorize F11-PHASE-0 and F11-PHASE-1 to open; Q-4b and Q-5..Q-12 can follow (none blocks them).
- Approve, amend or reject the data contract `DC-1..DC-12` (checkpoint Section 12) and the eight-ticket phase plan (Section 13).
- Provide the raw summary export for 07/10/2026 and, when available, a real TCT F1.1 file (Section 23).

## 16. Authority Escalation

Escalated rather than guessed:

1. ~~The headline metric and its denominator (Q-1, Q-2)~~ — resolved by the PO (PD-6, PD-9).
2. The colour bands and chart target (Q-5b) — F1.3 and F4.1 use different bands and the F1.1 level (~89-91 %) would be uniformly green under F1.3's.
3. The TCT report shape and name — no sample exists; nothing is inferred from F4.1.
4. The portal date-filter semantics and the report's stored-procedure/endpoint identities — to be observed in a read-only probe (Phase 3), never assumed.

Everything else in the plan derives either from verified file evidence or from existing, closed, PO-passed architecture (F1.3, F4.1).
