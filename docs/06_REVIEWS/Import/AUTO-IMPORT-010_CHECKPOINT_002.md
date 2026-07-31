# AUTO-IMPORT-010 CHECKPOINT 002

## Executive State

- Ticket: `AUTO-IMPORT-010`
- Ticket name: `HUE Browser Broker / Browser Launch Recovery`
- Current state: `CHECKPOINT 002 / DISCOVERY COMPLETED / IMPLEMENTATION AUTHORITY PENDING`
- Current boundary: `HUE only`
- Current branch baseline: `codex/da-impl-006`
- Current authoritative baseline `HEAD` / `remote`: `c10151a43b0126c27cbee211f3547946310e68c6`

## Management Summary

- Discovery for the current HUE runtime blocker is completed.
- Architecture review for the current HUE runtime blocker is completed.
- Product code is intentionally unchanged in this checkpoint.
- Product Owner has not yet granted implementation authority for the selected recovery path.

## Locked Findings

- Direct `Playwright + Chromium + HUE profile` already passes.
- Dashboard and Import non-browser APIs are currently healthy in the normal runtime.
- The remaining blocker is not browser capability itself; it is standard-runtime dependency preparedness for HUE browser opening.
- The system must not rely on reinstalling HUE runtime dependencies every time the product starts.
- The system must not rely on a Git-only manifest declaration while leaving required browser runtime assets unprepared on the Product Owner machine.

## Option Review

### Option A Rejected

`Install dependency during each launcher start`

Reason rejected:

- startup becomes nondeterministic,
- launcher behavior becomes heavier and riskier,
- failure in HUE dependency provisioning could disturb the main backend start path,
- this does not fit the requirement that Dashboard and core backend remain stable even when HUE is not ready.

### Option B Rejected

`Commit package declaration only and assume runtime binaries exist`

Reason rejected:

- package declaration alone did not guarantee Product Owner runtime success,
- Chromium/browser runtime assets can still be absent even when manifests look correct,
- this leaves the environment only partially reproducible.

### Option C Selected In Principle

`One-time setup step + read-only launcher verification + graceful HUE-not-ready behavior`

Reason selected:

- setup responsibility is explicit and bounded,
- launcher remains lightweight and read-only,
- backend can keep Dashboard and non-HUE APIs healthy even when HUE browser prerequisites are missing,
- this creates a cleaner operational contract for Product Owner runtime support.

## Recommended Implementation Shape

No implementation authority is granted yet in this checkpoint.

If Product Owner authorizes implementation, the bounded plan is:

1. Add one dedicated setup script that prepares HUE browser dependencies one time on the target machine.
2. Add one read-only runtime check that verifies whether HUE browser prerequisites are already present.
3. Keep HUE browser open/login flow isolated so missing HUE dependencies return a controlled HUE-specific readiness failure instead of damaging the main backend or Dashboard runtime.

## Expected File Scope

Planned files to change after authority is granted:

- `backend/package.json`
  only if a small setup/readiness command entry is needed
- `backend/package-lock.json`
  only if the setup contract requires lock-consistent scripting metadata
- `backend/scripts/*`
  one-time HUE dependency setup and local readiness verification
- `backend/src/services/dkclHueF13PortalClient.js`
  only if needed to surface a controlled HUE-not-ready error
- `backend/src/services/dkclSessionPreflightService.js`
  only if needed to map HUE-not-ready into the existing preflight response path
- `backend/server.js` or current backend bootstrap surface
  only if needed for a read-only startup check registration
- targeted HUE tests only

Not authorized in this plan:

- TCT changes
- broker/coordinator revival
- window hiding
- Kaspersky handling
- profile-content changes
- Import data changes

## One-Time Setup Contract

The setup step should:

- run separately from normal product launch,
- install or verify the exact HUE browser runtime dependency set once,
- verify both Node package availability and Chromium executable availability,
- produce a clear success/fail result for support handoff,
- avoid modifying business data, browser profile content, or Dashboard behavior.

## Launcher Read-Only Check

The normal launcher should only:

- verify whether HUE browser prerequisites are present,
- record a simple readiness result,
- avoid running install or repair logic automatically,
- continue bringing up Dashboard/backend even if HUE is marked not ready.

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

- unit test one-time setup readiness detection,
- unit test launcher read-only check,
- unit test controlled HUE-not-ready response path,
- regression test that Dashboard/backend startup remains healthy when HUE dependency is absent,
- regression test that HUE open/login proceeds when dependency is present,
- `npm ci` reproducibility check for declared backend packages,
- Product Owner runtime validation on the normal launcher path.

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

Before any implementation begins, Product Owner must explicitly authorize:

- the one-time setup model,
- the exact bounded file scope,
- the controlled HUE-not-ready runtime response,
- the rule that Dashboard/backend health is protected even when HUE setup is incomplete.

Until that authority is granted:

- no product-code implementation should begin,
- no dependency install should be committed as part of product startup,
- no expansion to TCT, broker, coordinator, window hiding, Kaspersky, profile, or Import data is allowed.
