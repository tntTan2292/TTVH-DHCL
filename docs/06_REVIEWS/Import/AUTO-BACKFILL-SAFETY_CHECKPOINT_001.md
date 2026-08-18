# AUTO-BACKFILL-SAFETY - Checkpoint 001

## 1. Activation

- State: `ACTIVE / IMPLEMENTATION AUTHORIZED`
- Date: `2026-08-18`
- Branch: `codex/da-impl-006`
- Expected and observed baseline: `0f363187283846a8456804419900f36ca40ef679`
- Product Owner authority: `AUTO-BACKFILL-F41 GATE 4 PASS and authorizes AUTO-BACKFILL-SAFETY`
- Executor: `Codex`, explicitly authorized for this ticket
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

F41 Gate 4 is accepted and closed. This checkpoint activates only shared Safety retry, error taxonomy, authentication wait, scoped circuit breaker, integrity stop, append-only audit and Product Owner reporting. UI, Runtime and every later ticket remain inactive.

## 2. Locked Safety Decisions

| Contract | Product Owner decision |
| --- | --- |
| Retry | Maximum three total attempts; bounded exponential backoff; only explicit transient classifications |
| Non-retryable | Data, permission, validation and integrity classes never retry |
| Circuit | Open after five consecutive same-signature system failures in exact adapter/source/resource scope |
| Integrity | Fatal and immediate on first occurrence |
| Authentication | Persist exact job/run as `WAITING_AUTH`; no permanent failure; explicit valid-session wake/resume continues |
| Completion | Recheck before attempt/recovery; exact SUCCESS never reruns |
| Concurrency/order | Database global lease and newest-date-first order remain authoritative |
| Audit | Append-only attempt and transition evidence for retry/pause/auth/circuit/resume/terminal outcomes |
| Report | Indicator, lane, date, sanitized signature, attempts and required PO action |
| Extensibility | Shared Safety contains no F1.3/F4.1/table branch; synthetic adapter proves registration-only extension |

## 3. Initial Safety Boundary

No product code, schema, Queue runtime, Portal, Import or business data had been changed or executed when this activation record was created. `.claude/` and `Data QLML/` were not read, modified or staged.

Implementation design, migration/API contracts, acceptance evidence, regressions, scope proof and final Git handoff will be appended before Gate 5 review.

## 4. Technical Execution Report

### 4.1 Generic Safety Boundary

`AutoBackfillSafetyCoordinator` classifies errors only from generic error metadata and each lane's registry declarations. Its scope key is a hash of `adapter_id × source_lane × resource_identity`; no indicator code, target table, F1.3 or F4.1 branch exists in shared Safety/Queue orchestration. Error signatures retain only a sanitized code and short hash, never raw credentials, cookies, tokens, profile paths, URLs or payloads.

The registry version advances to `AUTO-BACKFILL-SAFETY-1`. Existing lanes inherit the approved maximum-three bounded exponential policy, error map, Admin control/audit permissions and exact threshold-five circuit declaration.

### 4.2 Persistence And State Transitions

The additive Safety migration adds run/job/attempt overlay fields without changing Queue's accepted primary state constraints. It creates one mutable current-state `auto_backfill_circuit` record per exact scope while `auto_backfill_event` remains append-only and every completed attempt becomes immutable/undeletable.

| Safety outcome | Durable behavior |
| --- | --- |
| `RETRY_WAIT` | Lease released; exact job remains queued with persisted `next_attempt_at`; coordinator uses bounded wakeup rather than busy-looping |
| `WAITING_AUTH` | Exact job/run retained; global drain stops; Resume must pass supported executor session validation before clearing wait |
| `CIRCUIT_OPEN` | Only matching scope jobs are blocked; other scopes remain eligible; restart retains open state; Admin reset is explicit and audited |
| `BLOCKED_INTEGRITY` | First failure blocks the run/global acquisition immediately; no retry/reset path |
| `FAILED_TERMINAL` | Date remains isolated; no retry for data/permission/unknown-system or exhausted transient errors |

The Queue rechecks exact completion after executor errors and before every lease. A committed/external SUCCESS is closed as `SKIPPED_ALREADY_SUCCESS`, so retry, auth resume and circuit reset cannot reload it. Newest-date-first ordering and the singleton SQLite lease are unchanged.

### 4.3 API And PO Report

