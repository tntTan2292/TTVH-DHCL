# Shipment Performance Center UX Architecture

## 1. UX Goals

Shipment Performance Center UX phải giúp lãnh đạo nhìn đúng bưu gửi đại diện cho vấn đề, hiểu diễn tiến và quyết định có cần sang Evidence Center hay không.

UX goals:

- Executive-first shipment scanning.
- Decision-first escalation to evidence.
- Evidence-first verification mindset.
- Progressive drill-down from Route to Evidence.
- Context-preserving navigation.
- Low cognitive load with clear shipment-focused hierarchy.

## 2. User Journey

### Journey 1: Shipment Scan

1. Open Shipment Performance Center from Route drill-down.
2. Read shipment executive brief.
3. Identify the shipment with highest impact or anomaly.
4. Decide whether to stop, investigate, or continue to evidence.

### Journey 2: Shipment Investigation

1. Select a priority shipment.
2. Review timeline and root cause summary.
3. Review evidence summary and recommendation.
4. Decide whether the evidence is sufficient.

### Journey 3: Evidence Drill-down

1. Trigger evidence drill-down from shipment.
2. Preserve date, BCVH, route, and shipment context.
3. Move to Evidence Center.
4. Continue verification at evidence level.

## 3. Wireflow

`Route Performance Center`

↓

`Shipment Performance Center`

↓

`Priority Shipment Selection`

↓

`Timeline + Root Cause + Evidence Summary`

↓

`Recommendation`

↓

`Evidence Drill-down Trigger`

↓

`Evidence Center`

UX rule:

- The user should not lose route or shipment context while moving to evidence.

## 4. Screen Layout

The UX layout follows the frozen Screen Architecture:

- Header area for title, context, and filters.
- Executive area for shipment brief and impact overview.
- Analysis area for timeline and root cause.
- Evidence summary area for evidence readiness and recommendation.
- Drill-down area for transition to Evidence Center.

Layout intent:

- Top of screen answers "which shipment matters?"
- Middle of screen answers "what happened and why?"
- Bottom of screen answers "is evidence sufficient and what next?"

## 5. Navigation

- Primary navigation: Route -> Shipment -> Evidence.
- In-page navigation: select shipment to reveal deeper context.
- Drill-down navigation: preserve date, BCVH, route, and shipment context.
- Back navigation: return to prior level with the same context.
- Filter navigation: changing date refreshes the current shipment view without resetting user intent.

## 6. Interaction Details

- Selecting a shipment updates timeline and root cause context.
- Evidence summary becomes more specific after shipment selection.
- Drill-down button activates only when evidence verification is meaningful.
- Filter bar changes should refresh the visible shipment view in a controlled way.
- Back action should restore previous selection and scroll position when possible.

## 7. Empty State

- Show when no shipment matches the current filter or search.
- Explain that no shipment data is available for the selected context.
- Suggest changing the date filter or search term.
- Do not present an error if the data simply does not exist.

## 8. Loading State

- Show while shipment context and evidence readiness are being prepared.
- Keep layout stable.
- Preserve filter and selected context visibility during loading.

## 9. Error State

- Show when shipment data or evidence readiness cannot be loaded.
- Explain the failure in plain language.
- Offer retry.
- Keep current filter context visible if available.

## 10. Micro Interaction

- Selected shipment should be clearly emphasized.
- Timeline and evidence summary should reveal detail gradually.
- Drill-down button should clearly indicate evidence transition.
- Hover and focus states must be obvious and stable.
- State changes should be subtle and fast, not decorative.

## 11. Accessibility

- Keyboard navigation must cover all actions.
- Focus indicators must be visible.
- Contrast must remain readable.
- Labels must be explicit about shipment and evidence transitions.
- Screen reader text should describe the shipment context and drill-down purpose.

## 12. Responsive Behavior

- Desktop-first is the default.
- On smaller screens, preserve reading order and shipment context.
- Reduce density before removing meaning.
- Recommendation and drill-down must stay accessible.

## 13. UX Checklist

- Executive brief is visible first.
- Priority shipment list is easy to scan.
- Selected shipment state is obvious.
- Timeline and root cause are easy to access.
- Evidence summary is clear about readiness.
- Drill-down keeps route and shipment context.
- Empty/loading/error states are understandable.
- Keyboard and focus behavior are usable.
- Layout follows the frozen screen architecture.

## 14. Mapping với Screen Architecture, Widget Specification, EIDAF

### Screen Architecture

- Header Zone -> filters and context.
- Executive Zone -> shipment brief and impact overview.
- Shipment Analysis Zone -> timeline and root cause.
- Evidence Summary Zone -> evidence summary and recommendation.
- Evidence Drill-down Zone -> evidence transition.

### Widget Specification

- Shipment Executive Brief Widget -> top-level scan.
- Shipment Impact Overview Widget -> shipment impact.
- Shipment Timeline Widget -> time-based understanding.
- Shipment Root Cause Summary Widget -> explanation.
- Evidence Summary Widget -> evidence readiness.
- Recommendation Widget -> next step.
- Evidence Drill-down Trigger Widget -> navigation to Evidence.

### EIDAF

- Evidence: shipment brief, impact overview, timeline, evidence summary.
- Insight: root cause summary.
- Decision: recommendation, drill-down trigger.
- Action: drill-down to Evidence.
- Feedback: back navigation and shipment review loop.

