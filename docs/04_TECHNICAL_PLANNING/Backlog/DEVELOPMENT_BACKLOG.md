# Development Backlog

## 1. Backlog Structure

### Mandatory Ticket Metadata

Every future ticket definition must include:

- PO UI Check Required
- Decision reason
- PO Product Status
- Affected Module
- Affected Screen / Menu
- Route / URL
- UI Components Affected
- Business Impact
- Expected Visible Result
- PO Checkpoint
- PO Checklist
- Blocking Issue
- Related PO Findings
- Responsible Fix / Future Ticket
- Next Ticket
- Evidence
- Commit
- Final Completion Status

Status values:

- Technical Status: `NOT STARTED / IN PROGRESS / PASS / FAIL`
- Runtime Status: `NOT REQUIRED / NOT STARTED / IN PROGRESS / PASS / FAIL`
- PO Product Status: `NOT REQUIRED / NOT READY / READY FOR PO CHECK / PO PASS / PO WARNING / PO FAIL`
- Final Completion Status: `NOT STARTED / IN PROGRESS / TECHNICAL PASS / RUNTIME PASS / READY FOR PO CHECK / RECOVERY REQUIRED / MODULE COMPLETED`

PO applicability rule:

- `Yes` when a ticket creates or changes visible UI, navigation, runtime data, labels, tables, charts, filters, drill-down, or user workflow.
- `No` only when the work is internal and has no independently observable product change.

PO findings traceability:

- if PO reports an issue, link it to the responsible ticket or recovery path
- never close a finding by build PASS alone
- record the PO recheck point before closure

### TICKET-0101 Login API and Session

- Ticket ID: TICKET-0101
- Ticket Name: Login API and Session
- Feature: FEAT-0101 Login & Session Handling
- Epic: EPIC-010 Authentication & Authorization
- Release: V2.0 Foundation
- Layer: Backend / Shared
- Business Goal: Secure user sign-in and persistent session handling.
- Scope: Auth endpoint, session lifecycle, logout handling.
- Dependency: SSOT access rules, auth service scaffold
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Login succeeds for valid users and maintains session state.
- Runtime Acceptance Criteria: User can log in and retain authenticated state across page refresh.
- Definition of Done: Auth flow is implemented, tested, and runtime-validated.

### TICKET-0102 Access Guard and Route Protection

- Ticket ID: TICKET-0102
- Ticket Name: Access Guard and Route Protection
- Feature: FEAT-0102 Role & Permission Guard
- Epic: EPIC-010 Authentication & Authorization
- Release: V2.0 Foundation
- Layer: Frontend / Shared
- Business Goal: Restrict modules and actions based on role.
- Scope: Route guard, module guard, action guard.
- Dependency: TICKET-0101
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Unauthorized access is blocked consistently.
- Runtime Acceptance Criteria: Protected routes and modules are inaccessible without the right role.
- Definition of Done: Guards are active across the app and verified at runtime.

### TICKET-0011 Dashboard Shell

- Ticket ID: TICKET-0011
- Ticket Name: Dashboard Shell
- Feature: FEAT-0011 Dashboard Shell
- Epic: EPIC-001 Dashboard Foundation
- Release: V2.0 Foundation
- Layer: Frontend / Shared
- Business Goal: Provide the primary QIS entry shell.
- Scope: App shell, navigation, context bar, layout framing.
- Dependency: TICKET-0102, shared shell scaffold
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Dashboard shell renders and preserves center context.
- Runtime Acceptance Criteria: Shell loads without layout breakage and supports navigation.
- Definition of Done: Dashboard shell is runtime-ready.

### TICKET-0012 Dashboard KPI Overview

