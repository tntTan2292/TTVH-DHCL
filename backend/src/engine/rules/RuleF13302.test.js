const test = require('node:test');
const assert = require('node:assert/strict');

const RuleF13302 = require('./RuleF13302');

const rule = new RuleF13302();

test('SSOT (F13_303_DEFINITION.md): evaluates delayed only for Không đạt facts, never Đạt', () => {
  const fact = { danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' };
  assert.equal(rule.evaluate(fact), false);
});

test('SSOT: Chuyển hoàn (BLACK, danh_gia_2026 null) is bypassed entirely, even with a qualifying >3h gap', () => {
  const fact = { danh_gia_2026: null, thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' };
  assert.equal(rule.evaluate(fact), false);
});

test('SSOT: an empty-string danh_gia_2026 is also bypassed (not treated as Không đạt)', () => {
  const fact = { danh_gia_2026: '', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' };
  assert.equal(rule.evaluate(fact), false);
});

test('a Không đạt fact with a gap strictly greater than 3 hours is delayed', () => {
  const fact = { danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 11:00:01' };
  assert.equal(rule.evaluate(fact), true);
});

test('a Không đạt fact with a gap of exactly 3 hours is not delayed (strict >, not >=)', () => {
  const fact = { danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 11:00:00' };
  assert.equal(rule.evaluate(fact), false);
});

test('a Không đạt fact with a missing or invalid timestamp is not delayed', () => {
  assert.equal(rule.evaluate({ danh_gia_2026: 'Không đạt', thoi_gian_ptc: null, thoi_gian_nop_tien: '28/07/2026 11:00:01' }), false);
  assert.equal(rule.evaluate({ danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: null }), false);
  assert.equal(rule.evaluate({ danh_gia_2026: 'Không đạt', thoi_gian_ptc: 'not-a-date', thoi_gian_nop_tien: '28/07/2026 11:00:01' }), false);
});
