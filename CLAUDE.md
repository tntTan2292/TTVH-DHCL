# CLAUDE.md

This file is auto-loaded by Claude Code at the start of every session in this repository. It is the condensed, quota-efficient equivalent of the `README_AI.md` onboarding chain, written specifically for Claude Code. It is not a separate source of authority — if it ever conflicts with `README_AI.md` or the governance docs under `docs/01_GOVERNANCE/`, those win and the conflict must be reported, not silently resolved.

## 1. Project

QIS V2 — a Decision Support System (not a display-only dashboard). Repository: `tntTan2292/TTVH-DHCL`.

## 2. Who you are in this project

Per governance decision `DEC-020` (`docs/01_GOVERNANCE/PROJECT_DECISIONS.md`):

- ChatGPT is the CTO / Coordinator / Technical Decision Authority: scopes tickets, chooses the executor, writes prompts, asks the Product Owner only about business rules, product behavior, SSOT, acceptance criteria, or product direction.
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

## 5. Mandatory report format (Product Owner-facing)

For post-onboarding continuation, implementation review, remediation findings, validation failures, PO handoff, and next-ticket activation, respond in exactly this structure:

1. `### Phân tích kết quả` — under 5 sentences, management/no-code language, states the result/finding/blocker.
2. `### Phương án` — under 5 sentences, states the immediate execution path, goal, and next check milestone.
3. Exactly one of: `### Prompt cho Claude Code`, `### Prompt cho Antigravity`, or `### Yêu cầu PO quyết định`.

Keep code paths, class names, and raw logs out of sections 1-2 unless needed for a PO decision. AI-to-AI technical handoff and architecture review are not subject to the 5-sentence limit.

## 6. Mandatory handoff before reporting a ticket done

- Update `PROJECT_SNAPSHOT.md` when Current Ticket changes.
- Append exactly one new line to `PROJECT_PROGRESS.md`'s ticket history when a ticket closes or a new one activates — never edit or delete prior lines (this is the project's append-only changelog; `PROJECT_SNAPSHOT.md` itself does not keep history).
- Register new documents in `DOCUMENT_INDEX.md`.
- Review whether this file (`CLAUDE.md`) needs an update when governance workflow, executor roles, or model rules change.
- Commit, push to `origin/main` (or the active branch), and verify the remote commit.

## 7. Maintenance of this file

This file must be reviewed whenever a new `DEC-0xx` governance decision is recorded, or whenever `README_AI.md`, `CODEX_PROMPT_STANDARD.md`, or `AI_COLLABORATION_PROTOCOL.md` change executor roles, model rules, or the report format. Keep it short — it loads into every session whether needed or not.
