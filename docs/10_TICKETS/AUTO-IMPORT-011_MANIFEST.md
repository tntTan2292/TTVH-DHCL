# AUTO-IMPORT-011 Manifest

- Ticket ID: `AUTO-IMPORT-011`
- Ticket Name: `Emergency — 2098 future-date import recurrence and HUE/TCT browser-open failure`
- Phase: `Emergency remediation`
- Current State: `COMPLETED / PO RUNTIME PASS / CLOSED`
- Technical Status: `FUTURE-DATE VALIDATION BUG FIXED AND VERIFIED (AUTO-IMPORT-011); TEST-ISOLATION DEFECT FIXED AND VERIFIED (AUTO-IMPORT-012); SYMPTOM B RECOVERED AFTER SERVER RESTART, TECHNICAL ROOT CAUSE NOT DETERMINED, NO CODE FIX APPLIED`
- PO UI Check Required: `Yes — satisfied. Product Owner confirmed HUE and TCT browser login opened, authenticated, and imported successfully after a server restart.`
- PO Product Status: `PO RUNTIME PASS`
- Activation date: `2026-08-05`
- Closure date: `2026-08-05`
- Primary executor: `Claude Code`

## Fresh-Chat Onboarding Authority

This ticket is `CLOSED`. It is no longer part of the fresh onboarding chain; fresh onboarding now resolves through `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`.

Historical onboarding chain used while this ticket was active:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-011_MANIFEST.md`
5. Required Reading from this manifest

Closure checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_002.md`

Required Reading (historical, for anyone reviewing this closed ticket):

- `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_001.md` — Symptom A root cause, fix, and self-inflicted test-pollution disclosure
- `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_002.md` — PO runtime closure evidence and Symptom B final state
- `docs/10_TICKETS/AUTO-IMPORT-012_MANIFEST.md` — the test-isolation follow-up fix, `COMPLETED / TECHNICAL PASS`

## Authority

Emergency ticket activated directly by Product Owner priority directive, `2026-08-05`. Does not reopen `AUTO-IMPORT-010` (closed `2026-07-31`, unrelated defect class) or `F13-DATA-2098-CLEANUP-IMPL` (closed `2026-08-04`, database-only cleanup of a prior, separate occurrence — did not touch the file system or code, so it could not have prevented this recurrence).

`NETWORK-MANAGEMENT-001` (previous Current Ticket) is paused, not abandoned: Phase 1 remains `COMPLETED / TECHNICAL PASS`, awaiting PO Gate 1, unaffected by this emergency ticket.

## Objective

Investigate and remediate two independently-reported production symptoms on the Product Owner's machine:

- **Symptom A**: every morning, the system detects/imports `F1.3-2098.02.18.xlsx` (date `2098-02-18`), and the UI reports `Source unresolved: No linked HUE fact rows, TCT processed path, or accepted TCT national success evidence.`
- **Symptom B**: both HUE and TCT interactive login stop at `Đang mở trình duyệt / WAITING_FOR_LOGIN`, but no browser window appears.

Per explicit instruction, the two symptoms are not assumed to share a root cause, and none was found to be shared.

## Symptom A — Root Cause (Proven, Fixed)

**Direct cause**: `backend/src/services/importProcessor.js`, function `validateFactF13BusinessDate` (line 72). The future-date rejection guard read:

```js
} else if (ngay_do_kiem > businessCurrentDate && !ngay_do_kiem.startsWith('2098') && process.env.NODE_ENV !== 'test') {
```

Any date beginning with `2098` was **unconditionally** exempt from `FUTURE_DATE` rejection, in every environment including production — not gated to test mode. This bypass was originally added so unit tests could use `2098-xx-xx` as a safe, collision-free future-date fixture, but it was written directly into the production validation function rather than behind a test-only flag.

**Reproduction**: `node backend/test_importProcessor.js` TEST 3B (`Future import date rejected before fact_f13 write`) failed before the fix — the test asserts a `2098` import must throw `INVALID_FACT_F13_IMPORT_DATE`; the buggy code let it through instead.

**Live evidence**:

