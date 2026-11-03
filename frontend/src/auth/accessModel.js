// RBAC-01-UI: Single pure module for access control rules and navigation gating
// Built on the backend access contract (DEC-022, resolveAccess.js).

export const BCVH_BY_CODE = Object.freeze({
  '533140': 'BCVH Thuận Hóa',
  '536250': 'BCVH Hương Thủy',
  '535470': 'BCVH Hương Trà',
  '537220': 'BCVH Phú Lộc',
  '537015': 'BCVH Thuận An',
  '535790': 'BCVH A Lưới',
});

export const BCVH_CODES = Object.freeze(Object.keys(BCVH_BY_CODE));

export const ALL_HANGTON_SCREENS = Object.freeze(['overview', 'office', 'compare', 'items']);

// HANGTON-HANDLING-01: positions (chức vụ) and capabilities, mirror of backend/src/services/auth/access/roles.js.
// The backend decides; this only labels and gates what the screens show.
export const CAPABILITIES = Object.freeze({
  HANGTON_HANDLING_VIEW: 'hangton.handling.view',
  HANGTON_HANDLING_WRITE: 'hangton.handling.write',
  HANGTON_HANDLING_APPROVE: 'hangton.handling.approve',
  HANGTON_HANDLING_REASONS: 'hangton.handling.reasons',
  JOURNAL_MANAGE: 'journal.manage',
});

export const POSITION_LABELS = Object.freeze({
  ADMIN: 'Quản trị hệ thống',
  LD_BDTP: 'Lãnh đạo BĐTP',
  GD_TTVH: 'Giám đốc TTVH',
  LD_TTVH: 'Lãnh đạo TTVH',
  IT_BDTP: 'IT BĐTP',
  CHUYEN_QUAN: 'Chuyên quản BCVH',
  GD_BCVH: 'Giám đốc BCVH',
  STAFF: 'Chuyên viên',
});

// Positions an account of a tier may hold (the first one is the default when none is stored).
export const POSITIONS_BY_TIER = Object.freeze({
  ADMIN: ['ADMIN'],
  LEADER: ['LD_TTVH', 'GD_TTVH', 'IT_BDTP', 'LD_BDTP'],
  STAFF: ['STAFF', 'GD_BCVH', 'CHUYEN_QUAN'],
});

export function positionLabel(position) {
  return POSITION_LABELS[position] || '';
}

export function hasCapability(access, capability) {
  return Array.isArray(access?.capabilities) && access.capabilities.includes(capability);
}

/**
 * Returns the module access config for a given module key ('f11', 'f12', 'f13', 'f41').
 * If access is missing (legacy role-only session), falls back based on role.
 */
export function getModuleAccess(access, moduleKey, legacyRole = null) {
  if (access?.modules?.[moduleKey]) {
    return access.modules[moduleKey];
  }

  // Legacy fallback if access object is not yet populated
  const role = String(legacyRole || '').trim().toLowerCase();
  if (role === 'admin' || role === 'viewer') {
    return { mode: 'all', bcvh: [] };
  }

  return { mode: 'none', bcvh: [] };
}

/**
 * Checks whether the user has full 'all' city-wide access for a module.
 */
export function isModuleAllMode(access, moduleKey, legacyRole = null) {
  return getModuleAccess(access, moduleKey, legacyRole).mode === 'all';
}

/**
 * Checks whether the user is restricted to specific BCVH for a module.
 */
export function isModuleBcvhMode(access, moduleKey, legacyRole = null) {
  return getModuleAccess(access, moduleKey, legacyRole).mode === 'bcvh';
}

/**
 * Returns the allowed BCVH codes for a module. If mode is 'all', returns all canonical BCVH codes.
 */
export function getAllowedBcvhCodes(access, moduleKey, legacyRole = null) {
  const mod = getModuleAccess(access, moduleKey, legacyRole);
  if (mod.mode === 'bcvh') {
    return mod.bcvh || [];
  }
  if (mod.mode === 'all') {
    return [...BCVH_CODES];
  }
  return [];
}

/**
 * Returns allowed hangton screens for the user.
 */
export function getAllowedHangtonScreens(access, legacyRole = null) {
  if (Array.isArray(access?.hangton?.screens)) {
    return access.hangton.screens;
  }
  const role = String(legacyRole || '').trim().toLowerCase();
  if (role === 'admin' || role === 'viewer') {
    return [...ALL_HANGTON_SCREENS];
  }
  return [];
}

/**
 * Determines whether the user has permission to access a specific pathname.
 * Pure function with no side effects.
 */
