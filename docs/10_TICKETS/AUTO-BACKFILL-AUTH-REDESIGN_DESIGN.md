# AUTO-BACKFILL-AUTH-REDESIGN — Design Document

| Field | Value |
| --- | --- |
| Document type | `DESIGN ONLY — no code, no schema, no data changed by this document` |
| Status | `READY FOR CTO/PO REVIEW` |
| Author | `Claude Code (Opus 5)` |
| Date | `2026-08-24` |
| Scope | Toàn bộ luồng đăng nhập (auth) + xếp hàng (queue) + xử lý lỗi (error handling) của Auto Backfill |
| Supersedes | Không supersede gì. Đây là bản thiết kế cho các ticket thực thi sẽ được mở sau khi duyệt. |
| Prerequisite | Phải được CTO/PO duyệt trước khi mở bất kỳ ticket thực thi nào (Section 12). |

---

## 1. Vì sao cần bản thiết kế này

Từ `2026-08-20` đến `2026-08-24`, luồng Auto Backfill đã trải qua nhiều lượt vá nhỏ liên tiếp (`b2e8d759`, `6501bef5`, `16b1ecb7`, `fcfb512a`). Mỗi lượt vá đều đúng và đều được kiểm chứng, nhưng mỗi lần lại lòi ra một vấn đề mới ở tầng sâu hơn. Nguyên nhân: **các vấn đề này không độc lập** — chúng là triệu chứng của ba quyết định kiến trúc ban đầu:

1. **Một khoá tuần tự hoá duy nhất cho toàn hệ thống** (`GLOBAL_DKCL`), trong khi thực tế nghiệp vụ có **hai nguồn độc lập** (HUE, TCT) với **hai phiên đăng nhập tách biệt**.
2. **Trạng thái phiên đăng nhập chỉ có nhị phân**: `SESSION_VALID` hoặc "không hợp lệ" — không có khái niệm "đang trong quá trình đăng nhập".
3. **UI theo dõi một run tại một thời điểm**, trong khi backend cho phép nhiều run song song.

Vá thêm ở tầng ngọn sẽ tiếp tục sinh ra triệu chứng mới. Bản thiết kế này đề xuất sửa đúng ba quyết định trên, chia thành các ticket đủ nhỏ để review/test được.

### 1.1 Nguyên tắc thiết kế (ràng buộc tự đặt)

- **Không nới lỏng bất kỳ cơ chế an toàn nào đã được PO Gate 5 nghiệm thu.** Circuit breaker, completion policy, integrity guard giữ nguyên ngữ nghĩa; chỉ đổi *phạm vi áp dụng* từ toàn cục sang theo lane.
- **Ưu tiên phương án không đổi schema.** Đổi schema là rủi ro cao nhất trong hệ thống này (DB production 800 MB, dữ liệu nghiệp vụ thật).
- **Mỗi ticket phải tự đứng được**: có thể merge, chạy thật, và rollback độc lập.
- **Không sửa hành vi của `DataImportCenter.jsx`** (màn hình Import thủ công đang chạy ổn định) trừ khi bắt buộc.

---

## 2. Bản đồ 10 vấn đề → 6 nhóm thiết kế

| # | Vấn đề | Nhóm | Mức |
| --- | --- | --- | --- |
| 1 | Khoá toàn cục không phân biệt nguồn | **A** | P0 |
| 3 | Coordinator ngủ vô thời hạn khi có job WAITING_AUTH | **A** | P1 |
| 2 | `LOGIN_IN_PROGRESS`/`LOGIN_TIMEOUT` bị coi là lỗi xác thực cứng | **B** | P0 |
| 9 | Phiên hết hạn định kỳ, không cảnh báo trước | **B** | P2 |
| 4 | UI chỉ theo dõi 1 run; bulk tạo N run mồ côi | **C** | P1 |
| 5 | `runError` set nhưng không render | **C** | P1 |
| 6 | Profile dùng chung vĩnh viễn; không có nút đăng xuất; cửa sổ không tự ẩn lại | **D** | P2 |
| 7 | Bug `lockDir` xoá nhầm khoá của tiến trình khác | **D** | **P0 (an toàn)** |
| 8 | `EXPORT_TIMEOUT` không retry | **E** | P1 |
| 10 | Bulk reimport phải cho chọn chỉ tiêu | **F** | P2 (tính năng) |

---

## 3. [A] Kiến trúc khoá theo lane

### 3.1 Hiện trạng — ba điểm tuần tự hoá toàn cục chồng lên nhau

`backend/src/services/autoBackfillQueueStore.js:264-273` (`acquireNextJob`) có **ba** guard, tất cả đều toàn cục:

```
G1  SELECT * FROM auto_backfill_worker_lease WHERE lease_name = 'GLOBAL_DKCL'   -> có lease thì dừng
G2  SELECT id FROM auto_backfill_job WHERE state = 'RUNNING'                    -> có job chạy thì dừng
G3  SELECT id FROM auto_backfill_run
    WHERE status='RUNNING' AND safety_state IN ('WAITING_AUTH','BLOCKED_INTEGRITY')  -> dừng
```

Và **hai** ràng buộc cứng ở tầng schema (`backend/src/db/schema.sql:482, 509`):

