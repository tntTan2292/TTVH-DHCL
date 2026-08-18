# AUTO-BACKFILL-F13 - Checkpoint 001

## 1. Activation

- State: `ACTIVE / IMPLEMENTATION AUTHORIZED`
- Date: `2026-08-18`
- Branch: `codex/da-impl-006`
- Expected and observed baseline: `64e9a8550752ef5fc6723dadc9d05d9cda442327`
- Product Owner authority: `PO AUTO-BACKFILL-QUEUE GATE 2 PASS and authorizes AUTO-BACKFILL-F13 only`
- Executor: `Codex`, explicitly authorized for this ticket
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

Queue Gate 2 is accepted and closed. This checkpoint activates only the two verified F1.3 shared adapters. F4.1 adapters, Safety, UI and real Runtime remain inactive.

## 2. Locked Delivery Boundary

Implementation must adapt the existing verified HUE/TCT one-date workflows without changing their Portal identity, navigation, session, source lock, filename, parser or Import behavior. Shared adapters may not invoke legacy multi-date queues or force overwrite a completed SUCCESS date.

Both adapters must be registered before coordinator startup and only F1.3 lanes may become `AUTOMATED`. Tests use isolated fake Portal/download/Import boundaries; no real session, download, Import or Data DKCL operation is authorized.

## 3. Required Acceptance

- Exact single-date HUE and TCT execution contracts.
- Existing report identity, source session and source lock proof.
- No legacy queue invocation.
- SUCCESS skip before Portal/Import.
- Fake acquisition through existing Import pipeline to exact completion.
- `AUTHENTICATION_REQUIRED` propagation without retry/circuit invention.
- Shared global-lease exclusion and startup registration ordering.
- Restart executor resolution; F4.1 manual-only preservation.
- Queue/Coverage and F1.3/F4.1 regressions.

Implementation architecture, test evidence, safety proof and final commit will be appended before Gate 3 handoff.

## 4. Technical Execution Report

### 4.1 Registry and verified identity

`autoBackfillF13Contract.js` is the single source for the two accepted identities:

| Lane | Executor | Existing report/filter identity | Existing generated resource identity |
| --- | --- | --- | --- |
| HUE | `DKCL_F13_HUE_SINGLE_DATE_V1` | `/kpi/chat-luong-phat-buu-gui-lien-tinh`, `GR=BC`, province `53`, detail | `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet` |
| TCT | `DKCL_F13_TCT_SINGLE_DATE_V1` | same accepted F1.3 route, `GR=TINH`, province `ALL`, summary | `F1.3_chat_luong_phat_buu_giay_lien_tinh` |

The F1.3 registry lanes reference these exact identities and are `AUTOMATED`. F4.1 registrations were not edited and remain `MANUAL_ONLY / PORTAL_ADAPTER_NOT_VERIFIED`.

### 4.2 One-date execution boundary

`autoBackfillF13Executors.js` validates exact indicator, lane and ISO date input. It requires the existing session preflight interface, an existing manually authenticated interactive client, the existing per-source lock, and the existing active-operation marker. It never opens a legacy in-memory backfill queue.

HUE delegates to `HueF13Adapter`/`DkclHueF13SyncService.start()` with `requireExistingSession=true`, `forceReimport=false`, the accepted shared client and one date, then awaits that one run. TCT delegates to `TctF13Adapter`/`runOneDateImport()` with one date, the persisted job ID as evidence identity, `refreshRequested=false` and the accepted shared client. All navigation, filters, match strings, parsing, Import and artifact verification remain in the existing services.

### 4.3 Queue and startup integration

`autoBackfillQueueRuntime.buildRuntime()` constructs the executor registry and registers both verified F1.3 adapters before it constructs the Queue service or coordinator. Restarted persisted work therefore resolves the same executor IDs. SQLite remains the only global lease authority; the source locks protect session ownership but do not introduce a second shared-job scheduler.

The existing pre-execution completion check is unchanged. The focused external-SUCCESS test proves the adapter is not invoked. Post-execution completion still requires exact facts, Import evidence and Processed artifact through the lane completion policy.

Authentication loss is raised as `AUTHENTICATION_REQUIRED`. The coordinator stops that drain and remains dormant with no poll timer until a later explicit wake. This is only the approved interim adapter contract; no Safety retry/backoff/circuit state was added.

## 5. Acceptance Evidence

| Requirement | Result |
| --- | --- |
| HUE/TCT execute exactly one requested date | PASS |
| Exact accepted report/resource identity | PASS |
| Manual session, preflight, source lock and active marker | PASS |
| No legacy multi-date queue invocation | PASS |
| External SUCCESS skips executor/Portal/Import | PASS |
| Existing fake download uses accepted Import pipeline and satisfies completion | PASS (`test_dkclHueF13SyncService.js`) |
| Authentication propagation stops later drain | PASS |
| HUE/TCT global lease exclusion | PASS |
| Registration precedes coordinator construction | PASS |
| Restart resolves persisted F1.3 executor | PASS |
| F4.1 remains manual-only with no executable adapter | PASS |

Commands and results:

- `node --test test_autoBackfillF13Executors.js test_autoBackfillCoverageService.js test_autoBackfillCoverageController.js test_autoBackfillQueueService.js test_autoBackfillQueueController.js` -> `43/43 PASS`.
- `node test_dkclHueF13SyncService.js` -> `135/135 PASS`.
- `node test_dkclHueF13BackfillService.js` -> `39/39 PASS`.
- `node test_tctF13BackfillService.js` -> PASS.
- `node test_importProcessor.js` -> `59/59 PASS`.
- `node test_importPipelineRace.js` -> `41/41 PASS`.
- `node test_e2e_import_engine.js` -> `65/65 PASS`.
- F4.1 parser/Import/migration suite -> `19/19 PASS`.

All queue/Import writes in acceptance used isolated temporary SQLite databases and temporary directories. No real Portal/browser session was opened and no real download, queue execution or Import was run. The unchanged F4.1 suite includes two read-only source-reconciliation checks; they performed no Import or file/database mutation.

## 6. Scope and Safety Proof

- No frontend or UI file changed.
- No schema/migration or business-data file changed.
- No F4.1 Portal identity, selector, adapter or execution path was inferred.
- No retry/backoff/circuit-breaker runtime was implemented.
- Legacy HUE/TCT manual Import and in-memory backfill APIs remain intact and pass their regressions.
- `.claude/` and `Data QLML/` were not read, modified or staged.
- No successor ticket is activated.

## 7. Gate 3 Handoff

State: `AUTO-BACKFILL-F13 IMPLEMENTED / READY FOR PO GATE 3`.

Gate 3 remains a Product Owner decision. No technical completion in this checkpoint authorizes F41, Safety, UI or Runtime.

## 8. PO Gate 3 PASS And Closure

The Product Owner granted `AUTO-BACKFILL-F13 GATE 3 PASS` on `2026-08-18` and authorized `AUTO-BACKFILL-F41` only from baseline `5a2cf358e68baa0ae6f7ae1f22814f535b564fb9`.

F13 closes `COMPLETED / PO GATE 3 PASS`. F41 activation and per-lane discovery evidence begin in `docs/06_REVIEWS/Import/AUTO-BACKFILL-F41_CHECKPOINT_001.md`. Safety, UI and Runtime remain inactive.
