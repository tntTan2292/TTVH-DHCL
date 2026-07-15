# Feature Planning

## 1. Feature Breakdown by Epic

### EPIC-010 Authentication & Authorization

#### FEAT-0101 Login & Session Handling

- Feature ID: FEAT-0101
- Feature Name: Login & Session Handling
- Epic: EPIC-010 Authentication & Authorization
- Business Goal: Allow secure user sign-in and session continuity.
- Business Value: Protects access to QIS V2 and stabilizes entry behavior.
- Scope: Login flow, session creation, logout, session persistence.
- Dependency: SSOT access rules, implementation stack
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Authorized users can sign in and maintain a session.
- Definition of Done: Login and session flow is implemented and validated.

#### FEAT-0102 Role & Permission Guard

- Feature ID: FEAT-0102
- Feature Name: Role & Permission Guard
- Epic: EPIC-010 Authentication & Authorization
- Business Goal: Enforce role-based access to modules and actions.
- Business Value: Prevents unauthorized data access and action execution.
- Scope: Permission checks, route guards, module access rules.
- Dependency: FEAT-0101
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Users only see and perform allowed actions.
- Definition of Done: Access control is enforced consistently across modules.

### EPIC-001 Dashboard Foundation

#### FEAT-0011 Dashboard Shell

- Feature ID: FEAT-0011
- Feature Name: Dashboard Shell
- Epic: EPIC-001 Dashboard Foundation
- Business Goal: Provide the primary entry shell for QIS V2.
- Business Value: Establishes the core navigation and executive landing context.
- Scope: Page frame, header, navigation, context bar.
- Dependency: FEAT-0101, FEAT-0102, shared shell contracts
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Dashboard loads with stable shell and context area.
- Definition of Done: Dashboard shell is ready for content widgets.

#### FEAT-0012 Dashboard KPI Overview

- Feature ID: FEAT-0012
- Feature Name: Dashboard KPI Overview
- Epic: EPIC-001 Dashboard Foundation
- Business Goal: Show the top-level KPI and executive snapshot.
- Business Value: Gives leaders a fast operational readout.
- Scope: KPI cards, summary strip, status highlights.
- Dependency: FEAT-0011
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Dashboard shows frozen KPI-based summary correctly.
- Definition of Done: KPI overview is live and tied to SSOT-driven data.

### EPIC-003 Shared Components

#### FEAT-0031 Shared Card & Table Components

- Feature ID: FEAT-0031
- Feature Name: Shared Card & Table Components
- Epic: EPIC-003 Shared Components
- Business Goal: Standardize reusable data display primitives.
- Business Value: Reduces duplication and keeps visual consistency.
- Scope: Cards, tables, headers, row states, typography patterns.
- Dependency: QIS Design System
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Shared card and table patterns match design standard.
- Definition of Done: Reusable display primitives are available to all centers.

#### FEAT-0032 Shared Filter, Badge, and State Components

- Feature ID: FEAT-0032
- Feature Name: Shared Filter, Badge, and State Components
- Epic: EPIC-003 Shared Components
- Business Goal: Standardize interaction and status patterns.
- Business Value: Improves consistency in filtering, status, and loading behavior.
- Scope: Filter bar, badges, severity labels, loading/empty/error states.
- Dependency: FEAT-0031
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Shared controls behave consistently across pages.
- Definition of Done: Shared controls are ready for use by all center screens.

### EPIC-002 BCVH Performance Center

#### FEAT-0021 BCVH Executive Brief

- Feature ID: FEAT-0021
- Feature Name: BCVH Executive Brief
- Epic: EPIC-002 BCVH Performance Center
- Business Goal: Provide a concise BCVH leadership summary.
- Business Value: Accelerates executive understanding of BCVH status.
- Scope: Brief header, summary, key signal block.
- Dependency: FEAT-0011, FEAT-0012, FEAT-0031
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Executive brief appears first and matches the frozen IA.
- Definition of Done: BCVH brief is available on the BCVH page.

#### FEAT-0022 BCVH Analysis Widgets

- Feature ID: FEAT-0022
- Feature Name: BCVH Analysis Widgets
- Epic: EPIC-002 BCVH Performance Center
- Business Goal: Show BCVH health, priority, trend, and root cause.
- Business Value: Supports executive analysis and prioritization.
- Scope: Health overview, priority list, trend, RCA summary, recommendation.
- Dependency: FEAT-0031, FEAT-0032
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Analysis widgets render and preserve BCVH context.
- Definition of Done: BCVH analysis section is complete.

#### FEAT-0023 BCVH Drill-down Entry

- Feature ID: FEAT-0023
- Feature Name: BCVH Drill-down Entry
- Epic: EPIC-002 BCVH Performance Center
- Business Goal: Move leaders from BCVH summary to deeper analysis.
- Business Value: Shortens time from detection to investigation.
- Scope: Drill-down buttons and context handoff.
- Dependency: FEAT-0021, FEAT-0022
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Drill-down preserves context and opens the next center correctly.
- Definition of Done: BCVH drill-down is functional.

