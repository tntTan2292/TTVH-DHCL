# F13-ROUTE-POSTMAN-IDENTITY-01 Manifest

Status: `DISCOVERY / READ-ONLY AUDIT ACTIVE (2026-09-17)`. Product Owner authorized the next step after closing `F13-BCVH-MONTHLY-CUMULATIVE-01`. Audit only; no product-code, schema, database or KPI change is authorized.

## 1. Ticket Information

- Ticket ID: `F13-ROUTE-POSTMAN-IDENTITY-01`
- Ticket Name: `F1.3 — Bổ sung Mã bưu tá + Tên bưu tá vào Tuyến phát Ranking`
- Owner: `Antigravity (Gemini)` — discovery/read-only audit executor.
- Phase: `Discovery / Read-Only Audit`
- Governance Version: `V2 Active`
- Registration authority: Product Owner decision received in chat, 2026-09-15, as part of the same instruction that paused `F41-DASHBOARD-MINIMUM-01` and activated `F13-BCVH-MONTHLY-CUMULATIVE-01`.
- Activation authority: Product Owner decision received in chat, 2026-09-17: the predecessor is PO PASS and work proceeds to the next approved Roadmap step.
- Branch registered on: `codex/da-impl-006`
- Activation baseline commit: `03b925e8025f609c9d7fc92da4db57f81756f0a4`

## 2. Objective (for whoever activates this ticket)

Bổ sung "Mã bưu tá" (postman/carrier code) và "Tên bưu tá" (postman name) vào Tuyến phát Ranking (Route Ranking), căn cứ trên các trường có trong BatchFile nguồn. Before any implementation: **audit the BatchFile's actual mapping and historical data** to confirm the postman code/name fields exist reliably, are stable per route, and reconcile against however Tuyến phát Ranking currently identifies a route — do not implement against an assumed mapping.

## 3. Registered Scope (activation lock is in Section 5)

Named by the Product Owner, to be confirmed/refined at activation:

- Source: the BatchFile format (the same family of files already handled elsewhere in this project for delivery-route data — see `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` Section 19 for the existing 29-column BatchFile audit and its header-based parser, `backend/src/services/networkMapImport/parseDeliveryRoutesBatchFileExcel.js`, as the nearest known precedent for this file family — not assumed to be the same pipeline or the same file).
- Target: Tuyến phát Ranking (Route Ranking) in F1.3 — `frontend/src/features/ranking/RouteRankingPage.jsx`, `backend/src/services/F13DashboardService.js`'s route-ranking path, and the underlying `fact_f13` route identification (`ma_tuyen`/`ten_tuyen`).
- Required before implementation: a read-only audit of (a) whether the BatchFile's postman code/name fields exist and are populated for the routes Tuyến phát Ranking already tracks, (b) whether a route-to-postman mapping is 1:1, stable, or changes over time/period, and (c) what the historical data shows for routes already ranked — a route's postman identity must not be presented as more certain than the source data supports.

Explicitly out of scope at registration:

