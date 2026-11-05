# F13-WHY-AGG-01 - Design of Record (approved by the PO 2026-11-05)

**Status:** `APPROVED BY PO (2026-11-05) - v2 including section 6A and Appendix D`. Approved: the derived per-parcel table and the query layer; denominator = all F1.3 rows; three route scopes; first-handover postman as the analysis dimension (the shown postman is stored beside; no personal blame); background refresh with single runner, safe re-run, freshness and log; shortfall and net contribution as in section 6; BG-day rows as the basis of every headline figure, distinct parcels for information only and always shown when repeats exist. Scope: F1.3 only, backend only. Implementation is governed by `docs/10_TICKETS/F13-WHY-AGG-01_MANIFEST.md` (not activated until the PO says so). Author: Claude Code / Sonnet 5.5. Predecessor: `F13-WHY-DATA-01` (CLOSED). Agreed order: AGG, Hành trình, Phân tích tuyến phát, Năng lực và chất lượng tuyến, Dữ liệu minh chứng, NARRATIVE and RETIRE.

**Added in v2 after the second ChatGPT review:** section 6A (parcels measured on several days: BG-day rows versus distinct parcels, which figures add up and which are recomputed) with its evidence in Appendix D.

**What changed from v1 (important):** the official rate divides by ALL rows, not by Đạt + Không đạt (section 4). v1 had it wrong; formulas below are corrected.

## 1. Purpose and scope

One shared, traceable source that turns the per-parcel cause of `CauseClassifier` into figures by BCVH, route and postman, for a day, a week (Thursday-Wednesday), a month or a free day range. The four Chuyên đề pages read it instead of each aggregating on their own.

In: F1.3 only; one derived table, its builder, freshness, the query layer (API), tests. Out: any screen; F4.1 or other indicators (nothing is built for them); any change of the cause rules, thresholds or the official F1.3 result; the definition of "năng lực tuyến" (module 3, own ticket); narrative sentences.

## 2. Required reading

`docs/10_TICKETS/F13-WHY-DATA-01_MANIFEST.md` (rules, results); `PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md`, `backend/src/services/aggMaintenance.js`, `aggReadPolicy.js` (derived tables, signatures, fuse); `F13-V2-STRUCTURE-01_DESIGN.md` (period axis, permissions); `backend/src/repositories/FactBuuGuiRepository.js` (official counters); `docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md` (for the UI tickets that follow).

## 3. Why a derived table (measured)

`JourneyService._parcels` for one day takes about 1.0-1.2 s (26/10: 4 616 parcels in 1 210 ms; 27/10: 2 665 in 915 ms); a month would take about 30 s a request. `agg_f13_day` only holds SQL counters and cannot hold a cause (cross-table logic in JavaScript). Proposed: a **per-parcel derived table**; aggregates are `GROUP BY` on it (about 390 000 failed parcels a year, indexed by day); no second layer of materialised aggregates in this ticket.

## 4. Formulas against the official figures (evidence, week 43 = 22-28/10/2026)

Full tables: Appendix A. Result: every source gives the same numbers, and the **official denominator is every F1.3 row (`COUNT(ma_bg)`), including rows without a verdict**.

