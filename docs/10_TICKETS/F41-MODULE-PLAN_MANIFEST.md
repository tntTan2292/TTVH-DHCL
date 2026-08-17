# F41-MODULE-PLAN Manifest

Status: `PLAN COMPLETE / AWAITING PO APPROVAL (2026-08-17, planning remediation round applied)`. Planning and documentation only — no product code, database, schema, watcher, portal sync, or Import behavior changed, and `F41-PHASE-0` is not activated. The full plan, delta survey, data contract, phasing, reconciliation baseline, risks, and question dispositions live in `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md`; this manifest does not duplicate them. The remediation round (checkpoint Sections 17-22) added three PO decisions, a read-only audit of the now-supplied F4.1 TCT workbook, a revised TCT contract, a correction to `D-17`, and the closure of `Q-1..Q-5`.

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

- Ticket ID: `F41-MODULE-PLAN`
- Ticket Name: `F4.1 Quality Management — Discovery and Overall Plan`
- Phase: `F4.1 Module — Planning`
- Owner: `Claude Code (Opus)`
- Governance Version: `V2 Active`
- Activation authority: `PO AUTHORIZATION: activate F41-MODULE-PLAN from NO ACTIVE TICKET — PLANNING / DOCUMENTATION ONLY, NO IMPLEMENTATION`
- Branch: `codex/da-impl-006`
- Baseline commit: `c2f4bdd7730192dbaa2bbe773e6859e0d35ef18b` (verified `HEAD` at activation; working tree clean except pre-existing untracked `.claude/` and `Data QLML/`)
- Activation date: `2026-08-17`
- Planning remediation round: `2026-08-17`, continued from authoritative `HEAD a0434d7b` under Product Owner authorization for planning remediation only.

## 2. Objective

Produce a discovery-backed overall plan for the F4.1 Quality Management module — data contract, phasing, UI, reconciliation, testing, risks, and PO gates — without implementing any code, product, database, or Import change.

## 3. Current Status

- Current state: `PLAN COMPLETE / AWAITING PO APPROVAL` (unchanged by the remediation round)
- PO UI Check Required: `No — planning ticket only. Gates 2, 3 and 4 of the proposed phase plan each require Yes.`
- PO Product Status: `Plan submitted 2026-08-17 and revised the same day after three further PO decisions (PO-8 TCT source supplied, PO-9 official DKCL report name, PO-10 role contract). No phase authorized. Q-1, Q-2 and Q-3 are CLOSED by those decisions; Q-4 is RESOLVED as already answered by DC-6/DC-7; Q-5 is NON-BLOCKING (multi-day support still required, comparison acceptance deferred to the first gate with a second HUE day). One new, non-blocking question Q-6 arose from the TCT audit evidence.`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` — the plan itself; all substantive content is there.
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/data_blueprint.md` and `measurement.md` — the F1.3 SSOT pattern that Phase 0 mirrors for F4.1.
- `docs/07_REFERENCE/Domains/_template_indicator/` — the indicator document skeleton Phase 0 instantiates.

## 5. Business Context

- Business problem: F4.1 is a distinct quality indicator with its own daily source file. It has a directory tree, a navigation entry, and a placeholder page, but no data path, no metric, and no screens. The Product Owner wants F4.1 delivered as a real operating module alongside F1.3.
- Business impact: extends the decision-support system from one indicator to two, and forces Import to become multi-indicator across both Huế and TCT.
- Approved business rule constraints — locked Product Owner decisions, recorded verbatim in checkpoint Section 3 and not extended:
  1. F4.1 uses the source column `Đánh giá (thời gian Có TMS PTC 8 giờ)`.
  2. Authoritative result `2.863 / 4.695 = 60,98%`; all `4.695` rows belong to the denominator.
  3. Analysis date comes from the file name, as in F1.3.
  4. Scope is `Dashboard`, `BCVH Ranking`, `Evidence`. No `Tuyến Ranking`.
  5. `Chậm nộp tiền` handling and acceptance follow F1.3 unchanged; nothing further inferred.
  6. `531120` is still stored and still counted in the module total, but hidden from `BCVH Ranking`.
  7. Import direction is multi-indicator, supporting Huế and TCT.
  8. A real F4.1 TCT source now exists at `Data DKCL/F4.1/Incoming/TCT` (remediation round).
  9. The official DKCL report/module name for F4.1 is `F4.1_Chất lượng phát thành công của bưu cục`, distinct from F1.3's `F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI` (remediation round).
  10. `admin` and `viewer` may view Dashboard, BCVH Ranking and Evidence; Import remains `admin`-only (remediation round).

