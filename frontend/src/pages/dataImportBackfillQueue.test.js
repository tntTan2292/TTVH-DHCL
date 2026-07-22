import assert from 'node:assert/strict';
import fs from 'node:fs';

const pageSource = fs.readFileSync(new URL('./DataImportCenter.jsx', import.meta.url), 'utf8');
const apiClientSource = fs.readFileSync(new URL('../api/client.js', import.meta.url), 'utf8');

assert.match(
  pageSource,
  /const updateDisabled = !hueSessionReady \|\| selectedDates\.length === 0 \|\| queueSubmitting \|\| queueIsActive;/,
  'Update must be disabled without selected dates, during submit, or while a queue is active'
);
assert.match(
  pageSource,
  /data-testid="hue-backfill-update"/,
  'Update button must expose a stable test id'
);
assert.match(
  pageSource,
  /api\.post\('\/import\/dkcl\/hue\/f13\/backfill-queue'/,
  'Update must call the Hue F1.3 backfill queue endpoint'
);
assert.match(
  pageSource,
  /api\.get\('\/import\/dkcl\/hue\/f13\/coverage-summary'/,
  'Data Import Center must load Hue F1.3 coverage summary without requiring import-history inspection'
);
assert.match(
  apiClientSource,
  /VITE_API_BASE_URL \|\| import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:5050\/api'/,
  'Data Import Center API client must support both normal and isolated runtime API base variables'
);
assert.match(
  pageSource,
  /getApiErrorCode/,
  'Coverage and scan failures must expose concise operator-visible error codes'
);
assert.match(
  pageSource,
  /Mã lỗi: \$\{getApiErrorCode\(err, 'COVERAGE_API_ERROR'\)\}/,
  'Coverage summary failures must show an operator-visible error code'
);
assert.match(
  pageSource,
  /Mã lỗi: \$\{getApiErrorCode\(err, 'SCAN_API_ERROR'\)\}/,
  'Missing-date scan failures must show an operator-visible error code'
);
assert.match(
  pageSource,
  /Tổng quan dữ liệu Huế F1\.3/,
  'Coverage summary must have proper Vietnamese Unicode heading'
);
assert.match(
  pageSource,
  /Ngày thiếu trong khoảng quét/,
  'Coverage summary must expose missing dates within the selected scan range'
);
assert.match(
  pageSource,
  /Ngày đã có trong khoảng quét/,
  'Coverage summary must expose existing/completed dates within the selected scan range'
);
assert.match(
  pageSource,
  /api\.get\('\/import\/dkcl\/hue\/f13\/backfill-queue\/active'\)/,
  'Data Import Center must restore an active in-memory queue on page load'
);
assert.match(
  pageSource,
  /err\.response\?\.status !== 404/,
  'Missing active queue after restart must be treated as an expected operator-visible state'
);
assert.match(
  pageSource,
  /formatQueueErrorMessage/,
  'Known technical queue messages must be rendered in operator-facing wording'
);
assert.match(
  pageSource,
  /Tự động nạp Huế F1\.3 đang tắt trong cấu hình backend/,
  'Disabled automation evidence must be understandable to the system operator'
);
assert.doesNotMatch(
  pageSource,
  /Khong the|Quet ngay|Tong ngay|Thieu|Da co|Can soat|Chon tat ca|Tu ngay|Den ngay|Bang chung|Dong DB|Trang thai/,
  'New Huế backfill UI strings must not use ASCII fallback Vietnamese'
);
assert.match(
  pageSource,
  /api\.post\(`\/import\/dkcl\/hue\/f13\/backfill-queue\/\$\{queue\.queueId\}\/stop`/,
  'Stop must call the queue stop endpoint'
);
assert.match(
  pageSource,
  /api\.post\(`\/import\/dkcl\/hue\/f13\/backfill-queue\/\$\{queue\.queueId\}\/retry`/,
  'Retry must call the queue retry endpoint'
);
assert.match(
  pageSource,
  /disabled=\{!\['FAILED', 'AUTHENTICATION_REQUIRED'\]\.includes\(item\.status\) \|\| queueIsActive\}/,
  'Retry must be enabled only for failed or authentication-required items when no queue is active'
);

console.log('DataImportCenter backfill queue UI behavior checks passed.');