export function canAccessPath(access, pathname, legacyRole = null) {
  const cleanPath = String(pathname || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // Always accessible paths for authenticated users
  if (cleanPath === '/' || cleanPath === '/unauthorized' || cleanPath === '/change-password' || cleanPath === '/login') {
    if (cleanPath === '/') {
      return access ? Boolean(access.home) : true;
    }
    return true;
  }

  // Admin routes: System administration, imports, config, users, dev demos
  if (
    cleanPath === '/admin' ||
    cleanPath.startsWith('/admin/') ||
    cleanPath === '/import' ||
    cleanPath === '/kpi-config' ||
    cleanPath === '/system-info' ||
    cleanPath.startsWith('/dev/')
  ) {
    if (access && typeof access.admin === 'boolean') {
      return access.admin;
    }
    return String(legacyRole || '').trim().toLowerCase() === 'admin';
  }

  // Network map routes
  if (cleanPath === '/network-map' || cleanPath.startsWith('/network-map/')) {
    if (access && typeof access.network === 'boolean') {
      return access.network;
    }
    const role = String(legacyRole || '').trim().toLowerCase();
    return role === 'admin' || role === 'viewer';
  }

  // F1.1 routes
  if (cleanPath === '/f11' || cleanPath.startsWith('/f11/')) {
    const mod = getModuleAccess(access, 'f11', legacyRole);
    return mod.mode !== 'none';
  }

  // F1.2 routes
  if (cleanPath === '/f12' || cleanPath.startsWith('/f12/')) {
    const mod = getModuleAccess(access, 'f12', legacyRole);
    return mod.mode !== 'none';
  }

  // F1.3 routes
  if (cleanPath === '/f13' || cleanPath.startsWith('/f13/')) {
    // Incomplete placeholder pages stay admin only
    if (cleanPath === '/f13/pareto' || cleanPath === '/f13/message') {
      if (access && typeof access.admin === 'boolean') return access.admin;
      return String(legacyRole || '').trim().toLowerCase() === 'admin';
    }
    const mod = getModuleAccess(access, 'f13', legacyRole);
    return mod.mode !== 'none';
  }

  // F4.1 routes
  if (cleanPath === '/f41' || cleanPath.startsWith('/f41/')) {
    const mod = getModuleAccess(access, 'f41', legacyRole);
    return mod.mode !== 'none';
  }

  // F4.2 routes
  if (cleanPath === '/f42' || cleanPath.startsWith('/f42/')) {
    const mod = getModuleAccess(access, 'f42', legacyRole);
    return mod.mode !== 'none';
  }

  // Hang ton routes
  if (cleanPath === '/hangton' || cleanPath.startsWith('/hangton/')) {
    const allowedScreens = getAllowedHangtonScreens(access, legacyRole);
    if (!allowedScreens.length) return false;
    if (cleanPath === '/hangton') return true;
    const match = cleanPath.match(/^\/hangton\/([^/]+)/);
    if (match) {
      const tab = match[1];
      return allowedScreens.includes(tab);
    }
    return true;
  }

  // OPS-JOURNAL-01 Phase B3: My tasks route is accessible to all authenticated users
  if (cleanPath === '/ops-journal/my-tasks' || cleanPath === '/my-tasks') {
    return Boolean(access || legacyRole);
  }

  // OPS-JOURNAL-01: Ops Journal route requires journal.manage capability
  if (cleanPath === '/ops-journal' || cleanPath.startsWith('/ops-journal/')) {
    return hasCapability(access, 'journal.manage');
  }

  return false;
}

/**
 * Filters navigation tree by user access.
 */
export function filterNavigationByAccess(items = [], access = null, legacyRole = null) {
  return items
    .filter((item) => {
      // If flat item with path, check path access
      if (item.path) {
        return canAccessPath(access, item.path, legacyRole);
      }
      // Top-level module groups
      if (item.title === 'Quản trị hệ thống') {
        if (access && typeof access.admin === 'boolean') return access.admin;
        return String(legacyRole || '').trim().toLowerCase() === 'admin';
      }
      if (item.title === 'Quản lý mạng lưới') {
        if (access && typeof access.network === 'boolean') return access.network;
        const r = String(legacyRole || '').trim().toLowerCase();
        return r === 'admin' || r === 'viewer';
      }
      if (item.title?.includes('F1.1')) {
        return getModuleAccess(access, 'f11', legacyRole).mode !== 'none';
      }
      if (item.title?.includes('F1.2')) {
        return getModuleAccess(access, 'f12', legacyRole).mode !== 'none';
      }
      if (item.title?.includes('F1.3')) {
        return getModuleAccess(access, 'f13', legacyRole).mode !== 'none';
      }
      if (item.title?.includes('F4.1')) {
        return getModuleAccess(access, 'f41', legacyRole).mode !== 'none';
      }
      if (item.title?.includes('F4.2')) {
        return getModuleAccess(access, 'f42', legacyRole).mode !== 'none';
      }
      if (item.title?.includes('Hàng tồn')) {
        return getAllowedHangtonScreens(access, legacyRole).length > 0;
      }
      if (item.title === 'Nhật ký điều hành' || item.name === 'Nhật ký điều hành') {
        return hasCapability(access, 'journal.manage');
      }
      return true;
    })
    .map((item) => {
      if (!item.subItems) return item;
      const filteredSubs = filterNavigationByAccess(item.subItems, access, legacyRole);
      return {
        ...item,
        subItems: filteredSubs,
      };
    })
    .filter((item) => {
      // Drop group if it has subItems and all subItems were filtered out
      if (item.subItems && item.subItems.length === 0) {
        return false;
      }
      return true;
    });
}
