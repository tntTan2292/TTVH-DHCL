# F11-PHASE-1 Independent Review 001

- Ticket: `F11-PHASE-1` (F1.1 HUE data foundation), implementation commit `78eb19f` (Claude Code / Sonnet 5.5)
- Reviewer: Claude Code / Opus 5.5 (independent; DEC-021: implementer does not self-approve)
- Date: 2026-10-09 · Branch `codex/da-impl-006` · Read-only: no product code, data file or live database changed
- Scope: the three points set by Claude/CTO — (1) table and indexes, (2) header-name parser drift, (3) independent recomputation of the 2026-10-07 baseline

## Verdict: **PASS** (Phase 1 foundation)

No blocker for Phase 1. Two items (N-1, N-2) are **gates for F11-PHASE-2**: they cannot corrupt anything today because nothing is imported, but once the importer writes to `fact_f11` they can silently change the rate. One item (Q-R1) is a **business-rule question for the Product Owner** that must be answered before week/month figures are signed off; it does not require a schema change either way.

## 1. `fact_f11` and its indexes

**Sufficiency.** Measured with `EXPLAIN QUERY PLAN` on a temporary database built from the migration's own SQL, filled with a synthetic year (365 days × 2.600 rows = 949.000 rows, 8 delivering units, 67 accepting offices, ~268 MB):

| Query | Plan | Time |
| --- | --- | ---: |
| Day × BCVH (Dashboard/Ranking) | COVERING INDEX `idx_f11_date_bcvh_eval` (ngay=?) | 1 ms |
| Day trend over 2 months | COVERING INDEX `idx_f11_date_bcvh_eval` (range) | 23 ms |
| Month × pair (accepting × delivering) | COVERING INDEX `idx_f11_date_pair_eval` (range) + temp B-tree GROUP BY | 50 ms |
| Month × BCVH | `idx_f11_bcvh_date` skip-scan, **not covering** (table lookups) | 94 ms |
| One unit, 2 months by day | `idx_f11_bcvh_date`, not covering | 22 ms |
| Week bucket (`strftime`) × BCVH since 01/09 | COVERING `idx_f11_date_bcvh_eval` + temp B-tree | 236 ms |
| Blank drill-down of one day | `idx_f11_date` | 0 ms |

The table and four indexes are enough for a Dashboard and a pair table by day/week/month. Every query a screen needs is an index range scan; no full-table scan appears. Non-blocking tuning:

- **N-3** `idx_f11_date` is a strict prefix of `idx_f11_date_bcvh_eval` and `idx_f11_date_pair_eval`, so it is redundant. Keeping it costs some write and disk overhead but is harmless.
- **N-4** `idx_f11_bcvh_date` does not include `danh_gia_2026`, so the planner's chosen plan for month × BCVH does a table lookup per row. Changing it to `(ma_bc_phat, ngay_do_kiem, danh_gia_2026)` would make it covering. Revisit when Phase 2 adds the real queries; this is not needed now.
- **N-5** Week grouping should use a precomputed Thursday–Wednesday week key passed as a date range (as F1.3 does), not `strftime` in SQL. That is the 236 ms row. It is a query-design note for F11-DASHBOARD, not a schema issue.

**`UNIQUE(ngay_do_kiem, ma_bg)` when a parcel reappears on a later date.** Technically correct. The same parcel on 07/10 and 08/10 is two rows, which the key allows (DC-2, R-6). The key also blocks in-file duplicates and lets a "replace this date" re-import work. The same key is used by `fact_f13` and `fact_f41`, so it is consistent with them. It has two consequences that are not written down anywhere:

- **Q-R1 (business rule, to the PO via Claude/CTO).** `measurement.md` §3 says week and month "use the same formula over the period", which is `COUNT(*)` over rows. A parcel that appears in several daily files is therefore counted once per file in the week/month denominator, and it may change result between files (for example blank `PTC_SAU_NGAY_DO_KIEM` on 07/10, then evaluated on 08/10). Is the week/month figure meant to be **row-days** (the sum of daily files, as F1.3/F4.1 do) or **distinct parcels**? The reference set has only one date, so how often this happens cannot be measured yet. The schema supports either answer: row-days is the natural sum, and distinct parcels is a query-time choice. No schema change is needed, but the answer changes the numbers. This reviewer does not infer it.
- **N-6** If the answer is "distinct parcels", or Evidence needs a "seen before" lookup, add an index on `ma_bg`. The unique index starts with `ngay_do_kiem`, so it cannot serve a cross-date `ma_bg` lookup.

## 2. Header-name parser (52 required, 3 optional): drift behaviour

I probed the real `parseF11HueExcel` / `classifyBlankEvaluation` with synthetic workbooks (results verbatim):

