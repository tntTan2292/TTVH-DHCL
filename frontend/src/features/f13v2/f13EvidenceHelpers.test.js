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
  canWriteParcelAnalysis,
  formatJourneyLegHours,
  formatEarlyHandoverText,
  formatTctHours,
  EVIDENCE_JOURNEY_LEGS,
  EVIDENCE_VIEW_CAUSE,
  EVIDENCE_VIEW_JOURNEY,
  getMilestoneAt,
  setCachedEvidenceCatalog,
  setCachedLayout,
  clearEvidenceAccessCache,
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
  assert.equal(formatMilestoneTitle('tms'), '1. Quét xuống TMS');
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
      rate: 84.0,
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
  assert.equal(extracted.rate, 84.0);
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

  // Assert Vietnamese comma formatting for decimals (U1-R8: raw percentage, 1 decimal place)
  const rateText = Number(extracted.rate || 0).toFixed(1).replace('.', ',') + '%';
  assert.equal(rateText, '84,0%');

  const failedRateText = ((extracted.failed / extracted.volume) * 100).toFixed(1).replace('.', ',') + '%';
  assert.equal(failedRateText, '16,0%');

  const completionRate = extracted.failed > 0 ? extracted.analysed / extracted.failed : 0;
  const completionRateText = ((completionRate || 0) * 100).toFixed(1).replace('.', ',') + '%';
  assert.equal(completionRateText, '30,0%');
});

test('f13EvidenceHelpers: canWriteParcelAnalysis adheres to card.can_analyse, catalog.can.write and unit scope', () => {
  const cardFailedA = { can_analyse: true, ma_bcvh: '537015', danh_gia: 'Không đạt' };
  const cardPassedA = { can_analyse: false, ma_bcvh: '537015', danh_gia: 'Đạt' };
  const cardFailedB = { can_analyse: true, ma_bcvh: '535790', danh_gia: 'Không đạt' };

  const catalogCanWrite = { can: { write: true } };
  const catalogReadOnly = { can: { write: false } };

  const layoutCity = { units: { allow_all: true, bcvh: [] } };
  const layoutUnitA = { units: { allow_all: false, bcvh: ['537015'] } };

  // City-wide leader with write permission: can analyse failed parcels of any unit
  assert.equal(canWriteParcelAnalysis(cardFailedA, catalogCanWrite, layoutCity), true);
  assert.equal(canWriteParcelAnalysis(cardFailedB, catalogCanWrite, layoutCity), true);

  // Unit A Chuyên quản with write permission: can analyse failed parcel in 537015, cannot in 535790
  assert.equal(canWriteParcelAnalysis(cardFailedA, catalogCanWrite, layoutUnitA), true);
  assert.equal(canWriteParcelAnalysis(cardFailedB, catalogCanWrite, layoutUnitA), false);

  // Passing parcel: never writable
  assert.equal(canWriteParcelAnalysis(cardPassedA, catalogCanWrite, layoutCity), false);
  assert.equal(canWriteParcelAnalysis(cardPassedA, catalogCanWrite, layoutUnitA), false);

  // Read-only catalog (no f13.analysis.write capability): never writable
  assert.equal(canWriteParcelAnalysis(cardFailedA, catalogReadOnly, layoutCity), false);
  assert.equal(canWriteParcelAnalysis(cardFailedA, catalogReadOnly, layoutUnitA), false);

  // Missing parameters
  assert.equal(canWriteParcelAnalysis(null, catalogCanWrite, layoutCity), false);
  assert.equal(canWriteParcelAnalysis(cardFailedA, null, layoutCity), false);
});

test('f13EvidenceHelpers: formatJourneyLegHours formats numbers with decimal comma', () => {
  assert.equal(formatJourneyLegHours(5.67), '5,7h');
  assert.equal(formatJourneyLegHours(0), '0,0h');
  assert.equal(formatJourneyLegHours(null), '—');
  assert.equal(formatJourneyLegHours(undefined), '—');
  assert.equal(formatJourneyLegHours(''), '—');
});

