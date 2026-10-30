import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BCVH_BY_CODE,
  BCVH_CODES,
  CAPABILITIES,
  POSITION_LABELS,
  POSITIONS_BY_TIER,
  canAccessPath,
  filterNavigationByAccess,
  getAllowedBcvhCodes,
  getAllowedHangtonScreens,
  getModuleAccess,
  hasCapability,
  isModuleAllMode,
  isModuleBcvhMode,
  positionLabel,
} from './accessModel.js';

// Personas according to backend resolveAccess and RBAC-01-UI manifest
const PERSONA_ADMIN = {
  tier: 'ADMIN',
  modules: {
    f11: { mode: 'all', bcvh: [] },
    f12: { mode: 'all', bcvh: [] },
    f13: { mode: 'all', bcvh: [] },
    f41: { mode: 'all', bcvh: [] },
  },
  hangton: { screens: ['overview', 'office', 'compare', 'items'], offices: 'all' },
  network: true,
  admin: true,
  home: true,
};

const PERSONA_LEADER = {
  tier: 'LEADER',
  modules: {
    f11: { mode: 'all', bcvh: [] },
    f12: { mode: 'all', bcvh: [] },
    f13: { mode: 'all', bcvh: [] },
    f41: { mode: 'all', bcvh: [] },
  },
  hangton: { screens: ['overview', 'office', 'compare', 'items'], offices: 'all' },
  network: true,
  admin: false,
  home: true,
};

const PERSONA_THUAN_HOA = {
  tier: 'STAFF',
  modules: {
    f11: { mode: 'bcvh', bcvh: ['533140'] },
    f12: { mode: 'none', bcvh: [] },
    f13: { mode: 'bcvh', bcvh: ['533140'] },
    f41: { mode: 'bcvh', bcvh: ['533140'] },
  },
  hangton: { screens: ['office', 'compare'], offices: ['533140'] },
  network: false,
  admin: false,
  home: true,
};

const PERSONA_HUONG_TRA_F11 = {
  tier: 'STAFF',
  modules: {
    f11: { mode: 'all', bcvh: [] },
    f12: { mode: 'none', bcvh: [] },
    f13: { mode: 'bcvh', bcvh: ['535470'] },
    f41: { mode: 'bcvh', bcvh: ['535470'] },
  },
  hangton: { screens: ['office', 'compare'], offices: ['535470'] },
  network: false,
  admin: false,
  home: true,
};

const PERSONA_PHU_LOC_A_LUOI = {
  tier: 'STAFF',
  modules: {
    f11: { mode: 'bcvh', bcvh: ['535790', '537220'] },
    f12: { mode: 'none', bcvh: [] },
    f13: { mode: 'bcvh', bcvh: ['535790', '537220'] },
    f41: { mode: 'bcvh', bcvh: ['535790', '537220'] },
  },
  hangton: { screens: ['office', 'compare'], offices: ['535710', '535790', '537220'] },
  network: false,
  admin: false,
  home: true,
};

const PERSONA_F12_SPECIALIST = {
  tier: 'STAFF',
  modules: {
    f11: { mode: 'none', bcvh: [] },
    f12: { mode: 'all', bcvh: [] },
    f13: { mode: 'none', bcvh: [] },
    f41: { mode: 'none', bcvh: [] },
  },
  hangton: { screens: ['office', 'compare'], offices: ['530100'] },
  network: false,
  admin: false,
  home: true,
};

test('canonical BCVH mapping contains exact 6 BCVH units', () => {
  assert.equal(BCVH_CODES.length, 6);
  assert.equal(BCVH_BY_CODE['533140'], 'BCVH Thuận Hóa');
  assert.equal(BCVH_BY_CODE['536250'], 'BCVH Hương Thủy');
  assert.equal(BCVH_BY_CODE['535470'], 'BCVH Hương Trà');
  assert.equal(BCVH_BY_CODE['537220'], 'BCVH Phú Lộc');
  assert.equal(BCVH_BY_CODE['537015'], 'BCVH Thuận An');
  assert.equal(BCVH_BY_CODE['535790'], 'BCVH A Lưới');
});

test('ADMIN persona has full access to all modules, network and admin', () => {
  assert.equal(canAccessPath(PERSONA_ADMIN, '/'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/f11/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/f12/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/f13/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/f41/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/hangton/overview'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/hangton/office'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/hangton/compare'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/hangton/items'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/network-map/service-points'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/admin/users'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/import'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/system-info'), true);

  assert.equal(isModuleAllMode(PERSONA_ADMIN, 'f13'), true);
  assert.equal(isModuleBcvhMode(PERSONA_ADMIN, 'f13'), false);
  assert.deepEqual(getAllowedBcvhCodes(PERSONA_ADMIN, 'f13'), BCVH_CODES);
  assert.deepEqual(getAllowedHangtonScreens(PERSONA_ADMIN), ['overview', 'office', 'compare', 'items']);
});

