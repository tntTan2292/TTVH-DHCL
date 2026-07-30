# AUTO-IMPORT-009 Manifest

- Ticket ID: `AUTO-IMPORT-009`
- Ticket Name: `Auto Import Browser Authentication Remediation`
- Phase: `Import Authentication Recovery`
- Current State: `ACTIVE / PO RUNTIME FAIL`
- Technical Status: `TECHNICAL INVESTIGATION AND PARTIAL REMEDIATIONS RECORDED; NO CURRENT PO PASS`
- Runtime Status: `PO RUNTIME FAIL`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT PASS`
- Current Phase: `ACTIVE IMPORT AUTHENTICATION REMEDIATION`
- Last Reviewed Phase: `PO runtime recheck after latest backend reset`
- Last Reviewed Commit: `be9c5583dad7e116ea338a5cbc923d105fe2fab1`
- Phase Review Status: `ACTIVE / PO RUNTIME FAIL`
- Next Phase Authorization: `Continue bounded Import authentication remediation only until HUE and TCT both open usable PO-visible login windows and complete PO-authenticated validation`
- Activation date: `2026-07-27`
- Primary executor: `Codex`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`
5. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_003.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-009_CHECKPOINT_003.md`

## Authority

`AUTO-IMPORT-007` remains closed and must not be reopened or altered. HUE `2026-07-18` and HUE `2026-07-19` remain locked `PO PASS`. HUE `2026-07-23` remains `MISSING / NOT AUTHORIZED`.

`AUTO-IMPORT-008` remains closed and must not be reopened.

Historical PO acceptance at `29e3a383a25c72a2dc9e5f2cc8667461803e78f6` remains part of repository history only. It is not the current runtime authority for Import authentication.

Latest Product Owner runtime evidence after backend reset at commit `be9c5583dad7e116ea338a5cbc923d105fe2fab1`:

- HUE browser does not open.
- HUE login is not possible.
- TCT browser does not open.
- TCT login is not possible.
- Kaspersky reports no new warning.

Therefore `AUTO-IMPORT-009` is reactivated as the highest-priority active ticket and remains `ACTIVE / PO RUNTIME FAIL`.

The `cmd.exe -> PowerShell` endpoint-security blocker identified earlier is historically important, but later remediation removed the Kaspersky warning without restoring PO-visible browser opening. Internal evidence such as tests, PID discovery, HWND enumeration, URL reachability, or `LOGIN_IN_PROGRESS` does not equal product acceptance.

`8161dd6` is the last Product Owner observed HUE-working historical reference where HUE opened, login succeeded, queue ran, and `2026-07-29` HUE data imported. It is a functional reference only, not an authorization to reset unrelated code blindly.

## Objective

Restore Import authentication end-to-end for both HUE and TCT under Product Owner-visible runtime conditions while preserving accepted Import data, security protections, session isolation, and `.gitignore` hygiene.

## Current Runtime Failure

Current active defect:

- Clicking the HUE login action does not open a usable browser window for the Product Owner.
- Clicking the TCT login action does not open a usable browser window for the Product Owner.
- Login cannot be performed for either source.
- No new Kaspersky warning is raised in the current failing state.

Acceptance remains blocked until both sources pass PO-visible browser opening and authenticated-session validation.

## Historical Remediation Register

These commits are remediation history and must not be recorded as Product Owner pass:

| Commit | Status | Notes |
| --- | --- | --- |
| `a29c739` | `FAILED FIX` | Fresh-launch/window attempt did not establish the original regression source. |
| `13ee615` | `PARTIAL / NOT PO PASS` | Parser/query/window lifecycle changes; PO runtime still failed. |
| `8e0d559` | `PARTIAL / NOT PO PASS` | Foreground/window surfacing changes produced partial recovery only. |
| `442a2a0` | `PARTIAL / NOT PO PASS` | Session lifecycle/readiness changes were not verified end-to-end by Product Owner. |
| `8161dd6` | `HISTORICAL HUE WORKING REFERENCE` | HUE opened and imported `2026-07-29`; TCT still failed. |
| `8800b795` | `SECURITY PARTIAL / NOT PO PASS` | Removed the `cmd.exe` shell chain, Kaspersky warning stopped, but both browser flows regressed. |
| `c1d298859238e25332fbece22ab968fe0e4f152c` | `NOT PO PASS` | Shared HUE/TCT interactive reuse flow did not restore browser opening. |
| `be9c5583dad7e116ea338a5cbc923d105fe2fab1` | `LATEST PO-TESTED / PO RUNTIME FAIL` | Native Windows process enumeration attempt reported internal success but PO runtime still found both browsers did not open. |

## Out Of Scope

- Operation Dashboard Phase 4 remediation while Import authentication remains active.
- Modifying Dashboard generated-content behavior.
- Modifying HUE `2026-07-18`, HUE `2026-07-19`, or any accepted historical Import artifacts.
- Reimporting or overwriting the accepted `2026-07-29` HUE data.
- Disabling Kaspersky or adding broad security exclusions.
- Restoring tracked browser profiles, cookie stores, or sensitive runtime artifacts.
- Broad repository audit or unrelated architecture changes.

## Validation Requirements

For future closure:

- HUE click opens a usable Product Owner visible browser window.
- TCT click opens a separate usable Product Owner visible browser window.
- Product Owner can authenticate successfully for both sources without profile cross-match.
- Authenticated Import UI state remains correct.
- Kaspersky remains enabled with no new blocked-process event.
- No sensitive runtime files become tracked.
- Relevant tests, build, and lint pass.
- `git status` is clean after the bounded remediation commit.

## Completion And Handoff

Current repository priority order:

1. Fix Import authentication end-to-end.
2. Obtain Product Owner runtime pass for HUE and TCT.
3. Only then return to unfinished Operation Dashboard Phase 4 adaptive remediation.

Operation Dashboard Phase 4 remains paused, not closed. Its accepted completed history remains:

- Phase 1 implementation: `6ea7819`
- Phase 1 remediation: `cbe5bc2`
- Phase 2 implementation: `dd9cbf5`
- Governance sync after Phase 1 and 2: `c7852e9`
- Phase 3 implementation: `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`
- Phase 3 PO PASS governance: `5d29c0f0212fc59fac08131e42b5f1e2cfbacf73`

Phase 4 history remains:

- Initial implementation: `235b69d0aa1a5b776b3398fde50c60172f7e4181`
- Documentation sync: `5e1fa20`
- Cleanup and `.gitignore` protection: `f7df0b56e6ec43d97ff48c68dd6fbb2e5ed3f558`

Phase 4 is not `PO PASS`; adaptive desktop usability remediation is deferred until Import authentication receives explicit Product Owner pass.