## 6. Technical Context

Delta-only survey against baseline `c2f4bdd7` — full findings D-1..D-18 in checkpoint Sections 5-7. The load-bearing ones:

- No indicator abstraction exists: `danh_gia_2026` is hardwired in 20 backend files (138 occurrences), so F4.1 needs a parallel data path rather than a parameterization of F1.3.
- The F1.3 BCVH Ranking rate divides by `sl_bg_ptc` (rows with a PTC event). Applied to F4.1 that yields `64,29%`, contradicting the Product Owner's locked `60,98%`. The F4.1 contract divides by total rows.
- `backend/src/config/canonicalBcvhUnits.js` already freezes exactly the 6 real BCVH found in the F4.1 file, so hiding `531120` needs no new rule and no hardcoded code literal.
- `backend/src/services/excelParser.js` is not reusable — the F4.1 header set differs in spelling and content; `extractDateFromFilename` is regex-locked to `^F1\.3-`.
- `backend/src/services/importPipeline.js` hardcodes `../Data DKCL/F1.3`; `importWatcher.js` watches only that tree with `ignoreInitial: false`; the DKCL portal layer is name-locked to the F1.3 export.
- `Data DKCL/F4.1/{Incoming,Processed,Error}/{HUE,TCT}` already exists and holds `F4.1-2026.08.01.xlsx` under both `Incoming/HUE` and — since the remediation round — `Incoming/TCT`, both currently inert because the watcher never looks there.
- The F4.1 HUE source has no route column of any kind, so "no Tuyến Ranking" is data-enforced.
- Frontend `/f41` exists as an admin-only `Coming Soon` placeholder (`App.jsx`:101, `appNavigation.jsx`:45, `pages/F41Quality.jsx`); per decision 10 its gating widens to `admin` + `viewer` for the three view screens.

Added by the remediation round (checkpoint Sections 18-21):

- The F4.1 TCT workbook is **aggregate at reporting-unit level**, not row-level: `46` unit rows plus a grand-total row, with `Mã huyện` / `Mã BC` / `Ma KHL` NULL in every row and no `Số hiệu bưu gửi` column at all. Its layout is two header rows, a column-number legend row, the grand-total row, then the unit rows — so it needs a positional parser, and the grand-total row must be skipped on ingest or every national figure doubles. It therefore lands in its own additive table, not in `fact_f41`.
- Cross-lane check on the Huế row: all seven comparable evaluation measures match the row-level file exactly, including the PO-1 metric at `2.863`. The denominators do not: `4.684` (TCT) vs `4.695` (PO-locked), so the TCT lane publishes `61,12%` against the module's `60,98%`. The cause is not inferred — recorded as `Q-6`.
- The TCT file contains no date anywhere, so the file name is the only possible source of `ngay_do_kiem`, and no `Đạt`/`Không đạt` field, so Evidence and violation-reason classification stay HUE-only.
- `D-17` corrected: of the `251` blank-evaluation rows, `241` carry a return timestamp, `9` carry a PTC timestamp without a return or TMS scan, and `1` carries neither PTC nor return. Only the `241` are evidenced as returns; the remaining `10` are recorded as observed field patterns with no cause asserted.

## 7. Runtime Context

Not applicable — no runtime change was made, no server was started, and no Import was run. Both F4.1 source files were opened read-only for inventory; their SHA-256 values are recorded in checkpoint Sections 7 and 18 and both were re-verified unchanged after the audit (HUE `dcaae8e1…`, TCT `6256ef56…`). No file under `Data DKCL/` was created, moved, renamed, or modified.

## 8. Scope

In scope for this ticket: read-only survey, the plan checkpoint, this manifest, and governance sync.

Out of scope, explicitly: any product code, `backend/src/db/schema.sql`, the live database, the Import pipeline/watcher/portal layer, any F1.3 behavior or `fact_f13` data, any file operation under `Data DKCL/`, and any business rule beyond the seven locked decisions.

