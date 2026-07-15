# Implementation Architecture

## 1. Overall Implementation Strategy

Implementation Architecture turns all frozen Business, Architecture, and UX decisions into a technical delivery structure.

Principles:

- Implement from frozen layers only.
- Keep SSOT, Information Architecture, Widget Specification, Screen Architecture, and UX Architecture as contract sources.
- Separate presentation orchestration from business execution.
- Reuse existing modules, shared components, and frozen data contracts where possible.
- Prefer incremental delivery with clear module boundaries and stable integration points.

## 2. Module Breakdown

### Dashboard

- Entry point and executive overview.
- Provides top-level KPI, navigation, and context handoff.

### BCVH Performance Center

- Executive analytical module.
- Implements BCVH overview, health, priority, trend, root cause, recommendation, and drill-down.

### Route Performance Center

- Route analytical module.
- Implements route impact, priority, trend, root cause, recommendation, and shipment drill-down.

### Shipment Performance Center

- Shipment analytical module.
- Implements shipment impact, timeline, evidence summary, recommendation, and evidence drill-down.

### Evidence Center

- Verification module.
- Implements evidence coverage, validation, supporting evidence, RCA evidence, and decision support.

### Action Center

- Execution module.
- Implements decision queue, ownership, action tracking, feedback, and history.

### AI Recommendation

- Shared intelligence support.
- Generates or enriches recommendations where business-approved.

### Report Center

- Consolidated reporting and export module.

## 3. Frontend Structure

### Pages

- One page per center.
- One page per report center view.
- Preserve center context across page transitions.

### Layout

- Shared application shell.
- Center-specific content layout.
- Standard header, filter bar, context bar, and state surfaces.

### Components

- Center widgets.
- Shared cards, tables, charts, badges, timelines, and drill-down controls.
- Shared loading, empty, error, and back-navigation components.

### Shared Components

- Header/context bar
- Filter bar
- KPI and summary cards
- Status badges
- Severity indicators
- Tables
- Timeline
- Drill-down buttons
- Loading / empty / error states

## 4. Backend Structure

### API

- REST APIs aligned to frozen center contracts.
- Query and path parameters must preserve context consistently.

### Services

- Center orchestration services.
- Shared aggregation and validation services.
- Shared recommendation services where approved.

### Business Logic

- Keep rules in backend or engine layer.
- Do not duplicate frozen business logic in frontend.

### Scheduler

- Periodic refresh, precomputation, and reporting jobs.

### AI Engine

- Recommendation support and confidence enrichment.
- Must remain isolated from core deterministic rules.

## 5. Database Impact

### Reuse

- Prefer existing fact tables, SSOT tables, and frozen views.

### New Table

- Only when no reusable source exists and a frozen requirement needs persistence.

### New View

- Preferred for read-heavy derived structures.

### Materialized View

- Use only where repeated aggregation or heavy access paths require caching.

### Index

- Add only for proven query patterns and frozen access paths.

## 6. API Mapping

- Dashboard -> dashboard APIs
- BCVH -> BCVH summary, ranking, recommendation APIs
- Route -> route summary, ranking, recommendation, drill-down APIs
- Shipment -> shipment summary, timeline, evidence summary APIs
- Evidence -> validation, coverage, support, decision APIs
- Action -> queue, assignment, tracking, feedback APIs
- AI Recommendation -> recommendation support APIs
- Report Center -> report generation APIs

## 7. Component Dependency

- Shared components support all centers.
- Center pages depend on shared shell and navigation.
- Widgets depend on cards, tables, badges, charts, and filter controls.
- Drill-down components depend on context-preservation utilities.

## 8. Module Dependency

- Dashboard depends on shared navigation and KPI services.
- BCVH depends on dashboard context and shared analysis services.
- Route depends on BCVH context and shared drill-down services.
- Shipment depends on Route context and shared evidence summary services.
- Evidence depends on Shipment context and shared validation services.
- Action depends on Evidence context and shared execution services.
- Report Center depends on outputs from upstream centers.

## 9. Suggested Development Order

1. Shared foundations
2. Dashboard shell
3. BCVH center
4. Route center
5. Shipment center
6. Evidence center
7. Action center
8. AI recommendation support
9. Report Center
10. Cross-center integration hardening

## 10. Parallel Development Matrix

- Shared shell and components can run in parallel with backend scaffolding.
- BCVH and Route can run in parallel after shared foundations.
- Shipment and Evidence can run in parallel after route context is stable.
- Action can start after Evidence contracts are stable.
- AI support can run in parallel where business-approved.
- Report Center can finish after upstream outputs stabilize.

## 11. Risk Matrix

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Context mismatch across centers | High | Preserve date, BCVH, route, shipment, and evidence context consistently |
| Contract drift between FE and BE | High | Freeze API mapping and shared models early |
| Duplicate business logic in frontend | High | Keep calculations in backend or engine layer |
| Performance issues on heavy views | Medium | Reuse views, indexes, and materialization where justified |
| AI recommendation ambiguity | Medium | Separate AI support from core rules and show confidence clearly |
| Overlapping component patterns | Medium | Use shared design system and naming conventions |

## 12. Mapping with SSOT, IA, Widget Spec, Screen Architecture, UX Architecture

### SSOT

- Implementation must obey all frozen decisions.

### Information Architecture

- Each center implementation maps to frozen IA blocks.

### Widget Specification

- Each widget becomes an implementation component or container.

### Screen Architecture

- Screen zones map to page sections and component placement.

### UX Architecture

- UX goals, journeys, and interactions map to routing, state, and behavior.