```
uq_auto_backfill_one_running_job  ON auto_backfill_job((1)) WHERE state = 'RUNNING'
auto_backfill_worker_lease.lease_name TEXT PRIMARY KEY CHECK (lease_name = 'GLOBAL_DKCL')
```

`G3` là thủ phạm PO gặp: một run TCT `WAITING_AUTH` chặn mọi job HUE. `G1`/`G2` và hai ràng buộc schema là "chỉ một job chạy tại một thời điểm trên toàn hệ thống".

### 3.2 Phân tách hai khái niệm bị gộp nhầm

Thiết kế hiện tại gộp hai thứ khác nhau vào một khoá:

- **Tuần tự hoá thực thi** (chỉ một trình duyệt chạy một lúc) — có lý do chính đáng: giới hạn tài nguyên máy, tránh hai Playwright cùng ghi.
- **Chặn do chờ xác thực** (`WAITING_AUTH`) — hoàn toàn **không** cần toàn cục: phiên HUE và phiên TCT là hai phiên độc lập, hai thư mục profile riêng, đã có `SourceOperationLock` riêng cho từng nguồn (`dkclSessionPreflightService.js:80-108`).

**Đây là chỗ sửa gốc: tách `G3` (chặn vì chờ auth) ra khỏi `G1`/`G2` (tuần tự hoá thực thi).**

### 3.3 Hai phương án

#### Phương án A1 — "Lane-aware blocking, global serial execution" (ĐỀ XUẤT)

Giữ nguyên *một job chạy tại một thời điểm* (không đổi schema, không chạy hai trình duyệt song song), nhưng làm cho **việc chặn** biết phân biệt lane.

Thay đổi cụ thể:

1. **`acquireNextJob`** — bỏ `G3` như một guard chặn sớm, thay bằng một mệnh đề loại trừ lane ngay trong câu lệnh chọn job:

   ```
   ... WHERE j.state='QUEUED' AND r.status='RUNNING'
       AND (j.safety_state IS NULL OR (j.safety_state='RETRY_WAIT' AND j.next_attempt_at <= ?))
       AND (r.safety_state IS NULL OR r.safety_state='CIRCUIT_OPEN')
       AND j.source_lane NOT IN ( <truy vấn lane bị chặn, xem 3.4> )
   ```

   `G1`/`G2` giữ nguyên nguyên trạng.

2. **`getCoordinatorState`** (`autoBackfillQueueStore.js:906`) — trả thêm phân rã theo lane: `blockedLanes`, `eligibleJobCountByLane`. Các trường tổng hiện có giữ nguyên để không phá vỡ caller cũ.

3. **`nextPollDelay`** (`autoBackfillWorkerCoordinator.js:105`) — đổi `if (state.waitingAuthCount > 0) return null` thành: chỉ trả `null` khi **mọi** lane đều bị chặn. Nếu còn ít nhất một lane thông, tiếp tục lịch poll bình thường.

4. **`authenticationBlocked`** (`autoBackfillWorkerCoordinator.js:31, 82-84`) — hiện là cờ boolean toàn cục làm coordinator thoát hẳn drain loop. Đổi thành tập hợp các lane bị chặn; drain loop chỉ dừng khi tất cả lane đều trong tập đó.

**Ưu điểm quyết định:** không đổi schema, không đổi mô hình đồng thời, không đổi hành vi circuit breaker. Giải quyết trọn vẹn nỗi đau của PO (đăng nhập Huế không còn bị TCT chặn) với bề mặt rủi ro nhỏ nhất.

#### Phương án A2 — "Per-lane lease, true parallelism" (KHÔNG đề xuất làm ngay)

Cho HUE và TCT chạy song song thật sự: `lease_name` thành `LANE_HUE`/`LANE_TCT`, index `uq_auto_backfill_one_running_job` thành partial unique theo `source_lane`.

Bắt buộc đổi schema (2 migration), và mở ra rủi ro mới chưa được kiểm chứng: hai Playwright chạy đồng thời, `browserProcessManager` thao tác HWND cho hai profile cùng lúc, tải RAM/CPU trên máy PO. **Lợi ích tăng thêm so với A1 chỉ là tốc độ**, không giải quyết thêm vấn đề nào PO đang gặp.

**Khuyến nghị: làm A1. Ghi nhận A2 là hướng mở, chỉ cân nhắc nếu sau này tốc độ trở thành vấn đề thật.**

### 3.4 Điểm cần quyết định trong A1: "lane bị chặn" định nghĩa thế nào

`auto_backfill_run.requested_lane` có thể `NULL` (bốn run `CANCELLED` ngày 18-20/08 đều có `requested_lane = NULL`). Không thể dựa vào cột này.

**Đề xuất:** suy ra lane bị chặn từ **job**, không từ run:

```
SELECT DISTINCT j.source_lane
FROM auto_backfill_job j JOIN auto_backfill_run r ON r.id = j.run_id
WHERE r.status = 'RUNNING'
  AND j.safety_state IN ('WAITING_AUTH', 'BLOCKED_INTEGRITY')
```

Chính xác về ngữ nghĩa (job mới là thứ thật sự cần phiên đăng nhập của lane đó), và đúng với dữ liệu thật hiện có.

### 3.5 Danh sách đầy đủ chỗ phải sửa theo (A1)

