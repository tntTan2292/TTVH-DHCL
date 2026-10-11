import React from 'react';
import { Sparkles, Truck } from 'lucide-react';

export default function F12Quality() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-l-4 border-blue-500 pl-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-vnpost-blue-dark)]">F1.2 – Thu gom liên tỉnh</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Quản lý chất lượng F1.2</p>
      </div>

      <div className="p-12 bg-white/90 backdrop-blur-xs rounded-2xl border border-dashed border-blue-200 text-center shadow-sm flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[var(--color-vnpost-blue)] mb-4 shadow-2xs">
          <Truck className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Chức năng đang hoàn thiện</h3>
        <p className="text-sm text-slate-500 max-w-md">Chỉ tiêu chất lượng thu gom liên tỉnh F1.2 sẽ sẵn sàng trong bản phát hành tới.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--color-vnpost-blue)] border border-blue-200">
          <Sparkles className="w-3.5 h-3.5" /> Coming Soon
        </span>
      </div>
    </div>
  );
}