- Ticket ID: TICKET-0012
- Ticket Name: Dashboard KPI Overview
- Feature: FEAT-0012 Dashboard KPI Overview
- Epic: EPIC-001 Dashboard Foundation
- Release: V2.0 Foundation
- Layer: Frontend / Backend
- Business Goal: Show executive KPI snapshot.
- Scope: KPI cards, summary strip, top-level status blocks.
- Dependency: TICKET-0011, dashboard API contracts
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Dashboard KPI renders on frozen data.
- Runtime Acceptance Criteria: KPI values match runtime source and update correctly.
- Definition of Done: KPI overview is implemented and runtime-validated.

### TICKET-0031 Shared Cards and Tables

- Ticket ID: TICKET-0031
- Ticket Name: Shared Cards and Tables
- Feature: FEAT-0031 Shared Card & Table Components
- Epic: EPIC-003 Shared Components
- Release: V2.0 Foundation
- Layer: Shared
- Business Goal: Standardize core data display components.
- Scope: Card, table, row state, typography primitives.
- Dependency: QIS Design System
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Shared cards and tables match design rules.
- Runtime Acceptance Criteria: Components render consistently across centers.
- Definition of Done: Shared display components are available for reuse.

### TICKET-0032 Shared Filters Badges and States

- Ticket ID: TICKET-0032
- Ticket Name: Shared Filters Badges and States
- Feature: FEAT-0032 Shared Filter, Badge, and State Components
- Epic: EPIC-003 Shared Components
- Release: V2.0 Foundation
- Layer: Shared
- Business Goal: Standardize interaction and state patterns.
- Scope: Filter bar, badges, loading, empty, and error states.
- Dependency: TICKET-0031
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Shared interaction components work across all pages.
- Runtime Acceptance Criteria: Loading, empty, and error behavior is uniform.
- Definition of Done: Shared control components are runtime-ready.

### TICKET-0021 BCVH Executive Brief

- Ticket ID: TICKET-0021
- Ticket Name: BCVH Executive Brief
- Feature: FEAT-0021 BCVH Executive Brief
- Epic: EPIC-002 BCVH Performance Center
- Release: V2.0 Foundation
- Layer: Frontend
- Business Goal: Present the BCVH executive summary.
- Scope: Brief section, summary header, top signal display.
- Dependency: TICKET-0011, TICKET-0012, TICKET-0031
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: BCVH brief renders first in the center.
- Runtime Acceptance Criteria: BCVH brief displays runtime data and context correctly.
- Definition of Done: BCVH brief is runtime-verified.

### TICKET-0022 BCVH Analysis Widgets

- Ticket ID: TICKET-0022
- Ticket Name: BCVH Analysis Widgets
- Feature: FEAT-0022 BCVH Analysis Widgets
- Epic: EPIC-002 BCVH Performance Center
- Release: V2.0 Foundation
- Layer: Frontend / Backend
- Business Goal: Show health, priority, trend, RCA, and recommendation.
- Scope: Analysis widgets and data presentation.
- Dependency: TICKET-0031, TICKET-0032
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Analysis widgets match frozen widget and screen specs.
- Runtime Acceptance Criteria: Widgets consume runtime APIs and render accurate values.
- Definition of Done: BCVH analysis widgets are fully integrated.

### TICKET-0023 BCVH Drill-down

- Ticket ID: TICKET-0023
- Ticket Name: BCVH Drill-down
- Feature: FEAT-0023 BCVH Drill-down Entry
- Epic: EPIC-002 BCVH Performance Center
- Release: V2.0 Foundation
- Layer: Frontend / Shared
- Business Goal: Move from BCVH summary to deeper analysis.
- Scope: Drill-down action, context handoff, navigation.
- Dependency: TICKET-0021, TICKET-0022
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Drill-down preserves context and opens the next center.
- Runtime Acceptance Criteria: Drill-down navigation keeps the active context.
- Definition of Done: BCVH drill-down is runtime-ready.

### TICKET-0041 Route Executive Brief

