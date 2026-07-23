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
  /const tctUpdateDisabled = !tctSessionReady \|\| tctSelectedDates\.length === 0 \|\| tctQueueSubmitting \|\| tctQueueIsActive;/,
  'TCT Update must remain disabled until session is ready and dates are selected'
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
assert.match(
  pageSource,
  /selectUnfinishedDates\(tctSelectableScanRows\)/,
  'TCT unfinished bulk action must use shared unfinished-date selection helper'
);
assert.match(
  pageSource,
  /selectAllImportableDates\(tctSelectableScanRows\)/,
  'TCT select-all bulk action must include COMPLETE refresh dates through shared helper'
);
assert.match(
  pageSource,
  /const tctImportableScanRows = tctSelectableScanRows\.filter\(\(item\) => \['MISSING', 'INCOMPLETE', 'COMPLETE'\]\.includes\(item\.status\)\);/,
  'TCT select-all button must stay enabled for selectable Xử lý lại dates'
);
assert.match(
  pageSource,
  /const tctUnfinishedSelectableRows = tctSelectableScanRows\.filter\(\(item\) => \['MISSING', 'INCOMPLETE'\]\.includes\(item\.status\)\);/,
  'TCT unfinished bulk button must stay enabled for selectable Xử lý lại dates'
);
assert.match(pageSource, /Chọn tất cả chưa hoàn tất/, 'TCT unfinished bulk button must use approved label');
assert.match(pageSource, /data-testid="tct-select-missing"/, 'TCT unfinished bulk button must be present');
assert.match(pageSource, /data-testid="tct-select-all-importable"/, 'TCT all-importable bulk button must be present');
assert.match(pageSource, /data-testid="tct-clear-selection"/, 'TCT clear-selection button must be present');
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
assert.match(
  pageSource,
  /const tctLoginInProgress = tctSessionLoading \|\| tctSessionStatus === 'LOGIN_IN_PROGRESS';/,
  'TCT frontend must recognize backend login-in-progress lifecycle state'
);
assert.match(
  pageSource,
  /disabled=\{tctLoginInProgress\}/,
  'TCT login buttons must remain disabled while login is opening or waiting'
);
assert.match(
  pageSource,
  /Đang mở đăng nhập\.\.\./,
  'TCT login button must show stable in-progress text'
);
const pollingEffect = pageSource.match(/const interval = setInterval\(\(\) => \{[\s\S]*?preflightTctSession\(\);[\s\S]*?\}, 5000\);/);
assert.ok(pollingEffect, 'TCT polling interval must be present');
assert.doesNotMatch(
  pollingEffect[0],
  /interactive-auth|handleInteractiveTctLogin/,
  'TCT polling must not initiate interactive authentication'
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
  /SESSION_VALID|AUTHENTICATION_REQUIRED|SESSION_CHECK_FAILED|LOGIN_IN_PROGRESS/,
  'TCT session states must be visible in UI source'
);
assert.doesNotMatch(
  pageSource,
  /quality-timeline\.|undefined_key|TCT_SCAN_API_ERROR_KEY|raw_/,
  'Operator-facing TCT UI must not expose raw technical or i18n keys'
);

console.log('DataImportCenter TCT scan UI behavior checks passed.');