| File | Vị trí | Sửa gì |
| --- | --- | --- |
| `autoBackfillQueueStore.js` | `acquireNextJob` (~264) | Bỏ guard `G3`, thêm mệnh đề loại trừ lane |
| `autoBackfillQueueStore.js` | `getCoordinatorState` (~906) | Thêm phân rã theo lane |
| `autoBackfillWorkerCoordinator.js` | `nextPollDelay` (~105) | Chỉ ngủ khi mọi lane bị chặn |
| `autoBackfillWorkerCoordinator.js` | `runDrainLoop` (~70-100), `wake` (~43) | `authenticationBlocked` boolean → tập hợp theo lane |
| `test_autoBackfillQueueService.js` | — | Cập nhật/bổ sung test cho ngữ nghĩa mới |
| `test_autoBackfillSafety.js` | — | **Phải xác nhận 11/11 vẫn PASS** (đây là suite Gate 5) |

**Không** phải sửa: `renewLease`, `completeLeasedJob`, `failLeasedJob`, `recoverInterruptedWork` — chúng tham chiếu `GLOBAL_DKCL` như tên khoá thực thi, và A1 giữ nguyên khoá đó.

### 3.6 Đánh giá A

| Tiêu chí | A1 (đề xuất) | A2 |
| --- | --- | --- |
| Rủi ro | **Vừa** | Cao |
| Phức tạp | Vừa | Cao |
| Đổi schema DB | **Không** | Có (2 migration) |
| Ảnh hưởng `DataImportCenter.jsx` | Không | Không trực tiếp |
| Rủi ro chính | Sai sót logic loại trừ lane → job không bao giờ được chọn (queue chết im lặng). Bắt buộc có test cho trường hợp "một lane chặn, lane kia vẫn chạy" | Hai trình duyệt đồng thời — chưa từng chạy thật |

---

## 4. [B] Phân biệt "đang chờ" với "lỗi xác thực thật"

### 4.1 Hiện trạng

`dkclSessionPreflightService.js:18-27` đã định nghĩa **5** trạng thái: `SESSION_VALID`, `AUTHENTICATION_REQUIRED`, `SESSION_CHECK_FAILED`, `LOGIN_IN_PROGRESS`, `LOGIN_TIMEOUT`.

Nhưng `autoBackfillF13Executors.js:66-72` bóp cả 5 về nhị phân:

```
const preflight = await this.sessionPreflightService.preflight(...);
if (preflight?.status !== 'SESSION_VALID') {
    throw authenticationError(this.identity.sourceLane, preflight);   // -> code 'AUTHENTICATION_REQUIRED'
}
```

Hậu quả dây chuyền: `AUTHENTICATION_REQUIRED` → `DEFAULT_ERROR_MAP` (`importIndicatorRegistry.js:30`) → class `AUTHENTICATION` → nằm trong `terminalClasses` → job vào `WAITING_AUTH` → chặn lane (và trước A1 là chặn toàn hệ thống). **Chỉ vì PO đang mở cửa sổ đăng nhập.**

Bằng chứng thời gian đã ghi nhận: hai lần fail ở `08:10:14.893→.905` (12 ms) và `07:45:00.976→.018` (42 ms) — quá nhanh để có thể khởi động Playwright, chỉ có thể là nhánh trả về từ registry in-memory (`preflight` dòng 432-441, 448-466).

### 4.2 Đề xuất — ba nhóm kết quả, xuyên suốt 4 tầng

Định nghĩa một phân loại duy nhất, dùng chung từ executor tới UI:

| Nhóm | Trạng thái preflight | Ý nghĩa | Job đi về đâu |
| --- | --- | --- | --- |
| **READY** | `SESSION_VALID` | Chạy được ngay | Thực thi |
| **PENDING** | `LOGIN_IN_PROGRESS`, `LOGIN_TIMEOUT` | Con người đang xử lý, chưa kết luận được | **`RETRY_WAIT`** — trả job về hàng đợi, thử lại sau, **không** đụng `safety_state` của run |
| **BLOCKED** | `AUTHENTICATION_REQUIRED`, `SESSION_CHECK_FAILED` | Thật sự cần người đăng nhập | `WAITING_AUTH` như hiện nay |

Thay đổi theo tầng:

1. **Executor** (`autoBackfillF13Executors.js:66`): `validateSession()` phân loại theo bảng trên. Với PENDING, ném một error mang `error.autoBackfill = { classification: 'TRANSIENT' }` và code riêng `SESSION_PENDING_HUMAN_ACTION` — tận dụng đúng cơ chế retry sẵn có, không phát minh cơ chế mới.
2. **Registry** (`importIndicatorRegistry.js:29`): thêm `SESSION_PENDING_HUMAN_ACTION: 'TRANSIENT'` vào `DEFAULT_ERROR_MAP`.
3. **Retry policy**: PENDING cần backoff **dài** (người đăng nhập mất vài phút), không phải 2s/4s/8s. Xem Section 7.2 — dùng chung cơ chế backoff theo mã lỗi với `EXPORT_TIMEOUT`.
4. **UI**: banner phân biệt rõ ba nhóm — "Đang chờ bạn đăng nhập…" (PENDING, màu xanh, không phải lỗi) vs "Cần đăng nhập thủ công" (BLOCKED, màu hổ phách, có nút hành động). Phần này đã được vá đúng hướng ở `16b1ecb7`/`fcfb512a` cho một số trường hợp; ticket này chuẩn hoá lại toàn bộ.

