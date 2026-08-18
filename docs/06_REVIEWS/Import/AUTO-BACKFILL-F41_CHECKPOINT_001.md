# AUTO-BACKFILL-F41 - Checkpoint 001

## 1. Activation

- State: `ACTIVE / DISCOVERY AUTHORIZED`
- Date: `2026-08-18`
- Branch: `codex/da-impl-006`
- Expected and observed baseline: `5a2cf358e68baa0ae6f7ae1f22814f535b564fb9`
- Product Owner authority: `PO AUTO-BACKFILL-F13 GATE 3 PASS and authorizes AUTO-BACKFILL-F41 only`
- Executor: `Codex`, explicitly authorized for this ticket
- Initial worktree: clean outside excluded untracked `.claude/` and `Data QLML/`

F13 Gate 3 is accepted and closed. This checkpoint activates only F4.1 per-lane discovery and evidence-gated adapters. Safety, UI, Runtime and every later ticket remain inactive.

## 2. Discovery Contract

Static inspection precedes live work. Live evidence requires the existing manually authenticated HUE/TCT session and is bounded to `2026-08-01`. Credentials are never requested or accessed. If export evidence is required, each lane is limited to one controlled export into a ticket-specific temporary directory outside Data DKCL, with no Import or database write and exact cleanup of only discovery artifacts.

Report identity, route, filters, readiness, export control, generated-resource match, filename behavior, cleanup and parser compatibility must all be independently observed. The official display name is not evidence for any selector or resource identity.

## 3. Initial Evidence State

| Lane | Static evidence | Live session evidence | Registry state | Disposition |
| --- | --- | --- | --- | --- |
| HUE | Pending delta inspection | Not yet available | `MANUAL_ONLY` | `PENDING VERIFICATION` |
| TCT | Pending delta inspection | Not yet available | `MANUAL_ONLY` | `PENDING VERIFICATION` |

No product code has been edited at this activation checkpoint.

## 4. Acceptance And Stop

Each proven lane requires exact single-date identity, session/lock/active-operation proof, no nested queue, no force overwrite, SUCCESS skip, isolated fake Portal-to-F4.1-Import completion, and locked HUE/TCT reconciliation. One lane cannot authorize the other.

Implementation/discovery evidence, lane disposition, validation, scope proof and final Git handoff will be appended. Missing manual authentication or insufficient Portal evidence is a legitimate `BLOCKED / MANUAL_ONLY` result and must never be filled by inference.

## 5. Delta-only Static Findings

Static inspection covered the existing DKCL Portal client, F1.3 one-date executors, shared session/preflight registry, Queue runtime registration, F4.1 registry contracts, parsers, completion policies and Phase 2 Import pipeline.

| Surface | Finding | F4.1 consequence |
| --- | --- | --- |
| F1.3 Portal route and selectors | Hard-bound to the accepted F1.3 route, filter names, summary/detail export actions and F1.3 generated-resource match strings | Cannot be reused as F4.1 identity evidence |
| Generated files | Generic `/files` polling, exact download and exact-row cleanup are reusable after a F4.1 resource identity is observed | Foundation only; no F4.1 match is known |
| Session lifecycle | Manual HUE/TCT preflight, source lock and active-operation protection exist | Reusable after report discovery; session validity alone does not prove a report |
| F4.1 HUE | Filename-only date rule, 42-column parser, `fact_f41`, completion policy and Import path exist | Acquisition identity remains missing |
| F4.1 TCT | Filename-only date rule, positional 38-column parser, raw-46/accepted-34 contract, `fact_f41_national`, completion policy and Import path exist | Acquisition identity remains missing |
| Runtime registration | Only verified F1.3 HUE/TCT executors are registered before coordinator startup | Correctly fail-closed for F4.1 |

No code or governed document contains an independently verified F4.1 route, report action, group/province/date filter values, readiness signal, generated-file resource match or filename behavior. The official display name was not used to invent any of them.

## 6. Live Discovery Attempt And Blocker

The running backend owned separate HUE and TCT Chromium processes under the existing session mechanism. Their Playwright page contexts are private to that backend process and are not exposed through a supported discovery API. The QIS session endpoints are correctly admin-protected, while the task-local QIS browser required a user-performed QIS sign-in. A manual authenticated handoff was requested; none became available during this execution.

The task did not attach to browser internals, inspect browser profiles, bypass QIS authentication, request credentials or derive Portal identity from names. It also did not stop/restart the pre-existing backend or take ownership of its live browser processes.

