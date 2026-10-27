import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  triggerText,
  canDeleteSnapshot,
  formatCapturedAt,
  snapshotSlotLabel,
  buildSlotRows,
  groupRecentByDate,
  runResultText,
  formatBusinessDate,
} from './hangtonImportModel.js';
import { formatSlot, formatSnapshotLabel } from '../hangtonLevels.js';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('extra (manual) points are labelled with their own time; scheduled slots keep the clock', () => {
  assert.equal(formatSlot('0730'), '07:30');
  assert.equal(formatSlot('M104532'), 'Thủ công 10:45');
  assert.equal(formatSlot('M000500'), 'Thủ công 00:05');
  assert.equal(formatSlot('M1045'), 'M1045', 'not a manual slot: shown as stored');
  assert.equal(formatSnapshotLabel({ business_date: '2026-10-27', slot: 'M104532' }), '2026-10-27 Thủ công 10:45');
  assert.equal(snapshotSlotLabel({ slot: 'M104532' }), 'Thủ công 10:45');
  assert.equal(snapshotSlotLabel(null), '—');
});

test('only manual points and make-ups can be deleted from the screen', () => {
  assert.equal(canDeleteSnapshot({ trigger: 'MANUAL' }), true);
  assert.equal(canDeleteSnapshot({ trigger: 'MAKEUP' }), true);
  assert.equal(canDeleteSnapshot({ trigger: 'SCHEDULE' }), false);
  assert.equal(canDeleteSnapshot(null), false);
  assert.equal(triggerText('SCHEDULE'), 'Lịch tự động');
  assert.equal(triggerText('MANUAL'), 'Thủ công');
  assert.equal(triggerText('MAKEUP'), 'Lấy bù');
  assert.equal(triggerText(undefined), '—');
});

test('today slot rows: taken / missed (make-up offered) / waiting', () => {
  const status = {
    slots: [
      { slot: '0730', clock: '07:30', due: true, state: 'OK', snapshot: { captured_at: '2026-10-27T00:31:00.000Z', kept_row_count: 4030, trigger: 'SCHEDULE' } },
      { slot: '1130', clock: '11:30', due: true, state: 'MISSED', snapshot: null },
      { slot: '2100', clock: '21:00', due: false, state: 'WAITING', snapshot: null },
    ],
  };
  const rows = buildSlotRows(status);
  assert.deepEqual(rows.map((r) => [r.clock, r.state, r.canMakeup]), [['07:30', 'OK', false], ['11:30', 'MISSED', true], ['21:00', 'WAITING', false]]);
  assert.match(rows[0].text, /^Đã lấy lúc \d{2}:\d{2} \d{2}\/\d{2}$/);
  assert.equal(rows[0].kept, 4030);
  assert.equal(rows[0].fromText, 'Lịch tự động');
  assert.equal(rows[1].text, 'Đã lỡ, chưa có dữ liệu');
  assert.equal(rows[1].kept, null);
  assert.equal(rows[2].text, 'Chưa đến giờ');
  assert.deepEqual(buildSlotRows(null), []);
});

test('recent snapshots are grouped by date, order kept', () => {
  const groups = groupRecentByDate([
    { id: 5, business_date: '2026-10-27', slot: 'M104532' },
    { id: 4, business_date: '2026-10-27', slot: '0730' },
    { id: 3, business_date: '2026-10-26', slot: '2100' },
  ]);
  assert.deepEqual(groups.map((g) => [g.date, g.rows.map((r) => r.id)]), [['2026-10-27', [5, 4]], ['2026-10-26', [3]]]);
  assert.deepEqual(groupRecentByDate([]), []);
});

test('formatting of the captured time, dates and run results', () => {
  assert.equal(formatCapturedAt('not a date'), '—');
  assert.match(formatCapturedAt(new Date(2026, 9, 27, 9, 5).toISOString()), /^09:05 27\/10$/);
  assert.equal(formatBusinessDate('2026-10-27'), '27/10/2026');
  assert.equal(formatBusinessDate(''), '—');
  assert.equal(runResultText({ keptRows: 4030, sourceRows: 11931, isStale: false }, 'Lấy hàng tồn'), 'Lấy hàng tồn xong: 4.030 bưu gửi (cổng trả 11.931).');
  assert.match(runResultText({ keptRows: 1, sourceRows: 2, isStale: true }), /Cổng chưa làm mới/);
  assert.equal(runResultText(null), '');
});

test('client calls the admin Import endpoints with the agreed bodies', () => {
  const client = read('./hangtonImportClient.js');
  assert.match(client, /api\.get\('\/import\/hangton\/status'\)/);
  assert.match(client, /api\.post\('\/import\/hangton\/snapshots', \{ kind: 'MANUAL' \}\)/);
  assert.match(client, /api\.post\('\/import\/hangton\/snapshots', \{ kind: 'MAKEUP', slot \}\)/);
  assert.match(client, /api\.delete\(`\/import\/hangton\/snapshots\/\$\{id\}`\)/);
});

test('panel: manual button, make-up only for missed slots, delete with confirmation, no interval or cap wording', () => {
  const panel = read('./HangtonImportPanel.jsx');
  assert.match(panel, /Lấy hàng tồn ngay/);
  assert.match(panel, /row\.canMakeup/);
  assert.match(panel, /runHangtonMakeupSnapshot\(row\.slot\)/);
  assert.match(panel, /canDeleteSnapshot\(/);
  assert.match(panel, /<Modal/, 'delete asks for confirmation');
  assert.match(panel, /disabled=\{busy\}/, 'one fetch at a time: buttons are disabled while one runs');
  assert.match(panel, /không ghi đè mốc của lịch/);
  assert.doesNotMatch(panel, /tối đa|giãn cách/i, 'PO: no interval and no daily cap');
  assert.doesNotMatch(panel, /text-xs|text-\[(9|10|11)px\]/, 'text of 14 px and more');
});

test('Import Center has the Hàng tồn tab and renders the panel', () => {
  const page = fs.readFileSync(new URL('../../../pages/DataImportCenter.jsx', import.meta.url), 'utf8');
  assert.match(page, /import HangtonImportPanel from '\.\.\/features\/hangton\/import\/HangtonImportPanel'/);
  assert.match(page, /setImportMode\('HANGTON'\)/);
  assert.match(page, /data-testid="tab-hangton"/);
  assert.match(page, /\{importMode === 'HANGTON' && <HangtonImportPanel \/>\}/);
});