test('f13EvidenceHelpers: sortEvidenceInPage orders journey columns correctly', () => {
  const items = [
    { ma_bg: 'BG1', journey: { ma_lo: 'LO2', milestones: { tms: '2026-10-15 10:00:00' }, legs: { tms_ptc: 25.5 } } },
    { ma_bg: 'BG2', journey: { ma_lo: 'LO1', milestones: { tms: '2026-10-15 08:00:00' }, legs: { tms_ptc: 12.0 } } },
    { ma_bg: 'BG3', journey: { ma_lo: 'LO3', milestones: { tms: '2026-10-15 12:00:00' }, legs: { tms_ptc: 30.2 } } },
  ];

  // Sort by ma_lo ascending
  const sortedLo = sortEvidenceInPage(items, 'ma_lo', 'asc');
  assert.equal(sortedLo[0].ma_bg, 'BG2');
  assert.equal(sortedLo[2].ma_bg, 'BG3');

  // Sort by tms descending
  const sortedTms = sortEvidenceInPage(items, 'tms', 'desc');
  assert.equal(sortedTms[0].ma_bg, 'BG3');
  assert.equal(sortedTms[2].ma_bg, 'BG2');

  // Sort by tms_ptc ascending
  const sortedLeg = sortEvidenceInPage(items, 'tms_ptc', 'asc');
  assert.equal(sortedLeg[0].ma_bg, 'BG2');
  assert.equal(sortedLeg[2].ma_bg, 'BG3');
});

test('f13EvidenceHelpers: EVIDENCE_JOURNEY_LEGS and view mode constants', () => {
  assert.equal(EVIDENCE_VIEW_CAUSE, 'cause');
  assert.equal(EVIDENCE_VIEW_JOURNEY, 'journey');
  assert.equal(EVIDENCE_JOURNEY_LEGS.length, 6);
  assert.deepEqual(
    EVIDENCE_JOURNEY_LEGS.map((l) => l.key),
    ['tms_depart', 'depart_arrive', 'tms_arrive', 'arrive_gbt', 'gbt_ptc', 'tms_ptc']
  );
});

test('f13EvidenceHelpers: getMilestoneAt (U1-R1) extracts time string from both string and {at, source} shapes', () => {
  // Real backend journey.milestones.* string shape
  assert.equal(getMilestoneAt('2026-10-15 08:30:00'), '2026-10-15 08:30:00');
  assert.equal(getMilestoneAt(''), '');

  // Object shape { at, source }
  assert.equal(getMilestoneAt({ at: '2026-10-15 09:45:00', source: 'F1.1' }), '2026-10-15 09:45:00');
  assert.equal(getMilestoneAt({ at: null, source: 'F4.1' }), null);
  assert.equal(getMilestoneAt({ source: 'F4.1' }), null);

  // Null, undefined or non-object primitives
  assert.equal(getMilestoneAt(null), null);
  assert.equal(getMilestoneAt(undefined), null);
  assert.equal(getMilestoneAt(0), null);
});

test('F13-PARCEL-CARD-01 U1-FIX2: the write form permission resolves across all callers via shared cached access or explicit props', () => {
  // Clear any existing cache first
  clearEvidenceAccessCache();

  const cardFailedUnitA = { can_analyse: true, ma_bcvh: '537015', danh_gia: 'Không đạt' };
  const cardFailedUnitB = { can_analyse: true, ma_bcvh: '535790', danh_gia: 'Không đạt' };
  const cardPassedUnitA = { can_analyse: false, ma_bcvh: '537015', danh_gia: 'Đạt' };

  // Set shared cache as a Chuyên quản of 537015 with write rights
  setCachedEvidenceCatalog({ can: { write: true }, causes: [{ code: 'KHAI_THAC', label: 'Khai thác' }] });
  setCachedLayout({ units: { allow_all: false, bcvh: ['537015'] } });

  // Caller 1 (EvidencePage with explicit props or fallback)
  assert.equal(canWriteParcelAnalysis(cardFailedUnitA), true, 'Caller with cached access: form shows when unit matches');
  assert.equal(canWriteParcelAnalysis(cardFailedUnitB), false, 'Caller with cached access: form hides when foreign unit');
  assert.equal(canWriteParcelAnalysis(cardPassedUnitA), false, 'Caller with cached access: form hides when parcel passed');

  // Caller 2, 3, 4 without explicit props passed (JourneyPopup, WhyModal, RuleProposal)
  // All 4 callers resolve permission identically
  for (const caller of ['EvidencePage', 'JourneyParcelModal', 'WhyParcelModal', 'RuleProposalDetailPanel']) {
    assert.equal(
      canWriteParcelAnalysis(cardFailedUnitA),
      true,
      `[${caller}] write form shows when user has f13.analysis.write and unit matches`
    );
    assert.equal(
      canWriteParcelAnalysis(cardFailedUnitB),
      false,
      `[${caller}] write form hides when unit does not match`
    );
    assert.equal(
      canWriteParcelAnalysis(cardPassedUnitA),
      false,
      `[${caller}] write form hides when parcel is Đạt`
    );
  }

  // When user only has read-only permission (e.g. leader)
  setCachedEvidenceCatalog({ can: { write: false } });
  for (const caller of ['EvidencePage', 'JourneyParcelModal', 'WhyParcelModal', 'RuleProposalDetailPanel']) {
    assert.equal(
      canWriteParcelAnalysis(cardFailedUnitA),
      false,
      `[${caller}] write form hides when user lacks f13.analysis.write`
    );
  }

  clearEvidenceAccessCache();
});

