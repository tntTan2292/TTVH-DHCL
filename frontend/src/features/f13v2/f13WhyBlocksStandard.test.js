import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('F13-WHY-UI-01: F13V2WhyDiagnosticCard complies with report block standard', () => {
  const source = read('./components/F13V2WhyDiagnosticCard.jsx');

  // Standard 1: Block has camera button
  assert.match(source, /BlockCaptureButton/);

  // Standard 4: Reads target rate from indicator config
  assert.match(source, /indicatorTargetRate/);

  // Standard 5: Reads indicatorTheme, no hardcoded fixed dark blue or purple
  assert.match(source, /indicatorTheme/);
  assert.doesNotMatch(source, /#003E7E/i);
  assert.doesNotMatch(source, /purple|violet|fuchsia/i);
});

test('F13-WHY-UI-01: F13V2WhyRouteTable complies with report block standard', () => {
  const source = read('./components/F13V2WhyRouteTable.jsx');

  // Standard 1: Block has camera button
  assert.match(source, /BlockCaptureButton/);

  // Standard 2: Click-to-order column titles using SortableTh
  assert.match(source, /SortableTh/);

  // Standard 4: Reads target rate from indicator config
  assert.match(source, /indicatorTargetRate/);

  // Standard 5: Reads indicatorTheme, no hardcoded dark blue or purple
  assert.match(source, /indicatorTheme/);
  assert.doesNotMatch(source, /#003E7E/i);
  assert.doesNotMatch(source, /purple|violet|fuchsia/i);

  // PO Business Rule: routes outside the postman ranking kept apart, in two groups (PO 2026-11-07)
  assert.match(source, /Phát tại quầy \(khách đến nhận\)/);
  assert.match(source, /Tuyến chưa xác định/);
  assert.match(source, /separateRouteScopes/);
});

test('F13-WHY-UI-01: F13V2WhyFilterBar complies with UI defect prevention rules', () => {
  const source = read('./components/F13V2WhyFilterBar.jsx');

  // Rule 7: controls marked data-no-capture
  assert.match(source, /data-no-capture="true"/);

  // Rule 10: Period buttons titled exactly "Theo ngày | Theo tuần | Theo tháng"
  assert.match(source, /label:\s*'Theo ngày'/);
  assert.match(source, /label:\s*'Theo tuần'/);
  assert.match(source, /label:\s*'Theo tháng'/);
});

test('F13-WHY-UI-01: App.jsx and appNavigation.jsx register the Why page cleanly', () => {
  const navSource = read('../../navigation/appNavigation.jsx');
  const appSource = read('../../App.jsx');

  // Menu item registered
  assert.match(navSource, /name:\s*'Phân tích nguyên nhân',\s*path:\s*'\/f13\/v2\/why'/);

  // Route registered
  assert.match(appSource, /<Route\s+path="why"/);
  assert.match(appSource, /F13V2WhyPage/);
});

test('F13-WHY-UI-01 S1-PO1: the unit select cannot show a browser-restored choice', () => {
  const source = read('./components/F13V2WhyFilterBar.jsx');
  assert.match(source, /autoComplete="off"/);
  assert.match(source, /key=\{`\$\{bcvh\}\|/);
});

test('F13-WHY-UI-01 Step 2: F13V2WhyPostmanSubTable complies with report standards and no-blame rule', () => {
  const source = read('./components/F13V2WhyPostmanSubTable.jsx');

  // Standard 2: Click-to-order column titles using SortableTh
  assert.match(source, /SortableTh/);

  // Standard 4: Reads target rate from indicator config
  assert.match(source, /indicatorTargetRate/);

  // Standard 5: Reads indicatorTheme, no hardcoded fixed dark blue or purple
  assert.match(source, /indicatorTheme/);
  assert.doesNotMatch(source, /#003E7E/i);
  assert.doesNotMatch(source, /purple|violet|fuchsia/i);

  // Manifest Rule 4: facts only, no blame wording on a person or unit
  assert.match(source, /Không dùng từ ngữ quy kết cá nhân/);

  // Manifest Section 2A: "Chưa có bưu tá" bucket
  assert.match(source, /Chưa có bưu tá/);
});

test('F13-WHY-UI-01 Step 2: F13V2WhyParcelModal complies with report standards and parcel journey links', () => {
  const source = read('./components/F13V2WhyParcelModal.jsx');

  // Standard 1: Modal has camera button
  assert.match(source, /BlockCaptureButton/);

  // Standard 2: Click-to-order column titles using SortableTh
  assert.match(source, /SortableTh/);

  // Standard 5: Reads indicatorTheme
  assert.match(source, /indicatorTheme/);
  assert.doesNotMatch(source, /#003E7E/i);
  assert.doesNotMatch(source, /purple|violet|fuchsia/i);

  // Rule 7: controls marked data-no-capture
  assert.match(source, /data-no-capture="true"/);

  // Manifest Section 2A: opens Hành trình bưu gửi for its day
  assert.match(source, /\/f13\/v2\/hanh-trinh/);
});
