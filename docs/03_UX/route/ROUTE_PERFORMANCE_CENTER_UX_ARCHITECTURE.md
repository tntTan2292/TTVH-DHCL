# Route Performance Center UX Architecture

## 1. UX Goals

Route Performance Center UX phải giúp lãnh đạo nhìn đúng tuyến đang ảnh hưởng đến BCVH, hiểu nhanh nguyên nhân và quyết định drill-down sang Shipment khi cần.

UX goals:

- Executive-first route scanning.
- Decision-first route prioritization.
- Progressive drill-down from BCVH to Shipment.
- Context-preserving navigation.
- Low cognitive load with clear route-focused hierarchy.
- Consistent interaction with BCVH and Shipment screens.

## 2. User Journey

### Journey 1: Route Scan

1. Open Route Performance Center from BCVH drill-down.
2. Read route executive brief.
3. Identify impacted routes.
4. Decide whether to stop, investigate, or drill down to Shipment.

### Journey 2: Route Investigation

1. Select a priority route.
2. Review impact overview and trend.
3. Review root cause summary.
4. Read recommendation.
5. Decide whether shipment-level verification is needed.

### Journey 3: Shipment Drill-down

1. Trigger shipment drill-down from a route.
2. Preserve date, BCVH, and route context.
3. Move to Shipment Performance Center.
4. Continue investigation at shipment level.

## 3. Wireflow

`BCVH Performance Center`

↓

`Route Performance Center`

↓

`Priority Route Selection`

↓

`Trend + Root Cause + Recommendation`

↓

`Shipment Drill-down Trigger`

↓

`Shipment Performance Center`

UX rule:

- The user should keep BCVH and route context throughout the journey.

## 4. Screen Layout

The UX layout follows the frozen Screen Architecture:

- Header area for title, context, and filter controls.
- Executive area for route brief and impact overview.
- Analysis area for priority list, trend, and root cause.
- Recommendation area for action guidance.
- Drill-down area for transition to Shipment.

Layout intent:

- Top of screen answers "which routes matter?"
- Middle of screen answers "why do they matter?"
- Bottom of screen answers "what should we do next?"

## 5. Navigation

- Primary navigation: BCVH -> Route -> Shipment.
- In-page navigation: select route to reveal deeper context.
- Drill-down navigation: preserve date, BCVH, and route context.
- Back navigation: return to prior level with the same context.
- Filter navigation: changing date refreshes the current route context without resetting user intent.

## 6. Interaction Details

- Selecting a route updates trend and root cause context.
- Recommendation becomes more specific after route selection.
- Drill-down button activates only when shipment-level verification is meaningful.
- Filter bar changes should refresh the visible route view in a controlled way.
- Back action should restore previous selection and selected context when possible.

## 7. Empty State

- Show when no route matches the current filter or search.
- Explain that no route data is available for the selected context.
- Suggest changing the date filter or search term.
- Do not present an error if the data simply does not exist.

## 8. Loading State

- Show while route context and analysis are being prepared.
- Keep layout stable.
- Preserve filter and selected context visibility during loading.

## 9. Error State

- Show when route data cannot be loaded or validated.
- Explain the failure in plain language.
- Offer retry.
- Keep current filter context visible if available.

## 10. Micro Interaction

- Selected route should be clearly emphasized.
- Priority list selection should animate in route-specific detail.
- Drill-down button should clearly indicate shipment transition.
- Hover and focus states must be obvious and stable.
- State changes should be subtle and fast, not decorative.

## 11. Accessibility

- Keyboard navigation must cover all actions.
- Focus indicators must be visible.
- Contrast must remain readable.
- Labels must be explicit about route and shipment transitions.
- Screen reader text should describe the route context and drill-down purpose.

## 12. Responsive Behavior

- Desktop-first is the default.
- On smaller screens, preserve reading order and route context.
- Reduce density before removing meaning.
- Recommendation and drill-down must stay accessible.

## 13. UX Checklist

- Executive brief is visible first.
- Priority route list is easy to scan.
- Selected route state is obvious.
- Trend and root cause are easy to access.
- Recommendation is actionable.
- Drill-down keeps BCVH and route context.
- Empty/loading/error states are understandable.
- Keyboard and focus behavior are usable.
- Layout follows the frozen screen architecture.

## 14. Mapping với Screen Architecture, Widget Specification, EIDAF

### Screen Architecture

- Header Zone -> filters and context.
- Executive Zone -> route brief and impact overview.
- Route Analysis Zone -> priority, trend, root cause.
- Recommendation Zone -> recommendation.
- Shipment Drill-down Zone -> shipment transition.

### Widget Specification

- Route Executive Brief Widget -> top-level scan.
- Route Impact Overview Widget -> route impact.
- Route Priority List Widget -> selection and prioritization.
- Route Trend Widget -> time-based understanding.
- Route Root Cause Summary Widget -> explanation.
- Route Recommendation Widget -> next step.
- Shipment Drill-down Trigger Widget -> navigation to Shipment.

### EIDAF

- Evidence: route brief, impact overview, trend.
- Insight: priority list, root cause summary.
- Decision: recommendation, drill-down trigger.
- Action: drill-down to Shipment.
- Feedback: back navigation and route review loop.

