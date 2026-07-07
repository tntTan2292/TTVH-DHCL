import React, { useState, useEffect } from 'react';
import api from '../../../api/client';
import LegacyExecutiveSummary from '../../../components/f13/ExecutiveSummary';

export default function ExecutiveSummaryAdapter({ fromDate, toDate, maBcvh }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/f13/dashboard/kpi', { params: { fromDate, toDate, ma_bcvh } });
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (fromDate && toDate) fetch();
  }, [fromDate, toDate, maBcvh]);

  if (!data) return <div className="h-32 bg-slate-50 animate-pulse rounded-xl mb-6"></div>;
  return <LegacyExecutiveSummary data={data} />;
}
