---
title: RCA AI Context
purpose: Ngữ cảnh cho phân tích nguyên nhân F1.2
owner: Product Owner
ssot: False
dependencies: core_knowledge.md
version: 1.0.0
---

# RCA AI Context — F1.2

- The source has no violation reason (`Nội dung lý do` empty). Causes must be read from times: accept time, BĐ8, BĐ10 TMS scan and BCCP close, and the exploitation office (`Mã/Tên BCKT`: KTC1 Huế 1, VCKV Đà Nẵng LT, KT A Lưới, EMS HCM/HN LT).
- The portal elapsed time excludes a night window (about 19:00–05:00) and can be negative when the TMS scan happens before 05:00 of the next day; never call it "waiting time" and never recompute it.
- A unit with 1–7 parcels a day gives a noisy daily rate; read the week or month before concluding.
- `Khách hàng lớn` (531120, ~31 % of the day) lifts the provincial rate; compare offices without it.
- Not yet trained by the PO: no stage-level violation taxonomy exists for F1.2.
