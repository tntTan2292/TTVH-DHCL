---
title: Core Knowledge
purpose: Chỉ dẫn định hướng nhanh về chỉ tiêu F4.1 — là gì, khác F1.3 ra sao, phạm vi module
owner: Product Owner
ssot: True
dependencies: None
version: 1.0.0
---

# Core Knowledge

Provenance: this package is Phase 0 of `F41-MODULE-PLAN` (`F41-PHASE-0`, PO-authorized `2026-08-17`), encoding the plan locked in `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` at authoritative `HEAD 94b32885`. It is a reference/SSOT package only — no product code, database, or Import exists for F4.1 yet.

## 1. What F4.1 Is

`F4.1` is the DKCL report **`F4.1_Chất lượng phát thành công của bưu cục`** — quality of successful delivery at the post office. It is a distinct indicator from `F1.3` (`F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI`, "chất lượng phát bưu gửi liên tỉnh"), with its own daily source file, its own evaluation column, and its own authoritative result. The two indicators are not variants of one formula — they measure different things and must never be presented as if one derives the other.

## 2. Two Lanes, Two Shapes

F4.1 ships as two structurally different source files, both named `F4.1-YYYY.MM.DD.xlsx`:

- **HUE lane** — row-level, one row per shipment (`Số hiệu bưu gửi`), 42 columns. This is the module's authoritative, PO-locked data source. See `data_blueprint.md` §1.
- **TCT lane** — aggregate, one row per reporting unit (province/organisational unit), 38 columns, plus a grand-total row. This is a published national report, not shipment detail. See `data_blueprint.md` §2.

The two lanes were cross-checked against each other on the one day both exist for (`2026-08-01`): every evaluation *count* they publish for Huế matches exactly, but their *denominators* differ (`4.695` HUE vs `4.684` TCT), so their published rates differ (`60,98%` vs `61,12%`). This is not a defect in either file — it is recorded, unresolved, and non-blocking (`Q-6` in `business_rules.md` §7). Never treat one lane's rate as a correction of the other's.

## 3. Module Scope

Per Product Owner decision (`business_rules.md` §1, PO-4): `Dashboard`, `BCVH Ranking`, `Evidence`. **No `Tuyến Ranking`** — the HUE source has no route column at all, so this is data-enforced, not a preference. Evidence is HUE-only, because the TCT lane has no per-shipment rows and no `Đạt`/`Không đạt` field to drill into.

## 4. Relationship To F1.3

F4.1 reuses F1.3's proven patterns wherever the data genuinely supports it, and diverges explicitly wherever it does not:

| Reused from F1.3 as-is | Diverges from F1.3 |
| --- | --- |
| Filename-derived analysis date (`data_blueprint.md` §3) | KPI denominator — total rows, not `sl_bg_ptc` (`measurement.md` §1) |
| `dd/MM/yyyy HH:mm:ss` timestamp parsing | `531120` dual treatment — counted in module total, hidden from BCVH Ranking (`business_rules.md` §2) |
| Delayed-cash 3-way reason classification (`business_rules.md` §5) | No route dimension at all |
| Canonical 6-BCVH list (already matches F4.1 exactly) | TCT lane is aggregate, F1.3's TCT lane (`fact_f13_national`) is also aggregate but at province-only grain, not organisational-unit grain |

F4.1 is implemented as a **parallel** data path, not a parameterization of F1.3. F1.3 code, schema, and data are never edited to build F4.1. See `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` Section 5 (`D-1`) for the full architectural reasoning.

## 5. Reading Order For This Package

1. `data_blueprint.md` — the two source-file contracts and the target table shapes.
2. `business_rules.md` — every locked Product Owner decision, in force.
3. `measurement.md` — the KPI formula and the reconciliation baseline it must reproduce.
4. `testing_scenarios.md` — the test cases a future implementation must pass.
5. `rca_ai_context.md` — guardrails against the specific inference mistakes already found and corrected during planning.
6. `changelog.md` — version history of this package.

## 6. Authority

This package documents an **approved plan**, not yet implemented. Its content is source-locked to `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` and `docs/10_TICKETS/F41-PHASE-0_MANIFEST.md`. If any future implementation phase finds a genuine conflict between this package and the real source files, the real files and a fresh Product Owner decision win — this package must then be corrected, not defended.
