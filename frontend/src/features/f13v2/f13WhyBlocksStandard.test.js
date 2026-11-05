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

  // PO Business Rule: "Tuyến khác" kept apart from postman routes
  assert.match(source, /Tuyến khác/);
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
