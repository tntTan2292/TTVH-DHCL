import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserPlus,
  Edit2,
  KeyRound,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  RefreshCw,
  X,
} from 'lucide-react';
import { PageContainer, StatusBadge } from '../components/shared/SharedComponents.jsx';
import adminClient from '../api/adminClient.js';
import { BCVH_BY_CODE, BCVH_CODES, POSITIONS_BY_TIER, positionLabel } from '../auth/accessModel.js';

const TIERS = [
  { value: 'ADMIN', label: 'Quản trị viên (ADMIN)', tone: 'danger' },
  { value: 'LEADER', label: 'Ban Lãnh đạo (LEADER)', tone: 'info' },
  { value: 'STAFF', label: 'Chuyên viên / Đơn vị (STAFF)', tone: 'neutral' },
];

const INDICATOR_LIST = [
  { code: 'F1.1', label: 'F1.1 – Toàn trình nội tỉnh' },
  { code: 'F1.2', label: 'F1.2 – Thu gom liên tỉnh' },
  { code: 'F1.3', label: 'F1.3 – Phát liên tỉnh' },
  { code: 'F4.1', label: 'F4.1 – Bưu cục phát thành công' },
  { code: 'F4.2', label: 'F4.2 – Phát giao bưu tá' },
  { code: 'HANGTON', label: 'HANGTON – Rà soát hàng tồn' },
];