| Portal change | Result | Assessment |
| --- | --- | --- |
| Columns reordered (fully reversed) | Identical output | Safe |
| Required header renamed (`Mã BC phát` → `Mã bưu cục phát`) | Hard error naming `Mã BC phát` | Safe (fails loudly) |
| Case change (`Đánh Giá 2026`) | Hard error | Safe but brittle: a cosmetic portal change stops import |
| Column split (`Thời gian PTC` → `Ngày PTC` + `Giờ PTC`) | Hard error naming `Thời gian PTC` | Safe (fails loudly) |
| Headers in Unicode NFD | Hard error ("`Số hiệu bưu gửi` not found") | Safe but misleading message; parser does not NFC-normalise |
| Title rows above header | Header found on row 3, parsed | Safe (scan ≤ 20 rows) |
| New unknown column | Accepted, listed in `unmappedHeaders` | Safe, visible |
| **Duplicate header** (`Đánh giá 2026` twice, 2nd blank) | **Silently uses the last one → `Đạt` became NULL** | **N-1 (Phase-2 gate):** silent rate change; must be a hard error |
| **Value `"Đạt "` (trailing space) or NFD `Đạt`** | **Stored as-is; `= 'Đạt'` no longer matches** | **N-2 (Phase-2 gate):** silent drop to 0 Đạt; values are not trimmed/NFC-normalised and the `danh_gia_2026` domain is not checked |
| Timestamp as a real Excel date | Stored `2026-10-07 10:00:00` (ISO), while text cells stay `07/10/2026 …` | Mixed formats in one column across days; `toIsoDay` copes, raw SQL `substr` would not (N-7) |
| Timestamp `MM/dd`, `d/M` or `dd-MM` | `classifyBlankEvaluation` → `KHAC` (or a wrong day) | Silent mis-reason only. **The rate is not affected**, because the metric is the source evaluation and `ngay_do_kiem` comes from the file name (N-7) |
| `Thời gian thực tế` as an Excel duration number | Stored `"1.0625"` | Raw display value corrupts; not used in any formula (N-7) |
| `Thời gian chỉ tiêu 2026` as `"24h"` | Stored text `"24h"` in an INTEGER column | Only the blank-reason null-check reads it (N-7) |
| Total row with text in `Số hiệu bưu gửi` | Counted as a parcel | No total row in the real file today; Phase-2 row check should reject it (N-8) |
| File name with path or ` (1)` suffix | Hard error | Strict by design; the Phase-2 caller must pass the basename (N-8) |

Real file facts that make all of this a future risk rather than a current defect: the headers and evaluation values are NFC with no trailing spaces, there are no duplicate headers, every business timestamp is the text `dd/MM/yyyy HH:mm:ss`, columns 54–55 are ISO text, and all code columns are integers.

**Phase-2 gate (N-1 + N-2):** before the importer writes to `fact_f11`, (a) reject a file with a duplicated mapped header, (b) NFC-normalise and trim headers and TEXT values, and (c) reject a file where any `danh_gia_2026` is outside {`Đạt`, `Không đạt`, empty}. Recommended at the same time (N-7): a format check per timestamp column that rejects any value that is not `dd/MM/yyyy HH:mm:ss` or ISO.

## 3. Independent recomputation from `Data DKCL/F1.1-2026.10.07.xlsx`

My own Python/openpyxl script (Appendix A) reads the workbook directly and does not use any system code. File SHA-256 `11aa01689b6743e2…` is the same before and after.

| Check | Recomputed | `measurement.md` | Match |
| --- | --- | --- | --- |
| Rows / distinct `Số hiệu bưu gửi` / columns | 2.621 / 2.621 / 55 | 2.621, 0 dup, 55 | ✔ |
| F11_001 module | 2.348 / 2.621 = **89,58 %** (KĐ 240, blank 33) | 89,58 % | ✔ |
| F11_002 six BCVH | 2.338 / 2.611 = **89,54 %** | 89,54 % | ✔ |
| 533140 | 1.801 / 1.713 / 73 / 15 = 95,11 % | same | ✔ |
| 535470 | 273 / 205 / 53 / 15 = 75,09 % | same | ✔ |
| 536250 | 248 / 183 / 64 / 1 = 73,79 % | same | ✔ |
| 535790 | 84 / 74 / 10 / 0 = 88,10 % | same | ✔ |
| 537220 | 132 / 96 / 35 / 1 = 72,73 % | same | ✔ |
| 537015 | 73 / 67 / 5 / 1 = 91,78 % | same | ✔ |
| 531110 / 531120 | 9/9/0/0 and 1/1/0/0 = 100 % | same | ✔ |
| Blank split (own implementation of §5 order) | PTC_SAU_NGAY_DO_KIEM **13**, THIEU_CHI_TIEU_PHUONG **1**, CHUA_PTC **19**, KHAC 0 | 13 / 1 / 19 | ✔ |
| Rows without PTC | 23 = 19 blank + 4 `Không đạt` | same | ✔ |
| `Không đạt` with PTC on 08/10 | 1 | 1 | ✔ |
| Portal evaluated view | 2.348 / 2.588 = 90,73 % | same | ✔ |
| Đánh giá 2025 view | 2.400 / 2.571 | same | ✔ |
| Pair grid | 171 pairs, 67 accepting offices, sum 2.621 | grid sums to 2.621 | ✔ |

