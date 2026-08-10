# AUTO-IMPORT-014 CHECKPOINT 003 — PO Runtime Partial Pass, TCT Re-Update Delta Fix

## Executive State

- Ticket: `AUTO-IMPORT-014`
- Current state: `PO RUNTIME PARTIAL PASS / TCT RE-UPDATE FAIL — FIXED, TECHNICAL GATE PASS, AWAITING PO RECHECK`
- Product Owner tested Phase 2 (commit `0c5d02c3`) on the real machine and confirmed HUE login/Import/Update, HUE Re-update session reuse, TCT login/Import/Update, and the HUE→TCT→HUE sequence all pass with no duplicate windows or polling errors. One failure was reported: selecting exactly one date (`2026-08-07`) for TCT and clicking "Re-Update (1)" returned `"Duplicate refresh_dates are not allowed"` (`DUPLICATE_DATES`). This checkpoint records the delta discovery and fix. No code was changed outside this specific defect; no credentials, cookies, tokens, or raw page content were touched.

## 1. Payload Trace — UI Selection to TCT Re-Update API

- Checkbox (`frontend/src/pages/DataImportCenter.jsx`, TCT scan table, COMPLETE row) → `onChange={() => toggleTctSelectedDate(item.measurement_date, item.status)}`.
- "Update lại" button on the same COMPLETE row → `onClick={() => toggleTctSelectedDate(item.measurement_date, item.status)}` (a separate DOM element, not nested inside the checkbox — a single physical click on either control fires exactly one event; these two controls do not double-fire each other).
- `toggleTctSelectedDate(date, status)` calls `setTctSelectedDates((current) => { ...; if (status === 'COMPLETE') setTctRefreshDates(...); return ...; })` — a **nested `setState` call as a side effect inside another `setState`'s functional updater**.
- `handleStartTctBackfillQueue()` posts `POST /import/dkcl/tct/f13/backfill-queue` with `{ dates: allowedDates, refresh_dates: tctRefreshDates.filter(...) }`.
- Backend: `tctF13BackfillService.js`'s `startQueue(dates, { refreshDates })` → `normalizeOptionalDates(refreshDates, 'refresh_dates')` → throws `DUPLICATE_DATES` (`error.message = "Duplicate refresh_dates are not allowed."`) when, after normalizing, the array's `Set` size is smaller than its length — i.e., the array itself contained the same date more than once.

## 2. Root Cause — Why One Date Produced a Duplicate `refresh_dates`

`frontend/src/main.jsx` wraps the app in `<React.StrictMode>`. React 18's Strict Mode intentionally **invokes functional `setState` updaters twice** in development, specifically to help surface impure updaters that have side effects — which is exactly what `toggleTctSelectedDate`'s outer updater is: it computes a value for `tctSelectedDates` *and* calls `setTctRefreshDates(...)` as a side effect, inside the same function body.

