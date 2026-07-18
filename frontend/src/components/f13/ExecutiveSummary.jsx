import { Package, CheckCircle2, XCircle, Target } from 'lucide-react';
import { CardContainer } from '../shared/SharedComponents';

const fmtPct = (val) => `${val ?? 0}%`;
const fmtDelta = (val) => `${val > 0 ? '+' : ''}${val ?? 0}%`;
const fmtCount = (val) => (val ?? 0).toLocaleString('vi-VN');

function SummaryMetric({ label, value, helper, tone = 'slate', icon, details = [] }) {
  const toneClass = {
    slate: 'border-[var(--color-surface-200)] bg-[var(--color-surface-50)]',
    green: 'border-green-100 bg-green-50/70',
    red: 'border-red-100 bg-red-50/70',
    blue: 'border-blue-100 bg-blue-50/70',
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-black text-[var(--color-text-main)]">{value}</p>
        </div>
        {icon ? <div className="rounded-full bg-white/80 p-2 text-[var(--color-text-muted)] shadow-sm">{icon}</div> : null}
      </div>
      {helper ? <p className="mt-3 text-sm text-[var(--color-text-muted)]">{helper}</p> : null}
      {details.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/60 pt-3 text-xs text-[var(--color-text-muted)]">
          {details.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <span>{item.label}</span>
              <span className={`font-semibold ${item.emphasis || 'text-[var(--color-text-main)]'}`}>{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ExecutiveSummary({ data }) {
  if (!data) return null;

  const totalBg = Number(data.tong_buu_gui || 0);
  const passedRate = Number(data.today || 0);
  const failedRate = Number(data.f13_303_rate ?? data.failed_rate ?? 0);
  const passedCount = Number(data.buu_gui_dat || 0);
  const failedCount = Number(data.buu_gui_khong_dat || 0);
  const completed = passedCount + failedCount;

  return (
    <CardContainer
      title="Tóm tắt điều hành"
      subtitle="Tóm tắt KPI theo dữ liệu đã ghi nhận và phạm vi lọc hiện tại."
      className="h-full"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SummaryMetric
          label="KPI theo phạm vi lọc"
          value={fmtPct(passedRate)}
          helper={`Tổng bưu gửi: ${fmtCount(totalBg)}`}
          tone="blue"
          icon={<Target size={16} />}
          details={[
            { label: 'So với HQ', value: fmtDelta(data.dod) },
            { label: 'So với CK', value: fmtDelta(data.swc) },
          ]}
        />
        <SummaryMetric
          label="Sản lượng"
          value={fmtCount(totalBg)}
          helper="Tổng số bưu gửi trong kỳ."
          tone="slate"
          icon={<Package size={16} />}
          details={[
            { label: 'Tăng / giảm HQ', value: fmtCount(Math.abs(data.tong_buu_gui_dod || 0)) },
            { label: 'Tăng / giảm CK', value: fmtCount(Math.abs(data.tong_buu_gui_swc || 0)) },
          ]}
        />
        <SummaryMetric
          label="Đạt"
          value={fmtCount(passedCount)}
          helper={passedRate > 0 ? `${fmtPct(passedRate)} của tổng` : 'Chưa có dữ liệu'}
          tone="green"
          icon={<CheckCircle2 size={16} />}
          details={[
            { label: 'So với HQ', value: fmtCount(Math.abs(data.buu_gui_dat_dod || 0)) },
            { label: 'So với CK', value: fmtCount(Math.abs(data.buu_gui_dat_swc || 0)) },
          ]}
        />
        <SummaryMetric
          label="Không đạt"
          value={fmtCount(failedCount)}
          helper={failedRate > 0 ? `${fmtPct(failedRate)} của tổng` : 'Chưa có dữ liệu'}
          tone="red"
          icon={<XCircle size={16} />}
          details={[
            { label: 'Tỷ lệ không đạt', value: fmtPct(failedRate) },
            { label: 'Đối chiếu', value: `${fmtCount(completed)}/${fmtCount(totalBg)}` },
          ]}
        />
      </div>
    </CardContainer>
  );
}
