# COORDINATOR-ROLE-MIGRATION Manifest

Status: `IMPLEMENTED / READY FOR PO CHECK` (2026-08-19).

## 1. Ticket Information

- Ticket ID: `COORDINATOR-ROLE-MIGRATION`
- Phase: `Governance — CTO/Coordinator identity change`
- Executor: `Claude Code`, explicitly authorized by the Product Owner for documentation-only governance work
- Branch: `codex/da-impl-006`
- Baseline: `29346c92`
- Activation authority: `PO direct instruction: Product Owner stopped using ChatGPT as CTO/Coordinator and moved that role to Claude (claude.ai chat)`
- Initial worktree: tracked files clean; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Rename every reference to `ChatGPT` in the CTO / Coordinator / Technical Decision Authority role, across `docs/01_GOVERNANCE/`, `README_AI.md`, and `CLAUDE.md`, to `Claude (claude.ai chat)`, without changing the 3-part report format, the Lean Prompt Rule, the Executor Selection Rule (`CODEX_PROMPT_STANDARD.md` Section 13), Model Selection (Section 13.1), or any other role's scope.

## 3. In Scope

- All `ChatGPT` references naming the CTO/Coordinator/Technical Decision Authority role inside `docs/01_GOVERNANCE/`, `README_AI.md`, `CLAUDE.md`.
- A new `DEC-021` entry in `PROJECT_DECISIONS.md` recording the role transfer without rewriting the frozen `DEC-018`/`DEC-020` historical rows.
- Governance snapshot/progress updates.

## 4. Out Of Scope (Explicit Ticket Constraints)

