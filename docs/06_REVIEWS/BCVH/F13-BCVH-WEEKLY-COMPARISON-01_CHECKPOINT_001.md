# F13-BCVH-WEEKLY-COMPARISON-01 Checkpoint 001

## Section 1 — Activation

Product Owner requested a new business requirement in chat, 2026-09-22: a weekly quality-comparison
table inside BCVH Ranking, letting the user pick a "current" week and a "compare" week from every
week that has data, and see the delta between them for the 6 canonical BCVH.

Claude Code (Sonnet 5) first performed a read-only audit of the module (`/f13/ranking/bcvh`,
`bcvhOverviewService.js`, `FactBuuGuiRepository.js`, `BcvhRankingPage.jsx`) and found that the PO's
own worked examples (Tuần 36 = `03/09–09/09/2026`, etc.) did not match the ISO 8601 Monday-Sunday
week — the boundaries were shifted 3 days, landing on Thursday-start. This was flagged back to the
Product Owner as a business-rule question rather than assumed.

Second chat message, same date: the Product Owner confirmed the week convention explicitly —
Thứ Năm→Thứ Tư boundaries, ISO-standard week numbering, truncated display + "Dữ liệu đến ngày …"
note for an in-progress week, `TỔNG CỘNG` by summed volume (not averaged rate), absolute
percentage-point delta, free choice of any two weeks, a separate request flow (not merged into
`/overview`), and no schema/index change without measurement.

Baseline at activation: branch `codex/da-impl-006`, same commit range as the open
`F13-ROUTE-POSTMAN-IDENTITY-01` Current Ticket. Working tree carried unrelated, untouched
concurrent-session changes (`frontend/src/features/networkMap/*`, `backend/test_dkclSessionPreflightService.js`,
`.claude/`, `Data QLML/`, root-level CSV/patch scratch files) — none touched by this ticket.

## Section 2 — Scope Lock

In scope: two new read-only endpoints (`GET /f13/ranking/bcvh/weeks`, `GET /f13/ranking/bcvh/weekly-comparison`),
the Thursday-start/ISO-numbered week math, and a self-contained frontend block inserted into
`BcvhRankingPage.jsx`.

Explicitly out of scope: any change to the F1.3 KPI/SSOT, `getBcvhRanking()`, the existing
`/f13/ranking/bcvh/overview` endpoint or its 4 blocks, any schema/index/migration, and reopening
`F13-BCVH-RANKING-OVERVIEW-01` (closed, PO PASS) or any other closed ticket.

## Section 3 — Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-WEEKLY-COMPARISON-01_DESIGN.md` — week-boundary math and endpoint contracts
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-RANKING-OVERVIEW-01_DESIGN.md` — the conventions this ticket reuses
- `docs/10_TICKETS/F13-BCVH-WEEKLY-COMPARISON-01_MANIFEST.md` — full implementation and validation record

## Section 4 — Implementation Record

Implemented directly (Claude Code, Sonnet 5) per the Design of Record in Section 3. Full file list,
test counts, live-database performance measurements, and PO UI checklist are in
`docs/10_TICKETS/F13-BCVH-WEEKLY-COMPARISON-01_MANIFEST.md` Sections 5–6 (not duplicated here to
avoid a second source of truth).

Key results:

- Week math verified against every PO-given example (Tuần 36/37/38) and round-tripped across year
  boundaries (2024–2027) with zero mismatches.
- Live database confirms the PO's exact partial-week scenario: `2026-W38` currently resolves to
  `display_end_date: '2026-09-21'`, `is_in_progress: true`, note `Dữ liệu đến ngày 21/09/2026`.
- 15 new backend tests (13 service + 2 real-SQLite repository), 13 new frontend tests — all pass.
- Mandatory regression suites from the closed Overview ticket's Design of Record (§8.2) still green.
- Full backend sweep 360/364 (4 pre-existing/environmental failures, byte-identical to baseline);
  full frontend sweep 534/536 (2 pre-existing failures in unrelated, already-dirty `networkMap`/
  `dataImportBackfillQueue` files, not touched by this ticket).
- `oxlint` 0 errors, `vite build` clean.

## Section 5 — Current State

`IMPLEMENTED / TECH PASS / READY FOR PO UI CHECK`. Claude Code does not self-award PO PASS — see
Manifest Section 6 for the PO UI checklist. Does not affect `F13-ROUTE-POSTMAN-IDENTITY-01`
(Current Ticket) or any closed ticket.
