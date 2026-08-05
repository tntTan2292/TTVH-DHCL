import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('viewer routing keeps only the approved completed F1.3 surfaces and blocks admin modules by direct route contract', () => {
  const source = fs.readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');

  assert.match(source, /allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}>\s*<MainLayout/);
  assert.match(source, /path="dashboard" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><DashboardPage/);
  assert.match(source, /path="ranking\/bcvh" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><BcvhRankingPage/);
  assert.match(source, /path="ranking\/route" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><RoutePerformancePage/);
  assert.match(source, /path="import" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN\]\}><DataImportCenter/);
  assert.match(source, /path="system-info" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN\]\}><SystemInformation/);
  assert.match(source, /path="ranking\/shipment" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN\]\}><ShipmentPerformancePage/);
  assert.match(source, /path="ranking\/route\/violations" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN\]\}><RouteViolationEvidencePage/);
  assert.match(source, /path="service-points" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><ServicePointsPage/);
  assert.match(source, /path="level2-routes" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><Level2RoutesPage/);
  assert.match(source, /path="delivery-routes" element=\{<ProtectedRoute allowedRoles=\{\[ROLE_ADMIN, ROLE_VIEWER\]\}><DeliveryRoutesPage/);
});
