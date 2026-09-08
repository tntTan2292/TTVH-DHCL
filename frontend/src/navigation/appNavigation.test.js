import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const toPlain = (val) => JSON.parse(JSON.stringify(val));

function loadNavigationModule() {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');
  let sanitized = source
    .replace(/<[^>]+>/g, 'null')
    .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/g, '')
    .replace(/export\s+function/g, 'function');

  sanitized += '\nglobalThis.ROOT_ITEMS = ROOT_ITEMS;\nglobalThis.getNavigationForRole = getNavigationForRole;\nglobalThis.getDashboardQuickLinks = getDashboardQuickLinks;\n';

  const context = {
    ROLE_ADMIN: 'admin',
    ROLE_VIEWER: 'viewer',
    normalizeRole: (r) => String(r || '').trim().toLowerCase(),
  };
  vm.createContext(context);
  vm.runInContext(sanitized, context);
  return context;
}

test('ROOT_ITEMS defines exactly 03 top-level modules in strict order', () => {
  const { ROOT_ITEMS } = loadNavigationModule();

  assert.equal(ROOT_ITEMS.length, 3, 'Sidebar must have exactly 3 modules');
  assert.match(ROOT_ITEMS[0].title, /quản lý chất lượng/i, 'Module 1 must be QUẢN LÝ CHẤT LƯỢNG');
  assert.match(ROOT_ITEMS[1].title, /quản lý mạng lưới/i, 'Module 2 must be QUẢN LÝ MẠNG LƯỚI');
  assert.match(ROOT_ITEMS[2].title, /system administration/i, 'Module 3 must be SYSTEM ADMINISTRATION');
});

test('Module 1 (Quản lý chất lượng) contains F1.1, F1.2, F1.3, F4.1 in strict required order', () => {
  const { ROOT_ITEMS } = loadNavigationModule();
  const qualityModule = ROOT_ITEMS[0];
  assert.equal(qualityModule.subItems.length, 4, 'Quality module must contain 4 items');

  const [f11, f12, f13, f41] = qualityModule.subItems;

  assert.equal(f11.name, 'F1.1 Quality Management');
  assert.equal(f11.path, '/f11');
  assert.deepEqual(toPlain(f11.roles), ['admin']);

  assert.equal(f12.name, 'F1.2 Quality Management');
  assert.equal(f12.path, '/f12');
  assert.deepEqual(toPlain(f12.roles), ['admin']);

  assert.equal(f13.title, 'F1.3 Quality Management');
  assert.equal(Array.isArray(f13.subItems), true);

  assert.equal(f41.name, 'F4.1 Quality Management');
  assert.equal(f41.path, '/f41');
  assert.deepEqual(toPlain(f41.roles), ['admin']);
});

test('Module 2 (Quản lý mạng lưới) retains all 4 network map sub-menus', () => {
  const { ROOT_ITEMS } = loadNavigationModule();
  const networkModule = ROOT_ITEMS[1];

  assert.equal(networkModule.subItems.length, 4);
  const paths = networkModule.subItems.map((item) => item.path);
  assert.deepEqual(toPlain(paths), [
    '/network-map/service-points',
    '/network-map/level2-routes',
    '/network-map/delivery-routes',
    '/network-map/integrated',
  ]);
  assert.equal(networkModule.roles, undefined, 'Network management must have no top-level role restriction');
});

test('Module 3 (System Administration) is restricted to ADMIN and keeps all 3 functions intact', () => {
  const { ROOT_ITEMS } = loadNavigationModule();
  const adminModule = ROOT_ITEMS[2];

  assert.deepEqual(toPlain(adminModule.roles), ['admin']);
  assert.equal(adminModule.subItems.length, 3);
  const paths = adminModule.subItems.map((item) => item.path);
  assert.deepEqual(toPlain(paths), [
    '/import',
    '/kpi-config',
    '/system-info',
  ]);
});

test('role-based visibility: ADMIN sees all 3 modules, Viewer sees only Module 1 and Module 2', () => {
  const { getNavigationForRole } = loadNavigationModule();

  const adminNav = getNavigationForRole('admin');
  assert.equal(adminNav.length, 3, 'ADMIN must see Module 1 + Module 2 + Module 3');
  assert.match(adminNav[0].title, /quản lý chất lượng/i);
  assert.match(adminNav[1].title, /quản lý mạng lưới/i);
  assert.match(adminNav[2].title, /system administration/i);

  // In Module 1, ADMIN sees all 4 items
  assert.equal(adminNav[0].subItems.length, 4);
  assert.equal(adminNav[0].subItems[0].name, 'F1.1 Quality Management');
  assert.equal(adminNav[0].subItems[1].name, 'F1.2 Quality Management');
  assert.equal(adminNav[0].subItems[2].title, 'F1.3 Quality Management');
  assert.equal(adminNav[0].subItems[3].name, 'F4.1 Quality Management');

  const viewerNav = getNavigationForRole('viewer');
  assert.equal(viewerNav.length, 2, 'User thường (viewer) must only see Module 1 + Module 2');
  assert.match(viewerNav[0].title, /quản lý chất lượng/i);
  assert.match(viewerNav[1].title, /quản lý mạng lưới/i);

  // In Module 1, viewer only sees completed F1.3
  assert.equal(viewerNav[0].subItems.length, 1);
  assert.equal(viewerNav[0].subItems[0].title, 'F1.3 Quality Management');

  // Module 3 is not present for viewer
  assert.equal(viewerNav.find((m) => /system administration/i.test(m.title)), undefined);
});

