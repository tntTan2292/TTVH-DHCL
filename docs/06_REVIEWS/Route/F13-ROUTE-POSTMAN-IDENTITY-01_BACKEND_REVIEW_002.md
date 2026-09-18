# F13-ROUTE-POSTMAN-IDENTITY-01 — Independent Backend Review 002 (Phase 1–2)

- Ticket: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Reviewed commit: `4f339b1` (`feat(f13): implement route-postman identity Phase 1-2 and load real directory`), baseline `b15d648`
- Reviewer: Claude Code (Opus 5) — independent of the implementer (Claude Code / Sonnet 5)
- Date: 2026-09-18
- Mode: read-only. Read-only SQLite (`OPEN_READONLY`) on the live database and on the backup, production code paths exercised on an isolated temp database, test runs. No source, schema or database change; no Browser/Playwright. Live row counts before and after this review are identical (`dm_buu_ta` 198, `dm_buu_ta_event` 198, `fact_f13` 817,115, `network_delivery_point` 440,091).

## 1. Verdict — plain language

**BLOCKED — một lỗi phải sửa trước khi làm giao diện (Phase 3).**

Phần danh bạ bưu tá (Phase 1) làm đúng: 198 bưu tá vào đúng, không lưu thông tin cá nhân thừa, nạp lại file không sinh trùng, xung đột – lịch sử – khôi phục chạy đúng, phân quyền đúng. Phần hiển thị bưu tá trên bảng xếp hạng (Phase 2) có **một lỗi thật**: khi trên cùng một tuyến, cùng một ngày có **từ 2 bưu tá trở lên mà cả hai đều chưa có tên trong danh bạ**, hệ thống gộp họ thành một dòng — một mã bưu tá biến mất và số bưu gửi của người đó bị cộng nhầm sang người kia. Điều này vi phạm đúng nguyên tắc D2 mà PO đã chốt là "giữ đủ từng bưu tá". Lỗi xảy ra ở **232 trên 9.269 lượt (tuyến × ngày)**, tức khoảng 2,5%, liên quan 501 lượt mã bưu tá.

Xếp hạng và KPI F1.3 **không bị ảnh hưởng** — đã đối chiếu số liệu và không có thay đổi nào ngoài việc thêm trường mới.

## 2. What was verified, and how

| # | PO question | Result | Evidence |
| --- | --- | --- | --- |
| 1 | 198 bưu tá nạp đúng | **PASS** | Live DB has 198 rows / 198 distinct codes / 198 `INSERT` events in 1 batch / 0 conflicts. Re-parsed the source file independently: 198 valid rows; 0 missing in DB, 0 extra in DB, 0 name mismatches, 0 BCVH mismatches |
| 2 | Không lưu SĐT / HRM / hợp đồng | **PASS** | `dm_buu_ta` has only the 5 business fields + source/update metadata. Independent leak scan comparing every stored value **and every before/after JSON image in `dm_buu_ta_event`** against every phone number, HRM code, contract type and job title in the file: **0 matches** |
| 3 | Nạp lại không tạo trùng | **PASS** | Independent rerun of the production classify/apply path on an isolated DB: 2nd import of the same file = 198 `unchanged`, 0 inserted/updated; row count stays 198, event count stays 198 |
| 4 | Xung đột (D1) | **PASS** | Manual name → re-import with a different name: no overwrite (stored name stays `MANUAL`), 1 `OPEN` conflict raised showing both names. `KEPT_MANUAL` keeps the manual name; `APPLIED_FILE` writes the file's name and returns ownership to `IMPORT` |
| 5 | Mã vắng mặt trong file mới (D3) | **PASS** | Subset import of 190/198: the 8 absent codes are **kept** and flagged `in_latest_import = 0`; nothing deleted |
| 6 | Lịch sử và khôi phục | **PASS** | Rollback of the subset batch restored all 8 flags; rolling back an older batch that later batches touched is correctly **refused** (`BLOCKED_BY_LATER_BATCH`), not forced |
| 7 | Quyền viewer / admin | **PASS** | Ran the real auth middleware chain for all 9 new endpoints. Viewer: allowed on the 3 read endpoints, **HTTP 403 on all 6 write/history endpoints**. Admin: allowed on all |
| 8 | Ranking ngày trả đúng bưu tá của ngày đánh giá | **PARTIAL — see B1** | 2026-08-17 / BCVH 533140: all rows anchored to the requested date; postmen match raw data for **30/31** routes; the 31st is defect B1. Names match `dm_buu_ta` exactly (0 mismatches), joined by code only |
| 9 | Ranking theo kỳ | **PASS on anchoring** (same B1 risk) | Period response anchors `postman_anchor_date` to its own `anchor_date` (2026-09-17), every row anchored to that one date, postman counts equal that date's raw data (0 deviations). It calls the same function, so B1 applies there too |
| 10 | Nhiều bưu tá cùng tuyến/ngày được giữ | **PARTIAL — see B1** | 7 routes with 2–9 postmen kept in full on the sample date; but two *unnamed* postmen on one route are merged |
| 11 | Không đổi KPI / xếp hạng F1.3 | **PASS** | Diff is additive only (`postman_anchor_date`, `postman_status`, `postmen[]`); `buu_ta: null` kept. Recomputed `total_bg` / `passed` straight from `fact_f13`: agrees for **31/31** routes. Full backend suite passes all existing ranking/period tests |
| 12 | Index mới nhanh hơn và không sai dữ liệu | **PASS** | Same query on the live DB, busiest date: **15–24 ms with the index vs 102–106 ms without** (`NOT INDEXED`), ~5–7× faster, and the two result sets are **byte-identical** |
| 13 | 4 test chưa đạt: lỗi cũ hay hồi quy mới | **PASS — all 4 are pre-existing** | See Section 3 |
| 14 | Backup có khôi phục được không | **PASS** | See Section 4 |
| 15 | Nạp 198 bưu tá sang DB/máy khác | **Answered** | See Section 5 |

