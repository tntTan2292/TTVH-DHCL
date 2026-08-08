# AUTO-IMPORT-014 CHECKPOINT 001 — Phase 1 Discovery

## Executive State

- Ticket: `AUTO-IMPORT-014`
- Current state: `DISCOVERY COMPLETE / NO FIX IMPLEMENTED`
- This checkpoint records the raw code evidence behind the manifest's findings. No code was changed. No credentials, cookies, tokens, or raw page content were read, logged, or stored — this trace is entirely static code reading plus one `git log`/`grep` pass; no live browser session was opened or inspected in this round.

## Evidence Log

### 1. Shared registry is a true process-wide singleton across both backfill services

```
backend/src/services/dkclSessionPreflightService.js
  const globalRegistry = new Map();   // module scope, one instance per Node process (module cache)

backend/src/services/dkclHueF13BackfillService.js:16
  const sessionPreflightService = new DkclSessionPreflightService();

backend/src/services/tctF13BackfillService.js:118
  this.sessionPreflightService = options.sessionPreflightService || new DkclSessionPreflightService({...});
```
Both backfill services construct their own `DkclSessionPreflightService` instance, but every instance's methods read/write the *same* `globalRegistry` Map (declared once, module scope) — so `entry.client` for a given source is genuinely shared, mutable, process-wide state.

### 2. `preflight()`'s destructive re-probe on an already-authenticated client

```js
// dkclSessionPreflightService.js, preflight(), reached when entry.state
// is NOT one of OPENING_BROWSER/WAITING_FOR_LOGIN/F13_OPENING (e.g. F13_READY)
if (entry.client) {
    let ready = await entry.client.isF13ReportReady().catch(() => false);
    const authenticated = entry.client.isAuthenticated
        ? await entry.client.isAuthenticated().catch(() => false)
        : false;
    if (!ready && authenticated) { /* openF13Report(), return SESSION_VALID */ }
    if (ready) { /* return SESSION_VALID */ }
    await entry.client.restoreWindow?.().catch(() => {});
    const oldClient = entry.client;
    this.transitionEntry(sourceConfig.source, entry, DKCL_LEGACY_STATES.SESSION_EXPIRED, {
        client: null, authenticated: false, backgroundReady: false, windowHidden: false, hideAttempted: false
    });
    await oldClient.close().catch(() => {});   // <-- kills the live context
    return { status: PREFLIGHT_STATUSES.AUTHENTICATION_REQUIRED, error: { code: 'SOURCE_PAGE_REQUIRED', ... } };
}
```
This branch runs on every `preflight()` call once the session is otherwise steady (`F13_READY`), which the frontend calls unconditionally every 5 seconds (see item 6 below). It calls into the *live* page's own `isF13ReportReady()`/`isAuthenticated()` — the same page an active Import operation may be mid-navigation on — with no mutual exclusion, and destructively closes/discards the client if both checks report false at that instant.

### 3. The only mitigation is HUE-only and does not cover the whole exposure window

