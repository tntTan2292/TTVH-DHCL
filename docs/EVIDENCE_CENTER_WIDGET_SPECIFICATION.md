# Evidence Center Widget Specification

## 0. GOVERNANCE AMENDMENT NOTICE (2026-08-13)

**Status: AMENDED — controlled amendment, not a rewrite.** Authority: same as `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`'s Section 0. Documentation-only.

**What changed:** Sections 1-7 below specify eight "Must-have" widgets (Executive Summary, Coverage, Timeline, Scan History, Rule Validation, Supporting Evidence, RCA Evidence, Decision Support). None of Coverage, Scan History, Rule Validation-as-a-standalone-widget, Supporting Evidence, or RCA Evidence-as-a-standalone-widget have ever had a data source in `fact_f13` — retained below as the historical record, **explicitly re-classified as "no data source available," not as outstanding implementation debt.**

**The amended, current widget set** (implemented, `/f13/evidence`):

| Widget | Disposition | Data source |
| --- | --- | --- |
| Context / filter bar | Real, implemented | `fact_f13` via `/f13/evidence-list` query params (date/bcvh/route/reason) |
| Violation group tabs | Real, implemented | `meta.violation_summary` (server-computed, mutually exclusive + exhaustive over `ma_bg`) |
| Violation table (`ShipmentEvidenceSummary`) | Real, implemented | `fact_f13` rows, paginated (`meta.pagination`) |
| Evidence-detail panel — identity/kết quả/nhóm vi phạm | Real, implemented | Selected row's `ma_bg`, `danh_gia_2026`, `violation_reason` |
| Evidence-detail panel — timeline (PTC → Nộp tiền) | Real, implemented | `thoi_gian_ptc`, `thoi_gian_nop_tien` |
| Evidence-detail panel — `>3.0h` rule statement | Real, implemented | `RULE_F13_302` (existing SSOT delayed-cash rule), stated only when it caused the classification |
| **Evidence Executive Summary Widget** | Retired — no separate widget; its four values are absorbed into the merged context header | superseded, no independent data source needed |
| **Evidence Coverage Widget** | Retired — no data source available | `fact_f13` has no coverage/gap dimension |
| **Evidence Timeline Widget** (as a standalone card) | Retired — merged into the evidence-detail panel's timeline block | absorbed, not deleted |
| **Scan History Widget** | Retired — no data source available | `fact_f13` has no scan/trace log |
| **Rule Validation Widget** (as a standalone card) | Retired — absorbed into the `>3.0h` rule statement in the evidence-detail panel | absorbed, not deleted |
| **Supporting Evidence Widget** | Retired — no data source available | `fact_f13` has no secondary/supporting-trace field |
| **RCA Evidence Widget** | Retired — no data source available; RCA is out of Evidence's scope per the merged design | not a data gap to close, a scope boundary |
| **Decision Support Widget** | Retired — replaced by an honest "chưa khả dụng" Action Center hand-off state, since Action Center does not exist yet | no Action Center to hand off to |

Full detail: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 5 (widget disposition table, KEEP/REMOVE/MERGE/REDESIGN per widget).

---

## 1. Mục tiêu (historical — original design, see amendment above)

Widget Specification xác định các thành phần cần có cho Evidence Center.

Mục tiêu:

- Chuyển IA đã freeze thành các widget phục vụ xác minh bằng chứng.
- Đánh giá độ đủ, độ đúng và độ tin cậy của evidence trước khi sang Action Center.
- Giữ đúng ranh giới với Shipment và Action.
- Không biến widget thành khuyến nghị điều hành mới.

## 2. Danh sách Widget

### 2.1 Evidence Executive Summary Widget

- Mục đích: Tóm tắt trạng thái evidence hiện có.
- Câu hỏi quản trị: Evidence đã đủ để xác minh chưa?
- Input data: Evidence context, scan history, validation status, supporting evidence.
- Output: Evidence summary ngắn gọn, trạng thái đủ/chưa đủ.
- Giá trị điều hành: Cho lãnh đạo biết nhanh mức sẵn sàng của evidence.
- Quan hệ với widget khác: Là đầu vào nhận thức cho Coverage và Validation widgets.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Evidence Executive Summary`

### 2.2 Evidence Coverage Widget

- Mục đích: Đánh giá mức độ bao phủ của evidence.
- Câu hỏi quản trị: Đã có đủ loại bằng chứng cần thiết chưa?
- Input data: Evidence set, coverage dimensions, missing evidence signals.
- Output: Coverage status, thiếu gì, đủ ở mức nào.
- Giá trị điều hành: Xác định phần evidence còn thiếu.
- Quan hệ với widget khác: Phụ thuộc Executive Summary và Supporting Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Decision Support`

### 2.3 Evidence Timeline Widget

