# AUTO-IMPORT-010 Manifest

- Ticket ID: `AUTO-IMPORT-010`
- Ticket Name: `HUE Browser Broker / Browser Launch Recovery`
- Phase: `Import Authentication Recovery`
- Current State: `ACTIVE / PO RUNTIME FAIL`
- Technical Status: `DIRECT PLAYWRIGHT + CHROMIUM + HUE PROFILE PASS; MAIN RUNTIME STILL FAILS`
- Runtime Status: `PO RUNTIME FAIL`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT PASS`
- Current Phase: `ACTIVE HUE BROWSER LAUNCH RECOVERY`
- Last Reviewed Phase: `PO HUE runtime check after stale-state remediation`
- Last Reviewed Commit: `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`
- Phase Review Status: `ACTIVE / PO RUNTIME FAIL`
- Next Phase Authorization: `Discovery only for standard runtime dependency materialization and launcher provisioning of Playwright in HUE flow`
- Activation date: `2026-07-31`
- Primary executor: `Codex`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md`
5. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_001.md`

## Authority

`AUTO-IMPORT-010` is the current highest-priority active ticket for Import authentication recovery.

Current boundary is `HUE only`.

`TCT` is not authorized for expansion inside this ticket unless Product Owner explicitly widens scope.

Node console hiding remains a separate ticket and is not part of this ticket.

The latest implementation commit is `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`, and current `HEAD` / `remote` match that commit.

## Objective

Determine why the standard launcher/runtime path fails to materialize or preserve `backend/node_modules/playwright` for HUE browser opening, even though:

- manifest declarations exist,
- direct Playwright + Chromium + HUE profile launch is proven to work, and
- stale in-memory HUE `LOGIN_IN_PROGRESS` state has been remediated.

## Current Runtime Failure

Current Product Owner-visible failure after restarting with the standard launcher/runtime:

- Dashboard API returns normal `HTTP 200`.
- Import API returns normal `HTTP 200` for non-browser status endpoints.
- HUE interactive authentication still fails before browser opening.
- `POST /api/import/dkcl/session/interactive-auth` fails with raw `MODULE_NOT_FOUND: Cannot find module 'playwright'`.
- HUE browser does not open.
- Product Owner cannot perform HUE login.
- Preflight ends at `SESSION_CHECK_FAILED`.

This ticket is not `PO PASS`.

## Proven Facts

The following facts are now locked:

- Temporary `playwright@1.62.1` materialization can succeed.
- Matching Chromium can be installed by `npx.cmd playwright install chromium`.
- Executable path `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe` exists and works.
- Direct `chromium.launchPersistentContext` on `Data DKCL\BrowserProfiles\HUE` succeeds.
- Direct launch success occurs in about `1493 ms`.
- Kaspersky shows no new warning in the current HUE direct-launch evidence.
- Machine-wide Playwright / Chromium / HUE profile launch is not the shared root cause anymore.

## Current Root Cause

The stale in-memory HUE registry defect was real and has been fixed at `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`.

The current authoritative blocker is different:

- the standard launcher/runtime path does not provide a materialized `backend/node_modules/playwright` dependency at the moment HUE interactive authentication runs;
- therefore `dkclHueF13PortalClient.js` fails at runtime with `MODULE_NOT_FOUND`;
- browser spawning never starts in the standard PO runtime path.

Do not conclude the final remediation until dependency lifecycle and launcher/runtime provisioning are explicitly verified.

## Out Of Scope

- Any TCT remediation or TCT expansion.
- Browser broker reactivation or further broker implementation.
- Durable coordinator redesign.
- Node console hiding.
- Dashboard remediation.
- Import execution, reimport, or data modification.
- Kaspersky configuration changes.
- Browser profile deletion or profile-content edits.
- Koffi environment artifact cleanup.

## Validation Requirements

For future closure of this ticket:

- Standard launcher/runtime materializes the required Playwright dependency before HUE interactive authentication.
- HUE browser opens visibly for the Product Owner through the normal product path.
- Product Owner can log in successfully.
- HUE preflight reaches the correct authenticated state.
- No new Kaspersky blocked-process warning appears.
- No unrelated TCT, broker, dashboard, launcher-hiding, or profile changes are introduced.

## Multi-Model Boundary

Approved operating model:

- Repository documents are higher authority than chat memory.
- One ticket has one code executor at a time.
- No parallel code edits.
- Antigravity: Windows runtime, PID, port, HWND, process, log, and evidence only.
- Claude Sonnet: delta-only discovery, code/log reading, bounded planning.
- Claude Opus: architecture challenge, root-cause review, patch review when needed.
- Codex: sole source-code, test, and Git executor unless Product Owner explicitly reassigns.
- ChatGPT: CTO orchestration, scope control, prompt control, and Product Owner explanation.
- Product Owner: final runtime acceptance authority.

Avoid JScript, VBScript, WScript, Start-Process, and nested command wrappers when direct `node` / `cmd` execution is possible.

## Completion And Handoff

This manifest does not authorize further implementation by default beyond documentation and future bounded discovery.

Next proposed discovery after this handoff:

- inspect package declaration and lock contract,
- inspect install/bootstrap path,
- inspect `npm ci` / `npm install` behavior,
- inspect `node_modules` tracking and ignored/untracked behavior,
- inspect launcher assumptions about dependency lifecycle,
- confirm why standard runtime reaches `MODULE_NOT_FOUND` despite declared dependency.

Do not return to broker, coordinator, TCT, or Node window hiding without explicit Product Owner authority.
