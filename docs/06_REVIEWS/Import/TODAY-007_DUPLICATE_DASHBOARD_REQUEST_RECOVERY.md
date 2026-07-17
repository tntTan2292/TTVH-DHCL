# TODAY-007 Duplicate Dashboard Request Recovery

## 1. Purpose

Record the targeted technical recovery that removed duplicate identical dashboard requests after the TODAY-007 layout implementation.

## 2. Scope

- Preserve the TODAY-007 executive layout implementation.
- Preserve KPI formulas, API contracts, database schema, BCVH mappings, Vietnamese labels, filter semantics, null semantics, accepted chart behavior, and TODAY-008 scope.
- Remove only duplicate identical dashboard requests.

## 3. Root Cause

The duplicate requests were caused by unstable adapter-created `globalFilter` object identities.

The parent dashboard re-rendered after metadata, KPI, and other surface state updates. On each parent render, the adapters recreated new object and `dateRange` array instances even when the actual date, interval, and BCVH values had not changed. Legacy child panels depend on `globalFilter` in `useEffect`, so equivalent renders triggered identical refetches.

Affected duplicate dashboard endpoints before recovery:

| Normalized request | Before count | After count |
| --- | ---: | ---: |
| `GET /api/f13/dashboard/message?toDate=2026-07-15` | 5 | 1 |
| `GET /api/f13/dashboard/quality-timeline?ma_bcvh=all&toDate=2026-07-15` | 5 | 1 |

Unaffected dashboard requests remained single-request:

| Normalized request | Before count | After count |
| --- | ---: | ---: |
| `GET /api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15` | 1 | 1 |
| `GET /api/f13/dashboard/kpi?from_date=2026-07-15&ma_bcvh=all&to_date=2026-07-15` | 1 | 1 |
| `GET /api/f13/dashboard/meta?` | 1 | 1 |
| `GET /api/f13/dashboard/top?fromDate=2026-07-15&toDate=2026-07-15` | 1 | 1 |

## 4. Fix

- Memoized legacy `globalFilter` objects in dashboard adapters.
- Preserved the existing child panel request ownership.
- Preserved endpoint paths, query parameters, response contracts, labels, chart behavior, and filter semantics.
- Did not add timing delays, browser-test suppression, global cancellation hacks, or business-rule changes.

## 5. Files Changed

- `frontend/src/features/dashboard/components/QualityTimelineAdapter.jsx`
- `frontend/src/features/dashboard/components/MessageGenerationAdapter.jsx`
- `frontend/src/features/dashboard/components/RuleRecommendationAdapter.jsx`
- `frontend/src/features/dashboard/components/BcvhOperationTableAdapter.jsx`
- `frontend/src/features/dashboard/components/dashboardStaleKpiRecovery.test.js`
- `docs/10_TICKETS/TODAY-007_MANIFEST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Import/TODAY-007_DUPLICATE_DASHBOARD_REQUEST_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-007_PO_ACCEPTANCE_CHECKLIST.md`

## 6. Validation

Automated validation:

- `node --test frontend/src/features/dashboard/components/dashboardStaleKpiRecovery.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js`: `PASS`
- `npm.cmd run lint`: `PASS` with existing warnings only
- `npm.cmd run build`: `PASS`

Runtime validation:

- Browser executable: `C:/Users/Admin/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe`
- Preview URL: `http://127.0.0.1:4174/f13/dashboard`
- Authentication: runtime session established without recording credentials, session id, or token values
- Initial dashboard load: no duplicate normalized `/api/f13/dashboard/*` requests
- Canonical BCVH change to `535790`: no duplicate normalized `/api/f13/dashboard/*` requests
- Console/runtime errors: none observed

Initial load after recovery:

| Normalized request | Count |
| --- | ---: |
| `GET /api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15` | 1 |
| `GET /api/f13/dashboard/kpi?from_date=2026-07-15&ma_bcvh=all&to_date=2026-07-15` | 1 |
| `GET /api/f13/dashboard/message?toDate=2026-07-15` | 1 |
| `GET /api/f13/dashboard/meta?` | 1 |
| `GET /api/f13/dashboard/quality-timeline?ma_bcvh=all&toDate=2026-07-15` | 1 |
| `GET /api/f13/dashboard/top?fromDate=2026-07-15&toDate=2026-07-15` | 1 |

Filter-change trace after selecting `535790`:

| Normalized request | Count |
| --- | ---: |
| `GET /api/f13/dashboard/daily-trend?from_date=2026-06-16&ma_bcvh=535790&to_date=2026-07-15` | 1 |
| `GET /api/f13/dashboard/kpi?from_date=2026-07-15&ma_bcvh=535790&to_date=2026-07-15` | 1 |
| `GET /api/f13/dashboard/quality-timeline?ma_bcvh=535790&toDate=2026-07-15` | 1 |

## 7. Preserved Surfaces

- Executive Summary renders as a four-metric 2x2 layout.
- No visible Executive Summary `Xếp hạng` card remains.
- KPI cards remain visible and runtime-backed.
- `Sản lượng và chất lượng phát - 30 ngày` remains visible.
- `So sánh cùng kỳ 7 ngày` remains visible.
- Quality Timeline, weekly pattern, monthly pattern, heatmap, ranking surfaces, message surface, and table surfaces remain mounted.
- Seven BCVH options remain available: `all`, `535790`, `536250`, `535470`, `537220`, `537015`, `533140`.
- The `Đạt / Không đạt` selector remains absent.

## 8. Result

- Technical status: `PASS`
- Runtime status: `PASS`
- PO product status: `PO PASS`
- Review status: `CLOSED`
- Closure date: `2026-07-17`
- Closure authority: explicit Product Owner `PO PASS`
- TODAY-008 status: activated through governance handoff
- PO findings register: no TODAY-007 PO defect finding was created; no findings row required closure
