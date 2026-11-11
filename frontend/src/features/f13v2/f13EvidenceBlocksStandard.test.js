import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readSrc = (relPath) => fs.readFileSync(path.resolve(__dirname, relPath), 'utf8');

test('F13-EVIDENCE-01: F13V2EvidenceSummaryCard complies with report block standards', () => {
  const content = readSrc('./components/F13V2EvidenceSummaryCard.jsx');

  // Camera capture button per report standard
  assert.ok(content.includes('<BlockCaptureButton'), 'SummaryCard must include BlockCaptureButton');
  assert.ok(content.includes('indicatorTheme'), 'SummaryCard must use indicatorTheme');

  // Must not have fixed dark blue
  assert.ok(!content.includes('#1e3a8a') && !content.includes('#172554'), 'Must not carry fixed dark blue');

  // Must show system numbers AND Chuyên quản numbers side-by-side (PO V2)
  assert.ok(content.includes('Nguyên nhân theo Hệ thống'), 'Must display System causes');
  assert.ok(content.includes('Kết quả rà soát của Chuyên quản'), 'Must display Chuyên quản review');
  assert.ok(content.includes('same_as_system') && content.includes('different_from_system'), 'Must display comparison breakdown');

  // Facts only, no blame wording
  assert.ok(!content.includes('lỗi của') && !content.includes('quy trách nhiệm'), 'Must not contain blame wording');
});

test('F13-EVIDENCE-01: F13V2EvidenceTable complies with report standards, in-page sort, and action permissions', () => {
  const content = readSrc('./components/F13V2EvidenceTable.jsx');

  // Block capture button
  assert.ok(content.includes('<BlockCaptureButton'), 'EvidenceTable must include BlockCaptureButton');

  // Click-to-sort column titles via SortableTh
  assert.ok(content.includes('<SortableTh'), 'EvidenceTable must use SortableTh for column headers');

  // Requirement 2: in-page sorting disclaimer notice
  assert.ok(content.includes('Sắp xếp trong trang'), 'EvidenceTable must state in-page sorting clearly');

  // Requirement 4: Ghi phân tích visible when catalog.can.write && item.can_analyse
  assert.ok(content.includes('canWrite && canAnalyse'), 'EvidenceTable must guard action with canWrite && canAnalyse');

  // F13-PARCEL-CARD-01: Removed open in Hành trình link, parcel number opens card
  assert.ok(!content.includes('/f13/v2/hanh-trinh'), 'EvidenceTable must remove the open in Hành trình link (PO C1/C3)');
  assert.ok(content.includes('onOpenCard') || content.includes('onOpenDetail'), 'EvidenceTable must open parcel card');

  // data-no-capture on action column
  assert.ok(content.includes('data-no-capture="true"'), 'Interactive action column must have data-no-capture');
});

test('F13-EVIDENCE-01: F13V2EvidenceDetailModal complies with 5 milestones and data sources', () => {
  const content = readSrc('./components/F13V2EvidenceDetailModal.jsx');

  // Block capture button
  assert.ok(content.includes('<BlockCaptureButton'), 'DetailModal must include BlockCaptureButton');

  // 5 Milestones
  assert.ok(content.includes('tms') && content.includes('depart') && content.includes('arrive') && content.includes('handover_first') && content.includes('ptc'), 'Must list all 5 milestones');

  // Data sources
  assert.ok(content.includes('F1.3') && content.includes('F1.1') && content.includes('F4.2'), 'Must show official data sources');

  // Escape key listener using globalThis
  assert.ok(content.includes('globalThis.addEventListener'), 'Must use globalThis for window event listeners');
});

test('F13-EVIDENCE-01: F13V2EvidenceAnalysisModal adheres to V3/V4 mandatory note and B1-R2 warning', () => {
  const content = readSrc('./components/F13V2EvidenceAnalysisModal.jsx');

  // B1-R2 warning for PHAT_KHONG_CHI_TIET
  assert.ok(content.includes('PHAT_KHONG_CHI_TIET') || content.includes('isPhatKhongChiTiet'), 'Must handle B1-R2 notice for Phát không chi tiết');

  // Mandatory note check per V3/V4
  assert.ok(content.includes('isNoteMandatory'), 'Must validate note requirement with isNoteMandatory');

  // History tab
  assert.ok(content.includes('Lịch sử ghi nhận') || content.includes('fetchEvidenceHistory'), 'Must include append-only history tab');

  // Escape listener
  assert.ok(content.includes('globalThis.addEventListener'), 'Must use globalThis for window event listeners');
});

