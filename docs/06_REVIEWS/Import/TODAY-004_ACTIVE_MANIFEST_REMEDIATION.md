# TODAY-004 Active Manifest Remediation

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-004 Active Manifest Remediation` |
| Technical Status | `PASS` |
| Runtime Status | `NOT REQUIRED` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT READY` |
| Current Ticket | `TODAY-004 Volume Trendline` |
| Current Manifest | `docs/10_TICKETS/TODAY-004_MANIFEST.md` |

## Root Cause Confirmation

The previous active manifest described governance pointer activation rather than the actual Volume Trendline implementation authority.

It also duplicated mutable live-state metadata that belongs in `PROJECT_SNAPSHOT.md`.

## Corrective Action

The manifest now:

- authorizes the actual TODAY-004 Volume Trendline implementation
- removes stale manifest-level current commit metadata
- keeps live mutable state owned by `PROJECT_SNAPSHOT.md`
- uses authoritative GitHub Blob URLs in Required Reading
- retains the expected `TODAY-004` ticket identity and volume trendline purpose

## Implementation Authority Summary

`TODAY-004` is the active implementation ticket for the Operation Dashboard daily total shipment volume trendline.

The manifest should drive future Codex execution directly, without being a governance-only placeholder.

## Fresh Onboarding Expectation

A fresh AI reading only `README_AI.md` must be able to:

1. reach `PROJECT_SNAPSHOT.md`
2. resolve the current manifest
3. read the required authority set
4. recognize `TODAY-004` as implementation work
5. generate the Codex implementation prompt without repository search

## Authority Notes

- This report does not change SSOT.
- This report documents the active-manifest remediation only.
- If a higher-authority document conflicts with this remediation summary, follow the higher-authority document and escalate the discrepancy.

## Completion

- Result: `PASS`
- Publication: `Remote Published`
- Status: `Closed`
