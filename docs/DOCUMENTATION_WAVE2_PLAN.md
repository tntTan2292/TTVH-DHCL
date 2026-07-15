# DOCUMENTATION WAVE 2 PLAN

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Wave 2 Scope](#2-wave-2-scope)
- [3. Target Areas](#3-target-areas)
- [4. File Classification for Wave 2](#4-file-classification-for-wave-2)
- [5. Wave 2 Rules](#5-wave-2-rules)
- [6. Reference Update Strategy](#6-reference-update-strategy)
- [7. Risk Analysis](#7-risk-analysis)
- [8. Approval Gate](#8-approval-gate)
- [9. Validation Plan](#9-validation-plan)
- [10. Recommendation](#10-recommendation)

## 1. Purpose

- Objective: prepare the next cleanup wave for architecture documents only.
- Scope: define what would be moved in Wave 2, without executing any file operation.
- Intent: preserve governance/core stability established in Wave 1 while organizing architecture contracts.

## 2. Wave 2 Scope

- Architecture docs only
- No governance move
- No UX move
- No planning move
- No development move
- No review move
- No legacy archive execution in this wave

## 3. Target Areas

- `docs/02_ARCHITECTURE/`
- BCVH
- Route
- Shipment
- Evidence
- Action
- Cross-center architecture docs

## 4. File Classification for Wave 2

| File Name | Current Path | Wave 2 Classification | Proposed Target |
| --- | --- | --- | --- |
| `PROJECT_CONTEXT.md` | `docs/00_README/PROJECT_CONTEXT.md` | `NO ACTION` | `No move in Wave 2` |
| `readme.md` | `docs/00_README/readme.md` | `NO ACTION` | `No move in Wave 2` |
| `AI_COLLABORATION_PROTOCOL.md` | `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENT_GOVERNANCE.md` | `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENT_INDEX.md` | `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENT_LIFECYCLE.md` | `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENT_UPDATE_MATRIX.md` | `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | `KEEP` | `No move in Wave 2` |
| `MASTER_START_PROMPT.md` | `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | `KEEP` | `No move in Wave 2` |
| `PROJECT_CONTEXT.md` | `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | `KEEP` | `No move in Wave 2` |
| `PROJECT_DECISIONS.md` | `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | `KEEP` | `No move in Wave 2` |
| `PROJECT_HANDOVER.md` | `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | `KEEP` | `No move in Wave 2` |
| `ARCH-001.md` | `docs/01_RULES/ARCH-001.md` | `NO ACTION` | `No move in Wave 2` |
| `constitution.md` | `docs/01_RULES/constitution.md` | `NO ACTION` | `No move in Wave 2` |
| `governance_rules.md` | `docs/01_RULES/governance_rules.md` | `NO ACTION` | `No move in Wave 2` |
| `tech_architecture_rules.md` | `docs/01_RULES/tech_architecture_rules.md` | `NO ACTION` | `No move in Wave 2` |
| `ui_ux_guidelines.md` | `docs/01_RULES/ui_ux_guidelines.md` | `NO ACTION` | `No move in Wave 2` |
| `ai_architecture_map.md` | `docs/02_AI_CONTEXT/ai_architecture_map.md` | `NO ACTION` | `No move in Wave 2` |
| `system_prompt.md` | `docs/02_AI_CONTEXT/system_prompt.md` | `NO ACTION` | `No move in Wave 2` |
| `business_dictionary.md` | `docs/03_SHARED_BUSINESS/business_dictionary.md` | `NO ACTION` | `No move in Wave 2` |
| `global_kpi_framework.md` | `docs/03_SHARED_BUSINESS/global_kpi_framework.md` | `NO ACTION` | `No move in Wave 2` |
| `global_notification.md` | `docs/03_SHARED_BUSINESS/global_notification.md` | `NO ACTION` | `No move in Wave 2` |
| `import_center_rules.md` | `docs/03_SHARED_BUSINESS/import_center_rules.md` | `NO ACTION` | `No move in Wave 2` |
| `business_rules.md` | `docs/04_DOMAINS/_template_indicator/business_rules.md` | `NO ACTION` | `No move in Wave 2` |
| `changelog.md` | `docs/04_DOMAINS/_template_indicator/changelog.md` | `NO ACTION` | `No move in Wave 2` |
| `core_knowledge.md` | `docs/04_DOMAINS/_template_indicator/core_knowledge.md` | `NO ACTION` | `No move in Wave 2` |
| `data_blueprint.md` | `docs/04_DOMAINS/_template_indicator/data_blueprint.md` | `NO ACTION` | `No move in Wave 2` |
| `measurement.md` | `docs/04_DOMAINS/_template_indicator/measurement.md` | `NO ACTION` | `No move in Wave 2` |
| `rca_ai_context.md` | `docs/04_DOMAINS/_template_indicator/rca_ai_context.md` | `NO ACTION` | `No move in Wave 2` |
| `testing_scenarios.md` | `docs/04_DOMAINS/_template_indicator/testing_scenarios.md` | `NO ACTION` | `No move in Wave 2` |
| `acceptance_criteria.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/acceptance_criteria.md` | `NO ACTION` | `No move in Wave 2` |
| `analytical_patterns.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/analytical_patterns.md` | `NO ACTION` | `No move in Wave 2` |
| `business_glossary.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_glossary.md` | `NO ACTION` | `No move in Wave 2` |
| `business_rules.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_rules.md` | `NO ACTION` | `No move in Wave 2` |
| `changelog.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/changelog.md` | `NO ACTION` | `No move in Wave 2` |
| `core_knowledge.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/core_knowledge.md` | `NO ACTION` | `No move in Wave 2` |
| `data_blueprint.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/data_blueprint.md` | `NO ACTION` | `No move in Wave 2` |
| `executive_decision_guide.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/executive_decision_guide.md` | `NO ACTION` | `No move in Wave 2` |
| `executive_scenarios.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/executive_scenarios.md` | `NO ACTION` | `No move in Wave 2` |
| `faq_troubleshooting.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/faq_troubleshooting.md` | `NO ACTION` | `No move in Wave 2` |
| `measurement.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/measurement.md` | `NO ACTION` | `No move in Wave 2` |
| `rca_ai_context.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/rca_ai_context.md` | `NO ACTION` | `No move in Wave 2` |
| `testing_scenarios.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/testing_scenarios.md` | `NO ACTION` | `No move in Wave 2` |
| `api_contracts.md` | `docs/05_TECHNICAL_IMPLEMENTATION/api_contracts.md` | `NO ACTION` | `No move in Wave 2` |
| `database_schema.md` | `docs/05_TECHNICAL_IMPLEMENTATION/database_schema.md` | `NO ACTION` | `No move in Wave 2` |
| `deployment_infrastructure.md` | `docs/05_TECHNICAL_IMPLEMENTATION/deployment_infrastructure.md` | `NO ACTION` | `No move in Wave 2` |
| `f1.3_technical_design_v1.0.md` | `docs/05_TECHNICAL_IMPLEMENTATION/f1.3_technical_design_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/ACTION/ or docs/03_UX/ACTION/` |
| `ACTION_CENTER_SCREEN_ARCHITECTURE.md` | `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/ACTION/ or docs/03_UX/ACTION/` |
| `ACTION_CENTER_UX_ARCHITECTURE.md` | `docs/ACTION_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/ACTION/ or docs/03_UX/ACTION/` |
| `ACTION_CENTER_WIDGET_SPECIFICATION.md` | `docs/ACTION_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `docs/02_ARCHITECTURE/ACTION/ or docs/03_UX/ACTION/` |
| `API_DESIGN_v1.0.md` | `docs/API_DESIGN_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `ARCHITECTURE_CONSISTENCY_REVIEW.md` | `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md` | `NO ACTION` | `No move in Wave 2` |
| `bcvh_operation_table_spec.md` | `docs/bcvh_operation_table_spec.md` | `MOVE` | `docs/02_ARCHITECTURE/BCVH/ or docs/03_UX/BCVH/` |
| `BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/BCVH/ or docs/03_UX/BCVH/` |
| `BCVH_PERFORMANCE_CENTER_REVIEW.md` | `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md` | `MOVE` | `docs/02_ARCHITECTURE/BCVH/ or docs/03_UX/BCVH/` |
| `BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/BCVH/ or docs/03_UX/BCVH/` |
| `BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/BCVH/ or docs/03_UX/BCVH/` |
| `BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `docs/02_ARCHITECTURE/BCVH/ or docs/03_UX/BCVH/` |
| `Constitution v1.0.md` | `docs/Constitution v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/` |
| `DASHBOARD_DESIGN_v1.0.md` | `docs/DASHBOARD_DESIGN_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `DASHBOARD_FOUNDATION_REVIEW.md` | `docs/DASHBOARD_FOUNDATION_REVIEW.md` | `NO ACTION` | `No move in Wave 2` |
| `DATABASE_DESIGN_v1.0.md` | `docs/DATABASE_DESIGN_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `DEVELOPMENT_ARCHITECTURE_v1.0.md` | `docs/DEVELOPMENT_ARCHITECTURE_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `DEVELOPMENT_BACKLOG.md` | `docs/DEVELOPMENT_BACKLOG.md` | `NO ACTION` | `No move in Wave 2` |
| `DOCUMENTATION_ARCHITECTURE.md` | `docs/DOCUMENTATION_ARCHITECTURE.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENTATION_AUDIT_REPORT.md` | `docs/DOCUMENTATION_AUDIT_REPORT.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENTATION_CLEANUP_REPORT.md` | `docs/DOCUMENTATION_CLEANUP_REPORT.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENTATION_MIGRATION_PLAN.md` | `docs/DOCUMENTATION_MIGRATION_PLAN.md` | `KEEP` | `No move in Wave 2` |
| `DOCUMENTATION_VALIDATION_REPORT.md` | `docs/DOCUMENTATION_VALIDATION_REPORT.md` | `KEEP` | `No move in Wave 2` |
| `ENVIRONMENT_ISOLATION_PLAN.md` | `docs/ENVIRONMENT_ISOLATION_PLAN.md` | `NO ACTION` | `No move in Wave 2` |
| `EPIC_PLANNING.md` | `docs/EPIC_PLANNING.md` | `NO ACTION` | `No move in Wave 2` |
| `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/EVIDENCE/ or docs/03_UX/EVIDENCE/` |
| `EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/EVIDENCE/ or docs/03_UX/EVIDENCE/` |
| `EVIDENCE_CENTER_UX_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/EVIDENCE/ or docs/03_UX/EVIDENCE/` |
| `EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `docs/02_ARCHITECTURE/EVIDENCE/ or docs/03_UX/EVIDENCE/` |
| `F1.3 DATA DICTIONARY v1.0.md` | `docs/F1.3/F1.3 DATA DICTIONARY v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `F1.3 MODULE SPECIFICATION v1.0.md` | `docs/F1.3/F1.3 MODULE SPECIFICATION v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `F13_303_DEFINITION.md` | `docs/F1.3/F13_303_DEFINITION.md` | `NO ACTION` | `No move in Wave 2` |
| `FEATURE_PLANNING.md` | `docs/FEATURE_PLANNING.md` | `NO ACTION` | `No move in Wave 2` |
| `FOLDER_DATA_STANDARD v1.0.md` | `docs/FOLDER_DATA_STANDARD v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `GAP_ANALYSIS_ADDENDUM_v1.0.md` | `docs/GAP_ANALYSIS_ADDENDUM_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `GAP_ANALYSIS_v1.0.md` | `docs/GAP_ANALYSIS_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `IMPLEMENTATION_ARCHITECTURE.md` | `docs/IMPLEMENTATION_ARCHITECTURE.md` | `NO ACTION` | `No move in Wave 2` |
| `operation_center_spec.md` | `docs/operation_center_spec.md` | `NO ACTION` | `No move in Wave 2` |
| `PROJECT_SSOT.md` | `docs/PROJECT_SSOT.md` | `KEEP` | `No move in Wave 2` |
| `QIS_DESIGN_SYSTEM.md` | `docs/QIS_DESIGN_SYSTEM.md` | `NO ACTION` | `No move in Wave 2` |
| `QIS_UX_DESIGN_PRINCIPLES.md` | `docs/QIS_UX_DESIGN_PRINCIPLES.md` | `NO ACTION` | `No move in Wave 2` |
| `QIS_V2_ARCHITECTURE.md` | `docs/QIS_V2_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/` |
| `quality_timeline_spec.md` | `docs/quality_timeline_spec.md` | `NO ACTION` | `No move in Wave 2` |
| `RELEASE_PLANNING.md` | `docs/RELEASE_PLANNING.md` | `NO ACTION` | `No move in Wave 2` |
| `RESEARCH_BASELINE_v1.0.md` | `docs/RESEARCH_BASELINE_v1.0.md` | `NO ACTION` | `No move in Wave 2` |
| `ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/ROUTE/ or docs/03_UX/ROUTE/` |
| `ROUTE_PERFORMANCE_CENTER_REVIEW.md` | `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | `MOVE` | `docs/02_ARCHITECTURE/ROUTE/ or docs/03_UX/ROUTE/` |
| `ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/ROUTE/ or docs/03_UX/ROUTE/` |
| `ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/ROUTE/ or docs/03_UX/ROUTE/` |
| `ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `docs/02_ARCHITECTURE/ROUTE/ or docs/03_UX/ROUTE/` |
| `rule_recommendation_spec.md` | `docs/rule_recommendation_spec.md` | `NO ACTION` | `No move in Wave 2` |
| `SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/SHIPMENT/ or docs/03_UX/SHIPMENT/` |
| `SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/SHIPMENT/ or docs/03_UX/SHIPMENT/` |
| `SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `MOVE` | `docs/02_ARCHITECTURE/SHIPMENT/ or docs/03_UX/SHIPMENT/` |
| `SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `MOVE` | `docs/02_ARCHITECTURE/SHIPMENT/ or docs/03_UX/SHIPMENT/` |
| `UI_ARCHITECTURE_PLAN.md` | `docs/UI_ARCHITECTURE_PLAN.md` | `NO ACTION` | `No move in Wave 2` |
| `UX_CONSISTENCY_REVIEW.md` | `docs/UX_CONSISTENCY_REVIEW.md` | `NO ACTION` | `No move in Wave 2` |
| `README.md` | `frontend/README.md` | `NO ACTION` | `No move in Wave 2` |
| `PROJECT_PROGRESS.md` | `PROJECT_PROGRESS.md` | `KEEP` | `No move in Wave 2` |
| `PROJECT_STATUS.md` | `PROJECT_STATUS.md` | `KEEP` | `No move in Wave 2` |
| `README.md` | `README.md` | `NO ACTION` | `No move in Wave 2` |
| `README_AI.md` | `README_AI.md` | `KEEP` | `No move in Wave 2` |

## 5. Wave 2 Rules

- Archive instead of delete
- No broken links
- One wave per commit
- Do not touch governance/core
- Do not move files outside architecture scope

## 6. Reference Update Strategy

- Documents likely needing path updates after Wave 2 execution: active architecture docs that reference `docs/` root paths.
- Documents that must remain untouched during Wave 2 execution: `README_AI.md`, `MASTER_START_PROMPT.md`, `DOCUMENT_INDEX.md`, `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, `AI_COLLABORATION_PROTOCOL.md`, `PROJECT_DECISIONS.md`, `PROJECT_STATUS.md`, `PROJECT_PROGRESS.md`.
- Governance/core references should remain stable in this plan phase.

## 7. Risk Analysis

- Broken links: architecture moves may create cross-center path drift if references are not updated in the same wave.
- Authority conflicts: architecture docs must continue to defer to L1/L2 governance docs.
- Entry-point drift: governance/core reading order must remain unchanged until a dedicated governance change is approved.
- Legacy overlap: legacy reference trees may still coexist with modern architecture docs.

## 8. Approval Gate

- Product Owner review required
- Wave 2 execution only after explicit approval

## 9. Validation Plan

After Wave 2 execution, validate:
- all moved architecture document links
- `README_AI.md` entry chain
- `MASTER_START_PROMPT.md` reading order
- `DOCUMENT_INDEX.md` inventory references
- `PROJECT_HANDOVER.md` current snapshot references
- `PROJECT_CONTEXT.md` continuation rule references

## 10. Recommendation

Wave 2 is **not ready for execution yet** without explicit Product Owner approval.
It is ready as a plan artifact, but execution should wait until the next approval gate and the wave 2 move list is reviewed against the current architecture chain.

## Summary Counts

| Classification | Count |
| --- | --- |
| KEEP | 18 |
| MOVE | 25 |
| ARCHIVE | 0 |
| REVIEW | 66 |
| NO ACTION | 66 |