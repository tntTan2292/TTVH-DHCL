# AUTO-BACKFILL-F41 Manifest

Status: `DISCOVERY BLOCKED / READY FOR PO REVIEW / BOTH LANES MANUAL_ONLY` (2026-08-18).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-F41`
- Phase: `Shared Auto Backfill - F4.1 Portal Discovery And Verified Adapters`
- Executor: `Codex`, explicitly authorized by the Product Owner for this ticket only
- Branch: `codex/da-impl-006`
- Baseline: `5a2cf358e68baa0ae6f7ae1f22814f535b564fb9`
- Activation authority: `PO AUTO-BACKFILL-F13 GATE 3 PASS and authorizes AUTO-BACKFILL-F41 only`
- Initial worktree: clean outside excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Verify the real F4.1 Portal workflow independently for HUE and TCT, then implement a shared one-date adapter only for a lane whose complete route, filters, readiness, export, generated-resource, filename, parser and cleanup identity is observed. Missing evidence leaves that lane `MANUAL_ONLY`; no identity may be derived from the official display name.

## 3. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md`, Section 11.4
- `docs/10_TICKETS/AUTO-BACKFILL-F13_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-F13_CHECKPOINT_001.md`
- `docs/10_TICKETS/F41-PHASE-2_MANIFEST.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-2_CHECKPOINT_001.md`
- `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/`
- Existing DKCL clients, F1.3 adapters, session/preflight locks, F4.1 parsers and Import pipeline

## 4. Discovery Scope

- Delta-only static inspection before any live action.
- Existing manual HUE/TCT authentication only; credentials are never requested, read or stored.
- One bounded discovery date: `2026-08-01`.
- Independently observe route/report identity, group/province/date filters, readiness, export control, generated-resource match, filename behavior, download, cleanup and parser compatibility.
- At most one controlled export per lane, only if required, into a ticket-specific temporary directory outside Data DKCL; no Import or SQLite write.
- Clean only temporary artifacts created by this discovery and use the existing exact Portal cleanup operation.

## 5. Implementation Gate

A lane may become `AUTOMATED` only after its own complete evidence is recorded. A verified executor must accept exactly `F4.1 × lane × one business date`, require the existing manual session/preflight/source lock/active marker, call no nested multi-date queue, use the Phase 2 parser and Import pipeline, and keep refresh/force false.

HUE and TCT are independent. Verification of one lane does not authorize or automate the other. F1.3 identities and behavior remain frozen.

## 6. Locked Business Contracts

- HUE `2026-08-01`: total `4,695`, pass `2,863`, fail `1,581`, blank `251`, KPI `60.98%`.
- TCT: raw `46` reporting rows, accepted/stored `34`, excluded `12`; Huế remains `2,863 / 4,684 / 61.12%`.
- TCT published `%` values remain raw TEXT and never replace the HUE module KPI.
- Filename is `F4.1-YYYY.MM.DD.xlsx`; date is filename-only.
- Completed exact SUCCESS is never overwritten or downloaded again.
- Authentication loss propagates `AUTHENTICATION_REQUIRED`; Safety behavior remains deferred.

## 7. Initial Lane State

| Lane | Discovery | Registry mode | Implementation authority |
| --- | --- | --- | --- |
| HUE | `PENDING MANUAL SESSION VERIFICATION` | `MANUAL_ONLY` | None until independently proven |
| TCT | `PENDING MANUAL SESSION VERIFICATION` | `MANUAL_ONLY` | None until independently proven |

## 8. Out Of Scope

- Operational Auto Backfill or Import, Data DKCL modification, live SQLite business-row writes.
- More than one bounded discovery export per lane.
- Safety retry/circuit behavior, frontend/UI, or any successor ticket.

## 9. Required Stop

One of:

- `AUTO-BACKFILL-F41 IMPLEMENTED / READY FOR PO GATE 4`
- `AUTO-BACKFILL-F41 PARTIALLY IMPLEMENTED / BLOCKED`
- `AUTO-BACKFILL-F41 DISCOVERY BLOCKED`

No successor is self-activated.

## 10. Static Discovery Result

Delta inspection found no governed or implemented F4.1 Portal route, stable report identity, filter contract, export action, generated-file resource match, generated filename behavior or report-specific readiness condition. The official display name remains reference metadata only and was not transformed into a selector or resource identity.

Reusable foundations are present but are not F4.1 evidence:

- the shared manual HUE/TCT session preflight, per-source lock and active-operation marker;
- exact generated-file polling, download and single-file cleanup in the accepted F1.3 client;
- the F4.1 HUE/TCT filename rules, parsers, target tables, completion policies and Phase 2 Import pipeline;
- the shared Queue completion recheck and global SQLite lease.

The accepted F1.3 report page, selectors, export actions and generated-resource match strings are F1.3-specific. None was reused or parameterized as F4.1 identity evidence.

## 11. Live Discovery Disposition

The running QIS backend owned existing HUE and TCT browser processes, but this task had no authenticated, supported control channel into those private Playwright contexts. The local QIS browser surface required a user-performed QIS sign-in; an authenticated handoff was requested but did not occur during this execution. No credential was requested, read or stored.

