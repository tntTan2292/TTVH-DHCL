# F13-GOLIVE-CHECK-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-GOLIVE-CHECK-01` (gap G7 of `docs/03_PLANNING/F13-GOLIVE-PLAN-01.md`, the last one)
- Name: `F1.3 go-live check: real render of every F1.3 page, polish of the open residuals, PO final acceptance`
- Owner: Claude Code / Opus 5.5. Polish: P1 Antigravity (screens), P2 Claude Code / Sonnet 5.5 (backend). Does not change the Current Ticket.
- Branch: `codex/da-impl-006`.
- Status: `OPEN - polish P1/P2 ready`. `PO UI Check Required = Yes`.

## 2. Already done for G7

- Full rebuild of the cause table:
  - 2026-11-15: 2026-01-01..09-28 (269 days, 0 failed);
  - the refresh after imports had rebuilt 09-29..11-14;
  - the whole year now carries classifier `ceb4cf5fd7c1`;
  - `verify` 11/10-14/11 OK (F13-PARCEL-CARD-01 §35).
- Backend restart: 2026-11-13 15:08 by the supervisor, with every F1.3 backend commit.

## 3. Real render sweep (Opus, 2026-11-15)

Setup:
- isolated backend on the B3 copy, port 5051, vite 5199, Playwright;
- 3 accounts: leader (LD_BDTP), cq (Chuyên quản 537015), admin;
- pages: Kết quả Ngày / Tuần / Tháng, Phân tích nguyên nhân, Dữ liệu minh chứng and Hành trình (each day, week and month), and Đề xuất quy tắc;
- 39 page loads; a header sort click on each; the camera save on every block of 6 pages.

Results:
- **No page error and no failed API call** on any F1.3 page.
- Rights:
  - Đề xuất quy tắc refuses leader and cq, as designed;
  - the admin call returned 500 only because the B3 copy predates the `f13_rule_proposal_decision` table (harness artifact; the live page works, the PO used it on 2026-11-11).
- False flags explained:
  - "403" was the text "Xem (403)";
  - "CHUYEN_QUAN" was the harness user's display name.
- Times, warm:
  - most pages 1.7-3.6 s;
  - **Phân tích nguyên nhân, month: 9.1-9.7 s** (`/why/routes` up to 6.7 s, `/why/bcvh` up to 6.3 s);
  - the first load after a start of Ngày / Tuần / Tháng took 7-10 s (cold caches), then about 2 s.
- Cameras: 16 blocks saved, 0.6-5 s each, except **Phân tích nguyên nhân, the route block: 6 MB, 2 698 x 15 450 px, 10.4 s**, too tall to use (the same problem Hành trình had before J9).

## 4. Polish

**P1, screens (Antigravity):**
1. Phân tích nguyên nhân route block camera: whole-table picture limited to "Top N" (20 / 50 / all, default 20) like Hành trình J9, plus one camera per BCVH block if the page has BCVH blocks.
2. Hành trình whole-table picture:
   - it cuts off the right edge of "Nguyên nhân chính" (F13-JOURNEY-ROUTE-02 §21);
   - its footer title shows underscores ("Hanh_trinh_theo_tuyen_phat"), and must show words.
3. `/f13/ranking/bcvh` redirect with `from_date`: open the ISO week of `from_date`, not the newest week (F13-RETIRE-01 §7).
4. `/f13/v2/why` reads the `route` parameter and opens on that route: scroll to it, highlight it and open its postman sub-table.

**P2, backend (Sonnet):**
1. Speed of `/why/routes` and `/why/bcvh` for a month: measure on the B3 copy and bring each under 2 s warm with the same output (parity test over a month and a week), as F13-JOURNEY-ROUTE-02 B2 did for Hành trình.
2. `lot.no_tms` in scope for a BCVH account (F13-PARCEL-CARD-01 §33).
3. Delete `shipmentPerformanceData.js` (+ test) and `buildBackToRouteRankingLink` if still unused (F13-RETIRE-01 §7).

P1 and P2 touch different files and can run in parallel.

## 5. Change log

- 2026-11-15: created by Claude Code / Opus 5.5 (PO: "Bắt đầu G7").

