# Lean Executor Prompt Standard

Filename retained as `CODEX_PROMPT_STANDARD.md` for link continuity. Default executors are `Antigravity` and `Claude Code`; `Codex` is legacy/non-default (see Section 13).

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Lean Prompt Rule](#2-lean-prompt-rule)
- [2.1 First-Prompt Governance Gate](#21-first-prompt-governance-gate)
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
- [13.1 Claude Code Model Selection](#131-claude-code-model-selection)
- [14. Two Reporting Channels](#14-two-reporting-channels)

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

## 2.1 First-Prompt Governance Gate

In every new AI/chat session, `README_AI.md` must route the AI to this Prompt Standard before the first execution prompt is written.

Until this Prompt Standard has been read, the AI must not write either `Prompt cho Claude Code` or `Prompt cho Antigravity`.

The first execution prompt for Claude Code or Antigravity defaults to one independently verifiable defect or objective, delta-only scope, and fewer than `250` words unless a Governance-approved exception applies.

The first execution prompt must not repeat Manifest content, SSOT text, ticket history, standard workflow instructions, or repository-owned guidance already available through onboarding.

Executor selection is two-layer, and the model is not interchangeable across executors — see Section 13 for the full, authoritative pairing:

- `Executor`: `Antigravity` (model fixed: `Gemini`) or `Claude Code` (model: `Sonnet` or `Opus`)
- the prompt must state the resulting pairing explicitly: `Antigravity (Gemini)`, `Claude Code (Sonnet)`, or `Claude Code (Opus)`

`Codex` is no longer the default executor and must not be selected unless the Product Owner explicitly authorizes it for a specific ticket. Historical Codex tickets, checkpoints, and manifests remain valid records and must not be rewritten.

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

- Claude Code (Sonnet for bounded work, Opus for complex/cross-module planning): logic, backend, frontend, data, local/bounded discovery, tests, contracts, documentation, and Git.
- Antigravity (Gemini, fixed): UI/UX, visual polish, and real-machine Windows runtime inspection (browser, process, HWND, and OS integration).

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
- when Current Ticket changes (a ticket closes or a new ticket activates), append exactly one new line recording the outcome to `PROJECT_PROGRESS.md`'s ticket history; never edit or delete prior lines
- register new documents in `DOCUMENT_INDEX`
- review whether `CLAUDE.md` needs an update when this ticket changes governance workflow, executor roles, or model rules
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

Audience: ChatGPT/CTO → Product Owner channel only. This section defines what ChatGPT/CTO reports to the Product Owner. It does not define what an executor (Antigravity, Claude Code, or an explicitly authorized Codex) reports to ChatGPT/CTO — that is a separate channel with its own format; see Section 14.

When onboarding PASS completes, behavior depends on the active manifest:

- if the active manifest authorizes implementation and no governance blocker exists, ChatGPT coordination must immediately produce the implementation prompt without waiting for another user request
- if the manifest explicitly indicates `BLOCKED`, `WAITING FOR PO`, `WAITING FOR SSOT`, `WAITING FOR REQUIREMENT`, or another governance-defined blocking state, the executor may stop after explaining the blocker precisely
- post-onboarding autonomy is governed by repository documentation, not chat history

The required autonomous output is exactly:

1. `### Phân tích kết quả`
   - fewer than 5 sentences
   - state only the result, finding, blocker, or readiness
   - use Product Owner management/no-code language
   - explain what happened, the user/project impact, and the current progress or blocker
2. `### Phương án`
   - fewer than 5 sentences
   - state the immediate execution path
   - use Product Owner management/no-code language
   - state the handling goal, expected result, executor, and next check milestone
3. exactly one of:
   - `### Prompt cho Claude Code`
   - `### Prompt cho Antigravity`
   - `### Yêu cầu PO quyết định`

Do not use class names, function names, code paths, raw logs, or technical jargon in the first two sections unless they are necessary for a Product Owner decision.

Put technical details in the executor prompt, validation evidence, or a separate technical note.

This under-5-sentence constraint applies only to Product Owner-facing reporting.

AI-to-AI coordination, technical handoff, architecture challenge, and evidence exchange must preserve full technical context and are not subject to the 5-sentence limit.

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
- use `### Phân tích kết quả`, `### Phương án`, and exactly one of `### Prompt cho Claude Code`, `### Prompt cho Antigravity`, or `### Yêu cầu PO quyết định`;
- keep the first two sections under 5 sentences each;
- write the first two sections in Product Owner management/no-code language;
- keep class names, function names, code paths, raw logs, and technical jargon out of the first two sections unless needed for a PO decision;
- include implementation, validation, PO check, commit, remote push, and handoff status only when applicable.
```

## 9. Output Standard

Every execution report generated from this standard must stay concise and should not repeat repository-owned context unless a temporary instruction is not already available in the repository.

The prompt is considered valid when it is sufficient for the selected executor to implement the ticket by following the repository onboarding chain, while staying below 250 words unless a documented exception applies.

The three-part response format applies to post-onboarding continuation, implementation-result review, remediation findings, validation failures, PO handoff, and next-ticket activation.

In the first two sections, the reader is the Product Owner. The result analysis must say what happened, how it affects users or the project, and whether progress is clear or blocked. The plan section must say the handling goal, expected outcome, executor, and next check milestone. Technical detail belongs in the executor prompt, validation evidence, or a separate technical note.

## 10. Technical Validation vs PO UI Acceptance

Claude Code owns technical validation.

Claude Code responsibilities include:

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

Broad browser sweeps, screenshot collection, and visual acceptance runs do not replace PO review. Any browser run performed by Claude Code or Antigravity remains technical evidence only and never becomes PO PASS.

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

One execution conversation serves one ticket or one major delivery wave. Continue remediation and validation for the same bounded ticket or wave in the current conversation. Start a new execution conversation for a new ticket, a new major wave, or materially different work scope.

When the conversation approaches practical context capacity, becomes noticeably heavy, contains multiple completed phases, or risks mixing obsolete and current authority, the executor must proactively tell the Product Owner to open a new conversation. Do not wait until context is already lost. Each executor must clearly state when the current conversation should end and a fresh one should begin.

The warning must be concise and must not interrupt urgent work unnecessarily. Before changing conversations, update required repository evidence, commit, push, and verify the remote state. Do not open a new conversation to bypass unfinished work, failures, dirty workspace, locks, or a wrong branch.

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

The new conversation must begin from `README_AI.md`, not from copied chat memory alone. Repository Governance is authoritative; conversation history is temporary working context. Do not copy full historical conversations into a new session.

Carry only repository, branch, active ticket or wave, and Product Owner decisions not yet stored in the repository. Repository governance remains authoritative; conversation summaries are only navigation aids.

Never claim an exact token count or context percentage unless the system actually exposes it. Use qualitative indicators such as conversation is becoming very long, multiple completed phases remain in chat history, current decisions are difficult to distinguish from superseded decisions, tool output is dominating the conversation, or response quality may be reduced by context weight.

Do not repeatedly ask for a new chat when the current conversation remains manageable.

## 13. Executor Selection Rule

ChatGPT in the active Product Owner session is the CTO / Coordinator / Technical Decision Authority.

ChatGPT coordination is responsible for:

- receiving requests
- analyzing the ticket
- finalizing scope
- choosing the executor
- writing the prompt
- reviewing results
- asking the Product Owner for decisions

Only ChatGPT coordination may redirect work between Antigravity and Claude Code.

The default executors are `Antigravity` and `Claude Code`. `Codex` is no longer the default executor and must not be selected unless the Product Owner explicitly authorizes it for a specific ticket. Historical Codex tickets, checkpoints, and manifests remain valid records and must not be rewritten.

Every project prompt must use exactly one of these explicit headings:

- `Prompt cho Claude Code`
- `Prompt cho Antigravity`

Do not use `Prompt cho Claude Code/Antigravity`.

Executor selection is mandatory, and each prompt has exactly one primary executor. Model is not a free choice layered on top of any executor — it is a fixed pairing per executor:

- `Antigravity` — model is `Gemini`, fixed. There is no Sonnet/Opus choice for Antigravity.
- `Claude Code` — model is `Sonnet` or `Opus`, chosen per Section 13.1 below.
- `Codex` — only when the Product Owner or repository authority explicitly names it for a specific ticket.

ChatGPT coordination must state the resulting pairing explicitly in every prompt: `Antigravity (Gemini)`, `Claude Code (Sonnet)`, or `Claude Code (Opus)`.

Do not use a pairing that does not exist. In particular, do not write `Antigravity–Sonnet`, `Antigravity–Opus`, `Antigravity (Sonnet)`, `Antigravity (Opus)`, or `Claude Code–Gemini` — these labels do not exist in this governance and must be treated as a defect if written.

When risk is high (architecture change, cross-module defect, or a decision that is hard to reverse), the same executor/model pairing must not both implement the change and self-approve or self-review it. A different pairing or a separate session must perform whichever of implementation or review/approval the first one did not perform.

## 13.1 Claude Code Model Selection

- `Claude Code Opus` — complex or cross-module planning, architecture decisions, and high-risk technical decisions. For planning that is genuinely complex or cross-module, Opus starts the plan directly; do not begin with Sonnet and escalate for a full re-analysis.
- `Claude Code Sonnet` — local/bounded discovery, implementing a plan Opus (or ChatGPT/CTO) has already approved, tests, documentation, and Git. This is the default for ordinary, quota-efficient work.
- Sonnet → Opus handoff is narrow: it is used only to have Opus review a small number (1-3) of specific sensitive decisions that Sonnet's work already surfaced. It is not a request for Opus to re-analyze the whole task from scratch.
- Do not dispatch `Opus` for ordinary bounded discovery or routine implementation when `Sonnet` is sufficient.

Use Claude Code as the primary executor for:

- local/bounded technical discovery
- implementation of a plan that is already approved (Opus-planned for complex/cross-module work, or directly scoped for simple work)
- business logic
- API, backend, and database work
- data flow and contracts
- mappers
- validation
- tests
- refactors
- technical remediation
- documentation and Git (commit, push)
- governance and documentation updates for technical tickets
- KPI, ranking, import, and evidence logic within approved authority
- complex/cross-module planning, architecture decisions, and high-risk technical decisions (`Opus` only — see Section 13.1)

Prompt for Claude Code must state that:

- Claude Code directly executes the assigned task
- Claude Code must not stop at discovery and then generate a handoff prompt for Antigravity
- Claude Code must not unilaterally transfer the task to Antigravity
- Claude Code must keep UI changes narrowly limited to what is technically necessary inside the assigned scope
- if UI work beyond Claude Code scope is discovered, Claude Code only reports a blocker or short handoff note back to ChatGPT coordination
- Claude Code must not write a full Antigravity prompt unless the active ticket or repository authority explicitly requires it

Use Antigravity as the primary executor for:

- UI/UX visual work, layout, typography, spacing, visual hierarchy, color, responsive behavior
- visual polish and final visual assembly
- chart and heatmap presentation
- browser runtime visual check and screenshot evidence
- Windows runtime (PID, HWND, process, log) inspection and evidence

Antigravity's model is `Gemini`, fixed — it is not selected per task and is not Sonnet or Opus.

Prompt for Antigravity must state that:

- Antigravity directly implements the assigned UI/UX, visual, or runtime inspection work
- Antigravity must not stop at UI/runtime inspection and then generate a handoff prompt for Claude Code
- Antigravity must not unilaterally transfer the task back to Claude Code
- Antigravity must not change backend logic, APIs, schemas, KPI formulas, SSOT, or business rules
- if logic, backend, or contract work is required, Antigravity must stop that part and report a blocker back to ChatGPT coordination
- Antigravity must not write a long Claude Code prompt unless repository authority explicitly requires it

For mixed tickets:

- Claude Code handles logic and contract work first
- Antigravity completes interface, visual, and runtime work after the logic/contract boundary is stable
- ChatGPT coordination chooses the execution order
- each executor performs only the assigned portion
- no executor may change the chosen executor by itself

Rules for agent selection:

- functionality, data, API, backend, logic, contract, tests, and local/bounded technical discovery go to Claude Code
- UI/UX, layout, responsive behavior, visualization, final visual polish, and Windows runtime inspection go to Antigravity
- complex/cross-module planning, architecture, and high-risk technical decisions go to Claude Code Opus, not Antigravity, and not Claude Code Sonnet
- do not choose Antigravity for business-rule implementation
- do not choose Claude Code as the primary executor for final visual polish when the ticket is mainly UI-facing

Each executor (Antigravity, Claude Code, or an explicitly authorized Codex) must report to ChatGPT/CTO using the `Technical Execution Report` defined in Section 14.2. That report is full technical detail, not the Product Owner-facing format below — executors do not write `### Phân tích kết quả`, `### Phương án`, or a prompt for another executor.

ChatGPT/CTO alone reads the Technical Execution Report, decides purely technical questions in its own authority, and then authors a separate Product Owner-facing report that must stay management-level and no-code:

- `KẾT QUẢ` or `PHÂN TÍCH KẾT QUẢ`: under 5 sentences
- `PHƯƠNG ÁN`: under 5 sentences
- then exactly one prompt or one Product Owner decision request when applicable

This Product Owner-facing format (Section 7, Section 14.1) is authored by ChatGPT/CTO only; it is never the executor's own report format.

Only ask the Product Owner about:

- business rules
- product behavior
- SSOT
- acceptance criteria
- product direction

Purely technical choices are decided by CTO/ChatGPT coordination and must not be escalated to the Product Owner unless they change product authority.

The executor must not end by generating a prompt for the other executor unless ChatGPT coordination explicitly requested that output.

Antigravity results require careful verification before PO PASS:

- browser runtime
- interface screenshot or equivalent visual evidence
- source diff review
- focused regression
- PO acceptance handoff

## 14. Two Reporting Channels

Governance uses two distinct reporting channels with different audiences, different purposes, and different formats. Applying one channel's rules to the other's audience is a governance defect, not a stylistic choice.

### 14.1 Channel A — ChatGPT/CTO → Product Owner

Audience: Product Owner. Author: ChatGPT/CTO only.

This is the management report defined in Section 7 and mirrored in `AI_COLLABORATION_PROTOCOL.md` Section 15.1: `### Phân tích kết quả`, `### Phương án`, and exactly one of `### Prompt cho Claude Code`, `### Prompt cho Antigravity`, or `### Yêu cầu PO quyết định`. Under 5 sentences per section, management/no-code language, no class names or code paths unless a PO decision needs them.

ChatGPT/CTO produces this by reading the executor's Technical Execution Report (Section 14.2), applying its own technical judgment, and translating only what the Product Owner needs to decide into plain language. ChatGPT/CTO is the only role that writes this format. An executor must never write this format as its own report.

### 14.2 Channel B — Executor → ChatGPT/CTO (Technical Execution Report)

Audience: ChatGPT/CTO. Authors: Antigravity, Claude Code, or an explicitly Product-Owner-authorized Codex.

This is a technical report, not a management summary — but it is not an audit log either. It is not subject to the 5-sentence limit or the no-code-language rule; technical terms, file paths, and commands are allowed and expected when they matter. It is subject to a different discipline: enough for ChatGPT/CTO to understand and verify the result, without re-narrating the whole process.

The report scales with task complexity. It does not have a fixed number of mandatory headings.

Default minimum, for most tasks:

- `Result` — what is done, not done, or blocked.
- `Cause / Key Evidence` — only if there was a defect or a non-obvious finding; skip for a task that had no defect to explain.
- `Changes Made` — the files/areas actually changed and their effect.
- `Validation` — what was actually run/checked and the real outcome, not just `PASS`.
- `Real Residuals` — only genuine open risk or deferred item; omit if there is none.
- `Git Handoff` — files changed, commit SHA, remote HEAD, push/worktree result, when Git is involved.

Sections may be merged (e.g. `Result` and `Validation` in one short paragraph) or dropped entirely when not relevant. Do not write `Not applicable` across a run of unused headings — simply omit them.

Do not include: a step-by-step account of which file was read or edited in what order; intermediate actions that were not the point of the task; the full onboarding/authority chain (assume the reader already knows it); restrictions that were simply followed with nothing to report; acceptance criteria copied back from the instructions; an intermediate error that was found and fixed within the same turn (mention only if it changes the residual risk picture); alternatives that were never seriously considered; or the same conclusion restated under two different headings.

Expand into full detail — additional evidence, root-cause reasoning with the fact chain, logs, stack traces, or exact test output — only when at least one applies: the defect is genuinely complex or multi-component, the conclusion is disputed or uncertain, there is material residual risk, or ChatGPT/CTO explicitly asks for it. When root cause is claimed, it must still be evidence-backed, not asserted; if evidence is insufficient, write `ROOT CAUSE NOT YET PROVEN` rather than guessing — but this does not require expanding every other section to match.

Target length as a guide, not a hard cap: roughly 100-250 words for a simple or purely documentation change, roughly 250-500 words for a real technical defect with root cause. Go longer only when the evidence genuinely requires it — never cut evidence, root cause reasoning, or a real residual risk just to fit a word count.

Do not draft a prompt for Claude Code, Antigravity, or any other executor in this report, and do not act as CTO/Coordinator — that decision belongs to ChatGPT/CTO.

### 14.3 Per-Executor Additions

Antigravity adds, only when relevant to the finding: environment/zoom, reproduction steps, expected versus observed, affected screen/component, and screenshot or runtime/browser/console evidence. Antigravity must not assert a backend root cause without backend evidence.

Claude Code adds, only when relevant to the finding: code path/dependency involved, the exact test command and its real output, and migration/schema/data or regression impact.

Codex, only when the Product Owner has explicitly authorized it as executor for a specific ticket, uses the same Technical Execution Report as Claude Code.

### 14.4 Boundary Between the Channels

- An executor's Technical Execution Report is never forced into no-code language or the three-part PO format by the executor itself, and is never padded with process narration or unused headings just to look thorough.
- ChatGPT/CTO's Product Owner-facing report is never expanded with raw technical evidence beyond what the Product Owner needs to decide.
- Both channels favor being concise over being exhaustive; neither channel replaces the other.
