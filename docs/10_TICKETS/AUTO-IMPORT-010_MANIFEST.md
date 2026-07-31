# AUTO-IMPORT-010 Manifest

- Ticket ID: `AUTO-IMPORT-010`
- Ticket Name: `HUE Browser Broker / Browser Launch Recovery`
- Phase: `Import Authentication Recovery`
- Current State: `COMPLETED / PO RUNTIME PASS / CLOSED`
- Technical Status: `PLAYWRIGHT RUNTIME PACKAGES MATERIALIZED; FRONTEND SESSION INVALIDATION NARROWED TO OFFICIAL AUTH VALIDATION ONLY; PRODUCT OWNER RUNTIME ACCEPTANCE CONFIRMED`
- Runtime Status: `PO RUNTIME PASS`
- PO UI Check Required: `Yes - PO PASS recorded`
- PO Product Status: `PASS`
- Current Phase: `CLOSED`
- Last Reviewed Phase: `Product Owner runtime acceptance covering Dashboard, HUE, and TCT`
- Last Reviewed Commit: `4435d20161fb4ab35509a3a313587887bbccb591` (last code-affecting commit for this ticket; documentation baseline for this correction round is `14a4d5854e6dcb1dcc5678c274323d1220f46c8d`)
- Phase Review Status: `CLOSED / PO RUNTIME PASS`
- Next Phase Authorization: `Ticket closed. Import authentication recovery is no longer active. Dashboard Phase 4 UI planning may resume under docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md, discovery/planning only, no implementation authorized yet.`
- Current PO Runtime Failure Note: `Resolved. Frontend blanket 401 session clearing previously allowed Import authorization failures to invalidate Dashboard session state; the fix narrowing session removal to the official auth validation endpoint is confirmed working under Product Owner runtime testing (see Closure Evidence).`
- Activation date: `2026-07-31`
- Closure date: `2026-07-31`
- Primary executor: `Codex`

## Fresh-Chat Onboarding Authority

This ticket is `CLOSED`. It is no longer part of the fresh onboarding chain; fresh onboarding now resolves through `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` to `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`.

Historical onboarding chain used while this ticket was active:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md`
5. Required Reading from this manifest

Closure checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_003.md`

Required Reading (historical, for anyone reviewing this closed ticket):

- `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_002.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_003.md`

## Authority (Historical)

`AUTO-IMPORT-010` was the highest-priority active ticket for Import authentication recovery while open. It is now `CLOSED`; the sections below are preserved as historical record and must not be read as describing current active work.

Boundary while active was `HUE only`.

`TCT` was not authorized for expansion inside this ticket; TCT ended up verified as part of Closure Evidence, but no TCT-specific scope was opened.

Node console hiding remains a separate ticket and was never part of this ticket.

The documentation baseline before `C1` implementation was `2c207852766b74117674a2316fbe923df61a4b24`. The last commit that changed product code for this ticket was `4435d20161fb4ab35509a3a313587887bbccb591`.

## Objective (Achieved)

Complete bounded planning for how the standard launcher/runtime should handle HUE browser dependencies without destabilizing the main system, given that:

- manifest declarations exist,
- direct Playwright + Chromium + HUE profile launch is proven to work, and
- stale in-memory HUE `LOGIN_IN_PROGRESS` state has been remediated.

This objective is achieved; see Closure Evidence.

## Runtime Context At Closure (Historical)

Product Owner-visible facts at the time `C1` was implemented:

- Dashboard API returned normal `HTTP 200`.
- Import API returned normal `HTTP 200` for non-browser status endpoints.
- standard-runtime HUE authentication had proven vulnerable to missing `playwright` materialization,
- direct browser proof had already shown the browser stack itself can work,
- management selected a one-time setup model instead of install-on-launch.

Option provenance locked for Checkpoint 002:

- `A` and `B` were Sonnet discovery proposals and were both rejected.
- `C` was formed through architecture challenge and confirmed by Opus review.
- `C1` was selected and implemented; `C2` was not implemented and remains unauthorized.

This ticket reached `PO PASS` at closure on `2026-07-31`; see Closure Evidence.

## Proven Facts

The following facts are now locked:

- Temporary `playwright@1.62.1` materialization can succeed.
- Matching Chromium can be installed by `npx.cmd playwright install chromium`.
- Executable path `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe` exists and works.
- Direct `chromium.launchPersistentContext` on `Data DKCL\BrowserProfiles\HUE` succeeds.
- Direct launch success occurs in about `1493 ms`.
- Kaspersky shows no new warning in the current HUE direct-launch evidence.
- Machine-wide Playwright / Chromium / HUE profile launch is not the shared root cause anymore.

## Root Cause (Resolved)

The stale in-memory HUE registry defect was real and was fixed at `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`.

The subsequent authoritative blocker was:

- the standard launcher/runtime path did not guarantee HUE browser dependencies were prepared at the moment HUE interactive authentication ran;
- therefore `dkclHueF13PortalClient.js` failed at runtime with `MODULE_NOT_FOUND`;
- browser spawning never started in the standard PO runtime path.

This blocker is resolved by `C1` dependency materialization, confirmed working under Product Owner runtime acceptance on `2026-07-31`; see Closure Evidence. No further root cause remains open under this ticket's boundary.

## Closure Evidence

Product Owner runtime recheck, `2026-07-31`, on the standard launcher path:

- Dashboard: `PASS`. No session loss and no authentication error observed after operating Import, confirming the frontend session-clearing narrowing is effective under real use.
- HUE: login succeeded; import of `2026-07-30` data succeeded.
- TCT: browser opened on the first click; login succeeded; import of `2026-07-30` data succeeded.

## Known Residual (Non-Blocking)

- `KNOWN RESIDUAL / DEFERRED / NON-BLOCKING`: on the first HUE login click, the browser window did not open within the expected wait; the second click opened it successfully and login proceeded normally.
- Product Owner explicitly decided this residual does not block acceptance of this ticket.
- No remediation ticket is opened for this residual under this closure; it is recorded here for visibility and must not be hidden or removed from this document.
- Any future remediation of this residual requires a separate Product Owner-authorized ticket; it is out of scope for `AUTO-IMPORT-010`.

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

## Validation Requirements (Met At Closure)

- Repository-managed runtime packages required by HUE are present in backend runtime. — Met.
- HUE browser opens visibly for the Product Owner through the normal product path. — Met (with the known first-click residual recorded above).
- Product Owner can log in successfully. — Met.
- HUE preflight reaches the correct authenticated state. — Met.
- No new Kaspersky blocked-process warning appears. — Met.
- No unrelated TCT, broker, dashboard, launcher-hiding, or profile changes are introduced. — Met.

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

Product Owner runtime check completed and accepted; see Closure Evidence above. This ticket is `COMPLETED / PO RUNTIME PASS / CLOSED`.

This manifest does not authorize any further implementation. It does not authorize reopening broker, coordinator, TCT expansion, or Node window hiding.

The known HUE first-click residual remains recorded above and requires separate Product Owner authorization before any remediation ticket is opened.

Next ticket: `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`, state `READY FOR DISCOVERY/PLANNING / NO IMPLEMENTATION`. Do not dispatch implementation there until ChatGPT coordination issues a separately bounded prompt.