- The 3-part report structure (`Phân tích kết quả` / `Phương án` / `Prompt cho Claude Code|Antigravity|Yêu cầu PO quyết định`).
- The Lean Prompt Rule, Executor Selection Rule (Section 13), Model Selection (Section 13.1) — only the `ChatGPT` naming inside them changed, not the rules themselves.
- Product code, schema, database.
- Any `ChatGPT` mention that is a historical record of a past decision or a generic, non-role-specific example (see Section 6).
- Ticket/checkpoint history under `docs/10_TICKETS/`, `docs/06_REVIEWS/` (other than this ticket's own new files) and `PROJECT_PROGRESS.md` entries predating this ticket.

## 5. Discovery (Self-Verified, Not Assumed)

`grep -rn "ChatGPT"` was re-run against the live repository rather than trusting the prompt's ~104-occurrence estimate. Results:

- `docs/01_GOVERNANCE/` (11 files): 93 line-matches / 96 true regex occurrences.
- `README_AI.md`: 7 line-matches / 12 true regex occurrences.
- `CLAUDE.md`: 4 line-matches / 5 true regex occurrences.
- Total: 104 matching lines (matches the prompt's estimate), 113 true token occurrences (a materially different, more accurate number — several lines carry more than one `ChatGPT` token, e.g. `DEC-020`'s own row and the `ChatGPT/CTO` compound label).

## 6. Deviations From A Blind Replace-Everywhere, And Why

Two files inside `docs/01_GOVERNANCE/` were found, on inspection, to require selective handling rather than a blind find-and-replace:

1. **`docs/01_GOVERNANCE/PROJECT_DECISIONS.md`** — the `DEC-018` and `DEC-020` rows in the Decision Log are frozen historical records of what was actually decided on `2026-07-31` and earlier (`DEC-020` is explicitly the frozen decision that named `ChatGPT` as coordinator). Rewriting their text in place would misrepresent history and would also violate the "do not change frozen documents" rule. Left both rows byte-for-byte unchanged; added a new `DEC-021` row recording the role transfer, referencing `DEC-020` as what it supersedes — following this same document's own established pattern (`DEC-020` itself references `DEC-018` as "What it replaces" without rewriting it). Updated the two non-decision-log prose lines (`Purpose` bullet, `Change Control` section) that describe current usage, not a past decision.
2. **`docs/01_GOVERNANCE/GOVERNANCE_V2_DESIGN.md`** — two sentences (`Section 2.1`, `Section 14.3`) list `ChatGPT` as one of several generic example AI tools ("Keep Codex, ChatGPT, Claude, Gemini, and similar assistants on the same reading contract"; "ChatGPT can read the snapshot and manifest as structured context") alongside `Claude` as a *separately named, different* list item in the same sentence. A blind rename would have produced `Claude, Claude, Gemini` — duplicated and semantically wrong. Left these two sentences unchanged; renamed the file's role-specific content (Section 9 `ChatGPT Reading Workflow` -> `Claude Reading Workflow`, its ToC entry and anchor, and `Section 9.2`), which does describe the Coordinator's own reading procedure, not a generic tool example.

Two entire files were left untouched because `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` itself classifies them as archived historical references, not live governance:

- `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` — `New Status: Archive`, `Historical prompt reference only`.
- `docs/01_GOVERNANCE/DOCUMENT_RESPONSIBILITY_MIGRATION.md` — `New Status: Archive`, `Historical governance migration reference`.

## 7. Implemented Contract

- 9 files received a full role-name rename (`README_AI.md`, `CLAUDE.md`, `CODEX_PROMPT_STANDARD.md`, `AI_COLLABORATION_PROTOCOL.md`, `DOCUMENT_GOVERNANCE.md`, `PROJECT_CONTEXT.md`, `PROJECT_HANDOVER.md`, `PO_UI_ACCEPTANCE_WORKFLOW.md`, `DOCUMENT_LIFECYCLE.md`): `ChatGPT` -> `Claude`; the first defining sentence in each ("X is the CTO / Coordinator / Technical Decision Authority") became `Claude (claude.ai chat) is the CTO / Coordinator / Technical Decision Authority` to disambiguate from `Claude Code`; compound labels (`ChatGPT/CTO`, `CTO/ChatGPT`) became `Claude/CTO`/`CTO/Claude`.
- 2 files received a selective rename per Section 6 (`PROJECT_DECISIONS.md`, `GOVERNANCE_V2_DESIGN.md`).
- `AI_COLLABORATION_PROTOCOL.md` Section 15 heading (`## 15. Product Owner to ChatGPT Collaboration Workflow`) and its Table of Contents entry/anchor were renamed together, keeping the anchor link intact (verified via a script comparing every `#anchor` link against every actual header slug in each of the 11 edited files -- zero broken anchors).
- `GOVERNANCE_V2_DESIGN.md` Section 9 heading, its `9.2` sub-heading, and its ToC entry/anchor were renamed together, same verification.
- `AI_COLLABORATION_PROTOCOL.md`'s `### ChatGPT` role-identity heading and `DOCUMENT_GOVERNANCE.md`'s `### ChatGPT` role-identity heading (neither referenced by any anchor link) became `### Claude (claude.ai chat)`, matching the sibling `### Antigravity` / `### Claude Code` / `### Product Owner` headings' pattern.
- `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` gained a new `DEC-021` row per Section 6.
- `CLAUDE.md`'s `DEC-020` citation (Section 2) updated to cite `DEC-020` and `DEC-021` together, since the coordinator-identity fact it states now comes from `DEC-021`.
- Every occurrence of the `Prompt cho Claude Code` / `Prompt cho Antigravity` / `Yêu cầu PO quyết định` heading set, the 3-part report format, `CODEX_PROMPT_STANDARD.md` Section 13/13.1, and every other role's scope (Antigravity, Claude Code, Product Owner, Codex) is verified unchanged.

## 8. Required Validation

- No `docs-lint` or comparable automated documentation test exists in this repository (`grep`-checked for a `lint`/`docs-lint` script and a `.github/workflows` CI pipeline; none found) -- not applicable, not run.
- Self-verification performed instead: a Node script compared every `[text](#anchor)` link against every actual header slug in all 11 edited files -- zero broken anchors.
- Full-repository `grep -rn "ChatGPT"` re-run after the edit: the only remaining matches are exactly the intentionally preserved locations (Section 6 above) -- `MASTER_START_PROMPT.md`, `DOCUMENT_RESPONSIBILITY_MIGRATION.md`, `GOVERNANCE_V2_DESIGN.md` lines 42/339, and `PROJECT_DECISIONS.md`'s `DEC-018`/`DEC-020` rows.
- `git status --porcelain` / `git diff --name-only` confirm exactly the 11 intended files changed (plus this ticket's 2 new manifest/checkpoint files) -- no product code, schema, or database file touched.
- Zero NUL bytes confirmed in every changed file (a defect class found and fixed in a prior ticket this session; re-checked explicitly here).
- Spot-read every changed section of `CODEX_PROMPT_STANDARD.md` Sections 7, 13, 13.1, 14, 14.1-14.3 to confirm the executor-selection, model-selection, and reporting-channel rules are textually unchanged apart from the `ChatGPT` -> `Claude` rename.

## 9. Stop Condition

`COORDINATOR-ROLE-MIGRATION IMPLEMENTED / READY FOR PO CHECK`.

This is a governance-identity change, not a self-passable technical validation. The Product Owner must confirm the renamed role reads correctly and that no unintended semantic change occurred before this closes. Not self-passed.
