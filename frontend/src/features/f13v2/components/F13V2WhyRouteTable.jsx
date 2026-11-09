import { useMemo, useRef, useState, Fragment } from 'react';
import { Route, Layers, ChevronDown, ChevronRight, User, Package } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate } from '../../indicator/indicatorConfig.js';
import { classifyRateTone, formatVolume, formatRate } from '../f13v2Helpers.js';
import {
  formatShortfall,
  formatSharePercent,
  separateRouteScopes,
  buildRouteStorySentence,
  sortWhyRoutes,
  groupRoutesByBcvh,
} from '../f13WhyHelpers.js';
import F13V2WhyPostmanSubTable from './F13V2WhyPostmanSubTable.jsx';

function RateBadge({ rate, target = 90 }) {
  const tone = classifyRateTone(rate, target);
  const toneClasses = {
    success: 'text-emerald-800 bg-emerald-100/80 border-emerald-300 font-bold',
    warning: 'text-amber-800 bg-amber-100/80 border-amber-300 font-bold',
    danger: 'text-rose-800 bg-rose-100/80 border-rose-300 font-black',
    neutral: 'text-slate-700 bg-slate-100 border-slate-200 font-medium',
  }[tone];

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs border ${toneClasses}`}>
      {formatRate(rate)}
    </span>
  );
}

function CauseMixMiniChips({ mix, routeFilter, onOpenParcels, routeName }) {
  if (!mix || mix.failed === 0) return null;

  const lines = mix.lines || [];
  const chips = [];

  const khongTronLo = lines.find((l) => l.code === 'KHONG_TRON_LO');
  if (khongTronLo && khongTronLo.count > 0) {
    chips.push({
      key: 'ktl',
      label: `Lô: ${khongTronLo.count}`,
      title: `Không trọn lô: ${khongTronLo.count} BG (${formatSharePercent(khongTronLo.share)})`,
      className: 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200 cursor-pointer',
      onClick: () =>
        onOpenParcels?.({
          title: `${routeName} • Không trọn lô`,
          subtitle: 'Cơ cấu nguyên nhân tuyến phát',
          filter: { ...routeFilter, cause: 'KHONG_TRON_LO', verdict: 'Không đạt' },
          expectedCount: khongTronLo.count,
        }),
    });
  }

  const khaiThac = lines.find((l) => l.code === 'KHAI_THAC');
  if (khaiThac && khaiThac.count > 0) {
    chips.push({
      key: 'kt',
      label: `KT: ${khaiThac.count}`,
      title: `Khai thác quá hạn: ${khaiThac.count} BG (${formatSharePercent(khaiThac.share)})`,
      className: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer',
      onClick: () =>
        onOpenParcels?.({
          title: `${routeName} • Khai thác đến quá hạn`,
          subtitle: 'Cơ cấu nguyên nhân tuyến phát',
          filter: { ...routeFilter, cause: 'KHAI_THAC', verdict: 'Không đạt' },
          expectedCount: khaiThac.count,
        }),
    });
  }

  const vanChuyen = lines.find((l) => l.code === 'VAN_CHUYEN');
  if (vanChuyen && vanChuyen.count > 0) {
    chips.push({
      key: 'vc',
      label: `VC: ${vanChuyen.count}`,
      title: `Vận chuyển quá hạn: ${vanChuyen.count} BG (${formatSharePercent(vanChuyen.share)})`,
      className: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 cursor-pointer',
      onClick: () =>
        onOpenParcels?.({
          title: `${routeName} • Vận chuyển đến quá hạn`,
          subtitle: 'Cơ cấu nguyên nhân tuyến phát',
          filter: { ...routeFilter, cause: 'VAN_CHUYEN', verdict: 'Không đạt' },
          expectedCount: vanChuyen.count,
        }),
    });
  }

  const phat = mix.phat;
  if (phat && phat.count > 0) {
    const chamGiao = phat.by_detail?.CHAM_GIAO_BUU_TA || 0;
    const phatCham = phat.by_detail?.PHAT_CHAM_SAU_GIAO || 0;
    chips.push({
      key: 'phat',
      label: `Phát: ${phat.count}`,
      title: `Khâu phát: ${phat.count} BG (${chamGiao} chậm giao, ${phatCham} phát chậm)`,
      className: 'bg-blue-100 text-blue-900 border-blue-200 hover:bg-blue-200 cursor-pointer',
      onClick: () =>
        onOpenParcels?.({
          title: `${routeName} • Khâu phát tại bưu cục`,
          subtitle: 'Cơ cấu nguyên nhân tuyến phát',
          filter: { ...routeFilter, cause: 'PHAT', verdict: 'Không đạt' },
          expectedCount: phat.count,
        }),
    });
  }

  const choCQ = mix.cho_chuyen_quan?.count || 0;
  if (choCQ > 0) {
    chips.push({
      key: 'cq',
      label: `CQ: ${choCQ}`,
      title: `Chờ Chuyên quản: ${choCQ} BG`,
      className: 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200 cursor-pointer',
      onClick: () =>
        onOpenParcels?.({
          title: `${routeName} • Chờ Chuyên quản phân tích`,
          subtitle: 'Cơ cấu nguyên nhân tuyến phát',
          filter: { ...routeFilter, cause: 'CHO_CHUYEN_QUAN', verdict: 'Không đạt' },
          expectedCount: choCQ,
        }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onClick}
          title={c.title}
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${c.className}`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function SingleBcvhRoutesBlock({
  bcvhGroup,
  sort,
  onSort,
  theme,
  targetRate,
  onSelectBcvh,
  onOpenParcels,
  isCityWide = false,
}) {
  const [expandedRouteKey, setExpandedRouteKey] = useState(null);

  const toggleExpand = (key) => {
    setExpandedRouteKey((cur) => (cur === key ? null : key));
  };

  const sortedPostman = useMemo(() => {
    return sortWhyRoutes(bcvhGroup.postmanRoutes, sort.field, sort.direction);
  }, [bcvhGroup.postmanRoutes, sort.field, sort.direction]);

  const bcvhRow = bcvhGroup.bcvhRow;
  const hasDeficit = (bcvhRow?.own_shortfall || 0) > 0;

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs ${isCityWide ? 'mb-4 last:mb-0' : ''}`}>
      {/* Sub-header for this BCVH when in city-wide mode */}
      {isCityWide && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{bcvhGroup.ten_bcvh}</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600">
              {bcvhGroup.ma_bcvh}
            </span>
            {bcvhRow && (
              <span className="text-xs text-slate-500 font-medium">
                • Tỷ lệ: <strong className={bcvhRow.rate < targetRate ? 'text-rose-600' : 'text-emerald-600'}>{formatRate(bcvhRow.rate)}</strong>
                {' '}({formatVolume(bcvhRow.volume)} BG)
                {hasDeficit && (
                  <span className="text-amber-700 ml-1.5 font-bold">
                    • Thiếu hụt: {formatShortfall(bcvhRow.own_shortfall)} BG
                  </span>
                )}
              </span>
            )}
          </div>
          {onSelectBcvh && (
            <button
              type="button"
              onClick={() => onSelectBcvh(bcvhGroup.ma_bcvh)}
              className="rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Lọc riêng {bcvhGroup.ten_bcvh} &rarr;
            </button>
          )}
        </div>
      )}

      {/* Main Table: Postman Routes */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold">
              <th className="w-9 px-2 py-2 text-center border-r border-slate-200">STT</th>
              <SortableTh
                field="ma_tuyen"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-20 px-2 py-2 text-center border-r border-slate-200"
              >
                Mã tuyến
              </SortableTh>
              <SortableTh
                field="ten_tuyen"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="min-w-[120px] max-w-[160px] px-2.5 py-2 text-left border-r border-slate-200"
              >
                Tên tuyến phát
              </SortableTh>
              <SortableTh
                field="volume"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-16 px-2 py-2 text-right bg-blue-50/30"
              >
                Sản lượng
              </SortableTh>
              <SortableTh
                field="passed"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-14 px-2 py-2 text-right bg-blue-50/30 text-emerald-700"
              >
                Đạt
              </SortableTh>
              <SortableTh
                field="failed"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-14 px-2 py-2 text-right bg-blue-50/30 text-rose-700"
              >
                Không đạt
              </SortableTh>
              <SortableTh
                field="rate"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-18 px-2 py-2 text-center border-r border-slate-200 bg-blue-50/30"
              >
                Tỷ lệ (%)
              </SortableTh>
              <SortableTh
                field="own_shortfall"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-20 px-2 py-2 text-right font-black text-amber-800 bg-amber-50/40"
              >
                Thiếu hụt
              </SortableTh>
              <SortableTh
                field="share_of_parent_shortfall"
                sort={sort}
                onSort={onSort}
                activeClassName={theme.sortActive}
                className="w-20 px-2 py-2 text-right border-r border-slate-200 bg-amber-50/40"
              >
                % Kéo tụt
              </SortableTh>
              <th className="min-w-[200px] max-w-[380px] px-2.5 py-2 text-left border-r border-slate-200">
                Nguyên nhân chính
              </th>
              <th className="min-w-[140px] px-2 py-2 text-left border-r border-slate-200">
                Cơ cấu nguyên nhân
              </th>
              <th className="w-36 px-2 py-2 text-center" data-no-capture="true">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPostman.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-5 text-center text-slate-400">
                  BCVH này không có dữ liệu tuyến bưu tá cho kỳ báo cáo.
                </td>
              </tr>
            ) : (
              sortedPostman.map((route, idx) => {
                const storySentence = buildRouteStorySentence(route);
                const hasRouteDeficit = (route.own_shortfall || 0) > 0;
                const routeName = route.ten_tuyen || `Tuyến ${route.ma_tuyen}`;
                const isExpanded = expandedRouteKey === route.key;

                return (
                  <Fragment key={route.key || route.ma_tuyen}>
                    <tr
                      className={`transition-colors duration-100 ${
                        hasRouteDeficit ? 'bg-amber-50/15' : ''
                      } ${isExpanded ? 'bg-blue-50/20' : 'hover:bg-blue-50/30'}`}
                    >
                    <td className="px-2 py-2 text-center font-semibold text-slate-500 border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-2 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                      {route.ma_tuyen}
                    </td>
                    <td
                      className="px-2.5 py-2 font-bold text-slate-900 border-r border-slate-100 whitespace-normal break-words"
                      title={route.ten_tuyen ? `${route.ten_tuyen} • ${storySentence.fullText}` : storySentence.fullText}
                    >
                      {route.ten_tuyen || '—'}
                    </td>
                    <td
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${routeName} • Toàn bộ sản lượng`,
                          subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                          filter: route.filter,
                          expectedCount: route.volume,
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-slate-800 hover:text-blue-600 hover:underline cursor-pointer"
                      title="Bấm để xem danh sách toàn bộ bưu gửi của tuyến"
                    >
                      {formatVolume(route.volume)}
                    </td>
                    <td
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${routeName} • Bưu gửi Đạt`,
                          subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                          filter: { ...route.filter, verdict: 'Đạt' },
                          expectedCount: route.passed,
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-emerald-700 hover:underline cursor-pointer"
                      title="Bấm để xem danh sách bưu gửi đạt của tuyến"
                    >
                      {formatVolume(route.passed)}
                    </td>
                    <td
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${routeName} • Bưu gửi Không đạt`,
                          subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                          filter: { ...route.filter, verdict: 'Không đạt' },
                          expectedCount: route.failed,
                        })
                      }
                      className="px-2 py-2 text-right font-medium text-rose-700 hover:underline cursor-pointer"
                      title="Bấm để xem danh sách bưu gửi không đạt của tuyến"
                    >
                      {formatVolume(route.failed)}
                    </td>
                    <td className="px-2 py-2 text-center border-r border-slate-100">
                      <RateBadge rate={route.rate} target={targetRate} />
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-amber-800 bg-amber-50/20">
                      {formatShortfall(route.own_shortfall)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-slate-700 border-r border-slate-100 bg-amber-50/20">
                      {route.share_of_parent_shortfall !== null
                        ? formatSharePercent(route.share_of_parent_shortfall)
                        : (route.share_note === 'KHONG_AP_DUNG' ? 'K.áp dụng' : '—')}
                    </td>
                    <td className="min-w-[200px] max-w-[380px] px-2.5 py-2 text-slate-800 font-medium border-r border-slate-100 whitespace-normal break-words leading-relaxed">
                      <span>{storySentence.mainText}</span>
                      {storySentence.hintText ? (
                        <span className="text-slate-400 font-normal italic ml-1">
                          {storySentence.hintText}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 border-r border-slate-100">
                      <CauseMixMiniChips
                        mix={route.cause_mix}
                        routeFilter={route.filter}
                        onOpenParcels={onOpenParcels}
                        routeName={routeName}
                      />
                    </td>
                    <td className="px-2 py-2 text-center" data-no-capture="true">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(route.key)}
                          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                            isExpanded
                              ? 'border-blue-400 bg-blue-100 text-blue-900'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                          title="Xem danh sách bưu tá bàn giao đầu tiên của tuyến này"
                        >
                          <User className="h-3 w-3" />
                          <span>Bưu tá</span>
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onOpenParcels?.({
                              title: `${routeName} • Bưu gửi Không đạt`,
                              subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                              filter: { ...route.filter, verdict: 'Không đạt' },
                              expectedCount: route.failed,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Xem danh sách bưu gửi không đạt của tuyến"
                        >
                          <Package className="h-3 w-3" />
                          <span>({route.failed})</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${route.key}_postmen_sub`} className="bg-slate-50/80">
                      <td colSpan={12} className="p-2 sm:p-3 border-b border-slate-200">
                        <F13V2WhyPostmanSubTable
                          route={route}
                          onOpenParcels={onOpenParcels}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            }))}
          </tbody>
        </table>
      </div>

      {/* Routes outside the postman ranking, two groups (PO 2026-11-07): NON_POSTMAN = Phát tại quầy, OTHER = no / unknown route code */}
      {[
        { key: 'NON_POSTMAN', title: 'Phát tại quầy (khách đến nhận)', list: bcvhGroup.otherRoutes.filter((r) => r.route_scope === 'NON_POSTMAN') },
        { key: 'OTHER', title: 'Tuyến chưa xác định', list: bcvhGroup.otherRoutes.filter((r) => r.route_scope !== 'NON_POSTMAN') },
      ].filter((group) => group.list.length > 0).map((group) => (
        <div key={group.key} className="mt-3.5 pt-3 border-t border-slate-200">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-600" />
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                {group.title}
              </h4>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              * Tách riêng theo quy định PO, không xếp hạng chung với tuyến phát bưu tá
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold">
                  <th className="px-3 py-1.5">Phân loại tuyến</th>
                  <th className="px-2 py-1.5 text-right">Sản lượng</th>
                  <th className="px-2 py-1.5 text-right text-emerald-700">Đạt</th>
                  <th className="px-2 py-1.5 text-right text-rose-700">Không đạt</th>
                  <th className="px-2 py-1.5 text-center">Tỷ lệ</th>
                  <th className="px-2 py-1.5 text-right text-amber-800">Thiếu hụt</th>
                  <th className="px-3 py-1.5 min-w-[200px] max-w-[380px]">Nguyên nhân chính</th>
                  <th className="px-2 py-1.5">Cơ cấu</th>
                  <th className="w-24 px-2 py-1.5 text-center" data-no-capture="true">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {group.list.map((r) => {
                  // The group title is the row name: the backend label of these aggregated rows changed with the PO wording (2026-11-07).
                  const otherRouteName = group.title;
                  const otherStory = buildRouteStorySentence(r);
                  return (
                    <tr key={r.key} className="hover:bg-slate-100/50">
                      <td className="px-3 py-2 font-bold text-slate-800">
                        {otherRouteName}
                      </td>
                      <td
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${otherRouteName} • Sản lượng`,
                            subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                            filter: r.filter,
                            expectedCount: r.volume,
                          })
                        }
                        className="px-2 py-2 text-right font-medium text-slate-800 hover:text-blue-600 hover:underline cursor-pointer"
                        title="Bấm để xem danh sách bưu gửi"
                      >
                        {formatVolume(r.volume)}
                      </td>
                      <td
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${otherRouteName} • Bưu gửi Đạt`,
                            subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                            filter: { ...r.filter, verdict: 'Đạt' },
                            expectedCount: r.passed,
                          })
                        }
                        className="px-2 py-2 text-right font-medium text-emerald-700 hover:underline cursor-pointer"
                        title="Bấm để xem danh sách bưu gửi đạt"
                      >
                        {formatVolume(r.passed)}
                      </td>
                      <td
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${otherRouteName} • Bưu gửi Không đạt`,
                            subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                            filter: { ...r.filter, verdict: 'Không đạt' },
                            expectedCount: r.failed,
                          })
                        }
                        className="px-2 py-2 text-right font-medium text-rose-700 hover:underline cursor-pointer"
                        title="Bấm để xem danh sách bưu gửi không đạt"
                      >
                        {formatVolume(r.failed)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <RateBadge rate={r.rate} target={targetRate} />
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-amber-800">
                        {formatShortfall(r.own_shortfall)}
                      </td>
                      <td className="min-w-[200px] max-w-[380px] px-3 py-2 text-slate-800 font-medium leading-relaxed">
                        <span>{otherStory.mainText}</span>
                        {otherStory.hintText ? (
                          <span className="text-slate-400 font-normal italic ml-1">
                            {otherStory.hintText}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <CauseMixMiniChips
                          mix={r.cause_mix}
                          routeFilter={r.filter}
                          onOpenParcels={onOpenParcels}
                          routeName={otherRouteName}
                        />
                      </td>
                      <td className="px-2 py-2 text-center" data-no-capture="true">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenParcels?.({
                              title: `${otherRouteName} • Bưu gửi Không đạt`,
                              subtitle: `BCVH ${bcvhGroup.ten_bcvh}`,
                              filter: { ...r.filter, verdict: 'Không đạt' },
                              expectedCount: r.failed,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Package className="h-3 w-3" />
                          <span>Xem ({r.failed})</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function F13V2WhyRouteTable({
  routes = [],
  bcvhRows = [],
  bcvhParam = 'all',
  bcvhName = '',
  periodLabel = '',
  onSelectBcvh,
  onOpenParcels,
}) {
  const tableRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);

  // Default sorting: own_shortfall descending (hot spots first per PO rule)
  const [sort, setSort] = useState({ field: 'own_shortfall', direction: 'desc' });

  const handleSort = (field) => {
    setSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'desc' };
    });
  };

  const isCityWide = bcvhParam === 'all';

  // In city-wide mode: group routes by BCVH so routes are NEVER mixed together
  const bcvhGroups = useMemo(() => {
    if (isCityWide) {
      return groupRoutesByBcvh(routes, bcvhRows);
    }
    // Single BCVH mode: 1 group
    const { postmanRoutes, otherRoutes } = separateRouteScopes(routes);
    return [
      {
        ma_bcvh: bcvhParam,
        ten_bcvh: bcvhName,
        bcvhRow: bcvhRows.find((r) => r.ma_bcvh === bcvhParam) || null,
        routes,
        postmanRoutes,
        otherRoutes,
      },
    ];
  }, [isCityWide, routes, bcvhRows, bcvhParam, bcvhName]);

  const periodText = periodLabel ? `Kỳ: ${periodLabel}` : '';
  const captureTitle = `Danh sách tuyến phát cần chú ý ${bcvhName}`;

  return (
    <section
      ref={tableRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-[box-shadow,border-color] duration-150"
    >
      {/* Header with Camera Button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-2xs">
            <Route className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Danh sách tuyến phát cần chú ý – {bcvhName || 'Tất cả đơn vị'}
              </h2>
              {periodText && (
                <span className="text-xs font-semibold text-slate-500">
                  ({periodText})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {isCityWide
                ? 'Danh sách tuyến phát được phân nhóm theo từng BCVH (không trộn lẫn), xếp hạng theo mức thiếu hụt vs 90%'
                : 'Xếp hạng theo số bưu gửi thiếu hụt so với chỉ tiêu 90% (tuyến bưu tá), kèm nguyên nhân chính và cơ cấu'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BlockCaptureButton
            targetRef={tableRef}
            blockTitle={captureTitle}
            dateOrPeriod={periodLabel}
          />
        </div>
      </div>

      {/* Routes content: per-BCVH in city-wide mode or single BCVH */}
      <div className="space-y-4">
        {bcvhGroups.map((group) => (
          <SingleBcvhRoutesBlock
            key={group.ma_bcvh}
            bcvhGroup={group}
            sort={sort}
            onSort={handleSort}
            theme={theme}
            targetRate={targetRate}
            onSelectBcvh={onSelectBcvh}
            onOpenParcels={onOpenParcels}
            isCityWide={isCityWide}
          />
        ))}
      </div>
    </section>
  );
}
