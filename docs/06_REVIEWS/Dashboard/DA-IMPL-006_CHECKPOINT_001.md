# DA-IMPL-006 Checkpoint 001 - Discovery and Unified Action Center Contract

- Ticket: `DA-IMPL-006 Unified Action Center`
- Checkpoint: `001 - Discovery and Contract Definition`
- Date: `2026-07-20`
- Branch: `codex/da-impl-006`
- Status: `COMPLETED - DISCOVERY / CONTRACT DEFINED`
- Product status: `NOT READY`

## 1. Authority and Reading

Required onboarding was followed:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/DA-IMPL-006_MANIFEST.md`
4. Manifest Required Reading:
   - `docs/04_TECHNICAL_PLANNING/Dashboard/SMART_DASHBOARD_IMPLEMENTATION_PLAN.md`
   - `docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md`
   - `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md`

Approved Dashboard Surface E requires one Action Center that merges recommendations, Daily Brief, message generation, row-level guidance, and follow-up information. Each issue must appear once. The ticket must not invent owner, cause, deadline, status, confidence, role, permission, KPI formula, threshold, business rule, SSOT, schema, AUTO-IMPORT, TCT, or Route Performance Center behavior.

## 2. Files Inspected

Frontend Dashboard path:

- `frontend/src/features/dashboard/DashboardPage.jsx`
- `frontend/src/features/dashboard/components/RuleRecommendationAdapter.jsx`
- `frontend/src/components/f13/RuleRecommendationPanel.jsx`
- `frontend/src/features/dashboard/components/ExecutiveDailyBriefAdapter.jsx`
- `frontend/src/components/f13/ExecutiveDailyBrief.jsx`
- `frontend/src/features/dashboard/components/MessageGenerationAdapter.jsx`
- `frontend/src/components/f13/MessageGenerationPanel.jsx`
- `frontend/src/features/dashboard/components/TopListAdapter.jsx`
- `frontend/src/features/dashboard/components/UnifiedBcvhAnalysisTable.jsx`
- `frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.js`
- `frontend/src/features/dashboard/components/UnifiedCommandSummary.jsx`
- `frontend/src/features/dashboard/components/IntegratedTrendRiskWorkspace.jsx`
- `frontend/src/api/F13DashboardClient.js`
- `frontend/src/api/F13RecommendationClient.js`

Backend contracts and services:

- `backend/src/routes/f13Routes.js`
- `backend/src/controllers/DashboardController.js`
- `backend/src/controllers/kpiController.js`
- `backend/src/controllers/RecommendationController.js`
- `backend/src/services/F13DashboardService.js`
- `backend/src/services/ruleEngineService.js`
- `backend/src/services/messageGenerationService.js`
- `backend/src/services/RecommendationService.js`
- `backend/src/engine/recommendations/InsightGenerator.js`
- `backend/src/engine/messages/MessageRenderer.js`

Prior review evidence:

- `docs/06_REVIEWS/Dashboard/DASHBOARD-AUDIT-001_LEADERSHIP_DASHBOARD_AUDIT.md`
- Existing DA-IMPL review files relevant to Command Summary, Trend/Risk, BCVH table, and Operating Pattern handoff.

## 3. Existing Surfaces

| Surface | Current implementation | Data contract | Current behavior |
| --- | --- | --- | --- |
| Recommendations | `RuleRecommendationAdapter` wraps legacy `RuleRecommendationPanel` | `GET /api/f13/recommendations` via `kpiController.getRecommendations` and `ruleEngineService.evaluate(fromDate, toDate)` | Displays up to 5 rule-engine recommendations with priority, level, category, BCVH name, condition, impact, action. Hidden completely when empty. Does not pass selected `ma_bcvh`. |
| Daily Brief | `ExecutiveDailyBriefAdapter` maps current KPI state to legacy `ExecutiveDailyBrief` | Existing Dashboard KPI state from `GET /api/f13/dashboard/kpi` | Frontend-derived narrative based on total, pass rate, failed rate, and hardcoded `dod: 0`, `rank: 0`. It is a summary, not a row-level action contract. |
| Message Generation | `MessageGenerationAdapter` wraps legacy `MessageGenerationPanel` | `GET /api/f13/dashboard/message?toDate=...` via `messageGenerationService.generateMessages(toDate)` | Produces two copyable message templates, `dieu_hanh` and `bao_cao`, using selected `toDate` only. It does not consume `ma_bcvh`. |
| Row-level guidance / detail | `UnifiedBcvhAnalysisTable` and `unifiedBcvhAnalysisTableData` | `GET /api/f13/ranking/bcvh` | Provides BCVH row identity, volume/pass/fail/KPI, returned quantity, optional warning only if supplied, and detail navigation to `/f13/ranking/route`. No separate owner/cause/status. |
| Follow-up entry | Current table action button `Chi tiết` | Frontend URL contract with `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name` | Navigates to the existing route-ranking/detail path. Destination runtime completeness is outside DA-IMPL-006. |
| Top/bottom BCVH | `TopListAdapter` | `GET /api/f13/dashboard/top` | Shows best and lowest BCVH lists. This overlaps with recommendations and BCVH analysis because it identifies units needing improvement without follow-up state. |

## 4. Backend/API Mapping

| Endpoint | Owner | Parameters observed | Authoritative fields for DA-IMPL-006 |
| --- | --- | --- | --- |
| `GET /api/f13/recommendations` | `backend/src/controllers/kpiController.js`, `backend/src/services/ruleEngineService.js` | `fromDate`, `toDate` | `id`, `priority`, `level`, `color`, `icon`, `category`, `ten_bcvh`, `condition`, `impact`, `action`, `failed_bg`. |
| `GET /api/f13/dashboard/kpi` | `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js` | `from_date`, `to_date`, `ma_bcvh` | Current scope KPI context, total volume, pass/fail/returned composition, national-rank metadata. Use for action-center context and grounded summary only. |
| `GET /api/f13/dashboard/message` | `backend/src/controllers/kpiController.js`, `backend/src/services/messageGenerationService.js` | `toDate` | `dieu_hanh`, `bao_cao`. Use as message/follow-up draft, not as a new evidence source. |
| `GET /api/f13/ranking/bcvh` | `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js` | `from_date`, `to_date`, pagination/sort; current controller ranks by `to_date` service path | BCVH identity, rank, volume, pass, fail, KPI, D-1/D-7 deltas, total row, detail-action context. |
| `GET /api/f13/dashboard/top` | `backend/src/controllers/kpiController.js` | `fromDate`, `toDate` | Best/lowest BCVH quick lists. Optional source for surfacing units, but must not create duplicate issue rows if same BCVH appears in recommendations/table. |
| `GET /api/f13/evidence-list` | `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js` | `date`, `bcvh`, `route`, pagination | Shipment-level evidence after drill-down only. Not suitable as the first vertical-slice source unless a selected row/detail context exists. |

No Checkpoint 001 evidence requires a backend or schema change for Checkpoint 002.

## 5. Duplicate, Conflicting, Disconnected, or Mock-backed Implementations

- Duplicate issue presentation: recommendations, Top 2 cần cải thiện, BCVH table warning/detail, and message templates can all point to the same low-performing BCVH separately.
- Disconnected BCVH filter: current recommendation endpoint and panel use `fromDate/toDate` but do not pass or apply `ma_bcvh`.
- Disconnected message scope: message generation uses `toDate` only and does not apply `fromDate` or `ma_bcvh`.
- Frontend-derived Daily Brief: uses current KPI state but still maps `dod: 0` and `rank: 0`; it must be treated as summary text, not authoritative action evidence.
- Parallel message engines exist: `messageGenerationService.generateMessages(toDate)` is used by the Dashboard; `RecommendationService` plus `InsightGenerator` and `MessageRenderer` back `GET /api/f13/messages`, but the active Dashboard path does not use that legacy client.
- Empty/error gaps: recommendation and message legacy panels log failures and return `null` or hidden content instead of explicit operator-facing empty/error states.
- Row guidance is not a recommendation source: BCVH table provides detail navigation and optional warning only; it does not provide confirmed cause, owner, deadline, or follow-up status.
- Mock-backed Action Center was not found as a concrete active Dashboard component; the risk is disconnected legacy panels rather than a single mock Action Center.

## 6. Unified Action Center Contract

The Checkpoint 002 frontend mapper should produce a normalized Action Center model:

```js
{
  meta: {
    from_date,
    to_date,
    ma_bcvh,
    bcvh_label,
    source_period_label,
    generated_at: null
  },
  items: [
    {
      id,
      priority,
      issue,
      unit: {
        ma_bcvh,
        ten_bcvh
      },
      evidence,
      confirmed_cause,
      recommended_action,
      source,
      confidence,
      owner,
      status,
      follow_up,
      message_draft
    }
  ],
  message_templates: {
    dieu_hanh,
    bao_cao
  },
  states: {
    recommendations,
    message,
    kpi_context
  }
}
```

Required field rules:

| Field | Required? | Authoritative source | Rule |
| --- | --- | --- | --- |
| `id` | Required | Recommendation `id`; otherwise derived stable UI id from source + BCVH/date | May be UI-normalized for React identity only. |
| `priority` | Required when recommendation exists | `GET /api/f13/recommendations.priority` | If absent, display `Chưa có dữ liệu`; do not derive from local thresholds. |
| `issue` | Required | `category` + `condition` from recommendation; or BCVH table low-performance context only when no recommendation row exists | Do not invent causal text. |
| `unit.ma_bcvh` | Optional | BCVH row/action params when available | Preserve unknown when recommendation lacks code. |
| `unit.ten_bcvh` | Required when available | `ten_bcvh` from recommendation or BCVH table | Use `Chưa có dữ liệu` when absent. |
| `evidence` | Required | Recommendation `condition`/`impact`, KPI context, or table row metrics | Must cite source type. |
| `confirmed_cause` | Optional/unavailable | No current authoritative source found | Must display `Chưa có dữ liệu`, not infer. |
| `recommended_action` | Required when recommendation exists | `ruleEngineService.action` | If no recommendation, use unavailable state; do not create new action text. |
| `source` | Required | `RULE_RECOMMENDATION`, `DASHBOARD_MESSAGE`, `BCVH_TABLE`, `KPI_CONTEXT` | Enables operator to distinguish system recommendation, message draft, and table evidence. |
| `confidence` | Optional/unavailable | No approved confidence contract found | Display `Chưa có dữ liệu`; do not calculate. |
| `owner` | Optional/unavailable | No approved owner contract found | Display `Chưa có dữ liệu`; do not infer from BCVH/director wording. |
| `status` | Optional/unavailable | No follow-up status contract found | Display `Chưa có dữ liệu`; do not invent workflow state. |
| `follow_up` | Required when row context exists | Existing detail URL contract | Link to current detail/ranking path only; do not repair destination. |
| `message_draft` | Optional | `GET /api/f13/dashboard/message` | Attach or display separately as message draft; do not treat template as confirmed cause/evidence. |

Default ordering:

1. Rule-engine recommendations first, sorted by backend order.
2. Within equal priority, preserve backend ordering because `ruleEngineService` already sorts by priority and failed volume.
3. Non-recommendation context rows, if used, appear after recommendation rows and must be visually marked as `Theo dõi`, not as a generated recommendation.

Duplicate handling:

- Primary dedupe key: recommendation `id`.
- Secondary dedupe key: `ma_bcvh + category` when `ma_bcvh` is available.
- If a BCVH appears in both recommendation and top/bottom/table context, merge table metrics into the recommendation evidence rather than rendering a second issue row.
- Do not merge unrelated categories for the same BCVH unless a direct source says they are the same issue.

Filter propagation:

- `fromDate` and `toDate` propagate to recommendations, KPI context, BCVH table context, and visible labels.
- `toDate` propagates to message generation under the existing backend contract.
- `maBcvh` propagates to the Action Center mapper and UI filter labels. Because the current recommendation/message endpoints do not support `ma_bcvh`, Checkpoint 002 must either label those sources as aggregate or locally filter only display rows when a trustworthy BCVH code is present. It must not change API semantics without explicit authority.

## 7. State Contract

Loading:

- Show one Action Center loading state while recommendations/message context are being fetched.
- If KPI context is still loading, show `Đang tải bối cảnh điều hành...` within the summary strip.

Empty:

- If recommendations return an empty array and no eligible table/context issue is available, show a visible empty state: `Chưa có khuyến nghị điều hành trong phạm vi đang chọn.`
- Do not hide the entire section silently.

Partial data:

- If recommendations load but messages fail, still show action items and mark message draft unavailable.
- If messages load but recommendations fail, show a recommendation error and keep message drafts in a separate partial-data area.
- If KPI context is unavailable, keep items but show context as unavailable.

Error:

- API failures must be operator-visible with concise source label: `Không thể tải khuyến nghị`, `Không thể tải mẫu thông báo`, or `Không thể tải bối cảnh KPI`.
- Include retry action in Checkpoint 002 only if it reuses existing fetch behavior.

Unavailable:

- Owner, status, confidence, confirmed cause, and deadline are unavailable in current authoritative contracts.
- Use `Chưa có dữ liệu`; never fill these from wording or assumptions.

## 8. Narrowest Compatible Checkpoint 002 Vertical Slice

Implement a pure frontend Action Center card in the existing Dashboard path:

- Replace simultaneous rendering of `RuleRecommendationAdapter`, `ExecutiveDailyBriefAdapter`, and `MessageGenerationAdapter` with one `UnifiedActionCenter` component.
- Reuse existing endpoints:
  - `GET /api/f13/recommendations?fromDate=&toDate=`
  - `GET /api/f13/dashboard/message?toDate=`
  - existing KPI state already loaded by `DashboardPage`
- Keep `TopListAdapter` and `UnifiedBcvhAnalysisTable` behavior unchanged outside the targeted replacement unless a duplicate issue is rendered inside the new Action Center.
- Add a pure mapper module, for example `unifiedActionCenterData.js`, and component tests for field mapping, duplicate handling, aggregate/BCVH scope labeling, unavailable owner/status/confidence/cause, loading/empty/partial/error states, and message draft separation.
- Do not add backend APIs, database schema, KPI formulas, thresholds, business rules, AUTO-IMPORT, TCT, Route Performance Center changes, or PO acceptance work.

## 9. Discovery Validation

- Branch state repaired: `codex/da-impl-006` tracks `origin/codex/da-impl-006` and contains handoff commit `9bff48d26647346e9bf104999cc667763e04019c`.
- Onboarding chain matched `DA-IMPL-006` as the active ticket and manifest.
- Required Reading completed.
- Root cause and affected boundary confirmed without repository-wide audit.
- No product implementation was performed in Checkpoint 001.

## 10. Open Risks and PO/Authority Blockers

No blocker prevents Checkpoint 002 frontend vertical slice.

Risks to preserve:

- Recommendation and message endpoints do not currently support `ma_bcvh`; the first implementation must label aggregate scope clearly or only filter rows when an authoritative BCVH code exists.
- Owner, confirmed cause, deadline, confidence, and follow-up status are unavailable and must remain explicitly unavailable.
- The existing message template is long and date-only. Treat it as an optional draft, not as the main issue/evidence source.
- The Route Performance Center/detail destination remains out of scope; Action Center may link to existing routes but must not expand or repair them.
