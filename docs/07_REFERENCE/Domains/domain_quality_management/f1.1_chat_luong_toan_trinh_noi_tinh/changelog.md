---
title: Changelog
purpose: Lịch sử phiên bản của gói tài liệu SSOT F1.1
owner: All
ssot: True
dependencies: None
version: 1.0.0
---

# Changelog

## v1.0.3 - 2026-10-10

- Status `Active`: screens delivered (`F11-DASHBOARD-UI-01`) — Operation Dashboard and BCVH Ranking in the F4.1 pattern with F1.3 colours and Thursday–Wednesday weeks, "Vị thứ toàn quốc x/34" in the KPI card and the day / week / month headers, and the accepting-office × delivering-BCVH table (day / week / month, column "Khác", no rank numbers for accepting offices). Unevaluated parcels count as "Không đạt" everywhere, without a separate note (PO). The 34-province table is not on the F1.1 screens (PO: it goes to the Home page later; the server endpoint is kept). The operations table now follows the Dashboard date filter for F1.3, F4.1 and F1.1, and every report block has a camera button (one click copies the picture; HTTPS on the LAN, `QIS-HTTPS-LAN-01`).

## v1.0.2 - 2026-10-10

- F11-PHASE-3: automatic download verified against the real portal for 2026-10-07 (both lanes, DRY) and enabled in code (`ACTIVE`, lanes `AUTOMATED`). The portal revises past days (07/10: 2 Huế parcels dropped, TCT counts moved after 3 days), so Auto Backfill also re-imports the last 3 completed days on each unscoped run (`refreshWindowDays: 3`). TCT completion policy keyed on (accepting province, delivering province) with all 34 ranked provinces required.

## v1.0.1 - 2026-10-09

- F11-PHASE-1/2/4 implemented: `fact_f11` and `fact_f11_national` exist; Huế and TCT reference files of 2026-10-07 loaded (2.621 rows / 89,58 %; 84 rows, Huế 4th of 34 at 90,7 %). National rank by delivering province (PD-17) is implemented; the reference TCT file is the single-day export kept at `Data DKCL/F1.1/Processed/TCT/F1.1-2026.10.07.xlsx`.
- Status remains `Planned` until the Dashboard ticket delivers screens.

## v1.0.0 - 2026-10-09

- Created by `F11-PHASE-0` from `F11-MODULE-PLAN` (PO decisions PD-6..PD-15 and the national rank answer of 2026-10-09). Baseline: `2026-10-07`, `2.348 / 2.621 = 89,58 %`.
- Status `Planned`: no table, parser or screen existed when this package was written.
