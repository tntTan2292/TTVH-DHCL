# F13-WHY-DATA-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-DATA-02`
- Name: `F1.3 "TẠI SAO": cause rules v2 - TCT verdict as given, arrival from BatchFile, stages Khai thác / Vận chuyển / Phát, hints and "chờ Chuyên quản phân tích"`
- Programme: F1.3 cause rebuild. Predecessor `F13-WHY-DATA-01` (CLOSED; rules v4 locked there). Runs between `F13-WHY-AGG-01` P2 (accepted) and P3: the derived table is rebuilt with these rules before P3 / P4 (its `classifier_version` changes by itself).
- Owner: `Claude Code`. Sonnet 5.5 implements; Opus 5.5 reviews independently (rule change on the cause of every failed parcel). Does not change the Current Ticket of `PROJECT_SNAPSHOT.md`.
- Branch: `codex/da-impl-006`.
- **Status: `R1 + R2 IMPLEMENTED - FOR OPUS REVIEW (section 8)`** (2026-11-05, Claude Code / Sonnet 5.5). Decisions E1-E7 of section 3 are implemented as written. `PO UI Check Required = No` (backend; the page that shows it is a later UI ticket).

## 2. Why (evidence, read only, 2026 on a copy of the database)

- TCT hours cannot be recomputed before September 2026: failed parcels whose hours match the night rule C: April 46 %, July 53 %, October 97 %. Monthly share of "chưa đủ căn cứ" with rules v4: Jan 88 %, Feb 81 %, Mar 88 %, Apr 65 %, May 58 %, Jun 55 %, Jul 57 %, Aug 41 %, Sep 7 %, Oct 11 %. PO: TCT ran older rules; do not try to rebuild TCT's computation; take the TCT verdict and read the milestones.
- BatchFile Phát `fact_bf_phat.xac_nhan_den_bcp` is the same moment as F4.1 `thoi_gian_xnd_bd1`: week 43 Thuận Hóa 18 837 of 18 845 parcels equal to the minute. It fills about 14 000 failed parcels without an F4.1 row in 2026 (mostly January 8 966, April 3 876). Parcels present in BatchFile with an empty `xac_nhan_den_bcp` were never confirmed at the BCVH (e.g. May-August, under 100 a month recoverable).
- Arrival with little time left (October): of 29 129 failed parcels charged to the BCVH, 6 384 arrived with less than 6 h left, 1 957 with less than 3 h.
- Parcels whose milestones are all within the limit while TCT says Không đạt (April sample: CB294036850VN TCT 34:14 against 23,6 clock hours from TMS scan to delivery; CC579840515VN 13:26 against 11,4; CD460221265VN 18:36 against 24,4 clock / 14,4 net): TCT counts from an earlier start than the F1.3 TMS scan.

## 3. PO decisions (2026-11-05, in chat) - Business Rules SSOT v5

These replace the listed points of `F13-WHY-DATA-01` rules v4; everything else of v4 stays (one primary cause, earlier fault wins, three layers, own limit, night rule C, Không trọn lô over the whole lot, first handover, no blame before ĐTC2 deadlines, official result never changed).