- Numerator / denominator in the code: `FactBuuGuiRepository` volume = `COUNT(ma_bg)`, passed = `danh_gia_2026 = 'Đạt'`, failed = `'Không đạt'` (strict); rank and rate use `passed / count`; the route ranking's `total_returned` is the count of rows with a blank verdict. The agg table stores `n_rows, n_dat, n_khong_dat, n_blank` with the same meaning.
- Equality found: for the six BCVH, raw `fact_f13`, `agg_f13_day`, the BCVH ranking (`getBcvhRanking`), the per-day operation metrics and `JourneyService` (the future source of the table) give identical rows, Đạt, Không đạt and blank for every BCVH (total 23 098 rows, 14 027 Đạt, 7 738 Không đạt, 1 333 blank). One day check (26/10, Thuận Hóa): 2 165 / 1 700 / 393 / 72 in all five sources.
- Official rate = Đạt / rows: Thuận Hóa 69,18 %, Hương Trà 63,34 %, A Lưới 62,54 %, Hương Thủy 37,76 %, Thuận An 80,77 %, Phú Lộc 38,15 %, six BCVH 60,73 %. The alternative Đạt / (Đạt + Không đạt) would give 64,45 % for the six: **it is not used**.
- Route level: the route ranking (as the screen uses it) counts only routes with `ma_tuyen LIKE '53%'` (Huế routes) **and not** in the 7 confirmed non-postman codes of `f13RouteClassificationCatalog.js` (`CONFIRMED_NON_POSTMAN_ROUTES`). Summed over the 7 days, the ranking equals raw SQL with the same predicate for all six BCVH, difference 0 (Thuận Hóa 11 132 rows / 8 007 Đạt / 3 033 KĐ / 92 blank; Hương Trà 3 089; A Lưới 663; Hương Thủy 3 592; Thuận An 1 396; Phú Lộc 2 066). The rest of each BCVH is **not in any ranked route**: rows on the confirmed non-postman routes (466, 220, 31, 198, 76, 167 = 1 158 rows; mostly blank verdicts) and rows with an empty or non-`53%` route (2, all in Thuận Hóa). So the sum of the ranked routes is smaller than the BCVH total (Thuận Hóa 11 132 of 11 600), and the table keeps three route scopes: `POSTMAN` (ranked), `NON_POSTMAN` (confirmed codes), `OTHER` (empty or non-53%). BCVH = POSTMAN + NON_POSTMAN + OTHER; screens that rank routes use `POSTMAN` only and show the rest as "Tuyến khác" so the BCVH total still adds up.
- The blank rows (`ket_qua_f13` empty) are the "chưa có đánh giá" rows (tồn / hoàn; no cause, a hint only, rule R10). They stay in the denominator, as officially, and are shown as their own figure.

Consequence for the definitions in section 6: `N` = all rows. The cause mix is over Không đạt only; blank rows are not a cause.

## 5. Data model

Table `f13_cause_parcel` (derived, fully rebuildable, not a source of truth).

**Unique key and cases (evidence, 2026 data, Appendix C):**
- Key `(ngay_do_kiem, ma_bg)`, the same as the unique index of `fact_f13` (proved: `sqlite_autoindex_fact_f13_1` on `ngay_do_kiem + ma_bg`, unique). One row per F1.3 row. `ma_bcvh` and `ma_tuyen` are attributes of the row, not of the key.
- A parcel on several measurement days: 9 451 of 976 872 parcels in 2026 (22 242 of 989 663 rows; 3 340 parcels on 3 days or more). Each day is its own row and is counted once per day, exactly like the official figures, and the AGG never merges rows of different days. Where they are: **9 320 of the 9 451 begin in April 2026** (4 078 of them inside the single week 09-15/04), 131 are spread over June-October; October 2026 has none inside the six BCVH, nor have the weeks 40-43. Rules for weeks and months: section 6A.
- A parcel whose BCVH or route changes between days: not seen for BCVH, once for route. Each row keeps the values of its own day. If a day is re-imported and a parcel changes BCVH or route, or disappears, the rebuild of that day deletes all its rows first, so no row is left behind.

| Column | Content |
|---|---|
| `ngay_do_kiem`, `ma_bg` | key |
| `ma_bcvh`, `ma_tuyen`, `route_scope` | grouping keys; `route_scope` = `POSTMAN` (ranked route), `NON_POSTMAN` (confirmed non-postman code) or `OTHER` (empty or non-53%) |
| `ma_buu_ta_first`, `ten_buu_ta_first` | postman of the first handover (section 7), null = no F4.2 row |
| `ma_buu_ta_shown`, `ten_buu_ta_shown` | postman shown on Hành trình (`pickHandover`) |
| `danh_gia` | Đạt / Không đạt / null, copied, never recomputed |
| `cause_code`, `cause_status`, `cause_step` | classifier result (`CAUSE`, `CHUA_DU_CAN_CU`, `KHONG_PHAN_TICH`) |
| `flags`, `hints` | text lists |
| `ma_lo`, `khong_tron_lo` | lot evidence |
| `limit_ms`, `tct_ms`, `l_ms`, `r_ms` | the numbers the verdicts were made from |
| `built_at`, `classifier_version` | provenance |