Therefore neither lane met the evidence gate. No Portal navigation, report submission, export, download, parser inspection of a newly exported file, generated-file deletion or Import was attempted. The discovery allowance remains unused at `0/1` export for HUE and `0/1` for TCT.

| Lane | Missing independent evidence | Final registry mode | Adapter result |
| --- | --- | --- | --- |
| HUE | Route/report identity, filters, readiness, export action, generated resource/filename, cleanup and exported-workbook parser match | `MANUAL_ONLY` | Not implemented |
| TCT | Route/report identity, filters, readiness, export action, generated resource/filename, cleanup and exported-workbook parser match | `MANUAL_ONLY` | Not implemented |

## 12. Validation And Scope Proof

- Coverage/Queue/F1.3/F4.1 isolated suite: `56/56 PASS`.
- Existing HUE F1.3 sync regression: `135/135 PASS`.
- Existing HUE F1.3 legacy backfill regression: `39/39 PASS`.
- Existing TCT F1.3 legacy backfill regression: PASS.
- Import processor/race/E2E regressions: `59/59`, `41/41`, `65/65 PASS`.
- F4.1 HUE parser reconciliation was read-only; F4.1 Import pipeline and migrations used isolated temporary databases/directories.

No product, schema, frontend, Queue, Portal adapter, Import behavior or business-data file changed. The only repository edits are governance/documentation. `.claude/` and `Data QLML/` were not read, modified or staged; Data DKCL and live SQLite rows were not modified.

## 13. PO Gate / Required Re-entry

Reopening discovery requires a new PO-directed authenticated handoff through the existing HUE/TCT session mechanism and a supported way for the executor to inspect the owned page contexts. Each lane remains independently gated; evidence for one lane cannot automate the other.

State: `AUTO-BACKFILL-F41 DISCOVERY BLOCKED`.

`AUTO-BACKFILL-SAFETY` and every successor remain inactive.

## 14. PO Authenticated Discovery Re-entry

On `2026-08-18`, the Product Owner opened Data Import Center, confirmed that both HUE and TCT sessions were currently valid, and explicitly authorized controlled re-entry from commit `6bf26eb20835707080d2e8590b3c1c383f155869`.

The prior blocked result remains historical evidence. This re-entry permits only the bounded `2026-08-01` discovery, at most one HUE export and one TCT export, temporary storage outside Data DKCL, read-only workbook inspection, exact cleanup of discovery-created artifacts, and implementation only after an individual lane has complete evidence.

The executor must use supported preflight/state first, gracefully release backend-owned session/profile ownership only as needed, reopen with `requireExistingSession=true`, and fail closed if supported preflight cannot return `SESSION_VALID`. Credentials, cookies and raw profile contents remain prohibited.

State: `AUTO-BACKFILL-F41 ACTIVE / AUTHENTICATED DISCOVERY RE-ENTRY`.

## 15. Authenticated Runtime Differential

The supported Data Import Center preflight returned `SESSION_VALID` for both HUE and TCT. After graceful backend shutdown released profile ownership, the existing clients reopened both sources with `requireExistingSession=true`; no credential, cookie, token or raw profile content was inspected.

The controlled HUE probe reused the verified F1.3 sequence and the PO-locked F4.1 configuration: route `/kpi/chat-luong-phat-thanh-cong-cua-buu-cuc`, `TuyChonGR=BC`, `stMaTinhPhat=53`, visible dates `01/08/2026`, request dates `08/01/2026`, and existing default filter normalization. The browser issued GET requests, but DKCL returned `HTTP 500 application/json` with a 33-byte body. The response contained no login form, no locked total `4,695`, and no data rows; the rendered table remained at three header rows and the console recorded failed-resource 500 errors.

This conflicts with PO runtime evidence from Chrome using the same business configuration: nine result rows and total production `4,695`. The proven boundary is therefore a server-side 500 for the Codex-owned supported session/request, not absence of F4.1 data and not a verified selector mismatch. The underlying account/session/permission difference remains unproven because raw authentication material is intentionally out of scope.

Per PO direction, TCT discovery did not continue after the unresolved HUE differential. Export/download/Import/SQLite/business-data writes were all zero. No executor was implemented; HUE and TCT remain independently `MANUAL_ONLY`.

State: `AUTO-BACKFILL-F41 DISCOVERY BLOCKED / READY FOR PO REVIEW`.

## 16. Validation And Runtime Restore

- Focused Node regression command: 60 runner tests passed, 0 failed. Coverage, Queue, F1.3 adapters and legacy HUE/TCT flows, F4.1 parsers/pipeline, and queue migration remained green.
- Mutation-capable tests used isolated temporary databases/directories; operational Auto Backfill and Import were not run.
- Discovery clients were closed, temporary discovery directories contained zero files, and the normal QIS backend was restored on port `5050`.
- Documentation-only diff check passed; no frontend, backend product code, schema, registry automation state or business data changed.