### EPIC-004 Route Performance Center

#### FEAT-0041 Route Executive Brief

- Feature ID: FEAT-0041
- Feature Name: Route Executive Brief
- Epic: EPIC-004 Route Performance Center
- Business Goal: Provide route-level operating summary.
- Business Value: Helps leaders focus on route impact quickly.
- Scope: Route brief and summary banner.
- Dependency: FEAT-0023, FEAT-0031, FEAT-0032
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Route summary appears with preserved BCVH context.
- Definition of Done: Route brief is available and connected to drill-down.

#### FEAT-0042 Route Analysis Widgets

- Feature ID: FEAT-0042
- Feature Name: Route Analysis Widgets
- Epic: EPIC-004 Route Performance Center
- Business Goal: Show route impact, trend, RCA, and recommendation.
- Business Value: Supports route prioritization and problem isolation.
- Scope: Impact overview, priority list, trend, RCA summary, recommendation.
- Dependency: FEAT-0031, FEAT-0032
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Route analysis widgets render the route IA correctly.
- Definition of Done: Route analysis section is complete.

#### FEAT-0043 Shipment Drill-down Entry

- Feature ID: FEAT-0043
- Feature Name: Shipment Drill-down Entry
- Epic: EPIC-004 Route Performance Center
- Business Goal: Open shipment-level context from route analysis.
- Business Value: Supports direct progression from route to shipment.
- Scope: Shipment drill-down trigger and context pass-through.
- Dependency: FEAT-0041, FEAT-0042
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Shipment drill-down opens with the correct route context.
- Definition of Done: Route-to-shipment drill-down is ready.

### EPIC-005 Shipment Performance Center

#### FEAT-0051 Shipment Executive Brief

- Feature ID: FEAT-0051
- Feature Name: Shipment Executive Brief
- Epic: EPIC-005 Shipment Performance Center
- Business Goal: Provide shipment-level summary and focus area.
- Business Value: Helps identify concrete shipment cases.
- Scope: Shipment brief and summary strip.
- Dependency: FEAT-0043
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Shipment summary renders with route context.
- Definition of Done: Shipment brief is available.

#### FEAT-0052 Shipment Analysis Widgets

- Feature ID: FEAT-0052
- Feature Name: Shipment Analysis Widgets
- Epic: EPIC-005 Shipment Performance Center
- Business Goal: Show shipment impact, timeline, and evidence summary.
- Business Value: Enables focused case investigation.
- Scope: Impact overview, timeline, evidence summary, recommendation.
- Dependency: FEAT-0031, FEAT-0032
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Shipment analysis matches frozen IA and screen architecture.
- Definition of Done: Shipment analysis section is complete.

#### FEAT-0053 Evidence Drill-down Entry

- Feature ID: FEAT-0053
- Feature Name: Evidence Drill-down Entry
- Epic: EPIC-005 Shipment Performance Center
- Business Goal: Move from shipment context into evidence validation.
- Business Value: Bridges analysis and verification.
- Scope: Evidence drill-down trigger and context handoff.
- Dependency: FEAT-0051, FEAT-0052
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Evidence drill-down works with preserved shipment context.
- Definition of Done: Shipment-to-evidence drill-down is ready.

### EPIC-006 Evidence Center

#### FEAT-0061 Evidence Validation Views

- Feature ID: FEAT-0061
- Feature Name: Evidence Validation Views
- Epic: EPIC-006 Evidence Center
- Business Goal: Validate the evidence base for analysis.
- Business Value: Improves trust and traceability.
- Scope: Coverage, validation, supporting evidence, rule validation.
- Dependency: FEAT-0053
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Evidence validation views work against frozen data contracts.
- Definition of Done: Evidence validation section is complete.

#### FEAT-0062 Evidence Decision Support

- Feature ID: FEAT-0062
- Feature Name: Evidence Decision Support
- Epic: EPIC-006 Evidence Center
- Business Goal: Summarize verified evidence for decisions.
- Business Value: Makes decision support traceable.
- Scope: RCA evidence, decision support, evidence summary.
- Dependency: FEAT-0061
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Evidence outputs support decision-making without creating new rules.
- Definition of Done: Evidence decision support is complete.

### EPIC-007 Action Center

#### FEAT-0071 Action Queue & Ownership

- Feature ID: FEAT-0071
- Feature Name: Action Queue & Ownership
- Epic: EPIC-007 Action Center
- Business Goal: Turn decisions into owned actions.
- Business Value: Establishes accountability.
- Scope: Decision queue, assignment, owner mapping.
- Dependency: FEAT-0062
- Priority: High
- Estimated Complexity: Medium
- Acceptance Criteria: Actions can be assigned and tracked by owner.
- Definition of Done: Action queue and ownership are ready.

#### FEAT-0072 Execution Tracking & Feedback

