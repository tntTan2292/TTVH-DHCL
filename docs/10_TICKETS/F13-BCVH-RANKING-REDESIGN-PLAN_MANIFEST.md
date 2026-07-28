# F13-BCVH-RANKING-REDESIGN-PLAN Manifest

- Ticket ID: `F13-BCVH-RANKING-REDESIGN-PLAN`
- Ticket Name: `BCVH Ranking Redesign Planning`
- Phase: `F1.3 Operational Module Planning`
- Current state: `READY FOR PO PLANNING`
- Technical Status: `PLANNING ONLY - NO IMPLEMENTATION`
- Runtime Status: `NOT RUN - PLANNING ONLY`
- PO UI Check Required: `No - planning decision required`
- PO Product Status: `WAITING FOR PO PLANNING`
- Activation authority: `Planning only`
- Handoff date: `2026-07-28`
- Recommended executor after PO planning decision: `Codex for data/contracts/tests; Antigravity only for later visual redesign after explicit UI authority`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-PLAN_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`
- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`

## Recently Closed Authority

`F13-INTERNAL-ROUTE-AUDIT` is `COMPLETED / PO PASS`.

Approved Route Ranking outcome:

- Route Ranking filter labels are exactly `Tuyến bưu tá | Tất cả`.
- Default filter is `Tuyến bưu tá`.
- Hue Route Ranking excludes route codes not starting with `53`.
- The `7` PO-confirmed customer-pickup/internal post-office routes are not counted as postman routes.
- `Tất cả` includes those routes and displays classification `Nhận tại bưu cục`.
- Minimal runtime-backed Route Ranking table is Product Owner approved.

## Planning Scope

Plan only the BCVH Ranking redesign. Do not implement product code, UI, schema, formulas, historical fact data, Import behavior, or business thresholds under this ticket.

The planning output must preserve these Product Owner management requirements:

- current day vs previous day vs comparison day;
- delayed cash handover count;
- participating postman-route count;
- route quality distribution by Dashboard color bands.

## Boundaries

- No BCVH Ranking implementation authority exists yet.
- Do not reopen Route Ranking after `PO PASS` unless Product Owner reports a new defect.
- Do not reopen `F13-DATA-QUALITY-001` or `F13-SHIPMENT-001`; both remain deferred and preserved.
- Do not classify unconfirmed routes as postman routes by inference.
- Use the authoritative route catalog for confirmed non-postman routes in future planning.

## Decision Required

Product Owner must approve exactly one next BCVH Ranking planning direction before implementation can begin.

## Handoff

Status: `READY FOR PO PLANNING`.

Next session should produce a planning-only BCVH Ranking redesign proposal that maps the required management outcomes to currently supported data/contracts and asks for Product Owner approval before any code changes.
