---
title: Testing Scenarios
purpose: Kịch bản kiểm thử bắt buộc cho F1.2
owner: Architect
ssot: True
dependencies: measurement.md
version: 1.0.0
---

# Testing Scenarios — F1.2

| ID | Scenario | Where |
| --- | --- | --- |
| TS-1 | Real detail file 10/10: 1.758 / 1.620 / 138, 92,15 %, 73 offices in 37 units, Khách hàng lớn 550/549 | `f12HueExcelParser.test.js` |
| TS-2 | Real national file: 53 units, total verified, Huế row = detail (incl. buckets) | `f12TctExcelParser.test.js` |
| TS-3 | Huế 8/34 on the real national file; EMS/centres never ranked; a range adds days first | `F12NationalRankService.test.js` |
| TS-4 | Negative elapsed kept; BĐ10 back-tick removed; codes text | `f12HueExcelParser.test.js` |
| TS-5 | File renamed to the wrong day refused, goes to Error, FAILED log, no rows | `test_f12ImportPipeline.js` |
| TS-6 | Both lanes import through the pipeline; other fact tables untouched; forced re-import replaces the day only | `test_f12ImportPipeline.js` |
| TS-7 | Real files through both lanes reconcile: detail = national row 53 | `test_f12ImportPipeline.js` |
| TS-8 | Migration idempotent, columns = parser columns, schema.sql mirror | `migrate_f12_schema.test.js` |

Run from `backend/`: `node --test src/services/f12HueExcelParser.test.js src/services/f12TctExcelParser.test.js src/services/F12NationalRankService.test.js migrate_f12_schema.test.js` and `node --test --experimental-sqlite test_f12ImportPipeline.js`.