| ID | Decision | Replaces in v4 |
|---|---|---|
| E1 | The TCT verdict (Không đạt) is taken as given. When the TCT hours can be recomputed (R valid, as v4 section 4) the interval method stays. When they cannot (R invalid), the stages are judged on the milestones with the night rule C only (excluded once: one night, plus the next morning for a night scan), without reconciling the TCT hours. | v4 section 4: "R invalid -> chưa đủ căn cứ" |
| E2 | Arrival at the BCVH (A): F4.1 by the exact key; if there is no F4.1 row, `fact_bf_phat.xac_nhan_den_bcp` of the parcel. | v4 P1: F4.1 only |
| E3 | Stages: **Khai thác** T -> D (TMS scan at KTC1 -> closing out of KTC1); **Vận chuyển** D -> A (later judged against the ĐTC2 timetable of each BCVH); **Phát** A -> E; **Nộp tiền** E -> cash handed in: listed, never part of the journey (TCT does not assess it now). D exists for domestic parcels only; for an F1.3 parcel it is found through its BD10 bag (F1.1 closing time); when found, Khai thác / Vận chuyển are split as in v4, otherwise "Khai thác - Vận chuyển (chưa phân biệt)". A source of D for inter-provincial parcels will be added by the PO later. | v4 cause list |
| E4 | Inside the Phát stage, two details: **Chậm giao bưu tá** = T -> G over the limit, **or** G on a later calendar day than A (arrived and handed over only the next day); **Phát chậm sau khi giao** = otherwise (handover in time and on the day of arrival, delivery still late). With G missing or invalid, the stage is judged on A -> E only and the detail stays empty. | v4 steps 3 and 4 |
| E5 | A missing milestone: judge with the remaining milestones; once an earlier fault is found (e.g. Không trọn lô, arrival over the limit) the later stages are not examined. What cannot be inferred is left empty for the Chuyên quản. | v4 section 5 "stops at chưa đủ căn cứ" |
| E6 | Time left at arrival (limit minus net T -> A) is **reference only**: it never changes a cause. It is a hint `DEN_BCVH_CON_IT_GIO` when under 6 h (threshold in one configuration constant), and a distribution in Hành trình and the aggregation layer: arrived already over the limit / under 3 h / 3-6 h / 6 h and more. | new |
| E7 | Failed parcels whose milestones are all within the limit while TCT says Không đạt get the status **"Chờ Chuyên quản phân tích"** with the note that the TCT hours are longer than the milestones (TCT may start from an earlier scan); no stage is chosen for them. The same status (with its reason) is used for anything E5 cannot infer. | v4 `KET_QUA_KHONG_KHOP_CHI_TIEU` / chưa đủ căn cứ |
| E8 | Later, separate ticket (not here): the Chuyên quản analyses the parcels left to them; the system keeps every correction and proposes them as rules; the PO approves before a rule becomes standard. | new |

## 4. Technical rules for the implementation (Claude/CTO, no business effect)

- One implementation of the rules: `CauseClassifier` / `tctIntervals`; `JourneyService` builds the inputs (A from F4.1, else BatchFile; `xac_nhan_den_bcp` is `M/D/YYYY h:mm:ss AM/PM`, local clock like the other sources). The BatchFile read already in `_parcels` (lot numbers, window D-10..D+6) is extended, no new window.
- E5 inference when A is missing in both sources (no confirmation at the BCVH, flag `KHONG_XAC_NHAN_DEN`): T -> G within the limit and G -> E late -> Phát / Phát chậm sau khi giao (A is before G by nature); T -> G over the limit -> "Chờ Chuyên quản phân tích" (late arrival and late handover cannot be told apart). The flag `THIEU_F41` stays when F4.1 has no row, beside the source of A (`A_SOURCE = F41 | BF`).
- Output stays three layers: `cause` (Không trọn lô, Khai thác, Vận chuyển, Khai thác - Vận chuyển chưa phân biệt, Phát with `detail` CHAM_GIAO_BUU_TA / PHAT_CHAM_SAU_GIAO / empty), status (`CAUSE`, `CHO_CHUYEN_QUAN` with a reason code, `KHONG_PHAN_TICH`; "chưa đủ căn cứ" keeps its meaning only for a parcel with no usable milestone at all), flags, hints. New per-parcel numbers: `remaining_at_arrival_ms`, `basis = INTERVAL | MILESTONES` (E1).
- `f13_cause_parcel` gets the new fields additively (cause detail, status reason, remaining time, A source, basis); `CauseAggQueryService` keeps every partition rule of F13-WHY-AGG-01 P2 and adds the Phát detail lines, the "Chờ Chuyên quản" line with reasons and the remaining-time distribution. The P2 contract stays backward compatible (lines added, none removed).
- Mapping for the weekly report skill (outside git): group 1 = Khai thác / Vận chuyển / chưa phân biệt; group 2 = Phát - Chậm giao bưu tá; group 3 = Phát - Phát chậm sau khi giao and Phát without detail; "Chưa đánh giá" = Chờ Chuyên quản and chưa đủ căn cứ. Updated by Claude Code after this ticket.

## 5. Phases and acceptance

| Phase | Content | Acceptance | Evidence |
|---|---|---|---|
| R1 Rules | `CauseClassifier`, `tctIntervals` (if needed), `JourneyService` (A from BatchFile, inputs, remaining time) | (a) parcels with R valid keep their v4 cause (October 2026: 0 change except E4 details, E6 hints and parcels moved by E2); (b) every rule E1-E7 has unit tests incl. the three April samples of section 2 (-> Chờ Chuyên quản), a next-day handover, A only in BatchFile, A in neither, G missing; (c) no Đạt or unrated parcel analysed; (d) official numbers unchanged | tests; per-month table on the DB copy (Jan-Nov 2026): failed, cause lines, Phát details, Chờ Chuyên quản by reason, chưa đủ căn cứ, A source F4.1 / BatchFile |
| R2 Table and query | `f13_cause_parcel` new columns, builder mapping, query lines and distribution | every P1 / P2 acceptance of F13-WHY-AGG-01 still holds (re-run its suites and the week 43 / October / April equality); new lines add up to Không đạt; distribution adds up to the parcels with A | tests; rebuild of 2026 on the copy; `verify` 0 differences |

