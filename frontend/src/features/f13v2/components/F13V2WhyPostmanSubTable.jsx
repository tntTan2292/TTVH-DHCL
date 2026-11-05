import { useEffect, useState, useMemo } from 'react';
import { User, Package, AlertCircle } from 'lucide-react';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate } from '../../indicator/indicatorConfig.js';
import { fetchWhyPostmen } from '../api/f13v2Api.js';
import { classifyRateTone, formatVolume, formatRate } from '../f13v2Helpers.js';
import {
  formatShortfall,
  formatSharePercent,
  sortWhyPostmen,
  formatPostmanName,
} from '../f13WhyHelpers.js';

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

function PostmanCauseMixChips({ mix, postmanFilter, onOpenParcels, postmanName }) {
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
          title: `${postmanName} • Không trọn lô`,
          subtitle: `Cơ cấu nguyên nhân tuyến`,
          filter: { ...postmanFilter, cause: 'KHONG_TRON_LO', verdict: 'Không đạt' },
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
          title: `${postmanName} • Khai thác quá hạn`,
          subtitle: `Cơ cấu nguyên nhân tuyến`,
          filter: { ...postmanFilter, cause: 'KHAI_THAC', verdict: 'Không đạt' },
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
          title: `${postmanName} • Vận chuyển quá hạn`,
          subtitle: `Cơ cấu nguyên nhân tuyến`,
          filter: { ...postmanFilter, cause: 'VAN_CHUYEN', verdict: 'Không đạt' },
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
          title: `${postmanName} • Khâu phát`,
          subtitle: `Cơ cấu nguyên nhân tuyến`,
          filter: { ...postmanFilter, cause: 'PHAT', verdict: 'Không đạt' },
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
          title: `${postmanName} • Chờ Chuyên quản phân tích`,
          subtitle: `Cơ cấu nguyên nhân tuyến`,
          filter: { ...postmanFilter, cause: 'CHO_CHUYEN_QUAN', verdict: 'Không đạt' },
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

export default function F13V2WhyPostmanSubTable({
  route,
  onOpenParcels,
}) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);

  const [postmen, setPostmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ field: 'own_shortfall', direction: 'desc' });

  useEffect(() => {
    let active = true;
    if (!route) return;

    setLoading(true);
    setError(null);

    const query = {
      ...route.filter,
    };

    fetchWhyPostmen(query, indicator.apiBase)
      .then((res) => {
        if (!active) return;
        setPostmen(res?.rows || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải danh sách bưu tá.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [route, indicator.apiBase]);

  const handleSort = (field) => {
    setSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'desc' };
    });
  };

  const sortedPostmen = useMemo(() => {
    return sortWhyPostmen(postmen, sort.field, sort.direction);
  }, [postmen, sort.field, sort.direction]);

  if (loading) {
    return (
      <div className="my-2 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
        <div className="flex items-center justify-center gap-2.5 text-xs text-blue-700 font-medium">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Đang tải thông tin bưu tá bàn giao đầu tiên...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-2 rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
        <span>{error}</span>
      </div>
    );
  }

  const routeName = route.ten_tuyen || `Tuyến ${route.ma_tuyen}`;

  return (
    <div className="my-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3 shadow-inner">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-800">
            <User className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Bưu tá bàn giao đầu tiên – {routeName} ({route.ma_tuyen})
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">
              * Số liệu phản ánh bưu tá nhận bàn giao đầu tiên. Không dùng từ ngữ quy kết cá nhân.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-slate-500">
          {sortedPostmen.length} bưu tá / đối tượng bàn giao
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold">
              <th className="w-8 px-2 py-1.5 text-center border-r border-slate-200">STT</th>
              <SortableTh
                field="ten_buu_ta"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="min-w-[140px] px-2.5 py-1.5 text-left border-r border-slate-200"
              >
                Bưu tá bàn giao đầu
              </SortableTh>
              <SortableTh
                field="volume"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="w-16 px-2 py-1.5 text-right bg-blue-50/20"
              >
                Sản lượng
              </SortableTh>
              <SortableTh
                field="passed"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="w-14 px-2 py-1.5 text-right bg-blue-50/20 text-emerald-700"
              >
                Đạt
              </SortableTh>
              <SortableTh
                field="failed"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="w-14 px-2 py-1.5 text-right bg-blue-50/20 text-rose-700"
              >
                Không đạt
              </SortableTh>
              <SortableTh
                field="rate"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="w-16 px-2 py-1.5 text-center border-r border-slate-200 bg-blue-50/20"
              >
                Tỷ lệ
              </SortableTh>
              <SortableTh
                field="own_shortfall"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="w-18 px-2 py-1.5 text-right font-black text-amber-800 bg-amber-50/30"
              >
                Thiếu hụt
              </SortableTh>
              <SortableTh
                field="share_of_parent_shortfall"
                sort={sort}
                onSort={handleSort}
                activeClassName={theme.sortActive}
                className="w-18 px-2 py-1.5 text-right border-r border-slate-200 bg-amber-50/30"
              >
                % Kéo tụt
              </SortableTh>
              <th className="min-w-[140px] px-2.5 py-1.5 text-left border-r border-slate-200">
                Cơ cấu nguyên nhân
              </th>
              <th className="w-20 px-2 py-1.5 text-center">
                Bưu gửi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPostmen.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-4 text-center text-slate-400">
                  Không có dữ liệu bưu tá bàn giao cho tuyến này.
                </td>
              </tr>
            ) : (
              sortedPostmen.map((p, idx) => {
                const isNoPostman = !p.ma_buu_ta || p.ma_buu_ta === 'NONE';
                const displayName = formatPostmanName(p.ten_buu_ta, p.ma_buu_ta);
                const hasDeficit = (p.own_shortfall || 0) > 0;

                return (
                  <tr
                    key={p.key || idx}
                    className={`hover:bg-slate-50 transition-colors ${
                      hasDeficit ? 'bg-amber-50/15' : ''
                    }`}
                  >
                    <td className="px-2 py-1.5 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="px-2.5 py-1.5 border-r border-slate-100 font-medium">
                      {isNoPostman ? (
                        <span className="inline-block rounded bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          Chưa có bưu tá
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{p.ten_buu_ta || 'Bưu tá'}</span>
                          <span className="text-[10px] font-mono text-slate-500">({p.ma_buu_ta})</span>
                        </div>
                      )}
                    </td>
                    <td
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${displayName} • Sản lượng`,
                          subtitle: `Tuyến ${routeName}`,
                          filter: p.filter,
                          expectedCount: p.volume,
                        })
                      }
                      className="px-2 py-1.5 text-right font-medium text-slate-800 hover:text-blue-600 hover:underline cursor-pointer"
                      title="Xem toàn bộ bưu gửi của bưu tá này"
                    >
                      {formatVolume(p.volume)}
                    </td>
                    <td
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${displayName} • Bưu gửi Đạt`,
                          subtitle: `Tuyến ${routeName}`,
                          filter: { ...p.filter, verdict: 'Đạt' },
                          expectedCount: p.passed,
                        })
                      }
                      className="px-2 py-1.5 text-right font-medium text-emerald-700 hover:underline cursor-pointer"
                      title="Xem các bưu gửi đạt chỉ tiêu"
                    >
                      {formatVolume(p.passed)}
                    </td>
                    <td
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${displayName} • Bưu gửi Không đạt`,
                          subtitle: `Tuyến ${routeName}`,
                          filter: { ...p.filter, verdict: 'Không đạt' },
                          expectedCount: p.failed,
                        })
                      }
                      className="px-2 py-1.5 text-right font-medium text-rose-700 hover:underline cursor-pointer"
                      title="Xem các bưu gửi không đạt chỉ tiêu"
                    >
                      {formatVolume(p.failed)}
                    </td>
                    <td className="px-2 py-1.5 text-center border-r border-slate-100">
                      <RateBadge rate={p.rate} target={targetRate} />
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-amber-800 bg-amber-50/20">
                      {formatShortfall(p.own_shortfall)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-semibold text-slate-700 border-r border-slate-100 bg-amber-50/20">
                      {p.share_of_parent_shortfall !== null
                        ? formatSharePercent(p.share_of_parent_shortfall)
                        : (p.share_note === 'KHONG_AP_DUNG' ? 'K.áp dụng' : '—')}
                    </td>
                    <td className="px-2.5 py-1.5 border-r border-slate-100">
                      <PostmanCauseMixChips
                        mix={p.cause_mix}
                        postmanFilter={p.filter}
                        onOpenParcels={onOpenParcels}
                        postmanName={displayName}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${displayName} • Bưu gửi Không đạt`,
                            subtitle: `Tuyến ${routeName}`,
                            filter: { ...p.filter, verdict: 'Không đạt' },
                            expectedCount: p.failed,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                      >
                        <Package className="h-3 w-3" />
                        <span>Xem ({p.failed})</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
