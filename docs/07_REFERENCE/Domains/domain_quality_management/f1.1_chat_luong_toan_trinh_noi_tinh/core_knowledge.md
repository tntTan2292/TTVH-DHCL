---
title: Core Knowledge
purpose: Chỉ dẫn định hướng nhanh về chỉ tiêu F1.1 — là gì, khác F1.3/F4.1 ra sao, phạm vi module
owner: Product Owner
ssot: True
dependencies: None
version: 1.0.0
---

# Core Knowledge

Provenance: Phase 0 of `F11-MODULE-PLAN` (`F11-PHASE-0`, PO-authorized 2026-10-09). It encodes only what the Product Owner decided (`PD-6..PD-15`, `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md` Section 3) and what the audited source files prove. Nothing is inferred beyond that.

## 1. What F1.1 Is

F1.1 — **Chất lượng toàn trình bưu gửi nội tỉnh** — measures a parcel **end to end inside the province**: the clock starts at **`Nhận tin/Thu gom`, or `Chấp nhận` when there is no thu gom time**, and stops at **`Phát thành công`, or `Nộp tiền` for parcels that have a payment time** (PD-7). It therefore covers the accepting office, the transport/exploitation hops and the delivery BCVH — unlike F1.3 and F4.1, which measure only the delivery leg.

The evaluated metric is the source column **`Đánh giá 2026`** ("KPI theo chỉ tiêu phường xã": the allowed time is 12, 15, 24 or 27 hours depending on the delivery ward) (PD-6). `Đánh giá 2025` (≤ 24 h) is stored but is not the metric.

## 2. How F1.1 Differs From F1.3 And F4.1

| Aspect | F1.3 | F4.1 | **F1.1** |
| --- | --- | --- | --- |
| What is measured | delivery leg, liên tỉnh | delivery success at the post office | **whole path, nội tỉnh** |
| Metric column | `danh_gia_2026` | `Đánh giá (thời gian Có TMS PTC 8 giờ)` | **`danh_gia_2026` (toàn trình)** |
| Rate denominator | `sl_bg_ptc` | total rows | **total rows** (blank = 0 Đạt, as F4.1) |
| Units ranked | 6 canonical BCVH (delivery) | same | **same (delivery BCVH)** |
| Extra view | — | — | **pair table: accepting office → delivering BCVH** (day / week / month) |
| Route in the source | yes | no | **yes (not used in the first ticket)** |
| Evidence | yes | planned | **yes, stage-aware; PO training after Dashboard** |

## 3. Scope (PD-8, PD-13, PD-15)

- **Operation Dashboard** and **BCVH Ranking** for the six canonical BCVH, same layout and weeks (Thursday–Wednesday, ISO number of the Thursday) and colour rules as F1.3 (PD-14).
- **Pair table** "Chấp nhận tại bưu cục nào → phát tại BCVH nào" for day, week and month, all accepting offices shown; the screen is designed by Antigravity.
- **Evidence** for Huế, built after the Dashboard; the violation stages are defined by the Product Owner in training sessions.
- **No ranking by accepting office** (PD-15).
- "Vị thứ toàn quốc x/34" is shown as in F1.3.

## 4. Lanes

| Lane | Source | Grain | Target table |
| --- | --- | --- | --- |
| HUE | `…_noi_tinh_chi_tiet` | one row per `Số hiệu bưu gửi` | `fact_f11` |
| TCT | `…_noi_tinh` (national) | (tỉnh chấp nhận × tỉnh phát) | `fact_f11_national` (Phase 4) |

Analysis date = date in the file name `F1.1-YYYY.MM.DD.xlsx`, as F1.3 (PD-10). Daily notices follow the N-1 rule.