- File: `Data DKCL/F1.3/Processed/HUE/F1.3-2098.02.18.xlsx` — a **synthetic test fixture** (rows `Số hiệu bưu gửi = AUTO002_0001/0002`, `Tên BC phát = BCVH TEST`), not real DKCL portal data. Original birth timestamp `2026-07-30 14:23:13` (captured before this ticket's own test runs later overwrote it — see Residuals).
- `import_log` row `id=1090`, `created_at = 2026-08-05 01:32:28` UTC (**08:32:28 local, matching the Product Owner's cited incident time**), `status=SUCCESS`, file `F1.3-2098.02.18.xlsx`, `ngay_do_kiem=2098-02-18`.
- `fact_f13` row `id=708372`, `ngay_do_kiem=2098-02-18`, `ma_bg=BG_2098_REJECTED` — inserted by that same import, directly reproducing the Product Owner's "Source unresolved" symptom (a fact row with no linked HUE/TCT evidence for a nonsensical future date).
- `import_log` row `id=1096`, 16 seconds later, `status=FAILED` — a second, near-simultaneous attempt on the same file, consistent with the file watcher's `awaitWriteFinish`/double-fire behavior rather than a separate defect.

**Fix applied**:

```js
} else if (ngay_do_kiem > businessCurrentDate && process.env.QIS_ALLOW_TEST_FUTURE_DATE !== 'true') {
```

The `2098` bypass is removed entirely. A future date is now always rejected in production. Legitimate test suites that need a safe future-date fixture must set `process.env.QIS_ALLOW_TEST_FUTURE_DATE = 'true'` explicitly (not `NODE_ENV=test`, which would also trigger an unrelated isolated-database requirement in `src/config/db.js`).

## Symptom A — Recurrence Mechanism (Critical Secondary Finding)

The file's presence in the **production** `Data DKCL/F1.3/Processed/HUE/` folder is best explained by a **test-isolation defect**, found and confirmed while validating this fix:

`backend/test_dkclHueF13SyncService.js` imports `BASE_INCOMING`/`BASE_PROCESSED` directly from `backend/src/services/importPipeline.js` — the exact same path constants (`Data DKCL/F1.3/Incoming`, `Data DKCL/F1.3/Processed`, resolved relative to `process.cwd()`) used by the live backend. This test suite writes its `2098-xx-xx` fixture files (identical `AUTO002_0001`/`BCVH TEST` content) directly into these real, shared, production folders — there is no isolated test sandbox for the file system (only the database has an isolation mechanism, `QIS_TEST_DB_PATH`, and even that is not used by this suite).

Running this test suite against the shared environment plants test fixtures into production. This is consistent with the file's original `2026-07-30` birth date and with the pattern of `Quarantine/HUE/F1.3-2098.02.18.stale-*` files also dated `2026-07-30`.

**This was independently confirmed twice during this ticket's own validation**: running `backend/test_dkclHueF13SyncService.js` inserted 4 new `fact_f13` rows and 4 new `import_log` rows of the same `2098-xx`/`AUTO002_000x` test-fixture pattern directly into the live production database on its first run, and overwrote the original evidence file's timestamp. After cleanup, running it again for a final regression re-check inserted the **same pattern a second time**, proving this is a deterministic side effect of running the file at all, unrelated to the opt-in flag added to fix the date-validation regression. Both occurrences were cleaned up within this ticket — see the checkpoint's Closure Evidence and Residuals.

**Not confirmed / out of scope**: a Windows Scheduled Task `VnPost_Daily_Sync` (daily trigger `08:00`, action `pythonw.exe "D:\Antigravity - Project\KHHH - Antigravity\backend\scripts\automate_sync.py"`) exists on this machine and ran successfully at `08:00` this morning, roughly 32 minutes before the `08:32` import event. Its action targets a **different, unrelated project** (`KHHH - Antigravity`, not this repository) and is outside this repository's workspace and authority. This ticket does not inspect or modify that project. Whether it independently contributes to the recurrence (e.g., by triggering a backend restart, or by its own unrelated activity) is not established and is flagged for Product Owner/CTO awareness only.

## Symptom B — Recovered After Server Restart (No Technical Root Cause, No Code Fix)

**Initial discovery findings** (unchanged historical record; no technical root cause was ever proven from these):

- No `chrome.exe`, `msedge.exe`, or other browser process was running for either profile at the time.
- `Data DKCL/BrowserProfiles/HUE.lock` and `TCT.lock` were directories (this project's own mutex, not Chromium's), both created very recently (`08:35`/`08:36` local that day) — consistent with a launch attempt that did not clean up afterward.
- Neither profile had a Chromium-internal `SingletonLock` file, meaning Chromium itself never reached the point of successfully starting for either source at that time.
- `playwright`/`playwright-core` were present; two Chromium revisions were cached (`chromium-1208`, `chromium-1234`); which revision the installed `playwright` package requires was not verified.
- A live interactive-auth call was deliberately not triggered during discovery, since it would spawn a real browser action with no way to visually confirm the result and no reproduction evidence in hand to justify it.

**PO runtime result, after a server restart, same day**: Product Owner reported both HUE and TCT browser windows opened for interactive login, authentication succeeded for both sources, and Import completed successfully for both HUE and TCT.

**Closure disposition for Symptom B**:

- Symptom B is **recovered** as a runtime outcome. It is **not** technically root-caused — no code change was made that could explain why the restart resolved it, and no mechanism (stale lock clearing, process re-registration, or otherwise) was proven to be the cause.
- The stale `HUE.lock`/`TCT.lock` directories observed during discovery are a plausible contributing factor (a fresh backend process would not inherit an in-memory client reference tied to a dead browser attempt, and a restart is a known way to clear that class of state), but this is not confirmed — no reproduction was performed with instrumentation before the restart, and none is possible retroactively.
- **No code fix was applied for Symptom B.** If the browser-open failure recurs, do not assume the previous restart's effect will repeat. Open a new remediation ticket and, before any further restart, capture the live backend process's console output at the exact moment interactive login is triggered (not currently captured to any persistent log file — `backend/backend.log` only logs the startup banner, not per-request activity) — this is the evidence this ticket lacked.

## Out Of Scope

- `NETWORK-MANAGEMENT-001` module — not touched, remained paused throughout.
- Any file or code under `D:\Antigravity - Project\KHHH - Antigravity\` — a different project, outside this repository's workspace.
- Reopening `AUTO-IMPORT-010` or `F13-DATA-2098-CLEANUP-IMPL`.
- The test-isolation defect was fixed under the separate follow-up ticket `AUTO-IMPORT-012` (`COMPLETED / TECHNICAL PASS`), not inside this ticket's own scope.
- No code fix for Symptom B — recovered via server restart, not via a technical change; see closure disposition above.
- Business rules, SSOT, product behavior — not touched.

## Validation Requirements

- `node backend/test_importProcessor.js` — TEST 3B passes; the only remaining failure (`TEST 5`) is pre-existing and unrelated (confirmed present before this ticket's change too).
- `node backend/test_e2e_import_engine.js` — 62/62 pass.
- `node backend/test_dkclHueF13SyncService.js` — 125/125 pass (after adding the explicit opt-in flag to this suite's own fixtures).
- `node backend/test_importPipelineRace.js` — 40/40 pass, unaffected.
- Full backend test sweep run; pre-existing unrelated failures (native `koffi`/window-hiding scripts, one data-snapshot contract test) confirmed unchanged from before this ticket, consistent with the residual failures already recorded under `AUTO-IMPORT-010`.
- `fact_f13` row count verified restored to the authoritative baseline `663,126` (matching `F13-DATA-2098-CLEANUP-IMPL`'s closure baseline) after cleaning up this ticket's own self-inflicted test pollution.
- `git diff --check` clean.
- No product code outside `backend/src/services/importProcessor.js` and three test files' opt-in flags was changed.

## Completion And Handoff

- Symptom A: fixed, tested, reproducible proof provided (`AUTO-IMPORT-011`).
- Test-isolation defect: fixed and verified under the follow-up ticket `AUTO-IMPORT-012`, `COMPLETED / TECHNICAL PASS`.
- Symptom B: recovered after a Product Owner-performed server restart. Both HUE and TCT opened, authenticated, and imported successfully. No technical root cause was determined and no code fix was applied — the restart's effect on the failure is plausible but not proven.

Product Owner confirmed the runtime result directly. This ticket closes: `COMPLETED / PO RUNTIME PASS / CLOSED`.

**Standing instruction if Symptom B recurs**: do not assume a restart will resolve it again. Open a new remediation ticket, and before performing any restart, capture the live backend process's console output at the exact moment interactive login is triggered — this is the missing evidence that prevented root-causing it this time.

Remaining open item, still requiring Product Owner/CTO decision: disposition of the now-orphaned physical file `Data DKCL/F1.3/Processed/HUE/F1.3-2098.02.18.xlsx` (its content is preserved separately at `backend/incident_evidence/F1.3-2098.02.18.xlsx`, captured before this ticket).

`NETWORK-MANAGEMENT-001` remains `PAUSED`, unaffected by this closure. Do not activate any next ticket beyond what Product Owner explicitly authorizes.