Result: live evidence was insufficient for both lanes. Discovery activity remained at zero Portal submissions and zero exports:

| Lane | Authenticated observable report page | Export budget used | Evidence gate | Disposition |
| --- | --- | --- | --- | --- |
| HUE | No | `0/1` | FAIL CLOSED | `BLOCKED / MANUAL_ONLY` |
| TCT | No | `0/1` | FAIL CLOSED | `BLOCKED / MANUAL_ONLY` |

## 7. Implementation Disposition

No F4.1 contract identity, executor, runtime registration or registry automation change was created. Both F4.1 lanes retain `manualOnlyReason: PORTAL_ADAPTER_NOT_VERIFIED`. F1.3 executors and runtime registration are unchanged.

The mandatory adapter acceptance set is not claimed because no lane passed discovery. In particular, no fake test identity was substituted for missing production evidence, and one blocked lane did not change the other lane.

## 8. Regression Evidence

All mutation-capable validation used isolated temporary SQLite databases and directories.

- `node --test test_autoBackfillF13Executors.js test_autoBackfillCoverageService.js test_autoBackfillCoverageController.js test_autoBackfillQueueService.js test_autoBackfillQueueController.js test_f41HueExcelParser.js test_f41ImportPipeline.js migrate_f41_phase1_schema.test.js migrate_f41_phase2_schema.test.js` -> `56/56 PASS`.
- `node test_dkclHueF13SyncService.js` -> `135/135 PASS`.
- `node test_dkclHueF13BackfillService.js` -> `39/39 PASS`.
- `node test_tctF13BackfillService.js` -> PASS.
- `node test_importProcessor.js` -> `59/59 PASS`.
- `node test_importPipelineRace.js` -> `41/41 PASS`.
- `node test_e2e_import_engine.js` -> `65/65 PASS`.

The F4.1 HUE parser reconciliation opened the already governed source read-only and preserved the locked `4,695 / 2,863 / 1,581 / 251` result. The synthetic F4.1 Import regression preserved lane isolation and the TCT stored-34 contract. No Import or Queue ran against operational data.

## 9. Scope And Safety Proof

- Product/frontend/backend/schema/runtime behavior: unchanged.
- F4.1 and F1.3 registry behavior: unchanged; F4.1 remains `MANUAL_ONLY`.
- Portal requests, exports and downloads: zero.
- Real Import, Auto Backfill run and live SQLite writes: zero.
- Data DKCL modifications: zero.
- `.claude/` and `Data QLML/`: not read, modified or staged.
- Successor activation: none.

## 10. Blocker And PO Re-entry Gate

`B-F41-01` applies independently to HUE and TCT: no manually authenticated, observable Portal page context was available to establish the required workflow evidence. Re-entry requires explicit PO direction plus manual authentication through the existing session mechanism and a supported observation/control handoff for the backend-owned page context. Discovery remains bounded to `2026-08-01` and one export per lane.

State: `AUTO-BACKFILL-F41 DISCOVERY BLOCKED`.

`AUTO-BACKFILL-SAFETY`, UI, Runtime and all other tickets remain inactive.

## 11. PO Session Evidence And Discovery Re-entry

- Continuation baseline: `6bf26eb20835707080d2e8590b3c1c383f155869`.
- Product Owner runtime evidence: Data Import Center showed both HUE and TCT sessions as valid.
- Product Owner authority: controlled re-entry into `AUTO-BACKFILL-F41` discovery only.
- Re-entry worktree: clean outside excluded untracked `.claude/` and `Data QLML/`.

Before live action, this checkpoint records the approved sequence: supported preflight/state confirmation; graceful backend stop only if needed for ownership release; existing client/session reopen with `requireExistingSession=true`; supported interactive manual authentication only if persisted validity does not survive transfer; no credential/cookie/profile inspection; bounded `2026-08-01` discovery with one export maximum per lane; no Import or SQLite/business-data write.

The two evidence gates remain independent. A lane changes from `MANUAL_ONLY` only after route, filters, readiness, export action, generated-resource identity, filename behavior, download/cleanup and parser compatibility are all observed for that lane.

State: `ACTIVE / AUTHENTICATED DISCOVERY RE-ENTRY`.

## 12. Controlled HUE Differential And Stop Point

