# DOCUMENTATION MIGRATION PLAN

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Migration Principles](#2-migration-principles)
- [3. Target Folder Map](#3-target-folder-map)
- [4. File Classification](#4-file-classification)
- [5. Migration Waves](#5-migration-waves)
- [6. Reference Update Strategy](#6-reference-update-strategy)
- [7. Risk Mitigation](#7-risk-mitigation)
- [8. Approval Gates](#8-approval-gates)
- [9. Execution Rules](#9-execution-rules)
- [10. Post-Migration Validation](#10-post-migration-validation)

## 1. Purpose

- Migration objective: reorganize documentation into the architecture proposed in `DOCUMENTATION_ARCHITECTURE.md` without changing any existing file in this ticket.
- Migration scope: documentation only; no code, no SSOT/business changes, and no direct filesystem moves, renames, deletes, or archive actions in this phase.

## 2. Migration Principles

- Archive instead of delete
- No broken links
- Authority-first
- Backward compatibility
- One commit per migration wave

## 3. Target Folder Map

| Current / Logical Group | Proposed Target Folder | Notes |
| --- | --- | --- |
| Governance / handover / control files | `docs/01_GOVERNANCE/` + stable root entry points | Design target only; keep current entry points stable during transition |
| Core state files | root/core | `PROJECT_STATUS.md`, `PROJECT_PROGRESS.md`, `PROJECT_SSOT.md` remain canonical |
| Architecture docs | `docs/02_ARCHITECTURE/` | Group by center/domain |
| UX docs | `docs/03_UX/` | Global and center UX docs |
| Technical planning docs | `docs/04_TECHNICAL_PLANNING/` | Release / Epic / Feature / Backlog / Implementation |
| Development docs | `docs/05_DEVELOPMENT/` | Tickets and runtime evidence |
| Review docs | `docs/06_REVIEWS/` | Freeze and review results |
| Reference docs | `docs/07_REFERENCE/` | Supporting reference material |
| Legacy docs | `archive/` | Historical content retained for traceability |

## 4. File Classification

| File Name | Current Path | Category | Status | Authority Level | Recommendation | Target |
| --- | --- | --- | --- | --- | --- | --- |
| `PROJECT_CONTEXT.md` | `docs/08_ARCHIVE/Legacy/00_README/PROJECT_CONTEXT.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `readme.md` | `docs/08_ARCHIVE/Legacy/00_README/readme.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `ARCH-001.md` | `docs/08_ARCHIVE/Legacy/01_RULES/ARCH-001.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `constitution.md` | `docs/08_ARCHIVE/Legacy/01_RULES/constitution.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `governance_rules.md` | `docs/08_ARCHIVE/Legacy/01_RULES/governance_rules.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `tech_architecture_rules.md` | `docs/08_ARCHIVE/Legacy/01_RULES/tech_architecture_rules.md` | `REVIEW` | `Legacy` | `L3` | `REVIEW` | `docs/07_REFERENCE/` |
| `ui_ux_guidelines.md` | `docs/08_ARCHIVE/Legacy/01_RULES/ui_ux_guidelines.md` | `REVIEW` | `Legacy` | `L3` | `REVIEW` | `docs/07_REFERENCE/` |
| `ai_architecture_map.md` | `docs/08_ARCHIVE/Legacy/02_AI_CONTEXT/ai_architecture_map.md` | `REVIEW` | `Legacy` | `L3` | `REVIEW` | `docs/07_REFERENCE/` |
| `system_prompt.md` | `docs/08_ARCHIVE/Legacy/02_AI_CONTEXT/system_prompt.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `business_dictionary.md` | `docs/07_REFERENCE/Shared_Business/business_dictionary.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `global_kpi_framework.md` | `docs/07_REFERENCE/Shared_Business/global_kpi_framework.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `global_notification.md` | `docs/07_REFERENCE/Shared_Business/global_notification.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `import_center_rules.md` | `docs/07_REFERENCE/Shared_Business/import_center_rules.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `business_rules.md` | `docs/07_REFERENCE/Domains/_template_indicator/business_rules.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `changelog.md` | `docs/07_REFERENCE/Domains/_template_indicator/changelog.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `core_knowledge.md` | `docs/07_REFERENCE/Domains/_template_indicator/core_knowledge.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `data_blueprint.md` | `docs/07_REFERENCE/Domains/_template_indicator/data_blueprint.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `measurement.md` | `docs/07_REFERENCE/Domains/_template_indicator/measurement.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `rca_ai_context.md` | `docs/07_REFERENCE/Domains/_template_indicator/rca_ai_context.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `testing_scenarios.md` | `docs/07_REFERENCE/Domains/_template_indicator/testing_scenarios.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `acceptance_criteria.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/acceptance_criteria.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `analytical_patterns.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/analytical_patterns.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `business_glossary.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_glossary.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `business_rules.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_rules.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `changelog.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/changelog.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `core_knowledge.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/core_knowledge.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `data_blueprint.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/data_blueprint.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `executive_decision_guide.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/executive_decision_guide.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `executive_scenarios.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/executive_scenarios.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `faq_troubleshooting.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/faq_troubleshooting.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `measurement.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/measurement.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `rca_ai_context.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/rca_ai_context.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `testing_scenarios.md` | `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/testing_scenarios.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `api_contracts.md` | `docs/05_DEVELOPMENT/Implementation/api_contracts.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `database_schema.md` | `docs/05_DEVELOPMENT/Implementation/database_schema.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `deployment_infrastructure.md` | `docs/05_DEVELOPMENT/Implementation/deployment_infrastructure.md` | `REVIEW` | `Legacy` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `f1.3_technical_design_v1.0.md` | `docs/05_DEVELOPMENT/Implementation/f1.3_technical_design_v1.0.md` | `ARCHIVE` | `Legacy` | `L4` | `ARCHIVE` | `archive/` |
| `ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ACTION_CENTER_SCREEN_ARCHITECTURE.md` | `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ACTION_CENTER_UX_ARCHITECTURE.md` | `docs/ACTION_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ACTION_CENTER_WIDGET_SPECIFICATION.md` | `docs/ACTION_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `Frozen` | `L4` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `AI_COLLABORATION_PROTOCOL.md` | `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `API_DESIGN_v1.0.md` | `docs/API_DESIGN_v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `ARCHITECTURE_CONSISTENCY_REVIEW.md` | `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/06_REVIEWS/` |
| `bcvh_operation_table_spec.md` | `docs/bcvh_operation_table_spec.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `BCVH_PERFORMANCE_CENTER_REVIEW.md` | `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `Frozen` | `L4` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `Constitution v1.0.md` | `docs/Constitution v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/` |
| `DASHBOARD_DESIGN_v1.0.md` | `docs/DASHBOARD_DESIGN_v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `DASHBOARD_FOUNDATION_REVIEW.md` | `docs/DASHBOARD_FOUNDATION_REVIEW.md` | `REVIEW` | `Unknown` | `L3` | `REVIEW` | `docs/06_REVIEWS/` |
| `DATABASE_DESIGN_v1.0.md` | `docs/DATABASE_DESIGN_v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `DEVELOPMENT_ARCHITECTURE_v1.0.md` | `docs/DEVELOPMENT_ARCHITECTURE_v1.0.md` | `ARCHIVE` | `Unknown` | `L3` | `ARCHIVE` | `archive/` |
| `DEVELOPMENT_BACKLOG.md` | `docs/DEVELOPMENT_BACKLOG.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/04_TECHNICAL_PLANNING/` |
| `DOCUMENT_GOVERNANCE.md` | `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | `KEEP` | `Active` | `L1` | `KEEP` | `KEEP` |
| `DOCUMENT_INDEX.md` | `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `DOCUMENT_LIFECYCLE.md` | `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `DOCUMENT_UPDATE_MATRIX.md` | `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `DOCUMENTATION_ARCHITECTURE.md` | `docs/09_REPORTS/Documentation/DOCUMENTATION_ARCHITECTURE.md` | `KEEP` | `Frozen` | `L3` | `KEEP` | `KEEP` |
| `DOCUMENTATION_AUDIT_REPORT.md` | `docs/09_REPORTS/Documentation/DOCUMENTATION_AUDIT_REPORT.md` | `KEEP` | `Frozen` | `L4` | `KEEP` | `KEEP` |
| `ENVIRONMENT_ISOLATION_PLAN.md` | `docs/ENVIRONMENT_ISOLATION_PLAN.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `EPIC_PLANNING.md` | `docs/EPIC_PLANNING.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/04_TECHNICAL_PLANNING/` |
| `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `EVIDENCE_CENTER_UX_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `Frozen` | `L4` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `F1.3 DATA DICTIONARY v1.0.md` | `docs/08_ARCHIVE/Legacy/F1.3/F1.3 DATA DICTIONARY v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `F1.3 MODULE SPECIFICATION v1.0.md` | `docs/08_ARCHIVE/Legacy/F1.3/F1.3 MODULE SPECIFICATION v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `F13_303_DEFINITION.md` | `docs/08_ARCHIVE/Legacy/F1.3/F13_303_DEFINITION.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `FEATURE_PLANNING.md` | `docs/FEATURE_PLANNING.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/04_TECHNICAL_PLANNING/` |
| `FOLDER_DATA_STANDARD v1.0.md` | `docs/FOLDER_DATA_STANDARD v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `GAP_ANALYSIS_ADDENDUM_v1.0.md` | `docs/GAP_ANALYSIS_ADDENDUM_v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `GAP_ANALYSIS_v1.0.md` | `docs/GAP_ANALYSIS_v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `IMPLEMENTATION_ARCHITECTURE.md` | `docs/IMPLEMENTATION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L2` | `MOVE` | `docs/04_TECHNICAL_PLANNING/` |
| `MASTER_START_PROMPT.md` | `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `operation_center_spec.md` | `docs/operation_center_spec.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `PROJECT_CONTEXT.md` | `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `PROJECT_DECISIONS.md` | `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | `KEEP` | `Active` | `L1` | `KEEP` | `KEEP` |
| `PROJECT_HANDOVER.md` | `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `PROJECT_SSOT.md` | `docs/PROJECT_SSOT.md` | `KEEP` | `Frozen` | `L1` | `KEEP` | `KEEP` |
| `QIS_DESIGN_SYSTEM.md` | `docs/QIS_DESIGN_SYSTEM.md` | `MOVE` | `Frozen` | `L4` | `MOVE` | `docs/03_UX/` |
| `QIS_UX_DESIGN_PRINCIPLES.md` | `docs/QIS_UX_DESIGN_PRINCIPLES.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/03_UX/` |
| `QIS_V2_ARCHITECTURE.md` | `docs/QIS_V2_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L2` | `MOVE` | `docs/02_ARCHITECTURE/` |
| `quality_timeline_spec.md` | `docs/quality_timeline_spec.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `RELEASE_PLANNING.md` | `docs/RELEASE_PLANNING.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/04_TECHNICAL_PLANNING/` |
| `RESEARCH_BASELINE_v1.0.md` | `docs/RESEARCH_BASELINE_v1.0.md` | `ARCHIVE` | `Unknown` | `L4` | `ARCHIVE` | `archive/` |
| `ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ROUTE_PERFORMANCE_CENTER_REVIEW.md` | `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `Frozen` | `L4` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `rule_recommendation_spec.md` | `docs/rule_recommendation_spec.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `Frozen` | `L4` | `MOVE` | `docs/02_ARCHITECTURE/<CENTER> or docs/03_UX/<CENTER>` |
| `UI_ARCHITECTURE_PLAN.md` | `docs/09_REPORTS/Documentation/UI_ARCHITECTURE_PLAN.md` | `REVIEW` | `Unknown` | `L3` | `REVIEW` | `docs/07_REFERENCE/` |
| `UX_CONSISTENCY_REVIEW.md` | `docs/UX_CONSISTENCY_REVIEW.md` | `MOVE` | `Frozen` | `L3` | `MOVE` | `docs/03_UX/` |
| `README.md` | `frontend/README.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `PROJECT_PROGRESS.md` | `PROJECT_PROGRESS.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `PROJECT_STATUS.md` | `PROJECT_STATUS.md` | `KEEP` | `Active` | `L2` | `KEEP` | `KEEP` |
| `README.md` | `README.md` | `REVIEW` | `Unknown` | `L4` | `REVIEW` | `docs/07_REFERENCE/` |
| `README_AI.md` | `README_AI.md` | `KEEP` | `Active` | `L4` | `KEEP` | `KEEP` |

## 5. Migration Waves

- Wave 1: Governance/Core
  - Scope: root control docs, SSOT, decisions, governance, index, lifecycle, update matrix, handover, context, AI protocol, master start prompt.
  - Goal: stabilize the control plane before any folder migration.
- Wave 2: Architecture
  - Scope: system architecture, cross-center architecture, center IA/screen architecture.
- Wave 3: UX
  - Scope: global UX principles, design system, center UX docs.
- Wave 4: Planning
  - Scope: implementation architecture, release/epic/feature/backlog.
- Wave 5: Legacy archive
  - Scope: legacy packs under versioned folders and historical references.

## 6. Reference Update Strategy

- Update links only after a migration wave is approved and executed.
- Update files that contain hardcoded references to moved documents.
- Update `README_AI.md` and `MASTER_START_PROMPT.md` only when the reading order or entry point changes are approved.
- Keep `DOCUMENT_INDEX.md` as the authoritative inventory during the transition.

## 7. Risk Mitigation

- Broken links: stage migration and validate links before closing each wave.
- Authority conflict: resolve by L1 -> L2 -> L3 -> L4 and lifecycle priority.
- Onboarding drift: keep entry points stable until the new structure is fully adopted.
- Hidden dependency: require dependency scan before any move wave.

## 8. Approval Gates

- Product Owner review
- Freeze before move
- Move after approval
- Post-move validation

## 9. Execution Rules

- Do not move anything before approval.
- Do not delete anything if it still has references.
- Do not rename unless the reason is explicit and approved.
- Prefer archive over delete.
- Each wave should be one commit only.

## 10. Post-Migration Validation

- Verify all links
- Verify `README_AI.md`
- Verify `MASTER_START_PROMPT.md`
- Verify `DOCUMENT_INDEX.md`
- Verify `PROJECT_HANDOVER.md`
- Verify `PROJECT_CONTEXT.md`