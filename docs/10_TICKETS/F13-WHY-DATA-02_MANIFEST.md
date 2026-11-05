# F13-WHY-DATA-02 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-DATA-02`
- Name: `F1.3 "TẠI SAO": cause rules v2 - TCT verdict as given, arrival from BatchFile, stages Khai thác / Vận chuyển / Phát, hints and "chờ Chuyên quản phân tích"`
- Programme: F1.3 cause rebuild. Predecessor `F13-WHY-DATA-01` (CLOSED; rules v4 locked there). Runs between `F13-WHY-AGG-01` P2 (accepted) and P3: the derived table is rebuilt with these rules before P3 / P4 (its `classifier_version` changes by itself).
- Owner: `Claude Code`. Sonnet 5.5 implements; Opus 5.5 reviews independently (rule change on the cause of every failed parcel). Does not change the Current Ticket of `PROJECT_SNAPSHOT.md`.
- Branch: `codex/da-impl-006`.
- **Status: `PO DECISIONS RECORDED (2026-11-05) - READY FOR IMPLEMENTATION`.** `PO UI Check Required = No` (backend; the page that shows it is a later UI ticket).

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
