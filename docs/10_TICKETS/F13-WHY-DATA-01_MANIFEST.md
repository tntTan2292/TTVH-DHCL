# F13-WHY-DATA-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-DATA-01`
- Name: `F1.3 "TẠI SAO": one primary cause for every failed parcel (classifier)`
- Owner: `Claude Code` (PO request in chat 2026-11-04). Does not change Current Ticket.
- Programme: F1.3 cause rebuild; later tickets: AGG (route / postman / BCVH totals, hot spots), NARRATIVE (sentences), UI (page "Vì sao?"), RETIRE.
- **Document status (2026-11-05): CLOSED - PO UI PASS** (see section 12). Previously: IMPLEMENTED - READY FOR PO CHECK. Business Rules SSOT LOCKED (design v4). Backend classifier, Journey wiring and tests are done (124 tests green in the five f13v2 files); no screen was added. `PO UI Check Required = Yes` (page Hành trình: the Không trọn lô count changes, see section 11). This file is the single design record for the ticket.
- Workspace when v3 was written: branch `codex/da-impl-006`, HEAD `1885c303`; this manifest and the draft classifier are untracked. SSOT chain in force: `CLAUDE.md` -> `PROJECT_SNAPSHOT.md` (Current Ticket there is still `F13-ROUTE-POSTMAN-IDENTITY-01`, unchanged by this ticket).

Source key: `PO` = Product Owner decision; `Finding` = data fact; `Proposal` = technical proposal, not binding; `Open` = needs PO.

## 2. Decision register

| ID | Before | Latest | Status | Design effect | Document / code to update |
|---|---|---|---|---|---|
| D1 Night rule | "Night 21:00-07:00 left out once"; then "only inside the measured interval, M3 rejected" | **PO chose option C (2026-11-05):** accept the model observed in TCT data, including one extra following night for night scans. It is a rule *compatible with how TCT is observed to calculate*, inferred from survey data; it is **not** a confirmed official TCT regulation and must not be described as one. No extension beyond the cases the data supports. | PO (C) + Finding | Section 3 | `CauseClassifier.netHours` (currently lacks the extra night for scans after 21:00); skill note; memory |
| D2 Sat/Sun/holiday | M2 model, "certain by bounds" | No calendar, no TTP inference from DKCL or from TCT totals. Trust the TCT total. Any difference after the night rule is the neutral quantity `UNLOCATED_TCT_EXCLUSION`, never called TTP / weekend / holiday. | PO | Section 4 | draft classifier |
| D3 Stage intervals from the TCT difference | not designed | PO agrees to consider the interval method, designed strictly (formula in section 4). No arbitrary allocation; conclude only if the whole interval gives one verdict; else "chưa đủ căn cứ". Over limit is `>`; equal is not over. | PO + Proposal (formula given by PO) | Section 4 | new function (later) |
| D4 Limit | 12/14/17, 14 when missing | Parcel's own `thoi_gian_chi_tieu`, no fallback, no fixed list. 2026: 0 failed and 0 passed parcels lack it (418 rows lack it, all without a verdict). Guard flag `THIEU_CHI_TIEU` only; not a tree step. | PO | Section 5 | `limitHours` + test (remove 14 default) |
| D5 Không trọn lô | failed parcels only counted | Batches counted over all lot parcels; only failed parcels get the cause; keeps the cause even if the parcel reached the BCVH in time (procedure does not allow entering delivery for a non-complete lot). Accepted consequence: ~79 % of BCVH-side delays in the week-43 sample are hidden. | PO | Sections 5, 6 | `JourneyService.buildLots` |
| D6 "4. Đồng ý" | unclear | Confirmed earlier: non-complete lot parcel that arrived in time still gets Không trọn lô (already D5). | PO | none | - |
| D7 Official result | - | Never changed. | PO | none | - |

### Locked rules (PO, unchanged)

R1 only Không đạt gets a cause; R2 at most one primary cause, earlier fault wins; R3 three independent layers (cause / data-quality flags / operating hints); R4 not enough data -> no guess, "chưa đủ căn cứ" is a status; R5 own limit, no 14 h; R8 G = first handover in F4.2 (successful or not); R9 G < A -> keep milestones and analysis, only flag `SAI_TRINH_TU_NGHIEP_VU`, do not drop; R10 tồn/hoàn only a hint; R11 no blame on a person or unit until ĐTC2 level-2 deadlines exist; R12 F1.3 official results untouched; no F4.1 row -> "chưa đủ căn cứ" + data flag (PO is the data owner); negative TCT hours (6 753 rows, all Đạt) ignored; hot spots rank by parcels missing against 90 %; Chuyên quản and Giám đốc see the same screen with the postman name.

