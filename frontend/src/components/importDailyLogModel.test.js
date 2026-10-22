import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attentionTarget, cellMeta, cellTitle, countHigh, dayHeading, schedulerLine, shortDate, verdictMeta } from './importDailyLogModel.js';

assert.equal(shortDate('2026-10-21'), '21/10');
assert.equal(dayHeading(0, '2026-10-21'), 'Ngày mới 21/10');
assert.equal(dayHeading(2, '2026-10-19'), 'Làm mới 19/10');

assert.equal(cellMeta('FAILED').label, 'Lỗi');
assert.equal(cellMeta('WAITING_AUTH').label, 'Chờ đăng nhập');
assert.equal(cellMeta('???').label, 'Chưa nhập', 'unknown states read as not imported');
assert.match(verdictMeta('ATTENTION').cls, /red/);
assert.match(verdictMeta('COMPLETE').cls, /emerald/);

const title = cellTitle({ indicator: 'F4.1', lane: 'TCT', date: '2026-10-21', state: 'FAILED', reason: 'X_ERR', detail: 'TIMEOUT', has_data: true, last_import_at: null });
assert.match(title, /F4\.1 TCT/);
assert.match(title, /Mã: X_ERR/);
assert.match(title, /Chi tiết: TIMEOUT/);
assert.match(title, /số liệu cũ/);

assert.equal(countHigh({ attention: [{ severity: 'high' }, { severity: 'low' }, { severity: 'high' }] }), 2);
assert.equal(countHigh(null), 0);

assert.equal(attentionTarget({ code: 'CELL_FAILED' }), 'PLATFORM');
assert.equal(attentionTarget({ code: 'FILE_IMPORT_FAILED' }), 'MANUAL');
assert.equal(attentionTarget({ code: 'SESSION_NOT_READY' }), null, 'the session strip is already on the page');

assert.match(schedulerLine({ enabled: false }), /đang tắt/);
assert.match(schedulerLine({ enabled: true, times: ['07:30'], overdue: true, cycle: null }), /quá giờ/);
assert.match(schedulerLine({ enabled: true, times: ['07:30'], cycle: { slot: '07:30', attempts: 16, done: true, gave_up: true } }), /bỏ cuộc sau 16/);
assert.match(schedulerLine({ enabled: true, times: ['07:30'], cycle: { slot: '07:30', attempts: 2, done: true } }), /xong sau 2/);
assert.match(schedulerLine({ enabled: true, times: ['07:30'], cycle: { slot: '07:30', attempts: 3, done: false, next_attempt_at: '2026-10-22T05:00:00Z' } }), /lần tiếp theo/);

// wiring
const panel = fs.readFileSync(new URL('./ImportDailyLogPanel.jsx', import.meta.url), 'utf8');
assert.match(panel, /api\.get\('\/import\/daily-log'/);
const page = fs.readFileSync(new URL('../pages/DataImportCenter.jsx', import.meta.url), 'utf8');
assert.match(page, /setImportMode\('DAILYLOG'\)/, 'the page must have a Log ngày mới tab');
assert.match(page, /<ImportDailyLogPanel\b/);
assert.match(page, /api\.get\('\/import\/daily-log'\)/, 'the tab badge must read the daily log');

console.log('importDailyLogModel tests passed');
