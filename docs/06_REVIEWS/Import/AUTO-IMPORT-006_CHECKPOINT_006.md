# AUTO-IMPORT-006 CHECKPOINT 006 — REMEDIATION 005 TECHNICAL HANDOFF

- Date: 2026-07-23
- Executor: Codex
- Current State: `ACTIVE / AWAITING REVIEW`
- Technical Status: `PASS`
- Runtime Status: `AWAITING CHIEF ARCHITECT REVIEW / PO RECHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Current Phase: `REMEDIATION-005 / AWAITING REVIEW`
- Baseline Remote HEAD: `1f55576f229606024f1c6843ad1005d948a870d2`
- Prior Reviewed Code Commit: `58fb723e9c5eeb82f17b75d14b7662c3503ee262`
- Runtime Port for PO Recheck: `5178`

---

## 1. PO Runtime Findings Addressed

### HUE
- PO finding: browser login opened successfully, but post-login minimize failed and `SESSION_VALID` was not reached.
- Technical root cause: HUE interactive completion was coupled to the F1.3 report-ready marker used for TCT; HUE can have a valid authenticated portal session even when that TCT-style report marker is not available immediately after manual login.
- Resolution: HUE interactive authentication now accepts a confirmed authenticated marker, attempts F1.3 navigation, and allows the session lifecycle to become valid without requiring the TCT report-ready select marker.

### HUE/TCT Minimize
- PO finding: browser did not minimize after successful login for HUE and TCT.
- Technical root cause: minimize was best-effort and the registry marked `minimized` as true even when the CDP minimize call failed, masking real window-state failure and preventing accurate lifecycle evidence.
- Resolution: registry now tracks `minimizeAttempted` separately from actual `minimized`; minimize is attempted once after confirmed valid session, failure does not invalidate the session, and failure is reported as `browser_minimized:false`.

### TCT File Lifecycle
- PO finding: successful TCT Excel downloads were deleted locally after import.
- Technical root cause: TCT backfill called local workbook cleanup after import success and on failures, unlike the retained evidence principle used by the Hue import pipeline.
- Resolution: successful TCT downloads are moved atomically into `Data DKCL/F1.3/Processed/TCT`, with collision-safe naming and destination existence verification before portal cleanup is attempted. Failed validation or persistence failures retain the source workbook for retry/investigation.

---

## 2. New Logic

- HUE and TCT remain source-separated.
- `interactiveAuthenticate()` and `recover()` continue to use `_classifyLockState()`.
- No `terminateProcessTree()` call was added to `interactiveAuthenticate()` or `recover()`.
- `cleanupStaleLocks()` remains gated behind `STALE_CONFIRMED`.
- Duplicate interactive auth requests continue sharing `openingPromise`.
- `LOGIN_IN_PROGRESS` HTTP `202` behavior is preserved.
- TCT completion evidence now requires the retained processed workbook in `Processed/TCT` in addition to DB/log evidence.
- Portal cleanup for generated TCT files runs only after processed workbook persistence is verified.
- Portal cleanup still targets the exact generated file metadata through the existing `deleteGeneratedFile()` path when supported.

---

## 3. Technical Verification

Commands run:

- `node test_dkclSessionPreflightService.js` — PASS
- `node test_tctF13BackfillService.js` — PASS
- `node test_browserProfileLock.js` — PASS
- `node src/pages/dataImportTctScan.test.js` — PASS
- `npm run build` — PASS
- `npm run lint` — PASS with existing warnings
- `git diff --check` — PASS with CRLF normalization warnings only

Targeted test coverage added or updated:

- HUE reaches interactive valid lifecycle when a valid authenticated marker exists without the TCT report-ready marker.
- HUE remains non-valid when authentication marker is not confirmed.
- TCT `SESSION_VALID` lifecycle remains intact.
- Minimize is attempted only after valid authentication.
- Minimize is attempted once and failure does not invalidate the session.
- HUE/TCT source entries do not mutate each other.
- TCT successful workbook import is retained in `Processed/TCT`.
- Local workbook evidence is not deleted after successful import.
- Portal cleanup runs only after processed persistence succeeds.
- Persistence failure skips portal cleanup and retains the source workbook.
- R4.1B lock cleanup and no-process-kill contracts remain covered.
- `LOGIN_IN_PROGRESS` HTTP `202` regression remains covered.
- Duplicate login requests share one active opening promise.

---

## 4. PO Runtime Recheck Checklist

Use `http://localhost:5178/import`.

### HUE
1. Restart backend from current HEAD.
2. Hard refresh `localhost:5178/import`.
3. Select one `COMPLETE` date.
4. Confirm checkbox remains checked.
5. Confirm `Re-Update (1)`.
6. Log in through `Mở đăng nhập Huế`.
7. Confirm browser minimizes after successful login.
8. Confirm UI becomes `SESSION_VALID`.
9. Submit one controlled `Re-Update`.
10. Confirm queue/result without duplicates.

### TCT
1. Click `Mở đăng nhập TCT`.
2. Confirm one headed browser appears.
3. Confirm window does not flash, close, or reopen repeatedly.
4. Confirm UI displays `Đang mở đăng nhập...`.
5. Complete login manually.
6. Confirm browser minimizes after successful login.
7. Confirm UI becomes `SESSION_VALID`.
8. Select one `COMPLETE` date and run one controlled `Re-Update`.
9. Confirm successful workbook is retained in `Data DKCL/F1.3/Processed/TCT`.
10. Confirm portal generated-file cleanup, if present, happens only after processed file exists.
11. Close the browser manually and confirm TCT becomes authentication-required again.
12. Confirm HUE state is unaffected.

### Responsive
- Zoom `100%`.
- Controls visible and usable.
- No page-level clipping.

---

## 5. Boundary

- No portal credentials were used.
- No real portal login was performed by Codex.
- No PO runtime validation was performed by Codex.
- No KPI formula, business data, ranking rule, schema, or source separation rule was changed.
- Ticket remains open and cannot be completed without explicit PO PASS.
