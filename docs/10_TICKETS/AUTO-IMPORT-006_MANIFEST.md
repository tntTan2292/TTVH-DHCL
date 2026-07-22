# AUTO-IMPORT-006 Manifest

- Ticket ID: `AUTO-IMPORT-006`
- Ticket Name: `Unified DKCL Authentication Lifecycle Recovery`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Current state: `ACTIVE / PO RECHECK`
- Technical Status: `PASS`
- Runtime Status: `AWAITING PO RECHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Activation date: `2026-07-22`
- Primary executor: `Antigravity`

## Approved Scope
- Bổ sung nút `Đăng nhập Huế` trên giao diện nạp dữ liệu.
- Sửa lỗi nút `Đăng nhập TCT` không hiển thị trình duyệt Playwright.
- Đồng bộ hóa vòng đời trình duyệt (visible browser, minimize/hide sau khi đăng nhập thành công, giữ process chạy ẩn).
- Ngăn chặn việc tự động kích hoạt tiến trình đăng nhập ngầm khi bấm nút Import khi chưa có session.

## Out of Scope
- Không thao tác đăng nhập thực tế bằng credential của PO trên môi trường sản xuất.
- Không thay đổi logic nạp dữ liệu Excel hay công thức tính toán KPI.
