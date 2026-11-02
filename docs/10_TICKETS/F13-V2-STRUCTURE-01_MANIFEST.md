# F13-V2-STRUCTURE-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-V2-STRUCTURE-01`
- Ticket Name: `F1.3 on the time axis (Theo ngày / Theo tuần / Theo tháng) — new module beside the old one`
- Owner: `Claude Code` (backend) · UI: `Antigravity` · Review: `Opus` (independent, DEC-021)
- Governance Version: `V2 Active`
- Activation authority: `PO request in chat 2026-11-02 (menu by time axis; Ngày page takes a free date range; build a new F1.3 first, remove the old one only after PO acceptance)`
- Branch: `codex/da-impl-006`
- Activation date: `2026-11-02`
- Does not change Current Ticket (parallel; F13-ROUTE-POSTMAN-IDENTITY-01 stays paused).

## 2. Objective

Same-time-axis structure for one indicator, starting with F1.3, without touching the old F1.3 pages.

## 3. Current Status

- State: `D1-D3 APPROVED (PO 2026-11-02) / B0-B1 BACKEND DELIVERED` (tests 13 + 10 pass). U1 (Antigravity UI) not started; backend restart needed to serve `/api/f13/v2`.
- PO UI Check Required: `Yes`, after U1.

## 4. Required Reading

- `docs/04_TECHNICAL_PLANNING/Feature/F13-V2-STRUCTURE-01_DESIGN.md` (scope, filters, permissions, API, phases)
- `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md`
- `docs/04_TECHNICAL_PLANNING/Feature/RBAC-01_DESIGN_OF_RECORD.md` (scope rules)

## 5. Scope

In: `/api/f13/v2/{layout,period/resolve,day/summary}`, block registry with scope tags, `/f13/v2/{ngay,tuan,thang}` pages, menu group "F1.3 (mới)" (ADMIN only in trial), tests, parity script. Out: old F1.3 pages, other indicators, Home, Hàng tồn, database/Import, Chuyên đề rebuild.

## 6. Locked Rules

Existing business rules unchanged (weeks Thursday–Wednesday, TỔNG CỘNG by summed volume, F1.3 target 90 %, blue family). Permissions stay per module (`all` / `bcvh` / `none`); a `bcvh` account never receives a `city` block, city total or national rank.

## 7. Phases

B0 contract note → B1 backend → U1 UI → R1 Opus review → PO UI check → retire old pages. Details: design Section 8.

## 8. Next Ticket

After PO acceptance: the same template for F1.1, F1.2, F4.1, F4.2 (one ticket each).
