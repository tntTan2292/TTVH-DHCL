# IMPORT-BULK-REIMPORT-ALL-01 Manifest

Status: `DISCOVERED / NOT ACTIVATED (2026-09-15)`. Registration only — no discovery, audit, design, implementation, queue action, or data reimport is authorized.

## 1. Ticket Information

- Ticket ID: `IMPORT-BULK-REIMPORT-ALL-01`
- Ticket Name: `Import — Chọn tất cả để tái nhập hàng loạt`
- Owner: unassigned — pending Product Owner/CTO activation.
- Governance Version: `V2 Active`
- Registration authority: Product Owner instruction received in chat, 2026-09-15.
- Branch registered on: `codex/da-impl-006`
- Baseline commit: `425ed1c`

## 2. Objective

Preserve the existing action **“Chọn tất cả chưa hoàn tất”** and add a separate **“Chọn tất cả”** action that can include records already imported successfully, so the Product Owner can intentionally reimport them in bulk.

This objective is registered only. No behavior is approved until a read-only audit establishes the exact operational contract.

## 3. Mandatory Audit Before Any Implementation

A future, separately activated read-only audit must determine and evidence:

1. **Selection scope** — which visible/filtered dates, indicators, sources, pages, statuses, and holiday/exclusion states each bulk action selects; “Chọn tất cả chưa hoàn tất” must remain unchanged.
2. **Queue and dedup behavior** — how selected records map to runs/jobs, how active or duplicate identities are handled, whether successful historical jobs can be selected safely, and how partial enqueue failures are reported.
3. **Reimport rules** — whether successful data is replaced, overwritten, skipped, or versioned; transaction boundaries; idempotency; import-log/evidence behavior; and protection against duplicate or concurrent execution.
4. **Confirmation warning** — a distinct confirmation step before enqueue that states the exact count/scope and clearly warns that already-successful imports are included and may be replaced.
5. **Safety and authorization** — interaction with Auto-Backfill runtime states, manual authentication/Resume, circuit/safety controls, calendar exclusions, permissions, and recovery/cancellation constraints.

The audit must trace the current frontend selection logic, backend queue/run creation, active-identity dedup, completion policy, per-row reimport path, and real database state read-only. It must not infer a new business rule.

## 4. Explicitly Out of Scope at Registration

- Any frontend/backend code, test, schema, migration, database, queue, or runtime change.
- Any actual selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write.
- Any change to KPI definitions or frozen SSOT.
- Activation of this ticket by progress or closure of another ticket.
- Any change to the active `F13-BCVH-MONTHLY-CUMULATIVE-01` audit, `F13-ROUTE-POSTMAN-IDENTITY-01`, or paused `F41-DASHBOARD-MINIMUM-01`.

## 5. Next Step

Await explicit Product Owner/CTO activation for **DISCOVERY / READ-ONLY AUDIT**. The executor must return findings and a proposed contract to the Product Owner before any design or implementation is authorized. This registration does not self-activate the audit.