The executor first reread the verified F1.3 runtime contracts. HUE uses `BC / 53`, confirms exact selected filters and one business date, reads the visible aggregate, opens the proven detail metric, confirms the detail total, then requests the detail export. TCT uses `TINH / ALL`, waits for exact scope/date plus a unique enabled summary export control, then requests the summary export. Both flows use bounded waits, generated-file polling, download validation and exact cleanup.

Supported preflight returned `SESSION_VALID` for HUE and TCT. The backend was stopped through its registered graceful shutdown lifecycle, and both clients independently reopened with `requireExistingSession=true` without authentication-material inspection.

For HUE F4.1, the single controlled request used `BC / 53 / 2026-08-01`. Browser state confirmed `BC`, province `53`, visible `01/08/2026` dates and hidden request dates `08/01/2026`. The GET request reached `/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc`; three observed responses were `HTTP 500`, `application/json`, 33 bytes. The response evidence contained no login form, no `4,695` total and no data rows. UI evidence was three table header rows rather than the PO-proven nine data rows, and console evidence was three HTTP 500 failed-resource errors.

The Chrome PO baseline remains nine HUE rows and total `4,695` for the same configuration. This establishes a runtime differential but does not establish whether the cause is account, session, permission or another DKCL server-side condition. No unsupported authentication inspection was performed.

TCT was not run after this unresolved HUE stop point. Exports, downloads, Import calls, queue runs, SQLite writes and product-code changes: zero. Both lanes remain `MANUAL_ONLY`.

State: `AUTO-BACKFILL-F41 DISCOVERY BLOCKED / READY FOR PO REVIEW`.

## 13. Validation Ledger

Focused `node --test --test-concurrency=1` validation covered Coverage, Queue, F1.3 shared executors, legacy F1.3 HUE/TCT services, F4.1 HUE/TCT parsers and pipeline, and queue migration: 60 runner tests passed, 0 failed. Mutation-capable cases used temporary DB/directories only.

Discovery export/download count was zero, both discovery clients were closed, both task-specific temporary directories were empty, and normal QIS backend listening on port `5050` was restored. The final implementation delta is documentation-only.

## 14. PO Chrome Success Evidence And Exact Retry Gate

PO supplied a successful HUE F4.1 GET for `BC / 53 / 2026-08-01`: `HTTP 200`, nine rows, total `4,695`, passed `2,863`, rate `60.98%`, account `tantn.bdth`. The response proves report identity `sp_Phat_ChatLuong_PTC_BuuCuc_V2`, export action `/export/sp_Phat_ChatLuong_PTC_BuuCuc_V2/all`, and detail endpoint `/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc-chi-tiet`.

The exact successful query keeps `stMaHuyenPhat` empty and uses `stMaLoaiBCPhat=NULL`, `stMaBuuCucPhat=NULL`, `stPhamViTinh=NULL`, `stLoaiTuyenPhat=NULL`, and `stLoaiPhuongXa=NULL`. The prior Codex request demonstrably differed first at `stMaLoaiBCPhat=ALL`; existing generic F1.3 normalization selected `ALL` for ancillary fields where F4.1 requires the untouched `NULL` state.

Authority is limited to one HUE comparison after change-event/cascade readiness. TCT and all mutating/runtime actions remain blocked until HUE proves nine rows, `4,695` total and `2,863` passed.

State: `ACTIVE / ONE BOUNDED HUE COMPARISON`.

## 15. Exact HUE Comparison Result

The probe used UI `selectOption` interactions and existing F1.3 date events, waiting for network idle after report open, each cascading filter and date assignment. Before submit, `FormData` generated a URL byte-for-byte equal to the PO successful URL. Exactly one report request was submitted and returned `HTTP 200`.

Runtime response evidence confirmed the expected export action and detail endpoint. It also rendered nine rate-bearing rows. However, the temporary evidence reader counted nested table rows and could not establish admissible totals for `4,695 / 2,863`; no adapter proof may rely on the contaminated aggregate.

The first remaining Chrome/Codex difference is account identity: Browser Codex `tantn.bdtth`, Chrome PO `tantn.bdth`. No authentication material was inspected. No second submit, export, download, Import, queue/DB write or TCT action occurred.

Disposition: HUE and TCT remain `MANUAL_ONLY`. Await PO confirmation whether the supported HUE profile must be manually re-authenticated as `tantn.bdth` before any separately authorized reconciliation probe.

State: `HUE COMPARISON BLOCKED / READY FOR PO REVIEW`.
