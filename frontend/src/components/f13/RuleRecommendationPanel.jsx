import { useState, useEffect } from 'react';
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
        console.error("Failed to fetch recommendations", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [globalFilter]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show if no rules triggered
  }

  const dangerCount = recommendations.filter(r => r.priority === 'P1').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 flex flex-col">
      <div className="p-4 border-b border-gray-100 bg-red-50 flex items-center gap-2">
        <AlertTriangle className="text-red-500" size={18} />
        <h3 className="font-bold text-gray-800 uppercase tracking-wide text-sm">
          Khuyến Nghị Điều Hành Hôm Nay
        </h3>
        {dangerCount > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {dangerCount} NGUY HIỂM
          </span>
        )}
      </div>
      
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {recommendations.map(rec => {
          // Map color strings to tailwind classes mapping since tailwind needs full class names
          const bgMap = {
            'red': 'bg-red-50 border-red-200',
            'orange': 'bg-orange-50 border-orange-200',
            'blue': 'bg-blue-50 border-blue-200',
            'gray': 'bg-gray-50 border-gray-200'
          };
          const textMap = {
            'red': 'text-red-600',
            'orange': 'text-orange-600',
            'blue': 'text-blue-600',
            'gray': 'text-gray-600'
          };
          
          const Icon = rec.icon === 'AlertTriangle' ? AlertTriangle : (rec.icon === 'AlertCircle' ? AlertCircle : Info);
          
          return (
            <div key={rec.id} className={`p-3 rounded-lg border ${bgMap[rec.color] || bgMap.gray} flex gap-3 items-start`}>
              <div className={`mt-0.5 ${textMap[rec.color] || textMap.gray}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${textMap[rec.color] || textMap.gray} bg-white border border-current`}>
                    {rec.level} - {rec.priority}
                  </span>
                  <span className="font-semibold text-gray-800">{rec.ten_bcvh} ({rec.category})</span>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-semibold text-gray-900">Hiện trạng: </span>
                  {rec.condition}
                </div>
                <div className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold text-gray-900">Tác động: </span>
                  {rec.impact}
                </div>
                <div className="text-sm bg-white p-2 rounded border border-gray-100 shadow-sm text-gray-800">
                  <span className="font-bold">Đề xuất: </span>{rec.action}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
