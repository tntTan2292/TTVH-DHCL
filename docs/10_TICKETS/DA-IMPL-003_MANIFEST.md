# DA-IMPL-003 Manifest

- Ticket ID: `DA-IMPL-003`
- Ticket Name: `Integrated Trend and Risk Workspace`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `PO WARNING`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO WARNING`
- Activation authority: `DA-IMPL-002` received Product Owner `PO PASS` on `2026-07-18`.
- Activation date: `2026-07-18`

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)

## Planned Scope

Create one primary trend area named `Xu huong dieu hanh tong hop`; consolidate accepted 30-day and 7-day views under modes/tabs; incorporate Quality Pulse and risk markers; place current exceptions beside the chart; preserve accepted formulas and runtime contracts.

This ticket must explicitly decide the legacy Daily Timeline outcome: merge into the integrated chart, convert it into threshold-specific evidence, or remove it after PO acceptance.

DA-IMPL-003 product direction:

- Consolidate the current 30-day chart and 7-day comparison chart into one integrated trend workspace.
- Use tabs or modes such as `30 ngay`, `7 ngay so sanh`, and `Theo BCVH`.
- Place current risk and exception information beside the main chart.
- Eliminate duplicated chart stories.
- Preserve accepted KPI formulas, API contracts, thresholds, and filter context.
- Do not invent causes, owners, deadlines, or new thresholds.
- Reduce Dashboard height and continue the cumulative target that the final Dashboard should fit within approximately two vertical desktop viewports.
- Do not restructure DA-IMPL-004 through DA-IMPL-007 surfaces yet.

## Out of Scope

New formulas, unsupported causes, owners, deadlines, thresholds, API/schema changes, Auto Import implementation, and DA-IMPL-004 through DA-IMPL-007 restructuring.

## Next Ticket

`AUTO-IMPORT-001` Source Portal Discovery and Security Assessment.

## Implementation Evidence

- Evidence: [docs/06_REVIEWS/Dashboard/DA-IMPL-003_INTEGRATED_TREND_AND_RISK_WORKSPACE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-003_INTEGRATED_TREND_AND_RISK_WORKSPACE.md)
- PO checklist: [docs/06_REVIEWS/Dashboard/DA-IMPL-003_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-003_PO_ACCEPTANCE_CHECKLIST.md)
- PO warning remediation: leadership comparison widget now shows D-1 and D-7 values, deltas, direction, and semantic meaning without requiring hover; 7-day mode also shows per-day D-7 delta evidence.
- Handoff status: `PO WARNING / READY FOR PO RECHECK`
- Product Owner decision: `PENDING`
