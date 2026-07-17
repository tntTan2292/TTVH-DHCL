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
| Current Phase | `V2.0 Foundation` |
| Current Ticket | `TICKET-0101 Login API and Session` |
| Next Ticket | `TICKET-0102 Access Guard and Route Protection` |
| PO Status | `NOT READY` |
| Current Branch | `main` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/TICKET-0101_MANIFEST.md` |
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

TICKET-0101 is activated for implementation with scope limited to Login API and Session. Codex must not infer missing authentication, credential storage, role, permission, password, session timeout, or user-management business rules; if required authority is absent, record the blocker instead of guessing.

TICKET-0102 remains inactive until TICKET-0101 receives explicit PO PASS and a separate governance action activates the next ticket.

Governance V1 remains the full workflow reference until a later migration phase explicitly replaces any part of it.