### 4.3 Vấn đề 9 — phiên hết hạn định kỳ

Hiện chưa có dữ liệu về thời gian sống thực tế của phiên DKCL. **Không đoán.** Đề xuất một bước đo trước:

- Ghi log có timestamp mỗi lần preflight chuyển `SESSION_VALID → AUTHENTICATION_REQUIRED` cho từng lane, kèm khoảng cách tới lần đăng nhập thành công gần nhất.
- Sau khoảng 1-2 tuần vận hành thật, đọc lại để rút ra chu kỳ.
- Chỉ khi có số liệu mới thiết kế cảnh báo trước ("phiên HUE sẽ hết hạn sau khoảng X phút").

Đây là lý do vấn đề 9 được xếp P2 và tách thành ticket đo lường riêng, không gộp vào ticket sửa logic.

### 4.4 Đánh giá B

| Tiêu chí | Giá trị |
| --- | --- |
| Rủi ro | **Vừa** |
| Phức tạp | Vừa |
| Đổi schema DB | Không (`RETRY_WAIT` và `next_attempt_at` đã tồn tại) |
| Ảnh hưởng `DataImportCenter.jsx` | **Có, gián tiếp** — dùng chung `POST /import/dkcl/session/preflight`. Thiết kế **không đổi** hợp đồng response của endpoint này; chỉ đổi cách Auto Backfill *diễn giải* nó. Cần test hồi quy `DataImportCenter.jsx`. |
| Rủi ro chính | Nếu backoff PENDING quá ngắn, job quay vòng liên tục, tốn tài nguyên. Nếu quá dài, PO đăng nhập xong phải chờ lâu → cần gọi `notifyWorkAvailable` ngay khi preflight chuyển sang `SESSION_VALID` |

---

## 5. [C] UI đa-run

### 5.1 Hiện trạng

- `AutoBackfillOperatorPanel.jsx` bám **một** `activeRunId` (dòng 77). Run đang chặn hệ thống có thể hoàn toàn vô hình với PO — đúng tình huống ngày 22/08 khi `ac86f34f` chặn cả 4 run.
- **Không tồn tại API liệt kê run.** `importRoutes.js:18-28` chỉ có `GET /auto-backfill/runs/:runId`. Đây là chặn cứng cho bất kỳ màn hình đa-run nào.
- `runError` khai báo ở dòng 80, chỉ xuất hiện trong các lời gọi `setRunError(...)`, **không có JSX nào đọc** → mọi lỗi Pause/Resume/Reset bị nuốt câm.
- Bulk reimport (dòng ~605-627) gọi `POST /auto-backfill/runs` **một lần cho mỗi ngày** → N run riêng biệt, rồi chỉ giữ lại run đầu tiên.

### 5.2 Đề xuất

**C1 — API mới `GET /api/import/auto-backfill/runs`**

Query params: `status` (mặc định: các run đang mở), `limit`, `offset`. Response mỗi run gồm: `id`, `status`, `safety_state`, `requested_indicator`, `requested_lane`, tổng hợp số job theo trạng thái, `created_at`, `updated_at`, và **`blocking_lanes`** (lane nào đang bị run này chặn — tính từ cùng truy vấn ở Section 3.4).

Quyền: `requireAuth` cho đọc, giữ nguyên `adminOnly` cho hành động — nhất quán với các route hiện có.

**C2 — Bảng "Tất cả tiến trình đang mở"**

Đặt ngay trên panel run hiện tại. Mỗi dòng: mã run rút gọn, chỉ tiêu/nguồn, trạng thái, số job, và **cờ đỏ rõ ràng "Đang chặn nguồn HUE"** khi có `blocking_lanes`. Nút "Mở đăng nhập" và "Tiếp tục Run" đặt **ngay trên dòng đó**, không bắt PO phải chuyển run thủ công. Click một dòng → panel chi tiết bên dưới đổi theo.

**C3 — Render `runError`**

Thêm khối lỗi ngay dưới hàng nút hành động, cùng kiểu với `authLoginError` đã có (dòng 909-913). Tự xoá khi hành động sau thành công. Đây là sửa nhỏ nhất trong toàn bộ tài liệu này nhưng giá trị chẩn đoán cao nhất.

**C4 — Gộp bulk thành một run**

`createRun` **đã** hỗ trợ nhiều job trong một run (`autoBackfillQueueService.js:100-150`, tham số `fromDate`/`toDate`). Hai trường hợp:

- **Ngày liên tục:** gọi một lần với `fromDate`/`toDate` → **sửa frontend, không đụng backend**.
- **Ngày rời rạc** (PO tick lẻ tẻ): cần thêm tham số `businessDates: string[]` vào `POST /auto-backfill/runs` → **có đụng backend**, nhưng chỉ là thêm một bộ lọc trong `createRun`, không đổi schema.

Đề xuất làm cả hai, ưu tiên `businessDates[]` vì đúng với cách PO thao tác thật.

