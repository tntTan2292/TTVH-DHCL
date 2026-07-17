# TODAY-004-R3 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-004-R3`
- Ticket Name: `Canonical BCVH Options Runtime Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Recover the Operation Dashboard BCVH dropdown so it always exposes the canonical six BCVH units plus `Tất cả BCVH` from stable metadata, independent of operational fact rows.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `PO UI ACCEPTANCE REQUIRED`
- Recovery source: `TODAY-004-R2` PO FAIL
- Responsible PO finding: `POF-TODAY-004-03`
- Live phase, branch, PO status, and next-ticket routing are owned by `PROJECT_SNAPSHOT.md`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/10_TICKETS/TODAY-004-R2_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/TODAY-004-R2_MANIFEST.md)
- [docs/06_REVIEWS/Import/TODAY-004-R3_CANONICAL_BCVH_OPTIONS_RUNTIME_RECOVERY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004-R3_CANONICAL_BCVH_OPTIONS_RUNTIME_RECOVERY.md)
- [docs/06_REVIEWS/Import/TODAY-004-R3_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004-R3_PO_ACCEPTANCE_CHECKLIST.md)

## 5. Business Context

- Product Owner screenshot evidence showed only `Tất cả BCVH` in the opened BCVH dropdown.
- This invalidates the `TODAY-004-R2` browser PASS claim as PO acceptance evidence.
- The dropdown must contain exactly `Tất cả BCVH` plus six canonical units: `535790`, `536250`, `535470`, `537220`, `537015`, and `533140`.
- `TODAY-005` must remain inactive until this recovery receives explicit PO PASS.

## 6. Technical Context

- Canonical backend configuration: `backend/src/config/canonicalBcvhUnits.js`.
- `/api/f13/dashboard/meta` returns canonical `bcvh_units` from configuration, not `SELECT DISTINCT` from `fact_f13`.
- Frontend metadata binding validates exactly six canonical codes before enabling the BCVH filter.
- Invalid metadata disables the filter, shows a Vietnamese error, and provides retry.

## 7. Implementation Scope

- Stable canonical backend metadata.
- No stale cache headers for `/dashboard/meta`.
- Explicit frontend metadata states: loading, success, error.
- No silently usable one-option BCVH filter on malformed metadata.
- Preserve absent KPI/status selector.
- Preserve one combo chart, rolling 30-day window, canonical `ma_bcvh`, and missing-date gaps.

## 8. Out Of Scope

- Do not activate `TODAY-005`.
- Do not change frozen SSOT or architecture.
- Do not implement same-period comparison.
- Do not modify unrelated HTML files.

## 9. Validation

- Backend tests for canonical six-unit configuration and metadata independence from fact rows.
- Frontend tests for metadata validation, disabled/error behavior, canonical values, and combo chart preservation.
- Build and lint validation.
- Runtime API validation for `/dashboard/meta` headers and payload.
- Authenticated browser validation for DOM option count, labels, selection behavior, and screenshots.

## 10. Documents To Update

- `docs/10_TICKETS/TODAY-004-R2_MANIFEST.md`
- `docs/10_TICKETS/TODAY-004-R3_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-004-R3_CANONICAL_BCVH_OPTIONS_RUNTIME_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-004-R3_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`

## 11. Expected Output

- Technical PASS.
- Runtime PASS.
- Browser evidence attached.
- PO UI ACCEPTANCE REQUIRED.
- `TODAY-004-R3` remains open until explicit PO PASS.
- `TODAY-005` remains inactive.

## 12. Next Ticket

- Next ticket ID: `TODAY-005`
- Next ticket name: `Same-Period Comparison Trendline`
- Blockers or handoff notes: do not activate until `TODAY-004-R3` receives PO PASS and closure gates pass.