- Ticket ID: TICKET-0041
- Ticket Name: Route Executive Brief
- Feature: FEAT-0041 Route Executive Brief
- Epic: EPIC-004 Route Performance Center
- Release: V2.1 Decision Support
- Layer: Frontend
- Business Goal: Present route-level summary.
- Scope: Route brief and summary banner.
- Dependency: TICKET-0023, TICKET-0031, TICKET-0032
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Route brief renders with BCVH context.
- Runtime Acceptance Criteria: Route brief displays runtime route data correctly.
- Definition of Done: Route brief is runtime-verified.

### TICKET-0042 Route Analysis Widgets

- Ticket ID: TICKET-0042
- Ticket Name: Route Analysis Widgets
- Feature: FEAT-0042 Route Analysis Widgets
- Epic: EPIC-004 Route Performance Center
- Release: V2.1 Decision Support
- Layer: Frontend / Backend
- Business Goal: Show route impact, trend, RCA, and recommendation.
- Scope: Route widgets and data mapping.
- Dependency: TICKET-0031, TICKET-0032
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Route widgets match the frozen IA and UX.
- Runtime Acceptance Criteria: Route widgets consume runtime APIs correctly.
- Definition of Done: Route analysis widgets are complete.

### TICKET-0043 Shipment Drill-down

- Ticket ID: TICKET-0043
- Ticket Name: Shipment Drill-down
- Feature: FEAT-0043 Shipment Drill-down Entry
- Epic: EPIC-004 Route Performance Center
- Release: V2.1 Decision Support
- Layer: Frontend / Shared
- Business Goal: Open shipment context from route analysis.
- Scope: Shipment drill-down trigger and handoff.
- Dependency: TICKET-0041, TICKET-0042
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Shipment drill-down opens with correct route context.
- Runtime Acceptance Criteria: Shipment drill-down routes correctly at runtime.
- Definition of Done: Shipment drill-down is runtime-ready.

### TICKET-0051 Shipment Executive Brief

- Ticket ID: TICKET-0051
- Ticket Name: Shipment Executive Brief
- Feature: FEAT-0051 Shipment Executive Brief
- Epic: EPIC-005 Shipment Performance Center
- Release: V2.1 Decision Support
- Layer: Frontend
- Business Goal: Present shipment summary.
- Scope: Shipment brief and focus strip.
- Dependency: TICKET-0043
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Shipment summary renders with route context.
- Runtime Acceptance Criteria: Shipment brief displays runtime shipment data.
- Definition of Done: Shipment brief is runtime-verified.

### TICKET-0052 Shipment Analysis Widgets

- Ticket ID: TICKET-0052
- Ticket Name: Shipment Analysis Widgets
- Feature: FEAT-0052 Shipment Analysis Widgets
- Epic: EPIC-005 Shipment Performance Center
- Release: V2.1 Decision Support
- Layer: Frontend / Backend
- Business Goal: Show shipment impact, timeline, and evidence summary.
- Scope: Shipment widgets and data mapping.
- Dependency: TICKET-0031, TICKET-0032
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Shipment analysis matches frozen IA and screen architecture.
- Runtime Acceptance Criteria: Shipment widgets consume runtime APIs correctly.
- Definition of Done: Shipment analysis widgets are complete.

### TICKET-0053 Evidence Drill-down

- Ticket ID: TICKET-0053
- Ticket Name: Evidence Drill-down
- Feature: FEAT-0053 Evidence Drill-down Entry
- Epic: EPIC-005 Shipment Performance Center
- Release: V2.1 Decision Support
- Layer: Frontend / Shared
- Business Goal: Move from shipment context into evidence validation.
- Scope: Evidence drill-down trigger and context handoff.
- Dependency: TICKET-0051, TICKET-0052
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Evidence drill-down works with preserved shipment context.
- Runtime Acceptance Criteria: Evidence drill-down opens the evidence center correctly.
- Definition of Done: Shipment-to-evidence drill-down is ready.

### TICKET-0061 Evidence Validation Views