Indexes: `(ngay_do_kiem, ma_bcvh)`, `(ngay_do_kiem, ma_bcvh, ma_tuyen)`, `(ngay_do_kiem, ma_bcvh, ma_tuyen, ma_buu_ta_first)`, `(ma_bg)`. Companion tables `f13_cause_day` (per day: input signature, classifier version, state, built_at, error) and `f13_cause_run` (log of every run). The row is produced by the existing `JourneyService._parcels` code path; there is no second implementation of the rules.

## 6. Definitions (no early rounding)

Counts are integers. Money-like intermediate values are kept exact: the shortfall is stored and summed as **tenths of a parcel**, `shortfall_x10 = 9 x N - 10 x Đạt` (an integer); the rate is computed from the integers only for display; nothing is rounded before a sum or a comparison.

- **N** (volume) = all rows of the group (official `COUNT(ma_bg)`). **Đạt**, **KĐ** (Không đạt), **unrated** = blank verdict; N = Đạt + KĐ + unrated.
- **Rate** = Đạt / N x 100, one decimal on display only.
- **Shortfall against 90 %** of a group `s = 0.9 x N - Đạt` (`shortfall_x10 / 10`); positive = missing parcels, negative = surplus.
- **Two different figures for a route (or postman) in a BCVH:**
  1. *Own shortfall* `d_r = max(0, s_r)`: how far the route alone is below 90 %. Ranking of hot spots uses it.
  2. *Net contribution to the BCVH* `s_r` (signed): the BCVH shortfall is exactly `S = sum of s_r` over its routes (plus the `NON_POSTMAN` and `OTHER` buckets), so surplus routes offset deficits. When `S > 0` the share of the BCVH shortfall is `s_r / S` (can be negative for a surplus route); when `S <= 0` the BCVH is on target and the share is "không áp dụng". The share of deficits `d_r / sum d_k` is given beside it.
- **Failed share** of the BCVH failures: `KĐ_r / KĐ_BCVH`.
- **Cause mix** of a group: over KĐ only; for each cause `count` and `share = count / KĐ`. "Chưa đủ căn cứ" is its own line (count, share, split by `cause_step` and by flag), never merged into a cause; the lines add up to KĐ. Unrated rows and hints (`DAU_HIEU_CHAM_TAI_BCVH`) are reported beside the mix, not inside it.
- **Capacity vs impact are separate:** N and rate = capacity and quality; `s`, `d`, shares = impact. No combined score.
- **Axis and periods:** the measurement day; weeks Thursday-Wednesday numbered by the ISO week of their Thursday, months, free day ranges, all through `periodResolve`; every endpoint takes the same `from`/`to`, `week`, `month`, `bcvh`, so every screen filters identically. A period figure is the sum of its day rows.

## 6A. Parcels measured on several days (weeks and months)

Two kinds of figure, never treated as equal:
- **BG-day count (lượt BG-ngày):** one table row = one parcel on one measurement day. This is what the official F1.3 counts (`COUNT(ma_bg)` over the days of the range) and the **only** basis of the headline figures.
- **Distinct parcels (BG duy nhất):** each `ma_bg` once in the group and period. Information only; it never replaces a BG-day figure.

