import React from 'react';
import { Sparkles, GitBranch } from 'lucide-react';

export default function F13RCA() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-l-4 border-[var(--color-vnpost-blue)] pl-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--color-vnpost-blue-dark)]">Phân tích RCA</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">Root Cause Analysis F1.3</p>
      </div>

      <div className="p-12 bg-white/90 backdrop-blur-xs rounded-2xl border border-dashed border-blue-200 text-center shadow-sm flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[var(--color-vnpost-blue)] mb-4 shadow-2xs">
          <GitBranch className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Chức năng đang hoàn thiện</h3>
        <p className="text-sm text-slate-500 max-w-md">Phân tích nguyên nhân gốc rễ (Root Cause Analysis) và cây quyết định sẽ hiển thị tại đây.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--color-vnpost-blue)] border border-blue-200">
          <Sparkles className="w-3.5 h-3.5" /> Coming Soon
        </span>
      </div>
    </div>
  );
}