test('F13-EVIDENCE-01: F13V2EvidenceFilterBar covers all /why parameters and evidence filters', () => {
  const content = readSrc('./components/F13V2EvidenceFilterBar.jsx');

  // All /why filters covered
  assert.ok(content.includes('fromDate') && content.includes('toDate'), 'Must include from/to dates');
  assert.ok(content.includes('bcvh') && content.includes('unitOptions'), 'Must include unit filter');
  assert.ok(content.includes('route') && content.includes('postman'), 'Must include route and postman');
  assert.ok(content.includes('verdict') && content.includes('systemCause'), 'Must include verdict and system cause');
  assert.ok(content.includes('reason') && content.includes('remaining'), 'Must include reason and remaining');
  assert.ok(content.includes('aSource') && content.includes('hint'), 'Must include arrival source and hint');

  // Evidence specific filters
  assert.ok(content.includes('analysed') && content.includes('analystCause'), 'Must include analysed and analystCause');
  assert.ok(content.includes('search') && content.includes('sort'), 'Must include search and sort');

  // data-no-capture
  assert.ok(content.includes('data-no-capture="true"'), 'Filter bar must have data-no-capture');
});

test('F13-EVIDENCE-01: App.jsx and appNavigation.jsx register the Evidence page cleanly', () => {
  const appContent = fs.readFileSync(path.resolve(__dirname, '../../App.jsx'), 'utf8');
  const navContent = fs.readFileSync(path.resolve(__dirname, '../../navigation/appNavigation.jsx'), 'utf8');

  // Registered in App.jsx under f13/v2
  assert.ok(appContent.includes("import F13V2EvidencePage from './features/f13v2/F13V2EvidencePage';"), 'App.jsx must import F13V2EvidencePage');
  assert.ok(appContent.includes('<Route path="evidence" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><F13V2EvidencePage /></ProtectedRoute>} />'), 'App.jsx must register evidence route');

  // PO accepted 2026-11-06: the old /f13/evidence redirects to /f13/v2/evidence with the new parameter names
  assert.ok(appContent.includes('<Route path="evidence" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyEvidenceRedirect /></ProtectedRoute>} />'), 'App.jsx must redirect the legacy evidence route');
  assert.ok(!appContent.includes('ShipmentPerformancePage'), 'App.jsx must no longer mount the old shipment page');
  assert.ok(appContent.includes('translateLegacyEvidenceSearch'), 'the redirect translates the old parameters');

  // Registered in navigation menu
  assert.ok(navContent.includes("path: '/f13/v2/evidence'"), 'appNavigation.jsx must point Dữ liệu minh chứng to /f13/v2/evidence');
});

test('F13-EVIDENCE-01 U1-R4: F13V2EvidencePage calls unit helpers with object signatures and mounts once', () => {
  const pageContent = readSrc('./F13V2EvidencePage.jsx');

  // 1. buildWhyUnitOptions with { layout, metaUnits }
  assert.ok(
    pageContent.includes('buildWhyUnitOptions({ layout, metaUnits })'),
    'Must call buildWhyUnitOptions({ layout, metaUnits })'
  );

  // 2. resolveEffectiveBcvh with { currentParam: bcvhParam, unitOptions, layout }
  assert.ok(
    pageContent.includes('resolveEffectiveBcvh({ currentParam: bcvhParam, unitOptions, layout })'),
    'Must call resolveEffectiveBcvh({ currentParam: bcvhParam, unitOptions, layout })'
  );

  // 3. Initial load effect runs once on mount and loads layout, catalog, meta, weeks and months
  assert.ok(
    pageContent.includes('fetchLayout().catch(() => null)') &&
    pageContent.includes('fetchEvidenceCatalog().catch(() => null)') &&
    pageContent.includes('fetchDashboardMeta().catch(() => null)') &&
    pageContent.includes("api.get('/f13/ranking/bcvh/weeks').catch(() => null)") &&
    pageContent.includes("api.get('/f13/ranking/bcvh/months').catch(() => null)"),
    'Must load layout, catalog, meta, weeks and months in mount effect'
  );
  assert.ok(
    pageContent.includes('}, []);\n\n  // Default Anchor Resolution'),
    'Initial effect must have dependency array []'
  );

  // 4. MetaUnits state exists and is populated
  assert.ok(pageContent.includes('const [metaUnits, setMetaUnits] = useState([]);'), 'Must define metaUnits state');
  assert.ok(pageContent.includes('fetchDashboardMeta'), 'Must import and call fetchDashboardMeta');
});

