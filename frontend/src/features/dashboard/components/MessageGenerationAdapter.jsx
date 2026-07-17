import React, { useMemo } from 'react';
import LegacyMessageGenerationPanel from '../../../components/f13/MessageGenerationPanel';

export default function MessageGenerationAdapter({ fromDate, toDate }) {
  const legacyGlobalFilter = useMemo(() => ({
    dateRange: [fromDate, toDate]
  }), [fromDate, toDate]);

  return (
    <div className="message-generation-adapter-wrapper w-full" data-testid="message-generation-adapter">
      <LegacyMessageGenerationPanel globalFilter={legacyGlobalFilter} />
    </div>
  );
}
