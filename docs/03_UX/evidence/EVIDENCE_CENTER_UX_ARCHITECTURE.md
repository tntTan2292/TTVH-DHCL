# Evidence Center UX Architecture

## 1. UX Goals

Evidence Center UX phải giúp lãnh đạo xác minh bằng chứng nhanh, biết rõ evidence đã đủ hay chưa, và quyết định có chuyển sang Action Center hay không.

UX goals:

- Evidence-first validation mindset.
- Decision-first determination of readiness.
- Progressive drill-down from Shipment to Action.
- Context-preserving navigation.
- Low cognitive load with a clear validation hierarchy.

## 2. User Journey

### Journey 1: Evidence Scan

1. Open Evidence Center from Shipment drill-down.
2. Read executive summary.
3. Check evidence coverage.
4. Decide whether evidence is sufficient.

### Journey 2: Evidence Validation

1. Review timeline and scan history.
2. Check rule validation.
3. Review supporting evidence and RCA evidence.
4. Determine if evidence can support action.

### Journey 3: Action Handoff

1. Confirm decision support status.
2. Trigger action handoff when evidence is sufficient.
3. Preserve date, BCVH, route, and shipment context.
4. Move to Action Center.

## 3. Wireflow

`Shipment Performance Center`

↓

`Evidence Center`

↓

`Coverage + Timeline + Scan History`

↓

`Rule Validation + Supporting Evidence + RCA Evidence`

↓

`Decision Support`

↓

`Action Center`

UX rule:

- The user should keep shipment context intact while moving to evidence validation and action handoff.

## 4. Screen Layout

The UX layout follows the frozen Screen Architecture:

- Header area for title, context, and filters.
- Executive area for summary and coverage.
- Validation area for timeline, scan history, rule validation, supporting evidence, and RCA evidence.
- Decision area for evidence sufficiency and next step.
- Action trigger area for handoff to Action Center.

Layout intent:

- Top of screen answers "is there enough evidence?"
- Middle of screen answers "what evidence proves or weakens the case?"
- Bottom of screen answers "can we act now?"

## 5. Navigation

- Primary navigation: Shipment -> Evidence -> Action.
- In-page navigation: select validation item to reveal deeper evidence context.
- Drill-down navigation: preserve date, BCVH, route, and shipment context.
- Back navigation: return to prior level with the same context.
- Filter navigation: changing date refreshes the current evidence view without resetting user intent.

## 6. Interaction Details

- Evidence coverage updates as the user narrows the validation context.
- Rule validation becomes more prominent when evidence is selected.
- Decision support becomes stronger as supporting evidence and RCA evidence are confirmed.
- Action trigger becomes available only when evidence is sufficient.
- Back action should restore the previous selection and scroll position when possible.

## 7. Empty State

- Show when no evidence matches the current context.
- Explain that evidence is not yet sufficient or not yet available.
- Suggest reviewing shipment context or changing the filter.
- Do not present an error if data simply does not exist.

## 8. Loading State

- Show while evidence context and validation data are being prepared.
- Keep layout stable.
- Preserve filter and selected context visibility during loading.

## 9. Error State

- Show when evidence data cannot be loaded or validated.
- Explain the failure in plain language.
- Offer retry.
- Keep current filter context visible if available.

## 10. Micro Interaction

- Selected evidence item should be clearly emphasized.
- Validation states should transition subtly and quickly.
- Action trigger should appear only when evidence becomes sufficient.
- Hover and focus states must be obvious and stable.
- State changes should be minimal and purposeful.

## 11. Accessibility

- Keyboard navigation must cover all actions.
- Focus indicators must be visible.
- Contrast must remain readable.
- Labels must be explicit about evidence validation and action handoff.
- Screen reader text should describe validation purpose and readiness.

## 12. Responsive Behavior

- Desktop-first is the default.
- On smaller screens, preserve reading order and evidence context.
- Reduce density before removing meaning.
- Decision support and action trigger must stay accessible.

## 13. UX Checklist

- Executive summary is visible first.
- Coverage status is easy to scan.
- Validation details are easy to locate.
- Supporting evidence and RCA evidence are understandable.
- Decision support is clear about sufficiency.
- Action handoff keeps shipment context.
- Empty/loading/error states are understandable.
- Keyboard and focus behavior are usable.
- Layout follows the frozen screen architecture.

## 14. Mapping với Screen Architecture, Widget Specification, EIDAF

### Screen Architecture

- Header Zone -> filters and context.
- Executive Zone -> evidence summary and coverage.
- Evidence Validation Zone -> timeline, scan history, rule validation, supporting evidence, RCA evidence.
- Decision Support Zone -> sufficiency conclusion.
- Action Trigger Zone -> handoff to Action Center.

### Widget Specification

- Evidence Executive Summary Widget -> top-level scan.
- Evidence Coverage Widget -> readiness check.
- Evidence Timeline Widget -> time-based understanding.
- Scan History Widget -> trace verification.
- Rule Validation Widget -> rule compliance.
- Supporting Evidence Widget -> supporting proof.
- RCA Evidence Widget -> root-cause proof.
- Decision Support Widget -> sufficiency conclusion.

### EIDAF

- Evidence: executive summary, coverage, timeline, scan history, supporting evidence, RCA evidence.
- Insight: rule validation.
- Decision: decision support.
- Action: handoff to Action Center.
- Feedback: back navigation and review loop.

