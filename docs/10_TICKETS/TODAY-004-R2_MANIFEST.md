# TODAY-004-R2 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-004-R2`
- Ticket Name: `BCVH Filter and Combo Trendline Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Recover the Operation Dashboard filter and combo trendline behavior after PO rejection of `TODAY-004-R1`.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / PO FAIL / Recovery Activated`
- PO UI Check Required: `Yes`
- PO Product Status: `PO FAIL`
- Recovery source: `TODAY-004-R1` PO FAIL
- Responsible PO finding: `POF-TODAY-004-02`
- Follow-up recovery: `TODAY-004-R3 Canonical BCVH Options Runtime Recovery`
- Live phase, branch, PO status, and next-ticket routing are owned by `PROJECT_SNAPSHOT.md`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/10_TICKETS/TODAY-004-R1_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/TODAY-004-R1_MANIFEST.md)
- [docs/06_REVIEWS/Import/TODAY-004-R2_BCVH_FILTER_AND_COMBO_TRENDLINE_RECOVERY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004-R2_BCVH_FILTER_AND_COMBO_TRENDLINE_RECOVERY.md)
- [docs/06_REVIEWS/Import/TODAY-004-R2_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004-R2_PO_ACCEPTANCE_CHECKLIST.md)

## 5. Business Context

- The Product Owner rejected the `TODAY-004-R1` recheck because filter/runtime behavior blocked review.
- The Operation Dashboard must expose exactly the six SSOT-defined BCVH units plus `Tất cả BCVH`.
- The dashboard status selector `Đạt/Không đạt` has no meaningful function on `/f13/dashboard` and must be removed there only.
- Selecting a BCVH must not make the 30-day combo chart disappear.
- `TODAY-005` must remain inactive until this recovery receives explicit PO PASS.

## 6. Technical Context

- The authoritative BCVH runtime fields are `ma_bcvh` and `ten_bcvh`.
- `/api/f13/dashboard/meta` owns the Operation Dashboard BCVH option list and returns only rows where `ten_bcvh` starts with `BCVH `.
- `GET /api/f13/dashboard/daily-trend` accepts canonical `ma_bcvh` while preserving legacy aliases.
- The combo chart must keep one `daily-trend` request and one normalized dataset.

## 7. Implementation Scope

- Replace placeholder BCVH dropdown values with metadata-provided canonical values.
- Remove the KPI/status selector from `/f13/dashboard` without deleting shared filter capability.
- Preserve `ma_bcvh` in URL context.
- Preserve the rolling 30-day `from_date` and `to_date` while changing BCVH.
- Keep chart loading, empty, and error states inside the existing combo chart card.
- Preserve missing-date gaps as `null`, not zero.
- Preserve unrelated dashboard surfaces and contracts.

## 8. Out Of Scope

- Do not activate `TODAY-005`.
- Do not change frozen SSOT or architecture.
- Do not change approved backend response contracts.
- Do not implement same-period comparison.
- Do not modify unrelated HTML files.

## 9. Validation

- Tests must prove six BCVH units plus `Tất cả BCVH`.
- Tests must prove all six canonical values generate valid `ma_bcvh` request parameters.
- Tests must prove the status selector is absent on `/f13/dashboard` and shared filter capability remains available by default.
- Tests must prove rolling 30-day window and missing-date gap behavior remain intact.
- Build and lint must pass.
- Runtime/API validation must verify all six BCVH codes return `HTTP 200`.
- Authenticated browser validation must verify filter options, removed status selector, stable combo card, and aggregate reset.

## 10. Documents To Update

- `docs/10_TICKETS/TODAY-004-R1_MANIFEST.md`
- `docs/10_TICKETS/TODAY-004-R2_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-004-R1_QUALITY_AND_VOLUME_COMBO_TRENDLINE_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-004-R1_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Import/TODAY-004-R2_BCVH_FILTER_AND_COMBO_TRENDLINE_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-004-R2_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`

## 11. Expected Output

- Technical PASS.
- Runtime PASS.
- PO UI ACCEPTANCE REQUIRED.
- `TODAY-004-R2` recorded PO FAIL and is superseded by `TODAY-004-R3`.
- `TODAY-005` remains inactive.

## 12. Next Ticket

- Next ticket ID: `TODAY-005`
- Next ticket name: `Same-Period Comparison Trendline`
- Blockers or handoff notes: do not activate until `TODAY-004-R3` receives PO PASS and closure gates pass.