- Ticket ID: TICKET-0061
- Ticket Name: Evidence Validation Views
- Feature: FEAT-0061 Evidence Validation Views
- Epic: EPIC-006 Evidence Center
- Release: V2.1 Decision Support
- Layer: Frontend / Backend
- Business Goal: Validate the evidence base for analysis.
- Scope: Coverage, validation, supporting evidence, rule validation.
- Dependency: TICKET-0053
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Evidence validation views work against frozen contracts.
- Runtime Acceptance Criteria: Evidence views render runtime evidence without rule drift.
- Definition of Done: Evidence validation views are complete.

### TICKET-0062 Evidence Decision Support

- Ticket ID: TICKET-0062
- Ticket Name: Evidence Decision Support
- Feature: FEAT-0062 Evidence Decision Support
- Epic: EPIC-006 Evidence Center
- Release: V2.1 Decision Support
- Layer: Frontend / Backend
- Business Goal: Summarize verified evidence for decisions.
- Scope: RCA evidence, decision support, evidence summary.
- Dependency: TICKET-0061
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Evidence outputs support decision-making without creating new rules.
- Runtime Acceptance Criteria: Evidence summary matches runtime source and contract.
- Definition of Done: Evidence decision support is complete.

### TICKET-0071 Action Queue and Ownership

- Ticket ID: TICKET-0071
- Ticket Name: Action Queue and Ownership
- Feature: FEAT-0071 Action Queue & Ownership
- Epic: EPIC-007 Action Center
- Release: V2.1 Decision Support
- Layer: Frontend / Backend
- Business Goal: Turn decisions into owned actions.
- Scope: Decision queue, assignment, owner mapping.
- Dependency: TICKET-0062
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Actions can be assigned and tracked by owner.
- Runtime Acceptance Criteria: Ownership and queue data persist and render correctly.
- Definition of Done: Action queue and ownership are ready.

### TICKET-0072 Execution Tracking and Feedback

- Ticket ID: TICKET-0072
- Ticket Name: Execution Tracking and Feedback
- Feature: FEAT-0072 Execution Tracking & Feedback
- Epic: EPIC-007 Action Center
- Release: V2.1 Decision Support
- Layer: Frontend / Backend
- Business Goal: Close the loop from action to result.
- Scope: Tracking, status updates, feedback, history.
- Dependency: TICKET-0071
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Action progress and feedback are visible and auditable.
- Runtime Acceptance Criteria: Status changes and feedback persist in runtime.
- Definition of Done: Execution tracking and feedback are complete.

### TICKET-0081 AI Recommendation Output

- Ticket ID: TICKET-0081
- Ticket Name: AI Recommendation Output
- Feature: FEAT-0081 AI Recommendation Output
- Epic: EPIC-008 AI Recommendation Engine
- Release: V2.2 AI Intelligence
- Layer: AI / Backend
- Business Goal: Provide advisory recommendations.
- Scope: Recommendation generation, confidence, explanation.
- Dependency: TICKET-0022, TICKET-0042, TICKET-0052, SSOT approval
- Priority: Medium
- Estimated Complexity: High
- Acceptance Criteria: Recommendations remain advisory and do not alter frozen rules.
- Runtime Acceptance Criteria: AI output is generated and displayed without overriding business logic.
- Definition of Done: AI recommendation output is available and controlled.

### TICKET-0091 Consolidated Reporting

- Ticket ID: TICKET-0091
- Ticket Name: Consolidated Reporting
- Feature: FEAT-0091 Consolidated Reporting
- Epic: EPIC-009 Report Center
- Release: V2.3 Operational Excellence
- Layer: Frontend / Backend
- Business Goal: Provide summarized operational reporting.
- Scope: Report views, summary generation, export outputs.
- Dependency: TICKET-0022, TICKET-0042, TICKET-0052, TICKET-0062, TICKET-0072
- Priority: Medium
- Estimated Complexity: Medium
- Acceptance Criteria: Reports reflect upstream center outputs consistently.
- Runtime Acceptance Criteria: Reports match runtime data and export correctly.
- Definition of Done: Reporting outputs are available and aligned with SSOT.