test('F13-EVIDENCE-01 U1-R5 & U1-R6: F13V2EvidencePage resolves latest anchor and SummaryCard reads real totals schema', () => {
  const pageContent = readSrc('./F13V2EvidencePage.jsx');
  const cardContent = readSrc('./components/F13V2EvidenceSummaryCard.jsx');

  // U1-R5: Default day anchor resolution via resolvePeriod({ kind: 'latest' })
  assert.ok(
    pageContent.includes("resolvePeriod({ kind: 'latest' })"),
    'Page must resolve default day anchor with resolvePeriod({ kind: "latest" })'
  );
  assert.ok(
    pageContent.includes("next.set('from', res.day)"),
    'Page must set from = res.day'
  );
  assert.ok(
    pageContent.includes("next.set('to', res.day)"),
    'Page must set to = res.day'
  );

  // U1-R6: Reads real totals schema, no references to summary.system or summary.causes
  assert.ok(
    !cardContent.includes('summary?.system') && !cardContent.includes('summary?.causes'),
    'SummaryCard must not reference non-existent summary.system or summary.causes'
  );
  assert.ok(
    cardContent.includes('extractEvidenceSummary'),
    'SummaryCard must extract data via extractEvidenceSummary'
  );

  // Decimal comma formatting everywhere
  assert.ok(
    cardContent.includes(".replace('.', ',')"),
    'SummaryCard must use Vietnamese comma formatting for percentages'
  );
});

test('F13-EVIDENCE-01 U1-R7 & U1-R8: Week/Month dynamic axes without hardcoded dates and raw rate display', () => {
  const pageContent = readSrc('./F13V2EvidencePage.jsx');
  const cardContent = readSrc('./components/F13V2EvidenceSummaryCard.jsx');

  // U1-R7: resolvePeriod returns week.week_id and month.month_id
  assert.ok(
    pageContent.includes('res?.week?.week_id'),
    'Page must read res.week.week_id'
  );
  assert.ok(
    pageContent.includes('res?.month?.month_id'),
    'Page must read res.month.month_id'
  );

  // U1-R7: Passes weeks and months to filter bar, not layout.available_*
  assert.ok(
    pageContent.includes('availableWeeks={weeks}'),
    'Filter bar must receive availableWeeks={weeks}'
  );
  assert.ok(
    pageContent.includes('availableMonths={months}'),
    'Filter bar must receive availableMonths={months}'
  );

  // U1-R7: Absolutely no hardcoded periods
  assert.ok(!pageContent.includes("'2026-W44'"), 'Page must not contain hardcoded 2026-W44');
  assert.ok(!pageContent.includes("'2026-11'"), 'Page must not contain hardcoded 2026-11');
  assert.ok(!pageContent.includes("'2026-11-04'"), 'Page must not contain hardcoded 2026-11-04');

  // U1-R8: Rate displayed raw without multiplying by 100
  assert.ok(
    cardContent.includes('Number(rate).toFixed(1)'),
    'Summary card must format rate directly with 1 decimal place'
  );
  assert.ok(
    !cardContent.includes('(rate || 0) * 100'),
    'Summary card must NOT multiply rate by 100'
  );
});

test('F13-EVIDENCE-01 U1-R9: Static check that no file in features/f13v2 calls /time-axis/', () => {
  const f13v2Dir = path.resolve(__dirname);
  const getAllFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.resolve(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath));
      } else if ((file.endsWith('.js') || file.endsWith('.jsx')) && !file.endsWith('.test.js')) {
        results.push(fullPath);
      }
    }
    return results;
  };

  const files = getAllFiles(f13v2Dir);
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(
      !content.includes('/time-axis/'),
      `File ${path.relative(f13v2Dir, filePath)} must not call or reference /time-axis/ (use /f13/ranking/bcvh/weeks and /months instead)`
    );
  }

  // Also verify F13V2WhyPage has no hardcoded periods
  const whyContent = readSrc('./F13V2WhyPage.jsx');
  assert.ok(!whyContent.includes("'2026-W44'"), 'F13V2WhyPage must not contain hardcoded 2026-W44');
  assert.ok(!whyContent.includes("'2026-10'"), 'F13V2WhyPage must not contain hardcoded 2026-10');
  assert.ok(!whyContent.includes("'2026-11-04'"), 'F13V2WhyPage must not contain hardcoded 2026-11-04');
});

