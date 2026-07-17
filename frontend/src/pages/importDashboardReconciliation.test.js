import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardReconciliationUrl,
  buildImportReconciliationContext,
} from './importDashboardReconciliation.js';

test('buildDashboardReconciliationUrl opens dashboard for the same imported date and aggregate context', () => {
  assert.equal(
    buildDashboardReconciliationUrl({ date: '2026-07-15' }),
    '/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all',
  );
});

test('buildDashboardReconciliationUrl rejects missing or malformed import dates', () => {
  assert.equal(buildDashboardReconciliationUrl({ date: null }), null);
  assert.equal(buildDashboardReconciliationUrl({ date: '15/07/2026' }), null);
  assert.equal(buildDashboardReconciliationUrl({ date: '2026-99-99' }), null);
});

test('buildImportReconciliationContext preserves import identifiers and successful dashboard action state', () => {
  const context = buildImportReconciliationContext({
    id: 118,
    ten_file: 'F1.3-2026.07.15.xlsx',
    ngay_so_lieu: '2026-07-15',
    so_luong_bg: 3677,
    trang_thai: 'SUCCESS',
  });

  assert.deepEqual(context, {
    importLogId: 118,
    fileName: 'F1.3-2026.07.15.xlsx',
    dataDate: '2026-07-15',
    importedRecords: 3677,
    dashboardUrl: '/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all',
    bcvhContext: 'all',
    canOpenDashboard: true,
  });
});

test('buildImportReconciliationContext does not expose dashboard action for failed imports', () => {
  const context = buildImportReconciliationContext({
    id: 119,
    ngay_so_lieu: '2026-07-15',
    trang_thai: 'FAILED',
  });

  assert.equal(context.canOpenDashboard, false);
  assert.equal(context.dashboardUrl, '/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all');
});
