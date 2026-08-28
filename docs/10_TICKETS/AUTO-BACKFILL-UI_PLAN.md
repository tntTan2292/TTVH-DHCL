# Revised UI/UX Architecture, Baseline Reconciliation & Exception Governance Plan (`AUTO-BACKFILL-UI`)

Status: `READY FOR PO ARCHITECTURE APPROVAL` (2026-08-19).
Repository Plan Path: `docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md` ([AUTO-BACKFILL-UI_PLAN.md](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md)).
Document Index: [DOCUMENT_INDEX.md](file:///d:/Antigravity%20-%20Project/TTVH%20-%20He%20thong%20dieu%20hanh%20chat%20luong/docs/01_GOVERNANCE/DOCUMENT_INDEX.md).

> [!IMPORTANT]
> This document is a **Remediated Architecture, Baseline Reconciliation & Exception Governance Plan ONLY**.
> Documentation-only update per Product Owner directive. Product source code modifications and runtime execution are strictly frozen until explicit PO review and architecture approval.

---

## 1. Executive Summary & Remediation Ledger

Following Product Owner feedback, Antigravity incorporated 5 mandatory architectural remediation points into this revised plan:

1. **Inverted Implementation Order**:
   - **Phase A (`AUTO-BACKFILL-COVERAGE-EXCEPTION`)**: Technical backend executor implements backend schema, registry policies, `VERIFIED_NO_DATA`, `PO_EXEMPTED`, `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` logic, DB persistence, and exception APIs FIRST.
   - **Phase B (`AUTO-BACKFILL-UI-REMEDIATION`)**: Antigravity implements frontend components and PO confirmation UI AFTER real backend APIs are verified and ready. (No Modal or `PO_EXEMPTED` button will be built before real backend APIs exist).
2. **Strict Adapter-Proven Criteria for `VERIFIED_NO_DATA`**:
   - "Portal returned 0 rows" does NOT automatically equal `NO_DATA`.
   - `VERIFIED_NO_DATA` is valid ONLY when portal adapter explicitly proves 5 criteria: (1) exact report identity, (2) exact indicator/lane/date tuple, (3) successful filter application, (4) valid response readiness, and (5) valid export/table structure confirming exactly 0 rows.
   - If any criterion is missing ➔ `MANUAL_REVIEW_REQUIRED`. Never auto-exempt.
3. **Legacy Baseline Reconciliation (6 Coverage States)**:
   - Solves the 920 "fake missing" items problem by introducing `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` ("Dữ liệu cũ đã có"), preventing unwanted re-imports through a controlled baseline seed.
   - Registry-driven completion policy per `indicator × lane` (never hardcoded F1.3/F4.1).
4. **Technical Failure & Exception Isolation**:
   - Single-date error retries per registry policy (up to 3 times), records result, and continues queue.
   - Circuit breaker opens ONLY on 5 consecutive system failures (`PORTAL_SYSTEMIC`, `EAI_AGAIN`) with matching error signature.
   - `VERIFIED_NO_DATA` and `PO_EXEMPTED` MUST NEVER be counted as retries or circuit breaker errors.
5. **No-Code Vietnamese Status Display**:
   - Technical codes mapped to user-friendly Vietnamese labels without exposing internal technical terms on the main UI.

---

## 2. Inverted Implementation Sequence (Phase A -> Phase B)

```
+---------------------------------------------------------------------------------------------------+
| PHASE A: BACKFILL COVERAGE EXCEPTION & BASELINE BACKEND (Ticket: AUTO-BACKFILL-COVERAGE-EXCEPTION) |
| Executed FIRST by Technical Backend Executor                                                      |
| Status: BACKEND FIRST DEPENDENCY                                                                  |
| Deliverables:                                                                                     |
|  - Implement DB schema & persistence for `PO_EXEMPTED` and `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` |
|  - Implement 5-point adapter verification for `VERIFIED_NO_DATA`                                  |
|  - Implement registry-driven completion policies per indicator × lane                             |
|  - Expose verified REST APIs for coverage scan & PO exception confirmation                         |
+---------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼ Backend API Verified & PASS
+---------------------------------------------------------------------------------------------------+
| PHASE B: AUTO-BACKFILL UI REMEDIATION (Ticket: AUTO-BACKFILL-UI-REMEDIATION)                      |
| Executed SECOND by Antigravity                                                                    |
| Status: FRONTEND DEPENDENT ON PHASE A                                                            |
| Deliverables:                                                                                     |
|  - Integrate real Phase A backend APIs into Data Import Center                                    |
|  - Render 6 No-code Vietnamese status badges                                                      |
|  - Render Smart Monthly Grouping Accordions                                                       |
|  - Render PO Exception Confirmation Modal & Audit History Drawer                                  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Strict 5-Point Adapter Proof Criteria for `VERIFIED_NO_DATA`

To prevent false exemptions when a portal fails or returns empty pages due to network/filter errors, `VERIFIED_NO_DATA` requires explicit proof from the portal adapter:

```
[ Portal Query Response Received ]
               │
               ▼
   Check 5-Point Adapter Criteria:
   1. Exact Report Identity Verified? ---------------------> NO --+
   2. Tuple Match (Indicator × Lane × Date)? ---------------> NO --|
   3. Filter Parameters Applied Successfully? -------------> NO --+--> [ MARK: MANUAL_REVIEW_REQUIRED ]
   4. Portal Readiness Status Valid? ------------------------> NO --|    (Never auto-exempt!)
   5. Export/Table Structure Valid & Confirms 0 Rows? ------> NO --+
               │
              YES (All 5 Criteria Proven)
               │
               ▼
[ MARK: VERIFIED_NO_DATA ] -> ("Không phát sinh dữ liệu")
 (Valid Business Outcome: Skip, move to next date, 0 retries, 0 circuit error count)
```

---

## 4. PO-Facing Coverage Model — 4 Statuses

> [!NOTE]
> **Amended 2026-08-27 (AB-CALENDAR-01, approved frozen-document delta D3).** The original
> 6 granular coverage states were technical classifications shown directly to the Product
> Owner. They are replaced by exactly **4 PO-facing statuses**. The 6 technical states still
> exist internally as `completion_status`, the exception type, and the holiday overlay — they
> are simply no longer surfaced as separate PO badges. The original table is preserved
> verbatim in Section 4.2 for audit.

To resolve the 920 "fake missing" items issue, coverage evaluation classifies every
`indicator × lane × business_date` into exactly one of 4 PO-facing statuses, using
registry-driven completion policies:

| PO Status | No-Code Vietnamese Display | Technical Definition | Action & Routing Rule |
| --- | --- | --- | --- |
| `COMPLETED` | **Đã hoàn tất** | Import succeeded — valid data is present | Complete. No action required. Never auto-queued. |
| `INCOMPLETE` | **Chưa hoàn tất** | Not imported yet: no data, no import log, no artifact | Queue eligible for auto-backfill when the indicator is `ACTIVE` and the lane is `AUTOMATED`. |
| `EXCLUDED` | **Được loại trừ** | LỊCH NGHỈ / holiday, or a confirmed exception meaning no data is expected | Operationally finished. Never auto-queued, never selectable, never re-confirmed. |
| `DATA_ERROR` | **Lỗi dữ liệu** | An import ran but the data is wrong or did not land | Requires PO inspection. Selectable: may be reimported or converted to `EXCLUDED`. |

### 4.1 Processed vs unprocessed

| Group | Statuses | Meaning |
| --- | --- | --- |
| **Đã xử lý** | `COMPLETED` + `EXCLUDED` | Nothing more to do |
| **Chưa xử lý xong** | `INCOMPLETE` + `DATA_ERROR` | Still needs action |

"Chọn tất cả chưa hoàn tất" and every "chưa hoàn tất" total cover **only** `INCOMPLETE` +
`DATA_ERROR`. `COMPLETED` and `EXCLUDED` can never be selected by any UI path. `EXCLUDED`
still shows its own count so the Product Owner can see which days were excluded.

Real data always wins: a day with valid committed data is `COMPLETED` regardless of any
holiday or exception recorded on it.

### 4.2 SUPERSEDED (2026-08-27) — the original 6 granular coverage states

Preserved verbatim for audit. These remain valid as **internal technical** classifications;
they are no longer PO-facing badges. The final column records where each one now maps.

| Coverage State Code | Technical Definition | No-Code Vietnamese Display | Action & Routing Rule |
| --- | --- | --- | --- |
| `DATA_COMPLETE_WITH_EVIDENCE` | Fact rows exist & Processed artifact present | **Đã hoàn tất** | Complete. No action required. |
| `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` | Legacy fact data exists in DB without new artifact | **Dữ liệu cũ đã có** | Resolved baseline. Do NOT auto-reimport. Controlled seed. |
| `TRUE_MISSING` | No DB data & no artifact; runnable adapter available | **Thật sự còn thiếu** | Queue eligible for auto-backfill. |
| `VERIFIED_NO_DATA` | Adapter proved 5-point criteria for 0 rows | **Không phát sinh dữ liệu** | Skip. Valid business state. 0 retries. |
| `PO_EXEMPTED` | PO manually confirmed exception with reason | **PO đã xác nhận** | Exempted by PO. Excluded from coverage gaps. |
| `MANUAL_REVIEW_REQUIRED` | Missing evidence, integrity error, or unproven 0 rows | **Cần PO kiểm tra** | Requires PO inspection or manual upload. |

| Superseded state | Now maps to |
| --- | --- |
| `DATA_COMPLETE_WITH_EVIDENCE` | `COMPLETED` |
| `LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE` | `COMPLETED` — valid data is present (PO rule: valid data present = Đã hoàn tất) |
| `TRUE_MISSING` | `INCOMPLETE` |
| `VERIFIED_NO_DATA` | `EXCLUDED` |
| `PO_EXEMPTED` | `EXCLUDED` |
| `MANUAL_REVIEW_REQUIRED` | `DATA_ERROR` |

LỊCH NGHỈ (the shared holiday calendar, added by AB-CALENDAR-01) also maps to `EXCLUDED`.

Full design of record: `docs/04_TECHNICAL_PLANNING/Feature/AB-CALENDAR-01_4_STATUS_MODEL_DESIGN.md`.

> [!IMPORTANT]
> **Registry-Driven Completion Policy Rule**: Completion policies must be evaluated dynamically per `indicator × lane` from `importIndicatorRegistry.js`. Scanner logic must NEVER check only `rows > 0` and must NEVER hardcode indicator strings (e.g. `F1.3`/`F4.1`).

---

## 5. Technical Error Handling & Exception Isolation Rules

1. **Single-Date Error Handling**:
   - When a job encounters a transient error (e.g., connection reset), retry according to registry retry policy (bounded exponential backoff up to 3 attempts).
   - If attempts exhaust or error is non-retryable, record the error status for that specific date and **continue processing remaining dates in queue**.
2. **Circuit Breaker Rule**:
   - Triggered ONLY when 5 consecutive system failures (`PORTAL_SYSTEMIC`, `EAI_AGAIN`) share the exact same error signature on the same adapter scope.
3. **Exception Isolation Rule**:
   - `VERIFIED_NO_DATA` and `PO_EXEMPTED` items are valid business outcomes and **MUST NEVER** be counted as retries or circuit breaker errors.

---

## 6. Smart Monthly Grouping & No-Code UI Design

Missing dates are grouped hierarchically by **Indicator × Year-Month** with expandable accordions:

```
+---------------------------------------------------------------------------------------------------+
|  DANH SÁCH NGÀY CẦN XỬ LÝ (BÙ DỮ LIỆU TỰ ĐỘNG)                                                   |
|  Bộ lọc: [ Tất cả chỉ tiêu v ]  [ Tất cả nguồn v ]  [ Tháng 7/2026 v ]  [ Thật sự còn thiếu v ]   |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [>] F1.3 - Chất lượng phát bưu gửi liên tỉnh                                                   |
|      Tháng 8/2026: Đã hoàn tất (0 ngày thiếu)                                                     |
|                                                                                                   |
|  [v] F1.3 - Chất lượng phát bưu gửi liên tỉnh                                                   |
|      Tháng 7/2026 — Còn 4 ngày cần xử lý (Nguồn: HUE 2, TCT 2)                                   |
|      +-----------------------------------------------------------------------------------------+  |
|      | 21/07/2026 | Nguồn HUE | Thật sự còn thiếu | [ Chi tiết ]  [ Xác nhận Không phát sinh ]  |  |
|      | 20/07/2026 | Nguồn HUE | Dữ liệu cũ đã có  | [ Chi tiết ]  [ Xem Baseline ]              |  |
|      | 19/07/2026 | Nguồn TCT | Không phát sinh   | [ Chi tiết ]  [ Adapter Proof ]             |  |
|      | 18/07/2026 | Nguồn TCT | PO đã xác nhận    | [ Chi tiết ]  [ Hoàn tác ]                  |  |
|      +-----------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  [v] F4.1 - Chất lượng phát thành công của bưu cục                                              |
|      Tháng 7/2026 — Còn 2 ngày cần xử lý (Nguồn: TCT 2)                                          |
|      +-----------------------------------------------------------------------------------------+  |
|      | 15/07/2026 | Nguồn TCT | Cần PO kiểm tra   | [ Chi tiết ]  [ Tải Excel thủ công ]        |  |
|      | 14/07/2026 | Nguồn TCT | Thật sự còn thiếu | [ Chi tiết ]  [ Xác nhận Không phát sinh ]  |  |
|      +-----------------------------------------------------------------------------------------+  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 7. Verification Plan & Deliverables Checklist

### 7.1 Verification Plan
- **Phase A (Backend Executor)**: Unit & integration tests for 5-point adapter proof, 6 coverage states, registry-driven completion policies, and exception confirmation APIs (`test_autoBackfillCoverageService.js`).
- **Phase B (Antigravity)**: Frontend contract tests in `AutoBackfillOperatorPanel.test.js` verifying 6 No-code status translations, monthly grouping accordions, and PO exception modal integration.
- **Linter & Build**: `npm run lint` (0 errors) and `vite build` (PASS).

### 7.2 Deliverables Checklist
- [x] Inverted 2-phase sequence defined (Phase A Backend First -> Phase B Frontend Second).
- [x] 5-point adapter proof criteria for `VERIFIED_NO_DATA` defined.
- [x] Legacy Baseline Reconciliation (6 coverage states) specified to eliminate 920 fake missing items.
- [x] Registry-driven completion policy rule (no hardcoding, dynamic indicator × lane evaluation) specified.
- [x] Technical error handling & exception isolation rules defined (`VERIFIED_NO_DATA` & `PO_EXEMPTED` excluded from retries/circuit).
- [x] No-code Vietnamese status display mappings specified.
- [x] Plan saved to `docs/10_TICKETS/AUTO-BACKFILL-UI_PLAN.md`.
