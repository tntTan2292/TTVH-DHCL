import React, { useMemo } from 'react';
import LegacyRuleRecommendationPanel from '../../../components/f13/RuleRecommendationPanel';

export default function RuleRecommendationAdapter({ fromDate, toDate, interval, maBcvh }) {
  const legacyGlobalFilter = useMemo(() => ({
    dateRange: [fromDate, toDate],
    interval,
    ma_bcvh: maBcvh
  }), [fromDate, interval, maBcvh, toDate]);

  return (
    <div className="rule-recommendation-adapter-wrapper w-full" data-testid="rule-recommendation-adapter">
      <LegacyRuleRecommendationPanel globalFilter={legacyGlobalFilter} />
    </div>
  );
}