Milestones: T = `fact_f13.thoi_gian_bd10_quet_tms`; D = KTC1 closes toward the BCVH (`fact_f11`, via the F4.1 BD10 number); A = `fact_f41.thoi_gian_xnd_bd1`; G = first handover `fact_f42.thoi_gian_gbt`; E = `fact_f13.thoi_gian_ptc`.

### Former proposals - all decided by the PO on 2026-11-05

P1 APPROVED: F4.1 key `ma_bg + ngay_do_kiem + ma_bc_phat` (week 43: 7 152 / 7 738 failed rows match one row, 585 none, 1 other BCVH). P2 DECIDED: no threshold; Khai thác vs Vận chuyển is decided only when the two intervals do not overlap (the 1 h threshold is dropped). P3 DECIDED: no threshold for G < A; the flag `SAI_TRINH_TU_NGHIEP_VU` only. P4 DECIDED: no allocation of `UNLOCATED_TCT_EXCLUSION` beyond the formula of section 4.

## 3. Night rule C (design)

Night window = `[21:00, 07:00 next day)`. Boundaries: 21:00 belongs to the night; 07:00 does not (it belongs to the day). Excluded time is always the intersection with `[T, E]`; nothing before T, nothing after E, no time counted twice.

- **Day scan** (T in `[07:00, 21:00)`): only the first night that overlaps `[T, E]` (clipped). Further nights are not removed (observed with 2-5 nights).
- **Night scan** (T in `[21:00, 07:00)`): the rest of the night that contains T (clipped to E), **plus one following full night `[21:00, 07:00)` only if E >= its end (07:00)**. A following night covered only partly is not removed. Never more than these two.
- E exactly 07:00 counts as covering the night (end <= E).
- The excluded intervals are built **once for the whole journey T->E**, then each stage takes the overlap of its own span with that set, so a night is never removed twice.

Evidence (Finding, 5/9-28/10/2026, intervals touching Sat/Sun/Monday morning/1-4 Sept removed): day scans match with 31 exceptions; night scans match 3 942 (2 nights), 885 (3), 231 (4), 3 (5), 36 exceptions; second night partly covered: 213 follow "first night only", 2 the opposite. This is an observation of the surveyed period only. The exceptions are not removed: parcels whose recomputed total disagrees with TCT fall into section 4.

## 4. Handling the TCT difference

For a failed parcel with valid T, E, E > T and TCT >= 0 (hours): `L` = hours of T->E after removing the section-3 intervals; `TCT` = official TCT hours; `R = L - TCT` = `UNLOCATED_TCT_EXCLUSION`.

For a stage with net hours `S`: `Lower = S - min(S, R)`, `Upper = S - max(0, R - (L - S))`. Verdict: `Lower > limit` -> over; `Upper <= limit` -> within; otherwise "chưa đủ căn cứ".

Invalid inputs -> data flag + "chưa đủ căn cứ", no abs(), no forcing R to 0, no capping: `R < 0`, `R > L`, TCT negative, T/E missing or E <= T, stage times out of order.

Khai thác vs Vận chuyển (T->D vs D->A) is decided only when their intervals do not overlap; otherwise "Khai thác - Vận chuyển (chưa phân biệt)". D missing or inverted -> also "chưa phân biệt". The 1 h tie threshold is Proposal P2.

**Finding that needs a PO decision (rounding):** TCT is stored as whole minutes (`h:mm`). On week 43 (7 738 failed parcels) R measured in minutes is: 5 011 parcels in `[0, 1.5)`; **2 425 parcels slightly negative (between -1.5 min and 0)**; 0 between 1.5 min and 3 h; 302 parcels with R >= 3 h (the real unlocated exclusion); none strongly negative; none with R > L. Applying "R < 0 is invalid" literally would send about 31 % of failed parcels to "chưa đủ căn cứ" because of minute rounding. PO accepted (2026-11-05) a tolerance of 1.5 minutes: |R| <= 1.5 min is measurement precision, treated as R = 0; it is not clamping of a real negative.

Effect on week 43 (draft milestones, prototype): of 6 876 failed parcels outside non-complete lots with a valid A and R, T->A is over the limit for 583, within for 6 290, undetermined for only 3.

