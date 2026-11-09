import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, RefreshCw, AlertCircle, CheckCircle2, XCircle, X } from 'lucide-react';
import { PageContainer } from '../../components/shared/SharedComponents.jsx';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { F13_INDICATOR, indicatorTheme } from '../indicator/indicatorConfig.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { hasCapability, CAPABILITIES } from '../../auth/accessModel.js';
import {
  fetchRuleProposals,
  fetchRuleProposalDetail,
  postRuleProposalDecision,
} from './api/f13v2Api.js';
import {
  STATUS_TABS,
  sortRuleProposals,
  toggleProposalSelection,
  toggleSelectAllProposals,
  formatBatchDecisionSummary,
} from './f13RuleProposalHelpers.js';
import F13V2RuleProposalTable from './components/F13V2RuleProposalTable.jsx';
import F13V2RuleProposalDetailPanel from './components/F13V2RuleProposalDetailPanel.jsx';

export default function F13V2RuleProposalPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active status tab: PENDING, APPROVED, REJECTED, APPLIED
  const rawStatus = (searchParams.get('status') || 'PENDING').toUpperCase();
  const activeStatus = STATUS_TABS.some((t) => t.key === rawStatus) ? rawStatus : 'PENDING';

  // Access checks
  const canDecide = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return hasCapability(user?.access, CAPABILITIES.F13_RULE_DECIDE || 'f13.rule.decide');
  }, [user]);

  // Data states
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0, APPLIED: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sorting state
  const [sort, setSort] = useState({ field: 'parcels', direction: 'desc' });

  // Detail panel state
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailRefreshTick, setDetailRefreshTick] = useState(0);

  // Decision submission state
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Batch decision states (U2)
  const selectable = canDecide && activeStatus === 'PENDING';
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [batchModal, setBatchModal] = useState(null);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const effectiveSelectedKeys = selectable ? selectedKeys : [];

  // Load list of proposals
  const loadProposals = useCallback(async (statusToLoad) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRuleProposals({ status: statusToLoad });
      if (data) {
        setItems(data.items || []);
        if (data.meta?.counts) {
          setCounts(data.meta.counts);
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải danh sách đề xuất');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch proposals when active status changes
  useEffect(() => {
    loadProposals(activeStatus);
  }, [activeStatus, loadProposals]);

  // Load detail when a proposal is selected
  useEffect(() => {
    if (!selectedProposal?.key) {
      setDetailData(null);
      setDetailLoading(false);
      setDetailError(null);
      return;
    }

    let active = true;
    setDetailLoading(true);
    setDetailError(null);

    fetchRuleProposalDetail(selectedProposal.key)
      .then((data) => {
        if (!active) return;
        setDetailData(data);
      })
      .catch((err) => {
        if (!active) return;
        setDetailError(err?.response?.data?.error?.message || err?.message || 'Không thể tải chi tiết đề xuất');
      })
      .finally(() => {
        if (!active) return;
        setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProposal?.key, detailRefreshTick]);

  // Tab switch handler
  const handleTabChange = (tabKey) => {
    setSelectedKeys([]);
    setSearchParams((prev) => {
      const next = new globalThis.URLSearchParams(prev);
      next.set('status', tabKey);
      return next;
    });
  };

  // Sort click handler
  const handleSort = (field) => {
    setSort((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      return { field, direction: 'desc' };
    });
  };

  // Make decision handler (single proposal)
  const handleMakeDecision = async ({ decision, note, ticket_id }) => {
    if (!selectedProposal?.key) return;

    setDecisionSubmitting(true);
    setDecisionError(null);

    try {
      const res = await postRuleProposalDecision(selectedProposal.key, {
        decision,
        note,
        ticket_id,
      });

      if (res?.proposal) {
        setDetailData(res.proposal);
        // Refresh list in background
        loadProposals(activeStatus);

        setNotification({
          type: 'success',
          message:
            decision === 'APPROVE'
              ? 'Đã duyệt đề xuất quy tắc thành công.'
              : decision === 'REJECT'
              ? 'Đã từ chối đề xuất quy tắc.'
              : 'Đã đánh dấu áp dụng quy tắc thành công.',
        });

        globalThis.setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      setDecisionError(err?.response?.data?.error?.message || err?.message || 'Không thể ghi nhận quyết định');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  // Batch selection handlers (U2)
  const handleToggleSelectKey = (key) => {
    setSelectedKeys((prev) => toggleProposalSelection(prev, key));
  };

  const handleToggleSelectAll = () => {
    setSelectedKeys((prev) => toggleSelectAllProposals(sortedItems, prev));
  };

  const handleClearSelection = () => {
    setSelectedKeys([]);
  };

  const handleOpenBatchDialog = (decision) => {
    if (!effectiveSelectedKeys.length) return;
    setBatchModal({
      isOpen: true,
      decision,
      keys: [...effectiveSelectedKeys],
    });
  };

  const handleBatchSubmit = async (note) => {
    if (!batchModal || !batchModal.keys.length) return;
    const { decision, keys } = batchModal;

    setBatchSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    const failedKeys = [];

    // Send decision once per ticked key, one after another
    for (const key of keys) {
      try {
        await postRuleProposalDecision(key, {
          decision,
          note,
        });
        successCount++;
      } catch {
        failCount++;
        failedKeys.push(key);
      }
    }

    setBatchSubmitting(false);
    setBatchModal(null);
    setSelectedKeys([]);

    // Reload list and tab counts
    await loadProposals(activeStatus);

    const summaryMessage = formatBatchDecisionSummary(successCount, failCount, failedKeys);
    setNotification({
      type: failCount === 0 ? 'success' : 'warning',
      message: `Kết quả xử lý: ${summaryMessage}`,
    });
    globalThis.setTimeout(() => setNotification(null), 8000);
  };

  // Sort items
  const sortedItems = useMemo(() => {
    return sortRuleProposals(items, sort.field, sort.direction);
  }, [items, sort.field, sort.direction]);

  return (
    <PageContainer
      title="Đề xuất quy tắc"
      subtitle="Các lần Chuyên quản sửa kết luận của hệ thống, gom thành đề xuất quy tắc chờ duyệt"
      accentClassName={theme.accentBar}
      badge="F1.3"
      action={
        <button
          type="button"
          onClick={() => loadProposals(activeStatus)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          title="Tải lại dữ liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`p-3 border rounded-xl text-sm flex items-center justify-between shadow-sm animate-in fade-in ${
              notification.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className={`text-xs font-semibold ${
                notification.type === 'warning'
                  ? 'text-amber-800 hover:text-amber-950'
                  : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              Đóng
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status Tabs with counts */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.key;
            const count = counts[tab.key] ?? 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                    isActive ? 'bg-blue-800 text-white' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Rule Proposals Table Block */}
        <F13V2RuleProposalTable
          items={sortedItems}
          loading={loading}
          error={null}
          sort={sort}
          onSort={handleSort}
          selectedKey={selectedProposal?.key}
          onSelectProposal={(item) => setSelectedProposal(item)}
          activeStatus={activeStatus}
          selectable={selectable}
          selectedKeys={effectiveSelectedKeys}
          onToggleSelectKey={handleToggleSelectKey}
          onToggleSelectAll={handleToggleSelectAll}
          onClearSelection={handleClearSelection}
          onOpenBatchDialog={handleOpenBatchDialog}
        />

        {/* Rule Proposal Detail Panel */}
        {selectedProposal && (
          <F13V2RuleProposalDetailPanel
            key={selectedProposal.key}
            proposal={selectedProposal}
            detail={detailData}
            loading={detailLoading}
            error={detailError}
            onClose={() => setSelectedProposal(null)}
            onSubmitDecision={handleMakeDecision}
            decisionSubmitting={decisionSubmitting}
            decisionError={decisionError}
            canDecide={canDecide}
            onAnalysisSuccess={() => {
              setDetailRefreshTick((t) => t + 1);
              loadProposals(activeStatus);
            }}
          />
        )}

        {/* Batch Decision Modal (U2) */}
        {batchModal?.isOpen && (
          <RuleProposalBatchModal
            key={`${batchModal.decision}_${batchModal.keys.join(',')}`}
            isOpen={batchModal.isOpen}
            decision={batchModal.decision}
            keys={batchModal.keys}
            submitting={batchSubmitting}
            onClose={() => {
              if (!batchSubmitting) setBatchModal(null);
            }}
            onSubmit={handleBatchSubmit}
          />
        )}
      </div>
    </PageContainer>
  );
}

/**
 * F13-RULE-PROPOSAL-01 U2: Modal dialog for approving or rejecting multiple proposals with one shared note.
 */
function RuleProposalBatchModal({
  isOpen,
  decision,
  keys = [],
  onSubmit,
  onClose,
  submitting,
}) {
  const [note, setNote] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const isApprove = decision === 'APPROVE';
  const count = keys.length;

  const handleConfirm = () => {
    const cleanNote = note.trim();
    if (!cleanNote) {
      setValidationError('Duyệt hoặc không duyệt thì phải ghi chú lý do.');
      return;
    }
    if (cleanNote.length > 1000) {
      setValidationError('Ghi chú tối đa 1000 ký tự.');
      return;
    }
    setValidationError('');
    onSubmit(cleanNote);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg ${
                isApprove ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {isApprove ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                {isApprove ? `Duyệt hàng loạt (${count} đề xuất)` : `Không duyệt hàng loạt (${count} đề xuất)`}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Áp dụng một ghi chú chung cho {count} đề xuất đã chọn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Lưu ý nghiệp vụ:</span> Một ghi chú chung cho toàn bộ đợt duyệt. Mỗi đề xuất vẫn được lưu thành một quyết định riêng theo chuẩn quy trình.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Ghi chú lý do * (bắt buộc)
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (validationError && e.target.value.trim()) {
                  setValidationError('');
                }
              }}
              disabled={submitting}
              placeholder={
                isApprove
                  ? 'Nhập căn cứ duyệt cho các đề xuất này (bắt buộc)...'
                  : 'Nhập lý do không duyệt cho các đề xuất này (bắt buộc)...'
              }
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationError ? 'border-red-300 bg-red-50/30' : 'border-gray-300'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              maxLength={1000}
            />
            <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
              <span>
                {validationError ? (
                  <span className="text-red-600 font-medium">{validationError}</span>
                ) : (
                  'Tối đa 1000 ký tự'
                )}
              </span>
              <span>{note.length} / 1000</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !note.trim()}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isApprove ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : isApprove ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận duyệt ({count})</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                <span>Xác nhận không duyệt ({count})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


