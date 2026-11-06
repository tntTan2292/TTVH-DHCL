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

  // Parcel Journey link
  assert.ok(content.includes('/f13/v2/hanh-trinh'), 'EvidenceTable must link to parcel journey');

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

  // Old route preserved until PO acceptance
  assert.ok(appContent.includes('<Route path="evidence" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><ShipmentPerformancePage /></ProtectedRoute>} />'), 'App.jsx must preserve legacy evidence route');

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

  // 3. Initial load effect runs once on mount
  assert.ok(
    pageContent.includes('Promise.all([\n      fetchLayout().catch(() => null),\n      fetchEvidenceCatalog().catch(() => null),\n      fetchDashboardMeta().catch(() => null),\n    ])'),
    'Must load layout, catalog and meta in mount effect'
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