| Method/path | Permission | Contract |
| --- | --- | --- |
| `POST /api/import/auto-backfill/runs/:runId/resume` | Admin | Existing pause resume plus supported session validation for `WAITING_AUTH` |
| `POST /api/import/auto-backfill/runs/:runId/circuit/reset` | Admin | Reset only open scopes attached to the run, append audit and wake coordinator |
| `GET /api/import/auto-backfill/runs/:runId/events` | Registry `auditReadRoles` | Sanitized append-only timeline; read-only |
| `GET /api/import/auto-backfill/runs/:runId/report` | Registry `auditReadRoles` | Indicator/lane/date, state, signature, classification, attempts and required PO action; read-only |

### 4.4 Acceptance Evidence

- Transient retry: persisted bounded `2s`, then `4s`, maximum three total attempts; exhaustion is terminal.
- Pause during transient execution: atomic attempt finishes into persisted retry work, run becomes `PAUSED`, and Resume continues the same job.
- Data and permission failures: one attempt each, no retry, exact dates isolated.
- Circuit: fifth consecutive same-signature system failure opens only its adapter/source/resource scope; another lane continues. Mixed signatures do not accumulate; success and non-system outcomes reset sequence.
- Restart/reset: retry wait and open circuit survive new service instances; only explicit Admin reset releases circuit work.
- Authentication: coordinator stops after one auth loss; invalid explicit Resume leaves `WAITING_AUTH`; valid supported preflight plus explicit Resume executes the same identity.
- Integrity: first attempt enters `BLOCKED_INTEGRITY`; no later job leases.
- SUCCESS protection: external completion during retry wait skips the executor; call count remains one.
- Audit/report: required identity/action fields are present, attempt/event history is durable, registry audit permission is enforced and injected secrets are absent.
- Extensibility: all Safety acceptance uses only synthetic `F9.TEST` registrations and fake executors; shared engine changes are zero per new indicator.

## 5. Regression Evidence

The final combined command covers Coverage controller/scanner, AB-EXT/AB-ISO, Queue controller/service/coordinator, AB-QUE/AB-SUC, Safety, F1.3/F4.1 shared executors, Queue/Safety migrations, startup migrations and the F4.1 Import pipeline: `72/72 PASS`.

Legacy results: F4.1 HUE parser `5/5`, F4.1 TCT parser `6/6`, F1.3 HUE backfill `39/39`, HUE sync `135/135`, TCT backfill PASS, Import race `41/41`, and Import processor `59/59`.

All mutation-capable validation used OS-temporary SQLite databases/directories and injected fake executors. No operational Queue, Portal, download, Import, Data DKCL or business-data operation was run.

## 6. Scope Proof And Gate 5

- No frontend/UI, operational data, Portal identity/filter/navigation, parser, Import behavior or Runtime ticket was implemented.
- Queue order, one-global-lease, pause/recovery and exact completion contracts remain authoritative.
- `.claude/` and `Data QLML/` were not read, modified or staged.
- Product Owner Gate 5 is not self-passed; UI, Runtime and every successor remain inactive.

State (at implementation): `AUTO-BACKFILL-SAFETY IMPLEMENTED / READY FOR PO GATE 5`.

## 7. Gate 5 PASS And UI Activation Blocker (2026-08-18)

Product Owner granted `GATE 5 PASS`, closing `AUTO-BACKFILL-SAFETY` as `COMPLETED / PO GATE 5 PASS`. No new code, schema or data changed for this closure — it is a documentation-only PO decision record.

The Product Owner then instructed Claude Code to implement `AUTO-BACKFILL-UI`. Before any code, Claude Code re-read the frozen `AUTO-BACKFILL-PLAN_MANIFEST.md` Section 6 and `AUTO-BACKFILL-PLAN_CHECKPOINT_001.md` Section 11.6, which lock `AUTO-BACKFILL-UI` as "Operator UI by Antigravity" — matching `CLAUDE.md`'s executor role split. This is a direct conflict between the new instruction and a frozen governance document, so Claude Code reported it instead of silently reassigning the ticket. The Product Owner's explicit resolution: do not implement `AUTO-BACKFILL-UI` under Claude Code; the locked Antigravity assignment stands.

`AUTO-BACKFILL-UI` is therefore **not activated for implementation** in this session. No frontend/UI code, no API contract, and no Import/Queue/Portal runtime work were touched. State: `AUTO-BACKFILL-SAFETY COMPLETED / PO GATE 5 PASS`; `AUTO-BACKFILL-UI PLANNED / NOT ACTIVE (executor: Antigravity, pending its own activation)`.
