# AUTO-IMPORT-006 Checkpoint 001: Unified DKCL Auth Recovery Planning (Discovery Report)

- Ticket: `AUTO-IMPORT-006`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Status: `ACTIVE / DISCOVERY`
- Runtime Status: `NOT TESTED`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`

---

## 1. HUE EXACT CURRENT FLOW

- **File và Component render khu vực Huế**: `frontend/src/pages/DataImportCenter.jsx` (Phần tab hoặc card điều khiển Huế F1.3).
- **Function xử lý click Import Huế**: `handleStartBackfillQueue` (dòng 400).
- **API Endpoint được gọi**: `POST /api/import/dkcl/hue/f13/backfill-queue`.
- **Backend Route**: `/dkcl/hue/f13/backfill-queue` định nghĩa trong `backend/src/routes/importRoutes.js`.
- **Controller/Handler**: `dkclHueF13SyncController.startBackfillQueue` trong `backend/src/controllers/dkclHueF13SyncController.js`.
- **Service**: `DkclHueF13BackfillService` trong `backend/src/services/dkclHueF13BackfillService.js`.
- **Function tự mở interactive browser khi Import**:
  - `DkclHueF13BackfillService.processQueueItem` gọi `this.syncService.start(item.measurementDate, { requireExistingSession: true })`.
  - Do signature của `DkclHueF13SyncService.start(measurementDate)` không nhận đối số thứ hai, tham số chặn bị nuốt.
  - `runWorkflow(run)` của `DkclHueF13SyncService` gọi `portalClient.authenticate(...)` không có cờ `requireExistingSession: true`.
  - Khi không tìm thấy session hợp lệ, `DkclHueF13PortalClient.authenticate` tự động gọi `chromium.launchPersistentContext` để khởi tạo browser nạp dữ liệu.

### Exact Call Chain:
```
DataImportCenter.jsx::handleStartBackfillQueue
→ frontend API::POST /import/dkcl/hue/f13/backfill-queue
→ backend/src/routes/importRoutes.js::router.post('/dkcl/hue/f13/backfill-queue')
→ dkclHueF13SyncController.js::startBackfillQueue
→ dkclHueF13BackfillService.js::startQueue
→ dkclHueF13BackfillService.js::processQueue
→ dkclHueF13BackfillService.js::processQueueItem
→ dkclHueF13SyncService.js::start
→ dkclHueF13SyncService.js::runWorkflow
→ dkclHueF13PortalClient.js::authenticate
```

---

## 2. TCT EXACT ROOT CAUSE

- **Nơi `sourceConfig` được tạo**: Tạo trong `DkclSessionPreflightService.normalizeSource(source)` (dòng 53) dựa trên ánh xạ nguồn TCT.
- **Nơi `sourceConfig` được truyền vào**: Truyền tại hàm `interactiveAuthenticate(source)` của `DkclSessionPreflightService` (dòng 143) cho hàm factory: `this.interactiveClientFactory(sourceConfig)`.
- **Signature của `interactiveClientFactory` hiện tại**:
  ```javascript
  this.interactiveClientFactory = options.interactiveClientFactory || (() => new DkclHueF13PortalClient({
      headless: false,
      manualAuthWaitMs: Number(process.env.DKCL_INTERACTIVE_AUTH_WAIT_MS || 240000)
  }));
  ```
- **Dòng/Function bỏ qua `sourceConfig`**: Arrow function của factory trên không khai báo tham số tiếp nhận đối số, do đó `sourceConfig` bị nuốt mất tại dòng 47 trong `dkclSessionPreflightService.js`.
- **Object/Config thực tế được dùng**: Một instance mặc định của `DkclHueF13PortalClient` được tạo ra. Trong constructor của portal client không được truyền `source`, dẫn đến `profileDir` mặc định rơi về HUE (`../Data DKCL/BrowserProfiles/HUE`).
- **Ảnh hưởng cụ thể**:
  - **Source**: Bị hiểu nhầm là HUE thay vì TCT.
  - **Profile path**: Trỏ sai về thư mục profile của Huế thay vì TCT.
  - **Headed/headless**: Trình duyệt vẫn khởi chạy ở chế độ headed (`headless: false`).
  - **Browser launch**: Chromium cố gắng lock thư mục profile của Huế (`HUE.lock`).
  - **Lock/Session registry**: TCT cố gắng tranh chấp lock của Huế. Nếu Huế đang chạy ngầm hoặc file lock cũ của Huế chưa được dọn dẹp, Playwright sẽ ném lỗi tranh chấp tài nguyên `PROFILE_LOCKED` hoặc lỗi khởi động Chromium.
- **Vì sao browser không hiện**: Lỗi crash hoặc biệt lệ do tranh chấp khóa thư mục profile (`HUE.lock`) xảy ra ngay trong giai đoạn khởi chạy Chrome (`chromium.launchPersistentContext`), khiến browser kết thúc đột ngột trước khi kịp hiển thị giao diện headed.

---

## 3. ROUTE / API INVENTORY

### 3.1 Huế (HUE)
- **Login Endpoint**: Chưa có endpoint login độc lập riêng cho Huế. Cần bổ sung route `/dkcl/session/interactive-auth?source=HUE`.
- **Session Status Endpoint**: `/dkcl/session/preflight?source=HUE`.
- **Import Endpoint**: `/dkcl/hue/f13/backfill-queue` (nạp bù) và `/dkcl/hue/f13/sync` (nạp daily).
- **Frontend Caller**: `api.get` / `api.post` trong `DataImportCenter.jsx`.
- **Backend Route File**: `backend/src/routes/importRoutes.js`.
- **Handler File**: `backend/src/controllers/dkclHueF13SyncController.js` và `backend/src/controllers/dkclSharedOperationsController.js`.
- **Service File**: `backend/src/services/dkclHueF13SyncService.js` và `backend/src/services/dkclHueF13BackfillService.js`.
- **Response Shape hiện tại của preflight**:
  ```json
  {
    "success": true,
    "data": {
      "source": "HUE",
      "status": "SESSION_VALID"
    }
  }
  ```

### 3.2 TCT
- **Login Endpoint**: `/dkcl/session/interactive-auth?source=TCT` (Đã có).
- **Session Status Endpoint**: `/dkcl/session/preflight?source=TCT` (Đã có).
- **Import Endpoint**: `/dkcl/tct/f13/backfill-queue` (Đã có).
- **Frontend Caller**: `api.post` trong `DataImportCenter.jsx`.
- **Backend Route File**: `backend/src/routes/importRoutes.js`.
- **Handler File**: `backend/src/controllers/dkclSharedOperationsController.js`.
- **Service File**: `backend/src/services/tctF13BackfillService.js`.

### Kết luận:
- **Endpoint thiếu**: Route đăng nhập tương tác riêng cho Huế `/dkcl/session/interactive-auth?source=HUE`.
- **Endpoint tương thích ngược**: Các endpoint preflight `/dkcl/session/preflight` và các cổng nạp TCT phải được giữ nguyên chữ ký để đảm bảo tính tương thích ngược với luồng nghiệp vụ hiện tại.

---

## 4. CURRENT BROWSER / SESSION LIFECYCLE

- **Nơi tạo browser/client**: Khởi tạo động trong `DkclHueF13PortalClient.authenticate` hoặc `openInteractiveAuthentication`.
- **Nơi tạo persistent context/profile**: Gọi hàm `chromium.launchPersistentContext(this.profileDir, ...)` của Playwright.
- **Profile path**:
  - HUE: `../Data DKCL/BrowserProfiles/HUE`
  - TCT: `../Data DKCL/BrowserProfiles/TCT`
- **Browser Handle lưu ở đâu**: Lưu trong biến instance `this.context` và `this.page` thuộc `DkclHueF13PortalClient`.
- **Lock lưu ở đâu**: Thư mục khóa `.lock` được tạo song song với thư mục profile (`HUE.lock` hoặc `TCT.lock`).
- **Session validation**: Thực hiện qua hàm `isAuthenticated()` bằng cách kiểm tra text hiển thị trên body trang web VNPost.
- **Catch/finally cleanup**: Trong các hàm preflight, khối `finally` sẽ tự động gọi `client.close()` để kết thúc và hủy browser process lập tức.
- **Đóng thủ công**: Nếu user tắt cửa sổ headed browser bằng tay, Playwright disconnected nhưng backend chưa bắt được sự kiện này để đồng bộ state về `SESSION_EXPIRED`.
- **Xác nhận dùng chung**: Hiện tại Huế và TCT có nguy cơ dùng chung thư mục profile của Huế do lỗi bỏ qua cấu hình nguồn trong factory của phiên tương tác. Sau khi sửa đổi, cả hai sẽ hoạt động trên các profile và lock cô lập tuyệt đối, loại bỏ hoàn toàn rủi ro nhiễm chéo cookie/session.

---

## 5. TARGET STATE MACHINE

Mỗi nguồn dữ liệu sẽ duy trì một máy trạng thái độc lập được lưu vết trên Backend và đồng bộ về Frontend:

- **State Registry**: Lưu trữ tại `DkclSessionPreflightService.interactiveClients` (Registry Map theo dạng `source -> client`).
- **Key theo source**: Phân tách rõ ràng bằng `HUE` và `TCT`.
- **Trạng thái**:
  - `NOT_AUTHENTICATED`
  - `OPENING_BROWSER`
  - `WAITING_FOR_LOGIN`
  - `AUTHENTICATED`
  - `BACKGROUND_READY`
  - `SESSION_EXPIRED`
  - `ERROR`
- **Transition Trigger**:
  - `interactiveAuthenticate()` -> chuyển sang `OPENING_BROWSER`.
  - Browser launch thành công -> chuyển sang `WAITING_FOR_LOGIN`.
  - Đăng nhập thành công -> chuyển sang `AUTHENTICATED` -> `BACKGROUND_READY` (gọi minimize).
  - Sự kiện `context.on('close')` -> chuyển sang `SESSION_EXPIRED`.
- **Lock/Dedup Mechanism**: Sử dụng cờ khóa `isOpening[source] = true` để chặn mọi click mở browser trùng lặp từ frontend.
- **Disconnect Handler**: Lắng nghe trực tiếp sự kiện `page.on('close')` hoặc `context.on('close')` của Playwright để dọn dẹp handle, giải phóng file lock và thiết lập trạng thái về `SESSION_EXPIRED`.

---

## 6. IMPORT PREFLIGHT

- **Queue transition**: Queue chuyển sang `RUNNING` tại `DkclHueF13BackfillService.processQueue` (dòng 422) và `TctF13BackfillService.processQueue`.
- **Session check**: Hiện tại chỉ thực hiện kiểm tra ngầm lúc bắt đầu tác vụ nền trong `processQueueItem`.
- **Chặn trước RUNNING**:
  - Sửa đổi hàm `validateAuthenticationBeforeQueue()` của cả hai Backfill Service để gọi trực tiếp tới `sessionPreflightService.preflight(source)`.
  - Nếu kết quả preflight trả về trạng thái khác `SESSION_VALID`, backend sẽ ném ngay lỗi `AUTHENTICATION_REQUIRED` (HTTP 401), ngăn chặn việc chuyển trạng thái hàng đợi sang `RUNNING` và loại bỏ hoàn toàn nguy cơ sinh `FAILED` log giả.
- **Thông báo lỗi trả về frontend**:
  - Huế: `"Không thể nạp dữ liệu Huế. Phiên đăng nhập DKCL Huế không hợp lệ hoặc đã hết hạn. Vui lòng nhấn Đăng nhập Huế trước."`
  - TCT: `"Không thể nạp dữ liệu TCT. Phiên đăng nhập DKCL TCT không hợp lệ hoặc đã hết hạn. Vui lòng nhấn Đăng nhập TCT trước."`

---

## 7. MINIMIZE / HIDE DESIGN

- **Cơ chế hoạt động**: Playwright không hỗ trợ trực tiếp việc ẩn/minimize cửa sổ trình duyệtheaded sau khi mở. Do đó, ta thiết kế bộ chuyển đổi sử dụng giao thức CDP (Chrome DevTools Protocol) để gửi tín hiệu trực tiếp đến trình duyệt.
- **Cơ chế cụ thể trên Windows**: Gửi lệnh `Browser.setWindowBounds` với tham số `windowState: 'minimized'`.
- **Xác định đúng browser window**: CDP tự động ánh xạ thông qua `Browser.getWindowForTarget` của page context hiện tại, tránh nhầm lẫn giữa các tiến trình chạy song song.
- **Phương án chính**: `minimize` (thu nhỏ xuống taskbar) là phương án chính để người dùng vẫn có thể click khôi phục khi cần thiết.
- **Fallback**: Nếu CDP trả về lỗi hoặc không hoạt động trên môi trường Windows cụ thể, client sẽ ghi nhận cảnh báo và duy trì cửa sổ headed bình thường, tuyệt đối không gọi `close()` để tránh làm chết session.
- **Unit test**: Mock hàm `page.context().newCDPSession` và kiểm tra lệnh send nhận đúng tham số `windowState: 'minimized'`.
- **AWAITING PO RUNTIME CHECK**: Hành vi thu nhỏ/ẩn thực tế trên máy trạm Windows của PO sẽ được đánh dấu là `AWAITING PO RUNTIME CHECK` để PO tự phối hợp nghiệm thu thực tế.

---

## 8. EXACT FILE PLAN

### 8.1 Backend Production
- [MODIFY] [dkclSessionPreflightService.js](file:///d:/Antigravity - Project/TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclSessionPreflightService.js):
  - Hàm thay đổi: `interactiveClientFactory`, `interactiveAuthenticate`, `preflight`.
  - Mục đích: Sửa lỗi nuốt cấu hình nguồn TCT, hỗ trợ quản lý trạng thái cô lập cho cả HUE và TCT.
- [MODIFY] [dkclHueF13PortalClient.js](file:///d:/Antigravity - Project/TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclHueF13PortalClient.js):
  - Hàm thay đổi: `constructor`, `acquireProfileLock`, `openInteractiveAuthentication`, `minimizeWindow`.
  - Mục đích: Định danh nguồn, cô lập lock file tránh tranh chấp, và tích hợp bộ chuyển đổi minimize CDP.
- [MODIFY] [dkclHueF13SyncService.js](file:///d:/Antigravity - Project/TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclHueF13SyncService.js):
  - Hàm thay đổi: `start`.
  - Mục đích: Tiếp nhận options và cờ `requireExistingSession` để chặn luồng tự động đăng nhập ngầm.
- [MODIFY] [dkclHueF13BackfillService.js](file:///d:/Antigravity - Project/TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/dkclHueF13BackfillService.js):
  - Hàm thay đổi: `validateAuthenticationBeforeQueue`.
  - Mục đích: Gọi preflight chặn hàng đợi trước khi bắt đầu chạy nếu thiếu session.
- [MODIFY] [tctF13BackfillService.js](file:///d:/Antigravity - Project/TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/backend/src/services/tctF13BackfillService.js):
  - Hàm thay đổi: `validateAuthenticationBeforeQueue`.
  - Mục đích: Đồng bộ hóa cơ chế chặn trước hàng đợi cho nguồn TCT.

### 8.2 Frontend Production
- [MODIFY] [DataImportCenter.jsx](file:///d:/Antigravity - Project/TTVH - He thong dieu hanh chat luong_worktree_da_impl_007/frontend/src/pages/DataImportCenter.jsx):
  - Thành phần thay đổi: Nút bấm Huế, trạng thái session, loading state.
  - Mục đích: Thêm nút `Đăng nhập Huế`, cô lập hoàn toàn trạng thái hiển thị của HUE và TCT, block Import Huế khi chưa có session.

### 8.3 Backend Tests
- `backend/test_dkclSessionPreflightService.js`
- `backend/test_dkclHueF13PortalClient.js`
- `backend/test_dkclHueF13BackfillService.js`
- `backend/test_tctF13BackfillService.js`

### 8.4 Frontend Tests
- `frontend/src/pages/dataImportCenter.test.js`

---

## 9. TEST MATRIX

- **`backend/test_dkclSessionPreflightService.js`**:
  - `Hue login preserves HUE source config`: Xác nhận Huế interactive login dùng đúng cấu hình HUE.
  - `TCT login preserves TCT source config`: Xác nhận TCT interactive login dùng đúng cấu hình TCT.
  - `headed launch config`: Xác nhận launch persistent context được gọi với cờ `headless: false`.
  - `valid session no relaunch`: Khi session đang hợp lệ, không kích hoạt mở browser mới.
  - `double-click dedup`: Yêu cầu đăng nhập trùng lặp bị chặn (deduplicated).
  - `disconnect updates source state`: Sự kiện đóng browser từ phía Playwright cập nhật trạng thái về `SESSION_EXPIRED`.
- **`backend/test_dkclHueF13PortalClient.js`**:
  - `success path no close/kill`: Xác nhận đăng nhập thành công không tự ý giải phóng browser context.
  - `authenticated invokes background adapter`: Đăng nhập thành công kích hoạt lệnh CDP minimize.
  - `HUE/TCT profile isolation`: Kiểm tra đường dẫn profile và lock của Huế/TCT cô lập độc lập.
- **`backend/test_dkclHueF13BackfillService.js`** & **`backend/test_tctF13BackfillService.js`**:
  - `import blocked before RUNNING`: Gọi nạp khi không có session bị chặn trước khi queue chuyển sang RUNNING.
  - `import does not invoke auth`: Bấm nạp dữ liệu không kích hoạt tự động mở browser ngầm.
  - `no fake FAILED log`: Không tạo các dòng log lỗi giả mạo khi bị chặn preflight.
- **`frontend/src/pages/dataImportCenter.test.js`**:
  - `independent frontend buttons/loading/status/errors`: Xác nhận giao diện hiển thị riêng biệt trạng thái và nút bấm đăng nhập cho HUE và TCT.
  - `polling cleanup`: Kiểm tra việc dọn dẹp các timer polling khi component unmount.
