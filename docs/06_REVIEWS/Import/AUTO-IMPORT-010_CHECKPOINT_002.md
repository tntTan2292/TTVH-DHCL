# AUTO-IMPORT-010 CHECKPOINT 002

## Executive State

- Ticket: `AUTO-IMPORT-010`
- Ticket name: `HUE Browser Broker / Browser Launch Recovery`
- Current state: `CHECKPOINT 002 / C1 IMPLEMENTED / PO RUNTIME RECHECK REQUIRED`
- Current boundary: `HUE only`
- Current branch baseline: `codex/da-impl-006`
- Current authoritative baseline `HEAD` / `remote`: `c10151a43b0126c27cbee211f3547946310e68c6`

## Management Summary

- Discovery for the current HUE runtime blocker is completed.
- Architecture review for the current HUE runtime blocker is completed.
- C1 implementation is now completed within the approved dependency-materialization scope.
- Product Owner runtime recheck is now required before any further expansion.

## Locked Findings

- Direct `Playwright + Chromium + HUE profile` already passes.
- Dashboard and Import non-browser APIs are currently healthy in the normal runtime.
- The remaining blocker is not browser capability itself; it is standard-runtime dependency preparedness for HUE browser opening.
- The system must not rely on reinstalling HUE runtime dependencies every time the product starts.
- The system must not rely on a Git-only manifest declaration while leaving required browser runtime assets unprepared on the Product Owner machine.

## Option Review

### Option A Rejected

Source:

- Sonnet discovery proposal

`Commit backend/node_modules/playwright and backend/node_modules/playwright-core into Git`

Reason rejected:

- this only carries the Node package layer,
- it does not guarantee the matching Chromium binary exists outside the repository,
- Product Owner runtime would remain only partially reproducible,
- this was rejected during discovery as insufficient for durable runtime recovery.

### Option B Rejected

Source:

- Sonnet discovery proposal

`Run npm install in the launcher during each startup`

Reason rejected:

- launcher becomes mutating and network-dependent,
- startup behavior becomes less deterministic and harder to support,
- tracked `node_modules` can become dirty,
- backend and Dashboard startup risk becomes unacceptable if install fails or stalls.

### Option C Selected In Principle

Source:

- formed through architecture challenge
- confirmed by Opus review

`One-time setup step + read-only launcher verification + graceful HUE-not-ready behavior`

Reason selected:

- setup responsibility is explicit and bounded,
- launcher remains lightweight and read-only,
- backend can keep Dashboard and non-HUE APIs healthy even when HUE browser prerequisites are missing,
- this creates a cleaner operational contract for Product Owner runtime support.

Decision status:

- `C` is selected in principle only.
- `C1` / `C2` have not been chosen by Product Owner.

## Recommended Implementation Shape

Approved implementation status in this checkpoint:

1. `C1` approved and implemented:
   materialize and commit the required backend runtime packages so HUE standard runtime can require Playwright.
2. `C2` remains unimplemented:
   no launcher changes were introduced in this round.
3. Any next expansion remains blocked on Product Owner runtime evidence.

## Expected File Scope

Planned files to change after authority is granted:

Implemented in `C1`:

- `backend/node_modules/playwright/**`
- `backend/node_modules/playwright-core/**`
- `backend/node_modules/bcryptjs/**`

Not changed in `C1`:

- launcher files
- backend service logic
- dashboard files
- TCT files
- broker/coordinator files
- profile or Import data files

Not authorized in this plan:

- TCT changes
- broker/coordinator revival
- window hiding
- Kaspersky handling
- profile-content changes
- Import data changes

## C1 Implementation Result

This round implemented the approved repository-managed dependency materialization only:

- backend lockfile was used to materialize missing runtime packages,
- `playwright` now resolves successfully from backend runtime,
- `bcryptjs` now resolves successfully from backend runtime,
- no launcher mutation was introduced,
- no browser-flow logic was changed.

## Post-C1 Delta Correction

Additional bounded remediation after `C1`:

- frontend session removal on `401` is now limited to the official auth validation endpoint only,
- business API `401` responses no longer automatically delete `qis_auth_session`,
- Import authorization failures therefore no longer force Dashboard logout through blanket client behavior.

Official session validation endpoint confirmed from backend authority:

- `GET /api/auth/me`

Backend restart classification for the cited PO runtime failure:

- `UNCONFIRMED`

Evidence:

- `backend/src/services/auth/AuthSessionStore.js` is in-memory and would lose all sessions on backend restart,
- current `backend/backend.log` shows a runtime banner for PID `8448` at `2026-07-31T08:51:41.176Z`,
- current live backend process `8448` was created at `2026-07-31 15:51:40` local time,
- current `backend/backend.log` / `backend/backend_err.log` do not contain timestamped evidence proving an additional backend restart exactly at the Product Owner failure moment.

## Backend Error Contract

When HUE prerequisites are missing, backend behavior should:

- keep backend startup healthy,
- keep Dashboard APIs healthy,
- keep Import page usable for non-HUE paths,
- return a controlled HUE-specific readiness failure for HUE open/login,
- report a supportable message that HUE browser runtime setup is required.

## Stability Requirement

The selected path must ensure:

- missing HUE dependency does not crash backend startup,
- missing HUE dependency does not break Dashboard metadata or ranking APIs,
- launcher remains operationally simple,
- Product Owner can distinguish `system healthy but HUE not prepared` from `backend failed`.

## Test And Validation Plan

Technical validation after implementation authority:

- `npm ci` materialization from backend lockfile,
- `require('playwright')` PASS,
- `require('bcryptjs')` PASS,
- `node backend/test_dkclHueF13SyncService.js` PASS,
- `node backend/test_dkclSessionPreflightService.js` PASS,
- Product Owner runtime validation on the normal launcher path remains required.

## Product Owner Acceptance

Product Owner acceptance after implementation should verify:

- main system still starts normally,
- Dashboard still loads normally,
- when HUE dependency is prepared, HUE browser opens usable,
- when HUE dependency is intentionally not prepared, system stays healthy and HUE reports a controlled readiness message,
- no new Kaspersky warning appears,
- no unintended TCT or Import data impact appears.

## Risks

- setup ownership may be unclear unless the operational handoff is documented tightly,
- readiness checks must stay read-only or the launcher may regress again,
- error messaging must be specific enough for support without exposing low-level runtime noise,
- implementation must stay narrowly scoped or the ticket could expand back into the broader browser lifecycle problem.

## Required PO Decision

Next Product Owner decision remains runtime-only:

- verify HUE standard runtime after C1,
- decide whether C1 is sufficient,
- authorize or reject any later `C2` expansion.

Until that runtime decision is recorded:

- no launcher change should begin,
- no expansion to TCT, broker, coordinator, window hiding, Kaspersky, profile, or Import data is allowed.