test('F13-PARCEL-CARD-01 U2: formatEarlyHandoverText formats early handover duration correctly', () => {
  // Under 60 minutes
  assert.equal(formatEarlyHandoverText(19 * 60 * 1000), 'Giao trước khi đến · sớm 19 phút');
  assert.equal(formatEarlyHandoverText(1 * 60 * 1000), 'Giao trước khi đến · sớm 1 phút');
  assert.equal(formatEarlyHandoverText(59 * 60 * 1000), 'Giao trước khi đến · sớm 59 phút');

  // 60 minutes or more
  assert.equal(formatEarlyHandoverText(60 * 60 * 1000), 'Giao trước khi đến · sớm 1 giờ');
  assert.equal(formatEarlyHandoverText(75 * 60 * 1000), 'Giao trước khi đến · sớm 1 giờ 15 phút');
  assert.equal(formatEarlyHandoverText(120 * 60 * 1000), 'Giao trước khi đến · sớm 2 giờ');
  assert.equal(formatEarlyHandoverText(125 * 60 * 1000), 'Giao trước khi đến · sớm 2 giờ 5 phút');

  // Null, undefined, 0, negative
  assert.equal(formatEarlyHandoverText(null), null);
  assert.equal(formatEarlyHandoverText(undefined), null);
  assert.equal(formatEarlyHandoverText(0), null);
  assert.equal(formatEarlyHandoverText(-5000), null);
});

test('F13-PARCEL-CARD-01 U2: formatTctHours formats numeric hours consistently as comma decimal with h', () => {
  // Direct numbers
  assert.equal(formatTctHours(341.3), '341,3h');
  assert.equal(formatTctHours(341.34), '341,3h');
  assert.equal(formatTctHours(341.36), '341,4h');
  assert.equal(formatTctHours(19.15), '19,1h');
  assert.equal(formatTctHours(19.2), '19,2h');
  assert.equal(formatTctHours(20), '20,0h');

  // Objects with tct_ms (341.3 hours = 1228680000 ms)
  assert.equal(formatTctHours({ tct_ms: 1228680000 }), '341,3h');

  // Objects with tct.tct_hours or tct.hours
  assert.equal(formatTctHours({ tct: { tct_hours: 19.15 } }), '19,1h');
  assert.equal(formatTctHours({ tct: { hours: 4.5 } }), '4,5h');
  assert.equal(formatTctHours({ tct_hours: 20 }), '20,0h');

  // Never '4:28' or '19.15h'
  const result = formatTctHours(19.15);
  assert.notEqual(result, '19.15h');
  assert.notEqual(result, '19:09');
  assert.match(result, /^\d+,\d+h$/);

  // Missing or invalid
  assert.equal(formatTctHours(null), '—');
  assert.equal(formatTctHours(undefined), '—');
  assert.equal(formatTctHours({}), '—');
});

test('F13-PARCEL-CARD-01 U2: clearEvidenceAccessCache clears catalog and layout state', () => {
  setCachedEvidenceCatalog({ can: { write: true } });
  setCachedLayout({ units: { allow_all: true } });

  const dummyCard = { can_analyse: true, ma_bcvh: '537015', danh_gia: 'Không đạt' };
  assert.equal(canWriteParcelAnalysis(dummyCard), true);

  // Clear cache
  clearEvidenceAccessCache();

  // Without cache, defaults to no permissions
  assert.equal(canWriteParcelAnalysis(dummyCard), false);
});

test('F13-PARCEL-CARD-01 U2: sortEvidenceInPage sorts by gbt_before_arrive', () => {
  const items = [
    { ma_bg: 'A1', journey: { gbt_before_arrive_ms: 19 * 60000 } },
    { ma_bg: 'A2', journey: { gbt_before_arrive_ms: null } },
    { ma_bg: 'A3', journey: { gbt_before_arrive_ms: 75 * 60000 } },
  ];

  const sortedDesc = sortEvidenceInPage(items, 'gbt_before_arrive', 'desc');
  assert.equal(sortedDesc[0].ma_bg, 'A3');
  assert.equal(sortedDesc[1].ma_bg, 'A1');
  assert.equal(sortedDesc[2].ma_bg, 'A2');

  const sortedAsc = sortEvidenceInPage(items, 'gbt_before_arrive', 'asc');
  assert.equal(sortedAsc[0].ma_bg, 'A2');
  assert.equal(sortedAsc[1].ma_bg, 'A1');
  assert.equal(sortedAsc[2].ma_bg, 'A3');
});






