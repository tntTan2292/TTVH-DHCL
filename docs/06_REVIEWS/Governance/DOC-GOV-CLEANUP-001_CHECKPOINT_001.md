# DOC-GOV-CLEANUP-001 CHECKPOINT 001

## Phase

- Ticket: `DOC-GOV-CLEANUP-001`
- Ticket name: `Toi gian va chuan hoa he thong tai lieu du an`
- Phase: `PLAN-EXECUTION`
- Current state: `ACTIVE / READY FOR PO REVIEW`
- Technical status: `PASS`
- Runtime status: `NOT APPLICABLE`
- PO product status: `NOT APPLICABLE`
- Latest verified remote commit before activation: `2c9447d33b25460b0c2b283365535dd6ffe6df5d`
- Authority: `PO authorized governance document cleanup`

## Scope Lock

This checkpoint activates only the governance documentation cleanup.

Do not modify functional code, audit code, change import implementation, alter Dashboard/KPI/authentication, delete historical documents, or change business SSOT.

## Cleanup Plan

1. Inventory the `docs` directory.
2. Identify at most `5` active onboarding documents.
3. Convert old documents to conditional reference or archive status.
4. Correct wrong status entries in `DOCUMENT_INDEX`.
5. Preserve historical evidence and ticket records.

## Cleanup Result

Completed under docs-only scope.

No functional code, business SSOT, import execution, Dashboard, KPI, authentication, or historical evidence file was modified, deleted, moved, merged, or archived by filesystem move.

Metadata/index cleanup performed:

- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` was rewritten as a concise metadata index.
- Fresh onboarding is now capped at `5` steps:
  1. `README_AI.md`.
  2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`.
  3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`.
  4. Current Manifest from Snapshot.
  5. Required Reading from Current Manifest.
- Non-onboarding documents are classified as `Conditional Reference` or `Archive`.
- Duplicate active group listings were removed from the index metadata. Examples corrected include `PROJECT_HANDOVER`, `PROJECT_CONTEXT`, `AI_COLLABORATION_PROTOCOL`, `CODEX_PROMPT_STANDARD`, `PROJECT_DECISIONS`, and `MASTER_START_PROMPT`.
- Wrong `Active` / `Read Priority 1` semantics for old reviews, old manifests, reports, and evidence were corrected by classifying those rows by path/pattern as conditional reference or archive.

## Inventory Before Cleanup

| Category | Files | Markdown | Other |
| --- | ---: | ---: | ---: |
| Governance | 15 | 15 | 0 |
| Architecture | 12 | 12 | 0 |
| UX | 7 | 7 | 0 |
| Technical Planning | 7 | 7 | 0 |
| Development Reference | 4 | 4 | 0 |
| Reviews and Evidence | 128 | 98 | 30 |
| Conditional Reference | 45 | 41 | 4 |
| Archive | 9 | 9 | 0 |
| Reports Archive | 21 | 21 | 0 |
| Ticket Manifests | 37 | 37 | 0 |
| Root Legacy/Frozen Docs | 21 | 21 | 0 |
| Total under `docs` | 306 | 272 | 34 |

## Inventory After Cleanup

| Category | Files | Markdown | Other |
| --- | ---: | ---: | ---: |
| Governance | 15 | 15 | 0 |
| Architecture | 12 | 12 | 0 |
| UX | 7 | 7 | 0 |
| Technical Planning | 7 | 7 | 0 |
| Development Reference | 4 | 4 | 0 |
| Reviews and Evidence | 128 | 98 | 30 |
| Conditional Reference | 45 | 41 | 4 |
| Archive | 9 | 9 | 0 |
| Reports Archive | 21 | 21 | 0 |
| Ticket Manifests | 37 | 37 | 0 |
| Root Legacy/Frozen Docs | 21 | 21 | 0 |
| Total under `docs` | 306 | 272 | 34 |

File-count reconciliation: `PASS`; total docs file count remained `306`.

## PO Inventory Table

| Path | Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- |
| `README_AI.md` | External AI entry point and route. | L2 | Active Onboarding | Every fresh session. | Mandatory |
| `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` | First-prompt gate and prompt standard. | L2 | Active Onboarding | Before first execution prompt. | Mandatory |
| `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` | Current ticket state and manifest pointer. | L2 | Active Onboarding | Every fresh session after Prompt Standard. | Mandatory |
| `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md` | Current ticket scope and authority. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md` | Current cleanup checkpoint and preservation gate. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | Metadata index and inventory. | L2 | Current Required Reading | Governance cleanup or authority checks. | High |
| `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | Governance rules. | L1 | Conditional Reference | Governance conflict only. | High |
| `docs/01_GOVERNANCE/DOCUMENT_*`, `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md`, `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md`, `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Governance support and decision records. | L1/L2/L3 | Conditional Reference | Only when current manifest or conflict requires. | Medium/High |
| `docs/PROJECT_SSOT.md` | Frozen business SSOT. | L1 | Conditional Reference | Business-rule conflict only. | High |
| `docs/02_ARCHITECTURE/**`, `docs/03_UX/**`, `docs/04_TECHNICAL_PLANNING/**`, `docs/05_DEVELOPMENT/**` | Architecture, UX, planning, and implementation references. | L2/L3/L4 | Conditional Reference | Domain-specific work only. | Medium |
| `docs/06_REVIEWS/**` | Reviews, checkpoints, PO evidence, screenshots, runtime artifacts. | L2/L3/L4 | Conditional Reference | Only when current manifest names specific evidence. | Medium |
| `docs/07_REFERENCE/**` | Business/domain/legacy references. | L4 | Conditional Reference or Archive | Reference lookup only. | Low/Medium |
| `docs/08_ARCHIVE/**`, `docs/09_REPORTS/**`, root report files under `docs/*.md` | Historical archive and reports. | L4 | Archive | Historical lookup only. | Low |
| `docs/10_TICKETS/**` other than current manifest | Historical, completed, planned, or queued manifests. | L2/L3 | Conditional Reference | Only when Snapshot/Manifest names that ticket. | Medium |

## Duplicate Content Scan

Exact duplicate content scan found only empty placeholder files:

- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/assets/.gitkeep`.
- `docs/07_REFERENCE/Domains/_template_indicator/assets/.gitkeep`.

Recommendation only: keep both placeholders because they preserve separate directory structures. No merge/delete action is authorized in this ticket.

## Link and Authority Check

- Fresh onboarding route checked: `README_AI.md` -> `CODEX_PROMPT_STANDARD.md` -> `PROJECT_SNAPSHOT.md` -> Current Manifest -> Required Reading.
- Current manifest link checked: `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md`.
- Current checkpoint link checked: `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md`.
- AUTO-IMPORT-007 remains `AUTHORIZED / QUEUED` and `WAITING FOR DOC-GOV-CLEANUP-001`.
- No authority conflict found in the active onboarding chain after cleanup.

## Queued Work

`AUTO-IMPORT-007` is `AUTHORIZED / QUEUED` and `WAITING FOR DOC-GOV-CLEANUP-001`.

No AUTO-IMPORT-007 discovery or implementation is authorized while this ticket is active.

## Current Handoff

- Current ticket: `DOC-GOV-CLEANUP-001`.
- Current phase: `DOCUMENT CLEANUP EXECUTED`.
- Current manifest: `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md`.
- Next queued ticket: `AUTO-IMPORT-007`.
- Functional code changes are not authorized.
- Next status: ready for PO review of governance document cleanup.
