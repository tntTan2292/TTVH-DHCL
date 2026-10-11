import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import api from '../../api/client';

export default function RuleRecommendationPanel({ globalFilter }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const params = {
          fromDate: globalFilter.dateRange[0],
          toDate: globalFilter.dateRange[1],
        };
        const response = await api.get('/f13/recommendations', { params });
        if (response.data.success) {
          setRecommendations(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [globalFilter]);

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xs">
        <div className="flex animate-pulse space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 w-1/4 rounded bg-slate-200"></div>
            <div className="space-y-2">
              <div className="h-4 rounded bg-slate-200"></div>
              <div className="h-4 w-5/6 rounded bg-slate-200"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  const dangerCount = recommendations.filter((r) => r.priority === 'P1').length;

  return (
    <div className="mb-6 flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xs">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-rose-50/70 p-4">
        <AlertTriangle className="text-rose-600" size={18} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
          Khuyến nghị điều hành hôm nay
        </h3>
        {dangerCount > 0 && (
          <span className="ml-auto rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
            {dangerCount} rủi ro cao
          </span>
        )}
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto p-4">
        {recommendations.map((rec) => {
          const bgMap = {
            red: 'bg-rose-50/80 border-rose-200/80',
            orange: 'bg-amber-50/80 border-amber-200/80',
            blue: 'bg-blue-50/80 border-blue-200/80',
            gray: 'bg-slate-50/80 border-slate-200/80',
          };
          const textMap = {
            red: 'text-rose-700',
            orange: 'text-amber-700',
            blue: 'text-blue-700',
            gray: 'text-slate-700',
          };

          const Icon = rec.icon === 'AlertTriangle' ? AlertTriangle : (rec.icon === 'AlertCircle' ? AlertCircle : Info);

          return (
            <div key={rec.id} className={`flex items-start gap-3 rounded-xl border p-3.5 transition-all ${bgMap[rec.color] || bgMap.gray}`}>
              <div className={`mt-0.5 ${textMap[rec.color] || textMap.gray}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-md border border-current bg-white px-1.5 py-0.5 text-xs font-bold shadow-2xs ${textMap[rec.color] || textMap.gray}`}>
                    {rec.level} - {rec.priority}
                  </span>
                  <span className="font-bold text-slate-900">{rec.ten_bcvh} ({rec.category})</span>
                </div>
                <div className="mb-1 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Hiện trạng: </span>
                  {rec.condition}
                </div>
                <div className="mb-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Tác động: </span>
                  {rec.impact}
                </div>
                <div className="rounded-lg border border-slate-200/80 bg-white/95 p-2.5 text-sm text-slate-800 shadow-2xs">
                  <span className="font-bold text-[var(--color-vnpost-blue)]">Đề xuất: </span>{rec.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