## 5. Cause tree (design)

0. Đạt -> no analysis.
1. Không trọn lô (lot evidence, D5). Evaluated independently of the time model.
2. Arrived after the limit, T->A interval verdict "over": split T->D / D->A (section 4).
3. Handover late: T->G interval verdict "over" (needs G >= T). G < A only raises the flag.
4. Delivery late: G->E (for a failed parcel T->E is over by definition, so this is the remainder).
5. Otherwise "chưa đủ căn cứ".

A step whose milestone or interval is missing/undetermined stops the tree at "chưa đủ căn cứ" (with the step name in the flag layer). The limit is the yardstick for every step, not a step.

Flags (layer 2): `THIEU_CHI_TIEU` (guard, 0 cases), `THIEU_F41`, `SAI_TRINH_TU_NGHIEP_VU`, `R_KHONG_HOP_LE`, `THOI_GIAN_KHONG_HOP_LE`, missing/inverted D/G/E, `UNLOCATED_TCT_EXCLUSION` present (value shown).
Hints (layer 3): tồn, hoàn, `DAU_HIEU_CHAM_TAI_BCVH` (section 6).

## 6. Keeping what Không trọn lô hides

The cause stays Không trọn lô; no second cause is created. In the hint layer, for a Không trọn lô parcel, the classifier still evaluates step 2 and, **only when the T->A interval verdict is conclusive "over"**, shows the hint "Có dấu hiệu chậm đến BCVH (không phải nguyên nhân chính)" with the hours interval and the limit. A "within" or undetermined verdict shows nothing. Hint wording must not blame the BCVH or the transport. Same method could show G / E signs later; not designed here.

## 7. Test cases (design; prototype in session scratchpad, 43/43 pass)

Night rule (id, T -> E, excluded h, net L h): N1 10:00->18:00 same day 0/8; N2 d 10:00 -> d+1 09:00 10/13; N3 -> d+2 12:00 10/40; N4 -> d+4 12:00 10/88; N5 10:00 -> 23:00 same day 2/11; N6 22:00 -> next 06:00 8/0; N7 22:00 -> next 12:00 9/5; N8 22:00 -> d+2 07:00 19/14; N9 22:00 -> d+2 06:59 (second night partly) 9/23.98; N10 22:00 -> d+4 12:00 19/67; N11 00:00 -> 18:00 7/11; N12 00:00 -> d+1 08:00 17/15; N13 06:00 -> d+1 12:00 11/19; N14 07:00 -> 23:00 2/14; N15 07:00 -> d+2 12:00 10/43; N16 21:00 -> d+1 07:00 10/0; N17 21:00 -> d+2 07:00 20/14; N18 20:00 -> d+1 08:00 10/2; N19 T = E 0/0; N20 06:59 -> 07:00 1 min/0.
Interval method (journey T 10:00, D 16:00, A d+1 12:00, E d+1 20:00: L = 24, T->A = 16): B1 TCT 24 (R 0), limit 12 -> 16..16 over; B2 TCT 20 (R 4), limit 12 -> 12..16 undetermined; B3 limit 11 -> over; B4 limit 16 -> within (equal is not over); B5 TCT 0 (R = L) -> 0..0 within; B6 TCT 26 (R -2) -> invalid; B7 TCT -2 (R > L) -> invalid; L1-L5 limits 12/14/15 over, 16/17 within.
Tree: C1 Đạt -> no analysis; C2 D 16:00 -> Vận chuyển; C3 D d 23:00 -> Khai thác; C4 D missing -> chưa phân biệt; C5 A missing -> chưa đủ căn cứ + `THIEU_F41`; C6 limit empty -> chưa đủ căn cứ + `THIEU_CHI_TIEU`; C7 non-complete lot, T->A over -> Không trọn lô + hint; C8 same lot, limit 17 -> Không trọn lô, no hint; C9 TCT 20, limit 12 -> chưa đủ căn cứ at T->A; C10 G before A -> Vận chuyển + `SAI_TRINH_TU_NGHIEP_VU`; C11 TCT 26 -> chưa đủ căn cứ + `R_KHONG_HOP_LE`.
Not yet covered by tests: real-data cases for each exception group of section 3, T->G and G->E verdicts, R in the minute-rounding band (needs O1), several handovers (first only), lot counting over several measurement days.

## 8. Delivered code

