# DOCUMENTATION AUDIT REPORT

## 1. Executive Summary

Documentation landscape is broadly healthy for the QIS V2 governance model, but the repository contains two parallel documentation strata: the modern frozen QIS V2 system in `docs/` root files and a large legacy documentation set under versioned folders such as `docs/00_README`, `docs/01_RULES`, `docs/02_AI_CONTEXT`, `docs/03_SHARED_BUSINESS`, `docs/04_DOMAINS`, and `docs/05_TECHNICAL_IMPLEMENTATION`.

The modern handover/governance layer is coherent and well-structured. The main risk is duplication and supersession across legacy vs. modern documents, plus some documents that are only historical references and no longer part of the active operating model.

Documentation Health Score: **78/100** (`Good`)

## 2. Repository Statistics

- Total Markdown Files Audited (project-owned, excluding `node_modules` and `.agents`): **104**
- Active: **10**
- Frozen: **32**
- Legacy: **37**
- Deprecated: **0**
- Unknown: **25**
- L1: **3**
- L2: **10**
- L3: **32**
- L4: **59**
- Files with no detected intra-repo references: **36**
- Files that are historical/legacy only: **37**
- Duplicate-function candidates: **9**
- Superseded candidates: **12**
- Source of Truth files: **3**

## 3. Document Inventory