Lưu ý ràng buộc sẵn có: `uq_auto_backfill_active_request ON auto_backfill_run(request_key) WHERE status IN ('RUNNING','PAUSING','PAUSED')` — gộp bulk thành một run làm `request_key` đổi, cần xác nhận không phá vỡ chống-trùng. (Quan sát thực tế: `3e29bd2e` và `2d817c59` có cùng `request_key` `7923d269…`, tạo lại được vì run trước đã `COMPLETED_WITH_ERRORS` — index hoạt động đúng thiết kế.)

### 5.3 Đánh giá C

| Tiêu chí | C1+C2 | C3 | C4 |
| --- | --- | --- | --- |
| Rủi ro | Thấp | **Rất thấp** | Vừa |
| Phức tạp | Vừa | Rất nhỏ | Vừa |
| Đổi schema DB | Không | Không | Không |
| Ảnh hưởng `DataImportCenter.jsx` | Có (panel nhúng ở dòng 852) — chỉ về bố cục/chiều cao, không về logic | Không | Không |
| Rủi ro chính | Chỉ thêm mới, không đổi đường đã chạy | Gần như không có | Đổi hành vi tạo run — cần test kỹ chống-trùng |

---

## 6. [D] Bug `lockDir` và vệ sinh phiên trình duyệt

### 6.1 Bug 7 — nghiêm trọng nhất về mặt an toàn

`dkclHueF13PortalClient.js:168-179`:

```
acquireProfileLock() {
    ...
    this.lockDir = `${this.profileDir}.lock`;     // <-- GÁN TRƯỚC
    try {
        this.fs.mkdirSync(this.lockDir);          // <-- có thể ném EEXIST
    } catch (error) {
        if (error.code === 'EEXIST') {
            throw portalError('... already in use.', 'PROFILE_LOCKED');   // this.lockDir VẪN được gán
        }
        throw error;
    }
}
```

`close()` (dòng 181-193) sau đó xoá vô điều kiện:

```
if (this.lockDir && this.fs.existsSync(this.lockDir)) {
    this.fs.rmSync(this.lockDir, { recursive: true, force: true });
}
```

`preflight()` gọi `close()` trong `finally` (`dkclSessionPreflightService.js:585-589`). Kết quả: một client **thất bại vì khoá đã bị chiếm** vẫn đi xoá đúng cái khoá của tiến trình đang giữ phiên sống. Lần mở tiếp theo có thể khởi động Chromium thứ hai trên cùng thư mục profile đang mở → nguy cơ hỏng `Cookies`/`Preferences`.

Đây chính là lý do đề xuất tự động hoá việc giải phóng `WAITING_AUTH` qua script riêng đã bị từ chối ở lượt trước.

### 6.2 Đề xuất D1 — sửa quyền sở hữu khoá (bắt buộc, làm sớm)

Chỉ xoá khoá mà **chính client này** đã tạo thành công:

```
acquireProfileLock() {
    const candidate = `${this.profileDir}.lock`;
    this.fs.mkdirSync(this.path.dirname(this.profileDir), { recursive: true });
    try {
        this.fs.mkdirSync(candidate);
    } catch (error) {
        if (error.code === 'EEXIST') throw portalError('... already in use.', 'PROFILE_LOCKED');
        throw error;
    }
    this.lockDir = candidate;      // <-- CHỈ gán SAU KHI mkdirSync thành công
    this.ownsLock = true;
}
```

và `close()` thêm điều kiện `this.ownsLock`.

Không phá vỡ hành vi hiện có: đường thành công không đổi một chút nào; chỉ đường thất bại `PROFILE_LOCKED` ngừng gây tác hại.

**Bổ sung cần thiết:** hiện có hai thư mục khoá mồ côi trong workspace (`Data DKCL/BrowserProfiles/HUE.lock`, `TCT.lock`). Sau khi sửa, cần một cơ chế dọn khoá cũ **an toàn** — chỉ xoá khi đã xác minh không có tiến trình nào đang dùng profile đó (`browserProcessManager.findBrowserProcessByProfile` đã có sẵn năng lực này).

### 6.3 Đề xuất D2 — nút "Đăng xuất / Xoá phiên" theo nguồn

Profile hiện là thư mục cố định vĩnh viễn (`dkclSessionPreflightService.js:47-59`), nạp qua `chromium.launchPersistentContext`, **không có chỗ nào xoá cookie/session**. Đây là **thiết kế cố ý** (giữ phiên để khỏi đăng nhập lại) và HUE/TCT đã tách thư mục đúng — không có rò rỉ chéo giữa hai nguồn. Cái thiếu chỉ là **đường thoát**: khi phiên hỏng hoặc nhầm tài khoản, PO không có cách nào dọn ngoài việc xoá thư mục thủ công.

Đề xuất: endpoint `POST /import/dkcl/session/reset` nhận `source`, thực hiện đóng client, xác minh không còn tiến trình, rồi xoá **chỉ** phần dữ liệu phiên (`Default/Network/Cookies`, `Default/Local Storage`), giữ lại phần còn lại của profile. Nút tương ứng trên UI, có xác nhận hai bước.

### 6.4 Đề xuất D3 — cửa sổ không tự ẩn lại

