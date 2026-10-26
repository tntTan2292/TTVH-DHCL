import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTopOfficesOverview,
  buildCustomerBreakdown,
  computeExecutiveTriage,
} from './hangtonOverviewHelpers.js';

test('buildTopOfficesOverview sorts offices by ge5 desc then total desc and calculates percentage', () => {
  const byOffice = [
    { office: 'BCVH Phú Lộc', n: 120, cod: 15000000, n_ge5: 30 },
    { office: 'BCVH Thuận Hóa', n: 300, cod: 50000000, n_ge5: 90 },
    { office: 'BCVH Hương Trà', n: 80, cod: 8000000, n_ge5: 10 },
    { office: 'BCVH Nam Đông', n: 20, cod: 2000000, n_ge5: 0 },
    { office: 'BCVH A Lưới', n: 0, cod: 0, n_ge5: 0 }, // filtered out because n = 0
  ];

  const totalGe5 = 130;
  const top = buildTopOfficesOverview(byOffice, totalGe5, 3);

  assert.equal(top.length, 3);
  assert.equal(top[0].office, 'BCVH Thuận Hóa');
  assert.equal(top[0].n_ge5, 90);
  assert.equal(top[0].pctGe5, '69.2'); // (90 / 130) * 100

  assert.equal(top[1].office, 'BCVH Phú Lộc');
  assert.equal(top[1].n_ge5, 30);
  assert.equal(top[1].pctGe5, '23.1');

  assert.equal(top[2].office, 'BCVH Hương Trà');
  assert.equal(top[2].n_ge5, 10);
});

test('buildCustomerBreakdown sorts by CUSTOMER_ORDER and marks selected customers', () => {
  const byCustomer = [
    { customer_class: 'KH Thường', n: 2000, cod: 100000000, n_ge5: 200 },
    { customer_class: 'KH Trọng điểm', n: 50, cod: 10000000, n_ge5: 10 },
    { customer_class: 'KH Shopee', n: 300, cod: 40000000, n_ge5: 5 },
  ];

  const breakdown = buildCustomerBreakdown(byCustomer, ['KH Trọng điểm']);
  assert.equal(breakdown.length, 3);
  assert.equal(breakdown[0].customer_class, 'KH Trọng điểm');
  assert.equal(breakdown[0].isSelected, true);
  assert.equal(breakdown[1].customer_class, 'KH Shopee');
  assert.equal(breakdown[1].isSelected, false);
  assert.equal(breakdown[2].customer_class, 'KH Thường');
});

test('computeExecutiveTriage extracts critical alerts and operational recommendations', () => {
  const overview = {
    total: 1000,
    ge5: 100,
    by_level: [
      { ton_level: '<1 ngày', n: 600, cod: 50000000 },
      { ton_level: '≥3 ngày', n: 300, cod: 30000000 },
      { ton_level: '≥5 ngày', n: 70, cod: 15000000 },
      { ton_level: '≥7 ngày', n: 20, cod: 4000000 },
      { ton_level: '≥14 ngày', n: 10, cod: 2000000 },
    ],
    by_office: [
      { office: 'BCVH Thuận Hóa', n: 400, cod: 40000000, n_ge5: 60 },
      { office: 'BCVH Phú Lộc', n: 200, cod: 20000000, n_ge5: 40 },
    ],
    by_customer: [
      { customer_class: 'KH Trọng điểm', n: 30, cod: 10000000, n_ge5: 15 },
      { customer_class: 'KH Thường', n: 900, cod: 90000000, n_ge5: 85 },
    ],
  };

  const compare = {
    summary: {
      resolved: 120,
      aged_up: 45,
      new: 90,
      unchanged: 800,
    },
  };

  const triage = computeExecutiveTriage({ overview, compare, selectedCustomers: [] });

  assert.equal(triage.total, 1000);
  assert.equal(triage.ge5, 100);
  assert.equal(triage.ge14Count, 10);
  assert.equal(triage.ge7Count, 30); // 20 + 10
  assert.equal(triage.codGe5, 21000000); // 15M + 4M + 2M
  assert.equal(triage.worstOffice?.office, 'BCVH Thuận Hóa');
  assert.equal(triage.worstCustomer?.customer_class, 'KH Thường');
  assert.equal(triage.agedUp, 45);
  assert.equal(triage.newParcels, 90);
  assert.equal(triage.resolved, 120);

  // Checks action points generated
  assert.ok(triage.actionPoints.length >= 2);
  assert.ok(triage.actionPoints.some((p) => p.level === 'critical' && p.text.includes('≥14 ngày')));
  assert.ok(triage.actionPoints.some((p) => p.badge.includes('Bưu cục')));
});

