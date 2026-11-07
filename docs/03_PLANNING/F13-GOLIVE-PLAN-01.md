# F13-GOLIVE-PLAN-01 - F1.3 complete before the official start

- Written by: Claude Code / Opus 5.5 (CTO), 2026-11-07.
- PO instruction (2026-11-07): the system goes to production soon; no item waits "1-2 weeks of use"; every function is built now, defects are fixed afterwards.
- Status: `APPROVED by the PO 2026-11-07` (decisions of section 3: capacity as proposed, U1-R1 note yes, old pages deleted before the start). G5 done; G2 `F13-ROUTE-CAPACITY-01` and G3 `F13-RULE-PROPOSAL-01` ready for Sonnet.

## 1. The PO problem statement (2026-11-05) and where each part stands

> Kết quả chất lượng Ngày/Tuần/Tháng đã có. Tiếp theo người dùng cần biết trong bưu cục, ngày/tuần/tháng đó: tuyến nào là nguyên nhân, bưu tá nào, bao nhiêu BG bị ảnh hưởng, BG lỗi do khâu nào, chậm từ đâu, có do lỗi khách quan trước BCVH không (không trọn lô, hàng đến BCVH đã hết thời gian...). Chuyên quản và GĐ BCVH có góc nhìn tổng thể, ví dụ "hôm qua 5 tuyến cần để ý chiếm 30 % sản lượng nhưng chỉ đạt 30 %", "Tuyến 1: 90 % BG rơi vào lô không trọn lô nhập phát chiều qua". Không phải số liệu khô khan, rời rạc.

| # | Question of the PO | Where | State |
|---|---|---|---|
| Q1 | Which route is the cause | Phân tích nguyên nhân, routes by shortfall | Done |
| Q2 | Which postman | Phân tích nguyên nhân step 2 (first handover) | Done |
| Q3 | How many parcels | every figure opens its parcel list | Done |
| Q4 | Which stage, delayed from where (per parcel) | Dữ liệu minh chứng (5 milestones), Hành trình (parcel table) | Done per parcel; **route table not useful** (G1) |
| Q5 | Objective causes before the BCVH | cause rules v5: Không trọn lô, Khai thác / Vận chuyển; time left at arrival as a hint | Done; Hương Trà direct handover in progress (G0) |
| Q6 | Overall picture in words, BĐTP and BCVH | "Bức tranh nguyên nhân" sentences | Done |
| Q7 | The same in words **per route**, with the lot ("lô không trọn lô nhập phát chiều qua") | route row shows only "Không trọn lô chiếm x % (n BG)" | **Missing** (G4) |
| Q8 | Pages linked into one picture | Kết quả chất lượng -> Phân tích nguyên nhân -> Dữ liệu minh chứng -> Hành trình | Done |
| - | Route overload (decision PO 2026-11-04: show, do not judge) | moved to F4.2 (`F42-POSTMAN-NORM-01`, after F1.3): the norm counts every delivery | Moved |
| - | Chuyên quản corrections become rules approved by the PO (E8) | log only, no approval screen | **Missing** (G3) |
| - | Tồn / hoàn as hints only (PO 2026-11-04 point 5) | none | **Missing** (G4) |

## 2. Gaps and tickets (nothing waits for a trial)

| ID | Ticket | Content | Executor | Can start |
|---|---|---|---|---|
| G0 | `F13-WHY-DATA-03` | Hương Trà direct handover rule | Sonnet (running) -> Opus review | running |
| G1 | `F13-JOURNEY-ROUTE-02` | Hành trình theo tuyến phát: Ngày/Tuần/Tháng, by BCVH, failed vs passed hours per stage, main cause, **postmen of the period with their own volume** (the reason the September postman display was paused), Phát tại quầy / Tuyến chưa xác định apart | Sonnet B1 -> Antigravity U1 | after G0 (same file) |
| G2 | ~~`F13-ROUTE-CAPACITY-01`~~ | **Dropped from F1.3 (PO 2026-11-07)**: F1.3 counts only inter-provincial parcels, the TCT norm counts every delivery. Routes in F1.3 are judged by rate (Phân tích nguyên nhân). The postman norm, read together with the F4.2 delivery rate, moves to `F42-POSTMAN-NORM-01`, after F1.3 is complete. | - | - |
| G3 | `F13-RULE-PROPOSAL-01` | "Đề xuất quy tắc" page (PO and admin only): Chuyên quản corrections grouped by system conclusion -> chosen cause, with counts, BCVH, sample parcels and notes; PO Duyệt / Không duyệt with a note, kept in an append-only decision log; an approved line becomes a rule-change ticket (the rules stay in code, changed by a reviewed ticket like G0). Built now even if the log is empty. | Sonnet B1 -> Antigravity U1 | now (new files) |
| G4 | `F13-WHY-NARRATIVE-02` | One sentence per route on Phân tích nguyên nhân: main cause with its share, the lot when Không trọn lô dominates (lot code, batches, time of the last batch), share arriving with little time left, tồn / hoàn as a hint ("tuyến này tỷ lệ hoàn cao") from the existing data, never a cause | Sonnet B1 -> Antigravity U1 | after G0 (`f13WhyHelpers.js`) |
| G5 | `F13-EVIDENCE-01` follow-up | U1-R1: a small line under the summary of Dữ liệu minh chứng "Tổng quan không áp dụng bộ lọc phân tích / tìm kiếm" | Claude Code | now (one line) |
| G6 | `F13-RETIRE-01` | Delete the hidden old pages (Phân tích tuyến phát, F1.3 So sánh BCVH, old Dữ liệu minh chứng) and redirect their links to the new pages; F4.1 pages untouched | Claude Code | after G1 |
| G7 | `F13-GOLIVE-CHECK-01` | Full rebuild of the cause table on the live file, backend restart, real render of every F1.3 page, PO final check | Claude Code / Opus | last |

Order: G0 running; G3 B1 accepted, its screen with Antigravity; G5 done; G1 and G4 after G0 is committed; G6 (after G1) then G7. After G7: `F42-POSTMAN-NORM-01` (F4.2). Antigravity works on one screen at a time; Opus reviews every backend phase and renders every screen before the PO looks.

## 3. Decisions needed from the PO

1. G2: the capacity definition above (own history, >= 90 % days, 8 weeks, 60 / 100 % bands).
2. G5: add the note (recommended).
3. G6: delete the hidden old pages before the start (links redirected).