## 6. Restrictions

Backend only; F1.3 only; no screen; no F4.1 indicator work; never write the live database (copy `aggcopy.sqlite` in the session scratchpad); no backend restart; shared worktree: commit by pathspec, never `User QIS.xlsx`, `.claude/skills/`, `exports/`. Validation LEVEL 2 (rule change on every failed parcel): the five f13v2 suites, `CauseAggBuilder`, `CauseAggQueryService`, `f13v2WhyRoutes.scope`, the schema suites, one file at a time with `--experimental-sqlite`.

## 7. Change log

- 2026-11-05: decisions E1-E8 recorded from the PO chat (Claude Code / Opus 5.5); ready for implementation.

## 8. R1 + R2 results (2026-11-05, Claude Code / Sonnet 5.5; for Opus review, not self-approved)

**Built (backend only).**
- R1 `CauseClassifier.js` rewritten for rules v5: basis `INTERVAL` when R is valid (v4 interval method kept) else `MILESTONES` (night rule C only, T to the last known milestone, no TCT reconciliation) (E1); stages Khai thác T-D, Vận chuyển D-A, Phát A-E, Nộp tiền never an input (E3); cause `PHAT` with detail `CHAM_GIAO_BUU_TA` (T-G over the limit, or G on a later calendar day than A) / `PHAT_CHAM_SAU_GIAO` / none when G is missing, invalid or its interval crosses the limit (E4); a missing milestone is judged on the others, an earlier fault ends the examination, A missing in both sources: T-G within the limit and delivery late = Phát chậm sau khi giao, T-G over the limit = Chờ Chuyên quản `CHAM_DEN_HAY_CHAM_GIAO` (E5); status `CHO_CHUYEN_QUAN` with a `reason` (`TCT_DAI_HON_MOC` for E7, `KET_QUA_KHONG_KHOP_CHI_TIEU` with a valid R, `KHOANG_CAT_CHI_TIEU`, `CHAM_DEN_HAY_CHAM_GIAO`, `MOC_A_KHONG_HOP_LE`, `THIEU_MOC_G`, `MOC_G_KHONG_HOP_LE`, `THIEU_PTC`); `CHUA_DU_CAN_CU` only for no usable milestone (`KHONG_CO_MOC`) or no limit; `remaining_at_arrival_ms` = limit - net T-A and hint `DEN_BCVH_CON_IT_GIO` for 0 <= remaining < 6 h, never a cause (E6). Thresholds in `backend/src/config/f13CauseConfig.js` (one constant; part of the classifier version). Flag `KHONG_XAC_NHAN_DEN` (no arrival in F4.1 nor BatchFile); `THIEU_F41` stays.
- R1 `JourneyService` / `F13JourneyRepository`: A = F4.1 by the exact key, else `fact_bf_phat.xac_nhan_den_bcp` of the same BCVH (`M/D/YYYY h:mm:ss AM/PM`, earliest non-empty value; also used when F4.1 is not unique); `a_source` F41 | BF | null; `milestones.arrive_source`. The BF Phát read of `_parcels` (window D-10..D+6) now also returns `mabc_phat` and `xac_nhan_den_bcp` (one read, no new window); D stays unknown for a BatchFile arrival (no bag).
- R2 `f13_cause_parcel` gets `cause_detail`, `cause_reason`, `remaining_at_arrival_ms`, `a_source`, `basis` (additive: new tables have them, an older table is extended by `ALTER TABLE ... ADD COLUMN` in `applyF13WhyAgg01Schema`, rows kept); the builder maps them; `classifier_version` now also covers `f13CauseConfig.js` and `F13JourneyRepository.js`. `CauseAggQueryService` keeps every P2 line (Phát is shown as `GIAO_BUU_TA_QUA_GIO` = Chậm giao bưu tá and `PHAT_MUON` = Phát chậm sau khi giao) and adds the line `PHAT_KHONG_CHI_TIET`, `phat` (by detail), `cho_chuyen_quan` (by reason), `arrival_remaining` (over the limit / < 3 h / 3-6 h / >= 6 h), `arrival_source`, `basis`; parcels filters `cause` (new values), `reason`, `remaining`, `a_source`. Legacy rows with the P2 codes still read correctly.

