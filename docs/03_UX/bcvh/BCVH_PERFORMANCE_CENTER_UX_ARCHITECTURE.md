# BCVH Performance Center UX Architecture

## 1. UX Goals

BCVH Performance Center UX phải hỗ trợ lãnh đạo nhìn đúng vấn đề, hiểu nhanh nguyên nhân và đi tới quyết định hoặc drill-down mà không mất context.

UX goals:

- Executive-first reading.
- Decision-first navigation.
- Evidence-visible understanding.
- Progressive drill-down to Route.
- Context preservation across navigation.
- Fast scanning, low cognitive load, and consistent interaction.

## 2. User Journey

### Journey 1: Quick Scan

1. Open BCVH Performance Center from Dashboard.
2. Read executive brief.
3. Identify health and priority BCVH.
4. Decide whether to stop, investigate, or drill down.

### Journey 2: Investigate

1. Select a priority BCVH.
2. Review trend and root cause summary.
3. Review recommendation.
4. Decide whether to drill down to Route Performance Center.

### Journey 3: Drill-down

1. Select drill-down trigger.
2. Preserve date filter and BCVH context.
3. Move to Route Performance Center.
4. Continue investigation at route level.

## 3. Wireflow

`Dashboard`

↓

`BCVH Performance Center`

↓

`Priority List Selection`

↓

`Trend + Root Cause + Recommendation`

↓

`Drill-down Trigger`

↓

`Route Performance Center`

UX rule:

- The user should never lose the selected date or BCVH context while moving along the flow.

## 4. Screen Layout

The UX layout follows the frozen Screen Architecture:

- Header area for title, context, and filters.
- Executive area for executive brief and health overview.
- Analysis area for priority, trend, and root cause.
- Recommendation area for next-step guidance.
- Drill-down area for transition to Route.

Layout intent:

- Top of screen answers "what is happening?"
- Middle of screen answers "why is it happening?"
- Bottom of screen answers "what should we do next?"

## 5. Navigation

- Primary navigation: Dashboard -> BCVH -> Route.
- In-page navigation: select priority item to reveal deeper context.
- Drill-down navigation: preserve date filter and selected BCVH.
- Back navigation: return to prior level with the same context.
- Filter navigation: changing date re-evaluates the current view without resetting all state.

## 6. Interaction Details

- Selecting a BCVH updates root cause and trend context.
- Recommendation becomes more specific after a priority selection.
- Drill-down button activates only when route-level analysis is meaningful.
- Filter bar changes should trigger a controlled refresh of visible content.
- Back action should restore the previous selection and scroll position when possible.

## 7. Empty State

- Show when no BCVH matches the current filter or search.
- Explain that no data is available for the selected context.
- Suggest changing the date filter or search term.
- Do not present an error if data simply does not exist.

## 8. Loading State

- Show while executive summary or analysis data is being prepared.
- Keep layout stable to avoid visual jump.
- Use calm and minimal loading feedback.
- Preserve filter and context visibility during loading.

## 9. Error State

- Show when the data request fails or context cannot be loaded.
- Explain the problem in plain language.
- Offer retry.
- Keep the filter and selected context visible if available.

## 10. Micro Interaction

- Selected BCVH should be visually emphasized.
- Recommendation should transition in after context is selected.
- Drill-down button should appear enabled only when action is meaningful.
- Hover and focus states must clearly show interactivity.
- State changes should be subtle and fast, not decorative.

## 11. Accessibility

- All actions must be reachable by keyboard.
- Focus states must be visible.
- Contrast must meet readability requirements.
- Labels should be clear and not rely on color alone.
- Screen reader text should describe the purpose of drill-down and selection.

## 12. Responsive Behavior

- Desktop-first behavior is the default.
- On smaller screens, preserve the reading order and context first.
- Reduce density before removing meaning.
- Recommendation and drill-down must remain accessible without horizontal confusion.

## 13. UX Checklist

- Executive brief is visible first.
- Priority list is easy to scan.
- Selected BCVH state is clear.
- Trend and root cause are easy to locate.
- Recommendation is actionable.
- Drill-down keeps context.
- Empty/loading/error states are understandable.
- Keyboard and focus behavior are usable.
- Layout follows the frozen screen architecture.

## 14. Mapping với Screen Architecture, Widget Specification, EIDAF

### Screen Architecture

- Header -> filters and context.
- Executive Zone -> executive brief and health overview.
- Analysis Zone -> priority, trend, root cause.
- Recommendation Zone -> recommendation.
- Drill-down Zone -> route transition.

### Widget Specification

- Executive Brief Widget -> top-level scan.
- Health Overview Widget -> health state.
- Priority List Widget -> selection and prioritization.
- Trend Widget -> time-based understanding.
- Root Cause Summary Widget -> explanation.
- Recommendation Widget -> next step.
- Drill-down Trigger Widget -> navigation to Route.

### EIDAF

- Evidence: executive brief, health overview, trend.
- Insight: priority list, root cause summary.
- Decision: recommendation, drill-down trigger.
- Action: drill-down to Route.
- Feedback: return navigation and context-preserving review loop.

