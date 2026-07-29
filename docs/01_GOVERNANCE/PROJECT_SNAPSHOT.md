# PROJECT SNAPSHOT

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Current Snapshot](#2-current-snapshot)
- [3. Usage Rules](#3-usage-rules)
- [4. Continuation Notes](#4-continuation-notes)

## 1. Purpose

This document is the Governance V2 current-state snapshot for AI onboarding.

It is designed to be the shortest safe entry point for a new AI session while preserving continuity with the existing Governance V1 workflow.

## 2. Current Snapshot

| Field | Value |
| --- | --- |
| Current Phase | `AWAITING PRODUCT OWNER DIRECTION` |
| Current Ticket | `None` |
| Next Ticket | `Awaiting Product Owner direction` |
| Last PO Status | `F13-BCVH-RANKING-REDESIGN-IMPL completed with runtime PO verification complete and Product Owner PO PASS at verified implementation commit a6235b2fc99fd662971a7c0fc9d7f43190b133b4; Dashboard BCVH table remains the original compact overview surface; /f13/ranking/bcvh remains the detailed independent ranking surface; delayed-cash SSOT accepted for 2026-07-28 with numerator 334, denominator 1536, and rate 21.7%; F13-INTERNAL-ROUTE-AUDIT completed with Product Owner PO PASS; F13-DATA-QUALITY-001 implementation deferred and manifest preserved; F13-SHIPMENT-001 implementation deferred and manifest preserved; DA-IMPL-008 completed with Product Owner PO PASS including Checkpoint 006; AUTO-IMPORT-009 completed with PO PASS at remote baseline 29e3a383a25c72a2dc9e5f2cc8667461803e78f6` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Current Checkpoint | `F13 BCVH Ranking redesign implementation closed with PO PASS and final contract/evidence synchronized` |
| Current State | `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION` |
| Technical Status | `F13-BCVH-RANKING-REDESIGN-IMPL COMPLETE` |
| Runtime Status | `RUNTIME PO VERIFICATION COMPLETE` |
| PO UI Check Required | `No` |
| PO Product Status | `F13-BCVH-RANKING-REDESIGN-PLAN COMPLETED / HANDOFF; F13-BCVH-RANKING-REDESIGN-IMPL COMPLETED / PO PASS / CLOSED; F13-INTERNAL-ROUTE-AUDIT COMPLETED / PO PASS; F13-DATA-QUALITY-001 DEFERRED / PRESERVED; F13-SHIPMENT-001 DEFERRED / PRESERVED; DA-IMPL-008 COMPLETED / PO PASS; AUTO-IMPORT-009 COMPLETED / PO PASS` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Last Reviewed Phase | `F13-BCVH-RANKING-REDESIGN-IMPL CLOSURE` |
| Last Reviewed Commit | `a6235b2fc99fd662971a7c0fc9d7f43190b133b4` |
| Phase Review Status | `PO PASS` |
| Next Phase Authorization | `Await explicit Product Owner direction before activating another ticket` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-29` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state SSOT for Governance V2 Draft.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or PO decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Last Closed Manifest` must always be a concrete GitHub Blob URL pointing to the manifest of the most recently closed ticket when Current Ticket = None.
- `Last Closed Manifest` must not contain placeholder labels or descriptive text.
- `Last PO Status` represents the most recently recorded Product Owner status for the last closed ticket when Current Ticket = None.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Current handoff: `F13-BCVH-RANKING-REDESIGN-PLAN` is `COMPLETED / HANDOFF`, and `F13-BCVH-RANKING-REDESIGN-IMPL` is now `COMPLETED / PO PASS / CLOSED` at verified implementation commit `a6235b2fc99fd662971a7c0fc9d7f43190b133b4`. The accepted contract is fixed: Dashboard keeps the original compact BCVH overview table; `/f13/ranking/bcvh` keeps the detailed independent ranking surface; `D-1` and `D-7` each show `Sản lượng`, `Tỷ lệ`, `SS SL`, and `SS Tỷ lệ`; comparison-rank and rank-movement columns are not rendered; KPI 2026 labels remain `Tốt / Cần chú ý / Cảnh báo / Rủi ro cao`; route-distribution labels remain `Tốt / Khá / Trung bình / Kém`; delayed-cash SSOT for `2026-07-28` is accepted with numerator `334`, denominator `1536`, and rate `21.7%`. `F13-INTERNAL-ROUTE-AUDIT` remains `COMPLETED / PO PASS`; `F13-DATA-QUALITY-001` and `F13-SHIPMENT-001` remain deferred and preserved. No next ticket is active; the project is awaiting Product Owner direction.

Historical note: `GOVERNANCE-PO-UI-SEPARATION` is completed and preserved for reference only.

Fresh-chat onboarding chain while no next ticket is active:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
5. Required Reading from that closure manifest