## 9. Related Review

- Review document: `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md`
- Review status: `PLAN COMPLETE / AWAITING PO APPROVAL`
- Key evidence: the reconciliation baseline in checkpoint Section 8 reproduces the Product Owner's `2.863 / 4.695 = 60,98%` exactly from the real source file, broken down per BCVH, and records the `4.694 / 60,97%` ranking subtotal that decision 6 necessarily creates. Section 19 adds an independent confirmation from the newly-supplied TCT report: its Huế row reports the same `2.863` for the PO-1 metric and matches the row-level file exactly on all seven comparable evaluation measures, while differing on the denominator.

## 10. Related PO Findings

None open. This ticket was activated from `NO ACTIVE TICKET / AWAITING PO DIRECTION`, not from a finding.

## 11. Documents To Update

- This manifest and the checkpoint, on Product Owner approval or on any change of plan.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — updated as part of this activation.
- On Phase 0 authorization: a new `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_.../` package instantiated from `_template_indicator`.

## 12. Validation

- Technical validation: not applicable — no code changed. Verification performed for this ticket was read-only: source-file inventory and aggregation reproducing the Product Owner's locked figures (checkpoint Sections 7-8), a static survey of the F1.3/Import code paths (checkpoint Sections 5-6), and — in the remediation round — a read-only audit of the TCT workbook covering sheets, merged-header layout, row grain, evaluation fields, dates, grand-total-vs-sum verification across all 17 numeric columns, duplicate check, and cross-lane reconciliation against the HUE file (checkpoint Sections 18-19), plus an exhaustive per-row re-audit of the 251 blank-evaluation rows (Section 21). Both source checksums re-verified unchanged afterwards.
- Runtime, browser, build/lint validation: not applicable — no code changed.

## 13. Expected Output

- What the ticket must achieve: a discovery-backed overall plan for F4.1, an evidence-verified reconciliation baseline, a locked data-contract proposal, a phase plan with PO gates, a risk register, and the explicit list of decisions the Product Owner must still make.
- What must remain unchanged: all product code, `fact_f13`, the F1.3 module and its frozen 41-column mapping, the Import pipeline and watcher, the live database, and every file under `Data DKCL/` and `Data QLML/`.
- What must not be introduced: any implementation, any inferred business rule, any second source of truth for the F4.1 metric.

## 14. Next Ticket

- Next ticket ID: none activated. The proposed successor is `F41-PHASE-0` (the F4.1 SSOT/reference package, documentation only), which requires explicit Product Owner authorization.
- Handoff notes: no phase is self-activated. `Q-1`, `Q-2` and `Q-3` are now `CLOSED` by decisions 8, 9 and 10; `Q-4` is `RESOLVED` as already answered by the data contract; `Q-5` is `NON-BLOCKING`. Nothing in the plan is now blocked on a Product Owner answer. One new, non-blocking question `Q-6` (the TCT denominator gap) must be answered before any screen shows a TCT-derived rate beside the module KPI, and the portal match string for F4.1 must be discovered — not guessed — by whichever phase touches portal sync.

## 15. PO Acceptance Checklist

Not applicable — `PO UI Check Required = No` for this planning ticket. What the Product Owner is asked to review is the plan itself: checkpoint Section 9 (data contract), Section 10 (phasing), Section 14 (risks) and Section 16 (Q-1..Q-5).

## 16. Authority Escalation

The two escalations raised in the first round are resolved: the F4.1 TCT lane (`Q-1`) now has a real source, audited read-only, and the report identity (`Q-2`) is supplied as decision 9.

Two items remain escalated rather than guessed:

1. The TCT lane's Huế denominator (`4.684`) does not equal the Product Owner-locked one (`4.695`) even though the numerator is identical, and the report's adjacent exclusion counters do not reconcile the gap by any single stated rule. No reconciling arithmetic is asserted — `Q-6`.
2. The official F4.1 report name from decision 9 is not the literal string the live sync code matches for F1.3 either, so the portal export/match string for F4.1 must be discovered on the portal before any sync code is written. No match string is inferred.

Everything else in the plan derives either from the ten locked Product Owner decisions or from verified code and file evidence.
