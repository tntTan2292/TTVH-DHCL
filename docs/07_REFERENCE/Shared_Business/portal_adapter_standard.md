---
title: Shared Portal Adapter Standard
purpose: Evidence-gated standard for discovering, verifying, registering, and operating Portal adapters for current and future indicators.
owner: Product Owner
ssot: True
status: Active
dependencies:
  - docs/07_REFERENCE/Shared_Business/import_center_rules.md
version: 1.0.0
---

# Shared Portal Adapter Standard

## 1. Purpose And Authority

This document is the shared source of truth for Portal adapter discovery and registration. It applies to every indicator and every source lane that may join Auto Backfill. Indicator manifests and checkpoints record indicator-specific evidence; they must reference this standard rather than restating it.

The standard does not authorize Portal automation. Product Owner authorization, independently verified lane evidence, and the ticket-specific PO Gate remain mandatory. Portal identities, filters, selectors, filenames, and reconciliations must never be inferred from an indicator display name or from another lane.

## 2. Adapter Lifecycle

| State | Entry condition | Permitted behavior | Exit condition |
| --- | --- | --- | --- |
| `MANUAL_ONLY` | Default for every newly registered lane | Coverage may report gaps; no executable Portal job may be created | PO authorizes bounded discovery |
| `DISCOVERY_AUTHORIZED` | Ticket and lane are explicitly authorized | Supported session preflight and bounded read-only discovery only | Complete evidence or a documented blocker |
| `VERIFIED` | All evidence in Section 7 passes for this exact indicator/lane | Implement and test one-date executor under the approved ticket | Registration and isolated acceptance pass |
| `AUTOMATED` | Verified executor is registered before coordinator startup | Shared Queue may execute exact one-date jobs after completion recheck | PO Gate review; later suspension may return lane to `MANUAL_ONLY` |
| `PO_GATE_PENDING` | Technical implementation and governance handoff are complete | No successor self-activation | Product Owner PASS or remediation direction |

`VERIFIED` and `AUTOMATED` are lane-specific. A Gate records acceptance; it is not implied by implementation or test success.

## 3. Independent Source Lanes

- `HUE` is the detailed local lane. Its route, grouping, province scope, readiness condition, report identity, workbook shape, parser, completion policy, account evidence, and reconciliation must be proven as one contract.
- `TCT` is the aggregate or ranking lane. The same fields require separate evidence, even when the page title or route resembles HUE.
- Evidence from one lane cannot authorize the other. A verified HUE adapter does not prove TCT, and a verified TCT export does not prove HUE.
- Each executor accepts exactly one registered indicator, one source lane, and one business date. It must not start or nest a legacy multi-date queue.

## 4. Session Contract

1. Use only the existing supported client/session mechanism and request `requireExistingSession=true` when discovery or execution requires an established session.
2. Run the supported session preflight before report navigation. Continue only after the required valid-session state is returned.
3. When authentication is absent or expired, use the normal interactive login window and wait for the Product Owner to authenticate manually. Never request credentials.
4. Record the displayed account as evidence that the supported profile is authorized for that lane. Account differences are permission evidence to resolve, not a reason to copy session material.
5. Never read, copy, log, store, edit, or attach to raw cookies, tokens, browser profiles, credentials, or private browser internals.
6. Retain the existing per-source operation lock and active-operation protection. The shared database lease remains the cross-lane concurrency authority.

## 5. Filter And Request Contract

1. Apply filters through the same supported UI interactions and change events used by the verified workflow. Do not inject values directly when the page depends on event handlers.
2. Preserve an already-correct value when a hidden or Select2-backed control cannot be safely reselected. Changed values still require their normal UI event path.
3. Wait for every prerequisite or cascading-filter request to complete before submitting the report.
4. Immediately before submit, verify the actual selected values, browser `FormData`, HTTP method, and generated request URL/query.
5. Treat the empty string, `NULL`, and `ALL` as three distinct values. Displayed controls that look equivalent do not prove byte-equivalent requests.
6. Use the exact verified single-date encoding and filter names. Do not normalize case or substitute ancillary filters without evidence.

## 6. Bounded Discovery And Execution

- Use one PO-approved business date and a task-specific temporary directory outside operational data directories.
- Submit at most the explicitly authorized number of requests or exports, normally one controlled submit and at most one export per lane.
- Use finite timeouts for cascade readiness, report completion, generated-resource polling, download, and cleanup.
- Do not reload, loop indefinitely, brute-force selectors, or try random filter variants.
- If a route, selector, filter value, request, account, readiness signal, resource identity, or parser result is uncertain, stop at that exact point and ask the Product Owner one specific question.
- Discovery must not invoke the Import pipeline, run the operational Queue, or write SQLite/business data. Adapter acceptance uses only fakes and isolated temporary databases/directories.

## 7. Evidence Gate

A lane is `VERIFIED` only when its evidence bundle proves all applicable items:

| Evidence | Required proof |
| --- | --- |
| Transport | Exact request URL/query and method, HTTP status, and expected `Content-Type` |
| Rendered result | Direct outer result rows only; nested detail-table rows are excluded by DOM ownership |
| Report identity | Stable report/resource identity observed in the successful response |
| Export action | Exact export route/control tied to that report identity |
| Generated resource | Exact generated-file resource match and observed generated filename behavior |
| Controlled artifact | At most one authorized export in temporary storage outside operational data paths, with size/checksum recorded when exported |
| Parser compatibility | Existing registered parser accepts the observed workbook structure without guessed remapping |
| Reconciliation | PO-locked row counts, totals, rates, exclusions, and data types reproduce exactly |
| Cleanup | Exact Portal-generated row/resource and only task-created temporary artifacts are removed |
| Completion | Target facts, exact Import evidence, and Processed artifact satisfy the lane's registered completion policy |

The successful response itself is authoritative for transport and identity. A visually similar page, a matching title, or a nested table count is insufficient.

## 8. Error Classification And Safety Boundary

| Condition | Required disposition in adapter discovery/contract |
| --- | --- |
| Session missing or expired | Return/record `AUTHENTICATION_REQUIRED`, stop the lane, and require supported manual login |
| Account or permission mismatch | Stop and obtain PO confirmation for the displayed account/profile; do not inspect session material |
| Filter/request mismatch | Record the first differing field or request and stop; do not try unverified substitutions |
| HTTP 500 or transient/system error | Record status, content type, response message, request identity, and exact stop point; no unbounded retry |
| Repeated/systemic error | Keep lane non-executable and hand classification to the approved Safety policy |
| Response contains data but UI does not render | Preserve transport evidence, record console/render failure separately, and do not claim UI readiness |
| Import committed but Processed artifact/file move is missing | Do not download or Import again; classify `MANUAL_REVIEW_REQUIRED` |
| Integrity mismatch | Stop immediately; do not automate the lane |

This standard defines evidence and propagation contracts only. Retry/backoff, circuit-breaker runtime, alerting, and full audit reporting belong to `AUTO-BACKFILL-SAFETY` and require separate Product Owner activation.

## 9. New Indicator Registration Checklist

Before a lane can move beyond `MANUAL_ONLY`, its registry/domain package and governed evidence must declare:

- indicator code, name, status, registry priority, owner, and tracking start date;
- exact source lane (`HUE` or `TCT`) and lane priority;
- exact route, filters, values, change-event sequence, cascade prerequisites, and single-date encoding;
- finite readiness condition based on the correct direct result scope;
- stable report/resource identity, export action, and generated-resource match;
- generated filename rule and business-date derivation rule;
- parser identity, target table, and lane-specific data contract;
- exact completion policy across target facts, Import evidence, and Processed artifact;
- reconciliation baseline including row populations, exclusions, totals, rates, and stored types;
- session/account evidence and read/run permissions;
- source lock and active-operation behavior;
- approved retry and circuit policy, or an explicit deferred Safety dependency;
- evidence bundle, isolated tests, registration-before-coordinator proof, and PO Gate status.

Automation mode remains `MANUAL_ONLY` until every applicable item is verified for that exact lane. Missing Portal evidence must be represented honestly; it must not be replaced by a placeholder executor.

## 10. F1.3 And F4.1 Reference Examples

These examples demonstrate the method. They are not identities or selectors to copy into another indicator.

| Indicator/lane | Proven scope | Evidence example |
| --- | --- | --- |
| F1.3/HUE | Detail lane, `BC / 53` | Established the supported HUE UI-event, cascade, session, lock, generated-file, cleanup, and one-date adapter pattern |
| F1.3/TCT | Aggregate/ranking lane, `TINH / ALL` | Established the independent TCT UI-event, session, lock, national-code filtering, and one-date adapter pattern |
| F4.1/HUE | `TuyChonGR=BC`, `stMaTinhPhat=53`, empty district | HTTP 200; nine direct outer rows; `4,695` total, `2,863` passed, `60.98%`; identity `sp_Phat_ChatLuong_PTC_BuuCuc_V2` |
| F4.1/TCT | `TuyChonGR=TINH`, `stMaTinhPhat=ALL`, empty district | HTTP 200; 47 direct UI rows = one grand total + 46 raw units; frozen parser stores 34 national rows; identity `sp_Phat_ChatLuong_PTC_Tinh_V2` |

For F4.1, empty `stMaHuyenPhat=` is not `NULL`; `NULL` is not `ALL`. HUE `BC / 53` does not imply TCT `TINH / ALL`, and neither report identity was derived from the display name. The F4.1 TCT baseline also preserves Huế `2,863 / 4,684 / 61.12%` and raw percentage TEXT values.

## 11. Shared Platform Rules

- Adding a correctly registered indicator or lane must not require changes to Coverage scanner, Queue ordering, global lease, recovery, or coordinator core.
- Coverage may show missing dates for a `MANUAL_ONLY` lane, but Queue planning must not create executable Portal work for it.
- Portal adapters are evidence-bound plugins. The shared platform discovers registry declarations; it does not guess business behavior.
- Completion is isolated by exact `indicator × source_lane × business_date`. An exact completed SUCCESS is never overwritten or downloaded again.
- Only independently proven lanes may be `AUTOMATED`, and executor registration must complete before Queue/coordinator startup or wake.
- Product Owner Gate approval is required before a completed adapter ticket can close or authorize a successor.

## 12. Required Handoff

Every Portal adapter ticket must link this standard from its manifest Required Reading and record, in its checkpoint, the lane-specific evidence bundle, deviations, test proof, cleanup proof, current mode, and PO Gate state. New indicator packages created from `_template_indicator` inherit this standard as a declared dependency.
