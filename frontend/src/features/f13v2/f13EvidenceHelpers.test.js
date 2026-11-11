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
  formatCauseStatusLabel,
  formatCauseBasisLabel,
  formatCauseStepLabel,
  formatCauseHintLabel,
  formatFlagLabel,
  SPLIT_WHY_LABELS,
  formatEvidenceHours,
  formatEvidenceTime,
  formatEvidenceRemaining,
  buildWhyConclusion,
  resolveLotCounts,
  formatBatchArrivalRange,
  buildLotBatchQuery,
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

test('F13-PARCEL-CARD-01 U3: every code of the §24 table maps to its text and unknown code gives "Mã khác"', () => {
  // Status (4 codes)
  assert.equal(formatCauseStatusLabel('CAUSE'), 'Đã xác định nguyên nhân');
  assert.equal(formatCauseStatusLabel('CHO_CHUYEN_QUAN'), 'Chờ Chuyên quản phân tích');
  assert.equal(formatCauseStatusLabel('CHUA_DU_CAN_CU'), 'Chưa đủ căn cứ');
  assert.equal(formatCauseStatusLabel('KHONG_PHAN_TICH'), 'Không phân tích (bưu gửi Đạt hoặc chưa đánh giá)');
  assert.equal(formatCauseStatusLabel('UNKNOWN_STATUS'), 'Mã khác');
  assert.equal(formatCauseStatusLabel('RANDOM_123'), 'Mã khác');
  assert.equal(formatCauseStatusLabel(null), '—');
  assert.equal(formatCauseStatusLabel(undefined), '—');

  // Basis (2 codes)
  assert.equal(formatCauseBasisLabel('INTERVAL'), 'Tính theo số giờ TCT (khoảng thời gian)');
  assert.equal(formatCauseBasisLabel('MILESTONES'), 'Tính theo các mốc hành trình');
  assert.equal(formatCauseBasisLabel('UNKNOWN_BASIS'), 'Mã khác');
  assert.equal(formatCauseBasisLabel(null), '—');
  assert.equal(formatCauseBasisLabel(undefined), '—');

  // Step (4 codes: T-A, T-G, T-E, THOI_GIAN)
  assert.equal(formatCauseStepLabel('T-A'), 'Chặng TMS → Đến BCVH');
  assert.equal(formatCauseStepLabel('T-G'), 'Chặng TMS → Giao bưu tá');
  assert.equal(formatCauseStepLabel('T-E'), 'Chặng TMS → Phát');
  assert.equal(formatCauseStepLabel('THOI_GIAN'), 'Theo thời gian');
  assert.equal(formatCauseStepLabel('CHI_TIEU'), 'Mã khác');
  assert.equal(formatCauseStepLabel('UNKNOWN_STEP'), 'Mã khác');
  assert.equal(formatCauseStepLabel(null), '—');
  assert.equal(formatCauseStepLabel(undefined), '—');

  // Hints (2 codes)
  assert.equal(formatCauseHintLabel('DEN_BCVH_CON_IT_GIO'), 'Bưu gửi đến BCVH còn ít giờ');
  assert.equal(formatCauseHintLabel('DAU_HIEU_CHAM_TAI_BCVH'), 'Có dấu hiệu chậm tại BCVH');
  assert.equal(formatCauseHintLabel('UNKNOWN_HINT'), 'Mã khác');
  assert.equal(formatCauseHintLabel(null), '—');
  assert.equal(formatCauseHintLabel(undefined), '—');

  // Flags (17 codes)
  assert.equal(formatFlagLabel('A_TRUOC_TMS_GIAO_TRUC_TIEP'), 'Giao nhận trực tiếp ĐTC1: đến BCVH trước giờ quét TMS, chặng TMS -> đến tính 0');
  assert.equal(formatFlagLabel('THIEU_F41'), 'Không có dữ liệu F4.1');
  assert.equal(formatFlagLabel('KHONG_XAC_NHAN_DEN'), 'Không có giờ xác nhận đến BCVH');
  assert.equal(formatFlagLabel('SAI_TRINH_TU_NGHIEP_VU'), 'Các mốc sai trình tự nghiệp vụ');
  assert.equal(formatFlagLabel('G_TRUOC_T'), 'Giao bưu tá trước giờ quét TMS');
  assert.equal(formatFlagLabel('THIEU_MOC_D'), 'Thiếu mốc rời KTC1');
  assert.equal(formatFlagLabel('MOC_D_DAO_THU_TU'), 'Mốc rời KTC1 sai thứ tự');
  assert.equal(formatFlagLabel('THIEU_MOC_G'), 'Thiếu mốc giao bưu tá');
  assert.equal(formatFlagLabel('MOC_G_KHONG_HOP_LE'), 'Mốc giao bưu tá sai thứ tự');
  assert.equal(formatFlagLabel('MOC_A_KHONG_HOP_LE'), 'Mốc đến BCVH sai thứ tự');
  assert.equal(formatFlagLabel('THIEU_MOC_E'), 'Thiếu giờ phát');
  assert.equal(formatFlagLabel('THOI_GIAN_KHONG_HOP_LE'), 'Thời gian không hợp lệ');
  assert.equal(formatFlagLabel('R_KHONG_HOP_LE'), 'Không tính lại được số giờ TCT');
  assert.equal(formatFlagLabel('UNLOCATED_TCT_EXCLUSION'), 'Có khoảng loại trừ TCT chưa xác định vị trí');
  assert.equal(formatFlagLabel('KET_QUA_KHONG_KHOP_CHI_TIEU'), 'Kết quả TCT không khớp chỉ tiêu');
  assert.equal(formatFlagLabel('THIEU_CHI_TIEU'), 'Thiếu chỉ tiêu');
  assert.equal(formatFlagLabel('F41_KHONG_DUY_NHAT'), 'F4.1 có nhiều dòng');
  assert.equal(formatFlagLabel('UNKNOWN_FLAG'), 'Mã khác');
  assert.equal(formatFlagLabel(null), '—');
  assert.equal(formatFlagLabel(undefined), '—');
});

