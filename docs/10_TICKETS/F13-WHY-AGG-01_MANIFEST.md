# F13-WHY-AGG-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-AGG-01`
- Name: `F1.3 "TẠI SAO": shared cause aggregation layer (per-parcel derived table, freshness, query layer)`
- Programme: F1.3 cause rebuild. Predecessor `F13-WHY-DATA-01` (CLOSED / PO UI PASS, commits `c8b24977`, `7ae159d2`). Next tickets in the agreed order (PO + ChatGPT, 2026-11-05): Hành trình page (cause, flags, hints, filters; UI by Antigravity), Phân tích tuyến phát, Năng lực và chất lượng tuyến (needs a PO definition first), Dữ liệu minh chứng, NARRATIVE, RETIRE.
- Owner: `Claude Code` (backend, data, tests, documentation, Git). Model discipline: Sonnet 5.5 implements; **Opus reviews independently** (high risk: new derived table, background job); the same model does not self-approve.
- Branch: `codex/da-impl-006` (as `PROJECT_SNAPSHOT.md`).
- **Status: `PO-APPROVED DESIGN / NOT ACTIVATED`.** The Design of Record v2 (with section 6A and Appendix D) was approved by the PO on 2026-11-05. Implementation starts only after the PO activates this ticket (section 10). Until then no code, table, migration or commit.
- Relation to `PROJECT_SNAPSHOT.md`: Current Ticket is `F13-ROUTE-POSTMAN-IDENTITY-01` (PAUSED by PO decision). This ticket does **not** replace it and does **not** reactivate it (the same arrangement as `F13-WHY-DATA-01`: "does not change Current Ticket"). On activation the snapshot only receives a "Previous update" line; the PAUSED state of the postman-identity ticket is untouched.

## 2. Authority and sources

- Design of Record (approved): `docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md`. It decides: the derived table `f13_cause_parcel` and companions, the formulas (denominator = all F1.3 rows; shortfall in tenths; own shortfall versus net contribution), the three route scopes `POSTMAN` / `NON_POSTMAN` / `OTHER`, the first-handover postman as the analysis dimension (the postman shown on Hành trình is stored beside), BG-day rows as the basis of every headline figure (distinct parcels for information only, section 6A), the refresh rules, the tests (section 11).
- Business rules (locked, not reopened here): `docs/10_TICKETS/F13-WHY-DATA-01_MANIFEST.md` (cause tree, night rule C, limit, `UNLOCATED_TCT_EXCLUSION`, F4.1 key, first handover, Không trọn lô over the whole lot). Official F1.3 results, formulas and verdicts are never changed.
- PO decisions of 2026-11-04 that stay: hot spots rank by parcels missing against 90 %; Chuyên quản and Giám đốc BCVH see the same figures with the postman name; tồn / hoàn is a hint, not a cause; no blame on a person or unit before the ĐTC2 level-2 deadlines exist.

## 3. Required Reading (GitHub Blob, branch `codex/da-impl-006`)

Files committed on the branch:
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-WHY-DATA-01_MANIFEST.md
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/04_TECHNICAL_PLANNING/Feature/PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/04_TECHNICAL_PLANNING/Feature/F13-V2-STRUCTURE-01_DESIGN.md
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md (carried by the later UI tickets, not applied here)
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/aggMaintenance.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/aggReadPolicy.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/f13v2/JourneyService.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/f13v2/CauseClassifier.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/repositories/FactBuuGuiRepository.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/config/f13RouteClassificationCatalog.js

Not yet on the branch (committed together with this manifest when the PO activates; until then read them from the workspace): `docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md` -> `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md`.

## 4. Scope

**In scope.** Backend only, F1.3 only:
1. Table `f13_cause_parcel`, companions `f13_cause_day` (per-day input signature, classifier version, state, error) and `f13_cause_run` (run log); additive creation at startup, like the `agg_*` tables; builder through the existing `JourneyService._parcels` path (no second copy of the rules); tool `scripts/f13_cause_tool.js build | rebuild | verify --from --to`.
2. Query layer `/api/f13/v2/why/{summary,bcvh,routes,postmen,parcels}` with the common filter (`from`/`to`, `week`, `month`, `bcvh`), drill-down BCVH -> route -> postman -> BG, `meta.freshness`, `meta.repeats`, scope rules as Journey.
3. Background refresh after imports with the rules of Design section 8 (single runner, queue, per-day transaction, retry, resume, log, read-time freshness).
4. Tests, reconciliation with the official figures, documentation.

**Out of scope.** Any screen; F4.1 or any other indicator; any change to the cause rules, thresholds or the official F1.3 numbers; the definition of "năng lực tuyến"; a verdict or cause per distinct parcel; narrative sentences; retiring old pages; touching `F13-ROUTE-POSTMAN-IDENTITY-01`.

## 5. Phases (each can be verified alone; stop and report after each)

