const test = require('node:test');
const assert = require('node:assert/strict');

const RuleRegistry = require('./RuleRegistry');
const RuleF13302 = require('./RuleF13302');

function freshRegistry() {
  // RuleRegistry is exported as a singleton; register RuleF13302 once if not already present,
  // mirroring how F13DashboardService lazily registers it.
  if (!RuleRegistry.rules.some((r) => r?.id === 'RULE_F13_302')) {
    RuleRegistry.register(new RuleF13302());
  }
  return RuleRegistry;
}

test('SSOT (F13_303_DEFINITION.md, Section 3): denominator is Tổng số BG Không đạt, excluding Đạt and Chuyển hoàn (BLACK)', () => {
  const registry = freshRegistry();
  const facts = [
    { danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 09:00:00' },
    { danh_gia_2026: null, thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' }, // BLACK, would qualify if included
    { danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 12:00:01' }, // delayed
    { danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 09:00:00' }, // not delayed
  ];

  const result = registry.execute(facts);

  assert.equal(result.total_failed, 2); // denominator = Không đạt count only, not 3
  assert.equal(result.total_late_payment, 1);
  assert.equal(result.f13_303_rate, 50);
});

test('zero Không đạt facts publish rate 0, not a division-by-zero error', () => {
  const registry = freshRegistry();
  const facts = [
    { danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '28/07/2026 09:00:00' },
    { danh_gia_2026: null, thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' },
  ];

  const result = registry.execute(facts);

  assert.equal(result.total_failed, 0);
  assert.equal(result.total_late_payment, 0);
  assert.equal(result.f13_303_rate, 0);
});

test('is_late_payment is only ever assigned true for a delayed Không đạt fact, never for BLACK or Đạt', () => {
  const registry = freshRegistry();
  const blackFact = { danh_gia_2026: null, thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' };
  const datFact = { danh_gia_2026: 'Đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' };
  const delayedFact = { danh_gia_2026: 'Không đạt', thoi_gian_ptc: '28/07/2026 08:00:00', thoi_gian_nop_tien: '29/07/2026 08:00:00' };

  registry.execute([blackFact, datFact, delayedFact]);

  assert.equal(blackFact.is_late_payment, false);
  assert.equal(datFact.is_late_payment, false);
  assert.equal(delayedFact.is_late_payment, true);
});
