# F13-WHY-DATA-03 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-DATA-03`
- Name: `F1.3 cause rules: direct handover ĐTC1 -> BCVH Hương Trà (535470), arrival before the TMS scan`
- Programme: F1.3 cause rules. Predecessor `F13-WHY-DATA-02` (rules v5, CLOSED). Changes one input of the classifier for one BCVH; everything else of v5 stays.
- Owner: `Claude Code`. Opus 5.5 reviewed before the change (this document). Sonnet 5.5 implements. Opus 5.5 reviews the result. Does not change the Current Ticket of `PROJECT_SNAPSHOT.md`.
- Branch: `codex/da-impl-006`.
- **Status: `READY FOR SONNET`** (2026-11-07, Opus pre-implementation review PASS, section 5). `PO UI Check Required = No` (rule change, figures checked on a copy; the PO may look at a Hương Trà parcel afterwards).

## 2. PO decision (2026-11-07, in chat)

Hương Trà (535470) receives directly from ĐTC1, so a parcel scanned in TMS to Hương Trà counts as if it had been scanned at KTC1. Add a condition for Hương Trà only. The other BCVH stay as they are.

Example CC557753117VN (06/11): T (TMS) 05/11 12:19:11, A (F4.1 XND BD1) 05/11 12:11:52 (7 min 19 s before T), G 06/11 08:28:12, E (PTC) 06/11 13:47:18. Today: `CHO_CHUYEN_QUAN / MOC_A_KHONG_HOP_LE` at step T-A (`CauseClassifier.js` lines 193-196: `stage('t_a', T, A)` is null because a stage must lie inside T -> E).

## 3. Evidence (read only on the live file, 2026, F4.1 exact key as `pickArrival`)

| BCVH | T/A pairs | A before T | of which failed | gap T - A: <= 15 min / 15 min-1 h / 1-6 h / 6-24 h / > 24 h | A >= T: median, p10 |
|---|---|---|---|---|---|
| **535470 Hương Trà** | 132 952 | **3 085 (2,32 %)** | **1 046** | 1 009 / 719 / 834 / 408 / 115 | **187 min, 13 min** |
| 533140 Thuận Hóa | 470 377 | 7 082 (1,51 %) | 674 | 12 / 603 / 3 611 / 2 685 / 171 | 324 min, 164 min |
| 536250 | 103 897 | 1 394 (1,34 %) | 348 | 166 / 232 / 596 / 387 / 13 | 304 min, 135 min |
| 537220 | 61 829 | 681 (1,10 %) | 321 | 162 / 78 / 205 / 184 / 52 | 446 min, 98 min |
| 537015 | 62 349 | 566 (0,91 %) | 26 | 13 / 53 / 321 / 165 / 14 | 360 min, 160 min |
| 535790 | 26 928 | 93 (0,35 %) | 25 | 5 / 26 / 18 / 28 / 16 | 1 071 min, 319 min |

- Cause table 2026, `MOC_A_KHONG_HOP_LE` by BCVH: 536250 1 117, **535470 1 042**, 533140 696, 537220 313, 535790 154, 537015 32. The 1 042 match the 1 046 failed A-before-T parcels of Hương Trà (the other 4 stop earlier, e.g. Không trọn lô).
- Hương Trà is the only BCVH where A follows T within minutes (p10 13 min against 98-319 min elsewhere) and where A before T is mostly under one hour (1 728 of 3 085). This fits the direct handover. Elsewhere A before T is mostly 1-24 h: a data or sequence problem, not this rule (out of scope, PO: other BCVH unchanged).
- Hương Trà failed parcels 2026 today: PHAT 51 760, CHO_CHUYEN_QUAN/TCT_DAI_HON_MOC 7 926, KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET 3 595, KHONG_TRON_LO 2 597, **MOC_A_KHONG_HOP_LE 1 042**, THIEU_MOC_G 759, KHAI_THAC 349, CHAM_DEN_HAY_CHAM_GIAO 306, VAN_CHUYEN 178, others under 50.

## 4. Technical decisions (Opus, answers to the review questions)