## 3. The 4 failing tests — baseline vs this commit

Run under identical conditions (`node --experimental-sqlite --test`): commit `4f339b1` = **385/389 pass, 4 fail**; the same 4 also fail on baseline `b15d648` (extracted and run separately). Test count rises 357 → 389, i.e. the 32 new tests all pass.

| Failing test | File | Reason | Verdict |
| --- | --- | --- | --- |
| live KPI database and HTTP payloads stay aligned… | `DashboardController.r6.integration.test.js` | `fetch failed` — needs a backend server already listening | Pre-existing / environmental |
| dashboard KPI invalid code returns HTTP 400 | `DashboardController.r6.integration.test.js` | `fetch failed` | Pre-existing / environmental |
| KPI all and missing ma_bcvh normalize… | `DashboardController.recovery.test.js` | assertion `12 !== 3` (the mocked repository is called more often than the test expects) | Pre-existing; fails identically on baseline |
| monthly rank enrichment uses full prior months… | `timelineService.recovery.test.js` | source-text regex no longer matches `timelineService.js` | Pre-existing (already registered under `F13-DASHBOARD-RECOVERY-DEFECTS-01`) |

Proof that the last two cannot be caused by this commit: the four files involved are byte-identical at both commits (`timelineService.js`, `timelineService.recovery.test.js`, `DashboardController.js`, `DashboardController.r6.integration.test.js` — same git blob hashes), and none of them imports anything this commit changed.

**Doc correction:** the manifest says "3 `DashboardController.r6.integration.test.js`". It is 2 from that file plus 1 from `DashboardController.recovery.test.js`.

## 4. Backup

`backend/src/db/backups/database.pre-f13-route-postman-identity-01-phase1-migration.2026-09-18T03.sqlite`, 1.12 GB, written 2026-09-18T03:29Z.

- `PRAGMA integrity_check` = **ok** (opened read-only, not modified).
- Contents match the live database before the change: `fact_f13` 817,115 (same as live), `network_delivery_point` 440,091 (same as live), 26 tables.
- It is genuinely a *pre-migration* snapshot: it contains **no** `dm_buu_ta` table and **no** `idx_network_delivery_point_route_day`.
- Restore procedure is the documented one (stop backend, replace `database.sqlite`, restart). **Consequence to note:** restoring this file removes the postman directory as well, so the 198 rows must be re-imported afterwards (Section 5). Startup migration recreates the empty tables automatically.

## 5. Deploying the 198 postmen to another database / machine

- **Schema** travels with the code: `schema.sql` contains the three tables and the index for a fresh database, and `server.js` runs the idempotent migration on every startup, so an existing database self-heals.
- **Data does not travel with the code.** `dm_buu_ta` rows are not in git and not seeded by `schema.sql`. The source file `2026.09.17 - DB Buu ta.xls` *is* committed in the repository root.
- On a new machine or a restored database, the 198 rows are loaded by running, from `backend/`:

