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
          setData(res.data.data);
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
