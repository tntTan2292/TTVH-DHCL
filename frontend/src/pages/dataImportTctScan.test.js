import assert from 'node:assert/strict';
import fs from 'node:fs';

const pageSource = fs.readFileSync(new URL('./DataImportCenter.jsx', import.meta.url), 'utf8');

assert.match(
  pageSource,
  /data-testid="tct-f13-manual-backfill-section"/,
  'TCT manual backfill section must be present'
);
assert.match(
  pageSource,
  /api\.post\('\/import\/dkcl\/session\/preflight', \{ source: 'TCT' \}\)/,
  'TCT section must use shared DKCL session preflight'
);
assert.match(
  pageSource,
  /api\.get\('\/import\/dkcl\/tct\/f13\/coverage-summary'/,
  'TCT coverage summary endpoint must be used'
);
assert.match(
  pageSource,
  /api\.get\('\/import\/dkcl\/tct\/f13\/missing-dates'/,
  'TCT missing-date scan endpoint must be used'
);
assert.match(
  pageSource,
  /params:\s*\{\s*from_date: tctWindow\.fromDate,\s*to_date: tctWindow\.toDate\s*\}/,
  'TCT scan must propagate the operator-selected date range'
);
assert.match(
  pageSource,
  /data-testid="tct-backfill-update"/,
  'TCT Update action must expose a stable test id'
);
assert.match(
  pageSource,
  /const tctUpdateDisabled = \(tctSessionReady && tctSelectedDates\.length === 0\) \|\| tctQueueSubmitting \|\| tctQueueIsActive;/,
  'TCT Update must route a not-ready operator into interactive login and otherwise require selected dates'
);
assert.match(
  pageSource,
  /api\.post\('\/import\/dkcl\/tct\/f13\/backfill-queue'/,
  'TCT Update must create a TCT backfill queue'
);
assert.match(
  pageSource,
  /refresh_dates: tctRefreshDates\.filter\(\(date\) => allowedDates\.includes\(date\)\)/,
  'TCT Update must submit explicit operator-selected COMPLETE refresh dates'
);
assert.doesNotMatch(
  pageSource,
  /new Set\(tctScanResult\?\.missing_dates/,
  'TCT Update must not restrict submissions to MISSING-only dates'
);
assert.match(
  pageSource,
  /api\.post\(`\/import\/dkcl\/tct\/f13\/backfill-queue\/\$\{tctQueue\.queueId\}\/stop`/,
  'TCT Stop must call the TCT queue stop endpoint'
);
assert.match(
  pageSource,
  /api\.post\(`\/import\/dkcl\/tct\/f13\/backfill-queue\/\$\{tctQueue\.queueId\}\/retry`/,
  'TCT Retry must call the TCT queue retry endpoint'
);
assert.match(
  pageSource,
  /api\.post\('\/import\/dkcl\/session\/interactive-auth', \{ source: 'TCT' \}\)/,
  'TCT authentication-required state must expose explicit interactive login action'
);
assert.match(pageSource, /data-testid="tct-not-ready"/, 'TCT local coverage must be labeled as not ready until preflight passes');
assert.match(pageSource, /Update lại/, 'COMPLETE rows must expose a separate manual refresh action');
assert.match(
  pageSource,
  /Tổng quan dữ liệu TCT F1\.3/,
  'TCT coverage heading must use UTF-8 Vietnamese'
);
assert.match(
  pageSource,
  /Bù dữ liệu thủ công TCT F1\.3/,
  'TCT manual backfill heading must use UTF-8 Vietnamese'
);
assert.match(
  pageSource,
  /Ngày thiếu trong khoảng quét/,
  'TCT missing-date summary must be visible'
);
assert.match(
  pageSource,
  /Xử lý lại/,
  'TCT incomplete dates must expose a clear operator recovery label'
);
assert.match(
  pageSource,
  /SESSION_VALID|AUTHENTICATION_REQUIRED|SESSION_CHECK_FAILED/,
  'TCT session states must be visible in UI source'
);
assert.doesNotMatch(
  pageSource,
  /quality-timeline\.|undefined_key|TCT_SCAN_API_ERROR_KEY|raw_/,
  'Operator-facing TCT UI must not expose raw technical or i18n keys'
);

console.log('DataImportCenter TCT scan UI behavior checks passed.');
