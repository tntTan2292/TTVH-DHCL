# IMPORT-COVERAGE-SPEED-01 - Faster opening of the Data Import Center

Status: IMPLEMENTED (backend only) / needs backend restart
Owner: Claude Code, 2026-10-16. No screen change, no API field change.

## 1. Problem

Opening the import page waited a long time. Measured on the real database (2.6 GB, warm cache, no other load): coverage scan 2.2 s (5 186 queries for 2 304 day x indicator x lane cells, one file check per cell), `GET /import/status` 3.7 s (a LEFT JOIN over all of `fact_f13`, no index on `import_log_id`), three overlapping scans add up (5.3 s). A cold cache or a busy database makes each of these much slower.

## 2. Changes

| Part | What | Where |
| --- | --- | --- |
| A | Completion policy gains `evaluateBatch`: one grouped read per table, one `import_log` read, one directory listing per lane, same pure result builder as the per-date path | `autoBackfillCompletionPolicies.js`, `autoBackfillCoverageService.js` |
| B | `scan()` is single-flight (overlapping identical scans share one run) and cached 20 s per (day, indicator, lane, roles). Dropped at once by `coverageVersion` bumps: every `import_log` write, end of `executeImport`, end of a queue job attempt, coverage exception and holiday create/revoke. The queue planner (`createRun`, anchor run) uses `fresh: true` and never reads the cache. | `coverageVersion.js`, `importLogAudit.js`, `importPipeline.js`, `autoBackfillQueueService.js`, exception and holiday services |
| C | `GET /import/status`: the page of 20/50/100 log rows is cut first, fact counts are taken only for those rows through `ngay_do_kiem` + `import_log_id` | `importController.js` |
| D | Timing on the real server: `Server-Timing: scan;dur=..;desc="miss|hit|joined|fresh"` on `GET /import/auto-backfill/coverage` (browser Network > Timing) and a `[coverage-scan] computed ... ms` log line per computed scan | controller, service |

Cache note: a write that bypasses all the hooks above (direct SQL) shows after at most 20 s. The cached object is shared; callers only read it.

## 3. Validation

- Old vs new scan on the real database, six scopes (all; F4.1; HUE; F1.1/TCT; F1.2; F1.3): 5 472 items compared, **0 differences**, whole results identical.
- Old vs new `/import/status`, five pages (20, 50, 100 rows): 210 rows, **0 differences**.
- Times (real DB, warm): full scan 2 328 -> 819 ms; F1.1/TCT 199 -> 18 ms; through the controller 996 ms cold, **0 ms** on a repeat or while joined; status 3 689 -> 54 ms (100 rows 247 ms).
- Tests: `test_autoBackfillCoverageBatch.js` 4/4 (batched = per-date for three policy shapes; hit / single-flight / fresh / version / TTL); CoverageService 17/17, CoverageExceptionService 25/25, QueueService 45/45, Safety 11/11, AnchorRun 5/5, RefreshWindow 6/6, F13Executors 19/19, F41Executors 32/32, f12ImportPipeline 6/6.

## 4. Residuals

- Cold-start time of the first scan after a restart is still bound by reading the large fact tables once (about 1 s warm; not measured cold). The `[coverage-scan]` log and `Server-Timing` give the real figure after the restart.
- Not done (options kept): lazy loading of old months in the screen; a per-day coverage summary table.
