'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateNewPassword } = require('./passwordPolicy');

test('accepts a password with 8+ characters, upper, lower and special character', () => {
    assert.deepEqual(validateNewPassword('Hue#2026x', { username: '00062571' }), []);
});

test('rejects too short, missing upper, lower or special character', () => {
    assert.ok(validateNewPassword('Ab#1').length >= 1);
    assert.ok(validateNewPassword('hue#2026x').some((m) => /chữ hoa/.test(m)));
    assert.ok(validateNewPassword('HUE#2026X').some((m) => /chữ thường/.test(m)));
    assert.ok(validateNewPassword('Hue20262026').some((m) => /đặc biệt/.test(m)));
});

test('rejects the username and an unchanged password', () => {
    assert.ok(validateNewPassword('Abc#defg', { username: 'abc#defg' }).some((m) => /tên đăng nhập/.test(m)));
    assert.ok(validateNewPassword('Hue#2026x', { isSameAsCurrent: true }).some((m) => /khác mật khẩu hiện tại/.test(m)));
});
