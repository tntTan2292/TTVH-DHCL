# F13-RULE-PROPOSAL-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-RULE-PROPOSAL-01` (gap G3 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 "Đề xuất quy tắc": Chuyên quản corrections grouped as proposals, approved or rejected by the PO`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- **Status: `READY FOR SONNET (B1)`**. `PO UI Check Required = Yes` (after U1).

## 2. PO decisions

- F13-WHY-DATA-02 E8 (2026-11-05): Chuyên quản corrections are kept, proposed as rules, approved by the PO; only an approved rule changes the system figures.
- 2026-11-07: build it now, before the official start, even with an empty log.

| ID | Decision (technical reading, Opus) |
|---|---|
| P1 | A **proposal** = the current analyses (`MAX(id)` per parcel in `f13_analysis_log`) whose choice differs from the system conclusion, grouped by (system status, system cause or reason, system Phát detail) -> (chosen cause, chosen Phát detail). |
| P2 | Each proposal shows: count of parcels, count of BCVH and analysts, first / last date, up to 20 sample parcels with the analyst note, and whether the parcels still have that system conclusion (a rebuild may have changed it). |
| P3 | Only the PO decides: **Duyệt** or **Không duyệt**, note mandatory. Decisions are append-only (a new decision supersedes the previous one of the same proposal); the counts at decision time are stored. |
| P4 | An approved proposal does **not** change any figure by itself: it is listed as "Đã duyệt - chờ chuyển thành quy tắc" with a ready text (proposal, counts, samples, note) that the CTO turns into a rule ticket like F13-WHY-DATA-03. When that ticket ships, the proposal is marked "Đã áp dụng" with the ticket id. |
| P5 | Who sees it: the admin tier (the PO's account). Chuyên quản / GĐ BCVH do not see the page. |

## 3. B1 backend (Sonnet) - technical scope

- New append-only table `f13_rule_proposal_decision` (`id`, `proposal_key`, `decision` APPROVE / REJECT / APPLIED, `note`, `ticket_id`, `snapshot_json`, `actor_id`, `actor_name`, `created_at`, `supersedes_id`) with BEFORE UPDATE / DELETE triggers like `f13_analysis_log`; migration script `backend/migrate_f13_rule_proposal_01_schema.js` applied at startup like `migrate_f13_evidence_01_schema`. `f13_analysis_log` is read only.
- `proposal_key` = a stable string of the P1 grouping fields.
- Capabilities `f13.rule.view` and `f13.rule.decide` in `services/auth/access/roles.js`, admin tier only (update the exact-list tests that pin capabilities, as F13-EVIDENCE-01 did).
- Service `backend/src/services/f13v2/RuleProposalService.js`; handlers **only in `backend/src/routes/f13v2RuleProposalRoutes.js`** (already mounted at `/api/f13/v2/rule-proposals`). Endpoints: `GET /` (proposals with P2 fields and the current decision; filter by status), `GET /:key` (detail with samples and decision history), `POST /:key/decisions` (P3; APPLIED needs `ticket_id`). Do not edit `f13v2Routes.js`, `F13V2Controller.js`, `JourneyService.js`, `CauseClassifier.js`, `f13CauseConfig.js`, `f13WhyHelpers.js`, `f13v2CapacityRoutes.js` (other sessions).
- Tests: grouping on a seeded log (same parcel analysed twice: only the latest counts; a choice equal to the system is not a proposal), decision rules (note mandatory, APPLIED needs a ticket, append-only triggers), capability 403 for a Chuyên quản account, empty log returns an empty list.
- Restrictions: no write outside the new table; no build on the live database; no restart (the table appears at the next restart, done by Opus after review). Commit by pathspec only (never `User QIS.xlsx`, `.claude/skills/`, `graphify-out/`, `.graphifyignore`). Backend suites with `--experimental-sqlite`, one file at a time.

## 4. U1 screen (Antigravity, after B1 accepted)

Page "Đề xuất quy tắc" in the F1.3 menu for the admin tier: list by status (Chờ duyệt / Đã duyệt / Không duyệt / Đã áp dụng), detail with samples, Duyệt / Không duyệt with a note, copy of the ready text. Written in detail after B1.

## 5. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 after the PO approved the plan.
