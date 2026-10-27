import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readSource = (relPath) => fs.readFileSync(path.resolve(__dirname, relPath), 'utf8');

test('F42DashboardPage wraps DashboardPage in IndicatorProvider with F42_INDICATOR', () => {
  const source = readSource('./F42DashboardPage.jsx');
  assert.match(source, /import DashboardPage from '\.\.\/dashboard\/DashboardPage'/);
  assert.match(source, /IndicatorProvider indicator=\{F42_INDICATOR\}/);
  assert.match(source, /<DashboardPage \/>/);
});

test('F42BcvhRankingPage wraps BcvhRankingPage in IndicatorProvider with F42_INDICATOR', () => {
  const source = readSource('./F42BcvhRankingPage.jsx');
  assert.match(source, /import BcvhRankingPage from '\.\.\/ranking\/BcvhRankingPage'/);
  assert.match(source, /IndicatorProvider indicator=\{F42_INDICATOR\}/);
  assert.match(source, /<BcvhRankingPage \/>/);
});

test('App.jsx registers /f42/dashboard and /f42/ranking/bcvh for admin and viewer, and /f42 redirects to dashboard', () => {
  const appSource = readSource('../../App.jsx');
  assert.match(appSource, /import F42DashboardPage from '\.\/features\/f42\/F42DashboardPage'/);
  assert.match(appSource, /import F42BcvhRankingPage from '\.\/features\/f42\/F42BcvhRankingPage'/);

  // Redirect
  assert.match(appSource, /<Route path="f42" element=\{<Navigate to="\/f42\/dashboard" replace \/>\} \/>/);

  // Protected routes
  assert.match(
    appSource,
    /<Route path="f42\/dashboard" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F42DashboardPage \/><\/ProtectedRoute>\} \/>/
  );
  assert.match(
    appSource,
    /<Route path="f42\/ranking\/bcvh" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><F42BcvhRankingPage \/><\/ProtectedRoute>\} \/>/
  );
});

test('UserManagementPage.jsx registers F4.2 in INDICATOR_LIST with code F4.2', () => {
  const userMgmtSource = readSource('../../pages/UserManagementPage.jsx');
  assert.match(userMgmtSource, /\{\s*code:\s*'F4\.2',\s*label:\s*'F4\.2 – Phát giao bưu tá'\s*\}/);
});

test('F42PostmanTableBlock maintains sticky header requirements without intermediate overflow clipping', () => {
  const tableSource = readSource('./components/F42PostmanTableBlock.jsx');

  // 1. Outer scroll container has vertical & horizontal scroll
  assert.match(tableSource, /max-h-\[560px\]\s+overflow-y-auto\s+overflow-x-auto/);

  // 2. thead uses sticky top-0 and z-10
  assert.match(tableSource, /<thead\s+className=\{`sticky top-0 z-10/);

  // 3. Header background is stripped of /90 transparency for solid opacity
  assert.match(tableSource, /const solidHeaderBg = theme\.headerBg\.replace\(\/\\\/90\/g,\s*''\);/);
  assert.match(tableSource, /const solidSortActive = theme\.sortActive\.replace\(\/\\\/90\/g,\s*''\);/);

  // 4. Verify no intermediate wrapper between outer scroll and thead has overflow-hidden / overflow-auto / overflow-x-auto
  // Unit wrapper has rounded-xl border border-slate-200/90 bg-white shadow-2xs without overflow-hidden
  assert.match(tableSource, /className="rounded-xl border border-slate-200\/90 bg-white shadow-2xs transition-all duration-150"/);

  // 5. Rounded bottom corners preserved via last row cells and table rounded-b-xl
  assert.match(tableSource, /last:\[&>td:first-child\]:rounded-bl-xl/);
  assert.match(tableSource, /last:\[&>td:last-child\]:rounded-br-xl/);
});

test('F42SixBcvhStripBlock renders "6 BCVH hôm nay" with order # only when backend returns 6 BCVHs', () => {
  const stripSource = readSource('./components/F42SixBcvhStripBlock.jsx');

  // Uses isFullSixBcvhStrip and getBcvhStripTitle
  assert.match(stripSource, /isFullSixBcvhStrip/);
  assert.match(stripSource, /getBcvhStripTitle/);
  assert.match(stripSource, /const isFullSix = isFullSixBcvhStrip\(units\);/);
  assert.match(stripSource, /getBcvhStripTitle\(units, formattedDate\)/);
  assert.match(stripSource, /\{isFullSix \? '6 BCVH hôm nay' : 'BCVH hôm nay'\}/);
  assert.match(stripSource, /\{isFullSix && \(\s*<span[^>]*>\s*#\{index \+ 1\}\s*<\/span>\s*\)\}/);
});