## 2. Development Queue for Codex

### Blocker Tickets

- `TICKET-0101`
- `TICKET-0031`

### Recommended Implementation Order

1. `TICKET-0101` Login API and Session
2. `TICKET-0102` Access Guard and Route Protection
3. `TICKET-0031` Shared Cards and Tables
4. `TICKET-0032` Shared Filters Badges and States
5. `TICKET-0011` Dashboard Shell
6. `TICKET-0012` Dashboard KPI Overview
7. `TICKET-0021` BCVH Executive Brief
8. `TICKET-0022` BCVH Analysis Widgets
9. `TICKET-0023` BCVH Drill-down
10. `TICKET-0041` Route Executive Brief
11. `TICKET-0042` Route Analysis Widgets
12. `TICKET-0043` Shipment Drill-down
13. `TICKET-0051` Shipment Executive Brief
14. `TICKET-0052` Shipment Analysis Widgets
15. `TICKET-0053` Evidence Drill-down
16. `TICKET-0061` Evidence Validation Views
17. `TICKET-0062` Evidence Decision Support
18. `TICKET-0071` Action Queue and Ownership
19. `TICKET-0072` Execution Tracking and Feedback
20. `TICKET-0081` AI Recommendation Output
21. `TICKET-0091` Consolidated Reporting

## 3. Parallel Development Matrix

| Ticket | Parallel With |
| --- | --- |
| TICKET-0101 | TICKET-0031 prep |
| TICKET-0102 | TICKET-0011 prep |
| TICKET-0031 | TICKET-0101 prep |
| TICKET-0032 | TICKET-0011 prep |
| TICKET-0011 | TICKET-0031 |
| TICKET-0012 | TICKET-0032 |
| TICKET-0021 | TICKET-0022 prep |
| TICKET-0022 | TICKET-0021 prep |
| TICKET-0023 | TICKET-0041 prep |
| TICKET-0041 | TICKET-0042 prep |
| TICKET-0042 | TICKET-0041 prep |
| TICKET-0043 | TICKET-0051 prep |
| TICKET-0051 | TICKET-0052 prep |
| TICKET-0052 | TICKET-0051 prep |
| TICKET-0053 | TICKET-0061 prep |
| TICKET-0061 | TICKET-0062 prep |
| TICKET-0062 | TICKET-0071 prep |
| TICKET-0071 | TICKET-0072 prep |
| TICKET-0072 | TICKET-0081 prep |
| TICKET-0081 | TICKET-0091 prep |
| TICKET-0091 | None |

## 4. Mapping with Feature, Widget, UX, API, Database, Components

- `TICKET-0101` and `TICKET-0102` map to shared access behavior and auth APIs.
- `TICKET-0011` and `TICKET-0012` map to Dashboard features, widgets, UX, and summary APIs.
- `TICKET-0031` and `TICKET-0032` map to shared widget standards, screen layouts, and reusable components.
- `TICKET-0021`, `TICKET-0022`, `TICKET-0023` map to BCVH features, widgets, UX, and BCVH APIs.
- `TICKET-0041`, `TICKET-0042`, `TICKET-0043` map to Route features, widgets, UX, and route APIs.
- `TICKET-0051`, `TICKET-0052`, `TICKET-0053` map to Shipment features, widgets, UX, and shipment APIs.
- `TICKET-0061`, `TICKET-0062` map to Evidence features, widgets, UX, and evidence APIs.
- `TICKET-0071`, `TICKET-0072` map to Action features, widgets, UX, and action APIs.
- `TICKET-0081` maps to AI feature flow, recommendation components, and AI endpoints.
- `TICKET-0091` maps to reporting views, export components, and report APIs.
