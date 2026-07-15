# DOCUMENT LIFECYCLE

## Table of Contents

- [1. State Definition](#1-state-definition)
- [2. Transition Rules](#2-transition-rules)
- [3. Who Can Change State](#3-who-can-change-state)
- [4. Freeze Policy](#4-freeze-policy)
- [5. Archive Policy](#5-archive-policy)
- [6. Versioning Policy](#6-versioning-policy)

## 1. State Definition

| State | Definition |
| --- | --- |
| Draft | The document is being created and is not yet approved |
| Review | The document is under review by the relevant owner or reviewer |
| Approved | The document has been accepted for use but may still be updated under control |
| Frozen | The document is treated as a contract and should not change casually |
| Superseded | A newer document or decision replaces the current one |
| Archived | The document is retained for history but is no longer active |

## 2. Transition Rules

```text
Draft
↓
Review
↓
Approved
↓
Frozen
↓
Superseded
↓
Archived
```

Allowed transitions:

- Draft -> Review
- Review -> Approved or back to Draft
- Approved -> Frozen
- Frozen -> Superseded when a newer approved document replaces it
- Superseded -> Archived when history retention is required

## 3. Who Can Change State

| State Change | Primary Authority |
| --- | --- |
| Draft -> Review | Document author |
| Review -> Approved | Owner / reviewer for the document group |
| Approved -> Frozen | Product Owner or ChatGPT depending on document class |
| Frozen -> Superseded | Product Owner for business/SSOT, ChatGPT for architecture docs when approved |
| Superseded -> Archived | Repository governance owner / ChatGPT coordination |

Rules:

- business-facing frozen documents require Product Owner approval for change
- architecture and UX frozen documents require freeze review before state change
- development planning documents may be updated when upstream decisions change

## 4. Freeze Policy

- Frozen means the document is a contract
- Frozen documents must not be changed without explicit approval
- Frozen documents are read first in new sessions
- Frozen documents must stay consistent with SSOT
- A frozen document can only change through controlled governance

## 5. Archive Policy

- Superseded documents are preserved for traceability
- Archived documents are not active references for new work
- Archive only after a replacement document is available
- Archive history must remain accessible for governance and audit

## 6. Versioning Policy

- use versioned history through Git commits
- keep the latest approved version in the canonical path
- avoid parallel competing documents for the same authority
- when a document is replaced, update related index and handover docs if needed

