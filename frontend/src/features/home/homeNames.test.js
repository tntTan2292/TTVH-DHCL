import test from 'node:test';
import assert from 'node:assert/strict';
import { shortBcvhName, shortProvinceName } from './homeNames.js';

test('shortProvinceName drops the Bưu điện prefix only', () => {
  assert.equal(shortProvinceName('Bưu điện Tỉnh Thừa Thiên Huế'), 'Tỉnh Thừa Thiên Huế');
  assert.equal(shortProvinceName('Bưu điện TP Hà Nội'), 'TP Hà Nội');
  assert.equal(shortProvinceName('Tỉnh Nghệ An'), 'Tỉnh Nghệ An');
  assert.equal(shortProvinceName(null), '');
});

test('shortBcvhName drops the BCVH prefix only', () => {
  assert.equal(shortBcvhName('BCVH Hương Thủy'), 'Hương Thủy');
  assert.equal(shortBcvhName('Khách hàng lớn'), 'Khách hàng lớn');
});