- Mục đích: Hiển thị trình tự evidence theo thời gian.
- Câu hỏi quản trị: Evidence hình thành và thay đổi thế nào?
- Input data: Evidence events, scan points, validation milestones.
- Output: Evidence timeline.
- Giá trị điều hành: Cung cấp ngữ cảnh thời gian cho xác minh.
- Quan hệ với widget khác: Bổ trợ Scan History và RCA Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Evidence Timeline`

### 2.4 Scan History Widget

- Mục đích: Cho thấy lịch sử quét/ghi nhận của evidence.
- Câu hỏi quản trị: Evidence này đã được ghi nhận ra sao?
- Input data: Scan logs, trace history, record states.
- Output: Scan history.
- Giá trị điều hành: Tăng độ tin cậy cho quá trình xác minh.
- Quan hệ với widget khác: Là nền cho Rule Validation.
- EIDAF: `Evidence`
- IA mapping: `Scan History`

### 2.5 Rule Validation Widget

- Mục đích: Xác minh evidence có hợp lệ theo rule không.
- Câu hỏi quản trị: Evidence có đúng rule và đủ điều kiện chấp nhận không?
- Input data: Evidence, rule context, validation result.
- Output: Kết quả hợp lệ/không hợp lệ, trạng thái xác minh.
- Giá trị điều hành: Là lớp xác minh cốt lõi của Evidence Center.
- Quan hệ với widget khác: Phụ thuộc Scan History và Evidence Timeline.
- EIDAF: `Evidence -> Decision`
- IA mapping: `Rule Validation`

### 2.6 Supporting Evidence Widget

- Mục đích: Gom các bằng chứng hỗ trợ cho kết luận.
- Câu hỏi quản trị: Có bằng chứng phụ nào củng cố kết luận không?
- Input data: Supporting traces, related records, validation context.
- Output: Danh sách supporting evidence.
- Giá trị điều hành: Bổ sung độ chắc chắn cho xác minh.
- Quan hệ với widget khác: Hỗ trợ Executive Summary và RCA Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `Supporting Evidence`

### 2.7 RCA Evidence Widget

- Mục đích: Tổ chức evidence phục vụ xác minh root cause.
- Câu hỏi quản trị: Bằng chứng nào xác nhận nguyên nhân nghi ngờ?
- Input data: RCA candidate, timeline, validation data, supporting evidence.
- Output: Evidence gắn với nguyên nhân.
- Giá trị điều hành: Tăng độ tin cậy trước khi chuyển sang Action Center.
- Quan hệ với widget khác: Phụ thuộc Rule Validation và Supporting Evidence.
- EIDAF: `Evidence -> Insight`
- IA mapping: `RCA Evidence`

### 2.8 Decision Support Widget

- Mục đích: Kết luận evidence đã đủ hay chưa.
- Câu hỏi quản trị: Có thể chuyển sang Action Center chưa?
- Input data: Tổng hợp từ các widget xác minh.
- Output: Decision support statement, bao gồm `CHƯA ĐỦ THÔNG TIN` nếu cần.
- Giá trị điều hành: Chốt mức sẵn sàng của evidence.
- Quan hệ với widget khác: Phụ thuộc tất cả widget xác minh phía trên.
- EIDAF: `Decision`
- IA mapping: `Decision Support`

## 3. Widget Priority

### Must-have

- Evidence Executive Summary Widget
- Evidence Coverage Widget
- Evidence Timeline Widget
- Scan History Widget
- Rule Validation Widget
- Supporting Evidence Widget
- RCA Evidence Widget
- Decision Support Widget

### Should-have

- Không có ở giai đoạn này

### Optional

- Không có ở giai đoạn này

## 4. Widget Dependency

- Evidence Executive Summary Widget là điểm vào cho các widget còn lại.
- Evidence Coverage Widget phụ thuộc vào Executive Summary Widget và Supporting Evidence Widget.
- Evidence Timeline Widget hỗ trợ Scan History Widget và RCA Evidence Widget.
- Scan History Widget là nền cho Rule Validation Widget.
- Rule Validation Widget phụ thuộc vào Scan History Widget và Evidence Timeline Widget.
- Supporting Evidence Widget phụ thuộc vào Executive Summary Widget.
- RCA Evidence Widget phụ thuộc vào Rule Validation Widget và Supporting Evidence Widget.
- Decision Support Widget phụ thuộc vào toàn bộ các widget xác minh.

## 5. Widget Boundary

- Không lặp Shipment.
- Không lặp Action.
- Không biến widget thành khuyến nghị điều hành mới.
- Chỉ phục vụ xác minh và đánh giá độ đủ của bằng chứng.
- Widget chỉ thể hiện đúng cấp Evidence.

## 6. EIDAF Mapping

### Evidence Executive Summary Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Evidence Coverage Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Evidence Timeline Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Scan History Widget

- Evidence: Có
- Insight: Không tự tạo
- Decision: Không trực tiếp
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Rule Validation Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Supporting Evidence Widget

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### RCA Evidence Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Decision Support Widget

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

## 7. Widget-to-IA Mapping

- Evidence Executive Summary Widget -> Evidence Executive Summary
- Evidence Coverage Widget -> Decision Support
- Evidence Timeline Widget -> Evidence Timeline
- Scan History Widget -> Scan History
- Rule Validation Widget -> Rule Validation
- Supporting Evidence Widget -> Supporting Evidence
- RCA Evidence Widget -> RCA Evidence
- Decision Support Widget -> Decision Support