**Tests** (one file at a time, `--experimental-sqlite`, all green): `CauseClassifier` 29, `tctIntervals` 45, `JourneyService` 25, `f13v2Units` 20, `f13v2Routes.scope` 13, `CauseAggBuilder` 21, `CauseAggQueryService` 22, `f13v2WhyRoutes.scope` 5, `migrate_f13_why_agg_01_schema` 3, `server.startupMigrations` 1. Acceptance R1 (b): each of E1-E7 has tests, including the three April samples (real times from the copy: CB294036850VN, CC579840515VN, CD460221265VN -> Chờ Chuyên quản `TCT_DAI_HON_MOC`), a next-day handover, A only in BatchFile, A in neither, G missing; (c) a Đạt / unrated parcel has no cause, status, reason, basis or source; (d) the official numbers: equal in v4, v5 and `fact_f13` for every month (below). R2: P2 suites unchanged in what they check (the P2 fixture was kept, lines were added); new tests for the new lines, buckets (add up to the parcels with an arrival), sources, basis, reasons and for each cell the parcels behind it.

**Database copy** (`aggcopy.sqlite` of the session scratchpad, never the live file; v4 table snapshot kept as `f13_cause_parcel_v4`): `f13_cause_tool.js rebuild --from 2026-01-01 --to 2026-11-04 --db`: 306 days, 0 failed, 567 s (classifier `6c71e81b4d92`); `verify` OK, 0 differences over 1 814 day x BCVH keys: table = `fact_f13` = `agg_f13_day` = 988 895 rows / 556 756 Đạt / 389 589 Không đạt / 42 550 unrated. Output `exports/F13-WHY-DATA-02/bang_theo_thang_va_thang10_R_hop_le.txt` (SHA-256 prefix `3732a99aa81e2a7e`; the folder is git-ignored).

**Per month, failed parcels, six BCVH (before = v4 snapshot, after = v5).** Official rows / Đạt / Không đạt / unrated are equal before, after and in `fact_f13` in all 11 months.

| Month | Failed | KTL | KT | VC | KT-VC chưa pb. | v4 Chậm giao / Phát sau giao | v5 Chậm giao / Phát sau giao / Phát k.c.t. | v5 Chờ CQ | v4 chưa đủ căn cứ | v5 chưa đủ căn cứ | A: F41 / BF / none |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | 36 679 | 2 180 | 0 | 0 | 2 085 -> 3 976 | 0 / 0 | 0 / 0 / 19 322 | 11 198 | 32 414 (88,4 %) | 3 | 20 640 / 8 966 / 7 073 |
| 02 | 27 649 | 2 570 | 0 | 0 | 2 638 -> 3 600 | 0 / 0 | 0 / 0 / 14 519 | 6 933 | 22 441 (81,2 %) | 27 | 22 881 / 42 / 4 726 |
| 03 | 44 755 | 3 326 | 0 | 0 | 2 144 -> 3 423 | 0 / 0 | 0 / 0 / 26 748 | 11 258 | 39 285 (87,8 %) | 0 | 38 010 / 145 / 6 600 |
| 04 | 35 522 | 1 257 | 0 | 0 | 1 603 -> 3 071 | 3 529 / 6 125 | 8 948 / 13 508 / 742 | 7 969 | 23 008 (64,8 %) | 27 | 26 052 / 3 876 / 5 594 |
| 05 | 35 599 | 1 556 | 0 | 0 | 2 138 -> 3 236 | 4 281 / 6 908 | 9 294 / 13 693 / 58 | 7 746 | 20 716 (58,2 %) | 16 | 29 687 / 100 / 5 812 |
| 06 | 39 188 | 1 953 | 0 | 0 | 2 150 -> 3 101 | 6 094 / 7 301 | 12 644 / 14 284 / 129 | 7 072 | 21 690 (55,3 %) | 5 | 32 705 / 45 / 6 438 |
| 07 | 40 070 | 1 966 | 0 | 0 | 1 771 -> 2 611 | 5 991 / 7 471 | 13 154 / 14 971 / 62 | 7 306 | 22 871 (57,1 %) | 0 | 31 527 / 78 / 8 465 |
| 08 | 47 601 | 2 390 | 0 | 0 | 3 135 -> 4 082 | 11 382 / 11 297 | 17 924 / 16 453 / 72 | 6 653 | 19 397 (40,7 %) | 27 | 38 894 / 32 / 8 675 |
| 09 | 39 647 | 2 735 | 1 514 -> 1 515 | 481 | 1 761 -> 1 772 | 15 693 / 14 766 | 19 363 / 12 192 / 246 | 1 343 | 2 697 (6,8 %) | 0 | 38 461 / 86 / 1 100 |
| 10 | 38 820 | 2 328 | 1 769 | 197 | 1 097 -> 1 139 | 12 131 / 16 998 | 15 599 / 14 934 / 708 | 2 146 | 4 300 (11,1 %) | 0 | 35 566 / 536 / 2 718 |
| 11 (to 04/11) | 4 059 | 176 | 267 | 7 | 200 -> 209 | 1 242 / 1 703 | 1 541 / 1 622 / 141 | 96 | 464 (11,4 %) | 0 | 3 818 / 172 / 69 |

