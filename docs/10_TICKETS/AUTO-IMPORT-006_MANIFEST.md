# AUTO-IMPORT-006 Manifest

- Ticket ID: `AUTO-IMPORT-006`
- Ticket Name: `Unified DKCL Authentication Lifecycle Recovery`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Current State: `ACTIVE / AWAITING REVIEW`
- Technical Status: `PASS`
- Runtime Status: `AWAITING CHIEF ARCHITECT REVIEW / PO RECHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`
- Current Phase: `REMEDIATION-005B / AWAITING REVIEW`
- Last Reviewed Phase: `R4.1B`
- Last Reviewed Commit: `58fb723e9c5eeb82f17b75d14b7662c3503ee262`
- Phase Review Status: `AWAITING REVIEW`
- Next Phase Authorization: `PO RUNTIME RECHECK GRANTED`
- Activation date: `2026-07-22`
- Primary executor: `Antigravity`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. `docs/10_TICKETS/AUTO-IMPORT-006_MANIFEST.md`
4. `docs/06_REVIEWS/Import/AUTO-IMPORT-006_CHECKPOINT_008.md`

Current checkpoint: `docs/06_REVIEWS/Import/AUTO-IMPORT-006_CHECKPOINT_008.md`

## Approved Scope
- Bổ sung nút `Đăng nhập Huế` trên giao diện nạp dữ liệu.
- Sửa lỗi nút `Đăng nhập TCT` không hiển thị trình duyệt Playwright.
- Đồng bộ hóa vòng đời trình duyệt: visible during manual login → native browser window hidden after `SESSION_VALID` → browser process and persistent session continue running in background.
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

## Remediation 004 Review Alignment

### R4.1
- Commit `8c22374...` was `REVIEW FAIL`.

### R4.1A
- Commit `dd0d9f94...` was `REVIEW FAIL`.

### R4.1B
- Commit `58fb723e9c5eeb82f17b75d14b7662c3503ee262` was `REVIEW PASS`.
- Browser profile state follows the five-state profile classification contract.
- `interactiveAuthenticate()` and `recover()` use `_classifyLockState()`.
- There is no `terminateProcessTree()` call in `interactiveAuthenticate()` or `recover()`.
- Cleanup is allowed only for `STALE_CONFIRMED`.
- Runtime port for PO recheck is `5178`.
- PO login failure for HUE and TCT remains pending PO runtime recheck.
- Ticket cannot be completed without explicit PO PASS.

## Remediation 005 Technical Handoff

- Baseline remote HEAD: `1f55576f229606024f1c6843ad1005d948a870d2`.
- Prior reviewed code commit: `58fb723e9c5eeb82f17b75d14b7662c3503ee262`.
- HUE PO login opened but did not minimize and did not reach `SESSION_VALID`; HUE completion now accepts a confirmed authenticated marker without requiring the TCT report-ready select marker.
- HUE/TCT minimize now tracks attempted versus successful minimize and does not invalidate a valid session when minimize fails.
- TCT successful downloads are retained in `Processed/TCT`; local workbook evidence is not deleted after successful import.
- Portal cleanup for generated TCT files runs only after processed workbook persistence is verified.
- Runtime port for PO recheck remains `5178`.
- Ticket remains `ACTIVE / AWAITING REVIEW` before Chief Architect review and PO recheck.

## Remediation 005A Native Window Hide

- Baseline remote HEAD: `3c043f29ada39418f1b7cd2750d2541ce089142d`.
- Corrected PO behavior is native window hide, not taskbar minimize.
- Authoritative lifecycle wording: visible during manual login → native browser window hidden after `SESSION_VALID` → browser process and persistent session continue running in background.
- `hideWindow()` uses the current browser target window handle plus exact profile-owned PID tree verification before calling Windows native `ShowWindow(..., SW_HIDE)`.
- Registry state uses `windowHidden` / `hideAttempted`; API evidence uses `browser_hidden`.
- Hide failure keeps `SESSION_VALID`, keeps the browser process/context alive, and returns `browser_hidden:false`.
- Review status: `REVIEW FAIL`.
- Failure reason: R5A incorrectly treated CDP `Browser.getWindowForTarget().windowId` as a native Windows `HWND`.

## Remediation 005B Native HWND by Profile PID

- Baseline remote HEAD: `52d25e5310550631a8211aead577442994687787`.
- PowerShell native enumeration was blocked by host `Access is denied`; R5B replaces the PowerShell hide/restore bridge with direct Win32 calls through the minimal prebuilt Node FFI dependency `koffi`.
- Direct native calls are limited to `EnumWindows`, `GetWindowThreadProcessId`, `IsWindowVisible`, and `ShowWindow`.
- Authority mapping remains `exact --user-data-dir` -> `owned PID tree` -> `owned HWND`.
- CDP `windowId` is not used as HWND; windows are not selected by title.
- Controlled non-portal headed Chromium smoke found owned HWNDs, hid the visible owned HWND to `IsWindowVisible=false`, kept browser/page usable, and restored the same HWND to `IsWindowVisible=true`.
- Restore is scoped to HWNDs previously hidden by this profile manager to avoid showing hidden utility windows.
- Technical status: `PASS`.
- Runtime PO validation remains pending; ticket cannot be completed without explicit PO PASS.