```bash
node scripts/import_real_dm_buu_ta.js --dry-run
```

then the same command with `--confirm`. It is safe to repeat: a second run classifies everything as `unchanged` (verified). Once Phase 3 ships, the same thing is possible from the admin UI's import dialog.
- Two caveats: the script hard-codes a `records.length === 198` gate, so a future directory file with a different row count will abort it (use the API/UI path instead); and it writes to whichever database `backend/src/config/db.js` resolves — always take a backup first, as was done here.

## 6. Findings

### B1 — BLOCKING: two unnamed postmen on the same route/day are merged into one

`backend/src/services/postmanRankingService.js` groups with `GROUP BY route_po_code, ma_buu_ta`. `ma_buu_ta` is both the SELECT alias for `UPPER(TRIM(dp.postman_code))` **and** a real column of the joined `dm_buu_ta` table; SQLite resolves it to the joined table's column, which is `NULL` for any code not yet in the directory. All unnamed codes on a route therefore fall into a single `NULL` group.

Live evidence, route `533140131` on `2026-08-17`:

- shipped query: `53A152` with `item_count = 82`, and `53B246` **absent**;
- same query grouped by the explicit expressions: `53A152 = 65` **and** `53B246 = 17` (65 + 17 = 82).

Impact across the live database: **232 of 9,269 (date, route) pairs** contain 2 or more codes missing from the directory — 501 code occurrences — and on every one of those pairs at least one postman code disappears from the display and another's item count is inflated. The period view calls the same function and inherits the defect. `bcvh_mismatch` is aggregated in the same collapsed group, so its flag is unreliable there too.

Why the tests missed it: `postmanRankingService.test.js` covers "two postmen on one route" with **both codes named**, and "unnamed code" with a route that has only one postman. No fixture has two unnamed codes on the same route. A fix must add that case.

Direction (not applied here): group by the explicit expressions (or give the joined column a distinct alias) so the grouping key is always the delivery row's postman code. This is display-only code — no KPI, no stored data, no schema change — so the fix is small and its blast radius is contained; the 198 loaded rows are unaffected.

### M2 — file no longer refreshes BCVH/status for hand-edited records

Design of Record v2 §7 says BCVH and status from a new file always refresh (they carry no name conflict). In `postmanCatalogImport.js` a `MANUAL` record keeps its stored BCVH and status, so a postman who moves office keeps the old office until someone edits it. Either the code or §7 should change; this is a documentation-vs-code divergence, not a data risk.

### M3 — rollback does not clear conflicts, and conflict events reuse the import's batch id

Rolling back an import batch restores `dm_buu_ta`, but any `OPEN` row that batch wrote into `dm_buu_ta_conflict` stays open, referring to a batch that no longer applies. Separately, `resolveConflict` logs its `RESOLVE_CONFLICT` event under the *original import's* `batch_id`, which mixes a later human decision into the history of an earlier file import and makes that import's rollback set larger than the import itself. Both are traceability issues, not data loss.

### M4 — migration is not standalone-safe on an empty database

`migrate_f13_route_postman_identity_phase1_schema.js` states it is "safe to run against the live operational database", which holds. But run against an *empty* database on its own it fails (`SQLITE_ERROR: no such table: network_delivery_point`) because it creates the ranking index. In the real paths this never happens — `schema.sql` defines the index after the table, and the startup chain creates `network_delivery_point` first — so this is a robustness/wording issue for future deployments.

### M5 — manifest wording

Section 11's "3 `DashboardController.r6.integration.test.js`" is inaccurate (Section 3 above). Worth correcting when the manifest is next touched.

## 7. What has to happen next

1. Fix **B1** and add a regression test with two unnamed postmen on one route/day (Claude Code, small backend-only change).
2. Re-run the postman ranking tests and re-check one affected live route (e.g. `533140131` / `2026-08-17` must show `53A152 = 65` and `53B246 = 17`).
3. Decide M2 (code or document), and optionally clean up M3–M5.
4. Only then start Phase 3 UI — otherwise the UI will faithfully display a merged, wrong list of postmen.

Phase 1 (directory, permissions, history, rollback, real data load) needs no rework from this review. Phase 4 and Phase 5 remain blocked on the PO's inputs, unchanged.