## 7. P2 backend result (Claude Code / Sonnet 5.5, 2026-11-15)

**1. Speed of `/why/*`** (`CauseAggQueryService`). Cause: every call scanned the period 4 to 6 times (counters, cause mix, hints, then again for the BCVH parent and the city total, plus a group-by-parcel pass for the route stories).
- Now one scan per level at a fine grain (keys x verdict x cause columns x hints x arrival source x basis x time-left bucket); the counters, cause mix, hints, arrival and basis counts are sums of those rows. The BCVH parent of `/routes` and `/postmen` and the city total of `/bcvh` fold from the same scan.
- `distinct_bg` is not a sum: one check (`COUNT(*)` against `COUNT(DISTINCT ma_bg)`) tells whether any parcel repeats in the period; if none, distinct = rows; if some, the old grouped `COUNT(DISTINCT)` and the old route-story pass run as before, so the figures stay exact.
- Route stories: parcels, stock and the "little time left" count come from the fine rows (no repeat); only the F4.2 returns need one grouped count.
- Measured on the B3 copy, in process, warm (3 runs, old = HEAD code, same database), city scope:

| Call | Month old | Month new | Week old | Week new |
|---|---|---|---|---|
| `/why/routes` | 1 862 / 1 779 / 1 776 ms | **997 / 971 / 956 ms** | 449 ms | 275 ms |
| `/why/bcvh` | 845 / 834 / 924 ms | **426 / 419 / 425 ms** | 184 ms | 92 ms |
| `/why/summary` | 465 ms | 381 ms | 101 ms | 78 ms |
| `/why/postmen` | 903 ms | 484 ms | 206 ms | 111 ms |

  A Chuyên quản (one unit): routes month 666 -> 368 ms, bcvh 205 -> 137 ms.
- Output: `JSON` of all four calls, city and Chuyên quản, month and week, is **deep-equal** between the old and the new code on the B3 copy (16 comparisons, 0 differences).
- The 6.3-6.7 s of §3 was measured over HTTP in a page load that fires several calls at once (the sqlite connection serializes them), so the page total is the sum of its calls; the two calls are now about 1 s and 0.4 s alone. I did not measure over HTTP (no login to a live backend); the page total should be re-measured in the G7 render.
- Test `CauseAggQueryService.parity.test.js` (4): over a seeded month and week, every figure of every route, BCVH, the city total, the parents and the postmen equals an independent JS aggregation of the table rows; and the same data with a parcel repeated inside the period (the exact-distinct path) gives the same rows, stories and parents for the other units, with an exact city distinct count.

**2. `lot.no_tms`** (`EvidenceService._lotOf`): null without `allow_all` (as `volume`), and new `lot.no_tms_in_scope`. Test added to `f13v2ParcelCardEvidence` (admin 2/2; Chuyên quản null / 1).

**3. Dead code:** deleted `frontend/src/features/shipment/shipmentPerformanceData.js` and its test, and `buildBackToRouteRankingLink` with its 3 tests (nothing imported them: grep over `frontend/src` and `backend/src`). `shipmentModel.retired.test.js` now asserts the file is gone; the comments in `backend/src/shared/evidenceSearchMatch.js` (+ test) that named the deleted file were updated. Left alone: `isValidReturnTo` and the rest of `routeViolationEvidenceData.js` have no importer either (only their own test); say if G7 wants them removed too.

**Checks (one file at a time):** CauseAggQueryService 22, .story 7, .parity 4, RouteStory 8, CauseAggBuilder 21, JourneyPeriodService 16, f13v2Evidence 16, f13v2ParcelCard 8, f13v2ParcelCardEvidence 7, f13v2GbtBeforeArrive 4, f13v2Routes.scope 13, f13v2WhyRoutes.scope 5, f13v2RuleProposal 8, f13v2CapacityRoutes 5, evidenceSearchMatch 6: all pass. Frontend `node --test`: shipmentModel.retired 3, routeViolationEvidenceData 16: pass. No classifier file changed, so the classifier version is unchanged: no rebuild needed. Nothing built live, no restart.
