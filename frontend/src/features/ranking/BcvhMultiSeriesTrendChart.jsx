import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CANONICAL_BCVH_CODES } from '../dashboard/components/dashboardFilterOptions.js';
import { BCVH_COLORS, CANONICAL_NAMES, DASH, formatOverviewRate } from './bcvhOverviewData.js';
import { renderRateLabel } from '../dashboard/components/ChartLabelRenderers.jsx';
import ChartZoomFrame from '../dashboard/components/ChartZoomFrame.jsx';
import { LABEL_ALL_MAX_POINTS, selectLabelIndexes, selectLastIndex, sliceWindow, stackEndLabelOffsets } from '../dashboard/components/chartDataLabels.js';

function CustomTooltip({ active, payload, label, nameMap, isMonthly, anchorDate, periodKind, codes, colorMap }) {
  if (!active || !payload || !payload.length) return null;

  const row = payload[0]?.payload || {};
  const isCurrent = isMonthly && row.isCurrentMonth;

  return (
    <div className="rounded-xl border border-[var(--color-surface-200)] bg-white/95 p-3 text-xs shadow-lg backdrop-blur-sm">
      <div className="mb-2 font-semibold text-[var(--color-text-main)]">
        {periodKind === 'week' ? label : isMonthly ? `Tháng ${label}` : `Ngày ${label}`}
        {periodKind === 'week' && row.rangeLabel ? (
          <span className="ml-2 font-normal text-[var(--color-text-muted)]">{row.rangeLabel}</span>
        ) : null}
        {periodKind === 'week' && row.dataThroughNote ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            {row.dataThroughNote}
          </span>
        ) : null}
        {isCurrent && anchorDate ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            Lũy kế đến {anchorDate}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        {codes.map((code) => {
          const val = row[code];
          const color = colorMap[code];
          const name = nameMap[code] || CANONICAL_NAMES[code] || code;

          return (
            <div key={code} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[var(--color-text-muted)]">{name}:</span>
              </div>
              <span className="font-bold text-[var(--color-text-main)]">
                {formatOverviewRate(val)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BcvhMultiSeriesTrendChart({
  data = [],
  nameMap = {},
  connectNulls = true,
  isMonthly = false,
  anchorDate = null,
  height = 320,
  // Series to draw (default: the 6 canonical BCVH). `periodKind` 'week' switches tooltip wording.
  codes = CANONICAL_BCVH_CODES,
  colorMap = BCVH_COLORS,
  periodKind = null,
  showLegendChips = true,
}) {
  const [disabledCodes, setDisabledCodes] = useState({});

  const toggleCode = (code) => {
    setDisabledCodes((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--color-text-muted)]">
        {DASH} Chưa có dữ liệu biểu đồ {DASH}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className={`mb-3 flex flex-wrap items-center justify-end gap-2 text-xs ${showLegendChips ? '' : 'hidden'}`}>
        {codes.map((code) => {
          const disabled = disabledCodes[code];
          const color = colorMap[code];
          const name = nameMap[code] || CANONICAL_NAMES[code] || code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => toggleCode(code)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                disabled
                  ? 'bg-gray-100 text-gray-400 line-through opacity-60'
                  : 'bg-surface-50 text-[var(--color-text-main)] shadow-2xs hover:bg-gray-100'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: disabled ? '#9ca3af' : color }}
              />
              {name}
            </button>
          );
        })}
      </div>

      <ChartZoomFrame total={data.length} enabled={data.length > LABEL_ALL_MAX_POINTS}>
        {({ window }) => {
          const view = sliceWindow(data, window);
          const activeCodes = codes.filter((code) => !disabledCodes[code]);
          // Every point is labelled only when the view is small and few series are shown;
          // otherwise just the end of each line, so many lines never turn into a wall of text.
          const labelEveryPoint = activeCodes.length <= 2 && view.length <= LABEL_ALL_MAX_POINTS;
          const endOffsets = stackEndLabelOffsets(view, activeCodes);

          return (
            <div style={{ width: '100%', height }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={view} margin={{ top: 18, right: 44, left: 4, bottom: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    unit="%"
                    tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={
                      <CustomTooltip
                        nameMap={nameMap}
                        isMonthly={isMonthly}
                        anchorDate={anchorDate}
                        periodKind={periodKind}
                        codes={codes}
                        colorMap={colorMap}
                      />
                    }
                  />
                  <Legend content={() => null} />
                  {activeCodes.map((code) => {
                    const color = colorMap[code];
                    const name = nameMap[code] || CANONICAL_NAMES[code] || code;
                    const visible = labelEveryPoint ? selectLabelIndexes(view, code) : selectLastIndex(view, code);

                    return (
                      <Line
                        key={code}
                        type="monotone"
                        dataKey={code}
                        name={name}
                        stroke={color}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: color, strokeWidth: 1, stroke: '#fff' }}
                        activeDot={{ r: 5, fill: color }}
                        connectNulls={connectNulls}
                        label={renderRateLabel({
                          visible,
                          rows: view,
                          fill: color,
                          fontSize: 10,
                          offsetY: labelEveryPoint ? 0 : endOffsets[code] || 0,
                          text: (value) => formatOverviewRate(value),
                        })}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        }}
      </ChartZoomFrame>
    </div>
  );
}
