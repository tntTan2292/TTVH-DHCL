import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatAnalystCause,
  formatVersusSystem,
  isNoteMandatory,
  formatMilestoneTitle,
  formatMilestoneState,
  sortEvidenceInPage,
  buildEvidenceExportFilename,
  extractEvidenceSummary,
} from './f13EvidenceHelpers.js';
import { buildWhyUnitOptions, resolveEffectiveBcvh } from './f13WhyHelpers.js';

test('f13EvidenceHelpers: formatAnalystCause translates codes to Vietnamese', () => {
  assert.equal(formatAnalystCause('KHONG_TRON_LO'), 'Không trọn lô');
  assert.equal(formatAnalystCause('KHAI_THAC'), 'Khai thác');
  assert.equal(formatAnalystCause('VAN_CHUYEN'), 'Vận chuyển');
  assert.equal(formatAnalystCause('GIAO_BUU_TA_QUA_GIO'), 'Phát - Chậm giao bưu tá');
  assert.equal(formatAnalystCause('PHAT_MUON'), 'Phát - Phát chậm sau khi giao');
  assert.equal(formatAnalystCause('KHAC'), 'Khác');
  assert.equal(formatAnalystCause('UNKNOWN'), 'UNKNOWN');
  assert.equal(formatAnalystCause(null), '—');
});

test('f13EvidenceHelpers: formatVersusSystem formats comparison labels', () => {
  assert.equal(formatVersusSystem('SAME'), 'Trùng khớp hệ thống');
  assert.equal(formatVersusSystem('DIFFERENT'), 'Khác kết luận hệ thống');
  assert.equal(formatVersusSystem('NO_SYSTEM_CAUSE'), 'Chưa có kết luận HT');
  assert.equal(formatVersusSystem(null), '—');
});

test('f13EvidenceHelpers: isNoteMandatory adheres strictly to V3 and V4 rules', () => {
  // Always mandatory for KHAC
  assert.equal(isNoteMandatory('KHAC', null), true);
  assert.equal(isNoteMandatory('KHAC', 'KHAI_THAC'), true);

  // Mandatory when parcel has a system conclusion (whether confirmed or changed)
  assert.equal(isNoteMandatory('KHAI_THAC', 'KHAI_THAC'), true);
  assert.equal(isNoteMandatory('VAN_CHUYEN', 'KHAI_THAC'), true);

  // Optional for un-explained / waiting parcel when not choosing KHAC
  assert.equal(isNoteMandatory('KHAI_THAC', null), false);
  assert.equal(isNoteMandatory('VAN_CHUYEN', ''), false);
});

test('f13EvidenceHelpers: formatMilestoneTitle and formatMilestoneState format properly', () => {
  assert.equal(formatMilestoneTitle('tms'), '1. Chấp nhận TMS');
  assert.equal(formatMilestoneTitle('ptc'), '5. Phát thành công (PTC)');
  assert.equal(formatMilestoneState('OK'), 'Đầy đủ');
  assert.equal(formatMilestoneState('SKIPPED_TOO_MANY_DAYS'), 'Bỏ qua (quá số ngày cho phép trên trang)');
});

test('f13EvidenceHelpers: sortEvidenceInPage orders items safely without mutating original', () => {
  const items = [
    { ma_bg: 'B02', ngay_do_kiem: '2026-10-22', tct: { tct_hours: 45.2 } },
    { ma_bg: 'A01', ngay_do_kiem: '2026-10-23', tct: { tct_hours: 20.0 } },
    { ma_bg: 'C03', ngay_do_kiem: '2026-10-21', tct: { tct_hours: 35.5 } },
  ];

  const sortedCodeAsc = sortEvidenceInPage(items, 'ma_bg', 'asc');
  assert.equal(sortedCodeAsc[0].ma_bg, 'A01');
  assert.equal(sortedCodeAsc[2].ma_bg, 'C03');
  // Original array preserved
  assert.equal(items[0].ma_bg, 'B02');

  const sortedTctDesc = sortEvidenceInPage(items, 'tct_hours', 'desc');
  assert.equal(sortedTctDesc[0].ma_bg, 'B02');
  assert.equal(sortedTctDesc[2].ma_bg, 'A01');
});

test('f13EvidenceHelpers: buildEvidenceExportFilename builds clean filename', () => {
  assert.equal(buildEvidenceExportFilename('2026-10-01', '2026-10-31'), 'minh-chung-f13_2026-10-01_2026-10-31.xlsx');
  assert.equal(buildEvidenceExportFilename('2026-10-01', null), 'minh-chung-f13_2026-10-01_2026-10-01.xlsx');
});

