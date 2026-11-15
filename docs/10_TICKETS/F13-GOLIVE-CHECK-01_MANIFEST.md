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
