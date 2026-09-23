# F13-BCVH-WEEKLY-COMPARISON-01 — So sánh chất lượng theo tuần (BCVH Ranking)

`IMPLEMENTED / TECH PASS / READY FOR INDEPENDENT RE-REVIEW` (2026-09-23).

## 1. Ticket Information

- Ticket ID: `F13-BCVH-WEEKLY-COMPARISON-01`
- Ticket Name: `BCVH Ranking — bảng điều hành so sánh chất lượng hàng tuần`
- Phase: `Remediation (Independent Review Opus B1–B4)`
- Executors: `Claude Code (Sonnet 5)` (initial) + `Antigravity (Gemini)` (remediation)
- Branch: `codex/da-impl-006`
- Governance Version: `V2 Active`
- Status: `IMPLEMENTED / TECH PASS / READY FOR INDEPENDENT RE-REVIEW`
- Does not reopen `F13-BCVH-RANKING-OVERVIEW-01` or any other closed ticket. Does not affect `F13-ROUTE-POSTMAN-IDENTITY-01`.

## 2. Product Owner Authorization & Review Remediation

- Activation: chat instruction, 2026-09-22, requesting weekly quality-comparison table in BCVH Ranking.
- Independent Review (Opus): 4 blockers identified and resolved in this remediation:
  - **B1 – Mốc không phải Thứ Năm**: Snaps non-Thursday dates to Thursday (`snapToThursday`). Selecting `14/09/2026` (Monday) resolves to `10/09/2026` (Tuần 37, `10/09–16/09/2026`), never `14/09–20/09`.
  - **B2 – Không sinh tuần giả**: Removed all hardcoded fallbacks (`2026-09-17`). No fake future weeks (W39/W40) generated. Empty backend returns `Chưa có dữ liệu tuần`. Future dates clamp to latest real week with clear notice.
  - **B3 – Không làm mất tuần có dữ liệu**: Changing anchor (e.g. to `10/09/2026`) preserves W38 in dropdown list (newest first). Only real weeks from `/weeks` are displayed.
  - **B4 – Tuần 38**: In-progress Tuần 38 displays real data range `17/09–21/09/2026` and note `Dữ liệu đến ngày 21/09/2026`.
  - **Header Responsiveness**: Typography updated, removed `whitespace-nowrap` on multi-line text to prevent column collision at 1280px / 1440px / mobile.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/04_TECHNICAL_PLANNING/Feature/F13-BCVH-WEEKLY-COMPARISON-01_DESIGN.md` (Design of Record, updated with Remediation Section 5)
- `docs/06_REVIEWS/BCVH/F13-BCVH-WEEKLY-COMPARISON-01_CHECKPOINT_001.md` (Checkpoint 001)

## 4. Implementation & Remediation Record

### 4.1 Files Changed in Remediation

- `frontend/src/features/ranking/bcvhWeeklyComparisonData.js` — helper functions for `snapToThursday`, `resolveWeekFromAnchorDate`, `resolveWeeksListWithAnchor`, `buildWeekOptions`, `checkWeeksDaysMismatch`, `formatWeekDataNote`.
- `frontend/src/features/ranking/BcvhWeeklyComparisonBlock.jsx` — new independent weekly operation table complying with Operation Dashboard pattern, responsive headers, no hardcoded fallbacks, anchor date snapping, in-progress real date display.
- `frontend/src/features/ranking/bcvhWeeklyComparisonData.test.js` — 11 behavioral tests covering B1–B4, empty states, and date snapping.
- `frontend/src/features/ranking/bcvhWeeklyComparisonBlock.test.js` — 8 integration tests covering component decoupling, independent filters, anchor adjustment, header non-overflow, and lack of hardcoded fallbacks.
- `frontend/src/features/ranking/BcvhRankingPage.jsx` — cleaned up unused import, independent block placement confirmed.
- Governance docs: `DESIGN.md`, `CHECKPOINT_001.md`, `MANIFEST.md`.

### 4.2 Validation Results

- `node --test frontend/src/features/ranking/*.test.js`: **56/56 PASS** (100%).
- `node --experimental-sqlite --test backend/src/services/bcvhWeeklyComparisonService.test.js backend/src/repositories/FactBuuGuiRepository.weeklyComparison.test.js`: **15/15 PASS**.
- `oxlint`: **0 errors**.
- `vite build`: **Clean**, built successfully.
- No Browser/Playwright used per instruction. No schema, index, or backend contract changes.

## 5. Status

`IMPLEMENTED / TECH PASS / READY FOR INDEPENDENT RE-REVIEW`.
Claude Code and Antigravity do not self-award PO PASS.
