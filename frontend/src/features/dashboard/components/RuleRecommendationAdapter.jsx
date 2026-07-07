import React from 'react';
import LegacyRuleRecommendationPanel from '../../../components/f13/RuleRecommendationPanel';

export default function RuleRecommendationAdapter({ fromDate, toDate, interval, maBcvh }) {
  const legacyGlobalFilter = {
    dateRange: [fromDate, toDate],
    interval: interval,
    ma_bcvh: maBcvh
  };

  return (
    <div className="rule-recommendation-adapter-wrapper w-full" data-testid="rule-recommendation-adapter">
      <LegacyRuleRecommendationPanel globalFilter={legacyGlobalFilter} />
    </div>
  );
}