**Q1. What is A for Hương Trà?** For a Hương Trà parcel whose arrival A is earlier than T by at most 24 h, the classifier uses **A_eff = T**. The T -> A stage is then **0** (computed, not dropped), its verdict is "within the limit", the time left at arrival is the whole limit. A arriving after T (the normal case, 97,7 %) is unchanged, and so is A missing.
- Why A_eff = T and not "skip the order check": skipping it would treat A as unknown (step E5, `!isTime(A)`), which loses the arrival day. On CC557753117VN, A_eff = T gives `PHAT / CHAM_GIAO_BUU_TA` (handed over the next calendar day after arrival, E4), the correct reading. Skipping gives T -> G (net 10 h 09 with the night rule) within 14 h, so `PHAT_CHAM_SAU_GIAO`: wrong.
- 24 h cap (technical guard, not a business rule): a gap over 24 h (115 Hương Trà pairs in 2026) is more likely the F4.1 row of an earlier trip than a direct handover. Those keep `MOC_A_KHONG_HOP_LE` for the Chuyên quản. One constant in `f13CauseConfig.js`.
- Every later step uses A_eff, including the "next calendar day" test of E4 (`dayOf(G) > dayOf(A_eff)`), because the TCT clock starts at T.

**Q2. Where it applies.**
| Place | Change |
|---|---|
| `config/f13CauseConfig.js` | `DIRECT_HANDOVER_BCVH = ['535470']`, `DIRECT_HANDOVER_MAX_EARLY_MS = 24 h`. Part of the classifier version already. |
| `CauseClassifier.js` | New input `directHandover` (boolean, set by the caller; the classifier stays pure and knows no BCVH code). If `directHandover && A < T && T - A <= max`: A_eff = T, flag `A_TRUOC_TMS_GIAO_TRUC_TIEP` (data-quality flag, never a cause). Every use of A after the flags block reads A_eff. The `WRONG_ORDER` flag (G < A) is computed on A_eff. |
| `JourneyService.js` | Passes `directHandover: DIRECT_HANDOVER_BCVH.includes(row.ma_bcvh)`. The milestone shown stays the **raw** A (evidence = the data). The legs `tms_arrive` (and `depart_arrive` is not touched) use A_eff for Hương Trà when the rule applies, so the Hành trình medians match the classifier; the response item carries the flag. |
| `EvidenceService.js` | No code: it reads the cause table and the journey items. The flag must appear in the flag list of the item. |
| Frontend `f13WhyHelpers.js` | Label of the new flag: `A_TRUOC_TMS_GIAO_TRUC_TIEP: 'Giao nhận trực tiếp ĐTC1: đến BCVH trước giờ quét TMS, chặng TMS -> đến tính 0'`. Nothing else in the UI. |
| `CauseAggBuilder` | Nothing in code. The classifier version changes (hash of the version files) so **every built day becomes stale**: `/why` and Dữ liệu minh chứng show "Số liệu chưa hoàn tất" for any day outside the startup window until it is rebuilt. Rollout = full rebuild of 2026 on the live file after the PO agrees (as F13-WHY-AGG-01 section 21), then verify. |
| Official F1.3 figures (`fact_f13`, `agg_f13_day`, Đạt / Không đạt, TCT hours) | **Unchanged.** The classifier only reads them. |
| `/why` | Counts per cause for Hương Trà move (about 1 000 parcels out of `MOC_A_KHONG_HOP_LE`), totals unchanged. Analyst entries in `f13_analysis_log` are kept; a parcel whose system conclusion changes shows the old analysis with the new system line (V3 rule: a different choice needs a note). |
| Weekly report skill (`.claude/skills/baocaotuanf13`) | Reads causes through JourneyService: the next run uses the new rule. Reports already sent are not regenerated. |

