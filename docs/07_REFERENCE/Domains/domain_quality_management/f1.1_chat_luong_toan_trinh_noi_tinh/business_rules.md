---
title: Business Rules
purpose: Toàn bộ quyết định Product Owner đã khóa cho F1.1, nguyên văn, không suy diễn thêm
owner: Product Owner
ssot: True
dependencies: data_blueprint.md
version: 1.0.0
---

# Business Rules

Every rule is a locked Product Owner decision (`F11-MODULE-PLAN_CHECKPOINT_001.md` Section 3). Nothing here extends or infers beyond it. Items still open are listed in §12.

## 1. Metric (PD-6)

`Đánh giá 2026` is the F1.1 metric.

## 2. Toàn trình clock (PD-7)

Measured from `Nhận tin/Thu gom`, or `Chấp nhận`, to `Phát thành công`, or `Nộp tiền` for parcels with a payment time. The system **stores and shows the source's own `Thời gian thực tế` and evaluation and never recomputes them** (the source applies a night deduction whose rule is DKCL's, see `rca_ai_context.md` §3).

## 3. Rate and denominator (PD-9)

`rate = COUNT(danh_gia_2026 = 'Đạt') / COUNT(*)`. A row with a blank `Đánh giá 2026` stays in the denominator and counts as **0 Đạt**, as F4.1. Blank rows are **flagged separately** ("Chưa có đánh giá") with a derived reason (`measurement.md` §5) so the PO can analyse them later; the rate never depends on that reason.

## 4. Analysis date (PD-10)

From the file name, as F1.3; daily notice N-1.

## 5. Ranking units (PD-11)

Delivery unit (`Mã BC phát`), the six canonical BCVH (reuse `backend/src/config/canonicalBcvhUnits.js`). `531110` (Trung tâm Hành chính công) and `531120` (Khách hàng lớn) are stored, counted in the module total, and hidden from the ranking. The module total and the six-unit total are two correct, different figures and are labelled distinctly (`measurement.md` §2).

## 6. Two views (PD-8, PD-13)

(1) Operation table by delivery BCVH, same blocks as F1.3/F4.1. (2) Pair table accepting office → delivering BCVH for day, week and month, all offices derived from the data, interface by Antigravity.

## 7. No accepting-office ranking (PD-15)

## 8. Source of truth (PD-12)

The HUE **detail** file is the source. The PO's Excel working file `Đánh giá CLP F1.1.xlsx` (built from the summary download) is not a reconciliation source.

## 9. Colour bands and weeks (PD-14)

Colour bands and chart target as F1.3. Weeks run Thursday–Wednesday, numbered by the ISO week of that week's Thursday, as F1.3.

## 10. National rank (PD-16)

"Vị thứ toàn quốc x/34" is shown as in F1.3, ranked **by delivering province**: all rows of a province are added (numerator and denominator) before the rate is computed and ranked (PD-17). The rank uses the **published** national rate and is labelled as such; it never replaces the Huế figure.

## 11. Evidence (PD-5)

Built after the Dashboard. Violation stages and owners are defined by the PO in training; until then the system lists facts only (`measurement.md` §6).

## 12. Open items (not decided)

Tuyến Ranking for F1.1; whether `Đánh giá 2025` is shown as a secondary series; the date window of the TCT download (Q-15); the retired-office mapping for history (Q-9); backfill depth (Q-10); the elapsed-time night-deduction rule (Q-11); daily "Nguyên nhân / Công tác điều hành" notes (Q-12).