- The outer computation (`tctSelectedDates`) is **idempotent** by construction: `current.includes(date)` gates add-vs-remove, so running the same computation twice with the same `current` input produces the same result both times — the double-invocation is invisible here, and this is exactly why HUE's `tctSelectedDates`-equivalent (`selectedDates`) and TCT's `tctSelectedDates` both stayed correct at length 1, matching the "(1)" the Re-Update button correctly showed.
- The **nested** `setTctRefreshDates((refCurrent) => [...refCurrent, date].sort())` call, however, is a real, independently-dispatched state update each time the outer function body runs — and the outer function body runs *twice* under Strict Mode. React applies functional updates **in the order they were dispatched, each seeing the previous update's result** — so the first dispatch computed `[] → ['2026-08-07']`, and the second dispatch (from the second Strict-Mode invocation of the outer updater) computed `['2026-08-07'] → ['2026-08-07', '2026-08-07']`, because the append was unconditional (no membership check).
- Net effect: `tctSelectedDates` stayed correct (`['2026-08-07']`, 1 entry — matching the "(1)" label), while `tctRefreshDates` silently became `['2026-08-07', '2026-08-07']` (2 entries) — exactly the state that produced the reported `DUPLICATE_DATES` error on submit, from a single, correctly-registered click.
- This is **frontend-created** duplication (item 2 of the PO's investigation instructions) — not a backend normalization defect, and not a genuine leftover/merged queue state. The backend's `normalizeOptionalDates` behaved exactly as designed, correctly rejecting the malformed payload it was given.

## 3. TCT vs HUE Call-Path Comparison

| | HUE | TCT |
| --- | --- | --- |
| Toggle function | `toggleSelectedDate()` (component) → shared pure `toggleDateSelection()` (`hueSelectionHelpers.js`) | `toggleTctSelectedDate()` (component-local, hand-rolled, not using the shared helper) |
| Nested `setState` side effect inside the other's updater | Yes — `setRefreshDates(next.refreshDates)` called inside `setSelectedDates`'s updater | Yes — `setTctRefreshDates(...)` called inside `setTctSelectedDates`'s updater |
| Refresh-dates append (before this fix) | `[...currentRefresh, date].sort()` — **unconditional**, same latent defect | `[...refCurrent, date].sort()` — **unconditional**, same latent defect |
| Exposure to the exact same Strict-Mode double-invocation bug | **Yes, identical exposure** — not structurally protected | **Yes, identical exposure** — not structurally protected |

**Conclusion: the two call paths are structurally symmetric and equally exposed to this defect.** HUE not failing during the Product Owner's own test run is circumstantial (whichever exact click/render timing happened not to trigger the double-dispatch that round), not because HUE's code was different or safer. The fix is therefore applied to both the shared helper (`toggleDateSelection`, used by HUE) and the TCT-local function, closing the same latent defect wherever it exists — this is the same bug, fixed once per call site, not a scope expansion.

## 4. Fix — Minimal, Frontend-Only

- `frontend/src/pages/hueSelectionHelpers.js`, `toggleDateSelection()`: the refresh-dates append is now idempotent — `status === 'COMPLETE' && !currentRefresh.includes(date) ? [...currentRefresh, date].sort() : currentRefresh`.
- `frontend/src/pages/DataImportCenter.jsx`, `toggleTctSelectedDate()`: the same idempotent guard — `refCurrent.includes(date) ? refCurrent : [...refCurrent, date].sort()`.
- `frontend/src/pages/DataImportCenter.jsx`, `handleStartTctBackfillQueue()`: defense-in-depth — the actual submission now de-duplicates via `Array.from(new Set(...))` immediately before sending, so no future state-management path can regress this by sending a duplicate again.
- **Backend validation is unchanged.** `normalizeOptionalDates()` in `tctF13BackfillService.js` still throws `DUPLICATE_DATES` on a genuine duplicate array from any caller — verified by a new dedicated test (below) that this has not been weakened.

## 5. Regression Tests Added

- `frontend/src/pages/dataImportHueSelection.test.js` (exercises the shared `toggleDateSelection()` directly): exactly one date selected produces exactly one entry in both arrays; three distinct dates produce three distinct, non-colliding entries; a direct simulation of the Strict-Mode double-invocation (calling `toggleDateSelection` twice with the identical pre-update inputs, exactly as React's second invocation would) proves the result stays deduplicated; re-clicking an already-selected date toggles cleanly off with no stale duplicate; a pre-existing/stale `refreshDates` entry from an earlier cycle is preserved, not disturbed or duplicated, when a different date is later selected.
- `frontend/src/pages/dataImportTctScan.test.js`: static-source assertions confirming the idempotent guard is present at the `toggleTctSelectedDate` call site, that the old unconditional append is not reintroduced, and that the actual queue-submission code de-duplicates before sending.
- `backend/test_tctF13BackfillService.js` (TEST 4B): the exact PO-reported scenario (`startQueue(['2026-08-07'], { refreshDates: ['2026-08-07'] })`) now succeeds and queues exactly one item; three distinct dates all marked for refresh succeed with three distinct items; and — proving backend validation was not weakened — `startQueue(['2026-08-07'], { refreshDates: ['2026-08-07', '2026-08-07'] })` (a genuine duplicate) still throws `DUPLICATE_DATES`.

## Validation

```
node backend/test_tctF13BackfillService.js          -> all named blocks pass (incl. new TEST 4B)
node frontend/src/pages/dataImportHueSelection.test.js -> ALL targeted logic tests PASSED (incl. 5 new AUTO-IMPORT-014 blocks)
node frontend/src/pages/dataImportTctScan.test.js      -> checks passed (incl. new AUTO-IMPORT-014 assertions; 1 pre-existing assertion updated to match the de-duplicated submission code)
node frontend/src/pages/dataImportWave3Ui.test.js      -> ALL Wave 3 UI checks PASSED (unaffected)
node frontend/src/pages/importDashboardReconciliation.test.js -> 4/4 pass (unaffected)
node backend/test_dkclSessionPreflightService.js       -> unaffected, still passes (this delta did not touch session-lifecycle code)
node backend/test_dkclHueF13SyncService.js             -> 135/135, unaffected
node backend/test_dkclHueF13BackfillService.js         -> 39/39, unaffected
```
`oxlint` on `DataImportCenter.jsx` and `hueSelectionHelpers.js`: 2 pre-existing warnings on untouched lines (unused `_err` catch params), no new warnings.

## Scope Confirmation

5 files changed: `backend/test_tctF13BackfillService.js` (test only — no backend production code touched), `frontend/src/pages/DataImportCenter.jsx`, `frontend/src/pages/dataImportHueSelection.test.js`, `frontend/src/pages/dataImportTctScan.test.js`, `frontend/src/pages/hueSelectionHelpers.js`. `NETWORK-MANAGEMENT-001` / Module QLML: not touched. Production DB / imported data: not touched. `Data QLML/` and both git stashes: untouched. No credentials, cookies, tokens, or raw page content read, logged, or stored.

## Conclusion And Next Action

`AUTO-IMPORT-014` is recorded as `PO RUNTIME PARTIAL PASS / TCT RE-UPDATE FAIL` for the round the Product Owner tested (commit `0c5d02c3`) — HUE and the HUE↔TCT sequence passed; the single TCT Re-Update-with-one-date defect is now root-caused and fixed, with regression coverage for the exact scenario plus adjacent cases, and confirmed not to weaken backend validation. `TECHNICAL GATE PASS` for this delta. **Not** `PO PASS`, **not** `CLOSED`.

Requesting only a targeted Product Owner recheck: select exactly `2026-08-07` for TCT and click Re-Update again on the live machine, confirming it now succeeds end-to-end (Import completes, window hides) with no `DUPLICATE_DATES` error. The remaining items of the original PO Runtime Acceptance Checklist that already passed do not need to be repeated.
