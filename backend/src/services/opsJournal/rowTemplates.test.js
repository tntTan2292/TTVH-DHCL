// OPS-JOURNAL-01: the drafted rows follow the PL06 journals; F1.2 is worked by the indicator specialist alone (PO 2026-10-30).
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildRows } = require('./rowTemplates');

const DUNG = { id: 9, name: 'Nguyễn Anh Dũng', position: 'CHUYEN_QUAN', byIndicator: true, byOffice: false };
const GD = { id: 1, name: 'GD', position: 'GD_BCVH', byOffice: true, byIndicator: false };
const metrics = { rate: 78.9, total: 511, fail: 108, compareRate: 99.3, delta: -20.5, mtdRate: 96.6, day: '2026-10-20' };

test('F1.2: four rows, all on the indicator specialist; the Phường/Xã director and the clerk are named in the text, not assigned', () => {
    const rows = buildRows({ day: '2026-10-21', indicator: 'F1.2', scopeType: 'BCVH', title: 'F1.2 - Khách hàng lớn', officeCode: '531120', metrics }, [DUNG, GD]);
    assert.equal(rows.length, 4);
    for (const row of rows) assert.deepEqual(row.assigneeUserIds, [9], 'no GĐ BCVH on an F1.2 row');
    assert.match(rows[1].what, /Giám đốc Bưu điện Phường\/Xã hoặc Giao dịch viên tại Khách hàng lớn/);
    assert.match(rows[3].expectedResult, /\(99,3%\).*chỉ tiêu 95%/);
    assert.match(rows[0].what, /^Rà soát toàn bộ 108 bưu gửi không đạt F1.2 tại Khách hàng lớn ngày 20\/10/);
});

test('F1.2 with no specialist on record leaves the rows open for the manager', () => {
    const rows = buildRows({ day: '2026-10-21', indicator: 'F1.2', scopeType: 'BCVH', title: 'F1.2 - Khách hàng lớn', officeCode: '531120', metrics }, [GD]);
    assert.ok(rows.every((r) => r.assigneeUserIds.length === 0));
});
