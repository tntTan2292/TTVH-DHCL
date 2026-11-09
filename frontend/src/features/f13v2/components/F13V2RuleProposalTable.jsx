import { useRef } from 'react';
import { ArrowRight, CheckCircle2, ChevronRight, Eye, FileText, XCircle } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import {
  formatSystemConclusion,
  formatChosenCause,
  formatProposalStatus,
  proposalStatusBadgeClass,
  formatStillRatio,
  formatDateSpan,
  isAllProposalsSelected,
} from '../f13RuleProposalHelpers.js';

export default function F13V2RuleProposalTable({
  items = [],
  loading = false,
  error = null,
  sort = { field: 'parcels', direction: 'desc' },
  onSort,
  onSelectProposal,
  selectedKey = null,
  activeStatus = 'PENDING',
  selectable = false,
  selectedKeys = [],
  onToggleSelectKey,
  onToggleSelectAll,
  onClearSelection,
  onOpenBatchDialog,
}) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const tableCardRef = useRef(null);

  const isAllSelected = isAllProposalsSelected(items, selectedKeys);
  const colSpanCount = selectable ? 9 : 8;

  return (
    <div
      ref={tableCardRef}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col"
    >
      {/* Header bar with Camera button */}
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-50/80 to-white">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${theme.soft} ${theme.text}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Danh sách đề xuất quy tắc</h3>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${theme.soft} ${theme.text}`}>
                {items.length} đề xuất
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tổng hợp hiệu chỉnh của Chuyên quản thành nhóm đề xuất điều hành chất lượng
            </p>
          </div>
        </div>

        {/* Camera capture button per report block standard */}
        <div className="flex items-center gap-2" data-no-capture="true">
          <BlockCaptureButton
            targetRef={tableCardRef}
            blockTitle="Danh sách đề xuất quy tắc F1.3"
            dateOrPeriod={activeStatus}
            indicatorOverride="F1.3"
          />
        </div>
      </div>

      {/* Batch action bar when rows are selected */}
      {selectable && selectedKeys.length > 0 && (
        <div
          className="px-5 py-2.5 bg-blue-50/90 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in"
          data-no-capture="true"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm text-blue-900 font-medium">
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">
              {selectedKeys.length}
            </span>
            <span>Đã chọn {selectedKeys.length} đề xuất</span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-blue-700 hover:text-blue-900 underline ml-2 cursor-pointer font-normal"
              >
                Bỏ chọn
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenBatchDialog && onOpenBatchDialog('APPROVE')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Duyệt ({selectedKeys.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenBatchDialog && onOpenBatchDialog('REJECT')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Không duyệt ({selectedKeys.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm text-gray-600 border-collapse">
          <thead className="bg-gray-50/90 text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
            <tr>
              {selectable && (
                <th
                  className="py-3 px-3 text-center w-10 whitespace-nowrap"
                  data-no-capture="true"
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      title="Chọn tất cả"
                      aria-label="Chọn tất cả"
                      checked={isAllSelected}
                      onChange={onToggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                </th>
              )}
              <SortableTh
                field="pair"
                sort={sort}
                onSort={onSort}
                className="py-3 px-4 text-left min-w-[320px]"
              >
                Kết luận hệ thống → Đề xuất chuyên quản
              </SortableTh>
              <SortableTh
                field="parcels"
                sort={sort}
                onSort={onSort}
                className="py-3 px-3 text-right whitespace-nowrap"
              >
                Số bưu gửi
              </SortableTh>
              <SortableTh
                field="still_system_conclusion"
                sort={sort}
                onSort={onSort}
                className="py-3 px-4 text-center min-w-[210px] whitespace-nowrap"
              >
                Còn giữ kết luận HT
              </SortableTh>
              <SortableTh
                field="bcvh"
                sort={sort}
                onSort={onSort}
                className="py-3 px-3 text-right whitespace-nowrap"
              >
                Số BCVH
              </SortableTh>
              <SortableTh
                field="analysts"
                sort={sort}
                onSort={onSort}
                className="py-3 px-3 text-right whitespace-nowrap"
              >
                Người PT
              </SortableTh>
              <SortableTh
                field="last_date"
                sort={sort}
                onSort={onSort}
                className="py-3 px-3 text-center min-w-[140px] whitespace-nowrap"
              >
                Thời gian
              </SortableTh>
              <SortableTh
                field="status"
                sort={sort}
                onSort={onSort}
                className="py-3 px-3 text-center whitespace-nowrap"
              >
                Trạng thái
              </SortableTh>
              <th
                className="py-3 px-4 text-center font-semibold text-gray-600 whitespace-nowrap"
                data-no-capture="true"
              >
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="py-12 text-center text-gray-500">
                  <div className="inline-flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải danh sách đề xuất...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={colSpanCount} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-gray-500">
                    <div className="p-3 bg-gray-50 rounded-full mb-3 text-gray-400">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <p className="font-semibold text-gray-700 text-base mb-1">Chưa có đề xuất nào</p>
                    <p className="text-xs text-gray-500">
                      Hiện không có đề xuất quy tắc nào trong nhóm trạng thái đã chọn.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedKey === item.key;
                const isRowTicked = selectedKeys.includes(item.key);
                const sysText = formatSystemConclusion(item.system);
                const chosenText = formatChosenCause(item.chosen);
                const stillRatioText = formatStillRatio(item.still_system_conclusion, item.parcels);
                const pctStill = item.parcels > 0
                  ? Math.round((Number(item.still_system_conclusion || 0) / Number(item.parcels)) * 100)
                  : 0;

                return (
                  <tr
                    key={item.key}
                    onClick={() => onSelectProposal && onSelectProposal(item)}
                    className={`cursor-pointer transition-colors duration-150 hover:bg-blue-50/40 ${
                      isSelected ? 'bg-blue-50/80 font-medium' : isRowTicked ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    {/* Checkbox for batch decision */}
                    {selectable && (
                      <td
                        className="py-3.5 px-3 text-center whitespace-nowrap"
                        data-no-capture="true"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            title={`Chọn đề xuất ${item.key}`}
                            aria-label={`Chọn đề xuất ${item.key}`}
                            checked={isRowTicked}
                            onChange={() => onToggleSelectKey && onToggleSelectKey(item.key)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </div>
                      </td>
                    )}

                    {/* System conclusion -> Chosen cause */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                            title="Kết luận hệ thống"
                          >
                            {sysText}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                            title="Đề xuất của Chuyên quản"
                          >
                            {chosenText}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Parcels */}
                    <td className="py-3.5 px-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                      {Number(item.parcels || 0).toLocaleString('vi-VN')}
                    </td>

                    {/* Still system conclusion */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xs text-gray-700 font-medium">
                          {stillRatioText}
                        </span>
                        <div className="w-28 bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              pctStill >= 80 ? 'bg-emerald-500' : pctStill >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pctStill))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* BCVH */}
                    <td className="py-3.5 px-3 text-right text-gray-700 whitespace-nowrap">
                      {Number(item.bcvh || 0).toLocaleString('vi-VN')}
                    </td>

                    {/* Analysts */}
                    <td className="py-3.5 px-3 text-right text-gray-700 whitespace-nowrap">
                      {Number(item.analysts || 0).toLocaleString('vi-VN')}
                    </td>

                    {/* Date span */}
                    <td className="py-3.5 px-3 text-center text-xs text-gray-600 whitespace-nowrap font-mono">
                      {formatDateSpan(item.first_date, item.last_date)}
                    </td>

                    {/* Status badge */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${proposalStatusBadgeClass(
                          item.status
                        )}`}
                      >
                        {formatProposalStatus(item.status)}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap" data-no-capture="true">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSelectProposal) onSelectProposal(item);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-800'
                        }`}
                        title="Xem chi tiết và quyết định duyệt"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info bar */}
      <div className="px-5 py-2.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>* Bấm vào tiêu đề cột để sắp xếp</span>
        <span>Chỉ áp dụng quy tắc sau khi được duyệt</span>
      </div>
    </div>
  );
}
