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
| Current Phase | `F1.3 LOCAL NETWORK VIEWER DEPLOYMENT` |
| Current Ticket | `QIS-LAN-DEPLOY-001` |
| Next Ticket | `None currently authorized` |
| Last PO Status | `Product Owner authorized QIS-LAN-DEPLOY-001 to deploy the completed F1.3 product for read-only LAN access on the same local network from verified baseline 7ea633fc30c1d68cdebf57532d3e0bd776737387; preserve accepted F1.3 screens, formulas, data, and closed-ticket behavior; do not expose the service to the public Internet` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` |
| Current Checkpoint | `QIS-LAN-DEPLOY-001 implementation complete; ready for PO review with LAN/self-validation evidence` |
| Current State | `READY FOR PO REVIEW` |
| Technical Status | `IMPLEMENTED / SELF-VALIDATED` |
| Runtime Status | `LAN SELF-VERIFIED` |
| PO UI Check Required | `Yes - login, navigation, access control, and LAN startup are visible behaviors` |
| PO Product Status | `READY FOR PO REVIEW` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` |
| Last Reviewed Phase | `QIS-LAN-DEPLOY-001 IMPLEMENTATION` |
| Last Reviewed Commit | `7ea633fc30c1d68cdebf57532d3e0bd776737387` |
| Phase Review Status | `READY FOR PO REVIEW` |
| Next Phase Authorization | `Implement only the bounded LAN viewer deployment defined in the active manifest` |
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

Current handoff: `QIS-LAN-DEPLOY-001` implementation is complete from verified baseline `7ea633fc30c1d68cdebf57532d3e0bd776737387` and is ready for Product Owner review. The bounded delivery now exposes the completed F1.3 product on the LAN through `http://<server-ip>:5050`, preserves localhost, keeps Dashboard and BCVH Ranking accepted contracts unchanged, adds one read-only viewer role with secure hash-based password setup, and blocks viewer access to System Administration and data-changing operations by direct URL and backend API boundary. Do not self-award PO PASS; the next step is PO validation on a second computer.

Historical note: `GOVERNANCE-PO-UI-SEPARATION` is completed and preserved for reference only.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md`
5. Required Reading from the current manifest
