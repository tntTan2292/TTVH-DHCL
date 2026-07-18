# DA-IMPL-002 Manifest

- Ticket ID: `DA-IMPL-002`
- Ticket Name: `Unified Command Summary`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `READY FOR PO CHECK`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Activation date: `2026-07-18`
- Activation authority: `DA-IMPL-001` received Product Owner `PO PASS` on `2026-07-18`.
- Technical handoff date: `2026-07-18`

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)

## Planned Scope

Consolidate top KPI cards and Executive Summary into one KPI story; include date range, canonical BCVH filter, total volume, pass rate, failed rate as supporting information, missing/unknown rate, and one grounded executive insight. Remove duplicate summary presentation without changing KPI formulas.

Product Owner requirements transferred from DA-IMPL-001 closure:

- Do not show `Tỷ lệ đạt` and `Tỷ lệ không đạt` simultaneously as two independent KPI cards.
- Restore `Xếp hạng toàn quốc` from imported nationwide data.
- Use `Bưu gửi cần xử lý` as the action card; `Tỷ lệ không đạt` must be supporting information, not a standalone KPI card.

Product Owner compactness requirements:

- Command Summary must begin reducing total Dashboard height immediately.
- At desktop reference viewport `1440x900`, the primary leadership summary must be visible within the first viewport.
- The complete final Dashboard direction must target no more than approximately two vertical viewports.
- The two A4 pages reference is a density/readability analogy only, not a print-layout calculation.
- DA-IMPL-002 must not increase total page height.
- Remove duplicated KPI and Executive Summary presentation.
- Later detailed content should be prepared for tabs, collapse, drawer, or drill-down rather than permanently expanded widgets.
- DA-IMPL-007 remains responsible for final full-page assembly, but compactness is a cross-ticket acceptance constraint from DA-IMPL-002 onward.

## Out of Scope

- Layout work beyond the command summary.
- Database schema changes.
- New KPI formulas, thresholds, mappings, or invented causal explanations.
- Portal login, downloading, credentials, scheduler, CAPTCHA/OTP handling, or automated import.
- Implementation of DA-IMPL-003 or later surfaces.
- Implementation of Auto Import tickets.

## Auto Import Planning

The approved future Auto Import sequence is planning-only in DA-IMPL-002:

- `AUTO-IMPORT-001` - Source Portal Discovery and Security Assessment
- `AUTO-IMPORT-002` - Automated Download and Validation Pipeline
- `AUTO-IMPORT-003` - Scheduled Import, Retry, Monitoring and Operations UI

Auto Import tickets remain `PLANNED / INACTIVE`. DA-IMPL-002 must not invent source portal details or implement Auto Import behavior.

## Implementation Evidence

- Implementation report: [docs/06_REVIEWS/Dashboard/DA-IMPL-002_UNIFIED_COMMAND_SUMMARY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-002_UNIFIED_COMMAND_SUMMARY.md)
- PO checklist: [docs/06_REVIEWS/Dashboard/DA-IMPL-002_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-002_PO_ACCEPTANCE_CHECKLIST.md)
- Handoff status: `READY FOR PO CHECK`
- PO authority still required for final `PO PASS`.

## Next Ticket

`DA-IMPL-003` Integrated Trend and Risk Workspace.
