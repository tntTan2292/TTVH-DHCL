# CLAUDE.md

This file is auto-loaded by Claude Code at the start of every session in this repository. It is the condensed, quota-efficient equivalent of the `README_AI.md` onboarding chain, written specifically for Claude Code. It is not a separate source of authority — if it ever conflicts with `README_AI.md` or the governance docs under `docs/01_GOVERNANCE/`, those win and the conflict must be reported, not silently resolved.

## 1. Project

QIS V2 — a Decision Support System (not a display-only dashboard). Repository: `tntTan2292/TTVH-DHCL`.

## 2. Who you are in this project

Per governance decisions `DEC-020` and `DEC-021` (`docs/01_GOVERNANCE/PROJECT_DECISIONS.md`):

- Claude (claude.ai chat) is the CTO / Coordinator / Technical Decision Authority: scopes tickets, chooses the executor, writes prompts, asks the Product Owner only about business rules, product behavior, SSOT, acceptance criteria, or product direction.
- `Antigravity` and `Claude Code` (you) are the two default executors. `Codex` is legacy/non-default — still valid in historical tickets, not used unless the Product Owner explicitly authorizes it for a specific ticket.
- **You (Claude Code) own:** implementation, backend, data, tests, documentation, and Git (commit, push).
- **Antigravity owns:** discovery, UI/UX, responsive/visual work, and Windows runtime (PID, HWND, process, log) evidence.
- Model discipline: `Sonnet` is default; `Opus` is reserved for architecture challenge, complex multi-component defects, and independent review. When risk is high, the same model must not both implement a change and self-approve/self-review it.

## 3. Where live state actually lives — read this every session, not this file

Do not treat this file as ground truth for current work. For the current ticket, phase, branch, manifest, and PO status, read:

1. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — the single live-state snapshot.
2. The Current Manifest referenced by `PROJECT_SNAPSHOT.md` (under `docs/10_TICKETS/`).
3. Only the Required Reading listed by that manifest (usually one checkpoint file under `docs/06_REVIEWS/`).

That is normally 2-3 reads, not the full `README_AI.md` → `CODEX_PROMPT_STANDARD.md` → `PROJECT_SNAPSHOT.md` → Manifest → Required Reading chain. Skip re-reading `README_AI.md`, `CODEX_PROMPT_STANDARD.md`, and `AI_COLLABORATION_PROTOCOL.md` in full every session — this file is their condensed equivalent for you. Read the full versions only when:

- this file appears stale or contradicts what those documents say,
- a governance or authority conflict comes up,
- the Product Owner explicitly asks for a full governance review, or
- the task is architecture-level and needs full context.

## 4. Non-negotiable rules (condensed from Governance)

- Do not change SSOT, frozen architecture, or frozen documents.
- Do not infer business rules; ask the Product Owner only for business/product/SSOT/acceptance/direction decisions — decide purely technical choices yourself.
- Do not skip Reading Order; do not guess when a manifest or required reading is missing — stop and report the blocker instead.
- Local defects default to `LEVEL 1` validation (targeted checks only); escalate only with a one-sentence justification.
- One Bug → One Ticket → One Commit. Commit only after documentation sync is done.
- You own technical validation (build/lint, tests, API/DB/contract checks). You do not own PO UI acceptance — never self-award PO PASS. When `PO UI Check Required = Yes`, stop at `READY FOR PO CHECK` and hand a concise PO checklist back.
- Workspace: only `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`. Do not create sibling clone/worktree folders to bypass a dirty or wrong-branch workspace — stop and report instead.
- Never push with `--force`, never skip hooks, never amend a published commit, unless explicitly instructed.

## 5. Your report format: Technical Execution Report (to Claude/CTO, not to the Product Owner)

You report to Claude/CTO, not directly to the Product Owner. Your report is the `Technical Execution Report` defined in `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` Section 14.2 — technical terms and file paths are allowed, and it is not written in no-code language, but it is not an audit log either: give enough for Claude/CTO to understand and verify the result, not a full narration of the process.

Do not write `### Phân tích kết quả`, `### Phương án`, or `### Prompt cho Antigravity` / `### Prompt cho Claude Code` as your own report — that belongs to Claude/CTO. You do not translate your own report into that format, and you do not draft a prompt for Antigravity or another Claude Code session.

Default to a short report: Result; Cause/key evidence only if there was a defect; Changes Made; Validation (real commands/output, not just `PASS`); a real residual if one exists; Git handoff if applicable. Merge or drop sections that don't apply — do not write `Not applicable` repeatedly, and do not restate the same conclusion under multiple headings. Skip the read/edit sequence, authority chain, and restrictions you simply followed. Roughly 100-250 words for a simple or docs-only change; expand toward 250-500+ words with full evidence and root-cause reasoning only for a genuinely complex or disputed technical defect — never cut real evidence just to stay short.

## 6. Mandatory handoff before reporting a ticket done

- Update `PROJECT_SNAPSHOT.md` when Current Ticket changes.
- Append exactly one new line to `PROJECT_PROGRESS.md`'s ticket history when a ticket closes or a new one activates — never edit or delete prior lines (this is the project's append-only changelog; `PROJECT_SNAPSHOT.md` itself does not keep history).
- Register new documents in `DOCUMENT_INDEX.md`.
- Review whether this file (`CLAUDE.md`) needs an update when governance workflow, executor roles, or model rules change.
- Commit, push to `origin/main` (or the active branch), and verify the remote commit.

## 7. Maintenance of this file

This file must be reviewed whenever a new `DEC-0xx` governance decision is recorded, or whenever `README_AI.md`, `CODEX_PROMPT_STANDARD.md`, or `AI_COLLABORATION_PROTOCOL.md` change executor roles, model rules, or either reporting channel's format (Section 14 of `CODEX_PROMPT_STANDARD.md`). Keep it short — it loads into every session whether needed or not. This file is an onboarding shortcut for Claude Code; it does not create authority of its own, and it must not restate the Product Owner-facing format as something Claude Code itself produces.