Rules:
1. **F1.3 rate of a week or month** = sum of Đạt rows / sum of all rows of its days (not the mean of daily rates, not a distinct-parcel rate). This is how `getBcvhRanking(from, to)` already works; Appendix D shows what the distinct-parcel rate would be instead (April: 58,54 % against the official 58,84 %; week 09-15/04: 56,28 % against 57,10 %), so the two must not be mixed.
2. **Failed parcels and cause mix in a period** = Không đạt rows and the causes of those rows. A parcel that fails on two days is two failures and counts twice in the cause mix; each row is classified on its own day with its own data (April 2026: 3 348 parcels failed on two days or more). `share = cause rows / Không đạt rows` of the group.
3. **A parcel whose verdict, route or postman changes between days:** each row keeps its own values; nothing is overwritten, averaged or chosen. A parcel can be Đạt on one day and Không đạt on another (26 parcels in 2026), can sit under two routes or two first-handover postmen in one period (it is then in both groups), and its BCVH never changed (0 of 9 451).
4. **Which figures add up and which are recomputed:**

| Kind | Figures | Rule |
|---|---|---|
| Additive (sum of day rows, any grouping, any period) | N, Đạt, KĐ, unrated, `shortfall_x10`, cause counts, "chưa đủ căn cứ" counts, flag counts, hint counts | sum of the integers |
| Recomputed from the additive sums of the group and period | rate, cause shares, `own_shortfall = max(0, s)` and `net_contribution = s` of the period, share of the BCVH shortfall, rank | never an average or a sum of daily rates, shares, or of daily `max(0, .)` |
| Distinct set (not additive) | `distinct_bg` = `COUNT(DISTINCT ma_bg)` of the group and period; `repeat = N - distinct_bg` | recomputed per group; children do not add up to the parent (a parcel under two routes counts in both) |

5. **Visibility:** when `repeat > 0` the response carries `meta.repeats = { rows, distinct, extra }` and each aggregate row may carry `distinct_bg`, so a screen can write "N lượt, M BG duy nhất". A figure is never shown without saying whether it counts rows or distinct parcels.
6. **Not provided in this ticket:** a verdict or a cause "per distinct parcel" (it would need a representative record). If a later page needs it, a PO rule is required first (candidate to discuss then: the latest measurement day of the period, always labelled). No endpoint here answers "rate of unique parcels".
7. **Drill-down to BG** lists every row of the parcel with its day, so a parcel on two days shows twice, once per day.
8. **Tests:** a week with a parcel on two days (rate = sum of rows, `distinct_bg` and `repeat` correct); a parcel failing on two days appears twice in KĐ and in the cause mix; a parcel Đạt on day 1 and Không đạt on day 2; a parcel in two routes / two postmen (parents are not the sum of children for `distinct_bg`, are for N); April fixture (parcels on 09/04 and 10/04); `own_shortfall` of a period is `max(0, s)` of the period, not the sum of daily values.

## 7. Postman identity (verified on F4.2)

Source: `fact_f42` (one row per handover, `ma_bg`, `thoi_gian_gbt`, `ma_buu_ta`, `ten_buu_ta`, `ma_tuyen_phat`, `thoi_gian_ptc`, `danh_gia`). Rule, the same one the classifier uses (`pickFirstHandover`): among **all** F4.2 rows of the parcel in the window D-10..D+5, the row with the smallest `thoi_gian_gbt` (successful or not). Its `ma_buu_ta` is the first-handover postman; the identity is the code, the name is displayed from that same row.

Evidence, week 43 (23 099 parcels, Appendix B): no ties on the earliest handover time; no row with an empty postman code (0 of 133 779 rows in the window); 61 parcels have no F4.2 row (26 failed) -> bucket "Chưa có bưu tá"; 2 261 parcels have two or more handovers and **every one of them involves different postmen**; the first-handover postman differs from the one shown on Hành trình for 2 180 parcels (693 failed); for 5 798 parcels the first F4.2 row sits on another F4.2 measurement day (so the lookup must be by parcel over the window, as built); the first row's route equals the F1.3 route for 22 973 and differs for 65; 2 postman codes carry two names and 3 names carry two codes (identity = code, never name).