test('F13-EVIDENCE-01 U1-R4: Evidence page initial render state resolution never throws when layout is null or real mock', () => {
  // Pass 1: First render where layout is null and metaUnits is empty
  let initialOptions;
  let initialBcvh;
  assert.doesNotThrow(() => {
    initialOptions = buildWhyUnitOptions({ layout: null, metaUnits: [] });
    initialBcvh = resolveEffectiveBcvh({ currentParam: 'all', unitOptions: initialOptions, layout: null });
  }, 'First render with layout=null must never throw');
  assert.deepEqual(initialOptions, []);
  assert.equal(initialBcvh, 'all');

  // Pass 2: Layout loaded with mock city-wide account
  const mockCityLayout = {
    units: { allow_all: true, bcvh: ['530000', '530001'] },
    latest_date: '2026-11-05',
  };
  const mockMetaUnits = [
    { ma_bcvh: '530000', ten_bcvh: 'BCVH Trung tâm' },
    { ma_bcvh: '530001', ten_bcvh: 'BCVH Thuận An' },
  ];
  let cityOptions;
  let cityBcvh;
  assert.doesNotThrow(() => {
    cityOptions = buildWhyUnitOptions({ layout: mockCityLayout, metaUnits: mockMetaUnits });
    cityBcvh = resolveEffectiveBcvh({ currentParam: 'all', unitOptions: cityOptions, layout: mockCityLayout });
  }, 'Render with mock city layout must resolve cleanly');
  assert.equal(cityOptions.length, 3);
  assert.equal(cityOptions[0].value, 'all');
  assert.equal(cityOptions[0].label, 'Tất cả BCVH');
  assert.equal(cityBcvh, 'all');

  // Pass 3: Layout loaded with mock scoped account
  const mockScopedLayout = {
    units: { allow_all: false, bcvh: ['530001'] },
  };
  let scopedOptions;
  let scopedBcvh;
  assert.doesNotThrow(() => {
    scopedOptions = buildWhyUnitOptions({ layout: mockScopedLayout, metaUnits: mockMetaUnits });
    scopedBcvh = resolveEffectiveBcvh({ currentParam: 'all', unitOptions: scopedOptions, layout: mockScopedLayout });
  }, 'Render with mock scoped layout must resolve cleanly');
  assert.equal(scopedOptions.length, 1);
  assert.equal(scopedOptions[0].value, '530001');
  assert.equal(scopedBcvh, '530001'); // forced fallback from 'all' to allowed unit

  // Pass 4: Defensive empty call
  assert.doesNotThrow(() => {
    buildWhyUnitOptions();
    resolveEffectiveBcvh();
  }, 'Calling without arguments must not throw');
});

test('F13-EVIDENCE-01 U1-R6: extractEvidenceSummary extracts non-zero figures from real /why/summary payload', () => {
  // Real payload structure produced by CauseAggQueryService.summary (lines 470-520)
  const realWhySummaryPayload = {
    totals: {
      volume: 1250,
      passed: 1050,
      failed: 200,
      unrated: 0,
      distinct_bg: 1250,
      repeat: 0,
      rate: 0.84,
      shortfall_x10: 750,
      shortfall: 75,
      own_shortfall_x10: 750,
      own_shortfall: 75,
      net_contribution_x10: 750,
      net_contribution: 75,
      analysed: 60,
      analysed_mix: {
        by_cause: {
          KHONG_TRON_LO: 15,
          KHAI_THAC: 25,
          VAN_CHUYEN: 10,
          KHAC: 10,
        },
        same_as_system: 35,
        different_from_system: 20,
        no_system_cause: 5,
      },
      cause_mix: {
        lines: [
          { code: 'KHONG_TRON_LO', count: 30, share: 0.15 },
          { code: 'KHAI_THAC', count: 40, share: 0.20 },
          { code: 'VAN_CHUYEN', count: 25, share: 0.125 },
          { code: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', count: 15, share: 0.075 },
        ],
        phat: {
          count: 50,
          share: 0.25,
          by_detail: {
            CHAM_GIAO_BUU_TA: 30,
            PHAT_CHAM_SAU_GIAO: 15,
            KHONG_CHI_TIET: 5,
          },
        },
        cho_chuyen_quan: {
          count: 40,
          share: 0.20,
          by_reason: {},
        },
      },
    },
    meta: {
      basis: 'BG_DAY_ROWS',
    },
  };

  const extracted = extractEvidenceSummary(realWhySummaryPayload);

  // Assert non-zero primary KPI metrics
  assert.equal(extracted.volume, 1250);
  assert.equal(extracted.passed, 1050);
  assert.equal(extracted.failed, 200);
  assert.equal(extracted.rate, 0.84);
  assert.equal(extracted.shortfall, 75);
  assert.equal(extracted.analysed, 60);

  // Assert Chuyên quản review breakdown
  assert.equal(extracted.sameAsSystem, 35);
  assert.equal(extracted.diffFromSystem, 20);
  assert.equal(extracted.noSystemCause, 5);
  assert.equal(extracted.byCause.KHAI_THAC, 25);

  // Assert non-zero cause line counts
  assert.equal(extracted.khongTronLo, 30);
  assert.equal(extracted.khaiThac, 40);
  assert.equal(extracted.vanChuyen, 25);
  assert.equal(extracted.ktVcChuaPhanBiet, 15);
  assert.equal(extracted.chamGiao, 30);
  assert.equal(extracted.phatCham, 15);
  assert.equal(extracted.phatChuaRo, 5);
  assert.equal(extracted.choChuyenQuan, 40);

  // Sum of causes matches failed parcels (30+40+25+15+30+15+5+40 = 200)
  const totalCauses =
    extracted.khongTronLo +
    extracted.khaiThac +
    extracted.vanChuyen +
    extracted.ktVcChuaPhanBiet +
    extracted.chamGiao +
    extracted.phatCham +
    extracted.phatChuaRo +
    extracted.choChuyenQuan;
  assert.equal(totalCauses, extracted.failed);

  // Assert Vietnamese comma formatting for decimals
  const rateText = ((extracted.rate || 0) * 100).toFixed(2).replace('.', ',') + '%';
  assert.equal(rateText, '84,00%');

  const failedRateText = ((extracted.failed / extracted.volume) * 100).toFixed(2).replace('.', ',') + '%';
  assert.equal(failedRateText, '16,00%');

  const completionRate = extracted.failed > 0 ? extracted.analysed / extracted.failed : 0;
  const completionRateText = ((completionRate || 0) * 100).toFixed(1).replace('.', ',') + '%';
  assert.equal(completionRateText, '30,0%');
});



