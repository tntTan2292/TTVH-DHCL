import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
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

  // Decision submission state
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [notification, setNotification] = useState(null);

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
  }, [selectedProposal?.key]);

  // Tab switch handler
  const handleTabChange = (tabKey) => {
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

  // Make decision handler
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

  // Sort items
  const sortedItems = useMemo(() => {
    return sortRuleProposals(items, sort.field, sort.direction);
  }, [items, sort.field, sort.direction]);

  return (
    <PageContainer
      title="Đề xuất quy tắc"
      subtitle="Chuyên quản corrections grouped as proposals, approved or rejected by the PO"
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
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
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
          />
        )}
      </div>
    </PageContainer>
  );
}
