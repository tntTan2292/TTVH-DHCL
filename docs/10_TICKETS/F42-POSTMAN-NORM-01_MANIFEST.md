# F42-POSTMAN-NORM-01 Manifest

## 1. Ticket Information

- Ticket ID: `F42-POSTMAN-NORM-01`
- Name: `F4.2 postman norm: daily volume of each postman against the TCT norm, together with his F4.2 delivery rate`
- Owner: Claude Code / Opus 5.5 (scope, review, real render); backend Claude Code / Sonnet 5.5; screen Antigravity.
- Branch: `codex/da-impl-006`.
- **Status: `PLANNED - starts after F1.3 is complete (F13-GOLIVE-PLAN-01 G7 done)`** (PO 2026-11-07). Does not change the Current Ticket.

## 2. Why (PO, 2026-11-07)

The TCT norm of a postman is set on **all** the parcels he delivers, so it cannot be judged in F1.3, which only counts the inter-provincial parcels. F4.2 has every handover (one row per parcel handed to a postman, with `ma_buu_ta`, `ma_tuyen_phat`, `loai_tuyen_phat`, `danh_gia`): 20/10/2026 5 457 parcels, 133 postmen. In F1.3 routes are judged by their rate only (Phân tích nguyên nhân).

## 3. PO decisions (2026-11-07, in chat)

| ID | Decision |
|---|---|
| M1 | Norm per postman per day by route type: **80 BG** for Tuyến phát trung tâm tỉnh, thành phố / trung tâm quận, huyện, thị xã (01 or 02 lần) / xã trung tâm tỉnh, thành phố; **50 BG** for Tuyến phát xã (01 or 02 lần) / Khu công nghiệp. |
| M2 | Not judged on volume: Tuyến phát thời vụ; every route of BCVH A Lưới; Phú Lộc routes Khe Tre, Nam Đông, Long Quảng; Phát tại quầy (lưu tại bưu cục); unknown route or type. |
| M3 | Under the norm the postman is fine ("trong định mức"), whatever the ups and downs; above it "vượt định mức". |
| M4 | **The norm is always read with the postman's F4.2 delivery rate** (Đạt / handovers of the day): volume and rate together, never one without the other. |
| M5 | Show, do not judge (PO 2026-11-04): information for the GĐ BCVH, not a fault. |

## 4. Scope to write when the ticket starts

- Backend from `fact_f42`: per postman-day volume, rate, route(s) and type, norm, state; periods Ngày / Tuần / Tháng; scope rules of F4.2. The rule module of `F13-ROUTE-CAPACITY-01` (`RouteCapacity.js`: norm table, special routes, postman-day state) is reused and moved here.
- How volume and rate are read together (M4), for example a 2 x 2 view (trong / vượt định mức x đạt / dưới chỉ tiêu F4.2) and the rate of the postman's days over the norm against his days within it: to be proposed by Opus with real data and agreed by the PO before the screen.
- Screen in the F4.2 menu (Antigravity), report block standard.
- Follow-up for F1.3: once this exists, Phân tích nguyên nhân may show beside a postman "hôm đó nhận x BG, vượt định mức y" as a hint only (never a cause, no figure changed).

## 5. Change log

- 2026-11-07: created by Claude Code / Opus 5.5 (PO moved the norm from F1.3 to F4.2 and added M4).
