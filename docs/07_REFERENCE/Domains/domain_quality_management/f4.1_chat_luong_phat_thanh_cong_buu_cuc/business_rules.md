---
title: Business Rules
purpose: Toàn bộ quyết định Product Owner đã khóa cho F4.1, nguyên văn, không suy diễn thêm
owner: Product Owner
ssot: True
dependencies: data_blueprint.md
version: 1.0.0
---

# Business Rules

Every rule below is a locked Product Owner decision (`docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` Sections 3 and 17). Nothing here extends or infers beyond what was decided. Where F4.1 deliberately diverges from F1.3, the divergence is stated explicitly — never silently.

## 1. Evaluation Metric (PO-1)

F4.1's module KPI uses the source column **`Đánh giá (thời gian Có TMS PTC 8 giờ)`** (`data_blueprint.md` §1.1, field `danh_gia_co_tms_ptc_8h`) as its evaluation metric. The other 5 `Đánh giá (…)` columns in the HUE file are persisted but are not used by any KPI in this scope.

## 2. Authoritative Result And Denominator (PO-2)

Authoritative result: **`2.863 / 4.695 = 60,98%`**. **All `4.695` rows belong to the denominator** — including the `251` rows where the evaluation column is blank (see §6).

**Locked divergence from F1.3**: F1.3's BCVH Ranking rate divides by `sl_bg_ptc` (only rows that have a PTC event). Applying that same formula to F4.1 would give `2.863 / 4.453 = 64,29%`, which contradicts this decision. **F4.1's KPI denominator is total rows, full stop — never `sl_bg_ptc`, never "rows with an evaluation", never any other subset.** See `measurement.md` §1.

## 3. Analysis Date (PO-3)

The analysis date (`ngày phân tích`) is taken from the file name, exactly as F1.3 does. See `data_blueprint.md` §3. Applies identically to both the HUE and TCT lanes.

## 4. Module Scope (PO-4)

Screens: **`Dashboard`**, **`BCVH Ranking`**, **`Evidence`**. **No `Tuyến Ranking`.** The HUE source has no route column of any kind (`data_blueprint.md` §1.1) — this exclusion is data-enforced, not merely a Product Owner preference, and no future data source is assumed to add one.

## 5. Chậm Nộp Tiền / Acceptance (PO-5)

`Chậm nộp tiền` handling and acceptance follow F1.3 **unchanged**. Concretely, this means F4.1 reuses F1.3's existing 3-way `Không đạt` reason classification — `Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` — driven by the same `>3h` gap rule (`RULE_F13_302`) applied to `thoi_gian_ptc` and `thoi_gian_nop_tien`, with the same "insufficient data" fallback when either timestamp is missing or unparseable. The only substitution is the evaluation-column name (F4.1's `danh_gia_co_tms_ptc_8h` in place of F1.3's `danh_gia_2026`). **Nothing further is to be inferred** — no new reason category, no new threshold, no F4.1-specific exception.

This classification applies to the **HUE lane only**. The TCT lane has no per-shipment rows and no `Đạt`/`Không đạt` field to classify (`data_blueprint.md` §2.4) — Evidence and reason classification are structurally HUE-only, not a scoping choice.

## 6. `531120` Dual Treatment (PO-6)

`531120` (`Khách hàng lớn`) is:

- **Still stored** — every row for `531120` is persisted like any other row.
- **Still counted in the module total** — the Dashboard/module-level KPI is computed over all `4.695` rows, `531120` included (§2).
- **Hidden from BCVH Ranking** — the six-row BCVH Ranking table excludes `531120`, by reusing the existing frozen canonical 6-unit list (`backend/src/config/canonicalBcvhUnits.js`), which already contains exactly the 6 real BCVH found in the F4.1 file and nothing else. No new exclusion rule and no `531120` literal is introduced in code.

**Consequence, stated explicitly so it is never mistaken for an error**: the module KPI (`2.863/4.695 = 60,98%`) and the sum of the six visible BCVH Ranking rows (`2.862/4.694 = 60,97%`) are two different, both-correct numbers that must always carry distinct labels wherever both can appear on the same screen. See `measurement.md` §2.

## 7. Multi-Indicator Import — Huế And TCT (PO-7)

Import direction is multi-indicator, supporting both Huế and TCT. The two lanes have fundamentally different grain (`data_blueprint.md` §1 vs §2) and therefore different target tables, different parsers, and different ingest rules (TCT's grand-total row must be skipped, §2.1). Neither lane's Import logic is shared with the other, and neither is shared with F1.3's existing Import pipeline (`backend/src/services/importPipeline.js`), which is hardcoded to the F1.3 path and is never edited to serve F4.1.

## 8. Real TCT Source (PO-8)

A real F4.1 TCT source exists at `Data DKCL/F4.1/Incoming/TCT` (confirmed and audited `2026-08-17`; see `data_blueprint.md` §2). This decision closed the earlier open question of whether a TCT source existed at all.

## 9. Official Report Identity (PO-9)

The official DKCL report/module name for F4.1 is **`F4.1_Chất lượng phát thành công của bưu cục`**, explicitly distinct from F1.3's **`F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI`**. Note for any future portal-sync work: the live F1.3 sync matcher (`dkclHueF13SyncService.js:349`) matches the string `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet`, which is *not* this official F1.3 report name either — so the F4.1 portal export/match string must be **discovered** on the portal when that work begins, never derived from this official name by assumption.

## 10. Role Contract (PO-10)

**`admin` and `viewer`** may view Dashboard, BCVH Ranking and Evidence. **Import remains `admin`-only.** This matches the existing F1.3 gating pattern (`allowViewerRead` vs `allowAdminOnly` in `backend/src/routes/f13Routes.js`) and replaces the `admin`-only placeholder gating currently on `/f41`.

## 11. TCT Lane Ingest Rules (Evidence-Derived, Not A Separate PO Decision — Locked By The Approved Plan)

- The **grand-total row must be skipped on ingest**; it is a verified true sum of the 46 unit rows, and including it would double every national figure (`data_blueprint.md` §2.1).
- The TCT lane lands in its **own additive table** (`fact_f41_national`), never in `fact_f41`, and `fact_f41` never receives a TCT row.
- The TCT lane **produces no Evidence** and **no violation-reason classification** — see §5.
- The **module KPI is always computed from the HUE row-level data** (§2, `measurement.md` §1). Any TCT-derived figure shown anywhere is labelled as the published national report value and is **never substituted for, blended with, or silently reconciled against** the module KPI.

## 12. Open, Non-Blocking Item — `Q-6`

The TCT lane's Huế-row denominator (`4.684`) does not equal the HUE row-level denominator (`4.695`), even though the numerator (`2.863`) is identical on both lanes. The TCT report's adjacent exclusion counters (`SL loại trừ không đo kiểm 15`, `Sản lượng chưa đủ thông tin đo kiểm 248` vs `251` HUE blanks, `SL Chuyển hoàn 230` vs `241` HUE return timestamps) do not reconcile the `11`-row gap under any single stated rule found during planning. **No reconciling arithmetic is asserted anywhere in this package.**

This is **explicitly non-blocking** for every phase of the module plan, because §11's rule already fixes the module's behavior (module KPI is always the HUE computation). It becomes relevant **only** if and when a future screen displays a TCT-derived rate anywhere near the module KPI — at that point, and only then, the exclusion rule the national report applies must be obtained from the Product Owner before that screen ships. Until then, it remains open and unresolved by design, not by oversight.
