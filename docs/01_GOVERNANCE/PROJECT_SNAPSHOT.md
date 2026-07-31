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
| Current Phase | `HUE BROWSER RUNTIME PREPARATION PLANNING` |
| Current Ticket | `AUTO-IMPORT-010` |
| Next Ticket | `Bounded HUE runtime preparation implementation awaiting Product Owner authority` |
| Last PO Status | `Management has accepted the discovery result: direct Playwright + Chromium + HUE profile launch already works, Dashboard and Import APIs are healthy, and the remaining issue is standard-runtime HUE dependency preparedness. AUTO-IMPORT-010 is now at CHECKPOINT 002 with implementation authority pending.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md` |
| Current Checkpoint | `AUTO-IMPORT-010 CHECKPOINT 002 - discovery complete and bounded implementation plan pending authority` |
| Current State | `AUTO-IMPORT-010 CHECKPOINT 002 / HUE ONLY / IMPLEMENTATION AUTHORITY PENDING / DASHBOARD PHASE 4 PAUSED` |
| Technical Status | `DISCOVERY COMPLETE; DIRECT PLAYWRIGHT PROOF PASS; ONE-TIME SETUP + READ-ONLY READINESS MODEL SELECTED IN PRINCIPLE` |
| Runtime Status | `PLANNING HOLD` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT PASS` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` |
| Last Reviewed Phase | `AUTO-IMPORT-010 Product Owner HUE runtime recheck after stale-state remediation` |
| Last Reviewed Commit | `c10151a43b0126c27cbee211f3547946310e68c6` |
| Phase Review Status | `DISCOVERY COMPLETED / IMPLEMENTATION AUTHORITY PENDING` |
| Next Phase Authorization | `Do not implement until Product Owner explicitly authorizes the one-time HUE setup and read-only readiness-check path. Do not resume Dashboard Phase 4 and do not expand to TCT.` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-31` |

## 3. Usage Rules

- Read this document immediately after `README_AI.md`.
- Treat this document as the single live project-state snapshot for AI onboarding.
- Do not infer current state from chat history when this snapshot is available.
- Do not use this document to override SSOT, frozen docs, or Product Owner decisions.
- Keep workflow behavior unchanged unless a dedicated governance change is approved.
- `Last Closed Manifest` must always be a concrete GitHub Blob URL pointing to the manifest of the most recently closed ticket when Current Ticket = None.
- `Last Closed Manifest` must not contain placeholder labels or descriptive text.
- `Last PO Status` must reflect the latest authoritative Product Owner visible outcome, including explicit failure states when a ticket remains active.

## 4. Continuation Notes

This snapshot is intentionally narrow.

It exists to answer only the questions a fresh AI needs in order to continue:

- where the project is
- what ticket is active
- what comes next
- what branch is active
- what manifest governs the current reading scope

Current handoff: `AUTO-IMPORT-010` remains the active highest-priority ticket, but it is now at `CHECKPOINT 002 / IMPLEMENTATION AUTHORITY PENDING`. Direct Playwright + Chromium + HUE profile launch has already been proven to work, stale HUE cached `LOGIN_IN_PROGRESS` recovery has already been fixed at `1ca7eee11101cbf59390662dbd848f6fcf8c5d60`, and management has selected the one-time setup plus read-only readiness-check model in principle. In this checkpoint, `A` and `B` remain rejected Sonnet discovery proposals, `C` is the architecture-reviewed direction confirmed by Opus, and `C1` / `C2` are still not chosen by Product Owner. Product code is intentionally unchanged while Product Owner reviews the bounded implementation plan.

Historical Import guidance that previously marked earlier authentication rounds as completed is superseded by the current manifest and checkpoint. Internal unit tests, PID discovery, HWND enumeration, URL reachability, or `LOGIN_IN_PROGRESS` are not sufficient to claim Product Owner pass. Direct Playwright browser launch success is also not Product Owner pass by itself; it only proves the current blocker has narrowed to standard-runtime dependency preparedness and operational setup design.

Operation Dashboard history remains preserved. Phase 1 implementation `6ea7819`, Phase 1 remediation `cbe5bc2`, Phase 2 implementation `dd9cbf5`, Phase 3 implementation `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`, and Phase 3 PO PASS governance `5d29c0f0212fc59fac08131e42b5f1e2cfbacf73` remain accepted. Phase 4 history also remains preserved at implementation `235b69d0aa1a5b776b3398fde50c60172f7e4181`, documentation `5e1fa20`, and cleanup `.gitignore` protection `f7df0b56e6ec43d97ff48c68dd6fbb2e5ed3f558`. Phase 4 is not `PO PASS`; it is paused until Import authentication is fixed and explicitly accepted by Product Owner.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md`
5. Required Reading from the current manifest
