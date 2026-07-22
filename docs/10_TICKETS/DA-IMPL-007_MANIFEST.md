# DA-IMPL-007 Manifest

- Ticket ID: `DA-IMPL-007`
- Ticket Name: `Smart Dashboard Final Assembly`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / PO PASS`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Activation authority: Product Owner final DA-IMPL-006 handoff after `DA-IMPL-006 = COMPLETED / PO PASS`
- Activation date: `2026-07-20`
- Closure date: `2026-07-22`
- Primary executor: `Antigravity`
- Codex role: technical review, regression checks, and logic or contract remediation only when needed
- PO decision: `FINAL PO PASS`
- Code commit range: `670927a81716732137ac535dc13a6f418503e247..f9a62f5` (remédiated up to `f9a62f5`)

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Approved Scope

- Finalize Dashboard hierarchy, spacing, responsive behavior, loading, empty, error, and missing-data states.
- Remove remaining obsolete surfaces only after replacements are accepted.
- Complete final Dashboard UI and UX assembly with browser runtime and visual validation.
- Include the accepted Dashboard UI and UX follow-up items from DA-IMPL-005, including responsive Heatmap layout at 100% desktop zoom, month blocks adapting to viewport width, controlled scrolling or compact cell sizing, non-overlapping chart legends and labels, improved spacing, typography, information density, and desktop usability without requiring browser zoom changes.
- Use a dedicated `Prompt cho Antigravity` for execution.

## Out of Scope

- No backend API or schema changes unless a later governed ticket explicitly authorizes them.
- No KPI formula changes.
- No SSOT changes.
- No business-rule, threshold, BCVH mapping, or ranking-rule changes.
- No AUTO-IMPORT or TCT workflow changes.
- No logic, contract, or backend rewrite by Antigravity outside explicit authority.
- No reopening of `DA-IMPL-006`.

## Execution Rules

- Antigravity must directly execute final visual assembly.
- Antigravity must not stop at discovery and then write a Codex prompt.
- Antigravity must not transfer the ticket back to Codex on its own.
- If a logic, backend, API, schema, KPI, SSOT, or contract blocker is discovered, Antigravity must stop that part and report the blocker back to ChatGPT coordination.
- Codex may be called back only for technical review, regression checks, or confirmed logic and contract remediation.

## Evidence and Acceptance

- Prompt for this ticket must be written specifically for Antigravity.
- Validation must include browser runtime review, visual evidence or screenshots, source diff review, focused regression, and PO acceptance handoff.
- Product Owner acceptance is required before closure.

## Next Ticket

`TBD by Product Owner after Smart Dashboard final assembly PO acceptance`.
