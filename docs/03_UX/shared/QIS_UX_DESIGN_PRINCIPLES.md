# QIS UX Design Principles

## 1. Mục tiêu UX của QIS V2

QIS V2 là `Decision Support System`, nên UX phải phục vụ việc ra quyết định nhanh, rõ và có bằng chứng.

Mục tiêu UX:

- Giúp lãnh đạo nhìn đúng vấn đề nhanh nhất.
- Dẫn dắt từ tổng quan đến chi tiết theo context.
- Giữ nguyên ngữ cảnh khi drill-down hoặc quay ngược.
- Không làm người dùng phải tự ghép dữ liệu từ nhiều nơi.
- Mỗi màn hình phải hỗ trợ một câu hỏi điều hành rõ ràng.

## 2. UX Principles

### Executive First

Ưu tiên thông tin dành cho lãnh đạo trước, chi tiết sau.

### Decision First

Mọi màn hình phải hỗ trợ quyết định, không chỉ hiển thị dữ liệu.

### Evidence First

Khi đưa ra kết luận phải có bằng chứng đi kèm.

### Progressive Drill-down

Đi từ tổng quan đến chi tiết theo từng lớp thông tin.

### One Question Per Screen

Mỗi màn hình nên trả lời một câu hỏi điều hành chính.

### No Information Duplication

Không lặp lại cùng một thông tin ở nhiều Center nếu không có lý do rõ ràng.

### Context Preservation

Giữ nguyên Date Filter, BCVH, Route, Shipment, Rule và RCA context khi điều hướng.

### Action-oriented Design

Thông tin phải dẫn tới hành động hoặc quyết định cụ thể.

## 3. Navigation Principles

- Điều hướng theo chuỗi điều hành đã freeze.
- Từ tổng quan đi xuống chi tiết, không nhảy cấp không cần thiết.
- Mỗi bước drill-down phải giữ context.
- Back navigation phải đưa người dùng quay lại đúng ngữ cảnh trước đó.
- Không ép người dùng nhớ hoặc nhập lại dữ liệu đã có.

## 4. Information Hierarchy

Ưu tiên hiển thị theo thứ tự:

1. Executive summary
2. Trạng thái nổi bật
3. Ưu tiên cần xử lý
4. Nguyên nhân
5. Bằng chứng hỗ trợ
6. Khuyến nghị
7. Hành động và phản hồi

Quy tắc:

- Cấp trên luôn nắm tổng quan trước.
- Cấp dưới chỉ xuất hiện khi cần drill-down.
- Không trộn lẫn cấp độ thông tin trên cùng một lớp hiển thị.

## 5. Visual Hierarchy

- Tiêu đề chính phải thể hiện đúng vai trò của Center.
- Executive summary phải nổi bật hơn phần chi tiết.
- Priority và warning state phải dễ nhận biết.
- Evidence và feedback phải có trạng thái rõ ràng.
- Không dùng hiệu ứng thị giác gây nhiễu cho quyết định.

## 6. Interaction Principles

- Tương tác phải ngắn, rõ và có mục đích.
- Mỗi hành động phải làm rõ thêm context hoặc mở sang lớp chi tiết phù hợp.
- Không bắt người dùng thao tác quá nhiều để đi tới insight.
- Không ẩn hành động quan trọng sau nhiều lớp menu.
- Interaction phải nhất quán giữa các Center.

## 7. Drill-down UX Rules

- Drill-down chỉ khi có lý do điều hành rõ ràng.
- Drill-down phải giữ nguyên context gốc.
- Drill-down phải chuyển sang đúng Center tiếp theo trong chuỗi kiến trúc.
- Không drill-down sang quá nhiều cấp cùng lúc.
- Người dùng phải biết mình đang đi từ đâu đến đâu.

## 8. Back Navigation Rules

- Quay lại phải giữ nguyên context đã chọn.
- Không reset Date Filter nếu người dùng chưa đổi phạm vi.
- Không mất lựa chọn BCVH, Route hoặc Shipment khi quay ngược.
- Không làm người dùng phải thao tác lại từ đầu.
- Back navigation phải nhất quán giữa mọi Center.

## 9. Cross-Center UX Consistency

- Cùng một loại context phải hiển thị và hành xử giống nhau ở mọi Center.
- Điều hướng, back, filter và trạng thái phải có cách dùng thống nhất.
- Thuật ngữ phải đồng nhất xuyên suốt hệ thống.
- Không để mỗi Center tự tạo một logic UX riêng.
- Người dùng phải cảm thấy đang ở cùng một hệ điều hành, không phải nhiều ứng dụng rời rạc.

## 10. Responsive Rules (Desktop-first)

- Thiết kế ưu tiên desktop trước.
- Các Center điều hành chính phải tối ưu cho màn hình lớn.
- Trên màn hình nhỏ hơn, ưu tiên giữ context và hành động chính.
- Không hy sinh khả năng đọc evidence, priority hoặc action vì quá nhiều chi tiết.
- Responsive không được làm thay đổi thứ tự điều hành cốt lõi.

## 11. Mapping giữa UX Principles và EIDAF

### Executive First

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Decision First

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Evidence First

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Không trực tiếp
- Feedback: Không trực tiếp

### Progressive Drill-down

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

### One Question Per Screen

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### No Information Duplication

- Evidence: Có
- Insight: Có
- Decision: Một phần
- Action: Một phần
- Feedback: Không trực tiếp

### Context Preservation

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Có

### Action-oriented Design

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Có

