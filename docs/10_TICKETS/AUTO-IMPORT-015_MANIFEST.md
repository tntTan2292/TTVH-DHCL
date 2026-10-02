# AUTO-IMPORT-015 Manifest

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Evidence](#5-evidence)
- [6. Root Causes](#6-root-causes)
- [7. Scope](#7-scope)
- [8. Out Of Scope](#8-out-of-scope)
- [9. Validation](#9-validation)
- [10. PO Acceptance Checklist](#10-po-acceptance-checklist)
- [11. Authority Escalation](#11-authority-escalation)

## 1. Ticket Information

- Ticket ID: `AUTO-IMPORT-015`
- Ticket Name: DKCL daily session-expiry hardening (HUE/TCT) -- visible re-login, orphan-process recovery, state reset, real error codes
- Phase: Implementation (Discovery completed in chat 2026-10-01/02)
- Owner: Antigravity (executor, per PO instruction 2026-10-02). Claude/CTO reviews. Same model must not implement and self-review.
- Governance Version: V2 Active
- Opened: `2026-10-02`
- Prompt for executor: `docs/10_TICKETS/AUTO-IMPORT-015_ANTIGRAVITY_PROMPT.md`

## 2. Objective

When the DKCL SSO session expires (typically overnight) while the backend and its persistent browsers keep running, the Import Center must detect it before a job runs, show the login window to the operator, and recover cleanly -- never hang silently at `RUNNING` and never stay stuck in `OPENING_BROWSER`.

## 3. Current Status

`OPENED -- READY FOR EXECUTOR`. No code changed yet. PO UI Check Required: Yes (login window actually appears; clear WAITING_AUTH message).

## 4. Required Reading

1. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
2. This manifest, then the Executor prompt above.
3. Historical context only if needed: `docs/10_TICKETS/AUTO-IMPORT-014_MANIFEST.md`, `docs/10_TICKETS/AUTO-IMPORT-013_MANIFEST.md`.

## 5. Evidence

Two incidents, both after the backend (PID 8132) ran across a day boundary with persistent HUE/TCT Chromium windows left open.

**Incident 1 -- 2026-10-01 morning (backend restarted 07:44).**
- `backend/backend_err.log`: repeated `[interactiveAuthenticate] Error: ORPHAN_PROCESS_RECOVERY_FAILED` at `browserProcessManager.js:547` (`terminateProcessTree`) via `dkclSessionPreflightService.js:289` (`reclaimOrphanedProfile`), invoked from line 683.
- The controller (`dkclSharedOperationsController.js:52`) replaced the real code with the generic "Yeu cau dang nhap tuong tac that bai...".
- After the failure the entry stayed in `OPENING_BROWSER` (set at `dkclSessionPreflightService.js:652`), so every later preflight returned "Dang mo dang nhap DKCL Hue." (`:456-464`) until a backend restart.
- Separate and already resolved: DKCL portal slowness on 2026-10-01 made F1.3 jobs time out (`RESULT_TABLE_NOT_READY` / `table tr nth(2)` after 30 s); HUE 28/29/30-09 imported successfully later that day.

**Incident 2 -- 2026-10-02 09:41.**
- Backend still PID 8132 since 2026-10-01 07:44; HUE browser PID 33640 and TCT PID 28372 still alive from 07:45 the previous day.
- Job `HUE 2026-10-01` leased (`GLOBAL_DKCL`) and went `RUNNING`; 3 other jobs `QUEUED` behind it.
- `openF13Report()` landed on `https://dkcl.vnpost.vn/sso/login`; `stopForSecurityChallenge()` (regex matches "sso") called `waitForManualAuthentication()` (`dkclHueF13PortalClient.js:1660`) for `DKCL_INTERACTIVE_AUTH_WAIT_MS` = 240 s inside the hidden window. Log: `diagnostics(wait_start): url=.../sso/login`.
- UI showed `RUNNING` with no prompt; no browser appeared. Window-hidden state is inferred (hidden after F13_READY the previous day), not yet observed -- Antigravity must confirm with HWND evidence.

## 6. Root Causes

1. **No session validity check before a job runs.** A job takes the lease and discovers the expired session mid-run.
2. **Silent manual-login wait inside a hidden window.** `stopForSecurityChallenge()` waits up to 240 s for a human who cannot see the window; UI shows `RUNNING`.
3. **Stuck lifecycle after a failed orphan reclaim.** `OPENING_BROWSER` is set before `reclaimOrphanedProfile()`; a throw leaves it set forever.
4. **`taskkill` failure is treated as fatal.** A PID that already exited (or a process-tree race) yields `ORPHAN_PROCESS_RECOVERY_FAILED` instead of re-inspecting and continuing.
5. **Real error code hidden from the operator** by the generic controller message.
6. **No day-rollover handling.** Long-lived hidden browsers are never re-validated at start of day.

## 7. Scope

1. Pre-flight the session before a queued F1.3 (and F4.1 if it shares the path) job runs; if expired, set the job `WAITING_AUTH` immediately -- do not occupy `GLOBAL_DKCL` and do not wait inside the hidden window.
2. Make `WAITING_AUTH` actionable: the "Mo dang nhap HUE/TCT" action must restore/show the browser window (verify HWND visible + foreground) and the UI must say what to do.
3. Fix `reclaimOrphanedProfile`/`terminateProcessTree`: treat "process not found" as success after re-inspection; reset the lifecycle entry to a non-in-progress state (`SESSION_EXPIRED`/`NOT_AUTHENTICATED`) on any failure thrown after `OPENING_BROWSER`; clear `openingPromise`.
4. Surface the real error code/message in `interactiveAuthenticate` and `preflight` responses and in the UI (keep generic text only as fallback).
5. Day-rollover: first job of a new business day (or a bounded idle age) re-validates the session through the same pre-flight; no unattended kill of browsers owned by an operation.
6. Tests for each item above (backend: `node --test`; note per project memory: use `--experimental-sqlite` where `node:sqlite` is used).
7. Windows runtime evidence (PID, HWND, process tree, log) from a real overnight-expired or force-expired session.

## 8. Out Of Scope

- Raising the 30 s result-table wait / treating DKCL slowness as retryable. Record as a separate follow-up ticket; PO chose to wait for DKCL to stabilise.
- Any change to F1.3 KPI/SSOT, import parsing, or `fact_f13` data.
- Auto-typing credentials. Login stays manual by the operator.
- Unrelated uncommitted work in the tree (network-map frontend, `.claude/`, exports, patches).

## 9. Validation

- Level 1 targeted: unit/integration tests for items 1-5; no full-suite sweep unless escalated with a one-sentence justification.
- Real-runtime proof on Windows: expired session -> job goes `WAITING_AUTH` within seconds, login window visible and foregrounded, operator logs in, "Tiep tuc Run" completes one date, lifecycle returns to `F13_READY`.
- Forced `taskkill` failure (stale PID) -> no stuck `OPENING_BROWSER`, next attempt succeeds.

## 10. PO Acceptance Checklist

1. Next morning (or after force-expiring the session), choosing a date shows the login window instead of a silent `RUNNING`.
2. After logging in and pressing "Tiep tuc Run", the import completes.
3. If anything fails, the screen shows a specific reason, not the generic message.
4. No backend restart needed to recover.

## 11. Authority Escalation

Stop and report to Claude/CTO if: a change would touch SSOT/frozen docs, requires killing a browser not matched by exact `--user-data-dir`, or the pre-flight needs credentials. Executor must not self-award PO PASS; stop at `READY FOR PO CHECK`.
