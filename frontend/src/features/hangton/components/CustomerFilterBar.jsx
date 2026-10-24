import React from 'react';
import { Users } from 'lucide-react';
import { sortCustomerGroups, customerColor, toggleCustomer } from '../hangtonCustomers.js';
import { formatNumber } from '../hangtonLevels.js';

// Customer-group selector: one chip per group of the snapshot (count + stock of 5 days and more), a group is
// switched on or off with a click; nothing selected = every group. Applies to all four screens.
export default function CustomerFilterBar({ groups = [], selected = [], onChange, disabled = false }) {
  const ordered = sortCustomerGroups(groups);
  if (ordered.length === 0) return null;
  const none = selected.length === 0;

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-1.5 shadow-xs"
      data-no-capture="true"
    >
      <span className="flex items-center gap-1 text-[13px] font-bold text-slate-700">
        <Users size={15} className="text-rose-600" />
        Nhóm KH:
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([])}
        aria-pressed={none}
        className={`cursor-pointer rounded-md border px-2.5 py-1 text-[13px] font-semibold transition-colors ${
          none ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
        }`}
      >
        Tất cả
      </button>
      {ordered.map((g) => {
        const on = selected.includes(g.customer_class);
        return (
          <button
            key={g.customer_class}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggleCustomer(selected, g.customer_class))}
            aria-pressed={on}
            title={`${g.customer_class}: ${formatNumber(g.n)} bưu gửi tồn, trong đó ${formatNumber(g.n_ge5 || 0)} bưu gửi từ 5 ngày trở lên`}
            className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[13px] transition-colors ${
              on ? 'border-slate-700 bg-slate-800 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/70" style={{ backgroundColor: customerColor(g.customer_class) }} />
            <span className="whitespace-nowrap font-semibold">{g.customer_class}</span>
            <span className={`text-xs ${on ? 'text-slate-200' : 'text-slate-500'}`}>{formatNumber(g.n)}</span>
            {g.n_ge5 > 0 ? (
              <span className="whitespace-nowrap rounded bg-red-600 px-1 text-xs font-bold leading-5 text-white" title="Từ 5 ngày trở lên">
                ≥5:{formatNumber(g.n_ge5)}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
