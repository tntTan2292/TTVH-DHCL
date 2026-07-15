# QIS Design System

## 1. Design Philosophy

QIS V2 is a decision support system, so the design system must prioritize clarity, hierarchy, and context preservation.

Principles:

- Decision-first presentation.
- Evidence-visible design.
- Progressive disclosure.
- Context-preserving navigation.
- Consistent components across all Centers.
- Desktop-first, dashboard-grade readability.

## 2. Grid System

- Use a stable 12-column grid for main layouts.
- Use full-width container on desktop dashboards.
- Use consistent spacing tokens across all Centers.
- Maintain predictable alignment for summary, list, and detail sections.

## 3. Layout Standard

- Header zone: title, context, and primary actions.
- Summary zone: executive information first.
- Analysis zone: priority, trend, and root cause.
- Detail zone: supporting evidence and drill-down targets.
- Action zone: recommendation, assignment, and next steps.

## 4. Card Standard

- Cards are the core visual container.
- Each card must answer one question.
- Cards must not duplicate content across adjacent cards.
- Cards must have clear title, body, and optional footer.

## 5. KPI Card Standard

- KPI cards show one metric, one state, one trend.
- KPI cards must support quick scanning.
- KPI cards must not become reports.
- KPI cards should expose deltas or status where relevant.

## 6. AI Insight Card

- Shows generated insight or guided interpretation.
- Must clearly distinguish evidence from interpretation.
- Should carry confidence or caution if available.
- Must not replace evidence or decision ownership.

## 7. Recommendation Card

- Shows a suggested next action.
- Must be clearly linked to the evidence or insight that supports it.
- Must not hide the owner or decision target.
- Must be actionable, not descriptive.

## 8. Severity Color Standard

- Critical: high urgency, immediate attention.
- High: important and likely to need action soon.
- Medium: monitor and track.
- Low: stable or informational.

Color use must be consistent across all Centers.

## 9. Status Badge Standard

- Badges represent discrete states.
- Badge text must be short and direct.
- Status semantics must remain stable across QIS.
- Status badges must not overload with multiple meanings.

## 10. Chart Standard

- Charts must support decision-making, not decoration.
- Each chart must have a single primary message.
- Use minimal clutter and consistent legends.
- Charts should be easy to read in dashboard context.

## 11. Table Standard

- Tables are for comparison, ranking, and detail review.
- Column order must follow business importance.
- Summary rows must be visually distinct.
- Table interactions must preserve context.

## 12. Timeline Standard

- Timelines show change over time.
- They must expose key events and turning points.
- They should support evidence review and decision tracing.

## 13. Filter Bar Standard

- Filters must be visible and persistent.
- Date filter is a first-class control.
- Filter changes should preserve current context where possible.
- Filters must not obscure the main decision content.

## 14. Drill-down Button Standard

- Drill-down buttons must clearly signal the next level.
- Labels should describe the destination or purpose.
- Drill-down must preserve context.
- Drill-down must not feel like a generic navigation action.

## 15. Empty State

- Empty states must explain why nothing is shown.
- Empty states should suggest the next useful action if possible.
- Empty states must not feel like an error unless it is one.

## 16. Loading State

- Loading must be visible and calm.
- Loading should indicate that data is being prepared.
- Loading should preserve layout stability where possible.

## 17. Error State

- Error states must explain what failed.
- Error states should offer a retry path when appropriate.
- Error states must not expose unnecessary technical noise.

## 18. Responsive Rules

- Desktop-first by default.
- Priority information must remain readable on smaller screens.
- Reduce density before removing meaning.
- Maintain cross-center consistency across breakpoints.

## 19. Component Naming Convention

- Use descriptive names based on business purpose.
- Prefer `Executive`, `Overview`, `Priority`, `Summary`, `Trend`, `Recommendation`, `History`, `Tracking`.
- Keep naming consistent with IA and Widget specs.

## 20. Mapping giữa Component và EIDAF

### Evidence-related components

- Evidence summary
- timeline
- validation
- status evidence

### Insight-related components

- brief
- overview
- trend
- analysis

### Decision-related components

- priority list
- recommendation
- decision queue
- drill-down trigger

### Action-related components

- assignment
- tracking
- follow-up
- action history

### Feedback-related components

- follow-up
- closure state
- outcome history

