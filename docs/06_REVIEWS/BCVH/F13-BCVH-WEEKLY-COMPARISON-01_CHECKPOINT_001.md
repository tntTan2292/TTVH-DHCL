# F13-BCVH-WEEKLY-COMPARISON-01 Checkpoint 001

## Section 1 — Activation

Product Owner requested a new business requirement in chat, 2026-09-22: a weekly quality-comparison
table inside BCVH Ranking, letting the user pick a "current" week and a "compare" week from every
week that has data, and see the delta between them for the 6 canonical BCVH.

Claude Code (Sonnet 5) performed initial audit and implementation at commit `2298a6f`.
Subsequent Independent Review by Opus identified four blockers (B1–B4) requiring frontend remediation:
- B1: Non-Thursday anchor date must snap to Thursday of that week (e.g. 14/09/2026 -> 10/09/2026), never showing 14/09–20/09.
- B2: No fake/future weeks, no fake `days_with_data=7`, remove hardcoded `2026-09-17` fallbacks, show `Chưa có dữ liệu tuần` when empty.
- B3: Changing anchor must not drop valid weeks (W38 must remain when shifting to 10/09/2026).
- B4: In-progress Tuần 38 must display real data range `17/09–21/09/2026` + note `Dữ liệu đến ngày 21/09/2026`.

Remediation was implemented by Antigravity (Gemini) strictly in frontend/UI without changing backend, schema, or SSOT.

## Section 2 — Scope Lock

In scope:
- Two read-only endpoints (`GET /f13/ranking/bcvh/weeks`, `GET /f13/ranking/bcvh/weekly-comparison`).
- Independent weekly operation table in `BcvhRankingPage.jsx` following Operation Dashboard pattern.
- Independent week filter toolbar.
- Snapping non-Thursday dates to Thursday (`snapToThursday`).
- Real display range for partial data weeks (e.g. W38: `17/09–21/09/2026` + `Dữ liệu đến ngày 21/09/2026`).
- Visual mismatch warning when two weeks have different days with data.
- Removal of fake week generation and hardcoded date fallbacks.

Explicitly out of scope: any change to the F1.3 KPI/SSOT, `getBcvhRanking()`, the existing
`/f13/ranking/bcvh/overview` endpoint or its 4 blocks, any schema/index/migration, and reopening
`F13-BCVH-RANKING-OVERVIEW-01` (closed, PO PASS) or any other closed ticket.

## Section 3 — Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-WEEKLY-COMPARISON-01_DESIGN.md` — week-boundary math, endpoint contracts, and remediation notes
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-RANKING-OVERVIEW-01_DESIGN.md` — the conventions this ticket reuses
- `docs/10_TICKETS/F13-BCVH-WEEKLY-COMPARISON-01_MANIFEST.md` — full implementation, validation, and remediation record

## Section 4 — Implementation & Remediation Record

1. **Remediation for Opus Review Blockers B1–B4**:
   - **B1**: Implemented `snapToThursday(dateString)` in `bcvhWeeklyComparisonData.js`. When user picks `14/09/2026` (Monday), it snaps to Thursday `10/09/2026` (Tuần 37, `10/09–16/09/2026`), unifying UI label, API parameters, and date range.
   - **B2**: Removed all fallback hard-code `'2026-09-17'`. No fake weeks (W39, W40) generated. Empty state cleanly displays `Chưa có dữ liệu tuần`. Future dates clamp to latest real week with clear UI notice.
   - **B3**: When changing anchor (e.g. to `10/09/2026`), W38 is preserved in the options dropdown (newest first). No fake 2025 weeks generated.
   - **B4**: Tuần 38 displays real data range `17/09–21/09/2026` and note `Dữ liệu đến ngày 21/09/2026`.
   - **Header Layout**: Removed `whitespace-nowrap` on multi-line text to prevent column collision at 1280px / 1440px / mobile.

2. **Test Validation**:
   - `node --test frontend/src/features/ranking/*.test.js`: **56/56 PASS** (100%).
   - Dedicated behavioral tests for B1–B4 in `bcvhWeeklyComparisonData.test.js` and `bcvhWeeklyComparisonBlock.test.js`.
   - Linter (`oxlint`): **0 errors**.
   - Build (`vite build`): **Clean**, built successfully.

## Section 5 — Current State

`IMPLEMENTED / TECH PASS / READY FOR INDEPENDENT RE-REVIEW`.
Does not self-award PO PASS.