All figures match `measurement.md` §6 exactly.

## 4. Findings summary

| ID | Severity | Item |
| --- | --- | --- |
| — | Blocker | None |
| N-1 | Phase-2 gate | Duplicate header silently overwrites the mapped column |
| N-2 | Phase-2 gate | Header/value not NFC/trimmed; `danh_gia_2026` domain unchecked → silent 0 Đạt |
| Q-R1 | PO question | Week/month = row-days or distinct parcels when a parcel reappears |
| N-3 | Non-blocking | `idx_f11_date` redundant |
| N-4 | Non-blocking | `idx_f11_bcvh_date` not covering (add `danh_gia_2026`) |
| N-5 | Non-blocking | Week buckets as date ranges, not `strftime` |
| N-6 | Conditional | Index on `ma_bg` if Q-R1 = distinct parcels or Evidence needs a cross-date lookup |
| N-7 | Non-blocking | Timestamp/duration/chỉ tiêu formats not validated; affects blank reason and raw display only, not the rate |
| N-8 | Non-blocking | Text total rows counted as parcels; caller must pass the basename |

## 5. Commands run

```
git show --stat 78eb19f
node --test migrate_f11_phase1_schema.test.js src/services/f11HueExcelParser.test.js   # in backend/: tests 16, pass 16, fail 0, skipped 0
python -I -X utf8 <scratchpad>/recompute.py "Data DKCL/F1.1-2026.10.07.xlsx"           # Appendix A; output in Section 3
node <scratchpad>/probe.js <backend>                                                   # synthetic workbooks through the real parser; Section 2
node --experimental-sqlite <scratchpad>/plan.js <backend> <scratchpad>                 # synthetic year + EXPLAIN QUERY PLAN; Section 1; temp DB deleted
sha256sum "Data DKCL/F1.1-2026.10.07.xlsx"                                              # 11aa01689b6743e2… unchanged
```

## Appendix A — independent recomputation script (openpyxl, no system code)

```python
import sys, unicodedata, re, collections, datetime
import openpyxl
wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
ws = wb[wb.sheetnames[0]]
rows = list(ws.iter_rows(values_only=True))
hdr = [str(h) if h is not None else '' for h in rows[0]]
ix = {h: i for i, h in enumerate(hdr)}
body = [r for r in rows[1:] if r[ix['Số hiệu bưu gửi']] not in (None, '')]
EV = 'Đánh giá 2026'
def ok(v): return isinstance(v, str) and v.strip() == 'Đạt'
def ko(v): return isinstance(v, str) and v.strip() == 'Không đạt'
def blank(v): return v is None or (isinstance(v, str) and v.strip() == '')
tot = len(body); d = sum(ok(r[ix[EV]]) for r in body)
print(f"MODULE {d}/{tot} = {100*d/tot:.2f}%")
six = {'533140', '535470', '536250', '535790', '537220', '537015'}
per = collections.defaultdict(lambda: [0, 0, 0, 0])   # total, Đạt, Không đạt, blank
for r in body:
    a = per[str(r[ix['Mã BC phát']])]; e = r[ix[EV]]
    a[0] += 1; a[1] += ok(e); a[2] += ko(e); a[3] += blank(e)
for u, a in sorted(per.items(), key=lambda x: -x[1][0]): print(u, a, f"{100*a[1]/a[0]:.2f}%")
s = [sum(per[u][k] for u in six) for k in range(4)]; print("SIX", s, f"{100*s[1]/s[0]:.2f}%")
day = datetime.date(2026, 10, 7)
def parse_day(v):
    if blank(v): return None
    if isinstance(v, datetime.datetime): return v.date()
    m = re.match(r'(\d{1,2})/(\d{1,2})/(\d{4})', str(v).strip())
    if m: return datetime.date(int(m[3]), int(m[2]), int(m[1]))
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', str(v).strip())
    return datetime.date(int(m[1]), int(m[2]), int(m[3])) if m else 'UNREADABLE'
split = collections.Counter()
for r in body:
    if not blank(r[ix[EV]]): continue
    ptc, cod = r[ix['Thời gian PTC']], r[ix['Thời gian nộp tiền COD']]
    end = ptc if not blank(ptc) else cod
    if blank(end): split['CHUA_PTC'] += 1; continue
    ed = parse_day(end)
    if ed == 'UNREADABLE': split['UNREADABLE'] += 1; continue
    if ed > day: split['PTC_SAU_NGAY_DO_KIEM'] += 1; continue
    if blank(r[ix['Thời gian chỉ tiêu 2026']]): split['THIEU_CHI_TIEU_PHUONG'] += 1; continue
    split['KHAC'] += 1
print("blank split", dict(split))
ev = [r for r in body if not blank(r[ix[EV]])]; print("evaluated view", d, len(ev))
pair = collections.Counter((str(r[ix['Mã BC chấp nhận']]), str(r[ix['Mã BC phát']])) for r in body)
print("pairs", len(pair), "sum", sum(pair.values()), "accepting offices", len({k[0] for k in pair}))
```