- Any product code, database, schema, or API change.
- Any change to the F1.3 KPI, `danh_gia_2026`, or any frozen SSOT document.
- `F13-BCVH-MONTHLY-CUMULATIVE-01` (separate, independent ticket registered by the same Product Owner decision — not merged into this ticket's scope, per explicit instruction that the two tickets are independent).
- `F41-DASHBOARD-MINIMUM-01` / F4.1 (separately `PAUSED BY PO PRIORITY`, unrelated).

## 4. Next Step

Antigravity performs the activated discovery/read-only audit and returns evidence to the Product Owner/CTO. No implementation begins from this activation.


## 5. Product Owner Activation — 2026-09-17

After granting PO UI PASS to `F13-BCVH-MONTHLY-CUMULATIVE-01`, the Product Owner directed: **“bước tiếp theo”**. The approved Roadmap order identifies this ticket as the next F1.3 upgrade. The ticket is therefore activated at `DISCOVERY / READ-ONLY AUDIT` only.

### 5.1 Audit questions

1. Identify the exact BatchFile source(s), sheet/header mapping and real fields for postman code and postman name.
2. Trace the current Route Ranking data path from source/import through persisted data and API to `RouteRankingPage.jsx`.
3. Measure real mapping coverage for ranked routes: populated, missing, duplicate and conflicting identities.
4. Determine whether route-to-postman identity is 1:1, changes by date/period, or can contain multiple postmen; preserve historical truth and do not collapse ambiguous mappings.
5. Determine the safest minimal data contract and UI placement for `Mã bưu tá` and `Tên bưu tá`, without changing F1.3 KPI calculations.
6. Report schema/import/backfill implications, risks, open Product Owner decisions and a phased recommendation. Do not implement the recommendation.

### 5.2 Scope and safety gates

- Read-only inspection of source files, code and database is authorized.
- No product code, schema, migration, import, backfill or business-data write.
- No F1.3 KPI/SSOT change.
- Do not merge with Import, RBAC, F4.1 or the closed BCVH monthly-cumulative ticket.
- Do not use Browser/Web automation. Local source inspection, read-only database queries and local tests are allowed.
- Return the audit report to PO/CTO; Design and implementation require separate authorization.

## 6. DB Bưu Tá Discovery & Cross-Reconciliation Audit (2026-09-17)

Product Owner supplied the official postman directory file: `2026.09.17 - DB Buu ta.xls` (27.5 KB, exported from system at `17/09/2026 11:01` for unit `53-BĐTP Huế`, active status).

### 6.1. Source Structure & Mapping Lock
- Header row (Row 8): `STT`, `Mã BĐT`, `Tên BĐT`, `Mã BĐH`, `Tên BĐH`, `Mã bưu cục`, `Tên bưu cục`, `Tên tài khoản`, `Họ tên người dùng`, `Chức danh`, `Loại hợp đồng`, `Số điện thoại`, `Mã HRM`, `Tình trạng hoạt động`.
- **Locked Field Mapping**:
  - `Tên tài khoản` = `Mã bưu tá` (`POSTMAN_CODE`).
  - `Họ tên người dùng` = `Tên bưu tá`.
  - `Mã bưu cục` = Mã BCVH (dùng để kiểm tra chéo / cross-check).
- **Data Minimization & Security Lock**:
  - Only necessary fields are admitted to system storage: `ma_buu_ta`, `ten_buu_ta`, `ma_bcvh`, `ten_bcvh`, `trang_thai_hoat_dong`.
  - **Do NOT store**: `Số điện thoại`, `Mã HRM`, `Loại hợp đồng`.
- Total data rows: 198 rows.
- Distinct postman codes: 198 codes.
- Duplicate postman codes in DB: **0** (all codes strictly unique).

### 6.2. Cross-Reconciliation with BatchFiles (All 4 Months: May, June, July, August 2026)
Across 678,328 delivery point records in all 4 monthly BatchFiles (`2026.06.01...`, `2026.07.01...`, `2026.08.01...`, `2026.09.01...`):
- Total distinct postman codes appearing in BatchFiles: **277 codes**.
- **1. Codes Matched (Có cả trong BatchFile và Danh bạ)**: **172 codes** (chiếm 81.93% tổng sản lượng bưu gửi phát: 555,765 / 678,328 điểm phát).
- **2. BatchFile Codes Missing in DB Bưu tá (Mã BatchFile chưa có tên)**: **105 codes** (chiếm 18.07% sản lượng: 122,563 điểm phát).
  - Phân bổ khối lượng:
    - 29 mã có sản lượng rất thấp (<= 10 bưu gửi): phát sinh ngẫu nhiên / điều động tạm thời.
    - 25 mã có sản lượng 11 - 100 bưu gửi.
    - 51 mã có sản lượng > 100 bưu gửi (ví dụ `53A152` Thuận Hóa 15,617 BG; `53B246` 7,917 BG; `53B040` 7,572 BG; `53F069` 7,133 BG). Lý do chưa có trong file 17/09: hợp đồng khác chức danh bưu tá (lái xe, thuê ngoài) hoặc đã luân chuyển/nghỉ việc trước ngày xuất file.
- **3. DB Bưu tá Codes Only in DB (Chưa phát sinh bưu gửi trong BatchFile)**: **26 codes** (nhân sự mới hoặc bưu tá chuyên trách/văn phòng).
- **4. Xung đột / Bất nhất BCVH (Conflicts)**: **0** (toàn bộ 172 mã khớp đều có mã bưu cục trong Danh bạ trùng khớp hoàn toàn với bưu cục chính trong BatchFile).

## 7. Khóa Luồng Ghép Dữ Liệu (Locked Stitching Pipeline)

```
[F1.3 theo ngày + mã tuyến]
  fact_f13 (ngay_do_kiem, ma_tuyen, ten_tuyen, danh_gia_2026)
       │
       ▼ (Join theo ngay_phat = ngay_do_kiem AND route_po_code = ma_tuyen)
[BatchFile cùng ngày + mã tuyến]
  network_delivery_point (postman_code, ma_bcvh, ...)
       │
       ▼ (Join theo ma_buu_ta = postman_code)
[Danh bạ Bưu tá]
  dm_buu_ta (ma_buu_ta, ten_buu_ta, ma_bcvh)
       │
       ▼
[Route Ranking Display — RoutePerformancePage.jsx]
  Hiển thị: Mã tuyến | Tên tuyến | Mã bưu tá | Tên bưu tá | [Kết quả ngày] | [Kết quả kỳ]
```

- **Quy tắc bảo toàn đa bưu tá (Multi-postman preservation)**:
  - Nếu trong cùng 1 ngày, tuyến có nhiều bưu tá cùng đi phát: giữ đầy đủ toàn bộ bưu tá (ví dụ: `53A819, 53A856` kèm tên tương ứng), không được gán ép hay cắt xén đại diện 1 người.
- **Quy tắc an toàn khi thiếu dữ liệu**:
  - Nếu mã bưu tá chưa có tên trong danh bạ: hiển thị `Mã bưu tá` kèm Tên bưu tá là `—` (không fabricated).
  - Nếu ngày xem chưa có dữ liệu BatchFile: hiển thị `—` cho cả Mã và Tên bưu tá.

## 8. Đề Xuất Design Cho Chức Năng “Rà Soát Danh Mục Bưu Tá”

Chức năng phục vụ Product Owner / Quản trị viên chủ động quản lý danh bạ và bổ sung tên cho 105 mã mới phát hiện từ BatchFile:

1. **Vị trí đề xuất**: Phân hệ Quản trị Mạng lưới / Cấu hình hệ thống (`/admin/postman-catalog` hoặc tab trong Network Management).
2. **Cấu trúc 2 Tab trực quan**:
   - **Tab 1: "Danh bạ bưu tá hiện hữu"**:
     - Bảng tra cứu danh bạ (198 bưu tá hiện có): `STT`, `Mã bưu tá`, `Tên bưu tá`, `Mã BCVH`, `Tên BCVH`, `Trạng thái`.
     - Cho phép tìm kiếm nhanh theo mã hoặc tên, lọc theo BCVH.
     - Cho phép sửa nhanh Tên bưu tá hoặc trạng thái.
   - **Tab 2: "Rà soát mã mới từ BatchFile (Chưa có tên)"**:
     - Tự động thống kê các `POSTMAN_CODE` xuất hiện trong BatchFile nhưng vắng mặt trong Danh bạ (105 mã).
     - Hiển thị thông tin hỗ trợ PO nhận diện: `Mã bưu tá`, `Bưu cục phát sinh`, `Số bưu gửi đã phát`, `Kỳ xuất hiện (tháng)`, `Tên tuyến thường phát`.
     - Ô nhập nhanh **`Tên bưu tá`** inline ngay trên bảng kèm nút **`Lưu vào danh mục`** để PO gán tên tức thì mà không cần nạp lại file Excel.
3. **Hiệu lực tức thời**: Ngay khi PO nhập và lưu tên bưu tá cho một mã mới, bảng Route Ranking tại `/f13/ranking/route` sẽ tự động hiển thị tên bưu tá tương ứng cho toàn bộ dữ liệu lịch sử của mã đó.


## 9. Independent Design Review 001 (2026-09-17)

Reviewer: Claude Code (Opus 5), independent of the proposal author. Full record: `docs/06_REVIEWS/Route/F13-ROUTE-POSTMAN-IDENTITY-01_DESIGN_REVIEW_001.md`.

- **Verdict: BLOCKED** — direction verified, proposal not approvable as written.
- Verified: Section 7 stitching pipeline (parcel-level cross-check 11,378/11,378 same route + BCVH); name join by postman code only; multi-postman preservation (21.3%); 198 unique directory codes; data minimization.
- Blocking: R1 `/admin/postman-catalog` → corrected to `/network-map/postman-catalog` reusing `requireRole(['admin','viewer'])` read / `['admin']` write (no new Admin/RBAC). R2 missing `(ngay_phat, route_po_code)` index (33.1 s one-month probe) → additive covering index.
- Gaps: R3 audit/rollback (`dm_buu_ta_event`; `network_import_log` CHECK prevents reuse), R4 period contract, R5 re-import semantics, R6 current-month BatchFile lag, R7 BCVH mismatch flag, R8 live DB holds May/Jun/Aug only (185 codes / 136 matched / 49 unnamed / 63 DB-only).
- This manifest's Sections 7-8 are superseded where they conflict with the review's Sections 4-7.
- Open PO decisions: D1 import vs manual precedence; D2 period view; D3 codes absent from newer file; D4 accept current-month lag.
- Next gate: PO answers D1-D4 and approves the corrected Design of Record. No implementation authorized.
