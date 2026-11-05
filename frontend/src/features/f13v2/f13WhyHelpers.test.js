import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatShortfall,
  formatSharePercent,
  separateRouteScopes,
  summarizeRouteMainCause,
  generateBcvhDiagnosticStory,
  sortWhyRoutes,
  formatChoChuyenQuanReason,
  CHO_CHUYEN_QUAN_REASONS,
  buildWhyUnitOptions,
  resolveEffectiveBcvh,
  groupRoutesByBcvh,
  formatCauseLabel,
  formatPhatDetail,
  formatRemainingAtArrival,
  formatPostmanName,
  sortWhyPostmen,
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

test('S1-R1: formatChoChuyenQuanReason translates every F13-WHY-DATA-02 reason to Vietnamese and keeps unknown codes', () => {
  assert.equal(formatChoChuyenQuanReason('TCT_DAI_HON_MOC'), 'Giờ TCT dài hơn mốc thực tế');
  assert.equal(formatChoChuyenQuanReason('CHAM_DEN_HAY_CHAM_GIAO'), 'Không có xác nhận đến BCVH, chưa tách được đến muộn hay giao muộn');
  assert.equal(formatChoChuyenQuanReason('MOC_A_KHONG_HOP_LE'), 'Mốc đến BCVH sai thứ tự');
  assert.equal(formatChoChuyenQuanReason('THIEU_MOC_G'), 'Thiếu mốc giao bưu tá');
  assert.equal(formatChoChuyenQuanReason('MOC_G_KHONG_HOP_LE'), 'Mốc giao bưu tá sai thứ tự');
  assert.equal(formatChoChuyenQuanReason('KHOANG_CAT_CHI_TIEU'), 'Chưa đủ chắc chắn quá hạn hay còn hạn');
  assert.equal(formatChoChuyenQuanReason('KET_QUA_KHONG_KHOP_CHI_TIEU'), 'Kết quả TCT không khớp chỉ tiêu');
  assert.equal(formatChoChuyenQuanReason('THIEU_PTC'), 'Chưa có giờ phát');
  assert.equal(formatChoChuyenQuanReason('UNKNOWN_REASON_CODE'), 'UNKNOWN_REASON_CODE');
  assert.equal(Object.keys(CHO_CHUYEN_QUAN_REASONS).length, 8);
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

test('summarizeRouteMainCause identifies dominant cause cleanly and includes S1-R1 & S1-R3 fixes', () => {
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

  // 3. Route dominated by Khâu phát with S1-R3 (KHONG_CHI_TIET)
  const routePhat = {
    failed: 43,
    cause_mix: {
      lines: [
        { code: 'GIAO_BUU_TA_QUA_GIO', count: 20, share: 0.4651 },
        { code: 'PHAT_MUON', count: 21, share: 0.4884 },
        { code: 'PHAT_KHONG_CHI_TIET', count: 2, share: 0.0465 },
      ],
      phat: {
        count: 43,
        share: 1.0,
        by_detail: { CHAM_GIAO_BUU_TA: 20, PHAT_CHAM_SAU_GIAO: 21, KHONG_CHI_TIET: 2 },
      },
    },
  };
  const summaryPhat = summarizeRouteMainCause(routePhat);
  assert.match(summaryPhat, /Khâu phát/);
  assert.match(summaryPhat, /20 chậm giao/);
  assert.match(summaryPhat, /21 phát chậm/);
  assert.match(summaryPhat, /2 không có chi tiết/);

  // 4. Route with Chờ Chuyên quản using Vietnamese labels (S1-R1)
  const routeCQ = {
    failed: 3,
    cause_mix: {
      lines: [],
      cho_chuyen_quan: {
        count: 3,
        by_reason: { KHOANG_CAT_CHI_TIEU: 2, MOC_A_KHONG_HOP_LE: 1 },
      },
    },
  };
  const summaryCQ = summarizeRouteMainCause(routeCQ);
  assert.match(summaryCQ, /Chờ Chuyên quản phân tích/);
  assert.match(summaryCQ, /Chưa đủ chắc chắn quá hạn hay còn hạn/);
  assert.match(summaryCQ, /Mốc đến BCVH sai thứ tự/);
});

test('generateBcvhDiagnosticStory produces coherent diagnostic text matching PO example with S1-R2 & S1-R3', () => {
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
        { code: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', label: 'Khai thác - Vận chuyển (chưa phân biệt)', count: 5, share: 0.0115 },
      ],
      phat: {
        count: 289,
        share: 0.6658,
        by_detail: { CHAM_GIAO_BUU_TA: 123, PHAT_CHAM_SAU_GIAO: 164, KHONG_CHI_TIET: 2 },
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

  // S1-R2: objective before BCVH lists all components including Khai thác - Vận chuyển (chưa phân biệt)
  assert.match(story.upstreamSummary, /Nguyên nhân khách quan trước bưu cục/);
  assert.match(story.upstreamSummary, /Không trọn lô: 121 BG/);
  assert.match(story.upstreamSummary, /Khai thác: 14 BG/);
  assert.match(story.upstreamSummary, /Vận chuyển: 2 BG/);
  assert.match(story.upstreamSummary, /Khai thác - Vận chuyển \(chưa phân biệt\): 5 BG/);

  // S1-R3: internal delivery causes includes "không có chi tiết" when > 0
  assert.match(story.internalSummary, /Nguyên nhân tại khâu phát/);
  assert.match(story.internalSummary, /123 bưu gửi chậm giao bưu tá/);
  assert.match(story.internalSummary, /164 bưu gửi phát chậm sau khi giao/);
  assert.match(story.internalSummary, /2 không có chi tiết/);
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

test('S1-PO1: buildWhyUnitOptions provides "Tất cả BCVH" for city-wide accounts and only unit for scoped accounts', () => {
  const metaUnits = [
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' },
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Hương Thủy' },
  ];

  // 1. City-wide account: allow_all = true
  const cityOptions = buildWhyUnitOptions({
    layout: { units: { allow_all: true, bcvh: [] } },
    metaUnits,
  });
  assert.equal(cityOptions.length, 4);
  assert.equal(cityOptions[0].value, 'all');
  assert.equal(cityOptions[0].label, 'Tất cả BCVH');
  assert.equal(cityOptions[1].value, '535790');

  // 2. Scoped single-unit account: allow_all = false, bcvh = ['535790']
  const scopedOptions = buildWhyUnitOptions({
    layout: { units: { allow_all: false, bcvh: ['535790'] } },
    metaUnits,
  });
  assert.equal(scopedOptions.length, 1);
  assert.equal(scopedOptions[0].value, '535790');
  assert.equal(scopedOptions[0].label, 'BCVH A Lưới (535790)');
  // Must NEVER have 'all' in scoped options
  assert.equal(scopedOptions.some((opt) => opt.value === 'all'), false);
});

test('S1-PO1: resolveEffectiveBcvh guarantees that selected value is ALWAYS one of the options', () => {
  const metaUnits = [
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới' },
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa' },
  ];

  // Case A: City-wide account
  const cityLayout = { units: { allow_all: true, bcvh: [] } };
  const cityOptions = buildWhyUnitOptions({ layout: cityLayout, metaUnits });

  // 1. No param provided (first open): defaults to 'all'
  const cityVal1 = resolveEffectiveBcvh({ currentParam: null, unitOptions: cityOptions, layout: cityLayout });
  assert.equal(cityVal1, 'all');
  assert.ok(cityOptions.some((opt) => opt.value === cityVal1), 'Selected value must be one of options');

  // 2. Valid unit param provided: keeps that unit
  const cityVal2 = resolveEffectiveBcvh({ currentParam: '535790', unitOptions: cityOptions, layout: cityLayout });
  assert.equal(cityVal2, '535790');
  assert.ok(cityOptions.some((opt) => opt.value === cityVal2), 'Selected value must be one of options');

  // 3. Invalid param provided: falls back to 'all'
  const cityVal3 = resolveEffectiveBcvh({ currentParam: 'invalid_code_999', unitOptions: cityOptions, layout: cityLayout });
  assert.equal(cityVal3, 'all');
  assert.ok(cityOptions.some((opt) => opt.value === cityVal3), 'Selected value must be one of options');

  // Case B: Scoped single-unit account (e.g. A Lưới only)
  const scopedLayout = { units: { allow_all: false, bcvh: ['535790'] } };
  const scopedOptions = buildWhyUnitOptions({ layout: scopedLayout, metaUnits });

  // 4. No param provided (first open): opens on its own unit
  const scopedVal1 = resolveEffectiveBcvh({ currentParam: null, unitOptions: scopedOptions, layout: scopedLayout });
  assert.equal(scopedVal1, '535790');
  assert.ok(scopedOptions.some((opt) => opt.value === scopedVal1), 'Selected value must be one of options');

  // 5. 'all' param in URL: ignored because account is scoped, resolves to its own unit
  const scopedVal2 = resolveEffectiveBcvh({ currentParam: 'all', unitOptions: scopedOptions, layout: scopedLayout });
  assert.equal(scopedVal2, '535790');
  assert.ok(scopedOptions.some((opt) => opt.value === scopedVal2), 'Selected value must be one of options');

  // 6. Another unit param in URL: ignored, resolves to its own unit
  const scopedVal3 = resolveEffectiveBcvh({ currentParam: '533140', unitOptions: scopedOptions, layout: scopedLayout });
  assert.equal(scopedVal3, '535790');
  assert.ok(scopedOptions.some((opt) => opt.value === scopedVal3), 'Selected value must be one of options');
});

test('S1-PO1: groupRoutesByBcvh groups routes per BCVH and preserves shortfall order', () => {
  const bcvhRows = [
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', own_shortfall: 309.8 },
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới', own_shortfall: 21.0 },
  ];

  const routes = [
    { ma_bcvh: '535790', ma_tuyen: 'AL1', route_scope: 'POSTMAN', volume: 50 },
    { ma_bcvh: '533140', ma_tuyen: 'TH1', route_scope: 'POSTMAN', volume: 100 },
    { ma_bcvh: '533140', ma_tuyen: 'TH_OTHER', route_scope: 'NON_POSTMAN', volume: 10 },
  ];

  const groups = groupRoutesByBcvh(routes, bcvhRows);
  assert.equal(groups.length, 2);

  // Thuận Hóa is first (from bcvhRows order)
  assert.equal(groups[0].ma_bcvh, '533140');
  assert.equal(groups[0].postmanRoutes.length, 1);
  assert.equal(groups[0].postmanRoutes[0].ma_tuyen, 'TH1');
  assert.equal(groups[0].otherRoutes.length, 1);
  assert.equal(groups[0].otherRoutes[0].ma_tuyen, 'TH_OTHER');

  // A Lưới is second
  assert.equal(groups[1].ma_bcvh, '535790');
  assert.equal(groups[1].postmanRoutes.length, 1);
  assert.equal(groups[1].postmanRoutes[0].ma_tuyen, 'AL1');
  assert.equal(groups[1].otherRoutes.length, 0);
});

test('S1-PO1: generateBcvhDiagnosticStory describes city-wide picture and which BCVHs pull it down', () => {
  const cityTotal = {
    ma_bcvh: 'all',
    ten_bcvh: 'Toàn BĐTP Huế',
    rate: 85.2,
    volume: 10000,
    passed: 8520,
    failed: 1480,
    own_shortfall: 480.0,
    cause_mix: { lines: [{ code: 'KHONG_TRON_LO', count: 300, share: 0.2027 }] },
  };

  const allBcvhRows = [
    { ma_bcvh: '533140', ten_bcvh: 'BCVH Thuận Hóa', own_shortfall: 309.8, own_shortfall_x10: 3098, share_of_parent_shortfall: 0.6454 },
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Hương Thủy', own_shortfall: 170.2, own_shortfall_x10: 1702, share_of_parent_shortfall: 0.3546 },
    { ma_bcvh: '535790', ten_bcvh: 'BCVH A Lưới', own_shortfall: 0, own_shortfall_x10: 0, share_of_parent_shortfall: 0 },
  ];

  const story = generateBcvhDiagnosticStory({
    bcvhRow: cityTotal,
    allBcvhRows,
    periodLabel: 'tháng 10/2026',
    isCityWide: true,
  });

  assert.match(story.headline, /toàn BĐTP Huế đạt tỷ lệ 85,2%/);
  assert.match(story.headline, /thiếu hụt 480 bưu gửi so với chỉ tiêu 90%/);
  assert.match(story.hotspotSummary, /kéo tụt chỉ tiêu BĐTP nhiều nhất/);
  assert.match(story.hotspotSummary, /BCVH Thuận Hóa/);
  assert.match(story.hotspotSummary, /BCVH Hương Thủy/);
  assert.match(story.hotspotSummary, /2 \/ 3 BCVH chưa đạt/);
});

test('Step 2: formatCauseLabel and formatPhatDetail translate codes cleanly to Vietnamese', () => {
  assert.equal(formatCauseLabel('KHONG_TRON_LO'), 'Không trọn lô');
  assert.equal(formatCauseLabel('KHAI_THAC'), 'Khai thác (đến BCVH quá hạn)');
  assert.equal(formatCauseLabel('VAN_CHUYEN'), 'Vận chuyển (đến BCVH quá hạn)');
  assert.equal(formatCauseLabel('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET'), 'Khai thác - Vận chuyển (chưa phân biệt)');
  assert.equal(formatCauseLabel('GIAO_BUU_TA_QUA_GIO'), 'Chậm giao bưu tá');
  assert.equal(formatCauseLabel('PHAT_MUON'), 'Phát chậm sau khi giao');
  assert.equal(formatCauseLabel('PHAT_KHONG_CHI_TIET'), 'Phát (chưa rõ chi tiết)');
  assert.equal(formatCauseLabel('CHO_CHUYEN_QUAN'), 'Chờ Chuyên quản phân tích');
  assert.equal(formatCauseLabel('UNKNOWN_CAUSE'), 'UNKNOWN_CAUSE');

  assert.equal(formatPhatDetail('CHAM_GIAO_BUU_TA'), 'Chậm giao bưu tá');
  assert.equal(formatPhatDetail('PHAT_CHAM_SAU_GIAO'), 'Phát chậm sau khi giao');
  assert.equal(formatPhatDetail('KHONG_CHI_TIET'), 'Không có chi tiết');
  assert.equal(formatPhatDetail(null), '—');
});

test('Step 2: formatRemainingAtArrival formats buckets and ms offsets', () => {
  assert.equal(formatRemainingAtArrival('over_limit'), 'Đến quá giờ');
  assert.equal(formatRemainingAtArrival('lt_3h'), 'Còn < 3h');
  assert.equal(formatRemainingAtArrival('h3_6'), 'Còn 3 - 6h');
  assert.equal(formatRemainingAtArrival('ge_6h'), 'Còn ≥ 6h');

  assert.equal(formatRemainingAtArrival(-1000), 'Đến quá giờ');
  assert.equal(formatRemainingAtArrival(3600000), 'Còn < 3h');
  assert.equal(formatRemainingAtArrival(14400000), 'Còn 3 - 6h');
  assert.equal(formatRemainingAtArrival(25000000), 'Còn ≥ 6h');
  assert.equal(formatRemainingAtArrival(null), '—');
});

test('Step 2: formatPostmanName formats postmen and preserves "Chưa có bưu tá" bucket', () => {
  assert.equal(formatPostmanName(null, 'NONE'), 'Chưa có bưu tá');
  assert.equal(formatPostmanName(null, null), 'Chưa có bưu tá');
  assert.equal(formatPostmanName('Nguyễn Văn A', 'BT01'), 'Nguyễn Văn A (BT01)');
  assert.equal(formatPostmanName('Nguyễn Văn B', null), 'Nguyễn Văn B');
  assert.equal(formatPostmanName(null, 'BT99'), 'Bưu tá BT99');
});

test('Step 2: sortWhyPostmen sorts postmen rows by various criteria', () => {
  const list = [
    { ma_buu_ta: 'B1', ten_buu_ta: 'Nguyễn Văn B', own_shortfall_x10: 200, volume: 150, rate: 70 },
    { ma_buu_ta: 'A1', ten_buu_ta: 'Trần Văn A', own_shortfall_x10: 500, volume: 300, rate: 50 },
    { ma_buu_ta: null, ten_buu_ta: 'Chưa có bưu tá', own_shortfall_x10: 100, volume: 50, rate: 80 },
  ];

  const byShortfallDesc = sortWhyPostmen(list, 'own_shortfall', 'desc');
  assert.equal(byShortfallDesc[0].ma_buu_ta, 'A1');
  assert.equal(byShortfallDesc[1].ma_buu_ta, 'B1');
  assert.equal(byShortfallDesc[2].ma_buu_ta, null);

  const byVolumeDesc = sortWhyPostmen(list, 'volume', 'desc');
  assert.equal(byVolumeDesc[0].ma_buu_ta, 'A1');
  assert.equal(byVolumeDesc[1].ma_buu_ta, 'B1');
  assert.equal(byVolumeDesc[2].ma_buu_ta, null);

  const byNameAsc = sortWhyPostmen(list, 'ten_buu_ta', 'asc');
  assert.equal(byNameAsc[0].ten_buu_ta, 'Chưa có bưu tá');
});
