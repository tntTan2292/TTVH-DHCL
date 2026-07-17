# Lean Codex Prompt Standard

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Lean Codex Prompt Rule](#2-lean-codex-prompt-rule)
- [3. Mandatory Handoff](#3-mandatory-handoff)
- [4. Active Manifest Readiness Gate](#4-active-manifest-readiness-gate)
- [5. Post-Onboarding Behavior](#5-post-onboarding-behavior)
- [6. Minimal Default Template](#6-minimal-default-template)
- [7. Output Standard](#7-output-standard)

## 1. Purpose

This document defines the lean execution prompt standard that ChatGPT must use to generate a Development Ticket prompt for Codex after AI onboarding PASS.

The repository already owns the authoritative onboarding chain and the manifest-specific working context. The Codex prompt should therefore stay concise and avoid repeating repository state that is already stored in governance documents.

## 2. Lean Codex Prompt Rule

When Codex has access to the repository, the generated prompt must normally be concise and avoid duplicating authoritative repository content.

The prompt should usually include only:

- Project
- Active ticket
- Instruction to read the repository onboarding chain
- Ticket objective
- Any user or PO decision not yet stored in the repository
- Scope restriction
- Required completion and handoff instruction
- Ticket-consistency guard when the generated prompt ticket differs from `PROJECT_SNAPSHOT.md`

The prompt must not duplicate:

- Required Reading URLs already listed in the active manifest
- business context already defined in the manifest
- technical file lists already defined in the manifest
- standard Governance rules
- standard commit, push, documentation, PO, or handoff instructions
- repository state already owned by `PROJECT_SNAPSHOT.md`

The active manifest remains responsible for detailed scope, Required Reading, validation, PO acceptance requirements, documents to update, and next-ticket handoff.

If the ticket named in the generated prompt does not match the Current Ticket in `PROJECT_SNAPSHOT.md`, Codex must stop and report the conflict instead of choosing either ticket by assumption.

## 3. Mandatory Handoff

Codex must perform all applicable actions before reporting completion.

The active manifest and Governance normally define these actions, so the execution prompt should only repeat them when a temporary instruction is not already authoritative in the repository:

- update the current ticket document and manifest status
- record validation and PO status
- close related PO findings when authorized
- identify the next ticket from the current manifest or roadmap
- create the next manifest if it does not exist
- ensure the next manifest contains actual implementation authority and not only pointer-activation scope
- update `PROJECT_SNAPSHOT`
  - Current Ticket
  - Current Manifest
  - Current Phase if changed
- register new documents in `DOCUMENT_INDEX`
- commit using One Ticket = One Commit
- push to `origin/main`
- verify the remote commit and all required GitHub Blob URLs
- run a fresh onboarding simulation starting only from `README_AI.md`
- confirm that the fresh AI can reach the active manifest, read Required Reading, and generate the next Codex prompt without repository search, guessing, or user clarification

## 4. Active Manifest Readiness Gate

Before activating a next ticket, Codex must inspect the proposed manifest even when the file already exists.

A manifest is not valid merely because:

- its file exists
- it is registered in `DOCUMENT_INDEX`
- `PROJECT_SNAPSHOT` points to it
- its ticket name matches the roadmap

Codex must migrate an existing manifest before activation when it:

- was created under an older Governance standard
- contains Governance pointer-activation scope instead of actual ticket scope
- duplicates stale mutable state
- lacks sufficient Required Reading
- lacks implementation authority
- lacks an explicit authoritative blocker state
- cannot support automatic Codex prompt generation

Readiness before activation:

- describes the actual active ticket
- contains sufficient implementation authority or an explicit blocker state
- contains concrete, accessible GitHub Blob URLs
- references authoritative business-rule sources
- defines In Scope and Out of Scope
- defines technical, runtime, testing, documentation, PO, completion, and handoff requirements
- identifies the next ticket from an authoritative roadmap
- does not require repository searching, guessing, or user clarification
- passes fresh onboarding validation

Mutable live state ownership:

- `PROJECT_SNAPSHOT.md` exclusively owns mutable current project state, including Current Phase, Current Ticket, Current Manifest, Current Branch, current PO Status, and live next-ticket routing
- manifest templates must reference `PROJECT_SNAPSHOT.md` for mutable live state
- historical commit evidence may remain only when clearly identified as immutable implementation or validation evidence

Mandatory handoff migration check:

1. Identify the authoritative next ticket.
2. Locate or create its manifest.
3. Validate it against the current manifest standard.
4. Migrate it when legacy or incomplete.
5. Confirm actual implementation authority or an explicit blocker state.
6. Update `PROJECT_SNAPSHOT`.
7. Update `DOCUMENT_INDEX` when applicable.
8. Commit and push to `origin/main`.
9. Verify the remote commit and Blob URLs.
10. Run fresh onboarding from `README_AI.md`.
11. Confirm the fresh AI automatically generates the next Codex prompt.

The current ticket must not be reported complete when any applicable step fails.

## 5. Post-Onboarding Behavior

When onboarding PASS completes, Codex behavior depends on the active manifest:

- if the active manifest authorizes implementation and no governance blocker exists, Codex must immediately generate the implementation prompt output without waiting for another user request
- if the manifest explicitly indicates `BLOCKED`, `WAITING FOR PO`, `WAITING FOR SSOT`, `WAITING FOR REQUIREMENT`, or another governance-defined blocking state, Codex may stop after explaining the blocker precisely
- post-onboarding autonomy is governed by repository documentation, not chat history

The required autonomous output is:

- `### Kết quả`
- `### Phương án`
- `### Prompt cho Codex`

## 6. Minimal Default Template

```text
PROJECT
QIS V2

TICKET
[Active Ticket]

Read and follow the repository onboarding chain:

README_AI.md
→ PROJECT_SNAPSHOT.md
→ Current Manifest
→ Required Reading

Implement the active ticket exactly within its manifest scope.

Additional PO/User Decision:
[Only include a decision that is not yet stored in the repository, otherwise write: None]

Restrictions:
- Do not infer missing business rules.
- Do not modify frozen or unrelated files.
- Apply the mandatory validation, documentation, commit, push, and handoff workflow defined by Governance.
- Do not perform PO UI acceptance.
- Do not self-award PO PASS.
- Provide a concise manual PO checklist for visible changes.
- Use browser automation only for targeted technical diagnosis or explicit authorization.

Report:
- implementation result;
- validation result;
- PO check status when applicable;
- commit and remote push status;
- next-ticket handoff result.
```

## 7. Output Standard

Every Codex execution report generated from this standard must stay concise and should not repeat repository-owned context unless a temporary instruction is not already available in the repository.

The prompt is considered valid when it is sufficient for Codex to implement the ticket by following the repository onboarding chain, while staying below 250 words unless a documented exception applies.

## 8. Technical Validation vs PO UI Acceptance

Codex owns technical validation.

Codex responsibilities include:

- implementation
- unit and integration tests
- build and lint checks
- targeted database checks
- direct API request and response validation
- contract validation
- narrow technical runtime diagnosis

Product Owner responsibilities include:

- visible UI correctness
- chart and table presentation
- filter behavior
- label and wording review
- readability and usability
- final product acceptance

Browser automation is optional, not the default. Use it only when the manifest explicitly requires browser evidence, the defect can only be proven in a browser, or the Product Owner explicitly requests it.

Broad browser sweeps, screenshot collection, and visual acceptance runs do not replace PO review. Any browser run performed by Codex remains technical evidence only and never becomes PO PASS.

Ready for PO Check handoff requires the applicable technical pass, runtime or API contract pass where relevant, and a governance state of `READY FOR PO CHECK`.

The PO handoff checklist should stay concise and include:

- screen URL
- required test context
- filters or actions to perform
- expected visible result
- PASS / WARNING / FAIL criteria

Quota discipline matters. Prefer targeted tests and API or database proof over broad visual review work.

## 9. Additional PO/User Decision Rule

The `Additional PO/User Decision` field may contain only temporary execution clarification that does not change business rules, scope, contracts, PO acceptance, SSOT, or frozen behavior.

Any authoritative business, scope, contract, acceptance, or frozen-behavior change must first be recorded in the correct repository document.

Codex must not implement an authoritative change that exists only in chat or in the execution prompt.
