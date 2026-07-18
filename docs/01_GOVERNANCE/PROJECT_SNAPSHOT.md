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
| Current Phase | `Smart Leadership Dashboard Implementation` |
| Current Ticket | `DA-IMPL-002 Unified Command Summary` |
| Next Ticket | `DA-IMPL-003 Integrated Trend and Risk Workspace` |
| PO Status | `READY FOR PO CHECK` |
| Current Branch | `main` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/DA-IMPL-002_MANIFEST.md` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-18` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state SSOT for Governance V2 Draft.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or PO decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Current Manifest` must always be a concrete GitHub Blob URL.
- `Current Manifest` must point to an existing remote manifest for the active ticket.
- `Current Manifest` must not contain placeholder labels or descriptive text.
- `PO Status` must reflect the active ticket state and not inherit closed-ticket acceptance.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Historical note: `GOVERNANCE-PO-UI-SEPARATION` is completed and preserved for reference only.

TODAY-007 is completed with explicit Product Owner `PO PASS`.

TODAY-008 is completed with explicit Product Owner `PO PASS`.

TODAY-008 scope remains limited to PO data reconciliation and the leadership import-to-dashboard validation path. Broader dashboard widget, chart-meaning, color-consistency, or layout audit scope must be recorded in an authoritative roadmap, ticket, or manifest before implementation.

TICKET-0101 is completed with explicit Product Owner `PO PASS`.

TICKET-0101 scope remains limited to Login API and Session. Codex must not infer missing authentication, credential storage, role, permission, password, session timeout, or user-management business rules; if required authority is absent, record the blocker instead of guessing.

DASHBOARD-AUDIT-001 is completed with explicit Product Owner `PO PASS`. The audit findings are accepted, no Dashboard product-code changes were performed under the audit ticket, and the original multi-widget concept was rejected as insufficiently optimized.

The approved Dashboard direction is the consolidated smart Dashboard with five decision surfaces: Command Summary, Integrated Trend and Risk, BCVH Analysis, Operating Patterns, and Action Center.

DA-IMPL-001 is completed with Product Owner `PO PASS` after PO warning closure for visible technical wording and failed-rate card semantic color.

DA-IMPL-002 is technically complete and `READY FOR PO CHECK` after DA-IMPL-001 `PO PASS`.

DA-IMPL-002 includes the Product Owner KPI-system requirements transferred from DA-IMPL-001 closure: do not show `Tỷ lệ đạt` and `Tỷ lệ không đạt` as two independent KPI cards at the same time; restore `Xếp hạng toàn quốc` from imported nationwide data; use `Bưu gửi cần xử lý` as the action card and keep `Tỷ lệ không đạt` as supporting information.

DA-IMPL-002 runtime evidence confirms the Unified Command Summary is visible in the first `1440x900` viewport, uses four leadership cards, restores national rank from imported `fact_f13_national` data, and removes the duplicate Executive Summary presentation. Product Owner review is still required; Codex must not mark `PO PASS`.

DA-IMPL-003 through DA-IMPL-007 remain planned and inactive until their prior ticket receives `PO PASS` or explicit governance authority allows parallel work.

TICKET-0102 is deferred and inactive during the Dashboard implementation sequence unless Product Owner later changes priority.

Governance V1 remains the full workflow reference until a later migration phase explicitly replaces any part of it.
