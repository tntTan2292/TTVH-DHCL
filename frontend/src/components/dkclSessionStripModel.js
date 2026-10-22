// IMPORT-SESSION-01 -- what the DKCL session strip shows for a source and which buttons it offers.

export const SESSION_SOURCES = [
  { code: 'HUE', name: 'Huế' },
  { code: 'TCT', name: 'TCT' }
];

const NEEDS_LOGIN = new Set(['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED']);

export const formatAgo = (iso, now = Date.now()) => {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.max(0, Math.round((now - then) / 60000));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  return `${hours} giờ ${String(minutes % 60).padStart(2, '0')} phút trước`;
};

/**
 * @param session  one source entry of GET /import/dkcl/session/status (null while unknown)
 * @param busy     a request of this strip for this source is in flight
 */
export const describeSession = (session, { busy = false, now = Date.now() } = {}) => {
  if (!session) {
    return { tone: 'neutral', label: 'Đang kiểm tra…', detail: null, canLogin: false, canDisconnect: false, canCancel: false, loginLabel: 'Đăng nhập' };
  }
  const status = session.status;
  const checked = formatAgo(session.last_validated_at, now);
  const base = { canLogin: !busy, canDisconnect: false, canCancel: false, loginLabel: 'Đăng nhập', detail: null };

  if (status === 'LOGIN_IN_PROGRESS') {
    return { ...base, tone: 'progress', label: 'Đang chờ đăng nhập', detail: 'Hãy đăng nhập trong cửa sổ trình duyệt đã mở.', canCancel: !busy, loginLabel: 'Hiện cửa sổ đăng nhập' };
  }
  if (status === 'SESSION_VALID') {
    return {
      ...base,
      tone: 'ok',
      label: 'Đã đăng nhập',
      detail: session.busy
        ? 'Đang được tác vụ nhập dữ liệu sử dụng.'
        : (checked ? `Xác nhận ${checked}` : null),
      canDisconnect: !busy && !session.busy,
      loginLabel: 'Đăng nhập lại'
    };
  }
  if (status === 'DISCONNECTED') {
    return { ...base, tone: 'warn', label: 'Đã ngắt', detail: 'Hệ thống sẽ không tự đăng nhập lại cho tới khi anh bấm Đăng nhập.' };
  }
  if (status === 'LOGIN_TIMEOUT') {
    return { ...base, tone: 'bad', label: 'Hết thời gian chờ đăng nhập', detail: session.last_error || null };
  }
  if (status === 'SESSION_CHECK_FAILED') {
    return { ...base, tone: 'bad', label: 'Không kiểm tra được phiên', detail: session.last_error || null, canDisconnect: !busy && !session.busy };
  }
  if (NEEDS_LOGIN.has(status)) {
    return { ...base, tone: 'bad', label: 'Cần đăng nhập', detail: 'Phiên đã hết hạn hoặc chưa đăng nhập.', canDisconnect: !busy && !session.busy };
  }
  // NOT_CHECKED: no window yet; a saved session may still be valid, so ending it stays possible
  return { ...base, tone: 'neutral', label: 'Chưa xác nhận phiên', detail: 'Chưa có cửa sổ phiên; bấm Đăng nhập nếu hệ thống báo cần đăng nhập.', canDisconnect: !busy && !session.busy };
};

export const disconnectConfirmText = (name) => (
  `Ngắt phiên ${name}?\n\nHệ thống sẽ đăng xuất, đóng cửa sổ và xoá phiên đã lưu. Import tự động của ${name} sẽ dừng cho tới khi anh bấm "Đăng nhập" và đăng nhập lại.`
);
