# QIS V2 AI Entry Point

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Mandatory Start](#2-mandatory-start)
- [3. Operating Rules](#3-operating-rules)
- [4. Expected Output](#4-expected-output)
- [5. Current Repository Status](#5-current-repository-status)
- [6. Quick Links](#6-quick-links)
- [7. Golden Rule](#7-golden-rule)

## 1. Purpose

This repository belongs to QIS V2.

It is designed so any AI can onboard quickly, without guessing workflow or reading random files.

## 2. Mandatory Start

Every AI must:

1. Read [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
2. Read [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
3. Read the Current Manifest referenced by `PROJECT_SNAPSHOT.md`
4. Read only the Required Reading listed in that manifest
5. Use only the GitHub Blob URLs embedded in the onboarding chain; do not depend on relative paths for AI onboarding.

## 3. Operating Rules

AI must:

- follow Governance
- follow Authority Level
- not change SSOT
- not skip Reading Order
- not change frozen documents
- not infer business rules

## 4. Expected Output

After onboarding, AI must report:

- Project Understanding
- Governance Understanding
- Current Ticket
- Ready to Continue

If the active manifest authorizes implementation and no governance blocker exists, the AI must continue immediately into Codex prompt generation without waiting for another user request.

## 4.1 Post-Onboarding Behavior

If onboarding PASS completes and the active manifest authorizes implementation, the AI must immediately produce:

- `### Kết quả`
- `### Phương án`
- `### Prompt cho Codex`

Allowed stop conditions after onboarding are limited to manifests that explicitly indicate:

- `BLOCKED`
- `WAITING FOR PO`
- `WAITING FOR SSOT`
- `WAITING FOR REQUIREMENT`
- another governance-defined blocking state

## 5. Governance V2 Onboarding

The lightweight onboarding route is:

`README_AI.md`

↓

[docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)

↓

Current Manifest from `PROJECT_SNAPSHOT.md`

↓

Required Reading from the manifest

Current project state is owned by `PROJECT_SNAPSHOT.md`.

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

## 7. Golden Rule

Every AI must start from `README_AI.md` and then follow the manifest-driven route above.

`MASTER_START_PROMPT.md` and the full Governance V1 chain are fallback references only when:

- the manifest explicitly requires them
- an authority conflict exists
- SSOT, frozen architecture, business rules, PO acceptance, or workflow interpretation is involved

Do not skip the manifest-driven route.
