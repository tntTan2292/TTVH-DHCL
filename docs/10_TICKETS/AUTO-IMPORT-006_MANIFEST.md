# AUTO-IMPORT-006 Manifest

- Ticket ID: `AUTO-IMPORT-006`
- Ticket Name: `Unified DKCL Authentication Lifecycle Recovery`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Current State: `ACTIVE / PO RECHECK`
- Technical Status: `PASS`
- Runtime Status: `AWAITING PO RECHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Current Phase: `REMEDIATION-003 / PO RECHECK`
- Last Reviewed Phase: `R2.2`
- Last Reviewed Commit: `220123d7defa040d340d39750b37b6cba3950301`
- Phase Review Status: `REVIEW PASS`
- Next Phase Authorization: `PO RUNTIME RECHECK GRANTED`
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

## Remediation 003 Review Alignment

### R2.1 Remediation A
- Initial attempt `7ac4fb3` was `REVIEW FAIL`.
- Actual root cause was a stale local backend returning `selectable:false`.
- Follow-up commit `3e3309bf959582c681f4a81f319f7128fcde7f87` wired production to the shared Hue selection helpers.
- Runtime DOM smoke confirmed checkbox selection and `Re-Update (1)`.
- No portal login or submission was performed.
- Review status: `REVIEW PASS`.

### R2.2 TCT Login Lifecycle
- Root cause was preflight collapsing an in-progress interactive session into expired/auth-required handling.
- Commit `220123d7defa040d340d39750b37b6cba3950301` adds `LOGIN_IN_PROGRESS`.
- Controller maps `LOGIN_IN_PROGRESS` to HTTP `202`.
- Polling preserves the client while interactive login is in progress.
- Duplicate authentication requests share one `openingPromise`.
- Frontend disables the login button and displays `Đang mở đăng nhập...`.
- Code review passed.
- Stable headed-browser behavior remains pending PO runtime verification.

## PO Runtime Recheck Checklist

### HUE
1. Restart backend from current HEAD.
2. Hard refresh `localhost:5178/import`.
3. Select one `COMPLETE` date.
4. Confirm checkbox remains checked.
5. Confirm `Re-Update (1)`.
6. Log in through `Mở đăng nhập Huế`.
7. Submit one controlled `Re-Update`.
8. Confirm queue/result without duplicates.

### TCT
1. Click `Mở đăng nhập TCT`.
2. Confirm one headed browser appears.
3. Confirm window does not flash, close, or reopen repeatedly.
4. Confirm UI displays `Đang mở đăng nhập...`.
5. Complete login manually.
6. Confirm browser minimizes after successful login.
7. Confirm UI becomes `SESSION_VALID`.
8. Select one `COMPLETE` date and run one controlled `Re-Update`.
9. Close the browser manually and confirm TCT becomes authentication-required again.
10. Confirm HUE state is unaffected.

### Responsive
- Zoom `100%`.
- Controls visible and usable.
- No page-level clipping.