"Chờ CQ" by reason (v5): `TCT_DAI_HON_MOC` Jan-Aug 5 590 / 3 271 / 5 935 / 5 259 / 5 073 / 4 317 / 3 248 / 2 073, none from September (the TCT hours become reproducible); `THIEU_MOC_G` 5 362 / 3 399 / 4 989 in Jan-Mar (no F4.2 handover rows then) and 148 / 14 / 38 / 17 / 13 / 5 / 106 / 6 afterwards; `CHAM_DEN_HAY_CHAM_GIAO` (no arrival anywhere and T-G over the limit) 2 416 / 2 180 / 2 535 / 3 789 / 4 143 / 572 / 1 240 / 30 from April; `MOC_A_KHONG_HOP_LE` 195-739 a month; `KHOANG_CAT_CHI_TIEU` 1-156; `KET_QUA_KHONG_KHOP_CHI_TIEU` 0-61; `MOC_G_KHONG_HOP_LE` 0-15; `THIEU_PTC` 10 in January. Basis (v5): MILESTONES for 18 437 / 12 487 / 22 501 / 18 520 / 18 219 / 18 728 / 18 400 / 13 430 / 61 / 0 / 0 failed parcels (Jan-Nov), INTERVAL for the rest. Hint `DEN_BCVH_CON_IT_GIO` in October: 7 020 of 38 820; time left in October: over the limit 3 398, < 3 h 2 097, 3-6 h 4 923, >= 6 h 24 944 (35 362 with an arrival time).

**Acceptance R1 (a), October 2026, failed parcels with R valid** (all 38 820 have R valid in v4): 31 267 keep the same cause; 3 253 are Phát parcels whose detail changed from Phát chậm sau khi giao to Chậm giao bưu tá (E4: handed over on a later day than the arrival); 4 300 had "chưa đủ căn cứ" in v4 and now get a cause (2 154) or "Chờ Chuyên quản" (2 146: 1 240 `CHAM_DEN_HAY_CHAM_GIAO`, 739 `MOC_A_KHONG_HOP_LE`, 60 `KHOANG_CAT_CHI_TIEU`, 106 `THIEU_MOC_G`, 1 `MOC_G_KHONG_HOP_LE`); 536 of these 4 300 got their A from the BatchFile (E2). **Unexplained changes: 0**; of the 34 520 parcels with a v4 cause, all keep it or only get a refined Phát detail. Hint `DEN_BCVH_CON_IT_GIO` added to 7 020 parcels (E6), no other hint changed. October failed parcels whose A now comes from the BatchFile: 536.

**Findings for the review (not defects).**
- January-March "Chờ Chuyên quản" is mostly `THIEU_MOC_G` (about 5 000 a month): F4.2 has no handover rows before April, so Phát cannot be split; Phát without detail is 19 322 / 14 519 / 26 748 in those months.
- `CHAM_DEN_HAY_CHAM_GIAO` is the largest "Chờ Chuyên quản" reason from April (2 416-4 143 a month, 1 240 in October): parcels with no arrival time in F4.1 nor in the BatchFile and a late first handover. It follows E5 as written; it is the main block left to the Chuyên quản.
- `MOC_A_KHONG_HOP_LE` (A before T or after E) moves from "chưa đủ căn cứ" to "Chờ Chuyên quản" (E5); 739 in October.
- A rebuild of 2026 takes 567 s (306 days); `classifier_version` changed, so every built day is stale until rebuilt (relevant for P3 of F13-WHY-AGG-01).
- The weekly-report skill mapping of section 4 was written in the skill (outside git).