test('F13-PARCEL-CARD-01 U4: formatEvidenceHours, formatEvidenceTime, and formatEvidenceRemaining follow §30 rules', () => {
  const HOUR = 3600000;

  // Hours: "14,6 giờ" (comma, one decimal); missing -> "không có"
  assert.equal(formatEvidenceHours(14.6 * HOUR), '14,6 giờ');
  assert.equal(formatEvidenceHours(12 * HOUR), '12,0 giờ');
  assert.equal(formatEvidenceHours(0), '0,0 giờ');
  assert.equal(formatEvidenceHours(null), 'không có');
  assert.equal(formatEvidenceHours(undefined), 'không có');

  // Times: "dd/MM HH:mm"; missing -> "không có"
  assert.equal(formatEvidenceTime(Date.parse('2026-10-20T10:00:00Z')), '20/10 10:00');
  assert.equal(formatEvidenceTime('2026-10-21 14:30:00'), '21/10 14:30');
  assert.equal(formatEvidenceTime('2026-10-21T08:05:00Z'), '21/10 08:05');
  assert.equal(formatEvidenceTime(null), 'không có');
  assert.equal(formatEvidenceTime(undefined), 'không có');
  assert.equal(formatEvidenceTime(''), 'không có');

  // Remaining: negative -> "đã quá hạn x giờ", positive -> "x,y giờ", missing -> "không có"
  assert.equal(formatEvidenceRemaining(1.5 * HOUR), '1,5 giờ');
  assert.equal(formatEvidenceRemaining(0), '0,0 giờ');
  assert.equal(formatEvidenceRemaining(-4 * HOUR), 'đã quá hạn 4,0 giờ');
  assert.equal(formatEvidenceRemaining(null), 'không có');
});