- `backend/src/services/f13v2/tctIntervals.js` (new) + `tctIntervals.test.js`: night rule C, journey-wide intervals, R and the Lower/Upper bounds, in integer milliseconds, tolerance 90 000 ms (|R| <= 90 000 ms is read as R = 0; review M1).
- `backend/src/services/f13v2/CauseClassifier.js` (rewritten) + `CauseClassifier.test.js`: tree of section 5, flags, hints; no 14 h default, no `CHUA_PHAT` cause, no 1 h threshold.
- `JourneyService.js`: F4.1 by the exact key (`pickArrival`), first handover for the classifier (`pickFirstHandover`; `pickHandover` still feeds the displayed milestone and the postman name), lot batches counted over every parcel of the lot; the parcel now carries `cause`, `cause_status`, `cause_step`, `flags`, `hints`, `cause_detail`, `milestones.gbt_first`. `F13JourneyRepository.js`: reads `ma_bc_phat` (F4.1) and `thoi_gian_chi_tieu` (F1.3). `JourneyService.test.js`: two old lot tests changed on purpose, eight tests added.
- Read only: nothing writes to the database, the official Đạt / Không đạt, TCT hours and formulas are only passed on.

## 9. Open points

None for the business rules (all closed, sections 2 and 5 of the former list). The 56 parcels with an invalid A (section 11) are covered by section 4 and need no PO decision; an optional PO choice among treatments is recorded in the investigation report, not here.

## 10. Change log

- 2026-11-04: first version (draft classifier).
- 2026-11-05: decision register after PO adjustments; weekend modelling withdrawn; 14 h fallback marked for removal.
- 2026-11-05 (v4): PO approved P1, O2, O4; decided P2 (no threshold), P3 (flag only), P4; SSOT locked.
- 2026-11-05 (v3.1): PO accepted the 1.5-minute rounding tolerance for R.
- 2026-11-05 (v3): PO chose night option C; `UNLOCATED_TCT_EXCLUSION` and interval method designed; hint design; test list; rounding finding.
- 2026-11-05 (v5): implemented (Phase 0-4), review M1 fixed (|R| <= 90 000 ms -> R = 0), Phase 4 results, baseline and residuals recorded; status READY FOR PO CHECK.
- 2026-11-05 (v6): PO UI PASS, ticket closed (section 12).

## 11. Results (Phase 0-4, 22-28/10/2026, six BCVH; Thuận Hóa as pilot)

**Baseline (HEAD `1885c303`, code read with `git show`, no checkout).** Per-parcel file `exports/F13-WHY-DATA-01/baseline_head_1885c303.csv` (columns `ma_bg, ma_lo, ngay_do_kiem, khong_tron_lo, danh_gia, ma_bcvh`; SHA-256 prefix `9157d0d8579407bd`) and `baseline_summary.json` (`533f7f8f778d00bb`). The folder `exports/` is in `.gitignore`: those files are not in the repository. Largest data date in all five tables 04/11/2026. Rows in the survey window 12/10-02/11/2026 (BF Phát to 03/11) and fingerprint (first 16 hex of the SHA-256 of the key columns): `fact_f13` 80 563 / `549ba10eba121768`; `fact_f41` 117 264 / `098bd3f11c7e6c6e`; `fact_f42` 133 779 / `271f792ec76fcba6`; `fact_f11` 31 182 / `f976cf9f688194a1`; `fact_bf_phat` 137 233 / `7dff417f07c9a0e8`. HEAD reproduces the weekly report: Thuận Hóa Không trọn lô 223.

**Official result unchanged.** New code, HEAD and SQL agree: six BCVH 7 738 Không đạt, 14 027 Đạt, 1 333 not rated; Thuận Hóa 3 076 / 8 025 / 499. No difference in the parcel set, `danh_gia` or `so_gio_tct` (23 098 rows both).

**Causes, Thuận Hóa (3 076 failed):** Phát muộn 1 413; Giao bưu tá quá giờ 997; Không trọn lô 273; Khai thác 145; Vận chuyển 5; Khai thác - Vận chuyển chưa phân biệt 86; chưa đủ căn cứ 157 (T-A 136, T-G 21). Six BCVH (7 738): Phát muộn 3 375; Giao bưu tá quá giờ 2 778; Không trọn lô 449; Khai thác 353; Vận chuyển 40; chưa phân biệt 147; chưa đủ căn cứ 596 (T-A 555, T-G 41); 44 hints DAU_HIEU_CHAM_TAI_BCVH; no Đạt parcel analysed.

