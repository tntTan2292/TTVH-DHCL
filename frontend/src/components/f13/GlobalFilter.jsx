import React from 'react';
import { Filter } from 'lucide-react';

/**
 * GlobalFilter — TD § 3.1 Component: TimeFilter + BcvhFilter (UI-GLASS-THEME-02)
 */
export default function GlobalFilter({ filters, onChange, bcvhList = [], maxDate }) {
    const handleChange = (e) => {
        onChange({ ...filters, [e.target.name]: e.target.value });
    };

    return (
        <div className="bg-white/90 backdrop-blur-xs p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center gap-2 text-[var(--color-vnpost-blue-dark)] font-bold mr-2">
                <Filter size={18} />
                <span className="text-sm">Bộ lọc</span>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Từ ngày:</span>
                <input 
                    type="date" 
                    name="fromDate" 
                    value={filters.fromDate}
                    max={maxDate}
                    onChange={handleChange}
                    className="input-glass py-1.5 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-white/90"
                />
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Đến ngày:</span>
                <input 
                    type="date" 
                    name="toDate" 
                    value={filters.toDate}
                    max={maxDate}
                    onChange={handleChange}
                    className="input-glass py-1.5 px-3 text-xs sm:text-sm font-semibold rounded-xl bg-white/90"
                />
            </div>

            <div className="flex items-center gap-2 sm:ml-auto">
                <span className="text-xs text-slate-500 font-semibold">BCVH:</span>
                <select 
                    name="ma_bcvh" 
                    value={filters.ma_bcvh}
                    onChange={handleChange}
                    className="input-glass py-1.5 pl-3 pr-8 text-xs sm:text-sm font-semibold rounded-xl bg-white/90 cursor-pointer"
                >
                    <option value="all">-- Tất cả BCVH --</option>
                    {bcvhList.map((bcvh) => (
                        <option key={bcvh.ma_bcvh} value={bcvh.ma_bcvh}>
                            {bcvh.ten_bcvh}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
