import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import LegacyExecutiveDailyBrief from '../../../components/f13/ExecutiveDailyBrief';

export default function ExecutiveDailyBriefAdapter({ fromDate, toDate, maBcvh }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/f13/dashboard/kpi', { params: { from_date: fromDate, to_date: toDate, ma_bcvh: maBcvh } });
        if (res.data.success) {
          const apiData = res.data.data;
          // MAP Backend KPI response -> Legacy expected data structure
          const mappedData = {
            today: apiData.passed_rate,
            dod: 0, // Not provided by API yet
            total_bg: apiData.total_bg,
            buu_gui_dat: Math.round(apiData.total_bg * apiData.passed_rate / 100),
            buu_gui_khong_dat: Math.round(apiData.total_bg * apiData.failed_rate / 100),
            rank: 0, // Not provided by API yet
            rankDod: 0
          };
          setData(mappedData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (fromDate && toDate) fetch();
  }, [fromDate, toDate, maBcvh]);

  if (!data) return <div className="h-24 bg-blue-50 animate-pulse rounded-xl mb-6"></div>;
  return <LegacyExecutiveDailyBrief kpiData={data} />;
}
