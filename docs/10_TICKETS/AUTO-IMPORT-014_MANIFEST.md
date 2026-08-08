# AUTO-IMPORT-014 Manifest

- Ticket ID: `AUTO-IMPORT-014`
- Ticket Name: `HUE/TCT session reliability hardening — shared browser/page lifecycle race`
- Phase: `Emergency remediation — Phase 1, discovery only`
- Current State: `DISCOVERY COMPLETE / SYSTEMIC ROOT CAUSE IDENTIFIED BY CODE READING / NO FIX IMPLEMENTED`
- Technical Status: `Read-only trace of dkclSessionPreflightService.js, dkclHueF13PortalClient.js, browserProcessManager.js, dkclHueF13BackfillService.js, tctF13BackfillService.js, and DataImportCenter.jsx polling. No code changed.`
- PO UI Check Required: `Not yet — discovery only, no fix implemented`
- PO Product Status: `NOT PASS — awaiting PO/CTO decision on remediation design before any implementation`
- Activation date: `2026-08-07`
- Primary executor: `Claude Code`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-014_MANIFEST.md`
5. Required Reading from this manifest

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-014_CHECKPOINT_001.md`

Required Reading:

- `docs/06_REVIEWS/Import/AUTO-IMPORT-014_CHECKPOINT_001.md` — full discovery evidence (code excerpts, call-path trace)

## Authority

