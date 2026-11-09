import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canAccessPath } from '../../auth/accessModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readSrc = (relPath) => fs.readFileSync(path.resolve(__dirname, relPath), 'utf8');

test('F13-RULE-PROPOSAL-01: F13V2RuleProposalTable complies with report block standards', () => {
  const content = readSrc('./components/F13V2RuleProposalTable.jsx');

  // Camera capture button per report standard
  assert.ok(content.includes('<BlockCaptureButton'), 'ProposalTable must include BlockCaptureButton');
  assert.ok(content.includes('indicatorTheme'), 'ProposalTable must use indicatorTheme');

  // Must not have fixed dark blue
  assert.ok(!content.includes('#003E7E') && !content.includes('#1e3a8a'), 'Must not carry fixed dark blue');

  // Click-to-order headers with SortableTh
  assert.ok(content.includes('<SortableTh'), 'ProposalTable must use SortableTh for column titles');

  // Empty state
  assert.ok(content.includes('Chưa có đề xuất nào'), 'ProposalTable must display empty state when list is empty');

  // Essential columns & information
  assert.ok(content.includes('formatSystemConclusion'), 'Must format system conclusion');
  assert.ok(content.includes('formatChosenCause'), 'Must format chosen cause');
  assert.ok(content.includes('formatStillRatio'), 'Must display "còn giữ kết luận hệ thống x / n"');
  assert.ok(content.includes('formatDateSpan'), 'Must display first/last date span');

  // data-no-capture on interactive controls
  assert.ok(content.includes('data-no-capture="true"'), 'Action elements must have data-no-capture');
});

test('F13-RULE-PROPOSAL-01: F13V2RuleProposalDetailPanel implements samples, history, decisions and ready text', () => {
  const content = readSrc('./components/F13V2RuleProposalDetailPanel.jsx');

  // Samples with notes and parcel card (F13-PARCEL-CARD-01: opens F13V2ParcelCard)
  assert.ok(content.includes('samples.map'), 'Must render sample list');
  assert.ok(content.includes('F13V2ParcelCard'), 'Samples must open parcel card');

  // Decision history
  assert.ok(content.includes('history.map'), 'Must render decision history');

  // Actions
  assert.ok(content.includes('Duyệt đề xuất') || content.includes('Duyệt'), 'Must provide Duyệt action');
  assert.ok(content.includes('Không duyệt'), 'Must provide Không duyệt action');
  assert.ok(content.includes('Đã áp dụng'), 'Must provide Đã áp dụng action');

  // Mandatory note & ticket ID validation
  assert.ok(content.includes('validateDecisionInput'), 'Must validate decision input using pure helper');

  // Ready text copy
  assert.ok(content.includes('ready_text') || content.includes('readyText'), 'Must support ready_text');
  assert.ok(content.includes('navigator.clipboard.writeText'), 'Must have clipboard copy functionality');

  // Escape key handler using globalThis
  assert.ok(content.includes('globalThis.addEventListener'), 'Must use globalThis for event listener');
});

test('F13-RULE-PROPOSAL-01: F13V2RuleProposalPage implements status tabs and layout structure', () => {
  const content = readSrc('./F13V2RuleProposalPage.jsx');

  // PageContainer
  assert.ok(content.includes('<PageContainer'), 'Must use PageContainer');
  assert.ok(content.includes('title="Đề xuất quy tắc"'), 'Must have title "Đề xuất quy tắc"');

  // Status tabs with counts
  assert.ok(content.includes('STATUS_TABS.map'), 'Must render status tabs');
  assert.ok(content.includes('counts[tab.key]'), 'Must render count badge for each tab');

  // URL encode key check
  const apiContent = readSrc('./api/f13v2Api.js');
  assert.ok(
    apiContent.includes('encodeURIComponent(key)'),
    'f13v2Api must always encodeURIComponent(key) for rule-proposal endpoints'
  );
});

test('F13-RULE-PROPOSAL-01: App.jsx, appNavigation.jsx, and accessModel.js register the Rule Proposal page cleanly', () => {
  const appContent = readSrc('../../App.jsx');
  const navContent = readSrc('../../navigation/appNavigation.jsx');

  // Registered in App.jsx under f13/v2
  assert.ok(
    appContent.includes('<Route path="de-xuat-quy-tac" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><F13V2RuleProposalPage /></ProtectedRoute>} />'),
    'App.jsx must register de-xuat-quy-tac route with ROLE_ADMIN'
  );

  // Registered in appNavigation.jsx under F13_GROUP after Hành trình bưu gửi
  const f13GroupMatch = navContent.match(/const F13_GROUP = \{[\s\S]*?subItems:\s*\[([\s\S]*?)\]/);
  assert.ok(f13GroupMatch, 'F13_GROUP must exist');
  const subItems = f13GroupMatch[1];
  const hanhTrinhIdx = subItems.indexOf("'/f13/v2/hanh-trinh'");
  const deXuatIdx = subItems.indexOf("'/f13/v2/de-xuat-quy-tac'");
  assert.ok(hanhTrinhIdx !== -1, 'Hành trình bưu gửi must exist');
  assert.ok(deXuatIdx !== -1, 'Đề xuất quy tắc must exist');
  assert.ok(deXuatIdx > hanhTrinhIdx, 'Đề xuất quy tắc must be placed after Hành trình bưu gửi');
});

test('F13-RULE-PROPOSAL-01: Gating at accessModel restricts /f13/v2/de-xuat-quy-tac to f13.rule.view capability', () => {
  const adminAccess = {
    capabilities: ['f13.rule.view', 'f13.rule.decide'],
    modules: { f13: { mode: 'all', bcvh: [] } },
    admin: true,
  };
  const staffAccess = {
    capabilities: ['f13.analysis.view', 'f13.analysis.write'],
    modules: { f13: { mode: 'bcvh', bcvh: ['533140'] } },
    admin: false,
  };

  assert.equal(canAccessPath(adminAccess, '/f13/v2/de-xuat-quy-tac'), true, 'Admin with capability must be allowed');
  assert.equal(canAccessPath(staffAccess, '/f13/v2/de-xuat-quy-tac'), false, 'Staff without capability must be denied');

  // Legacy fallback
  assert.equal(canAccessPath(null, '/f13/v2/de-xuat-quy-tac', 'admin'), true, 'Legacy admin must be allowed');
  assert.equal(canAccessPath(null, '/f13/v2/de-xuat-quy-tac', 'viewer'), false, 'Legacy viewer must be denied');
});
