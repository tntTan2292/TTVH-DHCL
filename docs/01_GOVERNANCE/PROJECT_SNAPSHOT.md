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
| Current Phase | `F1.3 UI AUDIT AND STANDARDIZATION PLANNING` |
| Current Ticket | `F13-UI-AUDIT-PLAN` |
| Next Ticket | `None currently authorized beyond current planning activity` |
| Last PO Status | `Product Owner closed QIS-LAN-DEPLOY-001 as COMPLETED / PO PASS / CLOSED at accepted runtime remediation commit 99c865e92b840a587dc9a889294c535fecc68816, then corrected F13-UI-AUDIT-PLAN to READY FOR PO UI/UX PLANNING with discussion-and-planning-only authority and Operation Dashboard as the first bounded focus` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` |
| Current Checkpoint | `F13-UI-AUDIT-PLAN ready for PO UI/UX planning with Operation Dashboard as first bounded focus` |
| Current State | `READY FOR PO UI/UX PLANNING` |
| Technical Status | `PLANNING SCOPE NOT YET DISPATCHED` |
| Runtime Status | `NOT RUN - PLANNING ONLY` |
| PO UI Check Required | `No - planning review only` |
| PO Product Status | `NOT READY` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` |
| Last Reviewed Phase | `QIS-LAN-DEPLOY-001 CLOSURE / F13-UI-AUDIT-PLAN ACTIVATION` |
| Last Reviewed Commit | `99c865e92b840a587dc9a889294c535fecc68816` |
| Phase Review Status | `READY FOR PO UI/UX PLANNING` |
| Next Phase Authorization | `ChatGPT and Product Owner define Operation Dashboard audit scope first; Antigravity prompt may be written only after scope agreement; no implementation authority yet` |
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

Current handoff: `QIS-LAN-DEPLOY-001` is `COMPLETED / PO PASS / CLOSED` at accepted runtime remediation commit `99c865e92b840a587dc9a889294c535fecc68816`. The accepted contract is fixed: frontend LAN port `5178`, backend/API port `5050`, normal LAN URL `http://<server-ip>:5178`, local viewer username configuration `ttvhhue`, operational viewer authentication, read-only viewer access to completed F1.3 screens only, preserved viewer restrictions, preserved admin access, and untracked local `.env` correction for the malformed password-hash defect. Current active ticket is `F13-UI-AUDIT-PLAN`, which is `READY FOR PO UI/UX PLANNING` with `DISCUSSION AND PLANNING ONLY / NO IMPLEMENTATION` authority. Coordination owner is ChatGPT with Product Owner, Antigravity is not yet dispatched, and the first bounded focus is Operation Dashboard only. The next step is a fresh ChatGPT coordination chat where Product Owner and ChatGPT define the Operation Dashboard audit scope before any Antigravity prompt is written.

Historical note: `GOVERNANCE-PO-UI-SEPARATION` is completed and preserved for reference only.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md`
5. Required Reading from the current manifest
