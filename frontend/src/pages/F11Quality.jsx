import React from 'react';
import { Sparkles, Activity } from 'lucide-react';

export default function F11Quality() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-l-4 border-[#22C55E] pl-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-vnpost-blue-dark)]">F1.1 – Chất lượng toàn trình nội tỉnh</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Quản lý chất lượng F1.1</p>
      </div>

      <div className="p-12 bg-white/90 rounded-2xl border border-dashed border-emerald-200 text-center shadow-sm flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-2xs">
          <Activity className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Chức năng đang hoàn thiện</h3>
        <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5" /> Coming Soon
        </span>
      </div>
    </div>
  );
}
