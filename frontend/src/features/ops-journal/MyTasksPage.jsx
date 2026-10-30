import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Calendar,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
} from 'lucide-react';
import opsJournalAdapter from './api/opsJournalApi.js';
import { groupTasksByDay, getIndicatorChipStyle } from './opsJournalHelpers.js';
import SpotMetricsSummary from './components/SpotMetricsSummary.jsx';
import MyTaskRowItem from './components/MyTaskRowItem.jsx';
import SpotReportForm from './components/SpotReportForm.jsx';
import { ErrorLayout } from '../../components/common/StateLayouts.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { hasCapability } from '../../auth/accessModel.js';

export default function MyTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [reportingRowId, setReportingRowId] = useState(null);

  const isManager = hasCapability(user?.access, 'journal.manage');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await opsJournalAdapter.getMyTasks();
      if (res.success) {
        setTasks(res.data?.tasks || []);
      } else {
        setAlert({
          type: 'error',
          message: res.error?.message || 'Không thể tải danh sách nhiệm vụ.',
        });
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi kết nối khi tải nhiệm vụ của bạn.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // silent reload (no spinner): attachments and other people's reports change under the page
  const refreshTasks = useCallback(async () => {
    try {
      const res = await opsJournalAdapter.getMyTasks();
      if (res.success) setTasks(res.data?.tasks || []);
    } catch {
      /* the list on screen stays */
    }
  }, []);

  // ONE report for the whole spot (PO 2026-10-30): the team agrees and one person reports to the leader
  const handleReportSpot = async (spotId, { status, causeText, reportText }) => {
    setReportingRowId(spotId);
    setAlert(null);

    try {
      const res = await opsJournalAdapter.reportSpot(spotId, {
        status,
        causeText,
        reportText,
      });

      if (res.success) {
        setAlert({
          type: 'success',
          message:
            status === 'REPORTED'
              ? 'Đã gửi báo cáo tiến độ thành công.'
              : 'Đã cập nhật trạng thái đang xử lý.',
        });
        refreshTasks();
      } else {
        setAlert({
          type: 'error',
          // the server answers 404 for a row that is closed, reopened or no longer assigned: say so instead of "not found"
          message: res.error?.code === 'NOT_FOUND'
            ? 'Không gửi được báo cáo: phiếu này có thể đã đóng, đang được chỉnh sửa hoặc không còn giao cho bạn. Hãy tải lại danh sách nhiệm vụ.'
            : (res.error?.message || 'Không thể gửi báo cáo kết quả.'),
        });
        refreshTasks();
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.message || 'Lỗi khi gửi báo cáo kết quả.',
      });
    } finally {
      setReportingRowId(null);
    }
  };

  const dayGroups = groupTasksByDay(tasks);

  // Item I11: Người không phải quản lý vào /ops-journal/my-tasks khi danh sách rỗng:
  // Hiển thị giống đường lạ (toàn màn hình), không có tiêu đề "Nhiệm vụ của tôi" khi đang tải.
  if (!isManager) {
    if (loading) {
      return (
        <div className="flex h-screen items-center justify-center bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        </div>
      );
    }
    if (tasks.length === 0) {
      return (
        <div className="h-screen bg-white">
          <ErrorLayout error={{ message: 'Không tìm thấy trang web. URL không hợp lệ hoặc đã bị thay đổi.' }} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <CheckSquare size={20} />
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Nhiệm vụ của tôi
              </h1>
              <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                {tasks.length} phiếu nhiệm vụ
              </span>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Danh sách các dòng hành động 6-rõ được phân công thực hiện theo Nhật ký điều hành (PL06).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadTasks}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Tải lại danh sách nhiệm vụ"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Tải lại</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          role="alert"
          className={`flex items-center gap-3 rounded-xl border p-4 text-xs font-bold shadow-xs transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div className="flex-1">{alert.message}</div>
          <button
            type="button"
            onClick={() => setAlert(null)}
            className="font-extrabold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2 text-slate-500">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Đang tải nhiệm vụ được phân công...</span>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckSquare className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">Không có nhiệm vụ nào cần thực hiện</h3>
          <p className="mt-1 max-w-md text-xs text-slate-500">
            Hiện tại bạn chưa được phân công dòng hành động nào trong các phiếu Nhật ký điều hành.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dayGroups.map((group) => (
            <div key={group.day} className="space-y-4">
              {/* Day Section Header */}
              <div className="flex items-center gap-2.5 border-b border-slate-200 pb-2">
                <Calendar size={18} className="text-slate-600" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  Ngày {group.day}
                </h2>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {group.tasks.length} phiếu
                </span>
              </div>

              {/* Task Cards for the day */}
              <div className="space-y-4">
                {group.tasks.map((task) => {
                  const chip = getIndicatorChipStyle(task.indicator);
                  const isPair = task.scopeType === 'PAIR';

                  return (
                    <div
                      key={task.spotId}
                      className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden"
                    >
                      {/* Phiếu Header */}
                      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Chip */}
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${chip.badgeClass}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`} />
                              {chip.shortLabel}
                            </span>

                            {/* Scope */}
                            {isPair ? (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-800 border border-cyan-200">
                                <Layers size={10} />
                                PAIR
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                                <MapPin size={10} />
                                BCVH
                              </span>
                            )}

                            {/* Title */}
                            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                              {task.title}
                            </h3>

                            {task.officeCode && (
                              <span className="text-xs text-slate-500">
                                ({task.officeCode})
                              </span>
                            )}
                          </div>

                          {/* Headline */}
                          {task.headline && (
                            <p className="text-xs font-medium italic text-slate-700 leading-relaxed">
                              "{task.headline}"
                            </p>
                          )}

                          {/* Metrics */}
                          {task.metrics && (
                            <SpotMetricsSummary
                              indicator={task.indicator}
                              metrics={task.metrics}
                            />
                          )}
                        </div>
                      </div>

                      {/* Phiếu Body: ONLY myRows */}
                      <div className="p-4 sm:p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock size={15} className="text-slate-600" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                            Các dòng hành động của bạn ({task.myRows?.length || 0})
                          </h4>
                        </div>

                        <div className="space-y-3">
                          {(task.myRows || []).map((row) => (
                            <MyTaskRowItem
                              key={row.id}
                              row={row}
                              hideReportForm
                            />
                          ))}
                        </div>

                        <SpotReportForm
                          key={`${task.spotId}_${(task.myRows || []).map((r) => `${r.status}${r.reportedAt || ''}`).join('')}`}
                          task={task}
                          onReport={handleReportSpot}
                          onChanged={refreshTasks}
                          reporting={reportingRowId === task.spotId}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