test('LEADER persona has access to all modules and network, but NOT admin', () => {
  assert.equal(canAccessPath(PERSONA_LEADER, '/'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/f11/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/f12/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/f13/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/f41/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/network-map/service-points'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/hangton/overview'), true);

  // Forbidden admin routes
  assert.equal(canAccessPath(PERSONA_LEADER, '/admin/users'), false);
  assert.equal(canAccessPath(PERSONA_LEADER, '/import'), false);
  assert.equal(canAccessPath(PERSONA_LEADER, '/kpi-config'), false);
  assert.equal(canAccessPath(PERSONA_LEADER, '/system-info'), false);
});

test('Thuận Hóa director sees F1.1, F1.3, F4.1 in BCVH mode, no F1.2, no network, no admin', () => {
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/'), true);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/f11/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/f13/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/f41/dashboard'), true);

  // F1.2 forbidden
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/f12/dashboard'), false);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/f12/ranking/bcvh'), false);

  // Network and admin forbidden
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/network-map/service-points'), false);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/admin/users'), false);

  // Hang ton: only office and compare, NOT overview or items
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/hangton/office'), true);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/hangton/compare'), true);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/hangton/overview'), false);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/hangton/items'), false);

  assert.equal(isModuleBcvhMode(PERSONA_THUAN_HOA, 'f13'), true);
  assert.equal(isModuleAllMode(PERSONA_THUAN_HOA, 'f13'), false);
  assert.deepEqual(getAllowedBcvhCodes(PERSONA_THUAN_HOA, 'f13'), ['533140']);
  assert.deepEqual(getAllowedHangtonScreens(PERSONA_THUAN_HOA), ['office', 'compare']);
});

