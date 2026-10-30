import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Users,
  Check,
  Globe,
  Building,
} from 'lucide-react';
import {
  MAX_ACTIONS_PER_SPOT,
  DEFAULT_DUE_TEXT,
} from '../opsJournalHelpers.js';

let newRowCounter = 0;

export default function SpotActionEditor({
  spot,
  actions = [],
  onChangeActions,
  assignableUsers = [],
  allUsers = [],
  onLoadAllUsers,
  showAllUsers = false,
  onSaveActions,
  saving = false,
}) {
  const [activeAssigneeDropdownRow, setActiveAssigneeDropdownRow] = useState(null);

  const usersList = showAllUsers && allUsers.length > 0 ? allUsers : assignableUsers;

  // H2: Dòng "đã báo cáo" khi reportedAt != null
  const isRowReported = (row) => row?.reportedAt != null;

  // H2: Theo luật vị trí của backend, tìm dòng cuối cùng đã có báo cáo
  let maxReportedIndex = -1;
  for (let i = 0; i < actions.length; i++) {
    if (actions[i]?.reportedAt != null) {
      maxReportedIndex = i;
    }
  }

  // Add new blank row (key không dùng Date.now() trùng)
  const handleAddRow = () => {
    if (actions.length >= MAX_ACTIONS_PER_SPOT) return;

    const newRow = {
      id: `act_${spot.id}_${Date.now()}_${++newRowCounter}`,
      seq: actions.length + 1,
      whoText: '',
      what: '',
      where: spot.title || '',
      due: DEFAULT_DUE_TEXT,
      how: '',
      expectedResult: '',
      status: 'DRAFT',
      assigneeUserIds: [],
    };
    onChangeActions([...actions, newRow]);
  };

  // Delete row (H2: cấm xóa bất kỳ dòng nào ở vị trí <= dòng cuối cùng đã có báo cáo)
  const handleDeleteRow = (index) => {
    if (index <= maxReportedIndex) return;
    const updated = actions
      .filter((_, idx) => idx !== index)
      .map((row, idx) => ({ ...row, seq: idx + 1 }));
    onChangeActions(updated);
  };

  // Move row up (H2: cấm đổi vị trí nếu chạm hoặc đổi vị trí <= maxReportedIndex)
  const handleMoveUp = (index) => {
    if (index === 0 || index - 1 <= maxReportedIndex) return;
    const updated = [...actions];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeActions(updated.map((row, idx) => ({ ...row, seq: idx + 1 })));
  };

  // Move row down (H2: cấm đổi vị trí nếu index <= maxReportedIndex)
  const handleMoveDown = (index) => {
    if (index === actions.length - 1 || index <= maxReportedIndex) return;
    const updated = [...actions];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeActions(updated.map((row, idx) => ({ ...row, seq: idx + 1 })));
  };

  // Field change
  const handleFieldChange = (index, field, value) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], [field]: value };
    onChangeActions(updated);
  };

  // Toggle assignee user ID for a row
  const handleToggleAssignee = (rowIndex, userId) => {
    const row = actions[rowIndex];
    if (row.status === 'DONE') return; // H2: dòng DONE khóa danh sách người giao

    const currentIds = Array.isArray(row.assigneeUserIds) ? row.assigneeUserIds : [];
    const isSelected = currentIds.includes(userId);

    const nextIds = isSelected
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId];

    // Automatically update whoText if empty with user names
    const assignedNames = usersList
      .filter((u) => nextIds.includes(u.id))
      .map((u) => u.name || u.positionLabel)
      .join(', ');

    const updated = [...actions];
    updated[rowIndex] = {
      ...row,
      assigneeUserIds: nextIds,
      whoText: row.whoText ? row.whoText : assignedNames,
    };
    onChangeActions(updated);
  };

  // H2: Cảnh báo trước khi lưu nếu đổi "Làm gì" hoặc bỏ người đã báo cáo của dòng có báo cáo
  const handleSave = () => {
    const originalActions = spot.actions || [];
    const resetWarningRows = [];

    for (let i = 0; i < actions.length; i++) {
      const orig = originalActions[i];
      const curr = actions[i];
      if (orig && orig.reportedAt != null) {
        const whatChanged = (curr.what || '').trim() !== (orig.what || '').trim();
        const origAssignees = Array.isArray(orig.assigneeUserIds) ? orig.assigneeUserIds : [];
        const currAssignees = Array.isArray(curr.assigneeUserIds) ? curr.assigneeUserIds : [];
        const removedAssignee = origAssignees.some((id) => !currAssignees.includes(id));
        if (whatChanged || removedAssignee) {
          resetWarningRows.push(i + 1);
        }
      }
    }

    if (resetWarningRows.length > 0) {
      const ok = globalThis.confirm?.(
        `Dòng số ${resetWarningRows.join(', ')} đã có báo cáo kết quả. Việc thay đổi nội dung "Làm gì" hoặc người thực hiện sẽ làm đặt lại (reset) báo cáo của dòng này trên hệ thống. Bạn có chắc chắn muốn lưu thay đổi không?`
      );
      if (!ok) return;
    }

    onSaveActions(spot.id, actions);
  };

  return (
    <div className="space-y-3">
      {/* Table controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Kế hoạch 6 rõ:</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
            {actions.length}/{MAX_ACTIONS_PER_SPOT} dòng
          </span>
          {actions.length >= MAX_ACTIONS_PER_SPOT && (
            <span className="text-[11px] font-semibold text-rose-600">
              (Đã đạt tối đa 12 dòng)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle all users */}
          <button
            type="button"
            onClick={onLoadAllUsers}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              showAllUsers
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Mở rộng danh sách nhân sự toàn mạng lưới để giao việc"
          >
            {showAllUsers ? <Globe size={13} /> : <Building size={13} />}
            <span>{showAllUsers ? 'Toàn mạng lưới (all=1)' : 'Theo đơn vị'}</span>
          </button>

          {/* Add Row Button */}
          <button
            type="button"
            onClick={handleAddRow}
            disabled={actions.length >= MAX_ACTIONS_PER_SPOT}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Plus size={13} />
            <span>Thêm dòng</span>
          </button>

          {/* Save actions button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--color-vnpost-orange)] px-3 py-1 text-xs font-bold text-white shadow-xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={13} />
            <span>{saving ? 'Đang lưu...' : 'Lưu 6-rõ'}</span>
          </button>
        </div>
      </div>

      {/* 6-rõ Table */}
      {actions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>Chưa có dòng 6-rõ nào. Bấm "Thêm dòng" để tự soạn.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-2 px-2.5 w-10 text-center">#</th>
                <th className="py-2 px-3 w-48">Ai (Người thực hiện)</th>
                <th className="py-2 px-3 w-64">Làm gì (Nhiệm vụ) <span className="text-rose-500">*</span></th>
                <th className="py-2 px-2.5 w-32">Ở đâu</th>
                <th className="py-2 px-2.5 w-28">Khi nào xong</th>
                <th className="py-2 px-3">Bằng cách nào</th>
                <th className="py-2 px-3 w-48">Kết quả gì</th>
                <th className="py-2 px-2 w-20 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actions.map((row, idx) => {
                const isAssigneeDropdownOpen = activeAssigneeDropdownRow === idx;
                const assignedCount = (row.assigneeUserIds || []).length;
                const isDone = row.status === 'DONE';
                const hasReport = isRowReported(row);
                const cannotDelete = idx <= maxReportedIndex;
                const cannotMoveUp = idx === 0 || idx - 1 <= maxReportedIndex;
                const cannotMoveDown = idx === actions.length - 1 || idx <= maxReportedIndex;

                return (
                  <tr key={row.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    {/* # */}
                    <td className="py-2 px-2 text-center font-bold text-slate-500 align-top pt-3">
                      <div className="flex flex-col items-center">
                        <span>{row.seq || idx + 1}</span>
                        {hasReport && (
                          <span className="text-[9px] text-blue-600 font-bold" title="Dòng đã có báo cáo">
                            ●
                          </span>
                        )}
                        {isDone && (
                          <span className="text-[9px] text-emerald-600 font-bold" title="Dòng đã hoàn thành">
                            ✓
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ai (whoText + Assignee Picker) - H2: DONE khóa danh sách người giao */}
                    <td className="py-2 px-3 align-top">
                      <div className="space-y-1 relative">
                        <input
                          type="text"
                          value={row.whoText || ''}
                          disabled={isDone}
                          onChange={(e) => handleFieldChange(idx, 'whoText', e.target.value)}
                          placeholder="Chức danh / Đơn vị..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        />

                        {/* Assignee trigger button */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isDone}
                            onClick={() =>
                              setActiveAssigneeDropdownRow(isAssigneeDropdownOpen ? null : idx)
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                              assignedCount > 0
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                            title={isDone ? 'Dòng đã hoàn thành (DONE), khóa phân công' : 'Chọn người được giao'}
                          >
                            <Users size={10} />
                            <span>
                              {assignedCount > 0 ? `${assignedCount} người được giao` : 'Chọn người'}
                            </span>
                          </button>
                        </div>

                        {/* Dropdown Popover */}
                        {isAssigneeDropdownOpen && !isDone && (
                          <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5 text-[11px] font-bold text-slate-700">
                              <span>Chọn người được giao ({usersList.length})</span>
                              <button
                                type="button"
                                onClick={() => setActiveAssigneeDropdownRow(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                              >
                                ×
                              </button>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-1 sidebar-scrollbar pr-1">
                              {usersList.map((user) => {
                                const isChecked = (row.assigneeUserIds || []).includes(user.id);
                                return (
                                  <label
                                    key={user.id}
                                    className={`flex items-center gap-2 rounded-lg p-1.5 text-xs cursor-pointer transition-colors ${
                                      isChecked ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleAssignee(idx, user.id)}
                                      className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <div className="flex-1 truncate">
                                      <div className="truncate">{user.name}</div>
                                      <div className="text-[10px] text-slate-500 font-normal truncate">
                                        {user.positionLabel || user.position}
                                      </div>
                                    </div>
                                    {isChecked && <Check size={12} className="text-blue-600 shrink-0" />}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Làm gì - H2: DONE khóa "Làm gì" */}
                    <td className="py-2 px-3 align-top">
                      <textarea
                        rows={2}
                        value={row.what || ''}
                        disabled={isDone}
                        onChange={(e) => handleFieldChange(idx, 'what', e.target.value)}
                        placeholder="Nhiệm vụ cụ thể cần thực hiện..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                        title={isDone ? 'Dòng đã hoàn thành (DONE), khóa nội dung Làm gì' : ''}
                      />
                    </td>

                    {/* Ở đâu */}
                    <td className="py-2 px-2.5 align-top">
                      <input
                        type="text"
                        value={row.where || ''}
                        onChange={(e) => handleFieldChange(idx, 'where', e.target.value)}
                        placeholder="Địa điểm / Đơn vị..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Khi nào xong */}
                    <td className="py-2 px-2.5 align-top">
                      <input
                        type="text"
                        value={row.due || DEFAULT_DUE_TEXT}
                        onChange={(e) => handleFieldChange(idx, 'due', e.target.value)}
                        placeholder="Hạn hoàn thành..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Bằng cách nào */}
                    <td className="py-2 px-3 align-top">
                      <textarea
                        rows={2}
                        value={row.how || ''}
                        onChange={(e) => handleFieldChange(idx, 'how', e.target.value)}
                        placeholder="Phương thức / Quy trình thực hiện..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                      />
                    </td>

                    {/* Kết quả gì */}
                    <td className="py-2 px-3 align-top">
                      <textarea
                        rows={2}
                        value={row.expectedResult || ''}
                        onChange={(e) => handleFieldChange(idx, 'expectedResult', e.target.value)}
                        placeholder="Kết quả đầu ra dự kiến..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none resize-none"
                      />
                    </td>

                    {/* Thao tác (Reorder & Delete) - H2: theo luật vị trí backend */}
                    <td className="py-2 px-2 align-top text-center pt-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={cannotMoveUp}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title={
                            cannotMoveUp
                              ? 'Không thể đổi thứ tự dòng ở vị trí ≤ dòng đã có báo cáo'
                              : 'Di chuyển lên'
                          }
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={cannotMoveDown}
                          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                          title={
                            cannotMoveDown
                              ? 'Không thể đổi thứ tự dòng ở vị trí ≤ dòng đã có báo cáo'
                              : 'Di chuyển xuống'
                          }
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(idx)}
                          disabled={cannotDelete}
                          className={`rounded-md p-1 transition-colors ${
                            cannotDelete
                              ? 'text-slate-300 opacity-20 cursor-not-allowed'
                              : 'text-rose-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer'
                          }`}
                          title={
                            cannotDelete
                              ? 'Không thể xóa dòng ở vị trí ≤ dòng cuối cùng đã có báo cáo (quy tắc vị trí backend)'
                              : 'Xóa dòng này'
                          }
                        >
                          <Trash2 size={13} />
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
  );
}
