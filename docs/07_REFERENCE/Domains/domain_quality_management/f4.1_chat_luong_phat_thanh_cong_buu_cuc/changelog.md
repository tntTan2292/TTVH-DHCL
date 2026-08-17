---
title: Changelog
purpose: Lịch sử phiên bản của gói tài liệu SSOT F4.1
owner: All
ssot: True
dependencies: None
version: 1.0.0
---

# Changelog

## v1.0.0 — 2026-08-17

Initial creation. Ticket `F41-PHASE-0`, PO-authorized ("PO APPROVES F41-MODULE-PLAN Gate 0 và cho phép thực hiện F41-PHASE-0"), continued from authoritative `HEAD 94b32885`. Documentation only — no product code, database, or Import was implemented by this phase.

Instantiated from `docs/07_REFERENCE/Domains/_template_indicator/` and populated to encode the full plan locked in `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md`:

- `data_blueprint.md`: 42-column HUE row-level contract and 38-column TCT aggregate contract, both from read-only source-file inventory (no Import run, both checksums re-verified unchanged).
- `business_rules.md`: all 10 locked Product Owner decisions (`PO-1`..`PO-10`) plus the TCT ingest rules and the open, non-blocking `Q-6`.
- `measurement.md`: `F4_001` module KPI (total-rows denominator), `F4_002` BCVH Ranking subtotal, `F4_003` TCT reference rate, the full `2026-08-01` per-BCVH reconciliation baseline, and the corrected 251-row blank-evaluation breakdown.
- `testing_scenarios.md`: test scenarios for both lanes, the KPI-denominator regression, `531120` handling, and cross-lane reconciliation.
- `rca_ai_context.md`: guardrails against the specific inference mistakes found and corrected during planning (denominator reuse, blank-row over-generalization, TCT-rate substitution, route-dimension assumption, portal-name derivation).
- `core_knowledge.md`: orientation and reading order.

Not created in this version, and not part of the template skeleton this package mirrors: `acceptance_criteria.md`, `analytical_patterns.md`, `business_glossary.md`, `executive_decision_guide.md`, `executive_scenarios.md`, `faq_troubleshooting.md`. F1.3's package has these because F1.3 is an active, implemented module; F4.1 is not yet implemented, so they are deferred to the phase that first needs them.
