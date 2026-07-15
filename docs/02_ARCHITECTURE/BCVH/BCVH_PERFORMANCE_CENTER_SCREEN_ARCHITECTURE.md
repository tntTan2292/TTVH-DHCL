# BCVH Performance Center Screen Architecture

## 1. Vai trò của Screen Architecture

Screen Architecture xác định cách các widget của BCVH Performance Center được sắp xếp thành các vùng màn hình để hỗ trợ đọc, phân tích và ra quyết định.

Vai trò:

- Là lớp trung gian giữa Widget Specification và UX.
- Quy định thứ tự đọc và mức ưu tiên hiển thị.
- Bảo đảm lãnh đạo đi từ tổng quan đến chi tiết theo đúng luồng điều hành.
- Không thay thế UX design và không đi vào wireframe chi tiết.

## 2. Thứ tự ưu tiên hiển thị Widget

Ưu tiên hiển thị:

1. Executive Brief Widget
2. Health Overview Widget
3. Priority List Widget
4. Trend Widget
5. Root Cause Summary Widget
6. Recommendation Widget
7. Drill-down Trigger Widget

Nguyên tắc:

- Executive và Priority luôn xuất hiện sớm nhất.
- Trend và Root Cause là lớp phân tích hỗ trợ.
- Recommendation và Drill-down là lớp ra quyết định và hành động.

## 3. Screen Zones

### Header Zone

- Chứa title, context, filter, và entry controls.

### Executive Zone

- Chứa Executive Brief và Health Overview.
- Phục vụ nhận thức nhanh cho lãnh đạo.

### Analysis Zone

- Chứa Priority List, Trend, Root Cause Summary.
- Phục vụ phân tích nguyên nhân và ưu tiên.

### Recommendation Zone

- Chứa Recommendation Widget.
- Phục vụ chốt hướng xử lý.

### Drill-down Zone

- Chứa Drill-down Trigger Widget.
- Phục vụ chuyển sang Route Performance Center.

## 4. Widget Placement

### Executive Brief Widget

- Vị trí: Executive Zone
- Kích thước tương đối: lớn
- Full width / Half width: full width
- Sticky hay không: không
- Collapse hay không: không
- Điều kiện hiển thị: luôn hiển thị

### Health Overview Widget

- Vị trí: Executive Zone
- Kích thước tương đối: trung bình
- Full width / Half width: half width
- Sticky hay không: không
- Collapse hay không: có thể collapse nếu cần
- Điều kiện hiển thị: luôn hiển thị

### Priority List Widget

- Vị trí: Analysis Zone
- Kích thước tương đối: lớn
- Full width / Half width: full width
- Sticky hay không: không
- Collapse hay không: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Trend Widget

- Vị trí: Analysis Zone
- Kích thước tương đối: trung bình
- Full width / Half width: half width
- Sticky hay không: không
- Collapse hay không: có thể collapse
- Điều kiện hiển thị: luôn hiển thị

### Root Cause Summary Widget

- Vị trí: Analysis Zone
- Kích thước tương đối: trung bình đến lớn
- Full width / Half width: half width
- Sticky hay không: không
- Collapse hay không: có thể collapse
- Điều kiện hiển thị: khi có priority item được chọn

### Recommendation Widget

- Vị trí: Recommendation Zone
- Kích thước tương đối: lớn
- Full width / Half width: full width
- Sticky hay không: không
- Collapse hay không: không
- Điều kiện hiển thị: khi có recommendation sẵn sàng

### Drill-down Trigger Widget

- Vị trí: Drill-down Zone
- Kích thước tương đối: nhỏ đến trung bình
- Full width / Half width: half width
- Sticky hay không: không
- Collapse hay không: có thể collapse
- Điều kiện hiển thị: khi drill-down có ý nghĩa điều hành

## 5. Reading Flow

Hành trình mắt của lãnh đạo:

1. Nhìn Header Zone để xác định context.
2. Đọc Executive Brief trước.
3. Xem Health Overview để hiểu trạng thái tổng quát.
4. Chuyển sang Priority List để biết BCVH nào cần xử lý trước.
5. Đọc Trend để hiểu xu hướng.
6. Xem Root Cause Summary để hiểu nguyên nhân.
7. Đọc Recommendation để nắm hướng xử lý.
8. Cuối cùng nhìn Drill-down Trigger nếu cần đi sâu sang Route.

## 6. Interaction Flow

- Priority List Widget kích hoạt Root Cause Summary Widget theo item được chọn.
- Priority List Widget kích hoạt Trend Widget theo BCVH được chọn.
- Root Cause Summary Widget kích hoạt Recommendation Widget khi đủ ngữ cảnh.
- Recommendation Widget kích hoạt Drill-down Trigger Widget nếu cần chuyển sang Route Performance Center.
- Drill-down Trigger Widget mở ngữ cảnh sang Center tiếp theo.

## 7. Progressive Disclosure

### Mặc định hiển thị

- Executive Brief Widget
- Health Overview Widget
- Priority List Widget
- Trend Widget

### Chỉ hiện khi cần

- Root Cause Summary Widget
- Recommendation Widget
- Drill-down Trigger Widget

Nguyên tắc:

- Thông tin tổng quan luôn hiện trước.
- Thông tin chi tiết chỉ hiện khi người dùng chọn priority item hoặc khi có đủ ngữ cảnh.
- Không dồn toàn bộ chi tiết vào màn hình mặc định.

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

### Analysis Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Một phần
- Feedback: Không trực tiếp

### Recommendation Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Một phần

### Drill-down Zone

- Evidence: Có
- Insight: Có
- Decision: Có
- Action: Có
- Feedback: Không trực tiếp

