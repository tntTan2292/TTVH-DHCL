# AUTO-IMPORT-006 Checkpoint 001: Unified DKCL Auth Recovery Planning (Revised)

- Ticket: `AUTO-IMPORT-006`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Status: `ACTIVE / DISCOVERY`
- Runtime Status: `NOT TESTED`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`

---

## 1. Root Cause Analysis

### 1.1 Huế Authentication Lifecycle Gaps
- **Component/Function render Huế không có nút login**: Trong `frontend/src/pages/DataImportCenter.jsx`, giao diện quản lý Huế chỉ kết xuất nút `Quét ngày thiếu` và `Update` (để chạy hàng đợi nạp bù), hoàn toàn thiếu nút hành động `Đăng nhập Huế`.
- **API Call khi bấm Import**: Khi người dùng nhấn nút `Update` (Import), frontend gọi endpoint `POST /import/dkcl/hue/f13/backfill-queue`.
- **Backend function tự kích hoạt interactive authentication**:
  - Khi nhận request, `DkclHueF13BackfillService.startQueue` gọi `validateAuthenticationBeforeQueue()`. Do `DkclHueF13SyncService` không định nghĩa hàm `validateAuthentication`, hàm này âm thầm bỏ qua và hàng đợi được tạo thành công với trạng thái `QUEUED`.
  - Background worker trong `DkclHueF13BackfillService.processQueueItem` gọi `this.syncService.start(item.measurementDate, { requireExistingSession: true })`.
  - Tuy nhiên, chữ ký (signature) của hàm `start` trong `DkclHueF13SyncService` chỉ nhận 1 tham số: `async start(measurementDate)`. Do đó, tham số cấu hình `{ requireExistingSession: true }` bị bỏ qua hoàn toàn.
  - Kết quả là `runWorkflow` gọi `portalClient.authenticate` mà không có cờ `requireExistingSession: true`, khiến client tự động mở trình duyệt ngầm hoặc visible (nếu không chạy headless) để tự động đăng nhập khi phát hiện phiên hết hạn.
- **Lý do gắn auth vào Import**: Thiết kế ban đầu không tách biệt rõ ràng việc kiểm tra phiên và hành động nạp dữ liệu, coi việc đăng nhập là một bước phụ tự động của luồng nạp dữ liệu.

### 1.2 TCT Authentication Lifecycle Gaps
- **Caller truyền `sourceConfig` ở đâu**: Trong `DkclSessionPreflightService.interactiveAuthenticate(source)`, hàm định vị cấu hình và gọi `this.interactiveClientFactory(sourceConfig)`.
- **Chữ ký factory hiện tại**: 
  `this.interactiveClientFactory = options.interactiveClientFactory || (() => new DkclHueF13PortalClient({ ... }))`
  Arrow function này không tiếp nhận bất kỳ đối số nào.
- **Giá trị bị mất và giá trị mặc định**: Tham số `sourceConfig` (chứa thông tin về nguồn TCT, đường dẫn profile TCT) bị nuốt mất. Client được khởi tạo không có cấu hình nguồn cụ thể, dẫn đến việc dùng các giá trị mặc định trong `DkclHueF13PortalClient`.
- **Ảnh hưởng đến launch mode/profile**:
  - `profileDir` mặc định trong `DkclHueF13PortalClient` phân giải về thư mục profile của `HUE` (`../Data DKCL/BrowserProfiles/HUE`).
  - Khi kích hoạt đăng nhập TCT, client cố gắng chiếm khóa thư mục profile của Huế (`HUE.lock`). Nếu Huế đang chạy ẩn hoặc khóa này chưa được giải phóng, client sẽ ném lỗi `PROFILE_LOCKED` hoặc crash ngầm, dẫn đến việc browser không hiển thị headed như mong đợi.
- **Exact Code Path**: `backend/src/services/dkclSessionPreflightService.js` -> `interactiveAuthenticate(source)` -> dòng 143.

---

## 2. API và Route Inventory

| Nguồn | Giao diện gọi API | Backend Route (Express) | Controller Handler | Service Class | Portal Client Class | Status/Preflight Endpoint | Response Model (Chuẩn hóa) |
|---|---|---|---|---|---|---|---|
| **Huế** | `api.post('/import/dkcl/hue/f13/backfill-queue')` | `/dkcl/hue/f13/backfill-queue` | `dkclHueF13SyncController.startBackfillQueue` | `DkclHueF13BackfillService` | `DkclHueF13PortalClient` | `/dkcl/session/preflight?source=HUE` | `{ success: boolean, data: { source: 'HUE', status: string, ... } }` |
| **TCT** | `api.post('/import/dkcl/tct/f13/backfill-queue')` | `/dkcl/tct/f13/backfill-queue` | `dkclSharedOperationsController.startTctBackfillQueue` | `TctF13BackfillService` | `DkclHueF13PortalClient` | `/dkcl/session/preflight?source=TCT` | `{ success: boolean, data: { source: 'TCT', status: string, ... } }` |

- **Yêu cầu bổ sung**: Huế cần sử dụng chung endpoint preflight và interactive-auth đã có sẵn: `/dkcl/session/preflight` và `/dkcl/session/interactive-auth` với tham số `source=HUE`.
- **TCT Endpoint compatibility**: Endpoint TCT hiện tại giữ nguyên cấu trúc route và tham số để tránh phá vỡ giao thức tương thích ngược.

---

## 3. Session / Browser Lifecycle Hiện Tại

- **Khởi tạo**: Browser được tạo động trong `DkclHueF13PortalClient.authenticate` hoặc `openInteractiveAuthentication` sử dụng `chromium.launchPersistentContext`.
- **Lưu trữ Handle**: Handle của browser/context được lưu trực tiếp trên instance của portal client (`this.context`, `this.page`). Đối với luồng tương tác, instance client này được lưu vào Map `interactiveClients` trong `DkclSessionPreflightService`.
- **Session Validation**: Thực hiện qua `isAuthenticated()` bằng cách kiểm tra sự hiện diện của các text định danh trên body trang web (như `Tra cứu thông tin bưu gửi`, `Quản lý tệp`).
- **Đóng/Giải phóng**: Gọi `client.close()` giải phóng context và xóa thư mục `.lock`. Hiện tại, trong `finally` của `preflight()`, client luôn bị đóng ngay lập tức.
- **Đóng thủ công**: Nếu user đóng browser, Playwright context bị ngắt kết nối (disconnected), nhưng backend chưa có cơ chế bắt sự kiện này để cập nhật trạng thái session về `SESSION_EXPIRED`.
- **Profile path**:
  - Huế: `../Data DKCL/BrowserProfiles/HUE`
  - TCT: `../Data DKCL/BrowserProfiles/TCT`
- **Nguy cơ lây nhiễm chéo**: Rất cao do thiếu cô lập tham số trong factory khởi tạo client tương tác, khiến TCT dùng chung thư mục profile của Huế.

---

## 4. State Contract Đề Xuất

Mỗi nguồn dữ liệu sẽ duy trì một trạng thái độc lập được lưu trữ trên Registry của `DkclSessionPreflightService` và đồng bộ qua API:

- **Các trạng thái**:
  - `NOT_AUTHENTICATED`: Chưa đăng nhập.
  - `OPENING_BROWSER`: Đang khởi chạy browser headed.
  - `WAITING_FOR_LOGIN`: Đang đợi người dùng đăng nhập thủ công trên giao diện.
  - `AUTHENTICATED`: Đã xác thực thành công.
  - `BACKGROUND_READY`: Browser đã ẩn/minimize, sẵn sàng chạy nền.
  - `SESSION_EXPIRED`: Phiên làm việc hết hạn hoặc browser bị đóng.
  - `ERROR`: Lỗi hệ thống.
- **Cơ chế Lock/Deduplication**: Sử dụng một cờ khóa trạng thái `isLaunching = true` trên từng nguồn trong quá trình mở browser để chặn yêu cầu mở trùng lặp.
- **Disconnect Handling**: Lắng nghe sự kiện `context.on('close')` để tự động dọn dẹp handle và hạ trạng thái về `SESSION_EXPIRED`.

---

## 5. Import Preflight

- **Queue transition**: Khi người dùng nhấn nút chạy bù, queue được tạo và chuyển sang `RUNNING`.
- **Cơ chế chặn trước RUNNING**:
  - Backend sửa đổi `validateAuthenticationBeforeQueue()` trong cả Huế và TCT backfill service để thực hiện kiểm tra trạng thái thực tế từ `sessionPreflightService`.
  - Nếu trạng thái của nguồn tương ứng không phải là `BACKGROUND_READY` hoặc `SESSION_VALID`, backend sẽ chặn ngay lập tức, trả về lỗi `AUTHENTICATION_REQUIRED` và mã lỗi HTTP 401.
  - Sửa đổi hàm `start()` của `DkclHueF13SyncService` để tiếp nhận options cấu hình, đảm bảo cờ `requireExistingSession: true` được chuyển tiếp đầy đủ đến client, triệt tiêu luồng tự động mở trình duyệt ngầm.
  - Frontend sẽ chặn hành động bấm nút nạp ngay tại UI nếu trạng thái session không khả dụng.

---

## 6. Thiết Kế Kỹ Thuật Minimize/Hide

- **Cơ chế áp dụng**: Do Playwright không hỗ trợ trực tiếp việc ẩn cửa sổ trình duyệt sau khi khởi chạy ở chế độ headed, ta sử dụng giao thức CDP (Chrome DevTools Protocol) thông qua phương thức `Browser.setWindowBounds` với trạng thái `minimized`.
- **Code mẫu**:
  ```javascript
  const session = await page.context().newCDPSession(page);
  const { windowId } = await session.send('Browser.getWindowForTarget');
  await session.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
  ```
- **Fallback**: Nếu CDP session thất bại, giữ nguyên kích thước cửa sổ bình thường và ghi log cảnh báo, không đóng tiến trình.
- **Unit test**: Sử dụng stub CDPSession để xác nhận lệnh gửi đúng tham số `minimized`.

---

## 7. Kế Hoạch File Chi Tiết (Exact File Plan)

### 7.1 Backend Production
- [MODIFY] [dkclSessionPreflightService.js](file:///d:/Antigravity - Project\TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclSessionPreflightService.js):
  - Nhận diện `sourceConfig` trong `interactiveClientFactory`.
  - Quản lý trạng thái và deduplicate tiến trình khởi chạy browser.
- [MODIFY] [dkclHueF13PortalClient.js](file:///d:/Antigravity - Project\TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclHueF13PortalClient.js):
  - Tiếp nhận tham số `source` để cô lập lock file.
  - Lắng nghe sự kiện đóng browser từ người dùng để hạ cấp trạng thái.
  - Triển khai adapter minimize window bằng CDP.
- [MODIFY] [dkclHueF13SyncService.js](file:///d:/Antigravity - Project\TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclHueF13SyncService.js):
  - Cập nhật signature hàm `start` hỗ trợ options chuyển tiếp `requireExistingSession`.
- [MODIFY] [dkclHueF13BackfillService.js](file:///d:/Antigravity - Project\TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclHueF13BackfillService.js):
  - Gọi thực tế `sessionPreflightService` để validate session của Huế trước khi cho phép tạo hàng đợi.

### 7.2 Frontend Production
- [MODIFY] [DataImportCenter.jsx](file:///d:/Antigravity - Project\TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/frontend/src/pages/DataImportCenter.jsx):
  - Bổ sung nút `Đăng nhập Huế`.
  - Tách biệt loading state và status badge cho từng nguồn Huế và TCT.
  - Khóa nút nạp dữ liệu và hiển thị cảnh báo trực quan nếu session chưa sẵn sàng.

---

## 8. Ma Trận Kiểm Thử Tự Động (Automated Test Matrix)

- **`backend/test_dkclSessionPreflightService.js`**:
  - Test 1: Huế interactive login sử dụng visible/headed launch.
  - Test 2: TCT interactive login sử dụng visible/headed launch và đúng profile path.
  - Test 3: Yêu cầu đăng nhập trùng lặp bị chặn (deduplicated).
  - Test 4: Sự kiện ngắt kết nối trình duyệt cập nhật trạng thái về `SESSION_EXPIRED`.
- **`backend/test_dkclHueF13PortalClient.js`**:
  - Test 5: Đăng nhập thành công không tự đóng context/browser.
  - Test 6: Gọi CDP set window state sang `minimized` khi đăng nhập thành công.
- **`backend/test_dkclHueF13BackfillService.js`**:
  - Test 7: Tạo hàng đợi Huế bị chặn và trả về lỗi 401 nếu preflight check không hợp lệ.
  - Test 8: Tiến trình nạp Huế không tự động mở login ngầm.
- **`frontend/src/pages/dataImportCenter.test.js`**:
  - Test 9: Giao diện kết xuất độc lập nút đăng nhập Huế và TCT.
  - Test 10: Nút Import bị khóa và hiển thị cảnh báo nếu session chưa sẵn sàng.
