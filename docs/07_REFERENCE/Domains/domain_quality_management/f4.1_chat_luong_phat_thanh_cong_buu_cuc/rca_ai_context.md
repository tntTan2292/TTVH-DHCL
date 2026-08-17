---
title: RCA & AI Context
purpose: Rào chắn tránh các lỗi suy diễn cụ thể đã phát hiện và sửa trong quá trình lập kế hoạch F4.1
owner: AI Engineer
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# RCA & AI Context

This document exists because specific inference mistakes were made and corrected during F4.1 planning. Each guardrail below names the mistake it prevents, not just the correct answer.

## 1. Never Reuse F1.3's Denominator For F4.1's KPI

**Mistake this prevents**: applying F1.3's `kpi_2026 = dat_kpi_2026 / sl_bg_ptc` pattern to F4.1 "because it's the same shape of screen". That silently produces `2.863 / 4.453 = 64,29%`, which is wrong and contradicts the Product Owner's locked `60,98%`.

**Rule**: F4.1's module KPI (`F4_001`) always divides by **total rows**. See `measurement.md` §1, `business_rules.md` §2.

## 2. Never Generalize The Blank-Evaluation Rows To "All Returns"

**Mistake this prevents**: an earlier draft of this plan characterized all `251` blank-evaluation rows as "returned / not yet delivered", based on a small sample. A full row-by-row re-audit found this was wrong for `10` of them.

**Rule**: only Group A (`241` rows, `measurement.md` §6) is evidenced as a return, by the presence of `Thời gian chuyển hoàn`. Groups B (`9`) and C (`1`) have **no asserted cause** — do not invent one, even under pressure to produce a tidy 100%-explained breakdown.

## 3. Never Treat The TCT Lane's Rate As A Correction Of The HUE Rate

**Mistake this prevents**: seeing TCT publish `61,12%` for the same day and population as the HUE-derived `60,98%`, and "fixing" one to match the other, or averaging them, or assuming the more official-looking national report must be right.

**Rule**: the module KPI is always the HUE row-level computation (`business_rules.md` §11). The TCT figure is a *different, also-correct, also-published* number with a different denominator, shown only as a labelled reference (`F4_003`), never substituted in. The `11`-row gap between `4.695` and `4.684` is real, evidenced, and **not reconciled** — do not construct an explanation for it. If asked why they differ, say the cause is unknown and point to `business_rules.md` §12 (`Q-6`); do not guess an exclusion rule.

## 4. Never Assume A Route Dimension Will Appear Later

**Mistake this prevents**: treating "no Tuyến Ranking" as a current scope decision that a later data refresh might reverse.

**Rule**: the HUE source has zero route-related columns of any kind. This is a structural property of the file, not a Product Owner preference — do not design a route feature "for later" against F4.1 data.

## 5. Never Derive The Portal Match String From The Official Report Name

**Mistake this prevents**: assuming the official name `F4.1_Chất lượng phát thành công của bưu cục` (PO-9) is the literal string any future portal-sync code should match against.

**Rule**: F1.3's own live sync code matches `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet`, which is demonstrably *not* F1.3's official report name (`F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI`) either. Whatever the actual portal export naming convention is, it must be **discovered by inspecting the portal**, not derived from the official report name by pattern-matching to F1.3's example.

## 6. Never Parameterize F1.3 To Serve F4.1

**Mistake this prevents**: adding an `indicator` parameter to `F13DashboardService`, `FactBuuGuiRepository`, or `excelParser.js` to make them serve both F1.3 and F4.1.

**Rule**: F1.3's evaluation column (`danh_gia_2026`) is hardwired across 20 backend files. That code is closed, PO-passed, and load-bearing for a live module — it is read for pattern reuse, never edited to grow a second indicator. F4.1 gets a parallel data path (`data_blueprint.md` §5) and reuses only genuinely indicator-neutral building blocks (shared layout/filter components, the timestamp parser, the delayed-cash rule engine call).

## 7. Never Show `F4_001` And `F4_002` As One Unlabeled Number

**Mistake this prevents**: a Dashboard or Ranking screen that shows "60,98%" in one place and "60,97%" in another with no explanation, which reads as a rounding bug rather than the two intentionally different, both-correct figures they are.

**Rule**: any screen surfacing both must label which is the module total (all `4.695` rows) and which is the six-BCVH ranking subtotal (`4.694` rows). See `business_rules.md` §6, `measurement.md` §2.

## 8. Never Coerce The Raw Duration Columns

**Mistake this prevents**: parsing `Thời gian … thực hiện …` (columns 30-33) as `HH:mm` and computing arithmetic on them, which breaks silently on unpadded minutes (`46:7`) and hour values ≥ 24 (`107:38`).

**Rule**: store as raw TEXT; do not parse into a duration type in this contract version (`data_blueprint.md` §1.3).

## 9. This Package Documents A Plan, Not A Running System

Every figure, table, and formula in this package was derived by reading the two real source files read-only and reproducing the Product Owner's locked numbers by direct aggregation — no product code executed any of this. If a future implementation phase finds the live data disagrees with this package, the live data and a fresh Product Owner decision win; update this package, do not defend it.
