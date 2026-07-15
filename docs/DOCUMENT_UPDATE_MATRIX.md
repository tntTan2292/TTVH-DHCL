# DOCUMENT UPDATE MATRIX

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Update Matrix](#2-update-matrix)
- [3. Event Notes](#3-event-notes)

## 1. Purpose

This matrix defines which documents must be updated when a specific governance, architecture, UX, planning, or development event occurs.

## 2. Update Matrix

| Event | Documents to Update |
| --- | --- |
| Architecture Changed | `PROJECT_PROGRESS.md`, `PROJECT_STATUS.md`, `PROJECT_DECISIONS.md`, `PROJECT_HANDOVER.md`, affected architecture docs |
| Architecture Freeze | `PROJECT_PROGRESS.md`, `PROJECT_STATUS.md`, `PROJECT_DECISIONS.md`, `PROJECT_HANDOVER.md`, relevant freeze review docs |
| UX Freeze | `PROJECT_PROGRESS.md`, `PROJECT_STATUS.md`, `PROJECT_DECISIONS.md`, `PROJECT_HANDOVER.md`, `UX_CONSISTENCY_REVIEW.md` |
| Center PASS Review | `PROJECT_PROGRESS.md`, `PROJECT_HANDOVER.md`, center review doc |
| Runtime Completed | `PROJECT_PROGRESS.md`, `PROJECT_STATUS.md`, `PROJECT_HANDOVER.md`, relevant runtime/review evidence |
| New Epic | `EPIC_PLANNING.md`, `FEATURE_PLANNING.md`, `DEVELOPMENT_BACKLOG.md`, `PROJECT_PROGRESS.md` |
| New Feature | `FEATURE_PLANNING.md`, `DEVELOPMENT_BACKLOG.md`, `PROJECT_PROGRESS.md` |
| New Ticket | `DEVELOPMENT_BACKLOG.md`, `PROJECT_PROGRESS.md` |
| Ticket PASS | `PROJECT_PROGRESS.md`, `PROJECT_HANDOVER.md`, `PROJECT_STATUS.md` if the phase or milestone changes |
| Review PASS | `PROJECT_PROGRESS.md`, `PROJECT_HANDOVER.md`, review document |
| Technical Planning Change | `IMPLEMENTATION_ARCHITECTURE.md`, `RELEASE_PLANNING.md`, `EPIC_PLANNING.md`, `FEATURE_PLANNING.md`, `DEVELOPMENT_BACKLOG.md`, `PROJECT_PROGRESS.md`, `PROJECT_STATUS.md` |
| Implementation Change | `PROJECT_PROGRESS.md`, `DEVELOPMENT_BACKLOG.md`, relevant code or runtime docs |
| Architecture Decision Freeze | `PROJECT_DECISIONS.md`, `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, relevant architecture docs |
| Business Decision Freeze | `PROJECT_DECISIONS.md`, `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, `PROJECT_SSOT.md` if applicable |
| Context Contract Change | `PROJECT_CONTEXT.md`, `PROJECT_HANDOVER.md`, `AI_COLLABORATION_PROTOCOL.md`, `PROJECT_DECISIONS.md` |
| Runtime Contract Change | `IMPLEMENTATION_ARCHITECTURE.md`, `PROJECT_DECISIONS.md`, `PROJECT_CONTEXT.md`, `PROJECT_HANDOVER.md` |
| Governance Doc Added | `DOCUMENT_INDEX.md`, `DOCUMENT_GOVERNANCE.md` if governance rules changed |
| Document Superseded | `DOCUMENT_INDEX.md`, `DOCUMENT_LIFECYCLE.md`, `PROJECT_HANDOVER.md` if read order changes |

## 3. Event Notes

Guidelines:

- update only the documents affected by the event
- keep status and progress documents synchronized when a milestone changes
- if the change affects freeze boundaries, update decision and handover documents
- if the change affects chat continuity, update `MASTER_START_PROMPT.md`
- if the change affects document inventory, update `DOCUMENT_INDEX.md`