Emergency ticket activated directly by Product Owner priority directive, `2026-08-07`, following runtime evidence observed after `AUTO-IMPORT-013` was closed `PO RUNTIME PASS`. This is explicitly framed by the Product Owner as a general HUE/TCT session-lifecycle reliability defect, not a per-symptom patch — do not treat it as a reopening of `AUTO-IMPORT-013` (that ticket's specific fix, the `LOGIN_TIMEOUT` state and the frontend false-positive fix, remains correct and is not reverted).

`NETWORK-MANAGEMENT-001` / Module QLML: out of scope, not touched.

## Objective

Determine, read-only, why HUE (and potentially TCT) sessions exhibit unstable browser/page lifecycle behavior: duplicate Chrome windows/pages appearing, an authenticated window not being recognized by Import, closing one window causing the operation to go `FAILED`, and the window surfacing to foreground during Re-update instead of staying hidden — then propose (not implement) a remediation design.

## Reproduction Result (as reported by Product Owner, not independently re-triggered)

1. HUE initially reported an invalid DKCL session.
2. TCT logged in successfully; its window auto-hid entirely; Import for `2026-08-07` succeeded.
3. Returning to HUE: login succeeded but multiple Chrome windows/pages appeared — one showed the HUE user already logged in, but Import did not recognize that session; another window still asked for login.
4. When the Product Owner closed the extra window, the HUE task transitioned to `FAILED`.
5. Clicking "Thử lại đăng nhập" (Retry login) succeeded, and Import for `2026-08-07` completed.
6. Re-updating HUE for `2026-08-06`: Chrome came to the foreground again and only auto-hid after the Re-import finished.

## Discovery Findings

### 1. Browser instances, contexts, pages, profiles, and lock owners per source

Design intent (from code): exactly one profile directory, one `<profile>.lock` mutex directory (this app's own, distinct from Chromium's internal `SingletonLock`), one live `chromium.launchPersistentContext()` (= one native Chrome process tree), and one tracked `page` reference (`entry.client.page`) per source (`HUE`/`TCT`), held in a single module-level `globalRegistry` Map (`dkclSessionPreflightService.js`) shared by every consumer of `DkclSessionPreflightService` in the process (module-cache singleton — confirmed both `dkclHueF13BackfillService.js` and `tctF13BackfillService.js` construct their own `DkclSessionPreflightService` instances, but both read/write the *same* `globalRegistry` entry because the Map is declared once at module scope and Node caches the module).

Runtime reality — **at least three independent call paths can each attempt to open, probe, or close a persistent context against the same profile directory, with no single owner enforcing exclusivity over the in-memory `entry.client` object itself**:

- `interactiveAuthenticate()` → `prepareInteractiveAuthentication()`: the one path that should be the sole "owner" — creates the visible interactive context, stores it as `entry.client`.
- `preflight()`, when `entry.client` is falsy: creates its own **separate, headless, throwaway** context via `client.authenticate({ requireExistingSession: true })`, then **always closes it in a `finally` block** — including on the success path (`SESSION_VALID`). This runs on **every 5-second frontend poll** (`DataImportCenter.jsx` line ~226-229, unconditional, not gated on queue activity) whenever `entry.client` is null, meaning a real Chromium process is launched and torn down against the profile roughly every 5 seconds while idle.
- `preflight()`, when `entry.client` is truthy but the registry state is *not* one of the in-progress lifecycle states (`OPENING_BROWSER`/`WAITING_FOR_LOGIN`/`F13_OPENING`) — i.e. typically `F13_READY` after a successful login: re-probes the *same live* `entry.client` by calling `isF13ReportReady()` and `isAuthenticated()` on its real page, and **if both report false at that instant, calls `oldClient.close()` and discards it** (see finding 3below). This runs on the same unconditional 5-second poll.
- The backfill worker (`processQueueItem()` in `dkclHueF13BackfillService.js`, and the equivalent in `tctF13BackfillService.js`) fetches the *same* `entry.client` via `getInteractiveClient(source)` and drives `page` navigation/exports on it for the entire duration of an Import run.

The `.lock` directory only prevents two *concurrent* `acquireProfileLock()` calls from overlapping; it does not prevent a *sequential* reopen (new `launchPersistentContext()`) shortly after an old context was destructively closed while its underlying OS process/Chromium singleton state has not fully torn down — which is the likely mechanism for the "two windows" symptom (see finding 3/4).

### 2. Which page does what, for HUE

- **Receives the login action**: `entry.client.page`, the one page `waitForPortalCapablePage()` selects immediately after `prepareInteractiveAuthentication()`'s `launchPersistentContext()` call.
- **Is checked for authentication**: the same `entry.client.page`, via `isAuthenticated()` (`dkclHueF13PortalClient.js`) — called from three independent sites: the manual-login wait loop, `preflight()`'s post-login re-probe (above), and `openF13Report()`'s internal checks. All three are *intended* to reference the same page; they do only as long as `entry.client` has not been silently replaced or nulled between calls (a race, not a guarantee).
- **Is used by the Import client**: the same `entry.client`, retrieved by `processQueueItem()` via `getInteractiveClient('HUE')` (`dkclHueF13BackfillService.js:496`) — `queue.portalClient` is never actually assigned anywhere in this file (confirmed by search), so the fallback to the shared registry client is the *only* path exercised in practice.
- **Whose closing causes `FAILED`**: closing what the Product Owner perceives as "an extra window" plausibly closes the native window backing the *same* CDP-tracked context that `entry.client.page` belongs to (see finding 1 — duplicate windows can share the same underlying automation session via Chromium's own profile-singleton IPC). Playwright's `context.on('close', ...)` fires `onDisconnect`, set in `dkclSessionPreflightService.js`'s `interactiveAuthenticate()`, which nulls `entry.client` and marks the entry `SESSION_EXPIRED` — but if this happens *while* `processQueueItem()`'s own `runOneDate()` call is mid-flight against that same page, the in-flight Playwright calls (`page.goto`/`page.locator(...)`) throw a "Target closed" style error that is not one of the specifically-handled codes, propagating up as a generic error that marks the *queue item* (and then the whole queue, via `finishQueueIfTerminal()`) `FAILED`. This mapping is evidence-backed by code reading, not independently reproduced with fresh instrumentation.

### 3. Why an authenticated window is not recognized by Import

Two independent, code-confirmed mechanisms, not mutually exclusive:

- **The destructive re-probe in `preflight()`.** When `entry.state` is `F13_READY` (the normal steady state after a successful login) and `entry.client` is set, every 5-second poll calls `isF13ReportReady()` then, if that is false, `isAuthenticated()` — both against the *live* page that may, at that exact instant, be mid-navigation because the backfill worker is actively using it (submitting filters, waiting for results, exporting). If both checks report false at that instant (a real possibility during a multi-second navigation), `preflight()` calls `oldClient.close().catch(() => {})` and transitions the entry to `SESSION_EXPIRED` with `client: null` — **destroying the very session the Import worker is using, out from under it**, based on a transient false reading rather than a real failure. The only mitigation in the codebase is a narrow exemption: `sourceConfig.source === 'HUE' && entry.activeOperation === 'HUE_QUEUE_RUNNING' && entry.authenticated` short-circuits `preflight()` before it reaches the destructive branch. This exemption is set only inside `processQueue()` (`dkclHueF13BackfillService.js:456-461`) for the duration of the whole backfill queue, and cleared only when every item is terminal (`finishQueueIfTerminal()`). It does **not** cover: the `validateAuthenticationBeforeQueue()` call that runs *before* the queue starts and *before* `activeOperation` is set; any single, non-queue "Update" action that does not go through `processQueue()`; or any window where `entry.authenticated` has already flipped `false` from an earlier race. **No equivalent exemption exists for TCT at all** — `tctF13BackfillService.js` retrieves `entry.client` via the identical `getInteractiveClient('TCT')` pattern with no `TCT_QUEUE_RUNNING`-style flag anywhere in the file.
- **Chromium's own profile-directory singleton behavior.** Launching `chromium.launchPersistentContext()` a second time against a `user-data-dir` that a still-alive (even if no longer JS-tracked) Chrome process holds does not reliably fail — Chrome's singleton mechanism can instead deliver an "open new window" request to the already-running process via its own IPC, producing a second, genuinely separate top-level window in the *same* underlying browser process, while Playwright's new `launchPersistentContext()` call binds `this.page` to whichever page `waitForPortalCapablePage()` happens to pick up. This plausibly explains "one window already logged in, another still asking for login" as two windows of what was, at the OS level, briefly the same or an overlapping profile-owning process, with only one of them wired into the current JS `entry.client.page` reference.

### 4. Why retry creates extra windows; why closing one causes `FAILED`; why Re-update shows foreground-then-hide

- **Extra windows on retry**: a direct consequence of finding 3 — if `entry.client` was destructively closed (or the underlying process didn't fully exit before a new launch), the next `interactiveAuthenticate()` (manual retry, or an automatic retry path) issues a fresh `launchPersistentContext()` against a profile directory whose previous OS process may not be fully gone, risking exactly the singleton-delegation behavior above.
- **Closing one window → `FAILED`**: covered in finding 2 — closing the window backing the tracked context disconnects the context Playwright is driving mid-operation, and the resulting error is not classified into a recoverable state, so it surfaces as a generic queue/task failure.
- **Re-update foreground-then-hide-late**: the post-login hide behavior (`hideAttempted`/`windowHidden`, set once inside `interactiveAuthenticate()`'s background task after reaching `F13_READY`) only runs once, right after a *fresh* login completes. If Re-update's `validateAuthenticationBeforeQueue()`/`processQueueItem()` had to trigger a brand-new `interactiveAuthenticate()` because the previously-hidden `entry.client` had already been invalidated by the finding-3 race, the window is visible for the *entire* duration of that fresh re-authentication + import run, and only hides once that background task's post-`F13_READY` hide step finally runs — which lines up exactly with "Chrome came to foreground and only hid after Re-import finished." `dkclHueF13BackfillService.js`'s own per-item `hideWindow()` call in `processQueueItem()` (line ~498-500) assumes a window that is *already* a stable, hidden, authenticated session; it does not address a mid-run re-authentication.

### 5. HUE vs TCT call-path comparison

Both sources are wired through the *identical* `DkclSessionPreflightService`/`globalRegistry`/`getInteractiveClient()` pattern, and the frontend polls both `preflightHueSession()` and `preflightTctSession()` unconditionally every 5 seconds with **no gating on active-queue state for either source** (`DataImportCenter.jsx` line ~226-229). There is **no code-level structural protection unique to TCT** that would make it inherently safer from the same race — the `HUE_QUEUE_RUNNING` exemption in `preflight()` is HUE-specific and incomplete (finding 3), and no TCT equivalent exists at all. Two concrete, code-confirmed *asymmetries* exist, but neither is a general race-safety mechanism:

- TCT has a dedicated, narrowly-scoped recovery action, `retryWindowHideOnly()` (`tctF13BackfillService.js:470-499`), that re-attempts *only* hiding an already-authenticated TCT window without forcing a full re-login — evidence that a "window failed to hide" class of issue was previously identified and patched non-destructively for TCT specifically. No equivalent exists for HUE.
- The reported sequence had TCT running once, cleanly, start-to-finish with its window hiding immediately — a single successful pass is not evidence that TCT is structurally immune to the same shared-client race; it is consistent with the race being timing-dependent (more polling cycles overlapping with more/longer navigations increases the odds of the destructive branch firing) rather than architecturally excluded for TCT.

**Conclusion for item 5: HUE's apparent instability and TCT's apparent stability in this one PO session are not explained by a structural safety difference in the code. The underlying shared-mutable-client race is present for both sources; HUE's exposure was very likely just realized this time because of a longer, multi-step sequence (initial invalid session → interactive login → queue-driven import → later Re-update) that gave more polling cycles a chance to race against an active navigation.**

## Distinguishing Direct vs Systemic Root Cause (Report Requirement)

- **A. Direct root cause**: `preflight()`'s post-login re-probe branch (`dkclSessionPreflightService.js`, the `if (entry.client) {...}` block reached once `entry.state` is not an in-progress lifecycle state) can destructively `close()` and null out a live, actively-in-use interactive browser client based on a single transient `isF13ReportReady()`/`isAuthenticated()` false reading, with no mutual exclusion against a concurrently running Import operation on the same page. The only mitigation (`HUE_QUEUE_RUNNING` exemption) is HUE-only, timing-fragile, and does not cover every window of exposure.
- **B. Systemic root cause**: the session-lifecycle design treats `entry.client`/`entry.page` as a single shared mutable resource accessed concurrently by (1) a fixed-interval frontend poll with no back-off or activity awareness, (2) an interactive login flow, and (3) an Import worker — with no single authoritative owner, no operation-level mutex, no rebind-after-redirect step, and no reconciliation between the app's own `.lock` directory bookkeeping and the OS-level Chromium process/singleton-profile reality. This is a design gap shared identically by both HUE and TCT; it is not source-specific.

## Out Of Scope (This Ticket, Discovery Phase)

- Any code change — none was made.
- `NETWORK-MANAGEMENT-001` / Module QLML — untouched.
- Any credential, cookie, token, or raw page-content logging — none was added, read, or stored.
- Auto-login development — none proposed or implemented.
- Requesting further Product Owner runtime testing in this phase — none requested; this report stands on read-only code evidence and the Product Owner's own already-reported symptoms.

## Proposed Remediation Design (Not Yet Authorized/Implemented)

Goals mapped to the Product Owner's explicit acceptance list:

1. **Single authoritative owner per source.** Introduce an explicit async mutex/queue (e.g. a per-source promise chain) inside `DkclSessionPreflightService` so that `preflight()`, `interactiveAuthenticate()`, and any Import-worker access to `entry.client` are serialized against each other for the same source — no two of these paths touch the live client concurrently.
2. **Rebind to the authenticated page after login/redirect**, instead of trusting a single `this.page` reference captured once at launch: after `waitForManualAuthentication()` succeeds, re-resolve the *current* authenticated page from `context.pages()` (already available via `captureLoginDiagnostics()`'s `pages` lookup added in `AUTO-IMPORT-013`) rather than assuming the original page object is still the right one.
3. **Reconcile/cleanup before creating a new context.** Before any `launchPersistentContext()` call, actively verify (via `browserProcessManager.findBrowserProcessByProfile()`, already used elsewhere) that no live process still owns the profile directory, and terminate/clean up a confirmed-orphaned one first — closing the gap between this app's `.lock` bookkeeping and Chromium's own process/singleton reality.
4. **Closing one page must not fail the session if another valid page remains.** Replace the single-`this.page` assumption with an explicit "is there still at least one authenticated page in this context" check before treating a page-level disconnect as fatal.
5. **Re-update reuses a valid existing session** rather than unconditionally re-authenticating — gate re-authentication on a real, freshly-verified check, not on whatever `entry.client` happens to be at that moment.
6. **Hide windows as soon as no Product Owner action is needed**, including mid-recovery paths (e.g., TCT's existing `retryWindowHideOnly()` pattern generalized), not only once at the end of the very first login.
7. **HUE and TCT stay independent** in profile, lock, state, and failure — already true by directory/keying convention; the remediation must preserve this and must not introduce any cross-source coupling.
8. **Bounded backend-restart recovery, timeout, and cleanup** — building on `AUTO-IMPORT-013`'s `LOGIN_TIMEOUT` state and the existing `DkclSessionCoordinator` restart-recovery path; extend the same bounded-outcome principle to the new mutex/reconciliation logic so no operation can hang indefinitely waiting on a lock that will never release.
9. **UI reports the real state/cause**, extending `AUTO-IMPORT-013`'s frontend fix so a session invalidated by reconciliation (rather than a genuine timeout) surfaces its own accurate message, not a reused generic one.

This design is a starting proposal for Product Owner/CTO review — it is not authorized for implementation.

## Proposed File Scope (Estimate Only, Not Authorized)

- `backend/src/services/dkclSessionPreflightService.js` — per-source mutex/serialization; remove or gate the destructive re-probe branch; extend the `*_QUEUE_RUNNING`-style exemption (or replace it with the mutex) symmetrically for TCT.
- `backend/src/services/dkclHueF13PortalClient.js` — page rebind-after-login helper; multi-page-aware "still authenticated" check before treating a disconnect as fatal.
- `backend/src/services/dkclHueF13BackfillService.js` / `backend/src/services/tctF13BackfillService.js` — acquire/release the new mutex around Import operations; align TCT's already-existing hide-recovery pattern with HUE where applicable.
- `backend/src/services/browserProcessManager.js` — likely reused as-is for reconciliation (`findBrowserProcessByProfile`, `terminateProcessTree`, `cleanupStaleLocks`); possible minor additions only.
- `backend/src/services/dkclSessionCoordinator.js` — possible extension if restart-recovery needs to persist mutex/reconciliation state across a backend restart.
- `frontend/src/pages/DataImportCenter.jsx` — possible new status/message rendering for a reconciliation-driven session invalidation, and/or gating the 5-second poll on active-queue state as a defense-in-depth measure.

Exact scope to be confirmed once a design is authorized; no file has been touched in this discovery round.

## Test Matrix (Mandatory, For The Implementation Phase Once Authorized)

- Login opens a new page.
- Two pages exist simultaneously; only one is authenticated.
- The old/original login page is closed.
- Retry after `FAILED`.
- Re-update while the session is still valid, and while it has expired.
- Backend restart mid-session.
- HUE → TCT → HUE run in immediate succession.
- Repeated-cycle / soak test to detect accumulating browser processes or pages over many cycles.

## Validation Requirements (For The Implementation Phase, Once Authorized)

- No credential, cookie, token, or raw page-content logging introduced.
- No automated credential entry introduced.
- `fact_f13` row count and existing imported data unchanged by this ticket; `Data QLML/` and both stashes untouched; `NETWORK-MANAGEMENT-001` untouched.
- Full regression: existing `AUTO-IMPORT-013` fix (`LOGIN_TIMEOUT`, frontend false-positive fix) remains intact and covered by its existing tests.
- Product Owner runtime confirmation required across the full test matrix above before any `PO PASS`. This ticket's own technical work does not self-award `PO PASS`.

## Completion And Handoff

This ticket does not close in this round. It remains `DISCOVERY COMPLETE`, awaiting Product Owner/CTO review of the proposed remediation design and file scope before any implementation begins. No further Product Owner testing was requested in this phase, per instruction.

`NETWORK-MANAGEMENT-001` remains `PAUSED` at its current state, untouched. Do not activate any next ticket beyond what Product Owner explicitly authorizes.
