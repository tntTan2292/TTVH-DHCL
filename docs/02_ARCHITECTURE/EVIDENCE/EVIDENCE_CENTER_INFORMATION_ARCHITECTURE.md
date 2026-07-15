# Evidence Center Information Architecture

## 1. Vai trò trong QIS V2

Evidence Center là tầng xác minh bằng chứng trong QIS V2.

Vai trò chính:

- Kiểm tra và hợp thức hóa evidence trước khi ra quyết định hoặc hành động.
- Tập trung vào xác minh, không tạo insight mới nếu chưa có evidence đủ rõ.
- Chuẩn bị đầu vào đáng tin cậy cho Action Center.
- Là nơi trả lời câu hỏi: evidence đã đủ chưa, đúng chưa, có thể dùng để quyết định hay chưa.

## 2. Các câu hỏi quản trị cần trả lời

Evidence Center phải trả lời được các câu hỏi sau:

- Bằng chứng hiện có đã đủ để xác minh vấn đề chưa?
- Dữ liệu nào đang chứng minh hoặc bác bỏ nhận định trước đó?
- Có scan history hoặc rule validation nào xác nhận tình trạng không?
- Bằng chứng nào là trực tiếp, bằng chứng nào là hỗ trợ?
- Nếu chưa đủ dữ liệu, có thể khẳng định "CHƯA ĐỦ THÔNG TIN" không?
- Evidence nào đủ mạnh để chuyển sang Action Center?

## 3. Information Architecture

### 3.1 Evidence Executive Summary

- Mục tiêu: Tóm tắt trạng thái evidence hiện có.
- Giá trị điều hành: Cho lãnh đạo biết ngay evidence đã đủ hay chưa.
- Input: Evidence từ Shipment Performance Center, rule validation, scan history, supporting evidence.
- Output: Tóm tắt xác minh, trạng thái đủ/chưa đủ evidence.
- Quan hệ với khối khác: Là điểm vào để đi sâu vào timeline và validation.

### 3.2 Evidence Timeline

- Mục tiêu: Hiển thị chuỗi sự kiện và mốc evidence theo thời gian.
- Giá trị điều hành: Xác định quá trình phát sinh và xác minh evidence.
- Input: Mốc thời gian, scan events, status changes, validation points.
- Output: Dòng thời gian evidence.
- Quan hệ với khối khác: Bổ trợ cho Scan History và RCA Evidence.

### 3.3 Scan History

- Mục tiêu: Cho thấy lịch sử quét/ghi nhận liên quan đến evidence.
- Giá trị điều hành: Giúp xác định evidence có được ghi nhận nhất quán hay không.
- Input: Lịch sử scan, trace ghi nhận, trạng thái kiểm tra.
- Output: Scan history phục vụ kiểm chứng.
- Quan hệ với khối khác: Là bằng chứng nền cho Rule Validation và Supporting Evidence.

### 3.4 Rule Validation

- Mục tiêu: Xác minh evidence có phù hợp rule hay không.
- Giá trị điều hành: Đảm bảo quyết định không dựa vào dữ liệu trái rule.
- Input: Evidence, rule context, validation result.
- Output: Kết quả hợp lệ/không hợp lệ, trạng thái xác minh.
- Quan hệ với khối khác: Là lớp xác minh cốt lõi trước khi đi sang Action Center.

### 3.5 Supporting Evidence

- Mục tiêu: Gom các bằng chứng hỗ trợ cho kết luận chính.
- Giá trị điều hành: Củng cố hoặc làm rõ bằng chứng trực tiếp.
- Input: Trace phụ, quan sát bổ sung, liên kết chứng cứ.
- Output: Bộ supporting evidence kèm mức độ liên quan.
- Quan hệ với khối khác: Hỗ trợ Evidence Executive Summary và RCA Evidence.

### 3.6 RCA Evidence

- Mục tiêu: Tổ chức evidence phục vụ xác minh root cause.
- Giá trị điều hành: Chỉ ra bằng chứng nào xác nhận nguyên nhân nghi ngờ.
- Input: Root cause candidate, validation data, timeline, scan history.
- Output: Evidence gắn với nguyên nhân.
- Quan hệ với khối khác: Kết nối từ Shipment Performance Center sang Evidence Center.