```js
// dkclSessionPreflightService.js, preflight(), checked BEFORE the block above
if (sourceConfig.source === 'HUE' && entry.activeOperation === 'HUE_QUEUE_RUNNING' && entry.authenticated) {
    return { status: PREFLIGHT_STATUSES.SESSION_VALID, ... };  // short-circuits, skips the destructive branch
}
```
```js
// dkclHueF13BackfillService.js
async processQueue(queue) {
    const entry = this.sessionPreflightService.getRegistryState?.('HUE');
    if (entry) {
        entry.activeOperation = 'HUE_QUEUE_RUNNING';   // set only here
        entry.authenticated = true;
        entry.backgroundReady = true;
    }
    ...
}
...
finishQueueIfTerminal(queue) {
    if (!queue.items.every((item) => QUEUE_TERMINAL_STATUSES.has(item.status))) return;
    ...
    const entry = this.sessionPreflightService.getRegistryState?.('HUE');
    if (entry) { entry.activeOperation = null; }   // cleared only when the whole queue is terminal
    ...
}
```
`activeOperation` is HUE-specific, is not set until `processQueue()` starts (i.e., not during `validateAuthenticationBeforeQueue()`'s own `preflight('HUE')` call, and not during any non-queue single "Update" action), and there is no analogous flag anywhere in `tctF13BackfillService.js` — confirmed by search:
```
$ grep -n "activeOperation" backend/src/services/tctF13BackfillService.js
(no matches)
```

### 4. Both backfill services fetch the same shared client for the entire Import operation

```js
// dkclHueF13BackfillService.js:496
const client = queue.portalClient || this.sessionPreflightService.getInteractiveClient?.('HUE') || null;
```
`queue.portalClient` is never assigned anywhere in this file (confirmed by search — no `queue.portalClient =` assignment exists), so this always falls through to the shared registry client in practice.
```js
// tctF13BackfillService.js:471, :704
const client = this.sessionPreflightService.getInteractiveClient?.('TCT');
```
Identical pattern, no local override, no queue-running exemption.

### 5. Frontend polls both sources unconditionally, every 5 seconds, regardless of active queue

```js
// frontend/src/pages/DataImportCenter.jsx, ~line 226-229
const interval = setInterval(() => {
    ...
    preflightHueSession();
    preflightTctSession();
}, 5000);
```
No check against `queueIsActive`/`tctQueueIsActive` gates this interval for either source — confirmed by reading the surrounding effect and the two flags' only other usages (disabling UI controls, not gating polling).

### 6. TCT has an existing, narrowly-scoped, non-destructive recovery path that HUE lacks

```js
// tctF13BackfillService.js:470-499
async retryWindowHideOnly(queue, item) {
    const client = this.sessionPreflightService.getInteractiveClient?.('TCT');
    const hideWindowFn = client && (client.hideWindow || client.hideBrowserWindow);
    ...
    const hideSuccess = await hideWindowFn.call(client).catch(() => false);
    ...
}
```
No equivalent method exists in `dkclHueF13BackfillService.js` (confirmed by search for `retryWindowHideOnly`/`hideOnly` — no matches). This is evidence a "window failed to hide" class of issue was previously identified and patched non-destructively for TCT specifically, not evidence of a general race-safety mechanism unique to TCT.

### 7. Chromium launch/lock mechanics relevant to the "duplicate windows" symptom

```js
// dkclHueF13PortalClient.js
acquireProfileLock() {
    const parentDir = this.path.dirname(this.profileDir);
    this.fs.mkdirSync(parentDir, { recursive: true });
    this.lockDir = `${this.profileDir}.lock`;
    try { this.fs.mkdirSync(this.lockDir); }
    catch (error) {
        if (error.code === 'EEXIST') throw portalError(`${this.source} DKCL persistent browser profile is already in use.`, 'PROFILE_LOCKED');
        throw error;
    }
}
```
This directory-based mutex is this app's own bookkeeping; it has no relationship to, and does not query, Chromium's internal `SingletonLock`/`SingletonCookie` files inside the profile directory itself (those are only ever *removed* by `browserProcessManager.cleanupStaleLocks()`, never checked before a launch). A `launchPersistentContext()` call issued shortly after a previous context for the same profile was closed (via the destructive branch in finding 2) — while the OS-level Chrome process tree for that previous context has not yet fully exited — is not guarded against by anything in this codebase; Chrome's own profile-singleton IPC behavior (delivering an "open window" request to an already-running process for the same `--user-data-dir` rather than failing) is an external mechanism this code does not detect or reconcile against, other than the `PROFILE_LOCKED`/`LIVE_OWNED`/`LIVE_UNVERIFIED` classification already used in `interactiveAuthenticate()`'s `_classifyLockState()` — which itself is only consulted at the *start* of a fresh `interactiveAuthenticate()` call, not by `preflight()`'s destructive re-probe branch.

### 8. No recent code change explains this as a regression

```
git log --oneline -10 -- backend/src/services/dkclSessionPreflightService.js backend/src/services/dkclHueF13PortalClient.js backend/src/services/dkclHueF13BackfillService.js backend/src/services/tctF13BackfillService.js
```
Most recent touching commit is `f7a74d4f` (`AUTO-IMPORT-013`, adds `LOGIN_TIMEOUT` + diagnostics — does not touch the `preflight()` destructive branch, `activeOperation` exemption, or either backfill service's client-acquisition code). Before that, the last 9 commits touching these files (`1ca7eee1` "Recover stale Hue login-in-progress state" through `92708db4` "AUTO-IMPORT-009 restore portal-sized auth launch window contract") are all prior HUE/TCT session-lifecycle work — the `preflight()` re-probe/close branch, the HUE-only `activeOperation` exemption, and both backfill services' shared-client acquisition pattern all predate `f7a74d4f` and are not introduced by `AUTO-IMPORT-013` — this is a long-standing design gap, not a recent regression.

## Conclusion

The Product Owner's reported symptoms (duplicate windows, an authenticated window not recognized by Import, closing a window causing `FAILED`, foreground-then-late-hide on Re-update) are all explained, with direct code evidence, by a single systemic design gap: `entry.client`/`entry.page` is shared, mutable, process-wide state with no operation-level mutex, accessed concurrently by an unconditional 5-second frontend poll, the interactive login flow, and the Import worker — and `preflight()` contains a destructive close-and-discard branch that can fire on a single transient false reading while an Import operation is actively using the same page. The one existing mitigation (`HUE_QUEUE_RUNNING`) is HUE-only and does not close every exposure window; TCT has no equivalent mitigation and is not structurally protected from the same race — its single clean run in this report is not evidence of architectural immunity.

## Residuals / Not Determined

- The exact moment-by-moment interleaving that produced this specific PO session (which poll fired when, relative to which navigation) was not and could not be reconstructed from static code reading alone — the mechanism is evidence-backed as *plausible and sufficient to explain every reported symptom*, not confirmed via fresh instrumented reproduction (none was performed or requested in this discovery-only phase).
- Whether Chromium's singleton-delegation behavior (finding 7) is the actual mechanism behind the specific "two windows, one authenticated" observation, versus some other multi-page/multi-tab behavior within a single context, was not directly observed in this round (no live session was opened to check `context.pages().length` during the failure).

## Next Action

Await Product Owner/CTO review of the proposed remediation design and file scope in `docs/10_TICKETS/AUTO-IMPORT-014_MANIFEST.md` before any implementation. No further Product Owner testing was requested in this phase.

`NETWORK-MANAGEMENT-001` remains paused, untouched.