test('dashboard quick links preserve import access for admin only', () => {
  const { getDashboardQuickLinks } = loadNavigationModule();

  const adminLinks = getDashboardQuickLinks('admin');
  const viewerLinks = getDashboardQuickLinks('viewer');

  assert.equal(adminLinks.some((l) => l.path === '/import'), true);
  assert.equal(viewerLinks.some((l) => l.path === '/import'), false);
});

test('F1.3 navigation only displays complete surfaces (Operation Dashboard, BCVH Ranking, Tuyến Ranking, Evidence) and hides incomplete Pareto / RCA and Message Center', () => {
  const source = fs.readFileSync(new URL('./appNavigation.jsx', import.meta.url), 'utf8');

  const f13GroupMatch = source.match(/const F13_GROUP = \{[\s\S]*?title:\s*'F1.3 Quality Management'[\s\S]*?subItems:\s*\[([\s\S]*?)\]/);
  assert.ok(f13GroupMatch, 'F13_GROUP must be defined with subItems');
  const f13SubItemsText = f13GroupMatch[1];

  assert.match(f13SubItemsText, /name: 'Operation Dashboard',\s*path: '\/f13\/dashboard'/);
  assert.match(f13SubItemsText, /name: 'BCVH Ranking',\s*path: '\/f13\/ranking\/bcvh'/);
  assert.match(f13SubItemsText, /name: 'Tuyến Ranking',\s*path: '\/f13\/ranking\/route'/);
  assert.match(f13SubItemsText, /name: 'Evidence',\s*path: '\/f13\/evidence'/);

  assert.equal(f13SubItemsText.includes('/f13/pareto'), false, 'Pareto / RCA must be hidden from F1.3 navigation');
  assert.equal(f13SubItemsText.includes('/f13/message'), false, 'Message Center must be hidden from F1.3 navigation');
});

function loadSidebarMenuItems() {
  const source = fs.readFileSync(new URL('../components/Sidebar.jsx', import.meta.url), 'utf8');
  const match = source.match(/const menuItems = (\[[\s\S]*?\n  \];)/);
  assert.ok(match, 'menuItems array must be defined in Sidebar.jsx');
  const code = 'globalThis.menuItems = ' + match[1].replace(/<[^>]+>/g, 'null');
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context);
  return context.menuItems;
}

test('Sidebar.jsx is synchronized with exact 3 modules and F1.1 -> F1.2 -> F1.3 -> F4.1 ordering', () => {
  const menuItems = loadSidebarMenuItems();

  assert.equal(menuItems.length, 3, 'Sidebar.jsx must contain exactly 3 modules');
  assert.match(menuItems[0].title, /quản lý chất lượng/i);
  assert.match(menuItems[1].title, /quản lý mạng lưới/i);
  assert.match(menuItems[2].title, /system administration/i);

  // Verify Quality Management ordering in Sidebar.jsx
  const qualityItems = menuItems[0].subItems;
  assert.equal(qualityItems.length, 4, 'Quản lý chất lượng in Sidebar.jsx must have 4 items');

  assert.equal(qualityItems[0].name, 'F1.1 Quality Management');
  assert.equal(qualityItems[0].path, '/f11');

  assert.equal(qualityItems[1].name, 'F1.2 Quality Management');
  assert.equal(qualityItems[1].path, '/f12');

  assert.equal(qualityItems[2].title, 'F1.3 Quality Management');
  const f13Paths = qualityItems[2].subItems.map((item) => item.path);
  assert.deepEqual(toPlain(f13Paths), [
    '/f13/dashboard',
    '/f13/ranking/bcvh',
    '/f13/ranking/route',
    '/f13/evidence',
  ]);

  assert.equal(qualityItems[3].name, 'F4.1 Quality Management');
  assert.equal(qualityItems[3].path, '/f41');

  // Verify Pareto and Message Center remain excluded
  const subItemsText = JSON.stringify(qualityItems);
  assert.equal(subItemsText.includes('/f13/pareto'), false, 'Pareto / RCA must be hidden from Sidebar.jsx');
  assert.equal(subItemsText.includes('/f13/message'), false, 'Message Center must be hidden from Sidebar.jsx');
});