| File Name | Current Path | Category | Purpose | Current Status | Authority Level | Last Related Phase | Referenced By | References To | Current Usage | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PROJECT_CONTEXT.md` | `docs/00_README/PROJECT_CONTEXT.md` | `Governance / Handover` | see doc | `Legacy` | `L4` | `Governance / Handover` | 6 (AI_COLLABORATION_PROTOCOL.md, DOCUMENT_INDEX.md, PROJECT_CONTEXT.md) | 5 (measurement.md, measurement.md, system_prompt.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `readme.md` | `docs/00_README/readme.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `ARCH-001.md` | `docs/01_RULES/ARCH-001.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 5 (bcvh_operation_table_spec.md, operation_center_spec.md, quality_timeline_spec.md) | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `constitution.md` | `docs/01_RULES/constitution.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 3 (governance_rules.md, tech_architecture_rules.md, ui_ux_guidelines.md) | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `governance_rules.md` | `docs/01_RULES/governance_rules.md` | `Governance / Handover` | see doc | `Legacy` | `L4` | `Governance / Handover` | 0 | 1 (constitution.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `tech_architecture_rules.md` | `docs/01_RULES/tech_architecture_rules.md` | `Architecture / UX` | see doc | `Legacy` | `L3` | `Architecture / UX` | 0 | 1 (constitution.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `ui_ux_guidelines.md` | `docs/01_RULES/ui_ux_guidelines.md` | `UX` | see doc | `Legacy` | `L3` | `UX` | 0 | 1 (constitution.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `ai_architecture_map.md` | `docs/02_AI_CONTEXT/ai_architecture_map.md` | `Governance / Handover` | see doc | `Legacy` | `L3` | `Governance / Handover` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `system_prompt.md` | `docs/02_AI_CONTEXT/system_prompt.md` | `Governance / Handover` | see doc | `Legacy` | `L4` | `Governance / Handover` | 1 (PROJECT_CONTEXT.md) | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `business_dictionary.md` | `docs/03_SHARED_BUSINESS/business_dictionary.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 4 (business_glossary.md, global_notification.md, import_center_rules.md) | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `global_kpi_framework.md` | `docs/03_SHARED_BUSINESS/global_kpi_framework.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 1 (business_dictionary.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `global_notification.md` | `docs/03_SHARED_BUSINESS/global_notification.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 1 (business_dictionary.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `import_center_rules.md` | `docs/03_SHARED_BUSINESS/import_center_rules.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 1 (business_dictionary.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `business_rules.md` | `docs/04_DOMAINS/_template_indicator/business_rules.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 6 (f1.3_technical_design_v1.0.md, measurement.md, testing_scenarios.md) | 2 (data_blueprint.md, data_blueprint.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `changelog.md` | `docs/04_DOMAINS/_template_indicator/changelog.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `core_knowledge.md` | `docs/04_DOMAINS/_template_indicator/core_knowledge.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 5 (data_blueprint.md, data_blueprint.md, faq_troubleshooting.md) | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `data_blueprint.md` | `docs/04_DOMAINS/_template_indicator/data_blueprint.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 4 (RESEARCH_BASELINE_v1.0.md, business_rules.md, f1.3_technical_design_v1.0.md) | 2 (core_knowledge.md, core_knowledge.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `measurement.md` | `docs/04_DOMAINS/_template_indicator/measurement.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 4 (PROJECT_CONTEXT.md, analytical_patterns.md, rca_ai_context.md) | 2 (business_rules.md, business_rules.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `rca_ai_context.md` | `docs/04_DOMAINS/_template_indicator/rca_ai_context.md` | `Governance / Handover` | see doc | `Legacy` | `L4` | `Governance / Handover` | 1 (RESEARCH_BASELINE_v1.0.md) | 2 (measurement.md, measurement.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `testing_scenarios.md` | `docs/04_DOMAINS/_template_indicator/testing_scenarios.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 2 (business_rules.md, business_rules.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `acceptance_criteria.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/acceptance_criteria.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 2 (business_rules.md, business_rules.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `analytical_patterns.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/analytical_patterns.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 2 (measurement.md, measurement.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `business_glossary.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_glossary.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 1 (RESEARCH_BASELINE_v1.0.md) | 3 (business_dictionary.md, core_knowledge.md, core_knowledge.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `business_rules.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/business_rules.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 6 (f1.3_technical_design_v1.0.md, measurement.md, testing_scenarios.md) | 2 (data_blueprint.md, data_blueprint.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `changelog.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/changelog.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `core_knowledge.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/core_knowledge.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 5 (data_blueprint.md, data_blueprint.md, faq_troubleshooting.md) | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `data_blueprint.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/data_blueprint.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 4 (RESEARCH_BASELINE_v1.0.md, business_rules.md, f1.3_technical_design_v1.0.md) | 2 (core_knowledge.md, core_knowledge.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `executive_decision_guide.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/executive_decision_guide.md` | `Architecture / Governance` | see doc | `Legacy` | `L4` | `Architecture / Governance` | 2 (RESEARCH_BASELINE_v1.0.md, executive_scenarios.md) | 2 (core_knowledge.md, core_knowledge.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `executive_scenarios.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/executive_scenarios.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 1 (RESEARCH_BASELINE_v1.0.md) | 1 (executive_decision_guide.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `faq_troubleshooting.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/faq_troubleshooting.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 1 (RESEARCH_BASELINE_v1.0.md) | 2 (core_knowledge.md, core_knowledge.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `measurement.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/measurement.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 4 (PROJECT_CONTEXT.md, analytical_patterns.md, rca_ai_context.md) | 2 (business_rules.md, business_rules.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `rca_ai_context.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/rca_ai_context.md` | `Governance / Handover` | see doc | `Legacy` | `L4` | `Governance / Handover` | 1 (RESEARCH_BASELINE_v1.0.md) | 2 (measurement.md, measurement.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `testing_scenarios.md` | `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/testing_scenarios.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 2 (business_rules.md, business_rules.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `api_contracts.md` | `docs/05_TECHNICAL_IMPLEMENTATION/api_contracts.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `database_schema.md` | `docs/05_TECHNICAL_IMPLEMENTATION/database_schema.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `deployment_infrastructure.md` | `docs/05_TECHNICAL_IMPLEMENTATION/deployment_infrastructure.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 0 | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `f1.3_technical_design_v1.0.md` | `docs/05_TECHNICAL_IMPLEMENTATION/f1.3_technical_design_v1.0.md` | `Reference` | see doc | `Legacy` | `L4` | `Reference` | 0 | 4 (business_rules.md, data_blueprint.md, data_blueprint.md) | Legacy reference; preserve if historical context is needed | `ARCHIVE` |
| `ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `ACTION_CENTER_SCREEN_ARCHITECTURE.md` | `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `ACTION_CENTER_UX_ARCHITECTURE.md` | `docs/ACTION_CENTER_UX_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, UX_CONSISTENCY_REVIEW.md) | 0 | Reference / historical support | `REVIEW` |
| `ACTION_CENTER_WIDGET_SPECIFICATION.md` | `docs/ACTION_CENTER_WIDGET_SPECIFICATION.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `AI_COLLABORATION_PROTOCOL.md` | `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | `Governance / Handover` | see doc | `Unknown` | `L2` | `Governance / Handover` | 4 (DOCUMENT_INDEX.md, MASTER_START_PROMPT.md, README_AI.md) | 5 (PROJECT_CONTEXT.md, PROJECT_CONTEXT.md, PROJECT_STATUS.md) | Reference / historical support | `REVIEW` |
| `API_DESIGN_v1.0.md` | `docs/API_DESIGN_v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `ARCHITECTURE_CONSISTENCY_REVIEW.md` | `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md` | `Review` | see doc | `Frozen` | `L3` | `Review` | 2 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md) | 5 (QIS_DESIGN_SYSTEM.md, QIS_UX_DESIGN_PRINCIPLES.md, QIS_V2_ARCHITECTURE.md) | Reference / historical support | `REVIEW` |
| `bcvh_operation_table_spec.md` | `docs/bcvh_operation_table_spec.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 1 (ARCH-001.md) | Reference / historical support | `REVIEW` |
| `BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 4 (BCVH_PERFORMANCE_CENTER_REVIEW.md, DOCUMENT_INDEX.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `BCVH_PERFORMANCE_CENTER_REVIEW.md` | `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md` | `Review` | see doc | `Frozen` | `L3` | `Review` | 2 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md) | 8 (BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md, BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md, DEVELOPMENT_BACKLOG.md) | Reference / historical support | `REVIEW` |
| `BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (BCVH_PERFORMANCE_CENTER_REVIEW.md, PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 4 (BCVH_PERFORMANCE_CENTER_REVIEW.md, DOCUMENT_INDEX.md, UX_CONSISTENCY_REVIEW.md) | 0 | Reference / historical support | `REVIEW` |
| `BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 3 (BCVH_PERFORMANCE_CENTER_REVIEW.md, PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `Constitution v1.0.md` | `docs/Constitution v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 4 (DOCUMENT_INDEX.md, PROJECT_CONTEXT.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `DASHBOARD_DESIGN_v1.0.md` | `docs/DASHBOARD_DESIGN_v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `DASHBOARD_FOUNDATION_REVIEW.md` | `docs/DASHBOARD_FOUNDATION_REVIEW.md` | `Review` | see doc | `Frozen` | `L3` | `Review` | 0 | 3 (IMPLEMENTATION_ARCHITECTURE.md, PROJECT_SSOT.md, QIS_DESIGN_SYSTEM.md) | Reference / historical support | `REVIEW` |
| `DATABASE_DESIGN_v1.0.md` | `docs/DATABASE_DESIGN_v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `DEVELOPMENT_ARCHITECTURE_v1.0.md` | `docs/DEVELOPMENT_ARCHITECTURE_v1.0.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 0 | 0 | Reference / historical support | `REVIEW` |
| `DEVELOPMENT_BACKLOG.md` | `docs/DEVELOPMENT_BACKLOG.md` | `Technical Planning` | see doc | `Frozen` | `L3` | `Technical Planning` | 5 (BCVH_PERFORMANCE_CENTER_REVIEW.md, DOCUMENT_INDEX.md, PROJECT_CONTEXT.md) | 0 | Reference / historical support | `REVIEW` |
| `DOCUMENT_GOVERNANCE.md` | `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | `Governance / Handover` | see doc | `Active` | `L1` | `Governance / Handover` | 4 (DOCUMENT_INDEX.md, MASTER_START_PROMPT.md, README_AI.md) | 0 | Reference / historical support | `REVIEW` |
| `DOCUMENT_INDEX.md` | `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | `Governance / Handover` | see doc | `Active` | `L2` | `Governance / Handover` | 3 (DOCUMENT_UPDATE_MATRIX.md, MASTER_START_PROMPT.md, README_AI.md) | 35 (ARCHITECTURE_CONSISTENCY_REVIEW.md, EPIC_PLANNING.md, FEATURE_PLANNING.md) | Reference / historical support | `REVIEW` |
| `DOCUMENT_LIFECYCLE.md` | `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md` | `Governance / Handover` | see doc | `Active` | `L2` | `Governance / Handover` | 2 (DOCUMENT_INDEX.md, DOCUMENT_UPDATE_MATRIX.md) | 0 | Reference / historical support | `REVIEW` |
| `DOCUMENT_UPDATE_MATRIX.md` | `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | `Governance / Handover` | see doc | `Active` | `L2` | `Governance / Handover` | 3 (DOCUMENT_INDEX.md, MASTER_START_PROMPT.md, README_AI.md) | 18 (DOCUMENT_INDEX.md, DOCUMENT_LIFECYCLE.md, EPIC_PLANNING.md) | Reference / historical support | `REVIEW` |
| `ENVIRONMENT_ISOLATION_PLAN.md` | `docs/ENVIRONMENT_ISOLATION_PLAN.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `EPIC_PLANNING.md` | `docs/EPIC_PLANNING.md` | `Technical Planning` | see doc | `Frozen` | `L3` | `Technical Planning` | 4 (DOCUMENT_INDEX.md, PROJECT_CONTEXT.md, PROJECT_HANDOVER.md) | 0 | Reference / historical support | `REVIEW` |
| `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `EVIDENCE_CENTER_UX_ARCHITECTURE.md` | `docs/EVIDENCE_CENTER_UX_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, UX_CONSISTENCY_REVIEW.md) | 0 | Reference / historical support | `REVIEW` |
| `EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `F1.3 DATA DICTIONARY v1.0.md` | `docs/F1.3/F1.3 DATA DICTIONARY v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 1 (RESEARCH_BASELINE_v1.0.md) | 0 | Reference / historical support | `REVIEW` |
| `F1.3 MODULE SPECIFICATION v1.0.md` | `docs/F1.3/F1.3 MODULE SPECIFICATION v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 1 (RESEARCH_BASELINE_v1.0.md) | 0 | Reference / historical support | `REVIEW` |
| `F13_303_DEFINITION.md` | `docs/F1.3/F13_303_DEFINITION.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 1 (RESEARCH_BASELINE_v1.0.md) | 0 | Reference / historical support | `REVIEW` |
| `FEATURE_PLANNING.md` | `docs/FEATURE_PLANNING.md` | `Technical Planning` | see doc | `Frozen` | `L3` | `Technical Planning` | 4 (DOCUMENT_INDEX.md, PROJECT_CONTEXT.md, PROJECT_HANDOVER.md) | 0 | Reference / historical support | `REVIEW` |
| `FOLDER_DATA_STANDARD v1.0.md` | `docs/FOLDER_DATA_STANDARD v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `GAP_ANALYSIS_ADDENDUM_v1.0.md` | `docs/GAP_ANALYSIS_ADDENDUM_v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `GAP_ANALYSIS_v1.0.md` | `docs/GAP_ANALYSIS_v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 1 (RESEARCH_BASELINE_v1.0.md) | Reference / historical support | `REVIEW` |
| `IMPLEMENTATION_ARCHITECTURE.md` | `docs/IMPLEMENTATION_ARCHITECTURE.md` | `Reference` | see doc | `Frozen` | `L2` | `Reference` | 6 (BCVH_PERFORMANCE_CENTER_REVIEW.md, DASHBOARD_FOUNDATION_REVIEW.md, DOCUMENT_INDEX.md) | 0 | Reference / historical support | `REVIEW` |
| `MASTER_START_PROMPT.md` | `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | `Governance / Handover` | see doc | `Unknown` | `L2` | `Governance / Handover` | 3 (DOCUMENT_INDEX.md, DOCUMENT_UPDATE_MATRIX.md, README_AI.md) | 10 (DOCUMENT_GOVERNANCE.md, DOCUMENT_INDEX.md, PROJECT_DECISIONS.md) | Reference / historical support | `REVIEW` |
| `operation_center_spec.md` | `docs/operation_center_spec.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 1 (ARCH-001.md) | Reference / historical support | `REVIEW` |
| `PROJECT_CONTEXT.md` | `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | `Governance / Handover` | see doc | `Active` | `L2` | `Governance / Handover` | 6 (AI_COLLABORATION_PROTOCOL.md, DOCUMENT_INDEX.md, MASTER_START_PROMPT.md) | 14 (EPIC_PLANNING.md, FEATURE_PLANNING.md, QIS_UX_DESIGN_PRINCIPLES.md) | Reference / historical support | `REVIEW` |
| `PROJECT_DECISIONS.md` | `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | `Architecture / Governance` | see doc | `Frozen` | `L1` | `Architecture / Governance` | 4 (DOCUMENT_INDEX.md, MASTER_START_PROMPT.md, README_AI.md) | 0 | Reference / historical support | `REVIEW` |
| `PROJECT_HANDOVER.md` | `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | `Governance / Handover` | see doc | `Active` | `L2` | `Governance / Handover` | 6 (AI_COLLABORATION_PROTOCOL.md, DOCUMENT_INDEX.md, PROJECT_CONTEXT.md) | 36 (ARCHITECTURE_CONSISTENCY_REVIEW.md, EPIC_PLANNING.md, ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md) | Reference / historical support | `REVIEW` |
| `PROJECT_SSOT.md` | `docs/PROJECT_SSOT.md` | `Architecture / Governance` | see doc | `Frozen` | `L1` | `Architecture / Governance` | 10 (ARCHITECTURE_CONSISTENCY_REVIEW.md, BCVH_PERFORMANCE_CENTER_REVIEW.md, DOCUMENT_INDEX.md) | 1 (PROJECT_STATUS.md) | Reference / historical support | `REVIEW` |
| `QIS_DESIGN_SYSTEM.md` | `docs/QIS_DESIGN_SYSTEM.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 8 (ARCHITECTURE_CONSISTENCY_REVIEW.md, BCVH_PERFORMANCE_CENTER_REVIEW.md, DOCUMENT_INDEX.md) | 0 | Reference / historical support | `REVIEW` |
| `QIS_UX_DESIGN_PRINCIPLES.md` | `docs/QIS_UX_DESIGN_PRINCIPLES.md` | `UX` | see doc | `Frozen` | `L3` | `UX` | 6 (ARCHITECTURE_CONSISTENCY_REVIEW.md, DOCUMENT_INDEX.md, UX_CONSISTENCY_REVIEW.md) | 0 | Reference / historical support | `REVIEW` |
| `QIS_V2_ARCHITECTURE.md` | `docs/QIS_V2_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 5 (ARCHITECTURE_CONSISTENCY_REVIEW.md, DOCUMENT_INDEX.md, PROJECT_CONTEXT.md) | 0 | Reference / historical support | `REVIEW` |
| `quality_timeline_spec.md` | `docs/quality_timeline_spec.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 1 (ARCH-001.md) | Reference / historical support | `REVIEW` |
| `RELEASE_PLANNING.md` | `docs/RELEASE_PLANNING.md` | `Technical Planning` | see doc | `Frozen` | `L3` | `Technical Planning` | 4 (DOCUMENT_INDEX.md, PROJECT_CONTEXT.md, PROJECT_HANDOVER.md) | 0 | Reference / historical support | `REVIEW` |
| `RESEARCH_BASELINE_v1.0.md` | `docs/RESEARCH_BASELINE_v1.0.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 1 (GAP_ANALYSIS_v1.0.md) | 11 (F1.3 MODULE SPECIFICATION v1.0.md, executive_scenarios.md, rca_ai_context.md) | Reference / historical support | `REVIEW` |
| `ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `ROUTE_PERFORMANCE_CENTER_REVIEW.md` | `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | `Review` | see doc | `Frozen` | `L3` | `Review` | 2 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md) | 0 | Reference / historical support | `REVIEW` |
| `ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, UX_CONSISTENCY_REVIEW.md) | 0 | Reference / historical support | `REVIEW` |
| `ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `rule_recommendation_spec.md` | `docs/rule_recommendation_spec.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 0 | 1 (ARCH-001.md) | Reference / historical support | `REVIEW` |
| `SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 3 (DOCUMENT_INDEX.md, PROJECT_HANDOVER.md, UX_CONSISTENCY_REVIEW.md) | 0 | Reference / historical support | `REVIEW` |
| `SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` | `Reference` | see doc | `Unknown` | `L4` | `Reference` | 2 (PROJECT_HANDOVER.md, PROJECT_PROGRESS.md) | 0 | Reference / historical support | `REVIEW` |
| `UI_ARCHITECTURE_PLAN.md` | `docs/UI_ARCHITECTURE_PLAN.md` | `Architecture / UX` | see doc | `Frozen` | `L3` | `Architecture / UX` | 0 | 0 | Reference / historical support | `REVIEW` |
| `UX_CONSISTENCY_REVIEW.md` | `docs/UX_CONSISTENCY_REVIEW.md` | `UX` | see doc | `Frozen` | `L3` | `UX` | 3 (DOCUMENT_INDEX.md, DOCUMENT_UPDATE_MATRIX.md, PROJECT_HANDOVER.md) | 9 (ACTION_CENTER_UX_ARCHITECTURE.md, QIS_UX_DESIGN_PRINCIPLES.md, ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md) | Reference / historical support | `REVIEW` |
| `README.md` | `frontend/README.md` | `Reference` | tooling/reference | `Unknown` | `L4` | `Reference` | 0 | 0 | Reference / historical support | `REVIEW` |
| `PROJECT_PROGRESS.md` | `PROJECT_PROGRESS.md` | `Reference` | see doc | `Active` | `L2` | `Reference` | 8 (AI_COLLABORATION_PROTOCOL.md, DOCUMENT_INDEX.md, UX_CONSISTENCY_REVIEW.md) | 21 (ACTION_CENTER_SCREEN_ARCHITECTURE.md, PROJECT_SSOT.md, ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md) | Primary governance / onboarding reference | `KEEP` |
| `PROJECT_STATUS.md` | `PROJECT_STATUS.md` | `Reference` | see doc | `Active` | `L2` | `Reference` | 10 (AI_COLLABORATION_PROTOCOL.md, ARCHITECTURE_CONSISTENCY_REVIEW.md, DOCUMENT_INDEX.md) | 1 (PROJECT_SSOT.md) | Primary governance / onboarding reference | `KEEP` |
| `README.md` | `README.md` | `Core / Entry Point` | see doc | `Active` | `L4` | `Core / Entry Point` | 0 | 0 | Reference / historical support | `REVIEW` |
| `README_AI.md` | `README_AI.md` | `Core / Entry Point` | see doc | `Active` | `L4` | `Core / Entry Point` | 0 | 11 (DOCUMENT_GOVERNANCE.md, DOCUMENT_INDEX.md, PROJECT_DECISIONS.md) | Reference / historical support | `REVIEW` |

## 4. Reference Analysis

- Unreferenced files: **36**
- Most of these are legacy/reference files, vendor/tool docs, or standalone docs without incoming links.
- Broken references: **0 detected by direct file-name scan** (not a full semantic link checker).
- Circular references: **Low risk**; governance docs cross-reference each other intentionally.

## 5. Authority Analysis

- **L1 / Source of Truth**: `PROJECT_SSOT.md`, `PROJECT_DECISIONS.md`, `DOCUMENT_GOVERNANCE.md`
- **L2 / Project Control**: `PROJECT_STATUS.md`, `PROJECT_PROGRESS.md`, `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, `AI_COLLABORATION_PROTOCOL.md`, `MASTER_START_PROMPT.md`, `DOCUMENT_INDEX.md`, `DOCUMENT_LIFECYCLE.md`, `DOCUMENT_UPDATE_MATRIX.md`, `IMPLEMENTATION_ARCHITECTURE.md`, `QIS_V2_ARCHITECTURE.md`
- **L3 / Planning**: architecture/UX/release/epic/feature/backlog/review docs
- **L4 / Reference**: legacy guides, technical references, root README files, and versioned historical docs

## 6. Duplicate Analysis

- Duplicate-function candidates: **9**
- Major duplication clusters:
  - Project control / handover: `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, `AI_COLLABORATION_PROTOCOL.md`, `PROJECT_DECISIONS.md`, `MASTER_START_PROMPT.md`
  - Governance meta-docs: `DOCUMENT_GOVERNANCE.md`, `DOCUMENT_INDEX.md`, `DOCUMENT_LIFECYCLE.md`, `DOCUMENT_UPDATE_MATRIX.md`
  - Legacy v1.0 rule packs and domain bundles under `docs/01_RULES`, `docs/03_SHARED_BUSINESS`, `docs/04_DOMAINS`, and `docs/05_TECHNICAL_IMPLEMENTATION`

## 7. Legacy Analysis

- Legacy or historical files: **37**
- These files are valuable for context but are not part of the active QIS V2 frozen contract unless explicitly referenced.
- High-legacy-density areas: `docs/00_README`, `docs/01_RULES`, `docs/02_AI_CONTEXT`, `docs/03_SHARED_BUSINESS`, `docs/04_DOMAINS`, `docs/05_TECHNICAL_IMPLEMENTATION`.

## 8. Cleanup Candidates

| Candidate | Reason | Recommendation |
| --- | --- | --- |
| `docs/00_README/readme.md` | No detected inbound references | REVIEW |
| `docs/01_RULES/governance_rules.md` | No detected inbound references | REVIEW |
| `docs/01_RULES/tech_architecture_rules.md` | No detected inbound references | REVIEW |
| `docs/01_RULES/ui_ux_guidelines.md` | No detected inbound references | REVIEW |
| `docs/02_AI_CONTEXT/ai_architecture_map.md` | No detected inbound references | REVIEW |
| `docs/03_SHARED_BUSINESS/global_kpi_framework.md` | No detected inbound references | REVIEW |
| `docs/03_SHARED_BUSINESS/global_notification.md` | No detected inbound references | REVIEW |
| `docs/03_SHARED_BUSINESS/import_center_rules.md` | No detected inbound references | REVIEW |
| `docs/04_DOMAINS/_template_indicator/changelog.md` | No detected inbound references | REVIEW |
| `docs/04_DOMAINS/_template_indicator/testing_scenarios.md` | No detected inbound references | REVIEW |
| `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/acceptance_criteria.md` | No detected inbound references | REVIEW |
| `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/analytical_patterns.md` | No detected inbound references | REVIEW |
| `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/changelog.md` | No detected inbound references | REVIEW |
| `docs/04_DOMAINS/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/testing_scenarios.md` | No detected inbound references | REVIEW |
| `docs/05_TECHNICAL_IMPLEMENTATION/api_contracts.md` | No detected inbound references | REVIEW |
| `docs/05_TECHNICAL_IMPLEMENTATION/database_schema.md` | No detected inbound references | REVIEW |
| `docs/05_TECHNICAL_IMPLEMENTATION/deployment_infrastructure.md` | No detected inbound references | REVIEW |
| `docs/05_TECHNICAL_IMPLEMENTATION/f1.3_technical_design_v1.0.md` | No detected inbound references | REVIEW |
| `docs/API_DESIGN_v1.0.md` | No detected inbound references | REVIEW |
| `docs/bcvh_operation_table_spec.md` | No detected inbound references | REVIEW |

## 9. Suggested Folder Structure

Suggested only, not executed:

- `docs/core/` for SSOT, decisions, status, progress, handover, context
- `docs/governance/` for governance, lifecycle, index, update matrix
- `docs/architecture/` for architecture and cross-center contracts
- `docs/ux/` for UX, design system, and UX freeze docs
- `docs/planning/` for release, epic, feature, backlog, implementation planning
- `docs/reviews/` for review and freeze outcome docs
- `docs/legacy/` for versioned historical content and reference packs

## 10. Risk Assessment

- **Medium**: legacy and modern documentation coexist, which can confuse new readers.
- **Medium**: some topic areas exist both as historical packs and as modern frozen docs.
- **Low**: governance is now strong enough to resolve conflicts via Authority Level and lifecycle state.
- **Low**: direct broken-link risk appears limited in the active QIS V2 docs.

## 11. Recommended Refactoring Plan

1. Freeze the active QIS V2 governance layer as the primary entry path.
2. Keep legacy packs read-only and treat them as reference only.
3. Review duplicate-function documents and decide whether they should remain as history or be superseded.
4. Introduce folder-level separation only after Product Owner approval.
5. Keep `README_AI.md` and `MASTER_START_PROMPT.md` as the onboarding path for future AI sessions.