function formatDate(isoStr) {
  if (!isoStr) return 'Chưa đăng nhập';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('ALL');

  // Modal states
  const [editingUser, setEditingUser] = useState(null); // null = closed, {} = create, user = edit
  const [modalForm, setModalForm] = useState({
    username: '',
    display_name: '',
    tier: 'STAFF',
    position: '',
    bcvh: [],
    indicators: [],
    is_active: true,
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Reset password dialog state
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Action message feedback banner
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminClient.listUsers();
      if (res?.success) {
        setUsers(res.data || []);
      } else {
        setError('Không thể tải danh sách người dùng.');
      }
    } catch (err) {
      setError(err?.message || 'Có lỗi xảy ra khi tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setModalForm({
      username: '',
      display_name: '',
      tier: 'STAFF',
      position: '',
      bcvh: [],
      indicators: [],
      is_active: true,
    });
    setModalError('');
    setEditingUser({});
  };

  const openEditModal = (user) => {
    setModalForm({
      username: user.username,
      display_name: user.display_name || '',
      tier: user.tier || 'STAFF',
      position: user.position || '',
      bcvh: Array.isArray(user.bcvh) ? [...user.bcvh] : [],
      indicators: Array.isArray(user.indicators) ? [...user.indicators] : [],
      is_active: user.is_active !== undefined ? Boolean(user.is_active) : true,
    });
    setModalError('');
    setEditingUser(user);
  };

  const closeModal = () => {
    setEditingUser(null);
    setModalError('');
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSubmitting(true);

    const isCreate = !editingUser?.id;

    const payload = {
      display_name: modalForm.display_name.trim(),
      tier: modalForm.tier,
      position: modalForm.position || null,
      bcvh: modalForm.tier === 'STAFF' ? modalForm.bcvh : [],
      indicators: modalForm.tier === 'STAFF' ? modalForm.indicators : [],
      is_active: modalForm.is_active,
    };

    try {
      if (isCreate) {
        if (!modalForm.username.trim()) {
          setModalError('Yêu cầu nhập tên đăng nhập (mã HRM).');
          setModalSubmitting(false);
          return;
        }
        await adminClient.createUser({
          ...payload,
          username: modalForm.username.trim(),
        });
        setFeedback({ type: 'success', message: `Tạo người dùng ${modalForm.username} thành công.` });
      } else {
        await adminClient.updateUser(editingUser.id, payload);
        setFeedback({ type: 'success', message: `Cập nhật người dùng ${editingUser.username} thành công.` });
      }

      closeModal();
      await loadUsers();
    } catch (err) {
      if (err?.code === 'USER_EXISTS') {
        setModalError('Tên đăng nhập (mã HRM) đã tồn tại.');
      } else if (err?.code === 'LAST_ADMIN') {
        setModalError('Không thể hạ quyền hoặc khóa admin cuối cùng.');
      } else {
        setModalError(err?.message || 'Có lỗi xảy ra.');
      }
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetTargetUser) return;
    setResetSubmitting(true);
    setResetSuccessMessage('');
    try {
      await adminClient.resetPassword(resetTargetUser.id);
      setResetSuccessMessage(`Đã đặt lại mật khẩu cho ${resetTargetUser.username}. Người dùng phải đổi mật khẩu ở lần đăng nhập tiếp theo.`);
      await loadUsers();
      setTimeout(() => {
        setResetTargetUser(null);
        setResetSuccessMessage('');
      }, 2000);
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Không thể đặt lại mật khẩu.' });
      setResetTargetUser(null);
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleUnlockUser = async (user) => {
    try {
      await adminClient.unlockUser(user.id);
      setFeedback({ type: 'success', message: `Đã mở khóa tài khoản ${user.username}.` });
      await loadUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: err?.message || 'Không thể mở khóa tài khoản.' });
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const nextActive = !user.is_active;
      await adminClient.updateUser(user.id, { is_active: nextActive });
      setFeedback({
        type: 'success',
        message: `Đã ${nextActive ? 'kích hoạt' : 'tạm dừng'} tài khoản ${user.username}.`,
      });
      await loadUsers();
    } catch (err) {
      if (err?.code === 'LAST_ADMIN') {
        setFeedback({ type: 'error', message: 'Không thể hạ quyền hoặc khóa admin cuối cùng.' });
      } else {
        setFeedback({ type: 'error', message: err?.message || 'Không thể thay đổi trạng thái tài khoản.' });
      }
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.display_name && u.display_name.toLowerCase().includes(q));

      const matchesTier = tierFilter === 'ALL' || u.tier === tierFilter;

      return matchesSearch && matchesTier;
    });
  }, [users, search, tierFilter]);

  return (
    <PageContainer
      title="Quản lý người dùng"
      subtitle="Quản lý tài khoản, phân quyền theo vai trò (ADMIN/LEADER/STAFF), phạm vi BCVH và các phân hệ chỉ số."
      accentClassName="bg-indigo-600"
      badge={<span className="rounded-md border border-indigo-300 bg-indigo-100 px-2.5 py-0.5 text-sm font-bold text-indigo-900">Quản trị hệ thống</span>}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-vnpost-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Thêm người dùng</span>
          </button>
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới danh sách"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Feedback Message */}
        {feedback.message ? (
          <div
            className={`rounded-2xl border p-3.5 text-xs font-semibold shadow-2xs flex items-center justify-between ${
              feedback.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback({ type: '', message: '' })}
              className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm font-bold ml-2"
            >
              ×
            </button>
          </div>
        ) : null}

        {/* Global Filter Bar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/85 p-3.5 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã HRM, họ tên..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[var(--color-vnpost-blue)] focus:outline-none transition-all"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Phân cấp:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-[var(--color-vnpost-blue)] focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả ({users.length})</option>
              <option value="ADMIN">ADMIN</option>
              <option value="LEADER">LEADER</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs font-medium">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Đang tải danh sách người dùng...
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 text-xs font-semibold">
              <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              {error}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-medium">
              Không tìm thấy người dùng phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Mã HRM</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Phân cấp</th>
                    <th className="py-3 px-4">Phạm vi BCVH</th>
                    <th className="py-3 px-4">Chỉ số phụ trách</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Đăng nhập cuối</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isLocked = u.failed_attempts >= 5 || (u.locked_until && new Date(u.locked_until) > new Date());
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {u.username}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {u.display_name || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                              u.tier === 'ADMIN'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : u.tier === 'LEADER'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {u.tier}
                          </span>
                          {u.position ? <div className="mt-0.5 text-[11px] font-semibold text-slate-500">{positionLabel(u.position)}</div> : null}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {u.tier === 'ADMIN' || u.tier === 'LEADER' ? (
                            <span className="text-slate-500 font-medium italic">Toàn thành phố</span>
                          ) : u.bcvh && u.bcvh.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.bcvh.map((code) => (
                                <span
                                  key={code}
                                  className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold"
                                  title={`${code}: ${BCVH_BY_CODE[code] || code}`}
                                >
                                  {BCVH_BY_CODE[code]?.replace('BCVH ', '') || code}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Không có</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {u.tier === 'ADMIN' || u.tier === 'LEADER' ? (
                            <span className="text-slate-500 font-medium italic">Tất cả chỉ số</span>
                          ) : u.indicators && u.indicators.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.indicators.map((ind) => (
                                <span
                                  key={ind}
                                  className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold"
                                >
                                  {ind}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Không có</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {!u.is_active ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
                              <XCircle size={13} className="text-slate-400" />
                              Tạm dừng
                            </span>
                          ) : isLocked ? (
                            <span className="inline-flex items-center gap-1 text-red-600 font-bold" title="Tài khoản bị khóa do đăng nhập sai nhiều lần">
                              <Lock size={13} className="text-red-600" />
                              Bị khóa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 size={13} className="text-emerald-600" />
                              Hoạt động
                            </span>
                          )}
                          {u.must_change_password ? (
                            <div className="text-[10px] text-amber-700 font-medium">Cần đổi MK</div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {formatDate(u.last_login_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {isLocked ? (
                              <button
                                type="button"
                                onClick={() => handleUnlockUser(u)}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-pointer"
                                title="Mở khóa tài khoản"
                              >
                                <Unlock size={14} />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin và phân quyền"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setResetTargetUser(u)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors cursor-pointer"
                              title="Đặt lại mật khẩu khởi tạo"
                            >
                              <KeyRound size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.is_active
                                  ? 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                  : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                              }`}
                              title={u.is_active ? 'Vô hiệu hóa tài khoản' : 'Kích hoạt lại tài khoản'}
                            >
                              {u.is_active ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit User Modal */}
      {editingUser !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/80 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                {editingUser.id ? `Chỉnh sửa: ${editingUser.username}` : 'Thêm người dùng mới'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {modalError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {modalError}
              </div>
            ) : null}

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              {/* Username (HRM) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã HRM (Tên đăng nhập) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.username}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, username: e.target.value }))}
                  disabled={Boolean(editingUser.id)}
                  placeholder="Ví dụ: HRM12345"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[var(--color-vnpost-blue)] outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên hiển thị
                </label>
                <input
                  type="text"
                  value={modalForm.display_name}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, display_name: e.target.value }))}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[var(--color-vnpost-blue)] outline-none"
                />
              </div>

              {/* Tier selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Phân cấp vai trò <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setModalForm((prev) => ({ ...prev, tier: t.value, position: prev.tier === t.value ? prev.position : '' }))}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                        modalForm.tier === t.value
                          ? 'border-[var(--color-vnpost-blue)] bg-blue-50/80 text-[var(--color-vnpost-blue)] shadow-2xs'
                          : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Position (chức vụ): leaders in two groups, directors and chuyên quản */}
              {modalForm.tier !== 'ADMIN' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Chức vụ</label>
                  <select
                    value={modalForm.position}
                    onChange={(e) => setModalForm((prev) => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-[var(--color-vnpost-blue)] outline-none"
                    aria-label="Chức vụ"
                  >
                    <option value="">{modalForm.tier === 'LEADER' ? 'Mặc định (Lãnh đạo TTVH)' : 'Chuyên viên (không nhập xử lý hàng tồn)'}</option>
                    {POSITIONS_BY_TIER[modalForm.tier].filter((code) => code !== 'STAFF').map((code) => (
                      <option key={code} value={code}>{positionLabel(code)}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {modalForm.tier === 'LEADER'
                      ? 'Lãnh đạo BĐTP đứng trên nhóm Lãnh đạo TTVH / IT. Lãnh đạo chỉ xem xử lý hàng tồn, không nhập.'
                      : 'Giám đốc BCVH và Chuyên quản BCVH được nhập xử lý hàng tồn của đơn vị mình; Chuyên quản còn phê duyệt sửa qua ngày.'}
                  </p>
                </div>
              ) : null}

              {/* Note for ADMIN/LEADER */}
              {modalForm.tier !== 'STAFF' ? (
                <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed">
                  <strong>{modalForm.tier}:</strong> Có quyền truy cập toàn bộ mạng lưới và các phân hệ chỉ số. Không áp dụng danh sách BCVH hoặc chỉ số riêng lẻ.
                </div>
              ) : null}

              {/* STAFF-only fields: BCVH multi-select */}
              {modalForm.tier === 'STAFF' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phạm vi BCVH được phân công (STAFF)
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 max-h-44 overflow-y-auto">
                    {BCVH_CODES.map((code) => {
                      const checked = modalForm.bcvh.includes(code);
                      return (
                        <label
                          key={code}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...modalForm.bcvh, code]
                                : modalForm.bcvh.filter((c) => c !== code);
                              setModalForm((prev) => ({ ...prev, bcvh: next }));
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-800">{BCVH_BY_CODE[code]}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* STAFF-only fields: Indicator checkboxes */}
              {modalForm.tier === 'STAFF' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chỉ số chuyên môn được giao toàn quyền (STAFF)
                  </label>
                  <div className="space-y-1 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    {INDICATOR_LIST.map((ind) => {
                      const checked = modalForm.indicators.includes(ind.code);
                      return (
                        <label
                          key={ind.code}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...modalForm.indicators, ind.code]
                                : modalForm.indicators.filter((c) => c !== ind.code);
                              setModalForm((prev) => ({ ...prev, indicators: next }));
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-800">{ind.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Active Toggle (Edit only) */}
              {editingUser.id ? (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-slate-700">Trạng thái tài khoản</span>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={modalForm.is_active}
                      onChange={(e) => setModalForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Kích hoạt</span>
                  </label>
                </div>
              ) : null}

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[var(--color-vnpost-blue)] hover:brightness-110 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? 'Đang lưu...' : editingUser.id ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Reset Password Confirmation Dialog */}
      {resetTargetUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl border border-white/80 bg-white p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Đặt lại mật khẩu cho {resetTargetUser.username}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Đặt lại về mật khẩu khởi tạo, người dùng phải đổi ở lần đăng nhập đầu.
            </p>

            {resetSuccessMessage ? (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800">
                {resetSuccessMessage}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  disabled={resetSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={resetSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {resetSubmitting ? 'Đang đặt lại...' : 'Xác nhận đặt lại'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
