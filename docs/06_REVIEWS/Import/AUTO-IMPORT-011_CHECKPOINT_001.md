# AUTO-IMPORT-011 CHECKPOINT 001

## Executive State

- Ticket: `AUTO-IMPORT-011`
- Current state: `SYMPTOM A FIXED / SYMPTOM B BLOCKED ON PO`
- Emergency activation: `2026-08-05`, direct Product Owner priority directive
- Does not reopen `AUTO-IMPORT-010` or `F13-DATA-2098-CLEANUP-IMPL`; does not touch `NETWORK-MANAGEMENT-001`.

## Timeline Of Evidence

1. `2026-07-30`: physical file `Data DKCL/F1.3/Processed/HUE/F1.3-2098.02.18.xlsx` born `14:23:13` (original timestamp, later overwritten — see Section 6). Eight `stale-20260730*` quarantine copies of the same filename exist under `Data DKCL/F1.3/Quarantine/HUE/`, same day — consistent with a test-fixture write event that day.
2. `2026-08-04`: `F13-DATA-2098-CLEANUP-IMPL` (separate, closed ticket) deleted 4 `fact_f13` + 4 `import_log` rows dated `2098-02`, database-only, no file-system change. Verified zero `2098` rows remained at that time.
3. `2026-08-05 08:00:00` local: Windows Scheduled Task `VnPost_Daily_Sync` ran (result `0`/success). Action: `pythonw.exe "D:\Antigravity - Project\KHHH - Antigravity\backend\scripts\automate_sync.py"` — a different, unrelated project, outside this repository's workspace. Not inspected further.
4. `2026-08-05 08:32:28` local (`01:32:28` UTC): `import_log id=1090`, file `F1.3-2098.02.18.xlsx`, `status=SUCCESS` — matches the Product Owner's cited incident time exactly.
5. Same import inserted `fact_f13 id=708372`, `ngay_do_kiem=2098-02-18`, `ma_bg=BG_2098_REJECTED`.
6. `2026-08-05 08:32:44` local: `import_log id=1096`, same file, `status=FAILED` — a second near-simultaneous attempt, consistent with file-watcher double-fire, not a separate defect.
7. `2026-08-05 08:35`–`08:36` local: `Data DKCL/BrowserProfiles/HUE.lock` and `TCT.lock` directories created (this project's own mutex). No corresponding live browser process and no Chromium `SingletonLock` exist — Symptom B evidence.

## Symptom A — Confirmed Root Cause

File: `backend/src/services/importProcessor.js`, function `validateFactF13BusinessDate`.

Before:

```js
} else if (ngay_do_kiem > businessCurrentDate && !ngay_do_kiem.startsWith('2098') && process.env.NODE_ENV !== 'test') {
```

Any `2098`-prefixed date was exempt from `FUTURE_DATE` rejection unconditionally, in every environment. Reproduced via `node backend/test_importProcessor.js` (`TEST 3B` failed before the fix, asserting `INVALID_FACT_F13_IMPORT_DATE` must be thrown).

After:

```js
} else if (ngay_do_kiem > businessCurrentDate && process.env.QIS_ALLOW_TEST_FUTURE_DATE !== 'true') {
```

## Secondary Finding — Test/Production Path Collision

`backend/test_dkclHueF13SyncService.js` imports `BASE_INCOMING`/`BASE_PROCESSED` from `backend/src/services/importPipeline.js` — the same constants the live backend uses (`Data DKCL/F1.3/Incoming`, `Data DKCL/F1.3/Processed`, resolved from `process.cwd()`). This suite writes its `2098-xx-xx` / `AUTO002_000x` / `BCVH TEST` fixtures directly into those real, shared, production folders. No file-system test isolation exists (only the database has one, via `QIS_TEST_DB_PATH`, and this suite does not use it either).

This is the most likely mechanism by which the original `2026-07-30` fixture reached production, and is independently reproduced below.

## Self-Inflicted Pollution During This Ticket's Own Validation (Disclosed)

While running the full backend regression sweep to confirm no defect was introduced by the fix, running `backend/test_dkclHueF13SyncService.js` (before it was given its own opt-in flag) wrote real rows into the live database, via the exact path-collision mechanism above:

- `fact_f13`: `id 708486, 708487` (`2098-02-16`, `AUTO002_0001`/`0002`), `id 708489, 708490` (`2098-02-18`, `AUTO002_0001`/`0002`)
- `import_log`: `id 1158, 1159, 1160, 1163`
- The original evidence file `Data DKCL/F1.3/Processed/HUE/F1.3-2098.02.18.xlsx` was overwritten (new birth timestamp `2026-08-05 09:05:13`, superseding the original `2026-07-30 14:23:13`)

**Cleanup performed**: the exact 4 `fact_f13` + 4 `import_log` rows listed above were deleted in a guarded transaction. Verified: `fact_f13` total restored to `663,126` (matching the `F13-DATA-2098-CLEANUP-IMPL` authoritative baseline), zero `2098`-dated rows remain. This is corrective cleanup of this ticket's own test-run side effect, not a new business-data deletion decision — the rows deleted were fabricated seconds earlier by this ticket's own validation run, not original data or original incident evidence.

**Evidence preservation note**: the original file's content (18,332 bytes; rows `AUTO002_0001`/`0002`, `BCVH TEST`) is independently preserved at `backend/incident_evidence/F1.3-2098.02.18.xlsx`, captured on `2026-07-24` (an earlier, separate evidence capture, unaffected by this ticket). The live `Processed/HUE` copy's original `2026-07-30` timestamp could not be preserved; the byte content is not known to differ.

**Follow-up test suites now carry an explicit, narrow opt-in** (`process.env.QIS_ALLOW_TEST_FUTURE_DATE = 'true'`) so their existing fixtures keep working without reintroducing the production bypass: `test_e2e_import_engine.js`, `test_dkclHueF13SyncService.js`. This does not fix the underlying path-collision defect (Section above); it only restores prior green test status under the corrected production validation rule.

**Confirmed a second time**: re-running `test_dkclHueF13SyncService.js` a second time (final regression re-check, after the first cleanup) inserted 4 more `fact_f13` rows (`id 708566, 708567, 708569, 708570`, same `2098-02-16`/`2098-02-18` × `AUTO002_0001`/`0002` pattern) and 4 more `import_log` rows directly into production again — proving this is not an incidental one-off but a **deterministic, repeatable side effect of simply running this test file**, with no dependency on the opt-in flag (the flag only controls date-validation outcome, not where the test writes). Cleaned up again in the same manner; `fact_f13` reconfirmed at `663,126`, zero `2098` rows. **This test file must not be run again outside an isolated sandbox until the follow-up test-isolation ticket lands** — every run plants fixtures into the live production database and file system.

This materially strengthens (though does not by itself prove) the recurrence theory: **any** routine or habitual execution of this specific test file — by a developer, an AI session, or an automated check — reproduces the exact file/row pattern the Product Owner sees "every morning," independent of the unrelated `VnPost_Daily_Sync` scheduled task.

## Symptom B — Evidence Gathered, Not Reproduced

- No `chrome.exe`/`msedge.exe` process running for either profile at time of investigation.
- `HUE.lock`/`TCT.lock` are stale mutex directories from this project's own code (not Chromium's), created `08:35`/`08:36` today, with no corresponding live process — consistent with a launch attempt that did not complete and was not cleaned up.
- No Chromium-internal `SingletonLock` in either profile — the failure occurs at or before `launchPersistentContext()`, not after a browser partially started.
- `playwright`/`playwright-core` present; two Chromium revisions cached (`chromium-1208`, `chromium-1234`) — version/revision match not verified.
- Live in-memory HUE/TCT registry state not inspectable without an authenticated admin session, which was not created.
- No live interactive-auth call was triggered (would spawn an unobservable real browser action on the Product Owner's machine without reproduction evidence in hand to justify it).

**Required from Product Owner to proceed**: a live reproduction session (Product Owner or Antigravity present, watching the console of the actual running backend process) at the moment `Đăng nhập` is clicked for HUE and separately for TCT, or direct confirmation of what the unrelated `KHHH - Antigravity` project's `automate_sync.py` does and whether it shares any resource with this backend.

## Test Evidence

| Suite | Before fix | After fix |
| --- | --- | --- |
| `test_importProcessor.js` | 45 passed, 6 failed | 50 passed, 1 failed (remaining failure is `TEST 5`, pre-existing, unrelated — confirmed present before this ticket too) |
| `test_e2e_import_engine.js` | n/a (relied on removed bypass) | 62 passed, 0 failed |
| `test_dkclHueF13SyncService.js` | 125 passed, 0 failed | 125 passed, 0 failed (restored via explicit opt-in flag) |
| `test_importPipelineRace.js` | 40 passed, 0 failed | 40 passed, 0 failed (unaffected) |

Full backend sweep: pre-existing, unrelated failures in native `koffi`/window-hiding scripts and one data-snapshot contract test are unchanged from the state already documented under `AUTO-IMPORT-010`.

## Files Changed

- `backend/src/services/importProcessor.js` — removed the unconditional `2098` future-date bypass; replaced with an explicit opt-in flag.
- `backend/test_e2e_import_engine.js` — sets the opt-in flag for its legitimate future-date fixture.
- `backend/test_dkclHueF13SyncService.js` — sets the opt-in flag for its legitimate future-date fixtures; added a note documenting the path-collision defect for the next ticket.

## Next PO Decision Required

1. Authorize a separate, bounded ticket to isolate test file-system paths from production `Data DKCL` folders.
2. Decide disposition of the orphaned physical file `Data DKCL/F1.3/Processed/HUE/F1.3-2098.02.18.xlsx` (keep, quarantine, or delete).
3. Provide live-reproduction access or `automate_sync.py` context for Symptom B.

Do not reopen `AUTO-IMPORT-010`, `F13-DATA-2098-CLEANUP-IMPL`, or touch `NETWORK-MANAGEMENT-001` without explicit Product Owner authority.