test('F13-PARCEL-CARD-01: F13V2ParcelCard complies with report standards, 3 tabs, and analysis permissions', () => {
  const content = readSrc('./components/F13V2ParcelCard.jsx');

  // Standard 1: Block capture button
  assert.ok(content.includes('<BlockCaptureButton'), 'ParcelCard must include BlockCaptureButton');

  // C1 Decision: Three tabs (Hành trình, Nguyên nhân, Phân tích)
  assert.ok(content.includes("activeTab === 'journey'"), 'Must have Hành trình tab');
  assert.ok(content.includes("activeTab === 'cause'"), 'Must have Nguyên nhân tab');
  assert.ok(content.includes("activeTab === 'analysis'"), 'Must have Phân tích tab');

  // Backend single call
  assert.ok(content.includes('fetchEvidenceParcel'), 'Must load card via fetchEvidenceParcel');

  // Permissions check via pure helper
  assert.ok(content.includes('canWriteParcelAnalysis'), 'Must guard analysis write form with canWriteParcelAnalysis');

  // 5 milestones and sources
  assert.ok(content.includes('F1.3') && content.includes('F1.1') && content.includes('F4.2'), 'Must list official data sources');

  // Escape listener
  assert.ok(content.includes('globalThis.addEventListener'), 'Must use globalThis for escape key listener');

  // Controls marked data-no-capture
  assert.ok(content.includes('data-no-capture="true"'), 'Interactive controls must have data-no-capture');

  // U1-FIX2: Exact message without capability code
  assert.ok(
    content.includes('Tài khoản chỉ có quyền xem, không có quyền ghi phân tích.'),
    'Must display exact message without capability code'
  );
  assert.ok(
    !content.includes('(f13.analysis.view)') && !content.includes('(f13.analysis.write)'),
    'Must not include capability code in message'
  );
});

test('F13-PARCEL-CARD-01 U1-FIX2: all 4 callers wire F13V2ParcelCard with onAnalysisSuccess', () => {
  const callers = [
    { name: 'EvidencePage', src: readSrc('./F13V2EvidencePage.jsx') },
    { name: 'JourneyParcelModal', src: readSrc('./components/F13V2JourneyParcelModal.jsx') },
    { name: 'WhyParcelModal', src: readSrc('./components/F13V2WhyParcelModal.jsx') },
    { name: 'RuleProposalDetailPanel', src: readSrc('./components/F13V2RuleProposalDetailPanel.jsx') },
  ];

  for (const { name, src } of callers) {
    assert.ok(src.includes('<F13V2ParcelCard'), `${name} must render F13V2ParcelCard`);
    assert.ok(src.includes('onAnalysisSuccess'), `${name} must wire onAnalysisSuccess to refresh the list behind it`);
  }
});

test('F13-PARCEL-CARD-01 U2: Journey route table, parcel card, evidence table, and AuthContext comply with U2 requirements', () => {
  const routeTableSrc = readSrc('./components/F13V2JourneyRouteTable.jsx');
  const parcelCardSrc = readSrc('./components/F13V2ParcelCard.jsx');
  const evidenceTableSrc = readSrc('./components/F13V2EvidenceTable.jsx');
  const authContextSrc = fs.readFileSync(path.resolve(__dirname, '../../auth/AuthContext.jsx'), 'utf8');

  // Requirement 1 & 2: route table early handover badge & tooltip
  assert.ok(
    routeTableSrc.includes('giao trước khi đến'),
    'Route table must include badge for giao trước khi đến'
  );
  assert.ok(
    routeTableSrc.includes('Không tính vào thời gian chặng Đến–Giao'),
    'Route table must include exact tooltip text'
  );
  assert.ok(
    routeTableSrc.includes('bcvhEarlyCount > 0'),
    'Route table must render early handover badge in BCVH header'
  );

  // Requirement 1: parcel card early handover display
  assert.ok(
    parcelCardSrc.includes('formatEarlyHandoverText'),
    'Parcel card must use formatEarlyHandoverText helper'
  );
  assert.ok(
    parcelCardSrc.includes('Không tính vào thời gian chặng Đến–Giao'),
    'Parcel card must show tooltip on early handover leg'
  );

  // Requirement 1 & 4: evidence table early handover display and TCT format
  assert.ok(
    evidenceTableSrc.includes('formatEarlyHandoverText'),
    'Evidence table must use formatEarlyHandoverText helper'
  );
  assert.ok(
    evidenceTableSrc.includes('formatTctHours'),
    'Evidence table must use formatTctHours helper'
  );

  // Requirement 5: AuthContext cache clearing
  assert.ok(
    authContextSrc.includes('clearEvidenceAccessCache'),
    'AuthContext must import clearEvidenceAccessCache'
  );
  assert.ok(
    authContextSrc.includes('const login = async') && authContextSrc.includes('clearEvidenceAccessCache()'),
    'AuthContext must clear cache on login and logout'
  );
});

