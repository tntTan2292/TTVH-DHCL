import React, { memo, useMemo } from 'react';
import HandlingGridCells from '../handling/HandlingGridCells.jsx';
import { STATE_META, RECHECK_META, rowForm, needsRecheck } from '../handling/handlingModel.js';
import { getLevelConfig, formatCurrency } from '../hangtonLevels.js';

// One parcel of the detail table. Memoised: typing in one row does not redraw the other rows of the page.
// With the stock-handling columns (`canHandle`) the table is kept narrow: Nhóm KH, Trạng thái TMS, Bưu tá and Lý do
// are left to the one-parcel panel and the Excel file.
function HangTonItemRow({
  row, rowNum, canWrite, canHandle, showOffice = true, catalog, checked, draft, flagged, saving, today,
  onToggle, onOpen, onEdit, onSave, onDiscard,
}) {
  // One parcel on one line: tight cells that do not wrap (the page scales to the width, see hangtonFit.js).
  const C = canHandle ? 'py-1.5 px-2 whitespace-nowrap' : 'py-2.5 px-3';
  const cfg = getLevelConfig(row.ton_level);
  const form = useMemo(() => rowForm(row, draft ? { [row.item_code]: draft } : {}), [row, draft]);
  const state = STATE_META[row.handling?.state || 'NONE'];
  const recheck = needsRecheck(row);

  return (
    <tr className={draft ? 'bg-amber-50/40' : (recheck ? 'bg-orange-50/60' : 'hover:bg-slate-50/70')}>
      {canWrite ? (
        <td className={C} data-no-capture="true">
          <input type="checkbox" checked={checked} onChange={() => onToggle(row.item_code)} aria-label={`Chọn ${row.item_code}`} className="cursor-pointer" />
        </td>
      ) : null}
      <td className={`${C} text-slate-400 font-mono text-[13px]`}>{rowNum}</td>
      <td className={`${C} font-mono font-bold text-slate-900`}>
        {canHandle ? (
          <button type="button" onClick={() => onOpen(row)} className="cursor-pointer font-mono font-bold text-slate-900 underline-offset-2 hover:text-rose-700 hover:underline" title="Bấm để xem đầy đủ thông tin và lịch sử xử lý của bưu gửi">
            {row.item_code}
          </button>
        ) : row.item_code}
      </td>
      {showOffice ? (<td className={`${C} font-semibold text-slate-800`}>{row.office || '—'}</td>) : null}
      {canHandle ? null : (<td className={`${C} text-slate-700`}>{row.customer_class || '—'}</td>)}
      {canHandle ? null : (<td className={`${C} text-slate-700`}>{row.status_name}</td>)}
      <td className={C}>
        <span className={`inline-block px-2 py-0.5 rounded text-[13px] font-semibold border ${cfg.badgeClass}`}>
          {row.ton_level}
        </span>
      </td>
      <td className={`${C} text-right font-medium text-slate-800`}>
        {row.cod ? formatCurrency(row.cod) : '—'}
      </td>
      {canHandle ? null : (<td className={`${C} text-slate-700`}>{row.postman_name || row.postman_code || '—'}</td>)}
      {canHandle ? null : (
        <td className={`${C} text-slate-500 max-w-[200px] truncate`} title={row.reason || ''}>{row.reason || '—'}</td>
      )}
      {canHandle ? (
        <td className={C}>
          {row.handling?.required === false && row.handling?.state === 'NONE' ? (
            <span className="text-slate-400">—</span>
          ) : recheck ? (
            <div title={RECHECK_META.hint}>
              <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[13px] font-bold ${RECHECK_META.badgeClass}`}>⚠ {RECHECK_META.label}</span>
            </div>
          ) : (
            <span className={`inline-block whitespace-nowrap rounded-md border px-2 py-0.5 text-[13px] font-semibold ${state.badgeClass}`}>{state.label}</span>
          )}
        </td>
      ) : null}
      {canHandle ? (
        <HandlingGridCells
          row={row}
          catalog={catalog}
          form={form}
          editable={canWrite}
          dirty={Boolean(draft)}
          flagged={flagged}
          saving={saving}
          today={today}
          onChange={(patch) => onEdit(row, patch)}
          onSave={() => onSave(row.item_code)}
          onDiscard={() => onDiscard(row.item_code)}
        />
      ) : null}
    </tr>
  );
}

export default memo(HangTonItemRow);