Proposal: aggregates by postman group by **`ma_buu_ta_first`** (ChatGPT's preference, serves cause analysis; same rule as the classifier), and the table also keeps the shown postman so Hành trình stays as it is. This is the PO choice in section 12.2: it changes who "owns" a parcel that was first attempted by one postman and delivered by another (9,4 % of parcels). The aggregate never states a fault of a person (R11).

## 8. Keeping the table true (operation)

**Which days a source day can change (from the code, not assumed).** `JourneyService._parcels(D)` reads F4.1, F4.2, F1.1 and the F1.3 lot scans in `[D-10, D+5]` (`DAYS_BEFORE = 10`, `DAYS_AFTER = 5`) and BF Phát (lot numbers) in `[D-10, D+6]`, plus the F1.3 rows of D. So an import of source day X can change day D only when `X-5 <= D <= X+10` (F1.3, F4.1, F4.2, F1.1) or `X-6 <= D <= X+10` (BF Phát). The F4.1 row is picked by the exact key (same day), so in practice F4.1 only matters for D = X; the whole window is kept as the safe rule. The builder takes both bounds from the same constants as `JourneyService` (exported), and a test fails if they ever differ. A change of `classifier_version` makes every day stale.

**Operating rules:**
1. *No double run:* one writer at a time. In-process lock plus a row in `f13_cause_run` with status `RUNNING` and a heartbeat; a second request while a run is active is queued into the same run (it extends its day list), never started in parallel. A run whose heartbeat is older than 15 minutes is marked `ABANDONED` and its unfinished days are redone.
2. *Safe re-run:* a day is rebuilt in **one transaction** (delete the day's rows, insert the new ones, update the day state and signature). A reader sees the old day or the new day, never half. Rebuilding twice gives the same rows. It starts only when no import transaction is open (same guard as `aggReadPolicy`).
3. *Log:* every run writes `f13_cause_run` (id, trigger, from/to day, days done / failed, start, end, status, last error) and one summary line to the server log.
4. *Errors:* a failing day keeps its previous rows, is marked `STALE` with the error, the run goes on with the next day, retries that day up to 3 times with a pause, and ends `PARTIAL` or `FAILED`. A restart resumes with "build the missing and stale days".
5. *Never old data presented as new:* freshness is **computed at read time**, not trusted from a flag: for each requested day the stored input signature (row count and max id of F1.3 / F4.1 / F4.2 / F1.1 / BF in the day's window, the idea of `agg_day_sig`) is compared with the current one (cached for 60 s). A response carries `meta.freshness = { complete, stale_days, missing_days, building, built_to }`; the figures of the available days are returned and the screen must show the notice. A day being rebuilt is reported as `building`, never as fresh.
6. *Trigger:* after an import commit the affected days (above) are queued for a background run; a tool `scripts/f13_cause_tool.js build | rebuild | verify --from --to` does the same by hand. `verify` compares Đạt, KĐ, blank and rows per day with `agg_f13_day` and `fact_f13`; a difference is reported, never "corrected".

## 9. Interface (backend, draft names)

Under `/api/f13/v2/why/` with the common filter. Every aggregate row: `key`, `volume` (N), `passed`, `failed`, `unrated`, `rate`, `shortfall` (exact), `own_shortfall`, `net_contribution`, `share_of_bcvh_shortfall`, `share_of_failed`, `cause_mix[]`, `hints`, and the filter that opens its parcels.
`summary`; `bcvh`, `routes`, `postmen` (levels, drill-down by `bcvh=`, `route=`); `parcels` (paged, same filter plus `cause`); `meta.freshness` on every response. Drill-down BCVH -> route -> postman -> BG extends one filter by one key per step; a figure and its BG list use the same predicate.

## 10. Permissions

As Journey: `all` accounts see the six BCVH; a `bcvh` account sees only its own units, never a city total, a city-wide cause mix or a national rank; a filter outside the scope is rejected, not trimmed. Postman names follow the existing Hành trình rule (Chuyên quản and Giám đốc BCVH see the same).

## 11. Tests required (acceptance)

Partition and totals:
- BCVH = sum of its `POSTMAN` routes + `NON_POSTMAN` + `OTHER`; BCVH = sum of its postmen (by `ma_buu_ta_first`) + "Chưa có bưu tá"; for N, Đạt, KĐ, unrated and the shortfall (exact, integer tenths). Checked for a day, a week, a month and a free range, for every BCVH.
- Cause mix: the sum of all lines, including "chưa đủ căn cứ", equals KĐ at every level; no Đạt or unrated row has a cause.
- Sum of the rows of `parcels` equals the figure of the cell it was opened from.
- A parcel on two measurement days is counted on each day and nowhere else; day re-import with a changed BCVH, route or a removed parcel leaves no orphan row.
- Hot spot arithmetic: `s_r`, `d_r`, `S = sum s_r`, shares, surplus route negative, `S <= 0` gives "không áp dụng"; no rounding before a sum (a case where rounding early would change a rank).
Equality with the official figures:
- Per day and BCVH: N, Đạt, KĐ, unrated equal `agg_f13_day`, `fact_f13`, the BCVH ranking and the route ranking (postman scope) - the comparison of Appendix A turned into a test and a `verify` rule.
Operation:
- Window constants equal those of `JourneyService`; lock/queue (second run does not start in parallel); crash and resume; failing day keeps old rows and is reported stale; freshness reports a source import after the build; classifier-version change marks all days stale; builder rows equal `_parcels` output.

## 12. PO decisions (all approved as recommended, 2026-11-05; see the status line)

1. **Approve** the derived per-parcel table and query layer (sections 3, 5, 8) and the corrected formulas (section 6, denominator = all rows).
2. **Postman for aggregates:** `ma_buu_ta_first` (recommended, evidence in section 7) or the postman shown on Hành trình. Both are stored either way.
3. **Refresh:** background rebuild after each import (recommended) or manual only.
4. **Unrated rows** (tồn / hoàn): stay in N as officially and appear as their own figure (recommended; no change of the official rate).
5. **Parcels on several days:** BG-day rows are the basis of every headline figure; distinct parcels are shown only as information (section 6A, recommended).

## 13. Risks

| Risk | Control |
|---|---|
| Table out of date after a late import | read-time signature check, `meta.freshness`, `verify` |
| Second implementation of the rules | builder calls the one service path; test builder = `_parcels` |
| Rebuild load (up to 17 days per import, about 1 s each) | background, per day, idempotent, queued into one run |
| Shortfall and rate differ from the official | formulas fixed by the evidence of Appendix A; equality test; `verify` |
| "Chưa đủ căn cứ" (7,7 % of failed in week 43) read as a cause | own line, with step and flag split |
| First-handover postman differs from the shown one (9,4 %) | both stored; PO choice 12.2; no fault wording (R11) |
| One more table (about 1 million rows a year) | measured in the build phase; indexes limited to four |

## Appendix A - Reconciliation of rate figures (week 43, read only; raw output: `exports/F13-WHY-AGG-01/doi_chieu_cong_thuc_tuan43.txt`, SHA-256 prefix `cad872dcc58944f0`)

| BCVH | Rows | Đạt | KĐ | Blank | Rate Đạt / rows | (Đạt / (Đạt + KĐ), not used) |
|---|---|---|---|---|---|---|
| Thuận Hóa | 11 600 | 8 025 | 3 076 | 499 | 69,18 % | 72,29 % |
| Hương Trà | 3 309 | 2 096 | 987 | 226 | 63,34 % | 67,99 % |
| A Lưới | 694 | 434 | 229 | 31 | 62,54 % | 65,46 % |
| Hương Thủy | 3 790 | 1 431 | 2 127 | 232 | 37,76 % | 40,22 % |
| Thuận An | 1 472 | 1 189 | 207 | 76 | 80,77 % | 85,17 % |
| Phú Lộc | 2 233 | 852 | 1 112 | 269 | 38,15 % | 43,38 % |
| Six BCVH | 23 098 | 14 027 | 7 738 | 1 333 | 60,73 % | 64,45 % |

For each BCVH the same four numbers appear in: raw `fact_f13`; `agg_f13_day` (sum of the week); `getBcvhRanking` (total_bg, total_passed, total_failed); `JourneyService` (rows, Đạt, KĐ). Differences: **none**. Route level (`exports/F13-WHY-AGG-01/doi_chieu_tuyen_co_danh_sach_loai_tru_tuan43.txt`): route ranking called with the confirmed non-postman list, summed over 7 days, against raw SQL (`53%`, not in the list): equal for all six BCVH (difference 0 rows, Đạt, KĐ and blank), e.g. Thuận Hóa 11 132 / 8 007 / 3 033 / 92; the remaining rows per BCVH are the confirmed non-postman routes (Thuận Hóa 466, Hương Trà 220, A Lưới 31, Hương Thủy 198, Thuận An 76, Phú Lộc 167) and 2 rows outside `53%` in Thuận Hóa. A first run without the list also matched raw SQL with the same (weaker) predicate, which is why the list is called out above.

## Appendix B - Postman identity evidence (week 43, `exports/F13-WHY-AGG-01/dinh_danh_buu_ta_tuan43.txt`, `082b26f489269fc2`)

23 099 parcels (7 738 failed); one F4.2 row 20 777; two or more 2 261 (all with different postmen); none 61 (26 failed); ties on the earliest time 0; empty postman code 0 / 133 779; first postman equals shown postman 20 858, differs 2 180 (failed 693); first row on the same F4.2 day 17 240, on another day 5 798; route equals F1.3 route 22 973, differs 65; codes with two names 2 of 154, names with two codes 3 of 153.

## Appendix C - Key and multi-day evidence (2026 to 04/11)

`fact_f13`: unique index `(ngay_do_kiem, ma_bg)`; 989 663 rows, 976 872 distinct parcels; parcels on 2+ days 9 451 (22 242 rows), on 3+ days 3 340; across the days of those parcels: different BCVH 0, different route 1, different verdict 26, different TMS scan 0; week 43: no parcel on two days.

## Appendix D - Parcels on several measurement days: rows against distinct parcels (read only)

Files: `exports/F13-WHY-AGG-01/bg_nhieu_ngay_do_kiem_thang10.txt` (`88cc5c07e7b71915`), `bg_nhieu_ngay_do_kiem_thang4.txt` (`0334269a17e70385`). Six BCVH.

| Period | BG-day rows | Đạt | KĐ | Official rate | Distinct BG | BG on 2+ days | Distinct-parcel rate | KĐ rows | KĐ distinct BG |
|---|---|---|---|---|---|---|---|---|---|
| October 2026 | 113 235 | 68 499 | 38 820 | 60,49 % | 113 235 | 0 | 60,49 % | 38 820 | 38 820 |
| Weeks 40, 41, 42, 43 (Oct) | 24 811 / 26 923 / 26 801 / 23 098 | | | 61,40 / 58,80 / 58,58 / 60,73 % | = rows | 0 | = official | = rows | = rows |
| April 2026 | 94 770 | 55 767 | 35 522 | 58,84 % | 82 116 | 9 315 (extra rows 12 654) | 58,54 % | 35 522 | 31 021 |
| Week 09-15/04/2026 | 22 767 | 12 999 | 8 950 | 57,10 % | 18 689 | 4 078 | 56,28 % | 8 950 | 7 510 |
| Day 10/04/2026 | 4 078 | 2 481 | 1 440 | 60,84 % | 4 078 | 0 | 60,84 % | 1 440 | 1 440 |

In April the six BCVH show no parcel whose verdict, route or BCVH changed between its days (0), and 3 348 parcels failed on two days. Over 2026 (all BCVH) 26 parcels changed verdict, 1 changed route, 0 changed BCVH or TMS scan time. Where the multi-day parcels are: 9 320 begin in April, 131 in June-October, 5 of the 9 451 are outside the six BCVH.
