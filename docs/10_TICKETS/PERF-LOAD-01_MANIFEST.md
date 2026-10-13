# PERF-LOAD-01 MANIFEST — Dashboard load speed

| Field | Value |
| --- | --- |
| Status | Phase 1 IMPLEMENTED (2026-10-13, Claude Code/Sonnet 5.5); Phases 2-4 not authorized |
| Owner | Claude Code (backend/data); frontend change is three one-line removals |
| PO UI Check Required | No (no layout or number change); PO may confirm the felt speed |
| Validation level | LEVEL 1 + cache-invalidation tests |

## 1. Problem (measured 2026-10-13, 2,3 GB DB)

Dashboards aggregate over raw fact rows on every request: fact_f13 907 k, fact_f41 1,3 M, fact_f11 430 k rows. One SQLite connection serialises concurrent requests, so a page's blocks add up. Measured (ms): F1.3 overview monthly 2 000, weekly trend 12 m 2 400, weeks/months list 800-1 000; F4.1 overview monthly 7 700 (MAX(ten_bc_phat) forces wide-row lookups), weekly trend 2 200. No cache anywhere; frontend added `_ts` to `/dashboard/meta`.

## 2. Phase 1 (delivered)

1. `backend/src/middleware/responseCache.js`: in-memory GET cache mounted after `requireAuth` in f11/f12/f13/f41 routes. Key = original URL. Invalidation: data fingerprint (max rowid of the fact/national/import_log/catalog tables, content of sys_kpi_thresholds and system_config; memoised 1,5 s) plus 10-minute TTL; 400 entries, 2 MB per body; only HTTP 200. F1.3 admin-only reads (`rca`, `messages`, `dashboard/message`) are not cached. Header `X-QIS-Cache: HIT|MISS`.
2. `backend/src/config/db.js`: `cache_size` 256 MB; WAL + `synchronous=NORMAL` (not in tests; `QIS_SQLITE_WAL=off` to disable).
3. Frontend: removed `_ts` cache-busters (DashboardPage, BcvhRankingPage, F12Cumulative12Block). Express ETag now gives 304 on revalidation.
4. `compression` (gzip) in `backend/server.js`; new dependency `compression@1.8.1`.
5. `date(ngay_do_kiem)` removed from 16 WHERE predicates in the four fact repositories (all stored values verified `YYYY-MM-DD`: 2 655 863 rows, 0 exceptions) so the date indexes are usable.

## 3. Evidence

- `responseCache.test.js` 5/5 (hit, different query, invalidation by new import row, 5xx/POST not cached, path exclusion). Existing f41Routes, repository overview/weekly/r4, FactF41Repository, bcvhOverviewService suites pass.
- HTTP check: first response gzip + MISS, second HIT without running the handler, conditional request 304.
- Uncached query times are essentially unchanged (F1.3 overview monthly 1,7-2,9 s, F4.1 monthly 7,8-8,9 s): Phase 1 removes REPEAT cost, not first-load cost. First load is Phase 2 (aggregate tables).

## 4. Operations notes

- Backend restart required. First start switches the file to WAL (needs no other process holding the DB); `-wal`/`-shm` files appear beside `database.sqlite`.
- Any backup that copies only `database.sqlite` while the backend runs may miss un-checkpointed commits; use SQLite backup (`VACUUM INTO`/`.backup`) or stop the backend first.
- Edits to fact rows by in-place UPDATE are invisible to the fingerprint and show after at most 10 minutes.

## 5. Not done / next

Phase 2 aggregate tables (needs PO/CTO approval for new schema), Phase 3 page bundle endpoint + lazy loading + static build, Phase 4 separate read connection.
