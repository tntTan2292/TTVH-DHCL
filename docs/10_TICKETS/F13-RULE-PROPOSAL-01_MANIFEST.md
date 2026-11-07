# F13-RULE-PROPOSAL-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-RULE-PROPOSAL-01` (gap G3 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`)
- Name: `F1.3 "Đề xuất quy tắc": Chuyên quản corrections grouped as proposals, approved or rejected by the PO`
- Owner: Claude Code / Opus 5.5 (scope, review, real render). **B1 backend: Claude Code / Sonnet 5.5. U1 screen: Antigravity** (after B1 is accepted). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- **Status: `B1 + U1 DONE, real render passed (section 8) - READY FOR PO CHECK after the next backend restart`** (the table and endpoints exist only after the restart). `PO UI Check Required = Yes`.

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

## 6. B1 results (Claude Code / Sonnet 5.5, 2026-11-07)

- **Table**: `f13_rule_proposal_decision` + 2 triggers (UPDATE / DELETE refused) in `backend/migrate_f13_rule_proposal_01_schema.js`; applied at startup (2 lines added to `backend/server.js`, after `applyF13Evidence01Schema`). Not applied to the live database; the table appears at the next restart.
- **Capabilities** `f13.rule.view`, `f13.rule.decide` in `roles.js`, ADMIN position only. No existing capability test needed changing (none pins the admin list).
- **Service** `RuleProposalService.js`. `proposal_key` = `status|cause-or-reason|detail>chosen|phat` (`~` = empty; system side takes the cause code when status is CAUSE, else the reason). Grouping reads the latest `f13_analysis_log` row per parcel; "differs from system" = `cause_code <> system_line` recorded in that row. "Still has the system conclusion" compares the log snapshot with `f13_cause_parcel` now (`still_system_conclusion` count).
- **Endpoints** (only `f13v2RuleProposalRoutes.js`): `GET /?status=`, `GET /:key` (samples <= 20, decision history, `ready_text` while APPROVED), `POST /:key/decisions`. Keys must be URL-encoded (`|` and `>`).
- **Decision rules chosen by me, for review**: note mandatory for APPROVE / REJECT; APPLIED needs `ticket_id` and the current status APPROVED (409 `NOT_APPROVED` otherwise); a key with no current group is 404 for a new decision; a past decision on a key whose group vanished is still readable via `GET /:key` (`active: false`). Snapshot stores parcels, bcvh, analysts, first/last date, still_system_conclusion.
- **Tests** (all run with `--experimental-sqlite`, one file at a time): `src/routes/f13v2RuleProposal.test.js` 8/8 (capability, empty log, 403 for CHUYEN_QUAN / GD_BCVH / LD_BDTP / GD_TTVH / STAFF, grouping with a twice-analysed parcel and an equal-to-system choice, decision rules, append-only chain and triggers, analysis log unchanged); `migrate_f13_rule_proposal_01_schema.test.js` 2/2. Neighbours unchanged: evidence migration 2/2, `server.startupMigrations` 1/1, `f13v2Evidence` 16/16, `adminUserRoutes` 3/3, `resolveAccess` 10/10, `handling` 21/21.
- **Not done / for Opus**: no real-data run (the live table does not exist yet); no frontend (U1).

## 7. Opus review of B1 (2026-11-07, Claude Code / Opus 5.5; commit `f7e4f4c4`)

**Verdict: B1 ACCEPTED.** P1-P5 implemented as written; no write outside the new table; nothing changes a figure.

Checked independently:
- **Grouping (P1).** Latest row per parcel (`MAX(id)` on `ngay_do_kiem` + `ma_bg`); "differs" = `cause_code IS NOT COALESCE(system_line, '')`, the same codes `EvidenceService.record` uses for its "different choice" rule (`system.line !== cause.code`), so a proposal is exactly a choice that needed a "khác hệ thống" note. A parcel the system left to the Chuyên quản (`system_line` null) always forms a proposal, which is the case that matters most. `PHAT_KHONG_CHI_TIET` (B1-R2 of F13-EVIDENCE-01) also forms one, accepted: the analyst states the Phát detail.
- **Key.** `status|cause-or-reason|detail>chosen|phat`, `~` for empty, parsed back by a strict pattern (no `|` or `>` inside a part: all parts are codes). Express decodes `:key`, so the client must send `encodeURIComponent(key)`.
- **Decisions (P3, P4).** Append-only table with UPDATE / DELETE triggers and a CHECK on the three values; latest row = current, `supersedes_id` set; note mandatory for APPROVE and REJECT (confirmed), APPLIED needs a ticket and a current APPROVE (409 otherwise, confirmed); snapshot of the counts at decision time; `ready_text` only while approved. Startup migration after the evidence one, idempotent.
- **Access (P5).** `f13.rule.view` / `f13.rule.decide` on ADMIN only; router mounted under `f13v2Routes` (auth, module, scope); 403 for every other position in the tests.
- Suites rerun one file at a time with `--experimental-sqlite`: `f13v2RuleProposal` 8/8, `migrate_f13_rule_proposal_01_schema` 2/2, `f13v2Evidence` 16/16, `resolveAccess` 10/10, `server.startupMigrations` 1/1.

| ID | Level | Finding | Resolution |
|---|---|---|---|
| R-R1 | Low | A proposal also counts parcels whose verdict became Đạt or whose system conclusion changed after a rebuild; `still_system_conclusion` shows how many still match. | Accepted; U1 shows "còn giữ kết luận hệ thống x / n" beside the count so the PO decides on the current picture. |
| R-R2 | Info | Keys hold `|` and `>`. | U1 always encodes the key in the URL. |
| R-R3 | Info | A decision on a proposal with no current parcel returns 404 (`active: false` stays readable). | Accepted. |

Live: the table and the endpoints appear at the next backend restart, done once with G0 and G2 after their reviews (plan F13-GOLIVE-PLAN-01). U1 can start now on the B1 contract.

## 8. Real render of U1 (2026-11-07, Claude Code / Opus 5.5; commit `3a7ee9f7` + review fixes)

Isolated 5051/5199 with the real `f13v2Routes` (rule proposal migration applied, seeded log: 6 parcels "Chờ CQ - Thiếu mốc G" -> Khai thác on 2 BCVH, 1 parcel Khai thác -> Chậm giao bưu tá, 1 choice equal to the system); no live login.
- Access: Chuyên quản and Lãnh đạo BĐTP do not see the menu item and are sent to `/unauthorized`; the admin sees it.
- List: tabs Chờ duyệt 2 / Đã duyệt 0 / Không duyệt 0 / Đã áp dụng 0; rows 6 BG (2 BCVH, "còn giữ kết luận hệ thống 6 / 6") and 1 BG; the equal choice is not a proposal. Same as the seed.
- Flow: Duyệt with a note -> tabs 1 / 1, ready text with Sao chép, history "Đã duyệt" with the snapshot; then "Đã áp dụng" with ticket F13-WHY-DATA-04 -> history shows both decisions. No failed call, no page error.

Fixed in the review (Claude Code / Opus, small display points): raw proposal key removed from the table and the detail header; English subtitle and "Product Owner" / "(ready text)" wording replaced; times shown dd/mm/yyyy HH:mm on the Vietnam clock (`formatDecisionTime`); BCVH names instead of codes (`formatBcvhName`); breadcrumb "Đề xuất quy tắc" instead of the slug; purple ticket badge to blue (report standard); the decision form is cleared after a decision. Tests: `f13RuleProposal*` 15/15 (one new), navigation / auth 26/26, oxlint clean on the touched files.