test('F13-PARCEL-CARD-01 U3: clicking parcel number always lands on journey tab in both views, and card uses words instead of raw codes', () => {
  const evidencePageSrc = readSrc('./F13V2EvidencePage.jsx');
  const evidenceTableSrc = readSrc('./components/F13V2EvidenceTable.jsx');
  const parcelCardSrc = readSrc('./components/F13V2ParcelCard.jsx');

  // U3-R1: landing tab is Hành trình from parcel number in both views
  assert.ok(
    evidencePageSrc.includes("setCardInitialTab(tab || 'journey')"),
    'EvidencePage must default card landing tab to journey'
  );
  assert.ok(
    evidencePageSrc.includes("onOpenDetail={(item) => {\n          setSelectedCardParcel(item);\n          setCardInitialTab('journey');\n        }}"),
    'EvidencePage onOpenDetail must open journey tab'
  );
  assert.ok(
    !evidencePageSrc.includes("setCardInitialTab(tab || (isJourneyView") &&
    !evidencePageSrc.includes("setCardInitialTab(isJourneyView"),
    'EvidencePage must not switch card landing tab to cause view'
  );
  assert.ok(
    evidencePageSrc.includes("setCardInitialTab('analysis')"),
    'EvidencePage onOpenAnalysis must keep opening analysis tab'
  );

  // EvidenceTable calls handleOpenParcel with 'journey' on parcel number & eye button in both views
  assert.ok(
    !evidenceTableSrc.includes("handleOpenParcel(item, 'cause')"),
    'EvidenceTable must never open card on cause tab for parcel clicks'
  );

  // U3-R2: card uses formatters showing words instead of codes
  assert.ok(
    parcelCardSrc.includes('formatCauseStatusLabel(sys.status)'),
    'ParcelCard must format status with formatCauseStatusLabel'
  );
  assert.ok(
    parcelCardSrc.includes('formatCauseBasisLabel(sys.basis)'),
    'ParcelCard must format basis with formatCauseBasisLabel'
  );
  assert.ok(
    parcelCardSrc.includes('formatCauseStepLabel(sys.step)'),
    'ParcelCard must format step with formatCauseStepLabel'
  );
  assert.ok(
    parcelCardSrc.includes('formatCauseHintLabel(hint)'),
    'ParcelCard must format hints with formatCauseHintLabel'
  );
  assert.ok(
    parcelCardSrc.includes('formatFlagLabel(flag)'),
    'ParcelCard must format flags with formatFlagLabel'
  );
  assert.ok(
    !parcelCardSrc.includes("Trạng thái: {sys.status"),
    'ParcelCard must not render raw sys.status'
  );
});

test('F13-PARCEL-CARD-01 U4: ParcelCard renders "Vì sao kết luận" box, lot batch table with own-batch marker, and batch count popup', () => {
  const parcelCardSrc = readSrc('./components/F13V2ParcelCard.jsx');
  const journeyModalSrc = readSrc('./components/F13V2JourneyParcelModal.jsx');

  // C6.1: "Vì sao kết luận" box
  assert.ok(
    parcelCardSrc.includes('buildWhyConclusion'),
    'ParcelCard must use buildWhyConclusion helper for the Vì sao kết luận box'
  );
  assert.ok(
    parcelCardSrc.includes('whyBox.title') && parcelCardSrc.includes('whyBox.lines'),
    'ParcelCard must render whyBox title and lines'
  );

  // C6.2: Lot batch table & own batch marker & footer notes
  assert.ok(
    parcelCardSrc.includes('← bưu gửi này'),
    'ParcelCard must mark own batch row with "← bưu gửi này"'
  );
  assert.ok(
    parcelCardSrc.includes('Lô trọn lúc'),
    'ParcelCard must show "Lô trọn lúc {complete_at}" under the lot table'
  );
  assert.ok(
    parcelCardSrc.includes('Chỉ tính bưu gửi của đơn vị bạn; lô còn bưu gửi của đơn vị khác.'),
    'ParcelCard must show scope_hidden note when applicable'
  );
  assert.ok(
    parcelCardSrc.includes('bưu gửi không có giờ quét TMS.'),
    'ParcelCard must show no_tms note when no_tms > 0'
  );

  // C6.3: Batch count button opens shared list popup in Hành trình view
  assert.ok(
    parcelCardSrc.includes('setActiveBatchModal') && parcelCardSrc.includes('<F13V2JourneyParcelModal'),
    'ParcelCard must open F13V2JourneyParcelModal when a batch count button is clicked'
  );
  assert.ok(
    journeyModalSrc.includes('buildLotBatchQuery') && journeyModalSrc.includes('lotBatch'),
    'F13V2JourneyParcelModal must support lotBatch mode using buildLotBatchQuery'
  );
});





