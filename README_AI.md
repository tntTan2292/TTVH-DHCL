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
2. Read [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md) before creating any first `Prompt cho Claude Code` or `Prompt cho Antigravity`
3. Read [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
4. Read the Current Manifest referenced by `PROJECT_SNAPSHOT.md`
5. Read only the Required Reading listed in that manifest
6. Use only the GitHub Blob URLs embedded in the onboarding chain; do not depend on relative paths for AI onboarding.

## 2.1 First-Prompt Governance Gate

Before writing the first execution prompt in any new AI/chat session, the AI must read `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`.

If the Prompt Standard has not been read, the AI must not write `Prompt cho Claude Code` or `Prompt cho Antigravity`.

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
- treat Product Owner visible UI and product acceptance as separate from executor technical validation
- stop at `READY FOR PO CHECK` when `PO UI Check Required = Yes`
- provide a concise manual PO checklist for visible changes
- not perform broad UI acceptance or award PO PASS
- treat Technical PASS and Runtime/API Contract PASS as non-equivalent to PO PASS
- before drafting or executing a prompt, follow [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md) and [docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md); active-ticket follow-ups default to delta-only and LEVEL 1 unless broader scope is explicitly justified
- ChatGPT is the CTO / Coordinator / Technical Decision Authority in the active Product Owner session: receive requests, analyze tickets, finalize scope, choose the executor, write the prompt, review results, and request PO decisions only for business rules, product behavior, SSOT, acceptance criteria, or product direction
- the default executors are `Antigravity` and `Claude Code`; only ChatGPT coordination may redirect work between them
- `Codex` is no longer the default executor and must not be selected unless the Product Owner explicitly authorizes it for a specific ticket; historical Codex tickets, checkpoints, and manifests remain valid records and must not be rewritten
- every future execution prompt must explicitly choose exactly one title: `Prompt cho Claude Code` or `Prompt cho Antigravity`, plus the executor/model pairing
- executor/model is a fixed pairing, not a free choice: `Antigravity (Gemini)` for UI/UX, visual polish, and Windows runtime inspection; `Claude Code (Sonnet)` for local/bounded discovery, implementing an approved plan, tests, documentation, and Git; `Claude Code (Opus)` for complex/cross-module planning, architecture, and high-risk technical decisions — see `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` Section 13/13.1 for the authoritative rule, including the invalid-label list (e.g. `Antigravity–Sonnet`, `Claude Code–Gemini`)
- do not use the combined heading `Prompt cho Claude Code/Antigravity`
- when risk is high, the same executor/model pairing must not both implement a change and self-approve or self-review that same change
- there are two distinct reporting channels with different audiences: ChatGPT/CTO → Product Owner (management, three-part format, Section 4 below) and Antigravity/Claude Code/authorized Codex → ChatGPT/CTO (full technical detail, the Technical Execution Report in `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` Section 14.2); an executor never writes the Product Owner-facing format as its own report and never drafts a prompt for another executor

## 4. Mandatory Response Format

Audience: ChatGPT/CTO reporting to the Product Owner only. This format is for ChatGPT/CTO reporting to the Product Owner. It is not the format an executor (Antigravity, Claude Code, or an explicitly authorized Codex) uses to report to ChatGPT/CTO — an executor uses the Technical Execution Report defined in `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` Section 14.2, which carries full technical detail, is not limited to 5 sentences, and is not written in no-code language.

After onboarding and for post-onboarding continuation, implementation-result review, remediation findings, validation failures, PO handoff, and next-ticket activation, ChatGPT/CTO must respond with exactly this concise three-part format:

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

If the active manifest authorizes implementation and no governance blocker exists, the AI must continue immediately into prompt generation without waiting for another user request.

If the active manifest conflicts with the current ticket named in `PROJECT_SNAPSHOT.md`, the AI must stop and report the conflict instead of guessing.

## 4.1 Post-Onboarding Behavior

Audience: ChatGPT/CTO only. This section governs ChatGPT/CTO, the only role that chooses an executor and writes an execution prompt. If onboarding PASS completes and the active manifest authorizes implementation, ChatGPT/CTO must immediately produce:

- `### Phân tích kết quả`
- `### Phương án`
- exactly one of `### Prompt cho Claude Code` or `### Prompt cho Antigravity`

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

Current Manifest — `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` (`Current Ticket = NETWORK-MANAGEMENT-001` in `PROJECT_SNAPSHOT.md`)

↓

Current Checkpoint — `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md`

↓

`NETWORK-MANAGEMENT-001` Phase 4 (Nghiệm thu) is in progress; await Product Owner runtime recheck of the Sơ đồ tuyến phát data contract remediation before further Phase 4 scope items are authorized or Phase 4/program closure is declared; the Product Owner-named "Bản đồ tổng thể mạng lưới" module remains not authorized

Current project state is owned by `PROJECT_SNAPSHOT.md`.

Current active handoff: active ticket is `NETWORK-MANAGEMENT-001` (Quản lý mạng lưới), `PHASE 4 (NGHIỆM THU) IN PROGRESS` as of `2026-08-06`. Phase 3 (Import) closed with `PO GATE 3 PASS` (`2026-08-06`, baseline `7da98a79eb8`) after a remediation chain covering ĐTC2 road routing/journey visuals, tuyến-phát routing resilience, and Date Picker semantics, with Product Owner confirming no regression in Import/Export/History/Rollback (manifest Section 29, checkpoint Section 18). Product Owner then authorized Phase 4 with a first scoped item: a Sơ đồ tuyến phát data contract audit found the real 29-column raw monthly BatchFile could not be uploaded as-is (Phase 3's Import required an unrelated 12-column flat template), "Biển số" had no real source anywhere and was always NULL, and no filename-vs-content period validation or file-archive mechanism existed. PO-approved remediation same day: Import now reads the real raw BatchFile directly via a new header-name-based parser (persisting only the 11 fields the map needs); "Biển số" removed from Import/Export (schema column kept, nullable, untouched); filename/content period cross-checked with a non-blocking warning; classify/apply/upsert left unchanged (multi-month-safe); the original file archived after Confirm with checksum + metadata, no retention/auto-delete. 104 backend + 53 frontend tests pass, incl. a real-file parse reproducing the exact 143,475-row baseline; real-API and real-UI runtime validated (duplicate-fingerprint rejection of the real production file, Preview→Confirm→Archive→checksum-verify, Rollback via the actual UI, 2 sequential months with zero cross-month interference). All test-injected data rolled back/removed; `fact_f13`/`network_delivery_point` confirmed at exact pre-test baseline afterward. `admin`+`viewer` read access unchanged; Import/Export/History/Rollback remain `admin`-only. No Excel/HTML source file was ever modified across this chain. See `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` Section 30 and checkpoint Section 19 for the full record.

Separately, the prior `F13-STANDARDIZATION-001` program's Tuyến Ranking (Route Ranking) delta closed on `2026-08-04` with explicit Product Owner `PO PASS` (latest implementation commit `03ce28bacc36b49d961caa1c006a011beb804bc7`) — pagination `10 tuyến/trang`, ascending `passed_rate` default sort, page navigation, and reconciliation table all confirmed correct at runtime. This closure covers only Tuyến Ranking and its violation drill-down; the program's Phase 0 (implemented, not separately closed) and Phase 1-4 (not started) remain open, not closed by this, and unrelated to `NETWORK-MANAGEMENT-001`. See `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 16 for the full closure record.

`F13-DATA-2098-CLEANUP-IMPL` is `COMPLETED / TECHNICAL PASS / CLOSED` as of `2026-08-04` (CTO review; reviewed implementation commit `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`). Year-2098 test/future data was permanently removed: 4 `fact_f13` rows and 4 `import_log` rows deleted, zero 2098 rows and zero `BCVH TEST` rows remain, 2026 unchanged at 663,126 rows / 213 days, and the authoritative `danh_gia_2026` KPI remains `58.6233%`. The pre-cleanup backup is retained and must not be deleted. `F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN` is `CLOSED — PO DECISIONS RECORDED` as of the same date; `danh_gia_2026` is the authoritative F1.3 result field.

Next-direction candidates for the closed-out `F13-STANDARDIZATION-001` program are recorded in `PROJECT_SNAPSHOT.md` as candidates only and must not be self-activated; they are unrelated to the now-active `NETWORK-MANAGEMENT-001` ticket.

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

The assistant, Antigravity, or Claude Code must monitor whether the current conversation has become excessively long, repetitive, difficult to navigate, or likely to lose critical project context.

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
