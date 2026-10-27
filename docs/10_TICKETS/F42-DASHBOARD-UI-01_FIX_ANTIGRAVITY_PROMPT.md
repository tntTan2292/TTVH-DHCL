# F42-DASHBOARD-UI-01 – Prompt sửa lỗi sau review Opus (Antigravity)

Dán nguyên văn cho Antigravity.

---

Sửa các điểm lệch Opus tìm thấy ở `F42-DASHBOARD-UI-01` (A+B, commit `5e50f0ec`). Chỉ sửa trong `frontend/src/features/f42/` và `indicatorConfig.js` (theme `sky`). Không đụng `accessModel.js`, `UserManagementPage.jsx`, menu hay file hangton (thuộc `HANGTON-HANDLING-01`). Không mở trình duyệt, không chụp ảnh, không chạy dev server, không đăng nhập. Commit theo pathspec chỉ các file F4.2 bạn sửa.

Sửa:

1. **Header dính:** bảng bưu tá cuộn dọc phải giữ header cố định. Thẻ `overflow-x-auto` bọc từng bảng đang chặn `sticky top`; bỏ chặn đó mà vẫn cuộn ngang được trên màn hẹp.
2. **Ảnh chụp:** Top-N tính trên toàn bảng (tổng số dòng đưa vào ảnh ≤ N, mặc định 25), không phải mỗi BCVH. Dòng chú thích dùng tiếng Việt ("sắp xếp theo Sản lượng, giảm dần"), không in tên trường (`volume`, `rate`).
3. **Dải "6 BCVH hôm nay":** chỉ hiện các BCVH backend trả về, không tự dựng đủ 6 từ `CANONICAL_BCVH_UNITS`. Khi chỉ có 1 BCVH thì bỏ số thứ tự `#`.
4. **Nhãn:** "(N blank)" đổi thành "(gồm N chưa ĐG)".
5. **Màu theme `sky`:** màu đường tỷ lệ hiện trùng primary của F1.2 teal, còn primary gần blue-600 của F1.3. Chọn lại để hai chỉ tiêu này không lẫn trên biểu đồ; đổi sắc nếu cần, vẫn sáng, không tím, không tối.
6. **Việc nhỏ:** lần bấm đầu vào "Hạng" phải ra thứ tự tăng; kỳ không có dữ liệu (`meta.has_data` false hoặc mọi `postmen` rỗng) hiện thông báo thay vì sáu khối rỗng; các BCVH mặc định đóng, sửa comment cho đúng; xóa biến thừa `fy`, `indicator` (`F42PostmanDashboardBlocks`) và import `F42_INDICATOR` trong `f42Pages.test.js`.

Thêm test cho mục 2, 3, 6 (helper thuần). Chạy lint, build, `node --test "src/**/*.test.js"`; báo kết quả thật, dừng ở `READY FOR PO CHECK`.
