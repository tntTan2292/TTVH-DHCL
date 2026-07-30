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
| Current Phase | `IMPORT AUTHENTICATION REMEDIATION` |
| Current Ticket | `AUTO-IMPORT-009` |
| Next Ticket | `Operation Dashboard Phase 4 adaptive remediation (paused until Import auth receives PO PASS)` |
| Last PO Status | `Latest Product Owner runtime recheck at commit be9c5583dad7e116ea338a5cbc923d105fe2fab1 confirmed HUE browser does not open, TCT browser does not open, login is not possible for either source, and Kaspersky shows no new warning. Import authentication remains ACTIVE / PO RUNTIME FAIL.` |
| Current Branch | `codex/da-impl-006` |
| Current Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md` |
| Current Checkpoint | `AUTO-IMPORT-009 CHECKPOINT 003 - authoritative handoff after PO runtime failure at be9c5583dad7e116ea338a5cbc923d105fe2fab1` |
| Current State | `IMPORT AUTH ACTIVE / PO RUNTIME FAIL / DASHBOARD PHASE 4 PAUSED` |
| Technical Status | `PARTIAL TECHNICAL REMEDIATIONS RECORDED; NO CURRENT PO PASS FOR IMPORT AUTHENTICATION` |
| Runtime Status | `PO RUNTIME FAIL` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT PASS` |
| Last Closed Manifest | `https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` |
| Last Reviewed Phase | `AUTO-IMPORT-009 runtime recheck after latest backend reset` |
| Last Reviewed Commit | `be9c5583dad7e116ea338a5cbc923d105fe2fab1` |
| Phase Review Status | `ACTIVE / PO RUNTIME FAIL` |
| Next Phase Authorization | `Continue bounded Import authentication remediation only. Do not resume Dashboard Phase 4 work until HUE and TCT both receive explicit Product Owner runtime pass.` |
| Governance Version | `V2 Active` |
| Last Updated | `2026-07-30` |

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

Current handoff: `AUTO-IMPORT-009` is the active highest-priority ticket and remains `ACTIVE / PO RUNTIME FAIL`. The latest Product Owner tested implementation commit is `be9c5583dad7e116ea338a5cbc923d105fe2fab1`. Product Owner confirmed after backend reset that HUE browser does not open, TCT browser does not open, and login is not possible for either source. Kaspersky shows no new warning, so the earlier shell-based security blocker is no longer the visible active symptom, but the shared browser-opening behavior is still failing in Product Owner runtime.

Historical Import guidance that previously marked `AUTO-IMPORT-009` as `COMPLETED / PO PASS` is superseded by the current manifest and checkpoint. Internal unit tests, PID discovery, HWND enumeration, URL reachability, or `LOGIN_IN_PROGRESS` are not sufficient to claim Product Owner pass.

Operation Dashboard history remains preserved. Phase 1 implementation `6ea7819`, Phase 1 remediation `cbe5bc2`, Phase 2 implementation `dd9cbf5`, Phase 3 implementation `32c10f5470bf1d3a530a767b42ab1948f7f3e61d`, and Phase 3 PO PASS governance `5d29c0f0212fc59fac08131e42b5f1e2cfbacf73` remain accepted. Phase 4 history also remains preserved at implementation `235b69d0aa1a5b776b3398fde50c60172f7e4181`, documentation `5e1fa20`, and cleanup `.gitignore` protection `f7df0b56e6ec43d97ff48c68dd6fbb2e5ed3f558`. Phase 4 is not `PO PASS`; it is paused until Import authentication is fixed and explicitly accepted by Product Owner.

Fresh-chat onboarding chain for the current active ticket:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/AUTO-IMPORT-009_MANIFEST.md`
5. Required Reading from the current manifest