`reuseInteractiveClient()` (`dkclSessionPreflightService.js:239-263`) gọi `restoreWindow()` rồi trả về ngay — không có background task nên `hideWindow()` không bao giờ được gọi lại. Đề xuất: sau khi `restoreWindow()` thành công, khởi tạo lại đúng background wait task như đường mở mới, để `hideWindow()` chạy khi phát hiện đã đăng nhập.

### 6.5 Đánh giá D

| Tiêu chí | D1 | D2 | D3 |
| --- | --- | --- | --- |
| Rủi ro | **Thấp** | Vừa | Vừa |
| Phức tạp | **Rất nhỏ** | Vừa | Vừa |
| Đổi schema DB | Không | Không | Không |
| Ảnh hưởng `DataImportCenter.jsx` | Không | **Có** — thêm endpoint mới, nên thêm nút ở cả hai màn hình | **Có** — dùng chung `interactive-auth` |
| Ghi chú | Nên làm **trước tiên** — nó gỡ chặn cho mọi việc tự động hoá sau này | Cần PO xác nhận có muốn tính năng này | Cần chứng cứ runtime (Antigravity) để nghiệm thu |

---

## 7. [E] Retry có giới hạn cho `EXPORT_TIMEOUT`

### 7.1 Hiện trạng — mã lỗi bị mất trên đường đi

Lỗi gốc được ném đúng và có mã riêng (`dkclHueF13SyncService.js:352`):

```
throw createTimeoutError('Timed out waiting for generated DKCL F1.3 detail export.', 'EXPORT_TIMEOUT');
```

Nhưng handler thất bại (`dkclHueF13SyncService.js:416-422`) chỉ lưu `safeErrorMessage`, **không lưu `error.code`**. Sau đó `awaitHueResult` (`autoBackfillF13Executors.js:113`) chỉ đọc được `run.status === 'FAILED'` và ném lại với code `'FAILED'`.

`'FAILED'` không có trong `DEFAULT_ERROR_MAP` → mặc định class `SYSTEM` → nằm trong `terminalClasses` → `FAILED_TERMINAL`, không retry.

Khớp chính xác với dữ liệu thật: job `9ead9637` (22/08 HUE) và `1bc3fe66` (19/08 HUE) đều có `error_signature = FAILED:ce6aca9ea8d2dd39`, `classification = SYSTEM`, đều chạy đúng khoảng 15 phút — bằng `generationTimeoutMs` mặc định 900000 ms (`dkclHueF13SyncService.js:36`).

**Kết luận: đây không phải "quyết định không retry", mà là mã lỗi bị đánh rơi.** Sửa đúng chỗ này thì cơ chế retry sẵn có tự hoạt động.

### 7.2 Đề xuất

1. **Giữ mã lỗi:** `updateRun` khi thất bại lưu thêm `errorCode: error.code`; `awaitHueResult` ném lại bằng `run.errorCode || status`.
2. **Phân loại lại:** thêm `EXPORT_TIMEOUT: 'TRANSIENT'` vào `DEFAULT_ERROR_MAP`.
3. **Backoff riêng cho lỗi chậm:** backoff hiện tại (`autoBackfillSafetyCoordinator.js:94-98`) là 2s → 4s → 8s, vô nghĩa với cổng vừa mất 15 phút. Đề xuất backoff theo mã lỗi:

   | Mã lỗi | Số lần thử tối đa | Giãn cách |
   | --- | --- | --- |
   | `EXPORT_TIMEOUT` | **3** (1 lần đầu + 2 lần lại) | **5 phút → 15 phút** |
   | `SESSION_PENDING_HUMAN_ACTION` (từ Section 4) | **20** | **30 giây**, cộng đánh thức ngay khi preflight thành công |
   | Các `TRANSIENT` khác | 3 (giữ nguyên) | 2s → 4s → 8s (giữ nguyên) |

4. **Ngưỡng dừng thật:** hết số lần → `FAILED_TERMINAL` như hiện nay, kèm `action_required` nói rõ **"Cổng DKCL không xuất được báo cáo sau 3 lần thử trong khoảng 35 phút — nhiều khả năng do phía cổng, thử lại vào giờ khác"** thay vì thông báo chung chung. Circuit breaker (`threshold: 5`, cùng signature liên tiếp) vẫn hoạt động phía trên như lưới an toàn thứ hai — **không đổi**.

**Quan trọng:** tổng thời gian xấu nhất cho một job trở thành khoảng 15 + 5 + 15 + 15 + 15 ≈ 65 phút. Cần PO xác nhận đây là chấp nhận được, hoặc giảm `generationTimeoutMs`.

### 7.3 Đánh giá E

| Tiêu chí | Giá trị |
| --- | --- |
| Rủi ro | **Vừa** |
| Phức tạp | Vừa |
| Đổi schema DB | Không (`next_attempt_at`, `RETRY_WAIT` đã có) |
| Ảnh hưởng `DataImportCenter.jsx` | **Có** — `dkclHueF13SyncService` dùng chung cho Import thủ công. Thay đổi ở mục 1 (lưu `errorCode`) là **thêm trường**, không đổi trường cũ → rủi ro thấp, nhưng phải test hồi quy Import thủ công. |
| Rủi ro chính | Retry nghĩa là mở lại trình duyệt và tải lại cổng — phải chắc chắn không tạo file trùng hoặc ghi trùng vào `fact_f13`. `completionPolicy` kiểm tra trước khi thực thi (`processNext`, kiểm tra `SKIPPED_ALREADY_SUCCESS`) đã bảo vệ điều này; cần test khẳng định. |

