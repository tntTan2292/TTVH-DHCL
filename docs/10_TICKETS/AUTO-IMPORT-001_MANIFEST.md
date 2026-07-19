# AUTO-IMPORT-001 Manifest

- Ticket ID: `AUTO-IMPORT-001`
- Ticket Name: `Source Portal Discovery and Security Assessment`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `ACTIVE / DISCOVERY`
- Technical Status: `Atomic importer claim - COMPLETED / VERIFIED`
- Runtime Status: `NOT REQUIRED YET`
- PO UI Check Required: `No`
- PO Product Status: `NOT READY`
- Activation authority: `DA-IMPL-003` received Product Owner `PO PASS` on `2026-07-18`.
- Activation decision: `Functionally accepted; visual polish deferred to DA-IMPL-007.`
- Activation date: `2026-07-18`

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Discovery Scope

AUTO-IMPORT-001 is discovery only.

- Identify the authoritative source portal and source files.
- Document access flow and authentication requirements.
- Identify CAPTCHA, OTP, session, cookie, CSRF, download-link, file-format, frequency, and security constraints.
- Identify what can and cannot be automated safely.
- Record evidence gaps without inventing portal behavior.
- Request Product Owner input only for missing access authority or business decisions.

## Out of Scope

- Do not request, store, expose, or commit credentials.
- Do not implement login automation, CAPTCHA/OTP bypass, downloading, scheduler, retry, or monitoring.
- Do not modify Dashboard product code.
- Do not activate AUTO-IMPORT-002, AUTO-IMPORT-003, or DA-IMPL-004 through DA-IMPL-007.
- Do not claim implementation PASS or PO PASS during discovery.

## Expected Evidence

- Source portal identity and source-file inventory, with confidence level and evidence source.
- Access and authentication flow summary.
- Security and automation constraints.
- DKCL Sync atomic import handoff: [docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md)
- Safe automation boundary: allowed, not allowed, and unknown pending PO/source authority.
- Open PO questions only where authority or business decision is missing.

## Completed Technical Work

- `Atomic importer claim` is `COMPLETED / VERIFIED`.
- Root cause: multiple backend/watcher instances could process the same `Incoming` file.
- Fix: atomic move from `Incoming` to `Processing`; only the winning process continues.
- Files changed: `backend/src/services/importPipeline.js`, `backend/test_importPipelineRace.js`.
- Automated tests: race tests `16 passed`, Excel parser tests `32 passed`, import processor tests `45 passed`.
- Real verification file: `F1.3-2026.02.01.xlsx`.
- Final location: `Data DKCL\F1.3\Processed\HUE\F1.3-2026.02.01.xlsx`.
- Imported rows: `2374`; distinct shipment codes: `2374`.
- Import logs: exactly `1 SUCCESS`; error rows `0`; skipped rows `0`; no duplicate or trailing `FAILED` log.
- Result: atomic claim real test `PASSED`.

## Planned Follow-On Stages

1. Huế automatic daily acquisition
2. System Administrator missing-date scan and manual backfill
3. TCT source for nationwide ranking

These stages remain unimplemented and require explicit authorization before execution.

## Acceptance Gate

AUTO-IMPORT-001 can move to READY FOR PO CHECK only after discovery evidence is documented, credentials remain out of the repository, no forbidden automation is implemented, and all required documentation checks pass.

## Next Ticket

`AUTO-IMPORT-002` Automated Download and Validation Pipeline remains `PLANNED / INACTIVE` until AUTO-IMPORT-001 receives Product Owner acceptance or explicit Governance authority permits activation.
