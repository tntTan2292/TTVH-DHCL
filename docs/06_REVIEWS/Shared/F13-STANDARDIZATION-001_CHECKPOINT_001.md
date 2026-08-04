# F13-STANDARDIZATION-001 — CHECKPOINT 001

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Program State](#2-program-state)
- [3. Baseline](#3-baseline)
- [4. Allowed Scope](#4-allowed-scope)
- [5. Locked Scope](#5-locked-scope)
- [6. Required Reading](#6-required-reading)
- [7. Exact Next Action](#7-exact-next-action)
- [8. Proposed Executor](#8-proposed-executor)
- [9. Next PO Gate](#9-next-po-gate)
- [10. Current Blockers](#10-current-blockers)

## 1. Purpose

This checkpoint is the current-state entry point for `F13-STANDARDIZATION-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what has closed, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `F13-STANDARDIZATION-001` |
| Program State | `ACTIVE / AUTHORIZED` |
| Current Phase | `PHASE 0 — AUTHORIZED / READY FOR IMPLEMENTATION` |
| Phase 0 Implementation Performed | `No` — authorization only, not executed under this ticket |
| Phase 1 | `PLANNED / NOT ACTIVE` |
| Phase 2 | `PLANNED / NOT ACTIVE` |
| Phase 3 | `PLANNED / NOT ACTIVE` |
| Phase 4 | `PLANNED / NOT ACTIVE` |
| Phases Completed | `None` |
| PO Gates Passed | `None` |

## 3. Baseline

- Authoritative baseline commit at program activation: `e6deae006387d2086360b1354e40295518fc0851`
- Branch: `codex/da-impl-006`
- At activation time, local `HEAD` and `origin/codex/da-impl-006` both matched this baseline exactly; no delta governance read was required.
- Last closed ticket before this activation: `F13-DATA-2098-CLEANUP-IMPL` — `COMPLETED / TECHNICAL PASS / CLOSED`, reviewed implementation commit `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`.

## 4. Allowed Scope

For this documentation-activation step only:

- Create the activation package (this checkpoint, the program manifest, and required live-state updates).
- Lock the five-phase plan defined in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 6.
- Set Phase 0 to `AUTHORIZED / READY FOR IMPLEMENTATION` without performing any Phase 0 work.

## 5. Locked Scope

Not permitted under this checkpoint or this ticket's current activation step:

- Any Phase 0 implementation (KPI-field remediation, data/API fixes, unified KPI source lock).
- Any Phase 1-4 work of any kind.
- Product code changes.
- Database or business-data changes.
- Broad audits beyond what is already on record from prior closed audits.
- Activating any ticket other than `F13-STANDARDIZATION-001`.
- Adding scope items not present in the Product Owner-approved plan.

Locked product decisions and locked out-of-scope items are recorded once in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Sections 7-8 and are not duplicated here; read them there.

## 6. Required Reading

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` (Current Manifest)
5. This checkpoint (Current Checkpoint)
6. Phase 0 required reading (once Phase 0 discovery begins): `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` and `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md`

## 7. Exact Next Action

`Begin bounded delta-only discovery for Phase 0. Do not implement until onboarding and Phase 0 scope confirmation are complete.`

## 8. Proposed Executor

Claude Code (Sonnet) — discovery, implementation, tests, and documentation, per the executor plan in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 9. Antigravity owns runtime/UI validation when Phase 0 or later phases produce UI-visible change.

## 9. Next PO Gate

No PO Gate applies yet. The first PO Gate (Gate 1) is defined to sit after Phase 1 closes, per `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 10. Phase 0 has no dedicated PO Gate; it closes on Claude Code technical validation before Phase 1 discovery begins.

## 10. Current Blockers

None. The program is authorized and Phase 0 is ready for discovery to begin in a subsequent, separate execution task.
