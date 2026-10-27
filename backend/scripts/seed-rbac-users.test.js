'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRows } = require('./seed-rbac-users');

const row = (hrm, name, title, unit, indicator) => ({
    'Mã HRM': hrm, 'Họ và tên': name, 'Chức vụ': title, 'Đơn vị quản lý': unit, 'Chỉ tiêu quản lý': indicator,
});

test('maps titles to tiers and units/indicators to scopes', () => {
    const users = parseRows([
        row('1', 'A', 'Chuyên quản', 'BCVH Phú Lộc, BCVH A Lưới', ''),
        row('2', 'B', 'Chuyên quản', 'BCVH Hương Trà', 'F1.1'),
        row('3', 'C', 'Chuyên quản', 'Không', 'F1.2'),
        row('4', 'D', 'IT BĐTP', '', ''),
        row('5', 'E', 'Giám đốc BCVH', 'BCVH Thuận Hóa', ''),
        row('6', 'F', 'Lãnh đạo TTVH', '', ''),
    ]);
    assert.deepEqual(users.map((u) => u.tier), ['STAFF', 'STAFF', 'STAFF', 'LEADER', 'STAFF', 'LEADER']);
    assert.deepEqual(users[0].bcvh, ['537220', '535790']);
    assert.deepEqual(users[1], { username: '2', displayName: 'B', tier: 'STAFF', position: 'CHUYEN_QUAN', bcvh: ['535470'], indicators: ['F1.1'] });
    // HANGTON-HANDLING-01: the "Chức vụ" also becomes the position
    assert.deepEqual(users.map((u) => u.position), ['CHUYEN_QUAN', 'CHUYEN_QUAN', 'CHUYEN_QUAN', 'IT_BDTP', 'GD_BCVH', 'LD_TTVH']);
    assert.deepEqual(users[2].bcvh, []);
    assert.deepEqual(users[2].indicators, ['F1.2']);
});

test('stops on an unknown unit, an empty staff row and a duplicate HRM code', () => {
    assert.throws(() => parseRows([row('1', 'A', 'Chuyên quản', 'BCVH Không Có', '')]), /không nhận ra đơn vị/);
    assert.throws(() => parseRows([row('1', 'A', 'Chuyên quản', 'Không', '')]), /không có đơn vị/);
    assert.throws(() => parseRows([
        row('1', 'A', 'Giám đốc BCVH', 'BCVH Thuận Hóa', ''),
        row('1', 'B', 'Giám đốc BCVH', 'BCVH Thuận An', ''),
    ]), /trùng/);
});

test('rejects an indicator the database would refuse (before any write) and reads decomposed diacritics', () => {
    assert.throws(() => parseRows([row('1', 'A', 'Chuyên quản', 'Không', 'F9.9')]), /không hợp lệ/);
    assert.equal(parseRows([row('1', 'A', 'Chuyên quản', 'Không', 'hangton')])[0].indicators[0], 'HANGTON');
    const decomposed = 'Lãnh đạo BĐTP'.normalize('NFD');
    assert.equal(parseRows([row('2', 'B', decomposed, '', '')])[0].tier, 'LEADER');
});
