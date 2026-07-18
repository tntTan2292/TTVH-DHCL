# DA-IMPL-003 Manifest

- Ticket ID: `DA-IMPL-003`
- Ticket Name: `Integrated Trend and Risk Workspace`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
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
- PO warning remediation: leadership comparison now shows two compact widgets simultaneously (`So với hôm qua` and `So với cùng kỳ tuần trước`), exposes only `Tỷ lệ đạt` and `Sản lượng`, removes comparison toggles and failed-count/failed-rate details from the comparison area, removes the redundant `Tỷ lệ không đạt` trend line/story, and presents the residual measurement population as `Chuyển hoàn` under `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`.
- Product Owner accepted: integrated 30-day trend; 7-day same-period comparison; simultaneous D-1 and D-7 leadership widgets; comparison limited to `Tỷ lệ đạt` and `Sản lượng`; one `Tỷ lệ đạt` trend line; `Chuyển hoàn` semantics; `Đạt + Không đạt + Chuyển hoàn = Tổng mẫu đo kiểm`; Quality Pulse and grounded risk evidence.
- Visual styling, spacing, and final aesthetic refinement are deferred to `DA-IMPL-007` and are not an open blocker against DA-IMPL-003.
- Handoff status: `COMPLETED / PO PASS`
- Product Owner decision: `PO PASS - Functionally accepted; visual polish deferred to DA-IMPL-007.`