| Phase | Content | Acceptance criteria | Test evidence |
|---|---|---|---|
| **P1 Table and builder** | tables, builder, signature, `build/rebuild/verify` tool | (a) creation is idempotent and additive; (b) builder rows equal `_parcels` output for every field it stores on 7 sampled days; (c) a day rebuilt twice gives the same rows; (d) a failing day keeps its old rows; (e) `verify` reports 0 differences of rows, Đạt, KĐ, blank per day and BCVH against `fact_f13` and `agg_f13_day`; (f) re-import of a day with changed or removed parcels leaves no orphan row | unit tests with fake repositories; a run on a **copy** of the real database for 22-28/10/2026 (six BCVH: 23 098 rows, 14 027 Đạt, 7 738 KĐ, 1 333 unrated; cause counts equal the Phase 4 figures of F13-WHY-DATA-01, e.g. 449 Không trọn lô, 596 chưa đủ căn cứ) and the time per day |
| **P2 Query layer** | endpoints, scope, formulas | (a) BCVH = POSTMAN + NON_POSTMAN + OTHER routes; BCVH = sum of postmen (first handover) + "Chưa có bưu tá", for N, Đạt, KĐ, unrated and `shortfall_x10`; (b) cause lines + "chưa đủ căn cứ" = KĐ at every level; (c) rows of `parcels` = the figure they were opened from; (d) rate = sum of Đạt / sum of rows; `own_shortfall` / `net_contribution` / shares as Design section 6, no rounding before a sum; (e) `meta.repeats` and `distinct_bg` as section 6A, children not summed for distinct counts; (f) a `bcvh` account never receives a city total; a filter outside its scope is rejected | tests for each item incl. the April fixture (parcels on 09/04 and 10/04); equality with `agg_f13_day`, `getBcvhRanking` and `getRouteRanking` (with the confirmed non-postman list) on the week 43 and October figures of Design Appendix A and D |
| **P3 Refresh** | hook after imports, runner, log, freshness | (a) the window constants are those of `JourneyService` (test fails if they differ) and an import of day X marks `X-5..X+10` (`X-6` for BF Phát); (b) a second request while a run is active joins it, never runs in parallel; (c) crash and restart resume the missing and stale days; (d) a stale or missing day is reported in `meta.freshness`, never as complete; (e) a classifier-version change marks all days stale; (f) shadow comparison against the on-the-fly path on a sample of days: 0 difference | tests; run log extract of an import-triggered refresh on the copy |
| **P4 Verification and handoff** | week 43, October 2026 and April 2026 | the totals equal the official F1.3 for every BCVH, week and month tested; every figure is traceable to its BG list; Opus independent review has no open blocker; documentation synchronised | reconciliation report (Appendix A / D style) for week 43, October and April, SHA-256 of the evidence files; Opus review note |

## 6. Technical, runtime and testing requirements

- Read only against the detail tables; the only writes are to the three derived tables; the official tables are never modified. No change of the import flow except enqueueing a refresh after its commit.
- Node `--experimental-sqlite` for the backend suites; the five f13v2 suites plus the new ones must stay green; run root `test_*.js` files one by one when touched (the default sweep skips them).
- Real-data runs first on a copy of the database (4 GB, shared worktree: no destructive operation, no `checkout`, `reset`, `stash`, `clean`). The first production build and the backend restart are done by Claude Code **only after** P4 passes and the PO agrees (ops steps are done for the PO).
- No UI, no new route in the frontend, no browser. Antigravity is not involved in this ticket.
- Risk register: Design section 13.

## 7. Documentation to update

`PROJECT_PROGRESS.md` (one new line when the ticket closes or is activated), `DOCUMENT_INDEX.md` (this manifest and the Design are registered), `PROJECT_SNAPSHOT.md` ("Previous update" line, Current Ticket unchanged), this manifest (results per phase), the Design of Record (only to record a PO-approved change), memory / skill notes if a business fact changes. `CLAUDE.md` needs no change.

## 8. Completion and handoff

`PO UI Check Required = No` (backend only). Completion: P1-P4 accepted as above, Opus review closed, evidence recorded, one commit per phase or one per ticket by pathspec (files of the ticket only; never `User QIS.xlsx`, `.claude/skills/`, `exports/`), pushed and the remote hash verified, report as a Technical Execution Report. The PO accepts on the reconciliation report (no screen to check). Next ticket: the Hành trình page showing cause, flags, hints and filters from this layer (UI by Antigravity, report-block standard applies).

## 9. Blockers

None for the design. One governance condition: activation by the PO (section 10).

## 10. Activation

Requires, from the PO, in chat: "activate F13-WHY-AGG-01" (and, if the PO wants the Current Ticket of the snapshot changed instead of keeping it, an explicit decision on the paused `F13-ROUTE-POSTMAN-IDENTITY-01`). Without it, only this manifest and the Design exist.

## 11. Change log

- 2026-11-05: manifest prepared after PO approval of the Design of Record v2 (not activated).