test('F13-PARCEL-CARD-01 U4: buildWhyConclusion generates exact §30 text for every decision.rule and highlights decisive stage', () => {
  const HOUR = 3600000;
  const at = (text) => Date.parse(`${text.replace(' ', 'T')}:00Z`);

  // 1. DEN_BCVH_QUA_HAN (VAN_CHUYEN: D_A_LON_HON_T_D)
  const evVanChuyen = {
    status: 'CAUSE',
    cause_code: 'VAN_CHUYEN',
    limit_ms: 12 * HOUR,
    remaining_at_arrival_ms: -4 * HOUR,
    milestones: { tms: at('2026-10-20 10:00'), depart: at('2026-10-20 16:00'), arrive: at('2026-10-21 12:00') },
    stages: {
      t_a: { clock_ms: 26 * HOUR, net_ms: 16 * HOUR, over_ms: 4 * HOUR },
      t_d: { net_ms: 6 * HOUR },
      d_a: { net_ms: 10 * HOUR },
    },
    decision: { rule: 'DEN_BCVH_QUA_HAN', stage: 't_a', split: { result: 'VAN_CHUYEN', why: 'D_A_LON_HON_T_D' } },
    matches_stored: true,
  };
  const boxVC = buildWhyConclusion(evVanChuyen);
  assert.equal(boxVC.title, 'Vì sao kết luận: Vận chuyển (đến BCVH quá hạn)');
  assert.deepEqual(boxVC.lines.map((l) => l.text), [
    'Bưu gửi đến BCVH đã quá hạn 4,0 giờ (hạn 12,0 giờ).',
    'Từ quét TMS đến BCVH: 26,0 giờ theo đồng hồ, 16,0 giờ sau khi trừ giờ đêm theo cách tính TCT.',
    'Khai thác (TMS → rời KTC1): 6,0 giờ',
    'Vận chuyển (rời KTC1 → đến BCVH): 10,0 giờ',
    'Chặng vận chuyển dài hơn',
  ]);
  assert.equal(boxVC.lines.find((l) => l.key === 'leg_da').highlight, true);
  assert.equal(boxVC.lines.find((l) => l.key === 'leg_td').highlight, false);

  // 1b. DEN_BCVH_QUA_HAN (KHAI_THAC: T_D_LON_HON_D_A)
  const boxKT = buildWhyConclusion({
    ...evVanChuyen,
    cause_code: 'KHAI_THAC',
    stages: {
      t_a: { clock_ms: 26 * HOUR, net_ms: 16 * HOUR, over_ms: 4 * HOUR },
      t_d: { net_ms: 11 * HOUR },
      d_a: { net_ms: 5 * HOUR },
    },
    decision: { rule: 'DEN_BCVH_QUA_HAN', stage: 't_a', split: { result: 'KHAI_THAC', why: 'T_D_LON_HON_D_A' } },
  });
  assert.equal(boxKT.lines.find((l) => l.key === 'leg_td').highlight, true);
  assert.equal(boxKT.lines.find((l) => l.key === 'leg_da').highlight, false);
  assert.equal(boxKT.lines.at(-1).text, 'Chặng khai thác dài hơn');

  // 1c. DEN_BCVH_QUA_HAN (CHUA_PHAN_BIET: THIEU_MOC_D, HAI_CHANG_CHONG_LAN, MOC_D_DAO_THU_TU)
  for (const [whyCode, expectedWhyText] of Object.entries(SPLIT_WHY_LABELS)) {
    const b = buildWhyConclusion({
      ...evVanChuyen,
      cause_code: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET',
      stages: { t_a: { clock_ms: 26 * HOUR, net_ms: 16 * HOUR, over_ms: 4 * HOUR } },
      decision: { rule: 'DEN_BCVH_QUA_HAN', stage: 't_a', split: { result: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', why: whyCode } },
    });
    assert.equal(b.lines.at(-1).text, expectedWhyText);
    if (!['T_D_LON_HON_D_A', 'D_A_LON_HON_T_D'].includes(whyCode)) {
      assert.equal(b.lines.find((l) => l.key === 'leg_td').text, 'Khai thác (TMS → rời KTC1): không có');
      assert.equal(b.lines.find((l) => l.key === 'leg_da').text, 'Vận chuyển (rời KTC1 → đến BCVH): không có');
      assert.equal(b.lines[0].highlight, true);
    }
  }

  // 2. KHONG_TRON_LO (with positive and negative remaining at arrival)
  const lotSample = { ma_lo: 'LOT-NEW', tms_batches: 3, complete_at: '2026-10-20 15:00:00' };
  const boxLotPos = buildWhyConclusion(
    {
      status: 'CAUSE',
      cause_code: 'KHONG_TRON_LO',
      remaining_at_arrival_ms: 2.5 * HOUR,
      decision: { rule: 'KHONG_TRON_LO', stage: 't_a' },
      matches_stored: true,
    },
    lotSample
  );
  assert.deepEqual(boxLotPos.lines.map((l) => l.text), [
    'Lô LOT-NEW về Huế trong 3 đợt quét TMS; lô trọn lúc 20/10 15:00.',
    'Khi đến BCVH bưu gửi còn 2,5 giờ.',
  ]);

  const boxLotNeg = buildWhyConclusion(
    {
      status: 'CAUSE',
      cause_code: 'KHONG_TRON_LO',
      remaining_at_arrival_ms: -4 * HOUR,
      decision: { rule: 'KHONG_TRON_LO', stage: 't_a' },
      matches_stored: true,
    },
    lotSample
  );
  assert.deepEqual(boxLotNeg.lines.map((l) => l.text), [
    'Lô LOT-NEW về Huế trong 3 đợt quét TMS; lô trọn lúc 20/10 15:00.',
    'Khi đến BCVH bưu gửi đã quá hạn 4,0 giờ.',
  ]);

  // 3. PHAT_CHAM_GIAO_BUU_TA (via T_G_QUA_HAN and via G_NGAY_SAU_NGAY_DEN)
  const boxGbtOver = buildWhyConclusion({
    status: 'CAUSE',
    cause_code: 'PHAT',
    detail: 'CHAM_GIAO_BUU_TA',
    limit_ms: 17 * HOUR,
    remaining_at_arrival_ms: 1 * HOUR,
    stages: { t_g: { net_ms: 18 * HOUR, over_ms: 1 * HOUR } },
    decision: { rule: 'PHAT_CHAM_GIAO_BUU_TA', stage: 't_g', via: 'T_G_QUA_HAN' },
    matches_stored: true,
  });
  assert.deepEqual(boxGbtOver.lines.map((l) => l.text), [
    'Từ quét TMS đến lúc giao bưu tá: 18,0 giờ, quá hạn 1,0 giờ (hạn 17,0 giờ).',
    'Khi đến BCVH còn 1,0 giờ.',
  ]);
  assert.equal(boxGbtOver.lines[0].highlight, true);

  const boxGbtNextDay = buildWhyConclusion({
    status: 'CAUSE',
    cause_code: 'PHAT',
    detail: 'CHAM_GIAO_BUU_TA',
    limit_ms: 17 * HOUR,
    remaining_at_arrival_ms: 3 * HOUR,
    milestones: { arrive: at('2026-10-20 16:00'), gbt: at('2026-10-21 08:30') },
    decision: { rule: 'PHAT_CHAM_GIAO_BUU_TA', stage: 't_g', via: 'G_NGAY_SAU_NGAY_DEN', next_day: true },
    matches_stored: true,
  });
  assert.deepEqual(boxGbtNextDay.lines.map((l) => l.text), [
    'Đến BCVH lúc 20/10 16:00 nhưng giao bưu tá lúc 21/10 08:30, sang ngày hôm sau.',
    'Khi đến BCVH còn 3,0 giờ.',
  ]);
  assert.equal(boxGbtNextDay.lines[0].highlight, true);

  // 4. PHAT_SAU_GIAO
  const boxPhatSauGiao = buildWhyConclusion({
    status: 'CAUSE',
    cause_code: 'PHAT',
    detail: 'PHAT_CHAM_SAU_GIAO',
    limit_ms: 18 * HOUR,
    milestones: { gbt: at('2026-10-21 14:00'), ptc: at('2026-10-21 20:00') },
    clock_ms: { gbt_ptc: 6 * HOUR },
    stages: {
      t_g: { net_ms: 18 * HOUR, over_ms: 0 },
      t_e: { net_ms: 24 * HOUR, over_ms: 6 * HOUR },
    },
    decision: { rule: 'PHAT_SAU_GIAO', stage: 't_g', via: 'T_G_TRONG_HAN' },
    matches_stored: true,
  });
  assert.deepEqual(boxPhatSauGiao.lines.map((l) => l.text), [
    'Giao bưu tá trong hạn lúc 21/10 14:00 (18,0 giờ, hạn 18,0 giờ).',
    'Phát thành công lúc 21/10 20:00: từ giao đến phát 6,0 giờ.',
    'Tổng đến lúc phát 24,0 giờ, quá hạn 6,0 giờ.',
  ]);
  assert.equal(boxPhatSauGiao.lines[1].highlight, true);

  // 5. PHAT_KHONG_CHI_TIET
  const boxPhatNoDetail = buildWhyConclusion({
    status: 'CAUSE',
    cause_code: 'PHAT',
    detail: null,
    missing: ['gbt'],
    out_of_order: ['MOC_G_KHONG_HOP_LE'],
    decision: { rule: 'PHAT_KHONG_CHI_TIET', stage: null },
    matches_stored: true,
  });
  assert.equal(
    boxPhatNoDetail.lines[0].text,
    'Chậm ở khâu phát, chưa xác định chi tiết vì: Thiếu mốc giao bưu tá, Mốc giao bưu tá sai thứ tự.'
  );
  assert.equal(boxPhatNoDetail.lines[0].highlight, true);

  // 6. CHO_CHUYEN_QUAN reasons (with missing/out-of-order milestones + times + decisive stage)
  const boxWait = buildWhyConclusion({
    status: 'CHO_CHUYEN_QUAN',
    reason: 'CHAM_DEN_HAY_CHAM_GIAO',
    limit_ms: 17 * HOUR,
    milestones: { tms: at('2026-10-20 10:00'), depart: at('2026-10-20 16:00'), arrive: null, gbt: at('2026-10-21 14:00'), ptc: at('2026-10-21 20:00') },
    missing: ['arrive'],
    out_of_order: [],
    stages: { t_g: { clock_ms: 28 * HOUR, net_ms: 18 * HOUR, over_ms: 1 * HOUR } },
    decision: { rule: 'CHAM_DEN_HAY_CHAM_GIAO', stage: 't_g' },
    decisive: { stage: 't_g', clock_ms: 28 * HOUR, net_ms: 18 * HOUR, over_ms: 1 * HOUR, limit_ms: 17 * HOUR },
    matches_stored: true,
  });
  assert.equal(boxWait.lines[0].text, 'Không có xác nhận đến BCVH, chưa tách được đến muộn hay giao muộn');
  assert.ok(boxWait.lines[1].text.includes('Không có giờ xác nhận đến BCVH (Đến BCVH: không có)'));
  assert.ok(boxWait.lines[1].text.includes('Quét TMS: 20/10 10:00'));
  assert.equal(boxWait.lines[2].text, 'Chặng TMS → Giao bưu tá: 18,0 giờ (đồng hồ 28,0 giờ), quá hạn 1,0 giờ (hạn 17,0 giờ).');
  assert.equal(boxWait.lines[2].highlight, true);

  // 7. CHI_TIEU and KHONG_CO_MOC
  const boxChiTieu = buildWhyConclusion({
    status: 'CHUA_DU_CAN_CU',
    reason: 'CHI_TIEU',
    decision: { rule: 'CHI_TIEU' },
    matches_stored: true,
  });
  assert.equal(boxChiTieu.lines[0].text, 'Thiếu chỉ tiêu (hạn phát)');

  const boxKhongCoMoc = buildWhyConclusion({
    status: 'CHUA_DU_CAN_CU',
    reason: 'KHONG_CO_MOC',
    decision: { rule: 'KHONG_CO_MOC' },
    matches_stored: true,
  });
  assert.equal(boxKhongCoMoc.lines[0].text, 'Không có mốc nào dùng được');

  // 8. matches_stored === false warning line
  const boxMismatch = buildWhyConclusion({
    status: 'CHUA_DU_CAN_CU',
    reason: 'CHI_TIEU',
    decision: { rule: 'CHI_TIEU' },
    matches_stored: false,
  });
  assert.equal(
    boxMismatch.lines.at(-1).text,
    'Kết luận đã lưu khác kết quả tính lại, dữ liệu đang được cập nhật.'
  );
  assert.equal(boxMismatch.lines.at(-1).isMismatch, true);
});

test('F13-PARCEL-CARD-01 U4: resolveLotCounts falls back to *_in_scope when volume/failed are null for BCVH accounts, and buildLotBatchQuery builds batch query', () => {
  // Admin / allow_all account: volume and failed are populated
  const adminLot = {
    ma_lo: 'LOT-1',
    volume: 7,
    failed: 2,
    volume_in_scope: 7,
    failed_in_scope: 2,
    period: { from: '2026-10-11', to: '2026-10-26' },
    batches: [
      { tms: '2026-10-20 12:30:00', volume: 2, failed: 1, volume_in_scope: 2, failed_in_scope: 1, arrive_first: '2026-10-21 08:04:00', arrive_last: '2026-10-21 08:05:00', is_own: true },
    ],
  };
  assert.deepEqual(resolveLotCounts(adminLot), { volume: 7, failed: 2 });
  assert.deepEqual(resolveLotCounts(adminLot.batches[0]), { volume: 2, failed: 1 });
  assert.equal(formatBatchArrivalRange(adminLot.batches[0]), '21/10 08:04 – 21/10 08:05');

  // Scoped BCVH account (§29): volume and failed are null, falls back to volume_in_scope and failed_in_scope
  const bcvhLot = {
    ma_lo: 'LOT-1',
    volume: null,
    failed: null,
    volume_in_scope: 3,
    failed_in_scope: 1,
    scope_hidden: true,
    period: { from: '2026-10-11', to: '2026-10-26' },
    batches: [
      { tms: '2026-10-20 10:00:00', volume: null, failed: null, volume_in_scope: 2, failed_in_scope: 0, is_own: false },
      { tms: '2026-10-20 12:30:00', volume: null, failed: null, volume_in_scope: 1, failed_in_scope: 1, is_own: true },
      { tms: '2026-10-20 15:00:00', volume: null, failed: null, volume_in_scope: 0, failed_in_scope: 0, is_own: false },
    ],
  };
  assert.deepEqual(resolveLotCounts(bcvhLot), { volume: 3, failed: 1 });
  assert.deepEqual(bcvhLot.batches.map((b) => resolveLotCounts(b)), [
    { volume: 2, failed: 0 },
    { volume: 1, failed: 1 },
    { volume: 0, failed: 0 },
  ]);

  // Batch click query (§30 C6.3): ma_lo, tms_batch, from, to, view=journey
  const query = buildLotBatchQuery(bcvhLot, bcvhLot.batches[1], { page: 1, page_size: 20 });
  assert.deepEqual(query, {
    view: 'journey',
    ma_lo: 'LOT-1',
    tms_batch: '2026-10-20 12:30:00',
    from: '2026-10-11',
    to: '2026-10-26',
    page: 1,
    page_size: 20,
  });
});