- Feature ID: FEAT-0072
- Feature Name: Execution Tracking & Feedback
- Epic: EPIC-007 Action Center
- Business Goal: Close the loop from action to result.
- Business Value: Improves operational follow-through.
- Scope: Tracking, status updates, feedback, history.
- Dependency: FEAT-0071
- Priority: High
- Estimated Complexity: High
- Acceptance Criteria: Action progress and feedback are visible and auditable.
- Definition of Done: Execution tracking and feedback are complete.

### EPIC-008 AI Recommendation

#### FEAT-0081 AI Recommendation Output

- Feature ID: FEAT-0081
- Feature Name: AI Recommendation Output
- Epic: EPIC-008 AI Recommendation Engine
- Business Goal: Provide advisory recommendations.
- Business Value: Improves speed of analysis and prioritization.
- Scope: Recommendation generation, confidence, explanation.
- Dependency: FEAT-0022, FEAT-0042, FEAT-0052, SSOT approval
- Priority: Medium
- Estimated Complexity: High
- Acceptance Criteria: Recommendations remain advisory and do not alter frozen rules.
- Definition of Done: AI recommendation output is available and controlled.

### EPIC-009 Report Center

#### FEAT-0091 Consolidated Reporting

- Feature ID: FEAT-0091
- Feature Name: Consolidated Reporting
- Epic: EPIC-009 Report Center
- Business Goal: Provide summarized operational reporting.
- Business Value: Supports executive review and periodic reporting.
- Scope: Report views, summary generation, export outputs.
- Dependency: FEAT-0022, FEAT-0042, FEAT-0052, FEAT-0062, FEAT-0072
- Priority: Medium
- Estimated Complexity: Medium
- Acceptance Criteria: Reports reflect upstream center outputs consistently.
- Definition of Done: Reporting outputs are available and aligned with SSOT.

## 2. Feature Dependency Matrix

| Feature | Depends On | Parallel With |
| --- | --- | --- |
| FEAT-0101 | SSOT access rules | FEAT-0031 prep |
| FEAT-0102 | FEAT-0101 | FEAT-0011 setup |
| FEAT-0011 | FEAT-0101, FEAT-0102 | FEAT-0031 |
| FEAT-0012 | FEAT-0011 | FEAT-0031, FEAT-0032 |
| FEAT-0031 | QIS Design System | FEAT-0101 |
| FEAT-0032 | FEAT-0031 | FEAT-0011 |
| FEAT-0021 | FEAT-0011, FEAT-0012, FEAT-0031 | FEAT-0023 prep |
| FEAT-0022 | FEAT-0031, FEAT-0032 | FEAT-0041 prep |
| FEAT-0023 | FEAT-0021, FEAT-0022 | FEAT-0041 prep |
| FEAT-0041 | FEAT-0023, FEAT-0031, FEAT-0032 | FEAT-0042 prep |
| FEAT-0042 | FEAT-0031, FEAT-0032 | FEAT-0041 prep |
| FEAT-0043 | FEAT-0041, FEAT-0042 | FEAT-0051 prep |
| FEAT-0051 | FEAT-0043 | FEAT-0052 prep |
| FEAT-0052 | FEAT-0031, FEAT-0032 | FEAT-0051 prep |
| FEAT-0053 | FEAT-0051, FEAT-0052 | FEAT-0061 prep |
| FEAT-0061 | FEAT-0053 | FEAT-0062 prep |
| FEAT-0062 | FEAT-0061 | FEAT-0071 prep |
| FEAT-0071 | FEAT-0062 | FEAT-0072 prep |
| FEAT-0072 | FEAT-0071 | FEAT-0081 prep |
| FEAT-0081 | FEAT-0022, FEAT-0042, FEAT-0052, SSOT approval | FEAT-0091 prep |
| FEAT-0091 | FEAT-0022, FEAT-0042, FEAT-0052, FEAT-0062, FEAT-0072 | None |

## 3. Mapping with Widget, Screen, and UX Architecture

- FEAT-0101, FEAT-0102 map to shared system and access UX, not to center-specific widgets.
- FEAT-0011 maps to Dashboard shell widgets and dashboard screen zones.
- FEAT-0012 maps to Dashboard summary widgets and executive UX.
- FEAT-0031 and FEAT-0032 map to shared widget standards, screen layouts, and UX interaction patterns.
- FEAT-0021, FEAT-0022, FEAT-0023 map to BCVH widget, screen, and UX layers.
- FEAT-0041, FEAT-0042, FEAT-0043 map to Route widget, screen, and UX layers.
- FEAT-0051, FEAT-0052, FEAT-0053 map to Shipment widget, screen, and UX layers.
- FEAT-0061, FEAT-0062 map to Evidence widget, screen, and UX layers.
- FEAT-0071, FEAT-0072 map to Action widget, screen, and UX layers.
- FEAT-0081 maps to recommendation widgets and decision-support UX.
- FEAT-0091 maps to report screen layouts and output UX.

## 4. Planning Notes

- Features are intentionally small enough to become sprint tickets.
- Foundation features must be completed before dependent center features.
- Shared components and access control can progress in parallel to reduce blocking.
- Reporting and AI are deferred until upstream decision-support features are stable.