**Differences explained.**
- Không trọn lô, Thuận Hóa 223 -> 273: the 50 added parcels belong to lots whose failed parcels sit in one batch but the lot has 2 batches once passed parcels count (rule D5); none lost. List: `phase4_khong_tron_lo_diff_ThuanHoa.csv` (SHA-256 prefix `35f7314402bd1f36`).
- F4.1 exact key: 7 737 of 7 738 failed parcels keep the same arrival; 1 loses it (the row exists only for another BCVH). 586 failed parcels have no arrival (Hương Thủy 448, Thuận Hóa 130, Hương Trà 6, Phú Lộc 2): chưa đủ căn cứ + THIEU_F41.
- First handover: 690 failed parcels have a first handover earlier than the displayed one; their cause changes for 350 (Giao bưu tá quá giờ -> Phát muộn 259; Giao bưu tá quá giờ -> chưa đủ căn cứ 11; chưa đủ căn cứ -> Phát muộn 80). Displayed postman name and displayed G: no change against HEAD. 296 parcels carry SAI_TRINH_TU_NGHIEP_VU.
- R: all 7 738 valid (0 below -90 000 ms, 0 above L); 7 436 within +/-90 000 ms; 302 above (flag UNLOCATED_TCT_EXCLUSION).
- Prototype T->A (6 876 parcels: 583 over / 6 290 within / 3 undecided) -> now 6 737 (540 / 6 194 / 3): 82 became Không trọn lô, 1 has no exact F4.1 row, 56 have an invalid A.
- Lot evidence from the query window equals evidence from all data: 0 of 574 lots differ.

**56 parcels with an invalid A** (MOC_A_KHONG_HOP_LE; 0.72 % of failed): 29 with A < T, 27 with A > E; all have exactly one F4.1 row for the exact key and no other row; kept as designed (flag, stop at T-A, "chưa đủ căn cứ"). Detail: `dieu_tra_56_BG_moc_A_khong_hop_le.csv` (`4ea4d60f49dd151d`). Section 4 already covers them; no PO decision is required.

**Review M1 fix** re-measured: the cause, status, step, flags and hints of every one of the 7 738 failed parcels are identical before and after.

**Tests.** `node --experimental-sqlite --test` on `tctIntervals`, `CauseClassifier`, `JourneyService`, `f13v2Units`, `f13v2Routes.scope`: 124 pass, 0 fail. The 43 design-prototype cases are in `tctIntervals.test.js` (N1-N20, B1-B7, L1-L5) and `CauseClassifier.test.js` (C1-C11); the prototype file itself was never in the repository, the expected values are those derived by hand from this manifest.

**Residuals.**
- The Hành trình page shows a different Không trọn lô number (Thuận Hóa 223 -> 273) and the weekly report of week 43 still says 223: PO UI check.
- `moc_thoi_gian.py` and `nguyen_nhan_chu_quan.py` of the weekly-report skill still use raw hours (next ticket, before week 44); the screens "Vì sao?", route / postman totals and narrative sentences are not part of this ticket.
- Real-data cases are checked by a read-only script, not by an automatic test (the database is 4 GB).

## 12. Closure (2026-11-05)

- **PO UI PASS** given in chat on 2026-11-05 ("PASS, đóng ticket") after the backend restart on commit `c8b24977` (no import or backfill was active; supervisor restart, 5 sessions restored).
- The page offers one day at a time, so on the PO's request Claude Code (Opus) checked the seven days for the PO with the code the backend serves, against HEAD `1885c303`, BCVH Thuận Hóa, read-only: Không trọn lô per day 22/10 27 -> 59, 23/10 8 -> 13, 24/10 20 -> 21, 25/10 0 -> 0, 26/10 5 -> 11, 27/10 43 -> 48, 28/10 120 -> 121; week 223 -> 273. Postman name unchanged for all 11 600 parcels.
- Correction to section 11: the displayed arrival milestone (and with it the KTC1 departure) is now empty for 3 of the 11 600 Thuận Hóa parcels (EJ542219135VN, CG375903988VN, CH372052938VN) because the old code took an F4.1 row of another day or BCVH; this follows the approved exact key (P1).
- Follow-ups (not in this ticket): the weekly-report scripts move to the system numbers before week 44; a week view on the redesigned page.
