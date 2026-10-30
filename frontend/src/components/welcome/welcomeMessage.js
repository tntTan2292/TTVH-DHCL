// Welcome notice shown once after a successful sign-in: "Chào mừng <chức vụ> <họ tên> vào hệ thống".
// LoginPage arms the flag; the first SharedLayout render consumes it, so a reload never repeats the notice.
export const WELCOME_FLAG_KEY = 'qis.welcome.pending';

export function buildWelcomeText(user) {
  const name = String(user?.display_name || user?.username || '').trim();
  if (!name) return '';
  const label = String(user?.access?.positionLabel || '').trim();
  // The admin account is already named "Quản trị viên": do not stack two titles.
  const title = label && label !== 'Quản trị hệ thống' ? `${label} ` : '';
  return `Chào mừng ${title}${name} vào hệ thống`;
}

export function armWelcome() {
  try { sessionStorage.setItem(WELCOME_FLAG_KEY, '1'); } catch { /* storage may be blocked */ }
}

export function consumeWelcome() {
  try {
    const armed = sessionStorage.getItem(WELCOME_FLAG_KEY) === '1';
    if (armed) sessionStorage.removeItem(WELCOME_FLAG_KEY);
    return armed;
  } catch {
    return false;
  }
}
