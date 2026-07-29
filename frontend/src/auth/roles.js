export const ROLE_ADMIN = 'admin';
export const ROLE_VIEWER = 'viewer';

export const VIEWER_ALLOWED_PATH_PREFIXES = [
  '/f13/dashboard',
  '/f13/ranking/bcvh',
  '/f13/ranking/route',
];

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase();
}

export function getDefaultRouteForRole(role) {
  return normalizeRole(role) === ROLE_VIEWER ? '/f13/dashboard' : '/';
}

export function isViewerRole(role) {
  return normalizeRole(role) === ROLE_VIEWER;
}

export function isAdminRole(role) {
  return normalizeRole(role) === ROLE_ADMIN;
}

export function canViewerAccessPath(pathname) {
  return VIEWER_ALLOWED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}?`));
}