**Q3. Logic risks, checked.**
- Không trọn lô (step 1) comes before A: unchanged. `BCVH_LATE_SIGN` reads the t_a verdict: with A_eff it is never "over" for these parcels. Correct, since the arrival was in time.
- THIEU_MOC_E, NO_LIMIT, THIEU_F41 / F41_KHONG_DUY_NHAT: computed before and independently of A_eff: unchanged. A from BatchFile (`aSource = 'BF'`) is treated the same way as F4.1 (the rule is about the place, not the source).
- `stage('t_a', T, T)`: INTERVAL basis, `stageOf` accepts from = to = T (from >= model.from); net 0, bounds from `legBounds(0, L, R)`, under any limit of 8 h or more. MILESTONES basis: `to >= from && from >= T`: accepted, net 0.
- A missing: unchanged (E5 branch). A after T: unchanged, including the over-the-limit case (Khai thác / Vận chuyển). D (closing out of KTC1) only matters when T -> A is over the limit, so it never matters for A_eff = T.
- G before A_eff (G < T): already flagged `G_TRUOC_T`. With A_eff = T, `WRONG_ORDER` is also set: correct.
- Other BCVH: `directHandover` false: byte-for-byte the v5 path. The tests must prove it on the copy (0 change outside 535470).

**Q4. Plan, tests, before/after.**
1. Code as Q2. Unit tests in `CauseClassifier.test.js`: the example parcel gives `PHAT / CHAM_GIAO_BUU_TA` with the flag; A 7 min before T without `directHandover` stays `MOC_A_KHONG_HOP_LE`; A 25 h before T with `directHandover` stays `MOC_A_KHONG_HOP_LE`; A after T with `directHandover` is identical to without; A missing with `directHandover` is identical; Không trọn lô first; MILESTONES basis (R invalid) with A before T gives t_a net 0. `JourneyService.test.js`: raw A in the milestone, leg `tms_arrive` 0, flag present, a non-Hương Trà parcel unchanged.
2. Before/after on a **copy** of the database (never the live file): build 2026 with the old and the new classifier, compare `f13_cause_parcel` row by row. Expected: changes only where `ma_bcvh = 535470`; every changed row had `cause_reason = MOC_A_KHONG_HOP_LE` before; a table of where they go (PHAT detail, CHO_CHUYEN_QUAN reason); count of the 24 h cap cases left; `fact_f13` / `agg_f13_day` / `/why` totals identical; verify of the builder 0 differences.
3. Stop at the report. The live rebuild and the backend restart wait for the Opus review and the PO's go-ahead.

## 5. Opus pre-implementation review

PASS. No SSOT or frozen document touched; one PO decision, implemented as a classifier input. No question open for the PO before implementation.

Notes for the PO (not blocking): (a) the other BCVH also have A before T (536250 1 117 failed parcels, Thuận Hóa 696), mostly 1-24 h, which is not a direct handover; they stay "Chờ Chuyên quản". (b) At Hương Trà a T -> A over the limit stays Khai thác / Vận chuyển (4 122 failed parcels in 2026). If T is the scan at Hương Trà itself, that time is spent at Hương Trà, not upstream; a later PO decision may move it.

## 6. Restrictions

Never change the official F1.3 data, `agg_f13_day` or the analysis log. No build on the live database, no restart, no change of `QIS_F13_CAUSE_REFRESH` in this phase. Shared worktree: commit by pathspec only; never `User QIS.xlsx`, `.claude/skills/`, `graphify-out/`, `.graphifyignore`. Backend suites with `--experimental-sqlite`, one file at a time.

## 7. Prompt for Sonnet (Claude Code)

> F13-WHY-DATA-03, branch `codex/da-impl-006`. Read `CLAUDE.md`, then this manifest (sections 2-4 and 6). Implement section 4 Q2 exactly: config constants, `directHandover` input and A_eff in `CauseClassifier.js`, the caller in `JourneyService.js` (raw A shown, leg on A_eff, flag on the item), the flag label in `f13WhyHelpers.js`. Write the tests of Q4.1. Run Q4.2 on a copy of `backend/src/db/database.sqlite` (old vs new classifier over 2026, row by row) and report the table. No live build, no restart. Commit by pathspec, push, write your results in a new section 8 of this manifest, stop for the Opus review. Report: Technical Execution Report.

## 8. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 after the PO decision; evidence read only on the live file.
