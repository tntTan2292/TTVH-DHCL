# QIS V2 AI Entry Point

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Mandatory Start](#2-mandatory-start)
- [2.1 First-Prompt Governance Gate](#21-first-prompt-governance-gate)
- [3. Operating Rules](#3-operating-rules)
- [4. Mandatory Response Format](#4-mandatory-response-format)
- [5. Governance V2 Onboarding](#5-governance-v2-onboarding)
- [6. Quick Links](#6-quick-links)
- [7. Conversation Context Capacity and Fresh-Chat Handoff](#7-conversation-context-capacity-and-fresh-chat-handoff)
- [8. Golden Rule](#8-golden-rule)

## 1. Purpose

This repository belongs to QIS V2.

It is designed so any AI can onboard quickly, without guessing workflow or reading random files.

It is also the single universal external entry point for fresh AI continuity, regardless of ticket naming convention.

## 2. Mandatory Start

Every AI must:

1. Read [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/README_AI.md)
2. Read [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md) before creating any first `Prompt cho Codex` or `Prompt cho Antigravity`
3. Read [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
4. Read the Current Manifest referenced by `PROJECT_SNAPSHOT.md`
5. Read only the Required Reading listed in that manifest
6. Use only the GitHub Blob URLs embedded in the onboarding chain; do not depend on relative paths for AI onboarding.

## 2.1 First-Prompt Governance Gate

Before writing the first execution prompt in any new AI/chat session, the AI must read `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`.

If the Prompt Standard has not been read, the AI must not write `Prompt cho Codex` or `Prompt cho Antigravity`.

The first execution prompt defaults to:

- one defect or objective only;
- delta-only scope;
- fewer than `250` words unless Governance explicitly allows an exception;
- no repetition of Manifest content, SSOT text, ticket history, or repository-owned instructions.

## 3. Operating Rules

AI must:

- follow Governance
- follow Authority Level
- not change SSOT
- not skip Reading Order
- not change frozen documents
- not infer business rules
- own implementation, automated testing, build/lint, API validation, database validation, contract validation, and targeted technical runtime checks
- treat Product Owner visible UI and product acceptance as separate from Codex technical validation
- stop at `READY FOR PO CHECK` when `PO UI Check Required = Yes`
- provide a concise manual PO checklist for visible changes
- not perform broad UI acceptance or award PO PASS
- treat Technical PASS and Runtime/API Contract PASS as non-equivalent to PO PASS
- before drafting or executing a prompt, follow [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md) and [docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md); active-ticket follow-ups default to delta-only and LEVEL 1 unless broader scope is explicitly justified
- ChatGPT in the active Product Owner session is the coordination authority: receive requests, analyze tickets, finalize scope, choose the executor, write the prompt, review results, and request PO decisions
- only ChatGPT coordination may redirect work between Codex and Antigravity
- every future execution prompt must explicitly choose exactly one title: `Prompt cho Codex` or `Prompt cho Antigravity`
- use Codex for logic/contracts/backend/data/tests and Antigravity for layout, UI/UX, responsive behavior, visual polish, and final visual assembly
- do not use the combined heading `Prompt cho Codex/Antigravity`

## 4. Mandatory Response Format

After onboarding and for post-onboarding continuation, implementation-result review, remediation findings, validation failures, PO handoff, and next-ticket activation, AI must respond with exactly this concise three-part format:

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
   - `### Prompt cho Codex`
   - `### Prompt cho Antigravity`
   - `### Yêu cầu PO quyết định`

Do not use class names, function names, code paths, raw logs, or technical jargon in the first two sections unless they are necessary for a Product Owner decision.

Put technical details in the executor prompt, validation evidence, or a separate technical note.

If the active manifest authorizes implementation and no governance blocker exists, the AI must continue immediately into prompt generation without waiting for another user request.

If the active manifest conflicts with the current ticket named in `PROJECT_SNAPSHOT.md`, the AI must stop and report the conflict instead of guessing.

## 4.1 Post-Onboarding Behavior

If onboarding PASS completes and the active manifest authorizes implementation, the AI must immediately produce:

- `### Phân tích kết quả`
- `### Phương án`
- exactly one of `### Prompt cho Codex` or `### Prompt cho Antigravity`

Allowed stop conditions after onboarding are limited to manifests that explicitly indicate:

- `BLOCKED`
- `WAITING FOR PO`
- `WAITING FOR SSOT`
- `WAITING FOR REQUIREMENT`
- another governance-defined blocking state

When review finds an issue that can be remediated within the active ticket, AI must not stop after reporting the finding. ChatGPT coordination must immediately generate a remediation prompt for the correct single executor and keep the active ticket current until remediation, revalidation, and required PO acceptance are complete.

AI must request a Product Owner decision only when the finding requires a business-rule, SSOT, frozen-behavior, scope, threshold, acceptance, or authority decision.

## 5. Governance V2 Onboarding

The lightweight onboarding route is:

`README_AI.md`

↓

[docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)

↓

[docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)

↓

[docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md)

↓

Required Reading from the Current Manifest

Current project state is owned by `PROJECT_SNAPSHOT.md`.

Current active handoff: `AUTO-IMPORT-007 ACTIVE / WAVE 2 IMPLEMENTED`, DOC-GOV-CLEANUP-001 completed `TECHNICAL PASS` at commit `366fbe0738a1b1f8d3a5c8753d4930b69a97004f`; shared DKCL lifecycle contract/state standardization and bounded backend/data Import architecture are technical PASS; next action is Product Owner authorization for Accelerated Delivery Wave 3 in a fresh Antigravity conversation after Wave 2 closure is pushed and remote state is verified, not self-authorized implementation.

Ticket naming conventions do not change this route; the live state must always be resolved from `README_AI.md` -> `CODEX_PROMPT_STANDARD.md` -> `PROJECT_SNAPSHOT.md` -> Current Manifest -> Required Reading.

## 6. Quick Links

- [docs/01_GOVERNANCE/MASTER_START_PROMPT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/MASTER_START_PROMPT.md) fallback reference only
- [docs/01_GOVERNANCE/DOCUMENT_INDEX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_INDEX.md)
- [docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)
- [docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md) Codex workflow standard
- [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [docs/01_GOVERNANCE/PROJECT_CONTEXT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_CONTEXT.md)
- [docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PROJECT_DECISIONS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_DECISIONS.md)
- [docs/06_REVIEWS/Shared/PO_REVIEW_TEMPLATE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_REVIEW_TEMPLATE.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
- [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)

## 7. Conversation Context Capacity and Fresh-Chat Handoff

The assistant or Codex must monitor whether the current conversation has become excessively long, repetitive, difficult to navigate, or likely to lose critical project context.

One conversation serves one ticket or one major delivery wave. Continue remediation and validation for that same bounded ticket or wave in the current conversation. Start a new conversation only for a new ticket, a new major delivery wave, or materially different work scope.

When the conversation approaches practical context capacity, becomes noticeably heavy, contains multiple completed phases, or risks mixing obsolete and current authority, the assistant must proactively tell the Product Owner to open a new conversation. Do not wait until context is already lost. Each executor must clearly state when the current conversation should end and a fresh one should begin.

The warning must be concise and must not interrupt urgent work unnecessarily. Before changing conversations, update required repository evidence, commit, push, and verify the remote state. Do not open a new conversation to bypass unfinished work, failures, dirty workspace, locks, or a wrong branch.

Provide a concise fresh-chat handoff containing:

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

## 8. Golden Rule

Every AI must start from `README_AI.md` and then follow the manifest-driven route above.

`MASTER_START_PROMPT.md` and the full Governance V1 chain are fallback references only when:

- the manifest explicitly requires them
- an authority conflict exists
- SSOT, frozen architecture, business rules, PO acceptance, or workflow interpretation is involved

Do not skip the manifest-driven route.
