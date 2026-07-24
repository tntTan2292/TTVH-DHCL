# AUTO-IMPORT-004 PO Acceptance

- Ticket: `AUTO-IMPORT-004 TCT Source Discovery and Nationwide Ranking Contract`
- Final Status: `COMPLETED / PO PASS`
- PO acceptance date: `2026-07-20`
- Branch at closure: `codex/auto-import-004`

## Accepted Result

Product Owner accepted the controlled TCT F1.3 nationwide-ranking evidence for business date `2026-07-19`.

Accepted operational evidence:

| Evidence Item | Accepted Result |
| --- | --- |
| Ranked population | `34` provinces/cities according to SSOT |
| Excluded source rows | Workbook formula/index row `2`; `01 - Tổng công ty EMS`; `15 - Bưu điện Trung tâm Long Biên` |
| Hue volume | `2,399` |
| Hue pass | `1,261` |
| Hue KPI | `52.56%` |
| Hue nationwide rank | `24/34` |
| TCT workbook lifecycle | Downloaded, imported, temporary workbook deleted, deletion verified |
| Dashboard result | Accepted by Product Owner |

## Accepted Contract

- Source: DKCL TCT F1.3 `GR = Tỉnh`.
- Business date: `2026-07-19`.
- Destination: existing `fact_f13_national` contract.
- Ranking metric: `tl_ptc_dung_qd_ct`.
- Ranking direction: descending.
- Tie-breaker: `sl_bg_ptc` descending.
- Tie behavior: no shared-tie grouping.
- Ranked population: exactly the SSOT-approved `34` province/city codes.
- Source workbook does not provide explicit rank or total-ranked-unit columns; the accepted Dashboard contract calculates rank from imported national rows.

## Closure Boundary

AUTO-IMPORT-004 closes the TCT source discovery, nationwide-ranking contract, and controlled one-date import evidence. It does not implement unattended scheduling, broad TCT manual backfill UI, credential storage, automatic login, new ranking rules, KPI formula changes, Dashboard UI changes, schema changes, or AUTO-IMPORT-002/003 behavior changes.
