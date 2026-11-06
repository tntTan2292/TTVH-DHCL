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


