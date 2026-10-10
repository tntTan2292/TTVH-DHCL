import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  slugifyText,
  formatCaptureTimestamp,
  buildCaptureFileName,
  buildCaptureCaption,
  copyBlobToClipboard,
} from './blockCaptureHelper.js';

test('slugifyText correctly converts Vietnamese accents and punctuation to ASCII slug', () => {
  assert.equal(slugifyText('Bảng điều hành'), 'Bang-dieu-hanh');
  assert.equal(slugifyText('Bưu cục chấp nhận × BCVH phát'), 'Buu-cuc-chap-nhan-BCVH-phat');
  assert.equal(slugifyText('Xu hướng chất lượng theo tháng (T01 đến T10)'), 'Xu-huong-chat-luong-theo-thang-T01-den-T10');
  assert.equal(slugifyText(''), '');
  assert.equal(slugifyText(null), '');
});

test('formatCaptureTimestamp formats date to HH:mm:ss DD/MM/YYYY', () => {
  const fixedDate = new Date(2026, 9, 10, 14, 30, 45); // Oct 10, 2026
  assert.equal(formatCaptureTimestamp(fixedDate), '14:30:45 10/10/2026');
});

test('buildCaptureFileName follows the exact PO approved format Indicator_Block_Date.png', () => {
  assert.equal(
    buildCaptureFileName({ indicator: 'F1.1', blockTitle: 'Bảng điều hành', dateOrPeriod: '2026-10-07' }),
    'F1.1_Bang-dieu-hanh_2026-10-07.png',
  );
  assert.equal(
    buildCaptureFileName({ indicator: 'F1.3', blockTitle: 'Xếp hạng BCVH', dateOrPeriod: '2026-10-07' }),
    'F1.3_Xep-hang-BCVH_2026-10-07.png',
  );
  assert.equal(
    buildCaptureFileName({ indicator: 'F4.1', blockTitle: 'Bưu cục chấp nhận × BCVH phát', dateOrPeriod: '2026-10-07' }),
    'F4.1_Buu-cuc-chap-nhan-BCVH-phat_2026-10-07.png',
  );
  assert.equal(
    buildCaptureFileName({ indicator: 'F1.3', blockTitle: 'Tổng quan điều hành' }),
    'F1.3_Tong-quan-dieu-hanh.png',
  );
});

test('buildCaptureCaption formats caption metadata and line text accurately', () => {
  const fixedDate = new Date(2026, 9, 10, 9, 15, 0);
  const caption = buildCaptureCaption({
    indicator: 'F1.1',
    blockTitle: 'Bảng điều hành',
    dateOrPeriod: '07/10/2026',
    generatedAt: fixedDate,
  });

  assert.equal(caption.indicator, 'F1.1');
  assert.equal(caption.blockTitle, 'Bảng điều hành');
  assert.equal(caption.dateOrPeriod, '07/10/2026');
  assert.equal(caption.formattedTime, '09:15:00 10/10/2026');
  assert.equal(caption.captionText, 'Chỉ số: F1.1 • Bảng điều hành • Kỳ: 07/10/2026 • Xuất lúc: 09:15:00 10/10/2026');
});

test('copyBlobToClipboard gracefully falls back to false in non-browser/non-clipboard environments', async () => {
  const result = await copyBlobToClipboard(null);
  assert.equal(result, false);
});

test('Report blocks across Dashboard and BCVH Ranking expose BlockCaptureButton', () => {
  const dashboardBlocks = [
    '../../features/dashboard/components/UnifiedCommandSummary.jsx',
    '../../components/f13/BcvhOperationTable.jsx',
    '../../features/dashboard/components/IntegratedTrendRiskWorkspace.jsx',
    '../../features/ranking/BcvhWeeklyComparisonBlock.jsx',
    '../../features/ranking/BcvhRankingOverviewBlocks.jsx',
    '../../features/dashboard/components/UnifiedBcvhAnalysisTable.jsx',
    '../../features/f11/components/F11PairTableBlock.jsx',
  ];

  for (const relativePath of dashboardBlocks) {
    const fileSource = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(
      fileSource,
      /BlockCaptureButton/,
      `Block ${relativePath} must import and expose BlockCaptureButton`,
    );
  }
});
