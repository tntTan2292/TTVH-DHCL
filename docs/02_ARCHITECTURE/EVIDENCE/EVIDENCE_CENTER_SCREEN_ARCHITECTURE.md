# Evidence Center Screen Architecture

## 0. GOVERNANCE AMENDMENT NOTICE (2026-08-13)

**Status: AMENDED — controlled amendment, not a rewrite.** Authority: same as `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`'s Section 0 — Product Owner instruction (2026-08-13) executing the frozen-document amendment approved in principle on `2026-08-11`. Documentation-only.

**What changed:** Sections 1-9 below prescribe eight widgets across five zones (Header, Executive, Evidence Validation, Decision Support, Action Trigger) — Coverage, Scan History, Rule Validation, Supporting Evidence, and RCA Evidence have no data source in `fact_f13` and were never implementable against the real schema. Retained below as the historical record of the original design intent.

**The amended, current screen architecture — three real regions, replacing the eight-widget zone list:**

1. **Context / filter bar** (was part of Header Zone) — ngày, BCVH, Tuyến selector (including "Tất cả tuyến"), search box. Always visible, not collapsible.
2. **Violation list** (replaces Executive Zone + most of Evidence Validation Zone) — server-sourced violation group tabs (`Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` / `Tất cả không đạt`, counts from `meta.violation_summary`, never counted client-side) plus the violation table itself (`Mã BG`, `Tuyến`, `Lý do`, `PTC`, `Nộp tiền`, `Độ trễ`). While a search keyword is active, the table groups by real route (`[mã] - [tên tuyến]` + count, expandable) instead of a flat list — see the locked Phase 2 search-result-presentation contract (`F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 14) for the full behavior, not yet implemented.
3. **Evidence-detail panel** (replaces Decision Support Zone + Action Trigger Zone) — populated only on explicit row selection (never auto-selected by a keyword search); shows shipment identity, BCVH/Tuyến/Ngày, kết quả (`danh_gia_2026`), nhóm vi phạm badge, PTC→Nộp tiền timeline, the `>3.0h` rule statement when applicable, and an honest "chưa khả dụng" hand-off state (Action Center does not exist yet).

Reading flow (replaces Section 5): filter bar → violation group tabs → violation table → (on selection) evidence-detail panel. Interaction flow (replaces Section 6): selecting a violation group tab filters the table; selecting a table row populates the detail panel; the detail panel never triggers navigation on its own (no Action Center hand-off exists to trigger yet).

Full detail: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 4 (wireframe, desktop/mobile/loading/empty/error) and Section 5 (widget disposition table).

---

## 1. Vai trò của Screen Architecture (historical — original design, see amendment above)

Screen Architecture xác định cách các widget của Evidence Center được tổ chức thành các vùng màn hình để phục vụ xác minh bằng chứng.

Vai trò:

- Là lớp trung gian giữa Widget Specification và UX.
- Quy định thứ tự đọc, vùng thông tin và mức ưu tiên hiển thị.
- Giữ cho lãnh đạo đi từ shipment sang evidence validation rồi sang action trigger khi đủ điều kiện.
- Không thay thế UX design và không đi vào wireframe chi tiết.

## 2. Thứ tự ưu tiên hiển thị Widget

Ưu tiên hiển thị:

1. Evidence Executive Summary Widget
2. Evidence Coverage Widget
3. Evidence Timeline Widget
4. Scan History Widget
5. Rule Validation Widget
6. Supporting Evidence Widget
7. RCA Evidence Widget
8. Decision Support Widget

Nguyên tắc:

- Executive Summary luôn xuất hiện đầu tiên.
- Coverage và Timeline là lớp xác minh nền.
- Validation là trung tâm của màn hình.
- Decision Support là lớp chốt trước Action Center.

## 3. Screen Zones

### Header Zone

- Chứa title, context, filter, và action entry.

### Executive Zone

- Chứa Evidence Executive Summary và Evidence Coverage.
- Dành cho nhận thức nhanh về độ đủ của evidence.

### Evidence Validation Zone

- Chứa Evidence Timeline, Scan History, Rule Validation, Supporting Evidence, RCA Evidence.
- Dành cho xác minh và tổ chức bằng chứng.

### Decision Support Zone

- Chứa Decision Support Widget.
- Dành cho kết luận evidence đã đủ hay chưa.

### Action Trigger Zone

- Chứa ngữ cảnh chuyển sang Action Center khi evidence đã đủ.

## 4. Widget Placement

### Evidence Executive Summary Widget

- Vị trí: Executive Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị

### Evidence Coverage Widget

- Vị trí: Executive Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Evidence Timeline Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Scan History Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Rule Validation Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình đến lớn
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Supporting Evidence Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: half width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có evidence hỗ trợ

### RCA Evidence Widget

- Vị trí: Evidence Validation Zone
- Kích thước tương đối: trung bình
- Full Width / Half Width: full width
- Sticky: không
- Collapse: có thể collapse
- Điều kiện hiển thị: khi có root cause context

### Decision Support Widget

- Vị trí: Decision Support Zone
- Kích thước tương đối: lớn
- Full Width / Half Width: full width
- Sticky: không
- Collapse: không
- Điều kiện hiển thị: luôn hiển thị hoặc khi đủ evidence

## 5. Reading Flow

Hành trình mắt của lãnh đạo:

1. Xem Header Zone để xác định context.
2. Đọc Evidence Executive Summary trước.
3. Xem Evidence Coverage để biết evidence đã đủ chưa.
4. Chuyển sang Evidence Timeline và Scan History để hiểu quá trình ghi nhận.
5. Đọc Rule Validation để biết evidence có hợp lệ không.
6. Xem Supporting Evidence và RCA Evidence để củng cố kết luận.
7. Đọc Decision Support để quyết định có sang Action Center hay chưa.

## 6. Interaction Flow

- Evidence Coverage Widget kích hoạt Evidence Timeline Widget theo coverage gap.
- Evidence Timeline Widget kích hoạt Scan History Widget.
- Scan History Widget kích hoạt Rule Validation Widget.
- Rule Validation Widget kích hoạt Supporting Evidence Widget và RCA Evidence Widget khi cần.
- Decision Support Widget kích hoạt Action Trigger Zone nếu evidence đã đủ.

## 7. Progressive Disclosure

### Mặc định hiển thị

- Evidence Executive Summary Widget
- Evidence Coverage Widget
- Evidence Timeline Widget
- Scan History Widget

### Chỉ hiện khi cần

- Rule Validation Widget
- Supporting Evidence Widget
- RCA Evidence Widget
- Decision Support Widget chi tiết

Nguyên tắc:

- Tổng quan luôn hiện trước.
- Chi tiết chỉ hiện khi có nhu cầu xác minh hoặc khi evidence chưa đủ.
- Không nhồi toàn bộ validation detail vào màn hình mặc định.

## 8. Mapping giữa Screen Zone và EIDAF

### Header Zone

- Evidence: Có
- Insight: Một phần
- Decision: Không trực tiếp
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Executive Zone

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Evidence Validation Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Decision Support Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Action Trigger Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 9. Kiểm tra tính nhất quán

### Với BCVH Screen Architecture

- Cùng nguyên tắc progressive disclosure và context preservation.
- Khác ở cấp thông tin: Evidence tập trung xác minh bằng chứng.

### Với Route Screen Architecture

- Cùng luồng executive -> analysis -> decision support -> drill/action trigger.
- Khác ở mục tiêu: Evidence không đi sang shipment nữa.

### Với Shipment Screen Architecture

- Evidence Center nhận shipment context và chốt xác minh.
- Không lặp lại shipment analysis.

### Với QIS Design System

- Card, table, badge, timeline và status phải tuân thủ component standard.
- Layout phải dùng cùng nhịp grid và hierarchy.

### Với QIS UX Design Principles

- Executive First.
- Decision First.
- Evidence First.
- Progressive Drill-down.
- One Question Per Screen.
- No Information Duplication.
- Context Preservation.

