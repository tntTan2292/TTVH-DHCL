# Action Center UX Architecture

## 1. UX Goals

Action Center UX phải giúp lãnh đạo chuyển decision thành action nhanh, giao đúng người, theo dõi tiến độ rõ ràng và đóng vòng feedback.

UX goals:

- Decision-to-action clarity.
- Ownership visibility.
- Execution tracking confidence.
- Feedback-driven closure.
- Context-preserving navigation.
- Low cognitive load with a clear action hierarchy.

## 2. User Journey

### Journey 1: Action Scan

1. Open Action Center from Evidence handoff.
2. Read executive summary.
3. Check decision queue.
4. Decide which action should be prioritized.

### Journey 2: Action Planning

1. Review recommended actions.
2. Assign ownership and deadline.
3. Confirm execution plan.
4. Start tracking the action.

### Journey 3: Feedback Loop

1. Review execution tracking.
2. Inspect follow-up and feedback.
3. Review action history if needed.
4. Close the loop and return to the broader context when necessary.

## 3. Wireflow

`Evidence Center`

↓

`Action Center`

↓

`Decision Queue`

↓

`Recommended Actions`

↓

`Assignment & Ownership`

↓

`Execution Tracking`

↓

`Follow-up & Feedback`

↓

`Action History`

UX rule:

- The user should keep evidence-origin context intact while moving through planning, execution, and feedback.

## 4. Screen Layout

The UX layout follows the frozen Screen Architecture:

- Header area for title, context, and filters.
- Executive area for summary and queue.
- Planning area for recommended actions and ownership.
- Tracking area for execution state.
- Feedback/history area for closure and traceability.

Layout intent:

- Top of screen answers "what needs to be done?"
- Middle of screen answers "who will do it and how?"
- Bottom of screen answers "is it happening and what happened?"

## 5. Navigation

- Primary navigation: Evidence -> Action.
- In-page navigation: select queue item to reveal recommended actions and ownership.
- Back navigation: return to evidence or prior context with the same state.
- Filter navigation: changing date refreshes the current action view without resetting user intent.
- History navigation: action history should be accessible without breaking the current task flow.

## 6. Interaction Details

- Selecting a queue item updates recommended actions and ownership context.
- Ownership assignment should be explicit and traceable.
- Execution tracking should reflect current progress without requiring extra navigation.
- Follow-up and feedback should become more visible as actions mature.
- Back action should restore the previous selection and scroll position when possible.

## 7. Empty State

- Show when no actions are available in the current context.
- Explain that there are no actions to plan or track.
- Suggest changing the filter or returning to evidence if needed.
- Do not present an error if data simply does not exist.

## 8. Loading State

- Show while action context and execution data are being prepared.
- Keep layout stable.
- Preserve filter and selected context visibility during loading.

## 9. Error State

- Show when action data cannot be loaded or updated.
- Explain the failure in plain language.
- Offer retry.
- Keep current filter context visible if available.

## 10. Micro Interaction

- Selected queue item should be clearly emphasized.
- Ownership changes should be subtle but confirmable.
- Execution state should transition without visual noise.
- Hover and focus states must be obvious and stable.
- State changes should be minimal and purposeful.

## 11. Accessibility

- Keyboard navigation must cover all actions.
- Focus indicators must be visible.
- Contrast must remain readable.
- Labels must be explicit about action planning and tracking.
- Screen reader text should describe ownership, progress, and feedback purpose.

## 12. Responsive Behavior

- Desktop-first is the default.
- On smaller screens, preserve reading order and action context.
- Reduce density before removing meaning.
- Tracking and feedback must stay accessible.

## 13. UX Checklist

- Executive summary is visible first.
- Decision queue is easy to scan.
- Recommended actions are actionable.
- Ownership is explicit.
- Execution tracking is easy to understand.
- Follow-up and feedback are visible.
- Action history is accessible for traceability.
- Empty/loading/error states are understandable.
- Keyboard and focus behavior are usable.
- Layout follows the frozen screen architecture.

## 14. Mapping với Screen Architecture, Widget Specification, EIDAF

### Screen Architecture

- Header Zone -> filters and context.
- Executive Zone -> summary and queue.
- Action Planning Zone -> recommended actions and ownership.
- Execution Tracking Zone -> progress state.
- Feedback & History Zone -> closure and traceability.

### Widget Specification

- Action Executive Summary Widget -> top-level scan.
- Decision Queue Widget -> prioritization.
- Recommended Actions Widget -> next steps.
- Assignment & Ownership Widget -> accountability.
- Execution Tracking Widget -> progress.
- Follow-up & Feedback Widget -> closure signals.
- Action History Widget -> traceability.

### EIDAF

- Evidence: executive summary and queue context.
- Insight: recommended actions and ownership understanding.
- Decision: action planning and prioritization.
- Action: assignment, tracking, and execution.
- Feedback: follow-up, feedback, and action history.

