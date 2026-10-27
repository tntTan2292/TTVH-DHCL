import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { F42_INDICATOR } from '../indicator/indicatorConfig.js';

test('F42DashboardPage wraps DashboardPage in IndicatorProvider with F42_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F42DashboardPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import DashboardPage from '\.\.\/dashboard\/DashboardPage'/);
  assert.match(source, /IndicatorProvider indicator=\{F42_INDICATOR\}/);
  assert.match(source, /<DashboardPage \/>/);
});

test('F42BcvhRankingPage wraps BcvhRankingPage in IndicatorProvider with F42_INDICATOR', () => {
  const source = fs.readFileSync(new URL('./F42BcvhRankingPage.jsx', import.meta.url), 'utf8');
  assert.match(source, /import BcvhRankingPage from '\.\.\/ranking\/BcvhRankingPage'/);
  assert.match(source, /IndicatorProvider indicator=\{F42_INDICATOR\}/);
  assert.match(source, /<BcvhRankingPage \/>/);
});

test('App.jsx registers /f42/dashboard and /f42/ranking/bcvh for admin and viewer, and /f42 redirects to dashboard', () => {
  const appSource = fs.readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
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
  const userMgmtSource = fs.readFileSync(new URL('../../pages/UserManagementPage.jsx', import.meta.url), 'utf8');
  assert.match(userMgmtSource, /\{\s*code:\s*'F4\.2',\s*label:\s*'F4\.2 – Phát giao bưu tá'\s*\}/);
});
