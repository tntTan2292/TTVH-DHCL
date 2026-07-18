# DA-IMPL-002 Manifest

- Ticket ID: `DA-IMPL-002`
- Ticket Name: `Unified Command Summary`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `ACTIVE`
- Technical Status: `NOT STARTED`
- Runtime Status: `NOT STARTED`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Activation date: `2026-07-18`
- Activation authority: `DA-IMPL-001` received Product Owner `PO PASS` on `2026-07-18`.

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

## Out of Scope

Layout work beyond the command summary, API/schema changes, invented causal explanations, and implementation of DA-IMPL-003 or later surfaces.

## Next Ticket

`DA-IMPL-003` Integrated Trend and Risk Workspace.
