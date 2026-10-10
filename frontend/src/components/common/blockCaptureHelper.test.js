import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  slugifyText,
  formatCaptureTimestamp,
  buildCaptureFileName,
  buildCaptureCaption,
  copyBlobToClipboard,
  canUseAsyncImageClipboard,
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

test('copy helper refuses cleanly outside a browser: no secure clipboard', async () => {
  assert.equal(canUseAsyncImageClipboard(), false);
  assert.equal(await copyBlobToClipboard(Promise.resolve({})), false);
});

test('camera button: one click copies the image, a second small button saves the file', () => {
  const source = fs.readFileSync(new URL('./BlockCaptureButton.jsx', import.meta.url), 'utf8');
  assert.match(source, /onClick=\{\(\) => handleCapture\('copy'\)\}/);
  assert.match(source, /onClick=\{\(\) => handleCapture\('save'\)\}/);
  assert.doesNotMatch(source, /isOpen/);
});

test('copy is requested inside the click, before any await (clipboard needs the user action)', () => {
  const source = fs.readFileSync(new URL('./blockCaptureHelper.js', import.meta.url), 'utf8');
  const body = source.slice(source.indexOf('export async function executeBlockCapture'))
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  // rendering is started by an async function called right away (it may wait for the block to shrink itself
  // first), and nothing is awaited between that call and the clipboard request, so the click is still "fresh"
  const startRender = body.indexOf('const blobPromise = (async () => {');
  const endRender = body.indexOf('})();', startRender);
  const clipboardCall = body.indexOf('? await copyBlobToClipboard(blobPromise)');
  assert.ok(startRender > 0 && endRender > startRender && clipboardCall > endRender, 'render starts, then the clipboard is asked');
  assert.doesNotMatch(body.slice(endRender, clipboardCall), /await /, 'no await between starting the render and the clipboard request');
  assert.match(body, /beforeCapture/);
  assert.match(body, /afterCapture/);
  assert.match(body, /copyBlobToClipboard\(blobPromise\)/);
  // where the page may not write to the clipboard a preview is returned (right click > Copy image);
  // a copy request never saves a file by itself
  assert.match(body, /action: 'preview'/);
  const copyBranch = body.slice(body.indexOf("if (action === 'copy')"), body.indexOf('const blob = await blobPromise;\n  if (!blob) {'));
  assert.doesNotMatch(copyBranch, /downloadBlob/);
});

test('preview window offers right-click copy, save and close; it is excluded from the captured image', () => {
  const source = fs.readFileSync(new URL('./BlockCaptureButton.jsx', import.meta.url), 'utf8');
  assert.match(source, /Sao chép hình ảnh/);
  assert.match(source, /createPortal/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /data-no-capture="true"/);
  assert.match(source, /URL\.revokeObjectURL/);
});

test('regression: the weekly/monthly comparison block passes defined variables to the camera button (a ReferenceError there would break the ranking page)', () => {
  const source = fs.readFileSync(new URL('../../features/ranking/BcvhWeeklyComparisonBlock.jsx', import.meta.url), 'utf8');
  assert.match(source, /dateOrPeriod=\{isMonth \? monthSelection\.current : selection\.current\}/);
  assert.doesNotMatch(source, /\bselectedMonth\b|\bselectedWeek\b/);
});