---

## 8. [F] Bulk reimport chọn chỉ tiêu

### 8.1 Hiện trạng

Backend **đã** hỗ trợ: `createRun({ indicator, lane, fromDate, toDate })` (`autoBackfillQueueService.js:100`). Frontend bulk (`AutoBackfillOperatorPanel.jsx:586-627`) xây payload từ từng item đã tick, mỗi item mang sẵn `indicator` riêng — nên trên thực tế nó **không** nạp bù tất cả chỉ tiêu, mà nạp đúng những gì PO đã tick.

Vấn đề thật là **về trải nghiệm**: PO tick theo lưới ngày và không thấy rõ mình đang tick chỉ tiêu nào; modal xác nhận (dòng ~1367-1388) chỉ liệt kê ngày, **không hiển thị chỉ tiêu**.

### 8.2 Đề xuất

1. **Bộ lọc chỉ tiêu tường minh** phía trên vùng chọn: `F1.3` / `F4.1` / `Tất cả`, mặc định là chỉ tiêu PO đang xem.
2. **Modal xác nhận hiển thị nhóm theo chỉ tiêu × nguồn**, ví dụ: "F1.3 · HUE: 3 ngày", "F4.1 · TCT: 1 ngày" — trước khi PO bấm xác nhận.
3. **Chặn chọn lẫn chỉ tiêu ngoài ý muốn:** nếu lựa chọn hiện tại trải trên nhiều chỉ tiêu, hiện cảnh báo yêu cầu xác nhận thêm.

Kết hợp với C4 (gộp thành một run), luồng cuối: PO chọn chỉ tiêu → tick ngày → xem lại bảng nhóm → tạo **một** run duy nhất.

### 8.3 Đánh giá F

| Tiêu chí | Giá trị |
| --- | --- |
| Rủi ro | **Thấp** |
| Phức tạp | Nhỏ–Vừa |
| Đổi schema DB | Không |
| Ảnh hưởng `DataImportCenter.jsx` | Không |
| Phụ thuộc | Nên làm **sau** C4 để tránh sửa cùng một đoạn code hai lần |

---

## 9. [G] Bảng tổng hợp rủi ro và thứ tự

| Nhóm | Rủi ro | Phức tạp | Schema | Ảnh hưởng `DataImportCenter.jsx` | Phụ thuộc |
| --- | --- | --- | --- | --- | --- |
| **D1** — sửa bug `lockDir` | Thấp | Rất nhỏ | Không | Không | — |
| **C3** — render `runError` | Rất thấp | Rất nhỏ | Không | Không | — |
| **A1** — khoá theo lane | Vừa | Vừa | **Không** | Không | — |
| **E** — retry `EXPORT_TIMEOUT` | Vừa | Vừa | Không | Có (test hồi quy) | — |
| **B** — PENDING vs BLOCKED | Vừa | Vừa | Không | Có (dùng chung preflight) | A1, E (dùng chung backoff) |
| **C1+C2** — UI đa-run | Thấp | Vừa | Không | Có (bố cục) | A1 (cần biết lane bị chặn) |
| **C4** — gộp bulk | Vừa | Vừa | Không | Không | — |
| **F** — chọn chỉ tiêu | Thấp | Nhỏ | Không | Không | C4 |
| **D2** — nút xoá phiên | Vừa | Vừa | Không | Có | D1 |
| **D3** — tự ẩn cửa sổ | Vừa | Vừa | Không | Có | D1 |
| **B-9** — đo chu kỳ phiên | Thấp | Nhỏ | Không | Không | B |
| **A2** — song song thật | Cao | Cao | **Có (2 migration)** | Không | A1 — chỉ nếu cần tốc độ |

**Không nhóm nào bắt buộc đổi schema, ngoại trừ A2 — đã được đề xuất KHÔNG làm.** Đây là kết quả thiết kế quan trọng nhất của tài liệu này.

### 9.1 Thứ tự đề xuất và lý do

1. **D1** trước tiên — nó là bug an toàn, và đang chặn khả năng tự động hoá/chẩn đoán của mọi việc còn lại.
2. **C3** ngay sau — chi phí gần bằng không, nhưng từ đó mọi lỗi về sau đều nhìn thấy được thay vì phải đọc DB.
3. **A1** — giải quyết nỗi đau lớn nhất của PO.
4. **E** — biến lỗi cổng DKCL từ "phải can thiệp tay mỗi lần" thành tự phục hồi.
5. **B** — cần A1 đã ổn định để đo được tác động thật.
6. **C1+C2** — cần A1 để biết lane nào đang bị chặn.
7. **C4 → F** — nhóm tính năng, làm sau khi nền đã ổn.
8. **D2, D3, B-9** — tiện ích/đo lường, làm cuối.

---

## 10. [H] Chia thành ticket thực thi

Đề xuất **9 ticket chính**, mỗi ticket một commit, tự đứng được, rollback độc lập.