test('computeExecutiveTriage handles empty/null inputs gracefully', () => {
  const triage = computeExecutiveTriage({ overview: null, compare: null });
  assert.equal(triage.total, 0);
  assert.equal(triage.ge5, 0);
  assert.equal(triage.ge7Count, 0);
  assert.equal(triage.ge14Count, 0);
  assert.equal(triage.worstOffice, null);
  assert.equal(triage.worstCustomer, null);
  assert.equal(triage.actionPoints.length, 0);
});

test('hot-spot figures: COD is the COD of the 5-days-and-more parcels, shares are named and correct', async () => {
  const { buildTopOfficesOverview: top } = await import('./hangtonOverviewHelpers.js');
  const [row] = top([{ office: 'BCVH Phú Lộc', n: 725, cod: 263415624, n_ge5: 168, cod_ge5: 90000000 }], 478, 1);
  assert.equal(row.codGe5, 90000000, 'COD of the heavy stock, not the whole-office COD');
  assert.equal(row.cod, 263415624);
  assert.equal(row.pctOfOffice, '23.2', '168 / 725');
  assert.equal(row.pctOfTotal, '35.1', '168 / 478');
  assert.equal(top([{ office: 'X', n: 10, cod: 5, n_ge5: 1 }], 1, 1)[0].codGe5, null, 'no cod_ge5 from the API: no COD claim');
});

test('triage states figures only: COD >=5 days, no advice, no assumed cause or commitment, neutral group badge', () => {
  const overview = {
    total: 100, ge5: 40,
    by_level: [{ ton_level: '≥5 ngày', n: 30, cod: 300 }, { ton_level: '≥14 ngày', n: 10, cod: 100 }],
    by_office: [{ office: 'BCVH Phú Lộc', n: 70, cod: 7000, n_ge5: 40, cod_ge5: 400 }],
    by_customer: [
      { customer_class: 'KH Thường', n: 80, cod: 8000, n_ge5: 35, cod_ge5: 350 },
      { customer_class: 'KH Mới', n: 20, cod: 2000, n_ge5: 5, cod_ge5: 50 },
    ],
  };
  const all = computeExecutiveTriage({ overview, compare: null, selectedCustomers: [] });
  const office = all.actionPoints.find((p) => p.level === 'action');
  assert.match(office.text, /COD 400/, 'the office line carries the COD of its 5-days-and-more parcels (400), not its whole COD (7.000)');
  assert.doesNotMatch(office.text, /7\.000/);
  const group = all.actionPoints.find((p) => p.level === 'customer');
  assert.match(group.text, /^KH Thường: 35 bưu gửi tồn ≥5 ngày/);
  assert.doesNotMatch(group.badge, /trọng điểm/i, 'KH Thường is not labelled a key account');
  for (const p of all.actionPoints) {
    assert.doesNotMatch(p.text, /SLA|cam kết|chăm sóc|nguyên nhân|khẩn cấp|phát dứt điểm|vu hồi|điều phối/i, `no advice or assumption: ${p.text}`);
  }
  const mine = computeExecutiveTriage({ overview, compare: null, selectedCustomers: ['KH Mới'] });
  assert.match(mine.actionPoints.find((p) => p.level === 'customer').text, /^KH Mới: 5 bưu gửi/, 'the group line follows the selection');
  const none = computeExecutiveTriage({ overview: { ...overview, by_customer: [{ customer_class: 'KH Mới', n: 20, cod: 2000, n_ge5: 0 }] }, compare: null, selectedCustomers: [] });
  assert.equal(none.actionPoints.find((p) => p.level === 'customer'), undefined, 'a group without heavy stock is not named');
});

test('nine-level rows always list all nine levels, shares add up to the whole stock', async () => {
  const { buildLevelRows } = await import('./hangtonOverviewHelpers.js');
  const { TON_LEVELS, levelsFromRank } = await import('./hangtonLevels.js');
  const rows = buildLevelRows([{ ton_level: '<1 ngày', n: 60, cod: 6 }, { ton_level: '≥5 ngày', n: 40, cod: 4 }], TON_LEVELS);
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.map((r) => r.rank), [0, 1, 1.5, 2, 3, 4, 5, 7, 14]);
  assert.equal(rows.reduce((s, r) => s + Number(r.pct), 0), 100);
  assert.equal(rows.find((r) => r.level === '≥14 ngày').count, 0);
  assert.deepEqual(levelsFromRank(5), ['≥5 ngày', '≥7 ngày', '≥14 ngày']);
  assert.deepEqual(levelsFromRank('x'), []);
});