### 3.7 Decision Support

- Mục tiêu: Kết luận xem evidence đã đủ để chuyển sang Action Center hay chưa.
- Giá trị điều hành: Giúp lãnh đạo biết có thể hành động ngay hay cần bổ sung evidence.
- Input: Tổng hợp từ các khối xác minh.
- Output: Decision support statement, bao gồm trạng thái `CHƯA ĐỦ THÔNG TIN` nếu cần.
- Quan hệ với khối khác: Là đầu ra cuối của Evidence Center trước Action Center.

## 4. Data Flow

Luồng dữ liệu trong Evidence Center đi theo hướng:

`Evidence Executive Summary -> Evidence Timeline -> Scan History -> Rule Validation -> Supporting Evidence -> RCA Evidence -> Decision Support`

Quy tắc dữ liệu:

- Evidence Executive Summary nhận đầu vào đã qua Shipment Performance Center.
- Evidence Timeline và Scan History dùng để tái tạo chuỗi xác minh.
- Rule Validation là bước trung tâm trước khi chấp nhận evidence.
- Supporting Evidence chỉ bổ trợ, không thay thế evidence chính.
- RCA Evidence chỉ tổng hợp evidence liên quan đến nguyên nhân.
- Decision Support chỉ được chốt sau khi đã kiểm tra đủ evidence.

## 5. Decision Flow

Luồng ra quyết định của lãnh đạo:

1. Đọc Evidence Executive Summary để biết evidence đã đủ chưa.
2. Xem Evidence Timeline và Scan History để hiểu quá trình ghi nhận.
3. Đọc Rule Validation để biết evidence có hợp lệ không.
4. Đối chiếu Supporting Evidence và RCA Evidence để xác nhận kết luận.
5. Nếu evidence chưa đủ, kết luận rõ `CHƯA ĐỦ THÔNG TIN`.
6. Nếu evidence đủ, chuyển sang Action Center.

## 6. Drill-down Flow

`Dashboard`

↓

`BCVH Performance Center`

↓

`Route Performance Center`

↓

`Shipment Performance Center`

↓

`Evidence Center`

↓

`Action Center`

Ý nghĩa:

- Dashboard là điểm vào cấp tổng quan.
- BCVH Performance Center và Route Performance Center dẫn dắt lựa chọn vấn đề.
- Shipment Performance Center xác định bưu gửi đại diện cho vấn đề.
- Evidence Center xác minh bằng chứng.
- Action Center nhận đầu ra đã được xác minh để thực thi.

## 7. EIDAF Mapping

### Evidence Executive Summary

- Evidence: Có
- Insight: Một phần
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Đây là lớp tóm tắt bằng chứng, chưa tạo insight mới nếu evidence chưa đủ.

### Evidence Timeline

- Evidence: Có
- Insight: Một phần
- Decision: Không trực tiếp
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Timeline giúp tái tạo trình tự evidence.

### Scan History

- Evidence: Có
- Insight: Không tự tạo
- Decision: Không trực tiếp
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Đây là lịch sử ghi nhận, không phải insight.

### Rule Validation

- Evidence: Có
- Insight: Một phần
- Decision: Có
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Validation xác nhận evidence hợp lệ hay không.

### Supporting Evidence

- Evidence: Có
- Insight: Một phần
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: Supporting evidence chỉ bổ trợ cho evidence chính.

### RCA Evidence

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

Lý do: RCA evidence phục vụ xác minh nguyên nhân.

### Decision Support

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

Lý do: Đây là lớp chốt xem có đủ evidence để đi tiếp sang Action Center hay không.

## 8. Nguyên tắc thiết kế

- Không lặp Shipment Performance Center.
- Không đưa Recommendation sang Evidence.
- Không thay thế Action Center.
- Chỉ xác minh và cung cấp bằng chứng phục vụ quyết định.
- Nếu thiếu dữ liệu phải ghi rõ: `CHƯA ĐỦ THÔNG TIN`.

