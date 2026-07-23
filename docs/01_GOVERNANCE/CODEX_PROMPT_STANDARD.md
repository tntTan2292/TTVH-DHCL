# Lean Codex Prompt Standard

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Lean Prompt Rule](#2-lean-prompt-rule)
- [3. Active-Ticket Delta Prompt Rule](#3-active-ticket-delta-prompt-rule)
- [Single-defect remediation](#single-defect-remediation)
- [Workspace Hygiene](#workspace-hygiene)
- [4. Validation Levels](#4-validation-levels)
- [5. Mandatory Handoff](#5-mandatory-handoff)
- [6. Active Manifest Readiness Gate](#6-active-manifest-readiness-gate)
- [7. Post-Onboarding Behavior](#7-post-onboarding-behavior)
- [8. Minimal Default Template](#8-minimal-default-template)
- [9. Output Standard](#9-output-standard)
- [10. Technical Validation vs PO UI Acceptance](#10-technical-validation-vs-po-ui-acceptance)
- [11. Additional PO/User Decision Rule](#11-additional-pouser-decision-rule)
- [12. Conversation Context Capacity and Fresh-Chat Handoff](#12-conversation-context-capacity-and-fresh-chat-handoff)
- [13. Executor Selection Rule](#13-executor-selection-rule)

## 1. Purpose

This document defines the lean execution prompt standard that ChatGPT coordination must use after onboarding PASS.

The repository already owns the authoritative onboarding chain and the manifest-specific working context. Execution prompts should stay concise and avoid repeating repository state that is already stored in governance documents.

## 2. Lean Prompt Rule

When the executor has access to the repository, the generated prompt must normally stay concise and avoid duplicating authoritative repository content.

The prompt should usually include only:

- Project
- Active ticket
- Instruction to read the repository onboarding chain
- Ticket objective
- Any Product Owner or user decision not yet stored in the repository
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

If the ticket named in the generated prompt does not match the Current Ticket in `PROJECT_SNAPSHOT.md`, the executor must stop and report the conflict instead of choosing either ticket by assumption.

## 3. Active-Ticket Delta Prompt Rule

Active-ticket follow-up prompts must describe only the new defect, delta, or decision.

They must not repeat:

- the manifest
- SSOT text
- ticket history
- accepted evidence
- standard handoff workflow
- existing file lists
- repository-owned validation requirements already available through onboarding

Each active-ticket follow-up prompt must identify only:

- affected component, file, service, or UI area
- direct authority or accepted decision for the delta
- expected observable result
- explicit exclusions
- validation level

Local defects default to `LEVEL 1` validation.

Escalation above `LEVEL 1` requires a one-sentence justification in the prompt.

Start at named files, services, components, or tests; expand only when evidence requires it; and stop once root cause and affected boundary are confirmed.

Required workflow:

`Khoanh vùng → đọc tối thiểu → xác minh nguyên nhân → sửa đúng chỗ → test đúng phạm vi → dừng.`

The under-250-word default remains mandatory unless a documented exception applies.

## Single-defect remediation

When the Product Owner reports multiple independent defects, each remediation prompt must handle only one independently verifiable defect.

Do not mix frontend, backend, native runtime, or business logic unless evidence proves one shared root cause and the same correction point. Multiple symptoms may be grouped only when that shared root cause is proven.

Choose the executor by defect boundary:

- Codex: logic, backend, frontend, tests, contracts, and documentation.
- Antigravity: real-machine runtime, browser, process, HWND, and OS integration.

Each executor must report root cause, changed scope, commit, tests, and targeted evidence.

The Product Owner must confirm the current defect `PASS` before the next defect begins. Remaining defects stay recorded in the checkpoint and must not be inserted into an executor prompt already running.

Prefer small delta-only prompts and avoid repeating repository-wide instructions.

## Workspace Hygiene

Use only the canonical project workspace unless the Product Owner explicitly authorizes a different path:

`D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`

Do not create, reuse, or switch into sibling `TTVH-*` clone/worktree/folder workspaces to bypass a dirty, locked, stale, or wrong-branch canonical workspace.

If the canonical workspace is dirty, locked, missing, inaccessible, or on the wrong branch for the requested task, stop and report the exact blocker. Do not create another workspace as a workaround.

## 4. Validation Levels

`LEVEL 1 - Targeted Checks`

- Default for active-ticket local defects and deltas.
- Read only directly affected files/components and immediate contracts needed to confirm root cause.
- Run focused unit, API, database, or component checks that prove the fix.
- Do not run broad module, release, browser, or repository-wide validation unless evidence requires escalation.

`LEVEL 2 - Module Regression`

- Use when the defect can affect a module contract, shared service, API surface, or repeated workflow.
- Include focused checks plus relevant module regression tests.
- Escalation from `LEVEL 1` requires one-sentence justification.

`LEVEL 3 - Handoff / Release Validation`

- Use for ticket closure, PO handoff, release readiness, governance state transitions, or high-risk cross-module changes.
- Include focused checks, module regressions, build/lint where applicable, runtime/API/database proof where required, and handoff evidence.
- Escalation from `LEVEL 1` or `LEVEL 2` requires one-sentence justification.

## 5. Mandatory Handoff

The executor must perform all applicable actions before reporting completion.

The active manifest and Governance normally define these actions, so the execution prompt should only repeat them when a temporary instruction is not already authoritative in the repository:

- update the current ticket document and manifest status
- record validation and PO status
- close related PO findings when authorized
- identify the next ticket from the current manifest or roadmap
- create the next manifest if it does not exist
- ensure the next manifest contains actual implementation authority and not only pointer-activation scope
- update `PROJECT_SNAPSHOT`
- register new documents in `DOCUMENT_INDEX`
- commit using One Ticket = One Commit
- push to `origin/main`
- verify the remote commit and all required GitHub Blob URLs
- run a fresh onboarding simulation starting only from `README_AI.md`
- confirm that the fresh AI can reach the active manifest, read Required Reading, and generate the next prompt without repository search, guessing, or user clarification

## 6. Active Manifest Readiness Gate

Before activating a next ticket, the executor must inspect the proposed manifest even when the file already exists.

A manifest is not valid merely because:

- its file exists
- it is registered in `DOCUMENT_INDEX`
- `PROJECT_SNAPSHOT` points to it
- its ticket name matches the roadmap

The executor must migrate an existing manifest before activation when it:

- was created under an older Governance standard
- contains Governance pointer-activation scope instead of actual ticket scope
- duplicates stale mutable state
- lacks sufficient Required Reading
- lacks implementation authority
- lacks an explicit authoritative blocker state
- cannot support automatic prompt generation

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
11. Confirm the fresh AI automatically generates the next prompt.

The current ticket must not be reported complete when any applicable step fails.

## 7. Post-Onboarding Behavior

When onboarding PASS completes, behavior depends on the active manifest:

- if the active manifest authorizes implementation and no governance blocker exists, ChatGPT coordination must immediately produce the implementation prompt without waiting for another user request
- if the manifest explicitly indicates `BLOCKED`, `WAITING FOR PO`, `WAITING FOR SSOT`, `WAITING FOR REQUIREMENT`, or another governance-defined blocking state, the executor may stop after explaining the blocker precisely
- post-onboarding autonomy is governed by repository documentation, not chat history

The required autonomous output is exactly:

1. `### Phân tích kết quả`
   - fewer than 5 sentences
   - state only the result, finding, blocker, or readiness
2. `### Phương án`
   - fewer than 5 sentences
   - state the immediate execution path
3. exactly one of:
   - `### Prompt cho Codex`
   - `### Prompt cho Antigravity`
   - `### Yêu cầu PO quyết định`

## 7.1 Post-Review Remediation Loop

When review finds an issue that can be remediated within the active ticket, ChatGPT coordination must not stop after reporting the finding. It must immediately generate a remediation prompt for the correct single executor, keep the active ticket current, and require remediation, revalidation, and required PO acceptance before closing or advancing the ticket.

Do not activate the next ticket before current-ticket PO PASS unless explicit Governance authority permits parallel work.

Request a Product Owner decision only when the finding requires a business-rule, SSOT, frozen-behavior, scope, threshold, acceptance, or authority decision.

A failed repository search alone is not sufficient proof that authority does not exist. Before declaring missing authority, inspect relevant Governance documents, business-rule sources, shared constants, accepted implementation, API contracts, tests, and Git history.

## 8. Minimal Default Template

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
- use `### Phân tích kết quả`, `### Phương án`, and exactly one of `### Prompt cho Codex`, `### Prompt cho Antigravity`, or `### Yêu cầu PO quyết định`;
- keep the first two sections under 5 sentences each;
- include implementation, validation, PO check, commit, remote push, and handoff status only when applicable.
```

## 9. Output Standard

Every execution report generated from this standard must stay concise and should not repeat repository-owned context unless a temporary instruction is not already available in the repository.

The prompt is considered valid when it is sufficient for the selected executor to implement the ticket by following the repository onboarding chain, while staying below 250 words unless a documented exception applies.

The three-part response format applies to post-onboarding continuation, implementation-result review, remediation findings, validation failures, PO handoff, and next-ticket activation.

## 10. Technical Validation vs PO UI Acceptance

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

## 11. Additional PO/User Decision Rule

The `Additional PO/User Decision` field may contain only temporary execution clarification that does not change business rules, scope, contracts, PO acceptance, SSOT, or frozen behavior.

Any authoritative business, scope, contract, acceptance, or frozen-behavior change must first be recorded in the correct repository document.

The executor must not implement an authoritative change that exists only in chat or in the execution prompt.

## 12. Conversation Context Capacity and Fresh-Chat Handoff

The executor must monitor whether the current conversation has become excessively long, repetitive, difficult to navigate, or likely to lose critical project context.

When the conversation approaches practical context capacity, becomes noticeably heavy, or risks mixing obsolete and current authority, the executor must proactively tell the Product Owner to open a new ChatGPT conversation. Do not wait until context is already lost.

The warning must be concise and must not interrupt urgent work unnecessarily. Before recommending a new conversation, ensure authoritative project state is committed or recorded in repository governance where possible.

The fresh-chat handoff must include:

- repository
- current branch
- current phase
- current ticket
- current manifest
- latest remote commit
- PO status
- next required action
- unresolved decisions or blockers

The new conversation must begin from `README_AI.md`, not from copied chat memory alone. Repository governance remains authoritative; conversation summaries are only navigation aids.

Never claim an exact token count or context percentage unless the system actually exposes it. Use qualitative indicators such as conversation is becoming very long, multiple completed phases remain in chat history, current decisions are difficult to distinguish from superseded decisions, tool output is dominating the conversation, or response quality may be reduced by context weight.

Do not repeatedly ask for a new chat when the current conversation remains manageable.

## 13. Executor Selection Rule

ChatGPT in the active Product Owner session is the coordination authority.

ChatGPT coordination is responsible for:

- receiving requests
- analyzing the ticket
- finalizing scope
- choosing the executor
- writing the prompt
- reviewing results
- asking the Product Owner for decisions

Only ChatGPT coordination may redirect work between Codex and Antigravity.

Every project prompt must use exactly one of these explicit headings:

- `Prompt cho Codex`
- `Prompt cho Antigravity`

Do not use `Prompt cho Codex/Antigravity`.

Use Codex as the primary executor for:

- business logic
- API, backend, and database work
- data flow and contracts
- mappers
- validation
- tests
- refactors
- technical remediation
- governance and documentation updates for technical tickets
- KPI, ranking, import, and evidence logic within approved authority

Prompt for Codex must state that:

- Codex directly executes the assigned task
- Codex must not stop at discovery and then generate a handoff prompt for Antigravity
- Codex must not unilaterally transfer the task to Antigravity
- Codex must keep UI changes narrowly limited to what is technically necessary inside the assigned scope
- if UI work beyond Codex scope is discovered, Codex only reports a blocker or short handoff note back to ChatGPT coordination
- Codex must not write a full Antigravity prompt unless the active ticket or repository authority explicitly requires it

Use Antigravity as the primary executor for:

- layout
- UI/UX
- responsive behavior
- typography
- spacing
- visual hierarchy
- color
- chart and heatmap presentation
- final visual assembly
- browser runtime visual check
- screenshot evidence

Prompt for Antigravity must state that:

- Antigravity directly implements the assigned UI work
- Antigravity must not stop at discovery and then generate a handoff prompt for Codex
- Antigravity must not unilaterally transfer the task back to Codex
- Antigravity must not change backend logic, APIs, schemas, KPI formulas, SSOT, or business rules
- if logic, backend, or contract work is required, Antigravity must stop that part and report a blocker back to ChatGPT coordination
- Antigravity must not write a long Codex prompt unless repository authority explicitly requires it

For mixed tickets:

- Codex handles logic and contract work first
- Antigravity completes interface and visual work after the logic/contract boundary is stable
- ChatGPT coordination chooses the execution order
- each executor performs only the assigned portion
- no executor may change the chosen executor by itself

Rules for agent selection:

- functionality, data, API, backend, logic, contract, and tests go to Codex
- interface, layout, responsive behavior, visualization, and final visual polish go to Antigravity
- do not choose Antigravity for business-rule implementation
- do not choose Codex as the primary executor for final visual polish when the ticket is mainly UI-facing

Each executor must report:

- completed result
- files changed
- validation
- blocker
- ticket status

The executor must not end by generating a prompt for the other executor unless ChatGPT coordination explicitly requested that output.

Antigravity results require careful verification before PO PASS:

- browser runtime
- interface screenshot or equivalent visual evidence
- source diff review
- focused regression
- PO acceptance handoff