test('F1.1 + Hương Trà user: F1.1 mode is ALL, F1.3 and F4.1 are BCVH (535470), F1.2 is none', () => {
  assert.equal(isModuleAllMode(PERSONA_HUONG_TRA_F11, 'f11'), true);
  assert.equal(isModuleBcvhMode(PERSONA_HUONG_TRA_F11, 'f13'), true);
  assert.deepEqual(getAllowedBcvhCodes(PERSONA_HUONG_TRA_F11, 'f13'), ['535440', '535470'].filter((c) => c === '535470'), ['535470']);
  assert.equal(isModuleBcvhMode(PERSONA_HUONG_TRA_F11, 'f41'), true);
  assert.equal(getModuleAccess(PERSONA_HUONG_TRA_F11, 'f12').mode, 'none');

  assert.equal(canAccessPath(PERSONA_HUONG_TRA_F11, '/f11/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_HUONG_TRA_F11, '/f12/dashboard'), false);
  assert.equal(canAccessPath(PERSONA_HUONG_TRA_F11, '/f13/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_HUONG_TRA_F11, '/f41/dashboard'), true);
});

test('Phú Lộc + A Lưới user has 2 BCVH codes for F1.1, F1.3, F4.1', () => {
  assert.deepEqual(getAllowedBcvhCodes(PERSONA_PHU_LOC_A_LUOI, 'f13'), ['535790', '537220']);
  assert.deepEqual(getAllowedBcvhCodes(PERSONA_PHU_LOC_A_LUOI, 'f11'), ['535790', '537220']);
  assert.deepEqual(getAllowedBcvhCodes(PERSONA_PHU_LOC_A_LUOI, 'f41'), ['535790', '537220']);
  assert.equal(canAccessPath(PERSONA_PHU_LOC_A_LUOI, '/f12/dashboard'), false);
  assert.equal(canAccessPath(PERSONA_PHU_LOC_A_LUOI, '/network-map/delivery-routes'), false);
});

test('F1.2 specialist sees only F1.2 and Hàng tồn (office, compare), no F1.1, F1.3, F4.1', () => {
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/f12/dashboard'), true);
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/f12/ranking/bcvh'), true);
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/f11/dashboard'), false);
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/f13/dashboard'), false);
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/f41/dashboard'), false);
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/hangton/office'), true);
  assert.equal(canAccessPath(PERSONA_F12_SPECIALIST, '/hangton/items'), false);
});

test('filterNavigationByAccess prunes forbidden modules and hangton sub-screens', () => {
  const dummyMenu = [
    { name: 'Trang chủ', path: '/' },
    {
      title: 'Quản lý chất lượng',
      subItems: [
        {
          title: 'F1.1 – Chất lượng toàn trình nội tỉnh',
          subItems: [{ name: 'Bảng điều hành', path: '/f11/dashboard' }],
        },
        {
          title: 'F1.2 – Thu gom liên tỉnh',
          subItems: [{ name: 'Bảng điều hành', path: '/f12/dashboard' }],
        },
        {
          title: 'F1.3 – Chất lượng phát liên tỉnh',
          subItems: [{ name: 'Bảng điều hành', path: '/f13/dashboard' }],
        },
        {
          title: 'F4.1 – Chất lượng phát thành công bưu cục',
          subItems: [{ name: 'Bảng điều hành', path: '/f41/dashboard' }],
        },
        {
          title: 'Chỉ số rà soát Hàng tồn',
          subItems: [
            { name: 'Tổng quan', path: '/hangton/overview' },
            { name: 'Theo bưu cục', path: '/hangton/office' },
            { name: 'So sánh hai mốc', path: '/hangton/compare' },
            { name: 'Chi tiết bưu gửi', path: '/hangton/items' },
          ],
        },
      ],
    },
    {
      title: 'Quản lý mạng lưới',
      subItems: [{ name: 'Mạng điểm phục vụ', path: '/network-map/service-points' }],
    },
    {
      title: 'Quản trị hệ thống',
      subItems: [
        { name: 'Quản lý người dùng', path: '/admin/users' },
        { name: 'Trung tâm nạp dữ liệu', path: '/import' },
      ],
    },
  ];

  // Thuận Hóa director
  const thNav = filterNavigationByAccess(dummyMenu, PERSONA_THUAN_HOA);
  assert.equal(thNav.some((m) => m.title === 'Quản lý mạng lưới'), false);
  assert.equal(thNav.some((m) => m.title === 'Quản trị hệ thống'), false);
  const thQuality = thNav.find((m) => m.title === 'Quản lý chất lượng');
  assert.ok(thQuality);
  assert.equal(thQuality.subItems.some((s) => s.title.includes('F1.2')), false);
  assert.equal(thQuality.subItems.some((s) => s.title.includes('F1.3')), true);
  const thHangton = thQuality.subItems.find((s) => s.title.includes('Hàng tồn'));
  assert.deepEqual(thHangton.subItems.map((s) => s.path), ['/hangton/office', '/hangton/compare']);

  // Admin sees all
  const adminNav = filterNavigationByAccess(dummyMenu, PERSONA_ADMIN);
  assert.equal(adminNav.length, 4);
  assert.equal(adminNav.some((m) => m.title === 'Quản trị hệ thống'), true);
  assert.equal(adminNav.some((m) => m.title === 'Quản lý mạng lưới'), true);
});

test('GD_TTVH position and journal.manage capability access rules', () => {
  // Task 5: GD_TTVH ("Giám đốc TTVH", tier LEADER)
  assert.equal(POSITION_LABELS.GD_TTVH, 'Giám đốc TTVH');
  assert.equal(positionLabel('GD_TTVH'), 'Giám đốc TTVH');
  assert.ok(POSITIONS_BY_TIER.LEADER.includes('GD_TTVH'));
  assert.equal(CAPABILITIES.JOURNAL_MANAGE, 'journal.manage');

  const PERSONA_GD_TTVH = {
    tier: 'LEADER',
    position: 'GD_TTVH',
    capabilities: ['journal.manage'],
    modules: {
      f11: { mode: 'all', bcvh: [] },
      f12: { mode: 'all', bcvh: [] },
      f13: { mode: 'all', bcvh: [] },
      f41: { mode: 'all', bcvh: [] },
    },
    hangton: { screens: ['overview', 'office', 'compare', 'items'], offices: 'all' },
    network: true,
    admin: false,
    home: true,
  };

  const PERSONA_STAFF_NO_JOURNAL = {
    tier: 'STAFF',
    capabilities: [],
    modules: { f13: { mode: 'all', bcvh: [] } },
    home: true,
  };

  // hasCapability helper
  assert.equal(hasCapability(PERSONA_GD_TTVH, 'journal.manage'), true);
  assert.equal(hasCapability(PERSONA_STAFF_NO_JOURNAL, 'journal.manage'), false);
  assert.equal(hasCapability(null, 'journal.manage'), false);

  // Path access gating: /ops-journal only accessible when journal.manage capability is present
  assert.equal(canAccessPath(PERSONA_GD_TTVH, '/ops-journal'), true);
  assert.equal(canAccessPath(PERSONA_GD_TTVH, '/ops-journal/candidates'), true);
  assert.equal(canAccessPath(PERSONA_STAFF_NO_JOURNAL, '/ops-journal'), false);
  assert.equal(canAccessPath(PERSONA_LEADER, '/ops-journal'), false);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/ops-journal'), false); // without explicit journal.manage capability

  // Navigation filtering
  const navWithJournal = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Nhật ký điều hành', path: '/ops-journal' },
  ];
  const allowedNav = filterNavigationByAccess(navWithJournal, PERSONA_GD_TTVH);
  assert.equal(allowedNav.some((item) => item.path === '/ops-journal'), true);

  const deniedNav = filterNavigationByAccess(navWithJournal, PERSONA_STAFF_NO_JOURNAL);
  assert.equal(deniedNav.some((item) => item.path === '/ops-journal'), false);

  // Phase B3: /ops-journal/my-tasks is accessible to all authenticated users
  assert.equal(canAccessPath(PERSONA_STAFF_NO_JOURNAL, '/ops-journal/my-tasks'), true);
  assert.equal(canAccessPath(PERSONA_THUAN_HOA, '/ops-journal/my-tasks'), true);
  assert.equal(canAccessPath(PERSONA_LEADER, '/ops-journal/my-tasks'), true);
  assert.equal(canAccessPath(PERSONA_ADMIN, '/ops-journal/my-tasks'), true);
  assert.equal(canAccessPath(null, '/ops-journal/my-tasks'), false);
});
