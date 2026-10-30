import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWelcomeText } from './welcomeMessage.js';

test('welcome text carries the position label and the full name', () => {
  assert.equal(
    buildWelcomeText({ display_name: 'Mai Văn Mười', access: { positionLabel: 'Giám đốc TTVH' } }),
    'Chào mừng Giám đốc TTVH Mai Văn Mười vào hệ thống',
  );
});

test('admin account is not given a second title; missing name falls back to username', () => {
  assert.equal(buildWelcomeText({ display_name: 'Quản trị viên', access: { positionLabel: 'Quản trị hệ thống' } }), 'Chào mừng Quản trị viên vào hệ thống');
  assert.equal(buildWelcomeText({ username: '00061945' }), 'Chào mừng 00061945 vào hệ thống');
  assert.equal(buildWelcomeText(null), '');
});
