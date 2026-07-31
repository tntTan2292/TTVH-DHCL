# AUTO-IMPORT-010 CHECKPOINT 001

## Executive State

- Ticket: `AUTO-IMPORT-010`
- Ticket name: `HUE Browser Broker / Browser Launch Recovery`
- Current state: `ACTIVE / PO RUNTIME FAIL`
- Current boundary: `HUE only`
- Latest implementation commit: `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`
- `HEAD` / `remote`: `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`
- Node console hiding is a separate ticket and is out of scope here.

## Authority and Boundary

- This checkpoint is documentation authority for fresh AI handoff only.
- Do not treat any technical probe as `PO PASS`.
- `TCT` is not authorized to expand in this ticket.
- Do not reopen broker, coordinator, dashboard, launcher-hiding, Kaspersky, profile-content, or Import-data scope without Product Owner authority.

## Timeline / Attempts

- `808cb602...`: historical point where HUE and TCT opened browser and Import worked, but Node console still showed.
- Later Node-window hiding attempts introduced browser-launch regression.
- Rollback, ownership, lock, and recovery attempts did not restore Product Owner runtime behavior.
- `AUTO-IMPORT-009A` durable coordinator:
  - `dbab870...`
  - dependency fix `174e956...`
  - Product Owner runtime still failed and the line was hard-stopped.
- `AUTO-IMPORT-010` HUE broker proof of concept:
  - implementation `eea0893...`
  - broker port correction `c36ab755...`
  - broker could run, but Product Owner acceptance was not achieved.
- Runtime experimentation temporarily broke dashboard metadata when backend was run manually in the wrong mode.
- Main system was then restored through the standard launcher; Dashboard and Import APIs returned to normal `HTTP 200`.
- Direct HUE environment checks later proved Playwright + Chromium + HUE profile can open successfully outside the main runtime path.
- Commit `1ca7eee11101cbf59390662dbd848f6fcf8c5d60` fixed the stale HUE cached `LOGIN_IN_PROGRESS` registry defect.

## Proven Facts

- `playwright@1.62.1` can be materialized temporarily.
- Matching Chromium can be installed successfully.
- Executable exists at:
  - `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe`
- Direct `chromium.launchPersistentContext` on:
  - `Data DKCL\BrowserProfiles\HUE`
  passes successfully.
- Direct browser launch success was observed in about `1493 ms`.
- Playwright engine, Chromium binary, and HUE profile path are not the current shared blocker.
- Kaspersky shows no new warning in the latest direct-launch and Product Owner runtime evidence.
- Dashboard metadata and BCVH ranking APIs are back to `HTTP 200` under the standard launcher/runtime.
- Import status API is back to `HTTP 200` under the standard launcher/runtime.

## Eliminated Causes

- Direct Playwright engine failure.
- Missing Chromium binary after explicit install.
- Broken HUE profile path.
- Global machine-level inability to launch HUE persistent Chromium.
- Kaspersky as the current primary blocker.
- Stale in-memory HUE `WAITING_FOR_LOGIN` / `LOGIN_IN_PROGRESS` as the remaining root cause after commit `1ca7eee...`.

## Latest PO Evidence

After restart through the standard launcher/runtime:

- Backend `5050` running.
- Frontend `5178` running.
- Broker `5071` stopped.
- Dashboard metadata API: `HTTP 200`.
- BCVH ranking API: `HTTP 200`.
- Import status API: `HTTP 200`.

Product Owner HUE test:

- `POST /api/import/dkcl/session/interactive-auth`: `HTTP 400`
- Raw root error:
  - `MODULE_NOT_FOUND: Cannot find module 'playwright'`
  - source path: `dkclHueF13PortalClient.js`
- HUE browser did not open.
- Product Owner could not log in.
- Preflight ended at `HTTP 503 / SESSION_CHECK_FAILED`.
- Scan did not run.
- Kaspersky showed no new warning.

Authoritative result:

- `PO FAIL`

## Current Root Cause

Two layers are now separated clearly:

1. The stale registry defect was real and has already been fixed.
2. The current blocking defect is runtime dependency provisioning.

Authoritative current root cause:

- standard launcher/runtime execution does not have materialized `backend/node_modules/playwright` when HUE interactive authentication runs;
- even though package declaration and lock declaration exist, runtime deployment does not guarantee the dependency is present at use time;
- therefore HUE fails with `MODULE_NOT_FOUND` before any browser child PID or Chromium window can be created.

## Unresolved Risks

- Launcher/bootstrap path may assume a dependency state that is not reproducible on Product Owner runtime.
- `node_modules` lifecycle may differ between manual technical recovery and normal launcher use.
- Temporary environment artifacts may confuse later discovery if not distinguished from source changes.
- The untracked Koffi artifact remains present and should not be treated as product source change.

## Multi-Model Workflow

- Repository authority is higher than chat or memory.
- One ticket has one code executor at one time.
- No parallel code edits.
- Antigravity:
  - runtime Windows, PID, port, HWND, process, log, and evidence only
- Claude Sonnet:
  - delta-only discovery, code/log reading, bounded plan
- Claude Opus:
  - architecture challenge, root-cause review, patch review when needed
- Codex:
  - sole source-code, test, and Git executor unless Product Owner reassigns
- ChatGPT:
  - CTO orchestration, Product Owner explanation, scope and authority control
- Product Owner:
  - final scope authority and runtime acceptance

Operational rule:

- do not use JScript, VBScript, WScript, Start-Process, or nested command wrappers when direct `node` / `cmd` execution is possible;
- do not change Kaspersky or ask for exceptions.

## Clean Onboarding Instructions

Fresh AI onboarding chain for this ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md`
5. `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_001.md`

Fresh AI must confirm:

- repository `tntTan2292/TTVH-DHCL`
- branch `codex/da-impl-006`
- active ticket `AUTO-IMPORT-010`
- current state `ACTIVE / PO RUNTIME FAIL`
- latest implementation commit `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`
- current blocker is standard-runtime `MODULE_NOT_FOUND: playwright`
- direct Playwright + Chromium + HUE profile launch already passes

Executor-specific reminder:

- ChatGPT mới:
  - onboard bằng chain trên, giữ authority/scope, không tự suy diễn `PO PASS`
- Codex mới:
  - là code/test/Git executor duy nhất trừ khi PO đổi người thực thi
- Antigravity mới:
  - chỉ runtime evidence, PID/HWND/process/log; không sửa code
- Claude Code mới:
  - chỉ làm đúng vai trò được PO giao và vẫn phải onboard theo cùng authority chain

## Next PO Decision Required

- Product Owner has not granted further implementation inside this documentation round.
- The next proposed action is bounded discovery only:
  - determine why the standard launcher/runtime does not materialize `playwright` despite manifest and lock declarations.
- Discovery must inspect:
  - `package.json` / `package-lock.json`
  - install/bootstrap path
  - `npm ci` / `npm install` behavior
  - tracked / ignored / untracked `node_modules` behavior
  - launcher assumptions
  - deployment dependency lifecycle

Do not return to broker, coordinator, TCT, or Node window hiding unless Product Owner explicitly authorizes it.
