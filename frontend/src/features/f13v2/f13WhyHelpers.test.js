import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatShortfall,
  formatSharePercent,
  separateRouteScopes,
  summarizeRouteMainCause,
  generateBcvhDiagnosticStory,
  sortWhyRoutes,
} from './f13WhyHelpers.js';

test('formatShortfall formats integer and decimal values with Vietnamese locale', () => {
  assert.equal(formatShortfall(null), '—');
  assert.equal(formatShortfall(undefined), '—');
  assert.equal(formatShortfall(0), '0');
  assert.equal(formatShortfall(261), '261');
  assert.equal(formatShortfall(309.8), '309,8');
  assert.equal(formatShortfall(99.9), '99,9');
});

test('formatSharePercent formats ratio to percentage with 1 decimal place', () => {
  assert.equal(formatSharePercent(null), '—');
  assert.equal(formatSharePercent(undefined), '—');
  assert.equal(formatSharePercent(0.267), '26,7%');
  assert.equal(formatSharePercent(0.423), '42,3%');
  assert.equal(formatSharePercent(0.9824), '98,2%');
  assert.equal(formatSharePercent(1), '100,0%');
});

test('separateRouteScopes separates POSTMAN routes from NON_POSTMAN and OTHER routes', () => {
  const routes = [
    { ma_tuyen: 'T1', route_scope: 'POSTMAN', volume: 100 },
    { ma_tuyen: null, route_scope: 'NON_POSTMAN', volume: 50 },
    { ma_tuyen: 'T2', route_scope: 'POSTMAN', volume: 120 },
    { ma_tuyen: null, route_scope: 'OTHER', volume: 10 },
  ];

  const { postmanRoutes, otherRoutes } = separateRouteScopes(routes);
  assert.equal(postmanRoutes.length, 2);
  assert.equal(postmanRoutes[0].ma_tuyen, 'T1');
  assert.equal(postmanRoutes[1].ma_tuyen, 'T2');

  assert.equal(otherRoutes.length, 2);
  assert.equal(otherRoutes[0].route_scope, 'NON_POSTMAN');
  assert.equal(otherRoutes[1].route_scope, 'OTHER');
});

test('summarizeRouteMainCause identifies dominant cause cleanly', () => {
  // 1. Perfect route
  assert.equal(summarizeRouteMainCause({ failed: 0 }), '100% đạt chỉ tiêu');

  // 2. Route dominated by Không trọn lô
  const routeKTL = {
    failed: 114,
    cause_mix: {
      lines: [
        { code: 'KHONG_TRON_LO', label: 'Không trọn lô', count: 112, share: 0.9824 },
        { code: 'PHAT_MUON', label: 'Phát chậm sau khi giao', count: 2, share: 0.0175 },
      ],
      phat: { count: 2, share: 0.0175, by_detail: { CHAM_GIAO_BUU_TA: 0, PHAT_CHAM_SAU_GIAO: 2 } },
    },
  };
  const summaryKTL = summarizeRouteMainCause(routeKTL);
  assert.match(summaryKTL, /Không trọn lô/);
  assert.match(summaryKTL, /98,2%/);
  assert.match(summaryKTL, /112 BG/);

  // 3. Route dominated by Khâu phát
  const routePhat = {
    failed: 41,
    cause_mix: {
      lines: [
        { code: 'GIAO_BUU_TA_QUA_GIO', count: 20, share: 0.4878 },
        { code: 'PHAT_MUON', count: 21, share: 0.5122 },
      ],
      phat: {
        count: 41,
        share: 1.0,
        by_detail: { CHAM_GIAO_BUU_TA: 20, PHAT_CHAM_SAU_GIAO: 21 },
      },
    },
  };
  const summaryPhat = summarizeRouteMainCause(routePhat);
  assert.match(summaryPhat, /Khâu phát/);
  assert.match(summaryPhat, /20 chậm giao/);
  assert.match(summaryPhat, /21 phát chậm/);
});

test('generateBcvhDiagnosticStory produces coherent diagnostic text matching PO example', () => {
  const bcvhRow = {
    ten_bcvh: 'BCVH Thuận Hóa',
    rate: 72.6,
    volume: 1782,
    passed: 1294,
    failed: 434,
    own_shortfall: 309.8,
    own_shortfall_x10: 3098,
    cause_mix: {
      lines: [
        { code: 'KHONG_TRON_LO', label: 'Không trọn lô', count: 121, share: 0.2788 },
        { code: 'KHAI_THAC', label: 'Khai thác (đến BCVH quá hạn)', count: 14, share: 0.0322 },
        { code: 'VAN_CHUYEN', label: 'Vận chuyển (đến BCVH quá hạn)', count: 2, share: 0.0046 },
      ],
      phat: {
        count: 289,
        share: 0.6658,
        by_detail: { CHAM_GIAO_BUU_TA: 123, PHAT_CHAM_SAU_GIAO: 164 },
      },
    },
  };

  const postmanRoutes = [
    {
      ma_tuyen: '533140149',
      ten_tuyen: 'Ô tô Nam giữa',
      volume: 141,
      passed: 27,
      failed: 114,
      rate: 19.1,
      own_shortfall: 99.9,
      own_shortfall_x10: 999,
    },
    {
      ma_tuyen: '53314047',
      ten_tuyen: 'Tuyến 47',
      volume: 100,
      passed: 55,
      failed: 45,
      rate: 55.0,
      own_shortfall: 35.0,
      own_shortfall_x10: 350,
    },
  ];

  const story = generateBcvhDiagnosticStory({
    bcvhRow,
    postmanRoutes,
    periodLabel: 'ngày 28/10/2026',
  });

  assert.match(story.headline, /28\/10\/2026/);
  assert.match(story.headline, /BCVH Thuận Hóa/);
  assert.match(story.headline, /72,6%/);
  assert.match(story.headline, /309,8/);

  assert.match(story.hotspotSummary, /tuyến phát cần chú ý/);
  assert.match(story.hotspotSummary, /Ô tô Nam giữa/);

  assert.match(story.upstreamSummary, /Nguyên nhân khách quan trước bưu cục/);
  assert.match(story.upstreamSummary, /Không trọn lô: 121 BG/);

  assert.match(story.internalSummary, /Nguyên nhân tại khâu phát/);
  assert.match(story.internalSummary, /123 bưu gửi chậm giao bưu tá/);
  assert.match(story.internalSummary, /164 bưu gửi phát chậm/);
});

test('sortWhyRoutes sorts properly in ascending and descending directions', () => {
  const routes = [
    { ma_tuyen: 'A', own_shortfall_x10: 50, volume: 100, rate: 80 },
    { ma_tuyen: 'B', own_shortfall_x10: 200, volume: 300, rate: 60 },
    { ma_tuyen: 'C', own_shortfall_x10: 100, volume: 150, rate: 70 },
  ];

  const sortedDesc = sortWhyRoutes(routes, 'own_shortfall', 'desc');
  assert.equal(sortedDesc[0].ma_tuyen, 'B');
  assert.equal(sortedDesc[1].ma_tuyen, 'C');
  assert.equal(sortedDesc[2].ma_tuyen, 'A');

  const sortedAsc = sortWhyRoutes(routes, 'own_shortfall', 'asc');
  assert.equal(sortedAsc[0].ma_tuyen, 'A');
  assert.equal(sortedAsc[1].ma_tuyen, 'C');
  assert.equal(sortedAsc[2].ma_tuyen, 'B');
});