| Ticket | Nội dung | Phạm vi file | PO UI Check |
| --- | --- | --- | --- |
| **AB-AUTH-01** | Sửa bug `lockDir` (D1) + dọn khoá mồ côi an toàn | `dkclHueF13PortalClient.js`, `browserProcessManager.js` + test | Không (backend) |
| **AB-AUTH-02** | Render `runError` (C3) | `AutoBackfillOperatorPanel.jsx` + test | **Có** |
| **AB-AUTH-03** | Khoá theo lane (A1) | `autoBackfillQueueStore.js`, `autoBackfillWorkerCoordinator.js` + 2 test suite | Không (nhưng cần PO chạy thật để nghiệm thu) |
| **AB-AUTH-04** | Giữ mã lỗi + retry `EXPORT_TIMEOUT` (E) | `dkclHueF13SyncService.js`, `autoBackfillF13Executors.js`, `importIndicatorRegistry.js`, `autoBackfillSafetyCoordinator.js` + test | Không |
| **AB-AUTH-05** | PENDING vs BLOCKED xuyên tầng (B) | Executor + registry + UI banner + test | **Có** |
| **AB-AUTH-06** | API `GET /auto-backfill/runs` (C1) | `importRoutes.js`, `autoBackfillQueueController.js`, `autoBackfillQueueService.js` + test | Không |
| **AB-AUTH-07** | Bảng đa-run + nút hành động tại chỗ (C2) | `AutoBackfillOperatorPanel.jsx` + test | **Có** |
| **AB-AUTH-08** | Gộp bulk thành một run + `businessDates[]` (C4) | `autoBackfillQueueService.js`, `AutoBackfillOperatorPanel.jsx` + test | **Có** |
| **AB-AUTH-09** | Bộ lọc chỉ tiêu cho bulk (F) | `AutoBackfillOperatorPanel.jsx` + test | **Có** |

**Nhóm tuỳ chọn, chỉ mở nếu PO xác nhận muốn:**

| Ticket | Nội dung | Điều kiện |
| --- | --- | --- |
| **AB-AUTH-10** | Nút "Đăng xuất / Xoá phiên" (D2) | PO xác nhận cần tính năng |
| **AB-AUTH-11** | Tự ẩn cửa sổ khi tái dùng client (D3) | Cần Antigravity cung cấp chứng cứ runtime HWND |
| **AB-AUTH-12** | Đo chu kỳ sống của phiên (B-9) | Sau AB-AUTH-05, chạy thật 1-2 tuần |

### 10.1 Ràng buộc chung cho mọi ticket

- `test_autoBackfillSafety.js` (**suite Gate 5**) phải PASS 11/11 sau mỗi ticket. Bất kỳ thay đổi nào cần sửa suite này là dấu hiệu đã nới lỏng an toàn → dừng, báo cáo, không tự quyết.
- `npm run build` + `oxlint` + toàn bộ test suite frontend phải PASS.
- Ticket chạm `dkclHueF13SyncService.js` hoặc endpoint `dkcl/session/*` phải test hồi quy `DataImportCenter.jsx`.
- Không ticket nào được tự đăng nhập thật hoặc tự tạo run — nghiệm thu runtime thuộc về PO.

---

## 11. Ngoài phạm vi (KHÔNG làm trong chương trình này)

- **A2 — song song hai lane thật sự.** Ghi nhận là hướng mở, không làm.
- **Đổi schema `auto_backfill_*`.** Không cần thiết cho bất kỳ mục nào ngoài A2.
- **Sửa lỗi phía cổng DKCL.** Ngoài tầm kiểm soát; chỉ cải thiện cách hệ thống phản ứng (E).
- **Đổi `completionPolicy`, `circuitScope`, ngưỡng circuit breaker.** Đã qua PO Gate 5, giữ nguyên.
- **Thiết kế lại màn hình Import thủ công (`DataImportCenter.jsx`).** Chỉ đụng khi bắt buộc.

---

## 12. Câu hỏi cần CTO/PO quyết trước khi mở ticket

1. **Chốt A1 thay vì A2?** (Đề xuất: có — A1 giải quyết trọn nỗi đau, không đổi schema, rủi ro thấp hơn hẳn.)
2. **Chấp nhận thời gian xấu nhất khoảng 65 phút cho một job gặp `EXPORT_TIMEOUT` liên tiếp** (Section 7.2), hay muốn giảm `generationTimeoutMs` từ 15 phút xuống?
3. **Có muốn tính năng "Đăng xuất / Xoá phiên" (D2) không?** Nếu không, bỏ AB-AUTH-10.
4. **Thứ tự có đúng ưu tiên của PO không?** Cụ thể: AB-AUTH-03 (hết bị TCT chặn) có nên làm trước AB-AUTH-02 (hiện lỗi) không? (Đề xuất giữ nguyên thứ tự vì AB-AUTH-02 gần như không rủi ro và giúp chẩn đoán chính AB-AUTH-03.)
5. **Có mở toàn bộ 9 ticket một lượt, hay duyệt từng cụm** (ví dụ 01-04 trước, đánh giá, rồi mới 05-09)?

---

## 13. Trạng thái

`READY FOR CTO/PO REVIEW` — chưa có dòng code nào được viết, chưa có ticket nào được mở, chưa có thay đổi nào lên database hay cấu hình. Chờ duyệt bản thiết kế và các quyết định ở Section 12.
